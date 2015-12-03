var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;

var ModalDialog = React.createClass({
    mixins: [MegaRenderMixin],
    componentDidMount: function() {
        var self = this;
        $(document.body).addClass('overlayed');

        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

        $(document).rebind('keyup.modalDialog' + self.megaInstanceId, function(e) {
            if (e.keyCode == 27) { // escape key maps to keycode `27`
                self.onBlur();
            }
        });
    },
    onBlur: function(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if(
            (!e || !$(e.target).parents(".fm-dialog").is($element))
        ) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            this.onCloseClicked();
        }


    },
    componentWillUnmount: function() {
        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        $(document.body).removeClass('overlayed');
    },
    componentDidUpdate: function() {
        var self = this;


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
                my: self.props.positionMy ? self.props.positionMy : "center center",
                at: self.props.positionAt ? self.props.positionAt : "center center",
                collision: "flip flip",
                within: $container
            });
        }
    },
    onCloseClicked: function(e) {
        var self = this;
        $(document).unbind('keyup.modalDialog' + self.megaInstanceId);

        if (self.props.onClose) {
            self.props.onClose(self);
        }
    },
    render: function() {
        var self = this;

        var classes = "fm-dialog " + self.props.className;



        var styles;

        // calculate and move the popup arrow to the correct position.
        if (self.getOwnerElement()) {
            styles = {
                'zIndex': 125,
                'position': 'absolute',
                'width': self.props.styles ? self.props.styles.width : undefined
            };
        }

        var buttons = [];

        if(self.props.buttons) {
            self.props.buttons.forEach(function(v) {
                buttons.push(
                    <a href="" className="default-white-button right" onClick={(e) => {
                        if (v.onClick) {
                            v.onClick(e, self);
                        }
                    }} key={v.key}>
                        {v.label}
                    </a>
                );
            })
        }

        return (
            <utils.RenderTo element={document.body}>
                <div>
                    <div className={classes} style={styles}>
                        <div className="fm-dialog-close" onClick={self.onCloseClicked}></div>
                        <div className="fm-dialog-title">{self.props.title}</div>

                        <div className="fm-dialog-content">
                            <div className="fm-breadcrumbs-block">
                                <a className="fm-breadcrumbs cloud-drive contains-directories">
                                    <span className="right-arrow-bg">
                                        <span>Cloud Drive</span>
                                    </span>
                                </a>
                                <div className="clear"></div>
                            </div>

                            <table className="grid-table-header fm-dialog-table">
                                <tbody><tr>
                                    <th><span className="arrow grid-header-star"></span></th>
                                    <th><div className="arrow name desc">Name</div></th>
                                    <th><div className="arrow size">Size</div></th>
                                </tr>
                                </tbody></table>

                            <div className="fm-dialog-grid-scroll">
                                <table className="grid-table fm-dialog-table">
                                    <tbody><tr className="folder">
                                        <td>
                                            <span className="grid-status-icon"></span>
                                        </td>
                                        <td>
                                            <span className="transfer-filtype-icon folder"> </span>
                                            <span className="tranfer-filetype-txt">Folder</span>
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr className="folder">
                                        <td>
                                            <span className="grid-status-icon"></span>
                                        </td>
                                        <td>
                                            <span className="transfer-filtype-icon folder"> </span>
                                            <span className="tranfer-filetype-txt">Folder</span>
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span className="grid-status-icon star"></span>
                                        </td>
                                        <td>
                                            <span className="transfer-filtype-icon image"> </span>
                                            <span className="tranfer-filetype-txt">File</span>
                                        </td>
                                        <td>2MB</td>
                                    </tr>
                                    </tbody></table>
                            </div>


                        </div>

                        <div className="fm-dialog-footer">
                            {buttons}
                            <div className="clear"></div>
                        </div>
                    </div>
                </div>
            </utils.RenderTo>
        );
    }
});

module.exports = window.ModalDialogUI = {
    ModalDialog,
};
