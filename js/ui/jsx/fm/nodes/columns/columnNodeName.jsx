import React from 'react';
import Tooltips from '../../../../tooltips.jsx';
import { GenericNodePropsComponent } from '../genericNodePropsComponent';

export class ColumnNodeName extends GenericNodePropsComponent {
    static sortable = true;
    static id = 'name';
    static label = l[86] /* `Name` */;
    static megatype = 'fname';

    state = {
        src: null
    };

    setAttributes = () => {
        const { node } = this.props;
        node.imgId = `preview_${node.h}`;
        node.seen = node.seen || 1;
    };

    componentDidMount() {
        super.componentDidMount();
        this.setAttributes();
    }

    render() {
        const { nodeAdapter } = this.props;
        const { src } = this.state;
        const { node, requestThumbnailCb } = nodeAdapter.props;

        return (
            <td megatype={ColumnNodeName.megatype}>
                {is_image(node) || is_video(node) ?
                    <Tooltips.Tooltip
                        withArrow={true}
                        className="tooltip-handler-container"
                        onShown={() => {
                            if (!src) {
                                requestThumbnailCb(node, true, handle => this.setState({ src: thumbnails[handle] }));
                            }
                        }}>
                        <Tooltips.Handler className={`transfer-filetype-icon ${fileIcon(node)}`}/>
                        <Tooltips.Contents className="img-preview">
                            <div
                                className="dropdown img-wrapper img-block"
                                id={`preview_${node.h}`}>
                                <img
                                    alt=""
                                    className={`thumbnail-placeholder ${node.h}`}
                                    src={
                                        node.fa ?
                                            // Render the downloaded node thumbnail or loading an indication during
                                            // the actual download; see `requestThumbnailCb`, `fm_thumbnails`
                                            src || `${staticpath}/images/mega/ajax-loader-tiny.gif` :
                                            // Node has no thumbnail, render placeholder
                                            window.noThumbURI
                                    }
                                />
                            </div>
                        </Tooltips.Contents>
                    </Tooltips.Tooltip> :
                    <span
                        className={`
                            transfer-filetype-icon
                            ${nodeAdapter.nodeProps.isFolder ? 'folder' : ''}
                            ${nodeAdapter.nodeProps.icon}
                            ${node.su ? 'inbound-share' : ''}
                        `}
                    />}
                <span className={"tranfer-filetype-txt"}>{nodeAdapter.nodeProps.title}</span>
            </td>
        );
    }
}
