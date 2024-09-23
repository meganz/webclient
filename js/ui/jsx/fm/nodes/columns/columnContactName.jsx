import React from "react";
import {Avatar} from "../../../../../chat/ui/contacts.jsx";
import { OFlowEmoji, withOverflowObserver } from '../../../../utils';
import { GenericNodePropsComponent } from "../genericNodePropsComponent";

export class ColumnContactName extends GenericNodePropsComponent {
    static sortable = true;
    static id = "name";
    static megatype = "name";

    static get label() {
        return l[86];
    }

    Mail = withOverflowObserver(() =>
        <span className="contact-item-email">{this.props.nodeAdapter.props.node.m}</span>
    );

    render() {
        const { nodeAdapter } = this.props;
        const { node } = nodeAdapter.props;

        return (
            <td>
                <Avatar contact={node} className="avatar-wrapper box-avatar"/>
                <div className="contact-item">
                    <div className="contact-item-user">
                        <OFlowEmoji>{nodeAdapter.nodeProps.title}</OFlowEmoji>
                    </div>
                    <this.Mail />
                </div>
                <div className="clear" />
            </td>
        );
    }
}
