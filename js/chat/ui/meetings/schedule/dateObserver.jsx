import React from 'react';

export const withDateObserver = Component =>
    class extends React.Component {
        listener = undefined;

        state = { timestamp: undefined };

        componentWillUnmount() {
            mBroadcaster.removeListener(this.listener);
        }

        componentDidMount() {
            this.listener =
                mBroadcaster.addListener(withDateObserver.NAMESPACE, timestamp => this.setState({ timestamp }));
        }

        render() {
            return (
                <Component
                    {...this.props}
                    timestamp={this.state.timestamp}
                />
            );
        }
    };

withDateObserver.NAMESPACE = 'meetings:onSelectDate';
