// ===========================
// Smooth Scrolling Navigation
// ===========================

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (event) {
        event.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));

        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });

        document.querySelectorAll(".nav-link").forEach((link) => {
            link.classList.remove("active");
        });

        this.classList.add("active");
    });
});

// ===========================
// Update Active Navigation on Scroll
// ===========================

window.addEventListener("scroll", () => {
    let current = "";

    document.querySelectorAll("section").forEach((section) => {
        if (window.scrollY >= section.offsetTop - 200) {
            current = section.getAttribute("id");
        }
    });

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });
});

// ===========================
// Mobile Menu Toggle
// ===========================

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
        navMenu.style.display = navMenu.style.display === "flex" ? "none" : "flex";
    });
}

// ===========================
// Panorama Viewer
// ===========================

const PANORAMA_TURN = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

class PanoramaViewer {
    constructor(containerId, imagePath) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            return;
        }

        this.imagePath = imagePath;
        this.initialized = false;
        this.image = null;
        this.canvas = null;
        this.ctx = null;
        this.sourcePixels = null;
        this.sourceWidth = 0;
        this.sourceHeight = 0;
        this.baseRayDirections = null;
        this.outputFrame = null;
        this.loadingLabel = null;
        this.isDragging = false;
        this.pointerId = null;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.frameId = 0;
        this.lastFrameTime = 0;
        this.lastInteractionAt = 0;
        this.defaultYaw = 0;
        this.yaw = this.defaultYaw;
        this.defaultPitch = -0.18;
        this.pitch = this.defaultPitch;
        this.verticalFov = 72 * DEG_TO_RAD;
        this.pitchLimit = 0.95;
        this.autoRotateSpeed = 0.1;
        this.dragSensitivityX = 0.0055;
        this.dragSensitivityY = 0.0042;
        this.resumeRotationDelay = 1400;
        this.verticalStretch = 1.18;
        this.seamBlendRatio = 0.07;
        this.renderSeamBlendRatio = 0.12;
        this.seamVerticalShift = 0;
        this.seamSearchRatio = 0.05;
        this.seamStripRatio = 0.03;
        this.endOverlapWidth = 0;
        this.endOverlapShift = 0;
        this.cylinderHeight = 0;
        this.halfCylinderHeight = 0;
        this.maxRenderPixels = 160000;
        this.sampleBufferA = new Float32Array(3);
        this.sampleBufferB = new Float32Array(3);

        this.handlePointerDown = this.onPointerDown.bind(this);
        this.handlePointerMove = this.onPointerMove.bind(this);
        this.handlePointerUp = this.onPointerUp.bind(this);
        this.handleResize = this.refreshMetrics.bind(this);
        this.handleAnimationFrame = this.animate.bind(this);

        this.init();
    }

    init() {
        this.container.classList.add("is-loading");

        this.loadingLabel = this.container.querySelector(".panorama-loading-label");

        const canvas = document.createElement("canvas");
        canvas.className = "panorama-canvas";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Interactive panoramic view of the field site");
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d", { alpha: false });
        this.container.appendChild(canvas);

        const image = new Image();
        image.alt = "Interactive panoramic view of the field site";
        image.draggable = false;
        this.image = image;

        image.addEventListener("load", () => {
            this.captureSourcePixels();
            this.initialized = true;
            this.container.classList.remove("is-loading", "is-error");
            this.container.classList.add("is-ready");
            this.refreshMetrics();
            this.lastFrameTime = performance.now();
            this.frameId = window.requestAnimationFrame(this.handleAnimationFrame);
        });

        image.addEventListener("error", () => {
            this.container.classList.remove("is-loading", "is-ready");
            this.container.classList.add("is-error");

            if (this.loadingLabel) {
                this.loadingLabel.textContent = "Panorama image could not be loaded.";
            }
        });

        this.container.addEventListener("pointerdown", this.handlePointerDown);
        window.addEventListener("pointermove", this.handlePointerMove);
        window.addEventListener("pointerup", this.handlePointerUp);
        window.addEventListener("pointercancel", this.handlePointerUp);
        window.addEventListener("resize", this.handleResize);
        document.addEventListener("fullscreenchange", this.handleResize);

        image.src = this.imagePath;
    }

    captureSourcePixels() {
        if (!this.image || !this.image.naturalWidth || !this.image.naturalHeight) {
            return;
        }

        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = this.image.naturalWidth;
        sourceCanvas.height = this.image.naturalHeight;

        const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
        if (!sourceCtx) {
            return;
        }

        sourceCtx.drawImage(this.image, 0, 0);

        const rawWidth = sourceCanvas.width;
        const rawHeight = sourceCanvas.height;
        const rawPixels = sourceCtx.getImageData(0, 0, rawWidth, rawHeight).data;
        const loopClosed = this.buildLoopClosedPixels(rawPixels, rawWidth, rawHeight);

        this.sourceWidth = loopClosed.width;
        this.sourceHeight = rawHeight;
        this.seamVerticalShift = this.estimateSeamVerticalShift(loopClosed.pixels, this.sourceWidth, this.sourceHeight);
        this.sourcePixels = this.buildStitchedPixels(
            loopClosed.pixels,
            this.sourceWidth,
            this.sourceHeight
        );
    }

    buildLoopClosedPixels(sourceData, width, height) {
        const overlapConfig = this.estimateEndOverlap(sourceData, width, height);
        this.endOverlapWidth = overlapConfig.overlap;
        this.endOverlapShift = overlapConfig.shift;

        if (this.endOverlapWidth <= 0 || this.endOverlapWidth >= (width * 0.35)) {
            return {
                pixels: new Uint8ClampedArray(sourceData),
                width
            };
        }

        const outputWidth = width - this.endOverlapWidth;
        const outputPixels = new Uint8ClampedArray(outputWidth * height * 4);
        const endBuffer = new Float32Array(3);
        const startBuffer = new Float32Array(3);

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < outputWidth; x += 1) {
                const targetIndex = ((y * outputWidth) + x) * 4;

                if (x < this.endOverlapWidth) {
                    const mix = this.smoothStep(this.endOverlapWidth <= 1 ? 1 : x / (this.endOverlapWidth - 1));
                    const suffixX = outputWidth + x;
                    const suffixY = y + this.endOverlapShift;

                    this.readSampleIntoBuffer(sourceData, width, height, suffixX, suffixY, endBuffer, false);
                    this.readSampleIntoBuffer(sourceData, width, height, x, y, startBuffer, false);

                    for (let channel = 0; channel < 3; channel += 1) {
                        outputPixels[targetIndex + channel] = Math.round(
                            (endBuffer[channel] * (1 - mix)) + (startBuffer[channel] * mix)
                        );
                    }

                    outputPixels[targetIndex + 3] = 255;
                    continue;
                }

                this.writeSampleToTarget(sourceData, width, height, x, y, outputPixels, targetIndex, false);
            }
        }

        return {
            pixels: outputPixels,
            width: outputWidth
        };
    }

    estimateEndOverlap(sourceData, width, height) {
        const minOverlap = Math.max(96, Math.round(width * 0.06));
        const maxOverlap = Math.min(Math.round(width * 0.22), Math.floor(width / 3));
        const overlapStep = 8;
        const maxShift = Math.max(8, Math.round(height * 0.05));
        const shiftStep = 4;
        const xStep = 8;
        const yStep = 8;
        let bestOverlap = 0;
        let bestShift = 0;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let overlap = minOverlap; overlap <= maxOverlap; overlap += overlapStep) {
            for (let shift = -maxShift; shift <= maxShift; shift += shiftStep) {
                let score = 0;
                let count = 0;

                for (let x = 0; x < overlap; x += xStep) {
                    for (let y = 0; y < height; y += yStep) {
                        const shiftedY = y + shift;

                        if (shiftedY < 0 || shiftedY >= height) {
                            continue;
                        }

                        const startIndex = ((y * width) + x) * 4;
                        const endIndex = ((shiftedY * width) + ((width - overlap) + x)) * 4;

                        score += Math.abs(sourceData[startIndex] - sourceData[endIndex]);
                        score += Math.abs(sourceData[startIndex + 1] - sourceData[endIndex + 1]);
                        score += Math.abs(sourceData[startIndex + 2] - sourceData[endIndex + 2]);
                        count += 1;
                    }
                }

                if (count === 0) {
                    continue;
                }

                const normalizedScore = score / count;

                if (normalizedScore < bestScore) {
                    bestScore = normalizedScore;
                    bestOverlap = overlap;
                    bestShift = shift;
                }
            }
        }

        return {
            overlap: bestOverlap,
            shift: bestShift
        };
    }

    estimateSeamVerticalShift(sourceData, width, height) {
        const maxShift = Math.max(6, Math.round(height * this.seamSearchRatio));
        const stripWidth = Math.max(12, Math.round(width * this.seamStripRatio));
        const xStep = 4;
        const yStep = 4;
        let bestShift = 0;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let shift = -maxShift; shift <= maxShift; shift += 1) {
            let score = 0;
            let count = 0;

            for (let y = 0; y < height; y += yStep) {
                const shiftedY = y + shift;

                if (shiftedY < 0 || shiftedY >= height) {
                    continue;
                }

                for (let x = 0; x < stripWidth; x += xStep) {
                    const leftIndex = ((y * width) + x) * 4;
                    const rightIndex = ((shiftedY * width) + ((width - stripWidth) + x)) * 4;
                    const redDelta = sourceData[leftIndex] - sourceData[rightIndex];
                    const greenDelta = sourceData[leftIndex + 1] - sourceData[rightIndex + 1];
                    const blueDelta = sourceData[leftIndex + 2] - sourceData[rightIndex + 2];

                    score += Math.abs(redDelta) + Math.abs(greenDelta) + Math.abs(blueDelta);
                    count += 1;
                }
            }

            if (count === 0) {
                continue;
            }

            const normalizedScore = score / count;

            if (normalizedScore < bestScore) {
                bestScore = normalizedScore;
                bestShift = shift;
            }
        }

        return bestShift;
    }

    buildStitchedPixels(sourceData, width, height) {
        const alignedPixels = new Uint8ClampedArray(sourceData.length);

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const horizontalProgress = width <= 1 ? 0.5 : x / (width - 1);
                const correctedY = y + ((horizontalProgress - 0.5) * this.seamVerticalShift);
                const targetIndex = ((y * width) + x) * 4;

                this.writeSampleToTarget(
                    sourceData,
                    width,
                    height,
                    x,
                    correctedY,
                    alignedPixels,
                    targetIndex,
                    false
                );
            }
        }

        return this.buildSeamBlendedPixels(alignedPixels, width, height);
    }

    buildSeamBlendedPixels(sourceData, width, height) {
        const blendedPixels = new Uint8ClampedArray(sourceData);
        const seamBlendWidth = Math.max(18, Math.round(width * this.seamBlendRatio));

        for (let y = 0; y < height; y += 1) {
            for (let offset = 0; offset < seamBlendWidth; offset += 1) {
                const linearMix = seamBlendWidth <= 1 ? 1 : offset / (seamBlendWidth - 1);
                const mix = this.smoothStep(linearMix);
                const leftX = offset;
                const rightX = (width - seamBlendWidth) + offset;
                const leftIndex = ((y * width) + leftX) * 4;
                const rightIndex = ((y * width) + rightX) * 4;

                for (let channel = 0; channel < 3; channel += 1) {
                    const leftValue = sourceData[leftIndex + channel];
                    const rightValue = sourceData[rightIndex + channel];
                    const blendedValue = Math.round((rightValue * (1 - mix)) + (leftValue * mix));

                    blendedPixels[leftIndex + channel] = blendedValue;
                    blendedPixels[rightIndex + channel] = blendedValue;
                }

                blendedPixels[leftIndex + 3] = 255;
                blendedPixels[rightIndex + 3] = 255;
            }
        }

        return blendedPixels;
    }

    smoothStep(value) {
        return value * value * (3 - (2 * value));
    }

    writeSampleToTarget(sourceData, width, height, sourceX, sourceY, targetData, targetIndex, wrapX = true) {
        const wrappedX = wrapX ? this.wrapCoordinate(sourceX, width) : Math.max(0, Math.min(width - 1, sourceX));
        const clampedY = Math.max(0, Math.min(height - 1, sourceY));
        const x0 = Math.floor(wrappedX);
        const x1 = wrapX ? ((x0 + 1) % width) : Math.min(width - 1, x0 + 1);
        const y0 = Math.floor(clampedY);
        const y1 = Math.min(height - 1, y0 + 1);
        const tx = wrappedX - x0;
        const ty = clampedY - y0;
        const topLeftIndex = ((y0 * width) + x0) * 4;
        const topRightIndex = ((y0 * width) + x1) * 4;
        const bottomLeftIndex = ((y1 * width) + x0) * 4;
        const bottomRightIndex = ((y1 * width) + x1) * 4;

        for (let channel = 0; channel < 3; channel += 1) {
            const top = (sourceData[topLeftIndex + channel] * (1 - tx)) + (sourceData[topRightIndex + channel] * tx);
            const bottom = (sourceData[bottomLeftIndex + channel] * (1 - tx)) + (sourceData[bottomRightIndex + channel] * tx);

            targetData[targetIndex + channel] = Math.round((top * (1 - ty)) + (bottom * ty));
        }

        targetData[targetIndex + 3] = 255;
    }

    readSampleIntoBuffer(sourceData, width, height, sourceX, sourceY, buffer, wrapX = true) {
        const wrappedX = wrapX ? this.wrapCoordinate(sourceX, width) : Math.max(0, Math.min(width - 1, sourceX));
        const clampedY = Math.max(0, Math.min(height - 1, sourceY));
        const x0 = Math.floor(wrappedX);
        const x1 = wrapX ? ((x0 + 1) % width) : Math.min(width - 1, x0 + 1);
        const y0 = Math.floor(clampedY);
        const y1 = Math.min(height - 1, y0 + 1);
        const tx = wrappedX - x0;
        const ty = clampedY - y0;
        const topLeftIndex = ((y0 * width) + x0) * 4;
        const topRightIndex = ((y0 * width) + x1) * 4;
        const bottomLeftIndex = ((y1 * width) + x0) * 4;
        const bottomRightIndex = ((y1 * width) + x1) * 4;

        for (let channel = 0; channel < 3; channel += 1) {
            const top = (sourceData[topLeftIndex + channel] * (1 - tx)) + (sourceData[topRightIndex + channel] * tx);
            const bottom = (sourceData[bottomLeftIndex + channel] * (1 - tx)) + (sourceData[bottomRightIndex + channel] * tx);

            buffer[channel] = (top * (1 - ty)) + (bottom * ty);
        }
    }

    writePanoramaSampleToTarget(sourceData, width, height, sourceX, sourceY, targetData, targetIndex) {
        const wrappedX = this.wrapCoordinate(sourceX, width);
        const seamBlendWidth = Math.max(28, Math.round(width * this.renderSeamBlendRatio));

        if (wrappedX < seamBlendWidth) {
            const overlapMix = this.smoothStep(wrappedX / seamBlendWidth);
            const overlapX = width - seamBlendWidth + wrappedX;

            this.readSampleIntoBuffer(sourceData, width, height, overlapX, sourceY, this.sampleBufferA);
            this.readSampleIntoBuffer(sourceData, width, height, wrappedX, sourceY, this.sampleBufferB);

            for (let channel = 0; channel < 3; channel += 1) {
                targetData[targetIndex + channel] = Math.round(
                    (this.sampleBufferA[channel] * (1 - overlapMix)) + (this.sampleBufferB[channel] * overlapMix)
                );
            }

            targetData[targetIndex + 3] = 255;
            return;
        }

        if (wrappedX > width - seamBlendWidth) {
            const localX = wrappedX - (width - seamBlendWidth);
            const overlapMix = this.smoothStep(localX / seamBlendWidth);

            this.readSampleIntoBuffer(sourceData, width, height, wrappedX, sourceY, this.sampleBufferA);
            this.readSampleIntoBuffer(sourceData, width, height, localX, sourceY, this.sampleBufferB);

            for (let channel = 0; channel < 3; channel += 1) {
                targetData[targetIndex + channel] = Math.round(
                    (this.sampleBufferA[channel] * (1 - overlapMix)) + (this.sampleBufferB[channel] * overlapMix)
                );
            }

            targetData[targetIndex + 3] = 255;
            return;
        }

        this.writeSampleToTarget(sourceData, width, height, wrappedX, sourceY, targetData, targetIndex);
    }

    wrapCoordinate(value, size) {
        let wrappedValue = value % size;

        if (wrappedValue < 0) {
            wrappedValue += size;
        }

        return wrappedValue;
    }

    refreshMetrics() {
        if (!this.initialized || !this.canvas || !this.ctx || !this.sourcePixels) {
            return;
        }

        const containerHeight = this.container.clientHeight;
        const containerWidth = this.container.clientWidth;

        if (!containerHeight || !containerWidth || !this.sourceHeight || !this.sourceWidth) {
            return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.15);
        const desiredWidth = Math.max(180, Math.round(containerWidth * pixelRatio));
        const desiredHeight = Math.max(320, Math.round(containerHeight * pixelRatio));
        const scale = Math.min(1, Math.sqrt(this.maxRenderPixels / (desiredWidth * desiredHeight)));
        const renderWidth = Math.max(180, Math.round(desiredWidth * scale));
        const renderHeight = Math.max(320, Math.round(desiredHeight * scale));
        const aspectRatio = renderWidth / renderHeight;
        const halfVerticalTan = Math.tan(this.verticalFov / 2);
        const halfHorizontalTan = halfVerticalTan * aspectRatio;
        const imageRatio = this.sourceHeight / this.sourceWidth;

        this.canvas.width = renderWidth;
        this.canvas.height = renderHeight;
        this.outputFrame = this.ctx.createImageData(renderWidth, renderHeight);
        this.baseRayDirections = new Float32Array(renderWidth * renderHeight * 3);
        this.cylinderHeight = PANORAMA_TURN * imageRatio * this.verticalStretch;
        this.halfCylinderHeight = this.cylinderHeight / 2;

        let directionIndex = 0;

        for (let y = 0; y < renderHeight; y += 1) {
            const normalizedY = 1 - ((((y + 0.5) / renderHeight) - 0.5) * 2);
            const planeY = normalizedY * halfVerticalTan;

            for (let x = 0; x < renderWidth; x += 1) {
                const normalizedX = (((x + 0.5) / renderWidth) - 0.5) * 2;
                const planeX = normalizedX * halfHorizontalTan;
                const inverseLength = 1 / Math.hypot(planeX, planeY, 1);

                this.baseRayDirections[directionIndex] = planeX * inverseLength;
                this.baseRayDirections[directionIndex + 1] = planeY * inverseLength;
                this.baseRayDirections[directionIndex + 2] = inverseLength;
                directionIndex += 3;
            }
        }

        this.render();
    }

    onPointerDown(event) {
        if (!this.initialized) {
            return;
        }

        event.preventDefault();
        this.isDragging = true;
        this.pointerId = event.pointerId;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;
        this.lastInteractionAt = performance.now();
        this.container.classList.add("is-dragging");
        this.container.setPointerCapture?.(event.pointerId);
    }

    onPointerMove(event) {
        if (!this.isDragging || !this.initialized) {
            return;
        }

        if (this.pointerId !== null && event.pointerId !== this.pointerId) {
            return;
        }

        const deltaX = event.clientX - this.lastPointerX;
        const deltaY = event.clientY - this.lastPointerY;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;
        this.lastInteractionAt = performance.now();
        this.yaw = this.wrapYaw(this.yaw - (deltaX * this.dragSensitivityX));
        this.pitch = this.clampPitch(this.pitch + (deltaY * this.dragSensitivityY));
        this.render();
    }

    onPointerUp(event) {
        if (!this.initialized) {
            return;
        }

        if (this.pointerId !== null && event.pointerId !== undefined && event.pointerId !== this.pointerId) {
            return;
        }

        this.isDragging = false;
        this.container.releasePointerCapture?.(this.pointerId);
        this.pointerId = null;
        this.lastInteractionAt = performance.now();
        this.container.classList.remove("is-dragging");
    }

    animate(timestamp) {
        if (!this.initialized) {
            return;
        }

        const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = timestamp;

        if (!this.isDragging && (timestamp - this.lastInteractionAt) > this.resumeRotationDelay) {
            this.yaw = this.wrapYaw(this.yaw + (this.autoRotateSpeed * deltaTime));
        }

        this.render();
        this.frameId = window.requestAnimationFrame(this.handleAnimationFrame);
    }

    clampPitch(angle) {
        return Math.max(-this.pitchLimit, Math.min(this.pitchLimit, angle));
    }

    wrapYaw(angle) {
        let wrappedAngle = angle % PANORAMA_TURN;

        if (wrappedAngle < 0) {
            wrappedAngle += PANORAMA_TURN;
        }

        return wrappedAngle;
    }

    render() {
        if (!this.ctx || !this.canvas || !this.sourcePixels || !this.baseRayDirections || !this.outputFrame) {
            return;
        }

        const cosYaw = Math.cos(this.yaw);
        const sinYaw = Math.sin(this.yaw);
        const cosPitch = Math.cos(this.pitch);
        const sinPitch = Math.sin(this.pitch);
        const renderWidth = this.canvas.width;
        const renderHeight = this.canvas.height;
        const output = this.outputFrame.data;
        const source = this.sourcePixels;
        const sourceHeight = this.sourceHeight;
        const sourceWidth = this.sourceWidth;
        const halfCylinderHeight = this.halfCylinderHeight;
        const cylinderHeight = this.cylinderHeight;

        let directionIndex = 0;
        let outputIndex = 0;

        for (let pixelIndex = 0; pixelIndex < renderWidth * renderHeight; pixelIndex += 1) {
            const rayX = this.baseRayDirections[directionIndex];
            const rayY = this.baseRayDirections[directionIndex + 1];
            const rayZ = this.baseRayDirections[directionIndex + 2];
            directionIndex += 3;

            const pitchedY = (rayY * cosPitch) + (rayZ * sinPitch);
            const pitchedZ = (rayZ * cosPitch) - (rayY * sinPitch);
            const worldX = (rayX * cosYaw) + (pitchedZ * sinYaw);
            const worldZ = (pitchedZ * cosYaw) - (rayX * sinYaw);
            const radius = Math.hypot(worldX, worldZ);

            if (radius <= 0.000001) {
                output[outputIndex] = 0;
                output[outputIndex + 1] = 0;
                output[outputIndex + 2] = 0;
                output[outputIndex + 3] = 255;
                outputIndex += 4;
                continue;
            }

            const cylinderY = pitchedY / radius;

            if (cylinderY < -halfCylinderHeight || cylinderY > halfCylinderHeight) {
                output[outputIndex] = 0;
                output[outputIndex + 1] = 0;
                output[outputIndex + 2] = 0;
                output[outputIndex + 3] = 255;
                outputIndex += 4;
                continue;
            }

            const sourceX = ((Math.atan2(worldX, worldZ) / PANORAMA_TURN) + 0.5) * sourceWidth;
            const sourceY = (0.5 - (cylinderY / cylinderHeight)) * (sourceHeight - 1);

            this.writePanoramaSampleToTarget(
                source,
                sourceWidth,
                sourceHeight,
                sourceX,
                sourceY,
                output,
                outputIndex
            );
            outputIndex += 4;
        }

        this.ctx.putImageData(this.outputFrame, 0, 0);
    }

    reset() {
        if (!this.initialized) {
            return;
        }

        this.yaw = this.defaultYaw;
        this.pitch = this.defaultPitch;
        this.lastInteractionAt = 0;
        this.render();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().catch(() => {});
            return;
        }

        document.exitFullscreen();
    }
}

// ===========================
// Initialize Panorama Viewer
// ===========================

document.addEventListener("DOMContentLoaded", () => {
    const viewer = new PanoramaViewer("panorama", "panorama-360.jpeg");

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.reset();
        });
    }

    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.toggleFullscreen();
        });
    }
});

// ===========================
// Scroll Animation
// ===========================

const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }

        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
    });
}, observerOptions);

document.querySelectorAll("section").forEach((section) => {
    section.style.opacity = "0";
    section.style.transform = "translateY(20px)";
    section.style.transition = "all 0.6s ease-out";
    observer.observe(section);
});
