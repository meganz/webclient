pro.propay.billing = {

    // Cached information for the required fields for the gateway and country
    __lastUsedGateway: null,
    __lastUsedCountry: null,
    __lastRequiredFields: null,

    isBusinessUse: false,

    validatedTaxNumbers: {},

    lastValidatedTaxNumber: null,

    // Country+state pair that lastValidatedTaxNumber was validated under. Cleared when either
    // changes so the short-circuit can't reuse a stale verdict from a different jurisdiction.
    lastValidatedContextKey: null,

    tngrRes: null,

    billingSections: null,

    lastValidatedErrorFields: {},

    // Set to true when the user first clicks Continue to payment. Empty-required-field errors
    // are only surfaced after this flips - background revalidations (gateway switch etc.)
    // shouldn't flash "Enter your tax number" before the user has attempted to submit.
    hasAttemptedSubmit: false,

    updatedPayment: false,

    currentUtqa: false,

    TAX_CODE_FIELD: 'taxCode',

    // Server IP-derived country from wmip - matches what utqa infers when called without `cc`.
    defaultCountry: null,

    async fetchDefaultCountry() {
        'use strict';
        if (this.defaultCountry) {
            return;
        }
        const res = await api.req({a: 'wmip'}).catch(dump);
        this.defaultCountry = res && res.result && res.result.cc || null;
    },

    // Country to seed the propay/registerb page and address dialog with.
    // Always seeds from wmip so refresh / navigate-away+back resets to the IP-detected country
    // rather than remembering the user's prior selection; u_attr.country covers the wmip-fails case.
    async getInitialCountry() {
        'use strict';
        if (this.initialCountry !== undefined) {
            return this.initialCountry;
        }
        await this.fetchDefaultCountry();
        this.initialCountry = this.defaultCountry || (u_attr && u_attr.country) || '';
        return this.initialCountry;
    },

    // API gateway.fields keys -> local field names used for input ids and storage.
    apiFieldNames: {
        'address1': 'address1',
        'address2': 'address2',
        'bank': 'bank',
        'cconsent': 'cconsent',
        'city': 'city',
        'country': 'country',
        'cpf': 'cpf',
        'dob': 'dateOfBirth',
        'first_name': 'firstname',
        'last_name': 'lastname',
        'name': 'name',
        'phone': 'mobile',
        'state': 'state',
        'taxCode': 'taxCode',
        'zip_code': 'postcode',
    },

    availableFields: null,

    // Gateway ids that redirect off-site without a secondary stage.
    singleStagePaymentIds: new Set([4, 16, 11]),

    // Gateway ids whose tax number should be validated on tax-field blur
    blurValidateGatewayIds: new Set([0, 4, 11, 16]),

    // Gateways whose own dialog renders alongside the billing form (no continue-to-payment gate).
    concurrentBillingPayments: new Set(['voucher']),

    // Always-required fields for propay business use, regardless of what the gateway declares for b2b
    // (and shown even before a gateway is picked, so the user sees the full b2b form up-front).
    propayBusinessForced: ['companyName', 'address1', 'city', 'postcode', 'taxCode'],

    /**
     * Whether the current AstroPay flow is targeting India, which imposes India-specific
     * validation requirements (6-digit PIN code, 10-digit mobile number). Uses the
     * user-selected billing country, not u_attr.ipcc.
     * @param {object} [gateway] Gateway to check against (defaults to pro.propay.currentGateway)
     * @returns {boolean} true when AstroPay is the gateway and the billing country is India
     */
    isAstropayIndia(gateway) {
        'use strict';
        const gw = gateway || pro.propay.currentGateway;
        return this.country === 'IN' && gw && gw.gatewayId === pro.propay.ASTROPAY_GATE_ID;
    },

    /**
     * Build the utc `extra` payload from every field getRequiredFields declares (required +
     * optional) for the current billing type, keyed by API field name. Used as the baseline
     * for all gateways so each one gets the fields it declared via ufpqfull.
     * @returns {object} extra payload keyed by API field name
     */
    getExtraForApi() {
        'use strict';
        const info = this.getEnteredBillingInfo();
        const required = this.getRequiredFields();
        const billingType = this.getBillingType();
        const fields = new Set([
            ...required[`${billingType}Required`],
            ...required[`${billingType}Optional`],
        ]);
        const apiName = Object.create(null);
        for (const [api, local] of Object.entries(this.apiFieldNames)) {
            apiName[local] = api;
        }
        const extra = Object.create(null);
        for (const local of fields) {
            const key = apiName[local] || local;
            let value = info[local];
            // state is stored as `${country}-${state}` (e.g. "US-CA") - send just the state code.
            if (local === 'state' && typeof value === 'string') {
                value = value.split('-')[1] || value;
            }
            extra[key] = value || '';
        }
        return extra;
    },

    /**
     * Get the tax number for the API request, to ensure consistency in the request.
     * Use "" if no tax number should be used
     * @returns {string} - The tax number for the API request
     */
    getTaxNumberForApiReq() {
        'use strict';
        const billingType = this.getBillingType();
        const requiredFields = this.getRequiredFields();
        const hasTaxField = requiredFields[`${billingType}Required`].includes(this.TAX_CODE_FIELD)
            || requiredFields[`${billingType}Optional`].includes(this.TAX_CODE_FIELD);
        if (!hasTaxField || !this.lastValidatedTaxNumber) {
            return "";
        }
        // Singleton can outlive its country (cross-nav); treat as unvalidated if context changed.
        const currentContext = `${this.country}:${this.state || ''}`;
        if (this.lastValidatedContextKey && this.lastValidatedContextKey !== currentContext) {
            return "";
        }
        return this.lastValidatedTaxNumber;
    },

    /**
     * Strip and validate the state code for the given country. `this.state` is stored as
     * `${country}-${state}` on the client - the API wants just the state code, and only when
     * the country actually has states (otherwise a stale value from a prior country leaks in).
     * @param {string} [country] Country to validate against; defaults to `this.country`.
     * @returns {string|undefined} Validated two-letter state code, or `undefined`.
     */
    getStateForApiReq(country) {
        'use strict';
        country = country || this.country;
        const stripped = typeof this.state === 'string' && this.state.split('-')[1];
        const {countriesWithStates} = RegionsCollection;
        return stripped && countriesWithStates[country]
            && countriesWithStates[country].includes(stripped)
            ? stripped
            : undefined;
    },

    /**
     * Create a list of all available fields from the already existing object
     * @returns {void}
     */
    initAvailableFields() {
        'use strict';
        // companyName is propay-business-only and not gateway-mapped, so add it explicitly.
        this.availableFields = [...Object.values(this.apiFieldNames), 'companyName'];
    },

    /**
     * Cache the billing sections for easy access
     * @returns {void}
     */
    cacheBillingSections() {
        'use strict';
        if (this.billingSections) {
            return;
        }
        const $billingWrapper = $('.billing-wrapper', pro.propay.$page);
        this.$billingInfo = $billingWrapper;
        this.billingSections = {
            $country: $('.country-input-wrapper', $billingWrapper),
            $taxCode: $('.taxCode-input-wrapper', $billingWrapper),
            $dateOfBirth: $('.dateOfBirth-input-wrapper', $billingWrapper),
            $firstname: $('.firstname-input-wrapper', $billingWrapper),
            $lastname: $('.lastname-input-wrapper', $billingWrapper),
            $companyName: $('.companyName-input-wrapper', $billingWrapper),
            $address1: $('.address-input-wrapper', $billingWrapper),
            $city: $('.city-input-wrapper', $billingWrapper),
            $state: $('.state-input-wrapper', $billingWrapper),
            $postcode: $('.postcode-input-wrapper', $billingWrapper),
            $mobile: $('.mobile-input-wrapper', $billingWrapper),
        };
    },

    /**
     * Get the billing sections for easy access
     * @returns {object} - The billing sections
     */
    getBillingSections() {
        'use strict';
        if (!this.billingSections) {
            this.cacheBillingSections();
        }
        return this.billingSections;
    },

    /**
     * @returns {object|false} - The gateway driving the billing form, or false when none is selected
     */
    getActiveGateway() {
        'use strict';
        const gateway = pro.propay.onPropayPage()
            ? pro.propay.currentGateway
            : addressDialog.businessRegPage && addressDialog.businessRegPage.getSelectedGateway();
        return gateway || false;
    },

    /**
     * Get the required fields for the current gateway
     * @returns {object} - The required fields for current gateway, split into type and requirement
     */
    getRequiredFields() {
        'use strict';

        const currentGateway = this.getActiveGateway();

        const currentGatewayName = currentGateway && currentGateway.gatewayName || '';

        if (this.__lastRequiredFields
            && this.__lastUsedGateway === currentGatewayName
            && this.__lastUsedCountry === this.country) {

            return {...this.__lastRequiredFields};
        }

        const result = {
            personalRequired: ['country'],
            personalOptional: [],
            businessRequired: ['country', 'taxCode'],
            businessOptional: [],
            invoiceRequired: ['country'],
            invoiceOptional: [],
        };

        if (currentGateway) {
            const fields = {...currentGateway.fields};
            const countryStates = this.country && RegionsCollection.countriesWithStates[this.country];
            if (countryStates && countryStates.length) {
                // Gateway may omit `country` from its `fields` set; country is still required by
                // default (seeded into result.*Required above), so default-treat it as required
                // when sizing the state requirement.
                const {state = {}, country = {b2b: 2, b2c: 2, b2c_inv: 2}} = fields;
                // Replace (not mutate) so we don't bleed into the gateway's source object.
                fields.state = {
                    b2b: Math.max(state.b2b | 0, country.b2b | 0),
                    b2c: Math.max(state.b2c | 0, country.b2c | 0),
                    b2c_inv: Math.max(state.b2c_inv | 0, country.b2c_inv | 0),
                };

                if (this.country === 'US') {
                    fields.zip_code = {
                        b2b: 2,
                        b2c: 2,
                        b2c_inv: 2,
                    };
                }
            }
            else {
                // Country has no states (or no country yet) - drop any gateway-declared
                // state requirement so the disabled dropdown doesn't render or validate.
                delete fields.state;
            }

            // AstroPay requires a postcode AND a phone number for transactions in India.
            if (this.isAstropayIndia(currentGateway)) {
                fields.zip_code = {
                    b2b: 2,
                    b2c: 2,
                    b2c_inv: 2,
                };
                fields.phone = {
                    b2b: 2,
                    b2c: 2,
                    b2c_inv: 2,
                };
            }

            for (const [field, fieldInfo] of Object.entries(fields)) {
                const clientName = this.apiFieldNames[field];

                if (fieldInfo.b2b) {
                    (fieldInfo.b2b === 2 ? result.businessRequired : result.businessOptional).push(clientName);
                }
                if (fieldInfo.b2c) {
                    (fieldInfo.b2c === 2 ? result.personalRequired : result.personalOptional).push(clientName);
                }
                if (fieldInfo.b2c_inv) {
                    (fieldInfo.b2c_inv === 2 ? result.invoiceRequired : result.invoiceOptional).push(clientName);
                }
            }
        }
        else {
            // No gateway selected yet, but still enforce the country-driven requirements:
            // state for countries with states, and postcode for the US.
            const countryStates = this.country && RegionsCollection.countriesWithStates[this.country];
            if (countryStates && countryStates.length) {
                const required = [this.apiFieldNames.state];
                if (this.country === 'US') {
                    required.push(this.apiFieldNames.zip_code);
                }
                result.businessRequired.push(...required);
                result.personalRequired.push(...required);
                result.invoiceRequired.push(...required);
            }
        }

        // Propay business use always collects full invoicing details (company name + address + tax),
        // regardless of which fields the gateway declares for b2b or whether one is picked yet.
        if (pro.propay.onPropayPage()) {
            for (const field of this.propayBusinessForced) {
                if (!result.businessRequired.includes(field)) {
                    result.businessRequired.push(field);
                }
            }
        }

        // Hungary collects invoice-level detail even for personal use.
        if (this.country === 'HU') {
            result.personalRequired.push(...result.invoiceRequired);
        }

        // Repay hides the taxcode input.
        if (page === 'repay') {
            for (const key of Object.keys(result)) {
                result[key] = result[key].filter(required => required !== 'taxCode');
            }
        }

        for (const key of Object.keys(result)) {
            result[key] = [...new Set(result[key])];
        }

        this.__lastUsedGateway = currentGatewayName;
        this.__lastUsedCountry = this.country;
        this.__lastRequiredFields = result;
        return {...result};
    },

    /**
     * Update the country and force a refresh of plans as info is country dependent
     * @returns {Promise<void>} resolves once plans and required-fields UI are refreshed
     */
    async updateCountry() {
        'use strict';

        if (this.lastUsedCountry === this.country) {
            return;
        }

        // Rejection (e.g. server -2 on a stale tn) mustn't escape as unhandled; page stays usable.
        await this.forceRefreshUtqa().catch(dump);
        this.updateRequiredFields();
        pro.propay.updateCountryMismatchWarning();
        pro.propay.updateContinueDisabled();
        this.lastUsedCountry = this.country;
    },

    /**
     * Initialize the country dropdowns, and synchronize the values between them
     * @returns {void}
     */
    initCountryDropdown() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        const $dropdowns = $('.propay-billing-country-dropdown', $billingWrapper);

        if (!$dropdowns.length) {
            return;
        }

        const countries = M.getCountries();
        const sortedOptions = Object.fromEntries(Object.entries(countries)
            .sort((a, b) => a[1].localeCompare(b[1])));
        const selected = this.initialCountry || '';
        this.lastSelectedCountry = selected;

        if (!selected) {
            $dropdowns.addClass('empty');
        }

        pro.propay.initSyncedDropdown({
            $dropdowns,
            items: sortedOptions,
            selected,
            placeholder: l.select_country,
            titleText: l.select_country,
            namespace: 'propayBillingCountry',
            onChange: (value) => {
                $dropdowns.removeClass('empty');
                pro.propay.billing.country = value;
                pro.propay.billing.initialCountry = value;
                pro.propay.billing.initStateDropdown();
                addressDialog.closeDialog();

                $('.tax-validation-popover').addClass('hidden');

                pro.propay.countryMismatchAttempted = false;
                pro.propay.updateCountryMismatchWarning();
                pro.propay.updateContinueDisabled();

                const id = makeUUID();
                if (pro.propay.pageInitialised) {
                    pro.propay.skItems.priceInfo.startLoad(id);
                    pro.propay.skItems.continueBtn.startLoad(id);
                }

                this.lastValidatedTaxNumber = null;
                const $taxInput = $(
                    '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
                    this.$billingInfo
                );
                const taxValue = String($taxInput.val() || '').trim();

                this.forceRefreshUtqa().then(() => {
                    pro.propay.billing.clearPaymentInfo();
                    if (pro.propay.pageInitialised) {
                        pro.propay.skItems.priceInfo.endLoad(id);
                        pro.propay.skItems.continueBtn.endLoad(id);
                    }
                    this.updateRequiredFields();
                    this.lastUsedCountry = this.country;
                    // Prior tax-status cue is stale for the new country.
                    this.clearTaxCodeStatus();
                    // Non-blur gateways (Stripe/directreseller/etc.) defer validation to Continue.
                    const gateway = pro.propay.currentGateway;
                    if (taxValue && gateway && this.blurValidateGatewayIds.has(gateway.gatewayId)) {
                        this.validateTaxNumber(taxValue);
                    }
                });
            },
        });

        pro.propay.billing.country = getDropdownValue($dropdowns.first());
        pro.propay.billing.initStateDropdown();
        this.updateCountry();
    },

    /**
     * Initialize the state dropdowns, and synchronize the values between them
     * @returns {void}
     */
    initStateDropdown() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        const $dropdowns = $('.propay-billing-state-dropdown', $billingWrapper);

        if (!$dropdowns.length) {
            return;
        }

        const {country} = pro.propay.billing;
        const allStates = M.getStates();
        const {countriesWithStates} = RegionsCollection;
        const isStateRegion = countriesWithStates[country] && countriesWithStates[country].length > 0;
        let items;
        let selected;
        let placeholder;

        if (isStateRegion) {
            const stateEntries = Object.entries(allStates)
                .filter((entry) => entry[0].substr(0, 2) === country)
                .sort((a, b) => a[1].localeCompare(b[1]));
            items = Object.fromEntries(stateEntries);
            const prev = this.billingInfo && this.billingInfo.state || this.state;

            selected = Object.prototype.hasOwnProperty.call(items, prev) ? prev : '';
            // Show the selected state's label when one is in scope, otherwise leave the dropdown
            // text blank so the placeholder doesn't read as a misleading hint when empty.
            placeholder = selected ? items[selected] : '';
        }
        else {
            items = {};
            selected = '';
            placeholder = '';
        }

        pro.propay.initSyncedDropdown({
            $dropdowns,
            items,
            selected: isStateRegion ? selected : '',
            placeholder,
            disabled: !isStateRegion,
            titleText: l.select_state,
            namespace: 'propayBillingState',
            onChange: (value) => {
                const newState = isStateRegion ? value : '';
                if (newState === pro.propay.billing.state) {
                    return;
                }
                pro.propay.billing.state = newState;
                // tnp verdict + utqa pricing are both state-scoped, so run the same payment-refresh
                // chain country change does: close any open dialog, show loading, drop the last
                // validated tax, re-validate if a value is entered, then forceRefreshUtqa ->
                // clearPaymentInfo + updateRequiredFields.
                addressDialog.closeDialog();
                const id = makeUUID();
                if (pro.propay.pageInitialised) {
                    pro.propay.skItems.priceInfo.startLoad(id);
                    pro.propay.skItems.continueBtn.startLoad(id);
                }
                this.lastValidatedTaxNumber = null;
                this.lastValidatedContextKey = null;
                pro.propay.billing.clearTaxCodeStatus();
                const $taxInput = $(
                    '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
                    this.$billingInfo
                );
                const taxValue = String($taxInput.val() || '').trim();
                if (taxValue) {
                    this.validateTaxNumber(taxValue);
                }
                this.forceRefreshUtqa().then(() => {
                    pro.propay.billing.clearPaymentInfo();
                    if (pro.propay.pageInitialised) {
                        pro.propay.skItems.priceInfo.endLoad(id);
                        pro.propay.skItems.continueBtn.endLoad(id);
                    }
                    this.updateRequiredFields();
                });
            },
        });

        pro.propay.billing.state = isStateRegion ? getDropdownValue($dropdowns.first()) : '';
    },

    /**
     * Initialize the checkbox for if the user requires a tax invoice
     * @returns {void}
     */
    initRequireInvoice() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        const $requireInvoice = $('div.require-invoice-wrapper', $billingWrapper);

        const $checkboxParts = $('.checkbox-item', $requireInvoice);

        const toggleCheckbox = (setActive) => {
            if (setActive) {
                $checkboxParts.addClass('checkboxOn');
                $checkboxParts.removeClass('checkboxOff');
            }
            else {
                $checkboxParts.removeClass('checkboxOn');
                $checkboxParts.addClass('checkboxOff');
            }
        };

        $requireInvoice.rebind('click.requireInvoice', (e) => {
            if ($(e.target).is('label')) {
                return;
            }

            this.requiresInvoice = !this.requiresInvoice;

            toggleCheckbox(this.requiresInvoice);

            if (this.canProceedToPayment) {
                this.resetAcceptedBillingInfo();
                pro.propay.updatePayment();
            }

            pro.propay.billing.updateRequiredFields();
        });

        toggleCheckbox(this.requiresInvoice);
    },

    /**
     * Wire the click handler for the Coinify-share-consent checkbox at the bottom of the form.
     * Mirrors {@link initRequireInvoice}: tracks the visual checkboxOn/Off classes and keeps the
     * native input's `.checked` state in sync so {@link getEnteredBillingInfo} can read it.
     * @returns {void}
     */
    initCconsent() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        const $cconsentWrapper = $('.cconsent-input-wrapper', $billingWrapper);
        if (!$cconsentWrapper.length) {
            return;
        }
        const $checkboxParts = $('.checkbox-item', $cconsentWrapper);
        const $checkbox = $('input[type="checkbox"]', $cconsentWrapper);

        $('.cconsent-label', $cconsentWrapper).safeHTML(l.coinify_share_consent);

        // Native input is source of truth; `change` syncs the visual classes.
        $checkbox.rebind('change.cconsent', () => {
            const checked = $checkbox.prop('checked');
            $checkboxParts.toggleClass('checkboxOn', checked).toggleClass('checkboxOff', !checked);

            if (this.canProceedToPayment) {
                this.resetAcceptedBillingInfo();
                pro.propay.updatePayment();
            }
        });

        $cconsentWrapper.rebind('click.cconsent', (e) => {
            const $target = $(e.target);
            if ($target.is('input[type="checkbox"]')
                || $target.is('label')
                || $target.closest('a').length) {
                return;
            }
            $checkbox.prop('checked', !$checkbox.prop('checked')).trigger('change');
        });
    },

    /**
     * Get the billing type based on the business use and invoice requirement
     * @returns {string} - The billing type
     */
    // Pro Flexi always invoices - the checkbox is hidden and the invoice-required field set applies.
    isProFlexi() {
        'use strict';
        if (pro.propay.onPropayPage()) {
            return pro.propay.planNum === pro.ACCOUNT_LEVEL_PRO_FLEXI;
        }
        return page === 'repay' && !!(u_attr && u_attr.pf);
    },

    getBillingType() {
        'use strict';
        if (this.isBusinessUse) {
            return 'business';
        }
        // Business register and Pro Flexi always issue an invoice regardless of the checkbox.
        if (this.requiresInvoice
            || this.isProFlexi()
            || (!pro.propay.onPropayPage() && page === 'registerb')) {
            return 'invoice';
        }
        return 'personal';
    },

    /**
     * Only astropay sends one today, but any gateway may, so the API can rename without a release.
     * @returns {string} - The gateway's own tax document name, or '' when it did not send one
     */
    getGatewayTaxIdLabel() {
        'use strict';
        const gateway = this.getActiveGateway();
        const label = gateway && gateway.extra && gateway.extra.taxIdLabel;
        return typeof label === 'string' ? label.trim() : '';
    },

    /**
     * @param {string} [country] - Billing country; defaults to the selected one
     * @returns {string} - Label for the tax number field, most specific source first
     */
    getTaxFieldLabel(country) {
        'use strict';
        country = country || this.country;
        return this.getGatewayTaxIdLabel() || this.getTngrTaxName(country) || getTaxName(country);
    },

    /**
     * Alias the gateway's `cpf` requirement onto `taxCode` so the UI shows a single field.
     * Used by astropay - `cpf` and `taxCode` carry the same value and are submitted as both
     * (see {@link getEnteredBillingInfo}). Mutates `requiredFields` in place; must run before the
     * field-rendering loops in {@link updateRequiredFields}.
     * @param {object} requiredFields - The required fields for the current gateway
     * @returns {void}
     */
    handleCpfField(requiredFields) {
        'use strict';

        const groups = [
            ['personalRequired', 'personalOptional'],
            ['invoiceRequired', 'invoiceOptional'],
            ['businessRequired', 'businessOptional'],
        ];

        for (const [requiredKey, optionalKey] of groups) {
            const required = requiredFields[requiredKey];
            const optional = requiredFields[optionalKey];

            const cpfReqIdx = required.indexOf('cpf');
            if (cpfReqIdx !== -1) {
                required.splice(cpfReqIdx, 1);
                if (!required.includes(this.TAX_CODE_FIELD)) {
                    required.push(this.TAX_CODE_FIELD);
                }
            }

            const cpfOptIdx = optional.indexOf('cpf');
            if (cpfOptIdx !== -1) {
                optional.splice(cpfOptIdx, 1);
                if (!required.includes(this.TAX_CODE_FIELD) && !optional.includes(this.TAX_CODE_FIELD)) {
                    optional.push(this.TAX_CODE_FIELD);
                }
            }
        }
    },

    /**
     * Alias the gateway's `name` requirement onto `firstname` + `lastname`. The UI has no single
     * name input, so a `name` requirement promotes both name parts to the matching tier (required
     * or optional) and the submitted value is the two joined with a space (see
     * {@link getEnteredBillingInfo}). Mutates `requiredFields` in place; must run before the
     * field-rendering loops in {@link updateRequiredFields}.
     * @param {object} requiredFields - The required fields for the current gateway
     * @returns {void}
     */
    handleNameField(requiredFields) {
        'use strict';

        const groups = [
            ['personalRequired', 'personalOptional'],
            ['invoiceRequired', 'invoiceOptional'],
            ['businessRequired', 'businessOptional'],
        ];
        const parts = ['firstname', 'lastname'];

        for (const [requiredKey, optionalKey] of groups) {
            const required = requiredFields[requiredKey];
            const optional = requiredFields[optionalKey];

            const nameReqIdx = required.indexOf('name');
            if (nameReqIdx !== -1) {
                required.splice(nameReqIdx, 1);
                for (const part of parts) {
                    const optIdx = optional.indexOf(part);
                    if (optIdx !== -1) {
                        optional.splice(optIdx, 1);
                    }
                    if (!required.includes(part)) {
                        required.push(part);
                    }
                }
            }

            const nameOptIdx = optional.indexOf('name');
            if (nameOptIdx !== -1) {
                optional.splice(nameOptIdx, 1);
                for (const part of parts) {
                    if (!required.includes(part) && !optional.includes(part)) {
                        optional.push(part);
                    }
                }
            }
        }
    },

    /**
     * Sets up the required fields based on billing type
     * If personal use, show required fields
     * If personal use with invoice, show required fields and invoice fields
     * If business use, use the invoice fields as there is no separation of required and invoice only
     * @returns {void}
     */
    updateRequiredFields() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        const type = this.getBillingType();
        const requiredFields = this.getRequiredFields();

        // Tax row's .error is owned by renderTaxCodeStatus; excluded so an in-flight paint survives.
        const $taxRow = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            $billingWrapper
        ).closest('.billing-input');
        $('.billing-input.error', $billingWrapper).not($taxRow).removeClass('error');
        // Restore the state field's default error text (setStateRequiredForTax may have swapped it).
        this.setStateRequiredForTax(false);

        this.handleCpfField(requiredFields);
        this.handleNameField(requiredFields);

        const personalFields = [...requiredFields.personalRequired, ...requiredFields.personalOptional];
        const invoiceFields = [...requiredFields.invoiceRequired, ...requiredFields.invoiceOptional];
        const businessFields = [...requiredFields.businessRequired, ...requiredFields.businessOptional];

        const billingInputSelectorStr = '.billing-input';

        const $section = $('.billing-section', pro.propay.$page).removeClass('hidden');
        const $fields = $(billingInputSelectorStr, $billingWrapper).addClass('hidden');
        const $checkbox = $('.require-invoice-wrapper', $billingWrapper).addClass('hidden');
        const $requireInvoiceNote = $('.require-invoice-note', $billingWrapper).addClass('hidden');

        const showCconsent = requiredFields[`${type}Required`].includes('cconsent')
            || requiredFields[`${type}Optional`].includes('cconsent');
        $('.cconsent-input-wrapper', $billingWrapper).toggleClass('hidden', !showCconsent);

        const setLabelForField = ($wrapper, field, isOptional) => {
            // The cconsent label is rendered with safeHTML by initCconsent because it contains
            // the Coinify Travel Rule anchor; re-setting it here with .text() escapes the markup.
            if (field === 'cconsent') {
                return;
            }
            const optional = isOptional && field !== 'state';
            const $label = $('label', $wrapper);
            $label.toggleClass('optional', optional);
            // taxCode has no static label to append the shared optional suffix to.
            let text;
            if (field === this.TAX_CODE_FIELD) {
                text = this.getTaxFieldLabel();
                if (optional && text) {
                    text = `${text} ${l[7347]}`;
                }
            }
            else if (optional) {
                text = this.stringFieldNames[`${field}-opt`] || this.stringFieldNames[field];
            }
            else {
                text = this.stringFieldNames[field];
            }
            if (text) {
                $label.text(text);
            }
        };

        const isBusiness = type === 'business';

        // Optional fields that are only shown when the user already has a saved value (or a
        // gateway/country forces them required). Address 2 clutters the form for first-time users
        // even though prior records may carry one - keep it visible only for carry-over data.
        const optionalCarryover = new Set(['address2']);
        const carryoverHasValue = (field) => {
            const saved = this.billingInfo && this.billingInfo[field];
            if (saved && typeof saved === 'string') {
                const decoded = this.billingInfo.version
                    ? tryCatch(() => from8(saved), () => saved)() || saved
                    : saved;
                if (String(decoded).trim()) {
                    return true;
                }
            }
            const $existing = $(`#propay-billing-${field}-inv, #propay-billing-${field}-req`, $billingWrapper);
            return !!$existing.length && !!String($existing.val() || '').trim();
        };
        const shouldSkipOptional = (field, requiredList) => optionalCarryover.has(field)
            && !requiredList.includes(field)
            && !carryoverHasValue(field);

        // city-postcode collapses to w-half when one child is visible so postcode can pair with state.
        const updatePairWrappers = () => {
            for (const el of $('.field-pair', $billingWrapper)) {
                const $pair = $(el);
                const visible = $pair.children('.billing-input').not('.hidden').length;
                const collapseToHalf = visible === 1 && $pair.hasClass('city-postcode-pair');
                $pair.toggleClass('hidden', visible === 0)
                    .toggleClass('w-half', collapseToHalf)
                    .toggleClass('w-full', visible > 0 && !collapseToHalf);
            }
        };

        if (!isBusiness) {
            if (!businessFields.length) {
                $section.addClass('hidden');
                return;
            }
            // Personal -req block also hosts the shared fields when invoice mode is on; label using
            // the active type's optional set so a field that's optional for personal but required
            // for invoice doesn't keep its "(Optional)" suffix once invoice is ticked.
            const activeOptional = requiredFields[`${type}Optional`];
            const activeRequired = requiredFields[`${type}Required`];
            for (const field of personalFields) {
                if (shouldSkipOptional(field, activeRequired)) {
                    continue;
                }
                const $fieldWrapper = $(`#propay-billing-${field}-req`, $fields)
                    .closest(billingInputSelectorStr).removeClass('hidden');
                const isOptional = activeOptional.includes(field);
                setLabelForField($fieldWrapper, field, isOptional);
            }
        }

        if (type === 'invoice') {
            if (!invoiceFields.length) {
                $section.addClass('hidden');
                return;
            }
            for (const field of invoiceFields) {
                if (!personalFields.includes(field)) {
                    if (shouldSkipOptional(field, requiredFields.invoiceRequired)) {
                        continue;
                    }
                    const $fieldWrapper = $(`#propay-billing-${field}-inv`, $fields)
                        .closest(billingInputSelectorStr).removeClass('hidden');
                    const isOptional = requiredFields.invoiceOptional.includes(field);
                    setLabelForField($fieldWrapper, field, isOptional);
                }
            }
        }
        else if (isBusiness) {
            if (!businessFields.length) {
                $section.addClass('hidden');
                return;
            }
            for (const field of businessFields) {
                if (shouldSkipOptional(field, requiredFields.businessRequired)) {
                    continue;
                }
                const $fieldWrapper = $(`#propay-billing-${field}-inv`, $fields)
                    .closest(billingInputSelectorStr).removeClass('hidden');
                const isOptional = requiredFields.businessOptional.includes(field);
                setLabelForField($fieldWrapper, field, isOptional);
            }
            updatePairWrappers();
            return;
        }

        updatePairWrappers();
        // Pro Flexi always invoices - keep the checkbox and its note hidden.
        if (!this.isProFlexi()) {
            $checkbox.removeClass('hidden');
            $requireInvoiceNote.removeClass('hidden');
        }
    },

    /**
     * Get the entered billing info from the inputs
     * @returns {object} - The entered billing info
     */
    getEnteredBillingInfo() {
        'use strict';

        const billingInfo = {};
        const dropdowns = new Set(['country', 'state']);
        // Skip fields outside the active billing-type set - hidden inputs retain stale values.
        const type = this.getBillingType();
        const requiredFields = this.getRequiredFields();
        const activeFields = new Set([
            ...(requiredFields[`${type}Required`] || []),
            ...(requiredFields[`${type}Optional`] || []),
        ]);
        for (const field of this.availableFields) {
            if (dropdowns.has(field) || !activeFields.has(field)) {
                billingInfo[field] = '';
                continue;
            }
            if (field === 'cconsent') {
                const $cconsent = $('#propay-billing-cconsent-inv', pro.propay.$page);
                billingInfo[field] = $cconsent.is(':checked') ? '1' : '';
                continue;
            }
            const $input = $(`#propay-billing-${field}-inv`, pro.propay.$page);
            billingInfo[field] = $input.length > 0 ? $.trim($input.val()) : "";
        }

        const {currentGateway, ASTROPAY_GATE_ID} = pro.propay;
        if (currentGateway) {
            // Gateway expects `name` as a single field; join firstname + lastname.
            if (currentGateway.fields && currentGateway.fields.name) {
                billingInfo.name = `${billingInfo.firstname || ''} ${billingInfo.lastname || ''}`.trim();
            }
            if (currentGateway.gatewayId === ASTROPAY_GATE_ID) {
                const extraCode = currentGateway.extra && currentGateway.extra.code;
                billingInfo.bank = extraCode || "";
                billingInfo.cpf = billingInfo[this.TAX_CODE_FIELD];
            }
        }

        return {...billingInfo, country: this.country, state: this.state};
    },

    /**
     * Fetch the billing info from the address dialog
     * @returns {object} - The billing info
     */
    async fetchBillingInfo() {
        'use strict';
        return addressDialog.fetchBillingInfo();
    },

    /**
     * Prefill the billing inputs (both -inv and -req variants) from the saved `billinginfo`, and u_attr.taxnum
     * @returns {Promise<void>} resolves once the inputs have been populated
     */
    async prefillInfo() {
        'use strict';
        const billingInfo = this.billingInfo || await this.fetchBillingInfo();
        if (!billingInfo) {
            return;
        }

        this.hasPrefilled = true;

        const skip = new Set([
            'country', 'state', 'bank', 'cpf', 'name', 'cconsent', this.TAX_CODE_FIELD,
        ]);
        // version='2' marks the to8-encoded payload written by saveBillingInfo / addressDialog.
        const encodedVer = !!billingInfo.version;

        for (const localKey of this.availableFields) {
            if (skip.has(localKey)) {
                continue;
            }

            let value = billingInfo[localKey];
            if (!value) {
                continue;
            }
            if (encodedVer && typeof value === 'string') {
                value = tryCatch(() => from8(value), () => value)() || value;
            }
            // Leave the field empty rather than prefilling a stored date Coinify would reject.
            if (localKey === 'dateOfBirth' && pro.propay.validateDateOfBirth(value)) {
                continue;
            }

            const $inputs = $(
                `#propay-billing-${localKey}-inv, #propay-billing-${localKey}-req`,
                pro.propay.$page
            );
            if ($inputs.length > 0) {
                $inputs.val(value);
            }
        }

        // Prefer any tax number the user has validated this session over u_attr.taxnum so a
        // re-render (e.g. Add credit card -> updatePayment -> validateAndPay -> initBillingInfo)
        // does not overwrite the entered value.
        const apiTaxValue = this.lastValidatedTaxNumber || (u_attr && u_attr.taxnum);
        if (apiTaxValue) {
            const $taxInputs = $(
                `#propay-billing-${this.TAX_CODE_FIELD}-inv, #propay-billing-${this.TAX_CODE_FIELD}-req`,
                pro.propay.$page
            );
            if ($taxInputs.length > 0) {
                $taxInputs.val(apiTaxValue);
            }
        }

        const $cconsent = $('#propay-billing-cconsent-inv', pro.propay.$page);
        if ($cconsent.length) {
            const consented = !!billingInfo.cconsent;
            $cconsent.prop('checked', consented);
            $('.checkbox-item', $cconsent.closest('.cconsent-input-wrapper'))
                .toggleClass('checkboxOn', consented)
                .toggleClass('checkboxOff', !consented);
        }
    },

    /**
     * Force a refresh of the UTQA, using updated tax info and country
     * @param {Boolean} [force] - Bypass the country/tax cache and always re-fetch plans.
     * @returns {Promise<void>} resolves once plans and propay UI have been re-rendered
     */
    async forceRefreshUtqa(force) {
        'use strict';

        // Propay-page refresh only. Business / registerb flows go through
        // `addressDialog.businessRegPage.refreshPricing` directly (see `refreshPricingForPage`).
        if (!pro.propay.onPropayPage()) {
            return;
        }

        const taxNumber = this.getTaxNumberForApiReq();
        const state = this.getStateForApiReq();

        // If the page was loaded with the correct tax country then dont re-fetch it
        // Otherwise if ipcc and entered country do not match then re-fetch it.
        // Skip the bailout when u_attr.taxnum is set - the initial no-tn utqa was fetched under
        // the account's tax-entity context, so its pricing doesn't match a Personal (tn:"") view.
        if (!force && !this.currentUtqa
            && pro.taxCountry && pro.taxCountry === this.country
            && !taxNumber
            && !(u_attr && u_attr.taxnum)) {
            this.currentUtqa = {country: this.country, taxNumber, state};
            return;
        }

        if (force
            || this.currentUtqa.country !== this.country
            || this.currentUtqa.taxNumber !== taxNumber
            || this.currentUtqa.state !== state) {
            await pro.loadMembershipPlans(false, true, this.country, taxNumber, state);
            this.currentUtqa = {country: this.country, taxNumber, state};
        }

        // IP-derived, independent of the billing country. wmip is live, u_attr.ipcc is pinned at boot.
        const curcc = this.defaultCountry || u_attr && u_attr.ipcc || undefined;

        const plan = pro.getPlanObj(pro.propay.planNum, pro.propay.selectedPeriod);
        if (plan) {
            await plan.getInstantDiscountInfo(this.country, taxNumber, curcc, state);
        }
        if (typeof DiscountPromo !== 'undefined') {
            await DiscountPromo.refreshDiscountInfo(this.country, taxNumber, curcc, state);
        }
        pro.propay.renderPlanInfo(plan);
    },

    /**
     * Dispatch a pricing refresh to whichever page is active - propay uses `loadMembershipPlans`
     * via `forceRefreshUtqa`; registerb / business flows go straight to
     * `addressDialog.businessRegPage.refreshPricing` so they don't fire the propay-only paths.
     * @returns {Promise<void>}
     */
    async refreshPricingForPage() {
        'use strict';
        if (pro.propay.onPropayPage()) {
            return this.forceRefreshUtqa();
        }
        if (addressDialog.businessRegPage
            && typeof addressDialog.businessRegPage.refreshPricing === 'function') {
            return addressDialog.businessRegPage.refreshPricing(
                this.country, this.getTaxNumberForApiReq(), this.getStateForApiReq()
            );
        }
        return Promise.resolve();
    },

    /**
     * Get and cache the tax number validation regex and examples for the country
     * @returns {object} - The tax number validation regex for the country
     */
    async getTngrRes() {
        'use strict';

        if (this.tngrRes) {
            return this.tngrRes;
        }

        const res = await api.req({a: 'tngr'}).catch(dump);
        this.tngrRes = res && res.result || false;

        return this.tngrRes;
    },

    /**
     * Validate the tax number
     * @param {string} taxNumber - The tax number to validate
     * @param {string} country - The country of the tax number
     * @param {string} state - The state of the tax number
     * @returns {boolean} - Whether the tax number is valid
     */
    async validateTaxNumber(taxNumber, country, state) {
        'use strict';

        if (!this.tngrRes) {
            await this.getTngrRes();
        }

        country = country || this.country;
        state = state || this.state;

        // Only business hits tnp - state-required UI on personal would fire on prefilled tn.
        if (this.isBusinessUse) {
            const stateRequired = this.isTaxValidationBlockedByState();
            this.setStateRequiredForTax(stateRequired);
            if (stateRequired) {
                this.clearTaxCodeStatus();
                return false;
            }
        }

        const contextKey = `${country}:${state || ''}`;

        const paintInvalid = () => this.isBusinessUse
            ? this.updateAttempts(false, false)
            : Promise.resolve(this.renderTaxCodeStatus(l[20953], 'invalid'));

        // AstroPay CPF/CNPJ format is required for both business and personal use.
        if (taxNumber
            && pro.propay.currentGateway
            && pro.propay.currentGateway.gatewayId === pro.propay.ASTROPAY_GATE_ID
            && !astroPayDialog.taxNumberIsValid(taxNumber)) {
            await paintInvalid();
            return false;
        }

        // Personal skips regex/tnp - callers (syncBillingCountry) still need pricing refreshed.
        if (!this.isBusinessUse) {
            await this.refreshPricingForPage();
            return true;
        }

        if (taxNumber === this.lastValidatedTaxNumber && contextKey === this.lastValidatedContextKey) {
            this.renderTaxCodeStatus(l.tax_details_verified, 'valid');
            return true;
        }

        const contextCache = this.validatedTaxNumbers[contextKey];
        const previousValidation = contextCache && contextCache[taxNumber];
        if (previousValidation !== undefined) {
            if (previousValidation) {
                this.lastValidatedTaxNumber = taxNumber;
                this.lastValidatedContextKey = contextKey;
                this.renderTaxCodeStatus(l.tax_details_verified, 'valid');
                await this.refreshPricingForPage();
                return true;
            }
            await paintInvalid();
            return false;
        }

        if (!taxNumber) {
            await this.refreshPricingForPage();
            return false;
        }

        const tngrRow = this.getTngrRow(country, state);
        const serverPattern = tngrRow && tngrRow.r;

        if (serverPattern && !new RegExp(serverPattern).test(taxNumber)) {
            await paintInvalid();
            return false;
        }

        // AstroPay countries have country-specific length/format rules (CPF/CNPJ, DNI etc.);
        // enforce them here so the tax field shows the error instead of failing silently at
        // astroPayDialog.submit time.
        if (pro.propay.currentGateway
            && pro.propay.currentGateway.gatewayId === pro.propay.ASTROPAY_GATE_ID
            && !astroPayDialog.taxNumberIsValid(taxNumber)) {
            await paintInvalid();
            return false;
        }

        if (!this.attempts) {
            await this.initAttempts();
        }

        this.renderTaxCodeStatus(l.tax_verifying, 'loading');
        const continueBtn = pro.propay.skItems && pro.propay.skItems.continueBtn;
        if (continueBtn) {
            continueBtn.startLoad('tnp');
        }

        // btoa rejects non-Latin1 - to8 lets emoji/unicode round-trip.
        const tnpReq = {a: 'tnp', tn: btoa(to8(taxNumber)), 'cc': country};
        const strippedState = typeof state === 'string' && state.split('-')[1];
        if (strippedState && (country === 'US' || country === 'CA')) {
            // Match the format uts/utc send (e.g. 'CA-AB' -> 'AB') so the cross-check aligns.
            tnpReq.state = strippedState;
        }
        let serverResponded = false;
        const validationResult = await api.req(tnpReq)
            .then((res) => {
                serverResponded = true;
                return res;
            })
            .catch((ex) => {
                if (ex === EARGS) {
                    serverResponded = true;
                }
            });

        const cleanup = () => {
            if (continueBtn) {
                continueBtn.endLoad('tnp');
            }
        };

        // tnp can resolve as the raw error code (e.g. -2) instead of `{result: ...}`.
        const result = validationResult
            && typeof validationResult === 'object'
            && validationResult.result;

        let decoded;
        if (typeof result === 'string') {
            decoded = tryCatch(() => from8(atob(result)), false)();
            if (decoded === undefined) {
                console.warn('tnp response decode failed', result);
            }
        }

        if (!this.validatedTaxNumbers[contextKey]) {
            this.validatedTaxNumbers[contextKey] = {};
        }
        // Key the cache off the decoded pass so an undecodable response isn't cached as valid.
        this.validatedTaxNumbers[contextKey][taxNumber] = !!decoded;

        if (serverResponded && this.attempts && typeof this.attempts === 'object') {
            this.attempts.cur++;
        }

        if (decoded) {
            this.lastValidatedTaxNumber = decoded;
            this.lastValidatedContextKey = contextKey;
            await this.refreshPricingForPage();
            await this.updateAttempts(true, true);
            cleanup();
            return true;
        }

        await this.updateAttempts(true, false);
        cleanup();
        return false;
    },

    /**
     * Validate the country and (where applicable) state, optionally storing failures for display.
     * @param {boolean} storeResult - Whether to record failures in lastValidatedErrorFields
     * @returns {boolean} - Whether the country/state pair is valid
     */
    validateCountryAndState(storeResult) {
        'use strict';
        if (!this.country) {
            if (storeResult) {
                this.lastValidatedErrorFields.country = true;
            }
            return false;
        }
        const {countriesWithStates} = RegionsCollection;
        const isStateRegion = countriesWithStates[this.country] && countriesWithStates[this.country].length > 0;

        if (isStateRegion) {
            const isValidState = this.state && countriesWithStates[this.country].includes(this.state.split('-')[1]);
            if (storeResult && !isValidState) {
                this.lastValidatedErrorFields.state = true;
            }
            return isValidState;
        }

        return true;
    },

    /**
     * Persist a single billing-info attribute via mega.attr.setArrayAttribute.
     * @param {string} name - Attribute name
     * @param {string} value - Attribute value (falsy values are skipped unless `force` is true)
     * @param {boolean} [force] - Persist even when the value is falsy
     * @returns {Promise|undefined} the setArrayAttribute promise, or undefined when skipped
     */
    saveBillingAttribute(name, value, force) {
        'use strict';
        if (value || force) {
            return mega.attr.setArrayAttribute('billinginfo', name, value, false, true);
        }
    },

    /**
     * Save the billing info, country/state always included. Field names are kept aligned with the
     * legacy `billinginfo` array attribute keys (taxCode, dateOfBirth, etc.) so the address dialog
     * and propay billing read/write the same entries.
     * @param {object} billingInfo - The billing info to save
     * @returns {void}
     */
    saveBillingInfo(billingInfo) {
        'use strict';
        billingInfo = {...billingInfo, country: this.country, state: this.state, version: '2'};

        // TLV storage is single-byte; encode free-text via to8 (matches addressDialog).
        const rawKeys = new Set(['country', 'state', 'version']);
        // Skip fields outside the active billing-type set - same filter as getEnteredBillingInfo.
        const type = this.getBillingType();
        const required = this.getRequiredFields();
        const activeFields = new Set([
            ...(required[`${type}Required`] || []),
            ...(required[`${type}Optional`] || []),
        ]);
        for (const [key, value] of Object.entries(billingInfo)) {
            if (!rawKeys.has(key) && !activeFields.has(key)) {
                continue;
            }
            const stored = (typeof value === 'string' && !rawKeys.has(key)) ? to8(value) : value;
            this.saveBillingAttribute(key, stored);
        }
    },

    /**
     * Validate the billing info and save it if it is valid
     * @param {number | boolean} save - 0 to not save, 1 to save, 2 to save only if valid
     * @returns {boolean | object} - Whether the billing info is valid or the billing info object if valid
     */
    async validateBillingInfo(save) {
        'use strict';
        if (d) {
            console.group('validateBillingInfo');
        }
        const billingInfo = this.getEnteredBillingInfo();
        const requiredFields = this.getRequiredFields();
        const billingType = this.getBillingType();

        // Mirror the form rendering's field aliasing so error targets match.
        this.handleCpfField(requiredFields);
        this.handleNameField(requiredFields);

        this.lastValidatedErrorFields = {};

        let validateFields = requiredFields[`${billingType}Required`];
        let validData = billingInfo;

        // country/state handled by validateCountryAndState; cconsent never blocks submission.
        validateFields = validateFields.filter(field => !['country', 'state', 'cconsent'].includes(field));

        for (const field of validateFields) {
            if (field === this.TAX_CODE_FIELD && this.taxCodeLockedOut) {
                validData = false;
                pro.log('validateBillingInfo: Tax code locked out');
                continue;
            }

            if (!billingInfo[field]) {
                pro.log('validateBillingInfo: Missing field:', field);
                validData = false;
                // Only surface the missing-field error once the user has attempted to submit;
                // background revalidations shouldn't flash empty-field errors on page load /
                // gateway switch.
                if (this.hasAttemptedSubmit) {
                    this.lastValidatedErrorFields[field] = true;
                    if (field === this.TAX_CODE_FIELD) {
                        // Empty required tax gets "Enter your tax number" rather than the default
                        // "Invalid tax number" - the value isn't invalid, it's missing.
                        $('.taxCode-input-wrapper .error-message-text', this.$billingInfo)
                            .text(l.enter_tax_number);
                    }
                }
            }

            if (field === this.TAX_CODE_FIELD) {
                // Empty tax is already flagged by the missing-required-field check above.
                // If the tax value is non-empty but state is required, the state field carries
                // the "State required for tax validation" error - skip flagging the tax field.
                if (billingInfo[field] && this.isTaxValidationBlockedByState()) {
                    this.setStateRequiredForTax(true);
                }
                else if (billingInfo[field]) {
                    const isValid = await this.validateTaxNumber(billingInfo[field]);
                    if (!isValid) {
                        pro.log('validateBillingInfo: Invalid tax code');
                        validData = false;
                        if (!this.taxCodeLockedOut) {
                            this.lastValidatedErrorFields[this.TAX_CODE_FIELD] = true;
                        }
                    }
                }
            }
        }

        if (!this.validateCountryAndState(true)) {
            pro.log('validateBillingInfo: Invalid country or state');
            validData = false;
        }

        // Bitcoin/Coinify only accepts a date of birth from 1900 up to the user's 10th birthday.
        const isBitcoin = pro.propay.currentGateway
            && pro.propay.currentGateway.gatewayId === pro.propay.BITCOIN_GATE_ID;
        const dobError = isBitcoin && billingInfo.dateOfBirth
            ? pro.propay.validateDateOfBirth(billingInfo.dateOfBirth)
            : '';
        if (dobError) {
            pro.log('validateBillingInfo: Invalid date of birth');
            validData = false;
            this.lastValidatedErrorFields.dateOfBirth = true;
            $('.dateOfBirth-input-wrapper .error-message-text', this.$billingInfo).text(dobError);
        }
        else if (this.lastValidatedErrorFields.dateOfBirth) {
            // An earlier too-young attempt leaves its message behind, so relabel for the empty field.
            $('.dateOfBirth-input-wrapper .error-message-text', this.$billingInfo)
                .text(l.enter_birth_date);
        }

        // AstroPay India: PIN code is exactly 6 digits, mobile is exactly 10 digits (national,
        // no country code). Matches astroPayDialog.submit live behavior.
        if (this.isAstropayIndia()) {
            if (!/^\d{6}$/.test(billingInfo.postcode || '')) {
                pro.log('validateBillingInfo: Invalid postcode');
                validData = false;
                if (this.hasAttemptedSubmit) {
                    this.lastValidatedErrorFields.postcode = true;
                }
            }
            const cleanedPhone = M.validatePhoneNumber(billingInfo.mobile || '');
            const phoneDigitCount = cleanedPhone ? cleanedPhone.replace(/\D/g, '').length : 0;
            if (!cleanedPhone || phoneDigitCount !== 10) {
                pro.log('validateBillingInfo: Invalid mobile');
                validData = false;
                if (this.hasAttemptedSubmit) {
                    this.lastValidatedErrorFields.mobile = true;
                }
            }
        }

        if (d) {
            console.groupEnd();
        }

        if (save === 1) {
            this.saveBillingInfo(billingInfo);
        }
        else if (save === 2 && validData) {
            this.saveBillingInfo(billingInfo);
            await this.forceRefreshUtqa();
        }

        this.canProceedToPayment = !!validData;

        return validData;
    },

    /**
     * Display the validation errors and scroll to the first error.
     * @returns {void}
     */
    showErrors() {
        'use strict';
        $('.error', this.$billingInfo).removeClass('error');

        for (const field of Object.keys(this.lastValidatedErrorFields)) {
            const $error = $(`#propay-billing-${field}-inv, #propay-billing-${field}-req`, this.$billingInfo)
                .closest('.billing-input');
            if ($error.length > 0) {
                $error.addClass('error');
            }
        }

        const $errors = $('.error', this.$billingInfo);
        if ($errors.length > 0) {
            $errors[0].scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
        }
    },


    /**
     * Synchronize duplicate inputs so that if one is changed, the other is changed too. This is to allow easier
     * access to data, as only the invoice fields will need to be checked, even if not shown as they will sync to the
     * shown fields.
     * @returns {void}
     */
    initSyncInputs() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        for (const field of this.availableFields) {
            const $inputWrapper = $(`.billing-input.${field}-input-wrapper`, $billingWrapper);
            if ($inputWrapper.length > 1) {
                $('input', $inputWrapper).rebind('input.syncInputs', (e) => {
                    $('input', $inputWrapper).not($(e.currentTarget)).val($(e.currentTarget).val());
                });
            }
        }
    },

    /**
     * Update the attempts to the current time.
     * @param {?number} currentTime - The current time in seconds
     * @returns {void}
     */
    updateAttemptsToNow(currentTime) {
        'use strict';
        currentTime = currentTime || unixtime();
        while (currentTime > this.attempts.rf) {
            this.attempts.rf += this.attempts.cd;
        }
    },

    async initAttempts(force) {
        'use strict';
        if (!this.attempts || this.attempts.isOld || force) {
            const res = await api.req({a: 'tnga'}).catch(() => false);
            this.attempts = res && typeof res === 'object' && res.result || false;
        }

        // ensure that the attempts are up to date
        this.updateAttemptsToNow();

        pro.log('initAttempts', this.attempts);

        return this.attempts;
    },

    async updateAttempts(attemptMade, attemptSuccess, allowRefresh) {
        'use strict';

        allowRefresh = allowRefresh === undefined ? true : allowRefresh;

        if (!this.attempts || typeof this.attempts !== 'object') {
            await this.initAttempts(true);
        }
        if (!this.attempts || typeof this.attempts !== 'object') {
            // tnga unavailable (e.g. anon registerb user) - fall back to a basic verdict.
            console.warn('Could not load attempt info');
            this.renderTaxCodeStatus(
                attemptSuccess ? l.tax_details_verified : l[20953],
                attemptSuccess ? 'valid' : 'invalid'
            );
            return;
        }

        if (this.attempts.cur >= this.attempts.all && allowRefresh) {
            await this.initAttempts(true);

            if (this.attempts.cur < this.attempts.all) {
                eventlog(501243);
            }
        }

        const currentTime = unixtime();

        if (currentTime > this.attempts.rf) {
            this.attempts.cur = 0;
            pro.log('updateAttempts: cur reset to 0');
            this.updateAttemptsToNow(currentTime);
            if (allowRefresh) {
                await this.initAttempts(true);
                return this.updateAttempts(attemptMade, attemptSuccess, false);
            }
        }

        const {cur, all} = this.attempts;

        let string;
        let status;

        if (attemptSuccess) {
            string = l.tax_details_verified;
            status = 'valid';
        }
        else if (cur < all) {
            // No attempts consumed yet - show the plain error, not "Attempt 0 of N".
            string = cur > 0
                ? l.tax_attempts_remaining.replace('%1', cur).replace('%2', all)
                : l[20953];
            status = 'invalid';
        }
        else {
            // registerb suppresses the exhausted copy; anywhere else shows it.
            const onRegisterb = !pro.propay.onPropayPage() && page === 'registerb';
            string = onRegisterb ? '' : l.tax_attempts_exhausted;
            status = 'exhausted';
        }

        this.renderTaxCodeStatus(string, status);

        return {string, status};
    },

    /**
     * Paint the inline tax-code status row (valid / invalid / exhausted / loading / info).
     * `info` is a non-blocking grey note (no icon, no input lock) used when validation is
     * deferred - e.g. the country requires a state and the user hasn't picked one yet.
     * @param {string} text - Message to write into the .error-message-text span
     * @param {string} status - One of 'valid' | 'invalid' | 'exhausted' | 'loading' | 'info'
     * @returns {void}
     */
    renderTaxCodeStatus(text, status) {
        'use strict';
        const ICON_BY_STATUS = {
            valid: 'icon-check-circle-thin-outline',
            invalid: 'icon-alert-triangle-thin-outline',
            exhausted: 'icon-help-circle-thin-outline',
            loading: 'icon-loader-grad-small-regular-outline',
        };
        const STATUS_CLASSES = 'error taxCode-status-valid taxCode-status-loading'
            + ' taxCode-status-exhausted taxCode-status-info';
        const ICON_CLASSES = [
            ...Object.values(ICON_BY_STATUS),
            'icon-alert-triangle',
            'icon-info-thin-outline',
        ].join(' ');

        this.cacheBillingSections();
        const $taxRow = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        ).closest('.billing-input');

        $taxRow.removeClass(STATUS_CLASSES);
        if (status === 'valid') {
            $taxRow.addClass('taxCode-status-valid');
        }
        else if (status === 'loading') {
            $taxRow.addClass('taxCode-status-loading');
        }
        else if (status === 'info') {
            $taxRow.addClass('taxCode-status-info');
        }
        else if (status !== 'exhausted') {
            $taxRow.addClass('error');
        }
        $('input', $taxRow).prop('disabled', status === 'loading');

        $('.error-message-text', $taxRow).text(text);
        const $taxIcon = $('.error-message i', $taxRow).removeClass(ICON_CLASSES);
        if (status !== 'info') {
            $taxIcon.addClass(ICON_BY_STATUS[status] || ICON_BY_STATUS.invalid);
        }

        const $dialogNote = $('.taxcode-invoice-note', addressDialog.getDialog());
        if ($dialogNote.length) {
            $dialogNote.removeClass(`${STATUS_CLASSES} hidden`);
            if (status === 'valid') {
                $dialogNote.addClass('taxCode-status-valid');
            }
            else if (status === 'loading') {
                $dialogNote.addClass('taxCode-status-loading');
            }
            else if (status === 'exhausted') {
                $dialogNote.addClass('taxCode-status-exhausted');
            }
            else if (status === 'info') {
                $dialogNote.addClass('taxCode-status-info');
            }
            else {
                $dialogNote.addClass('error');
            }
            // Callers suppress the exhausted copy on the registerb tax row; the dialog note still
            // needs a label so the user sees why the field is locked.
            $('span', $dialogNote).text(text || (status === 'exhausted' ? l.tax_attempts_exhausted : ''));
            // Direct child only - avoids grabbing the popover's close icon.
            const $dialogIcon = $dialogNote.children('i').removeClass(ICON_CLASSES);
            if (status !== 'info') {
                $dialogIcon.addClass(ICON_BY_STATUS[status] || ICON_BY_STATUS.invalid);
            }
        }

        this.renderTaxValidationPopover(status);

        if (status !== 'loading') {
            this.setTaxCodeLockout(status === 'exhausted');
        }
    },

    /**
     * Whether the current country requires a state and none is selected - tax number
     * validation cannot proceed in that case.
     * @returns {boolean} true when tax validation is blocked by a missing state
     */
    isTaxValidationBlockedByState() {
        'use strict';
        const {countriesWithStates} = RegionsCollection;
        return !!(countriesWithStates[this.country]
            && countriesWithStates[this.country].length
            && !this.state);
    },

    /**
     * Flag the state dropdown as the source of the "State required for tax validation" error.
     * The dropdown gets .error styling; the shared select_state error span is swapped for the
     * tax-specific string. Pair with clearStateRequiredForTax on state selection / country change
     * / when the tax field is cleared.
     * @param {boolean} enabled - true to show the error, false to restore the default state
     * @returns {void}
     */
    setStateRequiredForTax(enabled) {
        'use strict';
        this.cacheBillingSections();
        const $stateWrappers = $('.state-input-wrapper', this.$billingInfo);
        if (!$stateWrappers.length) {
            return;
        }
        if (enabled) {
            $('.error-message-text', $stateWrappers).text(l.tax_state_required);
            $stateWrappers.addClass('error');
        }
        else {
            $stateWrappers.removeClass('error');
            $('.error-message-text', $stateWrappers).text(l.select_state);
        }
    },

    /**
     * Wipe every tax-code status surface (form, dialog note, popover) so no message is shown.
     * @returns {void}
     */
    clearTaxCodeStatus() {
        'use strict';
        const STATUS_CLASSES = 'error taxCode-status-valid taxCode-status-loading taxCode-status-exhausted';
        this.cacheBillingSections();
        const $taxRow = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        ).closest('.billing-input').removeClass(STATUS_CLASSES);
        $('input', $taxRow).prop('disabled', false);
        const $dialog = addressDialog.getDialog();
        $('.taxcode-invoice-note', $dialog)
            .removeClass(STATUS_CLASSES)
            .addClass('hidden');
        $('.tax-validation-popover').addClass('hidden');
        // Attempts (cur/all from tnga) are global - a country change doesn't grant fresh retries.
        this.applyExhaustedLockout();
    },

    /**
     * Show the dark "Validation failed" popover for invalid+cur>=2 (review variant) or
     * exhausted (switch-to-personal variant). Hidden otherwise.
     * @param {string} status - One of 'valid' | 'invalid' | 'exhausted' | 'loading'
     * @returns {void}
     */
    renderTaxValidationPopover(status) {
        'use strict';
        const $popovers = $('.tax-validation-popover', pro.propay.onPropayPage()
            ? $('#propay') : addressDialog.getDialog());
        if (!$popovers.length) {
            return;
        }

        const cur = this.attempts && this.attempts.cur || 0;
        const showReview = status === 'invalid' && cur >= 2;
        const showExhausted = status === 'exhausted';

        if (!showReview && !showExhausted) {
            $popovers.addClass('hidden');
            return;
        }

        const message = showExhausted
            ? l.validation_failed_exhausted_message
            : l.validation_failed_review_message;
        const actionText = showExhausted
            ? l.switch_to_personal_use
            : l.view_help_article;
        const actionKind = showExhausted ? 'switch-personal' : 'help-article';

        for (const el of $popovers) {
            const $popover = $(el);
            $('.tax-validation-popover-message', $popover).text(message);
            $('.tax-validation-popover-action', $popover)
                .safeHTML(actionText)
                .attr('data-action', actionKind);
            $popover.removeClass('hidden');
        }

        if (!this.popoverActionsBound) {
            this.popoverActionsBound = true;
            $(document).rebind('click.taxValidationPopover', '.tax-validation-popover-action', (ev) => {
                if (ev.currentTarget.dataset.action === 'switch-personal') {
                    this.switchToPersonalUse();
                }
            });
            $(document).rebind('click.taxValidationPopoverClose', '.tax-validation-popover-close', (ev) => {
                $(ev.currentTarget).closest('.tax-validation-popover').addClass('hidden');
            });
        }
    },

    // Triggered from the validation popover "Switch to personal use" link. Mirrors a Personal
    // tab click on whichever page we're on.
    switchToPersonalUse() {
        'use strict';
        if (this.useTypeTabGroup && typeof this.useTypeTabGroup.selectTab === 'function') {
            this.useTypeTabGroup.selectTab('personal');
        }
        if (typeof addressDialog !== 'undefined' && addressDialog && addressDialog.closeDialog) {
            addressDialog.closeDialog();
        }
        // Mobile registerb/repay: dialog is a full-page block - reload the underlying form page.
        if (is_mobile && addressDialog.businessPlan && (page === 'registerb' || page === 'repay')) {
            sessionStorage.setItem('pro.purchaseBusinessUse', 'false');
            this.isBusinessUse = false;
            const targetPage = page;
            page = '';
            loadSubPage(targetPage);
            return;
        }
        this.applyPersonalUse();
    },

    // No-op when skItems aren't initialised so registerb callers don't need a page guard.
    toggleSkLoaders(start) {
        'use strict';
        const sk = pro.propay.skItems;
        if (!sk || !sk.rightBlock || !sk.footers || !sk.continueBtn) {
            return;
        }
        const method = start ? 'startLoad' : 'endLoad';
        sk.rightBlock[method]('utqa');
        sk.footers[method]('utqa');
        sk.continueBtn[method]('utqa');
    },

    applyPersonalUse() {
        'use strict';
        this.isBusinessUse = false;
        this.setTaxCodeLockout(false);

        if (pro.propay.onPropayPage()) {
            this.toggleSkLoaders(true);
            return Promise.resolve(this.forceRefreshUtqa())
                .then(() => {
                    this.resetAcceptedBillingInfo();
                    pro.propay.updatePayment();
                    this.updateRequiredFields();
                    sessionStorage.setItem('pro.propayBusinessUse', 'false');
                })
                .catch(dump)
                .finally(() => this.toggleSkLoaders(false));
        }

        // Registerb: only refresh business pricing if a business utqa was already issued.
        sessionStorage.setItem('pro.purchaseBusinessUse', 'false');
        const dlg = typeof addressDialog !== 'undefined' && addressDialog;
        const businessRegPage = dlg && dlg.businessRegPage;
        if (dlg && dlg.lastBusUtqaTaxNum && businessRegPage
            && typeof businessRegPage.refreshPricing === 'function') {
            dlg.setBusinessPriceLoading(true);
            const country = businessRegPage.getCountry();
            return Promise.resolve(
                businessRegPage.refreshPricing(country, '', this.getStateForApiReq(country))
            ).catch(dump).finally(() => dlg.setBusinessPriceLoading(false));
        }
    },

    // initAttempts + applyExhaustedLockout on every entry so a still-capped user
    // can't bypass the lockout by bouncing Personal -> Business.
    applyBusinessUse() {
        'use strict';
        this.isBusinessUse = true;

        if (pro.propay.onPropayPage()) {
            this.toggleSkLoaders(true);
            return Promise.resolve(this.initAttempts(true))
                .then(() => this.forceRefreshUtqa())
                .then(() => {
                    this.resetAcceptedBillingInfo();
                    pro.propay.updatePayment();
                    this.updateRequiredFields();
                    sessionStorage.setItem('pro.propayBusinessUse', 'true');
                })
                .catch(dump)
                .finally(() => {
                    this.toggleSkLoaders(false);
                    this.applyExhaustedLockout();
                });
        }

        sessionStorage.setItem('pro.purchaseBusinessUse', 'true');
        const businessRegPage = addressDialog && addressDialog.businessRegPage;
        if (businessRegPage && businessRegPage.refreshPricing) {
            const country = businessRegPage.getCountry();
            businessRegPage.refreshPricing(country, this.getTaxNumberForApiReq(), this.getStateForApiReq(country));
        }
        return Promise.resolve(this.initAttempts(true))
            .catch(dump)
            .finally(() => this.applyExhaustedLockout());
    },

    // renderTaxCodeStatus('exhausted') handles the lockout + popover; this just gates on the
    // cached tnga envelope.
    applyExhaustedLockout() {
        'use strict';
        if (!this.isBusinessUse || !this.attempts || typeof this.attempts !== 'object') {
            return;
        }
        if (this.attempts.cur >= this.attempts.all) {
            // Skip when a validated tax number is already in place for the current context - the
            // exhausted-attempts warning is only meaningful when the user still needs to validate.
            const contextKey = `${this.country}:${this.state || ''}`;
            if (this.lastValidatedTaxNumber && this.lastValidatedContextKey === contextKey) {
                return;
            }
            const onRegisterb = !pro.propay.onPropayPage() && page === 'registerb';
            this.renderTaxCodeStatus(onRegisterb ? '' : l.tax_attempts_exhausted, 'exhausted');
        }
    },

    /**
     * Disable or enable all tax code related UI elements.
     * @param {boolean} locked - true to lock the user out, false to restore access
     * @returns {void}
     */
    setTaxCodeLockout(locked) {
        'use strict';
        this.cacheBillingSections();
        const $taxInputs = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        );
        const $taxRow = $taxInputs.closest('.billing-input');
        const $continueButton = $('.continue', pro.propay.$page);

        this.taxCodeLockedOut = !!locked;
        const toggleDisabled = ($el) => {
            if (locked) {
                $el.attr('disabled', 'disabled');
            }
            else {
                $el.removeAttr('disabled');
            }
        };

        toggleDisabled($taxInputs);
        $taxRow.toggleClass('taxCode-status-exhausted', locked);
        toggleDisabled($continueButton);
        if (locked) {
            $continueButton.addClass('disabled');
        }
        else if (typeof pro.propay.updateContinueDisabled === 'function') {
            // Defer to the central gate so S4-TOS / country-mismatch keep the button disabled.
            pro.propay.updateContinueDisabled();
        }
        else {
            $continueButton.removeClass('disabled');
        }

        const $dialog = addressDialog.getDialog();
        const $dialogTax = $('.taxcode', $dialog);
        const $dialogPay = $('.payment-buy-now', $dialog);
        toggleDisabled($dialogTax);
        $dialogTax.closest('.payment-half-block').toggleClass('taxCode-status-exhausted', locked);
        toggleDisabled($dialogPay);
        $dialogPay.toggleClass('disabled', locked);

        if (locked) {
            $taxRow.removeClass('error');
            delete this.lastValidatedErrorFields[this.TAX_CODE_FIELD];
        }
    },

    /**
     * Reset accepted billing info, forcing the user to re-validate before payment.
     * @returns {void}
     */
    resetAcceptedBillingInfo() {
        'use strict';
        this.billingInfoFilled = false;
        this.billingInfo = {};
        this.canProceedToPayment = false;
        this.updatedPayment = false;
        this.showingPaymentSection = false;
    },

    /**
     * Bind input handlers that clear accepted-payment state when billing fields are edited.
     * @returns {void}
     */
    initClearPayment() {
        'use strict';
        this.cacheBillingSections();
        const $billingWrapper = this.$billingInfo;
        for (const field of this.availableFields) {
            const $input = $(`#propay-billing-${field}-inv, #propay-billing-${field}-req`, $billingWrapper);

            if ($input.length > 0) {
                $input.rebind('input.clearPayment', () => {
                    if (this.canProceedToPayment) {
                        this.resetAcceptedBillingInfo();
                        pro.propay.updatePayment();
                    }
                });
            }
        }
    },

    /**
     * After a gateway switch to a single-stage gateway, force a tax-code check so the Continue
     * button reflects validity before the user reaches the gateway redirect.
     * @returns {void}
     */
    revalidateTaxOnGatewayChange() {
        'use strict';
        if (!this.isBusinessUse) {
            return;
        }
        const gateway = pro.propay.currentGateway;
        if (!gateway || this.requiresSecondaryStage(gateway.gatewayId)) {
            return;
        }
        this.cacheBillingSections();
        const $taxInput = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        );
        const value = String($taxInput.val() || '').trim();
        if (!value || value === this.lastValidatedTaxNumber) {
            return;
        }
        this.validateTaxNumber(value);
    },

    /**
     * When a gateway needs to be validated upfront do it on leaving tax code field.
     * @returns {void}
     */
    initTaxCodeBlurValidation() {
        'use strict';
        this.cacheBillingSections();
        const $taxInputs = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        );
        if (!$taxInputs.length) {
            return;
        }
        const $continueButton = $('.continue', pro.propay.$page);

        const isApplicable = () => {
            if (!this.isBusinessUse) {
                return false;
            }
            const gateway = pro.propay.currentGateway;
            return !!gateway && this.blurValidateGatewayIds.has(gateway.gatewayId);
        };

        $taxInputs.rebind('input.taxCodeBlurValidate', () => {
            if (!isApplicable()) {
                return;
            }
            $continueButton.addClass('disabled');
        });

        $taxInputs.rebind('blur.taxCodeBlurValidate', (e) => {
            if (!isApplicable()) {
                return;
            }
            const value = String($(e.currentTarget).val() || '').trim();
            if (!value) {
                // Nothing to validate; drop any lingering tax-context state error.
                this.setStateRequiredForTax(false);
                this.clearTaxCodeStatus();
            }
            const validated = value
                ? Promise.resolve(this.validateTaxNumber(value))
                : Promise.resolve();
            validated.then(() => {
                if (this.taxCodeLockedOut) {
                    return;
                }
                // Route through updateContinueDisabled so S4-TOS / country-mismatch gates aren't
                // bypassed by the blur re-enable.
                pro.propay.updateContinueDisabled();
            }).catch(dump);
        });
    },

    /**
     * Mount the personal/business use type tab group, restoring last selection from sessionStorage.
     * @returns {void}
     */
    initUseTypeTabs() {
        'use strict';
        const $page = pro.propay && pro.propay.$page;
        const mount = $page && $page.length && $page[0].querySelector('.propay-use-type-tab-mount');

        if (!mount || mount.dataset.propPayUseTabsInit === '1' || typeof MegaTabGroup === 'undefined') {
            return;
        }

        mount.dataset.propPayUseTabsInit = '1';
        mount.textContent = '';

        const tabGroupWrap = document.createElement('div');
        tabGroupWrap.className = 'mega-component tab-group propay-use-type-tab-group';
        mount.appendChild(tabGroupWrap);

        const lastSelected = sessionStorage.getItem('pro.propayBusinessUse');

        const businessSelected = lastSelected
            ? lastSelected === 'true'
            : pro.filter.simple.defaultToBusinessUse.has(pro.propay.planNum);

        this.isBusinessUse = businessSelected;

        this.useTypeTabGroup = new MegaTabGroup({
            tabs: [
                {
                    parentNode: tabGroupWrap,
                    text: l.personal_use,
                    tabid: 'personal',
                    selected: !businessSelected,
                    onClick: () => this.applyPersonalUse(),
                },
                {
                    parentNode: tabGroupWrap,
                    text: l.business_use,
                    tabid: 'business',
                    selected: businessSelected,
                    onClick: () => this.applyBusinessUse(),
                },
            ],
        });
    },

    /**
     * Reveal the payment section for the current gateway.
     * @returns {void}
     */
    showPaymentSection() {
        'use strict';
        pro.propay.updatePayment(false, true);
        this.showingPaymentSection = true;
        pro.propay.setContinuebuttonText();

        const $section = $('.specific-payment-info', pro.propay.$page);
        if ($section.length) {
            $section[0].scrollIntoView({behavior: 'smooth', inline: 'nearest'});
        }
    },

    /**
     * Whether the given gateway requires a secondary stage (vs redirect-only).
     * @param {number} gatewayId - Gateway numeric id
     * @returns {boolean} true when the gateway needs a secondary stage on the propay page
     */
    requiresSecondaryStage(gatewayId) {
        'use strict';
        return !this.singleStagePaymentIds.has(gatewayId);
    },

    /**
     * Whether the gateway's own UI (voucher input, etc.) should render alongside the billing form
     * instead of behind a "Continue to payment" stage gate.
     * @param {string} gatewayName - Gateway short name
     * @returns {boolean} true when the gateway is in {@link concurrentBillingPayments}
     */
    showsBillingConcurrently(gatewayName) {
        'use strict';
        return this.concurrentBillingPayments.has(gatewayName);
    },

    /**
     * Rows are keyed by bare state code with `0` country-wide, while state is held `CC-SS`.
     * @param {string} [country] - Country to look up; defaults to the selected one
     * @param {string} [state] - State to look up; defaults to the selected one
     * @returns {object|false} - The tngr row, or false when the rules do not cover the country
     */
    getTngrRow(country, state) {
        'use strict';
        country = country || this.country;
        if (state === undefined) {
            state = country === this.country ? this.state : '';
        }
        const entry = this.tngrRes && country && this.tngrRes[country] || false;
        const stateCode = typeof state === 'string' && state.split('-').pop() || '';
        return entry && (entry[stateCode] || entry[0] || entry) || false;
    },

    /**
     * @param {string} [country] - Country to look up; defaults to the selected one
     * @returns {string} - The tax name from the tax number rules, or '' when they do not name one
     */
    getTngrTaxName(country) {
        'use strict';
        const row = this.getTngrRow(country);
        const name = row && row.n;
        return typeof name === 'string' ? name.trim() : '';
    },

    /**
     * @returns {string} example tax number for the country/state, or '' when none is configured
     */
    getExampleTaxNumber() {
        'use strict';
        const row = this.getTngrRow();
        return row && row.e || '';
    },

    /**
     * Set the placeholder on the taxCode inputs from the country/state example.
     * @returns {void}
     */
    updateTaxEntryField() {
        'use strict';
        this.cacheBillingSections();
        const $taxCodeInput = $(
            '#propay-billing-taxCode-inv, #propay-billing-taxCode-req',
            this.$billingInfo
        );
        const example = this.getExampleTaxNumber();
        $('label', $taxCodeInput.closest('.taxCode-input-wrapper')).text(this.getTaxFieldLabel());
        if ($taxCodeInput.length > 0) {
            $taxCodeInput.attr('placeholder', example || '');
        }
        const taxComp = addressDialog.taxCodeComponent;
        if (taxComp) {
            taxComp.placeholder = example || '';
            const $wrapper = taxComp.megaInput && taxComp.megaInput.$wrapper;
            if ($wrapper && $wrapper.length) {
                // .has-placeholder keeps the floating title pinned to the top so the example
                // placeholder is readable inside the field (see megainput.css).
                $wrapper.toggleClass('has-placeholder', !!example);
            }
        }
    },

    /**
     * Reset payment state and re-render plan info, e.g. after a country/tax change.
     * @returns {void}
     */
    clearPaymentInfo() {
        'use strict';
        addressDialog.closeDialog();
        this.showingPaymentSection = false;
        this.canProceedToPayment = false;
        pro.propay.updatePayment(false, true);
        pro.propay.renderPlanInfo();
        this.updateTaxEntryField();
    },

    /**
     * Show the addressDialog tax field when the gateway needs taxCode for the active mode.
     * For business use, also show when required for invoice (business always invoices); personal
     * use on a business plan still invoices but is not tax-excluded, so b2c_inv applies normally.
     * @returns {void}
     */
    updateAddressDialogTax() {
        'use strict';

        const $taxInputWrapper = addressDialog.taxCodeMegaInput
            && addressDialog.taxCodeMegaInput.$input
            && addressDialog.taxCodeMegaInput.$input.closest('.mega-input');
        if (!$taxInputWrapper || !$taxInputWrapper.length) {
            return;
        }
        this.updateTaxEntryField();
        $taxInputWrapper.removeClass('required optional').addClass('hidden');

        const billingType = this.getBillingType();
        const required = this.getRequiredFields();
        if (required[`${billingType}Required`].includes(this.TAX_CODE_FIELD)) {
            $taxInputWrapper.removeClass('hidden').addClass('required');
        }
        else if (required[`${billingType}Optional`].includes(this.TAX_CODE_FIELD)) {
            $taxInputWrapper.removeClass('hidden').addClass('optional');
        }
    },

    /**
     * Initialize the billing module: prefetch billing info and taxCode regexes, then wire up UI.
     * @returns {Promise<boolean>} resolves to true once initialization completes
     */
    async init() {
        'use strict';
        this.hasAttemptedSubmit = false;
        const [billingInfo] = await Promise.all([
            this.fetchBillingInfo(),
            this.getTngrRes(),
            this.initAttempts(),
            this.getInitialCountry(),
        ]);
        delete this.billingSections;
        this.billingInfo = billingInfo;
        this.initAvailableFields();
        this.initUseTypeTabs();
        this.initCountryDropdown();
        this.initStateDropdown();
        this.initRequireInvoice();
        this.initCconsent();
        this.updateRequiredFields();
        this.initSyncInputs();
        pro.propay.setDateOfBirthRange($('input', this.getBillingSections().$dateOfBirth));
        this.initTaxCodeBlurValidation();
        this.initClearPayment();
        this.updateTaxEntryField();
        await this.prefillInfo();
        // Req 1: a returning user whose tnga envelope says cur >= all should be blocked from
        // firing tnp from the form before they make an attempt.
        this.applyExhaustedLockout();
        return true;
    },
};

// Names to be used for input fields. Created as an object here to allow easy lookup by field name.
lazy(pro.propay.billing, 'stringFieldNames', () => {
    'use strict';
    return {
        'address1': l[561],
        'address1-opt': l.address1_opt,
        'address2': l.address2,
        'address2-opt': l.address2_opt,
        'dateOfBirth': l[995],
        'dateOfBirth-opt': l.birth_date_opt,
        'cconsent': l.coinify_share_consent,
        'cconsent-opt': l.coinify_share_consent,
        'city': l[565],
        'city-opt': l.city_opt,
        'country': l[481],
        'country-opt': l.country_opt,
        'firstname': l[7342],
        'firstname-opt': l.firstname_opt,
        'lastname': l[7345],
        'lastname-opt': l.lastname_opt,
        'companyName': l[19603],
        'companyName-opt': l[19603],
        'mobile': l[19152],
        'mobile-opt': l.phone_number_opt,
        'postcode': l[10659],
        'postcode-opt': l.postcode_opt,
        'state': l[7192],
        'taxCode': l.tax_number,
        'taxCode-opt': l.tax_number_opt,
    };
});
