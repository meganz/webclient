import React from 'react';
import Tooltips from '../../../../tooltips.jsx';
import {Avatar} from '../../../../../chat/ui/contacts.jsx';
import { GenericNodePropsComponent } from '../genericNodePropsComponent';

export class ColumnNodeName extends GenericNodePropsComponent {
    static sortable = true;
    static id = 'name';
    static megatype = 'fname';

    static get label() {
        // Name
        return l[86];
    }

    state = {
        src: null
    };

    componentDidMount() {
        super.componentDidMount();
    }

    /**
     * Optional owner block for incoming shared folders (enabled via the `showOwner`)
     * @returns {React.Element|null} Avatar + owner name/email, or null
     */
    _renderOwner() {
        const {showOwner, nodeAdapter} = this.props;
        const {node} = nodeAdapter.props;

        // Only for incoming shares
        if (!showOwner || !node.su) {
            return null;
        }

        const owner = M.getUserByHandle(node.su);
        if (!owner) {
            return null;
        }

        return (
            <span
                className="node-owner simpletip"
                data-simpletip={owner.m}
                data-simpletipposition="top">
                <Avatar contact={owner.h} className="avatar-wrapper" />
                <span className="node-owner-name">{owner.name || owner.m}</span>
            </span>
        );
    }

    render() {
        const {showOwner, nodeAdapter} = this.props;
        const {node, requestThumbnailCb} = nodeAdapter.props;
        const src = this.state.src || thumbnails.get(node.fa);

        return (
            <td megatype={ColumnNodeName.megatype}>
                <div className={showOwner ? 'owner-wrap' : ''}>
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
                    {this._renderOwner()}
                </div>
            </td>
        );
    }
}
