var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
import {MegaRenderMixin} from './../../../stores/mixins.js';
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;

class MetaRichpreviewLoading extends ConversationMessageMixin {
    render() {
        return <div className="loading-spinner light small"><div className="main-loader"></div></div>;
    }
};

export {
    MetaRichpreviewLoading
};
