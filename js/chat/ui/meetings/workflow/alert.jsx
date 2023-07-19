import React from 'react';
import { MegaRenderMixin } from '../../../mixins';

const NAMESPACE = 'meetings-alert';

export default class Alert extends MegaRenderMixin {
    alertRef = React.createRef();

    static TYPE = {
        LIGHT: 'light',
        NEUTRAL: 'neutral',
        MEDIUM: 'medium',
        HIGH: 'high',
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.onTransition?.();
    }

    componentDidUpdate() {
        super.componentDidUpdate();
        this.props.onTransition?.(this.alertRef);
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.onTransition?.(this.alertRef);
    }

    render() {
        const { type, className, content, children, onClose } = this.props;

        if (content || children) {
            return (
                <div
                    ref={this.alertRef}
                    className={`
                        ${NAMESPACE}
                        ${type ? `${NAMESPACE}-${type}` : ''}
                        ${className || ''}
                    `}>
                    <div className={`${NAMESPACE}-content`}>{content || children}</div>
                    {onClose &&
                        <span
                            className={`${NAMESPACE}-close`}
                            onClick={onClose}>
                            <i className="sprite-fm-mono icon-close-component"/>
                        </span>
                    }
                </div>
            );
        }

        return null;
    }
}
