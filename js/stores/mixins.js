var ReactDOM = require("react-dom");

// copied from Facebook's shallowEqual, used in PureRenderMixin, because it was defined as a _private_ module
function shallowEqual(objA, objB) {
    if (objA === objB) {
        return true;
    }
    var key;
    // Test for A's keys different from B.
    for (key in objA) {
        if (objA.hasOwnProperty(key) &&
            (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
            return false;
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
    //inViewport: false,
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
    componentDidMount: function() {

        window.addEventListener('resize', this.onResizeDoUpdate);
        window.addEventListener('hashchange', this.onHashChangeDoUpdate);

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
    },
    findDOMNode: function() {
        return ReactDOM.findDOMNode(this);
    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.onResizeDoUpdate);
        window.removeEventListener('hashchange', this.onHashChangeDoUpdate);

        //$(window).unbind('DOMContentLoaded.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('load.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('resize.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('hashchange.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('scroll.lazyRenderer' + this.getUniqueId());
    },
    onResizeDoUpdate: function() {
        if(!this.isMounted() || this._pendingForceUpdate === true) {
            return;
        }

        this.forceUpdate();
    },
    onHashChangeDoUpdate: function() {
        if(!this.isMounted() || this._pendingForceUpdate === true) {
            return;
        }

        this.forceUpdate();
    },
    _recurseAddListenersIfNeeded: function(idx, map, depth) {
        var self = this;
        depth = depth ? depth : 0;


        if(typeof(map._dataChangeIndex) !== "undefined") {
            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;
            if (map.addChangeListener && !_propertyTrackChangesVars._listenersMap[cacheKey]) {
                _propertyTrackChangesVars._listenersMap[cacheKey] = map.addChangeListener(function () {
                    self.onPropOrStateUpdated(map, idx);
                });
            }
        }
        if(depth+1 > MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            return;
        }

        var mapKeys = map._dataChangeIndex !== undefined ? map.keys() : Object.keys(map);

        mapKeys.forEach(function(k) {
            if(map[k]) {
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

        if(!v && v === rv) { // null, undefined, false is ok
            //console.error('r === rv, !v', k, referenceMap, map);
            return false; // continue/skip
        }

        if(typeof(v._dataChangeIndex) !== "undefined") {
            var cacheKey = this.getReactId() + "_" + v._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;

            if(dataChangeHistory[cacheKey] !== v._dataChangeIndex) {
                if(window.RENDER_DEBUG) console.error("changed: ", self.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
                foundChanges = true;
                dataChangeHistory[cacheKey] = v._dataChangeIndex;
            } else {
                //console.error("NOT changed: ", k, v._dataChangeTrackedId, v._dataChangeIndex, v);
            }
        } else if(typeof v === "object" && v !== null && depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            if(self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
                foundChanges = true;
            } else {
                //console.error("NOT (recursive) changed: ", k, v);
            }
        } else if(v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            v.forEach(function(v, k) {
                if(self._recursiveSearchForDataChanges(idx, v[k], rv[k], depth + 1) === true) {
                    foundChanges = true;
                    return false; // break
                }
            });
        } else {
            //console.error("NOT tracked/changed: ", k, v);
        }
        return foundChanges;
    },
    _recursiveSearchForDataChanges: function(idx, map, referenceMap, depth) {
        var self = this;
        depth = depth || 0;

        if(!this.isMounted() || this._pendingForceUpdate === true) {
            return;
        }

        if(!this._wasRendered) {
            if(window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);

            this._wasRendered = true;
            return true; // first time render, always render the first time
        }
        // quick lookup
        if(
            (map && !referenceMap) ||
            (!map && referenceMap) ||
            (map && referenceMap && !shallowEqual(map, referenceMap))
        ) {
            return true;
        }  else if(
            map.children && referenceMap.children && !shallowEqual(map.children.length, referenceMap.children.length)
        ) {
            return true;
        }

        var mapKeys = map._dataChangeIndex ? map.keys() : Object.keys(map);

        var foundChanges = false;
        mapKeys.forEach(function(k) {
            foundChanges = self._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth);

            if(foundChanges === true) {
                return false; // break
            }
        });
        return foundChanges;
    },
    shouldComponentUpdate: function(nextProps, nextState) {
        var shouldRerender = false;
        if(!this.isMounted() || this._pendingForceUpdate === true) {
            return false;
        }

        if(this.props !== null) {
            shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
        }
        if(shouldRerender === false && this.state !== null) {
            shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
        }

        if(this.getElementName() === "unknown") {
            debugger;
        }
        if(window.RENDER_DEBUG) console.error("shouldRerender?",
            shouldRerender,
            "rendered: ", this.getElementName(),
            "owner: ", this.getOwnerElement() ? this.getOwnerElement()._reactInternalInstance.getName() : "none",
            "props:", this.props,
            "state:", this.state
        );


        if(shouldRerender === true) { // (eventually) add listeners to newly added data structures
            if(this.props) {
                this._recurseAddListenersIfNeeded("p", this.props);
            }
            if(this.state) {
                this._recurseAddListenersIfNeeded("s", this.state);
            }
        }

        return shouldRerender;
    },
    onPropOrStateUpdated: function() {
        if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

        if(!this.isMounted() || this._pendingForceUpdate === true) {
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
    //requiresLazyRendering: function() {
    //    var domNode = this.findDOMNode();
    //    var wasInViewPort = this.inViewport;
    //
    //    if (domNode) {
    //        this.inViewport = elementInViewport2(domNode);
    //    }
    //    else {
    //        this.inViewport = false;
    //    }
    //
    //    if (wasInViewPort !== this.inViewport) {
    //        if (!this.inViewport) {
    //            $(domNode).css({'visibility': 'hidden'});
    //        }
    //        else {
    //            $(domNode).css({'visibility': 'visible'});
    //        }
    //    }
    //},
    getOwnerElement: function() {
        var owner = this._reactInternalInstance._currentElement._owner;
        if(owner) {
            return this._reactInternalInstance._currentElement._owner._instance;
        } else {
            return null;
        }
    }
};


var RenderDebugger = {
    componentDidUpdate: function() {
        if(window.RENDER_DEBUG) {
            var self = this;
            var getElementName = function() {
                if(!self.constructor) {
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
