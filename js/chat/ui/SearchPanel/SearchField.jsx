import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { STATUS } from './SearchPanel.jsx';
import { LABEL } from './ResultContainer.jsx';

const SEARCH_STATUS_CLASS = `search-field-status`;

export default class SearchField extends MegaRenderMixin {
    static inputRef = React.createRef();

    static focus = () => SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus();

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        SearchField.focus();
    }

    // [...] TODO: add enum-like object re: translations
    renderStatus = (status, isClickable, onToggle) => {
        const className = `${SEARCH_STATUS_CLASS} ${isClickable ? 'clickable' : ''}`;
        const handleClick = () => isClickable && onToggle();

        switch (status) {
            case STATUS.IN_PROGRESS:
                return (
                    <div className={`${className} searching`} onClick={handleClick}>
                        <i />
                        {LABEL.DECRYPTING_RESULTS}
                    </div>
                );
            case STATUS.PAUSED:
                return (
                    <div className={`${className} paused`} onClick={handleClick}>
                        <i />
                        {LABEL.RESUME_SEARCH}
                    </div>
                );
            case STATUS.COMPLETED:
                return (
                    <div className={`${className} complete`} onClick={handleClick}>
                        <i />
                        {LABEL.SEARCH_COMPLETE}
                    </div>
                );
            default:
                return null;
        }
    };

    render() {
        const { value, searching, status, onFocus, onChange, onToggle, onReset } = this.props;
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
                    this.renderStatus(status, isClickable, onToggle)
                )}

                {searching && (
                    <i className="small-icon reset-icon" onClick={onReset}></i>
                )}
            </div>
        );
    }
}
