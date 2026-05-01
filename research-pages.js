(function () {
    const scenes = Array.isArray(window.RESEARCH_SCENES) ? window.RESEARCH_SCENES : [];
    const PanoramaViewer = window.PanoramaViewer;

    if (!scenes.length || typeof PanoramaViewer !== "function") {
        return;
    }

    const pondOrder = ["Pond 1", "Pond 2", "Pond 3", "Pond 4"];

    const pondGroups = pondOrder
        .map((pond) => ({
            pond,
            scenes: scenes.filter((scene) => scene.pond === pond)
        }))
        .filter((group) => group.scenes.length > 0);

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function getSceneDisplayName(scene) {
        return (scene?.name || "").replaceAll("_", " ").trim();
    }

    function buildControlsMarkup(scope, mode = "default") {
        if (mode === "icon") {
            return `
                <div class="research-controls research-controls-icon" data-controls="${scope}">
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

        return `
            <div class="research-controls" data-controls="${scope}">
                <button type="button" class="btn btn-small btn-outline" data-action="rotate">Pause Rotation</button>
                <button type="button" class="btn btn-small btn-outline" data-action="zoom-in">Zoom In</button>
                <button type="button" class="btn btn-small btn-outline" data-action="zoom-out">Zoom Out</button>
                <button type="button" class="btn btn-small btn-outline" data-action="reset">Reset</button>
                <button type="button" class="btn btn-small btn-outline" data-action="fullscreen">Fullscreen</button>
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
            rotateButton.addEventListener("click", () => {
                viewer.toggleAutoRotate();
            });
        }

        if (zoomInButton) {
            zoomInButton.addEventListener("click", () => {
                viewer.zoomIn();
            });
        }

        if (zoomOutButton) {
            zoomOutButton.addEventListener("click", () => {
                viewer.zoomOut();
            });
        }

        if (resetButton) {
            resetButton.addEventListener("click", () => {
                viewer.reset();
            });
        }

        if (fullscreenButton) {
            fullscreenButton.addEventListener("click", () => {
                viewer.toggleFullscreen();
            });
        }
    }

    function groupCountLabel(group) {
        return `${group.scenes.length} field views`;
    }

    function mountResearchV1() {
        const container = document.getElementById("researchAppV1");
        if (!container) {
            return;
        }

        container.innerHTML = `
            <section class="research-variant-shell">
                <div class="research-variant-topbar">
                    <div>
                        <p class="variant-kicker">Version 1</p>
                        <h2 class="variant-title">Curated 360 Explorer</h2>
                        <p class="variant-copy">A polished single-viewer experience with cleaner labels, pond filters, and a quicker way to compare viewpoints without showing file extensions.</p>
                    </div>
                    <div class="variant-stats">
                        <article>
                            <strong>${scenes.length}</strong>
                            <span>360 scenes</span>
                        </article>
                        <article>
                            <strong>${pondGroups.length}</strong>
                            <span>Pond groups</span>
                        </article>
                        <article>
                            <strong>13</strong>
                            <span>Sensor study context</span>
                        </article>
                    </div>
                </div>

                <div class="research-main-viewer">
                    <div class="research-main-stage">
                        <div class="panorama-viewer panorama-viewer-wide research-hero-viewer" id="researchV1Panorama" data-panorama-src="${escapeHtml(scenes[0].src)}">
                            <div class="panorama-loading">
                                <span class="panorama-loading-label">Loading 360&deg; panorama...</span>
                            </div>
                        </div>
                        ${buildControlsMarkup("v1")}
                    </div>

                    <aside class="research-side-panel">
                        <p class="research-side-kicker" id="researchV1Pond">${escapeHtml(scenes[0].pond)}</p>
                        <h3 id="researchV1Title">${escapeHtml(scenes[0].title)}</h3>
                        <p id="researchV1Detail">${escapeHtml(scenes[0].detail)}</p>
                        <dl class="research-meta-list">
                            <div>
                                <dt>Scene Name</dt>
                                <dd id="researchV1Name">${escapeHtml(getSceneDisplayName(scenes[0]))}</dd>
                            </div>
                            <div>
                                <dt>Location</dt>
                                <dd id="researchV1Location">${escapeHtml(scenes[0].location)}</dd>
                            </div>
                            <div>
                                <dt>Direction</dt>
                                <dd id="researchV1Direction">${escapeHtml(scenes[0].direction)}</dd>
                            </div>
                            <div>
                                <dt>Image Size</dt>
                                <dd id="researchV1Size">${escapeHtml(scenes[0].size)}</dd>
                            </div>
                        </dl>
                        <a id="researchV1Link" class="btn btn-primary research-open-link" href="${escapeHtml(scenes[0].src)}" target="_blank" rel="noopener">Open Full Image</a>
                    </aside>
                </div>

                <div class="research-toolbar">
                    <div class="research-filter-group" id="researchV1Filters"></div>
                    <p class="research-filter-caption" id="researchV1Count"></p>
                </div>

                <div class="research-scene-gallery" id="researchV1Gallery"></div>
            </section>
        `;

        const viewer = new PanoramaViewer("researchV1Panorama", scenes[0].src);
        attachViewerControls(viewer, container);

        const filtersHost = container.querySelector("#researchV1Filters");
        const galleryHost = container.querySelector("#researchV1Gallery");
        const countHost = container.querySelector("#researchV1Count");

        let activePond = "All";
        let selectedSceneId = scenes[0].id;

        function getFilteredScenes() {
            if (activePond === "All") {
                return scenes;
            }

            return scenes.filter((scene) => scene.pond === activePond);
        }

        function updateScene(scene) {
            selectedSceneId = scene.id;
            viewer.setImage(scene.src);
            container.querySelector("#researchV1Pond").textContent = scene.pond;
            container.querySelector("#researchV1Title").textContent = scene.title;
            container.querySelector("#researchV1Detail").textContent = scene.detail;
            container.querySelector("#researchV1Name").textContent = getSceneDisplayName(scene);
            container.querySelector("#researchV1Location").textContent = scene.location;
            container.querySelector("#researchV1Direction").textContent = scene.direction;
            container.querySelector("#researchV1Size").textContent = scene.size;
            container.querySelector("#researchV1Link").href = scene.src;
        }

        function renderFilters() {
            const options = ["All", ...pondOrder];
            filtersHost.innerHTML = options
                .map((pond) => {
                    const activeClass = pond === activePond ? " is-active" : "";
                    return `<button class="research-filter-chip${activeClass}" type="button" data-filter="${escapeHtml(pond)}">${escapeHtml(pond)}</button>`;
                })
                .join("");

            filtersHost.querySelectorAll("[data-filter]").forEach((button) => {
                button.addEventListener("click", () => {
                    activePond = button.dataset.filter || "All";
                    const filteredScenes = getFilteredScenes();
                    if (!filteredScenes.some((scene) => scene.id === selectedSceneId)) {
                        updateScene(filteredScenes[0]);
                    }
                    renderFilters();
                    renderGallery();
                });
            });
        }

        function renderGallery() {
            const filteredScenes = getFilteredScenes();
            countHost.textContent = `${filteredScenes.length} scene${filteredScenes.length === 1 ? "" : "s"} shown`;
            galleryHost.innerHTML = filteredScenes
                .map((scene) => {
                    const activeClass = scene.id === selectedSceneId ? " is-active" : "";
                    return `
                        <button class="research-scene-tile${activeClass}" type="button" data-scene-id="${escapeHtml(scene.id)}">
                            <img src="${escapeHtml(scene.src)}" alt="${escapeHtml(scene.pond)} ${escapeHtml(scene.title)} preview" loading="lazy">
                            <span class="research-scene-pond">${escapeHtml(scene.pond)}</span>
                            <strong>${escapeHtml(scene.title)}</strong>
                            <span class="research-scene-name">${escapeHtml(getSceneDisplayName(scene))}</span>
                        </button>
                    `;
                })
                .join("");

            galleryHost.querySelectorAll("[data-scene-id]").forEach((button) => {
                button.addEventListener("click", () => {
                    const nextScene = scenes.find((scene) => scene.id === button.dataset.sceneId);
                    if (!nextScene) {
                        return;
                    }

                    updateScene(nextScene);
                    renderGallery();
                });
            });
        }

        renderFilters();
        renderGallery();
        updateScene(scenes[0]);
    }

    function mountResearchV2() {
        const container = document.getElementById("researchAppV2");
        if (!container) {
            return;
        }

        container.innerHTML = `
            <section class="research-variant-shell">
                <div class="research-variant-topbar">
                    <div>
                        <p class="variant-kicker">Version 2</p>
                        <h2 class="variant-title">Grouped Pond Dashboard</h2>
                        <p class="variant-copy">Each pond starts its own section with an individual 360 viewer, while the remaining scenes for that pond stay in a side selector for quick comparison.</p>
                    </div>
                    <div class="variant-summary-pill">Grouped by Pond 1, Pond 2, Pond 3, and Pond 4</div>
                </div>
                <div class="research-group-stack" id="researchV2Groups"></div>
            </section>
        `;

        const groupsHost = container.querySelector("#researchV2Groups");

        groupsHost.innerHTML = pondGroups
            .map((group, index) => `
                <section class="pond-dashboard-card" data-pond-root data-pond-index="${index}">
                    <div class="pond-dashboard-header">
                        <div>
                            <p class="pond-dashboard-kicker">${escapeHtml(group.pond)}</p>
                            <h3>${escapeHtml(group.scenes[0].title)} and related viewpoints</h3>
                        </div>
                        <span class="pond-dashboard-count">${escapeHtml(groupCountLabel(group))}</span>
                    </div>
                    <div class="pond-dashboard-layout">
                        <div class="pond-dashboard-main">
                            <div class="panorama-viewer panorama-viewer-wide research-group-viewer" id="researchV2Panorama${index}" data-panorama-src="${escapeHtml(group.scenes[0].src)}">
                                <div class="panorama-loading">
                                    <span class="panorama-loading-label">Loading 360&deg; panorama...</span>
                                </div>
                            </div>
                            ${buildControlsMarkup(`v2-${index}`)}
                            <div class="pond-scene-selector pond-scene-selector-below">
                                ${group.scenes
                                    .map((scene, sceneIndex) => `
                                        <button class="pond-side-scene${sceneIndex === 0 ? " is-active" : ""}" type="button" data-scene-id="${escapeHtml(scene.id)}">
                                            <img src="${escapeHtml(scene.src)}" alt="${escapeHtml(scene.name)} preview" loading="lazy">
                                            <span>${escapeHtml(scene.title)}</span>
                                            <small>${escapeHtml(getSceneDisplayName(scene))}</small>
                                        </button>
                                    `)
                                    .join("")}
                            </div>
                        </div>
                        <aside class="pond-dashboard-side">
                            <div class="pond-dashboard-detail">
                                <p class="scene-mini-label">${escapeHtml(group.pond)}</p>
                                <h4 data-role="title">${escapeHtml(group.scenes[0].title)}</h4>
                                <p data-role="detail">${escapeHtml(group.scenes[0].detail)}</p>
                                <dl class="research-meta-list compact">
                                    <div>
                                        <dt>Scene Name</dt>
                                        <dd data-role="name">${escapeHtml(getSceneDisplayName(group.scenes[0]))}</dd>
                                    </div>
                                    <div>
                                        <dt>Direction</dt>
                                        <dd data-role="direction">${escapeHtml(group.scenes[0].direction)}</dd>
                                    </div>
                                    <div>
                                        <dt>Image Size</dt>
                                        <dd data-role="size">${escapeHtml(group.scenes[0].size)}</dd>
                                    </div>
                                </dl>
                                <a class="btn btn-primary research-open-link" data-role="link" href="${escapeHtml(group.scenes[0].src)}" target="_blank" rel="noopener">Open Full Image</a>
                            </div>
                        </aside>
                    </div>
                </section>
            `)
            .join("");

        pondGroups.forEach((group, index) => {
            const root = groupsHost.querySelector(`[data-pond-index="${index}"]`);
            if (!root) {
                return;
            }

            const viewer = new PanoramaViewer(`researchV2Panorama${index}`, group.scenes[0].src);
            attachViewerControls(viewer, root);

            const title = root.querySelector('[data-role="title"]');
            const detail = root.querySelector('[data-role="detail"]');
            const name = root.querySelector('[data-role="name"]');
            const direction = root.querySelector('[data-role="direction"]');
            const size = root.querySelector('[data-role="size"]');
            const link = root.querySelector('[data-role="link"]');
            const buttons = Array.from(root.querySelectorAll("[data-scene-id]"));

            const selectScene = (sceneId) => {
                const scene = group.scenes.find((item) => item.id === sceneId) || group.scenes[0];
                viewer.setImage(scene.src);
                title.textContent = scene.title;
                detail.textContent = scene.detail;
                name.textContent = getSceneDisplayName(scene);
                direction.textContent = scene.direction;
                size.textContent = scene.size;
                link.href = scene.src;

                buttons.forEach((button) => {
                    button.classList.toggle("is-active", button.dataset.sceneId === scene.id);
                });
            };

            buttons.forEach((button) => {
                button.addEventListener("click", () => {
                    selectScene(button.dataset.sceneId || "");
                });
            });

            selectScene(group.scenes[0].id);
        });
    }

    function mountResearchV3() {
        const container = document.getElementById("researchAppV3");
        if (!container) {
            return;
        }

        container.innerHTML = `
            <section class="research-variant-shell">
                <div class="research-variant-topbar">
                    <div>
                        <p class="variant-kicker">Version 3</p>
                        <h2 class="variant-title">Individual 360 Viewer Grid</h2>
                        <p class="variant-copy">Every image gets its own 360 viewer, so visitors can open any pond scene directly without changing a shared player.</p>
                    </div>
                    <div class="variant-summary-pill">Each card loads its own 360 experience</div>
                </div>
                <div class="research-multi-grid" id="researchV3Grid">
                    ${scenes
                        .map((scene, index) => `
                            <article class="research-multi-card" data-viewer-card data-viewer-index="${index}">
                                <div class="research-multi-head">
                                    <p>${escapeHtml(scene.pond)}</p>
                                    <h3>${escapeHtml(scene.title)}</h3>
                                    <span>${escapeHtml(getSceneDisplayName(scene))}</span>
                                </div>
                                <div class="panorama-viewer panorama-viewer-wide research-card-viewer" id="researchV3Panorama${index}" data-panorama-src="${escapeHtml(scene.src)}">
                                    <div class="panorama-loading">
                                        <span class="panorama-loading-label">Loading 360&deg; panorama...</span>
                                    </div>
                                </div>
                                ${buildControlsMarkup(`v3-${index}`, "icon")}
                                <p class="research-card-detail">${escapeHtml(scene.detail)}</p>
                                <div class="research-card-meta">
                                    <span>${escapeHtml(scene.direction)}</span>
                                    <span>${escapeHtml(scene.size)}</span>
                                </div>
                                <a class="btn btn-primary research-open-link" href="${escapeHtml(scene.src)}" target="_blank" rel="noopener">Open Full Image</a>
                            </article>
                        `)
                        .join("")}
                </div>
            </section>
        `;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const card = entry.target;
                if (card.dataset.initialized === "true") {
                    observer.unobserve(card);
                    return;
                }

                const index = Number(card.dataset.viewerIndex);
                const scene = scenes[index];
                if (!scene) {
                    observer.unobserve(card);
                    return;
                }

                const viewer = new PanoramaViewer(`researchV3Panorama${index}`, scene.src);
                attachViewerControls(viewer, card);
                card.dataset.initialized = "true";
                observer.unobserve(card);
            });
        }, {
            rootMargin: "260px 0px"
        });

        container.querySelectorAll("[data-viewer-card]").forEach((card, index) => {
            if (index < 3) {
                const scene = scenes[index];
                const viewer = new PanoramaViewer(`researchV3Panorama${index}`, scene.src);
                attachViewerControls(viewer, card);
                card.dataset.initialized = "true";
                return;
            }

            observer.observe(card);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        mountResearchV1();
        mountResearchV2();
        mountResearchV3();
    });
})();
