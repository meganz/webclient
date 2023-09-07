$.widget.extend($.ui.selectable.prototype, {

    _create: function() {

        'use strict';

        this._addClass('ui-selectable');

        this.dragged = false;

        // Cache selectee children based on filter
        this.refresh = function(clear) {

            if (d) {
                console.time('selectable item refresh');
            }
            this.elementPos = $(this.element[0]).offset();
            this.selectees = $(this.options.filter, this.element[0]);

            const $currentViewSelectee = this.selectees;

            if (M.megaRender && M.megaRender.megaList) {
                this.selectees = this._getJQSelecteesFromMegaList();

                if (clear) {
                    for (let i = this.selectees.length; i--;) {
                        $(this.selectees[i]).removeData('selectable-item');
                    }
                }
            }

            for (let i = $currentViewSelectee.length; i--;) {

                var $elm = $($currentViewSelectee[i]);
                var selData = $elm.data('selectable-item');

                $currentViewSelectee[i].classList.add('ui-selectee');

                if (selData && this.dragged) {
                    continue;
                }

                var selecteeOffset = $elm.offset();
                var pos = {
                    left: selecteeOffset.left - this.elementPos.left,
                    top: selecteeOffset.top - this.elementPos.top
                };

                if (this.options.appendTo) {
                    pos.left += this.element.scrollLeft();
                    pos.top += this.element.scrollTop();
                }

                $.data($currentViewSelectee[i], 'selectable-item', {
                    element: $currentViewSelectee[i],
                    $element: $elm,
                    left: pos.left,
                    top: pos.top,
                    right: pos.left + $elm.outerWidth(),
                    bottom: pos.top + $elm.outerHeight(),
                    startselected: false,
                    selected: $elm.hasClass('ui-selected'),
                    selecting: $elm.hasClass('ui-selecting'),
                    unselecting: $elm.hasClass('ui-unselecting')
                });
            }

            if (d) {
                console.timeEnd('selectable item refresh');
            }
        };

        this.triggerMouseMove = this._mouseDrag;

        this.refresh();

        this._mouseInit();

        this.helper = $('<div>');
        this._addClass(this.helper, 'ui-selectable-helper');
    },

    _mouseStart: function(event) {

        'use strict';

        var options = this.options;

        this.elementPos = $(this.element[0]).offset();

        if (options.appendTo) {
            event.pageX += this.element.scrollLeft() - this.elementPos.left;
            event.pageY += this.element.scrollTop() - this.elementPos.top;
        }

        this.opos = [event.pageX, event.pageY];

        if (this.options.disabled) {
            return;
        }

        if (M.megaRender && M.megaRender.megaList) {
            this.selectees = this._getJQSelecteesFromMegaList();
            this.mlistMap = array.to.object(M.megaRender.megaList.items);
        }
        else {
            this.selectees = $(options.filter, this.element[0]);
            delete this.mlistMap;
        }

        this._trigger('start', event);

        $(options.appendTo).append(this.helper);

        // position helper (lasso)
        this.helper.css({
            'left': event.pageX,
            'top': event.pageY,
            'width': 0,
            'height': 0
        });

        if (options.autoRefresh) {
            this.refresh(true);
        }

        const $selected = this.selectees.filter('.ui-selected');

        for (let i = $selected.length; i--;) {
            let selectee = $.data($selected[i], 'selectable-item');

            if (!selectee && M.megaRender) {
                selectee = this._setJQSelecteePosForMegalist($selected[i]);
            }

            selectee.startselected = true;
            if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {

                // Using jQuery UI class toggle is too heavy for recurring
                // this._removeClass(selectee.$element, 'ui-selected');
                selectee.element.classList.remove('ui-selected');
                selectee.selected = false;
                // this._addClass(selectee.$element, 'ui-unselecting');
                selectee.element.classList.add('ui-unselecting');
                selectee.unselecting = true;

                if (selectionManager) {
                    selectionManager.clear_selection();
                }
                else {
                    // selectable UNSELECTING callback
                    this._trigger('unselecting', event, {
                        unselecting: selectee.element,
                        fromJQSelect: true
                    });
                }
            }
        }

        var $target = $(event.target).parents().addBack();

        for (let i = $target.length; i--;) {
            var doSelect;
            const selectee = $.data($target[i], 'selectable-item');
            if (selectee) {
                doSelect = !event.metaKey && !event.ctrlKey ||
                    !selectee.$element.hasClass('ui-selected');
                this._removeClass(selectee.$element, doSelect ? 'ui-unselecting' : 'ui-selected')
                    ._addClass(selectee.$element, doSelect ? 'ui-selecting' : 'ui-unselecting');
                selectee.unselecting = !doSelect;
                selectee.selecting = doSelect;
                selectee.selected = doSelect;

                // selectable (UN)SELECTING callback
                if (doSelect) {
                    this._trigger('selecting', event, {
                        selecting: selectee.element
                    });
                }
                else {
                    this._trigger('unselecting', event, {
                        unselecting: selectee.element
                    });
                }
                break;
            }
        }
    },

    _mouseDrag: function(event) {

        'use strict';

        this.dragged = true;

        if (this.options.disabled) {
            return;
        }

        let pageX = event.pageX;
        let pageY = event.pageY;

        if (this.options.appendTo) {
            pageX += this.element.scrollLeft() - this.elementPos.left;
            pageY += this.element.scrollTop() - this.elementPos.top;
        }

        let tmp, maxX, maxY;
        var options = this.options;
        var x1 = this.opos[0];
        var y1 = this.opos[1];
        var x2 = pageX;
        var y2 = pageY;

        this.dragDirY = 1;

        if (x1 > x2) {
            tmp = x2; x2 = x1; x1 = tmp;
        }
        if (y1 > y2) {
            tmp = y2; y2 = y1; y1 = tmp;
            this.dragDirY = -1;
        }

        // Lets limit drag within container only
        if (this.options.appendTo) {

            maxX = this.element[0].scrollWidth - 2;
            maxY = this.element[0].scrollHeight - 2;

            x1 = Math.max(0, x1);
            x2 = Math.min(maxX, x2);
            y1 = Math.max(0, y1);
            y2 = Math.min(maxY, y2);
        }

        this.helper.css({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 });

        for (let i = this.selectees.length; i--;) {

            var selectee = $.data(this.selectees[i], 'selectable-item');
            var hit = false;
            var offset = {};

            if (!selectee && M.megaRender) {
                selectee = this._setJQSelecteePosForMegalist(this.selectees[i]);
            }

            // prevent helper from being selected if appendTo: selectable
            if (!selectee || selectee.element === this.element[0]) {
                continue;
            }

            if (this.options.appendTo) {
                offset = selectee;
            }
            else {
                offset.left   = selectee.left   + this.elementPos.left;
                offset.right  = selectee.right  + this.elementPos.left;
                offset.top    = selectee.top    + this.elementPos.top;
                offset.bottom = selectee.bottom + this.elementPos.top;
            }
            if (options.tolerance === 'touch') {
                hit = !(offset.left > x2 || offset.right < x1 || offset.top > y2 || offset.bottom < y1);
            }
            else if (options.tolerance === 'fit') {
                hit = offset.left > x1 && offset.right < x2 && offset.top > y1 && offset.bottom < y2;
            }

            if (hit) {

                // SELECT
                if (selectee.selected) {
                    // this._removeClass(selectee.$element, 'ui-selected');
                    selectee.element.classList.remove('ui-selected');
                    selectee.selected = false;
                    selectee.selecting = true;

                    this._trigger('unselecting', event, {
                        unselecting: selectee.element
                    });
                }
                if (selectee.unselecting) {
                    // this._removeClass(selectee.$element, 'ui-unselecting');
                    selectee.element.classList.remove('ui-unselecting');
                    selectee.unselecting = false;
                }
                if (!selectee.selecting) {
                    // this._addClass(selectee.$element, 'ui-selecting');
                    selectee.element.classList.add('ui-selecting');
                    selectee.selecting = true;

                    // selectable SELECTING callback
                    this._trigger('selecting', event, {
                        selecting: selectee.element
                    });
                }
            }
            else {

                // UNSELECT
                if (selectee.selecting) {
                    if ((event.metaKey || event.ctrlKey) && selectee.startselected) {
                        // this._removeClass(selectee.$element, 'ui-selecting');
                        selectee.element.classList.remove('ui-selecting');
                        selectee.selecting = false;
                        // this._addClass(selectee.$element, 'ui-selected');
                        selectee.element.classList.add('ui-selected');
                        selectee.selected = true;
                    }
                    else {
                        // this._removeClass(selectee.$element, 'ui-selecting');
                        selectee.element.classList.remove('ui-selecting');
                        selectee.selecting = false;
                        if (selectee.startselected) {
                            // this._addClass(selectee.$element, 'ui-unselecting');
                            selectee.element.classList.add('ui-unselecting');
                            selectee.unselecting = true;
                        }

                        // selectable UNSELECTING callback
                        this._trigger('unselecting', event, {
                            unselecting: selectee.element
                        });
                    }
                }
                if (selectee.selected && !event.metaKey && !event.ctrlKey && !selectee.startselected) {
                    // this._removeClass(selectee.$element, 'ui-selected');
                    selectee.element.classList.remove('ui-selected');
                    selectee.selected = false;

                    // this._addClass(selectee.$element, 'ui-unselecting');
                    selectee.element.classList.add('ui-unselecting');
                    selectee.unselecting = true;

                    // selectable UNSELECTING callback
                    this._trigger('unselecting', event, {
                        unselecting: selectee.element
                    });
                }
            }
        }

        // Megalist drag to edge auto scroll
        if (this.element.hasClass('ps')) {

            const _getV = p => 225 / Math.max(5, p);

            delay('dragScroll', () => {

                const elm = this.element[0];
                const sct = elm.scrollTop;
                const offH = elm.offsetHeight;
                const minsct = M.megaRender && M.megaRender.megaList ? M.megaRender.megaList.options.headerHeight : 0;

                if (!this.dragged ||
                    sct === 0 && this.dragDirY === -1 ||
                    sct + offH >= maxY && this.dragDirY === 1 ||
                    elm.scrollHeight === offH) {
                    return false;
                }

                const dragPointerTop = event.pageY - this.elementPos.top - minsct;
                const dragPointerBot = offH - (event.pageY - this.elementPos.top);

                if (dragPointerTop < 45) {

                    elm.scrollTop -= _getV(dragPointerTop);
                    this._mouseDrag(event);
                    this.refresh();
                }
                else if (dragPointerBot < 45) {

                    elm.scrollTop += _getV(dragPointerBot);
                    this._mouseDrag(event);
                    this.refresh();
                }
            }, 50);

            if (M.megaRender && M.megaRender.megaList) {
                M.megaRender.megaList.throttledOnScroll({target: this.element[0]});
            }
        }

        return false;
    },

    _mouseStop: function(event) {

        'use strict';

        this.dragged = false;

        for (let i = this.selectees.length; i--;) {
            const elm = this.selectees[i];
            var selectee = $.data(elm, 'selectable-item');

            if (!selectee && M.megaRender) {

                selectee = this._setJQSelecteePosForMegalist(elm);

                if (M.megaRender.megaList) {
                    delete this.mlistMap;
                }
            }

            if (elm.classList.contains('ui-unselecting')) {
                selectee.element.classList.remove('ui-unselecting');
                // this._removeClass(selectee.$element, 'ui-unselecting');
                selectee.unselecting = false;
                selectee.startselected = false;
                this._trigger('unselected', event, {
                    unselected: selectee.element
                });
            }
            else if (elm.classList.contains('ui-selecting')) {
                selectee.element.classList.remove('ui-selecting');
                selectee.element.classList.add('ui-selected');
                // this._removeClass(selectee.$element, 'ui-selecting')
                //  ._addClass(selectee.$element, 'ui-selected');
                selectee.selecting = false;
                selectee.selected = true;
                selectee.startselected = true;
                this._trigger('selected', event, {
                    selected: selectee.element
                });
            }
        }

        this._trigger('stop', event);

        this.helper.remove();

        return false;
    },

    // MegaRender and MegaList related custom functions. Only works when there is MegaRender and List
    _getJQSelecteesFromMegaList: function() {

        'use strict';

        if (!M.megaRender || !M.megaRender.megaList) {
            return;
        }

        const mlist = M.megaRender.megaList;

        const lidx = Math.max(Object.keys(M.megaRender.nodeMap).length, mlist._calculated.visibleLastItemNum);

        return $(mlist.items.slice(0, lidx).map(id => M.megaRender.getDOMNode(id)));
    },

    _setJQSelecteePosForMegalist: function(n) {

        'use strict';

        if (M.megaRender && M.megaRender.megaList) {

            const mlist = M.megaRender.megaList;

            const elm = typeof n === 'string' ? M.megaRender.getDOMNode(n) : n;
            const $this = $(elm);
            const selecteeOffset = $this.offset();
            const ih = mlist.options.itemHeight;
            const iw = mlist._calculated.itemWidth;

            // This node seems not exist on dom, need to calculate position manually
            if (selecteeOffset.top === 0 || selecteeOffset.left === 0) {
                const ipr = mlist._calculated.itemsPerRow;
                const ipos = this.mlistMap ? this.mlistMap[n.id] - 1 : mlist.items.indexOf(n.id);
                const marginSpace = M.megaRender.viewmode ? [24, 24] : [0, 26];

                selecteeOffset.top = ih * Math.floor(ipos / ipr) + marginSpace[0];
                selecteeOffset.left = ipos % ipr * iw + marginSpace[1];
            }

            const pos = {
                element: elm,
                $element: $this,
                left: selecteeOffset.left,
                top: selecteeOffset.top,
                right: selecteeOffset.left + iw,
                bottom: selecteeOffset.top + ih,
                startselected: false,
                selected: $this.hasClass("ui-selected"),
                selecting: $this.hasClass("ui-selecting"),
                unselecting: $this.hasClass("ui-unselecting")
            };

            $.data(elm, "selectable-item", pos);

            return pos;
        }
    },
});
