MegaData.prototype.hasInboxItems = function() {
    return $.len(this.c[this.InboxID] || {}) > 0;
};

MegaData.prototype.getInboxUsers = function() {
    var uniqueUsersList = {};
    this.getInboxItems().forEach(function(v, k) {
        assert(M.u[v.u], 'user is not in M.u when trying to access inbox item users');
        uniqueUsersList[v.u] = M.u[v.u];
    });

    return obj_values(uniqueUsersList);
};

MegaData.prototype.getInboxItems = function() {
    return this.getFilterBy(function(node) {
        return node.p === M.InboxID;
    });
};
