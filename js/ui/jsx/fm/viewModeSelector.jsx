import React from 'react';

const VIEW_MODE = {
    'GRID': 1,
    'LIST': undefined
};

const ViewModeSelector = ({ viewMode, onChange }) => {
    return (
        <div className="chat-fm-view-mode-selector">
            <i
                className={`
                    sprite-fm-mono
                    icon-view-medium-list
                    ${viewMode ? '' : 'active'}
                `}
                title={l[5553]}
                onClick={() => onChange?.(VIEW_MODE.LIST)}>
            </i>
            <i
                className={`
                    sprite-fm-mono
                    icon-view-grid
                    ${viewMode ? " active" : ""}
                `}
                title={l[5552]}
                onClick={() => onChange?.(VIEW_MODE.GRID)}>
            </i>
        </div>
    );
};

export default ViewModeSelector;
