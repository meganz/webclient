var React = require("react");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var ContactsUI = require('./../chat/ui/contacts.jsx');
var PerfectScrollbar = require('./perfectScrollbar.jsx').PerfectScrollbar;

var Dropdown = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getInitialState: function() {
        return {}
    },
    getDefaultProps: function() {
        return {
            'requiresUpdateOnResize': true,
        };
    },
    componentWillUpdate: function(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            this.onActiveChange(nextProps.active)
        }
    },
    specificShouldComponentUpdate: function(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            if (this.props.onBeforeActiveChange) {
                this.props.onBeforeActiveChange(nextProps.active);
            }
            return true;
        }
        else if (this.props.focused != nextProps.focused) {
            return true;
        }
        else if (this.state && this.state.active != nextState.active) {
            return true;
        }
        else {
            // not sure, leave to the render mixing to decide.
            return undefined;
        }
    },
    onActiveChange: function(newVal) {
        if (this.props.onActiveChange) {
            this.props.onActiveChange(newVal);
        }
    },
    onResized: function() {
        var self = this;

        if (this.props.active === true) {
            if (this.getOwnerElement()) {
                var $element = $(this.popupElement);
                var positionToElement = $('.button.active:visible');
                var offsetLeft = 0;
                var $container = positionToElement.closest('.messages.scroll-area');

                if ($container.length == 0) {
                    $container = $(document.body);
                }

                $element.css('margin-left','');

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
                                }
                                else {
                                    arrowHeight = 0;
                                }
                            }
                            else {
                                arrowHeight = $arrow.outerHeight();
                            }
                            if (info.vertical != "top") {
                                $(this)
                                    .removeClass("up-arrow")
                                    .addClass("down-arrow");
                            }
                            else {
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
                            left: (obj.left + (offsetLeft ? offsetLeft/2 : 0) + horizOffset) + 'px',
                            top: (obj.top + vertOffset + 'px')
                        });
                    }
                });
            }
        }
    },
    componentDidMount: function() {
        this.onResized();
    },
    componentDidUpdate: function() {
        this.onResized();
    },
    componentWillUnmount: function() {
        if (this.props.active) {
            // fake an active=false so that any onActiveChange handlers would simply trigger back UI to the state
            // in which this element is not active any more (since it would be removed from the DOM...)
            this.onActiveChange(false);
        }
    },
    doRerender: function() {
        var self = this;

        setTimeout(function() {
            self.safeForceUpdate();
        }, 100);

        // idb + DOM updates = delayed update so .onResized won't properly reposition the DOM node using $.position,
        // so we need to manually call this
        setTimeout(function() {
            self.onResized();
        }, 200);
    },
    renderChildren: function () {
        var self = this;

        return React.Children.map(this.props.children, function (child) {
            if (child) {
                return React.cloneElement(child, {
                    active: self.props.active || self.state.active
                });
            }
            else {
                return null;
            }
        }.bind(this))
    },
    render: function() {
        if (this.props.active !== true) {
            return null;
        }
        else {
            var classes = (
                "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className
            );

            var styles;

            // calculate and move the popup arrow to the correct position.
            if (this.getOwnerElement()) {
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
            }
            else if (this.props.dropdownItemGenerator) {
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
                    }}
                    popupWillUnmount={(popupElement) => {
                        delete self.popupElement;
                    }}>
                    <div>
                        {!this.props.noArrow ? <i className="dropdown-white-arrow"></i> : null}
                        {child}
                    </div>
                </utils.RenderTo>;
        }
    }
});


var DropdownContactsSelector = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getDefaultProps: function() {
        return {
            requiresUpdateOnResize: true
        };
    },
    getInitialState: function() {
        return {
            'selected': this.props.selected ? this.props.selected : []
        }
    },
    specificShouldComponentUpdate: function(nextProps, nextState) {
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
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
        this.forceUpdate();
    },
    onSelectClicked: function() {
        this.props.onSelectClicked();
    },
    render: function() {
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
                <ContactsUI.ContactPickerWidget
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
});

var DropdownItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getDefaultProps: function() {
        return {
            requiresUpdateOnResize: true
        };
    },
    getInitialState: function() {
        return {'isClicked': false}
    },
    renderChildren: function () {
        var self = this;
        return React.Children.map(this.props.children, function (child) {
            return React.cloneElement(child, {
                active: self.state.isClicked,
                closeDropdown: function() {
                    self.setState({'isClicked': false});
                }
            });
        }.bind(this))
    },
    onClick: function(e) {
        var self = this;

        if (this.props.children) {
            self.setState({'isClicked': !self.state.isClicked});

            e.stopPropagation();
            e.preventDefault();
        }
    },
    onMouseOver: function(e) {
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
    },
    render: function() {
        var self = this;

        var icon;
        if (this.props.icon) {
            icon = <i className={"small-icon " + this.props.icon}></i>
        }
        var label;
        if (this.props.label) {
            label = this.props.label;
        }

        var child = null;

        child = <div>
                {self.renderChildren()}
            </div>;

        return <div
                    className={"dropdown-item " + self.props.className}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        !self.props.disabled && self.props.onClick(e);
                    } : self.onClick}
                    onMouseOver={self.onMouseOver}
                >
                    {icon}
                    {label}
                    {child}
                </div>;
    }
});

module.exports = window.DropdownsUI = {
    Dropdown,
    DropdownItem,
    DropdownContactsSelector
};
