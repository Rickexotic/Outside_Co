export default {

    type: "ecosystem-flow",

    render(slide) {

        return `
            <section
                id="${slide.id || ''}"
                class="slide ecosystem-flow-slide">

                <div class="container">

                    <div class="eyebrow">
                        ${slide.eyebrow || ''}
                    </div>

                    <h2>
                        ${slide.title || ''}
                    </h2>

                    <div class="ecosystem-flow">

                        <div class="ecosystem-hub">

                            ${slide.center?.label || 'Platform'}

                        </div>

                    </div>

                </div>

            </section>
        `;
    }
};
