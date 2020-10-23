import React from 'react';
import { MegaRenderMixin } from "../stores/mixins.js";

let _buttonGroups = {};

export class Button extends MegaRenderMixin {
    buttonClass = `.button`;

    state = {
        focused: false
    };

    constructor(props) {
        super(props);
    }

    componentWillUpdate(nextProps, nextState) {
        if (nextProps.disabled === true && nextState.focused === true) {
            nextState.focused = false;
        }

        if (this.state.focused !== nextState.focused && nextState.focused === true) {
            $('.conversationsApp').rebind('mousedown.button' + this.getUniqueId(), this.onBlur);

            $(document).rebind('keyup.button' + this.getUniqueId(), e => {
                if (this.state.focused === true && e.keyCode === 27 /* `ESC` */) {
                    this.onBlur();
                }
            });

            if (this._pageChangeListener) {
                mBroadcaster.removeListener(this._pageChangeListener);
            }

            this._pageChangeListener = mBroadcaster.addListener('pagechange', () => {
                if (this.state.focused === true) {
                    this.onBlur();
                }
            });

            $(document).rebind('closeDropdowns.' + this.getUniqueId(), () => this.onBlur());

            // change the focused state to any other buttons in this group
            if (this.props.group) {
                if (_buttonGroups[this.props.group] && _buttonGroups[this.props.group] !== this) {
                    _buttonGroups[this.props.group].setState({focused: false});
                    _buttonGroups[this.props.group].unbindEvents();
                }
                _buttonGroups[this.props.group] = this;
            }
        }

        // deactivate group if focused => false and i'm the currently "focused" in the group
        if (this.props.group && nextState.focused === false &&  _buttonGroups[this.props.group] === this) {
            _buttonGroups[this.props.group] = null;
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }

    renderChildren() {
        var self = this;

        return React.Children.map(this.props.children, function (child) {
            return React.cloneElement(child, {
                active: self.state.focused,
                closeDropdown: function() {
                    self.setState({'focused': false});
                    self.unbindEvents();
                },
                onActiveChange: function(newVal) {
                    var $element = $(self.findDOMNode());
                    var $scrollables = $element.parents('.jScrollPaneContainer, .perfectScrollbarContainer');
                    if ($scrollables.length > 0) {
                        if (newVal === true) {
                            // disable scrolling
                            $scrollables.attr('data-scroll-disabled', true);
                            $scrollables.filter('.perfectScrollbarContainer').each(function(k, element) {
                                Ps.disable(element);
                            });
                        }
                        else {
                            // enable back scrolling
                            $scrollables.removeAttr('data-scroll-disabled');
                            $scrollables.filter('.perfectScrollbarContainer').each(function(k, element) {
                                Ps.enable(element);
                            });
                        }
                    }
                    if (child.props.onActiveChange) {
                        child.props.onActiveChange.call(this, newVal);
                    }
                }
            });
        }.bind(this));
    }

    onBlur = e => {
        if (!this.isMounted()) {
            return;
        }

        if (!e || !$(e.target).closest(this.buttonClass).is(this.findDOMNode())) {
            this.setState({ focused: false }, () => {
                this.unbindEvents();
                this.safeForceUpdate();
            });
        }
    }

    unbindEvents() {
        $(document).off('keyup.button' + this.getUniqueId());
        $(document).off('closeDropdowns.' + this.getUniqueId());
        $('.conversationsApp').unbind('mousedown.button' + this.getUniqueId());

        if (this._pageChangeListener) {
            mBroadcaster.removeListener(this._pageChangeListener);
        }
    }

    onClick = e => {
        if (this.props.disabled === true) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (
            $(e.target).closest('.popup').closest(this.buttonClass).is(this.findDOMNode()) &&
            this.state.focused === true
        ) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if ($(e.target).is('input, textarea, select')) {
            return;
        }

        if (this.state.focused === false) {
            if (this.props.onClick) {
                this.props.onClick(this);
            }
            else if (React.Children.count(this.props.children) > 0) { // does it contain some kind of a popup/container?
                this.setState({ focused: true });
            }
        }
        else if (this.state.focused === true) {
            this.setState({ focused: false });
            this.unbindEvents();
        }
    }

    render() {
        const { className, disabled, style, icon, label, toggle, secondLabel, secondLabelClass } = this.props;

        var extraAttrs = this.props.attrs;
        return (
            <div
                className={`
                    button
                    ${className ? className : ''}
                    ${disabled ? 'disabled' : ''}
                    ${this.state.focused ? 'active' : ''}
                `}
                style={style}
                onClick={this.onClick}
                {...extraAttrs}>
                {icon && <i className={`small-icon ${icon}`} />}
                {label && <span>{label}</span>}
                {secondLabel && (
                    <span
                        className={secondLabelClass ? secondLabelClass : ''}
                        dangerouslySetInnerHTML={{ __html: this.props.secondLabel }} />
                )}
                {toggle && (
                    <div
                        className={`
                            dialog-feature-toggle
                            ${toggle.className ? toggle.className : ''}
                            ${toggle.enabled ? 'toggle-on' : ''}
                        `}
                        onClick={(ev) => {
                            ev.stopPropagation();
                            if (this.props.toggle.onClick) {
                                this.props.toggle.onClick();
                            }
                        }}>
                        <div className="dialog-feature-switch" />
                    </div>
                )}
                {this.renderChildren()}
            </div>
        );
    }
}
