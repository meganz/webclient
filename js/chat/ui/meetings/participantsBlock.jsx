import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import { LocalVideoThumb, PeerVideoThumb } from './videoNode.jsx';
import Button from './button.jsx';
import { MODE } from './call.jsx';
import { chunkNodes, PAGINATION } from './stream.jsx';

const MAX_STREAMS_PER_PAGE = 10;
const SIMPLE_TIP = { position: 'top', offset: 5, className: 'theme-dark-forced' };

export default class ParticipantsBlock extends MegaRenderMixin {
    nodeMenuRef = React.createRef();

    state = {
        page: 0
    };

    movePage = direction =>
        this.setState(state => ({ page: direction === PAGINATION.NEXT ? state.page + 1 : state.page - 1 }));

    renderLocalNode = () => {
        const { call, peers, mode, chatRoom, forcedLocal, onSeparate, onSpeakerChange, onModeChange } = this.props;
        const localStream = call.getLocalStream();

        if (localStream) {
            const IS_SPEAKER_VIEW = mode === MODE.MAIN && forcedLocal;

            return (
                <LocalVideoThumb
                    key={u_handle}
                    className={`
                        local-stream-node
                        ${call.isSharingScreen() ? '' : 'local-stream-mirrored'}
                        ${forcedLocal ? 'active' : ''}
                    `}
                    simpletip={{ ...SIMPLE_TIP, label: l[8885] }}
                    mode={mode}
                    chatRoom={chatRoom}
                    source={localStream}
                    localAudioMuted={!(call.av & SfuClient.Av.Audio)}
                    onClick={(source, ev) => {
                        const nodeMenuRef = this.nodeMenuRef && this.nodeMenuRef.current;
                        if (nodeMenuRef && nodeMenuRef.contains(ev.target)) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            return;
                        }
                        return onSpeakerChange(localStream);
                    }}>
                    {peers?.length &&
                        <div
                            ref={this.nodeMenuRef}
                            className="node-menu theme-dark-forced">
                            <div className="node-menu-toggle">
                                <i className="sprite-fm-mono icon-options"/>
                            </div>
                            <div className="node-menu-content">
                                <ul>
                                    <li>
                                        <Button
                                            icon={`
                                                sprite-fm-mono
                                                ${IS_SPEAKER_VIEW ? 'grid-9' : 'grid-main'}
                                            `}
                                            onClick={() => {
                                                if (IS_SPEAKER_VIEW) {
                                                    return onModeChange(MODE.THUMBNAIL);
                                                }
                                                return onSpeakerChange(localStream);
                                            }}>
                                            <span>
                                                {IS_SPEAKER_VIEW ?
                                                    l.switch_to_thumb_view /* `Switch to thumbnail view` */ :
                                                    l.display_in_main_view /* `Display in main view` */}
                                            </span>
                                        </Button>
                                    </li>
                                    <li>
                                        <Button
                                            icon="sprite-fm-mono grid-separate"
                                            onClick={onSeparate}>
                                            <span>{l.separate_from_grid_button /* `Separate from grid` */}</span>
                                        </Button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    }
                </LocalVideoThumb>
            );
        }

        return null;
    };

    shouldComponentUpdate() {
        const { peers } = this.props;
        return peers && peers.length;
    }

    render() {
        const { call, mode, peers, floatDetached, chatRoom, onSpeakerChange, } = this.props;

        if (peers && peers.length) {
            // TODO: abstract/consolidate with the rest of the similar filtering/ordering instances
            const filteredPeers = Object.values(peers).filter(p => p instanceof CallManager2.Peer);
            const streaming =
                [...filteredPeers.filter(p => p.isScreen), ...filteredPeers.filter(p => !p.videoMuted)];
            const rest = filteredPeers.filter(p => !streaming.includes(p));
            const $$PEER = peer => {
                const isPinned = peer.isActive || peer.clientId === call.pinnedCid;
                const isActiveSpeaker = !peer.audioMuted && call.speakerCid === peer.clientId;
                return (
                    <PeerVideoThumb
                        key={`${peer.userHandle}--${peer.clientId}`}
                        className={`
                            video-crop
                            ${isPinned ? 'active' : ''}
                            ${isActiveSpeaker ? 'active-speaker' : ''}
                        `}
                        simpletip={{ ...SIMPLE_TIP, label: M.getNameByHandle(peer.userHandle) }}
                        mode={mode}
                        chatRoom={chatRoom}
                        source={peer}
                        onClick={onSpeakerChange}
                    />
                );
            };

            //
            // Default, i.e. videos aligned within single page grid.
            // ------------------------------------------------------

            if (peers.length <= (floatDetached ? MAX_STREAMS_PER_PAGE : MAX_STREAMS_PER_PAGE - 1)) {
                return (
                    <div className="stream-participants-block theme-dark-forced">
                        <div className="participants-container">
                            <div
                                className={`
                                    participants-grid
                                    ${floatDetached && peers.length === 1 || peers.length === 0 ? 'single-column' : ''}
                                `}>
                                {floatDetached ?
                                    [...streaming, ...rest].map(p => $$PEER(p)) :
                                    <>
                                        {streaming.map(p => $$PEER(p))}
                                        {this.renderLocalNode()}
                                        {rest.map(p => $$PEER(p))}
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                );
            }

            //
            // Carousel behavior with variable amount of pages, incl. up/down behavior.
            // ------------------------------------------------------------------------------

            const { page } = this.state;
            const chunks =
                chunkNodes(
                    floatDetached ?
                        [...streaming, ...rest] :
                        [...streaming, Object.values(peers).find(p => !(p instanceof CallManager2.Peer)), ...rest],
                    MAX_STREAMS_PER_PAGE
                );

            return (
                <div className="carousel">
                    <div className="carousel-container" onWheel={(evt) => this.onScroll(chunks, evt)}>
                        <div className="stream-participants-block theme-dark-forced">
                            <div className="participants-container">
                                {Object.values(chunks).map((chunk, i) => {
                                    const { id, nodes } = chunk;
                                    return (
                                        <div
                                            key={id}
                                            className={`
                                                carousel-page
                                                ${i === page ? 'active' : ''}
                                            `}>
                                            {page === 0 ?
                                                null :
                                                <button
                                                    className="carousel-control carousel-button-prev theme-dark-forced"
                                                    onClick={() => this.movePage(PAGINATION.PREV)}>
                                                    <i className="sprite-fm-mono icon-arrow-up"/>
                                                </button>
                                            }
                                            <div
                                                className={`
                                                    participants-grid
                                                    ${nodes.length === 1 ? 'single-column' : ''}
                                                `}>
                                                {nodes.map(peer => {
                                                    if (peer instanceof CallManager2.Peer) {
                                                        return $$PEER(peer);
                                                    }
                                                    return this.renderLocalNode();
                                                })}
                                            </div>
                                            {page >= Object.values(chunks).length - 1 ?
                                                null :
                                                <button
                                                    className="carousel-control carousel-button-next theme-dark-forced"
                                                    onClick={() => this.movePage(PAGINATION.NEXT)}>
                                                    <i className="sprite-fm-mono icon-arrow-down"/>
                                                </button>
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    }
    onScroll = (chunks, evt) => {
        const { page } = this.state;
        if (evt.deltaY < 0) {
            if (page > 0) {
                this.movePage(PAGINATION.PREV);
            }
        }
        else if (evt.deltaY > 0) {
            if (page < Object.values(chunks).length - 1) {
                this.movePage(PAGINATION.NEXT);
            }
        }
    };
}
