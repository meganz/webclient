/* eslint-disable max-classes-per-file */
lazy(mega, 'fileRequestUI', () => {
    'use strict';

    const megaInputSelector = '.mega-input';
    const megaInputWrapperSelector = '.mega-input-wrapper';
    const activeClass = 'active';
    const { generator } = mega.fileRequestCommon;

    class ReadOnlyInputComponent {
        constructor($selector) {
            this.$input = $selector;
            this.setContent(null);
            this.context = null;
        }

        update(context) {
            this.setContext(context);
            this.$input.val(this.getContent());
        }

        setContext(context) {
            this.context = context;
        }

        getContent() {
            return this.content;
        }

        setContent(content) {
            this.content = content;
        }
    }

    class EmbedCodeInputComponent extends ReadOnlyInputComponent {
        constructor($selector) {
            super($selector);

            this.puPagePublicHandle = null;
            this.lightTheme = null;
        }

        setContext(context) {
            this.puPagePublicHandle = context.puPagePublicHandle;
            this.lightTheme = context.lightTheme;

            this.setContent(
                generator
                    .generateCode(
                        this.puPagePublicHandle,
                        this.lightTheme
                    )
            );
        }
    }

    class ShareLinkInputComponent extends ReadOnlyInputComponent {
        constructor($selector) {
            super($selector);

            this.puPagePublicHandle = null;
        }

        setContext(context) {
            this.puPagePublicHandle = context.puPagePublicHandle;

            this.setContent(
                generator
                    .generateUrl(this.puPagePublicHandle)
            );
        }
    }

    class RadioComponent {
        constructor($selector, options) {
            this.$input = $selector;
            this.options = {
                events: {
                    change: nop // Placeholder
                },
                namespace: ''
            };
            this.setOptions(options);

            this.addEventHandlers();
        }

        getInput() {
            return this.$input;
        }

        setOptions(options){
            this.options = {...this.options, ...options};
        }

        addEventHandlers() {
            let namespace = this.options.namespace || '';
            if (namespace.length) {
                namespace = `.${namespace}`;
            }

            this.$input.rebind(`change${namespace}`, (evt) => {
                const inputElement = evt.target;
                const $input = $(inputElement);

                this.$input
                    .not(inputElement)
                    .addClass('radioOff')
                    .removeClass('radioOn')
                    .prop('checked', false)
                    .parent()
                    .addClass('radioOff')
                    .removeClass('radioOn'); // Clear all buttons

                $input
                    .removeClass('radioOff')
                    .addClass('radioOn')
                    .prop('checked', true);

                $input
                    .parent()
                    .addClass('radioOn')
                    .removeClass('radioOff');

                return this.options.events.change($input, this.getValue());
            });
        }

        eventOnChange(changeCallback) {
            if (typeof changeCallback !== 'function') {
                return;
            }

            this.options.events.change = changeCallback;
        }

        getValue() {
            return this.$input.filter(':checked').val() || null;
        }
    }

    class BaseClickableComponent {
        constructor($selector, options) {
            this.$input = $selector;
            this.options = {
                events: {
                    click: nop,
                },
                propagation: true,
                namespace: ''
            };

            this.action = is_mobile ? 'tap' : 'click';
            this.setOptions(options);
            this.addEventHandlers();
        }

        addEventHandlers() {
            let namespace = this.options.namespace || '';
            if (namespace.length) {
                namespace = `.${namespace}`;
            }

            const clickHandler = (evt) => {
                if (is_mobile && !this.options.doNotValidate && !validateUserAction()) {
                    return false;
                }

                const stopPropagation = typeof this.options.propagate !== 'undefined' && !this.options.propagate;
                const inputElement = evt.target;
                const $input = $(inputElement);
                const response = this.options.events.click($input);

                if (stopPropagation) {
                    return false;
                }

                return response;
            };

            if (this.options.onOff) {
                this.$input.off(`${this.action}`).on(`${this.action}`, clickHandler);
            }
            else {
                this.$input.rebind(`${this.action}${namespace}`, clickHandler);
            }

            return namespace;
        }

        setOptions(options) {
            this.options = {...this.options, ...options};
        }

        disable() {
            return this.$input
                .addClass('disabled')
                .attr('disabled', 'disabled');
        }

        enable() {
            return this.$input
                .removeClass('disabled')
                .removeAttr('disabled');
        }

        getInput() {
            return this.$input;
        }

        off() {
            this.$input.off(`.${this.options.namespace}` || null);
        }
    }

    class ButtonComponent extends BaseClickableComponent {
        eventOnClick(clickCallback) {
            if (typeof clickCallback !== 'function') {
                return;
            }

            this.options.events.click = clickCallback;
        }
    }

    class CopyButtonComponent extends ButtonComponent {
        constructor($selector, options) {
            super($selector, options);
            this.setOnClick();
        }

        setOnClick() {
            this.eventOnClick(($input) => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                const optionCallback = this.options.callback;
                if (!optionCallback) {
                    return;
                }

                if (typeof optionCallback !== 'function') {
                    return;
                }

                let copyOptions = optionCallback($input);
                if (typeof copyOptions === 'string') {
                    const outputString = copyOptions;
                    copyOptions = {
                        content: () => outputString,
                        toastText: null
                    };
                }

                if (typeof copyOptions.content === 'function') {
                    copyToClipboard(
                        copyOptions.content(),
                        this.getToastText(copyOptions.toastText),
                        copyOptions.className
                    );
                }
            });
        }

        getToastText(content) {
            if (typeof content === 'string') {
                return content;
            }

            return this.options.toastText || l[371];
        }
    }


    class PreviewButtonComponent extends ButtonComponent {
        constructor($selector, options) {
            super($selector, options);
            this.setOnClick();
        }

        setOnClick() {
            this.eventOnClick(($input) => {
                const optionCallback = this.options.callback;
                if (!optionCallback) {
                    return;
                }

                if (typeof optionCallback !== 'function') {
                    return;
                }

                const {
                    name, title, description, theme, pupHandle
                } = optionCallback($input);

                const url = generator.generateUrlPreview(
                    name,
                    title,
                    description,
                    theme,
                    pupHandle
                );

                if (url) {
                    generator
                        .windowOpen(url);
                }
            });
        }
    }

    class CloseButtonComponent extends ButtonComponent {
        constructor($selector, options) {
            super($selector, options);
            this.setOnClick();
        }

        setOnClick() {
            this.eventOnClick(() => {
                if (this.options.warning) {
                    showLoseChangesWarning().done(closeDialog);
                    return;
                }

                closeDialog();
            });
        }
    }

    class CloseMobileComponent extends ButtonComponent {
        constructor($selector, options) {

            options.doNotValidate = true;

            super($selector, options);
            this.setOnClick();
        }

        setOnClick() {
            this.eventOnClick(() => {
                this.closeDialog();
            });
        }

        closeDialog() {
            if (!this.options.$dialog) {
                return;
            }

            if (typeof this.options.post === 'function') {
                this.options.post();
            }

            this.options.$dialog.removeClass('overlay').addClass('hidden');
        }
    }

    class InputComponent extends BaseClickableComponent {
        addEventHandlers() {
            const namespace = super.addEventHandlers();

            this.$input.rebind(`input${namespace}`, (evt) => {
                const inputElement = evt.target;
                const $input = $(inputElement);
                return this.options.events.input($input);
            });
        }

        eventOnInput(inputCallback) {
            if (typeof inputCallback !== 'function') {
                return;
            }

            this.options.events.input = inputCallback;
        }

        getValue() {
            return this.$input.val();
        }

        setValue(newValue) {
            return this.$input.val(newValue);
        }

    }

    class ValidatableInputComponent extends InputComponent {
        constructor($selector, options) {
            super($selector, options);

            this.$input = $selector;
            this.$inputWrapper = this.$input.closest(this.options.selector || megaInputSelector);

            this.options.validations = Object.create(null);
            this.options.post = null;

            this.setOptions(options);
            this.eventOnInput(() => {
                this.validate();
                if (this.options.post && typeof this.options.post == 'function') {
                    this.options.post(this, this.options);
                }
            });
        }

        validate() {
            if (!this.options.validations) {
                return false;
            }

            const validationRules = this.options.validations;
            let validationPostCallback = this.options.postValidation;
            if (typeof this.options.postValidate !== 'function') {
                validationPostCallback = null;
            }

            if (validationRules.required) {
                const requiredOption = validationRules.required;
                const validationMessage = requiredOption.message;

                if (!this.getValue()) {
                    if (validationMessage) {
                        this.addErrorMessage(
                            validationMessage
                        );
                    }

                    if (validationPostCallback) {
                        validationPostCallback($input, false);
                    }

                    return false;
                }
            }

            if (validationRules.limit) {
                const limitOption = validationRules.limit;
                let validationMessage = limitOption.message;
                const maxLength = limitOption.max;
                const { formatMessage } = limitOption;

                if (formatMessage) {
                    validationMessage = mega.icu.format(validationMessage, maxLength);
                }

                if (this.getValue() && this.getValue().length > maxLength) {
                    if (validationMessage) {
                        this.addErrorMessage(
                            validationMessage
                        );
                    }

                    if (validationPostCallback) {
                        validationPostCallback($input, false);
                    }

                    return false;
                }
            }

            this.resetErrorMessage();

            if (validationPostCallback) {
                validationPostCallback($input, true);
            }
            return true;
        }

        addErrorMessage(message) {
            const $megaInputWrapper = this.$inputWrapper
                .closest(megaInputWrapperSelector);

            $megaInputWrapper.addClass('error msg');
            this.$input.addClass('errored');

            $('.message-container', $megaInputWrapper).text(message);
        }

        resetErrorMessage() {
            this.$inputWrapper
                .closest(megaInputWrapperSelector)
                .removeClass('error msg');

            this.$input.removeClass('errored');
        }

        setValue(newValue) {
            let namespace = this.options.namespace || '';
            if (namespace.length) {
                namespace = `.${namespace}`;
            }
            return this.$input
                .val(newValue)
                .trigger(`input${namespace}`);
        }

        reset() {
            this.setValue('');
            this.resetErrorMessage();
            this.getInput()
                .closest(megaInputSelector)
                .removeClass(activeClass);
        }
    }

    class ValidatableMobileComponent extends ValidatableInputComponent {
        addErrorMessage(message) {
            const $warningBlock = this.$inputWrapper
                .closest('.input-container')
                .find('.input-warning-block');

            $warningBlock.removeClass('hidden');

            $('.warning-text', $warningBlock).text(message);
        }

        resetErrorMessage() {
            this.$inputWrapper
                .closest('.input-container')
                .find('.input-warning-block')
                .addClass('hidden');
        }
    }


    class SelectFolderComponent {
        constructor($dialog) {
            this.$dialog = $dialog;

            this.$inputFolder = new InputComponent(
                $('.file-request-folder', this.$dialog)
            );

            this.$selectFolderButton =  new ButtonComponent($('.file-request-select-folder', this.$dialog));
            this.nodeHandle = null;
        }

        init() {
            this.$inputFolder.disable();
            this.$selectFolderButton.enable();
            this.$inputFolder
                .getInput()
                .removeClass('disabled')
                .closest(megaInputSelector)
                .addClass(activeClass);

            this.nodeHandle = null;
        }

        setFolder(folderName) {
            this.$inputFolder.setValue(folderName);
        }

        setNodeHandle(nodeHandle) {
            this.nodeHandle = nodeHandle;
        }

        addEventHandlers(options = false) {
            const namespace = options && options.namespace || '';
            this.$selectFolderButton.setOptions({
                namespace: namespace,
                events: {
                    click: ($input) => {
                        if ($input.is(':disabled')) {
                            return false;
                        }
                        closeDialog();

                        const {post} = options;
                        if (typeof post === 'function') {
                            openNewFileRequestDialog(this.nodeHandle).then(post).catch(dump);
                        }
                        return false;
                    }
                },
            });
        }

        off() {
            this.$selectFolderButton.off();
        }
    }

    class ClassCopyButtonComponent {
        constructor($dialog, options) {
            this.$dialog = $dialog;
            this.options = options;
            this.$copyButton = new CopyButtonComponent($('button.copy', this.$dialog));
        }

        addEventHandlers() {
            const copyOptions = this.options && this.options.copy || Object.create(null);
            const namespace = this.options && this.options.namespace || '';

            this.$copyButton.setOptions({
                namespace: namespace,
                callback: ($button) => {
                    const $inputSection  = $button.closest('.file-request-input');
                    const $input = $('.input-wrapper input', $inputSection);

                    if (!$input.length) {
                        return;
                    }

                    let option = null;
                    for (const key in copyOptions) {
                        if (copyOptions[key] && $input.hasClass(key)) {
                            option = copyOptions[key];
                            break;
                        }
                    }

                    return option;
                }
            });
        }
    }

    return {
        ReadOnlyInputComponent,
        EmbedCodeInputComponent,
        ShareLinkInputComponent,
        ButtonComponent,
        RadioComponent,
        CopyButtonComponent,
        PreviewButtonComponent,
        InputComponent,
        ValidatableInputComponent,
        SelectFolderComponent,
        ClassCopyButtonComponent,
        CloseButtonComponent,
        ValidatableMobileComponent,
        CloseMobileComponent
    };
});
