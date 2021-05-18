import React from "react";
import {ColumnContactRequestsTs} from "./columnContactRequestsTs";

export class ColumnContactRequestsRts extends ColumnContactRequestsTs {
    static sortable = true;
    static id = "rts";
    static label = l[19506];
    static megatype = "rts";
}
