var React = require("react");
import {MegaRenderMixin} from '../mixins';

class WhosTyping extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            currentlyTyping: {}
        };
    }
    componentWillMount() {
        var self = this;
        var chatRoom = self.props.chatRoom;

        chatRoom.bind("onParticipantTyping.whosTyping", function(e, user_handle, bCastCode) {
            if (!self.isMounted()) {
                return;
            }
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
            const currentlyTyping = {...self.state.currentlyTyping};

            if (currentlyTyping[u_h]) {
                currentlyTyping[u_h].abort();
            }

            if (bCastCode === 1) {
                const timer = tSleep(5);
                timer.then(() => {
                    self.stoppedTyping(u_h);
                });

                currentlyTyping[u_h] = timer;

                self.setState({
                    currentlyTyping: currentlyTyping
                });
            }
            else {
                self.stoppedTyping(u_h);
            }

            self.forceUpdate();
        });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var chatRoom = self.props.chatRoom;

        chatRoom.off("onParticipantTyping.whosTyping");
    }
    stoppedTyping(u_h) {
        if (this.isMounted()) {
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
        var self = this;

        var typingElement = null;

        const users = Object.keys(self.state.currentlyTyping);
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

            var msg;
            if (areMultipleUsersTyping === true) {
                msg = l[8872]
                    .replace("%1", namesDisplay[0])
                    .replace("%2", namesDisplay[1]);
            }
            else {
                msg = l[8629].replace("%1", namesDisplay[0]);
            }

            typingElement = <div className="typing-block">
                <div className="typing-text">{msg}</div>
                <div className="typing-bounce">
                    <div className="typing-bounce1"></div>
                    <div className="typing-bounce2"></div>
                    <div className="typing-bounce3"></div>
                </div>
            </div>;
        }

        return typingElement;
    }

};

export {
    WhosTyping
};
