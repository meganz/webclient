var React = require("react");
var ReactDOM = require("react-dom");
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var ModalDialogsUI = require('./../../ui/modalDialogs.jsx');
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;


var ParticipantsList = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'requiresUpdateOnResize': true,
            'contactCardHeight': 36

        }
    },
    getInitialState: function() {
        return {
            'scrollPositionY': 0,
            'scrollHeight': 36*4
        };
    },
    onUserScroll: function() {
        var scrollPosY = this.refs.contactsListScroll.getScrollPositionY();
        if (this.state.scrollPositionY !== scrollPosY) {
            this.setState({
                'scrollPositionY': scrollPosY
            });
        }
    },
    componentDidUpdate: function() {
        var self = this;
        if (!self.isMounted()) {
            return;
        }

        var $node = $(self.findDOMNode());

        var scrollHeight;
        if (!self.refs.contactsListScroll) {
            return null;
        }

        var fitHeight = scrollHeight = self.refs.contactsListScroll.getContentHeight();
        if (fitHeight === 0) {
            // not visible at the moment.
            return null;
        }

        var $parentContainer = $node.closest('.chat-right-pad');
        var maxHeight = (
            $parentContainer.outerHeight(true) - $('.buttons-block', $parentContainer).outerHeight(true) -
                $('.chat-right-head', $parentContainer).outerHeight(true) - 72
        );

        if (fitHeight  < $('.buttons-block', $parentContainer).outerHeight(true)) {
            fitHeight = Math.max(fitHeight /* margin! */, 53);
        }
        else if (maxHeight < fitHeight) {
            fitHeight = Math.max(maxHeight, 53);
        }

        var $contactsList = $('.chat-contacts-list', $parentContainer);

        if ($contactsList.height() !== fitHeight + 4) {
            $('.chat-contacts-list', $parentContainer).height(
                fitHeight + 4
            );
            self.refs.contactsListScroll.eventuallyReinitialise(true);
        }


        if (self.state.scrollHeight !== fitHeight) {
            self.setState({'scrollHeight': fitHeight});
        }
        self.onUserScroll();
    },
    render: function() {
        var self = this;
        var room = this.props.chatRoom;

        if (!room) {
            // destroyed
            return null;
        }
        var contactHandle;
        var contact;
        var contacts = room.getParticipantsExceptMe();
        if (contacts && contacts.length > 0) {
            contactHandle = contacts[0];
            contact = M.u[contactHandle];
        }
        else {
            contact = {};
        }


        return <div className="chat-contacts-list">
            <PerfectScrollbar
                chatRoom={room}
                members={room.members}
                ref="contactsListScroll"
                disableCheckingVisibility={true}
                onUserScroll={self.onUserScroll}
                requiresUpdateOnResize={true}
                onAnimationEnd={function() {
                    self.safeForceUpdate();
                }}
            >
                <ParticipantsListInner
                    chatRoom={room} members={room.members}
                    disableCheckingVisibility={true}
                    scrollPositionY={self.state.scrollPositionY}
                    scrollHeight={self.state.scrollHeight}
                />
            </PerfectScrollbar>
        </div>
    }
});



