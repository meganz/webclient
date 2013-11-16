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
		var enc, mac, i, j, len, v, data0, data1, data2, data3;
		mac = [ctr[0],ctr[1],ctr[0],ctr[1]];
		len = e.data.buffer.byteLength-16;

		var dv = new DataView(e.data.buffer);

		for (i = 0; i < len; i += 16)
		{
			enc = aes.encrypt(ctr);

			data0 = dv.getUint32(i,false)^enc[0];
			data1 = dv.getUint32(i+4,false)^enc[1];
			data2 = dv.getUint32(i+8,false)^enc[2];
			data3 = dv.getUint32(i+12,false)^enc[3];

			dv.setUint32(i,data0,false);
			dv.setUint32(i+4,data1,false);
			dv.setUint32(i+8,data2,false);
			dv.setUint32(i+12,data3,false);

			mac[0] ^= data0;
			mac[1] ^= data1;
			mac[2] ^= data2;
			mac[3] ^= data3;

			mac = aes.encrypt(mac);
			
			if (!(++ctr[3])) ctr[2]++;
		}

		if (i < dv.buffer.byteLength)
		{
			var fullbuf = new Uint8Array(dv.buffer);
			var tmpbuf = new ArrayBuffer(16);
			var tmparray = new Uint8Array(tmpbuf);
			
			tmparray.set(fullbuf.subarray(i));
			
			v = new DataView(tmpbuf);
			enc = aes.encrypt(ctr);
			
			data0 = v.getUint32(0,false)^enc[0];
			data1 = v.getUint32(4,false)^enc[1];
			data2 = v.getUint32(8,false)^enc[2];
			data3 = v.getUint32(12,false)^enc[3];
			
			v.setUint32(0,data0,false);
			v.setUint32(4,data1,false);
			v.setUint32(8,data2,false);
			v.setUint32(12,data3,false);
			
			fullbuf.set(tmparray.subarray(0,j = fullbuf.length-i),i);
			
			while (j < 16) tmparray[j++] = 0;
			
			mac[0] ^= v.getUint32(0,false);
			mac[1] ^= v.getUint32(4,false);
			mac[2] ^= v.getUint32(8,false);
			mac[3] ^= v.getUint32(12,false);
			
			mac = aes.encrypt(mac);
		}

		self.postMessage(JSON.stringify(mac));
		self.postMessage(dv.buffer);
	}
};