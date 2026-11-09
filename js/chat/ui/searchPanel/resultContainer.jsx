import React from 'react';
import ResultTable  from './resultTable.jsx';
import ResultRow  from './resultRow.jsx';
import { LABEL, STATUS, TYPE } from './utils.jsx';

export default class ResultContainer extends React.Component {

    renderResults = (results, status, isFirstQuery, onSearchMessages) => {

        //
        // Result table -- `Contacts and Chats` and `Messages`, incl. `No Results`
        // ----------------------------------------------------------------------

        if (status === STATUS.COMPLETED && results.length < 1) {
            return (
                <ResultTable>
                    <ResultRow
                        type={TYPE.NIL}
                        isFirstQuery={isFirstQuery}
                        onSearchMessages={onSearchMessages}
                    />
                </ResultTable>
            );
        }

        const RESULT_TABLE = {
            CONTACTS_AND_CHATS: [],
            MESSAGES: [],
        };

        for (const resultTypeGroup in results) {
            if (results.hasOwnProperty(resultTypeGroup)) {
                const len = results[resultTypeGroup].length;
                for (let i = 0; i < len; i++) {
                    const result = results[resultTypeGroup].getItem(i);
                    const { MESSAGE, MEMBER, CHAT } = TYPE;
                    const { resultId, type } = result;
                    const table = type === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';

                    RESULT_TABLE[table] = [
                        ...RESULT_TABLE[table],
                        <ResultRow
                            key={resultId}
                            type={type === MESSAGE ? MESSAGE : type === MEMBER ? MEMBER : CHAT}
                            result={result}
                        />
                    ];
                }
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
                        <button
                            className="search-messages mega-button"
                            onClick={onSearchMessages}>
                            <span>{LABEL.SEARCH_MESSAGES_CTA}</span>
                        </button>;
                    const NO_RESULTS =
                        <ResultRow
                            type={TYPE.NIL}
                            isFirstQuery={isFirstQuery}
                            onSearchMessages={onSearchMessages}
                        />;

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
        const { results, status, isFirstQuery, onSearchMessages } = this.props;
        return this.renderResults(results, status, isFirstQuery, onSearchMessages);
    }
}
