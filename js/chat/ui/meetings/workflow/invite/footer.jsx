import React from 'react';
import Button from '../../button.jsx';

const Footer = ({ selected, onClose, onAdd }) => {
    return (
        <footer>
            <div className="footer-container">
                <Button
                    className="mega-button"
                    onClick={onClose}>
                    {l.msg_dlg_cancel}
                </Button>
                <Button
                    className={`
                        mega-button
                        positive
                        ${selected.length > 0 ? '' : 'disabled'}
                    `}
                    onClick={onAdd}>
                    {l.add /* `Add` */}
                </Button>
            </div>
        </footer>
    );
};

export default Footer;
