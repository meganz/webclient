var ReactDOM = require("react-dom");

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

var MegaRenderMixin = {
    getReactId: function() {
        return this._reactInternalInstance._rootNodeID;
    },
    getUniqueId: function() {
        if (!this._reactInternalInstance) {
            assert(this._uniqueId, 'missing unique id.');
            return this._uniqueId;
        }
        this._uniqueId = this.getReactId().replace(/[^a-zA-Z0-9]/g, "");
        return this._uniqueId;
    },
    debouncedForceUpdate: function(timeout) {
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
    },
    componentDidMount: function() {

        if (this.props.requiresUpdateOnResize) {
            $(window).rebind('resize.megaRenderMixing' + this.getUniqueId(), this.onResizeDoUpdate);
        }
        // window.addEventListener('hashchange', this.onHashChangeDoUpdate);

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

        this._isMounted = true;
    },
    findDOMNode: function() {
        if (this.domNode) {
            // injected by RenderTo and ModalDialogs
            return this.domNode;
        }

        return ReactDOM.findDOMNode(this);
    },
    componentWillUnmount: function() {
        if (this.props.requiresUpdateOnResize) {
            $(window).off('resize.megaRenderMixing' + this.getUniqueId());
        }

        // window.removeEventListener('hashchange', this.onHashChangeDoUpdate);

        this._isMounted = false;
    },
    isComponentVisible: function() {
        var domNode = $(this.findDOMNode());

        // ._isMounted is faster then .isMounted() or any other operation
        if (!this._isMounted) {
            return false;
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
    },
    /**
     * Lightweight version of .isComponentVisible
     * @returns {bool}
     */
    isComponentEventuallyVisible: function() {
        var domNode = this.findDOMNode();

        // ._isMounted is faster then .isMounted() or any other operation
        if (!this._isMounted) {
            return false;
        }
        if (this.props.isVisible) {
            return true;
        }
        // offsetParent should NOT trigger a reflow/repaint
        if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
            return false;
        }
        return true;
    },
    eventuallyUpdate: function() {
        var self = this;

        if (self._updatesDisabled === true) {
            return;
        }
        if (!self._wasRendered || (self._wasRendered && !self.isMounted())) {
            return;
        }
        if (!self._isMounted) {
            return;
        }
        if (!self.isComponentEventuallyVisible()) {
            return;
        }

        self.safeForceUpdate();
    },
    tempDisableUpdates: function(forHowLong) {
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
    },
    tempEnableUpdates: function() {
        clearTimeout(this._updatesReenableTimer);
        this._updatesDisabled = false;
        this.eventuallyUpdate();
    },
    onResizeDoUpdate: function() {
        if (!this.isMounted() || this._pendingForceUpdate === true) {
            return;
        }

        this.eventuallyUpdate();
    },
    // onHashChangeDoUpdate: function() {
    //     if (!this.isMounted() || this._pendingForceUpdate === true) {
    //         return;
    //     }
    //
    //     this.eventuallyUpdate();
    // },
    _recurseAddListenersIfNeeded: function(idx, map, depth) {
        var self = this;
        depth = depth ? depth : 0;


        if (typeof map._dataChangeIndex !== "undefined") {
            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() +
                            "_" + idx;
            if (map.addChangeListener && !_propertyTrackChangesVars._listenersMap[cacheKey]) {
                _propertyTrackChangesVars._listenersMap[cacheKey] = map.addChangeListener(function () {
                    self.onPropOrStateUpdated(map, idx);
                });
            }
        }
        if (depth+1 > MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            return;
        }

        var mapKeys = map._dataChangeIndex !== undefined ? map.keys() : Object.keys(map);

        mapKeys.forEach(function(k) {
            if (map[k]) {
                self._recurseAddListenersIfNeeded(idx + "_" + k, map[k], depth + 1);
            }
        });
    },
    _checkDataStructForChanges: function(idx, valA, valB, depth) {
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
        } else if (typeof v === "object" && v !== null && depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
                foundChanges = true;
            } else {
                // console.error("NOT (recursive) changed: ", k, v);
            }
        } else if (v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
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
    },
    _recursiveSearchForDataChanges: function(idx, map, referenceMap, depth) {
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
    },
    shouldComponentUpdate: function(nextProps, nextState) {
        var shouldRerender = false;

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

        // component specific control of the React lifecycle
        if (this.specificShouldComponentUpdate) {
            var r = this.specificShouldComponentUpdate(nextProps, nextState);
            if (r === false) {
                if (window.RENDER_DEBUG) {
                    console.error(
                        "shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState
                    );
                }
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
                "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
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
    },
    onPropOrStateUpdated: function() {
        if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

        if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
            return;
        }

        this.forceUpdate();
    },
    getElementName: function() {
        return this.constructor.displayName;
    },
    getRootElement: function() {
        var rootElement = this;
        while(rootElement = this._reactInternalInstance._currentElement._owner) {
            //
        }
        return rootElement === this ? null : rootElement;
    },
    getOwnerElement: function() {
        var owner = this._reactInternalInstance._currentElement._owner;
        if (owner) {
            return this._reactInternalInstance._currentElement._owner._instance;
        } else {
            return null;
        }
    },
    safeForceUpdate: function() {
        try {
            if (this._isMounted && this.isMounted()) {
                this.forceUpdate();
            }
        } catch (e) {
            console.error("safeForceUpdate: ", e);
        }
    }
};

var RenderDebugger = {
    componentDidUpdate: function() {
        if (window.RENDER_DEBUG) {
            var self = this;
            var getElementName = function() {
                if (!self.constructor) {
                    return "unknown";
                }
                return self.constructor.displayName;
            };

            console.error(
                "rendered: ", getElementName(),
                "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
                "props:", this.props,
                "state:", this.state
            );
        }
    }
};

window.MegaRenderMixin = MegaRenderMixin;

module.exports = {
    RenderDebugger: RenderDebugger,
    MegaRenderMixin: MegaRenderMixin
};
