import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import ContactsPanel from './contactsPanel.jsx';
import { Button } from '../../../ui/buttons.jsx';

export default class Navigation extends MegaRenderMixin {
    requestReceivedListener = null;

    state = {
        receivedRequestsCount: 0
    }

    constructor(props) {
        super(props);
        this.state.receivedRequestsCount = Object.keys(M.ipc).length;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ receivedRequestsCount: Object.keys(M.ipc).length })
        );
    }

    render() {
        const { view } = this.props;
        const { receivedRequestsCount } = this.state;
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
                                            `}>
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
                {ContactsPanel.hasContacts() ? null : (
                    <div className="back-to-landing">
                        <Button
                            className="mega-button action"
                            icon="sprite-fm-mono icon-left"
                            onClick={() => loadSubPage('fm/chat')}>
                            {l.back_to_chat_landing_page}
                        </Button>
                    </div>
                )}
            </>
        );
    }
}
