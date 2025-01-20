/**
 * DeviceCentreDevice
 *
 * Model entity holding device centre device behavior
 */
class DeviceCentreDevice {
    /**
     * DeviceCentreDevice constructor
     * @param {String} h - Handle of the device
     */
    constructor(h) {
        /**
         * {String} h - Handle of the device
         */
        this.h = h;

        /*
        * {Object<DeviceCentreFolder>} folders - Folders contained in current device
        */
        this.folders = Object.create(null);
    }

    /**
     * @param {any} props - properties to be assigned to the device
     */
    set props(props) {
        Object.assign(this, props);
    }

    /**
     * Returns device path
     * @returns {Array} Path array
     */
    getPath() {
        return [this.h, mega.devices.rootId];
    }
}
