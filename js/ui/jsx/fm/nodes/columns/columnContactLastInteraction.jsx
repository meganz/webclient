import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";

export class ColumnContactLastInteraction extends GenericNodePropsComponent {
    static sortable = true;
    static id = "interaction";
    static megatype = "interaction";

    static get label() {
        return l[5904];
    }

    /**
     * getLastInteractionIcon
     * @description Retrieves icon based on the last interaction type.
     * @param {string} handle The contact handle
     * @returns {JSX.Element}
     */
    getLastInteractionIcon = handle => {
        const {interactions} = this.props;
        const interaction = interactions[handle];
        const {type, time} = interaction || {type: undefined, time: undefined};

        return (
            <i
                className={`
                    sprite-fm-mono
                    ${parseInt(type, 10) === 0 ? 'icon-cloud' : ''}
                    ${parseInt(type, 10) === 1 ? 'icon-chat' : ''}
                    ${!time ? 'icon-minimise' : ''}
                `}
            />
        );
    };

    /**
     * getLastInteractionTime
     * @description Retrieves formatted string based for last contact interaction.
     * @param {string} handle The contact handle
     * @returns {string} formatted string -- `time2last` or `Never`.
     */

    getLastInteractionTime = handle => {
        const {interactions} = this.props;
        const interaction = interactions[handle];
        return interaction ? time2last(interaction.time) : l[1051] /* `Never` */;
    };

    render() {
        let {nodeAdapter} = this.props;
        let {node} = nodeAdapter.props;

        return <td megatype={ColumnContactLastInteraction.megatype} className={ColumnContactLastInteraction.megatype}>
            <div className="contact-item">
                <div className="contact-item-time">
                    {this.getLastInteractionIcon(node.h)}
                    {this.getLastInteractionTime(node.h)}
                </div>
            </div>
        </td>;
    }
}
