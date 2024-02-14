class MegaGesture {

    constructor(options) {

        this.options = options;
        this.touchDistance = 0;
        this.minSwipeDistanceX = options.minSwipeDistanceX || 250 / window.devicePixelRatio;
        this.minSwipeDistanceY = options.minSwipeDistanceY || 250 / window.devicePixelRatio;
        this.domNode = options.domNode;

        if (!this.domNode.megaGesture) {
            this._setupEventListeners();
            this.domNode.megaGesture = true;
        }
    }

    _setupEventListeners() {

        this.domNode.addEventListener('touchstart', this);
        this.domNode.addEventListener('touchmove', this, {passive: false});
        this.domNode.addEventListener('touchend', this);
    }

    // This is the handleEvent method, it will be called for each event listener
    handleEvent(event) {
        this[`_handle${event.type}`](event);
    }

    _handletouchstart(ev) {

        this.action = null;

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

        if (typeof this.options.onTouchMove === 'function') {
            this.options.onTouchMove(ev);
        }
    }

    _handleTwoTouchMove(ev) {

        const prevTouchDistance = this.touchDistance;
        const ft = ev.touches[0];
        const st = ev.touches[1];

        this.touchDistance = Math.hypot(ft.clientX - st.clientX, ft.clientY - st.clientY);

        if (typeof this.options.onPinchZoom === 'function') {

            // Prevent native
            ev.preventDefault();

            this.options.onPinchZoom(ev, this.touchDistance / prevTouchDistance);
            this.action = 'pinchZoom';
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

        const touch = ev.changedTouches[0];

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
        }
        else if (yDiff > this.minSwipeDistanceY) {
            this.action = 'onSwipeUp';
        }
        else if (yDiff < -this.minSwipeDistanceY) {
            this.action = 'onSwipeDown';
        }

        this.xStart = null;
        this.yStart = null;

        if (this.action && typeof this.options[this.action] === 'function') {

            this.options[this.action](ev);

            // Stop other touch event or another gesture
            ev.stopPropagation();
        }

        this.action = null;
        this.touchDistance = 0;
    }

    destroy() {

        this.domNode.removeEventListener('touchstart', this);
        this.domNode.removeEventListener('touchmove', this);
        this.domNode.removeEventListener('touchend', this);
        delete this.domNode.megaGesture;
    }
}

mBroadcaster.once('startMega', () => {

    'use strict';

    if (is_mobile) {

        mega.ui.mainlayoutGesture = new MegaGesture({
            domNode: mainlayout,
            onSwipeLeft: () => history.forward(),
            onSwipeRight: () => history.back()
        });
    }
});

lazy(window, 'is_touchable', () => {

    'use strict';

    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
});
