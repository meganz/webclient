import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { STATUS } from './SearchPanel.jsx';

export default class SearchField extends MegaRenderMixin {
    static inputRef = React.createRef();

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        SearchField.inputRef.current.focus();
    }

    renderStatus = status => {
        switch (status) {
            case STATUS.IN_PROGRESS:
                return (
                    <>
                        <i className="decrypting"></i>
                        decrypting results...
                    </>
                );
            case STATUS.PAUSED:
                return (
                    <>
                        <i className="paused"></i>
                        resume search
                    </>
                );
            case STATUS.COMPLETED:
                return (
                    <>
                        <i className="complete"></i>
                        search complete
                    </>
                );
            default:
                return null;
        }
    };

    render() {
        const { value, searching, status, onFocus, onChange, onSearchToggle, onSearchReset } = this.props;
        const isClickable = status === STATUS.IN_PROGRESS || status === STATUS.PAUSED;

        return (
            <div className="search-field">
                <i className="small-icon thin-search-icon"></i>

                <input
                    type="text"
                    autoComplete="disabled"
                    placeholder="Search"
                    ref={SearchField.inputRef}
                    value={value}
                    onFocus={onFocus}
                    onChange={onChange} />

                {searching && status && (
                    <div
                        className={`search-field-status ${isClickable ? 'clickable' : ''}`}
                        onClick={() => isClickable && onSearchToggle()}>
                        {this.renderStatus(status)}
                    </div>
                )}

                {searching && (
                    <i className="small-icon reset-icon" onClick={() => onSearchReset(SearchField.inputRef)}></i>
                )}
            </div>
        );
    }
}
