import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSize extends GenericNodePropsComponent {
    static sortable = true;
    static id = "size";
    static label = l[87];
    static megatype = "size";

    render() {
        let {nodeAdapter} = this.props;

        return <td megatype={ColumnSize.megatype} className="size">
            {!nodeAdapter.nodeProps.isFolder ? nodeAdapter.nodeProps.size : ""}
        </td>;
    }
}
