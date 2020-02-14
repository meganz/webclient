MegaData.prototype.reset = function() {
    this.v = [];
    this.d = Object.create(null);
    this.c = Object.create(null);
    this.h = Object.create(null);
    this.t = Object.create(null);
    this.su = Object.create(null);
    this.ps = Object.create(null);
    this.opc = Object.create(null);
    this.ipc = Object.create(null);
    this.tree = Object.create(null);
    this.c.shares = Object.create(null);
    this.c.contacts = Object.create(null);
    this.cfInflightR = Object.create(null);
    this.filterLabel = Object.create(null);
    this.filterTreePanel = Object.create(null);

    // M.d & M.c for chat
    this.chd = Object.create(null);
    this.chc = Object.create(null);

    this.suba = Object.create(null);
    if (typeof MegaDataMap !== 'undefined') {
        this.u = new MegaDataMap();
    }

    this.nn = false;
    this.sn = false;
    this.cf = false;
    this.filter = false;
    this.sortfn = false;
    this.sortd = false;
    this.rendered = false;
    this.RootID = undefined;
    this.RubbishID = undefined;
    this.InboxID = undefined;
    this.viewmode = 0; // 0 list view, 1 block view
    this.currentCustomView = false;

    var tree$tmpl = document.getElementById('template-tree-item');
    this.tree$tmpl = tree$tmpl && tree$tmpl.firstElementChild.cloneNode(true) || document.createElement('li');

    mBroadcaster.sendMessage("MegaDataReset");
};
