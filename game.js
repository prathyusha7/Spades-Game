/********************************************************************************************
 This code is copyright (C) RauÃ°Ã¡s HugbÃºnaÃ°ur ehf. (Red Ace Software LLC)

 This code is NOT open source, and it is NOT permitted to use it on other sites, modify it
 or otherwise use it for other purposes than playing on https://cardgames.io/spades/

 I've had to deal with multiple people stealing my work and I'm sick of it. 
 Don't be a dick, write your own game!
********************************************************************************************/
function log(msg) {
    if (typeof console != 'undefined' && console.log && log.enabled) {
        console.log(msg);
    }
}
log.enabled = document.location.hostname == 'dev.cardgames.io';
if (typeof console == 'undefined') {
    window.console = {
        log: function(msg) {}
    };
}

function cake(name, value, expiresInDays, path) {
    if (typeof value != 'undefined') {
        var c = name + '=' + encodeURIComponent(value);
        if (expiresInDays) {
            var date = new Date();
            date.setTime(date.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
            c += '; expires=' + date.toUTCString();
        }
        if (path) {
            c += '; path=' + path;
        }
        document.cookie = c;
    } else {
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var c = cookies[i].replace(/^\s*|\s*$/g, '');
                if (c.substring(0, name.length + 1) == (name + '=')) {
                    return decodeURIComponent(c.substring(name.length + 1));
                }
            }
        }
        return null;
    }
}

function deleteCake(name) {
    var deletedCookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = deletedCookie;
    document.cookie = deletedCookie + ' path=/';
}

function trackEvent(action, label, value) {
    var values = ['_trackEvent', category, action];
    if (label) {
        values.push(label);
    }
    if (typeof value != 'undefined') {
        values.push(value);
    }
    if (action == 'FinishGame') {
        window.finished = true;
    }
    log(values.join(' - '));
    if (typeof window.ga != "undefined") {
        ga('send', 'event', category, action, label, value);
    }
}
var preloadedImages = {};
var preloadImage = function(url) {
    if (preloadedImages[url]) {
        return;
    }
    var i = new Image();
    i.src = url;
    preloadedImages[url] = i;
}

