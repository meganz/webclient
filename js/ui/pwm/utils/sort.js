(mega => {
    "use strict";

    lazy(mega.ui.pm, 'sort', () => {
        return {
            collator: Intl.Collator('co', {sensitivity: 'variant', caseFirst: 'upper'}),
            doSort() {
                const [m, d] = mega.ui.pm.list.order;

                mega.ui.pm.list.vaultPasswords.sort((a, b) => this[m](a, b, d));
            },
            name(a, b, d) {
                d |= 0;

                const aName = a.name.trim();
                const bName = b.name.trim();

                if (aName === bName) {
                    return this.date(a, b, d);
                }

                const reg = new RegExp(/[\p{L}]/u);
                const minlength = Math.min(aName.length, bName.length);

                for (let i = 0; i < minlength; i++) {

                    const charA = aName[i];
                    const charB = bName[i];

                    if (charA === charB) {
                        continue;
                    }

                    if (i === 0) {
                        const isLetterA = reg.test(charA);
                        const isLetterB = reg.test(charB);

                        if (!isLetterA && isLetterB) {
                            return Number(d);
                        }
                        else if (isLetterA && !isLetterB) {
                            return -1 * d;
                        }
                    }

                    let diff = charA.toLowerCase().codePointAt() - charB.toLowerCase().codePointAt();

                    if (!diff) {
                        diff = charA.codePointAt() - charB.codePointAt();
                    }

                    if (diff) {
                        return diff * d;
                    }

                    return charA.localeCompare(charB, lang, {sensitivity: 'variant', caseFirst: 'upper'}) * d;
                }

                return aName.length - bName.length * d;
            },
            date(a, b, d) {
                d |= 0;

                return (a.ts - b.ts) * d;
            }
        };
    });

})(window.mega);
