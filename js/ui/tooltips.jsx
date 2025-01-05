var React = require("react");
import {MegaRenderMixin} from "../chat/mixins";


class Handler extends React.Component {
    render() {
        const { className, onMouseOver, onMouseOut, children } = this.props;
        return (
            <span
                className={`
                    tooltip-handler
                    ${className || ''}
                `}
                onMouseOver={onMouseOver}
                onMouseOut={onMouseOut}>
                {children}
            </span>
        );
    }
}

class Contents extends React.Component {
    render() {
        var className = 'tooltip-contents dropdown body tooltip ' + (this.props.className ? this.props.className : "");

        if (this.props.active) {
            className += " visible";

            return <div className={className}>
                {(
                    this.props.withArrow ? <i className="dropdown-white-arrow"></i> : null
                )}
                {this.props.children}
            </div>;
        }
        else {
            return null;
        }
    }
}


class Tooltip extends MegaRenderMixin {
    domRef = React.createRef();

    constructor (props) {
        super(props);
        this.state = {
            'active': false
        };
    }
    static defaultProps = {
        'hideable': true
    };
    componentDidUpdate(oldProps, oldState) {
        var self = this;
        if (oldState.active === true && this.state.active === false) {
            chatGlobalEventManager.removeEventListener('resize', 'tooltip' + this.getUniqueId());
        }
        if(self.state.active === true) {
            self.repositionTooltip();
            chatGlobalEventManager.addEventListener('resize', 'tooltip' + this.getUniqueId(), function() {
                self.repositionTooltip();
            });
            if (this.props.onShown) {
                this.props.onShown();
            }
        }
    }
    repositionTooltip() {
        var elLeftPos, elTopPos, elWidth, elHeight;
        var tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
        var docHeight;
        var arrowClass;

        if (!this.isMounted()) {
            return;
        }

        var $container = $(this.domRef?.current);
        var $el = $('.tooltip-handler', $container);
        var $tooltip = $('.tooltip-contents', $container);

        var tooltipOffset = this.props.tooltipOffset;
        var arrow = this.props.withArrow;

        if ($el && $tooltip) {
            elWidth = $el.outerWidth();
            elHeight = $el.outerHeight();
            elLeftPos = $el.offset().left;
            elTopPos = $el.offset().top;
            tooltipWidth = $tooltip.outerWidth();
            tooltipHeight = $tooltip.outerHeight();
            docHeight = $(window).height();
            $tooltip.removeClass('dropdown-arrow left-arrow right-arrow up-arrow down-arrow').removeAttr('style');

            // Default Tooltip offset
            if (!tooltipOffset) {
                tooltipOffset = 7;
            }

            if (elTopPos - tooltipHeight - tooltipOffset > 10) {
                tooltipLeftPos = elLeftPos + elWidth/2 - tooltipWidth/2;
                tooltipTopPos = elTopPos - tooltipHeight - tooltipOffset;
                arrowClass = arrow ? 'dropdown-arrow down-arrow' : '';
            }
            else if (docHeight - (elTopPos + elHeight + tooltipHeight + tooltipOffset) > 10) {
                tooltipLeftPos = elLeftPos + elWidth/2 - tooltipWidth/2;
                tooltipTopPos = elTopPos + elHeight + tooltipOffset;
                arrowClass = arrow ? 'dropdown-arrow up-arrow' : '';
            }
            else if (elLeftPos - tooltipWidth - tooltipOffset > 10) {
                tooltipLeftPos = elLeftPos - tooltipWidth - tooltipOffset;
                tooltipTopPos = elTopPos + elHeight/2 - tooltipHeight/2;
                arrowClass = arrow ? 'dropdown-arrow right-arrow' : '';
            }
            else {
                tooltipLeftPos = elLeftPos + elWidth + tooltipOffset;
                tooltipTopPos = elTopPos + elHeight/2 - tooltipHeight/2;
                arrowClass = arrow ? 'dropdown-arrow left-arrow' : '';
            }

            $tooltip.css({
                'left': tooltipLeftPos,
                'top': tooltipTopPos -5 // avoid image preview flashing due to arrow position
            });
            $tooltip.addClass(arrowClass);
        }
    }
    onHandlerMouseOver() {
        this.setState({'active': true});
    }
    onHandlerMouseOut() {
        this.setState({'active': false});
    }
    render() {
        var self = this;

        var others = [];
        var handler = null;
        var contents = null;

        var x = 0;
        React.Children.forEach(this.props.children, function (child) {
            if (child.type.name === 'Handler') {
                handler = React.cloneElement(child, {
                    onMouseOver: function(e) {
                        self.onHandlerMouseOver();
                    },
                    onMouseOut:function(e) {
                        self.onHandlerMouseOut();
                    }
                });
            }
            else if (child.type.name === 'Contents') {
                contents = React.cloneElement(child, {
                    active: self.state.active,
                    withArrow: self.props.withArrow
                });
            }
            else {
                var tmp = React.cloneElement(child, {
                    key: x++
                });
                others.push(tmp);
            }

        });

        return (
            <span
                ref={this.domRef}
                className={this.props.className || ''}>
                {handler}
                {contents}
                {others}
            </span>
        );
    }
}

export default {
    Tooltip,
    Handler,
    Contents
};
