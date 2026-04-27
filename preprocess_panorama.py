from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


@dataclass
class Scene:
    name: str
    files: list[Path]
    output_name: str


def smooth_step(values: np.ndarray) -> np.ndarray:
    return values * values * (3.0 - (2.0 * values))


def discover_scenes(input_dir: Path) -> list[Scene]:
    root_images = sorted(
        path for path in input_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )
    child_dirs = sorted(path for path in input_dir.iterdir() if path.is_dir())

    scenes: list[Scene] = []

    for directory in child_dirs:
        files = sorted(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
        if not files:
            continue

        scenes.append(
            Scene(
                name=directory.name,
                files=files,
                output_name=f"{directory.name}.jpg",
            )
        )

    if root_images:
        if len(root_images) == 1:
            only_image = root_images[0]
            scenes.append(
                Scene(
                    name=only_image.stem,
                    files=[only_image],
                    output_name=only_image.name,
                )
            )
        else:
            scenes.append(
                Scene(
                    name=input_dir.name,
                    files=root_images,
                    output_name="panorama-stitched.jpg",
                )
            )

    return scenes


def load_images(paths: list[Path]) -> list[np.ndarray]:
    images: list[np.ndarray] = []
    for path in paths:
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            raise RuntimeError(f"Could not read image: {path}")
        images.append(image)
    return images


def stitch_images(images: list[np.ndarray]) -> tuple[np.ndarray, str]:
    if len(images) == 1:
        return images[0], "single"

    stitch_modes = [
        ("panorama", cv2.Stitcher_PANORAMA),
        ("scans", cv2.Stitcher_SCANS),
    ]

    for mode_name, mode in stitch_modes:
        stitcher = cv2.Stitcher_create(mode)
        status, panorama = stitcher.stitch(images)
        if status == cv2.Stitcher_OK and panorama is not None:
            return panorama, mode_name

    raise RuntimeError("OpenCV stitching failed for this scene.")


def crop_to_content(image: np.ndarray, threshold: int = 8) -> tuple[np.ndarray, dict[str, int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    non_empty = np.argwhere(gray > threshold)

    if non_empty.size == 0:
        height, width = image.shape[:2]
        return image.copy(), {"x": 0, "y": 0, "width": width, "height": height}

    y0, x0 = non_empty.min(axis=0)
    y1, x1 = non_empty.max(axis=0)
    cropped = image[y0 : y1 + 1, x0 : x1 + 1]
    return cropped, {"x": int(x0), "y": int(y0), "width": int(x1 - x0 + 1), "height": int(y1 - y0 + 1)}


def build_preview(image: np.ndarray, max_width: int = 1400) -> tuple[np.ndarray, float]:
    height, width = image.shape[:2]
    if width <= max_width:
        return image, 1.0

    scale = max_width / width
    preview = cv2.resize(
        image,
        (int(round(width * scale)), int(round(height * scale))),
        interpolation=cv2.INTER_AREA,
    )
    return preview, scale


def measure_seam_score(image: np.ndarray, shift: int = 0, band_width: int | None = None) -> float:
    height, width = image.shape[:2]
    effective_band_width = band_width or max(1, min(8, round(width * 0.004)))
    left = image[:, :effective_band_width].astype(np.int16)
    rows = np.clip(np.arange(height) + shift, 0, height - 1)
    cols = np.arange(width - effective_band_width, width)
    right = image[rows[:, None], cols[None, :]].astype(np.int16)
    return float(np.mean(np.abs(left - right)))


def estimate_end_overlap_with_features(image: np.ndarray) -> dict[str, int | float]:
    height, width = image.shape[:2]
    strip_width = max(160, min(width // 4, round(width * 0.16)))

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    left = gray[:, :strip_width]
    right = gray[:, width - strip_width :]

    orb = cv2.ORB_create(2500)
    left_keypoints, left_descriptors = orb.detectAndCompute(left, None)
    right_keypoints, right_descriptors = orb.detectAndCompute(right, None)

    result: dict[str, int | float] = {
        "overlap": 0,
        "shift": 0,
        "match_count": 0,
        "inlier_count": 0,
        "confidence": 0.0,
    }

    if left_descriptors is None or right_descriptors is None:
        return result

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    knn_matches = matcher.knnMatch(left_descriptors, right_descriptors, k=2)
    good_matches = []

    for pair in knn_matches:
        if len(pair) < 2:
            continue

        best, alt = pair
        if best.distance < (0.75 * alt.distance):
            good_matches.append(best)

    result["match_count"] = len(good_matches)
    if len(good_matches) < 8:
        return result

    left_points = []
    right_points = []

    for match in good_matches:
        left_point = left_keypoints[match.queryIdx].pt
        right_point = right_keypoints[match.trainIdx].pt
        left_points.append(left_point)
        right_points.append((width - strip_width + right_point[0], right_point[1]))

    affine_matrix, mask = cv2.estimateAffinePartial2D(
        np.float32(left_points),
        np.float32(right_points),
        method=cv2.RANSAC,
        ransacReprojThreshold=6.0,
        maxIters=5000,
        confidence=0.995,
    )

    if affine_matrix is None or mask is None:
        return result

    inliers = mask.ravel().astype(bool)
    inlier_count = int(np.count_nonzero(inliers))
    result["inlier_count"] = inlier_count
    if inlier_count < 8:
        return result

    left_inliers = np.float32(left_points)[inliers]
    right_inliers = np.float32(right_points)[inliers]
    dx = float(np.median(right_inliers[:, 0] - left_inliers[:, 0]))
    dy = float(np.median(right_inliers[:, 1] - left_inliers[:, 1]))
    overlap = int(round(width - dx))
    vertical_shift = int(round(dy))

    if overlap < 24 or overlap > int(width * 0.22):
        return result

    if abs(vertical_shift) > int(height * 0.08):
        return result

    result["overlap"] = overlap
    result["shift"] = vertical_shift
    result["confidence"] = float(inlier_count / max(1, len(good_matches)))
    return result


def close_loop(image: np.ndarray, overlap: int, shift: int) -> np.ndarray:
    height, width = image.shape[:2]
    if overlap <= 0 or overlap >= int(width * 0.35):
        return image.copy()

    output_width = width - overlap
    output = image[:, :output_width].copy().astype(np.float32)

    start_strip = image[:, :overlap].astype(np.float32)
    suffix_rows = np.clip(np.arange(height) + shift, 0, height - 1)
    suffix_cols = np.arange(output_width, width)
    end_strip = image[suffix_rows[:, None], suffix_cols[None, :]].astype(np.float32)

    blend = smooth_step(np.linspace(0.0, 1.0, overlap, dtype=np.float32)).reshape(1, overlap, 1)
    output[:, :overlap] = (end_strip * (1.0 - blend)) + (start_strip * blend)
    return np.clip(np.round(output), 0, 255).astype(np.uint8)


def estimate_seam_vertical_shift(image: np.ndarray) -> int:
    preview, scale = build_preview(image)
    preview = preview.astype(np.int16)
    height, width = preview.shape[:2]

    max_shift = max(6, round(height * 0.05))
    strip_width = max(12, round(width * 0.03))
    x_step = 4
    y_step = 4
    best_score = float("inf")
    best_shift = 0
    xs = np.arange(0, strip_width, x_step)
    rows = np.arange(0, height, y_step)

    for shift in range(-max_shift, max_shift + 1):
        shifted_rows = rows + shift
        valid = (shifted_rows >= 0) & (shifted_rows < height)
        if not np.any(valid):
            continue

        current_rows = rows[valid]
        aligned_rows = shifted_rows[valid]
        left = preview[current_rows[:, None], xs[None, :]]
        right = preview[aligned_rows[:, None], (width - strip_width) + xs[None, :]]
        score = float(np.mean(np.abs(left - right)))

        if score < best_score:
            best_score = score
            best_shift = shift

    full_height = image.shape[0]
    return int(round(best_shift * (full_height / height)))


def align_seam(image: np.ndarray, seam_shift: int) -> np.ndarray:
    if seam_shift == 0:
        return image.copy()

    height, width = image.shape[:2]
    x_positions = np.linspace(0.0, 1.0, width, dtype=np.float32)
    vertical_offsets = ((x_positions - 0.5) * seam_shift).astype(np.float32)
    map_x = np.tile(np.arange(width, dtype=np.float32), (height, 1))
    map_y = np.arange(height, dtype=np.float32)[:, None] + vertical_offsets[None, :]

    return cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )


def blend_seam_edges(image: np.ndarray, blend_ratio: float = 0.07) -> np.ndarray:
    height, width = image.shape[:2]
    blend_width = max(18, round(width * blend_ratio))
    if blend_width * 2 >= width:
        return image.copy()

    result = image.astype(np.float32).copy()
    left = image[:, :blend_width].astype(np.float32)
    right = image[:, width - blend_width :].astype(np.float32)
    blend = smooth_step(np.linspace(0.0, 1.0, blend_width, dtype=np.float32)).reshape(1, blend_width, 1)
    merged = (right * (1.0 - blend)) + (left * blend)
    result[:, :blend_width] = merged
    result[:, width - blend_width :] = merged
    return np.clip(np.round(result), 0, 255).astype(np.uint8)


def maybe_close_loop(image: np.ndarray) -> tuple[np.ndarray, dict[str, int | float]]:
    baseline_score = measure_seam_score(image)
    feature_result = estimate_end_overlap_with_features(image)
    overlap = int(feature_result["overlap"])
    shift = int(feature_result["shift"])

    if overlap <= 0:
        feature_result["accepted"] = 0
        feature_result["baseline_score"] = baseline_score
        feature_result["result_score"] = baseline_score
        return image.copy(), feature_result

    candidate = close_loop(image, overlap, shift)
    candidate_score = measure_seam_score(candidate)
    accepted = int(candidate_score < (baseline_score - 1.0) and candidate_score <= (baseline_score * 0.9))

    feature_result["accepted"] = accepted
    feature_result["baseline_score"] = baseline_score
    feature_result["result_score"] = candidate_score if accepted else baseline_score

    if accepted:
        return candidate, feature_result

    feature_result["overlap"] = 0
    feature_result["shift"] = 0
    return image.copy(), feature_result


def maybe_align_seam(image: np.ndarray) -> tuple[np.ndarray, int, float]:
    baseline_score = measure_seam_score(image)
    seam_shift = estimate_seam_vertical_shift(image)

    if seam_shift == 0:
        return image.copy(), 0, baseline_score

    candidate = align_seam(image, seam_shift)
    candidate_score = measure_seam_score(candidate)

    if candidate_score < (baseline_score - 0.5) and candidate_score <= (baseline_score * 0.97):
        return candidate, seam_shift, candidate_score

    return image.copy(), 0, baseline_score


def maybe_blend_seam(image: np.ndarray) -> tuple[np.ndarray, float]:
    baseline_score = measure_seam_score(image)
    candidate = blend_seam_edges(image)
    candidate_score = measure_seam_score(candidate)

    if candidate_score <= baseline_score:
        return candidate, candidate_score

    return image.copy(), baseline_score


def resize_output(image: np.ndarray, max_width: int) -> np.ndarray:
    height, width = image.shape[:2]
    if max_width <= 0 or width <= max_width:
        return image

    scale = max_width / width
    return cv2.resize(
        image,
        (int(round(width * scale)), int(round(height * scale))),
        interpolation=cv2.INTER_AREA,
    )


def write_image(output_path: Path, image: np.ndarray, jpeg_quality: int) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    suffix = output_path.suffix.lower()

    if suffix in {".jpg", ".jpeg"}:
        success = cv2.imwrite(str(output_path), image, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
    elif suffix == ".png":
        success = cv2.imwrite(str(output_path), image, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    else:
        success = cv2.imwrite(str(output_path), image)

    if not success:
        raise RuntimeError(f"Could not write image: {output_path}")


def process_scene(scene: Scene, output_dir: Path, max_width: int, jpeg_quality: int) -> dict[str, object]:
    images = load_images(scene.files)
    stitched, stitch_mode = stitch_images(images)
    source_height, source_width = stitched.shape[:2]

    cropped, crop_box = crop_to_content(stitched)
    loop_closed, loop_metadata = maybe_close_loop(cropped)
    aligned, seam_shift, aligned_score = maybe_align_seam(loop_closed)
    prepared, prepared_score = maybe_blend_seam(aligned)
    final_image = resize_output(prepared, max_width=max_width)

    output_path = output_dir / scene.output_name
    passthrough_copy = (
        len(scene.files) == 1
        and final_image.shape == images[0].shape
        and np.array_equal(final_image, images[0])
        and output_path.suffix.lower() == scene.files[0].suffix.lower()
    )

    if passthrough_copy:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(scene.files[0], output_path)
    else:
        write_image(output_path, final_image, jpeg_quality=jpeg_quality)

    final_height, final_width = final_image.shape[:2]
    metadata = {
        "scene": scene.name,
        "source_files": [path.as_posix() for path in scene.files],
        "stitch_mode": stitch_mode,
        "crop_box": crop_box,
        "removed_overlap_px": int(loop_metadata["overlap"]),
        "overlap_vertical_shift_px": int(loop_metadata["shift"]),
        "loop_close_applied": bool(loop_metadata["accepted"]),
        "feature_match_count": int(loop_metadata["match_count"]),
        "feature_inlier_count": int(loop_metadata["inlier_count"]),
        "feature_confidence": float(loop_metadata["confidence"]),
        "seam_score_before_loop_close": float(loop_metadata["baseline_score"]),
        "seam_score_after_loop_close": float(loop_metadata["result_score"]),
        "seam_vertical_shift_px": seam_shift,
        "seam_score_after_alignment": float(aligned_score),
        "seam_score_after_blend": float(prepared_score),
        "passthrough_copy": passthrough_copy,
        "source_size": {"width": int(source_width), "height": int(source_height)},
        "output_size": {"width": int(final_width), "height": int(final_height)},
        "output_file": output_path.as_posix(),
    }

    metadata_path = output_path.with_suffix(".json")
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preprocess panorama source images into viewer-ready files for the JavaScript panorama viewer."
    )
    parser.add_argument("--input-dir", default="Images", help="Folder with source images or per-scene subfolders.")
    parser.add_argument("--output-dir", default="360_Images", help="Folder for processed panoramas.")
    parser.add_argument("--max-width", type=int, default=0, help="Maximum output width in pixels. Use 0 to keep source width.")
    parser.add_argument("--jpeg-quality", type=int, default=92, help="JPEG quality for .jpg/.jpeg outputs when re-encoding is needed.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        raise SystemExit(f"Input directory does not exist: {input_dir}")

    scenes = discover_scenes(input_dir)
    if not scenes:
        raise SystemExit(f"No source images found in: {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_items: list[dict[str, object]] = []

    for scene in scenes:
        metadata = process_scene(scene, output_dir=output_dir, max_width=args.max_width, jpeg_quality=args.jpeg_quality)
        manifest_items.append(metadata)
        print(f"Processed {scene.name} -> {metadata['output_file']}")

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": manifest_items,
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote manifest -> {(output_dir / 'manifest.json').as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
