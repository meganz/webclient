import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import Button from './button.jsx';
import Call from './call.jsx';

export default class ModeSwitch extends MegaRenderMixin {
    static NAMESPACE = 'modeSwitch';
    static BASE_CLASS = 'mode';

    containerRef = React.createRef();

    constructor(props) {
        super(props);
    }

    state = {
        expanded: false
    };

    toggleEvents = () =>
        this.state.expanded ?
            $(document)
                .rebind(`mousedown.${ModeSwitch.NAMESPACE}`, ev =>
                    !this.containerRef.current.contains(ev.target) && this.doToggle()
                )
                .rebind(`keydown.${ModeSwitch.NAMESPACE}`, ({ keyCode }) =>
                    keyCode && keyCode === 27 /* ESC */ && this.doToggle()
                ) :
            $(document).unbind(`.${ModeSwitch.NAMESPACE}`);

    doToggle = () => this.setState(state => ({ expanded: !state.expanded }), () => this.toggleEvents());

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

    render() {
        const { Toggle, Option } = this;

        return (
            <div
                ref={this.containerRef}
                className={ModeSwitch.BASE_CLASS}>
                <Toggle />
                <div
                    className={`
                        ${ModeSwitch.BASE_CLASS}-menu
                        ${this.state.expanded ? 'expanded' : ''}
                    `}>
                    <Option label={l.main_view /* `Main view` */} mode={Call.MODE.SPEAKER} />
                    <Option label={l.thumbnail_view /* `Thumbnail view` */} mode={Call.MODE.THUMBNAIL} />
                </div>
            </div>
        );
    }
}
