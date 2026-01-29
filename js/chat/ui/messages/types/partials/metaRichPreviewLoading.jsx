import React from 'react';
import { ConversationMessageMixin } from '../../mixin.jsx';

class MetaRichpreviewLoading extends ConversationMessageMixin {
    render() {
        return <div className="loading-spinner light small"><div className="main-loader"></div></div>;
    }
}

export {
    MetaRichpreviewLoading
};
