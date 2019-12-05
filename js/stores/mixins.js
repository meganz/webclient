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
var _propertyTrackChangesVars = {
    _dataChangedHistory: {},
    _listenersMap: {}
};

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

var ID_CURRENT = 0;

export class MegaRenderMixin extends React.Component {
    constructor (props) {
        super(props);
        this.__intersectionObserver = this.__intersectionObserver.bind(this);
    }
    isMounted() {
        return !!this.__isMounted;
    }
    ensurePromiseLoaded(cb, args, ctx, failCb) {
        var self = this;
        self._loadingPromise = self._loadingPromise || 0;
        var executePromisesCbs = function() {
            if (!self._loadingPromise) {
                var promises = [];
                if (Array.isArray(cb) && !args && !ctx) {
                    var calls = cb;
                    for (var i = 0; i < cb.length; i++) {
                        var _cb = cb[i][0];
                        var _args = cb[i][1];
                        var _ctx = cb[i][2];
                        var promiseReq = _cb.apply(_ctx, _args);
                        if (failCb) {
                            promiseReq.fail(failCb);
                        }
                        promises.push(promiseReq);
                    }
                }
                else {
                    var promiseReq2 = cb.apply(ctx, args);
                    if (failCb) {
                        promiseReq2.fail(failCb);
                    }
                    promises.push(promiseReq2);
                }
                self._loadingPromise = MegaPromise.allDone(promises);
                self._loadingPromise
                    .always(function() {
                        if (self.isMounted()) {
                            self.debouncedForceUpdate();
                        }
                    });
            }
        };

        this._ensurePromiseLoadedTimeout = setTimeout(executePromisesCbs, 100);
    }
    componentWillUnmount() {
        if (super.componentWillUnmount) {
            super.componentWillUnmount();
        }
        this.__isMounted = false;
        $(window).off('resize.megaRenderMixing' + this.getUniqueId());
        $(window).off('resize.megaRenderMixing2' + this.getUniqueId());

        window.removeEventListener('hashchange', this.queuedUpdateOnResize.bind(this));

        if (
            typeof this.__intersectionVisibility !== 'undefined' &&
            this.__intersectionObserverInstance &&
            this.__intersectionObserverInstance.unobserve
        ) {

            var node = this.findDOMNode();
            node && this.__intersectionObserverInstance.unobserve(node);
            this.__intersectionObserverInstance.disconnect();
            delete this.__intersectionObserver;
            this.__intersectionVisibility = undefined;

        }

        if (this._dataStructListeners) {
            this._internalDetachRenderCallbacks();
        }

        if (this.detachRerenderCallbacks) {
            this.detachRerenderCallbacks();
        }
        if (this._ensurePromiseLoadedTimeout) {
            clearTimeout(this._ensurePromiseLoadedTimeout);
            delete this._ensurePromiseLoadedTimeout;
        }
    }
    getReactId() {
        // Since react dropped their _rootNodeId's, we would use some hacky locally generated id
        if (!this._id) {
            this._id = this._reactInternalFiber.type.name + new String(ID_CURRENT++);
        }
        return this._id;
    }
    getUniqueId() {
        if (!this._reactInternalFiber) {
            assert(this._uniqueId, 'missing unique id.');
            return this._uniqueId;
        }
        this._uniqueId = this.getReactId().replace(/[^a-zA-Z0-9]/g, "");
        return this._uniqueId;
    }
    debouncedForceUpdate(timeout) {
        var self = this;
        if (typeof(self.skippedUpdates) === 'undefined') {
            self.skippedUpdates = 0;
        }

        if (self.debounceTimer) {
            clearTimeout(self.debounceTimer);
            // console.error(self.getUniqueId(), self.skippedUpdates + 1);
            self.skippedUpdates++;
        }
        var TIMEOUT_VAL = timeout || DEBOUNCED_UPDATE_TIMEOUT;

        if (self.skippedUpdates > MAX_ALLOWED_DEBOUNCED_UPDATES) {
            TIMEOUT_VAL = 0;
        }

        self.debounceTimer = setTimeout(function() {
            self.eventuallyUpdate();
            self.debounceTimer = null;
            self.skippedUpdates = 0;
        }, TIMEOUT_VAL);
    }
    __intersectionObserver(entries) {
        if (entries[0].intersectionRatio <= 0 && !entries[0].isIntersecting) {
            this.__intersectionVisibility = false;
        }
        else {
            this.__intersectionVisibility = true;
            if (this._requiresUpdateOnResize) {
                this.eventuallyUpdate();
            }
        }
    }
    componentDidMount() {
        if (super.componentDidMount) {
            super.componentDidMount();
        }
        this.__isMounted = true;
        this._wasRendered = true;

        if (this.props.requiresUpdateOnResize) {
            $(window).rebind('resize.megaRenderMixing' + this.getUniqueId(), this.onResizeDoUpdate.bind(this));
        }
        if (!this.props.skipQueuedUpdatesOnResize) {
            $(window).rebind('resize.megaRenderMixing2' + this.getUniqueId(), this.queuedUpdateOnResize.bind(this));
        }

        window.addEventListener('hashchange', this.queuedUpdateOnResize.bind(this));

        // init on data structure change events
        if (this.props) {
            this._recurseAddListenersIfNeeded("p", this.props);
        }

        if (this.state) {
            this._recurseAddListenersIfNeeded("s", this.state);
        }

        //$(window).rebind(
        //    'DOMContentLoaded.lazyRenderer' + this.getUniqueId() + ' ' +
        //    'load.lazyRenderer' + this.getUniqueId() + ' ' +
        //    'resize.lazyRenderer' + this.getUniqueId() + ' ' +
        //    'hashchange.lazyRenderer' + this.getUniqueId() + ' ' +
        //    'scroll.lazyRenderer' + this.getUniqueId(),
        //    this.requiresLazyRendering
        //);
        //
        //this.requiresLazyRendering();

        if (INTERSECTION_OBSERVER_AVAILABLE && !this.customIsEventuallyVisible) {
            var node = this.findDOMNode();
            if (node) {
                this.__intersectionVisibility = false;
                var opts = {
                    threshold: 0.1
                };

                var self = this;

                setTimeout(function() {
                    // bug in IntersectionObserver
                    self.__intersectionObserverInstance = new IntersectionObserver(
                        self.__intersectionObserver,
                        opts
                    );
                    self.__intersectionObserverInstance.observe(node);
                }, 150);
            }
        }

        if (this.attachRerenderCallbacks) {
            this.attachRerenderCallbacks();
        }
    }
    findDOMNode() {
        if (this.domNode) {
            // injected by RenderTo and ModalDialogs
            return this.domNode;
        }

        return ReactDOM.findDOMNode(this);
    }
    isComponentVisible() {
        var domNode = $(this.findDOMNode());

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

        // offsetParent should NOT trigger a reflow/repaint
        if (!this.props.hideable && (!domNode || domNode[0].offsetParent === null)) {
            return false;
        }
        if (!domNode.is(":visible")) {
            return false;
        }
        if (!verge.inX(domNode[0]) && !verge.inY(domNode[0])) {
            return false;
        }
        return true;
    }
    /**
     * Lightweight version of .isComponentVisible
     * @returns {bool}
     */
    isComponentEventuallyVisible() {
        var domNode = this.findDOMNode();


        // .__isMounted is faster then .isMounted() or any other operation
        if (!this.__isMounted) {
            return false;
        }

        if (this.customIsEventuallyVisible) {
            return this.customIsEventuallyVisible();
        }

        if (this.props.isVisible) {
            return true;
        }

        if (this.__intersectionVisibility === false) {
            return false;
        }
        else {
            return true;
        }


        // offsetParent should NOT trigger a reflow/repaint
        if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
            return false;
        }
        return true;
    }
    eventuallyUpdate(debounced) {
        var self = this;

        if (self._updatesDisabled === true) {
            return;
        }
        if (!self._wasRendered || (self._wasRendered && !self.isMounted())) {
            return;
        }
        if (!self.__isMounted) {
            return;
        }
        if (!self.isComponentEventuallyVisible()) {
            this._requiresUpdateOnResize = true;
            return;
        }

        self.safeForceUpdate();
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
    queuedUpdateOnResize() {
        if (this._requiresUpdateOnResize && this.isMounted() && this.isComponentEventuallyVisible()) {
            this._requiresUpdateOnResize = false;
            this.eventuallyUpdate();
        }
    }
    onResizeDoUpdate() {
        if (!this.isMounted() || this._pendingForceUpdate === true) {
            return;
        }

        this.eventuallyUpdate();
    }
    // onHashChangeDoUpdate() {
    //     if (!this.isMounted() || this._pendingForceUpdate === true) {
    //         return;
    //     }
    //
    //     this.eventuallyUpdate();
    // }
    _recurseAddListenersIfNeeded(idx, map, depth) {
        var self = this;
        depth = depth ? depth : 0;


        if (typeof map._dataChangeIndex !== "undefined") {
            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() +
                "_" + idx;
            if (map.addChangeListener && !_propertyTrackChangesVars._listenersMap[cacheKey]) {
                _propertyTrackChangesVars._listenersMap[cacheKey] = map.addChangeListener(function () {
                    self.throttledOnPropOrStateUpdated(map, idx);
                });
            }
        }
        if (depth+1 > MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            return;
        }

        if (!self.props.manualDataChangeTracking) {
            var mapKeys = map._dataChangeIndex !== undefined ? map.keys() : Object.keys(map);

            for (var i = 0; i < mapKeys.length; i++) {
                var k = mapKeys[i];
                if (map[k]) {
                    self._recurseAddListenersIfNeeded(idx + "_" + k, map[k], depth + 1);
                }
            }
        }
    }
    _checkDataStructForChanges(idx, valA, valB, depth) {
        var self = this;
        var foundChanges = false;
        var v = valA;
        var rv = valB;

        // alias
        var dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;

        if (!v && v === rv) { // null, undefined, false is ok
            // console.error('r === rv, !v', k, referenceMap, map);
            return false; // continue/skip
        }
        if (!rv && v) { // null, undefined, false is ok
            return true;
        }

        if (v === null && rv !== null) {
            return true;
        }
        else if (v === null && rv === null) {
            return false;
        }

        if (typeof v._dataChangeIndex !== "undefined") {
            var cacheKey = this.getReactId() + "_" + v._dataChangeTrackedId + "_" + "_" + this.getElementName() +
                "_" + idx;

            if (dataChangeHistory[cacheKey] !== v._dataChangeIndex) {
                if (window.RENDER_DEBUG) {
                    console.error(
                        "changed: ", self.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v
                    );
                }

                foundChanges = true;
                dataChangeHistory[cacheKey] = v._dataChangeIndex;
            } else {
                // console.error("NOT changed: ", k, v._dataChangeTrackedId, v._dataChangeIndex, v);
            }
        } else if (
            !(v instanceof Uint8Array) && typeof v === "object" && v !== null &&
            depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
                foundChanges = true;
            } else {
                // console.error("NOT (recursive) changed: ", k, v);
            }
        } else if (!(v instanceof Uint8Array) && v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            v.forEach(function(v, k) {
                if (self._recursiveSearchForDataChanges(idx, v[k], rv[k], depth + 1) === true) {
                    foundChanges = true;
                    return false; // break
                }
            });
        } else {
            // console.error("NOT tracked/changed: ", k, v);
        }
        return foundChanges;
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

        var mapKeys = map._dataChangeIndex ? map.keys() : Object.keys(map);

        var foundChanges = false;
        mapKeys.forEach(function(k) {
            if (foundChanges === true) {
                return false; // break
            }
            foundChanges = self._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth);
        });
        return foundChanges;
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
        } else {
            if (window.RENDER_DEBUG) {
                console.error(
                    "shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState
                );
            }
        }

        return shouldRerender;
    }
    onPropOrStateUpdated() {
        if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

        if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
            return;
        }
        if (megaChat && megaChat.isLoggingOut) {
            return false;
        }

        this.forceUpdate();
    }
    getElementName() {
        return this._reactInternalFiber.elementType.name;
    }
    safeForceUpdate() {
        try {
            if (this.__isMounted) {
                this.forceUpdate();
            }
        } catch (e) {
            console.error("safeForceUpdate: ", e);
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

    throttledOnPropOrStateUpdated() {
        if (this.throttledOnPropOrStateUpdatedHandler) {
            _cancelOnIdleOrTimeout(this.throttledOnPropOrStateUpdatedHandler);
        }
        _onIdleOrTimeout(this.onPropOrStateUpdated.bind(this), 300);
    }

    _internalDetachRenderCallbacks() {
        if (!this._dataStructListeners) {
            return;
        }

        this._dataStructListeners.forEach(function(row) {
            if (row[0] === 'dsprops') {
                row[2].removeChangeListener(row[1]);
            }
        });
    }
    addDataStructListenerForProperties(obj, properties) {
        if (!obj) {
            // this should not happen, but in rare cases it does...so we should just skip.
            return;
        }

        if (!this._dataStructListeners) {
            this._dataStructListeners = [];
        }


        var self = this;
        var id = obj.addChangeListener(function(obj, data, k) {
            if (properties.indexOf(k) > -1) {
                self.throttledOnPropOrStateUpdated();
            }
        });

        this._dataStructListeners.push(['dsprops', id, obj]);
    }
};

var _noAvatars = {};

export class ContactAwareComponent extends MegaRenderMixin {
    constructor (props) {
        super(props);
        var contact = this.props.contact;
        var promises = [];
        var chatHandle = pchandle || (this.props.chatRoom ? this.props.chatRoom.publicChatHandle : undefined);

        if (contact && contact.h) {
            if (!contact.firstName && !contact.lastName) {
                promises.push(
                    [
                        M.syncUsersFullname,
                        [
                            this.props.contact.h,
                            chatHandle
                        ],
                        M
                    ]
                );
            }
            if (!contact.m && !anonymouschat) {
                promises.push(
                    [
                        M.syncContactEmail,
                        [
                            this.props.contact.h
                        ],
                        M
                    ]
                );
            }
            if (!avatars[contact.u] && !_noAvatars[contact.u]) {
                promises.push(
                    [
                        useravatar.loadAvatar,
                        [
                            contact.u,
                            chatHandle
                        ],
                        useravatar,
                        function(e) {
                            _noAvatars[contact.u] = true;
                        }
                    ]
                );
            }

            // force stuck in "Loading" state
            // promises.push([function() { return new MegaPromise(); }]);

            if (promises.length > 0) {
                this.ensurePromiseLoaded(promises);
            }
        }
    }
    isLoadingContactInfo() {
        // this._loadingPromise can be 0 in case its throttled in that moment.
        return this._loadingPromise && this._loadingPromise.state() === 'pending' || this._loadingPromise === 0;
    }
};
