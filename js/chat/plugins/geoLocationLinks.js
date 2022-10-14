/**
 * Syncronize "geo" user attribute
 *
 * @param {Chat} megaChat Megachat instance.
 * @constructor
 */
var GeoLocationLinks = function(megaChat) {
    'use strict';
    megaChat.rebind("onInit.GeoLocation", function() {
        GeoLocationLinks.syncFromAttribute();
    });
};

/**
 * Used to store the geolocation links confirmation
 *
 * @property {integer} gmapsConfirmation Default value
 */
GeoLocationLinks.gmapsConfirmation = -1;

/**
 * Get "geo" user attribute and stores it
 */
GeoLocationLinks.syncFromAttribute = function() {
    "use strict";

    if (is_chatlink) {
        GeoLocationLinks.gmapsConfirmation = -1;
        return;
    }

    mega.attr.get(u_handle, "geo", false, true)
        .done(function(r) {
            if (r.v === "1") {
                GeoLocationLinks.gmapsConfirmation = true;
            }
            else if (r.v === "0") {
                GeoLocationLinks.gmapsConfirmation = false;
            }
            else {
                GeoLocationLinks.gmapsConfirmation = -1;
            }
        })
        .fail(function() {
            GeoLocationLinks.gmapsConfirmation = -1;
        });
};

/**
 * Public api, to be used confirm the gmaps confirmation dialog
 *
 */
GeoLocationLinks.confirmationDoConfirm = function() {
    "use strict";

    GeoLocationLinks.gmapsConfirmation = true;

    if (!is_chatlink) {
        mega.attr.set("geo", {v: "1"}, false, true);
    }
};

/**
 * Public api, to be used to mark as 'never' the gmaps confirmation dialog
 *
 */
GeoLocationLinks.confirmationDoNever = function() {
    "use strict";

    GeoLocationLinks.gmapsConfirmation = false;

    if (!is_chatlink) {
        mega.attr.set("geo", {v: "0"}, false, true);
    }
};


