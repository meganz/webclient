import React from 'react';
import {MegaRenderMixin} from './../../stores/mixins.js';
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var PerfectScrollbar = require('./../../ui/perfectScrollbar.jsx').PerfectScrollbar;

class ParticipantsList extends MegaRenderMixin {
    static defaultProps = {
        'requiresUpdateOnResize': true,
        'contactCardHeight': 36
    };
    constructor(props) {
        super(props);
        this.state = {
            'scrollPositionY': 0,
            'scrollHeight': 36 * 4
        };
    }
    onUserScroll() {
        if (!this.contactsListScroll) {
            return;
        }

        var scrollPosY = this.contactsListScroll.getScrollPositionY();
        if (this.state.scrollPositionY !== scrollPosY) {
            this.setState({
                'scrollPositionY': scrollPosY
            });
        }
    }
    componentDidUpdate() {
        var self = this;

        if (!self.isMounted()) {
            return;
        }

        var $node = $(self.findDOMNode());

        if (!self.contactsListScroll) {
            return null;
        }
        var scrollHeight = self.contactsListScroll.getContentHeight();
        var fitHeight = scrollHeight;
        if (fitHeight === 0) {
            // not visible at the moment.
            return null;
        }

        var $parentContainer = $node.closest('.chat-right-pad');
        var maxHeight = $parentContainer.outerHeight(true) - $('.buttons-block', $parentContainer).outerHeight(true) -
            $('.chat-right-head', $parentContainer).outerHeight(true) - 72;

        if (fitHeight  < $('.buttons-block', $parentContainer).outerHeight(true)) {
            fitHeight = Math.max(fitHeight /* margin! */, 53);
        }
        else if (maxHeight < fitHeight) {
            fitHeight = Math.max(maxHeight, 53);
        }
        fitHeight = Math.min(200, fitHeight);

        var $contactsList = $('.chat-contacts-list', $parentContainer);

        if ($contactsList.height() !== fitHeight + 4) {
            $('.chat-contacts-list', $parentContainer).height(
                fitHeight + 4
            );
            self.contactsListScroll.eventuallyReinitialise(true);
        }


        if (self.state.scrollHeight !== fitHeight) {
            self.setState({'scrollHeight': fitHeight});
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
        var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
        if (contacts && contacts.length > 0) {
            contactHandle = contacts[0];
        }

        var contactListStyles = {};

        if (contacts.length > 7) {
            contactListStyles.height = 204;
        }


        return <div className="chat-contacts-list" style={contactListStyles}>
            <PerfectScrollbar
                chatRoom={room}
                members={room.members}
                ref={function(ref) {
                    self.contactsListScroll = ref;
                }}
                disableCheckingVisibility={true}
                onUserScroll={SoonFc(self.onUserScroll.bind(self), 76)}
                requiresUpdateOnResize={true}
                onAnimationEnd={function() {
                    self.safeForceUpdate();
                }}
            >
                <ParticipantsListInner
                    chatRoom={room}
                    members={room.members}
                    scrollPositionY={self.state.scrollPositionY}
                    scrollHeight={self.state.scrollHeight}
                    disableCheckingVisibility={true}
                />
            </PerfectScrollbar>
        </div>
    }
};




class ParticipantsListInner extends MegaRenderMixin {
    static defaultProps = {
        'requiresUpdateOnResize': true,
        'contactCardHeight': 32,
        'scrollPositionY': 0,
        'scrollHeight': 128,
        'chatRoom': undefined
    }
    render() {
        var room = this.props.chatRoom;
        var contactCardHeight = this.props.contactCardHeight;
        var scrollPositionY = this.props.scrollPositionY;
        var scrollHeight = this.props.scrollHeight;

        const {FULL, OPERATOR, READONLY} = ChatRoom.MembersSet.PRIVILEGE_STATE;

        if (!room) {
            // destroyed
            return null;
        }
        if (!room.isCurrentlyActive && room._leaving !== true) {
            // save some memory/DOM
            return false;
        }
        var contacts = room.getParticipantsExceptMe();

        var contactsList = [];

        const firstVisibleUserNum = Math.floor(scrollPositionY / contactCardHeight);
        const visibleUsers = Math.ceil(scrollHeight / contactCardHeight);
        const lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

        // const firstVisibleUserNum = 0;
        // const lastVisibleUserNum = contacts.length;
        var contactListInnerStyles = {
            'height': contacts.length * contactCardHeight
        };

        // slice and only add a specific number of contacts to the list


        if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving()
            && room.members.hasOwnProperty(u_handle)) {
            contacts.unshift(u_handle);
            contactListInnerStyles.height += contactCardHeight;
        }

