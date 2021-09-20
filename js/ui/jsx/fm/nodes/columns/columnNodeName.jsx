import Tooltips from "../../../../tooltips.jsx";
import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnNodeName extends GenericNodePropsComponent {
    static sortable = true;
    static id = "name";
    static label = l[86] /* `Name` */;
    static megatype = "fname";

    getThumbnailSrc = node => {
        node.imgId = `preview_${node.h}`;
        node.seen = node.seen || 1;
        return window.noThumbURI || '';
    };

    render() {
        const { nodeAdapter } = this.props;
        const { node, requestThumbnailCb } = nodeAdapter.props;

        return (
            <td megatype={ColumnNodeName.megatype}>
                {is_image(node) || is_video(node) ?
                    <Tooltips.Tooltip
                        withArrow={true}
                        className="tooltip-handler-container"
                        onShown={() => {
                            if (!thumbnails[node.h]) {
                                requestThumbnailCb(node, true);
                            }
                        }}>
                        <Tooltips.Handler className={`transfer-filetype-icon ${fileIcon(node)}`} />
                        <Tooltips.Contents
                            className="img-preview">
                            <div className="dropdown img-wrapper img-block" id={`preview_${node.h}`}>
                                <img
                                    alt=""
                                    className={`thumbnail-placeholder ${node.h}`}
                                    src={thumbnails[node.h] || this.getThumbnailSrc(node)}
                                    width="156"
                                    height="156"
                                    onLoad={() => {
                                        if (thumbnails[node.h]) {
                                            // Trigger force update after `fm_thumbnail_render` had set the
                                            // `src` attribute
                                            this.safeForceUpdate();
                                        }
                                    }}
                                />
                            </div>
                        </Tooltips.Contents>
                    </Tooltips.Tooltip> :
                    <span
                        className={`
                            transfer-filetype-icon
                            ${nodeAdapter.nodeProps.isFolder ? 'folder' : ''}
                            ${nodeAdapter.nodeProps.icon}
                            ${node.su ? 'inbound-share' : ''}
                        `}
                    />}
                <span className={"tranfer-filetype-txt"}>{nodeAdapter.nodeProps.title}</span>
            </td>
        );
    }
}
