var React = require("react");
import utils  from "./utils.jsx";
import {MegaRenderMixin} from "../chat/mixins";
import Forms from "./forms.jsx";

var ContactsUI = require('./../chat/ui/contacts.jsx');

export class ExtraFooterElement extends React.Component {
    render() {
        return this.props.children;
    }
}

class ModalDialog extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        'hideable': true,
        'noCloseOnClickOutside': false,
        'closeDlgOnClickOverlay': true,
        'showSelectedNum': false,
        'selectedNum': 0
    };

    constructor (props) {
        super(props);
        this.onBlur = this.onBlur.bind(this);
        this.onCloseClicked = this.onCloseClicked.bind(this);
        this.onPopupDidMount = this.onPopupDidMount.bind(this);
    }

    componentDidMount() {
        super.componentDidMount();

        if (!this.props.hideOverlay) {
            $(document.body).addClass('overlayed');
            $('.fm-dialog-overlay').removeClass('hidden');
        }

        // blur the chat textarea if its selected.
        $('textarea:focus').trigger("blur");

        if (!this.props.noCloseOnClickOutside) {
            const convApp = document.querySelector('.conversationsApp');
            if (convApp) {
                convApp.removeEventListener('click', this.onBlur);
                convApp.addEventListener('click', this.onBlur);
            }

            $('.fm-modal-dialog').rebind('click.modalDialogOv' + this.getUniqueId(), ({ target }) => {
                if ($(target).is('.fm-modal-dialog')) {
                    this.onBlur();
                }
            });

            $('.fm-dialog-overlay').rebind('click.modalDialog' + this.getUniqueId(), () => {
                if (this.props.closeDlgOnClickOverlay) {
                    this.onBlur();
                }
                return false;
            });
        }

        $(document).rebind('keyup.modalDialog' + this.getUniqueId(), ({ keyCode }) => {
            if (!this.props.stopKeyPropagation && keyCode === 27 /* ESC */) {
                this.onBlur();
            }
        });
    }
    onBlur(e) {
        var $element = $(this.domRef?.current);

        if (
            (!e || !$(e.target).closest('.mega-dialog').is($element))
        ) {
            var convApp = document.querySelector('.conversationsApp');
            if (convApp) {
                convApp.removeEventListener('click', this.onBlur);
            }
            this.onCloseClicked();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (!this.props.noCloseOnClickOutside) {
            var convApp = document.querySelector('.conversationsApp');
            if (convApp) {
                convApp.removeEventListener('click', this.onBlur);
            }
            $('.fm-dialog-overlay').off('click.modalDialog' + this.getUniqueId());
        }
        if (!this.props.hideOverlay) {
            $(document.body).removeClass('overlayed');
            $('.fm-dialog-overlay').addClass('hidden');
        }
        $(this.domNode).off('dialog-closed.modalDialog' + this.getUniqueId());
        $(document).off('keyup.modalDialog' + this.getUniqueId());
    }
    onCloseClicked() {
        var self = this;

        if (self.props.onClose) {
            self.props.onClose(self);
        }
    }
    onPopupDidMount(elem) {
        this.domNode = elem;

        $(elem).rebind('dialog-closed.modalDialog' + this.getUniqueId(), () => this.onCloseClicked());

        if (this.props.popupDidMount) {
            // bubble up...
            this.props.popupDidMount(elem);
        }
    }
    render() {
        var self = this;

        var classes = 'mega-dialog';

        var selectedNumEle = null;
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

        if (self.props.className) {
            classes += ` ${self.props.className}`;
        }

        if (self.props.dialogType) {
            classes += ` dialog-template-${self.props.dialogType}`;
        }

        if (self.props.dialogName) {
            classes += ` ${self.props.dialogName}`;
        }

        if (self.props.showSelectedNum && self.props.selectedNum) {
            selectedNumEle = <div className="selected-num"><span>{self.props.selectedNum}</span></div>;
        }

        var buttons;
        if (self.props.buttons) {
            buttons = [];
            self.props.buttons.forEach(function(v, i) {
                if (v) {
                    buttons.push(
                        <button
                            className={
                                (v.defaultClassname ? v.defaultClassname : "mega-button") +
                                (v.className ? " " + v.className : "") +
                                (self.props.dialogType === "action" ? "large" : "")
                            }
                            onClick={(e) => {
                                if ($(e.target).is(".disabled")) {
                                    return false;
                                }
                                if (v.onClick) {
                                    v.onClick(e, self);
                                }
                            }} key={v.key + i}>
                            {v.iconBefore ?
                                <div>
                                    <i className={v.iconBefore} />
                                </div> : null
                            }
                            <span>{v.label}</span>
                            {v.iconAfter ?
                                <div>
                                    <i className={v.iconAfter} />
                                </div> : null
                            }
                        </button>
                    );
                }
            });

            if ((buttons && buttons.length > 0) || (extraFooterElements && extraFooterElements.length > 0)) {
                footer = <footer>
                    {buttons && buttons.length > 0 ?
                        <div className="footer-container">
                            {buttons}
                        </div>
                        : null
                    }
                    {extraFooterElements && extraFooterElements.length > 0 ?
                        <aside>
                            {extraFooterElements}
                        </aside>
                        : null
                    }
                </footer>;
            }
        }

        return (
            <utils.RenderTo element={document.body} className="fm-modal-dialog" popupDidMount={this.onPopupDidMount}>
                <div
                    ref={this.domRef}
                    id={self.props.id}
                    className={classes}
                    aria-labelledby={self.props.dialogName ? self.props.dialogName + "-title" : null}
                    role="dialog"
                    aria-modal="true"
                    onClick={self.props.onClick}>
                    <button className="close" onClick={self.onCloseClicked}>
                        <i className="sprite-fm-mono icon-dialog-close"></i>
                    </button>
                    {
                        self.props.title ?
                            self.props.dialogType === "message" ?
                                <header>
                                    {
                                        self.props.icon ?
                                            <i className={`graphic ${self.props.icon}`} />
                                            : self.props.iconElement
                                    }
                                    <div>
                                        <h3 id={self.props.dialogName ? self.props.dialogName + "-title" : null}>
                                            {self.props.title}{selectedNumEle}
                                        </h3>
                                        {self.props.subtitle ? <p>{self.props.subtitle}</p> : null}
                                        {otherElements}
                                    </div>
                                </header>
                                :
                                <header>
                                    {
                                        self.props.icon ?
                                            <i className={`graphic ${self.props.icon}`} />
                                            : self.props.iconElement
                                    }
                                    <h2 id={self.props.dialogName ? self.props.dialogName + "-title" : null}>
                                        {self.props.title}{selectedNumEle}
                                    </h2>
                                    {self.props.subtitle ? <p>{self.props.subtitle}</p> : null}
                                </header>
                            : null
                    }

                    {
                        self.props.dialogType !== "message" ? otherElements : null
                    }

                    {buttons || extraFooterElements ? footer : null}
                </div>
            </utils.RenderTo>
        );
    }
}



