/* ================================================= */
/* OUTSIDE V2.1 */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeTheme();

    initializeProgressBar();

    initializeSideNavigation();

    initializeSlideTransitions();

    initializeKpiCounter();

    initializePresentationActions();

    if (!document.documentElement.hasAttribute("data-standalone")) {
        loadContent();
    }

});

/* ================================================= */
/* SLIDE TRANSITIONS */
/* ================================================= */

function initializeSlideTransitions() {

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
        prefersReducedMotion ||
        !("IntersectionObserver" in window)
    ) return;

    document.body.classList.add("motion-enabled");

    const observer =
        new IntersectionObserver(

            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");

                    observer.unobserve(entry.target);

                });

            },

            {
                threshold: 0.12
            }

        );

    document.querySelectorAll(".slide").forEach(section => {

        observer.observe(section);

    });

}

/* ================================================= */
/* THEME */
/* ================================================= */

function initializeTheme() {

    const button =
        document.getElementById("themeToggle");

    const outsideLogo =
        document.getElementById("outsideLogo");

    const savedTheme =
        localStorage.getItem("outside-theme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark");

        outsideLogo.src =
            outsideLogo.dataset.darkSrc || "assets/outside-logo-white.png";
    }

    button.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        const dark =
            document.body.classList.contains("dark");

        outsideLogo.src = dark
            ? outsideLogo.dataset.darkSrc || "assets/outside-logo-white.png"
            : outsideLogo.dataset.lightSrc || "assets/outside-logo-black.png";

        localStorage.setItem(
            "outside-theme",
            dark ? "dark" : "light"
        );

    });

}

/* ================================================= */
/* PROGRESS BAR */
/* ================================================= */

function initializeProgressBar() {

    const progressBar =
        document.getElementById("progressBar");

    window.addEventListener("scroll", () => {

        const scrollTop =
            window.pageYOffset;

        const documentHeight =
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight;

        const progress =
            scrollTop / documentHeight;

        progressBar.style.height =
            `${progress * 100}%`;

    });

}

/* ================================================= */
/* SIDE NAVIGATION */
/* ================================================= */

function initializeSideNavigation() {

    const sections =
        Array.from(document.querySelectorAll(".slide"));

    const links =
        document.querySelectorAll(".side-nav a");

    const goTop = document.getElementById("goTop");
    const goBottom = document.getElementById("goBottom");

    let activeIndex = 0;

    const updateNavigation = () => {

        const midpoint = window.innerHeight / 2;

        const index = sections.findIndex(section => {

            const rect = section.getBoundingClientRect();

            return rect.top <= midpoint && rect.bottom > midpoint;

        });

        if (index !== -1) activeIndex = index;

        links.forEach((link, linkIndex) => {

            const active = linkIndex === activeIndex;

            link.classList.toggle("active", active);

            if (active) {
                link.setAttribute("aria-current", "step");
            } else {
                link.removeAttribute("aria-current");
            }

        });

        goTop.disabled = activeIndex === 0;
        goBottom.disabled = activeIndex === sections.length - 1;

    };

    const goToSlide = index => {

        sections[index].scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            block: "start"
        });

    };

    goTop.addEventListener("click", () => goToSlide(0));
    goBottom.addEventListener("click", () => goToSlide(sections.length - 1));

    window.addEventListener("scroll", updateNavigation, { passive: true });
    window.addEventListener("resize", updateNavigation);
    updateNavigation();

}

/* ================================================= */
/* KPI ANIMATION */
/* ================================================= */

function initializeKpiCounter() {

    const metric =
        document.getElementById("mainKpi");

    if (!metric) return;

    let started = false;

    const observer =
        new IntersectionObserver(

            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) return;

                    if (started) return;

                    started = true;

                    animateCounter(
                        metric,
                        90,
                        "%"
                    );

                });

            },

            {
                threshold: 0.5
            }

        );

    observer.observe(metric);

}

/* ================================================= */
/* COUNTER */
/* ================================================= */

function animateCounter(
    element,
    target,
    suffix = ""
) {

    let current = 0;

    const duration = 1000;

    const steps = 50;

    const increment =
        target / steps;

    const interval =
        duration / steps;

    const timer =
        setInterval(() => {

            current += increment;

            if (current >= target) {

                current = target;

                clearInterval(timer);
            }

            element.textContent =
                Math.floor(current) +
                suffix;

        }, interval);

}

/* ================================================= */
/* ACTION BUTTONS */
/* ================================================= */

