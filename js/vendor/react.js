/**
 * @license React
 * react.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function (g, f) {
  "object" === typeof exports && "undefined" !== typeof module
    ? f(exports)
    : "function" === typeof define && define.amd
      ? define(["exports"], f)
      : ((g = "undefined" !== typeof globalThis ? globalThis : g || self),
        f((g.React = {})));
})(this, function (exports) {
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable)
      return null;
    maybeIterable =
      (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
      maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  function ComponentDummy() {}
  function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  function createElement$1(type, config, children) {
    let propName;
    const props = {};
    let key = null,
      ref = null;
    if (null != config)
      for (propName in (void 0 !== config.ref && (ref = config.ref),
      void 0 !== config.key && (key = "" + config.key),
      config))
        hasOwnProperty.call(config, propName) &&
          !RESERVED_PROPS.hasOwnProperty(propName) &&
          (props[propName] = config[propName]);
    var childrenLength = arguments.length - 2;
    if (1 === childrenLength) props.children = children;
    else if (1 < childrenLength) {
      const childArray = Array(childrenLength);
      for (let i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    if (type && type.defaultProps)
      for (propName in ((childrenLength = type.defaultProps), childrenLength))
        void 0 === props[propName] &&
          (props[propName] = childrenLength[propName]);
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref,
      props,
      _owner: ReactCurrentOwner.current
    };
  }
  function cloneAndReplaceKey(oldElement, newKey) {
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type: oldElement.type,
      key: newKey,
      ref: oldElement.ref,
      props: oldElement.props,
      _owner: oldElement._owner
    };
  }
  function isValidElement(object) {
    return (
      "object" === typeof object &&
      null !== object &&
      object.$$typeof === REACT_ELEMENT_TYPE
    );
  }
  function escape(key) {
    const escaperLookup = { "=": "=0", ":": "=2" };
    return (
      "$" +
      key.replace(/[=:]/g, function (match) {
        return escaperLookup[match];
      })
    );
  }
  function getElementKey(element, index) {
    return "object" === typeof element &&
      null !== element &&
      null != element.key
      ? escape("" + element.key)
      : index.toString(36);
  }
  function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
    var type = typeof children;
    if ("undefined" === type || "boolean" === type) children = null;
    var invokeCallback = !1;
    if (null === children) invokeCallback = !0;
    else
      switch (type) {
        case "string":
        case "number":
          invokeCallback = !0;
          break;
        case "object":
          switch (children.$$typeof) {
            case REACT_ELEMENT_TYPE:
            case REACT_PORTAL_TYPE:
              invokeCallback = !0;
          }
      }
    if (invokeCallback)
      return (
        (invokeCallback = children),
        (callback = callback(invokeCallback)),
        (children =
          "" === nameSoFar
            ? "." + getElementKey(invokeCallback, 0)
            : nameSoFar),
        isArrayImpl(callback)
          ? ((escapedPrefix = ""),
            null != children &&
              (escapedPrefix =
                children.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
            mapIntoArray(callback, array, escapedPrefix, "", (c) => c))
          : null != callback &&
            (isValidElement(callback) &&
              (callback = cloneAndReplaceKey(
                callback,
                escapedPrefix +
                  (!callback.key ||
                  (invokeCallback && invokeCallback.key === callback.key)
                    ? ""
                    : ("" + callback.key).replace(
                        userProvidedKeyEscapeRegex,
                        "$&/"
                      ) + "/") +
                  children
              )),
            array.push(callback)),
        1
      );
    invokeCallback = 0;
    nameSoFar = "" === nameSoFar ? "." : nameSoFar + ":";
    if (isArrayImpl(children))
      for (var i = 0; i < children.length; i++) {
        type = children[i];
        var nextName = nameSoFar + getElementKey(type, i);
        invokeCallback += mapIntoArray(
          type,
          array,
          escapedPrefix,
          nextName,
          callback
        );
      }
    else if (
      ((nextName = getIteratorFn(children)), "function" === typeof nextName)
    )
      for (
        children = nextName.call(children), i = 0;
        !(type = children.next()).done;

      )
        (type = type.value),
          (nextName = nameSoFar + getElementKey(type, i++)),
          (invokeCallback += mapIntoArray(
            type,
            array,
            escapedPrefix,
            nextName,
            callback
          ));
    else if ("object" === type)
      throw (
        ((array = String(children)),
        Error(
          `Objects are not valid as a React child (found: ${"[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array}). ` +
            "If you meant to render a collection of children, use an array instead."
        ))
      );
    return invokeCallback;
  }
  function mapChildren(children, func, context) {
    if (null == children) return children;
    const result = [];
    let count = 0;
    mapIntoArray(children, result, "", "", function (child) {
      return func.call(context, child, count++);
    });
    return result;
  }
  function lazyInitializer(payload) {
    if (-1 === payload._status) {
      var ctor = payload._result;
      ctor = ctor();
      ctor.then(
        (moduleObject) => {
          if (0 === payload._status || -1 === payload._status)
            (payload._status = 1), (payload._result = moduleObject);
        },
        (error) => {
          if (0 === payload._status || -1 === payload._status)
            (payload._status = 2), (payload._result = error);
        }
      );
      -1 === payload._status &&
        ((payload._status = 0), (payload._result = ctor));
    }
    if (1 === payload._status) return payload._result.default;
    throw payload._result;
  }
  function push(heap, node) {
    var index = heap.length;
    heap.push(node);
    a: for (; 0 < index; ) {
      const parentIndex = (index - 1) >>> 1,
        parent = heap[parentIndex];
      if (0 < compare(parent, node))
        (heap[parentIndex] = node),
          (heap[index] = parent),
          (index = parentIndex);
      else break a;
    }
  }
  function peek(heap) {
    return 0 === heap.length ? null : heap[0];
  }
  function pop(heap) {
    if (0 === heap.length) return null;
    const first = heap[0],
      last = heap.pop();
    if (last !== first) {
      heap[0] = last;
      a: {
        let index = 0;
        const length = heap.length,
          halfLength = length >>> 1;
        for (; index < halfLength; ) {
          const leftIndex = 2 * (index + 1) - 1,
            left = heap[leftIndex],
            rightIndex = leftIndex + 1,
            right = heap[rightIndex];
          if (0 > compare(left, last))
            rightIndex < length && 0 > compare(right, left)
              ? ((heap[index] = right),
                (heap[rightIndex] = last),
                (index = rightIndex))
              : ((heap[index] = left),
                (heap[leftIndex] = last),
                (index = leftIndex));
          else if (rightIndex < length && 0 > compare(right, last))
            (heap[index] = right),
              (heap[rightIndex] = last),
              (index = rightIndex);
          else break a;
        }
      }
    }
    return first;
  }
  function compare(a, b) {
    const diff = a.sortIndex - b.sortIndex;
    return 0 !== diff ? diff : a.id - b.id;
  }
  function advanceTimers(currentTime) {
    let timer = peek(timerQueue);
    for (; null !== timer; ) {
      if (null === timer.callback) pop(timerQueue);
      else if (timer.startTime <= currentTime)
        pop(timerQueue),
          (timer.sortIndex = timer.expirationTime),
          push(taskQueue, timer);
      else break;
      timer = peek(timerQueue);
    }
  }
  function handleTimeout(currentTime) {
    isHostTimeoutScheduled = !1;
    advanceTimers(currentTime);
    if (!isHostCallbackScheduled)
      if (null !== peek(taskQueue))
        (isHostCallbackScheduled = !0), requestHostCallback(flushWork);
      else {
        const firstTimer = peek(timerQueue);
        null !== firstTimer &&
          requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
  }
  function flushWork(hasTimeRemaining, initialTime) {
    isHostCallbackScheduled = !1;
    isHostTimeoutScheduled &&
      ((isHostTimeoutScheduled = !1),
      clearTimeout(taskTimeoutID),
      (taskTimeoutID = -1));
    isPerformingWork = !0;
    const previousPriorityLevel = currentPriorityLevel;
    try {
      advanceTimers(initialTime);
      for (
        currentTask = peek(taskQueue);
        null !== currentTask &&
        (!(currentTask.expirationTime > initialTime) ||
          (hasTimeRemaining && !shouldYieldToHost()));

      ) {
        const callback = currentTask.callback;
        if ("function" === typeof callback) {
          currentTask.callback = null;
          currentPriorityLevel = currentTask.priorityLevel;
          const continuationCallback = callback(
            currentTask.expirationTime <= initialTime
          );
          initialTime = performance.now();
          "function" === typeof continuationCallback
            ? (currentTask.callback = continuationCallback)
            : currentTask === peek(taskQueue) && pop(taskQueue);
          advanceTimers(initialTime);
        } else pop(taskQueue);
        currentTask = peek(taskQueue);
      }
      if (null !== currentTask) var JSCompiler_inline_result = !0;
      else {
        const firstTimer = peek(timerQueue);
        null !== firstTimer &&
          requestHostTimeout(handleTimeout, firstTimer.startTime - initialTime);
        JSCompiler_inline_result = !1;
      }
      return JSCompiler_inline_result;
    } finally {
      (currentTask = null),
        (currentPriorityLevel = previousPriorityLevel),
        (isPerformingWork = !1);
    }
  }
  function shouldYieldToHost() {
    return performance.now() - startTime < frameInterval ? !1 : !0;
  }
  function requestHostCallback(callback) {
    scheduledHostCallback = callback;
    isMessageLoopRunning ||
      ((isMessageLoopRunning = !0), queueMicrotask(performWorkUntilDeadline));
  }
  function requestHostTimeout(callback, ms) {
    taskTimeoutID = setTimeout(() => {
      callback(performance.now());
    }, ms);
  }
  function act(callback) {
    throw Error("act(...) is not supported in production builds of React.");
  }
  const REACT_ELEMENT_TYPE = Symbol.for("react.element"),
    REACT_PORTAL_TYPE = Symbol.for("react.portal"),
    REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
    REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
    REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
    REACT_PROVIDER_TYPE = Symbol.for("react.provider"),
    REACT_CONTEXT_TYPE = Symbol.for("react.context"),
    REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
    REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
    REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
    REACT_MEMO_TYPE = Symbol.for("react.memo"),
    REACT_LAZY_TYPE = Symbol.for("react.lazy"),
    REACT_SCOPE_TYPE = Symbol.for("react.scope"),
    REACT_DEBUG_TRACING_MODE_TYPE = Symbol.for("react.debug_trace_mode"),
    REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"),
    REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"),
    REACT_CACHE_TYPE = Symbol.for("react.cache"),
    REACT_TRACING_MARKER_TYPE = Symbol.for("react.tracing_marker"),
    MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
    ReactCurrentDispatcher = { current: null },
    ReactCurrentBatchConfig = { transition: null },
    ReactCurrentOwner = { current: null },
    ReactNoopUpdateQueue = {
      isMounted: function (publicInstance) {
        return !1;
      },
      enqueueForceUpdate: function (publicInstance, callback, callerName) {},
      enqueueReplaceState: function (
        publicInstance,
        completeState,
        callback,
        callerName
      ) {},
      enqueueSetState: function (
        publicInstance,
        partialState,
        callback,
        callerName
      ) {}
    },
    assign = Object.assign,
    emptyObject = {};
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function (partialState, callback) {
    if (
      "object" !== typeof partialState &&
      "function" !== typeof partialState &&
      null != partialState
    )
      throw Error(
        "setState(...): takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function (callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  ComponentDummy.prototype = Component.prototype;
  var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = !0;
  const isArrayImpl = Array.isArray,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    RESERVED_PROPS = { key: !0, ref: !0, __self: !0, __source: !0 },
    userProvidedKeyEscapeRegex = /\/+/g;
  var taskQueue = [],
    timerQueue = [],
    taskIdCounter = 1,
    currentTask = null,
    currentPriorityLevel = 3,
    isPerformingWork = !1,
    isHostCallbackScheduled = !1,
    isHostTimeoutScheduled = !1;
  let isMessageLoopRunning = !1,
    scheduledHostCallback = null,
    taskTimeoutID = -1,
    frameInterval = 5,
    startTime = -1;
  const performWorkUntilDeadline = () => {
    if (null !== scheduledHostCallback) {
      const currentTime = performance.now();
      startTime = currentTime;
      let hasMoreWork = !0;
      try {
        hasMoreWork = scheduledHostCallback(!0, currentTime);
      } finally {
        hasMoreWork
          ? queueMicrotask(performWorkUntilDeadline)
          : ((isMessageLoopRunning = !1), (scheduledHostCallback = null));
      }
    } else isMessageLoopRunning = !1;
  };
  pureComponentPrototype = Object.freeze({
    __proto__: null,
    unstable_IdlePriority: 5,
    unstable_ImmediatePriority: 1,
    unstable_LowPriority: 4,
    unstable_NormalPriority: 3,
    unstable_Profiling: null,
    unstable_UserBlockingPriority: 2,
    unstable_cancelCallback: function (task) {
      task.callback = null;
    },
    unstable_continueExecution: function () {
      isHostCallbackScheduled ||
        isPerformingWork ||
        ((isHostCallbackScheduled = !0), requestHostCallback(flushWork));
    },
    unstable_forceFrameRate: function (fps) {
      0 > fps || 125 < fps
        ? console.error(
            "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
          )
        : (frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5);
    },
    unstable_getCurrentPriorityLevel: function () {
      return currentPriorityLevel;
    },
    unstable_getFirstCallbackNode: function () {
      return peek(taskQueue);
    },
    unstable_next: function (eventHandler) {
      switch (currentPriorityLevel) {
        case 1:
        case 2:
        case 3:
          var priorityLevel = 3;
          break;
        default:
          priorityLevel = currentPriorityLevel;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    },
    unstable_now: () => performance.now(),
    unstable_pauseExecution: function () {},
    unstable_requestPaint: function () {},
    unstable_runWithPriority: function (priorityLevel, eventHandler) {
      switch (priorityLevel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          priorityLevel = 3;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    },
    unstable_scheduleCallback: function (priorityLevel, callback, options) {
      var currentTime = performance.now();
      "object" === typeof options && null !== options
        ? ((options = options.delay),
          (options =
            "number" === typeof options && 0 < options
              ? currentTime + options
              : currentTime))
        : (options = currentTime);
      switch (priorityLevel) {
        case 1:
          var timeout = -1;
          break;
        case 2:
          timeout = 250;
          break;
        case 5:
          timeout = 1073741823;
          break;
        case 4:
          timeout = 1e4;
          break;
        default:
          timeout = 5e3;
      }
      timeout = options + timeout;
      priorityLevel = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: options,
        expirationTime: timeout,
        sortIndex: -1
      };
      options > currentTime
        ? ((priorityLevel.sortIndex = options),
          push(timerQueue, priorityLevel),
          null === peek(taskQueue) &&
            priorityLevel === peek(timerQueue) &&
            (isHostTimeoutScheduled
              ? (clearTimeout(taskTimeoutID), (taskTimeoutID = -1))
              : (isHostTimeoutScheduled = !0),
            requestHostTimeout(handleTimeout, options - currentTime)))
        : ((priorityLevel.sortIndex = timeout),
          push(taskQueue, priorityLevel),
          isHostCallbackScheduled ||
            isPerformingWork ||
            ((isHostCallbackScheduled = !0), requestHostCallback(flushWork)));
      return priorityLevel;
    },
    unstable_shouldYield: shouldYieldToHost,
    unstable_wrapCallback: function (callback) {
      var parentPriorityLevel = currentPriorityLevel;
      return function () {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;
        try {
          return callback.apply(this, arguments);
        } finally {
          currentPriorityLevel = previousPriorityLevel;
        }
      };
    }
  });
  pureComponentPrototype = {
    ReactCurrentDispatcher,
    ReactCurrentOwner,
    ReactCurrentBatchConfig,
    Scheduler: pureComponentPrototype
  };
  exports.Children = {
    map: mapChildren,
    forEach: function (children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function () {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function (children) {
      let n = 0;
      mapChildren(children, () => {
        n++;
      });
      return n;
    },
    toArray: function (children) {
      return mapChildren(children, (child) => child) || [];
    },
    only: function (children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
  exports.Component = Component;
  exports.Fragment = REACT_FRAGMENT_TYPE;
  exports.Profiler = REACT_PROFILER_TYPE;
  exports.PureComponent = PureComponent;
  exports.StrictMode = REACT_STRICT_MODE_TYPE;
  exports.Suspense = REACT_SUSPENSE_TYPE;
  exports.SuspenseList = REACT_SUSPENSE_LIST_TYPE;
  exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    pureComponentPrototype;
  exports.act = act;
  exports.cloneElement = function (element, config, children) {
    if (null === element || void 0 === element)
      throw Error(
        `React.cloneElement(...): The argument must be a React element, but you passed ${element}.`
      );
    const props = assign({}, element.props);
    let key = element.key,
      ref = element.ref,
      owner = element._owner;
    if (null != config) {
      void 0 !== config.ref &&
        ((ref = config.ref), (owner = ReactCurrentOwner.current));
      void 0 !== config.key && (key = "" + config.key);
      if (element.type && element.type.defaultProps)
        var defaultProps = element.type.defaultProps;
      for (propName in config)
        hasOwnProperty.call(config, propName) &&
          !RESERVED_PROPS.hasOwnProperty(propName) &&
          (props[propName] =
            void 0 === config[propName] && void 0 !== defaultProps
              ? defaultProps[propName]
              : config[propName]);
    }
    var propName = arguments.length - 2;
    if (1 === propName) props.children = children;
    else if (1 < propName) {
      defaultProps = Array(propName);
      for (let i = 0; i < propName; i++) defaultProps[i] = arguments[i + 2];
      props.children = defaultProps;
    }
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type: element.type,
      key,
      ref,
      props,
      _owner: owner
    };
  };
  exports.createContext = function (defaultValue) {
    defaultValue = {
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: defaultValue,
      _currentValue2: defaultValue,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null
    };
    defaultValue.Provider = {
      $$typeof: REACT_PROVIDER_TYPE,
      _context: defaultValue
    };
    return (defaultValue.Consumer = defaultValue);
  };
  exports.createElement = createElement$1;
  exports.createFactory = function (type) {
    const factory = createElement$1.bind(null, type);
    factory.type = type;
    return factory;
  };
  exports.createMutableSource = function (source, getVersion) {
    return {
      _getVersion: getVersion,
      _source: source,
      _workInProgressVersionPrimary: null,
      _workInProgressVersionSecondary: null
    };
  };
  exports.createRef = function () {
    return { current: null };
  };
  exports.createServerContext = function (globalName, defaultValue) {
    throw Error("Not implemented.");
  };
  exports.forwardRef = function (render) {
    return { $$typeof: REACT_FORWARD_REF_TYPE, render };
  };
  exports.isValidElement = isValidElement;
  exports.lazy = function (ctor) {
    return {
      $$typeof: REACT_LAZY_TYPE,
      _payload: { _status: -1, _result: ctor },
      _init: lazyInitializer
    };
  };
  exports.memo = function (type, compare) {
    return {
      $$typeof: REACT_MEMO_TYPE,
      type,
      compare: void 0 === compare ? null : compare
    };
  };
  exports.startTransition = function (scope, options) {
    options = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = {};
    ReactCurrentBatchConfig.transition;
    try {
      scope();
    } finally {
      ReactCurrentBatchConfig.transition = options;
    }
  };
  exports.unstable_Cache = REACT_CACHE_TYPE;
  exports.unstable_DebugTracingMode = REACT_DEBUG_TRACING_MODE_TYPE;
  exports.unstable_LegacyHidden = REACT_LEGACY_HIDDEN_TYPE;
  exports.unstable_Offscreen = REACT_OFFSCREEN_TYPE;
  exports.unstable_Scope = REACT_SCOPE_TYPE;
  exports.unstable_TracingMarker = REACT_TRACING_MARKER_TYPE;
  exports.unstable_act = act;
  exports.unstable_getCacheForType = function (resourceType) {
    return ReactCurrentDispatcher.current.getCacheForType(resourceType);
  };
  exports.unstable_getCacheSignal = function () {
    return ReactCurrentDispatcher.current.getCacheSignal();
  };
  exports.unstable_useCacheRefresh = function () {
    return ReactCurrentDispatcher.current.useCacheRefresh();
  };
  exports.useCallback = function (callback, deps) {
    return ReactCurrentDispatcher.current.useCallback(callback, deps);
  };
  exports.useContext = function (Context) {
    return ReactCurrentDispatcher.current.useContext(Context);
  };
  exports.useDebugValue = function (value, formatterFn) {};
  exports.useDeferredValue = function (value) {
    return ReactCurrentDispatcher.current.useDeferredValue(value);
  };
  exports.useEffect = function (create, deps) {
    return ReactCurrentDispatcher.current.useEffect(create, deps);
  };
  exports.useId = function () {
    return ReactCurrentDispatcher.current.useId();
  };
  exports.useImperativeHandle = function (ref, create, deps) {
    return ReactCurrentDispatcher.current.useImperativeHandle(
      ref,
      create,
      deps
    );
  };
  exports.useInsertionEffect = function (create, deps) {
    return ReactCurrentDispatcher.current.useInsertionEffect(create, deps);
  };
  exports.useLayoutEffect = function (create, deps) {
    return ReactCurrentDispatcher.current.useLayoutEffect(create, deps);
  };
  exports.useMemo = function (create, deps) {
    return ReactCurrentDispatcher.current.useMemo(create, deps);
  };
  exports.useMutableSource = function (source, getSnapshot, subscribe) {
    return ReactCurrentDispatcher.current.useMutableSource(
      source,
      getSnapshot,
      subscribe
    );
  };
  exports.useReducer = function (reducer, initialArg, init) {
    return ReactCurrentDispatcher.current.useReducer(reducer, initialArg, init);
  };
  exports.useRef = function (initialValue) {
    return ReactCurrentDispatcher.current.useRef(initialValue);
  };
  exports.useState = function (initialState) {
    return ReactCurrentDispatcher.current.useState(initialState);
  };
  exports.useSyncExternalStore = function (
    subscribe,
    getSnapshot,
    getServerSnapshot
  ) {
    return ReactCurrentDispatcher.current.useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  };
  exports.useTransition = function () {
    return ReactCurrentDispatcher.current.useTransition();
  };
  exports.version = "18.3.1";
});
