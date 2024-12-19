import React from 'react';
import Nil from './nil.jsx';
import FMView from '../../../ui/jsx/fm/fmView.jsx';
import { ColumnContactRequestsEmail } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsEmail.jsx';
import { ColumnContactRequestsTs } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsTs.jsx';
import { ColumnContactRequestsRcvdBtns } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsRcvdBtns.jsx';

const ReceivedRequests = ({ received }) => {
    return (
        <div className="contacts-list">
            <FMView
                sortFoldersFirst={false}
                dataSource={received}
                customFilterFn={(r) => {
                    return !r.dts;
                }}
                currentlyViewedEntry="ipc"
                onSelected={nop}
                onHighlighted={nop}
                onExpand={nop}
                onAttachClicked={nop}
                viewMode={0}
                currentdirid="ipc"
                megaListItemHeight={59}
                headerContainerClassName="contacts-table requests-table contacts-table-head"
                containerClassName="contacts-table requests-table contacts-table-results"
                listAdapterColumns={[
                    [ColumnContactRequestsEmail, {
                        currView: "ipc"
                    }],
                    [ColumnContactRequestsTs, {
                        label: l[19505]
                    }],
                    [ColumnContactRequestsRcvdBtns, {
                        onReject: (handle) => {
                            M.denyPendingContactRequest(handle).catch(dump);
                        },
                        onBlock: (handle) => {
                            M.ignorePendingContactRequest(handle).catch(dump);
                        },
                        onAccept: (handle) => {
                            M.acceptPendingContactRequest(handle).catch(dump);
                        }
                    }]
                ]}
                keyProp="p"
                nodeAdapterProps={{
                    'className': (node) => {
                        return `
                        ${node.dts || node.s && node.s === 3 ? 'deleted' : ''}
                        ${node.s && node.s === 1 ? 'ignored' : ''}
                    `;
                    }
                }}
                NilComponent={() => {
                    return <Nil title={l[6196]} />;
                }}

                initialSortBy={[
                    'email', 'asc'
                ]}

                /* fmconfig.sortmodes integration/support */
                fmConfigSortEnabled={true}
                fmConfigSortId="ipc"
            />
        </div>
    );
};

export default ReceivedRequests;
