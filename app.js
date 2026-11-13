/* ================================================= */
/* PRESENTATION TEMPLATE                              */
/* Todo el contenido vive en data/content.json        */
/* ================================================= */

let LOCALE = "es";

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const data = await loadPresentationData();

        window.presentationData = data;

        await preloadIcons(data);

        renderPresentation(data);

    } catch (error) {

        console.error("content.json not loaded", error);

        showLoadError();

        return;

    }

    initializeTheme();

    initializeIntro();

    initializeProgressBar();

    initializeSideNavigation();

    initializeSlideTransitions();

    initializeChartReveal();

    initializeKpiCounter();

    initializePresentationActions();

});

/* ================================================= */
/* DATA LOADING                                       */
/* ================================================= */

async function loadPresentationData() {

    const embedded = document.getElementById("presentationData");

    if (embedded) {
        return JSON.parse(embedded.textContent);
    }

    const requested = new URLSearchParams(location.search).get("content");

    const path = requested && /^(?!\/|.*\.\.)[\w./-]+\.json$/.test(requested)
        ? requested
        : "data/content.json";

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Could not load ${path}: ${response.status}`);
    }

    return response.json();

}

function showLoadError() {

    const box = el("div", "load-error");

    box.append(
        el("strong", null, "No se pudo cargar data/content.json."),
        el("span", null, " Abre la presentación desde un servidor local (por ejemplo: python -m http.server) y revisa que el JSON sea válido.")
    );

    document.getElementById("main").append(box);

}

/* ================================================= */
/* DOM HELPERS                                        */
/* ================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

/* Iconos opcionales: "icon": "nombre" -> iconos/nombre.svg, o una ruta .svg */

const ICON_CACHE = new Map();

function iconPath(ref) {

    const value = String(ref || "").trim();

    if (!value) return "";

    const path = /\.svg$/i.test(value) || value.includes("/") ? value : `iconos/${value}.svg`;

    return /^[\w./-]+\.svg$/i.test(path) && !path.includes("..") && !path.startsWith("/") ? path : "";

}

function sanitizeSvg(text) {

    const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;

    if (!svg || svg.nodeName.toLowerCase() !== "svg") return "";

    svg.querySelectorAll("script, foreignObject, style").forEach(node => node.remove());

    [svg, ...svg.querySelectorAll("*")].forEach(node => {
        [...node.attributes].forEach(attr => {
            if (/^on/i.test(attr.name) || /javascript:/i.test(attr.value)) node.removeAttribute(attr.name);
        });
    });

    ["width", "height", "class"].forEach(name => svg.removeAttribute(name));

    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    return new XMLSerializer().serializeToString(svg);

}

function collectIconRefs(node, refs = new Set()) {

    if (Array.isArray(node)) {
        node.forEach(child => collectIconRefs(child, refs));
    } else if (node && typeof node === "object") {
        Object.entries(node).forEach(([key, value]) => {
            if (key === "icon" && typeof value === "string") refs.add(iconPath(value));
            else if (key !== "_icons") collectIconRefs(value, refs);
        });
    }

    return refs;

}

async function preloadIcons(data) {

    Object.entries(data._icons || {}).forEach(([path, markup]) => ICON_CACHE.set(path, markup));

    const pending = [...collectIconRefs(data.slides)].filter(path => path && !ICON_CACHE.has(path));

    await Promise.all(pending.map(async path => {

        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(response.status);
            ICON_CACHE.set(path, sanitizeSvg(await response.text()));
        } catch (error) {
            console.warn(`Icon "${path}" not loaded`, error);
            ICON_CACHE.set(path, "");
        }

    }));

}

function iconEl(ref) {

    const markup = ICON_CACHE.get(iconPath(ref));

    if (!markup) return null;

    const node = el("span", "icon");

    node.innerHTML = markup;

    return node;

}

function withIcon(node, ref) {

    const icon = iconEl(ref);

    if (icon) {
        node.classList.add("has-icon");
        node.prepend(icon);
    }

    return node;

}

function itemText(item) {

    return item && typeof item === "object" ? item.text : item;

}

function el(tag, className, text, attributes) {

    const node = document.createElement(tag);

    if (className) node.className = className;

    if (text !== undefined && text !== null) node.textContent = text;

    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    }

    return node;

}

function svgEl(tag, attributes, className) {

    const node = document.createElementNS(SVG_NS, tag);

    if (className) node.setAttribute("class", className);

    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    }

    return node;

}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function cssSafe(value) {
    return typeof value === "string" && !/[;{}<>]|url\(|@import/i.test(value);
}

function formatValue(value, format = {}) {

    const digits = format.decimals;

    const number = new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: digits ?? 0,
        maximumFractionDigits: digits ?? 1,
        notation: format.compact ? "compact" : "standard"
    }).format(value);

    return `${format.prefix || ""}${number}${format.suffix || ""}`;

}

/* ================================================= */
/* RENDER                                             */
/* ================================================= */

function renderPresentation(data) {

    LOCALE = data.language || "es";

    document.documentElement.lang = LOCALE;

    applyTheme(data.theme);

    const brand = data.brand || {};

    const name = brand.name || "Presentación";

    document.title = data.presentation?.title || name;

    document.body.dataset.themeKey = brand.storageKey || "presentation-theme";

    document.body.dataset.downloadName = brand.downloadName || "presentation.html";

    // La portada (buscador + logo) es siempre la de Outside, sin importar el content.json.
    data.brand = { ...brand, logo: { light: "assets/outside-logo-black.png", dark: "assets/outside-logo-white.png" } };
    data.intro = { text: "Outside Co.", action: "Buscar", sound: "assets/typing.m4a" };

    renderIntro(data, "Outside");

    const main = document.getElementById("main");

    main.querySelectorAll("[data-slide]").forEach(node => node.remove());

    document.querySelectorAll(".side-nav [data-nav]").forEach(node => node.remove());

    const slides = Array.isArray(data.slides) ? data.slides : [];

    const ids = ["intro"];

    slides.forEach((slide, index) => {

        const render = SLIDE_RENDERERS[slide.type];

        if (!render) {
            console.warn(`Unknown slide type "${slide.type}"`);
            return;
        }

        const section = render(slide, data);

        const id = String(slide.id || `slide-${index + 2}`).replace(/[^\w-]/g, "");

        section.id = id;

        section.dataset.slide = "";

        section.classList.add("slide");

        if (slide.alternate) section.classList.add("alternate");

        const noteHost = section.querySelector(".container");

        if (slide.note && noteHost) noteHost.append(el("p", "slide-note", slide.note));

        section.setAttribute("aria-label", slide.title || slide.eyebrow || `Slide ${ids.length + 1}`);

        main.append(section);

        ids.push(id);

    });

    const goBottom = document.getElementById("goBottom");

    ids.forEach((id, index) => {

        const label = String(index + 1).padStart(2, "0");

        const link = el("a", null, label, {
            href: `#${id}`,
            "aria-label": `Slide ${index + 1}`,
            "data-nav": ""
        });

        goBottom.before(link);

    });

}

