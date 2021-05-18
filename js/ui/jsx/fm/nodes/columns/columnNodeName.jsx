import Tooltips from "../../../../tooltips.jsx";
import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnNodeName extends GenericNodePropsComponent {
    static sortable = true;
    static id = "name";
    static label = l[86];
    static megatype = "fname";

    render() {
        let {nodeAdapter} = this.props;
        let {node, requestThumbnailCb} = nodeAdapter.props;

        let iconClass = "transfer-filetype-icon " + (nodeAdapter.nodeProps.isFolder ? " folder " : "") + '' +
            nodeAdapter.nodeProps.icon;

        if (node.su) {
            iconClass += ' inbound-share';
        }

        let icon = <span
            className={iconClass}> </span>;

        let src = null;
        if ((is_image(node) || is_video(node)) && node.fa) {
            src = thumbnails[node.h];
            if (!src) {
                node.imgId = "preview_" + node.h;

                if (!node.seen) {
                    node.seen = 1; // HACK
                }
                src = window.noThumbURI || '';
            }
            icon = <Tooltips.Tooltip withArrow={true} className="tooltip-handler-container" onShown={() => {
                requestThumbnailCb(node, true);
            }}>
                <Tooltips.Handler className={"transfer-filetype-icon " + fileIcon(node)}> </Tooltips.Handler>
                <Tooltips.Contents className={"img-preview"}>
                    <div className="dropdown img-wrapper img-block" id={"preview_" + node.h}>
                        <img alt=""
                            className={"thumbnail-placeholder " + node.h}
                            src={src}
                            width="156"
                            height="156"
                        />
                    </div>
                </Tooltips.Contents>
            </Tooltips.Tooltip>;
        }

        return <td megatype={ColumnNodeName.megatype}>
            {icon}
            <span className={"tranfer-filetype-txt"}>{nodeAdapter.nodeProps.title}</span>
        </td>;
    }
}
