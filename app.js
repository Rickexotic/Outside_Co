/* ================================================= */
/* OUTSIDE V2.1 */
/* ================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeTheme();

    initializeProgressBar();

    initializeSideNavigation();

    initializeKpiCounter();

    initializePresentationActions();

    loadContent();

});

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
            "assets/outside-logo-white.png";
    }

    button.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        const dark =
            document.body.classList.contains("dark");

        outsideLogo.src = dark
            ? "assets/outside-logo-white.png"
            : "assets/outside-logo-black.png";

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
        document.querySelectorAll(".slide");

    const links =
        document.querySelectorAll(".side-nav a");

    const observer =
        new IntersectionObserver(

            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) return;

                    const id =
                        entry.target.id;

                    links.forEach(link => {

                        link.classList.remove("active");

                        if (
                            link.getAttribute("href") ===
                            "#" + id
                        ) {

                            link.classList.add("active");
                        }

                    });

                });

            },

            {
                threshold: 0.5
            }

        );

    sections.forEach(section => {

        observer.observe(section);

    });

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

    const goTop =
        document.getElementById("goTop");

    const goBottom =
        document.getElementById("goBottom");

    const exportPdf =
        document.getElementById("exportPdf");

    const download =
        document.getElementById("downloadPresentation");

    const share =
        document.getElementById("sharePresentation");

    /* TOP */

    if (goTop) {

        goTop.addEventListener(
            "click",
            () => {

                window.scrollTo({

                    top: 0,

                    behavior: "smooth"
                });

            });
    }

    /* BOTTOM */

    if (goBottom) {

        goBottom.addEventListener(
            "click",
            () => {

                window.scrollTo({

                    top:
                        document.body.scrollHeight,

                    behavior: "smooth"
                });

            });
    }

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
            () => {

                const html =
                    document.documentElement.outerHTML;

                const blob =
                    new Blob(

                        [html],

                        {
                            type:
                                "text/html"
                        }

                    );

                const url =
                    URL.createObjectURL(blob);

                const a =
                    document.createElement("a");

                a.href = url;

                a.download =
                    "outside-presentation.html";

                a.click();

                URL.revokeObjectURL(url);

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

    if (
        clientLogo &&
        data.client?.logo
    ) {

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
