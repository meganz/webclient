lazy(s4, 'objects', () => {
    'use strict';

    const {S4Dialog} = s4.ui.classes;

    class S4AccessDialog extends S4Dialog {
        constructor(name) {
            super(name, $('.s4-object-access-dialog', '.mega-dialog-container'));

            this.$switch = $('.mega-switch', this.$dialogContainer);
            this.$fileInfoContainer = $('.file-info', this.$dialogContainer);
            this.$linkContainer = $('.input-container', this.$dialogContainer);
            this.$copyButton = $('.mega-button.copy', this.$dialogContainer);
        }

        hide() {
            super.hide();

            delete this.bucket;
            delete this.object;
            delete this.publicAccess;
            delete this.bucketAccess;
        }

        show(node) {
            this.object = s4.kernel.getS4NodeType(node) === 'object' && node;

            if (!this.object) {
                return false;
            }

            s4.kernel.object.getPublicURL(this.object.h)
                .then((res) => {
                    $('input', this.$linkContainer).val(res || '');
                })
                .catch(tell)
                .finally(() => {
                    $('.transfer-filetype-icon', this.$fileInfoContainer)
                        .attr('class', `transfer-filetype-icon ${fileIcon(this.object)}`);
                    $('.file-name', this.$fileInfoContainer).text(this.object.name);
                    $('.file-size', this.$fileInfoContainer).text(bytesToSize(this.object.s));

                    this.$notification = $('.bucket-access-warning', this.$dialogContainer)
                        .addClass('hidden');
                    this.bucket = s4.kernel.getS4BucketForObject(this.object);
                    this.publicAccess = s4.kernel.getPublicAccessLevel(this.object);
                    this.bucketAccess = s4.kernel.getPublicAccessLevel(this.bucket);
                    this.togglePublicAccessUI();

                    return super.show();
                });
        }

        unbindEvents() {
            super.unbindEvents();

            this.$switch.unbind('click.s4dlg');
            this.$copyButton.unbind('click.s4dlg');
        }

        bindEvents() {
            this.$switch.rebind('click.s4dlg', () => {
                if (this.progress || !this.object) {
                    return false;
                }

                this.publicAccess = s4.kernel.getPublicAccessLevel(this.object) ? 0 : 1;
                this.progress = true;
                loadingDialog.show('s4-object-pa');
                s4.kernel.object.publicURLAccess(this.object.h, this.publicAccess)
                    .then(() => {
                        this.togglePublicAccessUI();
                    })
                    .finally(() => {
                        this.progress = false;
                        loadingDialog.hide('s4-object-pa');
                    })
                    .catch(tell);
            });

            this.$copyButton.rebind('click.s4dlg', () => {
                copyToClipboard($('input', this.$linkContainer).val(), l[1642]);
            });
        }

        togglePublicAccessUI() {
            this.$notification.addClass('hidden');

            if (this.publicAccess) {
                if (this.bucketAccess === 2) {
                    this.$notification.safeHTML(l.s4_obj_access_denied_tip).removeClass('hidden');
                    this.$fileInfoContainer.addClass('inactive');
                }
                else {
                    this.$fileInfoContainer.removeClass('inactive');
                }
                this.$switch.removeClass('toggle-off').addClass('toggle-on');
            }
            else {
                if (this.bucketAccess === 1) {
                    this.$notification.safeHTML(l.s4_obj_access_granted_tip).removeClass('hidden');
                    this.$fileInfoContainer.removeClass('inactive');
                }
                else {
                    this.$fileInfoContainer.addClass('inactive');
                }
                this.$switch.addClass('toggle-off').removeClass('toggle-on');
            }
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'access', () => new S4AccessDialog('object-access'));

    return freeze({dialogs, S4AccessDialog});
});
