var React = require("react");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var ContactsUI = require('./../chat/ui/contacts.jsx');
var EMOJILIST = require('./emojilist.jsx');

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
                        {this.props.children}
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
    render: function() {
        var self = this;

        return <Dropdown className={"popup contacts-search " + this.props.className} 
                         active={this.props.active} 
                         closeDropdown={this.props.closeDropdown} 
                         ref="dropdown"
                         positionMy={this.props.positionMy} 
                         positionAt={this.props.positionAt}
                >
            <div className="popup contacts-search">
                <ContactsUI.ContactPickerWidget
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
            </div>
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
            requiresUpdateOnResize: true
        };
    },
    getInitialState: function() {
        return {
            'previewEmoji': null,
            'searchValue': '',
            'browsingCategory': false,
            'isActive': false,
            'visibleEmojis': [].concat(
                /*Object.keys(EMOJILIST.EMOJI_CATEGORIES["FREQUENTLY USED"]),*/
                Object.keys(EMOJILIST.EMOJI_CATEGORIES["PEOPLE"])
            )
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({
            searchValue: e.target.value,
            browsingCategory: false
        });
        $('.popup-scroll-area.emoji-one:visible').data('jsp').scrollTo(0);
    },
    componentDidUpdate: function() {
        var self = this;
        var $element = $('.popup.emoji-one:visible');

        $('.popup-scroll-area.emoji-one', $element).rebind('jsp-user-scroll-y.emojis', function(e, pos) {
            self.rerender();
        });
    },
    _getVisibleEmojis: function() {
        var self = this;

        var $element = $('.popup-header.emoji-one:visible').parent();

        if (!$element.is(":visible")) {
            return false;
        }

        var $jsp = $('.popup-scroll-area.emoji-one', $element).data("jsp");
        var pos = 0;

        if ($jsp) {
            pos = $jsp.getContentPositionY();
        }

        // caching those here, so that we won't trigger w/h calcs from the browser (to slow down this ...)
        // (w/h + margin)
        var emojiHeight = 42;
        var emojiWidth = 42;
        var emojiContainerWidth = 336;
        var jspHeight = 420;
        var bufferRows = 6;
        var emojisPerRow = Math.floor(emojiContainerWidth / (emojiWidth - 5));
        var visibleEmojiRows = Math.floor(jspHeight / emojiHeight);

        var emojiList = EMOJILIST.ORDERED_EMOJIS;
        if (self.state.searchValue && self.state.searchValue.length > 0) {
            emojiList = [];
            EMOJILIST.ORDERED_EMOJIS.forEach(function(v) {
                if (v.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) > -1) {
                    emojiList.push(v);
                }
            })
        }


        var firstEmojiNumber = Math.max(
            0,
            Math.ceil((pos/emojiHeight) * emojisPerRow) - Math.floor(bufferRows * emojisPerRow)
        );
        var lastEmojiNumber = firstEmojiNumber + Math.ceil(emojisPerRow * (visibleEmojiRows + bufferRows));

        var inViewport = emojiList.slice(
            Math.max(0, firstEmojiNumber - 1),
            lastEmojiNumber + 1
        );

        return inViewport;
    },
    rerender: function() {
        var self = this;

        var inViewport = self._getVisibleEmojis();

        if (self.state.visibleEmojis.join(",") != inViewport.join(",")) {
            self.setState({'visibleEmojis': inViewport});
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
            var visibleEmojis = this._getVisibleEmojis();
            if (visibleEmojis === false) {
                visibleEmojis = self.state.visibleEmojis;
            }

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

                    if (visibleEmojis.indexOf(slug) > -1) {
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

                                    // delay the .setState change, because of the tons of icons we've, which are re-rendered
                                    // in case of .setState
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
                    }
                    else {
                        curCategoryEmojis.push(
                            <div
                                data-emoji={slug}
                                className="button square-button emoji-one placeholder"
                                key={categoryName + "_" + slug + "_pl"}
                            />
                        );
                    }
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
                            $('.popup-scroll-area.emoji-one:visible').data('jsp').scrollToElement(
                                $('.emoji-category-container[data-category-name="' + categoryName + '"]:visible'),
                                true,
                                true
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



                <utils.JScrollPane
                    className="popup-scroll-area emoji-one"
                    searchValue={this.state.searchValue}
                    browsingCategory={this.state.browsingCategory}
                >
                    <div className="popup-scroll-content emoji-one">
                        {emojis}
                    </div>
                </utils.JScrollPane>

                <div className="popup-footer emoji-one">{categoryButtons}</div>
            </div>;
        }
        else {
            popupContents = null;
        }

        return <Dropdown className="popup emoji-one" {...self.props} ref="dropdown" onActiveChange={(newValue) => {
            // reset state if the dropdown is hidden
            if (newValue === false) {
                self.setState(self.getInitialState());
            }
            else {
                self.setState({'isActive': true});
            }
        }}>
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
