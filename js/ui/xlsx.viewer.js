class XlsxViewer {

    constructor() {
        this.CONTENT_ID = 'xlsx-content';
        this.TABS_ID = 'xlsx-tabs';
        this.workbook = null;
        this.activeSheet = 0;
        this.renderedSheets = new Set();
        this.renderer = null;
        this.loadSeq = 0;
        this.strings = null;

        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            this.prepare();
        }
        else {
            document.addEventListener('DOMContentLoaded', () => {
                this.prepare();
            }, false);
        }
    }

    prepare() {
        this.contentNode = document.getElementById(this.CONTENT_ID);
        this.tabsNode = document.getElementById(this.TABS_ID);
        this.nameBox = document.getElementById('xlsx-name-box');
        this.formulaContent = document.getElementById('xlsx-formula-content');

        window.addEventListener('message', (ev) => {
            if (ev.source !== window.parent) {
                return;
            }
            const msg = ev.data;
            if (!msg || typeof msg !== 'object') {
                return;
            }
            if (msg.type === 'xlsxviewer:load') {
                this.handleLoad(msg);
            }
            else if (msg.type === 'xlsxviewer:thumbnail') {
                this.handleThumbnail(msg);
            }
            else if (msg.type === 'xlsxviewer:cleanup') {
                this.destroy();
            }
        });

        window.addEventListener('error', (ev) => {
            console.error('XlsxViewer uncaught error', ev.message);
            this.emitError(-1);
        });
        window.addEventListener('unhandledrejection', (ev) => {
            console.error('XlsxViewer unhandled rejection', ev.reason);
            this.emitError(-1);
        });

        this.postToParent({ type: 'xlsxviewer:ready' });
    }

    postToParent(message, transfer) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*', transfer || []);
        }
    }

    handleLoad(msg) {
        const {buffer} = msg;
        const ext = (msg.ext || 'xlsx').toLowerCase();

        if (!buffer) {
            this.emitError(-2);
            return;
        }
        this.applyLocale(msg);

        const seq = ++this.loadSeq;
        XlsxParser.parseSpreadsheet(buffer, ext).then((workbook) => {
            if (seq !== this.loadSeq) {
                return;
            }
            this.workbook = workbook;
            this.activeSheet = 0;
            this.renderedSheets = new Set();
            this.render();
        }).catch((ex) => {
            if (seq !== this.loadSeq) {
                return;
            }
            console.error('Exception parsing spreadsheet', ex);
            this.emitError(-1);
        });
    }

    applyLocale(msg) {
        this.strings = msg.strings && typeof msg.strings === 'object' ? msg.strings : null;
        XlsxParser.setLocale(msg.locale);
    }

    handleThumbnail(msg) {
        const {buffer, reqId, css} = msg;
        const ext = (msg.ext || '').toLowerCase();
        const done = (data) => this.postToParent({ type: 'xlsxviewer:thumbnail:done', reqId, dataURL: null, ...data });
        if (!buffer) {
            done();
            return;
        }
        this.applyLocale(msg);
        const holder = document.createElement('div');
        holder.style.cssText = 'position:absolute;left:-99999px;top:0';
        const inner = document.createElement('div');
        inner.style.width = '1000px';
        holder.appendChild(inner);
        document.body.appendChild(holder);
        XlsxParser.parseSpreadsheet(buffer, ext === 'csv' ? 'csv' : 'xlsx')
            .then((wb) => XlsxParser.parseSheetRows(wb, 0).then(() => {
                new XlsxParser.XlsxRenderer(wb, {strings: this.strings, thumbnail: true}).renderSheet(0, inner);
                return captureNode(inner, css);
            }))
            .then((canvas) => done(canvas && {
                dataURL: canvas.toDataURL('image/png'),
                width: canvas.width,
                height: canvas.height
            }))
            .catch(() => done())
            .then(() => holder.remove());
    }

    emitError(code) {
        this.postToParent({ type: 'xlsxviewer:error', code });
    }

    render() {
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        this.clearFormulaBar();
        this.contentNode.replaceChildren();
        this.tabsNode.replaceChildren();

        const sheets = this.workbook && this.workbook.sheets || [];

        if (!sheets.length) {
            const empty = document.createElement('div');
            empty.className = 'xlsx-empty';
            empty.textContent = this.strings.noSheets;
            this.contentNode.appendChild(empty);
            return;
        }

        this.renderer = new XlsxParser.XlsxRenderer(this.workbook, {
            onInternalLinkClick: (idx) => this.switchSheet(idx),
            onSelectionChange: (nameRef, info) => this.setFormulaBar(nameRef, info),
            strings: this.strings
        });
        this.renderer.renderTabs(this.tabsNode, this.activeSheet, (i) => this.switchSheet(i));
        this.renderActiveSheet();
    }

    renderActiveSheet() {
        const idx = this.activeSheet;
        XlsxParser.parseSheetRows(this.workbook, idx).then(() => {
            if (this.activeSheet !== idx || !this.renderer) {
                return;
            }
            this.renderer.renderSheet(idx, this.contentNode);
            this.renderedSheets.add(idx);
        }).catch((ex) => {
            console.error('Exception parsing sheet', ex);
        });
    }

    switchSheet(idx) {
        if (idx === this.activeSheet || !this.workbook || !this.renderer) {
            return;
        }
        this.activeSheet = idx;
        this.renderer.setActiveTab(this.tabsNode, idx);
        this.renderActiveSheet();
    }

    setFormulaBar(nameRef, info) {
        if (!this.nameBox || !this.formulaContent) {
            return;
        }
        if (!info) {
            this.clearFormulaBar();
            return;
        }
        this.nameBox.textContent = nameRef || '';
        this.formulaContent.replaceChildren();
        if (info.kind === 'formula') {
            const eq = document.createElement('span');
            eq.textContent = '=';
            this.formulaContent.appendChild(eq);
            for (const tok of info.tokens) {
                const span = document.createElement('span');
                span.textContent = tok.text;
                if (tok.color) {
                    span.className = 'xlsx-formula-token';
                    span.style.setProperty('--xlsx-ref-color', tok.color);
                }
                this.formulaContent.appendChild(span);
            }
        }
        else {
            this.formulaContent.textContent = info.text || '';
        }
    }

    clearFormulaBar() {
        if (this.nameBox) {
            this.nameBox.textContent = '';
        }
        if (this.formulaContent) {
            this.formulaContent.replaceChildren();
        }
    }

    destroy() {
        this.loadSeq++;
        this.workbook = null;
        if (this.renderer) {
            this.renderer.destroy();
        }
        this.renderer = null;
        this.renderedSheets = new Set();
        this.clearFormulaBar();
        if (this.contentNode) {
            this.contentNode.replaceChildren();
        }
        if (this.tabsNode) {
            if (this.tabsNode._xlsxTabsResizeObserver) {
                this.tabsNode._xlsxTabsResizeObserver.disconnect();
                this.tabsNode._xlsxTabsResizeObserver = null;
            }
            this.tabsNode.replaceChildren();
        }
    }
}

async function captureNode(node, css) {
    'use strict';
    const w = Math.min(node.scrollWidth || node.offsetWidth || 0, 1000);
    const h = Math.min(node.scrollHeight || node.offsetHeight || 0, 1400);
    if (!w || !h) {
        return null;
    }
    css = String(css || '');
    for (const sheet of document.styleSheets) {
        if (!sheet.href) {
            for (const rule of sheet.cssRules) {
                css += rule.cssText;
            }
        }
    }
    const xhtml = new XMLSerializer().serializeToString(node);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
        + '<foreignObject width="100%" height="100%">'
        + `<div xmlns="http://www.w3.org/1999/xhtml"><style>/*<![CDATA[*/${css}/*]]>*/</style>${xhtml}</div>`
        + '</foreignObject></svg>';
    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    return canvas;
}

var xlsxViewerInstance = new XlsxViewer();
