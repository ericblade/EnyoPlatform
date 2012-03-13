/* Enyo Platform encapsulation. Include this FIRST in your depends.js.  The
 * first call you make to a function inside it will cause it to perform it's
 * detection (in the setup function).  If you are running in PhoneGap, and your
 * app depends on accurate results in here, make sure that you are not running
 * any code that depends on this module until after the "deviceready" PhoneGap
 * event is fired.
 *
 * This prefers direct access to APIs whenever possible - although you CAN run
 * webOS and WebWorks apps with PhoneGap, I'm trying to avoid going through any
 * extra layers here.
 *
 * If you are deploying to iOS, set a new parameter in your appinfo.json called
 * iTunesAppId to your application id as found in the Apple Dev Portal, for the
 * getReviewURL function
 *
 * PhoneGap iOS can have "OpenAllWhitelistURLsInWebView" set True in 
 * PhoneGap.plist to cause a browser window.open() to open in new windows.
 * 
 * If you are deploying to BlackBerry's App World, set a new parameter in your 
 * appinfo.json called "appWorldId" to your application's id as found in the 
 * App World Dev Portal, for the getReviewURL function.
 *
 * To make your browser work in BlackBerry, you'll need to add to config.xml:
 *   <feature id="blackberry.invoke"/>
 *   <feature id="blackberry.invoke.BrowserArguments"/>
 *
 */
