import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnTimeAdded extends GenericNodePropsComponent {
    static sortable = true;
    static id = "ts";
    static megatype = "timeAd";

    static get label() {
        return l[16169];
    }

    render() {
        let {nodeAdapter} = this.props;

        return <td megatype={ColumnTimeAdded.megatype} className="time ad">{nodeAdapter.nodeProps.timestamp}</td>;
    }
}
