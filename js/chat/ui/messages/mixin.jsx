import {ContactAwareComponent} from '../../../stores/mixins.js';

class ConversationMessageMixin extends ContactAwareComponent {
    constructor(props) {
        super(props);
        this.__cmmUpdateTickCount = 0;
        this._contactChangeListeners = false;
        this.onAfterRenderWasTriggered = false;

        /** @property __cmmId */
        lazy(this, '__cmmId', () => {
            return this.getUniqueId() + '--' + String(Math.random()).slice(-7);
        });
    }

    componentWillMount() {
        if (super.componentWillMount) {
            super.componentWillMount();
        }

        const chatRoom = this.props.chatRoom;
        if (chatRoom) {
            chatRoom
                .rebind('onChatShown.' + this.__cmmId, () => {
                    if (!this._contactChangeListeners) {
                        this.addContactListeners();
                    }
                })
                .rebind('onChatHidden.' + this.__cmmId, () => {
                    if (this._contactChangeListeners) {
                        this.removeContactListeners();
                    }
                });
        }

        this.addContactListeners();
    }

    removeContactListeners() {
        const users = this._contactChangeListeners;

        if (d > 1) {
            console.warn('%s.removeContactListeners', this.getReactId(), [this], users);
        }

        for (let i = users.length; i--;) {
            users[i].removeEventHandler(this);
        }

        this._contactChangeListeners = false;
    }

    addContactListeners() {
        const users = this._contactChangeListeners || [];
        const addUser = (user) => {
            if (user instanceof MegaDataMap && users.indexOf(user) < 0) {
                users.push(user);
            }
        };

        addUser(this.getContact());

        if (this.haveMoreContactListeners) {
            var moreIds = this.haveMoreContactListeners();
            if (moreIds) {
                for (let i = moreIds.length; i--;) {
                    var handle = moreIds[i];
                    addUser(handle in M.u && M.u[handle]);
                }
            }
        }

        if (d > 1) {
            console.warn('%s.addContactListeners', this.getReactId(), [this], users);
        }

        for (let i = users.length; i--;) {
            users[i].addChangeListener(this);
        }
        this._contactChangeListeners = users;
    }

    handleChangeEvent(x, z, k) {
        // no updates needed in case of 'ts' or 'ats' change
        // e.g. reduce recursion of full history re-render in case of a new message is sent to a room.
        if (k === 'ts' || k === 'ats') {
            return;
        }
        // console.warn('xyz', this.__cmmUpdateTickCount, this.__cmmId, [this]);

        delay(this.__cmmId, () => {
            this.eventuallyUpdate();
            this.__cmmUpdateTickCount = -2;
        }, ++this.__cmmUpdateTickCount > 5 ? -1 : 90);
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        const chatRoom = this.props.chatRoom;
        if (chatRoom) {
            chatRoom.off('onChatShown.' + this.__cmmId).off('onChatHidden.' + this.__cmmId);
        }

        if (this._contactChangeListeners) {
            this.removeContactListeners();
        }
    }

    getContact() {
        if (this.props.contact) {
            // optimization
            return this.props.contact;
        }
        var message = this.props.message;

        return Message.getContactForMessage(message);
    }
    getTimestampAsString() {
        return unixtimeToTimeString(this.getTimestamp());
    }
    getTimestamp() {
        var message = this.props.message;
        var timestampInt;
        if (message.getDelay) {
            timestampInt = message.getDelay();
        }
        else if (message.delay) {
            timestampInt = message.delay;
        }
        else {
            timestampInt = unixtime();
        }

        if (timestampInt && message.updated && message.updated > 0) {
            timestampInt += message.updated;
        }
        return timestampInt;
    }
    getParentJsp() {
        return $(this.findDOMNode()).closest('.jScrollPaneContainer').data('jsp');
    }
    componentDidUpdate() {
        var self = this;
        var chatRoom = self.props.message.chatRoom;

        if (!self.onAfterRenderWasTriggered) {
            var msg = self.props.message;
            var shouldRender = true;
            if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
                shouldRender = false;
            }

            if (shouldRender) {
                chatRoom.trigger("onAfterRenderMessage", self.props.message);
                self.onAfterRenderWasTriggered = true;
            }
        }
    }
};

export {
    ConversationMessageMixin
};
