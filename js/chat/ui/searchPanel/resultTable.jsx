import React from 'react';

const ResultTable = ({ heading, children }) => {
    return (
        <div className={`result-table ${heading ? '' : 'nil'}`}>
            {heading ? <div className="result-table-heading">{heading}</div> : null}
            {children}
        </div>
    );
};

export default ResultTable;
