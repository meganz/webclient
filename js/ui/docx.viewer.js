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

        const loadedEv = new Event('docxviewerready');
        document.dispatchEvent(loadedEv);
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

var viewer = new DocxViewer();
