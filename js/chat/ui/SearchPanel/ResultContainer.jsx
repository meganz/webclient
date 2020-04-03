import React from 'react';
import { ResultTable } from './ResultTable.jsx';
import { ResultRow } from './ResultRow.jsx';

export const TYPE = {
    MESSAGE: 1,
    CHAT: 2,
    MEMBER: 3,
    NIL: 4
};

export const LABEL = {
    MESSAGES: 'Messages',
    CONTACTS_AND_CHATS: 'Contacts And Chats',
    NO_RESULTS: 'No Results',
    RECENT: 'Recent'
};

export const ResultContainer = ({ recent, results }) => {

    /**
     * `Recent`
     * https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
     */

    if (recent && recent.length) {
        return (
            <ResultTable heading={LABEL.RECENT}>
                {recent.map(contact =>
                    <ResultRow key={contact.data} type={TYPE.MEMBER} result={contact} />
                )}
            </ResultTable>
        );
    }

    /**
     * Result table -- `Contacts and Chats` and `Messages`, incl. `No Results`
     * https://mega.nz/#!VUkHRS4L!S2fz1aQ9Y93RZe5ky75Th9zBbdudGnApNs90TNO4eG8
     * https://mega.nz/#!tEt3iaIB!XxxZTSnbCdhE0cuzYBP_owiLFvv0cxrOVq4PMiB0Irc
     * https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
     */

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
                    {hasRows ? table.map(row => row) : <ResultRow type={TYPE.NIL} />}
                </ResultTable>
            );
        })
    );
};
