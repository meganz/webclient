var React = require("react");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var ContactsUI = require('./../chat/ui/contacts.jsx');
var EMOJILIST = require('./emojilist.jsx');
var PerfectScrollbar = require('./perfectScrollbar.jsx').PerfectScrollbar;

var Dropdown = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            requiresUpdateOnResize: true
        };
    },
    componentWillUpdate: function(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            this.onActiveChange(nextProps.active)
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
    componentDidUpdate: function() {
        var self = this;

        if (this.props.active === true) {
            if (this.getOwnerElement()) {
                var $element = $(this.popupElement);
                var parentDomNode = $element.closest('.button');
                var positionToElement = $('.button.active:visible');
                var offsetLeft = 0;
                var $container = $element.closest('.jspPane:first');

                if ($container.size() == 0) {
                    $container = $(document.body);
                }

                $element.css('margin-left','');
                $element.position({
                    of: positionToElement,
                    my: self.props.positionMy ? self.props.positionMy : "center top",
                    at: self.props.positionAt ? self.props.positionAt : "center bottom",
                    collision: "flip flip",
                    within: $container,
                    using: function (obj, info) {
                        var vertOffset = 0;
                        var horizOffset = 0;

                        if (!self.props.noArrow) {
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

                            var $arrow = $('.dropdown-white-arrow', $element);
                            vertOffset += (info.vertical == "top" ? $arrow.outerHeight() : 0);
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
    componentWillUnmount: function() {
        if (this.props.active) {
            // fake an active=false so that any onActiveChange handlers would simply trigger back UI to the state
            // in which this element is not active any more (since it would be removed from the DOM...)
            this.onActiveChange(false);
        }
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
        var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;


        if (this.props.active !== true) {
            classes += " hidden";

            return null;
        }
        else {
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

            return (
                <utils.RenderTo element={document.body} className={classes} style={styles}
                    popupDidMount={(popupElement) => {
                        self.popupElement = popupElement;
                    }}
                    popupWillUnmount={(popupElement) => {
                        delete self.popupElement;
                    }}>
                    <div>
                        {!this.props.noArrow ? <i className="dropdown-white-arrow"></i> : null}
                        {this.renderChildren()}
                    </div>
                </utils.RenderTo>
            );
        }
    }
});


var DropdownContactsSelector = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            requiresUpdateOnResize: true
        };
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
        else {
            // not sure, leave to the render mixing to decide.
            return undefined;
        }
    },
    render: function() {
        var self = this;

        return <Dropdown className={"popup contacts-search " + this.props.className} 
                         active={this.props.active} 
                         closeDropdown={this.props.closeDropdown} 
                         ref="dropdown"
                         positionMy={this.props.positionMy} 
                         positionAt={this.props.positionAt}
                >
                <ContactsUI.ContactPickerWidget
                    active={this.props.active}
                    className="popup contacts-search"
                    contacts={this.props.contacts}
                    megaChat={this.props.megaChat}
                    exclude={this.props.exclude}
                    multiple={this.props.multiple}
                    onSelectDone={this.props.onSelectDone}
                    multipleSelectedButtonLabel={this.props.multipleSelectedButtonLabel}
                    singleSelectedButtonLabel={this.props.singleSelectedButtonLabel}
                    nothingSelectedButtonLabel={this.props.nothingSelectedButtonLabel}
                    onClick={(contact, e) => {
                            this.props.onClick(contact, e);
                            this.props.closeDropdown();
                        }
                    } />
        </Dropdown>;
    }
});

var DropdownItem = React.createClass({
    mixins: [MegaRenderMixin],
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
                        self.props.onClick(e);
                    } : self.onClick}
                >
                    {icon}
                    {label}
                    {child}
                </div>;
    }
});


