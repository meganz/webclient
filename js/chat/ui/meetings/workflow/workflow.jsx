import React from 'react';
import { MegaRenderMixin } from '../../../../stores/mixins';
import utils from '../../../../ui/utils.jsx';
import { Start } from './start.jsx';
import Button from '../button.jsx';
import Join from './join.jsx';
import Incoming from './incoming.jsx';
import Invite from './invite/invite.jsx';
import Loading from './loading.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';

export default class Workflow extends MegaRenderMixin {
    style = {
        container: {
            position: 'fixed',
            width: '100%',
            height: '100%',
            padding: 100,
            background: '#FFF',
            zIndex: 100
        },
        button: { marginBottom: 24, border: 0 }
    };

    state = {
        start: false,
        join: false,
        incoming: false,
        invite: false,
        loading: false,
        unsupported: false
    };

    constructor(props) {
        super(props);
    }

    render() {
        const { chatRoom } = this.props;
        return (
            <utils.RenderTo element={document.body}>
                <div style={this.style.container}>
                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ start: true })}>
                        Start meeting dialog
                    </Button>
                    {this.state.start && <Start onClose={() => this.setState({ start: false })}/>}

                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ join: true })}>
                        Join meeting
                    </Button>
                    {this.state.join && <Join chatRoom={chatRoom} onClose={() => this.setState({ join: false })}/>}

                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ incoming: true })}>
                        Incoming call dialog
                    </Button>
                    {this.state.incoming &&
                        <Incoming chatRoom={chatRoom} onClose={() => this.setState({ incoming: false })}/>}

                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ invite: true })}>
                        Invite dialog
                    </Button>
                    {this.state.invite && <Invite contacts={M.u} onClose={() => this.setState({ invite: false })}/>}

                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ loading: true })}>
                        Loading overlay
                    </Button>
                    {this.state.loading && <Loading onClose={() => this.setState({ loading: false })}/>}

                    <Button
                        className="mega-button"
                        style={this.style.button}
                        onClick={() => this.setState({ unsupported: true })}>
                        Unsupported browser dialog
                    </Button>
                    {this.state.unsupported && (
                        <ModalDialogsUI.ModalDialog
                            name="unsupported-dialog"
                            dialogType="message"
                            icon="sprite-fm-uni icon-error"
                            title="You have an incoming call but your browser doesn&apos;t support the calling feature"
                            subtitle="You can answer via Chrome version 85.0.4183 or newer"
                            buttons={[
                                {
                                    label: 'Ok',
                                    className: 'negative',
                                    onClick: () => this.setState({ unsupported: false})
                                }
                            ]}
                            onClose={() => this.setState({ unsupported: false })}
                        />
                    )}
                </div>
            </utils.RenderTo>
        );
    }
}
