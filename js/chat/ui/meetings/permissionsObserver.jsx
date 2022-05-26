import React from 'react';
import { MegaRenderMixin } from '../../mixins';

export const withPermissionsObserver = Component =>
    class extends MegaRenderMixin {
        namespace = `PO-${Component.NAMESPACE}`;
        permissionsObserver = `onLocalMediaError.${this.namespace}`;

        state = {
            errAv: null
        };

        renderPermissionsDialog = av => {
            const CONTENT = {
                [Av.Audio]: [l.no_mic_title, l.no_mic_info],
                [Av.Camera]: [l.no_camera_title, l.no_camera_info]
            };
            return msgDialog('warningb', null, ...CONTENT[av], null, 1);
        };

        renderPermissionsWarning = av =>
            <div
                className={`
                    ${this.namespace}
                    meetings-signal-issue
                    simpletip
                `}
                data-simpletip="Show more info"
                data-simpletipposition="top"
                data-simpletipoffset="5"
                data-simpletip-class="theme-dark-forced"
                onClick={() => this.renderPermissionsDialog(av)}>
                <i className="sprite-fm-mono icon-exclamation-filled" />
            </div>;

        componentWillUnmount() {
            super.componentWillUnmount();
            this.props.chatRoom.unbind(this.permissionsObserver);
        }

        componentDidMount() {
            super.componentDidMount();
            this.props.chatRoom.rebind(this.permissionsObserver, (e, errAv) => this.setState({ errAv }));
        }

        render() {
            return (
                <Component
                    {...this.props}
                    errAv={this.state.errAv}
                    renderPermissionsWarning={this.renderPermissionsWarning}
                />
            );
        }
    };
