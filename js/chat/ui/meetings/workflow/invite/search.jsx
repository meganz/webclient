import React from 'react';
import { MegaRenderMixin } from '../../../../mixins';
import Invite from './invite.jsx';

export default class Search extends MegaRenderMixin {
    static inputRef = React.createRef();

    static focus = () => {
        return Search.inputRef && Search.inputRef.current && Search.inputRef.current.focus();
    };

    render() {
        const { value, placeholder, onChange } = this.props;

        return (
            <div className={`${Invite.NAMESPACE}-field`}>
                <i className="sprite-fm-mono icon-preview-reveal" />
                <input
                    type="text"
                    autoFocus={true}
                    placeholder={l[23750].replace('[X]', placeholder) /* `Search [X] contacts...` */}
                    ref={Search.inputRef}
                    value={value}
                    onChange={onChange}
                />
            </div>
        );
    }
}
