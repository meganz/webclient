import React from 'react';
import {MegaRenderMixin} from "../../../chat/mixins";

export default class ViewModeSelector extends MegaRenderMixin {
    static VIEW_MODE = {
        "GRID": 1,
        "LIST": undefined
    };

    render() {
        let viewMode = this.props.viewMode;

        return <div className="chat-fm-view-mode-selector">
            <i className={"sprite-fm-mono icon-view-medium-list" + (viewMode ? "" : " active")}
                title={l[5553]}
                onClick={() => {
                    if (this.props.onChange) {
                        this.props.onChange(ViewModeSelector.VIEW_MODE.LIST);
                    }
                }}>
            </i>
            <i className={"sprite-fm-mono icon-view-grid" + (viewMode ? " active" : "")}
                title={l[5552]}
                onClick={() => {
                    if (this.props.onChange) {
                        this.props.onChange(ViewModeSelector.VIEW_MODE.GRID);
                    }
                }}>
            </i>
        </div>;
    }
}
