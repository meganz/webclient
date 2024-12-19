import React from "react";
import {MegaRenderMixin} from "../../../../../chat/mixins";

export class ColumnContactRequestsTs extends MegaRenderMixin {
    domRef = React.createRef();

    static sortable = true;
    static id = "ts";
    static megatype = "ts";

    static get label() {
        return l[19506];
    }

    render() {
        const { nodeAdapter } = this.props;
        const { node } = nodeAdapter.props;

        let timestamp = node.rts || node.ts;
        if (timestamp) {
            timestamp = time2last(timestamp);
        }
        else {
            // can be empty if request deleted
            timestamp = node.dts ? l[6112] : "";
        }
        return (
            <td ref={this.domRef}>
                <div className="contact-item">
                    <div className="contact-item-time">
                        {timestamp}
                    </div>
                </div>
                <div className="clear"/>
            </td>
        );
    }
}
