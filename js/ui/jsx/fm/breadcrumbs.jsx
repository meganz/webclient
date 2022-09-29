import React from 'react';
import {MegaRenderMixin} from "../../../chat/mixins";

export default class Breadcrumbs extends MegaRenderMixin {
    constructor(props) {
        super(props);

        this.state = {
            'breadcrumbDropdownVisible': false
        };

        this.onGlobalClickHandler = this.onGlobalClickHandler.bind(this);
        this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
    }
    getBreadcrumbNodeIcon(nodeId) {
        switch (nodeId) {
            case M.RootID:
                return 'cloud-drive';
            case M.RubbishID:
                return 'recycle-item';
            case 'shares':
                return 'contacts-item';
            default:
                return nodeId && M.d[nodeId] && fileIcon(M.d[nodeId]);
        }
    }
    getBreadcrumbNodeText(nodeId, prevNodeId) {
        const backupsId = M.BackupsId || 'backups';

        switch (nodeId) {
            case M.RootID:
                // `Cloud Drive`
                return l[164];
            case M.RubbishID:
                // `Rubbish Bin`
                return l[167];
            case backupsId:
                // `Backups`
                return l.restricted_folder_button;
            case 'shares':
                // `username@mega.co.nz` || `Shared with me`
                return prevNodeId && M.d[prevNodeId] ? M.d[prevNodeId].m : l[5589];
            default:
                return M.d[nodeId] && M.d[nodeId].name;
        }
    }
    getBreadcrumbDropdownContents(items) {
        let contents = [];

        for (let item of items) {

            let icon;

            if (!item.name) {
                continue;
            }

            if (item.type === 'cloud-drive') {
                icon = <i className="sprite-fm-mono icon-cloud icon24"></i>;
            }
            else if (item.type === 'backups') {
                icon = <i className="sprite-fm-mono icon-database-filled icon24"></i>;
            }
            else if (item.type === 'folder') {
                icon = <i className="sprite-fm-mono icon-folder-filled icon24"></i>;
            }

            contents.push(
                <a
                    className="crumb-drop-link"
                    key={'drop_link_' + item.nodeId}
                    onClick={(e) => this.onBreadcrumbNodeClick(e, item.nodeId)}>
                    {icon}
                    <span>
                        {item.name}
                    </span>
                </a>
            );
        }

        return contents;
    }
    onBreadcrumbNodeClick(e, nodeId /* , prevNodeId */) {
        e.preventDefault();
        e.stopPropagation();

        if (this._clickToHideListener) {
            this.removeGlobalClickHandler();
            this.setState({'breadcrumbDropdownVisible': false});
        }

        this.props.onNodeClick(nodeId);
    }
    resizeBreadcrumbs() {
        Soon(() => {
            var $breadcrumbsWrapper = $('.fm-breadcrumbs-wrapper.add-from-cloud', this.findDOMNode());
            var $breadcrumbs = $('.fm-breadcrumbs-block', $breadcrumbsWrapper);

            var wrapperWidth = $breadcrumbsWrapper.outerWidth();
            var $el = $(this.props.isSearch ? '.search-path-txt' : '.right-arrow-bg', $breadcrumbs);
            var i = 0;
            var j = 0;
            $el.removeClass('short-foldername ultra-short-foldername invisible');

            $breadcrumbsWrapper.removeClass('long-path overflowed-path');
            if ($breadcrumbs.outerWidth() > wrapperWidth) {
                $breadcrumbsWrapper.addClass('long-path');
            }

            while ($breadcrumbs.outerWidth() > wrapperWidth) {
                if (i < $el.length - 1) {
                    $($el[i]).addClass('short-foldername');
                    i++;
                }
                else if (j < $el.length - 1) {
                    $($el[j]).addClass('ultra-short-foldername');
                    j++;
                }
                else if (!$($el[j]).hasClass('short-foldername')) {
                    $($el[j]).addClass('short-foldername');
                }
                else {
                    $($el[j]).addClass('ultra-short-foldername');
                    $breadcrumbsWrapper.addClass('overflowed-path');
                    break;
                }
            }
        });
    }
    customIsEventuallyVisible() {
        // TODO: Fix css issue...
        return true;
    }
    onGlobalClickHandler(e) {
        let node = this.findDOMNode();
        if (node.contains(e.target) || node === e.target) {
            return;
        }

        if (this._clickToHideListener) {
            this.removeGlobalClickHandler();
        }
        this.setState({'breadcrumbDropdownVisible': false});
    }
    removeGlobalClickHandler() {
        this._clickToHideListener = false;
        document.body.removeEventListener("click", this.onGlobalClickHandler);
    }
    componentDidUpdate() {
        super.componentDidUpdate();

        if (this.state.breadcrumbDropdownVisible) {
            if (!this._clickToHideListener) {
                this._clickToHideListener = true;
                document.body.addEventListener("click", this.onGlobalClickHandler);
            }
        }
        else if (this._clickToHideListener) {
            this.removeGlobalClickHandler();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.removeGlobalClickHandler();
    }

    render() {
        let { className, highlighted, currentlyViewedEntry, isSearch, path } = this.props;
        const breadcrumb = [];
        const extraPathItems = [];
        const maxPathLength = 5;
        let breadcrumbDropdownContents = [];
        const entryId = isSearch ? highlighted[0] : currentlyViewedEntry;

        if (entryId !== undefined) {
            (path || M.getPath(entryId))
                .forEach((nodeId, k, path) => {
                    var breadcrumbClasses = "";
                    if (nodeId === M.RootID) {
                        breadcrumbClasses += " cloud-drive";
                    }
                    else {
                        breadcrumbClasses += " folder";
                    }
                    if (nodeId.length === 11 && M.u[nodeId]) {
                        return;
                    }
                    if (nodeId === "shares") {
                        breadcrumbClasses += " shared-with-me";
                    }

                    const prevNodeId = path[k - 1];
                    const nodeName = this.getBreadcrumbNodeText(nodeId, prevNodeId);

                    if (!nodeName) {
                        return;
                    }

                    // Flag that the specific node is part of the `Incoming Shares` node chain;
                    // The `Attach` button is not available for isIncomingShare nodes.

                    ((nodeId, k) => {
                        if (k < maxPathLength - 1) {
                            breadcrumb.unshift(
                                <a
                                    className={"fm-breadcrumbs contains-directories " + breadcrumbClasses}
                                    key={nodeId}
                                    onClick={(e) => this.onBreadcrumbNodeClick(e, nodeId)}>
                                    <span className={`right-arrow-bg simpletip`} data-simpletip={nodeName}>
                                        <span className="selectable-txt">{nodeName}</span>
                                    </span>
                                    {k !== 0 && <i className="next-arrow sprite-fm-mono icon-arrow-right icon16"></i>}
                                </a>
                            );
                        }
                        else {
                            let folderType = nodeId === M.RootID ? 'cloud-drive' : 'folder';

                            if (M.BackupsId && nodeId === M.BackupsId) {
                                folderType = 'backups';
                            }

                            extraPathItems.push({
                                name: nodeName,
                                type: folderType,
                                nodeId
                            });
                        }
                    })(nodeId, k);
                });

            if (extraPathItems.length > 0) {
                breadcrumbDropdownContents = this.getBreadcrumbDropdownContents(extraPathItems);
            }
        }
        return <div className={`fm-breadcrumbs-wrapper ${className || ""}`}>
            <div className="fm-breadcrumbs-block">
                {breadcrumbDropdownContents.length ?
                    <>
                        <div className="crumb-overflow-link">
                            <a
                                className="breadcrumb-dropdown-link dropdown"
                                onClick={() => {
                                    this.setState({
                                        breadcrumbDropdownVisible:
                                            !this.state.breadcrumbDropdownVisible
                                    });
                                }}>
                                <i className="menu-icon sprite-fm-mono icon-options icon24">
                                </i>
                            </a>
                            <i className="sprite-fm-mono icon-arrow-right icon16"></i>
                        </div>
                        {breadcrumb}
                    </>
                    : breadcrumb
                }
            </div>
            {breadcrumbDropdownContents.length ?
                <div className={this.state.breadcrumbDropdownVisible
                    ? 'breadcrumb-dropdown active' : 'breadcrumb-dropdown'}>
                    {breadcrumbDropdownContents}
                </div>
                : ''
            }
        </div>;
    }
}
