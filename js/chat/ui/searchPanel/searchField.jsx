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

    renderStatusBanner = () => {
        switch (this.props.status) {
            case STATUS.IN_PROGRESS:
                return (
                    <div className={`${SEARCH_STATUS_CLASS} searching info`}>
                        {LABEL.DECRYPTING_RESULTS}
                    </div>
                );
            case STATUS.PAUSED:
                return (
                    <div className={`${SEARCH_STATUS_CLASS} paused info`}>
                        {LABEL.SEARCH_PAUSED}
                    </div>
                );
            case STATUS.COMPLETED:
                return (
                    <div className={`${SEARCH_STATUS_CLASS} complete success`}>
                        {LABEL.SEARCH_COMPLETE}
                    </div>
                );
            default:
                return null;
        }
    };

    renderStatusControls = () => {
        const { status, onToggle } = this.props;
        const handleHover = () => this.setState(state => ({ hovered: !state.hovered }));

        switch (status) {
            case STATUS.IN_PROGRESS:
                return (
                    <div
                        // Additional `div` element wrapping the controls, re: increased clickable area
                        className="progress-controls"
                        onMouseOver={handleHover}
                        onMouseOut={handleHover}
                        onClick={onToggle}>
                        <i className={this.state.hovered ? 'sprite-fm-mono icon-pause' : 'small-icon tiny-searching'} />
                    </div>
                );
            case STATUS.PAUSED:
                return (
                    <i
                        className="sprite-fm-mono icon-play"
                        onClick={onToggle}
                        onMouseOver={handleHover}
                        onMouseOut={handleHover}
                    />
                );
            case STATUS.COMPLETED:
                return null;
            default:
                return null;
        }
    };

    render() {
        const { value, searching, status, onChange, onReset } = this.props;
        return (
            <div className="search-field">
                <i className="sprite-fm-mono icon-preview-reveal search-icon-find"/>

                <input
                    type="text"
                    autoComplete="disabled"
                    placeholder="Search"
                    ref={SearchField.inputRef}
                    value={value}
                    onChange={ev => {
                        // Reset the `pause search` state
                        if (this.state.hovered) {
                            this.setState({ hovered: false });
                        }
                        onChange(ev);
                    }}
                />

                {searching && <i className="sprite-fm-mono icon-close-component search-icon-reset" onClick={onReset} />}

                {searching && status && (
                    <>
                        {this.renderStatusControls()}
                        {this.renderStatusBanner()}
                    </>
                )}
            </div>
        );
    }
}