var ParticipantsListInner = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'requiresUpdateOnResize': true,
            'contactCardHeight': 32,
            'scrollPositionY': 0,
            'scrollHeight': 32*4

        }
    },
    getInitialState: function() {
        return {
        };
    },
    render: function() {
        var self = this;
        var room = this.props.chatRoom;

        if (!room) {
            // destroyed
            return null;
        }
        if (!room.isCurrentlyActive && room._leaving !== true) {
            // save some memory/DOM
            return false;
        }
        var contactHandle;
        var contact;
        var contacts = room.getParticipantsExceptMe();
        if (contacts && contacts.length > 0) {
            contactHandle = contacts[0];
            contact = M.u[contactHandle];
        }
        else {
            contact = {};
        }

        var myPresence = room.megaChat.userPresenceToCssClass(M.u[u_handle].presence);

        var contactsList = [];


        contacts = room.type === "group" ?
            (
                room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) :
                    room.getParticipantsExceptMe()
            )   :
            room.getParticipantsExceptMe();
        if (contacts.indexOf(u_handle) >= 0) {
            array.remove(contacts, u_handle, true);
        }
        var firstVisibleUserNum = Math.floor(self.props.scrollPositionY/self.props.contactCardHeight);
        var visibleUsers = Math.ceil(self.props.scrollHeight/self.props.contactCardHeight);
        var lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

        var contactListInnerStyles = {
            'height': contacts.length * self.props.contactCardHeight
        };

        // slice and only add a specific number of contacts to the list


        if (room.type === "group" && !room.stateIsLeftOrLeaving()) {
            contacts.unshift(
                u_handle
            );
            contactListInnerStyles.height += self.props.contactCardHeight;
        }

        var i = 0;
        contacts.forEach(function(contactHash) {
            var contact = M.u[contactHash];
            if (contact) {
                if (i < firstVisibleUserNum || i > lastVisibleUserNum) {
                    i++;
                    return;
                }
                var dropdowns = [];
                var privilege = null;

                var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";

                if (room.type === "group" && room.members) {
                    var dropdownRemoveButton = [];

                    if (room.iAmOperator() && contactHash !== u_handle) {
                        dropdownRemoveButton.push(
                            <DropdownsUI.DropdownItem className="red"
                                key="remove" icon="rounded-stop" label={__(l[8867])} onClick={() => {
                                $(room).trigger('onRemoveUserRequest', [contactHash]);
                            }}/>
                       );
                    }


                    if (room.iAmOperator() || contactHash === u_handle) {
                        // operator

                        dropdowns.push(
                            <div key="setPermLabel" className="dropdown-items-info">
                                {__(l[8868])}
                            </div>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privOperator" icon="gentleman"
                                label={__(l[8875])}
                                className={"tick-item " + (room.members[contactHash] === 3 ? "active" : "")}
                                disabled={contactHash === u_handle}
                                onClick={() => {
                                    if (room.members[contactHash] !== 3) {
                                        $(room).trigger('alterUserPrivilege', [contactHash, 3]);
                                    }
                                }}/>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privFullAcc" icon="conversation-icon"
                                className={"tick-item " + (room.members[contactHash] === 2 ? "active" : "")}
                                disabled={contactHash === u_handle}
                                label={__(l[8874])} onClick={() => {
                                if (room.members[contactHash] !== 2) {
                                    $(room).trigger('alterUserPrivilege', [contactHash, 2]);
                                }
                            }}/>
                        );

                        dropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="privReadOnly" icon="eye-icon"
                                className={"tick-item " + (room.members[contactHash] === 0 ? "active" : "")}
                                disabled={contactHash === u_handle}
                                label={__(l[8873])} onClick={() => {
                                if (room.members[contactHash] !== 0) {
                                    $(room).trigger('alterUserPrivilege', [contactHash, 0]);
                                }
                            }}/>
                        );

                    }
                    else if (room.members[u_handle] === 2) {
                        // full access

                    }
                    else if (room.members[u_handle] === 1) {
                        // read write
                        // should not happen.

                    }
                    else if (room.isReadOnly()) {
                        // read only
                    }
                    else {
                        // should not happen.
                    }



                    // other user privilege
                    if (room.members[contactHash] === 3) {
                        dropdownIconClasses = "small-icon gentleman";
                    }
                    else if (room.members[contactHash] === 2) {
                        dropdownIconClasses = "small-icon conversation-icon";
                    } else if (room.members[contactHash] === 0) {
                        dropdownIconClasses = "small-icon eye-icon";
                    }
                    else {
                        // should not happen.
                    }

                }

                contactsList.push(
                    <ContactsUI.ContactCard
                        key={contact.u}
                        contact={contact}
                        megaChat={room.megaChat}
                        className="right-chat-contact-card"
                        dropdownPositionMy="left top"
                        dropdownPositionAt="left top"
                        dropdowns={dropdowns}
                        dropdownDisabled={contactHash === u_handle}
                        dropdownButtonClasses={
                            room.type == "group" ? "button icon-dropdown" : "default-white-button tiny-button"
                        }
                        dropdownRemoveButton={dropdownRemoveButton}
                        dropdownIconClasses={dropdownIconClasses}
                        isInCall={room.uniqueCallParts && room.uniqueCallParts[contactHash]}
                    />
                );

                i++;
            }
        });



        return <div className="chat-contacts-list-inner" style={contactListInnerStyles}>
                {contactsList}
            </div>;
    }
});
module.exports = {
    ParticipantsList,
};
