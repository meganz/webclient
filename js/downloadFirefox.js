"use strict";

function FirefoxIO(dl_id, dl)
{
	var FD, PATH, error;

	this.write = function (buffer, offset, done)
	{
		if (d) console.log('Writing...', buffer.byteLength, offset, PATH);
		FD.write(buffer).then(l => Soon(done), error);
	};

	this.download = function(name)
	{
		this.abort();
		mozIOCleanup(name, PATH, 0, dl);
	};

	this.setCredentials = function (url, size, name)
	{
		error = mozIOError(name);

		if (!this.is_zip && dl.zipid) return this.begin();

		mozIOSetup(name, dl.zipid ? '' : dl.p, size, error, p =>
		{
			if (!dl.st) dl.st = Date.now();

			OS.File.open(PATH=p, { trunc: true }).then(fd =>
			{
				FD = fd;
				Soon(() => this.begin());
			}, error);
		});
	};

	this.abort = function(e)
	{
		if (FD)
		{
			FD.close();
			FD = undefined;
			if (e) OS.File.remove(PATH);
		}
	};
}

function MemoryIO(dl_id, dl)
{
	var u8buf;

	if (d) console.error('Creating new Firefox MemoryIO instance', dl_id, dl );

	this.write = function (buffer, offset, done)
	{
		u8buf.set(buffer, offset);
		Soon(done);
	};

	this.download = function(name, path)
	{
		var tmp = u8buf, size = tmp.length, error = mozIOError(name);
		u8buf = undefined;

		mozIOSetup(name, path, size, error, path =>
		{
			OS.File.writeAtomic(path, tmp).then(r =>
			{
				console.assert(r===size,'MemoryIO Error '+r+'/'+size);
				mozIOCleanup(name, path, size, dl);
			}, error);
		});
	};

	this.setCredentials = function (url, size)
	{
		if (d) console.log('MemoryIO Begin', dl_id, Array.prototype.slice.call(arguments));

		if (this.is_zip || !dl.zipid) u8buf = new Uint8Array(size);
		this.begin();
	};

	this.abort = function()
	{
		u8buf = undefined;
	};
}
MemoryIO.usable = function() { return true }

function mozIOError(name)
{
	return function(e)
	{
		mozError(e);
		msgDialog('warninga', l[1676], l[115] + ': ' + name, '' + e );
	};
}

function mozIOCleanup(name, path, size, dl)
{
	if (d) console.log('mozIOCleanup', name, path);
	if (dl.t) OS.File.setDates(path, null, dl.t*1e3);
	mozAddToLibrary(path, name, size, dl.st );
}

function mozIOSetup(name, path, size, error, success)
{
	function setup()
	{
		try
		{
			var root = mozGetDownloadsFolder().path;
		}
		catch(e)
		{
			return Soon(() => error(e));
		}

		path = OS.Path.join(root, ...mozSanePathTree(path,name));

		if (d) console.log('mozIOSetup', name, path);

		OS.File.makeDir(OS.Path.dirname(path), {
			ignoreExisting: true,
			from: root
		}).then(() => success(path), error);
	}

	webkitStorageInfo.queryUsageAndQuota((u,r) =>
	{
		if (r > size) return setup();

		webkitStorageInfo.requestQuota(size,setup);
	});
}

function FlashIO() {}
