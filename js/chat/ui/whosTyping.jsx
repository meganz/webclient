import React from 'react';

export class WhosTyping extends React.Component {
    domRef = React.createRef();

    state = {
        currentlyTyping: {}
    };

    componentDidMount() {
        const { chatRoom } = this.props;

        chatRoom.rebind('onParticipantTyping.whosTyping', (e, user_handle, bCastCode) => {
            if (user_handle === u_handle) {
                return;
            }

            const u_h = user_handle;
            if (u_h === u_handle) {
                // not my jid, but from other device (e.g. same user handle)
                return;
            }
            else if (!M.u[u_h]) {
                // unknown user handle? no idea what to show in the "typing" are, so skip it.
                return;
            }
            const currentlyTyping = { ...this.state.currentlyTyping };

            if (currentlyTyping[u_h]) {
                currentlyTyping[u_h].abort();
            }

            if (bCastCode === 1) {
                const timer = tSleep(5);
                timer.then(() => {
                    this.stoppedTyping(u_h);
                });

                currentlyTyping[u_h] = timer;

                this.setState({ currentlyTyping });
            }
            else {
                this.stoppedTyping(u_h);
            }

            this.forceUpdate();
        });
    }

    componentWillUnmount() {
        this.props.chatRoom.off('onParticipantTyping.whosTyping');
    }

    stoppedTyping(u_h) {
        if (this.domRef.current) {
            const { currentlyTyping } = this.state;
            if (currentlyTyping[u_h]) {
                const newState = {...currentlyTyping};
                if (!newState[u_h].aborted) {
                    newState[u_h].abort();
                }
                delete newState[u_h];
                this.setState({currentlyTyping: newState});
            }
        }
    }

    render() {
        const users = Object.keys(this.state.currentlyTyping);

        if (users.length > 0) {
            const names = users.map((u_h) => M.getNameByHandle(u_h)).filter(String);

            var namesDisplay = "";
            var areMultipleUsersTyping = false;

            if (names.length > 1) {
                areMultipleUsersTyping = true;
                namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
            }
            else {
                areMultipleUsersTyping = false;
                namesDisplay = [names[0]];
            }

            return (
                <div
                    ref={this.domRef}
                    className="typing-block">
                    <div className="typing-text">
                        {areMultipleUsersTyping ?
                            l[8872]
                                .replace("%1", namesDisplay[0])
                                .replace("%2", namesDisplay[1]) :
                            l[8629].replace("%1", namesDisplay[0])
                        }
                    </div>
                    <div className="typing-bounce">
                        <div className="typing-bounce1" />
                        <div className="typing-bounce2" />
                        <div className="typing-bounce3" />
                    </div>
                </div>
            );
        }

        return null;
    }
}
