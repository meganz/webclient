mobile.conflictResolution = {

    container: null,

    /**
     * Initialize the file conflict container.
     * @returns {Object} Container
     */
    init: function() {
        'use strict';

        if (!this.container) {
            this.container = mCreateElement('div', {'class': 'conflict-resolution'});
            mCreateElement('div', {'class': 'info-txt-fn'}, this.container);

            // Action block a1
            const button1 = new MegaMobileButton({
                parentNode: this.container,
                type: 'text',
                componentClassname: 'secondary action-block a1',
                text: 'text',
                subtext: 'subtext'
            });

            // Action block a3
            const button2 = new MegaMobileButton({
                parentNode: this.container,
                type: 'text',
                componentClassname: 'secondary action-block a3',
                text: 'text',
                subtext: 'subtext'
            });

            // Aside for multiple files conflicts
            const aside = mCreateElement('aside', {}, this.container);
            /* eslint-disable no-new */
            new MegaMobileCheckbox({
                parentNode: aside,
                componentClassname: 'mega-checkbox duplicates-checkbox',
                checkboxName: 'duplicates-checkbox',
                checkboxAlign: 'left',
                labelTitle: l[16494],
                checked: false
            });

            // Action block a2
            new MegaMobileLink({
                parentNode: this.container,
                type: 'text',
                componentClassname: 'text-only action-block a2',
                text: 'test'
            });

            // Add some classes for compatibility with desktop
            const primaryTexts = this.container.querySelectorAll('.primary-text');
            for (let i = primaryTexts.length; i--;) {
                primaryTexts[i].classList.add('red-header');
            }
            const subTexts = this.container.querySelectorAll('.sub-text');
            for (let i = subTexts.length; i--;) {
                subTexts[i].classList.add('light-grey');
            }

            const infoBlockDiv = mCreateElement('div', {'class': 'info-block'}, [
                mCreateElement('i', {'class': 'export-icon image'}),
                mCreateElement('div', {'class': 'info-txt file-name'}),
                mCreateElement('div', {'class': 'info-props'}, [
                    mCreateElement('div', {'class': 'info-txt light-grey file-size'}),
                    mCreateElement('div', {'class': 'info-txt file-date'}),
                ])
            ]);
            button1.domNode.appendChild(infoBlockDiv);
            button2.domNode.appendChild(infoBlockDiv.cloneNode(true));

        }

        this.container.componentSelector('.duplicates-checkbox').checked = false;

        return this.container;
    },

};

mBroadcaster.once('startMega', () => {
    'use strict';

    fileIcon = function(node) {
        return MegaMobileNode.mFileIcon(node);
    };

    /**
     * Get container from file conflict dialog.
     * @returns {Object} Container
     */
    fileconflict.getDialog = function() {
        return mobile.conflictResolution.init();
    };

    /**
     * Show dialog using MegaMobileOverlay component.
     * @param {Object} dialog Dialog
     * @returns {void}
     */
    fileconflict.showDialog = function(dialog) {
        mega.ui.overlay.show({
            name: 'file-conflict-overlay',
            showClose: true,
            title: l[16485],
            contents: [dialog]
        });
    };

    /**
     * Hide dialog using MegaMobileOverlay component.
     * @returns {void}
     */
    fileconflict.hideDialog = function() {
        mega.ui.overlay.hide();
    };

    /**
     * Get close button from file conflict dialog.
     * @returns {Object} Close button
     */
    fileconflict.getCloseButton = function() {
        return mega.ui.overlay.closeButton;
    };

    /**
     * Check if the multiple conflict resolution option is checked and action is not DONTCOPY.
     * @param {Object} dialog Container
     * @param {Number} action Action
     * @param {Number} DONTCOPY DONTCOPY action
     * @returns {Boolean} True if is checked and action is not DONTCOPY
     */
    fileconflict.isChecked = function(dialog, action, DONTCOPY) {
        return dialog.componentSelector('.duplicates-checkbox').checked && action !== DONTCOPY;
    };

    /**
     * Add some customization to file names to make them always show their beginning and end in long names.
     * @param {Object} dialog Container
     * @returns {void}
     */
    fileconflict.customNames = function(dialog) {
        const fileNames = dialog.querySelectorAll('.file-name');
        for (let i = fileNames.length; i--;) {
            let name = fileNames[i].textContent;
            const index = name && name.search(/(\(\d+\))?(\.[\dA-Za-z]+)?$/);
            name = index === -1 ?
                `<span>${name}</span>` : `<span>${name.substr(0, index)}</span><span>${name.substr(index)}</span>`;
            fileNames[i].textContent = '';
            fileNames[i].append(parseHTML(name));
        }
    };

    /**
     * Add some customization to multiple file conflicts escaping files individually.
     * @param {Object} dialog Container
     * @returns {void}
     */
    fileconflict.customRemaining = function(dialog) {
        dialog.querySelector('.action-block.a2 .red-header').textContent = l.file_conflict_skip_file;
    };
});
