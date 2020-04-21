import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';

export default class ResultTable extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="result-table">
                <div className="result-table-heading">
                    {this.props.heading}
                </div>
                {this.props.children}
            </div>
        );
    }
}
