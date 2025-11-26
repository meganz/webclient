class MegaZoomPan {

    constructor(options) {

        this.domNode = options && options.domNode;

        if (!this.domNode) {
            return;
        }

        this.state = {
            minScale: options.minScale || 0.01,
            maxScale: options.maxScale || 30,
            sensitivity: options.sensitivity || 20,
            originOffset: false,
            transform: {
                originX: 0,
                originY: 0,
                translateX: 0,
                translateY: 0,
                scale: 1
            },
            touchGesture: {
                isActive: false,
                initialDistance: 0,
                initialScale: 1,
                lastTouchX: null,
                lastTouchY: null
            }
        };
        this.viewerNode = this.domNode.closest('.media-viewer');
        this.containerNode = this.domNode.parentNode;
        this.slider = options.slider && this.viewerNode.querySelector('.zoom-slider-wrap');
        this.panMode = false;
        this.zoomMode = false;
        this.onPick = (e) => {
            if (!this.zoomMode) {
                return;
            }

            if (e.type === 'mousedown') {
                this.containerNode.classList.add('picked');
                this.panMode = true;
            }
            else {
                this.containerNode.classList.remove('picked');
                this.panMode = false;
            }
        };
        this.onMove = (e) => {
            if (!this.zoomMode || !this.panMode) {
                return;
            }
            e.preventDefault();
            this.pan(
                e.movementX,
                e.movementY
            );
        };
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);

        // Init slider
        if (this.slider) {
            this.initSlider();
        }

        // Init Pan
        this.onPick = this.onPick.bind(this);
        this.containerNode.addEventListener('mousedown', this.onPick);
        this.containerNode.addEventListener('mouseup', this.onPick);
        this.containerNode.addEventListener('mouseleave', this.onPick);
        this.containerNode.addEventListener('mousemove', this.onMove);
        this.containerNode.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.containerNode.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.containerNode.addEventListener('touchend', this.onTouchEnd, { passive: false });

        // Init Zoom
        $(this.viewerNode).rebind('mousewheel.imgzoom', (e) => {
            // e.preventDefault();
            this.zoom(
                e.pageX,
                e.pageY,
                Math.sign(e.deltaY)
            );
        });
    }

    initSlider() {
        // @todo: Create all nodes if option.slider === true
        const $sl = $('.zoom-slider', this.slider);
        const zoomInBtn = this.slider.querySelector('.v-btn.zoom-in');
        const zoomOutBtn =  this.slider.querySelector('.v-btn.zoom-out');

        // Do zoom with custom value
        const zoom = (s) => {
            const x = window.innerWidth / 2;
            const y = window.innerHeight / 2;
            this.zoom(x, y, s, true);
        };

        // Zoom in / out events
        const zoomEvt = (zoomIn) => {
            const { transform: { scale } } = this.state;
            zoom((scale * (zoomIn ? 1.2 : 0.9)).toFixed(3));
            return false;
        };

        // Set percents value in DOM node
        const setVal = (val) => {
            const tip = this.slider && this.slider.querySelector('.ui-slider-handle .mv-zoom-slider');

            if (tip) {
                tip.textContent = formatPercentage(
                    val * (this.domNode.dataset.initScale || 1)
                );
            }
        };

        // Init zoom slider
        $sl.slider({
            min: this.state.minScale,
            max: this.state.maxScale,
            range: 'min',
            step: 0.01,
            change: (e, ui) => {
                setVal(ui.value);
            },
            slide: (e, ui) => {
                zoom(ui.value.toFixed(2));
                setVal(ui.value);
            },
            create: () => {
                const t = this.slider.querySelector('.ui-slider-handle');
                mCreateElement('div', { class: 'mv-zoom-slider dark-direct-tooltip' }, t);
                mCreateElement('i', {
                    class: 'mv-zoom-slider-arrow sprite-fm-mono icon-tooltip-arrow'
                }, t);
            }
        });

        // Bind zoom in/out btoon events
        zoomInBtn.addEventListener('click', () => zoomEvt(true));
        zoomOutBtn.addEventListener('click', () => zoomEvt());

        // Set default state
        this.slider.classList.remove('hidden');
        this.setSliderValue();
    }

    setSliderValue(scale = 1) {
        $('.zoom-slider', this.slider).slider('value', Math.floor(scale * 100) / 100);
    }

    valueInRange(scale) {
        return scale <= this.state.maxScale && scale >= this.state.minScale;
    }

    getTranslate(axis, pos) {
        const { originX, originY, translateX, translateY, scale } = this.state.transform;
        const axisIsX = axis === 'x';
        const prevPos = axisIsX ? originX : originY;
        const translate = axisIsX ? translateX : translateY;

        return this.valueInRange(scale) && pos !== prevPos
            ? translate + (pos - prevPos * scale) * (1 - 1 / scale)
            : translate;
    }

    getNewScale(deltaScale) {
        const { transform: { scale }, minScale, maxScale, sensitivity } = this.state;
        const newScale = scale + deltaScale / (sensitivity / scale);

        return this.clamp(newScale, minScale, maxScale);
    }

    clamp(value, min, max) {
        return Math.max(Math.min(value, max), min);
    }

    getMatrix(scale, translateX, translateY) {
        return `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`;
    }

    clampedTranslate(axis, translate) {
        const { scale, originX, originY } = this.state.transform;
        const axisIsX = axis === 'x';
        const origin = axisIsX ? originX : originY;
        const axisKey = axisIsX ? 'offsetWidth' : 'offsetHeight';

        const containerSize = this.domNode.parentNode[axisKey];
        const imageSize = this.domNode[axisKey];
        const bounds = this.domNode.getBoundingClientRect();

        const imageScaledSize = axisIsX ? bounds.width : bounds.height;

        const defaultOrigin = imageSize / 2;
        const originOffset = (origin - defaultOrigin) * (scale - 1);

        const range = Math.max(0, Math.round(imageScaledSize) - containerSize);

        const max = Math.round(range / 2);
        const min = 0 - max;

        return this.clamp(translate, min + originOffset, max + originOffset);
    }

    renderClamped(translateX, translateY) {
        const { originX, originY, scale } = this.state.transform;

        this.state.transform.translateX = this.clampedTranslate('x', translateX);
        this.state.transform.translateY = this.clampedTranslate('y', translateY);

        requestAnimationFrame(() => {
            if (this.state.transform.originOffset) {
                this.domNode.style.transformOrigin = `${originX}px ${originY}px`;
            }
            this.domNode.style.transform = this.getMatrix(
                scale,
                this.state.transform.translateX,
                this.state.transform.translateY
            );
        });
    }

    zoom(x, y, deltaScale, cv) {
        const { transform: { scale }, minScale, maxScale } = this.state;
        const { left, top } = this.domNode.getBoundingClientRect();
        const originX = x - left;
        const originY = y - top;
        const newOriginX = originX / scale;
        const newOriginY = originY / scale;
        const translateX = this.getTranslate('x', originX);
        const translateY = this.getTranslate('y', originY);
        const newScale = cv ? this.clamp(deltaScale, minScale, maxScale) :
            this.getNewScale(deltaScale);

        this.state.transform = {
            ...this.state.transform,
            originOffset: true,
            originX: newOriginX,
            originY: newOriginY,
            scale: newScale
        };

        this.renderClamped(translateX, translateY);
        this.zoomMode = true;

        if (this.slider) {
            this.setSliderValue(newScale);
        }
    }

    pan(originX, originY) {
        this.renderClamped(
            this.state.transform.translateX + originX,
            this.state.transform.translateY + originY
        );
    }

    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    onTouchStart(e) {
        const touches = [...e.touches];

        if (touches.length === 2) {
            e.preventDefault();

            const touch1 = touches[0];
            const touch2 = touches[1];
            const distance = this.getTouchDistance(touch1, touch2);

            if (distance > 0) {
                this.state.touchGesture = {
                    isActive: true,
                    initialDistance: distance,
                    initialScale: this.state.transform.scale,
                    lastTouchX: null,
                    lastTouchY: null
                };
            }
        }
    }

    onTouchMove(e) {
        const touches = [...e.touches];

        if (touches.length === 2 && this.state.touchGesture.isActive) {
            e.preventDefault();

            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = this.getTouchDistance(touch1, touch2);
            const center = this.getTouchCenter(touch1, touch2);

            const scaleChange = currentDistance / this.state.touchGesture.initialDistance;
            const newScale = this.state.touchGesture.initialScale * scaleChange;

            this.zoom(center.x, center.y, newScale, true);
        }
        else if (touches.length === 1 && this.zoomMode) {
            e.preventDefault();
            const touch = touches[0];
            const {lastTouchX, lastTouchY} = this.state.touchGesture;
            const movementX = touch.clientX - (lastTouchX || touch.clientX);
            const movementY = touch.clientY - (lastTouchY || touch.clientY);
            this.state.touchGesture.lastTouchX = touch.clientX;
            this.state.touchGesture.lastTouchY = touch.clientY;
            this.pan(movementX, movementY);
        }
    }

    onTouchEnd(e) {
        const touches = [...e.touches];

        if (touches.length < 2) {
            this.state.touchGesture.isActive = false;
            this.state.touchGesture.initialDistance = 0;
            this.state.touchGesture.initialScale = 1;
            this.state.touchGesture.lastTouchX = null;
            this.state.touchGesture.lastTouchY = null;
        }
    }

    reset() {
        if (this.domNode) {
            this.domNode.style.transformOrigin = '';
            this.domNode.style.transform = '';
        }
        this.state = {
            minScale: 0.01,
            maxScale: 30,
            sensitivity: 20,
            originOffset: false,
            transform: {
                originX: 0,
                originY: 0,
                translateX: 0,
                translateY: 0,
                scale: 1
            },
            touchGesture: {
                isActive: false,
                initialDistance: 0,
                initialScale: 1,
                lastTouchX: null,
                lastTouchY: null
            }
        };
        this.zoomMode = false;
    }

    destroy() {
        this.reset();
        this.containerNode.removeEventListener('mousedown', this.onPick);
        this.containerNode.removeEventListener('mouseup', this.onPick);
        this.containerNode.removeEventListener('mouseleave', this.onPick);
        this.containerNode.removeEventListener('mousemove', this.onMove);
        this.containerNode.removeEventListener('touchstart', this.onTouchStart);
        this.containerNode.removeEventListener('touchmove', this.onTouchMove);
        this.containerNode.removeEventListener('touchend', this.onTouchEnd);
        $(this.viewerNode).unbind('mousewheel.imgzoom');
        $(this.containerNode).unbind('mousemove.imgzoom');

        if (this.slider) {
            this.slider.classList.add('hidden');
            this.slider = null;
        }
    }
}
