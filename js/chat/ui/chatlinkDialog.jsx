import React from 'react';
import { MegaRenderMixin } from '../mixins';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import { Emoji } from './../../ui/utils.jsx';

export class ChatlinkDialog extends MegaRenderMixin {
    static defaultProps = {
        requiresUpdateOnResize: true,
        disableCheckingVisibility: true
    }

    constructor(props) {
        super(props);
        this.state = {
            link: l[5533] /* `Loading...` */,
            newTopic: ''
        };
    }

    onPopupDidMount = $node => {
        this.$popupNode = $node;
    };

    componentWillMount() {
        this.retrieveChatLink();
    }

    retrieveChatLink = () => {
        const { chatRoom } = this.props;
        if (!chatRoom.topic) {
            delete this.loading;
            return;
        }

        this.loading = chatRoom.updatePublicHandle(false, true)
            .always(() => {
                if (chatRoom.publicLink) {
                    this.setState({ 'link': getBaseUrl() + '/' + chatRoom.publicLink });
                }
                else {
                    this.setState({ link: l[20660] /* `No chat link available.` */ });
                }
            });
    };

    componentDidUpdate() {
        const { chatRoom } = this.props;
        if (!this.loading && chatRoom.topic) {
            this.retrieveChatLink();
        }

        // Setup toast notification
        this.toastTxt = l[7654] /* `1 link was copied to the clipboard` */;

        if (!this.$popupNode) {
            return;
        }

        const $node = this.$popupNode;
        const $copyButton = $('.copy-to-clipboard', $node);

        $copyButton.rebind('click', () => {
            copyToClipboard(this.state.link, this.toastTxt);
            return false;
        });

        // Setup the copy to clipboard buttons
        $('span', $copyButton).text(l[1990] /* `Copy` */);
    }

    onClose = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    };

    onTopicFieldChanged = e => {
        this.setState({ newTopic: e.target.value });
    };

    onTopicFieldKeyPress = e => {
        if (e.which === 13) {
            this.props.chatRoom.setRoomTitle(this.state.newTopic);
        }
    };

    render() {
        const { chatRoom } = this.props;
        const { newTopic, link } = this.state;
        const closeButton =
            <button
                key="close"
                className="mega-button negative links-button"
                onClick={this.onClose}>
                <span>{l[148] /* `Close` */}</span>
            </button>;

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                title={chatRoom.iAmOperator() && !chatRoom.topic
                    ? chatRoom.isMeeting
                        ? l.rename_meeting /* `Rename Meeting` */
                        : l[9080] /* `Rename Group` */ : ''}
                className={`
                    chat-rename-dialog
                    export-chat-links-dialog
                    group-chat-link
                    ${chatRoom.topic ? '' : 'requires-topic'}
                `}
                onClose={this.onClose}
                dialogName="chat-link-dialog"
                dialogType={chatRoom.iAmOperator() && !chatRoom.topic ? 'main' : 'graphic'}
                chatRoom={chatRoom}
                popupDidMount={this.onPopupDidMount}>
                {chatRoom.iAmOperator() && !chatRoom.topic ?
                    <section className="content">
                        <div className="content-block">
                            {/* `Before you can generate a link for this chat, you need to set a description:` */}
                            <div className="export-chat-ink-warning">{l[20617]}</div>
                            <div
                                className="rename-input-bl"
                                style={{ margin: '10px auto 20px auto' }}>
                                <input
                                    type="text"
                                    name="newTopic"
                                    value={newTopic}
                                    style={{ paddingLeft: 8, }}
                                    onChange={this.onTopicFieldChanged}
                                    onKeyPress={this.onTopicFieldKeyPress}
                                    placeholder={l[20616] /* `Add a description for this chat` */}
                                    maxLength={ChatRoom.TOPIC_MAX_LENGTH}
                                />
                            </div>
                        </div>
                    </section> :
                    <>
                        <header>
                            <i className="sprite-fm-uni icon-chat-group"/>
                            <h2 id="chat-link-dialog-title">
                                <Emoji>{chatRoom.getRoomTitle()}</Emoji>
                            </h2>
                        </header>
                        <section className="content">
                            <div className="content-block">
                                <div className="chat-link-input">
                                    <i className="sprite-fm-mono icon-link-small"/>
                                    <input
                                        type="text"
                                        readOnly={true}
                                        value={!chatRoom.topic ? l[20660] /* `No chat link available.` */ : link}
                                    />
                                </div>
                                {/* `People can join your group by using this link.` */}
                                <div className="info">{chatRoom.publicLink ? l[20644] : null}</div>
                            </div>
                        </section>
                    </>
                }

                <footer>
                    <div className="footer-container">
                        {chatRoom.iAmOperator() && chatRoom.publicLink &&
                            <button
                                key="deleteLink"
                                className={`
                                    mega-button
                                    links-button
                                    ${this.loading && this.loading.state() === 'pending' ? 'disabled' : ''}
                                `}
                                onClick={() => {
                                    chatRoom.updatePublicHandle(1);
                                    this.onClose();
                                }}>
                                <span>{l[20487] /* `Delete chat link` */}</span>
                            </button>
                        }

                        {chatRoom.topic ?
                            chatRoom.publicLink ?
                                <button
                                    className={`
                                        mega-button
                                        positive
                                        copy-to-clipboard
                                        ${this.loading && this.loading.state() === 'pending' ? 'disabled' : ''}
                                    `}>
                                    <span>{l[63] /* `Copy` */}</span>
                                </button> :
                                closeButton :
                            chatRoom.iAmOperator() ?
                                <button
                                    key="setTopic"
                                    className={`
                                        mega-button
                                        positive
                                        links-button
                                        ${newTopic && $.trim(newTopic) ? '' : 'disabled'}
                                    `}
                                    onClick={() => chatRoom.iAmOperator() && chatRoom.setRoomTitle(newTopic)}>
                                    <span>{l[20615] /* `Set description` */}</span>
                                </button>
                                :
                                closeButton

                        }
                    </div>
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
