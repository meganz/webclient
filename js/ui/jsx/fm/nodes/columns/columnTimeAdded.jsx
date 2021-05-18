import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnTimeAdded extends GenericNodePropsComponent {
    static sortable = true;
    static id = "ts";
    static label = l[16169];
    static megatype = "timeAd";

    render() {
        let {nodeAdapter} = this.props;

        return <td megatype={ColumnTimeAdded.megatype} className="time ad">{nodeAdapter.nodeProps.timestamp}</td>;
    }
}
