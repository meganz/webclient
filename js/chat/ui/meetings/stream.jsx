import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { MODE } from './call.jsx';
import { PeerVideoHiRes, LocalVideoHiRes, PeerVideoThumb, LocalVideoThumb, PeerVideoThumbFixed } from './videoNode.jsx';
import FloatingVideo from './float.jsx';
import ParticipantsNotice from './participantsNotice.jsx';
import ChatToaster from "../chatToaster.jsx";
import ParticipantsBlock from './participantsBlock.jsx';
import VideoNodeMenu from './videoNodeMenu.jsx';
import Button from './button.jsx';
import { Emoji } from '../../../ui/utils.jsx';
import StreamHead from './streamHead.jsx';
import Admit from './waitingRoom/admit.jsx';

const NAMESPACE = 'stream';
export const STREAM_ACTIONS = { ADD: 1, REMOVE: 2 };
export const PAGINATION = { PREV: -1, NEXT: 1 };
export const MAX_STREAMS = 99; // 99 + me -> 100
export const STREAMS_PER_PAGE = { MIN: 9, MED: 21, MAX: 49 };

/**
 * chunkNodes
 * @description Takes collection of streams and returns a new collection that contains separate groups of streams
 * based on the passed chunk size. Used to construct the stream carousel.
 * @param {Array|Peers} nodes collection of stream nodes
 * @param {number} size the amount of chunks
 * @see renderNodes
 * @returns {Object|null}
 */

export const chunkNodes = (nodes, size) => {
    if (nodes && nodes.length && size) {
        const chunked = [];
        let index = 0;

        while (index < nodes.length) {
            chunked.push({ id: index, nodes: nodes.slice(index, index + size) });
            index += size;
        }

        return chunked;
    }
    return null;
};

/**
 * filterAndSplitSources
 * @description Takes a collection of Peers and returns a collection that contains groups of streams meeting
 * the criteria. Also injects the LocalPeerStream in the correct locations.
 * screen: Includes Peers with the screen being shared
 * video: Includes Peers with the video stream not muted
 * rest: Includes Peers which are in no other category
 * @param {Array|Object} sources collection of Peer client ids
 * @param {Call} call The current call that the Peers are in.
 * @returns {{screen: *[], video: *[], rest: *[]}}
 */

export const filterAndSplitSources = (sources, call) => {
    const screen = [];
    const video = [];
    const rest = [];
    for (const peer of Object.values(sources.toJS())) {
        if (peer instanceof CallManager2.Peer) {
            if (peer.hasScreen) {
                screen.push(peer, peer);
            }
            else if (peer.videoMuted) {
                rest.push(peer);
            }
            else {
                video.push(peer);
            }
        }
    }
    const local = call.getLocalStream();
    if (local.hasScreen) {
        const presenters = [...call.presenterStreams];
        if (presenters.pop() === u_handle) {
            screen.unshift(local, local);
        }
        else {
            screen.push(local, local);
        }
    }
    else if (local.av & Av.Camera) {
        video.unshift(local);
    }
    else {
        rest.push(local);
    }
    return { screen, video, rest };
};

export default class Stream extends MegaRenderMixin {
    wrapperRef = React.createRef();
    containerRef = React.createRef();

    nodeRefs = [];
    chunks = [];
    chunksLength = 0;

    lastRescaledCache = undefined;

    state = {
        page: 0,
        overlayed: false,
        streamsPerPage: STREAMS_PER_PAGE.MED,
        floatDetached: false,
        wrToggled: false,
    };

    /**
     * toggleFloatDetachment
     * @description Toggles the `detached` state of the `FloatingVideo` component, e.g. the self view -- either detached
     * from the stream nodes grid or part of it along with the rest of the stream nodes.
     * @see FloatingVideo
     * @returns {void}
     */

    toggleFloatDetachment = () => {
        this.setState(state => ({ floatDetached: !state.floatDetached }));
    };

    toggleWaitingRoomList = (state) => {
        this.setState({ wrToggled: state });
    };

    /**
     * movePage
     * @description Moves the current page within the carousel. Invoked by clicking on the left/right carousel
     * controls and automatically after reducing the amount of pages.
     * @param {PAGINATION} direction
     * @see renderNodes
     * @see componentDidUpdate
     * @returns {void}
     */

