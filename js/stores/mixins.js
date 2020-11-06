import ReactDOM from "react-dom";
import React from "react";

var INTERSECTION_OBSERVER_AVAILABLE = typeof IntersectionObserver !== 'undefined';

// copied from Facebook's shallowEqual, used in PureRenderMixin, because it was defined as a _private_ module and
// adapted to be a bit more optimal for functions...
function shallowEqual(objA, objB) {
    if (objA === objB) {
        return true;
    }
    var key;
    // Test for A's keys different from B.
    for (key in objA) {
        if (key === "children") {
            // skip!
            continue;
        }
        if (objA.hasOwnProperty(key)) {
            if (!objB.hasOwnProperty(key)) {
                return false;
            }
            else if (objA[key] !== objB[key]) {
                // handle/match functions code
                if (typeof(objA[key]) === 'function' && typeof(objB[key]) === 'function') {
                    if (objA[key].toString() !== objB[key].toString()) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
        }
    }
    // Test for B's keys missing from A.
    for (key in objB) {
        if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

window.shallowEqual = shallowEqual;

var MAX_ALLOWED_DEBOUNCED_UPDATES = 5;
var DEBOUNCED_UPDATE_TIMEOUT = 60;
var REENABLE_UPDATES_AFTER_TIMEOUT = 300;

var MAX_TRACK_CHANGES_RECURSIVE_DEPTH = 1;

let _propertyTrackChangesVars = Object.create(null);
_propertyTrackChangesVars._listenersMap = Object.create(null);
_propertyTrackChangesVars._dataChangedHistory = Object.create(null);

if (window._propertyTrackChangesVars) {
    _propertyTrackChangesVars = window._propertyTrackChangesVars;
}
else {
    window._propertyTrackChangesVars = _propertyTrackChangesVars;
}

window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;

var FUNCTIONS = [
    'render',
    'shouldComponentUpdate',
    'doProgramaticScroll',
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'refreshUI',
    'eventuallyInit',
    'handleWindowResize',
    'focusTypeArea',
    'initScrolling',
    'updateScroll',
    'isActive',
    'onMessagesScrollReinitialise',
    'specShouldComponentUpdate',
    'attachAnimationEvents',
    'eventuallyReinitialise',
    'reinitialise',
    'reinitialised',
    'getContentHeight',
    'getScrollWidth',
    'isAtBottom',
    'onResize',
    'isComponentEventuallyVisible',
    'getCursorPosition',
    'getTextareaMaxHeight',
];

var localStorageProfileRenderFns = localStorage.profileRenderFns;

if (localStorageProfileRenderFns) {
    window.REACT_RENDER_CALLS = {};
}

let ID_CURRENT = 1;
const DEBUG_THIS = d > 1 ? d : false;

const scheduler = (func, name, debug) => {
    let dbug = debug !== false && DEBUG_THIS;
    let idnt = null;
    let task = null;
    let fire = () => {
        if (dbug) {
            console.warn('Dispatching scheduled task for %s.%s...', idnt, name);
        }
        if (task) {
            queueMicrotask(task);
            task = null;
        }
    };
    const _scheduler = function() {
        if (dbug) {
            if (!idnt) {
                idnt = name[0] === '(' && this.getReactId && this.getReactId() || this;
            }
            console.warn('Scheduling task from %s.%s...', idnt, name, [this], !!task);
        }
        if (!task) {
            queueMicrotask(fire);
        }
        let idx = arguments.length;
        const args = new Array(idx);
        while (idx--) {
            args[idx] = arguments[idx];
        }
        task = () => {
            func.apply(this, args);
        };
    };
    if (DEBUG_THIS) {
        Object.defineProperty(_scheduler, smbl(name), {value: func});
    }
    return _scheduler;
};

export const timing = (min, max) => {
    return function(target, key, de) {
        if (DEBUG_THIS > 2) {
            de[key] = de.value;
            _timing(de, min, max);
            de.value = de[key];
        }
        return de;
    };
};

export const logcall = () => {
    return function(target, key, descriptor) {
        if (DEBUG_THIS > 3) {
            const func = descriptor.value;
            descriptor.value = function() {
                console.group('[logcall] Entering into %s.%s...', this, key);
                var r = func.apply(this, arguments);
                console.info('[logcall] Leaving %s.%s...', this, key);
                console.groupEnd();
                return r;
            };
        }
        return descriptor;
    };
};

export const schedule = (local, debug) => {
    return function(target, property, descriptor) {
        if (local) {
            const func = descriptor.value;
            descriptor = {
                configurable: true,
                get: function _unusedScheduler() {
                    Object.defineProperty(this, property, {
                        value: scheduler(func, '(' + property + ')', debug)
                    });
                    return this[property];
                }
            };
        }
        else {
            descriptor.value = scheduler(descriptor.value, property, debug);
        }

        return descriptor;
    };
};

export const SoonFcWrap = (milliseconds, local) => {
    return function(target, propertyKey, descriptor) {
        descriptor.value = SoonFc(descriptor.value, !local, milliseconds);
        return descriptor;
    };
};

export const trycatcher = () => (t, p, d) => (d.value = tryCatch(d.value)) && d;

export class MegaRenderMixin extends React.Component {
    constructor(props) {
        super(props);

        /** @property MegaRenderMixin.__internalReactID */
        lazy(this, '__internalReactID', function() {
            let key = '';
            let fib = DEBUG_THIS && this._reactInternalFiber;
            while (fib) {
                let tmp = fib.key;
                if (tmp && tmp[0] !== '.' && key.indexOf(tmp) < 0) {
                    key += tmp + '/';
                }
                if ((tmp = fib.memoizedProps)) {
                    if (tmp.contact) {
                        tmp = tmp.contact.u + (tmp.chatRoom ? '@' + tmp.chatRoom.roomId : '');
                    }
                    else if (tmp.chatRoom) {
                        tmp = tmp.chatRoom.roomId;
                    }
                    else {
                        tmp = 0;
                    }
                    if (tmp && key.indexOf(tmp) < 0) {
                        key += tmp + '/';
                    }
                }
                fib = fib._debugOwner;
            }
            key = key ? '[' + key.substr(0, key.length - 1) + ']' : '';
            return '::' + this.constructor.name + '[' + ('000' + ID_CURRENT++).slice(-4) + ']' + key;
        });

        /** @property MegaRenderMixin.__internalUniqueID */
        lazy(this, '__internalUniqueID', function() {
            return (this.__internalReactID + makeUUID().substr(-12)).replace(/[^a-zA-Z0-9]/g, '');
        });

        Object.defineProperty(this, 'isMounted', {
            value: function MegaRenderMixin_isMounted() {
                return !!this.__isMounted;
            }
        });

        if (DEBUG_THIS > 2) {
            Object.defineProperty(this, 'safeForceUpdate', {
                value: function MegaRenderMixin_safeForceUpdate_debug() {
                    console.group('%s.safeForceUpdate: mounted:%s, visible:%s',
                        this.getReactId(), this.__isMounted, this.isComponentEventuallyVisible());

                    if (this.__isMounted) {
                        this.forceUpdate(() => {
                            console.warn('%s.safeForceUpdate finished.', this.getReactId());
                            console.groupEnd();
                        });
                    }
                }
            });
        }

        if (DEBUG_THIS) {
            if (!megaChat.__components) {
                megaChat.__components = new WeakMap();
            }
            megaChat.__components.set(this, Object.getPrototypeOf(this));
        }
    }

    @logcall()
    componentWillUnmount() {
        if (super.componentWillUnmount) {
            super.componentWillUnmount();
        }
        this.__isMounted = false;
        chatGlobalEventManager.removeEventListener('resize', 'megaRenderMixing' + this.getUniqueId());
        chatGlobalEventManager.removeEventListener('hashchange', 'hc' + this.getUniqueId());

        if (this.__intersectionObserverInstance) {
            var node = this.findDOMNode();
            if (node) {
                this.__intersectionObserverInstance.unobserve(node);
            }
            this.__intersectionObserverInstance.disconnect();
            this.__intersectionObserverInstance = undefined;
        }

        var instanceId = this.getUniqueId();
        var listeners = _propertyTrackChangesVars._listenersMap[instanceId];
        if (listeners) {
            for (var k in listeners) {
                var v = listeners[k];
                v[0].removeChangeListener(v[1]);
            }
        }
        _propertyTrackChangesVars._listenersMap[instanceId] = null;
        _propertyTrackChangesVars._dataChangedHistory[instanceId] = null;

        if (this._dataStructListeners) {
            this._internalDetachRenderCallbacks();
        }

        if (this.detachRerenderCallbacks) {
            this.detachRerenderCallbacks();
        }
    }

    getReactId() {
        return this.__internalReactID;
    }

    getUniqueId() {
        return this.__internalUniqueID;
    }

    @SoonFcWrap(50, true)
    debouncedForceUpdate() {
        this.eventuallyUpdate();
    }

    @logcall()
    componentDidMount() {
        if (super.componentDidMount) {
            super.componentDidMount();
        }
        this.__isMounted = true;
        this._wasRendered = true;

        if (this.props.requiresUpdateOnResize || !this.props.skipQueuedUpdatesOnResize) {
            chatGlobalEventManager.addEventListener('resize',
                'megaRenderMixing' + this.getUniqueId(), () => this.onResizeDoUpdate());
        }

        chatGlobalEventManager.addEventListener('hashchange', 'hc' + this.getUniqueId(), () => this.onResizeDoUpdate());

        // init on data structure change events
        if (this.props) {
            this._recurseAddListenersIfNeeded("p", this.props);
        }

        if (this.state) {
            this._recurseAddListenersIfNeeded("s", this.state);
        }

        if (INTERSECTION_OBSERVER_AVAILABLE && !this.customIsEventuallyVisible) {
            var node = this.findDOMNode();
            if (node) {
                this.__intersectionVisibility = false;

                setTimeout(() => {
                    // bug in IntersectionObserver, that caused the intersection observer to not fire the initial
                    // visibility call once its initialized
                    this.__intersectionObserverInstance = new IntersectionObserver(
                        ([entry]) => {
                            if (entry.intersectionRatio < 0.2 && !entry.isIntersecting) {
                                this.__intersectionVisibility = false;
                            }
                            else {
                                this.__intersectionVisibility = true;
                                if (this._requiresUpdateOnResize) {
                                    this.debouncedForceUpdate();
                                }
                            }

                            if (this.onVisibilityChange) {
                                this.onVisibilityChange(this.__intersectionVisibility);
                            }
                        },
                        {
                            threshold: 0.1
                        }
                    );
                    this.__intersectionObserverInstance.observe(node);
                }, 150);
            }
        }

        if (this.attachRerenderCallbacks) {
            this.attachRerenderCallbacks();
        }
    }
    findDOMNode() {
        if (!this.domNode) {
            this.domNode = ReactDOM.findDOMNode(this);
        }
        return this.domNode;
    }
    isComponentVisible() {
        // .__isMounted is faster then .isMounted() or any other operation
        if (!this.__isMounted) {
            return false;
        }
        if (this.customIsEventuallyVisible) {
            var result = this.customIsEventuallyVisible();
            if (result !== -1) {
                return result;
            }
        }

        if (this.__intersectionVisibility === false) {
            return false;
        }
        else if (this.__intersectionVisibility === true) {
            return true;
        }
        const domNode = this.findDOMNode();

        // offsetParent should NOT trigger a reflow/repaint
        if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
            return false;
        }
        if (!$(domNode).is(":visible")) {
            return false;
        }
        return verge.inViewport(domNode);
    }
    /**
     * Lightweight version of .isComponentVisible
     * @returns {bool}
     */
    isComponentEventuallyVisible() {
        // .__isMounted is faster then .isMounted() or any other operation
        if (!this.__isMounted) {
            return false;
        }

        if (this.customIsEventuallyVisible) {
            return this.customIsEventuallyVisible();
        }

        if (typeof this.props.isVisible !== 'undefined') {
            return this.props.isVisible;
        }

        return this.__intersectionVisibility !== false;
    }

    @SoonFcWrap(80, true)
    eventuallyUpdate() {
        if (!window.megaChat || megaChat.isLoggingOut
            || this._updatesDisabled || !this._wasRendered || !this.__isMounted) {

            return;
        }

        if (!this.isComponentEventuallyVisible()) {
            this._requiresUpdateOnResize = true;
            return;
        }

        if (this._requiresUpdateOnResize) {
            this._requiresUpdateOnResize = false;
        }

        this.forceUpdate();
    }
    tempDisableUpdates(forHowLong) {
        var self = this;
        self._updatesDisabled = true;
        if (self._updatesReenableTimer) {
            clearTimeout(self._updatesReenableTimer);
        }

        var timeout = forHowLong ?
            forHowLong : (
                self.REENABLE_UPDATES_AFTER_TIMEOUT ?
                    self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT
            );

        self._updatesReenableTimer = setTimeout(function() {
            self.tempEnableUpdates();
        }, timeout);
    }

    tempEnableUpdates() {
        clearTimeout(this._updatesReenableTimer);
        this._updatesDisabled = false;
        this.eventuallyUpdate();
    }

    @SoonFcWrap(350, true)
    onResizeDoUpdate() {
        this.eventuallyUpdate();
    }

    // onHashChangeDoUpdate() {
    //     if (!this.isMounted() || this._pendingForceUpdate === true) {
    //         return;
    //     }
    //
    //     this.eventuallyUpdate();
    // }

    _getUniqueIDForMap(map, payload) {
        return map + '.' + payload;
    }

    _recurseAddListenersIfNeeded(idx, map, depth) {
        depth |= 0;

        if (map instanceof MegaDataMap) {
            var cacheKey = this._getUniqueIDForMap(map, idx);
            var instanceId = this.getUniqueId();

            if (!_propertyTrackChangesVars._listenersMap[instanceId]) {
                _propertyTrackChangesVars._listenersMap[instanceId] = Object.create(null);
            }
            if (!_propertyTrackChangesVars._listenersMap[instanceId][cacheKey]) {
                _propertyTrackChangesVars._listenersMap[instanceId][cacheKey]
                    = [map, map.addChangeListener(() => this.onPropOrStateUpdated())];
            }
        }

        if (depth++ < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && !this.props.manualDataChangeTracking) {
            var mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);

            for (var i = 0; i < mapKeys.length; i++) {
                var k = mapKeys[i];
                if (map[k]) {
                    this._recurseAddListenersIfNeeded(idx + "_" + k, map[k], depth);
                }
            }
        }
    }

    _checkDataStructForChanges(idx, v, rv, depth) {
        if (!v && v === rv) { // null, undefined, false is ok
            // console.error('r === rv, !v', k, referenceMap, map);
            return false; // continue/skip
        }
        if (!rv && v) { // null, undefined, false is ok
            return true;
        }
        if (v === null) {
            return rv !== null;
        }

        if (v instanceof MegaDataMap) {
            var cacheKey = this._getUniqueIDForMap(v, idx);
            var dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;

            var instanceId = this.getUniqueId();
            if (!dataChangeHistory[instanceId]) {
                dataChangeHistory[instanceId] = Object.create(null);
            }

            if (dataChangeHistory[instanceId][cacheKey] !== v._dataChangeIndex) {
                if (window.RENDER_DEBUG) {
                    console.error(
                        "changed: ", this.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v
                    );
                }

                dataChangeHistory[instanceId][cacheKey] = v._dataChangeIndex;
                return true;
            }

            return false;
        }

        return depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && v && v.byteLength === undefined
            && typeof v === "object" && this._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true;
    }

    _recursiveSearchForDataChanges(idx, map, referenceMap, depth) {
        var self = this;
        depth = depth || 0;

        if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
            return;
        }

        if (!this._wasRendered) {
            if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);

            this._wasRendered = true;
            return true; // first time render, always render the first time
        }
        // quick lookup for children
        if (
            idx === "p_children"
        ) {
            // found a list of children nodes
            if (map.map && referenceMap.map) {
                var oldKeys = map.map(function(child) { return child ? child.key : child; });
                var newKeys = referenceMap.map(function(child) { return child ? child.key : child; });
                if (!shallowEqual(oldKeys, newKeys)) {
                    return true;
                }
            }
            else if (
                (!map && referenceMap) ||
                (map && !referenceMap)
            ) {
                return true;
            }
            else if (
                map.$$typeof && referenceMap.$$typeof
            ) {
                if (
                    !shallowEqual(map.props, referenceMap.props) ||
                    !shallowEqual(map.state, referenceMap.state)
                ) {
                    return true;
                }

            }
            // found a single node
        }
        else if (
            (map && !referenceMap) ||
            (!map && referenceMap) ||
            (map && referenceMap && !shallowEqual(map, referenceMap))
        ) {
            return true;
        }

        const mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);

        for (let i = mapKeys.length; i--;) {
            let k = mapKeys[i];
            if (this._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth)) {
                return true;
            }
        }

        return false;
    }
    shouldComponentUpdate(nextProps, nextState) {
        var shouldRerender = false;

        if (megaChat && megaChat.isLoggingOut) {
            return false;
        }

        if (
            !this.isMounted() ||
            this._pendingForceUpdate === true ||
            this._updatesDisabled === true
        ) {
            if (window.RENDER_DEBUG) {
                console.error(
                    "shouldUpdate? No.", "F1", this.getElementName(), this.props, nextProps, this.state, nextState
                );
            }
            return false;
        }
        if (this.customIsEventuallyVisible) {
            // we asume `customIsEventuallyVisible` is super quick/does have low CPU usage
            if (!this._queueUpdateWhenVisible && !this.customIsEventuallyVisible()) {
                this._queueUpdateWhenVisible = true;
                if (window.RENDER_DEBUG) {
                    console.error(
                        "shouldUpdate? No.", "F1.1", this.getElementName(), this.props, nextProps, this.state,
                        nextState
                    );
                }
            }
            else if (this._queueUpdateWhenVisible && this.customIsEventuallyVisible()) {
                delete this._queueUpdateWhenVisible;
                return true;
            }
        }

        // component specific control of the React lifecycle
        if (this.specShouldComponentUpdate) {
            var r = this.specShouldComponentUpdate(nextProps, nextState);
            if (r === false) {
                if (window.RENDER_DEBUG) {
                    console.error(
                        "shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState
                    );
                }
                this._requiresUpdateOnResize = true;
                return false;
            }
            else if (r === true) {
                return true;
            }
        }

        if (!this.props.disableCheckingVisibility && !this.isComponentEventuallyVisible()) {
            if (window.RENDER_DEBUG) {
                console.error(
                    "shouldUpdate? No.", "FVis", this.getElementName(), this.props, nextProps, this.state, nextState
                );
            }
            this._requiresUpdateOnResize = true;
            return false;
        }

        if (this.props !== null) {
            shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
        }
        if (shouldRerender === false) {
            if (window.RENDER_DEBUG) {
                console.error(
                    "shouldUpdate? No.", "F3", this.getElementName(), this.props, nextProps, this.state, nextState
                );
            }
        }
        if (shouldRerender === false && this.state !== null) {
            shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
        }




        if (window.RENDER_DEBUG) {
            if (shouldRerender) {
                // debugger;
            }
            console.error("shouldRerender?",
                shouldRerender,
                "rendered: ", this.getElementName(),
                "props:", this.props,
                "nextProps:", this.props,
                "state:", this.state
            );
        }


        if (shouldRerender === true) { // (eventually) add listeners to newly added data structures
            if (this.props) {
                this._recurseAddListenersIfNeeded("p", this.props);
            }
            if (this.state) {
                this._recurseAddListenersIfNeeded("s", this.state);
            }
        }
        else {
            if (window.RENDER_DEBUG) {
                console.error(
                    "shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState
                );
            }
        }

        return shouldRerender;
    }

    onPropOrStateUpdated() {
        this.eventuallyUpdate();
    }

    getElementName() {
        return this._reactInternalFiber.elementType.name;
    }

    safeForceUpdate() {
        if (this.__isMounted) {
            this.forceUpdate();
        }
    }

    /* RenderDebug mixin */
    componentDidUpdate() {
        if (window.RENDER_DEBUG) {
            var self = this;
            var getElementName = function() {
                if (!self.constructor) {
                    return "unknown";
                }
                return self.constructor.name;
            };

            console.error(
                "renderedX: ", getElementName(),
                "props:", this.props,
                "state:", this.state
            );
        }
    }

    componentWillReceiveProps(nextProps, nextContext) {
        if (localStorageProfileRenderFns) {
            // since this is not used in our app, we can use it as a pre-call hook to wrap render() fn's for
            // performance logging
            var self = this;
            var componentName = self.constructor ? self.constructor.name : "unknown";
            if (!this._wrappedRender) {
                FUNCTIONS.forEach(function (fnName) {
                    var _origFn = self[fnName];
                    if (_origFn) {
                        self[fnName] = function () {
                            var start = performance.now();
                            var res = _origFn.apply(this, arguments);
                            REACT_RENDER_CALLS[componentName + "." + fnName] = REACT_RENDER_CALLS[
                            componentName + "." + fnName
                                ] || 0;
                            REACT_RENDER_CALLS[componentName + "." + fnName] += performance.now() - start;
                            return res;
                        };
                    }
                });
                self._wrappedRender = true;
            }
            REACT_RENDER_CALLS.sorted = function () {
                var sorted = [];
                Object.keys(REACT_RENDER_CALLS).sort(function (a, b) {
                    if (REACT_RENDER_CALLS[a] < REACT_RENDER_CALLS[b]) {
                        return 1;
                    } else if (REACT_RENDER_CALLS[a] > REACT_RENDER_CALLS[b]) {
                        return -1;
                    } else {
                        return 0;
                    }
                }).forEach(function (k) {
                    if (typeof REACT_RENDER_CALLS[k] !== 'function') {
                        sorted.push([k, REACT_RENDER_CALLS[k]]);
                    }
                });

                return sorted;
            };
            REACT_RENDER_CALLS.clear = function () {
                Object.keys(REACT_RENDER_CALLS).forEach(function (k) {
                    if (typeof REACT_RENDER_CALLS[k] !== 'function') {
                        delete REACT_RENDER_CALLS[k];
                    }
                });
            };
        }
    }

    _internalDetachRenderCallbacks() {
        const items = this._dataStructListeners || false;

        for (let i = items.length; i--;) {
            let item = items[i];

            if (item[0] === 'dsprops') {
                console.assert(item[2].removeChangeListener(item[1]), 'listener not found..');
            }
        }
    }
    addDataStructListenerForProperties(obj, properties) {
        if (!(obj instanceof MegaDataMap)) {
            // this should not happen, but in rare cases it does...so we should just skip.
            return;
        }

        if (!this._dataStructListeners) {
            this._dataStructListeners = [];
        }
        properties = array.to.object(properties);

        var id = obj.addChangeListener((obj, data, k) => properties[k] && this.onPropOrStateUpdated());

        this._dataStructListeners.push(['dsprops', id, obj]);
    }
}


