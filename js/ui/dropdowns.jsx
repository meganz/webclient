var React = require("react/addons");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var ContactsUI = require('./../chat/ui/contacts.jsx');

var Dropdown = React.createClass({
    mixins: [MegaRenderMixin],
    componentDidUpdate: function() {
        var self = this;

        if(this.props.active === true) {
            if(this.isMounted() && this.getOwnerElement()) {
                var $element = $(this.getDOMNode());
                var parentDomNode = $element.parents('.button');
                $element.css('margin-left','');
                $element.position({
                    of: $(parentDomNode),
                    my: "center top",
                    at: "center bottom",
                    collision: "flip flip",
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
                            left: obj.left + 'px',
                            top: (obj.top + $arrow.outerHeight()) + 'px',
                            marginLeft: self.props.styles ? self.props.styles.marginLeft : undefined
                        });
                    }
                });
            }
        }
    },
    render: function() {
        var classes = "dropdown body dropdown-arrow up-arrow popup " + this.props.className;


        if(this.props.active !== true) {
            classes += " hidden";
        }

        var styles;

        // calculate and move the popup arrow to the correct position.
        if(this.isMounted() && this.getOwnerElement()) {
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

        self.setState({searchValue: event.target.value});
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
                <div className="contacts-info body contacts-search"  onClick={(e) => {
                    if (self.props.onClick) {
                        self.props.onClick(v, e);
                    }
                }} key={v.u}>
                    <div className={"user-card-presence " + (pres ? pres : "offline")}></div>
                    <ContactsUI.Avatar contact={v} />

                    <div className="user-card-data">
                        <div className="user-card-name">{avatarMeta.fullName}</div>
                        <div className="user-card-email">{v.m}</div>
                    </div>
                </div>
            );
        });

        return <Dropdown className="contacts-search" {...self.props} ref="dropdown">
            <div className="contacts-search-header">
                <i className="small-icon search-icon"></i>
                <input
                    type="search"
                    placeholder={__("Search")}
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


        return <div
                    className={"dropdown-item " + this.props.className}
                    onClick={this.props.onClick ? this.props.onClick : () => {}}
                >
                    {icon}
                    {label}
                </div>;
    }
});

module.exports = {
    Dropdown,
    DropdownItem,
    DropdownContactsSelector
};
