import React from 'react';
import { WhosTyping } from "./whosTyping.jsx";
import { TypingArea } from "./typingArea.jsx";
import { Button } from "../../ui/buttons.jsx";
import { Dropdown, DropdownItem } from "../../ui/dropdowns.jsx";
import { MegaRenderMixin } from "../mixins";

export default class ComposedTextArea extends MegaRenderMixin {
    render() {
        const { chatRoom: room, parent, containerRef } = this.props;

        return (
            <div className="chat-textarea-block">
                <WhosTyping chatRoom={room} />

                <TypingArea
                    chatRoom={room}
                    className="main-typing-area"
                    containerRef={containerRef}
                    disabled={room.isReadOnly()}
                    persist={true}
                    onUpEditPressed={() => {
                        const time = unixtime();
                        const keys = room.messagesBuff.messages.keys();
                        for (var i = keys.length; i--;) {
                            var message = room.messagesBuff.messages[keys[i]];

                            var contact = M.u[message.userId];
                            if (!contact) {
                                // data is still loading!
                                continue;
                            }

                            if (
                                contact.u === u_handle &&
                                time - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT &&
                                !message.requiresManualRetry &&
                                !message.deleted &&
                                (!message.type ||
                                    message instanceof Message) &&
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
                            if (!room.scrolledToBottom) {
                                room.scrolledToBottom = true;
                                parent.lastScrollPosition = 0;
                                // tons of hacks required because of the super weird continuous native
                                // scroll event under Chrome + OSX, e.g. when the user scrolls up to the
                                // start of the chat, the event continues to be received event that the
                                // scrollTop is now 0..and if in that time the user sends a message
                                // the event triggers a weird "scroll up" animation out of nowhere...
                                room.rebind('onMessagesBuffAppend.pull', () => {
                                    if (messagesListScrollable) {
                                        messagesListScrollable.scrollToBottom(false);
                                        delay('messagesListScrollable', () => {
                                            messagesListScrollable.enable();
                                        }, 1500);
                                    }
                                });

                                room.sendMessage(messageContents);
                                messagesListScrollable.disable();
                                messagesListScrollable.scrollToBottom(true);
                            }
                            else {
                                room.sendMessage(messageContents);
                            }
                        }
                    }}>
                    <Button
                        className="popup-button left"
                        icon="sprite-fm-mono icon-add"
                        disabled={room.isReadOnly()}>
                        <Dropdown
                            className="wide-dropdown attach-to-chat-popup light"
                            noArrow="true"
                            positionMy="left top"
                            positionAt="left bottom"
                            vertOffset={4}
                            wrapper="#fmholder">
                            <div className="dropdown info-txt">{l[23753] ? l[23753] : "Send..."}</div>
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-cloud"
                                label={l[19794] ? l[19794] : "My Cloud Drive"}
                                disabled={mega.paywall}
                                onClick={() => room.trigger('openAttachCloudDialog')}
                            />
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-session-history"
                                label={l[19795] ? l[19795] : "My computer"}
                                disabled={mega.paywall}
                                onClick={() => room.uploadFromComputer()}
                            />
                            {!is_eplusplus && !is_chatlink &&
                                <>
                                    <hr/>
                                    <DropdownItem
                                        className="link-button"
                                        icon="sprite-fm-mono icon-send-contact"
                                        label={l.share_contact_button /* `Share contact` */}
                                        onClick={() => room.trigger('openSendContactDialog')}
                                    />
                                </>
                            }
                        </Dropdown>
                    </Button>
                </TypingArea>
            </div>
        );
    }
}
