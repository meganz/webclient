import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import LeftPanel from './leftPanel';

export class TogglePanel extends MegaRenderMixin {
    componentDidUpdate() {
        super.componentDidUpdate();
        // TODO: look into adding throttling
        const { $chatTreePanePs: content } = megaChat;
        if (content) {
            const container = document.querySelector(`.${LeftPanel.NAMESPACE}-conversations`);
            container.classList[content.getContentHeight() > container.offsetHeight ? 'add' : 'remove']('scrollable');
            content.reinitialise();
        }
    }

    render() {
        const { loading, expanded, heading, children, onToggle } = this.props;
        return (
            <div
                className={`
                    toggle-panel
                    ${expanded ? 'expanded' : ''}
                `}
                onClick={onToggle}>
                {heading && (
                    <div className="toggle-panel-heading">
                        <i className="sprite-fm-mono icon-arrow-down" />
                        <span>{heading}</span>
                    </div>
                )}
                {expanded && (
                    <div
                        className={`
                            toggle-panel-content
                            ${loading ? 'loading-sketch' : ''}
                        `}>
                        {children}
                    </div>
                )}
            </div>
        );
    }
}

export default class Toggle extends MegaRenderMixin {
    state = {
        expanded: null
    };

    constructor(props) {
        super(props);
        this.state.expanded = this.props.expanded || null;
    }

    render() {
        const { loading, children } = this.props;

        if (children) {
            return children.map(child => {
                return React.cloneElement(child, {
                    loading,
                    expanded: this.state.expanded === child.key,
                    onToggle: () => this.setState({ expanded: child.key })
                });
            });
        }

        return null;
    }
}
