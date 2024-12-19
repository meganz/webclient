import React from 'react';
import utils from './../../ui/utils.jsx';
import { Button } from '../../ui/buttons.jsx';

const NAMESPACE = 'chat-overlay';

const ChatOverlays = {
    PARTICIPANT_LIMIT: 'participants-limit',
};

/**
 * Render a simple overlay on the document body based on the provided overlayType prop.
 * Useful for overlays that don't require adding complex logic
 *
 * @see ChatOverlays
 */
export default class ChatOverlay extends React.Component {

    MegaLogo = () => <div className={`${NAMESPACE}-logo`}>
        <i className={`sprite-fm-illustration-wide ${mega.ui.isDarkTheme()
            ? 'mega-logo-dark'
            : 'img-mega-logo-light'}`}
        />
    </div>;

    renderParticipantsLimit() {
        return <>
            <div className={`${NAMESPACE}-head`}>
                <this.MegaLogo/>
                <h1>{l.join_call_user_limit_title}</h1>
            </div>
            <div className={`${NAMESPACE}-body`}>
                <p>{l.call_join_user_limit_banner}</p>
                <Button
                    className="mega-button positive"
                    onClick={() => {
                        this.props.onClose?.();
                    }}>
                    {l.call_link_user_limit_button}
                </Button>
            </div>
        </>;
    }

    render() {
        const { overlayType } = this.props;
        let body = null;
        if (overlayType === ChatOverlays.PARTICIPANT_LIMIT) {
            body = this.renderParticipantsLimit();
        }
        if (!body) {
            if (d) {
                console.error('Invalid ChatOverlay', overlayType);
            }
            return null;
        }
        return <utils.RenderTo element={document.body}>
            <div className={`${NAMESPACE} ${overlayType}`}>
                {body}
            </div>
        </utils.RenderTo>;
    }
}

export {
    ChatOverlays,
};