function initializePresentationActions() {

    const exportPdf =
        document.getElementById("exportPdf");

    const download =
        document.getElementById("downloadPresentation");

    const share =
        document.getElementById("sharePresentation");

    /* PDF */

    if (exportPdf) {

        exportPdf.addEventListener(
            "click",
            () => {

                window.print();

            });
    }

    /* SAVE */

    if (download) {

        download.addEventListener(
            "click",
            async () => {

                download.disabled = true;

                try {

                    const stylesheet = document.getElementById("presentationStyles");
                    const script = document.getElementById("presentationScript");
                    const readResource = async url => {
                        const response = await fetch(url);
                        if (!response.ok) {
                            throw new Error(`Could not load ${url}: ${response.status}`);
                        }
                        return response;
                    };
                    const imageData = async url => {
                        const response = await readResource(url);
                        const blob = await response.blob();
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = () => reject(reader.error);
                            reader.readAsDataURL(blob);
                        });
                    };
                    const logo = document.getElementById("outsideLogo");
                    const [css, js, lightLogo, darkLogo] = await Promise.all([
                        stylesheet.href
                            ? readResource(stylesheet.href).then(response => response.text())
                            : stylesheet.textContent,
                        script.src
                            ? readResource(script.src).then(response => response.text())
                            : script.textContent,
                        logo.dataset.lightSrc || imageData("assets/outside-logo-black.png"),
                        logo.dataset.darkSrc || imageData("assets/outside-logo-white.png")
                    ]);

                    const copy = document.documentElement.cloneNode(true);
                    copy.setAttribute("data-standalone", "");
                    copy.querySelector("body").classList.remove("motion-enabled");
                    copy.querySelectorAll(".slide").forEach(slide => slide.classList.remove("is-visible"));
                    copy.querySelector("#downloadPresentation").disabled = false;

                    const copyLogo = copy.querySelector("#outsideLogo");
                    copyLogo.dataset.lightSrc = lightLogo;
                    copyLogo.dataset.darkSrc = darkLogo;
                    copyLogo.src = document.body.classList.contains("dark") ? darkLogo : lightLogo;

                    const clientLogo = document.getElementById("clientLogo");
                    if (clientLogo && !clientLogo.hidden) {
                        copy.querySelector("#clientLogo").src = await imageData(clientLogo.src);
                    } else {
                        copy.querySelector("#clientLogo").removeAttribute("src");
                    }

                    const style = document.createElement("style");
                    style.id = "presentationStyles";
                    style.textContent = css;
                    copy.querySelector("#presentationStyles").replaceWith(style);
                    const inlineScript = copy.querySelector("#presentationScript");
                    inlineScript.removeAttribute("src");
                    inlineScript.textContent = js.replace(/<\/script/gi, "<\\/script");

                    const blob = new Blob(
                        ["<!DOCTYPE html>\n", copy.outerHTML],
                        { type: "text/html;charset=utf-8" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "outside-presentation.html";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);

                } catch (error) {

                    console.error("Could not save presentation", error);
                    alert("No se pudo guardar la presentación. Inténtalo nuevamente.");

                } finally {

                    download.disabled = false;

                }

            });
    }

    /* SHARE */

    if (share) {

        share.addEventListener(
            "click",
            () => {

                const subject =
                    document.title;

                const body =
                    window.location.href;

                window.location.href =
                    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            });
    }

}

/* ================================================= */
/* CONTENT.JSON */
/* ================================================= */

async function loadContent() {

    try {

        const response =
            await fetch(
                "data/content.json"
            );

        if (!response.ok) return;

        const data =
            await response.json();

        applyContent(data);

    }

    catch(error) {

        console.warn(
            "content.json not loaded",
            error
        );

    }

}

/* ================================================= */
/* APPLY CONTENT */
/* ================================================= */

function applyContent(data) {

    if (!data) return;

    /* TITLE */

    const title =
        document.getElementById(
            "presentationTitle"
        );

    if (
        title &&
        data.presentation?.title
    ) {

        title.textContent =
            data.presentation.title;

    }

    /* SUBTITLE */

    const subtitle =
        document.getElementById(
            "presentationSubtitle"
        );

    if (
        subtitle &&
        data.presentation?.subtitle
    ) {

        subtitle.textContent =
            data.presentation.subtitle;

    }

    /* CLIENT LOGO */

    const clientLogo =
        document.getElementById(
            "clientLogo"
        );

    const brandDivider =
        document.querySelector(
            ".brand-divider"
        );

    if (
        clientLogo &&
        data.client?.logo
    ) {

        clientLogo.onload = () => {

            clientLogo.hidden = false;

            if (brandDivider) {
                brandDivider.hidden = false;
            }

        };

        clientLogo.onerror = () => {

            clientLogo.hidden = true;

            if (brandDivider) {
                brandDivider.hidden = true;
            }

        };

        clientLogo.src =
            data.client.logo;

    }

    /* DOCUMENT TITLE */

    if (
        data.presentation?.title
    ) {

        document.title =
            data.presentation.title;

    }

}