enyo.kind({
    name: "Platform",
    kind: "Component",
    statics: {
        setup: function()
        {
            enyo.log("********* Setting up Platform Variables *************");
            enyo.log("window.PalmSystem "+ window.PalmSystem);
            enyo.log("window.blackberry "+ window.blackberry);
            enyo.log("window.PhoneGap "+ window.PhoneGap);
            enyo.log("window.device "+ window.device);
            if(window.device)
                enyo.log("window.device.platform "+ window.device.platform);
            enyo.log("window.chrome "+ window.chrome);
            
            /* If you include PhoneGap, but you don't wait until the device var
             * is initialized before calling this, we're going to ignore this
             * until the device var is available
             */
            if(window.PhoneGap && !window.device) {
                enyo.log("EnyoPlatform: PhoneGap detected, device not (yet) available. Bailing until next call.");
                return;
            }
            /* Check for systems where we don't have PhoneGap in our
             * requirements first, currently webOS and BlackBerry WebWorks
             * Even if you use PhoneGap on BlackBerry, according to the PhoneGap
             * documentation, it's platform determination code doesn't work
             * properly for at least some models.
             */
            if(typeof window.PalmSystem !== "undefined")
            {
                var deviceInfo = enyo.fetchDeviceInfo();
                this.platform = "webos";
                this.platformVersion = deviceInfo ? parseFloat(deviceInfo.platformVersion) : "unknown";
            }
            else if(typeof blackberry !== "undefined")
            {
                if(typeof PhoneGap !== "undefined")
                {
                    this.platform = "blackberry";
                }
                else
                {
                    this.platform = "webworks";
                }
                /* According to the BlackBerry docs,  to get the version number,
                 * we have to actually make an AJAX request to
                 * http://localhost:8472/blackberry/system/get . Screw that.
                 */
                this.platformVersion = "unknown";
            }
            else if(typeof PhoneGap !== "undefined")
            {
                /* See the PhoneGap Device API documentation for possible
                 * pitfalls.
                 */
                this.platform = device.platform.toLowerCase();
                this.platformVersion = parseFloat(device.version);
            }
            else
            {
                /* Someone with more time on their hands might be interested in
                 * breaking this out to determine various web browsers and their
                 * respective versions.  Not for me at this time.
                 */
                this.platform = "web";
                this.platformVersion = "unknown";
            }
            enyo.log("Platform detected: " + this.platform + " version " + this.platformVersion);
            enyo.log(" ************************************** ");
        },
        /* Should you find yourself in need of the raw platform name */
        getPlatformName: function() { this.platform || this.setup(); return this.platform; },
        
        /* Platform boolean functions -- return truthy if specific platform */        
        isWebOS: function() { this.platform || this.setup(); return this.platform == "webos"; },
        isAndroid: function() { this.platform || this.setup(); return this.platform == "android"; },
        isBlackBerry: function() { this.platform || this.setup(); return this.platform == "blackberry" || this.platform == "webworks" },
        isWebWorks: function() { this.platform || this.setup(); return this.platform == "webworks"; },
        isiOS: function() { this.platform || this.setup(); return this.platform == "iphone"; },
        isMobile: function() { this.platform || this.setup(); return this.platform != "web"; },
        hasFlash: function() {
            this.platform || this.setup();
            return (this.platform == "webos" && this.platformVersion >= 2) ||
                    (this.isBlackBerry()) || // TODO: Version check?
                    (this.platform == "android");
        },
        
        /* General screen size functions -- tablet vs phone, landscape vs portrait */
        isLargeScreen: function() { return window.innerWidth > 480; },
        isWideScreen: function() { return window.innerWidth > window.innerHeight; },
        
        /* Platform-supplied UI concerns */
        hasBack: function()
        {
            this.platform || this.setup(); 
            return this.platform == "android" || (this.platform == "webos" && this.platformVersion < 3);
        },
        hasMenu: function()
        {
            /* You may want to include Android here if you're using a target
             * API of less than 14 (Ice Cream Sandwich)
             */
            /* Blackberry Tablet OS has a standard "swipe down from top bezel" gesture
             * that they use .. should probably consider that here, but I'm not sure
             * if their other platforms have any equivalent
             */
            this.platform || this.setup(); 
            return this.platform == "webos" || (this.platform == "android" && this.platformVersion < 4); 
        },
        
        /* Platform-specific Audio utility. WebWorks on PlayBook and webOS have
         * great support for HTML5 audio objects. Android's is terrible, so we
         * choose to use the PhoneGap media API there, which is encapsulated in
         * the PlatformSound kind
         */
        useHTMLAudio: function()
        {
            this.platform || this.setup(); 
            return this.isWebOS() || this.isWebWorks() || !this.isMobile();
        },
        /* Platform Specific Web Browser -- returns a function that should
         * launch the OS's web browser.  
         * call: Platform.browser("http://www.google.com/", this)();
         */
        browser: function(url, thisObj)
        {
            this.platform || this.setup(); 
            if(this.isWebOS())
            {
                return enyo.bind(thisObj, (function(args) {
                    var x = thisObj.createComponent({ name: "AppManService", kind: "PalmService", service: "palm://com.palm.applicationManager/", method: "open" });
                    x.call({ target: url });
                }));
            }
            else if(this.platform == "web" || (this.platform == "android" && parseFloat(this.platformVersion >= 4.0)) )
            {
                /* If web, just open a new tab/window - this also works well in
                 * Android 4.0 - suggest ChildBrowser PhoneGap plugin for other
                 * versions of Android
                 */
                return enyo.bind(thisObj, function(x) { window.open(x, '_blank'); }, url);
            }
            else if(this.isBlackBerry())
            {
                /* If BlackBerry, go through their ridiculous parsing rules */
                /* Make sure you have the invoke and invoke.BrowserArguments
                 * configured in your config.xml.
                 */
                var args = new blackberry.invoke.BrowserArguments(this.blackBerryURLEncode(url));
                return enyo.bind(thisObj, blackberry.invoke.invoke, blackberry.invoke.APP_BROWSER, args);
            }
            else if(typeof PhoneGap !== "undefined" && window.plugins && window.plugins.childBrowser)
            {
                /* If you have the popular childBrowser plugin for PhoneGap */
				/* If you're using iOS, make sure you've called the childBrowser.init first somewhere!! */
                return enyo.bind(thisObj, window.plugins.childBrowser.openExternal, url);
            }
            else if(this.platform == "android" && navigator.app && navigator.app.loadUrl)
            {
                /* If Android < 4.0 and PhoneGap ChildBrowser plugin is not available, then
                 * Assume PhoneGap is loaded, otherwise we wouldn't know it's Android, right */
                return enyo.bind(thisObj, function(x) { navigator.app.loadUrl({ openexternal:true }) }, url);
            }
            else
            {
                /* Fall back to something that could possibly work
                 * One could also make a case for just setting window.location
                 */
                return enyo.bind(thisObj, function(x) { window.open(x, '_blank'); }, url);
            }
        },
        /* A ridiculous function for parsing URLs into something that RIM's
         * BrowserArguments call can deal with "properly", thanks to their
         * forums.
         */
        blackBerryURLEncode: function(address) {
            var encodedAddress = "";
            // URL Encode all instances of ':' in the address
            encodedAddress = address.replace(/:/g, "%3A");
            // Leave the first instance of ':' in its normal form
            encodedAddress = encodedAddress.replace(/%3A/, ":");
            // Escape all instances of '&' in the address
            encodedAddress = encodedAddress.replace(/&/g, "\&");

            if (typeof blackberry !== 'undefined') {
                var args = new blackberry.invoke.BrowserArguments(encodedAddress);
                blackberry.invoke.invoke(blackberry.invoke.APP_BROWSER, args);
            } else {
                // If I am not a BlackBerry device, open link in current browser
                window.location = encodedAddress; 
            }            
        },
        getReviewURL: function()
        {
            var appInfo;
            var url = "";
            
            appInfo = enyo.fetchAppInfo();
            if(enyo.isString(appInfo))
                appInfo = JSON.parse(appInfo);
                
            this.platform || this.setup(); 
            switch(Platform.platform) {
                case "webos":
                    url = "http://developer.palm.com/appredirect/?packageid=" + appInfo.id;
                    break;
                case "android":
                    /* enyo.fetchAppId() appears unreliable here? */
                    url = "market://details?id=" + appInfo.id;
                    break;
                case "blackberry":  // intentional fallthrough
                case "webworks":
                    url = "http://appworld.blackberry.com/webstore/content/" + appInfo.appWorldId;
                    break;
                case "iphone":
                    url = "itms-apps://ax.itunes.apple.com/WebObjects/MZStore.woa/wa/viewContentsUserReviews?type=Purple+Software&id="+appInfo.iTunesAppId;
                    break;
            }
            return url;
        }
    }
});