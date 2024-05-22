import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSharedFolderAccess extends GenericNodePropsComponent {
    static sortable = true;
    static id = 'access';
    static megatype = 'access';

    static get label() {
        // Access
        return l[5906];
    }

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
