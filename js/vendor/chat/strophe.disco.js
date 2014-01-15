//    XMPP plugins for Strophe v0.3

//    (c) 2012-2013 Yiorgis Gozadinos.
//    strophe.plugins is distributed under the MIT license.
//    http://github.com/ggozad/strophe.plugins


// A Disco plugin partially implementing
// [XEP-0030 Service Discovery](http://xmpp.org/extensions/xep-0030.html)

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'underscore', 'backbone', 'strophe'], function ($, _, Backbone, Strophe) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return factory($, _, Backbone, Strophe);
        });
    } else {
        // Browser globals
        factory(root.$, root._, root.Backbone, root.Strophe);
    }
}(this,function ($, _, Backbone, Strophe) {

    // Add the **PubSub** plugin to Strophe
    Strophe.addConnectionPlugin('Disco', {

        _connection: null,
        _identities: [],
        _features: [],

        // **init** sets up the connection
        init: function (connection) {
            this._connection = connection;
        },

        // Add Disco handlers
        statusChanged: function (status, condition) {
            var self = this;
            if (status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {
                self._connection.addHandler(self._onDiscoInfo.bind(self), Strophe.NS.DISCO_INFO, 'iq', 'get', null, null);
            }
        },

        // **addIdentity** adds an identity
        addIdentity: function (identity) {
            this._identities.push(identity);
        },

        // **addFeature** adds a feature
        addFeature: function (feature) {
            this._features.push(feature);
        },

        // **info** queries an entity for its support and
        // returns **identities** and **features
        info: function (to, node) {
            var d = $.Deferred(),
                query = {xmlns: Strophe.NS.DISCO_INFO},
                identities = [], features = [];

            if (node) {
                query.node = node;
            }

            iq = $iq({to: to, type: 'get'})
                .c('query', query);
            this._connection.sendIQ(iq, function (response) {
                _.each($('identity', response), function (node) {
                    identities.push(_.reduce(node.attributes, function (identity, attr) {
                        identity[attr.nodeName] = attr.nodeValue; return identity;
                    }, {}));
                });

                _.each($('feature', response), function (node) {
                    features.push(node.getAttribute('var'));
                });

                d.resolve({identities: identities, features: features});
            }, d.reject);

            return d.promise();
        },

        // Handle Disco info requests.
        _onDiscoInfo: function (iq) {

            var response = $iq({
                to: iq.getAttribute('from'),
                id: iq.getAttribute('id'),
                type: 'result'})
                .c('query', {xmlns: Strophe.NS.DISCO_INFO});

            _.each(this._identities, function (identity) {
                response.c('identity', identity).up();
            });

            _.each(this._features, function (feature) {
                response.c('feature', {'var': feature}).up();
            });

            this._connection.send(response.tree());
            return true;
        }

    });
}));
