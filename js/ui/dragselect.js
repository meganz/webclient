((scope) => {
    'use strict';

    class DragSelect {
        /**
         * @param {HTMLElement} el Element to add the event listeners to
         * @param {Object.<String, any>} data Drag data
         * @param {String[]} [data.allowedClasses] Additional classes allowed to trigger drag events
         * @param {Number} [data.scrollMargin] Area on where to trigger vertical scroll
         * @param {Function} [data.onDragStart] Method to call when the mousedown is triggered
         * @param {Function} [data.onDragMove] Method to call when the select area is about to re-render
         * @param {Function} [data.onDragEnd] Method to call when the mouse button is released
         * @param {Function} [data.getScrollTop] Method to retrieve scroll position
         * @param {Function} [data.onScrollUp] Method to call when scroll up is needed
         * @param {Function} [data.onScrollDown] Method to call when scroll down is needed
         */
        constructor(
            el,
            {
                allowedClasses,
                onDragStart,
                onDragMove,
                onDragEnd,
                scrollMargin,
                onScrollUp,
                onScrollDown,
                getScrollTop
            }) {
            if (el) {
                this.el = el;

                this.createDragArea();
                this.startListening(el, allowedClasses);
                this.scrollMargin = scrollMargin || 50;

                this.onScrollUp = onScrollUp || nop;
                this.onScrollDown = onScrollDown || nop;
                this.onDragStart = onDragStart || nop;
                this.onDragMove = onDragMove || nop;
                this.onDragEnd = onDragEnd || nop;

                this.getScrollTop = typeof getScrollTop === 'function' ? getScrollTop : () => el.scrollTop;
                this._disabled = false;
            }
        }

        get disabled() {
            return this._disabled;
        }

        /**
         * @param {Boolean} status Whether the drag events should be ignored or not
         * @returns {void}
         */
        set disabled(status) {
            this._disabled = status;
        }

        updatePosition(l, r, t, b, { x, y, right, bottom }) {
            if (l < x) {
                l = x;
            }

            if (t < y) {
                t = y;
            }

            if (r >= right) {
                r = right - 2;
            }

            if (b >= bottom) {
                b = bottom - 2;
            }

            this.area.style.left = l + 'px';
            this.area.style.width = (r - l) + 'px';
            this.area.style.top = t + 'px';
            this.area.style.height = (b - t) + 'px';
        }

        createDragArea() {
            this.area = document.createElement('div');
            this.area.className = 'ui-selectable-helper';
        }

        startListening(el, cl) {
            // Disposing the previous events, if any
            this.dispose();

            let scrollTimeout = null;

            this._disposeDown = MComponent.listen(document, 'mousedown', (evt) => {
                const { target, pageX: left, pageY: top } = evt;

                if (target !== el
                    && (!Array.isArray(cl)
                        || !cl.length
                        || !cl.some(c => target.classList.contains(c)))) {
                    return true;
                }

                const rect = el.getBoundingClientRect();

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }

                const initScrollTop = this.getScrollTop();
                let yCorrection = 0;
                let mouseX = left;
                let mouseY = top;
                this.isDragging = false;

                const handleMovement = (moveEvt) => {
                    if (this._disabled) {
                        return;
                    }

                    const vals = [];
                    const { pageX: newX, pageY: newY } = moveEvt;

                    if (!this.isDragging) {
                        this.isDragging = true;

                        document.body.append(this.area);

                        if (this.onDragStart) {
                            this.onDragStart(left - rect.x, top - rect.y, evt);
                        }
                    }

                    mouseX = newX;
                    mouseY = newY;

                    if (newX > left) {
                        vals.push(left, newX);
                    }
                    else {
                        vals.push(newX, left);
                    }

                    if (newY > top - yCorrection) {
                        vals.push(top - yCorrection, newY);
                    }
                    else {
                        vals.push(newY, top - yCorrection);
                    }

                    this.updatePosition(...vals, rect);

                    if (this.onScrollDown && newY >= rect.bottom - this.scrollMargin) {
                        this.onScrollDown();
                    }
                    else if (this.onScrollUp && newY <= rect.y + this.scrollMargin) {
                        this.onScrollUp();
                    }

                    if (this.onDragMove) {
                        let xPos = 0;
                        let yPos = 0;

                        if (newX > rect.right) {
                            xPos = el.clientWidth;
                        }
                        else if (newX > rect.x) {
                            xPos = newX - rect.x;
                        }

                        if (newY > rect.bottom) {
                            yPos = el.clientHeight;
                        }
                        else if (newY > rect.y) {
                            yPos = newY - rect.y;
                        }

                        this.onDragMove(xPos, yPos, moveEvt);
                    }
                };

                this._disposeMove = MComponent.listen(document, 'mousemove', handleMovement);

                this._disposeUp = MComponent.listen(document, 'mouseup', (upEvt) => {
                    this.disposeEvent('Move');
                    this.disposeEvent('Up');
                    this.disposeEvent('Scroll');
                    this.disposeEvent('Over');

                    if (this.isDragging) {
                        this.isDragging = false;

                        if (this.onDragEnd) {
                            this.onDragEnd(true, yCorrection, this.area.getBoundingClientRect(), upEvt);
                        }

                        document.body.removeChild(this.area);
                    }
                    else {
                        this.onDragEnd(false, 0, null, upEvt);
                    }
                });

                this._disposeScroll = MComponent.listen(el, 'scroll', () => {
                    if (!this.isDragging) {
                        return;
                    }

                    const newCorrection = this.getScrollTop() - initScrollTop;
                    const diff = newCorrection - yCorrection;
                    yCorrection = newCorrection;

                    if (!yCorrection || !diff) {
                        return;
                    }

                    let t = (diff) ? mouseY - (rect.bottom - this.scrollMargin) : rect.y + this.scrollMargin - mouseY;

                    if (t > 50) {
                        t = 50;
                    }

                    scrollTimeout = setTimeout(() => {
                        if (this.isDragging) {
                            handleMovement({ pageX: mouseX, pageY: mouseY });
                        }
                    }, 500 / t);
                });

                return true;
            });
        }

        scrollUp(rate) {
            this.onScrollUp(rate);
            this.scrollUp(rate);
        }

        disposeEvent(key) {
            key = '_dispose' + key;

            if (this[key]) {
                this[key]();
                delete this[key];
            }
        }

        dispose() {
            this.disposeEvent('Down');
            this.disposeEvent('Up');
            this.disposeEvent('Move');
            this.disposeEvent('Scroll');
            this.disposeEvent('Over');
        }
    }

    scope.dragSelect = DragSelect;
})(mega.ui);
