import React from 'react';
import { WhosTyping } from './whosTyping.jsx';
import { TypingArea } from './typingArea.jsx';
import { Button } from '../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';

const ComposedTextArea = ({ chatRoom, parent, containerRef }) =>
    <div className="chat-textarea-block">
        <WhosTyping chatRoom={chatRoom}/>
        <TypingArea
            chatRoom={chatRoom}
            className="main-typing-area"
            containerRef={containerRef}
            disabled={chatRoom.isReadOnly()}
            persist={true}
            onUpEditPressed={() => {
                const keys = chatRoom.messagesBuff.messages.keys();
                for (var i = keys.length; i--;) {
                    var message = chatRoom.messagesBuff.messages[keys[i]];

                    var contact = M.u[message.userId];
                    if (!contact) {
                        // data is still loading!
                        continue;
                    }

                    if (
                        message.isEditable() &&
                        !message.requiresManualRetry &&
                        !message.deleted &&
                        (!message.type || message instanceof Message) &&
                        (!message.isManagement || !message.isManagement())
                    ) {
                        parent.historyPanel.editMessage(message.messageId);
                        return true;
                    }
                }

                return false;
            }}
            onResized={() => {
                parent.historyPanel.handleWindowResize();
            }}
            onConfirm={(messageContents) => {
                const { messagesListScrollable } = parent.historyPanel;
                if (messageContents && messageContents.length > 0) {
                    if (!chatRoom.scrolledToBottom) {
                        chatRoom.scrolledToBottom = true;
                        parent.lastScrollPosition = 0;
                        // tons of hacks required because of the super weird continuous native
                        // scroll event under Chrome + OSX, e.g. when the user scrolls up to the
                        // start of the chat, the event continues to be received event that the
                        // scrollTop is now 0..and if in that time the user sends a message
                        // the event triggers a weird "scroll up" animation out of nowhere...
                        chatRoom.rebind('onMessagesBuffAppend.pull', () => {
                            if (messagesListScrollable) {
                                messagesListScrollable.scrollToBottom(false);
                                delay('messagesListScrollable', () => {
                                    messagesListScrollable.enable();
                                }, 1500);
                            }
                        });

                        chatRoom.sendMessage(messageContents);
                        messagesListScrollable?.disable();
                        messagesListScrollable?.scrollToBottom(true);
                    }
                    else {
                        chatRoom.sendMessage(messageContents);
                    }
                }
            }}>
            <Button
                className="popup-button left"
                icon="sprite-fm-mono icon-add"
                disabled={chatRoom.isReadOnly()}>
                <Dropdown
                    className="wide-dropdown attach-to-chat-popup light"
                    noArrow="true"
                    positionMy="left top"
                    positionAt="left bottom"
                    vertOffset={4}
                    wrapper="#fmholder">
                    <div className="dropdown info-txt">{l[23753] || 'Send...'}</div>
                    <DropdownItem
                        className="link-button"
                        icon="sprite-fm-mono icon-cloud"
                        label={l[19794] || 'My Cloud Drive'}
                        disabled={mega.paywall}
                        onClick={() => chatRoom.trigger('openAttachCloudDialog')}
                    />
                    <DropdownItem
                        className="link-button"
                        icon="sprite-fm-mono icon-session-history"
                        label={l[19795] || 'My computer'}
                        disabled={mega.paywall}
                        onClick={() => chatRoom.uploadFromComputer()}
                    />
                    {!is_eplusplus && !is_chatlink && !chatRoom.isNote &&
                        <>
                            <hr/>
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-send-contact"
                                label={l.share_contact_button /* `Share contact` */}
                                onClick={() => chatRoom.trigger('openSendContactDialog')}
                            />
                        </>
                    }
                </Dropdown>
            </Button>
        </TypingArea>
    </div>;

export default ComposedTextArea;
