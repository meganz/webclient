import React from "react";
import {MegaRenderMixin} from "../../../../../chat/mixins";

export class ColumnContactRequestsTs extends MegaRenderMixin {
    static sortable = true;
    static id = "ts";
    static megatype = "ts";

    static get label() {
        return l[19506];
    }

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        let timestamp = node.rts || node.ts;
        if (timestamp) {
            timestamp = time2last(timestamp);
        }
        else {
            // can be empty if request deleted
            timestamp = node.dts ? l[6112] : "";
        }
        return <td>
            <div className="contact-item">
                <div className="contact-item-time">
                    {timestamp}
                </div>
            </div>
            <div className="clear"/>
        </td>;
    }
}
