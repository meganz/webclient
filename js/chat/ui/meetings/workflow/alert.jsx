import React from 'react';
import { MegaRenderMixin } from '../../../mixins';

const NAMESPACE = 'meetings-alert';

export default class Alert extends MegaRenderMixin {
    static TYPE = {
        LIGHT: 'light',
        NEUTRAL: 'neutral',
        MEDIUM: 'medium',
        HIGH: 'high',
    };

    render() {
        const { type, content, onClose } = this.props;

        if (content) {
            return (
                <div
                    className={`
                        ${NAMESPACE}
                        ${type ? `${NAMESPACE}-${type}` : ''}
                    `}>
                    <div className={`${NAMESPACE}-content`}>{content}</div>
                    {onClose && (
                        <span
                            className={`${NAMESPACE}-close`}
                            onClick={onClose}>
                            <i className="sprite-fm-mono icon-close-component"/>
                        </span>
                    )}
                </div>
            );
        }

        return null;
    }
}
