/* PlatformSound is an encapsulation for both the HTML5 audio support within
 * webOS and WebWorks, and an extension of some of the abilities of the stock
 * Enyo 1.0 Sound kind.
 */
enyo.kind({
    name: "PlatformSound",
    kind: "Sound",
    position: -1,
    /* Play our sound. If our sound is already playing, restart it */
    published: {
        audioClass: "",
    },
	audioClassChanged: function() {
		if (this.audio) {
			if (this.audioClass) {
				this.audio.setAttribute("x-palm-media-audio-class", this.audioClass);
			}
			else {
				this.audio.removeAttribute("x-palm-media-audio-class");
			}
		}
	},     
    play: function() {
        if(!Platform.useHTMLAudio()) {
            if(window.PhoneGap)
                this.media.play();
        } else {
            if (!this.audio.paused) {
                this.audio.currentTime = 0;
            } else {
                this.audio.play();
            }
        }
        this.Paused = false;
        if(!Platform.useHTMLAudio())
        {
            /* The PhoneGap media API does not document it's "MediaProgress"
             * callback, nor does it seem to be supported universally, at least
             * with PhoneGap 1.4.1, so, i'm going to just run a timer to the
             * getCurrentPosition() asynch method, and record it regularly.
             */
            this.Timer = setInterval(enyo.bind(this, this.getMediaPos), 100);
        }
    },
    /* Override the function from the base Enyo 1.0 kind, to add support for
     * the PhoneGap Media callbacks that they provide now
     */
    srcChanged: function() {
        var path = enyo.path.rewrite(this.src);
        if(!Platform.useHTMLAudio()) {
            if(window.PhoneGap)
                this.media = new Media(path, this.MediaSuccess, this.mediaFail, this.mediaStatus, this.mediaProgress);
            else
                enyo.log("*** Don't know how to play media without HTML5 or PhoneGap!", Platform.platform);
        } else {
            this.audio = new Audio();
            this.audio.src = path;
            /* We need to reset the preloadChanged and audioClassChanged attributes
             * as they are only propagated to the underlying audio tag at creation
             * in the original Enyo code
             */
            this.preloadChanged();
            this.audioClassChanged();
        }
    },
    /* Internal callback functions */
    getMediaPos: function(x, y, z) {
        this.media.getCurrentPosition(enyo.bind(this, this.posReceived));
    },
    posReceived: function(x, y, z) {
        this.position = x;
    },
    mediaSuccess: function(x, y, z) {
        enyo.log("mediaSuccess "+ x+ y+ z);
    },
    mediaFail: function(x, y, z) {
        enyo.log("mediaFail "+ x+ y+ z);
    },
    mediaStatus: function(x, y, z) {
        /* Possible Media States, taken from PhoneGap 1.4.1 Android source:
         *  Media.MEDIA_NONE = 0;
         *  Media.MEDIA_STARTING = 1;
         *  Media.MEDIA_RUNNING = 2;
         *  Media.MEDIA_PAUSED = 3;
         *  Media.MEDIA_STOPPED = 4;
         * not really sure what to make of them, so I just note Paused for now.
         */
        if(x == Media.MEDIA_Paused)
            this.Paused = true;
        else
            this.Paused = false;
        enyo.log("mediaStatus"+ x+ y+ z);
    },
    mediaProgress: function(x, y, z) {
        /* This callback specified in the Media constructor doesn't seem to
         * work on Android at the moment?  If you see it working somewhere, you
         * could kill the setInterval in Play on that platform, and record the
         * progress here instead.
         */
        enyo.log("mediaProgress "+ x+ y+ z);
    },
    /* Return the current position of audio playback, HTML5 and PhoneGap both
     * seem to like it as a float down to millisecond resolution
     */
    getCurrentPosition: function() {
        /* I wasn't able to get PhoneGap's media._position to give me a valid
         * location reliably, so we record it from the callback
         */
        return Platform.useHTMLAudio() ? this.audio.currentTime : this.position; /* PhoneGap's media._position doesn't seem to load? */
    },
    /* Returns the duration of the loaded media */
    getDuration: function() {
        return !Platform.useHTMLAudio() ? this.media.getDuration() : this.audio.duration;
    },
    /* Pause playback - calling play should resume */
    pause: function() {
        this.Paused = true;
        clearInterval(this.Timer);
        !Platform.useHTMLAudio() ? this.media.pause() : this.audio.pause();
    },
    /* Forces PhoneGap to release media handles in the OS, they recommend that
     * you call this whenever you stop playback on Android.  Also destroys
     * the component, so you can create a new one when you need more playback.
     */
    release: function() {
        this.pause();
        if(!Platform.useHTMLAudio()) {
            this.media.release();
        }
        this.destroy();
    },
    /* Reposition the media playback from the given location.  HTML5 apparently
     * uses a float with seconds, whereas PhoneGap is looking for an int in
     * milliseconds
     */
    seekTo: function(loc) {
        if(!Platform.useHTMLAudio() ) {
            this.media.seekTo(loc * 1000);
        } else {
            this.audio.currentTime = loc;
        }
    },
    /* Stop playback.  Do not destroy anything.  Next call to play will restart
     * playback from the beginning.
     */
    stop: function() {
        clearInterval(this.Timer);
        if(!Platform.useHTMLAudio() ) {
            this.media.stop();
        } else {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
    }
});