    movePage(direction) {
        return this.setState(state => ({ page: direction === PAGINATION.NEXT ? state.page + 1 : state.page - 1 }));
    }

    /**
     * getColumns
     * @description Calculates the number of columns necessary for the grid, based on given number of streams.
     * @param {number} streamsCount the number of streams
     * @returns {number} the number of columns
     */

    getColumns(streamsCount) {
        switch (true) {
            case streamsCount >= 43:
                return 7;
            case streamsCount >= 26:
                return 6;
            case streamsCount >= 17:
                return 5;
            case streamsCount >= 13:
                return 4;
            case streamsCount === 1:
                return 1;
            case streamsCount >= 7:
                return 3;
            default:
                return 2;
        }
    }

    /**
     * scaleNodes
     * @description Handles the stream nodes scaling within the stream grid. Calculates the optimal node dimensions
     * based on the current viewport and keeps the aspect ratio of the nodes.
     * @param {number} [columns] number of grid columns
     * @param {boolean} [forced] flag indicating whether disregard the cached rescale
     * @returns {void}
     */

    scaleNodes(columns, forced = false) {
        const { peers, minimized, mode, call } = this.props;
        const { screen, video, rest } = filterAndSplitSources(peers, call);
        // Calculations below expect only non-local peers. Screenshares of local node should be counted as they're dupes
        let presenter = false;
        const sources = [...screen, ...video, ...rest].filter((source) => {
            if (!source.isLocal) {
                return true;
            }
            if (source.hasScreen && !presenter) {
                presenter = true;
                return true;
            }
            return false;
        });
        presenter = false;
        const container = this.containerRef.current;
        this.lastRescaledCache = forced ? null : this.lastRescaledCache;

        if (minimized || !container) {
            // No peers rendered, e.g. In minimized state
            return;
        }

        const { floatDetached, streamsPerPage, page } = this.state;
        const parentRef = container.parentNode;
        const parentStyle = getComputedStyle(parentRef);
        const extraVerticalMargin = parseInt(parentStyle.paddingTop) + parseInt(parentStyle.paddingBottom);
        let containerWidth = parentRef.offsetWidth;
        let containerHeight = parentRef.offsetHeight - extraVerticalMargin;
        const nodesPerPage = floatDetached ? streamsPerPage : streamsPerPage - 1;
        const streamsInUI = sources.length > nodesPerPage ? Object.values(this.chunks)[page]?.nodes : sources;

        if (streamsInUI) {
            const streamCountInUI =
                sources.length > nodesPerPage || floatDetached ? streamsInUI.length : streamsInUI.length + 1;
            let rows;
            if (mode === MODE.THUMBNAIL) {
                columns = typeof columns === 'number' ? columns : this.getColumns(streamCountInUI);
                rows = Math.ceil(streamCountInUI / columns);
            }
            else {
                rows = 1;
                columns = 1;
            }

            const marginNode = 6;
            // Cannot take into account node margins for a correct aspect ratio
            containerWidth -= columns * marginNode * 2;
            containerHeight -= rows * marginNode * 2;

            let targetWidth = Math.floor(containerWidth / columns);
            let targetHeight = targetWidth / 16 * 9;
            if (targetHeight * rows > containerHeight) {
                targetHeight = Math.floor(containerHeight / rows);
                targetWidth = targetHeight / 9 * 16;
            }

            const nodeRefs = this.nodeRefs.flat();
            const nodeRefsLength = nodeRefs.length;
            const viewMode = mode || MODE.MAIN;

            let cache =
                `${viewMode}:${targetWidth}:${targetHeight}:${nodeRefsLength}:${rows}:${streamCountInUI}:${columns}`;
            for (let i = 0; i < nodeRefsLength; i++) {
                cache += `${nodeRefs[i].cacheKey}:`;
            }


            if (this.lastRescaledCache === cache) {
                return;
            }
            this.lastRescaledCache = cache;

            for (let i = 0; i < nodeRefsLength; i++) {
                const node = nodeRefs[i];
                if (node && node.ref) {
                    node.ref.style.width = `${targetWidth}px`;
                    node.ref.style.height = `${targetHeight}px`;
                }
            }

            container.style.width = `${(targetWidth + marginNode * 2) * columns}px`;
        }
    }

