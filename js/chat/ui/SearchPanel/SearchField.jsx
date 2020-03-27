import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { STATUS } from './SearchPanel.jsx';

export default class SearchField extends MegaRenderMixin {
    static input = React.createRef();

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        SearchField.input.current.focus();
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
        const { value, searching, status, onFocus, onBlur, onChange, onSearchToggle } = this.props;
        const HAS_INTERACTIONS = status === STATUS.IN_PROGRESS || status === STATUS.PAUSED;

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

                {searching && status && (
                    <div
                        className={`search-field-status ${HAS_INTERACTIONS ? 'has-interactions' : ''}`}
                        onClick={() => HAS_INTERACTIONS ? onSearchToggle() : null}>
                        {this.renderStatus(status)}
                    </div>
                )}
            </div>
        );
    }
}
