var React = require("react");
import utils from './utils.jsx';
import MegaRenderMixin from "../stores/mixins.js";
import {ContactPickerWidget} from './../chat/ui/contacts.jsx';

export class Dropdown extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'requiresUpdateOnResize': true,
    };

    constructor (props) {
        super(props);
        this.onActiveChange = this.onActiveChange.bind(this);
        this.onResized = this.onResized.bind(this);
    }

    componentWillUpdate (nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            this.onActiveChange(nextProps.active)
        }
    }

    specificShouldComponentUpdate (nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            if (this.props.onBeforeActiveChange) {
                this.props.onBeforeActiveChange(nextProps.active);
            }
            return true;
        } else if (this.props.focused != nextProps.focused) {
            return true;
        } else if (this.state && this.state.active != nextState.active) {
            return true;
        } else {
            // not sure, leave to the render mixing to decide.
            return undefined;
        }
    }

    onActiveChange (newVal) {
        if (this.props.onActiveChange) {
            this.props.onActiveChange(newVal);
        }
    }

    onResized () {
        var self = this;
        if (this.props.active === true) {
            if (this.popupElement) {
                var $element = $(this.popupElement);
                var positionToElement = $('.button.active:visible');
                var offsetLeft = 0;
                var $container = positionToElement.closest('.messages.scroll-area');

                if ($container.length == 0) {
                    $container = $(document.body);
                }

                $element.css('margin-left', '');

                $element.position({
                    of: positionToElement,
                    my: self.props.positionMy ? self.props.positionMy : "center top",
                    at: self.props.positionAt ? self.props.positionAt : "center bottom",
                    collision: "flipfit",
                    within: $container,
                    using: function (obj, info) {
                        var vertOffset = 0;
                        var horizOffset = 0;

                        if (!self.props.noArrow) {
                            var $arrow = $('.dropdown-white-arrow', $element);
                            var arrowHeight;
                            if (self.props.arrowHeight) {
                                arrowHeight = self.props.arrowHeight;
                                if (info.vertical !== "top") {
                                    arrowHeight = arrowHeight * -1;
                                } else {
                                    arrowHeight = 0;
                                }
                            } else {
                                arrowHeight = $arrow.outerHeight();
                            }
                            if (info.vertical != "top") {
                                $(this)
                                    .removeClass("up-arrow")
                                    .addClass("down-arrow");
                            } else {
                                $(this)
                                    .removeClass("down-arrow")
                                    .addClass("up-arrow");
                            }

                            vertOffset += (
                                info.vertical == "top" ? arrowHeight : 0
                            );
                        }


                        if (self.props.vertOffset) {
                            vertOffset += (self.props.vertOffset * (info.vertical == "top" ? 1 : -1));
                        }

                        if (self.props.horizOffset) {
                            horizOffset += self.props.horizOffset;
                        }


                        $(this).css({
                            left: (obj.left + (offsetLeft ? offsetLeft / 2 : 0) + horizOffset) + 'px',
                            top: (obj.top + vertOffset + 'px')
                        });
                    }
                });
            }
        }
    }

    componentDidMount () {
        super.componentDidMount();
        $(window).rebind('resize.drpdwn' + this.getUniqueId(), this.onResized);
        this.onResized();
        var self = this;
        $(document.body).rebind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId(), function (e, target) {
            if (self.props.active && target !== self) {
                if (self.props && self.props.closeDropdown) {
                    self.props.closeDropdown();
                }
            }
        });
    }

    componentDidUpdate () {
        this.onResized();
    }

    componentWillUnmount () {
        super.componentWillUnmount();
        $(document.body).unbind('closeAllDropdownsExcept.drpdwn' + this.getUniqueId());
        if (this.props.active) {
            // fake an active=false so that any onActiveChange handlers would simply trigger back UI to the state
            // in which this element is not active any more (since it would be removed from the DOM...)
            this.onActiveChange(false);
        }
        $(window).unbind('resize.drpdwn' + this.getUniqueId());
    }

    doRerender () {
        var self = this;

        setTimeout(function () {
            self.safeForceUpdate();
        }, 100);

        // idb + DOM updates = delayed update so .onResized won't properly reposition the DOM node using $.position,
        // so we need to manually call this
        setTimeout(function () {
            self.onResized();
        }, 200);
    }

    renderChildren () {
        var self = this;

        return React.Children.map(this.props.children, function (child) {
            if (child) {
                var activeVal = self.props.active || self.state.active;
                activeVal = String(activeVal);

                return React.cloneElement(child, {
                    active: activeVal
                });
            } else {
                return null;
            }
        }.bind(this))
    }

    render () {
        if (this.props.active !== true) {
            return null;
        } else {
            var classes = (
                "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className
            );

            var styles;

            // calculate and move the popup arrow to the correct position.
            if (this.popupElement) {
                styles = {
                    'zIndex': 123,
                    'position': 'absolute',
                    'width': this.props.styles ? this.props.styles.width : undefined
                };
            }

            var self = this;

            var child = null;

            if (this.props.children) {
                child = <div>{self.renderChildren()}</div>;
            } else if (this.props.dropdownItemGenerator) {
                child = this.props.dropdownItemGenerator(this);
            }

            if (!child && !this.props.forceShowWhenEmpty) {
                if (this.props.active !== false) {
                    (window.setImmediate || window.setTimeout)(function () {
                        self.onActiveChange(false);
                    });
                }
                return null;
            }


            return <utils.RenderTo element={document.body} className={classes} style={styles}
                                   popupDidMount={(popupElement) => {
                                       self.popupElement = popupElement;
                                       self.onResized();
                                   }}
                                   popupWillUnmount={(popupElement) => {
                                       delete self.popupElement;
                                   }}>
                <div onClick={function (e) {
                    $(document.body).trigger('closeAllDropdownsExcept', self);
                }}>
                    {!this.props.noArrow ? <i className="dropdown-white-arrow"></i> : null}
                    {child}
                </div>
            </utils.RenderTo>;
        }
    }
};