    /**
     * renderNodes
     * @description Renders the stream nodes in different form, based on the passed state -- i) `Thumbnail` mode, where
     * all stream nodes are rendered within the main grid or on multiple grid pages with carousel behavior, as well as
     * ii) `Main` mode, where single stream node is rendered on full screen and the rest within the `Sidebar`.
     * @see MODE
     * @see StreamHead.render
     * @see ModeSwitch
     * @returns {JSX.Element|null|Array}
     */

    renderNodes() {
        const {
            mode,
            peers,
            call,
            raisedHandPeers,
            chatRoom,
            onVideoDoubleClick,
            onModeChange,
        } = this.props;
        const { page, streamsPerPage, floatDetached } = this.state;
        // Streams are split between screen sharing, video (camera), and non-streaming (rest/avatar)
        //  Note: screen sharing users will be paired up with their avatar by filterAndSplitSources
        const { screen, video, rest } = filterAndSplitSources(peers, call);
        const sources = [...screen, ...video, ...rest];

        //
        //  `Thumbnail` view
        // -------------------------------------------------------------------------

        if (mode === MODE.THUMBNAIL) {

            //
            // Default, i.e. videos aligned within single page grid.
            // ------------------------------------------------------

            const nodesPerPage = floatDetached ? streamsPerPage : streamsPerPage - 1;
            if (sources.length <= nodesPerPage) {
                const $$PEER = (peer, i) => {
                    const { clientId, hasScreenAndCam, hasScreen, isLocal } = peer;
                    if (screen.length && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)) {
                        screen.shift();
                    }
                    if (!(peer instanceof CallManager2.Peer)) {
                        const isPresenterNode = screen.length && screen[0].isLocal;
                        if (floatDetached && !isPresenterNode) {
                            return;
                        }
                        if (floatDetached || !isPresenterNode) {
                            return <LocalVideoThumb
                                key={`${mode}_thumb_${u_handle}`}
                                chatRoom={chatRoom}
                                isPresenterNode={false}
                                raisedHandPeers={raisedHandPeers}
                                source={peer}
                                didMount={ref => {
                                    this.nodeRefs.push({
                                        clientId: u_handle,
                                        cacheKey: `${mode}_${u_handle}_thumb`,
                                        ref
                                    });
                                    this.scaleNodes(undefined, true);
                                }}
                                willUnmount={() => {
                                    this.nodeRefs = this.nodeRefs.filter(
                                        nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}_thumb`
                                    );
                                }}>
                                {this.renderSelfViewMenu()}
                            </LocalVideoThumb>;
                        }
                        return (
                            <LocalVideoHiRes
                                key={`${mode}_${u_handle}`}
                                chatRoom={chatRoom}
                                isPresenterNode={isPresenterNode}
                                source={isPresenterNode && peer}
                                raisedHandPeers={raisedHandPeers}
                                didMount={ref => {
                                    this.nodeRefs.push({ clientId: u_handle, cacheKey: `${mode}_${u_handle}`, ref });
                                    this.scaleNodes(undefined, true);
                                }}
                                willUnmount={() => {
                                    this.nodeRefs = this.nodeRefs.filter(
                                        nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}`
                                    );
                                }}>
                                {hasScreen ? this.renderNodeMenu(peer, { isPresenterNode }) : this.renderSelfViewMenu()}
                            </LocalVideoHiRes>
                        );
                    }
                    // Only one of each peer should be treated as the 'presenter'. If it doesn't exist in the screen
                    // array then the presenter node is already made or the user is not presenting.
                    const presenterCid = screen.length && screen[0].clientId === clientId;
                    let PeerClass = PeerVideoThumb;
                    if (hasScreenAndCam) {
                        PeerClass = presenterCid ? PeerVideoHiRes : PeerVideoThumbFixed;
                    }
                    const cacheKey = `${mode}_${clientId}_${i}_${hasScreenAndCam ? 1 : 0}`;
                    return (
                        <PeerClass
                            key={cacheKey}
                            mode={mode}
                            chatRoom={chatRoom}
                            menu={true}
                            source={peer}
                            raisedHandPeers={raisedHandPeers}
                            isPresenterNode={!!presenterCid}
                            onDoubleClick={(peer, e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onVideoDoubleClick(peer, !presenterCid);
                            }}
                            didMount={ref => {
                                this.nodeRefs.push({ clientId: presenterCid || clientId, cacheKey, ref });
                            }}
                            willUnmount={() => {
                                this.nodeRefs = this.nodeRefs.filter(nodeRef => nodeRef.cacheKey !== cacheKey);
                            }}>
                            {this.renderNodeMenu(peer, { isPresenterNode: !!presenterCid })}
                        </PeerClass>
                    );
                };

                return sources.map((p, i) => $$PEER(p, i));
            }

