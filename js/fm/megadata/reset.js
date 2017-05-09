MegaData.prototype.reset = function() {
    this.d = {};
    this.v = [];
    this.h = Object.create(null);
    this.c = {shares: Object.create(null)};

    if (typeof MegaDataMap !== 'undefined') {
        this.u = new MegaDataMap();
        this.u.addChangeListener(function() {
            if (fminitialized) {
                if (
                    typeof $.sortTreePanel !== 'undefined' &&
                    typeof $.sortTreePanel.contacts !== 'undefined' &&
                    $.sortTreePanel.contacts.by === 'status'
                ) {
                    M.contacts(); // we need to resort
                }

                if (getSitePath() === "/fm/contacts") {
                    // re-render the contact view page if the presence had changed
                    M.openFolder('contacts', true);
                }
            }
        });
    }

    this.t = Object.create(null);
    this.opc = {};
    this.ipc = {};
    this.ps = {};
    this.nn = false;
    this.sn = false;
    this.filter = false;
    this.sortfn = false;
    this.sortd = false;
    this.rendered = false;
    this.RootID = undefined;
    this.RubbishID = undefined;
    this.InboxID = undefined;
    this.viewmode = 0; // 0 list view, 1 block view
    this.su = Object.create(null);
    this.tree = Object.create(null);

    mBroadcaster.sendMessage("MegaDataReset");
};
