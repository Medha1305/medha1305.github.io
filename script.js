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
const HALF_TURN = Math.PI;
const DEG_TO_RAD = Math.PI / 180;

class PanoramaViewer {
    constructor(containerId, imagePath) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            return;
        }

        this.imagePath = imagePath;
        this.initialized = false;
        this.usingFallbackImage = false;
        this.image = null;
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.vertexBuffer = null;
        this.texture = null;
        this.positionAttribute = null;
        this.textureUniform = null;
        this.aspectUniform = null;
        this.yawUniform = null;
        this.pitchUniform = null;
        this.verticalFovUniform = null;
        this.cylinderHeightUniform = null;
        this.sourceWidth = 0;
        this.sourceHeight = 0;
        this.aspectRatio = 1;
        this.cylinderHeight = 1;
        this.halfCylinderHeight = 0.5;
        this.loadingLabel = null;
        this.activePointers = new Map();
        this.dragPointerId = null;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.defaultYaw = 0;
        this.defaultPitch = 0;
        this.yaw = this.defaultYaw;
        this.pitch = this.defaultPitch;
        this.defaultVerticalFov = 52 * DEG_TO_RAD;
        this.verticalFov = this.defaultVerticalFov;
        this.minVerticalFov = 20 * DEG_TO_RAD;
        this.maxVerticalFov = 92 * DEG_TO_RAD;
        this.pitchMargin = 0.04;
        this.verticalStretch = 1.18;
        this.maxPitch = 82 * DEG_TO_RAD;
        this.dragSensitivityX = 0.0046;
        this.dragSensitivityY = 0.0038;
        this.wheelZoomFactor = 0.0013;
        this.buttonZoomStep = 6 * DEG_TO_RAD;
        this.pinchStartDistance = 0;
        this.pinchStartFov = this.verticalFov;
        this.renderQueued = false;
        this.autoRotateButton = null;
        this.autoRotateEnabled = true;
        this.autoRotateSpeed = 5 * DEG_TO_RAD;
        this.autoRotateResumeDelay = 2800;
        this.autoRotateResumeAt = 0;
        this.autoRotateFrameId = 0;
        this.autoRotateLastFrameTime = 0;

        this.handlePointerDown = this.onPointerDown.bind(this);
        this.handlePointerMove = this.onPointerMove.bind(this);
        this.handlePointerUp = this.onPointerUp.bind(this);
        this.handleWheel = this.onWheel.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);
        this.handleResize = this.refreshMetrics.bind(this);

        this.init();
    }

    init() {
        this.container.classList.add("is-loading");
        this.container.setAttribute("tabindex", "0");
        this.container.setAttribute("aria-label", "Interactive 360 degree panorama viewer");
        this.loadingLabel = this.container.querySelector(".panorama-loading-label");

        const canvas = document.createElement("canvas");
        canvas.className = "panorama-canvas";
        canvas.setAttribute("aria-hidden", "true");
        this.canvas = canvas;
        this.container.appendChild(canvas);

        const gl = canvas.getContext("webgl", {
            alpha: false,
            antialias: true,
            depth: false,
            powerPreference: "high-performance",
            premultipliedAlpha: false
        });

        if (!gl) {
            this.initializeFallbackImage();
            return;
        }

        this.gl = gl;

        if (!this.initializeGlProgram()) {
            this.initializeFallbackImage();
            return;
        }

        const image = new Image();
        image.draggable = false;
        image.decoding = "async";
        this.image = image;

        image.addEventListener("load", () => {
            this.sourceWidth = image.naturalWidth;
            this.sourceHeight = image.naturalHeight;
            this.cylinderHeight = this.getCylinderHeight();
            this.halfCylinderHeight = this.cylinderHeight / 2;
            this.defaultVerticalFov = Math.min(52 * DEG_TO_RAD, this.getMaxUsableFov());
            this.verticalFov = this.defaultVerticalFov;
            this.verticalFov = this.clampFov(this.verticalFov);
            this.defaultPitch = this.clampPitch(this.defaultPitch);
            this.pitch = this.clampPitch(this.pitch);

            if (!this.uploadTexture()) {
                this.showError("The panorama could not be prepared for viewing.");
                return;
            }

            this.initialized = true;
            this.container.classList.remove("is-loading", "is-error");
            this.container.classList.add("is-ready");
            this.refreshMetrics();
            this.requestRender();
            this.startAutoRotateLoop();
        });

        image.addEventListener("error", () => {
            this.showError("Panorama image could not be loaded.");
        });

        this.container.addEventListener("pointerdown", this.handlePointerDown);
        window.addEventListener("pointermove", this.handlePointerMove);
        window.addEventListener("pointerup", this.handlePointerUp);
        window.addEventListener("pointercancel", this.handlePointerUp);
        this.container.addEventListener("wheel", this.handleWheel, { passive: false });
        this.container.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("resize", this.handleResize);
        document.addEventListener("fullscreenchange", this.handleResize);

        image.src = this.imagePath;
    }

    initializeGlProgram() {
        if (!this.gl) {
            return false;
        }

        const vertexShaderSource = `
            attribute vec2 aPosition;
            varying vec2 vClipPosition;

            void main() {
                vClipPosition = aPosition;
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;

            varying vec2 vClipPosition;

            uniform sampler2D uTexture;
            uniform float uAspect;
            uniform float uYaw;
            uniform float uPitch;
            uniform float uVerticalFov;
            uniform float uCylinderHeight;

            const float TWO_PI = 6.283185307179586;

            mat3 rotationX(float angle) {
                float c = cos(angle);
                float s = sin(angle);

                return mat3(
                    1.0, 0.0, 0.0,
                    0.0, c, -s,
                    0.0, s, c
                );
            }

            mat3 rotationY(float angle) {
                float c = cos(angle);
                float s = sin(angle);

                return mat3(
                    c, 0.0, s,
                    0.0, 1.0, 0.0,
                    -s, 0.0, c
                );
            }

            void main() {
                float halfVerticalTan = tan(uVerticalFov * 0.5);
                vec3 ray = normalize(vec3(
                    vClipPosition.x * uAspect * halfVerticalTan,
                    vClipPosition.y * halfVerticalTan,
                    1.0
                ));
                vec3 direction = rotationY(uYaw) * rotationX(-uPitch) * ray;
                float radius = length(direction.xz);

                if (radius < 0.0001) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                float longitude = atan(direction.x, direction.z);
                float cylinderY = direction.y / radius;
                float textureU = fract((longitude / TWO_PI) + 0.5);
                float textureV = 0.5 - (cylinderY / max(0.0001, uCylinderHeight));

                if (textureV < 0.0 || textureV > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }

                gl_FragColor = texture2D(uTexture, vec2(textureU, clamp(textureV, 0.0, 1.0)));
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            return false;
        }

        const program = this.gl.createProgram();
        if (!program) {
            return false;
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            return false;
        }

        this.program = program;
        this.positionAttribute = this.gl.getAttribLocation(program, "aPosition");
        this.textureUniform = this.gl.getUniformLocation(program, "uTexture");
        this.aspectUniform = this.gl.getUniformLocation(program, "uAspect");
        this.yawUniform = this.gl.getUniformLocation(program, "uYaw");
        this.pitchUniform = this.gl.getUniformLocation(program, "uPitch");
        this.verticalFovUniform = this.gl.getUniformLocation(program, "uVerticalFov");
        this.cylinderHeightUniform = this.gl.getUniformLocation(program, "uCylinderHeight");

        const buffer = this.gl.createBuffer();
        if (!buffer) {
            return false;
        }

        this.vertexBuffer = buffer;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1
            ]),
            this.gl.STATIC_DRAW
        );
        this.gl.clearColor(0, 0, 0, 1);
        return true;
    }

    createShader(type, source) {
        if (!this.gl) {
            return null;
        }

        const shader = this.gl.createShader(type);
        if (!shader) {
            return null;
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    uploadTexture() {
        if (!this.gl || !this.image) {
            return false;
        }

        const texture = this.texture || this.gl.createTexture();
        if (!texture) {
            return false;
        }

        this.texture = texture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.image);
        return true;
    }

    refreshMetrics() {
        if (!this.canvas) {
            return;
        }

        const containerHeight = this.container.clientHeight;
        const containerWidth = this.container.clientWidth;

        if (!containerHeight || !containerWidth) {
            return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderWidth = Math.max(320, Math.round(containerWidth * pixelRatio));
        const renderHeight = Math.max(220, Math.round(containerHeight * pixelRatio));

        if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
            this.canvas.width = renderWidth;
            this.canvas.height = renderHeight;
        }

        this.aspectRatio = renderWidth / renderHeight;
        this.verticalFov = this.clampFov(this.verticalFov);
        this.pitch = this.clampPitch(this.pitch);
        this.requestRender();
    }

    onPointerDown(event) {
        if (!this.initialized) {
            return;
        }

        event.preventDefault();
        this.pauseAutoRotateTemporarily();
        this.container.focus({ preventScroll: true });
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.container.setPointerCapture?.(event.pointerId);

        if (this.activePointers.size === 1) {
            this.dragPointerId = event.pointerId;
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
            this.container.classList.add("is-dragging");
            return;
        }

        this.dragPointerId = null;
        this.container.classList.remove("is-dragging");
        this.startPinchGesture();
    }

    startPinchGesture() {
        const [firstPointer, secondPointer] = Array.from(this.activePointers.values());
        if (!firstPointer || !secondPointer) {
            this.pinchStartDistance = 0;
            return;
        }

        this.pinchStartDistance = Math.hypot(
            secondPointer.x - firstPointer.x,
            secondPointer.y - firstPointer.y
        );
        this.pinchStartFov = this.verticalFov;
    }

    onPointerMove(event) {
        if (!this.initialized || !this.activePointers.has(event.pointerId)) {
            return;
        }

        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (this.activePointers.size === 1 && this.dragPointerId === event.pointerId) {
            const deltaX = event.clientX - this.lastPointerX;
            const deltaY = event.clientY - this.lastPointerY;
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
            this.yaw = this.wrapYaw(this.yaw + (deltaX * this.dragSensitivityX));
            this.pitch = this.clampPitch(this.pitch - (deltaY * this.dragSensitivityY));
            this.requestRender();
            return;
        }

        if (this.activePointers.size >= 2 && this.pinchStartDistance > 0) {
            const [firstPointer, secondPointer] = Array.from(this.activePointers.values());
            const distance = Math.hypot(
                secondPointer.x - firstPointer.x,
                secondPointer.y - firstPointer.y
            );

            if (distance > 0) {
                const scale = this.pinchStartDistance / distance;
                this.verticalFov = this.clampFov(this.pinchStartFov * scale);
                this.pitch = this.clampPitch(this.pitch);
                this.requestRender();
            }
        }
    }

    onPointerUp(event) {
        if (!this.initialized || !this.activePointers.has(event.pointerId)) {
            return;
        }

        this.activePointers.delete(event.pointerId);
        this.container.releasePointerCapture?.(event.pointerId);

        if (this.activePointers.size === 0) {
            this.dragPointerId = null;
            this.pinchStartDistance = 0;
            this.container.classList.remove("is-dragging");
            return;
        }

        if (this.activePointers.size === 1) {
            const [pointerId, pointer] = Array.from(this.activePointers.entries())[0];
            this.dragPointerId = pointerId;
            this.lastPointerX = pointer.x;
            this.lastPointerY = pointer.y;
            this.pinchStartDistance = 0;
            this.container.classList.add("is-dragging");
            return;
        }

        this.dragPointerId = null;
        this.container.classList.remove("is-dragging");
        this.startPinchGesture();
    }

    onWheel(event) {
        if (!this.initialized) {
            return;
        }

        event.preventDefault();
        this.pauseAutoRotateTemporarily();
        this.verticalFov = this.clampFov(this.verticalFov + (event.deltaY * this.wheelZoomFactor));
        this.pitch = this.clampPitch(this.pitch);
        this.requestRender();
    }

    onKeyDown(event) {
        if (!this.initialized) {
            return;
        }

        this.pauseAutoRotateTemporarily();
        const step = 4 * DEG_TO_RAD;

        switch (event.key) {
            case "ArrowLeft":
                event.preventDefault();
                this.yaw = this.wrapYaw(this.yaw - step);
                this.requestRender();
                break;
            case "ArrowRight":
                event.preventDefault();
                this.yaw = this.wrapYaw(this.yaw + step);
                this.requestRender();
                break;
            case "ArrowUp":
                event.preventDefault();
                this.pitch = this.clampPitch(this.pitch + step);
                this.requestRender();
                break;
            case "ArrowDown":
                event.preventDefault();
                this.pitch = this.clampPitch(this.pitch - step);
                this.requestRender();
                break;
            case "+":
            case "=":
                event.preventDefault();
                this.zoomIn();
                break;
            case "-":
            case "_":
                event.preventDefault();
                this.zoomOut();
                break;
            case "0":
                event.preventDefault();
                this.reset();
                break;
            case "f":
            case "F":
                event.preventDefault();
                this.toggleFullscreen();
                break;
            default:
                break;
        }
    }

    zoomIn() {
        if (!this.initialized) {
            return;
        }

        this.pauseAutoRotateTemporarily();
        this.verticalFov = this.clampFov(this.verticalFov - this.buttonZoomStep);
        this.pitch = this.clampPitch(this.pitch);
        this.requestRender();
    }

    zoomOut() {
        if (!this.initialized) {
            return;
        }

        this.pauseAutoRotateTemporarily();
        this.verticalFov = this.clampFov(this.verticalFov + this.buttonZoomStep);
        this.pitch = this.clampPitch(this.pitch);
        this.requestRender();
    }

    getCylinderHeight() {
        if (!this.sourceWidth || !this.sourceHeight) {
            return PANORAMA_TURN * 0.3 * this.verticalStretch;
        }

        return (this.sourceHeight / this.sourceWidth) * PANORAMA_TURN * this.verticalStretch;
    }

    getMaxUsableFov() {
        const cylinderBound = 2 * Math.atan(Math.max(0.18, this.halfCylinderHeight - this.pitchMargin));

        return Math.max(this.minVerticalFov, Math.min(this.maxVerticalFov, cylinderBound));
    }

    clampFov(angle) {
        return Math.max(this.minVerticalFov, Math.min(this.getMaxUsableFov(), angle));
    }

    getPitchLimit() {
        const cylinderPitchLimit = Math.atan(Math.max(0.18, this.halfCylinderHeight - this.pitchMargin));

        return Math.min(this.maxPitch, cylinderPitchLimit + (this.verticalFov * 0.35));
    }

    clampPitch(angle) {
        const limit = this.getPitchLimit();
        return Math.max(-limit, Math.min(limit, angle));
    }

    wrapYaw(angle) {
        let wrappedAngle = angle % PANORAMA_TURN;

        if (wrappedAngle < 0) {
            wrappedAngle += PANORAMA_TURN;
        }

        return wrappedAngle;
    }

    startAutoRotateLoop() {
        if (
            !this.initialized ||
            this.usingFallbackImage ||
            !this.autoRotateEnabled ||
            this.autoRotateFrameId
        ) {
            return;
        }

        this.autoRotateLastFrameTime = 0;

        const tick = (timestamp) => {
            if (!this.initialized || this.usingFallbackImage || !this.autoRotateEnabled) {
                this.autoRotateFrameId = 0;
                this.autoRotateLastFrameTime = 0;
                return;
            }

            if (!this.autoRotateLastFrameTime) {
                this.autoRotateLastFrameTime = timestamp;
            }

            const deltaSeconds = Math.min((timestamp - this.autoRotateLastFrameTime) / 1000, 0.05);
            this.autoRotateLastFrameTime = timestamp;
            const shouldRotate = !document.hidden &&
                this.activePointers.size === 0 &&
                timestamp >= this.autoRotateResumeAt;

            if (shouldRotate && deltaSeconds > 0) {
                this.yaw = this.wrapYaw(this.yaw + (deltaSeconds * this.autoRotateSpeed));
                this.render();
            }

            this.autoRotateFrameId = window.requestAnimationFrame(tick);
        };

        this.autoRotateFrameId = window.requestAnimationFrame(tick);
    }

    stopAutoRotateLoop() {
        if (this.autoRotateFrameId) {
            window.cancelAnimationFrame(this.autoRotateFrameId);
        }

        this.autoRotateFrameId = 0;
        this.autoRotateLastFrameTime = 0;
    }

    pauseAutoRotateTemporarily(delay = this.autoRotateResumeDelay) {
        if (!this.autoRotateEnabled) {
            return;
        }

        this.autoRotateResumeAt = performance.now() + delay;
    }

    setAutoRotateButton(button) {
        this.autoRotateButton = button || null;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        if (!this.autoRotateButton) {
            return;
        }

        this.autoRotateButton.textContent = this.autoRotateEnabled ? "Pause Rotation" : "Start Rotation";
        this.autoRotateButton.setAttribute("aria-pressed", this.autoRotateEnabled ? "true" : "false");
    }

    requestRender() {
        if (!this.initialized || this.renderQueued || this.usingFallbackImage) {
            return;
        }

        this.renderQueued = true;
        window.requestAnimationFrame(() => {
            this.renderQueued = false;
            this.render();
        });
    }

    render() {
        if (
            !this.initialized ||
            !this.gl ||
            !this.program ||
            !this.vertexBuffer ||
            !this.texture ||
            !this.canvas
        ) {
            return;
        }

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.enableVertexAttribArray(this.positionAttribute);
        this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureUniform, 0);
        this.gl.uniform1f(this.aspectUniform, this.aspectRatio);
        this.gl.uniform1f(this.yawUniform, this.yaw);
        this.gl.uniform1f(this.pitchUniform, this.pitch);
        this.gl.uniform1f(this.verticalFovUniform, this.verticalFov);
        this.gl.uniform1f(this.cylinderHeightUniform, this.cylinderHeight);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    initializeFallbackImage() {
        this.usingFallbackImage = true;

        const fallbackImage = document.createElement("img");
        fallbackImage.className = "panorama-fallback-image";
        fallbackImage.alt = "Panoramic view of the field site";
        fallbackImage.draggable = false;

        fallbackImage.addEventListener("load", () => {
            this.container.classList.remove("is-loading", "is-error");
            this.container.classList.add("is-ready", "is-fallback");
            this.container.appendChild(fallbackImage);
        });

        fallbackImage.addEventListener("error", () => {
            this.showError("Panorama image could not be loaded.");
        });

        fallbackImage.src = this.imagePath;
    }

    showError(message) {
        this.initialized = false;
        this.stopAutoRotateLoop();
        this.container.classList.remove("is-loading", "is-ready");
        this.container.classList.add("is-error");

        if (this.loadingLabel) {
            this.loadingLabel.textContent = message;
        }
    }

    reset() {
        if (!this.initialized) {
            return;
        }

        this.pauseAutoRotateTemporarily();
        this.yaw = this.defaultYaw;
        this.pitch = this.defaultPitch;
        this.verticalFov = this.clampFov(this.defaultVerticalFov);
        this.requestRender();
    }

    toggleAutoRotate() {
        this.autoRotateEnabled = !this.autoRotateEnabled;

        if (this.autoRotateEnabled) {
            this.autoRotateResumeAt = performance.now() + 150;
            this.startAutoRotateLoop();
        } else {
            this.stopAutoRotateLoop();
        }

        this.updateAutoRotateButton();
        this.requestRender();
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
    const viewer = new PanoramaViewer("panorama", "360_Images/panorama-360.jpeg");

    const autoRotateBtn = document.getElementById("autoRotateBtn");
    if (autoRotateBtn) {
        viewer.setAutoRotateButton(autoRotateBtn);
        autoRotateBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.toggleAutoRotate();
        });
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.reset();
        });
    }

    const zoomInBtn = document.getElementById("zoomInBtn");
    if (zoomInBtn) {
        zoomInBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.zoomIn();
        });
    }

    const zoomOutBtn = document.getElementById("zoomOutBtn");
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener("click", (event) => {
            event.preventDefault();
            viewer.zoomOut();
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
