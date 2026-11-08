/** @property mega.utils.subtitles */
lazy(mega.utils, 'subtitles', () => {
    'use strict';

    const fileName = (node) => node.name.substring(0, node.name.lastIndexOf('.'));
    const fileExt = (node) => node.name.substring(node.name.lastIndexOf('.'));

    const templates = {
        grid: ['subtitles-dialog-subtitles-grid-table', '.subtitles-grid-table'],
        empty: ['subtitles-dialog-empty-subtitles', '.empty-subtitles']
    };

    /**
     * Clone a dialog template
     * @param {String} name The template key
     * @returns {HTMLElement|false} The cloned node, or false
     */
    const cloneTemplate = (name) => {
        const [id, selector] = templates[name];
        const tpl = document.getElementById(id);
        const node = tpl && tpl.content && tpl.content.querySelector(selector);

        if (!node) {
            console.error(`Subtitles template "${id}" (${selector}) is not around.`);
            return false;
        }

        return node.cloneNode(true);
    };

    class AddSubtitlesDialog {
        constructor(manager, continuePlay) {

            this.continuePlay = continuePlay;
            this.name = 'add-subtitles-dialog';
            this.manager = manager;

            // Use sheet component in MEGA or html-based dialog in transfer.it
            this.useSheet = !!(mega.ui && mega.ui.sheet);

            this.nodes = [];
            this.selectedIndex = -1;

            this.nodeIndex = Object.create(null);

            this.closed = false;

            // Tracking event to send on close, if any. Set by the cancel/close buttons only.
            this.evtName = null;

            this.slideshowToken = null;

            this.domNode = null;
            this.addButton = null;
            this.cancelButton = null;
            this.closeButton = null;
            this.sheetCloseButton = null;
            this.rowsObserver = null;
            this.headerOffset = 0;

            this.slot = document.createElement('div');
            this.slot.className = 'files-grid-view js-subtitles-section';
        }

        setNodes(nodes) {
            this.nodes = nodes || [];
            this.selectedIndex = -1;
            this.nodeIndex = Object.create(null);

            for (let i = 0; i < this.nodes.length; i++) {
                this.nodeIndex[this.nodes[i].h] = i;
            }
        }

        selectByHandle(handle) {
            const i = this.nodeIndex[handle];
            this.selectedIndex = typeof i === 'number' ? i : -1;
        }

        move(delta) {
            if (!this.nodes.length) {
                return null;
            }

            if (this.selectedIndex === -1) {
                this.selectedIndex = 0;
            }
            else {
                this.selectedIndex += delta;

                if (this.selectedIndex < 0) {
                    this.selectedIndex = 0;
                }
                else if (this.selectedIndex >= this.nodes.length) {
                    this.selectedIndex = this.nodes.length - 1;
                }
            }

            return this.getSelectedNode();
        }

        getSelectedNode() {
            return this.nodes[this.selectedIndex] || null;
        }

        show() {
            M.safeShowDialog(this.name, () => {
                this[this.useSheet ? '_initSheetUI' : '_initHtmlUI']();

                // Close along with the media viewer
                this.slideshowToken = mBroadcaster.addListener('slideshow:close', () => {
                    this.slideshowToken = null;
                    this._close();
                });

                this._render();
            });
        }

        _on(el, event, handler) {
            if (el) {
                (el.rebind ? el : $(el)).rebind(event, handler);
            }
        }

        /**
         * Render sheet for MEGA
         * @returns {void}
         */
        _initSheetUI() {
            const sheet = mega.ui.sheet;

            sheet.clear();
            sheet.type = is_mobile ? 'modal' : 'normal';
            sheet.name = this.name;
            sheet.showClose = true;

            sheet.addTitle(l.video_player_add_subtitle_files);
            sheet.addContent(this.slot);

            this.domNode = sheet.domNode;

            const footer = mCreateElement('div', {
                class: 'flex flex-row-reverse'
            }, sheet.footerNode);

            this.addButton = MegaButton.factory({
                parentNode: footer,
                componentClassname: 'add-subtitles slim font-600',
                type: 'normal',
                text: l.album_done,
                disabled: true
            });

            this.cancelButton = MegaButton.factory({
                parentNode: footer,
                componentClassname: 'cancel secondary slim font-600 mx-2',
                type: 'normal',
                text: l[82]
            });

            sheet.addFooter({slot: [footer]});
            sheet.safeShow = true;

            // Drop any onClose left over by a previous consumer of the shared sheet.
            sheet.onClose = null;

            // MegaSheet.hide() is the single exit point of every closing path, whether it is
            // ours or an external one (backdrop, ESC, popstate, closeDialog() elsewhere.)
            sheet.rebind('hide.subtitles', () => this._onClose());

            // Bound before show() so that it runs ahead of the component's own close handler,
            // which hides the sheet right away.
            this.sheetCloseButton = sheet.closeButton;
            this._on(this.sheetCloseButton, 'click.closeSubtitles', () => {
                this.evtName = 'close';
            });

            sheet.show();
        }

        /**
         * Render html dialog for transfer.it (will be used after the viewer UI update)
         * @returns {void}
         */
        _initHtmlUI() {
            this.domNode = document.querySelector(`.${this.name}`);

            if (!this.domNode) {
                return;
            }

            const content = this.domNode.querySelector('.content');
            const footer = this.domNode.querySelector('footer');

            if (content) {
                content.textContent = '';
                content.appendChild(this.slot);
            }

            if (footer) {
                footer.classList.remove('hidden');
            }

            this.addButton = this.domNode.querySelector('.add-subtitles');
            this.cancelButton = this.domNode.querySelector('.cancel');
            this.closeButton = this.domNode.querySelector('.close');
        }

        async _render() {
            if (document.activeElement) {
                document.activeElement.blur();
            }
            window.disableVideoKeyboardHandler = true;

            const nodes = await this.manager.searchSubtitles();

            // The dialog may have been closed while the search was running
            if (this.closed) {
                return;
            }

            this.setNodes(nodes);
            this.slot.textContent = '';

            const container = cloneTemplate(nodes.length ? 'grid' : 'empty');

            if (!container) {
                this._close();
                return;
            }

            this.slot.appendChild(container);

            const rows = nodes.length && container.querySelector('tbody, .megaList-content');

            if (rows) {
                const render = new MegaRender('subtitles');
                render.renderLayout(undefined, nodes);

                // Used by removenode.js to remove nodes from dialog
                $.subtitlesMegaRender = render;

                Ps.initialize(container);

                const thead = container.querySelector('thead');

                this.headerOffset = thead ? thead.offsetHeight : 0;

                this.rowsObserver = new MutationObserver(() => {
                    const selected = rows.querySelector('.ui-selected');

                    if (!selected) {
                        this.selectedIndex = -1;

                        if (this.addButton) {
                            this.addButton.disabled = true;
                        }
                    }
                });

                this.rowsObserver.observe(rows, {childList: true});

                this._bindList(rows, container);
            }
            else {
                // There is nothing to pick, hence nothing to confirm either
                this._clearFooter();
            }

            this._bindUI();
        }

        _clearFooter() {
            this.addButton = null;
            this.cancelButton = null;

            if (this.useSheet) {
                mega.ui.sheet.clearFooter();
            }
            else if (this.domNode) {
                const footer = this.domNode.querySelector('footer');

                if (footer) {
                    footer.classList.add('hidden');
                }
            }
        }

        _bindList(rows, scrollContainer) {
            $(this.slot).rebind('click.subtitle_row', '.file', (ev) => {
                this.selectByHandle(ev.currentTarget.id);
                this._updateSelectionUI(rows, scrollContainer);
            });

            $(document).rebind('keydown.subtitleRowsNav', tryCatch((ev) => {
                // Ignore shortcuts while the dialog is open
                if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey) {
                    return false;
                }

                const isDown = ev.keyCode === 40;
                const isUp = ev.keyCode === 38;

                if (!isDown && !isUp) {
                    return;
                }

                const node = this.move(isDown ? 1 : -1);

                if (!node) {
                    return;
                }

                this._updateSelectionUI(rows, scrollContainer);

                return false;
            }));
        }

        _updateSelectionUI(rows, scrollContainer) {
            const node = this.getSelectedNode();
            const selected = rows.querySelectorAll('.ui-selected');

            for (let i = 0; i < selected.length; i++) {
                selected[i].classList.remove('ui-selected');
            }

            const el = node ? rows.querySelector(`[id="${node.h}"]`) : null;

            if (el) {
                el.classList.add('ui-selected');
                this._ensureVisible(el, scrollContainer);
            }

            if (this.addButton) {
                this.addButton.disabled = !(node && !node.t);
            }
        }

        _ensureVisible(el, container) {
            const rect = el.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();

            const topLimit = cRect.top + this.headerOffset;
            const bottomLimit = cRect.bottom;

            if (rect.top < topLimit) {
                container.scrollTop += rect.top - topLimit;
            }
            else if (rect.bottom > bottomLimit) {
                container.scrollTop += rect.bottom - bottomLimit;
            }
            else {
                return;
            }

            Ps.update(container);
        }

        _bindUI() {
            if (this.addButton) {
                this._on(this.addButton, 'click.addSubtitles', () => {
                    this._onAdd();
                });
            }

            if (this.cancelButton) {
                this._on(this.cancelButton, 'click.cancelSubtitles', () => {
                    this._close('cancel');
                });
            }

            if (this.closeButton) {
                this._on(this.closeButton, 'click.closeSubtitles', () => {
                    this._close('close');
                });
            }

            if (this.domNode) {
                $(this.domNode).rebind('dialog-closed.subtitles', () => {
                    this._onClose();
                });
            }

            $(document).rebind('keydown.subtitleDialogClose', (ev) => {
                if (ev.keyCode === 27) {
                    this._close();
                    return false;
                }
            });
        }

        async _onAdd() {
            const node = this.getSelectedNode();

            if (!node) {
                return;
            }

            mBroadcaster.sendMessage('trk:event', 'media-journey', 'subtitles', 'add', node);

            if (this.addButton) {
                this.addButton.disabled = true;
            }

            await this.manager.addSubtitles(node).catch(dump);
            this._close();
        }

        _close(evtName) {
            if (this.closed) {
                return;
            }

            this.evtName = evtName || this.evtName;

            if (this.useSheet) {
                // Cleanup runs from the sheet's `hide` handler bound in _initSheetUI()
                mega.ui.sheet.hide();
            }
            else {
                // ...and from the `dialog-closed` handler bound in _bindUI()
                closeDialog();
            }

            // Fallback, in case neither of those was reached, i.e. it was hidden already
            this._onClose();
        }

        _onClose() {
            if (this.closed) {
                return;
            }
            this.closed = true;

            if (this.slideshowToken) {
                mBroadcaster.removeListener(this.slideshowToken);
                this.slideshowToken = null;
            }

            if (this.rowsObserver) {
                this.rowsObserver.disconnect();
                this.rowsObserver = null;
            }

            $(this.slot).off('click.subtitle_row');
            $(this.domNode).off('dialog-closed.subtitles');
            $(document).off('keydown.subtitleRowsNav keydown.subtitleDialogClose');

            if (this.useSheet) {
                mega.ui.sheet.off('hide.subtitles');
            }

            if (this.sheetCloseButton) {
                this.sheetCloseButton.off('click.closeSubtitles');
                this.sheetCloseButton = null;
            }

            if (this.continuePlay) {
                $('.media-viewer-container .video-controls .playpause')
                    .trigger('click');
            }

            this.nodes = [];
            this.selectedIndex = -1;
            this.nodeIndex = Object.create(null);
            this.headerOffset = 0;
            this.domNode = null;
            this.addButton = null;
            this.cancelButton = null;
            this.closeButton = null;

            delete window.disableVideoKeyboardHandler;
            delete $.subtitlesMegaRender;

            if (this.evtName) {
                mBroadcaster.sendMessage('trk:event', 'media-journey', 'subtitles', this.evtName);
                this.evtName = null;
            }
        }
    }

    class Subtitles {
        constructor(ext, timeLineRegex) {
            this.ext = ext;
            this._timeLineRegex = timeLineRegex;
        }

        supports(ext) {
            return ext.toLowerCase() === this.ext;
        }

        parse(lines, i = 0) {
            const cues = [];

            while (i < lines.length) {
                const line = lines[i].trim();
                const match = this.matchTimeLine(line);
                if (match) {
                    const start = this.parseTime(match[1]);
                    const end = this.parseTime(match[2]);
                    if (isNaN(start) || isNaN(end)) {
                        continue;
                    }

                    i++;
                    let cue = '';
                    while (i < lines.length && lines[i].trim() !== '') {
                        cue = `${cue}${this.removeTags(lines[i]).trim()}<br>`;
                        i++;
                    }
                    cues.push({ cue, start, end });
                }
                else {
                    i++;
                }
            }
            return cues;
        }

        matchTimeLine(line) {
            return line.match(this._timeLineRegex);
        }

        parseTime(time) {
            const parts = time.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            const milliseconds = parts[3] ? parseInt(parts[3].replace('.','')) : 0;
            return (hours * 60 * 60 + minutes * 60 + seconds) * 1000 + milliseconds;
        }

        removeTags(cue) {
            return escapeHTML(cue)
                .replace(/\[\/?(strong|em|br|[biu])]/gi, (m) => `<${m.slice(1, -1)}>`);
        }
    }

    class SRTSubtitles extends Subtitles {
        constructor() {
            const ext = '.srt';
            const timeRegex = /(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/;
            super(ext, timeRegex);
        }

        parse(raw) {
            return super.parse(raw.split('\n'));
        }
    }

    class VTTSubtitles extends Subtitles {
        constructor() {
            const ext = '.vtt';
            const timeRegex = /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})(\s*.*)/;
            super(ext, timeRegex);
        }

        parse(raw) {
            const lines = raw.split('\n');
            return super.parse(lines, lines[0].trim() === 'WEBVTT' ? 1 : 0);
        }
    }

    class SubtitlesFactory {
        constructor() {
            /** @property SubtitlesFactory._parsers */
            lazy(this, '_parsers', () => {
                return [
                    new SRTSubtitles(),
                    new VTTSubtitles()
                ];
            });
        }

        get extensions() {
            return this._parsers.map((parser) => parser.ext);
        }

        parse(node, raw) {
            const ext = fileExt(node);
            const parser = this._parsers.find((parser) => parser.supports(ext));
            return parser.parse(raw);
        }
    }

    class SubtitlesManager {
        constructor() {
            lazy(this, '_factory', () => new SubtitlesFactory());
            this.init();
        }

        resetIndex() {
            this._index = {
                node: -1,
                cue: -1
            };
            return this;
        }

        init(wrapper) {
            this.wrapper = wrapper;
            this._nodes = [];
            this._cues = [];
            this._subtitles = [];

            return this.resetIndex();
        }

        initSubtitlesMenu() {
            const $subtitlesMenu = $('.context-menu.subtitles .options-wrapper', this.wrapper)[0];
            const subtitlesNodes = this._nodes;

            for (let i = 0; i < subtitlesNodes.length; i++) {
                const button = document.createElement('button');
                button.className = subtitlesNodes[i].h;
                const span = document.createElement('span');
                span.textContent = subtitlesNodes[i].name;
                const icon = document.createElement('i');
                icon.className = 'sprite-fm-mono icon-active icon-check-small-regular-outline hidden';
                button.appendChild(span);
                button.appendChild(icon);
                $subtitlesMenu.appendChild(button);
            }

            Ps.initialize($subtitlesMenu.parentNode);
        }

        async configure(vNode) {
            const vName = fileName(vNode);
            const {extensions} = this._factory;
            const promises = [];

            const nodesIds = Object.keys(M.c[vNode.p] || {});
            const nodes = [];

            for (const id of nodesIds) {
                if (M.d[id]) {
                    nodes.push(M.d[id]);
                }
            }

            for (const ext of extensions) {
                for (const n of nodes) {
                    if (n.name === `${vName}${ext}`) {
                        if (this._nodes.length >= extensions.length) {
                            break;
                        }
                        this._nodes.unshift(n);
                        const promise = this.fetch(0).then((raw) => {
                            const cues = this._factory.parse(n, raw);
                            this._subtitles.unshift(cues);
                        }).catch(() => {
                            this._subtitles.unshift([]);
                        });
                        promises.push(promise);
                    }
                }
            }

            await Promise.all(promises);

            // Init subtitles context menu options
            this.initSubtitlesMenu();
        }

        select(index) {
            if (!this._nodes.length || index === this._index.node || index < 0 || index > this._nodes.length - 1) {
                if (index < 0) {
                    this.resetIndex();
                }
                return;
            }

            this._cues = this._subtitles[index];

            let result;
            if (this._cues.length) {
                this._index.node = index;
                this._index.cue = -1;
                result = true;
                eventlog(99990);
            }
            else {
                $(document).fullScreen(false);

                const content = escapeHTML(l.video_player_display_subtitles_error_msg)
                    .replace('%s', escapeHTML(this._nodes[index].name));

                toaster.main.show({
                    content,
                    icons: ['error sprite-fm-uni icon-error'],
                    classes: ['theme-dark-forced']
                });
                this._cues = this._subtitles[this._index.node];
                result = false;
                eventlog(99991);
            }
            return result;
        }

        cue(time, onSuccess, onError) {
            const index = this._cues.findIndex((cue) => cue.start <= time && cue.end >= time);
            if (index !== this._index.cue) {
                if (index === -1 || !this._cues[index].cue) {
                    if (typeof onError === 'function') {
                        onError();
                    }
                }
                else if (typeof onSuccess === 'function') {
                    onSuccess(this._cues[index].cue);
                }
                this._index.cue = index;
            }
        }

        async fetch(index) {
            const {buffer} = await M.gfsfetch(this._nodes[index].h);

            return new TextDecoder().decode(buffer)
                .replace(/&amp;/gi, '&')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/<(\/?(strong|em|br|[biu]))[^>]*>/gi, '[$1]')
                .replace(/<\/?[a-z][^>]*>/gi, '');
        }

        async searchSubtitles() {
            const nodes = [];
            const {extensions} = this._factory;

            for (const ext of extensions) {
                if (self.folderlink || self.is_transferit) {
                    for (let i = 0; i < M.v.length; i++) {
                        if (M.v[i].name && M.v[i].name.endsWith(ext) && !this._nodes.includes(M.v[i])) {
                            nodes.push(M.v[i]);
                        }
                    }
                }
                else {
                    await M.fmSearchNodes(ext).then(() => {
                        for (const n of Object.keys(M.d)) {
                            if (M.d[n].name
                                && M.d[n].name.endsWith(ext)
                                && !this._nodes.includes(M.d[n])
                                && !M.getTreeHandles(M.RubbishID).includes(M.d[n].p)
                                && !M.getTreeHandles('shares').includes(M.d[n].p)
                                && mega.sensitives.shouldShowNode(M.d[n], !!$.dialog)) {
                                nodes.push(M.d[n]);
                            }
                        }
                    });
                }
            }
            return nodes;
        }

        async addSubtitles(node) {
            this._nodes.unshift(node);
            await this.fetch(0).then((raw) => {
                const cues = this._factory.parse(node, raw);
                this._subtitles.unshift(cues);
                if (this._index.node !== -1) {
                    this._index.node++;
                }

                const button = document.createElement('button');
                button.className = node.h;
                const span = document.createElement('span');
                span.textContent = node.name;
                const icon = document.createElement('i');
                icon.className = 'sprite-fm-mono icon-active icon-check-small-regular-outline hidden';
                button.appendChild(span);
                button.appendChild(icon);
                const $subtitlesMenu = $('.media-viewer-container .context-menu.subtitles .options-wrapper')[0];
                $subtitlesMenu.insertBefore(button, $('.context-menu.subtitles .options button')[1]);

                $(`.media-viewer-container .context-menu.subtitles button.${node.h}`).trigger('click.media-viewer');
            }).catch(() => {
                this._nodes.shift();
                toaster.main.show({
                    icons: ['error sprite-fm-uni icon-error'],
                    content: escapeHTML(l.video_player_add_subtitles_error_msg).replace('%s', escapeHTML(node.name)),
                    classes: ['theme-dark-forced']
                });
                eventlog(99991);
            });
        }

        async addSubtitlesDialog(continuePlay) {
            $(document).fullScreen(false);
            const dialog = new AddSubtitlesDialog(this, continuePlay);
            dialog.show();
        }

        displaySubtitles(streamer, subtitles) {
            this.cue(
                streamer ? streamer.currentTime * 1000 : 0,
                (cue) => subtitles.safeHTML(cue),
                () => subtitles.empty()
            );
        }

        destroySubtitlesMenu() {
            $('.context-menu.subtitles .options-wrapper button:gt(0)', this.wrapper).remove();
        }
    }

    return new SubtitlesManager();
});
