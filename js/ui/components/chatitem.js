class MegaChatItem extends MegaComponent {

    constructor(options) {
        options.nodeType = 'a';

        super(options);

        Object.defineProperty(this, 'chatRoom', {
            value: megaChat.chats[options.chatId],
            writable: false,
        });

        if (!this.chatRoom) {
            console.error(`No such chat found - ${options.chatId}`);
            return;
        }

        const classNames = ['mega-node', 'mobile', 'fm-item', 'mega-chat-item'];
        if (this.chatRoom.isMeeting) {
            classNames.push('meeting');
        }

        const iconWrap = document.createElement('div');
        iconWrap.className = 'mobile fm-item-img';
        if (this.chatRoom.type === 'private') {
            if (this.chatRoom.isNote) {
                this.iconNode = document.createElement('div');
                this.iconNode.classList.add('avatar', 'size-24');
                this.iconNode.classList.add('note-chat-signifier');
                if (!this.chatRoom.hasMessages()) {
                    this.iconNode.classList.add('note-chat-empty');
                }
            }
            else {
                this.iconNode = new MegaAvatarComponent({
                    parentNode: iconWrap,
                    userHandle: this.chatRoom.getParticipantsExceptMe()[0],
                    presence: true,
                    size: 24,
                });
            }
            classNames.push('user');
        }
        else {
            this.iconNode = document.createElement('i');
        }
        const iconClasses = this.icon;
        if (iconClasses) {
            this.iconNode.classList.add(...iconClasses.split(' '));
        }
        if (!(this.iconNode instanceof MegaComponent)) {
            iconWrap.appendChild(this.iconNode);
        }
        this.domNode.appendChild(iconWrap);

        this.labelNode = document.createElement('div');
        this.labelNode.className = 'mobile fm-item-name';
        this.domNode.appendChild(this.labelNode);

        const details = document.createElement('div');
        details.className = 'mobile props';
        this.domNode.appendChild(details);
        this.detailsSpan = document.createElement('span');
        details.appendChild(this.detailsSpan);

        const decorator = document.createElement('div');
        decorator.className = 'chat-item-decorator';
        const recurring = document.createElement('i');
        recurring.className = 'sprite-fm-mono icon-repeat-thin-solid';
        decorator.appendChild(recurring);
        const call = document.createElement('i');
        call.className = 'sprite-fm-mono icon-phone';
        decorator.appendChild(call);
        const notification = document.createElement('i');
        notification.className = 'chat-item-notification';
        decorator.appendChild(notification);
        this.domNode.appendChild(decorator);

        this.action = new MegaButton({
            parentNode: this.domNode,
            text: l.join_call,
            componentClassname: 'chat-action-button',
        });
        this.action.addClass('outline');
        this.addClass(...classNames);
        this.action.on('click', () => {
            if (
                !this.chatRoom.havePendingCall() ||
                this.chatRoom.uniqueCallParts && this.chatRoom.uniqueCallParts[u_handle]
            ) {
                this.action.hide();
                return;
            }
            eventlog(500655);
            loadSubPage(this.chatRoom.getRoomUrl(false));
            window.inProgressAlert(true, this.chatRoom)
                .then(() => this.chatRoom.joinCall())
                .catch((ex) => d && console.warn('Already in a call.', ex));
            return false;
        });

        this.on('click', () => {
            loadSubPage(this.chatRoom.getRoomUrl(false));
            const { EVENTS, VIEWS } = window.convAppConstants;
            megaChat.trigger(EVENTS.NAV_RENDER_VIEW, this.chatRoom.isMeeting ? VIEWS.MEETINGS : VIEWS.CHATS);
        });

        this.update(options);
    }

    update(options) {
        this.name = this.chatRoom.getRoomTitle();
        if (this.chatRoom.isMeeting) {
            if (this.chatRoom.scheduledMeeting) {
                this.detailsSpan.textContent = '';
                this.detailsSpan.appendChild(parseHTML(`<span>${this.startTime}&nbsp;-&nbsp;${this.endTime}</span>`));
            }
            else {
                this.showChatMessage();
            }
            this.removeClass('self-in-call');
            if (this.chatRoom.havePendingCall()) {
                this.addClass('in-call');
                if (this.chatRoom.uniqueCallParts && this.chatRoom.uniqueCallParts[u_handle]) {
                    this.addClass('self-in-call');
                    this.action.hide();
                }
                else {
                    this.action.show();
                }
            }
            else {
                this.removeClass('in-call');
                this.action.hide();
            }
            if (this.chatRoom.scheduledMeeting && this.chatRoom.scheduledMeeting.recurring) {
                this.addClass('recurring');
            }
            else {
                this.removeClass('recurring');
            }
            this.iconNode.className = this.icon;
        }
        else {
            if (this.chatRoom.havePendingCall()) {
                this.addClass('in-call');
            }
            else {
                this.removeClass('in-call');
            }
            const presence = this.domNode.querySelector('.activity-status');
            if (presence) {
                presence.className = this.presence;
            }
            this.showChatMessage();
            this.action.hide();
        }
        if (this.chatRoom.messagesBuff.getUnreadCount()) {
            this.addClass('notification');
        }
        else {
            this.removeClass('notification');
        }
        this.listSection = options.listSection;
    }

    get icon() {
        if (this.chatRoom.isMeeting) {
            if (this.chatRoom.uniqueCallParts && this.chatRoom.uniqueCallParts[u_handle]) {
                return 'sprite-fm-mono icon-phone-01-thin-outline';
            }
            return 'sprite-fm-mono icon-phone';
        }
        if (this.chatRoom.isNote) {
            return 'sprite-fm-mono icon-file-text-thin-outline note-chat-icon';
        }
        if (this.chatRoom.type === 'private') {
            return '';
        }
        return 'sprite-fm-uni icon-chat-group';
    }

    get presence() {
        if (this.chatRoom.type === 'private') {
            const handle = this.chatRoom.getParticipantsExceptMe()[0];
            if (handle in M.u) {
                return `activity-status ${megaChat.userPresenceToCssClass(M.u[handle].presence)}`;
            }
        }
        return 'activity-status black';
    }

    get startTime() {
        if (!this.chatRoom.scheduledMeeting) {
            return '';
        }
        return escapeHTML(toLocaleTime(this.chatRoom.scheduledMeeting.nextOccurrenceStart));
    }

    get endTime() {
        if (!this.chatRoom.scheduledMeeting) {
            return '';
        }
        return escapeHTML(toLocaleTime(this.chatRoom.scheduledMeeting.nextOccurrenceEnd));
    }

    showChatMessage() {
        if (mega.config.get('showHideChat')) {
            this.details = '';
        }
        else {
            const { messagesBuff } = this.chatRoom;
            const lastMessage = messagesBuff.getLatestTextMessage();
            if (lastMessage) {
                let parsed;
                if (
                    lastMessage.textContents &&
                    lastMessage.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP &&
                    lastMessage.getAttachmentMeta()[0]
                ) {
                    const playTime = escapeHTML(secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime));
                    parsed = parseHTML(
                        `<i class="sprite-fm-mono icon-audio-filled voice-message-icon"></i> ${playTime}`
                    );
                }
                else if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
                    parsed = parseHTML(
                        `<i class="sprite-fm-mono icon-location geolocation-icon"></i> ${escapeHTML(l[20789])}`
                    );
                }
                else {
                    parsed = parseHTML(`<span>${messagesBuff.getRenderableSummary(lastMessage)}</span>`);
                }
                this.detailsSpan.textContent = '';
                this.detailsSpan.appendChild(parsed);
            }
            else {
                this.details =
                    this.chatRoom.isLoading() ?
                        l[7006] : this.chatRoom.isNote && !this.chatRoom.hasMessages() ? '' : l[8000];
            }
        }
    }

    parsedSafeNode(content, attrs) {
        if (!content) {
            return mCreateElement('span', attrs || {});
        }
        return mCreateElement(
            'span',
            attrs || {},
            [parseHTML(megaChat.html(content))]
        );
    }

    set name(value) {
        this.labelNode.textContent = '';
        this.labelNode.appendChild(this.parsedSafeNode(value, {
            'class': `
                mega-chat-room-topic
                ${this.chatRoom.isNote ? 'note-chat-label' : ''}
                ${this.chatRoom.isNote && !this.chatRoom.hasMessages() ? 'note-chat-empty' : ''}
                ${this.chatRoom.isLoading() ? 'mega-chat-item--loading' : ''}
            `
        }));
    }

    set details(value) {
        this.detailsSpan.textContent = '';
        this.detailsSpan.appendChild(this.parsedSafeNode(value));
    }
}
