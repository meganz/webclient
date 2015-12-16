var React = require("react");
var ReactDOM = require("react-dom");
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
        var self = this;

        if (nextProps.disabled === true && nextState.focused === true) {
            nextState.focused = false;
        }

        if (this.state.focused != nextState.focused && nextState.focused === true) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

            $(document).rebind('keyup.button' + self.getUniqueId(), function(e) {
                if (e.keyCode == 27) { // escape key maps to keycode `27`
                    self.onBlur();
                }
            });

            // change the focused state to any other buttons in this group
            if (this.props.group) {
                if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] != this) {
                    _buttonGroups[this.props.group].setState({focused: false});
                }
                _buttonGroups[this.props.group] = this;
            }
        }

        // deactivate group if focused => false and i'm the currently "focused" in the group
        if (this.props.group && nextState.focused === false &&  _buttonGroups[this.props.group] == this) {
            _buttonGroups[this.props.group] = null;
        }
    },
    renderChildren: function () {
        return React.Children.map(this.props.children, function (child) {
            return React.cloneElement(child, {
                active: this.state.focused
            });
        }.bind(this))
    },
    onBlur: function(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if ($(e.target).is($element)) {
            return;
        }

        if(
            (!e || !$(e.target).parents(".button").is($element))
        ) {
            this.setState({focused: false});
            $(document).unbind('keyup.button' + this.getUniqueId());
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        }


    },
    onClick: function(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if (this.props.disabled === true) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if(
            $(e.target).parents(".popup").parents('.button').is($element) && this.state.focused === true
        ) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if ($(e.target).is("input,textarea,select")) {
            return
        }


        if (this.state.focused === false) {
            if (this.props.onClick) {
                this.props.onClick(this);
            }
            else if (React.Children.count(this.props.children) > 0) { // does it contain some kind of a popup/container?
                this.setState({'focused': true});
            }
        }
        else if (this.state.focused === true) {
            this.setState({focused: false});
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        }
    },
    render: function () {
        var classes = this.props.className ? "button " + this.props.className : "button";

        if (this.props.disabled == true || this.props.disabled == "true") {
            classes += " disabled";
        }
        else if (this.state.focused) {
            classes += " active";
        }

        var label;
        if (this.props.label) {
            label = this.props.label;
        }

        var icon;
        if (this.props.icon) {
            icon = <i className={"small-icon " + this.props.icon}></i>
        }

        return (
            <div className={classes} onClick={this.onClick} style={this.props.style}>
                {icon}
                {label}
                {this.renderChildren()}
            </div>
        );
    }
});



module.exports = window.ButtonsUI = {
    Button
};