        var onRemoveClicked = (contactHash) => {
            $(room).trigger('onRemoveUserRequest', [contactHash]);
        };

        var onSetPrivClicked = (contactHash, priv) => {
            if (room.members[contactHash] !== priv) {
                $(room).trigger('alterUserPrivilege', [contactHash, priv]);
            }
        };

        for (var i = 0; i < contacts.length; i++) {
            var contactHash = contacts[i];
            var contact = M.u[contactHash];

            if (!contact) {
                continue;
            }
            if (i < firstVisibleUserNum || i > lastVisibleUserNum) {
                continue;
            }
            var dropdowns = [];

            var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";
            var dropdownRemoveButton = [];

            if (room.type === "public" || room.type === "group" && room.members) {

                if (room.iAmOperator() && contactHash !== u_handle) {
                    dropdownRemoveButton.push(
                        <DropdownsUI.DropdownItem className="red"
                            key="remove" icon="rounded-stop" label={__(l[8867])}
                            onClick={onRemoveClicked.bind(this, contactHash)}/>
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
                            onClick={onSetPrivClicked.bind(this, contactHash, FULL)} />
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privFullAcc" icon="conversation-icon"
                            className={"tick-item " + (room.members[contactHash] === OPERATOR ? "active" : "")}
                            disabled={contactHash === u_handle}
                            label={__(l[8874])} onClick={onSetPrivClicked.bind(this, contactHash, OPERATOR)} />
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privReadOnly" icon="eye-icon"
                            className={"tick-item " + (room.members[contactHash] === READONLY ? "active" : "")}
                            disabled={contactHash === u_handle}
                            label={__(l[8873])} onClick={onSetPrivClicked.bind(this, contactHash, READONLY)}/>
                    );

                }

                // other user privilege
                switch (room.members[contactHash]) {
                    case FULL:
                        dropdownIconClasses = "small-icon gentleman";
                        break;
                    case OPERATOR:
                        dropdownIconClasses = "small-icon conversation-icon";
                        break;
                    case READONLY:
                        dropdownIconClasses = "small-icon eye-icon";
                        break;
                    default:
                        break;
                }

                contactsList.push(
                    <ContactsUI.ContactCard
                        key={contact.u}
                        contact={contact}
                        chatRoom={room}
                        className="right-chat-contact-card"
                        dropdownPositionMy="left top"
                        dropdownPositionAt="left top"
                        dropdowns={dropdowns}
                        dropdownDisabled={contactHash === u_handle || anonymouschat}
                        dropdownButtonClasses="button icon-dropdown"
                        dropdownRemoveButton={dropdownRemoveButton}
                        dropdownIconClasses={dropdownIconClasses}
                        noLoading={true}
                        isInCall={room.uniqueCallParts && room.uniqueCallParts[contactHash]}
                        style={{
                            width: 234,
                            position: 'absolute',
                            top: i * contactCardHeight
                        }}
                    />
                );
            }
        }

        return (
            <div className="chat-contacts-list-inner horizontal-sprite" style={contactListInnerStyles}>
                {contactsList}
            </div>
        );
    }
}

export {ParticipantsList};