function applyTheme(theme) {

    let style = document.getElementById("themeVars");

    if (!style) {
        style = document.createElement("style");
        style.id = "themeVars";
        document.head.append(style);
    }

    if (!theme) {
        style.textContent = "";
        return;
    }

    const block = (selector, values) => {

        const rules = Object.entries(values || {})
            .filter(([key, value]) => /^[\w-]+$/.test(key) && cssSafe(String(value)))
            .map(([key, value]) => `--${key.replace(/^--/, "")}:${value};`);

        return rules.length ? `${selector}{${rules.join("")}}` : "";

    };

    const light = { ...theme.light };

    if (theme.font) light.font = theme.font;

    style.textContent = block("body", light) + block("body.dark", theme.dark);

}

function renderIntro(data, name) {

    const brand = data.brand || {};

    const intro = data.intro || {};

    const section = document.getElementById("intro");

    const logo = document.getElementById("outsideLogo");

    const typed = document.getElementById("introTyped");

    const sound = document.getElementById("introSound");

    const text = intro.text ?? name;

    section.setAttribute("aria-label", name);

    section.classList.remove("intro-playing", "intro-complete");

    logo.alt = name;

    logo.dataset.lightSrc = brand.logo?.light || "";

    logo.dataset.darkSrc = brand.logo?.dark || brand.logo?.light || "";

    syncThemeLogo();

    typed.dataset.text = text;

    typed.textContent = text;

    document.getElementById("introAction").textContent = intro.action || "Buscar";

    if (intro.sound) {
        sound.src = intro.sound;
    } else {
        sound.removeAttribute("src");
    }

}

function syncThemeLogo() {

    const logo = document.getElementById("outsideLogo");

    const dark = document.body.classList.contains("dark");

    const source = dark ? logo.dataset.darkSrc : logo.dataset.lightSrc;

    if (source) logo.src = source;

}

/* ---------- Slide builders ---------- */

function slideShell(slide, className, centered) {

    const section = el("section", className || "");

    const container = el("div", centered ? "container center" : "container");

    section.append(container);

    if (slide.eyebrow) container.append(el("div", "eyebrow", slide.eyebrow));

    if (slide.title) container.append(el("h2", null, slide.title));

    return { section, container };

}

function gridColumns(grid, count, fallback) {

    grid.style.setProperty("--cols", Math.max(1, Math.min(count, fallback)));

}

const ACTION_ICONS = {
    pdf: {
        id: "exportPdf",
        label: "Exportar a PDF",
        path: '<path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.6 11.85H0v3.999h.791v-1.342h.803q.43 0 .732-.173.305-.175.463-.474a1.4 1.4 0 0 0 .161-.677q0-.375-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.38.57.57 0 0 1-.238.241.8.8 0 0 1-.375.082H.788V12.48h.66q.327 0 .512.181.185.183.185.522m1.217-1.333v3.999h1.46q.602 0 .998-.237a1.45 1.45 0 0 0 .595-.689q.196-.45.196-1.084 0-.63-.196-1.075a1.43 1.43 0 0 0-.589-.68q-.396-.234-1.005-.234zm.791.645h.563q.371 0 .609.152a.9.9 0 0 1 .354.454q.118.302.118.753a2.3 2.3 0 0 1-.068.592 1.1 1.1 0 0 1-.196.422.8.8 0 0 1-.334.252 1.3 1.3 0 0 1-.483.082h-.563zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638z"/>'
    },
    download: {
        id: "downloadPresentation",
        label: "Guardar presentación",
        path: '<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>'
    },
    share: {
        id: "sharePresentation",
        label: "Compartir por correo",
        path: '<path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>'
    }
};

