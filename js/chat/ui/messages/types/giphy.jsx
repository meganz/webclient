import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Button} from '../../../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { API } from '../../gifPanel/gifPanel.jsx';

export default class Giphy extends AbstractGenericMessage {
    gifRef = React.createRef();

    state = { src: undefined };

    constructor(props) {
        super(props);
    }

    onVisibilityChange(isIntersecting) {
        this.setState({ src: isIntersecting ? API.convert(this.props.message.meta.src) : undefined }, () => {
            this.gifRef?.current?.[isIntersecting ? 'load' : 'pause']();
            this.safeForceUpdate();
        });
    }

    toggle = () => {
        const video = this.gifRef.current;
        video[video.paused ? 'play' : 'pause']();
    };

    getMessageActionButtons() {
        const { onDelete, message } = this.props;
        const $$BUTTONS = [
            message.isEditable() && (
                <Button
                    key="delete-GIPHY-button"
                    className="default-white-button tiny-button"
                    icon="tiny-icon icons-sprite grey-dots">
                    <Dropdown
                        className="white-context-menu attachments-dropdown"
                        noArrow={true}
                        positionMy="left bottom"
                        positionAt="right bottom"
                        horizOffset={4}>
                        <DropdownItem
                            icon="red-cross"
                            label={l[1730]}
                            className="red"
                            onClick={e => onDelete(e, message)}/>
                    </Dropdown>
                </Button>
            ),
            super.getMessageActionButtons && super.getMessageActionButtons()
        ];
        return $$BUTTONS.filter(button => button);
    }

    getContents() {
        const { message, hideActionButtons } = this.props;
        const { s, w, h, src } = message.meta;
        const autoPlay = parseInt(s, 10) < 4e6;

        return (
            <video
                className="giphy-block"
                ref={this.gifRef}
                title={message.textContents}
                autoPlay={autoPlay}
                loop={true}
                muted={true}
                controls={false}
                width={w}
                height={h}
                style={{ cursor: autoPlay ? 'default' : 'pointer' }}
                onClick={() => !autoPlay && this.toggle()}
                src={
                    /* hideActionButtons -> message preview rendered within the delete confirmation dialog */
                    hideActionButtons ? API.convert(src) : this.state.src
                }
            />
        );
    }
}
