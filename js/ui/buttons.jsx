import React from 'react';
import { MegaRenderMixin } from "../chat/mixins";

export class Button extends MegaRenderMixin {
    domRef = React.createRef();
    buttonClass = `.button`;

    state = {
        focused: false,
        hovered: false,
        iconHovered: ''
    };

    constructor(props) {
        super(props);
        this.state.iconHovered = this.props.iconHovered || '';
    }

    UNSAFE_componentWillUpdate(nextProps, nextState) {
        if (nextProps.disabled === true && nextState.focused === true) {
            nextState.focused = false;
        }

        if (this.state.focused !== nextState.focused && nextState.focused === true) {
            $('.conversationsApp, .join-meeting, .main-blur-block')
                .rebind('mousedown.button' + this.getUniqueId(), this.onBlur);

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
        if (React.Children.count(this.props.children) < 1) {
            return null;
        }

        return React.Children.map(this.props.children, child => {
            if (!child) {
                return;
            }
            if (typeof child.type === 'string' || typeof child.type === 'undefined') {
                // DOM element or Raw text
                return child;
            }

            return React.cloneElement(child, {
                active: this.state.focused,
                closeDropdown: () => {
                    this.setState({ focused: false });
                    this.unbindEvents();
                },
                onActiveChange: newVal => {
                    const $element = $(this.domRef?.current);
                    const $scrollables = $element.parents('.ps');
                    if ($scrollables.length > 0) {
                        $scrollables.map((k, element) => Ps[newVal ? 'disable' : 'enable'](element));
                    }
                    if (child.props.onActiveChange) {
                        child.props.onActiveChange(newVal);
                    }
                }
            });
        });
    }

    onBlur = e => {
        if (!this.isMounted()) {
            return;
        }

        if (!e || !$(e.target).closest(this.buttonClass).is(this.domRef?.current)) {
            this.setState({ focused: false }, () => {
                this.unbindEvents();
                this.safeForceUpdate();
            });
        }
    };

    unbindEvents() {
        $(document).off('keyup.button' + this.getUniqueId());
        $(document).off('closeDropdowns.' + this.getUniqueId());
        $('.conversationsApp, .join-meeting, .main-blur-block').unbind('mousedown.button' + this.getUniqueId());

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
            $(e.target).closest('.popup').closest(this.buttonClass).is(this.domRef?.current) &&
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
                this.props.onClick(this, e);
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
        const {
            className,
            disabled,
            style,
            icon,
            iconHovered,
            label,
            attrs,
            toggle,
            secondLabel,
            secondLabelClass
        } = this.props;
        const isMegaButton = className && className.indexOf('mega-button') > -1;
        const TagName = isMegaButton ? 'button' : 'div';

        return (
            <TagName
                ref={this.domRef}
                className={`
                    button
                    ${className || ''}
                    ${disabled ? 'disabled' : ''}
                    ${this.state.focused ? 'active active-dropdown' : ''}
                `}
                style={style}
                onClick={this.onClick}
                onMouseEnter={() => iconHovered && this.setState({ hovered: true })}
                onMouseLeave={() => iconHovered && this.setState({ hovered: false })}
                {...attrs}>
                {icon && !isMegaButton && (
                    <div>
                        <i className={this.state.hovered ? this.state.iconHovered : icon} />
                    </div>
                )}
                {icon && isMegaButton && (
                    <div>
                        <i className={this.state.hovered ? this.state.iconHovered : icon} />
                    </div>
                )}
                {label && <span>{label}</span>}
                {secondLabel && <span className={secondLabelClass ? secondLabelClass : ''}>{secondLabel}</span>}
                {toggle && (
                    <div
                        className={`
                            mega-switch
                            ${toggle.className ? toggle.className : ''}
                            ${toggle.enabled ? 'toggle-on' : ''}
                        `}
                        role="switch"
                        aria-checked={!!toggle.enabled}
                        onClick={(ev) => {
                            ev.stopPropagation();
                            if (this.props.toggle.onClick) {
                                this.props.toggle.onClick();
                            }
                        }}>
                        <div
                            className={
                                `mega-feature-switch sprite-fm-mono-after
                                ${toggle.enabled ? 'icon-check-after' : 'icon-minimise-after'}`
                            }
                        />
                    </div>
                )}
                {this.renderChildren()}
            </TagName>
        );
    }
}
