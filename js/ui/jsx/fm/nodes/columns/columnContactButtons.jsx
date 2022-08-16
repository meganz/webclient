import {Button} from "../../../../buttons.jsx";
import {Dropdown} from "../../../../dropdowns.jsx";
import ContextMenu from "../../../../../chat/ui/contactsPanel/contextMenu.jsx";
import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";
import { inProgressAlert } from '../../../../../chat/ui/meetings/call';

export class ColumnContactButtons extends GenericNodePropsComponent {
    static sortable = true;
    static id = "grid-url-header-nw";
    static label = "";
    static megatype = "grid-url-header-nw";

    render() {
        const { nodeAdapter } = this.props;
        const { node, selected } = nodeAdapter.props;
        const handle = node.h;

        return <td megatype={ColumnContactButtons.megatype} className={ColumnContactButtons.megatype}>
            <div className="contact-item">
                <div className="contact-item-controls">
                    <Button
                        className="mega-button action simpletip"
                        icon="sprite-fm-mono icon-phone"
                        attrs={{
                            'data-simpletip': !megaChat.hasSupportForCalls ?
                                l.unsupported_browser_audio : l[5896]
                            /* `Your browser doesn't support audio calls. Please try a different one!`
                            : `Start Audio Call` */ }}
                        disabled={!navigator.onLine || !megaChat.hasSupportForCalls}
                        onClick={() =>
                            inProgressAlert()
                                .then(() =>
                                    megaChat.createAndShowPrivateRoom(handle)
                                        .then(room => {
                                            room.setActive();
                                            room.startAudioCall();
                                        })
                                )
                                .catch(() => d && console.warn('Already in a call.'))

                        }
                    />
                    <Button
                        className="mega-button action simpletip"
                        icon="sprite-fm-mono icon-video-call-filled"
                        attrs={{
                            'data-simpletip': !megaChat.hasSupportForCalls ?
                                l.unsupported_browser_video : l[5897]
                                /* `Your browser doesn't support video calls. Please try a different one!`
                                : `Start Video Call` */ }}
                        disabled={!navigator.onLine || !megaChat.hasSupportForCalls}
                        onClick={() =>
                            inProgressAlert()
                                .then(() =>
                                    megaChat.createAndShowPrivateRoom(handle)
                                        .then(room => {
                                            room.setActive();
                                            room.startVideoCall();
                                        })
                                )
                                .catch(() => d && console.warn('Already in a call.'))

                        }
                    />
                    <Button
                        className="mega-button action simpletip"
                        icon="sprite-fm-mono icon-chat"
                        attrs={{ 'data-simpletip': l[8632] }}
                        onClick={() => loadSubPage('fm/chat/p/' + handle)}
                    />
                    <Button
                        className="mega-button action simpletip"
                        icon="sprite-fm-mono icon-folder-outgoing-share"
                        attrs={{ 'data-simpletip': l[5631] }}
                        onClick={() => openCopyShareDialog(handle)}
                    />
                    <Button
                        ref={node => {
                            this.props.onContextMenuRef(handle, node);
                        }}
                        className="mega-button action contact-more"
                        icon="sprite-fm-mono icon-options">
                        <Dropdown
                            className="context"
                            noArrow={true}
                            positionMy="left bottom"
                            positionAt="right bottom"
                            positionLeft={this.props.contextMenuPosition || null}
                            horizOffset={4}
                            onActiveChange={opened => {
                                this.props.onActiveChange(opened);
                            }}>
                            <ContextMenu
                                contact={node}
                                selected={selected}
                                withProfile={true}
                            />
                        </Dropdown>
                    </Button>
                </div>
            </div>
        </td>;
    }
}
