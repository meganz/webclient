/** @property s4.endpoints */
lazy(s4, 'endpoints', () => {
    'use strict';

    const BASE_DOMAIN = 'megas4.com';
    const CONTINENTS = {
        ap: l.location_asia_pacific,
        ca: l[18798],
        eu: l.location_europe
    };
    const ENDPOINTS = [
        [
            'eu-luxembourg-1',
            l[18922]
        ],
        [
            'eu-luxembourg-2',
            l[18922]
        ],
        [
            'eu-amsterdam-1',
            l.location_amsterdam
        ],
        [
            'eu-amsterdam-2',
            l.location_amsterdam
        ],
        [
            'eu-paris-1',
            l.location_paris
        ],
        [
            'eu-paris-2',
            l.location_paris
        ],
        [
            'eu-barcelona-1',
            l.location_barcelona
        ],
        [
            'eu-barcelona-2',
            l.location_barcelona
        ],
        [
            'ca-montreal-1',
            l.location_montreal
        ],
        [
            'ca-montreal-2',
            l.location_montreal
        ],
        [
            'ca-vancouver-1',
            l.location_vancouver
        ],
        [
            'ca-vancouver-2',
            l.location_vancouver
        ],
        [
            'ap-tokyo-1',
            l.location_tokyo
        ],
        [
            'ap-tokyo-2',
            l.location_tokyo
        ]
    ];

    return Object.freeze(ENDPOINTS.map(([region, location], id) => Object.freeze({
        id,
        region,
        location,
        host: `s3.${region}.${BASE_DOMAIN}`,
        iamHost: `iam.${region}.${BASE_DOMAIN}`,
        label: `${CONTINENTS[region.slice(0, 2)]} - ${location}`
    })));
});
