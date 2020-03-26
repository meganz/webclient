import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';

export default class SearchField extends MegaRenderMixin {
    static input = React.createRef();

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        console.error('SearchField > componentDidMount()');
        SearchField.input.current.focus();
    }

    render() {
        const { value, searching, onFocus, onBlur, onChange } = this.props;

        return (
            <div className="search-field">
                <i className="small-icon thin-search-icon"></i>

                <input
                    type="text"
                    autoComplete="disabled"
                    placeholder="Search"
                    ref={SearchField.input}
                    value={value}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onChange={onChange} />

                <div className={`search-field-status ${searching ? '' : 'hidden'}`}>
                    <i className="decrypting"></i>
                    decrypting results..
                </div>
            </div>
        );
    }
}
