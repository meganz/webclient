lazy(mega.utils, 'subtitles', () => {
    'use strict';

    /**
     * @type {MutationObserver?}
     */
    let rowsObserver = null;

    /**
     * @type {String}
     */
    let selectedHandle = '';

    /**
     * @param {AddSubtitlesDialog} dialog
     * @param {jQuery.Event} evt
     */
    const selectTableRow = (dialog, { currentTarget }) => {
        const currentlySelected = currentTarget.parentNode.querySelector('tr.ui-selected');
        selectedHandle = currentTarget.id;

        currentTarget.classList.toggle(
            'ui-selected',
            !currentlySelected
                || currentlySelected.id === selectedHandle
                || !currentlySelected.classList.remove('ui-selected') // If landed here, it's always true
        );

        dialog.enable();
    };

    const fileName = (node) => {
        return node.name.substring(0, node.name.lastIndexOf('.'));
    };

    const fileExt = (node) => {
        return node.name.substring(node.name.lastIndexOf('.'));
    };

    const subtitlesGridTable = document.getElementById('subtitles-dialog-subtitles-grid-table')
        .content.querySelector("div");
    const emptySubtitles = document.getElementById('subtitles-dialog-empty-subtitles').content.querySelector("div");

    class AddSubtitlesDialog extends MDialog {
        constructor(subtitlesManager, continuePlay) {
            super({
                ok: {
                    label: l.album_done,
                    callback: async() => {
                        const node = selectedHandle && M.d[selectedHandle];

                        if (!node) {
                            return false;
                        }

                        eventlog(99989, true);
                        this.disable();
                        await this.subtitlesManager.addSubtitles(node);
                    }
                },
                cancel: true,
                dialogClasses: 'add-subtitles-dialog theme-dark-forced',
                contentClasses: 'px-2 border-top border-bottom',
                onclose: () => {
                    if (this.continuePlay) {
                        $('.media-viewer-container .video-controls .playpause').trigger('click');
                    }

                    if (rowsObserver) {
                        rowsObserver.disconnect();
                        rowsObserver = null;
                    }

                    $(this.el).off('click.subtitle_row');
                    $(document).off('keydown.subtitle_row');
                    delete window.disableVideoKeyboardHandler;
                },
                dialogName: 'subtitles-dialog'
            });

            this.subtitlesManager = subtitlesManager;
            this.continuePlay = continuePlay;
            this.setContent();
            this._title.classList.add('text-center');
        }

        setContent() {
            this.slot = document.createElement('div');
            this.slot.className = 'files-grid-view';
            this.title = l.video_player_add_subtitle_files;
        }

        async onMDialogShown() {
            document.activeElement.blur();
            window.disableVideoKeyboardHandler = true;

            this.disable();

            const nodes = await this.subtitlesManager.searchSubtitles();
            this.nodes = nodes;

            if (this.nodes.length) {
                const container = subtitlesGridTable.cloneNode(true);
                this.slot.appendChild(container);

                const megaRender = new MegaRender('subtitles');
                megaRender.renderLayout(undefined, this.nodes);
                Ps.initialize(container);
                const table = this.el.querySelector('.subtitles-grid-table');
                const rows = table.querySelector('tbody');

                rowsObserver = new MutationObserver(() => {
                    const el = rows.querySelector('tr.ui-selected');

                    if (!el) {
                        selectedHandle = '';
                        this.disable();
                    }
                });

                rowsObserver.observe(rows, { childList: true });

                $(this.el).rebind('click.subtitle_row', '.file', (e) => selectTableRow(this, e));

                $(document).rebind('keydown.subtitle_row', (e) => {
                    const isDown = e.keyCode === 40;
                    const isUp = !isDown && e.keyCode === 38;

                    const specialKeysOn = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;

                    if (specialKeysOn) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    if (!isDown && !isUp) {
                        return;
                    }

                    const currentTarget = (selectedHandle)
                        ? rows.querySelector(`tr.ui-selected`)[e.keyCode === 38
                            ? 'previousElementSibling'
                            : 'nextElementSibling'
                        ]
                        : rows.querySelector('tr:first-child');

                    if (!currentTarget) {
                        return;
                    }

                    selectTableRow(this, { currentTarget });

                    const loc = (currentTarget.rowIndex - 1) * currentTarget.offsetHeight;

                    if (loc < table.scrollTop) {
                        table.scrollTop = loc;
                    }
                    else if (loc >= table.scrollTop + table.offsetHeight - 50) {
                        table.scrollTop += currentTarget.offsetHeight;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                });
            }
            else {
                const container = emptySubtitles.cloneNode(true);
                this.slot.appendChild(container);

                $('.add-subtitles-dialog .border-top.border-bottom').removeClass('border-bottom');
                $('.add-subtitles-dialog footer').addClass('height-84');
                $('.add-subtitles-dialog footer div').addClass('hidden');
            }

            mBroadcaster.once('slideshow:close', () => {
                this.hide();
            });
        }

        hide() {
            super.hide();
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
            const parser = new DOMParser();
            const doc = parser.parseFromString(cue, 'text/html');
            return doc.body.textContent
                .replace(/<(?!\/?([biu]|br))[^>]*>/gi, '')
                .replace(/(\[|{)(\/?)([biu]|br)(]|})/gi, '<$2$3>');
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
            this.initParsers();
        }

        initParsers() {
            this._parsers = [
                new SRTSubtitles(),
                new VTTSubtitles()
            ];
        }

        extensions() {
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
            this._factory = new SubtitlesFactory();
            this.init();
        }

        resetIndex() {
            this._index = {
                node: -1,
                cue: -1
            };
        }

        init(wrapper) {
            this.wrapper = wrapper;
            this._nodes = [];
            this._cues = [];
            this._subtitles = [];
            this.resetIndex();
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
            const extensions = this._factory.extensions();
            const promises = [];

            const nodesIds = (vNode.p) ? Object.keys(M.c[vNode.p]) : [];
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
                toaster.main.show({
                    icons: ['error sprite-fm-uni icon-error'],
                    content: l.video_player_display_subtitles_error_msg.replace('%s', this._nodes[index].name),
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
            return new Promise((resolve, reject) => {
                M.gfsfetch(this._nodes[index].h, 0, -1).then((data) => {
                    if (data.buffer === null) {
                        return reject();
                    }

                    const reader = new FileReader();
                    reader.addEventListener('loadend', () => resolve(reader.result));
                    reader.readAsText(new Blob([data.buffer], { type: "text/plain" }));
                }).catch(() => {
                    return reject();
                });
            });
        }

        async searchSubtitles() {
            const extensions = this._factory.extensions();
            const nodes = [];
            for (const ext of extensions) {
                if (folderlink) {
                    for (let i = 0; i < M.v.length; i++) {
                        if (M.v[i].name && M.v[i].name.endsWith(ext) && !this._nodes.includes(M.v[i])) {
                            nodes.push(M.v[i]);
                        }
                    }
                }
                else {
                    await M.fmSearchNodes(ext).then(() => {
                        for (const n of Object.keys(M.d)) {
                            if (M.d[n].name && M.d[n].name.endsWith(ext) && !this._nodes.includes(M.d[n]) &&
                                !M.getTreeHandles(M.RubbishID).includes(M.d[n].p) &&
                                !M.getTreeHandles('shares').includes(M.d[n].p)) {
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
                    content: l.video_player_add_subtitles_error_msg.replace('%s', node.name),
                    classes: ['theme-dark-forced']
                });
                eventlog(99991);
            });
        }

        addSubtitlesDialog(continuePlay) {
            $(document).fullScreen(false);
            const dialog = new AddSubtitlesDialog(this, continuePlay);
            dialog.show();
        }

        displaySubtitles(streamer, subtitles) {
            this.cue(
                streamer.currentTime * 1000,
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
