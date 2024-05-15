import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import { LocalVideoHiResCloned, LocalVideoThumb, PeerVideoHiResCloned, PeerVideoThumb, PeerVideoThumbFixed }
    from './videoNode.jsx';
import Button from './button.jsx';
import { MODE } from './call.jsx';
import { chunkNodes, filterAndSplitSources, PAGINATION } from './stream.jsx';

const MAX_STREAMS_PER_PAGE = 10;
const SIMPLE_TIP = { position: 'top', offset: 5, className: 'theme-dark-forced' };

export default class ParticipantsBlock extends MegaRenderMixin {
    nodeMenuRef = React.createRef();
    dupNodeMenuRef = React.createRef();

    state = {
        page: 0
    };

    movePage = direction =>
        this.setState(state => ({ page: direction === PAGINATION.NEXT ? state.page + 1 : state.page - 1 }));

    renderLocalNode = (isPresenterNode) => {
        const {
            call, peers, mode, chatRoom, forcedLocal, presenterThumbSelected,
            onSeparate, onSpeakerChange, onModeChange
        } = this.props;
        const localStream = call.getLocalStream();

        if (localStream) {
            const IS_SPEAKER_VIEW = mode === MODE.MAIN && forcedLocal;

            const VideoClass = isPresenterNode ? LocalVideoHiResCloned : LocalVideoThumb;
            let isActive = false;
            if (isPresenterNode) {
                isActive = forcedLocal && !presenterThumbSelected;
            }
            else if (call.pinnedCid === 0 || forcedLocal) {
                if (presenterThumbSelected) {
                    isActive = !isPresenterNode;
                }
                else if (localStream.hasScreen) {
                    isActive = isPresenterNode;
                }
                else {
                    isActive = true;
                }
            }

            return (
                <VideoClass
                    key={`${u_handle}${isPresenterNode ? '_block' : ''}`}
                    className={`
                        local-stream-node
                        ${call.isSharingScreen() ? '' : 'local-stream-mirrored'}
                        ${isActive ? 'active' : ''}
                        ${(call.speakerCid === 0) ? 'active-speaker' : ''}
                    `}
                    simpletip={{ ...SIMPLE_TIP, label: l[8885] }}
                    mode={mode}
                    chatRoom={chatRoom}
                    source={localStream}
                    localAudioMuted={!(call.av & SfuClient.Av.Audio)}
                    isPresenterNode={isPresenterNode}
                    onClick={(source, ev) => {
                        const nodeMenuRef = isPresenterNode ?
                            this.nodeMenuRef && this.nodeMenuRef.current :
                            this.dupNodeMenuRef && this.dupNodeMenuRef.current;
                        if (nodeMenuRef && nodeMenuRef.contains(ev.target)) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            return;
                        }
                        return onSpeakerChange(localStream, !isPresenterNode);
                    }}>
                    {peers?.length &&
                        <div
                            ref={isPresenterNode ? this.nodeMenuRef : this.dupNodeMenuRef}
                            className="node-menu theme-dark-forced">
                            <div className="node-menu-toggle">
                                <i className="sprite-fm-mono icon-more-horizontal-thin-outline"/>
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
                </VideoClass>
            );
        }

        return null;
    };

    shouldComponentUpdate() {
        const { peers } = this.props;
        return peers && peers.length;
    }

    render() {
        const { call, mode, peers, floatDetached, chatRoom, presenterThumbSelected, onSpeakerChange } = this.props;

        if (peers && peers.length) {
            const { screen, video, rest } = filterAndSplitSources(peers, call);
            const sources = [...screen, ...video, ...rest];

            const $$PEER = (peer, i) => {
                const { clientId, userHandle, hasScreenAndCam, hasScreen, isLocal } = peer;
                if (
                    screen.length
                    && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)
                ) {
                    screen.shift();
                }
                if (!(peer instanceof CallManager2.Peer)) {
                    const isPresenterNode = screen.length && screen[0].isLocal;
                    if (floatDetached && !isPresenterNode) {
                        return;
                    }
                    return this.renderLocalNode(!floatDetached && isPresenterNode);
                }
                const presenterCid = screen.length && screen[0].clientId === clientId;
                let PeerClass;
                if (hasScreenAndCam) {
                    PeerClass = presenterCid ? PeerVideoHiResCloned : PeerVideoThumbFixed;
                }
                else {
                    PeerClass = PeerVideoThumb;
                }
                assert(!presenterCid || hasScreen);

                const isActiveSpeaker = !peer.audioMuted && call.speakerCid === peer.clientId;
                let isActive = false;
                if (call.pinnedCid === clientId) {
                    if (presenterThumbSelected) {
                        isActive = !presenterCid;
                    }
                    else if (hasScreen) {
                        isActive = presenterCid;
                    }
                    else {
                        isActive = true;
                    }
                }
                const name = M.getNameByHandle(userHandle);
                return (
                    <PeerClass
                        key={`${userHandle}-${i}-${clientId}`}
                        className={`
                            video-crop
                            ${isActive ? 'active' : ''}
                            ${isActiveSpeaker ? 'active-speaker' : ''}
                        `}
                        simpletip={{
                            ...SIMPLE_TIP,
                            label: presenterCid
                                ? l.presenter_nail.replace('%s', name)
                                : name
                        }}
                        mode={mode}
                        chatRoom={chatRoom}
                        source={peer}
                        isPresenterNode={!!presenterCid}
                        onSpeakerChange={node => onSpeakerChange(node, !presenterCid)}
                        onClick={node => onSpeakerChange(node, !presenterCid)}
                    />
                );
            };

            //
            // Default, i.e. videos aligned within single page grid.
            // ------------------------------------------------------

            if (sources.length <= (floatDetached ? MAX_STREAMS_PER_PAGE : MAX_STREAMS_PER_PAGE - 1)) {
                return (
                    <div className="stream-participants-block theme-dark-forced">
                        <div className="participants-container">
                            <div
                                className={`
                                    participants-grid
                                    ${
                                        floatDetached && sources.length === 1 || sources.length === 0
                                            ? 'single-column'
                                            : ''
                                    }
                                `}>
                                {sources.map((p, i) => $$PEER(p, i))}
                            </div>
                        </div>
                    </div>
                );
            }

            //
            // Carousel behavior with variable amount of pages, incl. up/down behavior.
            // ------------------------------------------------------------------------------

            const { page } = this.state;
            const chunks = chunkNodes(sources, MAX_STREAMS_PER_PAGE);

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
                                                {nodes.map((peer, j) => $$PEER(peer, j + i * MAX_STREAMS_PER_PAGE))}
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
