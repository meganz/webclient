var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./../../ui/utils.jsx");
var MegaRenderMixin = require("./../../stores/mixins.js").MegaRenderMixin;
var Tooltips = require("./../../ui/tooltips.jsx");
var Forms = require("./../../ui/forms.jsx");
var MiniUI = require("./../../ui/miniui.jsx");
var ContactsUI = require('./contacts.jsx');
var ModalDialogsUI = require('./../../ui/modalDialogs.jsx');


var StartGroupChatWizard = React.createClass({
    mixins: [MegaRenderMixin],
    clickTime: 0,
    getDefaultProps: function() {
        return {
            'selectLabel': __(l[1940]),
            'cancelLabel': __(l[82]),
            'hideable': true,
            'flowType': 1
        }
    },
    getInitialState: function() {
        var haveContacts = false;
        var keys = this.props.contacts.keys();
        for (var i = 0; i < keys.length; i++) {
            if (this.props.contacts[keys[i]].c === 1) {
                haveContacts = true;
                break;
            }
        }

        return {
            'selected': this.props.selected ? this.props.selected : [],
            'haveContacts': haveContacts,
            'step': this.props.flowType === 2 || !haveContacts ? 1 : 0,
            'keyRotation': false,
            'createChatLink': this.props.flowType === 2 ? true : false,
            'groupName': ''
        }
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
    },
    onSelectClicked: function() {
        this.props.onSelectClicked();
    },
    onFinalizeClick: function(e) {
        var self = this;
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        var groupName = self.state.groupName;
        var handles = self.state.selected;
        var keyRotation = self.state.keyRotation;
        var createChatLink = keyRotation ? false : self.state.createChatLink;
        megaChat.createAndShowGroupRoomFor(handles, groupName, keyRotation, createChatLink);
        self.props.onClose(self);
    },
    render: function() {
        var self = this;

        var classes = "new-group-chat contrast small-footer " + self.props.className;

        var contacts = self.props.contacts;
        var haveContacts = self.state.haveContacts;
        var buttons = [];
        var allowNext = false;
        var failedToEnableChatlink = self.state.createChatLink === true && !self.state.groupName;
        if (self.state.keyRotation) {
            failedToEnableChatlink = false;
        }

        if (self.state.step === 0 && haveContacts) {
            // always allow Next even if .selected is empty.
            allowNext = true;

            buttons.push({
                    "label": l[556],
                    "key": "next",
                    // "defaultClassname": "default-grey-button lato right",
                    "defaultClassname": "link-button lato right",
                    "className": !allowNext ? "disabled" : null,
                    "iconAfter": "small-icon grey-right-arrow",
                    "onClick": function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self.setState({'step': 1});
                    }
                });

            buttons.push({
                "label": self.props.cancelLabel,
                "key": "cancel",
                "defaultClassname": "link-button lato left",
                "onClick": function(e) {
                    self.props.onClose(self);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
        else if (self.state.step === 1) {
            allowNext = self.state.createChatLink ? !failedToEnableChatlink  : true;

            contacts = [];
            self.state.selected.forEach(function(h) {
                M.u[h] && contacts.push(M.u[h]);
            });

            buttons.push({
                    "label": l[726],
                    "key": "done",
                    "defaultClassname": "default-grey-button lato right",
                    "className": !allowNext ? "disabled" : null,
                    "onClick": self.onFinalizeClick
                });

            if (!haveContacts || this.props.flowType === 2) {
                buttons.push({
                    "label": self.props.cancelLabel,
                    "key": "cancel",
                    "defaultClassname": "link-button lato left",
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
                    "defaultClassname": "button link-button lato left",
                    "iconBefore": "small-icon grey-left-arrow",
                    "onClick": function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self.setState({'step': 0});
                    }
                });
            }

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

            chatInfoElements = <div>
                <div className={"contacts-search-header left-aligned top-pad" +
                (failedToEnableChatlink ? " failed" : "")}>
                    <i className="small-icon conversations"></i>
                    <input type="search"
                           placeholder="Enter group name" value={self.state.groupName}
                           onKeyDown={function(e) {
                               var code = e.which || e.keyCode;
                               if (allowNext && code === 13) {
                                   if (self.state.step === 1) {
                                       self.onFinalizeClick();
                                   }
                               }
                           }}
                           onChange={function(e) {
                               self.setState({'groupName': e.target.value});
                    }} />
                </div>
                {this.props.flowType !== 2 ?
                <div className="group-chat-dialog content">
                    <MiniUI.ToggleCheckbox className={"right"} checked={self.state.keyRotation} onToggle={function(v) {
                        self.setState({'keyRotation': v});
                    }} />
                    <div className="group-chat-dialog header">
                        {!self.state.keyRotation ? l[20576] : l[20631]}
                    </div>
                    <div className="group-chat-dialog description">{l[20484]}</div>

                    <div className={"group-chat-dialog checkbox " + (
                        self.state.keyRotation ? "disabled" : ""
                    ) + (failedToEnableChatlink ? " failed" : "")} onClick={SoonFc(function(e) {
                        // this is somehow called twice if clicked on the label...
                        self.setState({'createChatLink': !self.state.createChatLink});
                    }, 75)}>
                        <div className={"checkdiv " + checkboxClassName}>
                            <input type="checkbox"
                                  name="group-encryption"
                                  id="group-encryption"
                                  className="checkboxOn hidden" />
                        </div>
                        <label htmlFor="group-encryption" className="radio-txt lato mid">{l[20575]}</label>
                        <div className="clear"></div>
                    </div>
                </div> : null}
                {failedToEnableChatlink ?
                    <div className="group-chat-dialog description chatlinks-intermediate-msg">
                        {l[20573]}
                    </div> : null}
            </div>;
        }


        return (
            <ModalDialogsUI.ModalDialog
                step={self.state.step}
                title={l[19483]}
                className={classes}
                selected={self.state.selected}
                onClose={() => {
                    self.props.onClose(self);
                }}
                triggerResizeOnUpdate={true}
                buttons={buttons}>
                {chatInfoElements}
                <ContactsUI.ContactPickerWidget
                    changedHashProp={self.state.step}
                    megaChat={self.props.megaChat}
                    contacts={contacts}
                    exclude={self.props.exclude}
                    selectableContacts="true"
                    onSelectDone={self.props.onSelectClicked}
                    onSelected={self.onSelected}
                    selected={self.state.selected}
                    headerClasses="left-aligned"
                    multiple={true}
                    readOnly={self.state.step !== 0}
                    allowEmpty={true}
                    showMeAsSelected={self.state.step === 1}
                />
            </ModalDialogsUI.ModalDialog>
        );
    }
});

module.exports = {
    StartGroupChatWizard,
};
