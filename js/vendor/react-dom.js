/**
 * @license React
 * react-dom.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function (g, f) {
  "object" === typeof exports && "undefined" !== typeof module
    ? f(exports, require("react"))
    : "function" === typeof define && define.amd
      ? define(["exports", "react"], f)
      : ((g = "undefined" !== typeof globalThis ? globalThis : g || self),
        f((g.ReactDOM = {}), g.React));
})(this, function (exports, React) {
  function registerTwoPhaseEvent(registrationName, dependencies) {
    registerDirectEvent(registrationName, dependencies);
    registerDirectEvent(registrationName + "Capture", dependencies);
  }
  function registerDirectEvent(registrationName, dependencies) {
    registrationNameDependencies[registrationName] = dependencies;
    for (
      registrationName = 0;
      registrationName < dependencies.length;
      registrationName++
    )
      allNativeEvents.add(dependencies[registrationName]);
  }
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
      return !0;
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName))
      return !1;
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
      return (validatedAttributeNameCache[attributeName] = !0);
    illegalAttributeNameCache[attributeName] = !0;
    return !1;
  }
  function shouldRemoveAttributeWithWarning(
    name,
    value,
    propertyInfo,
    isCustomComponentTag
  ) {
    if (null !== propertyInfo && 0 === propertyInfo.type) return !1;
    switch (typeof value) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        if (isCustomComponentTag) return !1;
        if (null !== propertyInfo) return !propertyInfo.acceptsBooleans;
        name = name.toLowerCase().slice(0, 5);
        return "data-" !== name && "aria-" !== name;
      default:
        return !1;
    }
  }
  function shouldRemoveAttribute(
    name,
    value,
    propertyInfo,
    isCustomComponentTag
  ) {
    if (
      null === value ||
      "undefined" === typeof value ||
      shouldRemoveAttributeWithWarning(
        name,
        value,
        propertyInfo,
        isCustomComponentTag
      )
    )
      return !0;
    if (isCustomComponentTag) return !1;
    if (null !== propertyInfo)
      switch (propertyInfo.type) {
        case 3:
          return !value;
        case 4:
          return !1 === value;
        case 5:
          return isNaN(value);
        case 6:
          return isNaN(value) || 1 > value;
      }
    return !1;
  }
  function PropertyInfoRecord(
    name,
    type,
    mustUseProperty,
    attributeName,
    attributeNamespace,
    sanitizeURL,
    removeEmptyString
  ) {
    this.acceptsBooleans = 2 === type || 3 === type || 4 === type;
    this.attributeName = attributeName;
    this.attributeNamespace = attributeNamespace;
    this.mustUseProperty = mustUseProperty;
    this.propertyName = name;
    this.type = type;
    this.sanitizeURL = sanitizeURL;
    this.removeEmptyString = removeEmptyString;
  }
  function setValueForProperty(node, name, value, isCustomComponentTag) {
    var propertyInfo = properties[name] || null;
    if (
      null !== propertyInfo
        ? 0 !== propertyInfo.type
        : isCustomComponentTag ||
          !(2 < name.length) ||
          ("o" !== name[0] && "O" !== name[0]) ||
          ("n" !== name[1] && "N" !== name[1])
    )
      if (
        (shouldRemoveAttribute(
          name,
          value,
          propertyInfo,
          isCustomComponentTag
        ) && (value = null),
        isCustomComponentTag || null === propertyInfo)
      )
        isAttributeNameSafe(name) &&
          (null === value
            ? node.removeAttribute(name)
            : node.setAttribute(name, "" + value));
      else if ((({ mustUseProperty: name } = propertyInfo), name))
        ({ propertyName: name } = propertyInfo),
          null === value
            ? (({ type: value } = propertyInfo),
              (node[name] = 3 === value ? !1 : ""))
            : (node[name] = value);
      else {
        var { attributeName, attributeNamespace } = propertyInfo;
        null === value
          ? node.removeAttribute(attributeName)
          : (({ type: propertyInfo } = propertyInfo),
            (value =
              3 === propertyInfo || (4 === propertyInfo && !0 === value)
                ? ""
                : "" + value),
            attributeNamespace
              ? node.setAttributeNS(attributeNamespace, attributeName, value)
              : node.setAttribute(attributeName, value));
      }
  }
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable)
      return null;
    maybeIterable =
      (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
      maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  function describeBuiltInComponentFrame(name, source, ownerFn) {
    if (void 0 === prefix)
      try {
        throw Error();
      } catch (x) {
        prefix =
          ((source = x.stack.trim().match(/\n( *(at )?)/)) && source[1]) || "";
      }
    return "\n" + prefix + name;
  }
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry) return "";
    let control;
    reentry = !0;
    const previousPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (construct)
        if (
          ((construct = function () {
            throw Error();
          }),
          Object.defineProperty(construct.prototype, "props", {
            set: function () {
              throw Error();
            }
          }),
          "object" === typeof Reflect && Reflect.construct)
        ) {
          try {
            Reflect.construct(construct, []);
          } catch (x) {
            control = x;
          }
          Reflect.construct(fn, [], construct);
        } else {
          try {
            construct.call();
          } catch (x) {
            control = x;
          }
          fn.call(construct.prototype);
        }
      else {
        try {
          throw Error();
        } catch (x) {
          control = x;
        }
        fn();
      }
    } catch (sample) {
      if (sample && control && "string" === typeof sample.stack) {
        const sampleLines = sample.stack.split("\n"),
          controlLines = control.stack.split("\n");
        let s = sampleLines.length - 1,
          c = controlLines.length - 1;
        for (; 1 <= s && 0 <= c && sampleLines[s] !== controlLines[c]; ) c--;
        for (; 1 <= s && 0 <= c; s--, c--)
          if (sampleLines[s] !== controlLines[c]) {
            if (1 !== s || 1 !== c) {
              do
                if ((s--, c--, 0 > c || sampleLines[s] !== controlLines[c])) {
                  let frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                  fn.displayName &&
                    frame.includes("<anonymous>") &&
                    (frame = frame.replace("<anonymous>", fn.displayName));
                  return frame;
                }
              while (1 <= s && 0 <= c);
            }
            break;
          }
      }
    } finally {
      (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
    }
    return (fn = fn ? fn.displayName || fn.name : "")
      ? describeBuiltInComponentFrame(fn)
      : "";
  }
  function describeFiber(fiber) {
    switch (fiber.tag) {
      case 5:
        return describeBuiltInComponentFrame(fiber.type);
      case 16:
        return describeBuiltInComponentFrame("Lazy");
      case 13:
        return describeBuiltInComponentFrame("Suspense");
      case 19:
        return describeBuiltInComponentFrame("SuspenseList");
      case 0:
      case 2:
      case 15:
        return (fiber = describeNativeComponentFrame(fiber.type, !1)), fiber;
      case 11:
        return (
          (fiber = describeNativeComponentFrame(fiber.type.render, !1)), fiber
        );
      case 1:
        return (fiber = describeNativeComponentFrame(fiber.type, !0)), fiber;
      default:
        return "";
    }
  }
  function getComponentNameFromType(type) {
    if (null == type) return null;
    if ("function" === typeof type)
      return type.displayName || type.name || null;
    if ("string" === typeof type) return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
    }
    if ("object" === typeof type)
      switch (type.$$typeof) {
        case REACT_CONTEXT_TYPE:
          return (type.displayName || "Context") + ".Consumer";
        case REACT_PROVIDER_TYPE:
          return (type._context.displayName || "Context") + ".Provider";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type ||
            ((type = innerType.displayName || innerType.name || ""),
            (type = "" !== type ? `${"ForwardRef"}(${type})` : "ForwardRef"));
          return type;
        case REACT_MEMO_TYPE:
          return (
            (innerType = type.displayName || null),
            null !== innerType
              ? innerType
              : getComponentNameFromType(type.type) || "Memo"
          );
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {}
      }
    return null;
  }
  function getComponentNameFromFiber(fiber) {
    const { tag, type } = fiber;
    switch (tag) {
      case 24:
        return "Cache";
      case 9:
        return (type.displayName || "Context") + ".Consumer";
      case 10:
        return (type._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return (
          (fiber = type.render),
          (fiber = fiber.displayName || fiber.name || ""),
          type.displayName ||
            ("" !== fiber ? `${"ForwardRef"}(${fiber})` : "ForwardRef")
        );
      case 7:
        return "Fragment";
      case 5:
        return type;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return getComponentNameFromType(type);
      case 8:
        return type === REACT_STRICT_MODE_TYPE ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if ("function" === typeof type)
          return type.displayName || type.name || null;
        if ("string" === typeof type) return type;
    }
    return null;
  }
  function getToStringValue(value) {
    switch (typeof value) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return value;
      case "object":
        return value;
      default:
        return "";
    }
  }
  function isCheckable(elem) {
    const type = elem.type;
    return (
      (elem = elem.nodeName) &&
      "input" === elem.toLowerCase() &&
      ("checkbox" === type || "radio" === type)
    );
  }
  function trackValueOnNode(node) {
    const valueField = isCheckable(node) ? "checked" : "value",
      descriptor = Object.getOwnPropertyDescriptor(
        node.constructor.prototype,
        valueField
      );
    let currentValue = "" + node[valueField];
    if (
      !node.hasOwnProperty(valueField) &&
      "undefined" !== typeof descriptor &&
      "function" === typeof descriptor.get &&
      "function" === typeof descriptor.set
    ) {
      var { get, set } = descriptor;
      Object.defineProperty(node, valueField, {
        configurable: !0,
        get: function () {
          return get.call(this);
        },
        set: function (value) {
          currentValue = "" + value;
          set.call(this, value);
        }
      });
      Object.defineProperty(node, valueField, {
        enumerable: descriptor.enumerable
      });
      return {
        getValue() {
          return currentValue;
        },
        setValue(value) {
          currentValue = "" + value;
        },
        stopTracking() {
          node._valueTracker = null;
          delete node[valueField];
        }
      };
    }
  }
  function track(node) {
    node._valueTracker || (node._valueTracker = trackValueOnNode(node));
  }
  function updateValueIfChanged(node) {
    if (!node) return !1;
    const tracker = node._valueTracker;
    if (!tracker) return !0;
    const lastValue = tracker.getValue();
    {
      let value = "";
      node &&
        (value = isCheckable(node)
          ? node.checked
            ? "true"
            : "false"
          : node.value);
      node = value;
    }
    return node !== lastValue ? (tracker.setValue(node), !0) : !1;
  }
  function getActiveElement(doc) {
    doc = doc || document;
    try {
      return doc.activeElement || doc.body;
    } catch (e) {
      return doc.body;
    }
  }
  function getHostProps$2(element, props) {
    const checked = props.checked;
    return assign({}, props, {
      defaultChecked: void 0,
      defaultValue: void 0,
      value: void 0,
      checked: null != checked ? checked : element._wrapperState.initialChecked
    });
  }
  function initWrapperState$2(element, props) {
    var defaultValue = null == props.defaultValue ? "" : props.defaultValue,
      JSCompiler_temp_const =
        null != props.checked ? props.checked : props.defaultChecked;
    defaultValue = getToStringValue(
      null != props.value ? props.value : defaultValue
    );
    element._wrapperState = {
      initialChecked: JSCompiler_temp_const,
      initialValue: defaultValue,
      controlled:
        "checkbox" === props.type || "radio" === props.type
          ? null != props.checked
          : null != props.value
    };
  }
  function updateChecked(element, props) {
    props = props.checked;
    null != props && setValueForProperty(element, "checked", props, !1);
  }
  function updateWrapper$1(element, props) {
    updateChecked(element, props);
    const value = getToStringValue(props.value),
      type = props.type;
    if (null != value)
      if ("number" === type) {
        if ((0 === value && "" === element.value) || element.value != value)
          element.value = "" + value;
      } else element.value !== "" + value && (element.value = "" + value);
    else if ("submit" === type || "reset" === type) {
      element.removeAttribute("value");
      return;
    }
    props.hasOwnProperty("value")
      ? setDefaultValue(element, props.type, value)
      : props.hasOwnProperty("defaultValue") &&
        setDefaultValue(
          element,
          props.type,
          getToStringValue(props.defaultValue)
        );
    null == props.checked &&
      null != props.defaultChecked &&
      (element.defaultChecked = !!props.defaultChecked);
  }
  function postMountWrapper$3(element, props, isHydrating) {
    if (props.hasOwnProperty("value") || props.hasOwnProperty("defaultValue")) {
      const type = props.type;
      if (
        !(
          ("submit" !== type && "reset" !== type) ||
          (void 0 !== props.value && null !== props.value)
        )
      )
        return;
      props = "" + element._wrapperState.initialValue;
      isHydrating || props === element.value || (element.value = props);
      element.defaultValue = props;
    }
    isHydrating = element.name;
    "" !== isHydrating && (element.name = "");
    element.defaultChecked = !!element._wrapperState.initialChecked;
    "" !== isHydrating && (element.name = isHydrating);
  }
  function setDefaultValue(node, type, value) {
    if ("number" !== type || getActiveElement(node.ownerDocument) !== node)
      null == value
        ? (node.defaultValue = "" + node._wrapperState.initialValue)
        : node.defaultValue !== "" + value && (node.defaultValue = "" + value);
  }
  function updateOptions(node, multiple, propValue, setDefaultSelected) {
    node = node.options;
    if (multiple) {
      multiple = {};
      for (var i = 0; i < propValue.length; i++)
        multiple["$" + propValue[i]] = !0;
      for (propValue = 0; propValue < node.length; propValue++)
        (i = multiple.hasOwnProperty("$" + node[propValue].value)),
          node[propValue].selected !== i && (node[propValue].selected = i),
          i && setDefaultSelected && (node[propValue].defaultSelected = !0);
    } else {
      propValue = "" + getToStringValue(propValue);
      multiple = null;
      for (i = 0; i < node.length; i++) {
        if (node[i].value === propValue) {
          node[i].selected = !0;
          setDefaultSelected && (node[i].defaultSelected = !0);
          return;
        }
        null !== multiple || node[i].disabled || (multiple = node[i]);
      }
      null !== multiple && (multiple.selected = !0);
    }
  }
  function getHostProps(element, props) {
    return {
      ...props,
      value: void 0,
      defaultValue: void 0,
      children: "" + element._wrapperState.initialValue
    };
  }
  function initWrapperState(element, props) {
    let initialValue = props.value;
    if (null == initialValue) {
      let { children, defaultValue } = props;
      if (null != children) {
        if (null != defaultValue)
          throw Error(
            "If you supply `defaultValue` on a <textarea>, do not pass children."
          );
        if (isArrayImpl(children)) {
          if (1 < children.length)
            throw Error("<textarea> can only have at most one child.");
          children = children[0];
        }
        defaultValue = children;
      }
      null == defaultValue && (defaultValue = "");
      initialValue = defaultValue;
    }
    element._wrapperState = { initialValue: getToStringValue(initialValue) };
  }
  function updateWrapper(element, props) {
    var value = getToStringValue(props.value);
    const defaultValue = getToStringValue(props.defaultValue);
    null != value &&
      ((value = "" + value),
      value !== element.value && (element.value = value),
      null == props.defaultValue &&
        element.defaultValue !== value &&
        (element.defaultValue = value));
    null != defaultValue && (element.defaultValue = "" + defaultValue);
  }
  function postMountWrapper(element, props) {
    props = element.textContent;
    props === element._wrapperState.initialValue &&
      "" !== props &&
      null !== props &&
      (element.value = props);
  }
  function dangerousStyleValue(name, value, isCustomProperty) {
    return null == value || "boolean" === typeof value || "" === value
      ? ""
      : isCustomProperty ||
          "number" !== typeof value ||
          0 === value ||
          (isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])
        ? ("" + value).trim()
        : value + "px";
  }
  function setValueForStyles(node, styles) {
    node = node.style;
    for (let styleName in styles) {
      if (!styles.hasOwnProperty(styleName)) continue;
      const isCustomProperty = 0 === styleName.indexOf("--"),
        styleValue = dangerousStyleValue(
          styleName,
          styles[styleName],
          isCustomProperty
        );
      "float" === styleName && (styleName = "cssFloat");
      isCustomProperty
        ? node.setProperty(styleName, styleValue)
        : (node[styleName] = styleValue);
    }
  }
  function getChildNamespace(parentNamespace, type) {
    return "http://www.w3.org/1999/xhtml";
  }
  function assertValidProps(tag, props) {
    if (props) {
      if (voidElementTags[tag] && null != props.children)
        throw Error(
          `${tag} is a void element tag and must not have 'children'`
        );
      if (null != props.dangerouslySetInnerHTML)
        throw Error("`props.dangerouslySetInnerHTML` ... really ?");
      if (null != props.style && "object" !== typeof props.style)
        throw Error(
          "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX."
        );
    }
  }
  function isCustomComponent(tagName, props) {
    if (-1 === tagName.indexOf("-")) return "string" === typeof props.is;
    switch (tagName) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  function getEventTarget(nativeEvent) {
    nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
    nativeEvent.correspondingUseElement &&
      (nativeEvent = nativeEvent.correspondingUseElement);
    return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
  }
  function restoreStateOfTarget(target) {
    if ((target = getInstanceFromNode(target))) {
      if ("function" !== typeof restoreImpl)
        throw Error(
          "setRestoreImplementation() needs to be called to handle a target for controlled events. This error is likely caused by a bug in React. Please file an issue."
        );
      var stateNode = target.stateNode;
      stateNode &&
        ((stateNode = getFiberCurrentPropsFromNode(stateNode)),
        restoreImpl(target.stateNode, target.type, stateNode));
    }
  }
  function enqueueStateRestore(target) {
    restoreTarget
      ? restoreQueue
        ? restoreQueue.push(target)
        : (restoreQueue = [target])
      : (restoreTarget = target);
  }
  function restoreStateIfNeeded() {
    if (restoreTarget) {
      var target = restoreTarget,
        queuedTargets = restoreQueue;
      restoreQueue = restoreTarget = null;
      restoreStateOfTarget(target);
      if (queuedTargets)
        for (target = 0; target < queuedTargets.length; target++)
          restoreStateOfTarget(queuedTargets[target]);
    }
  }
  function batchedUpdates$1(fn, a, b) {
    if (isInsideEventHandler) return fn(a, b);
    isInsideEventHandler = !0;
    try {
      return batchedUpdatesImpl(fn, a, b);
    } finally {
      if (
        ((isInsideEventHandler = !1),
        null !== restoreTarget || null !== restoreQueue)
      )
        flushSyncImpl(), restoreStateIfNeeded();
    }
  }
  function getListener(inst, registrationName) {
    var stateNode = inst.stateNode;
    if (null === stateNode) return null;
    var props = getFiberCurrentPropsFromNode(stateNode);
    if (null === props) return null;
    stateNode = props[registrationName];
    a: switch (registrationName) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (props = !props.disabled) ||
          ((inst = inst.type),
          (props = !(
            "button" === inst ||
            "input" === inst ||
            "select" === inst ||
            "textarea" === inst
          )));
        inst = !props;
        break a;
      default:
        inst = !1;
    }
    if (inst) return null;
    if (stateNode && "function" !== typeof stateNode)
      throw Error(
        `Expected \`${registrationName}\` listener to be a function, instead got a value of \`${typeof stateNode}\` type.`
      );
    return stateNode;
  }
  function invokeGuardedCallback(name, func, context, a, b, c, d, e, f) {
    hasError = !1;
    caughtError = null;
    invokeGuardedCallbackImpl.apply(reporter, arguments);
  }
  function invokeGuardedCallbackAndCatchFirstError(
    name,
    func,
    context,
    a,
    b,
    c,
    d,
    e,
    f
  ) {
    invokeGuardedCallback.apply(this, arguments);
    if (hasError) {
      if (hasError) {
        var JSCompiler_inline_result = caughtError;
        hasError = !1;
        caughtError = null;
      } else
        throw Error(
          "clearCaughtError was called but no error was captured. This error is likely caused by a bug in React. Please file an issue."
        );
      hasRethrowError ||
        ((hasRethrowError = !0), (rethrowError = JSCompiler_inline_result));
    }
  }
  function getNearestMountedFiber(fiber) {
    let node = fiber,
      nearestMounted = fiber;
    if (fiber.alternate) for (; node.return; ) node = node.return;
    else {
      fiber = node;
      do
        (node = fiber),
          0 !== (node.flags & 4098) && (nearestMounted = node.return),
          (fiber = node.return);
      while (fiber);
    }
    return 3 === node.tag ? nearestMounted : null;
  }
  function getSuspenseInstanceFromFiber(fiber) {
    if (13 === fiber.tag) {
      let suspenseState = fiber.memoizedState;
      null === suspenseState &&
        ((fiber = fiber.alternate),
        null !== fiber && (suspenseState = fiber.memoizedState));
      if (null !== suspenseState) return suspenseState.dehydrated;
    }
    return null;
  }
  function assertIsMounted(fiber) {
    if (getNearestMountedFiber(fiber) !== fiber)
      throw Error("Unable to find node on an unmounted component.");
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate)
        throw Error("Unable to find node on an unmounted component.");
      return alternate !== fiber ? null : fiber;
    }
    let a = fiber;
    for (var b = alternate; ; ) {
      const parentA = a.return;
      if (null === parentA) break;
      var parentB = parentA.alternate;
      if (null === parentB) {
        b = parentA.return;
        if (null !== b) {
          a = b;
          continue;
        }
        break;
      }
      if (parentA.child === parentB.child) {
        for (parentB = parentA.child; parentB; ) {
          if (parentB === a) return assertIsMounted(parentA), fiber;
          if (parentB === b) return assertIsMounted(parentA), alternate;
          parentB = parentB.sibling;
        }
        throw Error("Unable to find node on an unmounted component.");
      }
      if (a.return !== b.return) (a = parentA), (b = parentB);
      else {
        let didFindChild = !1,
          child = parentA.child;
        for (; child; ) {
          if (child === a) {
            didFindChild = !0;
            a = parentA;
            b = parentB;
            break;
          }
          if (child === b) {
            didFindChild = !0;
            b = parentA;
            a = parentB;
            break;
          }
          child = child.sibling;
        }
        if (!didFindChild) {
          for (child = parentB.child; child; ) {
            if (child === a) {
              didFindChild = !0;
              a = parentB;
              b = parentA;
              break;
            }
            if (child === b) {
              didFindChild = !0;
              b = parentB;
              a = parentA;
              break;
            }
            child = child.sibling;
          }
          if (!didFindChild)
            throw Error(
              "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue."
            );
        }
      }
      if (a.alternate !== b)
        throw Error(
          "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue."
        );
    }
    if (3 !== a.tag)
      throw Error("Unable to find node on an unmounted component.");
    return a.stateNode.current === a ? fiber : alternate;
  }
  function findCurrentHostFiber(parent) {
    parent = findCurrentFiberUsingSlowPath(parent);
    return null !== parent ? findCurrentHostFiberImpl(parent) : null;
  }
  function findCurrentHostFiberImpl(node) {
    if (5 === node.tag || 6 === node.tag) return node;
    for (node = node.child; null !== node; ) {
      const match = findCurrentHostFiberImpl(node);
      if (null !== match) return match;
      node = node.sibling;
    }
    return null;
  }
  function onCommitRoot(root, eventPriority) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        injectedHook.onCommitFiberRoot(
          rendererID,
          root,
          void 0,
          128 === (root.current.flags & 128)
        );
      } catch (err) {}
  }
  function getHighestPriorityLanes(lanes) {
    switch (lanes & -lanes) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return lanes & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return lanes & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return lanes;
    }
  }
  function getNextLanes(root, wipLanes) {
    var pendingLanes = root.pendingLanes;
    if (0 === pendingLanes) return 0;
    let nextLanes = 0;
    var suspendedLanes = root.suspendedLanes,
      pingedLanes = root.pingedLanes,
      nonIdlePendingLanes = pendingLanes & 268435455;
    if (0 !== nonIdlePendingLanes) {
      const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
      0 !== nonIdleUnblockedLanes
        ? (nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes))
        : ((pingedLanes &= nonIdlePendingLanes),
          0 !== pingedLanes &&
            (nextLanes = getHighestPriorityLanes(pingedLanes)));
    } else
      (nonIdlePendingLanes = pendingLanes & ~suspendedLanes),
        0 !== nonIdlePendingLanes
          ? (nextLanes = getHighestPriorityLanes(nonIdlePendingLanes))
          : 0 !== pingedLanes &&
            (nextLanes = getHighestPriorityLanes(pingedLanes));
    if (0 === nextLanes) return 0;
    if (
      0 !== wipLanes &&
      wipLanes !== nextLanes &&
      0 === (wipLanes & suspendedLanes) &&
      ((suspendedLanes = nextLanes & -nextLanes),
      (pingedLanes = wipLanes & -wipLanes),
      suspendedLanes >= pingedLanes ||
        (16 === suspendedLanes && 0 !== (pingedLanes & 4194240)))
    )
      return wipLanes;
    0 !== (nextLanes & 4) && (nextLanes |= pendingLanes & 16);
    wipLanes = root.entangledLanes;
    if (0 !== wipLanes)
      for (root = root.entanglements, wipLanes &= nextLanes; 0 < wipLanes; )
        (pendingLanes = 31 - clz32(wipLanes)),
          (suspendedLanes = 1 << pendingLanes),
          (nextLanes |= root[pendingLanes]),
          (wipLanes &= ~suspendedLanes);
    return nextLanes;
  }
  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
        return currentTime + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return currentTime + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function markStarvedLanesAsExpired(root, currentTime) {
    const suspendedLanes = root.suspendedLanes,
      pingedLanes = root.pingedLanes,
      expirationTimes = root.expirationTimes;
    let lanes = root.pendingLanes;
    for (; 0 < lanes; ) {
      const index = 31 - clz32(lanes),
        lane = 1 << index,
        expirationTime = expirationTimes[index];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index] = computeExpirationTime(lane, currentTime);
      } else expirationTime <= currentTime && (root.expiredLanes |= lane);
      lanes &= ~lane;
    }
  }
  function getLanesToRetrySynchronouslyOnError(root) {
    root = root.pendingLanes & -1073741825;
    return 0 !== root ? root : root & 1073741824 ? 1073741824 : 0;
  }
  function claimNextTransitionLane() {
    const lane = nextTransitionLane;
    nextTransitionLane <<= 1;
    0 === (nextTransitionLane & 4194240) && (nextTransitionLane = 64);
    return lane;
  }
  function createLaneMap(initial) {
    const laneMap = [];
    for (let i = 0; 31 > i; i++) laneMap.push(initial);
    return laneMap;
  }
  function markRootUpdated(root, updateLane, eventTime) {
    root.pendingLanes |= updateLane;
    536870912 !== updateLane &&
      ((root.suspendedLanes = 0), (root.pingedLanes = 0));
    root = root.eventTimes;
    updateLane = 31 - clz32(updateLane);
    root[updateLane] = eventTime;
  }
  function markRootFinished(root, remainingLanes) {
    var noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
    root.pendingLanes = remainingLanes;
    root.suspendedLanes = 0;
    root.pingedLanes = 0;
    root.expiredLanes &= remainingLanes;
    root.mutableReadLanes &= remainingLanes;
    root.entangledLanes &= remainingLanes;
    remainingLanes = root.entanglements;
    const eventTimes = root.eventTimes;
    for (root = root.expirationTimes; 0 < noLongerPendingLanes; ) {
      const index = 31 - clz32(noLongerPendingLanes),
        lane = 1 << index;
      remainingLanes[index] = 0;
      eventTimes[index] = -1;
      root[index] = -1;
      noLongerPendingLanes &= ~lane;
    }
  }
  function markRootEntangled(root, entangledLanes) {
    var rootEntangledLanes = (root.entangledLanes |= entangledLanes);
    for (root = root.entanglements; rootEntangledLanes; ) {
      const index = 31 - clz32(rootEntangledLanes),
        lane = 1 << index;
      (lane & entangledLanes) | (root[index] & entangledLanes) &&
        (root[index] |= entangledLanes);
      rootEntangledLanes &= ~lane;
    }
  }
  function runWithPriority(priority, fn) {
    const previousPriority = currentUpdatePriority;
    try {
      return (currentUpdatePriority = priority), fn();
    } finally {
      currentUpdatePriority = previousPriority;
    }
  }
  function lanesToEventPriority(lanes) {
    lanes &= -lanes;
    return 1 < lanes
      ? 4 < lanes
        ? 0 !== (lanes & 268435455)
          ? 16
          : 536870912
        : 4
      : 1;
  }
  function clearIfContinuousEvent(domEventName, nativeEvent) {
    switch (domEventName) {
      case "focusin":
      case "focusout":
        queuedFocus = null;
        break;
      case "dragenter":
      case "dragleave":
        queuedDrag = null;
        break;
      case "mouseover":
      case "mouseout":
        queuedMouse = null;
        break;
      case "pointerover":
      case "pointerout":
        queuedPointers.delete(nativeEvent.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        queuedPointerCaptures.delete(nativeEvent.pointerId);
    }
  }
  function accumulateOrCreateContinuousQueuedReplayableEvent(
    existingQueuedEvent,
    blockedOn,
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  ) {
    if (
      null === existingQueuedEvent ||
      existingQueuedEvent.nativeEvent !== nativeEvent
    )
      return (
        (existingQueuedEvent = {
          blockedOn,
          domEventName,
          eventSystemFlags,
          nativeEvent,
          targetContainers: [targetContainer]
        }),
        null !== blockedOn &&
          ((blockedOn = getInstanceFromNode(blockedOn)),
          null !== blockedOn && attemptContinuousHydration$1(blockedOn)),
        existingQueuedEvent
      );
    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    blockedOn = existingQueuedEvent.targetContainers;
    null !== targetContainer &&
      -1 === blockedOn.indexOf(targetContainer) &&
      blockedOn.push(targetContainer);
    return existingQueuedEvent;
  }
  function queueIfContinuousEvent(
    blockedOn,
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  ) {
    switch (domEventName) {
      case "focusin":
        return (
          (queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedFocus,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )),
          !0
        );
      case "dragenter":
        return (
          (queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedDrag,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )),
          !0
        );
      case "mouseover":
        return (
          (queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedMouse,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )),
          !0
        );
      case "pointerover":
        var pointerId = nativeEvent.pointerId;
        queuedPointers.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointers.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        );
        return !0;
      case "gotpointercapture":
        return (
          (pointerId = nativeEvent.pointerId),
          queuedPointerCaptures.set(
            pointerId,
            accumulateOrCreateContinuousQueuedReplayableEvent(
              queuedPointerCaptures.get(pointerId) || null,
              blockedOn,
              domEventName,
              eventSystemFlags,
              targetContainer,
              nativeEvent
            )
          ),
          !0
        );
    }
    return !1;
  }
  function attemptExplicitHydrationTarget(queuedTarget) {
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);
    if (null !== targetInst) {
      const nearestMounted = getNearestMountedFiber(targetInst);
      if (null !== nearestMounted)
        if (((targetInst = nearestMounted.tag), 13 === targetInst)) {
          if (
            ((targetInst = getSuspenseInstanceFromFiber(nearestMounted)),
            null !== targetInst)
          ) {
            queuedTarget.blockedOn = targetInst;
            attemptHydrationAtPriority(queuedTarget.priority, () => {
              attemptHydrationAtCurrentPriority$1(nearestMounted);
            });
            return;
          }
        } else if (
          3 === targetInst &&
          nearestMounted.stateNode.current.memoizedState.isDehydrated
        ) {
          queuedTarget.blockedOn =
            3 === nearestMounted.tag
              ? nearestMounted.stateNode.containerInfo
              : null;
          return;
        }
    }
    queuedTarget.blockedOn = null;
  }
  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (null !== queuedEvent.blockedOn) return !1;
    for (
      var targetContainers = queuedEvent.targetContainers;
      0 < targetContainers.length;

    ) {
      var nextBlockedOn = findInstanceBlockingEvent(
        queuedEvent.domEventName,
        queuedEvent.eventSystemFlags,
        targetContainers[0],
        queuedEvent.nativeEvent
      );
      if (null === nextBlockedOn) {
        nextBlockedOn = queuedEvent.nativeEvent;
        const nativeEventClone = new nextBlockedOn.constructor(
          nextBlockedOn.type,
          nextBlockedOn
        );
        currentReplayingEvent = nativeEventClone;
        nextBlockedOn.target.dispatchEvent(nativeEventClone);
        currentReplayingEvent = null;
      } else
        return (
          (targetContainers = getInstanceFromNode(nextBlockedOn)),
          null !== targetContainers &&
            attemptContinuousHydration$1(targetContainers),
          (queuedEvent.blockedOn = nextBlockedOn),
          !1
        );
      targetContainers.shift();
    }
    return !0;
  }
  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
  }
  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = !1;
    null !== queuedFocus &&
      attemptReplayContinuousQueuedEvent(queuedFocus) &&
      (queuedFocus = null);
    null !== queuedDrag &&
      attemptReplayContinuousQueuedEvent(queuedDrag) &&
      (queuedDrag = null);
    null !== queuedMouse &&
      attemptReplayContinuousQueuedEvent(queuedMouse) &&
      (queuedMouse = null);
    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }
  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    queuedEvent.blockedOn === unblocked &&
      ((queuedEvent.blockedOn = null),
      hasScheduledReplayAttempt ||
        ((hasScheduledReplayAttempt = !0),
        unstable_scheduleCallback(
          unstable_NormalPriority,
          replayUnblockedEvents
        )));
  }
  function retryIfBlockedOn(unblocked) {
    if (0 < queuedDiscreteEvents.length) {
      scheduleCallbackIfUnblocked(queuedDiscreteEvents[0], unblocked);
      for (var i = 1; i < queuedDiscreteEvents.length; i++) {
        var queuedEvent = queuedDiscreteEvents[i];
        queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null);
      }
    }
    null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    i = (queuedEvent) => scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    queuedPointers.forEach(i);
    queuedPointerCaptures.forEach(i);
    for (i = 0; i < queuedExplicitHydrationTargets.length; i++)
      (queuedEvent = queuedExplicitHydrationTargets[i]),
        queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null);
    for (
      ;
      0 < queuedExplicitHydrationTargets.length &&
      ((i = queuedExplicitHydrationTargets[0]), null === i.blockedOn);

    )
      attemptExplicitHydrationTarget(i),
        null === i.blockedOn && queuedExplicitHydrationTargets.shift();
  }
  function dispatchDiscreteEvent(
    domEventName,
    eventSystemFlags,
    container,
    nativeEvent
  ) {
    const previousPriority = currentUpdatePriority,
      prevTransition = ReactCurrentBatchConfig$3.transition;
    ReactCurrentBatchConfig$3.transition = null;
    try {
      (currentUpdatePriority = 1),
        dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      (currentUpdatePriority = previousPriority),
        (ReactCurrentBatchConfig$3.transition = prevTransition);
    }
  }
  function dispatchContinuousEvent(
    domEventName,
    eventSystemFlags,
    container,
    nativeEvent
  ) {
    const previousPriority = currentUpdatePriority,
      prevTransition = ReactCurrentBatchConfig$3.transition;
    ReactCurrentBatchConfig$3.transition = null;
    try {
      (currentUpdatePriority = 4),
        dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      (currentUpdatePriority = previousPriority),
        (ReactCurrentBatchConfig$3.transition = prevTransition);
    }
  }
  function dispatchEvent(
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  ) {
    if (_enabled) {
      {
        let blockedOn = findInstanceBlockingEvent(
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        );
        if (null === blockedOn)
          dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            return_targetInst,
            targetContainer
          ),
            clearIfContinuousEvent(domEventName, nativeEvent);
        else if (
          queueIfContinuousEvent(
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        )
          nativeEvent.stopPropagation();
        else if (
          (clearIfContinuousEvent(domEventName, nativeEvent),
          eventSystemFlags & 4 &&
            -1 < discreteReplayableEvents.indexOf(domEventName))
        ) {
          for (; null !== blockedOn; ) {
            var fiber = getInstanceFromNode(blockedOn);
            null !== fiber && _attemptSynchronousHydration(fiber);
            fiber = findInstanceBlockingEvent(
              domEventName,
              eventSystemFlags,
              targetContainer,
              nativeEvent
            );
            null === fiber &&
              dispatchEventForPluginEventSystem(
                domEventName,
                eventSystemFlags,
                nativeEvent,
                return_targetInst,
                targetContainer
              );
            if (fiber === blockedOn) break;
            blockedOn = fiber;
          }
          null !== blockedOn && nativeEvent.stopPropagation();
        } else
          dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            null,
            targetContainer
          );
      }
    }
  }
  function findInstanceBlockingEvent(
    domEventName,
    eventSystemFlags,
    targetContainer,
    nativeEvent
  ) {
    return_targetInst = null;
    domEventName = getEventTarget(nativeEvent);
    domEventName = getClosestInstanceFromNode(domEventName);
    if (null !== domEventName)
      if (
        ((eventSystemFlags = getNearestMountedFiber(domEventName)),
        null === eventSystemFlags)
      )
        domEventName = null;
      else if (
        ((targetContainer = eventSystemFlags.tag), 13 === targetContainer)
      ) {
        domEventName = getSuspenseInstanceFromFiber(eventSystemFlags);
        if (null !== domEventName) return domEventName;
        domEventName = null;
      } else if (3 === targetContainer) {
        if (eventSystemFlags.stateNode.current.memoizedState.isDehydrated)
          return 3 === eventSystemFlags.tag
            ? eventSystemFlags.stateNode.containerInfo
            : null;
        domEventName = null;
      } else eventSystemFlags !== domEventName && (domEventName = null);
    return_targetInst = domEventName;
    return null;
  }
  function getEventPriority(domEventName) {
    switch (domEventName) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (getCurrentPriorityLevel()) {
          case ImmediatePriority:
            return 1;
          case UserBlockingPriority:
            return 4;
          case NormalPriority:
          case LowPriority:
            return 16;
          case IdlePriority:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  function getEventCharCode(nativeEvent) {
    const keyCode = nativeEvent.keyCode;
    "charCode" in nativeEvent
      ? ((nativeEvent = nativeEvent.charCode),
        0 === nativeEvent && 13 === keyCode && (nativeEvent = 13))
      : (nativeEvent = keyCode);
    10 === nativeEvent && (nativeEvent = 13);
    return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
  }
  function functionThatReturnsTrue() {
    return !0;
  }
  function functionThatReturnsFalse() {
    return !1;
  }
  function createSyntheticEvent(Interface) {
    function SyntheticBaseEvent(
      reactName,
      reactEventType,
      targetInst,
      nativeEvent,
      nativeEventTarget
    ) {
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;
      for (const propName in Interface)
        Interface.hasOwnProperty(propName) &&
          ((reactName = Interface[propName]),
          (this[propName] = reactName
            ? reactName(nativeEvent)
            : nativeEvent[propName]));
      this.isDefaultPrevented = (
        null != nativeEvent.defaultPrevented
          ? nativeEvent.defaultPrevented
          : !1 === nativeEvent.returnValue
      )
        ? functionThatReturnsTrue
        : functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
    }
    assign(SyntheticBaseEvent.prototype, {
      preventDefault: function () {
        this.defaultPrevented = !0;
        const event = this.nativeEvent;
        event &&
          (event.preventDefault
            ? event.preventDefault()
            : "unknown" !== typeof event.returnValue &&
              (event.returnValue = !1),
          (this.isDefaultPrevented = functionThatReturnsTrue));
      },
      stopPropagation: function () {
        const event = this.nativeEvent;
        event &&
          (event.stopPropagation
            ? event.stopPropagation()
            : "unknown" !== typeof event.cancelBubble &&
              (event.cancelBubble = !0),
          (this.isPropagationStopped = functionThatReturnsTrue));
      },
      persist: function () {},
      isPersistent: functionThatReturnsTrue
    });
    return SyntheticBaseEvent;
  }
  function modifierStateGetter(keyArg) {
    const nativeEvent = this.nativeEvent;
    return nativeEvent.getModifierState
      ? nativeEvent.getModifierState(keyArg)
      : (keyArg = modifierKeyToProp[keyArg])
        ? !!nativeEvent[keyArg]
        : !1;
  }
  function getEventModifierState(nativeEvent) {
    return modifierStateGetter;
  }
  function getDataFromCustomEvent(nativeEvent) {
    nativeEvent = nativeEvent.detail;
    return "object" === typeof nativeEvent && "data" in nativeEvent
      ? nativeEvent.data
      : null;
  }
  function getNativeBeforeInputChars(domEventName, nativeEvent) {
    switch (domEventName) {
      case "compositionend":
        return getDataFromCustomEvent(nativeEvent);
      case "keypress":
        if (32 !== nativeEvent.which) return null;
        hasSpaceKeypress = !0;
        return SPACEBAR_CHAR;
      case "textInput":
        return (
          (domEventName = nativeEvent.data),
          domEventName === SPACEBAR_CHAR && hasSpaceKeypress
            ? null
            : domEventName
        );
      default:
        return null;
    }
  }
  function getFallbackBeforeInputChars(domEventName, nativeEvent) {
    switch (domEventName) {
      case "paste":
        return null;
      case "keypress":
        if (
          !(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) ||
          (nativeEvent.ctrlKey && nativeEvent.altKey)
        ) {
          if (nativeEvent.char && 1 < nativeEvent.char.length)
            return nativeEvent.char;
          if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
        }
        return null;
      case "compositionend":
        return nativeEvent.data;
      default:
        return null;
    }
  }
  function isTextInputElement(elem) {
    const nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return "input" === nodeName
      ? !!supportedInputTypes[elem.type]
      : "textarea" === nodeName
        ? !0
        : !1;
  }
  function getInstIfValueChanged(targetInst) {
    const targetNode = getNodeFromInstance(targetInst);
    if (updateValueIfChanged(targetNode)) return targetInst;
  }
  function getTargetInstForChangeEvent(domEventName, targetInst) {
    if ("change" === domEventName) return targetInst;
  }
  function getTargetInstForClickEvent(domEventName, targetInst) {
    if ("click" === domEventName) return getInstIfValueChanged(targetInst);
  }
  function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
    if ("input" === domEventName || "change" === domEventName)
      return getInstIfValueChanged(targetInst);
  }
  function is(x, y) {
    return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
  }
  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) return !0;
    if (
      "object" !== typeof objA ||
      null === objA ||
      "object" !== typeof objB ||
      null === objB
    )
      return !1;
    const keysA = Object.keys(objA);
    var keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return !1;
    for (keysB = 0; keysB < keysA.length; keysB++) {
      const currentKey = keysA[keysB];
      if (
        !hasOwnProperty.call(objB, currentKey) ||
        !objectIs(objA[currentKey], objB[currentKey])
      )
        return !1;
    }
    return !0;
  }
  function getLeafNode(node) {
    for (; node && node.firstChild; ) node = node.firstChild;
    return node;
  }
  function getNodeForCharacterOffset(root, offset) {
    var node = getLeafNode(root);
    root = 0;
    let nodeEnd;
    for (; node; ) {
      if (3 === node.nodeType) {
        nodeEnd = root + node.textContent.length;
        if (root <= offset && nodeEnd >= offset)
          return { node, offset: offset - root };
        root = nodeEnd;
      }
      a: {
        for (; node; ) {
          if (node.nextSibling) {
            node = node.nextSibling;
            break a;
          }
          node = node.parentNode;
        }
        node = void 0;
      }
      node = getLeafNode(node);
    }
  }
  function containsNode(outerNode, innerNode) {
    return outerNode && innerNode
      ? outerNode === innerNode
        ? !0
        : outerNode && 3 === outerNode.nodeType
          ? !1
          : innerNode && 3 === innerNode.nodeType
            ? containsNode(outerNode, innerNode.parentNode)
            : "contains" in outerNode
              ? outerNode.contains(innerNode)
              : outerNode.compareDocumentPosition
                ? !!(outerNode.compareDocumentPosition(innerNode) & 16)
                : !1
      : !1;
  }
  function getActiveElementDeep() {
    let win = window,
      element = getActiveElement();
    for (; element instanceof win.HTMLIFrameElement; ) {
      try {
        var JSCompiler_inline_result =
          "string" === typeof element.contentWindow.location.href;
      } catch (err) {
        JSCompiler_inline_result = !1;
      }
      if (JSCompiler_inline_result) win = element.contentWindow;
      else break;
      element = getActiveElement(win.document);
    }
    return element;
  }
  function hasSelectionCapabilities(elem) {
    const nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return (
      nodeName &&
      (("input" === nodeName &&
        ("text" === elem.type ||
          "search" === elem.type ||
          "tel" === elem.type ||
          "url" === elem.type ||
          "password" === elem.type)) ||
        "textarea" === nodeName ||
        "true" === elem.contentEditable)
    );
  }
  function restoreSelection(priorSelectionInformation) {
    var curFocusedElem = getActiveElementDeep(),
      priorFocusedElem = priorSelectionInformation.focusedElem,
      priorSelectionRange = priorSelectionInformation.selectionRange;
    if (
      curFocusedElem !== priorFocusedElem &&
      priorFocusedElem &&
      priorFocusedElem.ownerDocument &&
      containsNode(
        priorFocusedElem.ownerDocument.documentElement,
        priorFocusedElem
      )
    ) {
      if (
        null !== priorSelectionRange &&
        hasSelectionCapabilities(priorFocusedElem)
      )
        if (
          ((curFocusedElem = priorSelectionRange.start),
          (priorSelectionInformation = priorSelectionRange.end),
          void 0 === priorSelectionInformation &&
            (priorSelectionInformation = curFocusedElem),
          "selectionStart" in priorFocusedElem)
        )
          (priorFocusedElem.selectionStart = curFocusedElem),
            (priorFocusedElem.selectionEnd = Math.min(
              priorSelectionInformation,
              priorFocusedElem.value.length
            ));
        else {
          var doc = priorFocusedElem.ownerDocument || document;
          curFocusedElem = (doc && doc.defaultView) || window;
          if (curFocusedElem.getSelection) {
            curFocusedElem = curFocusedElem.getSelection();
            var length = priorFocusedElem.textContent.length;
            priorSelectionInformation = Math.min(
              priorSelectionRange.start,
              length
            );
            priorSelectionRange =
              void 0 === priorSelectionRange.end
                ? priorSelectionInformation
                : Math.min(priorSelectionRange.end, length);
            !curFocusedElem.extend &&
              priorSelectionInformation > priorSelectionRange &&
              ((length = priorSelectionRange),
              (priorSelectionRange = priorSelectionInformation),
              (priorSelectionInformation = length));
            length = getNodeForCharacterOffset(
              priorFocusedElem,
              priorSelectionInformation
            );
            var endMarker = getNodeForCharacterOffset(
              priorFocusedElem,
              priorSelectionRange
            );
            length &&
              endMarker &&
              (1 !== curFocusedElem.rangeCount ||
                curFocusedElem.anchorNode !== length.node ||
                curFocusedElem.anchorOffset !== length.offset ||
                curFocusedElem.focusNode !== endMarker.node ||
                curFocusedElem.focusOffset !== endMarker.offset) &&
              ((doc = doc.createRange()),
              doc.setStart(length.node, length.offset),
              curFocusedElem.removeAllRanges(),
              priorSelectionInformation > priorSelectionRange
                ? (curFocusedElem.addRange(doc),
                  curFocusedElem.extend(endMarker.node, endMarker.offset))
                : (doc.setEnd(endMarker.node, endMarker.offset),
                  curFocusedElem.addRange(doc)));
          }
        }
      curFocusedElem = [];
      for (
        priorSelectionInformation = priorFocusedElem;
        (priorSelectionInformation = priorSelectionInformation.parentNode);

      )
        1 === priorSelectionInformation.nodeType &&
          curFocusedElem.push({
            element: priorSelectionInformation,
            left: priorSelectionInformation.scrollLeft,
            top: priorSelectionInformation.scrollTop
          });
      "function" === typeof priorFocusedElem.focus && priorFocusedElem.focus();
      for (
        priorFocusedElem = 0;
        priorFocusedElem < curFocusedElem.length;
        priorFocusedElem++
      )
        (priorSelectionInformation = curFocusedElem[priorFocusedElem]),
          (priorSelectionInformation.element.scrollLeft =
            priorSelectionInformation.left),
          (priorSelectionInformation.element.scrollTop =
            priorSelectionInformation.top);
    }
  }
  function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
    var doc =
      nativeEventTarget.window === nativeEventTarget
        ? nativeEventTarget.document
        : 9 === nativeEventTarget.nodeType
          ? nativeEventTarget
          : nativeEventTarget.ownerDocument;
    mouseDown ||
      null == activeElement ||
      activeElement !== getActiveElement(doc) ||
      ((doc = activeElement),
      "selectionStart" in doc && hasSelectionCapabilities(doc)
        ? (doc = { start: doc.selectionStart, end: doc.selectionEnd })
        : ((doc = (
            (doc.ownerDocument && doc.ownerDocument.defaultView) ||
            window
          ).getSelection()),
          (doc = {
            anchorNode: doc.anchorNode,
            anchorOffset: doc.anchorOffset,
            focusNode: doc.focusNode,
            focusOffset: doc.focusOffset
          })),
      (lastSelection && shallowEqual(lastSelection, doc)) ||
        ((lastSelection = doc),
        (doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect")),
        0 < doc.length &&
          ((nativeEvent = new SyntheticEvent(
            "onSelect",
            "select",
            null,
            nativeEvent,
            nativeEventTarget
          )),
          dispatchQueue.push({ event: nativeEvent, listeners: doc }),
          (nativeEvent.target = activeElement))));
  }
  function makePrefixMap(styleProp, eventName) {
    const prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes["Webkit" + styleProp] = "webkit" + eventName;
    prefixes["Moz" + styleProp] = "moz" + eventName;
    return prefixes;
  }
  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
    if (!vendorPrefixes[eventName]) return eventName;
    const prefixMap = vendorPrefixes[eventName];
    for (const styleProp in prefixMap)
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style)
        return (prefixedEventNames[eventName] = prefixMap[styleProp]);
    return eventName;
  }
  function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
    registerTwoPhaseEvent(reactName, [domEventName]);
  }
  function executeDispatch(event, listener, currentTarget) {
    const type = event.type || "unknown-event";
    event.currentTarget = currentTarget;
    invokeGuardedCallbackAndCatchFirstError(type, listener, void 0, event);
    event.currentTarget = null;
  }
  function listenToNonDelegatedEvent(domEventName, targetElement) {
    var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
    void 0 === JSCompiler_inline_result &&
      (JSCompiler_inline_result = targetElement[internalEventHandlersKey] =
        new Set());
    const listenerSetKey = `${domEventName}__${"bubble"}`;
    JSCompiler_inline_result.has(listenerSetKey) ||
      (addTrappedEventListener(targetElement, domEventName, 2, !1),
      JSCompiler_inline_result.add(listenerSetKey));
  }
  function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    let eventSystemFlags = 0;
    isCapturePhaseListener && (eventSystemFlags |= 4);
    addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener
    );
  }
  function listenToAllSupportedEvents(rootContainerElement) {
    if (!rootContainerElement[listeningMarker]) {
      rootContainerElement[listeningMarker] = !0;
      allNativeEvents.forEach((domEventName) => {
        "selectionchange" !== domEventName &&
          (nonDelegatedEvents.has(domEventName) ||
            listenToNativeEvent(domEventName, !1, rootContainerElement),
          listenToNativeEvent(domEventName, !0, rootContainerElement));
      });
      const ownerDocument =
        9 === rootContainerElement.nodeType
          ? rootContainerElement
          : rootContainerElement.ownerDocument;
      null === ownerDocument ||
        ownerDocument[listeningMarker] ||
        ((ownerDocument[listeningMarker] = !0),
        listenToNativeEvent("selectionchange", !1, ownerDocument));
    }
  }
  function addTrappedEventListener(
    targetContainer,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener
  ) {
    switch (getEventPriority(domEventName)) {
      case 1:
        var listenerWrapper = dispatchDiscreteEvent;
        break;
      case 4:
        listenerWrapper = dispatchContinuousEvent;
        break;
      default:
        listenerWrapper = dispatchEvent;
    }
    eventSystemFlags = listenerWrapper.bind(
      null,
      domEventName,
      eventSystemFlags,
      targetContainer
    );
    listenerWrapper =
      "touchstart" === domEventName ||
      "touchmove" === domEventName ||
      "wheel" === domEventName;
    isCapturePhaseListener
      ? void 0 !== listenerWrapper
        ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
            capture: !0,
            passive: listenerWrapper
          })
        : targetContainer.addEventListener(domEventName, eventSystemFlags, !0)
      : void 0 !== listenerWrapper
        ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
            passive: listenerWrapper
          })
        : targetContainer.addEventListener(domEventName, eventSystemFlags, !1);
  }
  function dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  ) {
    let ancestorInst = targetInst;
    if (
      0 === (eventSystemFlags & 1) &&
      0 === (eventSystemFlags & 2) &&
      null !== targetInst
    )
      a: for (;;) {
        if (null === targetInst) return;
        var nodeTag = targetInst.tag;
        if (3 === nodeTag || 4 === nodeTag) {
          let container = targetInst.stateNode.containerInfo;
          if (
            container === targetContainer ||
            (8 === container.nodeType &&
              container.parentNode === targetContainer)
          )
            break;
          if (4 === nodeTag)
            for (nodeTag = targetInst.return; null !== nodeTag; ) {
              var grandTag = nodeTag.tag;
              if (3 === grandTag || 4 === grandTag)
                if (
                  ((grandTag = nodeTag.stateNode.containerInfo),
                  grandTag === targetContainer ||
                    (8 === grandTag.nodeType &&
                      grandTag.parentNode === targetContainer))
                )
                  return;
              nodeTag = nodeTag.return;
            }
          for (; null !== container; ) {
            nodeTag = getClosestInstanceFromNode(container);
            if (null === nodeTag) return;
            grandTag = nodeTag.tag;
            if (5 === grandTag || 6 === grandTag) {
              targetInst = ancestorInst = nodeTag;
              continue a;
            }
            container = container.parentNode;
          }
        }
        targetInst = targetInst.return;
      }
    batchedUpdates$1(() => {
      var targetInst = ancestorInst,
        nativeEventTarget = getEventTarget(nativeEvent),
        dispatchQueue = [];
      a: {
        var reactName = topLevelEventsToReactNames.get(domEventName);
        if (void 0 !== reactName) {
          var SyntheticEventCtor = SyntheticEvent,
            reactEventType = domEventName;
          switch (domEventName) {
            case "keypress":
              if (0 === getEventCharCode(nativeEvent)) break a;
            case "keydown":
            case "keyup":
              SyntheticEventCtor = SyntheticKeyboardEvent;
              break;
            case "focusin":
              reactEventType = "focus";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "focusout":
              reactEventType = "blur";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "beforeblur":
            case "afterblur":
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "click":
              if (2 === nativeEvent.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              SyntheticEventCtor = SyntheticMouseEvent;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              SyntheticEventCtor = SyntheticDragEvent;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              SyntheticEventCtor = SyntheticTouchEvent;
              break;
            case ANIMATION_END:
            case ANIMATION_ITERATION:
            case ANIMATION_START:
              SyntheticEventCtor = SyntheticAnimationEvent;
              break;
            case TRANSITION_END:
              SyntheticEventCtor = SyntheticTransitionEvent;
              break;
            case "scroll":
              SyntheticEventCtor = SyntheticUIEvent;
              break;
            case "wheel":
              SyntheticEventCtor = SyntheticWheelEvent;
              break;
            case "copy":
            case "cut":
            case "paste":
              SyntheticEventCtor = SyntheticClipboardEvent;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              SyntheticEventCtor = SyntheticPointerEvent;
          }
          var inCapturePhase = 0 !== (eventSystemFlags & 4),
            reactName$jscomp$0 = reactName;
          var JSCompiler_inline_result =
            !inCapturePhase && "scroll" === domEventName;
          inCapturePhase = inCapturePhase
            ? null !== reactName$jscomp$0
              ? reactName$jscomp$0 + "Capture"
              : null
            : reactName$jscomp$0;
          reactName$jscomp$0 = [];
          for (
            var instance = targetInst, lastHostComponent;
            null !== instance;

          ) {
            const { stateNode, tag } = instance;
            if (
              5 === tag &&
              null !== stateNode &&
              ((lastHostComponent = stateNode), null !== inCapturePhase)
            ) {
              var listener = getListener(instance, inCapturePhase);
              null != listener &&
                reactName$jscomp$0.push(
                  createDispatchListener(instance, listener, lastHostComponent)
                );
            }
            if (JSCompiler_inline_result) break;
            instance = instance.return;
          }
          JSCompiler_inline_result = reactName$jscomp$0;
          0 < JSCompiler_inline_result.length &&
            ((SyntheticEventCtor = new SyntheticEventCtor(
              reactName,
              reactEventType,
              null,
              nativeEvent,
              nativeEventTarget
            )),
            dispatchQueue.push({
              event: SyntheticEventCtor,
              listeners: JSCompiler_inline_result
            }));
        }
      }
      if (0 === (eventSystemFlags & 7)) {
        a: {
          SyntheticEventCtor =
            "mouseover" === domEventName || "pointerover" === domEventName;
          reactEventType =
            "mouseout" === domEventName || "pointerout" === domEventName;
          if (
            SyntheticEventCtor &&
            nativeEvent !== currentReplayingEvent &&
            (reactName =
              nativeEvent.relatedTarget || nativeEvent.fromElement) &&
            (getClosestInstanceFromNode(reactName) ||
              reactName[internalContainerInstanceKey])
          )
            break a;
          if (reactEventType || SyntheticEventCtor) {
            SyntheticEventCtor =
              nativeEventTarget.window === nativeEventTarget
                ? nativeEventTarget
                : (SyntheticEventCtor = nativeEventTarget.ownerDocument)
                  ? SyntheticEventCtor.defaultView ||
                    SyntheticEventCtor.parentWindow
                  : window;
            if (reactEventType) {
              if (
                ((reactName =
                  nativeEvent.relatedTarget || nativeEvent.toElement),
                (reactEventType = targetInst),
                (reactName = reactName
                  ? getClosestInstanceFromNode(reactName)
                  : null),
                null !== reactName &&
                  ((JSCompiler_inline_result =
                    getNearestMountedFiber(reactName)),
                  reactName !== JSCompiler_inline_result ||
                    (5 !== reactName.tag && 6 !== reactName.tag)))
              )
                reactName = null;
            } else (reactEventType = null), (reactName = targetInst);
            if (reactEventType !== reactName) {
              inCapturePhase = SyntheticMouseEvent;
              listener = "onMouseLeave";
              reactName$jscomp$0 = "onMouseEnter";
              instance = "mouse";
              if (
                "pointerout" === domEventName ||
                "pointerover" === domEventName
              )
                (inCapturePhase = SyntheticPointerEvent),
                  (listener = "onPointerLeave"),
                  (reactName$jscomp$0 = "onPointerEnter"),
                  (instance = "pointer");
              JSCompiler_inline_result =
                null == reactEventType
                  ? SyntheticEventCtor
                  : getNodeFromInstance(reactEventType);
              lastHostComponent =
                null == reactName
                  ? SyntheticEventCtor
                  : getNodeFromInstance(reactName);
              SyntheticEventCtor = new inCapturePhase(
                listener,
                instance + "leave",
                reactEventType,
                nativeEvent,
                nativeEventTarget
              );
              SyntheticEventCtor.target = JSCompiler_inline_result;
              SyntheticEventCtor.relatedTarget = lastHostComponent;
              listener = null;
              getClosestInstanceFromNode(nativeEventTarget) === targetInst &&
                ((inCapturePhase = new inCapturePhase(
                  reactName$jscomp$0,
                  instance + "enter",
                  reactName,
                  nativeEvent,
                  nativeEventTarget
                )),
                (inCapturePhase.target = lastHostComponent),
                (inCapturePhase.relatedTarget = JSCompiler_inline_result),
                (listener = inCapturePhase));
              JSCompiler_inline_result = listener;
              if (reactEventType && reactName)
                b: {
                  inCapturePhase = reactEventType;
                  reactName$jscomp$0 = reactName;
                  instance = 0;
                  for (
                    lastHostComponent = inCapturePhase;
                    lastHostComponent;
                    lastHostComponent = getParent(lastHostComponent)
                  )
                    instance++;
                  lastHostComponent = 0;
                  for (
                    listener = reactName$jscomp$0;
                    listener;
                    listener = getParent(listener)
                  )
                    lastHostComponent++;
                  for (; 0 < instance - lastHostComponent; )
                    (inCapturePhase = getParent(inCapturePhase)), instance--;
                  for (; 0 < lastHostComponent - instance; )
                    (reactName$jscomp$0 = getParent(reactName$jscomp$0)),
                      lastHostComponent--;
                  for (; instance--; ) {
                    if (
                      inCapturePhase === reactName$jscomp$0 ||
                      (null !== reactName$jscomp$0 &&
                        inCapturePhase === reactName$jscomp$0.alternate)
                    )
                      break b;
                    inCapturePhase = getParent(inCapturePhase);
                    reactName$jscomp$0 = getParent(reactName$jscomp$0);
                  }
                  inCapturePhase = null;
                }
              else inCapturePhase = null;
              null !== reactEventType &&
                accumulateEnterLeaveListenersForEvent(
                  dispatchQueue,
                  SyntheticEventCtor,
                  reactEventType,
                  inCapturePhase,
                  !1
                );
              null !== reactName &&
                null !== JSCompiler_inline_result &&
                accumulateEnterLeaveListenersForEvent(
                  dispatchQueue,
                  JSCompiler_inline_result,
                  reactName,
                  inCapturePhase,
                  !0
                );
            }
          }
        }
        a: {
          SyntheticEventCtor = targetInst
            ? getNodeFromInstance(targetInst)
            : window;
          reactEventType =
            SyntheticEventCtor.nodeName &&
            SyntheticEventCtor.nodeName.toLowerCase();
          if (
            "select" === reactEventType ||
            ("input" === reactEventType && "file" === SyntheticEventCtor.type)
          )
            var getTargetInstFunc = getTargetInstForChangeEvent;
          else
            isTextInputElement(SyntheticEventCtor)
              ? (getTargetInstFunc = getTargetInstForInputOrChangeEvent)
              : (reactEventType = SyntheticEventCtor.nodeName) &&
                "input" === reactEventType.toLowerCase() &&
                ("checkbox" === SyntheticEventCtor.type ||
                  "radio" === SyntheticEventCtor.type) &&
                (getTargetInstFunc = getTargetInstForClickEvent);
          if (
            getTargetInstFunc &&
            (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))
          ) {
            enqueueStateRestore(nativeEventTarget);
            getTargetInstFunc = accumulateTwoPhaseListeners(
              getTargetInstFunc,
              "onChange"
            );
            0 < getTargetInstFunc.length &&
              ((SyntheticEventCtor = new SyntheticEvent(
                "onChange",
                "change",
                null,
                nativeEvent,
                nativeEventTarget
              )),
              dispatchQueue.push({
                event: SyntheticEventCtor,
                listeners: getTargetInstFunc
              }));
            break a;
          }
          "focusout" === domEventName &&
            (getTargetInstFunc = SyntheticEventCtor._wrapperState) &&
            getTargetInstFunc.controlled &&
            "number" === SyntheticEventCtor.type &&
            setDefaultValue(
              SyntheticEventCtor,
              "number",
              SyntheticEventCtor.value
            );
        }
        getTargetInstFunc = targetInst
          ? getNodeFromInstance(targetInst)
          : window;
        switch (domEventName) {
          case "focusin":
            if (
              isTextInputElement(getTargetInstFunc) ||
              "true" === getTargetInstFunc.contentEditable
            )
              (activeElement = getTargetInstFunc),
                (activeElementInst = targetInst),
                (lastSelection = null);
            break;
          case "focusout":
            lastSelection = activeElementInst = activeElement = null;
            break;
          case "mousedown":
            mouseDown = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mouseDown = !1;
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
            break;
          case "selectionchange":
            if (skipSelectionChangeEvent) break;
          case "keydown":
          case "keyup":
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
        }
        b: {
          switch (domEventName) {
            case "compositionstart":
              SyntheticEventCtor = "onCompositionStart";
              break b;
            case "compositionend":
              SyntheticEventCtor = "onCompositionEnd";
              break b;
            case "compositionupdate":
              SyntheticEventCtor = "onCompositionUpdate";
              break b;
          }
          SyntheticEventCtor = void 0;
        }
        SyntheticEventCtor &&
          ((getTargetInstFunc = accumulateTwoPhaseListeners(
            targetInst,
            SyntheticEventCtor
          )),
          0 < getTargetInstFunc.length &&
            ((SyntheticEventCtor = new SyntheticCompositionEvent(
              SyntheticEventCtor,
              domEventName,
              null,
              nativeEvent,
              nativeEventTarget
            )),
            dispatchQueue.push({
              event: SyntheticEventCtor,
              listeners: getTargetInstFunc
            }),
            (getTargetInstFunc = getDataFromCustomEvent(nativeEvent)),
            null !== getTargetInstFunc &&
              (SyntheticEventCtor.data = getTargetInstFunc)));
        if (
          (getTargetInstFunc = canUseTextInputEvent
            ? getNativeBeforeInputChars(domEventName, nativeEvent)
            : getFallbackBeforeInputChars(domEventName, nativeEvent))
        )
          (targetInst = accumulateTwoPhaseListeners(
            targetInst,
            "onBeforeInput"
          )),
            0 < targetInst.length &&
              ((nativeEventTarget = new SyntheticInputEvent(
                "onBeforeInput",
                "beforeinput",
                null,
                nativeEvent,
                nativeEventTarget
              )),
              dispatchQueue.push({
                event: nativeEventTarget,
                listeners: targetInst
              }),
              (nativeEventTarget.data = getTargetInstFunc));
      }
      nativeEventTarget = 0 !== (eventSystemFlags & 4);
      for (targetInst = 0; targetInst < dispatchQueue.length; targetInst++) {
        const { event, listeners } = dispatchQueue[targetInst];
        getTargetInstFunc = void 0;
        if (nativeEventTarget)
          for (
            SyntheticEventCtor = listeners.length - 1;
            0 <= SyntheticEventCtor;
            SyntheticEventCtor--
          ) {
            const { instance, currentTarget, listener } =
              listeners[SyntheticEventCtor];
            if (instance !== getTargetInstFunc && event.isPropagationStopped())
              break;
            executeDispatch(event, listener, currentTarget);
            getTargetInstFunc = instance;
          }
        else
          for (
            SyntheticEventCtor = 0;
            SyntheticEventCtor < listeners.length;
            SyntheticEventCtor++
          ) {
            const { instance, currentTarget, listener } =
              listeners[SyntheticEventCtor];
            if (instance !== getTargetInstFunc && event.isPropagationStopped())
              break;
            executeDispatch(event, listener, currentTarget);
            getTargetInstFunc = instance;
          }
      }
      if (hasRethrowError)
        throw (
          ((dispatchQueue = rethrowError),
          (hasRethrowError = !1),
          (rethrowError = null),
          dispatchQueue)
        );
    });
  }
  function createDispatchListener(instance, listener, currentTarget) {
    return { instance, listener, currentTarget };
  }
  function accumulateTwoPhaseListeners(targetFiber, reactName) {
    const captureName = reactName + "Capture",
      listeners = [];
    for (; null !== targetFiber; ) {
      const { stateNode, tag } = targetFiber;
      if (5 === tag && null !== stateNode) {
        const currentTarget = stateNode;
        var captureListener = getListener(targetFiber, captureName);
        null != captureListener &&
          listeners.unshift(
            createDispatchListener(targetFiber, captureListener, currentTarget)
          );
        captureListener = getListener(targetFiber, reactName);
        null != captureListener &&
          listeners.push(
            createDispatchListener(targetFiber, captureListener, currentTarget)
          );
      }
      targetFiber = targetFiber.return;
    }
    return listeners;
  }
  function getParent(inst) {
    if (null === inst) return null;
    do inst = inst.return;
    while (inst && 5 !== inst.tag);
    return inst ? inst : null;
  }
  function accumulateEnterLeaveListenersForEvent(
    dispatchQueue,
    event,
    target,
    common,
    inCapturePhase
  ) {
    const registrationName = event._reactName,
      listeners = [];
    for (; null !== target && target !== common; ) {
      const { alternate, stateNode, tag } = target;
      if (null !== alternate && alternate === common) break;
      if (5 === tag && null !== stateNode) {
        const currentTarget = stateNode;
        if (inCapturePhase) {
          var captureListener = getListener(target, registrationName);
          null != captureListener &&
            listeners.unshift(
              createDispatchListener(target, captureListener, currentTarget)
            );
        } else
          inCapturePhase ||
            ((captureListener = getListener(target, registrationName)),
            null != captureListener &&
              listeners.push(
                createDispatchListener(target, captureListener, currentTarget)
              ));
      }
      target = target.return;
    }
    0 !== listeners.length && dispatchQueue.push({ event, listeners });
  }
  function normalizeMarkupForTextOrAttribute(markup) {
    return ("string" === typeof markup ? markup : "" + markup)
      .replace(NORMALIZE_NEWLINES_REGEX, "\n")
      .replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
  }
  function checkForUnmatchedText(
    serverText,
    clientText,
    isConcurrentMode,
    shouldWarnDev
  ) {
    clientText = normalizeMarkupForTextOrAttribute(clientText);
    if (
      normalizeMarkupForTextOrAttribute(serverText) !== clientText &&
      isConcurrentMode
    )
      throw Error("Text content does not match server-rendered HTML.");
  }
  function noop() {}
  function shouldSetTextContent(type, props) {
    return (
      "textarea" === type ||
      "noscript" === type ||
      "string" === typeof props.children ||
      "number" === typeof props.children
    );
  }
  function clearSuspenseBoundary(parentInstance, suspenseInstance) {
    var node = suspenseInstance;
    let depth = 0;
    do {
      const nextNode = node.nextSibling;
      parentInstance.removeChild(node);
      if (nextNode && 8 === nextNode.nodeType)
        if (((node = nextNode.data), "/$" === node)) {
          if (0 === depth) {
            parentInstance.removeChild(nextNode);
            retryIfBlockedOn(suspenseInstance);
            return;
          }
          depth--;
        } else ("$" !== node && "$?" !== node && "$!" !== node) || depth++;
      node = nextNode;
    } while (node);
    retryIfBlockedOn(suspenseInstance);
  }
  function getNextHydratable(node) {
    for (; null != node; node = node.nextSibling) {
      var nodeType = node.nodeType;
      if (1 === nodeType || 3 === nodeType) break;
      if (8 === nodeType) {
        nodeType = node.data;
        if ("$" === nodeType || "$!" === nodeType || "$?" === nodeType) break;
        if ("/$" === nodeType) return null;
      }
    }
    return node;
  }
  function getParentSuspenseInstance(targetInstance) {
    targetInstance = targetInstance.previousSibling;
    let depth = 0;
    for (; targetInstance; ) {
      if (8 === targetInstance.nodeType) {
        const data = targetInstance.data;
        if ("$" === data || "$!" === data || "$?" === data) {
          if (0 === depth) return targetInstance;
          depth--;
        } else "/$" === data && depth++;
      }
      targetInstance = targetInstance.previousSibling;
    }
    return null;
  }
  function getClosestInstanceFromNode(targetNode) {
    let targetInst = targetNode[internalInstanceKey];
    if (targetInst) return targetInst;
    for (var parentNode = targetNode.parentNode; parentNode; ) {
      if (
        (targetInst =
          parentNode[internalContainerInstanceKey] ||
          parentNode[internalInstanceKey])
      ) {
        parentNode = targetInst.alternate;
        if (
          null !== targetInst.child ||
          (null !== parentNode && null !== parentNode.child)
        )
          for (
            targetNode = getParentSuspenseInstance(targetNode);
            null !== targetNode;

          ) {
            if ((parentNode = targetNode[internalInstanceKey]))
              return parentNode;
            targetNode = getParentSuspenseInstance(targetNode);
          }
        return targetInst;
      }
      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }
    return null;
  }
  function getInstanceFromNode(node) {
    node = node[internalInstanceKey] || node[internalContainerInstanceKey];
    return !node ||
      (5 !== node.tag && 6 !== node.tag && 13 !== node.tag && 3 !== node.tag)
      ? null
      : node;
  }
  function getNodeFromInstance(inst) {
    if (5 === inst.tag || 6 === inst.tag) return inst.stateNode;
    throw Error("getNodeFromInstance: Invalid argument.");
  }
  function getFiberCurrentPropsFromNode(node) {
    return node[internalPropsKey] || null;
  }
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor, fiber) {
    0 > index ||
      ((cursor.current = valueStack[index]),
      (valueStack[index] = null),
      index--);
  }
  function push(cursor, value, fiber) {
    index++;
    valueStack[index] = cursor.current;
    cursor.current = value;
  }
  function getMaskedContext(workInProgress, unmaskedContext) {
    const contextTypes = workInProgress.type.contextTypes;
    if (!contextTypes) return emptyContextObject;
    const instance = workInProgress.stateNode;
    if (
      instance &&
      instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext
    )
      return instance.__reactInternalMemoizedMaskedChildContext;
    const context = {};
    for (const key in contextTypes) context[key] = unmaskedContext[key];
    instance &&
      ((workInProgress = workInProgress.stateNode),
      (workInProgress.__reactInternalMemoizedUnmaskedChildContext =
        unmaskedContext),
      (workInProgress.__reactInternalMemoizedMaskedChildContext = context));
    return context;
  }
  function isContextProvider(type) {
    type = type.childContextTypes;
    return null !== type && void 0 !== type;
  }
  function pushTopLevelContextObject(fiber, context, didChange) {
    if (contextStackCursor$1.current !== emptyContextObject)
      throw Error(
        "Unexpected context found on stack. This error is likely caused by a bug in React. Please file an issue."
      );
    push(contextStackCursor$1, context);
    push(didPerformWorkStackCursor, didChange);
  }
  function processChildContext(fiber, type, parentContext) {
    var instance = fiber.stateNode;
    type = type.childContextTypes;
    if ("function" !== typeof instance.getChildContext) return parentContext;
    instance = instance.getChildContext();
    for (const contextKey in instance)
      if (!(contextKey in type))
        throw Error(
          `${getComponentNameFromFiber(fiber) || "Unknown"}.getChildContext(): key "${contextKey}" is not defined in childContextTypes.`
        );
    return { ...parentContext, ...instance };
  }
  function pushContextProvider(workInProgress) {
    workInProgress =
      ((workInProgress = workInProgress.stateNode) &&
        workInProgress.__reactInternalMemoizedMergedChildContext) ||
      emptyContextObject;
    previousContext = contextStackCursor$1.current;
    push(contextStackCursor$1, workInProgress);
    push(didPerformWorkStackCursor, didPerformWorkStackCursor.current);
    return !0;
  }
  function invalidateContextProvider(workInProgress, type, didChange) {
    const instance = workInProgress.stateNode;
    if (!instance)
      throw Error(
        "Expected to have an instance by this point. This error is likely caused by a bug in React. Please file an issue."
      );
    didChange
      ? ((workInProgress = processChildContext(
          workInProgress,
          type,
          previousContext
        )),
        (instance.__reactInternalMemoizedMergedChildContext = workInProgress),
        pop(didPerformWorkStackCursor),
        pop(contextStackCursor$1),
        push(contextStackCursor$1, workInProgress))
      : pop(didPerformWorkStackCursor);
    push(didPerformWorkStackCursor, didChange);
  }
  function scheduleSyncCallback(callback) {
    null === syncQueue ? (syncQueue = [callback]) : syncQueue.push(callback);
  }
  function scheduleLegacySyncCallback(callback) {
    includesLegacySyncCallbacks = !0;
    scheduleSyncCallback(callback);
  }
  function flushSyncCallbacks() {
    if (!isFlushingSyncQueue && null !== syncQueue) {
      isFlushingSyncQueue = !0;
      let i = 0;
      const previousUpdatePriority = currentUpdatePriority;
      try {
        const queue = syncQueue;
        for (currentUpdatePriority = 1; i < queue.length; i++) {
          let callback = queue[i];
          do callback = callback(!0);
          while (null !== callback);
        }
        syncQueue = null;
        includesLegacySyncCallbacks = !1;
      } catch (error) {
        throw (
          (null !== syncQueue && (syncQueue = syncQueue.slice(i + 1)),
          scheduleCallback$1(ImmediatePriority, flushSyncCallbacks),
          error)
        );
      } finally {
        (currentUpdatePriority = previousUpdatePriority),
          (isFlushingSyncQueue = !1);
      }
    }
    return null;
  }
  function pushTreeFork(workInProgress, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress, totalChildren, index) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      const numberOfOverflowBits = baseLength - (baseLength % 5);
      length = (
        baseIdWithLeadingBit &
        ((1 << numberOfOverflowBits) - 1)
      ).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId =
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress;
    } else
      (treeContextId =
        (1 << length) | (index << baseLength) | baseIdWithLeadingBit),
        (treeContextOverflow = workInProgress);
  }
  function pushMaterializedTreeId(workInProgress) {
    null !== workInProgress.return &&
      (pushTreeFork(workInProgress, 1), pushTreeId(workInProgress, 1, 0));
  }
  function popTreeContext(workInProgress) {
    for (; workInProgress === treeForkProvider; )
      (treeForkProvider = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null),
        (treeForkCount = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null);
    for (; workInProgress === treeContextProvider; )
      (treeContextProvider = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextOverflow = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextId = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null);
  }
  function deleteHydratableInstance(returnFiber, instance) {
    const fiber = createFiber(5, null, null, 0);
    fiber.elementType = "DELETED";
    fiber.stateNode = instance;
    fiber.return = returnFiber;
    instance = returnFiber.deletions;
    null === instance
      ? ((returnFiber.deletions = [fiber]), (returnFiber.flags |= 16))
      : instance.push(fiber);
  }
  function tryHydrate(fiber, nextInstance) {
    switch (fiber.tag) {
      case 5:
        var type = fiber.type;
        fiber.pendingProps;
        nextInstance =
          1 !== nextInstance.nodeType ||
          type.toLowerCase() !== nextInstance.nodeName.toLowerCase()
            ? null
            : nextInstance;
        return null !== nextInstance
          ? ((fiber.stateNode = nextInstance),
            (hydrationParentFiber = fiber),
            (nextHydratableInstance = getNextHydratable(
              nextInstance.firstChild
            )),
            !0)
          : !1;
      case 6:
        return (
          (nextInstance =
            "" === fiber.pendingProps || 3 !== nextInstance.nodeType
              ? null
              : nextInstance),
          null !== nextInstance
            ? ((fiber.stateNode = nextInstance),
              (hydrationParentFiber = fiber),
              (nextHydratableInstance = null),
              !0)
            : !1
        );
      case 13:
        return (
          (nextInstance = 8 !== nextInstance.nodeType ? null : nextInstance),
          null !== nextInstance
            ? ((type =
                null !== treeContextProvider
                  ? { id: treeContextId, overflow: treeContextOverflow }
                  : null),
              (fiber.memoizedState = {
                dehydrated: nextInstance,
                treeContext: type,
                retryLane: 1073741824
              }),
              (type = createFiber(18, null, null, 0)),
              (type.stateNode = nextInstance),
              (nextInstance = type),
              (nextInstance.return = fiber),
              (fiber.child = nextInstance),
              (hydrationParentFiber = fiber),
              (nextHydratableInstance = null),
              !0)
            : !1
        );
      default:
        return !1;
    }
  }
  function shouldClientRenderOnMismatch(fiber) {
    return 0 !== (fiber.mode & 1) && 0 === (fiber.flags & 128);
  }
  function throwOnHydrationMismatch(fiber) {
    throw Error(
      "Hydration failed because the initial UI does not match what was rendered on the server."
    );
  }
  function tryToClaimNextHydratableInstance(fiber) {
    if (isHydrating) {
      var nextInstance = nextHydratableInstance;
      if (nextInstance) {
        var firstAttemptedInstance = nextInstance;
        if (!tryHydrate(fiber, nextInstance)) {
          shouldClientRenderOnMismatch(fiber) && throwOnHydrationMismatch();
          nextInstance = getNextHydratable(firstAttemptedInstance.nextSibling);
          const prevHydrationParentFiber = hydrationParentFiber;
          nextInstance && tryHydrate(fiber, nextInstance)
            ? deleteHydratableInstance(
                prevHydrationParentFiber,
                firstAttemptedInstance
              )
            : ((fiber.flags = (fiber.flags & -4097) | 2),
              (isHydrating = !1),
              (hydrationParentFiber = fiber));
        }
      } else
        shouldClientRenderOnMismatch(fiber) && throwOnHydrationMismatch(),
          (fiber.flags = (fiber.flags & -4097) | 2),
          (isHydrating = !1),
          (hydrationParentFiber = fiber);
    }
  }
  function popToNextHostParent(fiber) {
    for (
      fiber = fiber.return;
      null !== fiber && 5 !== fiber.tag && 3 !== fiber.tag && 13 !== fiber.tag;

    )
      fiber = fiber.return;
    hydrationParentFiber = fiber;
  }
  function popHydrationState(fiber) {
    if (fiber !== hydrationParentFiber) return !1;
    if (!isHydrating) return popToNextHostParent(fiber), (isHydrating = !0), !1;
    var JSCompiler_temp;
    (JSCompiler_temp = 3 !== fiber.tag) &&
      !(JSCompiler_temp = 5 !== fiber.tag) &&
      ((JSCompiler_temp = fiber.type),
      (JSCompiler_temp =
        "head" !== JSCompiler_temp &&
        "body" !== JSCompiler_temp &&
        !shouldSetTextContent(fiber.type, fiber.memoizedProps)));
    if (JSCompiler_temp && (JSCompiler_temp = nextHydratableInstance))
      if (shouldClientRenderOnMismatch(fiber)) {
        for (JSCompiler_temp = nextHydratableInstance; JSCompiler_temp; )
          JSCompiler_temp = getNextHydratable(JSCompiler_temp.nextSibling);
        throwOnHydrationMismatch();
      } else
        for (; JSCompiler_temp; )
          deleteHydratableInstance(fiber, JSCompiler_temp),
            (JSCompiler_temp = getNextHydratable(JSCompiler_temp.nextSibling));
    popToNextHostParent(fiber);
    if (13 === fiber.tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber)
        throw Error(
          "Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue."
        );
      a: {
        fiber = fiber.nextSibling;
        for (JSCompiler_temp = 0; fiber; ) {
          if (8 === fiber.nodeType) {
            const data = fiber.data;
            if ("/$" === data) {
              if (0 === JSCompiler_temp) {
                nextHydratableInstance = getNextHydratable(fiber.nextSibling);
                break a;
              }
              JSCompiler_temp--;
            } else
              ("$" !== data && "$!" !== data && "$?" !== data) ||
                JSCompiler_temp++;
          }
          fiber = fiber.nextSibling;
        }
        nextHydratableInstance = null;
      }
    } else
      nextHydratableInstance = hydrationParentFiber
        ? getNextHydratable(fiber.stateNode.nextSibling)
        : null;
    return !0;
  }
  function resetHydrationState() {
    nextHydratableInstance = hydrationParentFiber = null;
    isHydrating = !1;
  }
  function queueHydrationError(error) {
    null === hydrationErrors
      ? (hydrationErrors = [error])
      : hydrationErrors.push(error);
  }
  function coerceRef(returnFiber, current, element) {
    returnFiber = element.ref;
    if (
      null !== returnFiber &&
      "function" !== typeof returnFiber &&
      "object" !== typeof returnFiber
    ) {
      if (element._owner) {
        element = element._owner;
        let inst;
        if (element) {
          if (1 !== element.tag)
            throw Error(
              "Function components cannot have string refs. We recommend using useRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref"
            );
          inst = element.stateNode;
        }
        if (!inst)
          throw Error(
            `Missing owner for string ref ${returnFiber}. This error is likely caused by a ` +
              "bug in React. Please file an issue."
          );
        const resolvedInst = inst,
          stringRef = "" + returnFiber;
        if (
          null !== current &&
          null !== current.ref &&
          "function" === typeof current.ref &&
          current.ref._stringRef === stringRef
        )
          return current.ref;
        current = function (value) {
          const refs = resolvedInst.refs;
          null === value ? delete refs[stringRef] : (refs[stringRef] = value);
        };
        current._stringRef = stringRef;
        return current;
      }
      if ("string" !== typeof returnFiber)
        throw Error(
          "Expected ref to be a function, a string, an object returned by React.createRef(), or null."
        );
      if (!element._owner)
        throw Error(
          `Element ref was specified as a string (${returnFiber}) but no owner was set. This could happen for one of` +
            " the following reasons:\n1. You may be adding a ref to a function component\n2. You may be adding a ref to a component that was not created inside a component's render method\n3. You have multiple copies of React loaded\nSee https://reactjs.org/link/refs-must-have-owner for more information."
        );
    }
    return returnFiber;
  }
  function throwOnInvalidObjectType(returnFiber, newChild) {
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      `Objects are not valid as a React child (found: ${
        "[object Object]" === returnFiber
          ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
          : returnFiber
      }). ` +
        "If you meant to render a collection of children, use an array instead."
    );
  }
  function resolveLazy(lazyType) {
    const init = lazyType._init;
    return init(lazyType._payload);
  }
  function ChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions
          ? ((returnFiber.deletions = [childToDelete]),
            (returnFiber.flags |= 16))
          : deletions.push(childToDelete);
      }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
      if (!shouldTrackSideEffects) return null;
      for (; null !== currentFirstChild; )
        deleteChild(returnFiber, currentFirstChild),
          (currentFirstChild = currentFirstChild.sibling);
      return null;
    }
    function mapRemainingChildren(returnFiber, currentFirstChild) {
      for (returnFiber = new Map(); null !== currentFirstChild; )
        null !== currentFirstChild.key
          ? returnFiber.set(currentFirstChild.key, currentFirstChild)
          : returnFiber.set(currentFirstChild.index, currentFirstChild),
          (currentFirstChild = currentFirstChild.sibling);
      return returnFiber;
    }
    function useFiber(fiber, pendingProps) {
      fiber = createWorkInProgress(fiber, pendingProps);
      fiber.index = 0;
      fiber.sibling = null;
      return fiber;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
      newFiber.index = newIndex;
      if (!shouldTrackSideEffects)
        return (newFiber.flags |= 1048576), lastPlacedIndex;
      newIndex = newFiber.alternate;
      if (null !== newIndex)
        return (
          (newIndex = newIndex.index),
          newIndex < lastPlacedIndex
            ? ((newFiber.flags |= 2), lastPlacedIndex)
            : newIndex
        );
      newFiber.flags |= 2;
      return lastPlacedIndex;
    }
    function placeSingleChild(newFiber) {
      shouldTrackSideEffects &&
        null === newFiber.alternate &&
        (newFiber.flags |= 2);
      return newFiber;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
      if (null === current || 6 !== current.tag)
        return (
          (current = createFiberFromText(textContent, returnFiber.mode, lanes)),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, textContent);
      current.return = returnFiber;
      return current;
    }
    function updateElement(returnFiber, current, element, lanes) {
      const elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE)
        return updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        );
      if (
        null !== current &&
        (current.elementType === elementType ||
          ("object" === typeof elementType &&
            null !== elementType &&
            elementType.$$typeof === REACT_LAZY_TYPE &&
            resolveLazy(elementType) === current.type))
      )
        return (
          (lanes = useFiber(current, element.props)),
          (lanes.ref = coerceRef(returnFiber, current, element)),
          (lanes.return = returnFiber),
          lanes
        );
      lanes = createFiberFromTypeAndProps(
        element.type,
        element.key,
        element.props,
        null,
        returnFiber.mode,
        lanes
      );
      lanes.ref = coerceRef(returnFiber, current, element);
      lanes.return = returnFiber;
      return lanes;
    }
    function updatePortal(returnFiber, current, portal, lanes) {
      if (
        null === current ||
        4 !== current.tag ||
        current.stateNode.containerInfo !== portal.containerInfo ||
        current.stateNode.implementation !== portal.implementation
      )
        return (
          (current = createFiberFromPortal(portal, returnFiber.mode, lanes)),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, portal.children || []);
      current.return = returnFiber;
      return current;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
      if (null === current || 7 !== current.tag)
        return (
          (current = createFiberFromFragment(
            fragment,
            returnFiber.mode,
            lanes,
            key
          )),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, fragment);
      current.return = returnFiber;
      return current;
    }
    function createChild(returnFiber, newChild, lanes) {
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild
      )
        return (
          (newChild = createFiberFromText(
            "" + newChild,
            returnFiber.mode,
            lanes
          )),
          (newChild.return = returnFiber),
          newChild
        );
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return (
              (lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes
              )),
              (lanes.ref = coerceRef(returnFiber, null, newChild)),
              (lanes.return = returnFiber),
              lanes
            );
          case REACT_PORTAL_TYPE:
            return (
              (newChild = createFiberFromPortal(
                newChild,
                returnFiber.mode,
                lanes
              )),
              (newChild.return = returnFiber),
              newChild
            );
          case REACT_LAZY_TYPE:
            const init = newChild._init;
            return createChild(returnFiber, init(newChild._payload), lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return (
            (newChild = createFiberFromFragment(
              newChild,
              returnFiber.mode,
              lanes,
              null
            )),
            (newChild.return = returnFiber),
            newChild
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
      var key = null !== oldFiber ? oldFiber.key : null;
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild
      )
        return null !== key
          ? null
          : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return newChild.key === key
              ? updateElement(returnFiber, oldFiber, newChild, lanes)
              : null;
          case REACT_PORTAL_TYPE:
            return newChild.key === key
              ? updatePortal(returnFiber, oldFiber, newChild, lanes)
              : null;
          case REACT_LAZY_TYPE:
            return (
              (key = newChild._init),
              updateSlot(returnFiber, oldFiber, key(newChild._payload), lanes)
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return null !== key
            ? null
            : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function updateFromMap(
      existingChildren,
      returnFiber,
      newIdx,
      newChild,
      lanes
    ) {
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild
      )
        return (
          (existingChildren = existingChildren.get(newIdx) || null),
          updateTextNode(returnFiber, existingChildren, "" + newChild, lanes)
        );
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return (
              (existingChildren =
                existingChildren.get(
                  null === newChild.key ? newIdx : newChild.key
                ) || null),
              updateElement(returnFiber, existingChildren, newChild, lanes)
            );
          case REACT_PORTAL_TYPE:
            return (
              (existingChildren =
                existingChildren.get(
                  null === newChild.key ? newIdx : newChild.key
                ) || null),
              updatePortal(returnFiber, existingChildren, newChild, lanes)
            );
          case REACT_LAZY_TYPE:
            const init = newChild._init;
            return updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              init(newChild._payload),
              lanes
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return (
            (existingChildren = existingChildren.get(newIdx) || null),
            updateFragment(returnFiber, existingChildren, newChild, lanes, null)
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function reconcileChildrenArray(
      returnFiber,
      currentFirstChild,
      newChildren,
      lanes
    ) {
      let resultingFirstChild = null,
        previousNewFiber = null;
      var oldFiber = currentFirstChild;
      let newIdx = (currentFirstChild = 0);
      for (
        var nextOldFiber = null;
        null !== oldFiber && newIdx < newChildren.length;
        newIdx++
      ) {
        oldFiber.index > newIdx
          ? ((nextOldFiber = oldFiber), (oldFiber = null))
          : (nextOldFiber = oldFiber.sibling);
        const newFiber = updateSlot(
          returnFiber,
          oldFiber,
          newChildren[newIdx],
          lanes
        );
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects &&
          oldFiber &&
          null === newFiber.alternate &&
          deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber
          ? (resultingFirstChild = newFiber)
          : (previousNewFiber.sibling = newFiber);
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (newIdx === newChildren.length)
        return (
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          resultingFirstChild
        );
      if (null === oldFiber) {
        for (; newIdx < newChildren.length; newIdx++)
          (oldFiber = createChild(returnFiber, newChildren[newIdx], lanes)),
            null !== oldFiber &&
              ((currentFirstChild = placeChild(
                oldFiber,
                currentFirstChild,
                newIdx
              )),
              null === previousNewFiber
                ? (resultingFirstChild = oldFiber)
                : (previousNewFiber.sibling = oldFiber),
              (previousNewFiber = oldFiber));
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (
        oldFiber = mapRemainingChildren(returnFiber, oldFiber);
        newIdx < newChildren.length;
        newIdx++
      )
        (nextOldFiber = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          newChildren[newIdx],
          lanes
        )),
          null !== nextOldFiber &&
            (shouldTrackSideEffects &&
              null !== nextOldFiber.alternate &&
              oldFiber.delete(
                null === nextOldFiber.key ? newIdx : nextOldFiber.key
              ),
            (currentFirstChild = placeChild(
              nextOldFiber,
              currentFirstChild,
              newIdx
            )),
            null === previousNewFiber
              ? (resultingFirstChild = nextOldFiber)
              : (previousNewFiber.sibling = nextOldFiber),
            (previousNewFiber = nextOldFiber));
      shouldTrackSideEffects &&
        oldFiber.forEach((child) => deleteChild(returnFiber, child));
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(
      returnFiber,
      currentFirstChild,
      newChildrenIterable,
      lanes
    ) {
      var iteratorFn = getIteratorFn(newChildrenIterable);
      if ("function" !== typeof iteratorFn)
        throw Error(
          "An object is not an iterable. This error is likely caused by a bug in React. Please file an issue."
        );
      newChildrenIterable = iteratorFn.call(newChildrenIterable);
      if (null == newChildrenIterable)
        throw Error("An iterable object provided no iterator.");
      let previousNewFiber = (iteratorFn = null);
      var oldFiber = currentFirstChild;
      let newIdx = (currentFirstChild = 0),
        nextOldFiber = null;
      for (
        var step = newChildrenIterable.next();
        null !== oldFiber && !step.done;
        newIdx++, step = newChildrenIterable.next()
      ) {
        oldFiber.index > newIdx
          ? ((nextOldFiber = oldFiber), (oldFiber = null))
          : (nextOldFiber = oldFiber.sibling);
        const newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects &&
          oldFiber &&
          null === newFiber.alternate &&
          deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber
          ? (iteratorFn = newFiber)
          : (previousNewFiber.sibling = newFiber);
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (step.done)
        return (
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          iteratorFn
        );
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildrenIterable.next())
          (step = createChild(returnFiber, step.value, lanes)),
            null !== step &&
              ((currentFirstChild = placeChild(
                step,
                currentFirstChild,
                newIdx
              )),
              null === previousNewFiber
                ? (iteratorFn = step)
                : (previousNewFiber.sibling = step),
              (previousNewFiber = step));
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return iteratorFn;
      }
      for (
        oldFiber = mapRemainingChildren(returnFiber, oldFiber);
        !step.done;
        newIdx++, step = newChildrenIterable.next()
      )
        (step = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          step.value,
          lanes
        )),
          null !== step &&
            (shouldTrackSideEffects &&
              null !== step.alternate &&
              oldFiber.delete(null === step.key ? newIdx : step.key),
            (currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
            null === previousNewFiber
              ? (iteratorFn = step)
              : (previousNewFiber.sibling = step),
            (previousNewFiber = step));
      shouldTrackSideEffects &&
        oldFiber.forEach((child) => deleteChild(returnFiber, child));
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return iteratorFn;
    }
    function reconcileChildFibers(
      returnFiber,
      currentFirstChild,
      newChild,
      lanes
    ) {
      "object" === typeof newChild &&
        null !== newChild &&
        newChild.type === REACT_FRAGMENT_TYPE &&
        null === newChild.key &&
        (newChild = newChild.props.children);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            a: {
              for (
                var key = newChild.key, child = currentFirstChild;
                null !== child;

              ) {
                if (child.key === key) {
                  key = newChild.type;
                  if (key === REACT_FRAGMENT_TYPE) {
                    if (7 === child.tag) {
                      deleteRemainingChildren(returnFiber, child.sibling);
                      currentFirstChild = useFiber(
                        child,
                        newChild.props.children
                      );
                      currentFirstChild.return = returnFiber;
                      returnFiber = currentFirstChild;
                      break a;
                    }
                  } else if (
                    child.elementType === key ||
                    ("object" === typeof key &&
                      null !== key &&
                      key.$$typeof === REACT_LAZY_TYPE &&
                      resolveLazy(key) === child.type)
                  ) {
                    deleteRemainingChildren(returnFiber, child.sibling);
                    currentFirstChild = useFiber(child, newChild.props);
                    currentFirstChild.ref = coerceRef(
                      returnFiber,
                      child,
                      newChild
                    );
                    currentFirstChild.return = returnFiber;
                    returnFiber = currentFirstChild;
                    break a;
                  }
                  deleteRemainingChildren(returnFiber, child);
                  break;
                } else deleteChild(returnFiber, child);
                child = child.sibling;
              }
              newChild.type === REACT_FRAGMENT_TYPE
                ? ((currentFirstChild = createFiberFromFragment(
                    newChild.props.children,
                    returnFiber.mode,
                    lanes,
                    newChild.key
                  )),
                  (currentFirstChild.return = returnFiber),
                  (returnFiber = currentFirstChild))
                : ((lanes = createFiberFromTypeAndProps(
                    newChild.type,
                    newChild.key,
                    newChild.props,
                    null,
                    returnFiber.mode,
                    lanes
                  )),
                  (lanes.ref = coerceRef(
                    returnFiber,
                    currentFirstChild,
                    newChild
                  )),
                  (lanes.return = returnFiber),
                  (returnFiber = lanes));
            }
            return placeSingleChild(returnFiber);
          case REACT_PORTAL_TYPE:
            a: {
              for (child = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === child)
                  if (
                    4 === currentFirstChild.tag &&
                    currentFirstChild.stateNode.containerInfo ===
                      newChild.containerInfo &&
                    currentFirstChild.stateNode.implementation ===
                      newChild.implementation
                  ) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    currentFirstChild = useFiber(
                      currentFirstChild,
                      newChild.children || []
                    );
                    currentFirstChild.return = returnFiber;
                    returnFiber = currentFirstChild;
                    break a;
                  } else {
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  }
                else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              currentFirstChild = createFiberFromPortal(
                newChild,
                returnFiber.mode,
                lanes
              );
              currentFirstChild.return = returnFiber;
              returnFiber = currentFirstChild;
            }
            return placeSingleChild(returnFiber);
          case REACT_LAZY_TYPE:
            return (
              (child = newChild._init),
              reconcileChildFibers(
                returnFiber,
                currentFirstChild,
                child(newChild._payload),
                lanes
              )
            );
        }
        if (isArrayImpl(newChild))
          return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        if (getIteratorFn(newChild))
          return reconcileChildrenIterator(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild
        ? ((newChild = "" + newChild),
          null !== currentFirstChild && 6 === currentFirstChild.tag
            ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
              (currentFirstChild = useFiber(currentFirstChild, newChild)),
              (currentFirstChild.return = returnFiber),
              (returnFiber = currentFirstChild))
            : (deleteRemainingChildren(returnFiber, currentFirstChild),
              (currentFirstChild = createFiberFromText(
                newChild,
                returnFiber.mode,
                lanes
              )),
              (currentFirstChild.return = returnFiber),
              (returnFiber = currentFirstChild)),
          placeSingleChild(returnFiber))
        : deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return reconcileChildFibers;
  }
  function resetContextDependencies() {
    lastFullyObservedContext =
      lastContextDependency =
      currentlyRenderingFiber$1 =
        null;
  }
  function popProvider(context, providerFiber) {
    providerFiber = valueCursor.current;
    pop(valueCursor);
    context._currentValue = providerFiber;
  }
  function scheduleContextWorkOnParentPath(
    parent,
    renderLanes,
    propagationRoot
  ) {
    for (; null !== parent; ) {
      const alternate = parent.alternate;
      (parent.childLanes & renderLanes) !== renderLanes
        ? ((parent.childLanes |= renderLanes),
          null !== alternate && (alternate.childLanes |= renderLanes))
        : null !== alternate &&
          (alternate.childLanes & renderLanes) !== renderLanes &&
          (alternate.childLanes |= renderLanes);
      if (parent === propagationRoot) break;
      parent = parent.return;
    }
  }
  function prepareToReadContext(workInProgress, renderLanes) {
    currentlyRenderingFiber$1 = workInProgress;
    lastFullyObservedContext = lastContextDependency = null;
    workInProgress = workInProgress.dependencies;
    null !== workInProgress &&
      null !== workInProgress.firstContext &&
      (0 !== (workInProgress.lanes & renderLanes) && (didReceiveUpdate = !0),
      (workInProgress.firstContext = null));
  }
  function readContext(context) {
    const value = context._currentValue;
    if (lastFullyObservedContext !== context)
      if (
        ((context = { context, memoizedValue: value, next: null }),
        null === lastContextDependency)
      ) {
        if (null === currentlyRenderingFiber$1)
          throw Error(
            "Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()."
          );
        lastContextDependency = context;
        currentlyRenderingFiber$1.dependencies = {
          lanes: 0,
          firstContext: context
        };
      } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
  function pushConcurrentUpdateQueue(queue) {
    null === concurrentQueues
      ? (concurrentQueues = [queue])
      : concurrentQueues.push(queue);
  }
  function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    const interleaved = queue.interleaved;
    null === interleaved
      ? ((update.next = update), pushConcurrentUpdateQueue(queue))
      : ((update.next = interleaved.next), (interleaved.next = update));
    queue.interleaved = update;
    return markUpdateLaneFromFiberToRoot(fiber, lane);
  }
  function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
    sourceFiber.lanes |= lane;
    var alternate = sourceFiber.alternate;
    null !== alternate && (alternate.lanes |= lane);
    alternate = sourceFiber;
    for (sourceFiber = sourceFiber.return; null !== sourceFiber; )
      (sourceFiber.childLanes |= lane),
        (alternate = sourceFiber.alternate),
        null !== alternate && (alternate.childLanes |= lane),
        (alternate = sourceFiber),
        (sourceFiber = sourceFiber.return);
    return 3 === alternate.tag ? alternate.stateNode : null;
  }
  function initializeUpdateQueue(fiber) {
    fiber.updateQueue = {
      baseState: fiber.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, interleaved: null, lanes: 0 },
      effects: null
    };
  }
  function cloneUpdateQueue(current, workInProgress) {
    current = current.updateQueue;
    workInProgress.updateQueue === current &&
      (workInProgress.updateQueue = {
        baseState: current.baseState,
        firstBaseUpdate: current.firstBaseUpdate,
        lastBaseUpdate: current.lastBaseUpdate,
        shared: current.shared,
        effects: current.effects
      });
  }
  function createUpdate(eventTime, lane) {
    return {
      eventTime,
      lane,
      tag: 0,
      payload: null,
      callback: null,
      next: null
    };
  }
  function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;
    if (null === updateQueue) return null;
    updateQueue = updateQueue.shared;
    if (0 !== (executionContext & 2)) {
      var pending = updateQueue.pending;
      null === pending
        ? (update.next = update)
        : ((update.next = pending.next), (pending.next = update));
      updateQueue.pending = update;
      return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
    }
    pending = updateQueue.interleaved;
    null === pending
      ? ((update.next = update), pushConcurrentUpdateQueue(updateQueue))
      : ((update.next = pending.next), (pending.next = update));
    updateQueue.interleaved = update;
    return markUpdateLaneFromFiberToRoot(fiber, lane);
  }
  function entangleTransitions(root, fiber, lane) {
    fiber = fiber.updateQueue;
    if (null !== fiber && ((fiber = fiber.shared), 0 !== (lane & 4194240))) {
      let queueLanes = fiber.lanes;
      queueLanes &= root.pendingLanes;
      lane |= queueLanes;
      fiber.lanes = lane;
      markRootEntangled(root, lane);
    }
  }
  function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
    var queue = workInProgress.updateQueue,
      current = workInProgress.alternate;
    if (
      null !== current &&
      ((current = current.updateQueue), queue === current)
    ) {
      let newFirst = null,
        newLast = null;
      queue = queue.firstBaseUpdate;
      if (null !== queue) {
        do {
          const clone = {
            eventTime: queue.eventTime,
            lane: queue.lane,
            tag: queue.tag,
            payload: queue.payload,
            callback: queue.callback,
            next: null
          };
          null === newLast
            ? (newFirst = newLast = clone)
            : (newLast = newLast.next = clone);
          queue = queue.next;
        } while (null !== queue);
        null === newLast
          ? (newFirst = newLast = capturedUpdate)
          : (newLast = newLast.next = capturedUpdate);
      } else newFirst = newLast = capturedUpdate;
      queue = {
        baseState: current.baseState,
        firstBaseUpdate: newFirst,
        lastBaseUpdate: newLast,
        shared: current.shared,
        effects: current.effects
      };
      workInProgress.updateQueue = queue;
      return;
    }
    workInProgress = queue.lastBaseUpdate;
    null === workInProgress
      ? (queue.firstBaseUpdate = capturedUpdate)
      : (workInProgress.next = capturedUpdate);
    queue.lastBaseUpdate = capturedUpdate;
  }
  function processUpdateQueue(
    workInProgress$jscomp$0,
    props,
    instance,
    renderLanes
  ) {
    var queue = workInProgress$jscomp$0.updateQueue;
    hasForceUpdate = !1;
    let firstBaseUpdate = queue.firstBaseUpdate;
    var lastBaseUpdate = queue.lastBaseUpdate,
      pendingQueue = queue.shared.pending;
    if (null !== pendingQueue) {
      queue.shared.pending = null;
      var lastPendingUpdate = pendingQueue,
        firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null;
      null === lastBaseUpdate
        ? (firstBaseUpdate = firstPendingUpdate)
        : (lastBaseUpdate.next = firstPendingUpdate);
      lastBaseUpdate = lastPendingUpdate;
      var current = workInProgress$jscomp$0.alternate;
      null !== current &&
        ((current = current.updateQueue),
        (pendingQueue = current.lastBaseUpdate),
        pendingQueue !== lastBaseUpdate &&
          (null === pendingQueue
            ? (current.firstBaseUpdate = firstPendingUpdate)
            : (pendingQueue.next = firstPendingUpdate),
          (current.lastBaseUpdate = lastPendingUpdate)));
    }
    if (null !== firstBaseUpdate) {
      var newState = queue.baseState;
      lastBaseUpdate = 0;
      current = firstPendingUpdate = lastPendingUpdate = null;
      pendingQueue = firstBaseUpdate;
      do {
        var updateLane = pendingQueue.lane,
          updateEventTime = pendingQueue.eventTime;
        if ((renderLanes & updateLane) === updateLane) {
          null !== current &&
            (current = current.next =
              {
                eventTime: updateEventTime,
                lane: 0,
                tag: pendingQueue.tag,
                payload: pendingQueue.payload,
                callback: pendingQueue.callback,
                next: null
              });
          a: {
            var workInProgress = workInProgress$jscomp$0,
              update = pendingQueue;
            updateLane = props;
            updateEventTime = instance;
            switch (update.tag) {
              case 1:
                workInProgress = update.payload;
                if ("function" === typeof workInProgress) {
                  newState = workInProgress.call(
                    updateEventTime,
                    newState,
                    updateLane
                  );
                  break a;
                }
                newState = workInProgress;
                break a;
              case 3:
                workInProgress.flags = (workInProgress.flags & -65537) | 128;
              case 0:
                workInProgress = update.payload;
                updateLane =
                  "function" === typeof workInProgress
                    ? workInProgress.call(updateEventTime, newState, updateLane)
                    : workInProgress;
                if (null === updateLane || void 0 === updateLane) break a;
                newState = assign({}, newState, updateLane);
                break a;
              case 2:
                hasForceUpdate = !0;
            }
          }
          null !== pendingQueue.callback &&
            0 !== pendingQueue.lane &&
            ((workInProgress$jscomp$0.flags |= 64),
            (updateLane = queue.effects),
            null === updateLane
              ? (queue.effects = [pendingQueue])
              : updateLane.push(pendingQueue));
        } else
          (updateEventTime = {
            eventTime: updateEventTime,
            lane: updateLane,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: pendingQueue.callback,
            next: null
          }),
            null === current
              ? ((firstPendingUpdate = current = updateEventTime),
                (lastPendingUpdate = newState))
              : (current = current.next = updateEventTime),
            (lastBaseUpdate |= updateLane);
        pendingQueue = pendingQueue.next;
        if (null === pendingQueue)
          if (((pendingQueue = queue.shared.pending), null === pendingQueue))
            break;
          else
            (updateLane = pendingQueue),
              (pendingQueue = updateLane.next),
              (updateLane.next = null),
              (queue.lastBaseUpdate = updateLane),
              (queue.shared.pending = null);
      } while (1);
      null === current && (lastPendingUpdate = newState);
      queue.baseState = lastPendingUpdate;
      queue.firstBaseUpdate = firstPendingUpdate;
      queue.lastBaseUpdate = current;
      props = queue.shared.interleaved;
      if (null !== props) {
        queue = props;
        do (lastBaseUpdate |= queue.lane), (queue = queue.next);
        while (queue !== props);
      } else null === firstBaseUpdate && (queue.shared.lanes = 0);
      workInProgressRootSkippedLanes |= lastBaseUpdate;
      workInProgress$jscomp$0.lanes = lastBaseUpdate;
      workInProgress$jscomp$0.memoizedState = newState;
    }
  }
  function commitUpdateQueue(finishedWork, finishedQueue, instance) {
    finishedWork = finishedQueue.effects;
    finishedQueue.effects = null;
    if (null !== finishedWork)
      for (
        finishedQueue = 0;
        finishedQueue < finishedWork.length;
        finishedQueue++
      ) {
        const effect = finishedWork[finishedQueue],
          callback = effect.callback;
        if (null !== callback) {
          effect.callback = null;
          if ("function" !== typeof callback)
            throw Error(
              "Invalid argument passed as callback. Expected a function. Instead " +
                `received: ${callback}`
            );
          callback.call(instance);
        }
      }
  }
  function requiredContext(c) {
    if (c === NO_CONTEXT)
      throw Error(
        "Expected host context to exist. This error is likely caused by a bug in React. Please file an issue."
      );
    return c;
  }
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, NO_CONTEXT);
    fiber = nextRootInstance.nodeType;
    switch (fiber) {
      case 9:
      case 11:
        nextRootInstance = (nextRootInstance = nextRootInstance.documentElement)
          ? nextRootInstance.namespaceURI
          : getChildNamespace();
        break;
      default:
        (nextRootInstance =
          8 === fiber ? nextRootInstance.parentNode : nextRootInstance),
          nextRootInstance.namespaceURI || null,
          nextRootInstance.tagName,
          (nextRootInstance = getChildNamespace());
    }
    pop(contextStackCursor);
    push(contextStackCursor, nextRootInstance);
  }
  function popHostContainer(fiber) {
    pop(contextStackCursor);
    pop(contextFiberStackCursor);
    pop(rootInstanceStackCursor);
  }
  function pushHostContext(fiber) {
    requiredContext(rootInstanceStackCursor.current);
    const context = requiredContext(contextStackCursor.current),
      nextContext = getChildNamespace();
    context !== nextContext &&
      (push(contextFiberStackCursor, fiber),
      push(contextStackCursor, nextContext));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber &&
      (pop(contextStackCursor), pop(contextFiberStackCursor));
  }
  function findFirstSuspended(row) {
    let node = row;
    for (; null !== node; ) {
      if (13 === node.tag) {
        var state = node.memoizedState;
        if (
          null !== state &&
          ((state = state.dehydrated),
          null === state || "$?" === state.data || "$!" === state.data)
        )
          return node;
      } else if (19 === node.tag && void 0 !== node.memoizedProps.revealOrder) {
        if (0 !== (node.flags & 128)) return node;
      } else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === row) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === row) return null;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
    return null;
  }
  function resetWorkInProgressVersions() {
    for (let i = 0; i < workInProgressSources.length; i++)
      workInProgressSources[i]._workInProgressVersionPrimary = null;
    workInProgressSources.length = 0;
  }
  function throwInvalidHookError() {
    throw Error(
      "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem."
    );
  }
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (null === prevDeps) return !1;
    for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++)
      if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
    return !0;
  }
  function renderWithHooks(
    current,
    workInProgress,
    Component,
    props,
    secondArg,
    nextRenderLanes
  ) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber = workInProgress;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;
    workInProgress.lanes = 0;
    ReactCurrentDispatcher$1.current =
      null === current || null === current.memoizedState
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
    current = Component(props, secondArg);
    if (didScheduleRenderPhaseUpdateDuringThisPass) {
      nextRenderLanes = 0;
      do {
        didScheduleRenderPhaseUpdateDuringThisPass = !1;
        localIdCounter = 0;
        if (25 <= nextRenderLanes)
          throw Error(
            "Too many re-renders. React limits the number of renders to prevent an infinite loop."
          );
        nextRenderLanes += 1;
        workInProgressHook = currentHook = null;
        workInProgress.updateQueue = null;
        ReactCurrentDispatcher$1.current = HooksDispatcherOnRerender;
        current = Component(props, secondArg);
      } while (didScheduleRenderPhaseUpdateDuringThisPass);
    }
    ReactCurrentDispatcher$1.current = ContextOnlyDispatcher;
    workInProgress = null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdate = !1;
    if (workInProgress)
      throw Error(
        "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
      );
    return current;
  }
  function checkDidRenderIdHook() {
    const didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function mountWorkInProgressHook() {
    const hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    null === workInProgressHook
      ? (currentlyRenderingFiber.memoizedState = workInProgressHook = hook)
      : (workInProgressHook = workInProgressHook.next = hook);
    return workInProgressHook;
  }
  function updateWorkInProgressHook() {
    if (null === currentHook) {
      var nextCurrentHook = currentlyRenderingFiber.alternate;
      nextCurrentHook =
        null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
    } else nextCurrentHook = currentHook.next;
    let nextWorkInProgressHook;
    nextWorkInProgressHook =
      null === workInProgressHook
        ? currentlyRenderingFiber.memoizedState
        : workInProgressHook.next;
    if (null !== nextWorkInProgressHook)
      (workInProgressHook = nextWorkInProgressHook),
        (currentHook = nextCurrentHook);
    else {
      if (null === nextCurrentHook)
        throw Error("Rendered more hooks than during the previous render.");
      currentHook = nextCurrentHook;
      nextCurrentHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };
      null === workInProgressHook
        ? (currentlyRenderingFiber.memoizedState = workInProgressHook =
            nextCurrentHook)
        : (workInProgressHook = workInProgressHook.next = nextCurrentHook);
    }
    return workInProgressHook;
  }
  function basicStateReducer(state, action) {
    return "function" === typeof action ? action(state) : action;
  }
  function updateReducer(reducer, initialArg, init) {
    initialArg = updateWorkInProgressHook();
    init = initialArg.queue;
    if (null === init)
      throw Error(
        "Should have a queue. This is likely a bug in React. Please file an issue."
      );
    init.lastRenderedReducer = reducer;
    var current = currentHook,
      baseQueue = current.baseQueue,
      pendingQueue = init.pending;
    if (null !== pendingQueue) {
      if (null !== baseQueue) {
        var baseFirst = baseQueue.next;
        baseQueue.next = pendingQueue.next;
        pendingQueue.next = baseFirst;
      }
      current.baseQueue = baseQueue = pendingQueue;
      init.pending = null;
    }
    if (null !== baseQueue) {
      pendingQueue = baseQueue.next;
      current = current.baseState;
      let newBaseQueueFirst = (baseFirst = null),
        newBaseQueueLast = null,
        update = pendingQueue;
      do {
        const updateLane = update.lane;
        if ((renderLanes & updateLane) === updateLane)
          null !== newBaseQueueLast &&
            (newBaseQueueLast = newBaseQueueLast.next =
              {
                lane: 0,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }),
            (current = update.hasEagerState
              ? update.eagerState
              : reducer(current, update.action));
        else {
          const clone = {
            lane: updateLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          };
          null === newBaseQueueLast
            ? ((newBaseQueueFirst = newBaseQueueLast = clone),
              (baseFirst = current))
            : (newBaseQueueLast = newBaseQueueLast.next = clone);
          currentlyRenderingFiber.lanes |= updateLane;
          workInProgressRootSkippedLanes |= updateLane;
        }
        update = update.next;
      } while (null !== update && update !== pendingQueue);
      null === newBaseQueueLast
        ? (baseFirst = current)
        : (newBaseQueueLast.next = newBaseQueueFirst);
      objectIs(current, initialArg.memoizedState) || (didReceiveUpdate = !0);
      initialArg.memoizedState = current;
      initialArg.baseState = baseFirst;
      initialArg.baseQueue = newBaseQueueLast;
      init.lastRenderedState = current;
    }
    reducer = init.interleaved;
    if (null !== reducer) {
      baseQueue = reducer;
      do
        (pendingQueue = baseQueue.lane),
          (currentlyRenderingFiber.lanes |= pendingQueue),
          (workInProgressRootSkippedLanes |= pendingQueue),
          (baseQueue = baseQueue.next);
      while (baseQueue !== reducer);
    } else null === baseQueue && (init.lanes = 0);
    return [initialArg.memoizedState, init.dispatch];
  }
  function rerenderReducer(reducer, initialArg, init) {
    initialArg = updateWorkInProgressHook();
    init = initialArg.queue;
    if (null === init)
      throw Error(
        "Should have a queue. This is likely a bug in React. Please file an issue."
      );
    init.lastRenderedReducer = reducer;
    const dispatch = init.dispatch;
    var lastRenderPhaseUpdate = init.pending;
    let newState = initialArg.memoizedState;
    if (null !== lastRenderPhaseUpdate) {
      init.pending = null;
      let update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
      do (newState = reducer(newState, update.action)), (update = update.next);
      while (update !== lastRenderPhaseUpdate);
      objectIs(newState, initialArg.memoizedState) || (didReceiveUpdate = !0);
      initialArg.memoizedState = newState;
      null === initialArg.baseQueue && (initialArg.baseState = newState);
      init.lastRenderedState = newState;
    }
    return [newState, dispatch];
  }
  function updateMutableSource(source, getSnapshot, subscribe) {}
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    getServerSnapshot = currentlyRenderingFiber;
    var hook = updateWorkInProgressHook();
    const nextSnapshot = getSnapshot(),
      snapshotChanged = !objectIs(hook.memoizedState, nextSnapshot);
    snapshotChanged &&
      ((hook.memoizedState = nextSnapshot), (didReceiveUpdate = !0));
    hook = hook.queue;
    updateEffect(
      subscribeToStore.bind(null, getServerSnapshot, hook, subscribe),
      [subscribe]
    );
    if (
      hook.getSnapshot !== getSnapshot ||
      snapshotChanged ||
      (null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1)
    ) {
      getServerSnapshot.flags |= 2048;
      pushEffect(
        9,
        updateStoreInstance.bind(
          null,
          getServerSnapshot,
          hook,
          nextSnapshot,
          getSnapshot
        ),
        void 0,
        null
      );
      if (null === workInProgressRoot)
        throw Error(
          "Expected a work-in-progress root. This is a bug in React. Please file an issue."
        );
      0 !== (renderLanes & 30) ||
        pushStoreConsistencyCheck(getServerSnapshot, getSnapshot, nextSnapshot);
    }
    return nextSnapshot;
  }
  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= 16384;
    fiber = { getSnapshot, value: renderedSnapshot };
    getSnapshot = currentlyRenderingFiber.updateQueue;
    null === getSnapshot
      ? ((getSnapshot = { lastEffect: null, stores: null }),
        (currentlyRenderingFiber.updateQueue = getSnapshot),
        (getSnapshot.stores = [fiber]))
      : ((renderedSnapshot = getSnapshot.stores),
        null === renderedSnapshot
          ? (getSnapshot.stores = [fiber])
          : renderedSnapshot.push(fiber));
  }
  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  }
  function subscribeToStore(fiber, inst, subscribe) {
    return subscribe(() => {
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    });
  }
  function checkIfSnapshotChanged(inst) {
    const latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      const nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return !0;
    }
  }
  function forceStoreRerender(fiber) {
    const root = markUpdateLaneFromFiberToRoot(fiber, 1);
    null !== root && scheduleUpdateOnFiber(root, fiber, 1, -1);
  }
  function mountState(initialState) {
    const hook = mountWorkInProgressHook();
    "function" === typeof initialState && (initialState = initialState());
    hook.memoizedState = hook.baseState = initialState;
    initialState = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    hook.queue = initialState;
    initialState = initialState.dispatch = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      initialState
    );
    return [hook.memoizedState, initialState];
  }
  function pushEffect(tag, create, destroy, deps) {
    tag = { tag, create, destroy, deps, next: null };
    create = currentlyRenderingFiber.updateQueue;
    null === create
      ? ((create = { lastEffect: null, stores: null }),
        (currentlyRenderingFiber.updateQueue = create),
        (create.lastEffect = tag.next = tag))
      : ((destroy = create.lastEffect),
        null === destroy
          ? (create.lastEffect = tag.next = tag)
          : ((deps = destroy.next),
            (destroy.next = tag),
            (tag.next = deps),
            (create.lastEffect = tag)));
    return tag;
  }
  function updateRef(initialValue) {
    return updateWorkInProgressHook().memoizedState;
  }
  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    const hook = mountWorkInProgressHook();
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushEffect(
      1 | hookFlags,
      create,
      void 0,
      void 0 === deps ? null : deps
    );
  }
  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    const hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    let destroy = void 0;
    if (null !== currentHook) {
      const prevEffect = currentHook.memoizedState;
      destroy = prevEffect.destroy;
      if (null !== deps && areHookInputsEqual(deps, prevEffect.deps)) {
        hook.memoizedState = pushEffect(hookFlags, create, destroy, deps);
        return;
      }
    }
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushEffect(1 | hookFlags, create, destroy, deps);
  }
  function mountEffect(create, deps) {
    return mountEffectImpl(8390656, 8, create, deps);
  }
  function updateEffect(create, deps) {
    return updateEffectImpl(2048, 8, create, deps);
  }
  function updateInsertionEffect(create, deps) {
    return updateEffectImpl(4, 2, create, deps);
  }
  function updateLayoutEffect(create, deps) {
    return updateEffectImpl(4, 4, create, deps);
  }
  function imperativeHandleEffect(create, ref) {
    if ("function" === typeof ref)
      return (
        (create = create()),
        ref(create),
        () => {
          ref(null);
        }
      );
    if (null !== ref && void 0 !== ref)
      return (
        (create = create()),
        (ref.current = create),
        () => {
          ref.current = null;
        }
      );
  }
  function updateImperativeHandle(ref, create, deps) {
    deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
    return updateEffectImpl(
      4,
      4,
      imperativeHandleEffect.bind(null, create, ref),
      deps
    );
  }
  function mountDebugValue(value, formatterFn) {}
  function updateCallback(callback, deps) {
    const hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    const prevState = hook.memoizedState;
    if (
      null !== prevState &&
      null !== deps &&
      areHookInputsEqual(deps, prevState[1])
    )
      return prevState[0];
    hook.memoizedState = [callback, deps];
    return callback;
  }
  function updateMemo(nextCreate, deps) {
    const hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    const prevState = hook.memoizedState;
    if (
      null !== prevState &&
      null !== deps &&
      areHookInputsEqual(deps, prevState[1])
    )
      return prevState[0];
    nextCreate = nextCreate();
    hook.memoizedState = [nextCreate, deps];
    return nextCreate;
  }
  function updateDeferredValueImpl(hook, prevValue, value) {
    if (0 === (renderLanes & 21))
      return (
        hook.baseState && ((hook.baseState = !1), (didReceiveUpdate = !0)),
        (hook.memoizedState = value)
      );
    objectIs(value, prevValue) ||
      ((value = claimNextTransitionLane()),
      (currentlyRenderingFiber.lanes |= value),
      (workInProgressRootSkippedLanes |= value),
      (hook.baseState = !0));
    return prevValue;
  }
  function startTransition(setPending, callback, options) {
    options = currentUpdatePriority;
    currentUpdatePriority = 0 !== options && 4 > options ? options : 4;
    setPending(!0);
    const prevTransition = ReactCurrentBatchConfig$1.transition;
    ReactCurrentBatchConfig$1.transition = {};
    ReactCurrentBatchConfig$1.transition;
    try {
      setPending(!1), callback();
    } finally {
      (currentUpdatePriority = options),
        (ReactCurrentBatchConfig$1.transition = prevTransition);
    }
  }
  function updateId() {
    return updateWorkInProgressHook().memoizedState;
  }
  function dispatchReducerAction(fiber, queue, action) {
    const lane = requestUpdateLane(fiber);
    action = { lane, action, hasEagerState: !1, eagerState: null, next: null };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, action);
    else if (
      ((action = enqueueConcurrentHookUpdate(fiber, queue, action, lane)),
      null !== action)
    ) {
      const eventTime = requestEventTime();
      scheduleUpdateOnFiber(action, fiber, lane, eventTime);
      entangleTransitionUpdate(action, queue, lane);
    }
  }
  function dispatchSetState(fiber, queue, action) {
    const lane = requestUpdateLane(fiber);
    var update = {
      lane,
      action,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
    else {
      var alternate = fiber.alternate;
      if (
        0 === fiber.lanes &&
        (null === alternate || 0 === alternate.lanes) &&
        ((alternate = queue.lastRenderedReducer), null !== alternate)
      )
        try {
          const currentState = queue.lastRenderedState,
            eagerState = alternate(currentState, action);
          update.hasEagerState = !0;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState)) {
            const interleaved = queue.interleaved;
            null === interleaved
              ? ((update.next = update), pushConcurrentUpdateQueue(queue))
              : ((update.next = interleaved.next), (interleaved.next = update));
            queue.interleaved = update;
            return;
          }
        } catch (error) {
        } finally {
        }
      action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
      null !== action &&
        ((update = requestEventTime()),
        scheduleUpdateOnFiber(action, fiber, lane, update),
        entangleTransitionUpdate(action, queue, lane));
    }
  }
  function isRenderPhaseUpdate(fiber) {
    const alternate = fiber.alternate;
    return (
      fiber === currentlyRenderingFiber ||
      (null !== alternate && alternate === currentlyRenderingFiber)
    );
  }
  function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
      !0;
    const pending = queue.pending;
    null === pending
      ? (update.next = update)
      : ((update.next = pending.next), (pending.next = update));
    queue.pending = update;
  }
  function entangleTransitionUpdate(root, queue, lane) {
    if (0 !== (lane & 4194240)) {
      let queueLanes = queue.lanes;
      queueLanes &= root.pendingLanes;
      lane |= queueLanes;
      queue.lanes = lane;
      markRootEntangled(root, lane);
    }
  }
  function resolveDefaultProps(Component, baseProps) {
    if (Component && Component.defaultProps) {
      baseProps = assign({}, baseProps);
      Component = Component.defaultProps;
      for (const propName in Component)
        void 0 === baseProps[propName] &&
          (baseProps[propName] = Component[propName]);
      return baseProps;
    }
    return baseProps;
  }
  function applyDerivedStateFromProps(
    workInProgress,
    ctor,
    getDerivedStateFromProps,
    nextProps
  ) {
    ctor = workInProgress.memoizedState;
    getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
    getDerivedStateFromProps =
      null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps
        ? ctor
        : assign({}, ctor, getDerivedStateFromProps);
    workInProgress.memoizedState = getDerivedStateFromProps;
    0 === workInProgress.lanes &&
      (workInProgress.updateQueue.baseState = getDerivedStateFromProps);
  }
  function checkShouldComponentUpdate(
    workInProgress,
    ctor,
    oldProps,
    newProps,
    oldState,
    newState,
    nextContext
  ) {
    workInProgress = workInProgress.stateNode;
    return "function" === typeof workInProgress.shouldComponentUpdate
      ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext)
      : ctor.prototype && ctor.prototype.isPureReactComponent
        ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
        : !0;
  }
  function constructClassInstance(workInProgress, ctor, props) {
    var isLegacyContextConsumer = !1;
    let unmaskedContext = emptyContextObject;
    var context = ctor.contextType;
    "object" === typeof context && null !== context
      ? (context = readContext(context))
      : ((unmaskedContext = isContextProvider(ctor)
          ? previousContext
          : contextStackCursor$1.current),
        (isLegacyContextConsumer = ctor.contextTypes),
        (context = (isLegacyContextConsumer =
          null !== isLegacyContextConsumer &&
          void 0 !== isLegacyContextConsumer)
          ? getMaskedContext(workInProgress, unmaskedContext)
          : emptyContextObject));
    ctor = new ctor(props, context);
    workInProgress.memoizedState =
      null !== ctor.state && void 0 !== ctor.state ? ctor.state : null;
    ctor.updater = classComponentUpdater;
    workInProgress.stateNode = ctor;
    ctor._reactInternals = workInProgress;
    isLegacyContextConsumer &&
      ((workInProgress = workInProgress.stateNode),
      (workInProgress.__reactInternalMemoizedUnmaskedChildContext =
        unmaskedContext),
      (workInProgress.__reactInternalMemoizedMaskedChildContext = context));
    return ctor;
  }
  function callComponentWillReceiveProps(
    workInProgress,
    instance,
    newProps,
    nextContext
  ) {
    workInProgress = instance.state;
    "function" === typeof instance.componentWillReceiveProps &&
      instance.componentWillReceiveProps(newProps, nextContext);
    "function" === typeof instance.UNSAFE_componentWillReceiveProps &&
      instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    instance.state !== workInProgress &&
      classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
  function mountClassInstance(workInProgress, ctor, newProps, renderLanes) {
    const instance = workInProgress.stateNode;
    instance.props = newProps;
    instance.state = workInProgress.memoizedState;
    instance.refs = {};
    initializeUpdateQueue(workInProgress);
    var contextType = ctor.contextType;
    "object" === typeof contextType && null !== contextType
      ? (instance.context = readContext(contextType))
      : ((contextType = isContextProvider(ctor)
          ? previousContext
          : contextStackCursor$1.current),
        (instance.context = getMaskedContext(workInProgress, contextType)));
    instance.state = workInProgress.memoizedState;
    contextType = ctor.getDerivedStateFromProps;
    "function" === typeof contextType &&
      (applyDerivedStateFromProps(workInProgress, ctor, contextType, newProps),
      (instance.state = workInProgress.memoizedState));
    "function" === typeof ctor.getDerivedStateFromProps ||
      "function" === typeof instance.getSnapshotBeforeUpdate ||
      ("function" !== typeof instance.UNSAFE_componentWillMount &&
        "function" !== typeof instance.componentWillMount) ||
      ((ctor = instance.state),
      "function" === typeof instance.componentWillMount &&
        instance.componentWillMount(),
      "function" === typeof instance.UNSAFE_componentWillMount &&
        instance.UNSAFE_componentWillMount(),
      ctor !== instance.state &&
        classComponentUpdater.enqueueReplaceState(
          instance,
          instance.state,
          null
        ),
      processUpdateQueue(workInProgress, newProps, instance, renderLanes),
      (instance.state = workInProgress.memoizedState));
    "function" === typeof instance.componentDidMount &&
      (workInProgress.flags |= 4194308);
  }
  function createCapturedValueAtFiber(value, source) {
    try {
      let info = "",
        node = source;
      do (info += describeFiber(node)), (node = node.return);
      while (node);
      var JSCompiler_inline_result = info;
    } catch (x) {
      JSCompiler_inline_result =
        "\nError generating stack: " + x.message + "\n" + x.stack;
    }
    return { value, source, stack: JSCompiler_inline_result, digest: null };
  }
  function createCapturedValue(value, digest, stack) {
    return {
      value,
      source: null,
      stack: null,
      digest: null != digest ? digest : null
    };
  }
  function logCapturedError(boundary, errorInfo) {
    try {
      console.error(errorInfo.value);
    } catch (e) {
      setTimeout(() => {
        throw e;
      });
    }
  }
  function createRootErrorUpdate(fiber, errorInfo, lane) {
    lane = createUpdate(-1, lane);
    lane.tag = 3;
    lane.payload = { element: null };
    const error = errorInfo.value;
    lane.callback = () => {
      hasUncaughtError ||
        ((hasUncaughtError = !0), (firstUncaughtError = error));
      logCapturedError(fiber, errorInfo);
    };
    return lane;
  }
  function createClassErrorUpdate(fiber, errorInfo, lane) {
    lane = createUpdate(-1, lane);
    lane.tag = 3;
    const getDerivedStateFromError = fiber.type.getDerivedStateFromError;
    if ("function" === typeof getDerivedStateFromError) {
      const error = errorInfo.value;
      lane.payload = () => getDerivedStateFromError(error);
      lane.callback = () => {
        logCapturedError(fiber, errorInfo);
      };
    }
    const inst = fiber.stateNode;
    null !== inst &&
      "function" === typeof inst.componentDidCatch &&
      (lane.callback = function () {
        logCapturedError(fiber, errorInfo);
        "function" !== typeof getDerivedStateFromError &&
          (null === legacyErrorBoundariesThatAlreadyFailed
            ? (legacyErrorBoundariesThatAlreadyFailed = new Set([this]))
            : legacyErrorBoundariesThatAlreadyFailed.add(this));
        const stack = errorInfo.stack;
        this.componentDidCatch(errorInfo.value, {
          componentStack: null !== stack ? stack : ""
        });
      });
    return lane;
  }
  function attachPingListener(root, wakeable, lanes) {
    let pingCache = root.pingCache,
      threadIDs;
    null === pingCache
      ? ((pingCache = root.pingCache = new PossiblyWeakMap()),
        (threadIDs = new Set()),
        pingCache.set(wakeable, threadIDs))
      : ((threadIDs = pingCache.get(wakeable)),
        void 0 === threadIDs &&
          ((threadIDs = new Set()), pingCache.set(wakeable, threadIDs)));
    threadIDs.has(lanes) ||
      (threadIDs.add(lanes),
      (root = pingSuspendedRoot.bind(null, root, wakeable, lanes)),
      wakeable.then(root, root));
  }
  function getNearestSuspenseBoundaryToCapture(returnFiber) {
    do {
      var JSCompiler_temp;
      if ((JSCompiler_temp = 13 === returnFiber.tag))
        (JSCompiler_temp = returnFiber.memoizedState),
          null !== JSCompiler_temp
            ? (JSCompiler_temp = null !== JSCompiler_temp.dehydrated ? !0 : !1)
            : (returnFiber.memoizedProps, (JSCompiler_temp = !0));
      if (JSCompiler_temp) return returnFiber;
      returnFiber = returnFiber.return;
    } while (null !== returnFiber);
    return null;
  }
  function markSuspenseBoundaryShouldCapture(
    suspenseBoundary,
    returnFiber,
    sourceFiber,
    root,
    rootRenderLanes
  ) {
    if (0 === (suspenseBoundary.mode & 1))
      return (
        suspenseBoundary === returnFiber
          ? (suspenseBoundary.flags |= 65536)
          : ((suspenseBoundary.flags |= 128),
            (sourceFiber.flags |= 131072),
            (sourceFiber.flags &= -52805),
            1 === sourceFiber.tag &&
              (null === sourceFiber.alternate
                ? (sourceFiber.tag = 17)
                : ((returnFiber = createUpdate(-1, 1)),
                  (returnFiber.tag = 2),
                  enqueueUpdate(sourceFiber, returnFiber, 1))),
            (sourceFiber.lanes |= 1)),
        suspenseBoundary
      );
    suspenseBoundary.flags |= 65536;
    suspenseBoundary.lanes = rootRenderLanes;
    return suspenseBoundary;
  }
  function reconcileChildren(
    current,
    workInProgress,
    nextChildren,
    renderLanes
  ) {
    workInProgress.child =
      null === current
        ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
        : reconcileChildFibers(
            workInProgress,
            current.child,
            nextChildren,
            renderLanes
          );
  }
  function updateForwardRef(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    Component = Component.render;
    const ref = workInProgress.ref;
    prepareToReadContext(workInProgress, renderLanes);
    nextProps = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      ref,
      renderLanes
    );
    Component = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return (
        (workInProgress.updateQueue = current.updateQueue),
        (workInProgress.flags &= -2053),
        (current.lanes &= ~renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && Component && pushMaterializedTreeId(workInProgress);
    workInProgress.flags |= 1;
    reconcileChildren(current, workInProgress, nextProps, renderLanes);
    return workInProgress.child;
  }
  function updateMemoComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    if (null === current) {
      var type = Component.type;
      if (
        "function" === typeof type &&
        !shouldConstruct(type) &&
        void 0 === type.defaultProps &&
        null === Component.compare &&
        void 0 === Component.defaultProps
      )
        return (
          (workInProgress.tag = 15),
          (workInProgress.type = type),
          updateSimpleMemoComponent(
            current,
            workInProgress,
            type,
            nextProps,
            renderLanes
          )
        );
      current = createFiberFromTypeAndProps(
        Component.type,
        null,
        nextProps,
        workInProgress,
        workInProgress.mode,
        renderLanes
      );
      current.ref = workInProgress.ref;
      current.return = workInProgress;
      return (workInProgress.child = current);
    }
    type = current.child;
    if (0 === (current.lanes & renderLanes)) {
      const prevProps = type.memoizedProps;
      Component = Component.compare;
      Component = null !== Component ? Component : shallowEqual;
      if (Component(prevProps, nextProps) && current.ref === workInProgress.ref)
        return bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
    }
    workInProgress.flags |= 1;
    current = createWorkInProgress(type, nextProps);
    current.ref = workInProgress.ref;
    current.return = workInProgress;
    return (workInProgress.child = current);
  }
  function updateSimpleMemoComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    if (null !== current) {
      const prevProps = current.memoizedProps;
      if (
        shallowEqual(prevProps, nextProps) &&
        current.ref === workInProgress.ref
      )
        if (
          ((didReceiveUpdate = !1),
          (workInProgress.pendingProps = nextProps = prevProps),
          0 !== (current.lanes & renderLanes))
        )
          0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
        else
          return (
            (workInProgress.lanes = current.lanes),
            bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
          );
    }
    return updateFunctionComponent(
      current,
      workInProgress,
      Component,
      nextProps,
      renderLanes
    );
  }
  function updateOffscreenComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps;
    const nextChildren = nextProps.children,
      prevState = null !== current ? current.memoizedState : null;
    if ("hidden" === nextProps.mode)
      if (0 === (workInProgress.mode & 1))
        (workInProgress.memoizedState = {
          baseLanes: 0,
          cachePool: null,
          transitions: null
        }),
          push(subtreeRenderLanesCursor, subtreeRenderLanes),
          (subtreeRenderLanes |= renderLanes);
      else {
        if (0 === (renderLanes & 1073741824))
          return (
            (current =
              null !== prevState
                ? prevState.baseLanes | renderLanes
                : renderLanes),
            (workInProgress.lanes = workInProgress.childLanes = 1073741824),
            (workInProgress.memoizedState = {
              baseLanes: current,
              cachePool: null,
              transitions: null
            }),
            (workInProgress.updateQueue = null),
            (workInProgress = current),
            push(subtreeRenderLanesCursor, subtreeRenderLanes),
            (subtreeRenderLanes |= workInProgress),
            null
          );
        workInProgress.memoizedState = {
          baseLanes: 0,
          cachePool: null,
          transitions: null
        };
        nextProps = null !== prevState ? prevState.baseLanes : renderLanes;
        push(subtreeRenderLanesCursor, subtreeRenderLanes);
        subtreeRenderLanes |= nextProps;
      }
    else
      null !== prevState
        ? ((nextProps = prevState.baseLanes | renderLanes),
          (workInProgress.memoizedState = null))
        : (nextProps = renderLanes),
        push(subtreeRenderLanesCursor, subtreeRenderLanes),
        (subtreeRenderLanes |= nextProps);
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
  }
  function markRef$1(current, workInProgress) {
    const ref = workInProgress.ref;
    if (
      (null === current && null !== ref) ||
      (null !== current && current.ref !== ref)
    )
      (workInProgress.flags |= 512), (workInProgress.flags |= 2097152);
  }
  function updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    var context = isContextProvider(Component)
      ? previousContext
      : contextStackCursor$1.current;
    context = getMaskedContext(workInProgress, context);
    prepareToReadContext(workInProgress, renderLanes);
    Component = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes
    );
    nextProps = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return (
        (workInProgress.updateQueue = current.updateQueue),
        (workInProgress.flags &= -2053),
        (current.lanes &= ~renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress);
    workInProgress.flags |= 1;
    reconcileChildren(current, workInProgress, Component, renderLanes);
    return workInProgress.child;
  }
  function updateClassComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    let hasContext;
    isContextProvider(Component)
      ? ((hasContext = !0), pushContextProvider(workInProgress))
      : (hasContext = !1);
    prepareToReadContext(workInProgress, renderLanes);
    if (null === workInProgress.stateNode)
      resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        constructClassInstance(workInProgress, Component, nextProps),
        mountClassInstance(workInProgress, Component, nextProps, renderLanes),
        (nextProps = !0);
    else if (null === current) {
      var instance = workInProgress.stateNode,
        oldProps = workInProgress.memoizedProps;
      instance.props = oldProps;
      var oldContext = instance.context,
        contextType = Component.contextType;
      "object" === typeof contextType && null !== contextType
        ? (contextType = readContext(contextType))
        : ((contextType = isContextProvider(Component)
            ? previousContext
            : contextStackCursor$1.current),
          (contextType = getMaskedContext(workInProgress, contextType)));
      var getDerivedStateFromProps$jscomp$0 =
          Component.getDerivedStateFromProps,
        hasNewLifecycles =
          "function" === typeof getDerivedStateFromProps$jscomp$0 ||
          "function" === typeof instance.getSnapshotBeforeUpdate;
      hasNewLifecycles ||
        ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof instance.componentWillReceiveProps) ||
        ((oldProps !== nextProps || oldContext !== contextType) &&
          callComponentWillReceiveProps(
            workInProgress,
            instance,
            nextProps,
            contextType
          ));
      hasForceUpdate = !1;
      var oldState = workInProgress.memoizedState;
      instance.state = oldState;
      processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
      oldContext = workInProgress.memoizedState;
      oldProps !== nextProps ||
      oldState !== oldContext ||
      didPerformWorkStackCursor.current ||
      hasForceUpdate
        ? ("function" === typeof getDerivedStateFromProps$jscomp$0 &&
            (applyDerivedStateFromProps(
              workInProgress,
              Component,
              getDerivedStateFromProps$jscomp$0,
              nextProps
            ),
            (oldContext = workInProgress.memoizedState)),
          (oldProps =
            hasForceUpdate ||
            checkShouldComponentUpdate(
              workInProgress,
              Component,
              oldProps,
              nextProps,
              oldState,
              oldContext,
              contextType
            ))
            ? (hasNewLifecycles ||
                ("function" !== typeof instance.UNSAFE_componentWillMount &&
                  "function" !== typeof instance.componentWillMount) ||
                ("function" === typeof instance.componentWillMount &&
                  instance.componentWillMount(),
                "function" === typeof instance.UNSAFE_componentWillMount &&
                  instance.UNSAFE_componentWillMount()),
              "function" === typeof instance.componentDidMount &&
                (workInProgress.flags |= 4194308))
            : ("function" === typeof instance.componentDidMount &&
                (workInProgress.flags |= 4194308),
              (workInProgress.memoizedProps = nextProps),
              (workInProgress.memoizedState = oldContext)),
          (instance.props = nextProps),
          (instance.state = oldContext),
          (instance.context = contextType),
          (nextProps = oldProps))
        : ("function" === typeof instance.componentDidMount &&
            (workInProgress.flags |= 4194308),
          (nextProps = !1));
    } else {
      {
        instance = workInProgress.stateNode;
        cloneUpdateQueue(current, workInProgress);
        oldProps = workInProgress.memoizedProps;
        contextType =
          workInProgress.type === workInProgress.elementType
            ? oldProps
            : resolveDefaultProps(workInProgress.type, oldProps);
        instance.props = contextType;
        hasNewLifecycles = workInProgress.pendingProps;
        oldState = instance.context;
        oldContext = Component.contextType;
        "object" === typeof oldContext && null !== oldContext
          ? (oldContext = readContext(oldContext))
          : ((oldContext = isContextProvider(Component)
              ? previousContext
              : contextStackCursor$1.current),
            (oldContext = getMaskedContext(workInProgress, oldContext)));
        const getDerivedStateFromProps = Component.getDerivedStateFromProps;
        (getDerivedStateFromProps$jscomp$0 =
          "function" === typeof getDerivedStateFromProps ||
          "function" === typeof instance.getSnapshotBeforeUpdate) ||
          ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
            "function" !== typeof instance.componentWillReceiveProps) ||
          ((oldProps !== hasNewLifecycles || oldState !== oldContext) &&
            callComponentWillReceiveProps(
              workInProgress,
              instance,
              nextProps,
              oldContext
            ));
        hasForceUpdate = !1;
        oldState = workInProgress.memoizedState;
        let newState;
        instance.state = oldState;
        processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
        newState = workInProgress.memoizedState;
        oldProps !== hasNewLifecycles ||
        oldState !== newState ||
        didPerformWorkStackCursor.current ||
        hasForceUpdate
          ? ("function" === typeof getDerivedStateFromProps &&
              (applyDerivedStateFromProps(
                workInProgress,
                Component,
                getDerivedStateFromProps,
                nextProps
              ),
              (newState = workInProgress.memoizedState)),
            (contextType =
              hasForceUpdate ||
              checkShouldComponentUpdate(
                workInProgress,
                Component,
                contextType,
                nextProps,
                oldState,
                newState,
                oldContext
              ) ||
              !1)
              ? (getDerivedStateFromProps$jscomp$0 ||
                  ("function" !== typeof instance.UNSAFE_componentWillUpdate &&
                    "function" !== typeof instance.componentWillUpdate) ||
                  ("function" === typeof instance.componentWillUpdate &&
                    instance.componentWillUpdate(
                      nextProps,
                      newState,
                      oldContext
                    ),
                  "function" === typeof instance.UNSAFE_componentWillUpdate &&
                    instance.UNSAFE_componentWillUpdate(
                      nextProps,
                      newState,
                      oldContext
                    )),
                "function" === typeof instance.componentDidUpdate &&
                  (workInProgress.flags |= 4),
                "function" === typeof instance.getSnapshotBeforeUpdate &&
                  (workInProgress.flags |= 1024))
              : ("function" !== typeof instance.componentDidUpdate ||
                  (oldProps === current.memoizedProps &&
                    oldState === current.memoizedState) ||
                  (workInProgress.flags |= 4),
                "function" !== typeof instance.getSnapshotBeforeUpdate ||
                  (oldProps === current.memoizedProps &&
                    oldState === current.memoizedState) ||
                  (workInProgress.flags |= 1024),
                (workInProgress.memoizedProps = nextProps),
                (workInProgress.memoizedState = newState)),
            (instance.props = nextProps),
            (instance.state = newState),
            (instance.context = oldContext),
            (nextProps = contextType))
          : ("function" !== typeof instance.componentDidUpdate ||
              (oldProps === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 4),
            "function" !== typeof instance.getSnapshotBeforeUpdate ||
              (oldProps === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 1024),
            (nextProps = !1));
      }
    }
    return finishClassComponent(
      current,
      workInProgress,
      Component,
      nextProps,
      hasContext,
      renderLanes
    );
  }
  function finishClassComponent(
    current,
    workInProgress,
    Component,
    shouldUpdate,
    hasContext,
    renderLanes
  ) {
    markRef$1(current, workInProgress);
    const didCaptureError = 0 !== (workInProgress.flags & 128);
    if (!shouldUpdate && !didCaptureError)
      return (
        hasContext && invalidateContextProvider(workInProgress, Component, !1),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    shouldUpdate = workInProgress.stateNode;
    ReactCurrentOwner$1.current = workInProgress;
    let nextChildren;
    nextChildren =
      didCaptureError &&
      "function" !== typeof Component.getDerivedStateFromError
        ? null
        : shouldUpdate.render();
    workInProgress.flags |= 1;
    null !== current && didCaptureError
      ? ((workInProgress.child = reconcileChildFibers(
          workInProgress,
          current.child,
          null,
          renderLanes
        )),
        (workInProgress.child = reconcileChildFibers(
          workInProgress,
          null,
          nextChildren,
          renderLanes
        )))
      : reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    workInProgress.memoizedState = shouldUpdate.state;
    hasContext && invalidateContextProvider(workInProgress, Component, !0);
    return workInProgress.child;
  }
  function pushHostRootContext(workInProgress) {
    const root = workInProgress.stateNode;
    root.pendingContext
      ? pushTopLevelContextObject(
          workInProgress,
          root.pendingContext,
          root.pendingContext !== root.context
        )
      : root.context &&
        pushTopLevelContextObject(workInProgress, root.context, !1);
    pushHostContainer(workInProgress, root.containerInfo);
  }
  function mountHostRootWithoutHydrating(
    current,
    workInProgress,
    nextChildren,
    renderLanes,
    recoverableError
  ) {
    resetHydrationState();
    queueHydrationError(recoverableError);
    workInProgress.flags |= 256;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
  }
  function mountSuspenseOffscreenState(renderLanes) {
    return { baseLanes: renderLanes, cachePool: null, transitions: null };
  }
  function updateSuspenseComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      suspenseContext = suspenseStackCursor.current,
      showFallback = !1,
      didSuspend = 0 !== (workInProgress.flags & 128),
      JSCompiler_temp;
    (JSCompiler_temp = didSuspend) ||
      (JSCompiler_temp =
        null !== current && null === current.memoizedState
          ? !1
          : 0 !== (suspenseContext & 2));
    if (JSCompiler_temp) (showFallback = !0), (workInProgress.flags &= -129);
    else if (null === current || null !== current.memoizedState)
      suspenseContext |= 1;
    push(suspenseStackCursor, suspenseContext & 1);
    if (null === current) {
      tryToClaimNextHydratableInstance(workInProgress);
      current = workInProgress.memoizedState;
      if (
        null !== current &&
        ((current = current.dehydrated), null !== current)
      )
        return (
          0 === (workInProgress.mode & 1)
            ? (workInProgress.lanes = 1)
            : "$!" === current.data
              ? (workInProgress.lanes = 8)
              : (workInProgress.lanes = 1073741824),
          null
        );
      current = nextProps.children;
      nextProps = nextProps.fallback;
      return showFallback
        ? ((showFallback = workInProgress.mode),
          (didSuspend = workInProgress.child),
          (current = { mode: "hidden", children: current }),
          0 === (showFallback & 1) && null !== didSuspend
            ? ((didSuspend.childLanes = 0), (didSuspend.pendingProps = current))
            : (didSuspend = createFiberFromOffscreen(
                current,
                showFallback,
                0,
                null
              )),
          (current = createFiberFromFragment(
            nextProps,
            showFallback,
            renderLanes,
            null
          )),
          (didSuspend.return = workInProgress),
          (current.return = workInProgress),
          (didSuspend.sibling = current),
          (workInProgress.child = didSuspend),
          (workInProgress.child.memoizedState =
            mountSuspenseOffscreenState(renderLanes)),
          (workInProgress.memoizedState = SUSPENDED_MARKER),
          current)
        : mountSuspensePrimaryChildren(workInProgress, current);
    }
    suspenseContext = current.memoizedState;
    if (
      null !== suspenseContext &&
      ((JSCompiler_temp = suspenseContext.dehydrated), null !== JSCompiler_temp)
    )
      return updateDehydratedSuspenseComponent(
        current,
        workInProgress,
        didSuspend,
        nextProps,
        JSCompiler_temp,
        suspenseContext,
        renderLanes
      );
    if (showFallback) {
      showFallback = nextProps.fallback;
      didSuspend = workInProgress.mode;
      suspenseContext = current.child;
      JSCompiler_temp = suspenseContext.sibling;
      const primaryChildProps = {
        mode: "hidden",
        children: nextProps.children
      };
      0 === (didSuspend & 1) && workInProgress.child !== suspenseContext
        ? ((nextProps = workInProgress.child),
          (nextProps.childLanes = 0),
          (nextProps.pendingProps = primaryChildProps),
          (workInProgress.deletions = null))
        : ((nextProps = createWorkInProgress(
            suspenseContext,
            primaryChildProps
          )),
          (nextProps.subtreeFlags = suspenseContext.subtreeFlags & 14680064));
      null !== JSCompiler_temp
        ? (showFallback = createWorkInProgress(JSCompiler_temp, showFallback))
        : ((showFallback = createFiberFromFragment(
            showFallback,
            didSuspend,
            renderLanes,
            null
          )),
          (showFallback.flags |= 2));
      showFallback.return = workInProgress;
      nextProps.return = workInProgress;
      nextProps.sibling = showFallback;
      workInProgress.child = nextProps;
      nextProps = showFallback;
      showFallback = workInProgress.child;
      didSuspend = current.child.memoizedState;
      didSuspend =
        null === didSuspend
          ? mountSuspenseOffscreenState(renderLanes)
          : {
              baseLanes: didSuspend.baseLanes | renderLanes,
              cachePool: null,
              transitions: didSuspend.transitions
            };
      showFallback.memoizedState = didSuspend;
      showFallback.childLanes = current.childLanes & ~renderLanes;
      workInProgress.memoizedState = SUSPENDED_MARKER;
      return nextProps;
    }
    showFallback = current.child;
    current = showFallback.sibling;
    nextProps = createWorkInProgress(showFallback, {
      mode: "visible",
      children: nextProps.children
    });
    0 === (workInProgress.mode & 1) && (nextProps.lanes = renderLanes);
    nextProps.return = workInProgress;
    nextProps.sibling = null;
    null !== current &&
      ((renderLanes = workInProgress.deletions),
      null === renderLanes
        ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
        : renderLanes.push(current));
    workInProgress.child = nextProps;
    workInProgress.memoizedState = null;
    return nextProps;
  }
  function mountSuspensePrimaryChildren(
    workInProgress,
    primaryChildren,
    renderLanes
  ) {
    primaryChildren = createFiberFromOffscreen(
      { mode: "visible", children: primaryChildren },
      workInProgress.mode,
      0,
      null
    );
    primaryChildren.return = workInProgress;
    return (workInProgress.child = primaryChildren);
  }
  function retrySuspenseComponentWithoutHydrating(
    current,
    workInProgress,
    renderLanes,
    recoverableError
  ) {
    null !== recoverableError && queueHydrationError(recoverableError);
    reconcileChildFibers(workInProgress, current.child, null, renderLanes);
    current = mountSuspensePrimaryChildren(
      workInProgress,
      workInProgress.pendingProps.children
    );
    current.flags |= 2;
    workInProgress.memoizedState = null;
    return current;
  }
  function updateDehydratedSuspenseComponent(
    current,
    workInProgress,
    didSuspend,
    nextProps,
    suspenseInstance,
    suspenseState,
    renderLanes
  ) {
    if (didSuspend) {
      if (workInProgress.flags & 256)
        return (
          (workInProgress.flags &= -257),
          (suspenseState = createCapturedValue(
            Error(
              "There was an error while hydrating this Suspense boundary. Switched to client rendering."
            )
          )),
          retrySuspenseComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes,
            suspenseState
          )
        );
      if (null !== workInProgress.memoizedState)
        return (
          (workInProgress.child = current.child),
          (workInProgress.flags |= 128),
          null
        );
      suspenseState = nextProps.fallback;
      suspenseInstance = workInProgress.mode;
      nextProps = createFiberFromOffscreen(
        { mode: "visible", children: nextProps.children },
        suspenseInstance,
        0,
        null
      );
      suspenseState = createFiberFromFragment(
        suspenseState,
        suspenseInstance,
        renderLanes,
        null
      );
      suspenseState.flags |= 2;
      nextProps.return = workInProgress;
      suspenseState.return = workInProgress;
      nextProps.sibling = suspenseState;
      workInProgress.child = nextProps;
      0 !== (workInProgress.mode & 1) &&
        reconcileChildFibers(workInProgress, current.child, null, renderLanes);
      current = suspenseState;
      workInProgress.child.memoizedState =
        mountSuspenseOffscreenState(renderLanes);
      workInProgress.memoizedState = SUSPENDED_MARKER;
      return current;
    }
    if (0 === (workInProgress.mode & 1))
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
        null
      );
    if ("$!" === suspenseInstance.data) {
      suspenseState =
        suspenseInstance.nextSibling && suspenseInstance.nextSibling.dataset;
      if (suspenseState) var digest = suspenseState.dgst;
      suspenseState = { digest };
      ({ digest: suspenseState } = suspenseState);
      suspenseState = createCapturedValue(
        Error(
          "The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering."
        ),
        suspenseState
      );
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
        suspenseState
      );
    }
    digest = 0 !== (renderLanes & current.childLanes);
    if (didReceiveUpdate || digest) {
      nextProps = workInProgressRoot;
      if (null !== nextProps) {
        suspenseInstance = nextProps;
        switch (renderLanes & -renderLanes) {
          case 4:
            digest = 2;
            break;
          case 16:
            digest = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            digest = 32;
            break;
          case 536870912:
            digest = 268435456;
            break;
          default:
            digest = 0;
        }
        suspenseInstance =
          0 !== (digest & (suspenseInstance.suspendedLanes | renderLanes))
            ? 0
            : digest;
        0 !== suspenseInstance &&
          suspenseInstance !== suspenseState.retryLane &&
          ((suspenseState.retryLane = suspenseInstance),
          markUpdateLaneFromFiberToRoot(current, suspenseInstance),
          scheduleUpdateOnFiber(nextProps, current, suspenseInstance, -1));
      }
      renderDidSuspendDelayIfPossible();
      suspenseState = createCapturedValue(
        Error(
          "This Suspense boundary received an update before it finished hydrating. This caused the boundary to switch to client rendering. The usual way to fix this is to wrap the original update in startTransition."
        )
      );
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
        suspenseState
      );
    }
    if ("$?" === suspenseInstance.data)
      return (
        (workInProgress.flags |= 128),
        (workInProgress.child = current.child),
        (workInProgress = retryDehydratedSuspenseBoundary.bind(null, current)),
        (suspenseInstance._reactRetry = workInProgress),
        null
      );
    renderLanes = suspenseState.treeContext;
    nextHydratableInstance = getNextHydratable(suspenseInstance.nextSibling);
    hydrationParentFiber = workInProgress;
    isHydrating = !0;
    hydrationErrors = null;
    null !== renderLanes &&
      ((idStack[idStackIndex++] = treeContextId),
      (idStack[idStackIndex++] = treeContextOverflow),
      (idStack[idStackIndex++] = treeContextProvider),
      (treeContextId = renderLanes.id),
      (treeContextOverflow = renderLanes.overflow),
      (treeContextProvider = workInProgress));
    workInProgress = mountSuspensePrimaryChildren(
      workInProgress,
      nextProps.children
    );
    workInProgress.flags |= 4096;
    return workInProgress;
  }
  function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
    fiber.lanes |= renderLanes;
    const alternate = fiber.alternate;
    null !== alternate && (alternate.lanes |= renderLanes);
    scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
  }
  function initSuspenseListRenderState(
    workInProgress,
    isBackwards,
    tail,
    lastContentRow,
    tailMode
  ) {
    const renderState = workInProgress.memoizedState;
    null === renderState
      ? (workInProgress.memoizedState = {
          isBackwards,
          rendering: null,
          renderingStartTime: 0,
          last: lastContentRow,
          tail,
          tailMode
        })
      : ((renderState.isBackwards = isBackwards),
        (renderState.rendering = null),
        (renderState.renderingStartTime = 0),
        (renderState.last = lastContentRow),
        (renderState.tail = tail),
        (renderState.tailMode = tailMode));
  }
  function updateSuspenseListComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      revealOrder = nextProps.revealOrder;
    const tailMode = nextProps.tail;
    reconcileChildren(current, workInProgress, nextProps.children, renderLanes);
    nextProps = suspenseStackCursor.current;
    if (0 !== (nextProps & 2))
      (nextProps = (nextProps & 1) | 2), (workInProgress.flags |= 128);
    else {
      if (null !== current && 0 !== (current.flags & 128))
        a: for (current = workInProgress.child; null !== current; ) {
          if (13 === current.tag)
            null !== current.memoizedState &&
              scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          else if (19 === current.tag)
            scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          else if (null !== current.child) {
            current.child.return = current;
            current = current.child;
            continue;
          }
          if (current === workInProgress) break a;
          for (; null === current.sibling; ) {
            if (null === current.return || current.return === workInProgress)
              break a;
            current = current.return;
          }
          current.sibling.return = current.return;
          current = current.sibling;
        }
      nextProps &= 1;
    }
    push(suspenseStackCursor, nextProps);
    if (0 === (workInProgress.mode & 1)) workInProgress.memoizedState = null;
    else
      switch (revealOrder) {
        case "forwards":
          renderLanes = workInProgress.child;
          for (revealOrder = null; null !== renderLanes; )
            (current = renderLanes.alternate),
              null !== current &&
                null === findFirstSuspended(current) &&
                (revealOrder = renderLanes),
              (renderLanes = renderLanes.sibling);
          renderLanes = revealOrder;
          null === renderLanes
            ? ((revealOrder = workInProgress.child),
              (workInProgress.child = null))
            : ((revealOrder = renderLanes.sibling),
              (renderLanes.sibling = null));
          initSuspenseListRenderState(
            workInProgress,
            !1,
            revealOrder,
            renderLanes,
            tailMode
          );
          break;
        case "backwards":
          renderLanes = null;
          revealOrder = workInProgress.child;
          for (workInProgress.child = null; null !== revealOrder; ) {
            current = revealOrder.alternate;
            if (null !== current && null === findFirstSuspended(current)) {
              workInProgress.child = revealOrder;
              break;
            }
            current = revealOrder.sibling;
            revealOrder.sibling = renderLanes;
            renderLanes = revealOrder;
            revealOrder = current;
          }
          initSuspenseListRenderState(
            workInProgress,
            !0,
            renderLanes,
            null,
            tailMode
          );
          break;
        case "together":
          initSuspenseListRenderState(workInProgress, !1, null, null, void 0);
          break;
        default:
          workInProgress.memoizedState = null;
      }
    return workInProgress.child;
  }
  function resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress) {
    0 === (workInProgress.mode & 1) &&
      null !== current &&
      ((current.alternate = null),
      (workInProgress.alternate = null),
      (workInProgress.flags |= 2));
  }
  function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
    null !== current && (workInProgress.dependencies = current.dependencies);
    workInProgressRootSkippedLanes |= workInProgress.lanes;
    if (0 === (renderLanes & workInProgress.childLanes)) return null;
    if (null !== current && workInProgress.child !== current.child)
      throw Error("Resuming work not yet implemented.");
    if (null !== workInProgress.child) {
      current = workInProgress.child;
      renderLanes = createWorkInProgress(current, current.pendingProps);
      workInProgress.child = renderLanes;
      for (renderLanes.return = workInProgress; null !== current.sibling; )
        (current = current.sibling),
          (renderLanes = renderLanes.sibling =
            createWorkInProgress(current, current.pendingProps)),
          (renderLanes.return = workInProgress);
      renderLanes.sibling = null;
    }
    return workInProgress.child;
  }
  function attemptEarlyBailoutIfNoScheduledUpdate(
    current,
    workInProgress,
    renderLanes
  ) {
    switch (workInProgress.tag) {
      case 3:
        pushHostRootContext(workInProgress);
        workInProgress.stateNode;
        resetHydrationState();
        break;
      case 5:
        pushHostContext(workInProgress);
        break;
      case 1:
        isContextProvider(workInProgress.type) &&
          pushContextProvider(workInProgress);
        break;
      case 4:
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        );
        break;
      case 10:
        var context = workInProgress.type._context,
          nextValue = workInProgress.memoizedProps.value;
        push(valueCursor, context._currentValue);
        context._currentValue = nextValue;
        break;
      case 13:
        context = workInProgress.memoizedState;
        if (null !== context) {
          if (null !== context.dehydrated)
            return (
              push(suspenseStackCursor, suspenseStackCursor.current & 1),
              (workInProgress.flags |= 128),
              null
            );
          if (0 !== (renderLanes & workInProgress.child.childLanes))
            return updateSuspenseComponent(
              current,
              workInProgress,
              renderLanes
            );
          push(suspenseStackCursor, suspenseStackCursor.current & 1);
          current = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes
          );
          return null !== current ? current.sibling : null;
        }
        push(suspenseStackCursor, suspenseStackCursor.current & 1);
        break;
      case 19:
        context = 0 !== (renderLanes & workInProgress.childLanes);
        if (0 !== (current.flags & 128)) {
          if (context)
            return updateSuspenseListComponent(
              current,
              workInProgress,
              renderLanes
            );
          workInProgress.flags |= 128;
        }
        nextValue = workInProgress.memoizedState;
        null !== nextValue &&
          ((nextValue.rendering = null),
          (nextValue.tail = null),
          (nextValue.lastEffect = null));
        push(suspenseStackCursor, suspenseStackCursor.current);
        if (context) break;
        else return null;
      case 22:
      case 23:
        return (
          (workInProgress.lanes = 0),
          updateOffscreenComponent(current, workInProgress, renderLanes)
        );
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (!isHydrating)
      switch (renderState.tailMode) {
        case "hidden":
          hasRenderedATailFallback = renderState.tail;
          for (var lastTailNode = null; null !== hasRenderedATailFallback; )
            null !== hasRenderedATailFallback.alternate &&
              (lastTailNode = hasRenderedATailFallback),
              (hasRenderedATailFallback = hasRenderedATailFallback.sibling);
          null === lastTailNode
            ? (renderState.tail = null)
            : (lastTailNode.sibling = null);
          break;
        case "collapsed":
          lastTailNode = renderState.tail;
          let lastTailNode$jscomp$0 = null;
          for (; null !== lastTailNode; )
            null !== lastTailNode.alternate &&
              (lastTailNode$jscomp$0 = lastTailNode),
              (lastTailNode = lastTailNode.sibling);
          null === lastTailNode$jscomp$0
            ? hasRenderedATailFallback || null === renderState.tail
              ? (renderState.tail = null)
              : (renderState.tail.sibling = null)
            : (lastTailNode$jscomp$0.sibling = null);
      }
  }
  function bubbleProperties(completedWork) {
    const didBailout =
      null !== completedWork.alternate &&
      completedWork.alternate.child === completedWork.child;
    let newChildLanes = 0,
      subtreeFlags = 0;
    if (didBailout)
      for (var child = completedWork.child; null !== child; )
        (newChildLanes |= child.lanes | child.childLanes),
          (subtreeFlags |= child.subtreeFlags & 14680064),
          (subtreeFlags |= child.flags & 14680064),
          (child.return = completedWork),
          (child = child.sibling);
    else
      for (child = completedWork.child; null !== child; )
        (newChildLanes |= child.lanes | child.childLanes),
          (subtreeFlags |= child.subtreeFlags),
          (subtreeFlags |= child.flags),
          (child.return = completedWork),
          (child = child.sibling);
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress, renderLanes) {
    var newProps = workInProgress.pendingProps;
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return bubbleProperties(workInProgress), null;
      case 1:
        return (
          isContextProvider(workInProgress.type) &&
            (pop(didPerformWorkStackCursor), pop(contextStackCursor$1)),
          bubbleProperties(workInProgress),
          null
        );
      case 3:
        newProps = workInProgress.stateNode;
        popHostContainer();
        pop(didPerformWorkStackCursor);
        pop(contextStackCursor$1);
        resetWorkInProgressVersions();
        newProps.pendingContext &&
          ((newProps.context = newProps.pendingContext),
          (newProps.pendingContext = null));
        if (null === current || null === current.child)
          popHydrationState(workInProgress)
            ? (workInProgress.flags |= 4)
            : null === current ||
              (current.memoizedState.isDehydrated &&
                0 === (workInProgress.flags & 256)) ||
              ((workInProgress.flags |= 1024),
              null !== hydrationErrors &&
                (queueRecoverableErrors(hydrationErrors),
                (hydrationErrors = null)));
        updateHostContainer(current, workInProgress);
        bubbleProperties(workInProgress);
        return null;
      case 5:
        popHostContext(workInProgress);
        var rootContainerInstance = requiredContext(
          rootInstanceStackCursor.current
        );
        renderLanes = workInProgress.type;
        if (null !== current && null != workInProgress.stateNode)
          updateHostComponent(
            current,
            workInProgress,
            renderLanes,
            newProps,
            rootContainerInstance
          ),
            current.ref !== workInProgress.ref &&
              ((workInProgress.flags |= 512),
              (workInProgress.flags |= 2097152));
        else {
          if (!newProps) {
            if (null === workInProgress.stateNode)
              throw Error(
                "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
              );
            bubbleProperties(workInProgress);
            return null;
          }
          current = requiredContext(contextStackCursor.current);
          if (popHydrationState(workInProgress)) {
            newProps = workInProgress.stateNode;
            current = workInProgress.type;
            renderLanes = workInProgress.memoizedProps;
            newProps[internalInstanceKey] = workInProgress;
            newProps[internalPropsKey] = renderLanes;
            var isConcurrentMode = 0 !== (workInProgress.mode & 1);
            switch (current) {
              case "dialog":
                listenToNonDelegatedEvent("cancel", newProps);
                listenToNonDelegatedEvent("close", newProps);
                break;
              case "iframe":
              case "object":
              case "embed":
                listenToNonDelegatedEvent("load", newProps);
                break;
              case "video":
              case "audio":
                for (
                  rootContainerInstance = 0;
                  rootContainerInstance < mediaEventTypes.length;
                  rootContainerInstance++
                )
                  listenToNonDelegatedEvent(
                    mediaEventTypes[rootContainerInstance],
                    newProps
                  );
                break;
              case "source":
                listenToNonDelegatedEvent("error", newProps);
                break;
              case "img":
              case "image":
              case "link":
                listenToNonDelegatedEvent("error", newProps);
                listenToNonDelegatedEvent("load", newProps);
                break;
              case "details":
                listenToNonDelegatedEvent("toggle", newProps);
                break;
              case "input":
                initWrapperState$2(newProps, renderLanes);
                listenToNonDelegatedEvent("invalid", newProps);
                break;
              case "select":
                newProps._wrapperState = {
                  wasMultiple: !!renderLanes.multiple
                };
                listenToNonDelegatedEvent("invalid", newProps);
                break;
              case "textarea":
                initWrapperState(newProps, renderLanes),
                  listenToNonDelegatedEvent("invalid", newProps);
            }
            assertValidProps(current, renderLanes);
            rootContainerInstance = null;
            for (var propKey in renderLanes)
              if (renderLanes.hasOwnProperty(propKey)) {
                var nextProp$jscomp$0 = renderLanes[propKey];
                "children" === propKey
                  ? "string" === typeof nextProp$jscomp$0
                    ? newProps.textContent !== nextProp$jscomp$0 &&
                      (!0 !== renderLanes.suppressHydrationWarning &&
                        checkForUnmatchedText(
                          newProps.textContent,
                          nextProp$jscomp$0,
                          isConcurrentMode
                        ),
                      (rootContainerInstance = ["children", nextProp$jscomp$0]))
                    : "number" === typeof nextProp$jscomp$0 &&
                      newProps.textContent !== "" + nextProp$jscomp$0 &&
                      (!0 !== renderLanes.suppressHydrationWarning &&
                        checkForUnmatchedText(
                          newProps.textContent,
                          nextProp$jscomp$0,
                          isConcurrentMode
                        ),
                      (rootContainerInstance = [
                        "children",
                        "" + nextProp$jscomp$0
                      ]))
                  : registrationNameDependencies.hasOwnProperty(propKey) &&
                    null != nextProp$jscomp$0 &&
                    "onScroll" === propKey &&
                    listenToNonDelegatedEvent("scroll", newProps);
              }
            switch (current) {
              case "input":
                track(newProps);
                postMountWrapper$3(newProps, renderLanes, !0);
                break;
              case "textarea":
                track(newProps);
                postMountWrapper(newProps);
                break;
              case "select":
              case "option":
                break;
              default:
                "function" === typeof renderLanes.onClick &&
                  (newProps.onclick = noop);
            }
            newProps = rootContainerInstance;
            workInProgress.updateQueue = newProps;
            null !== newProps && (workInProgress.flags |= 4);
          } else {
            propKey =
              9 === rootContainerInstance.nodeType
                ? rootContainerInstance
                : rootContainerInstance.ownerDocument;
            "http://www.w3.org/1999/xhtml" === current &&
              (current = "http://www.w3.org/1999/xhtml");
            if ("http://www.w3.org/1999/xhtml" === current) {
              if ("script" === renderLanes) throw Error(renderLanes);
              "string" === typeof newProps.is
                ? (current = propKey.createElement(renderLanes, {
                    is: newProps.is
                  }))
                : ((current = propKey.createElement(renderLanes)),
                  "select" === renderLanes &&
                    ((propKey = current),
                    newProps.multiple
                      ? (propKey.multiple = !0)
                      : newProps.size && (propKey.size = newProps.size)));
            } else current = propKey.createElementNS(current, renderLanes);
            current[internalInstanceKey] = workInProgress;
            current[internalPropsKey] = newProps;
            appendAllChildren(current, workInProgress, !1, !1);
            workInProgress.stateNode = current;
            a: {
              propKey = isCustomComponent(renderLanes, newProps);
              let props;
              switch (renderLanes) {
                case "dialog":
                  listenToNonDelegatedEvent("cancel", current);
                  listenToNonDelegatedEvent("close", current);
                  props = newProps;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  listenToNonDelegatedEvent("load", current);
                  props = newProps;
                  break;
                case "video":
                case "audio":
                  for (
                    rootContainerInstance = 0;
                    rootContainerInstance < mediaEventTypes.length;
                    rootContainerInstance++
                  )
                    listenToNonDelegatedEvent(
                      mediaEventTypes[rootContainerInstance],
                      current
                    );
                  props = newProps;
                  break;
                case "source":
                  listenToNonDelegatedEvent("error", current);
                  props = newProps;
                  break;
                case "img":
                case "image":
                case "link":
                  listenToNonDelegatedEvent("error", current);
                  listenToNonDelegatedEvent("load", current);
                  props = newProps;
                  break;
                case "details":
                  listenToNonDelegatedEvent("toggle", current);
                  props = newProps;
                  break;
                case "input":
                  initWrapperState$2(current, newProps);
                  props = getHostProps$2(current, newProps);
                  listenToNonDelegatedEvent("invalid", current);
                  break;
                case "option":
                  props = newProps;
                  break;
                case "select":
                  current._wrapperState = { wasMultiple: !!newProps.multiple };
                  props = assign({}, newProps, { value: void 0 });
                  listenToNonDelegatedEvent("invalid", current);
                  break;
                case "textarea":
                  initWrapperState(current, newProps);
                  props = getHostProps(current, newProps);
                  listenToNonDelegatedEvent("invalid", current);
                  break;
                default:
                  props = newProps;
              }
              assertValidProps(renderLanes, props);
              rootContainerInstance = renderLanes;
              nextProp$jscomp$0 = props;
              for (isConcurrentMode in nextProp$jscomp$0) {
                if (!nextProp$jscomp$0.hasOwnProperty(isConcurrentMode))
                  continue;
                const nextProp = nextProp$jscomp$0[isConcurrentMode];
                "style" === isConcurrentMode
                  ? setValueForStyles(current, nextProp)
                  : "children" === isConcurrentMode
                    ? "string" === typeof nextProp
                      ? ("textarea" !== rootContainerInstance ||
                          "" !== nextProp) &&
                        setTextContent(current, nextProp)
                      : "number" === typeof nextProp &&
                        setTextContent(current, "" + nextProp)
                    : "suppressContentEditableWarning" !== isConcurrentMode &&
                      "suppressHydrationWarning" !== isConcurrentMode &&
                      "autoFocus" !== isConcurrentMode &&
                      (registrationNameDependencies.hasOwnProperty(
                        isConcurrentMode
                      )
                        ? null != nextProp &&
                          "onScroll" === isConcurrentMode &&
                          listenToNonDelegatedEvent("scroll", current)
                        : null != nextProp &&
                          setValueForProperty(
                            current,
                            isConcurrentMode,
                            nextProp,
                            propKey
                          ));
              }
              switch (renderLanes) {
                case "input":
                  track(current);
                  postMountWrapper$3(current, newProps, !1);
                  break;
                case "textarea":
                  track(current);
                  postMountWrapper(current);
                  break;
                case "option":
                  null != newProps.value &&
                    current.setAttribute(
                      "value",
                      "" + getToStringValue(newProps.value)
                    );
                  break;
                case "select":
                  current.multiple = !!newProps.multiple;
                  isConcurrentMode = newProps.value;
                  null != isConcurrentMode
                    ? updateOptions(
                        current,
                        !!newProps.multiple,
                        isConcurrentMode,
                        !1
                      )
                    : null != newProps.defaultValue &&
                      updateOptions(
                        current,
                        !!newProps.multiple,
                        newProps.defaultValue,
                        !0
                      );
                  break;
                default:
                  "function" === typeof props.onClick &&
                    (current.onclick = noop);
              }
              switch (renderLanes) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  newProps = !!newProps.autoFocus;
                  break a;
                case "img":
                  newProps = !0;
                  break a;
                default:
                  newProps = !1;
              }
            }
            newProps && (workInProgress.flags |= 4);
          }
          null !== workInProgress.ref &&
            ((workInProgress.flags |= 512), (workInProgress.flags |= 2097152));
        }
        bubbleProperties(workInProgress);
        return null;
      case 6:
        if (current && null != workInProgress.stateNode)
          updateHostText(
            current,
            workInProgress,
            current.memoizedProps,
            newProps
          );
        else {
          if ("string" !== typeof newProps && null === workInProgress.stateNode)
            throw Error(
              "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
            );
          current = requiredContext(rootInstanceStackCursor.current);
          requiredContext(contextStackCursor.current);
          if (popHydrationState(workInProgress)) {
            newProps = workInProgress.stateNode;
            current = workInProgress.memoizedProps;
            renderLanes = newProps;
            isConcurrentMode = current;
            renderLanes[internalInstanceKey] = workInProgress;
            0 !== (workInProgress.mode & 1);
            if ((renderLanes = renderLanes.nodeValue !== isConcurrentMode))
              if (
                ((isConcurrentMode = hydrationParentFiber),
                null !== isConcurrentMode)
              )
                switch (isConcurrentMode.tag) {
                  case 3:
                    checkForUnmatchedText(
                      newProps.nodeValue,
                      current,
                      0 !== (isConcurrentMode.mode & 1)
                    );
                    break;
                  case 5:
                    !0 !==
                      isConcurrentMode.memoizedProps.suppressHydrationWarning &&
                      checkForUnmatchedText(
                        newProps.nodeValue,
                        current,
                        0 !== (isConcurrentMode.mode & 1)
                      );
                }
            renderLanes && (workInProgress.flags |= 4);
          } else
            (newProps = (
              9 === current.nodeType ? current : current.ownerDocument
            ).createTextNode(newProps)),
              (newProps[internalInstanceKey] = workInProgress),
              (workInProgress.stateNode = newProps);
        }
        bubbleProperties(workInProgress);
        return null;
      case 13:
        pop(suspenseStackCursor);
        newProps = workInProgress.memoizedState;
        if (
          null === current ||
          (null !== current.memoizedState &&
            null !== current.memoizedState.dehydrated)
        ) {
          if (
            isHydrating &&
            null !== nextHydratableInstance &&
            0 !== (workInProgress.mode & 1) &&
            0 === (workInProgress.flags & 128)
          ) {
            for (isConcurrentMode = nextHydratableInstance; isConcurrentMode; )
              isConcurrentMode = getNextHydratable(
                isConcurrentMode.nextSibling
              );
            resetHydrationState();
            workInProgress.flags |= 98560;
            isConcurrentMode = !1;
          } else if (
            ((isConcurrentMode = popHydrationState(workInProgress)),
            null !== newProps && null !== newProps.dehydrated)
          ) {
            if (null === current) {
              if (!isConcurrentMode)
                throw Error(
                  "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
                );
              isConcurrentMode = workInProgress.memoizedState;
              isConcurrentMode =
                null !== isConcurrentMode ? isConcurrentMode.dehydrated : null;
              if (!isConcurrentMode)
                throw Error(
                  "Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue."
                );
              isConcurrentMode[internalInstanceKey] = workInProgress;
            } else
              resetHydrationState(),
                0 === (workInProgress.flags & 128) &&
                  (workInProgress.memoizedState = null),
                (workInProgress.flags |= 4);
            bubbleProperties(workInProgress);
            isConcurrentMode = !1;
          } else
            null !== hydrationErrors &&
              (queueRecoverableErrors(hydrationErrors),
              (hydrationErrors = null)),
              (isConcurrentMode = !0);
          if (!isConcurrentMode)
            return workInProgress.flags & 65536 ? workInProgress : null;
        }
        if (0 !== (workInProgress.flags & 128))
          return (workInProgress.lanes = renderLanes), workInProgress;
        newProps = null !== newProps;
        newProps !== (null !== current && null !== current.memoizedState) &&
          newProps &&
          ((workInProgress.child.flags |= 8192),
          0 !== (workInProgress.mode & 1) &&
            (null === current || 0 !== (suspenseStackCursor.current & 1)
              ? 0 === workInProgressRootExitStatus &&
                (workInProgressRootExitStatus = 3)
              : renderDidSuspendDelayIfPossible()));
        null !== workInProgress.updateQueue && (workInProgress.flags |= 4);
        bubbleProperties(workInProgress);
        return null;
      case 4:
        return (
          popHostContainer(),
          updateHostContainer(current, workInProgress),
          null === current &&
            listenToAllSupportedEvents(workInProgress.stateNode.containerInfo),
          bubbleProperties(workInProgress),
          null
        );
      case 10:
        return (
          popProvider(workInProgress.type._context),
          bubbleProperties(workInProgress),
          null
        );
      case 17:
        return (
          isContextProvider(workInProgress.type) &&
            (pop(didPerformWorkStackCursor), pop(contextStackCursor$1)),
          bubbleProperties(workInProgress),
          null
        );
      case 19:
        pop(suspenseStackCursor);
        isConcurrentMode = workInProgress.memoizedState;
        if (null === isConcurrentMode)
          return bubbleProperties(workInProgress), null;
        newProps = 0 !== (workInProgress.flags & 128);
        propKey = isConcurrentMode.rendering;
        if (null === propKey)
          if (newProps) cutOffTailIfNeeded(isConcurrentMode, !1);
          else {
            if (
              0 !== workInProgressRootExitStatus ||
              (null !== current && 0 !== (current.flags & 128))
            )
              for (current = workInProgress.child; null !== current; ) {
                propKey = findFirstSuspended(current);
                if (null !== propKey) {
                  workInProgress.flags |= 128;
                  cutOffTailIfNeeded(isConcurrentMode, !1);
                  newProps = propKey.updateQueue;
                  null !== newProps &&
                    ((workInProgress.updateQueue = newProps),
                    (workInProgress.flags |= 4));
                  workInProgress.subtreeFlags = 0;
                  newProps = renderLanes;
                  for (
                    renderLanes = workInProgress.child;
                    null !== renderLanes;

                  )
                    (current = renderLanes),
                      (isConcurrentMode = newProps),
                      (current.flags &= 14680066),
                      (propKey = current.alternate),
                      null === propKey
                        ? ((current.childLanes = 0),
                          (current.lanes = isConcurrentMode),
                          (current.child = null),
                          (current.subtreeFlags = 0),
                          (current.memoizedProps = null),
                          (current.memoizedState = null),
                          (current.updateQueue = null),
                          (current.dependencies = null),
                          (current.stateNode = null))
                        : ((current.childLanes = propKey.childLanes),
                          (current.lanes = propKey.lanes),
                          (current.child = propKey.child),
                          (current.subtreeFlags = 0),
                          (current.deletions = null),
                          (current.memoizedProps = propKey.memoizedProps),
                          (current.memoizedState = propKey.memoizedState),
                          (current.updateQueue = propKey.updateQueue),
                          (current.type = propKey.type),
                          (isConcurrentMode = propKey.dependencies),
                          (current.dependencies =
                            null === isConcurrentMode
                              ? null
                              : {
                                  lanes: isConcurrentMode.lanes,
                                  firstContext: isConcurrentMode.firstContext
                                })),
                      (renderLanes = renderLanes.sibling);
                  push(
                    suspenseStackCursor,
                    (suspenseStackCursor.current & 1) | 2
                  );
                  return workInProgress.child;
                }
                current = current.sibling;
              }
            null !== isConcurrentMode.tail &&
              now() > workInProgressRootRenderTargetTime &&
              ((workInProgress.flags |= 128),
              (newProps = !0),
              cutOffTailIfNeeded(isConcurrentMode, !1),
              (workInProgress.lanes = 4194304));
          }
        else {
          if (!newProps)
            if (((current = findFirstSuspended(propKey)), null !== current)) {
              if (
                ((workInProgress.flags |= 128),
                (newProps = !0),
                (current = current.updateQueue),
                null !== current &&
                  ((workInProgress.updateQueue = current),
                  (workInProgress.flags |= 4)),
                cutOffTailIfNeeded(isConcurrentMode, !0),
                null === isConcurrentMode.tail &&
                  "hidden" === isConcurrentMode.tailMode &&
                  !propKey.alternate &&
                  !isHydrating)
              )
                return bubbleProperties(workInProgress), null;
            } else
              2 * now() - isConcurrentMode.renderingStartTime >
                workInProgressRootRenderTargetTime &&
                1073741824 !== renderLanes &&
                ((workInProgress.flags |= 128),
                (newProps = !0),
                cutOffTailIfNeeded(isConcurrentMode, !1),
                (workInProgress.lanes = 4194304));
          isConcurrentMode.isBackwards
            ? ((propKey.sibling = workInProgress.child),
              (workInProgress.child = propKey))
            : ((current = isConcurrentMode.last),
              null !== current
                ? (current.sibling = propKey)
                : (workInProgress.child = propKey),
              (isConcurrentMode.last = propKey));
        }
        if (null !== isConcurrentMode.tail)
          return (
            (workInProgress = isConcurrentMode.tail),
            (isConcurrentMode.rendering = workInProgress),
            (isConcurrentMode.tail = workInProgress.sibling),
            (isConcurrentMode.renderingStartTime = now()),
            (workInProgress.sibling = null),
            (current = suspenseStackCursor.current),
            push(
              suspenseStackCursor,
              newProps ? (current & 1) | 2 : current & 1
            ),
            workInProgress
          );
        bubbleProperties(workInProgress);
        return null;
      case 22:
      case 23:
        return (
          (subtreeRenderLanes = subtreeRenderLanesCursor.current),
          pop(subtreeRenderLanesCursor),
          (newProps = null !== workInProgress.memoizedState),
          null !== current &&
            (null !== current.memoizedState) !== newProps &&
            (workInProgress.flags |= 8192),
          newProps && 0 !== (workInProgress.mode & 1)
            ? 0 !== (subtreeRenderLanes & 1073741824) &&
              (bubbleProperties(workInProgress),
              workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192))
            : bubbleProperties(workInProgress),
          null
        );
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(
      `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
        "React. Please file an issue."
    );
  }
  function unwindWork(current, workInProgress, renderLanes) {
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
      case 1:
        return (
          isContextProvider(workInProgress.type) &&
            (pop(didPerformWorkStackCursor), pop(contextStackCursor$1)),
          (current = workInProgress.flags),
          current & 65536
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 3:
        return (
          workInProgress.stateNode,
          popHostContainer(),
          pop(didPerformWorkStackCursor),
          pop(contextStackCursor$1),
          resetWorkInProgressVersions(),
          (current = workInProgress.flags),
          0 !== (current & 65536) && 0 === (current & 128)
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 5:
        return popHostContext(workInProgress), null;
      case 13:
        pop(suspenseStackCursor);
        current = workInProgress.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress.alternate)
            throw Error(
              "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue."
            );
          resetHydrationState();
        }
        current = workInProgress.flags;
        return current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null;
      case 19:
        return pop(suspenseStackCursor), null;
      case 4:
        return popHostContainer(), null;
      case 10:
        return popProvider(workInProgress.type._context), null;
      case 22:
      case 23:
        return (
          (subtreeRenderLanes = subtreeRenderLanesCursor.current),
          pop(subtreeRenderLanesCursor),
          null
        );
      case 24:
        return null;
      default:
        return null;
    }
  }
  function safelyDetachRef(current, nearestMountedAncestor) {
    const ref = current.ref;
    if (null !== ref)
      if ("function" === typeof ref)
        try {
          ref(null);
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        }
      else ref.current = null;
  }
  function safelyCallDestroy(current, nearestMountedAncestor, destroy) {
    try {
      destroy();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function commitBeforeMutationEffects(root, firstChild) {
    eventsEnabled = _enabled;
    root = getActiveElementDeep();
    if (hasSelectionCapabilities(root)) {
      if ("selectionStart" in root)
        var JSCompiler_temp = {
          start: root.selectionStart,
          end: root.selectionEnd
        };
      else
        a: if (
          (({ ownerDocument: JSCompiler_temp } = root),
          (JSCompiler_temp =
            (JSCompiler_temp && JSCompiler_temp.defaultView) || window),
          (JSCompiler_temp =
            JSCompiler_temp.getSelection && JSCompiler_temp.getSelection()) &&
            0 !== JSCompiler_temp.rangeCount)
        ) {
          var { anchorNode, anchorOffset, focusNode, focusOffset } =
            JSCompiler_temp;
          try {
            anchorNode.nodeType, focusNode.nodeType;
          } catch (e) {
            JSCompiler_temp = null;
            break a;
          }
          JSCompiler_temp = 0;
          let start = -1,
            end = -1,
            indexWithinAnchor = 0,
            indexWithinFocus = 0,
            node = root,
            parentNode = null;
          b: for (;;) {
            let next;
            for (;;) {
              node !== anchorNode ||
                (0 !== anchorOffset && 3 !== node.nodeType) ||
                (start = JSCompiler_temp + anchorOffset);
              node !== focusNode ||
                (0 !== focusOffset && 3 !== node.nodeType) ||
                (end = JSCompiler_temp + focusOffset);
              3 === node.nodeType && (JSCompiler_temp += node.nodeValue.length);
              if (null === (next = node.firstChild)) break;
              parentNode = node;
              node = next;
            }
            for (;;) {
              if (node === root) break b;
              parentNode === anchorNode &&
                ++indexWithinAnchor === anchorOffset &&
                (start = JSCompiler_temp);
              parentNode === focusNode &&
                ++indexWithinFocus === focusOffset &&
                (end = JSCompiler_temp);
              if (null !== (next = node.nextSibling)) break;
              node = parentNode;
              parentNode = node.parentNode;
            }
            node = next;
          }
          JSCompiler_temp = -1 === start || -1 === end ? null : { start, end };
        } else JSCompiler_temp = null;
      JSCompiler_temp = JSCompiler_temp || { start: 0, end: 0 };
    } else JSCompiler_temp = null;
    selectionInformation = {
      focusedElem: root,
      selectionRange: JSCompiler_temp
    };
    _enabled = !1;
    for (nextEffect = firstChild; null !== nextEffect; )
      if (
        ((firstChild = nextEffect),
        (root = firstChild.child),
        0 !== (firstChild.subtreeFlags & 1028) && null !== root)
      )
        (root.return = firstChild), (nextEffect = root);
      else
        for (; null !== nextEffect; ) {
          firstChild = nextEffect;
          try {
            const current = firstChild.alternate;
            if (0 !== (firstChild.flags & 1024))
              switch (firstChild.tag) {
                case 0:
                case 11:
                case 15:
                  break;
                case 1:
                  if (null !== current) {
                    const prevProps = current.memoizedProps,
                      prevState = current.memoizedState,
                      instance = firstChild.stateNode,
                      snapshot = instance.getSnapshotBeforeUpdate(
                        firstChild.elementType === firstChild.type
                          ? prevProps
                          : resolveDefaultProps(firstChild.type, prevProps),
                        prevState
                      );
                    instance.__reactInternalSnapshotBeforeUpdate = snapshot;
                  }
                  break;
                case 3:
                  var container = firstChild.stateNode.containerInfo;
                  1 === container.nodeType
                    ? (container.textContent = "")
                    : 9 === container.nodeType &&
                      container.documentElement &&
                      container.removeChild(container.documentElement);
                  break;
                case 5:
                case 6:
                case 4:
                case 17:
                  break;
                default:
                  throw Error(
                    "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue."
                  );
              }
          } catch (error) {
            captureCommitPhaseError(firstChild, firstChild.return, error);
          }
          root = firstChild.sibling;
          if (null !== root) {
            root.return = firstChild.return;
            nextEffect = root;
            break;
          }
          nextEffect = firstChild.return;
        }
    container = shouldFireAfterActiveInstanceBlur;
    shouldFireAfterActiveInstanceBlur = !1;
    return container;
  }
  function commitHookEffectListUnmount(
    flags,
    finishedWork,
    nearestMountedAncestor
  ) {
    var updateQueue = finishedWork.updateQueue;
    updateQueue = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== updateQueue) {
      let effect = (updateQueue = updateQueue.next);
      do {
        if ((effect.tag & flags) === flags) {
          const destroy = effect.destroy;
          effect.destroy = void 0;
          void 0 !== destroy &&
            safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);
        }
        effect = effect.next;
      } while (effect !== updateQueue);
    }
  }
  function commitHookEffectListMount(flags, finishedWork) {
    finishedWork = finishedWork.updateQueue;
    finishedWork = null !== finishedWork ? finishedWork.lastEffect : null;
    if (null !== finishedWork) {
      let effect = (finishedWork = finishedWork.next);
      do {
        if ((effect.tag & flags) === flags) {
          const create = effect.create;
          effect.destroy = create();
        }
        effect = effect.next;
      } while (effect !== finishedWork);
    }
  }
  function commitAttachRef(finishedWork) {
    const ref = finishedWork.ref;
    if (null !== ref) {
      const instance = finishedWork.stateNode;
      switch (finishedWork.tag) {
        case 5:
          finishedWork = instance;
          break;
        default:
          finishedWork = instance;
      }
      "function" === typeof ref
        ? ref(finishedWork)
        : (ref.current = finishedWork);
    }
  }
  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;
    null !== alternate &&
      ((fiber.alternate = null), detachFiberAfterEffects(alternate));
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    5 === fiber.tag &&
      ((alternate = fiber.stateNode),
      null !== alternate &&
        (delete alternate[internalInstanceKey],
        delete alternate[internalPropsKey],
        delete alternate[internalEventHandlersKey],
        delete alternate[internalEventHandlerListenersKey],
        delete alternate[internalEventHandlesSetKey]));
    fiber.stateNode = null;
    fiber.return = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
  }
  function isHostParent(fiber) {
    return 5 === fiber.tag || 3 === fiber.tag || 4 === fiber.tag;
  }
  function getHostSibling(fiber) {
    a: for (;;) {
      for (; null === fiber.sibling; ) {
        if (null === fiber.return || isHostParent(fiber.return)) return null;
        fiber = fiber.return;
      }
      fiber.sibling.return = fiber.return;
      for (
        fiber = fiber.sibling;
        5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag;

      ) {
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else (fiber.child.return = fiber), (fiber = fiber.child);
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    const { tag } = node;
    if (5 === tag || 6 === tag)
      (node = node.stateNode),
        before
          ? 8 === parent.nodeType
            ? parent.parentNode.insertBefore(node, before)
            : parent.insertBefore(node, before)
          : (8 === parent.nodeType
              ? ((before = parent.parentNode),
                before.insertBefore(node, parent))
              : ((before = parent), before.appendChild(node)),
            (parent = parent._reactRootContainer),
            (null !== parent && void 0 !== parent) ||
              null !== before.onclick ||
              (before.onclick = noop));
    else if (4 !== tag && ((node = node.child), null !== node))
      for (
        insertOrAppendPlacementNodeIntoContainer(node, before, parent),
          node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNodeIntoContainer(node, before, parent),
          (node = node.sibling);
  }
  function insertOrAppendPlacementNode(node, before, parent) {
    const { tag } = node;
    if (5 === tag || 6 === tag)
      (node = node.stateNode),
        before ? parent.insertBefore(node, before) : parent.appendChild(node);
    else if (4 !== tag && ((node = node.child), null !== node))
      for (
        insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNode(node, before, parent),
          (node = node.sibling);
  }
  function recursivelyTraverseDeletionEffects(
    finishedRoot,
    nearestMountedAncestor,
    parent
  ) {
    for (parent = parent.child; null !== parent; )
      commitDeletionEffectsOnFiber(
        finishedRoot,
        nearestMountedAncestor,
        parent
      ),
        (parent = parent.sibling);
  }
  function commitDeletionEffectsOnFiber(
    finishedRoot,
    nearestMountedAncestor,
    deletedFiber
  ) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
      try {
        injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
      } catch (err) {}
    switch (deletedFiber.tag) {
      case 5:
        offscreenSubtreeWasHidden ||
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
      case 6:
        var prevHostParent = hostParent,
          prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        null !== hostParent &&
          (hostParentIsContainer
            ? ((finishedRoot = hostParent),
              (deletedFiber = deletedFiber.stateNode),
              8 === finishedRoot.nodeType
                ? finishedRoot.parentNode.removeChild(deletedFiber)
                : finishedRoot.removeChild(deletedFiber))
            : hostParent.removeChild(deletedFiber.stateNode));
        break;
      case 18:
        null !== hostParent &&
          (hostParentIsContainer
            ? ((finishedRoot = hostParent),
              (deletedFiber = deletedFiber.stateNode),
              8 === finishedRoot.nodeType
                ? clearSuspenseBoundary(finishedRoot.parentNode, deletedFiber)
                : 1 === finishedRoot.nodeType &&
                  clearSuspenseBoundary(finishedRoot, deletedFiber),
              retryIfBlockedOn(finishedRoot))
            : clearSuspenseBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = deletedFiber.stateNode.containerInfo;
        hostParentIsContainer = !0;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (
          !offscreenSubtreeWasHidden &&
          ((prevHostParent = deletedFiber.updateQueue),
          null !== prevHostParent &&
            ((prevHostParent = prevHostParent.lastEffect),
            null !== prevHostParent))
        ) {
          prevHostParentIsContainer = prevHostParent = prevHostParent.next;
          do {
            const { destroy, tag } = prevHostParentIsContainer;
            void 0 !== destroy &&
              (0 !== (tag & 2)
                ? safelyCallDestroy(
                    deletedFiber,
                    nearestMountedAncestor,
                    destroy
                  )
                : 0 !== (tag & 4) &&
                  safelyCallDestroy(
                    deletedFiber,
                    nearestMountedAncestor,
                    destroy
                  ));
            prevHostParentIsContainer = prevHostParentIsContainer.next;
          } while (prevHostParentIsContainer !== prevHostParent);
        }
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        if (
          !offscreenSubtreeWasHidden &&
          (safelyDetachRef(deletedFiber, nearestMountedAncestor),
          (prevHostParent = deletedFiber.stateNode),
          "function" === typeof prevHostParent.componentWillUnmount)
        )
          try {
            (prevHostParent.props = deletedFiber.memoizedProps),
              (prevHostParent.state = deletedFiber.memoizedState),
              prevHostParent.componentWillUnmount();
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        deletedFiber.mode & 1
          ? ((offscreenSubtreeWasHidden =
              (prevHostParent = offscreenSubtreeWasHidden) ||
              null !== deletedFiber.memoizedState),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ),
            (offscreenSubtreeWasHidden = prevHostParent))
          : recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            );
        break;
      default:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
    }
  }
  function attachSuspenseRetryListeners(finishedWork) {
    const wakeables = finishedWork.updateQueue;
    if (null !== wakeables) {
      finishedWork.updateQueue = null;
      let retryCache = finishedWork.stateNode;
      null === retryCache &&
        (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
      wakeables.forEach((wakeable) => {
        const retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
        retryCache.has(wakeable) ||
          (retryCache.add(wakeable), wakeable.then(retry, retry));
      });
    }
  }
  function recursivelyTraverseMutationEffects(
    root$jscomp$0,
    parentFiber,
    lanes
  ) {
    lanes = parentFiber.deletions;
    if (null !== lanes)
      for (let i = 0; i < lanes.length; i++) {
        const childToDelete = lanes[i];
        try {
          var root = root$jscomp$0,
            returnFiber = parentFiber;
          let parent = returnFiber;
          a: for (; null !== parent; ) {
            switch (parent.tag) {
              case 5:
                hostParent = parent.stateNode;
                hostParentIsContainer = !1;
                break a;
              case 3:
                hostParent = parent.stateNode.containerInfo;
                hostParentIsContainer = !0;
                break a;
              case 4:
                hostParent = parent.stateNode.containerInfo;
                hostParentIsContainer = !0;
                break a;
            }
            parent = parent.return;
          }
          if (null === hostParent)
            throw Error(
              "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue."
            );
          commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
          hostParent = null;
          hostParentIsContainer = !1;
          const alternate = childToDelete.alternate;
          null !== alternate && (alternate.return = null);
          childToDelete.return = null;
        } catch (error) {
          captureCommitPhaseError(childToDelete, parentFiber, error);
        }
      }
    if (parentFiber.subtreeFlags & 12854)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitMutationEffectsOnFiber(parentFiber, root$jscomp$0),
          (parentFiber = parentFiber.sibling);
  }
  function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
    var current = finishedWork.alternate;
    lanes = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (lanes & 4) {
          try {
            commitHookEffectListUnmount(3, finishedWork, finishedWork.return),
              commitHookEffectListMount(3, finishedWork);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
          try {
            commitHookEffectListUnmount(5, finishedWork, finishedWork.return);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 1:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        lanes & 512 &&
          null !== current &&
          safelyDetachRef(current, current.return);
        break;
      case 5:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        lanes & 512 &&
          null !== current &&
          safelyDetachRef(current, current.return);
        if (finishedWork.flags & 32) {
          var instance = finishedWork.stateNode;
          try {
            setTextContent(instance, "");
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        if (
          lanes & 4 &&
          ((instance = finishedWork.stateNode), null != instance)
        ) {
          var newProps = finishedWork.memoizedProps,
            oldProps = null !== current ? current.memoizedProps : newProps,
            type = finishedWork.type,
            updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;
          if (null !== updatePayload)
            try {
              "input" === type &&
                "radio" === newProps.type &&
                null != newProps.name &&
                updateChecked(instance, newProps);
              isCustomComponent(type, oldProps);
              var isCustomComponentTag = isCustomComponent(type, newProps);
              for (
                oldProps = 0;
                oldProps < updatePayload.length;
                oldProps += 2
              ) {
                var propKey = updatePayload[oldProps],
                  propValue = updatePayload[oldProps + 1];
                "style" === propKey
                  ? setValueForStyles(instance, propValue)
                  : "children" === propKey
                    ? setTextContent(instance, propValue)
                    : setValueForProperty(
                        instance,
                        propKey,
                        propValue,
                        isCustomComponentTag
                      );
              }
              switch (type) {
                case "input":
                  updateWrapper$1(instance, newProps);
                  break;
                case "textarea":
                  updateWrapper(instance, newProps);
                  break;
                case "select":
                  var wasMultiple = instance._wrapperState.wasMultiple;
                  instance._wrapperState.wasMultiple = !!newProps.multiple;
                  var value = newProps.value;
                  null != value
                    ? updateOptions(instance, !!newProps.multiple, value, !1)
                    : wasMultiple !== !!newProps.multiple &&
                      (null != newProps.defaultValue
                        ? updateOptions(
                            instance,
                            !!newProps.multiple,
                            newProps.defaultValue,
                            !0
                          )
                        : updateOptions(
                            instance,
                            !!newProps.multiple,
                            newProps.multiple ? [] : "",
                            !1
                          ));
              }
              instance[internalPropsKey] = newProps;
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
        }
        break;
      case 6:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (lanes & 4) {
          if (null === finishedWork.stateNode)
            throw Error(
              "This should have a text node initialized. This error is likely caused by a bug in React. Please file an issue."
            );
          instance = finishedWork.stateNode;
          newProps = finishedWork.memoizedProps;
          try {
            instance.nodeValue = newProps;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 3:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (lanes & 4 && null !== current && current.memoizedState.isDehydrated)
          try {
            retryIfBlockedOn(root.containerInfo);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        break;
      case 4:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        break;
      case 13:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        instance = finishedWork.child;
        instance.flags & 8192 &&
          ((newProps = null !== instance.memoizedState),
          (instance.stateNode.isHidden = newProps),
          !newProps ||
            (null !== instance.alternate &&
              null !== instance.alternate.memoizedState) ||
            (globalMostRecentFallbackTime = now()));
        if (lanes & 4) {
          try {
            finishedWork.memoizedState;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
          attachSuspenseRetryListeners(finishedWork);
        }
        break;
      case 22:
        propKey = null !== current && null !== current.memoizedState;
        finishedWork.mode & 1
          ? ((offscreenSubtreeWasHidden =
              (isCustomComponentTag = offscreenSubtreeWasHidden) || propKey),
            recursivelyTraverseMutationEffects(root, finishedWork),
            (offscreenSubtreeWasHidden = isCustomComponentTag))
          : recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (lanes & 8192) {
          isCustomComponentTag = null !== finishedWork.memoizedState;
          if (
            (finishedWork.stateNode.isHidden = isCustomComponentTag) &&
            !propKey &&
            0 !== (finishedWork.mode & 1)
          )
            for (
              nextEffect = finishedWork, lanes = finishedWork.child;
              null !== lanes;

            ) {
              for (propKey = nextEffect = lanes; null !== nextEffect; ) {
                root = nextEffect;
                current = root.child;
                switch (root.tag) {
                  case 0:
                  case 11:
                  case 14:
                  case 15:
                    commitHookEffectListUnmount(4, root, root.return);
                    break;
                  case 1:
                    safelyDetachRef(root, root.return);
                    var instance$jscomp$0 = root.stateNode;
                    if (
                      "function" ===
                      typeof instance$jscomp$0.componentWillUnmount
                    ) {
                      propValue = root;
                      wasMultiple = root.return;
                      try {
                        (value = propValue),
                          (instance$jscomp$0.props = value.memoizedProps),
                          (instance$jscomp$0.state = value.memoizedState),
                          instance$jscomp$0.componentWillUnmount();
                      } catch (error) {
                        captureCommitPhaseError(propValue, wasMultiple, error);
                      }
                    }
                    break;
                  case 5:
                    safelyDetachRef(root, root.return);
                    break;
                  case 22:
                    if (null !== root.memoizedState) {
                      disappearLayoutEffects_complete(propKey);
                      continue;
                    }
                }
                null !== current
                  ? ((current.return = root), (nextEffect = current))
                  : disappearLayoutEffects_complete(propKey);
              }
              lanes = lanes.sibling;
            }
          a: for (propKey = null, propValue = finishedWork; ; ) {
            if (5 === propValue.tag) {
              if (null === propKey) {
                propKey = propValue;
                try {
                  (newProps = propValue.stateNode),
                    isCustomComponentTag
                      ? ((type = newProps.style),
                        "function" === typeof type.setProperty
                          ? type.setProperty("display", "none", "important")
                          : (type.display = "none"))
                      : ((instance = propValue.stateNode),
                        (updatePayload = propValue.memoizedProps.style),
                        (oldProps =
                          void 0 !== updatePayload &&
                          null !== updatePayload &&
                          updatePayload.hasOwnProperty("display")
                            ? updatePayload.display
                            : null),
                        (instance.style.display = dangerousStyleValue(
                          "display",
                          oldProps
                        )));
                } catch (error) {
                  captureCommitPhaseError(
                    finishedWork,
                    finishedWork.return,
                    error
                  );
                }
              }
            } else if (6 === propValue.tag) {
              if (null === propKey)
                try {
                  propValue.stateNode.nodeValue = isCustomComponentTag
                    ? ""
                    : propValue.memoizedProps;
                } catch (error) {
                  captureCommitPhaseError(
                    finishedWork,
                    finishedWork.return,
                    error
                  );
                }
            } else if (
              ((22 !== propValue.tag && 23 !== propValue.tag) ||
                null === propValue.memoizedState ||
                propValue === finishedWork) &&
              null !== propValue.child
            ) {
              propValue.child.return = propValue;
              propValue = propValue.child;
              continue;
            }
            if (propValue === finishedWork) break a;
            for (; null === propValue.sibling; ) {
              if (
                null === propValue.return ||
                propValue.return === finishedWork
              )
                break a;
              propKey === propValue && (propKey = null);
              propValue = propValue.return;
            }
            propKey === propValue && (propKey = null);
            propValue.sibling.return = propValue.return;
            propValue = propValue.sibling;
          }
        }
        break;
      case 19:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        lanes & 4 && attachSuspenseRetryListeners(finishedWork);
        break;
      case 21:
        break;
      default:
        recursivelyTraverseMutationEffects(root, finishedWork),
          commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    const flags = finishedWork.flags;
    if (flags & 2) {
      try {
        a: {
          let parent = finishedWork.return;
          for (; null !== parent; ) {
            if (isHostParent(parent)) {
              var JSCompiler_inline_result = parent;
              break a;
            }
            parent = parent.return;
          }
          throw Error(
            "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue."
          );
        }
        switch (JSCompiler_inline_result.tag) {
          case 5:
            const parent = JSCompiler_inline_result.stateNode;
            JSCompiler_inline_result.flags & 32 &&
              (setTextContent(parent, ""),
              (JSCompiler_inline_result.flags &= -33));
            const before = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, before, parent);
            break;
          case 3:
          case 4:
            const parent$jscomp$0 =
                JSCompiler_inline_result.stateNode.containerInfo,
              before$jscomp$0 = getHostSibling(finishedWork);
            insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              before$jscomp$0,
              parent$jscomp$0
            );
            break;
          default:
            throw Error(
              "Invalid host parent fiber. This error is likely caused by a bug in React. Please file an issue."
            );
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      finishedWork.flags &= -3;
    }
    flags & 4096 && (finishedWork.flags &= -4097);
  }
  function commitLayoutEffects(finishedWork, root, committedLanes) {
    nextEffect = finishedWork;
    commitLayoutEffects_begin(finishedWork, root, committedLanes);
  }
  function commitLayoutEffects_begin(subtreeRoot, root, committedLanes) {
    const isModernRoot = 0 !== (subtreeRoot.mode & 1);
    for (; null !== nextEffect; ) {
      const fiber = nextEffect;
      var firstChild = fiber.child;
      if (22 === fiber.tag && isModernRoot) {
        var newOffscreenSubtreeIsHidden =
          null !== fiber.memoizedState || offscreenSubtreeIsHidden;
        if (!newOffscreenSubtreeIsHidden) {
          var current = fiber.alternate,
            newOffscreenSubtreeWasHidden =
              (null !== current && null !== current.memoizedState) ||
              offscreenSubtreeWasHidden;
          current = offscreenSubtreeIsHidden;
          const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = newOffscreenSubtreeIsHidden;
          if (
            (offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden) &&
            !prevOffscreenSubtreeWasHidden
          )
            for (nextEffect = fiber; null !== nextEffect; )
              (newOffscreenSubtreeIsHidden = nextEffect),
                (newOffscreenSubtreeWasHidden =
                  newOffscreenSubtreeIsHidden.child),
                22 === newOffscreenSubtreeIsHidden.tag &&
                null !== newOffscreenSubtreeIsHidden.memoizedState
                  ? reappearLayoutEffects_complete(fiber)
                  : null !== newOffscreenSubtreeWasHidden
                    ? ((newOffscreenSubtreeWasHidden.return =
                        newOffscreenSubtreeIsHidden),
                      (nextEffect = newOffscreenSubtreeWasHidden))
                    : reappearLayoutEffects_complete(fiber);
          for (; null !== firstChild; )
            (nextEffect = firstChild),
              commitLayoutEffects_begin(firstChild, root, committedLanes),
              (firstChild = firstChild.sibling);
          nextEffect = fiber;
          offscreenSubtreeIsHidden = current;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
        commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
      } else
        0 !== (fiber.subtreeFlags & 8772) && null !== firstChild
          ? ((firstChild.return = fiber), (nextEffect = firstChild))
          : commitLayoutMountEffects_complete(
              subtreeRoot,
              root,
              committedLanes
            );
    }
  }
  function commitLayoutMountEffects_complete(
    subtreeRoot,
    root,
    committedLanes
  ) {
    for (; null !== nextEffect; ) {
      root = nextEffect;
      if (0 !== (root.flags & 8772)) {
        committedLanes = root.alternate;
        try {
          if (0 !== (root.flags & 8772))
            switch (root.tag) {
              case 0:
              case 11:
              case 15:
                offscreenSubtreeWasHidden || commitHookEffectListMount(5, root);
                break;
              case 1:
                const instance = root.stateNode;
                if (root.flags & 4 && !offscreenSubtreeWasHidden)
                  if (null === committedLanes) instance.componentDidMount();
                  else {
                    const prevProps =
                      root.elementType === root.type
                        ? committedLanes.memoizedProps
                        : resolveDefaultProps(
                            root.type,
                            committedLanes.memoizedProps
                          );
                    instance.componentDidUpdate(
                      prevProps,
                      committedLanes.memoizedState,
                      instance.__reactInternalSnapshotBeforeUpdate
                    );
                  }
                const updateQueue = root.updateQueue;
                null !== updateQueue &&
                  commitUpdateQueue(root, updateQueue, instance);
                break;
              case 3:
                const updateQueue$jscomp$0 = root.updateQueue;
                if (null !== updateQueue$jscomp$0) {
                  committedLanes = null;
                  if (null !== root.child)
                    switch (root.child.tag) {
                      case 5:
                        committedLanes = root.child.stateNode;
                        break;
                      case 1:
                        committedLanes = root.child.stateNode;
                    }
                  commitUpdateQueue(root, updateQueue$jscomp$0, committedLanes);
                }
                break;
              case 5:
                const instance$jscomp$0 = root.stateNode;
                if (null === committedLanes && root.flags & 4) {
                  committedLanes = instance$jscomp$0;
                  var newProps = root.memoizedProps;
                  switch (root.type) {
                    case "button":
                    case "input":
                    case "select":
                    case "textarea":
                      newProps.autoFocus && committedLanes.focus();
                      break;
                    case "img":
                      newProps.src && (committedLanes.src = newProps.src);
                  }
                }
                break;
              case 6:
                break;
              case 4:
                break;
              case 12:
                break;
              case 13:
                if (null === root.memoizedState) {
                  const current = root.alternate;
                  if (null !== current) {
                    const prevState = current.memoizedState;
                    if (null !== prevState) {
                      const suspenseInstance = prevState.dehydrated;
                      null !== suspenseInstance &&
                        retryIfBlockedOn(suspenseInstance);
                    }
                  }
                }
                break;
              case 19:
              case 17:
              case 21:
              case 22:
              case 23:
              case 25:
                break;
              default:
                throw Error(
                  "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue."
                );
            }
          offscreenSubtreeWasHidden ||
            (root.flags & 512 && commitAttachRef(root));
        } catch (error) {
          captureCommitPhaseError(root, root.return, error);
        }
      }
      if (root === subtreeRoot) {
        nextEffect = null;
        break;
      }
      committedLanes = root.sibling;
      if (null !== committedLanes) {
        committedLanes.return = root.return;
        nextEffect = committedLanes;
        break;
      }
      nextEffect = root.return;
    }
  }
  function disappearLayoutEffects_complete(subtreeRoot) {
    for (; null !== nextEffect; ) {
      const fiber = nextEffect;
      if (fiber === subtreeRoot) {
        nextEffect = null;
        break;
      }
      const sibling = fiber.sibling;
      if (null !== sibling) {
        sibling.return = fiber.return;
        nextEffect = sibling;
        break;
      }
      nextEffect = fiber.return;
    }
  }
  function reappearLayoutEffects_complete(subtreeRoot) {
    for (; null !== nextEffect; ) {
      const fiber = nextEffect;
      try {
        switch (fiber.tag) {
          case 0:
          case 11:
          case 15:
            var current = fiber,
              nearestMountedAncestor = fiber.return;
            try {
              commitHookEffectListMount(4, current);
            } catch (error) {
              captureCommitPhaseError(current, nearestMountedAncestor, error);
            }
            break;
          case 1:
            const instance = fiber.stateNode;
            if ("function" === typeof instance.componentDidMount) {
              current = fiber;
              var nearestMountedAncestor$jscomp$0 = fiber.return;
              try {
                instance.componentDidMount();
              } catch (error) {
                captureCommitPhaseError(
                  current,
                  nearestMountedAncestor$jscomp$0,
                  error
                );
              }
            }
            current = fiber;
            var nearestMountedAncestor$jscomp$1 = fiber.return;
            try {
              commitAttachRef(current);
            } catch (error) {
              captureCommitPhaseError(
                current,
                nearestMountedAncestor$jscomp$1,
                error
              );
            }
            break;
          case 5:
            current = fiber;
            var nearestMountedAncestor$jscomp$2 = fiber.return;
            try {
              commitAttachRef(current);
            } catch (error) {
              captureCommitPhaseError(
                current,
                nearestMountedAncestor$jscomp$2,
                error
              );
            }
        }
      } catch (error) {
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      if (fiber === subtreeRoot) {
        nextEffect = null;
        break;
      }
      current = fiber.sibling;
      if (null !== current) {
        current.return = fiber.return;
        nextEffect = current;
        break;
      }
      nextEffect = fiber.return;
    }
  }
  function resetRenderTimer() {
    workInProgressRootRenderTargetTime = now() + 500;
  }
  function requestEventTime() {
    return 0 !== (executionContext & 6)
      ? now()
      : -1 !== currentEventTime
        ? currentEventTime
        : (currentEventTime = now());
  }
  function requestUpdateLane(fiber) {
    if (0 === (fiber.mode & 1)) return 1;
    if (0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes)
      return workInProgressRootRenderLanes & -workInProgressRootRenderLanes;
    if (null !== ReactCurrentBatchConfig$2.transition)
      return (
        0 === currentEventTransitionLane &&
          (currentEventTransitionLane = claimNextTransitionLane()),
        currentEventTransitionLane
      );
    fiber = currentUpdatePriority;
    if (0 !== fiber) return fiber;
    fiber = window.event;
    fiber = void 0 === fiber ? 16 : getEventPriority(fiber.type);
    return fiber;
  }
  function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    if (50 < nestedUpdateCount)
      throw (
        ((nestedUpdateCount = 0),
        (rootWithNestedUpdates = null),
        Error(
          "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops."
        ))
      );
    markRootUpdated(root, lane, eventTime);
    if (0 === (executionContext & 2) || root !== workInProgressRoot)
      root === workInProgressRoot &&
        (0 === (executionContext & 2) &&
          (workInProgressRootInterleavedUpdatedLanes |= lane),
        4 === workInProgressRootExitStatus &&
          markRootSuspended(root, workInProgressRootRenderLanes)),
        ensureRootIsScheduled(root, eventTime),
        1 === lane &&
          0 === executionContext &&
          0 === (fiber.mode & 1) &&
          (resetRenderTimer(),
          includesLegacySyncCallbacks && flushSyncCallbacks());
  }
  function ensureRootIsScheduled(root, currentTime) {
    var existingCallbackNode = root.callbackNode;
    markStarvedLanesAsExpired(root, currentTime);
    const nextLanes = getNextLanes(
      root,
      root === workInProgressRoot ? workInProgressRootRenderLanes : 0
    );
    if (0 === nextLanes)
      null !== existingCallbackNode && cancelCallback$1(existingCallbackNode),
        (root.callbackNode = null),
        (root.callbackPriority = 0);
    else if (
      ((currentTime = nextLanes & -nextLanes),
      root.callbackPriority !== currentTime)
    ) {
      null != existingCallbackNode && cancelCallback$1(existingCallbackNode);
      if (1 === currentTime)
        0 === root.tag
          ? scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root))
          : scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root)),
          scheduleMicrotask(() => {
            0 === (executionContext & 6) && flushSyncCallbacks();
          }),
          (existingCallbackNode = null);
      else {
        switch (lanesToEventPriority(nextLanes)) {
          case 1:
            existingCallbackNode = ImmediatePriority;
            break;
          case 4:
            existingCallbackNode = UserBlockingPriority;
            break;
          case 16:
            existingCallbackNode = NormalPriority;
            break;
          case 536870912:
            existingCallbackNode = IdlePriority;
            break;
          default:
            existingCallbackNode = NormalPriority;
        }
        existingCallbackNode = scheduleCallback(
          existingCallbackNode,
          performConcurrentWorkOnRoot.bind(null, root)
        );
      }
      root.callbackPriority = currentTime;
      root.callbackNode = existingCallbackNode;
    }
  }
  function performConcurrentWorkOnRoot(root, didTimeout) {
    currentEventTime = -1;
    currentEventTransitionLane = 0;
    if (0 !== (executionContext & 6))
      throw Error("Should not already be working.");
    var originalCallbackNode = root.callbackNode;
    if (flushPassiveEffects() && root.callbackNode !== originalCallbackNode)
      return null;
    var lanes = getNextLanes(
      root,
      root === workInProgressRoot ? workInProgressRootRenderLanes : 0
    );
    if (0 === lanes) return null;
    if (0 !== (lanes & 30) || 0 !== (lanes & root.expiredLanes) || didTimeout)
      didTimeout = renderRootSync(root, lanes);
    else {
      didTimeout = lanes;
      var prevExecutionContext = executionContext;
      executionContext |= 2;
      var prevDispatcher = pushDispatcher();
      if (
        workInProgressRoot !== root ||
        workInProgressRootRenderLanes !== didTimeout
      )
        (workInProgressTransitions = null),
          resetRenderTimer(),
          prepareFreshStack(root, didTimeout);
      do
        try {
          workLoopConcurrent();
          break;
        } catch (thrownValue) {
          handleError(root, thrownValue);
        }
      while (1);
      resetContextDependencies();
      ReactCurrentDispatcher.current = prevDispatcher;
      executionContext = prevExecutionContext;
      null !== workInProgress
        ? (didTimeout = 0)
        : ((workInProgressRoot = null),
          (workInProgressRootRenderLanes = 0),
          (didTimeout = workInProgressRootExitStatus));
    }
    if (0 !== didTimeout) {
      2 === didTimeout &&
        ((prevExecutionContext = getLanesToRetrySynchronouslyOnError(root)),
        0 !== prevExecutionContext &&
          ((lanes = prevExecutionContext),
          (didTimeout = recoverFromConcurrentError(
            root,
            prevExecutionContext
          ))));
      if (1 === didTimeout)
        throw (
          ((originalCallbackNode = workInProgressRootFatalError),
          prepareFreshStack(root, 0),
          markRootSuspended(root, lanes),
          ensureRootIsScheduled(root, now()),
          originalCallbackNode)
        );
      if (6 === didTimeout) markRootSuspended(root, lanes);
      else {
        prevExecutionContext = root.current.alternate;
        if (
          0 === (lanes & 30) &&
          !isRenderConsistentWithExternalStores(prevExecutionContext) &&
          ((didTimeout = renderRootSync(root, lanes)),
          2 === didTimeout &&
            ((prevDispatcher = getLanesToRetrySynchronouslyOnError(root)),
            0 !== prevDispatcher &&
              ((lanes = prevDispatcher),
              (didTimeout = recoverFromConcurrentError(root, prevDispatcher)))),
          1 === didTimeout)
        )
          throw (
            ((originalCallbackNode = workInProgressRootFatalError),
            prepareFreshStack(root, 0),
            markRootSuspended(root, lanes),
            ensureRootIsScheduled(root, now()),
            originalCallbackNode)
          );
        root.finishedWork = prevExecutionContext;
        root.finishedLanes = lanes;
        switch (didTimeout) {
          case 0:
          case 1:
            throw Error("Root did not complete. This is a bug in React.");
          case 2:
            commitRoot(
              root,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions
            );
            break;
          case 3:
            markRootSuspended(root, lanes);
            if (
              (lanes & 130023424) === lanes &&
              ((didTimeout = globalMostRecentFallbackTime + 500 - now()),
              10 < didTimeout)
            ) {
              if (0 !== getNextLanes(root, 0)) break;
              prevExecutionContext = root.suspendedLanes;
              if ((prevExecutionContext & lanes) !== lanes) {
                requestEventTime();
                root.pingedLanes |= root.suspendedLanes & prevExecutionContext;
                break;
              }
              root.timeoutHandle = scheduleTimeout(
                commitRoot.bind(
                  null,
                  root,
                  workInProgressRootRecoverableErrors,
                  workInProgressTransitions
                ),
                didTimeout
              );
              break;
            }
            commitRoot(
              root,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions
            );
            break;
          case 4:
            markRootSuspended(root, lanes);
            if ((lanes & 4194240) === lanes) break;
            didTimeout = root.eventTimes;
            for (prevExecutionContext = -1; 0 < lanes; ) {
              var index = 31 - clz32(lanes);
              prevDispatcher = 1 << index;
              index = didTimeout[index];
              index > prevExecutionContext && (prevExecutionContext = index);
              lanes &= ~prevDispatcher;
            }
            lanes = prevExecutionContext;
            lanes = now() - lanes;
            lanes =
              (120 > lanes
                ? 120
                : 480 > lanes
                  ? 480
                  : 1080 > lanes
                    ? 1080
                    : 1920 > lanes
                      ? 1920
                      : 3e3 > lanes
                        ? 3e3
                        : 4320 > lanes
                          ? 4320
                          : 1960 * ceil(lanes / 1960)) - lanes;
            if (10 < lanes) {
              root.timeoutHandle = scheduleTimeout(
                commitRoot.bind(
                  null,
                  root,
                  workInProgressRootRecoverableErrors,
                  workInProgressTransitions
                ),
                lanes
              );
              break;
            }
            commitRoot(
              root,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions
            );
            break;
          case 5:
            commitRoot(
              root,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions
            );
            break;
          default:
            throw Error("Unknown root exit status.");
        }
      }
    }
    ensureRootIsScheduled(root, now());
    return root.callbackNode === originalCallbackNode
      ? performConcurrentWorkOnRoot.bind(null, root)
      : null;
  }
  function recoverFromConcurrentError(root, errorRetryLanes) {
    const errorsFromFirstAttempt = workInProgressRootConcurrentErrors;
    root.current.memoizedState.isDehydrated &&
      (prepareFreshStack(root, errorRetryLanes).flags |= 256);
    root = renderRootSync(root, errorRetryLanes);
    2 !== root &&
      ((errorRetryLanes = workInProgressRootRecoverableErrors),
      (workInProgressRootRecoverableErrors = errorsFromFirstAttempt),
      null !== errorRetryLanes && queueRecoverableErrors(errorRetryLanes));
    return root;
  }
  function queueRecoverableErrors(errors) {
    null === workInProgressRootRecoverableErrors
      ? (workInProgressRootRecoverableErrors = errors)
      : workInProgressRootRecoverableErrors.push.apply(
          workInProgressRootRecoverableErrors,
          errors
        );
  }
  function isRenderConsistentWithExternalStores(finishedWork) {
    let node = finishedWork;
    for (;;) {
      if (node.flags & 16384) {
        var updateQueue = node.updateQueue;
        if (
          null !== updateQueue &&
          ((updateQueue = updateQueue.stores), null !== updateQueue)
        )
          for (let i = 0; i < updateQueue.length; i++) {
            var check = updateQueue[i];
            const getSnapshot = check.getSnapshot;
            check = check.value;
            try {
              if (!objectIs(getSnapshot(), check)) return !1;
            } catch (error) {
              return !1;
            }
          }
      }
      updateQueue = node.child;
      if (node.subtreeFlags & 16384 && null !== updateQueue)
        (updateQueue.return = node), (node = updateQueue);
      else {
        if (node === finishedWork) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === finishedWork) return !0;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
    return !0;
  }
  function markRootSuspended(root, suspendedLanes) {
    suspendedLanes &= ~workInProgressRootPingedLanes;
    suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
    root.suspendedLanes |= suspendedLanes;
    root.pingedLanes &= ~suspendedLanes;
    for (root = root.expirationTimes; 0 < suspendedLanes; ) {
      const index = 31 - clz32(suspendedLanes),
        lane = 1 << index;
      root[index] = -1;
      suspendedLanes &= ~lane;
    }
  }
  function performSyncWorkOnRoot(root) {
    if (0 !== (executionContext & 6))
      throw Error("Should not already be working.");
    flushPassiveEffects();
    let lanes = getNextLanes(root, 0);
    if (0 === (lanes & 1)) return ensureRootIsScheduled(root, now()), null;
    var exitStatus = renderRootSync(root, lanes);
    if (0 !== root.tag && 2 === exitStatus) {
      const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);
      0 !== errorRetryLanes &&
        ((lanes = errorRetryLanes),
        (exitStatus = recoverFromConcurrentError(root, errorRetryLanes)));
    }
    if (1 === exitStatus)
      throw (
        ((exitStatus = workInProgressRootFatalError),
        prepareFreshStack(root, 0),
        markRootSuspended(root, lanes),
        ensureRootIsScheduled(root, now()),
        exitStatus)
      );
    if (6 === exitStatus)
      throw Error("Root did not complete. This is a bug in React.");
    root.finishedWork = root.current.alternate;
    root.finishedLanes = lanes;
    commitRoot(
      root,
      workInProgressRootRecoverableErrors,
      workInProgressTransitions
    );
    ensureRootIsScheduled(root, now());
    return null;
  }
  function batchedUpdates(fn, a) {
    const prevExecutionContext = executionContext;
    executionContext |= 1;
    try {
      return fn(a);
    } finally {
      (executionContext = prevExecutionContext),
        0 === executionContext &&
          (resetRenderTimer(),
          includesLegacySyncCallbacks && flushSyncCallbacks());
    }
  }
  function flushSync$1(fn) {
    null !== rootWithPendingPassiveEffects &&
      0 === rootWithPendingPassiveEffects.tag &&
      0 === (executionContext & 6) &&
      flushPassiveEffects();
    const prevExecutionContext = executionContext;
    executionContext |= 1;
    const prevTransition = ReactCurrentBatchConfig.transition,
      previousPriority = currentUpdatePriority;
    try {
      if (
        ((ReactCurrentBatchConfig.transition = null),
        (currentUpdatePriority = 1),
        fn)
      )
        return fn();
    } finally {
      (currentUpdatePriority = previousPriority),
        (ReactCurrentBatchConfig.transition = prevTransition),
        (executionContext = prevExecutionContext),
        0 === (executionContext & 6) && flushSyncCallbacks();
    }
  }
  function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    root.finishedLanes = 0;
    var timeoutHandle = root.timeoutHandle;
    -1 !== timeoutHandle &&
      ((root.timeoutHandle = -1), cancelTimeout(timeoutHandle));
    if (null !== workInProgress)
      for (timeoutHandle = workInProgress.return; null !== timeoutHandle; ) {
        var interruptedWork = timeoutHandle;
        popTreeContext(interruptedWork);
        switch (interruptedWork.tag) {
          case 1:
            interruptedWork = interruptedWork.type.childContextTypes;
            null !== interruptedWork &&
              void 0 !== interruptedWork &&
              (pop(didPerformWorkStackCursor), pop(contextStackCursor$1));
            break;
          case 3:
            interruptedWork.stateNode;
            popHostContainer();
            pop(didPerformWorkStackCursor);
            pop(contextStackCursor$1);
            resetWorkInProgressVersions();
            break;
          case 5:
            popHostContext(interruptedWork);
            break;
          case 4:
            popHostContainer();
            break;
          case 13:
            pop(suspenseStackCursor);
            break;
          case 19:
            pop(suspenseStackCursor);
            break;
          case 10:
            popProvider(interruptedWork.type._context);
            break;
          case 22:
          case 23:
            (subtreeRenderLanes = subtreeRenderLanesCursor.current),
              pop(subtreeRenderLanesCursor);
        }
        timeoutHandle = timeoutHandle.return;
      }
    workInProgressRoot = root;
    workInProgress = root = createWorkInProgress(root.current, null);
    workInProgressRootRenderLanes = subtreeRenderLanes = lanes;
    workInProgressRootExitStatus = 0;
    workInProgressRootFatalError = null;
    workInProgressRootPingedLanes =
      workInProgressRootInterleavedUpdatedLanes =
      workInProgressRootSkippedLanes =
        0;
    workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors =
      null;
    if (null !== concurrentQueues) {
      for (lanes = 0; lanes < concurrentQueues.length; lanes++)
        if (
          ((timeoutHandle = concurrentQueues[lanes]),
          (interruptedWork = timeoutHandle.interleaved),
          null !== interruptedWork)
        ) {
          timeoutHandle.interleaved = null;
          const firstInterleavedUpdate = interruptedWork.next,
            lastPendingUpdate = timeoutHandle.pending;
          if (null !== lastPendingUpdate) {
            const firstPendingUpdate = lastPendingUpdate.next;
            lastPendingUpdate.next = firstInterleavedUpdate;
            interruptedWork.next = firstPendingUpdate;
          }
          timeoutHandle.pending = interruptedWork;
        }
      concurrentQueues = null;
    }
    return root;
  }
  function handleError(root$jscomp$0, thrownValue) {
    do {
      let erroredWork = workInProgress;
      try {
        resetContextDependencies();
        ReactCurrentDispatcher$1.current = ContextOnlyDispatcher;
        if (didScheduleRenderPhaseUpdate) {
          let hook = currentlyRenderingFiber.memoizedState;
          for (; null !== hook; ) {
            const queue = hook.queue;
            null !== queue && (queue.pending = null);
            hook = hook.next;
          }
          didScheduleRenderPhaseUpdate = !1;
        }
        renderLanes = 0;
        workInProgressHook = currentHook = currentlyRenderingFiber = null;
        didScheduleRenderPhaseUpdateDuringThisPass = !1;
        localIdCounter = 0;
        ReactCurrentOwner.current = null;
        if (null === erroredWork || null === erroredWork.return) {
          workInProgressRootExitStatus = 1;
          workInProgressRootFatalError = thrownValue;
          workInProgress = null;
          break;
        }
        a: {
          var root = root$jscomp$0,
            returnFiber = erroredWork.return,
            sourceFiber = erroredWork,
            value = thrownValue;
          thrownValue = workInProgressRootRenderLanes;
          sourceFiber.flags |= 32768;
          if (
            null !== value &&
            "object" === typeof value &&
            "function" === typeof value.then
          ) {
            const wakeable = value;
            var sourceFiber$jscomp$0 = sourceFiber;
            const tag = sourceFiber$jscomp$0.tag;
            if (
              0 === (sourceFiber$jscomp$0.mode & 1) &&
              (0 === tag || 11 === tag || 15 === tag)
            ) {
              const currentSource = sourceFiber$jscomp$0.alternate;
              currentSource
                ? ((sourceFiber$jscomp$0.updateQueue =
                    currentSource.updateQueue),
                  (sourceFiber$jscomp$0.memoizedState =
                    currentSource.memoizedState),
                  (sourceFiber$jscomp$0.lanes = currentSource.lanes))
                : ((sourceFiber$jscomp$0.updateQueue = null),
                  (sourceFiber$jscomp$0.memoizedState = null));
            }
            const suspenseBoundary =
              getNearestSuspenseBoundaryToCapture(returnFiber);
            if (null !== suspenseBoundary) {
              suspenseBoundary.flags &= -257;
              markSuspenseBoundaryShouldCapture(
                suspenseBoundary,
                returnFiber,
                sourceFiber,
                root,
                thrownValue
              );
              suspenseBoundary.mode & 1 &&
                attachPingListener(root, wakeable, thrownValue);
              thrownValue = suspenseBoundary;
              value = wakeable;
              const wakeables = thrownValue.updateQueue;
              if (null === wakeables) {
                const updateQueue = new Set();
                updateQueue.add(value);
                thrownValue.updateQueue = updateQueue;
              } else wakeables.add(value);
              break a;
            } else {
              if (0 === (thrownValue & 1)) {
                attachPingListener(root, wakeable, thrownValue);
                renderDidSuspendDelayIfPossible();
                break a;
              }
              value = Error(
                "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."
              );
            }
          } else if (isHydrating && sourceFiber.mode & 1) {
            const suspenseBoundary =
              getNearestSuspenseBoundaryToCapture(returnFiber);
            if (null !== suspenseBoundary) {
              0 === (suspenseBoundary.flags & 65536) &&
                (suspenseBoundary.flags |= 256);
              markSuspenseBoundaryShouldCapture(
                suspenseBoundary,
                returnFiber,
                sourceFiber,
                root,
                thrownValue
              );
              queueHydrationError(
                createCapturedValueAtFiber(value, sourceFiber)
              );
              break a;
            }
          }
          root = value = createCapturedValueAtFiber(value, sourceFiber);
          4 !== workInProgressRootExitStatus &&
            (workInProgressRootExitStatus = 2);
          null === workInProgressRootConcurrentErrors
            ? (workInProgressRootConcurrentErrors = [root])
            : workInProgressRootConcurrentErrors.push(root);
          root = returnFiber;
          do {
            switch (root.tag) {
              case 3:
                root.flags |= 65536;
                thrownValue &= -thrownValue;
                root.lanes |= thrownValue;
                const update = createRootErrorUpdate(root, value, thrownValue);
                enqueueCapturedUpdate(root, update);
                break a;
              case 1:
                sourceFiber = value;
                const ctor = root.type,
                  instance = root.stateNode;
                if (
                  0 === (root.flags & 128) &&
                  ("function" === typeof ctor.getDerivedStateFromError ||
                    (null !== instance &&
                      "function" === typeof instance.componentDidCatch &&
                      (null === legacyErrorBoundariesThatAlreadyFailed ||
                        !legacyErrorBoundariesThatAlreadyFailed.has(instance))))
                ) {
                  root.flags |= 65536;
                  thrownValue &= -thrownValue;
                  root.lanes |= thrownValue;
                  const update = createClassErrorUpdate(
                    root,
                    sourceFiber,
                    thrownValue
                  );
                  enqueueCapturedUpdate(root, update);
                  break a;
                }
            }
            root = root.return;
          } while (null !== root);
        }
        completeUnitOfWork(erroredWork);
      } catch (yetAnotherThrownValue) {
        thrownValue = yetAnotherThrownValue;
        workInProgress === erroredWork &&
          null !== erroredWork &&
          (workInProgress = erroredWork = erroredWork.return);
        continue;
      }
      break;
    } while (1);
  }
  function pushDispatcher() {
    const prevDispatcher = ReactCurrentDispatcher.current;
    ReactCurrentDispatcher.current = ContextOnlyDispatcher;
    return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
  }
  function renderDidSuspendDelayIfPossible() {
    if (
      0 === workInProgressRootExitStatus ||
      3 === workInProgressRootExitStatus ||
      2 === workInProgressRootExitStatus
    )
      workInProgressRootExitStatus = 4;
    null === workInProgressRoot ||
      (0 === (workInProgressRootSkippedLanes & 268435455) &&
        0 === (workInProgressRootInterleavedUpdatedLanes & 268435455)) ||
      markRootSuspended(workInProgressRoot, workInProgressRootRenderLanes);
  }
  function renderRootSync(root, lanes) {
    const prevExecutionContext = executionContext;
    executionContext |= 2;
    const prevDispatcher = pushDispatcher();
    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes)
      (workInProgressTransitions = null), prepareFreshStack(root, lanes);
    do
      try {
        workLoopSync();
        break;
      } catch (thrownValue) {
        handleError(root, thrownValue);
      }
    while (1);
    resetContextDependencies();
    executionContext = prevExecutionContext;
    ReactCurrentDispatcher.current = prevDispatcher;
    if (null !== workInProgress)
      throw Error(
        "Cannot commit an incomplete root. This error is likely caused by a bug in React. Please file an issue."
      );
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    return workInProgressRootExitStatus;
  }
  function workLoopSync() {
    for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
  }
  function workLoopConcurrent() {
    for (; null !== workInProgress && !shouldYield(); )
      performUnitOfWork(workInProgress);
  }
  function performUnitOfWork(unitOfWork) {
    let next;
    next = beginWork(unitOfWork.alternate, unitOfWork, subtreeRenderLanes);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
    ReactCurrentOwner.current = null;
  }
  function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;
    do {
      var current = completedWork.alternate;
      unitOfWork = completedWork.return;
      if (0 === (completedWork.flags & 32768)) {
        if (
          ((current = completeWork(current, completedWork, subtreeRenderLanes)),
          null !== current)
        ) {
          workInProgress = current;
          return;
        }
      } else {
        current = unwindWork(current, completedWork);
        if (null !== current) {
          current.flags &= 32767;
          workInProgress = current;
          return;
        }
        if (null !== unitOfWork)
          (unitOfWork.flags |= 32768),
            (unitOfWork.subtreeFlags = 0),
            (unitOfWork.deletions = null);
        else {
          workInProgressRootExitStatus = 6;
          workInProgress = null;
          return;
        }
      }
      completedWork = completedWork.sibling;
      if (null !== completedWork) {
        workInProgress = completedWork;
        return;
      }
      workInProgress = completedWork = unitOfWork;
    } while (null !== completedWork);
    0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
  }
  function commitRoot(root, recoverableErrors, transitions) {
    const previousUpdateLanePriority = currentUpdatePriority,
      prevTransition = ReactCurrentBatchConfig.transition;
    try {
      (ReactCurrentBatchConfig.transition = null),
        (currentUpdatePriority = 1),
        commitRootImpl(
          root,
          recoverableErrors,
          transitions,
          previousUpdateLanePriority
        );
    } finally {
      (ReactCurrentBatchConfig.transition = prevTransition),
        (currentUpdatePriority = previousUpdateLanePriority);
    }
    return null;
  }
  function commitRootImpl(
    root,
    recoverableErrors,
    transitions,
    renderPriorityLevel
  ) {
    do flushPassiveEffects();
    while (null !== rootWithPendingPassiveEffects);
    if (0 !== (executionContext & 6))
      throw Error("Should not already be working.");
    transitions = root.finishedWork;
    var lanes = root.finishedLanes;
    if (null === transitions) return null;
    root.finishedWork = null;
    root.finishedLanes = 0;
    if (transitions === root.current)
      throw Error(
        "Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue."
      );
    root.callbackNode = null;
    root.callbackPriority = 0;
    var remainingLanes = transitions.lanes | transitions.childLanes;
    markRootFinished(root, remainingLanes);
    root === workInProgressRoot &&
      ((workInProgress = workInProgressRoot = null),
      (workInProgressRootRenderLanes = 0));
    (0 === (transitions.subtreeFlags & 2064) &&
      0 === (transitions.flags & 2064)) ||
      rootDoesHavePassiveEffects ||
      ((rootDoesHavePassiveEffects = !0),
      scheduleCallback(NormalPriority, () => {
        flushPassiveEffects();
        return null;
      }));
    remainingLanes = 0 !== (transitions.flags & 15990);
    if (0 !== (transitions.subtreeFlags & 15990) || remainingLanes) {
      remainingLanes = ReactCurrentBatchConfig.transition;
      ReactCurrentBatchConfig.transition = null;
      const previousPriority = currentUpdatePriority;
      currentUpdatePriority = 1;
      const prevExecutionContext = executionContext;
      executionContext |= 4;
      ReactCurrentOwner.current = null;
      commitBeforeMutationEffects(root, transitions);
      commitMutationEffectsOnFiber(transitions, root);
      restoreSelection(selectionInformation);
      _enabled = !!eventsEnabled;
      selectionInformation = eventsEnabled = null;
      root.current = transitions;
      commitLayoutEffects(transitions, root, lanes);
      requestPaint();
      executionContext = prevExecutionContext;
      currentUpdatePriority = previousPriority;
      ReactCurrentBatchConfig.transition = remainingLanes;
    } else root.current = transitions;
    rootDoesHavePassiveEffects &&
      ((rootDoesHavePassiveEffects = !1),
      (rootWithPendingPassiveEffects = root),
      (pendingPassiveEffectsLanes = lanes));
    remainingLanes = root.pendingLanes;
    0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
    onCommitRoot(transitions.stateNode, renderPriorityLevel);
    ensureRootIsScheduled(root, now());
    if (null !== recoverableErrors)
      for (
        renderPriorityLevel = root.onRecoverableError, transitions = 0;
        transitions < recoverableErrors.length;
        transitions++
      )
        (lanes = recoverableErrors[transitions]),
          renderPriorityLevel(lanes.value, {
            componentStack: lanes.stack,
            digest: lanes.digest
          });
    if (hasUncaughtError)
      throw (
        ((hasUncaughtError = !1),
        (root = firstUncaughtError),
        (firstUncaughtError = null),
        root)
      );
    0 !== (pendingPassiveEffectsLanes & 1) &&
      0 !== root.tag &&
      flushPassiveEffects();
    remainingLanes = root.pendingLanes;
    0 !== (remainingLanes & 1)
      ? root === rootWithNestedUpdates
        ? nestedUpdateCount++
        : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root))
      : (nestedUpdateCount = 0);
    flushSyncCallbacks();
    return null;
  }
  function flushPassiveEffects() {
    if (null !== rootWithPendingPassiveEffects) {
      var renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
      const prevTransition = ReactCurrentBatchConfig.transition,
        previousPriority = currentUpdatePriority;
      try {
        ReactCurrentBatchConfig.transition = null;
        currentUpdatePriority = 16 > renderPriority ? 16 : renderPriority;
        if (null === rootWithPendingPassiveEffects)
          var JSCompiler_inline_result = !1;
        else {
          renderPriority = rootWithPendingPassiveEffects;
          rootWithPendingPassiveEffects = null;
          pendingPassiveEffectsLanes = 0;
          if (0 !== (executionContext & 6))
            throw Error(
              "Cannot flush passive effects while already rendering."
            );
          var prevExecutionContext = executionContext;
          executionContext |= 4;
          for (nextEffect = renderPriority.current; null !== nextEffect; ) {
            var fiber = nextEffect,
              child = fiber.child;
            if (0 !== (nextEffect.flags & 16)) {
              var deletions = fiber.deletions;
              if (null !== deletions) {
                for (let i = 0; i < deletions.length; i++) {
                  const fiberToDelete = deletions[i];
                  for (nextEffect = fiberToDelete; null !== nextEffect; ) {
                    var fiber$jscomp$0 = nextEffect;
                    switch (fiber$jscomp$0.tag) {
                      case 0:
                      case 11:
                      case 15:
                        commitHookEffectListUnmount(8, fiber$jscomp$0, fiber);
                    }
                    const child = fiber$jscomp$0.child;
                    if (null !== child)
                      (child.return = fiber$jscomp$0), (nextEffect = child);
                    else
                      for (; null !== nextEffect; ) {
                        fiber$jscomp$0 = nextEffect;
                        const sibling = fiber$jscomp$0.sibling,
                          returnFiber = fiber$jscomp$0.return;
                        detachFiberAfterEffects(fiber$jscomp$0);
                        if (fiber$jscomp$0 === fiberToDelete) {
                          nextEffect = null;
                          break;
                        }
                        if (null !== sibling) {
                          sibling.return = returnFiber;
                          nextEffect = sibling;
                          break;
                        }
                        nextEffect = returnFiber;
                      }
                  }
                }
                const previousFiber = fiber.alternate;
                if (null !== previousFiber) {
                  let detachedChild = previousFiber.child;
                  if (null !== detachedChild) {
                    previousFiber.child = null;
                    do {
                      const detachedSibling = detachedChild.sibling;
                      detachedChild.sibling = null;
                      detachedChild = detachedSibling;
                    } while (null !== detachedChild);
                  }
                }
                nextEffect = fiber;
              }
            }
            if (0 !== (fiber.subtreeFlags & 2064) && null !== child)
              (child.return = fiber), (nextEffect = child);
            else
              b: for (; null !== nextEffect; ) {
                fiber = nextEffect;
                if (0 !== (fiber.flags & 2048))
                  switch (fiber.tag) {
                    case 0:
                    case 11:
                    case 15:
                      commitHookEffectListUnmount(9, fiber, fiber.return);
                  }
                const sibling = fiber.sibling;
                if (null !== sibling) {
                  sibling.return = fiber.return;
                  nextEffect = sibling;
                  break b;
                }
                nextEffect = fiber.return;
              }
          }
          var finishedWork = renderPriority.current;
          for (nextEffect = finishedWork; null !== nextEffect; ) {
            child = nextEffect;
            const firstChild = child.child;
            if (0 !== (child.subtreeFlags & 2064) && null !== firstChild)
              (firstChild.return = child), (nextEffect = firstChild);
            else
              b: for (child = finishedWork; null !== nextEffect; ) {
                deletions = nextEffect;
                if (0 !== (deletions.flags & 2048))
                  try {
                    switch (deletions.tag) {
                      case 0:
                      case 11:
                      case 15:
                        commitHookEffectListMount(9, deletions);
                    }
                  } catch (error) {
                    captureCommitPhaseError(deletions, deletions.return, error);
                  }
                if (deletions === child) {
                  nextEffect = null;
                  break b;
                }
                const sibling = deletions.sibling;
                if (null !== sibling) {
                  sibling.return = deletions.return;
                  nextEffect = sibling;
                  break b;
                }
                nextEffect = deletions.return;
              }
          }
          executionContext = prevExecutionContext;
          flushSyncCallbacks();
          if (
            injectedHook &&
            "function" === typeof injectedHook.onPostCommitFiberRoot
          )
            try {
              injectedHook.onPostCommitFiberRoot(rendererID, renderPriority);
            } catch (err) {}
          JSCompiler_inline_result = !0;
        }
        return JSCompiler_inline_result;
      } finally {
        (currentUpdatePriority = previousPriority),
          (ReactCurrentBatchConfig.transition = prevTransition);
      }
    }
    return !1;
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber, sourceFiber, 1);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 1);
    sourceFiber = requestEventTime();
    null !== rootFiber &&
      (markRootUpdated(rootFiber, 1, sourceFiber),
      ensureRootIsScheduled(rootFiber, sourceFiber));
  }
  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
    if (3 === sourceFiber.tag)
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    else
      for (; null !== nearestMountedAncestor; ) {
        if (3 === nearestMountedAncestor.tag) {
          captureCommitPhaseErrorOnRoot(
            nearestMountedAncestor,
            sourceFiber,
            error
          );
          break;
        } else if (1 === nearestMountedAncestor.tag) {
          const instance = nearestMountedAncestor.stateNode;
          if (
            "function" ===
              typeof nearestMountedAncestor.type.getDerivedStateFromError ||
            ("function" === typeof instance.componentDidCatch &&
              (null === legacyErrorBoundariesThatAlreadyFailed ||
                !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
          ) {
            sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
            sourceFiber = createClassErrorUpdate(
              nearestMountedAncestor,
              sourceFiber,
              1
            );
            nearestMountedAncestor = enqueueUpdate(
              nearestMountedAncestor,
              sourceFiber,
              1
            );
            sourceFiber = requestEventTime();
            null !== nearestMountedAncestor &&
              (markRootUpdated(nearestMountedAncestor, 1, sourceFiber),
              ensureRootIsScheduled(nearestMountedAncestor, sourceFiber));
            break;
          }
        }
        nearestMountedAncestor = nearestMountedAncestor.return;
      }
  }
  function pingSuspendedRoot(root, wakeable, pingedLanes) {
    const pingCache = root.pingCache;
    null !== pingCache && pingCache.delete(wakeable);
    wakeable = requestEventTime();
    root.pingedLanes |= root.suspendedLanes & pingedLanes;
    workInProgressRoot === root &&
      (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
      (4 === workInProgressRootExitStatus ||
      (3 === workInProgressRootExitStatus &&
        (workInProgressRootRenderLanes & 130023424) ===
          workInProgressRootRenderLanes &&
        500 > now() - globalMostRecentFallbackTime)
        ? prepareFreshStack(root, 0)
        : (workInProgressRootPingedLanes |= pingedLanes));
    ensureRootIsScheduled(root, wakeable);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane &&
      (0 === (boundaryFiber.mode & 1)
        ? (retryLane = 1)
        : ((retryLane = nextRetryLane),
          (nextRetryLane <<= 1),
          0 === (nextRetryLane & 130023424) && (nextRetryLane = 4194304)));
    const eventTime = requestEventTime();
    boundaryFiber = markUpdateLaneFromFiberToRoot(boundaryFiber, retryLane);
    null !== boundaryFiber &&
      (markRootUpdated(boundaryFiber, retryLane, eventTime),
      ensureRootIsScheduled(boundaryFiber, eventTime));
  }
  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    const suspenseState = boundaryFiber.memoizedState;
    let retryLane = 0;
    null !== suspenseState && (retryLane = suspenseState.retryLane);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    let retryLane = 0,
      retryCache;
    switch (boundaryFiber.tag) {
      case 13:
        retryCache = boundaryFiber.stateNode;
        const suspenseState = boundaryFiber.memoizedState;
        null !== suspenseState && (retryLane = suspenseState.retryLane);
        break;
      case 19:
        retryCache = boundaryFiber.stateNode;
        break;
      default:
        throw Error(
          "Pinged unknown suspense boundary type. This is probably a bug in React."
        );
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function scheduleCallback(priorityLevel, callback) {
    return scheduleCallback$1(priorityLevel, callback);
  }
  function FiberNode(tag, pendingProps, key, mode) {
    this.tag = tag;
    this.key = key;
    this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = pendingProps;
    this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null;
    this.mode = mode;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function shouldConstruct(Component) {
    Component = Component.prototype;
    return !(!Component || !Component.isReactComponent);
  }
  function resolveLazyComponentTag(Component) {
    if ("function" === typeof Component)
      return shouldConstruct(Component) ? 1 : 0;
    if (void 0 !== Component && null !== Component) {
      Component = Component.$$typeof;
      if (Component === REACT_FORWARD_REF_TYPE) return 11;
      if (Component === REACT_MEMO_TYPE) return 14;
    }
    return 2;
  }
  function createWorkInProgress(current, pendingProps) {
    let workInProgress = current.alternate;
    null === workInProgress
      ? ((workInProgress = createFiber(
          current.tag,
          pendingProps,
          current.key,
          current.mode
        )),
        (workInProgress.elementType = current.elementType),
        (workInProgress.type = current.type),
        (workInProgress.stateNode = current.stateNode),
        (workInProgress.alternate = current),
        (current.alternate = workInProgress))
      : ((workInProgress.pendingProps = pendingProps),
        (workInProgress.type = current.type),
        (workInProgress.flags = 0),
        (workInProgress.subtreeFlags = 0),
        (workInProgress.deletions = null));
    workInProgress.flags = current.flags & 14680064;
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;
    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    pendingProps = current.dependencies;
    workInProgress.dependencies =
      null === pendingProps
        ? null
        : {
            lanes: pendingProps.lanes,
            firstContext: pendingProps.firstContext
          };
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;
    return workInProgress;
  }
  function createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes
  ) {
    let fiberTag = 2;
    owner = type;
    if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
    else if ("string" === typeof type) fiberTag = 5;
    else
      a: switch (type) {
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(
            pendingProps.children,
            mode,
            lanes,
            key
          );
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 8;
          break;
        case REACT_PROFILER_TYPE:
          return (
            (type = createFiber(12, pendingProps, key, mode | 2)),
            (type.elementType = REACT_PROFILER_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_SUSPENSE_TYPE:
          return (
            (type = createFiber(13, pendingProps, key, mode)),
            (type.elementType = REACT_SUSPENSE_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_SUSPENSE_LIST_TYPE:
          return (
            (type = createFiber(19, pendingProps, key, mode)),
            (type.elementType = REACT_SUSPENSE_LIST_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_OFFSCREEN_TYPE:
          return createFiberFromOffscreen(pendingProps, mode, lanes, key);
        default:
          if ("object" === typeof type && null !== type)
            switch (type.$$typeof) {
              case REACT_PROVIDER_TYPE:
                fiberTag = 10;
                break a;
              case REACT_CONTEXT_TYPE:
                fiberTag = 9;
                break a;
              case REACT_FORWARD_REF_TYPE:
                fiberTag = 11;
                break a;
              case REACT_MEMO_TYPE:
                fiberTag = 14;
                break a;
              case REACT_LAZY_TYPE:
                fiberTag = 16;
                owner = null;
                break a;
            }
          throw Error(
            "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) " +
              `but got: ${null == type ? type : typeof type}.${""}`
          );
      }
    key = createFiber(fiberTag, pendingProps, key, mode);
    key.elementType = type;
    key.type = owner;
    key.lanes = lanes;
    return key;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    elements = createFiber(7, elements, key, mode);
    elements.lanes = lanes;
    return elements;
  }
  function createFiberFromOffscreen(pendingProps, mode, lanes, key) {
    pendingProps = createFiber(22, pendingProps, key, mode);
    pendingProps.elementType = REACT_OFFSCREEN_TYPE;
    pendingProps.lanes = lanes;
    pendingProps.stateNode = { isHidden: !1 };
    return pendingProps;
  }
  function createFiberFromText(content, mode, lanes) {
    content = createFiber(6, content, null, mode);
    content.lanes = lanes;
    return content;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    mode = createFiber(
      4,
      null !== portal.children ? portal.children : [],
      portal.key,
      mode
    );
    mode.lanes = lanes;
    mode.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      implementation: portal.implementation
    };
    return mode;
  }
  function FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError
  ) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.finishedWork =
      this.pingCache =
      this.current =
      this.pendingChildren =
        null;
    this.timeoutHandle = -1;
    this.callbackNode = this.pendingContext = this.context = null;
    this.callbackPriority = 0;
    this.eventTimes = createLaneMap(0);
    this.expirationTimes = createLaneMap(-1);
    this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0;
    this.entanglements = createLaneMap(0);
    this.identifierPrefix = identifierPrefix;
    this.onRecoverableError = onRecoverableError;
    this.mutableSourceEagerHydrationData = null;
  }
  function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
  ) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onRecoverableError
    );
    1 === tag ? ((tag = 1), !0 === isStrictMode && (tag |= 8)) : (tag = 0);
    isStrictMode = createFiber(3, null, null, tag);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function createPortal$1(children, containerInfo, implementation, key = null) {
    return {
      $$typeof: REACT_PORTAL_TYPE,
      key: null == key ? null : "" + key,
      children,
      containerInfo,
      implementation
    };
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = parentComponent._reactInternals;
    a: {
      if (
        getNearestMountedFiber(parentComponent) !== parentComponent ||
        1 !== parentComponent.tag
      )
        throw Error(
          "Expected subtree parent to be a mounted class component. This error is likely caused by a bug in React. Please file an issue."
        );
      var JSCompiler_inline_result = parentComponent;
      do {
        switch (JSCompiler_inline_result.tag) {
          case 3:
            JSCompiler_inline_result =
              JSCompiler_inline_result.stateNode.context;
            break a;
          case 1:
            if (isContextProvider(JSCompiler_inline_result.type)) {
              JSCompiler_inline_result =
                JSCompiler_inline_result.stateNode
                  .__reactInternalMemoizedMergedChildContext;
              break a;
            }
        }
        JSCompiler_inline_result = JSCompiler_inline_result.return;
      } while (null !== JSCompiler_inline_result);
      throw Error(
        "Found unexpected detached subtree parent. This error is likely caused by a bug in React. Please file an issue."
      );
    }
    if (1 === parentComponent.tag) {
      const Component = parentComponent.type;
      if (isContextProvider(Component))
        return processChildContext(
          parentComponent,
          Component,
          JSCompiler_inline_result
        );
    }
    return JSCompiler_inline_result;
  }
  function createHydrationContainer(
    initialChildren,
    callback,
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
  ) {
    initialChildren = createFiberRoot(
      containerInfo,
      tag,
      !0,
      initialChildren,
      hydrationCallbacks,
      isStrictMode,
      concurrentUpdatesByDefaultOverride,
      identifierPrefix,
      onRecoverableError
    );
    initialChildren.context = getContextForSubtree(null);
    containerInfo = initialChildren.current;
    tag = requestEventTime();
    hydrationCallbacks = requestUpdateLane(containerInfo);
    isStrictMode = createUpdate(tag, hydrationCallbacks);
    isStrictMode.callback =
      void 0 !== callback && null !== callback ? callback : null;
    enqueueUpdate(containerInfo, isStrictMode, hydrationCallbacks);
    initialChildren.current.lanes = hydrationCallbacks;
    markRootUpdated(initialChildren, hydrationCallbacks, tag);
    ensureRootIsScheduled(initialChildren, tag);
    return initialChildren;
  }
  function updateContainer(element, container, parentComponent, callback) {
    const current = container.current,
      eventTime = requestEventTime(),
      lane = requestUpdateLane(current);
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context
      ? (container.context = parentComponent)
      : (container.pendingContext = parentComponent);
    container = createUpdate(eventTime, lane);
    container.payload = { element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(current, container, lane);
    null !== element &&
      (scheduleUpdateOnFiber(element, current, lane, eventTime),
      entangleTransitions(element, current, lane));
    return lane;
  }
  function getPublicRootInstance(container) {
    container = container.current;
    if (!container.child) return null;
    switch (container.child.tag) {
      case 5:
        return container.child.stateNode;
      default:
        return container.child.stateNode;
    }
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  function findHostInstanceByFiber(fiber) {
    fiber = findCurrentHostFiber(fiber);
    return null === fiber ? null : fiber.stateNode;
  }
  function emptyFindFiberByHostInstance(instance) {
    return null;
  }
  function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  function isValidContainer(node) {
    return !(
      !node ||
      (1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType)
    );
  }
  function isValidContainerLegacy(node) {
    return !(
      !node ||
      (1 !== node.nodeType &&
        9 !== node.nodeType &&
        11 !== node.nodeType &&
        (8 !== node.nodeType ||
          " react-mount-point-unstable " !== node.nodeValue))
    );
  }
  function noopOnRecoverableError() {}
  function legacyCreateRootFromDOMContainer(
    container,
    initialChildren,
    parentComponent,
    callback,
    isHydrationContainer
  ) {
    if (isHydrationContainer) {
      if ("function" === typeof callback) {
        const originalCallback = callback;
        callback = function () {
          const instance = getPublicRootInstance(root);
          originalCallback.call(instance);
        };
      }
      const root = createHydrationContainer(
        initialChildren,
        callback,
        container,
        0,
        null,
        !1,
        !1,
        "",
        noopOnRecoverableError
      );
      container._reactRootContainer = root;
      container[internalContainerInstanceKey] = root.current;
      listenToAllSupportedEvents(
        8 === container.nodeType ? container.parentNode : container
      );
      flushSync$1();
      return root;
    }
    for (; (isHydrationContainer = container.lastChild); )
      container.removeChild(isHydrationContainer);
    if ("function" === typeof callback) {
      const originalCallback = callback;
      callback = function () {
        const instance = getPublicRootInstance(root);
        originalCallback.call(instance);
      };
    }
    const root = createFiberRoot(
      container,
      0,
      !1,
      null,
      null,
      !1,
      !1,
      "",
      noopOnRecoverableError
    );
    container._reactRootContainer = root;
    container[internalContainerInstanceKey] = root.current;
    listenToAllSupportedEvents(
      8 === container.nodeType ? container.parentNode : container
    );
    flushSync$1(() => {
      updateContainer(initialChildren, root, parentComponent, callback);
    });
    return root;
  }
  function legacyRenderSubtreeIntoContainer(
    parentComponent,
    children,
    container,
    forceHydrate,
    callback
  ) {
    const maybeRoot = container._reactRootContainer;
    let root;
    if (maybeRoot) {
      root = maybeRoot;
      if ("function" === typeof callback) {
        const originalCallback = callback;
        callback = function () {
          const instance = getPublicRootInstance(root);
          originalCallback.call(instance);
        };
      }
      updateContainer(children, root, parentComponent, callback);
    } else
      root = legacyCreateRootFromDOMContainer(
        container,
        children,
        parentComponent,
        callback,
        forceHydrate
      );
    return getPublicRootInstance(root);
  }
  const React__namespace = (function (e) {
      if (e && "object" === typeof e && "default" in e) return e;
      const n = Object.create(null);
      if (e)
        for (const k in e)
          if ("default" !== k) {
            const d = Object.getOwnPropertyDescriptor(e, k);
            Object.defineProperty(
              n,
              k,
              d.get ? d : { enumerable: !0, get: () => e[k] }
            );
          }
      n.default = e;
      return Object.freeze(n);
    })(React),
    ReactSharedInternals =
      React__namespace.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    allNativeEvents = new Set(),
    registrationNameDependencies = {},
    hasOwnProperty = Object.prototype.hasOwnProperty,
    VALID_ATTRIBUTE_NAME_REGEX = RegExp(
      "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
    ),
    illegalAttributeNameCache = {},
    validatedAttributeNameCache = {},
    properties = Object.create(null);
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
    .split(" ")
    .forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        0,
        !1,
        name,
        null,
        !1,
        !1
      );
    });
  [
    ["acceptCharset", "accept-charset"],
    ["className", "class"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"]
  ].forEach(([name, attributeName]) => {
    properties[name] = new PropertyInfoRecord(
      name,
      1,
      !1,
      attributeName,
      null,
      !1,
      !1
    );
  });
  ["contentEditable", "draggable", "spellCheck", "value"].forEach((name) => {
    properties[name] = new PropertyInfoRecord(
      name,
      2,
      !1,
      name.toLowerCase(),
      null,
      !1,
      !1
    );
  });
  [
    "autoReverse",
    "externalResourcesRequired",
    "focusable",
    "preserveAlpha"
  ].forEach((name) => {
    properties[name] = new PropertyInfoRecord(name, 2, !1, name, null, !1, !1);
  });
  "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
    .split(" ")
    .forEach((name) => {
      properties[name] = new PropertyInfoRecord(
        name,
        3,
        !1,
        name.toLowerCase(),
        null,
        !1,
        !1
      );
    });
  ["checked", "multiple", "muted", "selected"].forEach((name) => {
    properties[name] = new PropertyInfoRecord(name, 3, !0, name, null, !1, !1);
  });
  ["capture", "download"].forEach((name) => {
    properties[name] = new PropertyInfoRecord(name, 4, !1, name, null, !1, !1);
  });
  ["cols", "rows", "size", "span"].forEach((name) => {
    properties[name] = new PropertyInfoRecord(name, 6, !1, name, null, !1, !1);
  });
  ["rowSpan", "start"].forEach((name) => {
    properties[name] = new PropertyInfoRecord(
      name,
      5,
      !1,
      name.toLowerCase(),
      null,
      !1,
      !1
    );
  });
  const CAMELIZE = /[\-:]([a-z])/g,
    capitalize = (token) => token[1].toUpperCase();
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
    .split(" ")
    .forEach((attributeName) => {
      const name = attributeName.replace(CAMELIZE, capitalize);
      properties[name] = new PropertyInfoRecord(
        name,
        1,
        !1,
        attributeName,
        null,
        !1,
        !1
      );
    });
  "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
    .split(" ")
    .forEach((attributeName) => {
      const name = attributeName.replace(CAMELIZE, capitalize);
      properties[name] = new PropertyInfoRecord(
        name,
        1,
        !1,
        attributeName,
        "http://www.w3.org/1999/xlink",
        !1,
        !1
      );
    });
  ["xml:base", "xml:lang", "xml:space"].forEach((attributeName) => {
    const name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(
      name,
      1,
      !1,
      attributeName,
      "http://www.w3.org/XML/1998/namespace",
      !1,
      !1
    );
  });
  ["tabIndex", "crossOrigin"].forEach((attributeName) => {
    properties[attributeName] = new PropertyInfoRecord(
      attributeName,
      1,
      !1,
      attributeName.toLowerCase(),
      null,
      !1,
      !1
    );
  });
  properties.xlinkHref = new PropertyInfoRecord(
    "xlinkHref",
    1,
    !1,
    "xlink:href",
    "http://www.w3.org/1999/xlink",
    !0,
    !1
  );
  ["src", "href", "action", "formAction"].forEach((attributeName) => {
    properties[attributeName] = new PropertyInfoRecord(
      attributeName,
      1,
      !1,
      attributeName.toLowerCase(),
      null,
      !0,
      !0
    );
  });
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
    REACT_LAZY_TYPE = Symbol.for("react.lazy");
  Symbol.for("react.scope");
  Symbol.for("react.debug_trace_mode");
  const REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
  Symbol.for("react.legacy_hidden");
  Symbol.for("react.cache");
  Symbol.for("react.tracing_marker");
  const MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  let prefix,
    reentry = !1;
  ReactSharedInternals.ReactDebugCurrentFrame;
  const assign = Object.assign,
    isArrayImpl = Array.isArray,
    setTextContent = function (node, text) {
      if (text) {
        const firstChild = node.firstChild;
        if (
          firstChild &&
          firstChild === node.lastChild &&
          3 === firstChild.nodeType
        ) {
          firstChild.nodeValue = text;
          return;
        }
      }
      node.textContent = text;
    },
    isUnitlessNumber = {
      animationIterationCount: !0,
      aspectRatio: !0,
      borderImageOutset: !0,
      borderImageSlice: !0,
      borderImageWidth: !0,
      boxFlex: !0,
      boxFlexGroup: !0,
      boxOrdinalGroup: !0,
      columnCount: !0,
      columns: !0,
      flex: !0,
      flexGrow: !0,
      flexPositive: !0,
      flexShrink: !0,
      flexNegative: !0,
      flexOrder: !0,
      gridArea: !0,
      gridRow: !0,
      gridRowEnd: !0,
      gridRowSpan: !0,
      gridRowStart: !0,
      gridColumn: !0,
      gridColumnEnd: !0,
      gridColumnSpan: !0,
      gridColumnStart: !0,
      fontWeight: !0,
      lineClamp: !0,
      lineHeight: !0,
      opacity: !0,
      order: !0,
      orphans: !0,
      tabSize: !0,
      widows: !0,
      zIndex: !0,
      zoom: !0,
      fillOpacity: !0,
      floodOpacity: !0,
      stopOpacity: !0,
      strokeDasharray: !0,
      strokeDashoffset: !0,
      strokeMiterlimit: !0,
      strokeOpacity: !0,
      strokeWidth: !0
    },
    prefixes = ["Webkit", "ms", "Moz", "O"];
  Object.keys(isUnitlessNumber).forEach(function (prop) {
    prefixes.forEach(function (prefix) {
      prefix = prefix + prop.charAt(0).toUpperCase() + prop.substring(1);
      isUnitlessNumber[prefix] = isUnitlessNumber[prop];
    });
  });
  const voidElementTags = {
    menuitem: !0,
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    keygen: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0
  };
  let currentReplayingEvent = null,
    restoreImpl = null,
    restoreTarget = null,
    restoreQueue = null,
    batchedUpdatesImpl = function (fn, bookkeeping) {
      return fn(bookkeeping);
    },
    flushSyncImpl = function () {},
    isInsideEventHandler = !1,
    invokeGuardedCallbackImpl = function (name, func, context, ...funcArgs) {
      try {
        func.apply(context, funcArgs);
      } catch (error) {
        this.onError(error);
      }
    },
    hasError = !1,
    caughtError = null,
    hasRethrowError = !1,
    rethrowError = null;
  const reporter = {
      onError(error) {
        hasError = !0;
        caughtError = error;
      }
    },
    {
      unstable_cancelCallback,
      unstable_now,
      unstable_scheduleCallback,
      unstable_shouldYield,
      unstable_requestPaint,
      unstable_getCurrentPriorityLevel,
      unstable_ImmediatePriority,
      unstable_UserBlockingPriority,
      unstable_NormalPriority,
      unstable_LowPriority,
      unstable_IdlePriority
    } =
      React__namespace.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
        .Scheduler;
  ReactSharedInternals.ReactCurrentOwner;
  const scheduleCallback$1 = unstable_scheduleCallback,
    cancelCallback$1 = unstable_cancelCallback,
    shouldYield = unstable_shouldYield,
    requestPaint = unstable_requestPaint,
    now = unstable_now,
    getCurrentPriorityLevel = unstable_getCurrentPriorityLevel,
    ImmediatePriority = unstable_ImmediatePriority,
    UserBlockingPriority = unstable_UserBlockingPriority,
    NormalPriority = unstable_NormalPriority,
    LowPriority = unstable_LowPriority,
    IdlePriority = unstable_IdlePriority;
  let rendererID = null,
    injectedHook = null;
  const clz32 = Math.clz32;
  let nextTransitionLane = 64,
    nextRetryLane = 4194304,
    currentUpdatePriority = 0,
    _attemptSynchronousHydration,
    attemptContinuousHydration$1,
    attemptHydrationAtCurrentPriority$1,
    getCurrentUpdatePriority,
    attemptHydrationAtPriority,
    hasScheduledReplayAttempt = !1;
  const queuedDiscreteEvents = [];
  let queuedFocus = null,
    queuedDrag = null,
    queuedMouse = null;
  const queuedPointers = new Map(),
    queuedPointerCaptures = new Map(),
    queuedExplicitHydrationTargets = [],
    discreteReplayableEvents =
      "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
        " "
      ),
    { ReactCurrentBatchConfig: ReactCurrentBatchConfig$3 } =
      ReactSharedInternals;
  let _enabled = !0,
    return_targetInst = null;
  const EventInterface = {
      eventPhase: 0,
      bubbles: 0,
      cancelable: 0,
      timeStamp: function (event) {
        return event.timeStamp || Date.now();
      },
      defaultPrevented: 0,
      isTrusted: 0
    },
    SyntheticEvent = createSyntheticEvent(EventInterface),
    UIEventInterface = { ...EventInterface, view: 0, detail: 0 },
    SyntheticUIEvent = createSyntheticEvent(UIEventInterface);
  let lastMovementX, lastMovementY, lastMouseEvent;
  const MouseEventInterface = {
      ...UIEventInterface,
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      getModifierState: getEventModifierState,
      button: 0,
      buttons: 0,
      relatedTarget: function (event) {
        return void 0 === event.relatedTarget
          ? event.fromElement === event.srcElement
            ? event.toElement
            : event.fromElement
          : event.relatedTarget;
      },
      movementX: function (event) {
        if ("movementX" in event) return event.movementX;
        event !== lastMouseEvent &&
          (lastMouseEvent && "mousemove" === event.type
            ? ((lastMovementX = event.screenX - lastMouseEvent.screenX),
              (lastMovementY = event.screenY - lastMouseEvent.screenY))
            : (lastMovementY = lastMovementX = 0),
          (lastMouseEvent = event));
        return lastMovementX;
      },
      movementY: function (event) {
        return "movementY" in event ? event.movementY : lastMovementY;
      }
    },
    SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface),
    SyntheticDragEvent = createSyntheticEvent({
      ...MouseEventInterface,
      dataTransfer: 0
    }),
    SyntheticFocusEvent = createSyntheticEvent({
      ...UIEventInterface,
      relatedTarget: 0
    }),
    SyntheticAnimationEvent = createSyntheticEvent({
      ...EventInterface,
      animationName: 0,
      elapsedTime: 0,
      pseudoElement: 0
    }),
    SyntheticClipboardEvent = createSyntheticEvent({
      ...EventInterface,
      clipboardData: function (event) {
        return "clipboardData" in event
          ? event.clipboardData
          : window.clipboardData;
      }
    }),
    SyntheticCompositionEvent = createSyntheticEvent({
      ...EventInterface,
      data: 0
    }),
    SyntheticInputEvent = SyntheticCompositionEvent,
    normalizeKey = {
      Esc: "Escape",
      Spacebar: " ",
      Left: "ArrowLeft",
      Up: "ArrowUp",
      Right: "ArrowRight",
      Down: "ArrowDown",
      Del: "Delete",
      Win: "OS",
      Menu: "ContextMenu",
      Apps: "ContextMenu",
      Scroll: "ScrollLock",
      MozPrintableKey: "Unidentified"
    },
    translateToKey = {
      8: "Backspace",
      9: "Tab",
      12: "Clear",
      13: "Enter",
      16: "Shift",
      17: "Control",
      18: "Alt",
      19: "Pause",
      20: "CapsLock",
      27: "Escape",
      32: " ",
      33: "PageUp",
      34: "PageDown",
      35: "End",
      36: "Home",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      45: "Insert",
      46: "Delete",
      112: "F1",
      113: "F2",
      114: "F3",
      115: "F4",
      116: "F5",
      117: "F6",
      118: "F7",
      119: "F8",
      120: "F9",
      121: "F10",
      122: "F11",
      123: "F12",
      144: "NumLock",
      145: "ScrollLock",
      224: "Meta"
    },
    modifierKeyToProp = {
      Alt: "altKey",
      Control: "ctrlKey",
      Meta: "metaKey",
      Shift: "shiftKey"
    },
    SyntheticKeyboardEvent = createSyntheticEvent({
      ...UIEventInterface,
      key: function (nativeEvent) {
        if (nativeEvent.key) {
          const key = normalizeKey[nativeEvent.key] || nativeEvent.key;
          if ("Unidentified" !== key) return key;
        }
        return "keypress" === nativeEvent.type
          ? ((nativeEvent = getEventCharCode(nativeEvent)),
            13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent))
          : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type
            ? translateToKey[nativeEvent.keyCode] || "Unidentified"
            : "";
      },
      code: 0,
      location: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      repeat: 0,
      locale: 0,
      getModifierState: getEventModifierState,
      charCode: function (event) {
        return "keypress" === event.type ? getEventCharCode(event) : 0;
      },
      keyCode: function (event) {
        return "keydown" === event.type || "keyup" === event.type
          ? event.keyCode
          : 0;
      },
      which: function (event) {
        return "keypress" === event.type
          ? getEventCharCode(event)
          : "keydown" === event.type || "keyup" === event.type
            ? event.keyCode
            : 0;
      }
    }),
    SyntheticPointerEvent = createSyntheticEvent({
      ...MouseEventInterface,
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tangentialPressure: 0,
      tiltX: 0,
      tiltY: 0,
      twist: 0,
      pointerType: 0,
      isPrimary: 0
    }),
    SyntheticTouchEvent = createSyntheticEvent({
      ...UIEventInterface,
      touches: 0,
      targetTouches: 0,
      changedTouches: 0,
      altKey: 0,
      metaKey: 0,
      ctrlKey: 0,
      shiftKey: 0,
      getModifierState: getEventModifierState
    }),
    SyntheticTransitionEvent = createSyntheticEvent({
      ...EventInterface,
      propertyName: 0,
      elapsedTime: 0,
      pseudoElement: 0
    }),
    SyntheticWheelEvent = createSyntheticEvent({
      ...MouseEventInterface,
      deltaX(event) {
        return "deltaX" in event
          ? event.deltaX
          : "wheelDeltaX" in event
            ? -event.wheelDeltaX
            : 0;
      },
      deltaY(event) {
        return "deltaY" in event
          ? event.deltaY
          : "wheelDeltaY" in event
            ? -event.wheelDeltaY
            : "wheelDelta" in event
              ? -event.wheelDelta
              : 0;
      },
      deltaZ: 0,
      deltaMode: 0
    }),
    canUseTextInputEvent = "TextEvent" in window && !0,
    SPACEBAR_CHAR = String.fromCharCode(32);
  let hasSpaceKeypress = !1;
  const supportedInputTypes = {
      color: !0,
      date: !0,
      datetime: !0,
      "datetime-local": !0,
      email: !0,
      month: !0,
      number: !0,
      password: !0,
      range: !0,
      search: !0,
      tel: !0,
      text: !0,
      time: !0,
      url: !0,
      week: !0
    },
    objectIs = "function" === typeof Object.is ? Object.is : is,
    skipSelectionChangeEvent =
      "documentMode" in document && 11 >= document.documentMode;
  let activeElement = null,
    activeElementInst = null,
    lastSelection = null,
    mouseDown = !1;
  const vendorPrefixes = {
      animationend: makePrefixMap("Animation", "AnimationEnd"),
      animationiteration: makePrefixMap("Animation", "AnimationIteration"),
      animationstart: makePrefixMap("Animation", "AnimationStart"),
      transitionend: makePrefixMap("Transition", "TransitionEnd")
    },
    prefixedEventNames = {},
    { style } = document.createElement("div"),
    ANIMATION_END = getVendorPrefixedEventName("animationend"),
    ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration"),
    ANIMATION_START = getVendorPrefixedEventName("animationstart"),
    TRANSITION_END = getVendorPrefixedEventName("transitionend"),
    topLevelEventsToReactNames = new Map(),
    simpleEventPluginEvents =
      "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
        " "
      );
  (function () {
    for (let i = 0; i < simpleEventPluginEvents.length; i++) {
      var eventName = simpleEventPluginEvents[i];
      const domEventName = eventName.toLowerCase();
      eventName = eventName[0].toUpperCase() + eventName.slice(1);
      registerSimpleEvent(domEventName, "on" + eventName);
    }
    registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
    registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
    registerSimpleEvent(ANIMATION_START, "onAnimationStart");
    registerSimpleEvent("dblclick", "onDoubleClick");
    registerSimpleEvent("focusin", "onFocus");
    registerSimpleEvent("focusout", "onBlur");
    registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
  })();
  registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
  registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
  registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
  registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
  registerTwoPhaseEvent(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(
      " "
    )
  );
  registerTwoPhaseEvent(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  );
  registerTwoPhaseEvent("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]);
  registerTwoPhaseEvent(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  const mediaEventTypes =
      "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
        " "
      ),
    nonDelegatedEvents = new Set([
      "cancel",
      "close",
      "invalid",
      "load",
      "scroll",
      "toggle",
      ...mediaEventTypes
    ]),
    listeningMarker = "_reactListening" + Math.random().toString(36).slice(2),
    NORMALIZE_NEWLINES_REGEX = /\r\n?/g,
    NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
  let eventsEnabled = null,
    selectionInformation = null;
  const scheduleTimeout = setTimeout,
    cancelTimeout = clearTimeout,
    scheduleMicrotask = queueMicrotask,
    randomKey = Math.random().toString(36).slice(2),
    internalInstanceKey = "__reactFiber$" + randomKey,
    internalPropsKey = "__reactProps$" + randomKey,
    internalContainerInstanceKey = "__reactContainer$" + randomKey,
    internalEventHandlersKey = "__reactEvents$" + randomKey,
    internalEventHandlerListenersKey = "__reactListeners$" + randomKey,
    internalEventHandlesSetKey = "__reactHandles$" + randomKey;
  ReactSharedInternals.ReactDebugCurrentFrame;
  const valueStack = [];
  let index = -1;
  const emptyContextObject = {},
    contextStackCursor$1 = createCursor(emptyContextObject),
    didPerformWorkStackCursor = createCursor(!1);
  let previousContext = emptyContextObject,
    syncQueue = null,
    includesLegacySyncCallbacks = !1,
    isFlushingSyncQueue = !1;
  const forkStack = [];
  let forkStackIndex = 0,
    treeForkProvider = null,
    treeForkCount = 0;
  const idStack = [];
  let idStackIndex = 0,
    treeContextProvider = null,
    treeContextId = 1,
    treeContextOverflow = "",
    hydrationParentFiber = null,
    nextHydratableInstance = null,
    isHydrating = !1,
    hydrationErrors = null;
  const { ReactCurrentBatchConfig: ReactCurrentBatchConfig$2 } =
      ReactSharedInternals,
    reconcileChildFibers = ChildReconciler(!0),
    mountChildFibers = ChildReconciler(!1),
    valueCursor = createCursor(null);
  let currentlyRenderingFiber$1 = null,
    lastContextDependency = null,
    lastFullyObservedContext = null,
    concurrentQueues = null;
  const unsafe_markUpdateLaneFromFiberToRoot = markUpdateLaneFromFiberToRoot;
  let hasForceUpdate = !1;
  const NO_CONTEXT = {},
    contextStackCursor = createCursor(NO_CONTEXT),
    contextFiberStackCursor = createCursor(NO_CONTEXT),
    rootInstanceStackCursor = createCursor(NO_CONTEXT),
    suspenseStackCursor = createCursor(0),
    workInProgressSources = [],
    {
      ReactCurrentDispatcher: ReactCurrentDispatcher$1,
      ReactCurrentBatchConfig: ReactCurrentBatchConfig$1
    } = ReactSharedInternals;
  let renderLanes = 0,
    currentlyRenderingFiber = null,
    currentHook = null,
    workInProgressHook = null,
    didScheduleRenderPhaseUpdate = !1,
    didScheduleRenderPhaseUpdateDuringThisPass = !1,
    localIdCounter = 0,
    globalClientIdCounter = 0;
  const ContextOnlyDispatcher = {
      readContext,
      useCallback: throwInvalidHookError,
      useContext: throwInvalidHookError,
      useEffect: throwInvalidHookError,
      useImperativeHandle: throwInvalidHookError,
      useInsertionEffect: throwInvalidHookError,
      useLayoutEffect: throwInvalidHookError,
      useMemo: throwInvalidHookError,
      useReducer: throwInvalidHookError,
      useRef: throwInvalidHookError,
      useState: throwInvalidHookError,
      useDebugValue: throwInvalidHookError,
      useDeferredValue: throwInvalidHookError,
      useTransition: throwInvalidHookError,
      useMutableSource: throwInvalidHookError,
      useSyncExternalStore: throwInvalidHookError,
      useId: throwInvalidHookError,
      unstable_isNewReconciler: !1
    },
    HooksDispatcherOnMount = {
      readContext,
      useCallback: function (callback, deps) {
        mountWorkInProgressHook().memoizedState = [
          callback,
          void 0 === deps ? null : deps
        ];
        return callback;
      },
      useContext: readContext,
      useEffect: mountEffect,
      useImperativeHandle: function (ref, create, deps) {
        deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
        return mountEffectImpl(
          4194308,
          4,
          imperativeHandleEffect.bind(null, create, ref),
          deps
        );
      },
      useLayoutEffect: function (create, deps) {
        return mountEffectImpl(4194308, 4, create, deps);
      },
      useInsertionEffect: function (create, deps) {
        return mountEffectImpl(4, 2, create, deps);
      },
      useMemo: function (nextCreate, deps) {
        const hook = mountWorkInProgressHook();
        deps = void 0 === deps ? null : deps;
        nextCreate = nextCreate();
        hook.memoizedState = [nextCreate, deps];
        return nextCreate;
      },
      useReducer: function (reducer, initialArg, init) {
        const hook = mountWorkInProgressHook();
        initialArg = void 0 !== init ? init(initialArg) : initialArg;
        hook.memoizedState = hook.baseState = initialArg;
        reducer = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: reducer,
          lastRenderedState: initialArg
        };
        hook.queue = reducer;
        reducer = reducer.dispatch = dispatchReducerAction.bind(
          null,
          currentlyRenderingFiber,
          reducer
        );
        return [hook.memoizedState, reducer];
      },
      useRef: function (initialValue) {
        const hook = mountWorkInProgressHook();
        initialValue = { current: initialValue };
        return (hook.memoizedState = initialValue);
      },
      useState: mountState,
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value) {
        return (mountWorkInProgressHook().memoizedState = value);
      },
      useTransition: function () {
        const [isPending, setPending] = mountState(!1),
          start = startTransition.bind(null, setPending);
        mountWorkInProgressHook().memoizedState = start;
        return [isPending, start];
      },
      useMutableSource: function (source, getSnapshot, subscribe) {},
      useSyncExternalStore: function (
        subscribe,
        getSnapshot,
        getServerSnapshot
      ) {
        const fiber = currentlyRenderingFiber,
          hook = mountWorkInProgressHook();
        if (isHydrating) {
          if (void 0 === getServerSnapshot)
            throw Error(
              "Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering."
            );
          getServerSnapshot = getServerSnapshot();
        } else {
          getServerSnapshot = getSnapshot();
          if (null === workInProgressRoot)
            throw Error(
              "Expected a work-in-progress root. This is a bug in React. Please file an issue."
            );
          0 !== (renderLanes & 30) ||
            pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
        }
        hook.memoizedState = getServerSnapshot;
        const inst = { value: getServerSnapshot, getSnapshot };
        hook.queue = inst;
        mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
          subscribe
        ]);
        fiber.flags |= 2048;
        pushEffect(
          9,
          updateStoreInstance.bind(
            null,
            fiber,
            inst,
            getServerSnapshot,
            getSnapshot
          ),
          void 0,
          null
        );
        return getServerSnapshot;
      },
      useId: function () {
        const hook = mountWorkInProgressHook();
        var identifierPrefix = workInProgressRoot.identifierPrefix;
        if (isHydrating) {
          var JSCompiler_inline_result = treeContextOverflow;
          const idWithLeadingBit = treeContextId;
          JSCompiler_inline_result =
            (
              idWithLeadingBit & ~(1 << (32 - clz32(idWithLeadingBit) - 1))
            ).toString(32) + JSCompiler_inline_result;
          identifierPrefix =
            ":" + identifierPrefix + "R" + JSCompiler_inline_result;
          JSCompiler_inline_result = localIdCounter++;
          0 < JSCompiler_inline_result &&
            (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
          identifierPrefix += ":";
        } else
          (JSCompiler_inline_result = globalClientIdCounter++),
            (identifierPrefix =
              ":" +
              identifierPrefix +
              "r" +
              JSCompiler_inline_result.toString(32) +
              ":");
        return (hook.memoizedState = identifierPrefix);
      },
      unstable_isNewReconciler: !1
    },
    HooksDispatcherOnUpdate = {
      readContext,
      useCallback: updateCallback,
      useContext: readContext,
      useEffect: updateEffect,
      useImperativeHandle: updateImperativeHandle,
      useInsertionEffect: updateInsertionEffect,
      useLayoutEffect: updateLayoutEffect,
      useMemo: updateMemo,
      useReducer: updateReducer,
      useRef: updateRef,
      useState: function (initialState) {
        return updateReducer(basicStateReducer);
      },
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value) {
        const hook = updateWorkInProgressHook();
        return updateDeferredValueImpl(hook, currentHook.memoizedState, value);
      },
      useTransition: function () {
        const [isPending] = updateReducer(basicStateReducer),
          start = updateWorkInProgressHook().memoizedState;
        return [isPending, start];
      },
      useMutableSource: updateMutableSource,
      useSyncExternalStore: updateSyncExternalStore,
      useId: updateId,
      unstable_isNewReconciler: !1
    },
    HooksDispatcherOnRerender = {
      readContext,
      useCallback: updateCallback,
      useContext: readContext,
      useEffect: updateEffect,
      useImperativeHandle: updateImperativeHandle,
      useInsertionEffect: updateInsertionEffect,
      useLayoutEffect: updateLayoutEffect,
      useMemo: updateMemo,
      useReducer: rerenderReducer,
      useRef: updateRef,
      useState: function (initialState) {
        return rerenderReducer(basicStateReducer);
      },
      useDebugValue: mountDebugValue,
      useDeferredValue: function (value) {
        const hook = updateWorkInProgressHook();
        return null === currentHook
          ? (hook.memoizedState = value)
          : updateDeferredValueImpl(hook, currentHook.memoizedState, value);
      },
      useTransition: function () {
        const [isPending] = rerenderReducer(basicStateReducer),
          start = updateWorkInProgressHook().memoizedState;
        return [isPending, start];
      },
      useMutableSource: updateMutableSource,
      useSyncExternalStore: updateSyncExternalStore,
      useId: updateId,
      unstable_isNewReconciler: !1
    },
    classComponentUpdater = {
      isMounted: function (component) {
        return (component = component._reactInternals)
          ? getNearestMountedFiber(component) === component
          : !1;
      },
      enqueueSetState(inst, payload, callback) {
        inst = inst._reactInternals;
        const eventTime = requestEventTime(),
          lane = requestUpdateLane(inst),
          update = createUpdate(eventTime, lane);
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane, eventTime),
          entangleTransitions(payload, inst, lane));
      },
      enqueueReplaceState(inst, payload, callback) {
        inst = inst._reactInternals;
        const eventTime = requestEventTime(),
          lane = requestUpdateLane(inst),
          update = createUpdate(eventTime, lane);
        update.tag = 1;
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane, eventTime),
          entangleTransitions(payload, inst, lane));
      },
      enqueueForceUpdate(inst, callback) {
        inst = inst._reactInternals;
        const eventTime = requestEventTime(),
          lane = requestUpdateLane(inst),
          update = createUpdate(eventTime, lane);
        update.tag = 2;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        callback = enqueueUpdate(inst, update, lane);
        null !== callback &&
          (scheduleUpdateOnFiber(callback, inst, lane, eventTime),
          entangleTransitions(callback, inst, lane));
      }
    },
    PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map,
    ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
  let didReceiveUpdate = !1;
  const SUSPENDED_MARKER = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0
  };
  let appendAllChildren,
    updateHostContainer,
    updateHostComponent,
    updateHostText;
  appendAllChildren = function (
    parent,
    workInProgress,
    needsVisibilityToggle,
    isHidden
  ) {
    for (
      needsVisibilityToggle = workInProgress.child;
      null !== needsVisibilityToggle;

    ) {
      if (5 === needsVisibilityToggle.tag || 6 === needsVisibilityToggle.tag)
        parent.appendChild(needsVisibilityToggle.stateNode);
      else if (
        4 !== needsVisibilityToggle.tag &&
        null !== needsVisibilityToggle.child
      ) {
        needsVisibilityToggle.child.return = needsVisibilityToggle;
        needsVisibilityToggle = needsVisibilityToggle.child;
        continue;
      }
      if (needsVisibilityToggle === workInProgress) break;
      for (; null === needsVisibilityToggle.sibling; ) {
        if (
          null === needsVisibilityToggle.return ||
          needsVisibilityToggle.return === workInProgress
        )
          return;
        needsVisibilityToggle = needsVisibilityToggle.return;
      }
      needsVisibilityToggle.sibling.return = needsVisibilityToggle.return;
      needsVisibilityToggle = needsVisibilityToggle.sibling;
    }
  };
  updateHostContainer = function (current, workInProgress) {};
  updateHostComponent = function (
    current,
    workInProgress,
    type,
    newProps,
    rootContainerInstance
  ) {
    var oldProps = current.memoizedProps;
    if (oldProps !== newProps) {
      current = workInProgress.stateNode;
      requiredContext(contextStackCursor.current);
      rootContainerInstance = null;
      switch (type) {
        case "input":
          oldProps = getHostProps$2(current, oldProps);
          newProps = getHostProps$2(current, newProps);
          rootContainerInstance = [];
          break;
        case "select":
          oldProps = assign({}, oldProps, { value: void 0 });
          newProps = assign({}, newProps, { value: void 0 });
          rootContainerInstance = [];
          break;
        case "textarea":
          oldProps = getHostProps(current, oldProps);
          newProps = getHostProps(current, newProps);
          rootContainerInstance = [];
          break;
        default:
          "function" !== typeof oldProps.onClick &&
            "function" === typeof newProps.onClick &&
            (current.onclick = noop);
      }
      assertValidProps(type, newProps);
      let styleName;
      type = null;
      for (JSCompiler_inline_result in oldProps)
        if (
          !newProps.hasOwnProperty(JSCompiler_inline_result) &&
          oldProps.hasOwnProperty(JSCompiler_inline_result) &&
          null != oldProps[JSCompiler_inline_result]
        )
          if ("style" === JSCompiler_inline_result) {
            var lastStyle = oldProps[JSCompiler_inline_result];
            for (styleName in lastStyle)
              lastStyle.hasOwnProperty(styleName) &&
                (type || (type = {}), (type[styleName] = ""));
          } else
            "children" !== JSCompiler_inline_result &&
              "suppressContentEditableWarning" !== JSCompiler_inline_result &&
              "suppressHydrationWarning" !== JSCompiler_inline_result &&
              "autoFocus" !== JSCompiler_inline_result &&
              (registrationNameDependencies.hasOwnProperty(
                JSCompiler_inline_result
              )
                ? rootContainerInstance || (rootContainerInstance = [])
                : (rootContainerInstance = rootContainerInstance || []).push(
                    JSCompiler_inline_result,
                    null
                  ));
      for (JSCompiler_inline_result in newProps) {
        lastStyle = newProps[JSCompiler_inline_result];
        const lastProp =
          null != oldProps ? oldProps[JSCompiler_inline_result] : void 0;
        if (
          newProps.hasOwnProperty(JSCompiler_inline_result) &&
          lastStyle !== lastProp &&
          (null != lastStyle || null != lastProp)
        )
          if ("style" === JSCompiler_inline_result)
            if (lastProp) {
              for (styleName in lastProp)
                !lastProp.hasOwnProperty(styleName) ||
                  (lastStyle && lastStyle.hasOwnProperty(styleName)) ||
                  (type || (type = {}), (type[styleName] = ""));
              for (styleName in lastStyle)
                lastStyle.hasOwnProperty(styleName) &&
                  lastProp[styleName] !== lastStyle[styleName] &&
                  (type || (type = {}),
                  (type[styleName] = lastStyle[styleName]));
            } else
              type ||
                (rootContainerInstance || (rootContainerInstance = []),
                rootContainerInstance.push(JSCompiler_inline_result, type)),
                (type = lastStyle);
          else
            "children" === JSCompiler_inline_result
              ? ("string" !== typeof lastStyle &&
                  "number" !== typeof lastStyle) ||
                (rootContainerInstance = rootContainerInstance || []).push(
                  JSCompiler_inline_result,
                  "" + lastStyle
                )
              : "suppressContentEditableWarning" !== JSCompiler_inline_result &&
                "suppressHydrationWarning" !== JSCompiler_inline_result &&
                (registrationNameDependencies.hasOwnProperty(
                  JSCompiler_inline_result
                )
                  ? (null != lastStyle &&
                      "onScroll" === JSCompiler_inline_result &&
                      listenToNonDelegatedEvent("scroll", current),
                    rootContainerInstance ||
                      lastProp === lastStyle ||
                      (rootContainerInstance = []))
                  : (rootContainerInstance = rootContainerInstance || []).push(
                      JSCompiler_inline_result,
                      lastStyle
                    ));
      }
      type &&
        (rootContainerInstance = rootContainerInstance || []).push(
          "style",
          type
        );
      var JSCompiler_inline_result = rootContainerInstance;
      if ((workInProgress.updateQueue = JSCompiler_inline_result))
        workInProgress.flags |= 4;
    }
  };
  updateHostText = function (current, workInProgress, oldText, newText) {
    oldText !== newText && (workInProgress.flags |= 4);
  };
  let offscreenSubtreeIsHidden = !1,
    offscreenSubtreeWasHidden = !1;
  const PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set;
  let nextEffect = null,
    shouldFireAfterActiveInstanceBlur = !1,
    hostParent = null,
    hostParentIsContainer = !1;
  const ceil = Math.ceil,
    { ReactCurrentDispatcher, ReactCurrentOwner, ReactCurrentBatchConfig } =
      ReactSharedInternals;
  let executionContext = 0,
    workInProgressRoot = null,
    workInProgress = null,
    workInProgressRootRenderLanes = 0,
    subtreeRenderLanes = 0;
  const subtreeRenderLanesCursor = createCursor(0);
  let workInProgressRootExitStatus = 0,
    workInProgressRootFatalError = null,
    workInProgressRootSkippedLanes = 0,
    workInProgressRootInterleavedUpdatedLanes = 0,
    workInProgressRootPingedLanes = 0,
    workInProgressRootConcurrentErrors = null,
    workInProgressRootRecoverableErrors = null,
    globalMostRecentFallbackTime = 0,
    workInProgressRootRenderTargetTime = Infinity,
    workInProgressTransitions = null,
    hasUncaughtError = !1,
    firstUncaughtError = null,
    legacyErrorBoundariesThatAlreadyFailed = null,
    rootDoesHavePassiveEffects = !1,
    rootWithPendingPassiveEffects = null,
    pendingPassiveEffectsLanes = 0,
    nestedUpdateCount = 0,
    rootWithNestedUpdates = null,
    currentEventTime = -1,
    currentEventTransitionLane = 0,
    beginWork;
  beginWork = function (current, workInProgress, renderLanes) {
    if (null !== current)
      if (
        current.memoizedProps !== workInProgress.pendingProps ||
        didPerformWorkStackCursor.current
      )
        didReceiveUpdate = !0;
      else {
        if (
          0 === (current.lanes & renderLanes) &&
          0 === (workInProgress.flags & 128)
        )
          return (
            (didReceiveUpdate = !1),
            attemptEarlyBailoutIfNoScheduledUpdate(
              current,
              workInProgress,
              renderLanes
            )
          );
        didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
      }
    else
      (didReceiveUpdate = !1),
        isHydrating &&
          0 !== (workInProgress.flags & 1048576) &&
          pushTreeId(workInProgress, treeForkCount, workInProgress.index);
    workInProgress.lanes = 0;
    switch (workInProgress.tag) {
      case 2:
        var Component = workInProgress.type;
        resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress);
        current = workInProgress.pendingProps;
        var context = getMaskedContext(
          workInProgress,
          contextStackCursor$1.current
        );
        prepareToReadContext(workInProgress, renderLanes);
        context = renderWithHooks(
          null,
          workInProgress,
          Component,
          current,
          context,
          renderLanes
        );
        var hasId = checkDidRenderIdHook();
        workInProgress.flags |= 1;
        "object" === typeof context &&
        null !== context &&
        "function" === typeof context.render &&
        void 0 === context.$$typeof
          ? ((workInProgress.tag = 1),
            (workInProgress.memoizedState = null),
            (workInProgress.updateQueue = null),
            isContextProvider(Component)
              ? ((hasId = !0), pushContextProvider(workInProgress))
              : (hasId = !1),
            (workInProgress.memoizedState =
              null !== context.state && void 0 !== context.state
                ? context.state
                : null),
            initializeUpdateQueue(workInProgress),
            (context.updater = classComponentUpdater),
            (workInProgress.stateNode = context),
            (context._reactInternals = workInProgress),
            mountClassInstance(workInProgress, Component, current, renderLanes),
            (workInProgress = finishClassComponent(
              null,
              workInProgress,
              Component,
              !0,
              hasId,
              renderLanes
            )))
          : ((workInProgress.tag = 0),
            isHydrating && hasId && pushMaterializedTreeId(workInProgress),
            reconcileChildren(null, workInProgress, context, renderLanes),
            (workInProgress = workInProgress.child));
        return workInProgress;
      case 16:
        a: {
          Component = workInProgress.elementType;
          resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress);
          current = workInProgress.pendingProps;
          context = Component._init;
          Component = context(Component._payload);
          workInProgress.type = Component;
          context = workInProgress.tag = resolveLazyComponentTag(Component);
          current = resolveDefaultProps(Component, current);
          switch (context) {
            case 0:
              workInProgress = updateFunctionComponent(
                null,
                workInProgress,
                Component,
                current,
                renderLanes
              );
              break a;
            case 1:
              workInProgress = updateClassComponent(
                null,
                workInProgress,
                Component,
                current,
                renderLanes
              );
              break a;
            case 11:
              workInProgress = updateForwardRef(
                null,
                workInProgress,
                Component,
                current,
                renderLanes
              );
              break a;
            case 14:
              workInProgress = updateMemoComponent(
                null,
                workInProgress,
                Component,
                resolveDefaultProps(Component.type, current),
                renderLanes
              );
              break a;
          }
          throw Error(
            `Element type is invalid. Received a promise that resolves to: ${Component}. ` +
              "Lazy element type must resolve to a class or function."
          );
        }
        return workInProgress;
      case 0:
        return (
          (Component = workInProgress.type),
          (context = workInProgress.pendingProps),
          (context =
            workInProgress.elementType === Component
              ? context
              : resolveDefaultProps(Component, context)),
          updateFunctionComponent(
            current,
            workInProgress,
            Component,
            context,
            renderLanes
          )
        );
      case 1:
        return (
          (Component = workInProgress.type),
          (context = workInProgress.pendingProps),
          (context =
            workInProgress.elementType === Component
              ? context
              : resolveDefaultProps(Component, context)),
          updateClassComponent(
            current,
            workInProgress,
            Component,
            context,
            renderLanes
          )
        );
      case 3:
        a: {
          pushHostRootContext(workInProgress);
          if (null === current)
            throw Error("Should have a current fiber. This is a bug in React.");
          Component = workInProgress.pendingProps;
          hasId = workInProgress.memoizedState;
          context = hasId.element;
          cloneUpdateQueue(current, workInProgress);
          processUpdateQueue(workInProgress, Component, null, renderLanes);
          var nextState = workInProgress.memoizedState;
          workInProgress.stateNode;
          Component = nextState.element;
          if (hasId.isDehydrated)
            if (
              ((hasId = {
                element: Component,
                isDehydrated: !1,
                cache: nextState.cache,
                pendingSuspenseBoundaries: nextState.pendingSuspenseBoundaries,
                transitions: nextState.transitions
              }),
              (workInProgress.updateQueue.baseState = hasId),
              (workInProgress.memoizedState = hasId),
              workInProgress.flags & 256)
            ) {
              context = createCapturedValueAtFiber(
                Error(
                  "There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering."
                ),
                workInProgress
              );
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                Component,
                renderLanes,
                context
              );
              break a;
            } else if (Component !== context) {
              context = createCapturedValueAtFiber(
                Error(
                  "This root received an early update, before anything was able hydrate. Switched the entire root to client rendering."
                ),
                workInProgress
              );
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                Component,
                renderLanes,
                context
              );
              break a;
            } else
              for (
                nextHydratableInstance = getNextHydratable(
                  workInProgress.stateNode.containerInfo.firstChild
                ),
                  hydrationParentFiber = workInProgress,
                  isHydrating = !0,
                  hydrationErrors = null,
                  renderLanes = mountChildFibers(
                    workInProgress,
                    null,
                    Component,
                    renderLanes
                  ),
                  workInProgress.child = renderLanes;
                renderLanes;

              )
                (renderLanes.flags = (renderLanes.flags & -3) | 4096),
                  (renderLanes = renderLanes.sibling);
          else {
            resetHydrationState();
            if (Component === context) {
              workInProgress = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress,
                renderLanes
              );
              break a;
            }
            reconcileChildren(current, workInProgress, Component, renderLanes);
          }
          workInProgress = workInProgress.child;
        }
        return workInProgress;
      case 5:
        return (
          pushHostContext(workInProgress),
          null === current && tryToClaimNextHydratableInstance(workInProgress),
          (Component = workInProgress.type),
          (context = workInProgress.pendingProps),
          (hasId = null !== current ? current.memoizedProps : null),
          (nextState = context.children),
          shouldSetTextContent(Component, context)
            ? (nextState = null)
            : null !== hasId &&
              shouldSetTextContent(Component, hasId) &&
              (workInProgress.flags |= 32),
          markRef$1(current, workInProgress),
          reconcileChildren(current, workInProgress, nextState, renderLanes),
          workInProgress.child
        );
      case 6:
        return (
          null === current && tryToClaimNextHydratableInstance(workInProgress),
          null
        );
      case 13:
        return updateSuspenseComponent(current, workInProgress, renderLanes);
      case 4:
        return (
          pushHostContainer(
            workInProgress,
            workInProgress.stateNode.containerInfo
          ),
          (Component = workInProgress.pendingProps),
          null === current
            ? (workInProgress.child = reconcileChildFibers(
                workInProgress,
                null,
                Component,
                renderLanes
              ))
            : reconcileChildren(
                current,
                workInProgress,
                Component,
                renderLanes
              ),
          workInProgress.child
        );
      case 11:
        return (
          (Component = workInProgress.type),
          (context = workInProgress.pendingProps),
          (context =
            workInProgress.elementType === Component
              ? context
              : resolveDefaultProps(Component, context)),
          updateForwardRef(
            current,
            workInProgress,
            Component,
            context,
            renderLanes
          )
        );
      case 7:
        return (
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps,
            renderLanes
          ),
          workInProgress.child
        );
      case 8:
        return (
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps.children,
            renderLanes
          ),
          workInProgress.child
        );
      case 12:
        return (
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps.children,
            renderLanes
          ),
          workInProgress.child
        );
      case 10:
        a: {
          context = workInProgress.type._context;
          Component = workInProgress.pendingProps;
          hasId = workInProgress.memoizedProps;
          nextState = Component.value;
          push(valueCursor, context._currentValue);
          context._currentValue = nextState;
          if (null !== hasId)
            if (objectIs(hasId.value, nextState)) {
              if (
                hasId.children === Component.children &&
                !didPerformWorkStackCursor.current
              ) {
                workInProgress = bailoutOnAlreadyFinishedWork(
                  current,
                  workInProgress,
                  renderLanes
                );
                break a;
              }
            } else
              for (
                hasId = workInProgress.child,
                  null !== hasId && (hasId.return = workInProgress);
                null !== hasId;

              ) {
                var list = hasId.dependencies;
                if (null !== list) {
                  nextState = hasId.child;
                  for (
                    var dependency = list.firstContext;
                    null !== dependency;

                  ) {
                    if (dependency.context === context) {
                      if (1 === hasId.tag) {
                        dependency = createUpdate(
                          -1,
                          renderLanes & -renderLanes
                        );
                        dependency.tag = 2;
                        var updateQueue = hasId.updateQueue;
                        if (null !== updateQueue) {
                          updateQueue = updateQueue.shared;
                          const pending = updateQueue.pending;
                          null === pending
                            ? (dependency.next = dependency)
                            : ((dependency.next = pending.next),
                              (pending.next = dependency));
                          updateQueue.pending = dependency;
                        }
                      }
                      hasId.lanes |= renderLanes;
                      dependency = hasId.alternate;
                      null !== dependency && (dependency.lanes |= renderLanes);
                      scheduleContextWorkOnParentPath(
                        hasId.return,
                        renderLanes,
                        workInProgress
                      );
                      list.lanes |= renderLanes;
                      break;
                    }
                    dependency = dependency.next;
                  }
                } else if (10 === hasId.tag)
                  nextState =
                    hasId.type === workInProgress.type ? null : hasId.child;
                else if (18 === hasId.tag) {
                  nextState = hasId.return;
                  if (null === nextState)
                    throw Error(
                      "We just came from a parent so we must have had a parent. This is a bug in React."
                    );
                  nextState.lanes |= renderLanes;
                  list = nextState.alternate;
                  null !== list && (list.lanes |= renderLanes);
                  scheduleContextWorkOnParentPath(
                    nextState,
                    renderLanes,
                    workInProgress
                  );
                  nextState = hasId.sibling;
                } else nextState = hasId.child;
                if (null !== nextState) nextState.return = hasId;
                else
                  for (nextState = hasId; null !== nextState; ) {
                    if (nextState === workInProgress) {
                      nextState = null;
                      break;
                    }
                    hasId = nextState.sibling;
                    if (null !== hasId) {
                      hasId.return = nextState.return;
                      nextState = hasId;
                      break;
                    }
                    nextState = nextState.return;
                  }
                hasId = nextState;
              }
          reconcileChildren(
            current,
            workInProgress,
            Component.children,
            renderLanes
          );
          workInProgress = workInProgress.child;
        }
        return workInProgress;
      case 9:
        return (
          (context = workInProgress.type),
          (Component = workInProgress.pendingProps.children),
          prepareToReadContext(workInProgress, renderLanes),
          (context = readContext(context)),
          (Component = Component(context)),
          (workInProgress.flags |= 1),
          reconcileChildren(current, workInProgress, Component, renderLanes),
          workInProgress.child
        );
      case 14:
        return (
          (Component = workInProgress.type),
          (context = resolveDefaultProps(
            Component,
            workInProgress.pendingProps
          )),
          (context = resolveDefaultProps(Component.type, context)),
          updateMemoComponent(
            current,
            workInProgress,
            Component,
            context,
            renderLanes
          )
        );
      case 15:
        return updateSimpleMemoComponent(
          current,
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps,
          renderLanes
        );
      case 17:
        return (
          (Component = workInProgress.type),
          (context = workInProgress.pendingProps),
          (context =
            workInProgress.elementType === Component
              ? context
              : resolveDefaultProps(Component, context)),
          resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
          (workInProgress.tag = 1),
          isContextProvider(Component)
            ? ((current = !0), pushContextProvider(workInProgress))
            : (current = !1),
          prepareToReadContext(workInProgress, renderLanes),
          constructClassInstance(workInProgress, Component, context),
          mountClassInstance(workInProgress, Component, context, renderLanes),
          finishClassComponent(
            null,
            workInProgress,
            Component,
            !0,
            current,
            renderLanes
          )
        );
      case 19:
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes
        );
      case 22:
        return updateOffscreenComponent(current, workInProgress, renderLanes);
    }
    throw Error(
      `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
        "React. Please file an issue."
    );
  };
  const createFiber = function (tag, pendingProps, key, mode) {
      return new FiberNode(tag, pendingProps, key, mode);
    },
    defaultOnRecoverableError =
      "function" === typeof reportError
        ? reportError
        : (error) => {
            console.error(error);
          };
  ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render =
    function (children) {
      const root = this._internalRoot;
      if (null === root) throw Error("Cannot update an unmounted root.");
      updateContainer(children, root, null, null);
    };
  ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount =
    function () {
      const root = this._internalRoot;
      if (null !== root) {
        this._internalRoot = null;
        const container = root.containerInfo;
        flushSync$1(() => {
          updateContainer(null, root, null, null);
        });
        container[internalContainerInstanceKey] = null;
      }
    };
  ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function (
    target
  ) {
    if (target) {
      const updatePriority = getCurrentUpdatePriority();
      target = { blockedOn: null, target, priority: updatePriority };
      let i = 0;
      for (
        ;
        i < queuedExplicitHydrationTargets.length &&
        0 !== updatePriority &&
        updatePriority < queuedExplicitHydrationTargets[i].priority;
        i++
      );
      queuedExplicitHydrationTargets.splice(i, 0, target);
      0 === i && attemptExplicitHydrationTarget(target);
    }
  };
  ReactSharedInternals.ReactCurrentOwner;
  _attemptSynchronousHydration = function (fiber) {
    switch (fiber.tag) {
      case 3:
        const root = fiber.stateNode;
        if (root.current.memoizedState.isDehydrated) {
          const lanes = getHighestPriorityLanes(root.pendingLanes);
          0 !== lanes &&
            (markRootEntangled(root, lanes | 1),
            ensureRootIsScheduled(root, now()),
            0 === (executionContext & 6) &&
              (resetRenderTimer(), flushSyncCallbacks()));
        }
        break;
      case 13:
        flushSync$1(() => {
          const root = markUpdateLaneFromFiberToRoot(fiber, 1);
          if (null !== root) {
            const eventTime = requestEventTime();
            scheduleUpdateOnFiber(root, fiber, 1, eventTime);
          }
        }),
          markRetryLaneIfNotHydrated(fiber, 1);
    }
  };
  attemptContinuousHydration$1 = function (fiber) {
    if (13 === fiber.tag) {
      var root = markUpdateLaneFromFiberToRoot(fiber, 134217728);
      if (null !== root) {
        const eventTime = requestEventTime();
        scheduleUpdateOnFiber(root, fiber, 134217728, eventTime);
      }
      markRetryLaneIfNotHydrated(fiber, 134217728);
    }
  };
  attemptHydrationAtCurrentPriority$1 = function (fiber) {
    if (13 === fiber.tag) {
      var lane = requestUpdateLane(fiber),
        root = markUpdateLaneFromFiberToRoot(fiber, lane);
      if (null !== root) {
        const eventTime = requestEventTime();
        scheduleUpdateOnFiber(root, fiber, lane, eventTime);
      }
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  };
  getCurrentUpdatePriority = function () {
    return currentUpdatePriority;
  };
  attemptHydrationAtPriority = runWithPriority;
  restoreImpl = function (domElement, tag, props) {
    switch (tag) {
      case "input":
        updateWrapper$1(domElement, props);
        tag = props.name;
        if ("radio" === props.type && null != tag) {
          for (props = domElement; props.parentNode; ) props = props.parentNode;
          props = props.querySelectorAll(
            "input[name=" + JSON.stringify("" + tag) + '][type="radio"]'
          );
          for (tag = 0; tag < props.length; tag++) {
            const otherNode = props[tag];
            if (otherNode === domElement || otherNode.form !== domElement.form)
              continue;
            const otherProps = getFiberCurrentPropsFromNode(otherNode);
            if (!otherProps)
              throw Error(
                "ReactDOMInput: Mixing React and non-React radio inputs with the same `name` is not supported."
              );
            updateValueIfChanged(otherNode);
            updateWrapper$1(otherNode, otherProps);
          }
        }
        break;
      case "textarea":
        updateWrapper(domElement, props);
        break;
      case "select":
        (tag = props.value),
          null != tag && updateOptions(domElement, !!props.multiple, tag, !1);
    }
  };
  (function (_batchedUpdatesImpl, _discreteUpdatesImpl, _flushSyncImpl) {
    batchedUpdatesImpl = _batchedUpdatesImpl;
    flushSyncImpl = _flushSyncImpl;
  })(
    batchedUpdates,
    function (fn, a, b, c, d) {
      const previousPriority = currentUpdatePriority,
        prevTransition = ReactCurrentBatchConfig.transition;
      try {
        return (
          (ReactCurrentBatchConfig.transition = null),
          (currentUpdatePriority = 1),
          fn(a, b, c, d)
        );
      } finally {
        (currentUpdatePriority = previousPriority),
          (ReactCurrentBatchConfig.transition = prevTransition),
          0 === executionContext && resetRenderTimer();
      }
    },
    flushSync$1
  );
  const Internals = {
    usingClientEntryPoint: !1,
    Events: [
      getInstanceFromNode,
      getNodeFromInstance,
      getFiberCurrentPropsFromNode,
      enqueueStateRestore,
      restoreStateIfNeeded,
      batchedUpdates
    ]
  };
  (function (devToolsConfig) {
    var { findFiberByHostInstance } = devToolsConfig;
    const { ReactCurrentDispatcher } = ReactSharedInternals;
    devToolsConfig = {
      bundleType: devToolsConfig.bundleType,
      version: devToolsConfig.version,
      rendererPackageName: devToolsConfig.rendererPackageName,
      rendererConfig: devToolsConfig.rendererConfig,
      overrideHookState: null,
      overrideHookStateDeletePath: null,
      overrideHookStateRenamePath: null,
      overrideProps: null,
      overridePropsDeletePath: null,
      overridePropsRenamePath: null,
      setErrorHandler: null,
      setSuspenseHandler: null,
      scheduleUpdate: null,
      currentDispatcherRef: ReactCurrentDispatcher,
      findHostInstanceByFiber,
      findFiberByHostInstance:
        findFiberByHostInstance || emptyFindFiberByHostInstance,
      findHostInstancesForRefresh: null,
      scheduleRefresh: null,
      scheduleRoot: null,
      setRefreshHandler: null,
      getCurrentFiber: null,
      reconcilerVersion: "18.3.1"
    };
    if ("undefined" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__)
      devToolsConfig = !1;
    else if (
      ((findFiberByHostInstance = __REACT_DEVTOOLS_GLOBAL_HOOK__),
      findFiberByHostInstance.isDisabled ||
        !findFiberByHostInstance.supportsFiber)
    )
      devToolsConfig = !0;
    else {
      try {
        (rendererID = findFiberByHostInstance.inject(devToolsConfig)),
          (injectedHook = findFiberByHostInstance);
      } catch (err) {}
      devToolsConfig = findFiberByHostInstance.checkDCE ? !0 : !1;
    }
    return devToolsConfig;
  })({
    findFiberByHostInstance: getClosestInstanceFromNode,
    bundleType: 0,
    version: "18.3.1",
    rendererPackageName: "react-dom"
  });
  exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Internals;
  exports.createPortal = function (children, container, key = null) {
    if (!isValidContainer(container))
      throw Error("Target container is not a DOM element.");
    return createPortal$1(children, container, null, key);
  };
  exports.createRoot = function (container, options) {
    if (!isValidContainer(container))
      throw Error("createRoot(...): Target container is not a DOM element.");
    let isStrictMode = !1,
      identifierPrefix = "",
      onRecoverableError = defaultOnRecoverableError;
    null !== options &&
      void 0 !== options &&
      (!0 === options.unstable_strictMode && (isStrictMode = !0),
      void 0 !== options.identifierPrefix &&
        (identifierPrefix = options.identifierPrefix),
      void 0 !== options.onRecoverableError &&
        (onRecoverableError = options.onRecoverableError),
      void 0 !== options.transitionCallbacks && options.transitionCallbacks);
    options = createFiberRoot(
      container,
      1,
      !1,
      null,
      null,
      isStrictMode,
      !1,
      identifierPrefix,
      onRecoverableError
    );
    container[internalContainerInstanceKey] = options.current;
    listenToAllSupportedEvents(
      8 === container.nodeType ? container.parentNode : container
    );
    return new ReactDOMRoot(options);
  };
  exports.findDOMNode = function (componentOrElement) {
    if (null == componentOrElement) return null;
    if (1 === componentOrElement.nodeType) return componentOrElement;
    {
      const fiber = componentOrElement._reactInternals;
      if (void 0 === fiber) {
        if ("function" === typeof componentOrElement.render)
          throw Error("Unable to find node on an unmounted component.");
        componentOrElement = Object.keys(componentOrElement).join(",");
        throw Error(
          `Argument appears to not be a ReactComponent. Keys: ${componentOrElement}`
        );
      }
      componentOrElement = findCurrentHostFiber(fiber);
      componentOrElement =
        null === componentOrElement ? null : componentOrElement.stateNode;
    }
    return componentOrElement;
  };
  exports.flushSync = function (fn) {
    return flushSync$1(fn);
  };
  exports.hydrate = function (element, container, callback) {
    if (!isValidContainerLegacy(container))
      throw Error("Target container is not a DOM element.");
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      !0,
      callback
    );
  };
  exports.hydrateRoot = function (container, initialChildren, options) {
    if (!isValidContainer(container))
      throw Error("hydrateRoot(...): Target container is not a DOM element.");
    const mutableSources = (null != options && options.hydratedSources) || null;
    var isStrictMode = !1,
      identifierPrefix = "";
    let onRecoverableError = defaultOnRecoverableError;
    null !== options &&
      void 0 !== options &&
      (!0 === options.unstable_strictMode && (isStrictMode = !0),
      void 0 !== options.identifierPrefix &&
        (identifierPrefix = options.identifierPrefix),
      void 0 !== options.onRecoverableError &&
        (onRecoverableError = options.onRecoverableError));
    initialChildren = createHydrationContainer(
      initialChildren,
      null,
      container,
      1,
      null != options ? options : null,
      isStrictMode,
      !1,
      identifierPrefix,
      onRecoverableError
    );
    container[internalContainerInstanceKey] = initialChildren.current;
    listenToAllSupportedEvents(container);
    if (mutableSources)
      for (
        isStrictMode = 0;
        isStrictMode < mutableSources.length;
        isStrictMode++
      )
        (container = initialChildren),
          (options = mutableSources[isStrictMode]),
          (identifierPrefix = options._getVersion),
          (identifierPrefix = identifierPrefix(options._source)),
          null == container.mutableSourceEagerHydrationData
            ? (container.mutableSourceEagerHydrationData = [
                options,
                identifierPrefix
              ])
            : container.mutableSourceEagerHydrationData.push(
                options,
                identifierPrefix
              );
    return new ReactDOMHydrationRoot(initialChildren);
  };
  exports.render = function (element, container, callback) {
    if (!isValidContainerLegacy(container))
      throw Error("Target container is not a DOM element.");
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      !1,
      callback
    );
  };
  exports.unmountComponentAtNode = function (container) {
    if (!isValidContainerLegacy(container))
      throw Error(
        "unmountComponentAtNode(...): Target container is not a DOM element."
      );
    return container._reactRootContainer
      ? (flushSync$1(() => {
          legacyRenderSubtreeIntoContainer(null, null, container, !1, () => {
            container._reactRootContainer = null;
            container[internalContainerInstanceKey] = null;
          });
        }),
        !0)
      : !1;
  };
  exports.unstable_batchedUpdates = batchedUpdates;
  exports.unstable_createEventHandle = function (type, options) {
    return null;
  };
  exports.unstable_flushControlled = function (fn) {
    const prevExecutionContext = executionContext;
    executionContext |= 1;
    const prevTransition = ReactCurrentBatchConfig.transition,
      previousPriority = currentUpdatePriority;
    try {
      (ReactCurrentBatchConfig.transition = null),
        (currentUpdatePriority = 1),
        fn();
    } finally {
      (currentUpdatePriority = previousPriority),
        (ReactCurrentBatchConfig.transition = prevTransition),
        (executionContext = prevExecutionContext),
        0 === executionContext && (resetRenderTimer(), flushSyncCallbacks());
    }
  };
  exports.unstable_isNewReconciler = !1;
  exports.unstable_renderSubtreeIntoContainer = function (
    parentComponent,
    element,
    containerNode,
    callback
  ) {
    if (!isValidContainerLegacy(containerNode))
      throw Error("Target container is not a DOM element.");
    if (null == parentComponent || void 0 === parentComponent._reactInternals)
      throw Error("parentComponent must be a valid React Component");
    return legacyRenderSubtreeIntoContainer(
      parentComponent,
      element,
      containerNode,
      !1,
      callback
    );
  };
  exports.unstable_runWithPriority = runWithPriority;
  exports.version = "18.3.1";
});
