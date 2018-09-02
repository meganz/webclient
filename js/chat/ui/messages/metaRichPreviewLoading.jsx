var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;

var MetaRichpreviewLoading = React.createClass({
    mixins: [ConversationMessageMixin],
    render: function () {
        return <div className="loading-spinner light small"><div className="main-loader"></div></div>;
    }
});

module.exports = {
    MetaRichpreviewLoading
};
