import {Button} from "../../../../buttons.jsx";
import React from "react";
import {MegaRenderMixin} from "../../../../../stores/mixins";

export class ColumnContactRequestsRcvdBtns extends MegaRenderMixin {
    static sortable = true;
    static id = "grid-url-header-nw";
    static label = "";
    static megatype = "grid-url-header-nw";

    reinviteAllowed = rts => {
        const TIME_FRAME = 60 * 60 * 24 * 14; // 14 days in seconds
        const UTC_DATE_NOW = Math.floor(Date.now() / 1000);
        return UTC_DATE_NOW > rts + TIME_FRAME;
    };

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        return <td megatype={ColumnContactRequestsRcvdBtns.megatype} className={ColumnContactRequestsRcvdBtns.megatype}>
            <div className="contact-item-controls">
                <Button
                    className="mega-button action contact-reject"
                    icon="sprite-fm-mono icon-close-component"
                    label={l[20981]}
                    onClick={() => this.props.onReject(node.p)}
                />
                <Button
                    className="mega-button action contact-block"
                    icon="sprite-fm-mono icon-disable"
                    label={l[20980]}
                    onClick={() => this.props.onBlock(node.p)}
                />
                <Button
                    className="mega-button action contact-accept"
                    icon="sprite-fm-mono icon-check"
                    label={l[5856]}
                    onClick={() => this.props.onAccept(node.p)}
                />
            </div>
        </td>;
    }
}
