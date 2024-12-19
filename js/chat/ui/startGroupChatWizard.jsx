var React = require("react");
import {MegaRenderMixin} from "./../mixins";
import MiniUI from "./../../ui/miniui.jsx";
import {ContactPickerWidget} from './contacts.jsx';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';


export class StartGroupChatWizard extends MegaRenderMixin {
    domRef = React.createRef();
    inputContainerRef = React.createRef();
    inputRef = React.createRef();

    static clickTime = 0;
    static defaultProps = {
        'selectLabel': l[1940],
        'cancelLabel': l[82],
        'hideable': true,
        'flowType': 1,
        'pickerClassName': '',
        'showSelectedNum': false,
        'disableFrequents': false,
        'notSearchInEmails': false,
        'autoFocusSearchField': true,
        'selectCleanSearchRes': true,
        'disableDoubleClick': false,
        'newEmptySearchResult': false,
        'newNoContact': false,
        'closeDlgOnClickOverlay': true,
        'emailTooltips': false
    };

    constructor(props) {
        super(props);

        var haveContacts = false;
        var keys = M.u.keys();
        for (var i = 0; i < keys.length; i++) {
            if (M.u[keys[i]].c === 1) {
                haveContacts = true;
                break;
            }
        }

        this.state = {
            'selected': this.props.selected ? this.props.selected : [],
            'haveContacts': haveContacts,
            'step': this.props.flowType === 2 || !haveContacts ? 1 : 0,
            'keyRotation': false,
            'createChatLink': this.props.flowType === 2 ? true : false,
            'groupName': '',
            openInvite: 1,
        }
        this.onFinalizeClick = this.onFinalizeClick.bind(this);
        this.onSelectClicked = this.onSelectClicked.bind(this);
        this.onSelected = this.onSelected.bind(this);
    }
    onSelected(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
    }
    onSelectClicked() {
        if (this.props.onSelectClicked) {
            this.props.onSelectClicked();
        }
    }
    onFinalizeClick(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const { groupName, selected, keyRotation, createChatLink, openInvite } = this.state;

        megaChat.createAndShowGroupRoomFor(selected, groupName.trim(), {
            keyRotation,
            createChatLink: keyRotation ? false : createChatLink,
            openInvite,
        });
        this.props.onClose(this);
        eventlog(500236);
    }
    render() {
        var self = this;

        var classes = "new-group-chat contrast small-footer contact-picker-widget " + self.props.className;

        var contacts = M.u;
        var haveContacts = self.state.haveContacts;
        var buttons = [];
        var allowNext = false;
        var failedToEnableChatlink = self.state.failedToEnableChatlink && self.state.createChatLink === true &&
            !self.state.groupName;

        if (self.state.keyRotation) {
            failedToEnableChatlink = false;
        }

        var extraContent;
        if (this.props.extraContent) {
            self.state.step = 0;
            extraContent = <div className="content-block imported"></div>;
        }
        else if (self.state.step === 0 && haveContacts) {
            // always allow Next even if .selected is empty.
            allowNext = true;

            buttons.push({
                "label": self.props.cancelLabel,
                "key": "cancel",
                "onClick": function(e) {
                    self.props.onClose(self);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            buttons.push({
                "label": l[556],
                "key": "next",
                "className": !allowNext ? "disabled positive" : "positive",
                "onClick": function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.setState({'step': 1});
                }
            });
        }
        else if (self.state.step === 1) {
            allowNext = self.state.createChatLink ? !failedToEnableChatlink  : true;

            contacts = [];
            self.state.selected.forEach(function(h) {
                if (h in M.u) {
                    contacts.push(M.u[h]);
                }
            });

            if (!haveContacts || this.props.flowType === 2) {
                buttons.push({
                    "label": self.props.cancelLabel,
                    "key": "cancel",
                    "onClick": function(e) {
                        self.props.onClose(self);
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            }
            else {
                buttons.push({
                    "label": l[822],
                    "key": "back",
                    "onClick": function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self.setState({'step': 0});
                    }
                });
            }

            buttons.push({
                "label": l[726],
                "key": "done",
                "className": !allowNext ? "positive disabled" : "positive",
                "onClick": function(e) {
                    if (self.state.createChatLink === true && !self.state.groupName) {
                        self.setState({'failedToEnableChatlink': true});
                    }
                    else {
                        self.onFinalizeClick(e);
                    }
                }
            });
        }

        var chatInfoElements;
        if (self.state.step === 1) {
            var checkboxClassName = self.state.createChatLink ? "checkboxOn" : "checkboxOff";

            if (failedToEnableChatlink && self.state.createChatLink) {
                checkboxClassName += " intermediate-state";
            }
            if (self.state.keyRotation) {
                checkboxClassName = "checkboxOff";
            }

            chatInfoElements = (
                <>
                    <div
                        className={`
                            contacts-search-header left-aligned top-pad
                            ${failedToEnableChatlink ? 'failed' : ''}
                        `}>
                        <div
                            className={`
                                mega-input
                                with-icon
                                box-style
                                ${this.state.groupName?.length > 0 ? 'valued' : ''}
                                ${failedToEnableChatlink ? 'error msg' : ''}
                            `}
                            ref={this.inputContainerRef}>
                            <i className="sprite-fm-mono icon-channel-new" />
                            <input
                                autoFocus
                                className="megaInputs"
                                type="text"
                                ref={this.inputRef}
                                placeholder={l[18509] /* `Enter group name` */}
                                value={this.state.groupName}
                                maxLength={ChatRoom.TOPIC_MAX_LENGTH}
                                onKeyDown={e => {
                                    const code = e.which || e.keyCode;
                                    if (allowNext && code === 13 && self.state.step === 1) {
                                        this.onFinalizeClick();
                                    }
                                }}
                                onChange={e => {
                                    const containerRef = this.inputContainerRef.current;
                                    const { value } = e.target;
                                    containerRef.classList[value.length > 0 ? 'add' : 'remove']('valued');
                                    this.setState({ groupName: value, failedToEnableChatlink: false });
                                }}
                            />
                        </div>
                    </div>
                    {this.props.flowType === 2 ? null : (
                        <div className="group-chat-dialog content">
                            <MiniUI.ToggleCheckbox
                                className="rotation-toggle"
                                checked={this.state.keyRotation}
                                onToggle={keyRotation =>
                                    this.setState({ keyRotation }, () =>
                                        this.inputRef.current.focus()
                                    )
                                }
                            />
                            <div className="group-chat-dialog header">
                                {l[20576] /* `Encrypted key rotation` */}
                            </div>
                            <div className="group-chat-dialog description">
                                {l[20484]}
                            </div>

                            <MiniUI.ToggleCheckbox
                                className="open-invite-toggle"
                                checked={this.state.openInvite}
                                value={this.state.openInvite}
                                onToggle={openInvite =>
                                    this.setState({ openInvite }, () =>
                                        this.inputRef.current.focus()
                                    )
                                }
                            />
                            <div className="group-chat-dialog header">
                                {l.open_invite_label /* `Chat invitations` */}
                            </div>
                            <div className="group-chat-dialog description">
                                {l.open_invite_desc /* `Non-host can add participants to the chat` */}
                            </div>

                            <div
                                className={`
                                    group-chat-dialog checkbox
                                    ${this.state.keyRotation ? 'disabled' : ''}
                                    ${failedToEnableChatlink ? 'failed' : ''}
                                `}
                                onClick={() => {
                                    delay(
                                        'chatWizard-createChatLink',
                                        () => {
                                            this.setState(state => ({ createChatLink: !state.createChatLink }));
                                            this.inputRef.current.focus();
                                        },
                                        100
                                    );
                                }}>
                                <div className={`checkdiv ${checkboxClassName}`}>
                                    <input
                                        type="checkbox"
                                        name="group-encryption"
                                        id="group-encryption"
                                        className="checkboxOn hidden"
                                    />
                                </div>
                                <label htmlFor="group-encryption" className="radio-txt lato mid">{l[20575]}</label>
                                <div className="clear" />
                            </div>
                        </div>
                    )}
                    {failedToEnableChatlink ? (
                        <div className="group-chat-dialog description chatlinks-intermediate-msg">{l[20573]}</div>
                    ) : null}
                </>
            );
        }

        return (
            <ModalDialogsUI.ModalDialog
                step={self.state.step}
                title={this.props.flowType === 2 && self.state.createChatLink
                    ? l[20638] : this.props.customDialogTitle || l[19483]}
                className={classes}
                dialogType="tool"
                dialogName="group-chat-dialog"
                showSelectedNum={self.props.showSelectedNum}
                selectedNum={self.state.selected.length}
                closeDlgOnClickOverlay={self.props.closeDlgOnClickOverlay}
                onClose={() => {
                    self.props.onClose(self);
                }}
                popupDidMount={(elem) => {
                    if (this.props.extraContent) {
                        elem.querySelector('.content-block.imported')?.appendChild(this.props.extraContent);
                    }
                    if (this.props.onExtraContentDidMount) {
                        this.props.onExtraContentDidMount(elem);
                    }
                }}
                triggerResizeOnUpdate={true}
                buttons={buttons}>
                <div
                    ref={this.domRef}
                    className="content-block">
                    {chatInfoElements}
                    <ContactPickerWidget
                        changedHashProp={self.state.step}
                        exclude={self.props.exclude}
                        contacts={contacts}
                        selectableContacts="true"
                        onSelectDone={self.onSelectClicked}
                        onSelected={self.onSelected}
                        selected={self.state.selected}
                        headerClasses="left-aligned"
                        multiple={true}
                        readOnly={self.state.step !== 0}
                        allowEmpty={true}
                        showMeAsSelected={self.state.step === 1}
                        className={self.props.pickerClassName}
                        disableFrequents={self.props.disableFrequents}
                        notSearchInEmails={self.props.notSearchInEmails}
                        autoFocusSearchField={self.props.autoFocusSearchField}
                        selectCleanSearchRes={self.props.selectCleanSearchRes}
                        disableDoubleClick={self.props.disableDoubleClick}
                        selectedWidthSize={self.props.selectedWidthSize}
                        emptySelectionMsg={self.props.emptySelectionMsg}
                        newEmptySearchResult={self.props.newEmptySearchResult}
                        newNoContact={self.props.newNoContact}
                        highlightSearchValue={self.props.highlightSearchValue}
                        emailTooltips={self.props.emailTooltips}
                    />
                </div>
                {extraContent}
            </ModalDialogsUI.ModalDialog>
        );
    }
};

window.StartGroupChatDialogUI = {
    StartGroupChatWizard,
};

export default {
    StartGroupChatWizard
};
