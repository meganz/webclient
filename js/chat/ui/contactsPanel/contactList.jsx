import React from 'react';
import { MegaRenderMixin, compose } from '../../mixins';
import Nil from './nil.jsx';
import FMView from '../../../ui/jsx/fm/fmView.jsx';
import { ColumnContactName } from '../../../ui/jsx/fm/nodes/columns/columnContactName.jsx';
import { ColumnContactStatus } from '../../../ui/jsx/fm/nodes/columns/columnContactStatus.jsx';
import { ColumnContactLastInteraction } from '../../../ui/jsx/fm/nodes/columns/columnContactLastInteraction.jsx';
import { ColumnContactVerifiedStatus } from '../../../ui/jsx/fm/nodes/columns/columnContactVerifiedStatus.jsx';
import { ColumnContactButtons } from '../../../ui/jsx/fm/nodes/columns/columnContactButtons.jsx';
import { withUpdateObserver } from '../updateObserver.jsx';

class ContactList extends MegaRenderMixin {
    static updateListener = 'getLastInteractions';
    static updateInterval = 6e4 /* 1 min */;

    domRef = React.createRef();
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
            const refNodePosition = $$REF.domRef?.current && $$REF.domRef.current.getBoundingClientRect().x;
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

    componentDidMount() {
        super.componentDidMount();
        this.getLastInteractions();
    }

    render() {
        const { contacts } = this.props;

        if (contacts && contacts.length > 1 /* First contact -> u_handle */) {
            return (
                <div
                    ref={this.domRef}
                    className="contacts-list">
                    <FMView
                        dataSource={contacts}
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
                            [ColumnContactVerifiedStatus, { contacts }],
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

export default compose(withUpdateObserver)(ContactList);
