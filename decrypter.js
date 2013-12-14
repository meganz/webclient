importScripts('sjcl.js');

postMessage = self.webkitPostMessage || self.postMessage;

var aes, ctr;

onmessage = function(e)
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
		var enc, mac, macs = [], i, ni = 0, j, len, v, data0, data1, data2, data3;
		var b = e.data.buffer || e.data;
		
		len = b.byteLength-16;

		var dv = new DataView(b);

		for (i = 0; i < len; i += 16)
		{
			if (i == ni)
			{
				if (i) macs.push(mac[0],mac[1],mac[2],mac[3]);
				mac = [ctr[0],ctr[1],ctr[0],ctr[1]];
				ni = i+1048576;
			}
			
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

		macs.push(mac[0],mac[1],mac[2],mac[3]);

		postMessage(JSON.stringify(macs));
		postMessage(dv.buffer,[dv.buffer]);
	}
};