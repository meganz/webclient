/**
 * Functionality for the mobile Invite Friends page (fm/account/invite-friends)
 */
mobile.achieve.invites = Object.create(mobile.settingsHelper, {

    /**
     * Initialise the Invite Friends page
    */
    init: {
        value: function() {
            'use strict';

            // If not logged in, return to the login page
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return false;
            }

            // Add a server log
            eventlog(99674);

            if (this.domNode) {
                this.emailsMegaInput.setValue('');
                this.inlineAlert.hide();
                this.inlineAlert.text = '';
                this.inviteButton.disabled = false;

                this.show();
                this.showInputMessage();
                return true;
            }

            this.domNode = this.generatePage('invite-friends-page');

            // Initialise functionality
            this.createElements();
            this.show();
            this.showInputMessage();
        }
    },

    /**
     * Create the core elements of the page
     */
    createElements: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');

            const rewardInfo = document.createElement('div');
            rewardInfo.className = 'reward-info';
            rewardInfo.textContent = l.invite_friend_reward_blurb;
            this.domNode.append(rewardInfo);

            // How it works button
            const howItWorksBtn = new MegaMobileButton({
                type: 'text',
                componentClassname: 'text-icon how-it-works',
                text: l[1070],
                parentNode: this.domNode
            });
            howItWorksBtn.on('tap', () => {
                const contentsDiv = document.createElement('div');
                contentsDiv.className = 'how-it-works-contents';
                contentsDiv.append(parseHTML(l.how_it_works_blurb.replace('%1', 5)));

                mega.ui.sheet.show({
                    name: 'invite-friends-how-it-works',
                    type: 'modalLeft',
                    showClose: true,
                    title: l[1070],
                    contents: [contentsDiv],
                    actions: [
                        {
                            type: 'normal',
                            text: l.ok_button,
                            onClick: () => {
                                mega.ui.sheet.hide();
                            }
                        }
                    ]
                });
            });

            // Form elements
            const formNode = mCreateElement('div', {'class': 'fixed-width'}, this.domNode);

            // Input field for emails
            const emailsInput = document.createElement('textarea');
            emailsInput.title = l.enter_friends_emails;
            emailsInput.className = 'email-input-field underlinedText';
            emailsInput.dataset.wrapperClass = 'box-style mobile';
            emailsInput.name = 'email-input-field';

            formNode.append(emailsInput);

            this.emailsMegaInput = new mega.ui.MegaInputs($(emailsInput), {
                autoHeight: true,
                maxHeight: 120
            });

            this.emailsMegaInput.$input.rebind('keyup.addEmail input.addEmail', () => {
                // Check for invalid emails
                this.inviteButton.disabled = false;
                this.validateInput(false);
            });

            // Invite button
            this.inviteButton = new MegaMobileButton({
                parentNode: formNode,
                text: l[8726],
                type: 'normal',
                componentClassname: 'invite-btn block'
            });
            this.inviteButton.on('tap', () => {
                this.validateInput(true);
            });

            // Inline alert
            this.inlineAlert = mobile.inline.alert.create({
                parentNode: formNode,
                componentClassname: 'sent-invites warning hidden',
                title: l.invite_sent,
                icon: 'sprite-mobile-fm-mono icon-alert-circle-thin-outline',
                iconSize: '24',
                closeButton: true
            });
        }
    },

    /**
     * Show the helper message
     */
    showInputMessage: {
        value: function() {
            'use strict';

            this.emailsMegaInput.hideError();

            const alertIcon = 'sprite-mobile-fm-mono icon-help-circle-thin-outline';
            this.emailsMegaInput.showMessage(
                `<i class='${alertIcon}'></i>${escapeHTML(l.how_to_add_friends)}`
            );
        }
    },

    /**
     * Return the email element for the errored email list or inline alert list.
     *
     * @param {String} email
     * @param {Boolean} stringFormat Whether to return the element as a string or a DOM element
     */
    getEmailElement: {
        value: function(email, stringFormat) {
            'use strict';

            if (stringFormat) {
                return `<div class='email'> ${escapeHTML(email)} </div>`;
            }

            const emailDiv = document.createElement('div');
            emailDiv.className = 'email';
            emailDiv.textContent = email;

            return emailDiv;
        }
    },

    /**
     * Validate the email(s) entered by the user
     *
     * @param {Boolean} sendToApi Whether to send the email request(s) to the API or not
     */
    validateInput: {
        value: function(sendToApi) {
            'use strict';

            let emailInputValue = this.emailsMegaInput.$input.val().trim().toLowerCase();

            if (sendToApi) {
                this.emailsMegaInput.$input.blur();
            }

            if (emailInputValue === '') {
                if (sendToApi) {
                    const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                    this.emailsMegaInput.showError(
                        `<i class='${alertIcon}'></i> ${escapeHTML(l.enter_valid_email)}`
                    );
                }
                else {
                    this.showInputMessage();
                }
                return false;
            }

            // Ignore ',' if it is last character.
            if (emailInputValue.slice(-1) === ',') {
                emailInputValue = emailInputValue.slice(0, -1);
            }

            const emails = emailInputValue.split(',');

            const emailPromises = [];
            let invalidEmailHtml = '';
            let successToastShown = false;

            for (const email of emails) {
                const trimmedEmail = email.trim();

                if (trimmedEmail === '' || !isValidEmail(trimmedEmail) || trimmedEmail === u_attr.email) {
                    invalidEmailHtml += this.getEmailElement(trimmedEmail, true);

                    // Prevent the user from submitting their invite list
                    this.inviteButton.disabled = true;
                }
                else if (sendToApi) {
                    // Send email request
                    emailPromises.push(this.requestSendEmail(trimmedEmail));
                }
            }

            if (sendToApi) {
                // Show loading dialog while emails are being sent
                loadingDialog.show();

                Promise.allSettled(emailPromises).then((result) => {
                    this.emailsMegaInput.setValue('');
                    this.showInputMessage();
                    this.inlineAlert.text = '';
                    this.inlineAlert.hide();

                    for (const res of result) {
                        const code = res.value[0];
                        const email = res.value[1];

                        if (code === 0 && !successToastShown) {
                            mega.ui.toast.show(l.invite_sent_toast, 6);
                            successToastShown = true;
                        }
                        else if (code === -12) {
                            this.inlineAlert.show();

                            this.inlineAlert.text = this.getEmailElement(
                                `${this.inlineAlert.text}${email}\n`, false
                            );
                        }
                    }

                    loadingDialog.hide();
                });
            }

            if (this.inviteButton.disabled) {
                this.emailsMegaInput.hideMessage();

                const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                const emailListDiv = emails.length > 1 ?
                    `<div class='email-list'> ${invalidEmailHtml} <div>` :
                    '';

                this.emailsMegaInput.showError(
                    `<i class='${alertIcon}'></i>` +
                    `<div class='message-and-emails'>` +
                        mega.icu.format(l.invalid_emails_error, emails.length).replace('%1', emailListDiv) +
                    '</div>'
                );
            }
            else {
                this.showInputMessage();
            }
        }
    },

    /**
     * Request api to sending invitation email.
     * @param {String} trimmedEmail Trimmed email to send invitation email.
     * @return {MegaPromise}
     */
    requestSendEmail: {
        value: function(trimmedEmail) {
            'use strict';

            // Make an invite API request
            return api.screq({a: 'upc', e: u_attr.email, u: trimmedEmail, msg: l[5878], aa: 'a'})
                .then(({result}) => {
                    assert(result === 0 || typeof result === 'object' && result.p);

                    // Return 0 so successful invite toast can be shown
                    return [0];
                })
                .catch((ex) => {
                    // Check for error codes
                    // 2: trimmedEmail is own one (handled on keyup event)
                    // 10: user already sent you a contact request
                    // 12: trimmedEmail exists in user's contacts list or sent requests list
                    if (ex === -10 || ex === -12) {
                        // Return error code and email address for it to be added to invite sent inline alert
                        return [ex, trimmedEmail];
                    }
                    else if (d) {
                        console.error('Unexpected result...', ex);
                    }
                });
        }
    },
});
