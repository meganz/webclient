import React from 'react';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';

export const NAMESPACE = 'schedule-dialog';
export const dialogName = `meetings-${NAMESPACE}`;

export const CloseDialog = ({ onToggle, onClose }) => {
    return (
        <>
            <ModalDialogsUI.ModalDialog
                name={`${NAMESPACE}-confirmation`}
                dialogType="message"
                className={`
                    with-close-btn
                    ${NAMESPACE}-confirmation
                `}
                title={l.schedule_discard_dlg_title /* `Discard meeting or keep editing?` */}
                icon="sprite-fm-uni icon-question"
                buttons={[
                    { key: 'n', label: l.schedule_discard_cancel, onClick: () => onToggle('closeDialog') },
                    { key: 'y', label: l.schedule_discard_confirm, className: 'positive', onClick: onClose }
                ]}
                noCloseOnClickOutside={true}
                stopKeyPropagation={true}
                hideOverlay={true}
                onClose={() => onToggle('closeDialog')}
            />
            <div
                className={`${NAMESPACE}-confirmation-overlay`}
                onClick={() => onToggle('closeDialog')}
            />
        </>
    );
};

export const Row = ({ children, className }) =>
    <div
        className={`
            ${NAMESPACE}-row
            ${className || ''}
        `}>
        {children}
    </div>;

export const Column = ({ children, className }) =>
    <div
        className={`
            ${NAMESPACE}-column
            ${className || ''}
        `}>
        {children}
    </div>;

/**
 * Input
 * @param name
 * @param placeholder
 * @param value
 * @param invalid
 * @param invalidMessage
 * @param autoFocus
 * @param isLoading
 * @param onFocus
 * @param onChange
 * @return {React.Element}
 */

export const Input = ({ name, placeholder, value, invalid, invalidMessage, autoFocus, isLoading, onFocus, onChange }) => {
    return (
        <Row className={invalid ? 'invalid-aligned' : ''}>
            <Column>
                <i className="sprite-fm-mono icon-rename"/>
            </Column>
            <Column>
                <div
                    className={`
                        mega-input
                        ${invalid ? 'error msg' : ''}
                    `}>
                    <input
                        type="text"
                        name={`${NAMESPACE}-${name}`}
                        className={isLoading ? 'disabled' : ''}
                        disabled={isLoading}
                        autoFocus={autoFocus}
                        autoComplete="off"
                        placeholder={placeholder}
                        value={value}
                        onFocus={onFocus}
                        onChange={({ target }) => onChange(target.value)}
                    />
                    {invalid &&
                        <div className="message-container mega-banner">
                            {invalidMessage}
                        </div>
                    }
                </div>
            </Column>
        </Row>
    );
};

/**
 * Checkbox
 * @param name
 * @param className
 * @param checked
 * @param label
 * @param subLabel
 * @param onToggle
 * @param isLoading
 * @return {React.Element}
 */

export const Checkbox = ({ name, className, checked, label, subLabel, isLoading, onToggle }) => {
    return (
        <Row
            className={`
                ${subLabel ? 'start-aligned' : ''}
                ${className || ''}
            `}>
            <Column>
                <div
                    className={`
                        checkdiv
                        ${checked ? 'checkboxOn' : 'checkboxOff'}
                        ${isLoading ? 'disabled' : ''}
                    `}>
                    <input
                        name={`${NAMESPACE}-${name}`}
                        disabled={isLoading}
                        type="checkbox"
                        onChange={() => onToggle(name)}
                    />
                </div>
            </Column>
            <Column className={subLabel ? 'with-sub-label' : ''}>
                <label
                    htmlFor={`${NAMESPACE}-${name}`}
                    className={isLoading ? 'disabled' : ''}
                    onClick={() => isLoading ? null : onToggle(name)}>
                    {label}
                </label>
                {subLabel && <div className="sub-label">{subLabel}</div>}
            </Column>
        </Row>
    );
};

/**
 * Switch
 * @param name
 * @param toggled
 * @param label
 * @param isLoading
 * @param subLabel
 * @param onToggle
 * @return {React.Element}
 */

export const Switch = ({ name, toggled, label, isLoading, subLabel, onToggle }) => {
    const className = `${NAMESPACE}-switch`;
    return (
        <Row>
            <Column>
                <i className="sprite-fm-uni icon-mega-logo"/>
            </Column>
            <Column className={subLabel ? `with-sub-label ${className}` : className}>
                <span
                    className={`
                        schedule-label
                        ${isLoading ? 'disabled' : ''}
                    `}
                    onClick={() => isLoading ? null : onToggle(name)}>
                    {label}
                </span>
                <div
                    className={`
                        mega-switch
                        ${toggled ? 'toggle-on' : ''}
                        ${isLoading ? 'disabled' : ''}
                    `}
                    onClick={() => isLoading ? null : onToggle(name)}>
                    <div
                        className={`
                            mega-feature-switch
                            sprite-fm-mono-after
                            ${toggled ? 'icon-check-after' : 'icon-minimise-after'}
                        `}
                    />
                </div>
                {subLabel && <div className="sub-label">{subLabel}</div>}
            </Column>
        </Row>
    );
};

/**
 * Textarea
 * @param name
 * @param placeholder
 * @param isLoading
 * @param value
 * @param invalid
 * @param onChange
 * @param onFocus
 * @return {React.Element}
 */

export const Textarea = ({ name, placeholder, isLoading, value, invalid, onChange, onFocus }) => {
    return (
        <Row className="start-aligned">
            <Column>
                <i className="sprite-fm-mono icon-description"/>
            </Column>
            <Column>
                <div className={`mega-input box-style textarea ${invalid ? 'error' : ''}`}>
                    <textarea
                        name={`${NAMESPACE}-${name}`}
                        className={isLoading ? 'disabled' : ''}
                        placeholder={placeholder}
                        value={value}
                        readOnly={isLoading}
                        onChange={({ target }) => onChange(target.value)}
                        onFocus={onFocus}
                    />
                </div>
                {invalid &&
                    <div className="mega-input error msg textarea-error">
                        <div className="message-container mega-banner">
                            {l.err_schedule_desc_long /* `Enter fewer than 3000 characters` */}
                        </div>
                    </div>
                }
            </Column>
        </Row>
    );
};

/**
 * Upgrade notice for free users
 *
 * @returns {React.Element}
 */

export const UpgradeNotice = ({ onUpgradeClicked }) => {
    return !!mega.flags.ff_chmon && (
        <Row className="schedule-upgrade-notice">
            <h3>{l.schedule_limit_title}</h3>
            <div>{l.schedule_limit_upgrade_features}</div>
            <Button
                className="mega-button positive"
                onClick={onUpgradeClicked}>
                <span>{l.upgrade_now}</span>
            </Button>
        </Row>
    );
};

