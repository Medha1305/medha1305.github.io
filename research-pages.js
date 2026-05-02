(function () {
    const scenes = Array.isArray(window.RESEARCH_SCENES) ? window.RESEARCH_SCENES : [];
    const PanoramaViewer = window.PanoramaViewer;

    if (!scenes.length || typeof PanoramaViewer !== "function") {
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function getSceneDisplayName(scene) {
        return (scene?.name || "").replaceAll("_", " ").trim();
    }

    function getSafeSceneUrl(value) {
        const url = String(value || "");
        if (/^\.\.\/360_Images\/[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp)$/i.test(url)) {
            return url;
        }

        return "../360_Images/Pond1.jpg";
    }

    function buildControlsMarkup(index) {
        return `
            <div class="research-controls research-controls-icon" data-controls="scene-${index}">
                <button type="button" class="btn btn-small btn-outline" data-action="rotate" data-icon-only="true" aria-label="Pause rotation" title="Pause rotation">
                    <svg class="research-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="7" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none"></rect>
                        <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none"></rect>
                    </svg>
                </button>
                <button type="button" class="btn btn-small btn-outline" data-action="zoom-in" aria-label="Zoom in" title="Zoom in">
                    <svg class="research-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="10" cy="10" r="5.5"></circle>
                        <path d="M10 7.3v5.4M7.3 10h5.4"></path>
                        <path d="M14.6 14.6 19 19"></path>
                    </svg>
                </button>
                <button type="button" class="btn btn-small btn-outline" data-action="zoom-out" aria-label="Zoom out" title="Zoom out">
                    <svg class="research-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="10" cy="10" r="5.5"></circle>
                        <path d="M7.3 10h5.4"></path>
                        <path d="M14.6 14.6 19 19"></path>
                    </svg>
                </button>
                <button type="button" class="btn btn-small btn-outline" data-action="reset" aria-label="Reset view" title="Reset view">
                    <svg class="research-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 8V4m0 0h4M6 4l3.2 3.2"></path>
                        <path d="M7 14.2A6 6 0 1 0 11.8 6"></path>
                    </svg>
                </button>
                <button type="button" class="btn btn-small btn-outline" data-action="fullscreen" aria-label="Fullscreen" title="Fullscreen">
                    <svg class="research-control-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    function attachViewerControls(viewer, root) {
        const rotateButton = root.querySelector('[data-action="rotate"]');
        const zoomInButton = root.querySelector('[data-action="zoom-in"]');
        const zoomOutButton = root.querySelector('[data-action="zoom-out"]');
        const resetButton = root.querySelector('[data-action="reset"]');
        const fullscreenButton = root.querySelector('[data-action="fullscreen"]');

        if (rotateButton) {
            viewer.setAutoRotateButton(rotateButton);
            rotateButton.addEventListener("click", () => viewer.toggleAutoRotate());
        }

        if (zoomInButton) {
            zoomInButton.addEventListener("click", () => viewer.zoomIn());
        }

        if (zoomOutButton) {
            zoomOutButton.addEventListener("click", () => viewer.zoomOut());
        }

        if (resetButton) {
            resetButton.addEventListener("click", () => viewer.reset());
        }

        if (fullscreenButton) {
            fullscreenButton.addEventListener("click", () => viewer.toggleFullscreen());
        }
    }

    function createSceneCard(scene, index) {
        const sceneUrl = getSafeSceneUrl(scene.src);

        return `
            <article class="research-multi-card" data-viewer-card data-viewer-index="${index}">
                <div class="research-multi-head">
                    <p>${escapeHtml(scene.pond)}</p>
                    <h3>${escapeHtml(scene.title)}</h3>
                    <span>${escapeHtml(getSceneDisplayName(scene))}</span>
                </div>
                <div class="panorama-viewer panorama-viewer-wide research-card-viewer" id="researchPanorama${index}" data-panorama-src="${escapeHtml(sceneUrl)}">
                    <div class="panorama-loading">
                        <span class="panorama-loading-label">Loading 360&deg; panorama...</span>
                    </div>
                </div>
                ${buildControlsMarkup(index)}
                <p class="research-card-detail">${escapeHtml(scene.detail)}</p>
                <div class="research-card-meta">
                    <span>${escapeHtml(scene.direction)}</span>
                    <span>${escapeHtml(scene.size)}</span>
                </div>
                <a class="btn btn-primary research-open-link" href="${escapeHtml(sceneUrl)}" target="_blank" rel="noopener noreferrer">Open Full Image</a>
            </article>
        `;
    }

    function mountResearchPage() {
        const container = document.getElementById("researchApp");
        if (!container) {
            return;
        }

        container.innerHTML = `
            <section class="research-variant-shell" aria-labelledby="research-viewer-title">
                <div class="research-variant-topbar">
                    <div>
                        <p class="variant-kicker">Research Site Collection</p>
                        <h2 class="variant-title" id="research-viewer-title">360&deg; Views of the Pond Monitoring Locations</h2>
                        <p class="variant-copy">Browse the field views captured across the research site. Each scene shows a monitored pond position, helping explain the physical setting behind the flood management study.</p>
                    </div>
                    <div class="variant-summary-pill">${scenes.length} research site views</div>
                </div>
                <div class="research-multi-grid">
                    ${scenes.map(createSceneCard).join("")}
                </div>
            </section>
        `;

        const cards = Array.from(container.querySelectorAll("[data-viewer-card]"));
        const initializeCard = (card) => {
            if (card.dataset.initialized === "true") {
                return;
            }

            const index = Number(card.dataset.viewerIndex);
            const scene = scenes[index];
            if (!scene) {
                return;
            }

            const viewer = new PanoramaViewer(`researchPanorama${index}`, getSafeSceneUrl(scene.src));
            attachViewerControls(viewer, card);
            card.dataset.initialized = "true";
        };

        if (!("IntersectionObserver" in window)) {
            cards.forEach(initializeCard);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                initializeCard(entry.target);
                observer.unobserve(entry.target);
            });
        }, {
            rootMargin: "260px 0px"
        });

        cards.forEach((card, index) => {
            if (index < 3) {
                initializeCard(card);
                return;
            }

            observer.observe(card);
        });
    }

    document.addEventListener("DOMContentLoaded", mountResearchPage);
})();
