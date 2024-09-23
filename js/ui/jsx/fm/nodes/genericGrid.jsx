import React from 'react';
import {GenericNodePropsComponent} from "./genericNodePropsComponent";

export default class GenericGrid extends GenericNodePropsComponent {
    render() {
        let {node, calculated, index, listAdapter, className, keyProp} = this.props;

        // React uses .hasOwnProperty so Object.create(null) won't work in this case.
        let style = {};
        listAdapter.repositionItem(node, calculated, index, style);

        let image = null;
        let src = null;
        let isThumbClass = "";
        if (node.fa && (is_image2(node) || is_video(node))) {
            src = thumbnails.get(node.fa);
            if (!src) {
                this.props.requestThumbnailCb(node);
                src = window.noThumbURI || '';
            }

            image = src ? <img alt="" src={src} /> : <img alt="" />;
            isThumbClass = " thumb";
        }
        else {
            image = <img />;
        }

        let fileStatusClass = "";
        if (node.fav) {
            fileStatusClass += " icon-favourite-filled";
        }

        return <a
            className={"data-block-view megaListItem ui-droppable ui-draggable ui-draggable-handle " +
                this.nodeProps.classNames.join(" ") +
                (className && className(node) || "")
            }
            id={"chat_" + node[keyProp]}
            onClick={(e) => {
                this.props.onClick(e, this.props.node);
            }}
            onDoubleClick={(e) => {
                this.props.onDoubleClick(e, this.props.node);
            }}
            title={this.nodeProps.title} style={style}>
            <span className={"data-block-bg " + isThumbClass}>
                <span className="data-block-indicators">
                    <span className={"file-status-icon indicator sprite-fm-mono" + fileStatusClass}></span>
                    <span className="versioning-indicator">
                        <i className="sprite-fm-mono icon-versions-previous"></i>
                    </span>
                    <i className="sprite-fm-mono icon-link"></i>
                </span>
                <span className={"item-type-icon-90 icon-" + this.nodeProps.icon + "-90"}>{image}</span>
                <div className="video-thumb-details">
                    <i className="small-icon small-play-icon"></i>
                    <span>00:00</span>
                </div>
            </span>
            <span className="file-block-title">{this.nodeProps.title}</span>
        </a>;
    }
}
