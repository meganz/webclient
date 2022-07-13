/**
     * Report Abuse
     * Report Abuse Module includes initialisation, individual sections.
     *
     *
     * Sections
     * DEFAULT- Abuse Types selector Section
     * A- Child Sexual Abuse Material
     * B- Revenge porn, Stolen intimate adult photos, Upskirt adult photos
     *      R- Revenge porn
     *      S- Stolen intimate adult photos
     *      U- Upskirt adult photos
     * C- Murder, Rape, Gore, Bestiality, Animal killing
     * D- Violent extremism, Terrorism
     * E- Virus, Malware, Fraud, Hacked data, Game hacks
     * F- Copyright, Intellectual Property
     *      CR- Copyright
     *      IP- Intellectual Property
     * G- Racism, Hate
     * H- Others
**/

const reportAbuseMap = {
    'A': {
        title: 'ra_type_a',
        type: 'Child Sexual Abuse Material',
        key: 'A',
        containerId: '#abuseA',
        isForm: true
    },
    'B': {
        title: 'ra_type_b',
        type: 'Revenge porn, Stolen intimate adult photos, Upskirt adult photos',
        key: 'B',
        containerId: '#abuseB',
        isForm: false
    },
    'C': {
        title: 'ra_type_c',
        type: 'Murder, Rape, Gore, Bestiality, Animal killing',
        key: 'C',
        containerId: '#abuseC',
        isForm: true
    },
    'D': {
        title: 'ra_type_d',
        type: 'Violent extremism, Terrorism',
        key: 'D',
        containerId: '#abuseD',
        isForm: true
    },
    'E': {
        title: 'ra_type_e',
        type: 'Virus, Malware, Fraud, Hacked data, Game hacks',
        key: 'E',
        containerId: '#abuseE',
        isForm: true
    },
    'F': {
        title: 'ra_type_f',
        type: 'Copyright, Intellectual Property',
        key: 'F',
        containerId: '#abuseF',
        isForm: false
    },
    'G': {
        title: 'ra_type_g',
        type: 'Racism, Hate',
        key: 'G',
        containerId: '#abuseG',
        isForm: true
    },
    'H': {
        title: 'ra_type_h',
        type: 'Other',
        key: 'H',
        containerId: '#abuseH',
        isForm: true
    },
    'R': {
        title: 'ra_type_r',
        type: 'Revenge porn',
        key: 'R',
        containerId: "#abuseRandS",
        isForm: false
    },
    'S': {
        title: 'ra_type_s',
        type: 'Stolen intimate adult photos',
        key: 'S',
        containerId: "#abuseRandS",
        isForm: false
    },
    'U': {
        title: 'ra_type_u',
        type: 'Upskirt adult photos',
        key: 'U',
        containerId: "#abuseU",
        isForm: true
    },
    'CR': {
        title: 'ra_type_copyright',
        type: 'Copyright',
        key: 'CR',
        containerId: "#abuseCR",
        isForm: false
    },
    'IP': {
        title: 'ra_type_intellectual',
        type: 'Intellectual Property',
        key: 'IP',
        containerId: "#abuseIP",
        isForm: false
    },
};
class ReportAbuse {

    /**
     * ReportAbuse
     * @constructor
     */
    constructor() {
        this.cacheDOMElements();
        this.init();
        this.abuse = {};
        this.steps = {current: 1, total: null, level: 1};
        this.sectionsteps = {current: 1, total: null};
        this.flowMap = ['DEFAULT'];
        this.selectedAbuseType = '';
    }

