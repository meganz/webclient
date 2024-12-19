import {Button} from "../../../../buttons.jsx";
import React from "react";
import {MegaRenderMixin} from "../../../../../chat/mixins";

export class ColumnContactRequestsRcvdBtns extends MegaRenderMixin {
    domRef = React.createRef();

    static sortable = true;
    static id = "grid-url-header-nw";
    static label = "";
    static megatype = "grid-url-header-nw contact-controls-container";

    render() {
        const { nodeAdapter } = this.props;
        const { node } = nodeAdapter.props;

        return (
            <td
                ref={this.domRef}
                megatype={ColumnContactRequestsRcvdBtns.megatype}
                className={ColumnContactRequestsRcvdBtns.megatype}>
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
            </td>
        );
    }
}
