import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { MODE } from './call.jsx';
import { STREAMS_PER_PAGE } from './stream.jsx';

export default class ModeSwitch extends MegaRenderMixin {
    static NAMESPACE = 'modeSwitch';
    static BASE_CLASS = 'mode';

    containerRef = React.createRef();

    state = {
        expanded: false,
        settings: false
    };

    handleMousedown = ({ target }) => {
        if (this.state.expanded || this.state.settings) {
            return this.containerRef?.current?.contains(target) ? null : this.doClose();
        }
    };

    handleKeydown = ({ keyCode }) => keyCode && keyCode === 27 /* ESC */ && this.doClose();

    doClose = () =>
        this.isMounted() &&
        this.setState({ expanded: false, settings: false }, () => this.props.setActiveElement(this.state.expanded));

    doToggle = () =>
        this.isMounted() &&
        this.setState(
            state => ({ expanded: !state.expanded }),
            () => this.props.setActiveElement(this.state.expanded || this.state.settings)
        );

    setStreamsPerPage = streamsPerPage => {
        if (streamsPerPage) {
            this.props.onStreamsPerPageChange?.(streamsPerPage);
            this.doClose();
        }
    };

    getModeIcon = mode => {
        switch (mode) {
            case MODE.THUMBNAIL:
                return 'grid-9';
            case MODE.MAIN:
                return 'grid-main';
            default:
                return null;
        }
    };

    Toggle = () => {
        const { mode } = this.props;
        return (
            <div
                className={`${ModeSwitch.BASE_CLASS}-toggle`}
                onClick={this.doToggle}>
                <Button>
                    <i className={`sprite-fm-mono ${this.getModeIcon(mode)}`} />
                    {mode === MODE.THUMBNAIL && <div>{l.thumbnail_view /* `Thumbnail view` */}</div>}
                    {mode === MODE.MAIN && <div>{l.main_view /* `Main view` */}</div>}
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

    Settings = () => {
        const { streamsPerPage } = this.props;

        return (
            <div className={`${ModeSwitch.BASE_CLASS}-settings`}>
                <div className="settings-wrapper">
                    <strong>{l.layout_settings_heading /* `Layout settings` */}</strong>
                    <span>{l.layout_settings_info}</span>
                    <div className="recurring-radio-buttons">
                        <div className="recurring-label-wrap">
                            <div
                                className={`
                                    uiTheme
                                    ${streamsPerPage === STREAMS_PER_PAGE.MIN ? 'radioOn' : 'radioOff'}
                                `}>
                                <input
                                    type="radio"
                                    name="9"
                                    onClick={() => this.setStreamsPerPage(STREAMS_PER_PAGE.MIN)}
                                />
                            </div>
                            <div className="radio-txt">
                                <span
                                    className="recurring-radio-label"
                                    onClick={() => this.setStreamsPerPage(STREAMS_PER_PAGE.MIN)}>
                                    9
                                </span>
                            </div>
                        </div>
                        <div className="recurring-label-wrap">
                            <div
                                className={`
                                    uiTheme
                                    ${streamsPerPage === STREAMS_PER_PAGE.MED ? 'radioOn' : 'radioOff'}
                                `}>
                                <input
                                    type="radio"
                                    name="21"
                                    onClick={() => {
                                        this.setStreamsPerPage(STREAMS_PER_PAGE.MED);
                                    }}
                                />
                            </div>
                            <div className="radio-txt">
                                <span
                                    className="recurring-radio-label"
                                    onClick={() => this.setStreamsPerPage(STREAMS_PER_PAGE.MED)}>
                                    21
                                </span>
                            </div>
                        </div>
                        <div className="recurring-label-wrap">
                            <div
                                className={`
                                    uiTheme
                                    ${streamsPerPage === STREAMS_PER_PAGE.MAX ? 'radioOn' : 'radioOff'}
                                `}>
                                <input
                                    type="radio"
                                    name="49"
                                    onClick={() => {
                                        this.setStreamsPerPage(STREAMS_PER_PAGE.MAX);
                                    }}
                                />
                            </div>
                            <div className="radio-txt">
                                <span
                                    className="recurring-radio-label"
                                    onClick={() => this.setStreamsPerPage(STREAMS_PER_PAGE.MAX)}>
                                    49
                                </span>
                            </div>
                        </div>
                    </div>
                    <small>{l.layout_settings_warning}</small>
                </div>
                <div className="settings-close">
                    <i
                        className="sprite-fm-mono icon-dialog-close"
                        onClick={this.doClose}
                    />
                </div>
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
        const { Toggle, Option, Settings, containerRef, state, doToggle } = this;

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
                    <Option label={l.main_view /* `Main view` */} mode={MODE.MAIN} />
                    <Option label={l.thumbnail_view /* `Thumbnail view` */} mode={MODE.THUMBNAIL} />
                    <div
                        className={`${ModeSwitch.BASE_CLASS}-option`}
                        onClick={() => this.setState({ settings: true }, doToggle)}>
                        <Button>
                            <i className="sprite-fm-mono icon-settings" />
                            <div>{l.layout_settings_button /* `Layout settings` */}</div>
                        </Button>
                    </div>
                </div>
                {state.settings && <Settings />}
            </div>
        );
    }
}
