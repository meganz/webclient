class DocxViewer {

    /**
     * Waits for the document to be ready before signalling the iframe is ready for rendering.
     */
    constructor() {
        this.ROOT_ID = 'docx-container';
        if (document.readyState === "interactive" || document.readyState === "complete") {
            this.prepare();
        }
        else {
            document.addEventListener("DOMContentLoaded", () => {
                this.prepare();
            }, false);
        }
    }

    /**
     * Fetches DOM nodes + initialises event handling before signalling to the parent renders can begin.
     *
     * @returns {void} void
     */
    prepare() {
        this.renderNode = document.getElementById(this.ROOT_ID);

        document.addEventListener('docxviewerload', this.handleLoad.bind(this));
        document.addEventListener('docxviewercleanup', this.destroy.bind(this));
        window.addEventListener('resize', this.resize);
        window.addEventListener('message', (ev) => {
            const msg = ev.source === window.parent && ev.data;

            if (msg && msg.type === 'docxviewer:thumbnail') {
                this.handleThumbnail(msg);
            }
        });

        const loadedEv = new Event('docxviewerready');
        document.dispatchEvent(loadedEv);

        if (window.parent !== window) {
            window.parent.postMessage({type: 'docxviewer:ready'}, '*');
        }
    }

    /**
     * Handler for the docxviewerload event.
     * Requires the event data to include a blob of the docx file to render
     * Optionally include options on the event data to alter the default renderer behaviour
     *
     * Will trigger a docxviewererror event when an error occurs
     *
     * @see docx.defaultOptions
     * @param {Event} ev The event with the relevant data to render
     * @returns {void} void
     */
    handleLoad(ev) {
        this.config = ev.data.options;
        this.source = ev.data.blob;
        if (this.source) {
            this.render().then(this.resize).catch(ex => {
                console.error('Exception rendering docx', ex);
                const errEv = new Event('docxviewererror');
                errEv.data = { error: -1 };
                document.dispatchEvent(errEv);
            });
        }
        else {
            const errEv = new Event('docxviewererror');
            errEv.data = { error: -2 };
            document.dispatchEvent(errEv);
        }
    }

    handleThumbnail(msg) {
        const {buffer, reqId, css} = msg;
        const done = (data) => {
            window.parent.postMessage({type: 'docxviewer:thumbnail:done', reqId, dataURL: null, ...data}, '*');
        };
        if (!buffer) {
            done();
            return;
        }
        const holder = document.createElement('div');
        holder.style.cssText = 'position:absolute;left:-99999px;top:0';
        const inner = document.createElement('div');
        holder.appendChild(inner);
        document.body.appendChild(holder);
        docx.renderAsync(buffer, inner, null, {...this.config, useBase64URL: true})
            .then(() => captureNode(inner, css))
            .then((canvas) => done(canvas && {
                dataURL: canvas.toDataURL('image/png'),
                width: canvas.width,
                height: canvas.height
            }))
            .catch(() => done())
            .then(() => holder.remove());
    }

    /**
     * Clears any currently rendered nodes and prepares a new render
     *
     * @returns {Promise<*>} Promise from the rendering library.
     */
    async render() {
        const newRoot = document.createElement('div');
        newRoot.id = this.ROOT_ID;
        this.renderNode.parentNode.replaceChild(newRoot, this.renderNode);
        this.renderNode = newRoot;
        return docx.renderAsync(this.source, this.renderNode, null, this.config);
    }

    /**
     * Destructor. Clears the DOM + any other tidy up needed. Handles the docxviewercleanup event.
     *
     * @returns {void} void
     */
    destroy() {
        if (window.parent !== window) {
            delete this.source;
            // eslint-disable-next-line local-rules/open
            document.open();
            document.close();
        }
    }

    resize() {

        document.body.classList.add('scaled');

        const contentWidth = document.getElementById('docx-container').scrollWidth;
        const frameSize = document.documentElement.offsetWidth;

        if (contentWidth > frameSize) {
            document.documentElement.style.transform = `scale(${frameSize / contentWidth})`;
        }
        else {
            document.documentElement.style.transform = '';
            document.body.classList.remove('scaled');
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

var viewer = new DocxViewer();
