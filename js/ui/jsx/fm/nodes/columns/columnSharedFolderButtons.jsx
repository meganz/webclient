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
                            e.persist();
                            $.selected = [handle];

                            e.preventDefault();
                            e.stopPropagation(); // do not treat it as a regular click on the file
                            e.delegateTarget = $(e.target).parents('td')[0];
                            e.currentTarget = $(e.target).parents('tr');

                            if (!$(e.target).hasClass('active')) {
                                M.contextMenuUI(e, 1);
                                $(this).addClass('active');
                            }
                            else {
                                $.hideContextMenu();
                                $(e.target).removeClass('active');
                            }
                        }}>
                    </Button>
                </div>
            </div>
        </td>;
    }
}
