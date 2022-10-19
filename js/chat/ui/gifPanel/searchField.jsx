import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { LABELS } from './gifPanel.jsx';

export default class SearchField extends MegaRenderMixin {
    static inputRef = React.createRef();

    static focus = () => (
        SearchField.inputRef && SearchField.inputRef.current && SearchField.inputRef.current.focus()
    );

    static hasValue = () => (
        SearchField.inputRef && SearchField.inputRef.current && !!SearchField.inputRef.current.value.length
    );

    render() {
        const { value, searching, onChange, onReset, onBack } = this.props;

        return (
            <div className="gif-panel-search">
                <div className="gif-search-field">
                    {searching ?
                        <i className="sprite-fm-mono icon-left" onClick={onBack} /> :
                        <i className="sprite-fm-mono icon-preview-reveal" />}

                    <input
                        ref={SearchField.inputRef}
                        type="text"
                        placeholder={LABELS.SEARCH}
                        autoFocus={true}
                        value={value}
                        onChange={onChange} />

                    {searching && <i className="sprite-fm-mono icon-close-component" onClick={onReset} />}
                </div>

                <div className="giphy-logo">
                    <img src={staticpath + 'images/mega/giphy.gif'} alt="PWRD BY GIPHY" />
                </div>
            </div>
        );
    }
}