export class DropdownContactsSelector extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        requiresUpdateOnResize: true
    };

    constructor(props) {
        super(props);
        this.state = {
            'selected': this.props.selected ? this.props.selected : []
        }
        this.onSelectClicked = this.onSelectClicked.bind(this);
        this.onSelected = this.onSelected.bind(this);
    }
    specificShouldComponentUpdate(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            return true;
        }
        else if (this.props.focused != nextProps.focused) {
            return true;
        }
        else if (this.state && this.state.active != nextState.active) {
            return true;
        }
        else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
            return true;
        }
        else {
            // not sure, leave to the render mixing to decide.
            return undefined;
        }
    }
    onSelected(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
        this.forceUpdate();
    }
    onSelectClicked() {
        this.props.onSelectClicked();
    }
    render() {
        var self = this;

        return <Dropdown className={"popup contacts-search " + this.props.className + " tooltip-blur"}
                         active={this.props.active}
                         closeDropdown={this.props.closeDropdown}
                         ref="dropdown"
                         positionMy={this.props.positionMy}
                         positionAt={this.props.positionAt}
                         arrowHeight={this.props.arrowHeight}
                         vertOffset={this.props.vertOffset}
                >
                <ContactPickerWidget
                    active={this.props.active}
                    className="popup contacts-search tooltip-blur small-footer"
                    contacts={this.props.contacts}
                    selectFooter={this.props.selectFooter}
                    megaChat={this.props.megaChat}
                    exclude={this.props.exclude}
                    allowEmpty={this.props.allowEmpty}
                    multiple={this.props.multiple}
                    showTopButtons={this.props.showTopButtons}
                    onSelectDone={this.props.onSelectDone}
                    multipleSelectedButtonLabel={this.props.multipleSelectedButtonLabel}
                    singleSelectedButtonLabel={this.props.singleSelectedButtonLabel}
                    nothingSelectedButtonLabel={this.props.nothingSelectedButtonLabel}
                    />
        </Dropdown>;
    }
};

export class DropdownItem extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        requiresUpdateOnResize: true
    };
    constructor(props) {
        super(props);
        this.state = {'isClicked': false};
        this.onClick = this.onClick.bind(this);
        this.onMouseOver = this.onMouseOver.bind(this);
    }
    renderChildren() {
        var self = this;
        return React.Children.map(this.props.children, function (child) {
            var props = {
                active: self.state.isClicked,
                closeDropdown: function() {
                    self.setState({'isClicked': false});
                }
            };
            return React.cloneElement(child, props);
        }.bind(this))
    }
    onClick(e) {
        var self = this;

        if (this.props.children) {
            self.setState({'isClicked': !self.state.isClicked});

            e.stopPropagation();
            e.preventDefault();
        }
    }
    onMouseOver(e) {
        var self = this;

        if (this.props.className === "contains-submenu") {
            var $contextItem = $(e.target).closest(".contains-submenu");
            var $subMenu = $contextItem.next('.submenu');
            var contextTopPos = $contextItem.position().top;
            var contextleftPos = 0;

            $contextItem.addClass("opened");
            $subMenu.addClass("active");

            contextleftPos = $contextItem.offset().left +
                $contextItem.outerWidth() + $subMenu.outerWidth() +10;

            if (contextleftPos > $(document.body).width()) {
                $subMenu.addClass("left-position");
            }

            $subMenu.css({
                "top": contextTopPos
            });
        }
        else if (!$(e.target).parent('.submenu').length) {
            var $dropdown = $(e.target).closest(".dropdown.body");
            $dropdown.find(".contains-submenu").removeClass("opened");
            $dropdown.find(".submenu").removeClass("active");
        }
    }
    render() {
        const self = this;

        let icon;
        if (self.props.icon) {
            icon = <i className={"small-icon " + self.props.icon}></i>
        }
        let label;
        if (self.props.label) {
            label = self.props.label;
        }

        let child = null;

        child = <div>
                {self.renderChildren()}
            </div>;

        return <div
                    className={`dropdown-item ${self.props.className ? self.props.className : ''}`}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        !self.props.disabled && self.props.onClick(e);
                    } : self.onClick}
                    onMouseOver={self.onMouseOver}
                >
                    {icon}
                    <span>{label}</span>
                    {child}
                </div>;
    }
};