const SHARE_TARGETS = [
    {
        id: "shareEmail",
        label: "Compartir por correo",
        path: '<path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z"/><path d="M14.247 14.269c1.01 0 1.587-.857 1.587-2.025v-.21C15.834 10.43 14.64 9 12.52 9h-.035C10.42 9 9 10.36 9 12.432v.214C9 14.82 10.438 16 12.358 16h.044c.594 0 1.018-.074 1.237-.175v-.73c-.245.11-.673.18-1.18.18h-.044c-1.334 0-2.571-.788-2.571-2.655v-.157c0-1.657 1.058-2.724 2.64-2.724h.04c1.535 0 2.484 1.05 2.484 2.326v.118c0 .975-.324 1.39-.639 1.39-.232 0-.41-.148-.41-.42v-2.19h-.906v.569h-.03c-.084-.298-.368-.63-.954-.63-.778 0-1.259.555-1.259 1.4v.528c0 .892.49 1.434 1.26 1.434.471 0 .896-.227 1.014-.643h.043c.118.42.617.648 1.12.648m-2.453-1.588v-.227c0-.546.227-.791.573-.791.297 0 .572.192.572.708v.367c0 .573-.253.744-.564.744-.354 0-.581-.215-.581-.8Z"/>'
    },
    {
        id: "shareWhatsapp",
        label: "Compartir por WhatsApp",
        path: '<path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>'
    }
];

const SLIDE_RENDERERS = {

    client(slide, data) {

        const section = el("section", "client-slide");

        const container = el("div", "container center");

        container.append(el("div", "eyebrow", slide.eyebrow || "Preparado para"));

        if (data.client?.logo) {
            const logo = el("img", "client-slide-logo", null, { src: data.client.logo, alt: data.client.name || "Cliente" });
            logo.onerror = () => { logo.hidden = true; };
            container.append(logo);
        }

        const name = slide.title ?? data.client?.name;

        if (name) container.append(el("h2", null, name));

        if (slide.subtitle) container.append(el("p", "hero-subtitle", slide.subtitle));

        section.append(container);

        return section;

    },

    hero(slide, data) {

        const section = el("section", "hero-slide");

        const container = el("div", "container");

        const brandGroup = el("div", "brand-group");

        const clientLogo = el("img", "brand-logo client-logo", null, {
            id: "clientLogo",
            alt: data.client?.name || "Cliente"
        });

        clientLogo.hidden = true;

        if (data.client?.logo) {
            clientLogo.onload = () => { clientLogo.hidden = false; };
            clientLogo.onerror = () => { clientLogo.hidden = true; };
            clientLogo.src = data.client.logo;
        }

        brandGroup.append(clientLogo);

        container.append(brandGroup);

        if (slide.eyebrow) container.append(el("div", "eyebrow", slide.eyebrow));

        const title = slide.title ?? data.presentation?.title;

        const subtitle = slide.subtitle ?? data.presentation?.subtitle;

        if (title) container.append(el("h1", null, title, { id: "presentationTitle" }));

        if (subtitle) container.append(el("p", "hero-subtitle", subtitle, { id: "presentationSubtitle" }));

        section.append(el("div", "hero-blob"), container);

        return section;

    },

    summary(slide) {

        const { section, container } = slideShell(slide);

        const items = slide.items || [];

        const grid = el("div", "summary-grid");

        gridColumns(grid, items.length, slide.cols || 3);

        items.forEach((item, index) => {

            const card = el("div", "summary-card");

            const cardIcon = iconEl(item.icon);

            if (cardIcon) {
                cardIcon.classList.add("icon-lg");
                card.append(cardIcon);
            }

            card.append(el("span", null, item.number ?? String(index + 1).padStart(2, "0")));

            if (item.tag) card.append(el("small", "card-tag", item.tag));

            card.append(
                el("h3", null, item.title),
                el("p", null, item.text)
            );

            grid.append(card);

        });

        container.append(grid);

        return section;

    },

    metric(slide) {

        const section = el("section", "metric-slide");

        const container = el("div", "container center");

        const value = el("div", "metric-value");

        setCountTarget(value, slide);

        container.append(value);

        if (slide.label) container.append(el("div", "metric-label", slide.label));

        section.append(container);

        return section;

    },

    columns(slide) {

        const { section, container } = slideShell(slide);

        const columns = slide.columns || [];

        const grid = el("div", "landscape-grid");

        gridColumns(grid, columns.length, slide.cols || 4);

        columns.forEach(column => {

            const card = el("div", "landscape-column");

            const list = el("ul");

            (column.items || []).forEach(item => list.append(withIcon(el("li", null, itemText(item)), item?.icon)));

            card.append(el("h3", null, column.title), list);

            grid.append(card);

        });

        container.append(grid);

        return section;

    },

    cards(slide) {

        const { section, container } = slideShell(slide);

        const items = slide.items || [];

        const grid = el("div", "country-grid");

        gridColumns(grid, items.length, slide.cols || 5);

        items.forEach(item => grid.append(withIcon(el("div", "country-card", itemText(item)), item?.icon)));

        container.append(grid);

        return section;

    },

    list(slide) {

        const { section, container } = slideShell(slide);

        (slide.items || []).forEach(item => container.append(withIcon(el("div", "trend", itemText(item)), item?.icon)));

        return section;

    },

    ecosystem(slide) {

        const section = el("section");

        const container = el("div", "container center");

        const map = el("div", "ecosystem-map");

        map.append(el("div", "center-node", slide.center));

        ["top", "right", "bottom", "left"].forEach((position, index) => {
            const item = (slide.items || [])[index];
            if (item) map.append(el("div", `orbit ${position}`, item));
        });

        container.append(map);

        section.append(container);

        return section;

    },

    statement(slide) {

        const section = el("section");

        const container = el("div", "container");

        container.append(el("div", "statement", slide.text));

        if (slide.highlight) container.append(el("div", "statement-highlight", slide.highlight));

        section.append(container);

        return section;

    },

    timeline(slide) {

        const { section, container } = slideShell(slide);

        const items = slide.items || [];

        const grid = el("div", "timeline");

        gridColumns(grid, items.length, slide.cols || 4);

        items.forEach(item => grid.append(el("div", null, item)));

        container.append(grid);

        return section;

    },

    recommendations(slide) {

        const { section, container } = slideShell(slide);

        const items = slide.items || [];

        const grid = el("div", "recommendation-grid");

        gridColumns(grid, items.length, slide.cols || 3);

        items.forEach(item => {

            const card = el("div", "recommendation-card");

            const entry = typeof item === "string" ? { title: item } : item;

            card.append(el("h3", null, entry.title));

            if (entry.text) card.append(el("p", null, entry.text));

            grid.append(card);

        });

        container.append(grid);

        return section;

    },

    closing(slide) {

        const section = el("section");

        const container = el("div", "container");

        container.append(el("div", "closing-title", slide.text));

        const actions = slide.actions ?? ["pdf", "download", "share"];

        if (actions.length) {

            const bar = el("div", "presentation-actions");

            actions.forEach(key => {

                const action = ACTION_ICONS[key];

                if (!action) return;

                const button = el("button", "action-btn", null, {
                    id: action.id,
                    type: "button",
                    "aria-label": action.label,
                    title: action.label
                });

                button.innerHTML = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">${action.path}</svg>`;

                if (key === "share") {

                    const wrap = el("div", "share-wrap");

                    button.setAttribute("aria-haspopup", "true");
                    button.setAttribute("aria-expanded", "false");
                    button.setAttribute("aria-controls", "shareMenu");

                    const menu = el("div", "share-menu", null, { id: "shareMenu", role: "group", "aria-label": action.label });

                    SHARE_TARGETS.forEach((target, index) => {
                        const link = el("a", "action-btn share-option", null, {
                            id: target.id,
                            "aria-label": target.label,
                            title: target.label,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            tabindex: "-1",
                            href: "#"
                        });
                        link.style.setProperty("--i", index);
                        link.innerHTML = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">${target.path}</svg>`;
                        menu.append(link);
                    });

                    wrap.append(button, menu);
                    bar.append(wrap);
                    return;

                }

                bar.append(button);

            });

            container.append(bar);

        }

        section.append(container);

        return section;

    },

    /* ---------- Opcionales: gráficos ---------- */

    "area-chart"(slide) {
        return chartSlide(slide, buildAreaChart(slide));
    },

    "bar-chart"(slide) {
        return chartSlide(slide, buildBarChart(slide));
    },

    "donut-chart"(slide) {
        return chartSlide(slide, buildDonutChart(slide));
    },

    kpis(slide) {

        const { section, container } = slideShell(slide);

        const items = slide.items || [];

        const grid = el("div", "chart chart-kpis");

        gridColumns(grid, items.length, slide.cols || 4);

        items.forEach(item => grid.append(buildKpiCard(item)));

        container.append(grid);

        return section;

    }

};

