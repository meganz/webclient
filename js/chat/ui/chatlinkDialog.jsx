var React = require("react");
var ReactDOM = require("react-dom");
import MegaRenderMixin from './../../stores/mixins.js';
import ModalDialogsUI  from './../../ui/modalDialogs.jsx';
import utils  from './../../ui/utils.jsx';


class ChatlinkDialog extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'requiresUpdateOnResize': true,
        'disableCheckingVisibility': true,
    }
    constructor(props) {
        super(props);
        this.state = {
            'link': l[5533]
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
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = self.props.chatRoom.megaChat;
        $.dialog = "group-chat-link";

        self.retrieveChatLink();
    }
    retrieveChatLink() {
        var self = this;
        var chatRoom = self.props.chatRoom;
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
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        if ($.dialog === "group-chat-link") {
            closeDialog();
        }
    }
    componentDidUpdate() {
        var self = this;
        var chatRoom = this.props.chatRoom;
        if (!this.loading && chatRoom.topic) {
            this.retrieveChatLink();
        }

        // Setup toast notification
        this.toastTxt = l[7654];

        if (!this.$popupNode) {
            return;
        }

        var $node = this.$popupNode;
        var $copyButton = $('.copy-to-clipboard', $node);

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
        var self = this;
       if (e.which === 13) {
           self.props.chatRoom.setRoomTitle(self.state.newTopic);
       }
    }
    render() {
        var self = this;

        var closeButton = <div key="close" className={"default-red-button right links-button"}
                               onClick={function(e) {
                                   self.onClose();
                               }}>
            <span>{l[148]}</span>
        </div>;

        return <ModalDialogsUI.ModalDialog
            title={self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? l[9080] : ""}
            className={
                "fm-dialog chat-rename-dialog export-chat-links-dialog group-chat-link" + (
                    !self.props.chatRoom.topic ? " requires-topic" : ""
                )}
            onClose={() => {
                self.onClose(self);
            }}
            chatRoom={self.props.chatRoom}
            popupDidMount={self.onPopupDidMount}>



            <div className="export-content-block">
                {
                    self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ?
                        <div>
                            <div className="export-chat-ink-warning">
                                {l[20617]}
                            </div>
                            <div className="rename-input-bl" style={{
                                width: '320px',
                                margin: '10px auto 20px auto'
                            }}>
                                <input type="text" name="newTopic" value={self.state.newTopic}
                                       ref={function (field) {
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
                        :

                        <div className="fm-dialog-body">
                            <i className="big-icon group-chat"></i>
                            <div className="chat-title">
                                <utils.EmojiFormattedContent>
                                    {self.props.chatRoom.topic}
                                </utils.EmojiFormattedContent>
                            </div>
                            <div className="chat-link-input">
                                <i className="small-icon blue-chain colorized"></i>
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
                }
            </div>

            <div className="fm-notifications-bottom">
                {
                    self.props.chatRoom.iAmOperator() && self.props.chatRoom.publicLink ?
                        <div key="deleteLink" className={"default-white-button left links-button" + (
                            (
                                self.loading && self.loading.state() === 'pending'
                            ) ? " disabled" : ""
                        )} onClick={function(e) {
                            self.props.chatRoom.updatePublicHandle(1);
                            self.onClose();
                        }}>
                            <span>{l[20487]}</span>
                        </div>
                        :
                        null
                }
                {
                    self.props.chatRoom.topic ?
                        (
                            self.props.chatRoom.publicLink ?
                                <div className={"default-green-button button right copy-to-clipboard" +
                                (self.loading && self.loading.state() === 'pending' ? " disabled" : "")}>
                                    <span>{l[63]}</span>
                                </div>
                                :
                                closeButton
                        )
                        :
                        (
                            self.props.chatRoom.iAmOperator() ?
                                <div key="setTopic" className={"default-red-button right links-button" + (
                                  self.state.newTopic && $.trim(self.state.newTopic) ? "" : " disabled"
                                )} onClick={function(e) {
                                    if (self.props.chatRoom.iAmOperator()) {
                                        self.props.chatRoom.setRoomTitle(self.state.newTopic);
                                    }
                                }}>
                                    <span>{l[20615]}</span>
                                </div>
                                : closeButton
                        )
                }
                <div className="clear"></div>
            </div>
        </ModalDialogsUI.ModalDialog>;
    }
};

export {
    ChatlinkDialog
};
