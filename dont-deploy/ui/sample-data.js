u_handle = "Gb4kDKDlwxI";


window.sampleData = {
    'megaChat': {
        'dummy': {
            karere: {
                getPresence: function() {
                    return "chat";
                }
            },
            getJidFromNodeId: function() {
                return u_handle;
            }
        }
    },
    'contacts': {
        'singleContact': [
            {
                "u":"Gb4kDKDlwxI","c":1,"m":"lpetrov+mega17@me.com","m2":["lpetrov+mega17@me.com"],"name":"lpetrov+mega17@me.com","h":"Gb4kDKDlwxI","t":1,"p":"contacts","shortName":"LM","displayColor":null,"presence":"chat","presenceMtime":1447942330.871
            }
        ]
    }
};

M = {};
M.u = new MegaDataMap();
M.u.set("Gb4kDKDlwxI", sampleData.contacts.singleContact[0]);
