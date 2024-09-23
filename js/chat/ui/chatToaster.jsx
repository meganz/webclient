import React from 'react';
import { MegaRenderMixin } from "../mixins";
import Call from './meetings/call.jsx';
import {Button} from "../../ui/buttons";

const NAMESPACE = 'chat-toast';

export default class ChatToaster extends MegaRenderMixin {
    state = {
        toast: null,
        endTime: 0,
        fmToastId: null,
        persistentToast: null,
    };

    constructor(props) {
        super(props);
        this.toasts = [];
        this.persistentToasts = [];
    }

    customIsEventuallyVisible() {
        return M.chat;
    }

    /**
     * Enqueue a toast to be shown to the user via the `onChatToast` event
     *
     * @param {object} e The event object with the toast
     * @returns {void} void
     */
    enqueueToast(e) {
        if (this.props.showDualNotifications && e.data.options && e.data.options.persistent) {
            this.persistentToasts.push(e.data);
        }
        else {
            this.toasts.push(e.data);
        }
        this.pollToasts();
    }

    /**
     * Call this function periodically to check for toasts and dispatch them to the renderer if appropriate
     *
     * @returns {void} void
     */
    pollToasts() {
        const { toast: shownToast, persistentToast: shownPersistentToast } = this.state;
        const { isRootToaster, showDualNotifications, onShownToast } = this.props;
        const now = Date.now();
        if (this.toasts.length + this.persistentToasts.length) {
            if (this.isMounted() && (!isRootToaster && Call.isExpanded() || M.chat)) {
                if (this.toasts.length && !shownToast) {
                    this.dispatchToast(this.toasts.shift(), now);
                }
                if (showDualNotifications && this.persistentToasts.length && !shownPersistentToast) {
                    const persistentToast = this.persistentToasts.shift();
                    this.setState({ persistentToast }, () => this.pollToasts());
                    if (typeof onShownToast === 'function') {
                        onShownToast(persistentToast);
                    }
                }
            }
            else if (isRootToaster && this.toasts.length && !shownToast) {
                const toast = this.toasts.shift();
                this.dispatchToast(toast, now, { fmToastId: 'tmp' });
                this.dispatchFMToast(toast);
            }
        }
    }

    /**
     * Show a toast with the FM toaster. Set up the updater function if required
     *
     * @param {ChatToast} toast The toast to show
     * @param {boolean} redraw If this isn't the first time the toast is shown
     * @returns {void} void
     */
    dispatchFMToast(toast, redraw) {
        window.toaster.alerts.medium(...toast.renderFM()).then(fmToastId => {
            if (!redraw) {
                toast.onShown(fmToastId);
            }
            this.setState({ fmToastId });
            if (toast.updater && typeof toast.updater === 'function') {
                toast.updater();
                toast.updateInterval = setInterval(() => {
                    toast.updater();
                    const value = toast.render();
                    if (!value) {
                        window.toaster.alerts.hide(fmToastId);
                        return this.onClose(toast.options && toast.options.persistent);
                    }
                    if (value !== $('span', `#${fmToastId}`).text()) {
                        $('span', `#${fmToastId}`).text(value);
                    }
                }, 250);
            }
        });
    }

    /**
     * Updates the state to show the given toast for the amount of time.
     *
     * @param {ChatToast} toast The toast to be rendered
     * @param {number} now The current time in ms
     * @param {object} options Additional state values
     * @returns {void} void
     */
    dispatchToast(toast, now, options = {}) {
        const { fmToastId, endTime, silent } = options;
        const { onShownToast, onHideToast } = this.props;
        this.setState({toast, endTime: endTime || now + toast.getTTL(), fmToastId}, () => {
            this.eventuallyUpdate();
            if (!silent) {
                toast.onShown();
            }
            this.timeout = setTimeout(() => {
                delete this.timeout;
                this.setState({toast: null, endTime: 0}, () => this.pollToasts());
                if (typeof toast.onEnd === 'function') {
                    toast.onEnd();
                }
                if (typeof onHideToast === 'function') {
                    onHideToast(toast);
                }
                if (toast.updateInterval) {
                    clearInterval(toast.updateInterval);
                    delete toast.updateInterval;
                }
            }, endTime ? endTime - now : toast.getTTL());
        });
        if (typeof onShownToast === 'function') {
            onShownToast(toast);
        }
    }

    /**
     * Called to dismiss the rendered toast
     *
     * @param {boolean} persistent If the notification was a persistent one
     * @returns {void} void
     */
    onClose(persistent) {
        const { showDualNotifications, onHideToast } = this.props;
        const { toast, persistentToast } = this.state;
        if (showDualNotifications && persistent) {
            if (typeof persistentToast.onEnd === 'function') {
                persistentToast.onEnd();
            }
            this.setState({ persistentToast: null }, () => this.pollToasts());
            if (typeof onHideToast === 'function') {
                onHideToast(persistentToast);
            }
            return;
        }
        if (toast.updateInterval) {
            clearInterval(toast.updateInterval);
            delete toast.updateInterval;
        }
        clearTimeout(this.timeout);
        delete this.timeout;
        if (typeof toast.onEnd === 'function') {
            toast.onEnd();
        }
        if (typeof onHideToast === 'function') {
            onHideToast(toast);
        }
        this.setState({toast: null, endTime: 0}, () => this.pollToasts());
    }