    cacheDOMElements() {
        this.$container = $('.mega-dialog.report-abuse');
        this.$step1 = $('.js-step1', this.$container);
        this.$step2 = $('.js-step2', this.$container);
        this.$step3 = $('.js-step3', this.$container);
        this.$subTitle = $('.js-subtitle', this.$container);
        this.$btnClose = $('.js-close', this.$container);
        this.$btnNext = $('button.next', this.$container);
        this.$btnBack = $('button.back', this.$container);
        this.$btnCancel = $('button.cancel', this.$container);
        this.$btnOk = $('button.ok', this.$container);
        this.$btnSubmit = $('button.submit', this.$container);
        this.$abuseTemplate = $('#abuseTemplate', this.$container);
        this.$abuseform = $('form', this.$container);
        this.$errormessage = $('.js-abuseerror', this.$container);

        this.$abuseform.rebind('submit', (e) => {
            e.preventDefault();
            return false;
        });
    }

    /**
     * Init Report Abuse Dialog
     */
    init() {
        this.$container.removeClass('hidden');
        fm_showoverlay();

        this.bindReportAbuseEvents();
        this.initAbuseTypesSection();
        onIdle(this.initReportAbuseScroll);
    }


    bindReportAbuseEvents() {
        this.$btnClose.add(this.$btnOk).add(this.$btnCancel).rebind('click.reportabuse', () => {
            this.resetAbuseReport();
            closeDialog();
        });
        this.$btnBack.rebind('click.reportabuse', () => {
            this.$errormessage.addClass('hidden');
            this.$btnSubmit.removeClass('disabled');
            const prev = this.currentStep - 1;
            this.goback(prev);
            this.setScrollPosition(true);
            this.initReportAbuseScroll();
        });
        this.$btnNext.rebind('click.reportabuse',() => {

            if (!this.selectedDataMap) {
                this.$errormessage.text(l.ra_msg_selectoption).removeClass('hidden');
                return false;
            }
            $('.js-abuseerror').addClass('hidden');

            switch (this.selectedDataMap.key) {
                case 'A':
                    this.initA();
                    break;
                case 'B':
                    this.initB();
                    break;
                case 'C':
                case 'D':
                case 'E':
                case 'G':
                    this.initC_D_E_G();
                    break;
                case 'F':
                    this.initF();
                    break;
                case 'H':
                    this.initH();
                    break;
                case 'R':
                case 'S':
                case 'CR':
                    this.initCR_R_S();
                    break;
                case 'IP':
                    this.initIP();
                    break;
                case 'U':
                    this.initU();
                    break;
            }
            this.setScrollPosition(true);
            this.initReportAbuseScroll();
        });
    }

    /**
     * DEFAULT- Abuse Types selector Section
     */
    initAbuseTypesSection() {

        this.currentStep = 1;

        $('footer button:not(.cancel)', this.$container).addClass('hidden');
        this.$btnNext.removeClass('hidden');

        mega.controls.radio.init(
            '.abusetype',
            $('.abusetype', this.$abuseTypesScreen).parent(),
            null,
            (val) => {
                this.selectedDataMap = reportAbuseMap[val];
            }
        );
    }

    /**
     * A- Child Sexual Abuse Material
     */
    initA() {
        this.loadView();

        this.selectedAbuseType = this.abuse.type;

        this.$btnSubmit.addClass('disabled');

        mega.controls.checkbox.init(
            '.js-abuse-a-check',
            this.$currentScreen,
            false,
            (val) => {
                if (val) {
                    this.$btnSubmit.removeClass('disabled');
                }
                else {
                    this.$btnSubmit.addClass('disabled');
                }
            }
        );

        this.bindSubmitButton();
    }

    /**
     * B- Revenge porn, Stolen intimate adult photos, Upskirt adult photos
     */
    initB() {
        this.loadView();

        mega.controls.radio.init(
            '.abuseBType',
            $('.abuseBType', this.$currentScreen).parent(),
            null,
            (val) => {
                this.selectedDataMap = reportAbuseMap[val];
            }
        );
    }

    /**
     * U- Upskirt adult photos
     */
    initU() {
        this.loadView();
        this.selectedAbuseType = this.abuse.type;
        this.bindSubmitButton();
    }

