import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnExtras extends GenericNodePropsComponent {
    static sortable = false;
    static id = "extras";
    static label = "";
    static megatype = "extras";
    static headerClassName = "grid-url-header";

    render() {
        return <td megatype={ColumnExtras.megatype} className="grid-url-field own-data extras-column">
            <span className="versioning-indicator">
                <i className="sprite-fm-mono icon-versions-previous"></i>
            </span>
            <i className="sprite-fm-mono icon-link"></i>
        </td>;
    }
}
