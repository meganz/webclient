/*!
 * perfect-scrollbar v1.5.7 - mega.nz build.
 * Copyright 2024 Hyunje Jun, MDBootstrap and Contributors
 * Licensed under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.PerfectScrollbar = factory());
})(this, (function () { 'use strict';

  function get(element) {
    return getComputedStyle(element);
  }

  function set(element, obj) {
    for (const key in obj) {
      let val = obj[key];
      if (typeof val === 'number') {
        val = `${val}px`;
      }
      element.style[key] = val;
    }
    return element;
  }

  function div(className) {
    const div = document.createElement('div');
    div.className = className;
    return div;
  }

  const elMatches =
    typeof Element !== 'undefined' &&
    (Element.prototype.matches ||
      Element.prototype.webkitMatchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector);

  function matches(element, query) {
    if (!elMatches) {
      throw new Error('No element matching method supported');
    }

    return elMatches.call(element, query);
  }

  function remove(element) {
    if (element.remove) {
      element.remove();
    } else {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }

  function queryChildren(element, selector) {
    return Array.prototype.filter.call(element.children, (child) =>
      matches(child, selector)
    );
  }

  const cls = {
    main: 'ps',
    rtl: 'ps__rtl',
    element: {
      thumb: (x) => `ps__thumb-${x}`,
      rail: (x) => `ps__rail-${x}`,
      consuming: 'ps__child--consume',
    },
    state: {
      focus: 'ps--focus',
      clicking: 'ps--clicking',
      active: (x) => `ps--active-${x}`,
      scrolling: (x) => `ps--scrolling-${x}`,
    },
  };

  /*
   * Helper methods
   */
  const scrollingClassTimeout = { x: null, y: null };

  function addScrollingClass(i, x) {
    const classList = i.element.classList;
    const className = cls.state.scrolling(x);

    if (classList.contains(className)) {
      clearTimeout(scrollingClassTimeout[x]);
    } else {
      classList.add(className);
    }
  }

  function removeScrollingClass(i, x) {
    scrollingClassTimeout[x] = setTimeout(
      () => i.isAlive && i.element.classList.remove(cls.state.scrolling(x)),
      i.settings.scrollingThreshold
    );
  }

  function setScrollingClassInstantly(i, x) {
    addScrollingClass(i, x);
    removeScrollingClass(i, x);
  }

  class EventElement {
    constructor(element) {
      this.element = element;
      this.handlers = {};
    }

    bind(eventName, handler) {
      if (typeof this.handlers[eventName] === 'undefined') {
        this.handlers[eventName] = [];
      }
      this.handlers[eventName].push(handler);
      this.element.addEventListener(
        eventName,
        handler,
        EventElement.eventListenerOptions
      );
    }

    unbind(eventName, target) {
      this.handlers[eventName] = this.handlers[eventName].filter((handler) => {
        if (target && handler !== target) {
          return true;
        }
        this.element.removeEventListener(
          eventName,
          handler,
          EventElement.eventListenerOptions
        );
        return false;
      });
    }

    unbindAll() {
      for (const name in this.handlers) {
        this.unbind(name);
      }
    }

    get isEmpty() {
      return Object.keys(this.handlers).every(
        (key) => this.handlers[key].length === 0
      );
    }
  }

  EventElement.eventListenerOptions = Object.assign(
    { passive: false },
    window.evPsOptions
  );

  class EventManager {
    constructor() {
      this.eventElements = [];
    }

    eventElement(element) {
      let ee = this.eventElements.filter((ee) => ee.element === element)[0];
      if (!ee) {
        ee = new EventElement(element);
        this.eventElements.push(ee);
      }
      return ee;
    }

    bind(element, eventName, handler) {
      this.eventElement(element).bind(eventName, handler);
    }

    unbind(element, eventName, handler) {
      const ee = this.eventElement(element);
      ee.unbind(eventName, handler);

      if (ee.isEmpty) {
        // remove
        this.eventElements.splice(this.eventElements.indexOf(ee), 1);
      }
    }

    unbindAll() {
      this.eventElements.forEach((e) => e.unbindAll());
      this.eventElements = [];
    }

    once(element, eventName, handler) {
      const ee = this.eventElement(element);
      const onceHandler = (evt) => {
        ee.unbind(eventName, onceHandler);
        handler(evt);
      };
      ee.bind(eventName, onceHandler);
    }

    preventDefault(ev, stop) {
      if (stop !== false) {
        ev.stopPropagation();
      }
      if (!EventElement.eventListenerOptions.passive) {
        ev.preventDefault();
      }
    }
  }

  function createEvent(name) {
    if (typeof window.CustomEvent === 'function') {
      return new CustomEvent(name);
    } else {
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(name, false, false, undefined);
      return evt;
    }
  }

  function processScrollDiff (
    i,
    axis,
    diff,
    useScrollingClass = true,
    forceFireReachEvent = false
  ) {
    let fields;
    if (axis === 'top') {
      fields = [
        'contentHeight',
        'containerHeight',
        'scrollTop',
        'y',
        'up',
        'down',
      ];
    } else if (axis === 'left') {
      fields = [
        'contentWidth',
        'containerWidth',
        'scrollLeft',
        'x',
        'left',
        'right',
      ];
    } else {
      throw new Error('A proper axis should be provided');
    }

    processScrollDiff$1(i, diff, fields, useScrollingClass, forceFireReachEvent);
  }

  function processScrollDiff$1(
    i,
    diff,
    [contentHeight, containerHeight, scrollTop, y, up, down],
    useScrollingClass = true,
    forceFireReachEvent = false
  ) {
    const element = i.element;

    // reset reach
    i.reach[y] = null;

    // 1 for subpixel rounding
    if (element[scrollTop] < 1) {
      i.reach[y] = 'start';
    }

    // 1 for subpixel rounding
    if (element[scrollTop] > i[contentHeight] - i[containerHeight] - 1) {
      i.reach[y] = 'end';
    }

    if (diff) {
      element.dispatchEvent(createEvent(`ps-scroll-${y}`));

      if (diff < 0) {
        element.dispatchEvent(createEvent(`ps-scroll-${up}`));
      } else if (diff > 0) {
        element.dispatchEvent(createEvent(`ps-scroll-${down}`));
      }

      if (useScrollingClass) {
        setScrollingClassInstantly(i, y);
      }
    }

    if (i.reach[y] && (diff || forceFireReachEvent)) {
      element.dispatchEvent(createEvent(`ps-${y}-reach-${i.reach[y]}`));
    }
  }

  function toInt(x) {
    return parseInt(x, 10) || 0;
  }

  function isEditable(el) {
    return (
      matches(el, 'input,[contenteditable]') ||
      matches(el, 'select,[contenteditable]') ||
      matches(el, 'textarea,[contenteditable]') ||
      matches(el, 'button,[contenteditable]')
    );
  }

  function outerWidth(element) {
    const styles = get(element);
    return (
      toInt(styles.width) +
      toInt(styles.paddingLeft) +
      toInt(styles.paddingRight) +
      toInt(styles.borderLeftWidth) +
      toInt(styles.borderRightWidth)
    );
  }

  const env = {
    isWebKit:
      typeof document !== 'undefined' &&
      'WebkitAppearance' in document.documentElement.style,
    supportsTouch:
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        ('maxTouchPoints' in window.navigator &&
          window.navigator.maxTouchPoints > 0) ||
        (window.DocumentTouch && document instanceof window.DocumentTouch)),
    supportsIePointer:
      typeof navigator !== 'undefined' && navigator.msMaxTouchPoints,
    isChrome:
      typeof navigator !== 'undefined' &&
      /Chrome/i.test(navigator && navigator.userAgent),
  };

  function updateGeometry (i) {
    const element = i.element;
    const roundedScrollTop = Math.floor(element.scrollTop);
    const rect = element.getBoundingClientRect();

    i.containerWidth = Math.round(rect.width);
    i.containerHeight = Math.round(rect.height);

    i.contentWidth = element.scrollWidth;
    i.contentHeight = element.scrollHeight;

    if (!element.contains(i.scrollbarXRail)) {
      // clean up and append
      queryChildren(element, cls.element.rail('x')).forEach((el) =>
        remove(el)
      );
      element.appendChild(i.scrollbarXRail);
    }
    if (!element.contains(i.scrollbarYRail)) {
      // clean up and append
      queryChildren(element, cls.element.rail('y')).forEach((el) =>
        remove(el)
      );
      element.appendChild(i.scrollbarYRail);
    }

    if (
      !i.settings.suppressScrollX &&
      i.containerWidth + i.settings.scrollXMarginOffset < i.contentWidth
    ) {
      i.scrollbarXActive = true;
      i.railXWidth = i.containerWidth - i.railXMarginWidth;
      i.railXRatio = i.containerWidth / i.railXWidth;
      i.scrollbarXWidth = getThumbSize(
        i,
        toInt((i.railXWidth * i.containerWidth) / i.contentWidth)
      );
      i.scrollbarXLeft = toInt(
        ((i.negativeScrollAdjustment + element.scrollLeft) *
          (i.railXWidth - i.scrollbarXWidth)) /
          (i.contentWidth - i.containerWidth)
      );
    } else {
      i.scrollbarXActive = false;
    }

    if (
      !i.settings.suppressScrollY &&
      i.containerHeight + i.settings.scrollYMarginOffset < i.contentHeight
    ) {
      i.scrollbarYActive = true;
      i.railYHeight = i.containerHeight - i.railYMarginHeight;
      i.railYRatio = i.containerHeight / i.railYHeight;
      i.scrollbarYHeight = getThumbSize(
        i,
        toInt((i.railYHeight * i.containerHeight) / i.contentHeight)
      );
      i.scrollbarYTop = toInt(
        (roundedScrollTop * (i.railYHeight - i.scrollbarYHeight)) /
          (i.contentHeight - i.containerHeight)
      );
    } else {
      i.scrollbarYActive = false;
    }

    if (i.scrollbarXLeft >= i.railXWidth - i.scrollbarXWidth) {
      i.scrollbarXLeft = i.railXWidth - i.scrollbarXWidth;
    }
    if (i.scrollbarYTop >= i.railYHeight - i.scrollbarYHeight) {
      i.scrollbarYTop = i.railYHeight - i.scrollbarYHeight;
    }

    updateCss(element, i);

    if (i.scrollbarXActive) {
      element.classList.add(cls.state.active('x'));
    } else {
      element.classList.remove(cls.state.active('x'));
      i.scrollbarXWidth = 0;
      i.scrollbarXLeft = 0;
      element.scrollLeft = i.isRtl === true ? i.contentWidth : 0;
    }
    if (i.scrollbarYActive) {
      element.classList.add(cls.state.active('y'));
    } else {
      element.classList.remove(cls.state.active('y'));
      i.scrollbarYHeight = 0;
      i.scrollbarYTop = 0;
      element.scrollTop = 0;
    }
  }

  function getThumbSize(i, thumbSize) {
    if (i.settings.minScrollbarLength) {
      thumbSize = Math.max(thumbSize, i.settings.minScrollbarLength);
    }
    if (i.settings.maxScrollbarLength) {
      thumbSize = Math.min(thumbSize, i.settings.maxScrollbarLength);
    }
    return thumbSize;
  }

  function updateCss(element, i) {
    const xRailOffset = { width: i.railXWidth };
    const roundedScrollTop = Math.floor(element.scrollTop);

    if (i.isRtl) {
      xRailOffset.left =
        i.negativeScrollAdjustment +
        element.scrollLeft +
        i.containerWidth -
        i.contentWidth;
    } else {
      xRailOffset.left = element.scrollLeft;
    }
    if (i.isScrollbarXUsingBottom) {
      xRailOffset.bottom = i.scrollbarXBottom - roundedScrollTop;
    } else {
      xRailOffset.top = i.scrollbarXTop + roundedScrollTop;
    }
    set(i.scrollbarXRail, xRailOffset);

    const yRailOffset = { top: roundedScrollTop, height: i.railYHeight };
    if (i.isScrollbarYUsingRight) {
      if (i.isRtl) {
        yRailOffset.right =
          i.contentWidth -
          (i.negativeScrollAdjustment + element.scrollLeft) -
          i.scrollbarYRight -
          i.scrollbarYOuterWidth -
          9;
      } else {
        yRailOffset.right = i.scrollbarYRight - element.scrollLeft;
      }
    } else {
      if (i.isRtl) {
        yRailOffset.left =
          i.negativeScrollAdjustment +
          element.scrollLeft +
          i.containerWidth * 2 -
          i.contentWidth -
          i.scrollbarYLeft -
          i.scrollbarYOuterWidth;
      } else {
        yRailOffset.left = i.scrollbarYLeft + element.scrollLeft;
      }
    }
    set(i.scrollbarYRail, yRailOffset);

    set(i.scrollbarX, {
      left: i.scrollbarXLeft,
      width: i.scrollbarXWidth - i.railBorderXWidth,
    });
    set(i.scrollbarY, {
      top: i.scrollbarYTop,
      height: i.scrollbarYHeight - i.railBorderYWidth,
    });
  }

  function clickRail (i) {
    const element = i.element;

    i.event.bind(i.scrollbarY, 'mousedown', (e) => e.stopPropagation());
    i.event.bind(i.scrollbarYRail, 'mousedown', (e) => {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      const positionTop =
        e.pageY -
        window.pageYOffset -
        i.scrollbarYRail.getBoundingClientRect().top;
      const direction = positionTop > i.scrollbarYTop ? 1 : -1;

      i.element.scrollTop += direction * i.containerHeight;
      updateGeometry(i);

      e.stopPropagation();
    });

    i.event.bind(i.scrollbarX, 'mousedown', (e) => e.stopPropagation());
    i.event.bind(i.scrollbarXRail, 'mousedown', (e) => {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      const positionLeft =
        e.pageX -
        window.pageXOffset -
        i.scrollbarXRail.getBoundingClientRect().left;
      const direction = positionLeft > i.scrollbarXLeft ? 1 : -1;

      i.element.scrollLeft += direction * i.containerWidth;
      updateGeometry(i);

      e.stopPropagation();
    });
  }

  function dragThumb (i) {
    bindMouseScrollHandler(i, [
      'containerWidth',
      'contentWidth',
      'pageX',
      'railXWidth',
      'scrollbarX',
      'scrollbarXWidth',
      'scrollLeft',
      'x',
      'scrollbarXRail',
    ]);
    bindMouseScrollHandler(i, [
      'containerHeight',
      'contentHeight',
      'pageY',
      'railYHeight',
      'scrollbarY',
      'scrollbarYHeight',
      'scrollTop',
      'y',
      'scrollbarYRail',
    ]);
  }

  function bindMouseScrollHandler(
    i,
    [
      containerHeight,
      contentHeight,
      pageY,
      railYHeight,
      scrollbarY,
      scrollbarYHeight,
      scrollTop,
      y,
      scrollbarYRail,
    ]
  ) {
    const element = i.element;

    let startingScrollTop = null;
    let startingMousePageY = null;
    let scrollBy = null;

    function mouseMoveHandler(e) {
      const py = e.touches && e.touches[0] ? e.touches[0].pageY : e[pageY];

      element[scrollTop] =
        startingScrollTop + scrollBy * (py - startingMousePageY);
      addScrollingClass(i, y);
      updateGeometry(i);

      e.stopPropagation();
      if (e.type.startsWith('touch') && e.changedTouches.length > 1) {
        i.event.preventDefault(e, false);
      }
    }

    function mouseUpHandler() {
      removeScrollingClass(i, y);
      i[scrollbarYRail].classList.remove(cls.state.clicking);
      i.event.unbind(i.ownerDocument, 'mousemove', mouseMoveHandler);
    }

    function bindMoves(e, touchMode) {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      startingScrollTop = element[scrollTop];
      startingMousePageY =
        touchMode && e.touches && e.touches[0] ? e.touches[0].pageY : e[pageY];

      scrollBy =
        (i[contentHeight] - i[containerHeight]) /
        (i[railYHeight] - i[scrollbarYHeight]);
      if (!touchMode) {
        i.event.bind(i.ownerDocument, 'mousemove', mouseMoveHandler);
        i.event.once(i.ownerDocument, 'mouseup', mouseUpHandler);
        i.event.preventDefault(e, false);
      } else {
        i.event.bind(i.ownerDocument, 'touchmove', mouseMoveHandler);
      }

      i[scrollbarYRail].classList.add(cls.state.clicking);

      e.stopPropagation();
    }

    i.event.bind(i[scrollbarY], 'mousedown', (e) => {
      bindMoves(e);
    });
    i.event.bind(i[scrollbarY], 'touchstart', (e) => {
      bindMoves(e, true);
    });
  }

  function keyboard (i) {
    const element = i.element;

    const elementHovered = () => matches(element, ':hover');
    const scrollbarFocused = () =>
      matches(i.scrollbarX, ':focus') || matches(i.scrollbarY, ':focus');

    function shouldPreventDefault(deltaX, deltaY) {
      const scrollTop = Math.floor(element.scrollTop);
      if (deltaX === 0) {
        if (!i.scrollbarYActive) {
          return false;
        }
        if (
          (scrollTop === 0 && deltaY > 0) ||
          (scrollTop >= i.contentHeight - i.containerHeight && deltaY < 0)
        ) {
          return !i.settings.wheelPropagation;
        }
      }

      const scrollLeft = element.scrollLeft;
      if (deltaY === 0) {
        if (!i.scrollbarXActive) {
          return false;
        }
        if (
          (scrollLeft === 0 && deltaX < 0) ||
          (scrollLeft >= i.contentWidth - i.containerWidth && deltaX > 0)
        ) {
          return !i.settings.wheelPropagation;
        }
      }
      return true;
    }

    i.event.bind(i.ownerDocument, 'keydown', (e) => {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      if (
        (e.isDefaultPrevented && e.isDefaultPrevented()) ||
        e.defaultPrevented
      ) {
        return;
      }

      if (!elementHovered() && !scrollbarFocused()) {
        return;
      }

      const _getActiveElement = tryCatch(function (node, tryDoc) {
        const docAE =
          tryDoc !== false && tryCatch(() => document.activeElement)();
        return (tryDoc && docAE) || (node && node.activeElement) || docAE || !1;
      });

      var activeElement = _getActiveElement(i.ownerDocument, true);
      if (activeElement) {
        if (activeElement.tagName === 'IFRAME') {
          activeElement = _getActiveElement(activeElement.contentDocument, false);
        } else {
          // go deeper if element is a webcomponent
          while (activeElement.shadowRoot) {
            activeElement =
              _getActiveElement(activeElement.shadowRoot, false) || !1;
          }
        }
        if (activeElement && isEditable(activeElement)) {
          return;
        }
      }

      let deltaX = 0;
      let deltaY = 0;

      switch (e.which) {
        case 37: // left
          if (e.metaKey) {
            deltaX = -i.contentWidth;
          } else if (e.altKey) {
            deltaX = -i.containerWidth;
          } else {
            deltaX = -30;
          }
          break;
        case 38: // up
          if (e.metaKey) {
            deltaY = i.contentHeight;
          } else if (e.altKey) {
            deltaY = i.containerHeight;
          } else {
            deltaY = 30;
          }
          break;
        case 39: // right
          if (e.metaKey) {
            deltaX = i.contentWidth;
          } else if (e.altKey) {
            deltaX = i.containerWidth;
          } else {
            deltaX = 30;
          }
          break;
        case 40: // down
          if (e.metaKey) {
            deltaY = -i.contentHeight;
          } else if (e.altKey) {
            deltaY = -i.containerHeight;
          } else {
            deltaY = -30;
          }
          break;
        case 32: // space bar
          if (e.shiftKey) {
            deltaY = i.containerHeight;
          } else {
            deltaY = -i.containerHeight;
          }
          break;
        case 33: // page up
          deltaY = i.containerHeight;
          break;
        case 34: // page down
          deltaY = -i.containerHeight;
          break;
        case 36: // home
          deltaY = i.contentHeight;
          break;
        case 35: // end
          deltaY = -i.contentHeight;
          break;
        default:
          return;
      }

      if (i.settings.suppressScrollX && deltaX !== 0) {
        return;
      }
      if (i.settings.suppressScrollY && deltaY !== 0) {
        return;
      }

      element.scrollTop -= deltaY;
      element.scrollLeft += deltaX;
      updateGeometry(i);

      if (shouldPreventDefault(deltaX, deltaY)) {
        i.event.preventDefault(e, false);
      }
    });
  }

  function wheel (i) {
    const element = i.element;

    function shouldPreventDefault(deltaX, deltaY) {
      const roundedScrollTop = Math.floor(element.scrollTop);
      const isTop = element.scrollTop === 0;
      const isBottom =
        roundedScrollTop + element.offsetHeight === element.scrollHeight;
      const isLeft = element.scrollLeft === 0;
      const isRight =
        element.scrollLeft + element.offsetWidth === element.scrollWidth;

      let hitsBound;

      // pick axis with primary direction
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        hitsBound = isTop || isBottom;
      } else {
        hitsBound = isLeft || isRight;
      }

      return hitsBound ? !i.settings.wheelPropagation : true;
    }

    function getDeltaFromEvent(e) {
      let deltaX = e.deltaX;
      let deltaY = -1 * e.deltaY;

      if (typeof deltaX === 'undefined' || typeof deltaY === 'undefined') {
        // OS X Safari
        deltaX = (-1 * e.wheelDeltaX) / 6;
        deltaY = e.wheelDeltaY / 6;
      }

      if (e.deltaMode && e.deltaMode === 1) {
        // Firefox in deltaMode 1: Line scrolling
        deltaX *= 10;
        deltaY *= 10;
      }

      if (deltaX !== deltaX && deltaY !== deltaY /* NaN checks */) {
        // IE in some mouse drivers
        deltaX = 0;
        deltaY = e.wheelDelta;
      }

      if (e.shiftKey) {
        // reverse axis with shift key
        return [-deltaY, -deltaX];
      }
      return [deltaX, deltaY];
    }

    function shouldBeConsumedByChild(target, deltaX, deltaY) {
      // FIXME: this is a workaround for <select> issue in FF and IE #571
      if (!env.isWebKit && element.querySelector('select:focus')) {
        return true;
      }

      if (!element.contains(target)) {
        return false;
      }

      let cursor = target;

      while (cursor && cursor !== element) {
        if (cursor.classList.contains(cls.element.consuming)) {
          return true;
        }

        const style = get(cursor);

        // if deltaY && vertical scrollable
        if (deltaY && style.overflowY.match(/(scroll|auto)/)) {
          const maxScrollTop = cursor.scrollHeight - cursor.clientHeight;
          if (maxScrollTop > 0) {
            if (
              (cursor.scrollTop > 0 && deltaY < 0) ||
              (cursor.scrollTop < maxScrollTop && deltaY > 0)
            ) {
              return true;
            }
          }
        }
        // if deltaX && horizontal scrollable
        if (deltaX && style.overflowX.match(/(scroll|auto)/)) {
          const maxScrollLeft = cursor.scrollWidth - cursor.clientWidth;
          if (maxScrollLeft > 0) {
            if (
              (cursor.scrollLeft > 0 && deltaX < 0) ||
              (cursor.scrollLeft < maxScrollLeft && deltaX > 0)
            ) {
              return true;
            }
          }
        }

        cursor = cursor.parentNode;
      }

      return false;
    }

    function mousewheelHandler(e) {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      const [deltaX, deltaY] = getDeltaFromEvent(e);

      if (shouldBeConsumedByChild(e.target, deltaX, deltaY)) {
        return;
      }

      let shouldPrevent = false;
      if (!i.settings.useBothWheelAxes) {
        // deltaX will only be used for horizontal scrolling and deltaY will
        // only be used for vertical scrolling - this is the default
        element.scrollTop -= deltaY * i.settings.wheelSpeed;
        element.scrollLeft += deltaX * i.settings.wheelSpeed;
      } else if (i.scrollbarYActive && !i.scrollbarXActive) {
        // only vertical scrollbar is active and useBothWheelAxes option is
        // active, so let's scroll vertical bar using both mouse wheel axes
        if (deltaY) {
          element.scrollTop -= deltaY * i.settings.wheelSpeed;
        } else {
          element.scrollTop += deltaX * i.settings.wheelSpeed;
        }
        shouldPrevent = true;
      } else if (i.scrollbarXActive && !i.scrollbarYActive) {
        // useBothWheelAxes and only horizontal bar is active, so use both
        // wheel axes for horizontal bar
        if (deltaX) {
          element.scrollLeft += deltaX * i.settings.wheelSpeed;
        } else {
          element.scrollLeft -= deltaY * i.settings.wheelSpeed;
        }
        shouldPrevent = true;
      }

      updateGeometry(i);

      shouldPrevent = shouldPrevent || shouldPreventDefault(deltaX, deltaY);
      if (shouldPrevent && !e.ctrlKey) {
        i.event.preventDefault(e);
      }
    }

    if (typeof window.onwheel !== 'undefined') {
      i.event.bind(element, 'wheel', mousewheelHandler);
    } else if (typeof window.onmousewheel !== 'undefined') {
      i.event.bind(element, 'mousewheel', mousewheelHandler);
    }
  }

  function touch (i) {
    if (!env.supportsTouch && !env.supportsIePointer) {
      return;
    }

    const element = i.element;

    function shouldPrevent(deltaX, deltaY) {
      const scrollTop = Math.floor(element.scrollTop);
      const scrollLeft = element.scrollLeft;
      const magnitudeX = Math.abs(deltaX);
      const magnitudeY = Math.abs(deltaY);

      if (magnitudeY > magnitudeX) {
        // user is perhaps trying to swipe up/down the page

        if (
          (deltaY < 0 && scrollTop === i.contentHeight - i.containerHeight) ||
          (deltaY > 0 && scrollTop === 0)
        ) {
          // set prevent for mobile Chrome refresh
          return window.scrollY === 0 && deltaY > 0 && env.isChrome;
        }
      } else if (magnitudeX > magnitudeY) {
        // user is perhaps trying to swipe left/right across the page

        if (
          (deltaX < 0 && scrollLeft === i.contentWidth - i.containerWidth) ||
          (deltaX > 0 && scrollLeft === 0)
        ) {
          return true;
        }
      }

      return true;
    }

    function applyTouchMove(differenceX, differenceY) {
      element.scrollTop -= differenceY;
      element.scrollLeft -= differenceX;

      updateGeometry(i);
    }

    let startOffset = {};
    let startTime = 0;
    let speed = {};
    let easingLoop = null;

    function getTouch(e) {
      if (e.targetTouches) {
        return e.targetTouches[0];
      } else {
        // Maybe IE pointer
        return e;
      }
    }

    function shouldHandle(e) {
      if (e.pointerType && e.pointerType === 'pen' && e.buttons === 0) {
        return false;
      }
      if (e.targetTouches && e.targetTouches.length === 1) {
        return true;
      }
      if (
        e.pointerType &&
        e.pointerType !== 'mouse' &&
        e.pointerType !== e.MSPOINTER_TYPE_MOUSE
      ) {
        return true;
      }
      return false;
    }

    function touchStart(e) {
      if (element.classList.contains('ps-disabled')) {
        return;
      }
      if (!shouldHandle(e)) {
        return;
      }

      const touch = getTouch(e);

      startOffset.pageX = touch.pageX;
      startOffset.pageY = touch.pageY;

      startTime = new Date().getTime();

      if (easingLoop !== null) {
        clearInterval(easingLoop);
      }
    }

    function shouldBeConsumedByChild(target, deltaX, deltaY) {
      if (!element.contains(target)) {
        return false;
      }

      let cursor = target;

      while (cursor && cursor !== element) {
        if (cursor.classList.contains(cls.element.consuming)) {
          return true;
        }

        const style = get(cursor);

        // if deltaY && vertical scrollable
        if (deltaY && style.overflowY.match(/(scroll|auto)/)) {
          const maxScrollTop = cursor.scrollHeight - cursor.clientHeight;
          if (maxScrollTop > 0) {
            if (
              (cursor.scrollTop > 0 && deltaY < 0) ||
              (cursor.scrollTop < maxScrollTop && deltaY > 0)
            ) {
              return true;
            }
          }
        }
        // if deltaX && horizontal scrollable
        if (deltaX && style.overflowX.match(/(scroll|auto)/)) {
          const maxScrollLeft = cursor.scrollWidth - cursor.clientWidth;
          if (maxScrollLeft > 0) {
            if (
              (cursor.scrollLeft > 0 && deltaX < 0) ||
              (cursor.scrollLeft < maxScrollLeft && deltaX > 0)
            ) {
              return true;
            }
          }
        }

        cursor = cursor.parentNode;
      }

      return false;
    }

    function touchMove(e) {
      if (shouldHandle(e)) {
        const touch = getTouch(e);

        const currentOffset = { pageX: touch.pageX, pageY: touch.pageY };

        const differenceX = currentOffset.pageX - startOffset.pageX;
        const differenceY = currentOffset.pageY - startOffset.pageY;

        if (shouldBeConsumedByChild(e.target, differenceX, differenceY)) {
          return;
        }

        applyTouchMove(differenceX, differenceY);
        startOffset = currentOffset;

        const currentTime = new Date().getTime();

        const timeGap = currentTime - startTime;
        if (timeGap > 0) {
          speed.x = differenceX / timeGap;
          speed.y = differenceY / timeGap;
          startTime = currentTime;
        }

        if (shouldPrevent(differenceX, differenceY)) {
          i.event.preventDefault(e, false);
        }
      }
    }
    function touchEnd() {
      if (i.settings.swipeEasing) {
        clearInterval(easingLoop);
        easingLoop = setInterval(function () {
          if (i.isInitialized) {
            clearInterval(easingLoop);
            return;
          }

          if (!speed.x && !speed.y) {
            clearInterval(easingLoop);
            return;
          }

          if (Math.abs(speed.x) < 0.01 && Math.abs(speed.y) < 0.01) {
            clearInterval(easingLoop);
            return;
          }

          if (!i.element) {
            clearInterval(easingLoop);
            return;
          }

          applyTouchMove(speed.x * 30, speed.y * 30);

          speed.x *= 0.8;
          speed.y *= 0.8;
        }, 10);
      }
    }

    if (env.supportsTouch) {
      i.event.bind(element, 'touchstart', touchStart);
      i.event.bind(element, 'touchmove', touchMove);
      i.event.bind(element, 'touchend', touchEnd);
    } else if (env.supportsIePointer) {
      if (window.PointerEvent) {
        i.event.bind(element, 'pointerdown', touchStart);
        i.event.bind(element, 'pointermove', touchMove);
        i.event.bind(element, 'pointerup', touchEnd);
      } else if (window.MSPointerEvent) {
        i.event.bind(element, 'MSPointerDown', touchStart);
        i.event.bind(element, 'MSPointerMove', touchMove);
        i.event.bind(element, 'MSPointerUp', touchEnd);
      }
    }
  }

  const defaultSettings = () => ({
    handlers: ['click-rail', 'drag-thumb', 'keyboard', 'wheel', 'touch'],
    maxScrollbarLength: null,
    minScrollbarLength: null,
    scrollingThreshold: 1000,
    scrollXMarginOffset: 0,
    scrollYMarginOffset: 0,
    suppressScrollX: false,
    suppressScrollY: false,
    swipeEasing: true,
    useBothWheelAxes: false,
    wheelPropagation: true,
    wheelSpeed: 1,
  });

  const handlers = {
    'click-rail': clickRail,
    'drag-thumb': dragThumb,
    keyboard,
    wheel,
    touch,
  };

  class PerfectScrollbar {
    constructor(element, userSettings = {}) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      if (!element || !element.nodeName) {
        throw new Error('no element is specified to initialize PerfectScrollbar');
      }

      this.element = element;

      element.classList.add(cls.main);

      this.settings = defaultSettings();
      for (const key in userSettings) {
        this.settings[key] = userSettings[key];
      }

      this.containerWidth = null;
      this.containerHeight = null;
      this.contentWidth = null;
      this.contentHeight = null;

      const focus = () => element.classList.add(cls.state.focus);
      const blur = () => element.classList.remove(cls.state.focus);

      this.isRtl = get(element).direction === 'rtl';
      if (this.isRtl === true) {
        element.classList.add(cls.rtl);
      }
      this.isNegativeScroll = (() => {
        const originalScrollLeft = element.scrollLeft;
        let result = null;
        element.scrollLeft = -1;
        result = element.scrollLeft < 0;
        element.scrollLeft = originalScrollLeft;
        return result;
      })();
      this.negativeScrollAdjustment = this.isNegativeScroll
        ? element.scrollWidth - element.clientWidth
        : 0;
      this.event = new EventManager();
      this.ownerDocument = element.ownerDocument || document;

      this.scrollbarXRail = div(cls.element.rail('x'));
      element.appendChild(this.scrollbarXRail);
      this.scrollbarX = div(cls.element.thumb('x'));
      this.scrollbarXRail.appendChild(this.scrollbarX);
      this.scrollbarX.setAttribute('tabindex', 0);
      this.event.bind(this.scrollbarX, 'focus', focus);
      this.event.bind(this.scrollbarX, 'blur', blur);
      this.scrollbarXActive = null;
      this.scrollbarXWidth = null;
      this.scrollbarXLeft = null;
      const railXStyle = get(this.scrollbarXRail);
      this.scrollbarXBottom = parseInt(railXStyle.bottom, 10);
      if (isNaN(this.scrollbarXBottom)) {
        this.isScrollbarXUsingBottom = false;
        this.scrollbarXTop = toInt(railXStyle.top);
      } else {
        this.isScrollbarXUsingBottom = true;
      }
      this.railBorderXWidth =
        toInt(railXStyle.borderLeftWidth) + toInt(railXStyle.borderRightWidth);
      // Set rail to display:block to calculate margins
      set(this.scrollbarXRail, { display: 'block' });
      this.railXMarginWidth =
        toInt(railXStyle.marginLeft) + toInt(railXStyle.marginRight);
      set(this.scrollbarXRail, { display: '' });
      this.railXWidth = null;
      this.railXRatio = null;

      this.scrollbarYRail = div(cls.element.rail('y'));
      element.appendChild(this.scrollbarYRail);
      this.scrollbarY = div(cls.element.thumb('y'));
      this.scrollbarYRail.appendChild(this.scrollbarY);
      this.scrollbarY.setAttribute('tabindex', 0);
      this.event.bind(this.scrollbarY, 'focus', focus);
      this.event.bind(this.scrollbarY, 'blur', blur);
      this.scrollbarYActive = null;
      this.scrollbarYHeight = null;
      this.scrollbarYTop = null;
      const railYStyle = get(this.scrollbarYRail);
      this.scrollbarYRight = parseInt(railYStyle.right, 10);
      if (isNaN(this.scrollbarYRight)) {
        this.isScrollbarYUsingRight = false;
        this.scrollbarYLeft = toInt(railYStyle.left);
      } else {
        this.isScrollbarYUsingRight = true;
      }
      this.scrollbarYOuterWidth = this.isRtl ? outerWidth(this.scrollbarY) : null;
      this.railBorderYWidth =
        toInt(railYStyle.borderTopWidth) + toInt(railYStyle.borderBottomWidth);
      set(this.scrollbarYRail, { display: 'block' });
      this.railYMarginHeight =
        toInt(railYStyle.marginTop) + toInt(railYStyle.marginBottom);
      set(this.scrollbarYRail, { display: '' });
      this.railYHeight = null;
      this.railYRatio = null;

      this.reach = {
        x:
          element.scrollLeft <= 0
            ? 'start'
            : element.scrollLeft >= this.contentWidth - this.containerWidth
              ? 'end'
              : null,
        y:
          element.scrollTop <= 0
            ? 'start'
            : element.scrollTop >= this.contentHeight - this.containerHeight
              ? 'end'
              : null,
      };

      this.isAlive = true;

      this.settings.handlers.forEach((handlerName) =>
        handlers[handlerName](this)
      );

      this.lastScrollTop = Math.floor(element.scrollTop); // for onScroll only
      this.lastScrollLeft = element.scrollLeft; // for onScroll only
      this.event.bind(this.element, 'scroll', (e) => this.onScroll(e));
      updateGeometry(this);
    }

    update() {
      if (!this.isAlive) {
        return;
      }

      // Recalcuate negative scrollLeft adjustment
      this.negativeScrollAdjustment = this.isNegativeScroll
        ? this.element.scrollWidth - this.element.clientWidth
        : 0;

      // Recalculate rail margins
      set(this.scrollbarXRail, { display: 'block' });
      set(this.scrollbarYRail, { display: 'block' });
      this.railXMarginWidth =
        toInt(get(this.scrollbarXRail).marginLeft) +
        toInt(get(this.scrollbarXRail).marginRight);
      this.railYMarginHeight =
        toInt(get(this.scrollbarYRail).marginTop) +
        toInt(get(this.scrollbarYRail).marginBottom);

      // Hide scrollbars not to affect scrollWidth and scrollHeight
      set(this.scrollbarXRail, { display: 'none' });
      set(this.scrollbarYRail, { display: 'none' });

      updateGeometry(this);

      processScrollDiff(this, 'top', 0, false, true);
      processScrollDiff(this, 'left', 0, false, true);

      set(this.scrollbarXRail, { display: '' });
      set(this.scrollbarYRail, { display: '' });
    }

    onScroll(e) {
      if (!this.isAlive || this.element.classList.contains('ps-disabled')) {
        return;
      }

      updateGeometry(this);
      processScrollDiff(this, 'top', this.element.scrollTop - this.lastScrollTop);
      processScrollDiff(
        this,
        'left',
        this.element.scrollLeft - this.lastScrollLeft
      );

      this.lastScrollTop = Math.floor(this.element.scrollTop);
      this.lastScrollLeft = this.element.scrollLeft;
    }

    destroy() {
      if (!this.isAlive) {
        return;
      }

      this.event.unbindAll();
      remove(this.scrollbarX);
      remove(this.scrollbarY);
      remove(this.scrollbarXRail);
      remove(this.scrollbarYRail);
      this.removePsClasses();

      // unset elements
      this.element = null;
      this.scrollbarX = null;
      this.scrollbarY = null;
      this.scrollbarXRail = null;
      this.scrollbarYRail = null;

      this.isAlive = false;
    }

    removePsClasses() {
      this.element.className = this.element.className
        .split(' ')
        .filter((name) => !name.match(/^ps([-_].+|)$/))
        .join(' ');
    }
  }

  return PerfectScrollbar;

}));