    /**
     * C- Murder, Rape, Gore, Bestiality, Animal killing
     * D- Violent extremism, Terrorism
     * E- Virus, Malware, Fraud, Hacked data, Game hacks
     * G- Racism, Hate
     */
    initC_D_E_G() {
        this.loadView();

        this.$btnSubmit.addClass('disabled');

        mega.controls.radio.init(
            '.abuseSubType',
            $('.abuseSubType', this.$currentScreen).parent(),
            null,
            (val) => {
                this.$btnSubmit.removeClass('disabled');
                this.selectedAbuseType = val;
            }
        );

        this.bindSubmitButton();
    }

    /**
     * F- Copyright, Intellectual Property
     */
    initF() {
        this.loadView();

        mega.controls.radio.init(
            '.abuseFType',
            $('.abuseFType', this.$currentScreen).parent(),
            null,
            (val) => {
                this.selectedDataMap = reportAbuseMap[val];
            }
        );
    }

    /**
     * H- Others
     */
    initH() {
        this.loadView();

        this.selectedAbuseType = this.abuse.type;

        const $publishedUser = $('.js-username', this.$abuseform);
        const $publishedWebsite = $('.js-website', this.$abuseform);
        const $abuseDesc = $('.js-desc', this.$abuseform);

        this.$btnSubmit.rebind('click.reportabuse', () => {

            const opts = {
                a: 'rab',
                t: this.selectedAbuseType,
                f: window.location.href,
                w: $publishedWebsite.val(),
                wu: $publishedUser.val(),
                d: this.formValidator($abuseDesc)
            };

            if (!opts.d) {
                this.$errormessage.text(l.ra_lbl_decribeabuse).removeClass('hidden');
                return false;
            }
            this.submitAbuseReport(opts);
        });
    }

    /**
     * CR- Copyright
     * R- Revenge porn
     * S- Stolen intimate adult photos
     */
    initCR_R_S() {

        this.loadView();
        this.selectedAbuseType = this.abuse.type;

        mega.controls.radio.init(
            '.contentowner',
            $('.contentowner', this.$currentScreen).parent(),
            null,
            (val) => {
                this.setContentOwner(val);
            }
        );

        this.bindSubmitButton();
    }

    setContentOwner(val) {
        this.abuse.isContentOwner = val === 'true';
        this.$errormessage.addClass('hidden');
        this.loadSubSection(this.abuse.isContentOwner);
    }

    loadSubSection(isContentOwner) {

        const $yesBlock = $('.js-yesblock', this.$currentScreen);
        const $noBlock = $('.js-noblock', this.$currentScreen);

        this.$btnNext.addClass('hidden');

        if (isContentOwner) {
            $yesBlock.removeClass('hidden');
            $noBlock.addClass('hidden');
            this.$btnSubmit.removeClass('hidden');
            this.$btnOk.addClass('hidden');
        }
        else {
            $yesBlock.addClass('hidden');
            $noBlock.removeClass('hidden');
            this.$btnOk.removeClass('hidden');
            this.$btnSubmit.addClass('hidden');
        }

        // Special: for Copyright Type on either case
        const isCopyright = this.abuse.key === 'CR';
        if (isCopyright) {
            this.$btnOk.removeClass('hidden');
            this.$btnSubmit.addClass('hidden');
        }

        this.initReportAbuseScroll();
    }