/* ================================================= */
/* CHARTS                                             */
/* ================================================= */

let chartUid = 0;

function chartSlide(slide, chart) {

    const { section, container } = slideShell(slide);

    const card = el("div", slide.tone === "ink" ? "chart-card tone-ink" : "chart-card");

    if (slide.caption) card.append(el("div", "chart-caption", slide.caption));

    if (chart) {
        card.append(chart);
    } else {
        card.append(el("div", "chart-caption", "Sin datos para mostrar"));
    }

    if (slide.source) card.append(el("div", "chart-source", slide.source));

    container.append(card);

    return section;

}

function resolveIndex(option, values, fallback) {

    if (option === "max") return values.indexOf(Math.max(...values));

    if (option === "min") return values.indexOf(Math.min(...values));

    if (option === "last") return values.length - 1;

    if (option === "first") return 0;

    if (Number.isInteger(option)) return clamp(option, 0, values.length - 1);

    return fallback;

}

/* Curva monótona (Fritsch–Carlson): suave y sin sobreoscilaciones */
function smoothPath(points) {

    const n = points.length;

    const dx = [];
    const slope = [];

    for (let i = 0; i < n - 1; i++) {
        dx[i] = points[i + 1].x - points[i].x;
        slope[i] = (points[i + 1].y - points[i].y) / dx[i];
    }

    const tangent = [slope[0]];

    for (let i = 1; i < n - 1; i++) {
        tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }

    tangent[n - 1] = slope[n - 2];

    for (let i = 0; i < n - 1; i++) {

        if (slope[i] === 0) {
            tangent[i] = 0;
            tangent[i + 1] = 0;
            continue;
        }

        const a = tangent[i] / slope[i];
        const b = tangent[i + 1] / slope[i];
        const s = a * a + b * b;

        if (s > 9) {
            const tau = 3 / Math.sqrt(s);
            tangent[i] = tau * a * slope[i];
            tangent[i + 1] = tau * b * slope[i];
        }

    }

    let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < n - 1; i++) {

        const p0 = points[i];
        const p1 = points[i + 1];
        const h = dx[i] / 3;

        d += `C${(p0.x + h).toFixed(2)} ${(p0.y + tangent[i] * h).toFixed(2)} ` +
            `${(p1.x - h).toFixed(2)} ${(p1.y - tangent[i + 1] * h).toFixed(2)} ` +
            `${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;

    }

    return d;

}

function gradientStops(id, color, opacity) {

    const gradient = svgEl("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });

    gradient.append(
        svgEl("stop", { offset: "0%", style: `stop-color:${color};stop-opacity:${opacity}` }),
        svgEl("stop", { offset: "100%", style: `stop-color:${color};stop-opacity:0` })
    );

    return gradient;

}

function seriesColor(series, index) {

    if (series.color && cssSafe(series.color)) return series.color;

    return `var(--chart-${(index % 5) + 1})`;

}

function buildAreaChart(config) {

    const series = (config.series || []).filter(item => Array.isArray(item.values) && item.values.length > 1);

    if (!series.length) return null;

    const count = series[0].values.length;

    const labels = Array.from({ length: count }, (_, i) => String(config.labels?.[i] ?? i + 1));

    const format = config.format || {};

    const primary = series[0].values;

    let active = resolveIndex(config.highlight, primary, count - 1);

    const root = el("div", "chart chart-area");

    if (series.length > 1) {

        const legend = el("div", "chart-legend");

        series.forEach((item, index) => {

            const entry = el("span", "legend-item");

            const swatch = el("i", "legend-swatch");

            swatch.style.background = index === 0 ? "var(--chart-1)" : seriesColor(item, index);

            entry.append(swatch, item.name || `Serie ${index + 1}`);

            legend.append(entry);

        });

        root.append(legend);

    }

    const stage = el("div", "chart-stage", null, {
        tabindex: "0",
        role: "img",
        "aria-label": config.title || config.caption || "Gráfico de área"
    });

    root.append(stage);

    let setActive = () => {};

    const draw = () => {

        const W = stage.clientWidth;
        const H = stage.clientHeight;

        if (!W || !H) return;

        const margin = { l: 32, r: 32, t: 64, b: 56 };
        const plotW = W - margin.l - margin.r;
        const plotH = H - margin.t - margin.b;
        const bottom = margin.t + plotH;

        const all = series.flatMap(item => item.values);

        let lo = config.min ?? Math.min(...all);
        let hi = config.max ?? Math.max(...all);

        if (lo === hi) { lo -= 1; hi += 1; }

        const span = hi - lo;

        if (config.min == null) lo -= span * 0.14;
        if (config.max == null) hi += span * 0.06;

        const xAt = i => margin.l + plotW * i / (count - 1);
        const yAt = v => margin.t + plotH * (1 - (v - lo) / (hi - lo));

        const id = `chart-${++chartUid}`;

        const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });

        const defs = svgEl("defs");

        defs.append(
            gradientStops(`${id}-fill`, "var(--chart-1)", 0.5),
            (() => {
                const filter = svgEl("filter", { id: `${id}-glow`, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
                filter.append(svgEl("feGaussianBlur", { stdDeviation: 7 }));
                return filter;
            })()
        );

        svg.append(defs);

        if (config.grid) {
            for (let i = 0; i <= 3; i++) {
                const y = margin.t + plotH * i / 3;
                svg.append(svgEl("line", { x1: margin.l, x2: W - margin.r, y1: y, y2: y }, "chart-grid"));
            }
        }

        const points = primary.map((value, i) => ({ x: xAt(i), y: yAt(value) }));

        const linePath = smoothPath(points);

        svg.append(
            svgEl("path", {
                d: `${linePath}L${points[count - 1].x} ${bottom}L${points[0].x} ${bottom}Z`,
                fill: `url(#${id}-fill)`
            }, "chart-area-fill"),
            svgEl("path", { d: linePath, pathLength: 1, filter: `url(#${id}-glow)` }, "chart-glow draw"),
            svgEl("path", { d: linePath, pathLength: 1 }, "chart-line draw")
        );

        series.slice(1).forEach((item, index) => {

            const path = smoothPath(item.values.map((value, i) => ({ x: xAt(i), y: yAt(value) })));

            const line = svgEl("path", { d: path, pathLength: 1 }, "chart-line chart-line-secondary draw");

            line.style.stroke = seriesColor(item, index + 1);

            svg.append(line);

        });

        const vline = svgEl("line", {}, "chart-vline");
        const halo = svgEl("circle", { r: 12 }, "chart-halo");
        const dot = svgEl("circle", { r: 5 }, "chart-dot");
        const pillRect = svgEl("rect", { height: 30, rx: 15 }, "chart-pill");
        const pillText = svgEl("text", { "text-anchor": "middle", dy: ".35em" }, "chart-pill-text");

        const marker = svgEl("g", null, "chart-marker");

        marker.append(vline, halo, dot, pillRect, pillText);

        const ticks = labels.map((text, i) => {

            const group = svgEl("g", null, "chart-xlabel");
            const width = text.length * 7.4 + 24;
            const rect = svgEl("rect", { width, height: 26, rx: 13, x: xAt(i) - width / 2, y: H - 38 });
            const label = svgEl("text", { x: xAt(i), y: H - 25, "text-anchor": "middle", dy: ".35em" });

            label.textContent = text;

            group.append(rect, label);

            return group;

        });

        const step = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / 72))));

        svg.append(...ticks, marker);

        setActive = index => {

            active = index;

            const x = xAt(index);
            const y = yAt(primary[index]);

            vline.setAttribute("x1", x);
            vline.setAttribute("x2", x);
            vline.setAttribute("y1", y);
            vline.setAttribute("y2", bottom);
            halo.setAttribute("cx", x);
            halo.setAttribute("cy", y);
            dot.setAttribute("cx", x);
            dot.setAttribute("cy", y);

            const text = formatValue(primary[index], format);
            const width = Math.max(56, text.length * 8.6 + 28);
            const left = clamp(x - width / 2, 4, W - 4 - width);
            const top = Math.max(4, y - 18 - 30);

            pillText.textContent = text;
            pillRect.setAttribute("x", left);
            pillRect.setAttribute("y", top);
            pillRect.setAttribute("width", width);
            pillText.setAttribute("x", left + width / 2);
            pillText.setAttribute("y", top + 15);

            ticks.forEach((tick, i) => {

                const isActive = i === index;
                const visible = isActive || (i % step === 0 && Math.abs(i - index) >= step / 2);

                tick.classList.toggle("is-active", isActive);
                tick.style.display = visible ? "" : "none";

            });

        };

        const nearest = event => {
            const box = svg.getBoundingClientRect();
            const ratio = (event.clientX - box.left - margin.l) / plotW;
            setActive(clamp(Math.round(ratio * (count - 1)), 0, count - 1));
        };

        svg.addEventListener("pointermove", nearest);
        svg.addEventListener("pointerdown", nearest);

        stage.replaceChildren(svg);

        setActive(active);

    };

    stage.addEventListener("keydown", event => {

        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();

        setActive(clamp(active + (event.key === "ArrowRight" ? 1 : -1), 0, count - 1));

    });

    let lastSize = "";

    new ResizeObserver(() => {

        const size = `${stage.clientWidth}x${stage.clientHeight}`;

        if (size === lastSize) return;

        lastSize = size;

        draw();

    }).observe(stage);

    return root;

}

