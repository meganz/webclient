import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnContactStatus extends GenericNodePropsComponent {
    static sortable = true;
    static id = "status";
    static megatype = "status";

    static get label() {
        return l[89];
    }

    render() {
        let {nodeAdapter} = this.props;

        let onlineStatus = nodeAdapter.nodeProps.onlineStatus;

        return <td megatype={ColumnContactStatus.megatype} className={ColumnContactStatus.megatype}>
            <div className="contact-item">
                <div className="contact-item-status">
                    <div className={"user-card-presence " + onlineStatus[1]}></div>
                    {onlineStatus[0]}
                </div>
            </div>
        </td>;
    }
}
