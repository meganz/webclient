import React from 'react';

export const ResultTable = ({ heading, className, children }) => {
    return (
        <div className={`result-table ${className ? className : ''}`}>
            <div className="result-table-heading">{heading}</div>
            {children}
        </div>
    );
};
