// JSON parser/splitter
// (this is tailored to processing what the API actually generates
// i.e.: NO whitespace, NO non-numeric/string constants ("null"), etc...)
// accepts string and Uint8Array input, but not a mixture of the two
(function() {
    "use strict";

    var JSONSplitter = function json_splitter(filters, ctx, format_uint8array) {
        if (!(this instanceof json_splitter)) {
            return new json_splitter(filters, ctx, format_uint8array);
        }

        // position in source string
        this.p = 0;

        // remaining part of previous chunk (chunked feeding only)
        this.rem = false;

        // enclosing object stack at current position (type + name)
        this.stack = [];

        // 0: no value expected, 1: optional value expected, -1: compulsory value expected
        this.expectvalue = -1;

        // last hash name seen
        this.lastname = '';

        // hash of exfiltration vector callbacks
        this.filters = filters;

        // bucket stack
        this.buckets = [];
        this.lastpos = 0;

        // optional callee scope
        this.ctx = ctx;

        if (format_uint8array) {
            // extraction/manipulation helpers for Uint8Array inputs

            // convert input Uint8Array to string
            this.tostring = function(u8) {
                var b = '';

                for (var i = 0; i < u8.length; i++) {
                    b = b + String.fromCharCode(u8[i]);
                }

                return b;
            };

            // convert char to Uint8Array element (number)
            this.fromchar = function(c) {
                return c.charCodeAt(0);
            };

            // convert Uint8Array element (number) to char
            this.tochar = function(c) {
                return String.fromCharCode(c);
            };

            // concatenate two Uint8Arrays (a can be false - relies on boolean.length to be undefined)
            this.concat = function(a, b) {
                var t = new Uint8Array(a.length + b.length);
                if (a) {
                    t.set(a, 0);
                }
                t.set(b, a.length + 0);
                return t;
            };

            // sub-Uint8Array of a Uint8Array given position p and optional length l
            this.sub = function(s, p, l) {
                return l >= 0 ? new Uint8Array(s.buffer, p, l)
                    : new Uint8Array(s.buffer, p);
            };
        }
        else {
            // extraction/manipulation helpers (mostly no-ops) for string inputs

            // convert input string to string
            this.tostring = function(s) {
                return s;
            };

            // convert char to string element (char)
            this.fromchar = function(c) {
                return c;
            };

            // convert string element (char) to char
            this.tochar = function(c) {
                return c;
            };

            // concatenate two strings (a can be false)
            this.concat = function(a, b) {
                return a ? a + b : b;
            };

            // substring
            this.sub = function(s, p, l) {
                return s.substr(p, l);
            };
        }

        // console logging
        this.logger = MegaLogger.getLogger('JSONSplitter');
    };

    // returns the position after the end of the JSON string at o or -1 if none found
    // (does not perform a full validity check on the string)
    JSONSplitter.prototype.strend = function strend(s, o) {
        var oo = o;

        // find non-escaped "
        while ((oo = s.indexOf(this.fromchar('"'), oo + 1)) >= 0) {
            var e = oo;
            while (this.tochar(s[--e]) === '\\') {
                /* noop */
            }

            e = oo - e;
            if (e & 1) {
                return oo + 1;
            }
        }

        return -1;
    };

    // returns the position after the end of the JSON number at o or -1 if none found
    JSONSplitter.prototype.numberre = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

    JSONSplitter.prototype.numend = function numend(s, o) {
        var oo = o;

        // (we do not set lastIndex due to the potentially enormous length of s)
        while ('0123456789-+eE.'.indexOf(this.tochar(s[oo])) >= 0) {
            oo++;
        }

        if (oo > o) {
            var r = this.numberre.exec(this.tostring(this.sub(s, o, oo - o)));

            if (r) {
                return o + r[0].length;
            }
        }

        return -1;
    };

    // process a JSON chunk (of a stream of chunks, if the browser supports it)
    // FIXME: rewrite without large string concatenation
    JSONSplitter.prototype.chunkproc = function json_chunkproc(chunk, inputcomplete) {
        // we are not receiving responses incrementally: process as growing buffer
        if (!chunked_method) {
            return this.proc(chunk, inputcomplete);
        }

        // otherwise, we just retain the data that is still going to be needed in the
        // next round... enabling infinitely large accounts to be "streamed" to IndexedDB
        // (in theory)
        if (this.rem.length) {
            // append to previous residue
            if (chunk) {
                this.rem = this.concat(this.rem, chunk);
            }
            chunk = this.rem;
        }

        // process combined residue + new chunk
        var r = this.proc(chunk, inputcomplete);

        if (r >= 0) {
            // processing ended
            this.rem = false;
            return r;
        }

        if (this.lastpos) {
            // remove processed data
            this.rem = this.sub(chunk, this.lastpos);

            this.p -= this.lastpos;
            this.lastpos = 0;
        }
        else {
            // no data was processed: store entire chunk
            this.rem = chunk;
        }

        return r;
    };

    // jshint -W074
    // returns -1 if it wants more data, 0 in case of a fatal error, 1 when done
    JSONSplitter.prototype.proc = function json_proc(json, inputcomplete) {
        var node;
        var filter;
        var callback;

        if (inputcomplete && json && !this.p && json.length > 7 && this.tostring(this.sub(json, 0, 7)) === '{"err":') {
            callback = this.filters['#'];
            node = JSON.parse(this.tostring(json));

            if (d) {
                this.logger.debug('APIv2 Custom Error Detail', node, [this.ctx]);
            }
            if (callback) {
                callback.call(this.ctx, node);
            }
            return 1;
        }

        while (this.p < json.length) {
            var c = this.tochar(json[this.p]);

            if (c === '[' || c === '{') {
                if (!this.expectvalue) {
                    this.logger.error("Malformed JSON - unexpected object or array");
                    return 0;
                }

                this.stack.push(this.tochar(json[this.p]) + this.lastname);

                if (this.filters[this.stack.join('')]) {
                    // a filter is configured for this path - recurse
                    this.buckets[0] += this.tostring(this.sub(json, this.lastpos, this.p - this.lastpos));
                    this.lastpos = this.p;
                    this.buckets.unshift('');
                }

                this.p++;
                this.lastname = '';
                this.expectvalue = c === '[';
            }
            else if (c === ']' || c === '}') {
                if (this.expectvalue < 0) {
                    this.logger.error("Malformed JSON - premature array closure");
                    return 0;
                }

                if (!this.stack.length || "]}".indexOf(c) !== "[{".indexOf(this.stack[this.stack.length - 1][0])) {
                    this.logger.error("Malformed JSON - mismatched close");
                    return 0;
                }

                this.lastname = '';

                // check if this concludes an exfiltrated object and return it if so
                filter = this.stack.join('');
                callback = this.filters[filter];
                this.p++;

                if (callback) {
                    // we have a filter configured for this object
                    try {
                        // pass filtrate to application and empty bucket
                        node = JSON.parse(
                            this.buckets[0] + this.tostring(this.sub(json, this.lastpos, this.p - this.lastpos))
                        );
                        if (filter === '[{[f2{' || filter === '{[a{{t[f2{') {
                            node.fv = 1; // file version
                        }
                        callback.call(this.ctx, node);
                    }
                    catch (e) {
                        this.logger.error("Malformed JSON - parse error in filter element " + callback.name, e);
                        return 0;
                    }

                    this.buckets.shift();
                    this.lastpos = this.p;
                }

                this.stack.pop();
                this.expectvalue = 0;
            }
            else if (c === ',') {
                if (this.expectvalue) {
                    this.logger.error("Malformed JSON - stray comma");
                    return 0;
                }
                if (this.lastpos === this.p) {
                    this.lastpos++;
                }
                this.p++;
                this.expectvalue = this.stack[this.stack.length - 1][0] === '[';
            }
            else if (c === '"') {
                var t = this.strend(json, this.p);
                if (t < 0) {
                    break;
                }

                if (this.expectvalue) {
                    this.p = t;
                    this.expectvalue = false;
                }
                else {
                    // (need at least one char after end of property string)
                    if (t === json.length) {
                        break;
                    }

                    if (this.tochar(json[t]) !== ':') {
                        this.logger.error("Malformed JSON - no : found after property name");
                        return 0;
                    }

                    this.lastname = this.tostring(this.sub(json, this.p + 1, t - this.p - 2));
                    this.expectvalue = -1;
                    this.p = t + 1;
                }
            }
            else if (c >= '0' && c <= '9' || c === '.' || c === '-') {
                if (!this.expectvalue) {
                    this.logger.error("Malformed JSON - unexpected number");
                    return 0;
                }

                var j = this.numend(json, this.p);

                if (j === json.length) {
                    // numbers, on the face of them, do not tell whether they are complete yet
                    // fortunately, we have the "inputcomplete" flag to assist
                    if (inputcomplete && !this.stack.length) {
                        // this is a stand-alone number, do we have a callback for them?
                        callback = this.filters['#'];
                        if (callback) {
                            callback.call(this.ctx, this.tostring(json));
                        }
                        return 1;
                    }
                    break;
                }

                if (j < 0) {
                    break;
                }

                this.p = j;
                this.expectvalue = false;
            }
            else if (c === ' ') {
                // a concession to the API team's aesthetic sense
                // FIXME: also support tab, CR, LF
                this.p++;
            }
            else {
                this.logger.error("Malformed JSON - bogus char at position " + this.p);
                return 0;
            }
        }

        return !this.expectvalue && !this.stack.length ? 1 : inputcomplete ? json === false : -1;
    };
    Object.freeze(JSONSplitter.prototype);

    window.JSONSplitter = JSONSplitter;
})();
