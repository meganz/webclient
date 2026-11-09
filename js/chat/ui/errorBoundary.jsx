import React from 'react';
import Link from './link.jsx';

export default class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(error, errorInfo);
    }

    handleRetry = () => this.setState({ hasError: false, error: null });

    render() {
        const { hasError, error } = this.state;

        if (hasError) {
            // TODO: add translation strings
            return (
                <div className="meetings-error">
                    <div className="meetings-error--content">
                        <i
                            className={`
                                sprite-fm-illustration-wide
                                ${mega.ui.isDarkTheme() ? 'mega-logo-dark' : 'img-mega-logo-light'}
                            `}
                        />

                        <h1>{l[200]}</h1>

                        <span>
                            Please <Link onClick={this.handleRetry}>try again</Link> or&nbsp;
                            <Link onClick={() => location.reload()}>reload the page</Link>.
                        </span>

                        {d &&
                            <div className="meetings-error--details">
                                {error.toString()}
                            </div>
                        }
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
