class gAdvs {

    /**
     * gAdvs
     * @constructor
     * @param {String} ph Public handle for pages
     * @param {Object} [dlres] dl_res from `g` request if there is any.
     *
     * @return {Object} gAdvs - Created gAdvs object
     */
    constructor(ph, dlres) {

        this.ph = ph;
        this.fetched = false;
        this.ads = Object.create(null);
        this.rendered = Object.create(null);

        if (dlres) {
            this.parse(dlres);
        }
    }

    /**
     * Parse data from `g` request.
     * @param {Object} res the `g` request's reply.
     */
    parse(res) {
        if (d) {
            console.debug('gads', res && res.ad);
        }
        this.fetched = true;

        if (res && Array.isArray(res.ad)) {

            for (let i = res.ad.length; i--;) {
                this.ads[res.ad[i].id] = res.ad[i];
            }

            return true;
        }

        return false;
    }

    /**
     * Render iframe for the advertisement, and save it on redered list.
     *
     * @param {Object} $target Target jQuery element to fetch iframe.
     * @param {String} adsunit Advertisement unit key to choose which data should display.
     */
    async render($target, adsunit) {

        adsunit = adsunit || $target.data('adsunit') || '';

        // There is no data fetched for this public handle. trying to fetch it from api
        if (!this.fetched) {
            const res = await this.fetch(adsunit).catch(nop);
            if (!this.parse(res)) {
                if (d) {
                    console.debug('gads: nothing to show.');
                }
                return false;
            }
        }

        // This is already rendered or not need to render [again]
        if (this.rendered[adsunit] || !this.ads[adsunit]) {
            return false;
        }

        if (!$target.length) {

            if (d) {
                console.error('gads: invalid element, adsunit: %s, adsdata:', adsunit, this.ads[adsunit], $target);
            }

            return false;
        }

        const ad = this.ads[adsunit];

        if (/["'()<>]/.test(mURIDecode(ad.src))) {
            console.error('Invalid Ad Src...', ad);
            return false;
        }

        let iframe = $('iframe', $target).get(0);

        if (!iframe) {

            iframe = mCreateElement(
                'iframe',
                {
                    type: 'content',
                    class: 'gadvs-frame ' + adsunit,
                    width: ad.w,
                    height: ad.h,
                    sandbox: 'allow-scripts allow-popups allow-same-origin',
                    frameBorder: '0',
                },
                $target.get(0)
            );
        }

        iframe.src = ad.src;

        $target.addClass('ads-active');

        this.rendered[adsunit] = $target;

        mBroadcaster.sendMessage('trk:event', 'advertisement', 'render', 'google', '1');

        return true;
    }

    /**
     * fetch advertisement data from api
     *
     * @param {Array|String} adsunits Advertisement unit key or array of keys to choose which data should be fetched.
     * @return {Promise}
     */
    async fetch(adsunits) {
        if (typeof adsunits === 'string') {
            adsunits = [adsunits];
        }

        return M.req({a: 'adf', ad: localStorage.adflag || 1, au: adsunits, ph: this.ph});
    }

    /**
     * Destory advertisement iframe and removed from rendered list.
     *
     * @param {Array|String} [adsunits] Advertisement unit key or array of keys to choose which ads unit to detroy.
     *        If not set destory all available ads
     */
    destroy(adsunits) {

        if (typeof adsunits === 'string') {
            adsunits = [adsunits];
        }
        else {
            adsunits = Object.keys(this.rendered);
        }

        for (let i = adsunits.length; i--;) {
            let unit = adsunits[i];

            if (this.rendered[unit]) {
                this.rendered[unit].removeClass('ads-active').empty();
                delete this.rendered[unit];
            }
        }
    }

    /**
     * Manual static function to check provide public handle is suitable for advertisement.
     *
     * @param {String} ph Public handle to check
     *
     * @return {Promise} This is resolved with response from api
     */
    static checkAvailable(ph) {

        return M.req({a: 'ads', ad: localStorage.adflag || 1, ph: ph});
    }
}
