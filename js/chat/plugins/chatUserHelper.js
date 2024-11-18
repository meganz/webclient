class ChatUserHelper {

    constructor(options) {
        this.options = options;

        this._dedupUserPromises = Object.create(null);
        this.SIMPLETIP_USER_LOADER = '[I class="small-blue-spinner"][/I]';
    }

    /**
     * Fetches the users name preferring nicknames.getNickname than M.getNameByHandle
     *
     * @param {String} userHandle The user to fetch
     * @param {ChatRoom} [chatRoom] Optional ChatRoom to read the public chat handle from
     * @returns {Promise} Resolves with the users nickname if available.
     */
    async getUserNickname(userHandle, chatRoom) {
        let name = nicknames.getNickname(userHandle);
        if (!name) {
            await this.getUserName(
                userHandle,
                is_chatlink.ph || (chatRoom && chatRoom.publicChatHandle)
            ).catch(dump);
            name = nicknames.getNickname(userHandle);
        }
        return name || '';
    }

    /**
     * Fetches usernames for an array of user handles. Contacts or non-contacts with names are skipped
     *
     * @param {Array} handles Array of user handles to fetch
     * @param {ChatRoom} [chatRoom] Optional ChatRoom to read the public chat handle from
     * @returns {Promise} Resolves when all applicable names are fetched.
     */
    async fetchAllNames(handles, chatRoom) {
        const promises = [];
        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            if (handle in M.u && M.u[handle].c !== 1 && !M.getNameByHandle(handle)) {
                promises.push(this.getUserName(
                    handle,
                    is_chatlink.ph || (chatRoom && chatRoom.publicChatHandle)
                ));
            }
        }
        if (promises.length) {
            return Promise.allSettled(promises);
        }
        return true;
    }

    /**
     * Fetcher for usernames deduplicated for pending requests.
     *
     * @param {string|object} user The user or user handle to get the name of
     * @param {string} [chatHandle] The optional chat handle for fetching
     * @returns {Promise} Resolves with the users name.
     */
    async getUserName(user, chatHandle) {
        if (typeof user === 'string') {
            user = user in M.u ? user : false;
        }
        else {
            user = user.h || user.u;
        }

        if (!user) {
            throw new Error('Invalid user specified');
        }

        if (this._dedupUserPromises[user]) {
            return this._dedupUserPromises[user];
        }
        const name = M.getNameByHandle(user);
        // If the user seems to only have the email set try fetching again.
        // Accepting that users with their name explicitly set as their email will be re-fetched.
        if (name && name !== String(M.u[user].m).trim()) {
            return name;
        }

        this._dedupUserPromises[user] = this._dedupFetchName(user, chatHandle).always(() => {
            delete this._dedupUserPromises[user];
        });
        return this._dedupUserPromises[user];
    }

    async _dedupFetchName(handle, chatHandle) {
        await M.syncUsersFullname(handle, chatHandle).catch(dump);
        return M.getNameByHandle(handle) || '';
    }
}