class SelectContactDialog extends MegaRenderMixin {
    static clickTime = 0;
    static defaultProps = {
        'selectLabel': l.share_contact_action, /* `Share` */
        'cancelLabel': l[82],
        'hideable': true
    };

    constructor (props) {
        super(props);
        this.state = {
            'selected': this.props.selected ? this.props.selected : []
        };

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

        var classes = "send-contact contrast small-footer dialog-template-tool " + self.props.className;

        return (
            <ModalDialog
                title={l.share_contact_title /* `Share contact` */}
                className={classes}
                selected={self.state.selected}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                    {
                        "label": self.props.cancelLabel,
                        "key": "cancel",
                        "onClick": function(e) {
                            self.props.onClose(self);
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    },
                    {
                        "label": self.props.selectLabel,
                        "key": "select",
                        "className": self.state.selected.length === 0 ? "positive disabled" : "positive",
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
                ]}>
                <section className="content">
                    <div className="content-block">
                        <ContactsUI.ContactPickerWidget
                            megaChat={self.props.megaChat}
                            exclude={self.props.exclude}
                            selectableContacts="true"
                            onSelectDone={self.props.onSelectClicked}
                            onSelected={self.onSelected}
                            onClose={self.props.onClose}
                            selected={self.state.selected}
                            contacts={M.u}
                            headerClasses="left-aligned"
                            multiple={true}
                        />
                    </div>
                </section>
            </ModalDialog>
        );
    }
}

