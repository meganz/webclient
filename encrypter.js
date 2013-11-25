importScripts('sjcl.js');

self.postMessage = self.webkitPostMessage || self.postMessage;

var aes, ctr;

self.onmessage = function(e)
{
	if (typeof(e.data) == 'string')
	{
		var key = JSON.parse(e.data);
		ctr = [key[4],key[5]];
		aes = new sjcl.cipher.aes([key[0],key[1],key[2],key[3]]);
	}
	else if (typeof(e.data) == 'number')
	{
		ctr[3] = e.data >>> 0;
		ctr[2] = (e.data/0x100000000) >>> 0;
	}
	else
	{
		var enc, mac, i, len, v, data0, data1, data2, data3;
		mac = [ctr[0],ctr[1],ctr[0],ctr[1]];
		len = e.data.buffer.byteLength-16;

		var dv = new DataView(e.data.buffer);

		for (i = 0; i < len; i += 16)
		{
			data0 = dv.getUint32(i,false);
			data1 = dv.getUint32(i+4,false);
			data2 = dv.getUint32(i+8,false);
			data3 = dv.getUint32(i+12,false);
			
			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;

			mac = aes.encrypt(mac);
			enc = aes.encrypt(ctr);
	
			dv.setUint32(i,data0 ^ enc[0],false);
			dv.setUint32(i+4,data1 ^ enc[1],false);
			dv.setUint32(i+8,data2 ^ enc[2],false);
			dv.setUint32(i+12,data3 ^ enc[3],false);
		
			ctr[3]++;
			if (!ctr[3]) ctr[2]++;
		}

		if (i < dv.buffer.byteLength)
		{
			var fullbuf = new Uint8Array(dv.buffer);
			var tmpbuf = new ArrayBuffer(16);
			var tmparray = new Uint8Array(tmpbuf);
			
			tmparray.set(fullbuf.subarray(i));
			v = new DataView(tmpbuf);
			enc = aes.encrypt(ctr);
			
			data0 = v.getUint32(0,false);
			data1 = v.getUint32(4,false);
			data2 = v.getUint32(8,false);
			data3 = v.getUint32(12,false);
			
			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;
			
			mac = aes.encrypt(mac);
			enc = aes.encrypt(ctr);
			
			v.setUint32(0,data0 ^ enc[0],false);
			v.setUint32(4,data1 ^ enc[1],false);
			v.setUint32(8,data2 ^ enc[2],false);
			v.setUint32(12,data3 ^ enc[3],false);
			
			fullbuf.set(tmparray.subarray(0,fullbuf.length-i),i);
		}

		self.postMessage(JSON.stringify(mac));
		self.postMessage(dv.buffer);
	}
};