importScripts('aesasm.js');

postMessage = self.webkitPostMessage || self.postMessage;

var heap = new Uint8Array(0x200000), // first valid heap size after 0x101000
    asm = aes_asm(self, null, heap.buffer),
    nonce = new Uint8Array(8),
    iv  = new Uint8Array(16),
    ctr = 0;

onmessage = function(e)
{
	if (typeof(e.data) == 'string')
	{
		var arr = JSON.parse(e.data);

		var nonceView = new DataView(nonce.buffer);
		nonceView.setUint32( 0, arr[4], false );
		nonceView.setUint32( 4, arr[5], false );
		iv.set( nonce, 0 );
		iv.set( nonce, 8 );

		var key = new Uint8Array(16);
		var keyView = new DataView(key.buffer);
		keyView.setUint32(  0, arr[0], false );
		keyView.setUint32(  4, arr[1], false );
		keyView.setUint32(  8, arr[2], false );
		keyView.setUint32( 12, arr[3], false );

		asm.init_key_128.apply( asm, key );
	}
	else if (typeof(e.data) == 'number')
	{
		ctr = e.data;
	}
	else
	{
		var data = new Uint8Array( e.data.buffer || e.data );
		var heapView = new DataView( heap.buffer );
		var macs = [];

		for ( var i = 0; i < data.length; i += 0x100000 )
		{
			// put data chunk into the heap
			var j = ( i + 0x100000 < data.length ) ? i + 0x100000 : data.length;
			heap.set( data.subarray(i,j), 0x1000 );

			// init mac state
			asm.init_state.apply( asm, iv );

			// decrypt data
			asm.ccm_decrypt(0x1000, j-i,nonce[0], nonce[1], nonce[2], nonce[3], nonce[4], nonce[5], nonce[6], nonce[7],0, 0, 0, 0, 0, 0,(ctr/0x100000000) >>> 0,ctr >>> 0);

			// get decrypted data from the heap
			data.set( heap.subarray( 0x1000, 0x1000+j-i ), i );

			// store mac
			asm.save_state(0x1000);
			macs.push( heapView.getUint32( 0x1000, false ) );
			macs.push( heapView.getUint32( 0x1004, false ) );
			macs.push( heapView.getUint32( 0x1008, false ) );
			macs.push( heapView.getUint32( 0x100c, false ) );

			// adjust counter
			ctr += Math.ceil( (j-i)/16 );
		}

		postMessage(JSON.stringify(macs));

		if (typeof MSBlobBuilder == "function") postMessage(data);
		else postMessage(data.buffer,[data.buffer]);
	}
};