function Settings(prefix, defaults) {
    this.meta = {
        prefix: prefix,
        defaults: defaults
    };
    prefix += '.';
    var me = this;

    function parseCookies() {
        if (!document.cookie) {
            return {};
        }
        var values = {};
        var clean = function(s) {
            return decodeURIComponent(s).replace(/^\s*|\s*$/g, '');
        }
        var parts = document.cookie.split(';');
        for (var i = 0; i < parts.length; i++) {
            var cparts = parts[i].split('=');
            values[clean(cparts[0])] = clean(cparts[1]);
        }
        return values;
    }
    this.meta.cookies = parseCookies();

    function readValues(obj) {
        for (var k in obj) {
            if (k.substr(0, prefix.length) == prefix) {
                var val = obj[k];
                var unprefixedKey = k.substr(prefix.length);
                var defaultVal = defaults[unprefixedKey];
                if (typeof defaultVal == 'undefined') {
                    continue;
                }
                if (typeof defaultVal.defaultValue !== 'undefined') {
                    defaultVal = defaultVal.defaultValue;
                }
                if (typeof defaultVal == 'number') {
                    me[unprefixedKey] = parseFloat(val);
                } else if (typeof defaultVal == 'boolean') {
                    if (val == 'true') {
                        me[unprefixedKey] = true;
                    } else if (val == 'false') {
                        me[unprefixedKey] = false;
                    } else {
                        continue;
                    }
                } else {
                    me[unprefixedKey] = val;
                }
            }
        }
    }
    try {
        if (window.localStorage) {
            readValues(localStorage);
        }
    } catch (ex) {}
    readValues(this.meta.cookies);
    for (var k in defaults) {
        if (typeof this[k] == 'undefined') {
            if (defaults[k] && typeof defaults[k].defaultValue !== 'undefined') {
                this[k] = defaults[k].defaultValue;
            } else {
                this[k] = defaults[k];
            }
        }
    }
}
Settings.prototype.set = function(key, value) {
    if (typeof this[key] == 'undefined' || typeof this[key] == 'function') {
        throw 'Invalid key: ' + key;
    }
    if (typeof value != typeof this[key]) {
        throw 'Unexpected type for ' + key + ', expected ' + typeof this[key] + ', got ' + typeof value;
    }
    this[key] = value;
    var defaultVal, allowedValues, minValue, maxValue;
    if (typeof this.meta.defaults[key].defaultValue !== 'undefined') {
        var options = this.meta.defaults[key];
        defaultVal = options.defaultValue;
        allowedValues = options.allowedValues;
        minValue = options.minValue;
        maxValue = options.maxValue;
    } else {
        defaultVal = this.meta.defaults[key];
    }
    var fullKey = this.meta.prefix + '.' + key;
    if (value == defaultVal) {
        if (this.meta.cookies[fullKey]) {
            document.cookie = escape(fullKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
        try {
            localStorage.removeItem(fullKey);
        } catch (ex) {}
    } else {
        if (allowedValues) {
            var found = false;
            for (var i = 0; i < allowedValues.length; i++) {
                if (value == allowedValues[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw 'Bad value for ' + key + ': ' + value + '. Allowed values are: ' + allowedValues;
            }
        }
        try {
            localStorage.setItem(fullKey, value);
        } catch (ex) {
            document.cookie = escape(fullKey) + "=" + escape(value) + "; expires=Tue, 19 Jan 2030 03:14:07 GMT; path=/";
        }
    }
};
if (window.slug && window.defaultSettings) {
    var settings = new Settings(slug, defaultSettings);
}
var siteSettings = new Settings('site', window.defaultSiteSettings || {});
(function() {
    window.qs = {};
    var querystring = document.location.search.replace(/\?/, '');
    if (!querystring) {
        return;
    }

    function getCorrectCaseForKey(settingObj, key) {
        for (var settingKey in settingObj) {
            if (settingKey.toLowerCase() == key.toLowerCase()) {
                return settingKey;
            }
        }
        return key;
    }

    function overrideSetting(settingObj, key, value) {
        var existingValue = settingObj[key];
        if (typeof existingValue === 'undefined') {
            return;
        }
        if (typeof existingValue == 'boolean' && typeof value == 'number') {
            settingObj[key] = !!value;
            return;
        }
        if (typeof existingValue != typeof value) {
            throw 'Incompatible types for ' + key + ': ' + typeof existingValue + ' and ' + typeof value;
        }
        settingObj[key] = value;
    }

    function correctTypeForValue(value) {
        if (typeof value == 'undefined') {
            return true;
        } else if (value.match(/^\d+$/)) {
            return parseInt(value);
        } else if (value == 'true') {
            return true;
        } else if (value == 'false') {
            return false;
        } else if (value.match(/,/)) {
            value = value.replace(/,$/, '');
            var arr = value.split(',');
            for (var i = 0; i < arr.length; i++) {
                arr[i] = correctTypeForValue(arr[i]);
            }
            return arr;
        }
        return value;
    }
    var parts = querystring.split('&');
    for (var i = 0; i < parts.length; i++) {
        var keyValue = parts[i].split('=');
        var k = keyValue[0],
            v = keyValue[1];
        k = getCorrectCaseForKey(window.settings || {}, k);
        k = getCorrectCaseForKey(siteSettings, k);
        v = correctTypeForValue(v);
        qs[k] = v;
        overrideSetting(window.settings || {}, k, v);
        overrideSetting(siteSettings, k, v);
    }
})();
var supportsSvg = false;
try {
    supportsSvg = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#Image', '1.1');
} catch (ex) {}
var features = {
    svg: supportsSvg && (siteSettings.svg == 'always' || (window.devicePixelRatio > 1 && siteSettings.svg == 'onlyOnRetinaScreens') || qs.svg),
    localSvgCards: supportsSvg && siteSettings.localSvgCards,
    svgPreRenderPng: siteSettings.svgPreRenderPng
};
if (!features.svg) {
    $('body').removeClass('svg');
}
if (!supportsSvg) {
    $('body').addClass('no-svg-support');
}
var browser = {
    canSetCookies: function() {
        var testKey = 'test',
            testValue = 'value';
        cake(testKey, testValue, 2, '/');
        if (cake(testKey) != testValue) {
            return false;
        }
        deleteCake(testKey);
        return true;
    }
};
(function() {
    function unixTimestamp(date) {
        return Math.floor((date || new Date()).getTime() / 1000);
    }
    var COOKIE_NAME = 'cardio';

    function parseCookie() {
        var value = cake(COOKIE_NAME);
        if (value && value.match(/\./)) {
            deleteCake(COOKIE_NAME);
            value = null;
        }
        if (value == null) {
            return {
                id: null,
                lastServerTimestamp: 0,
                midnight: null,
                lastActive: null
            };
        } else {
            var parts = value.split('_');
            return {
                id: parts[0],
                lastServerTimestamp: parseInt(parts[1]),
                midnight: parseInt(parts[2]),
                lastActive: parseInt(parts[3])
            };
        }
    }

    function setCookie(id, lastServerTimestamp, midnight, lastActive) {
        var value = id + '_' + lastServerTimestamp + '_' + midnight + '_' + lastActive;
        cake(COOKIE_NAME, value, 2048, '/');
    }

    function log() {
        if (!browser.canSetCookies()) {
            return;
        }
        var currentTimestamp = unixTimestamp();
        var cardio = parseCookie();
        if (cardio.id == null || (currentTimestamp - cardio.lastActive) > (30 * 60) || currentTimestamp > cardio.midnight) {
            var userAgent = (navigator.userAgent || '').replace(/"/g, '\\"');
            var data = '{ "id" : ' + (cardio.id ? '"' + cardio.id + '"' : null) + ', "lastServerTimestamp" : ' + cardio.lastServerTimestamp + ', "clientTime" : ' + currentTimestamp + ', "path" : "' + location.pathname + '", "userAgent" : "' + userAgent + '" }';
            $.ajax({
                type: "POST",
                url: '/api/visits',
                data: data,
                contentType: 'application/json',
                success: function(data) {
                    setCookie(data.id, data.serverTime, unixTimestamp() + data.secondsUntilMidnight, unixTimestamp());
                }
            });
        } else {
            setActive();
        }
    }

    function setActive() {
        var cardio = parseCookie();
        if (cardio.id == null) {
            throw 'ERROR: Unexpected cookie value';
        }
        setCookie(cardio.id, cardio.lastServerTimestamp, cardio.midnight, unixTimestamp());
    }
    var idleFor = 0;
    var reset = function() {};
    $(window).bind('mousemove mousedown touchstart', function(e) {
        idleFor = 0;
    })
    var visitLogged = false;
    var lastActiveTimestamp = 0;
    var updateInterval = 5000;
    var intervalId = setInterval(function() {
        if (!window.started) {
            return;
        }
        try {
            if (!visitLogged) {
                visitLogged = true;
                log();
            } else {
                var setActiveInterval = 30000;
                var now = new Date().getTime();
                var timeSinceLast = now - lastActiveTimestamp;
                if (idleFor < timeSinceLast && timeSinceLast > setActiveInterval) {
                    lastActiveTimestamp = now;
                    setActive();
                }
            }
        } catch (e) {
            clearInterval(intervalId);
            trackEvent('VisitLogError', e + '');
        }
        idleFor += updateInterval;
    }, updateInterval);
})();
window.img = {
    'bottom-player': 0,
    'left-player': 1,
    'top-player': 2,
    'right-player': 3
};

function clearHash() {
    try {
        var loc = document.location;
        if (window.history && window.history.replaceState) {
            history.replaceState("", document.title, loc.pathname + loc.search)
        } else {
            document.location.hash = '';
        }
    } catch (e) {}
}
var errorMatch = document.location.hash.match(/#logerrors=(\w+)/);
if (errorMatch) {
    clearHash();
    cake('logerrors', errorMatch[1], 1, '/');
}

function logError(errorMsg, url, line, column, err) {
    try {
        var isAdScriptErrors = errorMsg.indexOf('adsbygoogle.push() error: No slot size for availableWidth=0') != -1 || errorMsg.match(/^Script error\.?$/);
        if (!isAdScriptErrors) {
            trackEvent('Error', errorMsg, line || 0);
        }
        var msg = '';
        if (url) {
            msg += url;
        }
        if (line && column) {
            msg += '(' + line + ',' + column + ') ';
        }
        msg += errorMsg;
        if (err && err.stack) {
            msg += '\r\n\r\n' + err.stack;
        }
        log(msg);
        var name = cake('logerrors');
        if (!name) {
            return;
        }
        var slug = location.pathname.split('/')[1] || '';
        var postData = JSON.stringify({
            errorMessage: msg,
            url: location.href,
            userAgent: navigator.userAgent,
            slug: slug,
            name: name
        }, null, 4);
        log('Sending error to server:\n ' + postData);
        $.ajax({
            type: "POST",
            url: '/api/errors',
            data: postData,
            contentType: 'application/json'
        });
    } catch (e) {
        log('Error in error handling: ' + e);
    }
}
window.onerror = logError;
$(function() {
    if (cake('moderncheck') != '1') {
        trackEvent('ModernBrowser', isModernBrowser());
        cake('moderncheck', '1', 30, '/');
    }
    var savedImage = parseInt(cake('player-image'));
    if (savedImage && savedImage > 3 && savedImage <= 13) {
        siteSettings.set('playerImage', savedImage);
        deleteCake('player-image');
    }
    img['bottom-player'] = siteSettings.playerImage;
    var hasAccepted = siteSettings.acceptCookies;
    if (hasAccepted) {
        return;
    }

    function showCookieBanner() {
        $('#cookie-banner').slideDown();
        $("[href='#accept-cookies']").on('click', function(e) {
            siteSettings.set('acceptCookies', true);
            e.preventDefault();
            $('#cookie-banner').slideUp();
            trackEvent('AcceptCookies');
        });
        $("#cookie-banner a[href='/privacy/']").on('click', function(e) {
            trackEvent('LearnMoreAboutCookies');
        });
    }
    $.getJSON('/api/country').done(function(result) {
        if (result.country == 'US' || result.country == 'CA' || result.country == 'AU') {
            siteSettings.set('acceptCookies', true);
            trackEvent('AutoAcceptCookies', result.country);
        } else {
            showCookieBanner();
        }
    }).fail(showCookieBanner);
});

function isModernBrowser() {
    try {
        var isModern = true;
        var supported = '';
        var div = document.createElement('div');
        var results = [];
        results.push('0');
        var prefixes = 'transition WebkitTransition MozTransition OTransition msTransition'.split(' ');
        for (var i = 0; i < prefixes.length; i++) {
            if (div && div.style[prefixes[i]] !== undefined) {
                results[results.length - 1] = '1';
            }
        }
        results.push('0');
        var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
        var div = document.createElement('div');
        for (var i = 0; i < prefixes.length; i++) {
            if (div && div.style[prefixes[i]] !== undefined) {
                results[results.length - 1] = '1';
            }
        }
        var svg = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#Image', '1.1');
        results.push(svg ? '1' : '0');
        try {
            localStorage.setItem('foo', '1');
            var x = localStorage.getItem('foo');
            results.push('1');
        } catch (e) {
            results.push('0');
        }
        return results.join('');
    } catch (e) {
        log(e)
        return 'ERROR';
    }
}
$A = function $A(arr) {
    return {
        arr: arr,
        each: function(func) {
            for (var i = 0; i < this.arr.length; i++) {
                func.call(this.arr, this.arr[i]);
            }
        },
        any: function(func) {
            for (var i = 0; i < this.arr.length; i++) {
                if (func.call(this.arr, this.arr[i])) {
                    return true;
                }
            }
            return false;
        },
        max: function(func) {
            var max = null;
            for (var i = 0; i < this.arr.length; i++) {
                var val = func.call(this.arr, this.arr[i])
                if (max === null) {
                    max = val;
                } else if (val >= max) {
                    max = val;
                }
            }
            return max;
        },
        shuffle: function() {
            var i = this.arr.length;
            if (i == 0) return;
            while (--i) {
                var j = Math.floor(Math.random() * (i + 1));
                var tempi = this.arr[i];
                var tempj = this.arr[j];
                this.arr[i] = tempj;
                this.arr[j] = tempi;
            }
        },
        random: function() {
            return this.arr[Math.floor(Math.random() * this.arr.length)];
        },
        where: function(func) {
            var result = [];
            for (var i = 0; i < this.arr.length; i++) {
                var obj = this.arr[i];
                if (func(obj)) {
                    result.push(obj);
                }
            }
            return result;
        },
        find: function(func) {
            for (var i = 0; i < this.arr.length; i++) {
                var obj = this.arr[i];
                if (func(obj)) {
                    return obj;
                }
            }
            return null;
        },
        count: function(func) {
            var counter = 0;
            for (var i = 0; i < this.arr.length; i++) {
                if (func.call(this.arr, this.arr[i])) {
                    counter++;
                }
            }
            return counter;
        },
        all: function(func) {
            for (var i = 0; i < this.arr.length; i++) {
                if (!func.call(this.arr, this.arr[i])) {
                    return false;
                }
            }
            return true;
        },
        remove: function(item) {
            for (var i = 0; i < this.arr.length; i++) {
                if (this.arr[i] == item) {
                    this.arr.splice(i, 1);
                    return true;
                }
            }
            return false;
        },
        last: function() {
            if (!this.arr.length) {
                return null;
            }
            return this.arr[this.arr.length - 1];
        },
        indexOf: function(item) {
            for (var i = 0; i < this.arr.length; i++) {
                if (this.arr[i] == item) {
                    return i;
                }
            }
            return -1;
        },
        contains: function(item) {
            return this.indexOf(item) != -1;
        },
        map: function(f) {
            var result = [];
            for (var i = 0; i < this.arr.length; i++) {
                result.push(f(this.arr[i]));
            }
            return result;
        },
        clone: function() {
            return this.arr.slice(0, this.arr.length);
        }
    };
}

function parseUserAgent(agent) {
    agent = agent || navigator.userAgent;
    var result = {
        browser: 'Unknown',
        os: 'Unknown',
        version: 0
    };
    var systems = ['Windows', 'Macintosh', 'Android', 'Linux', 'iPhone', 'iPad'];
    var browsers = ['Opera', 'Chrome', 'Firefox', 'Mobile Safari', 'Safari', 'MSIE'];
    for (var i = 0; i < systems.length; i++) {
        var rx = new RegExp('\\b' + systems[i] + '\\b', 'i');
        if (rx.exec(agent)) {
            result.os = systems[i];
            break;
        }
    }
    for (var i = 0; i < browsers.length; i++) {
        var rx = new RegExp('\\b(' + browsers[i] + ')(?:/| )(\\d+)', 'i');
        var match = rx.exec(agent);
        if (match) {
            result.browser = browsers[i];
            if (result.browser == 'MSIE') {
                result.browser = 'Internet Explorer';
            }
            var versionMatch = (/\bVersion\/(\d+)\b/i).exec(agent);
            if (versionMatch) {
                result.version = parseInt(versionMatch[1]);
            } else {
                result.version = parseInt(match[2]);
            }
            break;
        }
    }
    return result;
}
try {
    setTimeout(function() {
        if (document.getElementsByTagName('iframe').length == 0) {
            var agent = parseUserAgent();
            if (typeof ga !== 'undefined') {
                ga('send', 'event', 'AdBlockInstalled', agent.browser, agent.os, agent.version);
            }
        }
    }, 10000);
} catch (e) {}
var HTML_CARD_SUITS = {
    h: '&hearts;',
    s: '&spades;',
    d: '&diams;',
    c: '&clubs;'
}
var fuckingAndroid = navigator.userAgent.match(/Android (4|5|6|7|8|9)/) && navigator.userAgent.match(/ SM-|samsung/g);
if (qs.android) {
    fuckingAndroid = true;
}
if (fuckingAndroid) {
    HTML_CARD_SUITS = {
        h: '&#x2661;',
        s: '&#x2664;',
        d: '&#x2662;',
        c: '&#x2667;'
    }
}
var SPEED = (function() {
    var speed = 1;

    function ms(milliseconds) {
        return milliseconds / speed;
    }

    function patchJQ(funcName, durationArgIndex) {
        var oldFunc = $.fn[funcName];
        $.fn[funcName] = function() {
            var args = Array.prototype.slice.call(arguments);
            var duration = args[durationArgIndex];
            if (typeof duration == 'number') {
                args[durationArgIndex] = ms(duration);
            } else if (duration && duration.duration) {
                duration.duration = ms(duration.duration);
            }
            return oldFunc.apply(this, args);
        };
    }
    var timingFunctionsPatched = false;

    function patchTimingFunctions() {
        patchJQ('animate', 1);
        patchJQ('fadeOut', 0);
        patchJQ('fadeIn', 0);
        var oldTimeout = window.setTimeout;
        var oldInterval = window.setInterval;
        window.setTimeout = function(func, delay) {
            return oldTimeout(func, ms(delay));
        }
        window.setInterval = function(func, delay) {
            return oldInterval(func, ms(delay));
        }
    }
    return {
        get: function() {
            return speed;
        },
        set: function(value) {
            speed = value;
            $.fx.speeds._default = ms(400);
            $.fx.speeds.fast = ms(200);
            $.fx.speeds.slow = ms(600);
            if (speed != 1 && !timingFunctionsPatched) {
                patchTimingFunctions();
            }
        },
        toString: function() {
            return "SPEED: " + speed;
        },
        ms: ms
    };
})();
if (window.settings && window.settings.speed && window.settings.speed != 'normal') {
    SPEED.set({
        verySlow: 0.5,
        slow: 0.8,
        fast: 1.5,
        veryFast: 2.2
    }[settings.speed]);
}

function message(text) {
    $('#messageBox p').html(text);
}

function reloadPage() {
    if (window.scrollY) {
        cake('scroll', scrollY);
    }
    document.location.href = document.location.href.replace(/#.*/, '');
}
if (cake('scroll')) {
    window.scroll(0, parseInt(cake('scroll')));
    deleteCake('scroll');
}

function setCustomVar(slot, name, value, scope) {
    if (typeof window._gaq != "undefined") {
        _gaq.push(['_setCustomVar', slot, name, value, scope]);
    }
}
if (document.referrer && document.referrer.length) {
    if (!document.referrer.match(/^https:\/\/cardgames\.io\//)) {
        trackEvent('Referral', document.referrer);
    }
}

function setupPlayerPicker() {
    var maxIndex = 13;
    var setImage = function() {
        $('#player-picker').removeClass().addClass('face-large face-' + img['bottom-player']);
    }
    $('#open-player-picker').click(function() {
        if (features.svg) {
            var faceCount = 14
            for (var i = 4; i < faceCount; i++) {
                if (i != img['bottom-player']) {
                    preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/svg/face-' + i + '.svg');
                }
            }
        }
        $('#messageBox').hide();
        $('#change-player').css('zIndex', 5000).show();
        setImage();
    });
    $('#next-image').click(function() {
        img['bottom-player'] = (img['bottom-player'] + 1);
        if (img['bottom-player'] > maxIndex) {
            img['bottom-player'] = 0;
        }
        if (img['bottom-player'] == 1 || img['bottom-player'] == 2 || img['bottom-player'] == 3) {
            img['bottom-player'] = 4;
        }
        setImage();
    });
    $('#prev-image').click(function() {
        img['bottom-player']--;
        if (img['bottom-player'] == -1) {
            img['bottom-player'] = maxIndex;
        }
        if (img['bottom-player'] == 1 || img['bottom-player'] == 2 || img['bottom-player'] == 3) {
            img['bottom-player'] = 0;
        }
        setImage();
    });
    $('#save-image').click(function() {
        $('#bottom-player .face-small').removeClass().addClass('face-small').addClass('face-' + img['bottom-player']);
        $('#change-player').hide();
        $('#bottom-player-win').removeClass().addClass('face-large face-' + img['bottom-player']);
        $('#messageBox').show();
        trackEvent('ChangePlayer', '' + img['bottom-player']);
        siteSettings.set('playerImage', img['bottom-player']);
        if (features.svg) {
            preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/svg/face-' + img['bottom-player'] + '-sad.svg');
        }
    });
}

function makePlayersSad(winnerIds) {
    var ids = ['top-player', 'bottom-player', 'left-player', 'right-player'];
    for (var i = 0; i < ids.length; i++) {
        if ($A(winnerIds).indexOf(ids[i]) == -1) {
            makePlayerSad(ids[i]);
        } else {
            makePlayerHappy(ids[i]);
        }
    }
}

function makePlayerSad(id) {
    $('#' + id + ' div').addClass('sad');
}

function makePlayerHappy(id) {
    $('#' + id + ' div').removeClass('sad');
}
__addCheat = (function() {
    var cheatCode = '';
    var cheats = {};
    var lastTime = 0;
    $(window).keypress(function(e) {
        var now = new Date().getTime();
        if (now - lastTime > 2000) {
            cheatCode = '';
        }
        lastTime = now;
        var newChar = String.fromCharCode(e.which);
        cheatCode += newChar;
        for (var code in cheats) {
            if (code == cheatCode) {
                cheats[code]();
                cheatCode = '';
                return;
            }
            if (code.substr(0, cheatCode.length) == cheatCode) {
                return;
            }
        }
        for (var code in cheats) {
            if (code.substr(0, 1) == newChar) {
                cheatCode = newChar;
                return;
            }
        }
        cheatCode = '';
    });
    return function(code, func) {
        cheats[code] = func;
    };
})();
$(function() {
    if (qs.autoplay) {
        if (typeof qs.autoplay == 'number') {
            SPEED.set(qs.autoplay);
        } else {
            SPEED.set(3);
        }
        if (window.HumanPlayer && window.ComputerPlayer) {
            HumanPlayer = ComputerPlayer;
        }
    }
    $('#facebook-promo a').click(function() {
        trackEvent('FacebookLinkClick');
    });
    $('#bottom-player .face-small').removeClass().addClass('face-small').addClass('face-' + img['bottom-player']);
    for (var key in img) {
        $('#' + key + '-win').removeClass().addClass('winner-img face-large face-' + img[key]);
    }
    if ($('#bottom-player').length > 0) {
        setTimeout(function() {
            if (features.svg) {
                for (var k in img) {
                    preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/svg/face-' + img[k] + '-sad.svg');
                }
            } else {
                preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/players-sad.png');
            }
        }, 5000);
    }
    setTimeout(function() {
        if (features.svg) {
            preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/svg/trophy.svg');
        } else {
            preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/trophy.png');
        }
    }, 9000);
    setupPlayerPicker();
    $('.avatar').click(function() {
        trackEvent('ClickPlayer', $(this).attr('id'));
    });
    $('#options-page button').click(function() {
        $('#options-page').hide();
    });
    $('a[href="#options"]').click(function(ev) {
        ev.preventDefault();
        $('#options-page').show();
    });
    $('a[href="#newgame"]').click(function(ev) {
        ev.preventDefault();
        if (!window.started) {
            trackEvent('NewGame', 'NotStarted');
            reloadPage();
        } else if (window.finished) {
            trackEvent('NewGame', 'Finished');
            reloadPage();
        } else if (confirm('You have a game in progress. Are you sure you want to start a new game and abandon the current game?')) {
            trackEvent('NewGame', 'Abandoned');
            if (cake('results')) {
                cake('results', '');
            }
            reloadPage();
        }
        ev.stopPropagation();
        ev.preventDefault();
        return false;
    });
    $('#version-info a').click(function(ev) {
        ev.preventDefault();
        location.hash = 'updatecheck=' + siteVersion;
        window.document.location.reload(true);
    });
    if (location.hash && location.hash.match(/updatecheck=(\d+)/)) {
        var oldVersion = parseInt(RegExp.$1);
        if (oldVersion == siteVersion) {
            alert('No update available, ' + oldVersion + ' is the latest version.');
        } else {
            alert('Update found! Game updated to version ' + siteVersion);
        }
        clearHash();
    }
    window.startTime = new Date().getTime();
    window.onbeforeunload = function() {
        var seconds = (new Date().getTime() - window.startTime) / 1000;
        trackEvent('LeavePage', window.finished ? 'Finished' : 'Abandoned', seconds);
    };
});
if (qs.debug) {
    var debugWindow = $('<textarea>', {
        id: 'debug-console'
    }).insertAfter($('#board'));
    log = function(msg) {
        var dc = $('#debug-console');
        dc.val(dc.val() + '\r\n' + msg);
        dc.scrollTop(dc[0].scrollHeight);
    };
    $('#debug-console').on('dblclick', function() {
        $(this).val('');
    });
}
(function() {
    var ls;
    try {
        ls = window.localStorage;
    } catch (e) {
        ls = null;
    }
    var gameStartTime = null;
    var gameFinishTime = null;

    function emptyStats() {
        return {
            version: 4,
            startTime: new Date().getTime(),
            gameCount: 0,
            abandonedGameCount: 0,
            finishedGameCount: 0,
            playersInGameCount: {},
            totalGameTime: 0,
            averageGameTime: null,
            maxGameTime: null,
            minGameTime: null,
            players: {}
        };
    }
    var key = (window.slug || 'unknown') + '.stats';

    function getStats() {
        var data = ls.getItem(key);
        if (data) {
            var result = JSON.parse(data);
            if (result && result.players && result.startTime) {
                return result;
            }
            ls.removeItem(key);
            try {
                logError('Stats for ' + key + ' was malformed, removed it. First 50 chars of the data were: ' + (data + '').substr(0, 50));
            } catch (e) {}
        }
        var s = emptyStats();
        putStats(s);
        return s;
    }

    function putStats(stats) {
        ls.setItem(key, JSON.stringify(stats));
    }

    function modify(func) {
        var s = getStats();
        func(s);
        putStats(s);
    }

    function emptyPlayer() {
        return {
            gameCount: 0,
            abandonedGameCount: 0,
            finishedGameCount: 0,
            winCount: 0,
            loseCount: 0,
            drawCount: 0,
            winPercentage: 0,
            totalScore: 0,
            maxScore: null,
            minScore: null,
            avgScore: 0,
            winningStreak: 0,
            losingStreak: 0,
            maxWinningStreak: 0,
            maxLosingStreak: 0,
            totalGameTime: 0,
            minWonGameTime: null,
            maxWonGameTime: null,
            avgWonGameTime: null,
            totalWonGameTime: 0,
            finishedTournamentCount: 0,
            winTournamentCount: 0,
            loseTournamentCount: 0,
            totalTournamentScore: 0,
            avgTournamentScore: 0,
            tournamentWinPercentage: 0,
            tournamentWinningStreak: 0,
            tournamentLosingStreak: 0,
            tournamentMaxWinningStreak: 0,
            tournamentMaxLosingStreak: 0
        };
    }
    window.stats = {
        get: getStats,
        enabled: true,
        clear: function() {
            if (!this.enabled) {
                return;
            }
            ls.removeItem(key);
        },
        emptyPlayer: emptyPlayer,
        minimumVersion: function(version) {
            if (!this.enabled) {
                return;
            }
            var s = this.get();
            if (s && s.version < version) {
                this.clear();
            }
        },
        startGame: function(players) {
            if (!this.enabled) {
                return;
            }
            gameStartTime = new Date().getTime();
            modify(function(s) {
                s.playersInGameCount[players.length] = (s.playersInGameCount[players.length] || 0) + 1;
                s.gameCount++;
                s.abandonedGameCount++;
                for (var i = 0; i < players.length; i++) {
                    var p = players[i];
                    if (!s.players[p.name]) {
                        s.players[p.name] = emptyPlayer();
                    }
                    var pstats = s.players[p.name];
                    pstats.gameCount++;
                    pstats.abandonedGameCount++;
                }
            });
        },
        finishGame: function(players, timeSpent, recordWonTimeCallback) {
            if (!this.enabled) {
                return;
            }
            var callbackData = [];
            modify(function(s) {
                if (!timeSpent) {
                    gameFinishTime = new Date().getTime();
                    timeSpent = gameFinishTime - gameStartTime;
                }
                s.finishedGameCount++;
                s.abandonedGameCount = Math.max(s.abandonedGameCount - 1, 0);
                s.totalGameTime += timeSpent;
                s.averageGameTime = s.totalGameTime / s.finishedGameCount;
                s.maxGameTime = s.maxGameTime === null ? timeSpent : Math.max(timeSpent, s.maxGameTime);
                s.minGameTime = s.minGameTime === null ? timeSpent : Math.min(timeSpent, s.minGameTime);
                for (var i = 0; i < players.length; i++) {
                    var p = players[i];
                    var pstats = s.players[p.name];
                    if (!pstats) {
                        s.players[p.name] = emptyPlayer();
                        pstats = s.players[p.name];
                        pstats.abandonedGameCount++;
                        pstats.gameCount++;
                    }
                    p.stats = p.stats || {};
                    p.stats.score |= 0;
                    pstats.abandonedGameCount = Math.max(pstats.abandonedGameCount - 1, 0);
                    pstats.finishedGameCount++;
                    pstats.totalScore += p.stats.score;
                    pstats.minScore = pstats.minScore === null ? p.stats.score : Math.min(pstats.minScore, p.stats.score);
                    pstats.maxScore = pstats.maxScore === null ? p.stats.score : Math.max(pstats.maxScore, p.stats.score);
                    pstats.avgScore = pstats.totalScore / pstats.finishedGameCount;
                    pstats.totalGameTime += timeSpent;
                    if (p.stats.result == 'win') {
                        pstats.winCount++;
                        pstats.winningStreak++;
                        pstats.losingStreak = 0;
                        pstats.maxWinningStreak = Math.max(pstats.maxWinningStreak, pstats.winningStreak);
                        if (pstats.minWonGameTime === null) {
                            pstats.minWonGameTime = timeSpent;
                        } else if (timeSpent < pstats.minWonGameTime) {
                            callbackData.push({
                                oldTime: pstats.minWonGameTime,
                                newTime: timeSpent,
                                name: p.name
                            });
                            pstats.minWonGameTime = timeSpent;
                        }
                        pstats.minWonGameTime = pstats.minWonGameTime === null ? timeSpent : Math.min(pstats.minWonGameTime, timeSpent);
                        pstats.maxWonGameTime = pstats.maxWonGameTime === null ? timeSpent : Math.max(pstats.maxWonGameTime, timeSpent);
                        pstats.totalWonGameTime += timeSpent;
                        pstats.avgWonGameTime = pstats.totalWonGameTime / pstats.winCount;
                    } else if (p.stats.result == 'lose') {
                        pstats.loseCount++;
                        pstats.winningStreak = 0;
                        pstats.losingStreak++;
                        pstats.maxLosingStreak = Math.max(pstats.maxLosingStreak, pstats.losingStreak);
                    } else if (p.stats.result == 'draw') {
                        pstats.drawCount++;
                        pstats.winningStreak = 0;
                        pstats.losingStreak = 0;
                    }
                    pstats.winPercentage = pstats.winCount / pstats.finishedGameCount;
                    if (p.stats.tournamentResult) {
                        pstats.finishedTournamentCount++;
                        pstats.totalTournamentScore += p.stats.tournamentScore;
                        pstats.avgTournamentScore = pstats.totalTournamentScore / pstats.finishedTournamentCount;
                        if (p.stats.tournamentResult == 'win') {
                            pstats.winTournamentCount++;
                            pstats.tournamentWinningStreak++;
                            pstats.tournamentLosingStreak = 0;
                            pstats.tournamentMaxWinningStreak = Math.max(pstats.tournamentMaxWinningStreak, pstats.tournamentWinningStreak);
                        } else if (p.stats.tournamentResult == 'lose') {
                            pstats.loseTournamentCount++;
                            pstats.tournamentLosingStreak++;
                            pstats.tournamentWinningStreak = 0;
                            pstats.tournamentMaxLosingStreak = Math.max(pstats.tournamentMaxLosingStreak, pstats.tournamentLosingStreak);
                        }
                        pstats.tournamentWinPercentage = pstats.winTournamentCount / pstats.finishedTournamentCount;
                    }
                    for (var k in p.stats) {
                        if (k.match(/^(score|result|tournamentResult|tournamentScore)$/)) {
                            continue;
                        }
                        var value = p.stats[k];
                        if (typeof value == 'number') {
                            if (k.match(/maximum/)) {
                                if (typeof pstats[k] == 'undefined' || value > pstats[k]) {
                                    pstats[k] = value;
                                }
                            } else if (k.match(/minimum/)) {
                                if (typeof pstats[k] == 'undefined' || value < pstats[k]) {
                                    pstats[k] = value;
                                }
                            } else {
                                pstats[k] |= 0;
                                pstats[k] += p.stats[k];
                            }
                        }
                    }
                }
            });
            if (recordWonTimeCallback)  {
                for (var i = 0; i < callbackData.length; i++) {
                    recordWonTimeCallback(callbackData[i]);
                }
            }
        },
        isGameActive: function() {
            return gameStartTime !== null && gameFinishTime === null;
        }
    };
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        JSON.parse('{"test":"test"}');
        JSON.stringify({
            "test": "test"
        });
        stats.supported = true;
        return true;
    } catch (e) {
        stats.supported = false;
    }
    if (!stats.supported) {
        for (var k in stats) {
            if (k != 'supported') {
                stats[k] = function() {};
            }
        }
    }
})();
if (!stats.supported) {
    $('.stats-link').hide();
}
var UNICODE_SUITS_TEXT = {
    h: '\u2665\uFE0E',
    s: '\u2660\uFE0E',
    d: '\u2666\uFE0E',
    c: '\u2663\uFE0E'
};
Card = function Card(suit, rank) {
    this.init(suit, rank);
}
Card.prototype = {
    playable: false,
    init: function(suit, rank) {
        this.shortName = suit + rank;
        this.suit = suit;
        this.rank = rank;
        if (suit == 'bj') {
            this.longName = 'black joker';
            this.shortName = 'BJ';
            return;
        } else if (suit == 'rj') {
            this.longName = 'red joker';
            this.shortName = 'RJ';
            return;
        }
        this.red = suit == 'h' || suit == 'd';
        this.black = suit == 's' || suit == 'c';
        var sorts = {
            "h": 'heart',
            "s": 'spade',
            "d": 'diamond',
            "c": 'club'
        };
        var specialCards = {
            11: 'jack',
            12: 'queen',
            13: 'king',
            1: 'ace',
            14: 'ace'
        }
        this.suitName = sorts[this.suit];
        if (specialCards[rank]) {
            this.longName = specialCards[rank] + ' of ' + sorts[suit] + 's';
            this[specialCards[rank]] = true;
        } else {
            this.longName = rank + ' of ' + sorts[suit] + 's';
        }
        this.shortName = this.suit.toUpperCase() + this.rank;
    },
    toString: function() {
        return this.shortName;
    },
    rankName: function() {
        var names = [null, null, 'a two', 'a three', 'a four', 'a five', 'a six', 'a seven', 'an eight', 'a nine', 'a ten', 'a jack', 'a queen', 'a king', 'an ace'];
        return names[this.rank];
    },
    shortRankName: function() {
        var names = [null, null, 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
        return names[this.rank];
    },
    symbol: function() {
        var ranks = {
            1: 'A',
            11: 'J',
            12: 'Q',
            13: 'K',
            14: 'A'
        };
        return UNICODE_SUITS_TEXT[this.suit] + (ranks[this.rank] || this.rank);
    },
    override: function(obj) {
        for (var x in obj) {
            this[x] = obj[x];
        }
    }
};
cson = function cson(o) {
    if (typeof JSON == 'undefined') {
        return 'JSON Not Available';
    }

    function _(o) {
        var str = Object.prototype.toString;
        if (typeof JSON == 'undefined') {
            return 'JSON Not Available';
        } else if (o == null || typeof o == 'undefined') {
            return o;
        } else if (o.name || o.shortName) {
            return o.name || o.shortName;
        } else if (str.call(o) == '[object Array]') {
            var clone = [];
            for (var i = 0; i < o.length; i++) {
                clone.push(_(o[i]));
            }
            return clone;
        } else if (str.call(o) == '[object Object]') {
            var clone = {};
            for (var k in o) {
                clone[k] = _(o[k]);
            }
            return clone;
        } else {
            return o;
        }
    }
    var jsonResult = JSON.stringify(_(o), null, 2);
    return jsonResult.replace(/\s*"([HSDC]\d\d?)"\s*(\]|,)/gm, '$1$2').replace(/"([HSDC]\d\d?)"/gm, '$1');
}
CardGame = function CardGame() {
    this.initDefaults();
}
CardGame.prototype = {
    cardCount: 8,
    enableRendering: true,
    defaultPlayerCount: 2,
    canChangePlayerCount: false,
    useBlackJoker: false,
    useRedJoker: false,
    acesHigh: true,
    mayAlwaysDraw: false,
    canSortDesc: true,
    makeRenderFunc: function(format) {
        return function(e) {
            with(e) {
                var msg = eval(format.replace(/@(\w+(\.\w+)*)/g, "'+$1+'").replace(/(.*)/, "'$1'"));
                log(msg);
            }
            setTimeout(e.callback, 0);
        };
    },
    initDefaults: function() {
        this.renderers = {};
        this.renderers['deckready'] = this.makeRenderFunc('deckready');
        this.renderers['dealcard'] = this.makeRenderFunc('dealcard - @card - @player.name - hand: @player.hand');
        this.renderers['selectcard'] = this.makeRenderFunc('selectcard - @card - @player.name');
        this.renderers['unselectcard'] = this.makeRenderFunc('unselectcard - @card - @player.name');;
        this.renderers['start'] = this.makeRenderFunc('start');
        this.renderers['playerturn'] = this.makeRenderFunc('playerturn - @player.name');
        this.renderers['play'] = this.makeRenderFunc('play - @player.name played @cards - hand: @player.hand');
        this.renderers['draw'] = this.makeRenderFunc('draw - @card - @player.name');
        this.renderers['pass'] = this.makeRenderFunc('pass - @player.name');
        this.renderers['win'] = this.makeRenderFunc('win - @player.name');
        this.renderers['sorthand'] = this.makeRenderFunc('sorthand - @player.name - @player.hand');
        this.renderers['pickdealer'] = this.makeRenderFunc('pickdealer - @player.name');
        this.players = [];
    },
    message: function(msg) {},
    renderEvent: function(name, callback, eventData) {
        if (!eventData) {
            eventData = {};
        }
        if (!eventData.player) {
            eventData.player = this.currentPlayer();
        }
        eventData.name = name;
        eventData.game = this;
        var game = this;
        eventData.callback = function() {
            callback.call(game);
        };
        if (this.enableRendering) {
            if (!this.renderers[name]) {
                throw 'No renderer for event: ' + name;
            }
            this.renderers[name](eventData);
        } else {
            eventData.callback();
        }
    },
    setEventRenderer: function(eventName, func) {
        this.renderers[eventName] = func;
    },
    getPlayableCards: function(player) {
        var playableCards = [];
        $A(player.hand).each(function(c) {
            if (c.playable) {
                playableCards.push(c);
            }
        });
        return playableCards;
    },
    players: null,
    deck: null,
    pile: null,
    currentPlayerIndex: 0,
    playCards: function(player, cards) {
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (!this.canPlayCard(player, card)) {
                throw 'Illegal card from ' + player.name + ', ' + card;
            }
            this.pile.push(card);
            card.selected = false;
            if (!player.remove(card)) {
                throw 'Card ' + card + ' is not held by player ' + player.name;
            }
        }
        player.selectedCards = [];
        player.canPlay = false;
        this.renderEvent('play', this.afterPlayCards, {
            cards: cards
        });
    },
    afterPlayCards: function() {
        this.nextPlayerTurn();
    },
    selectCard: function(player, card, callback) {
        if (!player.hasCard(card)) {
            throw "Player can't select a card he doesn't hold!";
        }
        if (card.selected) {
            throw 'Card is already selected!';
        }
        if (player.selectedCards === this.undefined) {
            player.selectedCards = [];
        }
        card.selected = true;
        player.selectedCards.push(card);
        this.renderEvent('selectcard', callback || function() {}, {
            card: card,
            player: player
        });
    },
    unselectCard: function(player, card, callback) {
        if (!player.hasCard(card)) {
            throw "Player can't unselect a card he doesn't hold!";
        }
        if (!card.selected) {
            throw 'Card is not selected!';
        }
        card.selected = false;
        $A(player.selectedCards).remove(card);
        this.renderEvent('unselectcard', callback || function() {}, {
            card: card,
            player: player
        });
    },
    sortHand: function(player, callback, dontRender) {
        if (!player.hand) {
            return;
        }
        var asc = function(a, b) {
            return a - b;
        };
        var desc = function(a, b) {
            return b - a;
        };
        var suits = {
            "h": 0,
            "s": 1,
            "d": 2,
            "c": 3
        };
        var handBefore = player.hand.toString();
        var diff = asc;

        function sortCards(c1, c2) {
            if (c1.suit == c2.suit) {
                return diff(c1.rank, c2.rank);
            }
            return diff(suits[c1.suit], suits[c2.suit]);
        }
        if (this.sortType == 'rank') {
            sortCards = function(c1, c2) {
                if (c1.rank == c2.rank) {
                    return diff(suits[c1.suit], suits[c2.suit]);
                }
                return diff(c1.rank, c2.rank);
            }
        }
        player.hand.sort(sortCards);
        if (player.hand.toString() == handBefore && this.canSortDesc) {
            diff = desc;
            player.hand.sort(sortCards);
        }
        if (!dontRender) {
            this.renderEvent('sorthand', callback || function() {}, {
                player: player
            });
        }
    },
    drawCard: function(player) {
        player.hand.push(this.deck.pop());
        player.handSorted = false;
        player.canPlay = false;
        this.renderEvent('draw', this.playerPlay, {
            card: $A(player.hand).last(),
            cardpos: player.hand.length - 1
        });
    },
    currentPlayerTurn: function() {
        this.beforePlayerTurn(this.currentPlayer());
        this.renderEvent('playerturn', this.playerPlay);
    },
    playerDraw: function(player) {
        player.draw();
    },
    playerPlay: function() {
        var p = this.currentPlayer();
        var playable = [];
        for (var i = 0; i < p.hand.length; i++) {
            var card = p.hand[i];
            card.playable = this.canPlayCard(p, card);
            if (card.playable) {
                playable.push(card);
            }
        }
        p.canPlay = true;
        p.hasPlayableCards = playable.length > 0;
        if (playable.length == 0) {
            if (this.mustSayPass(p)) {
                this.renderEvent('pass', this.nextPlayerTurn);
            } else if (this.mustDraw(p)) {
                this.playerDraw(p);
            } else {
                throw 'Game must implement mustSayPass or mustDraw correctly';
            }
        } else {
            this.currentPlayer().play(playable);
        }
    },
    nextPlayerTurn: function() {
        var player = this.currentPlayer();
        if (this.hasWon(player)) {
            this.message(player.name + ' wins!');
            this.renderEvent('win', function() {});
        } else {
            this.currentPlayerIndex = this.pickNextPlayerIndex();
            if (this.isNewRoundStarting()) {
                this.round++;
            }
            this.currentPlayerTurn();
        }
    },
    addPlayer: function(player) {
        player.game = this;
        player.pos = this.players.length;
        this.players.push(player);
    },
    getNextPlayer: function(player) {
        var pos = $A(this.players).indexOf(player);
        return this.players[this.nextIndex(pos)];
    },
    start: function() {
        this.pile = [];
        this.round = 0;
        this.newDeck();
    },
    pickDealer: function(playerIds) {
        if (this.lastDealerIndex >= 0) {
            this.dealerIndex = (this.lastDealerIndex + 1) % playerIds.length;
        } else {
            this.dealerIndex = Math.floor(Math.random() * playerIds.length);
        }
        this.nextPlayerToDealTo = (this.dealerIndex + 1) % playerIds.length;
        this.renderEvent('pickdealer', function() {}, {
            dealerId: playerIds[this.dealerIndex]
        });
    },
    afterDealing: function() {
        this.currentPlayerIndex = this.pickFirstPlayerIndex();
        this.renderEvent('start', this.currentPlayerTurn);
    },
    currentPlayer: function() {
        return this.players[this.currentPlayerIndex];
    },
    newDeck: function() {
        this.deck = [];
        var start = this.acesHigh ? 2 : 1;
        var end = start + 12;
        for (var i = start; i <= end; i++) {
            this.deck.push(new Card('h', i));
            this.deck.push(new Card('s', i));
            this.deck.push(new Card('d', i));
            this.deck.push(new Card('c', i));
        }
        if (this.useBlackJoker) {
            this.deck.push(new Card('bj', 0));
        }
        if (this.useRedJoker) {
            this.deck.push(new Card('rj', 0));
        }
        this.shuffle(this.deck);
        this.renderEvent('deckready', function() {});
    },
    shuffle: function(deck) {
        var count = new Date().getTime() % 7 + 1;
        for (var c = 0; c < count; c++) {
            var i = deck.length;
            if (i == 0) return;
            while (--i) {
                var j = Math.floor(Math.random() * (i + 1));
                var tempi = deck[i];
                var tempj = deck[j];
                deck[i] = tempj;
                deck[j] = tempi;
            }
        }
    },
    dealtCardCount: 0,
    nextPlayerToDealTo: 0,
    dealerIndex: -1,
    lastDealerIndex: -1,
    deal: function() {
        if (this.dealtCardCount == this.cardCount * this.players.length) {
            this.afterDealing();
        } else {
            var card;
            var player = this.players[this.nextPlayerToDealTo];
            if (this.fixedCards) {
                card = this.getFixedCard(player);
            } else {
                card = this.deck.pop();
            }
            player.hand.push(card);
            this.nextPlayerToDealTo = this.nextIndex(this.nextPlayerToDealTo);
            this.dealtCardCount++;
            this.renderEvent('dealcard', this.deal, {
                player: player,
                cardpos: player.hand.length - 1,
                card: card
            });
        }
    },
    getFixedCard: function(player) {
        var fixed = this.fixedCards[player.id];
        if (fixed && fixed.length > 0) {
            var cardId = fixed.pop();
            var card = $A(this.deck).find(function(c) {
                return c.shortName == cardId;
            });
            if (!card) {
                alert('CARD ' + cardId + ' is no longer in the deck!');
                return null;
            }
            $A(this.deck).remove(card);
            return card;
        }
        for (var i = this.deck.length - 1; i >= 0; i--) {
            card = this.deck[i];
            if (!$A(this.fixedCards.all).contains(card.shortName)) {
                $A(this.deck).remove(card);
                return card;
            }
        }
        throw 'Could not find any card for ' + player;
    },
    create: function(realGame) {
        for (var i in this) {
            if (typeof realGame[i] === 'undefined') {
                realGame[i] = this[i];
            } else {
                realGame['base_' + i] = this[i];
            }
        }
        realGame.base = this;
    },
    pickFirstPlayerIndex: function() {
        return this.nextIndex(this.dealerIndex);
    },
    hasWon: function(player) {
        return false;
    },
    beforePlayerTurn: function(player) {},
    canPlayCard: function(player, card) {
        return true;
    },
    canSelectCard: function(player, card) {
        return true;
    },
    mustSayPass: function(player) {
        return false;
    },
    mustDraw: function(player) {
        return false;
    },
    nextIndex: function(index) {
        return (index + 1) % this.players.length;
    },
    pickNextPlayerIndex: function() {
        return this.nextIndex(this.currentPlayerIndex);
    },
    isNewRoundStarting: function() {
        return this.currentPlayerIndex == 0;
    }
}

function testShuffling(arr, count) {
    count = count || 500;
    arr = arr || [1, 2, 3, 4];
    var results = {};
    for (var i = 0; i < count; i++) {
        var newArr = arr.slice(0, arr.length);
        CardGame.prototype.shuffle(newArr);
    }
}

function Spades() {
    CardGame.prototype.create(this);
    this.init();
}
Spades.prototype = {
    cardCount: 13,
    sortType: 'suit',
    canSelectCards: false,
    defaultPlayerCount: 4,
    spadesIsBroken: false,
    winScore: 500,
    nilBidBonus: 100,
    pointsPerBidTrick: 10,
    pointsPerBag: 1,
    tenBagsPenalty: 100,
    previousGameScores: null,
    init: function() {
        this.initDefaults();
        this.renderers['spadesbroken'] = this.makeRenderFunc('spadesbroken - @player.name breaks spades');
        this.renderers['taketrick'] = this.makeRenderFunc('taketrick - @player.name takes the trick');
        this.renderers['bid'] = this.makeRenderFunc('bid - @player.name bids @bid');
        this.renderers['showscore'] = this.makeRenderFunc('showscore');
    },
    toString: function() {
        return 'Spades';
    },
    canPlayCard: function(player, card) {
        if (this.pile.length == 0) {
            if (card.suit != 's') {
                return true;
            }
            return this.spadesIsBroken || $A(player.hand).all(function(c) {
                return c.suit == 's';
            });
        }
        var trickSuit = this.pile[0].suit;
        return card.suit == trickSuit || !$A(player.hand).any(function(c) {
            return c.suit == trickSuit;
        });
    },
    canSelectCard: function(player, card) {
        return this.canPlayCard(player, card);
    },
    afterDealing: function() {
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            if (p.isHuman && !this.handSorted) {
                this.handSorted = true;
                return this.sortHand(p, this.afterDealing);
            }
        }
        $A(this.players).each(function(p) {
            p.tricks = [];
            p.bidValue = -1;
        });
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].partner = this.players[(i + 2) % this.players.length];
        }
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].beforeGameStart) {
                this.players[i].beforeGameStart();
            }
        }
        this.currentPlayerIndex = this.pickFirstPlayerIndex();
        this.bidPlayerIndex = this.currentPlayerIndex;
        this.players[this.bidPlayerIndex].bid();
    },
    bid: function(player, bid) {
        player.bidValue = bid;
        this.renderEvent('bid', this.afterRenderBid, {
            player: player,
            bid: bid
        });
    },
    afterRenderBid: function() {
        if ($A(this.players).all(function(p) {
                return p.bidValue >= 0;
            })) {
            this.renderEvent('start', this.currentPlayerTurn);
        } else {
            this.bidPlayerIndex = (this.bidPlayerIndex + 1) % this.players.length;
            this.players[this.bidPlayerIndex].bid();
        }
    },
    beforePlayerTurn: function(player) {},
    playCards: function(player, cards) {
        if (cards[0].suit == 's' && !this.spadesIsBroken) {
            this.spadesIsBroken = true;
            this.renderEvent('spadesbroken', function() {});
        }
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].notifyPlay(this.pile, player, cards[0]);
        }
        this.base.playCards.call(this, player, cards);
    },
    playerPlay: function() {
        this.base.playerPlay.call(this);
    },
    calculateScore: function() {
        var nilBidBonus = this.nilBidBonus;
        var pointsPerBidTrick = this.pointsPerBidTrick;
        var pointsPerBag = this.pointsPerBag;
        var tenBagsPenalty = this.tenBagsPenalty;

        function calcForTeam(p1, p2) {
            var result = {
                bid: p1.bidValue + p2.bidValue,
                tricks: 0,
                bagsPrevRound: p1.bags || 0,
                bags: 0,
                totalBags: 0,
                bagsNextRound: 0,
                nilBidScore: 0,
                nilBidPenalty: 0,
                bagsScore: 0,
                bagsPenalty: 0,
                tricksScore: 0,
                tricksPenalty: 0,
                score: 0,
                scoreLastRound: p1.scoreLastRound || 0,
                scoreTotal: 0
            };
            var nilBidBonus = 100;
            var pointsPerBidTrick = 10;
            var pointsPerBag = 1;
            var tenBagsPenalty = 100;
            var team = [p1, p2];
            for (var i in team) {
                var p = team[i];
                if (p.bidValue == 0 && p.tricks.length == 0) {
                    result.nilBidScore += nilBidBonus;
                } else if (p.bidValue == 0 && p.tricks.length > 0) {
                    result.nilBidPenalty -= nilBidBonus;
                    result.bags += p.tricks.length;
                } else {
                    result.tricks += p.tricks.length;
                }
            }
            result.bags += Math.max(0, result.tricks - result.bid);
            if (result.tricks >= result.bid) {
                result.tricksScore += result.bid * pointsPerBidTrick;
            } else {
                result.tricksPenalty -= result.bid * pointsPerBidTrick;
            }
            result.totalBags = result.bags + result.bagsPrevRound;
            result.bagsNextRound = result.totalBags;
            result.bagsScore = result.bags;
            if (result.bagsNextRound >= 10) {
                result.bagsPenalty -= tenBagsPenalty;
                result.bagsNextRound -= 10;
            }
            result.score = result.tricksScore + result.tricksPenalty + result.bagsScore + result.bagsPenalty + result.nilBidScore + result.nilBidPenalty;
            result.scoreTotal = result.score + result.scoreLastRound;
            return result;
        }
        var result1 = calcForTeam(this.players[0], this.players[2]);
        var result2 = calcForTeam(this.players[1], this.players[3]);
        if ((result1.scoreTotal < this.winScore && result2.scoreTotal < this.winScore) || (result1.scoreTotal >= this.winScore && result1.scoreTotal == result2.scoreTotal)) {
            this.renderEvent('showscore', function() {}, {
                team1: result1,
                team2: result2
            });
        } else if (result1.scoreTotal >= this.winScore && result1.scoreTotal > result2.scoreTotal) {
            this.renderEvent('win', function() {}, {
                team1: result1,
                team2: result2,
                winner: 1
            });
        } else if (result2.scoreTotal >= this.winScore) {
            this.renderEvent('win', function() {}, {
                team1: result1,
                team2: result2,
                winner: 2
            });
        } else {
            alert('someth ' + result1.scoreTotal);
        }
    },
    afterPlayCards: function() {
        if (this.pile.length < this.players.length) {
            this.nextPlayerTurn();
        } else {
            var winner = 0;
            var firstCard = this.pile[0];
            var bestCard = firstCard;
            var firstPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            for (var i = 1; i < this.pile.length; i++) {
                var card = this.pile[i];
                if (bestCard.suit != 's' && card.suit == 's') {
                    bestCard = card;
                    winner = i;
                } else if (card.suit == bestCard.suit && card.rank > bestCard.rank) {
                    bestCard = card;
                    winner = i;
                }
            }
            var winnerIndex = (firstPlayerIndex + winner) % this.players.length;
            var finished = this.players[0].hand.length == 0;
            this.currentPlayerIndex = winnerIndex;
            this.currentPlayer().tricks.push(this.pile.slice(0));
            var oldPile = this.pile;
            this.pile = [];
            var callback = !finished ? this.currentPlayerTurn : this.calculateScore;
            this.renderEvent('taketrick', callback, {
                trick: oldPile
            });
        }
    }
};

