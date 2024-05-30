import React from "react";
import {MegaRenderMixin} from "../../../../../chat/mixins";
import { ParsedHTML } from '../../../../utils';

export class ColumnContactRequestsEmail extends MegaRenderMixin {
    static sortable = true;
    static id = "email";
    static megatype = "email";

    static get label() {
        return l[95];
    }

    render() {
        const {nodeAdapter, currView} = this.props;
        let {node} = nodeAdapter.props;

        return <td>
            {currView && currView === 'opc' ?
                <span>
                    <i className="sprite-fm-uni icon-send-requests">
                    </i>
                </span>
                :
                <ParsedHTML>{useravatar.contact(node.m, 'box-avatar')}</ParsedHTML>
            }
            <div className="contact-item">
                <div className="contact-item-user">{node.m}</div>
            </div>
            <div className="clear"/>
        </td>;
    }
}
