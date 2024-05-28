import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';

export default class Attachment extends AbstractGenericMessage {

    _isRevoked(node) {
        return !M.chd[node.ch] || node.revoked;
    }

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
                var previewIcon = isAudio ? 'icon-play' : isVideo ? 'icon-video-call-filled' : 'icon-preview-reveal';
                // eslint-disable-next-line max-depth
                if (isText) {
                    // `View`
                    previewLabel = l[16797];
                    // TODO: Replace with "preview-file" icon?
                    //  will keep this one for now for consistency with FM.
                    previewIcon = "icon-file-edit";
                }
                previewButton =
                    <span key="previewButton">
                        <DropdownItem
                            label={previewLabel}
                            icon={`sprite-fm-mono ${previewIcon}`}
                            disabled={mega.paywall}
                            onClick={(e) => {
                                // Close node Info panel as not applicable after doing Preview
                                mega.ui.mInfoPanel.closeIfOpen();

                                this.props.onPreviewStart(v, e);
                            }}
                        />
                    </span>;
            }

            if (contact.u === u_handle) {
                dropdown = <Button
                    className="tiny-button"
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
                                        icon="sprite-fm-mono icon-dialog-close"
                                        label={l[83] /* `Remove` */}
                                        onClick={() => {
                                            chatRoom.megaChat.plugins.chatdIntegration.updateMessage(
                                                chatRoom, message.internalId || message.orderValue, ""
                                            );
                                        }}
                                    />
                                );
                            }

                            if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                dbfetch.acquire(v.h)
                                    .always(() => {
                                        if (!M.d[v.h]) {
                                            NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                                            dd.doRerender();
                                        }
                                        else {
                                            dd.doRerender();
                                        }
                                    });
                                return <span className="loading">{l[5533] /* `Loading...` */}</span>;
                            }
                            else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
                                downloadButton = <DropdownItem
                                    icon="sprite-fm-mono icon-download-small"
                                    label={l[1187] /* `Download` */}
                                    disabled={mega.paywall}
                                    onClick={() => this.props.onDownloadStart(v)}/>;

                                if (M.getNodeRoot(v.h) !== M.RubbishID) {
                                    this.props.onAddLinkButtons(v.h, linkButtons);
                                }

                                firstGroupOfButtons.push(
                                    <DropdownItem
                                        icon="sprite-fm-mono icon-info"
                                        label={l[6859] /* `Info` */}
                                        key="infoDialog"
                                        onClick={() => {
                                            $.selected = [v.h];
                                            mega.ui.mInfoPanel.initInfoPanel();
                                        }}
                                    />
                                );

                                this.props.onAddFavouriteButtons(v.h, firstGroupOfButtons);

                                linkButtons.push(
                                    <DropdownItem
                                        icon="sprite-fm-mono icon-send-to-chat"
                                        label={l[17764] /* `Send to chat` */}
                                        key="sendToChat"
                                        disabled={mega.paywall}
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
                    className="tiny-button"
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
                            icon="sprite-fm-mono icon-download-small"
                            label={l[1187] /* `Download` */}
                            disabled={mega.paywall}
                            onClick={() => this.props.onDownloadStart(v)}
                        />
                        {!is_chatlink && this._isUserRegistered() &&
                            <>
                                <DropdownItem
                                    icon="sprite-fm-mono icon-cloud"
                                    label={l[1988] /* `Save file` */}
                                    disabled={mega.paywall}
                                    onClick={() => this.props.onAddToCloudDrive(v, false)}
                                />
                                <DropdownItem
                                    icon="sprite-fm-mono icon-send-to-chat"
                                    label={l[17764] /* `Send to chat` */}
                                    disabled={mega.paywall}
                                    onClick={() => this.props.onAddToCloudDrive(v, true)}
                                />
                            </>
                        }
                    </Dropdown>
                </Button>;
            }

            if (M.getNodeShare(v.h).down) {
                dropdown = null;
            }

            var attachmentClasses = "message shared-data";
            var preview =
                <div
                    className={"data-block-view medium " + noThumbPrev}
                    onClick={({target}) => {
                        if (isPreviewable && !target.classList.contains('tiny-button')) {

                            // Close node Info panel as not applicable after doing Preview
                            mega.ui.mInfoPanel.closeIfOpen();

                            this.props.onPreviewStart(v);
                        }
                    }}>
                    {dropdown}
                    <div className="data-block-bg">
                        <div className={"item-type-icon-90 icon-" + icon + "-90"} />
                    </div>
                </div>;

            if (showThumbnail) {
                var src = v.src || window.noThumbURI || '';
                var thumbClass = v.src ? '' : " no-thumb";
                var thumbOverlay = null;

                if (isImage) {
                    thumbClass += " image";
                    thumbOverlay = <div className="thumb-overlay" onClick={() => {
                        // Close node Info panel as it's not applicable when clicking to open Preview
                        mega.ui.mInfoPanel.closeIfOpen();

                        this.props.onPreviewStart(v);
                    }} />;
                }
                else {
                    thumbClass = thumbClass + " video " + (
                        isPreviewable ? " previewable" : "non-previewable"
                    );
                    thumbOverlay =
                        <div
                            className="thumb-overlay"
                            onClick={() => {
                                if (isPreviewable) {

                                    // Close node Info panel as it's not applicable when clicking to open Preview
                                    mega.ui.mInfoPanel.closeIfOpen();

                                    this.props.onPreviewStart(v);
                                }
                            }}>
                            {isPreviewable && (
                                <div className="thumb-overlay-play">
                                    <div className="thumb-overlay-circle">
                                        <i className="sprite-fm-mono icon-play" />
                                    </div>
                                </div>
                            )}
                            <div className="video-thumb-details">
                                {v.playtime && <i className="sprite-fm-mono icon-play"/>}
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
                        <div className="message data-title selectable-txt">
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
