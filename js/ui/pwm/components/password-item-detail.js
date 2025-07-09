class MegaPasswordItemDetail {
    constructor() {
        this.domNode = document.createElement('div');
        this.domNode.classList.add('detail-panel', 'hidden');
        this.initHeader();
        this.initFormFields();
    }

    initHeader() {
        const navHeader = document.createElement('div');
        navHeader.classList.add('nav-header');

        const backBtn = new MegaInteractable({
            parentNode: navHeader,
            type: 'icon',
            icon: 'sprite-pm-mono icon-arrow-left-regular-solid'
        });

        backBtn.on('click', () => this.domNode.classList.remove('active'));

        this.domNode.append(navHeader);

        const subHeader = document.createElement('div');
        subHeader.classList.add('sub-header');
        this.subHeaderTitle = document.createElement('h1');
        this.subHeaderIcon = document.createElement('div');

        this.nameSubHeader = document.createElement('div');
        this.nameSubHeader.className = 'name-sub-header';

        this.nameSubHeader.append(this.subHeaderIcon, this.subHeaderTitle);
        subHeader.append(this.nameSubHeader);

        const contextMenuBtn = new MegaInteractable({
            parentNode: subHeader,
            type: 'icon',
            icon: 'sprite-pm-mono icon-more-horizontal-regular-outline'
        });

        contextMenuBtn.on('click', event => {
            if (contextMenuBtn.toggleClass('active')) {
                mega.ui.pm.contextMenu.show({
                    name: 'item-detail-menu',
                    handle: this.item.h,
                    event,
                    eventTarget: contextMenuBtn
                });
            }
            else {
                mega.ui.pm.menu.hide();
            }
        });

        mega.ui.pm.menu.on('close.menu', () => contextMenuBtn.domNode.classList.remove('active'));

        this.domNode.append(subHeader);
    }

    initFormFields() {
        const detailForm = document.createElement('div');
        detailForm.classList.add('detail-form');

        this.domNode.append(detailForm);

        this.usernameField = this.createField({
            parentNode: detailForm,
            id: 'username',
            grouped: true,
            label: l.username_label,
            copyLabel: l.username_copied,
            copyHint: l.copy_username,
            eventId: 500546
        });

        this.passwordField = this.createField({
            parentNode: detailForm,
            id: 'password',
            grouped: true,
            label: l[909],
            copyLabel: l[19602],
            copyHint: l[19601],
            eventId: 500548,
            isPassword: true,
            showLabel: l.show_password,
            hideLabel: l.hide_password
        });

        this.otpField = this.createField({
            parentNode: detailForm,
            id: 'otp',
            label: l.otp_info_title,
            copyLabel: l.otp_copied,
            copyHint: l.copy_otp
        });

        this.websiteField = this.createField({
            parentNode: detailForm,
            id: 'website',
            label: l.website_label,
            copyLabel: l.website_copied,
            copyHint: l.copy_website,
            isLink: true
        });

        this.websiteField.on('click', () => {
            eventlog(500549);
        });

        this.cardholderNameField = this.createField({
            parentNode: detailForm,
            id: 'cardholder-name',
            grouped: true,
            label: l.cardholder_name_label,
            copyLabel: l.cardholder_name_copied,
            copyHint: l.copy_cardholder_name,
            eventId: 500845
        });

        this.cardNumberField = this.createField({
            parentNode: detailForm,
            id: 'card-number',
            grouped: true,
            label: l.card_number_label,
            copyLabel: l.card_number_copied,
            copyHint: l.copy_card_number,
            eventId: 500846,
            isCard: true,
            showLabel: l.show_card_number,
            hideLabel: l.hide_card_number
        });

        this.cardExpiryField = this.createField({
            parentNode: detailForm,
            id: 'card-expiry',
            grouped: true,
            label: l.exp_date_label,
            copyLabel: l.exp_date_copied,
            copyHint: l.copy_exp_date,
            eventId: 500847,
            help: {
                text: l.card_expired_warning,
                className: 'warning',
                iconClass: 'sprite-pm-mono icon-alert-triangle-thin-outline'
            }
        });

        this.cardCvvField = this.createField({
            parentNode: detailForm,
            id: 'card-cvv',
            label: l.security_code_label,
            copyLabel: l.security_code_copied,
            copyHint: l.copy_security_code,
            eventId: 500848,
            isCvv: true,
            showLabel: l.show_security_code,
            hideLabel: l.hide_security_code
        });

        this.notesField = this.createField({
            parentNode: detailForm,
            id: 'notes',
            label: l.notes_label,
            copyLabel: l.notes_copied,
            copyHint: l.copy_notes,
            eventId: 500550
        });

        this.dateAdded = document.createElement('p');
        this.dateAdded.className = 'text-detail';

        detailForm.append(this.dateAdded);
    }

    hideFieldsByType(type) {
        if (type === 'c') {
            this.usernameField.addClass('hidden');
            this.passwordField.addClass('hidden');
            this.otpField.addClass('hidden');
            this.websiteField.addClass('hidden');
        }
        else {
            this.cardholderNameField.addClass('hidden');
            this.cardNumberField.addClass('hidden');
            this.cardExpiryField.addClass('hidden');
            this.cardCvvField.addClass('hidden');
        }
    }

    /**
     * Populate the detail panel form with the selected password item.
     *
     * @param {string} pH password Handle
     * @param {*} [noShow] no...show?
     * @returns {Promise<*>}
     */
    async showDetail(pH, noShow = false) {
        this.item = M.getNodeByHandle(pH) ||
            mega.ui.pm.list.vaultPasswords.find(node => node.h === pH);

        if (!this.item) {
            return;
        }

        let {name} = this.item;
        const pwm = this.item.pwm || {};

        this.hideFieldsByType(pwm.t);

        if (pwm.t === 'c') {
            this.renderCreditCardDetail(pwm);
        }
        else {
            await this.renderPasswordDetail(pwm);
        }

        this.subHeaderTitle.textContent = name || this.url;
        this.subHeaderTitle.classList.add('simpletip');
        this.subHeaderTitle.dataset.simpletip = name || this.url;
        this.subHeaderTitle.dataset.simpletipposition = 'top';
        this.subHeaderTitle.dataset.simpletipoffset = '2';

        const outer = document.createElement('div');
        outer.className = 'favicon';
        const span = document.createElement('span');
        outer.append(span);

        if (pwm.t === 'c') {
            mega.ui.pm.utils.generateCardFavicon(pwm.nu, outer);
        }
        else {
            mega.ui.pm.utils.generateFavicon(name, this.url, outer);
        }

        // const newFavicon = mega.ui.pm.utils.generateFavicon(name, this.url);
        this.nameSubHeader.replaceChild(outer, this.subHeaderIcon);
        this.subHeaderIcon = outer;

        this.dateAdded.textContent = '';
        this.dateAdded.append(parseHTML(l.date_added.replace('%1', time2date(this.item.ts))));

        this.domNode.classList.remove('hidden');

        if (!noShow) {
            this.domNode.classList.add('active');
        }

        onIdle(() => {
            if (this.domNode.Ps) {
                this.domNode.Ps.update();
            }
            else {
                this.domNode.Ps = new PerfectScrollbar(this.domNode);
            }
        });
    }

    async renderPasswordDetail({u, pwd, n, url, totp: otpData}) {
        this.url = url;
        let otp = null;

        if (otpData) {
            otp = await this.generateOtpValue(otpData).catch(dump);

            // convert to seconds since Unix epoch
            const epochSeconds = Math.floor(Date.now() / 1000);
            // calculate seconds that has passed in the current t sec window
            const delaySeconds = epochSeconds % otpData.t;

            if (this.otpField.radial) {
                this.otpField.radial.destroy();
            }

            this.otpField.radial = new MegaTimerRadialComponent({
                parentNode: mega.ui.pm.list.passwordItem.otpField.output.querySelector('.read-only-actions'),
                timerDuration: otpData.t,
                animationDelay: delaySeconds,
                prepend: true
            });

            const _onCycleComplete = () => {
                const {totp: otpData} = this.item.pwm;
                if (otpData) {
                    this.generateOtpValue(otpData)
                        .then((otp) => {
                            this.otpField.inputValue = otp;
                        })
                        .catch(dump);
                }
            };

            // remaining seconds
            const wait = otpData.t - delaySeconds;

            tSleep(wait).then(() => {
                this.otpField.radial.startCycleTimer(_onCycleComplete);
                _onCycleComplete();
            });

            this.otpField.radial.show();
        }

        this.usernameField.inputValue = u;
        this.passwordField.inputValue = pwd;
        this.websiteField.inputValue = url;
        this.notesField.inputValue = n;
        this.otpField.inputValue = otp || '';

        this.otpField.toggleClass('hidden', !otp);
        this.passwordField.toggleClass('hidden', !pwd);
        this.passwordField.toggleClass('grouped', !!otp);
        this.usernameField.toggleClass('hidden', !u);
        this.websiteField.toggleClass('hidden', !url);
        this.notesField.toggleClass('hidden', !n);

        this.passwordField.visible = false;
        this.passwordField.setActions(this.passwordField.actions);
    }

    renderCreditCardDetail({u, nu, exp, cvv, n}) {
        this.url = '';
        this.cardholderNameField.inputValue = u;
        this.cardNumberField.inputValue = nu;
        this.cardExpiryField.inputValue = exp;
        this.cardCvvField.inputValue = cvv;
        this.notesField.inputValue = n;

        this.cardholderNameField.toggleClass('hidden', !u);
        this.cardNumberField.toggleClass('hidden', !nu);
        this.cardNumberField.toggleClass('grouped', !!exp || !!cvv);
        this.cardExpiryField.toggleClass('hidden', !exp);
        this.cardExpiryField.toggleClass('grouped', !!cvv);
        this.cardCvvField.toggleClass('hidden', !cvv);
        this.notesField.toggleClass('hidden', !n);

        this.cardNumberField.visible = false;
        this.cardNumberField.setActions(this.cardNumberField.actions);
        this.cardCvvField.visible = false;
        this.cardCvvField.setActions(this.cardCvvField.actions);
    }


    async generateOtpValue(otpData) {
        const otp = await mega.pm.otp.generateOtp(otpData);
        const len = otp.length;

        const isOdd = len % 2 !== 0;
        const count = Math.floor(len / 2) + Number(isOdd);

        return `${otp.slice(0, count)} ${otp.slice(count)}`;
    }

    createField(options = {}) {
        const {
            id,
            label,
            parentNode,
            grouped,
            copyLabel,
            copyHint,
            eventId,
            isPassword,
            isCard,
            isCvv,
            isLink,
            help,
            showLabel,
            hideLabel
        } = options;

        const actions = [];

        const handleCopy = function() {
            let value = this.inputValue;
            if (['otp', 'card-number', 'card-expiry', 'card-cvv'].includes(id)) {
                value = value.replace(/\s+/g, '');
            }
            mega.ui.pm.utils.copyPMToClipboard(value, copyLabel);
            if (eventId) {
                eventlog(eventId);
            }
            return false;
        };

        // Add eye toggle action if applicable
        if (showLabel && hideLabel) {
            actions.push({
                icon: 'sprite-pm-mono icon-eye-thin-outline',
                onClick(e) {
                    this.visible = !this.visible;
                    const { domNode } = e.currentTarget;
                    e.currentTarget.icon = this.visible
                        ? 'sprite-pm-mono icon-eye-off-thin-outline simpletip'
                        : 'sprite-pm-mono icon-eye-thin-outline simpletip';
                    domNode.dataset.simpletip = this.visible ? hideLabel : showLabel;
                    $(domNode).trigger('simpletipUpdated');
                    if (eventId) {
                        eventlog(eventId);
                    }
                    return false;
                },
                hint: showLabel
            });
        }

        // Add copy action
        actions.push({
            icon: 'sprite-pm-mono icon-copy-thin-outline',
            onClick: handleCopy,
            hint: copyHint
        });

        // Create field
        return new MegaReadOnlyField({
            parentNode,
            id,
            label,
            grouped,
            isPassword,
            isCard,
            isCvv,
            isLink,
            help,
            actions,
            ...(isLink ? {} : {onClick: handleCopy})
        });
    }
}
