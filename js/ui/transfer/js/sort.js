/** @property T.ui.sort */
lazy(T.ui, 'sort', () => {
    'use strict';

    return freeze({
        collator: Intl.Collator('co', {sensitivity: 'variant', caseFirst: 'upper'}),

        compareStrings(a, b, d) {
            const strA = a || '';
            const strB = b || '';
            const res = this.collator.compare(strA, strB) * d;

            return res || String(strA).localeCompare(strB) * d;
        },

        doSort(n, m, d) {
            d |= 0;
            return n.sort((a, b) => this[m](a, b, d));
        },

        filefolder(a, b) {
            return a.t > b.t ? -1 : 1;
        },

        str(a, b, d) {
            return this.compareStrings(a, b, d);
        },

        date(a, b, d) {
            if (a.ct !== b.ct) {
                return (a.ct < b.ct ? -1 : 1) * d;
            }
            return (a.ts < b.ts ? -1 : 1) * d;
        },

        name(a, b, d) {
            if (a.t !== b.t) {
                return this.filefolder(a, b);
            }

            if (a.name !== b.name) {
                return this.str(a.name, b.name, d);
            }

            if (a.ts !== b.ts) {
                return this.date(a, b, d);
            }

            return this.compareStrings(a.h, b.h, d);
        },

        size(a, b, d) {
            if (a.t !== b.t) {
                return this.filefolder(a, b);
            }

            const aSize = a.s || a.tb || 0;
            const bSize = b.s || b.tb || 0;

            if (aSize === bSize) {
                return this.name(a, b, d);
            }
            return (aSize < bSize ? -1 : 1) * d;
        },

        type(a, b, d) {
            if (a.t !== b.t) {
                return this.filefolder(a, b);
            }

            if (typeof a.name === 'string' && typeof b.name === 'string') {
                const typeA = filetype(a.name);
                const typeB = filetype(b.name);

                if (typeA !== typeB) {
                    return this.compareStrings(typeA, typeB, d);
                }
            }

            return this.name(a, b, d);
        }
    });
});