    /**
     * Empty the toast queue + shown toasts due to the `onChatToastFlush` event
     *
     * @returns {void} void
     */
    flush() {
        const { toast, persistentToast, fmToastId } = this.state;
        this.endToastIntervals();
        if (fmToastId && fmToastId !== 'tmp') {
            window.toaster.alerts.hide(fmToastId);
        }
        this.toasts = [];
        this.persistentToasts = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        if (toast) {
            this.onClose(toast.persistent);
        }
        if (persistentToast) {
            this.onClose(true);
        }
        this.setState({
            toast: null,
            endTime: 0,
            fmToastId: null,
            persistentToast: null,
        });
    }

    /**
     * Clear any update intervals from FM toasts
     *
     * @returns {void} void
     */
    endToastIntervals() {
        if (!this.props.isRootToaster) {
            // If the call ChatToaster unmounts we don't want to clear these
            return;
        }
        for (const toast of this.toasts) {
            if (toast.updateInterval) {
                clearInterval(toast.updateInterval);
            }
        }
        for (const toast of this.persistentToasts) {
            if (toast.updateInterval) {
                clearInterval(toast.updateInterval);
            }
        }
    }

    componentDidMount() {
        super.componentDidMount();
        megaChat.rebind(`onChatToast.toaster${this.getUniqueId()}`, e => this.enqueueToast(e));
        megaChat.rebind(`onChatToastFlush.toaster${this.getUniqueId()}`, () => this.flush());
        onIdle(() => this.pollToasts());
        if (this.props.isRootToaster) {
            this.bpcListener = mBroadcaster.addListener('beforepagechange', tpage => {
                const { toast, endTime, fmToastId } = this.state;
                const now = Date.now();
                if (toast && endTime - 500 > now) { // Don't bother showing the toast again if it would be a short time
                    const toChat = tpage.includes('chat') && tpage !== 'securechat';
                    if (toChat && !M.chat) {
                        clearTimeout(this.timeout);
                        window.toaster.alerts.hide(fmToastId);
                        if (toast.updateInterval) {
                            clearInterval(toast.updateInterval);
                            delete toast.updateInterval;
                        }
                        this.dispatchToast(toast, now, { endTime, silent: true });
                    }
                    else if (!toChat && M.chat) {
                        clearTimeout(this.timeout);
                        this.dispatchToast(toast, now, { fmToastId: 'tmp', endTime, silent: true });
                        this.dispatchFMToast(toast, true);
                    }
                }
                else if (toast && typeof toast.onEnd === 'function') {
                    toast.onEnd();
                }
            });
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        megaChat.off(`onChatToast.toaster${this.getUniqueId()}`);
        megaChat.off(`onChatToastFlush.toaster${this.getUniqueId()}`);
        if (this.bpcListener) {
            mBroadcaster.removeListener(this.bpcListener);
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.endToastIntervals();
    }

    render() {
        const { hidden, isRootToaster, showDualNotifications } = this.props;
        const { toast, fmToastId, persistentToast } = this.state;
        return (
            !hidden
            && !fmToastId
            && <div className={`chat-toast-bar ${isRootToaster ? 'toaster-root' : ''}`}>
                {
                    showDualNotifications
                    && persistentToast
                    && <ChatToastMsg
                        toast={persistentToast}
                        isRootToaster={isRootToaster}
                        usePersistentStyle={true}
                        onClose={p => this.onClose(p)}
                    />
                }
                {
                    toast
                    && <ChatToastMsg
                        toast={toast}
                        isRootToaster={isRootToaster}
                        isDualToast={!!persistentToast}
                        onClose={p => this.onClose(p)}
                    />
                }
            </div>
        );
    }
}

class ChatToastMsg extends MegaRenderMixin {
    state = {
        value: '',
    };

    componentDidMount() {
        super.componentDidMount();
        const { toast, onClose } = this.props;
        if (toast.updater && typeof toast.updater === 'function') {
            toast.updater();
            this.updateInterval = setInterval(() => {
                toast.updater();
                const value = toast.render();
                if (!value) {
                    return onClose(toast.options && toast.options.persistent);
                }
                if (value !== this.state.value) {
                    this.setState({ value });
                }
            }, 250);
        }
        const value = toast.render();
        if (value) {
            this.setState({ value });
        }
        else {
            // If we have no value assume the toast was updated/invalid so close it.
            onClose(toast.options && toast.options.persistent);
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    render() {
        const { toast, isRootToaster, isDualToast, usePersistentStyle, onClose } = this.props;
        const { value } = this.state;
        if (usePersistentStyle && toast.options.persistent) {
            return <div className={`${NAMESPACE} chat-persistent-toast`}>
                {value || toast.render()}
            </div>;
        }
        const closeButton = toast.close && <Button
            className="chat-toast-close"
            icon="sprite-fm-mono icon-close-component"
            onClick={onClose}
        />;
        const icon = toast.icon && <i className={toast.icon}/>;
        if (isRootToaster) {
            return (
                <div className={`${NAMESPACE} chat-toast-wrapper root-toast`}>
                    <div className="toast-value-wrapper">
                        {icon}
                        <div className="toast-value">{value || toast.render()}</div>
                    </div>
                    {closeButton}
                </div>
            );
        }
        return (
            <div className={`${NAMESPACE} chat-toast-wrapper theme-light-forced ${isDualToast ? 'dual-toast' : ''}`}>
                <div className="toast-value">{value || toast.render()}</div>
            </div>
        );
    }
}
