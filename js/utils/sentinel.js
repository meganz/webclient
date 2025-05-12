mBroadcaster.once('boot_done', () => {
    'use strict';
    const storage = localStorage;
    const domain2event = freeze({
        'mega.nz': 99702,
        'transfer.it': 99623,
        'smoketest.transfer.it': 99623
    });
    const eid = self.is_extension ? 99702 : domain2event[location.host];

    if (!eid
        || self.buildOlderThan10Days
        || storage.mSentinelOptOut) {

        self.onerror = null;
        return false;
    }

    const disable = (...a) => {
        self.onerror = null;
        self.log99723 = true;
        console.error(...a);
    };

    const optOut = (...a) => {
        disable(...a);
        storage.mSentinelOptOut = 1;
    };

    const eventlog = self.eventlog || ((e, m) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apipath}cs?id=0`, true);
        xhr.send(JSON.stringify([{a: 'log', e, m}]));
    });

    const trim = (s) => {
        return String(s || '')
            .replace('-extension://', '~')
            .replace(/blob:[^\s:]+/, '..')
            .replace(/([^'])\w+:\/\/[^\s:]+/, '$1..')
            .replace(/\.\.:\/\/[^\s:]+/, '..')
            .replace(/(?: line \d+ > eval)+/g, ' >.eval')
            .trim();
    };

    const url2origin = (url) => {
        if (url[0] === "'") {
            url = url.slice(1);
            if (url.slice(-1) === "'") {
                url = url.slice(0, -1);
            }
        }
        const a = document.createElement('a');
        a.href = url;

        if (a.origin && a.origin !== 'null') {
            return `${a.origin}\u2026`;
        }
        return `${a.protocol}//${a.hostname}\u2026`;
    };

    const thirdPartyScript = (dump, data) => {
        return /userscript|user\.js|EvalError/.test(dump.m + data)
            || dump.m.includes('Permission denied to access property')
            || dump.m.includes('Cannot redefine property')
            || dump.m.includes("evaluating 'r(a,c)'")
            || dump.m.includes("evaluating 'ze(e,")
            || dump.m.includes("evaluating 'a.L")
            || dump.m.includes('Error: hookFull');
    };

    const unknownScriptSource = (data) => {
        return data.includes('Unknown script code:')
            || data.includes('Function code:')
            || data.includes('(eval code:')
            || data.includes('(unknown source)')
            || /<anonymous>:\d+:/.test(data);
    };

    const getCallStack = tryCatch((msg, stack) => {
        msg = String(msg).trim();

        let maxStackLines = 15;
        const re = RegExp(`${msg.substr(0, 96).replace(/^\w+:\s/, '').replace(/(\W)/g, '\\$1')}[^\r\n]+`);

        stack = String(stack)
            .replace(msg, '')
            .replace(re, '')
            .split("\n")
            .map(trim)
            .filter((s, idx, a) => s.length && a[idx - 1] !== s);

        for (let idx = 1; idx < stack.length; idx++) {

            if (stack[idx].includes('@resource:')
                || stack[idx].includes('@jar:')) {

                maxStackLines = idx;
                break;
            }
        }

        if (msg.includes(':skull:')) {
            maxStackLines = 50;
        }
        return stack.splice(0, maxStackLines).join("\n");
    });

    const djb2hash = (data) => {
        let h = 0x1505;
        let l = data.length;
        while (l--) {
            h = (h << 5) + h + data.charCodeAt(l);
        }
        return h >>> 0;
    };

    const canSubmitCrash = tryCatch((dump) => {
        const pid = `v${canSubmitCrash.pid}`;
        const hash = djb2hash(JSON.stringify(dump));
        let crashes = JSON.parse(storage.crashes || '{}');

        if (crashes.v !== pid) {
            crashes = {v: pid};
        }

        // Reported less than 10 days ago?
        if (Date.now() - crashes[hash] < 864e6) {
            return false;
        }

        dump.x = hash;
        crashes[hash] = Date.now();
        storage.crashes = JSON.stringify(crashes);

        return true;
    });

    lazy(canSubmitCrash, 'pid', () => {
        const sb = document.querySelector('script[src*="secureboot"]');
        return sb && String(sb.src).split('=').pop().slice(-16);
    });

    lazy(canSubmitCrash, 'env', () => {
        let tag = false;

        if (self.is_mobile) {
            tag = 'mobile';
        }
        else if (self.is_embed) {
            tag = 'embed';
        }
        else if (self.pfcol) {
            tag = 'AL';
        }
        else if (self.pfid) {
            tag = 'FL';
        }
        else if (mega.infinity) {
            tag = 'INF';
        }
        else if (self.is_drop) {
            tag = 'drop';
        }
        else if (self.is_transferit) {
            tag = 'IT(:ack:)';
        }
        return tag ? `[${tag}] ` : '';
    });

    const validateCrashReport = (dump, msg, url, ln, errobj, version) => {

        if (thirdPartyScript(dump, `${url}${errobj && errobj.stack}`)) {
            console.warn('Your account is only as secure as your computer...');
            console.warn('Check your installed extensions for the one injecting bogus script(s) on this page...');

            return false;
        }

        if (/ns_err|out[\s_]+of[\s_]+mem|dead\s+object|allocation\s+failed/i.test(dump.m)
            && (!self.ua || !ua.details || !ua.details.blink)) {

            return false;
        }

        const expectedSourceOrigin = url || ln > 999;
        if (!expectedSourceOrigin) {
            if (!/SyntaxError|Script\serror/.test(dump.m)) {
                onIdle(() => {
                    eventlog(99806, JSON.stringify([2, dump.m, `${url}:${ln}`]));
                });
            }
            return false;
        }

        if (errobj) {
            if (errobj.stack) {
                dump.s = getCallStack(msg, errobj.stack);

                if (unknownScriptSource(dump.s)) {

                    return optOut('Got uncaught exception from unknown resource...', msg, [errobj], url, ln);
                }
            }

            if (!errobj.udata && /\w/.test(msg || '')) {

                eventlog(eid, JSON.stringify([version, ln, msg]), true);
            }
        }

        return !/Access to (?:the script at )?'.*(?:' from script|'?is) denied|origin 'null'/.test(dump.m);
    };

    // ----------------------------------------------------------------------------------------

    const gExceptionHandler = tryCatch((msg, url, ln, cn, errobj) => {

        if (url && ln < 2) {
            console.debug([errobj || msg]);
            return;
        }

        const dump = {
            l: ln,
            c: cn,
            f: trim(url),
            m: trim(msg)
                .replace(/'[a-z]+:\/+[^']+(?:'|$)/gi, url2origin)
                .replace(/(Cannot read propert[\s\w]+)\(?([\s\w]*'[\w-]{8}')/, "$1'<h>?'")
                .replace(/(Access to '\.\.).*(' from script denied)/, '$1$2')
                .replace(/gfs\w+\.userstorage/, 'gfs\u2026userstorage')
                .replace(/^uncaught\W*(?:exception\W*)?/i, ''),
        };

        if (dump.m.includes("Failed to construct 'Worker'")) {
            errobj = {};
            dump.l = ln = 1; // enforce deduplication..
        }

        if (dump.m.includes("\n")) {
            const lns = dump.m.split(/\r?\n/).map(String.trim).filter(String);

            if (lns.length > 6) {
                dump.m = [...lns.slice(0, 2), "[..!]", ...lns.slice(-2)].join(" ");
            }
        }

        if (!canSubmitCrash(dump)) {
            return false;
        }
        dump.m = canSubmitCrash.env + dump.m.replace(/\s+/g, ' ');

        let version = buildVersion.website;

        if (self.is_extension) {
            if (self.is_firefox_web_ext) {
                version = buildVersion.firefox;
            }
            else if (mega.chrome) {
                version = buildVersion.chrome;
            }
        }

        if (!validateCrashReport(dump, msg, url, ln, errobj, version)) {

            return disable(dump.m, dump, errobj);
        }

        if (!(ln && dump.s)) {
            dump.m = dump.m.toLowerCase().includes('out of memory')
                ? '!Fatal! Out Of Memory.'
                : dump.m.replace(/[^\s\w]/gi, '') || `[!] ${msg}`;
        }

        if (/\w/.test(dump.m) && eid === 99702) {

            const payload = {
                a: 'cd2',
                c: JSON.stringify(dump),
                t: version
            };

            api.req(payload).catch(nop);
        }
    });

    if (self.__cdumps && __cdumps.length) {
        console.warn('Handling %d deferred runtime exceptions...', __cdumps.length, __cdumps);

        tryCatch(() => {
            for (let i = 0; i < __cdumps.length; ++i) {
                gExceptionHandler(...__cdumps[i]);
            }
            self.__cdumps.length = 0;
        })();
    }
    self.onerror = gExceptionHandler;
});
