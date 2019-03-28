/* exported RegionsCollection */
function RegionsCollection() {
    'use strict';

    if (M !== undefined && M !== null && M._countries) {
        this.countries = M._countries;
    } else {
        var countryNames =  [
            {
                "cc": "US",
                "cn": l[18796]
            },
            {
                "cc": "GB",
                "cn": l[18797]
            },
            {
                "cc": "CA",
                "cn": l[18798]
            },
            {
                "cc": "AX",
                "cn": l[18799]
            },
            {
                "cc": "AF",
                "cn": l[18800]
            },
            {
                "cc": "AL",
                "cn": l[18801]
            },
            {
                "cc": "DZ",
                "cn": l[18802]
            },
            {
                "cc": "AS",
                "cn": l[18803]
            },
            {
                "cc": "AD",
                "cn": l[18804]
            },
            {
                "cc": "AO",
                "cn": l[18805]
            },
            {
                "cc": "AI",
                "cn": l[18806]
            },
            {
                "cc": "AQ",
                "cn": l[18807]
            },
            {
                "cc": "AG",
                "cn": l[18808]
            },
            {
                "cc": "AR",
                "cn": l[18809]
            },
            {
                "cc": "AM",
                "cn": l[18810]
            },
            {
                "cc": "AW",
                "cn": l[18811]
            },
            {
                "cc": "AU",
                "cn": l[18812]
            },
            {
                "cc": "AT",
                "cn": l[18813]
            },
            {
                "cc": "AZ",
                "cn": l[18814]
            },
            {
                "cc": "BS",
                "cn": l[18815]
            },
            {
                "cc": "BH",
                "cn": l[18816]
            },
            {
                "cc": "BD",
                "cn": l[18817]
            },
            {
                "cc": "BB",
                "cn": l[18818]
            },
            {
                "cc": "BY",
                "cn": l[18819]
            },
            {
                "cc": "BE",
                "cn": l[18820]
            },
            {
                "cc": "BZ",
                "cn": l[18821]
            },
            {
                "cc": "BJ",
                "cn": l[18822]
            },
            {
                "cc": "BM",
                "cn": l[18823]
            },
            {
                "cc": "BT",
                "cn": l[18824]
            },
            {
                "cc": "BO",
                "cn": l[18825]
            },
            {
                "cc": "BA",
                "cn": l[18826]
            },
            {
                "cc": "BW",
                "cn": l[18827]
            },
            {
                "cc": "BV",
                "cn": l[18828]
            },
            {
                "cc": "BR",
                "cn": l[18829]
            },
            {
                "cc": "IO",
                "cn": l[18830]
            },
            {
                "cc": "BN",
                "cn": l[18831]
            },
            {
                "cc": "BG",
                "cn": l[18832]
            },
            {
                "cc": "BF",
                "cn": l[18833]
            },
            {
                "cc": "BI",
                "cn": l[18834]
            },
            {
                "cc": "KH",
                "cn": l[18835]
            },
            {
                "cc": "CM",
                "cn": l[18836]
            },
            {
                "cc": "CV",
                "cn": l[18837]
            },
            {
                "cc": "KY",
                "cn": l[18838]
            },
            {
                "cc": "CF",
                "cn": l[18839]
            },
            {
                "cc": "TD",
                "cn": l[18840]
            },
            {
                "cc": "CL",
                "cn": l[18841]
            },
            {
                "cc": "CN",
                "cn": l[18842]
            },
            {
                "cc": "CX",
                "cn": l[18843]
            },
            {
                "cc": "CC",
                "cn": l[18844]
            },
            {
                "cc": "CO",
                "cn": l[18845]
            },
            {
                "cc": "KM",
                "cn": l[18846]
            },
            {
                "cc": "CG",
                "cn": l[18847]
            },
            {
                "cc": "CD",
                "cn": l[18848]
            },
            {
                "cc": "CK",
                "cn": l[18849]
            },
            {
                "cc": "CR",
                "cn": l[18850]
            },
            {
                "cc": "CI",
                "cn": l[18851]
            },
            {
                "cc": "HR",
                "cn": l[18852]
            },
            {
                "cc": "CU",
                "cn": l[18853]
            },
            {
                "cc": "CY",
                "cn": l[18854]
            },
            {
                "cc": "CZ",
                "cn": l[18855]
            },
            {
                "cc": "DK",
                "cn": l[18856]
            },
            {
                "cc": "DJ",
                "cn": l[18857]
            },
            {
                "cc": "DM",
                "cn": l[18858]
            },
            {
                "cc": "DO",
                "cn": l[18859]
            },
            {
                "cc": "TL",
                "cn": l[18860]
            },
            {
                "cc": "EC",
                "cn": l[18861]
            },
            {
                "cc": "EG",
                "cn": l[18862]
            },
            {
                "cc": "SV",
                "cn": l[18863]
            },
            {
                "cc": "GQ",
                "cn": l[18864]
            },
            {
                "cc": "ER",
                "cn": l[18865]
            },
            {
                "cc": "EE",
                "cn": l[18866]
            },
            {
                "cc": "ET",
                "cn": l[18867]
            },
            {
                "cc": "FK",
                "cn": l[18868]
            },
            {
                "cc": "FO",
                "cn": l[18869]
            },
            {
                "cc": "FJ",
                "cn": l[18870]
            },
            {
                "cc": "FI",
                "cn": l[18871]
            },
            {
                "cc": "FR",
                "cn": l[18872]
            },
            {
                "cc": "GF",
                "cn": l[18873]
            },
            {
                "cc": "PF",
                "cn": l[18874]
            },
            {
                "cc": "TF",
                "cn": l[18875]
            },
            {
                "cc": "GA",
                "cn": l[18876]
            },
            {
                "cc": "GM",
                "cn": l[18877]
            },
            {
                "cc": "GE",
                "cn": l[18878]
            },
            {
                "cc": "DE",
                "cn": l[18879]
            },
            {
                "cc": "GH",
                "cn": l[18880]
            },
            {
                "cc": "GI",
                "cn": l[18881]
            },
            {
                "cc": "GR",
                "cn": l[18882]
            },
            {
                "cc": "GL",
                "cn": l[18883]
            },
            {
                "cc": "GD",
                "cn": l[18884]
            },
            {
                "cc": "GP",
                "cn": l[18885]
            },
            {
                "cc": "GU",
                "cn": l[18886]
            },
            {
                "cc": "GG",
                "cn": l[18887]
            },
            {
                "cc": "GT",
                "cn": l[18888]
            },
            {
                "cc": "GN",
                "cn": l[18889]
            },
            {
                "cc": "GW",
                "cn": l[18890]
            },
            {
                "cc": "GY",
                "cn": l[18891]
            },
            {
                "cc": "HT",
                "cn": l[18892]
            },
            {
                "cc": "HN",
                "cn": l[18893]
            },
            {
                "cc": "HK",
                "cn": l[18894]
            },
            {
                "cc": "HU",
                "cn": l[18895]
            },
            {
                "cc": "IS",
                "cn": l[18896]
            },
            {
                "cc": "IN",
                "cn": l[18897]
            },
            {
                "cc": "ID",
                "cn": l[18898]
            },
            {
                "cc": "IR",
                "cn": l[18899]
            },
            {
                "cc": "IQ",
                "cn": l[18900]
            },
            {
                "cc": "IE",
                "cn": l[18901]
            },
            {
                "cc": "IM",
                "cn": l[18902]
            },
            {
                "cc": "IL",
                "cn": l[18903]
            },
            {
                "cc": "IT",
                "cn": l[18904]
            },
            {
                "cc": "JM",
                "cn": l[18905]
            },
            {
                "cc": "JP",
                "cn": l[18906]
            },
            {
                "cc": "JE",
                "cn": l[18907]
            },
            {
                "cc": "JO",
                "cn": l[18908]
            },
            {
                "cc": "KZ",
                "cn": l[18909]
            },
            {
                "cc": "KE",
                "cn": l[18910]
            },
            {
                "cc": "KI",
                "cn": l[18911]
            },
            {
                "cc": "KW",
                "cn": l[18912]
            },
            {
                "cc": "KG",
                "cn": l[18913]
            },
            {
                "cc": "LA",
                "cn": l[18914]
            },
            {
                "cc": "LV",
                "cn": l[18915]
            },
            {
                "cc": "LB",
                "cn": l[18916]
            },
            {
                "cc": "LS",
                "cn": l[18917]
            },
            {
                "cc": "LR",
                "cn": l[18918]
            },
            {
                "cc": "LY",
                "cn": l[18919]
            },
            {
                "cc": "LI",
                "cn": l[18920]
            },
            {
                "cc": "LT",
                "cn": l[18921]
            },
            {
                "cc": "LU",
                "cn": l[18922]
            },
            {
                "cc": "MO",
                "cn": l[18923]
            },
            {
                "cc": "MK",
                "cn": l[18924]
            },
            {
                "cc": "MG",
                "cn": l[18925]
            },
            {
                "cc": "MW",
                "cn": l[18926]
            },
            {
                "cc": "MY",
                "cn": l[18927]
            },
            {
                "cc": "MV",
                "cn": l[18928]
            },
            {
                "cc": "ML",
                "cn": l[18929]
            },
            {
                "cc": "MT",
                "cn": l[18930]
            },
            {
                "cc": "MH",
                "cn": l[18931]
            },
            {
                "cc": "MQ",
                "cn": l[18932]
            },
            {
                "cc": "MR",
                "cn": l[18933]
            },
            {
                "cc": "MU",
                "cn": l[18934]
            },
            {
                "cc": "YT",
                "cn": l[18935]
            },
            {
                "cc": "MX",
                "cn": l[18936]
            },
            {
                "cc": "FM",
                "cn": l[18937]
            },
            {
                "cc": "MD",
                "cn": l[18938]
            },
            {
                "cc": "MC",
                "cn": l[18939]
            },
            {
                "cc": "MN",
                "cn": l[18940]
            },
            {
                "cc": "ME",
                "cn": l[18941]
            },
            {
                "cc": "MS",
                "cn": l[18942]
            },
            {
                "cc": "MA",
                "cn": l[18943]
            },
            {
                "cc": "MZ",
                "cn": l[18944]
            },
            {
                "cc": "MM",
                "cn": l[18945]
            },
            {
                "cc": "NA",
                "cn": l[18946]
            },
            {
                "cc": "NR",
                "cn": l[18947]
            },
            {
                "cc": "NP",
                "cn": l[18948]
            },
            {
                "cc": "NL",
                "cn": l[18949]
            },
            {
                "cc": "NC",
                "cn": l[18950]
            },
            {
                "cc": "NZ",
                "cn": l[18951]
            },
            {
                "cc": "NI",
                "cn": l[18952]
            },
            {
                "cc": "NE",
                "cn": l[18953]
            },
            {
                "cc": "NG",
                "cn": l[18954]
            },
            {
                "cc": "NU",
                "cn": l[18955]
            },
            {
                "cc": "NF",
                "cn": l[18956]
            },
            {
                "cc": "KP",
                "cn": l[18957]
            },
            {
                "cc": "MP",
                "cn": l[18958]
            },
            {
                "cc": "NO",
                "cn": l[18959]
            },
            {
                "cc": "OM",
                "cn": l[18960]
            },
            {
                "cc": "PK",
                "cn": l[18961]
            },
            {
                "cc": "PW",
                "cn": l[18962]
            },
            {
                "cc": "PS",
                "cn": l[18963]
            },
            {
                "cc": "PA",
                "cn": l[18964]
            },
            {
                "cc": "PG",
                "cn": l[18965]
            },
            {
                "cc": "PY",
                "cn": l[18966]
            },
            {
                "cc": "PE",
                "cn": l[18967]
            },
            {
                "cc": "PH",
                "cn": l[18968]
            },
            {
                "cc": "PN",
                "cn": l[18969]
            },
            {
                "cc": "PL",
                "cn": l[18970]
            },
            {
                "cc": "PT",
                "cn": l[18971]
            },
            {
                "cc": "PR",
                "cn": l[18972]
            },
            {
                "cc": "QA",
                "cn": l[18973]
            },
            {
                "cc": "RE",
                "cn": l[18974]
            },
            {
                "cc": "RO",
                "cn": l[18975]
            },
            {
                "cc": "RU",
                "cn": l[18976]
            },
            {
                "cc": "RW",
                "cn": l[18977]
            },
            {
                "cc": "MF",
                "cn": l[18978]
            },
            {
                "cc": "KN",
                "cn": l[18979]
            },
            {
                "cc": "LC",
                "cn": l[18980]
            },
            {
                "cc": "VC",
                "cn": l[18981]
            },
            {
                "cc": "WS",
                "cn": l[18982]
            },
            {
                "cc": "SM",
                "cn": l[18983]
            },
            {
                "cc": "ST",
                "cn": l[18984]
            },
            {
                "cc": "SA",
                "cn": l[18985]
            },
            {
                "cc": "SN",
                "cn": l[18986]
            },
            {
                "cc": "RS",
                "cn": l[18987]
            },
            {
                "cc": "SC",
                "cn": l[18988]
            },
            {
                "cc": "SL",
                "cn": l[18989]
            },
            {
                "cc": "SG",
                "cn": l[18990]
            },
            {
                "cc": "SK",
                "cn": l[18991]
            },
            {
                "cc": "SI",
                "cn": l[18992]
            },
            {
                "cc": "SB",
                "cn": l[18993]
            },
            {
                "cc": "SO",
                "cn": l[18994]
            },
            {
                "cc": "ZA",
                "cn": l[18995]
            },
            {
                "cc": "GS",
                "cn": l[18996]
            },
            {
                "cc": "KR",
                "cn": l[18997]
            },
            {
                "cc": "SS",
                "cn": l[18998]
            },
            {
                "cc": "ES",
                "cn": l[18999]
            },
            {
                "cc": "LK",
                "cn": l[19000]
            },
            {
                "cc": "SH",
                "cn": l[19001]
            },
            {
                "cc": "PM",
                "cn": l[19002]
            },
            {
                "cc": "SD",
                "cn": l[19003]
            },
            {
                "cc": "SR",
                "cn": l[19004]
            },
            {
                "cc": "SJ",
                "cn": l[19005]
            },
            {
                "cc": "SZ",
                "cn": l[19006]
            },
            {
                "cc": "SE",
                "cn": l[19007]
            },
            {
                "cc": "CH",
                "cn": l[19008]
            },
            {
                "cc": "SY",
                "cn": l[19009]
            },
            {
                "cc": "TW",
                "cn": l[19010]
            },
            {
                "cc": "TJ",
                "cn": l[19011]
            },
            {
                "cc": "TZ",
                "cn": l[19012]
            },
            {
                "cc": "TH",
                "cn": l[19013]
            },
            {
                "cc": "TG",
                "cn": l[19014]
            },
            {
                "cc": "TK",
                "cn": l[19015]
            },
            {
                "cc": "TO",
                "cn": l[19016]
            },
            {
                "cc": "TT",
                "cn": l[19017]
            },
            {
                "cc": "TN",
                "cn": l[19018]
            },
            {
                "cc": "TR",
                "cn": l[19019]
            },
            {
                "cc": "TM",
                "cn": l[19020]
            },
            {
                "cc": "TC",
                "cn": l[19021]
            },
            {
                "cc": "TV",
                "cn": l[19022]
            },
            {
                "cc": "UG",
                "cn": l[19023]
            },
            {
                "cc": "UA",
                "cn": l[19024]
            },
            {
                "cc": "AE",
                "cn": l[19025]
            },
            {
                "cc": "UM",
                "cn": l[19026]
            },
            {
                "cc": "UY",
                "cn": l[19027]
            },
            {
                "cc": "UZ",
                "cn": l[19028]
            },
            {
                "cc": "VU",
                "cn": l[19029]
            },
            {
                "cc": "VA",
                "cn": l[19030]
            },
            {
                "cc": "VE",
                "cn": l[19031]
            },
            {
                "cc": "VN",
                "cn": l[19032]
            },
            {
                "cc": "VG",
                "cn": l[19033]
            },
            {
                "cc": "VI",
                "cn": l[19034]
            },
            {
                "cc": "WF",
                "cn": l[19035]
            },
            {
                "cc": "EH",
                "cn": l[19036]
            },
            {
                "cc": "YE",
                "cn": l[19037]
            },
            {
                "cc": "ZM",
                "cn": l[19038]
            },
            {
                "cc": "ZW",
                "cn": l[19039]
            },
            {
                "cc": "BQ",
                "cn": l[19078]
            },
            {
                "cc": "CW",
                "cn": l[19079]
            },
            {
                "cc": "HM",
                "cn": l[19080]
            },
            {
                "cc": "BL",
                "cn": l[19081]
            },
            {
                "cc": "SX",
                "cn": l[19082]
            },
            {
                "cc": "XK",
                "cn": l[19943]
            }
        ];
        var countries = {};
        $.each(countryNames.sort(M.sortObjFn("cn", 1, null)), function(index, cd) {
            countries[cd["cc"]] = cd["cn"];
        });
        this.countries = countries;
    }

    if (M !== undefined && M !== null && M._states) {
        this.states = M._states;
    } else {
        this.states =  {
            'CA-AB': 'Alberta',
            'CA-BC': 'British Columbia',
            'CA-MB': 'Manitoba',
            'CA-NB': 'New Brunswick',
            'CA-NL': 'Newfoundland and Labrador',
            'CA-NT': 'Northwest Territories',
            'CA-NS': 'Nova Scotia',
            'CA-NU': 'Nunavut',
            'CA-ON': 'Ontario',
            'CA-PE': 'Prince Edward Island',
            'CA-QC': 'Quebec',
            'CA-SK': 'Saskatchewan',
            'CA-YT': 'Yukon',
            'US-AL': 'Alabama',
            'US-AK': 'Alaska',
            'US-AS': 'American Samoa',
            'US-AZ': 'Arizona',
            'US-AR': 'Arkansas',
            'US-CA': 'California',
            'US-CO': 'Colorado',
            'US-CT': 'Connecticut',
            'US-DE': 'Delaware',
            'US-DC': 'District of Columbia',
            'US-FL': 'Florida',
            'US-GA': 'Georgia',
            'US-GU': 'Guam',
            'US-HI': 'Hawaii',
            'US-ID': 'Idaho',
            'US-IL': 'Illinois',
            'US-IN': 'Indiana',
            'US-IA': 'Iowa',
            'US-KS': 'Kansas',
            'US-KY': 'Kentucky',
            'US-LA': 'Louisiana',
            'US-ME': 'Maine',
            'US-MD': 'Maryland',
            'US-MA': 'Massachusetts',
            'US-MI': 'Michigan',
            'US-MN': 'Minnesota',
            'US-MS': 'Mississippi',
            'US-MO': 'Missouri',
            'US-MT': 'Montana',
            'US-NE': 'Nebraska',
            'US-NV': 'Nevada',
            'US-NH': 'New Hampshire',
            'US-NJ': 'New Jersey',
            'US-NM': 'New Mexico',
            'US-NY': 'New York',
            'US-NC': 'North Carolina',
            'US-ND': 'North Dakota',
            'US-MP': 'Northern Mariana Islands',
            'US-OH': 'Ohio',
            'US-OK': 'Oklahoma',
            'US-OR': 'Oregon',
            'US-PA': 'Pennsylvania',
            'US-PR': 'Puerto Rico',
            'US-RI': 'Rhode Island',
            'US-SC': 'South Carolina',
            'US-SD': 'South Dakota',
            'US-TN': 'Tennessee',
            'US-TX': 'Texas',
            'US-UM': 'United States Minor Outlying Islands',
            'US-UT': 'Utah',
            'US-VT': 'Vermont',
            'US-VA': 'Virginia',
            'US-VI': 'Virgin Islands, U.S.',
            'US-WA': 'Washington',
            'US-WV': 'West Virginia',
            'US-WI': 'Wisconsin',
            'US-WY': 'Wyoming'
        };
    }

    if (M !== undefined && M !== null && M._countryCallCodes) {
        this.countryCallCodes = M._countryCallCodes;
    } else {
        this.countryCallCodes = {
            'AF': '93',
            'AL': '355',
            'AS': '1684',
            'AD': '376',
            'AO': '244',
            'AI': '1264',
            'AQ': '672',
            'AG': '1268',
            'AR': '54',
            'AM': '374',
            'AW': '297',
            'AU': '61',
            'AT': '43',
            'AX': '358',
            'AZ': '994',
            'BS': '1242',
            'BH': '973',
            'BD': '880',
            'BB': '1246',
            'BY': '375',
            'BE': '32',
            'BZ': '501',
            'BJ': '229',
            'BM': '1441',
            'BQ': '599',
            'BT': '975',
            'BO': '591',
            'BA': '387',
            'BW': '267',
            'BR': '55',
            'BN': '673',
            'BG': '359',
            'BF': '226',
            'BI': '257',
            'BV': '599',
            'KH': '855',
            'CM': '237',
            'CA': '1',
            'CV': '238',
            'KY': '1345',
            'CF': '236',
            'TD': '235',
            'CL': '56',
            'CN': '86',
            'CX': '61',
            'CC': '61',
            'CO': '57',
            'KM': '269',
            'CK': '682',
            'CR': '506',
            'HR': '385',
            'IO': '246',
            'CU': '53',
            'CW': '599',
            'CY': '357',
            'CZ': '420',
            'CD': '243',
            'DK': '45',
            'DJ': '253',
            'DM': '1767',
            'DO': '18',
            'DZ': '213',
            'TL': '670',
            'EC': '593',
            'EG': '20',
            'SV': '503',
            'GQ': '240',
            'ER': '291',
            'EE': '372',
            'ET': '251',
            'FK': '500',
            'FO': '298',
            'FJ': '679',
            'FI': '358',
            'FR': '33',
            'PF': '689',
            'GA': '241',
            'GM': '220',
            'GE': '995',
            'GF': '594',
            'DE': '49',
            'GH': '233',
            'GI': '350',
            'GR': '30',
            'GL': '299',
            'GD': '1473',
            'GU': '1671',
            'GT': '502',
            'GG': '441481',
            'GN': '224',
            'GP': '590',
            'GS': '500',
            'GW': '245',
            'GY': '592',
            'HT': '509',
            'HM': '0',
            'HN': '504',
            'HK': '852',
            'HU': '36',
            'IS': '354',
            'IN': '91',
            'ID': '62',
            'IR': '98',
            'IQ': '964',
            'IE': '353',
            'IM': '441624',
            'IL': '972',
            'IT': '39',
            'CI': '225',
            'JM': '1876',
            'JP': '81',
            'JE': '441534',
            'JO': '962',
            'KZ': '7',
            'KE': '254',
            'KI': '686',
            'XK': '383',
            'KW': '965',
            'KG': '996',
            'LA': '856',
            'LV': '371',
            'LB': '961',
            'LS': '266',
            'LR': '231',
            'LY': '218',
            'LI': '423',
            'LT': '370',
            'LU': '352',
            'MO': '853',
            'MK': '389',
            'MG': '261',
            'MW': '265',
            'MY': '60',
            'MV': '960',
            'ML': '223',
            'MT': '356',
            'MH': '692',
            'MR': '222',
            'MU': '230',
            'YT': '262',
            'MX': '52',
            'FM': '691',
            'MA': '212',
            'MD': '373',
            'MC': '377',
            'MN': '976',
            'ME': '382',
            'MS': '1664',
            'MM': '95',
            'MQ': '596',
            'MZ': '258',
            'NA': '264',
            'NR': '674',
            'NP': '977',
            'NL': '31',
            'AN': '599',
            'NC': '687',
            'NZ': '64',
            'NI': '505',
            'NE': '227',
            'NF': '672',
            'NG': '234',
            'NU': '683',
            'KP': '850',
            'MP': '1670',
            'NO': '47',
            'OM': '968',
            'PK': '92',
            'PW': '680',
            'PS': '970',
            'PA': '507',
            'PG': '675',
            'PY': '595',
            'PE': '51',
            'PH': '63',
            'PN': '64',
            'PL': '48',
            'PT': '351',
            'PR': '1',
            'QA': '974',
            'CG': '242',
            'RE': '262',
            'RO': '40',
            'RU': '7',
            'RW': '250',
            'BL': '590',
            'SH': '290',
            'KN': '1869',
            'LC': '1758',
            'MF': '590',
            'PM': '508',
            'VC': '1784',
            'WS': '685',
            'SM': '378',
            'ST': '239',
            'SA': '966',
            'SN': '221',
            'RS': '381',
            'SC': '248',
            'SL': '232',
            'SG': '65',
            'SX': '1721',
            'SK': '421',
            'SI': '386',
            'SB': '677',
            'SO': '252',
            'ZA': '27',
            'KR': '82',
            'SS': '211',
            'ES': '34',
            'LK': '94',
            'SD': '249',
            'SR': '597',
            'SJ': '47',
            'SZ': '268',
            'SE': '46',
            'CH': '41',
            'SY': '963',
            'TW': '886',
            'TF': '260',
            'TJ': '992',
            'TZ': '255',
            'TH': '66',
            'TG': '228',
            'TK': '690',
            'TO': '676',
            'TT': '1868',
            'TN': '216',
            'TR': '90',
            'TM': '993',
            'TC': '1649',
            'TV': '688',
            'VI': '1340',
            'VG': '1284',
            'UG': '256',
            'UA': '380',
            'AE': '971',
            'GB': '44',
            'US': '1',
            'UY': '598',
            'UZ': '998',
            'VU': '678',
            'VA': '379',
            'VE': '58',
            'VN': '84',
            'WF': '681',
            'EH': '212',
            'YE': '967',
            'ZM': '260',
            'ZW': '263',
            'UM': '1'
        };
    }
}
