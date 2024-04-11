import React from 'react';
import { MegaRenderMixin } from '../mixins';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import { Emoji } from './../../ui/utils.jsx';

export class ChatlinkDialog extends MegaRenderMixin {
    static defaultProps = {
        requiresUpdateOnResize: true,
        disableCheckingVisibility: true
    }

    static NAMESPACE = 'chat-link-dialog';

    constructor(props) {
        super(props);
        this.state = {
            link: l[5533] /* `Loading...` */,
            newTopic: ''
        };
    }

    componentWillMount() {
        this.retrieveChatLink();
    }

    retrieveChatLink() {
        const { chatRoom } = this.props;
        if (!chatRoom.topic) {
            delete this.loading;
            return;
        }

        this.loading = chatRoom.updatePublicHandle(false, true)
            .always(() => {
                this.loading = false;

                if (this.isMounted()) {
                    if (chatRoom.publicLink) {
                        this.setState({'link': `${getBaseUrl()}/${chatRoom.publicLink}`});
                    }
                    else {
                        this.setState({link: l[20660] /* `No chat link available.` */});
                    }
                }
            });
    }

    componentDidUpdate() {
        const { chatRoom } = this.props;
        if (!this.loading && chatRoom.topic) {
            this.retrieveChatLink();
        }
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

    componentDidMount() {
        super.componentDidMount();
        M.safeShowDialog(ChatlinkDialog.NAMESPACE, () => {
            if (!this.isMounted()) {
                throw new Error(`${ChatlinkDialog.NAMESPACE} dialog: component not mounted.`);
            }

            return $(`#${ChatlinkDialog.NAMESPACE}`);
        });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if ($.dialog === ChatlinkDialog.NAMESPACE) {
            closeDialog();
        }
    }

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
        const publicLinkDetails = chatRoom.isMeeting ? l.meeting_link_details : l[20644];

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                id={ChatlinkDialog.NAMESPACE}
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
                            {chatRoom.isMeeting ?
                                <div className="chat-topic-icon meeting-icon">
                                    <i className="sprite-fm-mono icon-video-call-filled"/>
                                </div> :
                                <i className="sprite-fm-uni icon-chat-group"/>
                            }
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
                                        value={this.loading ? l[5533] : !chatRoom.topic ? l[20660] : link}
                                    />
                                </div>
                                <div className="info">{chatRoom.publicLink ? publicLinkDetails : null}</div>
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
                                    ${this.loading ? 'disabled' : ''}
                                `}
                                onClick={() => {
                                    chatRoom.updatePublicHandle(1);
                                    this.onClose();
                                }}>
                                <span>
                                    {chatRoom.isMeeting ? l.meeting_link_delete : l[20487] /* `Delete chat link` */}
                                </span>
                            </button>
                        }

                        {chatRoom.topic ?
                            chatRoom.publicLink ?
                                <button
                                    className={`
                                        mega-button
                                        positive
                                        copy-to-clipboard
                                        ${this.loading ? 'disabled' : ''}
                                    `}
                                    onClick={() => {
                                        copyToClipboard(link, l[7654] /* `1 link was copied to the clipboard` */);
                                        if (chatRoom.isMeeting) {
                                            eventlog(500231);
                                        }
                                    }}>
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
