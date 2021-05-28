import React from 'react';
import { Button } from '../../../ui/buttons.jsx';
import { MegaRenderMixin } from '../../../stores/mixins';

export default class Nil extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
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
                        {l[19114]}
                    </div>
                    <Button
                        className="mega-button positive large fm-empty-button"
                        onClick={() => contactAddDialog()}>
                        <span>{l[71]}</span>
                    </Button>
                    <div className="empty-share-public">
                        <i className="sprite-fm-mono icon-link-circle" />
                        <span dangerouslySetInnerHTML={{ __html: l[19111] }} />
                    </div>
                </div>
            </div>
        );
    }
}