    /**
     * IP- Intellectual Property
     */
    initIP() {

        if (this.abuse.isContentOwner !== undefined) {
            this.abuse.subContainerLoaded = true;
            this.loadSubSection(this.abuse.isContentOwner);
            return false;
        }

        this.loadView();
        this.selectedAbuseType = this.abuse.type;

        const $publishedWebsite = $('.js-website', this.$abuseform);
        const $publishedUser = $('.js-username', this.$abuseform);
        const $descr = $('.js-desc', this.$abuseform);
        const $owner = $('.js-owner', this.$abuseform);
        const $email = $('.js-email', this.$abuseform);
        const $phone = $('.js-phone', this.$abuseform);
        const $address = $('.js-address', this.$abuseform);
        const $province = $('.js-province', this.$abuseform);
        const $postalcode = $('.js-postalcode', this.$abuseform);
        const $country = $('.js-countryselector', this.$abuseform);

        this.renderCountry();

        this.$btnSubmit.addClass('disabled');

        let abuseAware = false;
        let abuseBelieve = false;

        const opts = {
            a: 'rab',
            f: window.location.href
        };

        mega.controls.radio.init(
            '.contentowner',
            $('.contentowner', this.$currentScreen).parent(),
            null,
            (val) => {
                this.setContentOwner(val);
            }
        );

        mega.controls.checkbox.init(
            '.js-abuse-ip-aware',
            $('.js-abuse-ip-aware', this.$currentScreen).parent(),
            false,
            (val) => {
                abuseAware = val;
                if (abuseBelieve && abuseAware) {
                    this.$btnSubmit.removeClass('disabled');
                }
                else {
                    this.$btnSubmit.addClass('disabled');
                }
            }
        );

        mega.controls.checkbox.init(
            '.js-abuse-ip-believe',
            $('.js-abuse-ip-believe', this.$currentScreen).parent(),
            false,
            (val) => {
                abuseBelieve = val;
                if (abuseBelieve && abuseAware) {
                    this.$btnSubmit.removeClass('disabled');
                }
                else {
                    this.$btnSubmit.addClass('disabled');
                }
            }
        );

        $('.option', $country).rebind('click.reportabuse', () => {
            const $selectedcountry = $('#report-country .option[data-state="active"]',this.$currentScreen);
            opts.country = $selectedcountry.attr('data-value') || '';
        });

        this.$btnSubmit.rebind('click.reportabuse', () => {

            if (!(abuseBelieve && abuseAware)) {
                return false;
            }

            opts.t = this.selectedAbuseType;
            opts.w = this.formValidator($publishedWebsite);
            opts.wu = this.formValidator($publishedUser);
            opts.d = this.formValidator($descr);
            opts.owner = this.formValidator($owner);
            opts.email = this.formValidator($email);
            opts.phone = this.formValidator($phone);
            opts.address = this.formValidator($address);
            opts.province = this.formValidator($province);
            opts.postalcode = this.formValidator($postalcode);

            if (opts.country) {
                $country.removeClass('error');
            }
            else {
                $country.addClass('error');
            }

            const isValid = Object.values(opts).every(x => (x !== null && x !== '' && x !== undefined));

            if (!isValid) {
                this.$errormessage.text(l.ra_formvalidation).removeClass('hidden');
                this.setScrollPosition();
                return false;
            }

            if (!opts.country) {
                this.$errormessage.text(l[568]).removeClass('hidden');
                $country.addClass('error');
                this.setScrollPosition();
                return false;
            }

            if (!isValidEmail(opts.email)) {
                this.$errormessage.text(l[1100]).removeClass('hidden');
                $email.addClass('error');
                this.setScrollPosition();
                return false;
            }

            const validatedPhoneNumber = this.validatePhoneNo(opts.phone);
            if (!validatedPhoneNumber) {
                this.$errormessage.text(l.ra_phonevalidation).removeClass('hidden');
                $phone.addClass('error');
                this.setScrollPosition();
                return false;
            }

            // validate/clean phone number before reporting
            opts.phone = validatedPhoneNumber;
            this.submitAbuseReport(opts);

        });

    }

    formValidator($elem) {
        const val = $.trim($elem.val());
        if (val) {
            $elem.removeClass('error');
        }
        else {
            $elem.addClass('error');
        }
        return val;
    }

