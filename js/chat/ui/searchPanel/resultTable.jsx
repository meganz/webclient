import React from 'react';
import { MegaRenderMixin } from '../../mixins';

export default class ResultTable extends MegaRenderMixin {
    render() {
        const { heading, children } = this.props;

        return (
            <div className={`result-table ${heading ? '' : 'nil'}`}>
                {heading ? <div className="result-table-heading">{heading}</div> : null}
                {children}
            </div>
        );
    }
}
