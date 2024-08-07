import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Nil from './nil.jsx';
import FMView from "../../../ui/jsx/fm/fmView.jsx";
import {ColumnContactName} from "../../../ui/jsx/fm/nodes/columns/columnContactName.jsx";
import {ColumnContactStatus} from "../../../ui/jsx/fm/nodes/columns/columnContactStatus.jsx";
import {ColumnContactLastInteraction} from "../../../ui/jsx/fm/nodes/columns/columnContactLastInteraction.jsx";
import {ColumnContactVerifiedStatus} from "../../../ui/jsx/fm/nodes/columns/columnContactVerifiedStatus.jsx";
import {ColumnContactButtons} from "../../../ui/jsx/fm/nodes/columns/columnContactButtons.jsx";

export default class ContactList extends MegaRenderMixin {
    lastInteractionInterval = undefined;
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
        this.getLastInteractions = this.getLastInteractions.bind(this);
    }

    /**
     * getLastInteractions
     * @description Retrieves the last contact interactions.
     * @returns {void}
     */

    getLastInteractions() {
        const {contacts} = this.props;
        const promises = [];

        const push = (handle) => {
            // @todo remove the Promise.resolve() whenever MegaPromise is no longer used.
            promises.push(
                Promise.resolve(getLastInteractionWith(handle, true, true)).then((ts) => [ts, handle])
            );
        };

        for (const handle in contacts) {
            if (contacts[handle].c === 1) {
                push(handle);
            }
        }

        Promise.allSettled(promises)
            .then((res) => {
                if (this.isMounted()) {
                    const interactions = {};

                    for (let i = res.length; i--;) {
                        if (res[i].status !== 'fulfilled') {
                            if (d && res[i].reason !== false) {
                                console.warn('getLastInteractions', res[i].reason);
                            }
                        }
                        else {
                            const [ts, u] = res[i].value;
                            const [type, time] = ts.split(':');

                            interactions[u] = {u, type, time};
                        }
                    }

                    // commit state in one go, only when all done.
                    this.setState({'interactions': interactions});
                }
            })
            .catch((ex) => {
                console.error("Failed to handle last interactions!", ex);
            });
    }

    /**
     * handleContextMenu
     * @description Handles the right-click behavior.
     * @param ev
     * @param handle
     */

    handleContextMenu(ev, handle) {
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

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.lastInteractionInterval);
    }

    componentDidMount() {
        super.componentDidMount();
        this.getLastInteractions();
        this.lastInteractionInterval = setInterval(this.getLastInteractions, 6e4 /* 1 min */);
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
                            [ColumnContactVerifiedStatus, {
                                contacts: this.props.contacts
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
