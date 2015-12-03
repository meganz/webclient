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

                        $(this).css({
                            left: (obj.left + (offsetLeft ? offsetLeft/2 : 0)) + 'px',
                            top: (obj.top + (info.vertical == "top" ? $arrow.outerHeight() : 0)) + 'px'
                        });
                    }
                });
            }
        }
    },
    render: function() {
        var classes = "dropdown body dropdown-arrow up-arrow " + this.props.className;


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
                    <i className="dropdown-white-arrow"></i>
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
            'browsingCategory': false
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({
            searchValue: e.target.value,
            browsingCategory: false
        });
    },
    render: function() {
        var self = this;

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
        Object.keys(EMOJILIST.EMOJI_CATEGORIES).forEach(function(categoryName) {
            if (
                self.state.browsingCategory !== "FREQUENTLY USED" &&
                self.state.browsingCategory !== false &&
                self.state.browsingCategory != categoryName
            ) {
                return;
            }

            var curCategoryEmojis = [];
            Object.keys(EMOJILIST.EMOJI_CATEGORIES[categoryName]).forEach(function(slug) {
                if (self.state.searchValue.length > 0) {
                    if (slug.indexOf(self.state.searchValue) < 0) {
                        return;
                    }
                }
                var meta = EMOJILIST.EMOJIS[slug];

                curCategoryEmojis.push(
                    <div
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
            });

            if (curCategoryEmojis.length > 0) {
                emojis.push(
                    <div key={categoryName}>
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

        Object.keys(categoryIcons).forEach(function(categoryName) {
            var activeClass = self.state.browsingCategory === categoryName ? " active" : "";

            if(
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
                    }}
                    >
                    <i className={"small-icon " + categoryIcons[categoryName]}></i>
                </div>
            );
        });

        return <Dropdown className="popup emoji-one" {...self.props} ref="dropdown" onActiveChange={(newValue) => {
            // reset state if the dropdown is hidden
            if (newValue === false) {
                self.setState(self.getInitialState);
            }
        }}>
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
        </Dropdown>;
    }
});

module.exports = window.DropdownsUI = {
    Dropdown,
    DropdownEmojiSelector,
    DropdownItem,
    DropdownContactsSelector
};
