class MegaComponentGroup {

    constructor() {
        this.children = Object.create(null);
    }

    addChild(id, child) {
        this.children[id] = child;
    }

    getChild(id) {
        return this.children[id];
    }
}
