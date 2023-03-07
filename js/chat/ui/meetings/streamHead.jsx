import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';
import Button from './button.jsx';
import ModeSwitch from './modeSwitch.jsx';
import { Emoji } from '../../../ui/utils.jsx';

export default class StreamHead extends MegaRenderMixin {
    delayProcID = null;

    static NAMESPACE = 'stream-head';
    static EVENTS = {
        FULLSCREEN: 'fullscreenchange',
        SIMPLETIP: new Event('simpletipClose'),
        CLICK_DIALOG: 'click'
    };

    headRef = React.createRef();
    durationRef = React.createRef();
    dialogRef = React.createRef();
    topicRef = React.createRef();
    interval = undefined;

    state = {
        dialog: false,
        duration: undefined,
        banner: false
    };

    get fullscreen() {
        return document.fullscreenElement;
    }

    get duration() {
        return (Date.now() - this.props.call.ts) / 1000;
    }

    get durationString() {
        return this.duration ? secondsToTimeShort(this.duration) : '--:--:--';
    }

    /**
     * updateDurationDOM
     * @description Sets and updates the call duration string in the UI.
     * @returns {void}
     */

    updateDurationDOM = () => {
        if (this.durationRef) {
            this.durationRef.current.innerText = this.durationString;
        }
    }

    /**
     * closeTooltips
     * @description Helper that is invoked when the call enters fullscreen mode -- closes all tooltips that are
     * currently rendered across the UI.
     * @returns {void}
     */

    closeTooltips = () => {
        for (const node of this.headRef.current.querySelectorAll('.simpletip')) {
            node.dispatchEvent(StreamHead.EVENTS.SIMPLETIP);
        }
    };

    /**
     * toggleFullscreen
     * @description Toggles fullscreen.
     * @returns {Promise<void>}
     */

    toggleFullscreen = () => this.fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen();

    /**
     * toggleBanner
     * @description Toggles the information banner that is displayed after copying the meeting link --
     * `N link was copied to the clipboard`.
     * @param {function} [callback] optional callback function to invoke after toggling the banner state
     */

    toggleBanner = callback => this.setState(state => ({ banner: !state.banner }), () => callback && callback());

    /**
     * handleDialogClose
     * @description Handles the closing of the meeting information dialog.
     * @param target
     * @returns {boolean|void}
     */

    handleDialogClose = ({ target }) => {
        if (this.state.dialog) {
            const { topicRef, dialogRef, delayProcID } = this;
            const topicElement = topicRef && topicRef.current;
            const dialogElement = dialogRef && dialogRef.current && dialogRef.current.domNode;

            if (topicElement.contains(target)) {
                return;
            }

            return (
                (target.classList.contains('icon-dialog-close') || !dialogElement.contains(target)) &&
                this.setState({ dialog: false }, () => delayProcID && delay.cancel(delayProcID))
            );
        }
    };

    /**
     * getModerators
     * @description Retrieves the room moderators and returns singular/plural string that lists the moderator names.
     * @returns {string} formatted string listing the moderator names
     */

    getModerators = () => {
        const members = this.props.chatRoom?.members;

        if (members) {
            const moderators = [];
            for (const [handle, role] of Object.entries(members)) {
                if (role === ChatRoom.MembersSet.PRIVILEGE_STATE.FULL) {
                    moderators.push(M.getNameByHandle(handle));
                }
            }

            return mega.utils.trans.listToString(moderators, mega.icu.format(l.meeting_moderators, moderators.length));
        }
    };

    /**
     * Dialog
     * @description The call information dialog -- contains list of the call moderators, incl.
     * link for the current call.
     * @returns {JSX.Element}
     */