function buildBarChart(config) {

    const items = (config.items || []).filter(item => Number.isFinite(item.value));

    if (!items.length) return null;

    const vertical = config.orientation === "vertical";

    const format = config.format || {};

    const max = config.max ?? Math.max(...items.map(item => item.value));

    const highlight = resolveIndex(config.highlight, items.map(item => item.value), -1);

    const root = el("div", `chart chart-bars ${vertical ? "is-vertical" : "is-horizontal"}`);

    root.style.setProperty("--n", items.length);

    items.forEach((item, index) => {

        const row = el("div", "bar-item");

        row.style.setProperty("--v", clamp(item.value / max, 0, 1));
        row.style.setProperty("--i", index);

        if (highlight >= 0) row.classList.add(index === highlight ? "is-highlight" : "is-muted");

        const track = el("div", "bar-track");

        track.append(el("div", "bar-fill"));

        row.append(
            el("div", "bar-label", item.label),
            track,
            el("div", "bar-value", formatValue(item.value, format))
        );

        root.append(row);

    });

    return root;

}

function buildDonutChart(config) {

    const items = (config.items || []).filter(item => Number.isFinite(item.value) && item.value > 0);

    if (!items.length) return null;

    const format = config.format || {};

    const total = items.reduce((sum, item) => sum + item.value, 0);

    const root = el("div", "chart chart-donut");

    const figure = el("div", "donut-figure");

    const svg = svgEl("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });

    svg.append(svgEl("circle", { cx: 50, cy: 50, r: 40 }, "donut-track"));

    const center = el("div", "donut-center");

    const centerValue = el("div", "donut-center-value");

    const centerLabel = el("div", "donut-center-label");

    center.append(centerValue, centerLabel);

    const defaultCenter = {
        value: config.center?.value ?? formatValue(total, format),
        label: config.center?.label ?? "Total"
    };

    const showCenter = (value, label) => {
        centerValue.textContent = value;
        centerLabel.textContent = label;
    };

    showCenter(defaultCenter.value, defaultCenter.label);

    const legend = el("ul", "donut-legend");

    const gap = items.length > 1 ? 1.2 : 0;

    let start = 0;

    const nodes = items.map((item, index) => {

        const share = item.value / total * 100;

        const length = Math.max(share - gap, 0.01);

        const color = item.color && cssSafe(item.color) ? item.color : `var(--chart-${(index % 5) + 1})`;

        const segment = svgEl("circle", {
            cx: 50,
            cy: 50,
            r: 40,
            pathLength: 100,
            transform: "rotate(-90 50 50)",
            "stroke-dasharray": `${length} ${100 - length}`,
            "stroke-dashoffset": -start
        }, "donut-segment");

        segment.style.stroke = color;
        segment.style.transitionDelay = `${index * 120}ms`;

        start += share;

        const percent = formatValue(share, { suffix: "%" });

        const entry = el("li", "legend-row");

        const swatch = el("i", "legend-swatch");

        swatch.style.background = color;

        entry.append(
            swatch,
            (() => {
                const name = el("span", "legend-name", item.label);
                if (item.detail) name.append(el("small", null, item.detail));
                return name;
            })(),
            el("span", "legend-value", formatValue(item.value, format)),
            el("span", "legend-share", percent)
        );

        const activate = () => {
            root.classList.add("has-active");
            nodes.forEach(node => node.segment.classList.toggle("is-active", node.segment === segment));
            nodes.forEach(node => node.entry.classList.toggle("is-active", node.entry === entry));
            showCenter(percent, item.label);
        };

        const deactivate = () => {
            root.classList.remove("has-active");
            nodes.forEach(node => {
                node.segment.classList.remove("is-active");
                node.entry.classList.remove("is-active");
            });
            showCenter(defaultCenter.value, defaultCenter.label);
        };

        [segment, entry].forEach(target => {
            target.addEventListener("pointerenter", activate);
            target.addEventListener("pointerleave", deactivate);
        });

        return { segment, entry };

    });

    nodes.forEach(node => {
        svg.append(node.segment);
        legend.append(node.entry);
    });

    figure.append(svg, center);

    root.append(figure, legend);

    return root;

}

function buildKpiCard(item) {

    const card = el("div", "kpi-card");

    const kpiIcon = iconEl(item.icon);

    if (kpiIcon) card.append(kpiIcon);

    card.append(el("div", "kpi-label", item.label));

    const value = el("div", "kpi-value");

    setCountTarget(value, item);

    card.append(value);

    if (item.delta) {

        const trend = item.trend === "down" ? "down" : "up";

        card.append(el("span", `kpi-delta is-${trend}`, `${trend === "down" ? "↓" : "↑"} ${item.delta}`));

    }

    if (item.note) card.append(el("div", "kpi-note", item.note));

    if (Array.isArray(item.spark) && item.spark.length > 1) {

        const W = 240;
        const H = 56;
        const lo = Math.min(...item.spark);
        const hi = Math.max(...item.spark);
        const range = hi - lo || 1;
        const points = item.spark.map((v, i) => ({
            x: 2 + (W - 4) * i / (item.spark.length - 1),
            y: 4 + (H - 8) * (1 - (v - lo) / range)
        }));

        const id = `chart-${++chartUid}`;

        const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" }, "kpi-spark");

        const defs = svgEl("defs");

        defs.append(gradientStops(id, "var(--chart-1)", 0.4));

        const line = smoothPath(points);

        svg.append(
            defs,
            svgEl("path", { d: `${line}L${W - 2} ${H}L2 ${H}Z`, fill: `url(#${id})` }, "chart-area-fill"),
            svgEl("path", { d: line, pathLength: 1, "vector-effect": "non-scaling-stroke" }, "chart-line draw")
        );

        card.append(svg);

    }

    return card;

}

function initializeChartReveal() {

    const charts = document.querySelectorAll(".chart");

    if (!charts.length) return;

    if (!document.body.classList.contains("motion-enabled")) {
        charts.forEach(chart => chart.classList.add("is-in"));
        return;
    }

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-in");

            observer.unobserve(entry.target);

        });

    }, { threshold: 0.3 });

    window.addEventListener("beforeprint", () => charts.forEach(chart => chart.classList.add("is-in")));

    charts.forEach(chart => {
        chart.classList.add("is-armed");
        observer.observe(chart);
    });

}

