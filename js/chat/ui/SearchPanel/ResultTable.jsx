import React from 'react';

export const ResultTable = ({ heading, children }) => {
    return (
        <div className="result-table">
            <div className="result-table-heading">
                {heading}
            </div>
            {children}
        </div>
    );
};
