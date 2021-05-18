import React from 'react';
import {MegaRenderMixin} from './../../stores/mixins.js';
import ModalDialogsUI  from './../../ui/modalDialogs.jsx';
import utils  from './../../ui/utils.jsx';


class ChatlinkDialog extends MegaRenderMixin {
    static defaultProps = {
        'requiresUpdateOnResize': true,
        'disableCheckingVisibility': true,
    }
    constructor(props) {
        super(props);
        this.state = {
            'link': l[5533],
            newTopic: ''
        };
        this.onPopupDidMount = this.onPopupDidMount.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onTopicFieldChanged = this.onTopicFieldChanged.bind(this);
        this.onTopicFieldKeyPress = this.onTopicFieldKeyPress.bind(this);
    }
    onPopupDidMount($node) {
        this.$popupNode = $node;
    }
    componentWillMount() {
        const self = this;
        $.dialog = "group-chat-link";
        self.retrieveChatLink();
    }
    retrieveChatLink() {
        const self = this;
        const chatRoom = self.props.chatRoom;
        if (!chatRoom.topic) {
            delete self.loading;
            return;
        }

        self.loading = chatRoom.updatePublicHandle(undefined)
            .always(function() {
                if (chatRoom.publicLink) {
                    self.setState({'link': getBaseUrl() + '/' + chatRoom.publicLink});
                }
                else {
                    self.setState({'link': l[20660]});
                }
            });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if ($.dialog === "group-chat-link") {
            closeDialog();
        }
    }
    componentDidUpdate() {
        const self = this;
        const chatRoom = this.props.chatRoom;
        if (!this.loading && chatRoom.topic) {
            this.retrieveChatLink();
        }

        // Setup toast notification
        this.toastTxt = l[7654];

        if (!this.$popupNode) {
            return;
        }

        const $node = this.$popupNode;
        const $copyButton = $('.copy-to-clipboard', $node);

        $copyButton.rebind('click', function() {
            copyToClipboard(self.state.link, self.toastTxt);
            return false;
        });

        // Setup the copy to clipboard buttons
        $('span', $copyButton).text(l[1990]);
    }
    onClose() {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }
    onTopicFieldChanged(e) {
        this.setState({'newTopic': e.target.value});
    }
    onTopicFieldKeyPress(e) {
        const self = this;
        if (e.which === 13) {
           self.props.chatRoom.setRoomTitle(self.state.newTopic);
        }
    }
    render() {
        const self = this;

        const closeButton = (
            <button
                key="close"
                className={"mega-button negative links-button"}
                onClick={function(e) {
                    self.onClose();
                }}
            >
                <span>{l[148]}</span>
            </button>
        );

        return <ModalDialogsUI.ModalDialog
            {...this.state}
            title={self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? l[9080] : ""}
            className={
                "chat-rename-dialog export-chat-links-dialog group-chat-link" + (
                    !self.props.chatRoom.topic ? " requires-topic" : ""
                )}
            onClose={() => {
                self.onClose(self);
            }}
            dialogName="chat-link-dialog"
            dialogType={self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? 'main' : 'graphic'}
            chatRoom={self.props.chatRoom}
            popupDidMount={self.onPopupDidMount}>

            {
                self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ?
                    <section className="content">
                        <div className="content-block">
                            <div className="export-chat-ink-warning">
                                {l[20617]}
                            </div>
                            <div className="rename-input-bl" style={{
                                width: '320px',
                                margin: '10px auto 20px auto'
                            }}>
                                <input type="text" name="newTopic" value={self.state.newTopic}
                                    ref={function(field) {
                                        self.topicInput = field;
                                    }}
                                    style={{
                                        'paddingLeft': 8,
                                    }}
                                    onChange={self.onTopicFieldChanged.bind(self)}
                                    onKeyPress={self.onTopicFieldKeyPress.bind(self)}
                                    placeholder={l[20616]} maxLength="30"/>
                            </div>
                        </div>
                    </section>
                    :
                    <>
                        <header>
                            <h2 id="chat-link-dialog-title">
                                <utils.EmojiFormattedContent>
                                    {self.props.chatRoom.topic}
                                </utils.EmojiFormattedContent>
                            </h2>
                        </header>
                        <section className="content">
                            <div className="content-block">

                                <div className="chat-link-input">
                                    <i className="sprite-fm-mono icon-link-filled" />
                                    <input type="text" readOnly={true} value={
                                        !self.props.chatRoom.topic ?
                                            l[20660] :
                                            self.state.link
                                    }/>
                                </div>
                                <div className="info">
                                    {self.props.chatRoom.publicLink ? l[20644] : null}
                                </div>
                            </div>
                        </section>
                    </>
            }

            <footer>
                <div className="footer-container">
                    {
                        self.props.chatRoom.iAmOperator() && self.props.chatRoom.publicLink ?
                            <button key="deleteLink" className={"mega-button links-button" + (
                                (
                                    self.loading && self.loading.state() === 'pending'
                                ) ? " disabled" : ""
                            )} onClick={function() {
                                self.props.chatRoom.updatePublicHandle(1);
                                self.onClose();
                            }}>
                                <span>{l[20487]}</span>
                            </button>
                            :
                            null
                    }
                    {
                        self.props.chatRoom.topic ?
                            (
                                self.props.chatRoom.publicLink ?
                                    <button className={"mega-button positive copy-to-clipboard" +
                                    (self.loading && self.loading.state() === 'pending' ? " disabled" : "")}>
                                        <span>{l[63]}</span>
                                    </button>
                                    :
                                    closeButton
                            )
                            :
                            (
                                self.props.chatRoom.iAmOperator() ?
                                    <button key="setTopic" className={"mega-button positive links-button" + (
                                        self.state.newTopic && $.trim(self.state.newTopic) ? "" : " disabled"
                                    )} onClick={function() {
                                        if (self.props.chatRoom.iAmOperator()) {
                                            self.props.chatRoom.setRoomTitle(self.state.newTopic);
                                        }
                                    }}>
                                        <span>{l[20615]}</span>
                                    </button>
                                    :
                                    closeButton
                            )
                    }
                </div>
            </footer>
        </ModalDialogsUI.ModalDialog>;
    }
};

export {
    ChatlinkDialog
};