    Dialog = () => {
        const link = `${getBaseUrl()}/${this.props.chatRoom.publicLink}`;
        return (
            <ModalDialogsUI.ModalDialog
                ref={this.dialogRef}
                {...this.state}
                name="meeting-info-dialog"
                title={l[18132] /* `Information` */}
                className="group-chat-link dialog-template-main theme-dark-forced in-call-info"
                hideOverlay={true}>
                <section className="content">
                    <div className="content-block">
                        <Emoji className="info">{this.getModerators()}</Emoji>
                        <div className="info">{l.copy_and_share /* `Copy this link to send your invite` */}</div>
                        <div className="link-input-container">
                            <div className="mega-input with-icon box-style">
                                <i className="sprite-fm-mono icon-link" />
                                <input
                                    type="text"
                                    className="megaInputs"
                                    readOnly={true}
                                    value={link}
                                />
                            </div>
                            <Button
                                className="mega-button positive copy-to-clipboard"
                                onClick={() => {
                                    if (copyToClipboard(link)) {
                                        this.toggleBanner(() => {
                                            this.delayProcID =
                                                delay(`${StreamHead.NAMESPACE}-banner`, this.toggleBanner, 10000);
                                        });
                                    }
                                }}>
                                <span>{l[63] /* `Copy` */}</span>
                            </Button>
                        </div>
                        {this.state.banner && (
                            <div className="banner-copy-success">
                                {l[7654] /* `1 link was copied to the clipboard` */}
                            </div>
                        )}
                    </div>
                </section>
                <footer>
                    <div className="footer-container" />
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.durationInterval);
        document.removeEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
        document.removeEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
    }

    componentDidMount() {
        super.componentDidMount();
        this.durationInterval = setInterval(this.updateDurationDOM, 1000);
        document.addEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
        document.addEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
    }

    render() {
        const { NAMESPACE } = StreamHead;
        const { dialog } = this.state;
        const { mode, chatRoom, onCallMinimize, onModeChange } = this.props;
        const SIMPLETIP = { position: 'bottom', offset: 5, className: 'theme-dark-forced' };

        //
        // `StreamHead`
        // -------------------------------------------------------------------------

        return (
            <div
                ref={this.headRef}
                className={`
                    ${NAMESPACE}
                    ${dialog ? 'active' : ''}
                `}>
                {dialog && <this.Dialog />}
                <div className={`${NAMESPACE}-content theme-dark-forced`}>
                    <div className={`${NAMESPACE}-info`}>
                        <div
                            ref={this.durationRef}
                            className="stream-duration">
                            {this.durationString}
                        </div>
                        <div
                            ref={this.topicRef}
                            className={`
                                stream-topic
                                ${chatRoom.isMeeting && chatRoom.publicLink ? 'has-meeting-link' : ''}
                            `}
                            onClick={() =>
                                chatRoom.isMeeting &&
                                chatRoom.publicLink &&
                                this.setState({ dialog: !dialog, banner: false })
                            }>
                            <Emoji>{chatRoom.getRoomTitle()}</Emoji>
                            {chatRoom.isMeeting && chatRoom.publicLink && (
                                <i
                                    className={`
                                        sprite-fm-mono
                                        ${dialog ? 'icon-arrow-up' : 'icon-arrow-down'}
                                    `}
                                />
                            )}
                        </div>
                    </div>
                    <div className={`${NAMESPACE}-controls`}>
                        <ModeSwitch mode={mode} onModeChange={onModeChange} />
                        <Button
                            className="head-control"
                            simpletip={{ ...SIMPLETIP, label: l.minimize /* `Minimize` */}}
                            icon="icon-min-mode"
                            onClick={onCallMinimize}>
                            <span>{l.minimize /* `Minimize` */}</span>
                        </Button>
                        <Button
                            className="head-control"
                            simpletip={{ ...SIMPLETIP, label: this.fullscreen ? l[22895] : l[17803] }}
                            icon={`${this.fullscreen ? 'icon-fullscreen-leave' : 'icon-fullscreen-enter'}`}
                            onClick={this.toggleFullscreen}>
                            <span>
                                {this.fullscreen ? l[22895] /* `Exit fullscreen` */ : l[17803] /* `Fullscreen` */}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}
