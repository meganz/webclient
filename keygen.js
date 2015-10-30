importScripts('rsaasm.js');

self.postMessage = self.webkitPostMessage || self.postMessage;

self.onmessage = function ( e ) {
    var bits = ( e.data && e.data[0] ) || 2048,
        pexp = ( e.data && e.data[1] ) || 257,
        seed = ( e.data && e.data[2] ) || 0;

    if ( seed ) asmCrypto.random.seed(seed);

    var rsakey = asmCrypto.RSA.generateKey(bits,pexp);
    if ( typeof rsakey[1] === 'number' ) rsakey[1] = asmCrypto.hex_to_bytes( rsakey[1].toString(16) ); // fix exponent
    for ( var i = 0; i < rsakey.length; i++ ) rsakey[i] = asmCrypto.bytes_to_string( rsakey[i] );

    self.postMessage(rsakey);
};