lazy(mega, 'templates', () => {

    'use strict';

    let $templates = null;

    const init = () => {
        pages.extra_templates_html = translate(pages.extra_templates_html).replace(/{staticpath}/g, staticpath);
        return $(parseHTML(pages.extra_templates_html));
    };

    /**
     * Get a template from the DOM, clone it and change the id
     * @param {string} id - The id of the template to clone
     * @param {string} newID - The new id to assign to the cloned template
     * @returns {JQuery<HTMLElement>} - The cloned template
     */
    const getTemplate = (id, newID) => {

        // Ensure that there is no item with duplicated ID
        const elem = document.getElementById(newID);
        if (elem) {
            elem.remove();
        }

        // Return a clone of the template with the new ID, or no ID if not provided
        return $(`#${id}`, $templates)
            .clone()
            .removeClass('template')
            .attr('id', newID || null);
    };

    $templates = init();

    return freeze({
        getTemplate,
    });
});
