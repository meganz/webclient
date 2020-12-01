import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { LABELS } from './gifPanel.jsx';

export default class SearchField extends MegaRenderMixin {
    static inputRef = React.createRef();

    static focus = () => (
        SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus()
    );

    static hasValue = () => (
        SearchField.inputRef && SearchField.inputRef.current && !!SearchField.inputRef.current.value.length
    );

    constructor(props) {
        super(props);
    }

    render() {
        const { value, searching, onChange, onReset, onBack } = this.props;

        return (
            <div className="gif-panel-search">
                <div className="gif-search-field">
                    {searching ?
                        <i className="small-icon thin-back-icon" onClick={onBack} /> :
                        <i className="small-icon thin-search-icon" />}

                    <input
                        ref={SearchField.inputRef}
                        type="text"
                        placeholder={LABELS.SEARCH}
                        autoFocus={true}
                        value={value}
                        onChange={onChange} />

                    {searching && <i className="small-icon tiny-reset" onClick={onReset} />}
                </div>

                <div className="giphy-logo">
                    <img src={staticpath + 'images/mega/giphy.gif'} alt="PWRD BY GIPHY" />
                </div>
            </div>
        );
    }
}
