/**
 * Functionality and picture element processing for the feature pages
 *
 * Picture elements should either have a data-name and an override in the pictures variable;
 * or data-folder, data-name and data-extension
 */
const featurePages = (function() {
    'use strict';

    /**
     * Create a set of picture and image sources based on the name of the image and the folder it is in
     *
     * @param {string} folder - the folder the image is in
     * @param {string} name - the name of the image
     * @param {string} extension - the image's extension
     * @returns {object} - a sources object following a generic tempalate
     */
    const generateGenericSources = (folder, name, extension) => {
        const breakpoint = 461;

        return {
            sources: [
                {
                    srcset: (() => {
                        let str = `${staticpath}${folder}/${name}_desktop.${extension}, `;
                        for (let i = 2; i <= 3; i++) {
                            str += `${staticpath}${folder}/${name}_desktop@${i}x.${extension} ${i}x, `;
                        }
                        return str;
                    })(),
                    media: `(min-width: ${breakpoint}px)`,
                },

                (() => {
                    let str = `${staticpath}${folder}/${name}_mobile.${extension}, `;
                    for (let i = 2; i <= 3; i++) {
                        str += `${staticpath}${folder}/${name}_mobile@${i}x.${extension} ${i}x, `;
                    }
                    return str;
                })(),
            ],

            img: `${staticpath}${folder}/${name}_desktop.${extension}`,
        };
    };

    /**
     * Creates an array of picture sources, either generic or user specified
     *
     * @param {object} pictures - an object of non-generic source names, used to override the generic approach
     * @param {HTMLElement} elem - a picture element
     * @return {object} - an array of picture sources
     */
    const generatePictureSources = (pictures, elem) => {
        if (typeof pictures === 'object' && elem.dataset.name && pictures[elem.dataset.name]) {
            return pictures[elem.dataset.name];
        }
        else if (elem.dataset.folder && elem.dataset.name && elem.dataset.extension) {
            return generateGenericSources(
                elem.dataset.folder,
                elem.dataset.name,
                elem.dataset.extension);
        }
    };

    /**
     * Replace all pictures with a data-name attribute
     *
     * @param {object} pictures - an object of non-generic source names, used to override the generic approach
     * @returns {function} - a function that safely replaces picture elements on a page
     */
    const processPictures = (pictures) => {
        document.querySelectorAll('.feature-page picture[data-name]').forEach(elem => {
            let picture = generatePictureSources(pictures, elem);

            if (picture !== null) {
                const img = elem.querySelector('img');

                if (Array.isArray(picture.sources)) {
                    picture.sources.forEach(source => {
                        const sourceElem = document.createElement('source');

                        if (typeof source === 'string') {
                            sourceElem.srcset = source;
                        }
                        else {
                            if (source.srcset && typeof source.srcset === 'string') {
                                sourceElem.srcset = source.srcset;
                            }
                            if (source.media && typeof source.media === 'string') {
                                sourceElem.media = source.media;
                            }
                        }

                        elem.insertBefore(sourceElem, img);
                    });
                }

                if (typeof picture.img === 'string') {
                    img.src = picture.img;

                    const alt = elem.getAttribute('alt');
                    if (alt && alt !== '') {
                        img.alt = alt;
                    }
                }
            }
        });
    };

    /** Overrides/non-standard naming conventions can go here. Format:
     * data_name_of_picture = {
     *     sources: [
     *         {
     *             srcset: '',     // srcset with media query
     *             media: '',
     *         },
     *         '',                 // srcset
     *     ],
     *     img: '',                // img src
     * }
     */
    const pictures = {
        chat: {},
        collaboration: {},
        storage: {},
    };

    /**
     * @param  {string} [pageName] - the name of the page, used for overrides, optional
     * @returns {undefined}
     */
    return function(pageName) {
        if (typeof pageName === 'string') {
            processPictures(pictures[pageName]);
        }
        else {
            processPictures();
        }
    };
})();