function createGame() {
    return new Spades();
}
ComputerPlayer = function ComputerPlayer(name) {
    this.init(name);
}
ComputerPlayer.prototype = {
    name: null,
    hand: null,
    isHuman: false,
    init: function(name) {
        this.name = name;
        this.hand = [];
        this.selectedCards = [];
        this.stats = {};
    },
    play: function(playable) {
        if (playable.length == 0) {
            this.game.sayGo(this);
        } else {
            var randomCard = playable[Math.floor(Math.random() * playable.length)];
            var playCards = [randomCard];
            this.game.playCards(this, playCards);
        }
    },
    draw: function() {
        this.game.drawCard(this);
    },
    extend: function(type) {
        this.base = {};
        for (var i in type) {
            if (this[i]) {
                this.base[i] = this[i];
            }
            this[i] = type[i];
        }
        if (type.hasOwnProperty('toString')) {
            this.toString = type.toString;
        }
    },
    toString: function() {
        var str = this.name;
        if (this.hand.length) {
            str += ' - HAND: ' + this.hand;
        }
        return str;
    },
    hasCard: function(card) {
        return $A(this.hand).contains(card);
    },
    remove: function(card) {
        return $A(this.hand).remove(card);
    },
    addDelays: function(delays) {
        var proto = this;
        for (var funcName in delays) {
            var timeoutMilliseconds = delays[funcName];
            var oldFunc = this[funcName];
            if (!oldFunc) {
                throw 'Unrecognized func name: ' + funcName;
            }
            (function() {
                var ms = timeoutMilliseconds;
                var f = oldFunc;
                var name = funcName;
                proto[name] = function() {
                    var me = this;
                    var args = arguments;
                    setTimeout(function() {
                        f.apply(me, args);
                    }, ms);
                };
            })();
        }
    }
};
ComputerPlayer.prototype.extend({
    notifyPlay: function(pile, player, card) {
        if (pile.length > 0 && pile[0].suit != card.suit) {
            this.playerInfo[player.name][pile[0].suit] = false;
        }
        $A(this.remaining[card.suit]).remove(card.rank);
        if (this.remaining[card.suit].length == 0) {
            for (var i in this.playerInfo) {
                this.playerInfo[i][card.suit] = false;
            }
        }
    },
    removeLowerAdjacentCards: function(cards) {
        cards.sort(function(a, b) {
            var x = {
                h: 0,
                s: 1,
                d: 2,
                c: 3
            };
            if (a.suit != b.suit) {
                return x[a.suit] - x[b.suit];
            }
            return a.rank - b.rank;
        });
        var filtered = [];
        for (var i = 0; i < cards.length; i++) {
            var curr = cards[i],
                next = cards[i + 1];
            if (!next) {
                filtered.push(curr);
            } else {
                if (!(curr.suit == next.suit && curr.rank == next.rank - 1)) {
                    filtered.push(curr);
                }
            }
        }
        if (cards.toString() != filtered.toString()) {
            log('Was ' + cards + ', now is ' + filtered);
        }
        return filtered;
    },
    play: function(playable) {
        playable = this.removeLowerAdjacentCards(playable);
        this.sortPlayable(playable);
        if (this.game.pile.length == 0) {
            log('-------------');
        }
        log(this.name + ': ' + playable.toString());
        if (this.game.pile.length == 0) {
            this.playPos1(playable);
        } else if (this.game.pile.length == 1) {
            this.playPos2(playable);
        } else if (this.game.pile.length == 2) {
            this.playPos3(playable);
        } else if (this.game.pile.length == 3) {
            this.playPos4(playable);
        }
    },
    haveMadeBid: function() {
        if (this.bidValue == 0 || this.partner.bidValue == 0) {
            return false;
        }
        var totalBid = this.bidValue + this.partner.bidValue;
        var totalTricks = this.tricks.length + this.partner.tricks.length;
        return totalTricks >= totalBid;
    },
    opponentHasGoodNilBid: function() {
        for (var i = 0; i < this.game.players.length; i++) {
            var p = this.game.players[i];
            if (p !== this && p !== this.partner) {
                if (p.bidValue == 0 && p.tricks.length == 0) {
                    return p;
                }
            }
        }
        return null;
    },
    playPos1: function(playable) {
        var myIndex = $A(this.game.players).indexOf(this);
        var op1 = this.game.players[(myIndex + 1) % 4];
        var op2 = this.game.players[(myIndex + 3) % 4];
        var partner = this.partner;
        var iHaveGoodNilBid = this.bidValue == 0 && this.tricks.length == 0;
        var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
        var amProtectingNilBid = partnerHasGoodNilBid && !iHaveGoodNilBid;
        for (var i in playable) {
            var card = playable[i];
            card.goodness = card.rank;
            for (var j in this.remaining[card.suit]) {
                if (this.remaining[card.suit][j] > card.rank) {
                    card.goodness--;
                }
            }
            if (amProtectingNilBid && this.playerInfo[partner.name][card.suit] === false) {
                card.goodness += 500;
            }
            if (!amProtectingNilBid && this.playerInfo[op1.name][card.suit] == false && this.playerInfo[op1.name]['s'] == false && this.playerInfo[op2.name][card.suit] == false && this.playerInfo[op2.name]['s'] == false) {
                card.goodness += 1000;
            }
            if (card.suit == 's') {
                card.goodness -= 1;
            }
            if (card.rank == 13) {
                var iHaveTheAce = $A(this.hand).where(function(c) {
                    return c.suit == card.suit && c.rank == 14
                }).length == 1;
                var theAceHasntBeenPlayed = $A(this.remaining[card.suit]).contains(14);
                if (!amProtectingNilBid && !iHaveTheAce && theAceHasntBeenPlayed && this.bidValue != 0 && !this.opponentHasGoodNilBid()) {
                    card.goodness = -10;
                    log('Not leading the king because reasons');
                }
            }
        }
        playable.sort(function(a, b) {
            return a.goodness - b.goodness;
        });
        var best = playable[playable.length - 1];
        var worst = playable[0];
        var iHaveGoodNilBid = this.bidValue == 0 && this.tricks.length == 0;
        var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
        var opNilBidder = this.opponentHasGoodNilBid();
        if (amProtectingNilBid) {
            log('Playing best card to try to help partner make nil bid');
            this.playCard(best);
        } else if (opNilBidder) {
            this.playCard(worst);
            log(this.name + ' leading worst card to try to ruin ' + opNilBidder.name + "'s nil bid");
        } else if (this.haveMadeBid()) {
            if (this.shouldGetBags()) {
                log(this.name + ' has made bid, trying for bags in lead to set others.');
                this.playCard(best);
            } else {
                log(this.name + ' has made bid, trying to lose lead');
                this.playCard(worst);
            }
        } else if (this.bidValue == 0) {
            log(this.name + ' has nil bid, trying to lose in lead');
            this.playCard(worst);
        } else {
            this.playCard(best);
        }
    },
    playPos2: function(playable) {
        var cards = this.getImportantCards(playable);
        try {
            log(this.name + ' cards: ' + JSON.stringify(cards));
        } catch (e) {}
        var iHaveGoodNilBid = this.bidValue == 0 && this.tricks.length == 0;
        var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
        var opNilBidder = this.opponentHasGoodNilBid();
        if (partnerHasGoodNilBid && !iHaveGoodNilBid && cards.bestThatCanWin) {

            if (cards.worstThatCanWin && cards.worstThatCanWin.suit == 's' && this.game.pile[0].suit !== 's') {
                log(this.name + ' playing worst card that can win, since it is a trump and our nil bidding partner will not take it');
                this.playCard(cards.worstThatCanWin);
            } else {
                log(this.name + ' playing best card to win, to help nil bid buddy');
                this.playCard(cards.bestThatCanWin);
            }
        } else if (opNilBidder && this.game.pile[0].playedBy === opNilBidder && cards.bestThatCanLose) {
            log(this.name + ' trying to ruin nil bid from ' + opNilBidder.name);
            this.playCard(cards.bestThatCanLose);
        } else if (this.haveMadeBid()) {
            if (this.shouldGetBags()) {
                log(this.name + ' has made bid, trying for bags to set others. pos 2');
                this.winPos2(cards);
            } else {
                log(this.name + ' has made bid, trying to lose pos 2');
                this.losePos2(cards);
            }
        } else if (this.bidValue == 0) {
            log(this.name + ' has nil bid, trying to lose pos 2');
            this.losePos2(cards);
        } else {
            this.winPos2(cards);
        }
    },
    winPos2: function(cards) {
        if (cards.worstThatCanWin) {
            this.playCard(cards.worstThatCanWin);
        } else {
            this.playCard(cards.worstThatCanLose);
        }
    },
    losePos2: function(cards) {
        if (cards.bestThatCanLose) {
            this.playCard(cards.bestThatCanLose);
        } else {
            this.playCard(cards.worstThatCanWin);
        }
    },
    shouldGetBags: function() {
        var op1, op2;
        for (var i = 0; i < this.game.players.length; i++) {
            var p = this.game.players[i];
            if (p !== this && p !== this.partner) {
                if (!op1) {
                    op1 = p;
                } else {
                    op2 = p;
                }
            }
        }
        if (op1.bidValue == 0 || op2.bidValue == 0) {
            log(this.name + ' Opponent nil bidding, dont get bags')
            return false;
        }
        var combinedBid = op1.bidValue + op2.bidValue;
        var combinedTricks = op1.tricks.length + op2.tricks.length;
        if (combinedTricks >= combinedBid) {
            log(this.name + ' Opponents already made bid, no point')
            return false;
        }
        var missingTricks = combinedBid - combinedTricks;
        var tricksLeftInRound = this.hand.length;
        if (missingTricks > tricksLeftInRound) {
            log(this.name + ' Opponents already set...')
            return false;
        }
        var ourOldBags = this.bags || 0;
        var ourBid = this.bidValue + this.partner.bidValue;
        var ourTricks = this.tricks.length + this.partner.tricks.length;
        var ourCurrentRoundBags = ourTricks - ourBid;
        var ourTotalBags = ourOldBags + ourCurrentRoundBags;
        var canSetByTaking2bags = tricksLeftInRound - missingTricks <= 2;
        if ((ourTotalBags < 5 || ourTotalBags >= 10) && canSetByTaking2bags) {
            log(this.name + ' less than 5 bags, or already got penalty, try to set them')
            return true;
        }
        log('too many bags, no more!')
        return false;
    },
    getImportantCards: function(playable) {
        var cards = {
            worstThatCanWin: null,
            bestThatCanWin: null,
            worstThatCanLose: null,
            bestThatCanLose: null
        };
        this.sortPlayable(playable);
        var bestCard = this.getBestCard();
        if (!this.canWinCard(playable[0], bestCard)) {
            cards.worstThatCanLose = playable[0];
        }
        if (this.canWinCard(playable[playable.length - 1], bestCard)) {
            cards.bestThatCanWin = playable[playable.length - 1];
        }
        for (var i = 0; i < playable.length; i++) {
            var card = playable[i];
            if (this.canWinCard(card, bestCard)) {
                cards.worstThatCanWin = card;
                break;
            }
        }
        for (var i = playable.length - 1; i >= 0; i--) {
            var card = playable[i];
            if (!this.canWinCard(card, bestCard)) {
                cards.bestThatCanLose = card;
                break;
            }
        }
        return cards;
    },
    sortPlayable: function(playable) {
        playable.sort(function(a, b) {
            if (a.suit != 's' && b.suit == 's') {
                return -1;
            } else if (a.suit == 's' && b.suit != 's') {
                return 1;
            }
            return a.rank - b.rank;
        });
    },
    playPos3: function(playable) {
        var cards = this.getImportantCards(playable);
        var bestCard = this.getBestCard();
        var partnerHasIt = bestCard == this.game.pile[0];
        var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
        var iHaveGoodNilBid = this.bidValue == 0 && this.tricks.length == 0;
        var opNilBidder = this.opponentHasGoodNilBid();
        if (partnerHasIt && partnerHasGoodNilBid) {
            this.winPos3(cards, bestCard, partnerHasIt);
        } else if (this.haveMadeBid()) {
            if (this.shouldGetBags()) {
                log(this.name + ' has made bid, trying for bags to set others. pos 4');
                this.winPos3(cards, bestCard, partnerHasIt);
            } else {
                log(this.name + ' has made bid, trying to lose pos 3');
                this.losePos3(cards, bestCard, partnerHasIt);
            }
        } else if (this.bidValue == 0) {
            log(this.name + ' has nil bid, trying to lose pos 3');
            this.losePos3(cards, bestCard, partnerHasIt);
        } else if (opNilBidder && cards.worstThatCanLose) {
            log(this.name + ' trying to ruin nil bid from ' + opNilBidder.name);
            this.playCard(cards.worstThatCanLose);
        } else {
            this.winPos3(cards, bestCard, partnerHasIt);
        }
    },
    winPos3: function(cards, bestCard, partnerHasIt) {
        if (partnerHasIt) {
            var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
            var partnerHasFailedNilBid = this.partner.bidValue == 0 && this.partner.tricks.length > 0;
            if (partnerHasGoodNilBid) {
                if (cards.worstThatCanWin) {
                    this.playCard(cards.worstThatCanWin);
                } else {
                    this.playCard(cards.worstThatCanLose);
                }
            } else {
                if (cards.worstThatCanLose) {
                    this.playCard(cards.worstThatCanLose);
                } else {
                    this.playCard(cards.worstThatCanWin);
                }
            }
        } else {
            if (cards.worstThatCanWin) {
                this.playCard(cards.worstThatCanWin);
            } else {
                this.playCard(cards.worstThatCanLose);
            }
        }
    },
    losePos3: function(cards, bestCard, partnerHasIt) {
        if (cards.bestThatCanLose) {
            this.playCard(cards.bestThatCanLose);
        } else {
            this.playCard(cards.worstThatCanWin);
        }
    },
    playPos4: function(playable) {
        var cards = this.getImportantCards(playable);
        var bestCard = this.getBestCard();
        var partnerHasIt = bestCard == this.game.pile[1];
        var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
        var iHaveGoodNilBid = this.bidValue == 0 && this.tricks.length == 0;
        var opNilBidder = this.opponentHasGoodNilBid();
        if (opNilBidder && opNilBidder == bestCard.playedBy && cards.worstThatCanLose) {
            log(this.name + ' trying to ruin nil bid from ' + bestCard.playedBy);
            this.playCard(cards.worstThatCanLose);
        } else if (partnerHasIt && partnerHasGoodNilBid && !iHaveGoodNilBid) {
            log(this.name + ' trying to help partner keep good nil bid');
            this.winPos4(cards, bestCard, partnerHasIt);
        } else if (this.haveMadeBid()) {
            if (this.shouldGetBags()) {
                log(this.name + ' has made bid, trying for bags to set others. pos 4');
                this.winPos4(cards, bestCard, partnerHasIt);
            } else {
                log(this.name + ' has made bid, trying to lose pos 4');
                this.losePos4(cards, bestCard, partnerHasIt);
            }
        } else if (this.bidValue == 0) {
            log(this.name + ' has nil bid, trying to lose pos 4');
            this.losePos4(cards, bestCard, partnerHasIt);
        } else {
            this.winPos4(cards, bestCard, partnerHasIt);
        }
    },
    winPos4: function(cards, bestCard, partnerHasIt) {
        if (partnerHasIt) {
            var partnerHasGoodNilBid = this.partner.bidValue == 0 && this.partner.tricks.length == 0;
            var partnerHasFailedNilBid = this.partner.bidValue == 0 && this.partner.tricks.length > 0;
            if (partnerHasGoodNilBid) {
                if (cards.worstThatCanWin) {
                    this.playCard(cards.worstThatCanWin);
                } else {
                    this.playCard(cards.worstThatCanLose);
                }
            } else {
                if (cards.worstThatCanLose) {
                    this.playCard(cards.worstThatCanLose);
                } else {
                    this.playCard(cards.worstThatCanWin);
                }
            }
        } else {
            if (cards.worstThatCanWin) {
                this.playCard(cards.worstThatCanWin);
            } else {
                this.playCard(cards.worstThatCanLose);
            }
        }
    },
    losePos4: function(cards, bestCard, partnerHasIt) {
        if (cards.bestThatCanLose) {
            this.playCard(cards.bestThatCanLose);
        } else {
            this.playCard(cards.bestThatCanWin);
        }
    },
    playCard: function(card) {
        log(this.name + ' plays ' + card);
        card.playedBy = this;
        this.game.playCards(this, [card]);
    },
    canWinCard: function(contenderCard, bestCard) {
        return contenderCard.suit == bestCard.suit && contenderCard.rank > bestCard.rank || contenderCard.suit == 's' && bestCard.suit != 's';
    },
    getBestCard: function() {
        var card = this.game.pile[0];
        for (var i = 1; i < this.game.pile.length; i++) {
            var newCard = this.game.pile[i];
            if (this.canWinCard(newCard, card)) {
                card = newCard;
            }
        }
        return card;
    },
    beforeGameStart: function() {
        this.remaining = {};
        var suits = ['h', 's', 'd', 'c'];
        for (var i in suits) {
            this.remaining[suits[i]] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        }
        for (var i in this.hand) {
            var card = this.hand[i];
            $A(this.remaining[card.suit]).remove(card.rank);
        }
        this.playerInfo = {};
        for (var i = 0; i < this.game.players.length; i++) {
            var p = this.game.players[i];
            this.playerInfo[p.name] = {
                "h": true,
                "s": true,
                "d": true,
                "c": true
            };
        }
    },
    bid: function() {
        if (this.partner.bidValue == 13) {
            this.game.bid(this, 0);
            return;
        }
        var info = {
            s: {
                count: 0
            },
            d: {
                count: 0
            },
            c: {
                count: 0
            },
            h: {
                count: 0
            }
        };
        for (var i = 0; i < this.hand.length; i++) {
            var c = this.hand[i];
            info[c.suit].count++;
            if (c.rank == 14) {
                info[c.suit].hasAce = true;
            }
            if (c.rank == 13) {
                info[c.suit].hasKing = true;
            }
            if (c.rank == 12) {
                info[c.suit].hasQueen = true;
            }
        }
        var spades = $A(this.hand).where(function(c) {
            return c.suit == 's';
        });
        var hardBid = 0;
        var softBid = 0;
        for (var i = 14; i >= 0; i--) {
            var highSpade = $A(spades).find(function(c) {
                return c.rank == i
            });
            if (highSpade) {
                hardBid++;
                $A(spades).remove(highSpade);
                highSpadeCount++;
            } else {
                break;
            }
        }
        log('********** ' + this.name + ' BID ***************')
        log(this.name + ': Hard Bid is ' + hardBid);
        var spadeFaceCards = $A(spades).where(function(c) {
            return c.rank >= 10;
        });
        var highSpadeCount = spadeFaceCards + hardBid;
        log(this.name + ': High spade bid is ' + spadeFaceCards.length);
        for (var i = 0; i < spadeFaceCards.length; i++) {
            var card = spadeFaceCards[i];
            softBid++;
            $A(spades).remove(card);
        }
        var lowSpadeBid = Math.ceil(spades.length / 2.5);
        log(this.name + ': Low spade bid is ' + lowSpadeBid);
        softBid += lowSpadeBid;
        for (var suit in info) {
            if (suit != 's') {
                var suitInfo = info[suit];
                if (suitInfo.hasAce && suitInfo.hasKing) {
                    softBid += 2;
                    log(this.name + ' Bid for King+Ace in ' + suit + ': 2');
                } else if (suitInfo.hasAce) {
                    softBid += 1;
                    log(this.name + ' Bid for Ace in ' + suit + ': 1');
                } else if (suitInfo.hasKing) {
                    softBid += 0.5;
                    log(this.name + ' Bid for King in ' + suit + ': 0.5');
                }
            }
        }
        var lowerSoftBid = Math.min(1, softBid);
        log(this.name + ' lowering soft bid by ' + lowerSoftBid);
        softBid -= lowerSoftBid;
        var bid = hardBid + softBid;
        log(this.name + ' Soft+Hard Bid: ' + bid);
        if (bid < 3 && this.partner.bidValue !== 0 && highSpadeCount == 0) {
            var canBidNil = true;
            for (var suit in info) {
                var suitInfo = info[suit];
                if (suitInfo.hasAce || suitInfo.hasKing) {
                    canBidNil = false;
                    log('Not bidding nil because of lone or only two high cards in ' + suit);
                }
            }
            if (this.partner.bidValue && this.partner.bidValue < 4) {
                canBidNil = false;
            }
            if (info['s'].count > 3) {
                canBidNil = false;
            }
            if (canBidNil) {
                this.game.bid(this, 0);
                return;
            }
        }
        bid = Math.ceil(bid);
        bid = Math.min(bid, 6);
        bid = Math.max(bid, 1);
        var maxCombinedBid = 9;
        if (this.partner.bidValue >= 6) {
            log(this.name + ' changing bid from ' + bid + ' to hard bid ' + hardBid + ' because our partner has 6 or more');
            bid = hardBid;
        } else if (bid + this.partner.bidValue > maxCombinedBid) {
            var oldBid = bid;
            bid = Math.max(maxCombinedBid - this.partner.bidValue, hardBid);
            log(this.name + ' changed bid from ' + oldBid + ' to ' + bid + ' because the combined bid was higher than ' + maxCombinedBid);
        }
        var currentBags = this.bags;
        var currentScore = this.scoreLastRound;
        var neededScoreToWin = this.game.winScore - currentScore;
        var bidBeforeReduce = bid;
        if (this.partner.bidValue > 0) {
            var combinedBid = bid + this.partner.bidValue;
            bid = this.reduceBidForEndGame(neededScoreToWin, bid, bid + this.partner.bidValue, currentBags);
        } else {
            bid = this.reduceBidForEndGame(neededScoreToWin, bid, bid, currentBags);
        }
        if (bid < bidBeforeReduce) {
            log(this.name + ' reduced bid from ' + bidBeforeReduce + ' to ' + bid + ' because of endgame strategy');
        }
        if (bid < hardBid) {
            log(this.name + ' changing bid again from ' + bid + ' to hardBid: ' + hardBid);
            bid = hardBid;
        }
        bid = Math.max(bid, 1);
        this.game.bid(this, bid);
    },
    reduceBidForEndGame: function(neededScoreToWin, bid, combinedBid, bags) {
        var scoreForBid = combinedBid * this.game.pointsPerBidTrick;
        if (scoreForBid > neededScoreToWin) {
            var diff = scoreForBid - neededScoreToWin;
            var extraTricks = Math.floor(diff / 10);
            if (bags + extraTricks >= 10) {
                return bid;
            }
            if (extraTricks >= 5) {
                log(this.name + ': Extra tricks is ' + extraTricks + ', reducing bid by 2 to make it to ' + this.game.winScore);
                return bid - 2;
            } else if (extraTricks >= 1) {
                log(this.name + ': Extra tricks is ' + extraTricks + ', reducing bid by 1 to make it to ' + this.game.winScore);
                return bid - 1;
            }
        }
        return bid;
    }
});
HumanPlayer = function HumanPlayer(name) {
    this.init(name);
}
HumanPlayer.prototype = {
    name: null,
    hand: null,
    isHuman: true,
    canOnlyDraw: false,
    playable: null,
    init: function(name) {
        this.name = name;
        this.hand = [];
        this.selectedCards = [];
        this.stats = {};
        this.isHuman = true;
    },
    wrongCardMessageIndex: 0,
    play: function(playable) {
        this.playable = playable;
    },
    draw: function() {
        this.canOnlyDraw = true;
        this.mustDrawMessage();
    },
    useCard: function(card, selecting) {
        if (!card) {
            throw 'card was null';
        }
        if (selecting && !this.game.canSelectCards) {
            return;
        }
        this.game.message('');
        if (this.canOnlyDraw) {
            this.drawing(card);
        } else if (this.game.mayAlwaysDraw && this.canPlay && card == $A(this.game.deck).last()) {
            this.drawing(card);
        } else if (!this.hasCard(card)) {
            this.illegalCardUsed(card, selecting);
        } else if (!this.canPlay) {
            this.notYourTurnMessage();
        } else if (selecting) {
            this.selecting(card);
        } else if ($A(this.playable).contains(card) || this.game.canSelectCard(this, card)) {
            this.playing(card);
        } else {
            this.nonPlayableCardUsed(card, selecting);
        }
    },
    playing: function(card) {
        if ($A(this.selectedCards).contains(card)) {
            this.game.playCards(this, this.selectedCards);
        } else if (!this.game.canSelectCard(this, card)) {
            this.cannotSelectCardMessage(card);
        } else {
            this.selectedCards.push(card);
            this.game.playCards(this, this.selectedCards);
        }
    },
    drawing: function(card) {
        if (card == $A(this.game.deck).last()) {
            this.game.message('');
            this.canOnlyDraw = false;
            this.game.drawCard(this);
        } else {
            this.mustDrawMessage();
        }
    },
    selecting: function(card) {
        if (!card.selected) {
            if (this.game.canSelectCard(this, card)) {
                this.game.selectCard(this, card);
            } else {
                this.cannotSelectCardMessage(card);
            }
        } else {
            this.game.unselectCard(this, card);
        }
    },
    illegalCardUsed: function(card, selecting) {
        if (card == $A(this.game.deck).last()) {
            this.cannotDrawCardMessage();
        } else if ($A(this.game.pile).contains(card)) {
            this.game.message('You cannot take cards from the pile!');
        } else {
            if (this.wrongCardMessageIndex == this.wrongCardMessages.length) {
                this.game.message('');
            } else {
                this.game.message(this.wrongCardMessages[this.wrongCardMessageIndex++]);
            }
            if (this.wrongCardPressed) {
                this.wrongCardPressed(card.toString());
            }
        }
    },
    nonPlayableCardUsed: function(card, selecting) {
        this.cannotPlayCardMessage(card);
    },
    wrongCardMessages: ['That\'s not even your card!', 'No, really, you can\'t play the opponents cards!', 'Are you sure you understand the rules of this game?', 'THESE ARE NOT THE CARDS YOU\'RE LOOKING FOR!', 'OK, now you\'re just messing with me!', 'STOP TOUCHING MY CARDS!', 'STOP IT!', 'Play your own cards, not mine!', 'Ok, have you had your fun now? Can we keep on playing the game?', 'Just play!', 'If you touch my cards one more time there will be CONSEQUENCES!!!', 'At some point this is just gonna stop being funny...', 'I\'m giving you the silent treatment from now on!'],
    notYourTurnMessage: function() {
        this.game.message('It\'s not your turn to play!');
    },
    cannotSelectCardMessage: function(card) {
        if (this.selectedCards.length == 0) {
            this.cannotPlayCardMessage(card);
        } else {
            this.game.message('You cannot play this card with the other cards you have selected.');
        }
    },
    cannotPlayCardMessage: function(card) {
        this.game.message('You cannot play the ' + card.longName + ' now.');
    },
    cannotDrawCardMessage: function(card) {
        this.game.message('You may not draw a card now, you have cards in your hand that you can play!');
    },
    mustDrawMessage: function() {
        this.game.message('You have no cards you can play, you must draw.');
    },
    extend: ComputerPlayer.prototype.extend,
    toString: ComputerPlayer.prototype.toString,
    hasCard: ComputerPlayer.prototype.hasCard,
    remove: ComputerPlayer.prototype.remove
}
HumanPlayer.prototype.extend({
    init: ComputerPlayer.prototype.init,
    bid: function() {
        var maxBid = 13;
        if (this.partner.bidValue >= 0) {
            maxBid -= this.partner.bidValue;
        }
        this.startBid(maxBid);
        this.isBidding = true;
    },
    doBid: function(bid) {
        this.isBidding = false;
        this.game.bid(this, bid);
        for (var i = 0; i < this.hand.length; i++) {
            this.hand[i].playedBy = this;
        }
    },
    notifyPlay: function(pile, player, card) {},
    useCard: function(card, selecting) {
        if (this.isBidding) {
            this.game.message('It\'s your turn to bid now. You can\'t play any card while you\'re bidding!');
        } else {
            this.base.useCard.call(this, card, selecting);
        }
    },
    cannotPlayCardMessage: function(card) {
        if (this.game.pile.length == 0) {
            if (card.suit == 's' && !this.game.spadesIsBroken) {
                this.game.message('You cannot lead with a spade until spades have been broken (a spade played on another suit).');
            } else {
                throw 'Unexpected state: Can\'t lead with a card even though it\s not spades or spades has been broken!';
            }
        } else {
            var leadCard = this.game.pile[0];
            if ($A(this.hand).any(function(c) {
                    return c.suit == leadCard.suit;
                })) {
                this.game.message('The suit of the current trick is ' + leadCard.suitName + 's. You have a ' + leadCard.suitName + ' so you must play it!');
                return;
            }
            throw 'Unexpected state: Can\'t play card even though we don\'t have the trick card suit';
        }
    }
});

