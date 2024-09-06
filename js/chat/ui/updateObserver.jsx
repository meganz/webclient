import React from 'react';
import { MegaRenderMixin } from '../mixins.js';

export const withUpdateObserver = Component =>
    class extends MegaRenderMixin {
        updateInterval = 6e4 * 10 /* 10 min */;

        instanceRef = React.createRef();
        intervalRef = undefined;

        state = {
            updated: 0
        };

        updateListener = () => {
            return (
                this.isComponentVisible() &&
                document.visibilityState === 'visible' &&
                this.setState(state => ({ updated: ++state.updated }), () => this.safeForceUpdate())
            );
        };

        componentWillUnmount() {
            super.componentWillUnmount();
            document.removeEventListener('visibilitychange', this.updateListener);
            clearInterval(this.intervalRef);
        }

        componentDidMount() {
            super.componentDidMount();
            document.addEventListener('visibilitychange', this.updateListener);
            this.intervalRef =
                setInterval(
                    this.instanceRef.current[Component.updateListener] || this.updateListener,
                    Component.updateInterval || this.updateInterval
                );
        }

        render() {
            return <Component ref={this.instanceRef} {...this.props} />;
        }
    };
