window.OUTSIDE_COMPONENTS =
window.OUTSIDE_COMPONENTS || {};

window.OUTSIDE_COMPONENTS["ecosystem-flow"] = {

    render(slide){

        const section = el("section");

        const container =
            el("div","container");

        if(slide.eyebrow){

            container.append(
                el(
                    "div",
                    "eyebrow",
                    slide.eyebrow
                )
            );
        }

        if(slide.title){

            container.append(
                el(
                    "h2",
                    null,
                    slide.title
                )
            );
        }

        const eco =
            el(
                "div",
                "ecosystem-flow"
            );

        const hub =
            el(
                "div",
                "ecosystem-hub"
            );

        const hubInner =
            el(
                "div",
                "ecosystem-hub-inner",
                slide.center?.label ||
                "Platform"
            );

        hub.append(hubInner);

        eco.append(hub);

        container.append(eco);

        section.append(container);

        return section;
    }

};
