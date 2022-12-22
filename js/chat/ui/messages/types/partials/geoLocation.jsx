import React from 'react';

function GeoLocation(props) {
    const { latitude, lng } = props;

    const handleOnclick= (lat, lng) => {
        const openGmaps = () => {
            const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
        }

        if (GeoLocationLinks.gmapsConfirmation === -1 || GeoLocationLinks.gmapsConfirmation === false) {
            msgDialog('confirmation', 'geolocation-link', l[20788], l.confirm_ext_link, (answer) => {
                if (answer) {
                    GeoLocationLinks.confirmationDoConfirm();
                    closeDialog();
                    openGmaps();
                } else {
                    GeoLocationLinks.confirmationDoNever();
                }
            });
        } else if (GeoLocationLinks.gmapsConfirmation) {
            openGmaps();
        }
    }

    return (
        <div className="geolocation-container">
            <div className="geolocation" onClick={() => handleOnclick(latitude, lng)}>
                <div className="geolocation__details">
                    <div className="geolocation__icon">
                        <i className="sprite-fm-mono icon-location" />
                    </div>
                    <ul className="geolocation__data-list">
                        <li>
                        <span className="geolocation__title">
                            {l[20789]}
                        </span>
                        </li>
                        <li>
                            <p>
                                <span className="geolocation__coordinates-icon" />
                                <span className="geolocation__coordinates">https://maps.google.com</span>
                            </p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default GeoLocation;