var TABLE_SIZE = {
    width: 700,
    height: 600
};
var CARD_SIZE = {
    width: 71,
    height: 96
};
var CONDENSE_COUNT = 6;
var DECK_POS = {
    left: TABLE_SIZE.width / 2 - 1.3 * CARD_SIZE.width,
    top: TABLE_SIZE.height / 2 - CARD_SIZE.height / 2
};
var PILE_POS = {
    left: DECK_POS.left + 1.3 * CARD_SIZE.width,
    top: DECK_POS.top
};
var CARD_PADDING = 18;
var HORIZONTAL_MARGIN = 60;
var VERTICAL_MARGIN = 80;
var OVERLAY_MARGIN = 2;
var HORIZONTAL = 'h';
var VERTICAL = 'v';
var LEFT = 'left',
    RIGHT = 'right',
    TOP = 'top',
    BOTTOM = 'bottom';
var BOTTOM_PLAYER_TOP = TABLE_SIZE.height - CARD_SIZE.height - VERTICAL_MARGIN;
var TOP_PLAYER_TOP = VERTICAL_MARGIN;
var LEFT_PLAYER_TOP = TABLE_SIZE.height / 2;
var RIGHT_PLAYER_TOP = TABLE_SIZE.height / 2;
var BOTTOM_PLAYER_LEFT = TABLE_SIZE.width / 2;
var TOP_PLAYER_LEFT = TABLE_SIZE.width / 2;
var LEFT_PLAYER_LEFT = HORIZONTAL_MARGIN;
var RIGHT_PLAYER_LEFT = TABLE_SIZE.width - CARD_SIZE.height - HORIZONTAL_MARGIN;
var ANIMATION_SPEED = 500;
var TAKE_TRICK_DELAY = 750;
var zIndexCounter = 1;
var CARDBACK = {
    x: -13 * CARD_SIZE.width,
    y: 0
};
var HCARDBACK = {
    x: -13 * CARD_SIZE.width,
    y: -2 * CARD_SIZE.height
};
jQuery.fn.moveCard = function(top, left, callback, speed) {
    var props = {};
    props['top'] = top;
    props['left'] = left;
    props['queue'] = false;
    this.animate(props, speed || ANIMATION_SPEED, callback);
    if (qs.transition) {
        if (typeof fires == 'undefined') {
            fires = {};
        }
        var card = this[0].card;
        if (top == card.top() && left == card.left()) {
            log('NOT MOVING; IS SAME!');
            return;
        }
        if (!fires[card.shortName]) {
            fires[card.shortName] = {
                start: 0,
                end: 0
            };
        }
        fires[card.shortName].start++;
        log('LENGTH: ' + this.length);
        log('START: ' + this[0].card + ', speed ' + speed + ' top: ' + top);
        var el = this[0];

        function transitionEnd(e) {
            if (e.propertyName == 'top') {
                fires[card.shortName].end++;
                log('FINISH: ' + el.card);
                el.removeEventListener('transitionend', transitionEnd);
                if (callback) callback();
            }
        }
        el.addEventListener('transitionend', transitionEnd);
        this.css('transition-property', 'top,left');
        this.css('transition-duration', Math.round((speed || ANIMATION_SPEED)) + 'ms');
        this.css({
            top: top + 'px',
            left: left + 'px'
        });
    }
    return this;
};
jQuery.fn.setBackground = function(x, y) {
    var props = {};
    props['background-position'] = x + ' ' + y;
    this.css(props);
    return this;
};
Card.prototype.move = function(top, left, callback, speed) {
    $(this.guiCard).moveCard(top, left, callback, speed);
    return this;
}
Card.prototype.symbol = function() {
    var ranks = {
        1: 'A',
        11: 'J',
        12: 'Q',
        13: 'K',
        14: 'A'
    };
    var displayRank = ranks[this.rank] || this.rank;
    return HTML_CARD_SUITS[this.suit] + displayRank;
};

