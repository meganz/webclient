import React from 'react';
import { Button } from '../../../ui/buttons.jsx';
import { ParsedHTML } from '../../../ui/utils';

export default class Nil extends React.Component {
    componentDidMount() {
        setContactLink();
    }

    render() {
        const { title } = this.props;
        return (
            <div className="fm-empty-section fm-empty-contacts">
                <div className="fm-empty-pad">
                    <i className="section-icon sprite-fm-mono icon-contacts" />
                    <div className="fm-empty-cloud-txt">{title}</div>
                    <div className="fm-empty-description">
                        {l[19115]}
                    </div>
                    <Button
                        className="mega-button positive large fm-empty-button"
                        onClick={() => contactAddDialog()}>
                        <span>{l[71]}</span>
                    </Button>
                    <div className="empty-share-public">
                        <i className="sprite-fm-mono icon-link-circle" />
                        <ParsedHTML>{l[19111]}</ParsedHTML>
                    </div>
                </div>
            </div>
        );
    }
}
