window = this; // required, so that nacl-fast.js can be loaded as-is in a worker

importScripts('nacl-fast.js');

var have_ab = typeof ArrayBuffer !== 'undefined' && typeof DataView !== 'undefined';

postMessage = self.webkitPostMessage || self.postMessage;

onmessage = function(e)
{

    if (e.data.length && e.data.splice)
    {
        var arr = e.data;

        if (arr[0] === 'verify') {
            postMessage(
                nacl.sign.detached.verify(
                    arr[1],
                    arr[2],
                    arr[3]
                )
            );
        }
        else {
            console.error("Unknown op: ", arr[0]);
        }
    }
    else
    {
        console.error("Invalid message: ", e.data);
    }
};
