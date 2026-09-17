/** @property window.support */
lazy(self, 'support', () => {
    'use strict';

    let langGha, $deviceInput, $emailInput, acceptReadArticlesCheckbox, otpInputs,
        $defaultHiddenElements, $messageInputTextArea, successCtaContainer, supportType,
        $hideOnShowEmailVerifyForm, $hideOnEmailVerifyCall, submittedBlockPrimaryCta, submittedBlockSecondaryCta,
        $s4ConnectionInfoInput, $s4RequestId, $s4ResponseMessageInput, $s4MessageInput,
        $s4StartDatePicker, $s4EndDatePicker, s4StartTimePicker, s4EndTimePicker, selectedCategory,
        tooManyOtpResendMsgReqTimer, s4SubFormReady;
    let prevSelectedCategory = null;
    let prevSupportType = null;

    const ns = Object.create(null);
    const dom = Object.create(null);
    const s4ResponsePlaceholder = `Error Code: 404\n<Error>\n    <Code>NoSuchKey</Code>
    <Message>The specified key does not exist.</Message>\n    <Resource>/qwertsssy/plotter.html</Resource>
    <RequestId>FF00160007E902F8_</RequestId>\n</Error>`;

    const dds = {category: null, issue: null};
    const minLetters = 30;
    const undoHooksOnDiffSlugSelect = new Set();
    const s4EndpointCheckboxes = [];
    const attachments = [];
    const ATTACH_TOTAL_MAX = 10 * 1024 * 1024;
    const ATTACH_MAX_FILES = 5;
    const MIME_JPEG = 'image/jpeg';
    const MIME_TEXT = 'text/plain';
    const ATTACH_TYPES = Object.freeze([
        MIME_JPEG,
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/heic',
        'image/heif',
        'application/pdf',
        'application/json',
        'application/xml',
        MIME_TEXT,
        'text/csv'
    ]);
    const ATTACH_EXT_TYPES = Object.freeze({
        bmp: 'image/bmp',
        conf: MIME_TEXT,
        csv: 'text/csv',
        gif: 'image/gif',
        heic: 'image/heic',
        heif: 'image/heif',
        ini: MIME_TEXT,
        jfif: MIME_JPEG,
        jpe: MIME_JPEG,
        jpeg: MIME_JPEG,
        jpg: MIME_JPEG,
        json: 'application/json',
        log: MIME_TEXT,
        md: MIME_TEXT,
        pdf: 'application/pdf',
        pjp: MIME_JPEG,
        pjpeg: MIME_JPEG,
        png: 'image/png',
        txt: MIME_TEXT,
        webp: 'image/webp',
        xml: 'application/xml'
    });
    const attachTotal = () => attachments.reduce((n, f) => n + f.size, 0);
    const nameTaken = name => attachments.some(a => a.name === name);
    const attachType = file => {
        const type = String(file.type || '').toLowerCase();

        if (ATTACH_TYPES.includes(type)) {
            return type;
        }
        return ATTACH_EXT_TYPES[fileext(file.name)] || '';
    };

    // lang setup start

    /**
     * Convert webclient language codes to slugs recognised by help.mega.io.
     *
     * @param {string} langCode The two character language code used internally by webclient
     * @returns {string} The slug known by help.mega.io, or empty string (English)
     */
    const getKbLangSlug = (langCode) => {

        return {
            ar: 'ar',
            br: 'pt',
            cn: 'zh-hans',
            ct: 'zh-hant',
            de: 'de',
            es: 'es',
            fr: 'fr',
            ru: 'ru',
        }[langCode || lang] || '';
    };
    const mega_help_host = 'https://help.mega.io';
    const megakb_origin = `${mega_help_host}/${getKbLangSlug(window.kbLang)}`.replace(/\/*$/, '');

    l.support_page_para_two = escapeHTML(l.support_page_para_two)
        .replace('[A1]', `<a class="link" href="https://mega.io/pricing" target="_blank" rel="noopener">`)
        .replace('[/A1]', '</a>')
        .replace('[A2]', `<a class="link" href="${megakb_origin}" target="_blank" rel="noopener">`)
        .replace('[/A2]', '</a>');
    l.support_pg_paid_user_para_two = escapeHTML(l.support_pg_paid_user_para_two)
        .replace('[A1]', `<a class="link" href="${megakb_origin}" target="_blank" rel="noopener">`)
        .replace('[/A1]', '</a>');
    l.support_pg_verify_email_sub = escapeHTML(l.support_pg_verify_email_sub)
        .replace('[A]', `<a class="link" href="mailto:support@mega.io">`)
        .replace('[/A]', '</a>')
        .replace('[A1]', `<a class="link" href="${megakb_origin}" target="_blank" rel="noopener">`)
        .replace('[/A1]', '</a>');

    const _collators = new Map();
    const SORT_PREFIX = 'sup_';
    const stripSortPrefix = (v) => typeof v === 'string' && v.startsWith(SORT_PREFIX) ? v.slice(SORT_PREFIX.length) : v;

    /**
     * Returns a mapping of app language codes to valid Intl.Collator locales.
     * These locales are normalized BCP-47 tags suitable for sorting/localization.
     *
     * @returns string
     */
    const _getCollatorLangCode = (lang) => {

        if (lang === 'cn') {
            return 'zh-Hans-u-co-pinyin';
        }
        if (lang === 'ct') {
            return 'zh-Hant-u-co-pinyin';
        }
        if (lang === 'br') {
            return 'pt-BR';
        }

        return remappedLangLocales[lang] || mega.intl.locale;
    };
    const mGetCollator = tryCatch((lang) => {

        const locale = window.kbLang || _getCollatorLangCode(lang);
        if (!_collators.has(locale)) {
            _collators.set(locale, new Intl.Collator(locale, {sensitivity: 'base', numeric: true}));
        }

        return _collators.get(locale);
    });

    // lang setup done

    // S4 specific inputs/controls
    const s4UnknownEndPoint =  {e: '', r: l[7381], id: -1, name: 'unknown-endpoint', cls: 'endpoint-unknown'};
    const s4OtherEndPoint =
        {e: '', r: l.other_endpoint, id: -2, name: 'other-endpoint', cls: 'endpoint-other'};
    const S4_EXTRA_ENDPOINTS = [s4OtherEndPoint, s4UnknownEndPoint];
    const S4_ENDPOINTS = s4.endpoints.map(({id, host, label}) => ({e: host, r: label, id}));
    const endpointById = new Map([...S4_ENDPOINTS, ...S4_EXTRA_ENDPOINTS].map(p => [`${p.id}`, p]));
    const boxOf = $i => $i && $i.closest && $i.closest('.mega-input.box-style');
    const setFieldError = ($err, $box, hasError) => {
        if ($err && $err.length) {
            $err.toggleClass('hidden', !hasError);
        }
        if ($box && $box.length) {
            $box.toggleClass('error-border', hasError);
        }
    };
    const isEndpointsChecked = () => dom.$s4EndpointList.length &&
        $('.endpoint-checkbox input:checked', dom.$s4EndpointList).length;
    const attachErr = msg => {
        const {attachmentsError: err, dropzone} = dom;

        if (err) {
            if (msg) {
                err.querySelector('span').textContent = msg;
            }
            err.classList.toggle('hidden', !msg);
        }
        if (dropzone) {
            dropzone.classList.toggle('error-border', !!msg);
        }
    };
    const clearAllS4Errors = () => {
        if (!dom.$s4SubForm || !dom.$s4SubForm.length) {
            return;
        }
        setFieldError(dom.$s4EndpointsError, dom.$s4EndpointList, false);
        setFieldError(dom.$s4DateTimeError, null, false);
        dom.$s4DateTimeBoxes.removeClass('error-border');
        setFieldError(dom.$s4ConnectionError, boxOf($s4ConnectionInfoInput), false);
        setFieldError(dom.$s4RequestIdError, boxOf($s4RequestId), false);
        setFieldError(dom.$s4ResponseMessageError, dom.$s4ResponseMessageInfo, false);
        attachErr('');
        setFieldError(dom.$s4MessageError, dom.$s4Message, false);
    };
    const undoS4Handle = () => {
        $defaultHiddenElements = dom.$commonHidden;
        $defaultHiddenElements.toggleClass('hidden', !acceptReadArticlesCheckbox.checked);
        dom.$s4Only.addClass('hidden');
        clearAllS4Errors();
        undoHooksOnDiffSlugSelect.delete(undoS4Handle);
    };
    const S4_MAX_LEN = Object.freeze({connection: 400, requestId: 400, response: 2000, message: 5000});
    const maxCharsError = max => l.support_max_chars_error.replace('%1', mega.intl.decimal.format(max));
    const showFieldError = ($err, $box, msg) => {
        if (msg) {
            $('span', $err).text(msg);
        }
        setFieldError($err, $box, !!msg);
    };
    const stopEv = ev => {
        ev.preventDefault();
        ev.stopPropagation();
    };
    const safeFileName = name => M.getSafeName(name || 'file');
    const attachmentRow = (file, idx) => {
        const name = safeFileName(file.name);
        const li = mCreateElement('li', {class: 'attachment-row', 'data-idx': `${idx}`});
        const slug = tryCatch(() => fileIcon({name}))() || 'generic';

        mCreateElement('i', {class: `item-type-icon icon-${slug}-24`}, li);
        mCreateElement('span', {class: 'attachment-name'}, li).textContent = name;
        mCreateElement('span', {class: 'attachment-size'}, li).textContent = bytesToSize(file.size);

        const btn = mCreateElement('button', {
            type: 'button',
            class: 'attachment-remove',
            'aria-label': l.attachment_remove.replace('%1', name)
        }, li);
        mCreateElement('i', {class: `${mega.ui.sprites.mono} icon-dialog-close`}, btn);

        return li;
    };
    const renderAttachments = () => {
        const {attachmentList: list} = dom;

        list.textContent = '';
        for (let i = 0; i < attachments.length; ++i) {
            list.appendChild(attachmentRow(attachments[i], i));
        }
        dom.dropzone.classList.toggle('populated', attachments.length > 0);
    };
    const attachNames = a => a.slice(0, 3).join(', ') + (a.length > 3 ? ', \u2026' : '');
    const attachViolation = () => {
        const huge = attachments.find(f => f.size > ATTACH_TOTAL_MAX);

        if (huge) {
            return l.attachment_file_size
                .replace('%1', safeFileName(huge.name))
                .replace('%2', bytesToSize(ATTACH_TOTAL_MAX, 0));
        }
        if (attachments.length > ATTACH_MAX_FILES) {
            return l.attachment_max_files
                .replace('%1', ATTACH_MAX_FILES)
                .replace('%2', attachments.length - ATTACH_MAX_FILES);
        }
        if (attachTotal() > ATTACH_TOTAL_MAX) {
            return l.attachment_total_size.replace('%1', bytesToSize(ATTACH_TOTAL_MAX, 0));
        }
        return '';
    };
    const attachRejectMsg = rejected => {
        if (rejected.type.length) {
            return rejected.type.length > 1
                ? l.attachment_type_error_multi
                : l.attachment_type_error.replace('%1', rejected.type[0]);
        }
        if (rejected.empty.length) {
            return l.attachment_empty_error.replace('%1', attachNames(rejected.empty));
        }
        return '';
    };
    const syncAttachSubmit = () => {
        if (dom.$submitButton) {
            dom.$submitButton.toggleClass('disabled', !!attachViolation());
        }
    };

    /**
     * Re-render, then show whichever message applies.
     *
     * A blocking violation wins over add-time feedback: it is what stops submission and it has to
     * survive later renders, whereas a turned-away file is one-shot feedback.
     *
     * @param {String} [transient] Message about files that were not accepted at all
     * @returns {void}
     */
    const attachRefresh = transient => {
        renderAttachments();
        attachErr(attachViolation() || transient || '');
        syncAttachSubmit();
    };
    const promptDuplicate = name => new Promise(resolve => {
        let settled = false;
        const settle = choice => {
            if (!settled) {
                settled = true;
                resolve(choice);
            }
        };

        const dialog = new MDialog({
            dialogName: 'support-attachment-duplicate',
            dialogClasses: 'support-attachment-duplicate',
            icon: is_mobile ? `${mega.ui.sprites.mono} icon-alert-triangle-thin-outline` : undefined,
            closeIcon: 'icon-dialog-close-thin',
            ok: {label: l.attachment_replace, callback: () => settle('replace')},
            cancel: {
                label: l.attachment_keep_both,
                // The close X routes through the cancel action as well, only with status === false --
                // without this check, dismissing the dialog would silently keep both.
                callback: status => settle(status === false ? 'skip' : 'both')
            },
            // Desktop: overlay click and Escape bypass the cancel action and land here.
            // Mobile: reached after ok/cancel, which the settle() guard absorbs.
            onclose: () => settle('skip'),
            setContent() {
                const p = document.createElement('p');
                if (is_mobile) {
                    p.className = 'px-6';
                }
                p.textContent = l[16486].replace('%1', name);
                this.slot = p;
            }
        });

        dialog.title = l[16485];
        dialog.show();
    });
    const addAttachments = async files => {
        const rejected = {type: [], empty: []};

        for (let i = 0; i < files.length; ++i) {
            const f = files[i];

            // A drop bypasses the input's accept attribute, so the type has to be checked here regardless.
            if (!attachType(f)) {
                rejected.type.push(safeFileName(f.name));
                continue;
            }
            if (!f.size) {
                rejected.empty.push(safeFileName(f.name));
                continue;
            }

            const clash = attachments.findIndex(a => a.name === f.name);

            if (clash !== -1) {
                const choice = await promptDuplicate(safeFileName(f.name));

                if (choice === 'skip') {
                    continue;
                }
                if (choice === 'replace') {
                    attachments.splice(clash, 1, f);
                    attachRefresh();
                    continue;
                }

                let name = f.name;

                do {
                    name = fileconflict.getNewName(name);
                } while (nameTaken(name));

                Object.defineProperty(f, 'name', {value: name});
            }

            attachments.push(f);
            attachRefresh();
        }
        attachRefresh(attachRejectMsg(rejected));
    };
    const removeAttachment = idx => {
        attachments.splice(idx, 1);
        // Re-validate rather than clear: removing one of six files still leaves five over the limit.
        attachRefresh();

        const rows = dom.attachmentList.children;
        const next = rows[Math.min(idx, rows.length - 1)];
        const focus = next
            ? next.querySelector('.attachment-remove')
            : dom.dropzone.querySelector('button.browse');

        if (focus) {
            focus.focus();
        }
    };
    const bindDropzone = (zone, input) => {
        zone.addEventListener('click', ev => {
            const btn = ev.target.closest('.attachment-remove');

            if (btn) {
                removeAttachment(+btn.parentNode.dataset.idx);
            }
            else if (ev.target !== input && !ev.target.closest('.attachment-row')) {
                // Covers a click anywhere on the box, a click on "browse", and Enter/Space on "browse"
                // (keyboard activation dispatches a real bubbling click), plus tap-to-browse on mobile.
                // Skipping ev.target === input keeps the synthetic click below from bouncing back here.
                input.click();
            }
        });
        input.addEventListener('change', () => {
            addAttachments([...input.files]).catch(dump);
            // Without this, re-picking a file that was removed fires no change event at all.
            input.value = '';
        });

        let depth = 0;
        const setDrag = on => zone.classList.toggle('dragging', on);

        zone.addEventListener('dragenter', ev => {
            stopEv(ev);
            ++depth;
            setDrag(true);
        });
        zone.addEventListener('dragover', ev => {
            stopEv(ev);
            if (ev.dataTransfer) {
                ev.dataTransfer.dropEffect = 'copy';
            }
        });
        zone.addEventListener('dragleave', ev => {
            stopEv(ev);
            if (--depth < 1) {
                depth = 0;
                setDrag(false);
            }
        });
        zone.addEventListener('drop', ev => {
            stopEv(ev);
            // No dragleave fires after a drop, so reset the counter or the box stays in the drag-over state.
            depth = 0;
            setDrag(false);

            if (M.checkFolderDrop(ev)) {
                attachErr(l.attachment_folder_error);
                return;
            }
            // Read dataTransfer directly rather than via factory('file-list'), which re-sorts by size and
            // would scramble the order the files are listed in; its directory walk is moot as folders are
            // rejected above.
            addAttachments([...Object(ev.dataTransfer).files || []]).catch(dump);
        });
    };
    const createDropzone = () => {
        const zone = mCreateElement('div', {class: 'attachments-dropzone'}, dom.attachmentsHost);
        const input = mCreateElement('input', {
            type: 'file',
            multiple: 'multiple',
            // iOS resolves each accept entry to a UTI rather than matching filenames, so extensions it has no
            // UTI for fall back to public.data and end up greyed out in the picker.
            ...is_ios ? {} : {
                accept: [
                    ...ATTACH_TYPES,
                    ...Object.keys(ATTACH_EXT_TYPES).map(e => `.${e}`)
                ].join(',')
            },
            class: 'hidden',
            id: 'attachments-input'
        }, zone);
        const prompt = mCreateElement('div', {class: 'prompt'}, zone);
        const [pre, post] = is_mobile
            ? ['', l.attachments_tap_prompt]
            : l.attachments_drag_prompt.split(/\[A]|\[\/A]/).filter(Boolean);
        prompt.appendChild(document.createTextNode(pre || ''));
        mCreateElement('button', {
            type: 'button',
            class: 'link browse',
            'aria-describedby': 'attachments-hint'
        }, prompt).textContent = post || '';

        mCreateElement('span', {
            class: 'hint',
            id: 'attachments-hint'
        }, zone).textContent = l.attachments_max_size;

        dom.attachmentList = mCreateElement('ul', {class: 'attachment-list'}, zone);
        dom.dropzone = zone;

        const addMore = mCreateElement('button', {
            type: 'button',
            class: 'attachments-add-more'
        }, dom.attachmentsHost);
        mCreateElement('i', {class: `${mega.ui.sprites.mono} icon-plus-thin-outline`}, addMore);
        mCreateElement('span', {}, addMore).textContent = l.attachment_add_more;
        addMore.addEventListener('click', () => input.click());

        bindDropzone(zone, input);
    };

    /**
     * Encode one attachment for the 'sse' `f` array.
     *
     * readAsDataURL is used rather than ab_to_base64() because the latter goes through ab_to_str(), which
     * concatenates one String.fromCharCode per byte - a multi-second main thread stall for a 10MB file.
     *
     * @param {File} file The file to encode
     * @returns {Promise<Object>} {n, t, d}, with n/d as unpadded base64url
     */
    const fileToPayload = async(file) => {
        const url = await M.readBlob(file, 'readAsDataURL');

        return {
            n: base64urlencode(to8(safeFileName(file.name))),
            // Unencoded. Resolved rather than taken raw so a .log admitted as text/plain sends that,
            // instead of the empty File.type the browser gave it.
            t: attachType(file),
            // Single pass, matching base64urlencode()'s own transform. Padding only occurs at the end,
            // so stripping '=' globally is equivalent and avoids a second scan of a ~13MB string.
            d: url.slice(url.indexOf(',') + 1).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : '')
        };
    };
    const attachFiles = async(requestOptions) => {

        // Encoded together rather than one at a time: ATTACH_TOTAL_MAX and ATTACH_MAX_FILES cap this at
        // ~10MB of reads plus ~13MB of base64, so holding them all at once is cheap and needs no chaining.
        const out = await Promise.all(attachments.map(file => fileToPayload(file).catch(dump)));
        const failed = out.findIndex(payload => !payload);

        if (failed > -1) {
            attachErr(l.attachment_read_error);
            return false;
        }

        if (out.length) {
            requestOptions.f = out;
        }
        return true;
    };
    const s4FieldError = {
        connection: live => {
            const v = $s4ConnectionInfoInput.val();
            return !live && !v.trim()
                ? l.err_provide_connection_details
                : v.length > S4_MAX_LEN.connection ? maxCharsError(S4_MAX_LEN.connection) : '';
        },
        requestId: () => {
            const v = $s4RequestId.val();
            return v.length > S4_MAX_LEN.requestId ? maxCharsError(S4_MAX_LEN.requestId) : '';
        },
        response: () => {
            const v = $s4ResponseMessageInput.val();
            return v.length > S4_MAX_LEN.response ? maxCharsError(S4_MAX_LEN.response) : '';
        },
        message: live => {
            const v = $s4MessageInput.val();
            const t = v.trim();
            return !live && t.length < minLetters
                ? (t ? l.support_page_message_too_short_error : l.err_missing_issue_description)
                : v.length > S4_MAX_LEN.message ? maxCharsError(S4_MAX_LEN.message) : '';
        },
    };
    const s4FieldTargets = {
        connection: () => [dom.$s4ConnectionError, boxOf($s4ConnectionInfoInput)],
        requestId: () => [dom.$s4RequestIdError, boxOf($s4RequestId)],
        response: () => [dom.$s4ResponseMessageError, dom.$s4ResponseMessageInfo],
        message: () => [dom.$s4MessageError, dom.$s4Message],
    };
    const applyS4FieldError = (key, live) => {
        const msg = s4FieldError[key](live);
        const [$err, $box] = s4FieldTargets[key]();
        showFieldError($err, $box, msg);
        return !msg;
    };
    const s4DateTimeState = () => [
        [dom.$s4StartDateBox, !!datepickerUtils.getDateOnly($s4StartDatePicker)],
        [dom.$s4StartTimeBox, !!(s4StartTimePicker && s4StartTimePicker.value)],
        [dom.$s4EndDateBox, !!datepickerUtils.getDateOnly($s4EndDatePicker)],
        [dom.$s4EndTimeBox, !!(s4EndTimePicker && s4EndTimePicker.value)],
    ];
    const validateS4Form = () => {
        let valid = true;
        if (!isEndpointsChecked()) {
            setFieldError(dom.$s4EndpointsError, dom.$s4EndpointList, true);
            valid = false;
        }

        let dateTimeValid = true;
        for (const [$box, filled] of s4DateTimeState()) {
            $box.toggleClass('error-border', !filled);
            if (!filled) {
                dateTimeValid = false;
            }
        }
        if (!dateTimeValid) {
            setFieldError(dom.$s4DateTimeError, null, true);
            valid = false;
        }
        for (const key of Object.keys(s4FieldError)) {
            if (!applyS4FieldError(key, false)) {
                valid = false;
            }
        }

        return valid;
    };
    const buildS4ExtraData = () => {
        const x = Object.create(null);
        const b64 = v => base64urlencode(to8(v));
        const put = (key, val) => {
            val = (val || '').trim();
            if (val) {
                x[b64(key)] = b64(val);
            }
        };
        const endpoints = [];
        for (const c of dom.$s4SubForm[0].componentSelectorAll('.endpoint-checkbox')) {
            if (!c.checked) {
                continue;
            }
            const ep = endpointById.get(c.domNode.parentNode.dataset.id);
            if (ep) {
                endpoints.push(ep.e || ep.r);
            }
        }
        put('endpoints', endpoints.join(', '));

        const startDt = datepickerUtils.getDateTime($s4StartDatePicker, s4StartTimePicker);
        const endDt = datepickerUtils.getDateTime($s4EndDatePicker, s4EndTimePicker);
        const {pad2} = datepickerUtils;
        const localISO = d =>
            `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
            + `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
        if (startDt) {
            put('occurred_start', localISO(startDt));
        }
        if (endDt) {
            put('occurred_end', localISO(endDt));
        }

        put('connection', $s4ConnectionInfoInput.val());
        put('request_id', $s4RequestId.val());
        put('response_message', $s4ResponseMessageInput.val());

        return x;
    };
    const createTextareaInput = ($host, placeholder) => {
        const ta = mCreateElement('textarea', {
            class: 'textArea no-title-top',
            placeholder
        }, mCreateElement('div', {
            class: 'box-style mobile textarea-scroll'
        }, $host[0]));
        const $ta = $(ta);
        initTextareaScrolling($ta);
        return $ta;
    };
    const createDateInput = ($parent, frontInputID) => {
        const dateFormat = datepickerUtils.localeDateFormat();
        const datePlaceholder = datepickerUtils.localeDatePlaceholder();
        if (is_mobile) {
            const dp = new MegaMobileDatePicker({
                parentNode: $parent[0],
                componentClassname: 'date-picker s4-issue-date-picker',
                frontInputID
            });
            dp.min = '';
            dp.picker.max = MegaMobileDatePicker.tsToDate(Date.now() / 1000);
            dp.frontInput.$input.attr('placeholder', datePlaceholder);
            const $clearBtn = $(
                `<i class="${mega.ui.sprites.mono} icon-dialog-close action-icon clear-input hidden"></i>`
            ).appendTo(dp.frontInput.$wrapper);
            const refreshClearBtn = () => $clearBtn.toggleClass('hidden', !dp.value);
            dp.rebind('change.s4', () => {
                const ts = datepickerUtils.isoDateToTs(dp.picker.value);
                dp.picker.ts = ts;
                dp.frontInput.setValue(ts ? time2date(ts, 2) : '');
                refreshClearBtn();
            });
            $clearBtn.rebind('click.s4cleardate', (e) => {
                e.stopPropagation();
                dp.value = '';
                refreshClearBtn();
                // Fire a separate event so the cross-validation handler runs.
                // We avoid dispatching native 'change' here because to avoid the min being set on ios
                dp.trigger('clear');
            });
            dp.frontInput.$wrapper.rebind('tap', () => dp.show());
            return dp;
        }
        const input = mCreateElement('input', {
            type: 'text',
            id: frontInputID,
            placeholder: datePlaceholder,
            class: 'underlinedText no-title-top with-icon',
            'data-icon': 'sprite-fm-mono icon-calendar-01-thin-outline',
            'data-wrapper-class': 'box-style mobile',
            autocomplete: 'off',
            autocorrect: 'off',
            autocapitalize: 'off',
            spellcheck: 'false'
        }, $parent[0]);
        const megaInput = new mega.ui.MegaInputs($(input));
        const $picker = megaInput.$input;
        const $dateIcon = $('.icon-calendar-01-thin-outline', megaInput.$wrapper);
        $dateIcon.rebind('mousedown.s4dateicon', e => e.preventDefault());
        $dateIcon.rebind('mouseup.s4dateicon', e => e.stopPropagation());
        $dateIcon.rebind('click.s4dateicon', () => $picker.focus());
        M.require('datepicker_js').done(() => {
            if (!$picker[0].isConnected) {
                return;
            }
            $picker.datepicker({
                dateFormat,
                daysField: 'daysShort',
                uppercaseDayNames: false,
                maxDate: new Date(),
                autoClose: true,
                toggleSelected: false,
                firstDay: 0,
                classes: 's4-issue-date-calendar',
                // do below because AirDatepicker does not fire change on select
                onSelect: () => $picker.trigger('change'),
                prevHtml: '<i class="sprite-fm-mono icon-chevron-right-thin-outline"></i>',
                nextHtml: '<i class="sprite-fm-mono icon-chevron-right-thin-outline"></i>',
                setPosition($datepicker) {
                    const off = $parent.offset();
                    $datepicker[0].style.left = off.left + 'px';
                    $datepicker[0].style.top = (off.top + $parent.outerHeight() + 8) + 'px';
                }
            });
            datepickerUtils.enforceTypedDate($picker);
        });
        return $picker;
    };
    const s4SubFormUtils = Object.assign(Object.create(null), {
        clamping: false,
        setEndDatePickerMin: (startDate) => {
            if (is_mobile) {
                $s4EndDatePicker.min = startDate
                    ? MegaMobileDatePicker.tsToDate(startDate.getTime() / 1000)
                    : '';
                return;
            }
            const inst = $s4EndDatePicker.data('datepicker');
            if (inst) {
                inst.update('minDate', startDate || '');
            }
        },
        setEndDate: (date) => {
            const dt = datepickerUtils.dateOnly(date);
            if (is_mobile) {
                $s4EndDatePicker.value = dt.getTime() / 1000;
                return;
            }
            const inst = $s4EndDatePicker.data('datepicker');
            if (inst) {
                inst.selectDate(dt);
            }
            else {
                $s4EndDatePicker
                    .val(datepickerUtils.formatLocaleDate(dt))
                    .trigger('change');
            }
        },
        clampEnd: () => {
            if (s4SubFormUtils.clamping) {
                return;
            }
            const startDt = datepickerUtils.getDateTime($s4StartDatePicker, s4StartTimePicker);
            if (!startDt) {
                return;
            }
            const endDt = datepickerUtils.getDateTime($s4EndDatePicker, s4EndTimePicker);
            if (!endDt || endDt >= startDt) {
                return;
            }
            const endDate = datepickerUtils.dateOnly(endDt);
            const startDate = datepickerUtils.dateOnly(startDt);
            s4SubFormUtils.clamping = true;
            tryCatch(() => {
                if (endDate.getTime() !== startDate.getTime()) {
                    s4SubFormUtils.setEndDate(startDate);
                }
                // After the date snap, end may already be >= start (e.g. when
                // start time is unset, both are 00:00 on the same day). Only
                // touch the time field if it's still needed so we don't fill in
                // a time the user deliberately left blank.
                if (datepickerUtils.getDateTime($s4EndDatePicker, s4EndTimePicker) < startDt) {
                    s4EndTimePicker.setTime(startDt.getHours(), startDt.getMinutes());
                }
            })();
            s4SubFormUtils.clamping = false;
        },
        onStartChange: () => {
            s4SubFormUtils.setEndDatePickerMin(datepickerUtils.getDateOnly($s4StartDatePicker));
            s4SubFormUtils.clampEnd();
        }
    });
    const s4Handle = () => {
        undoHooksOnDiffSlugSelect.add(undoS4Handle);
        $defaultHiddenElements.addClass('hidden');
        $defaultHiddenElements = dom.$s4Only.add(dom.$submitButton).add(dom.attachmentsWrapper);

        if (dom.$messageError) {
            dom.$messageError.addClass('hidden');
        }
        if (dom.$messageTxtAreaWrapper) {
            dom.$messageTxtAreaWrapper.removeClass('error-border');
        }
        if (s4SubFormReady) {
            return;
        }

        // makeS4EndpointList - begin
        S4_ENDPOINTS.forEach((p) => {
            const item = mCreateElement('div', {
                class: 'flex endpoint-item',
                'data-id': `${p.id}`
            }, dom.$s4EndpointList[0]);
            s4EndpointCheckboxes.push(new MegaCheckbox({
                parentNode: item,
                componentClassname: 'mega-checkbox endpoint-checkbox',
                checkboxName: p.e,
                labelTitle: undefined,
                checked: false
            }));
            const content = mCreateElement('div', {class: 'flex flex-column endpoint-content'}, item);
            mCreateElement('div', {class: 'bucket-title'}, content).textContent = p.e;
            mCreateElement('div', {class: 'bucket-subtitle'}, content).textContent = p.r || '';
        });

        // add list items for the endpoints without a hostname
        for (const p of S4_EXTRA_ENDPOINTS) {
            const item = mCreateElement('div', {
                class: `flex endpoint-item ${p.cls}`,
                'data-id': `${p.id}`
            }, dom.$s4EndpointList[0]);
            s4EndpointCheckboxes.push(new MegaCheckbox({
                parentNode: item,
                componentClassname: 'mega-checkbox endpoint-checkbox',
                checkboxName: p.name,
                labelTitle: undefined,
                checked: false
            }));
            const content = mCreateElement('div', {class: 'flex flex-column endpoint-content'}, item);
            mCreateElement('div', {class: 'bucket-title'}, content).textContent = p.r;
        }

        // makeS4EndpointList - end

        // s4 inputs
        if (!$s4ConnectionInfoInput) {
            const input = mCreateElement('input', {
                type: 'text',
                class: 'underlinedText no-title-top',
                placeholder: l.s4_connection_info_placeholder,
                'data-wrapper-class': 'box-style mobile'
            }, dom.$s4ConnectionInfo[0]);
            $s4ConnectionInfoInput = new mega.ui.MegaInputs($(input)).$input;
        }
        if (!$s4RequestId) {
            const input = mCreateElement('input', {
                type: 'text',
                class: 'underlinedText no-title-top',
                placeholder: l.request_id_placeholder,
                'data-wrapper-class': 'box-style mobile'
            }, dom.$s4RequestIdInfo[0]);
            $s4RequestId = new mega.ui.MegaInputs($(input)).$input;
        }
        if (!$s4ResponseMessageInput) {
            $s4ResponseMessageInput = createTextareaInput(dom.$s4ResponseMessageInfo, s4ResponsePlaceholder);
        }
        if (!$s4MessageInput) {
            $s4MessageInput = createTextareaInput(dom.$s4Message, l.s4_message_placeholder);
        }
        if (!$s4StartDatePicker) {
            $s4StartDatePicker = createDateInput(dom.$s4StartDateInput, 's4-issue-start-date');
        }
        if (!s4StartTimePicker) {
            s4StartTimePicker = new MegaTimePicker({
                parentNode: dom.$s4StartTimeInput[0],
                frontInputID: 's4-issue-start-time'
            });
        }
        if (!$s4EndDatePicker) {
            $s4EndDatePicker = createDateInput(dom.$s4EndDateInput, 's4-issue-end-date');
        }
        if (!s4EndTimePicker) {
            s4EndTimePicker = new MegaTimePicker({
                parentNode: dom.$s4EndTimeInput[0],
                frontInputID: 's4-issue-end-time'
            });
        }
        const dateTimeSelector = '.mega-input.box-style';
        dom.$s4DateTimeBoxes = $(dateTimeSelector, dom.$s4DateTimeInputs);
        dom.$s4StartDateBox = $(dateTimeSelector, dom.$s4StartDateInput);
        dom.$s4StartTimeBox = $(dateTimeSelector, dom.$s4StartTimeInput);
        dom.$s4EndDateBox = $(dateTimeSelector, dom.$s4EndDateInput);
        dom.$s4EndTimeBox = $(dateTimeSelector, dom.$s4EndTimeInput);

        const {onStartChange, clampEnd} = s4SubFormUtils;
        s4SubFormUtils.clamping = false;

        $s4StartDatePicker.rebind('change.s4cross', onStartChange);
        $s4EndDatePicker.rebind('change.s4cross', clampEnd);
        if (is_mobile) {
            $s4StartDatePicker.rebind('clear.s4cross', onStartChange);
            $s4EndDatePicker.rebind('clear.s4cross', clampEnd);
        }

        s4StartTimePicker.on('change', onStartChange);
        s4EndTimePicker.on('change', clampEnd);
        onStartChange();

        if (acceptReadArticlesCheckbox.checked) {
            $defaultHiddenElements.removeClass('hidden');
        }
        else {
            $defaultHiddenElements.addClass('hidden');
        }

        const onEndpointInput = () => {
            if (isEndpointsChecked()) {
                setFieldError(dom.$s4EndpointsError, dom.$s4EndpointList, false);
            }
        };
        dom.$s4EndpointList[0].componentSelectorAll('.endpoint-checkbox')
            .forEach(c => c.on('toggle', onEndpointInput));
        const clearDateTimeErrIfFilled = () => {
            let allFilled = true;
            for (const [$box, filled] of s4DateTimeState()) {
                if (filled) {
                    $box.removeClass('error-border');
                }
                else {
                    allFilled = false;
                }
            }
            if (allFilled) {
                setFieldError(dom.$s4DateTimeError, null, false);
            }
        };
        $s4StartDatePicker.rebind('change.s4err', clearDateTimeErrIfFilled);
        $s4EndDatePicker.rebind('change.s4err', clearDateTimeErrIfFilled);
        if (is_mobile) {
            $s4StartDatePicker.rebind('clear.s4err', clearDateTimeErrIfFilled);
            $s4EndDatePicker.rebind('clear.s4err', clearDateTimeErrIfFilled);
        }

        s4StartTimePicker.on('change', clearDateTimeErrIfFilled);
        s4EndTimePicker.on('change', clearDateTimeErrIfFilled);
        $s4ConnectionInfoInput.rebind('input.s4err', () => applyS4FieldError('connection', true));
        $s4RequestId.rebind('input.s4err', () => applyS4FieldError('requestId', true));
        $s4ResponseMessageInput.rebind('input.s4err', () => applyS4FieldError('response', true));
        $s4MessageInput.rebind('input.s4err', () => applyS4FieldError('message', true));

        s4SubFormReady = true;
    };
    const HOOK_DEFS = [
        {
            fn: s4Handle,
            mapping: {
                en: '356', id: '356', it: '356', jp: '356', kr: '356', nl: '356', pl: '356', ro: '356', th: '356',
                vi: '356', tr: '356',
                de: '29', ar: '29', br: '29', cn: '29', ct: '29', es: '29', fr: '29', ru: '29',
            }
        },
    ];
    const slugToHook = new Map(
        HOOK_DEFS.flatMap(({fn, mapping}) =>
            Object.entries(mapping).map(([lng, id]) => [`${lng}-${id}`, fn])
        )
    );
    const undoHooks = () => undoHooksOnDiffSlugSelect.forEach(h => h());
    const execHook = (lng, id, ...args) => {
        const hook = slugToHook.get(`${lng}-${id}`);
        if (hook) {
            hook(...args);
        }
        else {
            undoHooks(); // undo all. for individual unhook, an unhook fn can be added and invoked as needed.
        }
    };
    const toDropdownOptions = (items, prefix = SORT_PREFIX, key = 'id', label = 'name') => {

        const collator = mGetCollator(lang);
        return Object.values(items)
            .sort((a, b) => {

                // "Other" (id -1) is always pinned at the end
                if (a[key] === -1) {
                    return 1;
                }
                if (b[key] === -1) {
                    return -1;
                }
                return collator ? collator.compare(a[label], b[label]) : M.compareStrings(a[label], b[label], -1);
            })
            .reduce((acc, v) => {

                acc[`${prefix}${v[key]}`] = v[label];
                return acc;
            }, {});
    };
    const collateDomRefs = () => {
        dom.$mainLayout = $('#mainlayout').addClass('get-support');
        dom.$page = $('.get-support-block', dom.$mainLayout);
        dom.$commonHidden = $('.common-hidden', dom.$page);
        dom.$otherHidden = $('.other-hidden', dom.$page);
        // submit flow
        dom.$category = $('.support-category', dom.$page);
        dom.$issue = $('.support-issue', dom.$page);
        dom.$issueBlock = dom.$issue.closest('.input-block');
        dom.$device = $('.support-device', dom.$page);
        dom.$related = $('.support-related', dom.$page);
        dom.$relatedList = $('.list', dom.$related);
        dom.$articlesRead = $('.accept-articles-read', dom.$page);
        dom.$message = $('.support-message', dom.$page);
        dom.$messageTxtAreaWrapper = $('.message', dom.$message);
        dom.$messageError = $('.error', dom.$message);
        dom.$submitButton = $('button.cta', dom.$page);
        dom.$submissionFlow = $('.submission.request', dom.$page);
        dom.$successBlock = $('.success-block', dom.$page);
        dom.$verifiedEmail = $('.verified-email span', dom.$page);
        dom.$deviceInfoInputWrapper = $('.device-info', dom.$device);
        // verify flow
        dom.$verifyFlow = $('.verify-flow', dom.$page);
        dom.$email = $('.submit-email', dom.$page);
        dom.$emailInputWrapper = $('.email-input', dom.$verifyEmailForm);
        dom.$emailError = $('.error', dom.$email);
        dom.$errEmailInput = $('span', dom.$emailError);
        dom.$verifyFlowLanding = $('.verify-flow.landing', dom.$page);
        dom.$showVerifyFormLink = $('.show-form', dom.$verifyFlowLanding);
        dom.$verifyEmailForm = $('.verify-flow.email', dom.$page);
        dom.$verifyOtpForm = $('.verify-flow.otp', dom.$page);
        dom.$otpSentMessage = $('.otp-sent-message', dom.$verifyOtpForm);
        dom.$otpInputs = $('input.otp', dom.$verifyOtpForm);
        dom.$verifyOtpInput = $('button.cta.verify', dom.$verifyOtpForm);
        dom.$doVerifyEmailButton = $('.cta.verify-email', dom.$verifyEmailForm);
        dom.$errOnVerificationRequest = $('.error.api', dom.$verifyEmailForm);
        dom.$errOnVerificationRequestMsg = $('span', dom.$errOnVerificationRequest);
        dom.$tooManyOtpRequests = $('.too-many-otp-req', dom.$verifyOtpForm);
        dom.$tooManyOtpRequestsWarn = $('.timer', dom.$tooManyOtpRequests);
        dom.$changeEmailButton = $('.cta.change-email', dom.$verifyOtpForm);
        dom.$resendOtpCta = $('button.cta.resend', dom.$verifyOtpForm);
        dom.$otpError = $('.fields .error', dom.$verifyOtpForm);
        dom.$otpErrorMessage = $('span', dom.$otpError);
        // s4 sub-form
        dom.$s4SubForm = $('.s4-issue-form', dom.$page);
        dom.$s4EndpointList = $('.endpoints', dom.$s4SubForm);
        dom.$s4ConnectionInfo = $('.connection-info', dom.$s4SubForm);
        dom.$s4RequestIdInfo = $('.req-id-info', dom.$s4SubForm);
        dom.$s4ResponseMessageInfo = $('.response-message', dom.$s4SubForm);
        // The description and the S4 banner live outside .s4-issue-form so they can follow the
        // attachments field, so they are scoped to the page and hidden via the .s4-only set.
        dom.$s4Only = $('.s4-only', dom.$page);
        dom.$s4Message = $('.s4-message', dom.$page);
        dom.$s4TimeInputs = $('.time-inputs', dom.$s4SubForm);
        dom.$s4StartDateInput = $('.time-input-row.start .date-input', dom.$s4TimeInputs);
        dom.$s4StartTimeInput = $('.time-input-row.start .time-input', dom.$s4TimeInputs);
        dom.$s4EndDateInput = $('.time-input-row.end .date-input', dom.$s4TimeInputs);
        dom.$s4EndTimeInput = $('.time-input-row.end .time-input', dom.$s4TimeInputs);
        dom.$s4DateTimeInputs = dom.$s4StartDateInput
            .add(dom.$s4StartTimeInput)
            .add(dom.$s4EndDateInput)
            .add(dom.$s4EndTimeInput);
        dom.$s4EndpointsError = $('.endpoints-error', dom.$s4SubForm);
        dom.$s4DateTimeError = $('.datetime-error', dom.$s4SubForm);
        dom.$s4ConnectionError = $('.connection-error', dom.$s4SubForm);
        dom.$s4RequestIdError = $('.req-id-error', dom.$s4SubForm);
        dom.$s4ResponseMessageError = $('.response-message-error', dom.$s4SubForm);
        dom.attachmentsWrapper = dom.$submissionFlow[0].querySelector('.attachments-wrapper');
        dom.attachmentsHost = dom.attachmentsWrapper.querySelector('.attachments');
        dom.attachmentsError = dom.attachmentsWrapper.querySelector('.attachments-error');
        dom.$s4MessageError = $('.s4-message-error', dom.$page);
        dom.$inputHosts = dom.$s4ConnectionInfo
            .add(dom.$s4RequestIdInfo)
            .add(dom.attachmentsHost)
            .add(dom.$s4ResponseMessageInfo)
            .add(dom.$s4Message)
            .add(dom.$s4DateTimeInputs)
            .add(dom.$deviceInfoInputWrapper)
            .add(dom.$messageTxtAreaWrapper)
            .add(dom.$emailInputWrapper)
            .add(dom.$relatedList);
        dom.$textareaHosts = dom.$s4ResponseMessageInfo
            .add(dom.$s4Message)
            .add(dom.$messageTxtAreaWrapper);
        // buttons whose handlers get .off()-ed on destroy
        dom.$ctaButtons = dom.$submitButton
            .add(dom.$showVerifyFormLink)
            .add(dom.$doVerifyEmailButton)
            .add(dom.$changeEmailButton)
            .add(dom.$verifyOtpInput)
            .add(dom.$resendOtpCta);
    };
    const createMobileDropdown = ($node, items, selected, onSelected, titleText) => new MegaMobileDropdown({
        selected,
        sheetHeight: 'auto',
        invisible: true,
        parentNode: $node[0],
        dropdownItems: items,
        dropdownOptions: {
            titleText,
            placeholderText: l[1278]
        },
        onSelected,
        listContainerClass: 'support-select'
    });
    const createSupportDropdown = (type, items, selected, onSelected) => {

        const $node = dom[`$${type}`];
        const prefixedSelected = selected === undefined ? selected : `${SORT_PREFIX}${selected}`;
        if (is_mobile) {
            if (dds[type]) {
                dds[type].destroy();
            }

            dds[type] = createMobileDropdown($node, items, prefixedSelected, onSelected, l[type]);
            $node.rebind('click.support', () => dds[type].trigger('dropdown'));

            return;
        }

        $('.mega-input-dropdown .dropdown-scroll.flex.flex-column', $node).empty();
        window.createDropdown($('.mega-input-dropdown', $node), {
            placeholder: l[1278],
            items,
            selected: `${prefixedSelected}`
        });
        bindDropdownEvents($node, undefined, undefined, undefined, true);
        $node.rebind('click.support', $e => {

            const {value} = $e.target.dataset;
            if (!value) {
                return;
            }
            onSelected(stripSortPrefix(value));
        });
    };
    const showVerifyEmailForm = e => {

        e.preventDefault();
        $hideOnShowEmailVerifyForm.addClass('hidden');
        dom.$verifyEmailForm.removeClass('hidden');
        $emailInput.focus();
        $emailInput.val('');
        dom.$tooManyOtpRequests.addClass('hidden');
        dom.$resendOtpCta.removeClass('hidden');
        clearInterval(tooManyOtpResendMsgReqTimer);
    };
    const clearOtpInputs = () => otpInputs.forEach(o => o.$input.val('').megaInputsHideError());
    const beginEmailVerification = async() => {

        const emailValue = $emailInput.val().trim();
        const safeEmail = $('<span class="email">').text(emailValue).prop('outerHTML');
        dom.$otpSentMessage
            .safeHTML(l.support_pg_verify_otp_description.replace('[E][/E]', safeEmail));
        dom.$errOnVerificationRequestMsg.text('');
        dom.$tooManyOtpRequests.addClass('hidden');
        dom.$resendOtpCta.removeClass('hidden');
        clearInterval(tooManyOtpResendMsgReqTimer);
        $hideOnEmailVerifyCall.addClass('hidden');
        clearOtpInputs();
        dom.$errEmailInput.text('');
        if (emailValue === '' || !isValidEmail(emailValue)) {
            dom.$errEmailInput.text(emailValue === '' ? l.err_no_email_provided : l[1100]);
            dom.$emailError.removeClass('hidden');
            $emailInput.focus();
            return false;
        }

        dom.$emailError.addClass('hidden');
        loadingDialog.show();
        const response = await api.send({a: 'ssv', e: emailValue}).catch(ex => {

            if (ex === -26) { // mfa needed
                dom.$verifyEmailForm.addClass('hidden');
                clearOtpInputs();
                dom.$verifyOtpForm.removeClass('hidden');
                return;
            }

            if (ex === -6) {
                dom.$errOnVerificationRequest.removeClass('hidden');
                dom.$errOnVerificationRequestMsg.text(l.err_too_many_submissions_via_email);
                dom.$tooManyOtpRequests.removeClass('hidden');
                dom.$resendOtpCta.addClass('hidden');

                let totalSeconds = 10 * 60;
                dom.$tooManyOtpRequestsWarn.safeHTML(
                    l.too_many_otp_resend_requests_sub.replace('%1', '<b>10:00</b>')
                );
                tooManyOtpResendMsgReqTimer = setInterval(() => {
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    dom.$tooManyOtpRequestsWarn.safeHTML(
                        l.too_many_otp_resend_requests_sub.replace('%1', `<b class="caption-b-l">${formatted}</b>`)
                    );
                    totalSeconds--;
                    if (totalSeconds < 0) {
                        dom.$tooManyOtpRequests.addClass('hidden');
                        dom.$resendOtpCta.removeClass('hidden');
                        dom.$tooManyOtpRequestsWarn.empty();
                        clearInterval(tooManyOtpResendMsgReqTimer);
                    }
                }, 1000);
            }
            else {
                tell(ex);
            }
        });
        loadingDialog.hide();

        if (response === 0) {
            await ns._initLoggedInUI(emailValue);
        }
    };
    const doVerifyOtp = async() => {

        const e = $emailInput.val().trim();
        const otp = otpInputs.map(i => i.$input.val()).join('');
        if (otp.length < 4) {
            otpInputs[0].$input.megaInputsShowError(l.err_otp_incomplete);
            return;
        }

        loadingDialog.show();
        const errMsgs = {'-11': l.err_otp_invalid, '-8': l.err_otp_expired, '-4': l.err_too_many_submissions_via_email};
        const response = await api.send({a: 'ss2fa', c: otp, e})
            .catch(ex => {

                // e === -2 => invalid args
                if (errMsgs[ex]) {
                    otpInputs[0].$input.megaInputsShowError(errMsgs[ex]);
                }
                else {
                    tell(ex);
                }
            });
        loadingDialog.hide();
        if (response === 0) {
            await ns._initLoggedInUI(e);
        }
    };
    const createOtpInput = () => {

        otpInputs = new mega.ui.MegaInputs(dom.$otpInputs, {
            onShowError: (m) => {

                otpInputs.forEach(o => o.$input.addClass('error'));
                dom.$otpError.removeClass('hidden');
                dom.$otpErrorMessage.text(m);
                loadingDialog.hide();
            },
            onHideError: () => {

                otpInputs.forEach(o => o.$input.removeClass('error'));
                dom.$otpError.addClass('hidden');
                dom.$otpErrorMessage.text('');
                loadingDialog.hide();
            },
        });
        otpInputs = otpInputs.reverse();

        // Bind fieldset events
        const len = otpInputs.length;
        for (let i = 0; i < len; i++) {

            const current = otpInputs[i];
            const prev = otpInputs[Math.max(0, i - 1)];
            const next = otpInputs[i + 1];
            const isLast = i === otpInputs.length - 1;

            current.$input.rebind('keydown.verifyPin', (e) => {

                if (e.key === 'Backspace' && e.target.value === '') {
                    prev.$input.focus();
                }
                if (e.key === 'Enter') {
                    doVerifyOtp().catch(dump);
                }
            });
            current.$input.rebind('focus.selectValue', e => e.target.select());
            current.$input.rebind('input.fieldsetAction', e => {

                const [head, ...rest] = e.target.value;
                current.$input.megaInputsHideError();
                e.target.value = head || '';
                if (head !== undefined && !isLast && next) {
                    next.$input.focus();
                    if (rest.length) {
                        next.$input.val(rest.join('')).trigger('input.fieldsetAction');
                    }
                }
            }).val('').megaInputsHideError();
        }
    };
    const getSupportData = async() => {

        const response = await api.send({ a: 'gha', l: window.kbLang || lang }).catch(tell) || -1;
        if (response === -1 || !Array.isArray(response)) {
            return false;
        }
        const other = { id: -1, name: l[2007], parentId: 0, popularArticles: [] };
        const [language, raw] = response;
        dom.$category.closest('.input-block').removeClass('hidden');
        langGha = language;

        const menu = Object.create(null);
        for (const item of Object.values(raw)) {

            const {id, parentId} = item;
            if (parentId === 0) {
                menu[id] = {...item, subCategories: menu[id] && menu[id].subCategories || {}};
                continue;
            }
            if (!menu[parentId]) {
                menu[parentId] = {subCategories: {}};
            }
            menu[parentId].subCategories[id] = item;
        }
        for (const id in menu) {

            if (!Object.keys(menu[id].subCategories).length) {
                delete menu[id];
            }
        }
        menu[-1] = other;

        return {menu, raw: {'-1': other, ...raw}};
    };
    const renderRelatedArticles = (raw, id) => {

        raw[id].popularArticles.forEach(p => {

            const listItem = mCreateElement(
                'div',
                { class: 'wrapper flex items-center' },
                [mCreateElement('i', { class: 'sprite-fm-mono icon-dot' })],
                dom.$relatedList[0]
            );
            const parsed = new URL(p.link, window.location.origin);
            MegaLink.factory({
                parentNode: listItem,
                text: p.title,
                type: 'text',
                target: '_blank',
                href: `https://help.mega.io${parsed.pathname}`,
                componentClassname: 'related-article'
            });
        });
        dom.$related.removeClass('hidden');
    };
    const onIdleCallback = async() => {
        await sleep(0.3);
        $('#fmholder, #pageholder').addClass('hidden');
        $('#startholder').removeClass('hidden');
        if (!dom.$successBlock.hasClass('hidden')) {
            dom.$successBlock.addClass('hidden');
            if (u_attr) {
                dom.$submissionFlow.removeClass('hidden');
            }
            else {
                dom.$verifyFlow.removeClass('hidden');
            }
        }
        document.body.classList.add('bottom-pages');
        topmenuUI();
        loadingDialog.hide();
    };

    // public function to start the logged-in/verified email flow
    ns._initLoggedInUI = async function(verifiedEmail) {

        dom.$successBlock.addClass('hidden');
        // render success block (hidden)
        successCtaContainer = document.querySelector('.success-block .buttons');
        if (!submittedBlockPrimaryCta) {
            submittedBlockPrimaryCta = MegaLink.factory({
                parentNode: successCtaContainer,
                text: l[164],
                href: 'fm',
                componentClassname: 'cta mio-button lg primary',
                icon: 'sprite-fm-mono icon-cloud-drive',
            });
        }
        if (!submittedBlockSecondaryCta) {
            submittedBlockSecondaryCta = MegaLink.factory({
                parentNode: successCtaContainer,
                text: l[384],
                href: window.kbLang ? megakb_origin : mega_help_host,
                target: '_blank',
                componentClassname: 'cta mio-button lg secondary',
                icon: 'sprite-fm-mono icon-info',
            });
        }
        if (verifiedEmail) {
            dom.$verifiedEmail.text(verifiedEmail);
            dom.$verifiedEmail.closest('.verified-email').removeClass('hidden');
        }
        dom.$verifyFlow.addClass('hidden');
        dom.$submissionFlow.removeClass('hidden');
        if (!$defaultHiddenElements) {
            $defaultHiddenElements = dom.$commonHidden;
        }

        loadingDialog.show();
        const response = await getSupportData();
        if (!response) {
            loadingDialog.hide();
            return;
        }
        const {raw, menu} = response;
        const categoryOptions = toDropdownOptions(menu);
        const issueClick = id => {

            if (is_mobile) {
                id = stripSortPrefix(dds.issue.selected);
            }

            dom.$relatedList.empty();
            supportType = Number(id);
            renderRelatedArticles(raw, id);
            dom.$articlesRead.removeClass('hidden');
            dom.$issue.children('span').first().addClass('dirty');

            if (is_mobile) {
                dom.$issue.children('span').first().text(raw[id].name);
            }
        };
        const createIssueDropDown = (id, selected) => {

            if (id === '-1') {
                supportType = -1;
                $defaultHiddenElements.removeClass('hidden');
                dom.$otherHidden.addClass('hidden');
                return;
            }

            createSupportDropdown('issue', toDropdownOptions(menu[id].subCategories), selected, issueClick);
            if (prevSupportType) {
                const supId = prevSupportType;
                prevSupportType = null;
                issueClick(`${supId}`);
            }
            else {
                dom.$issueBlock.removeClass('hidden');
                if (acceptReadArticlesCheckbox) {
                    acceptReadArticlesCheckbox.input.classList.add('hidden');
                    acceptReadArticlesCheckbox.checked = false;
                }
                $(dom.$articlesRead).add($defaultHiddenElements).addClass('hidden');
            }
        };
        const categoryClick = id => {
            id = is_mobile ? stripSortPrefix(dds.category.selected) : id;
            if (selectedCategory === id) {
                return false;
            }
            if (is_mobile) {
                dom.$issue.children('span').first().text(l[1278]);
            }

            selectedCategory = id;
            supportType = '';
            dom.$relatedList.empty();
            dom.$related.addClass('hidden');
            undoHooks();
            createIssueDropDown(id);
            dom.$category.children('span').first().addClass('dirty');

            if (is_mobile) {
                dom.$category.children('span').first().text(raw[id].name);
            }

            execHook(window.kbLang || lang, id);
        };
        const submit = async() => {

            const emailValue = verifiedEmail || u_type && u_attr && u_attr.email;
            const isS4Flow = s4SubFormReady && !dom.$s4SubForm.hasClass('hidden');

            if (isS4Flow && !validateS4Form()) {
                return false;
            }

            // Count/size limits are validated rather than enforced on add, so this is what actually
            // stops an over-limit set being sent. Kept as a hard guard, not just the disabled class.
            const violation = attachViolation();

            if (violation) {
                attachErr(violation);
                syncAttachSubmit();
                if (dom.dropzone) {
                    dom.dropzone.scrollIntoView({block: 'center'});
                }
                return false;
            }

            const message = isS4Flow ? $s4MessageInput.val().trim() : $messageInputTextArea.val().trim();

            dom.$messageError.addClass('hidden');
            if (!isS4Flow && message.length < minLetters) {
                $messageInputTextArea.focus();
                dom.$messageError.removeClass('hidden');
                dom.$messageTxtAreaWrapper.addClass('error-border');
                return false;
            }
            dom.$submitButton.addClass('disabled');
            const requestOptions = {
                a: 'sse',
                v: 2,
                m: base64urlencode(to8(message)),
                c: supportType,
                e: emailValue,
                l: langGha
            };
            if (isS4Flow) {
                requestOptions.x = buildS4ExtraData();
            }
            else {
                requestOptions.d = base64urlencode(to8($deviceInput.val().trim()));
            }
            loadingDialog.show();

            // Encoded here rather than on add: peak memory is the same either way, but at this point the
            // loading dialog is up to account for the pause.
            if (!await attachFiles(requestOptions)) {
                loadingDialog.hide();
                dom.$submitButton.removeClass('disabled');
                return false;
            }
            const response = await api.req(requestOptions, {
                // The payload can reach tens of MB; skip the JSON.stringify() dedup key that would retain
                // another full copy of it.
                dedup: false
            }).catch(ex => {
                if (ex === -6) {
                    msgDialog(
                        'warningb',
                        l[34],
                        l.too_many_support_requests,
                        l[253]
                    );
                }
                else if (ex === -12) {
                    msgDialog(
                        'error',
                        null,
                        l[200],
                        l.attachment_server_invalid_file
                    );
                }
                else {
                    tell(ex);
                }
                return false;
            });
            loadingDialog.hide();
            if (response && response.result === 0) {
                // show success view
                dom.$submissionFlow.addClass('hidden');
                dom.$successBlock.removeClass('hidden');
                document.querySelector('#startholder').scrollTo({top: 0, behavior: 'smooth'});

                // empty the form so a subsequent visit to /support starts clean
                selectedCategory = null;
                supportType = '';
                undoHooks();
                $defaultHiddenElements = dom.$commonHidden;

                dom.$category.children('span').first().removeClass('dirty').text(l[1278]);
                dom.$issue.children('span').first().removeClass('dirty').text(l[1278]);
                dom.$issueBlock.addClass('hidden');
                dom.$related.addClass('hidden');
                dom.$relatedList.empty();
                dom.$otherHidden.addClass('hidden');
                dom.$commonHidden.addClass('hidden');

                acceptReadArticlesCheckbox.checked = false;
                $deviceInput.val('');
                $messageInputTextArea.val('').trigger('input');
                attachments.length = 0;
                renderAttachments();
                attachErr('');

                if (s4SubFormReady) {
                    dom.$s4SubForm[0].componentSelectorAll('.endpoint-checkbox').forEach(c => {
                        c.checked = false;
                    });
                    $s4ConnectionInfoInput.val('');
                    $s4RequestId.val('');
                    $s4ResponseMessageInput.val('');
                    $s4MessageInput.val('');
                    if (is_mobile) {
                        $s4StartDatePicker.value = '';
                        $s4EndDatePicker.value = '';
                    }
                    else {
                        const startInst = $s4StartDatePicker.data('datepicker');
                        const endInst = $s4EndDatePicker.data('datepicker');
                        if (startInst) {
                            startInst.clear();
                        }
                        if (endInst) {
                            endInst.clear();
                        }
                        $s4StartDatePicker.val('');
                        $s4EndDatePicker.val('');
                    }
                    s4StartTimePicker.clear();
                    s4EndTimePicker.clear();
                }
            }
            dom.$submitButton.removeClass('disabled');
            return false;
        };

        // create device input
        if (!$deviceInput) {
            const input = mCreateElement('input', {
                type: 'text',
                class: 'underlinedText no-title-top',
                placeholder: l.support_page_device_input_name_placeholder,
                'data-wrapper-class': 'box-style mobile'
            }, dom.$deviceInfoInputWrapper[0]);
            $deviceInput = new mega.ui.MegaInputs($(input)).$input;
        }

        // create message input
        if (!$messageInputTextArea) {
            $messageInputTextArea = createTextareaInput(
                dom.$messageTxtAreaWrapper,
                l.support_page_message_input_placeholder
            );
        }

        // create the attachments dropzone - built here, not in s4Handle(), as it serves both flows
        if (!dom.dropzone) {
            createDropzone();
        }
        // create accept checkbox
        if (!acceptReadArticlesCheckbox) {
            acceptReadArticlesCheckbox = new MegaCheckbox({
                parentNode: dom.$articlesRead[0],
                componentClassname: 'mega-checkbox',
                checkboxName: 'accept-articles-read',
                labelTitle: l.support_page_related_articles_read
            });
        }

        // prepopulate form, if the user is coming from help-center
        if (window.kbCatId && raw[window.kbCatId]) {
            const {kbCatId} = window;
            const item = raw[kbCatId];
            const isRoot = item.parentId === 0;
            const category = isRoot ? item : raw[item.parentId];
            const issue = isRoot ? null : item;

            delete window.kbCatId;
            delete window.kbPostId;

            createSupportDropdown('category', categoryOptions, category.id, categoryClick);
            categoryClick(category.id);
            if (is_mobile) {
                dom.$category.children('span').first().text(category.name);
            }
            if (issue) {
                createIssueDropDown(category.id, `${issue.id}`);
                issueClick(`${issue.id}`);
                acceptReadArticlesCheckbox.checked = kbCatId;
                $defaultHiddenElements.removeClass('hidden');
            }
        }
        else {
            createSupportDropdown('category', categoryOptions, prevSelectedCategory, categoryClick);
            if (prevSelectedCategory) {
                const catId = prevSelectedCategory;
                prevSelectedCategory = null;
                categoryClick(catId);
            }
        }
        loadingDialog.hide();

        // register events for support flow
        acceptReadArticlesCheckbox.on('toggle.change', (e) => {
            if (e.data) {
                $defaultHiddenElements.removeClass('hidden');
                return;
            }
            $defaultHiddenElements.addClass('hidden');
        });
        dom.$submitButton.rebind('click.support', () => submit().catch(dump));
        $messageInputTextArea.rebind('input.support', () => {
            if ($messageInputTextArea.val().length > 0) {
                dom.$messageError.addClass('hidden');
                dom.$messageTxtAreaWrapper.removeClass('error-border');
            }
        });
    };

    const addLoginListener = () => {

        if (!ns._onLoginListener) {
            ns._onLoginListener = mBroadcaster.addListener('login2', () => {
                prevSupportType = supportType;
                prevSelectedCategory = selectedCategory;
                ns.init().catch(dump);
            });
        }
    };
    const removeLoginListener = () => {

        if (ns._onLoginListener) {
            mBroadcaster.removeListener(ns._onLoginListener);
            ns._onLoginListener = null;
        }
    };
    const handlePageChange = (newPage) => {

        if (newPage === 'support' && ns._uiBoundFor === ns._initNonLoggedInUI) {
            addLoginListener();
        }
        else {
            removeLoginListener();
        }
    };
    const addPageChangeListener = () => {

        if (!ns._pageChangeListener) {
            ns._pageChangeListener = mBroadcaster.addListener('pagechange', handlePageChange);
        }
    };
    const removePageChangeListener = () => {

        if (ns._pageChangeListener) {
            mBroadcaster.removeListener(ns._pageChangeListener);
            ns._pageChangeListener = null;
        }
    };
    // public function to start the non-logged-in
    ns._initNonLoggedInUI = async() => {

        dom.$successBlock.addClass('hidden');
        addLoginListener();

        // render verify flow
        dom.$submissionFlow.addClass('hidden');
        dom.$verifyFlowLanding.removeClass('hidden');
        dom.$verifyEmailForm.addClass('hidden');
        // create email input
        if (!$emailInput) {
            const input = mCreateElement('input', {
                type: 'email',
                class: 'underlinedText no-title-top',
                placeholder: l[16343],
                'data-wrapper-class': 'user-email box-style mobile'
            }, dom.$emailInputWrapper[0]);
            $emailInput = new mega.ui.MegaInputs($(input)).$input;
        }
        if (!otpInputs) {
            createOtpInput();
        }
        $hideOnShowEmailVerifyForm = dom.$verifyFlowLanding.add(dom.$verifyOtpForm);
        $hideOnEmailVerifyCall = dom.$errOnVerificationRequest.add(dom.$verifyFlowLanding);

        // register events
        dom.$showVerifyFormLink.rebind('click.support', showVerifyEmailForm);
        dom.$doVerifyEmailButton.rebind('click.support', () => beginEmailVerification().catch(dump));
        dom.$changeEmailButton.rebind('click.support', showVerifyEmailForm);
        dom.$verifyOtpInput.rebind('click.support', () => doVerifyOtp().catch(dump));
        dom.$resendOtpCta.rebind('click.support', () => beginEmailVerification().catch(dump));
        $emailInput.rebind('keydown.emailEnter', (e) => {

            if (e.key === 'Enter') {
                beginEmailVerification().catch(dump);
                return false;
            }
        });
    };

    ns.init = async() => {
        loadingDialog.show();
        const targetUI = u_attr ?  ns._initLoggedInUI :  ns._initNonLoggedInUI;

        if (ns.parsed && !is_mobile) {
            if (ns._uiBoundFor !== targetUI) {
                ns.destroy();
                collateDomRefs();
                await targetUI();
                ns._uiBoundFor = targetUI;
            }
            addPageChangeListener();
            onIdle(onIdleCallback);
            return;
        }

        ns.destroy();
        parsepage(pages.support); // should be called only once per browser session
        ns.parsed = true;
        loadingDialog.hide();
        collateDomRefs();
        if (is_mobile) {
            MegaMobileHeader.init(true);
        }

        ns._uiBoundFor = targetUI;
        addPageChangeListener();
        return ns._uiBoundFor().catch(dump);
    };

    const teardownDatePicker = ($dp) => {
        if (!$dp) {
            return;
        }
        if (is_mobile) {
            if (typeof $dp.destroy === 'function') {
                $dp.destroy();
            }
        }
        else {
            const inst = $dp.data && $dp.data('datepicker');
            if (inst) {
                inst.destroy();
            }
            $dp.off();
        }
    };
    const clearTimersAndListeners = () => {

        clearInterval(tooManyOtpResendMsgReqTimer);
        tooManyOtpResendMsgReqTimer = null;

        removeLoginListener();
        removePageChangeListener();
    };
    const destroyComponents = () => {
        if (submittedBlockPrimaryCta) {
            submittedBlockPrimaryCta.destroy();
            submittedBlockPrimaryCta = null;
        }
        if (submittedBlockSecondaryCta) {
            submittedBlockSecondaryCta.destroy();
            submittedBlockSecondaryCta = null;
        }
        if (dds.category) {
            dds.category.destroy();
            dds.category = null;
        }
        if (dds.issue) {
            dds.issue.destroy();
            dds.issue = null;
        }
        if (acceptReadArticlesCheckbox) {
            acceptReadArticlesCheckbox.destroy();
            acceptReadArticlesCheckbox = null;
        }
        for (const checkbox of s4EndpointCheckboxes) {
            checkbox.destroy();
        }
        s4EndpointCheckboxes.length = 0;
        if (dom.$s4EndpointList && dom.$s4EndpointList.length) {
            dom.$s4EndpointList.empty();
        }
        if (s4StartTimePicker) {
            tryCatch(() => s4StartTimePicker.destroy())();
            s4StartTimePicker = null;
        }
        if (s4EndTimePicker) {
            tryCatch(() => s4EndTimePicker.destroy())();
            s4EndTimePicker = null;
        }
        teardownDatePicker($s4StartDatePicker);
        teardownDatePicker($s4EndDatePicker);
        $s4StartDatePicker = null;
        $s4EndDatePicker = null;
    };
    const clearHostHandlers = () => {
        for (const $dd of [dom.$category, dom.$issue]) {
            if ($dd && $dd.length) {
                $dd.off();
                $('.mega-input-dropdown .dropdown-scroll', $dd).empty();
            }
        }
        if (dom.$submissionFlow) {
            dom.$submissionFlow.off();
        }
        if (dom.$ctaButtons && dom.$ctaButtons.length) {
            dom.$ctaButtons.off();
        }
    };
    const emptyInputHosts = () => {
        if (dom.$textareaHosts && dom.$textareaHosts.length) {
            $('.textarea-scroll', dom.$textareaHosts).toArray().forEach(node => Ps.destroy(node));
        }
        if (dom.$inputHosts && dom.$inputHosts.length) {
            dom.$inputHosts.empty();
        }
        attachments.length = 0;
        $s4ConnectionInfoInput = null;
        $s4RequestId = null;
        $s4ResponseMessageInput = null;
        $s4MessageInput = null;
        $deviceInput = null;
        $messageInputTextArea = null;
        $emailInput = null;
    };
    const clearOtpInputsHooks = () => {
        if (dom.$otpInputs && dom.$otpInputs.length) {
            dom.$otpInputs.off().removeData('MegaInputs').removeClass('megaInputs');
        }
        otpInputs = null;
    };
    const resetModuleState = () => {
        undoHooksOnDiffSlugSelect.clear();
        s4SubFormUtils.clamping = false;

        if (dom.$mainLayout && dom.$mainLayout.length) {
            dom.$mainLayout.removeClass('get-support');
        }

        successCtaContainer = null;
        selectedCategory = null;
        supportType = '';
        langGha = null;
        prevSelectedCategory = null;
        prevSupportType = null;
        $defaultHiddenElements = null;
        $hideOnShowEmailVerifyForm = null;
        $hideOnEmailVerifyCall = null;
        s4SubFormReady = false;

        for (const k of Object.keys(dom)) {
            dom[k] = null;
        }

        ns._uiBoundFor = null;
        ns.parsed = false;
    };

    ns.destroy = () => {
        clearTimersAndListeners();
        destroyComponents();
        clearHostHandlers();
        emptyInputHosts();
        clearOtpInputsHooks();
        resetModuleState();
    };

    return ns;
});
