import React from "react";
import {MegaRenderMixin} from "../../../chat/mixins";

class GenericListAdapter extends MegaRenderMixin {
    customIsEventuallyVisible = true;
}

export class Grid extends GenericListAdapter {
    static itemWidth = 192 + 4 + 4 + 12 /* 12 = margin-left */;
    static itemHeight = 192 + 4 + 4 + 12 /* 12 = margin-top */;
    static containerClassName = "file-block-scrolling megaListContainer";

    static repositionItem(node, calculated, index, style) {
        style.position = "absolute";
        style.top = calculated.itemHeight * Math.floor(index / calculated.itemsPerRow);
        if (calculated.itemsPerRow > 1) {
            style.left = index % calculated.itemsPerRow * calculated.itemWidth;
        }
    }

    render() {
        return <div className="megaList-content" ref={this.props.listContentRef} style={{
            'position': 'relative'
        }}>
            {this.props.children}
        </div>;
    }
}

export class Table extends GenericListAdapter {
    static itemHeight = 32;
    static itemsPerRow = 1;
    static containerClassName = "grid-scrolling-table megaListContainer";

    onContentUpdated() {
        let {calculated} = this.props;

        let pusherHeight = calculated.visibleFirstItemNum * calculated.itemHeight | 0;

        if (this.topPusher) {
            this.topPusher.style.height = pusherHeight + "px";
        }
        if (this.bottomPusher) {
            this.bottomPusher.style.height = (
                (
                    calculated.contentHeight - pusherHeight - (
                        calculated.visibleLastItemNum - calculated.visibleFirstItemNum
                    ) * calculated.itemHeight
                ) | 0
            ) + "px";
        }
    }

    componentDidUpdate() {
        super.componentDidUpdate();
        this.onContentUpdated();
    }

    render() {
        return <table width="100%"
            className={this.props.containerClassName || "grid-table table-hover fm-dialog-table"}>
            <tbody ref={this.props.listContentRef}>
                <tr className="megalist-pusher top"
                    ref={(r) => {
                        this.topPusher = r;
                    }}></tr>
                {this.props.children}
                <tr className="megalist-pusher bottom"
                    ref={(r) => {
                        this.bottomPusher = r;
                    }}></tr>
            </tbody>
        </table>;
    }
}