function getPrefix(prop) {
    var testNode = document.createElement('div');
    if (!testNode) {
        return prop;
    }
    var prefixes = ['', '-webkit-', '-ms-'];
    for (var i = 0; i < prefixes.length; i++) {
        var candidate = prefixes[i] + prop;
        if (typeof(testNode.style[candidate]) !== 'undefined') {
            return prefixes[i];
        }
    }
    return null;
}
var transformPrefix = getPrefix('transform');
var transitionPrefix = getPrefix('transition');
var browserInfo = parseUserAgent();
var isSafari10 = browserInfo.browser == 'Safari' && browserInfo.version == 10;
Card.prototype.rotate = function(angle, speed) {
    if (transformPrefix === null) {
        return;
    }
    if (typeof speed == 'number' && transitionPrefix !== null) {
        $(this.guiCard).css(transitionPrefix + 'transition-property', transformPrefix + 'transform').css(transitionPrefix + 'transition-duration', SPEED.ms(speed) + 'ms');
    } else if (transitionPrefix !== null) {
        $(this.guiCard).css(transitionPrefix + 'transition-property', '').css(transitionPrefix + 'transition-duration', '');
    }
    if (isSafari10) {
        $(this.guiCard).css(transformPrefix + 'transform', 'rotate3d(0,0,1,' + angle + 'deg)');
    } else {
        $(this.guiCard).css(transformPrefix + 'transform', 'rotate(' + angle + 'deg)');
    }
    return this;
}
Card.prototype.left = function() {
    return parseFloat($(this.guiCard).css('left'));
}
Card.prototype.top = function() {
    return parseFloat($(this.guiCard).css('top'));
}
Card.prototype.width = function() {
    return parseFloat($(this.guiCard).css('width'));
}
Card.prototype.height = function() {
    return parseFloat($(this.guiCard).css('height'));
}
var rotationAngles = {};
rotationAngles[BOTTOM] = 'rotate(0deg)';
rotationAngles[LEFT] = 'rotate(90deg)';
rotationAngles[RIGHT] = 'rotate(-90deg)';
rotationAngles[TOP] = 'rotate(180deg)';
Card.prototype.normalizeRotationOnMove = true;
Card.prototype.showCard = function(position) {
    if (!position) {
        position = BOTTOM;
    }
    if (features.svg) {
        $(this.guiCard).addClass('up').css('transform', rotationAngles[position]);
        return this;
    }
    var offsets = {
        "c": 0,
        "d": 1,
        "h": 2,
        "s": 3
    };
    var xpos, ypos;
    var h = $(this.guiCard).height(),
        w = $(this.guiCard).width();
    if (position == TOP || position == BOTTOM) {
        var rank = this.rank;
        if (rank == 1) {
            rank = 14;
        }
        xpos = (-rank + 2) * CARD_SIZE.width;
        ypos = -offsets[this.suit] * CARD_SIZE.height;
        if (position == TOP && this.rank > 10) {
            ypos = -4 * CARD_SIZE.height;
            var aboveTen = rank - 10;
            xpos = -((aboveTen - 1) + offsets[this.suit] * 4) * CARD_SIZE.width;
        }
        if (this.rank == 0) {
            ypos = -5 * CARD_SIZE.height;
            if (this.suit == 'rj' && position == TOP) {
                xpos = -14 * CARD_SIZE.width;
            } else if (this.suit == 'bj' && position == TOP) {
                xpos = -15 * CARD_SIZE.width;
            } else if (this.suit == 'rj' && position == BOTTOM) {
                xpos = -12 * CARD_SIZE.width;
            } else if (this.suit == 'bj' && position == BOTTOM) {
                xpos = -13 * CARD_SIZE.width;
            }
        }
        if (w > h) {
            $(this.guiCard).height(w).width(h);
        }
        if (this.normalizeRotationOnMove) {
            this.rotate(0);
        }
    } else {
        ypos = -5 * CARD_SIZE.height;
        var rank = this.rank;
        if (rank == 1) {
            rank = 14;
        }
        if (this.rank == 0) {
            xpos = -8 * CARD_SIZE.height;
            var extra = position == RIGHT ? 0 : 2;
            if (this.suit == 'rj') {
                ypos -= (2 + extra) * CARD_SIZE.width;
            } else if (this.suit == 'bj') {
                ypos -= (3 + extra) * CARD_SIZE.width;
            }
        } else if (this.rank <= 10) {
            ypos -= (this.rank - 2) * CARD_SIZE.width;
            xpos = -offsets[this.suit] * CARD_SIZE.height;
        } else {
            xpos = -4 * CARD_SIZE.height - offsets[this.suit] * CARD_SIZE.height;
            if (position == LEFT) {
                ypos -= (this.rank - 7) * CARD_SIZE.width;
            } else {
                ypos -= (this.rank - 11) * CARD_SIZE.width;
            }
        }
        if (h > w) {
            $(this.guiCard).height(w).width(h);
        }
        if (this.normalizeRotationOnMove) {
            this.rotate(0);
        }
    }
    $(this.guiCard).setBackground(xpos + 'px', ypos + 'px');
    return this;
};
Card.prototype.moveToFront = function() {
    this.guiCard.style.zIndex = zIndexCounter++;
    return this;
};
Card.prototype.hideCard = function(position) {
    if (!position) {
        position = BOTTOM;
    }
    if (features.svg) {
        $(this.guiCard).removeClass('up').css('transform', rotationAngles[position]);
        return;
    }
    var h = $(this.guiCard).height(),
        w = $(this.guiCard).width();
    if (position == TOP || position == BOTTOM) {
        $(this.guiCard).setBackground(CARDBACK.x + 'px', CARDBACK.y + 'px');
        if (w > h) {
            $(this.guiCard).height(w).width(h);
        }
    } else {
        $(this.guiCard).setBackground(HCARDBACK.x + 'px', HCARDBACK.y + 'px');
        if (h > w) {
            $(this.guiCard).height(w).width(h);
        }
    }
    this.rotate(0);
    return this;
};

