class MegaTextArea extends MegaComponent {
    constructor(options) {
        super(options);

        this.addClass('text-area-scroll');
        this.heightNode = document.createElement('div');
        this.heightNode.className = 'text-area-height';
        this.domNode.appendChild(this.heightNode);
        this.textArea = document.createElement('textarea');
        this.textArea.addEventListener('focus', () => {
            this.addClass('active');
        });
        this.textArea.addEventListener('blur', () => {
            this.removeClass('active');
        });
        this.heightNode.appendChild(this.textArea);

        this.placeholder = options.placeholder || '';
        if (typeof options.maxLength === 'number') {
            this.maxLength = options.maxLength;
        }

        if (is_mobile || options.noScroller) {
            return;
        }
        this.minHeight = options.minHeight || 20;
        this.maxHeight = options.maxHeight || 90;
        this.cloneArea = document.createElement('div');
        this.cloneArea.className = 'textarea-clone';
        this.domNode.appendChild(this.cloneArea);

        Ps.initialize(this.heightNode, {
            'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
            'minScrollbarLength': 20,
        });
        this.Ps = this.heightNode.Ps;
        this.adjustHeight();

        this.on('input.textarea change.textarea', () => {
            this.adjustHeight();
        });

        const onMouseMove = (ev) => {
            const offsets = this.heightNode.getBoundingClientRect();

            if (ev.clientY < offsets.top + 15) {
                this.heightNode.scrollTop = Math.max(this.heightNode.scrollTop - 3, 0);
            }
            else if (ev.clientY > offsets.top + this.heightNode.offsetHeight - 15) {
                this.heightNode.scrollTop =
                    Math.min(
                        this.heightNode.scrollTop + 3,
                        this.heightNode.scrollHeight - this.heightNode.offsetHeight
                    );
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
            delete this.mouseBoundFns;
        };

        this.on('mousedown.textarea', () => {
            this.mouseBoundFns = [onMouseUp, onMouseMove];
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('mousemove', onMouseMove);
        });
    }

    destroy() {
        super.destroy();
        if (this.mouseBoundFns && this.mouseBoundFns.length === 2) {
            document.removeEventListener('mouseup', this.mouseBoundFns[0]);
            document.removeEventListener('mousemove', this.mouseBoundFns[1]);
        }
    }

    adjustHeight() {
        if (!this.Ps) {
            return;
        }
        this.cloneArea.textContent = '';
        const content = `${escapeHTML(this.value).replace(/\n/g, '<br />')}<br>`;
        this.cloneArea.appendChild(parseHTML(content));
        const { height } = this.cloneArea.getBoundingClientRect();
        this.heightNode.style.height = `${Math.min(height, this.maxHeight)}px`;
        this.textArea.style.height = `${Math.max(this.minHeight, height)}px`;
        this.cloneArea.textContent = '';
        this.Ps.update();
    }

    get value() {
        return this.textArea.value || '';
    }

    set value(value) {
        this.textArea.value = value;
        this.adjustHeight();
    }

    set placeholder(string) {
        this.textArea.placeholder = string;
    }

    get maxLength() {
        return this.textArea.maxLength;
    }

    set maxLength(length) {
        this.textArea.maxLength = length;
    }

    get disabled() {
        return this.textArea.disabled;
    }

    set disabled(disable) {
        this.textArea.disabled = disable;
    }

    set spellcheck(enable) {
        if (enable) {
            this.textArea.setAttribute('spellcheck', 'true');
            return;
        }
        this.textArea.removeAttribute('spellcheck');
    }

    blur() {
        this.textArea.blur();
    }

    focus() {
        this.textArea.focus();
    }
}
