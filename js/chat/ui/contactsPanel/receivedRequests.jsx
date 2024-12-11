import React from 'react';
import {MegaRenderMixin} from '../../mixins';
import Nil from './nil.jsx';
import FMView from "../../../ui/jsx/fm/fmView";
import {ColumnContactRequestsEmail} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsEmail";
import {ColumnContactRequestsTs} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsTs";
import {ColumnContactRequestsRcvdBtns} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsRcvdBtns";

export default class ReceivedRequests extends MegaRenderMixin {

    drawReceivedRequests = () => {
        const { received } = this.props;

        return <FMView
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
        />;
    };

    render() {
        return (
            <div className="contacts-list">
                {this.drawReceivedRequests()}
            </div>
        );
    }
}