export class ContactAwareComponent extends MegaRenderMixin {
    static unavailableAvatars = Object.create(null);

    constructor(props) {
        super(props);
        this.loadContactInfo();
    }

    loadContactInfo() {
        const contact = this.props.contact;
        const contactHandle = contact && (contact.h || contact.u);

        if (!(contactHandle in M.u)) {
            return;
        }

        const syncName = !contact.firstName && !contact.lastName;
        const syncMail = (contact.c === 1 || contact.c === 2) && !contact.m && !anonymouschat;
        const syncAvtr = !avatars[contactHandle] && !ContactAwareComponent.unavailableAvatars[contactHandle];

        const loader = () => {
            if (!this.isComponentEventuallyVisible()) {
                // console.warn('xyz', 'no longer visible', [this]);
                this.__isLoadingContactInfo = null;
                this._requiresUpdateOnResize = true;
                return;
            }

            const promises = [];
            const chatHandle = pchandle || (this.props.chatRoom && this.props.chatRoom.publicChatHandle);

            if (syncName) {
                promises.push(M.syncUsersFullname(contactHandle, chatHandle, new MegaPromise()));
            }

            if (syncMail) {
                promises.push(M.syncContactEmail(contactHandle, new MegaPromise()));
            }

            if (syncAvtr) {
                promises.push(
                    useravatar.loadAvatar(contactHandle, chatHandle)
                        .catch(function() {
                            ContactAwareComponent.unavailableAvatars[contactHandle] = true;
                        })
                );
            }

            // force stuck in "Loading" state
            // promises.push([function() { return new MegaPromise(); }]);

            MegaPromise.allDone(promises)
                .always(() => {
                    this.eventuallyUpdate();
                    this.__isLoadingContactInfo = false;
                });
        };

        if (syncName || syncMail || syncAvtr) {
            this.__isLoadingContactInfo = setTimeout(loader, 300);
        }
    }

    componentDidUpdate() {
        super.componentDidUpdate();

        if (this.__isLoadingContactInfo === null) {
            // console.warn('xyz', 'LOADING', [this]);
            this.loadContactInfo();
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        if (this.__isLoadingContactInfo) {
            clearTimeout(this.__isLoadingContactInfo);
        }
    }

    isLoadingContactInfo() {
        return !!this.__isLoadingContactInfo;
    }
}
