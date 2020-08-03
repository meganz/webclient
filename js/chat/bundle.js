/** @file automatically generated, do not edit it. */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 20);
/******/ })
/************************************************************************/
/******/ ([

/***/ (function(module, exports) {

module.exports = React;

/***/ }),

/***/ (function(module, exports) {

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

module.exports = _inheritsLoose;

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "timing", function() { return timing; });
__webpack_require__.d(__webpack_exports__, "logcall", function() { return logcall; });
__webpack_require__.d(__webpack_exports__, "schedule", function() { return schedule; });
__webpack_require__.d(__webpack_exports__, "SoonFcWrap", function() { return SoonFcWrap; });
__webpack_require__.d(__webpack_exports__, "trycatcher", function() { return trycatcher; });
__webpack_require__.d(__webpack_exports__, "MegaRenderMixin", function() { return MegaRenderMixin; });
__webpack_require__.d(__webpack_exports__, "ContactAwareComponent", function() { return ContactAwareComponent; });
var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _applyDecoratedDescriptor2__ = __webpack_require__(9);
var _applyDecoratedDescriptor2 = __webpack_require__.n(_applyDecoratedDescriptor2__);
var react_dom3__ = __webpack_require__(7);
var react_dom3 = __webpack_require__.n(react_dom3__);
var react4__ = __webpack_require__(0);
var react4 = __webpack_require__.n(react4__);




var _dec, _dec2, _dec3, _dec4, _dec5, _class;



var INTERSECTION_OBSERVER_AVAILABLE = typeof IntersectionObserver !== 'undefined';

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  for (var key in objA) {
    if (key === "children") {
      continue;
    }

    if (objA.hasOwnProperty(key)) {
      if (!objB.hasOwnProperty(key)) {
        return false;
      } else if (objA[key] !== objB[key]) {
        if (typeof objA[key] === 'function' && typeof objB[key] === 'function') {
          if (objA[key].toString() !== objB[key].toString()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
  }

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

var _propertyTrackChangesVars = Object.create(null);

_propertyTrackChangesVars._listenersMap = Object.create(null);
_propertyTrackChangesVars._dataChangedHistory = Object.create(null);

if (window._propertyTrackChangesVars) {
  _propertyTrackChangesVars = window._propertyTrackChangesVars;
} else {
  window._propertyTrackChangesVars = _propertyTrackChangesVars;
}

window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;
var FUNCTIONS = ['render', 'shouldComponentUpdate', 'doProgramaticScroll', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'refreshUI', 'eventuallyInit', 'handleWindowResize', 'focusTypeArea', 'initScrolling', 'updateScroll', 'isActive', 'onMessagesScrollReinitialise', 'specShouldComponentUpdate', 'attachAnimationEvents', 'eventuallyReinitialise', 'reinitialise', 'reinitialised', 'getContentHeight', 'getScrollWidth', 'isAtBottom', 'onResize', 'isComponentEventuallyVisible', 'getCursorPosition', 'getTextareaMaxHeight'];
var localStorageProfileRenderFns = localStorage.profileRenderFns;

if (localStorageProfileRenderFns) {
  window.REACT_RENDER_CALLS = {};
}

var ID_CURRENT = 1;
var DEBUG_THIS = d > 1 ? d : false;

var scheduler = function scheduler(func, name, debug) {
  var dbug = debug !== false && DEBUG_THIS;
  var idnt = null;
  var task = null;
  var tbsp = Promise.resolve();

  var fire = function fire() {
    if (dbug) {
      console.warn('Dispatching scheduled task for %s.%s...', idnt, name);
    }

    if (task) {
      tbsp.then(task);
      task = null;
    }
  };

  var _scheduler = function _scheduler() {
    var _this = this;

    if (dbug) {
      if (!idnt) {
        idnt = name[0] === '(' && this.getReactId && this.getReactId() || this;
      }

      console.warn('Scheduling task from %s.%s...', idnt, name, [this], !!task);
    }

    if (!task) {
      tbsp.then(fire);
    }

    var idx = arguments.length;
    var args = new Array(idx);

    while (idx--) {
      args[idx] = arguments[idx];
    }

    task = function task() {
      func.apply(_this, args);
    };
  };

  if (DEBUG_THIS) {
    Object.defineProperty(_scheduler, smbl(name), {
      value: func
    });
  }

  return _scheduler;
};

var timing = function timing(min, max) {
  return function (target, key, de) {
    if (DEBUG_THIS > 2) {
      de[key] = de.value;

      _timing(de, min, max);

      de.value = de[key];
    }

    return de;
  };
};
var logcall = function logcall() {
  return function (target, key, descriptor) {
    if (DEBUG_THIS > 3) {
      var func = descriptor.value;

      descriptor.value = function () {
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
var schedule = function schedule(local, debug) {
  return function (target, property, descriptor) {
    if (local) {
      var func = descriptor.value;
      descriptor = {
        configurable: true,
        get: function _unusedScheduler() {
          Object.defineProperty(this, property, {
            value: scheduler(func, '(' + property + ')', debug)
          });
          return this[property];
        }
      };
    } else {
      descriptor.value = scheduler(descriptor.value, property, debug);
    }

    return descriptor;
  };
};
var SoonFcWrap = function SoonFcWrap(milliseconds, local) {
  return function (target, propertyKey, descriptor) {
    descriptor.value = SoonFc(descriptor.value, !local, milliseconds);
    return descriptor;
  };
};
var trycatcher = function trycatcher() {
  return function (t, p, d) {
    return (d.value = tryCatch(d.value)) && d;
  };
};
var MegaRenderMixin = (_dec = logcall(), _dec2 = SoonFcWrap(50, true), _dec3 = logcall(), _dec4 = SoonFcWrap(80, true), _dec5 = SoonFcWrap(350, true), (_class = function (_React$Component) {
  inherits(MegaRenderMixin, _React$Component);

  function MegaRenderMixin(props) {
    var _this2 = _React$Component.call(this, props) || this;

    lazy((_this2), '__internalReactID', function () {
      var key = '';
      var fib = DEBUG_THIS && this._reactInternalFiber;

      while (fib) {
        var tmp = fib.key;

        if (tmp && tmp[0] !== '.' && key.indexOf(tmp) < 0) {
          key += tmp + '/';
        }

        if (tmp = fib.memoizedProps) {
          if (tmp.contact) {
            tmp = tmp.contact.u + (tmp.chatRoom ? '@' + tmp.chatRoom.roomId : '');
          } else if (tmp.chatRoom) {
            tmp = tmp.chatRoom.roomId;
          } else {
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
    lazy((_this2), '__internalUniqueID', function () {
      return (this.__internalReactID + makeUUID().substr(-12)).replace(/[^a-zA-Z0-9]/g, '');
    });
    Object.defineProperty((_this2), 'isMounted', {
      value: function MegaRenderMixin_isMounted() {
        return !!this.__isMounted;
      }
    });

    if (DEBUG_THIS > 2) {
      Object.defineProperty((_this2), 'safeForceUpdate', {
        value: function MegaRenderMixin_safeForceUpdate_debug() {
          var _this3 = this;

          console.group('%s.safeForceUpdate: mounted:%s, visible:%s', this.getReactId(), this.__isMounted, this.isComponentEventuallyVisible());

          if (this.__isMounted) {
            this.forceUpdate(function () {
              console.warn('%s.safeForceUpdate finished.', _this3.getReactId());
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

      megaChat.__components.set((_this2), Object.getPrototypeOf((_this2)));
    }

    return _this2;
  }

  var _proto = MegaRenderMixin.prototype;

  _proto.componentWillUnmount = function componentWillUnmount() {
    if (_React$Component.prototype.componentWillUnmount) {
      _React$Component.prototype.componentWillUnmount.call(this);
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
  };

  _proto.getReactId = function getReactId() {
    return this.__internalReactID;
  };

  _proto.getUniqueId = function getUniqueId() {
    return this.__internalUniqueID;
  };

  _proto.debouncedForceUpdate = function debouncedForceUpdate() {
    this.eventuallyUpdate();
  };

  _proto.componentDidMount = function componentDidMount() {
    var _this4 = this;

    if (_React$Component.prototype.componentDidMount) {
      _React$Component.prototype.componentDidMount.call(this);
    }

    this.__isMounted = true;
    this._wasRendered = true;

    if (this.props.requiresUpdateOnResize || !this.props.skipQueuedUpdatesOnResize) {
      chatGlobalEventManager.addEventListener('resize', 'megaRenderMixing' + this.getUniqueId(), function () {
        return _this4.onResizeDoUpdate();
      });
    }

    chatGlobalEventManager.addEventListener('hashchange', 'hc' + this.getUniqueId(), function () {
      return _this4.onResizeDoUpdate();
    });

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
        setTimeout(function () {
          _this4.__intersectionObserverInstance = new IntersectionObserver(function (_ref) {
            var entry = _ref[0];

            if (entry.intersectionRatio < 0.2 && !entry.isIntersecting) {
              _this4.__intersectionVisibility = false;
            } else {
              _this4.__intersectionVisibility = true;

              if (_this4._requiresUpdateOnResize) {
                _this4.debouncedForceUpdate();
              }
            }
          }, {
            threshold: 0.1
          });

          _this4.__intersectionObserverInstance.observe(node);
        }, 150);
      }
    }

    if (this.attachRerenderCallbacks) {
      this.attachRerenderCallbacks();
    }
  };

  _proto.findDOMNode = function findDOMNode() {
    if (!this.domNode) {
      this.domNode = react_dom3.a.findDOMNode(this);
    }

    return this.domNode;
  };

  _proto.isComponentVisible = function isComponentVisible() {
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
    } else if (this.__intersectionVisibility === true) {
      return true;
    }

    var domNode = this.findDOMNode();

    if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
      return false;
    }

    if (!$(domNode).is(":visible")) {
      return false;
    }

    return verge.inViewport(domNode);
  };

  _proto.isComponentEventuallyVisible = function isComponentEventuallyVisible() {
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
  };

  _proto.eventuallyUpdate = function eventuallyUpdate() {
    if (!window.megaChat || megaChat.isLoggingOut || this._updatesDisabled || !this._wasRendered || !this.__isMounted) {
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
  };

  _proto.tempDisableUpdates = function tempDisableUpdates(forHowLong) {
    var self = this;
    self._updatesDisabled = true;

    if (self._updatesReenableTimer) {
      clearTimeout(self._updatesReenableTimer);
    }

    var timeout = forHowLong ? forHowLong : self.REENABLE_UPDATES_AFTER_TIMEOUT ? self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT;
    self._updatesReenableTimer = setTimeout(function () {
      self.tempEnableUpdates();
    }, timeout);
  };

  _proto.tempEnableUpdates = function tempEnableUpdates() {
    clearTimeout(this._updatesReenableTimer);
    this._updatesDisabled = false;
    this.eventuallyUpdate();
  };

  _proto.onResizeDoUpdate = function onResizeDoUpdate() {
    this.eventuallyUpdate();
  };

  _proto._getUniqueIDForMap = function _getUniqueIDForMap(map, payload) {
    return map + '.' + payload;
  };

  _proto._recurseAddListenersIfNeeded = function _recurseAddListenersIfNeeded(idx, map, depth) {
    var _this5 = this;

    depth |= 0;

    if (map instanceof MegaDataMap) {
      var cacheKey = this._getUniqueIDForMap(map, idx);

      var instanceId = this.getUniqueId();

      if (!_propertyTrackChangesVars._listenersMap[instanceId]) {
        _propertyTrackChangesVars._listenersMap[instanceId] = Object.create(null);
      }

      if (!_propertyTrackChangesVars._listenersMap[instanceId][cacheKey]) {
        _propertyTrackChangesVars._listenersMap[instanceId][cacheKey] = [map, map.addChangeListener(function () {
          return _this5.onPropOrStateUpdated();
        })];
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
  };

  _proto._checkDataStructForChanges = function _checkDataStructForChanges(idx, v, rv, depth) {
    if (!v && v === rv) {
      return false;
    }

    if (!rv && v) {
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
          console.error("changed: ", this.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
        }

        dataChangeHistory[instanceId][cacheKey] = v._dataChangeIndex;
        return true;
      }

      return false;
    }

    return depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && v && v.byteLength === undefined && typeof v === "object" && this._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true;
  };

  _proto._recursiveSearchForDataChanges = function _recursiveSearchForDataChanges(idx, map, referenceMap, depth) {
    var self = this;
    depth = depth || 0;

    if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
      return;
    }

    if (!this._wasRendered) {
      if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);
      this._wasRendered = true;
      return true;
    }

    if (idx === "p_children") {
      if (map.map && referenceMap.map) {
        var oldKeys = map.map(function (child) {
          return child ? child.key : child;
        });
        var newKeys = referenceMap.map(function (child) {
          return child ? child.key : child;
        });

        if (!shallowEqual(oldKeys, newKeys)) {
          return true;
        }
      } else if (!map && referenceMap || map && !referenceMap) {
        return true;
      } else if (map.$$typeof && referenceMap.$$typeof) {
        if (!shallowEqual(map.props, referenceMap.props) || !shallowEqual(map.state, referenceMap.state)) {
          return true;
        }
      }
    } else if (map && !referenceMap || !map && referenceMap || map && referenceMap && !shallowEqual(map, referenceMap)) {
      return true;
    }

    var mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);

    for (var i = mapKeys.length; i--;) {
      var k = mapKeys[i];

      if (this._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth)) {
        return true;
      }
    }

    return false;
  };

  _proto.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
    var shouldRerender = false;

    if (megaChat && megaChat.isLoggingOut) {
      return false;
    }

    if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F1", this.getElementName(), this.props, nextProps, this.state, nextState);
      }

      return false;
    }

    if (this.customIsEventuallyVisible) {
      if (!this._queueUpdateWhenVisible && !this.customIsEventuallyVisible()) {
        this._queueUpdateWhenVisible = true;

        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F1.1", this.getElementName(), this.props, nextProps, this.state, nextState);
        }
      } else if (this._queueUpdateWhenVisible && this.customIsEventuallyVisible()) {
        delete this._queueUpdateWhenVisible;
        return true;
      }
    }

    if (this.specShouldComponentUpdate) {
      var r = this.specShouldComponentUpdate(nextProps, nextState);

      if (r === false) {
        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState);
        }

        this._requiresUpdateOnResize = true;
        return false;
      } else if (r === true) {
        return true;
      }
    }

    if (!this.props.disableCheckingVisibility && !this.isComponentEventuallyVisible()) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "FVis", this.getElementName(), this.props, nextProps, this.state, nextState);
      }

      this._requiresUpdateOnResize = true;
      return false;
    }

    if (this.props !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
    }

    if (shouldRerender === false) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F3", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }

    if (shouldRerender === false && this.state !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
    }

    if (window.RENDER_DEBUG) {
      if (shouldRerender) {}

      console.error("shouldRerender?", shouldRerender, "rendered: ", this.getElementName(), "props:", this.props, "nextProps:", this.props, "state:", this.state);
    }

    if (shouldRerender === true) {
      if (this.props) {
        this._recurseAddListenersIfNeeded("p", this.props);
      }

      if (this.state) {
        this._recurseAddListenersIfNeeded("s", this.state);
      }
    } else {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }

    return shouldRerender;
  };

  _proto.onPropOrStateUpdated = function onPropOrStateUpdated() {
    this.eventuallyUpdate();
  };

  _proto.getElementName = function getElementName() {
    return this._reactInternalFiber.elementType.name;
  };

  _proto.safeForceUpdate = function safeForceUpdate() {
    if (this.__isMounted) {
      this.forceUpdate();
    }
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    if (window.RENDER_DEBUG) {
      var self = this;

      var getElementName = function getElementName() {
        if (!self.constructor) {
          return "unknown";
        }

        return self.constructor.name;
      };

      console.error("renderedX: ", getElementName(), "props:", this.props, "state:", this.state);
    }
  };

  _proto.componentWillReceiveProps = function componentWillReceiveProps() {
    if (localStorageProfileRenderFns) {
      var self = this;
      var componentName = self.constructor ? self.constructor.name : "unknown";

      if (!this._wrappedRender) {
        FUNCTIONS.forEach(function (fnName) {
          var _origFn = self[fnName];

          if (_origFn) {
            self[fnName] = function () {
              var start = performance.now();

              var res = _origFn.apply(this, arguments);

              REACT_RENDER_CALLS[componentName + "." + fnName] = REACT_RENDER_CALLS[componentName + "." + fnName] || 0;
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
  };

  _proto._internalDetachRenderCallbacks = function _internalDetachRenderCallbacks() {
    var items = this._dataStructListeners || false;

    for (var i = items.length; i--;) {
      var item = items[i];

      if (item[0] === 'dsprops') {
        console.assert(item[2].removeChangeListener(item[1]), 'listener not found..');
      }
    }
  };

  _proto.addDataStructListenerForProperties = function addDataStructListenerForProperties(obj, properties) {
    var _this6 = this;

    if (!(obj instanceof MegaDataMap)) {
      return;
    }

    if (!this._dataStructListeners) {
      this._dataStructListeners = [];
    }

    properties = array.to.object(properties);
    var id = obj.addChangeListener(function (obj, data, k) {
      return properties[k] && _this6.onPropOrStateUpdated();
    });

    this._dataStructListeners.push(['dsprops', id, obj]);
  };

  return MegaRenderMixin;
}(react4.a.Component), (_applyDecoratedDescriptor2()(_class.prototype, "componentWillUnmount", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "componentWillUnmount"), _class.prototype), _applyDecoratedDescriptor2()(_class.prototype, "debouncedForceUpdate", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "debouncedForceUpdate"), _class.prototype), _applyDecoratedDescriptor2()(_class.prototype, "componentDidMount", [_dec3], Object.getOwnPropertyDescriptor(_class.prototype, "componentDidMount"), _class.prototype), _applyDecoratedDescriptor2()(_class.prototype, "eventuallyUpdate", [_dec4], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyUpdate"), _class.prototype), _applyDecoratedDescriptor2()(_class.prototype, "onResizeDoUpdate", [_dec5], Object.getOwnPropertyDescriptor(_class.prototype, "onResizeDoUpdate"), _class.prototype)), _class));
var ContactAwareComponent = function (_MegaRenderMixin) {
  inherits(ContactAwareComponent, _MegaRenderMixin);

  function ContactAwareComponent(props) {
    var _this7 = _MegaRenderMixin.call(this, props) || this;

    _this7.loadContactInfo();

    return _this7;
  }

  var _proto2 = ContactAwareComponent.prototype;

  _proto2.loadContactInfo = function loadContactInfo() {
    var _this8 = this;

    var contact = this.props.contact;
    var contactHandle = contact && (contact.h || contact.u);

    if (!(contactHandle in M.u)) {
      return;
    }

    var syncName = !contact.firstName && !contact.lastName;
    var syncMail = !contact.m && !anonymouschat;
    var syncAvtr = !avatars[contactHandle] && !ContactAwareComponent.unavailableAvatars[contactHandle];

    var loader = function loader() {
      if (!_this8.isComponentEventuallyVisible()) {
        _this8.__isLoadingContactInfo = null;
        _this8._requiresUpdateOnResize = true;
        return;
      }

      var promises = [];
      var chatHandle = pchandle || _this8.props.chatRoom && _this8.props.chatRoom.publicChatHandle;

      if (syncName) {
        promises.push(M.syncUsersFullname(contactHandle, chatHandle, new MegaPromise()));
      }

      if (syncMail) {
        promises.push(M.syncContactEmail(contactHandle, new MegaPromise()));
      }

      if (syncAvtr) {
        promises.push(useravatar.loadAvatar(contactHandle, chatHandle).catch(function () {
          ContactAwareComponent.unavailableAvatars[contactHandle] = true;
        }));
      }

      MegaPromise.allDone(promises).always(function () {
        _this8.eventuallyUpdate();

        _this8.__isLoadingContactInfo = false;
      });
    };

    if (syncName || syncMail || syncAvtr) {
      this.__isLoadingContactInfo = setTimeout(loader, 300);
    }
  };

  _proto2.componentDidUpdate = function componentDidUpdate() {
    _MegaRenderMixin.prototype.componentDidUpdate.call(this);

    if (this.__isLoadingContactInfo === null) {
      this.loadContactInfo();
    }
  };

  _proto2.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    if (this.__isLoadingContactInfo) {
      clearTimeout(this.__isLoadingContactInfo);
    }
  };

  _proto2.isLoadingContactInfo = function isLoadingContactInfo() {
    return !!this.__isLoadingContactInfo;
  };

  return ContactAwareComponent;
}(MegaRenderMixin);
ContactAwareComponent.unavailableAvatars = Object.create(null);

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "Dropdown", function() { return Dropdown; });
__webpack_require__.d(__webpack_exports__, "DropdownContactsSelector", function() { return DropdownContactsSelector; });
__webpack_require__.d(__webpack_exports__, "DropdownItem", function() { return DropdownItem; });
var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _utils_jsx2__ = __webpack_require__(6);
var _stores_mixins_js3__ = __webpack_require__(2);
var _chat_ui_contacts_jsx4__ = __webpack_require__(5);



var React = __webpack_require__(0);




var Dropdown = function (_MegaRenderMixin) {
  inherits(Dropdown, _MegaRenderMixin);

  function Dropdown(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.onActiveChange = _this.onActiveChange.bind((_this));
    _this.onResized = _this.onResized.bind((_this));
    return _this;
  }

  var _proto = Dropdown.prototype;

  _proto.componentWillUpdate = function componentWillUpdate(nextProps) {
    if (this.props.active != nextProps.active) {
      this.onActiveChange(nextProps.active);
    }
  };

  _proto.specShouldComponentUpdate = function specShouldComponentUpdate(nextProps, nextState) {
    if (this.props.active != nextProps.active) {
      if (this.props.onBeforeActiveChange) {
        this.props.onBeforeActiveChange(nextProps.active);
      }

      return true;
    } else if (this.props.focused != nextProps.focused) {
        return true;
      } else if (this.state && this.state.active != nextState.active) {
          return true;
        }

    return undefined;
  };

  _proto.onActiveChange = function onActiveChange(newVal) {
    if (this.props.onActiveChange) {
      this.props.onActiveChange(newVal);
    }
  };

  _proto.reposElementUsing = function reposElementUsing(element, obj, info) {
    var $element;

    if (this.popupElement) {
      $element = $(this.popupElement);
    } else {
      return;
    }

    var self = this;
    var vertOffset = 0;
    var horizOffset = 0;

    if (!self.props.noArrow) {
      var $arrow = $('.dropdown-white-arrow', $element);
      var arrowHeight;

      if (self.props.arrowHeight) {
        arrowHeight = self.props.arrowHeight;

        if (info.vertical === "top") {
          arrowHeight = 0;
        } else {
          arrowHeight *= -1;
        }
      } else {
        arrowHeight = $arrow.outerHeight();
      }

      if (info.vertical === "top") {
        $(element).removeClass("down-arrow").addClass("up-arrow");
      } else {
        $(element).removeClass("up-arrow").addClass("down-arrow");
      }

      vertOffset += info.vertical === "top" ? arrowHeight : 0;
    }

    if (self.props.vertOffset) {
      vertOffset += self.props.vertOffset * (info.vertical === "top" ? 1 : -1);
    }

    if (self.props.horizOffset) {
      horizOffset += self.props.horizOffset;
    }

    $(element).css({
      left: obj.left + 0 + horizOffset + 'px',
      top: obj.top + vertOffset + 'px'
    });
  };

  _proto.onResized = function onResized() {
    var self = this;

    if (this.props.active === true && this.popupElement) {
      var $element = $(this.popupElement);
      var $positionToElement = $('.button.active:visible');

      if ($positionToElement.length === 0) {
        return;
      }

      var $container = $positionToElement.closest('.messages.scroll-area');

      if ($container.length === 0) {
        $container = $(document.body);
      }

      $element.css('margin-left', '');
      $element.position({
        of: $positionToElement,
        my: self.props.positionMy ? self.props.positionMy : "center top",
        at: self.props.positionAt ? self.props.positionAt : "center bottom",
        collision: "flipfit",
        within: $container,
        using: function using(obj, info) {
          self.reposElementUsing(this, obj, info);
        }
      });
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    chatGlobalEventManager.addEventListener('resize', 'drpdwn' + this.getUniqueId(), this.onResized.bind(this));
    this.onResized();
    var self = this;
    $(document.body).rebind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId(), function (e, target) {
      if (self.props.active && target !== self) {
        if (self.props && self.props.closeDropdown) {
          self.props.closeDropdown();
        }
      }
    });
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    this.onResized();
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    $(document.body).unbind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId());

    if (this.props.active) {
      this.onActiveChange(false);
    }

    chatGlobalEventManager.removeEventListener('resize', 'drpdwn' + this.getUniqueId());
  };

  _proto.doRerender = function doRerender() {
    var self = this;
    setTimeout(function () {
      self.safeForceUpdate();
    }, 100);
    setTimeout(function () {
      self.onResized();
    }, 200);
  };

  _proto.renderChildren = function renderChildren() {
    var self = this;
    return React.Children.map(this.props.children, function (child) {
      if (child) {
        var activeVal = self.props.active || self.state.active;
        activeVal = String(activeVal);
        return React.cloneElement(child, {
          active: activeVal
        });
      }

      return null;
    });
  };

  _proto.render = function render() {
    if (this.props.active !== true) {
      return null;
    }

    var classes = "dropdown body " + (this.props.noArrow ? "" : "dropdown-arrow up-arrow") + " " + this.props.className;
    var styles;

    if (this.popupElement) {
      styles = {
        'zIndex': 123,
        'position': 'absolute',
        'width': this.props.styles ? this.props.styles.width : undefined
      };
    }

    var self = this;
    var child = null;

    if (this.props.children) {
      child = React.createElement("div", null, self.renderChildren());
    } else if (this.props.dropdownItemGenerator) {
      child = this.props.dropdownItemGenerator(this);
    }

    if (!child && !this.props.forceShowWhenEmpty) {
      if (this.props.active !== false) {
        (window.setImmediate || window.setTimeout)(function () {
          self.onActiveChange(false);
        });
      }

      return null;
    }

    return React.createElement(_utils_jsx2__["default"].RenderTo, {
      element: document.body,
      className: classes,
      style: styles,
      popupDidMount: function popupDidMount(popupElement) {
        self.popupElement = popupElement;
        self.onResized();
      },
      popupWillUnmount: function popupWillUnmount() {
        delete self.popupElement;
      }
    }, React.createElement("div", {
      onClick: function onClick() {
        $(document.body).trigger('closeAllDropdownsExcept', self);
      }
    }, this.props.noArrow ? null : React.createElement("i", {
      className: "dropdown-white-arrow"
    }), child));
  };

  return Dropdown;
}(_stores_mixins_js3__["MegaRenderMixin"]);
Dropdown.defaultProps = {
  'requiresUpdateOnResize': true
};
var DropdownContactsSelector = function (_MegaRenderMixin2) {
  inherits(DropdownContactsSelector, _MegaRenderMixin2);

  function DropdownContactsSelector(props) {
    var _this2 = _MegaRenderMixin2.call(this, props) || this;

    _this2.state = {
      'selected': _this2.props.selected ? _this2.props.selected : []
    };
    _this2.onSelectClicked = _this2.onSelectClicked.bind((_this2));
    _this2.onSelected = _this2.onSelected.bind((_this2));
    return _this2;
  }

  var _proto2 = DropdownContactsSelector.prototype;

  _proto2.specShouldComponentUpdate = function specShouldComponentUpdate(nextProps, nextState) {
    if (this.props.active != nextProps.active) {
      return true;
    } else if (this.props.focused != nextProps.focused) {
        return true;
      } else if (this.state && this.state.active != nextState.active) {
          return true;
        } else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
            return true;
          } else {
            return undefined;
          }
  };

  _proto2.onSelected = function onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }

    this.forceUpdate();
  };

  _proto2.onSelectClicked = function onSelectClicked() {
    this.props.onSelectClicked();
  };

  _proto2.render = function render() {
    var self = this;
    return React.createElement(Dropdown, {
      className: "popup contacts-search " + this.props.className + " tooltip-blur",
      active: this.props.active,
      closeDropdown: this.props.closeDropdown,
      ref: function ref(r) {
        self.dropdownRef = r;
      },
      positionMy: this.props.positionMy,
      positionAt: this.props.positionAt,
      arrowHeight: this.props.arrowHeight,
      vertOffset: this.props.vertOffset
    }, React.createElement(_chat_ui_contacts_jsx4__["ContactPickerWidget"], {
      active: this.props.active,
      className: "popup contacts-search tooltip-blur small-footer",
      contacts: M.u,
      selectFooter: this.props.selectFooter,
      megaChat: this.props.megaChat,
      exclude: this.props.exclude,
      allowEmpty: this.props.allowEmpty,
      multiple: this.props.multiple,
      showTopButtons: this.props.showTopButtons,
      onSelectDone: this.props.onSelectDone,
      multipleSelectedButtonLabel: this.props.multipleSelectedButtonLabel,
      singleSelectedButtonLabel: this.props.singleSelectedButtonLabel,
      nothingSelectedButtonLabel: this.props.nothingSelectedButtonLabel
    }));
  };

  return DropdownContactsSelector;
}(_stores_mixins_js3__["MegaRenderMixin"]);
DropdownContactsSelector.defaultProps = {
  requiresUpdateOnResize: true
};
var DropdownItem = function (_MegaRenderMixin3) {
  inherits(DropdownItem, _MegaRenderMixin3);

  function DropdownItem(props) {
    var _this3 = _MegaRenderMixin3.call(this, props) || this;

    _this3.state = {
      'isClicked': false
    };
    _this3.onClick = _this3.onClick.bind((_this3));
    _this3.onMouseOver = _this3.onMouseOver.bind((_this3));
    return _this3;
  }

  var _proto3 = DropdownItem.prototype;

  _proto3.renderChildren = function renderChildren() {
    var self = this;
    return React.Children.map(this.props.children, function (child) {
      var props = {
        active: self.state.isClicked,
        closeDropdown: function closeDropdown() {
          self.setState({
            'isClicked': false
          });
        }
      };
      return React.cloneElement(child, props);
    });
  };

  _proto3.onClick = function onClick(e) {
    var self = this;

    if (this.props.children) {
      self.setState({
        'isClicked': !self.state.isClicked
      });
      e.stopPropagation();
      e.preventDefault();
    }
  };

  _proto3.onMouseOver = function onMouseOver(e) {
    if (this.props.className === "contains-submenu") {
      var $contextItem = $(e.target).closest(".contains-submenu");
      var $subMenu = $contextItem.next('.submenu');
      var contextTopPos = $contextItem.position().top;
      var contextleftPos = 0;
      $contextItem.addClass("opened");
      $subMenu.addClass("active");
      contextleftPos = $contextItem.offset().left + $contextItem.outerWidth() + $subMenu.outerWidth() + 10;

      if (contextleftPos > $(document.body).width()) {
        $subMenu.addClass("left-position");
      }

      $subMenu.css({
        "top": contextTopPos
      });
    } else if (!$(e.target).parent('.submenu').length) {
      var $dropdown = $(e.target).closest(".dropdown.body");
      $dropdown.find(".contains-submenu").removeClass("opened");
      $dropdown.find(".submenu").removeClass("active");
    }
  };

  _proto3.render = function render() {
    var self = this;
    var icon;

    if (self.props.icon) {
      icon = React.createElement("i", {
        className: "small-icon " + self.props.icon
      });
    }

    var label;

    if (self.props.label) {
      label = self.props.label;
    }

    var child = null;
    child = React.createElement("div", null, self.renderChildren());
    return React.createElement("div", {
      className: "dropdown-item " + (self.props.className ? self.props.className : ''),
      onClick: self.props.onClick ? function (e) {
        $(document).trigger('closeDropdowns');

        if (!self.props.disabled) {
          self.props.onClick(e);
        }
      } : self.onClick,
      onMouseOver: self.onMouseOver
    }, icon, React.createElement("span", null, label), child);
  };

  return DropdownItem;
}(_stores_mixins_js3__["MegaRenderMixin"]);
DropdownItem.defaultProps = {
  requiresUpdateOnResize: true
};

/***/ }),

/***/ (function(module, exports) {

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

module.exports = _assertThisInitialized;

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "ContactsListItem", function() { return ContactsListItem; });
__webpack_require__.d(__webpack_exports__, "ContactButton", function() { return ContactButton; });
__webpack_require__.d(__webpack_exports__, "ContactVerified", function() { return ContactVerified; });
__webpack_require__.d(__webpack_exports__, "ContactPresence", function() { return ContactPresence; });
__webpack_require__.d(__webpack_exports__, "LastActivity", function() { return LastActivity; });
__webpack_require__.d(__webpack_exports__, "ContactAwareName", function() { return ContactAwareName; });
__webpack_require__.d(__webpack_exports__, "MembersAmount", function() { return MembersAmount; });
__webpack_require__.d(__webpack_exports__, "ContactFingerprint", function() { return ContactFingerprint; });
__webpack_require__.d(__webpack_exports__, "Avatar", function() { return Avatar; });
__webpack_require__.d(__webpack_exports__, "ContactCard", function() { return ContactCard; });
__webpack_require__.d(__webpack_exports__, "ContactItem", function() { return ContactItem; });
__webpack_require__.d(__webpack_exports__, "ContactPickerWidget", function() { return ContactPickerWidget; });
var _extends0__ = __webpack_require__(12);
var _extends0 = __webpack_require__.n(_extends0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var react2__ = __webpack_require__(0);
var react2 = __webpack_require__.n(react2__);

var _stores_mixins_js4__ = __webpack_require__(2);
var _ui_utils_jsx5__ = __webpack_require__(6);
var _ui_perfectScrollbar_jsx6__ = __webpack_require__(13);
var _ui_buttons_jsx7__ = __webpack_require__(8);
var _ui_dropdowns_jsx8__ = __webpack_require__(3);










var EMPTY_ARR = [];

var _attchRerenderCbContacts = function _attchRerenderCbContacts(others) {
  this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'm', 'avatar'].concat(others ? others : EMPTY_ARR));
};

var ContactsListItem = function (_ContactAwareComponen) {
  inherits(ContactsListItem, _ContactAwareComponen);

  function ContactsListItem() {
    var _this;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _ContactAwareComponen.call.apply(_ContactAwareComponen, [this].concat(args)) || this;
    _this.attachRerenderCallback = _attchRerenderCbContacts;
    return _this;
  }

  var _proto = ContactsListItem.prototype;

  _proto.render = function render() {
    var classString = "nw-conversations-item";
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    classString += " " + megaChat.userPresenceToCssClass(contact.presence);
    return react2.a.createElement("div", null, react2.a.createElement("div", {
      className: classString,
      onClick: this.props.onContactClicked.bind(this)
    }, react2.a.createElement("div", {
      className: "nw-contact-status"
    }), react2.a.createElement("div", {
      className: "nw-conversations-unread"
    }, "0"), react2.a.createElement("div", {
      className: "nw-conversations-name"
    }, M.getNameByHandle(contact.u))));
  };

  return ContactsListItem;
}(_stores_mixins_js4__["ContactAwareComponent"]);
ContactsListItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactButton = function (_ContactAwareComponen2) {
  inherits(ContactButton, _ContactAwareComponen2);

  function ContactButton() {
    var _this2;

    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    _this2 = _ContactAwareComponen2.call.apply(_ContactAwareComponen2, [this].concat(args)) || this;
    _this2.attachRerenderCallbacks = _attchRerenderCbContacts;
    return _this2;
  }

  var _proto2 = ContactButton.prototype;

  _proto2.customIsEventuallyVisible = function customIsEventuallyVisible() {
    if (this.props.chatRoom) {
      return this.props.chatRoom.isCurrentlyActive;
    }

    return -1;
  };

  _proto2.dropdownItemGenerator = function dropdownItemGenerator() {
    var self = this;
    var contact = self.props.contact;
    var dropdowns = self.props.dropdowns ? self.props.dropdowns : [];
    var moreDropdowns = [];
    var username = M.getNameByHandle(contact.u);

    var onContactClicked = function onContactClicked() {
      if (contact.c === 2) {
        loadSubPage('fm/account');
      }

      if (contact.c === 1) {
        loadSubPage('fm/' + contact.u);
      }
    };

    moreDropdowns.push(react2.a.createElement("div", {
      className: "dropdown-avatar rounded",
      key: "mainContactInfo"
    }, react2.a.createElement(Avatar, {
      className: "avatar-wrapper context-avatar",
      chatRoom: this.props.chatRoom,
      contact: contact,
      hideVerifiedBadge: "true",
      onClick: onContactClicked
    }), react2.a.createElement("div", {
      className: "dropdown-user-name",
      onClick: onContactClicked
    }, react2.a.createElement("div", {
      className: "name"
    }, username, react2.a.createElement(ContactPresence, {
      className: "small",
      contact: contact
    })), react2.a.createElement("span", {
      className: "email"
    }, contact.m))));
    moreDropdowns.push(react2.a.createElement(ContactFingerprint, {
      key: "fingerprint",
      contact: contact
    }));

    if (dropdowns.length && contact.c !== 2) {
      moreDropdowns.push(dropdowns);
      moreDropdowns.push(react2.a.createElement("hr", {
        key: "top-separator"
      }));
    }

    if (contact.c === 2 && contact.u === u_handle) {
      moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
        key: "view0",
        icon: "human-profile",
        label: __(l[187]),
        onClick: function onClick() {
          loadSubPage('fm/account');
        }
      }));
    }

    if (contact.c === 1) {
      var startAudioCall = function startAudioCall() {
        megaChat.createAndShowPrivateRoom(contact.u).then(function (room) {
          room.setActive();
          room.startAudioCall();
        });
      };

      if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
        moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
          key: "startCall",
          className: "contains-submenu",
          icon: "context handset",
          label: __(l[19125]),
          onClick: startAudioCall
        }));
        moreDropdowns.push(react2.a.createElement("div", {
          className: "dropdown body submenu",
          key: "dropdownGroup"
        }, react2.a.createElement("div", null, react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
          key: "startAudio",
          icon: "context handset",
          label: __(l[1565]),
          onClick: startAudioCall
        })), react2.a.createElement("div", null, react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
          key: "startVideo",
          icon: "context videocam",
          label: __(l[1566]),
          onClick: function onClick() {
            megaChat.createAndShowPrivateRoom(contact.u).then(function (room) {
              room.setActive();
              room.startVideoCall();
            });
          }
        }))));
      } else {
        moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
          key: "startChat",
          icon: "context conversation",
          label: __(l[5885]),
          onClick: function onClick() {
            loadSubPage('fm/chat/p/' + contact.u);
          }
        }));
      }

      moreDropdowns.push(react2.a.createElement("hr", {
        key: "files-separator"
      }));
      moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
        key: "send-files-item",
        icon: "context arrow-in-circle",
        label: __(l[6834]),
        onClick: function onClick() {
          megaChat.openChatAndSendFilesDialog(contact.u);
        }
      }));
      moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
        key: "share-item",
        icon: "context share-folder",
        label: __(l[6775]),
        onClick: function onClick() {
          openCopyShareDialog(contact.u);
        }
      }));
    } else if (!contact.c || contact.c === 2 && contact.u !== u_handle) {
      moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
        key: "view2",
        icon: "small-icon icons-sprite grey-plus",
        label: __(l[101]),
        onClick: function onClick() {
          loadingDialog.show();
          var isAnonymousUser = !u_handle || u_type !== 3;

          if (anonymouschat && isAnonymousUser) {
            megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);

            if (localStorage.getItem("addContact") === null) {
              localStorage.setItem("addContact", JSON.stringify({
                u: contact.u,
                unixTime: unixtime()
              }));
            }
          } else {
            M.syncContactEmail(contact.u, new MegaPromise()).done(function (email) {
              var exists = false;
              var opcKeys = Object.keys(M.opc);

              for (var i = 0; i < opcKeys.length; i++) {
                if (!exists && M.opc[opcKeys[i]].m === email) {
                  exists = true;
                  break;
                }
              }

              if (exists) {
                closeDialog();
                msgDialog('warningb', '', l[17545]);
              } else {
                M.inviteContact(M.u[u_handle].m, email);
                var title = l[150];
                var msg = l[5898].replace('[X]', email);
                closeDialog();
                msgDialog('info', title, msg);
              }
            }).always(function () {
              loadingDialog.hide();
            });
          }
        }
      }));
    }

    if (u_attr && contact.u !== u_handle) {
      moreDropdowns.push(react2.a.createElement("hr", {
        key: "nicknames-separator"
      }));
      moreDropdowns.push(react2.a.createElement(_ui_dropdowns_jsx8__["DropdownItem"], {
        key: "set-nickname",
        icon: "small-icon context writing-pen",
        label: __(l[20828]),
        onClick: function onClick() {
          nicknames.setNicknameDialog.init(contact.u);
        }
      }));
    }

    if (self.props.dropdownRemoveButton && self.props.dropdownRemoveButton.length) {
      moreDropdowns.push(react2.a.createElement("hr", {
        key: "remove-separator"
      }));
      moreDropdowns.push(self.props.dropdownRemoveButton);
    }

    return moreDropdowns;
  };

  _proto2.render = function render() {
    var self = this;
    var label = self.props.label ? self.props.label : "";
    var classes = self.props.className ? self.props.className : "";
    var contact = self.props.contact;
    var icon = self.props.dropdownIconClasses ? self.props.dropdownIconClasses : [];
    var dropdownPosition = "left top";
    var vertOffset = 0;
    var horizOffset = -30;

    if (!contact) {
      return null;
    }

    if (label) {
      classes = "user-card-name " + classes;
      icon = "";
      dropdownPosition = "left bottom";
      vertOffset = 25;
      horizOffset = 0;
    }

    if (!contact.name && !contact.m && !self.props.noLoading && this.isLoadingContactInfo()) {
      label = react2.a.createElement("em", {
        className: "contact-name-loading"
      });
    }

    var buttonComponent = null;

    if (!self.props.noContextMenu) {
      buttonComponent = react2.a.createElement(_ui_buttons_jsx7__["Button"], {
        className: classes,
        icon: icon,
        disabled: self.props.dropdownDisabled,
        label: label
      }, react2.a.createElement(_ui_dropdowns_jsx8__["Dropdown"], {
        className: "contact-card-dropdown",
        positionMy: dropdownPosition,
        positionAt: dropdownPosition,
        vertOffset: vertOffset,
        horizOffset: horizOffset,
        dropdownItemGenerator: self.dropdownItemGenerator.bind(this),
        noArrow: true
      }));
    }

    return buttonComponent;
  };

  return ContactButton;
}(_stores_mixins_js4__["ContactAwareComponent"]);
ContactButton.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactVerified = function (_MegaRenderMixin) {
  inherits(ContactVerified, _MegaRenderMixin);

  function ContactVerified() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto3 = ContactVerified.prototype;

  _proto3.attachRerenderCallbacks = function attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  };

  _proto3.render = function render() {
    var _this3 = this;

    if (anonymouschat) {
      return null;
    }

    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    if (u_authring && u_authring.Ed25519) {
      var verifyState = u_authring.Ed25519[contact.u] || {};

      if (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        return react2.a.createElement("div", {
          className: "user-card-verified " + this.props.className
        });
      }
    } else if (!pubEd25519[contact.u]) {
      crypt.getPubEd25519(contact.u).then(function () {
        if (pubEd25519[contact.u]) {
          _this3.safeForceUpdate();
        }
      });
    }

    return null;
  };

  return ContactVerified;
}(_stores_mixins_js4__["MegaRenderMixin"]);
ContactVerified.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactPresence = function (_MegaRenderMixin2) {
  inherits(ContactPresence, _MegaRenderMixin2);

  function ContactPresence() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto4 = ContactPresence.prototype;

  _proto4.render = function render() {
    var contact = this.props.contact;
    var className = this.props.className || '';

    if (!contact || !contact.c) {
      return null;
    }

    var pres = megaChat.userPresenceToCssClass(contact.presence);
    return react2.a.createElement("div", {
      className: "user-card-presence " + pres + " " + className
    });
  };

  return ContactPresence;
}(_stores_mixins_js4__["MegaRenderMixin"]);
ContactPresence.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var LastActivity = function (_ContactAwareComponen3) {
  inherits(LastActivity, _ContactAwareComponen3);

  function LastActivity(props) {
    return _ContactAwareComponen3.call(this, props) || this;
  }

  var _proto5 = LastActivity.prototype;

  _proto5.render = function render() {
    var _this$props = this.props,
        contact = _this$props.contact,
        showLastGreen = _this$props.showLastGreen;

    if (!contact) {
      return null;
    }

    var lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
    var SECONDS = new Date().getTime() / 1000 - lastActivity;
    var timeToLast = SECONDS > 3888000 ? l[20673] : time2last(lastActivity, true);
    var hasActivityStatus = showLastGreen && contact.presence <= 2 && lastActivity;
    return react2.a.createElement("span", null, hasActivityStatus ? (l[19994] || "Last seen %s").replace("%s", timeToLast) : M.onlineStatusClass(contact.presence)[0]);
  };

  return LastActivity;
}(_stores_mixins_js4__["ContactAwareComponent"]);
var ContactAwareName = function (_ContactAwareComponen4) {
  inherits(ContactAwareName, _ContactAwareComponen4);

  function ContactAwareName() {
    return _ContactAwareComponen4.apply(this, arguments) || this;
  }

  var _proto6 = ContactAwareName.prototype;

  _proto6.render = function render() {
    return this.props.contact ? react2.a.createElement("span", null, this.props.children) : null;
  };

  return ContactAwareName;
}(_stores_mixins_js4__["ContactAwareComponent"]);
var MembersAmount = function (_ContactAwareComponen5) {
  inherits(MembersAmount, _ContactAwareComponen5);

  function MembersAmount(props) {
    return _ContactAwareComponen5.call(this, props) || this;
  }

  var _proto7 = MembersAmount.prototype;

  _proto7.render = function render() {
    var room = this.props.room;
    return room ? react2.a.createElement("span", null, (l[20233] || "%s Members").replace("%s", Object.keys(room.members).length)) : null;
  };

  return MembersAmount;
}(_stores_mixins_js4__["ContactAwareComponent"]);
var ContactFingerprint = function (_MegaRenderMixin3) {
  inherits(ContactFingerprint, _MegaRenderMixin3);

  function ContactFingerprint() {
    return _MegaRenderMixin3.apply(this, arguments) || this;
  }

  var _proto8 = ContactFingerprint.prototype;

  _proto8.attachRerenderCallbacks = function attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  };

  _proto8.render = function render() {
    this;
    var contact = this.props.contact;

    if (!contact || !contact.u || anonymouschat) {
      return null;
    }

    var infoBlocks = [];
    userFingerprint(contact.u, function (fingerprints) {
      fingerprints.forEach(function (v, k) {
        infoBlocks.push(react2.a.createElement("span", {
          key: "fingerprint-" + k
        }, v));
      });
    });
    var verifyButton = null;

    if (contact.c === 1 && u_authring && u_authring.Ed25519) {
      var verifyState = u_authring.Ed25519[contact.u] || {};

      if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        verifyButton = react2.a.createElement(_ui_buttons_jsx7__["Button"], {
          className: "dropdown-verify active",
          label: __(l[7692]),
          icon: "grey-key",
          onClick: function onClick() {
            $(document).trigger('closeDropdowns');
            fingerprintDialog(contact.u);
          }
        });
      }
    }

    var fingerprintCode = null;

    if (infoBlocks.length > 0) {
      fingerprintCode = react2.a.createElement("div", {
        className: "dropdown-fingerprint"
      }, react2.a.createElement("div", {
        className: "contact-fingerprint-title"
      }, react2.a.createElement("span", null, __(l[6872])), react2.a.createElement(ContactVerified, {
        contact: contact
      })), react2.a.createElement("div", {
        className: "contact-fingerprint-txt"
      }, infoBlocks), verifyButton);
    }

    return fingerprintCode;
  };

  return ContactFingerprint;
}(_stores_mixins_js4__["MegaRenderMixin"]);
ContactFingerprint.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var Avatar = function (_ContactAwareComponen6) {
  inherits(Avatar, _ContactAwareComponen6);

  function Avatar() {
    var _this4;

    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    _this4 = _ContactAwareComponen6.call.apply(_ContactAwareComponen6, [this].concat(args)) || this;
    _this4.attachRerenderCallbacks = _attchRerenderCbContacts;
    return _this4;
  }

  var _proto9 = Avatar.prototype;

  _proto9.render = function render() {
    var self = this;
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    if (!contact.m && contact.email) {
      contact.m = contact.email;
    }

    var avatarMeta = useravatar.generateContactAvatarMeta(contact);
    var classes = (this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar') + ' ' + contact.u + ' in-chat';
    classes += " chat-avatar";
    var displayedAvatar;
    var verifiedElement = null;

    if (!this.props.hideVerifiedBadge && !anonymouschat) {
      verifiedElement = react2.a.createElement(ContactVerified, {
        contact: this.props.contact,
        className: this.props.verifiedClassName
      });
    }

    var extraProps = {};

    if (this.props.simpletip) {
      classes += " simpletip";
      extraProps['data-simpletip'] = this.props.simpletip;

      if (this.props.simpletipWrapper) {
        extraProps['data-simpletipwrapper'] = this.props.simpletipWrapper;
      }

      if (this.props.simpletipOffset) {
        extraProps['data-simpletipoffset'] = this.props.simpletipOffset;
      }

      if (this.props.simpletipPosition) {
        extraProps['data-simpletipposition'] = this.props.simpletipPosition;
      }
    }

    if (avatarMeta.type === "image") {
      displayedAvatar = react2.a.createElement("div", _extends0()({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? function (e) {
          $(document).trigger('closeDropdowns');
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, react2.a.createElement("img", {
        src: avatarMeta.avatar,
        style: this.props.imgStyles
      }));
    } else {
      classes += " color" + avatarMeta.avatar.colorIndex;
      var isLoading = self.isLoadingContactInfo();

      if (isLoading) {
        classes += " default-bg";
      }

      displayedAvatar = react2.a.createElement("div", _extends0()({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? function (e) {
          $(document).trigger('closeDropdowns');
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, react2.a.createElement("span", null, isLoading ? "" : avatarMeta.avatar.letters));
    }

    return displayedAvatar;
  };

  return Avatar;
}(_stores_mixins_js4__["ContactAwareComponent"]);
Avatar.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactCard = function (_ContactAwareComponen7) {
  inherits(ContactCard, _ContactAwareComponen7);

  function ContactCard() {
    return _ContactAwareComponen7.apply(this, arguments) || this;
  }

  var _proto10 = ContactCard.prototype;

  _proto10.attachRerenderCallbacks = function attachRerenderCallbacks() {
    _attchRerenderCbContacts.call(this, ['presence']);
  };

  _proto10.specShouldComponentUpdate = function specShouldComponentUpdate(nextProps, nextState) {
    var self = this;
    var foundKeys = Object.keys(self.props);

    if (foundKeys.indexOf('dropdowns') >= 0) {
      array.remove(foundKeys, 'dropdowns', true);
    }

    var shouldUpdate;

    if (foundKeys.length) {
      var k = foundKeys[0];
      shouldUpdate = shallowEqual(nextProps[k], self.props[k]);
    }

    if (!shouldUpdate) {
      shouldUpdate = shallowEqual(nextState, self.state);
    }

    if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {
      if (self.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
        var oldKeys = self.state.props.dropdowns.map(function (child) {
          return child.key;
        });
        var newKeys = nextProps.state.dropdowns.map(function (child) {
          return child.key;
        });

        if (!shallowEqual(oldKeys, newKeys)) {
          shouldUpdate = true;
        }
      }
    }

    return shouldUpdate;
  };

  _proto10.render = function render() {
    var self = this;
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    var pres = megaChat.userPresenceToCssClass(contact.presence);
    var username = (this.props.namePrefix ? this.props.namePrefix : "") + (M.getNameByHandle(contact.u) || contact.m);

    if (contact.u === u_handle) {
      username += " (" + escapeHTML(l[19285]).replace(':', '') + ")";
    }

    var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
    var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
    var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
    var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];
    var usernameBlock;

    if (!noContextMenu) {
      usernameBlock = react2.a.createElement(ContactButton, {
        key: "lnk",
        dropdowns: dropdowns,
        noContextMenu: noContextMenu,
        contact: contact,
        className: "light",
        label: username,
        chatRoom: this.props.chatRoom,
        dropdownRemoveButton: dropdownRemoveButton
      });
    } else {
      usernameBlock = react2.a.createElement("div", {
        className: "user-card-name light"
      }, username);
    }

    var userCard = null;
    var className = this.props.className || "";

    if (className.indexOf("short") >= 0) {
      userCard = react2.a.createElement("div", {
        className: "user-card-data"
      }, usernameBlock, react2.a.createElement("div", {
        className: "user-card-status"
      }, react2.a.createElement(ContactPresence, {
        contact: contact,
        className: this.props.presenceClassName
      }), this.props.isInCall ? react2.a.createElement("i", {
        className: "small-icon audio-call"
      }) : null, react2.a.createElement(LastActivity, {
        contact: contact,
        showLastGreen: this.props.showLastGreen
      })));
    } else {
      userCard = react2.a.createElement("div", {
        className: "user-card-data"
      }, usernameBlock, react2.a.createElement(ContactPresence, {
        contact: contact,
        className: this.props.presenceClassName
      }), this.props.isInCall ? react2.a.createElement("i", {
        className: "small-icon audio-call"
      }) : null, react2.a.createElement("div", {
        className: "user-card-email"
      }, contact.m));
    }

    var selectionTick = null;

    if (this.props.selectable) {
      selectionTick = react2.a.createElement("div", {
        className: "user-card-tick-wrap"
      }, react2.a.createElement("i", {
        className: "small-icon mid-green-tick"
      }));
    }

    return react2.a.createElement("div", {
      className: "contacts-info body " + (pres === "offline" ? "offline" : "") + (className ? " " + className : ""),
      onClick: function onClick(e) {
        if (self.props.onClick) {
          self.props.onClick(contact, e);
        }
      },
      onDoubleClick: function onDoubleClick(e) {
        if (self.props.onDoubleClick) {
          self.props.onDoubleClick(contact, e);
        }
      },
      style: self.props.style
    }, react2.a.createElement(Avatar, {
      contact: contact,
      className: "avatar-wrapper small-rounded-avatar",
      chatRoom: this.props.chatRoom
    }), anonymouschat || noContextButton ? null : react2.a.createElement(ContactButton, {
      key: "button",
      dropdowns: dropdowns,
      dropdownIconClasses: self.props.dropdownIconClasses ? self.props.dropdownIconClasses : "",
      disabled: self.props.dropdownDisabled,
      noContextMenu: noContextMenu,
      contact: contact,
      className: self.props.dropdownButtonClasses,
      dropdownRemoveButton: dropdownRemoveButton,
      noLoading: self.props.noLoading,
      chatRoom: self.props.chatRoom
    }), selectionTick, userCard);
  };

  return ContactCard;
}(_stores_mixins_js4__["ContactAwareComponent"]);
ContactCard.defaultProps = {
  'dropdownButtonClasses': "default-white-button tiny-button",
  'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
  'presenceClassName': '',
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactItem = function (_ContactAwareComponen8) {
  inherits(ContactItem, _ContactAwareComponen8);

  function ContactItem() {
    var _this5;

    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    _this5 = _ContactAwareComponen8.call.apply(_ContactAwareComponen8, [this].concat(args)) || this;
    _this5.attachRerenderCallbacks = _attchRerenderCbContacts;
    return _this5;
  }

  var _proto11 = ContactItem.prototype;

  _proto11.render = function render() {
    var self = this;
    var contact = this.props.contact;

    if (!contact) {
      return null;
    }

    var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);
    return react2.a.createElement("div", {
      className: "selected-contact-card short"
    }, react2.a.createElement("div", {
      className: "remove-contact-bttn",
      onClick: function onClick(e) {
        if (self.props.onClick) {
          self.props.onClick(contact, e);
        }
      }
    }, react2.a.createElement("i", {
      className: "tiny-icon small-cross"
    })), react2.a.createElement(Avatar, {
      contact: contact,
      className: "avatar-wrapper small-rounded-avatar",
      hideVerifiedBadge: true,
      chatRoom: this.props.chatRoom
    }), react2.a.createElement("div", {
      className: "user-card-data"
    }, react2.a.createElement(ContactButton, {
      contact: contact,
      className: "light",
      label: username,
      chatRoom: this.props.chatRoom
    })));
  };

  return ContactItem;
}(_stores_mixins_js4__["ContactAwareComponent"]);
ContactItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
var ContactPickerWidget = function (_MegaRenderMixin4) {
  inherits(ContactPickerWidget, _MegaRenderMixin4);

  function ContactPickerWidget(props) {
    var _this6 = _MegaRenderMixin4.call(this, props) || this;

    _this6.state = {
      'searchValue': '',
      'selected': _this6.props.selected || false
    };
    return _this6;
  }

  var _proto12 = ContactPickerWidget.prototype;

  _proto12.onSearchChange = function onSearchChange(e) {
    var self = this;
    self.setState({
      searchValue: e.target.value
    });
  };

  _proto12.componentDidMount = function componentDidMount() {
    _MegaRenderMixin4.prototype.componentDidMount.call(this);

    setContactLink();
  };

  _proto12.componentDidUpdate = function componentDidUpdate() {
    var self = this;

    if (self.scrollToLastSelected && self.psSelected) {
      self.scrollToLastSelected = false;
      self.psSelected.scrollToPercentX(100, false);
    }

    setContactLink();
  };

  _proto12.componentWillMount = function componentWillMount() {
    if (_MegaRenderMixin4.prototype.componentWillMount) {
      _MegaRenderMixin4.prototype.componentWillMount.call(this);
    }

    var self = this;

    if (self.props.multiple) {
      $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function (e) {
        var keyCode = e.which || e.keyCode;

        if (keyCode === 13) {
          if (self.state.selected) {
            e.preventDefault();
            e.stopPropagation();
            $(document).trigger('closeDropdowns');

            if (self.props.onSelectDone) {
              self.props.onSelectDone(self.state.selected);
            }
          }
        }
      });
    }

    self._frequents = megaChat.getFrequentContacts();

    self._frequents.always(function (r) {
      self._foundFrequents = clone(r).reverse().splice(0, 30);
      self.safeForceUpdate();
    });
  };

  _proto12.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin4.prototype.componentWillUnmount.call(this);

    var self = this;
    delete self._foundFrequents;
    delete self._frequents;

    if (self.props.multiple) {
      $(document.body).off('keypress.contactPicker' + self.getUniqueId());
    }
  };

  _proto12._eventuallyAddContact = function _eventuallyAddContact(v, contacts, selectableContacts, forced) {
    var self = this;

    if (!forced && (v.c !== 1 || v.u === u_handle)) {
      return false;
    }

    if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
      return false;
    }

    var isDisabled = false;

    if (!self.wasMissingKeysForContacts) {
      self.wasMissingKeysForContacts = {};
    }

    if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      self.wasMissingKeysForContacts[v.u] = true;

      ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u]).always(function () {
        if (self.isMounted()) {
          self.safeForceUpdate();
        }
      });

      isDisabled = true;
      return true;
    } else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      return false;
    }

    var pres = megaChat.getPresence(v.u);
    var avatarMeta = generateAvatarMeta(v.u);

    if (self.state.searchValue && self.state.searchValue.length > 0) {
      if (avatarMeta.fullName.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1 && v.m.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1) {
        return false;
      }
    }

    if (pres === "chat") {
      pres = "online";
    }

    var selectedClass = "";

    if (self.state.selected && self.state.selected.indexOf(v.u) !== -1) {
      selectedClass = "selected";
    }

    contacts.push(react2.a.createElement(ContactCard, {
      disabled: isDisabled,
      contact: v,
      chatRoom: false,
      className: "contacts-search short " + selectedClass + (isDisabled ? " disabled" : ""),
      noContextButton: "true",
      selectable: selectableContacts,
      onClick: self.props.readOnly ? function () {} : function (contact) {
        if (isDisabled) {
          return false;
        }

        var contactHash = contact.u;

        if (contactHash === self.lastClicked && new Date() - self.clickTime < 500 || !self.props.multiple) {
          if (self.props.onSelected) {
            self.props.onSelected([contactHash]);
          }

          self.props.onSelectDone([contactHash]);
          $(document).trigger('closeDropdowns');
          return;
        } else {
          var selected = clone(self.state.selected || []);

          if (selected.indexOf(contactHash) === -1) {
            selected.push(contactHash);
            self.scrollToLastSelected = true;

            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          } else {
            if (selected.indexOf(contactHash) >= 0) {
              array.remove(selected, contactHash);
            }

            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          }

          self.setState({
            'selected': selected
          });
          self.setState({
            'searchValue': ''
          });
          self.refs.contactSearchField.focus();
        }

        self.clickTime = new Date();
        self.lastClicked = contactHash;
      },
      noContextMenu: true,
      key: v.u
    }));
    return true;
  };

  _proto12.render = function render() {
    var self = this;
    var contacts = [];
    var frequentContacts = [];
    var extraClasses = "";
    var contactsSelected = [];
    var multipleContacts = null;
    var topButtons = null;
    var selectableContacts = false;
    var selectFooter = null;
    var selectedContacts = false;
    var isSearching = !!self.state.searchValue;

    var onAddContact = function onAddContact(e) {
      e.preventDefault();
      e.stopPropagation();
      contactAddDialog();
    };

    if (self.props.readOnly) {
      var sel = self.state.selected || [];

      for (var i = 0; i < sel.length; i++) {
        var v = sel[i];
        contactsSelected.push(react2.a.createElement(ContactItem, {
          contact: M.u[v],
          key: v,
          chatRoom: self.props.chatRoom
        }));
      }
    } else if (self.props.multiple) {
      selectableContacts = true;

      var onSelectDoneCb = function onSelectDoneCb(e) {
        e.preventDefault();
        e.stopPropagation();
        $(document).trigger('closeDropdowns');

        if (self.props.onSelectDone) {
          self.props.onSelectDone(self.state.selected);
        }
      };

      var onContactSelectDoneCb = function onContactSelectDoneCb(contact) {
        var contactHash = contact.u;

        if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {
          if (self.props.onSelected) {
            self.props.onSelected([contactHash]);
          }

          self.props.onSelectDone([contactHash]);
          return;
        } else {
          var selected = clone(self.state.selected || []);

          if (selected.indexOf(contactHash) === -1) {
            selected.push(contactHash);
            self.scrollToLastSelected = true;

            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          } else {
            if (selected.indexOf(contactHash) >= 0) {
              array.remove(selected, contactHash);
            }

            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          }

          self.setState({
            'selected': selected
          });
          self.setState({
            'searchValue': ''
          });
          self.refs.contactSearchField.focus();
        }

        self.clickTime = new Date();
        self.lastClicked = contactHash;
      };

      var selectedWidth = self.state.selected.length * 54;

      if (!self.state.selected || self.state.selected.length === 0) {
        selectedContacts = false;
        multipleContacts = react2.a.createElement("div", {
          className: "horizontal-contacts-list"
        }, react2.a.createElement("div", {
          className: "contacts-list-empty-txt"
        }, self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : l[8889]));
      } else {
        selectedContacts = true;
        onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
        var sel2 = self.state.selected || [];

        for (var i2 = 0; i2 < sel2.length; i2++) {
          var v2 = sel2[i2];
          contactsSelected.push(react2.a.createElement(ContactItem, {
            contact: M.u[v2],
            onClick: onContactSelectDoneCb,
            chatRoom: self.props.chatRoom || false,
            key: v2
          }));
        }

        multipleContacts = react2.a.createElement("div", {
          className: "horizontal-contacts-list"
        }, react2.a.createElement(_ui_perfectScrollbar_jsx6__["PerfectScrollbar"], {
          className: "perfectScrollbarContainer selected-contact-block horizontal-only",
          selected: this.state.selected,
          ref: function ref(psSelected) {
            self.psSelected = psSelected;
          }
        }, react2.a.createElement("div", {
          className: "select-contact-centre",
          style: {
            width: selectedWidth
          }
        }, contactsSelected)));
      }

      if (self.props.selectFooter) {
        selectFooter = react2.a.createElement("div", {
          className: "fm-dialog-footer"
        }, react2.a.createElement("a", {
          className: "default-white-button left",
          onClick: onAddContact.bind(self)
        }, l[71]), react2.a.createElement("a", {
          className: "default-grey-button right " + (!selectedContacts ? "disabled" : ""),
          onClick: function onClick(e) {
            if (self.state.selected.length > 0) {
              onSelectDoneCb(e);
            }
          }
        }, this.props.multipleSelectedButtonLabel ? this.props.multipleSelectedButtonLabel : l[8890]));
      }
    }

    if (self.props.showTopButtons) {
      var _topButtons = [];
      self.props.showTopButtons.forEach(function (button) {
        _topButtons.push(react2.a.createElement("div", {
          className: "link-button light",
          key: button.key,
          onClick: function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            $(document).trigger('closeDropdowns');
            button.onClick(e);
          }
        }, react2.a.createElement("i", {
          className: "small-icon " + button.icon
        }), react2.a.createElement("span", null, button.title)));
      });
      topButtons = react2.a.createElement("div", {
        className: "contacts-search-buttons"
      }, _topButtons);
    }

    var alreadyAdded = {};
    var hideFrequents = !self.props.readOnly && !self.state.searchValue && frequentContacts.length > 0;
    var frequentsLoading = false;

    if (self._frequents && !self._foundFrequents) {
      if (self._frequents.state() === 'pending') {
        hideFrequents = false;
        frequentsLoading = true;
      }
    } else if (!self.props.readOnly && self._foundFrequents) {
      var totalFound = 0;

      self._foundFrequents.forEach(function (v) {
        if (totalFound < 5 && M.u[v.userId]) {
          if (self._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
            alreadyAdded[v.userId] = 1;
            totalFound++;
          }
        }
      });
    }

    self.props.contacts.forEach(function (v) {
      alreadyAdded[v.h] || self._eventuallyAddContact(v, contacts, selectableContacts);
    });
    var sortFn = M.getSortByNameFn2(1);
    contacts.sort(function (a, b) {
      return sortFn(a.props.contact, b.props.contact);
    });

    if (Object.keys(alreadyAdded).length === 0) {
      hideFrequents = true;
    }

    var innerDivStyles = {};

    if (this.props.showMeAsSelected) {
      self._eventuallyAddContact(M.u[u_handle], contacts, selectableContacts, true);
    }

    var noOtherContacts = false;

    if (contacts.length === 0) {
      noOtherContacts = true;
      var noContactsMsg = "";

      if (M.u.length < 2) {
        noContactsMsg = l[8877];
      } else {
        noContactsMsg = l[8878];
      }

      if (hideFrequents) {
        contacts = react2.a.createElement("em", null, noContactsMsg);
      }
    }

    var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;
    var contactsList;

    if (haveContacts) {
      if (frequentContacts.length === 0 && noOtherContacts) {
        contactsList = react2.a.createElement("div", {
          className: "chat-contactspicker-no-contacts"
        }, react2.a.createElement("div", {
          className: "contacts-list-header"
        }, l[165]), react2.a.createElement("div", {
          className: "fm-empty-contacts-bg"
        }), react2.a.createElement("div", {
          className: "fm-empty-cloud-txt small"
        }, l[784]), react2.a.createElement("div", {
          className: "fm-empty-description small"
        }, l[19115]));
      } else {
        contactsList = react2.a.createElement(_ui_utils_jsx5__["default"].JScrollPane, {
          className: "contacts-search-scroll",
          selected: this.state.selected,
          changedHashProp: this.props.changedHashProp,
          searchValue: this.state.searchValue
        }, react2.a.createElement("div", null, react2.a.createElement("div", {
          className: "contacts-search-subsection",
          style: {
            'display': !hideFrequents ? "" : "none"
          }
        }, react2.a.createElement("div", {
          className: "contacts-list-header"
        }, l[20141]), frequentsLoading ? react2.a.createElement("div", {
          className: "loading-spinner"
        }, "...") : react2.a.createElement("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, frequentContacts)), contacts.length > 0 ? react2.a.createElement("div", {
          className: "contacts-search-subsection"
        }, react2.a.createElement("div", {
          className: "contacts-list-header"
        }, !frequentsLoading && frequentContacts.length === 0 ? !self.props.readOnly ? l[165] : l[16217] : l[165]), react2.a.createElement("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, contacts)) : undefined));
      }
    } else {
      contactsList = react2.a.createElement("div", {
        className: "chat-contactspicker-no-contacts"
      }, react2.a.createElement("div", {
        className: "contacts-list-header"
      }, l[165]), react2.a.createElement("div", {
        className: "fm-empty-contacts-bg"
      }), react2.a.createElement("div", {
        className: "fm-empty-cloud-txt small"
      }, l[784]), react2.a.createElement("div", {
        className: "fm-empty-description small"
      }, l[19115]), react2.a.createElement("div", {
        className: " big-red-button fm-empty-button",
        onClick: function onClick() {
          contactAddDialog();
        }
      }, l[101]), react2.a.createElement("div", {
        className: "empty-share-public"
      }, react2.a.createElement("i", {
        className: "small-icon icons-sprite grey-chain"
      }), react2.a.createElement("span", {
        dangerouslySetInnerHTML: {
          __html: l[19111]
        }
      })));
      extraClasses += " no-contacts";
    }

    var displayStyle = self.state.searchValue && self.state.searchValue.length > 0 ? "" : "none";
    return react2.a.createElement("div", {
      className: this.props.className + " " + extraClasses
    }, multipleContacts, !self.props.readOnly && haveContacts ? react2.a.createElement("div", {
      className: "contacts-search-header " + this.props.headerClasses
    }, react2.a.createElement("i", {
      className: "small-icon thin-search-icon"
    }), react2.a.createElement("input", {
      autoFocus: true,
      type: "search",
      placeholder: __(l[8010]),
      ref: "contactSearchField",
      onChange: this.onSearchChange.bind(this),
      value: this.state.searchValue
    }), react2.a.createElement("div", {
      onClick: function onClick() {
        self.setState({
          searchValue: ''
        });
        self.refs.contactSearchField.focus();
      },
      className: "search-result-clear",
      style: {
        display: displayStyle
      }
    })) : null, topButtons, contactsList, selectFooter);
  };

  return ContactPickerWidget;
}(_stores_mixins_js4__["MegaRenderMixin"]);
ContactPickerWidget.defaultProps = {
  multipleSelectedButtonLabel: false,
  singleSelectedButtonLabel: false,
  nothingSelectedButtonLabel: false,
  allowEmpty: false
};

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "EmojiFormattedContent", function() { return EmojiFormattedContent; });
var _inheritsLoose0__ = __webpack_require__(1);
var _inheritsLoose0 = __webpack_require__.n(_inheritsLoose0__);
var _stores_mixins_js1__ = __webpack_require__(2);


var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);



var JScrollPane = function (_MegaRenderMixin) {
  inherits(JScrollPane, _MegaRenderMixin);

  function JScrollPane() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = JScrollPane.prototype;

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    var self = this;
    var $elem = $(ReactDOM.findDOMNode(self));
    $elem.height('100%');
    $elem.find('.jspContainer').replaceWith(function () {
      var $children = $elem.find('.jspPane').children();

      if ($children.length === 0 || $children.length > 1) {
        console.error("JScrollPane on element: ", $elem, "encountered multiple (or zero) children nodes.", "Mean while, JScrollPane should always (!) have 1 children element.");
      }

      return $children;
    });
    var options = $.extend({}, {
      enableKeyboardNavigation: false,
      showArrows: true,
      arrowSize: 8,
      animateScroll: true,
      container: $('.jspContainer', $elem),
      pane: $('.jspPane', $elem)
    }, self.props.options);
    $elem.jScrollPane(options);

    if (self.props.onFirstInit) {
      self.props.onFirstInit($elem.data('jsp'), $elem);
    }

    $elem.rebind('jsp-will-scroll-y.jsp' + self.getUniqueId(), function (e) {
      if ($elem.attr('data-scroll-disabled') === "true") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
    $elem.rebind('jsp-user-scroll-y.jsp' + self.getUniqueId(), function (e, scrollPositionY, isAtTop, isAtBottom) {
      if (self.props.onUserScroll) {
        if ($(e.target).is($elem)) {
          self.props.onUserScroll($elem.data('jsp'), $elem, e, scrollPositionY, isAtTop, isAtBottom);
        }
      }
    });
    $elem.rebind('forceResize.jsp' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
      self.onResize(forced, scrollPositionYPerc, scrollToElement);
    });
    chatGlobalEventManager.addEventListener('resize', 'jsp' + self.getUniqueId(), self.onResize.bind(self));
    self.onResize();
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    var $elem = $(ReactDOM.findDOMNode(this));
    $elem.off('jsp-will-scroll-y.jsp' + this.getUniqueId());
    chatGlobalEventManager.removeEventListener('resize', 'jsp' + this.getUniqueId());
  };

  _proto.eventuallyReinitialise = function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    if (!self.isComponentVisible()) {
      return;
    }

    var $elem = $(ReactDOM.findDOMNode(self));
    var currHeights = [$('.jspPane', $elem).outerHeight(), $elem.outerHeight()];

    if (forced || self._lastHeights != currHeights) {
      self._lastHeights = currHeights;

      self._doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem);
    }
  };

  _proto._doReinit = function _doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem) {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    if (!self.isComponentVisible()) {
      return;
    }

    self._lastHeights = currHeights;
    var $jsp = $elem.data('jsp');

    if ($jsp) {
      $jsp.reinitialise();
      var manualReinitialiseControl = false;

      if (self.props.onReinitialise) {
        manualReinitialiseControl = self.props.onReinitialise($jsp, $elem, forced, scrollPositionYPerc, scrollToElement);
      }

      if (manualReinitialiseControl === false) {
        if (scrollPositionYPerc) {
          if (scrollPositionYPerc === -1) {
            $jsp.scrollToBottom();
          } else {
            $jsp.scrollToPercentY(scrollPositionYPerc, false);
          }
        } else if (scrollToElement) {
          $jsp.scrollToElement(scrollToElement);
        }
      }
    }
  };

  _proto.onResize = function onResize(forced, scrollPositionYPerc, scrollToElement) {
    if (forced && forced.originalEvent) {
      forced = true;
      scrollPositionYPerc = undefined;
    }

    this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    this.onResize();
  };

  _proto.render = function render() {
    return React.createElement("div", {
      className: this.props.className
    }, React.createElement("div", {
      className: "jspContainer"
    }, React.createElement("div", {
      className: "jspPane"
    }, this.props.children)));
  };

  return JScrollPane;
}(_stores_mixins_js1__["MegaRenderMixin"]);

JScrollPane.defaultProps = {
  className: "jScrollPaneContainer",
  requiresUpdateOnResize: true
};

var RenderTo = function (_React$Component) {
  inherits(RenderTo, _React$Component);

  function RenderTo() {
    return _React$Component.apply(this, arguments) || this;
  }

  var _proto2 = RenderTo.prototype;

  _proto2.componentDidMount = function componentDidMount() {
    if (_React$Component.prototype.componentDidMount) {
      _React$Component.prototype.componentDidMount.call(this);
    }

    this.popup = document.createElement("div");

    this._setClassNames();

    if (this.props.style) {
      $(this.popup).css(this.props.style);
    }

    this.props.element.appendChild(this.popup);
    var self = this;

    this._renderLayer(function () {
      if (self.props.popupDidMount) {
        self.props.popupDidMount(self.popup);
      }
    });
  };

  _proto2.componentDidUpdate = function componentDidUpdate() {
    this._setClassNames();

    this._renderLayer();
  };

  _proto2.componentWillUnmount = function componentWillUnmount() {
    if (_React$Component.prototype.componentWillUnmount) {
      _React$Component.prototype.componentWillUnmount.call(this);
    }

    ReactDOM.unmountComponentAtNode(this.popup);

    if (this.props.popupWillUnmount) {
      this.props.popupWillUnmount(this.popup);
    }

    this.props.element.removeChild(this.popup);
  };

  _proto2._setClassNames = function _setClassNames() {
    this.popup.className = this.props.className ? this.props.className : "";
  };

  _proto2._renderLayer = function _renderLayer(cb) {
    ReactDOM.render(this.props.children, this.popup, cb);
  };

  _proto2.render = function render() {
    return null;
  };

  return RenderTo;
}(React.Component);

var EmojiFormattedContent = function (_React$Component2) {
  inherits(EmojiFormattedContent, _React$Component2);

  function EmojiFormattedContent() {
    return _React$Component2.apply(this, arguments) || this;
  }

  var _proto3 = EmojiFormattedContent.prototype;

  _proto3._eventuallyUpdateInternalState = function _eventuallyUpdateInternalState(props) {
    if (!props) {
      props = this.props;
    }

    assert(typeof props.children === "string", "EmojiFormattedContent received a non-string (got: " + typeof props.children + ") as props.children");
    var str = props.children;

    if (this._content !== str) {
      this._content = str;
      this._formattedContent = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(str));
    }
  };

  _proto3.shouldComponentUpdate = function shouldComponentUpdate(nextProps) {
    if (!this._isMounted) {
      this._eventuallyUpdateInternalState();

      return true;
    }

    if (nextProps && nextProps.children !== this.props.children) {
      this._eventuallyUpdateInternalState(nextProps);

      return true;
    } else {
      return false;
    }
  };

  _proto3.render = function render() {
    this._eventuallyUpdateInternalState();

    return React.createElement("span", {
      dangerouslySetInnerHTML: {
        __html: this._formattedContent
      }
    });
  };

  return EmojiFormattedContent;
}(React.Component);
__webpack_exports__["default"] = ({
  JScrollPane: JScrollPane,
  RenderTo: RenderTo,
  EmojiFormattedContent: EmojiFormattedContent,
  schedule: _stores_mixins_js1__["schedule"],
  SoonFcWrap: _stores_mixins_js1__["SoonFcWrap"]
});

/***/ }),

/***/ (function(module, exports) {

module.exports = ReactDOM;

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "Button", function() { return Button; });
var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _stores_mixins_js2__ = __webpack_require__(2);



var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);

var utils = __webpack_require__(6);


var _buttonGroups = {};
var Button = function (_MegaRenderMixin) {
  inherits(Button, _MegaRenderMixin);

  function Button(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      'focused': false
    };
    _this.onClick = _this.onClick.bind((_this));
    _this.onBlur = _this.onBlur.bind((_this));
    return _this;
  }

  var _proto = Button.prototype;

  _proto.componentWillUpdate = function componentWillUpdate(nextProps, nextState) {
    var self = this;

    if (nextProps.disabled === true && nextState.focused === true) {
      nextState.focused = false;
    }

    if (this.state.focused != nextState.focused && nextState.focused === true) {
      $('.conversationsApp').rebind('mousedown.button' + self.getUniqueId(), this.onBlur);
      $(document).rebind('keyup.button' + self.getUniqueId(), function (e) {
        if (self.state.focused === true) {
          if (e.keyCode == 27) {
            self.onBlur();
          }
        }
      });

      if (self._pageChangeListener) {
        mBroadcaster.removeListener(self._pageChangeListener);
      }

      this._pageChangeListener = mBroadcaster.addListener('pagechange', function () {
        if (self.state.focused === true) {
          self.onBlur();
        }
      });
      $(document).rebind('closeDropdowns.' + self.getUniqueId(), function () {
        self.onBlur();
      });

      if (this.props.group) {
        if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] != this) {
          _buttonGroups[this.props.group].setState({
            focused: false
          });

          _buttonGroups[this.props.group].unbindEvents();
        }

        _buttonGroups[this.props.group] = this;
      }
    }

    if (this.props.group && nextState.focused === false && _buttonGroups[this.props.group] == this) {
      _buttonGroups[this.props.group] = null;
    }
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    this.unbindEvents();
  };

  _proto.renderChildren = function renderChildren() {
    var self = this;
    return React.Children.map(this.props.children, function (child) {
      return React.cloneElement(child, {
        active: self.state.focused,
        closeDropdown: function closeDropdown() {
          self.setState({
            'focused': false
          });
          self.unbindEvents();
        },
        onActiveChange: function onActiveChange(newVal) {
          var $element = $(self.findDOMNode());
          var $scrollables = $element.parents('.jScrollPaneContainer, .perfectScrollbarContainer');

          if ($scrollables.length > 0) {
            if (newVal === true) {
              $scrollables.attr('data-scroll-disabled', true);
              $scrollables.filter('.perfectScrollbarContainer').each(function (k, element) {
                Ps.disable(element);
              });
            } else {
              $scrollables.removeAttr('data-scroll-disabled');
              $scrollables.filter('.perfectScrollbarContainer').each(function (k, element) {
                Ps.enable(element);
              });
            }
          }

          if (child.props.onActiveChange) {
            child.props.onActiveChange.call(this, newVal);
          }
        }
      });
    }.bind(this));
  };

  _proto.onBlur = function onBlur(e) {
    if (!this.isMounted()) {
      return;
    }

    var $element = $(ReactDOM.findDOMNode(this));

    if (!e || !$(e.target).closest(".button").is($element)) {
      this.setState({
        focused: false
      });
      this.unbindEvents();
      this.forceUpdate();
    }
  };

  _proto.unbindEvents = function unbindEvents() {
    var self = this;
    $(document).off('keyup.button' + self.getUniqueId());
    $(document).off('closeDropdowns.' + self.getUniqueId());
    $('.conversationsApp').unbind('mousedown.button' + self.getUniqueId());

    if (self._pageChangeListener) {
      mBroadcaster.removeListener(self._pageChangeListener);
    }
  };

  _proto.onClick = function onClick(e) {
    var $element = $(ReactDOM.findDOMNode(this));

    if (this.props.disabled === true) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if ($(e.target).closest(".popup").closest('.button').is($element) && this.state.focused === true) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if ($(e.target).is("input,textarea,select")) {
      return;
    }

    if (this.state.focused === false) {
      if (this.props.onClick) {
        this.props.onClick(this);
      } else if (React.Children.count(this.props.children) > 0) {
        this.setState({
          'focused': true
        });
      }
    } else if (this.state.focused === true) {
      this.setState({
        focused: false
      });
      this.unbindEvents();
    }
  };

  _proto.render = function render() {
    var classes = this.props.className ? "button " + this.props.className : "button";

    if (this.props.disabled == true || this.props.disabled == "true") {
      classes += " disabled";
    } else if (this.state.focused) {
      classes += " active";
    }

    var label;

    if (this.props.label) {
      label = this.props.label;
    }

    var icon;

    if (this.props.icon) {
      icon = React.createElement("i", {
        className: "small-icon " + this.props.icon
      });
    }

    return React.createElement("div", {
      className: classes,
      onClick: this.onClick,
      style: this.props.style ? this.props.style : null
    }, icon, React.createElement("span", null, label), this.renderChildren());
  };

  return Button;
}(_stores_mixins_js2__["MegaRenderMixin"]);

/***/ }),

/***/ (function(module, exports) {

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}

module.exports = _applyDecoratedDescriptor;

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _utils_jsx2__ = __webpack_require__(6);
var _stores_mixins_js3__ = __webpack_require__(2);
var _tooltips_jsx4__ = __webpack_require__(14);
var _forms_jsx5__ = __webpack_require__(15);



var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);






var ContactsUI = __webpack_require__(5);

var ExtraFooterElement = function (_MegaRenderMixin) {
  inherits(ExtraFooterElement, _MegaRenderMixin);

  function ExtraFooterElement() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = ExtraFooterElement.prototype;

  _proto.render = function render() {
    return this.props.children;
  };

  return ExtraFooterElement;
}(_stores_mixins_js3__["MegaRenderMixin"]);

var ModalDialog = function (_MegaRenderMixin2) {
  inherits(ModalDialog, _MegaRenderMixin2);

  function ModalDialog(props) {
    var _this = _MegaRenderMixin2.call(this, props) || this;

    _this.onBlur = _this.onBlur.bind((_this));
    _this.onCloseClicked = _this.onCloseClicked.bind((_this));
    _this.onPopupDidMount = _this.onPopupDidMount.bind((_this));
    return _this;
  }

  var _proto2 = ModalDialog.prototype;

  _proto2.componentDidMount = function componentDidMount() {
    _MegaRenderMixin2.prototype.componentDidMount.call(this);

    var self = this;
    $(document.body).addClass('overlayed');
    $('.fm-dialog-overlay').removeClass('hidden');
    $('textarea:focus').trigger("blur");
    document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
    document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);
    $('.fm-modal-dialog').rebind('click.modalDialogOv' + this.getUniqueId(), function (e) {
      if ($(e.target).is('.fm-modal-dialog')) {
        self.onBlur();
      }
    });
    $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function (e) {
      if (e.keyCode == 27) {
        self.onBlur();
      }
    });
    $('.fm-dialog-overlay').rebind('click.modalDialog' + self.getUniqueId(), function () {
      self.onBlur();
      return false;
    });
  };

  _proto2.onBlur = function onBlur(e) {
    var $element = $(ReactDOM.findDOMNode(this));

    if (!e || !$(e.target).closest(".fm-dialog").is($element)) {
      document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
      this.onCloseClicked();
    }
  };

  _proto2.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin2.prototype.componentWillUnmount.call(this);

    document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
    $(document).off('keyup.modalDialog' + this.getUniqueId());
    $(document.body).removeClass('overlayed');
    $('.fm-dialog-overlay').addClass('hidden');
    $('.fm-dialog-overlay').off('click.modalDialog' + this.getUniqueId());
  };

  _proto2.onCloseClicked = function onCloseClicked() {
    var self = this;

    if (self.props.onClose) {
      self.props.onClose(self);
    }
  };

  _proto2.onPopupDidMount = function onPopupDidMount(elem) {
    this.domNode = elem;

    if (this.props.popupDidMount) {
      this.props.popupDidMount(elem);
    }
  };

  _proto2.render = function render() {
    var self = this;
    var classes = "fm-dialog " + self.props.className;
    var footer = null;
    var extraFooterElements = [];
    var otherElements = [];
    var x = 0;
    React.Children.forEach(self.props.children, function (child) {
      if (!child) {
        return;
      }

      if (child.type.name === 'ExtraFooterElement') {
        extraFooterElements.push(React.cloneElement(child, {
          key: x++
        }));
      } else {
        otherElements.push(React.cloneElement(child, {
          key: x++
        }));
      }
    }.bind(this));

    if (self.props.buttons) {
      var buttons = [];
      self.props.buttons.forEach(function (v, i) {
        if (v) {
          buttons.push(React.createElement("a", {
            className: (v.defaultClassname ? v.defaultClassname : "default-white-button right") + (v.className ? " " + v.className : ""),
            onClick: function onClick(e) {
              if ($(e.target).is(".disabled")) {
                return false;
              }

              if (v.onClick) {
                v.onClick(e, self);
              }
            },
            key: v.key + i
          }, v.iconBefore ? React.createElement("i", {
            className: v.iconBefore
          }) : null, v.label, v.iconAfter ? React.createElement("i", {
            className: v.iconAfter
          }) : null));
        }
      });
      footer = React.createElement("div", {
        className: "fm-dialog-footer white"
      }, extraFooterElements, React.createElement("div", {
        className: "footer-buttons"
      }, buttons), React.createElement("div", {
        className: "clear"
      }));
    }

    return React.createElement(_utils_jsx2__["default"].RenderTo, {
      element: document.body,
      className: "fm-modal-dialog",
      popupDidMount: this.onPopupDidMount
    }, React.createElement("div", {
      className: classes
    }, React.createElement("div", {
      className: "fm-dialog-close",
      onClick: self.onCloseClicked
    }), self.props.title ? React.createElement("div", {
      className: "fm-dialog-title"
    }, self.props.title) : null, React.createElement("div", {
      className: "fm-dialog-content"
    }, otherElements), footer));
  };

  return ModalDialog;
}(_stores_mixins_js3__["MegaRenderMixin"]);

ModalDialog.defaultProps = {
  'hideable': true
};

var SelectContactDialog = function (_MegaRenderMixin3) {
  inherits(SelectContactDialog, _MegaRenderMixin3);

  function SelectContactDialog(props) {
    var _this2 = _MegaRenderMixin3.call(this, props) || this;

    _this2.state = {
      'selected': _this2.props.selected ? _this2.props.selected : []
    };
    _this2.onSelected = _this2.onSelected.bind((_this2));
    return _this2;
  }

  var _proto3 = SelectContactDialog.prototype;

  _proto3.onSelected = function onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
  };

  _proto3.onSelectClicked = function onSelectClicked() {
    this.props.onSelectClicked();
  };

  _proto3.render = function render() {
    var self = this;
    var classes = "send-contact contrast small-footer " + self.props.className;
    return React.createElement(ModalDialog, {
      title: __(l[8628]),
      className: classes,
      selected: self.state.selected,
      onClose: function onClose() {
        self.props.onClose(self);
      },
      buttons: [{
        "label": self.props.selectLabel,
        "key": "select",
        "defaultClassname": "default-grey-button lato right",
        "className": self.state.selected.length === 0 ? "disabled" : null,
        "onClick": function onClick(e) {
          if (self.state.selected.length > 0) {
            if (self.props.onSelected) {
              self.props.onSelected(self.state.selected);
            }

            self.props.onSelectClicked(self.state.selected);
          }

          e.preventDefault();
          e.stopPropagation();
        }
      }, {
        "label": self.props.cancelLabel,
        "key": "cancel",
        "defaultClassname": "link-button lato left",
        "onClick": function onClick(e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      }]
    }, React.createElement(ContactsUI.ContactPickerWidget, {
      megaChat: self.props.megaChat,
      exclude: self.props.exclude,
      selectableContacts: "true",
      onSelectDone: self.props.onSelectClicked,
      onSelected: self.onSelected,
      selected: self.state.selected,
      contacts: M.u,
      headerClasses: "left-aligned",
      multiple: true
    }));
  };

  return SelectContactDialog;
}(_stores_mixins_js3__["MegaRenderMixin"]);

SelectContactDialog.clickTime = 0;
SelectContactDialog.defaultProps = {
  'selectLabel': __(l[1940]),
  'cancelLabel': __(l[82]),
  'hideable': true
};

var ConfirmDialog = function (_MegaRenderMixin4) {
  inherits(ConfirmDialog, _MegaRenderMixin4);

  function ConfirmDialog(props) {
    var _this3 = _MegaRenderMixin4.call(this, props) || this;

    _this3._wasAutoConfirmed = undefined;
    return _this3;
  }

  var _proto4 = ConfirmDialog.prototype;

  _proto4.unbindEvents = function unbindEvents() {
    $(document).off('keyup.confirmDialog' + this.getUniqueId());
  };

  _proto4.componentDidMount = function componentDidMount() {
    _MegaRenderMixin4.prototype.componentDidMount.call(this);

    var self = this;
    setTimeout(function () {
      if (!self.isMounted()) {
        return;
      }

      $(document).rebind('keyup.confirmDialog' + self.getUniqueId(), function (e) {
        if (e.which === 13 || e.keyCode === 13) {
          if (!self.isMounted()) {
            self.unbindEvents();
            return;
          }

          self.onConfirmClicked();
          return false;
        }
      });
    }, 75);
  };

  _proto4.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin4.prototype.componentWillUnmount.call(this);

    var self = this;
    self.unbindEvents();
    delete this._wasAutoConfirmed;
  };

  _proto4.onConfirmClicked = function onConfirmClicked() {
    this.unbindEvents();

    if (this.props.onConfirmClicked) {
      this.props.onConfirmClicked();
    }
  };

  _proto4.render = function render() {
    var self = this;

    if (self.props.dontShowAgainCheckbox && mega.config.get('confirmModal_' + self.props.name) === true) {
      if (this._wasAutoConfirmed) {
        return null;
      }

      if (this.props.onConfirmClicked) {
        this._wasAutoConfirmed = 1;
        setTimeout(function () {
          self.unbindEvents();
          self.props.onConfirmClicked();
        }, 75);
      }

      return null;
    }

    var classes = "delete-message " + self.props.name + " " + self.props.className;
    var dontShowCheckbox = null;

    if (self.props.dontShowAgainCheckbox) {
      dontShowCheckbox = React.createElement("div", {
        className: "footer-checkbox"
      }, React.createElement(_forms_jsx5__["a"].Checkbox, {
        name: "delete-confirm",
        id: "delete-confirm",
        onLabelClick: function onLabelClick(e, state) {
          if (state === true) {
            mega.config.set('confirmModal_' + self.props.name, true);
          } else {
            mega.config.set('confirmModal_' + self.props.name, false);
          }
        }
      }, l[7039]));
    }

    return React.createElement(ModalDialog, {
      title: this.props.title,
      className: classes,
      onClose: function onClose() {
        self.props.onClose(self);
      },
      buttons: [{
        "label": self.props.confirmLabel,
        "key": "select",
        "className": null,
        "onClick": function onClick(e) {
          self.onConfirmClicked();
          e.preventDefault();
          e.stopPropagation();
        }
      }, {
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick": function onClick(e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      }]
    }, React.createElement("div", {
      className: "fm-dialog-content"
    }, self.props.children), React.createElement(ExtraFooterElement, null, dontShowCheckbox));
  };

  return ConfirmDialog;
}(_stores_mixins_js3__["MegaRenderMixin"]);

ConfirmDialog.defaultProps = {
  'confirmLabel': __(l[6826]),
  'cancelLabel': __(l[82]),
  'dontShowAgainCheckbox': true,
  'hideable': true
};
__webpack_exports__["a"] = ({
  ModalDialog: ModalDialog,
  SelectContactDialog: SelectContactDialog,
  ConfirmDialog: ConfirmDialog
});

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "ConversationMessageMixin", function() { return ConversationMessageMixin; });
var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _stores_mixins_js2__ = __webpack_require__(2);




var ConversationMessageMixin = function (_ContactAwareComponen) {
  inherits(ConversationMessageMixin, _ContactAwareComponen);

  function ConversationMessageMixin(props) {
    var _this = _ContactAwareComponen.call(this, props) || this;

    _this.__cmmUpdateTickCount = 0;
    _this._contactChangeListeners = false;
    _this.onAfterRenderWasTriggered = false;
    lazy((_this), '__cmmId', function () {
      return _this.getUniqueId() + '--' + String(Math.random()).slice(-7);
    });
    return _this;
  }

  var _proto = ConversationMessageMixin.prototype;

  _proto.componentWillMount = function componentWillMount() {
    var _this2 = this;

    if (_ContactAwareComponen.prototype.componentWillMount) {
      _ContactAwareComponen.prototype.componentWillMount.call(this);
    }

    var chatRoom = this.props.chatRoom;

    if (chatRoom) {
      chatRoom.rebind('onChatShown.' + this.__cmmId, function () {
        if (!_this2._contactChangeListeners) {
          _this2.addContactListeners();
        }
      }).rebind('onChatHidden.' + this.__cmmId, function () {
        if (_this2._contactChangeListeners) {
          _this2.removeContactListeners();
        }
      });
    }

    this.addContactListeners();
  };

  _proto.removeContactListeners = function removeContactListeners() {
    var users = this._contactChangeListeners;

    if (d > 1) {
      console.warn('%s.removeContactListeners', this.getReactId(), [this], users);
    }

    for (var i = users.length; i--;) {
      users[i].removeEventHandler(this);
    }

    this._contactChangeListeners = false;
  };

  _proto.addContactListeners = function addContactListeners() {
    var users = this._contactChangeListeners || [];

    var addUser = function addUser(user) {
      if (user instanceof MegaDataMap && users.indexOf(user) < 0) {
        users.push(user);
      }
    };

    addUser(this.getContact());

    if (this.haveMoreContactListeners) {
      var moreIds = this.haveMoreContactListeners();

      if (moreIds) {
        for (var i = moreIds.length; i--;) {
          var handle = moreIds[i];
          addUser(handle in M.u && M.u[handle]);
        }
      }
    }

    if (d > 1) {
      console.warn('%s.addContactListeners', this.getReactId(), [this], users);
    }

    for (var _i = users.length; _i--;) {
      users[_i].addChangeListener(this);
    }

    this._contactChangeListeners = users;
  };

  _proto.handleChangeEvent = function handleChangeEvent(x, z, k) {
    var _this3 = this;

    if (k === 'ts' || k === 'ats') {
      return;
    }

    delay(this.__cmmId, function () {
      _this3.eventuallyUpdate();

      _this3.__cmmUpdateTickCount = -2;
    }, ++this.__cmmUpdateTickCount > 5 ? -1 : 90);
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _ContactAwareComponen.prototype.componentWillUnmount.call(this);

    var chatRoom = this.props.chatRoom;

    if (chatRoom) {
      chatRoom.off('onChatShown.' + this.__cmmId).off('onChatHidden.' + this.__cmmId);
    }

    if (this._contactChangeListeners) {
      this.removeContactListeners();
    }
  };

  _proto.getContact = function getContact() {
    if (this.props.contact) {
      return this.props.contact;
    }

    var message = this.props.message;
    return Message.getContactForMessage(message);
  };

  _proto.getTimestampAsString = function getTimestampAsString() {
    return unixtimeToTimeString(this.getTimestamp());
  };

  _proto.getTimestamp = function getTimestamp() {
    var message = this.props.message;
    var timestampInt;

    if (message.getDelay) {
      timestampInt = message.getDelay();
    } else if (message.delay) {
      timestampInt = message.delay;
    } else {
      timestampInt = unixtime();
    }

    if (timestampInt && message.updated && message.updated > 0) {
      timestampInt += message.updated;
    }

    return timestampInt;
  };

  _proto.getParentJsp = function getParentJsp() {
    return $(this.findDOMNode()).closest('.jScrollPaneContainer').data('jsp');
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    var self = this;
    var chatRoom = self.props.message.chatRoom;

    if (!self.onAfterRenderWasTriggered) {
      var msg = self.props.message;
      var shouldRender = true;

      if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
        shouldRender = false;
      }

      if (shouldRender) {
        chatRoom.trigger("onAfterRenderMessage", self.props.message);
        self.onAfterRenderWasTriggered = true;
      }
    }
  };

  return ConversationMessageMixin;
}(_stores_mixins_js2__["ContactAwareComponent"]);



/***/ }),

/***/ (function(module, exports) {

function _extends() {
  module.exports = _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

module.exports = _extends;

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "PerfectScrollbar", function() { return PerfectScrollbar; });
var _inheritsLoose0__ = __webpack_require__(1);
var _inheritsLoose0 = __webpack_require__.n(_inheritsLoose0__);
var _applyDecoratedDescriptor1__ = __webpack_require__(9);
var _applyDecoratedDescriptor1 = __webpack_require__.n(_applyDecoratedDescriptor1__);
var _stores_mixins_js2__ = __webpack_require__(2);



var _dec, _dec2, _class, _class2, _temp;

var React = __webpack_require__(0);


var PerfectScrollbar = (_dec = Object(_stores_mixins_js2__["SoonFcWrap"])(30, true), _dec2 = Object(_stores_mixins_js2__["SoonFcWrap"])(30, true), (_class = (_temp = _class2 = function (_MegaRenderMixin) {
  inherits(PerfectScrollbar, _MegaRenderMixin);

  function PerfectScrollbar(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.isUserScroll = true;
    _this.scrollEventIncId = 0;
    return _this;
  }

  var _proto = PerfectScrollbar.prototype;

  _proto.get$Node = function get$Node() {
    if (!this.$Node) {
      this.$Node = $(this.findDOMNode());
    }

    return this.$Node;
  };

  _proto.doProgramaticScroll = function doProgramaticScroll(newPos, forced, isX, skipReinitialised) {
    if (!this.isMounted()) {
      return;
    }

    var self = this;
    var $elem = self.get$Node();
    var animFrameInner = false;
    var prop = !isX ? 'scrollTop' : 'scrollLeft';
    var event = 'scroll.progscroll' + self.scrollEventIncId++;
    $elem.rebind(event, function () {
      if (animFrameInner) {
        cancelAnimationFrame(animFrameInner);
        animFrameInner = false;
      }

      $elem.off(event);

      if (!skipReinitialised) {
        self.reinitialised(true);
      } else if (typeof skipReinitialised === 'function') {
        onIdle(skipReinitialised);
      }

      self.isUserScroll = true;
    });
    self.isUserScroll = false;
    $elem[0][prop] = Math.round(newPos);
    Ps.update($elem[0]);
    animFrameInner = requestAnimationFrame(function () {
      animFrameInner = false;
      self.isUserScroll = true;
      $elem.off(event);
    });
    return true;
  };

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    var self = this;
    var $elem = self.get$Node();
    $elem.height('100%');
    var options = Object.assign({}, {
      'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection'],
      'minScrollbarLength': 20
    }, self.props.options);
    Ps.initialize($elem[0], options);

    if (self.props.onFirstInit) {
      self.props.onFirstInit(self, $elem);
    }

    $elem.rebind('ps-scroll-y.ps' + self.getUniqueId(), function (e) {
      if ($elem.attr('data-scroll-disabled') === "true") {
        e.stopPropagation();
        e.preventDefault();
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
        return false;
      }

      if (self.props.onUserScroll && self.isUserScroll === true && $elem.is(e.target)) {
        self.props.onUserScroll(self, $elem, e);
      }
    });
    $elem.rebind('disable-scroll.ps' + self.getUniqueId(), function () {
      Ps.destroy($elem[0]);
    });
    $elem.rebind('enable-scroll.ps' + self.getUniqueId(), function () {
      Ps.initialize($elem[0], options);
    });
    $elem.rebind('forceResize.ps' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
      self.onResize(forced, scrollPositionYPerc, scrollToElement);
    });
    self.onResize();
    this.attachAnimationEvents();
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    var $elem = this.get$Node();
    $elem.off('ps-scroll-y.ps' + this.getUniqueId());
    var ns = '.ps' + this.getUniqueId();
    $elem.parents('.have-animation').unbind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);
  };

  _proto.attachAnimationEvents = function attachAnimationEvents() {};

  _proto.eventuallyReinitialise = function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
    var self = this;

    if (!self.isComponentEventuallyVisible()) {
      return;
    }

    var $elem = self.get$Node();
    var h = self.getContentHeight();

    if (forced || self._currHeight !== h) {
      self._currHeight = h;

      self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
    }
  };

  _proto._doReinit = function _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
    var fired = false;

    if (this.props.onReinitialise) {
      fired = this.props.onReinitialise(this, $elem, forced, scrollPositionYPerc, scrollToElement);
    }

    if (fired === false) {
      if (scrollPositionYPerc) {
        if (scrollPositionYPerc === -1) {
          this.scrollToBottom(true);
        } else {
          this.scrollToPercentY(scrollPositionYPerc, true);
        }
      } else if (scrollToElement) {
        this.scrollToElement(scrollToElement, true);
      }
    }
  };

  _proto.scrollToBottom = function scrollToBottom(skipReinitialised) {
    this.reinitialise(skipReinitialised, true);
  };

  _proto.reinitialise = function reinitialise(skipReinitialised, bottom) {
    var $elem = this.get$Node()[0];
    this.isUserScroll = false;

    if (bottom) {
      $elem.scrollTop = this.getScrollHeight();
    }

    Ps.update($elem);
    this.isUserScroll = true;

    if (!skipReinitialised) {
      this.reinitialised(true);
    }
  };

  _proto.getDOMRect = function getDOMRect(node) {
    return (node || this.get$Node()[0]).getBoundingClientRect();
  };

  _proto.getScrollOffset = function getScrollOffset(value) {
    var $elem = this.get$Node()[0];
    return this.getDOMRect($elem.children[0])[value] - this.getDOMRect($elem)[value] || 0;
  };

  _proto.getScrollHeight = function getScrollHeight() {
    var res = this.getScrollOffset('height');

    if (res < 1) {
      return this._lastKnownScrollHeight || 0;
    }

    this._lastKnownScrollHeight = res;
    return res;
  };

  _proto.getScrollWidth = function getScrollWidth() {
    var res = this.getScrollOffset('width');

    if (res < 1) {
      return this._lastKnownScrollWidth || 0;
    }

    this._lastKnownScrollWidth = res;
    return res;
  };

  _proto.getContentHeight = function getContentHeight() {
    var $elem = this.get$Node();
    return $elem[0].scrollHeight;
  };

  _proto.setCssContentHeight = function setCssContentHeight(h) {
    var $elem = this.get$Node();
    return $elem.css('height', h);
  };

  _proto.isAtTop = function isAtTop() {
    return this.get$Node()[0].scrollTop === 0;
  };

  _proto.isAtBottom = function isAtBottom() {
    return Math.round(this.getScrollPositionY()) === Math.round(this.getScrollHeight());
  };

  _proto.isCloseToBottom = function isCloseToBottom(minPixelsOff) {
    return this.getScrollHeight() - this.getScrollPositionY() <= minPixelsOff;
  };

  _proto.getScrolledPercentY = function getScrolledPercentY() {
    return 100 / this.getScrollHeight() * this.getScrollPositionY();
  };

  _proto.getScrollPositionY = function getScrollPositionY() {
    return this.get$Node()[0].scrollTop;
  };

  _proto.scrollToPercentY = function scrollToPercentY(posPerc, skipReinitialised) {
    var $elem = this.get$Node();
    var targetPx = this.getScrollHeight() / 100 * posPerc;

    if ($elem[0].scrollTop !== targetPx) {
      this.doProgramaticScroll(targetPx, 0, 0, skipReinitialised);
    }
  };

  _proto.scrollToPercentX = function scrollToPercentX(posPerc, skipReinitialised) {
    var $elem = this.get$Node();
    var targetPx = this.getScrollWidth() / 100 * posPerc;

    if ($elem[0].scrollLeft !== targetPx) {
      this.doProgramaticScroll(targetPx, false, true, skipReinitialised);
    }
  };

  _proto.scrollToY = function scrollToY(posY, skipReinitialised) {
    var $elem = this.get$Node();

    if ($elem[0].scrollTop !== posY) {
      this.doProgramaticScroll(posY, 0, 0, skipReinitialised);
    }
  };

  _proto.scrollToElement = function scrollToElement(element, skipReinitialised) {
    if (element && element.offsetParent) {
      this.doProgramaticScroll(element.offsetTop, 0, 0, skipReinitialised);
    }
  };

  _proto.disable = function disable() {
    if (this.isMounted()) {
      var $elem = this.get$Node();
      $elem.attr('data-scroll-disabled', true);
      $elem.addClass('ps-disabled');
      Ps.disable($elem[0]);
    }
  };

  _proto.enable = function enable() {
    if (this.isMounted()) {
      var $elem = this.get$Node();
      $elem.removeAttr('data-scroll-disabled');
      $elem.removeClass('ps-disabled');
      Ps.enable($elem[0]);
    }
  };

  _proto.reinitialised = function reinitialised(forced) {
    if (this.props.onReinitialise) {
      this.props.onReinitialise(this, this.get$Node(), forced ? forced : false);
    }
  };

  _proto.onResize = function onResize(forced, scrollPositionYPerc, scrollToElement) {
    if (forced && forced.originalEvent) {
      forced = true;
      scrollPositionYPerc = undefined;
    }

    this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
  };

  _proto.inViewport = function inViewport(domNode) {
    return verge.inViewport(domNode);
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    if (this.props.requiresUpdateOnResize) {
      this.onResize(true);
    }

    this.attachAnimationEvents();
  };

  _proto.customIsEventuallyVisible = function customIsEventuallyVisible() {
    var chatRoom = this.props.chatRoom;
    return !chatRoom || chatRoom.isCurrentlyActive;
  };

  _proto.render = function render() {
    var self = this;
    return React.createElement("div", {
      style: this.props.style,
      className: this.props.className
    }, self.props.children);
  };

  return PerfectScrollbar;
}(_stores_mixins_js2__["MegaRenderMixin"]), _class2.defaultProps = {
  className: "perfectScrollbarContainer",
  requiresUpdateOnResize: true
}, _temp), (_applyDecoratedDescriptor1()(_class.prototype, "eventuallyReinitialise", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyReinitialise"), _class.prototype), _applyDecoratedDescriptor1()(_class.prototype, "onResize", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "onResize"), _class.prototype)), _class));

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
var _inheritsLoose0__ = __webpack_require__(1);
var _inheritsLoose0 = __webpack_require__.n(_inheritsLoose0__);
var _stores_mixins_js1__ = __webpack_require__(2);


var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);

var utils = __webpack_require__(6);



var Handler = function (_MegaRenderMixin) {
  inherits(Handler, _MegaRenderMixin);

  function Handler() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = Handler.prototype;

  _proto.render = function render() {
    var classes = "tooltip-handler" + (this.props.className ? " " + this.props.className : "");
    return React.createElement("span", {
      className: classes,
      onMouseOver: this.props.onMouseOver,
      onMouseOut: this.props.onMouseOut
    }, this.props.children);
  };

  return Handler;
}(_stores_mixins_js1__["MegaRenderMixin"]);

Handler.defaultProps = {
  'hideable': true
};

var Contents = function (_MegaRenderMixin2) {
  inherits(Contents, _MegaRenderMixin2);

  function Contents() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = Contents.prototype;

  _proto2.render = function render() {
    var className = 'tooltip-contents dropdown body tooltip ' + (this.props.className ? this.props.className : "");

    if (this.props.active) {
      className += " visible";
      return React.createElement("div", {
        className: className
      }, this.props.withArrow ? React.createElement("i", {
        className: "dropdown-white-arrow"
      }) : null, this.props.children);
    } else {
      return null;
    }
  };

  return Contents;
}(_stores_mixins_js1__["MegaRenderMixin"]);

Contents.defaultProps = {
  'hideable': true
};

var Tooltip = function (_MegaRenderMixin3) {
  inherits(Tooltip, _MegaRenderMixin3);

  function Tooltip(props) {
    var _this = _MegaRenderMixin3.call(this, props) || this;

    _this.state = {
      'active': false
    };
    return _this;
  }

  var _proto3 = Tooltip.prototype;

  _proto3.componentDidUpdate = function componentDidUpdate(oldProps, oldState) {
    var self = this;

    if (oldState.active === true && this.state.active === false) {
      chatGlobalEventManager.removeEventListener('resize', 'tooltip' + this.getUniqueId());
    }

    if (self.state.active === true) {
      self.repositionTooltip();
      chatGlobalEventManager.addEventListener('resize', 'tooltip' + this.getUniqueId(), function () {
        self.repositionTooltip();
      });
    }
  };

  _proto3.repositionTooltip = function repositionTooltip() {
    this;
    var elLeftPos, elTopPos, elWidth, elHeight;
    var tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
    var docHeight;
    var arrowClass;

    if (!this.isMounted()) {
      return;
    }

    var $container = $(this.findDOMNode());
    var $el = $('.tooltip-handler', $container);
    var $tooltip = $('.tooltip-contents', $container);
    var tooltipOffset = this.props.tooltipOffset;
    var arrow = this.props.withArrow;

    if ($el && $tooltip) {
      elWidth = $el.outerWidth();
      elHeight = $el.outerHeight();
      elLeftPos = $el.offset().left;
      elTopPos = $el.offset().top;
      tooltipWidth = $tooltip.outerWidth();
      tooltipHeight = $tooltip.outerHeight();
      $(window).width();
      docHeight = $(window).height();
      $tooltip.removeClass('dropdown-arrow left-arrow right-arrow up-arrow down-arrow').removeAttr('style');

      if (!tooltipOffset) {
        tooltipOffset = 7;
      }

      if (elTopPos - tooltipHeight - tooltipOffset > 10) {
        tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
        tooltipTopPos = elTopPos - tooltipHeight - tooltipOffset;
        arrowClass = arrow ? 'dropdown-arrow down-arrow' : '';
      } else if (docHeight - (elTopPos + elHeight + tooltipHeight + tooltipOffset) > 10) {
        tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
        tooltipTopPos = elTopPos + elHeight + tooltipOffset;
        arrowClass = arrow ? 'dropdown-arrow up-arrow' : '';
      } else if (elLeftPos - tooltipWidth - tooltipOffset > 10) {
        tooltipLeftPos = elLeftPos - tooltipWidth - tooltipOffset;
        tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
        arrowClass = arrow ? 'dropdown-arrow right-arrow' : '';
      } else {
        tooltipLeftPos = elLeftPos + elWidth + tooltipOffset;
        tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
        arrowClass = arrow ? 'dropdown-arrow left-arrow' : '';
      }

      $tooltip.css({
        'left': tooltipLeftPos,
        'top': tooltipTopPos - 5
      });
      $tooltip.addClass(arrowClass);
    }
  };

  _proto3.onHandlerMouseOver = function onHandlerMouseOver() {
    this.setState({
      'active': true
    });
  };

  _proto3.onHandlerMouseOut = function onHandlerMouseOut() {
    this.setState({
      'active': false
    });
  };

  _proto3.render = function render() {
    var self = this;
    var classes = "" + this.props.className;
    var others = [];
    var handler = null;
    var contents = null;
    var x = 0;
    React.Children.forEach(this.props.children, function (child) {
      if (child.type.name === 'Handler') {
        handler = React.cloneElement(child, {
          onMouseOver: function onMouseOver() {
            self.onHandlerMouseOver();
          },
          onMouseOut: function onMouseOut() {
            self.onHandlerMouseOut();
          }
        });
      } else if (child.type.name === 'Contents') {
        contents = React.cloneElement(child, {
          active: self.state.active,
          withArrow: self.props.withArrow
        });
      } else {
        var tmp = React.cloneElement(child, {
          key: x++
        });
        others.push(tmp);
      }
    });
    return React.createElement("span", {
      className: classes
    }, handler, contents, others);
  };

  return Tooltip;
}(_stores_mixins_js1__["MegaRenderMixin"]);

Tooltip.defaultProps = {
  'hideable': true
};
__webpack_exports__["a"] = ({
  Tooltip: Tooltip,
  Handler: Handler,
  Contents: Contents
});

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
var _assertThisInitialized0__ = __webpack_require__(4);
var _assertThisInitialized0 = __webpack_require__.n(_assertThisInitialized0__);
var _inheritsLoose1__ = __webpack_require__(1);
var _inheritsLoose1 = __webpack_require__.n(_inheritsLoose1__);
var _stores_mixins_js2__ = __webpack_require__(2);



var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);

var utils = __webpack_require__(6);



var Checkbox = function (_MegaRenderMixin) {
  inherits(Checkbox, _MegaRenderMixin);

  function Checkbox(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      checked: _this.props.checked ? _this.props.checked : false
    };
    _this.onLabelClick = _this.onLabelClick.bind((_this));
    _this.onChange = _this.onChange.bind((_this));
    return _this;
  }

  var _proto = Checkbox.prototype;

  _proto.onLabelClick = function onLabelClick(e) {
    var state = !this.state.checked;
    this.setState({
      'checked': state
    });

    if (this.props.onLabelClick) {
      this.props.onLabelClick(e, state);
    }

    this.onChange(e);
  };

  _proto.onChange = function onChange(e) {
    if (this.props.onChange) {
      this.props.onChange(e, this.state.checked);
    }
  };

  _proto.render = function render() {
    var className = this.state.checked ? "checkboxOn" : "checkboxOff";
    return React.createElement("div", {
      className: "formsCheckbox"
    }, React.createElement("div", {
      className: "checkdiv " + className,
      onClick: this.onLabelClick
    }, React.createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.id,
      className: className,
      checked: this.state.checked,
      onChange: this.onChange
    })), React.createElement("label", {
      htmlFor: this.props.id,
      className: "radio-txt"
    }, this.props.children));
  };

  return Checkbox;
}(_stores_mixins_js2__["MegaRenderMixin"]);

__webpack_exports__["a"] = ({
  Checkbox: Checkbox
});

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "getMessageString", function() { return getMessageString; });
var getMessageString;

(function () {
  var MESSAGE_STRINGS;
  var MESSAGE_STRINGS_GROUP;

  var _sanitizeStrings = function _sanitizeStrings(arg) {
    if (typeof arg === "undefined") {
      return arg;
    } else if (typeof arg === "string") {
      return escapeHTML(arg);
    } else if (arg.forEach) {
      arg.forEach(function (v, k) {
        arg[k] = _sanitizeStrings(v);
      });
    } else if (typeof arg === "object") {
      Object.keys(arg).forEach(function (k) {
        arg[k] = _sanitizeStrings(arg[k]);
      });
    }

    return arg;
  };

  getMessageString = function getMessageString(type, isGroupCall) {
    if (!MESSAGE_STRINGS) {
      MESSAGE_STRINGS = {
        'outgoing-call': l[5891].replace("[X]", "[[[X]]]"),
        'incoming-call': l[19964] || "[[%s]] is calling...",
        'call-timeout': [l[18698].replace("[X]", "[[[X]]]")],
        'call-starting': l[7206].replace("[X]", "[[[X]]]"),
        'call-feedback': l[7998].replace("[X]", "[[[X]]]"),
        'call-initialising': l[7207].replace("[X]", "[[[X]]]"),
        'call-ended': [l[19965] || "Call ended.", l[7208]],
        'remoteCallEnded': [l[19965] || "Call ended.", l[7208]],
        'call-failed-media': l[7204],
        'call-failed': [l[19966] || "Call failed.", l[7208]],
        'call-handled-elsewhere': l[5895].replace("[X]", "[[[X]]]"),
        'call-missed': l[17870],
        'call-rejected': l[19040],
        'call-canceled': l[19041],
        'remoteCallStarted': l[5888],
        'call-started': l[5888].replace("[X]", "[[[X]]]"),
        'alterParticipants': undefined,
        'privilegeChange': l[8915],
        'truncated': l[8905]
      };

      _sanitizeStrings(MESSAGE_STRINGS);
    }

    if (isGroupCall && !MESSAGE_STRINGS_GROUP) {
      MESSAGE_STRINGS_GROUP = {
        'call-ended': [l[19967], l[7208]],
        'remoteCallEnded': [l[19967], l[7208]],
        'call-handled-elsewhere': l[19968],
        'call-canceled': l[19969],
        'call-started': l[19970]
      };

      _sanitizeStrings(MESSAGE_STRINGS_GROUP);
    }

    return !isGroupCall ? MESSAGE_STRINGS[type] : MESSAGE_STRINGS_GROUP[type] ? MESSAGE_STRINGS_GROUP[type] : MESSAGE_STRINGS[type];
  };
})();

mega.ui.chat.getMessageString = getMessageString;


/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "MetaRichpreviewLoading", function() { return MetaRichpreviewLoading; });
var _inheritsLoose0__ = __webpack_require__(1);
var _inheritsLoose0 = __webpack_require__.n(_inheritsLoose0__);


var React = __webpack_require__(0);

var ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var MetaRichpreviewLoading = function (_ConversationMessageM) {
  inherits(MetaRichpreviewLoading, _ConversationMessageM);

  function MetaRichpreviewLoading() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = MetaRichpreviewLoading.prototype;

  _proto.render = function render() {
    return React.createElement("div", {
      className: "loading-spinner light small"
    }, React.createElement("div", {
      className: "main-loader"
    }));
  };

  return MetaRichpreviewLoading;
}(ConversationMessageMixin);



/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, "JoinCallNotification", function() { return conversationpanel_JoinCallNotification; });
__webpack_require__.d(__webpack_exports__, "ConversationRightArea", function() { return conversationpanel_ConversationRightArea; });
__webpack_require__.d(__webpack_exports__, "ConversationPanel", function() { return conversationpanel_ConversationPanel; });
__webpack_require__.d(__webpack_exports__, "ConversationPanels", function() { return conversationpanel_ConversationPanels; });

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(9);
var applyDecoratedDescriptor_default = __webpack_require__.n(applyDecoratedDescriptor);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/inheritsLoose.js
var inheritsLoose = __webpack_require__(1);
var inheritsLoose_default = __webpack_require__.n(inheritsLoose);

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(0);
var external_React_default = __webpack_require__.n(external_React_);

// EXTERNAL MODULE: external "ReactDOM"
var external_ReactDOM_ = __webpack_require__(7);
var external_ReactDOM_default = __webpack_require__.n(external_ReactDOM_);

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(6);

// EXTERNAL MODULE: ./js/stores/mixins.js
var mixins = __webpack_require__(2);

// EXTERNAL MODULE: ./js/ui/buttons.jsx
var ui_buttons = __webpack_require__(8);

// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(10);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/assertThisInitialized.js
var assertThisInitialized = __webpack_require__(4);
var assertThisInitialized_default = __webpack_require__.n(assertThisInitialized);

// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(14);

// CONCATENATED MODULE: ./js/ui/cloudBrowserModalDialog.jsx








function BrowserCol(_ref) {
  var id = _ref.id,
      _ref$className = _ref.className,
      className = _ref$className === void 0 ? '' : _ref$className,
      label = _ref.label,
      sortBy = _ref.sortBy,
      _onClick = _ref.onClick;
  var classes = id + " " + className;

  if (sortBy[0] === id) {
    var ordClass = sortBy[1] == "desc" ? "asc" : "desc";
    classes = classes + " " + ordClass;
  }

  return external_React_default.a.createElement("th", {
    onClick: function onClick(e) {
      e.preventDefault();
      e.stopPropagation();

      _onClick(id);
    }
  }, external_React_default.a.createElement("span", {
    className: "arrow " + classes
  }, label));
}

var cloudBrowserModalDialog_BrowserEntries = function (_MegaRenderMixin) {
  inherits(BrowserEntries, _MegaRenderMixin);

  function BrowserEntries(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      'highlighted': _this.props.initialHighlighted || [],
      'selected': _this.props.initialSelected || []
    };
    return _this;
  }

  var _proto = BrowserEntries.prototype;

  _proto.componentWillMount = function componentWillMount() {
    this.lastCursor = false;
    this.lastCharKeyPressed = false;
    this.lastCharKeyIndex = -1;
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    var self = this;

    if (!self.lastCursor || self.lastCursor !== self.state.cursor) {
      self.lastCursor = self.state.cursor;
      var tr = self.findDOMNode().querySelector('.node_' + self.lastCursor);
      var $jsp = $(tr).parents('.jspScrollable').data('jsp');

      if (tr && $jsp) {
        $jsp.scrollToElement(tr, undefined, false);
      }
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    this.bindEvents();
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    this.unbindEvents();
  };

  _proto.getNodesInIndexRange = function getNodesInIndexRange(firstIndex, lastIndex) {
    var self = this;
    return self.props.entries.filter(function (node, index) {
      return index >= firstIndex && index <= lastIndex && (!self.props.folderSelectNotAllowed ? true : node.t === 0);
    }).map(function (node) {
      return node.h;
    });
  };

  _proto.getIndexByNodeId = function getIndexByNodeId(nodeId, notFoundValue) {
    var self = this;
    var foundIndex = typeof notFoundValue === 'undefined' ? -1 : notFoundValue;
    self.props.entries.find(function (r, index) {
      if (r.h === nodeId) {
        foundIndex = index;
        return true;
      }
    });
    return foundIndex;
  };

  _proto.setSelectedAndHighlighted = function setSelectedAndHighlighted(highlighted, cursor) {
    var self = this;
    var currentViewOrderMap = {};
    self.props.entries.forEach(function (v, k) {
      currentViewOrderMap[v.h] = k;
    });
    highlighted.sort(function (a, b) {
      var aa = currentViewOrderMap[a];
      var bb = currentViewOrderMap[b];

      if (aa < bb) {
        return -1;
      }

      if (aa > bb) {
        return 1;
      }

      return 0;
    });
    self.setState({
      'highlighted': highlighted,
      'cursor': cursor
    });
    self.props.onHighlighted(highlighted);
    var selected = highlighted.filter(function (nodeId) {
      var node = M.getNodeByHandle(nodeId);
      return !self.props.folderSelectNotAllowed || node && node.t === 0;
    });
    self.setState({
      'selected': selected
    });
    self.props.onSelected(selected);
  };

  _proto._doSelect = function _doSelect(selectionIncludeShift, currentIndex, targetIndex) {
    var self = this;

    if (targetIndex >= self.props.entries.length) {
      if (selectionIncludeShift) {
        return;
      } else {
        targetIndex = self.props.entries.length - 1;
      }
    }

    if (targetIndex < 0 || !self.props.entries[targetIndex]) {
      targetIndex = Math.min(0, currentIndex);
    }

    if (self.props.entries.length === 0 || !self.props.entries[targetIndex]) {
      return;
    }

    var highlighted;

    if (selectionIncludeShift) {
      var firstIndex;
      var lastIndex;

      if (targetIndex < currentIndex) {
        if (self.state.highlighted && self.state.highlighted.length > 0) {
          if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
            firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
            lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 2], self.state.highlighted.length - 2);
          } else {
            firstIndex = targetIndex;
            lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], -1);
          }
        } else {
          firstIndex = targetIndex;
          lastIndex = currentIndex;
        }
      } else {
        if (self.state.highlighted && self.state.highlighted.length > 0) {
          if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
            firstIndex = self.getIndexByNodeId(self.state.highlighted[1], 1);
            lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], self.state.highlighted.length - 1);
          } else {
            firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
            lastIndex = targetIndex;
          }
        } else {
          firstIndex = currentIndex;
          lastIndex = targetIndex;
        }
      }

      highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);
      self.setSelectedAndHighlighted(highlighted, self.props.entries[targetIndex].h);
    } else {
      highlighted = [self.props.entries[targetIndex].h];
      self.setSelectedAndHighlighted(highlighted, highlighted[0]);
    }
  };

  _proto.bindEvents = function bindEvents() {
    var self = this;
    $(document.body).rebind('keydown.cloudBrowserModalDialog', function (e) {
      var charTyped = false;
      var keyCode = e.which || e.keyCode;
      var selectionIncludeShift = e.shiftKey;
      var $searchField = $('div.fm-files-search input');
      var $typingArea = $('textarea.messages-textarea');

      if ($searchField.is(':focus')) {
        return;
      }

      if ($typingArea.is(':focus')) {
        $typingArea.trigger('blur');
      }

      var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

      if (keyCode === 65 && (e.ctrlKey || e.metaKey)) {
        var newCursor = false;
        var highlighted = [];

        if (self.props.entries && self.props.entries.length > 0) {
          var lastIndex = self.props.entries.length - 1;
          newCursor = self.props.entries[lastIndex].h;
          highlighted = self.getNodesInIndexRange(0, lastIndex);
        }

        self.setSelectedAndHighlighted(highlighted, newCursor);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.metaKey && keyCode === 38 || keyCode === 8) {
        if (viewMode === "0") {
          var currentFolder = M.getNode(self.props.currentlyViewedEntry);

          if (currentFolder.p) {
            self.expandFolder(currentFolder.p);
          }
        }
      } else if (!e.metaKey && (viewMode === "0" && (keyCode === 38 || keyCode === 40) || viewMode === "1" && (keyCode === 37 || keyCode === 39))) {
        var dir = keyCode === (viewMode === "1" ? 37 : 38) ? -1 : 1;
        var lastHighlighted = self.state.cursor || false;

        if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
          lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
        }

        var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);
        var targetIndex = currentIndex + dir;

        while (selectionIncludeShift && self.props.folderSelectNotAllowed && self.props.entries && self.props.entries[targetIndex] && self.props.entries[targetIndex].t === 1) {
          targetIndex = targetIndex + dir;

          if (targetIndex < 0) {
            return;
          }
        }

        self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
      } else if (viewMode === "1" && (keyCode === 38 || keyCode === 40)) {
        var containerWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible').outerWidth();
        var itemWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible .data-block-view:first').outerWidth();
        var itemsPerRow = Math.floor(containerWidth / itemWidth);
        var dir = keyCode === 38 ? -1 : 1;
        var lastHighlighted = self.state.cursor || false;

        if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
          lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
        }

        var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);
        var targetIndex = currentIndex + dir * itemsPerRow;

        if (self.props.entries.length - 1 < targetIndex || targetIndex < 0) {
          return;
        }

        self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
      } else if (keyCode >= 48 && keyCode <= 57 || keyCode >= 65 && keyCode <= 123 || keyCode > 255) {
        charTyped = String.fromCharCode(keyCode).toLowerCase();
        var foundMatchingNodes = self.props.entries.filter(function (node) {
          return node.name && node.name.substr(0, 1).toLowerCase() === charTyped;
        });

        if (self.lastCharKeyPressed === charTyped) {
          self.lastCharKeyIndex++;
        }

        self.lastCharKeyPressed = charTyped;

        if (foundMatchingNodes.length > 0) {
          if (!foundMatchingNodes[self.lastCharKeyIndex]) {
            self.lastCharKeyIndex = 0;
          }

          var foundNode = foundMatchingNodes[self.lastCharKeyIndex];
          self.setSelectedAndHighlighted([foundNode.h], foundNode.h);
        }
      } else if (keyCode === 13 || e.metaKey && keyCode === 40) {
        var selectedNodes = [];

        if (self.props.folderSelectNotAllowed === true) {
          self.state.highlighted.forEach(function (h) {
            var node = self.props.entries.find(function (entry) {
              return entry.h === h;
            });

            if (node && node.t === 0) {
              selectedNodes.push(h);
            }
          });

          if (selectedNodes.length === 0) {
            var cursorNode = self.state.cursor && M.getNodeByHandle(self.state.cursor);

            if (cursorNode.t === 1) {
              self.expandFolder(cursorNode.h);
              return;
            } else if (self.state.highlighted.length > 0) {
              var firstNodeId = self.state.highlighted[0];
              self.expandFolder(firstNodeId);
              return;
            } else {
              return;
            }
          }
        } else {
          selectedNodes = self.state.highlighted;
        }

        self.setState({
          'selected': selectedNodes
        });
        self.props.onSelected(selectedNodes);
        self.props.onAttachClicked(selectedNodes);
      }

      if (!charTyped) {
        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1;
      }
    });
  };

  _proto.unbindEvents = function unbindEvents() {
    $(document.body).off('keydown.cloudBrowserModalDialog');
  };

  _proto.onEntryClick = function onEntryClick(e, node) {
    var self = this;
    self.lastCharKeyPressed = false;
    self.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      self.setSelectedAndHighlighted([node.h], node.h);
    } else if (e.shiftKey) {
      var targetIndex = self.getIndexByNodeId(node.h, 0);
      var firstIndex = 0;

      if (self.state.highlighted && self.state.highlighted.length > 0) {
        firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
      }

      var lastIndex = 0;

      if (self.state.highlighted && self.state.highlighted.length > 0) {
        lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], 0);
      }

      if (targetIndex < firstIndex) {
        firstIndex = targetIndex;
      }

      if (targetIndex > lastIndex) {
        lastIndex = targetIndex;
      }

      var highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);
      self.setSelectedAndHighlighted(highlighted, node.h);
    } else if (e.ctrlKey || e.metaKey) {
      if (!self.state.highlighted || self.state.highlighted.indexOf(node.h) === -1) {
        var highlighted = clone(self.state.highlighted || []);

        if (self.props.folderSelectNotAllowed) {
          if (node.t === 1 && highlighted.length > 0) {
            return;
          } else if (highlighted.filter(function (nodeId) {
            var node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          }).length > 0) {
            highlighted = [];
          }
        }

        highlighted.push(node.h);
        self.setSelectedAndHighlighted(highlighted, node.h);
      } else if (self.state.highlighted && self.state.highlighted.indexOf(node.h) !== -1) {
        var highlighted = clone(self.state.highlighted || []);

        if (self.props.folderSelectNotAllowed) {
          if (node.t === 1) {
            return;
          } else if (highlighted.filter(function (nodeId) {
            var node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          }).length > 0) {
            highlighted = [];
          }
        }

        array.remove(highlighted, node.h);
        self.setSelectedAndHighlighted(highlighted, highlighted.length == 0 ? false : highlighted[0]);
      }
    }
  };

  _proto.expandFolder = function expandFolder(nodeId) {
    var self = this;
    var node = M.getNodeByHandle(nodeId);

    if (node) {
      self.lastCharKeyPressed = false;
      self.lastCharKeyIndex = -1;
      self.setState({
        'selected': [],
        'highlighted': [],
        'cursor': false
      });
      self.props.onSelected([]);
      self.props.onHighlighted([]);
      self.props.onExpand(node);
      self.forceUpdate();
    }
  };

  _proto.onEntryDoubleClick = function onEntryDoubleClick(e, node) {
    var self = this;
    self.lastCharKeyPressed = false;
    self.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();
    var share = M.getNodeShare(node);

    if (share && share.down) {
      return;
    }

    if (node.t) {
      self.setState({
        'selected': [],
        'highlighted': [],
        'cursor': false
      });
      self.props.onSelected([]);
      self.props.onHighlighted([]);
      self.props.onExpand(node);
      self.forceUpdate();
    } else {
      self.onEntryClick(e, node);
      self.props.onSelected(self.state.selected);
      self.props.onAttachClicked(self.state.selected);
    }
  };

  _proto.customIsEventuallyVisible = function customIsEventuallyVisible() {
    return true;
  };

  _proto.render = function render() {
    var self = this;
    var items = [];
    var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";
    var imagesThatRequireLoading = [];
    self.props.entries.forEach(function (node) {
      if (node.t !== 0 && node.t !== 1) {
        return;
      }

      if (!node.name) {
        return;
      }

      var isFolder = node.t;
      var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;
      var fileIconType = fileIcon(node);
      var sharedFolderClass = '';

      if (fileIconType === 'puf-folder' || fileIconType === 'folder-shared') {
        sharedFolderClass = fileIconType;
      }

      var icon = external_React_default.a.createElement("span", {
        className: "transfer-filetype-icon " + (isFolder ? " folder " : "") + '' + fileIconType
      }, " ");
      var image = null;
      var src = null;

      if ((is_image(node) || is_video(node)) && node.fa) {
        src = thumbnails[node.h];

        if (!src) {
          node.imgId = "chat_" + node.h;
          imagesThatRequireLoading.push(node);

          if (!node.seen) {
            node.seen = 1;
          }

          src = window.noThumbURI || '';
        }

        icon = external_React_default.a.createElement(tooltips["a" ].Tooltip, {
          withArrow: true
        }, external_React_default.a.createElement(tooltips["a" ].Handler, {
          className: "transfer-filetype-icon " + fileIcon(node)
        }, " "), external_React_default.a.createElement(tooltips["a" ].Contents, {
          className: "img-preview"
        }, external_React_default.a.createElement("div", {
          className: "dropdown img-wrapper img-block",
          id: node.h
        }, external_React_default.a.createElement("img", {
          alt: "",
          className: "thumbnail-placeholder " + node.h,
          src: src,
          width: "156",
          height: "156"
        }))));

        if (src) {
          image = external_React_default.a.createElement("img", {
            alt: "",
            src: src
          });
        } else {
          image = external_React_default.a.createElement("img", {
            alt: ""
          });
        }
      }

      var share = M.getNodeShare(node);
      var hasPublicLink = null;
      var classLinked = null;

      if (share) {
        classLinked = 'linked';
        hasPublicLink = external_React_default.a.createElement("span", {
          className: "data-item-icon public-link-icon"
        });
      }

      if (viewMode === "0") {
        items.push(external_React_default.a.createElement("tr", {
          className: "node_" + node.h + (isFolder ? " folder" : "") + (isHighlighted ? " ui-selected" : "") + (share && share.down ? " taken-down" : ""),
          onClick: function onClick(e) {
            self.onEntryClick(e, node);
          },
          onDoubleClick: function onDoubleClick(e) {
            self.onEntryDoubleClick(e, node);
          },
          key: node.h
        }, external_React_default.a.createElement("td", null, external_React_default.a.createElement("span", {
          className: "grid-status-icon" + (node.fav ? " star" : "")
        })), external_React_default.a.createElement("td", null, icon, external_React_default.a.createElement("span", {
          className: "tranfer-filetype-txt"
        }, node.name)), external_React_default.a.createElement("td", null, !isFolder ? bytesToSize(node.s) : ""), external_React_default.a.createElement("td", {
          className: classLinked
        }, time2date(node.ts), " ", hasPublicLink)));
      } else {
        var playtime = MediaAttribute(node).data.playtime;

        if (playtime) {
          playtime = secondsToTimeShort(playtime);
        }

        var colorLabelClasses = "";

        if (node.lbl) {
          var colourLabel = M.getLabelClassFromId(node.lbl);
          colorLabelClasses += ' colour-label';
          colorLabelClasses += ' ' + colourLabel;
        }

        items.push(external_React_default.a.createElement("div", {
          className: "data-block-view node_" + node.h + (isFolder ? " folder" : " file") + (isHighlighted ? " ui-selected" : "") + (share ? " linked" : "") + (share && share.down ? " taken-down" : "") + (colorLabelClasses && " " + colorLabelClasses),
          onClick: function onClick(e) {
            self.onEntryClick(e, node);
          },
          onDoubleClick: function onDoubleClick(e) {
            self.onEntryDoubleClick(e, node);
          },
          id: "chat_" + node.h,
          key: "block_" + node.h,
          title: node.name
        }, external_React_default.a.createElement("div", {
          className: (src ? "data-block-bg thumb" : "data-block-bg") + (is_video(node) ? " video" : "")
        }, external_React_default.a.createElement("div", {
          className: "data-block-indicators"
        }, external_React_default.a.createElement("div", {
          className: "file-status-icon indicator" + (node.fav ? " star" : "")
        }), external_React_default.a.createElement("div", {
          className: "data-item-icon indicator"
        })), external_React_default.a.createElement("div", {
          className: "block-view-file-type " + (isFolder ? " folder " : " file " + fileIcon(node)) + sharedFolderClass
        }, image), is_video(node) ? external_React_default.a.createElement("div", {
          className: "video-thumb-details"
        }, external_React_default.a.createElement("i", {
          className: "small-icon small-play-icon"
        }), external_React_default.a.createElement("span", null, playtime ? playtime : "00:00")) : null), external_React_default.a.createElement("div", {
          className: "file-block-title"
        }, node.name)));
      }
    });

    if (imagesThatRequireLoading.length > 0) {
      fm_thumbnails('standalone', imagesThatRequireLoading);
    }

    if (items.length > 0) {
      if (viewMode === "0") {
        return external_React_default.a.createElement(utils["default"].JScrollPane, {
          className: "fm-dialog-scroll grid",
          selected: this.state.selected,
          highlighted: this.state.highlighted,
          entries: this.props.entries,
          ref: function ref(jsp) {
            self.jsp = jsp;
          }
        }, external_React_default.a.createElement("table", {
          className: "grid-table fm-dialog-table"
        }, external_React_default.a.createElement("tbody", null, items)));
      } else {
        return external_React_default.a.createElement(utils["default"].JScrollPane, {
          className: "fm-dialog-scroll blocks",
          selected: this.state.selected,
          highlighted: this.state.highlighted,
          entries: this.props.entries,
          ref: function ref(jsp) {
            self.jsp = jsp;
          }
        }, external_React_default.a.createElement("div", {
          className: "content"
        }, items, external_React_default.a.createElement("div", {
          className: "clear"
        })));
      }
    } else if (self.props.isLoading) {
      return external_React_default.a.createElement("div", {
        className: "dialog-empty-block dialog-fm folder"
      }, external_React_default.a.createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default.a.createElement("div", {
        className: "dialog-empty-icon"
      }), external_React_default.a.createElement("div", {
        className: "dialog-empty-header"
      }, __(l[5533]))));
    } else if (!self.props.entries.length && self.props.currentlyViewedEntry === 'search') {
      return external_React_default.a.createElement("div", {
        className: "dialog-empty-block dialog-fm folder"
      }, external_React_default.a.createElement("div", {
        className: "dialog-empty-pad"
      }, external_React_default.a.createElement("div", {
        className: "fm-empty-search-bg"
      }), external_React_default.a.createElement("div", {
        className: "dialog-empty-header"
      }, l[978])));
    }

    return external_React_default.a.createElement("div", {
      className: "dialog-empty-block dialog-fm folder"
    }, self.props.currentlyViewedEntry === 'shares' ? external_React_default.a.createElement("div", {
      className: "dialog-empty-pad"
    }, external_React_default.a.createElement("div", {
      className: "fm-empty-incoming-bg"
    }), external_React_default.a.createElement("div", {
      className: "dialog-empty-header"
    }, l[6871])) : external_React_default.a.createElement("div", {
      className: "dialog-empty-pad"
    }, external_React_default.a.createElement("div", {
      className: "fm-empty-folder-bg"
    }), external_React_default.a.createElement("div", {
      className: "dialog-empty-header"
    }, self.props.currentlyViewedEntry === M.RootID ? l[1343] : l[782])));
  };

  return BrowserEntries;
}(mixins["MegaRenderMixin"]);

cloudBrowserModalDialog_BrowserEntries.defaultProps = {
  'hideable': true,
  'requiresUpdateOnResize': true
};

var cloudBrowserModalDialog_CloudBrowserDialog = function (_MegaRenderMixin2) {
  inherits(CloudBrowserDialog, _MegaRenderMixin2);

  function CloudBrowserDialog(props) {
    var _this2 = _MegaRenderMixin2.call(this, props) || this;

    _this2.state = {
      'sortBy': ['name', 'asc'],
      'selected': [],
      'highlighted': [],
      'currentlyViewedEntry': M.RootID,
      'selectedTab': 'clouddrive',
      'searchValue': '',
      'entries': null
    };
    _this2.state.entries = _this2.getEntries();
    _this2.onAttachClicked = _this2.onAttachClicked.bind((_this2));
    _this2.onClearSearchIconClick = _this2.onClearSearchIconClick.bind((_this2));
    _this2.onHighlighted = _this2.onHighlighted.bind((_this2));
    _this2.onPopupDidMount = _this2.onPopupDidMount.bind((_this2));
    _this2.onSearchChange = _this2.onSearchChange.bind((_this2));
    _this2.onSearchIconClick = _this2.onSearchIconClick.bind((_this2));
    _this2.onSelected = _this2.onSelected.bind((_this2));
    _this2.handleTabChange = _this2.handleTabChange.bind((_this2));
    _this2.onViewButtonClick = _this2.onViewButtonClick.bind((_this2));
    _this2.toggleSortBy = _this2.toggleSortBy.bind((_this2));
    return _this2;
  }

  var _proto2 = CloudBrowserDialog.prototype;

  _proto2.isSearch = function isSearch() {
    return this.state.currentlyViewedEntry === 'search';
  };

  _proto2.clearSelectionAndHighlight = function clearSelectionAndHighlight() {
    this.onSelected([]);
    this.onHighlighted([]);
  };

  _proto2.getBreadcrumbNodeIcon = function getBreadcrumbNodeIcon(nodeId) {
    switch (nodeId) {
      case M.RootID:
        return 'cloud-drive';

      case M.RubbishID:
        return 'recycle-item';

      case M.InboxID:
        return 'inbox-item';

      case 'shares':
        return 'contacts-item';

      default:
        return nodeId && M.d[nodeId] && fileIcon(M.d[nodeId]);
    }
  };

  _proto2.getBreadcrumbNodeText = function getBreadcrumbNodeText(nodeId, prevNodeId) {
    switch (nodeId) {
      case M.RootID:
        return __(l[164]);

      case M.RubbishID:
        return __(l[167]);

      case M.InboxID:
        return __(l[166]);

      case 'shares':
        return prevNodeId && M.d[prevNodeId] ? M.d[prevNodeId].m : __(l[5589]);

      default:
        return M.d[nodeId] && M.d[nodeId].name;
    }
  };

  _proto2.toggleSortBy = function toggleSortBy(colId) {
    var newState = {};

    if (this.state.sortBy[0] === colId) {
      newState.sortBy = [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"];
    } else {
      newState.sortBy = [colId, "asc"];
    }

    newState.entries = this.getEntries(newState);
    this.setState(newState);
  };

  _proto2.onViewButtonClick = function onViewButtonClick(e) {
    var self = this;
    var $this = $(e.target);

    if ($this.hasClass("active")) {
      return false;
    }

    if ($this.hasClass("block-view")) {
      localStorage.dialogViewMode = "1";
    } else {
      localStorage.dialogViewMode = "0";
    }

    self.setState({
      entries: self.getEntries(),
      selected: self.state.selected,
      highlighted: self.state.highlighted
    });
    $this.parent().find('.active').removeClass("active");
    $this.addClass("active");
  };

  _proto2.onSearchIconClick = function onSearchIconClick(e) {
    var $parentBlock = $(e.target).closest(".fm-header-buttons");

    if ($parentBlock.hasClass("active-search")) {
      $parentBlock.removeClass("active-search");
    } else {
      $parentBlock.addClass("active-search");
      $('input', $parentBlock).trigger("focus");
    }
  };

  _proto2.onClearSearchIconClick = function onClearSearchIconClick() {
    var self = this;
    self.setState({
      'searchValue': '',
      'currentlyViewedEntry': M.RootID
    });
  };

  _proto2.onBreadcrumbNodeClick = function onBreadcrumbNodeClick(e, nodeId) {
    var _this3 = this;

    e.preventDefault();
    e.stopPropagation();

    if (nodeId === 'shares') {
      return this.handleTabChange('shares');
    }

    if (M.d[nodeId] && M.d[nodeId].t) {
      this.setState({
        selectedTab: M.d[nodeId].p ? 'shares' : 'clouddrive',
        currentlyViewedEntry: nodeId,
        selected: [],
        searchValue: ''
      }, function () {
        return _this3.clearSelectionAndHighlight();
      });
    }
  };

  _proto2.handleTabChange = function handleTabChange(selectedTab) {
    var _this4 = this;

    this.setState({
      selectedTab: selectedTab,
      currentlyViewedEntry: selectedTab === 'shares' ? 'shares' : M.RootID,
      searchValue: '',
      isLoading: false
    }, function () {
      return _this4.clearSelectionAndHighlight();
    });
  };

  _proto2.onSearchChange = function onSearchChange(e) {
    var searchValue = e.target.value;
    var newState = {
      'searchValue': searchValue
    };

    if (searchValue && searchValue.length >= 3) {
      newState['currentlyViewedEntry'] = 'search';
    } else if (this.state.currentlyViewedEntry === 'search') {
      if (!searchValue || searchValue.length < 3) {
        newState['currentlyViewedEntry'] = M.RootID;
      }
    }

    this.setState(newState);
    this.clearSelectionAndHighlight();
  };

  _proto2.resizeBreadcrumbs = function resizeBreadcrumbs() {
    var _this5 = this;

    Soon(function () {
      var $breadcrumbsWrapper = $('.fm-breadcrumbs-wrapper.add-from-cloud', _this5.findDOMNode());
      var $breadcrumbs = $('.fm-breadcrumbs-block', $breadcrumbsWrapper);
      var wrapperWidth = $breadcrumbsWrapper.outerWidth();
      var $el = $(_this5.isSearch() ? '.search-path-txt' : '.right-arrow-bg', $breadcrumbs);
      var i = 0;
      var j = 0;
      $el.removeClass('short-foldername ultra-short-foldername invisible');
      $breadcrumbsWrapper.removeClass('long-path overflowed-path');

      if ($breadcrumbs.outerWidth() > wrapperWidth) {
        $breadcrumbsWrapper.addClass('long-path');
      }

      while ($breadcrumbs.outerWidth() > wrapperWidth) {
        if (i < $el.length - 1) {
          $($el[i]).addClass('short-foldername');
          i++;
        } else if (j < $el.length - 1) {
          $($el[j]).addClass('ultra-short-foldername');
          j++;
        } else if (!$($el[j]).hasClass('short-foldername')) {
          $($el[j]).addClass('short-foldername');
        } else {
          $($el[j]).addClass('ultra-short-foldername');
          $breadcrumbsWrapper.addClass('overflowed-path');
          break;
        }
      }
    });
  };

  _proto2.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    if (prevState.currentlyViewedEntry !== this.state.currentlyViewedEntry) {
      var self = this;
      this.resizeBreadcrumbs();
      var handle = this.state.currentlyViewedEntry;

      if (handle === 'shares') {
        self.setState({
          'isLoading': true
        });
        dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).done(function () {
          self.setState({
            'isLoading': false,
            'entries': self.getEntries()
          });
        });
        return;
      }

      if (!M.d[handle] || M.d[handle].t && !M.c[handle]) {
        self.setState({
          'isLoading': true
        });
        dbfetch.get(handle).always(function () {
          self.setState({
            'isLoading': false,
            'entries': self.getEntries()
          });
        });
        return;
      }

      var $jspElem = $(self.findDOMNode()).find('.jspScrollable');

      if ($jspElem) {
        var $jsp = $jspElem.data('jsp');

        if ($jsp) {
          Soon(function () {
            $jsp.scrollTo(0, 0, false);
          });
        }
      }

      this.setState({
        entries: this.getEntries()
      });
    } else if (prevState.highlighted !== this.state.highlighted) {
      this.resizeBreadcrumbs();
    }
  };

  _proto2.getEntries = function getEntries(newState) {
    var self = this;
    var sortBy = newState && newState.sortBy || self.state.sortBy;
    var order = sortBy[1] === "asc" ? 1 : -1;
    var entries = [];

    if (self.state.currentlyViewedEntry === "search" && self.state.searchValue && self.state.searchValue.length >= 3) {
      M.getFilterBy(M.getFilterBySearchFn(self.state.searchValue)).forEach(function (n) {
        if (!n.h || n.h.length === 11) {
          return;
        }

        if (self.props.customFilterFn && !self.props.customFilterFn(n)) {
          return;
        }

        entries.push(n);
      });
    } else {
      Object.keys(M.c[self.state.currentlyViewedEntry] || {}).forEach(function (h) {
        if (M.d[h]) {
          if (self.props.customFilterFn) {
            if (self.props.customFilterFn(M.d[h])) {
              entries.push(M.d[h]);
            }
          } else {
            entries.push(M.d[h]);
          }
        }
      });
    }

    var sortFunc;

    if (sortBy[0] === "name") {
      sortFunc = M.getSortByNameFn();
    } else if (sortBy[0] === "size") {
      sortFunc = M.getSortBySizeFn();
    } else if (sortBy[0] === "ts") {
      sortFunc = M.getSortByDateTimeFn();
      order = order === 1 ? -1 : 1;
    } else {
        sortFunc = M.sortByFavFn(order);
      }

    var folders = [];

    for (var i = entries.length; i--;) {
      if (entries[i] && entries[i].t) {
        folders.unshift(entries[i]);
        entries.splice(i, 1);
      }
    }

    folders.sort(function (a, b) {
      return sortFunc(a, b, order);
    });
    entries.sort(function (a, b) {
      return sortFunc(a, b, order);
    });
    return folders.concat(entries);
  };

  _proto2.onSelected = function onSelected(nodes) {
    this.setState({
      'selected': nodes
    });
    this.props.onSelected(nodes);
  };

  _proto2.onHighlighted = function onHighlighted(nodes) {
    this.setState({
      'highlighted': nodes
    });

    if (this.props.onHighlighted) {
      this.props.onHighlighted(nodes);
    }
  };

  _proto2.onPopupDidMount = function onPopupDidMount(elem) {
    this.domNode = elem;
  };

  _proto2.onAttachClicked = function onAttachClicked() {
    this.props.onAttachClicked();
  };

  _proto2.render = function render() {
    var _this6 = this;

    var self = this;
    var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";
    var classes = "add-from-cloud " + self.props.className;
    var folderIsHighlighted = false;
    var share = false;
    var isIncomingShare = false;
    var breadcrumb = [];
    var entryId = self.isSearch() ? self.state.highlighted[0] : self.state.currentlyViewedEntry;

    if (entryId !== undefined) {
      M.getPath(entryId).forEach(function (nodeId, k, path) {
        var breadcrumbClasses = "";

        if (nodeId === M.RootID) {
          breadcrumbClasses += " cloud-drive";

          if (self.state.currentlyViewedEntry !== M.RootID) {
            breadcrumbClasses += " has-next-button";
          }
        } else {
          breadcrumbClasses += " folder";
        }

        if (k !== 0) {
          breadcrumbClasses += " has-next-button";
        }

        if (nodeId === "shares") {
          breadcrumbClasses += " shared-with-me";
        }

        var prevNodeId = path[k - 1];
        var nodeName = self.getBreadcrumbNodeText(nodeId, prevNodeId);
        var nodeIcon = self.getBreadcrumbNodeIcon(nodeId);
        isIncomingShare = nodeId === 'shares';

        (function (nodeId, k) {
          breadcrumb.unshift(self.isSearch() ? external_React_default.a.createElement("div", {
            className: "search-path-item",
            key: nodeId,
            onClick: function onClick(e) {
              return self.onBreadcrumbNodeClick(e, nodeId, prevNodeId);
            }
          }, external_React_default.a.createElement("div", {
            className: "search-tip simpletip",
            "data-simpletip": nodeName
          }, external_React_default.a.createElement("div", {
            className: "search-path-icon"
          }, external_React_default.a.createElement("span", {
            className: "search-path-icon-span " + nodeIcon
          })), external_React_default.a.createElement("div", {
            className: "search-path-txt"
          }, nodeName)), k !== 0 && external_React_default.a.createElement("div", {
            className: "search-path-arrow"
          })) : external_React_default.a.createElement("a", {
            className: "fm-breadcrumbs contains-directories " + breadcrumbClasses,
            key: nodeId,
            onClick: function onClick(e) {
              return self.onBreadcrumbNodeClick(e, nodeId, prevNodeId);
            }
          }, external_React_default.a.createElement("span", {
            className: "right-arrow-bg simpletip " + nodeIcon,
            "data-simpletip": nodeName
          }, external_React_default.a.createElement("span", null, nodeName))));
        })(nodeId, k);
      });
    }

    this.state.highlighted.forEach(function (nodeId) {
      if (M.d[nodeId] && M.d[nodeId].t === 1) {
        folderIsHighlighted = true;
      }

      share = M.getNodeShare(nodeId);
    });
    var buttons = [];

    if (!folderIsHighlighted || this.props.folderSelectable) {
      buttons.push({
        "label": this.props.selectLabel,
        "key": "select",
        "className": "default-grey-button " + (this.state.selected.length === 0 || share && share.down ? "disabled" : null),
        "onClick": function onClick(e) {
          if (_this6.state.selected.length > 0) {
            _this6.props.onSelected(_this6.state.selected.filter(function (node) {
              return !M.getNodeShare(node).down;
            }));

            _this6.props.onAttachClicked();
          }

          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    if (folderIsHighlighted) {
      var highlighted = this.state.highlighted;
      var className = "default-grey-button " + (share && share.down ? 'disabled' : null);
      var highlightedNode = highlighted && highlighted.length && highlighted[0];
      var allowAttachFolders = this.props.allowAttachFolders && !isIncomingShare && M.d[highlightedNode].u === u_handle && M.d[highlightedNode].su === undefined && M.getNodeShareUsers(highlightedNode, 'EXP').length === 0;
      buttons.push(allowAttachFolders ? {
        "label": l[8023],
        "key": "attach",
        className: className,
        onClick: function onClick() {
          _this6.props.onClose();

          onIdle(function () {
            var createPublicLink = function createPublicLink() {
              M.createPublicLink(highlightedNode).then(function (_ref2) {
                var link = _ref2.link;
                return _this6.props.room.sendMessage(link);
              });
            };

            return mega.megadrop.isDropExist(highlightedNode).length ? msgDialog('confirmation', l[1003], l[17403].replace('%1', escapeHTML(highlightedNode.name)), l[18229], function (e) {
              if (e) {
                mega.megadrop.pufRemove([highlightedNode]);
                mega.megadrop.pufCallbacks[highlightedNode] = {
                  del: createPublicLink
                };
              }
            }) : createPublicLink();
          });
        }
      } : null, {
        "label": this.props.openLabel,
        "key": "select",
        className: className,
        onClick: function onClick(e) {
          e.preventDefault();
          e.stopPropagation();

          _this6.setState({
            currentlyViewedEntry: highlightedNode
          });

          _this6.clearSelectionAndHighlight();

          _this6.browserEntries.setState({
            selected: [],
            searchValue: '',
            highlighted: []
          });
        }
      });
    }

    buttons.push({
      "label": this.props.cancelLabel,
      "key": "cancel",
      "onClick": function onClick(e) {
        _this6.props.onClose(_this6);

        e.preventDefault();
        e.stopPropagation();
      }
    });
    var gridHeader = [];

    if (viewMode === "0") {
      gridHeader.push(external_React_default.a.createElement("table", {
        className: "grid-table-header fm-dialog-table",
        key: "grid-table-header"
      }, external_React_default.a.createElement("tbody", null, external_React_default.a.createElement("tr", null, external_React_default.a.createElement(BrowserCol, {
        id: "grid-header-star",
        sortBy: self.state.sortBy,
        onClick: self.toggleSortBy
      }), external_React_default.a.createElement(BrowserCol, {
        id: "name",
        label: __(l[86]),
        sortBy: self.state.sortBy,
        onClick: self.toggleSortBy
      }), external_React_default.a.createElement(BrowserCol, {
        id: "size",
        label: __(l[87]),
        sortBy: self.state.sortBy,
        onClick: self.toggleSortBy
      }), external_React_default.a.createElement(BrowserCol, {
        id: "ts",
        label: __(l[16169]),
        sortBy: self.state.sortBy && self.state.sortBy[0] === "ts" ? ["ts", self.state.sortBy[1] === "desc" ? "asc" : "desc"] : self.state.sortBy,
        onClick: self.toggleSortBy
      })))));
    }

    var clearSearchBtn = null;

    if (self.state.searchValue.length >= 3) {
      clearSearchBtn = external_React_default.a.createElement("i", {
        className: "top-clear-button",
        style: {
          'right': '85px'
        },
        onClick: function onClick() {
          self.onClearSearchIconClick();
        }
      });
    }

    return external_React_default.a.createElement(modalDialogs["a" ].ModalDialog, {
      title: self.props.title || __(l[8011]),
      className: classes + (self.isSearch() && breadcrumb.length ? 'has-breadcrumbs-bottom' : ''),
      onClose: function onClose() {
        self.props.onClose(self);
      },
      popupDidMount: self.onPopupDidMount,
      buttons: buttons
    }, external_React_default.a.createElement("div", {
      className: "fm-dialog-tabs"
    }, external_React_default.a.createElement("div", {
      className: "\n                            fm-dialog-tab cloud\n                            " + (self.state.selectedTab === 'clouddrive' ? 'active' : '') + "\n                        ",
      onClick: function onClick() {
        return self.handleTabChange('clouddrive');
      }
    }, __(l[164])), external_React_default.a.createElement("div", {
      className: "\n                            fm-dialog-tab incoming\n                            " + (self.state.selectedTab === 'shares' ? 'active' : '') + "\n                        ",
      onClick: function onClick() {
        return self.handleTabChange('shares');
      }
    }, __(l[5542])), external_React_default.a.createElement("div", {
      className: "clear"
    })), external_React_default.a.createElement("div", {
      className: "fm-picker-header"
    }, external_React_default.a.createElement("div", {
      className: "fm-header-buttons"
    }, external_React_default.a.createElement("a", {
      className: "fm-files-view-icon block-view" + (viewMode === "1" ? " active" : ""),
      title: "Thumbnail view",
      onClick: function onClick(e) {
        self.onViewButtonClick(e);
      }
    }), external_React_default.a.createElement("a", {
      className: "fm-files-view-icon listing-view" + (viewMode === "0" ? " active" : ""),
      title: "List view",
      onClick: function onClick(e) {
        self.onViewButtonClick(e);
      }
    }), external_React_default.a.createElement("div", {
      className: "fm-files-search"
    }, external_React_default.a.createElement("i", {
      className: "search",
      onClick: function onClick(e) {
        self.onSearchIconClick(e);
      }
    }, ">"), external_React_default.a.createElement("input", {
      type: "search",
      placeholder: __(l[102]),
      value: self.state.searchValue,
      onChange: self.onSearchChange
    }), clearSearchBtn), external_React_default.a.createElement("div", {
      className: "clear"
    })), !self.isSearch() && external_React_default.a.createElement("div", {
      className: "fm-breadcrumbs-wrapper add-from-cloud"
    }, external_React_default.a.createElement("div", {
      className: "fm-breadcrumbs-block"
    }, breadcrumb, external_React_default.a.createElement("div", {
      className: "clear"
    })))), gridHeader, external_React_default.a.createElement(cloudBrowserModalDialog_BrowserEntries, {
      isLoading: self.state.isLoading,
      currentlyViewedEntry: self.state.currentlyViewedEntry,
      entries: self.state.entries || [],
      onExpand: function onExpand(node) {
        self.clearSelectionAndHighlight();
        self.setState({
          'currentlyViewedEntry': node.h,
          'searchValue': ''
        });
      },
      folderSelectNotAllowed: self.props.folderSelectNotAllowed,
      onSelected: self.onSelected,
      onHighlighted: self.onHighlighted,
      onAttachClicked: self.onAttachClicked,
      viewMode: localStorage.dialogViewMode,
      initialSelected: self.state.selected,
      initialHighlighted: self.state.highlighted,
      ref: function ref(browserEntries) {
        self.browserEntries = browserEntries;
      }
    }), external_React_default.a.createElement("div", {
      className: "\n                    fm-breadcrumbs-wrapper add-from-cloud breadcrumbs-bottom\n                    " + (self.isSearch() && breadcrumb.length ? '' : 'hidden') + "\n                "
    }, external_React_default.a.createElement("div", {
      className: "fm-breadcrumbs-block"
    }, breadcrumb, external_React_default.a.createElement("div", {
      className: "clear"
    }))));
  };

  return CloudBrowserDialog;
}(mixins["MegaRenderMixin"]);

cloudBrowserModalDialog_CloudBrowserDialog.defaultProps = {
  'selectLabel': __(l[8023]),
  'openLabel': __(l[1710]),
  'cancelLabel': __(l[82]),
  'hideable': true,
  className: ''
};
window.CloudBrowserModalDialogUI = {
  CloudBrowserDialog: cloudBrowserModalDialog_CloudBrowserDialog
};
var cloudBrowserModalDialog = ({
  CloudBrowserDialog: cloudBrowserModalDialog_CloudBrowserDialog
});
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var ui_dropdowns = __webpack_require__(3);

// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(5);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/extends.js
var helpers_extends = __webpack_require__(12);
var extends_default = __webpack_require__.n(helpers_extends);

// CONCATENATED MODULE: ./js/ui/emojiDropdown.jsx




var React = __webpack_require__(0);

var emojiDropdown_utils = __webpack_require__(6);



var DropdownsUI = __webpack_require__(3);

var PerfectScrollbar = __webpack_require__(13).PerfectScrollbar;

var emojiDropdown_DropdownEmojiSelector = function (_MegaRenderMixin) {
  inherits(DropdownEmojiSelector, _MegaRenderMixin);

  function DropdownEmojiSelector(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.data_categories = null;
    _this.data_emojis = null;
    _this.data_emojiByCategory = null;
    _this.customCategoriesOrder = ["frequently_used", "people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
    _this.frequentlyUsedEmojis = ['slight_smile', 'grinning', 'smile', 'wink', 'yum', 'rolling_eyes', 'stuck_out_tongue'];
    _this.heightDefs = {
      'categoryTitleHeight': 55,
      'emojiRowHeight': 35,
      'containerHeight': 302,
      'totalScrollHeight': 302,
      'numberOfEmojisPerRow': 9
    };
    _this.categoryLabels = {
      'frequently_used': l[17737],
      'people': l[8016],
      'objects': l[17735],
      'activity': l[8020],
      'nature': l[8017],
      'travel': l[8021],
      'symbols': l[17736],
      'food': l[8018],
      'flags': l[17703]
    };
    _this.state = _this.getInitialState();
    _this.onSearchChange = _this.onSearchChange.bind((_this));
    _this.onUserScroll = _this.onUserScroll.bind((_this));
    _this._onScrollChanged = _this._onScrollChanged.bind((_this));
    return _this;
  }

  var _proto = DropdownEmojiSelector.prototype;

  _proto.getInitialState = function getInitialState() {
    return clone({
      'previewEmoji': null,
      'searchValue': '',
      'browsingCategory': false,
      'isActive': false,
      'isLoading': true,
      'loadFailed': false,
      'visibleCategories': "0"
    });
  };

  _proto._generateEmoji = function _generateEmoji(meta) {
    var filename = twemoji.convert.toCodePoint(meta.u);
    return React.createElement("img", {
      width: "20",
      height: "20",
      className: "emoji emoji-loading",
      draggable: "false",
      alt: meta.u,
      title: ":" + meta.n + ":",
      onLoad: function onLoad(e) {
        e.target.classList.remove('emoji-loading');
      },
      onError: function onError(e) {
        e.target.classList.remove('emoji-loading');
        e.target.classList.add('emoji-loading-error');
      },
      src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
    });
  };

  _proto._generateEmojiElement = function _generateEmojiElement(emoji, cat) {
    var self = this;
    var categoryName = self.data_categories[cat];
    return React.createElement("div", {
      "data-emoji": emoji.n,
      className: "button square-button emoji",
      key: categoryName + "_" + emoji.n,
      onMouseEnter: function onMouseEnter(e) {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }

        e.stopPropagation();
        e.preventDefault();
        self.mouseEnterTimer = setTimeout(function () {
          self.setState({
            'previewEmoji': emoji
          });
        }, 250);
      },
      onMouseLeave: function onMouseLeave(e) {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }

        e.stopPropagation();
        e.preventDefault();
        self.setState({
          'previewEmoji': null
        });
      },
      onClick: function onClick(e) {
        if (self.props.onClick) {
          self.props.onClick(e, emoji.n, emoji);
        }
      }
    }, self._generateEmoji(emoji));
  };

  _proto.componentWillUpdate = function componentWillUpdate(nextProps, nextState) {
    if (nextState.searchValue !== this.state.searchValue || nextState.browsingCategories !== this.state.browsingCategories) {
      this._cachedNodes = {};

      if (this.scrollableArea) {
        this.scrollableArea.scrollToY(0);
      }

      this._onScrollChanged(0, nextState);
    }

    if (nextState.isActive === true) {
      var self = this;

      if (nextState.isLoading === true || !self.loadingPromise && (!self.data_categories || !self.data_emojis)) {
        self.loadingPromise = MegaPromise.allDone([megaChat.getEmojiDataSet('categories').done(function (categories) {
          self.data_categories = categories;
        }), megaChat.getEmojiDataSet('emojis').done(function (emojis) {
          self.data_emojis = emojis;
        })]).done(function (results) {
          if (!results[0] || results[0][1] && results[0][1] === "error" || !results[1] || results[1][1] && results[1][1] === "error") {
            if (d) {
              console.error("Emoji loading failed.", results);
            }

            self.setState({
              'loadFailed': true,
              'isLoading': false
            });
            return;
          }

          self.data_categories.push('frequently_used');
          self.data_categoriesWithCustomOrder = [];
          self.customCategoriesOrder.forEach(function (catName) {
            self.data_categoriesWithCustomOrder.push(self.data_categories.indexOf(catName));
          });
          self.data_emojiByCategory = {};
          var frequentlyUsedEmojisMeta = {};
          self.data_emojis.forEach(function (emoji) {
            var cat = emoji.c;

            if (!self.data_emojiByCategory[cat]) {
              self.data_emojiByCategory[cat] = [];
            }

            if (self.frequentlyUsedEmojis.indexOf(emoji.n) > -1) {
              frequentlyUsedEmojisMeta[emoji.n] = emoji.u;
            }

            emoji.element = self._generateEmojiElement(emoji, cat);
            self.data_emojiByCategory[cat].push(emoji);
          });
          self.data_emojiByCategory[8] = [];
          self.frequentlyUsedEmojis.forEach(function (slug) {
            var emoji = {
              'n': slug,
              'u': frequentlyUsedEmojisMeta[slug]
            };
            emoji.element = self._generateEmojiElement(emoji, 99);
            self.data_emojiByCategory[8].push(emoji);
          });

          self._onScrollChanged(0);

          self.setState({
            'isLoading': false
          });
        });
      }
    } else if (nextState.isActive === false) {
      var self = this;

      if (self.data_emojis) {
        self.data_emojis.forEach(function (emoji) {
          delete emoji.element;
        });
      }

      self.data_emojis = null;
      self.data_categories = null;
      self.data_emojiByCategory = null;
      self.loadingPromise = null;
    }
  };

  _proto.onSearchChange = function onSearchChange(e) {
    var self = this;
    self.setState({
      searchValue: e.target.value,
      browsingCategory: false
    });
  };

  _proto.onUserScroll = function onUserScroll($ps) {
    if (this.state.browsingCategory) {
      var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');

      if (!elementInViewport($cat)) {
        this.setState({
          'browsingCategory': false
        });
      }
    }

    this._onScrollChanged($ps.getScrollPositionY());
  };

  _proto.generateEmojiElementsByCategory = function generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
    var self = this;

    if (!self._cachedNodes) {
      self._cachedNodes = {};
    }

    if (!stateObj) {
      stateObj = self.state;
    }

    if (typeof self._cachedNodes[categoryId] !== 'undefined') {
      return self._cachedNodes[categoryId];
    }

    var categoryName = self.data_categories[categoryId];
    var emojis = [];
    var searchValue = stateObj.searchValue;
    var totalEmojis = 0;
    self.data_emojiByCategory[categoryId].forEach(function (meta) {
      var slug = meta.n;

      if (searchValue.length > 0) {
        if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
          return;
        }
      }

      totalEmojis++;
      emojis.push(meta.element);
    });

    if (emojis.length > 0) {
      var totalHeight = self.heightDefs.categoryTitleHeight + Math.ceil(totalEmojis / self.heightDefs.numberOfEmojisPerRow) * self.heightDefs.emojiRowHeight;
      return self._cachedNodes[categoryId] = [totalHeight, React.createElement("div", {
        key: categoryName,
        "data-category-name": categoryName,
        className: "emoji-category-container",
        style: {
          'position': 'absolute',
          'top': posTop
        }
      }, emojis.length > 0 ? React.createElement("div", {
        className: "clear"
      }) : null, React.createElement("div", {
        className: "emoji-type-txt"
      }, self.categoryLabels[categoryName] ? self.categoryLabels[categoryName] : categoryName), React.createElement("div", {
        className: "clear"
      }), emojis, React.createElement("div", {
        className: "clear"
      }))];
    } else {
      return self._cachedNodes[categoryId] = undefined;
    }
  };

  _proto._isVisible = function _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
    var visibleTop = elTop < scrollTop ? scrollTop : elTop;
    var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
    return visibleBottom - visibleTop > 0;
  };

  _proto._onScrollChanged = function _onScrollChanged(scrollPositionY, stateObj) {
    var self = this;

    if (!self.data_categoriesWithCustomOrder) {
      return;
    }

    if (scrollPositionY === false) {
      scrollPositionY = self.scrollableArea.getScrollPositionY();
    }

    if (!stateObj) {
      stateObj = self.state;
    }

    stateObj.searchValue;
    var visibleStart = scrollPositionY;
    var visibleEnd = visibleStart + self.heightDefs.containerHeight;
    var currentPos = 0;
    var visibleCategories = [];
    self._emojiReactElements = [];
    self.data_categoryPositions = {};
    self.data_categoriesWithCustomOrder.forEach(function (k) {
      var categoryDivMeta = self.generateEmojiElementsByCategory(k, currentPos, stateObj);

      if (categoryDivMeta) {
        var startPos = currentPos;
        currentPos += categoryDivMeta[0];
        var endPos = currentPos;
        self.data_categoryPositions[k] = startPos;

        if (self._isVisible(visibleStart, visibleEnd, startPos, endPos)) {
          visibleCategories.push(k);

          self._emojiReactElements.push(categoryDivMeta[1]);
        }
      }
    });

    if (self._emojiReactElements.length === 0) {
      var emojisNotFound = React.createElement("span", {
        className: "emojis-not-found",
        key: 'emojis-not-found'
      }, l[20920]);

      self._emojiReactElements.push(emojisNotFound);
    }

    visibleCategories = visibleCategories.join(',');
    self.setState({
      'totalScrollHeight': currentPos,
      'visibleCategories': visibleCategories
    });
  };

  _proto._renderEmojiPickerPopup = function _renderEmojiPickerPopup() {
    var self = this;
    var preview;

    if (self.state.previewEmoji) {
      var meta = self.state.previewEmoji;
      var slug = meta.n;

      if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {}

      preview = React.createElement("div", {
        className: "emoji-preview"
      }, self._generateEmoji(meta), React.createElement("div", {
        className: "emoji title"
      }, ":" + meta.n + ":"));
    }

    var categoryIcons = {
      "frequently_used": "clock-icon",
      "people": "smile-icon",
      "nature": "leaf-icon",
      "food": "cutlery-icon",
      "activity": "ball-icon",
      "travel": "car-icon",
      "objects": "bulb-icon",
      "symbols": "heart-icon",
      "flags": "flag-icon"
    };
    var categoryButtons = [];
    var activeCategoryName = false;

    if (!self.state.searchValue) {
      var firstActive = self.state.visibleCategories.split(",")[0];

      if (firstActive) {
        activeCategoryName = self.data_categories[firstActive];
      }
    }

    self.customCategoriesOrder.forEach(function (categoryName) {
      var activeClass = activeCategoryName === categoryName ? " active" : "";
      categoryButtons.push(React.createElement("div", {
        visiblecategories: self.state.visibleCategories,
        className: "button square-button emoji" + activeClass,
        key: categoryIcons[categoryName],
        onClick: function onClick(e) {
          e.stopPropagation();
          e.preventDefault();
          self.setState({
            browsingCategory: categoryName,
            searchValue: ''
          });
          self._cachedNodes = {};
          var categoryPosition = self.data_categoryPositions[self.data_categories.indexOf(categoryName)] + 10;
          self.scrollableArea.scrollToY(categoryPosition);

          self._onScrollChanged(categoryPosition);
        }
      }, React.createElement("i", {
        className: "small-icon " + categoryIcons[categoryName]
      })));
    });
    return React.createElement("div", null, React.createElement("div", {
      className: "popup-header emoji"
    }, preview ? preview : React.createElement("div", {
      className: "search-block emoji"
    }, React.createElement("i", {
      className: "small-icon search-icon"
    }), React.createElement("input", {
      type: "search",
      placeholder: __(l[102]),
      ref: "emojiSearchField",
      onChange: this.onSearchChange,
      value: this.state.searchValue
    }))), React.createElement(PerfectScrollbar, {
      className: "popup-scroll-area emoji perfectScrollbarContainer",
      searchValue: this.state.searchValue,
      onUserScroll: this.onUserScroll,
      visibleCategories: this.state.visibleCategories,
      ref: function ref(_ref) {
        self.scrollableArea = _ref;
      }
    }, React.createElement("div", {
      className: "popup-scroll-content emoji"
    }, React.createElement("div", {
      style: {
        height: self.state.totalScrollHeight
      }
    }, self._emojiReactElements))), React.createElement("div", {
      className: "popup-footer emoji"
    }, categoryButtons));
  };

  _proto.render = function render() {
    var self = this;
    var popupContents = null;

    if (self.state.isActive === true) {
      if (self.state.loadFailed === true) {
        popupContents = React.createElement("div", {
          className: "loading"
        }, l[1514]);
      } else if (self.state.isLoading === true && !self.data_emojiByCategory) {
        popupContents = React.createElement("div", {
          className: "loading"
        }, l[5533]);
      } else {
        popupContents = self._renderEmojiPickerPopup();
      }
    } else {
      popupContents = null;
    }

    return React.createElement(DropdownsUI.Dropdown, extends_default()({
      className: "popup emoji"
    }, self.props, {
      ref: "dropdown",
      isLoading: self.state.isLoading,
      loadFailed: self.state.loadFailed,
      visibleCategories: this.state.visibleCategories,
      forceShowWhenEmpty: true,
      onActiveChange: function onActiveChange(newValue) {
        if (newValue === false) {
          self.setState(self.getInitialState());
          self._cachedNodes = {};

          self._onScrollChanged(0);
        } else {
          self.setState({
            'isActive': true
          });
        }
      },
      searchValue: self.state.searchValue,
      browsingCategory: self.state.browsingCategory,
      previewEmoji: self.state.previewEmoji
    }), popupContents);
  };

  return DropdownEmojiSelector;
}(mixins["MegaRenderMixin"]);
emojiDropdown_DropdownEmojiSelector.defaultProps = {
  'requiresUpdateOnResize': true,
  'hideable': true
};
// CONCATENATED MODULE: ./js/chat/ui/emojiAutocomplete.jsx


var emojiAutocomplete_React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);



var ButtonsUI = __webpack_require__(8);

var emojiAutocomplete_EmojiAutocomplete = function (_MegaRenderMixin) {
  inherits(EmojiAutocomplete, _MegaRenderMixin);

  function EmojiAutocomplete(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      'selected': 0
    };
    _this.loading = false;
    _this.data_emojis = [];
    return _this;
  }

  var _proto = EmojiAutocomplete.prototype;

  _proto.preload_emojis = function preload_emojis() {
    var _this2 = this;

    if (this.loading === false) {
      this.loading = true;
      megaChat.getEmojiDataSet('emojis').then(function (emojis) {
        _this2.loading = 0;
        _this2.data_emojis = emojis;

        _this2.safeForceUpdate();
      });
    }
  };

  _proto.unbindKeyEvents = function unbindKeyEvents() {
    $(document).off('keydown.emojiAutocomplete' + this.getUniqueId());
  };

  _proto.bindKeyEvents = function bindKeyEvents() {
    var self = this;
    $(document).rebind('keydown.emojiAutocomplete' + self.getUniqueId(), function (e) {
      if (!self.props.emojiSearchQuery) {
        self.unbindKeyEvents();
        return;
      }

      var key = e.keyCode || e.which;

      if (!$(e.target).is("textarea")) {
        console.error("this should never happen.");
        return;
      }

      if (e.altKey || e.metaKey) {
        return;
      }

      var selected = $.isNumeric(self.state.selected) ? self.state.selected : 0;
      var handled = false;

      if (!e.shiftKey && (key === 37 || key === 38)) {
        selected = selected - 1;
        selected = selected < 0 ? self.maxFound - 1 : selected;

        if (self.found[selected] && self.state.selected !== selected) {
          self.setState({
            'selected': selected,
            'prefilled': true
          });
          handled = true;
          self.props.onPrefill(false, ":" + self.found[selected].n + ":");
        }
      } else if (!e.shiftKey && (key === 39 || key === 40 || key === 9)) {
        selected = selected + (key === 9 ? e.shiftKey ? -1 : 1 : 1);
        selected = selected < 0 ? Object.keys(self.found).length - 1 : selected;
        selected = selected >= self.props.maxEmojis || selected >= Object.keys(self.found).length ? 0 : selected;

        if (self.found[selected] && (key === 9 || self.state.selected !== selected)) {
          self.setState({
            'selected': selected,
            'prefilled': true
          });
          self.props.onPrefill(false, ":" + self.found[selected].n + ":");
          handled = true;
        }
      } else if (key === 13) {
        self.unbindKeyEvents();

        if (selected === -1) {
          if (self.found.length > 0) {
            for (var i = 0; i < self.found.length; i++) {
              if (":" + self.found[i].n + ":" === self.props.emojiSearchQuery + ":") {
                self.props.onSelect(false, ":" + self.found[0].n + ":");
                handled = true;
              }
            }
          }

          if (!handled && key === 13) {
            self.props.onCancel();
          }

          return;
        } else if (self.found.length > 0 && self.found[selected]) {
          self.props.onSelect(false, ":" + self.found[selected].n + ":");
          handled = true;
        } else {
          self.props.onCancel();
        }
      } else if (key === 27) {
        self.unbindKeyEvents();
        self.props.onCancel();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      } else {
        if (self.isMounted()) {
          self.setState({
            'prefilled': false
          });
        }
      }
    });
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    if (!this.props.emojiSearchQuery) {
      this.unbindKeyEvents();
    } else {
      this.bindKeyEvents();
    }
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    this.unbindKeyEvents();
  };

  _proto.render = function render() {
    var self = this;

    if (!self.props.emojiSearchQuery) {
      return null;
    }

    self.preload_emojis();

    if (self.loading) {
      return emojiAutocomplete_React.createElement("div", {
        className: "textarea-autofill-bl"
      }, emojiAutocomplete_React.createElement("div", {
        className: "textarea-autofill-info"
      }, l[5533]));
    }

    var q = self.props.emojiSearchQuery.substr(1, self.props.emojiSearchQuery.length);
    var exactMatch = [];
    var partialMatch = [];
    var emojis = self.data_emojis || [];

    for (var i = 0; i < emojis.length; i++) {
      var emoji = emojis[i];
      var match = emoji.n.indexOf(q);

      if (match !== -1) {
        if (match === 0) {
          exactMatch.push(emoji);
        } else if (partialMatch.length < self.props.maxEmojis - exactMatch.length) {
          partialMatch.push(emoji);
        }
      }

      if (exactMatch.length >= self.props.maxEmojis) {
        break;
      }
    }

    exactMatch.sort(function (a, b) {
      if (a.n === q) {
        return -1;
      } else if (b.n === q) {
        return 1;
      } else {
        return 0;
      }
    });
    var found = exactMatch.concat(partialMatch).slice(0, self.props.maxEmojis);
    exactMatch = partialMatch = null;
    this.maxFound = found.length;
    this.found = found;

    if (!found || found.length === 0) {
      setTimeout(function () {
        self.props.onCancel();
      }, 0);
      return null;
    }

    var emojisDomList = [];

    for (var i = 0; i < found.length; i++) {
      var meta = found[i];
      var filename = twemoji.convert.toCodePoint(meta.u);
      emojisDomList.push(emojiAutocomplete_React.createElement("div", {
        className: "emoji-preview shadow " + (this.state.selected === i ? "active" : ""),
        key: meta.n + "_" + (this.state.selected === i ? "selected" : "inselected"),
        title: ":" + meta.n + ":",
        onClick: function onClick(e) {
          self.props.onSelect(e, e.target.title);
          self.unbindKeyEvents();
        }
      }, emojiAutocomplete_React.createElement("img", {
        width: "20",
        height: "20",
        className: "emoji emoji-loading",
        draggable: "false",
        alt: meta.u,
        onLoad: function onLoad(e) {
          e.target.classList.remove('emoji-loading');
        },
        onError: function onError(e) {
          e.target.classList.remove('emoji-loading');
          e.target.classList.add('emoji-loading-error');
        },
        src: staticpath + "images/mega/twemojis/2_v2/72x72/" + filename + ".png"
      }), emojiAutocomplete_React.createElement("div", {
        className: "emoji title"
      }, ":" + meta.n + ":")));
    }

    return emojiAutocomplete_React.createElement("div", {
      className: "textarea-autofill-bl"
    }, emojiAutocomplete_React.createElement("div", {
      className: "textarea-autofill-info"
    }, emojiAutocomplete_React.createElement("strong", null, "tab"), " or  ", emojiAutocomplete_React.createElement("i", {
      className: "small-icon tab-icon"
    }), " to navigate", emojiAutocomplete_React.createElement("i", {
      className: "small-icon enter-icon left-pad"
    }), " to select ", emojiAutocomplete_React.createElement("strong", {
      className: "left-pad"
    }, "esc"), "to dismiss"), emojiAutocomplete_React.createElement("div", {
      className: "textarea-autofill-emoji"
    }, emojisDomList));
  };

  return EmojiAutocomplete;
}(mixins["MegaRenderMixin"]);
emojiAutocomplete_EmojiAutocomplete.defaultProps = {
  'requiresUpdateOnResize': true,
  'emojiSearchQuery': false,
  'disableCheckingVisibility': true,
  'maxEmojis': 12
};
// CONCATENATED MODULE: ./js/chat/ui/typingArea.jsx



var _dec, _dec2, _class, _class2, _temp;

var typingArea_React = __webpack_require__(0);

var typingArea_ReactDOM = __webpack_require__(7);





var typingArea_TypingArea = (_dec = Object(mixins["SoonFcWrap"])(60), _dec2 = Object(mixins["SoonFcWrap"])(54, true), (_class = (_temp = _class2 = function (_MegaRenderMixin) {
  inherits(TypingArea, _MegaRenderMixin);

  function TypingArea(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    var initialText = _this.props.initialText;
    _this.state = {
      emojiSearchQuery: false,
      typedMessage: initialText ? initialText : "",
      textareaHeight: 20
    };
    return _this;
  }

  var _proto = TypingArea.prototype;

  _proto.onEmojiClicked = function onEmojiClicked(e, slug) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    slug = slug[0] === ':' || slug.substr(-1) === ':' ? slug : ":" + slug + ":";
    var textarea = $('.messages-textarea', this.$container)[0];
    var cursorPosition = this.getCursorPosition(textarea);
    this.setState({
      typedMessage: this.state.typedMessage.slice(0, cursorPosition) + slug + this.state.typedMessage.slice(cursorPosition)
    }, function () {
      textarea.selectionEnd = cursorPosition + slug.length;
    });
  };

  _proto.stoppedTyping = function stoppedTyping() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }

    this.iAmTyping = false;
    this.props.chatRoom.trigger('stoppedTyping');
  };

  _proto.typing = function typing() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }

    var self = this;
    var now = Date.now();
    delay(this.getReactId(), function () {
      return self.iAmTyping && self.stoppedTyping();
    }, 4e3);

    if (!self.iAmTyping || now - self.lastTypingStamp > 4e3) {
      self.iAmTyping = true;
      self.lastTypingStamp = now;
      self.props.chatRoom.trigger('typing');
    }
  };

  _proto.triggerOnUpdate = function triggerOnUpdate(forced) {
    var self = this;

    if (!self.props.onUpdate || !self.isMounted()) {
      return;
    }

    var shouldTriggerUpdate = forced ? forced : false;

    if (!shouldTriggerUpdate && self.state.typedMessage !== self.lastTypedMessage) {
      self.lastTypedMessage = self.state.typedMessage;
      shouldTriggerUpdate = true;
    }

    if (!shouldTriggerUpdate) {
      var $textarea = $('.chat-textarea:visible textarea:visible', self.$container);

      if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
        self._lastTextareaHeight = $textarea.height();
        shouldTriggerUpdate = true;

        if (self.props.onResized) {
          self.props.onResized();
        }
      }
    }

    if (shouldTriggerUpdate) {
      self.props.onUpdate();
    }
  };

  _proto.onCancelClicked = function onCancelClicked() {
    var self = this;
    self.setState({
      typedMessage: ""
    });

    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }

    self.onConfirmTrigger(false);
    self.triggerOnUpdate();
  };

  _proto.onSaveClicked = function onSaveClicked() {
    var self = this;

    if (self.props.disabled || !self.isMounted()) {
      return;
    }

    var val = $.trim($('.chat-textarea:visible textarea:visible', self.$container).val());

    if (self.onConfirmTrigger(val) !== true) {
      self.setState({
        typedMessage: ""
      });
    }

    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }

    self.triggerOnUpdate();
  };

  _proto.onConfirmTrigger = function onConfirmTrigger(val) {
    var result = this.props.onConfirm(val);

    if (val !== false && result !== false) {
      var $node = $(this.findDOMNode());
      var $textareaScrollBlock = $('.textarea-scroll', $node);
      var jsp = $textareaScrollBlock.data('jsp');
      jsp.scrollToY(0);
      $('.jspPane', $textareaScrollBlock).css({
        'top': 0
      });
    }

    if (this.props.persist) {
      var megaChat = this.props.chatRoom.megaChat;

      if (megaChat.plugins.persistedTypeArea) {
        megaChat.plugins.persistedTypeArea.removePersistedTypedValue(this.props.chatRoom);
      }
    }

    return result;
  };

  _proto.onTypeAreaKeyDown = function onTypeAreaKeyDown(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    var self = this;
    var key = e.keyCode || e.which;
    var element = e.target;
    var val = $.trim(element.value);

    if (self.state.emojiSearchQuery) {
      return;
    }

    if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      if (e.isPropagationStopped() || e.isDefaultPrevented()) {
        return;
      }

      if (self.onConfirmTrigger(val) !== true) {
        self.setState({
          typedMessage: ""
        });
        $(document).trigger('closeDropdowns');
      }

      e.preventDefault();
      e.stopPropagation();

      if (self.props.chatRoom && self.iAmTyping) {
        self.stoppedTyping();
      }
    }
  };

  _proto.onTypeAreaKeyUp = function onTypeAreaKeyUp(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    var self = this;
    var key = e.keyCode || e.which;
    var element = e.target;
    var val = $.trim(element.value);

    if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      return;
    } else if (key === 13) {
      if (self.state.emojiSearchQuery) {
        return;
      }

      if (e.altKey) {
        var content = element.value;
        var cursorPos = self.getCursorPosition(element);
        content = content.substring(0, cursorPos) + "\n" + content.substring(cursorPos, content.length);
        self.setState({
          typedMessage: content
        });
        self.onUpdateCursorPosition = cursorPos + 1;
        e.preventDefault();
      } else if ($.trim(val).length === 0) {
        e.preventDefault();
      }
    } else if (key === 38) {
      if (self.state.emojiSearchQuery) {
        return;
      }

      if ($.trim(val).length === 0) {
        if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
          e.preventDefault();
          return;
        }
      }
    } else if (key === 27) {
      if (self.state.emojiSearchQuery) {
        return;
      }

      if (self.props.showButtons === true) {
        e.preventDefault();
        self.onCancelClicked(e);
        return;
      }
    } else {
      if (self.prefillMode && (key === 8 || key === 32 || key === 186 || key === 13)) {
        self.prefillMode = false;
      }

      var currentContent = element.value;
      var currentCursorPos = self.getCursorPosition(element) - 1;

      if (self.prefillMode && (currentCursorPos > self.state.emojiEndPos || currentCursorPos < self.state.emojiStartPos)) {
        self.prefillMode = false;
        self.setState({
          'emojiSearchQuery': false,
          'emojiStartPos': false,
          'emojiEndPos': false
        });
        return;
      }

      if (self.prefillMode) {
        return;
      }

      var char = String.fromCharCode(key);

      if (key === 16 || key === 17 || key === 18 || key === 91 || key === 8 || key === 37 || key === 39 || key === 40 || key === 38 || key === 9 || /[\w:-]/.test(char)) {
        var parsedResult = mega.utils.emojiCodeParser(currentContent, currentCursorPos);
        self.setState({
          'emojiSearchQuery': parsedResult[0],
          'emojiStartPos': parsedResult[1],
          'emojiEndPos': parsedResult[2]
        });
        return;
      }

      if (self.state.emojiSearchQuery) {
        self.setState({
          'emojiSearchQuery': false
        });
      }
    }

    self.updateScroll(true);
  };

  _proto.onTypeAreaBlur = function onTypeAreaBlur(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    var self = this;

    if (self.state.emojiSearchQuery) {
      setTimeout(function () {
        if (self.isMounted()) {
          self.setState({
            'emojiSearchQuery': false,
            'emojiStartPos': false,
            'emojiEndPos': false
          });
        }
      }, 300);
    }
  };

  _proto.onTypeAreaChange = function onTypeAreaChange(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    var self = this;

    if (self.state.typedMessage !== e.target.value) {
      self.setState({
        typedMessage: e.target.value
      });
      self.forceUpdate();
    }

    if ($.trim(e.target.value).length > 0) {
      self.typing();
    } else {
      self.stoppedTyping();
    }

    if (this.props.persist) {
      var megaChat = self.props.chatRoom.megaChat;

      if (megaChat.plugins.persistedTypeArea) {
        if ($.trim(e.target.value).length > 0) {
          megaChat.plugins.persistedTypeArea.updatePersistedTypedValue(self.props.chatRoom, e.target.value);
        } else {
          megaChat.plugins.persistedTypeArea.removePersistedTypedValue(self.props.chatRoom);
        }
      }
    }

    self.updateScroll(true);
  };

  _proto.focusTypeArea = function focusTypeArea() {
    if (this.props.disabled) {
      return;
    }

    if ($('.chat-textarea:visible textarea:visible', this.$container).length > 0 && !$('.chat-textarea:visible textarea:visible:first', this.$container).is(":focus")) {
      moveCursortoToEnd($('.chat-textarea:visible:first textarea', this.$container)[0]);
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    var self = this;
    this.$container = $(typingArea_ReactDOM.findDOMNode(this));
    chatGlobalEventManager.addEventListener('resize', 'typingArea' + self.getUniqueId(), function () {
      return self.handleWindowResize();
    });
    self._lastTextareaHeight = 20;

    if (self.props.initialText) {
      self.lastTypedMessage = this.props.initialText;
    }

    $('.jScrollPaneContainer', self.$container).rebind('forceResize.typingArea' + self.getUniqueId(), function () {
      self.updateScroll(false);
    });

    if (!this.scrollingInitialised) {
      this.initScrolling();
    }

    self.triggerOnUpdate(true);
    self.updateScroll(false);
  };

  _proto.componentWillMount = function componentWillMount() {
    var self = this;
    var chatRoom = self.props.chatRoom;
    var megaChat = chatRoom.megaChat;
    var initialText = self.props.initialText;

    if (this.props.persist && megaChat.plugins.persistedTypeArea) {
      if (!initialText) {
        megaChat.plugins.persistedTypeArea.getPersistedTypedValue(chatRoom).done(function (r) {
          if (typeof r != 'undefined') {
            if (!self.state.typedMessage && self.state.typedMessage !== r) {
              self.setState({
                'typedMessage': r
              });
            }
          }
        }).fail(function (e) {
          if (d) {
            console.warn("Failed to retrieve persistedTypeArea value for", chatRoom, "with error:", e);
          }
        });
      }

      megaChat.plugins.persistedTypeArea.data.rebind('onChange.typingArea' + self.getUniqueId(), function (e, k, v) {
        if (chatRoom.roomId == k) {
          self.setState({
            'typedMessage': v ? v : ""
          });
          self.triggerOnUpdate(true);
        }
      });
    }
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    var self = this;
    self.triggerOnUpdate();
    chatGlobalEventManager.removeEventListener('resize', 'typingArea' + self.getUniqueId());
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    var self = this;

    if (self.isComponentEventuallyVisible()) {
      if ($(document.querySelector('textarea:focus,select:focus,input:focus')).filter(":visible").length === 0) {
        this.focusTypeArea();
      }

      self.handleWindowResize();
    }

    if (!this.scrollingInitialised) {
      this.initScrolling();
    } else {
      this.updateScroll();
    }

    if (self.onUpdateCursorPosition) {
      var el = $('.chat-textarea:visible:first textarea:visible', self.$container)[0];
      el.selectionStart = el.selectionEnd = self.onUpdateCursorPosition;
      self.onUpdateCursorPosition = false;
    }
  };

  _proto.initScrolling = function initScrolling() {
    var self = this;
    self.scrollingInitialised = true;
    var $node = $(self.findDOMNode());
    var $textarea = $('textarea:first', $node);
    self.textareaLineHeight = parseInt($textarea.css('line-height'));
    var $textareaScrollBlock = $('.textarea-scroll', $node);
    $textareaScrollBlock.jScrollPane({
      enableKeyboardNavigation: false,
      showArrows: true,
      arrowSize: 5,
      animateScroll: false,
      maintainPosition: false
    });
  };

  _proto.getTextareaMaxHeight = function getTextareaMaxHeight() {
    var self = this;
    var textareaMaxHeight = self.props.textareaMaxHeight;

    if (String(textareaMaxHeight).indexOf("%") > -1) {
      textareaMaxHeight = (parseInt(textareaMaxHeight.replace("%", "")) || 0) / 100;

      if (textareaMaxHeight === 0) {
        textareaMaxHeight = 100;
      } else {
        var $messagesContainer = $('.messages-block:visible');
        textareaMaxHeight = $messagesContainer.height() * textareaMaxHeight;
      }
    }

    return textareaMaxHeight;
  };

  _proto.updateScroll = function updateScroll() {
    var self = this;

    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    var $node = self.$node = self.$node || $(self.findDOMNode());
    var $textarea = self.$textarea = self.$textarea || $('textarea:first', $node);
    var $textareaClone = self.$textareaClone = self.$textareaClone || $('.message-preview', $node);
    var textareaMaxHeight = self.getTextareaMaxHeight();
    var $textareaScrollBlock = self.$textareaScrollBlock = self.$textareaScrollBlock || $('.textarea-scroll', $node);
    var textareaContent = $textarea.val();
    var cursorPosition = self.getCursorPosition($textarea[0]);
    var $textareaCloneSpan;
    var scrPos = 0;
    var viewRatio = 0;

    if (self.lastContent === textareaContent && self.lastPosition === cursorPosition) {
      return;
    } else {
      self.lastContent = textareaContent;
      self.lastPosition = cursorPosition;
      textareaContent = '@[!' + textareaContent.substr(0, cursorPosition) + '!]@' + textareaContent.substr(cursorPosition, textareaContent.length);
      textareaContent = htmlentities(textareaContent);
      textareaContent = textareaContent.replace(/@\[!/g, '<span>');
      textareaContent = textareaContent.replace(/!\]@/g, '</span>');
      textareaContent = textareaContent.replace(/\n/g, '<br />');
      $textareaClone.html(textareaContent + '<br />');
    }

    var textareaCloneHeight = $textareaClone.height();
    $textarea.height(textareaCloneHeight);
    $textareaCloneSpan = $textareaClone.children('span');
    var textareaCloneSpanHeight = $textareaCloneSpan.height();
    var jsp = $textareaScrollBlock.data('jsp');

    if (!jsp) {
      $textareaScrollBlock.jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        animateScroll: false
      });
      var textareaIsFocused = $textarea.is(":focus");
      jsp = $textareaScrollBlock.data('jsp');

      if (!textareaIsFocused) {
        moveCursortoToEnd($textarea[0]);
      }
    }

    scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
    viewRatio = Math.round(textareaCloneSpanHeight + scrPos);
    $textareaScrollBlock.height(Math.min(textareaCloneHeight, textareaMaxHeight));
    var textareaWasFocusedBeforeReinit = $textarea.is(":focus");
    var selectionPos = false;

    if (textareaWasFocusedBeforeReinit) {
      selectionPos = [$textarea[0].selectionStart, $textarea[0].selectionEnd];
    }

    jsp.reinitialise();
    $textarea = $('textarea:first', $node);

    if (textareaWasFocusedBeforeReinit) {
      $textarea[0].selectionStart = selectionPos[0];
      $textarea[0].selectionEnd = selectionPos[1];
    }

    if (textareaCloneHeight > textareaMaxHeight && textareaCloneSpanHeight < textareaMaxHeight) {
      jsp.scrollToY(0);
    } else if (viewRatio > self.textareaLineHeight || viewRatio < 0) {
      if (textareaCloneSpanHeight > 0 && jsp && textareaCloneSpanHeight > textareaMaxHeight) {
        jsp.scrollToY(textareaCloneSpanHeight - self.textareaLineHeight);
      } else if (jsp) {
        jsp.scrollToY(0);

        if (scrPos < 0) {
          $textareaScrollBlock.find('.jspPane').css('top', 0);
        }
      }
    }

    if (textareaCloneHeight < textareaMaxHeight) {
      $textareaScrollBlock.addClass('noscroll');
    } else {
      $textareaScrollBlock.removeClass('noscroll');
    }

    if (textareaCloneHeight !== self.state.textareaHeight) {
      self.setState({
        'textareaHeight': textareaCloneHeight
      });

      if (self.props.onResized) {
        self.props.onResized();
      }
    } else {
      self.handleWindowResize();
    }
  };

  _proto.getCursorPosition = function getCursorPosition(el) {
    var pos = 0;

    if ('selectionStart' in el) {
      pos = el.selectionStart;
    } else if ('selection' in document) {
      el.focus();
      var sel = document.selection.createRange(),
          selLength = document.selection.createRange().text.length;
      sel.moveStart('character', -el.value.length);
      pos = sel.text.length - selLength;
    }

    return pos;
  };

  _proto.onTypeAreaSelect = function onTypeAreaSelect() {
    this.updateScroll(true);
  };

  _proto.customIsEventuallyVisible = function customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  };

  _proto.handleWindowResize = function handleWindowResize(e) {
    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    if (e) {
      this.updateScroll(false);
    }

    this.triggerOnUpdate();
  };

  _proto.isActive = function isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  };

  _proto.resetPrefillMode = function resetPrefillMode() {
    this.prefillMode = false;
  };

  _proto.onCopyCapture = function onCopyCapture() {
    this.resetPrefillMode();
  };

  _proto.onCutCapture = function onCutCapture() {
    this.resetPrefillMode();
  };

  _proto.onPasteCapture = function onPasteCapture() {
    this.resetPrefillMode();
  };

  _proto.render = function render() {
    var self = this;
    var room = this.props.chatRoom;
    var buttons = null;

    if (self.props.showButtons === true) {
      buttons = [typingArea_React.createElement(ui_buttons["Button"], {
        key: "save",
        className: "default-white-button right",
        icon: "",
        onClick: self.onSaveClicked.bind(self),
        label: __(l[776])
      }), typingArea_React.createElement(ui_buttons["Button"], {
        key: "cancel",
        className: "default-white-button right",
        icon: "",
        onClick: self.onCancelClicked.bind(self),
        label: __(l[1718])
      })];
    }

    var textareaStyles = {
      height: self.state.textareaHeight
    };
    var textareaScrollBlockStyles = {};
    var newHeight = Math.min(self.state.textareaHeight, self.getTextareaMaxHeight());

    if (newHeight > 0) {
      textareaScrollBlockStyles['height'] = newHeight;
    }

    var emojiAutocomplete = null;

    if (self.state.emojiSearchQuery) {
      emojiAutocomplete = typingArea_React.createElement(emojiAutocomplete_EmojiAutocomplete, {
        emojiSearchQuery: self.state.emojiSearchQuery,
        emojiStartPos: self.state.emojiStartPos,
        emojiEndPos: self.state.emojiEndPos,
        typedMessage: self.state.typedMessage,
        onPrefill: function onPrefill(e, emojiAlias) {
          if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
            var msg = self.state.typedMessage;
            var pre = msg.substr(0, self.state.emojiStartPos);
            var post = msg.substr(self.state.emojiEndPos + 1, msg.length);
            var startPos = self.state.emojiStartPos;
            var fwdPos = startPos + emojiAlias.length;
            var endPos = fwdPos;
            self.onUpdateCursorPosition = fwdPos;
            self.prefillMode = true;

            if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
              emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
              endPos -= 1;
            } else {
              post = post ? post.substr(0, 1) !== " " ? " " + post : post : " ";
              self.onUpdateCursorPosition++;
            }

            self.setState({
              'typedMessage': pre + emojiAlias + post,
              'emojiEndPos': endPos
            });
          }
        },
        onSelect: function onSelect(e, emojiAlias, forceSend) {
          if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
            var msg = self.state.typedMessage;
            var pre = msg.substr(0, self.state.emojiStartPos);
            var post = msg.substr(self.state.emojiEndPos + 1, msg.length);

            if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
              emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
            } else {
              post = post ? post.substr(0, 1) !== " " ? " " + post : post : " ";
            }

            var val = pre + emojiAlias + post;
            self.prefillMode = false;
            self.setState({
              'typedMessage': val,
              'emojiSearchQuery': false,
              'emojiStartPos': false,
              'emojiEndPos': false
            });

            if (forceSend) {
              if (self.onConfirmTrigger($.trim(val)) !== true) {
                self.setState({
                  typedMessage: ""
                });
              }
            }
          }
        },
        onCancel: function onCancel() {
          self.prefillMode = false;
          self.setState({
            'emojiSearchQuery': false,
            'emojiStartPos': false,
            'emojiEndPos': false
          });
        }
      });
    }

    var placeholder = l[18669];
    placeholder = placeholder.replace("%s", room.getRoomTitle(false, true));
    var disabledTextarea = room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false;
    return typingArea_React.createElement("div", {
      className: "typingarea-component" + self.props.className + (disabledTextarea ? " disabled" : "")
    }, typingArea_React.createElement("div", {
      className: "chat-textarea " + self.props.className
    }, emojiAutocomplete, self.props.children, typingArea_React.createElement(ui_buttons["Button"], {
      className: "popup-button",
      icon: "smiling-face",
      disabled: this.props.disabled
    }, typingArea_React.createElement(emojiDropdown_DropdownEmojiSelector, {
      className: "popup emoji",
      vertOffset: 17,
      onClick: self.onEmojiClicked.bind(self)
    })), typingArea_React.createElement("hr", null), typingArea_React.createElement("div", {
      className: "chat-textarea-scroll textarea-scroll jScrollPaneContainer",
      style: textareaScrollBlockStyles
    }, typingArea_React.createElement("textarea", {
      className: "messages-textarea",
      placeholder: placeholder,
      onKeyUp: self.onTypeAreaKeyUp.bind(self),
      onKeyDown: self.onTypeAreaKeyDown.bind(self),
      onBlur: self.onTypeAreaBlur.bind(self),
      onChange: self.onTypeAreaChange.bind(self),
      onSelect: self.onTypeAreaSelect.bind(self),
      value: self.state.typedMessage,
      ref: "typearea",
      style: textareaStyles,
      disabled: disabledTextarea ? true : false,
      readOnly: disabledTextarea ? true : false,
      onCopyCapture: self.onCopyCapture.bind(self),
      onPasteCapture: self.onPasteCapture.bind(self),
      onCutCapture: self.onCutCapture.bind(self)
    }), typingArea_React.createElement("div", {
      className: "message-preview"
    }))), buttons);
  };

  return TypingArea;
}(mixins["MegaRenderMixin"]), _class2.defaultProps = {
  'textareaMaxHeight': "40%"
}, _temp), (applyDecoratedDescriptor_default()(_class.prototype, "updateScroll", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "updateScroll"), _class.prototype), applyDecoratedDescriptor_default()(_class.prototype, "handleWindowResize", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "handleWindowResize"), _class.prototype)), _class));
// CONCATENATED MODULE: ./js/chat/ui/whosTyping.jsx


var whosTyping_React = __webpack_require__(0);

var whosTyping_ReactDOM = __webpack_require__(7);



var RenderDebugger = __webpack_require__(2).RenderDebugger;

var whosTyping_WhosTyping = function (_MegaRenderMixin) {
  inherits(WhosTyping, _MegaRenderMixin);

  function WhosTyping(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      currentlyTyping: {}
    };
    return _this;
  }

  var _proto = WhosTyping.prototype;

  _proto.componentWillMount = function componentWillMount() {
    var self = this;
    var chatRoom = self.props.chatRoom;
    self.props.chatRoom.megaChat;
    chatRoom.bind("onParticipantTyping.whosTyping", function (e, user_handle, bCastCode) {
      if (!self.isMounted()) {
        return;
      }

      if (user_handle === u_handle) {
        return;
      }

      var currentlyTyping = clone(self.state.currentlyTyping);
      var u_h = user_handle;

      if (u_h === u_handle) {
        return;
      } else if (!M.u[u_h]) {
        return;
      }

      if (currentlyTyping[u_h]) {
        clearTimeout(currentlyTyping[u_h][1]);
      }

      if (bCastCode === 1) {
        var timer = setTimeout(function (u_h) {
          self.stoppedTyping(u_h);
        }, 5000, u_h);
        currentlyTyping[u_h] = [unixtime(), timer];
        self.setState({
          currentlyTyping: currentlyTyping
        });
      } else {
        self.stoppedTyping(u_h);
      }

      self.forceUpdate();
    });
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom.megaChat;
    chatRoom.off("onParticipantTyping.whosTyping");
  };

  _proto.stoppedTyping = function stoppedTyping(u_h) {
    var self = this;

    if (self.state.currentlyTyping[u_h]) {
      var newState = clone(self.state.currentlyTyping);

      if (newState[u_h]) {
        clearTimeout(newState[u_h][1]);
      }

      delete newState[u_h];
      self.setState({
        currentlyTyping: newState
      });
    }
  };

  _proto.render = function render() {
    var self = this;
    var typingElement = null;

    if (Object.keys(self.state.currentlyTyping).length > 0) {
      var names = Object.keys(self.state.currentlyTyping).map(function (u_h) {
        var contact = M.u[u_h];

        if (contact && contact.firstName) {
          return contact.firstName;
        } else {
          var avatarMeta = generateAvatarMeta(u_h);
          return avatarMeta.fullName.split(" ")[0];
        }
      });
      var namesDisplay = "";
      var areMultipleUsersTyping = false;

      if (names.length > 1) {
        areMultipleUsersTyping = true;
        namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
      } else {
        areMultipleUsersTyping = false;
        namesDisplay = [names[0]];
      }

      var msg;

      if (areMultipleUsersTyping === true) {
        msg = __(l[8872]).replace("%1", namesDisplay[0]).replace("%2", namesDisplay[1]);
      } else {
        msg = __(l[8629]).replace("%1", namesDisplay[0]);
      }

      typingElement = whosTyping_React.createElement("div", {
        className: "typing-block"
      }, whosTyping_React.createElement("div", {
        className: "typing-text"
      }, msg), whosTyping_React.createElement("div", {
        className: "typing-bounce"
      }, whosTyping_React.createElement("div", {
        className: "typing-bounce1"
      }), whosTyping_React.createElement("div", {
        className: "typing-bounce2"
      }), whosTyping_React.createElement("div", {
        className: "typing-bounce3"
      })));
    }

    return typingElement;
  };

  return WhosTyping;
}(mixins["MegaRenderMixin"]);


// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(13);

// CONCATENATED MODULE: ./js/ui/accordion.jsx


var accordion_React = __webpack_require__(0);



var accordion_AccordionPanel = function (_MegaRenderMixin) {
  inherits(AccordionPanel, _MegaRenderMixin);

  function AccordionPanel() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = AccordionPanel.prototype;

  _proto.render = function render() {
    var self = this;
    var contentClass = self.props.className ? self.props.className : '';
    return accordion_React.createElement("div", {
      className: "chat-dropdown container"
    }, accordion_React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function onClick(e) {
        self.props.onToggle(e);
      }
    }, accordion_React.createElement("span", null, this.props.title), accordion_React.createElement("i", {
      className: "tiny-icon right-arrow"
    })), this.props.expanded ? accordion_React.createElement("div", {
      className: "chat-dropdown content have-animation " + contentClass
    }, this.props.children) : null);
  };

  return AccordionPanel;
}(mixins["MegaRenderMixin"]);

var accordion_Accordion = function (_MegaRenderMixin2) {
  inherits(Accordion, _MegaRenderMixin2);

  function Accordion(props) {
    var _this = _MegaRenderMixin2.call(this, props) || this;

    _this.state = {
      'expandedPanel': _this.props.expandedPanel
    };
    return _this;
  }

  var _proto2 = Accordion.prototype;

  _proto2.onToggle = function onToggle(e, key) {
    var obj = {};
    obj[key] = !(this.state.expandedPanel || {})[key];
    this.setState({
      'expandedPanel': obj
    });
    this.props.onToggle && this.props.onToggle(key);
  };

  _proto2.render = function render() {
    var self = this;
    var classes = "accordion-panels " + (self.props.className ? self.props.className : '');
    var accordionPanels = [];
    var x = 0;
    accordion_React.Children.forEach(self.props.children, function (child) {
      if (!child) {
        return;
      }

      if (child.type.name === 'AccordionPanel' || child.type.name && child.type.name.indexOf('AccordionPanel') > -1) {
        accordionPanels.push(accordion_React.cloneElement(child, {
          key: child.key,
          expanded: !!self.state.expandedPanel[child.key],
          accordion: self,
          onToggle: function onToggle(e) {
            self.onToggle(e, child.key);
          }
        }));
      } else {
        accordionPanels.push(accordion_React.cloneElement(child, {
          key: x++,
          accordion: self
        }));
      }
    });
    return accordion_React.createElement("div", {
      className: classes
    }, accordionPanels);
  };

  return Accordion;
}(mixins["MegaRenderMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/participantsList.jsx




var participantsList_DropdownsUI = __webpack_require__(3);

var ContactsUI = __webpack_require__(5);

var participantsList_PerfectScrollbar = __webpack_require__(13).PerfectScrollbar;

var participantsList_ParticipantsList = function (_MegaRenderMixin) {
  inherits(ParticipantsList, _MegaRenderMixin);

  function ParticipantsList(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      'scrollPositionY': 0,
      'scrollHeight': 144
    };
    _this.doResizesOnComponentUpdate = SoonFc(10, function () {
      var self = this;

      if (!self.isMounted()) {
        return;
      }

      var fitHeight = self.contactsListScroll.getContentHeight();

      if (!fitHeight) {
        return null;
      }

      var $node = $(self.findDOMNode());
      var $parentContainer = $node.closest('.chat-right-pad');
      var maxHeight = $parentContainer.outerHeight(true) - $('.chat-right-head', $parentContainer).outerHeight(true) - 72;

      if (fitHeight < $('.buttons-block', $parentContainer).outerHeight(true)) {
        fitHeight = Math.max(fitHeight, 53);
      } else if (maxHeight < fitHeight) {
        fitHeight = Math.max(maxHeight, 53);
      }

      fitHeight = Math.min(self.calculateListHeight($parentContainer), fitHeight);
      var $contactsList = $('.chat-contacts-list', $parentContainer);

      if ($contactsList.height() !== fitHeight) {
        $('.chat-contacts-list', $parentContainer).height(fitHeight);
        self.contactsListScroll.reinitialise();
      }

      if (self.state.scrollHeight !== fitHeight) {
        self.setState({
          'scrollHeight': fitHeight
        });
      }

      self.onUserScroll();
    });
    return _this;
  }

  var _proto = ParticipantsList.prototype;

  _proto.onUserScroll = function onUserScroll() {
    if (!this.contactsListScroll) {
      return;
    }

    var scrollPosY = this.contactsListScroll.getScrollPositionY();

    if (this.state.scrollPositionY !== scrollPosY) {
      this.setState({
        'scrollPositionY': scrollPosY
      });
    }
  };

  _proto.calculateListHeight = function calculateListHeight($parentContainer) {
    var room = this.props.chatRoom;
    return ($parentContainer ? $parentContainer : $('.conversationsApp')).outerHeight() - 144 - 10 - (room.type === "public" && room.observers > 0 ? 48 : 0) - (room.isReadOnly() ? 12 : 0);
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    if (!self.contactsListScroll) {
      return null;
    }

    self.doResizesOnComponentUpdate();
  };

  _proto.render = function render() {
    var self = this;
    var room = this.props.chatRoom;

    if (!room) {
      return null;
    }

    var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();
    var contactListStyles = {};
    contactListStyles.height = Math.min(this.calculateListHeight(), contacts.length * this.props.contactCardHeight);
    return external_React_default.a.createElement("div", {
      className: "chat-contacts-list",
      style: contactListStyles
    }, external_React_default.a.createElement(participantsList_PerfectScrollbar, {
      chatRoom: room,
      members: room.members,
      ref: function ref(_ref) {
        self.contactsListScroll = _ref;
      },
      disableCheckingVisibility: true,
      onUserScroll: SoonFc(self.onUserScroll.bind(self), 76),
      requiresUpdateOnResize: true,
      onAnimationEnd: function onAnimationEnd() {
        self.safeForceUpdate();
      },
      isVisible: self.props.chatRoom.isCurrentlyActive
    }, external_React_default.a.createElement(participantsList_ParticipantsListInner, {
      chatRoom: room,
      members: room.members,
      scrollPositionY: self.state.scrollPositionY,
      scrollHeight: self.state.scrollHeight,
      disableCheckingVisibility: true
    })));
  };

  return ParticipantsList;
}(mixins["MegaRenderMixin"]);

participantsList_ParticipantsList.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 36
};

var participantsList_ParticipantsListInner = function (_MegaRenderMixin2) {
  inherits(ParticipantsListInner, _MegaRenderMixin2);

  function ParticipantsListInner() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = ParticipantsListInner.prototype;

  _proto2.render = function render() {
    var room = this.props.chatRoom;
    var contactCardHeight = this.props.contactCardHeight;
    var scrollPositionY = this.props.scrollPositionY;
    var scrollHeight = this.props.scrollHeight;
    var _ChatRoom$MembersSet$ = ChatRoom.MembersSet.PRIVILEGE_STATE,
        FULL = _ChatRoom$MembersSet$.FULL,
        OPERATOR = _ChatRoom$MembersSet$.OPERATOR,
        READONLY = _ChatRoom$MembersSet$.READONLY;

    if (!room) {
      return null;
    }

    if (!room.isCurrentlyActive && room._leaving !== true) {
      return false;
    }

    var contacts = room.getParticipantsExceptMe();
    var contactsList = [];
    var firstVisibleUserNum = Math.floor(scrollPositionY / contactCardHeight);
    var visibleUsers = Math.ceil(scrollHeight / contactCardHeight);
    var contactListInnerStyles = {
      'height': contacts.length * contactCardHeight
    };

    if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving() && room.members.hasOwnProperty(u_handle)) {
      contacts.unshift(u_handle);
      contactListInnerStyles.height += contactCardHeight;
    }

    var onRemoveClicked = function onRemoveClicked(contactHash) {
      room.trigger('onRemoveUserRequest', [contactHash]);
    };

    var onSetPrivClicked = function onSetPrivClicked(contactHash, priv) {
      if (room.members[contactHash] !== priv) {
        room.trigger('alterUserPrivilege', [contactHash, priv]);
      }
    };

    for (var i = 0; i < contacts.length; i++) {
      var contactHash = contacts[i];
      var contact = M.u[contactHash];

      if (!contact) {
        continue;
      }

      if (i < firstVisibleUserNum || i > firstVisibleUserNum + visibleUsers) {
        continue;
      }

      var dropdowns = [];
      var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";
      var dropdownRemoveButton = [];

      if (room.type === "public" || room.type === "group" && room.members) {
        if (room.iAmOperator() && contactHash !== u_handle) {
          dropdownRemoveButton.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            className: "red",
            key: "remove",
            icon: "rounded-stop",
            label: __(l[8867]),
            onClick: onRemoveClicked.bind(this, contactHash)
          }));
        }

        if (room.iAmOperator() || contactHash === u_handle) {
          dropdowns.push(external_React_default.a.createElement("div", {
            key: "setPermLabel",
            className: "dropdown-items-info"
          }, __(l[8868])));
          dropdowns.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            key: "privOperator",
            icon: "gentleman",
            label: __(l[8875]),
            className: "tick-item " + (room.members[contactHash] === FULL ? "active" : ""),
            disabled: contactHash === u_handle,
            onClick: onSetPrivClicked.bind(this, contactHash, FULL)
          }));
          dropdowns.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            key: "privFullAcc",
            icon: "conversation-icon",
            className: "tick-item " + (room.members[contactHash] === OPERATOR ? "active" : ""),
            disabled: contactHash === u_handle,
            label: __(l[8874]),
            onClick: onSetPrivClicked.bind(this, contactHash, OPERATOR)
          }));
          dropdowns.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            key: "privReadOnly",
            icon: "eye-icon",
            className: "tick-item " + (room.members[contactHash] === READONLY ? "active" : ""),
            disabled: contactHash === u_handle,
            label: __(l[8873]),
            onClick: onSetPrivClicked.bind(this, contactHash, READONLY)
          }));
        }

        switch (room.members[contactHash]) {
          case FULL:
            dropdownIconClasses = "small-icon gentleman";
            break;

          case OPERATOR:
            dropdownIconClasses = "small-icon conversation-icon";
            break;

          case READONLY:
            dropdownIconClasses = "small-icon eye-icon";
            break;

          default:
            break;
        }

        contactsList.push(external_React_default.a.createElement(ContactsUI.ContactCard, {
          key: contact.u,
          contact: contact,
          chatRoom: room,
          className: "right-chat-contact-card",
          dropdownPositionMy: "left top",
          dropdownPositionAt: "left top",
          dropdowns: dropdowns,
          dropdownDisabled: contactHash === u_handle || anonymouschat,
          dropdownButtonClasses: "button icon-dropdown",
          dropdownRemoveButton: dropdownRemoveButton,
          dropdownIconClasses: dropdownIconClasses,
          noLoading: true,
          isInCall: room.uniqueCallParts && room.uniqueCallParts[contactHash],
          style: {
            width: 234,
            position: 'absolute',
            top: i * contactCardHeight
          }
        }));
      }
    }

    return external_React_default.a.createElement("div", {
      className: "chat-contacts-list-inner default-bg",
      style: contactListInnerStyles
    }, contactsList);
  };

  return ParticipantsListInner;
}(mixins["MegaRenderMixin"]);

participantsList_ParticipantsListInner.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 32,
  'scrollPositionY': 0,
  'scrollHeight': 128,
  'chatRoom': undefined
};

// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
var mixin = __webpack_require__(11);

// CONCATENATED MODULE: ./js/chat/ui/messages/abstractGenericMessage.jsx





var abstractGenericMessage_AbstractGenericMessage = function (_ConversationMessageM) {
  inherits(AbstractGenericMessage, _ConversationMessageM);

  function AbstractGenericMessage(props) {
    return _ConversationMessageM.call(this, props) || this;
  }

  var _proto = AbstractGenericMessage.prototype;

  _proto.getAvatar = function getAvatar() {
    var contact = this.getContact() || Message.getContactForMessage(this.props.message);

    if (this.props.grouped) {
      return null;
    }

    return contact ? external_React_default.a.createElement(ui_contacts["Avatar"], {
      contact: this.getContact(),
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: this.props.chatRoom
    }) : null;
  };

  _proto.getName = function getName() {
    var contact = this.getContact() || Message.getContactForMessage(this.props.message);

    if (this.props.grouped) {
      return null;
    }

    return contact ? external_React_default.a.createElement(ui_contacts["ContactButton"], {
      contact: contact,
      className: "message",
      label: M.getNameByHandle(contact.u),
      chatRoom: this.props.message.chatRoom
    }) : null;
  };

  _proto.render = function render() {
    var _this$props = this.props,
        message = _this$props.message,
        grouped = _this$props.grouped,
        additionalClasses = _this$props.additionalClasses;

    if (message.deleted) {
      return null;
    }

    return external_React_default.a.createElement("div", {
      "data-id": message.messageId,
      className: "\n                    " + (this.getClassNames ? this.getClassNames() : grouped ? 'grouped' : '') + "\n                    " + additionalClasses + "\n                    " + message.messageId + "\n                    message\n                    body\n                "
    }, this.getAvatar && this.getAvatar(), external_React_default.a.createElement("div", {
      className: "message content-area"
    }, this.getName && this.getName(), this.getMessageTimestamp ? this.getMessageTimestamp() : grouped ? null : external_React_default.a.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString()), this.getContents && this.getContents()));
  };

  return AbstractGenericMessage;
}(mixin["ConversationMessageMixin"]);


// EXTERNAL MODULE: ./js/chat/ui/messages/utils.jsx
var messages_utils = __webpack_require__(16);

// CONCATENATED MODULE: ./js/chat/ui/messages/types/local.jsx





var MESSAGE_TYPE = {
  OUTGOING: 'outgoing-call',
  INCOMING: 'incoming-call',
  TIMEOUT: 'call-timeout',
  STARTING: 'call-starting',
  FEEDBACK: 'call-feedback',
  INITIALISING: 'call-initialising',
  ENDED: 'call-ended',
  ENDED_REMOTE: 'remoteCallEnded',
  FAILED: 'call-failed',
  FAILED_MEDIA: 'call-failed-media',
  HANDLED_ELSEWHERE: 'call-handled-elsewhere',
  MISSED: 'call-missed',
  REJECTED: 'call-rejected',
  CANCELLED: 'call-canceled',
  STARTED: 'call-started',
  STARTED_REMOTE: 'remoteCallStarted',
  ALTER_PARTICIPANTS: 'alterParticipants',
  PRIVILEGE_CHANGE: 'privilegeChange',
  TRUNCATED: 'truncated'
};

var local_Local = function (_AbstractGenericMessa) {
  inherits(Local, _AbstractGenericMessa);

  function Local(props) {
    var _this = _AbstractGenericMessa.call(this, props) || this;

    _this._roomIsGroup = function () {
      return _this.props.message.chatRoom.type === 'group' || _this.props.message.chatRoom.type === 'public';
    };

    _this._getParticipantNames = function (message) {
      return message.meta && message.meta.participants && !!message.meta.participants.length && message.meta.participants.map(function (handle) {
        return "[[" + M.getNameByHandle(handle) + "]]";
      });
    };

    _this._getExtraInfo = function (message) {
      var participantNames = _this._getParticipantNames(message);

      var HAS_PARTICIPANTS = participantNames && !!participantNames.length;
      var ENDED = message.type === MESSAGE_TYPE.ENDED || message.type === MESSAGE_TYPE.FAILED;
      var HAS_DURATION = message.meta && message.meta.duration;
      var messageExtraInfo = [HAS_PARTICIPANTS ? mega.utils.trans.listToString(participantNames, l[20234]) : ''];

      if (ENDED && HAS_DURATION) {
        messageExtraInfo = [].concat(messageExtraInfo, [HAS_PARTICIPANTS ? '. ' : '', l[7208].replace('[X]', '[[' + secToDuration(message.meta.duration) + ']]')]);
      }

      return messageExtraInfo && messageExtraInfo.reduce(function (acc, cur) {
        return (acc + cur).replace(/\[\[/g, '<span class="bold">').replace(/]]/g, '</span>');
      });
    };

    return _this;
  }

  var _proto = Local.prototype;

  _proto.componentDidMount = function componentDidMount() {
    _AbstractGenericMessa.prototype.componentDidMount.call(this);

    this._setClassNames();
  };

  _proto._setClassNames = function _setClassNames() {
    var cssClass;

    switch (this.props.message.type) {
      case MESSAGE_TYPE.REJECTED:
        cssClass = 'handset-with-stop';
        break;

      case MESSAGE_TYPE.MISSED:
        cssClass = 'handset-with-yellow-arrow';
        break;

      case MESSAGE_TYPE.OUTGOING || MESSAGE_TYPE.HANDLED_ELSEWHERE:
        cssClass = 'handset-with-up-arrow';
        break;

      case MESSAGE_TYPE.FAILED:
        cssClass = 'handset-with-cross';
        break;

      case MESSAGE_TYPE.TIMEOUT:
        cssClass = 'horizontal-handset';
        break;

      case MESSAGE_TYPE.FAILED_MEDIA:
        cssClass = 'handset-with-yellow-cross';
        break;

      case MESSAGE_TYPE.CANCELLED:
        cssClass = 'crossed-handset';
        break;

      case MESSAGE_TYPE.ENDED:
        cssClass = 'horizontal-handset';
        break;

      case MESSAGE_TYPE.FEEDBACK || MESSAGE_TYPE.STARTING || MESSAGE_TYPE.STARTED:
        cssClass = 'diagonal-handset';
        break;

      case MESSAGE_TYPE.INCOMING:
        cssClass = 'handset-with-down-arrow';
        break;

      default:
        cssClass = this.props.message.type;
        break;
    }

    this.props.message.cssClass = cssClass;
  };

  _proto._getIcon = function _getIcon(message) {
    var _MESSAGE_ICONS;

    var MESSAGE_ICONS = (_MESSAGE_ICONS = {}, _MESSAGE_ICONS[MESSAGE_TYPE.STARTED] = '<i class="call-icon diagonal-handset green">&nbsp;</i>', _MESSAGE_ICONS[MESSAGE_TYPE.ENDED] = '<i class="call-icon big horizontal-handset grey">&nbsp;</i>', _MESSAGE_ICONS.DEFAULT = "<i class=\"call-icon " + message.cssClass + "\">&nbsp;</i>", _MESSAGE_ICONS);
    return MESSAGE_ICONS[message.type] || MESSAGE_ICONS.DEFAULT;
  };

  _proto._getText = function _getText() {
    var message = this.props.message;

    var IS_GROUP = this._roomIsGroup();

    var messageText = Object(messages_utils["getMessageString"])(message.type, IS_GROUP);

    if (!messageText) {
      return console.error("Message with type: " + message.type + " -- no text string defined. Message: " + message);
    }

    messageText = CallManager._getMultiStringTextContentsForMessage(message, messageText.splice ? messageText : [messageText], true);
    message.textContents = String(messageText).replace("[[", "<span class=\"bold\">").replace("]]", "</span>");

    if (IS_GROUP) {
      messageText = this._getIcon(message) + messageText;
      messageText = '<div class="bold mainMessage">' + messageText + "</div><div class=\"extraCallInfo\">" + this._getExtraInfo(message) + '</div>';
    }

    return messageText;
  };

  _proto._getAvatarsListing = function _getAvatarsListing() {
    var message = this.props.message;

    if (this._roomIsGroup() && message.type === MESSAGE_TYPE.STARTED && message.messageId === MESSAGE_TYPE.STARTED + "-" + message.chatRoom.getActiveCallMessageId()) {
      var unique = message.chatRoom.uniqueCallParts ? Object.keys(message.chatRoom.uniqueCallParts) : [];
      return unique.map(function (handle) {
        return external_React_default.a.createElement(ui_contacts["Avatar"], {
          key: handle,
          contact: M.u[handle],
          simpletip: M.u[handle] && M.u[handle].name,
          className: "message avatar-wrapper small-rounded-avatar"
        });
      });
    }

    return null;
  };

  _proto._getButtons = function _getButtons() {
    var message = this.props.message;

    if (message.buttons && Object.keys(message.buttons).length) {
      return external_React_default.a.createElement("div", {
        className: "buttons-block"
      }, Object.keys(message.buttons).map(function (key) {
        var button = message.buttons[key];
        return external_React_default.a.createElement("div", {
          key: key,
          className: button.classes,
          onClick: function onClick(e) {
            return button.callback(e.target);
          }
        }, button.icon && external_React_default.a.createElement("i", {
          className: "small-icon " + button.icon
        }), button.text);
      }), external_React_default.a.createElement("div", {
        className: "clear"
      }));
    }
  };

  _proto.getAvatar = function getAvatar() {
    var _this$props = this.props,
        message = _this$props.message,
        grouped = _this$props.grouped;
    var $$AVATAR = external_React_default.a.createElement(ui_contacts["Avatar"], {
      contact: message.authorContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: message.chatRoom
    });
    var $$ICON = external_React_default.a.createElement("div", {
      className: "feedback call-status-block"
    }, external_React_default.a.createElement("i", {
      className: "call-icon " + message.cssClass
    }));
    return message.showInitiatorAvatar ? grouped ? null : $$AVATAR : $$ICON;
  };

  _proto.getMessageTimestamp = function getMessageTimestamp() {
    return external_React_default.a.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString());
  };

  _proto.getClassNames = function getClassNames() {
    var _this$props2 = this.props,
        _this$props2$message = _this$props2.message,
        showInitiatorAvatar = _this$props2$message.showInitiatorAvatar,
        type = _this$props2$message.type,
        grouped = _this$props2.grouped;
    var classNames = [showInitiatorAvatar && grouped && 'grouped', this._roomIsGroup() && type !== MESSAGE_TYPE.OUTGOING && type !== MESSAGE_TYPE.INCOMING && 'with-border'];
    return classNames.filter(function (className) {
      return className;
    }).join(' ');
  };

  _proto.getName = function getName() {
    var _this$props3 = this.props,
        message = _this$props3.message,
        grouped = _this$props3.grouped;
    var contact = this.getContact();
    return message.showInitiatorAvatar && !grouped ? external_React_default.a.createElement(ui_contacts["ContactButton"], {
      contact: contact,
      className: "message",
      label: M.getNameByHandle(message.authorContact.u),
      chatRoom: message.chatRoom
    }) : M.getNameByHandle(contact.u);
  };

  _proto.getContents = function getContents() {
    var getState = this.props.message.getState;
    return external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement("div", {
      className: "message text-block"
    }, external_React_default.a.createElement("div", {
      className: "message call-inner-block"
    }, this._getAvatarsListing(), external_React_default.a.createElement("div", {
      dangerouslySetInnerHTML: {
        __html: this._getText()
      }
    }))), getState && getState() === Message.STATE.NOT_SENT ? null : this._getButtons());
  };

  return Local;
}(abstractGenericMessage_AbstractGenericMessage);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/contact.jsx







var contact_Contact = function (_AbstractGenericMessa) {
  inherits(Contact, _AbstractGenericMessa);

  function Contact(props) {
    var _this = _AbstractGenericMessa.call(this, props) || this;

    _this._handleAddContact = function (contactEmail) {
      var exists = false;
      Object.keys(M.opc).forEach(function (k) {
        console.error('each ->', M.opc[k]);

        if (!exists && M.opc[k].m === contactEmail && !M.opc[k].hasOwnProperty('dts')) {
          exists = true;
          return false;
        }
      });

      if (exists) {
        closeDialog();
        msgDialog('warningb', '', l[17545]);
      } else {
        M.inviteContact(M.u[u_handle].m, contactEmail);
        closeDialog();
        msgDialog('info', l[150], l[5898].replace('[X]', contactEmail));
      }
    };

    _this._getContactAvatar = function (contact, className) {
      return external_React_default.a.createElement(ui_contacts["Avatar"], {
        className: "avatar-wrapper " + className,
        contact: M.u[contact.u],
        chatRoom: _this.props.chatRoom
      });
    };

    return _this;
  }

  var _proto = Contact.prototype;

  _proto._getContactDeleteButton = function _getContactDeleteButton(message) {
    var _this2 = this;

    if (message.userId === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT) {
      return external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement("hr", null), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        icon: "red-cross",
        label: l[83],
        className: "red",
        onClick: function onClick(e) {
          return _this2.props.onDelete(e, message);
        }
      }));
    }
  };

  _proto._getContactCard = function _getContactCard(message, contact, contactEmail) {
    var _this3 = this;

    var HAS_RELATIONSHIP = M.u[contact.u].c === 1;
    var name = M.getNameByHandle(contact.u);
    return external_React_default.a.createElement(ui_buttons["Button"], {
      className: "default-white-button tiny-button",
      icon: "tiny-icon icons-sprite grey-dots"
    }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
      className: "white-context-menu shared-contact-dropdown",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      horizOffset: 4
    }, external_React_default.a.createElement("div", {
      className: "dropdown-avatar rounded"
    }, this._getContactAvatar(contact, 'context-avatar'), external_React_default.a.createElement("div", {
      className: "dropdown-user-name"
    }, external_React_default.a.createElement("div", {
      className: "name"
    }, HAS_RELATIONSHIP && (this.isLoadingContactInfo() ? external_React_default.a.createElement("em", {
      className: "contact-name-loading"
    }) : name), !HAS_RELATIONSHIP && name, external_React_default.a.createElement(ui_contacts["ContactPresence"], {
      className: "small",
      contact: contact
    })), external_React_default.a.createElement("div", {
      className: "email"
    }, M.u[contact.u].m))), external_React_default.a.createElement(ui_contacts["ContactFingerprint"], {
      contact: M.u[contact.u]
    }), HAS_RELATIONSHIP && external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "human-profile",
      label: __(l[5868]),
      onClick: function onClick() {
        loadSubPage("fm/" + contact.u);
      }
    }), external_React_default.a.createElement("hr", null), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "conversations",
      label: __(l[8632]),
      onClick: function onClick() {
        loadSubPage("fm/chat/p/" + contact.u);
      }
    })), !HAS_RELATIONSHIP && external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "rounded-grey-plus",
      label: __(l[71]),
      onClick: function onClick() {
        return _this3._handleAddContact(contactEmail);
      }
    }), this._getContactDeleteButton(message)));
  };

  _proto.getContents = function getContents() {
    var _this4 = this;

    var message = this.props.message;
    var textContents = message.textContents.substr(2, message.textContents.length);
    var attachmentMeta = JSON.parse(textContents);

    if (!attachmentMeta) {
      return console.error("Message w/ type: " + message.type + " -- no attachment meta defined. Message: " + message);
    }

    var contacts = [];
    attachmentMeta.forEach(function (v) {
      var contact = M.u && M.u[v.u] ? M.u[v.u] : v;
      var contactEmail = contact.email ? contact.email : contact.m;

      if (!M.u[contact.u]) {
        M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, {
          'u': contact.u,
          'name': contact.name,
          'm': contact.email ? contact.email : contactEmail,
          'c': undefined
        }));
      } else if (M.u[contact.u] && !M.u[contact.u].m) {
        M.u[contact.u].m = contact.email ? contact.email : contactEmail;
      }

      contacts = [].concat(contacts, [external_React_default.a.createElement("div", {
        key: contact.u
      }, external_React_default.a.createElement("div", {
        className: "message shared-info"
      }, external_React_default.a.createElement("div", {
        className: "message data-title"
      }, M.getNameByHandle(contact.u)), M.u[contact.u] ? external_React_default.a.createElement(ui_contacts["ContactVerified"], {
        className: "right-align",
        contact: M.u[contact.u]
      }) : null, external_React_default.a.createElement("div", {
        className: "user-card-email"
      }, contactEmail)), external_React_default.a.createElement("div", {
        className: "message shared-data"
      }, external_React_default.a.createElement("div", {
        className: "data-block-view semi-big"
      }, M.u[contact.u] ? external_React_default.a.createElement(ui_contacts["ContactPresence"], {
        className: "small",
        contact: M.u[contact.u]
      }) : null, _this4._getContactCard(message, contact, contactEmail), _this4._getContactAvatar(contact, 'medium-avatar')), external_React_default.a.createElement("div", {
        className: "clear"
      })))]);
    });
    return external_React_default.a.createElement("div", {
      className: "message shared-block"
    }, contacts);
  };

  return Contact;
}(abstractGenericMessage_AbstractGenericMessage);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/attachment.jsx






var attachment_Attachment = function (_AbstractGenericMessa) {
  inherits(Attachment, _AbstractGenericMessa);

  function Attachment(props) {
    var _this = _AbstractGenericMessa.call(this, props) || this;

    _this._isRevoked = function (node) {
      return !M.chd[node.ch] || node.revoked;
    };

    return _this;
  }

  var _proto = Attachment.prototype;

  _proto._isUserRegistered = function _isUserRegistered() {
    return typeof u_type !== 'undefined' && u_type > 2;
  };

  _proto.getContents = function getContents() {
    var _this2 = this;

    var _this$props = this.props,
        message = _this$props.message,
        chatRoom = _this$props.chatRoom;
    var contact = this.getContact();
    var NODE_DOESNT_EXISTS_ANYMORE = {};
    var attachmentMeta = message.getAttachmentMeta() || [];
    var files = [];

    var _loop = function _loop(i) {
      var v = attachmentMeta[i];

      if (_this2._isRevoked(v)) {
        return "continue";
      }

      var _M$getMediaProperties = M.getMediaProperties(v),
          icon = _M$getMediaProperties.icon,
          isImage = _M$getMediaProperties.isImage,
          isVideo = _M$getMediaProperties.isVideo,
          isAudio = _M$getMediaProperties.isAudio,
          isText = _M$getMediaProperties.isText,
          showThumbnail = _M$getMediaProperties.showThumbnail,
          isPreviewable = _M$getMediaProperties.isPreviewable;

      dropdown = null;
      noThumbPrev = '';
      previewButton = null;

      if (isPreviewable) {
        if (!showThumbnail) {
          noThumbPrev = 'no-thumb-prev';
        }

        previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
        previewIcon = isAudio ? 'context play' : isVideo ? 'context videocam' : 'search-icon';

        if (isText) {
          previewLabel = l[16797];
          previewIcon = "context-sprite edit-file";
        }

        previewButton = external_React_default.a.createElement("span", {
          key: "previewButton"
        }, external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          label: previewLabel,
          icon: previewIcon,
          onClick: function onClick(e) {
            return _this2.props.onPreviewStart(v, e);
          }
        }));
      }

      if (contact.u === u_handle) {
        dropdown = external_React_default.a.createElement(ui_buttons["Button"], {
          className: "default-white-button tiny-button",
          icon: "tiny-icon icons-sprite grey-dots"
        }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
          ref: function ref(refObj) {
            _this2.dropdown = refObj;
          },
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left top",
          positionAt: "left bottom",
          horizOffset: -4,
          vertOffset: 3,
          onBeforeActiveChange: function onBeforeActiveChange(newState) {
            if (newState === true) {
              _this2.forceUpdate();
            }
          },
          dropdownItemGenerator: function dropdownItemGenerator(dd) {
            var linkButtons = [];
            var firstGroupOfButtons = [];
            var revokeButton = null;
            var downloadButton = null;

            if (message.isEditable && message.isEditable()) {
              revokeButton = external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                icon: "red-cross",
                label: __(l[83]),
                className: "red",
                onClick: function onClick() {
                  chatRoom.megaChat.plugins.chatdIntegration.updateMessage(chatRoom, message.internalId || message.orderValue, "");
                }
              });
            }

            if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
              dbfetch.get(v.h).always(function () {
                if (!M.d[v.h]) {
                  NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                  dd.doRerender();
                } else {
                  dd.doRerender();
                }
              });
              return external_React_default.a.createElement("span", null, l[5533]);
            } else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
              downloadButton = external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                icon: "rounded-grey-down-arrow",
                label: __(l[1187]),
                onClick: function onClick() {
                  return _this2.props.onDownloadStart(v);
                }
              });

              if (M.getNodeRoot(v.h) !== M.RubbishID) {
                _this2.props.onAddLinkButtons(v.h, linkButtons);
              }

              firstGroupOfButtons.push(external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                icon: "context info",
                label: __(l[6859]),
                key: "infoDialog",
                onClick: function onClick() {
                  $.selected = [v.h];
                  propertiesDialog();
                }
              }));

              _this2.props.onAddFavouriteButtons(v.h, firstGroupOfButtons);

              linkButtons.push(external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                icon: "small-icon conversations",
                label: __(l[17764]),
                key: "sendToChat",
                onClick: function onClick() {
                  $.selected = [v.h];
                  openCopyDialog('conversations');
                }
              }));
            }

            if (!previewButton && firstGroupOfButtons.length === 0 && !downloadButton && linkButtons.length === 0 && !revokeButton) {
              return null;
            }

            if (previewButton && (firstGroupOfButtons.length > 0 || downloadButton || linkButtons.length > 0 || revokeButton)) {
              previewButton = [previewButton, external_React_default.a.createElement("hr", {
                key: "preview-sep"
              })];
            }

            return external_React_default.a.createElement("div", null, previewButton, firstGroupOfButtons, firstGroupOfButtons.length > 0 ? external_React_default.a.createElement("hr", null) : "", downloadButton, linkButtons, revokeButton && downloadButton ? external_React_default.a.createElement("hr", null) : "", revokeButton);
          }
        }));
      } else {
        dropdown = external_React_default.a.createElement(ui_buttons["Button"], {
          className: "default-white-button tiny-button",
          icon: "tiny-icon icons-sprite grey-dots"
        }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left top",
          positionAt: "left bottom",
          horizOffset: -4,
          vertOffset: 3
        }, previewButton, previewButton && external_React_default.a.createElement("hr", null), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          icon: "rounded-grey-down-arrow",
          label: __(l[1187]),
          onClick: function onClick() {
            return _this2.props.onDownloadStart(v);
          }
        }), _this2._isUserRegistered() && external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          icon: "grey-cloud",
          label: __(l[1988]),
          onClick: function onClick() {
            return _this2.props.onAddToCloudDrive(v, false);
          }
        }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          icon: "conversations",
          label: __(l[17764]),
          onClick: function onClick() {
            return _this2.props.onAddToCloudDrive(v, true);
          }
        }))));
      }

      attachmentClasses = "message shared-data";
      preview = external_React_default.a.createElement("div", {
        className: "data-block-view medium " + noThumbPrev,
        onClick: isPreviewable ? null : undefined
      }, dropdown, external_React_default.a.createElement("div", {
        className: "data-block-bg"
      }, external_React_default.a.createElement("div", {
        className: "block-view-file-type " + icon
      })));

      if (showThumbnail) {
        src = v.src || window.noThumbURI || '';
        thumbClass = v.src ? '' : " no-thumb";
        thumbOverlay = null;

        if (isImage) {
          thumbClass += " image";
          thumbOverlay = external_React_default.a.createElement("div", {
            className: "thumb-overlay",
            onClick: function onClick() {
              return _this2.props.onPreviewStart(v);
            }
          });
        } else {
          thumbClass = thumbClass + " video " + (isPreviewable ? " previewable" : "non-previewable");
          thumbOverlay = external_React_default.a.createElement("div", {
            className: "thumb-overlay",
            onClick: function onClick() {
              return isPreviewable && _this2.props.onPreviewStart(v);
            }
          }, isPreviewable && external_React_default.a.createElement("div", {
            className: "play-video-button"
          }), external_React_default.a.createElement("div", {
            className: "video-thumb-details"
          }, v.playtime && external_React_default.a.createElement("i", {
            className: "small-icon small-play-icon"
          }), external_React_default.a.createElement("span", null, secondsToTimeShort(v.playtime || -1))));
        }

        preview = src ? external_React_default.a.createElement("div", {
          id: v.ch,
          className: "shared-link thumb " + thumbClass
        }, thumbOverlay, dropdown, external_React_default.a.createElement("img", {
          alt: "",
          className: "thumbnail-placeholder " + v.h,
          src: src,
          key: 'thumb-' + v.ch,
          onClick: function onClick() {
            return isPreviewable && _this2.props.onPreviewStart(v);
          }
        })) : preview;
      }

      files.push(external_React_default.a.createElement("div", {
        className: attachmentClasses,
        key: 'atch-' + v.ch
      }, external_React_default.a.createElement("div", {
        className: "message shared-info"
      }, external_React_default.a.createElement("div", {
        className: "message data-title"
      }, __(l[17669]), external_React_default.a.createElement("span", {
        className: "file-name"
      }, v.name)), external_React_default.a.createElement("div", {
        className: "message file-size"
      }, bytesToSize(v.s))), preview, external_React_default.a.createElement("div", {
        className: "clear"
      })));
    };

    for (var i = 0; i < attachmentMeta.length; i++) {
      var dropdown;
      var noThumbPrev;
      var previewButton;
      var previewLabel;
      var previewIcon;
      var attachmentClasses;
      var preview;
      var src;
      var thumbClass;
      var thumbOverlay;

      var _ret = _loop(i);

      if (_ret === "continue") continue;
    }

    return external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement("div", {
      className: "message shared-block"
    }, files));
  };

  return Attachment;
}(abstractGenericMessage_AbstractGenericMessage);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/audioPlayer.jsx





var audioPlayer_AudioPlayer = function (_React$Component) {
  inherits(AudioPlayer, _React$Component);

  function AudioPlayer(props) {
    var _this = _React$Component.call(this, props) || this;

    _this.state = {
      currentTime: null,
      progressWidth: 0,
      isBeingPlayed: false,
      isPaused: false
    };

    _this.play = function () {
      var audio = _this.audioEl;

      if (audio.paused) {
        var result = audio.play();

        if (result instanceof Promise) {
          result.catch(function (ex) {
            if (ex.name !== 'AbortError') {
              console.error(ex);
            }
          });
        }

        var audios = document.getElementsByClassName('audio-player__player');
        Array.prototype.filter.call(audios, function (audioElement) {
          return audioElement.id !== _this.props.audioId;
        }).forEach(function (audioElement) {
          if (!audioElement.paused) {
            audioElement.pause();
          }
        });

        _this.setState({
          isPaused: false
        });
      } else {
        audio.pause();

        _this.setState({
          isPaused: true
        });
      }
    };

    _this.handleOnPause = function () {
      return _this.setState({
        isPaused: true
      });
    };

    _this.handleOnPlaying = function () {
      return _this.setState({
        isBeingPlayed: true
      });
    };

    _this.handleOnTimeUpdate = function () {
      var _this$audioEl = _this.audioEl,
          currentTime = _this$audioEl.currentTime,
          duration = _this$audioEl.duration;

      _this.setState({
        currentTime: secondsToTimeShort(currentTime),
        progressWidth: currentTime / duration * 100
      });
    };

    _this.handleOnEnded = function () {
      return _this.setState({
        progressWidth: 0,
        isBeingPlayed: false,
        currentTime: 0
      });
    };

    _this.handleOnMouseDown = function (event) {
      event.preventDefault();
      var sliderPin = _this.sliderPin;
      var slider = _this.slider;
      var shiftX = event.clientX - sliderPin.getBoundingClientRect().left;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      function onMouseMove(event) {
        var newLeft = event.clientX - shiftX - slider.getBoundingClientRect().left;

        if (newLeft < 0) {
          newLeft = 0;
        }

        var rightEdge = slider.offsetWidth - sliderPin.offsetWidth;

        if (newLeft > rightEdge) {
          newLeft = rightEdge;
        }

        sliderPin.style.left = newLeft + "px";
        var pinPosition = newLeft / slider.getBoundingClientRect().width;
        var newTime = Math.ceil(this.props.playtime * pinPosition);
        var newCurrentTime = secondsToTimeShort(newTime);
        this.audioEl.currentTime = newTime;
        this.setState({
          currentTime: newCurrentTime,
          progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
        });
      }

      function onMouseUp() {
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
      }

      sliderPin.ondragstart = function () {
        return false;
      };
    };

    return _this;
  }

  var _proto = AudioPlayer.prototype;

  _proto.render = function render() {
    var _this2 = this;

    var _this$props = this.props,
        source = _this$props.source,
        audioId = _this$props.audioId,
        loading = _this$props.loading,
        playtime = _this$props.playtime;
    var _this$state = this.state,
        progressWidth = _this$state.progressWidth,
        isBeingPlayed = _this$state.isBeingPlayed,
        isPaused = _this$state.isPaused,
        currentTime = _this$state.currentTime;
    var playtimeStyles = null;

    if (isBeingPlayed) {
      playtimeStyles = {
        color: '#EB4444'
      };
    }

    var btnClass = 'audio-player__pause-btn';

    if (!isBeingPlayed || isPaused) {
      btnClass = 'audio-player__play-btn';
    }

    var controls = external_React_default.a.createElement("span", {
      className: btnClass,
      onClick: function onClick() {
        _this2.play();

        if (_this2.props.source === null) {
          _this2.props.getAudioFile();
        }
      }
    });

    if (loading) {
      controls = external_React_default.a.createElement("div", {
        className: "small-blue-spinner audio-player__spinner"
      });
    }

    return external_React_default.a.createElement("div", {
      className: "audio-player"
    }, controls, external_React_default.a.createElement("div", {
      className: "slider",
      ref: function ref(slider) {
        _this2.slider = slider;
      }
    }, external_React_default.a.createElement("div", {
      className: "slider__progress",
      style: {
        width: progressWidth + "%"
      }
    }), external_React_default.a.createElement("div", {
      className: "slider__progress__pin",
      style: {
        left: progressWidth + "%"
      },
      ref: function ref(sliderPin) {
        _this2.sliderPin = sliderPin;
      },
      onMouseDown: this.handleOnMouseDown
    })), external_React_default.a.createElement("span", {
      className: "audio-player__time",
      style: playtimeStyles
    }, currentTime ? currentTime : secondsToTimeShort(playtime)), external_React_default.a.createElement("audio", {
      src: source,
      className: "audio-player__player",
      id: audioId,
      ref: function ref(audio) {
        _this2.audioEl = audio;
      },
      onPlaying: this.handleOnPlaying,
      onPause: this.handleOnPause,
      onEnded: this.handleOnEnded,
      onTimeUpdate: this.handleOnTimeUpdate
    }));
  };

  return AudioPlayer;
}(external_React_default.a.Component);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/audioContainer.jsx







var audioContainer_AudioContainer = function (_React$Component) {
  inherits(AudioContainer, _React$Component);

  function AudioContainer(props) {
    var _this = _React$Component.call(this, props) || this;

    _this.state = {
      audioBlobUrl: null,
      loading: false
    };

    _this.getAudioFile = function () {
      var _this$props = _this.props,
          mime = _this$props.mime,
          h = _this$props.h;

      _this.setState({
        loading: true
      });

      if (mime !== 'audio/mp4') {
        if (d) {
          console.warn('cannot play this file type (%s)', mime, h, [(_this)]);
        }

        return false;
      }

      M.gfsfetch(h, 0, -1).then(function (_ref) {
        var buffer = _ref.buffer;

        _this.setState(function () {
          return {
            audioBlobUrl: mObjectURL([buffer], 'audio/mp4'),
            loading: false
          };
        });
      }).catch(function (ex) {
        console.error(ex);
      });
      return true;
    };

    return _this;
  }

  var _proto = AudioContainer.prototype;

  _proto.componentWillUnmount = function componentWillUnmount() {
    URL.revokeObjectURL(this.state.audioBlobUrl);
  };

  _proto.render = function render() {
    var _this$state = this.state,
        audioBlobUrl = _this$state.audioBlobUrl,
        loading = _this$state.loading;
    var _this$props2 = this.props,
        playtime = _this$props2.playtime,
        mime = _this$props2.mime,
        audioId = _this$props2.audioId;
    return external_React_default.a.createElement("div", {
      className: "audio-container"
    }, external_React_default.a.createElement(audioPlayer_AudioPlayer, {
      source: audioBlobUrl ? audioBlobUrl : null,
      audioId: audioId,
      loading: loading,
      mime: mime,
      getAudioFile: this.getAudioFile,
      playtime: playtime
    }));
  };

  return AudioContainer;
}(external_React_default.a.Component);


audioContainer_AudioContainer.defaultProps = {
  h: null,
  mime: null
};
// CONCATENATED MODULE: ./js/chat/ui/messages/types/voiceClip.jsx






MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 3600;

var voiceClip_VoiceClip = function (_AbstractGenericMessa) {
  inherits(VoiceClip, _AbstractGenericMessa);

  function VoiceClip(props) {
    return _AbstractGenericMessa.call(this, props) || this;
  }

  var _proto = VoiceClip.prototype;

  _proto._getActionButtons = function _getActionButtons() {
    var _this = this;

    var message = this.props.message;
    var contact = this.getContact();
    var iAmSender = contact && contact.u === u_handle;
    var stillEditable = unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT;
    var isBeingEdited = this.props.isBeingEdited() === true;
    var chatIsReadOnly = this.props.chatRoom.isReadOnly() === true;

    if (iAmSender && stillEditable && !isBeingEdited && !chatIsReadOnly && !this.props.dialog) {
      return external_React_default.a.createElement(ui_buttons["Button"], {
        className: "default-white-button tiny-button",
        icon: "tiny-icon icons-sprite grey-dots"
      }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        icon: "red-cross",
        label: __(l[1730]),
        className: "red",
        onClick: function onClick(e) {
          return _this.props.onDelete(e, message);
        }
      })));
    }

    return null;
  };

  _proto._getAudioContainer = function _getAudioContainer() {
    var message = this.props.message;
    var attachmentMeta = message.getAttachmentMeta();

    if (attachmentMeta && attachmentMeta.length) {
      return attachmentMeta.map(function (voiceClip) {
        return external_React_default.a.createElement(audioContainer_AudioContainer, {
          key: voiceClip.h,
          h: voiceClip.h,
          mime: voiceClip.mime,
          playtime: voiceClip.playtime,
          audioId: "vm" + message.messageId
        });
      });
    }
  };

  _proto.getContents = function getContents() {
    return external_React_default.a.createElement(external_React_default.a.Fragment, null, this.props.message.getState() === Message.STATE.NOT_SENT ? null : this._getActionButtons(), this._getAudioContainer());
  };

  return VoiceClip;
}(abstractGenericMessage_AbstractGenericMessage);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreview.jsx


var metaRichpreview_React = __webpack_require__(0);

var ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var MetaRichPreviewLoading = __webpack_require__(17).MetaRichpreviewLoading;

var metaRichpreview_MetaRichpreview = function (_ConversationMessageM) {
  inherits(MetaRichpreview, _ConversationMessageM);

  function MetaRichpreview() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = MetaRichpreview.prototype;

  _proto.getBase64Url = function getBase64Url(b64incoming) {
    if (!b64incoming || !b64incoming.split) {
      return;
    }

    var exti = b64incoming.split(":");
    var b64i = exti[1];
    exti = exti[0];
    return "data:image/" + exti + ";base64," + b64i;
  };

  _proto.render = function render() {
    var self = this;
    var message = this.props.message;
    var output = [];
    var metas = message.meta && message.meta.extra ? message.meta.extra : [];
    var failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 300;
    var isLoading = !!message.meta.isLoading;

    if (failedToLoad) {
      return null;
    }

    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];

      if (!meta.d && !meta.t && !message.meta.isLoading) {
        continue;
      }

      var previewCss = {};

      if (meta.i) {
        previewCss['backgroundImage'] = "url(" + self.getBase64Url(meta.i) + ")";
        previewCss['backgroundRepeat'] = "no-repeat";
        previewCss['backgroundPosition'] = "center center";
      }

      var previewContainer;

      if (isLoading) {
        previewContainer = metaRichpreview_React.createElement(MetaRichPreviewLoading, {
          message: message,
          isLoading: message.meta.isLoading
        });
      } else {
        var domainName = meta.url;
        domainName = domainName.replace("https://", "").replace("http://", "").split("/")[0];
        previewContainer = metaRichpreview_React.createElement("div", {
          className: "message richpreview body"
        }, meta.i ? metaRichpreview_React.createElement("div", {
          className: "message richpreview img-wrapper"
        }, metaRichpreview_React.createElement("div", {
          className: "message richpreview preview",
          style: previewCss
        })) : undefined, metaRichpreview_React.createElement("div", {
          className: "message richpreview inner-wrapper"
        }, metaRichpreview_React.createElement("div", {
          className: "message richpreview data-title"
        }, metaRichpreview_React.createElement("span", {
          className: "message richpreview title"
        }, meta.t)), metaRichpreview_React.createElement("div", {
          className: "message richpreview desc"
        }, ellipsis(meta.d, 'end', 82)), metaRichpreview_React.createElement("div", {
          className: "message richpreview url-container"
        }, meta.ic ? metaRichpreview_React.createElement("span", {
          className: "message richpreview url-favicon"
        }, metaRichpreview_React.createElement("img", {
          src: self.getBase64Url(meta.ic),
          width: 16,
          height: 16,
          onError: function onError(e) {
            e.target.parentNode.removeChild(e.target);
          },
          alt: ""
        })) : "", metaRichpreview_React.createElement("span", {
          className: "message richpreview url"
        }, domainName))));
      }

      output.push(metaRichpreview_React.createElement("div", {
        key: meta.url,
        className: "message richpreview container " + (meta.i ? "have-preview" : "no-preview") + " " + (meta.d ? "have-description" : "no-description") + " " + (isLoading ? "is-loading" : "done-loading"),
        onClick: function (url) {
          if (!message.meta.isLoading) {
            window.open(url, "_blank");
          }
        }.bind(this, meta.url)
      }, previewContainer, metaRichpreview_React.createElement("div", {
        className: "clear"
      })));
    }

    return metaRichpreview_React.createElement("div", {
      className: "message richpreview previews-container"
    }, output);
  };

  return MetaRichpreview;
}(ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreviewConfirmation.jsx


var metaRichpreviewConfirmation_React = __webpack_require__(0);

var metaRichpreviewConfirmation_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var metaRichpreviewConfirmation_MetaRichprevConfirmation = function (_ConversationMessageM) {
  inherits(MetaRichprevConfirmation, _ConversationMessageM);

  function MetaRichprevConfirmation() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = MetaRichprevConfirmation.prototype;

  _proto.doAllow = function doAllow() {
    var message = this.props.message;
    var megaChat = this.props.message.chatRoom.megaChat;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoConfirm();
    megaChat.plugins.richpreviewsFilter.processMessage({}, message);
    message.trackDataChange();
  };

  _proto.doNotNow = function doNotNow() {
    var message = this.props.message;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoNotNow();
    message.trackDataChange();
  };

  _proto.doNever = function doNever() {
    var message = this.props.message;
    msgDialog('confirmation', l[870], l[18687], '', function (e) {
      if (e) {
        delete message.meta.requiresConfirmation;
        RichpreviewsFilter.confirmationDoNever();
        message.trackDataChange();
      }
    });
  };

  _proto.render = function render() {
    var self = this;
    var notNowButton = null;
    var neverButton = null;

    if (RichpreviewsFilter.confirmationCount >= 2) {
      neverButton = metaRichpreviewConfirmation_React.createElement("div", {
        className: "default-white-button small-text small right red",
        onClick: function onClick() {
          self.doNever();
        }
      }, metaRichpreviewConfirmation_React.createElement("span", null, l[1051]));
    }

    notNowButton = metaRichpreviewConfirmation_React.createElement("div", {
      className: "default-white-button small-text small grey-txt right",
      onClick: function onClick() {
        self.doNotNow();
      }
    }, metaRichpreviewConfirmation_React.createElement("span", null, l[18682]));
    return metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview previews-container"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview container confirmation"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview body"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview img-wrapper"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview preview confirmation-icon"
    })), metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview inner-wrapper"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview data-title"
    }, metaRichpreviewConfirmation_React.createElement("span", {
      className: "message richpreview title"
    }, l[18679])), metaRichpreviewConfirmation_React.createElement("div", {
      className: "message richpreview desc"
    }, l[18680]), metaRichpreviewConfirmation_React.createElement("div", {
      className: "buttons-block"
    }, metaRichpreviewConfirmation_React.createElement("div", {
      className: "default-grey-button small-text small right",
      onClick: function onClick() {
        self.doAllow();
      }
    }, metaRichpreviewConfirmation_React.createElement("span", null, l[18681])), notNowButton, neverButton))), metaRichpreviewConfirmation_React.createElement("div", {
      className: "clear"
    })));
  };

  return MetaRichprevConfirmation;
}(metaRichpreviewConfirmation_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/geoLocation.jsx




function GeoLocation(props) {
  var latitude = props.latitude,
      lng = props.lng;

  var handleOnclick = function handleOnclick(lat, lng) {
    var openGmaps = function openGmaps() {
      window.open("https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng, '_blank', 'noopener');
    };

    if (GeoLocationLinks.gmapsConfirmation === -1 || GeoLocationLinks.gmapsConfirmation === false) {
      msgDialog('confirmation', 'geolocation-link', l[20788], 'Would you like to proceed?', function (answer) {
        if (answer) {
          GeoLocationLinks.confirmationDoConfirm();
          closeDialog();
          openGmaps();
        } else {
          GeoLocationLinks.confirmationDoNever();
        }
      });
    } else if (GeoLocationLinks.gmapsConfirmation) {
      openGmaps();
    }
  };

  return external_React_default.a.createElement("div", {
    className: "geolocation",
    onClick: function onClick() {
      return handleOnclick(latitude, lng);
    }
  }, external_React_default.a.createElement("div", {
    className: "geolocation__details"
  }, external_React_default.a.createElement("figure", {
    className: "geolocation__img"
  }), external_React_default.a.createElement("ul", {
    className: "geolocation__data-list"
  }, external_React_default.a.createElement("li", null, external_React_default.a.createElement("span", {
    className: "geolocation__title"
  }, l[20789])), external_React_default.a.createElement("li", null, external_React_default.a.createElement("p", null, external_React_default.a.createElement("span", {
    className: "geolocation__coordinates-icon"
  }), external_React_default.a.createElement("span", {
    className: "geolocation__coordinates"
  }, 'https://maps.google.com'))))));
}

var geoLocation = (GeoLocation);
// EXTERNAL MODULE: ./js/chat/ui/messages/types/partials/metaRichPreviewLoading.jsx
var metaRichPreviewLoading = __webpack_require__(17);

// CONCATENATED MODULE: ./js/chat/ui/messages/types/partials/metaRichpreviewMegaLinks.jsx







var metaRichpreviewMegaLinks_MetaRichpreviewMegaLinks = function (_ConversationMessageM) {
  inherits(MetaRichpreviewMegaLinks, _ConversationMessageM);

  function MetaRichpreviewMegaLinks() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = MetaRichpreviewMegaLinks.prototype;

  _proto.render = function render() {
    var self = this;
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var previewContainer;
    var output = [];
    var megaLinks = message.megaLinks ? message.megaLinks : [];

    for (var i = 0; i < megaLinks.length; i++) {
      var megaLinkInfo = megaLinks[i];

      if (megaLinkInfo.failed) {
        continue;
      }

      if (megaLinkInfo.hadLoaded() === false) {
        if (megaLinkInfo.startedLoading() === false) {
          megaLinkInfo.getInfo().always(function () {
            Soon(function () {
              message.trackDataChange();
              self.safeForceUpdate();
            });
          });
        }

        previewContainer = external_React_default.a.createElement(metaRichPreviewLoading["MetaRichpreviewLoading"], {
          message: message,
          isLoading: megaLinkInfo.hadLoaded()
        });
      } else if (megaLinkInfo.is_contactlink) {
        var fakeContact = M.u[megaLinkInfo.info.h] ? M.u[megaLinkInfo.info.h] : {
          'u': megaLinkInfo.info.h,
          'm': megaLinkInfo.info.e,
          'firstName': megaLinkInfo.info.fn,
          'lastName': megaLinkInfo.info.ln,
          'name': megaLinkInfo.info.fn + " " + megaLinkInfo.info.ln
        };

        if (!M.u[fakeContact.u]) {
          M.u.set(fakeContact.u, new MegaDataObject(MEGA_USER_STRUCT, {
            'u': fakeContact.u,
            'name': fakeContact.firstName + " " + fakeContact.lastName,
            'm': fakeContact.m ? fakeContact.m : "",
            'c': undefined
          }));
        }

        var contact = M.u[megaLinkInfo.info.h];
        previewContainer = external_React_default.a.createElement("div", {
          key: megaLinkInfo.info.h,
          className: "message shared-block contact-link"
        }, external_React_default.a.createElement("div", {
          className: "message shared-info"
        }, external_React_default.a.createElement("div", {
          className: "message data-title"
        }, contact.name), external_React_default.a.createElement(ui_contacts["ContactVerified"], {
          className: "right-align",
          contact: contact
        }), external_React_default.a.createElement("div", {
          className: "user-card-email"
        }, contact.m)), external_React_default.a.createElement("div", {
          className: "message shared-data"
        }, external_React_default.a.createElement("div", {
          className: "data-block-view semi-big"
        }, external_React_default.a.createElement(ui_contacts["ContactPresence"], {
          className: "small",
          contact: contact
        }), external_React_default.a.createElement(ui_contacts["Avatar"], {
          className: "avatar-wrapper medium-avatar",
          contact: contact,
          chatRoom: chatRoom
        })), external_React_default.a.createElement("div", {
          className: "clear"
        })));
      } else {
        var desc;
        var is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

        if (megaLinkInfo.is_chatlink) {
          desc = l[8876] + ": " + megaLinkInfo.info.ncm;
        } else if (!megaLinkInfo.is_dir) {
          desc = bytesToSize(megaLinkInfo.info.size);
        } else {
          desc = external_React_default.a.createElement("span", null, fm_contains(megaLinkInfo.info.s[1], megaLinkInfo.info.s[2] - 1), external_React_default.a.createElement("br", null), bytesToSize(megaLinkInfo.info.size));
        }

        previewContainer = external_React_default.a.createElement("div", {
          className: "message richpreview body " + ((is_icon ? "have-icon" : "no-icon") + " " + (megaLinkInfo.is_chatlink ? "is-chat" : ""))
        }, megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ? external_React_default.a.createElement("div", {
          className: "message richpreview img-wrapper"
        }, external_React_default.a.createElement("div", {
          className: "message richpreview preview",
          style: {
            "backgroundImage": 'url(' + megaLinkInfo.info.preview_url + ')'
          }
        })) : external_React_default.a.createElement("div", {
          className: "message richpreview img-wrapper"
        }, megaLinkInfo.is_chatlink ? external_React_default.a.createElement("i", {
          className: "huge-icon conversations"
        }) : external_React_default.a.createElement("div", {
          className: "message richpreview icon block-view-file-type " + (megaLinkInfo.is_dir ? "folder" : fileIcon(megaLinkInfo.info))
        })), external_React_default.a.createElement("div", {
          className: "message richpreview inner-wrapper"
        }, external_React_default.a.createElement("div", {
          className: "message richpreview data-title"
        }, external_React_default.a.createElement("span", {
          className: "message richpreview title"
        }, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, megaLinkInfo.info.name || megaLinkInfo.info.topic || ""))), external_React_default.a.createElement("div", {
          className: "message richpreview desc"
        }, desc), external_React_default.a.createElement("div", {
          className: "message richpreview url-container"
        }, external_React_default.a.createElement("span", {
          className: "message richpreview url-favicon"
        }, external_React_default.a.createElement("img", {
          src: "https://mega.nz/favicon.ico?v=3&c=1",
          width: 16,
          height: 16,
          onError: function onError(e) {
            if (e && e.target && e.target.parentNode) {
              e.target.parentNode.removeChild(e.target);
            }
          },
          alt: ""
        })), external_React_default.a.createElement("span", {
          className: "message richpreview url"
        }, ellipsis(megaLinkInfo.getLink(), 'end', 40)))));
      }

      output.push(external_React_default.a.createElement("div", {
        key: megaLinkInfo.node_key + "_" + output.length,
        className: "message richpreview container " + (megaLinkInfo.havePreview() ? "have-preview" : "no-preview") + " " + (megaLinkInfo.d ? "have-description" : "no-description") + " " + (!megaLinkInfo.hadLoaded() ? "is-loading" : "done-loading"),
        onClick: function (url, megaLinkInfo) {
          if (megaLinkInfo.hadLoaded()) {
            window.open(url, '_blank', 'noopener');
          }
        }.bind(this, megaLinkInfo.getLink(), megaLinkInfo)
      }, previewContainer, external_React_default.a.createElement("div", {
        className: "clear"
      })));
    }

    return external_React_default.a.createElement("div", {
      className: "message richpreview previews-container"
    }, output);
  };

  return MetaRichpreviewMegaLinks;
}(mixin["ConversationMessageMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/messages/types/text.jsx












var text_Text = function (_AbstractGenericMessa) {
  inherits(Text, _AbstractGenericMessa);

  function Text(props) {
    var _this = _AbstractGenericMessa.call(this, props) || this;

    _this.isRichPreview = function (message) {
      return message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW;
    };

    _this.isGeoLocation = function (message) {
      return message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;
    };

    return _this;
  }

  var _proto = Text.prototype;

  _proto.getClassNames = function getClassNames() {
    var _this$props = this.props,
        message = _this$props.message,
        isBeingEdited = _this$props.isBeingEdited;
    return this.isRichPreview(message) && message.meta.requiresConfirmation && !isBeingEdited() && (message.source === Message.SOURCE.SENT || message.confirmed === true) && 'preview-requires-confirmation-container';
  };

  _proto.getContents = function getContents() {
    var _this2 = this;

    var _this$props2 = this.props,
        message = _this$props2.message,
        chatRoom = _this$props2.chatRoom,
        _onUpdate = _this$props2.onUpdate,
        isBeingEdited = _this$props2.isBeingEdited,
        spinnerElement = _this$props2.spinnerElement;
    var messageNotSendIndicator;
    var textMessage = message.messageHtml;
    var IS_GEOLOCATION = this.isGeoLocation(message);

    var _ref = IS_GEOLOCATION && message.meta.extra[0],
        lng = _ref.lng,
        latitude = _ref.la;

    if (message.textContents === '' && !message.dialogType) {
      message.deleted = true;
    }

    var subMessageComponent = [];
    var extraPreButtons = [];

    if (!message.deleted) {
      if (this.isRichPreview(message)) {
        if (!message.meta.requiresConfirmation) {
          subMessageComponent = [].concat(subMessageComponent, [external_React_default.a.createElement(metaRichpreview_MetaRichpreview, {
            key: "richprev",
            message: message,
            chatRoom: chatRoom
          })]);

          if (message.isEditable()) {
            if (message.meta.isLoading) {
              extraPreButtons = [].concat(extraPreButtons, [external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                icon: "icons-sprite bold-crossed-eye",
                key: "stop-link-preview",
                label: l[18684],
                className: "",
                onClick: function onClick(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
                }
              })]);
            } else {
              extraPreButtons = [].concat(extraPreButtons, [external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
                key: "remove-link-preview",
                icon: "icons-sprite bold-crossed-eye",
                label: l[18684],
                className: "",
                onClick: function onClick(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
                }
              })]);
            }
          }
        }

        if (!isBeingEdited()) {
          if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
            subMessageComponent = [].concat(subMessageComponent, [external_React_default.a.createElement(metaRichpreviewConfirmation_MetaRichprevConfirmation, {
              key: "confirm",
              message: message,
              chatRoom: chatRoom
            })]);
          } else {
            extraPreButtons = [].concat(extraPreButtons, [external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
              key: "insert-link-preview",
              icon: "icons-sprite bold-eye",
              label: l[18683],
              className: "",
              onClick: function onClick(e) {
                e.stopPropagation();
                e.preventDefault();
                chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
              }
            })]);
          }
        }
      }

      if (message.megaLinks) {
        subMessageComponent = [].concat(subMessageComponent, [external_React_default.a.createElement(metaRichpreviewMegaLinks_MetaRichpreviewMegaLinks, {
          key: "richprevml",
          message: message,
          chatRoom: chatRoom
        })]);
      }
    }

    var messageActionButtons = null;

    if (message && message.getState && (message.getState() === Message.STATE.NOT_SENT || message.getState() === Message.STATE.NOT_SENT_EXPIRED)) {
      messageActionButtons = null;

      if (!spinnerElement) {
        if (message.requiresManualRetry) {
          if (isBeingEdited() !== true) {
            messageNotSendIndicator = external_React_default.a.createElement("div", {
              className: "not-sent-indicator"
            }, external_React_default.a.createElement("span", {
              className: "tooltip-trigger",
              key: "retry",
              "data-tooltip": "not-sent-notification-manual",
              onClick: function onClick(e) {
                return _this2.props.onRetry(e, message);
              }
            }, external_React_default.a.createElement("i", {
              className: "small-icon refresh-circle"
            })), external_React_default.a.createElement("span", {
              className: "tooltip-trigger",
              key: "cancel",
              "data-tooltip": "not-sent-notification-cancel",
              onClick: function onClick(e) {
                return _this2.props.onCancelRetry(e, message);
              }
            }, external_React_default.a.createElement("i", {
              className: "small-icon red-cross"
            })));
          }
        } else {
          messageNotSendIndicator = external_React_default.a.createElement("div", {
            className: "not-sent-indicator tooltip-trigger",
            "data-tooltip": "not-sent-notification"
          }, external_React_default.a.createElement("i", {
            className: "small-icon yellow-triangle"
          }));
        }
      }
    }

    var messageDisplayBlock;

    if (isBeingEdited() === true) {
      var msgContents = message.textContents;
      msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);
      messageDisplayBlock = external_React_default.a.createElement(typingArea_TypingArea, {
        iconClass: "small-icon writing-pen textarea-icon",
        initialText: msgContents,
        chatRoom: chatRoom,
        showButtons: true,
        className: "edit-typing-area",
        onUpdate: function onUpdate() {
          return _onUpdate ? _onUpdate : null;
        },
        onConfirm: function onConfirm(messageContents) {
          _this2.props.onEditToggle();

          if (_this2.props.onEditDone) {
            Soon(function () {
              var tmpMessageObj = {
                textContents: messageContents
              };
              megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);

              _this2.props.onEditDone(tmpMessageObj.textContents);

              if (_this2.isMounted()) {
                _this2.forceUpdate();
              }
            });
          }

          return true;
        }
      });
    } else {
      if (message.updated > 0 && !message.metaType) {
        textMessage = textMessage + " <em>" + __(l[8887]) + "</em>";
      }

      if (this.props.initTextScrolling) {
        messageDisplayBlock = external_React_default.a.createElement(utils["default"].JScrollPane, {
          className: "message text-block scroll"
        }, external_React_default.a.createElement("div", {
          className: "message text-scroll",
          dangerouslySetInnerHTML: {
            __html: textMessage
          }
        }));
      } else {
        messageDisplayBlock = external_React_default.a.createElement("div", {
          className: "message text-block",
          dangerouslySetInnerHTML: {
            __html: textMessage
          }
        });
      }
    }

    if (!message.deleted) {
      var contact = this.getContact();

      if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && isBeingEdited() !== true && chatRoom.isReadOnly() === false && !message.requiresManualRetry) {
        var editButton = !IS_GEOLOCATION && external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          icon: "icons-sprite writing-pencil",
          label: __(l[1342]),
          onClick: this.props.onEditToggle
        });
        messageActionButtons = external_React_default.a.createElement(ui_buttons["Button"], {
          className: "default-white-button tiny-button",
          icon: "tiny-icon icons-sprite grey-dots"
        }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
          className: "white-context-menu attachments-dropdown",
          noArrow: true,
          positionMy: "left bottom",
          positionAt: "right bottom",
          horizOffset: 4
        }, extraPreButtons, editButton, editButton ? external_React_default.a.createElement("hr", null) : null, external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
          icon: "red-cross",
          label: __(l[1730]),
          className: "red",
          onClick: function onClick(e) {
            return _this2.props.onDelete(e, message);
          }
        })));
      }
    }

    return external_React_default.a.createElement(external_React_default.a.Fragment, null, this.props.hideActionButtons ? null : messageActionButtons, messageNotSendIndicator, IS_GEOLOCATION ? null : messageDisplayBlock, subMessageComponent, spinnerElement, IS_GEOLOCATION && external_React_default.a.createElement(geoLocation, {
      latitude: latitude,
      lng: lng
    }));
  };

  return Text;
}(abstractGenericMessage_AbstractGenericMessage);


// CONCATENATED MODULE: ./js/chat/ui/messages/generic.jsx










var CLICKABLE_ATTACHMENT_CLASSES = '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';

var generic_GenericConversationMessage = function (_ConversationMessageM) {
  inherits(GenericConversationMessage, _ConversationMessageM);

  function GenericConversationMessage(props) {
    var _this = _ConversationMessageM.call(this, props) || this;

    _this.isBeingEdited = function () {
      return _this.state.editing === true || _this.props.editing === true;
    };

    _this.doDelete = function (e, msg) {
      e.preventDefault(e);
      e.stopPropagation(e);

      if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
        _this.doCancelRetry(e, msg);
      } else {
        _this.props.onDeleteClicked(e, _this.props.message);
      }
    };

    _this.doCancelRetry = function (e, msg) {
      e.preventDefault(e);
      e.stopPropagation(e);
      var chatRoom = _this.props.message.chatRoom;
      var messageId = msg.messageId;
      chatRoom.messagesBuff.messages.removeByKey(messageId);
      chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, messageId);
    };

    _this.doRetry = function (e, msg) {
      e.preventDefault(e);
      e.stopPropagation(e);
      var chatRoom = _this.props.message.chatRoom;

      _this.doCancelRetry(e, msg);

      chatRoom._sendMessageToTransport(msg).done(function (internalId) {
        msg.internalId = internalId;

        _this.safeForceUpdate();
      });
    };

    _this.state = {
      editing: _this.props.editing
    };
    return _this;
  }

  var _proto = GenericConversationMessage.prototype;

  _proto.componentDidUpdate = function componentDidUpdate(oldProps, oldState) {
    var isBeingEdited = this.isBeingEdited();
    var isMounted = this.isMounted();

    if (isBeingEdited && isMounted) {
      var $generic = $(this.findDOMNode());
      var $textarea = $('textarea', $generic);

      if ($textarea.length > 0 && !$textarea.is(":focus")) {
        $textarea.trigger("focus");
        moveCursortoToEnd($textarea[0]);
      }

      if (!oldState.editing && this.props.onEditStarted) {
        this.props.onEditStarted($generic);
        moveCursortoToEnd($textarea);
      }
    }

    if (isMounted && !isBeingEdited && oldState.editing === true && this.props.onUpdate) {
      this.props.onUpdate();
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    _ConversationMessageM.prototype.componentDidMount.call(this);

    var self = this;
    var $node = $(self.findDOMNode());

    if (self.isBeingEdited() && self.isMounted()) {
      var $generic = $(self.findDOMNode());
      var $textarea = $('textarea', $generic);

      if ($textarea.length > 0 && !$textarea.is(":focus")) {
        $textarea.trigger("focus");
        moveCursortoToEnd($textarea[0]);
      }
    }

    $node.rebind('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES, function (e) {
      if (e.target.classList.contains('button')) {
        return;
      }

      if (e.target.classList.contains('no-thumb-prev')) {
        return;
      }

      var $block;

      if ($(e.target).is('.shared-data')) {
        $block = $(e.target);
      } else if ($(e.target).is(".shared-info") || $(e.target).parents(".shared-info").length > 0) {
        $block = $(e.target).is(".shared-info") ? $(e.target).next() : $(e.target).parents(".shared-info").next();
      } else {
        $block = $(e.target).parents('.message.shared-data');
      }

      Soon(function () {
        $('.button.default-white-button.tiny-button', $block).trigger('click');
      });
    });
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _ConversationMessageM.prototype.componentWillUnmount.call(this);

    var self = this;
    var $node = $(self.findDOMNode());
    self.props.message.off('onChange.GenericConversationMessage' + self.getUniqueId());
    $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
  };

  _proto.haveMoreContactListeners = function haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }

    if (this.props.message.meta && this.props.message.meta.participants) {
      return this.props.message.meta.participants;
    }

    return false;
  };

  _proto._nodeUpdated = function _nodeUpdated() {
    var self = this;
    Soon(function () {
      if (self.isMounted() && self.isComponentVisible()) {
        self.forceUpdate();

        if (self.dropdown) {
          self.dropdown.forceUpdate();
        }
      }
    });
  };

  _proto._favourite = function _favourite(h) {
    var newFavState = Number(!M.isFavourite(h));
    M.favourite([h], newFavState);
  };

  _proto._addFavouriteButtons = function _addFavouriteButtons(h, arr) {
    var self = this;

    if (M.getNodeRights(h) > 1) {
      var isFav = M.isFavourite(h);
      arr.push(external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        icon: "context " + (isFav ? "broken-heart" : "heart"),
        label: isFav ? l[5872] : l[5871],
        isFav: isFav,
        key: "fav",
        onClick: function onClick(e) {
          self._favourite(h);

          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }));
      return isFav;
    }

    return false;
  };

  _proto._isNodeHavingALink = function _isNodeHavingALink(h) {
    return M.getNodeShare(h) !== false;
  };

  _proto._addLinkButtons = function _addLinkButtons(h, arr) {
    var self = this;
    var haveLink = self._isNodeHavingALink(h) === true;
    var getManageLinkText = haveLink ? l[6909] : l[59];
    arr.push(external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "icons-sprite chain",
      key: "getLinkButton",
      label: getManageLinkText,
      onClick: self._getLink.bind(self, h)
    }));

    if (haveLink) {
      arr.push(external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        icon: "context remove-link",
        key: "removeLinkButton",
        label: __(l[6821]),
        onClick: self._removeLink.bind(self, h)
      }));
      return true;
    }

    return false;
  };

  _proto._startDownload = function _startDownload(v) {
    M.addDownload([v]);
  };

  _proto._addToCloudDrive = function _addToCloudDrive(v, openSendToChat) {
    $.selected = [v.h];
    openSaveToDialog(v, function (node, target) {
      if (Array.isArray(target)) {
        M.myChatFilesFolder.get(true).then(function (myChatFolder) {
          M.injectNodes(node, myChatFolder.h, function (res) {
            if (Array.isArray(res) && res.length) {
              megaChat.openChatAndAttachNodes(target, res).dump();
            } else if (d) {
              console.warn('Unable to inject nodes... no longer existing?', res);
            }
          });
        }).catch(function () {
          if (d) {
            console.error("Failed to allocate 'My chat files' folder.", arguments);
          }
        });
      } else {
        target = target || M.RootID;
        M.injectNodes(node, target, function (res) {
          if (!Array.isArray(res) || !res.length) {
            if (d) {
              console.warn('Unable to inject nodes... no longer existing?', res);
            }
          } else {
            msgDialog('info', l[8005], target === M.RootID ? l[8006] : l[22903].replace('%s', escapeHTML(M.d[target].name)));
          }
        });
      }
    }, openSendToChat ? "conversations" : false);
  };

  _proto._getLink = function _getLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      $.selected = [h];
      mega.Share.initCopyrightsDialog([h]);
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  _proto._removeLink = function _removeLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      var exportLink = new mega.Share.ExportLink({
        'updateUI': true,
        'nodesToProcess': [h]
      });
      exportLink.removeExportLink();
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  _proto._startPreview = function _startPreview(v, e) {
    if ($(e && e.target).is('.tiny-button')) {
      return;
    }

    assert(M.chat, 'Not in chat.');

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    M.viewMediaFile(v);
  };

  _proto.render = function render() {
    var _this2 = this;

    var _this$props = this.props,
        message = _this$props.message,
        chatRoom = _this$props.chatRoom;
    var megaChat = this.props.message.chatRoom.megaChat;
    var textContents = message.textContents;
    var additionalClasses = "";
    var spinnerElement = null;
    var messageIsNowBeingSent = false;

    if (this.props.className) {
      additionalClasses += this.props.className;
    }

    if (message instanceof Message) {
      if (!message.wasRendered || !message.messageHtml) {
        message.messageHtml = htmlentities(textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');
        message.processedBy = {};
        var evtObj = {
          message: message,
          room: chatRoom
        };
        megaChat.trigger('onPreBeforeRenderMessage', evtObj);
        var event = new MegaDataEvent('onBeforeRenderMessage');
        megaChat.trigger(event, evtObj);
        megaChat.trigger('onPostBeforeRenderMessage', evtObj);

        if (event.isPropagationStopped()) {
          this.logger.warn("Event propagation stopped receiving (rendering) of message: " + message);
          return false;
        }

        message.wasRendered = 1;
      }

      var state = message.getState();
      var stateText = message.getStateText(state);

      if (state === Message.STATE.NOT_SENT) {
        messageIsNowBeingSent = unixtime() - message.delay < 5;

        if (messageIsNowBeingSent) {
          additionalClasses += ' sending';
          spinnerElement = external_React_default.a.createElement("div", {
            className: "small-blue-spinner"
          });

          if (!message.sending) {
            message.sending = true;
            delay(this.pid + message.messageId, function () {
              if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                chatRoom.messagesBuff.trackDataChange();

                if (_this2.isMounted()) {
                  _this2.forceUpdate();
                }
              }
            }, (5 - (unixtime() - message.delay)) * 1000);
          }
        } else {
          additionalClasses += ' not-sent';

          if (message.sending === true) {
            message.sending = false;
            message.trigger('onChange', [message, 'sending', true, false]);
          }

          if (message.requiresManualRetry) {
            additionalClasses += ' retrying requires-manual-retry';
          } else {
            additionalClasses += ' retrying';
          }
        }
      } else {
        additionalClasses += ' ' + stateText;
      }
    }

    var MESSAGE = {
      TYPE: {
        ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT,
        CONTACT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT,
        REVOKE_ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT,
        VOICE_CLIP: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP,
        TEXT: textContents[0] !== Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT,
        INLINE: !(message instanceof Message) && message.type && !!message.type.length,
        REVOKED: message.revoked
      },
      props: extends_default()({}, this.props, {
        additionalClasses: additionalClasses
      }),
      isBeingEdited: this.isBeingEdited,
      onDelete: function onDelete(e, message) {
        return _this2.doDelete(e, message);
      }
    };

    switch (true) {
      case MESSAGE.TYPE.REVOKED || MESSAGE.TYPE.REVOKE_ATTACHMENT:
        return null;

      case MESSAGE.TYPE.ATTACHMENT:
        return external_React_default.a.createElement(attachment_Attachment, extends_default()({}, MESSAGE.props, {
          onPreviewStart: function onPreviewStart(v, e) {
            return _this2._startPreview(v, e);
          },
          onDownloadStart: function onDownloadStart(v) {
            return _this2._startDownload(v);
          },
          onAddLinkButtons: function onAddLinkButtons(h, arr) {
            return _this2._addLinkButtons(h, arr);
          },
          onAddToCloudDrive: function onAddToCloudDrive(v, openSendToChat) {
            return _this2._addToCloudDrive(v, openSendToChat);
          },
          onAddFavouriteButtons: function onAddFavouriteButtons(h, arr) {
            return _this2._addFavouriteButtons(h, arr);
          }
        }));

      case MESSAGE.TYPE.CONTACT:
        return external_React_default.a.createElement(contact_Contact, extends_default()({}, MESSAGE.props, {
          onDelete: MESSAGE.onDelete
        }));

      case MESSAGE.TYPE.VOICE_CLIP:
        return external_React_default.a.createElement(voiceClip_VoiceClip, extends_default()({}, MESSAGE.props, {
          isBeingEdited: MESSAGE.isBeingEdited,
          onDelete: MESSAGE.onDelete
        }));

      case MESSAGE.TYPE.INLINE:
        return external_React_default.a.createElement(local_Local, MESSAGE.props);

      case MESSAGE.TYPE.TEXT:
        return external_React_default.a.createElement(text_Text, extends_default()({}, MESSAGE.props, {
          onEditToggle: function onEditToggle() {
            return _this2.setState(function (state) {
              return {
                editing: !state.editing
              };
            });
          },
          onDelete: MESSAGE.onDelete,
          onRetry: function onRetry(e, message) {
            return _this2.doRetry(e, message);
          },
          onCancelRetry: function onCancelRetry(e, message) {
            return _this2.doCancelRetry(e, message);
          },
          isBeingEdited: MESSAGE.isBeingEdited,
          spinnerElement: spinnerElement
        }));
    }
  };

  return GenericConversationMessage;
}(mixin["ConversationMessageMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/messages/alterParticipants.jsx


var alterParticipants_React = __webpack_require__(0);

var alterParticipants_ContactsUI = __webpack_require__(5);

var alterParticipants_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var alterParticipants_AltPartsConvMessage = function (_ConversationMessageM) {
  inherits(AltPartsConvMessage, _ConversationMessageM);

  function AltPartsConvMessage() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = AltPartsConvMessage.prototype;

  _proto._ensureNameIsLoaded = function _ensureNameIsLoaded(h) {
    var self = this;
    var contact = M.u[h] ? M.u[h] : {
      'u': h,
      'h': h,
      'c': 0
    };
    var displayName = generateAvatarMeta(contact.u).fullName;

    if (!displayName) {
      M.u.addChangeListener(function () {
        displayName = generateAvatarMeta(contact.u).fullName;

        if (displayName) {
          self.safeForceUpdate();
          return 0xDEAD;
        }
      });
    }
  };

  _proto.haveMoreContactListeners = function haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }

    if (this.props.message.meta) {
      if (this.props.message.meta.included) {
        return this.props.message.meta.included;
      } else if (this.props.message.meta.excluded) {
        return this.props.message.meta.excluded;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };

  _proto.render = function render() {
    var self = this;
    var message = this.props.message;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = alterParticipants_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var messages = [];
    message.meta.included.forEach(function (h) {
      var otherContact = M.u[h] ? M.u[h] : {
        'u': h,
        'h': h,
        'c': 0
      };
      var avatar = alterParticipants_React.createElement(alterParticipants_ContactsUI.Avatar, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;
      var text = h === contact.u ? __('joined the group chat.') : __(l[8907]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

      self._ensureNameIsLoaded(otherContact.u);

      messages.push(alterParticipants_React.createElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId + "_" + h
      }, avatar, alterParticipants_React.createElement("div", {
        className: "message content-area small-info-txt"
      }, alterParticipants_React.createElement(alterParticipants_ContactsUI.ContactButton, {
        contact: otherContact,
        className: "message",
        label: otherDisplayName,
        chatRoom: self.props.chatRoom
      }), datetime, alterParticipants_React.createElement("div", {
        className: "message text-block",
        dangerouslySetInnerHTML: {
          __html: text
        }
      }))));
    });
    message.meta.excluded.forEach(function (h) {
      var otherContact = M.u[h] ? M.u[h] : {
        'u': h,
        'h': h,
        'c': 0
      };
      var avatar = alterParticipants_React.createElement(alterParticipants_ContactsUI.Avatar, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

      self._ensureNameIsLoaded(otherContact.u);

      var text;

      if (otherContact.u === contact.u) {
        text = __(l[8908]);
      } else {
        text = __(l[8906]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');
      }

      messages.push(alterParticipants_React.createElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId + "_" + h
      }, avatar, alterParticipants_React.createElement("div", {
        className: "message content-area small-info-txt"
      }, alterParticipants_React.createElement(alterParticipants_ContactsUI.ContactButton, {
        contact: otherContact,
        className: "message",
        label: otherDisplayName,
        chatRoom: self.props.chatRoom
      }), datetime, alterParticipants_React.createElement("div", {
        className: "message text-block",
        dangerouslySetInnerHTML: {
          __html: text
        }
      }))));
    });
    return alterParticipants_React.createElement("div", null, messages);
  };

  return AltPartsConvMessage;
}(alterParticipants_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/truncated.jsx


var truncated_React = __webpack_require__(0);

var truncated_ContactsUI = __webpack_require__(5);

var truncated_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var truncated_TruncatedMessage = function (_ConversationMessageM) {
  inherits(TruncatedMessage, _ConversationMessageM);

  function TruncatedMessage() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = TruncatedMessage.prototype;

  _proto.render = function render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = truncated_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var avatar = null;

    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = truncated_React.createElement(truncated_ContactsUI.Avatar, {
        contact: contact,
        className: "message avatar-wrapper small-rounded-avatar",
        chatRoom: chatRoom
      });
      datetime = truncated_React.createElement("div", {
        className: "message date-time simpletip",
        "data-simpletip": time2date(timestampInt)
      }, timestamp);
    }

    return truncated_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, truncated_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, truncated_React.createElement(truncated_ContactsUI.ContactButton, {
      contact: contact,
      className: "message",
      label: displayName,
      chatRoom: chatRoom
    }), datetime, truncated_React.createElement("div", {
      className: "message text-block"
    }, __(l[8905]))));
  };

  return TruncatedMessage;
}(truncated_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/privilegeChange.jsx


var privilegeChange_React = __webpack_require__(0);

var privilegeChange_ContactsUI = __webpack_require__(5);

var privilegeChange_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var privilegeChange_PrivilegeChange = function (_ConversationMessageM) {
  inherits(PrivilegeChange, _ConversationMessageM);

  function PrivilegeChange() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = PrivilegeChange.prototype;

  _proto.haveMoreContactListeners = function haveMoreContactListeners() {
    if (!this.props.message.meta || !this.props.message.meta.targetUserId) {
      return false;
    }

    var uid = this.props.message.meta.targetUserId;

    if (uid && M.u[uid]) {
      return uid;
    }

    return false;
  };

  _proto.render = function render() {
    var self = this;
    var message = this.props.message;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = privilegeChange_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var messages = [];
    var otherContact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
      'u': message.meta.targetUserId,
      'h': message.meta.targetUserId,
      'c': 0
    };
    var avatar = privilegeChange_React.createElement(privilegeChange_ContactsUI.Avatar, {
      contact: otherContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: chatRoom
    });
    var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;
    var newPrivilegeText = "";

    if (message.meta.privilege === 3) {
      newPrivilegeText = l[8875];
    } else if (message.meta.privilege === 2) {
      newPrivilegeText = l[8874];
    } else if (message.meta.privilege === 0) {
      newPrivilegeText = l[8873];
    }

    var text = __(l[8915]).replace("%s1", '<strong className="dark-grey-txt">' + htmlentities(newPrivilegeText) + '</strong>').replace("%s2", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

    messages.push(privilegeChange_React.createElement("div", {
      className: "message body",
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, privilegeChange_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, privilegeChange_React.createElement(privilegeChange_ContactsUI.ContactButton, {
      contact: otherContact,
      className: "message",
      label: otherDisplayName,
      chatRoom: self.props.chatRoom
    }), datetime, privilegeChange_React.createElement("div", {
      className: "message text-block",
      dangerouslySetInnerHTML: {
        __html: text
      }
    }))));
    return privilegeChange_React.createElement("div", null, messages);
  };

  return PrivilegeChange;
}(privilegeChange_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/topicChange.jsx


var topicChange_React = __webpack_require__(0);

var topicChange_ContactsUI = __webpack_require__(5);

var topicChange_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var topicChange_TopicChange = function (_ConversationMessageM) {
  inherits(TopicChange, _ConversationMessageM);

  function TopicChange() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = TopicChange.prototype;

  _proto.render = function render() {
    var self = this;
    var message = this.props.message;
    var megaChat = this.props.message.chatRoom.megaChat;
    var chatRoom = this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = topicChange_React.createElement("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var messages = [];
    var avatar = topicChange_React.createElement(topicChange_ContactsUI.Avatar, {
      contact: contact,
      chatRoom: chatRoom,
      className: "message avatar-wrapper small-rounded-avatar"
    });
    var topic = message.meta.topic;
    var formattedTopic = this._formattedTopic;

    if (this._oldTopic !== topic) {
      this._oldTopic = topic;
      formattedTopic = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(topic));
      this._formattedTopic = formattedTopic;
    }

    var text = __(l[9081]).replace("%s", '<strong className="dark-grey-txt">"' + formattedTopic + '"</strong>');

    messages.push(topicChange_React.createElement("div", {
      className: "message body",
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, topicChange_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, topicChange_React.createElement(topicChange_ContactsUI.ContactButton, {
      contact: contact,
      className: "message",
      label: displayName,
      chatRoom: chatRoom
    }), datetime, topicChange_React.createElement("div", {
      className: "message text-block",
      dangerouslySetInnerHTML: {
        __html: text
      }
    }))));
    return topicChange_React.createElement("div", null, messages);
  };

  return TopicChange;
}(topicChange_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/sharedFilesAccordionPanel.jsx



var sharedFilesAccordionPanel_dec, sharedFilesAccordionPanel_class;

var sharedFilesAccordionPanel_React = __webpack_require__(0);

var sharedFilesAccordionPanel_ReactDOM = __webpack_require__(7);




var sharedFilesAccordionPanel_SharedFileItem = function (_MegaRenderMixin) {
  inherits(SharedFileItem, _MegaRenderMixin);

  function SharedFileItem() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = SharedFileItem.prototype;

  _proto.render = function render() {
    var _this = this;

    var self = this;
    var message = this.props.message;
    var contact = Message.getContactForMessage(message);
    var name = M.getNameByHandle(contact.u);
    var timestamp = time2date(message.delay);
    var node = this.props.node;
    var icon = this.props.icon;
    return sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-block " + (self.props.isLoading ? "is-loading" : ""),
      key: message.messageId + "_" + node.h,
      onClick: function onClick() {
        return _this.props.isPreviewable ? M.viewMediaFile(node) : M.addDownload([node]);
      },
      onDoubleClick: function onDoubleClick() {
        return M.addDownload([node]);
      }
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: "icon-or-thumb " + (thumbnails[node.h] ? "thumb" : "")
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: "medium-file-icon " + icon
    }), sharedFilesAccordionPanel_React.createElement("div", {
      className: "img-wrapper",
      id: this.props.imgId
    }, sharedFilesAccordionPanel_React.createElement("img", {
      alt: "",
      src: thumbnails[node.h] || ""
    }))), sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-info"
    }, sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt"
    }, node.name), sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt small"
    }, name), sharedFilesAccordionPanel_React.createElement("span", {
      className: "txt small grey"
    }, timestamp)));
  };

  return SharedFileItem;
}(mixins["MegaRenderMixin"]);

var sharedFilesAccordionPanel_SharedFilesAccordionPanel = (sharedFilesAccordionPanel_dec = utils["default"].SoonFcWrap(350), (sharedFilesAccordionPanel_class = function (_MegaRenderMixin2) {
  inherits(SharedFilesAccordionPanel, _MegaRenderMixin2);

  function SharedFilesAccordionPanel() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = SharedFilesAccordionPanel.prototype;

  _proto2.eventuallyRenderThumbnails = function eventuallyRenderThumbnails() {
    if (this.allShownNodes) {
      var pending = [];
      var nodes = this.allShownNodes;
      var handles = Object.keys(nodes);

      var render = function render(h) {
        if (thumbnails[h]) {
          var batch = nodes[h];

          for (var i = batch.length; i--;) {
            var n = batch[i];
            var img = document.getElementById('sharedFiles!' + n.ch);

            if (img && (img = img.querySelector('img'))) {
              img.src = thumbnails[h];

              if (img = Object(img.parentNode).parentNode) {
                img.classList.add('thumb');
              }
            }
          }

          return true;
        }
      };

      for (var i = handles.length; i--;) {
        var h = handles[i];

        if (!render(h)) {
          pending.push(nodes[h][0]);
        }
      }

      this.allShownNodes = {};

      if (pending.length) {
        fm_thumbnails('standalone', pending, render);
      }
    }
  };

  _proto2.componentWillMount = function componentWillMount() {
    this.allShownNodes = {};
  };

  _proto2.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin2.prototype.componentWillUnmount.call(this);

    delete this.allShownNodes;
  };

  _proto2.componentDidUpdate = function componentDidUpdate() {
    this.eventuallyRenderThumbnails();
  };

  _proto2.render = function render() {
    var self = this;
    var room = self.props.chatRoom;
    var mb = room.messagesBuff;
    var contents = null;
    var currentPage = mb.sharedFilesPage;
    var startPos = currentPage * 12;
    var endPos = startPos + 12;
    var totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / 12);
    totalPages = mb.sharedFiles.length && !totalPages ? 1 : totalPages;
    var haveMore = mb.haveMoreSharedFiles || currentPage + 1 < totalPages;
    var files = [];

    if (!mb.haveMoreSharedFiles && currentPage === totalPages) {
      currentPage = mb.sharedFilesPage = Math.max(totalPages - 1, 0);
    }

    if (this.props.expanded) {
      var prev = null;
      var next = null;

      if (currentPage > 0) {
        prev = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav button prev",
          onClick: function onClick() {
            mb.sharedFilesPage--;
            self.safeForceUpdate();
          }
        });
      }

      if (haveMore) {
        next = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav button next",
          onClick: function onClick() {
            if (self.isLoadingMore) {
              return;
            }

            if (mb.sharedFiles.length < endPos + 12) {
              self.isLoadingMore = true;
              mb.retrieveSharedFilesHistory(12).always(function () {
                self.isLoadingMore = false;
                mb.sharedFilesPage++;

                if (!mb.haveMoreSharedFiles && mb.sharedFilesPage > totalPages) {
                  mb.sharedFilesPage = totalPages - 1;
                }

                Soon(function () {
                  self.safeForceUpdate();
                });
              });
            } else {
              mb.sharedFilesPage++;
            }

            Soon(function () {
              self.safeForceUpdate();
            });
          }
        });
      }

      if (!mb.sharedFilesLoadedOnce) {
        mb.retrieveSharedFilesHistory(12).always(function () {
          Soon(function () {
            self.safeForceUpdate();
          });
        });
      }

      var sharedNodesContainer = null;

      if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt loading-initial"
        }, sharedFilesAccordionPanel_React.createElement("div", {
          className: "loading-spinner light small"
        }, sharedFilesAccordionPanel_React.createElement("div", {
          className: "main-loader"
        })));
      } else if (mb.sharedFiles.length === 0) {
        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt"
        }, l[19985]);
      } else {
        var keys = clone(mb.sharedFiles.keys()).reverse();

        for (var i = startPos; i < endPos; i++) {
          var message = mb.sharedFiles[keys[i]];

          if (!message) {
            continue;
          }

          var nodes = message.getAttachmentMeta();
          nodes.forEach(function (node) {
            var imgId = "sharedFiles!" + node.ch;

            var _M$getMediaProperties = M.getMediaProperties(node),
                icon = _M$getMediaProperties.icon,
                showThumbnail = _M$getMediaProperties.showThumbnail,
                isPreviewable = _M$getMediaProperties.isPreviewable;

            files.push(sharedFilesAccordionPanel_React.createElement(sharedFilesAccordionPanel_SharedFileItem, {
              message: message,
              key: node.h + "_" + message.messageId,
              isLoading: self.isLoadingMore,
              node: node,
              icon: icon,
              imgId: imgId,
              showThumbnail: showThumbnail,
              isPreviewable: isPreviewable,
              chatRoom: room
            }));

            if (showThumbnail) {
              if (self.allShownNodes[node.h]) {
                if (self.allShownNodes[node.h].indexOf(node) < 0) {
                  self.allShownNodes[node.h].push(node);
                }
              } else {
                self.allShownNodes[node.h] = [node];
              }
            }
          });
        }

        sharedNodesContainer = sharedFilesAccordionPanel_React.createElement("div", null, files);
      }

      contents = sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown content have-animation"
      }, sharedNodesContainer, self.isLoadingMore ? sharedFilesAccordionPanel_React.createElement("div", {
        className: "loading-spinner light small"
      }, sharedFilesAccordionPanel_React.createElement("div", {
        className: "main-loader"
      })) : null, files.length > 0 ? sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-share-nav body"
      }, prev, next, sharedFilesAccordionPanel_React.createElement("div", {
        className: "chat-share-nav pages"
      }, (l[19988] ? l[19988] : "Page %1").replace("%1", currentPage + 1))) : null);
    }

    return sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown container"
    }, sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function onClick(e) {
        self.props.onToggle(e);
      }
    }, sharedFilesAccordionPanel_React.createElement("span", null, this.props.title), sharedFilesAccordionPanel_React.createElement("i", {
      className: "tiny-icon right-arrow"
    })), sharedFilesAccordionPanel_React.createElement("div", {
      className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
    }, contents));
  };

  return SharedFilesAccordionPanel;
}(mixins["MegaRenderMixin"]), (applyDecoratedDescriptor_default()(sharedFilesAccordionPanel_class.prototype, "eventuallyRenderThumbnails", [sharedFilesAccordionPanel_dec], Object.getOwnPropertyDescriptor(sharedFilesAccordionPanel_class.prototype, "eventuallyRenderThumbnails"), sharedFilesAccordionPanel_class.prototype)), sharedFilesAccordionPanel_class));

// CONCATENATED MODULE: ./js/chat/ui/incomingSharesAccordionPanel.jsx


var incomingSharesAccordionPanel_React = __webpack_require__(0);

var incomingSharesAccordionPanel_ReactDOM = __webpack_require__(7);



var incomingSharesAccordionPanel_SharedFolderItem = function (_MegaRenderMixin) {
  inherits(SharedFolderItem, _MegaRenderMixin);

  function SharedFolderItem() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = SharedFolderItem.prototype;

  _proto.render = function render() {
    var self = this;
    var node = this.props.node;
    return incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-block incoming " + (self.props.isLoading ? "is-loading" : ""),
      key: node.h,
      onClick: function onClick() {
        M.openFolder(node.h);
      },
      onDoubleClick: function onDoubleClick() {
        M.openFolder(node.h);
      }
    }, incomingSharesAccordionPanel_React.createElement("div", {
      className: "medium-file-icon inbound-share"
    }), incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-info"
    }, incomingSharesAccordionPanel_React.createElement("span", {
      className: "txt"
    }, node.name), incomingSharesAccordionPanel_React.createElement("span", {
      className: "txt small"
    }, fm_contains(node.tf, node.td))));
  };

  return SharedFolderItem;
}(mixins["MegaRenderMixin"]);

var incomingSharesAccordionPanel_IncSharesAccordionPanel = function (_MegaRenderMixin2) {
  inherits(IncSharesAccordionPanel, _MegaRenderMixin2);

  function IncSharesAccordionPanel() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = IncSharesAccordionPanel.prototype;

  _proto2.componentWillMount = function componentWillMount() {
    this.hadLoaded = false;
  };

  _proto2.getContactHandle = function getContactHandle() {
    var self = this;
    var room = self.props.chatRoom;
    var contactHandle = room.getParticipantsExceptMe()[0];

    if (!contactHandle || room.type !== "private") {
      return {};
    }

    return contactHandle;
  };

  _proto2.render = function render() {
    var self = this;
    var room = self.props.chatRoom;
    var contactHandle = self.getContactHandle();
    var contents = null;

    if (this.props.expanded) {
      if (!this.hadLoaded) {
        this.hadLoaded = true;
        self.isLoadingMore = true;
        dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).always(function () {
          self.isLoadingMore = false;
          Soon(function () {
            if (self.isComponentEventuallyVisible()) {
              self.safeForceUpdate();
            }
          }, 5000);
        });
      }

      var incomingSharesContainer = null;
      var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

      if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
        incomingSharesContainer = incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-dropdown empty-txt"
        }, l[19986]);
      } else {
        var haveMore = sharedFolders.length > 10;
        var defSortFn = M.getSortByNameFn();
        sharedFolders.sort(function (a, b) {
          var nodeA = M.d[a];
          var nodeB = M.d[b];
          return defSortFn(nodeA, nodeB, -1);
        });
        var renderNodes = [];

        for (var i = 0; i < Math.min(sharedFolders.length, 10); i++) {
          var nodeHandle = sharedFolders[i];
          var node = M.d[nodeHandle];

          if (!node) {
            continue;
          }

          renderNodes.push(incomingSharesAccordionPanel_React.createElement(incomingSharesAccordionPanel_SharedFolderItem, {
            key: node.h,
            isLoading: self.isLoadingMore,
            node: node,
            chatRoom: room
          }));
        }

        incomingSharesContainer = incomingSharesAccordionPanel_React.createElement("div", null, renderNodes, haveMore ? incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav body"
        }, incomingSharesAccordionPanel_React.createElement("div", {
          className: "chat-share-nav show-all",
          onClick: function onClick() {
            M.openFolder(contactHandle);
          }
        }, incomingSharesAccordionPanel_React.createElement("span", {
          className: "transfer-filetype-icon inbound-share"
        }, incomingSharesAccordionPanel_React.createElement("span", {
          className: "transfer-filetype-icon inbound-share"
        })), incomingSharesAccordionPanel_React.createElement("span", {
          className: "txt"
        }, __(l[19797]) ? __(l[19797]) : "Show All"))) : null);
      }

      contents = incomingSharesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown content have-animation"
      }, incomingSharesContainer, self.isLoadingMore ? incomingSharesAccordionPanel_React.createElement("div", {
        className: "chat-dropdown empty-txt"
      }, incomingSharesAccordionPanel_React.createElement("div", {
        className: "loading-spinner light small"
      }, incomingSharesAccordionPanel_React.createElement("div", {
        className: "main-loader"
      }))) : null);
    }

    return incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown container"
    }, incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
      onClick: function onClick(e) {
        self.props.onToggle(e);
      }
    }, incomingSharesAccordionPanel_React.createElement("span", null, this.props.title), incomingSharesAccordionPanel_React.createElement("i", {
      className: "tiny-icon right-arrow"
    })), incomingSharesAccordionPanel_React.createElement("div", {
      className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
    }, contents));
  };

  return IncSharesAccordionPanel;
}(mixins["MegaRenderMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/messages/closeOpenMode.jsx


var closeOpenMode_React = __webpack_require__(0);

var closeOpenMode_ContactsUI = __webpack_require__(5);

var closeOpenMode_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var closeOpenMode_CloseOpenModeMessage = function (_ConversationMessageM) {
  inherits(CloseOpenModeMessage, _ConversationMessageM);

  function CloseOpenModeMessage() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = CloseOpenModeMessage.prototype;

  _proto.render = function render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    this.props.message.chatRoom.megaChat;
    this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = closeOpenMode_React.createElement("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var avatar = null;

    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = closeOpenMode_React.createElement(closeOpenMode_ContactsUI.Avatar, {
        contact: contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = closeOpenMode_React.createElement("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }

    return closeOpenMode_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, closeOpenMode_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, closeOpenMode_React.createElement("div", {
      className: "message user-card-name"
    }, displayName), datetime, closeOpenMode_React.createElement("div", {
      className: "message text-block"
    }, __(l[23450]))));
  };

  return CloseOpenModeMessage;
}(closeOpenMode_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/messages/chatHandle.jsx


var chatHandle_React = __webpack_require__(0);

var chatHandle_ReactDOM = __webpack_require__(7);

var chatHandle_utils = __webpack_require__(6);

var chatHandle_ContactsUI = __webpack_require__(5);

var chatHandle_ConversationMessageMixin = __webpack_require__(11).ConversationMessageMixin;

var getMessageString = __webpack_require__(16).getMessageString;

var chatHandle_ChatHandleMessage = function (_ConversationMessageM) {
  inherits(ChatHandleMessage, _ConversationMessageM);

  function ChatHandleMessage() {
    return _ConversationMessageM.apply(this, arguments) || this;
  }

  var _proto = ChatHandleMessage.prototype;

  _proto.render = function render() {
    var self = this;
    var cssClasses = "message body";
    var message = this.props.message;
    this.props.message.chatRoom.megaChat;
    this.props.message.chatRoom;
    var contact = self.getContact();
    var timestampInt = self.getTimestamp();
    var timestamp = self.getTimestampAsString();
    var datetime = chatHandle_React.createElement("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
    var displayName;

    if (contact) {
      displayName = generateAvatarMeta(contact.u).fullName;
    } else {
      displayName = contact;
    }

    var avatar = null;

    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = chatHandle_React.createElement(chatHandle_ContactsUI.Avatar, {
        contact: contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = chatHandle_React.createElement("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }

    return chatHandle_React.createElement("div", {
      className: cssClasses,
      "data-id": "id" + message.messageId,
      key: message.messageId
    }, avatar, chatHandle_React.createElement("div", {
      className: "message content-area small-info-txt"
    }, chatHandle_React.createElement("div", {
      className: "message user-card-name"
    }, displayName), datetime, chatHandle_React.createElement("div", {
      className: "message text-block"
    }, message.meta.handleUpdate === 1 ? l[20570] : l[20571])));
  };

  return ChatHandleMessage;
}(chatHandle_ConversationMessageMixin);


// CONCATENATED MODULE: ./js/chat/ui/chatlinkDialog.jsx








var chatlinkDialog_ChatlinkDialog = function (_MegaRenderMixin) {
  inherits(ChatlinkDialog, _MegaRenderMixin);

  function ChatlinkDialog(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      'link': l[5533],
      newTopic: ''
    };
    _this.onPopupDidMount = _this.onPopupDidMount.bind((_this));
    _this.onClose = _this.onClose.bind((_this));
    _this.onTopicFieldChanged = _this.onTopicFieldChanged.bind((_this));
    _this.onTopicFieldKeyPress = _this.onTopicFieldKeyPress.bind((_this));
    return _this;
  }

  var _proto = ChatlinkDialog.prototype;

  _proto.onPopupDidMount = function onPopupDidMount($node) {
    this.$popupNode = $node;
  };

  _proto.componentWillMount = function componentWillMount() {
    var self = this;
    $.dialog = "group-chat-link";
    self.retrieveChatLink();
  };

  _proto.retrieveChatLink = function retrieveChatLink() {
    var self = this;
    var chatRoom = self.props.chatRoom;

    if (!chatRoom.topic) {
      delete self.loading;
      return;
    }

    self.loading = chatRoom.updatePublicHandle(undefined).always(function () {
      if (chatRoom.publicLink) {
        self.setState({
          'link': getBaseUrl() + '/' + chatRoom.publicLink
        });
      } else {
        self.setState({
          'link': l[20660]
        });
      }
    });
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    if ($.dialog === "group-chat-link") {
      closeDialog();
    }
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    var self = this;
    var chatRoom = this.props.chatRoom;

    if (!this.loading && chatRoom.topic) {
      this.retrieveChatLink();
    }

    this.toastTxt = l[7654];

    if (!this.$popupNode) {
      return;
    }

    var $node = this.$popupNode;
    var $copyButton = $('.copy-to-clipboard', $node);
    $copyButton.rebind('click', function () {
      copyToClipboard(self.state.link, self.toastTxt);
      return false;
    });
    $('span', $copyButton).text(l[1990]);
  };

  _proto.onClose = function onClose() {
    if (this.props.onClose) {
      this.props.onClose();
    }

    affiliateUI.registeredDialog.show();
  };

  _proto.onTopicFieldChanged = function onTopicFieldChanged(e) {
    this.setState({
      'newTopic': e.target.value
    });
  };

  _proto.onTopicFieldKeyPress = function onTopicFieldKeyPress(e) {
    var self = this;

    if (e.which === 13) {
      self.props.chatRoom.setRoomTitle(self.state.newTopic);
    }
  };

  _proto.render = function render() {
    var self = this;
    var closeButton = external_React_default.a.createElement("div", {
      key: "close",
      className: "default-red-button right links-button",
      onClick: function onClick() {
        self.onClose();
      }
    }, external_React_default.a.createElement("span", null, l[148]));
    return external_React_default.a.createElement(modalDialogs["a" ].ModalDialog, extends_default()({}, this.state, {
      title: self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? l[9080] : "",
      className: "fm-dialog chat-rename-dialog export-chat-links-dialog group-chat-link" + (!self.props.chatRoom.topic ? " requires-topic" : ""),
      onClose: function onClose() {
        self.onClose(self);
      },
      chatRoom: self.props.chatRoom,
      popupDidMount: self.onPopupDidMount
    }), external_React_default.a.createElement("div", {
      className: "export-content-block"
    }, self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? external_React_default.a.createElement("div", null, external_React_default.a.createElement("div", {
      className: "export-chat-ink-warning"
    }, l[20617]), external_React_default.a.createElement("div", {
      className: "rename-input-bl",
      style: {
        width: '320px',
        margin: '10px auto 20px auto'
      }
    }, external_React_default.a.createElement("input", {
      type: "text",
      name: "newTopic",
      value: self.state.newTopic,
      ref: function ref(field) {
        self.topicInput = field;
      },
      style: {
        'paddingLeft': 8
      },
      onChange: self.onTopicFieldChanged.bind(self),
      onKeyPress: self.onTopicFieldKeyPress.bind(self),
      placeholder: l[20616],
      maxLength: "30"
    }))) : external_React_default.a.createElement("div", {
      className: "fm-dialog-body"
    }, external_React_default.a.createElement("i", {
      className: "big-icon group-chat"
    }), external_React_default.a.createElement("div", {
      className: "chat-title"
    }, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, self.props.chatRoom.topic)), external_React_default.a.createElement("div", {
      className: "chat-link-input"
    }, external_React_default.a.createElement("i", {
      className: "small-icon blue-chain colorized"
    }), external_React_default.a.createElement("input", {
      type: "text",
      readOnly: true,
      value: !self.props.chatRoom.topic ? l[20660] : self.state.link
    })), external_React_default.a.createElement("div", {
      className: "info"
    }, self.props.chatRoom.publicLink ? l[20644] : null))), external_React_default.a.createElement("div", {
      className: "fm-notifications-bottom"
    }, self.props.chatRoom.iAmOperator() && self.props.chatRoom.publicLink ? external_React_default.a.createElement("div", {
      key: "deleteLink",
      className: "default-white-button left links-button" + (self.loading && self.loading.state() === 'pending' ? " disabled" : ""),
      onClick: function onClick() {
        self.props.chatRoom.updatePublicHandle(1);
        self.onClose();
      }
    }, external_React_default.a.createElement("span", null, l[20487])) : null, self.props.chatRoom.topic ? self.props.chatRoom.publicLink ? external_React_default.a.createElement("div", {
      className: "default-green-button button right copy-to-clipboard" + (self.loading && self.loading.state() === 'pending' ? " disabled" : "")
    }, external_React_default.a.createElement("span", null, l[63])) : closeButton : self.props.chatRoom.iAmOperator() ? external_React_default.a.createElement("div", {
      key: "setTopic",
      className: "default-red-button right links-button" + (self.state.newTopic && $.trim(self.state.newTopic) ? "" : " disabled"),
      onClick: function onClick() {
        if (self.props.chatRoom.iAmOperator()) {
          self.props.chatRoom.setRoomTitle(self.state.newTopic);
        }
      }
    }, external_React_default.a.createElement("span", null, l[20615])) : closeButton, external_React_default.a.createElement("div", {
      className: "clear"
    })));
  };

  return ChatlinkDialog;
}(mixins["MegaRenderMixin"]);

chatlinkDialog_ChatlinkDialog.defaultProps = {
  'requiresUpdateOnResize': true,
  'disableCheckingVisibility': true
};

// CONCATENATED MODULE: ./js/chat/ui/conversationaudiovideopanel.jsx








var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1;
var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;
var VIEW_MODES = {
  "GRID": 1,
  "CAROUSEL": 2
};

function muteOrHoldIconStyle(opts, contact) {
  var props = {};

  if (opts.onHold) {
    props.className = "small-icon icon-audio-muted on-hold simpletip";
    props["data-simpletip"] = l[23542].replace("%s", M.getNameByHandle(contact.u));
  } else if (!opts.audio) {
    props.className = "small-icon icon-audio-muted";
  } else {
    props.className = "small-icon hidden";
  }

  return props;
}

var conversationaudiovideopanel_RemoteVideoPlayer = function (_MegaRenderMixin) {
  inherits(RemoteVideoPlayer, _MegaRenderMixin);

  function RemoteVideoPlayer(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {};
    return _this;
  }

  var _proto = RemoteVideoPlayer.prototype;

  _proto.render = function render() {
    var self = this;
    var sess = self.props.sess;
    var sid = sess.stringSid;
    var peerMedia = Av.toMediaOptions(this.props.peerAv);
    var contact = M.u[base64urlencode(sess.peer)];

    if (!self.props.video) {
      assert(contact);
      return external_React_default.a.createElement("div", {
        className: "call user-audio is-avatar " + (self.props.isActive ? "active" : "") + " stream" + sid,
        onClick: function onClick() {
          var onPlayerClick = self.props.onPlayerClick;

          if (onPlayerClick) {
            onPlayerClick(sid);
          }
        }
      }, sess.peerNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
        className: "icon-connection-issues"
      }) : null, external_React_default.a.createElement("div", {
        className: "center-avatar-wrapper",
        style: {
          left: "auto"
        }
      }, external_React_default.a.createElement("div", muteOrHoldIconStyle(peerMedia, contact)), external_React_default.a.createElement(ui_contacts["Avatar"], {
        contact: contact,
        className: "avatar-wrapper",
        simpletip: contact.name,
        simpletipWrapper: "#call-block",
        simpletipOffset: 8,
        simpletipPosition: "top",
        hideVerifiedBadge: true
      })), external_React_default.a.createElement("div", {
        className: "audio-level",
        ref: function ref(_ref) {
          self.audioLevelDiv = _ref;
        }
      }));
    } else {
      return external_React_default.a.createElement("div", {
        className: "call user-video is-video " + (self.props.isActive ? "active" : "") + " stream" + sid + (peerMedia.screen ? " is-screen" : ""),
        onClick: function onClick() {
          var onPlayerClick = self.props.onPlayerClick;

          if (onPlayerClick) {
            onPlayerClick(sid);
          }
        }
      }, sess.peerNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
        className: "icon-connection-issues"
      }) : null, external_React_default.a.createElement("div", muteOrHoldIconStyle(peerMedia, contact)), external_React_default.a.createElement("div", {
        className: "audio-level",
        ref: function ref(_ref2) {
          self.audioLevelDiv = _ref2;
        }
      }), external_React_default.a.createElement("video", {
        autoPlay: true,
        className: "rmtViewport rmtVideo",
        ref: "player"
      }));
    }
  };

  _proto.indicateAudioLevel = function indicateAudioLevel(level) {
    if (this.audioLevelDiv) {
      this.audioLevelDiv.style.width = Math.round(level * 100) + '%';
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    var self = this;

    if (!self.props.noAudioLevel) {
      self.props.sess.audioIndicator = this;
    }

    _MegaRenderMixin.prototype.componentDidMount.call(this);

    self.relinkToStream();
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    if (this.player) {
      RTC.detachMediaStream(this.player);
      delete this.player;
    }
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    _MegaRenderMixin.prototype.componentDidUpdate.call(this);

    this.relinkToStream();
  };

  _proto.relinkToStream = function relinkToStream() {
    var self = this;
    var player = self.refs.player;

    if (self.props.video) {
      assert(player);
      var sess = self.props.sess;

      if (player.srcObject) {
        if (player.srcObject.id === sess.remoteStream.id && !player.paused) {
          return;
        }

        RTC.detachMediaStream(player);
      }

      RTC.attachMediaStream(player, sess.remoteStream);
    } else {
      if (player) {
        RTC.detachMediaStream(player);
      }
    }
  };

  return RemoteVideoPlayer;
}(mixins["MegaRenderMixin"]);

var conversationaudiovideopanel_ConversationAVPanel = function (_MegaRenderMixin2) {
  inherits(ConversationAVPanel, _MegaRenderMixin2);

  function ConversationAVPanel(props) {
    var _this2 = _MegaRenderMixin2.call(this, props) || this;

    _this2.state = {
      'messagesBlockEnabled': false,
      'fullScreenModeEnabled': false,
      'localMediaDisplay': true,
      'viewMode': VIEW_MODES.GRID,
      'selectedStreamSid': false
    };
    return _this2;
  }

  var _proto2 = ConversationAVPanel.prototype;

  _proto2.specShouldComponentUpdate = function specShouldComponentUpdate() {
    if (this.state.fullScreenModeEnabled) {
      return true;
    }
  };

  _proto2.getActiveSid = function getActiveSid() {
    var self = this;
    var call = self.props.chatRoom.callManagerCall;

    if (!call) {
      return false;
    }

    var rtcCall = call.rtcCall;
    var selected = self.state.selectedStreamSid;

    if (selected && selected !== "local" && !rtcCall.sessions[base64urldecode(selected)]) {
      selected = null;
    }

    if (selected) {
      return selected;
    }

    var sess = Object.values(rtcCall.sessions)[0];
    return sess ? sess.stringSid : "local";
  };

  _proto2.haveScreenSharingPeer = function haveScreenSharingPeer() {
    var call = this.props.chatRoom.callManagerCall;

    if (!call) {
      return false;
    }

    var rtcCall = call.rtcCall;

    if (!rtcCall.sessions) {
      return false;
    }

    var sessions = rtcCall.sessions;

    for (var sid in sessions) {
      var av = sessions[sid].peerAv;

      if (av != null && av & Av.Screen) {
        return true;
      }
    }

    return false;
  };

  _proto2.getViewMode = function getViewMode() {
    var chatRoom = this.props.chatRoom;
    var callManagerCall = chatRoom.callManagerCall;

    if (callManagerCall) {
      var participantsCount = Object.keys(callManagerCall.rtcCall.sessions).length;

      if (DEBUG_PARTICIPANTS_MULTIPLICATOR) {
        participantsCount *= DEBUG_PARTICIPANTS_MULTIPLICATOR;
      }

      if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
        return VIEW_MODES.CAROUSEL;
      }
    }

    if (chatRoom.type === "private") {
      return VIEW_MODES.GRID;
    }

    if (this.haveScreenSharingPeer()) {
      return VIEW_MODES.CAROUSEL;
    }

    return this.state.viewMode;
  };

  _proto2.onPlayerClick = function onPlayerClick(sid) {
    if (this.getViewMode() !== VIEW_MODES.CAROUSEL) {
      return;
    }

    this.setState({
      'selectedStreamSid': sid
    });
  };

  _proto2._hideBottomPanel = function _hideBottomPanel() {
    var self = this;

    if (!self.isMounted()) {
      return;
    }

    var room = self.props.chatRoom;

    if (!room.callManagerCall || !room.callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default.a.findDOMNode(self));
    self.visiblePanel = false;
    $container.removeClass('visible-panel');
    $(document).trigger('closeDropdowns');
  };

  _proto2.resizeVideos = function resizeVideos() {
    var self = this;
    var chatRoom = self.props.chatRoom;

    if (chatRoom.type === "private") {
      return;
    }

    var callManagerCall = chatRoom.callManagerCall;

    if (!callManagerCall || !callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default.a.findDOMNode(self));
    var totalWidth = $container.outerWidth();

    if (totalWidth > $('.participantsContainer', $container).parent().outerWidth()) {
      totalWidth = $('.participantsContainer', $container).parent().outerWidth();
    }

    if (ua.details.browser === "Safari") {
      totalWidth -= 1;
    }

    var $streams = $('.user-video, .user-audio', $container);
    var totalStreams = $streams.length;

    if (totalStreams === 1) {
      totalWidth = Math.min(totalWidth, $container.outerHeight() - $('.call-header', $container).outerHeight());
    }

    var newWidth;

    if (self.getViewMode() === VIEW_MODES.CAROUSEL) {
      var activeStreamHeight = $container.outerHeight() - $('.call-header').outerHeight() - $('.participantsContainer', $container).outerHeight();
      var activeSid = this.getActiveSid();
      var mediaOpts = activeSid === "local" ? callManagerCall.getMediaOptions() : callManagerCall.getRemoteMediaOptions(activeSid);
      $('.activeStream', $container).height(activeStreamHeight);
      $('.user-video, .user-audio, .user-video video', $container).width('').height('');
      var $video;
      var $mutedIcon;
      $video = $('.activeStream video', $container);
      $mutedIcon = $('.activeStream .icon-audio-muted', $container);

      if ($video.length > 0 && $mutedIcon.length > 0) {
        if ($video.outerHeight() > 0 && $video[0].videoWidth > 0 && $video[0].videoHeight > 0) {
          var actualWidth = Math.min($video.outerWidth(), $video[0].videoWidth / $video[0].videoHeight * $video.outerHeight());

          if (mediaOpts.audio) {
            $mutedIcon.addClass('hidden');
          } else {
            $mutedIcon.removeClass('hidden');
          }

          $mutedIcon.css({
            'right': 'auto',
            'left': $video.outerWidth() / 2 + actualWidth / 2 - $mutedIcon.outerWidth() - 24
          });
        } else {
          $video.one('loadeddata.cav loadedmetadata.cav', function () {
            self.resizeVideos();
          });
          $mutedIcon.addClass('hidden');
        }
      }
    } else {
      newWidth = totalWidth / totalStreams;
    }

    var $resizables = $('.user-video, .user-audio', $('.participantsContainer', $container));
    $resizables.width(newWidth);

    for (var i = 0; i < $resizables.length; i++) {
      var elem = $resizables[i];
      var $elem = $(elem);
      $('video', elem).width(newWidth).height(newWidth);
      $elem.width(newWidth).height(newWidth);
    }
  };

  _proto2.componentDidMount = function componentDidMount() {
    _MegaRenderMixin2.prototype.componentDidMount.call(this);

    this.resizeVideos();
    this.initialRender = false;
  };

  _proto2.componentDidUpdate = function componentDidUpdate() {
    _MegaRenderMixin2.prototype.componentDidUpdate.call(this);

    var self = this;
    var room = self.props.chatRoom;
    var callManagerCall = room.callManagerCall;

    if (!callManagerCall || !callManagerCall.isActive()) {
      return;
    }

    var $container = $(external_ReactDOM_default.a.findDOMNode(self));
    var mouseoutThrottling = null;
    $container.rebind('mouseover.chatUI' + room.roomId, function () {
      var $this = $(this);
      clearTimeout(mouseoutThrottling);
      self.visiblePanel = true;
      $container.addClass('visible-panel');

      if ($this.hasClass('full-sized-block')) {
        $('.call.top-panel', $container).addClass('visible-panel');
      }
    });
    $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomId, function () {
      $(this);
      clearTimeout(mouseoutThrottling);

      if ($('.dropdown.call-actions').length > 0) {
        return;
      }

      mouseoutThrottling = setTimeout(function () {
        self.visiblePanel = false;

        self._hideBottomPanel();

        $container.removeClass('visible-panel');
      }, 500);
    });
    var idleMouseTimer;
    var forceMouseHide = false;

    var hideBottomPanel = function hideBottomPanel() {
      self.visiblePanel = false;

      self._hideBottomPanel();

      $container.addClass('no-cursor');
      $container.removeClass('visible-panel');
      forceMouseHide = true;
      setTimeout(function () {
        forceMouseHide = false;
      }, 400);
    };

    $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomId, function () {
      var $this = $(this);

      if (self._bottomPanelMouseOver) {
        return;
      }

      clearTimeout(idleMouseTimer);

      if (!forceMouseHide) {
        self.visiblePanel = true;
        $container.addClass('visible-panel');
        $container.removeClass('no-cursor');

        if ($this.hasClass('full-sized-block')) {
          $('.call.top-panel', $container).addClass('visible-panel');
        }

        idleMouseTimer = setTimeout(hideBottomPanel, 20000);
      }
    });
    $('.call.bottom-panel', $container).rebind('mouseenter.chatUI' + self.props.chatRoom.roomId, function () {
      self._bottomPanelMouseOver = true;
      clearTimeout(idleMouseTimer);
    });
    $('.call.bottom-panel', $container).rebind('mouseleave.chatUI' + self.props.chatRoom.roomId, function () {
      self._bottomPanelMouseOver = false;
      idleMouseTimer = setTimeout(hideBottomPanel, 20000);
    });
    $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
      if (!$(document).fullScreen() && room.isCurrentlyActive) {
        self.setState({
          fullScreenModeEnabled: false
        });
      } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
        self.setState({
          fullScreenModeEnabled: true
        });
      }

      self.forceUpdate();
    });
    var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
    $localMediaDisplay.draggable({
      'refreshPositions': true,
      'containment': $container,
      'scroll': false,
      drag: function drag(event, ui) {
        if ($(this).is(".minimized")) {
          return false;
        }

        var right = Math.max(0, $container.outerWidth(true) - ui.position.left);
        var bottom = Math.max(0, $container.outerHeight(true) - ui.position.top);
        right = Math.min(right, $container.outerWidth(true) - 8);
        bottom = Math.min(bottom, $container.outerHeight(true) - 8);
        right -= ui.helper.outerWidth(true);
        bottom -= ui.helper.outerHeight(true);
        ui.offset = {
          left: 'auto',
          top: 'auto',
          right: right < 8 ? 8 : right,
          bottom: bottom < 8 ? 8 : bottom,
          height: "",
          width: ""
        };
        ui.position.left = 'auto';
        ui.position.top = 'auto';
        ui.helper.css(ui.offset);
        $(this).css(ui.offset);
      }
    });
    chatGlobalEventManager.addEventListener('resize', 'chatUI_' + room.roomId, function () {
      if ($container.is(":visible")) {
        if (!elementInViewport($localMediaDisplay[0])) {
          $localMediaDisplay.removeAttr('style');
        }
      }

      self.resizePanes();
      self.resizeVideos();
    });
    room.rebind('toggleMessages.av', function () {
      self.toggleMessages();
    });
    room.messagesBlockEnabled = self.state.messagesBlockEnabled;
    this.props.chatRoom.rebind('onLocalMuteInProgress.ui', function () {
      self.setState({
        'muteInProgress': true
      });
    });
    this.props.chatRoom.rebind('onLocalMuteComplete.ui', function () {
      self.setState({
        'muteInProgress': false
      });
    });

    if (self.initialRender === false && $container) {
      self.bindInitialEvents();
    }

    self.resizePanes();
    self.resizeVideos();
    $('.simpletip', $container).trigger('simpletipUpdated');
  };

  _proto2.resizePanes = function resizePanes() {
    var self = this;
    var $container = $(self.findDOMNode());
    var $rootContainer = $container.parents('.conversation-panel');

    if (!self.state.messagesBlockEnabled && self.props.chatRoom.callManagerCall) {
      $('.call-block', $rootContainer).height('');
    }

    $rootContainer.trigger('resized');
  };

  _proto2.bindInitialEvents = function bindInitialEvents() {
    var self = this;
    var $container = $(external_ReactDOM_default.a.findDOMNode(self));
    self.avResizable = new FMResizablePane($container, {
      'direction': 's',
      'handle': '.av-resize-handler',
      'minHeight': 168,
      'persistanceKey': false,
      'containment': $container.parent()
    });
    $(self.avResizable).rebind('resize.avp', function (e, e2, ui) {
      self.resizePanes();
      localStorage.chatAvPaneHeight = ui.size.height;
    });
    self.initialRender = true;
  };

  _proto2.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin2.prototype.componentWillUnmount.call(this);

    var self = this;
    var room = self.props.chatRoom;
    var $container = $(external_ReactDOM_default.a.findDOMNode(self));

    if ($container) {
      $container.off('mouseover.chatUI' + self.props.chatRoom.roomId);
      $container.off('mouseout.chatUI' + self.props.chatRoom.roomId);
      $container.off('mousemove.chatUI' + self.props.chatRoom.roomId);
    }

    $(document).off("fullscreenchange.megaChat_" + room.roomId);
    chatGlobalEventManager.removeEventListener('resize', 'chatUI_' + room.roomId);
    room.off('toggleMessages.av');
    var $rootContainer = $container.parents('.conversation-panel');
    $('.call-block', $rootContainer).height('');
    self.initialRender = false;
  };

  _proto2.toggleMessages = function toggleMessages(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (this.props.onMessagesToggle) {
      this.props.onMessagesToggle(!this.state.messagesBlockEnabled);
      var $container = $(this.findDOMNode());
      var predefHeight = localStorage.chatAvPaneHeight || false;

      if (predefHeight) {
        $container.height(parseInt(localStorage.chatAvPaneHeight, 10));
      }

      $('.simpletip', $container).trigger('simpletipClose');
    }

    this.setState({
      'messagesBlockEnabled': !this.state.messagesBlockEnabled
    });

    if (!this.state.messagesBlockEnabled) {
      Soon(function () {
        $(window).trigger('resize');
      });
    }
  };

  _proto2.fullScreenModeToggle = function fullScreenModeToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    var newVal = !this.state.fullScreenModeEnabled;
    var $container = $(external_ReactDOM_default.a.findDOMNode(this));
    $(document).fullScreen(newVal);
    $('.simpletip', $container).trigger('simpletipClose');
    this.setState({
      'fullScreenModeEnabled': newVal,
      'messagesBlockEnabled': newVal ? false : this.state.messagesBlockEnabled
    });
  };

  _proto2.toggleLocalVideoDisplay = function toggleLocalVideoDisplay(e) {
    e.preventDefault();
    e.stopPropagation();
    var $container = $(external_ReactDOM_default.a.findDOMNode(this));
    var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
    var newVal = !this.state.localMediaDisplay;
    $localMediaDisplay.removeAttr('style');
    this.setState({
      localMediaDisplay: newVal
    });
  };

  _proto2.render = function render() {
    var chatRoom = this.props.chatRoom;
    var self = this;
    var callManagerCall = chatRoom.callManagerCall;

    if (!callManagerCall || !callManagerCall.isStarted()) {
      self.initialRender = false;
      return null;
    }

    var rtcCall = callManagerCall.rtcCall;
    assert(rtcCall);
    var participants = chatRoom.getParticipantsExceptMe();
    var displayNames = [];
    participants.forEach(function (v) {
      displayNames.push(htmlentities(M.getNameByHandle(v)));
    });
    var localPlayerElement = null;
    var remotePlayerElements = [];
    var onRemotePlayerClick;
    var isCarousel = self.getViewMode() === VIEW_MODES.CAROUSEL;

    if (isCarousel) {
      var activeSid = self.getActiveSid();
      var activePlayer;
      onRemotePlayerClick = self.onPlayerClick.bind(self);
    }

    var sessions = rtcCall.sessions;
    var realSids = Object.keys(sessions);
    var sids = [];
    var initialCount = realSids.length;

    for (var i = 0; i < initialCount; i++) {
      for (var j = 0; j < DEBUG_PARTICIPANTS_MULTIPLICATOR; j++) {
        sids.push(realSids[i]);
      }
    }

    this.visiblePanel ? " visible-panel" : "";
    var localMedia = Av.toMediaOptions(rtcCall.localAv());
    sids.forEach(function (binSid, i) {
      var sess = sessions[binSid];
      var sid = sess.stringSid;
      var playerIsActive = activeSid === sid;
      var av = sess.peerAv();
      var hasVideo = (av & Av.Video) != 0 && !sess.call.isOnHold() && !sess.peerIsOnHold();
      var player = external_React_default.a.createElement(conversationaudiovideopanel_RemoteVideoPlayer, {
        sess: sess,
        key: sid + "_" + i,
        peerAv: av,
        video: hasVideo,
        isActive: playerIsActive,
        onPlayerClick: onRemotePlayerClick
      });

      if (playerIsActive && isCarousel) {
        activePlayer = external_React_default.a.createElement(conversationaudiovideopanel_RemoteVideoPlayer, {
          sess: sess,
          key: "carousel_active",
          peerAv: av,
          video: hasVideo,
          isCarouselMain: true,
          noAudioLevel: true
        });
      }

      remotePlayerElements.push(player);
    });

    if (this.getViewMode() === VIEW_MODES.GRID) {
      if (!localMedia.video) {
        localPlayerElement = external_React_default.a.createElement("div", {
          className: "call local-audio right-aligned bottom-aligned is-avatar" + (this.state.localMediaDisplay ? "" : " minimized ")
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default.a.createElement("div", {
          className: "default-white-button tiny-button call",
          onClick: this.toggleLocalVideoDisplay.bind(this)
        }, external_React_default.a.createElement("i", {
          className: "tiny-icon grey-minus-icon"
        })), external_React_default.a.createElement("div", {
          className: "center-avatar-wrapper"
        }, external_React_default.a.createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default.a.createElement(ui_contacts["Avatar"], {
          contact: M.u[u_handle],
          chatRoom: this.props.chatRoom,
          className: "call avatar-wrapper is-avatar " + (this.state.localMediaDisplay ? "" : "hidden"),
          hideVerifiedBadge: true
        })));
      } else {
        localPlayerElement = external_React_default.a.createElement("div", {
          className: "call local-video right-aligned is-video bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + (activeSid === "local" ? " active " : "") + (localMedia.screen ? " is-screen" : "")
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default.a.createElement("div", {
          className: "default-white-button tiny-button call",
          onClick: this.toggleLocalVideoDisplay.bind(this)
        }, external_React_default.a.createElement("i", {
          className: "tiny-icon grey-minus-icon"
        })), external_React_default.a.createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default.a.createElement("video", {
          className: "localViewport",
          defaultmuted: "true",
          muted: true,
          volume: 0,
          id: "localvideo_" + base64urlencode(rtcCall.id),
          style: {
            display: !this.state.localMediaDisplay ? "none" : ""
          },
          ref: function ref(_ref3) {
            if (_ref3 && !RTC.isAttachedToStream(_ref3)) {
              RTC.attachMediaStream(_ref3, rtcCall.localStream());
            }
          }
        }));
      }
    } else {
      var localPlayer;

      if (!localMedia.video) {
        localPlayer = external_React_default.a.createElement("div", {
          className: "call user-audio local-carousel is-avatar" + (activeSid === "local" ? " active " : ""),
          key: "local",
          onClick: function onClick() {
            self.onPlayerClick("local");
          }
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default.a.createElement("div", {
          className: "center-avatar-wrapper"
        }, external_React_default.a.createElement("div", muteOrHoldIconStyle(callManagerCall.getMediaOptions(), M.u[u_handle])), external_React_default.a.createElement(ui_contacts["Avatar"], {
          contact: M.u[u_handle],
          className: "call avatar-wrapper",
          chatRoom: this.props.chatRoom,
          hideVerifiedBadge: true
        })));

        if (activeSid === "local") {
          activePlayer = localPlayer;
        }
      } else {
        var _React$createElement;

        localPlayer = external_React_default.a.createElement("div", {
          className: "call user-video local-carousel is-video" + (activeSid === "local" ? " active " : "") + (localMedia.screen ? " is-screen" : ""),
          key: "local-video",
          onClick: function onClick() {
            self.onPlayerClick("local");
          }
        }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
          className: "icon-connection-issues"
        }) : null, external_React_default.a.createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default.a.createElement("video", (_React$createElement = {
          ref: "localViewport",
          className: "localViewport smallLocalViewport",
          defaultmuted: "true",
          muted: true,
          volume: 0,
          id: "localvideo_" + base64urlencode(rtcCall.id)
        }, _React$createElement["ref"] = function ref(_ref4) {
          if (_ref4 && !RTC.isAttachedToStream(_ref4)) {
            RTC.attachMediaStream(_ref4, rtcCall.localStream());
          }
        }, _React$createElement)));

        if (activeSid === "local") {
          activePlayer = external_React_default.a.createElement("div", {
            className: "call user-video is-video local-carousel local-carousel-big " + (localMedia.screen ? " is-screen" : ""),
            key: "local-video2"
          }, megaChat.rtc.ownNetworkQuality() === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default.a.createElement("div", muteOrHoldIconStyle(localMedia, M.u[u_handle])), external_React_default.a.createElement("video", {
            className: "localViewport bigLocalViewport",
            defaultmuted: "true",
            muted: true,
            volume: 0,
            id: "localvideo_big_" + base64urlencode(rtcCall.id),
            ref: function ref(_ref5) {
              if (_ref5 && !RTC.isAttachedToStream(_ref5)) {
                RTC.attachMediaStream(_ref5, rtcCall.localStream());
              }
            }
          }));
        }
      }

      remotePlayerElements.push(localPlayer);
    }

    var unreadDiv = null;
    var unreadCount = chatRoom.messagesBuff.getUnreadCount();

    if (unreadCount > 0) {
      unreadDiv = external_React_default.a.createElement("div", {
        className: "unread-messages"
      }, unreadCount > 9 ? "9+" : unreadCount);
    }

    var additionalClass = "";
    additionalClass = this.state.fullScreenModeEnabled ? " full-sized-block" : "";

    if (additionalClass.length === 0) {
      additionalClass = this.state.messagesBlockEnabled ? " small-block" : "";
    }

    var participantsCount = Object.keys(rtcCall.sessions).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;
    additionalClass += " participants-count-" + participantsCount;
    var header = null;
    var videoSessionCount = rtcCall.getAudioVideoSenderCount().video;
    var videoSendersMaxed = videoSessionCount >= RtcModule.kMaxCallVideoSenders;
    var notifBar = null;

    if (chatRoom.type === "group" || chatRoom.type === "public") {
      header = external_React_default.a.createElement("div", {
        className: "call-header"
      }, external_React_default.a.createElement("div", {
        className: "call-topic"
      }, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, ellipsis(chatRoom.getRoomTitle(), 'end', 70))), external_React_default.a.createElement("div", {
        className: "call-participants-count"
      }, chatRoom.getCallParticipants().length), external_React_default.a.createElement("a", {
        className: "call-switch-view " + (self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel") + (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE || this.haveScreenSharingPeer() ? " disabled" : ""),
        onClick: function onClick() {
          if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
            return;
          }

          self.setState({
            'selectedStreamSid': false,
            'viewMode': self.getViewMode() === VIEW_MODES.GRID ? VIEW_MODES.CAROUSEL : VIEW_MODES.GRID
          });
        }
      }), external_React_default.a.createElement("div", {
        className: "call-av-counter" + (videoSendersMaxed ? " limit-reached" : "")
      }, videoSessionCount, " / ", RtcModule.kMaxCallVideoSenders), external_React_default.a.createElement("div", {
        className: "call-video-icon" + (videoSendersMaxed.video ? " call-video-icon-warn" : "")
      }), external_React_default.a.createElement("div", {
        className: "call-header-duration",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallCounter)));
      var nEngine = callManagerCall.callNotificationsEngine;
      var notif = nEngine.getCurrentNotification();

      if (!nEngine._bound) {
        nEngine.rebind('onChange.cavp', function () {
          if (chatRoom.isCurrentlyActive) {
            self.safeForceUpdate();
            var $notif = $('.in-call-notif:visible');
            $notif.css({
              'opacity': 0.3
            }).animate({
              'opacity': 1
            }, {
              queue: false,
              duration: 1500
            });
          }
        });
        nEngine._bound = true;
      }

      if (notif) {
        var title = notif.getTitle();
        notifBar = external_React_default.a.createElement("div", {
          className: "in-call-notif " + notif.getClassName()
        }, title ? title : null);
      }
    }

    var networkQualityBar = null;
    var netq = megaChat.rtc.ownNetworkQuality();

    if (netq != null && netq <= 1) {
      var networkQualityMessage = l[23213];
      networkQualityBar = external_React_default.a.createElement("div", {
        className: "in-call-notif yellow" + (notifBar ? " after-green-notif" : "")
      }, networkQualityMessage);
    }

    var otherPartyIsOnHold = false;

    if (realSids.length === 1 && !rtcCall.isOnHold()) {
      var session = sessions[realSids[0]];
      otherPartyIsOnHold = !!session.peerIsOnHold();
    }

    if (rtcCall.isOnHold() || otherPartyIsOnHold) {
      networkQualityBar = external_React_default.a.createElement("div", {
        className: "in-call-notif gray" + (notifBar ? " after-green-notif" : "")
      }, l[23457]);
    }

    additionalClass += self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel";
    var players = null;

    if (self.getViewMode() === VIEW_MODES.GRID) {
      players = external_React_default.a.createElement("div", {
        className: "participantsWrapper",
        key: "container"
      }, external_React_default.a.createElement("div", {
        className: "participantsContainer",
        key: "partsContainer"
      }, remotePlayerElements), localPlayerElement);
    } else {
      players = external_React_default.a.createElement("div", {
        className: "activeStreamWrap",
        key: "container"
      }, external_React_default.a.createElement("div", {
        className: "activeStream",
        key: "activeStream"
      }, activePlayer), external_React_default.a.createElement("div", {
        className: "participantsContainer",
        key: "partsContainer"
      }, remotePlayerElements, localPlayerElement));
    }

    var topPanel = null;

    if (chatRoom.type !== "group") {
      var remoteCamEnabled = null;
      topPanel = external_React_default.a.createElement("div", {
        className: "call top-panel"
      }, external_React_default.a.createElement("div", {
        className: "call top-user-info"
      }, external_React_default.a.createElement("span", {
        className: "user-card-name white"
      }, displayNames.join(", ")), remoteCamEnabled), external_React_default.a.createElement("div", {
        className: "call-duration medium blue call-counter",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallCounter)));
    }

    if (participantsCount < 4) {
      additionalClass += " participants-less-4";
    } else if (participantsCount < 8) {
      additionalClass += " participants-less-8";
    } else if (participantsCount < 16) {
      additionalClass += " participants-less-16";
    } else {
      additionalClass += " participants-a-lot";
    }

    var hugeOverlayDiv = null;

    if (chatRoom.callReconnecting) {
      hugeOverlayDiv = external_React_default.a.createElement("div", {
        className: "callReconnecting"
      }, external_React_default.a.createElement("i", {
        className: "huge-icon crossed-phone"
      }));
    } else if (rtcCall.isOnHold() || otherPartyIsOnHold) {
      hugeOverlayDiv = external_React_default.a.createElement("div", {
        className: "callReconnecting dark"
      }, external_React_default.a.createElement("div", {
        className: "call-on-hold body"
      }, external_React_default.a.createElement("div", {
        className: "call-on-hold icon " + (otherPartyIsOnHold ? "" : "white-bg"),
        onClick: otherPartyIsOnHold ? undefined : function () {
          rtcCall.releaseOnHold();
        }
      }, external_React_default.a.createElement("i", {
        className: "big-icon " + (otherPartyIsOnHold ? "white-pause" : "grey-play")
      })), external_React_default.a.createElement("div", {
        className: "call-on-hold txt"
      }, otherPartyIsOnHold ? l[23458] : l[23459])));
      additionalClass += " call-is-on-hold";
    }

    var micMuteBtnDisabled = rtcCall.isLocalMuteInProgress() || rtcCall.isRecovery || rtcCall.isOnHold();
    var camMuteBtnDisabled = micMuteBtnDisabled || !localMedia.video && videoSendersMaxed;
    var screenShareBtnDisabled = micMuteBtnDisabled || !RTC.supportsScreenCapture;
    return external_React_default.a.createElement("div", {
      className: "call-block" + additionalClass,
      id: "call-block"
    }, external_React_default.a.createElement("div", {
      className: "av-resize-handler ui-resizable-handle ui-resizable-s " + (this.state.messagesBlockEnabled && !this.state.fullScreenModeEnabled ? "" : "hidden")
    }), header, notifBar, networkQualityBar, null, players, hugeOverlayDiv, topPanel, external_React_default.a.createElement("div", {
      className: "call bottom-panel"
    }, external_React_default.a.createElement("div", {
      className: "button call left" + (unreadDiv ? " unread" : ""),
      onClick: this.toggleMessages.bind(this)
    }, unreadDiv, external_React_default.a.createElement("i", {
      className: "big-icon conversations simpletip",
      "data-simpletip": this.state.messagesBlockEnabled ? l[22892] : l[22891],
      "data-simpletipoffset": "5"
    })), external_React_default.a.createElement("div", {
      className: "button call " + (micMuteBtnDisabled ? " disabled" : ""),
      onClick: function onClick() {
        if (micMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        rtcCall.enableAudio(!localMedia.audio);
      }
    }, external_React_default.a.createElement("i", {
      className: "big-icon simpletip " + (localMedia.audio ? "microphone" : "crossed-microphone"),
      "data-simpletip": localMedia.audio ? l[16214] : l[16708],
      "data-simpletipoffset": "5"
    })), external_React_default.a.createElement("div", {
      className: "button call" + (camMuteBtnDisabled ? " disabled" : ""),
      onClick: function onClick() {
        if (camMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        var videoMode = callManagerCall.videoMode();

        if (videoMode === Av.Video) {
          rtcCall.disableVideo().catch(function () {});
        } else {
          rtcCall.enableCamera().catch(function () {});
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "big-icon simpletip " + (callManagerCall.videoMode() === Av.Video ? "videocam" : "crossed-videocam"),
      "data-simpletip": callManagerCall.videoMode() === Av.Video ? l[22894] : l[22893],
      "data-simpletipoffset": "5"
    })), external_React_default.a.createElement("div", {
      className: "button call" + (screenShareBtnDisabled ? " disabled" : ""),
      onClick: function onClick() {
        if (screenShareBtnDisabled || rtcCall.isLocalMuteInProgress()) {
          return;
        }

        if (rtcCall.isScreenCaptureEnabled()) {
          rtcCall.disableVideo().catch(function () {});
        } else {
          rtcCall.enableScreenCapture().catch(function () {});
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "big-icon simpletip " + (rtcCall.isScreenCaptureEnabled() ? "screenshare" : "crossed-screenshare"),
      "data-simpletip": rtcCall.isScreenCaptureEnabled() ? l[22890] : l[22889],
      "data-simpletipoffset": "5"
    })), external_React_default.a.createElement(ui_buttons["Button"], {
      className: "call",
      disabled: rtcCall.isRecovery && rtcCall.isOnHold(),
      icon: "big-icon white-dots"
    }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
      className: "dark black call-actions",
      noArrow: true,
      positionMy: "center top",
      positionAt: "center bottom",
      vertOffset: 10
    }, rtcCall.isOnHold() ? external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "white-play",
      label: l[23459],
      onClick: function onClick() {
        rtcCall.releaseOnHold();
      }
    }) : external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      icon: "white-pause",
      label: l[23460],
      onClick: function onClick() {
        rtcCall.putOnHold();
      }
    }))), external_React_default.a.createElement("div", {
      className: "button call",
      onClick: function onClick() {
        callManagerCall.endCall();
      }
    }, external_React_default.a.createElement("i", {
      className: "big-icon horizontal-red-handset simpletip",
      "data-simpletip": l[5884],
      "data-simpletipoffset": "5"
    })), external_React_default.a.createElement("div", {
      className: "button call right",
      onClick: this.fullScreenModeToggle.bind(this)
    }, external_React_default.a.createElement("i", {
      className: "big-icon nwse-resize simpletip",
      "data-simpletip": this.state.fullScreenModeEnabled ? l[22895] : l[17803]
    }))));
  };

  return ConversationAVPanel;
}(mixins["MegaRenderMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/conversationpanel.jsx



var conversationpanel_dec, conversationpanel_dec2, _dec3, _dec4, conversationpanel_class;



























var ENABLE_GROUP_CALLING_FLAG = true;
var MAX_USERS_CHAT_PRIVATE = 100;
var conversationpanel_JoinCallNotification = function (_MegaRenderMixin) {
  inherits(JoinCallNotification, _MegaRenderMixin);

  function JoinCallNotification() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = JoinCallNotification.prototype;

  _proto.componentDidUpdate = function componentDidUpdate() {
    var $node = $(this.findDOMNode());
    var room = this.props.chatRoom;
    $('a.joinActiveCall', $node).rebind('click.joinCall', function (e) {
      room.joinCall();
      e.preventDefault();
      return false;
    });
  };

  _proto.render = function render() {
    var room = this.props.chatRoom;

    if (room.getCallParticipants().length >= RtcModule.kMaxCallReceivers) {
      return external_React_default.a.createElement("div", {
        className: "in-call-notif yellow join"
      }, external_React_default.a.createElement("i", {
        className: "small-icon audio-call colorized"
      }), l[20200]);
    } else {
      var translatedCode = escapeHTML(l[20460] || "There is an active group call. [A]Join[/A]");
      translatedCode = translatedCode.replace("[A]", '<a class="joinActiveCall">').replace('[/A]', '</a>');
      return external_React_default.a.createElement("div", {
        className: "in-call-notif neutral join"
      }, external_React_default.a.createElement("i", {
        className: "small-icon audio-call colorized"
      }), external_React_default.a.createElement("span", {
        dangerouslySetInnerHTML: {
          __html: translatedCode
        }
      }));
    }
  };

  return JoinCallNotification;
}(mixins["MegaRenderMixin"]);
var conversationpanel_ConversationRightArea = function (_MegaRenderMixin2) {
  inherits(ConversationRightArea, _MegaRenderMixin2);

  function ConversationRightArea() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = ConversationRightArea.prototype;

  _proto2.customIsEventuallyVisible = function customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  };

  _proto2.allContactsInChat = function allContactsInChat(participants) {
    this;

    if (participants.length === 0) {
      return false;
    }

    var currentContacts = M.u.keys();

    for (var i = 0; i < currentContacts.length; i++) {
      var k = currentContacts[i];

      if (M.u[k].c === 1 && participants.indexOf(k) === -1) {
        return false;
      }
    }

    return true;
  };

  _proto2.render = function render() {
    var self = this;
    var room = self.props.chatRoom;

    if (!room || !room.roomId) {
      return null;
    }

    if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
      return null;
    }

    self._wasAppendedEvenOnce = true;
    var startCallDisabled = isStartCallDisabled(room);
    var startCallButtonClass = startCallDisabled ? " disabled" : "";
    var startAudioCallButton;
    var startVideoCallButton;
    var endCallButton;
    var isInCall = !!room.callManagerCall && room.callManagerCall.isActive();

    if (isInCall) {
      startAudioCallButton = startVideoCallButton = null;
    } else {
      endCallButton = null;
    }

    if (room.type === "group" || room.type === "public") {
      if (room.getCallParticipants().length > 0 && !isInCall) {
        startAudioCallButton = startVideoCallButton = null;
      }
    }

    if (startAudioCallButton !== null) {
      startAudioCallButton = external_React_default.a.createElement("div", {
        className: "link-button light" + startCallButtonClass,
        onClick: function onClick() {
          if (!startCallDisabled) {
            room.startAudioCall();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "small-icon colorized audio-call"
      }), external_React_default.a.createElement("span", null, __(l[5896])));
    }

    if (startVideoCallButton !== null) {
      startVideoCallButton = external_React_default.a.createElement("div", {
        className: "link-button light" + startCallButtonClass,
        onClick: function onClick() {
          if (!startCallDisabled) {
            room.startVideoCall();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "small-icon colorized video-call"
      }), external_React_default.a.createElement("span", null, __(l[5897])));
    }

    var AVseperator = external_React_default.a.createElement("div", {
      className: "chat-button-seperator"
    });

    if (endCallButton !== null) {
      endCallButton = external_React_default.a.createElement("div", {
        className: "link-button light red",
        onClick: function onClick() {
          if (room.callManagerCall) {
            room.callManagerCall.endCall();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "small-icon colorized horizontal-red-handset"
      }), external_React_default.a.createElement("span", null, room.type === "group" || room.type === "public" ? "Leave call" : l[5884]));
    }

    var isReadOnlyElement = null;

    if (room.isReadOnly()) {
      isReadOnlyElement = external_React_default.a.createElement("center", {
        className: "center",
        style: {
          margin: "6px"
        }
      }, "(read only chat)");
    }

    var excludedParticipants = room.type === "group" || room.type === "public" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipants() : room.getParticipants();

    if (excludedParticipants.indexOf(u_handle) >= 0) {
      array.remove(excludedParticipants, u_handle, false);
    }

    var dontShowTruncateButton = false;

    if (!room.iAmOperator() || room.isReadOnly() || room.messagesBuff.messages.length === 0 || room.messagesBuff.messages.length === 1 && room.messagesBuff.messages.getItem(0).dialogType === "truncated") {
      dontShowTruncateButton = true;
    }

    var renameButtonClass = "link-button light " + (room.isReadOnly() || !room.iAmOperator() ? "disabled" : "");
    var participantsList = null;

    if (room.type === "group" || room.type === "public") {
      participantsList = external_React_default.a.createElement("div", null, isReadOnlyElement, external_React_default.a.createElement(participantsList_ParticipantsList, {
        ref: function ref(r) {
          self.participantsListRef = r;
        },
        chatRoom: room,
        members: room.members,
        isCurrentlyActive: room.isCurrentlyActive
      }));
    }

    var addParticipantBtn = external_React_default.a.createElement(ui_buttons["Button"], {
      className: "link-button green light",
      icon: "rounded-plus colorized",
      label: __(l[8007]),
      disabled: !(!room.isReadOnly() && room.iAmOperator() && !self.allContactsInChat(excludedParticipants))
    }, external_React_default.a.createElement(ui_dropdowns["DropdownContactsSelector"], {
      contacts: this.props.contacts,
      chatRoom: room,
      exclude: excludedParticipants,
      multiple: true,
      className: "popup add-participant-selector",
      singleSelectedButtonLabel: __(l[8869]),
      multipleSelectedButtonLabel: __(l[8869]),
      nothingSelectedButtonLabel: __(l[8870]),
      onSelectDone: this.props.onAddParticipantSelected.bind(this),
      positionMy: "center top",
      positionAt: "left bottom",
      arrowHeight: -32,
      selectFooter: true
    }));
    var expandedPanel = {};

    if (room.type === "group" || room.type === "public") {
      expandedPanel['participants'] = true;
    } else {
      expandedPanel['options'] = true;
    }

    return external_React_default.a.createElement("div", {
      className: "chat-right-area"
    }, external_React_default.a.createElement(perfectScrollbar["PerfectScrollbar"], {
      className: "chat-right-area conversation-details-scroll",
      options: {
        'suppressScrollX': true
      },
      ref: function ref(_ref) {
        self.rightScroll = _ref;
      },
      triggerGlobalResize: true,
      isVisible: self.props.chatRoom.isCurrentlyActive,
      chatRoom: self.props.chatRoom
    }, external_React_default.a.createElement("div", {
      className: "chat-right-pad"
    }, external_React_default.a.createElement(accordion_Accordion, {
      chatRoom: room,
      onToggle: SoonFc(20, function () {
        if (self.rightScroll) {
          self.rightScroll.reinitialise();
        }

        if (self.participantsListRef) {
          self.participantsListRef.safeForceUpdate();
        }
      }),
      expandedPanel: expandedPanel
    }, participantsList ? external_React_default.a.createElement(accordion_AccordionPanel, {
      className: "small-pad",
      title: l[8876],
      chatRoom: room,
      key: "participants"
    }, participantsList) : null, room.type === "public" && room.observers > 0 ? external_React_default.a.createElement("div", {
      className: "accordion-text observers"
    }, l[20466], external_React_default.a.createElement("span", {
      className: "observers-count"
    }, external_React_default.a.createElement("i", {
      className: "tiny-icon eye"
    }), room.observers)) : external_React_default.a.createElement("div", null), external_React_default.a.createElement(accordion_AccordionPanel, {
      className: "have-animation buttons",
      title: l[7537],
      key: "options",
      chatRoom: room
    }, external_React_default.a.createElement("div", null, addParticipantBtn, startAudioCallButton, startVideoCallButton, AVseperator, room.type == "group" || room.type == "public" ? external_React_default.a.createElement("div", {
      className: renameButtonClass,
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (self.props.onRenameClicked) {
          self.props.onRenameClicked();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon colorized writing-pen"
    }), external_React_default.a.createElement("span", null, l[9080])) : null, !room.isReadOnly() && room.type === "public" ? external_React_default.a.createElement("div", {
      className: "link-button light",
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onGetManageChatLinkClicked();
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon blue-chain colorized"
    }), external_React_default.a.createElement("span", null, l[20481])) : null, !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === "public" && !anonymouschat && room.publicChatHandle && room.publicChatKey ? external_React_default.a.createElement("div", {
      className: "link-button light",
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onJoinViaPublicLinkClicked();
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon writing-pen"
    }), external_React_default.a.createElement("span", null, l[20597])) : null, external_React_default.a.createElement(ui_buttons["Button"], {
      className: "link-button light dropdown-element",
      icon: "rounded-grey-up-arrow colorized",
      label: __(l[6834] + "..."),
      disabled: room.isReadOnly()
    }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
      className: "wide-dropdown send-files-selector light",
      noArrow: "true",
      vertOffset: 4,
      onClick: function onClick() {}
    }, external_React_default.a.createElement("div", {
      className: "dropdown info-txt"
    }, __(l[19793]) ? __(l[19793]) : "Send files from..."), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      className: "link-button light",
      icon: "grey-cloud colorized",
      label: __(l[19794]) ? __(l[19794]) : "My Cloud Drive",
      onClick: function onClick() {
        self.props.onAttachFromCloudClicked();
      }
    }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      className: "link-button light",
      icon: "grey-computer colorized",
      label: __(l[19795]) ? __(l[19795]) : "My computer",
      onClick: function onClick() {
        self.props.onAttachFromComputerClicked();
      }
    }))), endCallButton, external_React_default.a.createElement("div", {
      className: "link-button light " + (dontShowTruncateButton || !room.members.hasOwnProperty(u_handle) ? "disabled" : ""),
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (self.props.onTruncateClicked) {
          self.props.onTruncateClicked();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon colorized clear-arrow"
    }), external_React_default.a.createElement("span", null, __(l[8871]))), room.iAmOperator() && room.type === "public" ? external_React_default.a.createElement("div", {
      className: "chat-enable-key-rotation-paragraph"
    }, external_React_default.a.createElement("div", {
      className: "chat-button-seperator"
    }), external_React_default.a.createElement("div", {
      className: "link-button light " + (Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE ? " disabled" : ""),
      onClick: function onClick(e) {
        if (Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE || $(e.target).closest('.disabled').length > 0) {
          return false;
        }

        self.props.onMakePrivateClicked();
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon yellow-key colorized"
    }), external_React_default.a.createElement("span", null, l[20623])), external_React_default.a.createElement("p", null, external_React_default.a.createElement("span", null, l[20454]))) : null, external_React_default.a.createElement("div", {
      className: "chat-button-seperator"
    }), external_React_default.a.createElement("div", {
      className: "link-button light" + (!((room.members.hasOwnProperty(u_handle) || room.state === ChatRoom.STATE.LEFT) && !anonymouschat) ? " disabled" : ""),
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (room.isArchived()) {
          if (self.props.onUnarchiveClicked) {
            self.props.onUnarchiveClicked();
          }
        } else {
          if (self.props.onArchiveClicked) {
            self.props.onArchiveClicked();
          }
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon colorized " + (room.isArchived() ? "unarchive" : "archive")
    }), external_React_default.a.createElement("span", null, room.isArchived() ? __(l[19065]) : __(l[16689]))), room.type !== "private" ? external_React_default.a.createElement("div", {
      className: "link-button light red " + (room.type !== "private" && !anonymouschat && room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.membersSetFromApi.members[u_handle] !== -1 ? "" : "disabled"),
      onClick: function onClick(e) {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }

        if (self.props.onLeaveClicked) {
          self.props.onLeaveClicked();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon rounded-stop colorized"
    }), external_React_default.a.createElement("span", null, l[8633])) : null, room._closing !== true && room.type === "public" && !anonymouschat && (!room.membersSetFromApi.members.hasOwnProperty(u_handle) || room.membersSetFromApi.members[u_handle] === -1) ? external_React_default.a.createElement("div", {
      className: "link-button light red",
      onClick: function onClick() {
        if (self.props.onCloseClicked) {
          self.props.onCloseClicked();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon rounded-stop colorized"
    }), external_React_default.a.createElement("span", null, l[148])) : null)), external_React_default.a.createElement(sharedFilesAccordionPanel_SharedFilesAccordionPanel, {
      key: "sharedFiles",
      title: l[19796] ? l[19796] : "Shared Files",
      chatRoom: room,
      sharedFiles: room.messagesBuff.sharedFiles
    }), room.type === "private" ? external_React_default.a.createElement(incomingSharesAccordionPanel_IncSharesAccordionPanel, {
      key: "incomingShares",
      title: l[5542],
      chatRoom: room
    }) : null))));
  };

  return ConversationRightArea;
}(mixins["MegaRenderMixin"]);
conversationpanel_ConversationRightArea.defaultProps = {
  'requiresUpdateOnResize': true
};
var conversationpanel_ConversationPanel = (conversationpanel_dec = utils["default"].SoonFcWrap(360), conversationpanel_dec2 = utils["default"].SoonFcWrap(50), _dec3 = Object(mixins["SoonFcWrap"])(450, true), _dec4 = Object(mixins["timing"])(0.7, 9), (conversationpanel_class = function (_MegaRenderMixin3) {
  inherits(ConversationPanel, _MegaRenderMixin3);

  function ConversationPanel(props) {
    var _this = _MegaRenderMixin3.call(this, props) || this;

    _this.state = {
      startCallPopupIsActive: false,
      localVideoIsMinimized: false,
      isFullscreenModeEnabled: false,
      mouseOverDuringCall: false,
      attachCloudDialog: false,
      messagesToggledInCall: false,
      sendContactDialog: false,
      confirmDeleteDialog: false,
      pasteImageConfirmDialog: false,
      nonLoggedInJoinChatDialog: false,
      messageToBeDeleted: null,
      editing: false
    };
    _this.handleKeyDown = SoonFc(120, function (ev) {
      return _this._handleKeyDown(ev);
    });
    _this.handleWindowResize = SoonFc(80, function (ev) {
      return _this._handleWindowResize(ev);
    });
    return _this;
  }

  var _proto3 = ConversationPanel.prototype;

  _proto3.customIsEventuallyVisible = function customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  };

  _proto3.uploadFromComputer = function uploadFromComputer() {
    this.props.chatRoom.scrolledToBottom = true;
    this.props.chatRoom.uploadFromComputer();
  };

  _proto3.refreshUI = function refreshUI() {
    if (this.isComponentEventuallyVisible()) {
      var room = this.props.chatRoom;
      room.renderContactTree();
      room.megaChat.refreshConversations();
      room.trigger('RefreshUI');
    }
  };

  _proto3.onMouseMove = function onMouseMove() {
    if (this.isComponentEventuallyVisible()) {
      this.props.chatRoom.trigger("onChatIsFocused");
    }
  };

  _proto3._handleKeyDown = function _handleKeyDown() {
    if (this.__isMounted) {
      var chatRoom = this.props.chatRoom;

      if (chatRoom.isActive() && !chatRoom.isReadOnly()) {
        chatRoom.trigger("onChatIsFocused");
      }
    }
  };

  _proto3.componentDidMount = function componentDidMount() {
    _MegaRenderMixin3.prototype.componentDidMount.call(this);

    var self = this;
    window.addEventListener('resize', self.handleWindowResize);
    window.addEventListener('keydown', self.handleKeyDown);
    self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function () {
      self.callJustEnded = true;
    });
    self.props.chatRoom.rebind('onSendMessage.scrollToBottom', function () {
      self.props.chatRoom.scrolledToBottom = true;

      if (self.messagesListScrollable) {
        self.messagesListScrollable.scrollToBottom();
      }
    });
    self.props.chatRoom.rebind('openSendFilesDialog.cpanel', function () {
      self.setState({
        'attachCloudDialog': true
      });
    });
    self.props.chatRoom.rebind('showGetChatLinkDialog.ui', function () {
      createTimeoutPromise(function () {
        return self.props.chatRoom.topic && self.props.chatRoom.state === ChatRoom.STATE.READY;
      }, 350, 15000).always(function () {
        if (self.props.chatRoom.isCurrentlyActive) {
          self.setState({
            'chatLinkDialog': true
          });
        } else {
          self.props.chatRoom.updatePublicHandle();
        }
      });
    });

    if (self.props.chatRoom.type === "private") {
      var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];

      if (M.u[otherContactHash]) {
        self._privateChangeListener = M.u[otherContactHash].addChangeListener(function () {
          if (!self.isMounted()) {
            return 0xDEAD;
          }

          self.safeForceUpdate();
        });
      }
    }

    self.eventuallyInit();

    if (anonymouschat) {
      setTimeout(function () {
        self.setState({
          'nonLoggedInJoinChatDialog': true
        });
      }, rand_range(5, 10) * 1000);
    }

    self.props.chatRoom._uiIsMounted = true;
    self.props.chatRoom.$rConversationPanel = self;
    self.props.chatRoom.trigger("onComponentDidMount");
  };

  _proto3.eventuallyInit = function eventuallyInit(doResize) {
    var self = this;

    if (self.initialised) {
      return;
    }

    var $container = $(self.findDOMNode());

    if ($container.length > 0) {
      self.initialised = true;
    } else {
      return;
    }

    $(self.findDOMNode()).rebind('resized.convpanel', function () {
      self.handleWindowResize();
    });
    self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', $container);
    self.$messages.droppable({
      tolerance: 'pointer',
      drop: function drop(e, ui) {
        $.doDD(e, ui, 'drop', 1);
      },
      over: function over(e, ui) {
        $.doDD(e, ui, 'over', 1);
      },
      out: function out(e, ui) {
        $.doDD(e, ui, 'out', 1);
      }
    });
    self.lastScrollPosition = null;
    self.props.chatRoom.scrolledToBottom = true;
    self.lastScrollHeight = 0;
    self.lastUpdatedScrollHeight = 0;
    var room = self.props.chatRoom;
    $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
      if (self.isComponentEventuallyVisible()) {
        self.setState({
          isFullscreenModeEnabled: !!$(document).fullScreen()
        });
        self.forceUpdate();
      }
    });

    if (doResize !== false) {
      self.handleWindowResize();
    }
  };

  _proto3.componentWillMount = function componentWillMount() {
    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom.rebind('onHistoryDecrypted.cp', function () {
      self.eventuallyUpdate();
    });
    this._messagesBuffChangeHandler = chatRoom.messagesBuff.addChangeListener(function () {
      Soon(function () {
        if (self.isComponentEventuallyVisible()) {
          $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
        }
      });
    });
  };

  _proto3.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin3.prototype.componentWillUnmount.call(this);

    var self = this;
    var chatRoom = self.props.chatRoom;
    chatRoom._uiIsMounted = true;

    if (this._messagesBuffChangeHandler) {
      chatRoom.messagesBuff.removeChangeListener(this._messagesBuffChangeHandler);
      delete this._messagesBuffChangeHandler;
    }

    if (this._privateChangeListener) {
      var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];

      if (M.u[otherContactHash]) {
        M.u[otherContactHash].removeChangeListener(this._privateChangeListener);
        delete this._privateChangeListener;
      }
    }

    window.removeEventListener('resize', self.handleWindowResize);
    window.removeEventListener('keydown', self.handleKeyDown);
    $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
  };

  _proto3.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    var self = this;
    var room = this.props.chatRoom;
    self.eventuallyInit(false);
    room.megaChat.updateSectionUnreadCount();
    var domNode = self.findDOMNode();
    var jml = domNode && domNode.querySelector('.js-messages-loading');

    if (jml) {
      if (self.loadingShown) {
        jml.classList.remove('hidden');
      } else {
        jml.classList.add('hidden');
      }
    }

    self.handleWindowResize();

    if (prevState.messagesToggledInCall !== self.state.messagesToggledInCall || self.callJustEnded) {
      if (self.callJustEnded) {
        self.callJustEnded = false;
      }

      self.$messages.trigger('forceResize', [true, 1]);
      Soon(function () {
        self.messagesListScrollable.scrollToBottom(true);
      });
    }

    if (prevProps.isActive === false && self.props.isActive === true) {
      var $typeArea = $('.messages-textarea:visible:first', domNode);

      if ($typeArea.length === 1) {
        $typeArea.trigger("focus");
        moveCursortoToEnd($typeArea[0]);
      }
    }

    if (!prevState.renameDialog && self.state.renameDialog === true) {
      Soon(function () {
        var $input = $('.chat-rename-dialog input');

        if ($input && $input[0] && !$($input[0]).is(":focus")) {
          $input.trigger("focus");
          $input[0].selectionStart = 0;
          $input[0].selectionEnd = $input.val().length;
        }
      });
    }

    if (prevState.editing === false && self.state.editing !== false) {
      if (self.messagesListScrollable) {
        self.messagesListScrollable.reinitialise(false);
        Soon(function () {
          if (self.editDomElement && self.editDomElement.length === 1) {
            self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
          }
        });
      }
    }

    if (self.$messages && self.isComponentEventuallyVisible()) {
      $(window).rebind('pastedimage.chatRoom', function (e, blob, fileName) {
        if (self.$messages && self.isComponentEventuallyVisible()) {
          self.setState({
            'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)]
          });
          e.preventDefault();
        }
      });
      self.props.chatRoom.trigger("onComponentDidUpdate");
    }

    if (self._reposOnUpdate !== undefined) {
      var ps = self.messagesListScrollable;
      ps.__prevPosY = ps.getScrollHeight() - self._reposOnUpdate + self.lastScrollPosition;
      ps.scrollToY(ps.__prevPosY, true);
    }
  };

  _proto3._handleWindowResize = function _handleWindowResize(e, scrollToBottom) {
    if (!M.chat) {
      return;
    }

    if (!this.isMounted()) {
      this.componentWillUnmount();
      return;
    }

    if (!this.isComponentEventuallyVisible()) {
      return;
    }

    var $container = $(external_ReactDOM_default.a.findDOMNode(this));
    var self = this;
    self.eventuallyInit(false);

    if (!self.$messages) {
      return;
    }

    var scrollBlockHeight = $('.chat-content-block', $container).outerHeight() - ($('.chat-topic-block', $container).outerHeight() || 0) - ($('.call-block', $container).outerHeight() || 0) - (anonymouschat ? $('.join-chat-block', $container).outerHeight() : $('.chat-textarea-block', $container).outerHeight());

    if (scrollBlockHeight != self.$messages.outerHeight()) {
      self.$messages.css('height', scrollBlockHeight);
      $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
      self.refreshUI(true);

      if (self.props.chatRoom.callManagerCall) {
        $('.messages-block', $container).height(scrollBlockHeight + $('.chat-textarea-block', $container).outerHeight());
      } else {
        $('.messages-block', $container).height('');
      }
    } else {
      self.refreshUI(scrollToBottom);
    }
  };

  _proto3.isActive = function isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  };

  _proto3.onMessagesScrollReinitialise = function onMessagesScrollReinitialise(ps, $elem, forced, scrollPositionYPerc, scrollToElement) {
    var self = this;
    var chatRoom = self.props.chatRoom;
    var mb = chatRoom.messagesBuff;

    if (self.scrollPullHistoryRetrieval || mb.isRetrievingHistory) {
      return;
    }

    if (forced) {
      if (!scrollPositionYPerc && !scrollToElement) {
        if (self.props.chatRoom.scrolledToBottom && !self.editDomElement) {
          ps.scrollToBottom(true);
          return true;
        }
      } else {
        return;
      }
    }

    if (self.isComponentEventuallyVisible() && !self.editDomElement && !self.props.chatRoom.isScrollingToMessageId) {
      if (self.props.chatRoom.scrolledToBottom) {
        ps.scrollToBottom(true);
        return true;
      }

      if (self.lastScrollPosition && self.lastScrollPosition !== ps.getScrollPositionY()) {
        ps.scrollToY(self.lastScrollPosition, true);
        return true;
      }
    }
  };

  _proto3.onMessagesScrollUserScroll = function onMessagesScrollUserScroll(ps) {
    var self = this;
    var scrollPositionY = ps.getScrollPositionY();
    var isAtTop = ps.isAtTop();
    var chatRoom = self.props.chatRoom;
    var mb = chatRoom.messagesBuff;

    if (mb.messages.length === 0) {
      self.props.chatRoom.scrolledToBottom = true;
      return;
    }

    if (ps.isCloseToBottom(30) === true) {
      if (!self.props.chatRoom.scrolledToBottom) {
        mb.detachMessages();
      }

      self.props.chatRoom.scrolledToBottom = true;
    } else {
      self.props.chatRoom.scrolledToBottom = false;
    }

    if (!self.scrollPullHistoryRetrieval && !mb.isRetrievingHistory && (isAtTop || scrollPositionY < 5 && ps.getScrollHeight() > 500) && mb.haveMoreHistory()) {
      ps.disable();
      self.scrollPullHistoryRetrieval = true;
      self.lastScrollPosition = scrollPositionY;
      var msgAppended = 0;
      var scrYOffset = ps.getScrollHeight();
      chatRoom.one('onMessagesBuffAppend.pull', function () {
        msgAppended++;
      });
      chatRoom.off('onHistoryDecrypted.pull');
      chatRoom.one('onHistoryDecrypted.pull', function () {
        chatRoom.off('onMessagesBuffAppend.pull');
        chatRoom.messagesBuff.addChangeListener(function () {
          if (msgAppended > 0) {
            self._reposOnUpdate = scrYOffset;
          }

          self.scrollPullHistoryRetrieval = -1;
          return 0xDEAD;
        });
      });
      mb.retrieveChatHistory();
    }

    if (self.lastScrollPosition !== scrollPositionY) {
      self.lastScrollPosition = scrollPositionY;
    }
  };

  _proto3.isLoading = function isLoading() {
    var chatRoom = this.props.chatRoom;
    var mb = chatRoom.messagesBuff;
    return this.scrollPullHistoryRetrieval === true || chatRoom.activeSearches || mb.messagesHistoryIsLoading() || mb.joined === false || mb.isDecrypting;
  };

  _proto3.specShouldComponentUpdate = function specShouldComponentUpdate() {
    return !this.loadingShown && this.isComponentEventuallyVisible();
  };

  _proto3.enableScrollbar = function enableScrollbar() {
    var ps = this.messagesListScrollable;
    ps.enable();
    this._reposOnUpdate = undefined;
    this.lastScrollPosition = ps.__prevPosY | 0;
  };

  _proto3.render = function render() {
    var self = this;
    var room = this.props.chatRoom;

    if (!room || !room.roomId) {
      return null;
    }

    if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
      return null;
    }

    self._wasAppendedEvenOnce = true;
    var contacts = room.getParticipantsExceptMe();
    var contactHandle;
    var contact;
    var avatarMeta;
    var contactName = "";

    if (contacts && contacts.length === 1) {
      contactHandle = contacts[0];
      contact = M.u[contactHandle];
      avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
      contactName = avatarMeta.fullName;
    } else if (contacts && contacts.length > 1) {
      contactName = room.getRoomTitle(true);
    }

    var conversationPanelClasses = "conversation-panel " + (room.type === "public" ? "group-chat " : "") + room.type + "-chat";

    if (!room.isCurrentlyActive) {
      conversationPanelClasses += " hidden";
    }

    var topicBlockClass = "chat-topic-block";

    if (room.type !== "public") {
      topicBlockClass += " privateChat";
    }

    var messagesList = [];

    if (this.isLoading()) {
      self.loadingShown = true;
    } else {
      var mb = room.messagesBuff;

      if (this.scrollPullHistoryRetrieval < 0) {
        this.scrollPullHistoryRetrieval = false;
        self.enableScrollbar();
      }

      delete self.loadingShown;

      if (mb.joined === true && !self.scrollPullHistoryRetrieval && mb.haveMoreHistory() === false) {
        var headerText = l[8002];

        if (contactName) {
          headerText = headerText.replace("%s", "<span>" + htmlentities(contactName) + "</span>");
        } else {
          headerText = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(room.getRoomTitle()));
        }

        messagesList.push(external_React_default.a.createElement("div", {
          className: "messages notification",
          key: "initialMsg"
        }, external_React_default.a.createElement("div", {
          className: "header",
          dangerouslySetInnerHTML: {
            __html: headerText
          }
        }), external_React_default.a.createElement("div", {
          className: "info"
        }, __(l[8080]), external_React_default.a.createElement("p", null, external_React_default.a.createElement("i", {
          className: "semi-big-icon grey-lock"
        }), external_React_default.a.createElement("span", {
          dangerouslySetInnerHTML: {
            __html: __(l[8540]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
          }
        })), external_React_default.a.createElement("p", null, external_React_default.a.createElement("i", {
          className: "semi-big-icon grey-tick"
        }), external_React_default.a.createElement("span", {
          dangerouslySetInnerHTML: {
            __html: __(l[8539]).replace("[S]", "<strong>").replace("[/S]", "</strong>")
          }
        })))));
      }
    }

    var lastTimeMarker;
    var lastMessageFrom = null;
    var lastGroupedMessageTimeStamp = null;
    var grouped = false;
    room.messagesBuff.messages.forEach(function (v) {
      if (!v.protocol && v.revoked !== true) {
        var shouldRender = true;

        if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false || v.deleted === true) {
          shouldRender = false;
        }

        var timestamp = v.delay;
        var curTimeMarker = getTimeMarker(timestamp);
        var currentState = v.getState ? v.getState() : null;

        if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
          lastTimeMarker = curTimeMarker;
          messagesList.push(external_React_default.a.createElement("div", {
            className: "message date-divider",
            key: v.messageId + "_marker",
            title: time2date(timestamp)
          }, curTimeMarker));
          grouped = false;
          lastMessageFrom = null;
          lastGroupedMessageTimeStamp = null;
        }

        if (shouldRender === true) {
          var userId = v.userId;

          if (!userId) {
            if (contact && contact.u) {
              userId = contact.u;
            }
          }

          if (v instanceof Message && v.dialogType !== "truncated") {
            if (!lastMessageFrom || userId && lastMessageFrom === userId) {
              if (timestamp - lastGroupedMessageTimeStamp < 300) {
                grouped = true;
              } else {
                grouped = false;
                lastMessageFrom = userId;
                lastGroupedMessageTimeStamp = timestamp;
              }
            } else {
              grouped = false;
              lastMessageFrom = userId;

              if (lastMessageFrom === userId) {
                lastGroupedMessageTimeStamp = timestamp;
              } else {
                lastGroupedMessageTimeStamp = null;
              }
            }
          } else {
            grouped = false;
            lastMessageFrom = null;
            lastGroupedMessageTimeStamp = null;
          }
        }

        if ((v.dialogType === "remoteCallEnded" || v.dialogType === "remoteCallStarted") && v && v.wrappedChatDialogMessage) {
          v = v.wrappedChatDialogMessage;
        }

        if (v.dialogType) {
          var messageInstance = null;

          if (v.dialogType === 'alterParticipants') {
            messageInstance = external_React_default.a.createElement(alterParticipants_AltPartsConvMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'truncated') {
            messageInstance = external_React_default.a.createElement(truncated_TruncatedMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'privilegeChange') {
            messageInstance = external_React_default.a.createElement(privilegeChange_PrivilegeChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'topicChange') {
            messageInstance = external_React_default.a.createElement(topicChange_TopicChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'openModeClosed') {
            messageInstance = external_React_default.a.createElement(closeOpenMode_CloseOpenModeMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'chatHandleUpdate') {
            messageInstance = external_React_default.a.createElement(chatHandle_ChatHandleMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped: grouped,
              chatRoom: room
            });
          }

          messagesList.push(messageInstance);
        } else {
          if (!v.chatRoom) {
            v.chatRoom = room;
          }

          messagesList.push(external_React_default.a.createElement(generic_GenericConversationMessage, {
            message: v,
            state: v.state,
            key: v.messageId,
            contact: Message.getContactForMessage(v),
            grouped: grouped,
            onUpdate: function onUpdate() {
              self.onResizeDoUpdate();
            },
            editing: self.state.editing === v.messageId || self.state.editing === v.pendingMessageId,
            onEditStarted: function onEditStarted($domElement) {
              self.editDomElement = $domElement;
              self.props.chatRoom.scrolledToBottom = false;
              self.setState({
                'editing': v.messageId
              });
              self.forceUpdate();
            },
            chatRoom: room,
            onEditDone: function onEditDone(messageContents) {
              self.props.chatRoom.scrolledToBottom = true;
              self.editDomElement = null;
              var currentContents = v.textContents;
              v.edited = false;

              if (messageContents === false || messageContents === currentContents) {
                self.messagesListScrollable.scrollToBottom(true);
              } else if (messageContents) {
                room.trigger('onMessageUpdating', v);
                room.megaChat.plugins.chatdIntegration.updateMessage(room, v.internalId ? v.internalId : v.orderValue, messageContents);

                if (v.getState && (v.getState() === Message.STATE.NOT_SENT || v.getState() === Message.STATE.SENT) && !v.requiresManualRetry) {
                  if (v.textContents) {
                    v.textContents = messageContents;
                  }

                  if (v.emoticonShortcutsProcessed) {
                    v.emoticonShortcutsProcessed = false;
                  }

                  if (v.emoticonsProcessed) {
                    v.emoticonsProcessed = false;
                  }

                  if (v.messageHtml) {
                    delete v.messageHtml;
                  }

                  v.trigger('onChange', [v, "textContents", "", messageContents]);
                  megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
                }

                self.messagesListScrollable.scrollToBottom(true);
              } else if (messageContents.length === 0) {
                self.setState({
                  'confirmDeleteDialog': true,
                  'messageToBeDeleted': v
                });
              }

              self.setState({
                'editing': false
              });
              Soon(function () {
                $('.chat-textarea-block:visible textarea').focus();
              }, 300);
            },
            onDeleteClicked: function onDeleteClicked(e, msg) {
              self.setState({
                'editing': false,
                'confirmDeleteDialog': true,
                'messageToBeDeleted': msg
              });
              self.forceUpdate();
            }
          }));
        }
      }
    });
    var attachCloudDialog = null;

    if (self.state.attachCloudDialog === true) {
      var selected = [];
      attachCloudDialog = external_React_default.a.createElement(cloudBrowserModalDialog.CloudBrowserDialog, {
        folderSelectNotAllowed: true,
        allowAttachFolders: true,
        room: room,
        onClose: function onClose() {
          self.setState({
            'attachCloudDialog': false
          });
          selected = [];
        },
        onSelected: function onSelected(nodes) {
          selected = nodes;
        },
        onAttachClicked: function onAttachClicked() {
          self.setState({
            'attachCloudDialog': false
          });
          self.props.chatRoom.scrolledToBottom = true;
          room.attachNodes(selected);
        }
      });
    }

    var nonLoggedInJoinChatDialog = null;

    if (self.state.nonLoggedInJoinChatDialog === true) {
      var usersCount = Object.keys(room.members).length;
      nonLoggedInJoinChatDialog = external_React_default.a.createElement(modalDialogs["a" ].ModalDialog, {
        title: l[20596],
        className: "fm-dialog chat-links-preview-desktop",
        chatRoom: room,
        onClose: function onClose() {
          self.setState({
            'nonLoggedInJoinChatDialog': false
          });
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-body"
      }, external_React_default.a.createElement("div", {
        className: "chatlink-contents"
      }, external_React_default.a.createElement("div", {
        className: "huge-icon group-chat"
      }), external_React_default.a.createElement("h3", null, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, room.topic ? room.getRoomTitle() : " ")), external_React_default.a.createElement("h5", null, usersCount ? l[20233].replace("%s", usersCount) : " "), external_React_default.a.createElement("p", null, l[20595]), external_React_default.a.createElement("a", {
        className: "join-chat",
        onClick: function onClick() {
          self.setState({
            'nonLoggedInJoinChatDialog': false
          });
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
        }
      }, l[20597]), external_React_default.a.createElement("a", {
        className: "not-now",
        onClick: function onClick() {
          self.setState({
            'nonLoggedInJoinChatDialog': false
          });
        }
      }, l[18682]))));
    }

    var chatLinkDialog;

    if (self.state.chatLinkDialog === true) {
      chatLinkDialog = external_React_default.a.createElement(chatlinkDialog_ChatlinkDialog, {
        chatRoom: self.props.chatRoom,
        onClose: function onClose() {
          self.setState({
            'chatLinkDialog': false
          });
        }
      });
    }

    var privateChatDialog;

    if (self.state.privateChatDialog === true) {
      if (!$.dialog || $.dialog === "create-private-chat") {
        $.dialog = "create-private-chat";
        privateChatDialog = external_React_default.a.createElement(modalDialogs["a" ].ModalDialog, {
          title: l[20594],
          className: "fm-dialog create-private-chat",
          chatRoom: room,
          onClose: function onClose() {
            self.setState({
              'privateChatDialog': false
            });

            if ($.dialog === "create-private-chat") {
              closeDialog();
            }
          }
        }, external_React_default.a.createElement("div", {
          className: "create-private-chat-content-block fm-dialog-body"
        }, external_React_default.a.createElement("i", {
          className: "huge-icon lock"
        }), external_React_default.a.createElement("div", {
          className: "dialog-body-text"
        }, external_React_default.a.createElement("div", {
          className: ""
        }, external_React_default.a.createElement("b", null, l[20590]), external_React_default.a.createElement("br", null), l[20591])), external_React_default.a.createElement("div", {
          className: "clear"
        }), external_React_default.a.createElement("div", {
          className: "big-red-button",
          id: "make-chat-private",
          onClick: function onClick() {
            self.props.chatRoom.switchOffPublicMode();
            self.setState({
              'privateChatDialog': false
            });

            if ($.dialog === "create-private-chat") {
              closeDialog();
            }
          }
        }, external_React_default.a.createElement("div", {
          className: "big-btn-txt"
        }, l[20593]))));
        $('.create-private-chat .fm-dialog-close').rebind('click', function () {
          $('.create-private-chat').addClass('hidden');
          $('.fm-dialog-overlay').addClass('hidden');
        });
        $('.create-private-chat .default-red-button').rebind('click', function () {
          var participants = self.props.chatRoom.protocolHandler.getTrackedParticipants();
          var promises = [];
          promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

          var _runSwitchOffPublicMode = function _runSwitchOffPublicMode() {
            var topic = null;

            if (self.props.chatRoom.topic) {
              topic = self.props.chatRoom.protocolHandler.embeddedEncryptTo(self.props.chatRoom.topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, true, self.props.chatRoom.type === "public");
              topic = base64urlencode(topic);
            }

            self.props.onSwitchOffPublicMode(topic);
          };

          MegaPromise.allDone(promises).done(function () {
            _runSwitchOffPublicMode();
          });
        });
      }
    }

    var sendContactDialog = null;

    if (self.state.sendContactDialog === true) {
      var excludedContacts = [];

      if (room.type == "private") {
        room.getParticipantsExceptMe().forEach(function (userHandle) {
          var contact = M.u[userHandle];

          if (contact) {
            excludedContacts.push(contact.u);
          }
        });
      }

      sendContactDialog = external_React_default.a.createElement(modalDialogs["a" ].SelectContactDialog, {
        chatRoom: room,
        exclude: excludedContacts,
        onClose: function onClose() {
          self.setState({
            'sendContactDialog': false
          });
          selected = [];
        },
        onSelectClicked: function onSelectClicked(selected) {
          self.setState({
            'sendContactDialog': false
          });
          room.attachContacts(selected);
        }
      });
    }

    var confirmDeleteDialog = null;

    if (self.state.confirmDeleteDialog === true) {
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ConfirmDialog, {
        chatRoom: room,
        title: __(l[8004]),
        name: "delete-message",
        onClose: function onClose() {
          self.setState({
            'confirmDeleteDialog': false
          });
        },
        onConfirmClicked: function onConfirmClicked() {
          var msg = self.state.messageToBeDeleted;

          if (!msg) {
            return;
          }

          var chatdint = room.megaChat.plugins.chatdIntegration;

          if (msg.getState() === Message.STATE.SENT || msg.getState() === Message.STATE.DELIVERED || msg.getState() === Message.STATE.NOT_SENT) {
            var textContents = msg.textContents || '';

            if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
              var attachmentMetadata = msg.getAttachmentMeta() || [];
              attachmentMetadata.forEach(function (v) {
                M.moveToRubbish(v.h);
              });
            }

            chatdint.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
            msg.deleted = true;
            msg.textContents = "";
          } else if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
            chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
          }

          self.setState({
            'confirmDeleteDialog': false,
            'messageToBeDeleted': false
          });

          if (msg.getState && msg.getState() === Message.STATE.NOT_SENT && !msg.requiresManualRetry) {
            msg.message = "";
            msg.textContents = "";
            msg.messageHtml = "";
            msg.deleted = true;
            msg.trigger('onChange', [msg, "deleted", false, true]);
          }
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, __(l[8879])), external_React_default.a.createElement(generic_GenericConversationMessage, {
        className: " dialog-wrapper",
        message: self.state.messageToBeDeleted,
        hideActionButtons: true,
        initTextScrolling: true,
        dialog: true,
        chatRoom: self.props.chatRoom
      })));
    }

    if (self.state.pasteImageConfirmDialog) {
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ConfirmDialog, {
        chatRoom: room,
        title: __(l[20905]),
        name: "paste-image-chat",
        onClose: function onClose() {
          self.setState({
            'pasteImageConfirmDialog': false
          });
        },
        onConfirmClicked: function onConfirmClicked() {
          var meta = self.state.pasteImageConfirmDialog;

          if (!meta) {
            return;
          }

          try {
            Object.defineProperty(meta[0], 'name', {
              configurable: true,
              writeable: true,
              value: Date.now() + '.' + M.getSafeName(meta[1] || meta[0].name)
            });
          } catch (e) {}

          self.props.chatRoom.scrolledToBottom = true;
          M.addUpload([meta[0]]);
          self.setState({
            'pasteImageConfirmDialog': false
          });
          URL.revokeObjectURL(meta[2]);
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, __(l[20906])), external_React_default.a.createElement("img", {
        src: self.state.pasteImageConfirmDialog[2],
        style: {
          maxWidth: "90%",
          height: "auto",
          maxHeight: $(document).outerHeight() * 0.3,
          margin: '10px auto',
          display: 'block',
          border: '1px solid #ccc',
          borderRadius: '4px'
        },
        onLoad: function onLoad(e) {
          $(e.target).parents('.paste-image-chat').position({
            of: $(document.body)
          });
        }
      })));
    }

    if (self.state.truncateDialog === true) {
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ConfirmDialog, {
        chatRoom: room,
        title: __(l[8871]),
        name: "truncate-conversation",
        dontShowAgainCheckbox: false,
        onClose: function onClose() {
          self.setState({
            'truncateDialog': false
          });
        },
        onConfirmClicked: function onConfirmClicked() {
          self.props.chatRoom.scrolledToBottom = true;
          room.truncate();
          self.setState({
            'truncateDialog': false
          });
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, __(l[8881]))));
    }

    if (self.state.archiveDialog === true) {
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ConfirmDialog, {
        chatRoom: room,
        title: __(l[19068]),
        name: "archive-conversation",
        onClose: function onClose() {
          self.setState({
            'archiveDialog': false
          });
        },
        onConfirmClicked: function onConfirmClicked() {
          self.props.chatRoom.scrolledToBottom = true;
          room.archive();
          self.setState({
            'archiveDialog': false
          });
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, __(l[19069]))));
    }

    if (self.state.unarchiveDialog === true) {
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ConfirmDialog, {
        chatRoom: room,
        title: __(l[19063]),
        name: "unarchive-conversation",
        onClose: function onClose() {
          self.setState({
            'unarchiveDialog': false
          });
        },
        onConfirmClicked: function onConfirmClicked() {
          self.props.chatRoom.scrolledToBottom = true;
          room.unarchive();
          self.setState({
            'unarchiveDialog': false
          });
        }
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, __(l[19064]))));
    }

    if (self.state.renameDialog === true) {
      var onEditSubmit = function onEditSubmit(e) {
        if (self.props.chatRoom.setRoomTitle(self.state.renameDialogValue)) {
          self.setState({
            'renameDialog': false,
            'renameDialogValue': undefined
          });
        }

        e.preventDefault();
        e.stopPropagation();
      };

      var renameDialogValue = typeof self.state.renameDialogValue !== 'undefined' ? self.state.renameDialogValue : self.props.chatRoom.getRoomTitle();
      confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" ].ModalDialog, {
        chatRoom: room,
        title: __(l[9080]),
        name: "rename-group",
        className: "chat-rename-dialog",
        onClose: function onClose() {
          self.setState({
            'renameDialog': false,
            'renameDialogValue': undefined
          });
        },
        buttons: [{
          "label": l[61],
          "key": "rename",
          "className": $.trim(self.state.renameDialogValue).length === 0 || self.state.renameDialogValue === self.props.chatRoom.getRoomTitle() ? "disabled" : "",
          "onClick": function onClick(e) {
            onEditSubmit(e);
          }
        }, {
          "label": l[1686],
          "key": "cancel",
          "onClick": function onClick(e) {
            self.setState({
              'renameDialog': false,
              'renameDialogValue': undefined
            });
            e.preventDefault();
            e.stopPropagation();
          }
        }]
      }, external_React_default.a.createElement("div", {
        className: "fm-dialog-content"
      }, external_React_default.a.createElement("div", {
        className: "dialog secondary-header"
      }, external_React_default.a.createElement("div", {
        className: "rename-input-bl"
      }, external_React_default.a.createElement("input", {
        type: "text",
        className: "chat-rename-group-dialog",
        name: "newTopic",
        value: renameDialogValue,
        maxLength: "30",
        onChange: function onChange(e) {
          self.setState({
            'renameDialogValue': e.target.value.substr(0, 30)
          });
        },
        onKeyUp: function onKeyUp(e) {
          if (e.which === 13) {
            onEditSubmit(e);
          }
        }
      })))));
    }

    var additionalClass = "";

    if (additionalClass.length === 0 && self.state.messagesToggledInCall && room.callManagerCall && room.callManagerCall.isActive()) {
      additionalClass = " small-block";
    }

    var topicInfo = null;

    if (self.props.chatRoom.type === "group" || self.props.chatRoom.type === "public") {
      topicInfo = external_React_default.a.createElement("div", {
        className: "chat-topic-info"
      }, external_React_default.a.createElement("div", {
        className: "chat-topic-icon"
      }), external_React_default.a.createElement("div", {
        className: "chat-topic-text"
      }, external_React_default.a.createElement("span", {
        className: "txt"
      }, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, self.props.chatRoom.getRoomTitle())), external_React_default.a.createElement("span", {
        className: "txt small"
      }, external_React_default.a.createElement(ui_contacts["MembersAmount"], {
        room: self.props.chatRoom
      }))));
    } else {
      contactHandle = contacts[0];
      contact = M.u[contactHandle];
      topicInfo = external_React_default.a.createElement(ui_contacts["ContactCard"], {
        className: "short",
        chatRoom: room,
        noContextButton: "true",
        contact: contact,
        showLastGreen: true,
        key: contact.u
      });
    }

    var startCallDisabled = isStartCallDisabled(room);
    var startCallButtonClass = startCallDisabled ? " disabled" : "";
    return external_React_default.a.createElement("div", {
      className: conversationPanelClasses,
      onMouseMove: function onMouseMove() {
        return self.onMouseMove();
      },
      "data-room-id": self.props.chatRoom.chatId
    }, external_React_default.a.createElement("div", {
      className: "chat-content-block " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ? "with-pane" : "no-pane")
    }, !room.megaChat.chatUIFlags['convPanelCollapse'] ? external_React_default.a.createElement(conversationpanel_ConversationRightArea, {
      isVisible: this.props.chatRoom.isCurrentlyActive,
      chatRoom: this.props.chatRoom,
      roomFlags: this.props.chatRoom.flags,
      members: this.props.chatRoom.membersSetFromApi,
      messagesBuff: room.messagesBuff,
      onAttachFromComputerClicked: function onAttachFromComputerClicked() {
        self.uploadFromComputer();
      },
      onTruncateClicked: function onTruncateClicked() {
        self.setState({
          'truncateDialog': true
        });
      },
      onArchiveClicked: function onArchiveClicked() {
        self.setState({
          'archiveDialog': true
        });
      },
      onUnarchiveClicked: function onUnarchiveClicked() {
        self.setState({
          'unarchiveDialog': true
        });
      },
      onRenameClicked: function onRenameClicked() {
        self.setState({
          'renameDialog': true,
          'renameDialogValue': self.props.chatRoom.getRoomTitle()
        });
      },
      onGetManageChatLinkClicked: function onGetManageChatLinkClicked() {
        self.setState({
          'chatLinkDialog': true
        });
      },
      onMakePrivateClicked: function onMakePrivateClicked() {
        self.setState({
          'privateChatDialog': true
        });
      },
      onLeaveClicked: function onLeaveClicked() {
        room.leave(true);
      },
      onCloseClicked: function onCloseClicked() {
        room.destroy();
      },
      onJoinViaPublicLinkClicked: function onJoinViaPublicLinkClicked() {
        room.joinViaPublicHandle();
      },
      onSwitchOffPublicMode: function onSwitchOffPublicMode(topic) {
        room.switchOffPublicMode(topic);
      },
      onAttachFromCloudClicked: function onAttachFromCloudClicked() {
        self.setState({
          'attachCloudDialog': true
        });
      },
      onAddParticipantSelected: function onAddParticipantSelected(contactHashes) {
        self.props.chatRoom.scrolledToBottom = true;

        if (self.props.chatRoom.type == "private") {
          var megaChat = self.props.chatRoom.megaChat;
          loadingDialog.show();
          megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getParticipantsExceptMe().concat(contactHashes), {
            keyRotation: false,
            topic: ''
          }]);
        } else {
          self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
        }
      }
    }) : null, room.callManagerCall && room.callManagerCall.isStarted() ? external_React_default.a.createElement(conversationaudiovideopanel_ConversationAVPanel, {
      chatRoom: this.props.chatRoom,
      unreadCount: this.props.chatRoom.messagesBuff.getUnreadCount(),
      onMessagesToggle: function onMessagesToggle(isActive) {
        self.setState({
          'messagesToggledInCall': isActive
        }, function () {
          $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
        });
      }
    }) : null, privateChatDialog, chatLinkDialog, nonLoggedInJoinChatDialog, attachCloudDialog, sendContactDialog, confirmDeleteDialog, null, external_React_default.a.createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden"
    }, external_React_default.a.createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default.a.createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default.a.createElement("i", {
      className: "small-icon conversations"
    }), __(l[8882]))), external_React_default.a.createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-manual hidden"
    }, external_React_default.a.createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default.a.createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default.a.createElement("i", {
      className: "small-icon conversations"
    }), __(l[8883]))), external_React_default.a.createElement("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden"
    }, external_React_default.a.createElement("i", {
      className: "dropdown-white-arrow"
    }), external_React_default.a.createElement("div", {
      className: "dropdown notification-text"
    }, external_React_default.a.createElement("i", {
      className: "small-icon conversations"
    }), __(l[8884]))), external_React_default.a.createElement("div", {
      className: "chat-topic-block " + topicBlockClass + (self.props.chatRoom.havePendingGroupCall() || self.props.chatRoom.haveActiveCall() ? " have-pending-group-call" : "")
    }, external_React_default.a.createElement("div", {
      className: "chat-topic-buttons"
    }, external_React_default.a.createElement(ui_buttons["Button"], {
      className: "right",
      disableCheckingVisibility: true,
      icon: "small-icon " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ? "arrow-in-square" : "arrow-in-square active"),
      onClick: function onClick() {
        room.megaChat.toggleUIFlag('convPanelCollapse');
      }
    }), external_React_default.a.createElement("span", null, external_React_default.a.createElement("div", {
      className: "button right",
      onClick: function onClick() {
        if (!startCallDisabled) {
          room.startVideoCall();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon small-icon video-call colorized" + startCallButtonClass
    })), external_React_default.a.createElement("div", {
      className: "button right",
      onClick: function onClick() {
        if (!startCallDisabled) {
          room.startAudioCall();
        }
      }
    }, external_React_default.a.createElement("i", {
      className: "small-icon small-icon audio-call colorized" + startCallButtonClass
    })))), topicInfo), external_React_default.a.createElement("div", {
      className: "messages-block " + additionalClass
    }, external_React_default.a.createElement("div", {
      className: "messages scroll-area"
    }, external_React_default.a.createElement(perfectScrollbar["PerfectScrollbar"], {
      onFirstInit: function onFirstInit(ps) {
        ps.scrollToBottom(true);
        self.props.chatRoom.scrolledToBottom = 1;
      },
      onReinitialise: self.onMessagesScrollReinitialise.bind(this),
      onUserScroll: self.onMessagesScrollUserScroll.bind(this),
      className: "js-messages-scroll-area perfectScrollbarContainer",
      messagesToggledInCall: self.state.messagesToggledInCall,
      ref: function ref(_ref2) {
        return self.messagesListScrollable = _ref2;
      },
      chatRoom: self.props.chatRoom,
      messagesBuff: self.props.chatRoom.messagesBuff,
      editDomElement: self.state.editDomElement,
      editingMessageId: self.state.editing,
      confirmDeleteDialog: self.state.confirmDeleteDialog,
      renderedMessagesCount: messagesList.length,
      isLoading: this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() || this.props.chatRoom.activeSearches > 0 || this.loadingShown,
      options: {
        'suppressScrollX': true
      }
    }, external_React_default.a.createElement("div", {
      className: "messages main-pad"
    }, external_React_default.a.createElement("div", {
      className: "messages content-area"
    }, external_React_default.a.createElement("div", {
      className: "loading-spinner js-messages-loading light manual-management" + (!self.loadingShown ? " hidden" : ""),
      key: "loadingSpinner",
      style: {
        top: "50%"
      }
    }, external_React_default.a.createElement("div", {
      className: "main-loader",
      style: {
        'position': 'fixed',
        'top': '50%',
        'left': '50%'
      }
    })), messagesList)))), !anonymouschat && room.state != ChatRoom.STATE.LEFT && room.havePendingGroupCall() && (!room.callManagerCall || room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING) ? external_React_default.a.createElement(conversationpanel_JoinCallNotification, {
      chatRoom: room
    }) : null, anonymouschat || !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === "public" && !anonymouschat && room.publicChatHandle && room.publicChatKey ? external_React_default.a.createElement("div", {
      className: "join-chat-block"
    }, external_React_default.a.createElement("div", {
      className: "join-chat-button",
      onClick: function onClick() {
        if (anonymouschat) {
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
        } else {
          room.joinViaPublicHandle();
        }
      }
    }, l[20597])) : external_React_default.a.createElement("div", {
      className: "chat-textarea-block"
    }, external_React_default.a.createElement(whosTyping_WhosTyping, {
      chatRoom: room
    }), external_React_default.a.createElement(typingArea_TypingArea, {
      chatRoom: self.props.chatRoom,
      className: "main-typing-area",
      disabled: room.isReadOnly(),
      persist: true,
      onUpEditPressed: function onUpEditPressed() {
        var time = unixtime();
        var keys = room.messagesBuff.messages.keys();

        for (var i = keys.length; i--;) {
          var message = room.messagesBuff.messages[keys[i]];
          var contact = M.u[message.userId];

          if (!contact) {
            continue;
          }

          if (contact.u === u_handle && time - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof Message) && (!message.isManagement || !message.isManagement())) {
            self.setState({
              'editing': message.messageId
            });
            self.props.chatRoom.scrolledToBottom = false;
            return true;
          }
        }

        return false;
      },
      onResized: function onResized() {
        self.handleWindowResize();
        $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
      },
      onConfirm: function onConfirm(messageContents) {
        if (messageContents && messageContents.length > 0) {
          if (!self.props.chatRoom.scrolledToBottom) {
            self.props.chatRoom.scrolledToBottom = true;
            self.lastScrollPosition = 0;
            self.props.chatRoom.rebind('onMessagesBuffAppend.pull', function () {
              if (self.messagesListScrollable) {
                self.messagesListScrollable.scrollToBottom(false);
                setTimeout(function () {
                  self.messagesListScrollable.enable();
                }, 1500);
              }
            });
            self.props.chatRoom.sendMessage(messageContents);
            self.messagesListScrollable.disable();
            self.messagesListScrollable.scrollToBottom(true);
          } else {
            self.props.chatRoom.sendMessage(messageContents);
          }
        }
      }
    }, external_React_default.a.createElement(ui_buttons["Button"], {
      className: "popup-button left",
      icon: "small-icon grey-small-plus",
      disabled: room.isReadOnly()
    }, external_React_default.a.createElement(ui_dropdowns["Dropdown"], {
      className: "wide-dropdown attach-to-chat-popup light",
      noArrow: "true",
      positionMy: "left top",
      positionAt: "left bottom",
      vertOffset: 4
    }, external_React_default.a.createElement("div", {
      className: "dropdown info-txt"
    }, __(l[19793]) ? __(l[19793]) : "Send files from..."), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      className: "link-button light",
      icon: "grey-cloud colorized",
      label: __(l[19794]) ? __(l[19794]) : "My Cloud Drive",
      onClick: function onClick() {
        self.setState({
          'attachCloudDialog': true
        });
      }
    }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      className: "link-button light",
      icon: "grey-computer colorized",
      label: __(l[19795]) ? __(l[19795]) : "My computer",
      onClick: function onClick() {
        self.uploadFromComputer();
      }
    }), external_React_default.a.createElement("div", {
      className: "chat-button-seperator"
    }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
      className: "link-button light",
      icon: "square-profile colorized",
      label: __(l[8628]),
      onClick: function onClick() {
        self.setState({
          'sendContactDialog': true
        });
      }
    }))))))));
  };

  return ConversationPanel;
}(mixins["MegaRenderMixin"]), (applyDecoratedDescriptor_default()(conversationpanel_class.prototype, "onMouseMove", [conversationpanel_dec], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "onMouseMove"), conversationpanel_class.prototype), applyDecoratedDescriptor_default()(conversationpanel_class.prototype, "onMessagesScrollReinitialise", [conversationpanel_dec2], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "onMessagesScrollReinitialise"), conversationpanel_class.prototype), applyDecoratedDescriptor_default()(conversationpanel_class.prototype, "enableScrollbar", [_dec3], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "enableScrollbar"), conversationpanel_class.prototype), applyDecoratedDescriptor_default()(conversationpanel_class.prototype, "render", [_dec4], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "render"), conversationpanel_class.prototype)), conversationpanel_class));
var conversationpanel_ConversationPanels = function (_MegaRenderMixin4) {
  inherits(ConversationPanels, _MegaRenderMixin4);

  function ConversationPanels() {
    return _MegaRenderMixin4.apply(this, arguments) || this;
  }

  var _proto4 = ConversationPanels.prototype;

  _proto4.render = function render() {
    var self = this;
    var now = Date.now();
    var conversations = [];
    megaChat.chats.forEach(function (chatRoom) {
      if (chatRoom.isCurrentlyActive || now - chatRoom.lastShownInUI < 900000) {
        conversations.push(external_React_default.a.createElement(conversationpanel_ConversationPanel, {
          chatUIFlags: self.props.chatUIFlags,
          isExpanded: chatRoom.megaChat.chatUIFlags['convPanelCollapse'],
          chatRoom: chatRoom,
          roomType: chatRoom.type,
          isActive: chatRoom.isCurrentlyActive,
          messagesBuff: chatRoom.messagesBuff,
          key: chatRoom.roomId + "_" + chatRoom.instanceIndex
        }));
      }
    });

    if (self._MuChangeListener) {
      console.assert(M.u.removeChangeListener(self._MuChangeListener));
      delete self._MuChangeListener;
    }

    if (megaChat.chats.length === 0) {
      self._MuChangeListener = M.u.addChangeListener(function () {
        return self.safeForceUpdate();
      });
      var contactsList = [];
      var contactsListOffline = [];
      var lim = Math.min(10, M.u.length);
      var userHandles = M.u.keys();

      for (var i = 0; i < lim; i++) {
        var contact = M.u[userHandles[i]];

        if (contact.u !== u_handle && contact.c === 1) {
          var pres = megaChat.userPresenceToCssClass(contact.presence);
          (pres === "offline" ? contactsListOffline : contactsList).push(external_React_default.a.createElement(ui_contacts["ContactCard"], {
            contact: contact,
            key: contact.u,
            chatRoom: false
          }));
        }
      }

      var emptyMessage = escapeHTML(l[8008]).replace("[P]", "<span>").replace("[/P]", "</span>");
      var button = external_React_default.a.createElement("div", {
        className: "big-red-button new-chat-link",
        onClick: function onClick() {
          return $(document.body).trigger('startNewChatLink');
        }
      }, l[20638]);

      if (anonymouschat) {
        button = null;
        emptyMessage = '';
      }

      return external_React_default.a.createElement("div", null, external_React_default.a.createElement("div", {
        className: "chat-right-area"
      }, external_React_default.a.createElement("div", {
        className: "chat-right-area contacts-list-scroll"
      }, external_React_default.a.createElement("div", {
        className: "chat-right-pad"
      }, contactsList, contactsListOffline))), external_React_default.a.createElement("div", {
        className: "empty-block"
      }, external_React_default.a.createElement("div", {
        className: "empty-pad conversations"
      }, external_React_default.a.createElement("div", {
        className: "fm-empty-conversations-bg"
      }), external_React_default.a.createElement("div", {
        className: "fm-empty-cloud-txt small",
        dangerouslySetInnerHTML: {
          __html: emptyMessage
        }
      }), button)));
    }

    return external_React_default.a.createElement("div", {
      className: "conversation-panels " + self.props.className
    }, conversations);
  };

  return ConversationPanels;
}(mixins["MegaRenderMixin"]);

function isStartCallDisabled(room) {
  if (Object.keys(room.members).length > 20) {
    return true;
  }

  return !room.isOnlineForCalls() || room.isReadOnly() || room._callSetupPromise || !room.chatId || room.callManagerCall && room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || (room.type === "group" || room.type === "public") && false || room.getCallParticipants().length > 0 || room.getParticipantsExceptMe() < 1;
}

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/extends.js
var helpers_extends = __webpack_require__(12);
var extends_default = __webpack_require__.n(helpers_extends);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/assertThisInitialized.js
var assertThisInitialized = __webpack_require__(4);
var assertThisInitialized_default = __webpack_require__.n(assertThisInitialized);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/inheritsLoose.js
var inheritsLoose = __webpack_require__(1);
var inheritsLoose_default = __webpack_require__.n(inheritsLoose);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js
var applyDecoratedDescriptor = __webpack_require__(9);
var applyDecoratedDescriptor_default = __webpack_require__.n(applyDecoratedDescriptor);

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(6);

// EXTERNAL MODULE: ./js/stores/mixins.js
var mixins = __webpack_require__(2);

// EXTERNAL MODULE: ./js/ui/buttons.jsx
var buttons = __webpack_require__(8);

// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var dropdowns = __webpack_require__(3);

// EXTERNAL MODULE: ./js/chat/ui/conversationpanel.jsx + 30 modules
var conversationpanel = __webpack_require__(18);

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(0);
var external_React_default = __webpack_require__.n(external_React_);

// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultTable.jsx




var resultTable_ResultTable = function (_MegaRenderMixin) {
  inherits(ResultTable, _MegaRenderMixin);

  function ResultTable(props) {
    return _MegaRenderMixin.call(this, props) || this;
  }

  var _proto = ResultTable.prototype;

  _proto.render = function render() {
    var heading = this.props.heading;
    return external_React_default.a.createElement("div", {
      className: "result-table " + (heading ? '' : 'nil')
    }, heading ? external_React_default.a.createElement("div", {
      className: "result-table-heading"
    }, heading) : null, this.props.children);
  };

  return ResultTable;
}(mixins["MegaRenderMixin"]);


// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var contacts = __webpack_require__(5);

// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultRow.jsx







var SEARCH_ROW_CLASS = "result-table-row";
var USER_CARD_CLASS = "user-card";

var roomIsGroup = function roomIsGroup(room) {
  return room && room.type === 'group' || room.type === 'public';
};

var highlight = function highlight(text, matches, dontEscape) {
  if (!text) {
    return;
  }

  text = dontEscape ? text : escapeHTML(text);

  if (matches) {
    var tags = [];
    text = text.replace(/<[^>]+>/g, function (match) {
      return "@@!" + (tags.push(match) - 1) + "!@@";
    });
    var regexes = [];

    for (var i = 0; i < matches.length; i++) {
      regexes.push(RegExpEscape(matches[i].str));
    }

    regexes = regexes.join('|');
    text = text.replace(new RegExp(regexes, 'g'), function cb(word) {
      return "<strong>" + word + "</strong>";
    });
    text = text.replace(/\@\@\!\d+\!\@\@/, function (match) {
      return tags[parseInt(match.replace("@@!", "").replace("!@@"), 10)];
    });
  }

  return text;
};

var openResult = function openResult(room, messageId, index) {
  $(document).trigger('chatSearchResultOpen');

  if (isString(room)) {
    loadSubPage('fm/chat/p/' + room);
  } else if (room && room.chatId && !messageId) {
    var chatRoom = megaChat.getChatById(room.chatId);

    if (chatRoom) {
      loadSubPage(chatRoom.getRoomUrl());
    } else {
      megaChat.openChat([u_handle, room.chatId], 'private', undefined, undefined, undefined, true);
    }
  } else {
    loadSubPage(room.getRoomUrl());

    if (messageId) {
      room.scrollToMessageId(messageId, index);
    }
  }
};

var resultRow_MessageRow = function (_MegaRenderMixin) {
  inherits(MessageRow, _MegaRenderMixin);

  function MessageRow(props) {
    return _MegaRenderMixin.call(this, props) || this;
  }

  var _proto = MessageRow.prototype;

  _proto.render = function render() {
    var _this$props = this.props,
        data = _this$props.data,
        matches = _this$props.matches,
        room = _this$props.room,
        index = _this$props.index;
    var contact = room.getParticipantsExceptMe();
    var summary = data.renderableSummary || room.messagesBuff.getRenderableSummary(data);
    return external_React_default.a.createElement("div", {
      className: "result-table-row message",
      onClick: function onClick() {
        return openResult(room, data.messageId, index);
      }
    }, external_React_default.a.createElement("span", {
      className: "title"
    }, external_React_default.a.createElement(contacts["ContactAwareName"], {
      contact: M.u[contact]
    }, external_React_default.a.createElement(utils["EmojiFormattedContent"], null, room.getRoomTitle()))), !roomIsGroup(room) && external_React_default.a.createElement(contacts["ContactPresence"], {
      contact: M.u[contact]
    }), external_React_default.a.createElement("div", {
      className: "summary",
      dangerouslySetInnerHTML: {
        __html: highlight(summary, matches, true)
      }
    }), external_React_default.a.createElement("span", {
      className: "date"
    }, time2date(data.delay)));
  };

  return MessageRow;
}(mixins["MegaRenderMixin"]);

var resultRow_ChatRow = function (_MegaRenderMixin2) {
  inherits(ChatRow, _MegaRenderMixin2);

  function ChatRow(props) {
    return _MegaRenderMixin2.call(this, props) || this;
  }

  var _proto2 = ChatRow.prototype;

  _proto2.render = function render() {
    var _this$props2 = this.props,
        room = _this$props2.room,
        matches = _this$props2.matches;
    return external_React_default.a.createElement("div", {
      className: SEARCH_ROW_CLASS,
      onClick: function onClick() {
        return openResult(room);
      }
    }, external_React_default.a.createElement("div", {
      className: "chat-topic-icon"
    }), external_React_default.a.createElement("div", {
      className: USER_CARD_CLASS
    }, external_React_default.a.createElement("div", {
      className: "graphic"
    }, external_React_default.a.createElement("span", {
      dangerouslySetInnerHTML: {
        __html: highlight(megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(room.topic)), matches, true)
      }
    }))), external_React_default.a.createElement("div", {
      className: "clear"
    }));
  };

  return ChatRow;
}(mixins["MegaRenderMixin"]);

var resultRow_MemberRow = function (_MegaRenderMixin3) {
  inherits(MemberRow, _MegaRenderMixin3);

  function MemberRow(props) {
    return _MegaRenderMixin3.call(this, props) || this;
  }

  var _proto3 = MemberRow.prototype;

  _proto3.render = function render() {
    var _this$props3 = this.props,
        data = _this$props3.data,
        matches = _this$props3.matches,
        room = _this$props3.room,
        contact = _this$props3.contact;
    var hasHighlight = matches && !!matches.length;
    var isGroup = room && roomIsGroup(room);
    var userCard = {
      graphic: external_React_default.a.createElement("div", {
        className: "graphic"
      }, isGroup ? external_React_default.a.createElement("span", {
        dangerouslySetInnerHTML: {
          __html: highlight(megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(room.topic || room.getRoomTitle())), matches, true)
        }
      }) : external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement("span", {
        dangerouslySetInnerHTML: {
          __html: highlight(megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(nicknames.getNicknameAndName(data))), matches, true)
        }
      }), external_React_default.a.createElement(contacts["ContactPresence"], {
        contact: contact
      }))),
      textual: external_React_default.a.createElement("div", {
        className: "textual"
      }, isGroup ? external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement("span", null, external_React_default.a.createElement(utils["EmojiFormattedContent"], null, room.topic || room.getRoomTitle())), external_React_default.a.createElement(contacts["MembersAmount"], {
        room: room
      })) : external_React_default.a.createElement(external_React_default.a.Fragment, null, external_React_default.a.createElement(utils["EmojiFormattedContent"], null, nicknames.getNicknameAndName(data)), external_React_default.a.createElement(contacts["LastActivity"], {
        contact: contact,
        showLastGreen: true
      })))
    };
    return external_React_default.a.createElement("div", {
      className: SEARCH_ROW_CLASS,
      onClick: function onClick() {
        return openResult(room ? room : contact.h);
      }
    }, isGroup ? external_React_default.a.createElement("div", {
      className: "chat-topic-icon"
    }) : external_React_default.a.createElement(contacts["Avatar"], {
      contact: contact
    }), external_React_default.a.createElement("div", {
      className: USER_CARD_CLASS
    }, userCard[hasHighlight ? 'graphic' : 'textual']), external_React_default.a.createElement("div", {
      className: "clear"
    }));
  };

  return MemberRow;
}(mixins["MegaRenderMixin"]);

var resultRow_NilRow = function NilRow(_ref) {
  var onSearchMessages = _ref.onSearchMessages,
      isFirstQuery = _ref.isFirstQuery;
  return external_React_default.a.createElement("div", {
    className: SEARCH_ROW_CLASS
  }, external_React_default.a.createElement("div", {
    className: "nil-container"
  }, external_React_default.a.createElement("img", {
    src: staticpath + "images/temp/search-icon.png",
    alt: LABEL.NO_RESULTS
  }), external_React_default.a.createElement("span", null, LABEL.NO_RESULTS), isFirstQuery && external_React_default.a.createElement("div", {
    className: "search-messages",
    onClick: onSearchMessages,
    dangerouslySetInnerHTML: {
      __html: LABEL.SEARCH_MESSAGES_INLINE.replace('[A]', '<a>').replace('[/A]', '</a>')
    }
  })));
};

var resultRow_ResultRow = function (_MegaRenderMixin4) {
  inherits(ResultRow, _MegaRenderMixin4);

  function ResultRow(props) {
    return _MegaRenderMixin4.call(this, props) || this;
  }

  var _proto4 = ResultRow.prototype;

  _proto4.render = function render() {
    var _this$props4 = this.props,
        type = _this$props4.type,
        result = _this$props4.result,
        children = _this$props4.children,
        onSearchMessages = _this$props4.onSearchMessages,
        isFirstQuery = _this$props4.isFirstQuery;

    switch (type) {
      case TYPE.MESSAGE:
        return external_React_default.a.createElement(resultRow_MessageRow, {
          data: result.data,
          index: result.index,
          matches: result.matches,
          room: result.room
        });

      case TYPE.CHAT:
        return external_React_default.a.createElement(resultRow_ChatRow, {
          room: result.room,
          matches: result.matches
        });

      case TYPE.MEMBER:
        return external_React_default.a.createElement(resultRow_MemberRow, {
          data: result.data,
          matches: result.matches,
          room: result.room,
          contact: M.u[result.data]
        });

      case TYPE.NIL:
        return external_React_default.a.createElement(resultRow_NilRow, {
          onSearchMessages: onSearchMessages,
          isFirstQuery: isFirstQuery
        });

      default:
        return external_React_default.a.createElement("div", {
          className: SEARCH_ROW_CLASS
        }, children);
    }
  };

  return ResultRow;
}(mixins["MegaRenderMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/searchPanel/resultContainer.jsx






var TYPE = {
  MESSAGE: 1,
  CHAT: 2,
  MEMBER: 3,
  NIL: 4
};
var LABEL = {
  MESSAGES: l[6868],
  CONTACTS_AND_CHATS: l[20174],
  NO_RESULTS: l[8674],
  RECENT: l[20141],
  SEARCH_MESSAGES_CTA: l[23547],
  SEARCH_MESSAGES_INLINE: l[23548],
  DECRYPTING_RESULTS: l[23543],
  PAUSE_SEARCH: l[23544],
  RESUME_SEARCH: l[23545],
  SEARCH_COMPLETE: l[23546]
};

var resultContainer_ResultContainer = function (_MegaRenderMixin) {
  inherits(ResultContainer, _MegaRenderMixin);

  function ResultContainer(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.renderRecents = function (recents) {
      return external_React_default.a.createElement(resultTable_ResultTable, {
        heading: LABEL.RECENT
      }, recents.map(function (recent) {
        return external_React_default.a.createElement(resultRow_ResultRow, {
          key: recent.data,
          type: TYPE.MEMBER,
          result: recent
        });
      }));
    };

    _this.renderResults = function (results, status, isFirstQuery, onSearchMessages) {
      if (status === STATUS.COMPLETED && results.length < 1) {
        return external_React_default.a.createElement(resultTable_ResultTable, null, external_React_default.a.createElement(resultRow_ResultRow, {
          type: TYPE.NIL,
          isFirstQuery: isFirstQuery,
          onSearchMessages: onSearchMessages
        }));
      }

      var RESULT_TABLE = {
        CONTACTS_AND_CHATS: [],
        MESSAGES: []
      };

      for (var resultTypeGroup in results) {
        var len = results[resultTypeGroup].length;

        for (var i = 0; i < len; i++) {
          var result = results[resultTypeGroup].getItem(i);
          var MESSAGE = TYPE.MESSAGE,
              MEMBER = TYPE.MEMBER,
              CHAT = TYPE.CHAT;
          var resultType = result.type,
              resultId = result.resultId;
          var table = resultType === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';
          RESULT_TABLE[table] = [].concat(RESULT_TABLE[table], [external_React_default.a.createElement(resultRow_ResultRow, {
            key: resultId,
            type: resultType === MESSAGE ? MESSAGE : resultType === MEMBER ? MEMBER : CHAT,
            result: result
          })]);
        }
      }

      return Object.keys(RESULT_TABLE).map(function (key, index) {
        var table = {
          ref: RESULT_TABLE[key],
          hasRows: RESULT_TABLE[key] && RESULT_TABLE[key].length,
          isEmpty: RESULT_TABLE[key] && RESULT_TABLE[key].length < 1,
          props: {
            key: index,
            heading: key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS
          }
        };

        if (table.hasRows) {
          return external_React_default.a.createElement(resultTable_ResultTable, table.props, table.ref.map(function (row) {
            return row;
          }));
        }

        if (status === STATUS.COMPLETED && key === 'MESSAGES') {
          var SEARCH_MESSAGES = external_React_default.a.createElement("div", {
            className: "search-messages default-white-button",
            onClick: onSearchMessages
          }, LABEL.SEARCH_MESSAGES_CTA);
          var NO_RESULTS = external_React_default.a.createElement(resultRow_ResultRow, {
            type: TYPE.NIL,
            isFirstQuery: isFirstQuery,
            onSearchMessages: onSearchMessages
          });
          return external_React_default.a.createElement(resultTable_ResultTable, table.props, isFirstQuery ? SEARCH_MESSAGES : NO_RESULTS);
        }

        return null;
      });
    };

    return _this;
  }

  var _proto = ResultContainer.prototype;

  _proto.render = function render() {
    var _this$props = this.props,
        recents = _this$props.recents,
        results = _this$props.results,
        status = _this$props.status,
        isFirstQuery = _this$props.isFirstQuery,
        onSearchMessages = _this$props.onSearchMessages;
    return recents && recents.length ? this.renderRecents(recents) : this.renderResults(results, status, isFirstQuery, onSearchMessages);
  };

  return ResultContainer;
}(mixins["MegaRenderMixin"]);


// CONCATENATED MODULE: ./js/chat/ui/searchPanel/searchField.jsx





var SEARCH_STATUS_CLASS = "search-field-status";

var searchField_SearchField = function (_MegaRenderMixin) {
  inherits(SearchField, _MegaRenderMixin);

  function SearchField(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      hovered: false
    };

    _this.renderStatus = function (status, isClickable, onToggle) {
      var className = "search-field-status " + (isClickable ? 'clickable' : '');

      var handleClick = function handleClick() {
        return isClickable && onToggle();
      };

      var handleHover = function handleHover() {
        return _this.setState(function (state) {
          return {
            hovered: !state.hovered
          };
        });
      };

      switch (status) {
        case STATUS.IN_PROGRESS:
          return external_React_default.a.createElement("div", {
            className: className + " searching",
            onClick: handleClick,
            onMouseOver: handleHover,
            onMouseOut: handleHover
          }, external_React_default.a.createElement("i", {
            className: "small-icon tiny-searching"
          }), _this.state.hovered ? LABEL.PAUSE_SEARCH : LABEL.DECRYPTING_RESULTS);

        case STATUS.PAUSED:
          return external_React_default.a.createElement("div", {
            className: className + " paused",
            onClick: handleClick
          }, external_React_default.a.createElement("i", {
            className: "small-icon tiny-play"
          }), LABEL.RESUME_SEARCH);

        case STATUS.COMPLETED:
          return external_React_default.a.createElement("div", {
            className: className + " complete",
            onClick: handleClick
          }, external_React_default.a.createElement("i", {
            className: "small-icon tiny-complete"
          }), LABEL.SEARCH_COMPLETE);

        default:
          return null;
      }
    };

    return _this;
  }

  var _proto = SearchField.prototype;

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    SearchField.focus();
  };

  _proto.render = function render() {
    var _this2 = this;

    var _this$props = this.props,
        value = _this$props.value,
        searching = _this$props.searching,
        status = _this$props.status,
        onFocus = _this$props.onFocus,
        _onChange = _this$props.onChange,
        onToggle = _this$props.onToggle,
        onReset = _this$props.onReset;
    var isClickable = status === STATUS.IN_PROGRESS || status === STATUS.PAUSED;
    return external_React_default.a.createElement("div", {
      className: "search-field"
    }, external_React_default.a.createElement("i", {
      className: "small-icon thin-search-icon"
    }), external_React_default.a.createElement("input", {
      type: "text",
      autoComplete: "disabled",
      placeholder: "Search",
      ref: SearchField.inputRef,
      value: value,
      onFocus: onFocus,
      onChange: function onChange(ev) {
        if (_this2.state.hovered) {
          _this2.setState({
            hovered: false
          });
        }

        _onChange(ev);
      },
      className: searching ? 'searching' : ''
    }), searching && status && this.renderStatus(status, isClickable, onToggle), external_React_default.a.createElement("i", {
      className: "small-icon tiny-reset",
      onClick: onReset
    }));
  };

  return SearchField;
}(mixins["MegaRenderMixin"]);

searchField_SearchField.inputRef = external_React_default.a.createRef();

searchField_SearchField.select = function () {
  var inputElement = searchField_SearchField.inputRef && searchField_SearchField.inputRef.current;
  var value = inputElement && inputElement.value;

  if (inputElement && value) {
    inputElement.selectionStart = 0;
    inputElement.selectionEnd = value.length;
  }
};

searchField_SearchField.focus = function () {
  return searchField_SearchField.inputRef && searchField_SearchField.inputRef.current && searchField_SearchField.inputRef.current.focus();
};

searchField_SearchField.hasValue = function () {
  return searchField_SearchField.inputRef && searchField_SearchField.inputRef.current && !!searchField_SearchField.inputRef.current.value.length;
};


// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(13);

// CONCATENATED MODULE: ./js/chat/ui/searchPanel/searchPanel.jsx






var STATUS = {
  IN_PROGRESS: 1,
  PAUSED: 2,
  COMPLETED: 3
};
var SEARCH_PANEL_CLASS = "search-panel";

var searchPanel_SearchPanel = function (_MegaRenderMixin) {
  inherits(SearchPanel, _MegaRenderMixin);

  function SearchPanel(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.wrapperRef = null;
    _this.state = {
      value: '',
      searching: false,
      status: undefined,
      isFirstQuery: true,
      recents: [],
      results: []
    };

    _this.unbindEvents = function () {
      if (_this.pageChangeListener) {
        mBroadcaster.removeListener(_this.pageChangeListener);
      }

      $(document).unbind('.searchPanel');
    };

    _this.bindEvents = function () {
      _this.pageChangeListener = mBroadcaster.addListener('pagechange', function () {
        return _this.doToggle('pause');
      });
      $(document).rebind('chatSearchResultOpen.searchPanel', function () {
        return _this.toggleMinimize();
      }).rebind('mousedown.searchPanel', function (ev) {
        if (_this.clickedOutsideComponent(ev) && !_this.props.minimized) {
          _this.toggleMinimize();
        }
      }).rebind('keydown.searchPanel', function (_ref) {
        var keyCode = _ref.keyCode;

        if (keyCode && keyCode === 27 && !_this.props.minimized) {
          return searchField_SearchField.hasValue() ? _this.handleReset() : _this.toggleMinimize();
        }
      });
    };

    _this.clickedOutsideComponent = function (ev) {
      var $target = ev && $(ev.target);
      return $target && $target.parents(".search-panel").length === 0 && $target.parents('div.fm-left-menu.conversations').length === 0 && $target.parents('div.nw-fm-left-icons-panel').length === 0 && ['div.conversationsApp', 'div.fm-main', 'div.fm-left-panel', 'i.tiny-reset', 'div.small-icon.thin-search-icon', 'div.search-messages, div.search-messages a'].every(function (outsideElement) {
        return !$target.is(outsideElement);
      });
    };

    _this.toggleMinimize = function () {
      _this.doToggle('pause');

      _this.props.onToggle();
    };

    _this.doSearch = function (s, searchMessages) {
      return ChatSearch.doSearch(s, function (room, result, results) {
        return _this.setState({
          results: results
        });
      }, searchMessages).catch(function (ex) {
        return d && console.error('Search failed (or was reset)', ex);
      }).always(function () {
        return _this.setState({
          status: STATUS.COMPLETED
        });
      });
    };

    _this.doToggle = function (action) {
      var IN_PROGRESS = STATUS.IN_PROGRESS,
          PAUSED = STATUS.PAUSED,
          COMPLETED = STATUS.COMPLETED;
      var searching = _this.state.status === IN_PROGRESS || _this.state.status === PAUSED;

      if (action && searching) {
        var chatSearch = ChatSearch.doSearch.cs;

        if (!chatSearch) {
          return delay('chat-toggle', function () {
            return _this.doToggle(action);
          }, 600);
        }

        _this.setState({
          status: action === 'pause' ? PAUSED : action === 'resume' ? IN_PROGRESS : COMPLETED
        }, function () {
          return chatSearch[action]();
        });
      }
    };

    _this.doDestroy = function () {
      return ChatSearch && ChatSearch.doSearch && ChatSearch.doSearch.cs && ChatSearch.doSearch.cs.destroy();
    };

    _this.handleChange = function (ev) {
      var value = ev.target.value;
      var searching = value.length > 0;

      _this.doDestroy();

      _this.setState({
        value: value,
        searching: searching,
        status: undefined,
        isFirstQuery: true,
        results: []
      }, function () {
        return searching && delay('chat-search', function () {
          return _this.doSearch(value, false);
        }, 1600);
      });

      _this.wrapperRef.scrollToY(0);
    };

    _this.handleToggle = function () {
      var inProgress = _this.state.status === STATUS.IN_PROGRESS;

      _this.setState({
        status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
      }, function () {
        Soon(function () {
          return searchField_SearchField.focus();
        });
        return _this.doToggle(inProgress ? 'pause' : 'resume');
      });
    };

    _this.handleReset = function () {
      return searchField_SearchField.hasValue() ? _this.setState({
        value: '',
        searching: false,
        status: undefined,
        results: []
      }, function () {
        _this.wrapperRef.scrollToY(0);

        onIdle(function () {
          return searchField_SearchField.focus();
        });

        _this.doDestroy();
      }) : _this.toggleMinimize();
    };

    _this.handleSearchMessages = function () {
      return searchField_SearchField.hasValue() && _this.setState({
        status: STATUS.IN_PROGRESS,
        isFirstQuery: false
      }, function () {
        _this.doSearch(_this.state.value, true);

        searchField_SearchField.focus();
        searchField_SearchField.select();
      });
    };

    return _this;
  }

  var _proto = SearchPanel.prototype;

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    this.bindEvents();
  };

  _proto.componentWillReceiveProps = function componentWillReceiveProps(nextProps, nextContext) {
    _MegaRenderMixin.prototype.componentWillReceiveProps.call(this, nextProps, nextContext);

    if (nextProps.minimized !== this.props.minimized) {
      this.safeForceUpdate();

      if (!nextProps.minimized) {
        Soon(function () {
          searchField_SearchField.focus();
          searchField_SearchField.select();
        });
      }
    }
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    this.unbindEvents();
  };

  _proto.render = function render() {
    var _this2 = this;

    var _this$state = this.state,
        value = _this$state.value,
        searching = _this$state.searching,
        status = _this$state.status,
        isFirstQuery = _this$state.isFirstQuery,
        recents = _this$state.recents,
        results = _this$state.results;
    return external_React_default.a.createElement("div", {
      className: "\n                search-panel\n                " + (searching ? 'expanded' : '') + "\n                " + (this.props.minimized ? 'hidden' : '') + "\n            "
    }, external_React_default.a.createElement(searchField_SearchField, {
      value: value,
      searching: searching,
      status: status,
      onChange: this.handleChange,
      onToggle: this.handleToggle,
      onReset: this.handleReset
    }), external_React_default.a.createElement("div", {
      className: "search-results-wrapper"
    }, external_React_default.a.createElement(perfectScrollbar["PerfectScrollbar"], {
      ref: function ref(wrapper) {
        _this2.wrapperRef = wrapper;
      },
      options: {
        'suppressScrollX': true
      }
    }, !!recents.length && !searching && external_React_default.a.createElement(resultContainer_ResultContainer, {
      recents: recents
    }), searching && external_React_default.a.createElement(resultContainer_ResultContainer, {
      status: status,
      results: results,
      isFirstQuery: isFirstQuery,
      onSearchMessages: this.handleSearchMessages
    }))));
  };

  return SearchPanel;
}(mixins["MegaRenderMixin"]);


// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(10);

// CONCATENATED MODULE: ./js/chat/ui/conversations.jsx





var _dec, _dec2, _class, _dec3, _class2;



var React = __webpack_require__(0);



var PerfectScrollbar = __webpack_require__(13).PerfectScrollbar;









var StartGroupChatWizard = __webpack_require__(25).StartGroupChatWizard;

var getRoomName = function getRoomName(chatRoom) {
  return chatRoom.getRoomTitle();
};

var conversations_ConversationsListItem = (_dec = utils["default"].SoonFcWrap(40, true), _dec2 = Object(mixins["timing"])(0.7, 8), (_class = function (_MegaRenderMixin) {
  inherits(ConversationsListItem, _MegaRenderMixin);

  function ConversationsListItem() {
    return _MegaRenderMixin.apply(this, arguments) || this;
  }

  var _proto = ConversationsListItem.prototype;

  _proto.isLoading = function isLoading() {
    var mb = this.props.chatRoom.messagesBuff;

    if (mb.haveMessages) {
      return false;
    }

    return mb.messagesHistoryIsLoading() || mb.joined === false && mb.isDecrypting;
  };

  _proto.specShouldComponentUpdate = function specShouldComponentUpdate() {
    return !this.loadingShown;
  };

  _proto.componentWillMount = function componentWillMount() {
    var self = this;
    self.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, function () {
      if (d > 2) {
        console.debug('%s: loading:%s', self.getReactId(), self.loadingShown, self.isLoading(), [self]);
      }

      self.safeForceUpdate();
    });
    self.props.chatRoom.rebind('onUnreadCountUpdate.convlistitem', function () {
      delete self.lastMessageId;
      self.safeForceUpdate();
    });
    self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin.prototype.componentWillUnmount.call(this);

    var self = this;
    self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
    self.props.chatRoom.unbind('onUnreadCountUpdate.convlistitem');
  };

  _proto.componentDidMount = function componentDidMount() {
    _MegaRenderMixin.prototype.componentDidMount.call(this);

    this.eventuallyScrollTo();
  };

  _proto.componentDidUpdate = function componentDidUpdate() {
    _MegaRenderMixin.prototype.componentDidUpdate.call(this);

    this.eventuallyScrollTo();
  };

  _proto.eventuallyScrollTo = function eventuallyScrollTo() {
    var chatRoom = this.props.chatRoom || false;

    if (chatRoom._scrollToOnUpdate) {
      if (chatRoom.isCurrentlyActive) {
        chatRoom.scrollToChat();
      } else {
        chatRoom._scrollToOnUpdate = false;
      }
    }
  };

  _proto.render = function render() {
    var classString = "";
    var chatRoom = this.props.chatRoom;

    if (!chatRoom || !chatRoom.chatId) {
      return null;
    }

    var roomId = chatRoom.chatId;

    if (chatRoom.isCurrentlyActive) {
      classString += " active";
    }

    var nameClassString = "user-card-name conversation-name";
    var archivedDiv = "";

    if (chatRoom.isArchived()) {
      archivedDiv = React.createElement("div", {
        className: "archived-badge"
      }, __(l[19067]));
    }

    var contactId;
    var presenceClass;
    var id;

    if (chatRoom.type === "private") {
      var contact = M.u[chatRoom.getParticipantsExceptMe()[0]];

      if (!contact) {
        return null;
      }

      id = 'conversation_' + htmlentities(contact.u);
      presenceClass = chatRoom.megaChat.userPresenceToCssClass(contact.presence);
    } else if (chatRoom.type === "group") {
      contactId = roomId;
      id = 'conversation_' + contactId;
      presenceClass = 'group';
      classString += ' groupchat';
    } else if (chatRoom.type === "public") {
      contactId = roomId;
      id = 'conversation_' + contactId;
      presenceClass = 'group';
      classString += ' groupchat public';
    } else {
      return "unknown room type: " + chatRoom.roomId;
    }

    this.loadingShown = this.isLoading();
    var unreadCount = chatRoom.messagesBuff.getUnreadCount();
    var isUnread = false;
    var notificationItems = [];

    if (chatRoom.havePendingCall() && chatRoom.state != ChatRoom.STATE.LEFT) {
      notificationItems.push(React.createElement("i", {
        className: "tiny-icon " + (chatRoom.isCurrentlyActive ? "blue" : "white") + "-handset",
        key: "callIcon"
      }));
    }

    if (unreadCount > 0) {
      notificationItems.push(React.createElement("span", {
        key: "unreadCounter"
      }, unreadCount > 9 ? "9+" : unreadCount));
      isUnread = true;
    }

    var inCallDiv = null;
    var lastMessageDiv = null;
    var lastMessageDatetimeDiv = null;
    var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
    var lastMsgDivClasses;

    if (lastMessage && lastMessage.renderableSummary && this.lastMessageId === lastMessage.messageId) {
      lastMsgDivClasses = this._lastMsgDivClassesCache;
      lastMessageDiv = this._lastMessageDivCache;
      lastMessageDatetimeDiv = this._lastMessageDatetimeDivCache;
      lastMsgDivClasses += isUnread ? " unread" : "";

      if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
        lastMsgDivClasses += " call";
        classString += " call-exists";
      }
    } else if (lastMessage) {
      lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : "");
      var renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(lastMessage);
      lastMessage.renderableSummary = renderableSummary;

      if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
        lastMsgDivClasses += " call";
        classString += " call-exists";
      }

      lastMessageDiv = React.createElement("div", {
        className: lastMsgDivClasses,
        dangerouslySetInnerHTML: {
          __html: renderableSummary
        }
      });
      var voiceClipType = Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP;

      if (lastMessage.textContents && lastMessage.textContents[1] === voiceClipType) {
        var playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
        lastMessageDiv = React.createElement("div", {
          className: lastMsgDivClasses
        }, React.createElement("span", {
          className: "voice-message-icon"
        }), playTime);
      }

      if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
        lastMessageDiv = React.createElement("div", {
          className: lastMsgDivClasses
        }, React.createElement("span", {
          className: "geolocation-icon"
        }), l[20789]);
      }

      lastMessageDatetimeDiv = React.createElement("div", {
        className: "date-time"
      }, getTimeMarker(lastMessage.delay, true));
    } else {
      lastMsgDivClasses = "conversation-message";
      var emptyMessage = this.loadingShown ? l[7006] : l[8000];
      lastMessageDiv = React.createElement("div", null, React.createElement("div", {
        className: lastMsgDivClasses
      }, __(emptyMessage)));
      lastMessageDatetimeDiv = React.createElement("div", {
        className: "date-time"
      }, l[19077].replace("%s1", getTimeMarker(chatRoom.ctime, true)));
    }

    this.lastMessageId = lastMessage && lastMessage.messageId;
    this._lastMsgDivClassesCache = lastMsgDivClasses.replace(" call-exists", "").replace(" unread", "");
    this._lastMessageDivCache = lastMessageDiv;
    this._lastMessageDatetimeDivCache = lastMessageDatetimeDiv;

    if (chatRoom.callManagerCall && chatRoom.callManagerCall.isActive() === true) {
      var mediaOptions = chatRoom.callManagerCall.getMediaOptions();
      var mutedMicrophone = null;
      var activeCamera = null;
      var onHold = null;

      if (chatRoom.callManagerCall.rtcCall.isOnHold()) {
        onHold = React.createElement("i", {
          className: "small-icon grey-call-on-hold"
        });
      } else {
        if (!mediaOptions.audio) {
          mutedMicrophone = React.createElement("i", {
            className: "small-icon grey-crossed-mic"
          });
        }

        if (mediaOptions.video) {
          activeCamera = React.createElement("i", {
            className: "small-icon grey-videocam"
          });
        }
      }

      inCallDiv = React.createElement("div", {
        className: "call-duration"
      }, mutedMicrophone, activeCamera, onHold, React.createElement("span", {
        className: "call-counter",
        "data-room-id": chatRoom.chatId
      }, secondsToTimeShort(chatRoom._currentCallCounter)));
      classString += " call-active";
      archivedDiv = "";
    }

    if (chatRoom.type !== "public") {
      nameClassString += " privateChat";
    }

    if (chatRoom.callManagerCall && (chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING)) {
      classString += " have-incoming-ringing-call";
    }

    var roomTitle = React.createElement(utils["default"].EmojiFormattedContent, null, chatRoom.getRoomTitle());

    if (chatRoom.type === "private") {
      roomTitle = React.createElement(contacts["ContactAwareName"], {
        contact: this.props.contact
      }, roomTitle);
    }

    var self = this;
    return React.createElement("li", {
      className: classString,
      id: id,
      "data-room-id": roomId,
      "data-jid": contactId,
      onClick: function onClick(e) {
        self.props.onConversationClicked(e);
      }
    }, React.createElement("div", {
      className: nameClassString
    }, roomTitle, chatRoom.type === "private" ? React.createElement("span", {
      className: "user-card-presence " + presenceClass
    }) : undefined), chatRoom.type === "group" || chatRoom.type === "private" ? React.createElement("i", {
      className: "tiny-icon blue-key simpletip",
      "data-simpletip": l[20935]
    }) : undefined, archivedDiv, notificationItems.length > 0 ? React.createElement("div", {
      className: "unread-messages items-" + notificationItems.length
    }, notificationItems) : null, inCallDiv, lastMessageDiv, lastMessageDatetimeDiv);
  };

  return ConversationsListItem;
}(mixins["MegaRenderMixin"]), (applyDecoratedDescriptor_default()(_class.prototype, "eventuallyScrollTo", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyScrollTo"), _class.prototype), applyDecoratedDescriptor_default()(_class.prototype, "render", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "render"), _class.prototype)), _class));

var conversations_ArchConversationsListItem = function (_MegaRenderMixin2) {
  inherits(ArchConversationsListItem, _MegaRenderMixin2);

  function ArchConversationsListItem() {
    return _MegaRenderMixin2.apply(this, arguments) || this;
  }

  var _proto2 = ArchConversationsListItem.prototype;

  _proto2.render = function render() {
    var classString = "arc-chat-list ui-droppable ui-draggable ui-draggable-handle";
    this.props.chatRoom.megaChat;
    var chatRoom = this.props.chatRoom;

    if (!chatRoom || !chatRoom.chatId) {
      return null;
    }

    var roomId = chatRoom.chatId;

    if (chatRoom.archivedSelected === true) {
      classString += " ui-selected";
    }

    var nameClassString = "user-card-name conversation-name";
    var contactId;
    var id;

    if (chatRoom.type === "private") {
      var contact = M.u[chatRoom.getParticipantsExceptMe()[0]];

      if (!contact) {
        return null;
      }

      id = 'conversation_' + htmlentities(contact.u);
      chatRoom.megaChat.userPresenceToCssClass(contact.presence);
    } else if (chatRoom.type === "group") {
      contactId = roomId;
      id = 'conversation_' + contactId;
      classString += ' groupchat';
    } else if (chatRoom.type === "public") {
      contactId = roomId;
      id = 'conversation_' + contactId;
      classString += ' groupchat public';
    } else {
      return "unknown room type: " + chatRoom.roomId;
    }

    var lastMessageDiv = null;
    var lastMessageDatetimeDiv = null;
    var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();

    if (lastMessage) {
      var renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(lastMessage);
      lastMessage.renderableSummary = renderableSummary;
      lastMessageDiv = React.createElement("div", {
        className: "conversation-message",
        dangerouslySetInnerHTML: {
          __html: renderableSummary
        }
      });
      lastMessageDatetimeDiv = React.createElement("div", {
        className: "date-time"
      }, getTimeMarker(lastMessage.delay, true));
    } else {
      var emptyMessage = chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];
      lastMessageDiv = React.createElement("div", null, React.createElement("div", {
        className: "conversation-message"
      }, __(emptyMessage)));
    }

    if (chatRoom.type !== "public") {
      nameClassString += " privateChat";
    }

    return React.createElement("tr", {
      className: classString,
      id: id,
      "data-room-id": roomId,
      "data-jid": contactId,
      onClick: this.props.onConversationSelected.bind(this),
      onDoubleClick: this.props.onConversationClicked.bind(this)
    }, React.createElement("td", {
      className: ""
    }, React.createElement("div", {
      className: "fm-chat-user-info todo-star"
    }, React.createElement("div", {
      className: nameClassString
    }, React.createElement(utils["default"].EmojiFormattedContent, null, chatRoom.getRoomTitle()), chatRoom.type === "group" ? React.createElement("i", {
      className: "tiny-icon blue-key"
    }) : undefined), lastMessageDiv, lastMessageDatetimeDiv), React.createElement("div", {
      className: "archived-badge"
    }, __(l[19067]))), React.createElement("td", {
      width: "330"
    }, React.createElement("div", {
      className: "archived-on"
    }, React.createElement("div", {
      className: "archived-date-time"
    }, lastMessageDatetimeDiv), React.createElement("div", {
      className: "clear"
    })), React.createElement("div", {
      className: "button default-white-button semi-big unarchive-chat right",
      onClick: this.props.onUnarchiveConversationClicked.bind(this)
    }, React.createElement("span", null, __(l[19065])))));
  };

  return ArchConversationsListItem;
}(mixins["MegaRenderMixin"]);

var conversations_ConversationsList = function (_MegaRenderMixin3) {
  inherits(ConversationsList, _MegaRenderMixin3);

  var _proto3 = ConversationsList.prototype;

  _proto3.customIsEventuallyVisible = function customIsEventuallyVisible() {
    return M.chat;
  };

  _proto3.attachRerenderCallbacks = function attachRerenderCallbacks() {
    var _this2 = this;

    this._megaChatsListener = megaChat.chats.addChangeListener(function () {
      return _this2.onPropOrStateUpdated();
    });
  };

  _proto3.detachRerenderCallbacks = function detachRerenderCallbacks() {
    if (_MegaRenderMixin3.prototype.detachRerenderCallbacks) {
      _MegaRenderMixin3.prototype.detachRerenderCallbacks.call(this);
    }

    megaChat.chats.removeChangeListener(this._megaChatsListener);
  };

  function ConversationsList(props) {
    var _this = _MegaRenderMixin3.call(this, props) || this;

    _this.currentCallClicked = _this.currentCallClicked.bind((_this));
    _this.endCurrentCall = _this.endCurrentCall.bind((_this));
    return _this;
  }

  _proto3.componentDidUpdate = function componentDidUpdate() {
    _MegaRenderMixin3.prototype.componentDidUpdate && _MegaRenderMixin3.prototype.componentDidUpdate.call(this);
  };

  _proto3.conversationClicked = function conversationClicked(room, e) {
    loadSubPage(room.getRoomUrl());
    e.stopPropagation();
  };

  _proto3.currentCallClicked = function currentCallClicked(e) {
    var activeCallSession = megaChat.activeCallSession;

    if (activeCallSession) {
      this.conversationClicked(activeCallSession.room, e);
    }
  };

  _proto3.contactClicked = function contactClicked(contact, e) {
    loadSubPage("fm/chat/p/" + contact.u);
    e.stopPropagation();
  };

  _proto3.endCurrentCall = function endCurrentCall(e) {
    var activeCallSession = megaChat.activeCallSession;

    if (activeCallSession) {
      activeCallSession.endCall('hangup');
      this.conversationClicked(activeCallSession.room, e);
    }
  };

  _proto3.render = function render() {
    var self = this;
    var currentCallingContactStatusProps = {
      'className': "nw-conversations-item current-calling",
      'data-jid': ''
    };
    var activeCallSession = megaChat.activeCallSession;

    if (activeCallSession && activeCallSession.room && megaChat.activeCallSession.isActive()) {
      var room = activeCallSession.room;
      var user = room.getParticipantsExceptMe()[0];

      if (user) {
        currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.userPresenceToCssClass(user.presence);
        currentCallingContactStatusProps['data-jid'] = room.roomId;

        if (room.roomId == megaChat.currentlyOpenedChat) {
          currentCallingContactStatusProps.className += " selected";
        }
      } else {
        currentCallingContactStatusProps.className += ' hidden';
      }
    } else {
      currentCallingContactStatusProps.className += ' hidden';
    }

    var currConvsList = [];
    var sortedConversations = obj_values(megaChat.chats.toJS());
    sortedConversations.sort(M.sortObjFn(function (room) {
      return !room.lastActivity ? room.ctime : room.lastActivity;
    }, -1));
    sortedConversations.forEach(function (chatRoom) {
      var contact;

      if (!chatRoom || !chatRoom.roomId) {
        return;
      }

      if (!chatRoom.isDisplayable()) {
        return;
      }

      if (self.props.quickSearchText) {
        var s1 = String(chatRoom.getRoomTitle()).toLowerCase();
        var s2 = String(self.props.quickSearchText).toLowerCase();

        if (s1.indexOf(s2) === -1) {
          return;
        }
      }

      if (mega.paywall) {
        chatRoom.privateReadOnlyChat = true;
      } else {
        if (chatRoom.type === "private") {
          contact = chatRoom.getParticipantsExceptMe()[0];

          if (!contact) {
            return;
          }

          contact = M.u[contact];

          if (contact) {
            if (!chatRoom.privateReadOnlyChat && !contact.c) {
              Soon(function () {
                chatRoom.privateReadOnlyChat = true;
              });
            } else if (chatRoom.privateReadOnlyChat && contact.c) {
              Soon(function () {
                chatRoom.privateReadOnlyChat = false;
              });
            }
          }
        }
      }

      currConvsList.push(React.createElement(conversations_ConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom: chatRoom,
        contact: contact,
        messages: chatRoom.messagesBuff,
        onConversationClicked: function onConversationClicked(e) {
          self.conversationClicked(chatRoom, e);
        }
      }));
    });
    return React.createElement("div", {
      className: "conversationsList"
    }, React.createElement("ul", {
      className: "conversations-pane"
    }, currConvsList));
  };

  return ConversationsList;
}(mixins["MegaRenderMixin"]);

conversations_ConversationsList.defaultProps = {
  'manualDataChangeTracking': true
};

var conversations_ArchivedConversationsList = function (_MegaRenderMixin4) {
  inherits(ArchivedConversationsList, _MegaRenderMixin4);

  function ArchivedConversationsList(props) {
    var _this3 = _MegaRenderMixin4.call(this, props) || this;

    _this3.state = _this3.getInitialState();
    _this3.onSortNameClicked = _this3.onSortNameClicked.bind((_this3));
    _this3.onSortTimeClicked = _this3.onSortTimeClicked.bind((_this3));
    return _this3;
  }

  var _proto4 = ArchivedConversationsList.prototype;

  _proto4.getInitialState = function getInitialState() {
    return {
      'items': megaChat.chats,
      'orderby': 'lastActivity',
      'nameorder': 1,
      'timeorder': -1,
      'confirmUnarchiveChat': null,
      'confirmUnarchiveDialogShown': false
    };
  };

  _proto4.conversationClicked = function conversationClicked(room, e) {
    room.showArchived = true;
    loadSubPage(room.getRoomUrl());
    e.stopPropagation();
  };

  _proto4.conversationSelected = function conversationSelected(room, e) {
    var self = this;
    var previousState = room.archivedSelected ? room.archivedSelected : false;
    var sortedConversations = obj_values(megaChat.chats.toJS());
    sortedConversations.forEach(function (chatRoom) {
      if (!chatRoom || !chatRoom.roomId) {
        return;
      }

      if (!chatRoom.isArchived()) {
        return;
      }

      if (chatRoom.chatId !== room.chatId) {
        chatRoom.archivedSelected = false;
      } else {
        chatRoom.archivedSelected = !chatRoom.archivedSelected;
      }
    });
    room.archivedSelected = !previousState;
    self.setState({
      'items': sortedConversations
    });
    e.stopPropagation();
  };

  _proto4.unarchiveConversationClicked = function unarchiveConversationClicked(room) {
    var self = this;
    self.setState({
      'confirmUnarchiveDialogShown': true,
      'confirmUnarchiveChat': room.roomId
    });
  };

  _proto4.onSortNameClicked = function onSortNameClicked() {
    this.setState({
      'orderby': 'name',
      'nameorder': this.state.nameorder * -1
    });
  };

  _proto4.onSortTimeClicked = function onSortTimeClicked() {
    this.setState({
      'orderby': 'lastActivity',
      'timeorder': this.state.timeorder * -1
    });
  };

  _proto4.render = function render() {
    var self = this;
    var currConvsList = [];
    var sortedConversations = obj_values(megaChat.chats.toJS());
    var orderValue = -1;
    var orderKey = "lastActivity";
    var nameOrderClass = "";
    var timerOrderClass = "";

    if (self.state.orderby === "name") {
      orderKey = getRoomName;
      orderValue = self.state.nameorder;
      nameOrderClass = self.state.nameorder === 1 ? "desc" : "asc";
    } else {
      orderKey = "lastActivity";
      orderValue = self.state.timeorder;
      timerOrderClass = self.state.timeorder === 1 ? "desc" : "asc";
    }

    sortedConversations.sort(M.sortObjFn(orderKey, orderValue));
    sortedConversations.forEach(function (chatRoom) {
      var contact;

      if (!chatRoom || !chatRoom.roomId) {
        return;
      }

      if (!chatRoom.isArchived()) {
        return;
      }

      if (chatRoom.type === "private") {
        contact = chatRoom.getParticipantsExceptMe()[0];

        if (!contact) {
          return;
        }

        contact = M.u[contact];

        if (contact) {
          if (!chatRoom.privateReadOnlyChat && !contact.c) {
            Soon(function () {
              chatRoom.privateReadOnlyChat = true;
            });
          } else if (chatRoom.privateReadOnlyChat && contact.c) {
            Soon(function () {
              chatRoom.privateReadOnlyChat = false;
            });
          }
        }
      }

      currConvsList.push(React.createElement(conversations_ArchConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom: chatRoom,
        contact: contact,
        messages: chatRoom.messagesBuff,
        onConversationClicked: function onConversationClicked(e) {
          self.conversationClicked(chatRoom, e);
        },
        onConversationSelected: function onConversationSelected(e) {
          self.conversationSelected(chatRoom, e);
        },
        onUnarchiveConversationClicked: function onUnarchiveConversationClicked(e) {
          self.unarchiveConversationClicked(chatRoom, e);
        }
      }));
    });
    var confirmUnarchiveDialog = null;

    if (self.state.confirmUnarchiveDialogShown === true) {
      var room = megaChat.chats[self.state.confirmUnarchiveChat];

      if (room) {
        confirmUnarchiveDialog = React.createElement(modalDialogs["a" ].ConfirmDialog, {
          chatRoom: room,
          title: __(l[19063]),
          name: "unarchive-conversation",
          onClose: function onClose() {
            self.setState({
              'confirmUnarchiveDialogShown': false
            });
          },
          onConfirmClicked: function onConfirmClicked() {
            room.unarchive();
            self.setState({
              'confirmUnarchiveDialogShown': false
            });
          }
        }, React.createElement("div", {
          className: "fm-dialog-content"
        }, React.createElement("div", {
          className: "dialog secondary-header"
        }, __(l[19064]))));
      }
    }

    return React.createElement("div", {
      className: "chat-content-block archived-chats"
    }, React.createElement("div", {
      className: "files-grid-view archived-chat-view"
    }, React.createElement("table", {
      className: "grid-table-header",
      width: "100%",
      cellSpacing: "0",
      cellPadding: "0",
      border: "0"
    }, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
      className: "calculated-width",
      onClick: self.onSortNameClicked
    }, React.createElement("div", {
      className: "is-chat arrow name " + nameOrderClass
    }, __(l[86]))), React.createElement("th", {
      width: "330",
      onClick: self.onSortTimeClicked
    }, React.createElement("div", {
      className: "is-chat arrow interaction " + timerOrderClass
    }, __(l[5904])))))), React.createElement("div", {
      className: "grid-scrolling-table archive-chat-list"
    }, React.createElement("table", {
      className: "grid-table arc-chat-messages-block"
    }, React.createElement("tbody", null, currConvsList)))), confirmUnarchiveDialog);
  };

  return ArchivedConversationsList;
}(mixins["MegaRenderMixin"]);

var conversations_ConversationsApp = (_dec3 = utils["default"].SoonFcWrap(80), (_class2 = function (_MegaRenderMixin5) {
  inherits(ConversationsApp, _MegaRenderMixin5);

  function ConversationsApp(props) {
    var _this4 = _MegaRenderMixin5.call(this, props) || this;

    _this4.state = {
      leftPaneWidth: mega.config.get('leftPaneWidth'),
      startGroupChatDialogShown: false,
      searchActive: false,
      searchMinimized: true
    };
    return _this4;
  }

  var _proto5 = ConversationsApp.prototype;

  _proto5.startChatClicked = function startChatClicked(selected) {
    if (selected.length === 1) {
      megaChat.createAndShowPrivateRoom(selected[0]).then(function (room) {
        room.setActive();
      });
    } else {
      megaChat.createAndShowGroupRoomFor(selected);
    }
  };

  _proto5.componentDidMount = function componentDidMount() {
    _MegaRenderMixin5.prototype.componentDidMount.call(this);

    var self = this;
    $(document.body).rebind('startNewChatLink.conversations', function () {
      self.startGroupChatFlow = 2;
      self.setState({
        'startGroupChatDialogShown': true
      });
    });
    window.addEventListener('resize', this.handleWindowResize);
    $(document).rebind('keydown.megaChatTextAreaFocus', function (e) {
      if (!M.chat || e.megaChatHandled) {
        return;
      }

      var currentlyOpenedChat = megaChat.currentlyOpenedChat;
      var currentRoom = megaChat.getCurrentRoom();

      if (currentlyOpenedChat) {
        if (currentlyOpenedChat && currentRoom && currentRoom.isReadOnly() || $(e.target).is(".messages-textarea, input, textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
          return;
        }

        var $typeArea = $('.messages-textarea:visible:first');
        moveCursortoToEnd($typeArea);
        e.megaChatHandled = true;
        $typeArea.triggerHandler(e);
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
    $(document).rebind('mouseup.megaChatTextAreaFocus', function (e) {
      if (!M.chat || e.megaChatHandled || slideshowid) {
        return;
      }

      var $target = $(e.target);

      if (megaChat.currentlyOpenedChat) {
        if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.closest('.messages.scroll-area').length > 0 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
          return;
        }

        var $typeArea = $('.messages-textarea:visible:first');

        if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
          $typeArea.trigger("focus");
          e.megaChatHandled = true;
        }
      }
    });
    self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function () {
      megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
      delay('CoApp:fmc:thr', function () {
        self.setState({
          'leftPaneWidth': mega.config.get('leftPaneWidth')
        });
        $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
        $('.jScrollPaneContainer:visible').trigger('forceResize');
      }, 75);
      megaChat.$leftPane.width(mega.config.get('leftPaneWidth'));
      $('.fm-tree-panel', megaChat.$leftPane).width(mega.config.get('leftPaneWidth'));
    });

    var lPaneResizableInit = function lPaneResizableInit() {
      megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
      $.leftPaneResizableChat = new FMResizablePane(megaChat.$leftPane, $.leftPaneResizable.options);

      if (fmconfig.leftPaneWidth) {
        megaChat.$leftPane.width(Math.min($.leftPaneResizableChat.options.maxWidth, Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)));
      }

      $($.leftPaneResizableChat).on('resize', function () {
        var w = megaChat.$leftPane.width();

        if (w >= $.leftPaneResizableChat.options.maxWidth) {
          $('.left-pane-drag-handle').css('cursor', 'w-resize');
        } else if (w <= $.leftPaneResizableChat.options.minWidth) {
          $('.left-pane-drag-handle').css('cursor', 'e-resize');
        } else {
          $('.left-pane-drag-handle').css('cursor', 'we-resize');
        }

        $('.jspVerticalBar:visible').addClass('hiden-when-dragging');
      });
      $($.leftPaneResizableChat).on('resizestop', function () {
        $('.fm-left-panel').width(megaChat.$leftPane.width());
        $('.jScrollPaneContainer:visible').trigger('forceResize');
        setTimeout(function () {
          $('.hiden-when-dragging').removeClass('hiden-when-dragging');
        }, 100);
      });
    };

    if (typeof $.leftPaneResizable === 'undefined') {
      mBroadcaster.once('fm:initialized', function () {
        lPaneResizableInit();
      });
    } else {
      lPaneResizableInit();
    }

    megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');

    if (anonymouschat) {
      megaChat.$leftPane.addClass('hidden');
    } else {
      megaChat.$leftPane.removeClass('hidden');
    }

    this.handleWindowResize();
    $('.conversations .nw-fm-tree-header input.chat-quick-search').rebind('cleared.jq', function () {
      self.setState({
        'quickSearchText': ''
      });
      treesearch = false;
    });
  };

  _proto5.componentWillUnmount = function componentWillUnmount() {
    _MegaRenderMixin5.prototype.componentWillUnmount.call(this);

    window.removeEventListener('resize', this.handleWindowResize);
    $(document).off('keydown.megaChatTextAreaFocus');
    mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
  };

  _proto5.componentDidUpdate = function componentDidUpdate() {
    this.handleWindowResize();

    if (megaChat.displayArchivedChats === true) {
      this.initArchivedChatsScrolling();
    }
  };

  _proto5.handleWindowResize = function handleWindowResize() {
    if (!M.chat) {
      return;
    }

    if (anonymouschat) {
      $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
        'margin-left': "0px"
      });
    } else {
      $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
        'margin-left': $('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width() + "px"
      });
    }
  };

  _proto5.initArchivedChatsScrolling = function initArchivedChatsScrolling() {
    deleteScrollPanel(".archive-chat-list", 'jsp');
    $(".archive-chat-list").jScrollPane({
      enableKeyboardNavigation: false,
      showArrows: true,
      arrowSize: 5
    });
    jScrollFade(".archive-chat-list");
  };

  _proto5.archiveChatsClicked = function archiveChatsClicked() {
    loadSubPage('fm/chat/archived');
  };

  _proto5.calcArchiveChats = function calcArchiveChats() {
    var count = 0;
    megaChat.chats.forEach(function (chatRoom) {
      if (!chatRoom || !chatRoom.roomId) {
        return;
      }

      if (chatRoom.isArchived()) {
        count++;
      }
    });
    return count;
  };

  _proto5.getTopButtonsForContactsPicker = function getTopButtonsForContactsPicker() {
    var self = this;

    if (!self._topButtonsContactsPicker) {
      self._topButtonsContactsPicker = [{
        'key': 'add',
        'title': l[71],
        'icon': 'rounded-plus colorized',
        'onClick': function onClick() {
          contactAddDialog();
        }
      }, {
        'key': 'newGroupChat',
        'title': l[19483],
        'icon': 'conversation-with-plus',
        'onClick': function onClick() {
          self.startGroupChatFlow = 1;
          self.setState({
            'startGroupChatDialogShown': true
          });
        }
      }, {
        'key': 'newChatLink',
        'title': l[20638],
        'icon': 'small-icon blue-chain colorized',
        'onClick': function onClick() {
          self.startGroupChatFlow = 2;
          self.setState({
            'startGroupChatDialogShown': true
          });
        }
      }];
    }

    return self._topButtonsContactsPicker;
  };

  _proto5.render = function render() {
    var _this5 = this;

    var self = this;
    var startGroupChatDialog = null;

    if (self.state.startGroupChatDialogShown === true) {
      startGroupChatDialog = React.createElement(StartGroupChatWizard, {
        name: "start-group-chat",
        flowType: self.startGroupChatFlow,
        onClose: function onClose() {
          self.setState({
            'startGroupChatDialogShown': false
          });
          delete self.startGroupChatFlow;
        },
        onConfirmClicked: function onConfirmClicked() {
          self.setState({
            'startGroupChatDialogShown': false
          });
          delete self.startGroupChatFlow;
        }
      });
    }

    var leftPanelStyles = {};

    if (self.state.leftPaneWidth) {
      leftPanelStyles.width = self.state.leftPaneWidth;
    }

    var loadingOrEmpty = null;
    var isLoading = false;
    var nonArchivedChats = megaChat.chats.map(function (r) {
      return !r.isArchived() ? r : undefined;
    });

    if (nonArchivedChats.length === 0) {
      loadingOrEmpty = React.createElement("div", {
        className: "fm-empty-messages hidden"
      }, React.createElement("div", {
        className: "fm-empty-pad"
      }, React.createElement("div", {
        className: "fm-empty-messages-bg"
      }), React.createElement("div", {
        className: "fm-empty-cloud-txt"
      }, l[6870]), React.createElement("div", {
        className: "fm-not-logged-text"
      }, React.createElement("div", {
        className: "fm-not-logged-description",
        dangerouslySetInnerHTML: {
          __html: __(l[8762]).replace("[S]", "<span className='red'>").replace("[/S]", "</span>")
        }
      }), React.createElement("div", {
        className: "fm-not-logged-button create-account"
      }, __(l[968])))));
    } else if (!megaChat.currentlyOpenedChat && megaChat.allChatsHadInitialLoadedHistory() === false && megaChat.displayArchivedChats !== true) {
      loadingOrEmpty = React.createElement("div", {
        className: "fm-empty-messages"
      }, React.createElement("div", {
        className: "loading-spinner js-messages-loading light manual-management",
        style: {
          "top": "50%"
        }
      }, React.createElement("div", {
        className: "main-loader",
        style: {
          "position": "fixed",
          "top": "50%",
          "left": "50%",
          "marginLeft": "72px"
        }
      })));
      isLoading = true;
    }

    var rightPaneStyles = {};

    if (anonymouschat) {
      rightPaneStyles = {
        'marginLeft': 0
      };
    }

    var rightPane = React.createElement("div", {
      className: "fm-right-files-block in-chat",
      style: rightPaneStyles
    }, loadingOrEmpty, !isLoading && megaChat.displayArchivedChats === true ? React.createElement(conversations_ArchivedConversationsList, {
      key: "archivedchats"
    }) : null, !isLoading ? React.createElement(conversationpanel["ConversationPanels"], extends_default()({}, this.props, {
      chatUIFlags: megaChat.chatUIFlags,
      displayArchivedChats: megaChat.displayArchivedChats,
      className: megaChat.displayArchivedChats === true ? "hidden" : "",
      currentlyOpenedChat: megaChat.currentlyOpenedChat,
      chats: megaChat.chats
    })) : null);
    var archivedChatsCount = this.calcArchiveChats();
    var arcBtnClass = "left-pane-button archived";
    var arcIconClass = "small-icon archive colorized";

    if (megaChat.displayArchivedChats) {
      arcBtnClass += ' active';
      arcIconClass = arcIconClass.replace('colorized', 'white');
    }

    return React.createElement("div", {
      className: "conversationsApp",
      key: "conversationsApp"
    }, startGroupChatDialog, React.createElement("div", {
      className: "fm-left-panel chat-left-panel",
      style: leftPanelStyles
    }, React.createElement("div", {
      className: "left-pane-drag-handle"
    }), React.createElement("div", {
      className: "fm-left-menu conversations"
    }, this.state.searchActive && React.createElement(searchPanel_SearchPanel, {
      minimized: this.state.searchMinimized,
      onToggle: function onToggle() {
        return _this5.setState(function (state) {
          return {
            searchMinimized: !state.searchMinimized
          };
        });
      }
    }), React.createElement("div", {
      className: "nw-fm-tree-header conversations filled-input"
    }, React.createElement("div", {
      className: "search-heading",
      onClick: function onClick() {
        return _this5.setState(function (state) {
          return {
            searchActive: true,
            searchMinimized: !state.searchMinimized
          };
        });
      }
    }, l[7997], React.createElement("div", {
      className: "small-icon thin-search-icon"
    })), React.createElement(buttons["Button"], {
      group: "conversationsListing",
      icon: "chat-with-plus"
    }, React.createElement(dropdowns["DropdownContactsSelector"], {
      className: "main-start-chat-dropdown",
      onSelectDone: this.startChatClicked.bind(this),
      multiple: false,
      showTopButtons: self.getTopButtonsForContactsPicker()
    })))), React.createElement("div", {
      className: "fm-tree-panel manual-tree-panel-scroll-management",
      style: leftPanelStyles
    }, React.createElement(PerfectScrollbar, {
      style: leftPanelStyles,
      className: "conversation-reduce-height",
      chats: megaChat.chats,
      ref: function ref(_ref) {
        megaChat.$chatTreePanePs = _ref;
      }
    }, React.createElement("div", {
      className: "content-panel conversations" + (M.chat ? " active" : "")
    }, React.createElement(conversations_ConversationsList, {
      quickSearchText: this.state.quickSearchText
    }))), React.createElement("div", {
      className: "left-pane-button new-link",
      onClick: function onClick() {
        self.startGroupChatFlow = 2;
        self.setState({
          'startGroupChatDialogShown': true
        });
        return false;
      }
    }, React.createElement("i", {
      className: "small-icon blue-chain colorized"
    }), React.createElement("div", {
      className: "heading"
    }, __(l[20638]))), React.createElement("div", {
      className: arcBtnClass,
      onClick: this.archiveChatsClicked.bind(this)
    }, React.createElement("i", {
      className: arcIconClass
    }), React.createElement("div", {
      className: "heading"
    }, __(l[19066])), React.createElement("div", {
      className: "indicator"
    }, archivedChatsCount)))), rightPane);
  };

  return ConversationsApp;
}(mixins["MegaRenderMixin"]), (applyDecoratedDescriptor_default()(_class2.prototype, "handleWindowResize", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "handleWindowResize"), _class2.prototype)), _class2));

if (false) {}

var conversations = __webpack_exports__["default"] = ({
  ConversationsList: conversations_ConversationsList,
  ArchivedConversationsList: conversations_ArchivedConversationsList,
  ConversationsApp: conversations_ConversationsApp
});

/***/ }),

/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(21);
module.exports = __webpack_require__(19);


/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var react0__ = __webpack_require__(0);
var react0 = __webpack_require__.n(react0__);
var react_dom1__ = __webpack_require__(7);
var react_dom1 = __webpack_require__.n(react_dom1__);
var _ui_conversations_jsx2__ = __webpack_require__(19);




__webpack_require__(22);

__webpack_require__(23);

var EMOJI_DATASET_VERSION = 3;
var CHAT_ONHISTDECR_RECNT = "onHistoryDecrypted.recent";
var megaChatInstanceId = 0;
var CHATUIFLAGS_MAPPING = {
  'convPanelCollapse': 'cPC'
};

function Chat() {
  var self = this;
  this.is_initialized = false;
  this.logger = MegaLogger.getLogger("chat");
  this.chats = new MegaDataMap();
  this.chatUIFlags = new MegaDataMap();
  this.initChatUIFlagsManagement();
  this.currentlyOpenedChat = null;
  this.lastOpenedChat = null;
  this.archivedChatsCount = 0;
  this._myPresence = localStorage.megaChatPresence;
  this._imageLoadCache = Object.create(null);
  this._imagesToBeLoaded = Object.create(null);
  this._imageAttributeCache = Object.create(null);
  this._queuedMccPackets = [];
  this._queuedMessageUpdates = [];
  this.handleToId = Object.create(null);
  this.publicChatKeys = Object.create(null);
  this.options = {
    'delaySendMessageIfRoomNotAvailableTimeout': 3000,
    'loadbalancerService': 'gelb.karere.mega.nz',
    'rtc': {
      iceServers: [{
        urls: 'turn:trn270n001.karere.mega.nz:3478?transport=udp',
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }, {
        urls: 'turn:trn302n001.karere.mega.nz:3478?transport=udp',
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }, {
        urls: 'turn:trn530n001.karere.mega.nz:3478?transport=udp',
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }]
    },
    filePickerOptions: {},
    'plugins': {
      'chatdIntegration': ChatdIntegration,
      'callManager': CallManager,
      'urlFilter': UrlFilter,
      'emoticonShortcutsFilter': EmoticonShortcutsFilter,
      'emoticonsFilter': EmoticonsFilter,
      'callFeedback': CallFeedback,
      'presencedIntegration': PresencedIntegration,
      'persistedTypeArea': PersistedTypeArea,
      'btRtfFilter': BacktickRtfFilter,
      'rtfFilter': RtfFilter,
      'richpreviewsFilter': RichpreviewsFilter,
      'chatStats': ChatStats,
      'geoLocationLinks': GeoLocationLinks
    },
    'chatNotificationOptions': {
      'textMessages': {
        'incoming-chat-message': {
          'title': "Incoming chat message",
          'icon': function icon(notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return "You have new incoming chat message from: " + params.from;
          }
        },
        'incoming-attachment': {
          'title': "Incoming attachment",
          'icon': function icon(notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return params.from + " shared " + (params.attachmentsCount > 1 ? params.attachmentsCount + " files" : "a file");
          }
        },
        'incoming-voice-video-call': {
          'title': l[17878] || "Incoming call",
          'icon': function icon(notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return l[5893].replace('[X]', params.from);
          }
        },
        'call-terminated': {
          'title': "Call terminated",
          'icon': function icon(notificationObj) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return l[5889].replace('[X]', params.from);
          }
        }
      },
      'sounds': ['alert_info_message', 'error_message', 'incoming_chat_message', 'incoming_contact_request', 'incoming_file_transfer', 'incoming_voice_video_call', 'hang_out']
    },
    'chatStoreOptions': {
      'autoPurgeMaxMessagesPerRoom': 1024
    }
  };
  this.instanceId = megaChatInstanceId++;
  this.plugins = {};
  self.filePicker = null;
  self._chatsAwaitingAps = {};
  MegaDataObject.call(this, {
    "currentlyOpenedChat": null,
    "displayArchivedChats": false
  });
  return this;
}

inherits(Chat, MegaDataObject);
Object.defineProperty(Chat, 'mcf', {
  value: Object.create(null)
});
Chat.prototype.init = promisify(function (resolve, reject) {
  var self = this;

  if (self.is_initialized) {
    self.destroy();
  }

  if (d) {
    console.time('megachat:plugins:init');
  }

  self.plugins = Object.create(null);
  self.plugins.chatNotifications = new ChatNotifications(self, self.options.chatNotificationOptions);
  self.plugins.chatNotifications.notifications.rebind('onAfterNotificationCreated.megaChat', function () {
    self.updateSectionUnreadCount();
  });
  Object.keys(self.options.plugins).forEach(function (plugin) {
    self.plugins[plugin] = new self.options.plugins[plugin](self);
  });

  if (d) {
    console.timeEnd('megachat:plugins:init');
  }

  var $body = $(document.body);
  $body.rebind('mousedown.megachat', '.top-user-status-popup .tick-item', function () {
    var presence = $(this).data("presence");
    self._myPresence = presence;
    $('.top-user-status-popup').removeClass("active").addClass("hidden");
    var targetPresence = PresencedIntegration.cssClassToPresence(presence);
    self.plugins.presencedIntegration.setPresence(targetPresence);

    if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
      Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
        var v = self.plugins.chatdIntegration.chatd.shards[k];
        v.connectionRetryManager.requiresConnection();
      });
    }
  });
  self.$container = $('.fm-chat-block');

  if (!anonymouschat) {
    $('.activity-status-block, .activity-status').show();
  }

  self.on('onRoomInitialized', function (e, room) {
    if (room.type === "private") {
      var c = M.u[room.getParticipantsExceptMe()[0]];

      if (c) {
        $('#contact_' + c.u + ' .start-chat-button').addClass("active");
      }
    }

    room.rebind("onChatShown.chatMainList", function () {
      $('.conversations-main-listing').addClass("hidden");
    });
    self.updateDashboard();
  });
  self.on('onRoomDestroy', function (e, room) {
    if (room.type === "private") {
      var c = M.u[room.getParticipantsExceptMe()[0]];

      if (c) {
        $('#contact_' + c.u + ' .start-chat-button').removeClass("active");
      }
    }

    if (room.callManagerCall) {
      room.callManagerCall.endCall();
    }
  });
  $body.rebind('mouseover.notsentindicator', '.tooltip-trigger', function () {
    var $this = $(this);
    var $notification = $('.tooltip.' + $this.attr('data-tooltip')).removeClass('hidden');
    var iconTopPos = $this.offset().top;
    var iconLeftPos = $this.offset().left;
    var notificatonHeight = $notification.outerHeight() + 10;
    var notificatonWidth = $notification.outerWidth() / 2 - 10;
    $notification.offset({
      top: iconTopPos - notificatonHeight,
      left: iconLeftPos - notificatonWidth
    });
  });
  $body.rebind('mouseout.notsentindicator click.notsentindicator', '.tooltip-trigger', function () {
    var $notification = $('.tooltip');
    $notification.addClass('hidden').removeAttr('style');
  });
  var sitePath = getCleanSitePath();

  if (anonymouschat) {
    this.publicChatKeys[pchandle] = sitePath.split('#').pop();
    Chat.mcf[pchandle] = pchandle;
  } else if (sitePath.substr(0, 5) === 'chat/' && sitePath.indexOf('#') > 0) {
    sitePath = sitePath.substr(5).split('#');
    this.publicChatKeys[sitePath[0]] = sitePath[1];
    Chat.mcf[sitePath[0]] = sitePath[0];
  }

  var promises = [];
  var rooms = Object.keys(Chat.mcf);

  for (var i = rooms.length; i--;) {
    if (!this.publicChatKeys[rooms[i]]) {
      promises.push(self.plugins.chatdIntegration.openChat(Chat.mcf[rooms[i]], true));
    }

    delete Chat.mcf[rooms[i]];
  }

  Promise.allSettled(promises).then(function (res) {
    var pub = Object.keys(self.publicChatKeys);
    return Promise.allSettled([res].concat(pub.map(function (pch) {
      return self.plugins.chatdIntegration.openChat(pch, true);
    })));
  }).then(function (res) {
    res = res[0].value.concat(res.slice(1));
    self.logger.info('chats settled...', res);
    self.$conversationsAppInstance = react_dom1.a.render(self.$conversationsApp = react0.a.createElement(_ui_conversations_jsx2__["default"].ConversationsApp, {
      megaChat: self
    }), self.domSectionNode = document.querySelector('.section.conversations'));
    self.onChatsHistoryReady().then(function () {
      var room = self.getCurrentRoom();

      if (room) {
        room.scrollToChat();
      }

      return room;
    }).dump('on-chat-history-loaded');
    self.is_initialized = true;
    mBroadcaster.sendMessage('chat_initialized');
    self.registerUploadListeners();
    self.trigger("onInit");
    return true;
  }).then(resolve).catch(reject);
});

Chat.prototype.loadChatUIFlagsFromConfig = function (val) {
  var self = this;
  var flags = val || mega.config.get("cUIF");

  if (flags) {
    if (typeof flags !== 'object') {
      flags = {};
    }

    try {
      Object.keys(CHATUIFLAGS_MAPPING).forEach(function (k) {
        var v = flags[CHATUIFLAGS_MAPPING[k]];

        if (v) {
          self.chatUIFlags.set(k, v);
        }
      });
    } catch (e) {
      console.warn("Failed to parse persisted chatUIFlags: ", e);
    }
  }
};

Chat.prototype.initChatUIFlagsManagement = function () {
  var self = this;
  self.loadChatUIFlagsFromConfig();
  this.chatUIFlags.addChangeListener(function (hashmap, extraArg) {
    var flags = mega.config.get("cUIF") || {};
    var hadChanged = false;
    var hadLocalChanged = false;
    Object.keys(CHATUIFLAGS_MAPPING).forEach(function (k) {
      if (flags[CHATUIFLAGS_MAPPING[k]] !== self.chatUIFlags[k]) {
        if (extraArg === 0xDEAD) {
          self.chatUIFlags._data[k] = flags[CHATUIFLAGS_MAPPING[k]];
          hadLocalChanged = true;
        } else {
          flags[CHATUIFLAGS_MAPPING[k]] = self.chatUIFlags[k];
          hadChanged = true;
        }
      }
    });

    if (hadLocalChanged) {
      if (extraArg !== 0xDEAD) {
        self.chatUIFlags.trackDataChange(0xDEAD);
      }

      $.tresizer();
    }

    if (extraArg === 0xDEAD) {
      return;
    }

    if (hadChanged) {
      mega.config.set("cUIF", flags);
    }
  });
  mBroadcaster.addListener('fmconfig:cUIF', function (v) {
    self.loadChatUIFlagsFromConfig(v);
    self.chatUIFlags.trackDataChange(0xDEAD);
  });
};

Chat.prototype.unregisterUploadListeners = function (destroy) {
  'use strict';

  var self = this;
  mBroadcaster.removeListener(self._uplDone);
  mBroadcaster.removeListener(self._uplError);
  mBroadcaster.removeListener(self._uplAbort);
  mBroadcaster.removeListener(self._uplFAError);
  mBroadcaster.removeListener(self._uplFAReady);

  if (destroy) {
    mBroadcaster.removeListener(self._uplStart);
  }

  delete self._uplError;
};

Chat.prototype.registerUploadListeners = function () {
  'use strict';

  var self = this;
  var logger = d && MegaLogger.getLogger('chatUploadListener', false, self.logger);
  self.unregisterUploadListeners(true);

  var forEachChat = function forEachChat(chats, callback) {
    var result = 0;

    if (!Array.isArray(chats)) {
      chats = [chats];
    }

    for (var i = chats.length; i--;) {
      var room = self.getRoomFromUrlHash(chats[i]);

      if (room) {
        callback(room, ++result);
      }
    }

    return result;
  };

  var lookupPendingUpload = function lookupPendingUpload(id) {
    console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');

    for (var uid in ulmanager.ulEventData) {
      if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
        return uid;
      }
    }
  };

  var unregisterListeners = function unregisterListeners() {
    if (!$.len(ulmanager.ulEventData)) {
      self.unregisterUploadListeners();
    }
  };

  var onUploadComplete = function onUploadComplete(ul) {
    if (ulmanager.ulEventData[ul && ul.uid]) {
      forEachChat(ul.chat, function (room) {
        if (d) {
          logger.debug('Attaching node[%s] to chat room[%s]...', ul.h, room.chatId, ul.uid, ul, M.d[ul.h]);
        }

        room.attachNodes([ul.h]);
      });
      delete ulmanager.ulEventData[ul.uid];
      unregisterListeners();
    }
  };

  var onUploadCompletion = function onUploadCompletion(uid, handle, faid, chat) {
    if (!chat) {
      if (d > 1) {
        logger.debug('ignoring upload:completion that is unrelated to chat.', arguments);
      }

      return;
    }

    var n = M.d[handle];
    var ul = ulmanager.ulEventData[uid] || false;

    if (d) {
      logger.debug('upload:completion', uid, handle, faid, ul, n);
    }

    if (!ul || !n) {
      if (d) {
        logger.error('Invalid state error...');
      }
    } else {
      ul.h = handle;

      if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {
        ul.faid = faid;

        if (d) {
          logger.debug('Waiting for file attribute to arrive.', handle, ul);
        }
      } else {
        onUploadComplete(ul);
      }
    }
  };

  var onUploadError = function onUploadError(uid, error) {
    var ul = ulmanager.ulEventData[uid];

    if (d) {
      logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
    }

    if (ul) {
      delete ulmanager.ulEventData[uid];
      unregisterListeners();
    }
  };

  var onAttributeReady = function onAttributeReady(handle, fa) {
    delay('chat:fa-ready:' + handle, function () {
      var uid = lookupPendingUpload(handle);
      var ul = ulmanager.ulEventData[uid] || false;

      if (d) {
        logger.debug('fa:ready', handle, fa, uid, ul);
      }

      if (ul.h && String(fa).split('/').length >= ul.efa) {
        onUploadComplete(ul);
      } else if (d) {
        logger.debug('Not enough file attributes yet, holding...', ul);
      }
    });
  };

  var onAttributeError = function onAttributeError(faid, error, onStorageAPIError, nFAiled) {
    var uid = lookupPendingUpload(faid);
    var ul = ulmanager.ulEventData[uid] || false;

    if (d) {
      logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul, nFAiled, ul.efa);
    }

    if (ul) {
      ul.efa = Math.max(0, ul.efa - nFAiled) | 0;

      if (ul.h) {
        var n = M.d[ul.h] || false;

        if (!ul.efa || n.fa && String(n.fa).split('/').length >= ul.efa) {
          onUploadComplete(ul);
        }
      }
    }
  };

  var registerLocalListeners = function registerLocalListeners() {
    self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
    self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
    self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
    self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
    self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
  };

  self._uplStart = mBroadcaster.addListener('upload:start', function onUploadStart(data) {
    if (d) {
      logger.info('onUploadStart', [data]);
    }

    var notify = function notify(room) {
      room.onUploadStart(data);
    };

    for (var k in data) {
      var chats = data[k].chat;

      if (chats && forEachChat(chats, notify) && !self._uplError) {
        registerLocalListeners();
      }
    }
  });
};

Chat.prototype.getRoomFromUrlHash = function (urlHash) {
  if (urlHash.indexOf("#") === 0) {
    urlHash = urlHash.subtr(1, urlHash.length);
  }

  if (urlHash.indexOf("chat/g/") > -1 || urlHash.indexOf("chat/c/") > -1) {
    var foundRoom = null;
    urlHash = urlHash.replace("chat/g/", "").replace("chat/c/", "");
    megaChat.chats.forEach(function (room) {
      if (!foundRoom && room.chatId === urlHash) {
        foundRoom = room;
      }
    });
    return foundRoom;
  } else if (urlHash.indexOf("chat/p/") > -1) {
    var contactHash = urlHash.replace("chat/p/", "");

    if (!contactHash) {
      return;
    }

    var chatRoom = this.getPrivateRoom(contactHash);
    return chatRoom;
  } else if (urlHash.indexOf("chat/") > -1 && urlHash[13] === "#") {
    var foundRoom = null;
    var pubHandle = urlHash.replace("chat/", "").split("#")[0];
    urlHash = urlHash.replace("chat/g/", "");
    var chatIds = megaChat.chats.keys();

    for (var i = 0; i < chatIds.length; i++) {
      var cid = chatIds[i];
      var room = megaChat.chats[cid];

      if (room.publicChatHandle === pubHandle) {
        foundRoom = room;
        break;
      }
    }

    return foundRoom;
  } else {
    return null;
  }
};

Chat.prototype.updateSectionUnreadCount = SoonFc(function () {
  var self = this;

  if (!self.favico) {
    assert(Favico, 'Favico.js is missing.');
    $('link[rel="icon"]').attr('href', (location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath) + 'favicon.ico');
    self.favico = new Favico({
      type: 'rectangle',
      animation: 'popFade',
      bgColor: '#fff',
      textColor: '#d00'
    });
  }

  var unreadCount = 0;
  var havePendingCall = false;
  self.haveAnyActiveCall() === false && self.chats.forEach(function (megaRoom) {
    if (megaRoom.state == ChatRoom.STATE.LEFT) {
      return;
    }

    if (megaRoom.isArchived()) {
      return;
    }

    var c = parseInt(megaRoom.messagesBuff.getUnreadCount(), 10);
    unreadCount += c;

    if (!havePendingCall) {
      if (megaRoom.havePendingCall() && megaRoom.uniqueCallParts && !megaRoom.uniqueCallParts[u_handle]) {
        havePendingCall = true;
      }
    }
  });
  unreadCount = unreadCount > 9 ? "9+" : unreadCount;
  var haveContents = false;

  if (havePendingCall) {
    haveContents = true;
    $('.new-messages-indicator .chat-pending-call').removeClass('hidden');
    $('.new-messages-indicator .chat-pending-call').removeClass('call-exists');
  } else {
    $('.new-messages-indicator .chat-pending-call').addClass('hidden').removeClass("call-exists");
  }

  if (self._lastUnreadCount != unreadCount) {
    if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
      $('.new-messages-indicator .chat-unread-count').removeClass('hidden').text(unreadCount);
    } else {
      $('.new-messages-indicator .chat-unread-count').addClass('hidden');
    }

    self._lastUnreadCount = unreadCount;
    delay('notifFavicoUpd', function () {
      self.favico.reset();
      self.favico.badge(unreadCount);
    });
    self.updateDashboard();
  }

  if (unreadCount && (unreadCount === "9+" || unreadCount > 0)) {
    haveContents = true;
  }

  if (!haveContents) {
    $('.new-messages-indicator').addClass('hidden');
  } else {
    $('.new-messages-indicator').removeClass('hidden');
  }
}, 100);

Chat.prototype.destroy = function (isLogout) {
  var self = this;

  if (self.is_initialized === false) {
    return;
  }

  self.isLoggingOut = isLogout;

  if (self.rtc && self.rtc.logout) {
    self.rtc.logout();
  }

  self.unregisterUploadListeners(true);
  self.trigger('onDestroy', [isLogout]);

  try {
    if (self.$conversationsAppInstance && react_dom1.a.findDOMNode(self.$conversationsAppInstance) && react_dom1.a.findDOMNode(self.$conversationsAppInstance).parentNode) {
      react_dom1.a.unmountComponentAtNode(react_dom1.a.findDOMNode(self.$conversationsAppInstance).parentNode);
    }
  } catch (e) {
    console.error("Failed do destroy chat dom:", e);
  }

  self.chats.forEach(function (room, roomJid) {
    if (!isLogout) {
      room.destroy(false, true);
    }

    self.chats.remove(roomJid);
  });

  if (self.plugins.chatdIntegration && self.plugins.chatdIntegration.chatd && self.plugins.chatdIntegration.chatd.shards) {
    var shards = self.plugins.chatdIntegration.chatd.shards;
    Object.keys(shards).forEach(function (k) {
      shards[k].connectionRetryManager.options.functions.forceDisconnect();
    });
  }

  self.is_initialized = false;
};

Chat.prototype.getContacts = function () {
  var results = [];
  M.u.forEach(function (k, v) {
    if (v.c == 1 || v.c == 2) {
      results.push(v);
    }
  });
  return results;
};

Chat.prototype.userPresenceToCssClass = function (presence) {
  if (presence === UserPresence.PRESENCE.ONLINE) {
    return 'online';
  } else if (presence === UserPresence.PRESENCE.AWAY) {
    return 'away';
  } else if (presence === UserPresence.PRESENCE.DND) {
    return 'busy';
  } else if (presence === UserPresence.PRESENCE.OFFLINE) {
    return 'offline';
  } else {
    return 'black';
  }
};

Chat.prototype._renderMyStatus = function () {
  var self = this;

  if (!self.is_initialized) {
    return;
  }

  if (typeof megaChat.userPresence === 'undefined') {
    return;
  }

  var $status = $('.activity-status-block .activity-status, .top-menu-popup .avatar-block', 'body');
  $('.top-user-status-popup .tick-item').removeClass("active");
  $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');
  var actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();
  var userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
  var presence = self.plugins.presencedIntegration.getMyPresence();
  var cssClass = PresencedIntegration.presenceToCssClass(presence);

  if (userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED) {
    cssClass = "offline";
  }

  if (actualPresence === UserPresence.PRESENCE.ONLINE) {
    $('.top-user-status-popup .tick-item[data-presence="chat"]').addClass("active");
  } else if (actualPresence === UserPresence.PRESENCE.AWAY) {
    $('.top-user-status-popup .tick-item[data-presence="away"]').addClass("active");
  } else if (actualPresence === UserPresence.PRESENCE.DND) {
    $('.top-user-status-popup .tick-item[data-presence="dnd"]').addClass("active");
  } else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
    $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
  } else {
    $('.top-user-status-popup .tick-item[data-presence="unavailable"]').addClass("active");
  }

  $status.addClass(cssClass);

  if (userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING) {
    $status.parent().addClass("fadeinout");
  } else {
    $status.parent().removeClass("fadeinout");
  }
};

Chat.prototype.renderMyStatus = SoonFc(Chat.prototype._renderMyStatus, 100);

Chat.prototype.reorderContactTree = function () {
  this;
  var folders = M.getContacts({
    'h': 'contacts'
  });
  folders = M.sortContacts(folders);
  var $container = $('#treesub_contacts');
  var $prevNode = null;
  $.each(folders, function (k, v) {
    var $currentNode = $('#treeli_' + v.u);

    if (!$prevNode) {
      var $first = $('li:first:not(#treeli_' + v.u + ')', $container);

      if ($first.length > 0) {
        $currentNode.insertBefore($first);
      } else {
        $container.append($currentNode);
      }
    } else {
      $currentNode.insertAfter($prevNode);
    }

    $prevNode = $currentNode;
  });
};

Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck) {
  var self = this;
  var room = false;
  type = type || "private";
  setAsActive = setAsActive === true;
  var roomId = chatId;

  if (!publicChatKey && chatHandle && self.publicChatKeys[chatHandle]) {
    if (type !== "public") {
      console.error("this should never happen.", type);
      type = "public";
    }

    publicChatKey = self.publicChatKeys[chatHandle];
  }

  var $promise = new MegaPromise();

  if (type === "private") {
    userHandles.forEach(function (user_handle) {
      var contact = M.u[user_handle];

      if (!contact) {
        M.u.set(user_handle, new MegaDataObject(MEGA_USER_STRUCT, {
          'h': user_handle,
          'u': user_handle,
          'm': '',
          'c': 2
        }));
      }
    });
    roomId = array.one(userHandles, u_handle);

    if (!roomId) {
      $promise.reject();
      return $promise;
    }

    if (self.chats[roomId]) {
      $promise.resolve(roomId, self.chats[roomId]);
      return [roomId, self.chats[roomId], $promise];
    }
  } else {
    assert(roomId, 'Tried to create a group chat, without passing the chatId.');
    roomId = chatId;
  }

  if (type === "group" || type === "public") {
    var newUsers = [];

    if (d) {
      console.time('openchat:' + chatId + '.' + type);
    }

    for (var i = userHandles.length; i--;) {
      var contactHash = userHandles[i];

      if (!(contactHash in M.u)) {
        M.u.set(contactHash, new MegaDataObject(MEGA_USER_STRUCT, {
          'h': contactHash,
          'u': contactHash,
          'm': '',
          'c': undefined
        }));

        if (type === "group") {
          M.syncUsersFullname(contactHash);
          M.syncContactEmail(contactHash);
        }

        newUsers.push(contactHash);
      }
    }

    if (newUsers.length) {
      var chats = self.chats._data;

      if (d) {
        console.debug('openchat:%s.%s: processing %s new users...', chatId, type, newUsers.length);
      }

      for (var k in chats) {
        var chatRoom = self.chats[k];
        var participants = array.to.object(chatRoom.getParticipantsExceptMe());

        for (var j = newUsers.length; j--;) {
          var u = newUsers[j];

          if (participants[u]) {
            chatRoom.trackDataChange();
            break;
          }
        }
      }

      self.renderMyStatus();
    }

    if (d) {
      console.timeEnd('openchat:' + chatId + '.' + type);
    }

    if (type === "group") {
      ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle);
    }

    ChatdIntegration._ensureContactExists(userHandles, chatHandle);
  }

  if (self.chats[roomId]) {
    room = self.chats[roomId];

    if (setAsActive) {
      room.show();
    }

    $promise.resolve(roomId, room);
    return [roomId, room, $promise];
  }

  if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat !== roomId) {
    self.hideChat(self.currentlyOpenedChat);
    self.currentlyOpenedChat = null;
  }

  room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl, null, chatHandle, publicChatKey, ck);
  self.chats.set(room.roomId, room);

  if (setAsActive && !self.currentlyOpenedChat || self.currentlyOpenedChat === room.roomId) {
    room.show();
  }

  room.showAfterCreation = setAsActive !== false;
  this.trigger('onRoomInitialized', [room]);
  room.setState(ChatRoom.STATE.JOINING);
  return [roomId, room, MegaPromise.resolve(roomId, self.chats[roomId])];
};

Chat.prototype.smartOpenChat = function () {
  'use strict';

  var self = this;
  var args = toArray.apply(null, arguments);

  if (typeof args[0] === 'string') {
    args[0] = [u_handle, args[0]];

    if (args.length < 2) {
      args.push('private');
    }
  }

  return new MegaPromise(function (resolve, reject) {
    var waitForReadyState = function waitForReadyState(aRoom, aShow) {
      var verify = function verify() {
        return aRoom.state === ChatRoom.STATE.READY;
      };

      var ready = function ready() {
        if (aShow) {
          aRoom.show();
        }

        resolve(aRoom);
      };

      if (verify()) {
        return ready();
      }

      createTimeoutPromise(verify, 300, 3e4).then(ready).catch(reject);
    };

    if (args[0].length === 2 && args[1] === 'private') {
      var chatRoom = self.chats[array.one(args[0], u_handle)];

      if (chatRoom) {
        chatRoom.show();
        return waitForReadyState(chatRoom, args[5]);
      }
    }

    var result = self.openChat.apply(self, args);

    if (result instanceof MegaPromise) {
      result.then(reject).catch(reject);
    } else if (!Array.isArray(result)) {
      reject(EINTERNAL);
    } else {
      var room = result[1];
      var roomId = result[0];
      var promise = result[2];

      if (!(promise instanceof MegaPromise)) {
        self.logger.error('Unexpected openChat() response...');
        return reject(EINTERNAL);
      }

      self.logger.debug('Waiting for chat "%s" to be ready...', roomId, [room]);
      promise.then(function (aRoomId, aRoom) {
        if (aRoomId !== roomId || room && room !== aRoom || !(aRoom instanceof ChatRoom)) {
          self.logger.error('Unexpected openChat() procedure...', aRoomId, [aRoom]);
          return reject(EINTERNAL);
        }

        waitForReadyState(aRoom);
      }).catch(reject);
    }
  });
};

Chat.prototype.hideAllChats = function () {
  var self = this;
  self.chats.forEach(function (chatRoom) {
    if (chatRoom.isCurrentlyActive) {
      chatRoom.hide();
    }
  });
};

Chat.prototype.getCurrentRoom = function () {
  return this.chats[this.currentlyOpenedChat];
};

Chat.prototype.getCurrentRoomJid = function () {
  return this.currentlyOpenedChat;
};

Chat.prototype.hideChat = function (roomJid) {
  var self = this;
  var room = self.chats[roomJid];

  if (room) {
    room.hide();
  } else {
    self.logger.warn("Room not found: ", roomJid);
  }
};

Chat.prototype.sendMessage = function (roomJid, val) {
  var self = this;

  if (!self.chats[roomJid]) {
    self.logger.warn("Queueing message for room: ", roomJid, val);
    createTimeoutPromise(function () {
      return !!self.chats[roomJid];
    }, 500, self.options.delaySendMessageIfRoomNotAvailableTimeout).done(function () {
      self.chats[roomJid].sendMessage(val);
    });
  } else {
    self.chats[roomJid].sendMessage(val);
  }
};

Chat.prototype.processNewUser = function (u, isNewChat) {
  var self = this;

  if (self.plugins.presencedIntegration) {
    var user = M.u[u] || false;

    if (user.c === 1) {
      self.plugins.presencedIntegration.addContact(u, isNewChat);
    }
  }

  self.chats.forEach(function (chatRoom) {
    if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
      chatRoom.trackDataChange();
    }
  });
  self.renderMyStatus();
};

Chat.prototype.processRemovedUser = function (u) {
  var self = this;

  if (self.plugins.presencedIntegration) {
    self.plugins.presencedIntegration.removeContact(u);
  }

  self.chats.forEach(function (chatRoom) {
    if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
      chatRoom.trackDataChange();
    }
  });
  self.renderMyStatus();
};

Chat.prototype.refreshConversations = function () {
  var self = this;

  if (!u_type && !self.$container && !megaChatIsReady) {
    $('.fm-chat-block').hide();
    return false;
  }

  $('.section.conversations .fm-chat-is-loading').addClass('hidden');

  if (self.$container.parent('.section.conversations .fm-right-files-block').length == 0) {
    $('.section.conversations .fm-right-files-block').append(self.$container);
  }

  self.$leftPane = self.$leftPane || $('.conversationsApp .fm-left-panel');

  if (anonymouschat) {
    self.$leftPane.addClass('hidden');
  } else {
    self.$leftPane.removeClass('hidden');
  }
};

Chat.prototype.closeChatPopups = function () {
  var activePopup = $('.chat-popup.active');
  var activeButton = $('.chat-button.active');
  activeButton.removeClass('active');
  activePopup.removeClass('active');

  if (activePopup.attr('class')) {
    activeButton.removeClass('active');
    activePopup.removeClass('active');

    if (activePopup.attr('class').indexOf('fm-add-contact-popup') === -1 && activePopup.attr('class').indexOf('fm-start-call-popup') === -1) {
      activePopup.css('left', "-10000px");
    } else activePopup.css('right', "-10000px");
  }
};

Chat.prototype.getChatNum = function (idx) {
  return this.chats[this.chats.keys()[idx]];
};

Chat.prototype.navigate = promisify(function megaChatNavigate(resolve, reject, location, event) {
  var _this = this;

  if (!M.chat) {
    console.error('This function is meant to navigate within the chat...');
    return;
  }

  var target = String(location || '').split('/').map(String.trim).filter(String);

  if (target[0] === 'fm') {
    target.shift();
  }

  if (target[0] === 'chat') {
    target.shift();
  }

  if (d) {
    this.logger.warn('navigate(%s)', location, target);
  }

  var type = target[0];

  if (!type) {
    var self = this;
    this.onChatsHistoryReady(15e3).then(function () {
      return page === location ? self.renderListing() : EACCESS;
    }).then(resolve).catch(reject);
    resolve = null;
  } else if (this.displayArchivedChats = type === 'archived') {
    this.hideAllChats();
    delete this.lastOpenedChat;
  } else {
    var roomId = target[(type === 'c' || type === 'g' || type === 'p') | 0];

    if (roomId.indexOf('#') > 0) {
      var key = roomId.split('#');
      roomId = key[0];
      key = key[1];
      this.publicChatKeys[roomId] = key;
      roomId = this.handleToId[roomId] || roomId;
    }

    var room = this.getChatById(roomId);

    if (room) {
      room.show();
      location = room.getRoomUrl();
    } else if (type === 'p') {
      megaChat.smartOpenChat([u_handle, roomId], 'private', undefined, undefined, undefined, true).then(resolve).catch(reject);
      resolve = null;
    } else {
      var done = resolve;
      megaChat.plugins.chatdIntegration.openChat(roomId).then(function (chatId) {
        _this.getChatById(chatId).show();

        done(chatId);
      }).catch(function (ex) {
        if (d && ex !== ENOENT) {
          console.warn('If "%s" is a chat, something went wrong..', roomId, ex);
        }

        if (ex === ENOENT && _this.publicChatKeys[roomId]) {
          msgDialog('warninga', l[20641], l[20642], 0, function () {
            loadSubPage(anonymouschat ? 'start' : 'fm/chat', event);
          });
        } else {
          if (String(location).startsWith('chat')) {
            location = location === 'chat' ? 'fm' : 'chat';
          }

          M.currentdirid = M.chat = page = false;
          loadSubPage(location, event);
        }

        done(EACCESS);
      });
      resolve = null;
    }
  }

  if (resolve) {
    onIdle(resolve);
  }

  this.safeForceUpdate();
  var method = page === 'chat' || page === 'fm/chat' || page === location || event && event.type === 'popstate' ? 'replaceState' : 'pushState';
  M.currentdirid = String(page = location).replace('fm/', '');
  history[method]({
    subpage: location
  }, "", (hashLogic ? '#' : '/') + location);
});

if (is_mobile) {
  Chat.prototype.navigate = function (location, event) {
    if (d) {
      this.logger.warn('mobile-nop navigate(%s)', location);
    }

    if (anonymouschat) {
      parsepage(pages.mobile);
      mobile.chatlink.show(pchandle, getSitePath().split('#').pop());
    } else {
      loadSubPage('fm', event);
    }

    return Promise.resolve();
  };
}

Chat.prototype.renderListing = promisify(function megaChatRenderListing(resolve, reject, location) {
  if (!M.chat) {
    console.debug('renderListing: Not in chat.');
    return reject(EACCESS);
  }

  M.hideEmptyGrids();
  this.refreshConversations();
  this.hideAllChats();
  $('.files-grid-view').addClass('hidden');
  $('.fm-blocks-view').addClass('hidden');
  $('.contacts-grid-view').addClass('hidden');
  $('.fm-chat-block').addClass('hidden');
  $('.fm-contacts-blocks-view').addClass('hidden');
  $('.fm-right-files-block').addClass('hidden');
  $('.fm-right-files-block.in-chat').removeClass('hidden');
  $('.nw-conversations-item').removeClass('selected');
  $('.fm-empty-conversations').removeClass('hidden');
  M.onSectionUIOpen('conversations');

  if (!location && this.chats.length) {
    var valid = function valid(room) {
      return room && room._leaving !== true && room.isDisplayable() && room;
    };

    var room = valid(this.chats[this.lastOpenedChat]);

    if (!room) {
      var idx = 0;
      var rooms = Object.values(this.chats.toJS());
      rooms.sort(M.sortObjFn("lastActivity", -1));

      do {
        room = valid(rooms[idx]);
      } while (!room && ++idx < rooms.length);
    }

    if (room) {
      location = room.getRoomUrl();
    }
  }

  if (location) {
    $('.fm-empty-conversations').addClass('hidden');
    return this.navigate(location).then(resolve).catch(reject);
  }

  resolve(ENOENT);
});

Chat.prototype.setAttachments = function (roomId) {
  'use strict';

  if (M.chat) {
    if (d) {
      console.assert(this.chats[roomId] && this.chats[roomId].isCurrentlyActive, 'check this...');
    }

    M.v = Object.values(M.chc[roomId] || {});

    if (M.v.length) {
      M.v.sort(M.sortObjFn('co'));

      for (var i = M.v.length; i--;) {
        var n = M.v[i];

        if (!n.revoked && !n.seen) {
          n.seen = -1;

          if (String(n.fa).indexOf(':1*') > 0) {
            this._enqueueImageLoad(n);
          }
        }
      }
    }
  } else if (d) {
    console.warn('Not in chat...');
  }
};

Chat.prototype._enqueueMessageUpdate = function (message) {
  var _this2 = this;

  this._queuedMessageUpdates.push(message);

  delay('chat:enqueue-message-updates', function () {
    var queue = _this2._queuedMessageUpdates;
    _this2._queuedMessageUpdates = [];

    for (var i = queue.length; i--;) {
      queue[i].trackDataChange();
    }
  }, 400);
};

Chat.prototype._enqueueImageLoad = function (n) {
  'use strict';

  var cc = previews[n.h] || previews[n.hash];

  if (cc) {
    if (cc.poster) {
      n.src = cc.poster;
    } else {
      if (cc.full && n.mime !== 'image/png' && n.mime !== 'image/webp') {
        cc = cc.prev || false;
      }

      if (String(cc.type).startsWith('image/')) {
        n.src = cc.src;
      }
    }
  }

  var cached = n.src;

  if (String(n.fa).indexOf(':1*') > 0) {
    var load = false;
    var dedup = true;

    if (this._imageAttributeCache[n.fa]) {
      this._imageAttributeCache[n.fa].push(n.ch);
    } else {
      this._imageAttributeCache[n.fa] = [n.ch];
      load = !cached;
    }

    if (this._imageLoadCache[n.h]) {
      this._imageLoadCache[n.h].push(n.ch);
    } else {
      this._imageLoadCache[n.h] = [n.ch];

      if (load) {
        this._imagesToBeLoaded[n.h] = n;
        dedup = false;
      }
    }

    if (dedup) {
      cached = true;
    } else {
      delay('chat:enqueue-image-load', this._doLoadImages.bind(this), 350);
    }
  }

  if (cached) {
    this._doneLoadingImage(n.h);
  }
};

Chat.prototype._doLoadImages = function () {
  "use strict";

  var self = this;
  var imagesToBeLoaded = self._imagesToBeLoaded;
  self._imagesToBeLoaded = Object.create(null);

  var chatImageParser = function chatImageParser(h, data) {
    var n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;

    if (data !== 0xDEAD) {
      n.src = mObjectURL([data.buffer || data], 'image/jpeg');
      n.srcBuffer = data;
    } else if (d) {
      console.warn('Failed to load image for %s', h, n);
    }

    self._doneLoadingImage(h);
  };

  api_getfileattr(imagesToBeLoaded, 1, function onSuccess(ctx, origNodeHandle, data) {
    chatImageParser(origNodeHandle, data);
  }, function onError(origNodeHandle) {
    chatImageParser(origNodeHandle, 0xDEAD);
  });
  [imagesToBeLoaded].forEach(function (obj) {
    Object.keys(obj).forEach(function (handle) {
      self._startedLoadingImage(handle);
    });
  });
};

Chat.prototype._getImageNodes = function (h, src) {
  var nodes = this._imageLoadCache[h] || [];
  var handles = [].concat(nodes);

  for (var i = nodes.length; i--;) {
    var n = M.chd[nodes[i]] || false;

    if (this._imageAttributeCache[n.fa]) {
      handles = handles.concat(this._imageAttributeCache[n.fa]);
    }
  }

  handles = array.unique(handles);
  nodes = handles.map(function (ch) {
    var n = M.chd[ch] || false;

    if (src && n.src) {
      Object.assign(src, n);
    }

    return n;
  });
  return nodes;
};

Chat.prototype._startedLoadingImage = function (h) {
  "use strict";

  var nodes = this._getImageNodes(h);

  for (var i = nodes.length; i--;) {
    var n = nodes[i];

    if (!n.src && n.seen !== 2) {
      var imgNode = document.getElementById(n.ch);

      if (imgNode && (imgNode = imgNode.querySelector('img'))) {
        imgNode.parentNode.parentNode.classList.add('thumb-loading');
      }
    }
  }
};

Chat.prototype._doneLoadingImage = function (h) {
  var self = this;

  var setSource = function setSource(n, img, src) {
    var message = n.mo;

    img.onload = function () {
      img.onload = null;
      n.srcWidth = this.naturalWidth;
      n.srcHeight = this.naturalHeight;

      if (message) {
        self._enqueueMessageUpdate(message);
      }
    };

    img.setAttribute('src', src);
  };

  var root = {};

  var nodes = this._getImageNodes(h, root);

  var src = root.src;

  for (var i = nodes.length; i--;) {
    var n = nodes[i];
    var imgNode = document.getElementById(n.ch);

    if (imgNode && (imgNode = imgNode.querySelector('img'))) {
      var parent = imgNode.parentNode;
      var container = parent.parentNode;

      if (src) {
        container.classList.add('thumb');
        parent.classList.remove('no-thumb');
      } else {
        container.classList.add('thumb-failed');
      }

      n.seen = 2;
      container.classList.remove('thumb-loading');
      setSource(n, imgNode, src || window.noThumbURI || '');
    }

    if (src) {
      n.src = src;

      if (root.srcBuffer && root.srcBuffer.byteLength) {
        n.srcBuffer = root.srcBuffer;
      }

      if (n.srcBuffer && !previews[n.h] && is_image3(n)) {
        preqs[n.h] = 1;
        previewimg(n.h, n.srcBuffer, 'image/jpeg');
        previews[n.h].fromChat = Date.now();
      }
    }

    delete n.mo;
  }
};

Chat.prototype.onChatsHistoryReady = promisify(function (resolve, reject, timeout) {
  var _this3 = this;

  if (this.allChatsHadInitialLoadedHistory()) {
    return resolve();
  }

  var timer = null;
  var chatd = this.plugins.chatdIntegration.chatd;
  var eventName = 'onMessagesHistoryDone.ochr' + makeid(16);

  var ready = function ready() {
    onIdle(resolve);
    clearTimeout(timer);
    chatd.off(eventName);
  };

  chatd.on(eventName, function () {
    if (_this3.allChatsHadInitialLoadedHistory()) {
      ready();
    }
  });

  if (timeout > 0) {
    timer = setTimeout(ready, timeout);
  }
});

Chat.prototype.allChatsHadLoadedHistory = function () {
  var chatIds = this.chats.keys();

  for (var i = chatIds.length; i--;) {
    var room = this.chats[chatIds[i]];

    if (room.isLoading()) {
      return false;
    }
  }

  return true;
};

Chat.prototype.allChatsHadInitialLoadedHistory = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = chatIds.length; i--;) {
    var room = self.chats[chatIds[i]];

    if (room.initialMessageHistLoaded === false) {
      return false;
    }
  }

  return true;
};

Chat.prototype.getPrivateRoom = function (h) {
  'use strict';

  return this.chats[h] || false;
};

Chat.prototype.createAndShowPrivateRoom = promisify(function (resolve, reject, h) {
  var _this4 = this;

  M.openFolder('chat/p/' + h).then(function () {
    var room = _this4.getPrivateRoom(h);

    assert(room, 'room not found..');
    resolve(room);
  }).catch(reject);
});

Chat.prototype.createAndShowGroupRoomFor = function (contactHashes, topic, keyRotation, createChatLink) {
  this.trigger('onNewGroupChatRequest', [contactHashes, {
    'topic': topic || "",
    'keyRotation': keyRotation,
    'createChatLink': createChatLink
  }]);
};

Chat.prototype._destroyAllChatsFromChatd = function () {
  this;
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).done(function (r) {
    r.c.forEach(function (chatRoomMeta) {
      if (chatRoomMeta.g === 1) {
        chatRoomMeta.u.forEach(function (u) {
          if (u.u !== u_handle) {
            api_req({
              a: 'mcr',
              id: chatRoomMeta.id,
              u: u.u,
              v: Chatd.VERSION
            });
          }
        });
        api_req({
          a: 'mcr',
          id: chatRoomMeta.id,
          u: u_handle,
          v: Chatd.VERSION
        });
      }
    });
  });
};

Chat.prototype._leaveAllGroupChats = function () {
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).done(function (r) {
    r.c.forEach(function (chatRoomMeta) {
      if (chatRoomMeta.g === 1) {
        asyncApiReq({
          "a": "mcr",
          "id": chatRoomMeta.id,
          "v": Chatd.VERSION
        });
      }
    });
  });
};

Chat.prototype.updateDashboard = function () {
  if (M.currentdirid === 'dashboard') {
    delay('dashboard:updchat', dashboardUI.updateChatWidget);
  }
};

Chat.prototype.getEmojiDataSet = function (name) {
  var self = this;
  assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");

  if (!self._emojiDataLoading) {
    self._emojiDataLoading = {};
  }

  if (!self._emojiData) {
    self._emojiData = {};
  }

  if (self._emojiData[name]) {
    return MegaPromise.resolve(self._emojiData[name]);
  } else if (self._emojiDataLoading[name]) {
    return self._emojiDataLoading[name];
  } else if (name === "categories") {
    self._emojiData[name] = ["symbols", "activity", "objects", "nature", "food", "people", "travel", "flags"];
    return MegaPromise.resolve(self._emojiData[name]);
  } else {
    var promise = new MegaPromise();
    self._emojiDataLoading[name] = promise;
    M.xhr({
      type: 'json',
      url: staticpath + "js/chat/emojidata/" + name + "_v" + EMOJI_DATASET_VERSION + ".json"
    }).then(function (ev, data) {
      self._emojiData[name] = data;
      delete self._emojiDataLoading[name];
      promise.resolve(data);
    }).catch(function (ev, error) {
      if (d) {
        self.logger.warn('Failed to load emoji data "%s": %s', name, error, [ev]);
      }

      delete self._emojiDataLoading[name];
      promise.reject(error);
    });
    return promise;
  }
};

Chat.prototype.isValidEmojiSlug = function (slug) {
  var self = this;
  var emojiData = self._emojiData['emojis'];

  if (!emojiData) {
    self.getEmojiDataSet('emojis');
    return false;
  }

  for (var i = 0; i < emojiData.length; i++) {
    if (emojiData[i]['n'] === slug) {
      return true;
    }
  }
};

Chat.prototype.getMyPresence = function () {
  if (u_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getMyPresence();
  } else {}
};

Chat.prototype.getPresence = function (user_handle) {
  if (user_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getPresence(user_handle);
  } else {}
};

Chat.prototype.getPresenceAsCssClass = function (user_handle) {
  var presence = this.getPresence(user_handle);
  return this.presenceStringToCssClass(presence);
};

Chat.prototype.presenceStringToCssClass = function (presence) {
  if (presence === UserPresence.PRESENCE.ONLINE) {
    return 'online';
  } else if (presence === UserPresence.PRESENCE.AWAY) {
    return 'away';
  } else if (presence === UserPresence.PRESENCE.DND) {
    return 'busy';
  } else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
    return 'offline';
  } else {
    return 'black';
  }
};

Chat.prototype.generateTempMessageId = function (roomId, messageAndMeta) {
  var messageIdHash = u_handle + roomId;

  if (messageAndMeta) {
    messageIdHash += messageAndMeta;
  }

  return "m" + fastHashFunction(messageIdHash) + "_" + unixtime();
};

Chat.prototype.getChatById = function (chatdId) {
  var self = this;

  if (self.chats[chatdId]) {
    return self.chats[chatdId];
  } else if (self.chatIdToRoomId && self.chatIdToRoomId[chatdId] && self.chats[self.chatIdToRoomId[chatdId]]) {
    return self.chats[self.chatIdToRoomId[chatdId]];
  }

  if (this.chats[this.handleToId[chatdId]]) {
    return this.chats[this.handleToId[chatdId]];
  }

  var found = false;
  self.chats.forEach(function (chatRoom) {
    if (!found && chatRoom.chatId === chatdId) {
      found = chatRoom;
      return false;
    }
  });
  return found;
};

Chat.prototype.haveAnyActiveCall = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = 0; i < chatIds.length; i++) {
    if (self.chats[chatIds[i]].haveActiveCall()) {
      return true;
    }
  }

  return false;
};

Chat.prototype.haveAnyOnHoldCall = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = 0; i < chatIds.length; i++) {
    if (self.chats[chatIds[i]].haveActiveOnHoldCall()) {
      return true;
    }
  }

  return false;
};

Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
  'use strict';

  this.smartOpenChat(user_handle).then(function (room) {
    room.setActive();
    room.trigger('openSendFilesDialog');
  }).catch(this.logger.error.bind(this.logger));
};

Chat.prototype.openChatAndAttachNodes = function (targets, nodes) {
  'use strict';

  var self = this;

  if (d) {
    console.group('Attaching nodes to chat room(s)...', targets, nodes);
  }

  return new MegaPromise(function (resolve, reject) {
    var promises = [];

    var attachNodes = function attachNodes(roomId) {
      return new MegaPromise(function (resolve, reject) {
        self.smartOpenChat(roomId).then(function (room) {
          room.attachNodes(nodes).then(resolve.bind(self, room)).catch(reject);
        }).catch(function (ex) {
          if (d) {
            self.logger.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId, ex);
          }

          reject(ex);
        });
      });
    };

    if (!Array.isArray(targets)) {
      targets = [targets];
    }

    for (var i = targets.length; i--;) {
      promises.push(attachNodes(targets[i]));
    }

    MegaPromise.allDone(promises).unpack(function (result) {
      var room;

      for (var i = result.length; i--;) {
        if (result[i] instanceof ChatRoom) {
          room = result[i];
          break;
        }
      }

      if (room) {
        showToast('send-chat', nodes.length > 1 ? l[17767] : l[17766]);
        var roomUrl = room.getRoomUrl().replace("fm/", "");
        M.openFolder(roomUrl).always(resolve);
      } else {
        if (d) {
          self.logger.warn('openChatAndAttachNodes failed in whole...', result);
        }

        reject(result);
      }

      if (d) {
        console.groupEnd();
      }
    });
  });
};

Chat.prototype.toggleUIFlag = function (name) {
  this.chatUIFlags.set(name, this.chatUIFlags[name] ? 0 : 1);
};

Chat.prototype.onSnActionPacketReceived = function () {
  if (this._queuedMccPackets.length > 0) {
    var aps = this._queuedMccPackets;
    this._queuedMccPackets = [];

    for (var i = 0; i < aps.length; i++) {
      mBroadcaster.sendMessage('onChatdChatUpdatedActionPacket', aps[i]);
    }
  }
};

Chat.prototype.getFrequentContacts = function () {
  if (Chat._frequentsCache) {
    return Chat._frequentsCache;
  }

  var chats = this.chats;
  var recentContacts = {};
  var promises = [];
  var finishedLoadingChats = {};
  var loadingMoreChats = {};

  var _calculateLastTsFor = function _calculateLastTsFor(r, maxMessages) {
    var mb = r.messagesBuff;
    var len = mb.messages.length;
    var msgs = mb.messages.slice(Math.max(0, len - maxMessages), len);

    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      var contactHandle = msg.userId === "gTxFhlOd_LQ" && msg.meta ? msg.meta.userId : msg.userId;

      if (r.type === "private" && contactHandle === u_handle) {
        contactHandle = contactHandle || r.getParticipantsExceptMe()[0];
      }

      if (contactHandle !== "gTxFhlOd_LQ" && M.u[contactHandle] && M.u[contactHandle].c === 1 && contactHandle !== u_handle) {
        if (!recentContacts[contactHandle] || recentContacts[contactHandle].ts < msg.delay) {
          recentContacts[contactHandle] = {
            'userId': contactHandle,
            'ts': msg.delay
          };
        }
      }
    }
  };

  var _histDecryptedCb = function _histDecryptedCb() {
    var mb = this.messagesBuff;

    if (!loadingMoreChats[this.chatId] && mb.messages.length < 32 && mb.haveMoreHistory()) {
      loadingMoreChats[this.chatId] = true;
      mb.retrieveChatHistory(false);
    } else {
      this.unbind(CHAT_ONHISTDECR_RECNT);

      _calculateLastTsFor(this, 32);

      delete loadingMoreChats[this.chatId];
      finishedLoadingChats[this.chatId] = true;
      mb.detachMessages();
    }
  };

  var _checkFinished = function _checkFinished(chatId) {
    return function () {
      return finishedLoadingChats[chatId] === true;
    };
  };

  chats.forEach(function (chatRoom) {
    if (chatRoom.isLoading()) {
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 10000));
    } else if (chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
      loadingMoreChats[chatRoom.chatId] = true;
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.messagesBuff.retrieveChatHistory(false);
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 15000));
    } else {
      _calculateLastTsFor(chatRoom, 32);
    }
  });
  var masterPromise = new MegaPromise();
  MegaPromise.allDone(promises).always(function () {
    var result = obj_values(recentContacts).sort(function (a, b) {
      return a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0;
    });
    masterPromise.resolve(result.reverse());
  });
  Chat._frequentsCache = masterPromise;
  masterPromise.always(function () {
    if (Chat._frequentsCacheTimer) {
      clearTimeout(Chat._frequentsCacheTimer);
    }

    Chat._frequentsCacheTimer = setTimeout(function () {
      delete Chat._frequentsCache;
    }, 300000);
  });
  return masterPromise;
};

Chat.prototype.eventuallyAddDldTicketToReq = function (req) {
  if (!u_handle) {
    return;
  }

  var currentRoom = this.getCurrentRoom();

  if (currentRoom && currentRoom.type == "public" && currentRoom.publicChatHandle && (anonymouschat || currentRoom.membersSetFromApi && !currentRoom.membersSetFromApi.members[u_handle])) {
    req['cauth'] = currentRoom.publicChatHandle;
  }
};

Chat.prototype.safeForceUpdate = SoonFc(60, function forceAppUpdate() {
  if (this.$conversationsAppInstance) {
    this.$conversationsAppInstance.forceUpdate();
  }
});

Chat.prototype.loginOrRegisterBeforeJoining = function (chatHandle, forceRegister, forceLogin, notJoinReq) {
  if (!chatHandle && (page === 'chat' || page.indexOf('chat') > -1)) {
    chatHandle = getSitePath().split("chat/")[1].split("#")[0];
  }

  assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');
  var chatKey = "#" + window.location.hash.split("#").pop();

  var finish = function finish(stay) {
    if (!notJoinReq) {
      localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
    }

    if (!stay) {
      window.location.reload();
    }

    return stay;
  };

  var doShowLoginDialog = function doShowLoginDialog() {
    mega.ui.showLoginRequiredDialog({
      minUserType: 3,
      skipInitialDialog: 1
    }).done(function () {
      if (page !== 'login') {
        finish();
      }
    });
  };

  var doShowRegisterDialog = function doShowRegisterDialog() {
    mega.ui.showRegisterDialog({
      title: l[5840],
      onCreatingAccount: function onCreatingAccount() {},
      onLoginAttemptFailed: function onLoginAttemptFailed() {
        msgDialog('warninga:' + l[171], l[1578], l[218], null, function (e) {
          if (e) {
            $('.pro-register-dialog').addClass('hidden');

            if (signupPromptDialog) {
              signupPromptDialog.hide();
            }

            doShowLoginDialog();
          }
        });
      },
      onAccountCreated: function onAccountCreated(gotLoggedIn, registerData) {
        if (finish(!gotLoggedIn)) {
          security.register.cacheRegistrationData(registerData);
          mega.ui.sendSignupLinkDialog(registerData);
          megaChat.destroy();
        }
      }
    });
  };

  if (u_handle && u_handle !== "AAAAAAAAAAA") {
    return finish();
  }

  if (forceRegister) {
    return doShowRegisterDialog();
  } else if (forceLogin) {
    return doShowLoginDialog();
  }

  if (u_wasloggedin()) {
    doShowLoginDialog();
  } else {
    doShowRegisterDialog();
  }
};

window.Chat = Chat;

if (false) {}

__webpack_exports__["default"] = ({
  Chat: Chat
});

/***/ }),

/***/ (function(module, exports) {

(function () {
  var ChatGlobalEventManager = function ChatGlobalEventManager() {};

  lazy(ChatGlobalEventManager.prototype, 'listeners', function () {
    var _this = this;

    window.addEventListener('hashchange', function (ev) {
      return _this.triggered(ev);
    });
    $(window).rebind('resize.chatGlobalEventManager', function (ev) {
      return _this.triggered(ev);
    });
    var listeners = Object.create(null);
    listeners.resize = Object.create(null);
    listeners.hashchange = Object.create(null);
    return listeners;
  });

  ChatGlobalEventManager.prototype.addEventListener = function (eventName, namespace, cb) {
    this.listeners[eventName][namespace] = this.listeners[namespace] || cb;
  };

  ChatGlobalEventManager.prototype.removeEventListener = function (eventName, namespace) {
    delete this.listeners[eventName][namespace];
  };

  ChatGlobalEventManager.prototype.triggered = SoonFc(140, function _chatEVDispatcher(ev) {
    if (M.chat) {
      var listeners = this.listeners[ev.type];

      for (var k in listeners) {
        listeners[k](ev);
      }
    }
  });
  window.chatGlobalEventManager = new ChatGlobalEventManager();
})();

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var utils = __webpack_require__(24);

var React = __webpack_require__(0);

var ConversationPanelUI = __webpack_require__(18);

var ChatRoom = function ChatRoom(megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI, publicChatHandle, publicChatKey, ck) {
  var self = this;
  this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);
  this.megaChat = megaChat;
  MegaDataObject.call(this, {
    state: null,
    users: [],
    roomId: null,
    type: null,
    messages: [],
    ctime: 0,
    lastActivity: 0,
    callRequest: null,
    isCurrentlyActive: false,
    _messagesQueue: [],
    unreadCount: 0,
    chatId: undefined,
    chatdUrl: undefined,
    chatShard: undefined,
    members: {},
    membersSet: false,
    membersLoaded: false,
    topic: "",
    flags: 0x00,
    publicLink: null,
    archivedSelected: false,
    showArchived: false,
    observers: 0
  });
  this.roomId = roomId;
  this.instanceIndex = ChatRoom.INSTANCE_INDEX++;
  this.type = type;
  this.ctime = ctime;
  this.lastActivity = lastActivity ? lastActivity : 0;
  this.chatd = megaChat.plugins.chatdIntegration.chatd;
  this.chatId = chatId;
  this.chatIdBin = chatId ? base64urldecode(chatId) : "";
  this.chatShard = chatShard;
  this.chatdUrl = chatdUrl;
  this.publicChatHandle = publicChatHandle;
  this.publicChatKey = publicChatKey;
  this.ck = ck;
  this.scrolledToBottom = 1;
  this.callRequest = null;
  this.shownMessages = {};
  this.activeSearches = 0;
  self.members = {};

  if (type === "private") {
    users.forEach(function (userHandle) {
      self.members[userHandle] = 3;
    });
  } else {
    users.forEach(function (userHandle) {
      self.members[userHandle] = 0;
    });
  }

  this.options = {
    'dontResendAutomaticallyQueuedMessagesOlderThen': 60,
    'pluginsReadyTimeout': 60000,
    'mediaOptions': {
      audio: true,
      video: true
    }
  };
  this.setState(ChatRoom.STATE.INITIALIZED);
  this.isCurrentlyActive = false;

  if (d) {
    this.rebind('onStateChange.chatRoomDebug', function (e, oldState, newState) {
      self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));
    });
  }

  self.rebind('onStateChange.chatRoom', function (e, oldState, newState) {
    if (newState === ChatRoom.STATE.READY && !self.isReadOnly() && self.chatd && self.isOnline() && self.chatIdBin) {
      var cim = self.getChatIdMessages();
      cim.restore();
      cim.resend();
    }
  });
  self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
    if (anonymouschat) {
      return;
    }

    var ts = msg.delay ? msg.delay : msg.ts;

    if (!ts) {
      return;
    }

    var contactForMessage = msg && Message.getContactForMessage(msg);

    if (contactForMessage && contactForMessage.u !== u_handle) {
      if (!contactForMessage.ats || contactForMessage.ats < ts) {
        contactForMessage.ats = ts;
      }
    }

    if (self.lastActivity && self.lastActivity >= ts) {
      return;
    }

    self.lastActivity = ts;

    if (msg.userId === u_handle) {
      self.didInteraction(u_handle, ts);
      return;
    }

    if (self.type === "private") {
      var targetUserId = self.getParticipantsExceptMe()[0];
      var targetUserNode;

      if (M.u[targetUserId]) {
        targetUserNode = M.u[targetUserId];
      } else if (msg.userId) {
        targetUserNode = M.u[msg.userId];
      } else {
        console.error("Missing participant in a 1on1 room.");
        return;
      }

      assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
      assert(M.u[targetUserNode.u], 'User not found in M.u');

      if (targetUserNode) {
        self.didInteraction(targetUserNode.u, self.lastActivity);
      }
    } else if (self.type === "group" || self.type === "public") {
      var contactHash;

      if (msg.authorContact) {
        contactHash = msg.authorContact.u;
      } else if (msg.userId) {
        contactHash = msg.userId;
      }

      if (contactHash && M.u[contactHash]) {
        self.didInteraction(contactHash, self.lastActivity);
      }

      assert(contactHash, 'Invalid hash for user (extracted from inc. message)');
    } else {
      throw new Error("Not implemented");
    }
  });
  self.rebind('onMembersUpdated.coreRoomDataMngmt', function (e, eventData) {
    if (self.state === ChatRoom.STATE.LEFT && eventData.priv >= 0 && eventData.priv < 255) {
      self.membersLoaded = false;
      self.setState(ChatRoom.STATE.JOINING, true);
    }

    var queuedMembersUpdatedEvent = false;

    if (self.membersLoaded === false) {
      if (eventData.priv >= 0 && eventData.priv < 255) {
        var addParticipant = function addParticipant() {
          self.protocolHandler.addParticipant(eventData.userId);
          self.members[eventData.userId] = eventData.priv;

          ChatdIntegration._ensureContactExists([eventData.userId]);

          self.trigger('onMembersUpdatedUI', eventData);
        };

        ChatdIntegration._waitForProtocolHandler(self, addParticipant);

        queuedMembersUpdatedEvent = true;
      }
    } else if (eventData.priv === 255 || eventData.priv === -1) {
      var deleteParticipant = function deleteParticipant() {
        if (eventData.userId === u_handle) {
          Object.keys(self.members).forEach(function (userId) {
            self.protocolHandler.removeParticipant(userId);
            delete self.members[userId];
          });
        } else {
          self.protocolHandler.removeParticipant(eventData.userId);
          delete self.members[eventData.userId];
        }

        self.trigger('onMembersUpdatedUI', eventData);
      };

      ChatdIntegration._waitForProtocolHandler(self, deleteParticipant);

      queuedMembersUpdatedEvent = true;
    }

    if (eventData.userId === u_handle) {
      self.membersLoaded = true;
    }

    if (!queuedMembersUpdatedEvent) {
      self.members[eventData.userId] = eventData.priv;
      self.trigger('onMembersUpdatedUI', eventData);
    }
  });
  self.rebind('onMembersUpdatedUI.chatRoomMembersSync', function (e, eventData) {
    var roomRequiresUpdate = false;

    if (eventData.userId === u_handle) {
      self.messagesBuff.joined = true;

      if (eventData.priv === 255 || eventData.priv === -1) {
        if (self.state === ChatRoom.STATE.JOINING) {
          self.setState(ChatRoom.STATE.LEFT);
        }
      } else {
        if (self.state === ChatRoom.STATE.JOINING) {
          self.setState(ChatRoom.STATE.READY);
        }
      }

      roomRequiresUpdate = true;
    } else {
      var contact = M.u[eventData.userId];

      if (contact instanceof MegaDataMap) {
        if (eventData.priv === 255 || eventData.priv === -1) {
          if (contact._onMembUpdUIListener) {
            contact.removeChangeListener(contact._onMembUpdUIListener);
            roomRequiresUpdate = true;
          }
        } else if (!contact._onMembUpdUIListener) {
          contact._onMembUpdUIListener = contact.addChangeListener(function () {
            self.trackDataChange.apply(self, arguments);
          });
          roomRequiresUpdate = true;
        }
      }
    }

    if (roomRequiresUpdate) {
      self.trackDataChange();
    }
  });
  self.getParticipantsExceptMe().forEach(function (userHandle) {
    var contact = M.u[userHandle];

    if (contact && contact.c) {
      getLastInteractionWith(contact.u);
    }
  });
  self.megaChat.trigger('onRoomCreated', [self]);

  if (this.type === "public" && self.megaChat.publicChatKeys[self.chatId]) {
    self.publicChatKey = self.megaChat.publicChatKeys[self.chatId];
  }

  $(window).rebind("focus." + self.roomId, function () {
    if (self.isCurrentlyActive) {
      self.trigger("onChatShown");
    }
  });
  self.megaChat.rebind("onRoomDestroy." + self.roomId, function (e, room) {
    if (room.roomId == self.roomId) {
      $(window).off("focus." + self.roomId);
    }
  });
  self.rebind('onClientLeftCall.chatRoom', function () {
    return self.callParticipantsUpdated();
  });
  self.rebind('onClientJoinedCall.chatRoom', function () {
    return self.callParticipantsUpdated();
  });
  self.rebind('onCallParticipantsUpdated.chatRoom', function () {
    return self.callParticipantsUpdated();
  });
  self.initialMessageHistLoaded = false;
  var timer = null;

  var _historyIsAvailable = function _historyIsAvailable(ev) {
    self.initialMessageHistLoaded = ev ? true : -1;
    clearTimeout(timer);
    self.unbind('onMarkAsJoinRequested.initHist');
    self.unbind('onHistoryDecrypted.initHist');
    self.unbind('onMessagesHistoryDone.initHist');
    self.megaChat.safeForceUpdate();
  };

  self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
  self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);
  self.rebind('onMarkAsJoinRequested.initHist', function () {
    timer = setTimeout(function () {
      if (d) {
        console.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
      }

      _historyIsAvailable(false);
    }, 3e5);
  });
  this.membersSetFromApi = new ChatRoom.MembersSet(this);

  if (publicChatHandle) {
    this.onPublicChatRoomInitialized();
  }

  return this;
};

inherits(ChatRoom, MegaDataObject);
ChatRoom.STATE = {
  'INITIALIZED': 5,
  'JOINING': 10,
  'JOINED': 20,
  'READY': 150,
  'ENDED': 190,
  'LEAVING': 200,
  'LEFT': 250
};
ChatRoom.INSTANCE_INDEX = 0;
ChatRoom.ANONYMOUS_PARTICIPANT = 'gTxFhlOd_LQ';
ChatRoom.ARCHIVED = 0x01;

ChatRoom.MembersSet = function (chatRoom) {
  this.chatRoom = chatRoom;
  this.members = {};
};

ChatRoom.MembersSet.PRIVILEGE_STATE = {
  'NOT_AVAILABLE': -5,
  'FULL': 3,
  'OPERATOR': 2,
  'READONLY': 0,
  'LEFT': -1
};

ChatRoom.encryptTopic = function (protocolHandler, newTopic, participants, isPublic) {
  if (isPublic === void 0) {
    isPublic = false;
  }

  if (protocolHandler instanceof strongvelope.ProtocolHandler && participants.size > 0) {
    var topic = protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, isPublic);

    if (topic) {
      return base64urlencode(topic);
    }
  }

  return false;
};

ChatRoom.MembersSet.prototype.trackFromActionPacket = function (ap, isMcf) {
  var self = this;
  var apMembers = {};
  (ap.u || []).forEach(function (r) {
    apMembers[r.u] = r.p;
  });
  Object.keys(self.members).forEach(function (u_h) {
    if (typeof apMembers[u_h] === 'undefined') {
      self.remove(u_h);
    } else if (apMembers[u_h] !== self.members[u_h]) {
      self.update(u_h, apMembers[u_h]);
    }
  });
  Object.keys(apMembers).forEach(function (u_h) {
    if (typeof self.members[u_h] === 'undefined') {
      var priv2 = apMembers[u_h];
      !isMcf ? self.add(u_h, priv2) : self.init(u_h, priv2);
    } else if (apMembers[u_h] !== self.members[u_h]) {
      self.update(u_h, apMembers[u_h]);
    }
  });
};

ChatRoom.MembersSet.prototype.init = function (handle, privilege) {
  this.members[handle] = privilege;
  this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.update = function (handle, privilege) {
  this.members[handle] = privilege;
  this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.add = function (handle, privilege) {
  this.members[handle] = privilege;

  if (handle === u_handle) {
    this.chatRoom.trigger('onMeJoined');
  }

  this.chatRoom.trackDataChange();
};

ChatRoom.MembersSet.prototype.remove = function (handle) {
  delete this.members[handle];

  if (handle === u_handle) {
    this.chatRoom.trigger('onMeLeft');
  }

  this.chatRoom.trackDataChange();
};

ChatRoom.prototype.trackMemberUpdatesFromActionPacket = function (ap, isMcf) {
  if (!ap.u) {
    return;
  }

  if (this.membersSetFromApi) {
    this.membersSetFromApi.trackFromActionPacket(ap, isMcf);
  }
};

ChatRoom.prototype.getCallParticipants = function () {
  var chat = this.getChatIdMessages();

  if (!chat) {
    return [];
  } else {
    return Object.keys(chat.callInfo.participants);
  }
};

ChatRoom.prototype.getChatIdMessages = function () {
  return this.chatd.chatIdMessages[this.chatIdBin];
};

ChatRoom.prototype.isOnline = function () {
  var shard = this.chatd.shards[this.chatShard];
  return shard ? shard.isOnline() : false;
};

ChatRoom.prototype.isOnlineForCalls = function () {
  var chatdChat = this.getChatIdMessages();

  if (!chatdChat) {
    return false;
  }

  return chatdChat.loginState() >= LoginState.HISTDONE;
};

ChatRoom.prototype._retrieveTurnServerFromLoadBalancer = function (timeout) {
  'use strict';

  var self = this;
  var anonId = "";
  var $promise = new MegaPromise();

  if (self.megaChat.rtc && self.megaChat.rtc.ownAnonId) {
    anonId = self.megaChat.rtc.ownAnonId;
  }

  M.xhr({
    timeout: timeout || 10000,
    url: "https://" + self.megaChat.options.loadbalancerService + "/?service=turn&anonid=" + anonId
  }).then(function (ev, r) {
    r = JSON.parse(r);

    if (r.turn && r.turn.length > 0) {
      var servers = [];
      r.turn.forEach(function (v) {
        var transport = v.transport || 'udp';
        servers.push({
          urls: 'turn:' + v.host + ':' + v.port + '?transport=' + transport,
          username: "inoo20jdnH",
          credential: '02nNKDBkkS'
        });
      });
      self.megaChat.rtc.updateIceServers(servers);
    }

    $promise.resolve();
  }).catch(function () {
    $promise.reject.apply($promise, arguments);
  });
  return $promise;
};

ChatRoom.prototype.isArchived = function () {
  var self = this;
  return self.flags & ChatRoom.ARCHIVED;
};

ChatRoom.prototype.isDisplayable = function () {
  var self = this;
  return self.showArchived === true || !self.isArchived() || self.callManagerCall && self.callManagerCall.isActive();
};

ChatRoom.prototype.persistToFmdb = function () {
  var self = this;

  if (fmdb) {
    var users = [];

    if (self.members) {
      Object.keys(self.members).forEach(function (user_handle) {
        users.push({
          u: user_handle,
          p: self.members[user_handle]
        });
      });
    }

    if (self.chatId && self.chatShard !== undefined) {
      var roomInfo = {
        'id': self.chatId,
        'cs': self.chatShard,
        'g': self.type === "group" || self.type === "public" ? 1 : 0,
        'u': users,
        'ts': self.ctime,
        'ct': self.ct,
        'ck': self.ck ? self.ck : null,
        'f': self.flags,
        'm': self.type === "public" ? 1 : 0
      };
      fmdb.add('mcf', {
        id: roomInfo.id,
        d: roomInfo
      });
    }
  }
};

ChatRoom.prototype.updateFlags = function (f, updateUI) {
  var self = this;
  var flagChange = self.flags !== f;
  self.flags = f;
  self.archivedSelected = false;

  if (self.isArchived()) {
    megaChat.archivedChatsCount++;
    self.showArchived = false;
  } else {
    megaChat.archivedChatsCount--;
  }

  self.persistToFmdb();

  if (updateUI && flagChange) {
    if (megaChat.currentlyOpenedChat && megaChat.chats[megaChat.currentlyOpenedChat] && megaChat.chats[megaChat.currentlyOpenedChat].chatId === self.chatId) {
      loadSubPage('fm/chat/');
    } else {
      megaChat.refreshConversations();
    }

    if (megaChat.$conversationsAppInstance) {
      megaChat.safeForceUpdate();
    }
  }

  this.trackDataChange();
};

ChatRoom.stateToText = function (state) {
  var txt = null;
  $.each(ChatRoom.STATE, function (k, v) {
    if (state === v) {
      txt = k;
      return false;
    }
  });
  return txt;
};

ChatRoom.prototype.setState = function (newState, isRecover) {
  var self = this;
  assert(newState, 'Missing state');

  if (newState === self.state) {
    self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
    return;
  }

  if (self.state) {
    assert(newState === ChatRoom.STATE.JOINING && isRecover || newState === ChatRoom.STATE.INITIALIZED && isRecover || newState > self.state, 'Invalid state change. Current:' + ChatRoom.stateToText(self.state) + "to" + ChatRoom.stateToText(newState));
  }

  var oldState = self.state;
  self.state = newState;
  self.trigger('onStateChange', [oldState, newState]);
};

ChatRoom.prototype.getStateAsText = function () {
  var self = this;
  return ChatRoom.stateToText(self.state);
};

ChatRoom.prototype.setType = function (type) {
  var self = this;

  if (!type) {
    if (window.d) {
      debugger;
    }

    self.logger.error("missing type in .setType call");
  }

  self.type = type;
};

ChatRoom.prototype.getParticipants = function () {
  var self = this;
  return Object.keys(self.members);
};

ChatRoom.prototype.getParticipantsExceptMe = function (userHandles) {
  var res = clone(userHandles || this.getParticipants());
  array.remove(res, u_handle, true);
  return res;
};

ChatRoom.prototype.getParticipantsTruncated = function (maxMembers, maxLength) {
  maxMembers = maxMembers || 5;
  maxLength = maxLength || 30;
  var truncatedParticipantNames = [];
  var members = Object.keys(this.members);

  for (var i = 0; i < members.length; i++) {
    var handle = members[i];
    var name = M.getNameByHandle(handle);

    if (!handle || !name || handle === u_handle) {
      continue;
    }

    if (i > maxMembers) {
      break;
    }

    truncatedParticipantNames.push(name.length > maxLength ? name.substr(0, maxLength) + '...' : name);
  }

  if (truncatedParticipantNames.length === maxMembers) {
    truncatedParticipantNames.push('...');
  }

  return truncatedParticipantNames.join(', ');
};

ChatRoom.prototype.getRoomTitle = function (ignoreTopic, encapsTopicInQuotes) {
  var self = this;
  var participants;

  if (self.type === "private") {
    participants = self.getParticipantsExceptMe();
    return M.getNameByHandle(participants[0]) || "";
  } else {
    if (!ignoreTopic && self.topic && self.topic.substr) {
      return (encapsTopicInQuotes ? '"' : "") + self.getTruncatedRoomTopic() + (encapsTopicInQuotes ? '"' : "");
    }

    var names = self.getParticipantsTruncated();

    var def = __(l[19077]).replace('%s1', new Date(self.ctime * 1000).toLocaleString());

    return names.length > 0 ? names : def;
  }
};

ChatRoom.prototype.getTruncatedRoomTopic = function (maxLength) {
  maxLength = maxLength || 30;
  return this.topic && this.topic.length > maxLength ? this.topic.substr(0, maxLength) + '...' : this.topic;
};

ChatRoom.prototype.setRoomTitle = function (newTopic, allowEmpty) {
  var self = this;
  newTopic = allowEmpty ? newTopic : String(newTopic);
  var masterPromise = new MegaPromise();

  if ((allowEmpty || newTopic.trim().length > 0) && newTopic !== self.getRoomTitle()) {
    self.scrolledToBottom = true;
    var participants = self.protocolHandler.getTrackedParticipants();
    var promises = [];
    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

    var _runUpdateTopic = function _runUpdateTopic() {
      var topic = self.protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, self.type === "public");

      if (topic) {
        masterPromise.linkDoneAndFailTo(asyncApiReq({
          "a": "mcst",
          "id": self.chatId,
          "ct": base64urlencode(topic),
          "v": Chatd.VERSION
        }));
      } else {
        masterPromise.reject();
      }
    };

    MegaPromise.allDone(promises).done(function () {
      _runUpdateTopic();
    });
    return masterPromise;
  } else {
    return false;
  }
};

ChatRoom.prototype.leave = function (triggerLeaveRequest) {
  var self = this;
  self._leaving = true;
  self._closing = triggerLeaveRequest;
  self.topic = null;

  if (triggerLeaveRequest) {
    if (self.type === "group" || self.type === "public") {
      self.trigger('onLeaveChatRequested');
    } else {
      self.logger.error("Can't leave room of type: " + self.type);
      return;
    }
  }

  if (self.roomId.indexOf("@") != -1) {
    if (self.state !== ChatRoom.STATE.LEFT) {
      self.setState(ChatRoom.STATE.LEAVING);
      self.setState(ChatRoom.STATE.LEFT);
    } else {}
  } else {
    self.setState(ChatRoom.STATE.LEFT);
  }
};

ChatRoom.prototype.archive = function () {
  var self = this;
  var flags = ChatRoom.ARCHIVED;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': 1,
    'f': flags,
    'v': Chatd.VERSION
  }).done(function (r) {
    if (r === 0) {
      self.updateFlags(flags, true);
    }
  });
};

ChatRoom.prototype.unarchive = function () {
  var self = this;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': 1,
    'f': 0,
    'v': Chatd.VERSION
  }).done(function (r) {
    if (r === 0) {
      self.updateFlags(0, true);
    }
  });
};

ChatRoom.prototype.destroy = function (notifyOtherDevices, noRedirect) {
  var self = this;
  self.megaChat.trigger('onRoomDestroy', [self]);
  var mc = self.megaChat;
  var roomJid = self.roomId;

  if (!self.stateIsLeftOrLeaving()) {
    self.leave(notifyOtherDevices);
  } else if (self.type === "public" && self.publicChatHandle) {
    if (typeof self.members[u_handle] === 'undefined') {
      self.megaChat.plugins.chatdIntegration.handleLeave(self);
    }
  }

  if (self.isCurrentlyActive) {
    self.isCurrentlyActive = false;
  }

  Soon(function () {
    mc.chats.remove(roomJid);

    if (!noRedirect && u_type === 3) {
      loadSubPage('fm/chat');
    }
  });
};

ChatRoom.prototype.updatePublicHandle = function (d, callback) {
  var self = this;
  return megaChat.plugins.chatdIntegration.updateChatPublicHandle(self.chatId, d, callback);
};

ChatRoom.prototype.joinViaPublicHandle = function () {
  var self = this;

  if ((!self.members.hasOwnProperty(u_handle) || self.members[u_handle] === -1) && self.type === "public" && self.publicChatHandle) {
    return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
  }
};

ChatRoom.prototype.switchOffPublicMode = function () {
  var self = this;
  var participants = self.protocolHandler.getTrackedParticipants();
  var promises = [];
  promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

  var onSwitchDone = function onSwitchDone() {
    self.protocolHandler.switchOffOpenMode();
  };

  var _runSwitchOffPublicMode = function _runSwitchOffPublicMode() {
    var topic = null;

    if (self.topic) {
      topic = self.protocolHandler.embeddedEncryptTo(self.topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, true, false);
      topic = base64urlencode(topic);
      asyncApiReq({
        a: 'mcscm',
        id: self.chatId,
        ct: topic,
        v: Chatd.VERSION
      }).done(onSwitchDone);
    } else {
      asyncApiReq({
        a: 'mcscm',
        id: self.chatId,
        v: Chatd.VERSION
      }).done(onSwitchDone);
    }
  };

  MegaPromise.allDone(promises).done(function () {
    _runSwitchOffPublicMode();
  });
};

ChatRoom.prototype.show = function () {
  var self = this;

  if (self.isCurrentlyActive) {
    if (!self.messagesBlockEnabled && self.callManagerCall && self.getUnreadCount() > 0) {
      self.trigger('toggleMessages');
    }

    return false;
  }

  self.megaChat.hideAllChats();

  if (d) {
    self.logger.debug(' ---- show');
  }

  $.tresizer();
  onIdle(function () {
    self.scrollToChat();
    self.trackDataChange();
  });
  self.isCurrentlyActive = true;
  self.lastShownInUI = Date.now();
  self.showArchived = self.isArchived();
  self.megaChat.setAttachments(self.roomId);
  self.megaChat.lastOpenedChat = self.roomId;
  self.megaChat.currentlyOpenedChat = self.roomId;
  self.trigger('activity');
  self.trigger('onChatShown');
  var tmp = self.megaChat.domSectionNode;

  if (self.type === 'public') {
    tmp.classList.remove('privatechat');
  } else {
    tmp.classList.add('privatechat');
  }

  if (tmp = tmp.querySelector('.conversation-panels')) {
    tmp.classList.remove('hidden');

    if (tmp = tmp.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]')) {
      tmp.classList.remove('hidden');
    }
  }

  if (tmp = document.getElementById('conversation_' + self.roomId)) {
    tmp.classList.add('active');
  }
};

ChatRoom.prototype.scrollToChat = function () {
  this._scrollToOnUpdate = true;

  if (megaChat.$chatTreePanePs) {
    var li = document.querySelector('ul.conversations-pane li#conversation_' + this.roomId);

    if (li) {
      var pos = li.offsetTop;

      if (!verge.inViewport(li, -72)) {
        var treePane = document.querySelector('.conversationsApp .fm-tree-panel');
        var wrapOuterHeight = $(treePane).outerHeight();
        var itemOuterHeight = $('li:first', treePane).outerHeight();
        megaChat.$chatTreePanePs.doProgramaticScroll(Math.max(0, pos - wrapOuterHeight / 2 + itemOuterHeight), true);
        this._scrollToOnUpdate = false;
      }
    }
  }
};

ChatRoom.prototype.isActive = function () {
  return document.hasFocus() && this.isCurrentlyActive;
};

ChatRoom.prototype.setActive = function () {
  loadSubPage(this.getRoomUrl());
};

ChatRoom.prototype.isLoading = function () {
  var mb = this.messagesBuff;
  return mb.messagesHistoryIsLoading() || mb.isDecrypting;
};

ChatRoom.prototype.getRoomUrl = function () {
  var self = this;

  if (self.type === "private") {
    var participants = self.getParticipantsExceptMe();
    var contact = M.u[participants[0]];

    if (contact) {
      return "fm/chat/p/" + contact.u;
    }
  } else if (self.type === "public" && self.publicChatHandle && self.publicChatKey) {
    return "chat/" + self.publicChatHandle + "#" + self.publicChatKey;
  } else if (self.type === "public" && !self.publicChatHandle) {
    return "fm/chat/c/" + self.roomId;
  } else if (self.type === "group" || self.type === "public") {
    return "fm/chat/g/" + self.roomId;
  } else {
    throw new Error("Can't get room url for unknown room type.");
  }
};

ChatRoom.prototype.activateWindow = function () {
  var self = this;
  loadSubPage(self.getRoomUrl());
};

ChatRoom.prototype.hide = function () {
  var self = this;

  if (d) {
    self.logger.debug(' ---- hide', self.isCurrentlyActive);
  }

  self.isCurrentlyActive = false;
  self.lastShownInUI = Date.now();

  if (self.megaChat.currentlyOpenedChat === self.roomId) {
    self.megaChat.currentlyOpenedChat = null;
  }

  var tmp = self.megaChat.domSectionNode.querySelector('.conversation-panel[data-room-id="' + self.chatId + '"]');

  if (tmp) {
    tmp.classList.add('hidden');
  }

  if (tmp = document.getElementById('conversation_' + self.roomId)) {
    tmp.classList.remove('active');
  }

  self.trigger('onChatHidden', self.isCurrentlyActive);
};

ChatRoom.prototype.appendMessage = function (message) {
  var self = this;

  if (message.deleted) {
    return false;
  }

  if (message.getFromJid && message.getFromJid() === self.roomId) {
    return false;
  }

  if (self.shownMessages[message.messageId]) {
    return false;
  }

  if (!message.orderValue) {
    var mb = self.messagesBuff;

    if (mb.messages.length > 0) {
      var prevMsg = mb.messages.getItem(mb.messages.length - 1);

      if (!prevMsg) {
        self.logger.error("self.messages got out of sync...maybe there are some previous JS exceptions that caused that? note that messages may be displayed OUT OF ORDER in the UI.");
      } else {
        var nextVal = prevMsg.orderValue + 0.1;

        if (!prevMsg.sent) {
          var cid = megaChat.plugins.chatdIntegration.chatd.chatIdMessages[self.chatIdBin];

          if (cid && cid.highnum) {
            nextVal = ++cid.highnum;
          }
        }

        message.orderValue = nextVal;
      }
    }
  }

  message.source = Message.SOURCE.SENT;
  self.trigger('onMessageAppended', message);
  self.messagesBuff.messages.push(message);
  self.shownMessages[message.messageId] = true;
  self.megaChat.updateDashboard();
};

ChatRoom.prototype.getNavElement = function () {
  var self = this;
  return $('.nw-conversations-item[data-room-id="' + self.chatId + '"]');
};

ChatRoom.prototype.arePluginsForcingMessageQueue = function (message) {
  var self = this;
  var pluginsForceQueue = false;
  $.each(self.megaChat.plugins, function (k) {
    if (self.megaChat.plugins[k].shouldQueueMessage) {
      if (self.megaChat.plugins[k].shouldQueueMessage(self, message) === true) {
        pluginsForceQueue = true;
        return false;
      }
    }
  });
  return pluginsForceQueue;
};

ChatRoom.prototype.sendMessage = function (message) {
  var self = this;
  var megaChat = this.megaChat;
  var messageId = megaChat.generateTempMessageId(self.roomId, message);
  var msgObject = new Message(self, self.messagesBuff, {
    'messageId': messageId,
    'userId': u_handle,
    'message': message,
    'textContents': message,
    'delay': unixtime(),
    'sent': Message.STATE.NOT_SENT
  });
  self.trigger('onSendMessage');
  self.appendMessage(msgObject);

  self._sendMessageToTransport(msgObject).done(function (internalId) {
    msgObject.internalId = internalId;
    msgObject.orderValue = internalId;
  });
};

ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
  var self = this;
  var megaChat = this.megaChat;
  megaChat.trigger('onPreBeforeSendMessage', messageObject);
  megaChat.trigger('onBeforeSendMessage', messageObject);
  megaChat.trigger('onPostBeforeSendMessage', messageObject);
  return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject);
};

ChatRoom.prototype._sendNodes = function (nodeids, users) {
  var promises = [];
  var self = this;

  if (self.type === "public") {
    nodeids.forEach(function (nodeId) {
      promises.push(asyncApiReq({
        'a': 'mcga',
        'n': nodeId,
        'u': strongvelope.COMMANDER,
        'id': self.chatId,
        'v': Chatd.VERSION
      }));
    });
  } else {
    users.forEach(function (uh) {
      nodeids.forEach(function (nodeId) {
        promises.push(asyncApiReq({
          'a': 'mcga',
          'n': nodeId,
          'u': uh,
          'id': self.chatId,
          'v': Chatd.VERSION
        }));
      });
    });
  }

  return MegaPromise.allDone(promises);
};

ChatRoom.prototype.attachNodes = mutex('chatroom-attach-nodes', function _(resolve, reject, nodes) {
  var i;
  var step = 0;
  var users = [];
  var self = this;
  var copy = Object.create(null);
  var send = Object.create(null);
  var members = self.getParticipantsExceptMe();
  var attach = promisify(function (resolve, reject, nodes) {
    console.assert(self.type === 'public' || users.length, 'No users to send to?!');

    self._sendNodes(nodes, users).then(function () {
      for (var i = nodes.length; i--;) {
        var n = M.getNodeByHandle(nodes[i]);
        console.assert(n.h, 'wtf..');

        if (n.h) {
          self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify([{
            h: n.h,
            k: n.k,
            t: n.t,
            s: n.s,
            fa: n.fa,
            ts: n.ts,
            hash: n.hash,
            name: n.name
          }]));
        }
      }

      resolve();
    }).catch(reject);
  });

  var done = function done() {
    if (--step < 1) {
      resolve();
    }
  };

  var fail = function fail(ex) {
    console.error(ex);
    done();
  };

  if (d && !_.logger) {
    _.logger = new MegaLogger('attachNodes', {}, self.logger);
  }

  for (i = members.length; i--;) {
    var usr = M.getUserByHandle(members[i]);

    if (usr.u) {
      users.push(usr.u);
    }
  }

  if (!Array.isArray(nodes)) {
    nodes = [nodes];
  }

  for (i = nodes.length; i--;) {
    var n = M.getNodeByHandle(nodes[i]);
    (n && (n.u !== u_handle || M.getNodeRoot(n.h) === "shares") ? copy : send)[n.h] = 1;
  }

  copy = Object.keys(copy);
  send = Object.keys(send);

  if (d) {
    _.logger.debug('copy:%d, send:%d', copy.length, send.length, copy, send);
  }

  if (send.length) {
    step++;
    attach(send).then(done).catch(fail);
  }

  if (copy.length) {
    step++;
    M.myChatFilesFolder.get(true).then(function (target) {
      var rem = [];
      var c = Object.keys(M.c[target.h] || {});

      for (var i = copy.length; i--;) {
        var n = M.getNodeByHandle(copy[i]);
        console.assert(n.h, 'wtf..');

        for (var y = c.length; y--;) {
          var b = M.getNodeByHandle(c[y]);

          if (n.h === b.h || b.hash === n.hash) {
            if (d) {
              _.logger.info('deduplication %s:%s', n.h, b.h, [n], [b]);
            }

            rem.push(n.h);
            copy.splice(i, 1);
            break;
          }
        }
      }

      var next = function next(res) {
        if (!Array.isArray(res)) {
          return fail(res);
        }

        attach([].concat(rem, res)).then(done).catch(fail);
      };

      if (copy.length) {
        M.copyNodes(copy, target.h, false, next).dump('attach-nodes');
      } else {
        if (d) {
          _.logger.info('No new nodes to copy.', [rem]);
        }

        next([]);
      }
    }).catch(fail);
  }

  if (!step) {
    if (d) {
      _.logger.warn('Nothing to do here...');
    }

    onIdle(done);
  }
});

ChatRoom.prototype.onUploadStart = function (data) {
  var self = this;

  if (d) {
    self.logger.debug('onUploadStart', data);
  }
};

ChatRoom.prototype.uploadFromComputer = function () {
  $('#fileselect1').trigger('click');
};

ChatRoom.prototype.attachContacts = function (ids) {
  for (var i = 0; i < ids.length; i++) {
    var nodeId = ids[i];
    var node = M.u[nodeId];
    this.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify([{
      u: node.u,
      email: node.m,
      name: node.name || node.m
    }]));
  }
};

ChatRoom.prototype.getMessageById = function (messageId) {
  var self = this;
  var found = false;
  $.each(self.messagesBuff.messages, function (k, v) {
    if (v.messageId === messageId) {
      found = v;
      return false;
    }
  });
  return found;
};

ChatRoom.prototype.renderContactTree = function () {
  var self = this;
  var $navElement = self.getNavElement();
  var $count = $('.nw-conversations-unread', $navElement);
  var count = self.messagesBuff.getUnreadCount();

  if (count > 0) {
    $count.text(count > 9 ? "9+" : count);
    $navElement.addClass("unread");
  } else if (count === 0) {
    $count.text("");
    $navElement.removeClass("unread");
  }

  $navElement.data('chatroom', self);
};

ChatRoom.prototype.getUnreadCount = function () {
  var self = this;
  return self.messagesBuff.getUnreadCount();
};

ChatRoom.prototype.recover = function () {
  var self = this;
  self.callRequest = null;

  if (self.state !== ChatRoom.STATE.LEFT) {
    self.membersLoaded = false;
    self.setState(ChatRoom.STATE.JOINING, true);
    self.megaChat.trigger("onRoomCreated", [self]);
    return MegaPromise.resolve();
  } else {
    return MegaPromise.reject();
  }
};

ChatRoom._fnRequireParticipantKeys = function (fn, scope) {
  return function () {
    var self = scope || this;
    var args = toArray.apply(null, arguments);
    var participants = self.protocolHandler.getTrackedParticipants();
    return ChatdIntegration._ensureKeysAreLoaded(undefined, participants).done(function () {
      fn.apply(self, args);
    }).fail(function () {
      self.logger.error("Failed to retr. keys.");
    });
  };
};

ChatRoom.prototype.startAudioCall = ChatRoom._fnRequireParticipantKeys(function () {
  var self = this;
  return self.megaChat.plugins.callManager.startCall(self, {
    audio: true,
    video: false
  });
});
ChatRoom.prototype.joinCall = ChatRoom._fnRequireParticipantKeys(function () {
  var self = this;
  assert(self.type === "group" || self.type === "public", "Can't join non-group chat call.");

  if (self.megaChat.activeCallManagerCall) {
    self.megaChat.activeCallManagerCall.endCall();
  }

  return self.megaChat.plugins.callManager.joinCall(self, {
    audio: true,
    video: false
  });
});
ChatRoom.prototype.startVideoCall = ChatRoom._fnRequireParticipantKeys(function () {
  var self = this;
  return self.megaChat.plugins.callManager.startCall(self, {
    audio: true,
    video: true
  });
});

ChatRoom.prototype.stateIsLeftOrLeaving = function () {
  return this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.READY && this.membersSetFromApi && !this.membersSetFromApi.members.hasOwnProperty(u_handle);
};

ChatRoom.prototype._clearChatMessagesFromChatd = function () {
  this.chatd.shards[this.chatShard].retention(base64urldecode(this.chatId), 1);
};

ChatRoom.prototype.isReadOnly = function () {
  if (this.type === "private") {
    var members = this.getParticipantsExceptMe();

    if (members[0] && !M.u[members[0]].c) {
      return true;
    }
  }

  return this.members && this.members[u_handle] <= 0 || !this.members.hasOwnProperty(u_handle) || this.privateReadOnlyChat || this.state === ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.LEFT;
};

ChatRoom.prototype.iAmOperator = function () {
  return this.type === "private" || this.members && this.members[u_handle] === 3;
};

ChatRoom.prototype.didInteraction = function (user_handle, ts) {
  var self = this;
  var newTs = ts || unixtime();

  if (user_handle === u_handle) {
    Object.keys(self.members).forEach(function (user_handle) {
      var contact = M.u[user_handle];

      if (contact && user_handle !== u_handle && contact.c === 1) {
        setLastInteractionWith(contact.u, "1:" + newTs);
      }
    });
  } else {
    var contact = M.u[user_handle];

    if (contact && user_handle !== u_handle && contact.c === 1) {
      setLastInteractionWith(contact.u, "1:" + newTs);
    }
  }
};

ChatRoom.prototype.retrieveAllHistory = function () {
  var self = this;
  self.messagesBuff.retrieveChatHistory().done(function () {
    if (self.messagesBuff.haveMoreHistory()) {
      self.retrieveAllHistory();
    }
  });
};

ChatRoom.prototype.truncate = function () {
  var self = this;
  var chatMessages = self.messagesBuff.messages;

  if (chatMessages.length > 0) {
    var lastChatMessageId = null;
    var i = chatMessages.length - 1;

    while (lastChatMessageId == null && i >= 0) {
      var message = chatMessages.getItem(i);

      if (message instanceof Message && message.dialogType !== "truncated") {
        lastChatMessageId = message.messageId;
      }

      i--;
    }

    if (lastChatMessageId) {
      asyncApiReq({
        a: 'mct',
        id: self.chatId,
        m: lastChatMessageId,
        v: Chatd.VERSION
      }).fail(function (r) {
        if (r === -2) {
          msgDialog('warninga', l[135], __(l[8880]));
        }
      });
    }
  }
};

ChatRoom.prototype.haveActiveCall = function () {
  return this.callManagerCall && this.callManagerCall.isActive() === true;
};

ChatRoom.prototype.haveActiveOnHoldCall = function () {
  return this.callManagerCall && this.callManagerCall.rtcCall.isOnHold();
};

ChatRoom.prototype.havePendingGroupCall = function () {
  var self = this;
  var haveCallParticipants = self.getCallParticipants().length > 0;

  if (self.type !== "group" && self.type !== "public") {
    return false;
  }

  var call = self.callManagerCall;

  if (call && (call.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || call.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING)) {
    return true;
  } else if (!self.callManagerCall && haveCallParticipants) {
    return true;
  } else {
    return false;
  }
};

ChatRoom.prototype.havePendingCall = function () {
  var self = this;
  var call = self.callManagerCall;

  if (call) {
    return call.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || call.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING;
  } else if (self.type === "group" || self.type === "public") {
    return self.getCallParticipants().length > 0;
  } else {
    return false;
  }
};

ChatRoom.prototype.getActiveCallMessageId = function (ignoreActive) {
  var self = this;

  if (!ignoreActive && !self.havePendingCall() && !self.haveActiveCall()) {
    return false;
  }

  var msgs = self.messagesBuff.messages;

  for (var i = msgs.length - 1; i >= 0; i--) {
    var msg = msgs.getItem(i);

    if (msg.dialogType === "remoteCallEnded") {
      return false;
    }

    if (msg.dialogType === "remoteCallStarted") {
      return msg.messageId;
    }
  }
};

ChatRoom.prototype.callParticipantsUpdated = function () {
  var self = this;
  var msgId = self.getActiveCallMessageId();

  if (!msgId) {
    msgId = self.getActiveCallMessageId(true);
  }

  var callParts = self.getCallParticipants();
  var uniqueCallParts = {};
  callParts.forEach(function (handleAndSid) {
    var handle = base64urlencode(handleAndSid.substr(0, 8));
    uniqueCallParts[handle] = true;
  });
  self.uniqueCallParts = uniqueCallParts;
  var msg = self.messagesBuff.getMessageById(msgId);
  msg && msg.wrappedChatDialogMessage && msg.wrappedChatDialogMessage.trackDataChange();
  self.trackDataChange();
};

ChatRoom.prototype.onPublicChatRoomInitialized = function () {
  var self = this;

  if (self.type !== "public" || !localStorage.autoJoinOnLoginChat) {
    return;
  }

  var autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(localStorage.autoJoinOnLoginChat) || false;

  if (autoLoginChatInfo[0] === self.publicChatHandle) {
    localStorage.removeItem("autoJoinOnLoginChat");

    if (unixtime() - 7200 < autoLoginChatInfo[1]) {
      var doJoinEventually = function doJoinEventually(state) {
        if (state === ChatRoom.STATE.READY) {
          self.joinViaPublicHandle();
          self.unbind('onStateChange.' + self.publicChatHandle);
        }
      };

      self.rebind('onStateChange.' + self.publicChatHandle, function (e, oldState, newState) {
        doJoinEventually(newState);
      });
      doJoinEventually(self.state);
    }
  }
};

ChatRoom.prototype.isUIMounted = function () {
  return this._uiIsMounted;
};

ChatRoom.prototype.attachSearch = function () {
  this.activeSearches++;
};

ChatRoom.prototype.detachSearch = function () {
  if (--this.activeSearches === 0) {
    this.messagesBuff.detachMessages();
  }

  this.activeSearches = Math.max(this.activeSearches, 0);
  this.trackDataChange();
};

ChatRoom.prototype.scrollToMessageId = function (msgId, index, retryActive) {
  var self = this;

  if (!self.isCurrentlyActive && !retryActive) {
    setTimeout(function () {
      self.scrollToMessageId(msgId, index, true);
    }, 1500);
    return;
  }

  assert(self.isCurrentlyActive, 'chatRoom is not visible');
  self.isScrollingToMessageId = true;

  if (!self.$rConversationPanel) {
    self.one('onComponentDidMount.scrollToMsgId' + msgId, function () {
      self.scrollToMessageId(msgId, index);
    });
    return;
  }

  var ps = self.$rConversationPanel.messagesListScrollable;
  assert(ps);
  var msgObj = self.messagesBuff.getMessageById(msgId);

  if (msgObj) {
    var elem = $('.' + msgId + '.message.body')[0];
    self.scrolledToBottom = false;
    ps.scrollToElement(elem, true);
    self.$rConversationPanel.lastScrollPosition = undefined;
    self.isScrollingToMessageId = false;
  } else if (self.messagesBuff.isRetrievingHistory) {
    self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function () {
      self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function () {
        self.scrollToMessageId(msgId, index);
      });
    });
  } else if (self.messagesBuff.haveMoreHistory()) {
    self.messagesBuff.retrieveChatHistory(!index || index <= 0 ? undefined : index);
    ps.doProgramaticScroll(0, true);
    self.one('onHistoryDecrypted.scrollToMsgId' + msgId, function () {
      self.one('onComponentDidUpdate.scrollToMsgId' + msgId, function () {
        self.scrollToMessageId(msgId);
      });
    });
  } else {
    self.isScrollingToMessageId = false;
  }
};

window.ChatRoom = ChatRoom;
__webpack_exports__["default"] = ({
  'ChatRoom': ChatRoom
});

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, "altersData", function() { return altersData; });
__webpack_require__.d(__webpack_exports__, "prefixedKeyMirror", function() { return prefixedKeyMirror; });
__webpack_require__.d(__webpack_exports__, "extendActions", function() { return extendActions; });
function altersData(fn) {
  fn.altersData = true;
  return fn;
}
function prefixedKeyMirror(prefix, vals) {
  var result = {};
  Object.keys(vals).forEach(function (k) {
    result[k] = prefix + ":" + k;
  });
  return result;
}
function extendActions(prefix, src, toBeAppended) {
  var actions = Object.keys(src).concat(Object.keys(toBeAppended));
  var result = {};
  actions.forEach(function (k) {
    result[k] = prefix + ":" + k;
  });
  return result;
}

/***/ }),

/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, "StartGroupChatWizard", function() { return startGroupChatWizard_StartGroupChatWizard; });

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/assertThisInitialized.js
var assertThisInitialized = __webpack_require__(4);
var assertThisInitialized_default = __webpack_require__.n(assertThisInitialized);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/inheritsLoose.js
var inheritsLoose = __webpack_require__(1);
var inheritsLoose_default = __webpack_require__.n(inheritsLoose);

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(6);

// EXTERNAL MODULE: ./js/stores/mixins.js
var mixins = __webpack_require__(2);

// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(14);

// EXTERNAL MODULE: ./js/ui/forms.jsx
var ui_forms = __webpack_require__(15);

// CONCATENATED MODULE: ./js/ui/miniui.jsx


var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(7);



var miniui_ToggleCheckbox = function (_MegaRenderMixin) {
  inherits(ToggleCheckbox, _MegaRenderMixin);

  function ToggleCheckbox(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.state = {
      value: _this.props.value
    };
    return _this;
  }

  var _proto = ToggleCheckbox.prototype;

  _proto.onToggle = function onToggle() {
    var newState = !this.state.value;
    this.setState({
      'value': newState
    });

    if (this.props.onToggle) {
      this.props.onToggle(newState);
    }
  };

  _proto.render = function render() {
    var self = this;
    return React.createElement("div", {
      className: "toggle-checkbox " + (self.state.value ? " checked " : "") + self.props.className,
      onClick: function onClick() {
        self.onToggle();
      }
    }, React.createElement("div", {
      className: "toggle-checkbox-wrap"
    }, React.createElement("div", {
      className: "toggle-checkbox-button"
    })));
  };

  return ToggleCheckbox;
}(mixins["MegaRenderMixin"]);

var miniui_Checkbox = function (_MegaRenderMixin2) {
  inherits(Checkbox, _MegaRenderMixin2);

  function Checkbox(props) {
    var _this2 = _MegaRenderMixin2.call(this, props) || this;

    _this2.state = {
      value: _this2.props.value
    };
    return _this2;
  }

  var _proto2 = Checkbox.prototype;

  _proto2.componentDidMount = function componentDidMount() {
    _MegaRenderMixin2.prototype.componentDidMount.call(this);

    var self = this;
    var $node = self.findDOMNode();
    uiCheckboxes($node, false, function (newState) {
      self.setState({
        'value': newState
      });
      self.props.onToggle && self.props.onToggle(newState);
    }, !!self.props.value);
  };

  _proto2.render = function render() {
    var extraClasses = "";

    if (this.props.disabled) {
      extraClasses += " disabled";
    }

    return React.createElement("div", {
      className: this.props.className + " checkbox" + extraClasses
    }, React.createElement("div", {
      className: "checkdiv checkboxOn"
    }, React.createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.name,
      className: "checkboxOn",
      checked: ""
    })), React.createElement("label", {
      htmlFor: this.props.name,
      className: "radio-txt lato mid"
    }, this.props.label), React.createElement("div", {
      className: "clear"
    }));
  };

  return Checkbox;
}(mixins["MegaRenderMixin"]);

var miniui_IntermediateCheckbox = function (_MegaRenderMixin3) {
  inherits(IntermediateCheckbox, _MegaRenderMixin3);

  function IntermediateCheckbox(props) {
    var _this3 = _MegaRenderMixin3.call(this, props) || this;

    _this3.state = {
      value: _this3.props.value
    };
    return _this3;
  }

  var _proto3 = IntermediateCheckbox.prototype;

  _proto3.componentDidMount = function componentDidMount() {
    _MegaRenderMixin3.prototype.componentDidMount.call(this);

    var self = this;
    var $node = self.findDOMNode();
    uiCheckboxes($node, false, function (newState) {
      self.setState({
        'value': newState
      });
      self.props.onToggle && self.props.onToggle(newState);
    }, !!self.props.value);
  };

  _proto3.render = function render() {
    var extraClasses = "";

    if (this.props.disabled) {
      extraClasses += " disabled";
    }

    return React.createElement("div", {
      className: this.props.className + " checkbox" + extraClasses
    }, React.createElement("div", {
      className: "checkdiv checkboxOn"
    }, React.createElement("input", {
      type: "checkbox",
      name: this.props.name,
      id: this.props.name,
      className: "checkboxOn",
      checked: ""
    })), React.createElement("label", {
      htmlFor: this.props.name,
      className: "radio-txt lato mid"
    }, this.props.label), React.createElement("div", {
      className: "clear"
    }), this.props.intermediate ? React.createElement("div", {
      className: "intermediate-state"
    }, this.props.intermediateMessage) : null, React.createElement("div", {
      className: "clear"
    }));
  };

  return IntermediateCheckbox;
}(mixins["MegaRenderMixin"]);

var miniui = ({
  ToggleCheckbox: miniui_ToggleCheckbox,
  Checkbox: miniui_Checkbox,
  IntermediateCheckbox: miniui_IntermediateCheckbox
});
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(5);

// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(10);

// CONCATENATED MODULE: ./js/chat/ui/startGroupChatWizard.jsx



var startGroupChatWizard_React = __webpack_require__(0);

var startGroupChatWizard_ReactDOM = __webpack_require__(7);








var startGroupChatWizard_StartGroupChatWizard = function (_MegaRenderMixin) {
  inherits(StartGroupChatWizard, _MegaRenderMixin);

  function StartGroupChatWizard(props) {
    var _this = _MegaRenderMixin.call(this, props) || this;

    _this.inputRef = startGroupChatWizard_React.createRef();
    var haveContacts = false;
    var keys = M.u.keys();

    for (var i = 0; i < keys.length; i++) {
      if (M.u[keys[i]].c === 1) {
        haveContacts = true;
        break;
      }
    }

    _this.state = {
      'selected': _this.props.selected ? _this.props.selected : [],
      'haveContacts': haveContacts,
      'step': _this.props.flowType === 2 || !haveContacts ? 1 : 0,
      'keyRotation': false,
      'createChatLink': _this.props.flowType === 2 ? true : false,
      'groupName': ''
    };
    _this.onFinalizeClick = _this.onFinalizeClick.bind((_this));
    _this.onSelectClicked = _this.onSelectClicked.bind((_this));
    _this.onSelected = _this.onSelected.bind((_this));
    return _this;
  }

  var _proto = StartGroupChatWizard.prototype;

  _proto.onSelected = function onSelected(nodes) {
    this.setState({
      'selected': nodes
    });

    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
  };

  _proto.onSelectClicked = function onSelectClicked() {
    if (this.props.onSelectClicked) {
      this.props.onSelectClicked();
    }
  };

  _proto.onFinalizeClick = function onFinalizeClick(e) {
    var self = this;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    var groupName = self.state.groupName;
    var handles = self.state.selected;
    var keyRotation = self.state.keyRotation;
    var createChatLink = keyRotation ? false : self.state.createChatLink;
    megaChat.createAndShowGroupRoomFor(handles, groupName, keyRotation, createChatLink);
    self.props.onClose(self);
  };

  _proto.render = function render() {
    var _this2 = this;

    var self = this;
    var classes = "new-group-chat contrast small-footer " + self.props.className;
    var contacts = M.u;
    var haveContacts = self.state.haveContacts;
    var buttons = [];
    var allowNext = false;
    var failedToEnableChatlink = self.state.failedToEnableChatlink && self.state.createChatLink === true && !self.state.groupName;

    if (self.state.keyRotation) {
      failedToEnableChatlink = false;
    }

    if (self.state.step === 0 && haveContacts) {
      allowNext = true;
      buttons.push({
        "label": l[556],
        "key": "next",
        "defaultClassname": "link-button lato right",
        "className": !allowNext ? "disabled" : null,
        "iconAfter": "small-icon grey-right-arrow",
        "onClick": function onClick(e) {
          e.preventDefault();
          e.stopPropagation();
          self.setState({
            'step': 1
          });
        }
      });
      buttons.push({
        "label": self.props.cancelLabel,
        "key": "cancel",
        "defaultClassname": "link-button lato left",
        "onClick": function onClick(e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      });
    } else if (self.state.step === 1) {
      allowNext = self.state.createChatLink ? !failedToEnableChatlink : true;
      contacts = [];
      self.state.selected.forEach(function (h) {
        M.u[h] && contacts.push(M.u[h]);
      });
      buttons.push({
        "label": l[726],
        "key": "done",
        "defaultClassname": "default-grey-button lato right",
        "className": !allowNext ? "disabled" : null,
        "onClick": function onClick(e) {
          if (self.state.createChatLink === true && !self.state.groupName) {
            self.setState({
              'failedToEnableChatlink': true
            });
          } else {
            self.onFinalizeClick(e);
          }
        }
      });

      if (!haveContacts || this.props.flowType === 2) {
        buttons.push({
          "label": self.props.cancelLabel,
          "key": "cancel",
          "defaultClassname": "link-button lato left",
          "onClick": function onClick(e) {
            self.props.onClose(self);
            e.preventDefault();
            e.stopPropagation();
          }
        });
      } else {
        buttons.push({
          "label": l[822],
          "key": "back",
          "defaultClassname": "button link-button lato left",
          "iconBefore": "small-icon grey-left-arrow",
          "onClick": function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            self.setState({
              'step': 0
            });
          }
        });
      }
    }

    var chatInfoElements;

    if (self.state.step === 1) {
      var checkboxClassName = self.state.createChatLink ? "checkboxOn" : "checkboxOff";

      if (failedToEnableChatlink && self.state.createChatLink) {
        checkboxClassName += " intermediate-state";
      }

      if (self.state.keyRotation) {
        checkboxClassName = "checkboxOff";
      }

      chatInfoElements = startGroupChatWizard_React.createElement(startGroupChatWizard_React.Fragment, null, startGroupChatWizard_React.createElement("div", {
        className: "\n                            contacts-search-header left-aligned top-pad\n                            " + (failedToEnableChatlink ? 'failed' : '') + "\n                        "
      }, startGroupChatWizard_React.createElement("i", {
        className: "small-icon conversations"
      }), startGroupChatWizard_React.createElement("input", {
        autoFocus: true,
        type: "search",
        ref: this.inputRef,
        placeholder: l[18509],
        value: this.state.groupName,
        maxLength: 30,
        onKeyDown: function onKeyDown(e) {
          var code = e.which || e.keyCode;

          if (allowNext && code === 13 && self.state.step === 1) {
            _this2.onFinalizeClick();
          }
        },
        onChange: function onChange(e) {
          return _this2.setState({
            groupName: e.target.value,
            failedToEnableChatlink: false
          });
        }
      })), this.props.flowType === 2 ? null : startGroupChatWizard_React.createElement("div", {
        className: "group-chat-dialog content"
      }, startGroupChatWizard_React.createElement(miniui.ToggleCheckbox, {
        className: "right",
        checked: this.state.keyRotation,
        onToggle: function onToggle(keyRotation) {
          return _this2.setState({
            keyRotation: keyRotation
          }, function () {
            return _this2.inputRef.current.focus();
          });
        }
      }), startGroupChatWizard_React.createElement("div", {
        className: "group-chat-dialog header"
      }, this.state.keyRotation ? l[20631] : l[20576]), startGroupChatWizard_React.createElement("div", {
        className: "group-chat-dialog description"
      }, l[20484]), startGroupChatWizard_React.createElement("div", {
        className: "\n                                    group-chat-dialog checkbox\n                                    " + (this.state.keyRotation ? 'disabled' : '') + "\n                                    " + (failedToEnableChatlink ? 'failed' : '') + "\n                                ",
        onClick: function onClick() {
          delay('chatWizard-createChatLink', function () {
            _this2.setState(function (state) {
              return {
                createChatLink: !state.createChatLink
              };
            });

            _this2.inputRef.current.focus();
          }, 100);
        }
      }, startGroupChatWizard_React.createElement("div", {
        className: "checkdiv " + checkboxClassName
      }, startGroupChatWizard_React.createElement("input", {
        type: "checkbox",
        name: "group-encryption",
        id: "group-encryption",
        className: "checkboxOn hidden"
      })), startGroupChatWizard_React.createElement("label", {
        htmlFor: "group-encryption",
        className: "radio-txt lato mid"
      }, l[20575]), startGroupChatWizard_React.createElement("div", {
        className: "clear"
      }))), failedToEnableChatlink ? startGroupChatWizard_React.createElement("div", {
        className: "group-chat-dialog description chatlinks-intermediate-msg"
      }, l[20573]) : null);
    }

    return startGroupChatWizard_React.createElement(modalDialogs["a" ].ModalDialog, {
      step: self.state.step,
      title: this.props.flowType === 2 && self.state.createChatLink ? l[20638] : l[19483],
      className: classes,
      selected: self.state.selected,
      onClose: function onClose() {
        self.props.onClose(self);
      },
      triggerResizeOnUpdate: true,
      buttons: buttons
    }, chatInfoElements, startGroupChatWizard_React.createElement(ui_contacts["ContactPickerWidget"], {
      changedHashProp: self.state.step,
      exclude: self.props.exclude,
      contacts: contacts,
      selectableContacts: "true",
      onSelectDone: self.onSelectClicked,
      onSelected: self.onSelected,
      selected: self.state.selected,
      headerClasses: "left-aligned",
      multiple: true,
      readOnly: self.state.step !== 0,
      allowEmpty: true,
      showMeAsSelected: self.state.step === 1
    }));
  };

  return StartGroupChatWizard;
}(mixins["MegaRenderMixin"]);
startGroupChatWizard_StartGroupChatWizard.clickTime = 0;
startGroupChatWizard_StartGroupChatWizard.defaultProps = {
  'selectLabel': __(l[1940]),
  'cancelLabel': __(l[82]),
  'hideable': true,
  'flowType': 1
};
window.StartGroupChatDialogUI = {
  StartGroupChatWizard: startGroupChatWizard_StartGroupChatWizard
};
var startGroupChatWizard = __webpack_exports__["default"] = ({
  StartGroupChatWizard: startGroupChatWizard_StartGroupChatWizard
});

/***/ })
/******/ ]);