function showCards(cards, position, speed) {
    setTimeout(function() {
        for (var i = 0; i < cards.length; i++) {
            cards[i].showCard(position);
        }
    }, speed || (ANIMATION_SPEED / 2));
}

function hideCards(cards, position, speed) {
    setTimeout(function() {
        for (var i = 0; i < cards.length; i++) {
            cards[i].hideCard(position);
        }
    }, speed || (ANIMATION_SPEED / 2));
}
var webRenderer = {
    extend: function(type) {
        this.base = {};
        for (var i in type) {
            if (this[i]) {
                this.base[i] = this[i];
            }
            this[i] = type[i];
        }
    },
    deckReady: function(e) {
        var left = DECK_POS.left,
            top = DECK_POS.top;
        webRenderer._createCardPile(e.game.deck, DECK_POS.top, DECK_POS.left, false);
        e.callback();
    },
    _createCardPile: function(cards, top, left, showCards) {
        var tableDiv = $('#play-page');
        if (features.localSvgCards) {
            try {
                var svgCards = localStorage['svgcards'];
                if (svgCards) {
                    window.svgCards = JSON.parse(svgCards);
                } else {
                    $.get('/shared/images/cards/svgcards.json', function(obj) {
                        localStorage['svgcards'] = JSON.stringify(obj);
                        window.svgCards = obj;
                    });
                }
            } catch (e) {}
        }
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if ((i + 1) % CONDENSE_COUNT == 0) {
                left -= OVERLAY_MARGIN;
                top -= OVERLAY_MARGIN;
            }
            webRenderer._createGuiCard(card, {
                "left": left,
                "top": top
            });
            if (showCards) {
                card.showCard();
            } else {
                card.hideCard();
            }
        }
        if (features.svgPreRenderPng) {
            webRenderer.svgCardToPng('/shared/images/cards/newback.svg', null, function(url) {
                var style = $('<style>');
                style.text('.svg .card .facedown { background-image:url(' + url + ') !important; }');
                $('head').append(style);
            });
        }
    },
    svgCardToPng: function(svgCardUrl, element, callback) {
        try {
            var canvas = document.createElement('canvas');
            canvas.setAttribute('width', CARD_SIZE.width * 2);
            canvas.setAttribute('height', CARD_SIZE.height * 2);
            var ctx = canvas.getContext('2d');
            var img = new Image();
            img.width = CARD_SIZE.width * 2;
            img.height = CARD_SIZE.height * 2;
            img.onload = function() {
                try {
                    ctx.drawImage(img, 0, 0);
                    if (element) {
                        $(element).css('background-image', 'url(' + canvas.toDataURL() + ')');
                    } else if (callback) {
                        callback(canvas.toDataURL());
                    }
                } catch (e) {
                    log('Error in onload: ' + e);
                }
            }
            img.src = svgCardUrl;
        } catch (e) {
            log('Error in svgCardToPng: ' + e);
        }
    },
    _createGuiCard: function(card, cssProps) {
        var tableDiv = $('#play-page');
        var divCard = $('<div>').addClass('card').css(cssProps);
        if (features.svg) {
            var facedown = $('<div>').addClass('facedown');
            var faceup = $('<div>').addClass('faceup');
            var svgUrl;
            if (features.localSvgCards && window.svgCards) {
                var key = card.suit.toUpperCase() + card.rank;
                if (card.rank == 14) {
                    key = card.suit.toUpperCase() + 1;
                }
                svgUrl = 'data:image/svg+xml;base64,' + svgCards[key];
            } else {
                svgUrl = 'https://d3hp2os08tb528.cloudfront.net/shared/images/cards/' + card.shortName + '.svg';
            }
            $(divCard).append(facedown);
            $(divCard).append(faceup);
            $(faceup).css('background-image', 'url(' + svgUrl + ')');
            if (features.svgPreRenderPng) {
                this.svgCardToPng(svgUrl, faceup);
            }
        } else {
            $(divCard).addClass('png-card');
        }
        tableDiv.append(divCard[0]);
        card.guiCard = divCard[0];
        divCard[0].card = card;
        card.moveToFront();
        card.hideCard();
    },
    _getCardPos: function(player, pos, handLength) {
        if (!handLength) {
            handLength = player.hand.length;
        }
        var handWidth = (handLength - 1) * CARD_PADDING + CARD_SIZE.width;
        var props = {};
        var selectOffset = 0;
        if (player.hand[pos] && player.hand[pos].selected) {
            selectOffset = 15;
        }
        var orientiationDiff = (CARD_SIZE.height - CARD_SIZE.width) / 2;
        if (player.position == TOP) {
            props.left = (player.left + handWidth / 2 - CARD_SIZE.width) - pos * CARD_PADDING;
            props.top = player.top + selectOffset;
        } else if (player.position == BOTTOM) {
            props.left = player.left - (handWidth / 2) + pos * CARD_PADDING;
            props.top = player.top - selectOffset;
        } else if (player.position == LEFT) {
            if (features.svg) {
                props.top = player.top - (handWidth / 2) - orientiationDiff + pos * CARD_PADDING;
                props.left = player.left + selectOffset + orientiationDiff;
            } else {
                props.top = player.top - (handWidth / 2) + pos * CARD_PADDING;
                props.left = player.left + selectOffset;
            }
        } else if (player.position == RIGHT) {
            if (features.svg) {
                props.top = (player.top + handWidth / 2 - CARD_SIZE.width) - orientiationDiff - pos * CARD_PADDING;
                props.left = player.left - selectOffset + orientiationDiff;
            } else {
                props.top = (player.top + handWidth / 2 - CARD_SIZE.width) - pos * CARD_PADDING;
                props.left = player.left - selectOffset;
            }
        }
        return props;
    },
    dealCard: function(e) {
        webRenderer._adjustHand(e.player, e.callback, ANIMATION_SPEED / 2, false, e.game.cardCount);
    },
    selectCard: function(e) {
        webRenderer._adjustHand(e.player, e.callback, ANIMATION_SPEED / 3);
    },
    unselectCard: function(e) {
        webRenderer._adjustHand(e.player, e.callback, ANIMATION_SPEED / 3);
    },
    pickDealer: function(e) {
        $('.avatar').removeClass('dealer');
        $('#' + e.dealerId).addClass('dealer');
        e.callback();
    },
    pass: function(e) {
        var pass = $('#pass');
        pass.css({
            "font-size": '16px',
            "top": e.player.top,
            "z-index": zIndexCounter + 1000
        });
        if (e.player.position == BOTTOM) {
            pass.css("top", e.player.top + 100);
        }
        var props = {
            "top": PILE_POS.top - 40,
            "font-size": '120px'
        };
        if (e.player.align == VERTICAL) {
            if (e.player.position == LEFT) {
                pass.css({
                    "right": '',
                    "left": 0
                });
            } else {
                pass.css({
                    "left": '',
                    "right": 0
                });
            }
            pass.css("width", '100px');
            props['width'] = TABLE_SIZE.width;
        } else {
            pass.css('width', TABLE_SIZE.width + 'px');
            pass.css('text-align', 'center');
        }
        pass.show().animate(props, ANIMATION_SPEED * 2).fadeOut(ANIMATION_SPEED, e.callback);
    },
    play: function(e) {
        var beforeCount = e.game.pile.length - e.cards.length;

        function renderCard(i) {
            if (e.cards.length == 0) {
                e.callback();
            } else {
                var zIndexCards = e.player.hand.slice(0);
                $A(e.cards).each(function(c) {
                    zIndexCards.push(c);
                });
                zIndexCards.sort(function(c1, c2) {
                    return $(c1.guiCard).css('z-index') - $(c2.guiCard).css('z-index');
                });
                for (var i = zIndexCards.length - 1; i >= 0; i--) {
                    $(zIndexCards[i].guiCard).css('z-index', zIndexCounter + i + 1);
                }
                zIndexCounter += zIndexCards.length + 3;
                var card = e.cards[0];
                $A(e.cards).remove(e.cards[0]);
                var top = PILE_POS.top - (Math.floor((beforeCount + i) / CONDENSE_COUNT) * OVERLAY_MARGIN);
                var left = PILE_POS.left - (Math.floor((beforeCount + i) / CONDENSE_COUNT) * OVERLAY_MARGIN);
                $(card.guiCard).moveCard(top, left, function() {
                    renderCard(i + 1);
                });
                if (e.cards.length == 0) {
                    webRenderer._adjustHand(e.player, null, ANIMATION_SPEED, true);
                }
                showCards([card]);
            }
        }
        if (e.cards.length > 1 && $($A(e.cards).last().guiCard).css('top') != $(e.cards[0].guiCard).css('top')) {
            $($A(e.cards).last().guiCard).animate({
                "top": $(e.cards[0].guiCard).css('top')
            }, ANIMATION_SPEED / 4, function() {
                renderCard(0);
            });
        } else {
            renderCard(0);
        }
    },
    _adjustHand: function(player, callback, speed, dontMoveToFront, handLength) {
        if (!speed) {
            speed = ANIMATION_SPEED;
        }
        for (var i = 0; i < player.hand.length; i++) {
            var card = player.hand[i];
            var props = webRenderer._getCardPos(player, i, handLength);
            var f;
            if (i == player.hand.length - 1) {
                f = callback;
            }
            $(card.guiCard).moveCard(props.top, props.left, f, speed);
            if (!dontMoveToFront) {
                card.moveToFront();
            }
        }
        if (player.hand.length == 0 && callback) {
            setTimeout(callback, speed);
        }
        if (player.showCards) {
            showCards(player.hand, player.position, speed / 2);
        } else {
            hideCards(player.hand, player.position, speed / 2);
        }
    },
    draw: function(e) {
        webRenderer._adjustHand(e.player, e.callback);
    },
    sortHand: function(e) {
        webRenderer._adjustHand(e.player, e.callback);
    },
    takeTrick: function(e) {
        setTimeout(function() {
            $A(e.trick).each(function(c) {
                $(c.guiCard).addClass('trick');
            });
            var props = {};
            var cssClass;
            var trickProps = {};
            var playerMargin = 2;
            var trickHeight = 45;
            var trickWidth = 33;
            var halfTrickHeight = trickHeight / 2;
            var halfTrickWidth = trickWidth / 2;
            var overlay = 10;
            var playerSize = 50;
            var sidePlayerTop = 250;
            var edgeDistance = playerMargin + (playerSize - trickHeight) / 2;
            var cardDistance = (TABLE_SIZE.width / 2) + playerSize / 2 + e.player.tricks.length * overlay;
            var svgOrientiationDiff = (trickHeight - trickWidth) / 2;
            if (e.player.position == TOP) {
                props.left = ((TABLE_SIZE.width - CARD_SIZE.width) / 2) + 'px';
                cssClass = 'verticalTrick';
                trickProps.top = edgeDistance;
                trickProps.left = cardDistance;
                props = trickProps;
            } else if (e.player.position == BOTTOM) {
                cssClass = 'verticalTrick';
                trickProps.bottom = playerMargin + $('#bottom-player').height() - playerSize + ((playerSize - trickHeight) / 2);
                trickProps.right = cardDistance;
                props.top = TABLE_SIZE.height - trickProps.bottom - CARD_SIZE.height;
                props.left = TABLE_SIZE.width - trickProps.right - CARD_SIZE.width;
            } else if (e.player.position == LEFT) {
                cssClass = 'horizontalTrick';
                trickProps.bottom = TABLE_SIZE.height - sidePlayerTop + e.player.tricks.length * overlay;
                trickProps.left = edgeDistance + 1;
                props.top = TABLE_SIZE.height - trickProps.bottom - CARD_SIZE.height;
                props.left = trickProps.left;
                if (features.svg) {
                    trickProps.left += svgOrientiationDiff;
                    trickProps.bottom -= svgOrientiationDiff;
                }
            } else if (e.player.position == RIGHT) {
                cssClass = 'horizontalTrick';
                trickProps.top = sidePlayerTop + $('#left-player').height() + e.player.tricks.length * overlay;
                trickProps.right = edgeDistance;
                props.top = trickProps.top;
                props.left = TABLE_SIZE.width - trickProps.right - CARD_SIZE.width;
                if (features.svg) {
                    trickProps.right += svgOrientiationDiff;
                    trickProps.top -= svgOrientiationDiff;
                }
            }
            for (var i = 0; i < e.trick.length; i++) {
                e.trick[i].moveToFront();
            }
            var countProps = {};
            if (e.player.position == TOP) {
                countProps.top = trickProps.top;
                countProps.left = trickProps.left + trickWidth;
            } else if (e.player.position == BOTTOM) {
                countProps.bottom = trickProps.bottom;
                countProps.right = trickProps.right + trickWidth;
            } else if (e.player.position == LEFT) {
                countProps.bottom = trickProps.bottom + trickWidth;
                countProps.left = trickProps.left;
            } else if (e.player.position == RIGHT) {
                countProps.top = trickProps.top + trickWidth;
                countProps.right = trickProps.right;
            }
            for (var i = 0; i < e.trick.length; i++) {
                var callback = function() {};
                if (i == e.trick.length - 1) {
                    callback = function() {
                        $('.trick').hide();
                        $('#play-page').append($('<div/>').addClass(cssClass).css(trickProps));
                        if (e.player.isHuman) {
                            $('#current-score').text('Your points: ' + e.player.points);
                        }
                        e.callback();
                    };
                }
                $(e.trick[i].guiCard).animate(props, ANIMATION_SPEED, callback);
            }
            var playerCount = $('#' + e.player.id + '-trick-count');
            playerCount.animate(countProps, ANIMATION_SPEED, function() {
                playerCount.text(e.player.tricks.length.toString());
            });
        }, TAKE_TRICK_DELAY);
    },
    createMiniCardsElement: function(cards, includeBorderAndBackground) {
        var wrapper = $('<span>');
        if (includeBorderAndBackground) {
            wrapper.addClass('mini-card-outlined');
        }
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var cardEl = $('<span>', {
                "class": "mini-card " + c.suit
            }).html(c.symbol());
            wrapper.append(cardEl);
        }
        return wrapper;
    },
    processPageCards: function() {
        var elements = $('.process-cards');
        var reverse = {
            J: 11,
            Q: 12,
            K: 13,
            A: 1
        };
        elements.each(function() {
            var text = $(this).text();
            var cardStrings = text.split(' ');
            var cards = [];
            for (var i = 0; i < cardStrings.length; i++) {
                var s = cardStrings[i];
                var suit = s.charAt(0).toLowerCase();
                var rest = s.substr(1);
                var rank = reverse[rest];
                if (!rank) {
                    rank = parseInt(rest);
                }
                cards.push(new Card(suit, rank));
            }
            var el = webRenderer.createMiniCardsElement(cards, true);
            $(this).replaceWith(el);
        });
    }
};

