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

class PanoramaViewer {
    constructor(containerId, imagePath) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            return;
        }

        this.imagePath = imagePath;
        this.isDragging = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.maxScroll = 0;
        this.initialized = false;
        this.img = null;
        this.loadingLabel = null;

        this.handlePointerMove = this.onPointerMove.bind(this);
        this.handlePointerUp = this.onPointerUp.bind(this);
        this.handleResize = this.refreshMetrics.bind(this);

        this.init();
    }

    init() {
        this.container.classList.add("is-loading");

        this.loadingLabel = this.container.querySelector(".panorama-loading-label");

        const img = document.createElement("img");
        img.alt = "Interactive panoramic view of the field site";
        img.draggable = false;
        img.style.position = "absolute";
        img.style.top = "0";
        img.style.left = "0";
        img.style.height = "100%";
        img.style.width = "auto";
        img.style.minWidth = "100%";
        img.style.userSelect = "none";
        img.style.webkitUserSelect = "none";
        img.style.transform = "translateX(0)";

        this.img = img;
        this.container.appendChild(img);

        img.addEventListener("load", () => {
            this.initialized = true;
            this.container.classList.remove("is-loading", "is-error");
            this.container.classList.add("is-ready");
            this.refreshMetrics();
        });

        img.addEventListener("error", () => {
            this.container.classList.remove("is-loading", "is-ready");
            this.container.classList.add("is-error");

            if (this.loadingLabel) {
                this.loadingLabel.textContent = "Panorama image could not be loaded.";
            }
        });

        this.container.addEventListener("mousedown", (event) => this.onPointerDown(event));
        this.container.addEventListener("touchstart", (event) => this.onTouchStart(event), { passive: true });

        document.addEventListener("mousemove", this.handlePointerMove);
        document.addEventListener("mouseup", this.handlePointerUp);
        document.addEventListener("touchmove", (event) => this.onTouchMove(event), { passive: false });
        document.addEventListener("touchend", this.handlePointerUp);

        window.addEventListener("resize", this.handleResize);
        document.addEventListener("fullscreenchange", this.handleResize);

        img.src = this.imagePath;
    }

    refreshMetrics() {
        if (!this.initialized || !this.img) {
            return;
        }

        const containerHeight = this.container.clientHeight;
        const containerWidth = this.container.clientWidth;

        if (!containerHeight || !containerWidth || !this.img.naturalHeight) {
            return;
        }

        const scale = containerHeight / this.img.naturalHeight;
        const displayWidth = this.img.naturalWidth * scale;

        this.maxScroll = Math.max(0, displayWidth - containerWidth);
        this.scrollLeft = Math.max(0, Math.min(this.maxScroll, this.scrollLeft));
        this.updateImagePosition();
    }

    onPointerDown(event) {
        if (!this.initialized) {
            return;
        }

        this.isDragging = true;
        this.startX = event.pageX;
        this.container.style.cursor = "grabbing";
    }

    onPointerMove(event) {
        if (!this.isDragging || !this.initialized) {
            return;
        }

        const deltaX = event.pageX - this.startX;
        this.scrollLeft -= deltaX;
        this.scrollLeft = Math.max(0, Math.min(this.maxScroll, this.scrollLeft));
        this.startX = event.pageX;
        this.updateImagePosition();
    }

    onPointerUp() {
        if (!this.initialized) {
            return;
        }

        this.isDragging = false;
        this.container.style.cursor = "grab";
    }

    onTouchStart(event) {
        if (!this.initialized) {
            return;
        }

        this.isDragging = true;
        this.startX = event.touches[0].pageX;
    }

    onTouchMove(event) {
        if (!this.isDragging || !this.initialized) {
            return;
        }

        event.preventDefault();

        const deltaX = event.touches[0].pageX - this.startX;
        this.scrollLeft -= deltaX;
        this.scrollLeft = Math.max(0, Math.min(this.maxScroll, this.scrollLeft));
        this.startX = event.touches[0].pageX;
        this.updateImagePosition();
    }

    updateImagePosition() {
        if (!this.img) {
            return;
        }

        this.img.style.transform = `translateX(${-this.scrollLeft}px)`;
    }

    reset() {
        if (!this.initialized) {
            return;
        }

        this.scrollLeft = 0;
        this.updateImagePosition();
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
