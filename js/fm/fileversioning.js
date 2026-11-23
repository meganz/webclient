(function _fileversioning(global) {
    'use strict';

    const selections = Object.create(null);
    function clearSelections() {
        selections.handles = [];
        // What the panel was opened on, before a folder is swapped for its files.
        selections.requested = [];
        selections.vtree = Object.create(null);
        // The outgoing share whose overview is rendered, and the one a file's history was opened from.
        selections.overview = '';
        selections.folder = '';
    }
    clearSelections();

    // Numbers each getBlocks() call, so one still loading when the panel is reopened is dropped.
    let blocksRequest = 0;

    // Rows built since the last render that wait for their thumbnail, by node handle.
    let thumbRows = new Map();

    // Where a share's overview was scrolled when a file was opened from it, for the back arrow to return to.
    let overviewScroll = null;

    // The selection the panel last opened on or followed, so a re-render or a new version is not a new pick.
    let followed = [];

    // The folder open in the file list then, so opening another with nothing selected is followed.
    let followedDir = '';


    class MegaVersionItem extends MegaNodeComponent {
        constructor(options) {
            // the grid's details line changes with the view, e.g. out-shares has no size line.
            options.noDetails = true;
            super(options);
            // deleted after the rows were listed, and scrolled into view before the redraw that drops it.
            if (!this.node) {
                return;
            }
            // the grid finds its rows by node handle, e.g. removeUInode(), and would take these out of the list.
            this.domNode.removeAttribute('id');
            this.iconNode.className = `item-type-icon icon-${fileIcon(this.node)}-24`;
            this.addClass('version-item');
            if (options.mainFile) {
                this.addClass('version-summary');
            }
            this.infoNode = mCreateElement('span', {class: 'version-info'});
            this.domNode.querySelector('.props').prepend(this.infoNode);
            this.domNode.querySelector('.icon-version').classList.add('hidden');

            // the badge below marks the linked version instead; this icon's click would reselect the grid.
            this.domNode.querySelector('.icon-link').classList.add('hidden');

            // focus keeps the menu button shown, so only the keyboard may give it focus, not a click.
            this.domNode.addEventListener('mousedown', (ev) => {
                if (ev.target.closest('.context-btn')) {
                    ev.preventDefault();
                }
            });

            // the name gets its own tooltip below, only when it is cut off.
            this.domNode.removeAttribute('title');

            const nameNode = this.domNode.querySelector('.fm-item-name');
            // a dot in a folder's name, e.g. "Release 1.36", is not an extension to keep in view.
            const [start, ext] = this.node.t ? [this.name, ''] : getNameParts(this.name);
            const startNode = mCreateElement('span', {class: 'name-start'});
            const extNode = mCreateElement('span', {class: 'name-ext'});
            startNode.textContent = start;
            extNode.textContent = ext;
            nameNode.textContent = '';
            nameNode.append(startNode, extNode);
            nameNode.dataset.simpletip = this.name;
            nameNode.dataset.simpletipClass = 'version-tip';

            if (!options.mainFile && !options.versionFile && this.linked && !this.linked.down) {
                const badge = mCreateElement('span', {class: 'version-link-badge'}, nameNode);
                mCreateElement('i', {class: 'sprite-fm-mono icon-link-thin-outline'}, badge);
                badge.append(l.versions_shared_link_badge);
            }

            // checked on hover rather than once, as the room for the name follows the panel width.
            nameNode.addEventListener('mouseover', () => {
                nameNode.classList.toggle('simpletip', startNode.scrollHeight > startNode.clientHeight);
            });

            if (this.thumbNode && !this.undecryptable) {
                const uri = thumbnails.get(this.node.fa);

                if (uri) {
                    this.setThumb(uri);
                }
                else {
                    thumbRows.set(this.handle, [...thumbRows.get(this.handle) || [], this]);
                }
            }

            const joiner = ' \u00b7 ';

            if (options.infoText) {
                this.infoNode.textContent = options.infoText;
            }
            else if (options.mainFile) {
                // while loading, the count may be all there is.
                const infoString = [
                    options.versionCount && mega.icu.format(l.version_count, options.versionCount),
                    options.versionInfo.size && l.versions_size_total.replace('%1', options.versionInfo.size)
                ].filter(Boolean).join(joiner);
                this.infoNode.textContent = infoString;
            }
            else {
                // one <bdi> per part, so an RTL page keeps them whole and in order.
                const createPart = (cls, text) => {
                    const node = mCreateElement('bdi', {class: cls});
                    node.textContent = text;
                    return node;
                };
                const action = createPart('version-action', options.versionAction);

                action.dataset.simpletip = options.versionActionTip || options.versionAction;
                action.dataset.simpletipClass = 'version-tip';

                // "Renamed" says nothing more in a tooltip, so it gets one only when the line cuts it off.
                action.addEventListener('mouseover', () => {
                    const cut = this.infoNode.scrollHeight > this.infoNode.clientHeight;
                    action.classList.toggle('simpletip', !!options.versionActionTip || cut);
                });
                this.infoNode.append(
                    createPart('version-time', options.versionTime), joiner,
                    createPart('version-size', options.versionInfo.size), joiner,
                    action
                );
            }

            if (options.detailText) {
                this.addClass('with-detail');
                const detailNode = mCreateElement('span', {class: 'version-detail'}, this.domNode);
                detailNode.textContent = options.detailText;
                detailNode.dataset.simpletip = options.detailText;
                detailNode.dataset.simpletipClass = 'version-tip';

                // as for the name, a tooltip only when the line is cut off.
                detailNode.addEventListener('mouseover', () => {
                    detailNode.classList.toggle('simpletip', detailNode.scrollHeight > detailNode.clientHeight);
                });
            }
        }

        /**
         * Show the node's thumbnail in place of its file-type icon.
         * @param {String} uri thumbnail blob URI.
         * @returns {void}
         */
        setThumb(uri) {
            this.thumbNode.src = uri;
            this.addClass('thumb');
        }
    }


    /**
     * Resolve the download items the same way {@link MegaData.menuItems} does for the file grid.
     * @returns {Array} list of context menu item selectors.
     */
    function getDownloadMenuItems() {
        const {useMegaSync} = window;

        if (useMegaSync === 2 || useMegaSync === 3) {
            return ['.download-item'];
        }
        const items = ['.download-standart-item', '.zipdownload-item'];

        if (fmconfig.dlThroughMEGAsync) {
            items.push('.megasyncdownload-item');

            if (!useMegaSync) {
                // the user saw a download option, check for megasync for later actions.
                megasync.preCheck().catch(nop);
            }
        }

        return items;
    }

    /**
     * Whether a version opens in the viewer or the text editor, for both the row click and the menu.
     * @param {MegaNode} n ufs-node of the version.
     * @returns {Boolean} whether it can be previewed.
     */
    function canPreview(n) {
        return !!(n && !missingkeys[n.h] && (is_video(n) || is_image2(n) || is_text(n)));
    }

    /**
     * Find which file in the panel a node change belongs to.
     * @param {Object} vtree rendered file handle -> handles of the versions it was rendered with.
     * @param {Array} chain handles of the changed node's version chain as it is now, newest first.
     * @param {String} changed handle of the node that changed.
     * @returns {String|Boolean} the rendered file handle, or false if the change is not in the panel.
     */
    function shownFileFor(vtree, chain, changed) {
        for (const [h, versions] of Object.entries(vtree)) {
            // a revert or an upload puts a new node on top, so the rendered file is now lower in the chain.
            if (chain.includes(h) || versions.includes(changed)) {
                return h;
            }
        }
        return false;
    }

    /**
     * What each version in a file's chain did, worked out against the next older version.
     * @param {Array} chain ufs-nodes of the versions, newest first, current included.
     * @returns {Array} 'renamed' or 'edited' per version, in chain order.
     */
    function versionActions(chain) {
        // the oldest version has nothing older to have been renamed from.
        return chain.map((n, i) => i < chain.length - 1 && n.name !== chain[i + 1].name ? 'renamed' : 'edited');
    }

    /**
     * Whole calendar days from a date to today: 0 for today, 1 for yesterday.
     * @param {Date} date when the version was stored.
     * @returns {Number} the days.
     */
    function daysAgo(date) {
        // Date.UTC, as a DST change can skip local midnight.
        const day = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5;
        return day(new Date()) - day(date);
    }

    /**
     * The time on a version row, in the user's time format: alone under its date header, or with the day
     * for the current version, which is listed under "Current version" instead.
     * @param {Number} ts version timestamp, in seconds.
     * @param {Boolean} isCurrent whether it is the file's current version.
     * @returns {String} the time as the row shows it.
     */
    function versionTimeText(ts, isCurrent) {
        const time = toLocaleTime(ts);

        if (!isCurrent) {
            return time;
        }
        const date = new Date(ts * 1000);
        const days = daysAgo(date);

        if (days === 0 || days === 1) {
            return mega.icu.format(days ? l.notif_date_yesterday : l.notif_date_today, date.getHours())
                .replace('%1', time);
        }
        // the day as the date headers and the revert toast write it.
        return l.version_date_at_time.replace('%1', acc_time2date(ts)).replace('%2', time);
    }

    /**
     * The toast after a revert, e.g. 'Reverted "All-hands.pptx" to the version from today at 07:57'.
     * @param {String} name the name of the version reverted to, which the new current version takes.
     * @param {Number} ts that version's timestamp, in seconds.
     * @returns {String} plain text, as the toast appends it as a text node.
     */
    function revertedText(name, ts) {
        const days = daysAgo(new Date(ts * 1000));
        const time = toLocaleTime(ts);

        if (days === 0 || days === 1) {
            return (days ? l.version_reverted_yesterday : l.version_reverted_today)
                .replace('%1', () => name)
                .replace('%2', time);
        }
        return l.version_reverted_date.replace('%1', () => name).replace('%2', acc_time2date(ts)).replace('%3', time);
    }

    /**
     * The summary's version count before the versions are loaded, from the tree's counts.
     * @param {Array} nodes ufs-nodes the panel is opened on.
     * @returns {Number} the count, current versions included, or 0 when it cannot be told yet.
     */
    function versionCountOf(nodes) {
        // a folder's tvf counts the versions inside, but not how many files hold them.
        if (nodes.some(n => !n || n.t)) {
            return 0;
        }
        return nodes.reduce((sum, n) => sum + (n.tvf | 0) + 1, 0);
    }

    /**
     * Whether the panel offers "Delete previous versions", as the grid offers .clearprevious-versions:
     * one file, with previous versions, and full access.
     * @param {Array} requested handles the panel is opened on.
     * @param {Object} vtree rendered file handle -> handles of its versions, newest first.
     * @param {Number} rights the user's rights on the file, see M.getNodeRights().
     * @param {Boolean} inFolderLink whether this is a folder link, where the grid offers no versions.
     * @returns {Boolean} whether to show the footer.
     */
    function offersClearPrevious(requested, vtree, rights, inFolderLink) {
        const chain = requested.length === 1 && vtree[requested[0]];
        return !!chain && chain.length > 1 && rights > 1 && !inFolderLink;
    }

    /**
     * Whether the file list's selection is another item than the panel follows; nothing selected keeps it.
     * @param {Array} selected handles selected now.
     * @param {Array} last the selection the panel last opened on or followed.
     * @param {Function} topOf handle -> its file's current version, so a new version of a file is still that file.
     * @returns {Boolean} whether to follow.
     */
    function isNewSelection(selected, last, topOf) {
        const key = (handles) => [...new Set(handles.map(topOf))].sort().join();
        return selected.length > 0 && key(selected) !== key(last);
    }

    /**
     * What the panel shows for a selection it follows, as Manage versions shows it: every selected file once one
     * of them has previous versions, else the one folder with previous versions among them; never the Rubbish bin.
     * @param {Array} nodes ufs-nodes of the selected items.
     * @param {Function} inBin handle -> whether it is in the Rubbish bin.
     * @returns {Array} handles to show, or [] for "No versions found".
     */
    function followTarget(nodes, inBin) {
        const versioned = nodes.filter(n => n && n.tvf && !inBin(n.h));

        if (versioned.some(n => !n.t)) {
            return nodes.filter(n => n && !n.t && !inBin(n.h)).map(n => n.h);
        }
        // the multi-file panel lists files, not several folders.
        return versioned.length === 1 ? [versioned[0].h] : [];
    }

    /**
     * Whether the file list opened another folder with nothing selected, which the Info panel then shows.
     * @param {Array} selected handles selected now.
     * @param {String} dir handle of the folder open now.
     * @param {String} last the folder open when the panel last opened or followed.
     * @returns {Boolean} whether to follow the open folder.
     */
    function isNewFolder(selected, dir, last) {
        return !selected.length && dir !== last;
    }

    /**
     * What the panel shows for a folder opened in the file list: as for that folder selected, but "No versions
     * found" for Cloud drive itself, the Vault and the Rubbish bin, whose menus never offer Manage versions.
     * @param {Object} [n] ufs-node of the open folder, none for a page such as Recents or search.
     * @param {Function} inBin handle -> whether it is in the Rubbish bin.
     * @returns {Array} handles to show, or [] for "No versions found".
     */
    function folderTarget(n, inBin) {
        return n && n.t === 1 ? followTarget([n], inBin) : [];
    }

    /**
     * Where a redraw takes the panel once all it shows is in the Rubbish bin, whose versions are not listed: the
     * outgoing share it was opened from, else the folder in view, as the Info panel falls back to it.
     * @param {Array} requested handles the panel is opened on.
     * @param {Object} [folder] ufs-node of that share or folder.
     * @param {Function} inBin handle -> whether it is in the Rubbish bin.
     * @returns {Array|null} handles to show, [] for "No versions found", or null to redraw what it shows.
     */
    function binFallback(requested, folder, inBin) {
        return requested.every(inBin) ? folderTarget(folder, inBin) : null;
    }

    /**
     * The previous versions in a chain, which "Delete previous versions" removes.
     * @param {Array} chain ufs-nodes of the versions, newest first, current included.
     * @returns {Object} {count, bytes} of the versions below the current one.
     */
    function previousOf(chain) {
        const older = chain.slice(1);
        return {count: older.length, bytes: older.reduce((sum, n) => sum + n.s, 0)};
    }

    /**
     * The text of the confirmation before deleting a file's previous versions.
     * @param {Number} count its previous versions.
     * @param {String} name the file name.
     * @param {String} size their total size, formatted.
     * @returns {String} HTML, with the name escaped.
     */
    function getClearPreviousText(count, name, size) {
        return mega.icu.format(l.delete_previous_versions_confirm, count)
            .replace('%1', () => escapeHTML(name))
            .replace('%2', () => size);
    }

    /**
     * The previous versions held under some roots, from the account's storage stats.
     * @param {Object} stats M.account.stats, keyed by root handle.
     * @param {Array} roots root handles.
     * @returns {Object} {count, size}.
     */
    function countVersions(stats, roots) {
        return roots.reduce((sum, h) => ({count: sum.count + stats[h].vfiles, size: sum.size + stats[h].vbytes}),
                            {count: 0, size: 0});
    }

    // Running totals of the "Delete older versions" dialog, before any file is counted in.
    const noTotals = Object.freeze({files: 0, versions: 0, bytes: 0});

    /**
     * Move a running total of files by one file, as it is ticked or unticked.
     * @param {Object} totals {files, versions, bytes} so far.
     * @param {Object} file {count, size}: the file's previous versions and their total bytes.
     * @param {Number} sign 1 to count the file in, -1 to take it out.
     * @returns {Object} the new {files, versions, bytes}.
     */
    function shiftTotals(totals, file, sign) {
        return {
            files: totals.files + sign,
            versions: totals.versions + sign * file.count,
            bytes: totals.bytes + sign * file.size,
        };
    }

    /**
     * The API requests that delete the ticked files' older versions.
     * @param {Boolean} allSelected whether every listed file is ticked.
     * @param {Array} heads handles of each ticked file's newest previous version.
     * @returns {Object|Array} one dv for everything, else one d per file; without v, a d takes the older ones too.
     */
    function getDeleteVersionsRequests(allSelected, heads) {
        return allSelected ? {a: 'dv'} : heads.map(n => ({a: 'd', n}));
    }

    /**
     * The count beside "All files", e.g. "8 of 12 files".
     * @param {Number} files how many are ticked.
     * @param {Number} total how many are listed.
     * @returns {String} the text.
     */
    function selectedFilesText(files, total) {
        return mega.icu.format(l.selected_files_count, total)
            .replace('%1', files);
    }

    /**
     * The delete button's label: what it would delete, or a plain label while nothing is ticked.
     * @param {Number} versions previous versions of the ticked files.
     * @param {Number} bytes their total size.
     * @returns {String} the label.
     */
    function getDeleteVersionsLabel(versions, bytes) {
        if (!versions) {
            return l.delete_versions_btn;
        }
        const label = mega.icu.format(l.delete_n_versions_btn, versions);
        return `${label} \u00b7 ${bytesToSize(bytes)}`;
    }

    /**
     * The block for the summary row at the top of the panel.
     * @param {String} h handle of the file or folder the panel is on.
     * @param {Number} count versions in total, current ones included, or 0 when not known yet.
     * @param {String} size their total size, or '' when not known yet.
     * @param {Boolean} isFolder whether h is a folder, whose menu would download or unlink all of it.
     * @returns {Object} the block.
     */
    function summaryBlock(h, count, size, isFolder) {
        return {
            nodeHandle: h,
            id: `${h}_summary`,
            itemComp: 'versions',
            mainFile: true,
            listSection: {idx: `${h}_summary`},
            versionInfo: {size},
            versionCount: count,
            noContextBtn: isFolder,
            contextBtnLevel: 11,
        };
    }

    /**
     * Split a filename so that a name cut off in the panel keeps its extension, e.g. "All-hands-v22...pptx".
     * @param {String} name the filename.
     * @returns {Array} the part that may be cut, ending in the dot, and the extension or ''.
     */
    function getNameParts(name) {
        const dot = name.lastIndexOf('.');
        const ext = name.slice(dot + 1);

        // what fileext() reads as an extension: not a dotfile, and at most 10 word characters.
        if (dot < 1 || !/^[\w+]{1,10}$/.test(ext)) {
            return [name, ''];
        }
        return [name.slice(0, dot + 1), ext];
    }

    /**
     * "Edited by" for a version, with the editor's email when given, as its tooltip shows it.
     * @param {Boolean} isMe whether the current user stored the version.
     * @param {String} name the editor's name.
     * @param {String} [email] the editor's email.
     * @returns {String} the text.
     */
    function editedBy(isMe, name, email) {
        if (isMe) {
            return l[16480];
        }
        return l[16476].replace('%1', email ? `${name} (${email})` : name);
    }

    /**
     * The folders from an outgoing share down to a file inside it, e.g. for "Overflow > Exports".
     * @param {Array} path handles from the file up to its root, as M.getPath() gives them.
     * @param {String} folder handle of the shared folder.
     * @returns {Array} handles from the shared folder down to the file's parent, or [] if it is not inside.
     */
    function folderPath(path, folder) {
        return path.slice(1, path.indexOf(folder) + 1).reverse();
    }

    /**
     * Order of the files on an outgoing share's overview: by folder path, a folder's own files before
     * its subfolders' ones, then by name.
     * @param {Object} a {name, path}: the file's name and the folder names from the share down.
     * @param {Object} b the same for the other file.
     * @param {Function} compare string comparator, as M.compareStrings().
     * @returns {Number} negative when a comes first.
     */
    function byPathThenName(a, b, compare) {
        const n = Math.min(a.path.length, b.path.length);

        for (let i = 0; i < n; i++) {
            const res = compare(a.path[i], b.path[i]);

            if (res) {
                return res;
            }
        }
        return a.path.length - b.path.length || compare(a.name, b.name);
    }

    /**
     * A file's line on the overview, e.g. "8 previous versions \u00b7 10.8 MB".
     * @param {Number} count its previous versions.
     * @param {String} size their total size, formatted.
     * @returns {String} the text.
     */
    function previousVersionsText(count, size) {
        const text = mega.icu.format(l.previous_versions_count, count);
        return `${text} \u00b7 ${size}`;
    }

    /**
     * The overview summary's two lines, e.g. "6 files with previous versions" and "91 MB total".
     * @param {Number} files files listed.
     * @param {String} size their previous versions' total size, formatted.
     * @returns {Array} the two lines.
     */
    function folderSummaryText(files, size) {
        return [
            mega.icu.format(l.files_with_previous_versions, files),
            l.versions_size_total.replace('%1', size),
        ];
    }

    /**
     * The rows of an outgoing share's overview: its summary, then one row per file with previous versions,
     * which opens that file's history.
     * @param {String} folder handle of the shared folder.
     * @param {Array} files {h, name, count, bytes, path}: previous versions, their bytes, folder names down.
     * @param {Function} compare string comparator, as M.compareStrings().
     * @returns {Array} the blocks, or [] when no file has previous versions.
     */
    function overviewBlocks(folder, files, compare) {
        if (!files.length) {
            return [];
        }
        const totals = files.reduce((sum, f) => shiftTotals(sum, {count: f.count, size: f.bytes}, 1), noTotals);
        const summary = summaryBlock(folder, 0, '', true);
        const listSection = {idx: `${folder}_files`, value: l.files_with_previous_versions_h};

        [summary.infoText, summary.detailText] =
            folderSummaryText(totals.files, bytesToSize(totals.bytes));

        return [summary, ...[...files].sort((a, b) => byPathThenName(a, b, compare)).map(f => ({
            nodeHandle: f.h,
            itemComp: 'versions',
            versionFile: true,
            listSection,
            infoText: previousVersionsText(f.count, bytesToSize(f.bytes)),
            detailText: f.path.join(' \u203a '),
            onClick: () => fileversioning.show([f.h], folder),
            noContextBtn: true,
        }))];
    }

    /**
     * A file's folder path from an outgoing share, as the rows show it.
     * @param {String} h handle of the file.
     * @param {String} folder handle of the shared folder.
     * @returns {Array} the folder names, from the share down to the file's parent.
     */
    function pathNamesOf(h, folder) {
        return folderPath(M.getPath(h), folder).map(p => M.getNameByHandle(p));
    }

    /**
     * Word the summary of a file picked from an outgoing share's overview as its row there reads, with its path.
     * Once its previous versions are deleted, the plain "1 version" stays, as "0 previous versions" reads oddly.
     * @param {Object} block the summary block.
     * @param {String} folder handle of the shared folder.
     * @param {Number} count the file's previous versions.
     * @param {Number} bytes their total size.
     * @returns {Object} the block.
     */
    function asOverviewRow(block, folder, count, bytes) {
        if (count) {
            block.infoText = previousVersionsText(count, bytesToSize(bytes));
        }
        block.detailText = pathNamesOf(block.nodeHandle, folder).join(' \u203a ');
        return block;
    }

    /**
     * Word a folder's summary as the Info panel and Settings count: its previous versions, current ones left out.
     * @param {Object} block the summary block.
     * @param {Object} n the folder's ufs-node, with the tree's tvf and tvb.
     * @returns {Object} the block.
     */
    function asFolderSummary(block, n) {
        if (n.tvf) {
            block.infoText = previousVersionsText(n.tvf, bytesToSize(n.tvb || 0));
        }
        return block;
    }

    /**
     * Redraw the versions panel on what it was opened on, if it is still showing.
     * @returns {void}
     */
    function redrawPanel() {
        const handles = [...selections.requested];

        if (handles.length && fileversioning.isOpen()) {
            const folder = M.d[selections.folder || String(M.currentdirid || '').split('/').pop()];
            const target = binFallback(handles, folder, (h) => M.getNodeRoot(h) === M.RubbishID);

            if (target) {
                fileversioning.show(target);
            }
            else {
                mega.ui.flyout.showVersions(handles);
            }
        }
    }

    var ns = {

        flyoutName: 'versions',

        /**
         * For the rows just drawn: load the thumbnails they wait for, in one request, and keep the scrollbar on
         * the list's scroll position.
         * @returns {void}
         */
        renderCb() {
            const {body} = mega.ui.flyout.flyoutMenu;

            if (overviewScroll && overviewScroll.folder === selections.overview) {
                body.scrollTop = overviewScroll.top;
                overviewScroll = null;
            }
            // a refresh restores the scroll in the frame the old list was cleared in, so no scroll event tells the
            // scrollbar, and a jump back to the top would go unseen; on later batches this changes nothing.
            body.dispatchEvent(new Event('scroll'));

            const rows = thumbRows;
            thumbRows = new Map();

            if (rows.size) {
                fm_thumbnails('standalone', [...rows.values()].map(([row]) => row.node), (n) => {
                    const uri = thumbnails.get(n.fa);

                    if (uri) {
                        for (const row of rows.get(n.h)) {
                            row.setThumb(uri);
                        }
                    }
                });
            }
        },

        /**
         * Open the panel on files or a folder.
         * @param {Array} handles ufs-node handles to show the versions of.
         * @param {String} [folder] the outgoing share whose overview the file was picked from, to go back to.
         * @returns {void}
         */
        show(handles, folder) {
            handles = handles || [];
            const open = fileversioning.isOpen();

            if (open && folder && folder === selections.overview) {
                overviewScroll = {folder, top: mega.ui.flyout.flyoutMenu.body.scrollTop};
            }
            else if (!open || selections.folder !== handles[0]) {
                // only the way back to the share a file was opened from returns to its scroll position.
                overviewScroll = null;
            }
            if (!handles.length) {
                // so neither a load still running nor a refresh draws the previous item over "No versions found".
                blocksRequest++;
                clearSelections();
            }
            followed = [...$.selected || []];
            followedDir = String(M.currentdirid || '').split('/').pop();
            selections.folder = folder || '';
            // no room beside Rewind's sidebar, as for the Info panel.
            if (mega.rewindUi && mega.rewindUi.sidebar.active) {
                mega.rewindUi.sidebar.forceClose();
            }
            const toResize = !mega.ui.flyout.name;
            mega.ui.flyout.showVersionFlyout(handles, selections.folder);
            if (toResize) {
                $.tresizer();
            }
        },

        /**
         * Whether the panel is the flyout showing; never creates the flyout to find out.
         * @returns {Boolean} true when open.
         */
        isOpen() {
            return mega.ui.flyoutInit && mega.ui.flyout.name === fileversioning.flyoutName;
        },

        /**
         * Close the panel, if it is the one open.
         * @returns {void}
         */
        hide() {
            if (fileversioning.isOpen()) {
                mega.ui.flyout.hide();
            }
        },

        /**
         * The panel footer for what is rendered, or null when "Delete previous versions" does not apply.
         * @returns {Object|null} options for MegaFlyoutMenu.updateFooter().
         */
        getFooter() {
            const [h] = selections.requested;

            if (selections.overview) {
                return selections.handles.length ? {
                    label: l.delete_previous_versions,
                    className: 'text-link',
                    // false takes out the icon slot, which would push the centred link off centre.
                    icon: false,
                    onClick: () => fileversioning.confirmClearFolder(),
                } : null;
            }
            if (!offersClearPrevious(selections.requested, selections.vtree, h ? M.getNodeRights(h) : 0, folderlink)) {
                return null;
            }
            return {
                label: l.delete_previous_versions,
                className: 'text-link',
                icon: false,
                onClick: () => fileversioning.confirmClearPrevious(h),
            };
        },

        /**
         * Ask, then delete every version of a file but its current one. The panel then redraws itself
         * through updateFileVersioningDialog(), without the older versions and the footer.
         * @param {String} h ufs-node handle of the file, as rendered.
         * @returns {void}
         */
        confirmClearPrevious(h) {
            if (M.isInvalidUserStatus() || !selections.vtree[h]) {
                return;
            }
            const {count, bytes} = previousOf(selections.vtree[h].map(v => M.d[v]).filter(Boolean));
            const text = getClearPreviousText(count, M.d[h].name, bytesToSize(bytes));
            const type = `*-confirmation:!^${l[1730]}!${l[82]}`;

            msgDialog(type, l[1003], l.delete_previous_versions_h, text, (yes) => {
                if (yes) {
                    fileversioning.clearPreviousVersions(h)
                        .then(() => mega.ui.toast.show(l.previous_versions_deleted_toast))
                        .catch(tell);
                }
            });
        },

        /**
         * Ask, then delete the previous versions of every file on an outgoing share's overview.
         * @returns {void}
         */
        confirmClearFolder() {
            const files = selections.handles.filter(f => M.d[f]);

            if (M.isInvalidUserStatus() || !files.length) {
                return;
            }
            const text = mega.icu.format(l[17154], files.length);
            const type = `*-confirmation:!^${l[1730]}!${l[82]}`;

            msgDialog(type, l[1003], l.delete_previous_versions_h, text, (yes) => {
                if (yes) {
                    fileversioning.clearFilesVersions(files)
                        .then(() => mega.ui.toast.show(l.previous_versions_deleted_toast))
                        .catch(tell);
                }
            });
        },

        /**
         * Delete the previous versions of several files, in one request; every current version stays.
         * @param {Array} files handles of the files.
         * @returns {Promise<void>} settled once the request is done.
         */
        async clearFilesVersions(files) {
            await dbfetch.tree(files, 0);

            // a file's versions may have been deleted elsewhere since the list was built.
            const heads = files.map(h => M.c[h] && fileversioning.getChildVersion(h)).filter(Boolean);

            if (heads.length) {
                await api.screq(getDeleteVersionsRequests(false, heads));
            }
        },

        /**
         * The summary row to show while the versions load: the count from the tree, no size yet but a folder's.
         * @param {Array} handles ufs-node handles the panel is opened on.
         * @returns {Object|null} the block, or null when the first node is not loaded.
         */
        getLoadingBlock(handles) {
            const nodes = handles.map(h => M.d[h]);

            if (!nodes[0]) {
                return null;
            }
            const block = summaryBlock(handles[0], versionCountOf(nodes), '', !!nodes[0].t);

            if (selections.folder) {
                return asOverviewRow(block, selections.folder, nodes[0].tvf | 0, nodes[0].tvb || 0);
            }
            return nodes[0].t ? asFolderSummary(block, nodes[0]) : block;
        },

        /**
         * Build the panel rows for the given files, or for the versioned files under a folder.
         * @param {Array} handles ufs-node handles the panel is opened on.
         * @returns {Promise<Array|null>} the rows, or null if a newer call started meanwhile.
         */
        async getBlocks(handles) {
            const request = ++blocksRequest;

            // a link or the Links page can point at an older version: its file's whole history is shown.
            if (handles.some(h => M.d[h] && M.d[h].fv)) {
                // as below, so a refresh during this wait does not reload the previous target.
                selections.requested = [...handles];
                await dbfetch.geta(handles).catch(dump);

                if (request !== blocksRequest) {
                    return null;
                }
                handles = [...new Set(handles.map(h => fileversioning.getTopNodeSync(h)))];
            }
            const blocks = [];
            const summaryHandle = handles[0];
            // a folder is swapped for its files below, but a preview has to reopen on the folder.
            const requested = [...handles];
            const isFolder = handles.length === 1 && M.d[handles[0]] && M.d[handles[0]].t;

            // set before loading, so a refresh arriving meanwhile reloads this target and not the previous one.
            selections.requested = requested;

            if (isFolder && M.isOutShare(summaryHandle, 'EXP')) {
                const files = await fileversioning.getSubVersions(summaryHandle);

                if (request !== blocksRequest) {
                    return null;
                }
                selections.overview = summaryHandle;
                selections.handles = files;
                selections.vtree = Object.create(null);

                return overviewBlocks(summaryHandle, files.map(h => ({
                    h,
                    name: M.getNameByHandle(h),
                    count: M.d[h].tvf,
                    bytes: M.d[h].tvb || 0,
                    path: pathNamesOf(h, summaryHandle),
                })), (a, b) => M.compareStrings(a, b, 1));
            }

            if (isFolder) {
                handles = await fileversioning.getSubVersions(handles[0]);

                if (request !== blocksRequest) {
                    return null;
                }
            }
            // one fetch, not one per file, and none for a file without versions: the API takes that as invalid.
            await dbfetch.tree(handles.filter(h => M.d[h] && M.d[h].tvf), -1).catch(dump);

            if (request !== blocksRequest) {
                return null;
            }
            const versions = handles.map(h => fileversioning.getAllVersionsSync(h));

            // the rendered files, i.e. what the row actions and the context menu operate on.
            selections.handles = handles;
            selections.vtree = Object.create(null);
            selections.overview = '';

            const allVersions = versions.flat();

            if (!allVersions.length) {
                return blocks;
            }

            const numVersions = allVersions.length;
            const totalSize = allVersions.reduce((sum, n) => sum + n.s, 0);

            const getMarker = (ts) => {
                const iso = new Date((ts | 0) * 1000).toISOString();
                return todayOrYesterday(iso) ? time2lastSeparator(iso) : acc_time2date(ts);
            };

            const toBlock = (n, h, listSection, action, isCurrent) => {
                const isMe = n.u === u_handle;
                const name = M.getNameByHandle(n.u) || l[7381];
                const {m: email} = !isMe && M.getUserByHandle(n.u) || {};
                const renamed = action === 'renamed';

                return {
                    nodeHandle: n.h,
                    itemComp: 'versions',
                    listSection,
                    versionInfo: {size: bytesToSize(n.s)},
                    versionTime: versionTimeText(n.ts, isCurrent),
                    versionAction: renamed ? l.version_renamed : editedBy(isMe, name),
                    // the email shows nowhere else, so this tooltip is there whether or not the text is cut off.
                    versionActionTip: renamed ? '' : editedBy(isMe, name, email),
                    onClick: () => fileversioning.previewFile(n.h, h, requested),
                    noContextBtn: false,
                    contextBtnLevel: 11,
                };
            };

            for (let i = 0; i < handles.length; i++) {
                const [current, ...previous] = versions[i];

                if (!current) {
                    continue;
                }
                selections.vtree[handles[i]] = versions[i].map(n => n.h);

                // along the chain, before the current version is split off and the rest re-sorted by date.
                const actions = versionActions(versions[i]);
                const actionOf = new Map(versions[i].map((n, j) => [n.h, actions[j]]));

                previous.sort((a, b) => b.ts - a.ts);

                blocks.push(toBlock(
                    current, handles[i], {idx: `${handles[i]}_current`, value: l[17149]}, actionOf.get(current.h), true
                ));

                for (const n of previous) {
                    const marker = getMarker(n.ts);
                    blocks.push(toBlock(
                        n, handles[i], {idx: `${handles[i]}_${marker}`, value: marker}, actionOf.get(n.h), false
                    ));
                }
            }

            const infoBlock = summaryBlock(summaryHandle, numVersions, bytesToSize(totalSize), !!isFolder);

            if (selections.folder) {
                const {count, bytes} = previousOf(versions[0]);
                asOverviewRow(infoBlock, selections.folder, count, bytes);
            }
            else if (isFolder) {
                asFolderSummary(infoBlock, M.d[summaryHandle]);
            }
            return [infoBlock, ...blocks];
        },

        /**
         * Get all the versions for given file handle in an async way.
         * If the versions are not loaded, it will load versions info into memory first.
         * @param h is expected to be a file handle.
         * @return It returns a list of handles of all the versions if everything works fine,
         * otherwise it returns list with current version.
         */
        async getAllVersions(h) {
            await dbfetch.tree([h], -1).catch(dump);
            return this.getAllVersionsSync(h);
        },

        /**
         * Find the files with previous versions under a folder, child folders included.
         * @param {String} h folder handle.
         * @returns {Promise<Array>} handles of those files.
         */
        async getSubVersions(h) {
            const foldersVersions = Object.create(null);
            foldersVersions[h] = M.d[h].tvf;

            const getChildFolderWithVersion = (h) => {
                if (!M.tree[h]) {
                    return;
                }
                const fHandles = Object.keys(M.tree[h]);

                for (let i = fHandles.length; i--;) {

                    if (M.tree[h][fHandles[i]].tvf) {
                        foldersVersions[fHandles[i]] = M.tree[h][fHandles[i]].tvf;
                        foldersVersions[h] -= M.tree[h][fHandles[i]].tvf;
                        getChildFolderWithVersion(fHandles[i]);
                    }

                    if (!foldersVersions[h]) {
                        delete foldersVersions[h];
                        break;
                    }
                }
            };

            getChildFolderWithVersion(h);

            const fh = Object.keys(foldersVersions);
            await dbfetch.geta(fh);

            const out = [];
            for (let i = fh.length; i--;) {
                const handles = Object.keys(M.c[fh[i]]);
                for (let j = handles.length; j--;) {
                    const node = M.getNodeByHandle(handles[j]);
                    if (!node.t && node.tvf) {
                        out.push(handles[j]);
                    }
                }
            }
            return out;
        },

        /**
         * Get all the versions for given file handle.
         * @param {String} h is expected to be a file handle.
         * @return {Array} an array of ufs-nodes of all the versions if everything works fine,
         *         otherwise it returns list with current version.
         */
        getAllVersionsSync: function(h) {
            return this.getVersionHandles(h, true).map(h => M.d[h]).filter(Boolean);
        },

        /**
         * Get all the versions for given file handle.
         * @param {String} h is expected to be a file handle.
         * @param {Boolean} [includeroot] include {@h} in result.
         * @returns {Array} ufs-node's handles of all the versions.
         */
        getVersionHandles(h, includeroot = false) {
            const res = includeroot ? [h] : [];

            while (M.c[h]) {
                h = this.getChildVersion(h);
                if (h) {
                    res.push(h);
                }
            }
            return res;
        },

        /**
         * Retrieve a single version child
         * @param {String} h is expected to be a file handle.
         * @returns {Boolean|String} child handle or false
         */
        getChildVersion(h) {
            const c = Object.keys(M.c[h]);
            // 1. the chain should be 1 parent-child.
            // 2. the node's parent chain stops.
            // 3. the node's parent is a file.
            return c.length === 1 && M.c[h][c[0]] === 1 && (!M.d[c[0]] || !M.d[c[0]].t) && c[0];
        },

        /**
         * Get the previous version for given file handle.
         * @param h is expected to be a file handle.
         * @return It returns the previous file of the given file handle, otherwise it returns false.
         */
        getPreviousVersionSync(h) {
            return M.c[h] && M.d[this.getChildVersion(h)] || false;
        },

        /**
         * Get the top node of the given file node from versioning chain.
         * @param h is expected to be a file handle.
         * @return It returns the top node of the passed in node.
        */
        getTopNodeSync(h) {
            var node = h;
            while (M.d[h] && M.d[M.d[h].p]) {

                if (M.d[M.d[h].p].t !== 0) {// the node's parent is not a file.
                    node = h;
                    break;
                }

                h = M.d[h].p;
            }
            return node;
        },

        /**
         * Build the list of context menu items to show for a single version, the versions
         * counterpart of {@link MegaData.menuItems}.
         * @param {String} h ufs-node handle of the version the menu was opened on.
         * @returns {Array} list of context menu item selectors.
         */
        menuItems(h) {
            const n = M.getNodeByHandle(h);

            if (!n) {
                return [];
            }
            const items = [];

            // as in the file grid, a taken down node offers nothing but the dispute.
            if (new mega.Share.ExportLink().isTakenDown([h])) {
                return ['.dispute-item'];
            }

            // the top node of the chain is the file itself, it cannot be reverted nor deleted as a version.
            const isCurrent = !n.fv;
            const inRubbish = M.getNodeRoot(h) === M.RubbishID;

            // getNodeRights() also rules out folder links and nodes we hold no share key for.
            const writable = M.getNodeRights(h) > 1;

            // reverting re-encrypts the node attributes, so it needs the key just as downloading does.
            const decryptable = !missingkeys[h];

            if (canPreview(n)) {
                items.push('.preview-version-item');
            }

            if (decryptable && !inRubbish) {
                items.push(...getDownloadMenuItems());
            }

            if (writable) {

                // a reverted version is written back into its folder, which neither the bin nor the Vault allow,
                // and with versioning off the revert fails (WEB-18866).
                if (!isCurrent && decryptable && !inRubbish && M.getNodeRoot(h) !== M.InboxID
                    && !fileversioning.dvState) {
                    items.push('.revert-version-item');
                }

                // none in the bin, as in the bin's own menus.
                if (!inRubbish && M.getNodeShare(h)) {
                    items.push('.remove-version-link-item');
                }

                if (!isCurrent) {
                    items.push('.delete-version-item');
                }
            }

            return items;
        },

        /**
         * Preview a version from the versions list.
         * @param {String} h ufs-node handle of the version to preview.
         * @returns {void}
         */
        previewVersion(h) {
            this.previewFile(h, this.getTopNodeSync(h), selections.requested);
        },

        /**
         * Restore a previous version as the current one.
         * @param {String} handle ufs-node handle of the version to revert to.
         * @returns {void}
         */
        revertVersion(handle) {
            if (M.isInvalidUserStatus()) {
                return;
            }
            const current_node = this.getTopNodeSync(handle);

            const file = M.d[handle];
            const n = {
                name: file.name,
                hash: file.hash,
                k: file.k
            };

            if (file.fav) {
                n.fav = file.fav;
            }

            if (file.sen) {
                n.sen = file.sen;
            }

            if (file.lbl) {
                n.lbl = file.lbl;
            }

            if (file.des) {
                n.des = file.des;
            }

            if (file.tags) {
                n.tags = file.tags;
            }

            const ea = ab_to_base64(crypto_makeattr(n));
            const dir = M.d[current_node].p || M.RootID;
            const share = M.getShareNodesSync(dir, null, true);
            const req = {
                a: 'p',
                t: dir,
                n: [{
                    h: handle,
                    t: 0,
                    a: ea,
                    k: a32_to_base64(encrypt_key(u_k_aes, file.k)),
                    fa: file.fa,
                    ov: current_node
                }]
            };
            if (share.length) {

                // repackage/-encrypt n for processing by the `p` API
                const revertedNode = {};

                // reverted files must retain their existing key
                if (!file.t) {
                    revertedNode.k = file.k;
                }

                // new node inherits all attributes
                revertedNode.a = ab_to_base64(crypto_makeattr(file, revertedNode));

                // new node inherits handle, parent and type
                revertedNode.h = n.h;
                revertedNode.p = n.p;
                revertedNode.t = n.t;
                req.cr = crypto_makecr([revertedNode], share, false);
            }

            // the panel redraws on the new node through updateFileVersioningDialog(), and the grid
            // selection stays the user's.
            api.screq(req)
                .then(() => mega.ui.toast.show(revertedText(file.name, file.ts)))
                .catch(tell);
        },

        /**
         * Delete a single version, after confirmation.
         * @param {String} h ufs-node handle of the version to delete.
         * @returns {void}
         */
        deleteVersion(h) {
            if (M.isInvalidUserStatus()) {
                return;
            }

            const remove = () => {
                api.screq({a: 'd', n: h, v: 1})
                    .then(() => mega.ui.toast.show(l.version_deleted_toast))
                    .catch(tell);
            };

            if (mega.config.get('skipDelVer')) {
                remove();
                return;
            }

            const text = l.delete_version_confirm.replace('%1', bytesToSize(M.d[h].s));
            const type = `*-confirmation:!^${l[1730]}!${l[82]}`;

            msgDialog(type, l[1003], l.delete_version_h, text, (yes) => {
                if (yes) {
                    remove();
                }
            }, 'skipDelVer');
        },

        /**
         * Remove the public link set on a version.
         * @param {String} h ufs-node handle of the version.
         * @returns {void}
         */
        removeVersionLink(h) {
            const doRemove = () => {
                const exportLink = new mega.Share.ExportLink({updateUI: true, nodesToProcess: [h]});
                exportLink.removeExportLink(true);
            };

            if (mega.config.get('nowarnpl')) {
                doRemove();
            }
            else {
                mega.Dialog.ExportLink.remove.show([h], null, doRemove);
            }
        },

        /**
         * delete all previous versions of a file.
         * @param {String} h ufs-node handle
         * @returns {Promise<*>}
         */
        clearPreviousVersions: function (h) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    var previousVersion = versions && versions.length > 1 ? versions[1] : false;
                    if (previousVersion) {
                        return api.screq({a: 'd', n: previousVersion.h});
                    }
                });
        },

        /**
         * set/remove favourite on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} newFavState Favourites state 0 or 1
         */
        favouriteVersions: function (h, newFavState) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {fav: newFavState | 0}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove sensitive on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} newSenState Sensitive state 0 or 1
         */
        sensitiveVersions(h, newSenState) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {sen: newSenState | 0}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove labels on all previous versions of a file.
         * @param {hanlde} h file hanle.
         * @param {Number} labelId Numeric value of label
         */
        labelVersions: function (h, labelId) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {lbl: labelId | 0}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove description on all previous versions of a file.
         * @param {String} h file handle.
         * @param {String} desc description string/text
         * @returns {Promise} promise
         */
        descriptionVersions(h, desc) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], {des: desc || undefined}));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * set/remove tags on all previous versions of a file.
         * @param {String} h file handle.
         * @param {Object} prop tags
         * @returns {Promise} promise
         */
        tagVersions(h, prop) {
            return fileversioning.getAllVersions(h)
                .then((versions) => {
                    const promises = [];
                    for (let i = 1; i < versions.length; i++) {
                        promises.push(api.setNodeAttributes(versions[i], prop));
                    }
                    return Promise.allSettled(promises);
                });
        },

        /**
         * update file versioning setting.
         */
        updateVersionInfo: function () {
            mega.attr.get(
                u_handle,
                'dv',
                -2,
                true
            ).done(r => {
                if (r === "0") {
                    $('#versioning-status').addClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 0;
                }
                else if (r === "1") {
                    $('#versioning-status').removeClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 1;
                }
            }).fail(e => {
                if (e === ENOENT) {
                    $('#versioning-status').addClass('toggle-on').trigger('update.accessibility');
                    fileversioning.dvState = 0;
                }
            });

            if (!M.account) {
                return;
            }

            // the Rubbish bin too, as "Delete older versions" lists it and dv deletes its versions.
            const versions = countVersions(M.account.stats, [M.RootID, M.InboxID, M.RubbishID]);

            var $deleteButton = $('button#delete-all-versions').removeClass('disabled');
            if (versions.count === 0) {
                $deleteButton.addClass('disabled');
            }
            const verionInfo = mega.icu.format(l.version_file_summary, versions.count)
                .replace('[X]',
                         `<span class="versioning-text total-versions-size">${bytesToSize(versions.size)}</span>`);

            $('.versioning-body-text.versioning-info-message').safeHTML(verionInfo);
        },

        /**
         * Refresh the versions panel if it is showing the file a node change belongs to.
         *
         *
         * @param {String} [fileHandle] fileHandle file handle of the file to update,
         * it is null, just do refresh based on the currently selected file.
         *
         */
        updateFileVersioningDialog(fileHandle) {

            const current_sel = fileHandle || $.selected[0];
            const p = fileversioning.getTopNodeSync(current_sel);

            if (p) {
                // update node DOM.
                M.versioningDomUpdate(p);
            }
            if (!p || !fileversioning.isOpen()) {
                return;
            }
            const h = shownFileFor(selections.vtree, fileversioning.getVersionHandles(p, true), current_sel);

            // the overview lists files rather than versions, so any change under its share can add, drop or
            // recount one.
            if (!h && !(selections.overview && M.getPath(p).includes(selections.overview))) {
                return;
            }
            // after a revert or an upload the file's newest version has a new handle.
            selections.requested = selections.requested.map(r => r === h ? p : r);

            // one change arrives as several action packets.
            delay('fileversioning:refresh', redrawPanel);
        },

        /**
         * Redraw the versions panel once action packets are processed, as the Info panel does, so that changes
         * along its paths, such as a folder renamed or moved or share rights changed, show.
         * @returns {void}
         */
        eventuallyUpdate() {
            delay('fileversioning:refresh', redrawPanel);
        },

        /**
         * Follow the file list's selection, or the folder opened with nothing selected, as the Info panel does.
         * @returns {void}
         */
        eventuallyUpdateSelected() {
            // the viewer selects what it shows, e.g. a version previewed from the panel, which is no pick in the list.
            if (slideshowid) {
                return;
            }
            delay('fileversioning:follow', () => {
                if (!fileversioning.isOpen()) {
                    return;
                }
                const selected = $.selected || [];
                const dir = String(M.currentdirid || '').split('/').pop();
                const topOf = (h) => fileversioning.getTopNodeSync(h);
                const inBin = (h) => M.getNodeRoot(h) === M.RubbishID;
                let target;

                if (isNewSelection(selected, followed, topOf)) {
                    // an older version, e.g. on the Links page, stands for its file, as its Manage versions does.
                    const files = [...new Set(selected.map(topOf))].map(h => M.d[h]);
                    target = followTarget(files, inBin);
                }
                else if (isNewFolder(selected, dir, followedDir)) {
                    target = folderTarget(M.d[dir], inBin);
                }
                else {
                    // e.g. Show in location reselects the shown file in its folder, so a deselect there keeps it.
                    followedDir = dir;
                    return;
                }
                followed = [...selected];
                followedDir = dir;

                // e.g. the same files picked again in another order: no reload, so the list keeps its scroll.
                if (String([...target].sort()) !== String([...selections.requested].sort())) {
                    fileversioning.show(target);
                }
            });
        },

        /**
         * Open the viewer or the text editor for the given version handle
         *
         * @param {string} previewHandle Node handle of the version to preview
         * @param {string} fileHandle Handle for the node that has these versions.
         * @param {array} handles Handles the panel was opened on, to reopen it with.
         * @returns {none} none (ESLint requires)
         */
        previewFile(previewHandle, fileHandle, handles) {
            const n = M.d[previewHandle];

            if (M.isInvalidUserStatus() || !canPreview(n)) {
                return;
            }

            loadingDialog.show('common', l[23130]);

            // the viewer's own Info button takes the panel over, and nothing gives it back.
            const {folder} = selections;
            const reopen = () => {
                if (!fileversioning.isOpen()) {
                    // reopening inside the Info panel's hide drops its cleanup with its listeners.
                    mega.ui.mInfoPanel.cleanup();
                    fileversioning.show(handles, folder);
                }
            };
            if (is_text(n)) {
                mega.fileTextEditor
                    .getFile(previewHandle)
                    .done((data) => {
                        loadingDialog.hide();
                        mBroadcaster.once('text-editor:close', () => onIdle(reopen));
                        mega.textEditorUI.setupEditor(n.name, data, previewHandle, true);
                    })
                    .fail(() => loadingDialog.hide());
            }
            else {
                fileversioning.getAllVersions(fileHandle).then((res) => {
                    if (is_video(n)) {
                        $.autoplay = previewHandle;
                    }
                    mBroadcaster.once('slideshow:close', () => onIdle(reopen));
                    slideshow(previewHandle, 0, false, res);
                    loadingDialog.hide();
                });
            }
        },


        deleteDialog: {

            sheetDetails: {
                name: 'delete-versions',
                type: 'modal',
                showClose: true,
                preventBgClosing: true,
                sheetClassList: ['delete-versions', 'horizontal-actions'],
            },

            _sheet: false,

            // When select all, use all - unselected. Else, use selected.
            _selected: new Set(),
            _unselected: new Set(),
            _all: new Map(),

            _selectAll: false,

            _activeRows: new Map(),
            _rows: new Map(),

            // Numbers each init(), so one still loading when the dialog is reopened is dropped.
            _request: 0,
            _list: null,

            // The Cloud drive list's tick and dash, so these checkboxes look like its ones.
            checkIcons: {checkedIcon: 'icon-check', partialIcon: 'icon-minimise'},

            // Whether every file is ticked, e.g. to send one request for all of them.
            get _allSelected() {
                return this._all.size > 0 && this.selectedCount() === this._all.size;
            },

            show() {
                if (mega.ui.sheet.name !== this.sheetDetails.name) {
                    this.init();
                }
                this._sheet.show();
            },

            hide() {
                this._sheet.hide();
            },

            destroyList() {
                // MegaList keeps a window resize handler until it is destroyed.
                if (this._list) {
                    this._list.destroy();
                    this._list = null;
                }
            },

            update() {
                const {files, versions, bytes} = this._selectedTotals;

                this._countNode.textContent = selectedFilesText(files, this._all.size);
                this._deleteButton.text = getDeleteVersionsLabel(versions, bytes);
                this._deleteButton.disabled = !files;
            },

            onConfirm() {
                if (M.isInvalidUserStatus() || !this.selectedCount() || this._deleteButton.loading) {
                    return;
                }
                const allSelected = this._allSelected;

                // not disabled as well: its grey hides the throbber.
                this._deleteButton.loading = true;
                this._cancelButton.disabled = true;

                return this.deleteSelected(allSelected)
                    .then(() => {
                        // closed meanwhile, the shared sheet may hold another dialog by now.
                        if (mega.ui.sheet.name === this.sheetDetails.name) {
                            this.hide();
                        }
                        M.accountData(() => fileversioning.updateVersionInfo(), false, true);
                    })
                    .catch((ex) => {
                        this._deleteButton.loading = false;
                        this._cancelButton.disabled = false;
                        this.update();
                        // not tell(): its dialog would take over this same sheet, list and ticks included.
                        mega.ui.toast.show(ex < 0 ? api_strerror(ex) : l[47]);
                        dump(ex);
                    });
            },

            // One dv for everything, otherwise a d for each ticked file's newest previous version.
            async deleteSelected(allSelected) {
                if (allSelected) {
                    return api.screq(getDeleteVersionsRequests(true));
                }
                return fileversioning.clearFilesVersions(this.getSelected());
            },

            getSelected() {
                if (!this._selectAll) {
                    return [...this._selected];
                }
                return [...this._all.keys()].filter(h => !this._unselected.has(h));
            },

            // Ticked: every file but the unticked ones after "All files", otherwise just the ticked ones.
            isSelected(id) {
                return this._selectAll ? !this._unselected.has(id) : this._selected.has(id);
            },

            selectedCount() {
                return this._selectedTotals.files;
            },

            addRow(id) {
                const cached = this._rows.get(id);

                if (cached) {
                    // while out of view it may have missed an "All files" toggle.
                    cached.checkbox.checked = this.isSelected(id);
                    this._activeRows.set(id, cached);
                    return cached.row;
                }

                const {count, size} = this._all.get(id);

                const row = document.createElement('div');
                row.className = 'file-info-row';

                const checkbox = new MegaCheckbox({
                    parentNode: row,
                    componentClassname: 'mega-checkbox',
                    checkboxName: `delete-versions-${id}`,
                    checked: this.isSelected(id),
                    ...this.checkIcons,

                    // unlike the toggle event, onClick fires for the user's clicks only, not for setting checked.
                    onClick: (checked) => {
                        if (this._selectAll) {
                            this._unselected[checked ? 'delete' : 'add'](id);
                        }
                        else {
                            this._selected[checked ? 'add' : 'delete'](id);
                        }
                        this._selectedTotals = shiftTotals(this._selectedTotals, this._all.get(id), checked ? 1 : -1);
                        this.syncAllFiles();
                    },
                });
                mCreateElement('i', {class: `item-type-icon icon-${fileIcon(M.getNodeByHandle(id))}-24`}, row);
                const name = mCreateElement('div', {class: 'file-info-name'}, row);
                mCreateElement('span', {class: 'file-info-name-text'}, name).textContent = M.getNameByHandle(id);
                mCreateElement('span', {class: 'file-info-details'}, row).textContent =
                    previousVersionsText(count, bytesToSize(size));

                const rowData = {row, checkbox};
                this._rows.set(id, rowData);
                this._activeRows.set(id, rowData);
                return row;
            },

            removeRow(id) {
                this._activeRows.delete(id);
            },

            // Tick or untick every file; rows out of view catch up in addRow() when they come back.
            toggleAll(checked) {
                this._selectAll = checked;
                this._selected = new Set();
                this._unselected = new Set();
                this._selectedTotals = checked ? this._allTotals : noTotals;

                for (const rowData of this._activeRows.values()) {
                    rowData.checkbox.checked = checked;
                }

                // a click on the box itself leaves checkedPartially set, so settle "All files" through its setter.
                this.syncAllFiles();
            },

            // "All files" follows the rows: ticked when all are, partly ticked when only some are.
            syncAllFiles() {
                const count = this.selectedCount();

                if (count && count < this._all.size) {
                    this._allFilesCheckbox.checkedPartially = true;
                }
                else {
                    this._allFilesCheckbox.checked = count > 0;
                }
                this.update();
            },

            /**
             * Every file with previous versions, in the Cloud drive, the Vault and the Rubbish bin, all of which
             * dv reaches.
             * @returns {Promise<Array>} their handles.
             */
            async getFiles() {
                return [
                    ...await fileversioning.getSubVersions(M.RootID),
                    ...M.d[M.InboxID] ? await fileversioning.getSubVersions(M.InboxID) : [],
                    ...await fileversioning.getSubVersions(M.RubbishID),
                ];
            },

            async init() {
                const request = ++this._request;

                // a reopened dialog starts over, instead of reusing the last one's rows and ticks.
                this._selectAll = true;
                this._selected = new Set();
                this._unselected = new Set();
                this._rows = new Map();
                this._activeRows = new Map();
                this._all = new Map();
                this._allTotals = noTotals;
                this._selectedTotals = noTotals;

                this._sheet = mega.ui.sheet;
                this._sheet.clear();

                const {sheetClassList, ...details} = this.sheetDetails;
                Object.assign(this._sheet, details);

                // the sheet is shared, and clear() takes addedClasses off again for the next dialog.
                this._sheet.addClass(...sheetClassList);
                this._sheet.addedClasses = sheetClassList;

                // however the sheet closes, X included; it keeps preventBgClosing, which Rename would inherit.
                this._sheet.one('clear', () => {
                    this._sheet.preventBgClosing = false;
                    this.destroyList();
                });

                // header and actions sit outside the sheet's scrolling area, and the list scrolls on its own.
                this._sheet.addHeader(l.delete_older_versions_h, 'h3');
                this._sheet.addSubTitle(l[17600]);

                const allFilesRow = mCreateElement('div', {class: 'file-info-row all-files-row'});
                this._allFilesCheckbox = new MegaCheckbox({
                    parentNode: allFilesRow,
                    componentClassname: 'mega-checkbox',
                    checkboxName: 'all-files',
                    checked: true,
                    ...this.checkIcons,
                    onClick: (checked) => this.toggleAll(checked),
                });
                mCreateElement('span', {class: 'all-files-label'}, allFilesRow).textContent = l[16131];
                this._countNode = mCreateElement('span', {class: 'all-files-count'}, allFilesRow);

                this.domNode = mCreateElement('div', {class: 'delete-versions-list'});
                this._sheet.addContents([allFilesRow, this.domNode]);

                // placeholder rows in the real row grid while the versioned files are found; 8 fill the list.
                for (let i = 8; i--;) {
                    const row = mCreateElement('div', {class: 'file-info-row sk-loading'}, this.domNode);
                    for (const part of ['sk-check', 'sk-icon', 'sk-name', 'sk-details']) {
                        mCreateElement('i', {class: `sk-elm ${part}`}, row);
                    }
                }

                [this._cancelButton, this._deleteButton] = this._sheet.addActions([
                    {text: l[82], componentClassname: 'secondary slim', onClick: () => this.hide()},
                    {
                        text: getDeleteVersionsLabel(0, 0),
                        componentClassname: 'destructive slim',
                        onClick: () => this.onConfirm(),
                    },
                ]);

                // nothing to delete until the files are listed.
                this._deleteButton.disabled = true;
                this._deleteButton.skLoading = true;

                const handles = await this.getFiles().catch((ex) => {
                    // tell() takes the shared sheet over, so the skeleton goes with it.
                    if (request === this._request && mega.ui.sheet.name === this.sheetDetails.name) {
                        tell(ex);
                    }
                    return null;
                });

                // failed, closed, or reopened and filled by the newer call, while this loaded.
                if (!handles || request !== this._request || mega.ui.sheet.name !== this.sheetDetails.name) {
                    return;
                }

                handles.sort((a, b) => M.compareStrings(M.d[a].name, M.d[b].name, 1));

                // counts from the tree, so no version nodes are loaded; tvf leaves out the current version.
                for (const h of handles) {
                    const file = {count: M.d[h].tvf, size: M.d[h].tvb || 0};
                    this._all.set(h, file);
                    this._allTotals = shiftTotals(this._allTotals, file, 1);
                }

                this._deleteButton.skLoading = false;

                // "All files" may have been clicked while this loaded, before any row could be.
                this._selectedTotals = this._selectAll ? this._allTotals : noTotals;
                this.syncAllFiles();

                this.domNode.textContent = '';

                this._list = new MegaList(this.domNode, {
                    itemRenderFunction: (id) => fileversioning.deleteDialog.addRow(id),
                    itemRemoveFunction: (node, id) => fileversioning.deleteDialog.removeRow(id),
                    preserveOrderInDOM: true,
                    usingNativeScroll: false,
                    itemHeight: 40,
                    renderAdapter: new MegaList.RENDER_ADAPTERS.List({ usingNativeScroll: false }),
                    // the rows fit the width, and a sideways scroll in RTL makes the rail push the list wider for ever.
                    perfectScrollOptions: {
                        'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                        'minScrollbarLength': 20,
                        'suppressScrollX': true,
                    },
                });

                this._list.initialRender();
                this._list.batchAdd([...this._all.keys()]);
            },
        }
    };
    ns.dvState = null;
    Object.defineProperty(global, 'fileversioning', {value: ns});
    global.MegaVersionItem = MegaVersionItem;
    ns = undefined;

    mBroadcaster.addListener('fm:initialized', function() {
        if (folderlink || !u_handle) {
            return;
        }

        mega.attr.get(u_handle, 'dv', -2, true).done(function(r) {
            fileversioning.dvState = r === "1" ? 1 : 0;
        });

        return 0xDEAD;
    });
})(this);

