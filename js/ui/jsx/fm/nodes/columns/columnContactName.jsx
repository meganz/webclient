import {Avatar} from "../../../../../chat/ui/contacts.jsx";
import React from "react";
import { Emoji } from '../../../../../ui/utils.jsx';
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnContactName extends GenericNodePropsComponent {
    static sortable = true;
    static id = "name";
    static label = l[86];
    static megatype = "name";

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;
        return <td>
            <Avatar contact={node} className="avatar-wrapper box-avatar"/>
            <div className="contact-item">
                <div className="contact-item-user">
                    <Emoji>{nodeAdapter.nodeProps.title}</Emoji>
                </div>
                <div className="contact-item-email">{node.m}</div>
            </div>
            <div className="clear"></div>
        </td>;
    }
}
