import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import ContactsPanel from './contactsPanel.jsx';

export default class Navigation extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { view, receivedRequestsCount } = this.props;
        const { VIEW } = ContactsPanel;

        return (
            <div className="contacts-navigation">
                <ul>
                    {Object.keys(VIEW).map(key => {
                        let activeClass = view === VIEW[key] ? 'active' : '';
                        if (view === VIEW.PROFILE && VIEW[key] === ContactsPanel.VIEW.CONTACTS) {
                            // Profile is subsection of Contacts.
                            activeClass = 'active';
                        }
                        if (VIEW[key] !== ContactsPanel.VIEW.PROFILE) {
                            return (
                                <li
                                    key={key}
                                    onClick={() => {
                                        let page = key.toLowerCase().split("_")[0];
                                        page = page === "contacts" ? "" : page;
                                        loadSubPage("fm/chat/contacts/" + page);
                                    }}>
                                    <button
                                        className={`
                                        mega-button
                                        action
                                        ${activeClass}
                                    `}>
                                        <span>{ContactsPanel.LABEL[key]}</span>
                                        {receivedRequestsCount > 0
                                        && VIEW[key] === VIEW.RECEIVED_REQUESTS &&
                                            <div className="notifications-count ipc-count">
                                                {receivedRequestsCount > 9 ? "9+" : receivedRequestsCount}</div>
                                        }
                                    </button>
                                </li>
                            );
                        }
                        return null;
                    })}
                </ul>
            </div>
        );
    }
}
