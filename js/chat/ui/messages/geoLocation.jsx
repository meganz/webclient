import React from 'react';

function GeoLocation(props) {
    const { latitude, lng } = props;
    
    const handleOnclick= (lat, lng) => {
        const openGmaps = () => {
            const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            window.open(gmapsUrl, '_blank', 'noopener');
        }

        if (GeoLocationLinks.gmapsConfirmation === -1 || GeoLocationLinks.gmapsConfirmation === false) {
            msgDialog('confirmation', 'geolocation-link', l[20788], 'Would you like to proceed?', (answer) => {
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
        <div className="geolocation" onClick={() => handleOnclick(latitude, lng)}>
            <div className="geolocation__details">
                <figure className="geolocation__img">
                </figure>
                <ul className="geolocation__data-list">
                    <li>
                        <span className="geolocation__title">
                            {l[20789]}
                        </span>
                    </li>
                    <li>
                        <p>
                            <span className="geolocation__coordinates-icon"></span>
                            <span className="geolocation__coordinates">
                                {'https://maps.google.com'}
                            </span>
                        </p>
                    </li>
                </ul>
            </div>
        </div>
    );
}

GeoLocation.PropTypes = {
    latitude: React.PropTypes.string.isRequired,
    lng: React.PropTypes.string.isRequired,
}

export default GeoLocation;