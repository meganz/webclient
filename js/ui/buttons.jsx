var React = require("react/addons");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;

var _buttonGroups = {};

var Button = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {'focused': false};
    },
    componentWillUpdate: function(nextProps, nextState) {
        if(nextProps.disabled === true && nextState.focused === true) {
            nextState.focused = false;
        }

        if(this.state.focused != nextState.focused && nextState.focused === true) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

            // change the focused state to any other buttons in this group
            if(this.props.group) {
                if(_buttonGroups[this.props.group] && _buttonGroups[this.props.group] != this) {
                    _buttonGroups[this.props.group].setState({focused: false});
                }
                _buttonGroups[this.props.group] = this;
            }
        }

        // deactivate group if focused => false and i'm the currently "focused" in the group
        if(this.props.group && nextState.focused === false &&  _buttonGroups[this.props.group] == this) {
            _buttonGroups[this.props.group] = null;
        }
    },
    renderChildren: function () {
        return React.Children.map(this.props.children, function (child) {
            return React.addons.cloneWithProps(child, {
                active: this.state.focused
            });
        }.bind(this))
    },
    onBlur: function(e) {
        if(!e || $(e.target).parents(".button-container").size() === 0) {
            this.setState({focused: false});
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        }
    },
    onClick: function(e) {
        if(this.props.disabled === true) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if(this.state.focused === false) {
            if (this.props.onClick) {
                this.props.onClick(this);
            } else if (React.Children.count(this.props.children) > 0) { // does it contain some kind of a popup/container?
                this.setState({'focused': true});
            }
        } else if(this.state.focused === true) {
            this.onBlur();
        }
    },
    render: function () {
        var classes = this.props.className ? this.props.className : "chat-button fm-start-video-call";

        if(this.props.disabled === true) {
            classes += " disabled";
        } else if(this.state.focused) {
            classes += " active";
        }


        return (
            <div className="button-container">
                <div className={classes} onClick={this.onClick}>
                    <span className={this.props.spanClass ? this.props.spanClass : "fm-chatbutton-arrow" }>{this.props.label}</span>
                </div>
                {this.renderChildren()}
            </div>
        );
    }
});

var ButtonPopup = React.createClass({
    mixins: [MegaRenderMixin],
    render: function() {
        var classes="fm-call-dialog";

        if(this.props.active !== true) {
            classes += " hidden";
        }

        return (
            <div className={classes}>
                <div className="fm-call-dialog-arrow"></div>
                <div className="fm-call-dialog-scroll">
                    <utils.JScrollPane {...this.props}>
                        {this.props.children}
                    </utils.JScrollPane>
                </div>
            </div>
        );
    }
});


module.exports = {
    ButtonPopup,
    Button
};