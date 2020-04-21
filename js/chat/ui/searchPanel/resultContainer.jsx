import React from 'react';
import ResultTable  from './resultTable.jsx';
import ResultRow  from './resultRow.jsx';
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

    MESSAGES: 'Messages',
    CONTACTS_AND_CHATS: 'Contacts And Chats',
    NO_RESULTS: 'No Results',
    RECENT: 'Recent',

    //
    // Search field status
    // ------------------------------------
    DECRYPTING_RESULTS: 'decrypting results...',
    RESUME_SEARCH: 'resume search',
    SEARCH_COMPLETE: 'search complete'
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

    renderResults = (results, status) => {

        //
        // Result table -- `Contacts and Chats` and `Messages`, incl. `No Results`
        // https://mega.nz/#!VUkHRS4L!S2fz1aQ9Y93RZe5ky75Th9zBbdudGnApNs90TNO4eG8
        // https://mega.nz/#!tEt3iaIB!XxxZTSnbCdhE0cuzYBP_owiLFvv0cxrOVq4PMiB0Irc
        // https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
        // ----------------------------------------------------------------------

        const RESULT_TABLE = {
            CONTACTS_AND_CHATS: [],
            MESSAGES: [],
        };

        for (let i = results.length; i--;) {
            const result = results[i];
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

        return (
            Object.keys(RESULT_TABLE).map((key, index) => {
                const table = RESULT_TABLE[key];
                const hasRows = table.length;

                return (
                    <ResultTable key={index} heading={key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS}>
                        {hasRows ? table.map(row => row) : <ResultRow type={TYPE.NIL} status={status} />}
                    </ResultTable>
                );
            })
        );
    };

    render() {
        const { recents, results, status } = this.props;
        return recents && recents.length ? this.renderRecents(recents) : this.renderResults(results, status);
    }
}