class ConfirmDialog extends MegaRenderMixin {

    static saveState(o) {
        let state = mega.config.get('xcod') >>> 0;
        mega.config.set('xcod', state | 1 << o.props.pref);
    }

    static clearState(o) {
        let state = mega.config.get('xcod') >>> 0;
        mega.config.set('xcod', state & ~(1 << o.props.pref));
    }

    static autoConfirm(o) {
        console.assert(o.props.pref > 0);
        let state = mega.config.get('xcod') >>> 0;
        return !!(state & 1 << o.props.pref);
    }

    constructor(props) {
        super(props);
        this._wasAutoConfirmed = undefined;
        this._keyUpEventName = 'keyup.confirmDialog' + this.getUniqueId();

        /** @property this._autoConfirm */
        lazy(this, '_autoConfirm', () =>
            this.props.onConfirmClicked
            && this.props.dontShowAgainCheckbox
            && ConfirmDialog.autoConfirm(this));
    }
    unbindEvents() {
        $(document).off(this._keyUpEventName);
    }
    componentDidMount() {
        super.componentDidMount();

        // since ModalDialogs can be opened in other keyup (on enter) event handlers THIS is required to be delayed a
        // bit...otherwise the dialog would open up and get immediately confirmed
        queueMicrotask(() => {
            if (!this.isMounted()) {
                // can be automatically hidden/unmounted, so this would bind the event AFTER the unbind in
                // componentWillUnmount executed.
                return;
            }

            if (this._autoConfirm) {
                if (!this._wasAutoConfirmed) {
                    this._wasAutoConfirmed = 1;

                    // this would most likely cause a .setState, so it should be done in a separate cycle/call stack.
                    queueMicrotask(() => {
                        this.onConfirmClicked();
                    });
                }

                return;
            }

            $(document).rebind(this._keyUpEventName, (e) => {
                if (e.which === 13 || e.keyCode === 13) {
                    if (!this.isMounted()) {
                        // we need to be 10000% sure that the dialog is still shown, otherwise, we may trigger some
                        // unwanted action.
                        this.unbindEvents();
                        return;
                    }
                    this.onConfirmClicked();
                    return false;
                }
            });
        });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        self.unbindEvents();
        delete this._wasAutoConfirmed;
    }

    onConfirmClicked() {
        this.unbindEvents();
        if (this.props.onConfirmClicked) {
            this.props.onConfirmClicked();
        }
    }

    render() {
        var self = this;
        if (this._autoConfirm) {
            return null;
        }

        var classes = "delete-message" + (self.props.name ? ` ${self.props.name}` : "") +
            (self.props.className ? ` ${self.props.className}` : "");

        var dontShowCheckbox = null;
        if (self.props.dontShowAgainCheckbox) {
            dontShowCheckbox = <div className="footer-checkbox">
                <Forms.Checkbox
                    name="delete-confirm"
                    id="delete-confirm"
                    onLabelClick={(e, state) => {
                        if (state === true) {
                            ConfirmDialog.saveState(self);
                        }
                        else {
                            ConfirmDialog.clearState(self);
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
                subtitle={this.props.subtitle}
                className={classes}
                dialogId={this.props.name}
                dialogType={this.props.dialogType}
                icon={this.props.icon}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                    {
                        "label": self.props.cancelLabel,
                        "key": "cancel",
                        /* eslint-disable-next-line sonarjs/no-identical-functions */
                        "onClick": function(e) {
                            ConfirmDialog.clearState(self);
                            self.props.onClose(self);
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    },
                    {
                        "label": self.props.confirmLabel,
                        "key": "select",
                        "className": "positive",
                        "onClick": function(e) {
                            self.onConfirmClicked();
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    },
            ]}>

                {self.props.children}

                { dontShowCheckbox ?
                    <ExtraFooterElement>
                        {dontShowCheckbox}
                    </ExtraFooterElement>
                    : null
                }
            </ModalDialog>
        );
    }
}

lazy(ConfirmDialog, 'defaultProps', () => {
    return freeze({
        'confirmLabel': l[6826],
        'cancelLabel': l[82],
        'dontShowAgainCheckbox': true,
        'hideable': true,
        'dialogType': 'message'
    });
});

export default {
    ModalDialog,
    SelectContactDialog,
    ConfirmDialog
};