var DropdownEmojiSelector = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'requiresUpdateOnResize': true,
            'hideable': true
        };
    },
    getInitialState: function() {
        return {
            'previewEmoji': null,
            'searchValue': '',
            'browsingCategory': false,
            'isActive': false
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({
            searchValue: e.target.value,
            browsingCategory: false
        });
        self.refs.scrollableArea.scrollToY(0);
    },
    onUserScroll: function(
        $ps,
        elem,
        e
    ) {
        if (this.state.browsingCategory) {
            var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');
            if (!elementInViewport($cat)) {
                this.setState({'browsingCategory': false});
            }
        }
    },
    render: function() {
        var self = this;

        var categoryTranslations = {
            "PEOPLE": l[8016],
            "NATURE": l[8017],
            "FOOD & DRINK": l[8018],
            "CELEBRATION": l[8019],
            "ACTIVITY": l[8020],
            "TRAVEL & PLACES": l[8021],
            "OBJECTS & SYMBOLS": l[8022]
        };

        var popupContents = null;

        if (self.state.isActive === true) {
            var preview;
            if (self.state.previewEmoji) {
                var slug = self.state.previewEmoji;
                var emojiMeta = EMOJILIST.EMOJIS[slug];
                var txt = ":" + slug + ":";
                if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
                    txt = slug;
                }


                preview = <div className="emoji-one-preview">
                    <span className={"emoji-one demo-icon emojione-" + emojiMeta[0]}></span>
                    <div className="emoji-one title">{txt}</div>
                </div>;
            }


            var emojis = [];
            var searchValue = self.state.searchValue;

            Object.keys(EMOJILIST.EMOJI_CATEGORIES).forEach(function (categoryName) {
                var curCategoryEmojis = [];
                Object.keys(EMOJILIST.EMOJI_CATEGORIES[categoryName]).forEach(function (slug) {
                    if (searchValue.length > 0) {
                        if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
                            return;
                        }
                    }
                    var meta = EMOJILIST.EMOJIS[slug];

                    curCategoryEmojis.push(
                        <div
                            data-emoji={slug}
                            className="button square-button emoji-one" key={categoryName + "_" + slug}
                            onMouseEnter={(e) => {
                                if (self.mouseEnterTimer) {
                                    clearTimeout(self.mouseEnterTimer);
                                }

                                e.stopPropagation();
                                e.preventDefault();

                                // delay the .setState change, because of the tons of icons we've, which are
                                // re-rendered in case of .setState
                                self.mouseEnterTimer = setTimeout(function() {
                                    self.setState({'previewEmoji': slug});
                                }, 250);
                            }}
                            onMouseLeave={(e) => {
                                if (self.mouseEnterTimer) {
                                    clearTimeout(self.mouseEnterTimer);
                                }
                                e.stopPropagation();
                                e.preventDefault();

                                self.setState({'previewEmoji': null});
                            }}
                            onClick={(e) => {
                                if (self.props.onClick) {
                                    self.props.onClick(e, slug, meta);
                                }
                            }}
                        >
                        <span
                            className={"emojione-" + meta[0]}
                            title={":" + slug + ":"}>{meta[1]}</span>
                        </div>
                    );
                });

                if (curCategoryEmojis.length > 0) {
                    emojis.push(
                        <div key={categoryName} data-category-name={categoryName} className="emoji-category-container">
                            {emojis.length > 0 ? <div className="clear"></div> : null}
                            <div className="emoji-type-txt">
                                {
                                    categoryTranslations[categoryName] ?
                                        categoryTranslations[categoryName] :
                                        categoryName
                                }
                            </div>

                            <div className="clear"></div>
                            {curCategoryEmojis}
                            <div className="clear"></div>
                        </div>
                    );
                }
            });
            var categoryIcons = {
                //"FREQUENTLY USED": "clock-icon",
                "PEOPLE": "smile-icon",
                "NATURE": "sun-icon",
                "FOOD & DRINK": "wineglass-icon",
                "CELEBRATION": "present-icon",
                "ACTIVITY": "bowling-ball-icon",
                "TRAVEL & PLACES": "earth-icon",
                "OBJECTS & SYMBOLS": "percents-icon"
            };

            var categoryButtons = [];

            Object.keys(categoryIcons).forEach(function (categoryName) {
                var activeClass = self.state.browsingCategory === categoryName ? " active" : "";

                if (
                    self.state.browsingCategory === false &&
                    self.state.searchValue === '' &&
                    categoryIcons[categoryName] === "clock-icon"
                ) {
                    activeClass = " active";
                }

                categoryButtons.push(
                    <div
                        className={"button square-button emoji-one" + (activeClass)}
                        key={categoryIcons[categoryName]}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            self.setState({browsingCategory: categoryName, searchValue: ''});

                            self.refs.scrollableArea.scrollToElement(
                                $('.emoji-category-container[data-category-name="' + categoryName + '"]:visible')[0]
                            );
                        }}
                    >
                        <i className={"small-icon " + categoryIcons[categoryName]}></i>
                    </div>
                );
            });

            popupContents = <div>
                <div className="popup-header emoji-one">

                    { preview ? preview : <div className="search-block emoji-one">
                        <i className="small-icon search-icon"></i>
                        <input type="search"
                               placeholder={__(l[102])}
                               ref="emojiSearchField"
                               onChange={this.onSearchChange}
                               value={this.state.searchValue}/>

                    </div>
                    }


                </div>



                <PerfectScrollbar
                    className="popup-scroll-area emoji-one perfectScrollbarContainer"
                    searchValue={this.state.searchValue}
                    onUserScroll={this.onUserScroll}
                    ref="scrollableArea"
                >
                    <div className="popup-scroll-content emoji-one">
                        {emojis}
                    </div>
                </PerfectScrollbar>

                <div className="popup-footer emoji-one">{categoryButtons}</div>
            </div>;
        }
        else {
            popupContents = null;
        }

        return <Dropdown
            className="popup emoji-one" {...self.props} ref="dropdown"
            onActiveChange={(newValue) => {
                // reset state if the dropdown is hidden
                if (newValue === false) {
                    self.setState(self.getInitialState());
                }
                else {
                    self.setState({'isActive': true});
                }
            }}
            searchValue={self.state.searchValue}
            browsingCategory={self.state.browsingCategory}
            previewEmoji={self.state.previewEmoji}
        >
            {popupContents}
        </Dropdown>;
    }
});

module.exports = window.DropdownsUI = {
    Dropdown,
    DropdownEmojiSelector,
    DropdownItem,
    DropdownContactsSelector
};
