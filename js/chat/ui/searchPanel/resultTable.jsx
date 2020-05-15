import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';

export default class ResultTable extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { heading } = this.props;

        return (
            <div className={`result-table ${heading ? '' : 'nil'}`}>
                {heading ? <div className="result-table-heading">{heading}</div> : null}
                {this.props.children}
            </div>
        );
    }
}
