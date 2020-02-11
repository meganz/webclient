React.makeElement = React['createElement'];
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
/******/ 	return __webpack_require__(__webpack_require__.s = 17);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = React;

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }


 // copied from Facebook's shallowEqual, used in PureRenderMixin, because it was defined as a _private_ module and
// adapted to be a bit more optimal for functions...

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  var key; // Test for A's keys different from B.

  for (key in objA) {
    if (key === "children") {
      // skip!
      continue;
    }

    if (objA.hasOwnProperty(key)) {
      if (!objB.hasOwnProperty(key)) {
        return false;
      } else if (objA[key] !== objB[key]) {
        // handle/match functions code
        if (typeof objA[key] === 'function' && typeof objB[key] === 'function') {
          if (objA[key].toString() !== objB[key].toString()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
  } // Test for B's keys missing from A.


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
} else {
  window._propertyTrackChangesVars = _propertyTrackChangesVars;
}

window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;
var FUNCTIONS = ['render', 'shouldComponentUpdate', 'doProgramaticScroll', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'refreshUI', 'eventuallyInit', 'handleWindowResize', 'focusTypeArea', 'initScrolling', 'updateScroll', 'isActive', 'onMessagesScrollReinitialise', 'specificShouldComponentUpdate', 'attachAnimationEvents', 'eventuallyReinitialise', 'reinitialise', 'reinitialised', 'getContentHeight', 'getScrollWidth', 'isAtBottom', 'onResize', 'isComponentEventuallyVisible', 'getCursorPosition', 'getTextareaMaxHeight'];
var localStorageProfileRenderFns = localStorage.profileRenderFns;

if (localStorageProfileRenderFns) {
  window.REACT_RENDER_CALLS = {};
}

var ID_CURRENT = 0;
/* harmony default export */ __webpack_exports__["default"] = (function (superClass) {
  return (
    /*#__PURE__*/
    function (_superClass) {
      _inherits(MegaRenderMixin, _superClass);

      function MegaRenderMixin(props) {
        var _this;

        _classCallCheck(this, MegaRenderMixin);

        _this = _possibleConstructorReturn(this, _getPrototypeOf(MegaRenderMixin).call(this, props));
        _this.__intersectionObserver = _this.__intersectionObserver.bind(_assertThisInitialized(_this));
        return _this;
      }

      _createClass(MegaRenderMixin, [{
        key: "isMounted",
        value: function isMounted() {
          return !!this.__isMounted;
        }
      }, {
        key: "componentWillUnmount",
        value: function componentWillUnmount() {
          if (_get(_getPrototypeOf(MegaRenderMixin.prototype), "componentWillUnmount", this)) {
            _get(_getPrototypeOf(MegaRenderMixin.prototype), "componentWillUnmount", this).call(this);
          }

          this.__isMounted = false;
          $(window).off('resize.megaRenderMixing' + this.getUniqueId());
          $(window).off('resize.megaRenderMixing2' + this.getUniqueId());
          window.removeEventListener('hashchange', this.queuedUpdateOnResize.bind(this));

          if (typeof this.__intersectionVisibility !== 'undefined' && this.__intersectionObserver && this.__intersectionObserver.unobserve) {
            this.__intersectionObserver.disconnect();

            delete this.__intersectionObserver;
            this.__intersectionVisibility = undefined;
          }

          if (this._dataStructListeners) {
            this._internalDetachRenderCallbacks();
          }

          if (this.detachRerenderCallbacks) {
            this.detachRerenderCallbacks();
          }
        }
      }, {
        key: "getReactId",
        value: function getReactId() {
          // Since react dropped their _rootNodeId's, we would use some hacky locally generated id
          if (!this._id) {
            this._id = this._reactInternalFiber.type.name + new String(ID_CURRENT++);
          }

          return this._id;
        }
      }, {
        key: "getUniqueId",
        value: function getUniqueId() {
          if (!this._reactInternalFiber) {
            assert(this._uniqueId, 'missing unique id.');
            return this._uniqueId;
          }

          this._uniqueId = this.getReactId().replace(/[^a-zA-Z0-9]/g, "");
          return this._uniqueId;
        }
      }, {
        key: "debouncedForceUpdate",
        value: function debouncedForceUpdate(timeout) {
          var self = this;

          if (typeof self.skippedUpdates === 'undefined') {
            self.skippedUpdates = 0;
          }

          if (self.debounceTimer) {
            clearTimeout(self.debounceTimer); // console.error(self.getUniqueId(), self.skippedUpdates + 1);

            self.skippedUpdates++;
          }

          var TIMEOUT_VAL = timeout || DEBOUNCED_UPDATE_TIMEOUT;

          if (self.skippedUpdates > MAX_ALLOWED_DEBOUNCED_UPDATES) {
            TIMEOUT_VAL = 0;
          }

          self.debounceTimer = setTimeout(function () {
            self.eventuallyUpdate();
            self.debounceTimer = null;
            self.skippedUpdates = 0;
          }, TIMEOUT_VAL);
        }
      }, {
        key: "__intersectionObserver",
        value: function __intersectionObserver(entries) {
          if (entries[0].intersectionRatio <= 0) {
            this.__intersectionVisibility = false;
          } else {
            this.__intersectionVisibility = true;
          }
        }
      }, {
        key: "componentDidMount",
        value: function componentDidMount() {
          if (_get(_getPrototypeOf(MegaRenderMixin.prototype), "componentDidMount", this)) {
            _get(_getPrototypeOf(MegaRenderMixin.prototype), "componentDidMount", this).call(this);
          }

          this.__isMounted = true;

          if (this.props.requiresUpdateOnResize) {
            $(window).rebind('resize.megaRenderMixing' + this.getUniqueId(), this.onResizeDoUpdate.bind(this));
          }

          if (!this.props.skipQueuedUpdatesOnResize) {
            $(window).rebind('resize.megaRenderMixing2' + this.getUniqueId(), this.queuedUpdateOnResize.bind(this));
          }

          window.addEventListener('hashchange', this.queuedUpdateOnResize.bind(this)); // init on data structure change events

          if (this.props) {
            this._recurseAddListenersIfNeeded("p", this.props);
          }

          if (this.state) {
            this._recurseAddListenersIfNeeded("s", this.state);
          } //$(window).rebind(
          //    'DOMContentLoaded.lazyRenderer' + this.getUniqueId() + ' ' +
          //    'load.lazyRenderer' + this.getUniqueId() + ' ' +
          //    'resize.lazyRenderer' + this.getUniqueId() + ' ' +
          //    'hashchange.lazyRenderer' + this.getUniqueId() + ' ' +
          //    'scroll.lazyRenderer' + this.getUniqueId(),
          //    this.requiresLazyRendering
          //);
          //
          //this.requiresLazyRendering();


          if (typeof IntersectionObserver !== 'undefined') {
            var node = this.findDOMNode();

            if (node) {
              this.__intersectionVisibility = false;
              this.__intersectionObserver = new IntersectionObserver(this.__intersectionObserver);

              this.__intersectionObserver.observe(node);
            }
          }

          if (this.attachRerenderCallbacks) {
            this.attachRerenderCallbacks();
          }
        }
      }, {
        key: "findDOMNode",
        value: function findDOMNode() {
          if (this.domNode) {
            // injected by RenderTo and ModalDialogs
            return this.domNode;
          }

          return react_dom__WEBPACK_IMPORTED_MODULE_0___default.a.findDOMNode(this);
        }
      }, {
        key: "isComponentVisible",
        value: function isComponentVisible() {
          var domNode = $(this.findDOMNode()); // .__isMounted is faster then .isMounted() or any other operation

          if (!this.__isMounted) {
            return false;
          }

          if (this.__intersectionVisibility === false) {
            return false;
          } else {
            return true;
          } // offsetParent should NOT trigger a reflow/repaint


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

      }, {
        key: "isComponentEventuallyVisible",
        value: function isComponentEventuallyVisible() {
          var domNode = this.findDOMNode();

          if (this.componentSpecificIsComponentEventuallyVisible) {
            return this.componentSpecificIsComponentEventuallyVisible();
          } // .__isMounted is faster then .isMounted() or any other operation


          if (!this.__isMounted) {
            return false;
          }

          if (this.props.isVisible) {
            return true;
          }

          if (this.__intersectionVisibility === false) {
            return false;
          } else {
            return true;
          } // offsetParent should NOT trigger a reflow/repaint


          if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
            return false;
          }

          return true;
        }
      }, {
        key: "eventuallyUpdate",
        value: function eventuallyUpdate() {
          var self = this;

          if (self._updatesDisabled === true) {
            return;
          }

          if (!self._wasRendered || self._wasRendered && !self.isMounted()) {
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
      }, {
        key: "tempDisableUpdates",
        value: function tempDisableUpdates(forHowLong) {
          var self = this;
          self._updatesDisabled = true;

          if (self._updatesReenableTimer) {
            clearTimeout(self._updatesReenableTimer);
          }

          var timeout = forHowLong ? forHowLong : self.REENABLE_UPDATES_AFTER_TIMEOUT ? self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT;
          self._updatesReenableTimer = setTimeout(function () {
            self.tempEnableUpdates();
          }, timeout);
        }
      }, {
        key: "tempEnableUpdates",
        value: function tempEnableUpdates() {
          clearTimeout(this._updatesReenableTimer);
          this._updatesDisabled = false;
          this.eventuallyUpdate();
        }
      }, {
        key: "queuedUpdateOnResize",
        value: function queuedUpdateOnResize() {
          if (this._requiresUpdateOnResize && this.isMounted() && this.isComponentEventuallyVisible()) {
            this._requiresUpdateOnResize = false;
            this.eventuallyUpdate();
          }
        }
      }, {
        key: "onResizeDoUpdate",
        value: function onResizeDoUpdate() {
          if (!this.isMounted() || this._pendingForceUpdate === true) {
            return;
          }

          this.eventuallyUpdate();
        } // onHashChangeDoUpdate() {
        //     if (!this.isMounted() || this._pendingForceUpdate === true) {
        //         return;
        //     }
        //
        //     this.eventuallyUpdate();
        // }

      }, {
        key: "_recurseAddListenersIfNeeded",
        value: function _recurseAddListenersIfNeeded(idx, map, depth) {
          var self = this;
          depth = depth ? depth : 0;

          if (typeof map._dataChangeIndex !== "undefined") {
            var cacheKey = this.getReactId() + "_" + map._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;

            if (map.addChangeListener && !_propertyTrackChangesVars._listenersMap[cacheKey]) {
              _propertyTrackChangesVars._listenersMap[cacheKey] = map.addChangeListener(function () {
                self.throttledOnPropOrStateUpdated(map, idx);
              });
            }
          }

          if (depth + 1 > MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
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
      }, {
        key: "_checkDataStructForChanges",
        value: function _checkDataStructForChanges(idx, valA, valB, depth) {
          var self = this;
          var foundChanges = false;
          var v = valA;
          var rv = valB; // alias

          var dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;

          if (!v && v === rv) {
            // null, undefined, false is ok
            // console.error('r === rv, !v', k, referenceMap, map);
            return false; // continue/skip
          }

          if (!rv && v) {
            // null, undefined, false is ok
            return true;
          }

          if (v === null && rv !== null) {
            return true;
          } else if (v === null && rv === null) {
            return false;
          }

          if (typeof v._dataChangeIndex !== "undefined") {
            var cacheKey = this.getReactId() + "_" + v._dataChangeTrackedId + "_" + "_" + this.getElementName() + "_" + idx;

            if (dataChangeHistory[cacheKey] !== v._dataChangeIndex) {
              if (window.RENDER_DEBUG) {
                console.error("changed: ", self.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
              }

              foundChanges = true;
              dataChangeHistory[cacheKey] = v._dataChangeIndex;
            } else {// console.error("NOT changed: ", k, v._dataChangeTrackedId, v._dataChangeIndex, v);
            }
          } else if (!(v instanceof Uint8Array) && _typeof(v) === "object" && v !== null && depth <= MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            if (self._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true) {
              foundChanges = true;
            } else {// console.error("NOT (recursive) changed: ", k, v);
            }
          } else if (!(v instanceof Uint8Array) && v && v.forEach && depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH) {
            v.forEach(function (v, k) {
              if (self._recursiveSearchForDataChanges(idx, v[k], rv[k], depth + 1) === true) {
                foundChanges = true;
                return false; // break
              }
            });
          } else {// console.error("NOT tracked/changed: ", k, v);
          }

          return foundChanges;
        }
      }, {
        key: "_recursiveSearchForDataChanges",
        value: function _recursiveSearchForDataChanges(idx, map, referenceMap, depth) {
          var self = this;
          depth = depth || 0;

          if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
            return;
          }

          if (!this._wasRendered) {
            if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);
            this._wasRendered = true;
            return true; // first time render, always render the first time
          } // quick lookup for children


          if (idx === "p_children") {
            // found a list of children nodes
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
            } // found a single node

          } else if (map && !referenceMap || !map && referenceMap || map && referenceMap && !shallowEqual(map, referenceMap)) {
            return true;
          }

          var mapKeys = map._dataChangeIndex ? map.keys() : Object.keys(map);
          var foundChanges = false;
          mapKeys.forEach(function (k) {
            if (foundChanges === true) {
              return false; // break
            }

            foundChanges = self._checkDataStructForChanges(idx + "_" + k, map[k], referenceMap[k], depth);
          });
          return foundChanges;
        }
      }, {
        key: "shouldComponentUpdate",
        value: function shouldComponentUpdate(nextProps, nextState) {
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

          if (this.componentSpecificIsComponentEventuallyVisible) {
            // we asume `componentSpecificIsComponentEventuallyVisible` is super quick/does have low CPU usage
            if (!this._queueUpdateWhenVisible && !this.componentSpecificIsComponentEventuallyVisible()) {
              this._queueUpdateWhenVisible = true;

              if (window.RENDER_DEBUG) {
                console.error("shouldUpdate? No.", "F1.1", this.getElementName(), this.props, nextProps, this.state, nextState);
              }
            } else if (this._queueUpdateWhenVisible && this.componentSpecificIsComponentEventuallyVisible()) {
              delete this._queueUpdateWhenVisible;
              return true;
            }
          } // component specific control of the React lifecycle


          if (this.specificShouldComponentUpdate) {
            var r = this.specificShouldComponentUpdate(nextProps, nextState);

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
            if (shouldRerender) {// debugger;
            }

            console.error("shouldRerender?", shouldRerender, "rendered: ", this.getElementName(), "props:", this.props, "nextProps:", this.props, "state:", this.state);
          }

          if (shouldRerender === true) {
            // (eventually) add listeners to newly added data structures
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
        }
      }, {
        key: "onPropOrStateUpdated",
        value: function onPropOrStateUpdated() {
          if (window.RENDER_DEBUG) console.error("onPropOrStateUpdated", this, this.getElementName(), arguments);

          if (!this.isMounted() || this._pendingForceUpdate === true || this._updatesDisabled === true) {
            return;
          }

          if (megaChat && megaChat.isLoggingOut) {
            return false;
          }

          this.forceUpdate();
        }
      }, {
        key: "getElementName",
        value: function getElementName() {
          return this._reactInternalFiber.elementType.name;
        }
      }, {
        key: "safeForceUpdate",
        value: function safeForceUpdate() {
          try {
            if (this.__isMounted) {
              this.forceUpdate();
            }
          } catch (e) {
            console.error("safeForceUpdate: ", e);
          }
        }
        /* RenderDebug mixin */

      }, {
        key: "componentDidUpdate",
        value: function componentDidUpdate() {
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
        }
      }, {
        key: "componentWillReceiveProps",
        value: function componentWillReceiveProps(nextProps, nextContext) {
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
        }
      }, {
        key: "throttledOnPropOrStateUpdated",
        value: function throttledOnPropOrStateUpdated() {
          if (this.throttledOnPropOrStateUpdatedHandler) {
            _cancelOnIdleOrTimeout(this.throttledOnPropOrStateUpdatedHandler);
          }

          _onIdleOrTimeout(this.onPropOrStateUpdated.bind(this), 300);
        }
      }, {
        key: "_internalDetachRenderCallbacks",
        value: function _internalDetachRenderCallbacks() {
          if (!this._dataStructListeners) {
            return;
          }

          this._dataStructListeners.forEach(function (row) {
            if (row[0] === 'dsprops') {
              row[2].removeChangeListener(row[1]);
            }
          });
        }
      }, {
        key: "addDataStructListenerForProperties",
        value: function addDataStructListenerForProperties(obj, properties) {
          if (!obj) {
            // this should not happen, but in rare cases it does...so we should just skip.
            return;
          }

          if (!this._dataStructListeners) {
            this._dataStructListeners = [];
          }

          var self = this;
          var id = obj.addChangeListener(function (obj, data, k) {
            if (properties.indexOf(k) > -1) {
              self.throttledOnPropOrStateUpdated();
            }
          });

          this._dataStructListeners.push(['dsprops', id, obj]);
        }
      }]);

      return MegaRenderMixin;
    }(superClass)
  );
});

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactsListItem", function() { return ContactsListItem; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactButton", function() { return ContactButton; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactVerified", function() { return ContactVerified; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactPresence", function() { return ContactPresence; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactFingerprint", function() { return ContactFingerprint; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Avatar", function() { return Avatar; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactCard", function() { return ContactCard; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactItem", function() { return ContactItem; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ContactPickerWidget", function() { return ContactPickerWidget; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var _ui_utils_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _ui_perfectScrollbar_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(11);
/* harmony import */ var _ui_buttons_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(7);
/* harmony import */ var _ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(5);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }







var ContactsListItem =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(ContactsListItem, _MegaRenderMixin);

  function ContactsListItem() {
    _classCallCheck(this, ContactsListItem);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactsListItem).apply(this, arguments));
  }

  _createClass(ContactsListItem, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'avatar', 'presence']);
    }
  }, {
    key: "render",
    value: function render() {
      var classString = "nw-conversations-item";
      var contact = this.props.contact;

      if (!contact) {
        return null;
      }

      classString += " " + megaChat.userPresenceToCssClass(contact.presence);
      return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: classString,
        onClick: this.props.onContactClicked.bind(this)
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "nw-contact-status"
      }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "nw-conversations-unread"
      }, "0"), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "nw-conversations-name"
      }, M.getNameByHandle(contact.u))));
    }
  }]);

  return ContactsListItem;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactsListItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactButton =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(ContactButton, _MegaRenderMixin2);

  function ContactButton() {
    _classCallCheck(this, ContactButton);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactButton).apply(this, arguments));
  }

  _createClass(ContactButton, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname']);
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var label = self.props.label ? self.props.label : "";
      var classes = self.props.className ? self.props.className : "";
      var contact = self.props.contact;
      var dropdowns = self.props.dropdowns ? self.props.dropdowns : [];
      var icon = self.props.dropdownIconClasses ? self.props.dropdownIconClasses : [];
      var dropdownPosition = "left top";
      var vertOffset = 0;
      var horizOffset = -30;

      if (label) {
        classes = "user-card-name " + classes;
        icon = "";
        dropdownPosition = "left bottom";
        vertOffset = 25;
        horizOffset = 0;
      }

      if (!contact) {
        return null;
      }

      var username = M.getNameByHandle(contact.u);
      var buttonComponent = null;

      if (!self.props.noContextMenu) {
        var moreDropdowns = [];
        moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "dropdown-avatar rounded",
          key: "mainContactInfo"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Avatar, {
          className: "avatar-wrapper context-avatar",
          contact: contact,
          hideVerifiedBadge: "true",
          onClick: function onClick() {
            if (contact.c === 2) {
              loadSubPage('fm/account');
            }

            if (contact.c === 1) {
              loadSubPage('fm/' + contact.u);
            }
          }
        }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "dropdown-user-name",
          onClick: function onClick() {
            if (contact.c === 2) {
              loadSubPage('fm/account');
            }

            if (contact.c === 1) {
              loadSubPage('fm/' + contact.u);
            }
          }
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "name"
        }, username, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactPresence, {
          className: "small",
          contact: contact
        })), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", {
          className: "email"
        }, contact.m))));
        moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactFingerprint, {
          key: "fingerprint",
          contact: contact
        }));

        if (dropdowns.length && contact.c !== 2) {
          moreDropdowns.push(dropdowns);
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("hr", {
            key: "top-separator"
          }));
        }

        if (contact.c === 2) {
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
            key: "view0",
            icon: "human-profile",
            label: __(l[187]),
            onClick: function onClick() {
              loadSubPage('fm/account');
            }
          }));
        }

        if (contact.c === 1) {
          if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
            moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
              key: "startCall",
              className: "contains-submenu",
              icon: "context handset",
              label: __(l[19125]),
              onClick: function onClick() {
                megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
                  room.setActive();
                  room.startAudioCall();
                });
              }
            }));
            moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
              className: "dropdown body submenu",
              key: "dropdownGroup"
            }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
              key: "startAudio",
              icon: "context handset",
              label: __(l[1565]),
              onClick: function onClick() {
                megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
                  room.setActive();
                  room.startAudioCall();
                });
              }
            })), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
              key: "startVideo",
              icon: "context videocam",
              label: __(l[1566]),
              onClick: function onClick() {
                megaChat.createAndShowPrivateRoomFor(contact.u).then(function (room) {
                  room.setActive();
                  room.startVideoCall();
                });
              }
            }))));
          } else {
            moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
              key: "startChat",
              icon: "context conversation",
              label: __(l[5885]),
              onClick: function onClick() {
                loadSubPage('fm/chat/p/' + contact.u);
              }
            }));
          }

          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("hr", {
            key: "files-separator"
          }));
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
            key: "send-files-item",
            icon: "context arrow-in-circle",
            label: __(l[6834]),
            onClick: function onClick() {
              megaChat.openChatAndSendFilesDialog(contact.u);
            }
          }));
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
            key: "share-item",
            icon: "context share-folder",
            label: __(l[6775]),
            onClick: function onClick() {
              openCopyShareDialog(contact.u);
            }
          }));
        } else if (!contact.c) {
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
            key: "view2",
            icon: "small-icon icons-sprite grey-plus",
            label: __(l[101]),
            onClick: function onClick() {
              loadingDialog.show();
              var isAnonymousUser = !u_handle || u_type !== 3;
              var ADD_CONTACT = 'addContact';

              if (anonymouschat && isAnonymousUser) {
                megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);

                if (localStorage.getItem(ADD_CONTACT) === null) {
                  localStorage.setItem(ADD_CONTACT, JSON.stringify({
                    u: contact.u,
                    unixTime: unixtime()
                  }));
                }
              } else {
                M.syncContactEmail(contact.u).done(function (email) {
                  var exists = false;
                  Object.keys(M.opc).forEach(function (k) {
                    if (!exists && M.opc[k].m === email) {
                      exists = true;
                      return false;
                    }
                  });

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

              return;
            }
          }));
        } // Don't show Set Nickname button if not logged in or clicking your own name


        if (u_attr && contact.u !== u_handle) {
          // Add a Set Nickname button for contacts and non-contacts (who are visible in a group chat)
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("hr", {
            key: "nicknames-separator"
          }));
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["DropdownItem"], {
            key: "set-nickname",
            icon: "small-icon context writing-pen",
            label: __(l[20828]),
            onClick: function onClick() {
              nicknames.setNicknameDialog.init(contact.u);
            }
          }));
        }

        if (self.props.dropdownRemoveButton && self.props.dropdownRemoveButton.length) {
          moreDropdowns.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("hr", {
            key: "remove-separator"
          }));
          moreDropdowns.push(self.props.dropdownRemoveButton);
        }

        if (moreDropdowns.length > 0) {
          buttonComponent = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_buttons_jsx__WEBPACK_IMPORTED_MODULE_4__["Button"], {
            className: classes,
            icon: icon,
            disabled: moreDropdowns.length === 0 || self.props.dropdownDisabled,
            label: label
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_5__["Dropdown"], {
            className: "contact-card-dropdown",
            positionMy: dropdownPosition,
            positionAt: dropdownPosition,
            vertOffset: vertOffset,
            horizOffset: horizOffset,
            noArrow: true
          }, moreDropdowns));
        }
      }

      return buttonComponent;
    }
  }]);

  return ContactButton;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactButton.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactVerified =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(ContactVerified, _MegaRenderMixin3);

  function ContactVerified() {
    _classCallCheck(this, ContactVerified);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactVerified).apply(this, arguments));
  }

  _createClass(ContactVerified, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
    }
  }, {
    key: "render",
    value: function render() {
      if (anonymouschat) {
        return null;
      }

      var self = this;
      var contact = this.props.contact;

      if (!contact) {
        return null;
      }

      var verifiedElement = null;

      if (u_authring && u_authring.Ed25519) {
        var verifyState = u_authring.Ed25519[contact.u] || {};
        verifiedElement = verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-verified " + this.props.className
        }) : null;
      } else {
        var self = this;
        !pubEd25519[contact.u] && crypt.getPubEd25519(contact.u).done(function () {
          onIdle(function () {
            if (pubEd25519[contact.u] && self.isMounted()) {
              self.safeForceUpdate();
            }
          });
        });
      }

      return verifiedElement;
    }
  }]);

  return ContactVerified;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactVerified.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactPresence =
/*#__PURE__*/
function (_MegaRenderMixin4) {
  _inherits(ContactPresence, _MegaRenderMixin4);

  function ContactPresence() {
    _classCallCheck(this, ContactPresence);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactPresence).apply(this, arguments));
  }

  _createClass(ContactPresence, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'avatar']);
    }
  }, {
    key: "render",
    value: function render() {
      var contact = this.props.contact;
      var className = this.props.className || '';

      if (!contact || !contact.c) {
        return null;
      }

      var pres = megaChat.userPresenceToCssClass(contact.presence);
      return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "user-card-presence ".concat(pres, " ").concat(className)
      });
    }
  }]);

  return ContactPresence;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactPresence.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactFingerprint =
/*#__PURE__*/
function (_MegaRenderMixin5) {
  _inherits(ContactFingerprint, _MegaRenderMixin5);

  function ContactFingerprint() {
    _classCallCheck(this, ContactFingerprint);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactFingerprint).apply(this, arguments));
  }

  _createClass(ContactFingerprint, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var contact = this.props.contact;

      if (!contact || !contact.u || anonymouschat) {
        return null;
      }

      var infoBlocks = [];
      userFingerprint(contact.u, function (fingerprints) {
        fingerprints.forEach(function (v, k) {
          infoBlocks.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", {
            key: "fingerprint-" + k
          }, v));
        });
      });
      var verifyButton = null;

      if (contact.c === 1 && u_authring && u_authring.Ed25519) {
        var verifyState = u_authring.Ed25519[contact.u] || {};

        if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
          verifyButton = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_buttons_jsx__WEBPACK_IMPORTED_MODULE_4__["Button"], {
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
        fingerprintCode = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "dropdown-fingerprint"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "contact-fingerprint-title"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", null, __(l[6872])), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactVerified, {
          contact: contact
        })), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "contact-fingerprint-txt"
        }, infoBlocks), verifyButton);
      }

      return fingerprintCode;
    }
  }]);

  return ContactFingerprint;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactFingerprint.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var _noAvatars = {};
var Avatar =
/*#__PURE__*/
function (_MegaRenderMixin6) {
  _inherits(Avatar, _MegaRenderMixin6);

  function Avatar() {
    _classCallCheck(this, Avatar);

    return _possibleConstructorReturn(this, _getPrototypeOf(Avatar).apply(this, arguments));
  }

  _createClass(Avatar, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'avatar']);
    }
  }, {
    key: "render",
    value: function render() {
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
        verifiedElement = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactVerified, {
          contact: this.props.contact,
          className: this.props.verifiedClassName
        });
      }

      if (!avatars[contact.u] && !_noAvatars[contact.u]) {
        useravatar.loadAvatar(contact.u, pchandle).done(function () {
          self.safeForceUpdate();
        }).fail(function (e) {
          _noAvatars[contact.u] = true;
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
        displayedAvatar = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", _extends({
          className: classes,
          style: this.props.style
        }, extraProps, {
          onClick: self.props.onClick ? function (e) {
            $(document).trigger('closeDropdowns');
            self.props.onClick(e);
          } : self.onClick
        }), verifiedElement, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("img", {
          src: avatarMeta.avatar,
          style: this.props.imgStyles
        }));
      } else {
        classes += " color" + avatarMeta.avatar.colorIndex;
        displayedAvatar = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", _extends({
          className: classes,
          style: this.props.style
        }, extraProps, {
          onClick: self.props.onClick ? function (e) {
            $(document).trigger('closeDropdowns');
            self.props.onClick(e);
          } : self.onClick
        }), verifiedElement, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", null, avatarMeta.avatar.letters));
      }

      return displayedAvatar;
    }
  }]);

  return Avatar;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
Avatar.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactCard =
/*#__PURE__*/
function (_MegaRenderMixin7) {
  _inherits(ContactCard, _MegaRenderMixin7);

  function ContactCard() {
    _classCallCheck(this, ContactCard);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactCard).apply(this, arguments));
  }

  _createClass(ContactCard, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['presence', 'name', 'firstName', 'lastName', 'nickname', 'avatar']);
    }
  }, {
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate(nextProps, nextState) {
      var self = this;
      var foundKeys = Object.keys(self.props);

      if (foundKeys.indexOf('dropdowns') >= 0) {
        array.remove(foundKeys, 'dropdowns', true);
      }

      var shouldUpdate = undefined;
      foundKeys.forEach(function (k) {
        if (typeof shouldUpdate === 'undefined') {
          if (!shallowEqual(nextProps[k], self.props[k])) {
            shouldUpdate = false;
          } else {
            shouldUpdate = true;
          }
        }
      });

      if (!shouldUpdate) {
        // ^^ if false or undefined.
        if (!shallowEqual(nextState, self.state)) {
          shouldUpdate = false;
        } else {
          shouldUpdate = true;
        }
      }

      if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {
        // ^^ if still false or undefined.
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
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var contact = this.props.contact;

      if (!contact) {
        return null;
      }

      var pres = megaChat.userPresenceToCssClass(contact.presence);
      var avatarMeta = generateAvatarMeta(contact.u);
      var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

      if (contact.u == u_handle) {
        username += " (Me)";
      }

      var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
      var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
      var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
      var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];
      var usernameBlock;

      if (!noContextMenu) {
        usernameBlock = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactButton, {
          key: "lnk",
          dropdowns: dropdowns,
          noContextMenu: noContextMenu,
          contact: contact,
          className: "light",
          label: username,
          dropdownRemoveButton: dropdownRemoveButton
        });
      } else {
        usernameBlock = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-name light"
        }, username);
      }

      var userCard = null;
      var className = this.props.className || "";

      if (className.indexOf("short") >= 0) {
        var presenceRow;
        var lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;

        if (this.props.showLastGreen && contact.presence <= 2 && lastActivity) {
          presenceRow = (l[19994] || "Last seen %s").replace("%s", time2last(lastActivity));
        } else {
          presenceRow = M.onlineStatusClass(contact.presence)[0];
        }

        userCard = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-data"
        }, usernameBlock, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-status"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactPresence, {
          contact: contact,
          className: this.props.presenceClassName
        }), this.props.isInCall ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
          className: "small-icon audio-call"
        }) : null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", null, presenceRow)));
      } else {
        userCard = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-data"
        }, usernameBlock, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactPresence, {
          contact: contact,
          className: this.props.presenceClassName
        }), this.props.isInCall ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
          className: "small-icon audio-call"
        }) : null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-email"
        }, contact.m));
      }

      var selectionTick = null;

      if (this.props.selectable) {
        selectionTick = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "user-card-tick-wrap"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
          className: "small-icon mid-green-tick"
        }));
      }

      return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
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
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Avatar, {
        contact: contact,
        className: "avatar-wrapper small-rounded-avatar"
      }), anonymouschat || noContextButton ? null : react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactButton, {
        key: "button",
        dropdowns: dropdowns,
        dropdownIconClasses: self.props.dropdownIconClasses ? self.props.dropdownIconClasses : "",
        disabled: self.props.dropdownDisabled,
        noContextMenu: noContextMenu,
        contact: contact,
        className: self.props.dropdownButtonClasses,
        dropdownRemoveButton: dropdownRemoveButton
      }), selectionTick, userCard);
    }
  }]);

  return ContactCard;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactCard.defaultProps = {
  'dropdownButtonClasses': "default-white-button tiny-button",
  'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
  'presenceClassName': '',
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactItem =
/*#__PURE__*/
function (_MegaRenderMixin8) {
  _inherits(ContactItem, _MegaRenderMixin8);

  function ContactItem() {
    _classCallCheck(this, ContactItem);

    return _possibleConstructorReturn(this, _getPrototypeOf(ContactItem).apply(this, arguments));
  }

  _createClass(ContactItem, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'avatar']);
    }
  }, {
    key: "render",
    value: function render() {
      var classString = "nw-conversations-item";
      var self = this;
      var contact = this.props.contact;

      if (!contact) {
        return null;
      }

      var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);
      return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "selected-contact-card short"
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "remove-contact-bttn",
        onClick: function onClick(e) {
          if (self.props.onClick) {
            self.props.onClick(contact, e);
          }
        }
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
        className: "tiny-icon small-cross"
      })), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(Avatar, {
        contact: contact,
        className: "avatar-wrapper small-rounded-avatar",
        hideVerifiedBadge: true
      }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "user-card-data"
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactButton, {
        contact: contact,
        className: "light",
        label: username
      })));
    }
  }]);

  return ContactItem;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
;
var ContactPickerWidget =
/*#__PURE__*/
function (_MegaRenderMixin9) {
  _inherits(ContactPickerWidget, _MegaRenderMixin9);

  function ContactPickerWidget(props) {
    var _this;

    _classCallCheck(this, ContactPickerWidget);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ContactPickerWidget).call(this, props));
    _this.state = {
      'searchValue': '',
      'selected': _this.props.selected || false
    };
    return _this;
  }

  _createClass(ContactPickerWidget, [{
    key: "onSearchChange",
    value: function onSearchChange(e) {
      var self = this;
      self.setState({
        searchValue: e.target.value
      });
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(ContactPickerWidget.prototype), "componentDidMount", this).call(this);

      setContactLink();
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;

      if (self.scrollToLastSelected && self.psSelected) {
        // set the flag back to false, so on next updates we won't scroll to the last item again.
        self.scrollToLastSelected = false;
        self.psSelected.scrollToPercentX(100, false);
      }

      setContactLink();
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;

      if (self.props.multiple) {
        var KEY_ENTER = 13;
        $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function (e) {
          var keyCode = e.which || e.keyCode;

          if (keyCode === KEY_ENTER) {
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
        self._foundFrequents = r.reverse().splice(0, 30);
        self.safeForceUpdate();
      });
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ContactPickerWidget.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      delete self._foundFrequents;
      delete self._frequents;

      if (self.props.multiple) {
        $(document.body).off('keypress.contactPicker' + self.getUniqueId());
      }
    }
  }, {
    key: "_eventuallyAddContact",
    value: function _eventuallyAddContact(v, contacts, selectableContacts, forced) {
      var self = this;

      if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
        // continue;
        return false;
      }

      var isDisabled = false;

      if (!self.wasMissingKeysForContacts) {
        self.wasMissingKeysForContacts = {};
      }

      if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
        // we don't want to preload keys each time...e.g. we want to only load them when needed, so ensure they
        // are loaded here
        self.wasMissingKeysForContacts[v.u] = true;

        ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u]).always(function () {
          if (self.isMounted()) {
            self.safeForceUpdate();
          }
        });

        isDisabled = true;
        return true;
      } else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
        // keys not loaded, don't allow starting of new chats/any interaction with that user yet
        return false;
      }

      var pres = megaChat.getPresence(v.u);

      if (!forced && (v.c != 1 || v.u == u_handle)) {
        return false;
      }

      var avatarMeta = generateAvatarMeta(v.u);

      if (self.state.searchValue && self.state.searchValue.length > 0) {
        // DON'T add to the contacts list if the contact's name or email does not match the search value
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

      contacts.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactCard, {
        disabled: isDisabled,
        contact: v,
        className: "contacts-search short " + selectedClass + (isDisabled ? " disabled" : ""),
        noContextButton: "true",
        selectable: selectableContacts,
        onClick: self.props.readOnly ? function () {} : function (contact, e) {
          if (isDisabled) {
            return false;
          }

          var contactHash = contact.u; // differentiate between a click and a double click.

          if (contactHash === self.lastClicked && new Date() - self.clickTime < 500 || !self.props.multiple) {
            // is a double click
            if (self.props.onSelected) {
              self.props.onSelected([contactHash]);
            }

            self.props.onSelectDone([contactHash]);
            return;
          } else {
            var selected = clone(self.state.selected || []); // is a single click

            if (selected.indexOf(contactHash) === -1) {
              selected.push(contactHash); // only set the scrollToLastSelected if a contact was added,
              // so that the user can scroll left/right and remove contacts
              // form the list using the X buttons in the UI.

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
    }
  }, {
    key: "render",
    value: function render() {
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
        (self.state.selected || []).forEach(function (v, k) {
          contactsSelected.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactItem, {
            contact: M.u[v],
            key: v
          }));
        });
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

        var onContactSelectDoneCb = function onContactSelectDoneCb(contact, e) {
          var contactHash = contact.u; // differentiate between a click and a double click.

          if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {
            // is a double click
            if (self.props.onSelected) {
              self.props.onSelected([contactHash]);
            }

            self.props.onSelectDone([contactHash]);
            return;
          } else {
            var selected = clone(self.state.selected || []); // is a single click

            if (selected.indexOf(contactHash) === -1) {
              selected.push(contactHash); // only set the scrollToLastSelected if a contact was added, so that the user can scroll
              // left/right and remove contacts form the list using the X buttons in the UI

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
          multipleContacts = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "horizontal-contacts-list"
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-list-empty-txt"
          }, self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : l[8889]));
        } else {
          selectedContacts = true;
          onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
          (self.state.selected || []).forEach(function (v, k) {
            contactsSelected.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(ContactItem, {
              contact: M.u[v],
              onClick: onContactSelectDoneCb,
              key: v
            }));
          });
          multipleContacts = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "horizontal-contacts-list"
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_perfectScrollbar_jsx__WEBPACK_IMPORTED_MODULE_3__["PerfectScrollbar"], {
            className: "perfectScrollbarContainer selected-contact-block horizontal-only",
            selected: this.state.selected,
            ref: function ref(psSelected) {
              self.psSelected = psSelected;
            }
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "select-contact-centre",
            style: {
              width: selectedWidth
            }
          }, contactsSelected)));
        }

        if (self.props.selectFooter) {
          selectFooter = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "fm-dialog-footer"
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("a", {
            className: "default-white-button left",
            onClick: onAddContact.bind(self)
          }, l[71]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("a", {
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
          _topButtons.push(react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "link-button light",
            key: button.key,
            onClick: function onClick(e) {
              e.preventDefault();
              e.stopPropagation(); // trigger dropdown close.

              $(document).trigger('closeDropdowns');
              button.onClick(e);
            }
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
            className: "small-icon " + button.icon
          }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", null, button.title)));
        });
        topButtons = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
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

      self.props.contacts.forEach(function (v, k) {
        !alreadyAdded[v.h] && self._eventuallyAddContact(v, contacts, selectableContacts);
      });
      var sortFn = M.getSortByNameFn2(1);
      contacts.sort(function (a, b) {
        return sortFn(a.props.contact, b.props.contact);
      });

      if (Object.keys(alreadyAdded).length === 0) {
        hideFrequents = true;
      }

      var innerDivStyles = {}; // if (contacts.length < 6) {
      // innerDivStyles['height'] = Math.max(48, contacts.length * 48);
      // innerDivStyles['overflow'] = "visible";
      // }

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
          contacts = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("em", null, noContactsMsg);
        }
      }

      var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;
      var contactsList;

      if (haveContacts) {
        if (frequentContacts.length === 0 && noOtherContacts) {
          contactsList = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "chat-contactspicker-no-contacts"
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-list-header"
          }, l[165]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "fm-empty-contacts-bg"
          }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "fm-empty-cloud-txt small"
          }, l[784]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "fm-empty-description small"
          }, l[19115]));
        } else {
          contactsList = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_utils_jsx__WEBPACK_IMPORTED_MODULE_2__["default"].JScrollPane, {
            className: "contacts-search-scroll",
            selected: this.state.selected,
            changedHashProp: this.props.changedHashProp,
            searchValue: this.state.searchValue
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", null, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-search-subsection",
            style: {
              'display': !hideFrequents ? "" : "none"
            }
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-list-header"
          }, l[20141]), frequentsLoading ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "loading-spinner"
          }, "...") : react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-search-list",
            style: innerDivStyles
          }, frequentContacts)), contacts.length > 0 ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-search-subsection"
          }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-list-header"
          }, !frequentsLoading && frequentContacts.length === 0 ? !self.props.readOnly ? l[165] : l[16217] : l[165]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
            className: "contacts-search-list",
            style: innerDivStyles
          }, contacts)) : undefined));
        }
      } else {
        contactsList = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "chat-contactspicker-no-contacts"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "contacts-list-header"
        }, l[165]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "fm-empty-contacts-bg"
        }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "fm-empty-cloud-txt small"
        }, l[784]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "fm-empty-description small"
        }, l[19115]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: " big-red-button fm-empty-button",
          onClick: function onClick(e) {
            contactAddDialog();
          }
        }, l[101]), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
          className: "empty-share-public"
        }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
          className: "small-icon icons-sprite grey-chain"
        }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("span", {
          dangerouslySetInnerHTML: {
            __html: l[19111]
          }
        })));
        extraClasses += " no-contacts";
      }

      var displayStyle = self.state.searchValue && self.state.searchValue.length > 0 ? "" : "none";
      return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: this.props.className + " " + extraClasses
      }, multipleContacts, !self.props.readOnly && haveContacts ? react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        className: "contacts-search-header " + this.props.headerClasses
      }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("i", {
        className: "small-icon thin-search-icon"
      }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("input", {
        autoFocus: true,
        type: "search",
        placeholder: __(l[8010]),
        ref: "contactSearchField",
        onChange: this.onSearchChange.bind(this),
        value: this.state.searchValue
      }), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("div", {
        onClick: function onClick(e) {
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
    }
  }]);

  return ContactPickerWidget;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(react__WEBPACK_IMPORTED_MODULE_0___default.a.Component));
ContactPickerWidget.defaultProps = {
  multipleSelectedButtonLabel: false,
  singleSelectedButtonLabel: false,
  nothingSelectedButtonLabel: false,
  allowEmpty: false
};
;

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);


/**
 * jScrollPane helper
 * @type {*|Function}
 */

var JScrollPane =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(JScrollPane, _MegaRenderMixin);

  function JScrollPane() {
    _classCallCheck(this, JScrollPane);

    return _possibleConstructorReturn(this, _getPrototypeOf(JScrollPane).apply(this, arguments));
  }

  _createClass(JScrollPane, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(JScrollPane.prototype), "componentDidMount", this).call(this);

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
        } // if (e.target.className.indexOf("textarea-scroll") > -1) {
        //     return;
        // }
        //
        // if (self.lastScrollPosition === scrollPositionY || self.scrolledToBottom !== 1) {
        //     return;
        // }
        //
        // if (scrollPositionY < 350 && !isAtBottom && self.$messages.is(":visible")) {
        //     if (
        //         self.lastUpdatedScrollHeight !== $jsp.getContentHeight() &&
        //         !self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() &&
        //         self.props.chatRoom.messagesBuff.haveMoreHistory()
        //     ) {
        //         self.props.chatRoom.messagesBuff.retrieveChatHistory();
        //         self.forceUpdate();
        //         self.lastUpdatedScrollHeight = $jsp.getContentHeight();
        //         self.shouldMaintainScroll = true;
        //     }
        // }
        //
        // if (isAtBottom) {
        //     self.lastScrolledToBottom = true;
        // }
        // else {
        //     self.lastScrolledToBottom = false;
        // }
        //
        // self.lastScrollHeight = $jsp.getContentHeight();
        // self.lastScrollPosition = scrollPositionY;
        // self.lastScrollPositionPerc = $jsp.getPercentScrolledY();

      });
      $elem.rebind('forceResize.jsp' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
        self.onResize(forced, scrollPositionYPerc, scrollToElement);
      });
      $(window).rebind('resize.jsp' + self.getUniqueId(), self.onResize.bind(self));
      self.onResize();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(JScrollPane.prototype), "componentWillUnmount", this).call(this);

      var $elem = $(ReactDOM.findDOMNode(this));
      $elem.off('jsp-will-scroll-y.jsp' + this.getUniqueId());
      $(window).off('resize.jsp' + this.getUniqueId());
    }
  }, {
    key: "eventuallyReinitialise",
    value: function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
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
    }
  }, {
    key: "_doReinit",
    value: function _doReinit(scrollPositionYPerc, scrollToElement, currHeights, forced, $elem) {
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
    }
  }, {
    key: "onResize",
    value: function onResize(forced, scrollPositionYPerc, scrollToElement) {
      if (forced && forced.originalEvent) {
        forced = true;
        scrollPositionYPerc = undefined;
      }

      this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this.onResize();
    }
  }, {
    key: "render",
    value: function render() {
      return React.makeElement("div", {
        className: this.props.className
      }, React.makeElement("div", {
        className: "jspContainer"
      }, React.makeElement("div", {
        className: "jspPane"
      }, this.props.children)));
    }
  }]);

  return JScrollPane;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

JScrollPane.defaultProps = {
  className: "jScrollPaneContainer",
  requiresUpdateOnResize: true
};
;
/**
 * A trick copied from http://jamesknelson.com/rendering-react-components-to-the-document-body/
 * so that we can render Dialogs into the body or other child element, different then the current component's child.
 */

var RenderTo =
/*#__PURE__*/
function (_React$Component) {
  _inherits(RenderTo, _React$Component);

  function RenderTo() {
    _classCallCheck(this, RenderTo);

    return _possibleConstructorReturn(this, _getPrototypeOf(RenderTo).apply(this, arguments));
  }

  _createClass(RenderTo, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      if (_get(_getPrototypeOf(RenderTo.prototype), "componentDidMount", this)) {
        _get(_getPrototypeOf(RenderTo.prototype), "componentDidMount", this).call(this);
      }

      this.popup = document.createElement("div");
      this.popup.className = this.props.className ? this.props.className : "";

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
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this._renderLayer();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      if (_get(_getPrototypeOf(RenderTo.prototype), "componentWillUnmount", this)) {
        _get(_getPrototypeOf(RenderTo.prototype), "componentWillUnmount", this).call(this);
      }

      ReactDOM.unmountComponentAtNode(this.popup);

      if (this.props.popupWillUnmount) {
        this.props.popupWillUnmount(this.popup);
      }

      this.props.element.removeChild(this.popup);
    }
  }, {
    key: "_renderLayer",
    value: function _renderLayer(cb) {
      ReactDOM.render(this.props.children, this.popup, cb);
    }
  }, {
    key: "render",
    value: function render() {
      // Render a placeholder
      return null;
    }
  }]);

  return RenderTo;
}(React.Component);

;

var EmojiFormattedContent =
/*#__PURE__*/
function (_React$Component2) {
  _inherits(EmojiFormattedContent, _React$Component2);

  function EmojiFormattedContent() {
    _classCallCheck(this, EmojiFormattedContent);

    return _possibleConstructorReturn(this, _getPrototypeOf(EmojiFormattedContent).apply(this, arguments));
  }

  _createClass(EmojiFormattedContent, [{
    key: "_eventuallyUpdateInternalState",
    value: function _eventuallyUpdateInternalState(props) {
      if (!props) {
        props = this.props;
      }

      assert(typeof props.children === "string", "EmojiFormattedContent received a non-string (got: " + _typeof(props.children) + ") as props.children");
      var str = props.children;

      if (this._content !== str) {
        this._content = str;
        this._formattedContent = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(str));
      }
    }
  }, {
    key: "shouldComponentUpdate",
    value: function shouldComponentUpdate(nextProps, nextState) {
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
    }
  }, {
    key: "render",
    value: function render() {
      this._eventuallyUpdateInternalState();

      return React.makeElement("span", {
        dangerouslySetInnerHTML: {
          __html: this._formattedContent
        }
      });
    }
  }]);

  return EmojiFormattedContent;
}(React.Component);

;

function SoonFcWrap(milliseconds) {
  return function (target, propertyKey, descriptor) {
    var originalMethod = descriptor.value;
    var _timerId = 0;

    descriptor.value = function () {
      if (_timerId) {
        clearTimeout(_timerId);
      }

      var self = this;
      var args = arguments; // Like SoonFc, but with context fix.

      _timerId = setTimeout(function () {
        originalMethod.apply(self, args);
      }, milliseconds);
    };

    return descriptor;
  };
}

;
/* harmony default export */ __webpack_exports__["default"] = ({
  JScrollPane: JScrollPane,
  RenderTo: RenderTo,
  EmojiFormattedContent: EmojiFormattedContent,
  SoonFcWrap: SoonFcWrap
});

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = ReactDOM;

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Dropdown", function() { return Dropdown; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DropdownContactsSelector", function() { return DropdownContactsSelector; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DropdownItem", function() { return DropdownItem; });
/* harmony import */ var _utils_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var _chat_ui_contacts_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);




var Dropdown =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(Dropdown, _MegaRenderMixin);

  function Dropdown(props) {
    var _this;

    _classCallCheck(this, Dropdown);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Dropdown).call(this, props));
    _this.onActiveChange = _this.onActiveChange.bind(_assertThisInitialized(_this));
    _this.onResized = _this.onResized.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(Dropdown, [{
    key: "componentWillUpdate",
    value: function componentWillUpdate(nextProps, nextState) {
      if (this.props.active != nextProps.active) {
        this.onActiveChange(nextProps.active);
      }
    }
  }, {
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate(nextProps, nextState) {
      if (this.props.active != nextProps.active) {
        if (this.props.onBeforeActiveChange) {
          this.props.onBeforeActiveChange(nextProps.active);
        }

        return true;
      } else if (this.props.focused != nextProps.focused) {
        return true;
      } else if (this.state && this.state.active != nextState.active) {
        return true;
      } else {
        // not sure, leave to the render mixing to decide.
        return undefined;
      }
    }
  }, {
    key: "onActiveChange",
    value: function onActiveChange(newVal) {
      if (this.props.onActiveChange) {
        this.props.onActiveChange(newVal);
      }
    }
  }, {
    key: "onResized",
    value: function onResized() {
      var self = this;

      if (this.props.active === true) {
        if (this.popupElement) {
          var $element = $(this.popupElement);
          var $positionToElement = $('.button.active:visible');

          if ($positionToElement.length === 0) {
            return;
          }

          var offsetLeft = 0;
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
              var vertOffset = 0;
              var horizOffset = 0;

              if (!self.props.noArrow) {
                var $arrow = $('.dropdown-white-arrow', $element);
                var arrowHeight;

                if (self.props.arrowHeight) {
                  arrowHeight = self.props.arrowHeight;

                  if (info.vertical !== "top") {
                    arrowHeight *= -1;
                  } else {
                    arrowHeight = 0;
                  }
                } else {
                  arrowHeight = $arrow.outerHeight();
                }

                if (info.vertical != "top") {
                  $(this).removeClass("up-arrow").addClass("down-arrow");
                } else {
                  $(this).removeClass("down-arrow").addClass("up-arrow");
                }

                vertOffset += info.vertical == "top" ? arrowHeight : 0;
              }

              if (self.props.vertOffset) {
                vertOffset += self.props.vertOffset * (info.vertical == "top" ? 1 : -1);
              }

              if (self.props.horizOffset) {
                horizOffset += self.props.horizOffset;
              }

              $(this).css({
                left: obj.left + (offsetLeft ? offsetLeft / 2 : 0) + horizOffset + 'px',
                top: obj.top + vertOffset + 'px'
              });
            }
          });
        }
      }
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(Dropdown.prototype), "componentDidMount", this).call(this);

      $(window).rebind('resize.drpdwn' + this.getUniqueId(), this.onResized);
      this.onResized();
      var self = this;
      $(document.body).rebind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId(), function (e, target) {
        if (self.props.active && target !== self) {
          if (self.props && self.props.closeDropdown) {
            self.props.closeDropdown();
          }
        }
      });
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this.onResized();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(Dropdown.prototype), "componentWillUnmount", this).call(this);

      $(document.body).unbind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId());

      if (this.props.active) {
        // fake an active=false so that any onActiveChange handlers would simply trigger back UI to the state
        // in which this element is not active any more (since it would be removed from the DOM...)
        this.onActiveChange(false);
      }

      $(window).unbind('resize.drpdwn' + this.getUniqueId());
    }
  }, {
    key: "doRerender",
    value: function doRerender() {
      var self = this;
      setTimeout(function () {
        self.safeForceUpdate();
      }, 100); // idb + DOM updates = delayed update so .onResized won't properly reposition the DOM node using $.position,
      // so we need to manually call this

      setTimeout(function () {
        self.onResized();
      }, 200);
    }
  }, {
    key: "renderChildren",
    value: function renderChildren() {
      var self = this;
      return React.Children.map(this.props.children, function (child) {
        if (child) {
          var activeVal = self.props.active || self.state.active;
          activeVal = String(activeVal);
          return React.cloneElement(child, {
            active: activeVal
          });
        } else {
          return null;
        }
      }.bind(this));
    }
  }, {
    key: "render",
    value: function render() {
      if (this.props.active !== true) {
        return null;
      } else {
        var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;
        var styles; // calculate and move the popup arrow to the correct position.

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
          child = React.makeElement("div", null, self.renderChildren());
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

        return React.makeElement(_utils_jsx__WEBPACK_IMPORTED_MODULE_0__["default"].RenderTo, {
          element: document.body,
          className: classes,
          style: styles,
          popupDidMount: function popupDidMount(popupElement) {
            self.popupElement = popupElement;
            self.onResized();
          },
          popupWillUnmount: function popupWillUnmount(popupElement) {
            delete self.popupElement;
          }
        }, React.makeElement("div", {
          onClick: function onClick(e) {
            $(document.body).trigger('closeAllDropdownsExcept', self);
          }
        }, !this.props.noArrow ? React.makeElement("i", {
          className: "dropdown-white-arrow"
        }) : null, child));
      }
    }
  }]);

  return Dropdown;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));
Dropdown.defaultProps = {
  'requiresUpdateOnResize': true
};
;
var DropdownContactsSelector =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(DropdownContactsSelector, _MegaRenderMixin2);

  function DropdownContactsSelector(props) {
    var _this2;

    _classCallCheck(this, DropdownContactsSelector);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(DropdownContactsSelector).call(this, props));
    _this2.state = {
      'selected': _this2.props.selected ? _this2.props.selected : []
    };
    _this2.onSelectClicked = _this2.onSelectClicked.bind(_assertThisInitialized(_this2));
    _this2.onSelected = _this2.onSelected.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(DropdownContactsSelector, [{
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate(nextProps, nextState) {
      if (this.props.active != nextProps.active) {
        return true;
      } else if (this.props.focused != nextProps.focused) {
        return true;
      } else if (this.state && this.state.active != nextState.active) {
        return true;
      } else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
        return true;
      } else {
        // not sure, leave to the render mixing to decide.
        return undefined;
      }
    }
  }, {
    key: "onSelected",
    value: function onSelected(nodes) {
      this.setState({
        'selected': nodes
      });

      if (this.props.onSelected) {
        this.props.onSelected(nodes);
      }

      this.forceUpdate();
    }
  }, {
    key: "onSelectClicked",
    value: function onSelectClicked() {
      this.props.onSelectClicked();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      return React.makeElement(Dropdown, {
        className: "popup contacts-search " + this.props.className + " tooltip-blur",
        active: this.props.active,
        closeDropdown: this.props.closeDropdown,
        ref: "dropdown",
        positionMy: this.props.positionMy,
        positionAt: this.props.positionAt,
        arrowHeight: this.props.arrowHeight,
        vertOffset: this.props.vertOffset
      }, React.makeElement(_chat_ui_contacts_jsx__WEBPACK_IMPORTED_MODULE_2__["ContactPickerWidget"], {
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
    }
  }]);

  return DropdownContactsSelector;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));
DropdownContactsSelector.defaultProps = {
  requiresUpdateOnResize: true
};
;
var DropdownItem =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(DropdownItem, _MegaRenderMixin3);

  function DropdownItem(props) {
    var _this3;

    _classCallCheck(this, DropdownItem);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(DropdownItem).call(this, props));
    _this3.state = {
      'isClicked': false
    };
    _this3.onClick = _this3.onClick.bind(_assertThisInitialized(_this3));
    _this3.onMouseOver = _this3.onMouseOver.bind(_assertThisInitialized(_this3));
    return _this3;
  }

  _createClass(DropdownItem, [{
    key: "renderChildren",
    value: function renderChildren() {
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
      }.bind(this));
    }
  }, {
    key: "onClick",
    value: function onClick(e) {
      var self = this;

      if (this.props.children) {
        self.setState({
          'isClicked': !self.state.isClicked
        });
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }, {
    key: "onMouseOver",
    value: function onMouseOver(e) {
      var self = this;

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
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var icon;

      if (self.props.icon) {
        icon = React.makeElement("i", {
          className: "small-icon " + self.props.icon
        });
      }

      var label;

      if (self.props.label) {
        label = self.props.label;
      }

      var child = null;
      child = React.makeElement("div", null, self.renderChildren());
      return React.makeElement("div", {
        className: "dropdown-item ".concat(self.props.className ? self.props.className : ''),
        onClick: self.props.onClick ? function (e) {
          $(document).trigger('closeDropdowns');
          !self.props.disabled && self.props.onClick(e);
        } : self.onClick,
        onMouseOver: self.onMouseOver
      }, icon, React.makeElement("span", null, label), child);
    }
  }]);

  return DropdownItem;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));
DropdownItem.defaultProps = {
  requiresUpdateOnResize: true
};
;

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _utils_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var _tooltips_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(12);
/* harmony import */ var _forms_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(14);
function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);






var ContactsUI = __webpack_require__(2);

var ExtraFooterElement =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(ExtraFooterElement, _MegaRenderMixin);

  function ExtraFooterElement() {
    _classCallCheck(this, ExtraFooterElement);

    return _possibleConstructorReturn(this, _getPrototypeOf(ExtraFooterElement).apply(this, arguments));
  }

  _createClass(ExtraFooterElement, [{
    key: "render",
    value: function render() {
      return this.props.children;
    }
  }]);

  return ExtraFooterElement;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

;

var ModalDialog =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(ModalDialog, _MegaRenderMixin2);

  function ModalDialog(props) {
    var _this;

    _classCallCheck(this, ModalDialog);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ModalDialog).call(this, props));
    _this.onBlur = _this.onBlur.bind(_assertThisInitialized(_this));
    _this.onCloseClicked = _this.onCloseClicked.bind(_assertThisInitialized(_this));
    _this.onPopupDidMount = _this.onPopupDidMount.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(ModalDialog, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(ModalDialog.prototype), "componentDidMount", this).call(this);

      var self = this;
      $(document.body).addClass('overlayed');
      $('.fm-dialog-overlay').removeClass('hidden'); // blur the chat textarea if its selected.

      $('textarea:focus').trigger("blur");
      document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
      document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);
      $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function (e) {
        if (e.keyCode == 27) {
          // escape key maps to keycode `27`
          self.onBlur();
        }
      });
    }
  }, {
    key: "onBlur",
    value: function onBlur(e) {
      var $element = $(ReactDOM.findDOMNode(this));

      if (!e || !$(e.target).closest(".fm-dialog").is($element)) {
        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        this.onCloseClicked();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ModalDialog.prototype), "componentWillUnmount", this).call(this);

      document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
      $(document).off('keyup.modalDialog' + this.getUniqueId());
      $(document.body).removeClass('overlayed');
      $('.fm-dialog-overlay').addClass('hidden');
      $(window).off('resize.modalDialog' + this.getUniqueId());
    }
  }, {
    key: "onCloseClicked",
    value: function onCloseClicked(e) {
      var self = this;

      if (self.props.onClose) {
        self.props.onClose(self);
      }
    }
  }, {
    key: "onPopupDidMount",
    value: function onPopupDidMount(elem) {
      this.domNode = elem;

      if (this.props.popupDidMount) {
        // bubble up...
        this.props.popupDidMount(elem);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var classes = "fm-dialog fm-modal-dialog " + self.props.className;
      var footer = null;
      var extraFooterElements = [];
      var otherElements = [];
      var x = 0;
      React.Children.forEach(self.props.children, function (child) {
        if (!child) {
          // skip if undefined
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
        self.props.buttons.forEach(function (v) {
          buttons.push(React.makeElement("a", {
            className: (v.defaultClassname ? v.defaultClassname : "default-white-button right") + (v.className ? " " + v.className : ""),
            onClick: function onClick(e) {
              if ($(e.target).is(".disabled")) {
                return false;
              }

              if (v.onClick) {
                v.onClick(e, self);
              }
            },
            key: v.key
          }, v.iconBefore ? React.makeElement("i", {
            className: v.iconBefore
          }) : null, v.label, v.iconAfter ? React.makeElement("i", {
            className: v.iconAfter
          }) : null));
        });
        footer = React.makeElement("div", {
          className: "fm-dialog-footer white"
        }, extraFooterElements, buttons, React.makeElement("div", {
          className: "clear"
        }));
      }

      return React.makeElement(_utils_jsx__WEBPACK_IMPORTED_MODULE_0__["default"].RenderTo, {
        element: document.body,
        className: classes,
        popupDidMount: this.onPopupDidMount
      }, React.makeElement("div", null, React.createElement("div", {
        className: "fm-dialog-close",
        onClick: self.onCloseClicked
      }), self.props.title ? React.makeElement("div", {
        className: "fm-dialog-title"
      }, self.props.title) : null, React.makeElement("div", {
        className: "fm-dialog-content"
      }, otherElements), footer));
    }
  }]);

  return ModalDialog;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

ModalDialog.defaultProps = {
  'hideable': true
};
;

var SelectContactDialog =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(SelectContactDialog, _MegaRenderMixin3);

  function SelectContactDialog(props) {
    var _this2;

    _classCallCheck(this, SelectContactDialog);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(SelectContactDialog).call(this, props));
    _this2.state = {
      'selected': _this2.props.selected ? _this2.props.selected : []
    };
    _this2.onSelected = _this2.onSelected.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(SelectContactDialog, [{
    key: "onSelected",
    value: function onSelected(nodes) {
      this.setState({
        'selected': nodes
      });

      if (this.props.onSelected) {
        this.props.onSelected(nodes);
      }
    }
  }, {
    key: "onSelectClicked",
    value: function onSelectClicked() {
      this.props.onSelectClicked();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var classes = "send-contact contrast small-footer " + self.props.className;
      return React.makeElement(ModalDialog, {
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
      }, React.makeElement(ContactsUI.ContactPickerWidget, {
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
    }
  }]);

  return SelectContactDialog;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

SelectContactDialog.clickTime = 0;
SelectContactDialog.defaultProps = {
  'selectLabel': __(l[1940]),
  'cancelLabel': __(l[82]),
  'hideable': true
};
;

var ConfirmDialog =
/*#__PURE__*/
function (_MegaRenderMixin4) {
  _inherits(ConfirmDialog, _MegaRenderMixin4);

  function ConfirmDialog(props) {
    var _this3;

    _classCallCheck(this, ConfirmDialog);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(ConfirmDialog).call(this, props));
    _this3._wasAutoConfirmed = undefined;
    return _this3;
  }

  _createClass(ConfirmDialog, [{
    key: "unbindEvents",
    value: function unbindEvents() {
      $(document).off('keyup.confirmDialog' + this.getUniqueId());
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(ConfirmDialog.prototype), "componentDidMount", this).call(this);

      var self = this; // since ModalDialogs can be opened in other keyup (on enter) event handlers THIS is required to be delayed a
      // bit...otherwise the dialog would open up and get immediately confirmed

      setTimeout(function () {
        if (!self.isMounted()) {
          // can be automatically hidden/unmounted, so this would bind the event AFTER the unbind in
          // componentWillUnmount executed.
          return;
        }

        $(document).rebind('keyup.confirmDialog' + self.getUniqueId(), function (e) {
          if (e.which === 13 || e.keyCode === 13) {
            if (!self.isMounted()) {
              // we need to be 10000% sure that the dialog is still shown, otherwise, we may trigger some
              // unwanted action.
              self.unbindEvents();
              return;
            }

            self.onConfirmClicked();
            return false;
          }
        });
      }, 75);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ConfirmDialog.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      self.unbindEvents();
      delete this._wasAutoConfirmed;
    }
  }, {
    key: "onConfirmClicked",
    value: function onConfirmClicked() {
      this.unbindEvents();

      if (this.props.onConfirmClicked) {
        this.props.onConfirmClicked();
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;

      if (self.props.dontShowAgainCheckbox && mega.config.get('confirmModal_' + self.props.name) === true) {
        if (this._wasAutoConfirmed) {
          return null;
        }

        if (this.props.onConfirmClicked) {
          this._wasAutoConfirmed = 1; // this would most likely cause a .setState, so it should be done in a separate cycle/call stack.

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
        dontShowCheckbox = React.makeElement("div", {
          className: "footer-checkbox"
        }, React.makeElement(_forms_jsx__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"].Checkbox, {
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

      return React.makeElement(ModalDialog, {
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
      }, React.makeElement("div", {
        className: "fm-dialog-content"
      }, self.props.children), React.makeElement(ExtraFooterElement, null, dontShowCheckbox));
    }
  }]);

  return ConfirmDialog;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

ConfirmDialog.defaultProps = {
  'confirmLabel': __(l[6826]),
  'cancelLabel': __(l[82]),
  'dontShowAgainCheckbox': true,
  'hideable': true
};
;
/* harmony default export */ __webpack_exports__["a"] = ({
  ModalDialog: ModalDialog,
  SelectContactDialog: SelectContactDialog,
  ConfirmDialog: ConfirmDialog,
  ExtraFooterElement: ExtraFooterElement
});

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Button", function() { return Button; });
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);

var utils = __webpack_require__(3);


var _buttonGroups = {};
var Button =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(Button, _MegaRenderMixin);

  function Button(props) {
    var _this;

    _classCallCheck(this, Button);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Button).call(this, props));
    _this.state = {
      'focused': false
    };
    _this.onClick = _this.onClick.bind(_assertThisInitialized(_this));
    _this.onBlur = _this.onBlur.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(Button, [{
    key: "componentWillUpdate",
    value: function componentWillUpdate(nextProps, nextState) {
      var self = this;

      if (nextProps.disabled === true && nextState.focused === true) {
        nextState.focused = false;
      }

      if (this.state.focused != nextState.focused && nextState.focused === true) {
        $('.conversationsApp').rebind('mousedown.button' + self.getUniqueId(), this.onBlur);
        $(document).rebind('keyup.button' + self.getUniqueId(), function (e) {
          if (self.state.focused === true) {
            if (e.keyCode == 27) {
              // escape key maps to keycode `27`
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
        $(document).rebind('closeDropdowns.' + self.getUniqueId(), function (e) {
          self.onBlur();
        }); // change the focused state to any other buttons in this group

        if (this.props.group) {
          if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] != this) {
            _buttonGroups[this.props.group].setState({
              focused: false
            });

            _buttonGroups[this.props.group].unbindEvents();
          }

          _buttonGroups[this.props.group] = this;
        }
      } // deactivate group if focused => false and i'm the currently "focused" in the group


      if (this.props.group && nextState.focused === false && _buttonGroups[this.props.group] == this) {
        _buttonGroups[this.props.group] = null;
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(Button.prototype), "componentWillUnmount", this).call(this);

      this.unbindEvents();
    }
  }, {
    key: "renderChildren",
    value: function renderChildren() {
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
                // disable scrolling
                $scrollables.attr('data-scroll-disabled', true);
                $scrollables.filter('.perfectScrollbarContainer').each(function (k, element) {
                  Ps.disable(element);
                });
              } else {
                // enable back scrolling
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
    }
  }, {
    key: "onBlur",
    value: function onBlur(e) {
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
    }
  }, {
    key: "unbindEvents",
    value: function unbindEvents() {
      var self = this;
      $(document).off('keyup.button' + self.getUniqueId());
      $(document).off('closeDropdowns.' + self.getUniqueId());
      $('.conversationsApp').unbind('mousedown.button' + self.getUniqueId());

      if (self._pageChangeListener) {
        mBroadcaster.removeListener(self._pageChangeListener);
      }
    }
  }, {
    key: "onClick",
    value: function onClick(e) {
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
          // does it contain some kind of a popup/container?
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
    }
  }, {
    key: "render",
    value: function render() {
      var classes = this.props.className ? "button ".concat(this.props.className) : "button";

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
        icon = React.makeElement("i", {
          className: "small-icon " + this.props.icon
        });
      }

      return React.makeElement("div", {
        className: classes,
        onClick: this.onClick,
        style: this.props.style ? this.props.style : null
      }, icon, React.makeElement("span", null, label), this.renderChildren());
    }
  }]);

  return Button;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));
;

/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConversationMessageMixin", function() { return ConversationMessageMixin; });
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var utils = __webpack_require__(3);



var ConversationMessageMixin =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(ConversationMessageMixin, _MegaRenderMixin);

  function ConversationMessageMixin(props) {
    var _this;

    _classCallCheck(this, ConversationMessageMixin);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ConversationMessageMixin).call(this, props));
    _this.onAfterRenderWasTriggered = false;
    return _this;
  }

  _createClass(ConversationMessageMixin, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;
      var chatRoom = self.props.message.chatRoom;
      var megaChat = chatRoom.megaChat;
      var contact = self.getContact();

      var changedCb = function changedCb(contact, oldData, k, v) {
        if (k === "ts" || k === "ats") {
          // no updates needed in case of 'ts' change
          // e.g. reduce recursion of full history re-render in case of a new message is sent to a room.
          return;
        }

        self.debouncedForceUpdate();
      };

      if (contact && contact.addChangeListener && !self._contactChangeListener) {
        self._contactChangeListener = contact.addChangeListener(changedCb);
      }

      if (self.haveMoreContactListeners) {
        if (!self._contactChangeListeners) {
          self._contactChangeListeners = [];
          var moreIds = self.haveMoreContactListeners();

          if (moreIds && moreIds.forEach) {
            moreIds.forEach(function (handle) {
              if (M.u[handle] && M.u[handle].addChangeListener) {
                self._contactChangeListeners.push([M.u[handle], M.u[handle].addChangeListener(changedCb)]);
              }
            });
          }
        }
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ConversationMessageMixin.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var contact = self.getContact();

      if (self._contactChangeListener && contact && contact.removeChangeListener) {
        contact.removeChangeListener(self._contactChangeListener);
      }

      if (this._contactChangeListeners) {
        this._contactChangeListeners.forEach(function (listener) {
          listener[0].removeChangeListener(listener[1]);
        });

        this._contactChangeListeners = [];
      }
    }
  }, {
    key: "getContact",
    value: function getContact() {
      if (this.props.contact) {
        // optimization
        return this.props.contact;
      }

      var message = this.props.message;
      return Message.getContactForMessage(message);
    }
  }, {
    key: "getTimestampAsString",
    value: function getTimestampAsString() {
      return unixtimeToTimeString(this.getTimestamp());
    }
  }, {
    key: "getTimestamp",
    value: function getTimestamp() {
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
    }
  }, {
    key: "getParentJsp",
    value: function getParentJsp() {
      var $node = $(this.findDOMNode());
      var $jsp = $node.closest('.jScrollPaneContainer').data('jsp');
      return $jsp;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;
      var chatRoom = self.props.message.chatRoom;
      var megaChat = chatRoom.megaChat;

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
    }
  }]);

  return ConversationMessageMixin;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

if (false) { var throwOnDirectAccess, ReactIs; } else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = __webpack_require__(19)();
}


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getMessageString", function() { return getMessageString; });
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * The most dummiest lazy load ever... but no need for something more complicated
 */
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
    } else if (_typeof(arg) === "object") {
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
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PerfectScrollbar", function() { return PerfectScrollbar; });
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);


var x = 0;
/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */

var PerfectScrollbar =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(PerfectScrollbar, _MegaRenderMixin);

  function PerfectScrollbar() {
    _classCallCheck(this, PerfectScrollbar);

    return _possibleConstructorReturn(this, _getPrototypeOf(PerfectScrollbar).apply(this, arguments));
  }

  _createClass(PerfectScrollbar, [{
    key: "get$Node",
    value: function get$Node() {
      if (!this.$Node) {
        this.$Node = $(this.findDOMNode());
      }

      return this.$Node;
    }
  }, {
    key: "doProgramaticScroll",
    value: function doProgramaticScroll(newPos, forced, isX) {
      if (!this.isMounted()) {
        return;
      }

      var self = this;
      var $elem = self.get$Node();
      var animFrameInner = false;
      var prop = !isX ? 'scrollTop' : 'scrollLeft';
      var idx = self.scrollEventIncId++;
      $elem.rebind('scroll.progscroll' + idx, function (idx, e) {
        if (animFrameInner) {
          cancelAnimationFrame(animFrameInner);
          animFrameInner = false;
        }

        $elem.off('scroll.progscroll' + idx);
        self.isUserScroll = true;
      }.bind(this, idx)); // do the actual scroll

      self.isUserScroll = false;
      $elem[0][prop] = newPos;
      Ps.update($elem[0]); // reset the flag on next re-paint of the browser

      animFrameInner = requestAnimationFrame(function (idx) {
        animFrameInner = false;
        self.isUserScroll = true;
        $elem.off('scroll.progscroll' + idx);
      }.bind(this, idx));
      return true;
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(PerfectScrollbar.prototype), "componentDidMount", this).call(this);

      var self = this;
      var $elem = self.get$Node();
      $elem.height('100%');
      var options = $.extend({}, {
        'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection']
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
      $elem.rebind('disable-scroll.ps' + self.getUniqueId(), function (e) {
        Ps.destroy($elem[0]);
      });
      $elem.rebind('enable-scroll.ps' + self.getUniqueId(), function (e) {
        Ps.initialize($elem[0], options);
      });
      $elem.rebind('forceResize.ps' + self.getUniqueId(), function (e, forced, scrollPositionYPerc, scrollToElement) {
        self.onResize(forced, scrollPositionYPerc, scrollToElement);
      });
      self.onResize();
      this.attachAnimationEvents();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(PerfectScrollbar.prototype), "componentWillUnmount", this).call(this);

      var $elem = this.get$Node();
      $elem.off('ps-scroll-y.ps' + this.getUniqueId());
      var ns = '.ps' + this.getUniqueId();
      $elem.parents('.have-animation').unbind('animationend' + ns + ' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);
    }
  }, {
    key: "attachAnimationEvents",
    value: function attachAnimationEvents() {
      var self = this;

      if (!self.isMounted()) {
        return;
      } // var $haveAnimationNode = self._haveAnimNode;
      //
      // if (!$haveAnimationNode) {
      //     var $node = self.get$Node();
      //     var ns = '.ps' + self.getUniqueId();
      //     $haveAnimationNode = self._haveAnimNode = $node.parents('.have-animation');
      // }
      // $haveAnimationNode.rebind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns,
      //     function(e) {
      //         self.safeForceUpdate(true);
      //         if (self.props.onAnimationEnd) {
      //             self.props.onAnimationEnd();
      //         }
      //     });

    }
  }, {
    key: "eventuallyReinitialise",
    value: function eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
      var self = this;

      if (!self.isMounted()) {
        return;
      }

      if (!self.isComponentEventuallyVisible()) {
        return;
      }

      var $elem = self.get$Node();

      if (forced || self._currHeight != self.getContentHeight()) {
        self._currHeight = self.getContentHeight();

        self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
      }
    }
  }, {
    key: "_doReinit",
    value: function _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
      var self = this; // triggers an

      self.doProgramaticScroll($elem[0].scrollTop, true);
      var manualReinitialiseControl = false;

      if (self.props.onReinitialise) {
        manualReinitialiseControl = self.props.onReinitialise(self, $elem, forced, scrollPositionYPerc, scrollToElement);
      }

      if (manualReinitialiseControl === false) {
        if (scrollPositionYPerc) {
          if (scrollPositionYPerc === -1) {
            self.scrollToBottom(true);
          } else {
            self.scrollToPercentY(scrollPositionYPerc, true);
          }
        } else if (scrollToElement) {
          self.scrollToElement(scrollToElement, true);
        }
      }
    }
  }, {
    key: "scrollToBottom",
    value: function scrollToBottom(skipReinitialised) {
      if (!this.doProgramaticScroll(PerfectScrollbar.MAX_BOTTOM_POS)) {
        return false;
      }

      if (!skipReinitialised) {
        this.reinitialised(true);
      }
    }
  }, {
    key: "reinitialise",
    value: function reinitialise(skipReinitialised) {
      var $elem = this.get$Node();
      this.isUserScroll = false;
      Ps.update($elem[0]);
      this.isUserScroll = true;

      if (!skipReinitialised) {
        this.reinitialised(true);
      }
    }
  }, {
    key: "getScrollHeight",
    value: function getScrollHeight() {
      var $elem = this.get$Node();
      var outerHeightContainer = $($elem[0].children[0]).outerHeight();
      var outerHeightScrollable = $elem.outerHeight();
      var res = outerHeightContainer - outerHeightScrollable;

      if (res <= 0) {
        // can happen if the element is now hidden.
        return this._lastKnownScrollHeight ? this._lastKnownScrollHeight : 0;
      }

      this._lastKnownScrollHeight = res;
      return res;
    }
  }, {
    key: "getScrollWidth",
    value: function getScrollWidth() {
      var $elem = this.get$Node();
      var outerWidthContainer = $($elem[0].children[0]).outerWidth();
      var outerWidthScrollable = $elem.outerWidth();
      var res = outerWidthContainer - outerWidthScrollable;

      if (res <= 0) {
        // can happen if the element is now hidden.
        return this._lastKnownScrollWidth ? this._lastKnownScrollWidth : 0;
      }

      this._lastKnownScrollWidth = res;
      return res;
    }
  }, {
    key: "getContentHeight",
    value: function getContentHeight() {
      var $elem = this.get$Node();
      return $elem[0].children[0].offsetHeight;
    }
  }, {
    key: "setCssContentHeight",
    value: function setCssContentHeight(h) {
      var $elem = this.get$Node();
      return $elem.css('height', h);
    }
  }, {
    key: "isAtTop",
    value: function isAtTop() {
      return this.findDOMNode().scrollTop === 0;
    }
  }, {
    key: "isAtBottom",
    value: function isAtBottom() {
      return this.findDOMNode().scrollTop === this.getScrollHeight();
    }
  }, {
    key: "isCloseToBottom",
    value: function isCloseToBottom(minPixelsOff) {
      return this.getScrollHeight() - this.getScrollPositionY() <= minPixelsOff;
    }
  }, {
    key: "getScrolledPercentY",
    value: function getScrolledPercentY() {
      return 100 / this.getScrollHeight() * this.findDOMNode().scrollTop;
    }
  }, {
    key: "getScrollPositionY",
    value: function getScrollPositionY() {
      return this.findDOMNode().scrollTop;
    }
  }, {
    key: "scrollToPercentY",
    value: function scrollToPercentY(posPerc, skipReinitialised) {
      var $elem = this.get$Node();
      var targetPx = this.getScrollHeight() / 100 * posPerc;

      if ($elem[0].scrollTop !== targetPx) {
        if (this.doProgramaticScroll(targetPx)) {
          if (!skipReinitialised) {
            this.reinitialised(true);
          }
        }
      }
    }
  }, {
    key: "scrollToPercentX",
    value: function scrollToPercentX(posPerc, skipReinitialised) {
      var $elem = this.get$Node();
      var targetPx = this.getScrollWidth() / 100 * posPerc;

      if ($elem[0].scrollLeft !== targetPx) {
        if (this.doProgramaticScroll(targetPx, false, true)) {
          if (!skipReinitialised) {
            this.reinitialised(true);
          }
        }
      }
    }
  }, {
    key: "scrollToY",
    value: function scrollToY(posY, skipReinitialised) {
      var $elem = this.get$Node();

      if ($elem[0].scrollTop !== posY) {
        if (this.doProgramaticScroll(posY)) {
          if (!skipReinitialised) {
            this.reinitialised(true);
          }
        }
      }
    }
  }, {
    key: "scrollToElement",
    value: function scrollToElement(element, skipReinitialised) {
      var $elem = this.get$Node();

      if (!element || !element.offsetParent) {
        return;
      }

      if (this.doProgramaticScroll(element.offsetTop)) {
        if (!skipReinitialised) {
          this.reinitialised(true);
        }
      }
    }
  }, {
    key: "disable",
    value: function disable() {
      if (this.isMounted()) {
        var $elem = this.get$Node();
        $elem.attr('data-scroll-disabled', true);
        $elem.addClass('ps-disabled');
        Ps.disable($elem[0]);
      }
    }
  }, {
    key: "enable",
    value: function enable() {
      if (this.isMounted()) {
        var $elem = this.get$Node();
        $elem.removeAttr('data-scroll-disabled');
        $elem.removeClass('ps-disabled');
        Ps.enable($elem[0]);
      }
    }
  }, {
    key: "reinitialised",
    value: function reinitialised(forced) {
      if (this.props.onReinitialise) {
        this.props.onReinitialise(this, this.get$Node(), forced ? forced : false);
      }
    }
  }, {
    key: "onResize",
    value: function onResize(forced, scrollPositionYPerc, scrollToElement) {
      if (forced && forced.originalEvent) {
        forced = true;
        scrollPositionYPerc = undefined;
      }

      this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
    }
  }, {
    key: "inViewport",
    value: function inViewport(domNode) {
      return verge.inViewport(domNode);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      if (this.props.requiresUpdateOnResize) {
        this.onResize(true);
      }

      this.attachAnimationEvents();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      return React.makeElement("div", {
        style: this.props.style,
        className: this.props.className
      }, self.props.children);
    }
  }]);

  return PerfectScrollbar;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));
PerfectScrollbar.isUserScroll = true;
PerfectScrollbar.scrollEventIncId = 0;
PerfectScrollbar.defaultProps = {
  className: "perfectScrollbarContainer",
  requiresUpdateOnResize: true
};
PerfectScrollbar.MAX_BOTTOM_POS = 9999999;
;

/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);

var utils = __webpack_require__(3);



var Handler =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(Handler, _MegaRenderMixin);

  function Handler() {
    _classCallCheck(this, Handler);

    return _possibleConstructorReturn(this, _getPrototypeOf(Handler).apply(this, arguments));
  }

  _createClass(Handler, [{
    key: "render",
    value: function render() {
      var classes = "tooltip-handler" + (this.props.className ? " " + this.props.className : "");
      return React.makeElement("span", {
        className: classes,
        onMouseOver: this.props.onMouseOver,
        onMouseOut: this.props.onMouseOut
      }, this.props.children);
    }
  }]);

  return Handler;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

Handler.defaultProps = {
  'hideable': true
};
;

var Contents =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(Contents, _MegaRenderMixin2);

  function Contents() {
    _classCallCheck(this, Contents);

    return _possibleConstructorReturn(this, _getPrototypeOf(Contents).apply(this, arguments));
  }

  _createClass(Contents, [{
    key: "render",
    value: function render() {
      var className = 'tooltip-contents dropdown body tooltip ' + (this.props.className ? this.props.className : "");

      if (this.props.active) {
        className += " visible";
        return React.makeElement("div", {
          className: className
        }, this.props.withArrow ? React.makeElement("i", {
          className: "dropdown-white-arrow"
        }) : null, this.props.children);
      } else {
        return null;
      }
    }
  }]);

  return Contents;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

Contents.defaultProps = {
  'hideable': true
};
;

var Tooltip =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(Tooltip, _MegaRenderMixin3);

  function Tooltip(props) {
    var _this;

    _classCallCheck(this, Tooltip);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Tooltip).call(this, props));
    _this.state = {
      'active': false
    };
    return _this;
  }

  _createClass(Tooltip, [{
    key: "componentDidUpdate",
    value: function componentDidUpdate(oldProps, oldState) {
      var self = this;

      if (oldState.active === true && this.state.active === false) {
        $(window).off('resize.tooltip' + this.getUniqueId());
      }

      if (self.state.active === true) {
        self.repositionTooltip();
        $(window).rebind('resize.tooltip' + this.getUniqueId(), function () {
          self.repositionTooltip();
        });
      }
    }
  }, {
    key: "repositionTooltip",
    value: function repositionTooltip() {
      var self = this;
      var elLeftPos, elTopPos, elWidth, elHeight;
      var tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
      var docWidth, docHeight;
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
        docWidth = $(window).width();
        docHeight = $(window).height();
        $tooltip.removeClass('dropdown-arrow left-arrow right-arrow up-arrow down-arrow').removeAttr('style'); // Default Tooltip offset

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
          'top': tooltipTopPos - 5 // avoid image preview flashing due to arrow position

        });
        $tooltip.addClass(arrowClass);
      }
    }
  }, {
    key: "onHandlerMouseOver",
    value: function onHandlerMouseOver() {
      this.setState({
        'active': true
      });
    }
  }, {
    key: "onHandlerMouseOut",
    value: function onHandlerMouseOut() {
      this.setState({
        'active': false
      });
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var classes = "" + this.props.className;
      var others = [];
      var handler = null;
      var contents = null;
      var x = 0;
      React.Children.forEach(this.props.children, function (child) {
        if (child.type.name === 'Handler') {
          handler = React.cloneElement(child, {
            onMouseOver: function onMouseOver(e) {
              self.onHandlerMouseOver();
            },
            onMouseOut: function onMouseOut(e) {
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
      return React.makeElement("span", {
        className: classes
      }, handler, contents, others);
    }
  }]);

  return Tooltip;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

Tooltip.defaultProps = {
  'hideable': true
};
;
/* harmony default export */ __webpack_exports__["a"] = ({
  Tooltip: Tooltip,
  Handler: Handler,
  Contents: Contents
});

/***/ }),
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ui_utils_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var _ui_buttons_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5);
/* harmony import */ var _ui_contacts_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2);
/* harmony import */ var _ui_conversationpanel_jsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(16);
/* harmony import */ var _ui_modalDialogs_jsx__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(6);
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

// libs


var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);



var getMessageString = __webpack_require__(10).getMessageString;

var PerfectScrollbar = __webpack_require__(11).PerfectScrollbar;








var StartGroupChatWizard = __webpack_require__(23).StartGroupChatWizard;

var renderMessageSummary = function renderMessageSummary(lastMessage) {
  var renderableSummary;

  if (lastMessage.renderableSummary) {
    renderableSummary = lastMessage.renderableSummary;
  } else {
    if (lastMessage.isManagement && lastMessage.isManagement()) {
      renderableSummary = lastMessage.getManagementMessageSummaryText();
    } else if (!lastMessage.textContents && lastMessage.dialogType) {
      renderableSummary = Message._getTextContentsForDialogType(lastMessage);
    } else {
      renderableSummary = lastMessage.textContents;
    }

    renderableSummary = renderableSummary && escapeHTML(renderableSummary, true) || '';
    var escapeUnescapeArgs = [{
      'type': 'onPreBeforeRenderMessage',
      'textOnly': true
    }, {
      'message': {
        'textContents': renderableSummary
      }
    }, ['textContents', 'messageHtml'], 'messageHtml'];
    megaChat.plugins.btRtfFilter.escapeAndProcessMessage(escapeUnescapeArgs[0], escapeUnescapeArgs[1], escapeUnescapeArgs[2], escapeUnescapeArgs[3]);
    renderableSummary = escapeUnescapeArgs[1].message.textContents;
    renderableSummary = megaChat.plugins.emoticonsFilter.processHtmlMessage(renderableSummary);
    renderableSummary = megaChat.plugins.rtfFilter.processStripRtfFromMessage(renderableSummary);
    escapeUnescapeArgs[1].message.messageHtml = renderableSummary;
    escapeUnescapeArgs[0].type = "onPostBeforeRenderMessage";
    renderableSummary = megaChat.plugins.btRtfFilter.unescapeAndProcessMessage(escapeUnescapeArgs[0], escapeUnescapeArgs[1], escapeUnescapeArgs[2], escapeUnescapeArgs[3]);
    renderableSummary = renderableSummary || "";
    renderableSummary = renderableSummary.replace("<br/>", "\n").split("\n");
    renderableSummary = renderableSummary.length > 1 ? renderableSummary[0] + "..." : renderableSummary[0];
  }

  var author;

  if (lastMessage.dialogType === "privilegeChange" && lastMessage.meta && lastMessage.meta.targetUserId) {
    author = M.u[lastMessage.meta.targetUserId[0]] || Message.getContactForMessage(lastMessage);
  } else if (lastMessage.dialogType === "alterParticipants") {
    author = M.u[lastMessage.meta.included[0] || lastMessage.meta.excluded[0]] || Message.getContactForMessage(lastMessage);
  } else {
    author = Message.getContactForMessage(lastMessage);
  }

  if (author) {
    if (!lastMessage._contactChangeListener && author.addChangeListener) {
      lastMessage._contactChangeListener = author.addChangeListener(function () {
        delete lastMessage.renderableSummary;
        lastMessage.trackDataChange();
      });
    }

    if (lastMessage.chatRoom.type === "private") {
      if (author && author.u === u_handle) {
        renderableSummary = l[19285] + " " + renderableSummary;
      }
    } else if (lastMessage.chatRoom.type === "group" || lastMessage.chatRoom.type === "public") {
      if (author) {
        if (author.u === u_handle) {
          renderableSummary = l[19285] + " " + renderableSummary;
        } else {
          var name = M.getNameByHandle(author.u);
          name = ellipsis(name, undefined, 11);

          if (name) {
            renderableSummary = escapeHTML(name) + ": " + renderableSummary;
          }
        }
      }
    }
  }

  return renderableSummary;
};

var getRoomName = function getRoomName(chatRoom) {
  return chatRoom.getRoomTitle();
};

var ConversationsListItem =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(ConversationsListItem, _MegaRenderMixin);

  function ConversationsListItem() {
    _classCallCheck(this, ConversationsListItem);

    return _possibleConstructorReturn(this, _getPrototypeOf(ConversationsListItem).apply(this, arguments));
  }

  _createClass(ConversationsListItem, [{
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate() {
      if (this.loadingShown || this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown) {
        return false;
      } else {
        return undefined;
      }
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;

      self.chatRoomChangeListener = function () {
        self.debouncedForceUpdate(750);
      };

      self.props.chatRoom.rebind('onUnreadCountUpdate.convlistitem', function () {
        delete self.lastMessageId;
        self.safeForceUpdate();
      });
      self.props.chatRoom.addChangeListener(self.chatRoomChangeListener);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ConversationsListItem.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      self.props.chatRoom.removeChangeListener(self.chatRoomChangeListener);
      self.props.chatRoom.unbind('onUnreadCountUpdate.convlistitem');
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(ConversationsListItem.prototype), "componentDidMount", this).call(this);

      this.eventuallyScrollTo();
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      _get(_getPrototypeOf(ConversationsListItem.prototype), "componentDidUpdate", this).call(this);

      this.eventuallyScrollTo();
    }
  }, {
    key: "eventuallyScrollTo",
    value: function eventuallyScrollTo() {
      if (this.props.chatRoom._scrollToOnUpdate && megaChat.currentlyOpenedChat === this.props.chatRoom.roomId) {
        this.props.chatRoom.scrollToChat();
      }
    }
  }, {
    key: "render",
    value: function render() {
      var classString = "";
      var megaChat = this.props.chatRoom.megaChat;
      var chatRoom = this.props.chatRoom;

      if (!chatRoom || !chatRoom.chatId) {
        return null;
      }

      var roomId = chatRoom.chatId; // selected

      if (chatRoom.isCurrentlyActive) {
        classString += " active";
      }

      var nameClassString = "user-card-name conversation-name";
      var archivedDiv = "";

      if (chatRoom.isArchived()) {
        archivedDiv = React.makeElement("div", {
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

      if (ChatdIntegration._loadingChats[chatRoom.roomId] && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise && ChatdIntegration._loadingChats[chatRoom.roomId].loadingPromise.state() === 'pending' || chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.joined === false || chatRoom.messagesBuff.joined === true && chatRoom.messagesBuff.haveMessages === true && chatRoom.messagesBuff.messagesHistoryIsLoading() === true || chatRoom.messagesBuff.isDecrypting && chatRoom.messagesBuff.isDecrypting.state() === 'pending') {
        this.loadingShown = true;
      } else {
        delete this.loadingShown;
      }

      var unreadCount = chatRoom.messagesBuff.getUnreadCount();
      var isUnread = false;
      var notificationItems = [];

      if (chatRoom.havePendingCall() && chatRoom.state != ChatRoom.STATE.LEFT) {
        notificationItems.push(React.makeElement("i", {
          className: "tiny-icon " + (chatRoom.isCurrentlyActive ? "blue" : "white") + "-handset",
          key: "callIcon"
        }));
      }

      if (unreadCount > 0) {
        notificationItems.push(React.makeElement("span", {
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
        lastMsgDivClasses = "conversation-message" + (isUnread ? " unread" : ""); // safe some CPU cycles...

        var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
        lastMessage.renderableSummary = renderableSummary;

        if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
          lastMsgDivClasses += " call";
          classString += " call-exists";
        }

        lastMessageDiv = React.makeElement("div", {
          className: lastMsgDivClasses,
          dangerouslySetInnerHTML: {
            __html: renderableSummary
          }
        });
        var voiceClipType = Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP;

        if (lastMessage.textContents && lastMessage.textContents[1] === voiceClipType) {
          var playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
          lastMessageDiv = React.makeElement("div", {
            className: lastMsgDivClasses
          }, React.makeElement("span", {
            className: "voice-message-icon"
          }), playTime);
        }

        if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
          lastMessageDiv = React.makeElement("div", {
            className: lastMsgDivClasses
          }, React.makeElement("span", {
            className: "geolocation-icon"
          }), l[20789]);
        }

        var timestamp = lastMessage.delay;
        var curTimeMarker;
        var msgDate = new Date(timestamp * 1000);
        var iso = msgDate.toISOString();

        if (todayOrYesterday(iso)) {
          // if in last 2 days, use the time2lastSeparator
          curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
        } else {
          // if not in the last 2 days, use 1st June [Year]
          curTimeMarker = acc_time2date(timestamp, false);
        }

        lastMessageDatetimeDiv = React.makeElement("div", {
          className: "date-time"
        }, curTimeMarker);
      } else {
        lastMsgDivClasses = "conversation-message";
        /**
         * Show "Loading" until:
         * 1. I'd fetched chats from the API.
         * 2. I'm retrieving history at the moment.
         * 3. I'd connected to chatd and joined the room.
          */

        var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];

        if (ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
          if (!ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached) {
            ChatdIntegration.mcfHasFinishedPromise.always(function () {
              megaChat.chats.trackDataChange();
            });
            ChatdIntegration.mcfHasFinishedPromise._trackDataChangeAttached = true;
          }
        }

        lastMessageDiv = React.makeElement("div", null, React.createElement("div", {
          className: lastMsgDivClasses
        }, __(emptyMessage)));
        timestamp = chatRoom.ctime;
        var msgDate = new Date(timestamp * 1000);
        var iso = msgDate.toISOString();

        if (todayOrYesterday(iso)) {
          // if in last 2 days, use the time2lastSeparator
          curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
        } else {
          // if not in the last 2 days, use 1st June [Year]
          curTimeMarker = acc_time2date(timestamp, false);
        }

        lastMessageDatetimeDiv = React.makeElement("div", {
          className: "date-time"
        }, l[19077].replace("%s1", curTimeMarker));
      }

      this.lastMessageId = lastMessage && lastMessage.messageId;
      this._lastMsgDivClassesCache = lastMsgDivClasses.replace(" call-exists", "").replace(" unread", "");
      this._lastMessageDivCache = lastMessageDiv;
      this._lastMessageDatetimeDivCache = lastMessageDatetimeDiv;

      if (chatRoom.callManagerCall && chatRoom.callManagerCall.isActive() === true) {
        var mediaOptions = chatRoom.callManagerCall.getMediaOptions();
        var mutedMicrophone = null;
        var activeCamera = null;

        if (!mediaOptions.audio) {
          mutedMicrophone = React.makeElement("i", {
            className: "small-icon grey-crossed-mic"
          });
        }

        if (mediaOptions.video) {
          activeCamera = React.makeElement("i", {
            className: "small-icon grey-videocam"
          });
        }

        inCallDiv = React.makeElement("div", {
          className: "call-duration"
        }, mutedMicrophone, activeCamera, React.makeElement("span", {
          className: "call-counter",
          "data-room-id": chatRoom.chatId
        }, secondsToTimeShort(chatRoom._currentCallCounter)));
        classString += " call-active"; // hide archived div when it is in a call.

        archivedDiv = "";
      }

      if (chatRoom.type !== "public") {
        nameClassString += " privateChat";
      }

      if (chatRoom.callManagerCall && (chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || chatRoom.callManagerCall.state === CallManagerCall.STATE.WAITING_RESPONSE_OUTGOING)) {
        classString += " have-incoming-ringing-call";
      }

      var self = this;
      return React.makeElement("li", {
        className: classString,
        id: id,
        "data-room-id": roomId,
        "data-jid": contactId,
        onClick: function onClick(e) {
          self.props.onConversationClicked(e);
        }
      }, React.makeElement("div", {
        className: nameClassString
      }, React.makeElement(_ui_utils_jsx__WEBPACK_IMPORTED_MODULE_0__["default"].EmojiFormattedContent, null, chatRoom.getRoomTitle()), chatRoom.type === "private" ? React.createElement("span", {
        className: "user-card-presence " + presenceClass
      }) : undefined), chatRoom.type === "group" || chatRoom.type === "private" ? React.makeElement("i", {
        className: "tiny-icon blue-key simpletip",
        "data-simpletip": l[20935]
      }) : undefined, archivedDiv, notificationItems.length > 0 ? React.makeElement("div", {
        className: "unread-messages items-" + notificationItems.length
      }, notificationItems) : null, inCallDiv, lastMessageDiv, lastMessageDatetimeDiv);
    }
  }]);

  return ConversationsListItem;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

;

var ArchivedConversationsListItem =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(ArchivedConversationsListItem, _MegaRenderMixin2);

  function ArchivedConversationsListItem() {
    _classCallCheck(this, ArchivedConversationsListItem);

    return _possibleConstructorReturn(this, _getPrototypeOf(ArchivedConversationsListItem).apply(this, arguments));
  }

  _createClass(ArchivedConversationsListItem, [{
    key: "render",
    value: function render() {
      var classString = "arc-chat-list ui-droppable ui-draggable ui-draggable-handle";
      var megaChat = this.props.chatRoom.megaChat;
      var chatRoom = this.props.chatRoom;

      if (!chatRoom || !chatRoom.chatId) {
        return null;
      }

      var roomId = chatRoom.chatId; // selected

      if (chatRoom.archivedSelected === true) {
        classString += " ui-selected";
      }

      var nameClassString = "user-card-name conversation-name";
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

      var lastMessageDiv = null;
      var lastMessageDatetimeDiv = null;
      var lastMessage = chatRoom.messagesBuff.getLatestTextMessage();

      if (lastMessage) {
        var lastMsgDivClasses = "conversation-message";
        var renderableSummary = lastMessage.renderableSummary || renderMessageSummary(lastMessage);
        lastMessage.renderableSummary = renderableSummary;
        lastMessageDiv = React.makeElement("div", {
          className: lastMsgDivClasses,
          dangerouslySetInnerHTML: {
            __html: renderableSummary
          }
        });
        var timestamp = lastMessage.delay;
        var curTimeMarker;
        var msgDate = new Date(timestamp * 1000);
        var iso = msgDate.toISOString();

        if (todayOrYesterday(iso)) {
          // if in last 2 days, use the time2lastSeparator
          curTimeMarker = time2lastSeparator(iso) + ", " + unixtimeToTimeString(timestamp);
        } else {
          // if not in the last 2 days, use 1st June [Year]
          curTimeMarker = acc_time2date(timestamp, false);
        }

        lastMessageDatetimeDiv = React.makeElement("div", {
          className: "date-time"
        }, curTimeMarker);
      } else {
        var lastMsgDivClasses = "conversation-message";
        /**
         * Show "Loading" until:
         * 1. I'd fetched chats from the API.
         * 2. I'm retrieving history at the moment.
         * 3. I'd connected to chatd and joined the room.
          */

        var emptyMessage = ChatdIntegration.mcfHasFinishedPromise.state() !== 'resolved' || chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown || chatRoom.messagesBuff.joined === false ? l[7006] : l[8000];
        lastMessageDiv = React.makeElement("div", null, React.createElement("div", {
          className: lastMsgDivClasses
        }, __(emptyMessage)));
      }

      if (chatRoom.type !== "public") {
        nameClassString += " privateChat";
      }

      return React.makeElement("tr", {
        className: classString,
        id: id,
        "data-room-id": roomId,
        "data-jid": contactId,
        onClick: this.props.onConversationSelected.bind(this),
        onDoubleClick: this.props.onConversationClicked.bind(this)
      }, React.makeElement("td", {
        className: ""
      }, React.makeElement("div", {
        className: "fm-chat-user-info todo-star"
      }, React.makeElement("div", {
        className: nameClassString
      }, React.makeElement(_ui_utils_jsx__WEBPACK_IMPORTED_MODULE_0__["default"].EmojiFormattedContent, null, chatRoom.getRoomTitle()), chatRoom.type === "group" ? React.createElement("i", {
        className: "tiny-icon blue-key"
      }) : undefined), lastMessageDiv, lastMessageDatetimeDiv), React.makeElement("div", {
        className: "archived-badge"
      }, __(l[19067]))), React.makeElement("td", {
        width: "330"
      }, React.makeElement("div", {
        className: "archived-on"
      }, React.makeElement("div", {
        className: "archived-date-time"
      }, lastMessageDatetimeDiv), React.makeElement("div", {
        className: "clear"
      })), React.makeElement("div", {
        className: "button default-white-button semi-big unarchive-chat right",
        onClick: this.props.onUnarchiveConversationClicked.bind(this)
      }, React.makeElement("span", null, __(l[19065])))));
    }
  }]);

  return ArchivedConversationsListItem;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

;

var ConversationsList =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(ConversationsList, _MegaRenderMixin3);

  _createClass(ConversationsList, [{
    key: "attachRerenderCallbacks",
    value: function attachRerenderCallbacks() {
      var self = this;
      self._megaChatsListener = megaChat.chats.addChangeListener(function () {
        self.throttledOnPropOrStateUpdated();
      });
    }
  }, {
    key: "detachRerenderCallbacks",
    value: function detachRerenderCallbacks() {
      if (_get(_getPrototypeOf(ConversationsList.prototype), "detachRerenderCallbacks", this)) {
        _get(_getPrototypeOf(ConversationsList.prototype), "detachRerenderCallbacks", this).call(this);
      }

      megaChat.chats.removeChangeListener(this._megaChatsListener);
    }
  }]);

  function ConversationsList(props) {
    var _this;

    _classCallCheck(this, ConversationsList);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ConversationsList).call(this, props));
    _this.currentCallClicked = _this.currentCallClicked.bind(_assertThisInitialized(_this));
    _this.endCurrentCall = _this.endCurrentCall.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(ConversationsList, [{
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      _get(_getPrototypeOf(ConversationsList.prototype), "componentDidUpdate", this) && _get(_getPrototypeOf(ConversationsList.prototype), "componentDidUpdate", this).call(this);
      M.treeSearchUI();
    }
  }, {
    key: "conversationClicked",
    value: function conversationClicked(room, e) {
      loadSubPage(room.getRoomUrl());
      e.stopPropagation();
    }
  }, {
    key: "currentCallClicked",
    value: function currentCallClicked(e) {
      var activeCallSession = megaChat.activeCallSession;

      if (activeCallSession) {
        this.conversationClicked(activeCallSession.room, e);
      }
    }
  }, {
    key: "contactClicked",
    value: function contactClicked(contact, e) {
      loadSubPage("fm/chat/p/" + contact.u);
      e.stopPropagation();
    }
  }, {
    key: "endCurrentCall",
    value: function endCurrentCall(e) {
      var activeCallSession = megaChat.activeCallSession;

      if (activeCallSession) {
        activeCallSession.endCall('hangup');
        this.conversationClicked(activeCallSession.room, e);
      }
    }
  }, {
    key: "render",
    value: function render() {
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
        } // Checking if this a business user with expired status


        if (u_attr && u_attr.b && u_attr.b.s === -1) {
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
                // a non-contact conversation, e.g. contact removed - mark as read only
                Soon(function () {
                  chatRoom.privateReadOnlyChat = true;
                });
              } else if (chatRoom.privateReadOnlyChat && contact.c) {
                // a non-contact conversation, e.g. contact removed - mark as read only
                Soon(function () {
                  chatRoom.privateReadOnlyChat = false;
                });
              }
            }
          }
        }

        currConvsList.push(React.makeElement(ConversationsListItem, {
          key: chatRoom.roomId,
          chatRoom: chatRoom,
          contact: contact,
          messages: chatRoom.messagesBuff,
          onConversationClicked: function onConversationClicked(e) {
            self.conversationClicked(chatRoom, e);
          }
        }));
      });
      return React.makeElement("div", {
        className: "conversationsList"
      }, React.makeElement("ul", {
        className: "conversations-pane"
      }, currConvsList));
    }
  }]);

  return ConversationsList;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

ConversationsList.defaultProps = {
  'manualDataChangeTracking': true
};
;

var ArchivedConversationsList =
/*#__PURE__*/
function (_MegaRenderMixin4) {
  _inherits(ArchivedConversationsList, _MegaRenderMixin4);

  function ArchivedConversationsList(props) {
    var _this2;

    _classCallCheck(this, ArchivedConversationsList);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(ArchivedConversationsList).call(this, props));
    _this2.state = _this2.getInitialState();
    _this2.onSortNameClicked = _this2.onSortNameClicked.bind(_assertThisInitialized(_this2));
    _this2.onSortTimeClicked = _this2.onSortTimeClicked.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(ArchivedConversationsList, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        'items': megaChat.chats,
        'orderby': 'lastActivity',
        'nameorder': 1,
        'timeorder': -1,
        'confirmUnarchiveChat': null,
        'confirmUnarchiveDialogShown': false
      };
    }
  }, {
    key: "conversationClicked",
    value: function conversationClicked(room, e) {
      room.showArchived = true;
      loadSubPage(room.getRoomUrl());
      e.stopPropagation();
    }
  }, {
    key: "conversationSelected",
    value: function conversationSelected(room, e) {
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
    }
  }, {
    key: "unarchiveConversationClicked",
    value: function unarchiveConversationClicked(room, e) {
      var self = this;
      self.setState({
        'confirmUnarchiveDialogShown': true,
        'confirmUnarchiveChat': room.roomId
      });
    }
  }, {
    key: "onSortNameClicked",
    value: function onSortNameClicked(e) {
      this.setState({
        'orderby': 'name',
        'nameorder': this.state.nameorder * -1
      });
    }
  }, {
    key: "onSortTimeClicked",
    value: function onSortTimeClicked(e) {
      this.setState({
        'orderby': 'lastActivity',
        'timeorder': this.state.timeorder * -1
      });
    }
  }, {
    key: "render",
    value: function render() {
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
              // a non-contact conversation, e.g. contact removed - mark as read only
              Soon(function () {
                chatRoom.privateReadOnlyChat = true;
              });
            } else if (chatRoom.privateReadOnlyChat && contact.c) {
              // a non-contact conversation, e.g. contact removed - mark as read only
              Soon(function () {
                chatRoom.privateReadOnlyChat = false;
              });
            }
          }
        }

        currConvsList.push(React.makeElement(ArchivedConversationsListItem, {
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
          confirmUnarchiveDialog = React.makeElement(_ui_modalDialogs_jsx__WEBPACK_IMPORTED_MODULE_6__[/* default */ "a"].ConfirmDialog, {
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
          }, React.makeElement("div", {
            className: "fm-dialog-content"
          }, React.makeElement("div", {
            className: "dialog secondary-header"
          }, __(l[19064]))));
        }
      }

      return React.makeElement("div", {
        className: "chat-content-block archived-chats"
      }, React.makeElement("div", {
        className: "files-grid-view archived-chat-view"
      }, React.makeElement("table", {
        className: "grid-table-header",
        width: "100%",
        cellSpacing: "0",
        cellPadding: "0",
        border: "0"
      }, React.makeElement("tbody", null, React.createElement("tr", null, React.createElement("th", {
        className: "calculated-width",
        onClick: self.onSortNameClicked
      }, React.makeElement("div", {
        className: "is-chat arrow name " + nameOrderClass
      }, __(l[86]))), React.makeElement("th", {
        width: "330",
        onClick: self.onSortTimeClicked
      }, React.makeElement("div", {
        className: "is-chat arrow interaction " + timerOrderClass
      }, __(l[5904])))))), React.makeElement("div", {
        className: "grid-scrolling-table archive-chat-list"
      }, React.makeElement("table", {
        className: "grid-table arc-chat-messages-block"
      }, React.makeElement("tbody", null, currConvsList)))), confirmUnarchiveDialog);
    }
  }]);

  return ArchivedConversationsList;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

;

var ConversationsApp =
/*#__PURE__*/
function (_MegaRenderMixin5) {
  _inherits(ConversationsApp, _MegaRenderMixin5);

  function ConversationsApp(props) {
    var _this3;

    _classCallCheck(this, ConversationsApp);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(ConversationsApp).call(this, props));
    _this3.state = {
      'leftPaneWidth': mega.config.get('leftPaneWidth'),
      'startGroupChatDialogShown': false,
      'quickSearchText': ''
    };
    return _this3;
  }

  _createClass(ConversationsApp, [{
    key: "startChatClicked",
    value: function startChatClicked(selected) {
      if (selected.length === 1) {
        megaChat.createAndShowPrivateRoomFor(selected[0]).then(function (room) {
          room.setActive();
        });
      } else {
        megaChat.createAndShowGroupRoomFor(selected);
      }
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(ConversationsApp.prototype), "componentDidMount", this).call(this);

      var self = this;
      $(document.body).rebind('startNewChatLink.conversations', function (e) {
        self.startGroupChatFlow = 2;
        self.setState({
          'startGroupChatDialogShown': true
        });
      });
      window.addEventListener('resize', this.handleWindowResize);
      $(document).rebind('keydown.megaChatTextAreaFocus', function (e) {
        // prevent recursion!
        if (e.megaChatHandled) {
          return;
        }

        if (megaChat.currentlyOpenedChat) {
          // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
          // is visible/active at the moment
          if (megaChat.currentlyOpenedChat && megaChat.getCurrentRoom().isReadOnly() || $(e.target).is(".messages-textarea, input, textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91
          /* cmd+... */
          || e.keyCode === 17
          /* ctrl+... */
          || e.keyCode === 27
          /* esc */
          || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
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
        // prevent recursion!
        if (!M.chat || e.megaChatHandled || slideshowid) {
          return;
        }

        var $target = $(e.target);

        if (megaChat.currentlyOpenedChat) {
          // don't do ANYTHING if the current focus is already into an input/textarea/select or a .fm-dialog
          // is visible/active at the moment
          if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.closest('.messages.scroll-area').length > 0 || $('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block') || $(document.querySelector('.fm-dialog, .dropdown')).is(':visible') || document.querySelector('textarea:focus,select:focus,input:focus')) {
            return;
          }

          var $typeArea = $('.messages-textarea:visible:first');

          if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
            $typeArea.trigger("focus");
            e.megaChatHandled = true;
            moveCursortoToEnd($typeArea[0]);
          }
        }
      });
      self.fmConfigThrottling = null;
      self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function () {
        megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
        clearTimeout(self.fmConfigThrottling);
        self.fmConfigThrottling = setTimeout(function fmConfigThrottlingLeftPaneResize() {
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
      $('.conversations .nw-fm-tree-header input.chat-quick-search').rebind('cleared.jq', function (e) {
        self.setState({
          'quickSearchText': ''
        });
        treesearch = false;
      });

      if (ChatdIntegration.allChatsHadLoaded.state() !== 'resolved') {
        ChatdIntegration.allChatsHadLoaded.done(function () {
          self.safeForceUpdate();
        });
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(ConversationsApp.prototype), "componentWillUnmount", this).call(this);

      window.removeEventListener('resize', this.handleWindowResize);
      $(document).off('keydown.megaChatTextAreaFocus');
      mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this.handleWindowResize();

      if (megaChat.displayArchivedChats === true) {
        this.initArchivedChatsScrolling();
      }
    }
  }, {
    key: "handleWindowResize",
    value: function handleWindowResize() {
      if (!M.chat) {
        return;
      } // small piece of what is done in fm_resize_handler...


      if (anonymouschat) {
        $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
          'margin-left': "0px"
        });
      } else {
        $('.fm-right-files-block, .fm-right-account-block').filter(':visible').css({
          'margin-left': $('.fm-left-panel').width() + $('.nw-fm-left-icons-panel').width() + "px"
        });
      }
    }
  }, {
    key: "initArchivedChatsScrolling",
    value: function initArchivedChatsScrolling() {
      var scroll = '.archive-chat-list';
      deleteScrollPanel(scroll, 'jsp');
      $(scroll).jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5
      });
      jScrollFade(scroll);
    }
  }, {
    key: "archiveChatsClicked",
    value: function archiveChatsClicked() {
      loadSubPage('fm/chat/archived');
    }
  }, {
    key: "calcArchiveChats",
    value: function calcArchiveChats() {
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
    }
  }, {
    key: "getTopButtonsForContactsPicker",
    value: function getTopButtonsForContactsPicker() {
      var self = this;

      if (!self._topButtonsContactsPicker) {
        self._topButtonsContactsPicker = [{
          'key': 'add',
          'title': l[71],
          'icon': 'rounded-plus colorized',
          'onClick': function onClick(e) {
            contactAddDialog();
          }
        }, {
          'key': 'newGroupChat',
          'title': l[19483],
          'icon': 'conversation-with-plus',
          'onClick': function onClick(e) {
            self.startGroupChatFlow = 1;
            self.setState({
              'startGroupChatDialogShown': true
            });
          }
        }, {
          'key': 'newChatLink',
          'title': l[20638],
          'icon': 'small-icon blue-chain colorized',
          'onClick': function onClick(e) {
            self.startGroupChatFlow = 2;
            self.setState({
              'startGroupChatDialogShown': true
            });
          }
        }];
      }

      return self._topButtonsContactsPicker;
    }
  }, {
    key: "isWaitingForInitialLoadingToFinish",
    value: function isWaitingForInitialLoadingToFinish() {
      var self = this; // since in big accounts, a lot chats may finish at the same moment, this requires to be throttled.

      var forceUpdate = SoonFc(function (roomId) {
        delete self._isWaitingChatsLoad[roomId];
        self.safeForceUpdate();
      }, 300);
      self._isWaitingChatsLoad = self._isWaitingChatsLoad || {};
      var roomIds = megaChat.chats.keys();

      for (var i = 0; i < roomIds.length; i++) {
        var roomId = roomIds[i];
        var chatRoom = megaChat.chats[roomId];

        if (!self._isWaitingChatsLoad[roomId] && chatRoom.initialMessageHistLoaded.state() === 'pending') {
          self._isWaitingChatsLoad[roomId] = true;
          chatRoom.initialMessageHistLoaded.always(forceUpdate.bind(undefined, roomId));
        }
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var startGroupChatDialog = null;

      if (self.state.startGroupChatDialogShown === true) {
        startGroupChatDialog = React.makeElement(StartGroupChatWizard, {
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
        loadingOrEmpty = React.makeElement("div", {
          className: "fm-empty-messages hidden"
        }, React.makeElement("div", {
          className: "fm-empty-pad"
        }, React.makeElement("div", {
          className: "fm-empty-messages-bg"
        }), React.makeElement("div", {
          className: "fm-empty-cloud-txt"
        }, l[6870]), React.makeElement("div", {
          className: "fm-not-logged-text"
        }, React.makeElement("div", {
          className: "fm-not-logged-description",
          dangerouslySetInnerHTML: {
            __html: __(l[8762]).replace("[S]", "<span className='red'>").replace("[/S]", "</span>")
          }
        }), React.makeElement("div", {
          className: "fm-not-logged-button create-account"
        }, __(l[968])))));
      } else if (megaChat.allChatsHadInitialLoadedHistory() === false && !megaChat.currentlyOpenedChat && megaChat.displayArchivedChats !== true) {
        loadingOrEmpty = React.makeElement("div", {
          className: "fm-empty-messages"
        }, React.makeElement("div", {
          className: "loading-spinner js-messages-loading light manual-management",
          style: {
            "top": "50%"
          }
        }, React.makeElement("div", {
          className: "main-loader",
          style: {
            "position": "fixed",
            "top": "50%",
            "left": "50%",
            "marginLeft": "72px"
          }
        })));
        self.isWaitingForInitialLoadingToFinish();
        isLoading = true;
      }

      var rightPaneStyles = {};

      if (anonymouschat) {
        rightPaneStyles = {
          'marginLeft': 0
        };
      }

      var rightPane = React.makeElement("div", {
        className: "fm-right-files-block in-chat",
        style: rightPaneStyles
      }, loadingOrEmpty, !isLoading && megaChat.displayArchivedChats === true ? React.makeElement(ArchivedConversationsList, {
        key: "archivedchats"
      }) : null, !isLoading ? React.makeElement(_ui_conversationpanel_jsx__WEBPACK_IMPORTED_MODULE_5__["ConversationPanels"], _extends({}, this.props, {
        chatUIFlags: megaChat.chatUIFlags,
        displayArchivedChats: megaChat.displayArchivedChats,
        className: megaChat.displayArchivedChats === true ? "hidden" : "",
        currentlyOpenedChat: megaChat.currentlyOpenedChat,
        chats: megaChat.chats
      })) : null);
      var archivedChatsCount = this.calcArchiveChats();
      var arcBtnClass = megaChat.displayArchivedChats === true ? "left-pane-button archived active" : "left-pane-button archived";
      var arcIconClass = megaChat.displayArchivedChats === true ? "small-icon archive white" : "small-icon archive colorized";
      return React.makeElement("div", {
        className: "conversationsApp",
        key: "conversationsApp"
      }, startGroupChatDialog, React.makeElement("div", {
        className: "fm-left-panel chat-left-panel",
        style: leftPanelStyles
      }, React.makeElement("div", {
        className: "left-pane-drag-handle"
      }), React.makeElement("div", {
        className: "fm-left-menu conversations"
      }, React.makeElement("div", {
        className: "nw-fm-tree-header conversations" + (self.state.quickSearchText ? ' filled-input' : '')
      }, React.makeElement("input", {
        type: "text",
        className: "chat-quick-search",
        onChange: function onChange(e) {
          if (e.target.value) {
            treesearch = e.target.value;
          }

          self.setState({
            'quickSearchText': e.target.value
          });
        },
        onBlur: function onBlur(e) {
          if (e.target.value) {
            treesearch = e.target.value;
          }
        },
        autoComplete: "disabled",
        value: self.state.quickSearchText,
        placeholder: l[7997]
      }), React.makeElement("div", {
        className: "small-icon thin-search-icon"
      }), React.makeElement(_ui_buttons_jsx__WEBPACK_IMPORTED_MODULE_2__["Button"], {
        group: "conversationsListing",
        icon: "chat-with-plus"
      }, React.makeElement(_ui_dropdowns_jsx__WEBPACK_IMPORTED_MODULE_3__["DropdownContactsSelector"], {
        className: "main-start-chat-dropdown",
        onSelectDone: this.startChatClicked.bind(this),
        multiple: false,
        showTopButtons: self.getTopButtonsForContactsPicker()
      })))), React.makeElement("div", {
        className: "fm-tree-panel manual-tree-panel-scroll-management",
        style: leftPanelStyles
      }, React.makeElement(PerfectScrollbar, {
        style: leftPanelStyles,
        className: "conversation-reduce-height",
        chats: megaChat.chats,
        ref: function ref(_ref) {
          megaChat.$chatTreePanePs = _ref;
        }
      }, React.makeElement("div", {
        className: "content-panel conversations" + (getSitePath().indexOf("/chat") !== -1 ? " active" : "")
      }, React.makeElement(ConversationsList, {
        quickSearchText: this.state.quickSearchText
      }))), React.makeElement("div", {
        className: "left-pane-button new-link",
        onClick: function (e) {
          self.startGroupChatFlow = 2;
          self.setState({
            'startGroupChatDialogShown': true
          });
          return false;
        }.bind(this)
      }, React.makeElement("i", {
        className: "small-icon blue-chain colorized"
      }), React.makeElement("div", {
        className: "heading"
      }, __(l[20638]))), React.makeElement("div", {
        className: arcBtnClass,
        onClick: this.archiveChatsClicked.bind(this)
      }, React.makeElement("i", {
        className: arcIconClass
      }), React.makeElement("div", {
        className: "heading"
      }, __(l[19066])), React.makeElement("div", {
        className: "indicator"
      }, archivedChatsCount)))), rightPane);
    }
  }]);

  return ConversationsApp;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_1__["default"])(React.Component));

;

if (false) {}

/* harmony default export */ __webpack_exports__["default"] = ({
  ConversationsList: ConversationsList,
  ArchivedConversationsList: ArchivedConversationsList,
  ConversationsApp: ConversationsApp
});

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);

var utils = __webpack_require__(3);



var Checkbox =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(Checkbox, _MegaRenderMixin);

  function Checkbox(props) {
    var _this;

    _classCallCheck(this, Checkbox);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Checkbox).call(this, props));
    _this.state = {
      checked: _this.props.checked ? _this.props.checked : false
    };
    _this.onLabelClick = _this.onLabelClick.bind(_assertThisInitialized(_this));
    _this.onChange = _this.onChange.bind(_assertThisInitialized(_this));
    return _this;
  }

  _createClass(Checkbox, [{
    key: "onLabelClick",
    value: function onLabelClick(e) {
      var state = !this.state.checked;
      this.setState({
        'checked': state
      });

      if (this.props.onLabelClick) {
        this.props.onLabelClick(e, state);
      }

      this.onChange(e);
    }
  }, {
    key: "onChange",
    value: function onChange(e) {
      if (this.props.onChange) {
        this.props.onChange(e, this.state.checked);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var className = this.state.checked ? "checkboxOn" : "checkboxOff";
      return React.makeElement("div", {
        className: "formsCheckbox"
      }, React.makeElement("div", {
        className: "checkdiv " + className,
        onClick: this.onLabelClick
      }, React.makeElement("input", {
        type: "checkbox",
        name: this.props.name,
        id: this.props.id,
        className: className,
        checked: this.state.checked,
        onChange: this.onChange
      })), React.makeElement("label", {
        htmlFor: this.props.id,
        className: "radio-txt"
      }, this.props.children));
    }
  }]);

  return Checkbox;
}(Object(_stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__["default"])(React.Component));

;
/* harmony default export */ __webpack_exports__["a"] = ({
  Checkbox: Checkbox
});

/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MetaRichpreviewLoading", function() { return MetaRichpreviewLoading; });
/* harmony import */ var _stores_mixins_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);

var utils = __webpack_require__(3);



var ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var MetaRichpreviewLoading =
/*#__PURE__*/
function (_ConversationMessageM) {
  _inherits(MetaRichpreviewLoading, _ConversationMessageM);

  function MetaRichpreviewLoading() {
    _classCallCheck(this, MetaRichpreviewLoading);

    return _possibleConstructorReturn(this, _getPrototypeOf(MetaRichpreviewLoading).apply(this, arguments));
  }

  _createClass(MetaRichpreviewLoading, [{
    key: "render",
    value: function render() {
      return React.makeElement("div", {
        className: "loading-spinner light small"
      }, React.makeElement("div", {
        className: "main-loader"
      }));
    }
  }]);

  return MetaRichpreviewLoading;
}(ConversationMessageMixin);

;


/***/ }),
/* 16 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: external "React"
var external_React_ = __webpack_require__(0);
var external_React_default = /*#__PURE__*/__webpack_require__.n(external_React_);

// EXTERNAL MODULE: external "ReactDOM"
var external_ReactDOM_ = __webpack_require__(4);
var external_ReactDOM_default = /*#__PURE__*/__webpack_require__.n(external_ReactDOM_);

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(3);

// EXTERNAL MODULE: ./js/stores/mixins.js
var mixins = __webpack_require__(1);

// EXTERNAL MODULE: ./js/ui/buttons.jsx
var ui_buttons = __webpack_require__(7);

// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(6);

// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(12);

// CONCATENATED MODULE: ./js/ui/cloudBrowserModalDialog.jsx
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }







function BrowserCol(_ref) {
  var id = _ref.id,
      _ref$className = _ref.className,
      className = _ref$className === void 0 ? '' : _ref$className,
      label = _ref.label,
      sortBy = _ref.sortBy,
      _onClick = _ref.onClick;
  var classes = "".concat(id, " ").concat(className);

  if (sortBy[0] === id) {
    var ordClass = sortBy[1] == "desc" ? "asc" : "desc";
    classes = "".concat(classes, " ").concat(ordClass);
  }

  return React.makeElement("th", {
    onClick: function onClick(e) {
      e.preventDefault();
      e.stopPropagation();

      _onClick(id);
    }
  }, React.makeElement("span", {
    className: "arrow ".concat(classes)
  }, label));
}

;

var cloudBrowserModalDialog_BrowserEntries =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(BrowserEntries, _MegaRenderMixin);

  function BrowserEntries(props) {
    var _this;

    _classCallCheck(this, BrowserEntries);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(BrowserEntries).call(this, props));
    _this.state = {
      'highlighted': _this.props.initialHighlighted || [],
      'selected': _this.props.initialSelected || []
    };
    return _this;
  }

  _createClass(BrowserEntries, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      this.lastCursor = false;
      this.lastCharKeyPressed = false;
      this.lastCharKeyIndex = -1;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;

      if (!self.lastCursor || self.lastCursor !== self.state.cursor) {
        self.lastCursor = self.state.cursor;
        var tr = self.findDOMNode().querySelector('.node_' + self.lastCursor);
        var $jsp = $(tr).parents('.jspScrollable').data('jsp');

        if (tr && $jsp) {
          $jsp.scrollToElement(tr, undefined, false);
        }
      }
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(BrowserEntries.prototype), "componentDidMount", this).call(this);

      this.bindEvents();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      _get(_getPrototypeOf(BrowserEntries.prototype), "componentWillUnmount", this).call(this);

      this.unbindEvents();
    }
  }, {
    key: "getNodesInIndexRange",
    value: function getNodesInIndexRange(firstIndex, lastIndex) {
      var self = this;
      return self.props.entries.filter(function (node, index) {
        return index >= firstIndex && index <= lastIndex && (!self.props.folderSelectNotAllowed ? true : node.t === 0);
      }).map(function (node) {
        return node.h;
      });
    }
  }, {
    key: "getIndexByNodeId",
    value: function getIndexByNodeId(nodeId, notFoundValue) {
      var self = this;
      var foundIndex = typeof notFoundValue === 'undefined' ? -1 : notFoundValue;
      self.props.entries.find(function (r, index) {
        if (r.h === nodeId) {
          foundIndex = index;
          return true;
        }
      });
      return foundIndex;
    }
  }, {
    key: "setSelectedAndHighlighted",
    value: function setSelectedAndHighlighted(highlighted, cursor) {
      var self = this; // highlighted requires to be sorted!

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
    }
  }, {
    key: "_doSelect",
    value: function _doSelect(selectionIncludeShift, currentIndex, targetIndex) {
      var self = this;

      if (targetIndex >= self.props.entries.length) {
        if (selectionIncludeShift) {
          // shift + select down after the last item in the list was selected? do nothing.
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
          // up
          if (self.state.highlighted && self.state.highlighted.length > 0) {
            // more items already selected..append to selection by altering last index
            if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
              // target is already selected, shrink selection
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
          // down
          if (self.state.highlighted && self.state.highlighted.length > 0) {
            // more items are already selected, alter current selection only
            if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
              // target is already selected, shrink selection
              firstIndex = self.getIndexByNodeId(self.state.highlighted[1], 1);
              lastIndex = self.getIndexByNodeId(self.state.highlighted[self.state.highlighted.length - 1], self.state.highlighted.length - 1);
            } else {
              // more items already selected..append to selection by altering first index
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
    }
  }, {
    key: "bindEvents",
    value: function bindEvents() {
      var self = this;
      var KEY_A = 65;
      var KEY_UP = 38;
      var KEY_DOWN = 40;
      var KEY_LEFT = 37;
      var KEY_RIGHT = 39;
      var KEY_ENTER = 13;
      var KEY_BACKSPACE = 8;
      $(document.body).rebind('keydown.cloudBrowserModalDialog', function (e) {
        var charTyped = false;
        var keyCode = e.which || e.keyCode;
        var selectionIncludeShift = e.shiftKey;

        if ($('input:focus, textarea:focus').length > 0) {
          return;
        }

        var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

        if (keyCode === KEY_A && (e.ctrlKey || e.metaKey)) {
          // select all
          var newCursor = false;
          var highlighted = [];

          if (self.props.entries && self.props.entries.length > 0) {
            var firstIndex = 0;
            var lastIndex = self.props.entries.length - 1;
            newCursor = self.props.entries[lastIndex].h;
            highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);
          }

          self.setSelectedAndHighlighted(highlighted, newCursor);
          e.preventDefault();
          e.stopPropagation();
        } else if (e.metaKey && keyCode === KEY_UP || keyCode === KEY_BACKSPACE) {
          if (viewMode === "0") {
            // back
            var currentFolder = M.getNode(self.props.currentlyViewedEntry);

            if (currentFolder.p) {
              self.expandFolder(currentFolder.p);
            }
          }
        } else if (!e.metaKey && (viewMode === "0" && (keyCode === KEY_UP || keyCode === KEY_DOWN) || viewMode === "1" && (keyCode === KEY_LEFT || keyCode === KEY_RIGHT))) {
          // up/down
          var dir = keyCode === (viewMode === "1" ? KEY_LEFT : KEY_UP) ? -1 : 1;
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
        } else if (viewMode === "1" && (keyCode === KEY_UP || keyCode === KEY_DOWN)) {
          var containerWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible').outerWidth();
          var itemWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible .data-block-view:first').outerWidth();
          var itemsPerRow = Math.floor(containerWidth / itemWidth);
          var dir = keyCode === KEY_UP ? -1 : 1;
          var lastHighlighted = self.state.cursor || false;

          if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
            lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
          }

          var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);
          var targetIndex = currentIndex + dir * itemsPerRow;

          if (self.props.entries.length - 1 < targetIndex || targetIndex < 0) {
            // out of range.
            return;
          }

          self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
        } else if (keyCode >= 48 && keyCode <= 57 || keyCode >= 65 && keyCode <= 123 || keyCode > 255) {
          charTyped = String.fromCharCode(keyCode).toLowerCase();
          var foundMatchingNodes = self.props.entries.filter(function (node, index) {
            return node.name && node.name.substr(0, 1).toLowerCase() === charTyped;
          });

          if (self.lastCharKeyPressed === charTyped) {
            self.lastCharKeyIndex++;
          }

          self.lastCharKeyPressed = charTyped;

          if (foundMatchingNodes.length > 0) {
            if (!foundMatchingNodes[self.lastCharKeyIndex]) {
              // start from the first entry
              self.lastCharKeyIndex = 0;
            }

            var foundNode = foundMatchingNodes[self.lastCharKeyIndex];
            self.setSelectedAndHighlighted([foundNode.h], foundNode.h);
          }
        } else if (keyCode === KEY_ENTER || e.metaKey && keyCode === KEY_DOWN) {
          var selectedNodes = [];

          if (self.props.folderSelectNotAllowed === true) {
            // remove all folders from highlighted
            self.state.highlighted.forEach(function (h) {
              var node = self.props.entries.find(function (entry) {
                return entry.h === h;
              });

              if (node && node.t === 0) {
                selectedNodes.push(h);
              }
            }); // if only folders were selected and no files..do open the cursor OR first folder selected

            if (selectedNodes.length === 0) {
              var cursorNode = self.state.cursor && M.getNodeByHandle(self.state.cursor);

              if (cursorNode.t === 1) {
                self.expandFolder(cursorNode.h);
                return;
              } else if (self.state.highlighted.length > 0) {
                // open/expand the first node, we know its a folder already.
                var firstNodeId = self.state.highlighted[0];
                self.expandFolder(firstNodeId);
                return;
              } else {
                // nothing selected, do nothing.
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
        } else {} // do nothing.
        // reset the quick finding feature vars if this was not a "quick find", e.g. charTyped was left empty.


        if (!charTyped) {
          self.lastCharKeyPressed = false;
          self.lastCharKeyIndex = -1;
        } // enter

      });
    }
  }, {
    key: "unbindEvents",
    value: function unbindEvents() {
      $(document.body).off('keydown.cloudBrowserModalDialog');
    }
  }, {
    key: "onEntryClick",
    value: function onEntryClick(e, node) {
      var self = this;
      self.lastCharKeyPressed = false;
      self.lastCharKeyIndex = -1;
      e.stopPropagation();
      e.preventDefault();

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        self.setSelectedAndHighlighted([node.h], node.h);
      } else if (e.shiftKey) {
        // click + shift
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
        // ctrl or cmd/meta, e.g. add to selection
        if (!self.state.highlighted || self.state.highlighted.indexOf(node.h) === -1) {
          var highlighted = clone(self.state.highlighted || []);

          if (self.props.folderSelectNotAllowed) {
            if (node.t === 1 && highlighted.length > 0) {
              return;
            } else if (highlighted.filter(function (nodeId) {
              var node = M.getNodeByHandle(nodeId);
              return node && node.t === 1;
            }).length > 0) {
              // contains folders in selection
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
              // contains folders in selection
              highlighted = [];
            }
          }

          array.remove(highlighted, node.h);
          self.setSelectedAndHighlighted(highlighted, highlighted.length == 0 ? false : highlighted[0]);
        }
      }
    }
  }, {
    key: "expandFolder",
    value: function expandFolder(nodeId) {
      var self = this;
      var node = M.getNodeByHandle(nodeId);

      if (node) {
        // reset quick search selection indexes
        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1; // expand folder

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
    }
  }, {
    key: "onEntryDoubleClick",
    value: function onEntryDoubleClick(e, node) {
      var self = this;
      self.lastCharKeyPressed = false;
      self.lastCharKeyIndex = -1;
      e.stopPropagation();
      e.preventDefault();

      if (node.t) {
        // expand folder
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
    }
  }, {
    key: "componentSpecificIsComponentEventuallyVisible",
    value: function componentSpecificIsComponentEventuallyVisible() {
      return true;
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var items = [];
      var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";
      var imagesThatRequireLoading = [];
      self.props.entries.forEach(function (node) {
        if (node.t !== 0 && node.t !== 1) {
          // continue
          return;
        }

        if (!node.name) {
          // continue
          return;
        }

        var isFolder = node.t;
        var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;
        var fileIconType = fileIcon(node); // megadrop or shared folder

        var isSharedFolder = fileIconType === 'puf-folder' || fileIconType === 'folder-shared';
        var sharedFolderClass = '';

        if (isSharedFolder) {
          sharedFolderClass = fileIconType;
        }

        var tooltipElement = null;
        var icon = React.makeElement("span", {
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
              node.seen = 1; // HACK
            }

            src = window.noThumbURI || '';
          }

          icon = React.makeElement(tooltips["a" /* default */].Tooltip, {
            withArrow: true
          }, React.makeElement(tooltips["a" /* default */].Handler, {
            className: "transfer-filetype-icon " + fileIcon(node)
          }, " "), React.makeElement(tooltips["a" /* default */].Contents, {
            className: "img-preview"
          }, React.makeElement("div", {
            className: "dropdown img-wrapper img-block",
            id: node.h
          }, React.makeElement("img", {
            alt: "",
            className: "thumbnail-placeholder " + node.h,
            src: src,
            width: "156",
            height: "156"
          }))));

          if (src) {
            image = React.makeElement("img", {
              alt: "",
              src: src
            });
          } else {
            image = React.makeElement("img", {
              alt: ""
            });
          }
        }

        var share = M.getNodeShare(node);
        var hasPublicLink = null;
        var classLinked = null;

        if (share) {
          classLinked = 'linked';
          hasPublicLink = React.makeElement("span", {
            className: "data-item-icon public-link-icon"
          });
        }

        if (viewMode === "0") {
          items.push(React.makeElement("tr", {
            className: "node_" + node.h + " " + (isFolder ? " folder" : "") + (isHighlighted ? " ui-selected" : ""),
            onClick: function onClick(e) {
              self.onEntryClick(e, node);
            },
            onDoubleClick: function onDoubleClick(e) {
              self.onEntryDoubleClick(e, node);
            },
            key: node.h
          }, React.makeElement("td", null, React.createElement("span", {
            className: "grid-status-icon" + (node.fav ? " star" : "")
          })), React.makeElement("td", null, icon, React.createElement("span", {
            className: "tranfer-filetype-txt"
          }, node.name)), React.makeElement("td", null, !isFolder ? bytesToSize(node.s) : ""), React.createElement("td", {
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

          items.push(React.makeElement("div", {
            className: "data-block-view node_" + node.h + " " + (isFolder ? " folder" : " file") + (isHighlighted ? " ui-selected" : "") + (share ? " linked" : "") + colorLabelClasses,
            onClick: function onClick(e) {
              self.onEntryClick(e, node);
            },
            onDoubleClick: function onDoubleClick(e) {
              self.onEntryDoubleClick(e, node);
            },
            id: "chat_" + node.h,
            key: "block_" + node.h,
            title: node.name
          }, React.makeElement("div", {
            className: (src ? "data-block-bg thumb" : "data-block-bg") + (is_video(node) ? " video" : "")
          }, React.makeElement("div", {
            className: "data-block-indicators"
          }, React.makeElement("div", {
            className: "file-status-icon indicator" + (node.fav ? " star" : "")
          }), React.makeElement("div", {
            className: "data-item-icon indicator"
          })), React.makeElement("div", {
            className: "block-view-file-type " + (isFolder ? " folder " : " file " + fileIcon(node)) + sharedFolderClass
          }, image), is_video(node) ? React.makeElement("div", {
            className: "video-thumb-details"
          }, React.makeElement("i", {
            className: "small-icon small-play-icon"
          }), React.makeElement("span", null, playtime ? playtime : "00:00")) : null), React.createElement("div", {
            className: "file-block-title"
          }, node.name)));
        }
      });

      if (imagesThatRequireLoading.length > 0) {
        fm_thumbnails('standalone', imagesThatRequireLoading);
      }

      if (items.length > 0) {
        if (viewMode === "0") {
          return React.makeElement(utils["default"].JScrollPane, {
            className: "fm-dialog-scroll grid",
            selected: this.state.selected,
            highlighted: this.state.highlighted,
            entries: this.props.entries,
            ref: function ref(jsp) {
              self.jsp = jsp;
            }
          }, React.makeElement("table", {
            className: "grid-table fm-dialog-table"
          }, React.makeElement("tbody", null, items)));
        } else {
          return React.makeElement(utils["default"].JScrollPane, {
            className: "fm-dialog-scroll blocks",
            selected: this.state.selected,
            highlighted: this.state.highlighted,
            entries: this.props.entries,
            ref: function ref(jsp) {
              self.jsp = jsp;
            }
          }, React.makeElement("div", {
            className: "content"
          }, items, React.makeElement("div", {
            className: "clear"
          })));
        }
      } else if (self.props.isLoading) {
        return React.makeElement("div", {
          className: "dialog-empty-block dialog-fm folder"
        }, React.makeElement("div", {
          className: "dialog-empty-pad"
        }, React.makeElement("div", {
          className: "dialog-empty-icon"
        }), React.makeElement("div", {
          className: "dialog-empty-header"
        }, __(l[5533]))));
      } else if (!self.props.entries.length && self.props.currentlyViewedEntry === 'search') {
        return React.makeElement("div", {
          className: "dialog-empty-block dialog-fm folder"
        }, React.makeElement("div", {
          className: "dialog-empty-pad"
        }, React.makeElement("div", {
          className: "fm-empty-search-bg"
        }), React.makeElement("div", {
          className: "dialog-empty-header"
        }, l[978])));
      }

      return React.makeElement("div", {
        className: "dialog-empty-block dialog-fm folder"
      }, self.props.currentlyViewedEntry === 'shares' ? React.makeElement("div", {
        className: "dialog-empty-pad"
      }, React.makeElement("div", {
        className: "fm-empty-incoming-bg"
      }), React.makeElement("div", {
        className: "dialog-empty-header"
      }, l[6871])) : React.makeElement("div", {
        className: "dialog-empty-pad"
      }, React.makeElement("div", {
        className: "fm-empty-folder-bg"
      }), React.makeElement("div", {
        className: "dialog-empty-header"
      }, self.props.currentlyViewedEntry === M.RootID ? l[1343] : l[782])));
    }
  }]);

  return BrowserEntries;
}(Object(mixins["default"])(external_React_["Component"]));

cloudBrowserModalDialog_BrowserEntries.defaultProps = {
  'hideable': true,
  'requiresUpdateOnResize': true
};
;

var cloudBrowserModalDialog_CloudBrowserDialog =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(CloudBrowserDialog, _MegaRenderMixin2);

  function CloudBrowserDialog(props) {
    var _this2;

    _classCallCheck(this, CloudBrowserDialog);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(CloudBrowserDialog).call(this, props));
    _this2.state = {
      'sortBy': ['name', 'asc'],
      'selected': [],
      'highlighted': [],
      'currentlyViewedEntry': M.RootID,
      'selectedTab': 'clouddrive',
      'searchValue': ''
    };
    _this2.onAttachClicked = _this2.onAttachClicked.bind(_assertThisInitialized(_this2));
    _this2.onClearSearchIconClick = _this2.onClearSearchIconClick.bind(_assertThisInitialized(_this2));
    _this2.onHighlighted = _this2.onHighlighted.bind(_assertThisInitialized(_this2));
    _this2.onPopupDidMount = _this2.onPopupDidMount.bind(_assertThisInitialized(_this2));
    _this2.onSearchChange = _this2.onSearchChange.bind(_assertThisInitialized(_this2));
    _this2.onSearchIconClick = _this2.onSearchIconClick.bind(_assertThisInitialized(_this2));
    _this2.onSelected = _this2.onSelected.bind(_assertThisInitialized(_this2));
    _this2.onTabButtonClick = _this2.onTabButtonClick.bind(_assertThisInitialized(_this2));
    _this2.onViewButtonClick = _this2.onViewButtonClick.bind(_assertThisInitialized(_this2));
    _this2.toggleSortBy = _this2.toggleSortBy.bind(_assertThisInitialized(_this2));
    return _this2;
  }

  _createClass(CloudBrowserDialog, [{
    key: "toggleSortBy",
    value: function toggleSortBy(colId) {
      if (this.state.sortBy[0] === colId) {
        this.setState({
          'sortBy': [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"]
        });
      } else {
        this.setState({
          'sortBy': [colId, "asc"]
        });
      }
    }
  }, {
    key: "onViewButtonClick",
    value: function onViewButtonClick(e, node) {
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
    }
  }, {
    key: "onSearchIconClick",
    value: function onSearchIconClick(e, node) {
      var $parentBlock = $(e.target).closest(".fm-header-buttons");

      if ($parentBlock.hasClass("active-search")) {
        $parentBlock.removeClass("active-search");
      } else {
        $parentBlock.addClass("active-search");
        $('input', $parentBlock).trigger("focus");
      }
    }
  }, {
    key: "onClearSearchIconClick",
    value: function onClearSearchIconClick() {
      var self = this;
      self.setState({
        'searchValue': '',
        'currentlyViewedEntry': M.RootID
      });
    }
  }, {
    key: "onTabButtonClick",
    value: function onTabButtonClick(e, selectedTab) {
      var $this = $(e.target);
      $this.parent().find('.active').removeClass("active");
      $this.addClass("active");
      var newState = {
        'selectedTab': selectedTab,
        'searchValue': ''
      };

      if (selectedTab === 'shares') {
        newState['currentlyViewedEntry'] = 'shares';
      } else {
        newState['currentlyViewedEntry'] = M.RootID;
      }

      newState['isLoading'] = false;
      this.setState(newState);
      this.onSelected([]);
      this.onHighlighted([]);
    }
  }, {
    key: "onSearchChange",
    value: function onSearchChange(e) {
      var searchValue = e.target.value;
      var newState = {
        'selectedTab': 'search',
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
      this.onSelected([]);
      this.onHighlighted([]);
    }
  }, {
    key: "resizeBreadcrumbs",
    value: function resizeBreadcrumbs() {
      var $breadcrumbsWrapper = $('.fm-breadcrumbs-wrapper.add-from-cloud', this.findDOMNode());
      var $breadcrumbs = $breadcrumbsWrapper.find('.fm-breadcrumbs-block');
      setTimeout(function () {
        var wrapperWidth = $breadcrumbsWrapper.outerWidth();
        var $el = $breadcrumbs.find('.right-arrow-bg');
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
      }, 0);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate(prevProps, prevState) {
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
              'entries': null
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
              'entries': null
            });
          });
          return;
        }

        var $jspElem = $(self.findDOMNode()).find('.jspScrollable');

        if ($jspElem) {
          var $jsp = $jspElem.data('jsp');

          if ($jsp) {
            Soon(function () {
              // seems like there is a bug in JSP, if I call this too early the scroll won't move, but the area
              // would scroll to 0, 0
              $jsp.scrollTo(0, 0, false);
            });
          }
        }

        this.setState({
          entries: null
        });
      }
    }
  }, {
    key: "getEntries",
    value: function getEntries() {
      var self = this;
      var order = self.state.sortBy[1] === "asc" ? 1 : -1;
      var entries = [];

      if (self.state.currentlyViewedEntry === "search" && self.state.searchValue && self.state.searchValue.length >= 3) {
        M.getFilterBy(M.getFilterBySearchFn(self.state.searchValue)).forEach(function (n) {
          // skip contacts and invalid data.
          if (!n.h || n.h.length === 11) {
            return;
          }

          entries.push(n);
        });
      } else {
        Object.keys(M.c[self.state.currentlyViewedEntry] || {}).forEach(function (h) {
          M.d[h] && entries.push(M.d[h]);
        });
      }

      var sortFunc;

      if (self.state.sortBy[0] === "name") {
        sortFunc = M.getSortByNameFn();
      } else if (self.state.sortBy[0] === "size") {
        sortFunc = M.getSortBySizeFn();
      } else if (self.state.sortBy[0] === "ts") {
        sortFunc = M.getSortByDateTimeFn(); // invert

        order = order === 1 ? -1 : 1;
      } else
        /*if(self.state.sortBy[0] === "grid-header-star")*/
        {
          sortFunc = M.sortByFavFn(order);
        } // always return first the folders and then the files


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
    }
  }, {
    key: "onSelected",
    value: function onSelected(nodes) {
      this.setState({
        'selected': nodes
      });
      this.props.onSelected(nodes);
    }
  }, {
    key: "onHighlighted",
    value: function onHighlighted(nodes) {
      this.setState({
        'highlighted': nodes
      });

      if (this.props.onHighlighted) {
        this.props.onHighlighted(nodes);
      }
    }
  }, {
    key: "onPopupDidMount",
    value: function onPopupDidMount(elem) {
      this.domNode = elem;
    }
  }, {
    key: "onAttachClicked",
    value: function onAttachClicked() {
      this.props.onAttachClicked();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var entries = self.state.entries || self.getEntries();
      var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";
      var classes = "add-from-cloud ".concat(self.props.className);
      var folderIsHighlighted = false;
      var breadcrumb = [];
      M.getPath(self.state.currentlyViewedEntry).forEach(function (breadcrumbNodeId, k) {
        // skip [share owner handle] when returned by M.getPath.
        if (M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].h && M.d[breadcrumbNodeId].h.length === 11) {
          return;
        }

        var breadcrumbClasses = "";

        if (breadcrumbNodeId === M.RootID) {
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

        if (breadcrumbNodeId === "shares") {
          breadcrumbClasses += " shared-with-me";
        }

        var folderName = breadcrumbNodeId === M.RootID ? __(l[164]) : breadcrumbNodeId === "shares" ? l[5589] : M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].name;

        (function (breadcrumbNodeId) {
          breadcrumb.unshift(React.makeElement("a", {
            className: "fm-breadcrumbs contains-directories " + breadcrumbClasses,
            key: breadcrumbNodeId,
            onClick: function onClick(e) {
              e.preventDefault();
              e.stopPropagation();
              self.setState({
                'currentlyViewedEntry': breadcrumbNodeId,
                'selected': [],
                'searchValue': ''
              });
              self.onSelected([]);
              self.onHighlighted([]);
            }
          }, React.makeElement("span", {
            className: "right-arrow-bg simpletip",
            "data-simpletip": folderName
          }, React.makeElement("span", null, folderName))));
        })(breadcrumbNodeId);
      });
      self.state.highlighted.forEach(function (nodeId) {
        if (M.d[nodeId] && M.d[nodeId].t === 1) {
          folderIsHighlighted = true;
        }
      });
      var buttons = [];

      if (!folderIsHighlighted || self.props.folderSelectable) {
        buttons.push({
          "label": self.props.selectLabel,
          "key": "select",
          "className": "default-grey-button " + (self.state.selected.length === 0 ? "disabled" : null),
          "onClick": function onClick(e) {
            if (self.state.selected.length > 0) {
              self.props.onSelected(self.state.selected);
              self.props.onAttachClicked();
            }

            e.preventDefault();
            e.stopPropagation();
          }
        });
      } else if (folderIsHighlighted) {
        buttons.push({
          "label": self.props.openLabel,
          "key": "select",
          "className": "default-grey-button",
          "onClick": function onClick(e) {
            if (self.state.highlighted.length > 0) {
              self.setState({
                'currentlyViewedEntry': self.state.highlighted[0]
              });
              self.onSelected([]);
              self.onHighlighted([]);
              self.browserEntries.setState({
                'selected': [],
                'searchValue': '',
                'highlighted': []
              });
            }

            e.preventDefault();
            e.stopPropagation();
          }
        });
      }

      buttons.push({
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick": function onClick(e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      var gridHeader = [];

      if (viewMode === "0") {
        gridHeader.push(React.makeElement("table", {
          className: "grid-table-header fm-dialog-table",
          key: "grid-table-header"
        }, React.makeElement("tbody", null, React.createElement("tr", null, React.createElement(BrowserCol, {
          id: "grid-header-star",
          sortBy: self.state.sortBy,
          onClick: self.toggleSortBy
        }), React.makeElement(BrowserCol, {
          id: "name",
          label: __(l[86]),
          sortBy: self.state.sortBy,
          onClick: self.toggleSortBy
        }), React.makeElement(BrowserCol, {
          id: "size",
          label: __(l[87]),
          sortBy: self.state.sortBy,
          onClick: self.toggleSortBy
        }), React.makeElement(BrowserCol, {
          id: "ts",
          label: __(l[16169]),
          sortBy: self.state.sortBy && self.state.sortBy[0] === "ts" ? ["ts", self.state.sortBy[1] === "desc" ? "asc" : "desc"] : self.state.sortBy,
          onClick: self.toggleSortBy
        })))));
      }

      var clearSearchBtn = null;

      if (self.state.searchValue.length >= 3) {
        clearSearchBtn = React.makeElement("i", {
          className: "top-clear-button",
          style: {
            'right': '85px'
          },
          onClick: function onClick() {
            self.onClearSearchIconClick();
          }
        });
      }

      return React.makeElement(modalDialogs["a" /* default */].ModalDialog, {
        title: self.props.title || __(l[8011]),
        className: classes,
        onClose: function onClose() {
          self.props.onClose(self);
        },
        popupDidMount: self.onPopupDidMount,
        buttons: buttons
      }, React.makeElement("div", {
        className: "fm-dialog-tabs"
      }, React.makeElement("div", {
        className: "fm-dialog-tab cloud active",
        onClick: function onClick(e) {
          self.onTabButtonClick(e, 'clouddrive');
        }
      }, __(l[164])), React.makeElement("div", {
        className: "fm-dialog-tab incoming",
        onClick: function onClick(e) {
          self.onTabButtonClick(e, 'shares');
        }
      }, __(l[5542])), React.makeElement("div", {
        className: "clear"
      })), React.makeElement("div", {
        className: "fm-picker-header"
      }, React.makeElement("div", {
        className: "fm-header-buttons"
      }, React.makeElement("a", {
        className: "fm-files-view-icon block-view" + (viewMode === "1" ? " active" : ""),
        title: "Thumbnail view",
        onClick: function onClick(e) {
          self.onViewButtonClick(e);
        }
      }), React.makeElement("a", {
        className: "fm-files-view-icon listing-view" + (viewMode === "0" ? " active" : ""),
        title: "List view",
        onClick: function onClick(e) {
          self.onViewButtonClick(e);
        }
      }), React.makeElement("div", {
        className: "fm-files-search"
      }, React.makeElement("i", {
        className: "search",
        onClick: function onClick(e) {
          self.onSearchIconClick(e);
        }
      }, ">"), React.makeElement("input", {
        type: "search",
        placeholder: __(l[102]),
        value: self.state.searchValue,
        onChange: self.onSearchChange
      }), clearSearchBtn), React.makeElement("div", {
        className: "clear"
      })), React.makeElement("div", {
        className: "fm-breadcrumbs-wrapper add-from-cloud"
      }, React.makeElement("div", {
        className: "fm-breadcrumbs-block"
      }, breadcrumb, React.makeElement("div", {
        className: "clear"
      })))), gridHeader, React.makeElement(cloudBrowserModalDialog_BrowserEntries, {
        isLoading: self.state.isLoading,
        currentlyViewedEntry: self.state.currentlyViewedEntry,
        entries: entries,
        onExpand: function onExpand(node) {
          self.onSelected([]);
          self.onHighlighted([]);
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
      }));
    }
  }]);

  return CloudBrowserDialog;
}(Object(mixins["default"])(external_React_["Component"]));

cloudBrowserModalDialog_CloudBrowserDialog.defaultProps = {
  'selectLabel': __(l[8023]),
  'openLabel': __(l[1710]),
  'cancelLabel': __(l[82]),
  'hideable': true,
  className: ''
};
;
window.CloudBrowserModalDialogUI = {
  CloudBrowserDialog: cloudBrowserModalDialog_CloudBrowserDialog
};
/* harmony default export */ var cloudBrowserModalDialog = ({
  CloudBrowserDialog: cloudBrowserModalDialog_CloudBrowserDialog
});
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
var ui_dropdowns = __webpack_require__(5);

// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(2);

// CONCATENATED MODULE: ./js/ui/emojiDropdown.jsx
function emojiDropdown_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { emojiDropdown_typeof = function _typeof(obj) { return typeof obj; }; } else { emojiDropdown_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return emojiDropdown_typeof(obj); }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function emojiDropdown_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function emojiDropdown_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function emojiDropdown_createClass(Constructor, protoProps, staticProps) { if (protoProps) emojiDropdown_defineProperties(Constructor.prototype, protoProps); if (staticProps) emojiDropdown_defineProperties(Constructor, staticProps); return Constructor; }

function emojiDropdown_possibleConstructorReturn(self, call) { if (call && (emojiDropdown_typeof(call) === "object" || typeof call === "function")) { return call; } return emojiDropdown_assertThisInitialized(self); }

function emojiDropdown_getPrototypeOf(o) { emojiDropdown_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return emojiDropdown_getPrototypeOf(o); }

function emojiDropdown_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function emojiDropdown_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) emojiDropdown_setPrototypeOf(subClass, superClass); }

function emojiDropdown_setPrototypeOf(o, p) { emojiDropdown_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return emojiDropdown_setPrototypeOf(o, p); }

var emojiDropdown_React = __webpack_require__(0);

var emojiDropdown_utils = __webpack_require__(3);



var DropdownsUI = __webpack_require__(5);

var PerfectScrollbar = __webpack_require__(11).PerfectScrollbar;

var DropdownEmojiSelector =
/*#__PURE__*/
function (_MegaRenderMixin) {
  emojiDropdown_inherits(DropdownEmojiSelector, _MegaRenderMixin);

  function DropdownEmojiSelector(props) {
    var _this;

    emojiDropdown_classCallCheck(this, DropdownEmojiSelector);

    _this = emojiDropdown_possibleConstructorReturn(this, emojiDropdown_getPrototypeOf(DropdownEmojiSelector).call(this, props));
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
    /*
     "PEOPLE": l[8016],
     "NATURE": l[8017],
     "FOOD & DRINK": l[8018],
     "CELEBRATION": l[8019],
     "ACTIVITY": l[8020],
     "TRAVEL & PLACES": l[8021],
     "OBJECTS & SYMBOLS": l[8022]
     */

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
    _this.onSearchChange = _this.onSearchChange.bind(emojiDropdown_assertThisInitialized(_this));
    _this.onUserScroll = _this.onUserScroll.bind(emojiDropdown_assertThisInitialized(_this));
    _this._onScrollChanged = _this._onScrollChanged.bind(emojiDropdown_assertThisInitialized(_this));
    return _this;
  }

  emojiDropdown_createClass(DropdownEmojiSelector, [{
    key: "getInitialState",
    value: function getInitialState() {
      return clone({
        'previewEmoji': null,
        'searchValue': '',
        'browsingCategory': false,
        'isActive': false,
        'isLoading': true,
        'loadFailed': false,
        'visibleCategories': "0"
      });
    }
  }, {
    key: "_generateEmoji",
    value: function _generateEmoji(meta) {
      var filename = twemoji.convert.toCodePoint(meta.u);
      return emojiDropdown_React.makeElement("img", {
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
    }
  }, {
    key: "_generateEmojiElement",
    value: function _generateEmojiElement(emoji, cat) {
      var self = this;
      var categoryName = self.data_categories[cat];
      return emojiDropdown_React.makeElement("div", {
        "data-emoji": emoji.n,
        className: "button square-button emoji",
        key: categoryName + "_" + emoji.n,
        onMouseEnter: function onMouseEnter(e) {
          if (self.mouseEnterTimer) {
            clearTimeout(self.mouseEnterTimer);
          }

          e.stopPropagation();
          e.preventDefault(); // delay the .setState change, because of the tons of icons we've, which are
          // re-rendered in case of .setState

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
    }
  }, {
    key: "componentWillUpdate",
    value: function componentWillUpdate(nextProps, nextState) {
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
            } // custom categories order


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
          // cleanup cached React/DOM elements from the emoji set
          self.data_emojis.forEach(function (emoji) {
            delete emoji.element;
          });
        }

        self.data_emojis = null;
        self.data_categories = null;
        self.data_emojiByCategory = null;
        self.loadingPromise = null;
      }
    }
  }, {
    key: "onSearchChange",
    value: function onSearchChange(e) {
      var self = this;
      self.setState({
        searchValue: e.target.value,
        browsingCategory: false
      });
    }
  }, {
    key: "onUserScroll",
    value: function onUserScroll($ps, elem, e) {
      if (this.state.browsingCategory) {
        var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');

        if (!elementInViewport($cat)) {
          this.setState({
            'browsingCategory': false
          });
        }
      }

      this._onScrollChanged($ps.getScrollPositionY());
    }
  }, {
    key: "generateEmojiElementsByCategory",
    value: function generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
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
        return self._cachedNodes[categoryId] = [totalHeight, emojiDropdown_React.makeElement("div", {
          key: categoryName,
          "data-category-name": categoryName,
          className: "emoji-category-container",
          style: {
            'position': 'absolute',
            'top': posTop
          }
        }, emojis.length > 0 ? emojiDropdown_React.makeElement("div", {
          className: "clear"
        }) : null, emojiDropdown_React.makeElement("div", {
          className: "emoji-type-txt"
        }, self.categoryLabels[categoryName] ? self.categoryLabels[categoryName] : categoryName), emojiDropdown_React.makeElement("div", {
          className: "clear"
        }), emojis, emojiDropdown_React.makeElement("div", {
          className: "clear"
        }))];
      } else {
        return self._cachedNodes[categoryId] = undefined;
      }
    }
  }, {
    key: "_isVisible",
    value: function _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
      var visibleTop = elTop < scrollTop ? scrollTop : elTop;
      var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
      var visibleHeight = visibleBottom - visibleTop;
      return visibleBottom - visibleTop > 0;
    }
  }, {
    key: "_onScrollChanged",
    value: function _onScrollChanged(scrollPositionY, stateObj) {
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

      var emojis = [];
      var searchValue = stateObj.searchValue;
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
        var emojisNotFound = emojiDropdown_React.makeElement("span", {
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
    }
  }, {
    key: "_renderEmojiPickerPopup",
    value: function _renderEmojiPickerPopup() {
      var self = this;
      var preview;

      if (self.state.previewEmoji) {
        var meta = self.state.previewEmoji;
        var slug = meta.n;
        var txt = ":" + slug + ":";

        if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
          txt = slug;
        }

        preview = emojiDropdown_React.makeElement("div", {
          className: "emoji-preview"
        }, self._generateEmoji(meta), emojiDropdown_React.makeElement("div", {
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
        categoryButtons.push(emojiDropdown_React.makeElement("div", {
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
        }, emojiDropdown_React.makeElement("i", {
          className: "small-icon " + categoryIcons[categoryName]
        })));
      });
      return emojiDropdown_React.makeElement("div", null, emojiDropdown_React.createElement("div", {
        className: "popup-header emoji"
      }, preview ? preview : emojiDropdown_React.makeElement("div", {
        className: "search-block emoji"
      }, emojiDropdown_React.makeElement("i", {
        className: "small-icon search-icon"
      }), emojiDropdown_React.makeElement("input", {
        type: "search",
        placeholder: __(l[102]),
        ref: "emojiSearchField",
        onChange: this.onSearchChange,
        value: this.state.searchValue
      }))), emojiDropdown_React.makeElement(PerfectScrollbar, {
        className: "popup-scroll-area emoji perfectScrollbarContainer",
        searchValue: this.state.searchValue,
        onUserScroll: this.onUserScroll,
        visibleCategories: this.state.visibleCategories,
        ref: function ref(_ref) {
          self.scrollableArea = _ref;
        }
      }, emojiDropdown_React.makeElement("div", {
        className: "popup-scroll-content emoji"
      }, emojiDropdown_React.makeElement("div", {
        style: {
          height: self.state.totalScrollHeight
        }
      }, self._emojiReactElements))), emojiDropdown_React.makeElement("div", {
        className: "popup-footer emoji"
      }, categoryButtons));
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var popupContents = null;

      if (self.state.isActive === true) {
        if (self.state.loadFailed === true) {
          popupContents = emojiDropdown_React.makeElement("div", {
            className: "loading"
          }, l[1514]);
        } else if (self.state.isLoading === true && !self.data_emojiByCategory) {
          popupContents = emojiDropdown_React.makeElement("div", {
            className: "loading"
          }, l[5533]);
        } else {
          popupContents = self._renderEmojiPickerPopup();
        }
      } else {
        popupContents = null;
      }

      return emojiDropdown_React.makeElement(DropdownsUI.Dropdown, _extends({
        className: "popup emoji"
      }, self.props, {
        ref: "dropdown",
        isLoading: self.state.isLoading,
        loadFailed: self.state.loadFailed,
        visibleCategories: this.state.visibleCategories,
        forceShowWhenEmpty: true,
        onActiveChange: function onActiveChange(newValue) {
          // reset state if the dropdown is hidden
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
    }
  }]);

  return DropdownEmojiSelector;
}(Object(mixins["default"])(emojiDropdown_React.Component));
DropdownEmojiSelector.defaultProps = {
  'requiresUpdateOnResize': true,
  'hideable': true
};
;
// CONCATENATED MODULE: ./js/chat/ui/emojiAutocomplete.jsx
function emojiAutocomplete_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { emojiAutocomplete_typeof = function _typeof(obj) { return typeof obj; }; } else { emojiAutocomplete_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return emojiAutocomplete_typeof(obj); }

function emojiAutocomplete_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function emojiAutocomplete_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function emojiAutocomplete_createClass(Constructor, protoProps, staticProps) { if (protoProps) emojiAutocomplete_defineProperties(Constructor.prototype, protoProps); if (staticProps) emojiAutocomplete_defineProperties(Constructor, staticProps); return Constructor; }

function emojiAutocomplete_possibleConstructorReturn(self, call) { if (call && (emojiAutocomplete_typeof(call) === "object" || typeof call === "function")) { return call; } return emojiAutocomplete_assertThisInitialized(self); }

function emojiAutocomplete_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function emojiAutocomplete_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { emojiAutocomplete_get = Reflect.get; } else { emojiAutocomplete_get = function _get(target, property, receiver) { var base = emojiAutocomplete_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return emojiAutocomplete_get(target, property, receiver || target); }

function emojiAutocomplete_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = emojiAutocomplete_getPrototypeOf(object); if (object === null) break; } return object; }

function emojiAutocomplete_getPrototypeOf(o) { emojiAutocomplete_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return emojiAutocomplete_getPrototypeOf(o); }

function emojiAutocomplete_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) emojiAutocomplete_setPrototypeOf(subClass, superClass); }

function emojiAutocomplete_setPrototypeOf(o, p) { emojiAutocomplete_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return emojiAutocomplete_setPrototypeOf(o, p); }

var emojiAutocomplete_React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);



var ButtonsUI = __webpack_require__(7);

var EmojiAutocomplete =
/*#__PURE__*/
function (_MegaRenderMixin) {
  emojiAutocomplete_inherits(EmojiAutocomplete, _MegaRenderMixin);

  function EmojiAutocomplete(props) {
    var _this;

    emojiAutocomplete_classCallCheck(this, EmojiAutocomplete);

    _this = emojiAutocomplete_possibleConstructorReturn(this, emojiAutocomplete_getPrototypeOf(EmojiAutocomplete).call(this, props));
    _this.state = {
      'selected': 0
    };
    return _this;
  }

  emojiAutocomplete_createClass(EmojiAutocomplete, [{
    key: "preload_emojis",
    value: function preload_emojis() {
      var self = this;

      if (!self.loadingPromise) {
        self.loadingPromise = megaChat.getEmojiDataSet('emojis').done(function (emojis) {
          self.data_emojis = emojis;
          Soon(function () {
            self.data_emojis = emojis;
            self.safeForceUpdate();
          });
        });
      }

      ;
    }
  }, {
    key: "unbindKeyEvents",
    value: function unbindKeyEvents() {
      $(document).off('keydown.emojiAutocomplete' + this.getUniqueId());
    }
  }, {
    key: "bindKeyEvents",
    value: function bindKeyEvents() {
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
          // don't process this event if alt is pressed. e.g. alt + left should allow selection
          return;
        }

        var selected = $.isNumeric(self.state.selected) ? self.state.selected : 0;
        var handled = false;

        if (!e.shiftKey && (key === 37 || key === 38)) {
          // up/left
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
          // down, right, tab
          selected = selected + (key === 9 ? e.shiftKey ? -1 : 1 : 1); // support for shift+tab (left/back)

          selected = selected < 0 ? Object.keys(self.found).length - 1 : selected;
          selected = selected >= self.props.maxEmojis || selected >= Object.keys(self.found).length ? 0 : selected; // is a valid item in the list, tab is pressed OR prev selected != current selected

          if (self.found[selected] && (key === 9 || self.state.selected !== selected)) {
            self.setState({
              'selected': selected,
              'prefilled': true
            });
            self.props.onPrefill(false, ":" + self.found[selected].n + ":");
            handled = true;
          }
        } else if (key === 13) {
          // enter
          self.unbindKeyEvents();

          if (selected === -1) {
            if (self.found.length > 0) {
              for (var i = 0; i < self.found.length; i++) {
                if (":" + self.found[i].n + ":" === self.props.emojiSearchQuery + ":") {
                  // if only 1 found and it matches almost the search query
                  // e.g. support for :smiley$ENTER$
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
          // esc
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
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      if (!this.props.emojiSearchQuery) {
        this.unbindKeyEvents();
      } else {
        this.bindKeyEvents();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      emojiAutocomplete_get(emojiAutocomplete_getPrototypeOf(EmojiAutocomplete.prototype), "componentWillUnmount", this).call(this);

      this.unbindKeyEvents();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;

      if (!self.props.emojiSearchQuery) {
        return null;
      }

      self.preload_emojis();

      if (self.loadingPromise && self.loadingPromise.state() === 'pending') {
        return emojiAutocomplete_React.makeElement("div", {
          className: "textarea-autofill-bl"
        }, emojiAutocomplete_React.makeElement("div", {
          className: "textarea-autofill-info"
        }, l[5533]));
      } // strip "^:"


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
      var found = exactMatch.concat(partialMatch).slice(0, self.props.maxEmojis); // explicit mem cleanup

      exactMatch = partialMatch = null;
      this.maxFound = found.length;
      this.found = found;

      if (!found || found.length === 0) {
        setTimeout(function () {
          // onCancel may need to do a .setState on parent component, so need to run it in a separate
          // thread/stack
          self.props.onCancel();
        }, 0);
        return null;
      }

      var emojisDomList = [];

      for (var i = 0; i < found.length; i++) {
        var meta = found[i];
        var filename = twemoji.convert.toCodePoint(meta.u);
        emojisDomList.push(emojiAutocomplete_React.makeElement("div", {
          className: "emoji-preview shadow " + (this.state.selected === i ? "active" : ""),
          key: meta.n + "_" + (this.state.selected === i ? "selected" : "inselected"),
          title: ":" + meta.n + ":",
          onClick: function onClick(e) {
            self.props.onSelect(e, e.target.title);
            self.unbindKeyEvents();
          }
        }, emojiAutocomplete_React.makeElement("img", {
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
        }), emojiAutocomplete_React.makeElement("div", {
          className: "emoji title"
        }, ":" + meta.n + ":")));
      }

      return emojiAutocomplete_React.makeElement("div", {
        className: "textarea-autofill-bl"
      }, emojiAutocomplete_React.makeElement("div", {
        className: "textarea-autofill-info"
      }, emojiAutocomplete_React.makeElement("strong", null, "tab"), " or  ", emojiAutocomplete_React.createElement("i", {
        className: "small-icon tab-icon"
      }), " to navigate", emojiAutocomplete_React.makeElement("i", {
        className: "small-icon enter-icon left-pad"
      }), " to select ", emojiAutocomplete_React.makeElement("strong", {
        className: "left-pad"
      }, "esc"), "to dismiss"), emojiAutocomplete_React.makeElement("div", {
        className: "textarea-autofill-emoji"
      }, emojisDomList));
    }
  }]);

  return EmojiAutocomplete;
}(Object(mixins["default"])(emojiAutocomplete_React.Component));
EmojiAutocomplete.data_emojis = null;
EmojiAutocomplete.defaultProps = {
  'requiresUpdateOnResize': true,
  'emojiSearchQuery': false,
  'disableCheckingVisibility': true,
  'maxEmojis': 12
};
;
// CONCATENATED MODULE: ./js/chat/ui/typingArea.jsx
var _dec, _class, _class2, _temp;

function typingArea_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { typingArea_typeof = function _typeof(obj) { return typeof obj; }; } else { typingArea_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return typingArea_typeof(obj); }

function typingArea_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function typingArea_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function typingArea_createClass(Constructor, protoProps, staticProps) { if (protoProps) typingArea_defineProperties(Constructor.prototype, protoProps); if (staticProps) typingArea_defineProperties(Constructor, staticProps); return Constructor; }

function typingArea_possibleConstructorReturn(self, call) { if (call && (typingArea_typeof(call) === "object" || typeof call === "function")) { return call; } return typingArea_assertThisInitialized(self); }

function typingArea_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function typingArea_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { typingArea_get = Reflect.get; } else { typingArea_get = function _get(target, property, receiver) { var base = typingArea_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return typingArea_get(target, property, receiver || target); }

function typingArea_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = typingArea_getPrototypeOf(object); if (object === null) break; } return object; }

function typingArea_getPrototypeOf(o) { typingArea_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return typingArea_getPrototypeOf(o); }

function typingArea_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) typingArea_setPrototypeOf(subClass, superClass); }

function typingArea_setPrototypeOf(o, p) { typingArea_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return typingArea_setPrototypeOf(o, p); }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

// libs
var typingArea_React = __webpack_require__(0);

var typingArea_ReactDOM = __webpack_require__(4);






var typingArea_TypingArea = (_dec = utils["default"].SoonFcWrap(10), (_class = (_temp = _class2 =
/*#__PURE__*/
function (_MegaRenderMixin) {
  typingArea_inherits(TypingArea, _MegaRenderMixin);

  function TypingArea(props) {
    var _this;

    typingArea_classCallCheck(this, TypingArea);

    _this = typingArea_possibleConstructorReturn(this, typingArea_getPrototypeOf(TypingArea).call(this, props));
    var initialText = _this.props.initialText;
    _this.state = {
      emojiSearchQuery: false,
      typedMessage: initialText ? initialText : "",
      textareaHeight: 20
    };
    return _this;
  }

  typingArea_createClass(TypingArea, [{
    key: "onEmojiClicked",
    value: function onEmojiClicked(e, slug, meta) {
      if (this.props.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      var self = this;
      var txt = ":" + slug + ":";

      if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
        txt = slug;
      }

      self.setState({
        typedMessage: self.state.typedMessage + " " + txt + " "
      });
      var $container = $(typingArea_ReactDOM.findDOMNode(this));
      var $textarea = $('.chat-textarea:visible textarea:visible', $container);
      setTimeout(function () {
        $textarea.click();
        moveCursortoToEnd($textarea[0]);
      }, 100);
    }
  }, {
    key: "stoppedTyping",
    value: function stoppedTyping() {
      if (this.props.disabled) {
        return;
      }

      var self = this;
      var room = this.props.chatRoom;
      self.iAmTyping = false;
      delete self.lastTypingStamp;
      room.trigger('stoppedTyping');
    }
  }, {
    key: "typing",
    value: function typing() {
      if (this.props.disabled) {
        return;
      }

      var self = this;
      var room = this.props.chatRoom;

      if (self.stoppedTypingTimeout) {
        clearTimeout(self.stoppedTypingTimeout);
      }

      self.stoppedTypingTimeout = setTimeout(function () {
        if (room && self.iAmTyping) {
          self.stoppedTyping();
        }
      }, 4000);

      if (room && !self.iAmTyping || room && self.iAmTyping && unixtime() - self.lastTypingStamp >= 4) {
        self.iAmTyping = true;
        self.lastTypingStamp = unixtime();
        room.trigger('typing');
      }
    }
  }, {
    key: "triggerOnUpdate",
    value: function triggerOnUpdate(forced) {
      var self = this;

      if (!self.props.onUpdate || !self.isMounted()) {
        return;
      }

      var shouldTriggerUpdate = forced ? forced : false;

      if (!shouldTriggerUpdate && self.state.typedMessage != self.lastTypedMessage) {
        self.lastTypedMessage = self.state.typedMessage;
        shouldTriggerUpdate = true;
      }

      if (!shouldTriggerUpdate) {
        var $container = $(typingArea_ReactDOM.findDOMNode(this));
        var $textarea = $('.chat-textarea:visible textarea:visible', $container);

        if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
          self._lastTextareaHeight = $textarea.height();
          shouldTriggerUpdate = true;

          if (self.props.onResized) {
            self.props.onResized();
          }
        }
      }

      if (shouldTriggerUpdate) {
        if (self.onUpdateThrottling) {
          clearTimeout(self.onUpdateThrottling);
        }

        self.onUpdateThrottling = setTimeout(function () {
          self.props.onUpdate();
        }, 70);
      }
    }
  }, {
    key: "onCancelClicked",
    value: function onCancelClicked(e) {
      var self = this;
      self.setState({
        typedMessage: ""
      });

      if (self.props.chatRoom && self.iAmTyping) {
        self.stoppedTyping();
      }

      self.onConfirmTrigger(false);
      self.triggerOnUpdate();
    }
  }, {
    key: "onSaveClicked",
    value: function onSaveClicked(e) {
      var self = this;

      if (self.props.disabled || !self.isMounted()) {
        return;
      }

      var $container = $(typingArea_ReactDOM.findDOMNode(self));
      var val = $.trim($('.chat-textarea:visible textarea:visible', $container).val());

      if (self.onConfirmTrigger(val) !== true) {
        self.setState({
          typedMessage: ""
        });
      }

      if (self.props.chatRoom && self.iAmTyping) {
        self.stoppedTyping();
      }

      self.triggerOnUpdate();
    }
  }, {
    key: "onConfirmTrigger",
    value: function onConfirmTrigger(val) {
      var result = this.props.onConfirm(val);

      if (val !== false && result !== false) {
        // scroll To 0 after sending a message.
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
    }
  }, {
    key: "onTypeAreaKeyDown",
    value: function onTypeAreaKeyDown(e) {
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
        }

        e.preventDefault();
        e.stopPropagation();

        if (self.props.chatRoom && self.iAmTyping) {
          self.stoppedTyping();
        }

        return;
      }
    }
  }, {
    key: "onTypeAreaKeyUp",
    value: function onTypeAreaKeyUp(e) {
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
        // send already handled in onKeyDown
        e.preventDefault();
        e.stopPropagation();
        return;
      } else if (key === 13) {
        if (self.state.emojiSearchQuery) {
          return;
        } // Alt+Enter


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
        /* arrow up! */


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
        /* ESC */


        if (self.props.showButtons === true) {
          e.preventDefault();
          self.onCancelClicked(e);
          return;
        }
      } else {
        if (self.prefillMode && (key === 8
        /* backspace */
        || key === 32
        /* space */
        || key === 186
        /* : */
        || key === 13
        /* backspace */
        )) {
          // cancel prefill mode.
          self.prefillMode = false;
        }

        var currentContent = element.value;
        var currentCursorPos = self.getCursorPosition(element) - 1;

        if (self.prefillMode && (currentCursorPos > self.state.emojiEndPos || currentCursorPos < self.state.emojiStartPos)) {
          // cancel prefill mode, user typed some character, out of the current emoji position.
          self.prefillMode = false;
          self.setState({
            'emojiSearchQuery': false,
            'emojiStartPos': false,
            'emojiEndPos': false
          });
          return;
        }

        var char = String.fromCharCode(key);

        if (self.prefillMode) {
          return; // halt next checks if its in prefill mode.
        }

        if (key === 16
        /* shift */
        || key === 17
        /* ctrl */
        || key === 18
        /* option */
        || key === 91
        /* cmd*/
        || key === 8
        /* backspace */
        || key === 37
        /* left */
        || key === 39
        /* right */
        || key === 40
        /* down */
        || key === 38
        /* up */
        || key === 9
        /* tab */
        || char.match(self.validEmojiCharacters)) {
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
    }
  }, {
    key: "onTypeAreaBlur",
    value: function onTypeAreaBlur(e) {
      if (this.props.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      var self = this;

      if (self.state.emojiSearchQuery) {
        // delay is required, otherwise the onBlur -> setState may cause halt of child onclick handlers, in case
        // of a onClick in the emoji autocomplete.
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
    }
  }, {
    key: "onTypeAreaChange",
    value: function onTypeAreaChange(e) {
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
      } // persist typed values


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

      self.updateScroll(true); // if (self.props.onUpdate) {
      //     self.props.onUpdate();
      // }
    }
  }, {
    key: "focusTypeArea",
    value: function focusTypeArea() {
      if (this.props.disabled) {
        return;
      }

      var $container = $(typingArea_ReactDOM.findDOMNode(this));

      if ($('.chat-textarea:visible textarea:visible', $container).length > 0) {
        if (!$('.chat-textarea:visible textarea:visible:first', $container).is(":focus")) {
          moveCursortoToEnd($('.chat-textarea:visible:first textarea', $container)[0]);
        }
      }
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      typingArea_get(typingArea_getPrototypeOf(TypingArea.prototype), "componentDidMount", this).call(this);

      var self = this;
      $(window).rebind('resize.typingArea' + self.getUniqueId(), self.handleWindowResize.bind(this));
      var $container = $(typingArea_ReactDOM.findDOMNode(this)); // initTextareaScrolling($('.chat-textarea-scroll textarea', $container), 100, true);

      self._lastTextareaHeight = 20;

      if (self.props.initialText) {
        self.lastTypedMessage = this.props.initialText;
      }

      $('.jScrollPaneContainer', $container).rebind('forceResize.typingArea' + self.getUniqueId(), function () {
        self.updateScroll(false);
      });
      self.triggerOnUpdate(true);

      if ($container.is(":visible")) {
        self.updateScroll(false);
      }
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
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

        $(megaChat.plugins.persistedTypeArea.data).rebind('onChange.typingArea' + self.getUniqueId(), function (e, k, v) {
          if (chatRoom.roomId == k) {
            self.setState({
              'typedMessage': v ? v : ""
            });
            self.triggerOnUpdate(true);
          }
        });
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      typingArea_get(typingArea_getPrototypeOf(TypingArea.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var chatRoom = self.props.chatRoom;
      self.triggerOnUpdate(); // window.removeEventListener('resize', self.handleWindowResize);

      $(window).unbind('resize.typingArea' + self.getUniqueId());
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;
      var room = this.props.chatRoom;

      if (room.isCurrentlyActive && self.isMounted()) {
        if ($(document.querySelector('textarea:focus,select:focus,input:focus')).filter(":visible").length === 0) {
          // no other element is focused...
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
        var $container = $(typingArea_ReactDOM.findDOMNode(this));
        var el = $('.chat-textarea:visible:first textarea:visible', $container)[0];
        el.selectionStart = el.selectionEnd = self.onUpdateCursorPosition;
        self.onUpdateCursorPosition = false;
      }
    }
  }, {
    key: "initScrolling",
    value: function initScrolling() {
      var self = this;
      self.scrollingInitialised = true;
      var $node = $(self.findDOMNode());
      var $textarea = $('textarea:first', $node);
      var $textareaClone = $('message-preview', $node);
      self.textareaLineHeight = parseInt($textarea.css('line-height'));
      var $textareaScrollBlock = $('.textarea-scroll', $node);
      $textareaScrollBlock.jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        animateScroll: false,
        maintainPosition: false
      });
    }
  }, {
    key: "getTextareaMaxHeight",
    value: function getTextareaMaxHeight() {
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
    }
  }, {
    key: "updateScroll",
    value: function updateScroll(keyEvents) {
      var self = this; // DONT update if not visible...

      if (!this.props.chatRoom.isCurrentlyActive) {
        return;
      }

      if (!this.isMounted()) {
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
      var viewLimitTop = 0;
      var scrPos = 0;
      var viewRatio = 0; // try NOT to update the DOM twice if nothing had changed (and this is NOT a resize event).

      if (self.lastContent === textareaContent && self.lastPosition === cursorPosition) {
        return;
      } else {
        self.lastContent = textareaContent;
        self.lastPosition = cursorPosition; // Set textarea height according to  textarea clone height

        textareaContent = '@[!' + textareaContent.substr(0, cursorPosition) + '!]@' + textareaContent.substr(cursorPosition, textareaContent.length); // prevent self-xss

        textareaContent = htmlentities(textareaContent); // convert the cursor position/selection markers to html tags

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

      jsp.reinitialise(); // requery to get the new <textarea/> that JSP had just replaced in the DOM.

      $textarea = $('textarea:first', $node);

      if (textareaWasFocusedBeforeReinit) {
        // restore selection after JSP.reinit!
        $textarea[0].selectionStart = selectionPos[0];
        $textarea[0].selectionEnd = selectionPos[1];
      } // Scrolling according cursor position


      if (textareaCloneHeight > textareaMaxHeight && textareaCloneSpanHeight < textareaMaxHeight) {
        jsp.scrollToY(0);
      } else if (viewRatio > self.textareaLineHeight || viewRatio < viewLimitTop) {
        if (textareaCloneSpanHeight > 0 && jsp && textareaCloneSpanHeight > textareaMaxHeight) {
          jsp.scrollToY(textareaCloneSpanHeight - self.textareaLineHeight);
        } else if (jsp) {
          jsp.scrollToY(0); // because jScrollPane may think that there is no scrollbar, it would NOT scroll back to 0?!

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
    }
  }, {
    key: "getCursorPosition",
    value: function getCursorPosition(el) {
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
    }
  }, {
    key: "onTypeAreaSelect",
    value: function onTypeAreaSelect(e) {
      this.updateScroll(true);
    }
  }, {
    key: "handleWindowResize",
    value: function handleWindowResize(e, scrollToBottom) {
      var self = this;

      if (!self.isMounted()) {
        return;
      }

      if (!self.props.chatRoom.isCurrentlyActive) {
        return;
      }

      if (e) {
        self.updateScroll(false);
      }

      self.triggerOnUpdate();
    }
  }, {
    key: "isActive",
    value: function isActive() {
      return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    }
  }, {
    key: "resetPrefillMode",
    value: function resetPrefillMode() {
      this.prefillMode = false;
    }
  }, {
    key: "onCopyCapture",
    value: function onCopyCapture(e) {
      this.resetPrefillMode();
    }
  }, {
    key: "onCutCapture",
    value: function onCutCapture(e) {
      this.resetPrefillMode();
    }
  }, {
    key: "onPasteCapture",
    value: function onPasteCapture(e) {
      this.resetPrefillMode();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = this.props.chatRoom;
      var messageTextAreaClasses = "messages-textarea";
      var buttons = null;

      if (self.props.showButtons === true) {
        buttons = [typingArea_React.makeElement(ui_buttons["Button"], {
          key: "save",
          className: "default-white-button right",
          icon: "",
          onClick: self.onSaveClicked.bind(self),
          label: __(l[776])
        }), typingArea_React.makeElement(ui_buttons["Button"], {
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
        emojiAutocomplete = typingArea_React.makeElement(EmojiAutocomplete, {
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
              self.prefillMode = true; // console.error("prefilling", [pre, emojiAlias, post], self.state.emojiStartPos,
              // self.state.emojiStartPos + emojiAlias.length, (
              //     post ? (post.substr(0, 1) !== " " ? 1 : 0) : 1
              // ));
              // in case of concat'ed emojis like:
              // :smile::smile:

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
              var post = msg.substr(self.state.emojiEndPos + 1, msg.length); // in case of concat'ed emojis like:
              // :smile::smile:

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
      return typingArea_React.makeElement("div", {
        className: "typingarea-component" + self.props.className + (disabledTextarea ? " disabled" : "")
      }, typingArea_React.makeElement("div", {
        className: "chat-textarea " + self.props.className
      }, emojiAutocomplete, self.props.children, typingArea_React.makeElement(ui_buttons["Button"], {
        className: "popup-button",
        icon: "smiling-face",
        disabled: this.props.disabled
      }, typingArea_React.makeElement(DropdownEmojiSelector, {
        className: "popup emoji",
        vertOffset: 17,
        onClick: self.onEmojiClicked.bind(self)
      })), typingArea_React.makeElement("hr", null), typingArea_React.createElement("div", {
        className: "chat-textarea-scroll textarea-scroll jScrollPaneContainer",
        style: textareaScrollBlockStyles
      }, typingArea_React.makeElement("textarea", {
        className: messageTextAreaClasses,
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
      }), typingArea_React.makeElement("div", {
        className: "message-preview"
      }))), buttons);
    }
  }]);

  return TypingArea;
}(Object(mixins["default"])(typingArea_React.Component)), _class2.validEmojiCharacters = new RegExp("[\w\:\-\_0-9]", "gi"), _class2.defaultProps = {
  'textareaMaxHeight': "40%"
}, _temp), (_applyDecoratedDescriptor(_class.prototype, "updateScroll", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "updateScroll"), _class.prototype)), _class));
;
// CONCATENATED MODULE: ./js/chat/ui/whosTyping.jsx
function whosTyping_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { whosTyping_typeof = function _typeof(obj) { return typeof obj; }; } else { whosTyping_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return whosTyping_typeof(obj); }

function whosTyping_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function whosTyping_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function whosTyping_createClass(Constructor, protoProps, staticProps) { if (protoProps) whosTyping_defineProperties(Constructor.prototype, protoProps); if (staticProps) whosTyping_defineProperties(Constructor, staticProps); return Constructor; }

function whosTyping_possibleConstructorReturn(self, call) { if (call && (whosTyping_typeof(call) === "object" || typeof call === "function")) { return call; } return whosTyping_assertThisInitialized(self); }

function whosTyping_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function whosTyping_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { whosTyping_get = Reflect.get; } else { whosTyping_get = function _get(target, property, receiver) { var base = whosTyping_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return whosTyping_get(target, property, receiver || target); }

function whosTyping_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = whosTyping_getPrototypeOf(object); if (object === null) break; } return object; }

function whosTyping_getPrototypeOf(o) { whosTyping_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return whosTyping_getPrototypeOf(o); }

function whosTyping_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) whosTyping_setPrototypeOf(subClass, superClass); }

function whosTyping_setPrototypeOf(o, p) { whosTyping_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return whosTyping_setPrototypeOf(o, p); }

var whosTyping_React = __webpack_require__(0);

var whosTyping_ReactDOM = __webpack_require__(4);



var RenderDebugger = __webpack_require__(1).RenderDebugger;

var WhosTyping =
/*#__PURE__*/
function (_MegaRenderMixin) {
  whosTyping_inherits(WhosTyping, _MegaRenderMixin);

  function WhosTyping(props) {
    var _this;

    whosTyping_classCallCheck(this, WhosTyping);

    _this = whosTyping_possibleConstructorReturn(this, whosTyping_getPrototypeOf(WhosTyping).call(this, props));
    _this.state = {
      currentlyTyping: {}
    };
    return _this;
  }

  whosTyping_createClass(WhosTyping, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;
      var chatRoom = self.props.chatRoom;
      var megaChat = self.props.chatRoom.megaChat;
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
          // not my jid, but from other device (e.g. same user handle)
          return;
        } else if (!M.u[u_h]) {
          // unknown user handle? no idea what to show in the "typing" are, so skip it.
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
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      whosTyping_get(whosTyping_getPrototypeOf(WhosTyping.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var chatRoom = self.props.chatRoom;
      var megaChat = chatRoom.megaChat;
      chatRoom.off("onParticipantTyping.whosTyping");
    }
  }, {
    key: "stoppedTyping",
    value: function stoppedTyping(u_h) {
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
    }
  }, {
    key: "render",
    value: function render() {
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

        typingElement = whosTyping_React.makeElement("div", {
          className: "typing-block"
        }, whosTyping_React.makeElement("div", {
          className: "typing-text"
        }, msg), whosTyping_React.makeElement("div", {
          className: "typing-bounce"
        }, whosTyping_React.makeElement("div", {
          className: "typing-bounce1"
        }), whosTyping_React.makeElement("div", {
          className: "typing-bounce2"
        }), whosTyping_React.makeElement("div", {
          className: "typing-bounce3"
        })));
      } else {// don't do anything.
      }

      return typingElement;
    }
  }]);

  return WhosTyping;
}(Object(mixins["default"])(whosTyping_React.Component));

;

// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
var perfectScrollbar = __webpack_require__(11);

// CONCATENATED MODULE: ./js/ui/accordion.jsx
function accordion_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { accordion_get = Reflect.get; } else { accordion_get = function _get(target, property, receiver) { var base = accordion_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return accordion_get(target, property, receiver || target); }

function accordion_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = accordion_getPrototypeOf(object); if (object === null) break; } return object; }

function accordion_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { accordion_typeof = function _typeof(obj) { return typeof obj; }; } else { accordion_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return accordion_typeof(obj); }

function accordion_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function accordion_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function accordion_createClass(Constructor, protoProps, staticProps) { if (protoProps) accordion_defineProperties(Constructor.prototype, protoProps); if (staticProps) accordion_defineProperties(Constructor, staticProps); return Constructor; }

function accordion_possibleConstructorReturn(self, call) { if (call && (accordion_typeof(call) === "object" || typeof call === "function")) { return call; } return accordion_assertThisInitialized(self); }

function accordion_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function accordion_getPrototypeOf(o) { accordion_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return accordion_getPrototypeOf(o); }

function accordion_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) accordion_setPrototypeOf(subClass, superClass); }

function accordion_setPrototypeOf(o, p) { accordion_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return accordion_setPrototypeOf(o, p); }

var accordion_React = __webpack_require__(0);

var accordion_ReactDOM = __webpack_require__(4);



var accordion_RenderDebugger = __webpack_require__(1).RenderDebugger;

var AccordionPanel =
/*#__PURE__*/
function (_MegaRenderMixin) {
  accordion_inherits(AccordionPanel, _MegaRenderMixin);

  function AccordionPanel() {
    accordion_classCallCheck(this, AccordionPanel);

    return accordion_possibleConstructorReturn(this, accordion_getPrototypeOf(AccordionPanel).apply(this, arguments));
  }

  accordion_createClass(AccordionPanel, [{
    key: "render",
    value: function render() {
      var self = this;
      var contentClass = self.props.className ? self.props.className : '';
      return accordion_React.makeElement("div", {
        className: "chat-dropdown container"
      }, accordion_React.makeElement("div", {
        className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
        onClick: function onClick(e) {
          self.props.onToggle(e);
        }
      }, accordion_React.makeElement("span", null, this.props.title), accordion_React.createElement("i", {
        className: "tiny-icon right-arrow"
      })), this.props.expanded ? accordion_React.makeElement("div", {
        className: "chat-dropdown content have-animation " + contentClass
      }, this.props.children) : null);
    }
  }]);

  return AccordionPanel;
}(Object(mixins["default"])(accordion_React.Component));

;

var Accordion =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  accordion_inherits(Accordion, _MegaRenderMixin2);

  function Accordion(props) {
    var _this;

    accordion_classCallCheck(this, Accordion);

    _this = accordion_possibleConstructorReturn(this, accordion_getPrototypeOf(Accordion).call(this, props));
    _this.state = {
      'expandedPanel': _this.props.expandedPanel
    };
    return _this;
  }

  accordion_createClass(Accordion, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      accordion_get(accordion_getPrototypeOf(Accordion.prototype), "componentDidMount", this).call(this);

      var self = this;
      $(window).rebind('resize.modalDialog' + self.getUniqueId(), function () {
        self.onResize();
      });
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      accordion_get(accordion_getPrototypeOf(Accordion.prototype), "componentWillUnmount", this).call(this);

      $(window).off('resize.modalDialog' + this.getUniqueId());
    }
  }, {
    key: "onResize",
    value: function onResize() {// if (!this.domNode) {
      //     return;
      // }
      // always center modal dialogs after they are mounted
      // $(this.domNode)
      //     .css({
      //         'margin': 'auto'
      //     })
      //     .position({
      //         of: $(document.body)
      //     });
    }
  }, {
    key: "onToggle",
    value: function onToggle(e, key) {
      var obj = clone(this.state.expandedPanel);

      if (obj[key]) {
        delete obj[key];
      } else {
        obj[key] = true;
      }

      this.setState({
        'expandedPanel': obj
      });
      this.props.onToggle && this.props.onToggle(key);
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var classes = "accordion-panels " + (self.props.className ? self.props.className : '');
      var accordionPanels = [];
      var otherElements = [];
      var x = 0;
      accordion_React.Children.forEach(self.props.children, function (child) {
        if (!child) {
          // skip if undefined
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
      }.bind(this));
      return accordion_React.makeElement("div", {
        className: classes
      }, accordionPanels, otherElements);
    }
  }]);

  return Accordion;
}(Object(mixins["default"])(accordion_React.Component));

;

// CONCATENATED MODULE: ./js/chat/ui/participantsList.jsx
function participantsList_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { participantsList_typeof = function _typeof(obj) { return typeof obj; }; } else { participantsList_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return participantsList_typeof(obj); }

function participantsList_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function participantsList_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function participantsList_createClass(Constructor, protoProps, staticProps) { if (protoProps) participantsList_defineProperties(Constructor.prototype, protoProps); if (staticProps) participantsList_defineProperties(Constructor, staticProps); return Constructor; }

function participantsList_possibleConstructorReturn(self, call) { if (call && (participantsList_typeof(call) === "object" || typeof call === "function")) { return call; } return participantsList_assertThisInitialized(self); }

function participantsList_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function participantsList_getPrototypeOf(o) { participantsList_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return participantsList_getPrototypeOf(o); }

function participantsList_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) participantsList_setPrototypeOf(subClass, superClass); }

function participantsList_setPrototypeOf(o, p) { participantsList_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return participantsList_setPrototypeOf(o, p); }




var participantsList_DropdownsUI = __webpack_require__(5);

var ContactsUI = __webpack_require__(2);

var participantsList_PerfectScrollbar = __webpack_require__(11).PerfectScrollbar;

var participantsList_ParticipantsList =
/*#__PURE__*/
function (_MegaRenderMixin) {
  participantsList_inherits(ParticipantsList, _MegaRenderMixin);

  function ParticipantsList(props) {
    var _this;

    participantsList_classCallCheck(this, ParticipantsList);

    _this = participantsList_possibleConstructorReturn(this, participantsList_getPrototypeOf(ParticipantsList).call(this, props));
    _this.state = {
      'scrollPositionY': 0,
      'scrollHeight': 36 * 4
    };
    return _this;
  }

  participantsList_createClass(ParticipantsList, [{
    key: "onUserScroll",
    value: function onUserScroll() {// var scrollPosY = this.refs.contactsListScroll.getScrollPositionY();
      // if (this.state.scrollPositionY !== scrollPosY) {
      //     this.setState({
      //         'scrollPositionY': scrollPosY
      //     });
      // }
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;

      if (!self.isMounted()) {
        return;
      }

      self.onUserScroll();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = this.props.chatRoom;

      if (!room) {
        // destroyed
        return null;
      }

      var contactHandle;
      var contact;
      var contacts = room.stateIsLeftOrLeaving() ? [] : room.getParticipantsExceptMe();

      if (contacts && contacts.length > 0) {
        contactHandle = contacts[0];
        contact = M.u[contactHandle];
      } else {
        contact = {};
      }

      return external_React_default.a.createElement("div", {
        className: "chat-contacts-list"
      }, external_React_default.a.createElement(ParticipantsListInner, {
        chatRoom: room,
        members: room.members,
        disableCheckingVisibility: true
      }));
    }
  }]);

  return ParticipantsList;
}(Object(mixins["default"])(external_React_default.a.Component));

participantsList_ParticipantsList.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 36
};
;

function ParticipantsListInner(_ref) {
  var _ref$requiresUpdateOn = _ref.requiresUpdateOnResize,
      requiresUpdateOnResize = _ref$requiresUpdateOn === void 0 ? true : _ref$requiresUpdateOn,
      _ref$contactCardHeigh = _ref.contactCardHeight,
      contactCardHeight = _ref$contactCardHeigh === void 0 ? 32 : _ref$contactCardHeigh,
      _ref$scrollPositionY = _ref.scrollPositionY,
      scrollPositionY = _ref$scrollPositionY === void 0 ? 0 : _ref$scrollPositionY,
      _ref$scrollHeight = _ref.scrollHeight,
      scrollHeight = _ref$scrollHeight === void 0 ? 128 : _ref$scrollHeight,
      room = _ref.chatRoom;
  var _ChatRoom$MembersSet$ = ChatRoom.MembersSet.PRIVILEGE_STATE,
      FULL = _ChatRoom$MembersSet$.FULL,
      OPERATOR = _ChatRoom$MembersSet$.OPERATOR,
      READONLY = _ChatRoom$MembersSet$.READONLY;

  if (!room) {
    // destroyed
    return null;
  }

  if (!room.isCurrentlyActive && room._leaving !== true) {
    // save some memory/DOM
    return false;
  }

  var contactHandle;
  var contact;
  var contacts = room.getParticipantsExceptMe();

  if (contacts && contacts.length > 0) {
    contactHandle = contacts[0];
    contact = M.u[contactHandle];
  } else {
    contact = {};
  }

  var myPresence = anonymouschat ? 'offline' : room.megaChat.userPresenceToCssClass(M.u[u_handle].presence);
  var contactsList = []; // const firstVisibleUserNum = Math.floor(scrollPositionY/contactCardHeight);
  // const visibleUsers = Math.ceil(scrollHeight/contactCardHeight);
  // const lastVisibleUserNum = firstVisibleUserNum + visibleUsers;

  var firstVisibleUserNum = 0;
  var lastVisibleUserNum = contacts.length;
  var contactListInnerStyles = {
    'height': contacts.length * contactCardHeight
  }; // slice and only add a specific number of contacts to the list

  if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving() && room.members.hasOwnProperty(u_handle)) {
    contacts.unshift(u_handle);
    contactListInnerStyles.height += contactCardHeight;
  }

  var i = 0;
  contacts.forEach(function (contactHash) {
    var contact = M.u[contactHash];

    if (contact) {
      // TODO: eventually re-implement "show on scroll" and dynamic rendering.
      if (i < firstVisibleUserNum || i > lastVisibleUserNum) {
        i++;
        return;
      }

      var dropdowns = [];
      var privilege = null;
      var dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";

      if (room.type === "public" || room.type === "group" && room.members) {
        var dropdownRemoveButton = [];

        if (room.iAmOperator() && contactHash !== u_handle) {
          dropdownRemoveButton.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            className: "red",
            key: "remove",
            icon: "rounded-stop",
            label: __(l[8867]),
            onClick: function onClick() {
              $(room).trigger('onRemoveUserRequest', [contactHash]);
            }
          }));
        }

        if (room.iAmOperator() || contactHash === u_handle) {
          // operator
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
            onClick: function onClick() {
              if (room.members[contactHash] !== FULL) {
                $(room).trigger('alterUserPrivilege', [contactHash, FULL]);
              }
            }
          }));
          dropdowns.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            key: "privFullAcc",
            icon: "conversation-icon",
            className: "tick-item " + (room.members[contactHash] === OPERATOR ? "active" : ""),
            disabled: contactHash === u_handle,
            label: __(l[8874]),
            onClick: function onClick() {
              if (room.members[contactHash] !== OPERATOR) {
                $(room).trigger('alterUserPrivilege', [contactHash, OPERATOR]);
              }
            }
          }));
          dropdowns.push(external_React_default.a.createElement(participantsList_DropdownsUI.DropdownItem, {
            key: "privReadOnly",
            icon: "eye-icon",
            className: "tick-item " + (room.members[contactHash] === READONLY ? "active" : ""),
            disabled: contactHash === u_handle,
            label: __(l[8873]),
            onClick: function onClick() {
              if (room.members[contactHash] !== READONLY) {
                $(room).trigger('alterUserPrivilege', [contactHash, READONLY]);
              }
            }
          }));
        } else if (room.members[u_handle] === OPERATOR) {// full access
        } else if (room.members[u_handle] === 1) {// read write
          // should not happen.
        } else if (room.isReadOnly()) {// read only
        } else {} // should not happen.
          // other user privilege


        if (room.members[contactHash] === FULL) {
          dropdownIconClasses = "small-icon gentleman";
        } else if (room.members[contactHash] === OPERATOR) {
          dropdownIconClasses = "small-icon conversation-icon";
        } else if (room.members[contactHash] === READONLY) {
          dropdownIconClasses = "small-icon eye-icon";
        } else {// should not happen.
        }
      }

      contactsList.push(external_React_default.a.createElement(ContactsUI.ContactCard, {
        key: contact.u,
        contact: contact,
        className: "right-chat-contact-card",
        dropdownPositionMy: "left top",
        dropdownPositionAt: "left top",
        dropdowns: dropdowns,
        dropdownDisabled: contactHash === u_handle || anonymouschat,
        dropdownButtonClasses: (room.type == "group" || room.type === "public") && myPresence !== 'offline' ? "button icon-dropdown" : "button icon-dropdown",
        dropdownRemoveButton: dropdownRemoveButton,
        dropdownIconClasses: dropdownIconClasses,
        isInCall: room.uniqueCallParts && room.uniqueCallParts[contactHash]
      }));
      i++;
    }
  });
  return external_React_default.a.createElement("div", {
    className: "chat-contacts-list-inner",
    style: contactListInnerStyles
  }, contactsList);
}

;

// EXTERNAL MODULE: ./js/chat/ui/messages/utils.jsx
var messages_utils = __webpack_require__(10);

// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
var mixin = __webpack_require__(8);

// CONCATENATED MODULE: ./js/chat/ui/messages/metaRichpreview.jsx
function metaRichpreview_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { metaRichpreview_typeof = function _typeof(obj) { return typeof obj; }; } else { metaRichpreview_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return metaRichpreview_typeof(obj); }

function metaRichpreview_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function metaRichpreview_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function metaRichpreview_createClass(Constructor, protoProps, staticProps) { if (protoProps) metaRichpreview_defineProperties(Constructor.prototype, protoProps); if (staticProps) metaRichpreview_defineProperties(Constructor, staticProps); return Constructor; }

function metaRichpreview_possibleConstructorReturn(self, call) { if (call && (metaRichpreview_typeof(call) === "object" || typeof call === "function")) { return call; } return metaRichpreview_assertThisInitialized(self); }

function metaRichpreview_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function metaRichpreview_getPrototypeOf(o) { metaRichpreview_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return metaRichpreview_getPrototypeOf(o); }

function metaRichpreview_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) metaRichpreview_setPrototypeOf(subClass, superClass); }

function metaRichpreview_setPrototypeOf(o, p) { metaRichpreview_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return metaRichpreview_setPrototypeOf(o, p); }

var metaRichpreview_React = __webpack_require__(0);

var metaRichpreview_ReactDOM = __webpack_require__(4);

var metaRichpreview_utils = __webpack_require__(3);



var metaRichpreview_ContactsUI = __webpack_require__(2);

var ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var getMessageString = __webpack_require__(10).getMessageString;

var MetaRichPreviewLoading = __webpack_require__(15).MetaRichpreviewLoading;

var MetaRichpreview =
/*#__PURE__*/
function (_ConversationMessageM) {
  metaRichpreview_inherits(MetaRichpreview, _ConversationMessageM);

  function MetaRichpreview() {
    metaRichpreview_classCallCheck(this, MetaRichpreview);

    return metaRichpreview_possibleConstructorReturn(this, metaRichpreview_getPrototypeOf(MetaRichpreview).apply(this, arguments));
  }

  metaRichpreview_createClass(MetaRichpreview, [{
    key: "getBase64Url",
    value: function getBase64Url(b64incoming) {
      if (!b64incoming || !b64incoming.split) {
        return;
      }

      var exti = b64incoming.split(":");
      var b64i = exti[1];
      exti = exti[0];
      return "data:image/" + exti + ";base64," + b64i;
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var output = [];
      var metas = message.meta && message.meta.extra ? message.meta.extra : [];
      var failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 60 * 5;
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

        var previewContainer = undefined;

        if (isLoading) {
          previewContainer = metaRichpreview_React.makeElement(MetaRichPreviewLoading, {
            message: message,
            isLoading: message.meta.isLoading
          });
        } else {
          var domainName = meta.url;
          domainName = domainName.replace("https://", "").replace("http://", "").split("/")[0];
          previewContainer = metaRichpreview_React.makeElement("div", {
            className: "message richpreview body"
          }, meta.i ? metaRichpreview_React.makeElement("div", {
            className: "message richpreview img-wrapper"
          }, metaRichpreview_React.makeElement("div", {
            className: "message richpreview preview",
            style: previewCss
          })) : undefined, metaRichpreview_React.makeElement("div", {
            className: "message richpreview inner-wrapper"
          }, metaRichpreview_React.makeElement("div", {
            className: "message richpreview data-title"
          }, metaRichpreview_React.makeElement("span", {
            className: "message richpreview title"
          }, meta.t)), metaRichpreview_React.makeElement("div", {
            className: "message richpreview desc"
          }, ellipsis(meta.d, 'end', 82)), metaRichpreview_React.makeElement("div", {
            className: "message richpreview url-container"
          }, meta.ic ? metaRichpreview_React.makeElement("span", {
            className: "message richpreview url-favicon"
          }, metaRichpreview_React.makeElement("img", {
            src: self.getBase64Url(meta.ic),
            width: 16,
            height: 16,
            onError: function onError(e) {
              e.target.parentNode.removeChild(e.target);
            },
            alt: ""
          })) : "", metaRichpreview_React.makeElement("span", {
            className: "message richpreview url"
          }, domainName))));
        }

        output.push(metaRichpreview_React.makeElement("div", {
          key: meta.url,
          className: "message richpreview container " + (meta.i ? "have-preview" : "no-preview") + " " + (meta.d ? "have-description" : "no-description") + " " + (isLoading ? "is-loading" : "done-loading"),
          onClick: function (url) {
            if (!message.meta.isLoading) {
              window.open(url, "_blank");
            }
          }.bind(this, meta.url)
        }, previewContainer, metaRichpreview_React.makeElement("div", {
          className: "clear"
        })));
      }

      return metaRichpreview_React.makeElement("div", {
        className: "message richpreview previews-container"
      }, output);
    }
  }]);

  return MetaRichpreview;
}(ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/metaRichpreviewConfirmation.jsx
function metaRichpreviewConfirmation_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { metaRichpreviewConfirmation_typeof = function _typeof(obj) { return typeof obj; }; } else { metaRichpreviewConfirmation_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return metaRichpreviewConfirmation_typeof(obj); }

function metaRichpreviewConfirmation_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function metaRichpreviewConfirmation_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function metaRichpreviewConfirmation_createClass(Constructor, protoProps, staticProps) { if (protoProps) metaRichpreviewConfirmation_defineProperties(Constructor.prototype, protoProps); if (staticProps) metaRichpreviewConfirmation_defineProperties(Constructor, staticProps); return Constructor; }

function metaRichpreviewConfirmation_possibleConstructorReturn(self, call) { if (call && (metaRichpreviewConfirmation_typeof(call) === "object" || typeof call === "function")) { return call; } return metaRichpreviewConfirmation_assertThisInitialized(self); }

function metaRichpreviewConfirmation_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function metaRichpreviewConfirmation_getPrototypeOf(o) { metaRichpreviewConfirmation_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return metaRichpreviewConfirmation_getPrototypeOf(o); }

function metaRichpreviewConfirmation_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) metaRichpreviewConfirmation_setPrototypeOf(subClass, superClass); }

function metaRichpreviewConfirmation_setPrototypeOf(o, p) { metaRichpreviewConfirmation_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return metaRichpreviewConfirmation_setPrototypeOf(o, p); }

var metaRichpreviewConfirmation_React = __webpack_require__(0);

var metaRichpreviewConfirmation_ReactDOM = __webpack_require__(4);

var metaRichpreviewConfirmation_utils = __webpack_require__(3);



var metaRichpreviewConfirmation_ContactsUI = __webpack_require__(2);

var metaRichpreviewConfirmation_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var metaRichpreviewConfirmation_getMessageString = __webpack_require__(10).getMessageString;

var MetaRichpreviewConfirmation =
/*#__PURE__*/
function (_ConversationMessageM) {
  metaRichpreviewConfirmation_inherits(MetaRichpreviewConfirmation, _ConversationMessageM);

  function MetaRichpreviewConfirmation() {
    metaRichpreviewConfirmation_classCallCheck(this, MetaRichpreviewConfirmation);

    return metaRichpreviewConfirmation_possibleConstructorReturn(this, metaRichpreviewConfirmation_getPrototypeOf(MetaRichpreviewConfirmation).apply(this, arguments));
  }

  metaRichpreviewConfirmation_createClass(MetaRichpreviewConfirmation, [{
    key: "doAllow",
    value: function doAllow() {
      var self = this;
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      delete message.meta.requiresConfirmation;
      RichpreviewsFilter.confirmationDoConfirm();
      megaChat.plugins.richpreviewsFilter.processMessage({}, message);
      message.trackDataChange();
    }
  }, {
    key: "doNotNow",
    value: function doNotNow() {
      var self = this;
      var message = this.props.message;
      delete message.meta.requiresConfirmation;
      RichpreviewsFilter.confirmationDoNotNow();
      message.trackDataChange();
    }
  }, {
    key: "doNever",
    value: function doNever() {
      var self = this;
      var message = this.props.message;
      msgDialog('confirmation', l[870], l[18687], '', function (e) {
        if (e) {
          delete message.meta.requiresConfirmation;
          RichpreviewsFilter.confirmationDoNever();
          message.trackDataChange();
        } else {// do nothing.
        }
      });
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var notNowButton = null;
      var neverButton = null;

      if (RichpreviewsFilter.confirmationCount >= 2) {
        neverButton = metaRichpreviewConfirmation_React.makeElement("div", {
          className: "default-white-button small-text small right red",
          onClick: function onClick(e) {
            self.doNever();
          }
        }, metaRichpreviewConfirmation_React.makeElement("span", null, l[1051]));
      }

      notNowButton = metaRichpreviewConfirmation_React.makeElement("div", {
        className: "default-white-button small-text small grey-txt right",
        onClick: function onClick(e) {
          self.doNotNow();
        }
      }, metaRichpreviewConfirmation_React.makeElement("span", null, l[18682]));
      return metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview previews-container"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview container confirmation"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview body"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview img-wrapper"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview preview confirmation-icon"
      })), metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview inner-wrapper"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview data-title"
      }, metaRichpreviewConfirmation_React.makeElement("span", {
        className: "message richpreview title"
      }, l[18679])), metaRichpreviewConfirmation_React.makeElement("div", {
        className: "message richpreview desc"
      }, l[18680]), metaRichpreviewConfirmation_React.makeElement("div", {
        className: "buttons-block"
      }, metaRichpreviewConfirmation_React.makeElement("div", {
        className: "default-grey-button small-text small right",
        onClick: function onClick(e) {
          self.doAllow();
        }
      }, metaRichpreviewConfirmation_React.makeElement("span", null, l[18681])), notNowButton, neverButton))), metaRichpreviewConfirmation_React.createElement("div", {
        className: "clear"
      })));
    }
  }]);

  return MetaRichpreviewConfirmation;
}(metaRichpreviewConfirmation_ConversationMessageMixin);

;

// EXTERNAL MODULE: ./js/chat/ui/messages/metaRichPreviewLoading.jsx
var metaRichPreviewLoading = __webpack_require__(15);

// CONCATENATED MODULE: ./js/chat/ui/messages/metaRichpreviewMegaLinks.jsx
function metaRichpreviewMegaLinks_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { metaRichpreviewMegaLinks_typeof = function _typeof(obj) { return typeof obj; }; } else { metaRichpreviewMegaLinks_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return metaRichpreviewMegaLinks_typeof(obj); }

function metaRichpreviewMegaLinks_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function metaRichpreviewMegaLinks_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function metaRichpreviewMegaLinks_createClass(Constructor, protoProps, staticProps) { if (protoProps) metaRichpreviewMegaLinks_defineProperties(Constructor.prototype, protoProps); if (staticProps) metaRichpreviewMegaLinks_defineProperties(Constructor, staticProps); return Constructor; }

function metaRichpreviewMegaLinks_possibleConstructorReturn(self, call) { if (call && (metaRichpreviewMegaLinks_typeof(call) === "object" || typeof call === "function")) { return call; } return metaRichpreviewMegaLinks_assertThisInitialized(self); }

function metaRichpreviewMegaLinks_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function metaRichpreviewMegaLinks_getPrototypeOf(o) { metaRichpreviewMegaLinks_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return metaRichpreviewMegaLinks_getPrototypeOf(o); }

function metaRichpreviewMegaLinks_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) metaRichpreviewMegaLinks_setPrototypeOf(subClass, superClass); }

function metaRichpreviewMegaLinks_setPrototypeOf(o, p) { metaRichpreviewMegaLinks_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return metaRichpreviewMegaLinks_setPrototypeOf(o, p); }







var metaRichpreviewMegaLinks_MetaRichpreviewMegaLinks =
/*#__PURE__*/
function (_ConversationMessageM) {
  metaRichpreviewMegaLinks_inherits(MetaRichpreviewMegaLinks, _ConversationMessageM);

  function MetaRichpreviewMegaLinks() {
    metaRichpreviewMegaLinks_classCallCheck(this, MetaRichpreviewMegaLinks);

    return metaRichpreviewMegaLinks_possibleConstructorReturn(this, metaRichpreviewMegaLinks_getPrototypeOf(MetaRichpreviewMegaLinks).apply(this, arguments));
  }

  metaRichpreviewMegaLinks_createClass(MetaRichpreviewMegaLinks, [{
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var previewContainer;
      var output = [];
      var megaLinks = message.megaLinks && message.megaLinks ? message.megaLinks : [];

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
          var fakeContact = M.u[megaLinkInfo.info['h']] ? M.u[megaLinkInfo.info['h']] : {
            'u': megaLinkInfo.info['h'],
            'm': megaLinkInfo.info['e'],
            'firstName': megaLinkInfo.info['fn'],
            'lastName': megaLinkInfo.info['ln'],
            'name': megaLinkInfo.info['fn'] + " " + megaLinkInfo.info['ln']
          };

          if (!M.u[fakeContact.u]) {
            M.u.set(fakeContact.u, new MegaDataObject(MEGA_USER_STRUCT, true, {
              'u': fakeContact.u,
              'name': fakeContact.firstName + " " + fakeContact.lastName,
              'm': fakeContact.m ? fakeContact.m : "",
              'c': undefined
            }));
          }

          var contact = M.u[megaLinkInfo.info['h']];
          previewContainer = external_React_default.a.createElement("div", {
            key: megaLinkInfo.info['h'],
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
            contact: contact
          })), external_React_default.a.createElement("div", {
            className: "clear"
          })));
        } else {
          var desc;
          var is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

          if (megaLinkInfo.is_chatlink) {
            desc = l[8876] + ": " + megaLinkInfo.info['ncm'];
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
          onClick: function (url) {
            if (megaLinkInfo.hadLoaded()) {
              window.open(url, '_blank', 'noopener');
            }
          }.bind(this, megaLinkInfo.getLink())
        }, previewContainer, external_React_default.a.createElement("div", {
          className: "clear"
        })));
      }

      return external_React_default.a.createElement("div", {
        className: "message richpreview previews-container"
      }, output);
    }
  }]);

  return MetaRichpreviewMegaLinks;
}(mixin["ConversationMessageMixin"]);

;

// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(9);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);

// CONCATENATED MODULE: ./js/chat/ui/messages/AudioPlayer.jsx
function AudioPlayer_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { AudioPlayer_typeof = function _typeof(obj) { return typeof obj; }; } else { AudioPlayer_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return AudioPlayer_typeof(obj); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function AudioPlayer_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function AudioPlayer_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function AudioPlayer_createClass(Constructor, protoProps, staticProps) { if (protoProps) AudioPlayer_defineProperties(Constructor.prototype, protoProps); if (staticProps) AudioPlayer_defineProperties(Constructor, staticProps); return Constructor; }

function AudioPlayer_possibleConstructorReturn(self, call) { if (call && (AudioPlayer_typeof(call) === "object" || typeof call === "function")) { return call; } return AudioPlayer_assertThisInitialized(self); }

function AudioPlayer_getPrototypeOf(o) { AudioPlayer_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return AudioPlayer_getPrototypeOf(o); }

function AudioPlayer_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function AudioPlayer_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) AudioPlayer_setPrototypeOf(subClass, superClass); }

function AudioPlayer_setPrototypeOf(o, p) { AudioPlayer_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return AudioPlayer_setPrototypeOf(o, p); }




var AudioPlayer_AudioPlayer =
/*#__PURE__*/
function (_React$Component) {
  AudioPlayer_inherits(AudioPlayer, _React$Component);

  function AudioPlayer(props) {
    var _this;

    AudioPlayer_classCallCheck(this, AudioPlayer);

    _this = AudioPlayer_possibleConstructorReturn(this, AudioPlayer_getPrototypeOf(AudioPlayer).call(this, props));
    _this.state = {
      currentTime: null,
      progressWidth: 0,
      isBeingPlayed: false,
      isPaused: false
    };
    _this.handleOnPlaying = _this.handleOnPlaying.bind(AudioPlayer_assertThisInitialized(_this));
    _this.handleOnTimeUpdate = _this.handleOnTimeUpdate.bind(AudioPlayer_assertThisInitialized(_this));
    _this.handleOnEnded = _this.handleOnEnded.bind(AudioPlayer_assertThisInitialized(_this));
    _this.handleOnPause = _this.handleOnPause.bind(AudioPlayer_assertThisInitialized(_this));
    _this.handleOnMouseDown = _this.handleOnMouseDown.bind(AudioPlayer_assertThisInitialized(_this));
    return _this;
  }

  AudioPlayer_createClass(AudioPlayer, [{
    key: "play",
    value: function play(e) {
      var self = this;
      var audio = self.audioEl;

      if (audio.paused) {
        var result = audio.play();

        if (result instanceof Promise) {
          result.catch(function (e) {
            console.error(e);
          });
        }

        var audios = document.getElementsByClassName('audio-player__player'); // Pause all others audio elements

        Array.prototype.filter.call(audios, function (audioElement) {
          return audioElement.id !== self.props.audioId;
        }).forEach(function (audioElement) {
          if (!audioElement.paused) {
            audioElement.pause();
          }
        });
        self.setState({
          isPaused: false
        });
      } else {
        audio.pause();
        self.setState({
          isPaused: true
        });
      }
    }
  }, {
    key: "handleOnPause",
    value: function handleOnPause(e) {
      this.setState({
        isPaused: true
      });
    }
  }, {
    key: "handleOnPlaying",
    value: function handleOnPlaying(e) {
      this.setState(function (prevState) {
        return {
          isBeingPlayed: true
        };
      });
    }
  }, {
    key: "handleOnTimeUpdate",
    value: function handleOnTimeUpdate(e) {
      var _this$audioEl = this.audioEl,
          currentTime = _this$audioEl.currentTime,
          duration = _this$audioEl.duration;
      var percent = currentTime / duration * 100;
      this.setState(function (prevState) {
        return {
          currentTime: secondsToTimeShort(currentTime),
          progressWidth: percent
        };
      });
    }
  }, {
    key: "handleOnEnded",
    value: function handleOnEnded(e) {
      this.setState(function (prevState) {
        return {
          progressWidth: 0,
          isBeingPlayed: false,
          currentTime: 0
        };
      });
    }
  }, {
    key: "handleOnMouseDown",
    value: function handleOnMouseDown(event) {
      event.preventDefault();
      var self = this;
      var sliderPin = self.sliderPin;
      var slider = self.slider;
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

        sliderPin.style.left = "".concat(newLeft, "px");
        var pinPosition = newLeft / slider.getBoundingClientRect().width;
        var newTime = Math.ceil(self.props.playtime * pinPosition);
        var newCurrentTime = secondsToTimeShort(newTime);
        self.audioEl.currentTime = newTime;
        self.setState(function (prevState) {
          return {
            currentTime: newCurrentTime,
            progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
          };
        });
      }

      function onMouseUp() {
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
      }

      sliderPin.ondragstart = function () {
        return false;
      };
    }
  }, {
    key: "render",
    value: function render() {
      var _this2 = this,
          _React$createElement;

      var self = this;
      var _self$props = self.props,
          source = _self$props.source,
          audioId = _self$props.audioId,
          loading = _self$props.loading,
          playtime = _self$props.playtime;
      var _self$state = self.state,
          progressWidth = _self$state.progressWidth,
          isBeingPlayed = _self$state.isBeingPlayed,
          isPaused = _self$state.isPaused,
          currentTime = _self$state.currentTime;
      var progressStyles = {
        width: "".concat(progressWidth, "%")
      };
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
          if (self.props.source === null) {
            self.props.getAudioFile().then(function () {
              self.play();
            });
          } else {
            self.play();
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
        style: progressStyles
      }), external_React_default.a.createElement("div", {
        className: "slider__progress__pin",
        style: {
          left: "".concat(progressWidth, "%")
        },
        ref: function ref(sliderPin) {
          _this2.sliderPin = sliderPin;
        },
        onMouseDown: this.handleOnMouseDown
      })), external_React_default.a.createElement("span", {
        className: "audio-player__time",
        style: playtimeStyles
      }, currentTime ? currentTime : secondsToTimeShort(playtime)), external_React_default.a.createElement("audio", (_React$createElement = {
        src: source,
        className: "audio-player__player",
        onPause: self.handleOnPause,
        id: audioId,
        ref: function ref(audio) {
          _this2.audioEl = audio;
        },
        onPlaying: self.handleOnPlaying
      }, _defineProperty(_React$createElement, "onPause", self.handleOnPause), _defineProperty(_React$createElement, "onEnded", self.handleOnEnded), _defineProperty(_React$createElement, "onTimeUpdate", self.handleOnTimeUpdate), _React$createElement)));
    }
  }]);

  return AudioPlayer;
}(external_React_default.a.Component);

AudioPlayer_AudioPlayer.propTypes = {
  source: prop_types_default.a.string,
  audioId: prop_types_default.a.string.isRequired,
  loading: prop_types_default.a.bool.isRequired,
  getAudioFile: prop_types_default.a.func.isRequired,
  playtime: prop_types_default.a.number.isRequired
};
/* harmony default export */ var messages_AudioPlayer = (AudioPlayer_AudioPlayer);
// CONCATENATED MODULE: ./js/chat/ui/messages/AudioContainer.jsx
function AudioContainer_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { AudioContainer_typeof = function _typeof(obj) { return typeof obj; }; } else { AudioContainer_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return AudioContainer_typeof(obj); }

function AudioContainer_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function AudioContainer_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function AudioContainer_createClass(Constructor, protoProps, staticProps) { if (protoProps) AudioContainer_defineProperties(Constructor.prototype, protoProps); if (staticProps) AudioContainer_defineProperties(Constructor, staticProps); return Constructor; }

function AudioContainer_possibleConstructorReturn(self, call) { if (call && (AudioContainer_typeof(call) === "object" || typeof call === "function")) { return call; } return AudioContainer_assertThisInitialized(self); }

function AudioContainer_getPrototypeOf(o) { AudioContainer_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return AudioContainer_getPrototypeOf(o); }

function AudioContainer_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function AudioContainer_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) AudioContainer_setPrototypeOf(subClass, superClass); }

function AudioContainer_setPrototypeOf(o, p) { AudioContainer_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return AudioContainer_setPrototypeOf(o, p); }





var AudioContainer_AudioContainer =
/*#__PURE__*/
function (_React$Component) {
  AudioContainer_inherits(AudioContainer, _React$Component);

  function AudioContainer(props) {
    var _this;

    AudioContainer_classCallCheck(this, AudioContainer);

    _this = AudioContainer_possibleConstructorReturn(this, AudioContainer_getPrototypeOf(AudioContainer).call(this, props));
    _this.state = {
      audioBlobUrl: null,
      loading: false
    };
    _this.getAudioFile = _this.getAudioFile.bind(AudioContainer_assertThisInitialized(_this));
    return _this;
  }

  AudioContainer_createClass(AudioContainer, [{
    key: "getAudioFile",
    value: function getAudioFile() {
      var self = this;
      var _this$props = this.props,
          mime = _this$props.mime,
          h = _this$props.h;
      var blobUrl = null;
      self.setState({
        loading: true
      });

      if (mime === 'audio/mp4') {
        blobUrl = new Promise(function (resolve, reject) {
          M.gfsfetch(h, 0, -1, null).done(function (data) {
            resolve({
              buffer: data.buffer
            });
          }).fail(function (e) {
            reject(e);
          });
        }).then(function (_ref) {
          var buffer = _ref.buffer;
          var uint8Array = new Uint8Array(buffer);
          var arrayBuffer = uint8Array.buffer;
          self.setState(function (prevState) {
            return {
              audioBlobUrl: mObjectURL([arrayBuffer], 'audio/mp4'),
              loading: false
            };
          });
        }).catch(function (e) {
          console.error(e);
        });
      }

      return blobUrl;
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var _self$state = self.state,
          audioBlobUrl = _self$state.audioBlobUrl,
          loading = _self$state.loading;
      var _self$props = self.props,
          playtime = _self$props.playtime,
          mime = _self$props.mime;
      return external_React_default.a.createElement("div", {
        className: "audio-container"
      }, external_React_default.a.createElement(messages_AudioPlayer, {
        source: audioBlobUrl ? audioBlobUrl : null,
        audioId: self.props.audioId,
        loading: loading,
        mime: mime,
        getAudioFile: self.getAudioFile,
        playtime: playtime
      }));
    }
  }]);

  return AudioContainer;
}(external_React_default.a.Component);

AudioContainer_AudioContainer.propTypes = {
  h: prop_types_default.a.string.isRequired,
  mime: prop_types_default.a.string.isRequired
};
AudioContainer_AudioContainer.defaultProps = {
  h: null,
  mime: null
};
/* harmony default export */ var messages_AudioContainer = (AudioContainer_AudioContainer);
// CONCATENATED MODULE: ./js/chat/ui/messages/geoLocation.jsx



function GeoLocation(props) {
  var latitude = props.latitude,
      lng = props.lng;

  var handleOnclick = function handleOnclick(lat, lng) {
    var openGmaps = function openGmaps() {
      var gmapsUrl = "https://www.google.com/maps/search/?api=1&query=".concat(lat, ",").concat(lng);
      window.open(gmapsUrl, '_blank', 'noopener');
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

GeoLocation.propTypes = {
  latitude: prop_types_default.a.string.isRequired,
  lng: prop_types_default.a.string.isRequired
};
/* harmony default export */ var messages_geoLocation = (GeoLocation);
// CONCATENATED MODULE: ./js/chat/ui/messages/generic.jsx
function generic_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { generic_typeof = function _typeof(obj) { return typeof obj; }; } else { generic_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return generic_typeof(obj); }

function generic_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function generic_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function generic_createClass(Constructor, protoProps, staticProps) { if (protoProps) generic_defineProperties(Constructor.prototype, protoProps); if (staticProps) generic_defineProperties(Constructor, staticProps); return Constructor; }

function generic_possibleConstructorReturn(self, call) { if (call && (generic_typeof(call) === "object" || typeof call === "function")) { return call; } return generic_assertThisInitialized(self); }

function generic_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function generic_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { generic_get = Reflect.get; } else { generic_get = function _get(target, property, receiver) { var base = generic_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return generic_get(target, property, receiver || target); }

function generic_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = generic_getPrototypeOf(object); if (object === null) break; } return object; }

function generic_getPrototypeOf(o) { generic_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return generic_getPrototypeOf(o); }

function generic_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) generic_setPrototypeOf(subClass, superClass); }

function generic_setPrototypeOf(o, p) { generic_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return generic_setPrototypeOf(o, p); }













var generic_DropdownsUI = __webpack_require__(5);

var generic_ButtonsUI = __webpack_require__(7);
/* 1h as confirmed by Mathias */


var generic_MESSAGE_NOT_EDITABLE_TIMEOUT = window.MESSAGE_NOT_EDITABLE_TIMEOUT = 60 * 60;
var CLICKABLE_ATTACHMENT_CLASSES = '.message.data-title, .message.file-size, .data-block-view.semi-big, .data-block-view.medium';
var NODE_DOESNT_EXISTS_ANYMORE = {};

var generic_GenericConversationMessage =
/*#__PURE__*/
function (_ConversationMessageM) {
  generic_inherits(GenericConversationMessage, _ConversationMessageM);

  function GenericConversationMessage(props) {
    var _this;

    generic_classCallCheck(this, GenericConversationMessage);

    _this = generic_possibleConstructorReturn(this, generic_getPrototypeOf(GenericConversationMessage).call(this, props));
    _this.state = {
      'editing': _this.props.editing
    };
    return _this;
  }

  generic_createClass(GenericConversationMessage, [{
    key: "isBeingEdited",
    value: function isBeingEdited() {
      return this.state.editing === true || this.props.editing === true;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate(oldProps, oldState) {
      var self = this;
      var isBeingEdited = self.isBeingEdited();
      var isMounted = self.isMounted();

      if (isBeingEdited && isMounted) {
        var $generic = $(self.findDOMNode());
        var $textarea = $('textarea', $generic);

        if ($textarea.length > 0 && !$textarea.is(":focus")) {
          $textarea.trigger("focus");
          moveCursortoToEnd($textarea[0]);
        }

        if (!oldState.editing) {
          if (self.props.onEditStarted) {
            self.props.onEditStarted($generic);
            moveCursortoToEnd($textarea);
          }
        }
      } else if (isMounted && !isBeingEdited && oldState.editing === true) {
        if (self.props.onUpdate) {
          self.props.onUpdate();
        }
      }

      $(self.props.message).rebind('onChange.GenericConversationMessage' + self.getUniqueId(), function () {
        Soon(function () {
          if (self.isMounted()) {
            self.eventuallyUpdate();
          }
        });
      });
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      generic_get(generic_getPrototypeOf(GenericConversationMessage.prototype), "componentDidMount", this).call(this);

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
          // prevent recursion
          return;
        }

        if (e.target.classList.contains('no-thumb-prev')) {
          // do now show the dropdown clicking a previeable item without thumbnail
          return;
        }

        var $block;

        if ($(e.target).is('.shared-data')) {
          $block = $(e.target);
        } else if ($(e.target).is('.shared-info') || $(e.target).parents('.shared-info').length > 0) {
          $block = $(e.target).is('.shared-info') ? $(e.target).next() : $(e.target).parents('.shared-info').next();
        } else {
          $block = $(e.target).parents('.message.shared-data');
        }

        Soon(function () {
          // a delay is needed, otherwise React would receive the same click event and close the dropdown
          // even before displaying it in the UI.
          $('.button.default-white-button.tiny-button', $block).trigger('click');
        });
      });
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      generic_get(generic_getPrototypeOf(GenericConversationMessage.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var $node = $(self.findDOMNode());
      $(self.props.message).off('onChange.GenericConversationMessage' + self.getUniqueId());
      $node.off('click.dropdownShortcut', CLICKABLE_ATTACHMENT_CLASSES);
    }
  }, {
    key: "haveMoreContactListeners",
    value: function haveMoreContactListeners() {
      if (!this.props.message || !this.props.message.meta) {
        return false;
      }

      if (this.props.message.meta) {
        if (this.props.message.meta.participants) {
          // call ended type of message
          return this.props.message.meta.participants;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }, {
    key: "_nodeUpdated",
    value: function _nodeUpdated(h) {
      var self = this; // because it seems the webclient can trigger stuff before the actual
      // change is done on the node, this function would need to be queued
      // using Soon, so that its executed after the node modify code

      Soon(function () {
        if (self.isMounted() && self.isComponentVisible()) {
          self.forceUpdate();

          if (self.dropdown) {
            self.dropdown.forceUpdate();
          }
        }
      });
    }
  }, {
    key: "doDelete",
    value: function doDelete(e, msg) {
      e.preventDefault(e);
      e.stopPropagation(e);

      if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
        this.doCancelRetry(e, msg);
      } else {
        this.props.onDeleteClicked(e, this.props.message);
      }
    }
  }, {
    key: "doCancelRetry",
    value: function doCancelRetry(e, msg) {
      e.preventDefault(e);
      e.stopPropagation(e);
      var chatRoom = this.props.message.chatRoom;
      chatRoom.messagesBuff.messages.removeByKey(msg.messageId);
      chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, msg.messageId);
    }
  }, {
    key: "doRetry",
    value: function doRetry(e, msg) {
      var self = this;
      e.preventDefault(e);
      e.stopPropagation(e);
      var chatRoom = this.props.message.chatRoom;
      this.doCancelRetry(e, msg);

      chatRoom._sendMessageToTransport(msg).done(function (internalId) {
        msg.internalId = internalId;
        self.safeForceUpdate();
      });
    }
  }, {
    key: "_favourite",
    value: function _favourite(h) {
      var newFavState = Number(!M.isFavourite(h));
      M.favourite([h], newFavState);
    }
  }, {
    key: "_addFavouriteButtons",
    value: function _addFavouriteButtons(h, arr) {
      var self = this;

      if (M.getNodeRights(h) > 1) {
        var isFav = M.isFavourite(h);
        arr.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
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
      } else {
        return false;
      }
    }
  }, {
    key: "_isNodeHavingALink",
    value: function _isNodeHavingALink(h) {
      return M.getNodeShare(h) !== false;
    }
  }, {
    key: "_addLinkButtons",
    value: function _addLinkButtons(h, arr) {
      var self = this;
      var haveLink = self._isNodeHavingALink(h) === true;
      var getManageLinkText = haveLink ? l[6909] : l[59];
      arr.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
        icon: "icons-sprite chain",
        key: "getLinkButton",
        label: getManageLinkText,
        onClick: self._getLink.bind(self, h)
      }));

      if (haveLink) {
        arr.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
          icon: "context remove-link",
          key: "removeLinkButton",
          label: __(l[6821]),
          onClick: self._removeLink.bind(self, h)
        }));
        return true;
      } else {
        return false;
      }
    }
  }, {
    key: "_startDownload",
    value: function _startDownload(v) {
      M.addDownload([v]);
    }
  }, {
    key: "_addToCloudDrive",
    value: function _addToCloudDrive(v, openSendToChat) {
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
          // is a save/copy to
          target = target || M.RootID;
          M.injectNodes(node, target, function (res) {
            if (!Array.isArray(res) || !res.length) {
              if (d) {
                console.warn('Unable to inject nodes... no longer existing?', res);
              }
            } else {
              msgDialog('info', l[8005], l[8006]);
            }
          });
        }
      }, openSendToChat ? "conversations" : false);
    }
  }, {
    key: "_getLink",
    value: function _getLink(h, e) {
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
    }
  }, {
    key: "_removeLink",
    value: function _removeLink(h, e) {
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
    }
  }, {
    key: "_startPreview",
    value: function _startPreview(v, e) {
      if ($(e && e.target).is('.tiny-button')) {
        // prevent launching the previewer clicking the dropdown on an previewable item without thumbnail
        return;
      }

      assert(M.chat, 'Not in chat.');

      if (is_video(v)) {
        $.autoplay = v.h;
      }

      slideshow(v.ch, undefined, true);

      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var additionalClasses = "";
      var buttonsBlock = null;
      var spinnerElement = null;
      var messageNotSendIndicator = null;
      var messageIsNowBeingSent = false;
      var subMessageComponent = [];
      var attachmentMeta = false;
      var extraPreButtons = [];

      if (this.props.className) {
        additionalClasses += this.props.className;
      }

      if (message.revoked) {
        // skip doing tons of stuff and just return null, in case this message was marked as revoked.
        return null;
      } // if this is a text msg.


      if (message instanceof Message) {
        if (!message.wasRendered || !message.messageHtml) {
          // Convert ot HTML and pass it to plugins to do their magic on styling the message if needed.
          message.messageHtml = htmlentities(message.textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');
          message.processedBy = {};
          var evtObj = {
            message: message,
            room: chatRoom
          };
          megaChat.trigger('onPreBeforeRenderMessage', evtObj);
          var event = new $.Event("onBeforeRenderMessage");
          megaChat.trigger(event, evtObj);
          megaChat.trigger('onPostBeforeRenderMessage', evtObj);

          if (event.isPropagationStopped()) {
            self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
            return false;
          }

          message.wasRendered = 1;
        }

        var textMessage = message.messageHtml;
        var state = message.getState();
        var stateText = message.getStateText(state);
        var textContents = message.textContents || false;
        var displayName = contact && generateAvatarMeta(contact.u).fullName || '';

        if (state === Message.STATE.NOT_SENT) {
          messageIsNowBeingSent = unixtime() - message.delay < 5;

          if (!messageIsNowBeingSent) {
            additionalClasses += " not-sent";

            if (message.sending === true) {
              message.sending = false;
              $(message).trigger('onChange', [message, "sending", true, false]);
            }

            if (!message.requiresManualRetry) {
              additionalClasses += " retrying";
            } else {
              additionalClasses += " retrying requires-manual-retry";
            }

            buttonsBlock = null;
          } else {
            additionalClasses += " sending";
            spinnerElement = external_React_default.a.createElement("div", {
              className: "small-blue-spinner"
            });

            if (!message.sending) {
              message.sending = true;

              if (self._rerenderTimer) {
                clearTimeout(self._rerenderTimer);
              }

              self._rerenderTimer = setTimeout(function () {
                if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                  chatRoom.messagesBuff.trackDataChange();

                  if (self.isMounted()) {
                    self.forceUpdate();
                  }
                }
              }, (5 - (unixtime() - message.delay)) * 1000);
            }
          }
        } else {
          additionalClasses += ' ' + stateText;
        }

        if (textContents[0] === Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT) {
          if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT) {
            attachmentMeta = message.getAttachmentMeta() || [];
            var files = [];
            attachmentMeta.forEach(function (v, attachmentKey) {
              if (!M.chd[v.ch] || v.revoked) {
                // don't show revoked files
                return;
              } // generate preview/icon


              var icon = fileIcon(v);
              var mediaType = is_video(v);
              var isImage = is_image2(v);
              var isVideo = mediaType > 0;
              var isAudio = mediaType > 1;
              var showThumbnail = String(v.fa).indexOf(':1*') > 0;
              var isPreviewable = isImage || isVideo;
              var dropdown = null;
              var noThumbPrev = '';
              var previewButton = null;

              if (isPreviewable) {
                if (!showThumbnail) {
                  noThumbPrev = 'no-thumb-prev';
                }

                var previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
                previewButton = external_React_default.a.createElement("span", {
                  key: "previewButton"
                }, external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "search-icon",
                  label: previewLabel,
                  onClick: self._startPreview.bind(self, v)
                }));
              }

              if (contact.u === u_handle) {
                dropdown = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                  className: "default-white-button tiny-button",
                  icon: "tiny-icon icons-sprite grey-dots"
                }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                  ref: function ref(refObj) {
                    self.dropdown = refObj;
                  },
                  className: "white-context-menu attachments-dropdown",
                  noArrow: true,
                  positionMy: "left top",
                  positionAt: "left bottom",
                  horizOffset: -4,
                  vertOffset: 3,
                  onBeforeActiveChange: function onBeforeActiveChange(newState) {
                    if (newState === true) {
                      self.forceUpdate();
                    }
                  },
                  dropdownItemGenerator: function dropdownItemGenerator(dd) {
                    var linkButtons = [];
                    var firstGroupOfButtons = [];
                    var revokeButton = null;
                    var downloadButton = null;

                    if (message.isEditable && message.isEditable()) {
                      revokeButton = external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
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
                      downloadButton = external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                        icon: "rounded-grey-down-arrow",
                        label: __(l[1187]),
                        onClick: self._startDownload.bind(self, v)
                      });

                      if (M.getNodeRoot(v.h) !== M.RubbishID) {
                        self._addLinkButtons(v.h, linkButtons);
                      }

                      firstGroupOfButtons.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                        icon: "context info",
                        label: __(l[6859]),
                        key: "infoDialog",
                        onClick: function onClick() {
                          $.selected = [v.h];
                          propertiesDialog();
                        }
                      }));

                      self._addFavouriteButtons(v.h, firstGroupOfButtons);

                      linkButtons.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
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

                    return external_React_default.a.createElement("div", null, previewButton, firstGroupOfButtons, firstGroupOfButtons && firstGroupOfButtons.length > 0 ? external_React_default.a.createElement("hr", null) : "", downloadButton, linkButtons, revokeButton && downloadButton ? external_React_default.a.createElement("hr", null) : "", revokeButton);
                  }
                }));
              } else {
                dropdown = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                  className: "default-white-button tiny-button",
                  icon: "tiny-icon icons-sprite grey-dots"
                }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                  className: "white-context-menu attachments-dropdown",
                  noArrow: true,
                  positionMy: "left top",
                  positionAt: "left bottom",
                  horizOffset: -4,
                  vertOffset: 3
                }, previewButton, external_React_default.a.createElement("hr", null), external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "rounded-grey-down-arrow",
                  label: __(l[1187]),
                  onClick: self._startDownload.bind(self, v)
                }), external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "grey-cloud",
                  label: __(l[1988]),
                  onClick: self._addToCloudDrive.bind(self, v, false)
                }), external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "conversations",
                  label: __(l[17764]),
                  onClick: self._addToCloudDrive.bind(self, v, true)
                })));
              }

              var attachmentClasses = "message shared-data";
              var preview = external_React_default.a.createElement("div", {
                className: "data-block-view medium " + noThumbPrev,
                onClick: isPreviewable ? self._startPreview.bind(self, v) : undefined
              }, dropdown, external_React_default.a.createElement("div", {
                className: "data-block-bg"
              }, external_React_default.a.createElement("div", {
                className: "block-view-file-type " + icon
              })));

              if (showThumbnail) {
                var src = v.src || window.noThumbURI || '';
                var thumbClass = v.src ? '' : " no-thumb";
                var thumbOverlay = null;

                if (isImage) {
                  thumbClass = thumbClass + " image";
                  thumbOverlay = external_React_default.a.createElement("div", {
                    className: "thumb-overlay",
                    onClick: self._startPreview.bind(self, v)
                  });
                } else {
                  thumbClass = thumbClass + " video " + (isPreviewable ? " previewable" : "non-previewable");
                  thumbOverlay = external_React_default.a.createElement("div", {
                    className: "thumb-overlay",
                    onClick: isPreviewable ? self._startPreview.bind(self, v) : undefined
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
                  onClick: isPreviewable ? self._startPreview.bind(self, v) : undefined
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
            });
            var avatar = null;
            var datetime = null;
            var name = null;

            if (this.props.grouped) {
              additionalClasses += " grouped";
            } else {
              avatar = external_React_default.a.createElement(ui_contacts["Avatar"], {
                contact: contact,
                className: "message avatar-wrapper small-rounded-avatar"
              });
              datetime = external_React_default.a.createElement("div", {
                className: "message date-time simpletip",
                "data-simpletip": time2date(timestampInt)
              }, timestamp);
              name = external_React_default.a.createElement(ui_contacts["ContactButton"], {
                contact: contact,
                className: "message",
                label: displayName
              });
            }

            return external_React_default.a.createElement("div", {
              className: message.messageId + " message body" + additionalClasses
            }, avatar, external_React_default.a.createElement("div", {
              className: "message content-area"
            }, name, datetime, external_React_default.a.createElement("div", {
              className: "message shared-block"
            }, files), buttonsBlock, spinnerElement));
          } else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT) {
            textContents = textContents.substr(2, textContents.length);

            try {
              var attachmentMeta = JSON.parse(textContents);
            } catch (e) {
              return null;
            }

            var contacts = [];
            attachmentMeta.forEach(function (v) {
              var contact = M.u && M.u[v.u] ? M.u[v.u] : v;
              var contactEmail = contact.email ? contact.email : contact.m;

              if (!contactEmail) {
                contactEmail = v.email ? v.email : v.m;
              }

              var deleteButtonOptional = null;

              if (message.userId === u_handle && unixtime() - message.delay < generic_MESSAGE_NOT_EDITABLE_TIMEOUT) {
                deleteButtonOptional = external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "red-cross",
                  label: l[83],
                  className: "red",
                  onClick: function onClick(e) {
                    self.doDelete(e, message);
                  }
                });
              }

              var dropdown = null;

              if (!M.u[contact.u]) {
                M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, true, {
                  'u': contact.u,
                  'name': contact.name,
                  'm': contact.email ? contact.email : contactEmail,
                  'c': undefined
                }));
              } else if (M.u[contact.u] && !M.u[contact.u].m) {
                // if already added from group chat...add the email,
                // since that contact got shared in a chat room
                M.u[contact.u].m = contact.email ? contact.email : contactEmail;
              }

              if (M.u[contact.u] && M.u[contact.u].c === 1) {
                // Only show this dropdown in case this user is a contact, e.g. don't show it if thats me
                // OR it is a share contact, etc.
                dropdown = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                  className: "default-white-button tiny-button",
                  icon: "tiny-icon icons-sprite grey-dots"
                }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                  className: "white-context-menu shared-contact-dropdown",
                  noArrow: true,
                  positionMy: "left bottom",
                  positionAt: "right bottom",
                  horizOffset: 4
                }, external_React_default.a.createElement("div", {
                  className: "dropdown-avatar rounded"
                }, external_React_default.a.createElement(ui_contacts["Avatar"], {
                  className: "avatar-wrapper context-avatar",
                  contact: M.u[contact.u]
                }), external_React_default.a.createElement("div", {
                  className: "dropdown-user-name"
                }, external_React_default.a.createElement("div", {
                  className: "name"
                }, M.getNameByHandle(contact.u), external_React_default.a.createElement(ui_contacts["ContactPresence"], {
                  className: "small",
                  contact: contact
                })), external_React_default.a.createElement("div", {
                  className: "email"
                }, M.u[contact.u].m))), external_React_default.a.createElement(ui_contacts["ContactFingerprint"], {
                  contact: M.u[contact.u]
                }), external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "human-profile",
                  label: __(l[5868]),
                  onClick: function onClick() {
                    loadSubPage("fm/" + contact.u);
                  }
                }), external_React_default.a.createElement("hr", null), null
                /*<DropdownsUI.DropdownItem
                icon="rounded-grey-plus"
                label={__(l[8631])}
                onClick={() => {
                loadSubPage("fm/" + contact.u);
                }}
                />*/
                , external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "conversations",
                  label: __(l[8632]),
                  onClick: function onClick() {
                    loadSubPage("fm/chat/p/" + contact.u);
                  }
                }), deleteButtonOptional ? external_React_default.a.createElement("hr", null) : null, deleteButtonOptional));
              } else if (M.u[contact.u] && !M.u[contact.u].c) {
                dropdown = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                  className: "default-white-button tiny-button",
                  icon: "tiny-icon icons-sprite grey-dots"
                }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                  className: "white-context-menu shared-contact-dropdown",
                  noArrow: true,
                  positionMy: "left bottom",
                  positionAt: "right bottom",
                  horizOffset: 4
                }, external_React_default.a.createElement("div", {
                  className: "dropdown-avatar rounded"
                }, external_React_default.a.createElement(ui_contacts["Avatar"], {
                  className: "avatar-wrapper context-avatar",
                  contact: M.u[contact.u]
                }), external_React_default.a.createElement("div", {
                  className: "dropdown-user-name"
                }, external_React_default.a.createElement("div", {
                  className: "name"
                }, M.getNameByHandle(contact.u), external_React_default.a.createElement(ui_contacts["ContactPresence"], {
                  className: "small",
                  contact: contact
                })), external_React_default.a.createElement("div", {
                  className: "email"
                }, M.u[contact.u].m))), external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                  icon: "rounded-grey-plus",
                  label: __(l[71]),
                  onClick: function onClick() {
                    var exists = false;
                    Object.keys(M.opc).forEach(function (k) {
                      if (!exists && M.opc[k].m === contactEmail && !M.opc[k].hasOwnProperty('dts')) {
                        exists = true;
                        return false;
                      }
                    });

                    if (exists) {
                      closeDialog();
                      msgDialog('warningb', '', l[17545]);
                    } else {
                      M.inviteContact(M.u[u_handle].m, contactEmail); // Contact invited

                      var title = l[150]; // The user [X] has been invited and will appear in your contact list
                      // once accepted."

                      var msg = l[5898].replace('[X]', contactEmail);
                      closeDialog();
                      msgDialog('info', title, msg);
                    }
                  }
                }), deleteButtonOptional ? external_React_default.a.createElement("hr", null) : null, deleteButtonOptional));
              }

              contacts.push(external_React_default.a.createElement("div", {
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
              }) : null, dropdown, external_React_default.a.createElement(ui_contacts["Avatar"], {
                className: "avatar-wrapper medium-avatar",
                contact: M.u[contact.u]
              })), external_React_default.a.createElement("div", {
                className: "clear"
              }))));
            });
            var avatar = null;
            var datetime = null;
            var name = null;

            if (this.props.grouped) {
              additionalClasses += " grouped";
            } else {
              avatar = external_React_default.a.createElement(ui_contacts["Avatar"], {
                contact: contact,
                className: "message avatar-wrapper small-rounded-avatar"
              });
              datetime = external_React_default.a.createElement("div", {
                className: "message date-time simpletip",
                "data-simpletip": time2date(timestampInt)
              }, timestamp);
              name = external_React_default.a.createElement(ui_contacts["ContactButton"], {
                contact: contact,
                className: "message",
                label: displayName
              });
            }

            return external_React_default.a.createElement("div", {
              className: message.messageId + " message body" + additionalClasses
            }, avatar, external_React_default.a.createElement("div", {
              className: "message content-area"
            }, name, datetime, external_React_default.a.createElement("div", {
              className: "message shared-block"
            }, contacts), buttonsBlock, spinnerElement));
          } else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT) {
            // don't show anything if this is a 'revoke' message
            return null;
          } else if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
            var _avatar = null;
            var _messageActionButtons = null;

            if (this.props.grouped) {
              additionalClasses += " grouped";
            } else {
              _avatar = external_React_default.a.createElement(ui_contacts["Avatar"], {
                contact: contact,
                className: "message avatar-wrapper small-rounded-avatar"
              });
              datetime = external_React_default.a.createElement("div", {
                className: "message date-time simpletip",
                "data-simpletip": time2date(timestampInt)
              }, timestamp);
              name = external_React_default.a.createElement(ui_contacts["ContactButton"], {
                contact: contact,
                className: "message",
                label: displayName
              });
            }

            var attachmentMetadata = message.getAttachmentMeta() || [];
            var audioContainer = null;
            attachmentMetadata.forEach(function (v) {
              audioContainer = external_React_default.a.createElement(messages_AudioContainer, {
                h: v.h,
                mime: v.mime,
                playtime: v.playtime,
                audioId: "vm".concat(message.messageId)
              });
            });
            var iAmSender = contact && contact.u === u_handle;
            var stillEditable = unixtime() - message.delay < generic_MESSAGE_NOT_EDITABLE_TIMEOUT;
            var isBeingEdited = self.isBeingEdited() === true;
            var chatIsReadOnly = chatRoom.isReadOnly() === true;

            if (iAmSender && stillEditable && !isBeingEdited && !chatIsReadOnly && !self.props.dialog) {
              var deleteButton = external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                icon: "red-cross",
                label: __(l[1730]),
                className: "red",
                onClick: function onClick(e) {
                  self.doDelete(e, message);
                }
              });
              _messageActionButtons = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                className: "default-white-button tiny-button",
                icon: "tiny-icon icons-sprite grey-dots"
              }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                className: "white-context-menu attachments-dropdown",
                noArrow: true,
                positionMy: "left bottom",
                positionAt: "right bottom",
                horizOffset: 4
              }, deleteButton));
            }

            return external_React_default.a.createElement("div", {
              className: message.messageId + " message body" + additionalClasses
            }, _avatar, external_React_default.a.createElement("div", {
              className: "message content-area"
            }, name, datetime, _messageActionButtons, external_React_default.a.createElement("div", {
              className: "message shared-block"
            }, files), buttonsBlock, spinnerElement, audioContainer));
          } else {
            chatRoom.logger.warn("Invalid 2nd byte for a management message: ", textContents);
            return null;
          }
        } else {
          // this is a text message.
          var geoLocation = null;

          if (message.textContents === "" && !message.dialogType) {
            message.deleted = true;
          }

          if (!message.deleted) {
            if (message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW) {
              if (!message.meta.requiresConfirmation) {
                subMessageComponent.push(external_React_default.a.createElement(MetaRichpreview, {
                  key: "richprev",
                  message: message,
                  chatRoom: chatRoom
                }));

                if (message.isEditable()) {
                  if (!message.meta.isLoading) {
                    extraPreButtons.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                      key: "remove-link-preview",
                      icon: "icons-sprite bold-crossed-eye",
                      label: l[18684],
                      className: "",
                      onClick: function onClick(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
                      }
                    }));
                  } else {
                    // still loading, cancel loading?
                    extraPreButtons.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                      icon: "icons-sprite bold-crossed-eye",
                      key: "stop-link-preview",
                      label: l[18684],
                      className: "",
                      onClick: function onClick(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
                      }
                    }));
                  }
                }
              } else if (!self.isBeingEdited()) {
                if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
                  additionalClasses += " preview-requires-confirmation-container";
                  subMessageComponent.push(external_React_default.a.createElement(MetaRichpreviewConfirmation, {
                    key: "confirm",
                    message: message,
                    chatRoom: chatRoom
                  }));
                } else {
                  extraPreButtons.push(external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                    key: "insert-link-preview",
                    icon: "icons-sprite bold-eye",
                    label: l[18683],
                    className: "",
                    onClick: function onClick(e) {
                      e.stopPropagation();
                      e.preventDefault();
                      chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
                    }
                  }));
                }
              }
            } else if (message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
              var _message$meta$extra$ = message.meta.extra[0],
                  lng = _message$meta$extra$.lng,
                  latitude = _message$meta$extra$.la;
              geoLocation = external_React_default.a.createElement(messages_geoLocation, {
                latitude: latitude,
                lng: lng
              });
            }

            if (message.megaLinks) {
              subMessageComponent.push(external_React_default.a.createElement(metaRichpreviewMegaLinks_MetaRichpreviewMegaLinks, {
                key: "richprevml",
                message: message,
                chatRoom: chatRoom
              }));
            }
          }

          var messageActionButtons = null;

          if (message.getState() === Message.STATE.NOT_SENT || message.getState() === Message.STATE.NOT_SENT_EXPIRED) {
            messageActionButtons = null;

            if (!spinnerElement) {
              if (!message.requiresManualRetry) {
                messageNotSendIndicator = external_React_default.a.createElement("div", {
                  className: "not-sent-indicator tooltip-trigger",
                  "data-tooltip": "not-sent-notification"
                }, external_React_default.a.createElement("i", {
                  className: "small-icon yellow-triangle"
                }));
              } else {
                if (self.isBeingEdited() !== true) {
                  messageNotSendIndicator = external_React_default.a.createElement("div", {
                    className: "not-sent-indicator"
                  }, external_React_default.a.createElement("span", {
                    className: "tooltip-trigger",
                    key: "retry",
                    "data-tooltip": "not-sent-notification-manual",
                    onClick: function onClick(e) {
                      self.doRetry(e, message);
                    }
                  }, external_React_default.a.createElement("i", {
                    className: "small-icon refresh-circle"
                  })), external_React_default.a.createElement("span", {
                    className: "tooltip-trigger",
                    key: "cancel",
                    "data-tooltip": "not-sent-notification-cancel",
                    onClick: function onClick(e) {
                      self.doCancelRetry(e, message);
                    }
                  }, external_React_default.a.createElement("i", {
                    className: "small-icon red-cross"
                  })));
                }
              }
            }
          }

          var avatar = null;
          var datetime = null;
          var name = null;

          if (this.props.grouped) {
            additionalClasses += " grouped";
          } else {
            avatar = external_React_default.a.createElement(ui_contacts["Avatar"], {
              contact: contact,
              className: "message avatar-wrapper small-rounded-avatar"
            });
            datetime = external_React_default.a.createElement("div", {
              className: "message date-time simpletip",
              "data-simpletip": time2date(timestampInt)
            }, timestamp);
            name = external_React_default.a.createElement(ui_contacts["ContactButton"], {
              contact: contact,
              className: "message",
              label: displayName
            });
          }

          var messageDisplayBlock;

          if (self.isBeingEdited() === true) {
            var msgContents = message.textContents;
            msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);
            messageDisplayBlock = external_React_default.a.createElement(typingArea_TypingArea, {
              iconClass: "small-icon writing-pen textarea-icon",
              initialText: msgContents,
              chatRoom: self.props.message.chatRoom,
              showButtons: true,
              className: "edit-typing-area",
              onUpdate: function onUpdate() {
                if (self.props.onUpdate) {
                  self.props.onUpdate();
                }
              },
              onConfirm: function onConfirm(messageContents) {
                self.setState({
                  'editing': false
                });

                if (self.props.onEditDone) {
                  Soon(function () {
                    var tmpMessageObj = {
                      'textContents': messageContents
                    };
                    megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
                    self.props.onEditDone(tmpMessageObj.textContents);

                    if (self.isMounted()) {
                      self.forceUpdate();
                    }
                  });
                }

                return true;
              }
            });
          } else if (message.deleted) {
            return null;
          } else {
            if (message.updated > 0 && !message.metaType) {
              textMessage = textMessage + " <em>" + __(l[8887]) + "</em>";
            }

            if (self.props.initTextScrolling) {
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
            if (contact && contact.u === u_handle && unixtime() - message.delay < generic_MESSAGE_NOT_EDITABLE_TIMEOUT && self.isBeingEdited() !== true && chatRoom.isReadOnly() === false && !message.requiresManualRetry) {
              var editButton = message.metaType !== Message.MESSAGE_META_TYPE.GEOLOCATION ? external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                icon: "icons-sprite writing-pencil",
                label: __(l[1342]),
                className: "",
                onClick: function onClick(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  self.setState({
                    'editing': true
                  });
                }
              }) : null;
              messageActionButtons = external_React_default.a.createElement(generic_ButtonsUI.Button, {
                className: "default-white-button tiny-button",
                icon: "tiny-icon icons-sprite grey-dots"
              }, external_React_default.a.createElement(generic_DropdownsUI.Dropdown, {
                className: "white-context-menu attachments-dropdown",
                noArrow: true,
                positionMy: "left bottom",
                positionAt: "right bottom",
                horizOffset: 4
              }, extraPreButtons, editButton, editButton ? external_React_default.a.createElement("hr", null) : null, external_React_default.a.createElement(generic_DropdownsUI.DropdownItem, {
                icon: "red-cross",
                label: __(l[1730]),
                className: "red",
                onClick: function onClick(e) {
                  self.doDelete(e, message);
                }
              })));
            }
          }

          var isGeoLocation = message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;

          if (isGeoLocation) {
            messageDisplayBlock = null;
          }

          return external_React_default.a.createElement("div", {
            className: message.messageId + " message body " + additionalClasses
          }, avatar, external_React_default.a.createElement("div", {
            className: "message content-area"
          }, name, datetime, self.props.hideActionButtons ? null : messageActionButtons, messageNotSendIndicator, messageDisplayBlock, subMessageComponent, buttonsBlock, spinnerElement, geoLocation));
        }
      } // if this is an inline dialog
      else if (message.type) {
          var avatarsListing = [];
          textMessage = Object(messages_utils["getMessageString"])(message.type, message.chatRoom.type === "group" || message.chatRoom.type === "public");

          if (!textMessage) {
            console.error("Message with type: ", message.type, " - no text string defined. Message: ", message);
            return;
          } // if is an array.


          textMessage = CallManager._getMultiStringTextContentsForMessage(message, textMessage.splice ? textMessage : [textMessage], true);
          message.textContents = String(textMessage).replace("[[", "<span class=\"bold\">").replace("]]", "</span>");
          var avatar = null;
          var name = null; // mapping css icons to msg types

          if (message.showInitiatorAvatar) {
            if (this.props.grouped) {
              additionalClasses += " grouped";
            } else {
              avatar = external_React_default.a.createElement(ui_contacts["Avatar"], {
                contact: message.authorContact,
                className: "message avatar-wrapper small-rounded-avatar"
              });
              displayName = M.getNameByHandle(message.authorContact.u);
              name = external_React_default.a.createElement(ui_contacts["ContactButton"], {
                contact: contact,
                className: "message",
                label: displayName
              });
            }
          }

          if (message.type === "call-rejected") {
            message.cssClass = "handset-with-stop";
          } else if (message.type === "call-missed") {
            message.cssClass = "handset-with-yellow-arrow";
          } else if (message.type === "call-handled-elsewhere") {
            message.cssClass = "handset-with-up-arrow";
          } else if (message.type === "call-failed") {
            message.cssClass = "handset-with-cross";
          } else if (message.type === "call-timeout") {
            message.cssClass = "horizontal-handset";
          } else if (message.type === "call-failed-media") {
            message.cssClass = "handset-with-yellow-cross";
          } else if (message.type === "call-canceled") {
            message.cssClass = "crossed-handset";
          } else if (message.type === "call-ended") {
            message.cssClass = "horizontal-handset";
          } else if (message.type === "call-feedback") {
            message.cssClass = "diagonal-handset";
          } else if (message.type === "call-starting") {
            message.cssClass = "diagonal-handset";
          } else if (message.type === "call-initialising") {
            message.cssClass = "diagonal-handset";
          } else if (message.type === "call-started") {
            message.cssClass = "diagonal-handset";
          } else if (message.type === "incoming-call") {
            message.cssClass = "handset-with-down-arrow";
          } else if (message.type === "outgoing-call") {
            message.cssClass = "handset-with-up-arrow";
          } else {
            message.cssClass = message.type;
          }

          var buttons = [];

          if (message.buttons) {
            Object.keys(message.buttons).forEach(function (k) {
              var button = message.buttons[k];
              var classes = button.classes;
              var icon;

              if (button.icon) {
                icon = external_React_default.a.createElement("i", {
                  className: "small-icon " + button.icon
                });
              }

              buttons.push(external_React_default.a.createElement("div", {
                className: classes,
                key: k,
                onClick: function onClick(e) {
                  button.callback.call(e.target);
                }
              }, icon, button.text));
            });
          }

          var buttonsCode;

          if (buttons.length > 0) {
            buttonsCode = external_React_default.a.createElement("div", {
              className: "buttons-block"
            }, buttons, external_React_default.a.createElement("div", {
              className: "clear"
            }));
          }

          if (message.chatRoom.type === "group" || message.chatRoom.type === "public") {
            var participantNames = [];
            (message.meta && message.meta.participants || []).forEach(function (handle) {
              var name = M.getNameByHandle(handle);
              name && participantNames.push("[[" + htmlentities(name) + "]]");
            });
            additionalClasses += message.type !== "outgoing-call" && message.type != "incoming-call" ? " with-border" : "";
            var translationString = "";

            if (participantNames && participantNames.length > 0) {
              translationString += mega.utils.trans.listToString(participantNames, l[20234]);
            }

            if ((message.type === "call-ended" || message.type === "call-failed") && message.meta && message.meta.duration) {
              translationString += (participantNames && participantNames.length > 0 ? ". " : "") + l[7208].replace("[X]", "[[" + secToDuration(message.meta.duration) + "]]");
            }

            translationString = translationString.replace(/\[\[/g, "<span class=\"bold\">").replace(/\]\]/g, "</span>");

            if (message.type === "call-started") {
              textMessage = '<i class="call-icon diagonal-handset green"></i>' + textMessage;
            } else if (message.type === "call-ended") {
              textMessage = '<i class="call-icon big horizontal-handset grey"></i>' + textMessage;
            } else if (message.type !== "outgoing-call" && message.type !== "incoming-call") {
              textMessage = '<i class="call-icon ' + message.cssClass + '"></i>' + textMessage;
            }

            textMessage = "<div class=\"bold mainMessage\">" + textMessage + "</div>" + "<div class=\"extraCallInfo\">" + translationString + "</div>";

            if (message.type === "call-started" && message.messageId === "call-started-" + chatRoom.getActiveCallMessageId()) {
              var unique = chatRoom.uniqueCallParts ? Object.keys(chatRoom.uniqueCallParts) : [];
              unique.forEach(function (handle) {
                avatarsListing.push(external_React_default.a.createElement(ui_contacts["Avatar"], {
                  key: handle,
                  contact: M.u[handle],
                  simpletip: M.u[handle] && M.u[handle].name,
                  className: "message avatar-wrapper small-rounded-avatar"
                }));
              });
            }
          }

          return external_React_default.a.createElement("div", {
            className: message.messageId + " message body" + additionalClasses,
            "data-id": "id" + message.messageId
          }, !message.showInitiatorAvatar ? external_React_default.a.createElement("div", {
            className: "feedback call-status-block"
          }, external_React_default.a.createElement("i", {
            className: "call-icon " + message.cssClass
          })) : avatar, external_React_default.a.createElement("div", {
            className: "message content-area"
          }, name, external_React_default.a.createElement("div", {
            className: "message date-time simpletip",
            "data-simpletip": time2date(timestampInt)
          }, timestamp), external_React_default.a.createElement("div", {
            className: "message text-block"
          }, external_React_default.a.createElement("div", {
            className: "message call-inner-block"
          }, avatarsListing, external_React_default.a.createElement("div", {
            dangerouslySetInnerHTML: {
              __html: textMessage
            }
          }))), buttonsCode));
        }
    }
  }]);

  return GenericConversationMessage;
}(mixin["ConversationMessageMixin"]);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/alterParticipants.jsx
function alterParticipants_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { alterParticipants_typeof = function _typeof(obj) { return typeof obj; }; } else { alterParticipants_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return alterParticipants_typeof(obj); }

function alterParticipants_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function alterParticipants_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function alterParticipants_createClass(Constructor, protoProps, staticProps) { if (protoProps) alterParticipants_defineProperties(Constructor.prototype, protoProps); if (staticProps) alterParticipants_defineProperties(Constructor, staticProps); return Constructor; }

function alterParticipants_possibleConstructorReturn(self, call) { if (call && (alterParticipants_typeof(call) === "object" || typeof call === "function")) { return call; } return alterParticipants_assertThisInitialized(self); }

function alterParticipants_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function alterParticipants_getPrototypeOf(o) { alterParticipants_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return alterParticipants_getPrototypeOf(o); }

function alterParticipants_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) alterParticipants_setPrototypeOf(subClass, superClass); }

function alterParticipants_setPrototypeOf(o, p) { alterParticipants_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return alterParticipants_setPrototypeOf(o, p); }

var alterParticipants_React = __webpack_require__(0);

var alterParticipants_ReactDOM = __webpack_require__(4);

var alterParticipants_utils = __webpack_require__(3);

var alterParticipants_ContactsUI = __webpack_require__(2);

var alterParticipants_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var alterParticipants_getMessageString = __webpack_require__(10).getMessageString;

var AlterParticipantsConversationMessage =
/*#__PURE__*/
function (_ConversationMessageM) {
  alterParticipants_inherits(AlterParticipantsConversationMessage, _ConversationMessageM);

  function AlterParticipantsConversationMessage() {
    alterParticipants_classCallCheck(this, AlterParticipantsConversationMessage);

    return alterParticipants_possibleConstructorReturn(this, alterParticipants_getPrototypeOf(AlterParticipantsConversationMessage).apply(this, arguments));
  }

  alterParticipants_createClass(AlterParticipantsConversationMessage, [{
    key: "_ensureNameIsLoaded",
    value: function _ensureNameIsLoaded(h) {
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
    }
  }, {
    key: "haveMoreContactListeners",
    value: function haveMoreContactListeners() {
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
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = alterParticipants_React.makeElement("div", {
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
        var avatar = alterParticipants_React.makeElement(alterParticipants_ContactsUI.Avatar, {
          contact: otherContact,
          className: "message avatar-wrapper small-rounded-avatar"
        });
        var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;
        var text = h === contact.u ? __('joined the group chat.') : __(l[8907]).replace("%s", '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>');

        self._ensureNameIsLoaded(otherContact.u);

        messages.push(alterParticipants_React.makeElement("div", {
          className: "message body",
          "data-id": "id" + message.messageId,
          key: message.messageId + "_" + h
        }, avatar, alterParticipants_React.makeElement("div", {
          className: "message content-area small-info-txt"
        }, alterParticipants_React.makeElement(alterParticipants_ContactsUI.ContactButton, {
          contact: otherContact,
          className: "message",
          label: otherDisplayName
        }), datetime, alterParticipants_React.makeElement("div", {
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
        var avatar = alterParticipants_React.makeElement(alterParticipants_ContactsUI.Avatar, {
          contact: otherContact,
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

        messages.push(alterParticipants_React.makeElement("div", {
          className: "message body",
          "data-id": "id" + message.messageId,
          key: message.messageId + "_" + h
        }, avatar, alterParticipants_React.makeElement("div", {
          className: "message content-area small-info-txt"
        }, alterParticipants_React.makeElement(alterParticipants_ContactsUI.ContactButton, {
          contact: otherContact,
          className: "message",
          label: otherDisplayName
        }), datetime, alterParticipants_React.makeElement("div", {
          className: "message text-block",
          dangerouslySetInnerHTML: {
            __html: text
          }
        }))));
      });
      return alterParticipants_React.makeElement("div", null, messages);
    }
  }]);

  return AlterParticipantsConversationMessage;
}(alterParticipants_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/truncated.jsx
function truncated_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { truncated_typeof = function _typeof(obj) { return typeof obj; }; } else { truncated_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return truncated_typeof(obj); }

function truncated_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function truncated_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function truncated_createClass(Constructor, protoProps, staticProps) { if (protoProps) truncated_defineProperties(Constructor.prototype, protoProps); if (staticProps) truncated_defineProperties(Constructor, staticProps); return Constructor; }

function truncated_possibleConstructorReturn(self, call) { if (call && (truncated_typeof(call) === "object" || typeof call === "function")) { return call; } return truncated_assertThisInitialized(self); }

function truncated_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function truncated_getPrototypeOf(o) { truncated_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return truncated_getPrototypeOf(o); }

function truncated_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) truncated_setPrototypeOf(subClass, superClass); }

function truncated_setPrototypeOf(o, p) { truncated_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return truncated_setPrototypeOf(o, p); }

var truncated_React = __webpack_require__(0);

var truncated_ReactDOM = __webpack_require__(4);

var truncated_utils = __webpack_require__(3);



var truncated_ContactsUI = __webpack_require__(2);

var truncated_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var truncated_getMessageString = __webpack_require__(10).getMessageString;

var TruncatedMessage =
/*#__PURE__*/
function (_ConversationMessageM) {
  truncated_inherits(TruncatedMessage, _ConversationMessageM);

  function TruncatedMessage() {
    truncated_classCallCheck(this, TruncatedMessage);

    return truncated_possibleConstructorReturn(this, truncated_getPrototypeOf(TruncatedMessage).apply(this, arguments));
  }

  truncated_createClass(TruncatedMessage, [{
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = truncated_React.makeElement("div", {
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
        avatar = truncated_React.makeElement(truncated_ContactsUI.Avatar, {
          contact: contact,
          className: "message avatar-wrapper small-rounded-avatar"
        });
        datetime = truncated_React.makeElement("div", {
          className: "message date-time simpletip",
          "data-simpletip": time2date(timestampInt)
        }, timestamp);
      }

      return truncated_React.makeElement("div", {
        className: cssClasses,
        "data-id": "id" + message.messageId,
        key: message.messageId
      }, avatar, truncated_React.makeElement("div", {
        className: "message content-area small-info-txt"
      }, truncated_React.makeElement(truncated_ContactsUI.ContactButton, {
        contact: contact,
        className: "message",
        label: displayName
      }), datetime, truncated_React.makeElement("div", {
        className: "message text-block"
      }, __(l[8905]))));
    }
  }]);

  return TruncatedMessage;
}(truncated_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/privilegeChange.jsx
function privilegeChange_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { privilegeChange_typeof = function _typeof(obj) { return typeof obj; }; } else { privilegeChange_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return privilegeChange_typeof(obj); }

function privilegeChange_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function privilegeChange_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function privilegeChange_createClass(Constructor, protoProps, staticProps) { if (protoProps) privilegeChange_defineProperties(Constructor.prototype, protoProps); if (staticProps) privilegeChange_defineProperties(Constructor, staticProps); return Constructor; }

function privilegeChange_possibleConstructorReturn(self, call) { if (call && (privilegeChange_typeof(call) === "object" || typeof call === "function")) { return call; } return privilegeChange_assertThisInitialized(self); }

function privilegeChange_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function privilegeChange_getPrototypeOf(o) { privilegeChange_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return privilegeChange_getPrototypeOf(o); }

function privilegeChange_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) privilegeChange_setPrototypeOf(subClass, superClass); }

function privilegeChange_setPrototypeOf(o, p) { privilegeChange_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return privilegeChange_setPrototypeOf(o, p); }

var privilegeChange_React = __webpack_require__(0);

var privilegeChange_ReactDOM = __webpack_require__(4);

var privilegeChange_utils = __webpack_require__(3);



var privilegeChange_ContactsUI = __webpack_require__(2);

var privilegeChange_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var privilegeChange_getMessageString = __webpack_require__(10).getMessageString;

var PrivilegeChange =
/*#__PURE__*/
function (_ConversationMessageM) {
  privilegeChange_inherits(PrivilegeChange, _ConversationMessageM);

  function PrivilegeChange() {
    privilegeChange_classCallCheck(this, PrivilegeChange);

    return privilegeChange_possibleConstructorReturn(this, privilegeChange_getPrototypeOf(PrivilegeChange).apply(this, arguments));
  }

  privilegeChange_createClass(PrivilegeChange, [{
    key: "haveMoreContactListeners",
    value: function haveMoreContactListeners() {
      if (!this.props.message.meta || !this.props.message.meta.targetUserId) {
        return false;
      }

      var uid = this.props.message.meta.targetUserId;

      if (uid && M.u[uid]) {
        return uid;
      } else {
        return false;
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = privilegeChange_React.makeElement("div", {
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
      var avatar = privilegeChange_React.makeElement(privilegeChange_ContactsUI.Avatar, {
        contact: otherContact,
        className: "message avatar-wrapper small-rounded-avatar"
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

      messages.push(privilegeChange_React.makeElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId
      }, avatar, privilegeChange_React.makeElement("div", {
        className: "message content-area small-info-txt"
      }, privilegeChange_React.makeElement(privilegeChange_ContactsUI.ContactButton, {
        contact: otherContact,
        className: "message",
        label: otherDisplayName
      }), datetime, privilegeChange_React.makeElement("div", {
        className: "message text-block",
        dangerouslySetInnerHTML: {
          __html: text
        }
      }))));
      return privilegeChange_React.makeElement("div", null, messages);
    }
  }]);

  return PrivilegeChange;
}(privilegeChange_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/topicChange.jsx
function topicChange_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { topicChange_typeof = function _typeof(obj) { return typeof obj; }; } else { topicChange_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return topicChange_typeof(obj); }

function topicChange_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function topicChange_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function topicChange_createClass(Constructor, protoProps, staticProps) { if (protoProps) topicChange_defineProperties(Constructor.prototype, protoProps); if (staticProps) topicChange_defineProperties(Constructor, staticProps); return Constructor; }

function topicChange_possibleConstructorReturn(self, call) { if (call && (topicChange_typeof(call) === "object" || typeof call === "function")) { return call; } return topicChange_assertThisInitialized(self); }

function topicChange_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function topicChange_getPrototypeOf(o) { topicChange_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return topicChange_getPrototypeOf(o); }

function topicChange_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) topicChange_setPrototypeOf(subClass, superClass); }

function topicChange_setPrototypeOf(o, p) { topicChange_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return topicChange_setPrototypeOf(o, p); }

var topicChange_React = __webpack_require__(0);

var topicChange_ReactDOM = __webpack_require__(4);

var topicChange_utils = __webpack_require__(3);



var topicChange_ContactsUI = __webpack_require__(2);

var topicChange_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var topicChange_getMessageString = __webpack_require__(10).getMessageString;

var TopicChange =
/*#__PURE__*/
function (_ConversationMessageM) {
  topicChange_inherits(TopicChange, _ConversationMessageM);

  function TopicChange() {
    topicChange_classCallCheck(this, TopicChange);

    return topicChange_possibleConstructorReturn(this, topicChange_getPrototypeOf(TopicChange).apply(this, arguments));
  }

  topicChange_createClass(TopicChange, [{
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = topicChange_React.makeElement("div", {
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
      var avatar = topicChange_React.makeElement(topicChange_ContactsUI.Avatar, {
        contact: contact,
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

      messages.push(topicChange_React.makeElement("div", {
        className: "message body",
        "data-id": "id" + message.messageId,
        key: message.messageId
      }, avatar, topicChange_React.makeElement("div", {
        className: "message content-area small-info-txt"
      }, topicChange_React.makeElement(topicChange_ContactsUI.ContactButton, {
        contact: contact,
        className: "message",
        label: displayName
      }), datetime, topicChange_React.makeElement("div", {
        className: "message text-block",
        dangerouslySetInnerHTML: {
          __html: text
        }
      }))));
      return topicChange_React.makeElement("div", null, messages);
    }
  }]);

  return TopicChange;
}(topicChange_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/sharedFilesAccordionPanel.jsx
var sharedFilesAccordionPanel_dec, sharedFilesAccordionPanel_class;

function sharedFilesAccordionPanel_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { sharedFilesAccordionPanel_get = Reflect.get; } else { sharedFilesAccordionPanel_get = function _get(target, property, receiver) { var base = sharedFilesAccordionPanel_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return sharedFilesAccordionPanel_get(target, property, receiver || target); }

function sharedFilesAccordionPanel_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = sharedFilesAccordionPanel_getPrototypeOf(object); if (object === null) break; } return object; }

function sharedFilesAccordionPanel_applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

function sharedFilesAccordionPanel_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { sharedFilesAccordionPanel_typeof = function _typeof(obj) { return typeof obj; }; } else { sharedFilesAccordionPanel_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return sharedFilesAccordionPanel_typeof(obj); }

function sharedFilesAccordionPanel_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function sharedFilesAccordionPanel_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function sharedFilesAccordionPanel_createClass(Constructor, protoProps, staticProps) { if (protoProps) sharedFilesAccordionPanel_defineProperties(Constructor.prototype, protoProps); if (staticProps) sharedFilesAccordionPanel_defineProperties(Constructor, staticProps); return Constructor; }

function sharedFilesAccordionPanel_possibleConstructorReturn(self, call) { if (call && (sharedFilesAccordionPanel_typeof(call) === "object" || typeof call === "function")) { return call; } return sharedFilesAccordionPanel_assertThisInitialized(self); }

function sharedFilesAccordionPanel_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function sharedFilesAccordionPanel_getPrototypeOf(o) { sharedFilesAccordionPanel_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return sharedFilesAccordionPanel_getPrototypeOf(o); }

function sharedFilesAccordionPanel_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) sharedFilesAccordionPanel_setPrototypeOf(subClass, superClass); }

function sharedFilesAccordionPanel_setPrototypeOf(o, p) { sharedFilesAccordionPanel_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return sharedFilesAccordionPanel_setPrototypeOf(o, p); }

var sharedFilesAccordionPanel_React = __webpack_require__(0);

var sharedFilesAccordionPanel_ReactDOM = __webpack_require__(4);




var SharedFileItem =
/*#__PURE__*/
function (_MegaRenderMixin) {
  sharedFilesAccordionPanel_inherits(SharedFileItem, _MegaRenderMixin);

  function SharedFileItem() {
    sharedFilesAccordionPanel_classCallCheck(this, SharedFileItem);

    return sharedFilesAccordionPanel_possibleConstructorReturn(this, sharedFilesAccordionPanel_getPrototypeOf(SharedFileItem).apply(this, arguments));
  }

  sharedFilesAccordionPanel_createClass(SharedFileItem, [{
    key: "render",
    value: function render() {
      var self = this;
      var message = this.props.message;
      var contact = Message.getContactForMessage(message);
      var name = M.getNameByHandle(contact.u);
      var timestamp = time2date(message.delay);
      var node = this.props.node;
      var icon = this.props.icon;
      return sharedFilesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-block " + (self.props.isLoading ? "is-loading" : ""),
        key: message.messageId + "_" + node.h,
        onClick: function onClick(e) {
          if (self.props.isPreviewable) {
            slideshow(node.ch, undefined, true);
          } else {
            M.addDownload([node]);
          }
        },
        onDoubleClick: function onDoubleClick(e) {
          M.addDownload([node]);
        }
      }, sharedFilesAccordionPanel_React.makeElement("div", {
        className: "icon-or-thumb " + (thumbnails[node.h] ? "thumb" : "")
      }, sharedFilesAccordionPanel_React.makeElement("div", {
        className: "medium-file-icon " + icon
      }), sharedFilesAccordionPanel_React.makeElement("div", {
        className: "img-wrapper",
        id: this.props.imgId
      }, sharedFilesAccordionPanel_React.makeElement("img", {
        alt: "",
        src: thumbnails[node.h] || ""
      }))), sharedFilesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-info"
      }, sharedFilesAccordionPanel_React.makeElement("span", {
        className: "txt"
      }, node.name), sharedFilesAccordionPanel_React.makeElement("span", {
        className: "txt small"
      }, name), sharedFilesAccordionPanel_React.makeElement("span", {
        className: "txt small grey"
      }, timestamp)));
    }
  }]);

  return SharedFileItem;
}(Object(mixins["default"])(sharedFilesAccordionPanel_React.Component));

;
var SharedFilesAccordionPanel = (sharedFilesAccordionPanel_dec = utils["default"].SoonFcWrap(350), (sharedFilesAccordionPanel_class =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  sharedFilesAccordionPanel_inherits(SharedFilesAccordionPanel, _MegaRenderMixin2);

  function SharedFilesAccordionPanel() {
    sharedFilesAccordionPanel_classCallCheck(this, SharedFilesAccordionPanel);

    return sharedFilesAccordionPanel_possibleConstructorReturn(this, sharedFilesAccordionPanel_getPrototypeOf(SharedFilesAccordionPanel).apply(this, arguments));
  }

  sharedFilesAccordionPanel_createClass(SharedFilesAccordionPanel, [{
    key: "eventuallyRenderThumbnails",
    value: function eventuallyRenderThumbnails() {
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
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      this.allShownNodes = {};
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      sharedFilesAccordionPanel_get(sharedFilesAccordionPanel_getPrototypeOf(SharedFilesAccordionPanel.prototype), "componentWillUnmount", this).call(this);

      delete this.allShownNodes;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this.eventuallyRenderThumbnails();
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = self.props.chatRoom;
      var mb = room.messagesBuff;
      var contents = null;
      var currentPage = mb.sharedFilesPage;
      var perPage = 12;
      var startPos = currentPage * perPage;
      var endPos = startPos + perPage;
      var totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / perPage);
      totalPages = mb.sharedFiles.length && !totalPages ? 1 : totalPages;
      var haveMore = mb.haveMoreSharedFiles || currentPage + 1 < totalPages;
      var files = [];

      if (!mb.haveMoreSharedFiles && currentPage === totalPages) {
        // when initially loading, we may go 1 page after the last..so go to previous/last page.
        currentPage = mb.sharedFilesPage = Math.max(totalPages - 1, 0);
      }

      if (this.props.expanded) {
        var prev = null;
        var next = null;

        if (currentPage > 0) {
          prev = sharedFilesAccordionPanel_React.makeElement("div", {
            className: "chat-share-nav button prev",
            onClick: function onClick() {
              mb.sharedFilesPage--;
              self.safeForceUpdate();
            }
          });
        }

        if (haveMore) {
          next = sharedFilesAccordionPanel_React.makeElement("div", {
            className: "chat-share-nav button next",
            onClick: function onClick() {
              if (self.isLoadingMore) {
                return;
              }

              if (mb.sharedFiles.length < endPos + perPage) {
                self.isLoadingMore = true;
                mb.retrieveSharedFilesHistory(perPage).always(function () {
                  self.isLoadingMore = false;
                  mb.sharedFilesPage++;

                  if (!mb.haveMoreSharedFiles && mb.sharedFilesPage > totalPages) {
                    // someone clicked too fast.
                    mb.sharedFilesPage = totalPages - 1;
                  }

                  Soon(function () {
                    self.safeForceUpdate();
                  });
                });
              } else {
                // already in memory
                mb.sharedFilesPage++;
              }

              Soon(function () {
                self.safeForceUpdate();
              });
            }
          });
        }

        if (!mb.sharedFilesLoadedOnce) {
          mb.retrieveSharedFilesHistory(perPage).always(function () {
            Soon(function () {
              self.safeForceUpdate();
            });
          });
        }

        var sharedNodesContainer = null;

        if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
          sharedNodesContainer = sharedFilesAccordionPanel_React.makeElement("div", {
            className: "chat-dropdown empty-txt loading-initial"
          }, sharedFilesAccordionPanel_React.makeElement("div", {
            className: "loading-spinner light small"
          }, sharedFilesAccordionPanel_React.makeElement("div", {
            className: "main-loader"
          })));
        } else if (mb.sharedFiles.length === 0) {
          sharedNodesContainer = sharedFilesAccordionPanel_React.makeElement("div", {
            className: "chat-dropdown empty-txt"
          }, l[19985]);
        } else {
          var keys = mb.sharedFiles.keys().reverse();

          for (var i = startPos; i < endPos; i++) {
            var message = mb.sharedFiles[keys[i]];

            if (!message) {
              continue;
            }

            var nodes = message.getAttachmentMeta();
            nodes.forEach(function (node) {
              var icon = fileIcon(node);
              var mediaType = is_video(node);
              var isImage = is_image2(node);
              var isVideo = mediaType > 0;
              var showThumbnail = String(node.fa).indexOf(':0*') > 0;
              var isPreviewable = isImage || isVideo;
              var imgId = "sharedFiles!" + node.ch;
              files.push(sharedFilesAccordionPanel_React.makeElement(SharedFileItem, {
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

          sharedNodesContainer = sharedFilesAccordionPanel_React.makeElement("div", null, files);
        }

        contents = sharedFilesAccordionPanel_React.makeElement("div", {
          className: "chat-dropdown content have-animation"
        }, sharedNodesContainer, self.isLoadingMore ? sharedFilesAccordionPanel_React.makeElement("div", {
          className: "loading-spinner light small"
        }, sharedFilesAccordionPanel_React.makeElement("div", {
          className: "main-loader"
        })) : null, files.length > 0 ? sharedFilesAccordionPanel_React.makeElement("div", {
          className: "chat-share-nav body"
        }, prev, next, sharedFilesAccordionPanel_React.makeElement("div", {
          className: "chat-share-nav pages"
        }, (l[19988] ? l[19988] : "Page %1").replace("%1", currentPage + 1))) : null);
      }

      return sharedFilesAccordionPanel_React.makeElement("div", {
        className: "chat-dropdown container"
      }, sharedFilesAccordionPanel_React.makeElement("div", {
        className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
        onClick: function onClick(e) {
          self.props.onToggle(e);
        }
      }, sharedFilesAccordionPanel_React.makeElement("span", null, this.props.title), sharedFilesAccordionPanel_React.createElement("i", {
        className: "tiny-icon right-arrow"
      })), sharedFilesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
      }, contents));
    }
  }]);

  return SharedFilesAccordionPanel;
}(Object(mixins["default"])(sharedFilesAccordionPanel_React.Component)), (sharedFilesAccordionPanel_applyDecoratedDescriptor(sharedFilesAccordionPanel_class.prototype, "eventuallyRenderThumbnails", [sharedFilesAccordionPanel_dec], Object.getOwnPropertyDescriptor(sharedFilesAccordionPanel_class.prototype, "eventuallyRenderThumbnails"), sharedFilesAccordionPanel_class.prototype)), sharedFilesAccordionPanel_class));
;

// CONCATENATED MODULE: ./js/chat/ui/incomingSharesAccordionPanel.jsx
function incomingSharesAccordionPanel_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { incomingSharesAccordionPanel_typeof = function _typeof(obj) { return typeof obj; }; } else { incomingSharesAccordionPanel_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return incomingSharesAccordionPanel_typeof(obj); }

function incomingSharesAccordionPanel_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function incomingSharesAccordionPanel_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function incomingSharesAccordionPanel_createClass(Constructor, protoProps, staticProps) { if (protoProps) incomingSharesAccordionPanel_defineProperties(Constructor.prototype, protoProps); if (staticProps) incomingSharesAccordionPanel_defineProperties(Constructor, staticProps); return Constructor; }

function incomingSharesAccordionPanel_possibleConstructorReturn(self, call) { if (call && (incomingSharesAccordionPanel_typeof(call) === "object" || typeof call === "function")) { return call; } return incomingSharesAccordionPanel_assertThisInitialized(self); }

function incomingSharesAccordionPanel_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function incomingSharesAccordionPanel_getPrototypeOf(o) { incomingSharesAccordionPanel_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return incomingSharesAccordionPanel_getPrototypeOf(o); }

function incomingSharesAccordionPanel_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) incomingSharesAccordionPanel_setPrototypeOf(subClass, superClass); }

function incomingSharesAccordionPanel_setPrototypeOf(o, p) { incomingSharesAccordionPanel_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return incomingSharesAccordionPanel_setPrototypeOf(o, p); }

var incomingSharesAccordionPanel_React = __webpack_require__(0);

var incomingSharesAccordionPanel_ReactDOM = __webpack_require__(4);



var SharedFolderItem =
/*#__PURE__*/
function (_MegaRenderMixin) {
  incomingSharesAccordionPanel_inherits(SharedFolderItem, _MegaRenderMixin);

  function SharedFolderItem() {
    incomingSharesAccordionPanel_classCallCheck(this, SharedFolderItem);

    return incomingSharesAccordionPanel_possibleConstructorReturn(this, incomingSharesAccordionPanel_getPrototypeOf(SharedFolderItem).apply(this, arguments));
  }

  incomingSharesAccordionPanel_createClass(SharedFolderItem, [{
    key: "render",
    value: function render() {
      var self = this;
      var node = this.props.node;
      return incomingSharesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-block incoming " + (self.props.isLoading ? "is-loading" : ""),
        key: node.h,
        onClick: function onClick(e) {
          M.openFolder(node.h);
        },
        onDoubleClick: function onDoubleClick(e) {
          M.openFolder(node.h);
        }
      }, incomingSharesAccordionPanel_React.makeElement("div", {
        className: "medium-file-icon inbound-share"
      }), incomingSharesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-info"
      }, incomingSharesAccordionPanel_React.makeElement("span", {
        className: "txt"
      }, node.name), incomingSharesAccordionPanel_React.makeElement("span", {
        className: "txt small"
      }, fm_contains(node.tf, node.td))));
    }
  }]);

  return SharedFolderItem;
}(Object(mixins["default"])(incomingSharesAccordionPanel_React.Component));

;

var IncomingSharesAccordionPanel =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  incomingSharesAccordionPanel_inherits(IncomingSharesAccordionPanel, _MegaRenderMixin2);

  function IncomingSharesAccordionPanel() {
    incomingSharesAccordionPanel_classCallCheck(this, IncomingSharesAccordionPanel);

    return incomingSharesAccordionPanel_possibleConstructorReturn(this, incomingSharesAccordionPanel_getPrototypeOf(IncomingSharesAccordionPanel).apply(this, arguments));
  }

  incomingSharesAccordionPanel_createClass(IncomingSharesAccordionPanel, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      this.hadLoaded = false;
    }
  }, {
    key: "getContactHandle",
    value: function getContactHandle() {
      var self = this;
      var room = self.props.chatRoom;
      var contactHandle = room.getParticipantsExceptMe()[0];

      if (!contactHandle || room.type !== "private") {
        return {};
      }

      return contactHandle;
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = self.props.chatRoom;
      var contactHandle = self.getContactHandle();
      var contents = null;
      var MAX_ITEMS = 10;

      if (this.props.expanded) {
        if (!this.hadLoaded) {
          this.hadLoaded = true; // load shares

          self.isLoadingMore = true;
          dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).always(function () {
            self.isLoadingMore = false;
            Soon(function () {
              if (self.isComponentEventuallyVisible()) {
                self.safeForceUpdate();
              }
            }, 5000);
          }.bind(this));
        }

        var incomingSharesContainer = null;
        var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

        if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
          incomingSharesContainer = incomingSharesAccordionPanel_React.makeElement("div", {
            className: "chat-dropdown empty-txt"
          }, l[19986]);
        } else {
          var haveMore = sharedFolders.length > MAX_ITEMS; // do sort

          var defSortFn = M.getSortByNameFn();
          sharedFolders.sort(function (a, b) {
            var nodeA = M.d[a];
            var nodeB = M.d[b];
            return defSortFn(nodeA, nodeB, -1);
          });
          var renderNodes = [];

          for (var i = 0; i < Math.min(sharedFolders.length, MAX_ITEMS); i++) {
            var nodeHandle = sharedFolders[i];
            var node = M.d[nodeHandle];

            if (!node) {
              continue;
            }

            renderNodes.push(incomingSharesAccordionPanel_React.makeElement(SharedFolderItem, {
              key: node.h,
              isLoading: self.isLoadingMore,
              node: node,
              chatRoom: room,
              s: true
            }));
          }

          incomingSharesContainer = incomingSharesAccordionPanel_React.makeElement("div", null, renderNodes, haveMore ? incomingSharesAccordionPanel_React.createElement("div", {
            className: "chat-share-nav body"
          }, incomingSharesAccordionPanel_React.makeElement("div", {
            className: "chat-share-nav show-all",
            onClick: function onClick(e) {
              M.openFolder(contactHandle);
            }
          }, incomingSharesAccordionPanel_React.makeElement("span", {
            className: "transfer-filetype-icon inbound-share"
          }, incomingSharesAccordionPanel_React.makeElement("span", {
            className: "transfer-filetype-icon inbound-share"
          })), incomingSharesAccordionPanel_React.makeElement("span", {
            className: "txt"
          }, __(l[19797]) ? __(l[19797]) : "Show All"))) : null);
        }

        contents = incomingSharesAccordionPanel_React.makeElement("div", {
          className: "chat-dropdown content have-animation"
        }, incomingSharesContainer, self.isLoadingMore ? incomingSharesAccordionPanel_React.makeElement("div", {
          className: "chat-dropdown empty-txt"
        }, incomingSharesAccordionPanel_React.makeElement("div", {
          className: "loading-spinner light small"
        }, incomingSharesAccordionPanel_React.makeElement("div", {
          className: "main-loader"
        }))) : null);
      }

      return incomingSharesAccordionPanel_React.makeElement("div", {
        className: "chat-dropdown container"
      }, incomingSharesAccordionPanel_React.makeElement("div", {
        className: "chat-dropdown header " + (this.props.expanded ? "expanded" : ""),
        onClick: function onClick(e) {
          self.props.onToggle(e);
        }
      }, incomingSharesAccordionPanel_React.makeElement("span", null, this.props.title), incomingSharesAccordionPanel_React.createElement("i", {
        className: "tiny-icon right-arrow"
      })), incomingSharesAccordionPanel_React.makeElement("div", {
        className: "chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")
      }, contents));
    }
  }]);

  return IncomingSharesAccordionPanel;
}(Object(mixins["default"])(incomingSharesAccordionPanel_React.Component));

;

// CONCATENATED MODULE: ./js/chat/ui/messages/closeOpenMode.jsx
function closeOpenMode_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { closeOpenMode_typeof = function _typeof(obj) { return typeof obj; }; } else { closeOpenMode_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return closeOpenMode_typeof(obj); }

function closeOpenMode_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function closeOpenMode_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function closeOpenMode_createClass(Constructor, protoProps, staticProps) { if (protoProps) closeOpenMode_defineProperties(Constructor.prototype, protoProps); if (staticProps) closeOpenMode_defineProperties(Constructor, staticProps); return Constructor; }

function closeOpenMode_possibleConstructorReturn(self, call) { if (call && (closeOpenMode_typeof(call) === "object" || typeof call === "function")) { return call; } return closeOpenMode_assertThisInitialized(self); }

function closeOpenMode_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function closeOpenMode_getPrototypeOf(o) { closeOpenMode_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return closeOpenMode_getPrototypeOf(o); }

function closeOpenMode_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) closeOpenMode_setPrototypeOf(subClass, superClass); }

function closeOpenMode_setPrototypeOf(o, p) { closeOpenMode_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return closeOpenMode_setPrototypeOf(o, p); }

var closeOpenMode_React = __webpack_require__(0);

var closeOpenMode_ReactDOM = __webpack_require__(4);

var closeOpenMode_utils = __webpack_require__(3);



var closeOpenMode_ContactsUI = __webpack_require__(2);

var closeOpenMode_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var closeOpenMode_getMessageString = __webpack_require__(10).getMessageString;

var CloseOpenModeMessage =
/*#__PURE__*/
function (_ConversationMessageM) {
  closeOpenMode_inherits(CloseOpenModeMessage, _ConversationMessageM);

  function CloseOpenModeMessage() {
    closeOpenMode_classCallCheck(this, CloseOpenModeMessage);

    return closeOpenMode_possibleConstructorReturn(this, closeOpenMode_getPrototypeOf(CloseOpenModeMessage).apply(this, arguments));
  }

  closeOpenMode_createClass(CloseOpenModeMessage, [{
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = closeOpenMode_React.makeElement("div", {
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
        avatar = closeOpenMode_React.makeElement(closeOpenMode_ContactsUI.Avatar, {
          contact: contact,
          className: "message  avatar-wrapper small-rounded-avatar"
        });
        datetime = closeOpenMode_React.makeElement("div", {
          className: "message date-time",
          title: time2date(timestampInt)
        }, timestamp);
      }

      return closeOpenMode_React.makeElement("div", {
        className: cssClasses,
        "data-id": "id" + message.messageId,
        key: message.messageId
      }, avatar, closeOpenMode_React.makeElement("div", {
        className: "message content-area small-info-txt"
      }, closeOpenMode_React.makeElement("div", {
        className: "message user-card-name"
      }, displayName), datetime, closeOpenMode_React.makeElement("div", {
        className: "message text-block"
      }, __('switched off chat open mode.'))));
    }
  }]);

  return CloseOpenModeMessage;
}(closeOpenMode_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/messages/chatHandle.jsx
function chatHandle_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { chatHandle_typeof = function _typeof(obj) { return typeof obj; }; } else { chatHandle_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return chatHandle_typeof(obj); }

function chatHandle_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function chatHandle_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function chatHandle_createClass(Constructor, protoProps, staticProps) { if (protoProps) chatHandle_defineProperties(Constructor.prototype, protoProps); if (staticProps) chatHandle_defineProperties(Constructor, staticProps); return Constructor; }

function chatHandle_possibleConstructorReturn(self, call) { if (call && (chatHandle_typeof(call) === "object" || typeof call === "function")) { return call; } return chatHandle_assertThisInitialized(self); }

function chatHandle_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function chatHandle_getPrototypeOf(o) { chatHandle_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return chatHandle_getPrototypeOf(o); }

function chatHandle_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) chatHandle_setPrototypeOf(subClass, superClass); }

function chatHandle_setPrototypeOf(o, p) { chatHandle_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return chatHandle_setPrototypeOf(o, p); }

var chatHandle_React = __webpack_require__(0);

var chatHandle_ReactDOM = __webpack_require__(4);

var chatHandle_utils = __webpack_require__(3);

var chatHandle_ContactsUI = __webpack_require__(2);

var chatHandle_ConversationMessageMixin = __webpack_require__(8).ConversationMessageMixin;

var chatHandle_getMessageString = __webpack_require__(10).getMessageString;

var ChatHandleMessage =
/*#__PURE__*/
function (_ConversationMessageM) {
  chatHandle_inherits(ChatHandleMessage, _ConversationMessageM);

  function ChatHandleMessage() {
    chatHandle_classCallCheck(this, ChatHandleMessage);

    return chatHandle_possibleConstructorReturn(this, chatHandle_getPrototypeOf(ChatHandleMessage).apply(this, arguments));
  }

  chatHandle_createClass(ChatHandleMessage, [{
    key: "render",
    value: function render() {
      var self = this;
      var cssClasses = "message body";
      var message = this.props.message;
      var megaChat = this.props.message.chatRoom.megaChat;
      var chatRoom = this.props.message.chatRoom;
      var contact = self.getContact();
      var timestampInt = self.getTimestamp();
      var timestamp = self.getTimestampAsString();
      var datetime = chatHandle_React.makeElement("div", {
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
        avatar = chatHandle_React.makeElement(chatHandle_ContactsUI.Avatar, {
          contact: contact,
          className: "message  avatar-wrapper small-rounded-avatar"
        });
        datetime = chatHandle_React.makeElement("div", {
          className: "message date-time",
          title: time2date(timestampInt)
        }, timestamp);
      }

      return chatHandle_React.makeElement("div", {
        className: cssClasses,
        "data-id": "id" + message.messageId,
        key: message.messageId
      }, avatar, chatHandle_React.makeElement("div", {
        className: "message content-area small-info-txt"
      }, chatHandle_React.makeElement("div", {
        className: "message user-card-name"
      }, displayName), datetime, chatHandle_React.makeElement("div", {
        className: "message text-block"
      }, message.meta.handleUpdate === 1 ? l[20570] : l[20571])));
    }
  }]);

  return ChatHandleMessage;
}(chatHandle_ConversationMessageMixin);

;

// CONCATENATED MODULE: ./js/chat/ui/chatlinkDialog.jsx
function chatlinkDialog_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { chatlinkDialog_typeof = function _typeof(obj) { return typeof obj; }; } else { chatlinkDialog_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return chatlinkDialog_typeof(obj); }

function chatlinkDialog_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function chatlinkDialog_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function chatlinkDialog_createClass(Constructor, protoProps, staticProps) { if (protoProps) chatlinkDialog_defineProperties(Constructor.prototype, protoProps); if (staticProps) chatlinkDialog_defineProperties(Constructor, staticProps); return Constructor; }

function chatlinkDialog_possibleConstructorReturn(self, call) { if (call && (chatlinkDialog_typeof(call) === "object" || typeof call === "function")) { return call; } return chatlinkDialog_assertThisInitialized(self); }

function chatlinkDialog_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function chatlinkDialog_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { chatlinkDialog_get = Reflect.get; } else { chatlinkDialog_get = function _get(target, property, receiver) { var base = chatlinkDialog_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return chatlinkDialog_get(target, property, receiver || target); }

function chatlinkDialog_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = chatlinkDialog_getPrototypeOf(object); if (object === null) break; } return object; }

function chatlinkDialog_getPrototypeOf(o) { chatlinkDialog_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return chatlinkDialog_getPrototypeOf(o); }

function chatlinkDialog_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) chatlinkDialog_setPrototypeOf(subClass, superClass); }

function chatlinkDialog_setPrototypeOf(o, p) { chatlinkDialog_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return chatlinkDialog_setPrototypeOf(o, p); }






var chatlinkDialog_ChatlinkDialog =
/*#__PURE__*/
function (_MegaRenderMixin) {
  chatlinkDialog_inherits(ChatlinkDialog, _MegaRenderMixin);

  function ChatlinkDialog(props) {
    var _this;

    chatlinkDialog_classCallCheck(this, ChatlinkDialog);

    _this = chatlinkDialog_possibleConstructorReturn(this, chatlinkDialog_getPrototypeOf(ChatlinkDialog).call(this, props));
    _this.state = {
      'link': l[5533],
      newTopic: ''
    };
    _this.onPopupDidMount = _this.onPopupDidMount.bind(chatlinkDialog_assertThisInitialized(_this));
    _this.onClose = _this.onClose.bind(chatlinkDialog_assertThisInitialized(_this));
    _this.onTopicFieldChanged = _this.onTopicFieldChanged.bind(chatlinkDialog_assertThisInitialized(_this));
    _this.onTopicFieldKeyPress = _this.onTopicFieldKeyPress.bind(chatlinkDialog_assertThisInitialized(_this));
    return _this;
  }

  chatlinkDialog_createClass(ChatlinkDialog, [{
    key: "onPopupDidMount",
    value: function onPopupDidMount($node) {
      this.$popupNode = $node;
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;
      $.dialog = "group-chat-link";
      self.retrieveChatLink();
    }
  }, {
    key: "retrieveChatLink",
    value: function retrieveChatLink() {
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
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      chatlinkDialog_get(chatlinkDialog_getPrototypeOf(ChatlinkDialog.prototype), "componentWillUnmount", this).call(this);

      if ($.dialog === "group-chat-link") {
        closeDialog();
      }
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;
      var chatRoom = this.props.chatRoom;

      if (!this.loading && chatRoom.topic) {
        this.retrieveChatLink();
      } // Setup toast notification


      this.toastTxt = l[7654];

      if (!this.$popupNode) {
        return;
      }

      var $node = this.$popupNode;
      var $copyButton = $('.copy-to-clipboard', $node);
      $copyButton.rebind('click', function () {
        copyToClipboard(self.state.link, self.toastTxt);
        return false;
      }); // Setup the copy to clipboard buttons

      $('span', $copyButton).text(l[1990]);
    }
  }, {
    key: "onClose",
    value: function onClose() {
      if (this.props.onClose) {
        this.props.onClose();
      }
    }
  }, {
    key: "onTopicFieldChanged",
    value: function onTopicFieldChanged(e) {
      this.setState({
        'newTopic': e.target.value
      });
    }
  }, {
    key: "onTopicFieldKeyPress",
    value: function onTopicFieldKeyPress(e) {
      var self = this;

      if (e.which === 13) {
        self.props.chatRoom.setRoomTitle(self.state.newTopic);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var closeButton = external_React_default.a.createElement("div", {
        key: "close",
        className: "default-red-button right links-button",
        onClick: function onClick(e) {
          self.onClose();
        }
      }, external_React_default.a.createElement("span", null, l[148]));
      return external_React_default.a.createElement(modalDialogs["a" /* default */].ModalDialog, {
        title: self.props.chatRoom.iAmOperator() && !self.props.chatRoom.topic ? l[9080] : "",
        className: "fm-dialog chat-rename-dialog export-chat-links-dialog group-chat-link" + (!self.props.chatRoom.topic ? " requires-topic" : ""),
        onClose: function onClose() {
          self.onClose(self);
        },
        chatRoom: self.props.chatRoom,
        popupDidMount: self.onPopupDidMount
      }, external_React_default.a.createElement("div", {
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
        onClick: function onClick(e) {
          self.props.chatRoom.updatePublicHandle(1);
          self.onClose();
        }
      }, external_React_default.a.createElement("span", null, l[20487])) : null, self.props.chatRoom.topic ? self.props.chatRoom.publicLink ? external_React_default.a.createElement("div", {
        className: "default-green-button button right copy-to-clipboard" + (self.loading && self.loading.state() === 'pending' ? " disabled" : "")
      }, external_React_default.a.createElement("span", null, l[63])) : closeButton : self.props.chatRoom.iAmOperator() ? external_React_default.a.createElement("div", {
        key: "setTopic",
        className: "default-red-button right links-button" + (self.state.newTopic && $.trim(self.state.newTopic) ? "" : " disabled"),
        onClick: function onClick(e) {
          if (self.props.chatRoom.iAmOperator()) {
            self.props.chatRoom.setRoomTitle(self.state.newTopic);
          }
        }
      }, external_React_default.a.createElement("span", null, l[20615])) : closeButton, external_React_default.a.createElement("div", {
        className: "clear"
      })));
    }
  }]);

  return ChatlinkDialog;
}(Object(mixins["default"])(external_React_default.a.Component));

chatlinkDialog_ChatlinkDialog.defaultProps = {
  'requiresUpdateOnResize': true,
  'disableCheckingVisibility': true
};
;

// CONCATENATED MODULE: ./js/chat/ui/conversationaudiovideopanel.jsx
function conversationaudiovideopanel_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { conversationaudiovideopanel_typeof = function _typeof(obj) { return typeof obj; }; } else { conversationaudiovideopanel_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return conversationaudiovideopanel_typeof(obj); }

function conversationaudiovideopanel_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function conversationaudiovideopanel_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function conversationaudiovideopanel_createClass(Constructor, protoProps, staticProps) { if (protoProps) conversationaudiovideopanel_defineProperties(Constructor.prototype, protoProps); if (staticProps) conversationaudiovideopanel_defineProperties(Constructor, staticProps); return Constructor; }

function conversationaudiovideopanel_possibleConstructorReturn(self, call) { if (call && (conversationaudiovideopanel_typeof(call) === "object" || typeof call === "function")) { return call; } return conversationaudiovideopanel_assertThisInitialized(self); }

function conversationaudiovideopanel_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function conversationaudiovideopanel_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { conversationaudiovideopanel_get = Reflect.get; } else { conversationaudiovideopanel_get = function _get(target, property, receiver) { var base = conversationaudiovideopanel_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return conversationaudiovideopanel_get(target, property, receiver || target); }

function conversationaudiovideopanel_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = conversationaudiovideopanel_getPrototypeOf(object); if (object === null) break; } return object; }

function conversationaudiovideopanel_getPrototypeOf(o) { conversationaudiovideopanel_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return conversationaudiovideopanel_getPrototypeOf(o); }

function conversationaudiovideopanel_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) conversationaudiovideopanel_setPrototypeOf(subClass, superClass); }

function conversationaudiovideopanel_setPrototypeOf(o, p) { conversationaudiovideopanel_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return conversationaudiovideopanel_setPrototypeOf(o, p); }






var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1; // 7+1 for myself  = 8

var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;
var VIEW_MODES = {
  "GRID": 1,
  "CAROUSEL": 2
};

var conversationaudiovideopanel_ConversationAudioVideoPanel =
/*#__PURE__*/
function (_MegaRenderMixin) {
  conversationaudiovideopanel_inherits(ConversationAudioVideoPanel, _MegaRenderMixin);

  function ConversationAudioVideoPanel(props) {
    var _this;

    conversationaudiovideopanel_classCallCheck(this, ConversationAudioVideoPanel);

    _this = conversationaudiovideopanel_possibleConstructorReturn(this, conversationaudiovideopanel_getPrototypeOf(ConversationAudioVideoPanel).call(this, props));
    _this.state = {
      'messagesBlockEnabled': false,
      'fullScreenModeEnabled': false,
      'localMediaDisplay': true,
      'viewMode': VIEW_MODES.GRID,
      'selectedStreamSid': false
    };
    return _this;
  }

  conversationaudiovideopanel_createClass(ConversationAudioVideoPanel, [{
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate() {
      if (this.state.fullScreenModeEnabled) {
        return true;
      }
    }
  }, {
    key: "getCurrentStreamId",
    value: function getCurrentStreamId() {
      var self = this;
      var chatRoom = self.props.chatRoom;

      if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
        return;
      }

      var streams = chatRoom.callManagerCall._streams;
      var activeStream = self.state.selectedStreamSid || Object.keys(streams)[0];
      return activeStream;
    }
  }, {
    key: "getViewMode",
    value: function getViewMode() {
      var chatRoom = this.props.chatRoom;
      var callManagerCall = chatRoom.callManagerCall;

      if (callManagerCall) {
        var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;

        if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
          return VIEW_MODES.CAROUSEL;
        }
      }

      if (chatRoom.type === "private") {
        return VIEW_MODES.GRID;
      }

      var streamKeys = Object.keys(callManagerCall._streams);

      for (var i = 0; i < streamKeys.length; i++) {
        var sid = streamKeys[i];

        if (callManagerCall.getRemoteMediaOptions(sid.split(":")[2]).screen) {
          return VIEW_MODES.CAROUSEL;
        }
      }

      return this.state.viewMode;
    }
  }, {
    key: "onPlayerClick",
    value: function onPlayerClick(sid) {
      if (this.getViewMode() === VIEW_MODES.CAROUSEL) {
        this.setState({
          'selectedStreamSid': sid
        });
      }
    }
  }, {
    key: "_hideBottomPanel",
    value: function _hideBottomPanel() {
      var self = this;
      var room = self.props.chatRoom;

      if (!room.callManagerCall || !room.callManagerCall.isActive()) {
        return;
      }

      var $container = $(external_ReactDOM_default.a.findDOMNode(self));
      self.visiblePanel = false;
      $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container).removeClass('visible-panel');
    }
  }, {
    key: "getRemoteSid",
    value: function getRemoteSid(sid) {
      var fullSid = sid || this.state.selectedStreamSid;

      if (!fullSid) {
        return false;
      }

      var sid = fullSid.split(":")[2];

      if (!sid) {
        return false;
      }

      return sid;
    }
  }, {
    key: "resizeVideos",
    value: function resizeVideos() {
      var self = this;
      var chatRoom = self.props.chatRoom;

      if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
        return;
      }

      if (chatRoom.type === "private") {
        return;
      }

      var $container = $(external_ReactDOM_default.a.findDOMNode(self));
      var totalWidth = $container.outerWidth();

      if (totalWidth > $('.participantsContainer', $container).parent().outerWidth()) {
        // chrome zoom bug
        totalWidth = $('.participantsContainer', $container).parent().outerWidth();
      }

      if (ua.details.browser === "Safari") {
        // for some reason, Safari adds 1px to the totalWidth
        totalWidth -= 1;
      }

      var $streams = $('.user-video, .user-audio', $container);
      var totalStreams = $streams.length;

      if (totalStreams === 1) {
        totalWidth = Math.min(totalWidth, $container.outerHeight() - $('.call-header', $container).outerHeight());
      }

      var newWidth;

      if (self.getViewMode() === VIEW_MODES.CAROUSEL) {
        $('.participantsContainer', $container).height('auto');
        var activeStreamHeight = $container.outerHeight() - $('.call-header').outerHeight() - $('.participantsContainer', $container).outerHeight();
        var callManagerCall = chatRoom.callManagerCall;
        var mediaOpts;

        if (this.state.selectedStreamSid === "local") {
          mediaOpts = callManagerCall.getMediaOptions();
        } else {
          mediaOpts = callManagerCall.getRemoteMediaOptions(self.getRemoteSid());
        }

        var audioIsMuted = mediaOpts.audio;
        $('.activeStream', $container).height(activeStreamHeight);
        $('.activeStream .user-audio .avatar-wrapper', $container).width(activeStreamHeight - 20).height(activeStreamHeight - 20).css('font-size', 100 / 240 * activeStreamHeight + "px");
        $('.user-video, .user-audio, .user-video video', $container).width('').height('');
        var $video;
        var $mutedIcon;
        $video = $('.activeStream video', $container);
        $mutedIcon = $('.activeStream .icon-audio-muted', $container);

        if ($video.length > 0 && $mutedIcon.length > 0) {
          if ($video.outerHeight() > 0 && $video[0].videoWidth > 0 && $video[0].videoHeight > 0) {
            var actualWidth = Math.min($video.outerWidth(), $video[0].videoWidth / $video[0].videoHeight * $video.outerHeight());

            if (!audioIsMuted) {
              $mutedIcon.removeClass('hidden');
            } else {
              $mutedIcon.addClass('hidden');
            }

            $mutedIcon.css({
              'right': 'auto',
              'top': 24 + 8,
              'left': $video.outerWidth() / 2 + actualWidth / 2 - $mutedIcon.outerWidth() - 24
            });
          } else {
            $video.one('loadeddata.cav loadedmetadata.cav', function () {
              self.resizeVideos();
            }); // hide while video is loading, since a flickering may happen of the icon

            $mutedIcon.addClass('hidden');
          }
        }
      } else {
        $('.participantsContainer', $container).height($container.outerHeight() - $('.call-header', $container).outerHeight());
        newWidth = totalWidth / totalStreams;
      }

      var $resizables = $('.user-video, .user-audio', $('.participantsContainer', $container));
      $resizables.width(newWidth);
      $resizables.each(function (i, elem) {
        var $elem = $(elem);
        $('video', elem).width(newWidth).height(newWidth);
        $elem.width(newWidth).height(newWidth);
      });
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      conversationaudiovideopanel_get(conversationaudiovideopanel_getPrototypeOf(ConversationAudioVideoPanel.prototype), "componentDidMount", this).call(this);

      this.resizeVideos();
      this.initialRender = false;
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var self = this;
      var room = self.props.chatRoom;

      if (!room.callManagerCall || !room.callManagerCall.isActive()) {
        return;
      }

      var $container = $(external_ReactDOM_default.a.findDOMNode(self));
      var mouseoutThrottling = null;
      $container.rebind('mouseover.chatUI' + self.props.chatRoom.roomId, function () {
        var $this = $(this);
        clearTimeout(mouseoutThrottling);
        self.visiblePanel = true;
        $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container).addClass('visible-panel');

        if ($this.hasClass('full-sized-block')) {
          $('.call.top-panel', $container).addClass('visible-panel');
        }
      });
      $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomId, function () {
        var $this = $(this);
        clearTimeout(mouseoutThrottling);
        mouseoutThrottling = setTimeout(function () {
          self.visiblePanel = false;

          self._hideBottomPanel();

          $('.call.top-panel', $container).removeClass('visible-panel');
        }, 500);
      }); // Hidding Control panel if cursor is idle

      var idleMouseTimer;
      var forceMouseHide = false;
      $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomId, function (ev) {
        var $this = $(this);

        if (self._bottomPanelMouseOver) {
          return;
        }

        clearTimeout(idleMouseTimer);

        if (!forceMouseHide) {
          self.visiblePanel = true;
          $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
          $container.removeClass('no-cursor');

          if ($this.hasClass('full-sized-block')) {
            $('.call.top-panel', $container).addClass('visible-panel');
          }

          idleMouseTimer = setTimeout(function () {
            self.visiblePanel = false;

            self._hideBottomPanel();

            $container.addClass('no-cursor');
            $('.call.top-panel', $container).removeClass('visible-panel');
            forceMouseHide = true;
            setTimeout(function () {
              forceMouseHide = false;
            }, 400);
          }, 2000);
        }
      });
      $('.call.bottom-panel', $container).rebind('mouseenter.chatUI' + self.props.chatRoom.roomId, function (ev) {
        self._bottomPanelMouseOver = true;
        clearTimeout(idleMouseTimer);
      });
      $('.call.bottom-panel', $container).rebind('mouseleave.chatUI' + self.props.chatRoom.roomId, function (ev) {
        self._bottomPanelMouseOver = false;
        idleMouseTimer = setTimeout(function () {
          self.visiblePanel = false;

          self._hideBottomPanel();

          $container.addClass('no-cursor');
          $('.call.top-panel', $container).removeClass('visible-panel');
          forceMouseHide = true;
          setTimeout(function () {
            forceMouseHide = false;
          }, 400);
        }, 2000);
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

          var right = Math.max(0, $container.outerWidth() - ui.position.left);
          var bottom = Math.max(0, $container.outerHeight() - ui.position.top); // contain in the $container

          right = Math.min(right, $container.outerWidth() - 8);
          bottom = Math.min(bottom, $container.outerHeight() - 8);
          right = right - ui.helper.outerWidth();
          bottom = bottom - ui.helper.outerHeight();
          var minBottom = $(this).is(".minimized") ? 48 : 8;

          if (bottom < minBottom) {
            bottom = minBottom;
            $(this).addClass('bottom-aligned');
          } else {
            $(this).removeClass('bottom-aligned');
          }

          if (right < 8) {
            right = 8;
            $(this).addClass('right-aligned');
          } else {
            $(this).removeClass('right-aligned');
          }

          ui.offset = {
            left: 'auto',
            top: 'auto',
            right: right,
            bottom: bottom,
            height: "",
            width: ""
          };
          ui.position.left = 'auto';
          ui.position.top = 'auto';
          ui.helper.css(ui.offset);
          $(this).css(ui.offset);
        }
      }); // REposition the $localMediaDisplay if its OUT of the viewport (in case of dragging -> going back to normal
      // size mode from full screen...)

      $(window).rebind('resize.chatUI_' + room.roomId, function (e) {
        if ($container.is(":visible")) {
          if (!elementInViewport($localMediaDisplay[0])) {
            $localMediaDisplay.addClass('right-aligned').addClass('bottom-aligned').css({
              'right': 8,
              'bottom': 8
            });
          }
        }

        self.resizePanes();
        self.resizeVideos();
      });
      (self.remoteVideoRefs || []).forEach(function (remoteVideo) {
        if (remoteVideo && remoteVideo.src === "" && remoteVideo.currentTime === 0 && !remoteVideo.srcObject) {
          var stream = room.callManagerCall._streams[remoteVideo.id.split("remotevideo_")[1]];

          RTC.attachMediaStream(remoteVideo, stream); // attachMediaStream would do the .play call
        }
      });
      var localStream = room.callManagerCall.localStream();

      if (localStream && self.refs.localViewport && self.refs.localViewport.src === "" && self.refs.localViewport.currentTime === 0 && !self.refs.localViewport.srcObject) {
        RTC.attachMediaStream(self.refs.localViewport, localStream); // attachMediaStream would do the .play call
      }

      var bigLocalViewport = $('.bigLocalViewport')[0];
      var smallLocalViewport = $('.smallLocalViewport')[0];

      if (smallLocalViewport && bigLocalViewport && !bigLocalViewport.src && !bigLocalViewport.srcObject && localStream && bigLocalViewport && bigLocalViewport.src === "" && bigLocalViewport.currentTime === 0) {
        RTC.attachMediaStream(bigLocalViewport, localStream);
      }

      $(room).rebind('toggleMessages.av', function () {
        self.toggleMessages();
      });
      room.messagesBlockEnabled = self.state.messagesBlockEnabled;
      var self = this;
      this.props.chatRoom.callManagerCall.rebind('onAudioLevelChange.ui', function (e, sid, level) {
        var elm = $(".stream" + sid.replace(/:/g, "_"));

        if (elm.length === 0) {
          return;
        }

        if (level > 10) {
          $('.avatar-wrapper', elm).css({
            'box-shadow': '0px 0px 0px 3px rgba(255, 255, 255, ' + Math.min(0.90, level / 100) + ')'
          });
        } else {
          $('.avatar-wrapper', elm).css({
            'box-shadow': '0px 0px 0px 0px rgba(255, 255, 255, 0)'
          });
        }
      });
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

      if (self.initialRender === false && external_ReactDOM_default.a.findDOMNode(self)) {
        self.bindInitialEvents();
      }

      self.resizePanes();
      self.resizeVideos();
    }
  }, {
    key: "resizePanes",
    value: function resizePanes() {
      var self = this;
      var $container = $(self.findDOMNode());
      var $rootContainer = $container.parents('.conversation-panel');

      if (!self.state.messagesBlockEnabled && self.props.chatRoom.callManagerCall) {
        $('.call-block', $rootContainer).height('');
      }

      $rootContainer.trigger('resized');
    }
  }, {
    key: "bindInitialEvents",
    value: function bindInitialEvents() {
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
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      conversationaudiovideopanel_get(conversationaudiovideopanel_getPrototypeOf(ConversationAudioVideoPanel.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var room = self.props.chatRoom;
      var $container = $(external_ReactDOM_default.a.findDOMNode(self));

      if ($container) {
        $container.off('mouseover.chatUI' + self.props.chatRoom.roomId);
        $container.off('mouseout.chatUI' + self.props.chatRoom.roomId);
        $container.off('mousemove.chatUI' + self.props.chatRoom.roomId);
      }

      $(document).off("fullscreenchange.megaChat_" + room.roomId);
      $(window).off('resize.chatUI_' + room.roomId);
      $(room).off('toggleMessages.av');
      var $rootContainer = $container.parents('.conversation-panel');
      $('.call-block', $rootContainer).height('');
      self.initialRender = false;
    }
  }, {
    key: "toggleMessages",
    value: function toggleMessages(e) {
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
      }

      this.setState({
        'messagesBlockEnabled': !this.state.messagesBlockEnabled
      });

      if (this.state.messagesBlockEnabled === false) {
        Soon(function () {
          $(window).trigger('resize');
        });
      }
    }
  }, {
    key: "fullScreenModeToggle",
    value: function fullScreenModeToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      var newVal = !this.state.fullScreenModeEnabled;
      $(document).fullScreen(newVal);
      this.setState({
        'fullScreenModeEnabled': newVal,
        'messagesBlockEnabled': newVal === true ? false : this.state.messagesBlockEnabled
      });
    }
  }, {
    key: "toggleLocalVideoDisplay",
    value: function toggleLocalVideoDisplay(e) {
      e.preventDefault();
      e.stopPropagation();
      var $container = $(external_ReactDOM_default.a.findDOMNode(this));
      var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
      $localMediaDisplay.addClass('right-aligned').addClass('bottom-aligned').css({
        'width': '',
        'height': '',
        'right': 8,
        'bottom': !this.state.localMediaDisplay === true ? 8 : 8
      });
      this.setState({
        localMediaDisplay: !this.state.localMediaDisplay
      });
    }
  }, {
    key: "render",
    value: function render() {
      var chatRoom = this.props.chatRoom;
      this.remoteVideoRefs = this.remoteVideoRefs || [];
      var self = this;

      if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isStarted()) {
        self.initialRender = false;
        return null;
      }

      var participants = chatRoom.getParticipantsExceptMe();
      var displayNames = [];
      participants.forEach(function (v) {
        displayNames.push(htmlentities(M.getNameByHandle(v)));
      });
      var callManagerCall = chatRoom.callManagerCall;
      var remoteCamEnabled = null;

      if (callManagerCall.getRemoteMediaOptions().video) {
        remoteCamEnabled = external_React_default.a.createElement("i", {
          className: "small-icon blue-videocam"
        });
      }

      var localPlayerElement = null;
      var remotePlayerElement = null;
      var activeStreamIdOrPlayer = (chatRoom.type === "group" || chatRoom.type === "public") && self.getViewMode() === VIEW_MODES.CAROUSEL ? self.getCurrentStreamId() : false;
      var visiblePanelClass = "";
      var localPlayerStream = callManagerCall.localStream();

      if (this.visiblePanel === true) {
        visiblePanelClass += " visible-panel";
      }

      remotePlayerElement = [];
      var realStreams = Object.keys(callManagerCall._streams);
      var streams = [];

      if (!DEBUG_PARTICIPANTS_MULTIPLICATOR) {
        streams = realStreams;
      } else {
        // UI debug mode.
        var initialCount = realStreams.length;

        if (initialCount > 0) {
          for (var i = 0; i < initialCount * DEBUG_PARTICIPANTS_MULTIPLICATOR; i++) {
            streams.push(realStreams[(i || 0) % initialCount]);
          }
        }
      }

      streams.forEach(function (streamId, k) {
        var stream = callManagerCall._streams[streamId];
        var userId = streamId.split(":")[0];
        var clientId = streamId.split(":")[1];
        var sessionId = streamId.split(":")[2];
        var remotePlayerStream = stream;
        var mediaOpts = callManagerCall.getRemoteMediaOptions(sessionId);

        if (!remotePlayerStream || mediaOpts.video === false && mediaOpts.screen === false) {
          // TODO: When rtc is ready
          var contact = M.u[userId];
          var player = external_React_default.a.createElement("div", {
            className: "call user-audio is-avatar " + (activeStreamIdOrPlayer === streamId ? "active" : "") + " stream" + streamId.replace(/:/g, "_"),
            key: streamId + "_" + k,
            onClick: function onClick(e) {
              self.onPlayerClick(streamId);
            }
          }, callManagerCall.peerQuality[streamId] === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default.a.createElement("div", {
            className: "center-avatar-wrapper"
          }, callManagerCall.getRemoteMediaOptions(sessionId).audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement(ui_contacts["Avatar"], {
            contact: contact,
            className: "avatar-wrapper",
            simpletip: contact.name,
            simpletipWrapper: "#call-block",
            simpletipOffset: 8,
            simpletipPosition: "top",
            hideVerifiedBadge: true
          })));

          if (activeStreamIdOrPlayer === streamId) {
            activeStreamIdOrPlayer = player;
          }

          remotePlayerElement.push(player);
        } else {
          player = external_React_default.a.createElement("div", {
            className: "call user-video is-video " + (activeStreamIdOrPlayer === streamId ? "active" : "") + " stream" + streamId.replace(/:/g, "_") + (mediaOpts.screen ? " is-screen" : ""),
            key: streamId + "_" + k,
            onClick: function onClick(e) {
              self.onPlayerClick(streamId);
            }
          }, callManagerCall.peerQuality[streamId] === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, callManagerCall.getRemoteMediaOptions(sessionId).audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement("video", {
            autoPlay: true,
            className: "rmtViewport rmtVideo",
            id: "remotevideo_" + streamId,
            ref: function ref(_ref) {
              if (_ref && self.remoteVideoRefs.indexOf(_ref) === -1) {
                self.remoteVideoRefs.push(_ref);
              }
            }
          }));

          if (activeStreamIdOrPlayer === streamId) {
            activeStreamIdOrPlayer = player;
          }

          remotePlayerElement.push(player);
        }
      });

      if (this.getViewMode() === VIEW_MODES.GRID) {
        if (!localPlayerStream || callManagerCall.getMediaOptions().video === false && callManagerCall.getMediaOptions().screen === false) {
          localPlayerElement = external_React_default.a.createElement("div", {
            className: "call local-audio right-aligned bottom-aligned is-avatar" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass
          }, chatRoom.megaChat.networkQuality === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default.a.createElement("div", {
            className: "default-white-button tiny-button call",
            onClick: this.toggleLocalVideoDisplay.bind(this)
          }, external_React_default.a.createElement("i", {
            className: "tiny-icon grey-minus-icon"
          })), external_React_default.a.createElement("div", {
            className: "center-avatar-wrapper " + (this.state.localMediaDisplay ? "" : "hidden")
          }, callManagerCall.getMediaOptions().audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement(ui_contacts["Avatar"], {
            contact: M.u[u_handle],
            className: "call avatar-wrapper is-avatar " + (this.state.localMediaDisplay ? "" : "hidden"),
            hideVerifiedBadge: true
          })));
        } else {
          localPlayerElement = external_React_default.a.createElement("div", {
            className: "call local-video right-aligned is-video bottom-aligned" + (this.state.localMediaDisplay ? "" : " minimized ") + visiblePanelClass + (activeStreamIdOrPlayer === "local" ? " active " : "") + (callManagerCall.getMediaOptions().screen ? " is-screen" : "")
          }, chatRoom.megaChat.networkQuality === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default.a.createElement("div", {
            className: "default-white-button tiny-button call",
            onClick: this.toggleLocalVideoDisplay.bind(this)
          }, external_React_default.a.createElement("i", {
            className: "tiny-icon grey-minus-icon"
          })), callManagerCall.getMediaOptions().audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement("video", {
            ref: "localViewport",
            className: "localViewport",
            defaultmuted: "true",
            muted: true,
            volume: 0,
            id: "localvideo_" + callManagerCall.id,
            style: {
              display: !this.state.localMediaDisplay ? "none" : ""
            }
          }));
        }
      } else {
        // carousel
        var localPlayer;

        if (!localPlayerStream || callManagerCall.getMediaOptions().video === false && callManagerCall.getMediaOptions().screen === false) {
          localPlayer = external_React_default.a.createElement("div", {
            className: "call user-audio local-carousel is-avatar" + (activeStreamIdOrPlayer === "local" ? " active " : ""),
            key: "local",
            onClick: function onClick(e) {
              self.onPlayerClick("local");
            }
          }, chatRoom.megaChat.networkQuality === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, external_React_default.a.createElement("div", {
            className: "center-avatar-wrapper"
          }, callManagerCall.getMediaOptions().audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement(ui_contacts["Avatar"], {
            contact: M.u[u_handle],
            className: "call avatar-wrapper",
            hideVerifiedBadge: true
          })));
          remotePlayerElement.push(localPlayer);

          if (activeStreamIdOrPlayer === "local") {
            activeStreamIdOrPlayer = localPlayer;
          }
        } else {
          localPlayer = external_React_default.a.createElement("div", {
            className: "call user-video local-carousel is-video" + (activeStreamIdOrPlayer === "local" ? " active " : "") + (callManagerCall.getMediaOptions().screen ? " is-screen" : ""),
            key: "local-video",
            onClick: function onClick(e) {
              self.onPlayerClick("local");
            }
          }, chatRoom.megaChat.networkQuality === 0 ? external_React_default.a.createElement("div", {
            className: "icon-connection-issues"
          }) : null, callManagerCall.getMediaOptions().audio === false ? external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted"
          }) : external_React_default.a.createElement("div", {
            className: "small-icon icon-audio-muted hidden"
          }), external_React_default.a.createElement("video", {
            ref: "localViewport",
            className: "localViewport smallLocalViewport",
            defaultmuted: "true",
            muted: true,
            volume: 0,
            id: "localvideo_" + callManagerCall.id
          }));
          remotePlayerElement.push(localPlayer);

          if (activeStreamIdOrPlayer === "local") {
            activeStreamIdOrPlayer = external_React_default.a.createElement("div", {
              className: "call user-video is-video local-carousel local-carousel-big " + (callManagerCall.getMediaOptions().screen ? " is-screen" : ""),
              key: "local-video2"
            }, chatRoom.megaChat.networkQuality === 0 ? external_React_default.a.createElement("div", {
              className: "icon-connection-issues"
            }) : null, callManagerCall.getMediaOptions().audio === false ? external_React_default.a.createElement("div", {
              className: "small-icon icon-audio-muted"
            }) : external_React_default.a.createElement("div", {
              className: "small-icon icon-audio-muted hidden"
            }), external_React_default.a.createElement("video", {
              className: "localViewport bigLocalViewport",
              defaultmuted: "true",
              muted: true,
              volume: 0,
              id: "localvideo_big_" + callManagerCall.id
            }));
          }
        }
      }

      var unreadDiv = null;
      var unreadCount = chatRoom.messagesBuff.getUnreadCount();

      if (unreadCount > 0) {
        unreadDiv = external_React_default.a.createElement("div", {
          className: "unread-messages"
        }, unreadCount > 9 ? "9+" : unreadCount);
      }

      var additionalClass = "";
      additionalClass = this.state.fullScreenModeEnabled === true ? " full-sized-block" : "";

      if (additionalClass.length === 0) {
        additionalClass = this.state.messagesBlockEnabled === true ? " small-block" : "";
      }

      var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;
      additionalClass += " participants-count-" + participantsCount;
      var header = null;
      var videoSessionCount = 0;

      if (chatRoom.callManagerCall && chatRoom.callManagerCall.getCurrentVideoSlotsUsed) {
        videoSessionCount = chatRoom.callManagerCall.getCurrentVideoSlotsUsed();
      }

      if (chatRoom.type === "group" || chatRoom.type === "public") {
        var haveScreenShare = false;
        var streamKeys = Object.keys(callManagerCall._streams);

        for (var x = 0; x < streamKeys.length; x++) {
          var sid = streamKeys[x];

          if (callManagerCall.getRemoteMediaOptions(sid.split(":")[2]).screen) {
            haveScreenShare = true;
            break;
          }
        }

        header = external_React_default.a.createElement("div", {
          className: "call-header"
        }, external_React_default.a.createElement("div", {
          className: "call-topic"
        }, external_React_default.a.createElement(utils["default"].EmojiFormattedContent, null, ellipsis(chatRoom.getRoomTitle(), 'end', 70))), external_React_default.a.createElement("div", {
          className: "call-participants-count"
        }, chatRoom.getCallParticipants().length), external_React_default.a.createElement("a", {
          className: "call-switch-view " + (self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel") + (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE || haveScreenShare ? " disabled" : ""),
          onClick: function onClick(e) {
            if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
              return;
            }

            self.setState({
              'selectedStreamSid': false,
              'viewMode': self.getViewMode() === VIEW_MODES.GRID ? VIEW_MODES.CAROUSEL : VIEW_MODES.GRID
            });
          }
        }), external_React_default.a.createElement("div", {
          className: "call-av-counter" + (videoSessionCount >= RtcModule.kMaxCallVideoSenders ? " limit-reached" : "")
        }, videoSessionCount, " / ", RtcModule.kMaxCallVideoSenders), external_React_default.a.createElement("div", {
          className: "call-video-icon" + (chatRoom.callManagerCall.hasVideoSlotLimitReached() ? " call-video-icon-warn" : "")
        }), external_React_default.a.createElement("div", {
          className: "call-header-duration",
          "data-room-id": chatRoom.chatId
        }, secondsToTimeShort(chatRoom._currentCallCounter)));
      }

      var notifBar = null;

      if (chatRoom.type === "group" || chatRoom.type === "public") {
        var notif = chatRoom.callManagerCall.callNotificationsEngine.getCurrentNotification();

        if (!chatRoom.callManagerCall.callNotificationsEngine._bound) {
          chatRoom.callManagerCall.callNotificationsEngine.rebind('onChange.cavp', function () {
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
          chatRoom.callManagerCall.callNotificationsEngine._bound = true;
        }

        if (notif) {
          var title = notif.getTitle();
          notifBar = external_React_default.a.createElement("div", {
            className: "in-call-notif " + notif.getClassName()
          }, title ? title : null);
        }
      }

      var networkQualityBar = null;

      if (chatRoom.megaChat.networkQuality <= 1) {
        var networkQualityMessage = "Slow connection.";
        networkQualityBar = external_React_default.a.createElement("div", {
          className: "in-call-notif yellow" + (notifBar ? " after-green-notif" : "")
        }, networkQualityMessage);
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
        }, remotePlayerElement), localPlayerElement);
      } else {
        players = external_React_default.a.createElement("div", {
          key: "container"
        }, external_React_default.a.createElement("div", {
          className: "activeStream",
          key: "activeStream"
        }, activeStreamIdOrPlayer), external_React_default.a.createElement("div", {
          className: "participantsContainer",
          key: "partsContainer"
        }, remotePlayerElement, localPlayerElement));
      }

      var topPanel = null;

      if (chatRoom.type !== "group") {
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
        additionalClass = additionalClass + " participants-less-4";
      } else if (participantsCount < 8) {
        additionalClass = additionalClass + " participants-less-8";
      } else if (participantsCount < 16) {
        additionalClass = additionalClass + " participants-less-16";
      } else {
        additionalClass = additionalClass + " participants-a-lot";
      }

      var reconnectingDiv = null;

      if (chatRoom.callReconnecting === true) {
        reconnectingDiv = external_React_default.a.createElement("div", {
          className: "callReconnecting"
        }, external_React_default.a.createElement("i", {
          className: "huge-icon crossed-phone"
        }));
      }

      return external_React_default.a.createElement("div", {
        className: "call-block" + additionalClass,
        id: "call-block"
      }, external_React_default.a.createElement("div", {
        className: "av-resize-handler ui-resizable-handle ui-resizable-s " + (this.state.messagesBlockEnabled === true && this.state.fullScreenModeEnabled === false ? "" : "hidden")
      }), header, notifBar, networkQualityBar, players, reconnectingDiv, topPanel, external_React_default.a.createElement("div", {
        className: "call bottom-panel"
      }, external_React_default.a.createElement("div", {
        className: "button call left" + (unreadDiv ? " unread" : ""),
        onClick: this.toggleMessages.bind(this)
      }, unreadDiv, external_React_default.a.createElement("i", {
        className: "big-icon conversations"
      })), external_React_default.a.createElement("div", {
        className: "button call " + (this.state.muteInProgress ? " disabled" : ""),
        onClick: function onClick(e) {
          if (self.state.muteInProgress || $(this).is(".disabled")) {
            return;
          }

          if (callManagerCall.getMediaOptions().audio === true) {
            callManagerCall.muteAudio();
          } else {
            callManagerCall.unmuteAudio();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "big-icon " + (callManagerCall.getMediaOptions().audio ? " microphone" : " crossed-microphone")
      })), external_React_default.a.createElement("div", {
        className: "button call" + (callManagerCall.hasVideoSlotLimitReached() === true && callManagerCall.getMediaOptions().video === false ? " disabled" : "") + (this.state.muteInProgress ? " disabled" : ""),
        onClick: function onClick(e) {
          if (self.state.muteInProgress || $(this).is(".disabled")) {
            return;
          }

          var videoMode = callManagerCall.videoMode();

          if (videoMode === Av.Video) {
            callManagerCall.muteVideo();
          } else {
            callManagerCall.unmuteVideo();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "big-icon " + (callManagerCall.videoMode() === Av.Video ? " videocam" : " crossed-videocam")
      })), external_React_default.a.createElement("div", {
        className: "button call" + (RTC.supportsScreenCapture && chatRoom.callManagerCall && callManagerCall.rtcCall && !this.state.muteInProgress ? "" : " disabled"),
        onClick: function onClick(e) {
          if (chatRoom.callManagerCall) {
            if (callManagerCall.isScreenCaptureEnabled()) {
              callManagerCall.stopScreenCapture();
            } else {
              callManagerCall.startScreenCapture();
            }
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "big-icon " + (callManagerCall.isScreenCaptureEnabled() ? "screenshare" : "crossed-screenshare")
      })), external_React_default.a.createElement("div", {
        className: "button call",
        onClick: function onClick(e) {
          if (chatRoom.callManagerCall) {
            chatRoom.callManagerCall.endCall();
          }
        }
      }, external_React_default.a.createElement("i", {
        className: "big-icon horizontal-red-handset"
      })), external_React_default.a.createElement("div", {
        className: "button call right",
        onClick: this.fullScreenModeToggle.bind(this)
      }, external_React_default.a.createElement("i", {
        className: "big-icon nwse-resize"
      }))));
    }
  }]);

  return ConversationAudioVideoPanel;
}(Object(mixins["default"])(external_React_default.a.Component));

;

// CONCATENATED MODULE: ./js/chat/ui/conversationpanel.jsx
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "JoinCallNotification", function() { return conversationpanel_JoinCallNotification; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConversationRightArea", function() { return conversationpanel_ConversationRightArea; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConversationPanel", function() { return conversationpanel_ConversationPanel; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConversationPanels", function() { return conversationpanel_ConversationPanels; });
var conversationpanel_dec, _dec2, conversationpanel_class, conversationpanel_class2, conversationpanel_temp;

function conversationpanel_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { conversationpanel_typeof = function _typeof(obj) { return typeof obj; }; } else { conversationpanel_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return conversationpanel_typeof(obj); }

function conversationpanel_get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { conversationpanel_get = Reflect.get; } else { conversationpanel_get = function _get(target, property, receiver) { var base = conversationpanel_superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return conversationpanel_get(target, property, receiver || target); }

function conversationpanel_superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = conversationpanel_getPrototypeOf(object); if (object === null) break; } return object; }

function conversationpanel_applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

function conversationpanel_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function conversationpanel_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function conversationpanel_createClass(Constructor, protoProps, staticProps) { if (protoProps) conversationpanel_defineProperties(Constructor.prototype, protoProps); if (staticProps) conversationpanel_defineProperties(Constructor, staticProps); return Constructor; }

function conversationpanel_possibleConstructorReturn(self, call) { if (call && (conversationpanel_typeof(call) === "object" || typeof call === "function")) { return call; } return conversationpanel_assertThisInitialized(self); }

function conversationpanel_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function conversationpanel_getPrototypeOf(o) { conversationpanel_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return conversationpanel_getPrototypeOf(o); }

function conversationpanel_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) conversationpanel_setPrototypeOf(subClass, superClass); }

function conversationpanel_setPrototypeOf(o, p) { conversationpanel_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return conversationpanel_setPrototypeOf(o, p); }



























var ENABLE_GROUP_CALLING_FLAG = true;
var conversationpanel_JoinCallNotification =
/*#__PURE__*/
function (_MegaRenderMixin) {
  conversationpanel_inherits(JoinCallNotification, _MegaRenderMixin);

  function JoinCallNotification() {
    conversationpanel_classCallCheck(this, JoinCallNotification);

    return conversationpanel_possibleConstructorReturn(this, conversationpanel_getPrototypeOf(JoinCallNotification).apply(this, arguments));
  }

  conversationpanel_createClass(JoinCallNotification, [{
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      var $node = $(this.findDOMNode());
      var room = this.props.chatRoom;
      $('a.joinActiveCall', $node).rebind('click.joinCall', function (e) {
        room.joinCall();
        e.preventDefault();
        return false;
      });
    }
  }, {
    key: "render",
    value: function render() {
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
    }
  }]);

  return JoinCallNotification;
}(Object(mixins["default"])(external_React_default.a.Component));
;
var conversationpanel_ConversationRightArea =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  conversationpanel_inherits(ConversationRightArea, _MegaRenderMixin2);

  function ConversationRightArea() {
    conversationpanel_classCallCheck(this, ConversationRightArea);

    return conversationpanel_possibleConstructorReturn(this, conversationpanel_getPrototypeOf(ConversationRightArea).apply(this, arguments));
  }

  conversationpanel_createClass(ConversationRightArea, [{
    key: "componentSpecificIsComponentEventuallyVisible",
    value: function componentSpecificIsComponentEventuallyVisible() {
      return this.props.chatRoom.isCurrentlyActive;
    }
  }, {
    key: "allContactsInChat",
    value: function allContactsInChat(participants) {
      var self = this;

      if (participants.length === 0) {
        return false;
      }

      var currentContacts = M.u;
      var foundNonMembers = 0;
      currentContacts.forEach(function (u, k) {
        if (u.c === 1) {
          if (participants.indexOf(k) === -1) {
            foundNonMembers++;
          }
        }
      });

      if (foundNonMembers > 0) {
        return false;
      } else {
        return true;
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = self.props.chatRoom;

      if (!room || !room.roomId) {
        // destroyed
        return null;
      }

      var contactHandle;
      var contact;
      var contacts = room.getParticipantsExceptMe();

      if (contacts && contacts.length > 0) {
        contactHandle = contacts[0];
        contact = M.u[contactHandle];
      } else {
        contact = {};
      } // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)


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
        if (!ENABLE_GROUP_CALLING_FLAG || room.getCallParticipants().length > 0 && !isInCall) {
          // call is active, but I'm not in
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
      } // console.error(
      //     self.findDOMNode(),
      //     excludedParticipants,
      //         self.allContactsInChat(excludedParticipants),
      //         room.isReadOnly(),
      //         room.iAmOperator(),
      //     myPresence === 'offline'
      // );


      var renameButtonClass = "link-button light " + (room.isReadOnly() || !room.iAmOperator() ? "disabled" : "");
      var participantsList = null;

      if (room.type === "group" || room.type === "public") {
        participantsList = external_React_default.a.createElement("div", null, isReadOnlyElement, external_React_default.a.createElement(participantsList_ParticipantsList, {
          chatRoom: room,
          members: room.members,
          isCurrentlyActive: room.isCurrentlyActive
        }));
      }

      var addParticipantBtn = external_React_default.a.createElement(ui_buttons["Button"], {
        className: "link-button green light",
        icon: "rounded-plus colorized",
        label: __(l[8007]),
        disabled:
        /* Disable in case I don't have any more contacts to add ... */
        !(!self.allContactsInChat(excludedParticipants) && !room.isReadOnly() && room.iAmOperator())
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
        chatRoom: self.props.chatRoom
      }, external_React_default.a.createElement("div", {
        className: "chat-right-pad"
      }, external_React_default.a.createElement(Accordion, {
        onToggle: function onToggle() {
          // wait for animations.
          setTimeout(function () {
            if (self.rightScroll) {
              self.rightScroll.reinitialise();
            }
          }, 250);
        },
        expandedPanel: expandedPanel
      }, participantsList ? external_React_default.a.createElement(AccordionPanel, {
        className: "small-pad",
        title: l[8876],
        key: "participants"
      }, participantsList) : null, room.type === "public" && room.observers > 0 ? external_React_default.a.createElement("div", {
        className: "accordion-text observers"
      }, l[20466], external_React_default.a.createElement("span", {
        className: "observers-count"
      }, external_React_default.a.createElement("i", {
        className: "tiny-icon eye"
      }), room.observers)) : external_React_default.a.createElement("div", null), external_React_default.a.createElement(AccordionPanel, {
        className: "have-animation buttons",
        title: l[7537],
        key: "options"
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
        className: "link-button light",
        onClick: function onClick(e) {
          if ($(e.target).closest('.disabled').length > 0) {
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
      }), external_React_default.a.createElement("span", null, l[148])) : null)), external_React_default.a.createElement(SharedFilesAccordionPanel, {
        key: "sharedFiles",
        title: l[19796] ? l[19796] : "Shared Files",
        chatRoom: room,
        sharedFiles: room.messagesBuff.sharedFiles
      }), room.type === "private" ? external_React_default.a.createElement(IncomingSharesAccordionPanel, {
        key: "incomingShares",
        title: l[5542],
        chatRoom: room
      }) : null))));
    }
  }]);

  return ConversationRightArea;
}(Object(mixins["default"])(external_React_default.a.Component));
conversationpanel_ConversationRightArea.defaultProps = {
  'requiresUpdateOnResize': true
};
var conversationpanel_ConversationPanel = (conversationpanel_dec = utils["default"].SoonFcWrap(150), _dec2 = utils["default"].SoonFcWrap(150), (conversationpanel_class = (conversationpanel_temp = conversationpanel_class2 =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  conversationpanel_inherits(ConversationPanel, _MegaRenderMixin3);

  function ConversationPanel(props) {
    var _this;

    conversationpanel_classCallCheck(this, ConversationPanel);

    _this = conversationpanel_possibleConstructorReturn(this, conversationpanel_getPrototypeOf(ConversationPanel).call(this, props));
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
    _this.handleWindowResize = _this.handleWindowResize.bind(conversationpanel_assertThisInitialized(_this));
    _this.handleKeyDown = _this.handleKeyDown.bind(conversationpanel_assertThisInitialized(_this));
    return _this;
  }

  conversationpanel_createClass(ConversationPanel, [{
    key: "componentSpecificIsComponentEventuallyVisible",
    value: function componentSpecificIsComponentEventuallyVisible() {
      return this.props.chatRoom.isCurrentlyActive;
    }
  }, {
    key: "uploadFromComputer",
    value: function uploadFromComputer() {
      this.props.chatRoom.scrolledToBottom = true;
      this.props.chatRoom.uploadFromComputer();
    }
  }, {
    key: "refreshUI",
    value: function refreshUI() {
      var self = this;
      var room = self.props.chatRoom;

      if (!self.props.chatRoom.isCurrentlyActive) {
        return;
      }

      room.renderContactTree();
      room.megaChat.refreshConversations();
      room.trigger('RefreshUI');
    }
  }, {
    key: "onMouseMove",
    value: function onMouseMove(e) {
      var self = this;
      var chatRoom = self.props.chatRoom;

      if (self.isMounted()) {
        chatRoom.trigger("onChatIsFocused");
      }
    }
  }, {
    key: "handleKeyDown",
    value: function handleKeyDown(e) {
      var self = this;
      var chatRoom = self.props.chatRoom;

      if (self.isMounted() && chatRoom.isActive() && !chatRoom.isReadOnly()) {
        chatRoom.trigger("onChatIsFocused");
      }
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      conversationpanel_get(conversationpanel_getPrototypeOf(ConversationPanel.prototype), "componentDidMount", this).call(this);

      var self = this;
      window.addEventListener('resize', self.handleWindowResize);
      window.addEventListener('keydown', self.handleKeyDown);
      self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function (e, eventData) {
        self.callJustEnded = true;
      });
      self.props.chatRoom.rebind('onSendMessage.scrollToBottom', function (e, eventData) {
        self.props.chatRoom.scrolledToBottom = true;

        if (self.messagesListScrollable) {
          self.messagesListScrollable.scrollToBottom();
        }
      });
      self.props.chatRoom.rebind('openSendFilesDialog.cpanel', function (e) {
        self.setState({
          'attachCloudDialog': true
        });
      });
      self.props.chatRoom.rebind('showGetChatLinkDialog.ui', function (e, eventData) {
        createTimeoutPromise(function () {
          return self.props.chatRoom.topic && self.props.chatRoom.state === ChatRoom.STATE.READY;
        }, 350, 15000).always(function () {
          if (self.props.chatRoom.isActive) {
            self.setState({
              'chatLinkDialog': true
            });
          } else {
            // not visible anymore, proceed w/ generating a link silently.
            self.props.chatRoom.updatePublicHandle();
          }
        });
      });

      if (self.props.chatRoom.type === "private") {
        var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];

        if (M.u[otherContactHash]) {
          M.u[otherContactHash].addChangeListener(function () {
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
    }
  }, {
    key: "eventuallyInit",
    value: function eventuallyInit(doResize) {
      var self = this; // because..JSP would hijack some DOM elements, we need to wait with this...

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
      var droppableConfig = {
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
      };
      self.$messages.droppable(droppableConfig);
      self.lastScrollPosition = null;
      self.props.chatRoom.scrolledToBottom = true;
      self.lastScrollHeight = 0;
      self.lastUpdatedScrollHeight = 0;
      var room = self.props.chatRoom; // collapse on ESC pressed (exited fullscreen)

      $(document).rebind("fullscreenchange.megaChat_" + room.roomId, function () {
        if (!$(document).fullScreen() && room.isCurrentlyActive) {
          self.setState({
            isFullscreenModeEnabled: false
          });
        } else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
          self.setState({
            isFullscreenModeEnabled: true
          });
        }

        self.forceUpdate();
      });

      if (doResize !== false) {
        self.handleWindowResize();
      } // var ns = ".convPanel";
      // $container
      //     .rebind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns, function(e) {
      //         self.safeForceUpdate(true);
      //         $.tresizer();
      //     });

    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var self = this;
      var chatRoom = self.props.chatRoom;
      var megaChat = self.props.chatRoom.megaChat;
      $(chatRoom).rebind('onHistoryDecrypted.cp', function () {
        self.eventuallyUpdate();
      });
      this._messagesBuffChangeHandler = chatRoom.messagesBuff.addChangeListener(function () {
        // wait for scrolling (if such is happening at the moment) to finish
        Soon(function () {
          if (self.isMounted()) {
            $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
          }
        });
      });
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      conversationpanel_get(conversationpanel_getPrototypeOf(ConversationPanel.prototype), "componentWillUnmount", this).call(this);

      var self = this;
      var chatRoom = self.props.chatRoom;
      var megaChat = chatRoom.megaChat;
      chatRoom.messagesBuff.removeChangeListener(this._messagesBuffChangeHandler);
      delete this._messagesBuffChangeHandler;
      window.removeEventListener('resize', self.handleWindowResize);
      window.removeEventListener('keydown', self.handleKeyDown);
      $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate(prevProps, prevState) {
      var self = this;
      var room = this.props.chatRoom;
      self.eventuallyInit(false);
      room.megaChat.updateSectionUnreadCount();
      var $node = $(self.findDOMNode());

      if (self.loadingShown) {
        $('.js-messages-loading', $node).removeClass('hidden');
      } else {
        $('.js-messages-loading', $node).addClass('hidden');
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
        var $typeArea = $('.messages-textarea:visible:first', $node);

        if ($typeArea.length === 1) {
          $typeArea.trigger("focus");
          moveCursortoToEnd($typeArea[0]);
        }
      }

      if (!prevState.renameDialog && self.state.renameDialog === true) {
        var $input = $('.chat-rename-dialog input');

        if ($input && $input[0] && !$($input[0]).is(":focus")) {
          $input.trigger("focus");
          $input[0].selectionStart = 0;
          $input[0].selectionEnd = $input.val().length;
        }
      }

      if (prevState.editing === false && self.state.editing !== false) {
        if (self.messagesListScrollable) {
          self.messagesListScrollable.reinitialise(false); // wait for the reinit...

          Soon(function () {
            if (self.editDomElement && self.editDomElement.length === 1) {
              self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
            }
          });
        }
      }

      if (self.isMounted() && self.$messages && self.isComponentEventuallyVisible()) {
        $(window).rebind('pastedimage.chatRoom', function (e, blob, fileName) {
          if (self.isMounted() && self.$messages && self.isComponentEventuallyVisible()) {
            self.setState({
              'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)]
            });
            e.preventDefault();
          }
        });
      }
    }
  }, {
    key: "handleWindowResize",
    value: function handleWindowResize(e, scrollToBottom) {
      if (!M.chat) {
        return;
      }

      if (!this.isMounted()) {
        // not mounted? remove.
        this.componentWillUnmount();
        return;
      }

      if (!this.props.chatRoom.isCurrentlyActive) {
        return;
      }

      var $container = $(external_ReactDOM_default.a.findDOMNode(this));
      var self = this;
      self.eventuallyInit(false);

      if (!self.isMounted() || !self.$messages || !self.isComponentEventuallyVisible()) {
        return;
      } // Important. Please ensure we have correct height detection for Chat messages block.
      // We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height


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
    }
  }, {
    key: "isActive",
    value: function isActive() {
      return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    }
  }, {
    key: "onMessagesScrollReinitialise",
    value: function onMessagesScrollReinitialise(ps, $elem, forced, scrollPositionYPerc, scrollToElement) {
      var self = this;
      var chatRoom = self.props.chatRoom;
      var mb = chatRoom.messagesBuff; // don't do anything if history is being retrieved at the moment.

      if (self.isRetrievingHistoryViaScrollPull || mb.isRetrievingHistory) {
        return;
      }

      if (forced) {
        if (!scrollPositionYPerc && !scrollToElement) {
          if (self.props.chatRoom.scrolledToBottom && !self.editDomElement) {
            ps.scrollToBottom(true);
            return true;
          }
        } else {
          // don't do anything if the UI was forced to scroll to a specific pos.
          return;
        }
      }

      if (self.isComponentEventuallyVisible()) {
        if (self.props.chatRoom.scrolledToBottom && !self.editDomElement) {
          ps.scrollToBottom(true);
          return true;
        }

        if (self.lastScrollPosition !== ps.getScrollPositionY() && !self.editDomElement) {
          ps.scrollToY(self.lastScrollPosition, true);
          return true;
        }
      }
    }
  }, {
    key: "onMessagesScrollUserScroll",
    value: function onMessagesScrollUserScroll(ps, $elem, e) {
      var self = this;
      var scrollPositionY = ps.getScrollPositionY();
      var isAtTop = ps.isAtTop();
      var isAtBottom = ps.isAtBottom();
      var chatRoom = self.props.chatRoom;
      var mb = chatRoom.messagesBuff;

      if (mb.messages.length === 0) {
        self.props.chatRoom.scrolledToBottom = true;
        return;
      } // console.error(self.getUniqueId(), "is user scroll!");
      // turn on/off auto scroll to bottom.


      if (ps.isCloseToBottom(30) === true) {
        if (!self.props.chatRoom.scrolledToBottom) {
          mb.detachMessages();
        }

        self.props.chatRoom.scrolledToBottom = true;
      } else {
        self.props.chatRoom.scrolledToBottom = false;
      }

      if (isAtTop || ps.getScrollPositionY() < 5 && ps.getScrollHeight() > 500) {
        if (mb.haveMoreHistory() && !self.isRetrievingHistoryViaScrollPull && !mb.isRetrievingHistory) {
          ps.disable();
          self.isRetrievingHistoryViaScrollPull = true;
          self.lastScrollPosition = scrollPositionY;
          self.lastContentHeightBeforeHist = ps.getScrollHeight(); // console.error('start:', self.lastContentHeightBeforeHist, self.lastScrolledToBottom);

          var msgsAppended = 0;
          $(chatRoom).rebind('onMessagesBuffAppend.pull', function () {
            msgsAppended++; // var prevPosY = (
            //     ps.getScrollHeight() - self.lastContentHeightBeforeHist
            // ) + self.lastScrollPosition;
            //
            //
            // ps.scrollToY(
            //     prevPosY,
            //     true
            // );
            //
            // self.lastContentHeightBeforeHist = ps.getScrollHeight();
            // self.lastScrollPosition = prevPosY;
          });
          $(chatRoom).off('onHistoryDecrypted.pull');
          $(chatRoom).one('onHistoryDecrypted.pull', function (e) {
            $(chatRoom).off('onMessagesBuffAppend.pull');
            var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;
            ps.scrollToY(prevPosY, true); // wait for all msgs to be rendered.

            chatRoom.messagesBuff.addChangeListener(function () {
              if (msgsAppended > 0) {
                var prevPosY = ps.getScrollHeight() - self.lastContentHeightBeforeHist + self.lastScrollPosition;
                ps.scrollToY(prevPosY, true);
                self.lastScrollPosition = prevPosY;
              }

              delete self.lastContentHeightBeforeHist;
              setTimeout(function () {
                self.isRetrievingHistoryViaScrollPull = false; // because of mousewheel animation, we would delay the re-enabling of the "pull to load
                // history", so that it won't re-trigger another hist retrieval request

                ps.enable();
                self.forceUpdate();
              }, 1150);
              return 0xDEAD;
            });
          });
          mb.retrieveChatHistory();
        }
      }

      if (self.lastScrollPosition !== ps.getScrollPositionY()) {
        self.lastScrollPosition = ps.getScrollPositionY();
      }
    }
  }, {
    key: "specificShouldComponentUpdate",
    value: function specificShouldComponentUpdate() {
      if (this.isRetrievingHistoryViaScrollPull || this.loadingShown || this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || this.props.chatRoom.messagesBuff.isDecrypting && this.props.chatRoom.messagesBuff.isDecrypting.state() === 'pending' && this.loadingShown || !this.props.chatRoom.isCurrentlyActive) {
        return false;
      } else {
        return undefined;
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      var room = this.props.chatRoom;

      if (!room || !room.roomId) {
        return null;
      } // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)


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

      var privateChatDiv = room.type === "group" ? "privateChatDiv" : '';
      var messagesList = [];

      if (ChatdIntegration._loadingChats[room.roomId] && ChatdIntegration._loadingChats[room.roomId].loadingPromise && ChatdIntegration._loadingChats[room.roomId].loadingPromise.state() === 'pending' || self.isRetrievingHistoryViaScrollPull && !self.loadingShown || room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.joined === false || room.messagesBuff.joined === true && room.messagesBuff.haveMessages === true && room.messagesBuff.messagesHistoryIsLoading() === true || room.messagesBuff.isDecrypting && room.messagesBuff.isDecrypting.state() === 'pending') {
        self.loadingShown = true;
      } else if (room.messagesBuff.joined === true) {
        if (!self.isRetrievingHistoryViaScrollPull && room.messagesBuff.haveMoreHistory() === false) {
          var headerText = room.messagesBuff.messages.length === 0 ? __(l[8002]) : __(l[8002]);

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

        delete self.loadingShown;
      } else {
        delete self.loadingShown;
      }

      var lastTimeMarker;
      var lastMessageFrom = null;
      var lastGroupedMessageTimeStamp = null;
      var lastMessageState = null;
      var grouped = false;
      room.messagesBuff.messages.forEach(function (v, k) {
        if (!v.protocol && v.revoked !== true) {
          var shouldRender = true;

          if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false || v.deleted === true) {
            shouldRender = false;
          }

          var timestamp = v.delay;
          var curTimeMarker;
          var iso = new Date(timestamp * 1000).toISOString();

          if (todayOrYesterday(iso)) {
            // if in last 2 days, use the time2lastSeparator
            curTimeMarker = time2lastSeparator(iso);
          } else {
            // if not in the last 2 days, use 1st June [Year]
            curTimeMarker = acc_time2date(timestamp, true);
          }

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
            lastMessageState = false;
          }

          if (shouldRender === true) {
            var userId = v.userId;

            if (!userId) {
              // dialogMessage have .authorContact instead of .userId
              if (contact && contact.u) {
                userId = contact.u;
              }
            }

            if (v instanceof Message && v.dialogType !== "truncated") {
              // the grouping logic for messages.
              if (!lastMessageFrom || userId && lastMessageFrom === userId) {
                if (timestamp - lastGroupedMessageTimeStamp < 5 * 60) {
                  grouped = true;
                } else {
                  grouped = false;
                  lastMessageFrom = userId;
                  lastGroupedMessageTimeStamp = timestamp;
                  lastMessageState = currentState;
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
              messageInstance = external_React_default.a.createElement(AlterParticipantsConversationMessage, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            } else if (v.dialogType === 'truncated') {
              messageInstance = external_React_default.a.createElement(TruncatedMessage, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            } else if (v.dialogType === 'privilegeChange') {
              messageInstance = external_React_default.a.createElement(PrivilegeChange, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            } else if (v.dialogType === 'topicChange') {
              messageInstance = external_React_default.a.createElement(TopicChange, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            } else if (v.dialogType === 'openModeClosed') {
              messageInstance = external_React_default.a.createElement(CloseOpenModeMessage, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            } else if (v.dialogType === 'chatHandleUpdate') {
              messageInstance = external_React_default.a.createElement(ChatHandleMessage, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped: grouped
              });
            }

            messagesList.push(messageInstance);
          } else {
            if (!v.chatRoom) {
              // ChatDialogMessages...
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
              onEditDone: function onEditDone(messageContents) {
                self.props.chatRoom.scrolledToBottom = true;
                self.editDomElement = null;
                var currentContents = v.textContents;
                v.edited = false;

                if (messageContents === false || messageContents === currentContents) {
                  self.messagesListScrollable.scrollToBottom(true);
                  self.lastScrollPositionPerc = 1;
                } else if (messageContents) {
                  $(room).trigger('onMessageUpdating', v);
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

                    $(v).trigger('onChange', [v, "textContents", "", messageContents]);
                    megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
                  }

                  self.messagesListScrollable.scrollToBottom(true);
                  self.lastScrollPositionPerc = 1;
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
        nonLoggedInJoinChatDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ModalDialog, {
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
          onClick: function onClick(e) {
            self.setState({
              'nonLoggedInJoinChatDialog': false
            });
            megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
          }
        }, l[20597]), external_React_default.a.createElement("a", {
          className: "not-now",
          onClick: function onClick(e) {
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
          privateChatDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ModalDialog, {
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
              // self.state.value
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

        sendContactDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].SelectContactDialog, {
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
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ConfirmDialog, {
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
              $(msg).trigger('onChange', [msg, "deleted", false, true]);
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
          dialog: true
        })));
      }

      var pasteImageConfirmDialog = null;

      if (self.state.pasteImageConfirmDialog) {
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ConfirmDialog, {
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

      var confirmTruncateDialog = null;

      if (self.state.truncateDialog === true) {
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ConfirmDialog, {
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
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ConfirmDialog, {
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
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ConfirmDialog, {
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
        confirmDeleteDialog = external_React_default.a.createElement(modalDialogs["a" /* default */].ModalDialog, {
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
        }, (l[20233] || "%s Members").replace("%s", Object.keys(self.props.chatRoom.members).length))));
      } else {
        contactHandle = contacts[0];
        contact = M.u[contactHandle];
        topicInfo = external_React_default.a.createElement(ui_contacts["ContactCard"], {
          className: "short",
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
        onMouseMove: self.onMouseMove.bind(self),
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
            var options = {
              keyRotation: false,
              topic: ''
            };
            loadingDialog.show();
            megaChat.trigger('onNewGroupChatRequest', [self.props.chatRoom.getParticipantsExceptMe().concat(contactHashes), options]);
          } else {
            self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
          }
        }
      }) : null, room.callManagerCall && room.callManagerCall.isStarted() ? external_React_default.a.createElement(conversationaudiovideopanel_ConversationAudioVideoPanel, {
        chatRoom: this.props.chatRoom,
        unreadCount: this.props.chatRoom.messagesBuff.getUnreadCount(),
        onMessagesToggle: function onMessagesToggle(isActive) {
          self.setState({
            'messagesToggledInCall': isActive
          });
        }
      }) : null, privateChatDialog, chatLinkDialog, nonLoggedInJoinChatDialog, attachCloudDialog, sendContactDialog, confirmDeleteDialog, confirmTruncateDialog, external_React_default.a.createElement("div", {
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
        onFirstInit: function onFirstInit(ps, node) {
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
        isLoading: this.props.chatRoom.messagesBuff.messagesHistoryIsLoading() || this.loadingShown,
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
        onClick: function onClick(e) {
          if (anonymouschat) {
            megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle);
          } else {
            room.joinViaPublicHandle();
          }
        }
      }, l[20597])) : external_React_default.a.createElement("div", {
        className: "chat-textarea-block"
      }, external_React_default.a.createElement(WhosTyping, {
        chatRoom: room
      }), external_React_default.a.createElement(typingArea_TypingArea, {
        chatRoom: self.props.chatRoom,
        className: "main-typing-area",
        disabled: room.isReadOnly(),
        persist: true,
        onUpEditPressed: function onUpEditPressed() {
          var foundMessage = false;
          room.messagesBuff.messages.keys().reverse().some(function (k) {
            if (!foundMessage) {
              var message = room.messagesBuff.messages[k];
              var contact;

              if (message.userId) {
                if (!M.u[message.userId]) {
                  // data is still loading!
                  return;
                }

                contact = M.u[message.userId];
              } else {
                // contact not found
                return;
              }

              if (contact && contact.u === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof Message) && (!message.isManagement || !message.isManagement())) {
                foundMessage = message;
                return foundMessage;
              }
            }
          });

          if (!foundMessage) {
            return false;
          } else {
            self.setState({
              'editing': foundMessage.messageId
            });
            self.props.chatRoom.scrolledToBottom = false;
            return true;
          }
        },
        onResized: function onResized() {
          self.handleWindowResize();
          $('.js-messages-scroll-area', self.findDOMNode()).trigger('forceResize', [true]);
        },
        onConfirm: function onConfirm(messageContents) {
          if (messageContents && messageContents.length > 0) {
            if (!self.props.chatRoom.scrolledToBottom) {
              self.props.chatRoom.scrolledToBottom = true;
              self.lastScrollPosition = 0; // tons of hacks required because of the super weird continuous native
              // scroll event under Chrome + OSX, e.g. when the user scrolls up to the
              // start of the chat, the event continues to be received event that the
              // scrollTop is now 0..and if in that time the user sends a message
              // the event triggers a weird "scroll up" animation out of nowhere...

              $(self.props.chatRoom).rebind('onMessagesBuffAppend.pull', function () {
                self.messagesListScrollable.scrollToBottom(false);
                setTimeout(function () {
                  self.messagesListScrollable.enable();
                }, 1500);
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
        onClick: function onClick(e) {
          self.setState({
            'attachCloudDialog': true
          });
        }
      }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        className: "link-button light",
        icon: "grey-computer colorized",
        label: __(l[19795]) ? __(l[19795]) : "My computer",
        onClick: function onClick(e) {
          self.uploadFromComputer();
        }
      }), external_React_default.a.createElement("div", {
        className: "chat-button-seperator"
      }), external_React_default.a.createElement(ui_dropdowns["DropdownItem"], {
        className: "link-button light",
        icon: "square-profile colorized",
        label: __(l[8628]),
        onClick: function onClick(e) {
          self.setState({
            'sendContactDialog': true
          });
        }
      }))))))));
    }
  }]);

  return ConversationPanel;
}(Object(mixins["default"])(external_React_default.a.Component)), conversationpanel_class2.lastScrollPositionPerc = 1, conversationpanel_temp), (conversationpanel_applyDecoratedDescriptor(conversationpanel_class.prototype, "onMouseMove", [conversationpanel_dec], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "onMouseMove"), conversationpanel_class.prototype), conversationpanel_applyDecoratedDescriptor(conversationpanel_class.prototype, "handleKeyDown", [_dec2], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "handleKeyDown"), conversationpanel_class.prototype)), conversationpanel_class));
;
var conversationpanel_ConversationPanels =
/*#__PURE__*/
function (_MegaRenderMixin4) {
  conversationpanel_inherits(ConversationPanels, _MegaRenderMixin4);

  function ConversationPanels() {
    conversationpanel_classCallCheck(this, ConversationPanels);

    return conversationpanel_possibleConstructorReturn(this, conversationpanel_getPrototypeOf(ConversationPanels).apply(this, arguments));
  }

  conversationpanel_createClass(ConversationPanels, [{
    key: "render",
    value: function render() {
      var self = this;
      var conversations = [];
      var hadLoaded = anonymouschat || ChatdIntegration.allChatsHadLoaded.state() !== 'pending' && ChatdIntegration.mcfHasFinishedPromise.state() !== 'pending' && Object.keys(ChatdIntegration._loadingChats).length === 0;

      if (hadLoaded && getSitePath() === "/fm/chat") {
        // do we need to "activate" an conversation?
        var activeFound = false;

        if (megaChat.currentlyOpenedChat && megaChat[megaChat.currentlyOpenedChat]) {
          activeFound = true;
        }

        if (megaChat.chats.length > 0 && !activeFound) {
          megaChat.showLastActive();
        }
      }

      if (!hadLoaded && !self._waitLoadingChats) {
        self._waitLoadingChats = true;
        megaChat.plugins.chatdIntegration.chatd.rebind('onMessagesHistoryDone.convUImain', function () {
          if (anonymouschat || ChatdIntegration.allChatsHadLoaded.state() !== 'pending' && ChatdIntegration.mcfHasFinishedPromise.state() !== 'pending' && Object.keys(ChatdIntegration._loadingChats).length === 0) {
            megaChat.plugins.chatdIntegration.chatd.unbind('onMessagesHistoryDone.convUImain');
            Soon(function () {
              self.safeForceUpdate();

              if (M.currentdirid === "chat") {
                megaChat.showLastActive();
              }
            });
          }
        }); // also update immediately after chats had loaded, since there may be no history/chats to pull

        var finishedLoadingInitial = function finishedLoadingInitial() {
          if (megaChat.chats.length === 0) {
            Soon(function () {
              self.safeForceUpdate();
            });
          }
        };

        ChatdIntegration.allChatsHadLoaded.always(finishedLoadingInitial);
        ChatdIntegration.mcfHasFinishedPromise.always(finishedLoadingInitial);
      }

      var now = Date.now();
      hadLoaded && megaChat.chats.forEach(function (chatRoom) {
        if (chatRoom.isCurrentlyActive || now - chatRoom.lastShownInUI < 15 * 60 * 1000) {
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

      if (megaChat.chats.length === 0) {
        if (!self._MuChangeListener) {
          self._MuChangeListener = M.u.addChangeListener(function () {
            self.safeForceUpdate();
          });
        }

        var contactsList = [];
        var contactsListOffline = [];

        if (hadLoaded) {
          var lim = Math.min(10, M.u.length);
          var userHandles = M.u.keys();

          for (var i = 0; i < lim; i++) {
            var contact = M.u[userHandles[i]];

            if (contact.u !== u_handle && contact.c === 1) {
              var pres = megaChat.userPresenceToCssClass(contact.presence);
              (pres === "offline" ? contactsListOffline : contactsList).push(external_React_default.a.createElement(ui_contacts["ContactCard"], {
                contact: contact,
                key: contact.u
              }));
            }
          }
        }

        var emptyMessage = hadLoaded ? l[8008] : l[7006];
        return external_React_default.a.createElement("div", null, hadLoaded ? external_React_default.a.createElement("div", {
          className: "chat-right-area"
        }, external_React_default.a.createElement("div", {
          className: "chat-right-area contacts-list-scroll"
        }, external_React_default.a.createElement("div", {
          className: "chat-right-pad"
        }, contactsList, contactsListOffline))) : null, external_React_default.a.createElement("div", {
          className: "empty-block"
        }, external_React_default.a.createElement("div", {
          className: "empty-pad conversations"
        }, external_React_default.a.createElement("div", {
          className: "fm-empty-conversations-bg"
        }), external_React_default.a.createElement("div", {
          className: "fm-empty-cloud-txt small",
          dangerouslySetInnerHTML: {
            __html: __(anonymouschat ? "" : emptyMessage).replace("[P]", "<span>").replace("[/P]", "</span>")
          }
        }), hadLoaded && !anonymouschat ? external_React_default.a.createElement("div", {
          className: "big-red-button new-chat-link",
          onClick: function onClick(e) {
            $(document.body).trigger('startNewChatLink');
          }
        }, l[20638]) : null)));
      } else {
        if (self._MuChangeListener) {
          M.u.removeChangeListener(self._MuChangeListener);
          delete self._MuChangeListener;
        }

        if (M.currentdirid === "chat" && conversations.length === 0 && megaChat.chats.length !== 0 && hadLoaded) {
          // initial load on /fm/chat. focring to show a room.
          onIdle(function () {
            megaChat.showLastActive();
          });
        }

        return external_React_default.a.createElement("div", {
          className: "conversation-panels " + self.props.className
        }, conversations);
      }
    }
  }]);

  return ConversationPanels;
}(Object(mixins["default"])(external_React_default.a.Component));
;

function isStartCallDisabled(room) {
  return !room.isOnlineForCalls() || room.isReadOnly() || room._callSetupPromise || !room.chatId || room.callManagerCall && room.callManagerCall.state !== CallManagerCall.STATE.WAITING_RESPONSE_INCOMING || (room.type === "group" || room.type === "public") && !ENABLE_GROUP_CALLING_FLAG || room.getCallParticipants().length > 0 || room.getParticipantsExceptMe() < 1;
}

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(18);
module.exports = __webpack_require__(13);


/***/ }),
/* 18 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ui_conversations_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(13);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }



 // load chatRoom.jsx, so that its included in bundle.js, despite that ChatRoom is legacy ES ""class""

__webpack_require__(21);

var EMOJI_DATASET_VERSION = 3;

var _chatui;

var webSocketsSupport = typeof WebSocket !== 'undefined';

(function () {
  _chatui = function chatui(id) {
    var roomOrUserHash = id.replace("chat/", "");
    var isPubLink = id !== "chat/archived" && id.substr(0, 5) === "chat/" && id.substr(6, 1) !== "/";
    var roomType = false;
    var displayArchivedChats = false;

    if (roomOrUserHash === "archived") {
      roomType = "archived";
      displayArchivedChats = true;
      delete megaChat.lastOpenedChat;
    } else if (roomOrUserHash.substr(0, 2) === "g/" || roomOrUserHash.substr(0, 2) === "c/" || isPubLink) {
      roomType = isPubLink || roomOrUserHash.substr(0, 2) === "c/" ? "public" : "group";
      var publicChatHandle;
      var publicChatKey;
      var publicChatId;

      if (roomType === "public" && isPubLink) {
        publicChatHandle = roomOrUserHash.split("#")[0];
        publicChatKey = roomOrUserHash.split("#")[1]; // FB's ?fbclid stuff...

        if (publicChatKey && String(publicChatKey).indexOf("?") > -1) {
          publicChatKey = publicChatKey.split("?")[0];
        }

        publicChatId = megaChat.handleToId[publicChatHandle];
        roomOrUserHash = publicChatHandle;
        megaChat.publicChatKeys = megaChat.publicChatKeys || {};
        megaChat.publicChatKeys[publicChatHandle] = publicChatKey;
      } else {
        roomOrUserHash = roomOrUserHash.substr(2, roomOrUserHash.length);
      }

      if (publicChatId && megaChat.chats[publicChatId]) {
        megaChat.chats[publicChatId].show();
      } else if (!megaChat.chats[roomOrUserHash]) {
        // chat not found
        // is it still loading?
        if (anonymouschat || publicChatHandle) {
          // since openFolder is not getting called in this situation, setting M.chat is required
          // to make previews work.
          M.chat = true;
          var promises = [];

          if (!anonymouschat) {
            promises.push(ChatdIntegration.mcfHasFinishedPromise);
          }

          MegaPromise.allDone(promises).always(function () {
            megaChat.plugins.chatdIntegration.openChat(publicChatHandle).always(function () {
              if (anonymouschat) {
                ChatdIntegration.mcfHasFinishedPromise.resolve();
                ChatdIntegration.allChatsHadLoaded.resolve();
              }

              var publicChatId = megaChat.handleToId[publicChatHandle];

              if (megaChat.chats[publicChatId]) {
                megaChat.chats[publicChatId].show();
              }
            });
          });
        } else {
          if (ChatdIntegration._loadingChats[roomOrUserHash] && ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.state() === 'pending') {
            ChatdIntegration._loadingChats[roomOrUserHash].loadingPromise.done(function () {
              _chatui(id);
            });

            return;
          }

          setTimeout(function () {
            loadSubPage('fm/chat');
            M.openFolder('chat');
          }, 100);
        }

        return;
      }
    } else {
      if (roomOrUserHash.substr(0, 2) === "p/") {
        roomOrUserHash = roomOrUserHash.substr(2);
      }

      if (!M.u[roomOrUserHash]) {
        setTimeout(function () {
          loadSubPage('fm/chat');
          M.openFolder('chat');
        }, 100);
        return;
      } else {
        roomType = "private";
      }
    } // XX: code maintanance: move this code to MegaChat.constructor() and .show(jid)


    M.hideEmptyGrids();
    $('.fm-files-view-icon').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.files-grid-view').addClass('hidden');

    if (megaChat.displayArchivedChats) {
      $('.files-grid-view.archived-chat-view').removeClass('hidden');
    }

    $('.fm-right-account-block').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');
    $('.shared-grid-view,.shared-blocks-view').addClass('hidden');

    if (roomType !== "archived") {
      $('.fm-right-files-block.in-chat').removeClass('hidden');
      $('.fm-right-files-block:not(.in-chat)').addClass('hidden');
    }

    megaChat.refreshConversations();

    if (roomType === "private") {
      var userHandle = id.split("chat/p/").pop();
      var userHandles = [u_handle, userHandle];
      megaChat.smartOpenChat(userHandles, "private", undefined, undefined, undefined, true).then(function (room) {
        room.show();
      }).catch(function (ex) {
        console.warn("openChat failed. Maybe tried to start a private chat with a non contact?", ex);
      });
    } else if (roomType === "group") {
      megaChat.chats[roomOrUserHash].show();
    } else if (roomType === "public") {
      if (megaChat.chats[roomOrUserHash] && id.indexOf('chat/') > -1) {
        megaChat.chats[roomOrUserHash].show();
      } else {
        var publicChatId = megaChat.handleToId[roomOrUserHash];

        if (publicChatId && megaChat.chats[publicChatId]) {
          megaChat.chats[publicChatId].show();
        }
      }
    } else if (roomType === "archived") {
      megaChat.hideAllChats();
      M.onSectionUIOpen('conversations');
      $('.archived-chat-view').removeClass('hidden');

      if (megaChat.$conversationsAppInstance) {
        megaChat.safeForceUpdate();
      }
    } else {
      console.error("Unknown room type.");
      return;
    }

    if (displayArchivedChats !== megaChat.displayArchivedChats) {
      megaChat.displayArchivedChats = displayArchivedChats;
      megaChat.safeForceUpdate();
    } // since .fm-chat-block is out of the scope of the CovnersationsApp, this should be done manually :(


    $('.fm-chat-block').removeClass('hidden');
  };
})();
/**
 * Used to differentiate MegaChat instances running in the same env (tab/window)
 *
 * @type {number}
 */


var megaChatInstanceId = 0;
var CHATUIFLAGS_MAPPING = {
  'convPanelCollapse': 'cPC'
};
/**
 * MegaChat - UI component that links XMPP/Strophejs (via Karere) w/ the Mega's UI
 *
 * @returns {Chat}
 * @constructor
 */

var Chat = function Chat() {
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
  this.publicChatKeys = {};
  this.handleToId = {};
  this.options = {
    'delaySendMessageIfRoomNotAvailableTimeout': 3000,
    'loadbalancerService': 'gelb.karere.mega.nz',
    'rtc': {
      iceServers: [
      /*                {
                          urls: ['turn:trnxxxx.karere.mega.nz:3478?transport=udp'],   // Luxembourg
                          username: "inoo20jdnH",
                          credential: '02nNKDBkkS'
                      }
      */
      {
        urls: 'turn:trn270n001.karere.mega.nz:3478?transport=udp',
        // Luxembourg
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }, {
        urls: 'turn:trn302n001.karere.mega.nz:3478?transport=udp',
        // Luxembourg
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }, {
        urls: 'turn:trn530n001.karere.mega.nz:3478?transport=udp',
        // Luxembourg
        username: "inoo20jdnH",
        credential: '02nNKDBkkS'
      }]
    },
    filePickerOptions: {},

    /**
     * Really simple plugin architecture
     */
    'plugins': {
      'chatStats': ChatStats,
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
      'geoLocationLinks': GeoLocationLinks
    },
    'chatNotificationOptions': {
      'textMessages': {
        'incoming-chat-message': {
          'title': "Incoming chat message",
          'icon': function icon(notificationObj, params) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return "You have new incoming chat message from: " + params.from;
          }
        },
        'incoming-attachment': {
          'title': "Incoming attachment",
          'icon': function icon(notificationObj, params) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return params.from + " shared " + (params.attachmentsCount > 1 ? params.attachmentsCount + " files" : "a file");
          }
        },
        'incoming-voice-video-call': {
          'title': l[17878] || "Incoming call",
          'icon': function icon(notificationObj, params) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return l[5893].replace('[X]', params.from); // You have an incoming call from [X].
          }
        },
        'call-terminated': {
          'title': "Call terminated",
          'icon': function icon(notificationObj, params) {
            return notificationObj.options.icon;
          },
          'body': function body(notificationObj, params) {
            return l[5889].replace('[X]', params.from); // Call with [X] ended.
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
  self.filePicker = null; // initialized on a later stage when the DOM is fully available.

  self._chatsAwaitingAps = {}; // those, once changed, should trigger UI reupdate via MegaRenderMixin.

  MegaDataObject.attachToExistingJSObject(this, {
    "currentlyOpenedChat": null,
    "displayArchivedChats": false
  }, true);
  return this;
};

makeObservable(Chat);
/**
 * Initialize the MegaChat (also will connect to the XMPP)
 */

Chat.prototype.init = function () {
  var self = this; // really simple plugin architecture that will initialize all plugins into self.options.plugins[name] = instance

  self.plugins = {};
  self.plugins['chatNotifications'] = new ChatNotifications(self, self.options.chatNotificationOptions);
  self.plugins['chatNotifications'].notifications.rebind('onAfterNotificationCreated.megaChat', function () {
    self.updateSectionUnreadCount();
  });
  Object.keys(self.options.plugins).forEach(function (plugin) {
    self.plugins[plugin] = new self.options.plugins[plugin](self);
  }); // UI events

  $(document.body).rebind('mousedown.megachat', '.top-user-status-popup .tick-item', function () {
    var presence = $(this).data("presence");
    self._myPresence = presence;
    $('.top-user-status-popup').removeClass("active").addClass("hidden"); // presenced integration

    var targetPresence = PresencedIntegration.cssClassToPresence(presence);
    self.plugins.presencedIntegration.setPresence(targetPresence); // connection management - chatd shards, presenced

    if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
      // going from OFFLINE -> online/away/busy, e.g. requires a connection
      Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(function (k) {
        var v = self.plugins.chatdIntegration.chatd.shards[k];
        v.connectionRetryManager.requiresConnection();
      });
    }
  });

  if (this._pageChangeListener) {
    mBroadcaster.removeListener(this._pageChangeListener);
  }

  var lastOpenedRoom = null;
  this._pageChangeListener = mBroadcaster.addListener('pagechange', function () {
    var room = self.getCurrentRoom();

    if (room && !room.isCurrentlyActive && room.chatId != lastOpenedRoom) {
      // opened window, different then one from the chat ones
      room.hide();
      self.currentlyOpenedChat = null;
    }

    if (lastOpenedRoom && (!room || room.chatId != lastOpenedRoom)) {
      // have opened a chat window before, but now
      // navigated away from it
      if (self.chats[lastOpenedRoom]) {
        self.chats[lastOpenedRoom].hide();
      }
    }

    if (lastOpenedRoom && $('.fm-chat-block').is(".hidden")) {
      // have opened a chat window before, but now
      // navigated away from it
      if (self.chats[lastOpenedRoom]) {
        self.chats[lastOpenedRoom].hide();
        lastOpenedRoom = null;
      }
    }

    if (room) {
      lastOpenedRoom = room.chatId;
    } else {
      lastOpenedRoom = null;
    }

    $('.fm-create-chat-button').hide();
  });
  self.$container = $('.fm-chat-block');
  var appContainer = document.querySelector('.section.conversations');

  var initAppUI = function initAppUI() {
    if (d) {
      console.time('chatReactUiInit');
    }

    self.$conversationsApp = react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(_ui_conversations_jsx__WEBPACK_IMPORTED_MODULE_2__["default"].ConversationsApp, {
      megaChat: self
    });
    self.$conversationsAppInstance = react_dom__WEBPACK_IMPORTED_MODULE_1___default.a.render(self.$conversationsApp, document.querySelector('.section.conversations'));

    if (d) {
      console.timeEnd('chatReactUiInit');
    }
  };

  if (self.is_initialized) {
    self.destroy().always(function () {
      self.init();
    });
    return;
  } else {
    if (!appContainer) {
      if (self._appInitPageChangeListener) {
        mBroadcaster.removeListener(self._appInitPageChangeListener);
      }

      self._appInitPageChangeListener = mBroadcaster.addListener('pagechange', function () {
        if (typeof $.leftPaneResizable === 'undefined' || !fminitialized) {
          // delay the chat init a bit more! specially for the case of a user getting from /pro -> /fm, which
          // for some unknown reason, stopped working and delayed the init of $.leftPaneResizable
          return;
        }

        appContainer = document.querySelector('.section.conversations');

        if (appContainer) {
          initAppUI();

          if (self._appInitPageChangeListener) {
            mBroadcaster.removeListener(self._appInitPageChangeListener);
          }
        }
      });
    } else {
      initAppUI();
    }
  }

  self.is_initialized = true;
  mBroadcaster.sendMessage('chat_initialized');

  if (!anonymouschat) {
    $('.activity-status-block, .activity-status').show();
  } else {} // contacts tab update


  self.on('onRoomInitialized', function (e, room) {
    if (room.type === "private") {
      var userHandle = room.getParticipantsExceptMe()[0];

      if (!userHandle) {
        return;
      }

      var c = M.u[userHandle];

      if (!c) {
        return;
      }

      $('#contact_' + c.u + ' .start-chat-button').addClass("active");
    }

    room.rebind("onChatShown.chatMainList", function () {
      $('.conversations-main-listing').addClass("hidden");
    });
    self.updateDashboard();
  });
  self.on('onRoomDestroy', function (e, room) {
    if (room.type === "private") {
      var userHandle = room.getParticipantsExceptMe()[0];
      var c = M.u[userHandle];

      if (!c) {
        return;
      }

      $('#contact_' + c.u + ' .start-chat-button').removeClass("active");
    }

    if (room.callManagerCall) {
      room.callManagerCall.endCall();
    }
  });
  $(document.body).rebind('mouseover.notsentindicator', '.tooltip-trigger', function () {
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
  $(document.body).rebind('mouseout.notsentindicator click.notsentindicator', '.tooltip-trigger', function () {
    // hide all tooltips
    var $notification = $('.tooltip');
    $notification.addClass('hidden').removeAttr('style');
  });
  self.registerUploadListeners();
  self.trigger("onInit");
};
/**
 * Load chat UI Flags from mega.config
 *
 * @param [val] {Object} optional settings, if already received.
 */


Chat.prototype.loadChatUIFlagsFromConfig = function (val) {
  var self = this;
  var flags = val || mega.config.get("cUIF");

  if (flags) {
    if (_typeof(flags) !== 'object') {
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
/**
 * Init chatUIFlags management code
 */


Chat.prototype.initChatUIFlagsManagement = function () {
  var self = this;
  self.loadChatUIFlagsFromConfig();
  this.chatUIFlags.addChangeListener(function (hashmap, extraArg) {
    var flags = mega.config.get("cUIF") || {};
    var hadChanged = false;
    var hadLocalChanged = false; // merge w/ raw, so that we won't replace any new (unknown) flags set by new-version clients

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
        // prevent recursion
        self.chatUIFlags.trackDataChange(0xDEAD);
      }

      $.tresizer();
    }

    if (extraArg === 0xDEAD) {
      // don't update the mega.config, it should be updated already by the ap
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
  self.unregisterUploadListeners(true); // Iterate chats for which we are uploading

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
  }; // find pending upload id by faid or handle


  var lookupPendingUpload = function lookupPendingUpload(id) {
    console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');

    for (var uid in ulmanager.ulEventData) {
      if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
        return uid;
      }
    }
  }; // Stop listening for upload-related events if there are no more pending uploads


  var unregisterListeners = function unregisterListeners() {
    if (!$.len(ulmanager.ulEventData)) {
      self.unregisterUploadListeners();
    }
  }; // Attach nodes to a chat room on upload completion


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
  }; // Handle upload completions


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
      // This should not happen...
      if (d) {
        logger.error('Invalid state error...');
      }
    } else {
      ul.h = handle;

      if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {
        // The fa was not yet attached to the node, wait for fa:* events
        ul.faid = faid;

        if (d) {
          logger.debug('Waiting for file attribute to arrive.', handle, ul);
        }
      } else {
        // this is not a media file or the fa is already set, attach node to chat room
        onUploadComplete(ul);
      }
    }
  }; // Handle upload errors


  var onUploadError = function onUploadError(uid, error) {
    var ul = ulmanager.ulEventData[uid];

    if (d) {
      logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
    }

    if (ul) {
      delete ulmanager.ulEventData[uid];
      unregisterListeners();
    }
  }; // Signal upload completion on file attribute availability


  var onAttributeReady = function onAttributeReady(handle, fa) {
    delay('chat:fa-ready:' + handle, function () {
      var uid = lookupPendingUpload(handle);
      var ul = ulmanager.ulEventData[uid] || false;

      if (d) {
        logger.debug('fa:ready', handle, fa, uid, ul);
      }

      if (ul.h && String(fa).split('/').length >= ul.efa) {
        // The fa is now attached to the node, add it to the chat room(s)
        onUploadComplete(ul);
      } else if (d) {
        logger.debug('Not enough file attributes yet, holding...', ul);
      }
    });
  }; // Signal upload completion if we were unable to store file attributes


  var onAttributeError = function onAttributeError(faid, error, onStorageAPIError, nFAiled) {
    var uid = lookupPendingUpload(faid);
    var ul = ulmanager.ulEventData[uid] || false;

    if (d) {
      logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul, nFAiled, ul.efa);
    } // Attaching some fa to the node failed.


    if (ul) {
      // decrement the number of expected file attributes
      ul.efa = Math.max(0, ul.efa - nFAiled) | 0; // has this upload finished?

      if (ul.h) {
        // Yes, check whether we must attach the node
        var n = M.d[ul.h] || false;

        if (!ul.efa || n.fa && String(n.fa).split('/').length >= ul.efa) {
          onUploadComplete(ul);
        }
      }
    }
  }; // Register additional listeners when starting to upload


  var registerLocalListeners = function registerLocalListeners() {
    self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
    self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
    self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
    self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
    self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
  }; // Listen to upload events


  var onUploadStart = function onUploadStart(data) {
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
  };

  self._uplStart = mBroadcaster.addListener('upload:start', onUploadStart);
};

Chat.prototype.getRoomFromUrlHash = function (urlHash) {
  // works only for group and private chats for now
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
  } // update the "global" conversation tab unread counter


  var unreadCount = 0;
  var havePendingCall = false;
  var haveCall = false;
  self.haveAnyActiveCall() === false && self.chats.forEach(function (megaRoom, k) {
    if (megaRoom.state == ChatRoom.STATE.LEFT) {
      // skip left rooms.
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
  var haveContents = false; // try NOT to touch the DOM if not needed...

  if (havePendingCall) {
    haveContents = true;
    $('.new-messages-indicator .chat-pending-call').removeClass('hidden');

    if (haveCall) {
      $('.new-messages-indicator .chat-pending-call').addClass('call-exists');
    } else {
      $('.new-messages-indicator .chat-pending-call').removeClass('call-exists');
    }
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
/**
 * Destroy this MegaChat instance (leave all rooms then disconnect)
 *
 * @returns {*}
 */

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
  self.trigger('onDestroy', [isLogout]); // unmount the UI elements, to reduce any unneeded.

  try {
    if (self.$conversationsAppInstance && react_dom__WEBPACK_IMPORTED_MODULE_1___default.a.findDOMNode(self.$conversationsAppInstance) && react_dom__WEBPACK_IMPORTED_MODULE_1___default.a.findDOMNode(self.$conversationsAppInstance).parentNode) {
      react_dom__WEBPACK_IMPORTED_MODULE_1___default.a.unmountComponentAtNode(react_dom__WEBPACK_IMPORTED_MODULE_1___default.a.findDOMNode(self.$conversationsAppInstance).parentNode);
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
  return MegaPromise.resolve();
};
/**
 * Get ALL contacts from the Mega Contacts list
 *
 * @returns {Array}
 */


Chat.prototype.getContacts = function () {
  var results = [];
  M.u.forEach(function (k, v) {
    if (v.c == 1 || v.c == 2) {
      results.push(v);
    }
  });
  return results;
};
/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a CSS class (e.g. will return 'online')
 *
 * @param presence {String}
 * @returns {String}
 */


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
/**
 * Used to re-render my own presence/status
 */


Chat.prototype.renderMyStatus = function () {
  var self = this;

  if (!self.is_initialized) {
    return;
  }

  if (typeof megaChat.userPresence === 'undefined') {
    // still initialising...
    return;
  } // reset


  var $status = $('.activity-status-block .activity-status');
  $('.top-user-status-popup .tick-item').removeClass("active");
  $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');
  var actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();
  var userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
  var presence = self.plugins.presencedIntegration.getMyPresence();
  var cssClass = PresencedIntegration.presenceToCssClass(presence);

  if (userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED) {
    cssClass = "offline";
  } // use the actual presence for ticking the dropdown's items, since the user can be auto away/reconnecting,
  // but his actual presence's settings to be set to online/away/busy/etc


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
/**
 * Reorders the contact tree by last activity (THIS is going to just move DOM nodes, it will NOT recreate them from
 * scratch, the main goal is to be fast and clever.)
 */


Chat.prototype.reorderContactTree = function () {
  var self = this;
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
/**
 * Open (and (optionally) show) a new chat
 *
 * @param userHandles {Array} list of user handles
 * @param type {String} "private" or "group", "public"
 * @param [chatId] {String}
 * @param [chatShard]  {String}
 * @param [chatdUrl]  {String}
 * @param [setAsActive] {Boolean}
 * @returns [roomId {string}, room {MegaChatRoom}, {Deferred}]
 */


Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck) {
  var self = this;
  type = type || "private";
  setAsActive = setAsActive === true;
  var roomId = chatId;
  var publicChatKey;

  if (!publicChatKey && chatHandle && self.publicChatKeys[chatHandle]) {
    if (type !== "public") {
      console.error("this should never happen.", type);
      type = "public";
    }

    publicChatKey = self.publicChatKeys[chatHandle];
  }

  var $promise = new MegaPromise();

  if (type === "private") {
    // validate that ALL jids are contacts
    var allValid = true;
    userHandles.forEach(function (user_handle) {
      var contact = M.u[user_handle];

      if (!contact || contact.c !== 1 && contact.c !== 2 && contact.c !== 0) {
        // this can happen in case the other contact is not in the contact list anymore, e.g. parked account,
        // removed contact, etc
        allValid = false;
        $promise.reject();
        return false;
      }
    });

    if (allValid === false) {
      $promise.reject();
      return $promise;
    }

    roomId = array.filterNonMatching(userHandles, u_handle)[0];

    if (!roomId) {
      // found a chat where I'm the only user in?
      $promise.reject();
      return $promise;
    }

    if (self.chats[roomId]) {
      $promise.resolve(roomId, self.chats[roomId]);
      return [roomId, self.chats[roomId], $promise];
    } else {// open new chat
    }
  } else {
    assert(roomId, 'Tried to create a group chat, without passing the chatId.');
    roomId = chatId;
  }

  if (type === "group" || type == "public") {
    userHandles.forEach(function (contactHash) {
      assert(contactHash, 'Invalid hash for user (extracted from inc. message)');

      if (!M.u[contactHash]) {
        M.u.set(contactHash, new MegaDataObject(MEGA_USER_STRUCT, true, {
          'h': contactHash,
          'u': contactHash,
          'm': '',
          'c': undefined
        }));
        M.syncUsersFullname(contactHash);
        self.processNewUser(contactHash, true);
        M.syncContactEmail(contactHash);
      }
    });

    ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle);

    ChatdIntegration._ensureNamesAreLoaded(userHandles, chatHandle);
  }

  if (!roomId && setAsActive) {
    // manual/UI trigger, before the mcf/all chats are already loaded? postpone, since that chat may already
    // exists, so an 'mcc' API call may not be required
    if (ChatdIntegration.allChatsHadLoaded.state() === 'pending' || ChatdIntegration.mcfHasFinishedPromise.state() === 'pending') {
      MegaPromise.allDone([ChatdIntegration.allChatsHadLoaded, ChatdIntegration.mcfHasFinishedPromise]).always(function () {
        var res = self.openChat(userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck);
        $promise.linkDoneAndFailTo(res[2]);
      });
      return [roomId, undefined, $promise];
    }
  }

  if (self.chats[roomId]) {
    var room = self.chats[roomId];

    if (setAsActive) {
      room.show();
    }

    $promise.resolve(roomId, room);
    return [roomId, room, $promise];
  }

  if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat != roomId) {
    self.hideChat(self.currentlyOpenedChat);
    self.currentlyOpenedChat = null;
  } // chatRoom is still loading from mcf/fmdb


  if (!chatId && ChatdIntegration._loadingChats[roomId]) {
    // wait for it to load
    ChatdIntegration._loadingChats[roomId].loadingPromise.done(function () {
      // already initialized ? other mcc action packet triggered init with the latest data for that chat?
      if (self.chats[roomId]) {
        if (self.chats[roomId].isArchived() && roomId === megaChat.currentlyOpenedChat) {
          self.chats[roomId].showArchived = true;
        }

        $promise.resolve(roomId, self.chats[roomId]);
        return;
      }

      var res = self.openChat(userHandles, ap.m === 1 ? "public" : ap.g === 1 ? "group" : "private", ap.id, ap.cs, ap.url, setAsActive, chatHandle, publicChatKey, ck);
      $promise.linkDoneAndFailTo(res[2]);
    }).fail(function () {
      $promise.reject(arguments[0]);
    });

    if (setAsActive) {
      // store a flag, that would trigger a "setAsActive" for when the loading finishes
      // e.g. cover the case of the user reloading on a group chat that is readonly now
      ChatdIntegration._loadingChats[roomId].setAsActive = true;
    }

    return [roomId, undefined, $promise];
  } // chat room not found, create a new one


  var room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl, null, chatHandle, publicChatKey, ck);
  self.chats.set(room.roomId, room);

  if (setAsActive && !self.currentlyOpenedChat) {
    room.show();
  } // this is retry call, coming when the chat had just finished loading, with a previous call to .openChat with
  // `setAsActive` === true


  if (setAsActive === false && chatId && ChatdIntegration._loadingChats[roomId] && ChatdIntegration._loadingChats[roomId].setAsActive) {
    room.show();
  }

  var tmpRoomId = room.roomId;

  if (self.currentlyOpenedChat === tmpRoomId) {
    self.currentlyOpenedChat = room.roomId;

    if (room) {
      room.show();
    }
  }

  if (setAsActive === false) {
    room.showAfterCreation = false;
  } else {
    room.showAfterCreation = true;
  }

  this.trigger('onRoomInitialized', [room]);
  room.setState(ChatRoom.STATE.JOINING);
  return [roomId, room, MegaPromise.resolve(roomId, self.chats[roomId])];
};
/**
 * Wrapper around openChat() that does wait for the chat to be ready.
 * @see Chat.openChat
 */


Chat.prototype.smartOpenChat = function () {
  'use strict';

  var self = this;
  var args = toArray.apply(null, arguments);

  if (typeof args[0] === 'string') {
    // Allow to provide a single argument which defaults to opening a private chat with such user
    args[0] = [u_handle, args[0]];

    if (args.length < 2) {
      args.push('private');
    }
  }

  return new MegaPromise(function (resolve, reject) {
    // Helper function to actually wait for a room to be ready once we've got it.
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
    }; // Check whether we can prevent the actual call to openChat()


    if (args[0].length === 2 && args[1] === 'private') {
      var chatRoom = self.chats[array.filterNonMatching(args[0], u_handle)[0]];

      if (chatRoom) {
        chatRoom.show();
        return waitForReadyState(chatRoom, args[5]);
      }
    }

    var result = self.openChat.apply(self, args);

    if (result instanceof MegaPromise) {
      // if an straight promise is returned, the operation got rejected
      result.then(reject).catch(reject);
    } else if (!Array.isArray(result)) {
      // The function should return an array at all other times...
      reject(EINTERNAL);
    } else {
      var room = result[1];
      var roomId = result[0];
      var promise = result[2];

      if (!(promise instanceof MegaPromise)) {
        // Something went really wrong...
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
/**
 * Utility func to hide all visible chats
 */


Chat.prototype.hideAllChats = function () {
  var self = this;
  self.chats.forEach(function (chatRoom, k) {
    if (chatRoom.isCurrentlyActive) {
      chatRoom.hide();
    }
  });
};
/**
 * Returns the currently opened room/chat
 *
 * @returns {null|undefined|Object}
 */


Chat.prototype.getCurrentRoom = function () {
  return this.chats[this.currentlyOpenedChat];
};
/**
 * Returns the currently opened room/chat JID
 *
 * @returns {null|String}
 */


Chat.prototype.getCurrentRoomJid = function () {
  return this.currentlyOpenedChat;
};
/**
 * Hide a room/chat's UI components.
 *
 * @param roomJid
 */


Chat.prototype.hideChat = function (roomJid) {
  var self = this;
  var room = self.chats[roomJid];

  if (room) {
    room.hide();
  } else {
    self.logger.warn("Room not found: ", roomJid);
  }
};
/**
 * Send message to a specific room
 *
 * @param roomJid
 * @param val
 */


Chat.prototype.sendMessage = function (roomJid, val) {
  var self = this; // queue if room is not ready.

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
/**
 * Called when a new user is added into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 * @param [isNewChat] {boolean} optional - pass true if this is called API that opens OR creates a new chat (new, from
 * in memory perspective)
 */


Chat.prototype.processNewUser = function (u, isNewChat) {
  var self = this;
  self.logger.debug("added: ", u);

  if (self.plugins.presencedIntegration) {
    self.plugins.presencedIntegration.addContact(u, isNewChat);
  }

  self.chats.forEach(function (chatRoom) {
    if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
      chatRoom.trackDataChange();
    }
  });
  self.renderMyStatus();
};
/**
 * Called when a new contact is removed into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */


Chat.prototype.processRemovedUser = function (u) {
  var self = this;
  self.logger.debug("removed: ", u);

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
/**
 * Refresh the currently active conversation list in the UI
 */


Chat.prototype.refreshConversations = function () {
  var self = this; //$('.fm-tree-panel > .jspContainer > .jspPane > .nw-tree-panel-header').hide();
  //$('.fm-tree-panel > .nw-tree-panel-header').hide();

  if (!self.$container && !megaChatIsReady && u_type == 0) {
    $('.fm-chat-block').hide();
    return false;
  }

  $('.section.conversations .fm-chat-is-loading').addClass('hidden'); // move to the proper place if loaded before the FM

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
      activePopup.css('left', '-' + 10000 + 'px');
    } else activePopup.css('right', '-' + 10000 + 'px');
  }
};
/**
 * Debug helper
 */


Chat.prototype.getChatNum = function (idx) {
  return this.chats[this.chats.keys()[idx]];
};
/**
 * Called when Conversations tab is opened
 *
 * @returns boolean true if room was automatically shown and false if the listing page is shown
 */


Chat.prototype.renderListing = function () {
  var self = this;
  self.hideAllChats();
  M.hideEmptyGrids(); //$('.fm-tree-panel > .jspContainer > .jspPane > .nw-tree-panel-header').hide();
  //$('.fm-tree-panel > .nw-tree-panel-header').hide();

  $('.files-grid-view').addClass('hidden');
  $('.fm-blocks-view').addClass('hidden');
  $('.contacts-grid-view').addClass('hidden');
  $('.fm-chat-block').addClass('hidden');
  $('.fm-contacts-blocks-view').addClass('hidden');
  $('.fm-right-files-block').removeClass('hidden');
  $('.nw-conversations-item').removeClass('selected');
  M.onSectionUIOpen('conversations');

  if (Object.keys(self.chats).length === 0 || Object.keys(ChatdIntegration._loadingChats).length !== 0) {
    $('.fm-empty-conversations').removeClass('hidden');
  } else {
    $('.fm-empty-conversations').addClass('hidden');

    if (self.lastOpenedChat && self.chats[self.lastOpenedChat] && self.chats[self.lastOpenedChat]._leaving !== true && self.chats[self.lastOpenedChat].isDisplayable()) {
      // have last opened chat, which is active
      self.chats[self.lastOpenedChat].setActive();
      self.chats[self.lastOpenedChat].show();
      return self.chats[self.lastOpenedChat];
    } else {
      if (self.chats.length > 0) {
        if (!self.displayArchivedChats) {
          return self.showLastActive();
        } else {
          return false;
        }
      } else {
        $('.fm-empty-conversations').removeClass('hidden');
      }
    }
  }
};
/**
 * Inject the list of attachments for the current room into M.v
 * @param {String} roomId The room identifier
 */


Chat.prototype.setAttachments = function (roomId) {
  'use strict';

  if (M.chat) {
    if (d) {
      console.assert(this.chats[roomId] && this.chats[roomId].isCurrentlyActive, 'check this...');
    } // Reset list of attachments


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
/**
 * Enqueue image loading.
 * @param {MegaNode} n The attachment node
 * @private
 */


Chat.prototype._enqueueImageLoad = function (n) {
  'use strict'; // check whether the node is cached from the cloud side

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

  var cached = n.src; // check the node does have a file attribute, this should be implicit
  // invoking this function but we may want to load originals later.

  if (String(n.fa).indexOf(':1*') > 0) {
    var load = false;
    var dedup = true; // Only load the image if its attribute was not seen before
    // TODO: also dedup from matching 'n.hash' checksum (?)

    if (this._imageAttributeCache[n.fa]) {
      this._imageAttributeCache[n.fa].push(n.ch);
    } else {
      this._imageAttributeCache[n.fa] = [n.ch];
      load = !cached;
    } // Only load the image once if its node is posted around several rooms


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
/**
 * Actual code that is throttled and does load a bunch of queued images
 * @private
 */


Chat.prototype._doLoadImages = function () {
  "use strict";

  var self = this;
  var imagesToBeLoaded = self._imagesToBeLoaded;
  self._imagesToBeLoaded = Object.create(null);

  var chatImageParser = function chatImageParser(h, data) {
    var n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;

    if (data !== 0xDEAD) {
      // Set the attachment node image source
      n.src = mObjectURL([data.buffer || data], 'image/jpeg');
      n.srcBuffer = data;
    } else if (d) {
      console.warn('Failed to load image for %s', h, n);
    }

    self._doneLoadingImage(h);
  };

  var onSuccess = function onSuccess(ctx, origNodeHandle, data) {
    chatImageParser(origNodeHandle, data);
  };

  var onError = function onError(origNodeHandle) {
    chatImageParser(origNodeHandle, 0xDEAD);
  };

  api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);
  [imagesToBeLoaded].forEach(function (obj) {
    Object.keys(obj).forEach(function (handle) {
      self._startedLoadingImage(handle);
    });
  });
};
/**
 * Retrieve all image loading (deduped) nodes for a handle
 * @param {String} h The node handle
 * @param {Object} [src] Empty object to store the source node that triggered the load.
 * @private
 */


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
/**
 * Called when an image starts loading from the preview servers
 * @param {String} h The node handle being loaded.
 * @private
 */


Chat.prototype._startedLoadingImage = function (h) {
  "use strict";

  var nodes = this._getImageNodes(h);

  for (var i = nodes.length; i--;) {
    var n = nodes[i];

    if (!n.src && n.seen !== 2) {
      // to be used in the UI with the next design changes.
      var imgNode = document.getElementById(n.ch);

      if (imgNode && (imgNode = imgNode.querySelector('img'))) {
        imgNode.parentNode.parentNode.classList.add('thumb-loading');
      }
    }
  }
};
/**
 * Internal - called when an image is loaded in previews
 * @param {String} h The node handle being loaded.
 * @private
 */


Chat.prototype._doneLoadingImage = function (h) {
  "use strict";

  var setSource = function setSource(n, img, src) {
    var message = n.mo;

    img.onload = function () {
      img.onload = null;
      n.srcWidth = this.naturalWidth;
      n.srcHeight = this.naturalHeight; // Notify changes...

      if (message) {
        message.trackDataChange();
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
    } // Set the same image data/uri across all affected (same) nodes


    if (src) {
      n.src = src;

      if (root.srcBuffer && root.srcBuffer.byteLength) {
        n.srcBuffer = root.srcBuffer;
      } // Cache the loaded image in the cloud side for reuse


      if (n.srcBuffer && !previews[n.h] && is_image3(n)) {
        preqs[n.h] = 1;
        previewimg(n.h, n.srcBuffer, 'image/jpeg');
        previews[n.h].fromChat = Date.now();
      }
    } // Remove the reference to the message since it's no longer needed.


    delete n.mo;
  }
};
/**
 * Show the last active chat room
 * @returns {*}
 */


Chat.prototype.showLastActive = function () {
  var self = this;

  if (self.chats.length > 0 && self.allChatsHadInitialLoadedHistory()) {
    var sortedConversations = obj_values(self.chats.toJS());
    sortedConversations.sort(M.sortObjFn("lastActivity", -1));
    var index = 0; // find next active chat , it means a chat which is active or archived chat opened in the active chat list.

    while (index < sortedConversations.length && !sortedConversations[index].isDisplayable()) {
      index++;
    }

    if (index < sortedConversations.length) {
      var room = sortedConversations[index];

      if (!room.isActive()) {
        room.setActive();
        room.show();
      }

      return room;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

Chat.prototype.allChatsHadLoadedHistory = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = 0; i < chatIds.length; i++) {
    var room = self.chats[chatIds[i]];

    if (room.isLoading()) {
      return false;
    }
  }

  return true;
};

Chat.prototype.allChatsHadInitialLoadedHistory = function () {
  var self = this;
  var chatIds = self.chats.keys();

  for (var i = 0; i < chatIds.length; i++) {
    var room = self.chats[chatIds[i]];

    if (room.initialMessageHistLoaded.state() === 'pending') {
      return false;
    }
  }

  return true;
};
/**
 * Tries to find if there is a opened (private) chat room with user `h`
 *
 * @param h {string} hash of the user
 * @returns {false|ChatRoom}
 */


Chat.prototype.getPrivateRoom = function (h) {
  'use strict';

  return this.chats[h] || false;
};

Chat.prototype.createAndShowPrivateRoomFor = function (h) {
  'use strict';

  var room = this.getPrivateRoom(h);

  if (room) {
    _chatui(h);

    return MegaPromise.resolve(room);
  }

  var promise = megaChat.smartOpenChat(h);
  promise.done(function (room) {
    room.setActive();
  });
  return promise;
};

Chat.prototype.createAndShowGroupRoomFor = function (contactHashes, topic, keyRotation, createChatLink) {
  this.trigger('onNewGroupChatRequest', [contactHashes, {
    'topic': topic || "",
    'keyRotation': keyRotation,
    'createChatLink': createChatLink
  }]);
};
/**
 * Debug/dev/testing function
 *
 * @private
 */


Chat.prototype._destroyAllChatsFromChatd = function () {
  var self = this;
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
          // request identifier
          "id": chatRoomMeta.id,
          // chat id
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
/**
 * Warning: The data returned by this function is loaded directly and not hash-checked like in the secureboot.js. So
 * please use carefully and escape EVERYTHING that is loaded thru this.
 *
 * @param name
 * @returns {MegaPromise}
 */


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
    // reduce the XHRs by one, by simply moving the categories_v2.json to be embedded inline here:
    self._emojiData[name] = ["symbols", "activity", "objects", "nature", "food", "people", "travel", "flags"]; // note, when updating categories_vX.json, please update this ^^ manually.

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
/**
 * Method for checking if an emoji by that slug exists
 * @param slug
 */


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
/**
 * A simple alias that returns PresencedIntegration's presence for the current user
 *
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */


Chat.prototype.getMyPresence = function () {
  if (u_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getMyPresence();
  } else {
    return;
  }
};
/**
 * A simple alias that returns PresencedIntegration's presence for the a specific user
 *
 * @param {String} user_handle the target user's presence
 * @returns {Number|undefined} UserPresence.PRESENCE.* or undefined for offline/unknown presence
 */


Chat.prototype.getPresence = function (user_handle) {
  if (user_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getPresence(user_handle);
  } else {
    return;
  }
};

Chat.prototype.getPresenceAsCssClass = function (user_handle) {
  var presence = this.getPresence(user_handle);
  return this.presenceStringToCssClass(presence);
};
/**
 * Utility for converting UserPresence.PRESENCE.* to css class strings
 *
 * @param {Number|undefined} presence
 * @returns {String}
 */


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
/**
 * Internal method for generating unique (and a bit randomised) message ids
 *
 * @param {string} roomId
 * @param {string} messageAndMeta
 * @returns {string}
 */


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

  var found = false;
  self.chats.forEach(function (chatRoom) {
    if (!found && chatRoom.chatId === chatdId) {
      found = chatRoom;
      return false;
    }
  });
  return found ? found : false;
};
/**
 * Returns true if there is a chat room with an active (started/starting) call.
 *
 * @returns {boolean}
 */


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
/**
 * Creates a 1on1 chat room and opens the send files from cloud drive dialog automatically
 *
 * @param {string} user_handle
 */


Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
  'use strict';

  this.smartOpenChat(user_handle).then(function (room) {
    room.setActive();
    $(room).trigger('openSendFilesDialog');
  }).catch(this.logger.error.bind(this.logger));
};
/**
 * Wrapper around Chat.openChat and ChatRoom.attachNodes as a single helper function
 * @param {Array|String} targets Where to send the nodes
 * @param {Array} nodes The list of nodes to attach into the room(s)
 * @returns {MegaPromise}
 * @see Chat.openChat
 * @see ChatRoom.attachNodes
 */


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
  var chats = this.chats;
  var recentContacts = {};
  var promises = [];
  var finishedLoadingChats = {};
  var loadingMoreChats = {}; // this should use potential "Incoming shares" managed .ts, but it seems it doesn't work and its only updated
  // by the chat, but in a different algorithm (that won't be UX-effective enough for showing top3-5 "recent"
  // contacts, so its disabled for now.
  // PS: .ts is used for "Last interaction", which is different (semantically) then "Recent(s)"
  // M.u.forEach(function(contact) {
  //     if (contact.c === 1 && contact.ts) {
  //         recentContacts[contact.h] = {'userId': contact.h, 'ts': contact.ts};
  //     }
  // });

  var _calculateLastTsFor = function _calculateLastTsFor(r, maxMessages) {
    var msgIds = r.messagesBuff.messages.keys().reverse();
    msgIds = msgIds.splice(0, maxMessages);
    msgIds.forEach(function (msgId) {
      var msg = r.messagesBuff.getMessageById(msgId);
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
    });
  };

  chats.forEach(function (r) {
    /**
     * @type ChatRoom
     */
    // r = r;
    var _histDecryptedCb = function _histDecryptedCb(r) {
      // console.error("loading?", r.chatId, r.messagesBuff.messages.length);
      if (!loadingMoreChats[r.chatId] && r.messagesBuff.messages.length < 32 && r.messagesBuff.haveMoreHistory()) {
        // console.error("loading:", r.chatId);
        loadingMoreChats[r.chatId] = true;
        r.messagesBuff.retrieveChatHistory(false);
      } else {
        $(r).unbind('onHistoryDecrypted.recent');

        _calculateLastTsFor(r, 32);

        delete loadingMoreChats[r.chatId];
        finishedLoadingChats[r.chatId] = true;
      }
    };

    if (r.isLoading()) {
      var promise = createTimeoutPromise(function () {
        return finishedLoadingChats[r.chatId] === true;
      }, 500, 10000, undefined, undefined, r.roomId + "FrequentsLoading");
      finishedLoadingChats[r.chatId] = false;
      promises.push(promise);
      $(r).rebind('onHistoryDecrypted.recent', _histDecryptedCb.bind(this, r));
    } else if (r.messagesBuff.messages.length < 32 && r.messagesBuff.haveMoreHistory()) {
      // console.error("loading:", r.chatId);
      loadingMoreChats[r.chatId] = true;
      finishedLoadingChats[r.chatId] = false;
      $(r).rebind('onHistoryDecrypted.recent', _histDecryptedCb.bind(this, r));
      var promise = createTimeoutPromise(function () {
        return finishedLoadingChats[r.chatId] === true;
      }, 500, 15000);
      promises.push(promise);
      r.messagesBuff.retrieveChatHistory(false);
    } else {
      _calculateLastTsFor(r, 32);
    }

    ; // console.error(r.getRoomTitle(), r.messagesBuff.messages.length);
  });
  var masterPromise = new MegaPromise();
  MegaPromise.allDone(promises).always(function () {
    var result = obj_values(recentContacts).sort(function (a, b) {
      return a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0;
    });
    masterPromise.resolve(result.reverse());
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

Chat.prototype.safeForceUpdate = function () {
  if (this.$conversationsAppInstance) {
    var $cai = this.$conversationsAppInstance;

    try {
      $cai.forceUpdate();
    } catch (e) {
      console.error("safeForceUpdate: ", $cai, e);
    }
  }
};

Chat.prototype.loginOrRegisterBeforeJoining = function (chatHandle, forceRegister, forceLogin, notJoinReq) {
  if (!chatHandle && (page === 'chat' || page.indexOf('chat') > -1)) {
    chatHandle = getSitePath().split("chat/")[1].split("#")[0];
  }

  assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');
  var chatKey = "#" + window.location.hash.split("#").pop();

  var doShowLoginDialog = function doShowLoginDialog() {
    mega.ui.showLoginRequiredDialog({
      minUserType: 3,
      skipInitialDialog: 1
    }).done(function () {
      if (page !== 'login') {
        if (!notJoinReq) {
          localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
        }

        window.location.reload();
      }
    });
  };

  var doShowRegisterDialog = function doShowRegisterDialog() {
    mega.ui.showRegisterDialog({
      title: l[5840],
      onCreatingAccount: function onCreatingAccount() {},
      onLoginAttemptFailed: function onLoginAttemptFailed(registerData) {
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
        if (!notJoinReq) {
          localStorage.awaitingConfirmationAccount = JSON.stringify(registerData);
          localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
        } // If true this means they do not need to confirm their email before continuing to step 2


        mega.ui.sendSignupLinkDialog(registerData, false);
        megaChat.destroy();
      }
    });
  };

  if (u_handle && u_handle !== "AAAAAAAAAAA") {
    // logged in/confirmed account in another tab!
    if (!notJoinReq) {
      localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey]);
    }

    window.location.reload();
    return;
  }

  if (forceRegister) {
    return doShowRegisterDialog();
  } else if (forceLogin) {
    return doShowLoginDialog();
  } // no forcing, proceed w/ regular logic.


  if (u_wasloggedin()) {
    doShowLoginDialog();
  } else {
    doShowRegisterDialog();
  }
};

window.Chat = Chat;
window.chatui = _chatui;

if (false) {}

/* harmony default export */ __webpack_exports__["default"] = ({
  Chat: Chat,
  chatui: _chatui
});

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



var ReactPropTypesSecret = __webpack_require__(20);

function emptyFunction() {}
function emptyFunctionWithReset() {}
emptyFunctionWithReset.resetWarningCache = emptyFunction;

module.exports = function() {
  function shim(props, propName, componentName, location, propFullName, secret) {
    if (secret === ReactPropTypesSecret) {
      // It is still safe when called from React.
      return;
    }
    var err = new Error(
      'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
      'Use PropTypes.checkPropTypes() to call them. ' +
      'Read more at http://fb.me/use-check-prop-types'
    );
    err.name = 'Invariant Violation';
    throw err;
  };
  shim.isRequired = shim;
  function getShim() {
    return shim;
  };
  // Important!
  // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
  var ReactPropTypes = {
    array: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,

    any: shim,
    arrayOf: getShim,
    element: shim,
    elementType: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim,
    exact: getShim,

    checkPropTypes: emptyFunctionWithReset,
    resetWarningCache: emptyFunction
  };

  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

module.exports = ReactPropTypesSecret;


/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var utils = __webpack_require__(22);

var React = __webpack_require__(0);

var ConversationPanelUI = __webpack_require__(16);
/**
 * Class used to represent a MUC Room in which the current user is present
 *
 * @param megaChat {Chat}
 * @param roomId
 * @param type {String} only "private" is supported for now
 * @param users {Array}
 * @param ctime {Integer} unix time
 * @param [lastActivity] {Integer} unix time
 * @returns {ChatRoom}
 * @constructor
 */


var ChatRoom = function ChatRoom(megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI, publicChatHandle, publicChatKey, ck) {
  var self = this;
  this.logger = MegaLogger.getLogger("room[" + roomId + "]", {}, megaChat.logger);
  this.megaChat = megaChat;
  MegaDataObject.attachToExistingJSObject(this, {
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
  }, true);
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
  self.members = {};

  if (type === "private") {
    users.forEach(function (userHandle) {
      self.members[userHandle] = 3;
    });
  } else {
    users.forEach(function (userHandle) {
      // while loading, set permissions to read only
      self.members[userHandle] = 0;
    });
  }

  this.options = {
    /**
     * Don't resend any messages in the queue, if older then Xs
     */
    'dontResendAutomaticallyQueuedMessagesOlderThen': 1 * 60,

    /**
     * The maximum time allowed for plugins to set the state of the room to PLUGINS_READY
     */
    'pluginsReadyTimeout': 60000,
    // XX: Because of the middle earth's internet, this should have been increased :)

    /**
     * Default media options
     */
    'mediaOptions': {
      audio: true,
      video: true
    }
  };
  this.setState(ChatRoom.STATE.INITIALIZED);
  this.isCurrentlyActive = false; // Events

  if (d) {
    this.rebind('onStateChange.chatRoomDebug', function (e, oldState, newState) {
      self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));
    });
  }

  self.rebind('onStateChange.chatRoom', function (e, oldState, newState) {
    if (newState === ChatRoom.STATE.READY && !self.isReadOnly()) {
      if (self.chatd && self.isOnline() && self.chatIdBin) {
        // this should never happen, but just in case...
        self.getChatIdMessages().resend();
      }
    }
  }); // activity on a specific room (show, hidden, got new message, etc)

  self.rebind('onMessagesBuffAppend.lastActivity', function (e, msg) {
    if (anonymouschat) {
      return;
    }

    var ts = msg.delay ? msg.delay : msg.ts;

    if (!ts) {
      return;
    } // set last seen/active/green


    var contactForMessage = msg && Message.getContactForMessage(msg);

    if (contactForMessage && contactForMessage.u !== u_handle) {
      if (!contactForMessage.ats || contactForMessage.ats < ts) {
        contactForMessage.ats = ts;
      }
    }

    if (self.lastActivity && self.lastActivity >= ts) {
      // this is an old message, DON'T update the lastActivity.
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
  }); // onMembersUpdated core room data management

  self.rebind('onMembersUpdated.coreRoomDataMngmt', function (e, eventData) {
    if (self.state === ChatRoom.STATE.LEFT && eventData.priv >= 0 && eventData.priv < 255) {
      // joining
      self.membersLoaded = false;
      self.setState(ChatRoom.STATE.JOINING, true);
    }

    var queuedMembersUpdatedEvent = false;

    if (self.membersLoaded === false) {
      if (eventData.priv >= 0 && eventData.priv < 255) {
        var addParticipant = function addParticipant() {
          // add group participant in strongvelope
          self.protocolHandler.addParticipant(eventData.userId); // also add to our list

          self.members[eventData.userId] = eventData.priv;

          ChatdIntegration._ensureNamesAreLoaded([eventData.userId], self.publicChatHandle);

          self.trigger('onMembersUpdatedUI', eventData);
        };

        ChatdIntegration._waitForProtocolHandler(self, addParticipant);

        queuedMembersUpdatedEvent = true;
      }
    } else if (eventData.priv === 255 || eventData.priv === -1) {
      var deleteParticipant = function deleteParticipant() {
        if (eventData.userId === u_handle) {
          // remove all participants from the room.
          Object.keys(self.members).forEach(function (userId) {
            // remove group participant in strongvelope
            self.protocolHandler.removeParticipant(userId); // also remove from our list

            delete self.members[userId];
          });
        } else {
          // remove group participant in strongvelope
          self.protocolHandler.removeParticipant(eventData.userId); // also remove from our list

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
  /**
   * Manually proxy contact related data change events, for more optimal UI rerendering.
   */

  var membersSnapshot = {};
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
    }

    Object.keys(membersSnapshot).forEach(function (u_h) {
      var contact = M.u[u_h];

      if (contact) {
        contact.removeChangeListener(membersSnapshot[u_h]);

        if (!self.members[u_h]) {
          roomRequiresUpdate = true;
        }
      }

      delete membersSnapshot[u_h];
    });
    Object.keys(self.members).forEach(function (u_h) {
      var contact = M.u[u_h];

      if (contact && contact.addChangeListener) {
        membersSnapshot[u_h] = contact.addChangeListener(function () {
          self.trackDataChange.apply(self, arguments);
        });
      }
    });

    if (roomRequiresUpdate) {
      self.trackDataChange();
    }
  });
  self.getParticipantsExceptMe().forEach(function (userHandle) {
    var contact = M.u[userHandle];

    if (contact) {
      getLastInteractionWith(contact.u);
    }
  }); // This line of code should always be called, no matter what. Plugins rely on onRoomCreated
  // so that they can hook/add event listeners to newly created rooms.

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
  self.rebind('onCallParticipantsUpdated.chatRoom', function (e, userid, clientid, participants) {
    self.callParticipantsUpdated();
  });
  self.rebind('onClientLeftCall.chatRoom', self.callParticipantsUpdated.bind(self));
  self.rebind('onClientJoinedCall.chatRoom', self.callParticipantsUpdated.bind(self));
  self.initialMessageHistLoaded = new MegaPromise();
  self._initialMessageHistLoadedTimer = null;
  self.initialMessageHistLoaded.always(function () {
    self.unbind('onMarkAsJoinRequested.initHist');
    self.unbind('onHistoryDecrypted.initHist');
    self.unbind('onMessagesHistoryDone.initHist');
  });

  var _historyIsAvailable = function _historyIsAvailable() {
    if (self.initialMessageHistLoaded.state() === 'pending') {
      self.initialMessageHistLoaded.resolve();

      if (self._initialMessageHistLoadedTimer) {
        clearTimeout(self._initialMessageHistLoadedTimer);
      }
    }
  };

  self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
  self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);
  self.rebind('onMarkAsJoinRequested.initHist', function (e, eventData) {
    self._initialMessageHistLoadedTimer = setTimeout(function () {
      if (d) {
        console.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
      }

      self.initialMessageHistLoaded.reject();
    }, 5000);
  });
  this.membersSetFromApi = new ChatRoom.MembersSet(this);

  if (publicChatHandle) {
    this.onPublicChatRoomInitialized();
  }

  return this;
};
/**
 * Add support for .on, .bind, .unbind, etc
 */


makeObservable(ChatRoom);
/**
 * Room states
 *
 * @type {{INITIALIZED: number,
           JOINING: number,
           JOINED: number,
           WAITING_FOR_PARTICIPANTS: number,
           PARTICIPANTS_HAD_JOINED: number,
           READY: number,
           LEAVING: number,
           LEFT: number}}
 */

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

ChatRoom.MembersSet.prototype.trackFromActionPacket = function (ap, isMcf) {
  var self = this;
  var apMembers = {};
  (ap.u || []).forEach(function (r) {
    apMembers[r.u] = r.p;
  }); // first verify and compare .u

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
/**
 * @returns An array with the userid+clientid (binary) of the call participants in this room
 * If there is no call or there is no chatd chat with this chatid, returns an empty array
 */


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
/**
 * Check whether a chat is archived or not.
 *
 * @returns {Boolean}
 */


ChatRoom.prototype.isArchived = function () {
  var self = this;
  return self.flags & ChatRoom.ARCHIVED;
};
/**
 * Check whether a chat is displayable.
 *
 * @returns {Boolean}
 */


ChatRoom.prototype.isDisplayable = function () {
  var self = this;
  return self.showArchived === true || !self.isArchived() || self.callManagerCall && self.callManagerCall.isActive();
};
/**
 * Save chat into info fmdb.
 *
 */


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
        'g': self.type === "group" ? 1 : 0,
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
/**
 * Save the chat info into fmdb.
 * @param f {binary} new flags
 * @param updateUI {Boolen} flag to indicate whether to update UI.
 */


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
/**
 * Convert state to text (helper function)
 *
 * @param state {Number}
 * @returns {String}
 */


ChatRoom.stateToText = function (state) {
  var txt = null;
  $.each(ChatRoom.STATE, function (k, v) {
    if (state === v) {
      txt = k;
      return false; // break
    }
  });
  return txt;
};
/**
 * Change the state of this room
 *
 * @param newState {ChatRoom.STATE} the new state
 * @param [isRecover] {Boolean}
 */


ChatRoom.prototype.setState = function (newState, isRecover) {
  var self = this;
  assert(newState, 'Missing state');

  if (newState === self.state) {
    self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
    return;
  }

  if (self.state) {
    // if not === null, e.g. setting to INITIALIZED
    // only allow state changes to be increasing the .state value (5->10->....150...) with the exception when a
    // PLUGINS_PAUSED is the current or new state
    assert(newState === ChatRoom.STATE.JOINING && isRecover || newState === ChatRoom.STATE.INITIALIZED && isRecover || newState > self.state, 'Invalid state change. Current:' + ChatRoom.stateToText(self.state) + "to" + ChatRoom.stateToText(newState));
  }

  var oldState = self.state;
  self.state = newState;
  self.trigger('onStateChange', [oldState, newState]);
};
/**
 * Returns current state as text
 *
 * @returns {String}
 */


ChatRoom.prototype.getStateAsText = function () {
  var self = this;
  return ChatRoom.stateToText(self.state);
};
/**
 * Change/set the type of the room
 *
 * @param type
 */


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
/**
 * Get all participants in a chat room.
 *
 * @returns {Array}
 */


ChatRoom.prototype.getParticipants = function () {
  var self = this;
  return Object.keys(self.members);
};
/**
 * Get a list of the current participants for this room, excluding my handle (or if provided, userHandles
 * would be used instead of the current room participants).
 *
 * @param [userHandles] {Array}
 * @returns {Array}
 */


ChatRoom.prototype.getParticipantsExceptMe = function (userHandles) {
  var self = this;

  if (!userHandles) {
    userHandles = self.getParticipants();
  }

  var handlesWithoutMyself = clone(userHandles);
  var index = $.inArray(u_handle, handlesWithoutMyself);

  if (index >= 0) {
    handlesWithoutMyself.splice($.inArray(u_handle, handlesWithoutMyself), 1);
  }

  return handlesWithoutMyself;
};
/**
 * Get room title
 *
 * @returns {string}
 */


ChatRoom.prototype.getRoomTitle = function (ignoreTopic, encapsTopicInQuotes) {
  var self = this;

  if (self.type === "private") {
    var participants = self.getParticipantsExceptMe();
    return M.getNameByHandle(participants[0]) || "";
  } else {
    if (!ignoreTopic && self.topic && self.topic.substr) {
      return (encapsTopicInQuotes ? '"' : "") + self.topic.substr(0, 30) + (encapsTopicInQuotes ? '"' : "");
    }

    var participants = self.members && Object.keys(self.members).length > 0 ? Object.keys(self.members) : [];
    var names = [];
    participants.forEach(function (contactHash) {
      if (contactHash && M.u[contactHash] && contactHash !== u_handle) {
        names.push(M.u[contactHash] ? M.getNameByHandle(contactHash) : "non contact");
      }
    });
    return names.length > 0 ? names.join(", ") : __(l[19077]).replace('%s1', new Date(self.ctime * 1000).toLocaleString());
  }
};
/**
 * Set the room topic
 * @param {String} newTopic
 * @param allowEmpty
 */


ChatRoom.prototype.setRoomTitle = function (newTopic, allowEmpty) {
  var self = this;
  newTopic = allowEmpty ? newTopic : String(newTopic);
  var masterPromise = new MegaPromise();

  if ((allowEmpty || $.trim(newTopic).length > 0) && newTopic !== self.getRoomTitle()) {
    self.scrolledToBottom = true;
    var participants = self.protocolHandler.getTrackedParticipants();
    var promises = [];
    promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

    var _runUpdateTopic = function _runUpdateTopic() {
      // self.state.value
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
/**
 * Leave this chat room
 *
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 * @returns {undefined|Deferred}
 */


ChatRoom.prototype.leave = function (triggerLeaveRequest) {
  var self = this;
  self._leaving = true;
  self._closing = triggerLeaveRequest;
  self.topic = null;

  if (triggerLeaveRequest) {
    if (self.type === "group" || self.type === "public") {
      $(self).trigger('onLeaveChatRequested');
    } else {
      self.logger.error("Can't leave room of type: " + self.type);
      return;
    }
  }

  if (self.roomId.indexOf("@") != -1) {
    if (self.state !== ChatRoom.STATE.LEFT) {
      self.setState(ChatRoom.STATE.LEAVING);
      self.setState(ChatRoom.STATE.LEFT);
    } else {
      return;
    }
  } else {
    self.setState(ChatRoom.STATE.LEFT);
  }
};
/**
 * Archive this chat room
 *
 */


ChatRoom.prototype.archive = function () {
  var self = this;
  var mask = 0x01;
  var flags = ChatRoom.ARCHIVED;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': mask,
    'f': flags,
    'v': Chatd.VERSION
  }).done(function (r) {
    if (r === 0) {
      self.updateFlags(flags, true);
    }
  });
};
/**
 * Unarchive this chat room
 *
 */


ChatRoom.prototype.unarchive = function () {
  var self = this;
  var mask = 0x01;
  var flags = 0x00;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': mask,
    'f': flags,
    'v': Chatd.VERSION
  }).done(function (r) {
    if (r === 0) {
      self.updateFlags(flags, true);
    }
  });
};
/**
 * Destroy a room (leave + UI destroy + js cleanup)
 * @param [notifyOtherDevices] {boolean|undefined} true if you want to notify other devices, falsy value if you don't want action to be sent
 */


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
/**
 * Create a public handle of a chat
 * @param [d] {boolean|undefined} if d is specified, then it will delete the public chat link.
 * @param [callback] {function} call back function.
 */


ChatRoom.prototype.updatePublicHandle = function (d, callback) {
  var self = this;
  return megaChat.plugins.chatdIntegration.updateChatPublicHandle(self.chatId, d, callback);
};
/**
 * Join a chat via a public chat handle
 */


ChatRoom.prototype.joinViaPublicHandle = function () {
  var self = this;

  if ((!self.members.hasOwnProperty(u_handle) || self.members[u_handle] === -1) && self.type === "public" && self.publicChatHandle) {
    return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
  }
};
/**
 * Switch off the public mode of an open chat.
 */


ChatRoom.prototype.switchOffPublicMode = function () {
  var self = this;
  var participants = self.protocolHandler.getTrackedParticipants();
  var promises = [];
  promises.push(ChatdIntegration._ensureKeysAreLoaded(undefined, participants));

  var onSwitchDone = function onSwitchDone() {
    self.protocolHandler.switchOffOpenMode();
  };

  var _runSwitchOffPublicMode = function _runSwitchOffPublicMode() {
    // self.state.value
    var topic = null;

    if (self.topic) {
      topic = self.protocolHandler.embeddedEncryptTo(self.topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, true, false
      /* hardcoded to false, to ensure the encryption DOES includes keys in the new topic */
      );
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
/**
 * Show UI elements of this room
 */


ChatRoom.prototype.show = function () {
  var self = this;

  if (self.isCurrentlyActive) {
    if (!self.messagesBlockEnabled && self.callManagerCall && self.getUnreadCount() > 0) {
      $(self).trigger('toggleMessages');
    }

    return false;
  }

  self.megaChat.hideAllChats();
  self.isCurrentlyActive = true;
  self.lastShownInUI = Date.now();
  $('.files-grid-view').addClass('hidden');
  $('.fm-blocks-view').addClass('hidden');
  $('.contacts-grid-view').addClass('hidden');
  $('.fm-contacts-blocks-view').addClass('hidden');
  $('.fm-right-files-block.in-chat').removeClass('hidden');
  $('.fm-right-files-block:not(.in-chat)').addClass('hidden'); //$('.nw-conversations-item').removeClass('selected');

  if (self.megaChat.currentlyOpenedChat && self.megaChat.currentlyOpenedChat != self.roomId) {
    var oldRoom = self.megaChat.getCurrentRoom();

    if (oldRoom) {
      oldRoom.hide();
    }
  }

  M.onSectionUIOpen('conversations');
  self.megaChat.currentlyOpenedChat = self.roomId;
  self.megaChat.lastOpenedChat = self.roomId;

  if (self.isArchived()) {
    self.showArchived = true;
  } else {
    self.showArchived = false;
  }

  self.megaChat.setAttachments(self.roomId);
  self.trigger('activity');
  self.trigger('onChatShown');

  if (self.type !== 'public') {
    $('.section.conversations').addClass('privatechat');
  } else {
    $('.section.conversations').removeClass('privatechat');
  }

  Soon(function () {
    megaChat.chats.trackDataChange();
  });
  $('.conversation-panel[data-room-id="' + self.chatId + '"]').removeClass('hidden');
  $.tresizer();
  self.scrollToChat();
};

ChatRoom.prototype.scrollToChat = function () {
  if (megaChat.$chatTreePanePs) {
    var $li = $('ul.conversations-pane li#conversation_' + this.roomId + '');

    if ($li && $li[0]) {
      var pos = $li[0].offsetTop;

      if (!megaChat.$chatTreePanePs.inViewport($li[0])) {
        megaChat.$chatTreePanePs.doProgramaticScroll(pos, true);
        this._scrollToOnUpdate = false;
      }
    } else {
      this._scrollToOnUpdate = true;
    }
  }
};
/**
 * Returns true/false if the current room is currently active (e.g. visible)
 */


ChatRoom.prototype.isActive = function () {
  return document.hasFocus() && this.isCurrentlyActive;
};
/**
 * Shows the current room (changes url if needed)
 */


ChatRoom.prototype.setActive = function () {
  // We need to delay this, since it can get called BY openFolder and it would then call again openFolder, which
  // would cause .currentdirid to not be set correctly.
  var self = this;
  Soon(function () {
    loadSubPage(self.getRoomUrl());
  });
};
/**
 * Returns true if messages are still being retrieved from chatd OR in decrypting state
 * (e.g. nothing to render in the messages history pane yet)
 * @returns {MegaPromise|boolean}
 */


ChatRoom.prototype.isLoading = function () {
  var self = this;
  var mb = self.messagesBuff;
  return mb.messagesHistoryIsLoading() || mb.isDecrypting && mb.isDecrypting.state() === 'pending';
};
/**
 * Returns relative url for this room
 *
 * @returns {string}
 */


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
/**
 * If this is not the currently active room, then this method will navigate the user to this room (using window.location)
 */


ChatRoom.prototype.activateWindow = function () {
  var self = this;
  loadSubPage(self.getRoomUrl());
};
/**
 * Hide the UI elements of this room
 */


ChatRoom.prototype.hide = function () {
  var self = this;
  self.isCurrentlyActive = false;
  self.lastShownInUI = Date.now();

  if (self.megaChat.currentlyOpenedChat === self.roomId) {
    self.megaChat.currentlyOpenedChat = null;
  }

  $('.conversation-panel[data-room-id="' + self.chatId + '"]').addClass('hidden');
};
/**
 * Append message to the UI of this room.
 * Note: This method will also log the message, so that later when someone asks for message sync this log will be used.
 *
 * @param message {Message|ChatDialogMessage}
 * @returns {boolean}
 */


ChatRoom.prototype.appendMessage = function (message) {
  var self = this;

  if (message.deleted) {
    // deleted messages should not be .append-ed
    return false;
  }

  if (message.getFromJid && message.getFromJid() === self.roomId) {
    return false; // dont show any system messages (from the conf room)
  }

  if (self.shownMessages[message.messageId]) {
    return false;
  }

  if (!message.orderValue) {
    var mb = self.messagesBuff; // append at the bottom

    if (mb.messages.length > 0) {
      var prevMsg = mb.messages.getItem(mb.messages.length - 1);

      if (!prevMsg) {
        self.logger.error('self.messages got out of sync...maybe there are some previous JS exceptions that caused that? ' + 'note that messages may be displayed OUT OF ORDER in the UI.');
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
/**
 * Returns the actual DOM Element from the Mega's main navigation (tree) that is related to this chat room.
 *
 * @returns {*|jQuery|HTMLElement}
 */


ChatRoom.prototype.getNavElement = function () {
  var self = this;
  return $('.nw-conversations-item[data-room-id="' + self.chatId + '"]');
};
/**
 * Will check if any of the plugins requires a message to be 'queued' instead of sent.
 *
 * @param [message] {Object} optional message object (currently not used)
 * @returns {boolean}
 */


ChatRoom.prototype.arePluginsForcingMessageQueue = function (message) {
  var self = this;
  var pluginsForceQueue = false;
  $.each(self.megaChat.plugins, function (k) {
    if (self.megaChat.plugins[k].shouldQueueMessage) {
      if (self.megaChat.plugins[k].shouldQueueMessage(self, message) === true) {
        pluginsForceQueue = true;
        return false; // break
      }
    }
  });
  return pluginsForceQueue;
};
/**
 * Send message to this room
 *
 * @param message {String}
 * @param [meta] {Object}
 */


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
/**
 * This method will:
 * - eventually (if the user is connected) try to send this message to the chatd server
 * - mark the message as sent or unsent (if the user is not connected)
 *
 * @param messageObject {Message}
 */


ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
  var self = this;
  var megaChat = this.megaChat;
  megaChat.trigger('onPreBeforeSendMessage', messageObject);
  megaChat.trigger('onBeforeSendMessage', messageObject);
  megaChat.trigger('onPostBeforeSendMessage', messageObject);
  return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject);
};
/**
 * Internal method to notify the server that the specified `nodeids` are sent/shared to `users`
 * @param nodeids {Array}
 * @param users {Array}
 * @private
 */


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
/**
 * Attach/share (send as message) file/folder nodes to the chat
 * @param ids
 */


ChatRoom.prototype.attachNodes = function (ids) {
  var self = this;
  var users = [];
  $.each(self.getParticipantsExceptMe(), function (k, v) {
    var contact = M.u[v];

    if (contact && contact.u) {
      users.push(contact.u);
    }
  });
  var $masterPromise = new MegaPromise();
  var waitingPromises = [];
  ids.forEach(function (nodeId) {
    var proxyPromise = new MegaPromise();

    if (M.d[nodeId] && M.d[nodeId].u !== u_handle) {
      // I'm not the owner of this file.
      // can be a d&d to a chat or Send to contact from a share
      M.myChatFilesFolder.get(true).then(function (myChatFilesFolder) {
        M.copyNodes([nodeId], myChatFilesFolder.h, false, new MegaPromise()).then(function (copyNodesResponse) {
          if (copyNodesResponse && copyNodesResponse[0]) {
            proxyPromise.linkDoneAndFailTo(self.attachNodes([copyNodesResponse[0]]));
          } else {
            proxyPromise.reject();
          }
        }).catch(function (err) {
          proxyPromise.reject(err);
        });
      }).catch(function (err) {
        proxyPromise.reject(err);
      });
    } else {
      self._sendNodes([nodeId], users).then(function () {
        var nodesMeta = [];
        var node = M.d[nodeId];
        nodesMeta.push({
          'h': node.h,
          'k': node.k,
          't': node.t,
          's': node.s,
          'name': node.name,
          'hash': node.hash,
          'fa': node.fa,
          'ts': node.ts
        }); // 1b, 1b, JSON

        self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify(nodesMeta));
        proxyPromise.resolve([nodeId]);
      }).catch(function (r) {
        proxyPromise.reject(r);
      });
    }

    waitingPromises.push(proxyPromise);
  });
  $masterPromise.linkDoneAndFailTo(MegaPromise.allDone(waitingPromises));
  return $masterPromise;
};

ChatRoom.prototype.onUploadStart = function (data) {
  var self = this;

  if (d) {
    self.logger.debug('onUploadStart', data);
  }
};

ChatRoom.prototype.uploadFromComputer = function () {
  $('#fileselect1').trigger('click');
};
/**
 * Attach/share (send as message) contact details
 * @param ids
 */


ChatRoom.prototype.attachContacts = function (ids) {
  var self = this;
  var nodesMeta = [];
  $.each(ids, function (k, nodeId) {
    var node = M.u[nodeId];
    var name = M.getNameByHandle(node.u);
    nodesMeta.push({
      'u': node.u,
      'email': node.m,
      'name': name || node.m
    });
  }); // 1b, 1b, JSON

  self.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify(nodesMeta));
};
/**
 * Get message by Id
 * @param messageId {string} message id
 * @returns {boolean}
 */


ChatRoom.prototype.getMessageById = function (messageId) {
  var self = this;
  var found = false;
  $.each(self.messagesBuff.messages, function (k, v) {
    if (v.messageId === messageId) {
      found = v; // break;

      return false;
    }
  });
  return found;
};
/**
 * Used to update the DOM element containing data about this room.
 * E.g. unread count
 */


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
/**
 * Returns the # of messages which are currently marked as unread (uses the chatNotifications plugin)
 *
 * @returns {Integer|undefined}
 */


ChatRoom.prototype.getUnreadCount = function () {
  var self = this;
  return self.messagesBuff.getUnreadCount();
};
/**
 * Re-join - safely join a room after connection error/interruption
 */


ChatRoom.prototype.recover = function () {
  var self = this;
  self.callRequest = null;

  if (self.state !== ChatRoom.STATE.LEFT) {
    self.membersLoaded = false;
    self.setState(ChatRoom.STATE.JOINING, true);
    self.megaChat.trigger("onRoomCreated", [self]); // re-initialise plugins

    return MegaPromise.resolve();
  } else {
    return MegaPromise.reject();
  }
};

ChatRoom._fnRequireParticipantKeys = function (fn, scope) {
  var origFn = fn;
  return function () {
    var self = scope || this;
    var args = toArray.apply(null, arguments);
    var participants = self.protocolHandler.getTrackedParticipants();
    return ChatdIntegration._ensureKeysAreLoaded(undefined, participants).done(function () {
      origFn.apply(self, args);
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
  // check if still contacts.
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
/**
 * Internal, utility function that would mark all contacts in a chat (specially for group chats), that I'd interacted
 * with them.
 */


ChatRoom.prototype.didInteraction = function (user_handle, ts) {
  var self = this;
  var newTs = ts || unixtime();

  if (user_handle === u_handle) {
    Object.keys(self.members).forEach(function (user_handle) {
      var contact = M.u[user_handle];

      if (contact && user_handle !== u_handle) {
        setLastInteractionWith(contact.u, "1:" + newTs);
      }
    });
  } else {
    var contact = M.u[user_handle];

    if (contact && user_handle !== u_handle) {
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
/**
 * Returns whether there is a call in the room that we can answer (1on1 or group) or join (group)
 * This is used e.g. to determine whether to display a small handset icon in the notification area
 * for the room in the LHP
 */


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
/**
 * Returns message id of the call started message that is currently active (optionally).
 * @param [ignoreActive] {Boolean} if not passed would skip the "active" check and just return last call started
 * @returns {Boolean}
 */


ChatRoom.prototype.getActiveCallMessageId = function (ignoreActive) {
  var self = this;

  if (!ignoreActive && !self.havePendingCall() && !self.haveActiveCall()) {
    return false;
  }

  var msgs = self.messagesBuff.messages;

  for (var i = msgs.length - 1; i >= 0; i--) {
    var msg = msgs.getItem(i);

    if (msg.dialogType === "remoteCallEnded") {
      // found remoteCallEnded before a call started...this doesn't make sense, halt.
      return false;
    }

    if (msg.dialogType === "remoteCallStarted") {
      return msg.messageId;
    }
  }
};

ChatRoom.prototype.callParticipantsUpdated = function ()
/* e, userid, clientid, participants */
{
  var self = this;
  var msgId = self.getActiveCallMessageId();

  if (!msgId) {
    // force last start call msg id to be retrieved.
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
  var autoLoginChatInfo = typeof localStorage.autoJoinOnLoginChat !== "undefined" ? JSON.parse(localStorage.autoJoinOnLoginChat) : false;

  if (self.type === "public" && autoLoginChatInfo && autoLoginChatInfo[0] === self.publicChatHandle) {
    if (unixtime() - 2 * 60 * 60 < autoLoginChatInfo[1]) {
      var doJoinEventually = function doJoinEventually(state) {
        if (state === ChatRoom.STATE.READY) {
          self.joinViaPublicHandle();
          localStorage.removeItem("autoJoinOnLoginChat");
          self.unbind('onStateChange.' + self.publicChatHandle);
        }
      };

      doJoinEventually(self.state);
      self.rebind('onStateChange.' + self.publicChatHandle, function (e, oldState, newState) {
        doJoinEventually(newState);
      });
    } else {
      // auto join expired.
      localStorage.removeItem("autoJoinOnLoginChat");
    }
  }
};

window.ChatRoom = ChatRoom;
/* harmony default export */ __webpack_exports__["default"] = ({
  'ChatRoom': ChatRoom
});

/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "altersData", function() { return altersData; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "prefixedKeyMirror", function() { return prefixedKeyMirror; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "extendActions", function() { return extendActions; });
function altersData(fn) {
  fn.altersData = true;
  return fn;
}
;
function prefixedKeyMirror(prefix, vals) {
  var result = {};
  Object.keys(vals).forEach(function (k) {
    result[k] = prefix + ":" + k;
  });
  return result;
}
;
function extendActions(prefix, src, toBeAppended) {
  var actions = Object.keys(src).concat(Object.keys(toBeAppended));
  var result = {};
  actions.forEach(function (k) {
    result[k] = prefix + ":" + k;
  });
  return result;
}
;

/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./js/ui/utils.jsx
var utils = __webpack_require__(3);

// EXTERNAL MODULE: ./js/stores/mixins.js
var mixins = __webpack_require__(1);

// EXTERNAL MODULE: ./js/ui/tooltips.jsx
var tooltips = __webpack_require__(12);

// EXTERNAL MODULE: ./js/ui/forms.jsx
var ui_forms = __webpack_require__(14);

// CONCATENATED MODULE: ./js/ui/miniui.jsx
function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var React = __webpack_require__(0);

var ReactDOM = __webpack_require__(4);



var ToggleCheckbox =
/*#__PURE__*/
function (_MegaRenderMixin) {
  _inherits(ToggleCheckbox, _MegaRenderMixin);

  function ToggleCheckbox(props) {
    var _this;

    _classCallCheck(this, ToggleCheckbox);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ToggleCheckbox).call(this, props));
    _this.state = {
      value: _this.props.value
    };
    return _this;
  }

  _createClass(ToggleCheckbox, [{
    key: "onToggle",
    value: function onToggle() {
      var newState = !this.state.value;
      this.setState({
        'value': newState
      });

      if (this.props.onToggle) {
        this.props.onToggle(newState);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var self = this;
      return React.makeElement("div", {
        className: "toggle-checkbox " + (self.state.value ? " checked " : "") + self.props.className,
        onClick: function onClick(e) {
          self.onToggle();
        }
      }, React.makeElement("div", {
        className: "toggle-checkbox-wrap"
      }, React.makeElement("div", {
        className: "toggle-checkbox-button"
      })));
    }
  }]);

  return ToggleCheckbox;
}(Object(mixins["default"])(React.Component));

;

var Checkbox =
/*#__PURE__*/
function (_MegaRenderMixin2) {
  _inherits(Checkbox, _MegaRenderMixin2);

  function Checkbox(props) {
    var _this2;

    _classCallCheck(this, Checkbox);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(Checkbox).call(this, props));
    _this2.state = {
      value: _this2.props.value
    };
    return _this2;
  }

  _createClass(Checkbox, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(Checkbox.prototype), "componentDidMount", this).call(this);

      var self = this;
      var $node = self.findDOMNode();
      uiCheckboxes($node, false, function (newState) {
        self.setState({
          'value': newState
        });
        self.props.onToggle && self.props.onToggle(newState);
      }, !!self.props.value);
    }
  }, {
    key: "render",
    value: function render() {
      var extraClasses = "";

      if (this.props.disabled) {
        extraClasses += " disabled";
      }

      return React.makeElement("div", {
        className: this.props.className + " checkbox" + extraClasses
      }, React.makeElement("div", {
        className: "checkdiv checkboxOn"
      }, React.makeElement("input", {
        type: "checkbox",
        name: this.props.name,
        id: this.props.name,
        className: "checkboxOn",
        checked: ""
      })), React.makeElement("label", {
        htmlFor: this.props.name,
        className: "radio-txt lato mid"
      }, this.props.label), React.makeElement("div", {
        className: "clear"
      }));
    }
  }]);

  return Checkbox;
}(Object(mixins["default"])(React.Component));

;

var IntermediateCheckbox =
/*#__PURE__*/
function (_MegaRenderMixin3) {
  _inherits(IntermediateCheckbox, _MegaRenderMixin3);

  function IntermediateCheckbox(props) {
    var _this3;

    _classCallCheck(this, IntermediateCheckbox);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(IntermediateCheckbox).call(this, props));
    _this3.state = {
      value: _this3.props.value
    };
    return _this3;
  }

  _createClass(IntermediateCheckbox, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      _get(_getPrototypeOf(IntermediateCheckbox.prototype), "componentDidMount", this).call(this);

      var self = this;
      var $node = self.findDOMNode();
      uiCheckboxes($node, false, function (newState) {
        self.setState({
          'value': newState
        });
        self.props.onToggle && self.props.onToggle(newState);
      }, !!self.props.value);
    }
  }, {
    key: "render",
    value: function render() {
      var extraClasses = "";

      if (this.props.disabled) {
        extraClasses += " disabled";
      }

      return React.makeElement("div", {
        className: this.props.className + " checkbox" + extraClasses
      }, React.makeElement("div", {
        className: "checkdiv checkboxOn"
      }, React.makeElement("input", {
        type: "checkbox",
        name: this.props.name,
        id: this.props.name,
        className: "checkboxOn",
        checked: ""
      })), React.makeElement("label", {
        htmlFor: this.props.name,
        className: "radio-txt lato mid"
      }, this.props.label), React.makeElement("div", {
        className: "clear"
      }), this.props.intermediate ? React.makeElement("div", {
        className: "intermediate-state"
      }, this.props.intermediateMessage) : null, React.makeElement("div", {
        className: "clear"
      }));
    }
  }]);

  return IntermediateCheckbox;
}(Object(mixins["default"])(React.Component));

;
/* harmony default export */ var miniui = ({
  ToggleCheckbox: ToggleCheckbox,
  Checkbox: Checkbox,
  IntermediateCheckbox: IntermediateCheckbox
});
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
var ui_contacts = __webpack_require__(2);

// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx
var modalDialogs = __webpack_require__(6);

// CONCATENATED MODULE: ./js/chat/ui/startGroupChatWizard.jsx
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StartGroupChatWizard", function() { return startGroupChatWizard_StartGroupChatWizard; });
function startGroupChatWizard_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { startGroupChatWizard_typeof = function _typeof(obj) { return typeof obj; }; } else { startGroupChatWizard_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return startGroupChatWizard_typeof(obj); }

function startGroupChatWizard_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function startGroupChatWizard_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function startGroupChatWizard_createClass(Constructor, protoProps, staticProps) { if (protoProps) startGroupChatWizard_defineProperties(Constructor.prototype, protoProps); if (staticProps) startGroupChatWizard_defineProperties(Constructor, staticProps); return Constructor; }

function startGroupChatWizard_possibleConstructorReturn(self, call) { if (call && (startGroupChatWizard_typeof(call) === "object" || typeof call === "function")) { return call; } return startGroupChatWizard_assertThisInitialized(self); }

function startGroupChatWizard_getPrototypeOf(o) { startGroupChatWizard_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return startGroupChatWizard_getPrototypeOf(o); }

function startGroupChatWizard_assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function startGroupChatWizard_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) startGroupChatWizard_setPrototypeOf(subClass, superClass); }

function startGroupChatWizard_setPrototypeOf(o, p) { startGroupChatWizard_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return startGroupChatWizard_setPrototypeOf(o, p); }

var startGroupChatWizard_React = __webpack_require__(0);

var startGroupChatWizard_ReactDOM = __webpack_require__(4);








var startGroupChatWizard_StartGroupChatWizard =
/*#__PURE__*/
function (_MegaRenderMixin) {
  startGroupChatWizard_inherits(StartGroupChatWizard, _MegaRenderMixin);

  function StartGroupChatWizard(props) {
    var _this;

    startGroupChatWizard_classCallCheck(this, StartGroupChatWizard);

    _this = startGroupChatWizard_possibleConstructorReturn(this, startGroupChatWizard_getPrototypeOf(StartGroupChatWizard).call(this, props));
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
    _this.onFinalizeClick = _this.onFinalizeClick.bind(startGroupChatWizard_assertThisInitialized(_this));
    _this.onSelectClicked = _this.onSelectClicked.bind(startGroupChatWizard_assertThisInitialized(_this));
    _this.onSelected = _this.onSelected.bind(startGroupChatWizard_assertThisInitialized(_this));
    return _this;
  }

  startGroupChatWizard_createClass(StartGroupChatWizard, [{
    key: "onSelected",
    value: function onSelected(nodes) {
      this.setState({
        'selected': nodes
      });

      if (this.props.onSelected) {
        this.props.onSelected(nodes);
      }
    }
  }, {
    key: "onSelectClicked",
    value: function onSelectClicked() {
      if (this.props.onSelectClicked) {
        this.props.onSelectClicked();
      }
    }
  }, {
    key: "onFinalizeClick",
    value: function onFinalizeClick(e) {
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
    }
  }, {
    key: "render",
    value: function render() {
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
        // always allow Next even if .selected is empty.
        allowNext = true;
        buttons.push({
          "label": l[556],
          "key": "next",
          // "defaultClassname": "default-grey-button lato right",
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

        chatInfoElements = startGroupChatWizard_React.makeElement("div", null, startGroupChatWizard_React.createElement("div", {
          className: "contacts-search-header left-aligned top-pad" + (failedToEnableChatlink ? " failed" : "")
        }, startGroupChatWizard_React.makeElement("i", {
          className: "small-icon conversations"
        }), startGroupChatWizard_React.makeElement("input", {
          type: "search",
          placeholder: l[18509],
          value: self.state.groupName,
          maxLength: 30,
          onKeyDown: function onKeyDown(e) {
            var code = e.which || e.keyCode;

            if (allowNext && code === 13) {
              if (self.state.step === 1) {
                self.onFinalizeClick();
              }
            }
          },
          onChange: function onChange(e) {
            self.setState({
              'groupName': e.target.value,
              'failedToEnableChatlink': false
            });
          }
        })), this.props.flowType !== 2 ? startGroupChatWizard_React.makeElement("div", {
          className: "group-chat-dialog content"
        }, startGroupChatWizard_React.makeElement(miniui.ToggleCheckbox, {
          className: "right",
          checked: self.state.keyRotation,
          onToggle: function onToggle(v) {
            self.setState({
              'keyRotation': v
            });
          }
        }), startGroupChatWizard_React.makeElement("div", {
          className: "group-chat-dialog header"
        }, !self.state.keyRotation ? l[20576] : l[20631]), startGroupChatWizard_React.makeElement("div", {
          className: "group-chat-dialog description"
        }, l[20484]), startGroupChatWizard_React.makeElement("div", {
          className: "group-chat-dialog checkbox " + (self.state.keyRotation ? "disabled" : "") + (failedToEnableChatlink ? " failed" : ""),
          onClick: SoonFc(function (e) {
            // this is somehow called twice if clicked on the label...
            self.setState({
              'createChatLink': !self.state.createChatLink
            });
          }, 75)
        }, startGroupChatWizard_React.makeElement("div", {
          className: "checkdiv " + checkboxClassName
        }, startGroupChatWizard_React.makeElement("input", {
          type: "checkbox",
          name: "group-encryption",
          id: "group-encryption",
          className: "checkboxOn hidden"
        })), startGroupChatWizard_React.makeElement("label", {
          htmlFor: "group-encryption",
          className: "radio-txt lato mid"
        }, l[20575]), startGroupChatWizard_React.makeElement("div", {
          className: "clear"
        }))) : null, failedToEnableChatlink ? startGroupChatWizard_React.makeElement("div", {
          className: "group-chat-dialog description chatlinks-intermediate-msg"
        }, l[20573]) : null);
      }

      return startGroupChatWizard_React.makeElement(modalDialogs["a" /* default */].ModalDialog, {
        step: self.state.step,
        title: l[19483],
        className: classes,
        selected: self.state.selected,
        onClose: function onClose() {
          self.props.onClose(self);
        },
        triggerResizeOnUpdate: true,
        buttons: buttons
      }, chatInfoElements, startGroupChatWizard_React.makeElement(ui_contacts["ContactPickerWidget"], {
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
    }
  }]);

  return StartGroupChatWizard;
}(Object(mixins["default"])(startGroupChatWizard_React.Component));
startGroupChatWizard_StartGroupChatWizard.clickTime = 0;
startGroupChatWizard_StartGroupChatWizard.defaultProps = {
  'selectLabel': __(l[1940]),
  'cancelLabel': __(l[82]),
  'hideable': true,
  'flowType': 1
};
;

/***/ })
/******/ ]);