/* ================================================= */
/* COUNTERS                                           */
/* ================================================= */

function setCountTarget(element, source) {

    const value = Number(source.value);

    element.dataset.target = Number.isFinite(value) ? value : 0;
    element.dataset.prefix = source.prefix || "";
    element.dataset.suffix = source.suffix || "";

    if (source.decimals !== undefined) element.dataset.decimals = source.decimals;

    element.textContent = countText(element, value);

}

function countText(element, value) {

    return formatValue(value, {
        prefix: element.dataset.prefix,
        suffix: element.dataset.suffix,
        decimals: element.dataset.decimals === undefined ? undefined : Number(element.dataset.decimals)
    });

}

function initializeKpiCounter() {

    const counters = document.querySelectorAll("[data-target]");

    if (!counters.length) return;

    const animate = document.body.classList.contains("motion-enabled");

    const finish = element => {
        element.textContent = countText(element, Number(element.dataset.target));
    };

    window.addEventListener("beforeprint", () => counters.forEach(finish));

    if (!animate) return;

    const run = element => {

        const target = Number(element.dataset.target);

        const start = performance.now();

        const duration = 1100;

        const tick = now => {

            const progress = clamp((now - start) / duration, 0, 1);

            const eased = 1 - Math.pow(1 - progress, 3);

            element.textContent = countText(element, progress === 1 ? target : target * eased);

            if (progress < 1) requestAnimationFrame(tick);

        };

        requestAnimationFrame(tick);

    };

    counters.forEach(element => {
        element.textContent = countText(element, 0);
    });

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            run(entry.target);

            observer.unobserve(entry.target);

        });

    }, { threshold: 0.5 });

    counters.forEach(element => observer.observe(element));

}

