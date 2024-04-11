import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSharedFolderName extends GenericNodePropsComponent {
    static sortable = true;
    static id = "name";
    static label = l[86];
    static megatype = "name";

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        return <td megatype={ColumnSharedFolderName.megatype} className={ColumnSharedFolderName.megatype}>
            <div className="item-type-icon-90 icon-folder-incoming-90 sprite-fm-uni-after icon-warning-after"></div>
            <div className="shared-folder-info-block">
                <div className="shared-folder-name">{missingkeys[node.h] ? l[8686] : nodeAdapter.nodeProps.title}</div>
                <div className="shared-folder-info">{fm_contains(node.tf, node.td)}</div>
            </div>
        </td>;
    }
}
