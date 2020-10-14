import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { STATUS } from './searchPanel.jsx';
import { LABEL } from './resultContainer.jsx';

const SEARCH_STATUS_CLASS = `search-field-status`;

export default class SearchField extends MegaRenderMixin {
    static inputRef = React.createRef();

    static select = () => {
        const inputElement = SearchField.inputRef && SearchField.inputRef.current;
        const value = inputElement && inputElement.value;

        if (inputElement && value) {
            inputElement.selectionStart = 0;
            inputElement.selectionEnd = value.length;
        }
    };

    static focus = () => (
        SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus()
    );

    static hasValue = () => (
        SearchField.inputRef && SearchField.inputRef.current && !!SearchField.inputRef.current.value.length
    );

    state = {
        hovered: false
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        SearchField.focus();
    }

    renderStatus = (status, isClickable, onToggle) => {
        const className = `${SEARCH_STATUS_CLASS} ${isClickable ? 'clickable' : ''}`;
        const handleClick = () => isClickable && onToggle();
        const handleHover = () => this.setState(state => ({ hovered: !state.hovered }));

        switch (status) {
            case STATUS.IN_PROGRESS:
                return (
                    <div
                        className={`${className} searching`}
                        onClick={handleClick}
                        onMouseOver={handleHover}
                        onMouseOut={handleHover}>
                        <i className="small-icon tiny-searching" />
                        {this.state.hovered ? LABEL.PAUSE_SEARCH : LABEL.DECRYPTING_RESULTS}
                    </div>
                );
            case STATUS.PAUSED:
                return (
                    <div className={`${className} paused`} onClick={handleClick}>
                        <i className="small-icon tiny-play" />
                        {LABEL.RESUME_SEARCH}
                    </div>
                );
            case STATUS.COMPLETED:
                return (
                    <div className={`${className} complete`} onClick={handleClick}>
                        <i className="small-icon tiny-complete" />
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
                <i className="small-icon thin-search-icon" />

                <input
                    type="text"
                    autoComplete="disabled"
                    placeholder="Search"
                    ref={SearchField.inputRef}
                    value={value}
                    onFocus={onFocus}
                    onChange={ev => {
                        // Reset the `pause search` state
                        if (this.state.hovered) {
                            this.setState({ hovered: false });
                        }
                        onChange(ev);
                    }}
                    className={searching ? 'searching' : ''} />

                {searching && status && (
                    this.renderStatus(status, isClickable, onToggle)
                )}

                <i className="small-icon tiny-reset" onClick={onReset} />
            </div>
        );
    }
}
