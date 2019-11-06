import React from 'react';
import MegaRenderMixin from './../../stores/mixins.js';
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;

class ParticipantsList extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'requiresUpdateOnResize': true,
        'contactCardHeight': 36
    };
    constructor(props) {
        super(props);
        this.state = {
            'scrollPositionY': 0,
            'scrollHeight': 36*4
        };
    }
    onUserScroll() {
        // var scrollPosY = this.refs.contactsListScroll.getScrollPositionY();
        // if (this.state.scrollPositionY !== scrollPosY) {
        //     this.setState({
        //         'scrollPositionY': scrollPosY
        //     });
        // }
    }
    componentDidUpdate() {
        var self = this;
        if (!self.isMounted()) {
            return;
        }
        self.onUserScroll();
    }
    render() {
        var self = this;
        var room = this.props.chatRoom;

        if (!room) {
            // destroyed
            return null;
        }
        var contactHandle;
        var contact;
        var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
        if (contacts && contacts.length > 0) {
            contactHandle = contacts[0];
            contact = M.u[contactHandle];
        }
        else {
            contact = {};
        }


        return <div className="chat-contacts-list">
            <ParticipantsListInner
                chatRoom={room} members={room.members}
                disableCheckingVisibility={true}
            />
        </div>
    }
};



function ParticipantsListInner({
    requiresUpdateOnResize = true,
    contactCardHeight = 32,
    scrollPositionY = 0,
    scrollHeight = 128,
    chatRoom: room
}) {
    const { FULL, OPERATOR, READONLY } = ChatRoom.MembersSet.PRIVILEGE_STATE;

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

    const myPresence = anonymouschat ? 'offline' : room.megaChat.userPresenceToCssClass(M.u[u_handle].presence);

    var contactsList = [];


    // const firstVisibleUserNum = Math.floor(scrollPositionY/contactCardHeight);
    // const visibleUsers = Math.ceil(scrollHeight/contactCardHeight);
    // const lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

    const firstVisibleUserNum = 0;
    const lastVisibleUserNum = contacts.length;
    var contactListInnerStyles = {
        'height': contacts.length * contactCardHeight
    };

    // slice and only add a specific number of contacts to the list


    if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving()
        && room.members.hasOwnProperty(u_handle)) {
        contacts.unshift(u_handle);
        contactListInnerStyles.height += contactCardHeight;
    }

    var i = 0;
    contacts.forEach(function(contactHash) {
        var contact = M.u[contactHash];

        if (contact) {
            // TODO: eventually re-implement "show on scroll" and dynamic rendering.
            if (i < firstVisibleUserNum || i > lastVisibleUserNum) {
                i++;
                return;
            }
            var dropdowns = [];
            var privilege = null;

            var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";

            if ((room.type === "public") ||
                (room.type === "group" && room.members)) {
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
                            className={"tick-item " + (room.members[contactHash] === FULL ? "active" : "")}
                            disabled={contactHash === u_handle}
                            onClick={() => {
                                if (room.members[contactHash] !== FULL) {
                                    $(room).trigger('alterUserPrivilege', [contactHash, FULL]);
                                }
                            }}/>
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privFullAcc" icon="conversation-icon"
                            className={"tick-item " + (room.members[contactHash] === OPERATOR ? "active" : "")}
                            disabled={contactHash === u_handle}
                            label={__(l[8874])} onClick={() => {
                            if (room.members[contactHash] !== OPERATOR) {
                                $(room).trigger('alterUserPrivilege', [contactHash, OPERATOR]);
                            }
                        }}/>
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privReadOnly" icon="eye-icon"
                            className={"tick-item " + (room.members[contactHash] === READONLY ? "active" : "")}
                            disabled={contactHash === u_handle}
                            label={__(l[8873])} onClick={() => {
                            if (room.members[contactHash] !== READONLY) {
                                $(room).trigger('alterUserPrivilege', [contactHash, READONLY]);
                            }
                        }}/>
                    );

                }
                else if (room.members[u_handle] === OPERATOR) {
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
                if (room.members[contactHash] === FULL) {
                    dropdownIconClasses = "small-icon gentleman";
                }
                else if (room.members[contactHash] === OPERATOR) {
                    dropdownIconClasses = "small-icon conversation-icon";
                } else if (room.members[contactHash] === READONLY) {
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
                    className="right-chat-contact-card"
                    dropdownPositionMy="left top"
                    dropdownPositionAt="left top"
                    dropdowns={dropdowns}
                    dropdownDisabled={contactHash === u_handle || anonymouschat}
                    dropdownButtonClasses={
                        (room.type == "group" || room.type === "public") &&
                        myPresence !== 'offline' ? "button icon-dropdown" : "button icon-dropdown"
                    }
                    dropdownRemoveButton={dropdownRemoveButton}
                    dropdownIconClasses={dropdownIconClasses}
                    isInCall={room.uniqueCallParts && room.uniqueCallParts[contactHash]}
                />
            );

            i++;
        }
    });

    return (
        <div className="chat-contacts-list-inner" style={contactListInnerStyles}>
            {contactsList}
        </div>
    );
};
export {ParticipantsList};
