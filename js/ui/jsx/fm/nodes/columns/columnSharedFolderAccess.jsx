import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSharedFolderAccess extends GenericNodePropsComponent {
    static sortable = true;
    static id = 'access';
    static label = l[5906] /* `Access` */;
    static megatype = 'access';

    render() {
        const { nodeAdapter } = this.props;

        return (
            <td
                megatype={ColumnSharedFolderAccess.megatype}
                className={ColumnSharedFolderAccess.megatype}>
                <div className="shared-folder-access">
                    <i
                        className={`
                            sprite-fm-mono
                            ${nodeAdapter.nodeProps.incomingShareData.accessIcon}
                        `}
                    />
                    <span>{nodeAdapter.nodeProps.incomingShareData.accessLabel}</span>
                </div>
            </td>
        );
    }
}
