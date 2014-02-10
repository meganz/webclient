/**
 * Quick and dirty mocker of Karere
 *
 * Note: requires sinon.js
 *
 * @param objectInstance
 * @constructor
 */
var KarereMocker = function(objectInstance) {
    var self = this;

    self.objectMocker = new ObjectMocker(
        objectInstance,
        {
            'connect': function(jid, password) {
                var $promise = new $.Deferred();
                $promise.resolve();

                if(jid == Strophe.getBareJidFromJid(jid)) {
                    var resource = this.options.clientName + "-" + this._generateNewResourceIdx();
                    jid = jid + "/" + resource;
                }
                this._jid = jid;
                this._password = password;

                this._connectionState = Karere.CONNECTION_STATE.CONNECTED;

                return $promise;
            },
            'disconnect': function() {
                var $promise = new $.Deferred();
                $promise.resolve();

                this._connectionState = Karere.CONNECTION_STATE.DISCONNECTED;

                return $promise;
            },
            'startChat': function() {
                var $promise = new $.Deferred();
                $promise.resolve("roomjid@conference.example.com");

                return $promise;
            },
            'waitForUserToJoin': function() {
                var $promise = new $.Deferred();
                $promise.resolve();

                return $promise;
            },
            'waitForUserToLeave': function() {
                var $promise = new $.Deferred();
                $promise.resolve();

                return $promise;
            },
            'addUserToChat': function(roomJid, userJid, password, type, meta) {
                var $promise = new $.Deferred();
                $promise.resolve();

                return $promise;
            },
            'leaveChat': function() {
                var $promise = new $.Deferred();
                $promise.resolve();

                return $promise;
            },
            'joinChat': function() {
                var $promise = new $.Deferred();
                $promise.resolve();

                return $promise;
            },
            'sendAction': function(toJid, action, meta) {
                return this._rawSendMessage(
                    toJid,
                    "action",
                    "",
                    $.extend(
                        true,
                        {},
                        meta,
                        {'action': action}
                    )
                );
            },
            '_rawSendMessage': function(toJid, type, contents, meta) {
                return 123;
            }
        });

    self.restore = function() {
        self.objectMocker.restore();
    }
};