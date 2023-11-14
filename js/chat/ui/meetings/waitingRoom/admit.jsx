import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import { Emoji, ParsedHTML } from '../../../../ui/utils.jsx';
import { Avatar } from '../../contacts.jsx';
import Button from '../button.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';

const NAMESPACE = 'admit';

export default class Admit extends MegaRenderMixin {
    peersWaitingRef = React.createRef();

    state = {
        expanded: false
    };

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

    renderPeersList = () => {
        const { peers } = this.props;

        return (
            <PerfectScrollbar
                ref={this.peersWaitingRef}
                options={{ 'suppressScrollX': true }}>
                <div className="peers-waiting">
                    {peers.map(handle => {
                        return (
                            <div
                                key={handle}
                                className="peers-waiting-card">
                                <div className="peer-avatar">
                                    <Avatar contact={M.u[handle]} />
                                </div>
                                <div className="peer-name">
                                    <Emoji>{M.getNameByHandle(handle)}</Emoji>
                                </div>
                                <div className="peer-controls">
                                    <this.Icon
                                        icon="icon-close-component"
                                        label={l.wr_deny}
                                        onClick={() => this.doDeny(handle)}
                                    />
                                    <this.Icon
                                        icon="icon-check"
                                        label={l.wr_admit}
                                        onClick={() => this.doAdmit(handle)}
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
        const { call, peers } = this.props;
        const { expanded } = this.state;

        if (peers && peers.length) {
            return (
                <>
                    <div className={`${NAMESPACE}-head`}>
                        <h3>{l.wr_peers_waiting.replace('%1', peers.length)}</h3>
                        {expanded ?
                            <this.Icon
                                icon="icon-arrow-up"
                                onClick={() => this.setState({ expanded: false })}
                            /> :
                            null
                        }
                    </div>

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
                                onClick={() => this.setState({ expanded: true })}>
                                <span>{l.wr_see_waiting}</span>
                            </Button>
                        }
                        <Button
                            peers={peers}
                            className="mega-button positive theme-dark-forced"
                            onClick={() => call.sfuClient.wrAllowJoin(peers)}>
                            <span>{l.wr_admit_all}</span>
                        </Button>
                    </div>
                </>
            );
        }

        return null;
    };

    renderSinglePeerWaiting = () => {
        const { peers } = this.props;
        const peer = peers[0];

        if (peer) {
            return (
                <>
                    <ParsedHTML
                        tag="h3"
                        content={l.wr_peer_waiting.replace('%s', megaChat.html(M.getNameByHandle(peer)))}
                    />
                    <div className={`${NAMESPACE}-controls`}>
                        <Button
                            className="mega-button theme-dark-forced"
                            onClick={() => this.doDeny(peer)}>
                            <span>{l.wr_deny}</span>
                        </Button>
                        <Button
                            className="mega-button positive theme-dark-forced"
                            onClick={() => this.doAdmit(peer)}>
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
