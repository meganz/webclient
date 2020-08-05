var React = require("react");
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var MetaRichPreviewLoading = require('./metaRichPreviewLoading.jsx').MetaRichpreviewLoading;

class MetaRichpreview  extends ConversationMessageMixin {
    getBase64Url(b64incoming) {
        if (!b64incoming || !b64incoming.split) {
            return;
        }
        var exti = b64incoming.split(":");
        var b64i = exti[1];
        exti = exti[0];
        return "data:image/"  + exti + ";base64," + b64i;
    }
    render() {
        var self = this;

        var message = this.props.message;

        var output = [];

        var metas = message.meta && message.meta.extra ? message.meta.extra : [];
        var failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 60 * 5;
        var isLoading = !!message.meta.isLoading;
        if (failedToLoad) {
            return null;
        }

        for (var i = 0; i < metas.length; i++) {
            var meta = metas[i];

            if (
                !meta.d &&
                !meta.t &&
                !message.meta.isLoading
            ) {
                continue;
            }
            var previewCss = {};
            if (meta.i) {
                previewCss['backgroundImage'] = "url(" + self.getBase64Url(meta.i) + ")";
                previewCss['backgroundRepeat'] = "no-repeat";
                previewCss['backgroundPosition'] = "center center";
            }

            var previewContainer;

            if (isLoading) {
                previewContainer = <MetaRichPreviewLoading message={message} isLoading={message.meta.isLoading} />;
            }
            else {
                var domainName = meta.url;
                domainName = domainName.replace("https://", "")
                    .replace("http://", "").split("/")[0];
                previewContainer = <div className="message richpreview body">
                    {meta.i ?
                        <div className="message richpreview img-wrapper">
                            <div className="message richpreview preview" style={previewCss}></div>
                        </div> : undefined}
                    <div className="message richpreview inner-wrapper">
                        <div className="message richpreview data-title">
                            <span className="message richpreview title">{meta.t}</span>
                        </div>
                        <div className="message richpreview desc">{ellipsis(meta.d, 'end', 82)}</div>
                        <div className="message richpreview url-container">
                            {(
                                meta.ic ?
                                    <span className="message richpreview url-favicon">
                                        <img src={self.getBase64Url(meta.ic)} width={16} height={16}
                                            onError={(e) => {
                                                e.target.parentNode.removeChild(e.target);
                                            }}
                                            alt=""
                                        />
                                    </span>
                                    :
                                    ""
                            )}
                            <span className="message richpreview url">
                                {domainName}
                            </span>
                        </div>
                    </div>
                </div>;
            }

            output.push(
                <div
                    key={meta.url}
                    className={
                        "message richpreview container " +
                        (meta.i ? "have-preview" : "no-preview") + " " +
                        (meta.d ? "have-description" : "no-description") + " " +
                        (isLoading ? "is-loading" : "done-loading")
                    }
                    onClick={function(url) {
                        if (!message.meta.isLoading) {
                            window.open(url, "_blank");
                        }
                    }.bind(this, meta.url)}>
                    {previewContainer}
                    <div className="clear"></div>
                </div>
            );
        }
        return <div className="message richpreview previews-container">{output}</div>;
    }
};

export {
    MetaRichpreview
};
