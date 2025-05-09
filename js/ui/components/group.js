class MegaComponentGroup {

    constructor() {
        this.children = [];
        this.childMap = Object.create(null);
    }

    addChild(id, child) {
        this.childMap[id] = this.children.push(child) - 1;
        child.group = this;
    }

    getChild(id) {
        return this.children[this.childMap[id]];
    }

    removeChild(id) {
        const index = this.childMap[id];
        if (index !== undefined) {
            delete this.childMap[id];
            delete this.children[index].group;
            this.children.splice(index, 1);
        }
    }

    each(callback) {
        if (typeof callback === 'function') {
            for (let i = this.children.length; i--;) {
                callback(this.children[i]);
            }
        }
    }

    filter(condition) {
        if (typeof condition === 'function') {
            return this.children.filter(condition);
        }
    }

    map(callback) {
        if (typeof callback === 'function') {
            return this.children.map(callback);
        }
    }

    eachEntry(callback) {
        if (typeof callback === 'function') {
            const keys = Object.keys(this.childMap);
            for (let i = keys.length; i--;) {
                callback(keys[i], this.children[this.childMap[keys[i]]]);
            }
        }
    }
}
