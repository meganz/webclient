import React from "react";
import {ColumnContactRequestsTs} from "./columnContactRequestsTs";

export class ColumnContactRequestsRts extends ColumnContactRequestsTs {
    static sortable = true;
    static id = "rts";
    static megatype = "rts";

    static get label() {
        return l[19506];
    }
}