webRenderer.extend({
    dealCard: function(e) {
        ANIMATION_SPEED = 100;
        webRenderer.base.dealCard.call(webRenderer, e);
        ANIMATION_SPEED = 500;
    },
    bid: function(e) {
        var selector = '#' + e.player.id + ' small';
        var name = $(selector).html();
        var name = $(selector).html(name + ' (' + e.bid + ')');
        var bubble = '#' + e.player.id + '-bubble';
        $(bubble + ' p span').text('I bid ' + e.bid);
        $(bubble).fadeIn();
        if (e.game.players[e.game.dealerIndex] == e.player) {
            $('#dealer-chip').css('left', '-=5');
        }
        setTimeout(e.callback, 1000);
    },
    showScore: function(e) {
        $('#messageBox').hide();
        $('#result-box').show();
        var results = [e.team1, e.team2];
        var human = e.game.players[0];
        if (human.bidValue == 0 && human.tricks.length > 0) {
            $('#result-header').text('Sorry, you failed your nil bid!');
        } else if (human.bidValue == 0 && human.tricks.length == 0) {
            $('#result-header').text('Congratulations, you made your nil bid!');
        } else if (e.team1.tricksScore) {
            $('#result-header').text('Congratulations, you made your bid!');
        } else if (e.team1.tricksPenalty) {
            $('#result-header').text('Sorry, you failed your bid!');
        }
        for (var i = 0; i <= 1; i++) {
            var r = results[i];
            var cell = i == 0 ? '.t1' : '.t2';
            $('#combined-bid ' + cell).text(r.bid);
            $('#tricks-taken ' + cell).text(r.tricks);
            $('#bags ' + cell).text(r.bags);
            $('#bags-last-round ' + cell).text(r.bagsPrevRound);
            $('#bags-total ' + cell).text(r.totalBags);
            $('#successful-bid ' + cell).text(r.tricksScore);
            $('#failed-bid ' + cell).text(r.tricksPenalty);
            $('#successful-nil-bid ' + cell).text(r.nilBidScore);
            $('#failed-nil-bid ' + cell).text(r.nilBidPenalty);
            $('#bag-score ' + cell).text(r.bagsScore);
            $('#bag-penalty ' + cell).text(r.bagsPenalty);
            $('#points-this-round ' + cell).text(r.score);
            $('#points-last-round ' + cell).text(r.scoreLastRound);
            $('#points-total ' + cell).text(r.scoreTotal);
        }

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        var pr = getRandomInt(1, 4);
        $('#promo #p' + pr).show();
        var r1 = e.team1,
            r2 = e.team2;
        if (r1.tricksScore == 0 && r2.tricksScore == 0) {
            $('#successful-bid').hide();
        }
        if (r1.tricksPenalty == 0 && r2.tricksPenalty == 0) {
            $('#failed-bid').hide();
        }
        if (r1.nilBidScore == 0 && r2.nilBidScore == 0) {
            $('#successful-nil-bid').hide();
        }
        if (r1.nilBidPenalty == 0 && r2.nilBidPenalty == 0) {
            $('#failed-nil-bid').hide();
        }
        if (r1.bagsScore == 0 && r2.bagsScore == 0) {
            $('#bag-score').hide();
        }
        if (r1.bagsPenalty == 0 && r2.bagsPenalty == 0) {
            $('#bag-penalty').hide();
        }
        if (e.winner) {
            $('#start-new-game').hide();
            $('#reset-game').hide();
            $('#start-new-tournament').show();
            $('#winner-pics').show();
            if (e.winner == 1) {
                $('#winner1').addClass('face-small face-' + img['bottom-player']);
                $('#winner2').addClass('face-small face-' + img['top-player']);
                $('#result-header').text('You and Bill win the game!');
            } else {
                $('#winner1').addClass('face-small face-' + img['left-player']);
                $('#winner2').addClass('face-small face-' + img['right-player']);
                $('#result-header').text('John and Lisa win the game!');
            }
        }
        var cardTableHeight = $('#play-page').height();
        var resultHeight = $('#result-box').height();
        var cardTableWidth = $('#play-page').width();
        var resultWidth = $('#result-box').width();
        $('#result-box').css('left', parseInt((cardTableWidth - resultWidth) / 2));
        $('#result-box').css('top', parseInt((cardTableHeight - resultHeight) / 2));
        e.callback();
    },
    win: function(e) {
        e.callback();
    },
    spadesBroken: function(e) {
        game.message('SPADES IS BROKEN!!! SPADES IS BROKEN!!!');
        $('#bigspade').show().delay(300).fadeOut('slow');
        e.callback();
    },
    play: function(e) {
        PILE_POS.left = (TABLE_SIZE.width - CARD_SIZE.width) / 2;
        PILE_POS.top = (TABLE_SIZE.height - CARD_SIZE.height) / 2;
        if (e.player.position == TOP) {
            PILE_POS.top -= 60;
        } else if (e.player.position == BOTTOM) {
            PILE_POS.top += 10;
        } else if (e.player.position == LEFT) {
            PILE_POS.left -= 40;
            PILE_POS.top -= 25;
        } else if (e.player.position == RIGHT) {
            PILE_POS.left += 40;
            PILE_POS.top -= 25;
        }
        webRenderer.base.play(e);
    }
});

