import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';

export default class Attachment extends AbstractGenericMessage {
    constructor(props) {
        super(props);
    }

    _isRevoked = node => !M.chd[node.ch] || node.revoked;

    _isUserRegistered() {
        return typeof u_type !== 'undefined' && u_type > 2;
    }

    getContents() {
        const { message, chatRoom } = this.props;
        const contact = this.getContact();
        let NODE_DOESNT_EXISTS_ANYMORE = {};

        let attachmentMeta;
        attachmentMeta = message.getAttachmentMeta() || [];

        let files = [];

        for (let i = 0; i < attachmentMeta.length; i++) {
            let v = attachmentMeta[i];

            if (this._isRevoked(v)) {
                // don't show revoked files
                continue;
            }

            // generate preview/icon
            const { icon, isImage, isVideo, isAudio, isText, showThumbnail, isPreviewable }
                = M.getMediaProperties(v);

            var dropdown = null;
            var noThumbPrev = '';
            var previewButton = null;

            if (isPreviewable) {
                if (!showThumbnail) {
                    noThumbPrev = 'no-thumb-prev';
                }
                // `Play Audio` || `Play Video` || `Preview`
                var previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
                var previewIcon = isAudio ? 'context play' : isVideo ? 'context videocam' : 'search-icon';
                // eslint-disable-next-line max-depth
                if (isText) {
                    // `View`
                    previewLabel = l[16797];
                    // TODO: Replace with "preview-file" icon?
                    //  will keep this one for now for consistency with FM.
                    previewIcon = "context-sprite edit-file";
                }
                previewButton =
                    <span key="previewButton">
                        <DropdownItem
                            label={previewLabel}
                            icon={previewIcon}
                            onClick={e => this.props.onPreviewStart(v, e)}
                        />
                    </span>;
            }

            if (contact.u === u_handle) {
                dropdown = <Button
                    className="default-white-button tiny-button"
                    icon="tiny-icon icons-sprite grey-dots">
                    <Dropdown
                        ref={(refObj) => {
                            this.dropdown = refObj;
                        }}
                        className="white-context-menu attachments-dropdown"
                        noArrow={true}
                        positionMy="left top"
                        positionAt="left bottom"
                        horizOffset={-4}
                        vertOffset={3}
                        onBeforeActiveChange={(newState) => {
                            if (newState === true) {
                                this.forceUpdate();
                            }
                        }}
                        dropdownItemGenerator={dd => {
                            var linkButtons = [];
                            var firstGroupOfButtons = [];
                            var revokeButton = null;
                            var downloadButton = null;

                            if (message.isEditable && message.isEditable()) {
                                revokeButton = (
                                    <DropdownItem
                                        icon="red-cross"
                                        label={l[83] /* `Remove` */}
                                        className="red"
                                        onClick={() => {
                                            chatRoom.megaChat.plugins.chatdIntegration.updateMessage(
                                                chatRoom, message.internalId || message.orderValue, ""
                                            );
                                        }}
                                    />
                                );
                            }

                            if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                dbfetch.get(v.h)
                                    .always(function() {
                                        if (!M.d[v.h]) {
                                            NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                                            dd.doRerender();
                                        }
                                        else {
                                            dd.doRerender();
                                        }
                                    });
                                return <span>{l[5533] /* `Loading...` */}</span>;
                            }
                            else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                downloadButton = <DropdownItem
                                    icon="rounded-grey-down-arrow"
                                    label={l[1187] /* `Download` */}
                                    onClick={() => this.props.onDownloadStart(v)} />;

                                if (M.getNodeRoot(v.h) !== M.RubbishID) {
                                    this.props.onAddLinkButtons(v.h, linkButtons);
                                }

                                firstGroupOfButtons.push(
                                    <DropdownItem
                                        icon="context info"
                                        label={l[6859] /* `Info` */}
                                        key="infoDialog"
                                        onClick={() => {
                                            $.selected = [v.h];
                                            propertiesDialog();
                                        }}
                                    />
                                );

                                this.props.onAddFavouriteButtons(v.h, firstGroupOfButtons);

                                linkButtons.push(
                                    <DropdownItem
                                        icon="small-icon conversations"
                                        label={l[17764] /* `Send to chat` */}
                                        key="sendToChat"
                                        onClick={() => {
                                            $.selected = [v.h];
                                            openCopyDialog('conversations');
                                        }}
                                    />
                                );

                            }

                            if (
                                !previewButton &&
                                firstGroupOfButtons.length === 0 &&
                                !downloadButton &&
                                linkButtons.length === 0 &&
                                !revokeButton
                            ) {
                                return null;
                            }

                            if (
                                previewButton && (
                                    firstGroupOfButtons.length > 0 ||
                                    downloadButton ||
                                    linkButtons.length > 0 ||
                                    revokeButton
                                )
                            ) {
                                previewButton = [previewButton, <hr key="preview-sep"/>];
                            }


                            return <div>
                                {previewButton}
                                {firstGroupOfButtons}
                                {firstGroupOfButtons && firstGroupOfButtons.length > 0 ? <hr/> : ""}
                                {downloadButton}
                                {linkButtons}
                                {revokeButton && downloadButton ? <hr/> : ""}
                                {revokeButton}
                            </div>;
                        }}/>
                </Button>;
            }
            else {
                dropdown = <Button
                    className="default-white-button tiny-button"
                    icon="tiny-icon icons-sprite grey-dots">
                    <Dropdown
                        className="white-context-menu attachments-dropdown"
                        noArrow={true}
                        positionMy="left top"
                        positionAt="left bottom"
                        horizOffset={-4}
                        vertOffset={3}
                    >
                        {previewButton}
                        {previewButton && <hr/>}
                        <DropdownItem
                            icon="rounded-grey-down-arrow"
                            label={l[1187] /* `Download` */}
                            onClick={() => this.props.onDownloadStart(v)}
                        />
                        {this._isUserRegistered() &&
                            <>
                                <DropdownItem
                                    icon="grey-cloud"
                                    label={l[1988] /* `Save file` */}
                                    onClick={() => this.props.onAddToCloudDrive(v, false)}
                                />
                                <DropdownItem
                                    icon="conversations"
                                    label={l[17764] /* `Send to chat` */}
                                    onClick={() => this.props.onAddToCloudDrive(v, true)}
                                />
                            </>
                        }
                    </Dropdown>
                </Button>;
            }


