import React from 'react';
import { Button } from '../../ui/buttons.jsx';
import Link from './link.jsx';
import { reactStringWrap } from '../../ui/utils.jsx';

const Tile = ({ title, desc, imgClass, buttonPrimary, buttonSecondary, onClickPrimary, onClickSecondary }) =>
    <div className="conversations-empty-tile">
        <span className={`chat-tile-img ${imgClass}`}/>
        <div className="tile-content">
            <h2>{title}</h2>
            <div>{desc}</div>
            <Button
                className="mega-button positive"
                label={buttonPrimary}
                onClick={onClickPrimary}
            />
            {
                buttonSecondary &&
                <Button
                    className="mega-button action positive"
                    icon="sprite-fm-mono icon-link"
                    label={buttonSecondary}
                    onClick={onClickSecondary}
                />
            }
        </div>
    </div>;


export default class EmptyConversationsPanel extends React.Component {
    domRef = React.createRef();

    state = {
        linkData: '',
    };

    componentDidMount() {
        (M.account && M.account.contactLink ? Promise.resolve(M.account.contactLink) : api.send('clc'))
            .then(res => {
                if (this.domRef?.current && typeof res === 'string') {
                    const prefix = res.startsWith('C!') ? '' : 'C!';
                    this.setState({ linkData: `${getBaseUrl()}/${prefix}${res}` });
                }
            })
            .catch(dump);
    }

    render() {
        const { isMeeting, onNewChat, onStartMeeting, onScheduleMeeting } = this.props;
        const { linkData } = this.state;

        return (
            <div
                ref={this.domRef}
                className="conversations-empty">
                <div className="conversations-empty-header">
                    <h1>{
                        isMeeting ?
                            l.meetings_empty_header : /* `Get together with MEGA meetings` */
                            l.chat_empty_header /* `Keep in touch with MEGA chat` */
                    }</h1>
                    <h3>
                        {reactStringWrap(
                            isMeeting ?
                                l.meetings_empty_subheader : /* `Voice and video calls, protected with...` */
                                l.chat_empty_subheader, /* `Direct messaging, group chats and calling anyone, on...` */
                            '[A]',
                            Link,
                            {
                                onClick: () => {
                                    window.open('https://mega.io/chatandmeetings', '_blank', 'noopener,noreferrer');
                                    eventlog(this.props.isMeeting ? 500281 : 500280);
                                }
                            }
                        )}
                    </h3>
                </div>
                <div className="conversations-empty-content">
                    <Tile
                        title={
                            isMeeting ?
                                l.meetings_empty_calls_head : /* `Video call with anyone` */
                                l.invite_friend_btn /* `Invite a friend` */
                        }
                        desc={
                            isMeeting ?
                                l.meetings_empty_calls_desc : /* `Start a meeting now, and invite anyone to join...` */
                                l.chat_empty_contact_desc /* `Add friends and family and get 5 GB of free cloud...` */
                        }
                        imgClass={isMeeting ? 'empty-meetings-call' : 'empty-chat-contacts'}
                        buttonPrimary={
                            isMeeting ?
                                l.new_meeting_start : /* `Start meeting now` */
                                l[71] /* `Add contact` */
                        }
                        buttonSecondary={!isMeeting && linkData && l.copy_contact_link_btn}
                        onClickPrimary={() => {
                            if (isMeeting) {
                                onStartMeeting();
                                eventlog(500275);
                            }
                            else {
                                contactAddDialog();
                                eventlog(500276);
                            }
                        }}
                        onClickSecondary={() => {
                            /* `Copied to clipboard` */
                            copyToClipboard(linkData, `${l[371]}<span class="link-text">${linkData}</span>`);
                            delay('chat-event-copy-contact-link', () => eventlog(500277));
                        }}
                    />
                    <Tile
                        title={
                            isMeeting ?
                                l.meetings_empty_schedule_head /* `Plan a meeting` */
                                : l.chat_empty_add_chat_header /* `Start chatting` */
                        }
                        desc={
                            isMeeting ?
                                l.meetings_empty_schedule_desc : /* `Schedule one-off or recurring meetings, ...` */
                                l.chat_empty_add_chat_desc /* `Anyone with a link can join your chat, ...` */
                        }
                        imgClass={isMeeting ? 'empty-meetings-schedule' : 'empty-chat-new'}
                        buttonPrimary={
                            isMeeting ?
                                l.schedule_meeting_start : /* `Schedule meeting` */
                                l.add_chat /* `New chat` */
                        }
                        onClickPrimary={() => {
                            if (isMeeting) {
                                onScheduleMeeting();
                                eventlog(500278);
                            }
                            else {
                                onNewChat();
                                eventlog(500279);
                            }
                        }}
                    />
                </div>
            </div>
        );
    }
}
