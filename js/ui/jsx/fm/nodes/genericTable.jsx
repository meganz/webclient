import React from 'react';
import {MegaRenderMixin} from "../../../../chat/mixins";
import {GenericNodePropsComponent} from "./genericNodePropsComponent";

export class GenericTableHeader extends MegaRenderMixin {
    domRef = React.createRef();

    render() {
        let { sortBy, columns } = this.props;

        // Sorting can be turned off for the whole header (e.g. quick-access)
        const headerSortable = this.props.sortable !== false;

        let columnsRendered = [];
        for (let i = 0; i < columns.length; i++) {
            let col = columns[i];
            let colProps;
            if (Array.isArray(col)) {
                colProps = col[1];
                col = col[0];
            }

            const colSortable = col.sortable && headerSortable;

            let sortable;
            if (colSortable) {
                let classes = "";
                if (sortBy[0] === col.id) {
                    const ordClass = sortBy[1] === "desc" ? "asc" : "desc";
                    classes = `${classes} ${ordClass}`;
                }
                if (col.id === 'fav') {
                    classes += ' hidden';
                }
                sortable = `arrow sprite-fm-mono icon-arrow-left-thin-solid ${col.id} ${classes}`;
            }

            columnsRendered.push(
                <th
                    megatype={col.megatype}
                    className={col.headerClassName || col.megatype || ""}
                    key={col.id + "_" + i}
                    onClick={(e) => {
                        e.preventDefault();
                        if (colSortable) {
                            this.props.onClick(col.id);
                        }
                    }}
                >
                    <span className={sortable || ''}>{colProps?.label || col.label}</span>
                    {col.icon && <i className={"sprite-fm-mono " + col.icon}></i>}
                </th>
            );
        }

        return (
            <thead ref={this.domRef}>
                <tr>{columnsRendered}</tr>
            </thead>
        );
    }
}
export default class GenericTable extends GenericNodePropsComponent {
    render() {
        let {node, index, listAdapterOpts, className, keyProp} = this.props;

        // 1 - to hide, 2 - to show with opacity
        const toApplySensitive = !!mega.sensitives.isSensitive(node) && (mega.sensitives.showGlobally ? 1 : 2);

        let columns = [];
        for (let i = 0; i < listAdapterOpts.columns.length; i++) {
            let customColumn = listAdapterOpts.columns[i];
            if (Array.isArray(customColumn)) {
                columns.push(
                    React.createElement(customColumn[0], {
                        ...customColumn[1],
                        'nodeAdapter': this,
                        'h': node[keyProp],
                        'node': node,
                        'key': i + "_" + customColumn[0].prototype.constructor.name,
                        'keyProp': keyProp
                    })
                );
            }
            else {
                columns.push(
                    React.createElement(customColumn, {
                        'nodeAdapter': this,
                        'h': node[keyProp],
                        'node': node,
                        'key': i + "_" + customColumn.prototype.constructor.name,
                        'keyProp': keyProp
                    })
                );
            }
        }


        let listClassName = listAdapterOpts.className;

        return <tr className={
            "node_" + node[keyProp] + " " +
            (className && className(node) || "") + " " +
            (listClassName && listClassName(node) || "") + " " +
            this.nodeProps?.classNames.join(" ") +
            (toApplySensitive ? (toApplySensitive === 1 ? ' is-sensitive' : ' hidden-as-sensitive') : '')
        }
        id={node[keyProp]}
        onContextMenu={(ev) => {
            if (this.props.onContextMenu) {
                this.props.onContextMenu(ev, node[keyProp]);
            }
        }}
        onClick={(e) => {
            this.props.onClick(e, this.props.node);
        }}
        onDoubleClick={(e) => {
            this.props.onDoubleClick(e, this.props.node);
        }}
        key={index + "_" + node[keyProp]}
        >
            {columns}
        </tr>;
    }
}
