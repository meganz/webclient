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

    componentDidMount() {
        super.componentDidMount();
    }

    render() {
        const { nodeAdapter } = this.props;
        const { node, requestThumbnailCb } = nodeAdapter.props;
        const src = this.state.src || thumbnails.get(node.fa);

        return (
            <td megatype={ColumnNodeName.megatype}>
                {src || is_image2(node) || is_video(node) ?
                    <Tooltips.Tooltip
                        withArrow={true}
                        className="tooltip-handler-container"
                        onShown={() => {
                            if (!src) {
                                requestThumbnailCb(node, true, (n, src) => {
                                    this.setState({src});
                                    return `preview_${n.h}`;
                                });
                            }
                        }}>
                        <Tooltips.Handler className={`item-type-icon icon-${fileIcon(node)}-24`}/>
                        <Tooltips.Contents className="img-preview">
                            <div
                                className="dropdown img-wrapper img-block"
                                id={`preview_${node.h}`}>
                                <img
                                    alt=""
                                    className={`thumbnail-placeholder ${node.h}`}
                                    src={
                                        node.fa || src ?
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
                            item-type-icon icon-${fileIcon(node)}-24
                        `}
                    />}
                <span className={"tranfer-filetype-txt"}>{nodeAdapter.nodeProps.title}</span>
            </td>
        );
    }
}
