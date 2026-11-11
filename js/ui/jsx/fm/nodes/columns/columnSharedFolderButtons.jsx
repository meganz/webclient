import {Button} from "../../../../buttons.jsx";
import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnSharedFolderButtons extends GenericNodePropsComponent {
    static sortable = true;
    static id = "grid-url-header-nw";
    static label = "";
    static megatype = "grid-url-header-nw";

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;
        let handle = node.h;

        return <td megatype={ColumnSharedFolderButtons.megatype} className={ColumnSharedFolderButtons.megatype}>
            <div className="contact-item">
                <div className="contact-item-controls">
                    <Button
                        className="mega-button action contact-more"
                        icon="sprite-fm-mono icon-options"
                        onClick={(button, e) => {
                            e.preventDefault();
                            e.stopPropagation(); // do not treat it as a regular click on the file

                            const td = button.domRef.current.closest('td');

                            if (td.classList.contains('active')) {
                                $.hideContextMenu();
                                return;
                            }

                            $.selected = [handle];
                            e.delegateTarget = td;
                            e.currentTarget = td.closest('tr');
                            e.useClientRect = true; // rows here are position: relative, see adjustContextMenuPosition()
                            M.contextMenuUI(e, 1);
                        }}>
                    </Button>
                </div>
            </div>
        </td>;
    }
}