/* ================================================= */
/* INTRO                                              */
/* ================================================= */

function initializeIntro() {

    const intro = document.getElementById("intro");
    const typed = document.getElementById("introTyped");
    const sound = document.getElementById("introSound");
    const replay = document.getElementById("replayIntro");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (motion.matches) return;

    const text = typed.dataset.text || "";
    const hasSound = sound.hasAttribute("src");
    let typing;
    let finish;

    const stopSound = () => {
        if (!hasSound) return;
        sound.pause();
        sound.currentTime = 0;
    };

    const finishIntro = () => {
        clearInterval(typing);
        clearTimeout(finish);
        stopSound();
        typed.textContent = text;
        intro.classList.remove("intro-playing");
        intro.classList.add("intro-complete");
        replay.hidden = false;
    };

    const startIntro = () => {
        clearInterval(typing);
        clearTimeout(finish);
        stopSound();
        replay.hidden = true;
        intro.classList.remove("intro-playing", "intro-complete");
        void intro.offsetWidth;
        intro.classList.add("intro-playing");
        typed.textContent = "";

        if (hasSound) {
            sound.play().catch(error => {
                console.warn("Intro sound could not be played", error);
            });
        }

        let position = 0;
        typing = setInterval(() => {
            position += 1;
            typed.textContent = text.slice(0, position);
            if (position >= text.length) {
                clearInterval(typing);
                stopSound();
            }
        }, 140);
        finish = setTimeout(finishIntro, 3800);
    };

    replay.addEventListener("click", startIntro);
    window.addEventListener("scroll", () => {
        if (intro.classList.contains("intro-playing") && intro.getBoundingClientRect().bottom <= 0) {
            finishIntro();
        }
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && intro.classList.contains("intro-playing")) finishIntro();
    });

    motion.addEventListener("change", event => {
        if (!event.matches) return;
        clearInterval(typing);
        clearTimeout(finish);
        stopSound();
        typed.textContent = text;
        intro.classList.remove("intro-playing");
        intro.classList.add("intro-complete");
        replay.hidden = true;
    });

    if (intro.getBoundingClientRect().bottom > 0) {
        startIntro();
    } else {
        finishIntro();
    }

}

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

    const key =
        document.body.dataset.themeKey || "presentation-theme";

    if (localStorage.getItem(key) === "dark") {

        document.body.classList.add("dark");

    }

    syncThemeLogo();

    button.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        syncThemeLogo();

        localStorage.setItem(
            key,
            document.body.classList.contains("dark") ? "dark" : "light"
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

            const near = Math.abs(linkIndex - activeIndex) <= 3;
            const edge = linkIndex === 0 || linkIndex === links.length - 1;
            const hidden = links.length > 11 && !near && !edge;

            link.classList.toggle("nav-hidden", hidden);
            link.classList.toggle("nav-gap", !hidden && linkIndex < links.length - 1 && links.length > 11 &&
                (linkIndex === 0 ? activeIndex > 4 : linkIndex === activeIndex + 3 && activeIndex + 3 < links.length - 2));

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
                        if (!url || url.startsWith("data:")) return url;
                        const response = await readResource(url);
                        const blob = await response.blob();
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = () => reject(reader.error);
                            reader.readAsDataURL(blob);
                        });
                    };

                    const data = JSON.parse(JSON.stringify(window.presentationData));

                    data._icons = Object.fromEntries([...ICON_CACHE].filter(([, markup]) => markup));

                    const [css, js] = await Promise.all([
                        stylesheet.href
                            ? readResource(stylesheet.href).then(response => response.text())
                            : stylesheet.textContent,
                        script.src
                            ? readResource(script.src).then(response => response.text())
                            : script.textContent
                    ]);

                    // Los recursos se incrustan en el JSON; el HTML guardado se vuelve a renderizar solo.
                    const inline = async (object, key) => {
                        if (object && object[key]) object[key] = await imageData(new URL(object[key], location.href).href);
                    };

                    await Promise.all([
                        inline(data.brand?.logo, "light"),
                        inline(data.brand?.logo, "dark"),
                        inline(data.client, "logo"),
                        inline(data.intro, "sound")
                    ]);

                    const copy = document.documentElement.cloneNode(true);
                    const body = copy.querySelector("body");

                    body.classList.remove("motion-enabled");
                    copy.querySelectorAll("[data-slide], [data-nav], #themeVars").forEach(node => node.remove());
                    copy.querySelector("#intro").classList.remove("intro-playing", "intro-complete", "is-visible");
                    copy.querySelector("#introTyped").textContent = "";
                    copy.querySelector("#replayIntro").hidden = true;
                    copy.querySelector("#outsideLogo").removeAttribute("src");
                    copy.querySelector("#introSound").removeAttribute("src");

                    const style = document.createElement("style");
                    style.id = "presentationStyles";
                    style.textContent = css;
                    copy.querySelector("#presentationStyles").replaceWith(style);
                    const inlineScript = copy.querySelector("#presentationScript");
                    inlineScript.removeAttribute("src");
                    inlineScript.textContent = js.replace(/<\/script/gi, "<\\/script");

                    const dataScript = document.createElement("script");
                    dataScript.id = "presentationData";
                    dataScript.type = "application/json";
                    dataScript.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
                    inlineScript.before(dataScript);

                    const blob = new Blob(
                        ["<!DOCTYPE html>\n", copy.outerHTML],
                        { type: "text/html;charset=utf-8" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = document.body.dataset.downloadName || "presentation.html";
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

        const menu = document.getElementById("shareMenu");
        const options = [...menu.querySelectorAll(".share-option")];

        const setOpen = (open, restoreFocus) => {

            menu.classList.toggle("is-open", open);
            share.setAttribute("aria-expanded", String(open));
            options.forEach(option => option.tabIndex = open ? 0 : -1);

            if (!open && restoreFocus) share.focus();

        };

        const refreshLinks = () => {

            const title = document.title;
            const url = window.location.href;

            options[0].href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
            options[0].removeAttribute("target");
            options[1].href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

        };

        refreshLinks();

        share.addEventListener("click", () => {
            refreshLinks();
            setOpen(!menu.classList.contains("is-open"));
        });

        options.forEach(option => option.addEventListener("click", () => setOpen(false)));

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && menu.classList.contains("is-open")) setOpen(false, true);
        });

        document.addEventListener("click", event => {
            if (menu.classList.contains("is-open") && !event.target.closest(".share-wrap")) setOpen(false);
        });

    }

}
