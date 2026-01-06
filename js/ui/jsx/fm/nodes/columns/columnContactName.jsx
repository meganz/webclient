import React from "react";
import {Avatar} from "../../../../../chat/ui/contacts.jsx";
import {OFlowEmoji, ParsedHTML, withOverflowObserver} from '../../../../utils';
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

    /**
     * Getter for contact name
     * @return {string} - Contact name
     */
    get name() {
        const { nodeAdapter, node } = this.props;
        if (nodeAdapter.nodeProps) {
            return nodeAdapter.nodeProps.title;
        }

        return M.getNameByEmail(node.m);
    }

    _renderAvatar() {
        const { nodeAdapter } = this.props;
        const { node } = nodeAdapter.props;

        if (nodeAdapter.nodeProps || node.name !== '') {
            return <Avatar contact={node} className="avatar-wrapper box-avatar"/>;
        }
        else if (node.name === '') {
            return <ParsedHTML>{useravatar.contact(node.m, 'box-avatar')}</ParsedHTML>;
        }

        return null;
    }

    render() {
        return (
            <td>
                {this._renderAvatar()}
                <div className="contact-item">
                    <div className="contact-item-user">
                        <OFlowEmoji>{this.name}</OFlowEmoji>
                    </div>
                    <this.Mail />
                </div>
                <div className="clear" />
            </td>
        );
    }
}
