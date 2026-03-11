/** @property T.ui.qrDialog */
lazy(T.ui, 'qrDialog', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);

    const cn = ce('dialog', T.ui.dialog.content, {
        'aria-labelledby': 'qr-dialog-title',
        'aria-modal': true,
        class: 'it-dialog-holder qr-dialog-holder js-qr-dialog hidden'
    });
    let node = ce(
        'section', cn, {class: 'it-box it-dialog lg-shadow qr-dialog modal md-size'}
    );
    let subNode = null;
    let btnNode = null;

    node = ce('div', node, {class: 'body scroll-area'});

    // Header
    subNode = ce('header', node);
    ce('h5', subNode, {id: 'qr-dialog-title'}).textContent = l.transferit_share_qr;

    // Close btn
    btnNode = ce('button', subNode, {
        class: 'it-button ghost icon xl-size js-close',
        'aria-label': l[148]
    });
    ce('i', btnNode, {class: 'sprite-it-x32-mono icon-close'});
    btnNode.addEventListener('click', () => T.ui.dialog.hide(cn));

    // Content: canvas
    subNode = ce('div', node, {class: 'content'});
    const canvasCn = ce('div', subNode, {class: 'canvas-cn'});

    // Footer: Download btn
    subNode = ce('footer', node, {class: 'fw-items'});
    btnNode = ce('button', subNode, {class: 'it-button xl-size js-positive-btn disabled'});
    ce('span', btnNode).textContent = l[58];

    btnNode.addEventListener('click', () => {
        const link = canvasCn.querySelector('a');
        if (link) {
            link.click();
        }
    });

    // Draw QR dots
    const drawDot = (ctx, x, y, size) => {
        const r = size / 2;

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.fill();
    };

    // Draw QR finders
    const drawFinder = (ctx, x, y, size) => {
        const outerR = size / 2;
        const innerR = size * 0.65 / 2;
        const centerR = size * 0.35 / 2;

        const cx = x + outerR;
        const cy = y + outerR;

        // Outer circle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fill();

        // White space
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
        ctx.fill();
    };

    const showQr = (opts) => {
        const size = 200;
        let {text, fileName = 'qr_code'} = opts;

        canvasCn.textContent = '';
        fileName = `transfer.it_${fileName}.png`;

        const canvas = ce('canvas', canvasCn);
        const lnk = ce('a', canvasCn, {class: 'qr-logo', tabindex: -1, 'aria-disabled': 'true'});
        const ctx = canvas.getContext('2d');

        const qr = new QRCode(0, QRErrorCorrectLevel.H);
        qr.addData(text);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(size / moduleCount);
        const qrSize = cellSize * moduleCount;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);

        const offset = Math.floor((size - qrSize) / 2);

        // Set logo size
        const logoPercent = 0.22;
        const logoSize = qrSize * logoPercent;
        const logoX = offset + (qrSize - logoSize) / 2;
        const logoY = offset + (qrSize - logoSize) / 2;

        // Draw dots
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                const inTopLeft = row < 7 && col < 7;
                const inTopRight = row < 7 && col >= moduleCount - 7;
                const inBottomLeft = row >= moduleCount - 7 && col < 7;

                const x = offset + col * cellSize;
                const y = offset + row * cellSize;

                // skip logo dots
                const inLogo = x + cellSize > logoX && x < logoX + logoSize &&
                    y + cellSize > logoY && y < logoY + logoSize;

                if (qr.isDark(row, col) && !inTopLeft && !inTopRight && !inBottomLeft && !inLogo) {
                    drawDot(ctx, x, y, cellSize);
                }
            }
        }

        // Draw finders
        const finderSize = cellSize * 7;
        drawFinder(ctx, offset, offset, finderSize);
        drawFinder(ctx, offset + qrSize - finderSize, offset, finderSize);
        drawFinder(ctx, offset, offset + qrSize - finderSize, finderSize);

        // Add logo
        const src = String(getComputedStyle(lnk).backgroundImage).replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        webgl.loadImage(src)
            .then((img) => {
                if (img.naturalWidth) {
                    ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
                }
            })
            .catch((ex) => self.d && console.error('Failed to load logo...', ex))
            .finally(() => {
                // Allow DL image ieven if logo is not loaged
                canvas.toBlob((blob) => {
                    lnk.download = fileName;
                    lnk.href = URL.createObjectURL(blob);
                    btnNode.classList.remove('disabled');
                });
            });
    };

    return freeze({
        show(opts = {}) {

            if (!('text' in opts)) {
                return false;
            }

            showQr(opts);

            // Show dialog
            T.ui.dialog.show(cn);
        }
    });
});