            var attachmentClasses = "message shared-data";
            var preview =
                <div
                    className={"data-block-view medium " + noThumbPrev}
                    onClick={({ target, currentTarget }) => {
                        if (isPreviewable && target === currentTarget) {
                            this.props.onPreviewStart(v);
                        }
                    }}>
                    {dropdown}
                    <div className="data-block-bg">
                        <div className={"block-view-file-type " + icon} />
                    </div>
                </div>;

            if (showThumbnail) {
                var src = v.src || window.noThumbURI || '';
                var thumbClass = v.src ? '' : " no-thumb";
                var thumbOverlay = null;

                if (isImage) {
                    thumbClass += " image";
                    thumbOverlay = <div className="thumb-overlay" onClick={() => this.props.onPreviewStart(v)} />;
                }
                else {
                    thumbClass = thumbClass + " video " + (
                        isPreviewable ? " previewable" : "non-previewable"
                    );
                    thumbOverlay =
                        <div
                            className="thumb-overlay"
                            onClick={() => isPreviewable && this.props.onPreviewStart(v)}>
                            {isPreviewable && <div className="play-video-button"/>}
                            <div className="video-thumb-details">
                                {v.playtime && <i className="small-icon small-play-icon"/>}
                                <span>{secondsToTimeShort(v.playtime || -1)}</span>
                            </div>
                        </div>;
                }

                preview =
                    src ?
                        <div id={v.ch} className={`shared-link thumb ${thumbClass}`}>
                            {thumbOverlay}
                            {dropdown}
                            <img
                                alt=""
                                className={"thumbnail-placeholder " + v.h}
                                src={src} key={'thumb-' + v.ch}
                                onClick={() => isPreviewable && this.props.onPreviewStart(v)} />
                        </div> :
                        preview;
            }

            files.push(
                <div className={attachmentClasses} key={'atch-' + v.ch}>
                    <div className="message shared-info">
                        <div className="message data-title">
                            {l[17669] /* `Uploaded this file:` */}
                            <span className="file-name">{v.name}</span>
                        </div>
                        <div className="message file-size">
                            {bytesToSize(v.s)}
                        </div>
                    </div>
                    {preview}
                    <div className="clear" />
                </div>
            );
        }

        return (
            <>
                <div className="message shared-block">
                    {files}
                </div>
            </>
        );
    }
}