            //
            // Carousel behavior with variable amount of pages, incl. previous/next behavior.
            // ------------------------------------------------------------------------------

            if (floatDetached) {
                for (let i = 0; i < sources.length; i++) {
                    if (sources[i].isLocal) {
                        sources.splice(i, 1);
                        break;
                    }
                }
            }
            this.chunks = chunkNodes(sources, streamsPerPage);
            this.chunksLength = Object.values(this.chunks).length;

            return (
                <div className="carousel">
                    <div className="carousel-container">
                        {Object.values(this.chunks).map((chunk, i) => {
                            const { id, nodes } = chunk;
                            return (
                                <div
                                    key={id}
                                    className={`
                                        carousel-page
                                        ${i === page ? 'active' : ''}
                                    `}>
                                    {nodes.map((peer, j) => {
                                        const { clientId, hasScreenAndCam, hasScreen, isLocal } = peer;
                                        if (
                                            screen.length
                                            && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)
                                        ) {
                                            screen.shift();
                                        }
                                        if (peer instanceof CallManager2.Peer) {
                                            const presenterCid = screen.length && screen[0].clientId === clientId;
                                            // Same as above but mindful of duplicate keys across different pages.
                                            const cacheKey = `${mode}_${clientId}_${j + i * streamsPerPage}_${
                                                hasScreenAndCam ? 1 : 0
                                            }`;
                                            let PeerClass = PeerVideoThumb;
                                            if (hasScreenAndCam) {
                                                PeerClass = presenterCid ? PeerVideoHiRes : PeerVideoThumbFixed;
                                            }
                                            return (
                                                <PeerClass
                                                    key={cacheKey}
                                                    mode={mode}
                                                    source={peer}
                                                    chatRoom={chatRoom}
                                                    isPresenterNode={!!presenterCid}
                                                    raisedHandPeers={raisedHandPeers}
                                                    onDoubleClick={(peer, e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onVideoDoubleClick(peer);
                                                    }}
                                                    didMount={ref => {
                                                        if (!this.nodeRefs[id]) {
                                                            this.nodeRefs[id] = [];
                                                        }
                                                        this.nodeRefs[id].push({
                                                            clientId: presenterCid || clientId,
                                                            ref,
                                                            cacheKey
                                                        });
                                                        this.scaleNodes(undefined, true);
                                                    }}
                                                    willUnmount={() => {
                                                        this.nodeRefs = this.nodeRefs.map(chunk =>
                                                            chunk.filter(
                                                                nodeRef => nodeRef.cacheKey !== cacheKey
                                                            )
                                                        );
                                                    }}>
                                                    {this.renderNodeMenu(peer, { isPresenterNode: !!presenterCid })}
                                                </PeerClass>
                                            );
                                        }
                                        const isPresenterNode = screen.length && screen[0].isLocal;
                                        if (floatDetached && !isPresenterNode) {
                                            return null;
                                        }
                                        if (floatDetached || !isPresenterNode) {
                                            return <LocalVideoThumb
                                                key={`${mode}_thumb_${u_handle}`}
                                                chatRoom={chatRoom}
                                                source={peer}
                                                isPresenterNode={false}
                                                didMount={ref => {
                                                    if (!this.nodeRefs[id]) {
                                                        this.nodeRefs[id] = [];
                                                    }
                                                    this.nodeRefs[id].push({
                                                        clientId: u_handle,
                                                        cacheKey: `${mode}_${u_handle}_thumb`,
                                                        ref
                                                    });
                                                    this.scaleNodes(undefined, true);
                                                }}
                                                willUnmount={() => {
                                                    this.nodeRefs = this.nodeRefs.map(chunk =>
                                                        chunk.filter(nodeRef =>
                                                            nodeRef.cacheKey !== `${mode}_${u_handle}_thumb`
                                                        )
                                                    );
                                                }}>
                                                {this.renderSelfViewMenu()}
                                            </LocalVideoThumb>;
                                        }

                                        return (
                                            <LocalVideoHiRes
                                                key={`${mode}_${u_handle}`}
                                                chatRoom={chatRoom}
                                                raisedHandPeers={raisedHandPeers}
                                                isPresenterNode={isPresenterNode}
                                                source={isPresenterNode && peer}
                                                didMount={ref => {
                                                    if (!this.nodeRefs[id]) {
                                                        this.nodeRefs[id] = [];
                                                    }
                                                    this.nodeRefs[id].push({
                                                        clientId: u_handle,
                                                        ref,
                                                        cacheKey: `${mode}_${u_handle}`
                                                    });
                                                    this.scaleNodes(undefined, true);
                                                }}
                                                willUnmount={() => {
                                                    this.nodeRefs = this.nodeRefs.map(chunk =>
                                                        chunk.filter(
                                                            nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}`
                                                        )
                                                    );
                                                }}>
                                                {
                                                    hasScreen ?
                                                        this.renderNodeMenu(peer, { isPresenterNode }) :
                                                        this.renderSelfViewMenu()
                                                }
                                            </LocalVideoHiRes>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        //
        //  `Main` view
        // -------------------------------------------------------------------------

        const source = call.getActiveStream();
        if (!source) {
            return null;
        }
        const VideoType = source.isLocal ? LocalVideoHiRes : PeerVideoHiRes;
        const videoNodeRef = React.createRef();
        const setRef = node => {
            videoNodeRef.current = node;
        };

        return (
            <VideoType
                key={source.clientId}
                chatRoom={chatRoom}
                raisedHandPeers={raisedHandPeers}
                source={source}
                isPresenterNode={source.hasScreen}
                toggleFullScreen={() => {               // don't use onSpeakerChange, as it will cause a react update
                    call.setPinnedCid(source.clientId); // and unmount the fullscreen element, canceling the fullscreen
                }}
                onSpeakerChange={() => {
                    onModeChange(MODE.THUMBNAIL);
                }}
                ref={setRef}>
                {this.renderNodeMenu(source, {
                    key: `${source.clientId}-main`,
                    isMain: true,
                    videoNodeRef,
                    isPresenterNode: source.hasScreen
                })}
            </VideoType>
        );
    }

    /**
     * renderNodeMenu
     * @description Renders context menu for given stream node.
     * @param {Peer} [peer]
     * @param {Object} [props]
     * @see VideoNode
     * @see VideoNodeMenu
     * @returns {JSX.Element}
     */

    renderNodeMenu(peer, props) {
        const { mode, chatRoom, ephemeralAccounts, onCallMinimize, onSpeakerChange, onModeChange } = this.props;

        return (
            <VideoNodeMenu
                mode={mode}
                privilege={chatRoom.members[peer.userHandle]}
                chatRoom={chatRoom}
                stream={peer}
                ephemeralAccounts={ephemeralAccounts}
                onCallMinimize={onCallMinimize}
                onSpeakerChange={onSpeakerChange}
                onModeChange={onModeChange}
                {...props}
            />
        );
    }

    /**
     * renderSelfViewMenu
     * @description Renders context menu for the local stream node.
     * @see renderNodeMenu
     * @returns {JSX.Element}
     */

    renderSelfViewMenu() {
        const { call, onSpeakerChange } = this.props;

        return (
            <div className="node-menu theme-dark-forced">
                <div className="node-menu-toggle">
                    <i className="sprite-fm-mono icon-more-horizontal-thin-outline"/>
                </div>
                <div className="node-menu-content">
                    <ul>
                        <li>
                            <Button
                                icon="sprite-fm-mono grid-main"
                                onClick={() => onSpeakerChange(call.getLocalStream())}>
                                <span>{l.display_in_main_view /* `Display in main view` */}</span>
                            </Button>
                        </li>
                        <li>
                            <Button
                                icon="sprite-fm-mono grid-separate"
                                onClick={this.toggleFloatDetachment}>
                                <span>{l.separate_from_grid_button /* `Separate from grid` */}</span>
                            </Button>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    /**
     * renderOnHold
     * @description Renders the "on hold" state.
     * @see Call.handleHoldToggle
     * @returns {JSX.Element}
     */

    renderOnHold() {
        return (
            <div className="on-hold-overlay">
                <div
                    className="stream-on-hold theme-light-forced"
                    onClick={this.props.onHoldClick}>
                    <i className="sprite-fm-mono icon-play" />
                    <span>{l[23459] /* `Resume call` */}</span>
                </div>
            </div>
        );
    }

    /**
     * renderStreamContainer
     * @description Wrapper function that handles the rendering of the streams container. Conditional
     * `ParticipantsNotice` is rendered if the current user is the only call participant at the moment.
     * @see ParticipantsNotice
     * @see renderNodes
     * @returns {JSX.Element}
     */

    renderStreamContainer() {
        const {
            call, chatRoom, peers, stayOnEnd, everHadPeers, isOnHold, mode, hasOtherParticipants,
            onInviteToggle, onStayConfirm, onCallEnd
        } = this.props;
        const { screen, video, rest } = filterAndSplitSources(peers, call);
        const sources = [...screen, ...video, ...rest];
        const showNotice = sources.length === 0
            || !hasOtherParticipants && !call.presenterStreams.has(u_handle);
        const streamContainer = content =>
            <div
                ref={this.containerRef}
                // TODO: clean-up the className assignments re: `floatDetached`
                className={`
                    ${NAMESPACE}-container
                    ${showNotice ? 'with-notice' : ''}
                    ${
                        sources.length === 1 && mode === MODE.THUMBNAIL
                            ? `${this.state.floatDetached ? 'single' : 'dual'}-stream` : ''
                    }
                `}>
                {content}
            </div>;

        if (showNotice) {
            return (
                <ParticipantsNotice
                    call={call}
                    hasLeft={call.left}
                    chatRoom={chatRoom}
                    everHadPeers={everHadPeers}
                    streamContainer={streamContainer}
                    stayOnEnd={stayOnEnd}
                    isOnHold={isOnHold}
                    onInviteToggle={onInviteToggle}
                    onStayConfirm={onStayConfirm}
                    onCallEnd={() => onCallEnd(1)}
                />
            );
        }

        return streamContainer(this.renderNodes());
    }

    renderToaster() {
        return (
            <ChatToaster
                showDualNotifications={true}
                hidden={this.props.minimized}
                onShownToast={toast => {
                    if (toast.options && toast.options.persistent) {
                        this.setState({ overlayed: true });
                    }
                }}
                onHideToast={toast => {
                    if (this.state.overlayed && toast.options && toast.options.persistent) {
                        this.setState({ overlayed: false });
                    }
                }}
            />
        );
    }

    specShouldComponentUpdate(nextProps) {
        if (nextProps.minimized !== this.props.minimized || nextProps.mode !== this.props.mode) {
            return true;
        }
        return null;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        chatGlobalEventManager.removeEventListener('resize', this.getUniqueId());
        mBroadcaster.removeListener(this.callHoldListener);
    }

    componentDidMount() {
        super.componentDidMount();
        this.scaleNodes();
        chatGlobalEventManager.addEventListener('resize', this.getUniqueId(), () => this.scaleNodes());
        this.callHoldListener = mBroadcaster.addListener('meetings:toggleHold', () => this.scaleNodes(undefined, true));
    }

    componentDidUpdate() {
        super.componentDidMount();
        const { call, mode, forcedLocal, onSpeakerChange, onModeChange } = this.props;
        this.scaleNodes();
        // Move to previous page automatically on page removal
        if (this.chunksLength > 0 && this.state.page + 1 > this.chunksLength) {
            this.movePage(PAGINATION.PREV);
        }
        if (mode === MODE.THUMBNAIL && call.pinnedCid !== null) {
            this.hasPresenter = true;
            onSpeakerChange(call.getActiveStream());
        }
        else if (mode === MODE.MAIN && call.pinnedCid === null && !call.presenterStreams.size && this.hasPresenter) {
            this.hasPresenter = false;
            onModeChange(MODE.THUMBNAIL);
        }
        else if (mode === MODE.MAIN && forcedLocal && call.pinnedCid !== 0) {
            onSpeakerChange(call.getActiveStream());
        }
        else if (!call.presenterStreams.size) {
            this.hasPresenter = false;
        }
    }

    render() {
        const { overlayed, page, streamsPerPage, floatDetached, wrToggled } = this.state;
        const {
            mode, call, chatRoom, minimized, peers, sidebar, hovered, forcedLocal, view, isOnHold, waitingRoomPeers,
            recorder, raisedHandPeers, onRecordingToggle, onCallMinimize, onCallExpand, onModeChange, onAudioClick,
            onVideoClick, onCallEnd, onScreenSharingClick, onHoldClick, onSpeakerChange, onParticipantsToggle,
            setActiveElement
        } = this.props;

        return (
            <div
                ref={this.wrapperRef}
                className={`
                    ${NAMESPACE}
                    ${sidebar ? '' : 'full'}
                    ${hovered ? 'hovered' : ''}
                `}>
                {waitingRoomPeers && waitingRoomPeers.length ?
                    <Admit
                        chatRoom={chatRoom}
                        call={call}
                        peers={waitingRoomPeers}
                        expanded={wrToggled}
                        onWrListToggle={this.toggleWaitingRoomList}
                    /> :
                    null
                }

                {this.renderToaster()}

                {minimized ?
                    null :
                    <>
                        <div
                            className={`
                                ${NAMESPACE}-wrapper
                                ${mode === MODE.MAIN ? 'with-participants-block' : ''}
                            `}>
                            {isOnHold ? this.renderOnHold() : overlayed && <div className="call-overlay"/>}
                            {this.renderStreamContainer()}
                        </div>
                        {mode === MODE.MAIN &&
                            <ParticipantsBlock
                                {...this.props}
                                floatDetached={floatDetached}
                                onSeparate={this.toggleFloatDetachment}
                            />
                        }
                        <StreamHead
                            disableCheckingVisibility={true}
                            mode={mode}
                            peers={peers}
                            page={page}
                            streamsPerPage={streamsPerPage}
                            floatDetached={floatDetached}
                            chunksLength={this.chunksLength}
                            call={call}
                            chatRoom={chatRoom}
                            onCallMinimize={onCallMinimize}
                            onModeChange={onModeChange}
                            onStreamsPerPageChange={streamsPerPage => this.setState({ streamsPerPage })}
                            onMovePage={direction => this.movePage(direction)}
                            setActiveElement={setActiveElement}
                        />
                    </>
                }

                <FloatingVideo
                    call={call}
                    peers={peers}
                    mode={mode}
                    view={view}
                    floatDetached={floatDetached}
                    isOnHold={isOnHold}
                    chatRoom={chatRoom}
                    minimized={minimized}
                    sidebar={sidebar}
                    forcedLocal={forcedLocal}
                    isPresenterNode={(
                        mode === MODE.MINI && !forcedLocal
                            ? call.getActiveStream()
                            : call.getLocalStream()
                    )?.hasScreen}
                    wrapperRef={this.wrapperRef}
                    waitingRoomPeers={waitingRoomPeers}
                    recorder={recorder}
                    raisedHandPeers={raisedHandPeers}
                    onRecordingToggle={onRecordingToggle}
                    onAudioClick={onAudioClick}
                    onVideoClick={onVideoClick}
                    onCallEnd={onCallEnd}
                    onScreenSharingClick={onScreenSharingClick}
                    onCallMinimize={onCallMinimize}
                    onMoveIntoGrid={this.toggleFloatDetachment}
                    onCallExpand={async() => {
                        await onCallExpand();
                        this.scaleNodes(undefined, true);
                    }}
                    onSpeakerChange={onSpeakerChange}
                    onModeChange={onModeChange}
                    onHoldClick={onHoldClick}
                    onParticipantsToggle={onParticipantsToggle}
                    onWrListToggle={this.toggleWaitingRoomList}
                />
            </div>
        );
    }
}
