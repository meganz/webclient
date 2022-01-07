/**
 * Ion.Sound
 * version 3.1.0 Build 90
 * (c) 2016 Denis Ineshin
 * (c) 2021 MEGA Ltd.
 *
 * Project page:    http://ionden.com/a/plugins/ion.sound/en.html
 * GitHub page:     https://github.com/IonDen/ion.sound
 *
 * Released under MIT licence:
 * http://ionden.com/a/plugins/licence-en.html
 */

(function(window) {
    "use strict";

    window.ion = window.ion || Object.create(null);

    if (ion.sound) {
        return;
    }

    const warn = console.warn.bind(console, '[ion.sound]');
    const extend = (parent, child) => Object.assign(child || {}, parent);


    /**
     * DISABLE for unsupported browsers
     */

    if (typeof Audio !== "function" && typeof Audio !== "object") {
        const func = () => warn("HTML5 Audio is not supported in this browser");
        ion.sound = func;
        ion.sound.play = func;
        ion.sound.stop = func;
        ion.sound.pause = func;
        ion.sound.preload = func;
        ion.sound.destroy = func;
        func();
        return;
    }


    /**
     * CORE
     * - creating sounds collection
     * - public methods
     */
    const sounds = Object.create(null);
    const settings = Object.create(null);

    settings.supported = window.is_ios ? ['mp3', 'mp4', 'aac'] : ['mp3', 'ogg', 'mp4', 'aac', 'wav'];

    const createSound = obj => {
        const name = obj.alias || obj.name;

        if (!sounds[name]) {
            sounds[name] = new Sound(obj);
            sounds[name].init();
        }
    };

    const invoke = (method, name, options) => {
        if (name) {
            if (sounds[name]) {
                sounds[name][method](options);
            }
            return;
        }

        for (const i in sounds) {
            if (sounds[i]) {
                sounds[i][method](options);
            }
        }
    };

    ion.sound = function(options) {
        extend(options, settings);

        settings.path = settings.path || "";
        settings.volume = settings.volume || 1;
        settings.preload = settings.preload > 1;
        settings.multiplay = settings.multiplay || false;
        settings.loop = settings.loop || false;
        settings.sprite = settings.sprite || null;
        settings.scope = settings.scope || null;
        settings.ready_callback = settings.ready_callback || null;
        settings.ended_callback = settings.ended_callback || null;
        settings.allow_cache = settings.allow_cache === undefined || settings.allow_cache;

        let sounds_num = settings.sounds.length;

        if (!sounds_num) {
            warn("No sound-files provided!");
            return;
        }

        while (sounds_num--) {
            createSound(settings.sounds[sounds_num]);
        }
    };

    ion.sound.VERSION = "3.1.0";

    ion.sound.preload = (name, options = {}) => invoke("init", name, {...options, preload: true});

    ion.sound.destroy = (name) => {
        invoke("destroy", name);

        if (name) {
            sounds[name] = null;
            return;
        }

        for (const i in sounds) {
            sounds[i] = null;
        }
    };

    ion.sound.play = (...args) => invoke("play", ...args);
    ion.sound.stop = (...args) => invoke("stop", ...args);
    ion.sound.pause = (...args) => invoke("pause", ...args);
    ion.sound.volume = (...args) => invoke("volume", ...args);

    Object.defineProperty(ion.sound, 'audioContext', {
        get() {
            return Sound.audioContext;
        },
        set(v) {
            if (v && v.state === 'running') {
                Sound.audioContext = v;
            }
        }
    });

    Object.freeze(ion.sound);
    Object.freeze(ion);

    /**
     * Web Audio API core
     * - for most advanced browsers
     */

    class Sound {
        constructor(options) {
            this.options = extend(settings);
            delete this.options.sounds;
            extend(options, this.options);

            this.request = null;
            this.streams = Object.create(null);
            this.ext = 0;
            this.url = "";

            this.loaded = false;
            this.decoded = false;
            this.no_file = false;
            this.autoplay = false;
        }

        init(options) {
            if (options) {
                extend(options, this.options);
            }

            if (this.options.preload) {
                this.load();
            }
        }

        destroy() {
            for (const i in this.streams) {
                const stream = this.streams[i];

                if (stream) {
                    stream.destroy();
                }
            }
            this.streams = Object.create(null);
            this.options.buffer = null;
            this.options = null;

            if (this.request) {
                this.request.onloadend = null;
                this.request.abort();
                this.request = null;
            }
        }

        createUrl() {
            const {path, name, supported, allow_cache} = this.options;
            const url = `${path + encodeURIComponent(name)}.${supported[this.ext]}`;

            this.url = url + (allow_cache === true ? `?t=${Date.now()}` : '');
        }

        load() {
            if (this.no_file) {
                warn(`No sources for "${this.options.name}" sound :(`);
                return;
            }

            if (this.request) {
                return;
            }

            this.createUrl();

            this.request = new XMLHttpRequest();
            this.request.open("GET", this.url, true);
            this.request.responseType = "arraybuffer";
            this.request.onloadend = (ev) => this.ready(ev);

            this.request.send();
        }

        reload() {
            this.no_file = !this.options.supported[++this.ext];
            this.load();
        }

        ready(ev) {
            const xhr = ev.target;

            this.request.onloadend = null;
            this.request = null;

            if (xhr.readyState !== 4) {
                this.reload();
                return;
            }

            if (xhr.status !== 200 && xhr.status !== 0) {
                warn(`${this.url} was not found on server!`);
                this.reload();
                return;
            }

            this.loaded = true;
            this.decode(xhr.response);
        }

        decode(data) {
            if (!Sound.audioContext) {
                this.options.buffer = data;
                return;
            }

            try {
                Sound.audioContext.decodeAudioData(data, (buf) => this.setBuffer(buf), () => this.reload());
            }
            catch (ex) {
                warn(ex);
                this.reload();
            }
        }

        setBuffer(buffer) {
            this.options.buffer = buffer;
            this.decoded = true;

            const config = {
                name: this.options.name,
                alias: this.options.alias,
                ext: this.options.supported[this.ext],
                duration: this.options.buffer.duration
            };

            if (typeof this.options.ready_callback === "function") {
                this.options.ready_callback.call(this.options.scope, config);
            }

            if (this.options.sprite) {

                for (const i in this.options.sprite) {
                    this.options.start = this.options.sprite[i][0];
                    this.options.end = this.options.sprite[i][1];
                    this.streams[i] = new Stream(this.options, i);
                }
            }
            else {
                this.streams[0] = new Stream(this.options);
            }

            if (this.autoplay) {
                this.autoplay = false;
                this.play();
            }
        }

        play(options) {
            delete this.options.part;

            if (options) {
                extend(options, this.options);
            }

            if (!Sound.audioContext) {
                Sound.audioContext = new AudioContext();

                if (Sound.audioContext.state !== 'running') {
                    warn('The audio context failed to start.');
                }
            }

            if (!this.loaded) {
                this.autoplay = true;
                this.load();
                return;
            }

            if (!this.decoded) {
                const {buffer} = this.options;
                if (buffer) {
                    this.autoplay = true;
                    this.options.buffer = null;
                    this.decode(buffer);
                    return;
                }
            }

            if (this.no_file || !this.decoded) {
                return;
            }

            if (this.options.sprite) {
                if (this.options.part) {
                    this.streams[this.options.part].play(this.options);
                }
                else {
                    for (const i in this.options.sprite) {
                        this.streams[i].play(this.options);
                    }
                }
            }
            else {
                this.streams[0].play(this.options);
            }
        }

        stop(options) {
            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].stop();
                }
                else {
                    for (const i in this.options.sprite) {
                        this.streams[i].stop();
                    }
                }

            }
            else if (this.streams[0]) {
                this.streams[0].stop();
            }
        }

        pause(options) {
            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].pause();
                }
                else {
                    for (const i in this.options.sprite) {
                        this.streams[i].pause();
                    }
                }
            }
            else {
                this.streams[0].pause();
            }
        }

        volume(options) {
            let stream;

            if (!options) {
                return;
            }
            extend(options, this.options);

            if (this.options.sprite) {
                if (this.options.part) {
                    if ((stream = this.streams[this.options.part])) {
                        stream.setVolume(this.options);
                    }
                }
                else {
                    for (const i in this.options.sprite) {
                        if ((stream = this.streams[i])) {
                            stream.setVolume(this.options);
                        }
                    }
                }
            }
            else if ((stream = this.streams[0])) {
                stream.setVolume(this.options);
            }
        }
    }


    class Stream {
        constructor(options, sprite_part) {
            this.alias = options.alias;
            this.name = options.name;
            this.sprite_part = sprite_part;

            this.buffer = options.buffer;
            this.start = options.start || 0;
            this.end = options.end || this.buffer.duration;
            this.multiplay = options.multiplay || false;
            this.volume = options.volume || 1;
            this.scope = options.scope;
            this.ended_callback = options.ended_callback;

            this.setLoop(options);

            this.source = null;
            this.gain = null;
            this.playing = false;
            this.paused = false;

            this.time_started = 0;
            this.time_ended = 0;
            this.time_played = 0;
            this.time_offset = 0;
        }

        destroy() {
            this.stop();

            this.buffer = null;
            this.source = null;

            if (this.gain) {
                this.gain.disconnect();
                this.gain = null;
            }
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
        }

        setLoop(options) {
            if (options.loop === true) {
                this.loop = 9999999;
            }
            else if (typeof options.loop === "number") {
                this.loop = +options.loop - 1;
            }
            else {
                this.loop = false;
            }
        }

        update(options) {
            this.setLoop(options);
            if ("volume" in options) {
                this.volume = options.volume;
            }
        }

        play(options) {
            if (options) {
                this.update(options);
            }

            if (!this.multiplay && this.playing) {
                return;
            }

            this.gain = Sound.audioContext.createGain();
            this.source = Sound.audioContext.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.connect(this.gain);
            this.gain.connect(Sound.audioContext.destination);
            this.gain.gain.value = this.volume;

            this.source.onended = this.ended.bind(this);

            this._play();
        }

        _play() {
            let {start, end, paused, time_offset} = this;

            if (paused) {
                end -= time_offset;
                start += time_offset;
            }

            if (end <= 0) {
                this.clear();
                return;
            }

            if (typeof this.source.start === "function") {
                this.source.start(0, start, end);
            }
            else {
                this.source.noteOn(0, start, end);
            }

            this.playing = true;
            this.paused = false;
            this.time_started = Date.now();
        }

        stop() {
            if (this.playing && this.source) {
                if (typeof this.source.stop === "function") {
                    this.source.stop(0);
                }
                else {
                    this.source.noteOff(0);
                }
            }

            this.clear();
        }

        pause() {
            if (this.paused) {
                this.play();
                return;
            }

            if (!this.playing) {
                return;
            }

            if (this.source) {
                this.source.stop(0);
            }
            this.paused = true;
        }

        ended() {
            var was_playing = this.playing;
            this.playing = false;
            this.time_ended = Date.now();
            this.time_played = (this.time_ended - this.time_started) / 1000;
            this.time_offset += this.time_played;

            if (this.time_offset >= this.end || this.end - this.time_offset < 0.015) {
                this._ended();
                this.clear();

                if (this.loop && was_playing) {
                    this.loop--;
                    this.play();
                }
            }
        }

        _ended() {
            const config = {
                name: this.name,
                alias: this.alias,
                part: this.sprite_part,
                start: this.start,
                duration: this.end
            };

            if (typeof this.ended_callback === "function") {
                this.ended_callback.call(this.scope, config);
            }
        }

        clear() {
            this.time_played = 0;
            this.time_offset = 0;
            this.paused = false;
            this.playing = false;
        }

        setVolume(options) {
            this.volume = options.volume;

            if (this.gain) {
                this.gain.gain.value = this.volume;
            }
        }
    }

})(self);
