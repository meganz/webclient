var React = require("react");
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;

class MetaRichpreviewLoading extends ConversationMessageMixin {
    render() {
        return <div className="loading-spinner light small"><div className="main-loader"></div></div>;
    }
}

export {
    MetaRichpreviewLoading
};
