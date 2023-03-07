import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import LeftPanel from './leftPanel';

export class TogglePanel extends MegaRenderMixin {
    static KEYS = {
        UPCOMING: 'upcoming',
        PAST: 'past',
        ARCHIVE: 'archive'
    };

    componentDidUpdate() {
        super.componentDidUpdate();
        // TODO: look into adding throttling
        const { $chatTreePanePs: content } = megaChat;
        if (content) {
            const container = document.querySelector(`.${LeftPanel.NAMESPACE}-conversations`);
            const scrollable = content.getContentHeight() > container.offsetHeight - 40 /* offset */;
            container.classList[scrollable ? 'add' : 'remove']('scrollable');
            content.reinitialise();
        }
    }

    specShouldComponentUpdate() {
        return !this.props.loading;
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

    specShouldComponentUpdate() {
        return !this.props.loading;
    }

    componentWillUpdate(nextProps) {
        const { view, views } = this.props;
        // Default to `Upcoming` as expanded when accessing the `Meetings` tab
        if (view !== views.MEETINGS && nextProps.view === views.MEETINGS) {
            this.setState({ expanded: TogglePanel.KEYS.UPCOMING });
        }
    }

    componentDidUpdate() {
        super.componentDidUpdate();
        // Fallback to the first available `TogglePanel` if the currently expanded one is not in view anymore, e.g.
        // switching from `Upcoming` on `Meetings` to the `Chats` view -> default to expanded `Contacts and Groups`
        const { view, views, children } = this.props;
        const hasExpandablePanel = children.some(child => child.key === this.state.expanded);
        if (!hasExpandablePanel && view !== views.MEETINGS) {
            this.setState({ expanded: TogglePanel.KEYS.PAST });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        megaChat.rebind(megaChat.plugins.meetingsManager.EVENTS.INITIALIZE, (ev, scheduledMeeting) => {
            if (scheduledMeeting && scheduledMeeting.chatRoom && scheduledMeeting.iAmOwner) {
                this.setState({ expanded: TogglePanel.KEYS.UPCOMING }, () => scheduledMeeting.chatRoom.setActive());
            }
        });
    }

    render() {
        const { loading, children } = this.props;

        if (children) {
            return children.map(child => {
                return child && React.cloneElement(child, {
                    loading,
                    expanded: this.state.expanded === child.key,
                    onToggle: () => this.setState({ expanded: child.key })
                });
            });
        }

        return null;
    }
}
