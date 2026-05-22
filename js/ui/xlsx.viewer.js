class XlsxViewer {

    constructor() {
        this.CONTENT_ID = 'xlsx-content';
        this.TABS_ID = 'xlsx-tabs';
        this.workbook = null;
        this.activeSheet = 0;
        this.renderedSheets = new Set();
        this.renderer = null;
        this.loadSeq = 0;

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

    emitError(code) {
        this.postToParent({ type: 'xlsxviewer:error', code });
    }

    render() {
        this.contentNode.replaceChildren();
        this.tabsNode.replaceChildren();

        const sheets = this.workbook && this.workbook.sheets || [];

        if (!sheets.length) {
            const empty = document.createElement('div');
            empty.className = 'xlsx-empty';
            empty.textContent = 'No sheets to display';
            this.contentNode.appendChild(empty);
            return;
        }

        this.renderer = new XlsxParser.XlsxRenderer(this.workbook, {
            onInternalLinkClick: (idx) => this.switchSheet(idx)
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

    destroy() {
        this.loadSeq++;
        this.workbook = null;
        this.renderer = null;
        this.renderedSheets = new Set();
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

var xlsxViewerInstance = new XlsxViewer();
