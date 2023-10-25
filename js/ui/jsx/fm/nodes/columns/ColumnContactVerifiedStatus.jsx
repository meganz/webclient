import React from "react";
import {GenericNodePropsComponent} from "../genericNodePropsComponent";
import ContactsPanel from "../../../../../chat/ui/contactsPanel/contactsPanel";

export class ColumnContactVerifiedStatus extends GenericNodePropsComponent {
    static sortable = true;
    static id = "verification";
    static megatype = "verification";

    static label = <>
        {l.contact_ver_verification}
        <i className="simpletip sprite-fm-mono contacts-verification-icon icon-info"
            data-simpletip={l.contact_ver_tooltip_content}
            data-simpletip-class="contacts-verification-icon-simpletip"
        />
    </>;

    static verifiedLabel = <div className="verified-contact-label-container">
        <i className="small-icon icons-sprite tiny-green-tick"/>
        {l[6776]}
    </div>;

    /**
     * getFingerPrintDialogLink
     * @description Retrieves an HTML node with an attached fingerprint dialog handler.
     * @param {string} handle The contact handle
     * @returns {JSX.Element}
     */

    getFingerPrintDialogLink = handle => {
        const onVerifyContactClicked = (handle) => {
            ContactsPanel.verifyCredentials(this.props.contacts[handle]);
        };

        return <div className="verify-contact-link-container">
            <div className="verify-contact-link" onClick={() => onVerifyContactClicked(handle)}>
                {l.verify_credentials}
            </div>
        </div>;
    };

    render() {
        const {nodeAdapter} = this.props;
        const {node} = nodeAdapter.props;

        return <td megatype={ColumnContactVerifiedStatus.megatype} className={ColumnContactVerifiedStatus.megatype}>
            <div className="contact-item">
                <div className="contact-item-verification">
                    {ContactsPanel.isVerified(this.props.contacts[node.h])
                        ? ColumnContactVerifiedStatus.verifiedLabel
                        : this.getFingerPrintDialogLink(node.h)
                    }
                </div>
            </div>
        </td>;
    }
}
