import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSharedFolderAccess extends GenericNodePropsComponent {
    static sortable = true;
    static id = "r";
    static label = l[5906];
    static megatype = "share-access";

    render() {
        let {nodeAdapter} = this.props;


        return <td megatype={ColumnSharedFolderAccess.megatype} className={ColumnSharedFolderAccess.megatype}>
            <div className="shared-folder-access">
                <i className={
                    "sprite-fm-mono " +
                    nodeAdapter.nodeProps.incomingShareData.accessIcon
                }></i>
                <span>{nodeAdapter.nodeProps.incomingShareData.accessLabel}</span>
            </div>
        </td>;
    }
}
