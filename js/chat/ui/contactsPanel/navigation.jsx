import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ContactsPanel from './contactsPanel.jsx';
import { Button } from '../../../ui/buttons.jsx';

export default class Navigation extends MegaRenderMixin {
    render() {
        const { view } = this.props;
        const { receivedRequestsCount } = this.props;
        const { VIEW, LABEL } = ContactsPanel;

        return (
            <>
                <div className="contacts-navigation">
                    <ul>
                        {Object.keys(VIEW).map(key => {
                            let activeClass = view === VIEW[key] ? 'active' : '';
                            if (view === VIEW.PROFILE && VIEW[key] === VIEW.CONTACTS) {
                                // Profile is subsection of Contacts.
                                activeClass = 'active';
                            }
                            if (VIEW[key] !== VIEW.PROFILE) {
                                return (
                                    <li
                                        key={key}
                                        onClick={() => {
                                            let page = key.toLowerCase().split("_")[0];
                                            page = page === 'contacts' ? '' : page;
                                            loadSubPage(`fm/chat/contacts/${page}`);
                                        }}>
                                        <Button
                                            className={`
                                                mega-button
                                                action
                                                ${activeClass}
                                            `}
                                            receivedRequestsCount={receivedRequestsCount}>
                                            <span>{LABEL[key]}</span>
                                            {receivedRequestsCount > 0 && VIEW[key] === VIEW.RECEIVED_REQUESTS && (
                                                <div className="notifications-count">
                                                    {receivedRequestsCount > 9 ? '9+' : receivedRequestsCount}
                                                </div>
                                            )}
                                        </Button>
                                    </li>
                                );
                            }
                            return null;
                        })}
                    </ul>
                </div>
            </>
        );
    }
}
