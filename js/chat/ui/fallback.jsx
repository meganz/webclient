import React from 'react';

export default class Fallback extends React.Component {
    render() {
        return (
            <div className="loading-spinner light">
                <div className="main-loader" />
            </div>
        );
    }
}
