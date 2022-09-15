var React = require("react");
var ReactDOM = require("react-dom");

import { ContactAwareComponent, MegaRenderMixin, schedule, SoonFcWrap } from "../chat/mixins";

/**
 * A trick copied from http://jamesknelson.com/rendering-react-components-to-the-document-body/
 * so that we can render Dialogs into the body or other child element, different then the current component's child.
 */
class RenderTo extends React.Component {
    componentDidMount() {
        if (super.componentDidMount) {
            super.componentDidMount();
        }
        this.popup = document.createElement("div");
        this._setClassNames();
        if (this.props.style) {
            $(this.popup).css(this.props.style);
        }
        this.props.element.appendChild(this.popup);
        var self = this;
        this._renderLayer(function() {
            if (self.props.popupDidMount) {
                self.props.popupDidMount(self.popup);
            }
        });
    }
    componentDidUpdate() {
        this._setClassNames();
        this._renderLayer();
    }
    componentWillUnmount() {
        if (super.componentWillUnmount) {
            super.componentWillUnmount();
        }
        ReactDOM.unmountComponentAtNode(this.popup);
        if (this.props.popupWillUnmount) {
            this.props.popupWillUnmount(this.popup);
        }
        this.props.element.removeChild(this.popup);
    }
    _setClassNames() {
        this.popup.className = this.props.className ? this.props.className : "";
    }
    _renderLayer(cb) {
        ReactDOM.render(this.props.children, this.popup, cb);
    }
    render() {
        // Render a placeholder
        return null;
    }
};

export const withOverflowObserver = Component =>
    class extends ContactAwareComponent {
        displayName = 'OverflowObserver';
        ref = React.createRef();

        state = {
            overflowed: false
        };

        constructor(props) {
            super(props);
            this.handleMouseEnter = this.handleMouseEnter.bind(this);
        }

        handleMouseEnter() {
            const element = this.ref && this.ref.current;
            if (element) {
                this.setState({ overflowed: element.scrollWidth > element.offsetWidth });
            }
        }

        shouldComponentUpdate(nextProps, nextState) {
            return (
                nextState.overflowed !== this.state.overflowed ||
                (nextProps.children !== this.props.children || nextProps.content !== this.props.content)
            );
        }

        render() {
            const { simpletip } = this.props;

            return (
                <div
                    ref={this.ref}
                    className={`
                        overflow-observer
                        ${this.state.overflowed ? 'simpletip simpletip-tc' : ''}
                    `}
                    data-simpletipposition={simpletip?.position || 'top'}
                    data-simpletipoffset={simpletip?.offset}
                    data-simpletip-class={simpletip?.className || 'medium-width center-align'}
                    onMouseEnter={this.handleMouseEnter}>
                    <Component {...this.props} />
                </div>
            );
        }
    };

export const Emoji = ({ children }) => {
    return <ParsedHTML content={megaChat.html(children)} />;
};

export class ParsedHTML extends React.Component {
    ref = React.createRef();

    updateInternalState() {
        const { children, content } = this.props;
        const ref = this.ref && this.ref.current;

        if (!children && !content) {
            return d > 1 && console.warn('Emoji: No content passed.');
        }

        if (ref) {
            if (ref.childNodes.length) {
                while (ref.firstChild) {
                    ref.removeChild(ref.firstChild);
                }
            }
            ref.appendChild(parseHTML(children || content));
        }
    }

    shouldComponentUpdate(nextProps) {
        return (
            nextProps && (nextProps.children !== this.props.children || nextProps.content !== this.props.content)
        );
    }

    componentDidUpdate() {
        this.updateInternalState();
    }

    componentDidMount() {
        this.updateInternalState();
    }

    render() {
        const { className, onClick, tag } = this.props;
        const Tag = tag || 'span';

        return (
            <Tag
                ref={this.ref}
                className={className}
                onClick={onClick}
            />
        );
    }
}

export const OFlowEmoji = withOverflowObserver(Emoji);
export const OFlowParsedHTML = withOverflowObserver(ParsedHTML);

export default {
    RenderTo,
    schedule,
    SoonFcWrap,
    OFlowEmoji,
    OFlowParsedHTML,
};
