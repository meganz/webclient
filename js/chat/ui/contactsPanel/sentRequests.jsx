import React from 'react';
import Nil from './nil.jsx';
import FMView from '../../../ui/jsx/fm/fmView.jsx';
import { ColumnContactRequestsEmail } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsEmail.jsx';
import { ColumnContactRequestsSentBtns } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsSentBtns.jsx';
import { ColumnContactRequestsRts } from '../../../ui/jsx/fm/nodes/columns/columnContactRequestsRts.jsx';

const SentRequests = ({ sent }) => {
    return (
        <div className="contacts-list">
            <FMView
                sortFoldersFirst={false}
                dataSource={sent}
                currentlyViewedEntry="opc"
                onSelected={nop}
                onHighlighted={nop}
                onExpand={nop}
                onAttachClicked={nop}
                viewMode={0}
                currentdirid="opc"
                megaListItemHeight={59}
                headerContainerClassName="contacts-table requests-table contacts-table-head"
                containerClassName="contacts-table requests-table contacts-table-results"
                listAdapterColumns={[
                    [ColumnContactRequestsEmail, {
                        currView: "opc"
                    }],
                    ColumnContactRequestsRts,
                    [ColumnContactRequestsSentBtns, {
                        onReject: (email) => {
                            M.cancelPendingContactRequest(email)
                                .catch((ex) => {
                                    if (ex === EARGS) {
                                        msgDialog('info', '', 'This pending contact is already deleted.');
                                    }
                                    else {
                                        tell(ex);
                                    }
                                });
                        },
                        onReinvite: (email) => {
                            M.reinvitePendingContactRequest(email)
                                .then(() => contactsInfoDialog(l[19126], email, l[19127]))
                                .catch(tell);
                        }
                    }]
                ]}
                NilComponent={() => {
                    return <Nil title={l[6196]} />;
                }}
                listAdapterOpts={{
                    'className': (node) => node.dts && ' disabled'
                }}
                keyProp="p"

                initialSortBy={[
                    'email', 'asc'
                ]}

                /* fmconfig.sortmodes integration/support */
                fmConfigSortEnabled={true}
                fmConfigSortMap={{
                    'rts': 'rTimeStamp',
                }}
                fmConfigSortId="opc"
            />
        </div>
    );
};

export default SentRequests;
