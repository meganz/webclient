import React from 'react';
import { MegaRenderMixin } from '../../../../../stores/mixins';

export default class Results extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { header, children } = this.props;
        return (
            <div className="contacts-search-subsection">
                <div className="contacts-list-header">
                    {header}
                </div>
                <div className="contacts-search-list">
                    {children}
                </div>
            </div>
        );
    }
}
