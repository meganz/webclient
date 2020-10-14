import React from 'react';
import ResultTable  from './resultTable.jsx';
import ResultRow  from './resultRow.jsx';
import { STATUS } from './searchPanel.jsx';
import { MegaRenderMixin } from '../../../stores/mixins';

export const TYPE = {
    MESSAGE: 1,
    CHAT: 2,
    MEMBER: 3,
    NIL: 4
};

export const LABEL = {

    //
    // Result table & Result row
    // ------------------------------------

    MESSAGES: l[6868],
    CONTACTS_AND_CHATS: l[20174],
    NO_RESULTS: l[8674],
    RECENT: l[20141],

    SEARCH_MESSAGES_CTA: l[23547],
    SEARCH_MESSAGES_INLINE: l[23548],

    //
    // Search field status
    // ------------------------------------

    DECRYPTING_RESULTS: l[23543],
    PAUSE_SEARCH: l[23544],
    RESUME_SEARCH: l[23545],
    SEARCH_COMPLETE: l[23546]
};

export default class ResultContainer extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    renderRecents = recents => (

        //
        // `Recent` table
        // https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
        // ----------------------------------------------------------------------

        <ResultTable heading={LABEL.RECENT}>
            {recents.map(recent =>
                <ResultRow key={recent.data} type={TYPE.MEMBER} result={recent} />
            )}
        </ResultTable>
    );

    renderResults = (results, status, isFirstQuery, onSearchMessages) => {

        //
        // Result table -- `Contacts and Chats` and `Messages`, incl. `No Results`
        // https://mega.nz/#!VUkHRS4L!S2fz1aQ9Y93RZe5ky75Th9zBbdudGnApNs90TNO4eG8
        // https://mega.nz/#!tEt3iaIB!XxxZTSnbCdhE0cuzYBP_owiLFvv0cxrOVq4PMiB0Irc
        // https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
        // ----------------------------------------------------------------------

        if (status === STATUS.COMPLETED && results.length < 1) {
            return (
                <ResultTable>
                    <ResultRow
                        type={TYPE.NIL}
                        isFirstQuery={isFirstQuery}
                        onSearchMessages={onSearchMessages} />
                </ResultTable>
            );
        }

        const RESULT_TABLE = {
            CONTACTS_AND_CHATS: [],
            MESSAGES: [],
        };

        for (let resultTypeGroup in results) {
            let len = results[resultTypeGroup].length;
            for (let i = 0; i < len; i++) {
                const result = results[resultTypeGroup].getItem(i);
                const { MESSAGE, MEMBER, CHAT } = TYPE;
                const { type: resultType, resultId } = result;
                const table = resultType === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';

                RESULT_TABLE[table] = [
                    ...RESULT_TABLE[table],
                    <ResultRow
                        key={resultId}
                        type={resultType === MESSAGE ? MESSAGE : resultType === MEMBER ? MEMBER : CHAT}
                        result={result} />
                ];
            }
        }

        return (
            Object.keys(RESULT_TABLE).map((key, index) => {
                const table = {
                    ref: RESULT_TABLE[key],
                    hasRows: RESULT_TABLE[key] && RESULT_TABLE[key].length,
                    isEmpty: RESULT_TABLE[key] && RESULT_TABLE[key].length < 1,
                    props: {
                        key: index,
                        heading: key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS
                    }
                };

                if (table.hasRows) {
                    return (
                        <ResultTable {...table.props}>
                            {table.ref.map(row => row)}
                        </ResultTable>
                    );
                }

                if (status === STATUS.COMPLETED && key === 'MESSAGES') {
                    const SEARCH_MESSAGES =
                        <div
                            className="search-messages default-white-button"
                            onClick={onSearchMessages}>
                            {LABEL.SEARCH_MESSAGES_CTA}
                        </div>;
                    const NO_RESULTS =
                        <ResultRow
                            type={TYPE.NIL}
                            isFirstQuery={isFirstQuery}
                            onSearchMessages={onSearchMessages} />;

                    return (
                        <ResultTable {...table.props}>
                            {isFirstQuery ? SEARCH_MESSAGES : NO_RESULTS}
                        </ResultTable>
                    );
                }

                return null;
            })
        );
    };

    render() {
        const { recents, results, status, isFirstQuery, onSearchMessages } = this.props;
        return recents && recents.length ?
            this.renderRecents(recents) :
            this.renderResults(results, status, isFirstQuery, onSearchMessages);
    }
}
