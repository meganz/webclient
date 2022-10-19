import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnFavIcon extends GenericNodePropsComponent {
    static sortable = true;
    static id = "fav";
    static label = "";
    static icon = "icon-favourite-filled";
    static megatype = "fav";
    static headerClassName = "grid-first-th fav";

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        let isFavouritable = node.r === 2;

        return <td megatype={ColumnFavIcon.megatype} className={ColumnFavIcon.megatype}>
            <span className={
                "grid-status-icon sprite-fm-mono " +
                (nodeAdapter.nodeProps.fav ? " icon-favourite-filled" : " icon-dot") + (
                    !isFavouritable && " disabled" || ""
                )
            } onClick={() => {
                if (isFavouritable) {
                    M.favourite([node.h], !node.fav);
                }
            }}></span>
        </td>;
    }
}
