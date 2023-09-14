import React from 'react';
import {MegaRenderMixin} from '../../mixins';
import Nil from './nil.jsx';
import FMView from "../../../ui/jsx/fm/fmView";
import {ColumnContactRequestsEmail} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsEmail";
import {ColumnContactRequestsSentBtns} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsSentBtns";
import {ColumnContactRequestsRts} from "../../../ui/jsx/fm/nodes/columns/columnContactRequestsRts";

export default class SentRequests extends MegaRenderMixin {

    handleReinvite = mail => {
        this.setState({ reinvited: true }, () => {
            M.reinvitePendingContactRequest(mail)
                .then(() => {
                    contactsInfoDialog(l[19126], mail, l[19127]);
                })
                .catch(tell);
        });
    };
    drawSentRequests = () => {
        const { sent } = this.props;

        return <FMView
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
                        this.handleReinvite(email);
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
        />;
    };


    render() {
        return (
            <div className="contacts-list">
                {this.drawSentRequests()}
            </div>
        );
    }
}
