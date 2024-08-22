class MegaGesture {

    constructor(options) {

        this.options = options;
        this.touchDistance = 0;
        this.minSwipeDistanceX = options.minSwipeDistanceX || 250 / window.devicePixelRatio;
        this.minSwipeDistanceY = options.minSwipeDistanceY || 250 / window.devicePixelRatio;

        const body = options.iframeDoc ? options.iframeDoc.body : document.body;

        this._rgOpt = {capture: true};
        this._registerGesture = () => {
            body.removeEventListener('touchstart', this._registerGesture, this._rgOpt);

            if (!this.domNode || !this.domNode.megaGesture) {

                if ((this.domNode = this.domNode || this.options.domNode || false).parentNode ||
                     this.domNode === this.options.iframeDoc) {

                    this.domNode.addEventListener('touchend', this);
                    this.domNode.addEventListener('touchstart', this);
                    this.domNode.addEventListener('touchmove', this, {passive: false});

                    this.domNode.megaGesture = true;
                }
                else if (d) {
                    console.warn('MegaGesture initialization failed.', this.domNode, [this]);
                }
            }
        };
        body.addEventListener('touchstart', this._registerGesture, this._rgOpt);
    }

    // This is the handleEvent method, it will be called for each event listener
    handleEvent(event) {
        this[`_handle${event.type}`](event);
    }

    _handletouchstart(ev) {

        this.action = null;
        this.activeScroll = false;

        switch (ev.touches.length) {

            case 1:
                this._handleOneTouchStart(ev);
                break;
            case 2:
                this._handleTwoTouchStart(ev);
                break;
        }

        if (typeof this.options.onTouchStart === 'function') {
            this.options.onTouchStart(ev);
        }
    }

    _handleOneTouchStart(ev) {

        const touch = ev.touches[0];

        this.xStart = touch.clientX;
        this.yStart = touch.clientY;

        // Set real scroll nodes if `options.scrollNodes` is passed
        this.activeScroll = this._getActiveScrollNodes(ev);

        if (ev.target.tagName === 'INPUT' && ev.target.type === 'range') {
            this.action = 'onRangeInput';
        }

        if (ev.target.classList.contains('ignore-gesture') || ev.target.closest('.ignore-gesture')) {
            this.action = 'ignore';
        }
    }

    _getActiveScrollNodes(ev) {

        if (!this.domNode || typeof this.options.scrollNodes !== 'object'
            || !(this.options.scrollNodes.x || this.options.scrollNodes.y)) {
            return false;
        }

        const xScrollNodes = [].concat(this.options.scrollNodes.x || []);
        const yScrollNodes = [].concat(this.options.scrollNodes.y || []);

        // Get real scrollable area in flexbox layout mode
        const _getScrollableArea = (scrollNodeX, scrollNodeY, node, res) => {

            if (typeof node !== 'object') {
                return false;
            }

            res = res || Object.create(null);

            // Return X scroll node If scrolling exists and the node is not "inline"
            if (scrollNodeX && node.scrollWidth > node.clientWidth && node.clientWidth !== 0) {
                res.x = node;
            }

            // Return y scroll node If scrolling exists and the node is not "inline"
            if (scrollNodeY && node.scrollHeight > node.clientHeight && node.clientHeight !== 0) {
                res.y = node;
            }

            // We got all we want let's get out of here
            if ((!!scrollNodeX === !!res.x || scrollNodeX === node)
                && (!!scrollNodeY === !!res.y || scrollNodeY === node)) {
                return res;
            }

            // Check parent node for scrolling
            return _getScrollableArea(scrollNodeX, scrollNodeY, node.parentNode, res);
        };

        let xNode;
        let yNode;

        // Set real active X scroll node
        for (var i = xScrollNodes.length; i--;) {
            if (xScrollNodes[i].contains(ev.target)) {
                xNode = xScrollNodes[i];
                break;
            }
        }

        // Set real active Y scroll node
        for (var j = yScrollNodes.length; j--;) {
            if (yScrollNodes[j].contains(ev.target)) {
                yNode = yScrollNodes[j];
                break;
            }
        }

        return _getScrollableArea(xNode, yNode, ev.target);
    }

    _handleTwoTouchStart(ev) {

        this.xStart = null;
        this.yStart = null;

        const ft = ev.touches[0];
        const st = ev.touches[1];

        this.touchDistance = Math.hypot(ft.clientX - st.clientX, ft.clientY - st.clientY);
    }

    _handletouchmove(ev) {

        switch (ev.touches.length) {

            case 1:
                this._handleOneTouchMove(ev);
                break;
            case 2:
                this._handleTwoTouchMove(ev);
                break;
        }
    }

    _handleOneTouchMove(ev) {

        this._handleScrollEvent(ev);

        if (!this.action && typeof this.options.onTouchMove === 'function') {
            this.options.onTouchMove(ev);
        }
    }

    _handleScrollEvent(ev) {

        if (this.action || !(this.activeScroll && (this.activeScroll.x || this.activeScroll.y))) {
            return false;
        }

        const touch = ev.changedTouches && ev.changedTouches[0] || false;
        let diff = 0;
        let clientSize = 0;
        let scrollStart = 0;
        let scrollSize = 0;

        if (this.activeScroll.x) {
            diff = this.xStart - touch.clientX;
            clientSize = this.activeScroll.x.clientWidth;
            scrollStart = this.activeScroll.x.scrollLeft;
            scrollSize = this.activeScroll.x.scrollWidth;
        }
        else {
            diff = this.yStart - touch.clientY;
            clientSize = this.activeScroll.y.clientHeight;
            scrollStart = this.activeScroll.y.scrollTop;
            scrollSize = this.activeScroll.y.scrollHeight;
        }

        // Prevent swipting when scroll positions are not on block edges
        if (scrollStart > 0 && diff < 0
            || scrollSize > clientSize + Math.ceil(scrollStart + 1) && diff > 0) {

            this.action = 'onScroll';
        }
    }

    _handleTwoTouchMove(ev) {

        const prevTouchDistance = this.touchDistance;
        const ft = ev.touches[0];
        const st = ev.touches[1];

        this.touchDistance = Math.hypot(ft.clientX - st.clientX, ft.clientY - st.clientY);

        // Prevent swipe gestures
        this.action = 'pinchZoom';

        if (typeof this.options.onPinchZoom === 'function') {

            // Prevent native
            ev.preventDefault();

            this.options.onPinchZoom(ev, this.touchDistance / prevTouchDistance);
        }
    }

    _handletouchend(ev) {

        if (typeof this.options.onTouchEnd === 'function') {
            this.options.onTouchEnd(ev);
        }

        // if other action is already taken ignore this
        if (this.action) {

            ev.stopPropagation();

            return;
        }

        const touch = ev.changedTouches && ev.changedTouches[0] || false;

        const xNext = touch.clientX;
        const yNext = touch.clientY;

        const xDiff = this.xStart - xNext;
        const yDiff = this.yStart - yNext;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {

            if (xDiff > this.minSwipeDistanceX) {
                this.action = 'onSwipeLeft';
            }
            else if (xDiff < -this.minSwipeDistanceX) {
                this.action = 'onSwipeRight';
            }
            else if (Math.abs(xDiff) > 2 || Math.abs(yDiff) > 2) {
                this.action = 'onDragging';
            }
        }
        else if (yDiff > this.minSwipeDistanceY) {
            this.action = 'onSwipeUp';
        }
        else if (yDiff < -this.minSwipeDistanceY) {
            this.action = 'onSwipeDown';
        }
        else if (Math.abs(xDiff) > 2 || Math.abs(yDiff) > 2) {
            this.action = 'onDragging';
        }

        this.xStart = null;
        this.yStart = null;

        if (this.action && typeof this.options[this.action] === 'function') {

            tryCatch(() => this.options[this.action](ev))();

            // Stop other touch event or another gesture
            ev.stopPropagation();
        }

        this.action = null;
        this.activeScroll = false;
        this.touchDistance = 0;
    }

    destroy() {
        // Clear first init touchstart listener if megaGeture has not been fired previously
        document.body.removeEventListener('touchstart', this._registerGesture, this._rgOpt);

        if (this.domNode) {
            this.domNode.removeEventListener('touchstart', this);
            this.domNode.removeEventListener('touchmove', this);
            this.domNode.removeEventListener('touchend', this);
            delete this.domNode.megaGesture;
        }
    }
}

mBroadcaster.once('startMega:mobile', () => {
    'use strict';

    if (is_touchable) {

        mega.ui.mainlayoutGesture = new MegaGesture({
            get domNode() {
                return mainlayout;
            },
            onSwipeLeft: () => history.forward(),
            onSwipeRight: () => history.back()
        });
    }
});

lazy(window, 'is_touchable', () => {

    'use strict';

    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
});
