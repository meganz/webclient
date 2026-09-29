class MegaQrPopup extends MegaComponent {

    /**
     * Popup showing a link QR code, with a button to download it as an image
     * @param {Object} options Component options
     * @param {HTMLElement} options.parentNode Node the popup is appended to
     * @param {HTMLElement} options.targetNode The button the popup is anchored to
     * @param {String|Function} options.link The link to encode, or a getter for it
     * @param {String|Function} options.fileName The name of the downloaded file, or a getter for it
     */
    constructor(options) {
        options.componentClassname = 'qrcode-popup hidden';
        super(options);

        this.targetNode = options.targetNode;
        this.link = options.link;
        this.fileName = options.fileName;

        const header = mCreateElement('div', {class: 'qrcode-popup-content-header'}, [
            document.createTextNode(l[17754])
        ]);
        this.qrNode = mCreateElement('div', {class: 'qrcode-popup-content-body'});
        const content = mCreateElement('div', {class: 'qrcode-popup-content'}, [header, this.qrNode], this.domNode);

        MegaButton.factory({
            parentNode: header,
            icon: 'sprite-fm-mono icon-download-thin-outline icon-size-20',
            componentClassname: 'text-icon download-qrcode simpletip',
            type: 'icon',
            dataset: {simpletip: l[58], simpletipwrapper: 'body', simpletipposition: 'top'}
        }).on('click.download', () => MegaQrPopup.save(this.getValue('link'), this.getValue('fileName')));

        MegaButton.factory({
            parentNode: content,
            icon: 'sprite-fm-mono icon-dialog-close icon-size-20',
            componentClassname: 'text-icon close-qrcode',
            type: 'icon'
        }).on('click.close', () => this.hide());

        this._onOutside = ev => !this.domNode.contains(ev.target) && !this.targetNode.contains(ev.target) &&
            this.hide();
        this._onScroll = ev => !this.domNode.contains(ev.target) && this.hide();
    }

    getValue(key) {
        return typeof this[key] === 'function' ? this[key]() : this[key];
    }

    show() {
        MegaQrPopup.render(this.qrNode, this.getValue('link'));

        super.show();
        this.targetNode.classList.add('active');
        this.position();

        document.addEventListener('mousedown', this._onOutside, true);
        document.addEventListener('scroll', this._onScroll, true);
    }

    hide() {
        super.hide();
        this.targetNode.classList.remove('active');

        document.removeEventListener('mousedown', this._onOutside, true);
        document.removeEventListener('scroll', this._onScroll, true);
    }

    position() {
        // A transformed ancestor, e.g. a sheet, is the containing block of the fixed popup
        let box = this.parentNode;
        while (box && getComputedStyle(box).transform === 'none') {
            box = box.parentElement;
        }

        const origin = box ? box.getBoundingClientRect() : {left: 0, top: 0};
        const rect = this.targetNode.getBoundingClientRect();
        const x = (lang === 'ar' ? rect.left - 26 : rect.right + 26) - origin.left;

        this.domNode.style.cssText = `top: ${rect.top - 24 - origin.top}px; left: ${x}px`;
    }

    destroy() {
        this.hide();
        super.destroy();
    }

    /**
     * Renders a QR code into a node, replacing its contents
     * @param {HTMLElement} node The node to render into
     * @param {String} text The link to encode
     * @returns {void}
     */
    static render(node, text) {
        $(node).empty().qrcode({
            width: 168,
            height: 168,
            correctLevel: QRErrorCorrectLevel.H,
            background: 'rgba(255, 255, 255, 1)',
            foreground: 'rgba(0, 0, 0, 1)',
            text
        });

        const canvas = node.querySelector('canvas');
        MegaQrPopup.drawLogo(canvas.getContext('2d'), canvas.width);
    }

    /**
     * Shows a QR code in a modal sheet, for mobile
     * @param {String} text The link to encode
     * @param {Function} [onClose] Called when the user closes the sheet
     * @returns {void}
     */
    static showSheet(text, onClose) {
        const qrCode = mCreateElement('div', {class: 'qrcode'});

        MegaQrPopup.render(qrCode, text);

        mega.ui.sheet.show({
            name: 'qrcode',
            type: 'modal',
            showClose: true,
            title: l[17754],
            contents: [qrCode],
            onClose
        });
    }

    /**
     * Draws the MEGA logo in the middle of a QR code, which error correction H keeps scannable
     * @param {CanvasRenderingContext2D} ctx The QR code canvas context
     * @param {Number} size The QR code width, without its quiet zone
     * @returns {void}
     */
    static drawLogo(ctx, size) {
        // The logo is images/mega/mega-icon.svg, a 64px box taking 22% of the code
        const scale = size * 0.22 / 64;

        ctx.save();
        ctx.translate(ctx.canvas.width / 2 - 32 * scale, ctx.canvas.height / 2 - 32 * scale);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(32, 32, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d90007';
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fill(new Path2D(
            'M47 41.133C47 41.6205 46.6062 41.9997 46.1187 41.9997H42.3313C41.8438 41.9997 41.45 41.6205 41.45 41.133' +
            'V29.8122C41.45 29.7038 41.3187 29.6677 41.2625 29.7219L33.2563 37.5219' +
            'C32.5625 38.208 31.4375 38.208 30.7437 37.5219L22.7375 29.7219' +
            'C22.6813 29.6677 22.55 29.7038 22.55 29.8122V41.133C22.55 41.6205 22.1562 41.9997 21.6687 41.9997' +
            'H17.8813C17.3938 41.9997 17 41.6205 17 41.133V21.1997C17 20.7122 17.3938 20.333 17.8813 20.333H20.4875' +
            'C20.9562 20.333 21.4062 20.5136 21.7438 20.8386L31.6812 30.5344' +
            'C31.85 30.6969 32.15 30.6969 32.3188 30.5344L42.2563 20.8386' +
            'C42.5938 20.5136 43.0438 20.333 43.5125 20.333H46.1187C46.6062 20.333 47 20.7122 47 21.1997V41.133Z'
        ));
        ctx.restore();
    }

    /**
     * Saves a QR code as a PNG image, with a quiet zone so it scans when printed
     * @param {String} text The link to encode
     * @param {String} name The name used for the file name
     * @returns {void}
     */
    static save(text, name) {
        const qr = new QRCode(-1, QRErrorCorrectLevel.H);
        qr.addData(text);
        qr.make();

        const count = qr.getModuleCount();
        const scale = 16;
        const margin = 4;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.height = (count + margin * 2) * scale;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';

        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
                }
            }
        }

        MegaQrPopup.drawLogo(ctx, count * scale);
        canvas.toBlob(blob => M.saveAs(blob, `${M.getSafeName(name)}_qr.png`), 'image/png');
    }
}
