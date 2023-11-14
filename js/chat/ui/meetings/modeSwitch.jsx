import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import Call from './call.jsx';

export default class ModeSwitch extends MegaRenderMixin {
    static NAMESPACE = 'modeSwitch';
    static BASE_CLASS = 'mode';

    containerRef = React.createRef();

    state = {
        expanded: false
    };

    handleMousedown = ({ target }) =>
        this.containerRef &&
        this.containerRef.current &&
        this.containerRef.current.contains(target) ? null : this.doClose();

    handleKeydown = ({ keyCode }) => keyCode && keyCode === 27 /* ESC */ && this.doClose();

    doClose = () => this.isMounted() && this.setState({ expanded: false });

    doToggle = () => this.isMounted() && this.setState(state => ({ expanded: !state.expanded }));

    getModeIcon = mode => {
        switch (mode) {
            case Call.MODE.THUMBNAIL:
                return 'icon-thumbnail-view';
            case Call.MODE.SPEAKER:
                return 'icon-speaker-view';
            default:
                return null;
        }
    }

    Toggle = () => {
        const { mode } = this.props;
        return (
            <div
                className={`${ModeSwitch.BASE_CLASS}-toggle`}
                onClick={this.doToggle}>
                <Button>
                    <i className={`sprite-fm-mono ${this.getModeIcon(mode)}`} />
                    {mode === Call.MODE.THUMBNAIL && <div>{l.thumbnail_view /* `Thumbnail view` */}</div>}
                    {mode === Call.MODE.SPEAKER && <div>{l.main_view /* `Main view` */}</div>}
                </Button>
                <i className="sprite-fm-mono icon-arrow-down" />
            </div>
        );
    };

    Option = ({ label, mode }) => {
        return (
            <div
                className={`
                    ${ModeSwitch.BASE_CLASS}-option
                    ${mode === this.props.mode ? 'active' : ''}
                `}
                onClick={() => {
                    this.doToggle();
                    this.props.onModeChange(mode);
                }}>
                <Button>
                    <i className={`sprite-fm-mono ${this.getModeIcon(mode)}`} />
                    <div>{label}</div>
                </Button>
            </div>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('mousedown', this.handleMousedown);
        document.removeEventListener('keydown', this.handleKeydown);
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('mousedown', this.handleMousedown);
        document.addEventListener('keydown', this.handleKeydown);
    }

    render() {
        const { Toggle, Option, containerRef, state } = this;
        return (
            <div
                ref={containerRef}
                className={ModeSwitch.BASE_CLASS}>
                <Toggle />
                <div
                    className={`
                        ${ModeSwitch.BASE_CLASS}-menu
                        ${state.expanded ? 'expanded' : ''}
                    `}>
                    <Option label={l.main_view /* `Main view` */} mode={Call.MODE.SPEAKER} />
                    <Option label={l.thumbnail_view /* `Thumbnail view` */} mode={Call.MODE.THUMBNAIL} />
                </div>
            </div>
        );
    }
}