    loadView() {

        this.flowMap.push(this.selectedDataMap);
        const cloneDataMap = Object.assign({}, this.selectedDataMap);
        this.abuse = cloneDataMap;
        delete this.selectedDataMap;

        const next = this.currentStep + 1;

        const templateContent = $(this.abuse.containerId, this.$abuseTemplate.html()).html();
        $('.js-step' + next).empty().safeAppend(templateContent).removeClass('hidden');

        $('.js-step' + this.currentStep).addClass('hidden');
        this.$currentScreen = $('.js-step' + next);
        this.currentStep = next;

        if (this.currentStep > 1) {
            this.$btnBack.removeClass('hidden');
        }

        if (this.abuse.isForm) {
            this.$btnNext.addClass('hidden');
            this.$btnSubmit.removeClass('hidden');
        }

        this.$subTitle.text(l[this.abuse.title]);

    }

    goback(prev) {

        this.selectedDataMap = this.flowMap[this.flowMap.length - 1];
        this.flowMap.pop();
        this.abuse = this.flowMap[this.flowMap.length - 1];

        $('.js-step' + prev).removeClass('hidden');
        $('.js-step' + this.currentStep).empty().addClass('hidden');

        this.$btnNext.removeClass('hidden');
        this.$btnSubmit.addClass('hidden');
        this.$btnOk.addClass('hidden');
        this.currentStep = prev;

        if (prev === 1) {
            this.$btnBack.addClass('hidden');
            this.$subTitle.text('');
        }
        else {
            this.$subTitle.text(l[this.abuse.title]);
        }

    }

    bindSubmitButton() {
        const $publishedWebsite = $('.js-website', this.$abuseform);
        const $publishedUser = $('.js-username', this.$abuseform);

        this.$btnSubmit.rebind('click.reportabuse', () => {
            if (this.$btnSubmit.hasClass('disabled')) {
                return false;
            }

            const opts = {
                a: 'rab',
                t: this.selectedAbuseType,
                f: window.location.href,
                w: $publishedWebsite.val(),
                wu: $publishedUser.val(),
            };

            this.submitAbuseReport(opts);
        });

    }

    submitAbuseReport(opts) {
        loadingDialog.show();
        this.$btnSubmit.addClass('disabled');
        api_req(opts, {
            callback: (response) => {
                loadingDialog.hide();
                this.$btnSubmit.removeClass('disabled');
                if (response === -2) {

                    msgDialog(
                        'warningb',
                        l[16], // Internal error
                        l[7883] // There was an error trying to send your message. Please try to resend it.
                    );
                    return false;
                }

                this.resetAbuseReport();
                closeDialog();
                showToast('success', l.ra_msg_submitsuccess);
            }
        });
    }

    validatePhoneNo(inputtxt) {
        return M.validatePhoneNumber(inputtxt);
    }

    resetAbuseReport() {
        this.$subTitle.text('');
        this.$step1.removeClass('hidden');
        this.$step2.addClass('hidden');
        this.$step3.addClass('hidden');
        this.$errormessage.addClass('hidden');
        delete window.disableVideoKeyboardHandler;
    }

    renderCountry() {

        let html = '';
        let sel = '';
        const $country = $('#report-country', this.$abuseform);
        $('span', $country).text(l[996]);
        const countries = M.getCountries();
        for (const country in countries) {
            if (!countries.hasOwnProperty(country)) {
                continue;
            }
            sel = '';
            html += '<div class="option" data-value="' + country
                +   '" data-state="' + sel + '">' + countries[country]
                +  '</div>';
        }
        $('.dropdown-scroll', $country).safeHTML(html);

        // Bind Dropdowns events
        bindDropdownEvents($country, 1);
    }

    initReportAbuseScroll() {
        const scrollBlock = document.getElementsByClassName('js-reportabuse-scroll-panel').item(0);
        if (scrollBlock) {
            if (scrollBlock.classList.contains('ps')) {
                Ps.update(scrollBlock);
            }
            else {
                Ps.initialize(scrollBlock);
            }
        }
    }

    setScrollPosition(isTop) {
        const element = document.getElementsByClassName('js-reportabuse-scroll-panel').item(0);
        element.scrollTop = isTop ? 0 : element.scrollHeight - element.clientHeight;
    }
}

