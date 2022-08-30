import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Nil from './nil.jsx';
import FMView from "../../../ui/jsx/fm/fmView.jsx";
import {ColumnContactName} from "../../../ui/jsx/fm/nodes/columns/columnContactName.jsx";
import {ColumnContactStatus} from "../../../ui/jsx/fm/nodes/columns/columnContactStatus.jsx";
import {ColumnContactLastInteraction} from "../../../ui/jsx/fm/nodes/columns/columnContactLastInteraction.jsx";
import {ColumnContactButtons} from "../../../ui/jsx/fm/nodes/columns/columnContactButtons.jsx";

export default class ContactList extends MegaRenderMixin {
    contextMenuRefs = [];

    state = {
        selected: [],
        searchValue: null,
        interactions: {},
        contextMenuPosition: null
    };

    constructor(props) {
        super(props);

        this.onSelected = this.onSelected.bind(this);
        this.onHighlighted = this.onHighlighted.bind(this);
        this.onExpand = this.onExpand.bind(this);
        this.onAttachClicked = this.onAttachClicked.bind(this);
    }

    /**
     * getLastInteractions
     * @description Retrieves the last contact interactions.
     * @returns {void}
     */

    getLastInteractions = () => {
        const { contacts } = this.props;
        let interactions = {};
        let promises = [];
        for (let handle in contacts) {
            if (contacts.hasOwnProperty(handle)) {
                promises.push(
                    getLastInteractionWith(handle, true, true)
                        .done(timestamp => {
                            const [type, time] = timestamp.split(':');
                            interactions[handle] = {
                                'u': handle,
                                'type': type,
                                'time': time
                            };
                        })
                );
            }
        }

        Promise.allSettled(promises)
            .then(() => {
                if (!this.isMounted()) {
                    return;
                }
                // commit state in one go, only when all done.
                this.setState({'interactions': interactions});
            })
            .catch(() => {
                console.error("Failed to retrieve last interactions.");
            });
    };

    /**
     * handleContextMenu
     * @description Handles the right-click behavior.
     * @param ev
     * @param handle
     */

    handleContextMenu = (ev, handle) => {
        ev.persist();
        if (this.state.selected.length > 1) {
            // Do not show the context menu if select multiple contacts
            return null;
        }
        const $$REF = this.contextMenuRefs[handle];
        if ($$REF && $$REF.isMounted()) {
            const refNodePosition = $$REF.domNode && $$REF.domNode.getBoundingClientRect().x;
            this.setState({ contextMenuPosition: ev.clientX > refNodePosition ? null : ev.clientX }, () =>
                $$REF.onClick(ev)
            );
        }
    };


    componentDidMount() {
        super.componentDidMount();
        this.getLastInteractions();
    }

    onSelected(handle) {
        this.setState({'selected': handle});
    }
    onHighlighted(handle) {
        this.setState({'highlighted': handle});
    }
    onExpand(handle) {
        loadSubPage('/fm/chat/contacts/' + handle);
    }
    onAttachClicked() {
        if (this.state.selected[0]) {
            this.onExpand(this.state.selected[0]);
        }
    }
    render() {
        const { contacts } = this.props;

        if (contacts && contacts.length > 1 /* First contact -> u_handle */) {
            return (
                <div className="contacts-list">
                    <FMView
                        dataSource={this.props.contacts}
                        customFilterFn={(r) => {
                            return r.c === 1;
                        }}
                        currentlyViewedEntry="contacts"
                        onSelected={this.onSelected}
                        onHighlighted={this.onHighlighted}
                        searchValue={this.state.searchValue}
                        onExpand={this.onExpand}
                        onAttachClicked={this.onAttachClicked}
                        viewMode={0}
                        currentdirid="contacts"
                        megaListItemHeight={59}
                        headerContainerClassName="contacts-table contacts-table-head"
                        containerClassName="contacts-table contacts-table-results"
                        onContextMenu={(ev, handle) => this.handleContextMenu(ev, handle)}
                        listAdapterColumns={[
                            ColumnContactName,
                            ColumnContactStatus,
                            [ColumnContactLastInteraction, {
                                interactions: this.state.interactions
                            }],
                            [ColumnContactButtons, {
                                onContextMenuRef: (handle, node) => {
                                    this.contextMenuRefs[handle] = node;
                                },
                                onActiveChange: (opened) => {
                                    if (!opened) {
                                        this.setState({ contextMenuPosition: null });
                                    }
                                },
                                contextMenuPosition: this.state.contextMenuPosition
                            }]
                        ]}
                        initialSortBy={[
                            'status', 'asc'
                        ]}

                        /* fmconfig.sortmodes integration/support */
                        fmConfigSortEnabled={true}
                        fmConfigSortId="contacts"
                        NilComponent={<Nil title={l[5737] /* `No Contacts` */} />}
                    />
                </div>
            );
        }

        return <Nil title={l[5737] /* `No Contacts` */} />;
    }
}
