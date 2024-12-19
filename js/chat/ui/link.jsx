import React from 'react';

export default class Link extends React.Component {
    IS_CLICK_URL = undefined;

    constructor(props) {
        super(props);
        this.IS_CLICK_URL = this.props.to && (this.props.to.startsWith('/') || this.props.to.includes('mega.io'));
    }

    componentDidMount() {
        if (this.IS_CLICK_URL) {
            clickURLs();
        }
    }

    render() {
        const { className, to, target, children, onClick } = this.props;

        if (this.IS_CLICK_URL) {
            return (
                <a
                    className={`
                        clickurl
                        ${className || ''}
                    `}
                    href={to}
                    target={target}>
                    {children}
                </a>
            );
        }

        return (
            <a
                className={className}
                href="#"
                onClick={ev => {
                    if (onClick) {
                        ev.preventDefault();
                        return onClick(ev);
                    }
                    return null;
                }}>
                {children}
            </a>
        );
    }
}
