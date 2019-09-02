var React = require("react");
var ReactDOM = require("react-dom");
import utils  from "./utils.jsx";
import MegaRenderMixin from "../stores/mixins.js";
import Tooltips from "./tooltips.jsx";
import Forms from "./forms.jsx";

var ContactsUI = require('./../chat/ui/contacts.jsx');

class ExtraFooterElement extends MegaRenderMixin(React.Component) {
    render() {
        return this.props.children;
    }
};

class ModalDialog extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'hideable': true
    };

    constructor (props) {
        super(props);
        this.onBlur = this.onBlur.bind(this);
        this.onCloseClicked = this.onCloseClicked.bind(this);
        this.onPopupDidMount = this.onPopupDidMount.bind(this);
    }

    componentDidMount() {
        super.componentDidMount();
        var self = this;
        $(document.body).addClass('overlayed');
        $('.fm-dialog-overlay').removeClass('hidden');

        // blur the chat textarea if its selected.
        $('textarea:focus').trigger("blur");


        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

        $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function(e) {
            if (e.keyCode == 27) { // escape key maps to keycode `27`
                self.onBlur();
            }
        });
    }
    onBlur(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if(
            (!e || !$(e.target).closest(".fm-dialog").is($element))
        ) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            this.onCloseClicked();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        $(document).off('keyup.modalDialog' + this.getUniqueId());
        $(document.body).removeClass('overlayed');
        $('.fm-dialog-overlay').addClass('hidden');
        $(window).off('resize.modalDialog' + this.getUniqueId());

    }
    onCloseClicked(e) {
        var self = this;

        if (self.props.onClose) {
            self.props.onClose(self);
        }
    }
    onPopupDidMount(elem) {
        this.domNode = elem;

        if (this.props.popupDidMount) {
            // bubble up...
            this.props.popupDidMount(elem);
        }
    }
    render() {
        var self = this;

        var classes = "fm-dialog fm-modal-dialog " + self.props.className;

        var footer = null;

        var extraFooterElements = [];
        var otherElements = [];

        var x = 0;
        React.Children.forEach(self.props.children, function (child) {
            if (!child) {
                // skip if undefined
                return;
            }

            if (
                child.type.name === 'ExtraFooterElement'
            ) {
                extraFooterElements.push(React.cloneElement(child, {
                    key: x++
                }));
            }
            else {
                otherElements.push(
                    React.cloneElement(child, {
                        key: x++
                    })
                );
            }
        }.bind(this));


        if(self.props.buttons) {
            var buttons = [];
            self.props.buttons.forEach(function(v) {
                buttons.push(
                    <a
                        className={(v.defaultClassname ? v.defaultClassname : "default-white-button right") + (v.className ? " " + v.className : "")}
                        onClick={(e) => {
                            if ($(e.target).is(".disabled")) {
                                return false;
                            }
                            if (v.onClick) {
                                v.onClick(e, self);
                            }
                        }} key={v.key}>
                            {v.iconBefore ? <i className={v.iconBefore} /> : null}
                            {v.label}
                            {v.iconAfter ? <i className={v.iconAfter} /> : null}
                        </a>
                );
            });

            footer = <div className="fm-dialog-footer white">
                {extraFooterElements}
                {buttons}
                <div className="clear"></div>
            </div>;
        }

        return (
            <utils.RenderTo element={document.body} className={classes} popupDidMount={this.onPopupDidMount}>
                <div>
                    <div className="fm-dialog-close" onClick={self.onCloseClicked}></div>
                    {
                        self.props.title ? <div className="fm-dialog-title">{self.props.title}</div> : null
                    }

                    <div className="fm-dialog-content">
                        {otherElements}
                    </div>

                    {footer}
                </div>
            </utils.RenderTo>
        );
    }
};



class SelectContactDialog extends MegaRenderMixin(React.Component) {
    static clickTime = 0;
    static defaultProps = {
        'selectLabel': __(l[1940]),
        'cancelLabel': __(l[82]),
        'hideable': true
    };

