import React from "react";
import {MegaRenderMixin} from "../../../../../chat/mixins";

export class ColumnContactRequestsEmail extends MegaRenderMixin {
    static sortable = true;
    static id = "email";
    static label = l[95];
    static megatype = "email";

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        return <td>
            <span
                dangerouslySetInnerHTML={{
                    __html: useravatar.contact(node.m, 'box-avatar')
                }}
            />
            <div className="contact-item">
                <div className="contact-item-user">{node.m}</div>
            </div>
            <div className="clear"/>
        </td>;
    }
}