function WebCardGame() {}
WebCardGame.prototype = {
    createGameObject: function() {
        throw "Game must override createGameObject!";
    },
    createHumanPlayer: function() {
        human = new HumanPlayer('You');
        human.top = BOTTOM_PLAYER_TOP;
        human.left = BOTTOM_PLAYER_LEFT;
        human.align = HORIZONTAL;
        human.position = BOTTOM;
        human.showCards = true;
        human.id = 'bottom-player';
        human.stats = {};
        human.wrongCardPressed = function(label) {
            trackEvent('ClickWrongCard', label);
        }
    },
    saveLastDealer: function() {
        cake('lastDealerIndex', game.dealerIndex);
    },
    loadLastDealer: function() {
        var lastDealerIndex = cake('lastDealerIndex');
        if ((lastDealerIndex + '').match(/^[0-3]$/)) {
            window.game.lastDealerIndex = parseInt(lastDealerIndex);
        }
    },
    createComputerPlayers: function() {
        var showCards = qs.showcards;
        topPlayer = new ComputerPlayer('Bill');
        topPlayer.top = TOP_PLAYER_TOP;
        topPlayer.left = TOP_PLAYER_LEFT;
        topPlayer.align = HORIZONTAL;
        topPlayer.position = TOP;
        topPlayer.id = 'top-player';
        topPlayer.showCards = showCards;
        topPlayer.stats = {};
        img['top-player'] = 2;
        leftPlayer = new ComputerPlayer('John');
        leftPlayer.top = LEFT_PLAYER_TOP;
        leftPlayer.left = LEFT_PLAYER_LEFT;
        leftPlayer.align = VERTICAL;
        leftPlayer.position = LEFT;
        leftPlayer.id = 'left-player';
        leftPlayer.showCards = showCards;
        leftPlayer.stats = {};
        img['left-player'] = 1;
        rightPlayer = new ComputerPlayer('Lisa');
        rightPlayer.top = RIGHT_PLAYER_TOP;
        rightPlayer.left = RIGHT_PLAYER_LEFT;
        rightPlayer.align = VERTICAL;
        rightPlayer.position = RIGHT;
        rightPlayer.id = 'right-player';
        rightPlayer.showCards = showCards;
        rightPlayer.stats = {};
        img['right-player'] = 3;
        if (showCards) {
            var exp = new Image();
            exp.onload = function() {
                $('.card').css('background-image', 'url(https://d3hp2os08tb528.cloudfront.net/shared/images/expanded-cards.png)');
            }
            exp.src = 'https://d3hp2os08tb528.cloudfront.net/shared/images/expanded-cards.png';
        }
    },
    setEventRenderers: function() {
        for (var name in game.renderers) {
            game.setEventRenderer(name, function(e) {
                e.callback();
            });
        }
        game.setEventRenderer('deckready', webRenderer.deckReady);
        game.setEventRenderer('dealcard', webRenderer.dealCard);
        game.setEventRenderer('selectcard', webRenderer.selectCard);
        game.setEventRenderer('unselectcard', webRenderer.unselectCard);
        game.setEventRenderer('play', webRenderer.play);
        game.setEventRenderer('draw', webRenderer.draw);
        game.setEventRenderer('pass', webRenderer.pass);
        game.setEventRenderer('sorthand', webRenderer.sortHand);
        game.setEventRenderer('pickdealer', webRenderer.pickDealer);
    },
    setupSortHandler: function() {
        $('#sortHand').click(function() {
            if (!window.human.canPlay && !window.human.mustDraw) {
                game.message('You can only sort when it is your turn to play.');
            } else {
                game.sortHand(window.human, function() {});
            }
        });
    },
    setupPlayerCountHandler: function() {
        window.playerCount = game.defaultPlayerCount;
        if (game.canChangePlayerCount) {
            window.playerCount = settings.playerCount;
        }
        if (playerCount > 2) {
            $('#left-player').show();
        }
        if (playerCount == 4) {
            $('#right-player').show();
        }
        var playerCountSelect = $('#player-count')[0];
        if (playerCountSelect) {
            playerCountSelect.options[playerCount - 2].selected = 'selected';
        }
        $('#player-count').change(function() {
            window.playerCount = this.selectedIndex + 2;
            settings.set('playerCount', window.playerCount);
            webGame.pickDealer();
            if (playerCount == 4) {
                $('#right-player').fadeIn();
                $('#left-player').fadeIn();
            }
            if (playerCount == 3) {
                $('#right-player').fadeOut();
                $('#left-player').fadeIn();
            }
            if (playerCount == 2) {
                $('#right-player').fadeOut();
                $('#left-player').fadeOut();
            }
        });
    },
    bindCardEventHandlers: function() {
        var pushedCard;
        if (window.isTouch && game.canSelectCards) {
            $('.card').bind('touchstart', function(ev) {
                pushedCard = this.card;
                setTimeout(function() {
                    if (pushedCard) {
                        human.useCard(pushedCard, true);
                        pushedCard = null;
                    }
                }, 800);
            });
            $('.card').bind('touchend', function(ev) {
                if (pushedCard !== this.card) {
                    return;
                }
                pushedCard = null;
                human.useCard(this.card, false);
            });
        } else {
            $('.card').mousedown(function(ev) {
                human.useCard(this.card, ev.which == 3 || ev.metaKey);
            });
        }
        $('.card').bind('contextmenu', function(e) {
            return false;
        });
    },
    setupStartHandler: function() {
        game.setEventRenderer('start', function(e) {
            $('#sortHand').show();
            webGame.bindCardEventHandlers();
            if (webRenderer.start) {
                webRenderer.start(e);
            } else {
                e.callback();
            }
        });
    },
    setupTurnHandler: function() {
        game.setEventRenderer('playerturn', function(e) {
            if (e.player.isHuman) {
                if (e.game.round <= 3) {
                    var msg = 'Your turn! Click a card to play.';
                    if (game.canSelectCards) {
                        if (window.isTouch) {
                            msg += ' Press and hold card to select multiple cards.';
                        } else {
                            msg += ' Right click to select multiple cards.';
                        }
                    }
                    e.game.message(msg);
                } else {
                    e.game.message('Your turn!');
                }
            } else {
                e.game.message(e.player.name + "'s turn!");
            }
            e.callback();
        });
    },
    setupDealHandler: function() {
        $('#deal').click(function(e) {
            try {
                window.started = true;
                var imgs = ['horizontal-trick', 'vertical-trick', 'players-thumbs', 'players-medium', 'players-large', 'speechleft', 'speechright', 'speechtop', 'trophy'];
                var img = new Image();
                for (var i = 0; i < imgs.length; i++) {
                    img.src = 'https://d3hp2os08tb528.cloudfront.net/shared/images/' + imgs[i] + '.png';
                }
                game.addPlayer(human);
                if (playerCount > 2) {
                    game.addPlayer(leftPlayer);
                }
                game.addPlayer(topPlayer);
                if (playerCount == 4) {
                    game.addPlayer(rightPlayer);
                }
                stats.startGame(game.players);
                game.message('');
                webGame.setTestCards();
                game.deal();
                $('#deal').hide();
                $('#open-player-picker').hide();
                $('#player-count').hide();
                setCustomVar(1, 'PlayerCount', playerCount + ' players');
                trackEvent('StartGame', playerCount + ' players', playerCount);
            } catch (e) {
                alert(e);
            }
        });
    },
    setupRestartHandler: function() {
        $('#start-new-game').click(function(e) {
            trackEvent('Restart', result);
            reloadPage();
        });
    },
    setupMessageHandler: function() {
        game.message = message;
    },
    setupWinHandler: function() {
        game.setEventRenderer('win', function(e) {
            trackEvent('Win', e.player.name);
            trackEvent('FinishGame');
            makePlayersSad([e.player.id]);
            window.zIndexCounter++;
            if (e.player.isHuman) {
                $('#result-box h3').text('CONGRATULATIONS!!! YOU WIN!');
                result = 'Win';
            } else {
                $('#result-box h3').text(e.player.name.toUpperCase() + ' WINS!!!');
                result = 'Lose';
            }
            for (var i = 0; i < game.players.length; i++) {
                var p = game.players[i];
                if (p === e.player) {
                    p.stats.result = 'win';
                } else {
                    p.stats.result = 'lose';
                }
            }
            stats.finishGame(game.players);
            setTimeout(function() {
                for (var i = 0; i < game.pile.length; i++) {
                    $(game.pile[i].guiCard).hide();
                }
                for (var i = 0; i < game.deck.length; i++) {
                    $(game.deck[i].guiCard).hide();
                }
                $('#result-box span.winner-img').css('display', 'none');
                $('#result-box span#' + e.player.id + '-win').css({
                    display: 'inline-block',
                    width: 120,
                    height: 120
                });
                $('#messageBox').hide();
                $('#result-box').css('z-index', zIndexCounter).show();
            }, 500);
        });
    },
    startGame: function() {
        game.start();
        this.pickDealer();
    },
    pickDealer: function() {
        var count = window.playerCount || game.defaultPlayerCount;
        var ids;
        if (count == 2) {
            ids = ['bottom-player', 'top-player'];
        } else if (count == 3) {
            ids = ['bottom-player', 'left-player', 'top-player'];
        } else {
            ids = ['bottom-player', 'left-player', 'top-player', 'right-player'];
        }
        game.pickDealer(ids);
    },
    extraSetup: function() {},
    setTestCards: function() {
        for (var i = 0; i < game.players.length; i++) {
            var playerId = game.players[i].id;
            if (qs[playerId]) {
                if (!game.fixedCards) {
                    game.fixedCards = {
                        all: []
                    };
                }
                game.fixedCards[playerId] = qs[playerId].slice(0, qs[playerId].length);
                game.fixedCards.all.push.apply(game.fixedCards.all, qs[playerId]);
            }
        }
    },
    extend: function(obj) {
        for (var i in this) {
            if (!obj[i]) {
                obj[i] = this[i];
            }
        }
        obj.base = this;
    }
};
$(document).ready(function() {
    try {
        webRenderer.processPageCards();
        window.game = webGame.createGameObject();
        webGame.createHumanPlayer();
        webGame.createComputerPlayers();
        webGame.setEventRenderers();
        webGame.setupSortHandler();
        webGame.setupPlayerCountHandler();
        webGame.setupDealHandler();
        webGame.setupRestartHandler();
        webGame.setupWinHandler();
        webGame.setupStartHandler();
        webGame.setupTurnHandler();
        webGame.setupMessageHandler();
        webGame.extraSetup();
        webGame.startGame();
        window.isTouch = false;
        $(document).bind('touchstart', function() {
            window.isTouch = true;
        });
    } catch (e) {
        alert(e);
    }
});

function WebSpades() {}
WebSpades.prototype = {
    createGameObject: function() {
        return new Spades();
    },
    setScore: function(team1Score, team1Bags, team2Score, team2Bags) {
        $('#you-bill-score').text(team1Score);
        $('#you-bill-bags').text('(' + team1Bags + ' bag' + (team1Bags == 1 ? ')' : 's)'));
        $('#john-lisa-score').text(team2Score);
        $('#john-lisa-bags').text('(' + team2Bags + ' bag' + (team2Bags == 1 ? ')' : 's)'));
    },
    setupStartHandler: function() {
        game.setEventRenderer('start', function(e) {
            webGame.bindCardEventHandlers();
            $('.bubble').fadeOut();
            e.callback();
        });
    },
    statsRegister: function(players, team1Result, team2Result, tournamentFinished) {
        team1Result.win = team1Result.score > team2Result.score;
        team2Result.win = !team1Result.win;
        team1Result.tournamentWin = team1Result.scoreTotal > team2Result.scoreTotal;
        team2Result.tournamentWin = !team1Result.tournamentWin;
        players[0]._result = team1Result;
        players[1]._result = team2Result;
        players[2]._result = team1Result;
        players[3]._result = team2Result;
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            p.stats.result = p._result.win ? 'win' : 'lose';
            if (tournamentFinished) {
                p.stats.tournamentResult = p._result.tournamentWin ? 'win' : 'lose';
                p.stats.tournamentScore = p._result.scoreTotal;
            }
            p.stats.score = p._result.score;
            p.stats.totalBagCount = p._result.bags;
            p.stats.trickCount = p.tricks.length;
            p.stats.teamTrickCount = p._result.tricks;
            p.stats.teamTotalBidValue = p._result.bid;
            p.stats.totalBidValue = p.bidValue;
            p.stats.nilBidCount = p.bidValue == 0 ? 1 : 0;
            if (p.bidValue == 0) {
                if (p.tricks.length == 0) {
                    p.stats.successNilBidCount = 1;
                    p.stats.failedNilBidCount = 0;
                } else {
                    p.stats.successNilBidCount = 0;
                    p.stats.failedNilBidCount = 1;
                }
            } else {
                if (p._result.tricks >= p._result.bid) {
                    p.stats.successBidCount = 1;
                    p.stats.failedBidCount = 0;
                } else {
                    p.stats.successBidCount = 0;
                    p.stats.failedBidCount = 1;
                }
            }
        }
    },
    setupDealHandler: function() {
        $('#deal').click(function(e) {
            window.started = true;
            var imgs = ['horizontal-trick', 'vertical-trick', 'players-thumbs', 'players-medium', 'players-large', 'speechleft', 'speechright', 'speechtop', 'trophy'];
            for (var i = 0; i < imgs.length; i++) {
                preloadImage('https://d3hp2os08tb528.cloudfront.net/shared/images/' + imgs[i] + '.png');
            }
            game.addPlayer(human);
            game.addPlayer(leftPlayer);
            game.addPlayer(topPlayer);
            game.addPlayer(rightPlayer);
            stats.startGame(game.players);
            game.message('');
            if (!window.results || window.results.length == 0) {
                window.results = [0, 0, 0, 0, 0, 0, 0, 0];
            }
            for (var i = 0; i < game.players.length; i++) {
                game.players[i].scoreLastRound = window.results[i * 2];
                game.players[i].bags = window.results[(i * 2) + 1];
            }
            webGame.setTestCards();
            game.deal();
            $('#deal').hide();
            $('#open-player-picker').hide();
            trackEvent('StartGame', playerCount + ' players', playerCount);
        });
    },
    extraSetup: function() {
        game.setEventRenderer('taketrick', webRenderer.takeTrick);
        game.setEventRenderer('bid', function(e) {
            trackEvent('Bid', e.player.name, e.bid);
            webRenderer.bid(e);
        });
        game.setEventRenderer('showscore', function(e) {
            var newResults = [];
            var r = [e.team1, e.team2, e.team1, e.team2];
            for (var i = 0; i < game.players.length; i++) {
                newResults.push(r[i].scoreTotal);
                newResults.push(r[i].bagsNextRound);
            }
            cake('results', '' + newResults);
            webGame.setScore.apply(webGame, newResults);
            if (window.roundNr) {
                $('.results h5').text('Round ' + roundNr).show();
                cake('round', roundNr);
            }
            webGame.saveLastDealer();
            window.result = e.team1.score > e.team2.score ? 'Win' : 'Lose';
            if (e.team1.score > e.team2.score) {
                trackEvent('Win', 'You & Bill');
            } else {
                trackEvent('Win', 'John & Lisa');
            }
            if (e.team1.score < 0 && e.team2.score < 0) {
                makePlayersSad([]);
            } else if (e.team1.score < 0) {
                makePlayersSad(['left-player', 'right-player']);
            } else if (e.team2.score < 0) {
                makePlayersSad(['top-player', 'bottom-player']);
            }
            trackEvent('FinishGame');
            trackEvent('BidResultYouBill-EINAR', e.team1.score >= 0 ? 'SUCCESS' : 'FAILURE', e.team1.score);
            trackEvent('BidResultJohnLisa-EINAR', e.team2.score >= 0 ? 'SUCCESS' : 'FAILURE', e.team2.score);
            trackEvent('Score', 'You & Bill', e.team1.score);
            trackEvent('Score', 'John & Lisa', e.team2.score);
            webGame.statsRegister(e.game.players, e.team1, e.team2);
            stats.finishGame(e.game.players);
            webRenderer.showScore(e);
        });
        game.setEventRenderer('win', function(e) {
            cake('results', '');
            if (window.roundNr) {
                $('.results h5').text('Round ' + roundNr).show();
            }
            cake('round', '0');
            $('#inline-score').hide();
            webGame.saveLastDealer();
            window.result = e.team1.scoreTotal > e.team2.scoreTotal ? 'Win' : 'Lose';
            webGame.setScore(e.team1.scoreTotal, e.team1.totalBags, e.team2.scoreTotal, e.team2.totalBags);
            trackEvent('Score', 'You & Bill', e.team1.score);
            trackEvent('Score', 'John & Lisa', e.team2.score);
            if (e.team1.score > e.team2.score) {
                trackEvent('Win', 'You & Bill');
            } else {
                trackEvent('Win', 'John & Lisa');
            }
            trackEvent('FinishGame');
            trackEvent('BidResultYouBill-EINAR', e.team1.score >= 0 ? 'SUCCESS' : 'FAILURE', e.team1.score);
            trackEvent('BidResultJohnLisa-EINAR', e.team2.score >= 0 ? 'SUCCESS' : 'FAILURE', e.team2.score);
            if (result == 'Win') {
                trackEvent('WinTournament', 'You & Bill');
                makePlayersSad(['top-player', 'bottom-player']);
            } else {
                trackEvent('WinTournament', 'John & Lisa');
                makePlayersSad(['right-player', 'left-player']);
            }
            webGame.statsRegister(e.game.players, e.team1, e.team2, true);
            stats.finishGame(e.game.players);
            webRenderer.showScore(e);
        });
        game.setEventRenderer('spadesbroken', webRenderer.spadesBroken);
        $('#reset-game').click(function() {
            if (confirm('This will erase all the scores and start a completely new game. Are you sure you want to do that?')) {
                cake('results', '');
                reloadPage();
            }
        });
        $('#start-new-tournament').click(function() {
            cake('results', '');
            reloadPage();
        });
        window.results = [];
        var oldResults = cake('results');
        if (oldResults) {
            var oldArray = oldResults.split(',');
            for (var i = 0; i < oldArray.length; i++) {
                results.push(parseFloat(oldArray[i]));
            }
            this.setScore.apply(this, results);
        }
        if (settings.showScoreCard) {
            $('#inline-score').show();
        }
        window.roundNr = (parseInt(cake('round')) + 1) || 1;
        webGame.loadLastDealer();
        human.startBid = function(maxBid) {
            $('#bid-div').css('z-index', zIndexCounter + 10000).show();
            var msg = 'Choose how many tricks you think you will be able to take.';
            window.game.message(msg);
            for (var i = 0; i <= maxBid; i++) {
                $('<span/>').text(i).appendTo('#bid-div > div').click(function() {
                    human.doBid(parseInt($(this).text()));
                    $('#bid-div').hide();
                    game.message('');
                }).mouseover(function() {
                    game.message('Bid ' + $(this).text());
                }).mouseout(function() {
                    game.message('');
                });
            }
        };
    }
}
WebCardGame.prototype.extend(WebSpades.prototype);
window.webGame = new WebSpades();