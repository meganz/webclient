class MobileSelectionRender extends MobileMegaRender {

    constructor() {

        // Forcing list view
        super(0);

        this.selection = true;

        const {mode, submitText, buttonCondition, onSubmit} = MobileSelectionRender.getType();
        const fmholder = document.getElementById('fmholder');
        const fmblock = document.querySelector('.mobile.file-manager-block');

        if (fmholder) {
            fmholder.classList.add('selection-mode', `${mode}-mode`);
        }

        if (fmblock) {
            const isDisabled = typeof buttonCondition === 'function' && !buttonCondition();
            const _submit = function() {
                console.assert(onSubmit, 'Invalid submit action.');
                onSubmit(M.currentdirid, this);
            };

            this.selectionButton = new MegaMobileBottomBar({
                parentNode: fmblock,
                actions: [
                    [
                        [
                            'selection-action-btn',
                            submitText,
                            _submit,
                            isDisabled
                        ]
                    ]
                ]
            });
        }
    }

    destroy() {

        if (this.selectionButton) {
            this.selectionButton.destroy();
        }

        const fmholder = document.getElementById('fmholder');

        if (fmholder) {
            fmholder.classList.remove('selection-mode');
        }

        super.destroy();
    }

    static getType() {

        const key = mobile.nodeSelector.type;
        const moveCopyTabOpts = [
            {name: l[164], key: 'cloud', active: M.currentrootid === M.RootID, type: 'link', href: 'fm'},
            {name: l[16770], key: 'shares', active: M.currentrootid === 'shares', type: 'link', href: 'fm/shares'}
        ];
        const _getCompleteString = (sn, th, type) => {
            /**
             * List of possible string key combinations:
             *
             * l.mobile_file_move_to_folder
             * l.mobile_file_copy_to_folder
             * l.mobile_folder_move_to_folder
             * l.mobile_folder_copy_to_folder
             */
            return parseHTML(
                mega.icu.format(
                    l[`mobile_${sn.t ? 'folder' : 'file'}_${type}_to_folder`], 1
                )
                    .replace('%1', M.getNameByHandle(th))
            );
        };

        return {
            'copy': {
                mode: 'folder',
                submitText: l[63],
                onSubmit: (h, button) => {

                    button.loading = true;

                    const {selected} = mobile.nodeSelector;
                    mobile.nodeSelector[`copyRenamed${selected}`] = null;

                    // selection action
                    M.copyNodes([selected], h, false)
                        .catch((ex) => ex !== EBLOCKED && tell(ex))
                        .then(res => {
                            if (res && res.length) {
                                const sn = M.getNodeByHandle(res[0]);
                                mega.ui.toast.show(
                                    _getCompleteString(sn, h, 'copy'),
                                    undefined,
                                    l[16797],
                                    {actionButtonCallback: () => M.openFolder(h)}
                                );
                            }
                        })
                        .always(() => {
                            delete mobile.nodeSelector[`copyRenamed${selected}`];
                            mobile.nodeSelector.hide();
                            button.loading = true;
                        });

                    return false;
                },
                tabs: moveCopyTabOpts,
                buttonCondition: () =>
                    M.getNodeRights(M.currentdirid) && mobile.nodeSelector.selected !== M.currentdirid
            },
            'move': {
                mode: 'folder',
                submitText: l[62],
                onSubmit: (h, button) => {

                    button.loading = true;

                    const {selected} = mobile.nodeSelector;
                    // TODO: remove this type logic once we fix move another section treat as copy.
                    const aType = treetype(h) === treetype(selected) ? 'move' : 'copy';
                    mobile.nodeSelector[`${aType}Renamed${selected}`] = null;

                    M.safeMoveNodes(h, [selected])
                        .then(() => {
                            const sn = M.getNodeByHandle(selected);
                            mega.ui.toast.show(
                                _getCompleteString(sn, h, aType),
                                undefined,
                                l[16797],
                                {actionButtonCallback: () => M.openFolder(h)}
                            );
                        })
                        .catch(dump)
                        .always(() => {
                            delete mobile.nodeSelector[`${aType}Renamed${selected}`];
                            mobile.nodeSelector.hide();
                            button.loading = false;
                        });

                    return false;
                },
                tabs: moveCopyTabOpts,
                buttonCondition: () =>
                    M.getNodeRights(M.currentdirid) && !M.isCircular(mobile.nodeSelector.selected, M.currentdirid)
            },
            'saveTextTo': {
                mode: 'folder',
                submitText: l[776],
                onSubmit: h => {

                    mega.ui.saveTextAs.targetFolder = h;
                    const origNode = M.getNodeByHandle(mobile.nodeSelector.selected);
                    mega.ui.saveTextAs.show({name: origNode.name, t: origNode.t}, {noBtnDisable: true});
                    return false;
                },
                tabs: moveCopyTabOpts,
                buttonCondition: () => M.getNodeRights(M.currentdirid)
            },
            'share': {
                mode: 'file', // file mode is current not support in full as we only have design of folder mode.
                submitText: l[60],
                onSubmit: h => {

                    // selection action
                    console.warn(`Share - Target: ${h}, Original: ${mobile.nodeSelector.selected}`);
                }
            }
        }[key];
    }

    getMListOptions() {

        return {
            itemRenderFunction: M.megaListRenderNode,
            preserveOrderInDOM: true,
            extraRows: 4,
            batchPages: 0,
            appendOnly: false,
            onContentUpdated: function() {
                if (M.viewmode) {
                    delay('thumbnails', fm_thumbnails, 2);
                }
            },
            usingNativeScroll: true,
            itemWidth: false,
            itemHeight: M.currentdirid === 'shares' ? 84 : 64,
            renderAdapter: new MegaList.RENDER_ADAPTERS.List({usingNativeScroll: true}),
            bottomSpacing: 40 + 24
        };
    }
}
(mobile => {

    'use strict';

    const _emitter = new MegaDataEmitter();

    // Helper
    mobile.nodeSelector = {

        active: false,
        step: 0,
        on: _emitter.on,
        one: _emitter.one,
        off: _emitter.off,
        trigger: _emitter.trigger,
        rebind: _emitter.rebind,

        _popStateHandler: event => {

            if (event.state && !event.state.nodeSelector) {
                mobile.nodeSelector.hide(false, true);
            }
        },

        replaceHistory(page, state) {

            const ns = mobile.nodeSelector;

            // Note: DO NOT remove `/` on end of url param,
            // which used to trigger loadSubpage when selector visit origin folder
            if (page === true) {
                history.replaceState({subpage: state, nodeSelector: true}, '', `/fm/${ns.origin}/`);
                ns.step--;
            }
            else {
                history.pushState({subpage: page, nodeSelector: true}, '', `/fm/${ns.origin}/`);
                ns.step++;
            }
        },

        show(type, original, start) {

            this.active = true;
            this.origin = this.origin || M.currentdirid;
            this.type = type;
            this.step = 0;
            this.selected = original;
            this.selectedTree = M.getTreeHandles(this.selected);

            start = start || M.RootID;

            this.originalPHS = window.pushHistoryState;

            window.pushHistoryState = this.replaceHistory;

            if (this.origin === start) {
                pushHistoryState(getCleanSitePath(), {nodeSelector: true});
            }

            window.addEventListener('popstate', this._popStateHandler);

            if (mega.ui.header.closeButton) {
                mega.ui.header.closeButton.rebind('tap.close', () => {
                    this.trigger('closeBtnClick');
                    this.hide();
                });
            }

            M.openFolder(start, true).then(() => {

                // When start page is same as current page, manually call update as loadSubpage will not trigger update.
                if (page === `fm/${start}`) {
                    mega.ui.header.update();
                }
            });
        },

        hide(next, popstates) {

            if (!M.megaRender.selection) {

                if (d) {
                    console.error('There is no active selection overlay to hide.');
                }

                return;
            }

            window.removeEventListener('popstate', this._popStateHandler);
            window.pushHistoryState = this.originalPHS;

            // If this is not popstate event clear history stack
            if (!popstates && this.step) {
                history.go(this.step * -1);
                this.step = 0;
            }
            this.active = false;
            next = next || this.origin || M.RootID;

            delete this.origin;
            delete this.type;
            delete this.selected;
            delete this.selectedTree;

            onIdle(() => {

                M.openFolder(next, true).then(() => {

                    // When start page is same as current page,
                    // manually call update as loadSubpage will not trigger update.
                    if (page === `fm/${next}`) {
                        mega.ui.header.update();
                    }
                });
            });

            this.off('closeBtnClick');
        },

        // Register previous node for the case user cancel and need to go back.
        registerPreviousViewNode() {

            if (mega.ui.viewerOverlay.visible) {

                const _prevHandle = mega.ui.viewerOverlay.nodeComponent.handle;

                this.one('closeBtnClick.saveAsDialog', () => {
                    onIdle(() => mega.ui.viewerOverlay.show(_prevHandle));
                });
            }
        }
    };
})(window.mobile);

