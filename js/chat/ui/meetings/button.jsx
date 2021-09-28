import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';

class Group extends MegaRenderMixin {
    static NAMESPACE = 'buttonGroup'
    static BASE_CLASS = 'button-group'

    containerRef = React.createRef();

    state = {
        expanded: false
    };

    constructor(props) {
        super(props);
    }

    //  TODO: Look into abstracting `doToggle` and `toggleEvents` with `ModeSwitch`

    toggleEvents = () =>
        this.state.expanded ?
            $(document)
                .rebind(`mousedown.${Group.NAMESPACE}`, ev =>
                    !this.containerRef.current.contains(ev.target) && this.doToggle()
                )
                .rebind(`keydown.${Group.NAMESPACE}`, ({ keyCode }) =>
                    keyCode && keyCode === 27 /* ESC */ && this.doToggle()
                ) :
            $(document).unbind(`.${Group.NAMESPACE}`);

    doToggle = () => this.setState(state => ({ expanded: !state.expanded }), () => this.toggleEvents());

    render() {
        const { active, onHold, screenSharing, children } = this.props;

        if (children && children.length) {
            return (
                <div
                    ref={this.containerRef}
                    className={Group.BASE_CLASS}>
                    <div
                        className={`
                            ${Group.BASE_CLASS}-menu
                            ${this.state.expanded ? 'expanded' : ''}
                        `}
                        onClick={this.doToggle}>
                        {children.map((item, index) =>
                            <div
                                key={index}
                                className={`${Group.BASE_CLASS}-item`}>
                                {item}
                            </div>
                        )}
                    </div>
                    <button
                        className="mega-button theme-light-forced round large"
                        onClick={this.doToggle}>
                        {active && <div className="active-indicator" />}
                        <i
                            className={`
                                sprite-fm-mono
                                ${screenSharing ? 'icon-end-screenshare' : ''}
                                ${!onHold && !screenSharing && 'icon-options'}
                            `}
                        />
                    </button>
                </div>
            );
        }

        return null;
    }
}

class Button extends MegaRenderMixin {
    buttonRef = React.createRef();

    constructor(props) {
        super(props);
    }

    componentDidUpdate() {
        super.componentDidUpdate();
        if (this.props.simpletip) {
            $(this.buttonRef.current).trigger('simpletipUpdated');
        }
    }

    render() {
        const { children, className, style, simpletip, icon, onClick } = this.props;

        return (
            <button
                ref={this.buttonRef}
                className={`
                    ${className ? className : ''}
                    ${simpletip ? 'simpletip' : ''}
                `}
                style={style}
                data-simpletip={simpletip?.label}
                data-simpletipposition={simpletip?.position}
                data-simpletipoffset={simpletip?.offset}
                data-simpletip-class={simpletip?.className}
                onClick={onClick}>
                {icon && <i className={`sprite-fm-mono ${icon}`} />}
                {children}
            </button>
        );
    }
}

Button.Group = Group;
export default Button;