mega.controls = {

    checkbox: {
        init: function(identifier, $container, currentValue, onChangeCb) {

            'use strict';
            const $checkbox = $(identifier, $container);
            const $labels = $('.checkbox-txt', $container);

            if (String(currentValue)) {
                this.set(identifier, $container, currentValue);
            }

            $('input', $checkbox).rebind('click.checkbox', function() {

                const newVal = this.checked;
                mega.controls.checkbox.set(identifier, $container, newVal, onChangeCb);
            });

            $labels.rebind('click.checkbox', function() {
                $('input', $(this).prev(identifier)).trigger('click');
            });
        },

        set: function(identifier, $container, newVal, onChangeCb) {

            'use strict';

            const $input = $(identifier, $container);

            if (newVal) {
                $input.removeClass('checkboxOff').addClass('checkboxOn').prop('checked', true);
            }
            else {
                $input.removeClass('checkboxOn').addClass('checkboxOff').prop('checked', false);
            }

            if (typeof onChangeCb === 'function') {
                onChangeCb(newVal);
            }
        },
    },

    radio: {

        init: function(identifier, $container, currentValue, onChangeCb) {

            'use strict';

            const $radio = $(identifier, $container);
            const $labels = $('.radio-txt', $container);

            if (String(currentValue)) {
                this.set(identifier, $container, currentValue);
            }

            $('input', $radio).rebind('click.radio', function() {

                const newVal = $(this).val();
                mega.controls.radio.set(identifier, $container, newVal, onChangeCb);
            });

            $labels.rebind('click.radioLabel', function() {
                $('input', $(this).prev(identifier)).trigger('click');
            });
        },

        set: function(identifier, $container, newVal, onChangeCb) {

            'use strict';

            const $input = $('input' + identifier + '[value="' + newVal + '"]', $container);

            if ($input.is('.disabled')) {
                return;
            }

            $(identifier + '.radioOn', $container).addClass('radioOff').removeClass('radioOn');
            $input.removeClass('radioOff').addClass('radioOn').prop('checked', true);
            $input.parent().addClass('radioOn').removeClass('radioOff');

            if (typeof onChangeCb === 'function') {
                onChangeCb(newVal);
            }
        },

        disable: function(value, $container) {

            'use strict';

            $('input.[value="' + value + '"]', $container).addClass('disabled').prop('disabled', true);
        },

        enable: function(value, $container) {

            'use strict';

            $('input.[value="' + value + '"]', $container).removeClass('disabled').prop('disabled', false);
        },
    },

    switch: {

        init: function(identifier, $container, currentValue, onChangeCb, onClickCb) {

            'use strict';

            const $switch = $(identifier, $container);

            if ((currentValue && !$switch.hasClass('toggle-on'))
                || (!currentValue && $switch.hasClass('toggle-on'))) {
                this.toggle(identifier, $container);
            }

            Soon(() => {
                $('.no-trans-init', $switch).removeClass('no-trans-init');
            });

            $switch.rebind('click.switch', () => {

                const val = $switch.hasClass('toggle-on');

                if (typeof onClickCb === 'function') {
                    onClickCb(val).done(() => {
                        mega.controls.switch.toggle(identifier, $container, onChangeCb);
                    });
                }
                else {
                    mega.controls.switch.toggle(identifier, $container, onChangeCb);
                }
            });
        },

        toggle: function(identifier, $container, onChangeCb) {

            'use strict';

            const $switch = $(identifier, $container);
            let newVal;

            if ($switch.hasClass('toggle-on')) {
                $switch.removeClass('toggle-on');
                newVal = 0;
            }
            else {
                $switch.addClass('toggle-on');
                newVal = 1;
            }

            $switch.trigger('update.accessibility');

            if (typeof onChangeCb === 'function') {
                onChangeCb(newVal);
            }
        }
    }
};
