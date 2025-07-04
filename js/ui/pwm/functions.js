lazy(mega.ui.pm, 'utils', () => {
    'use strict';

    return freeze({

        /**
         * Function that return either favicon for the website of the url provided or manual favicon
         *
         * @param {string} name Name of saved password
         * @param {string} url URL of saved password
         * @param {HTMLElement} elem Element where the favicon should be added
         * @returns {void}
         */
        generateFavicon(name, url, elem) {

            url = typeof url === "undefined" ? "" : url;
            name = name.trim();

            const inner = elem.getElementsByTagName('span')[0];
            inner.textContent = '';
            elem.classList.remove('manual-favicon', 'brand-favicon', 'color0', 'color1', 'color2');

            if (url !== '' && this.isURL(url)) {
                const domain = this.domainFromURL(url);

                if (domain && mega.ui.pm.SUPPORTED_FAVICON.has(domain.toLowerCase())) {
                    elem.classList.add('brand-favicon');
                    inner.className = `favicon-brand`;
                    const img = document.createElement('img');
                    img.src = `${staticpath}/images/pm/favicons/favicon-sprite.svg#${domain.toLowerCase()}`;

                    inner.append(img);

                    return;
                }
                name = name || domain;
            }

            elem.classList.add('manual-favicon');
            inner.className = '';

            const hash = name.charCodeAt(0);

            if (!hash) {
                return;
            }

            const color = `color${hash % 3}`;
            elem.classList.add(color);

            let graphemes = '\\p{Extended_Pictographic}(?:\\uFE0F)?(?:\\p{Emoji_Modifier})?';
            graphemes = `${graphemes}(?:\\u200D${graphemes})*`;
            const keycap = '[0-9#*]\\uFE0F?\\u20E3';
            const set = '[\\p{sc=Han}\\p{sc=Hangul}\\p{sc=Hiragana}\\p{sc=Katakana}]';
            const r = new RegExp(`^(${graphemes})|^(${keycap})|^(${set})|^.(?:${graphemes}|${keycap}|${set})`, 'u');
            const hasEmoji = r.exec(name);
            const fEmoji = hasEmoji && (hasEmoji[1] || hasEmoji[2] || hasEmoji[3]);

            if (hasEmoji === null) {
                inner.innerText = name[0].toUpperCase() + (name[1] || '');
            }
            else if (fEmoji) {
                inner.innerText = fEmoji;
            }
            else {
                inner.innerText = name[0].toUpperCase();
            }
        },

        /**
         * Generate credit card favicon based on card number (BIN).
         * If type is not recognized, a generic icon is shown but treated as manual.
         *
         * @param {string} cardNumber - The credit card number.
         * @param {HTMLElement} elem - Element where the favicon will be rendered.
         * @returns {void}
         */
        generateCardFavicon(cardNumber, elem) {
            const cleaned = cardNumber.replace(/\s+/g, '');

            const brandMap = [
                { regex: /^(636368|438935|504175|5067\d{2})/, icon: 'icon-elo' },
                { regex: /^4/, icon: 'icon-visa-new' },
                { regex: /^5[1-5]/, icon: 'icon-mastercard-new' },
                { regex: /^2(2[2-9]|[3-6]\d|7[01]|720)/, icon: 'icon-mastercard-new' },
                { regex: /^(50|56|57|58|63|67)/, icon: 'icon-maestro' },
                { regex: /^3[47]/, icon: 'icon-amex-new' },
                { regex: /^62/, icon: 'icon-unionpay' },
                { regex: /^(6011|64[4-9]|65)/, icon: 'icon-discover-new' },
                { regex: /^35[2-8]/, icon: 'icon-jcb-new' },
                { regex: /^(60|65|81|82|508|353|356)/, icon: 'icon-rupay' }
            ];

            const match = brandMap.find(({ regex }) => regex.test(cleaned));
            const brand = match ? match.icon : null;

            const inner = elem.getElementsByTagName('span')[0];
            inner.textContent = '';
            inner.className = '';
            elem.classList.remove('manual-favicon', 'brand-favicon');

            if (brand) {
                elem.classList.add('brand-favicon');
                inner.className = 'favicon-brand';

                const iconElement = document.createElement('i');
                iconElement.className = `sprite-fm-uni ${brand}`;
                inner.append(iconElement);
            }
            else {
                elem.classList.add('manual-favicon');

                const iconElement = document.createElement('i');
                iconElement.className = 'sprite-fm-mono icon-credit-card';
                inner.append(iconElement);
            }
        },

        getHostname(url) {

            if (typeof url === 'undefined' || url === '') {
                return '';
            }

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `http://${url}`;
            }

            const urlObj = tryCatch(() => new URL(url), false)();

            if (typeof urlObj === 'undefined') {
                return false;
            }

            return urlObj.hostname;
        },

        /**
         * Extracts the domain name from a given URL.
         *
         * @param {string} url - The URL from which to extract the domain name.
         * @param {boolean} [withTLD] - Return TLD with the domain
         * @returns {string|boolean} - The extracted domain name.
         */
        domainFromURL(url, withTLD) {

            withTLD = withTLD || false;
            const cleanedDomain = this.getHostname(url);

            if (!cleanedDomain) {
                return false;
            }

            // Extract the domain name part
            const domainParts = cleanedDomain.split('.');
            return this.getEffectiveDomain(domainParts, withTLD);
        },

        /**
         * Gets the effective domain name from the domain parts.
         *
         * @param {string[]} domainParts - The parts of the domain.
         * @param {boolean} [withTLD] - Return TLD with the domain
         * @returns {string} - The effective domain name.
         */
        getEffectiveDomain(domainParts, withTLD) {

            withTLD = withTLD || false;

            let tldIndex = domainParts.length - 1;
            while (tldIndex > 0) {
                const potentialTLD = domainParts.slice(tldIndex).join('.');
                if (mega.publicTLDs.has(potentialTLD)) {
                    tldIndex--;
                }
                else {
                    break;
                }
            }
            return withTLD ? domainParts.slice(tldIndex).join('.') : domainParts[tldIndex];
        },

        fullDomainFromURL(url) {

            const domain = this.getHostname(url);

            if (!domain) {
                return '';
            }

            return domain.replace(/^www\./, '');
        },

        isURL(url) {

            return /^(?:https?:\/{2})?[\w#%+.:=@~-]{1,256}\.(?:[a-z]{2,16}|(?:\d{1,3}.?){4})\b[\w#$%&*+,./:=?@~-]*$/
                .test(url.toLowerCase());
        },

        appendSpan(fragment, text, className) {

            const span = document.createElement('span');
            span.className = className;
            span.textContent = text;
            fragment.appendChild(span);
        },

        getCharacterType(char) {

            if (/[A-Za-z]/.test(char)) {
                return "letter";
            }
            if (/\d/.test(char)) {
                return "number";
            }
            return "special";
        },

        /**
         * Generate a DocumentFragment containing the string provided cut into span
         * @param {string} password - Password to colorize
         * @returns {DocumentFragment} - DocumentFragment containing the password
         */
        colorizedPassword(password) {

            const fragment = document.createDocumentFragment();

            let segment = "";
            let currentType = "";

            for (const char of password) {
                const type = this.getCharacterType(char);

                if (currentType && currentType === type) {
                    segment += char;
                }
                else {
                    if (segment) {
                        this.appendSpan(fragment, segment, currentType);
                    }
                    segment = char;
                    currentType = type;
                }
            }

            if (segment) {
                this.appendSpan(fragment, segment, currentType);
            }
            return fragment;
        },

        copyPMToClipboard(content, toastText, classname, timeout) {

            const success = clip(content);

            if (success && toastText) {

                mega.ui.toast.show(toastText, timeout);
            }

            return success;
        },

        getButton(container, type) {
            const parentWithButton = container.closest('.mega-component');
            return parentWithButton ? parentWithButton.componentSelector(`.mega-component.${type}`) : null;
        },

        toggleButtonState(container, type, disable) {
            const button = this.getButton(container, type);
            if (button) {
                button.disabled = disable;
            }
        },

        createMessage(message, type, iconHTML, extraClasses = '') {
            const messageElement = document.createElement('span');
            messageElement.className = `message ${type} ${extraClasses}`.trim();
            messageElement.textContent = message;
            messageElement.prepend(parseHTML(iconHTML));
            return messageElement;
        }
    });
});
