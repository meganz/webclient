/**
 * DeviceCentreFolder
 *
 * Model entity holding device centre device folder behavior
 */
class DeviceCentreFolder {
    /**
     * DeviceCentreFolder constructor
     * @param {String} d - Handle of the device where the folder is located
     * @param {String} h - Handle of the folder
     */
    constructor(d, h) {
        /**
         * {String} d - Handle of the device where the folder is located
         */
        this.d = d;

        /**
         * {String} h - Handle of the folder
         */
        this.h = h;
    }

    /**
     * Whether it's a device folder, to avoid checking instanceof
     * @returns {Boolean} - true if it's a device folder, false otherwise
     */
    get isDeviceFolder() {
        return true;
    }

    /**
     * Whether the device folder can be moved
     * @returns {Boolean} - true if it can be moved, false otherwise
     */
    get canMove() {
        return !this.isBackup;
    }

    /**
     * Whether the device folder is a backup folder
     * @returns {Boolean} - true if it's a backup folder, false otherwise
     */
    get isBackup() {
        return this.t === mega.devices.utils.deviceFolderType.backup;
    }

    /**
     * @param {any} props - properties to be assigned to the device folder
     */
    set props(props) {
        Object.assign(this, props);
    }

    /**
     * Returns device folder path
     * Replace current path elements with device folder path
     * @param {Array} path - current path to node
     * @returns {Array} - Array path
     */
    getPath(path) {
        const index = path.indexOf(this.h);
        if (index === -1) {
            return path;
        }
        return [...path.slice(0, index + 1), this.d, mega.devices.rootId];
    }
}