    constructor (props) {
        super(props);
        this.state = {
            'selected': this.props.selected ? this.props.selected : []
        }

        this.onSelected = this.onSelected.bind(this);
    }
    onSelected(nodes) {
        this.setState({'selected': nodes});
        if (this.props.onSelected) {
            this.props.onSelected(nodes);
        }
    }
    onSelectClicked() {
        this.props.onSelectClicked();
    }
    render() {
        var self = this;

        var classes = "send-contact contrast small-footer " + self.props.className;

        return (
            <ModalDialog
                title={__(l[8628])}
                className={classes}
                selected={self.state.selected}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                        {
                            "label": self.props.selectLabel,
                            "key": "select",
                            "defaultClassname": "default-grey-button lato right",
                            "className": self.state.selected.length === 0 ? "disabled" : null,
                            "onClick": function(e) {
                                if (self.state.selected.length > 0) {
                                    if (self.props.onSelected) {
                                        self.props.onSelected(self.state.selected);
                                    }
                                    self.props.onSelectClicked(self.state.selected);
                                }
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
                        {
                            "label": self.props.cancelLabel,
                            "key": "cancel",
                            "defaultClassname": "link-button lato left",
                            "onClick": function(e) {
                                self.props.onClose(self);
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
            ]}>
            <ContactsUI.ContactPickerWidget
                megaChat={self.props.megaChat}
                contacts={self.props.contacts}
                exclude={self.props.exclude}
                selectableContacts="true"
                onSelectDone={self.props.onSelectClicked}
                onSelected={self.onSelected}
                selected={self.state.selected}
                headerClasses="left-aligned"
                multiple={true}
                />
            </ModalDialog>
        );
    }
};

class ConfirmDialog extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'confirmLabel': __(l[6826]),
        'cancelLabel': __(l[82]),
        'dontShowAgainCheckbox': true,
        'hideable': true
    };
    unbindEvents() {
        $(document).off('keyup.confirmDialog' + this.getUniqueId());
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;

        // since ModalDialogs can be opened in other keyup (on enter) event handlers THIS is required to be delayed a
        // bit...otherwise the dialog would open up and get immediately confirmed
        setTimeout(function() {
            if (!self.isMounted()) {
                // can be automatically hidden/unmounted, so this would bind the event AFTER the unbind in
                // componentWillUnmount executed.
                return;
            }
            $(document).rebind('keyup.confirmDialog' + self.getUniqueId(), function(e) {
                if (e.which === 13 || e.keyCode === 13) {
                    if (!self.isMounted()) {
                       // we need to be 10000% sure that the dialog is still shown, otherwise, we may trigger some
                       // unwanted action.
                        self.unbindEvents();
                        return;
                    }
                    self.onConfirmClicked();
                    return false;
                }
            });
        }, 75);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        self.unbindEvents();
    }
    onConfirmClicked() {
        this.unbindEvents();
        if (this.props.onConfirmClicked) {
            this.props.onConfirmClicked();
        }
    }
    render() {
        var self = this;

        if (self.props.dontShowAgainCheckbox && mega.config.get('confirmModal_' + self.props.name) === true)  {
            if (this.props.onConfirmClicked) {
                // this would most likely cause a .setState, so it should be done in a separate cycle/call stack.
                setTimeout(function() {
                    self.unbindEvents();
                    self.props.onConfirmClicked();
                }, 75);
            }
            return null;
        }

        var classes = "delete-message " + self.props.name + " " + self.props.className;

        var dontShowCheckbox = null;
        if (self.props.dontShowAgainCheckbox) {
            dontShowCheckbox = <div className="footer-checkbox">
                <Forms.Checkbox
                    name="delete-confirm"
                    id="delete-confirm"
                    onLabelClick={(e, state) => {
                        if (state === true) {
                            mega.config.set('confirmModal_' + self.props.name, true);
                        }
                        else {
                            mega.config.set('confirmModal_' + self.props.name, false);
                        }
                    }}
                >
                    {l[7039]}
                </Forms.Checkbox>
            </div>;
        }
        return (
            <ModalDialog
                title={this.props.title}
                className={classes}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                        {
                            "label": self.props.confirmLabel,
                            "key": "select",
                            "className": null,
                            "onClick": function(e) {
                                self.onConfirmClicked();
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
                        {
                            "label": self.props.cancelLabel,
                            "key": "cancel",
                            "onClick": function(e) {
                                self.props.onClose(self);
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
            ]}>
                <div className="fm-dialog-content">
                    {self.props.children}
                </div>
                <ExtraFooterElement>
                    {dontShowCheckbox}
                </ExtraFooterElement>
            </ModalDialog>
        );
    }
};

export default {
    ModalDialog,
    SelectContactDialog,
    ConfirmDialog,
    ExtraFooterElement
};
