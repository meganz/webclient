var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var ContactsUI = require('./../chat/ui/contacts.jsx');
var EMOJILIST = require('./emojilist.jsx');

var Dropdown = React.createClass({
    mixins: [MegaRenderMixin],
    componentWillUpdate: function(nextProps, nextState) {
        if (this.props.active != nextProps.active) {
            if (this.props.onActiveChange) {
                this.props.onActiveChange(nextProps.active);
            }
        }
    },
    componentDidUpdate: function() {
        var self = this;

        if(this.props.active === true) {
            if(this.getOwnerElement()) {
                var $element = $(ReactDOM.findDOMNode(this));
                var parentDomNode = $element.parents('.button');
                var positionToElement = parentDomNode;
                var offsetLeft = 0;
                var $container = $element.parents('.jspPane:first');

                if($container.size() == 0) {
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

                        if(!self.props.noArrow) {
                            if (info.vertical != "top") {
                                $(this)
                                    .removeClass("up-arrow")
                                    .addClass("down-arrow");
                            } else {
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
    render: function() {
        var classes = "dropdown body " + (!this.props.noArrow ? "dropdown-arrow up-arrow" : "") + " " + this.props.className;


        if(this.props.active !== true) {
            classes += " hidden";

            return (
                <div className={classes}></div>
            );
        } else {
            var styles;

            // calculate and move the popup arrow to the correct position.
            if (this.getOwnerElement()) {
                styles = {
                    'zIndex': 123,
                    'position': 'absolute',
                    'width': this.props.styles ? this.props.styles.width : undefined
                };
            }

            return (
                <div className={classes} style={styles}>
                    {!this.props.noArrow ? <i className="dropdown-white-arrow"></i> : null}
                    {this.props.children}
                </div>
            );
        }
    }
});


var DropdownContactsSelector = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'searchValue': ''
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({searchValue: e.target.value});
    },
    render: function() {
        var self = this;

        var contacts = [];

        self.props.contacts.forEach(function(v, k) {
            var pres = self.props.megaChat.karere.getPresence(
                self.props.megaChat.getJidFromNodeId(v.u)
            );

            if(v.c == 0 || v.u == u_handle) {
                return;
            }

            var avatarMeta = generateAvatarMeta(v.u);

            if (self.state.searchValue && self.state.searchValue.length > 0) {
                // DON'T add to the contacts list if the contact's name or email does not match the search value
                if (
                    avatarMeta.fullName.indexOf(self.state.searchValue) === -1 &&
                    v.m.indexOf(self.state.searchValue) === -1
                ) {
                    return;
                }
            }


            if(pres === "chat") {
                pres = "online";
            }

            contacts.push(
                <ContactsUI.ContactCard
                    contact={v} className="contacts-search" onClick={self.props.onClick}
                    noContextMenu={true}
                    key={v.u}
                    />
            );
        });

        return <Dropdown className="popup contacts-search" {...self.props} ref="dropdown">
            <div className="contacts-search-header">
                <i className="small-icon search-icon"></i>
                <input
                    type="search"
                    placeholder={__("Search contacts")}
                    ref="contactSearchField"
                    onChange={this.onSearchChange}
                    value={this.state.searchValue}
                    />
            </div>

            <utils.JScrollPane className="contacts-search-scroll">
                <div>
                    {contacts}
                </div>
            </utils.JScrollPane>
        </Dropdown>;
    }
});

var DropdownItem = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {'isClicked': false}
    },
    renderChildren: function () {
        var self = this;
        return React.Children.map(this.props.children, function (child) {
            return React.cloneElement(child, {
                active: self.state.isClicked
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
                    onClick={self.props.onClick ? self.props.onClick : self.onClick}
                >
                    {icon}
                    {label}
                    {child}
                </div>;
    }
});


var DropdownEmojiSelector = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'previewEmoji': null,
            'searchValue': '',
            'browsingCategory': false,
            'isActive': false,
            'visibleEmojis': [].concat(
                Object.keys(EMOJILIST.EMOJI_CATEGORIES["FREQUENTLY USED"]),
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
    componentDidMount: function() {
        $(window).rebind(
            //'DOMContentLoaded.lazyRenderer' + this.getUniqueId() + ' ' +
            //'load.lazyRenderer' + this.getUniqueId() + ' ' +
            'resize.lazyRenderer' + this.getUniqueId() + ' ' +
            //'hashchange.lazyRenderer' + this.getUniqueId() + ' ' +
            'scroll.lazyRenderer' + this.getUniqueId(),
            this.requiresLazyRendering
        );

        this.requiresLazyRendering();
    },
    componentWillUnmount: function() {
        //$(window).unbind('DOMContentLoaded.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('load.lazyRenderer' + this.getUniqueId());
        $(window).unbind('resize.lazyRenderer' + this.getUniqueId());
        //$(window).unbind('hashchange.lazyRenderer' + this.getUniqueId());
        $(window).unbind('scroll.lazyRenderer' + this.getUniqueId());
    },
    _getVisibleEmojis: function() {
        var $container = $('.popup.emoji-one:visible');

        var $emojis = $('.button.square-button.emoji-one[data-emoji]', $container);

        if ($emojis.size() === 0) {
            return false;
        }

        var inViewport = [];
        $emojis.each(function() {
            if (elementInViewport2(this)) {
                inViewport.push($(this).attr('data-emoji'));
            }
        });

        return inViewport;
    },
    requiresLazyRendering: function(e) {
        if (!this.isMounted()) {
            return;
        }

        var $container = $(this.findDOMNode());
        if (!$container.is(":visible")) {
            return;
        }

        var inViewport = this._getVisibleEmojis();

        if (inViewport !== false) {
            this.setState({'visibleEmojis': inViewport});
        }
    },
    render: function() {
        var self = this;

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
            Object.keys(EMOJILIST.EMOJI_CATEGORIES).forEach(function (categoryName) {
                if (
                    self.state.browsingCategory !== "FREQUENTLY USED" &&
                    self.state.browsingCategory !== false &&
                    self.state.browsingCategory != categoryName
                ) {
                    return;
                }

                var curCategoryEmojis = [];
                Object.keys(EMOJILIST.EMOJI_CATEGORIES[categoryName]).forEach(function (slug) {
                    if (self.state.searchValue.length > 0) {
                        if (slug.indexOf(self.state.searchValue) < 0) {
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
                                }, 75);
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
                            }}>
                            <span
                                className={"emojione-" + meta[0]}
                                title={":" + slug + ":"}
                                dangerouslySetInnerHTML={{__html: meta[1]}}></span>
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
                        <div key={categoryName}>
                            {emojis.length > 0 ? <div className="clear"></div> : null}
                            <div className="emoji-type-txt">
                                {__(categoryName)}
                            </div>

                            <div className="clear"></div>
                            {curCategoryEmojis}
                            <div className="clear"></div>
                        </div>
                    );
                }
            });
            var categoryIcons = {
                "FREQUENTLY USED": "clock-icon",
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
                            $('.popup-scroll-area.emoji-one:visible').data('jsp').scrollTo(0);
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
                               placeholder={__("Search")}
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
        } else {
            popupContents = null;
        }

        return <Dropdown className="popup emoji-one" {...self.props} ref="dropdown" onActiveChange={(newValue) => {
            // reset state if the dropdown is hidden
            if (newValue === false) {
                self.setState(self.getInitialState);
            } else {
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
