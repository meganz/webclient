import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';
import { ContactPickerWidget } from '../contacts.jsx';
import { Button } from '../../../ui/buttons.jsx';

export const withHostsObserver = Component => {
    return (
        class extends MegaRenderMixin {
            state = {
                dialog: false,
                selected: []
            };

            hasHost = participants =>
                participants.some(handle =>
                    this.props.chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR &&
                    handle !== u_handle
                );

            toggleDialog = () => {
                this.setState(state => ({ dialog: !state.dialog, selected: [] }), () => this.safeForceUpdate());
            };

            renderDialog = () => {
                const { selected } = this.state;

                return (
                    <ModalDialogsUI.ModalDialog
                        {...this.state}
                        className="assign-host contact-picker-widget"
                        dialogName="assign-host-dialog"
                        dialogType="tool"
                        onClose={() => this.setState({ dialog: false }, () => this.safeForceUpdate())}>
                        <header>
                            <h2>{l.assign_host_title /* `Assign host` */}</h2>
                        </header>

                        <div className="content-block">
                            <ContactPickerWidget
                                className="popup contacts-search small-footer"
                                contacts={this.props.participants?.filter(h => h !== u_handle)}
                                multiple={true}
                                hideSearch={true}
                                disableFrequents={true}
                                participantsList={true}
                                disableDoubleClick={true}
                                emailTooltips={true}
                                nothingSelectedButtonLabel={l.add_hosts_placeholder /* `Add hosts` */}
                                onClose={() => this.setState({ dialog: false })}
                                onSelect={selected => this.setState({ selected }, () => this.safeForceUpdate())}
                            />
                        </div>

                        <footer>
                            <div className="footer-container">
                                <Button
                                    label={l[82] /* `Cancel` */}
                                    className="mega-button"
                                    onClick={this.toggleDialog}
                                />
                                <Button
                                    label={l.assign_and_leave /* `Assign and leave` */}
                                    className={`
                                        mega-button
                                        positive
                                        ${selected.length ? '' : 'disabled'}
                                    `}
                                    onClick={() => selected.length && this.assignAndLeave()}
                                />
                            </div>
                        </footer>
                    </ModalDialogsUI.ModalDialog>
                );
            };

            assignAndLeave = () => {
                const { chatRoom, onLeave } = this.props;
                const { selected } = this.state;
                for (let i = selected.length; i--;) {
                    chatRoom.trigger(
                        'alterUserPrivilege',
                        [selected[i], ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR]
                    );
                }
                this.toggleDialog();
                onLeave?.();
                $(document).trigger('closeDropdowns');
            };

            confirmLeave = ({ title, body, cta }) => {
                msgDialog(
                    `confirmationa:!^${cta}!${l[82] /* `Cancel` */}`,
                    null,
                    title,
                    body,
                    cb => cb && this.toggleDialog(),
                    1
                );
            };

            render() {
                return (
                    <>
                        <Component
                            {...this.props}
                            confirmLeave={this.confirmLeave}
                            hasHost={this.hasHost}
                        />
                        {this.state.dialog && this.renderDialog()}
                    </>
                );
            }
        }
    );
};
