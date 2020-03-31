import React from 'react';
import { STATUS } from './SearchPanel.jsx';
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

export const ResultContainer = ({ recent, results, status }) => {

    /**
     * `Recent`
     * https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
     */

    if (recent && recent.length) {
        return (
            <ResultTable heading={LABEL.RECENT}>
                {recent.map(contact =>
                    <ResultRow key={contact.h} type={TYPE.MEMBER} result={contact} />
                )}
            </ResultTable>
        );
    }

    /**
     * Result table -- `Contacts and Chats` and `Messages`
     * https://mega.nz/#!VUkHRS4L!S2fz1aQ9Y93RZe5ky75Th9zBbdudGnApNs90TNO4eG8
     * https://mega.nz/#!tEt3iaIB!XxxZTSnbCdhE0cuzYBP_owiLFvv0cxrOVq4PMiB0Irc
     */

    if (results && results.length) {
        const RESULT_TABLE = {
            CONTACTS_AND_CHATS: [],
            MESSAGES: [],
        };

        results.forEach(({ type: resultType, resultId, ...result }) => {
            const { MESSAGE, MEMBER, CHAT } = TYPE;
            const table = resultType === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';

            RESULT_TABLE[table] = [
                ...RESULT_TABLE[table],
                <ResultRow
                    key={resultId}
                    type={resultType === MESSAGE ? MESSAGE : resultType === MEMBER ? MEMBER : CHAT}
                    result={result} />
            ];
        });

        return (
            Object.keys(RESULT_TABLE).map((key, index) => {
                const table = RESULT_TABLE[key];
                const HAS_ROWS = table.length;

                return (
                    <ResultTable
                        key={index}
                        className={`
                            ${key === 'MESSAGES' ? 'messages' : ''}
                            ${HAS_ROWS ? '' : 'nil'}
                        `}
                        heading={key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS}>
                        {HAS_ROWS ? table.map(row => row) : <ResultRow type={TYPE.NIL} />}
                    </ResultTable>
                );
            })
        );
    }

    /**
     * `No Results`
     * https://mega.nz/#!hd0HRQ4Q!Dhgt8Ju26CXQ3-jKFsYXqaxxllEIUP-0lB_yJ5yZuY8
     */

    if (!results.length && status === STATUS.COMPLETED) {
        return (
            <ResultTable heading={LABEL.NO_RESULTS} className="nil">
                <ResultRow type={TYPE.NIL} />
            </ResultTable>
        );
    }

    return null;
};
