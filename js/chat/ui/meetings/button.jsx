import React from 'react';
import { MegaRenderMixin } from '../../mixins';

class Group extends MegaRenderMixin {
    static NAMESPACE = 'buttonGroup';
    static BASE_CLASS = 'button-group';

    containerRef = React.createRef();

    state = {
        expanded: false
    };

    constructor(props) {
        super(props);
        this.doToggle = this.doToggle.bind(this);
    }

    toggleEvents() {
        return (
            this.state.expanded ?
                $(document)
                    .rebind(`mousedown.${Group.NAMESPACE}`, ev =>
                        !this.containerRef.current.contains(ev.target) && this.doToggle()
                    )
                    .rebind(`keydown.${Group.NAMESPACE}`, ({ keyCode }) =>
                        keyCode && keyCode === 27 /* ESC */ && this.doToggle()
                    ) :
                $(document).unbind(`.${Group.NAMESPACE}`)

        );
    }

    doToggle() {
        this.setState(state => ({ expanded: !state.expanded }), () =>
            this.toggleEvents()
        );
    }

    render() {
        const { active, warn, onHold, screenSharing, children } = this.props;

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
                        {children.map(item => {
                            return item && (
                                <div
                                    key={item.key}
                                    className={`${Group.BASE_CLASS}-item`}>
                                    {item}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        className="mega-button theme-light-forced round large"
                        onClick={this.doToggle}>
                        {active && <div className="info-indicator active" />}
                        {warn && (
                            <div
                                className="info-indicator warn simpletip"
                                data-simpletip={l.screen_share_crop_tip /* `Screen sharing may crop your window` */}
                                data-simpletipposition="top"
                                data-simpletipoffset="5"
                                data-simpletip-class="theme-dark-forced">
                                <div className="sprite-fm-mono icon-exclamation-filled" />
                            </div>
                        )}
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

    componentDidUpdate() {
        super.componentDidUpdate();
        if (this.props.simpletip) {
            $(this.buttonRef.current).trigger('simpletipUpdated');
        }
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.didMount) {
            this.props.didMount(this);
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
