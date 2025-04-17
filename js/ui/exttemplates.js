lazy(mega, 'templates', () => {

    'use strict';

    let $templates = null;

    const init = () => {
        pages.exttemplates = translate(pages.exttemplates).replace(/{staticpath}/g, staticpath);
        return $(parseHTML(pages.exttemplates));
    };

    /**
     * Get a template from the DOM, clone it and change the id
     * @param {string} id - The id of the template to clone
     * @param {string} newID - The new id to assign to the cloned template
     * @param {JQuery<HTMLElement>} [$templateLocation] - The location of the template, if not in main templates
     * @returns {JQuery<HTMLElement>} - The cloned template
     */
    const getTemplate = (id, newID, $templateLocation) => {

        $templateLocation = $templateLocation || $templates;

        // Ensure that there is no item with duplicated ID
        const elem = newID && document.getElementById(newID);
        if (elem) {
            elem.remove();
        }

        // Return a clone of the template with the new ID, or no ID if not provided
        return $(`#${id}`, $templateLocation)
            .clone()
            .removeClass('template')
            .attr('id', newID || null);
    };

    $templates = init();

    return freeze({
        getTemplate,
    });
});
