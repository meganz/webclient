var Rbits, Rbits2;
var cbuf;

if (typeof window.crypto == 'object' && typeof window.crypto.getRandomValues == 'function') cbuf = new Uint32Array(1);

// random number between 0 .. n -- based on repeated calls to rc
function rand(n)
{
	if (cbuf) window.crypto.getRandomValues(cbuf);

	if (n == 2)
	{
		if (!Rbits)
		{
			Rbits = 8;
			Rbits2 = rc4Next(randomByte()) ^ cbuf[0];
		}

		Rbits--;
		var r = Rbits2 & 1;
		Rbits2 >>= 1;
		return r;
	}

	var m = 1;

	r = 0;

	while (n > m && m > 0)
	{
		m <<= 8;
		r = (r << 8) | rc4Next(randomByte());
	}

	if (cbuf) r ^= cbuf[0];

	if (r < 0) r += 0x100000000;

	return r % n;
}

function genkey()
{
    var bits = 2048,
        pexp = 257;

    var startTime = new Date();

    var rsakey = asmCrypto.RSA.generateKey(bits,pexp);
    for ( var i = 0; i < rsakey.length; i++ ) {
        if ( typeof rsakey[i] === 'number' ) rsakey[i] = (new asmCrypto.BigNumber(rsakey[i])).toBytes();
        rsakey[i] = asmCrypto.bytes_to_string(rsakey[i]);
    }

	var endTime = new Date();

	if (d) console.log("Key generation took " +  (endTime.getTime()-startTime.getTime())/1000.0) + " seconds!";

	u_setrsa(rsakey);
}
