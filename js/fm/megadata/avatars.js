
MegaData.prototype.avatars = function(userPurgeList) {
    if (u_type !== 3) {
        return false;
    }
    if (!this.c.contacts) {
        this.c.contacts = Object.create(null);
    }
    if (u_handle) {
        this.c.contacts[u_handle] = 1;
    }

    if (userPurgeList) {
        // if provided, invalidate the pointed user avatars.
        if (!Array.isArray(userPurgeList)) {
            userPurgeList = [userPurgeList];
        }
        userPurgeList.forEach(useravatar.invalidateAvatar);
    }

    if (d) {
        console.time('M.avatars');
    }

    var waitingPromises = [];
    M.u.forEach(function(c, u) {
        if (!avatars[u] && (M.u[u].c === 1 || M.u[u].c === 2 || M.u[u].c === 0 || M.u[u].c === undefined)) {

            waitingPromises.push(useravatar.loadAvatar(u));
        }
    });

    MegaPromise
        .allDone(
            waitingPromises
        ).always(function() {

        if (d) {
            console.timeEnd('M.avatars');
        }
    });

    delete this.c.contacts[u_handle];
};
