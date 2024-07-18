import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import { ParsedHTML, reactStringWrap } from '../../../../ui/utils.jsx';
import { Avatar, ContactAwareName } from '../../contacts.jsx';
import Button from '../button.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';
import Link from "../../link";

const NAMESPACE = 'admit';

export default class Admit extends MegaRenderMixin {
    peersWaitingRef = React.createRef();

    state = {
        expanded: false
    };

    get isUserLimited() {
        const { call, chatRoom, peers } = this.props;
        return call.sfuClient.callLimits && call.sfuClient.callLimits.usr &&
            chatRoom.getCallParticipants().length + (peers ? peers.length : 0) > call.sfuClient.callLimits.usr;
    }

    doAdmit = peers => this.props.call?.sfuClient?.wrAllowJoin([peers]);

    doDeny = peers => this.props.call?.sfuClient?.wrKickOut([peers]);

    Icon = ({ icon, label, onClick }) =>
        <i
            className={`
                sprite-fm-mono
                simpletip
                ${icon}
            `}
            data-simpletip={label}
            data-simpletipposition="top"
            data-simpletipoffset="5"
            data-simpletip-class="theme-dark-forced"
            onClick={onClick}
        />;

    CallLimitBanner = ({ call }) =>
        <div className={`${NAMESPACE}-user-limit-banner`}>
            {
                call.organiser === u_handle ?
                    reactStringWrap(l.admit_limit_banner_organiser, '[A]', Link, {
                        onClick() {
                            window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
                            eventlog(500259);
                        }
                    }) :
                    l.admit_limit_banner_host
            }
        </div>;

    renderPeersList = () => {
        const { peers, call, chatRoom } = this.props;
        const disableAdding = call.sfuClient.callLimits && call.sfuClient.callLimits.usr &&
            chatRoom.getCallParticipants().length >= call.sfuClient.callLimits.usr;

        return (
            <PerfectScrollbar
                ref={this.peersWaitingRef}
                options={{ 'suppressScrollX': true }}>
                <div className="peers-waiting">
                    {this.isUserLimited && <this.CallLimitBanner call={call}/>}
                    {peers.map(handle => {
                        return (
                            <div
                                key={handle}
                                className="peers-waiting-card">
                                <div className="peer-avatar">
                                    <Avatar contact={M.u[handle]} />
                                </div>
                                <div className="peer-name">
                                    <ContactAwareName contact={M.u[handle]} emoji={true}/>
                                </div>
                                <div className="peer-controls">
                                    <this.Icon
                                        icon="icon-close-component"
                                        label={l.wr_deny}
                                        onClick={() => this.doDeny(handle)}
                                    />
                                    <this.Icon
                                        icon={`icon-check ${disableAdding ? 'disabled' : ''}`}
                                        label={l.wr_admit}
                                        onClick={() => !disableAdding && this.doAdmit(handle)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PerfectScrollbar>
        );
    };

    renderMultiplePeersWaiting = () => {
        const { call, peers, expanded, onWrListToggle } = this.props;

        if (peers && peers.length) {
            const disableAddAll = this.isUserLimited;
            return (
                <>
                    <div className={`${NAMESPACE}-head`}>
                        <h3>{mega.icu.format(l.wr_peers_waiting, peers.length)}</h3>
                        {expanded ?
                            <this.Icon
                                icon="icon-arrow-up"
                                onClick={() => onWrListToggle(false)}
                            /> :
                            null
                        }
                    </div>

                    {!expanded && disableAddAll && <this.CallLimitBanner call={call}/>}

                    {expanded &&
                        <div className={`${NAMESPACE}-content`}>
                            {this.renderPeersList()}
                        </div>
                    }

                    <div className={`${NAMESPACE}-controls`}>
                        {expanded ?
                            null :
                            <Button
                                className="mega-button theme-dark-forced"
                                onClick={() => onWrListToggle(true)}>
                                <span>{l.wr_see_waiting}</span>
                            </Button>
                        }
                        <Button
                            peers={peers}
                            className={`mega-button positive theme-dark-forced ${disableAddAll ? 'disabled' : ''}`}
                            onClick={() => !disableAddAll && call.sfuClient.wrAllowJoin(peers)}>
                            <span>{l.wr_admit_all}</span>
                        </Button>
                    </div>
                </>
            );
        }

        return null;
    };

    renderSinglePeerWaiting = () => {
        const { peers, call } = this.props;
        const peer = peers[0];
        const disableAdding = this.isUserLimited;

        if (peer) {
            return (
                <>
                    <ParsedHTML
                        tag="h3"
                        content={l.wr_peer_waiting.replace('%s', megaChat.html(M.getNameByHandle(peer)))}
                    />
                    {disableAdding && <this.CallLimitBanner call={call}/>}
                    <div className={`${NAMESPACE}-controls`}>
                        <Button
                            className="mega-button theme-dark-forced"
                            onClick={() => this.doDeny(peer)}>
                            <span>{l.wr_deny}</span>
                        </Button>
                        <Button
                            className={`mega-button positive theme-dark-forced ${disableAdding ? 'disabled' : ''}`}
                            onClick={() => !disableAdding && this.doAdmit(peer)}>
                            <span>{l.wr_admit}</span>
                        </Button>
                    </div>
                </>
            );
        }

        return null;
    };

    render() {
        const { chatRoom, peers } = this.props;

        if (chatRoom.iAmOperator()) {
            return (
                <div
                    className={`
                        ${NAMESPACE}
                        theme-dark-forced
                    `}>
                    <div className={`${NAMESPACE}-wrapper`}>
                        {peers && peers.length > 1 ? this.renderMultiplePeersWaiting() : this.renderSinglePeerWaiting()}
                    </div>
                </div>
            );
        }

        return null;
    }
}
