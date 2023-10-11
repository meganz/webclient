import React from 'react';
import {MegaRenderMixin} from './../mixins';

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

        this.doResizesOnComponentUpdate = SoonFc(10, function() {
            var self = this;
            if (!self.isMounted()) {
                return;
            }
            var fitHeight = self.contactsListScroll.getContentHeight();
            if (!fitHeight) {
                // not visible at the moment.
                return null;
            }

            var $node = $(self.findDOMNode());
            var $parentContainer = $node.closest('.chat-right-pad');
            var maxHeight = $parentContainer.outerHeight(true) -
                $('.chat-right-head', $parentContainer).outerHeight(true) - 72;

            if (fitHeight  < $('.buttons-block', $parentContainer).outerHeight(true)) {
                fitHeight = Math.max(fitHeight /* margin! */, 53);
            }
            else if (maxHeight < fitHeight) {
                fitHeight = Math.max(maxHeight, 53);
            }
            fitHeight = Math.min(self.calculateListHeight($parentContainer), fitHeight);

            var $contactsList = $('.chat-contacts-list', $parentContainer);

            if ($contactsList.height() !== fitHeight) {
                $('.chat-contacts-list', $parentContainer).height(
                    fitHeight
                );
                if (self.contactsListScroll) {
                    self.contactsListScroll.reinitialise();
                }
            }


            if (self.state.scrollHeight !== fitHeight) {
                self.setState({'scrollHeight': fitHeight});
            }
            self.onUserScroll();
        });
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
    calculateListHeight($parentContainer) {
        var room = this.props.chatRoom;
        return ($parentContainer ? $parentContainer : $('.conversationsApp'))
            .outerHeight() - 3 /* 3 accordion headers */ * 48 - 10 /* some padding */ - (
            room.type === "public" && room.observers > 0 ? 48 : 0 /* Observers row */
        ) - (
            room.isReadOnly() ? 12 : 0 /* is readonly row */
        );
    }
    componentDidUpdate() {
        var self = this;

        if (!self.isMounted()) {
            return;
        }


        if (!self.contactsListScroll) {
            return null;
        }

        self.doResizesOnComponentUpdate();
    }
    render() {
        var self = this;
        var room = this.props.chatRoom;

        if (!room) {
            // destroyed
            return null;
        }

        var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
        var contactListStyles = {};


        // dont wait for render to finish to set height, otherwise there would be a minor flickering in the right
        // pane
        contactListStyles.height = Math.min(
            this.calculateListHeight(), contacts.length * this.props.contactCardHeight
        );


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
                isVisible={self.props.chatRoom.isCurrentlyActive}
                options={{
                    suppressScrollX: true
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

        const { OPERATOR, FULL, READONLY } = ChatRoom.MembersSet.PRIVILEGE_STATE;

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
            room.trigger('onRemoveUserRequest', [contactHash]);
        };

        var onSetPrivClicked = (contactHash, priv) => {
            if (room.members[contactHash] !== priv) {
                room.trigger('alterUserPrivilege', [contactHash, priv]);
            }
        };

        for (var i = 0; i < contacts.length; i++) {
            const contactHash = contacts[i];
            if (!(contactHash in M.u)) {
                continue;
            }

            var contact = M.u[contactHash];

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
                            key="remove" icon="sprite-fm-mono icon-disabled-filled" label={l[8867]}
                            onClick={onRemoveClicked.bind(this, contactHash)}/>
                    );
                }

                if (room.iAmOperator()) {
                    // operator
                    dropdowns.push(
                        <div key="setPermLabel" className="dropdown-items-info">
                            {l[8868]}
                        </div>
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privOperator"
                            icon="sprite-fm-mono icon-admin-outline"
                            label={l[8875]}
                            className={`
                                tick-item
                                ${room.members[contactHash] === OPERATOR ? 'active' : ''}
                            `}
                            disabled={contactHash === u_handle}
                            onClick={() => onSetPrivClicked(contactHash, OPERATOR)}
                        />
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privFullAcc"
                            icon="sprite-fm-mono icon-chat"
                            className={`
                                tick-item
                                ${room.members[contactHash] === FULL ? 'active' : ''}
                            `}
                            disabled={contactHash === u_handle}
                            label={l[8874]}
                            onClick={() => onSetPrivClicked(contactHash, FULL)}
                        />
                    );

                    dropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="privReadOnly"
                            icon="sprite-fm-mono icon-read-only"
                            className={`
                                tick-item
                                ${room.members[contactHash] === READONLY ? 'active' : ''}
                            `}
                            disabled={contactHash === u_handle}
                            label={l[8873]}
                            onClick={() => onSetPrivClicked(contactHash, READONLY)}
                        />
                    );
                }

                const baseClassName = 'sprite-fm-mono';
                // other user privilege
                switch (room.members[contactHash]) {
                    case OPERATOR:
                        dropdownIconClasses = `${baseClassName} icon-admin`;
                        break;
                    case FULL:
                        dropdownIconClasses = `${baseClassName} icon-chat-filled`;
                        break;
                    case READONLY:
                        dropdownIconClasses = `${baseClassName} icon-read-only`;
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
                        dropdownDisabled={contactHash === u_handle || is_chatlink || is_eplusplus}
                        dropdownButtonClasses="contacts-icon"
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
            <div className="chat-contacts-list-inner default-bg" style={contactListInnerStyles}>
                {contactsList}
            </div>
        );
    }
}

export {ParticipantsList};
