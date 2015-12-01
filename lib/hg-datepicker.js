(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.hgDatepicker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function head (a) {
  return a[0]
}

function last (a) {
  return a[a.length - 1]
}

function tail(a) {
  return a.slice(1)
}

function retreat (e) {
  return e.pop()
}

function hasLength (e) {
  return e.length
}

function any(ary, test) {
  for(var i=0;i<ary.length;i++)
    if(test(ary[i]))
      return true
  return false
}

function score (a) {
  return a.reduce(function (s, a) {
      return s + a.length + a[1] + 1
  }, 0)
}

function best (a, b) {
  return score(a) <= score(b) ? a : b
}


var _rules // set at the bottom  

// note, naive implementation. will break on circular objects.

function _equal(a, b) {
  if(a && !b) return false
  if(Array.isArray(a))
    if(a.length != b.length) return false
  if(a && 'object' == typeof a) {
    for(var i in a)
      if(!_equal(a[i], b[i])) return false
    for(var i in b)
      if(!_equal(a[i], b[i])) return false
    return true
  }
  return a == b
}

function getArgs(args) {
  return args.length == 1 ? args[0] : [].slice.call(args)
}

// return the index of the element not like the others, or -1
function oddElement(ary, cmp) {
  var c
  function guess(a) {
    var odd = -1
    c = 0
    for (var i = a; i < ary.length; i ++) {
      if(!cmp(ary[a], ary[i])) {
        odd = i, c++
      }
    }
    return c > 1 ? -1 : odd
  }
  //assume that it is the first element.
  var g = guess(0)
  if(-1 != g) return g
  //0 was the odd one, then all the other elements are equal
  //else there more than one different element
  guess(1)
  return c == 0 ? 0 : -1
}
var exports = module.exports = function (deps, exports) {
  var equal = (deps && deps.equal) || _equal
  exports = exports || {} 
  exports.lcs = 
  function lcs() {
    var cache = {}
    var args = getArgs(arguments)
    var a = args[0], b = args[1]

    function key (a,b){
      return a.length + ':' + b.length
    }

    //find length that matches at the head

    if(args.length > 2) {
      //if called with multiple sequences
      //recurse, since lcs(a, b, c, d) == lcs(lcs(a,b), lcs(c,d))
      args.push(lcs(args.shift(), args.shift()))
      return lcs(args)
    }
    
    //this would be improved by truncating input first
    //and not returning an lcs as an intermediate step.
    //untill that is a performance problem.

    var start = 0, end = 0
    for(var i = 0; i < a.length && i < b.length 
      && equal(a[i], b[i])
      ; i ++
    )
      start = i + 1

    if(a.length === start)
      return a.slice()

    for(var i = 0;  i < a.length - start && i < b.length - start
      && equal(a[a.length - 1 - i], b[b.length - 1 - i])
      ; i ++
    )
      end = i

    function recurse (a, b) {
      if(!a.length || !b.length) return []
      //avoid exponential time by caching the results
      if(cache[key(a, b)]) return cache[key(a, b)]

      if(equal(a[0], b[0]))
        return [head(a)].concat(recurse(tail(a), tail(b)))
      else { 
        var _a = recurse(tail(a), b)
        var _b = recurse(a, tail(b))
        return cache[key(a,b)] = _a.length > _b.length ? _a : _b  
      }
    }
    
    var middleA = a.slice(start, a.length - end)
    var middleB = b.slice(start, b.length - end)

    return (
      a.slice(0, start).concat(
        recurse(middleA, middleB)
      ).concat(a.slice(a.length - end))
    )
  }

  // given n sequences, calc the lcs, and then chunk strings into stable and unstable sections.
  // unstable chunks are passed to build
  exports.chunk =
  function (q, build) {
    var q = q.map(function (e) { return e.slice() })
    var lcs = exports.lcs.apply(null, q)
    var all = [lcs].concat(q)

    function matchLcs (e) {
      if(e.length && !lcs.length || !e.length && lcs.length)
        return false //incase the last item is null
      return equal(last(e), last(lcs)) || ((e.length + lcs.length) === 0)
    }

    while(any(q, hasLength)) {
      //if each element is at the lcs then this chunk is stable.
      while(q.every(matchLcs) && q.every(hasLength))
        all.forEach(retreat)
      //collect the changes in each array upto the next match with the lcs
      var c = false
      var unstable = q.map(function (e) {
        var change = []
        while(!matchLcs(e)) {
          change.unshift(retreat(e))
          c = true
        }
        return change
      })
      if(c) build(q[0].length, unstable)
    }
  }

  //calculate a diff this is only updates
  exports.optimisticDiff =
  function (a, b) {
    var M = Math.max(a.length, b.length)
    var m = Math.min(a.length, b.length)
    var patch = []
    for(var i = 0; i < M; i++)
      if(a[i] !== b[i]) {
        var cur = [i,0], deletes = 0
        while(a[i] !== b[i] && i < m) {
          cur[1] = ++deletes
          cur.push(b[i++])
        }
        //the rest are deletes or inserts
        if(i >= m) {
          //the rest are deletes
          if(a.length > b.length)
            cur[1] += a.length - b.length
          //the rest are inserts
          else if(a.length < b.length)
            cur = cur.concat(b.slice(a.length))
        }
        patch.push(cur)
      }

    return patch
  }

  exports.diff =
  function (a, b) {
    var optimistic = exports.optimisticDiff(a, b)
    var changes = []
    exports.chunk([a, b], function (index, unstable) {
      var del = unstable.shift().length
      var insert = unstable.shift()
      changes.push([index, del].concat(insert))
    })
    return best(optimistic, changes)
  }

  exports.patch = function (a, changes, mutate) {
    if(mutate !== true) a = a.slice(a)//copy a
    changes.forEach(function (change) {
      [].splice.apply(a, change)
    })
    return a
  }

  // http://en.wikipedia.org/wiki/Concestor
  // me, concestor, you...
  exports.merge = function () {
    var args = getArgs(arguments)
    var patch = exports.diff3(args)
    return exports.patch(args[0], patch)
  }

  exports.diff3 = function () {
    var args = getArgs(arguments)
    var r = []
    exports.chunk(args, function (index, unstable) {
      var mine = unstable[0]
      var insert = resolve(unstable)
      if(equal(mine, insert)) return 
      r.push([index, mine.length].concat(insert)) 
    })
    return r
  }
  exports.oddOneOut =
    function oddOneOut (changes) {
      changes = changes.slice()
      //put the concestor first
      changes.unshift(changes.splice(1,1)[0])
      var i = oddElement(changes, equal)
      if(i == 0) // concestor was different, 'false conflict'
        return changes[1]
      if (~i)
        return changes[i] 
    }
  exports.insertMergeOverDelete = 
    //i've implemented this as a seperate rule,
    //because I had second thoughts about this.
    function insertMergeOverDelete (changes) {
      changes = changes.slice()
      changes.splice(1,1)// remove concestor
      
      //if there is only one non empty change thats okay.
      //else full confilct
      for (var i = 0, nonempty; i < changes.length; i++)
        if(changes[i].length) 
          if(!nonempty) nonempty = changes[i]
          else return // full conflict
      return nonempty
    }

  var rules = (deps && deps.rules) || [exports.oddOneOut, exports.insertMergeOverDelete]

  function resolve (changes) {
    var l = rules.length
    for (var i in rules) { // first
      
      var c = rules[i] && rules[i](changes)
      if(c) return c
    }
    changes.splice(1,1) // remove concestor
    //returning the conflicts as an object is a really bad idea,
    // because == will not detect they are the same. and conflicts build.
    // better to use
    // '<<<<<<<<<<<<<'
    // of course, i wrote this before i started on snob, so i didn't know that then.
    /*var conflict = ['>>>>>>>>>>>>>>>>']
    while(changes.length)
      conflict = conflict.concat(changes.shift()).concat('============')
    conflict.pop()
    conflict.push          ('<<<<<<<<<<<<<<<')
    changes.unshift       ('>>>>>>>>>>>>>>>')
    return conflict*/
    //nah, better is just to use an equal can handle objects
    return {'?': changes}
  }
  return exports
}
exports(null, exports)

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],4:[function(require,module,exports){
module.exports = function(obj) {
    if (typeof obj === 'string') return camelCase(obj);
    return walk(obj);
};

function walk (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (isDate(obj) || isRegex(obj)) return obj;
    if (isArray(obj)) return map(obj, walk);
    return reduce(objectKeys(obj), function (acc, key) {
        var camel = camelCase(key);
        acc[camel] = walk(obj[key]);
        return acc;
    }, {});
}

function camelCase(str) {
    return str.replace(/[_.-](\w|$)/g, function (_,x) {
        return x.toUpperCase();
    });
}

var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
};

var isDate = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Date]';
};

var isRegex = function (obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var has = Object.prototype.hasOwnProperty;
var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

function map (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        res.push(f(xs[i], i));
    }
    return res;
}

function reduce (xs, f, acc) {
    if (xs.reduce) return xs.reduce(f, acc);
    for (var i = 0; i < xs.length; i++) {
        acc = f(acc, xs[i], i);
    }
    return acc;
}

},{}],5:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) +
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],6:[function(require,module,exports){
/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

(function(global) {
  'use strict';

  var dateFormat = (function() {
      var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZWN]|'[^']*'|'[^']*'/g;
      var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
      var timezoneClip = /[^-+\dA-Z]/g;
  
      // Regexes and supporting functions are cached through closure
      return function (date, mask, utc, gmt) {
  
        // You can't provide utc if you skip other args (use the 'UTC:' mask prefix)
        if (arguments.length === 1 && kindOf(date) === 'string' && !/\d/.test(date)) {
          mask = date;
          date = undefined;
        }
  
        date = date || new Date;
  
        if(!(date instanceof Date)) {
          date = new Date(date);
        }
  
        if (isNaN(date)) {
          throw TypeError('Invalid date');
        }
  
        mask = String(dateFormat.masks[mask] || mask || dateFormat.masks['default']);
  
        // Allow setting the utc/gmt argument via the mask
        var maskSlice = mask.slice(0, 4);
        if (maskSlice === 'UTC:' || maskSlice === 'GMT:') {
          mask = mask.slice(4);
          utc = true;
          if (maskSlice === 'GMT:') {
            gmt = true;
          }
        }
  
        var _ = utc ? 'getUTC' : 'get';
        var d = date[_ + 'Date']();
        var D = date[_ + 'Day']();
        var m = date[_ + 'Month']();
        var y = date[_ + 'FullYear']();
        var H = date[_ + 'Hours']();
        var M = date[_ + 'Minutes']();
        var s = date[_ + 'Seconds']();
        var L = date[_ + 'Milliseconds']();
        var o = utc ? 0 : date.getTimezoneOffset();
        var W = getWeek(date);
        var N = getDayOfWeek(date);
        var flags = {
          d:    d,
          dd:   pad(d),
          ddd:  dateFormat.i18n.dayNames[D],
          dddd: dateFormat.i18n.dayNames[D + 7],
          m:    m + 1,
          mm:   pad(m + 1),
          mmm:  dateFormat.i18n.monthNames[m],
          mmmm: dateFormat.i18n.monthNames[m + 12],
          yy:   String(y).slice(2),
          yyyy: y,
          h:    H % 12 || 12,
          hh:   pad(H % 12 || 12),
          H:    H,
          HH:   pad(H),
          M:    M,
          MM:   pad(M),
          s:    s,
          ss:   pad(s),
          l:    pad(L, 3),
          L:    pad(Math.round(L / 10)),
          t:    H < 12 ? 'a'  : 'p',
          tt:   H < 12 ? 'am' : 'pm',
          T:    H < 12 ? 'A'  : 'P',
          TT:   H < 12 ? 'AM' : 'PM',
          Z:    gmt ? 'GMT' : utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
          o:    (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
          S:    ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10],
          W:    W,
          N:    N
        };
  
        return mask.replace(token, function (match) {
          if (match in flags) {
            return flags[match];
          }
          return match.slice(1, match.length - 1);
        });
      };
    })();

  dateFormat.masks = {
    'default':               'ddd mmm dd yyyy HH:MM:ss',
    'shortDate':             'm/d/yy',
    'mediumDate':            'mmm d, yyyy',
    'longDate':              'mmmm d, yyyy',
    'fullDate':              'dddd, mmmm d, yyyy',
    'shortTime':             'h:MM TT',
    'mediumTime':            'h:MM:ss TT',
    'longTime':              'h:MM:ss TT Z',
    'isoDate':               'yyyy-mm-dd',
    'isoTime':               'HH:MM:ss',
    'isoDateTime':           'yyyy-mm-dd\'T\'HH:MM:sso',
    'isoUtcDateTime':        'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\'',
    'expiresHeaderFormat':   'ddd, dd mmm yyyy HH:MM:ss Z'
  };

  // Internationalization strings
  dateFormat.i18n = {
    dayNames: [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ],
    monthNames: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ]
  };

function pad(val, len) {
  val = String(val);
  len = len || 2;
  while (val.length < len) {
    val = '0' + val;
  }
  return val;
}

/**
 * Get the ISO 8601 week number
 * Based on comments from
 * http://techblog.procurios.nl/k/n618/news/view/33796/14863/Calculate-ISO-8601-week-and-year-in-javascript.html
 *
 * @param  {Object} `date`
 * @return {Number}
 */
function getWeek(date) {
  // Remove time components of date
  var targetThursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Change date to Thursday same week
  targetThursday.setDate(targetThursday.getDate() - ((targetThursday.getDay() + 6) % 7) + 3);

  // Take January 4th as it is always in week 1 (see ISO 8601)
  var firstThursday = new Date(targetThursday.getFullYear(), 0, 4);

  // Change date to Thursday same week
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

  // Check if daylight-saving-time-switch occured and correct for it
  var ds = targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
  targetThursday.setHours(targetThursday.getHours() - ds);

  // Number of weeks between target Thursday and first Thursday
  var weekDiff = (targetThursday - firstThursday) / (86400000*7);
  return 1 + Math.floor(weekDiff);
}

/**
 * Get ISO-8601 numeric representation of the day of the week
 * 1 (for Monday) through 7 (for Sunday)
 * 
 * @param  {Object} `date`
 * @return {Number}
 */
function getDayOfWeek(date) {
  var dow = date.getDay();
  if(dow === 0) {
    dow = 7;
  }
  return dow;
}

/**
 * kind-of shortcut
 * @param  {*} val
 * @return {String}
 */
function kindOf(val) {
  if (val === null) {
    return 'null';
  }

  if (val === undefined) {
    return 'undefined';
  }

  if (typeof val !== 'object') {
    return typeof val;
  }

  if (Array.isArray(val)) {
    return 'array';
  }

  return {}.toString.call(val)
    .slice(8, -1).toLowerCase();
};



  if (typeof define === 'function' && define.amd) {
    define(function () {
      return dateFormat;
    });
  } else if (typeof exports === 'object') {
    module.exports = dateFormat;
  } else {
    global.dateFormat = dateFormat;
  }
})(this);

},{}],7:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = addEvent

function addEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        events[type] = handler
    } else if (Array.isArray(event)) {
        if (event.indexOf(handler) === -1) {
            event.push(handler)
        }
    } else if (event !== handler) {
        events[type] = [event, handler]
    }
}

},{"ev-store":14}],8:[function(require,module,exports){
var globalDocument = require("global/document")
var EvStore = require("ev-store")
var createStore = require("weakmap-shim/create-store")

var addEvent = require("./add-event.js")
var removeEvent = require("./remove-event.js")
var ProxyEvent = require("./proxy-event.js")

var HANDLER_STORE = createStore()

module.exports = DOMDelegator

function DOMDelegator(document) {
    if (!(this instanceof DOMDelegator)) {
        return new DOMDelegator(document);
    }

    document = document || globalDocument

    this.target = document.documentElement
    this.events = {}
    this.rawEventListeners = {}
    this.globalListeners = {}
}

DOMDelegator.prototype.addEventListener = addEvent
DOMDelegator.prototype.removeEventListener = removeEvent

DOMDelegator.allocateHandle =
    function allocateHandle(func) {
        var handle = new Handle()

        HANDLER_STORE(handle).func = func;

        return handle
    }

DOMDelegator.transformHandle =
    function transformHandle(handle, broadcast) {
        var func = HANDLER_STORE(handle).func

        return this.allocateHandle(function (ev) {
            broadcast(ev, func);
        })
    }

DOMDelegator.prototype.addGlobalEventListener =
    function addGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];
        if (listeners.indexOf(fn) === -1) {
            listeners.push(fn)
        }

        this.globalListeners[eventName] = listeners;
    }

DOMDelegator.prototype.removeGlobalEventListener =
    function removeGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];

        var index = listeners.indexOf(fn)
        if (index !== -1) {
            listeners.splice(index, 1)
        }
    }

DOMDelegator.prototype.listenTo = function listenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    this.events[eventName]++;

    if (this.events[eventName] !== 1) {
        return
    }

    var listener = this.rawEventListeners[eventName]
    if (!listener) {
        listener = this.rawEventListeners[eventName] =
            createHandler(eventName, this)
    }

    this.target.addEventListener(eventName, listener, true)
}

DOMDelegator.prototype.unlistenTo = function unlistenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    if (this.events[eventName] === 0) {
        throw new Error("already unlistened to event.");
    }

    this.events[eventName]--;

    if (this.events[eventName] !== 0) {
        return
    }

    var listener = this.rawEventListeners[eventName]

    if (!listener) {
        throw new Error("dom-delegator#unlistenTo: cannot " +
            "unlisten to " + eventName)
    }

    this.target.removeEventListener(eventName, listener, true)
}

function createHandler(eventName, delegator) {
    var globalListeners = delegator.globalListeners;
    var delegatorTarget = delegator.target;

    return handler

    function handler(ev) {
        var globalHandlers = globalListeners[eventName] || []

        if (globalHandlers.length > 0) {
            var globalEvent = new ProxyEvent(ev);
            globalEvent.currentTarget = delegatorTarget;
            callListeners(globalHandlers, globalEvent)
        }

        findAndInvokeListeners(ev.target, ev, eventName)
    }
}

function findAndInvokeListeners(elem, ev, eventName) {
    var listener = getListener(elem, eventName)

    if (listener && listener.handlers.length > 0) {
        var listenerEvent = new ProxyEvent(ev);
        listenerEvent.currentTarget = listener.currentTarget
        callListeners(listener.handlers, listenerEvent)

        if (listenerEvent._bubbles) {
            var nextTarget = listener.currentTarget.parentNode
            findAndInvokeListeners(nextTarget, ev, eventName)
        }
    }
}

function getListener(target, type) {
    // terminate recursion if parent is `null`
    if (target === null || typeof target === "undefined") {
        return null
    }

    var events = EvStore(target)
    // fetch list of handler fns for this event
    var handler = events[type]
    var allHandler = events.event

    if (!handler && !allHandler) {
        return getListener(target.parentNode, type)
    }

    var handlers = [].concat(handler || [], allHandler || [])
    return new Listener(target, handlers)
}

function callListeners(handlers, ev) {
    handlers.forEach(function (handler) {
        if (typeof handler === "function") {
            handler(ev)
        } else if (typeof handler.handleEvent === "function") {
            handler.handleEvent(ev)
        } else if (handler.type === "dom-delegator-handle") {
            HANDLER_STORE(handler).func(ev)
        } else {
            throw new Error("dom-delegator: unknown handler " +
                "found: " + JSON.stringify(handlers));
        }
    })
}

function Listener(target, handlers) {
    this.currentTarget = target
    this.handlers = handlers
}

function Handle() {
    this.type = "dom-delegator-handle"
}

},{"./add-event.js":7,"./proxy-event.js":10,"./remove-event.js":11,"ev-store":14,"global/document":22,"weakmap-shim/create-store":88}],9:[function(require,module,exports){
var Individual = require("individual")
var cuid = require("cuid")
var globalDocument = require("global/document")

var DOMDelegator = require("./dom-delegator.js")

var versionKey = "13"
var cacheKey = "__DOM_DELEGATOR_CACHE@" + versionKey
var cacheTokenKey = "__DOM_DELEGATOR_CACHE_TOKEN@" + versionKey
var delegatorCache = Individual(cacheKey, {
    delegators: {}
})
var commonEvents = [
    "blur", "change", "click",  "contextmenu", "dblclick",
    "error","focus", "focusin", "focusout", "input", "keydown",
    "keypress", "keyup", "load", "mousedown", "mouseup",
    "resize", "select", "submit", "touchcancel",
    "touchend", "touchstart", "unload"
]

/*  Delegator is a thin wrapper around a singleton `DOMDelegator`
        instance.

    Only one DOMDelegator should exist because we do not want
        duplicate event listeners bound to the DOM.

    `Delegator` will also `listenTo()` all events unless
        every caller opts out of it
*/
module.exports = Delegator

function Delegator(opts) {
    opts = opts || {}
    var document = opts.document || globalDocument

    var cacheKey = document[cacheTokenKey]

    if (!cacheKey) {
        cacheKey =
            document[cacheTokenKey] = cuid()
    }

    var delegator = delegatorCache.delegators[cacheKey]

    if (!delegator) {
        delegator = delegatorCache.delegators[cacheKey] =
            new DOMDelegator(document)
    }

    if (opts.defaultEvents !== false) {
        for (var i = 0; i < commonEvents.length; i++) {
            delegator.listenTo(commonEvents[i])
        }
    }

    return delegator
}

Delegator.allocateHandle = DOMDelegator.allocateHandle;
Delegator.transformHandle = DOMDelegator.transformHandle;

},{"./dom-delegator.js":8,"cuid":5,"global/document":22,"individual":23}],10:[function(require,module,exports){
var inherits = require("inherits")

var ALL_PROPS = [
    "altKey", "bubbles", "cancelable", "ctrlKey",
    "eventPhase", "metaKey", "relatedTarget", "shiftKey",
    "target", "timeStamp", "type", "view", "which"
]
var KEY_PROPS = ["char", "charCode", "key", "keyCode"]
var MOUSE_PROPS = [
    "button", "buttons", "clientX", "clientY", "layerX",
    "layerY", "offsetX", "offsetY", "pageX", "pageY",
    "screenX", "screenY", "toElement"
]

var rkeyEvent = /^key|input/
var rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/

module.exports = ProxyEvent

function ProxyEvent(ev) {
    if (!(this instanceof ProxyEvent)) {
        return new ProxyEvent(ev)
    }

    if (rkeyEvent.test(ev.type)) {
        return new KeyEvent(ev)
    } else if (rmouseEvent.test(ev.type)) {
        return new MouseEvent(ev)
    }

    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    this._rawEvent = ev
    this._bubbles = false;
}

ProxyEvent.prototype.preventDefault = function () {
    this._rawEvent.preventDefault()
}

ProxyEvent.prototype.startPropagation = function () {
    this._bubbles = true;
}

function MouseEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < MOUSE_PROPS.length; j++) {
        var mousePropKey = MOUSE_PROPS[j]
        this[mousePropKey] = ev[mousePropKey]
    }

    this._rawEvent = ev
}

inherits(MouseEvent, ProxyEvent)

function KeyEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < KEY_PROPS.length; j++) {
        var keyPropKey = KEY_PROPS[j]
        this[keyPropKey] = ev[keyPropKey]
    }

    this._rawEvent = ev
}

inherits(KeyEvent, ProxyEvent)

},{"inherits":24}],11:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = removeEvent

function removeEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        return
    } else if (Array.isArray(event)) {
        var index = event.indexOf(handler)
        if (index !== -1) {
            event.splice(index, 1)
        }
    } else if (event === handler) {
        events[type] = null
    }
}

},{"ev-store":14}],12:[function(require,module,exports){
var slice = Array.prototype.slice

module.exports = iterativelyWalk

function iterativelyWalk(nodes, cb) {
    if (!('length' in nodes)) {
        nodes = [nodes]
    }
    
    nodes = slice.call(nodes)

    while(nodes.length) {
        var node = nodes.shift(),
            ret = cb(node)

        if (ret) {
            return ret
        }

        if (node.childNodes && node.childNodes.length) {
            nodes = slice.call(node.childNodes).concat(nodes)
        }
    }
}

},{}],13:[function(require,module,exports){
var camelize = require("camelize")
var template = require("string-template")
var extend = require("xtend/mutable")

module.exports = TypedError

function TypedError(args) {
    if (!args) {
        throw new Error("args is required");
    }
    if (!args.type) {
        throw new Error("args.type is required");
    }
    if (!args.message) {
        throw new Error("args.message is required");
    }

    var message = args.message

    if (args.type && !args.name) {
        var errorName = camelize(args.type) + "Error"
        args.name = errorName[0].toUpperCase() + errorName.substr(1)
    }

    extend(createError, args);
    createError._name = args.name;

    return createError;

    function createError(opts) {
        var result = new Error()

        Object.defineProperty(result, "type", {
            value: result.type,
            enumerable: true,
            writable: true,
            configurable: true
        })

        var options = extend({}, args, opts)

        extend(result, options)
        result.message = template(message, options)

        return result
    }
}


},{"camelize":4,"string-template":52,"xtend/mutable":92}],14:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":16}],15:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],16:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":15}],17:[function(require,module,exports){
var walk = require('dom-walk')

var FormData = require('./index.js')

module.exports = getFormData

function buildElems(rootElem) {
    var hash = {}
    if (rootElem.name) {
    	hash[rootElem.name] = rootElem
    }

    walk(rootElem, function (child) {
        if (child.name) {
            hash[child.name] = child
        }
    })


    return hash
}

function getFormData(rootElem) {
    var elements = buildElems(rootElem)

    return FormData(elements)
}

},{"./index.js":18,"dom-walk":12}],18:[function(require,module,exports){
/*jshint maxcomplexity: 10*/

module.exports = FormData

//TODO: Massive spec: http://www.whatwg.org/specs/web-apps/current-work/multipage/association-of-controls-and-forms.html#constructing-form-data-set
function FormData(elements) {
    return Object.keys(elements).reduce(function (acc, key) {
        var elem = elements[key]

        acc[key] = valueOfElement(elem)

        return acc
    }, {})
}

function valueOfElement(elem) {
    if (typeof elem === "function") {
        return elem()
    } else if (containsRadio(elem)) {
        var elems = toList(elem)
        var checked = elems.filter(function (elem) {
            return elem.checked
        })[0] || null

        return checked ? checked.value : null
    } else if (Array.isArray(elem)) {
        return elem.map(valueOfElement).filter(filterNull)
    } else if (elem.tagName === undefined && elem.nodeType === undefined) {
        return FormData(elem)
    } else if (elem.tagName === "INPUT" && isChecked(elem)) {
        if (elem.hasAttribute("value")) {
            return elem.checked ? elem.value : null
        } else {
            return elem.checked
        }
    } else if (elem.tagName === "INPUT") {
        return elem.value
    } else if (elem.tagName === "TEXTAREA") {
        return elem.value
    } else if (elem.tagName === "SELECT") {
        return elem.value
    }
}

function isChecked(elem) {
    return elem.type === "checkbox" || elem.type === "radio"
}

function containsRadio(value) {
    if (value.tagName || value.nodeType) {
        return false
    }

    var elems = toList(value)

    return elems.some(function (elem) {
        return elem.tagName === "INPUT" && elem.type === "radio"
    })
}

function toList(value) {
    if (Array.isArray(value)) {
        return value
    }

    return Object.keys(value).map(prop, value)
}

function prop(x) {
    return this[x]
}

function filterNull(val) {
    return val !== null
}

},{}],19:[function(require,module,exports){
module.exports = Event

function Event() {
    var listeners = []

    return { broadcast: broadcast, listen: event }

    function broadcast(value) {
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](value)
        }
    }

    function event(listener) {
        listeners.push(listener)

        return removeListener

        function removeListener() {
            var index = listeners.indexOf(listener)
            if (index !== -1) {
                listeners.splice(index, 1)
            }
        }
    }
}

},{}],20:[function(require,module,exports){
var event = require("./single.js")

module.exports = multiple

function multiple(names) {
    return names.reduce(function (acc, name) {
        acc[name] = event()
        return acc
    }, {})
}

},{"./single.js":21}],21:[function(require,module,exports){
var Event = require('./event.js')

module.exports = Single

function Single() {
    var tuple = Event()

    return function event(value) {
        if (typeof value === "function") {
            return tuple.listen(value)
        } else {
            return tuple.broadcast(value)
        }
    }
}

},{"./event.js":19}],22:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":2}],23:[function(require,module,exports){
(function (global){
var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual

function Individual(key, value) {
    if (root[key]) {
        return root[key]
    }

    Object.defineProperty(root, key, {
        value: value
        , configurable: true
    })

    return value
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],24:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],25:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],26:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],27:[function(require,module,exports){
(function (global){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var bindCallback = require('lodash._bindcallback');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeFloor = Math.floor,
    nativeIsFinite = global.isFinite,
    nativeMin = Math.min;

/** Used as references for the maximum length and index of an array. */
var MAX_ARRAY_LENGTH = 4294967295;

/**
 * Invokes the iteratee function `n` times, returning an array of the results
 * of each invocation. The `iteratee` is bound to `thisArg` and invoked with
 * one argument; (index).
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array} Returns the array of results.
 * @example
 *
 * var diceRolls = _.times(3, _.partial(_.random, 1, 6, false));
 * // => [3, 6, 4]
 *
 * _.times(3, function(n) {
 *   mage.castSpell(n);
 * });
 * // => invokes `mage.castSpell(n)` three times with `n` of `0`, `1`, and `2`
 *
 * _.times(3, function(n) {
 *   this.cast(n);
 * }, mage);
 * // => also invokes `mage.castSpell(n)` three times
 */
function times(n, iteratee, thisArg) {
  n = nativeFloor(n);

  // Exit early to avoid a JSC JIT bug in Safari 8
  // where `Array(0)` is treated as `Array(1)`.
  if (n < 1 || !nativeIsFinite(n)) {
    return [];
  }
  var index = -1,
      result = Array(nativeMin(n, MAX_ARRAY_LENGTH));

  iteratee = bindCallback(iteratee, thisArg, 1);
  while (++index < n) {
    if (index < MAX_ARRAY_LENGTH) {
      result[index] = iteratee(index);
    } else {
      iteratee(index);
    }
  }
  return result;
}

module.exports = times;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"lodash._bindcallback":26}],28:[function(require,module,exports){
var raf = require("raf")
var TypedError = require("error/typed")

var InvalidUpdateInRender = TypedError({
    type: "main-loop.invalid.update.in-render",
    message: "main-loop: Unexpected update occurred in loop.\n" +
        "We are currently rendering a view, " +
            "you can't change state right now.\n" +
        "The diff is: {stringDiff}.\n" +
        "SUGGESTED FIX: find the state mutation in your view " +
            "or rendering function and remove it.\n" +
        "The view should not have any side effects.\n",
    diff: null,
    stringDiff: null
})

module.exports = main

function main(initialState, view, opts) {
    opts = opts || {}

    var currentState = initialState
    var create = opts.create
    var diff = opts.diff
    var patch = opts.patch
    var redrawScheduled = false

    var tree = opts.initialTree || view(currentState)
    var target = opts.target || create(tree, opts)
    var inRenderingTransaction = false

    currentState = null

    var loop = {
        state: initialState,
        target: target,
        update: update
    }
    return loop

    function update(state) {
        if (inRenderingTransaction) {
            throw InvalidUpdateInRender({
                diff: state._diff,
                stringDiff: JSON.stringify(state._diff)
            })
        }

        if (currentState === null && !redrawScheduled) {
            redrawScheduled = true
            raf(redraw)
        }

        currentState = state
        loop.state = state
    }

    function redraw() {
        redrawScheduled = false
        if (currentState === null) {
            return
        }

        inRenderingTransaction = true
        var newTree = view(currentState)

        if (opts.createOnly) {
            inRenderingTransaction = false
            create(newTree, opts)
        } else {
            var patches = diff(tree, newTree, opts)
            inRenderingTransaction = false
            target = patch(target, patches, opts)
        }

        tree = newTree
        currentState = null
    }
}

},{"error/typed":13,"raf":51}],29:[function(require,module,exports){
'use strict';

var SingleEvent = require('geval/single');
var MultipleEvent = require('geval/multiple');
var extend = require('xtend');

/*
    Pro tip: Don't require `mercury` itself.
      require and depend on all these modules directly!
*/
var mercury = module.exports = {
    // Entry
    main: require('main-loop'),
    app: app,

    // Base
    BaseEvent: require('value-event/base-event'),

    // Input
    Delegator: require('dom-delegator'),
    // deprecated: use hg.channels instead.
    input: input,
    // deprecated: use hg.channels instead.
    handles: channels,
    channels: channels,
    // deprecated: use hg.send instead.
    event: require('value-event/event'),
    send: require('value-event/event'),
    // deprecated: use hg.sendValue instead.
    valueEvent: require('value-event/value'),
    sendValue: require('value-event/value'),
    // deprecated: use hg.sendSubmit instead.
    submitEvent: require('value-event/submit'),
    sendSubmit: require('value-event/submit'),
    // deprecated: use hg.sendChange instead.
    changeEvent: require('value-event/change'),
    sendChange: require('value-event/change'),
    // deprecated: use hg.sendKey instead.
    keyEvent: require('value-event/key'),
    sendKey: require('value-event/key'),
    // deprecated use hg.sendClick instead.
    clickEvent: require('value-event/click'),
    sendClick: require('value-event/click'),

    // State
    // remove from core: favor hg.varhash instead.
    array: require('observ-array'),
    struct: require('observ-struct'),
    // deprecated: use hg.struct instead.
    hash: require('observ-struct'),
    varhash: require('observ-varhash'),
    value: require('observ'),
    state: state,

    // Render
    diff: require('virtual-dom/vtree/diff'),
    patch: require('virtual-dom/vdom/patch'),
    partial: require('vdom-thunk'),
    create: require('virtual-dom/vdom/create-element'),
    h: require('virtual-dom/virtual-hyperscript'),

    // Utilities
    // remove from core: require computed directly instead.
    computed: require('observ/computed'),
    // remove from core: require watch directly instead.
    watch: require('observ/watch')
};

function input(names) {
    if (!names) {
        return SingleEvent();
    }

    return MultipleEvent(names);
}

function state(obj) {
    var copy = extend(obj);
    var $channels = copy.channels;
    var $handles = copy.handles;

    if ($channels) {
        copy.channels = mercury.value(null);
    } else if ($handles) {
        copy.handles = mercury.value(null);
    }

    var observ = mercury.struct(copy);
    if ($channels) {
        observ.channels.set(mercury.channels($channels, observ));
    } else if ($handles) {
        observ.handles.set(mercury.channels($handles, observ));
    }
    return observ;
}

function channels(funcs, context) {
    return Object.keys(funcs).reduce(createHandle, {});

    function createHandle(acc, name) {
        var handle = mercury.Delegator.allocateHandle(
            funcs[name].bind(null, context));

        acc[name] = handle;
        return acc;
    }
}

function app(elem, observ, render, opts) {
    mercury.Delegator(opts);
    var loop = mercury.main(observ(), render, extend({
        diff: mercury.diff,
        create: mercury.create,
        patch: mercury.patch
    }, opts));
    if (elem) {
        elem.appendChild(loop.target);
    }
    return observ(loop.update);
}

},{"dom-delegator":9,"geval/multiple":20,"geval/single":21,"main-loop":28,"observ":47,"observ-array":36,"observ-struct":42,"observ-varhash":44,"observ/computed":46,"observ/watch":48,"value-event/base-event":53,"value-event/change":54,"value-event/click":55,"value-event/event":56,"value-event/key":57,"value-event/submit":60,"value-event/value":61,"vdom-thunk":63,"virtual-dom/vdom/create-element":67,"virtual-dom/vdom/patch":70,"virtual-dom/virtual-hyperscript":74,"virtual-dom/vtree/diff":87,"xtend":91}],30:[function(require,module,exports){
'use strict';
module.exports = function (month, year) {
	var now = new Date();
	month = month == null ? now.getUTCMonth() : month;
	year = year == null ? now.getUTCFullYear() : year;

	return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

},{}],31:[function(require,module,exports){
var setNonEnumerable = require("./lib/set-non-enumerable.js");

module.exports = addListener

function addListener(observArray, observ) {
    var list = observArray._list

    return observ(function (value) {
        var valueList =  observArray().slice()
        var index = list.indexOf(observ)

        // This code path should never hit. If this happens
        // there's a bug in the cleanup code
        if (index === -1) {
            var message = "observ-array: Unremoved observ listener"
            var err = new Error(message)
            err.list = list
            err.index = index
            err.observ = observ
            throw err
        }

        valueList.splice(index, 1, value)
        setNonEnumerable(valueList, "_diff", [ [index, 1, value] ])

        observArray._observSet(valueList)
    })
}

},{"./lib/set-non-enumerable.js":37}],32:[function(require,module,exports){
var addListener = require('./add-listener.js')

module.exports = applyPatch

function applyPatch (valueList, args) {
    var obs = this
    var valueArgs = args.map(unpack)

    valueList.splice.apply(valueList, valueArgs)
    obs._list.splice.apply(obs._list, args)

    var extraRemoveListeners = args.slice(2).map(function (observ) {
        return typeof observ === "function" ?
            addListener(obs, observ) :
            null
    })

    extraRemoveListeners.unshift(args[0], args[1])
    var removedListeners = obs._removeListeners.splice
        .apply(obs._removeListeners, extraRemoveListeners)

    removedListeners.forEach(function (removeObservListener) {
        if (removeObservListener) {
            removeObservListener()
        }
    })

    return valueArgs
}

function unpack(value, index){
    if (index === 0 || index === 1) {
        return value
    }
    return typeof value === "function" ? value() : value
}

},{"./add-listener.js":31}],33:[function(require,module,exports){
var ObservArray = require("./index.js")

var slice = Array.prototype.slice

var ARRAY_METHODS = [
    "concat", "slice", "every", "filter", "forEach", "indexOf",
    "join", "lastIndexOf", "map", "reduce", "reduceRight",
    "some", "toString", "toLocaleString"
]

var methods = ARRAY_METHODS.map(function (name) {
    return [name, function () {
        var res = this._list[name].apply(this._list, arguments)

        if (res && Array.isArray(res)) {
            res = ObservArray(res)
        }

        return res
    }]
})

module.exports = ArrayMethods

function ArrayMethods(obs) {
    obs.push = observArrayPush
    obs.pop = observArrayPop
    obs.shift = observArrayShift
    obs.unshift = observArrayUnshift
    obs.reverse = require("./array-reverse.js")
    obs.sort = require("./array-sort.js")

    methods.forEach(function (tuple) {
        obs[tuple[0]] = tuple[1]
    })
    return obs
}



function observArrayPush() {
    var args = slice.call(arguments)
    args.unshift(this._list.length, 0)
    this.splice.apply(this, args)

    return this._list.length
}
function observArrayPop() {
    return this.splice(this._list.length - 1, 1)[0]
}
function observArrayShift() {
    return this.splice(0, 1)[0]
}
function observArrayUnshift() {
    var args = slice.call(arguments)
    args.unshift(0, 0)
    this.splice.apply(this, args)

    return this._list.length
}


function notImplemented() {
    throw new Error("Pull request welcome")
}

},{"./array-reverse.js":34,"./array-sort.js":35,"./index.js":36}],34:[function(require,module,exports){
var applyPatch = require("./apply-patch.js")
var setNonEnumerable = require('./lib/set-non-enumerable.js')

module.exports = reverse

function reverse() {
    var obs = this
    var changes = fakeDiff(obs._list.slice().reverse())
    var valueList = obs().slice().reverse()

    var valueChanges = changes.map(applyPatch.bind(obs, valueList))

    setNonEnumerable(valueList, "_diff", valueChanges)

    obs._observSet(valueList)
    return changes
}

function fakeDiff(arr) {
    var _diff
    var len = arr.length

    if(len % 2) {
        var midPoint = (len -1) / 2
        var a = [0, midPoint].concat(arr.slice(0, midPoint))
        var b = [midPoint +1, midPoint].concat(arr.slice(midPoint +1, len))
        var _diff = [a, b]
    } else {
        _diff = [ [0, len].concat(arr) ]
    }

    return _diff
}

},{"./apply-patch.js":32,"./lib/set-non-enumerable.js":37}],35:[function(require,module,exports){
var applyPatch = require("./apply-patch.js")
var setNonEnumerable = require("./lib/set-non-enumerable.js")

module.exports = sort

function sort(compare) {
    var obs = this
    var list = obs._list.slice()

    var unpacked = unpack(list)

    var sorted = unpacked
            .map(function(it) { return it.val })
            .sort(compare)

    var packed = repack(sorted, unpacked)

    //fake diff - for perf
    //adiff on 10k items === ~3200ms
    //fake on 10k items === ~110ms
    var changes = [ [ 0, packed.length ].concat(packed) ]

    var valueChanges = changes.map(applyPatch.bind(obs, sorted))

    setNonEnumerable(sorted, "_diff", valueChanges)

    obs._observSet(sorted)
    return changes
}

function unpack(list) {
    var unpacked = []
    for(var i = 0; i < list.length; i++) {
        unpacked.push({
            val: ("function" == typeof list[i]) ? list[i]() : list[i],
            obj: list[i]
        })
    }
    return unpacked
}

function repack(sorted, unpacked) {
    var packed = []

    while(sorted.length) {
        var s = sorted.shift()
        var indx = indexOf(s, unpacked)
        if(~indx) packed.push(unpacked.splice(indx, 1)[0].obj)
    }

    return packed
}

function indexOf(n, h) {
    for(var i = 0; i < h.length; i++) {
        if(n === h[i].val) return i
    }
    return -1
}

},{"./apply-patch.js":32,"./lib/set-non-enumerable.js":37}],36:[function(require,module,exports){
var Observ = require("observ")

// circular dep between ArrayMethods & this file
module.exports = ObservArray

var splice = require("./splice.js")
var put = require("./put.js")
var set = require("./set.js")
var transaction = require("./transaction.js")
var ArrayMethods = require("./array-methods.js")
var addListener = require("./add-listener.js")


/*  ObservArray := (Array<T>) => Observ<
        Array<T> & { _diff: Array }
    > & {
        splice: (index: Number, amount: Number, rest...: T) =>
            Array<T>,
        push: (values...: T) => Number,
        filter: (lambda: Function, thisValue: Any) => Array<T>,
        indexOf: (item: T, fromIndex: Number) => Number
    }

    Fix to make it more like ObservHash.

    I.e. you write observables into it.
        reading methods take plain JS objects to read
        and the value of the array is always an array of plain
        objsect.

        The observ array instance itself would have indexed
        properties that are the observables
*/
function ObservArray(initialList) {
    // list is the internal mutable list observ instances that
    // all methods on `obs` dispatch to.
    var list = initialList
    var initialState = []

    // copy state out of initialList into initialState
    list.forEach(function (observ, index) {
        initialState[index] = typeof observ === "function" ?
            observ() : observ
    })

    var obs = Observ(initialState)
    obs.splice = splice

    // override set and store original for later use
    obs._observSet = obs.set
    obs.set = set

    obs.get = get
    obs.getLength = getLength
    obs.put = put
    obs.transaction = transaction

    // you better not mutate this list directly
    // this is the list of observs instances
    obs._list = list

    var removeListeners = list.map(function (observ) {
        return typeof observ === "function" ?
            addListener(obs, observ) :
            null
    });
    // this is a list of removal functions that must be called
    // when observ instances are removed from `obs.list`
    // not calling this means we do not GC our observ change
    // listeners. Which causes rage bugs
    obs._removeListeners = removeListeners

    obs._type = "observ-array"
    obs._version = "3"

    return ArrayMethods(obs, list)
}

function get(index) {
    return this._list[index]
}

function getLength() {
    return this._list.length
}

},{"./add-listener.js":31,"./array-methods.js":33,"./put.js":38,"./set.js":39,"./splice.js":40,"./transaction.js":41,"observ":47}],37:[function(require,module,exports){
module.exports = setNonEnumerable;

function setNonEnumerable(object, key, value) {
    Object.defineProperty(object, key, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false
    });
}

},{}],38:[function(require,module,exports){
var addListener = require("./add-listener.js")
var setNonEnumerable = require("./lib/set-non-enumerable.js");

module.exports = put

// `obs.put` is a mutable implementation of `array[index] = value`
// that mutates both `list` and the internal `valueList` that
// is the current value of `obs` itself
function put(index, value) {
    var obs = this
    var valueList = obs().slice()

    var originalLength = valueList.length
    valueList[index] = typeof value === "function" ? value() : value

    obs._list[index] = value

    // remove past value listener if was observ
    var removeListener = obs._removeListeners[index]
    if (removeListener){
        removeListener()
    }

    // add listener to value if observ
    obs._removeListeners[index] = typeof value === "function" ?
        addListener(obs, value) :
        null

    // fake splice diff
    var valueArgs = index < originalLength ? 
        [index, 1, valueList[index]] :
        [index, 0, valueList[index]]

    setNonEnumerable(valueList, "_diff", [valueArgs])

    obs._observSet(valueList)
    return value
}
},{"./add-listener.js":31,"./lib/set-non-enumerable.js":37}],39:[function(require,module,exports){
var applyPatch = require("./apply-patch.js")
var setNonEnumerable = require("./lib/set-non-enumerable.js")
var adiff = require("adiff")

module.exports = set

function set(rawList) {
    if (!Array.isArray(rawList)) rawList = []

    var obs = this
    var changes = adiff.diff(obs._list, rawList)
    var valueList = obs().slice()

    var valueChanges = changes.map(applyPatch.bind(obs, valueList))

    setNonEnumerable(valueList, "_diff", valueChanges)

    obs._observSet(valueList)
    return changes
}

},{"./apply-patch.js":32,"./lib/set-non-enumerable.js":37,"adiff":1}],40:[function(require,module,exports){
var slice = Array.prototype.slice

var addListener = require("./add-listener.js")
var setNonEnumerable = require("./lib/set-non-enumerable.js");

module.exports = splice

// `obs.splice` is a mutable implementation of `splice()`
// that mutates both `list` and the internal `valueList` that
// is the current value of `obs` itself
function splice(index, amount) {
    var obs = this
    var args = slice.call(arguments, 0)
    var valueList = obs().slice()

    // generate a list of args to mutate the internal
    // list of only obs
    var valueArgs = args.map(function (value, index) {
        if (index === 0 || index === 1) {
            return value
        }

        // must unpack observables that we are adding
        return typeof value === "function" ? value() : value
    })

    valueList.splice.apply(valueList, valueArgs)
    // we remove the observs that we remove
    var removed = obs._list.splice.apply(obs._list, args)

    var extraRemoveListeners = args.slice(2).map(function (observ) {
        return typeof observ === "function" ?
            addListener(obs, observ) :
            null
    })
    extraRemoveListeners.unshift(args[0], args[1])
    var removedListeners = obs._removeListeners.splice
        .apply(obs._removeListeners, extraRemoveListeners)

    removedListeners.forEach(function (removeObservListener) {
        if (removeObservListener) {
            removeObservListener()
        }
    })

    setNonEnumerable(valueList, "_diff", [valueArgs])

    obs._observSet(valueList)
    return removed
}

},{"./add-listener.js":31,"./lib/set-non-enumerable.js":37}],41:[function(require,module,exports){
module.exports = transaction

function transaction (func) {
    var obs = this
    var rawList = obs._list.slice()

    if (func(rawList) !== false){ // allow cancel
        return obs.set(rawList)
    }

}
},{}],42:[function(require,module,exports){
var Observ = require("observ")
var extend = require("xtend")

var blackList = ["name", "_diff", "_type", "_version"]
var blackListReasons = {
    "name": "Clashes with `Function.prototype.name`.\n",
    "_diff": "_diff is reserved key of observ-struct.\n",
    "_type": "_type is reserved key of observ-struct.\n",
    "_version": "_version is reserved key of observ-struct.\n"
}
var NO_TRANSACTION = {}

function setNonEnumerable(object, key, value) {
    Object.defineProperty(object, key, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false
    })
}

/* ObservStruct := (Object<String, Observ<T>>) => 
    Object<String, Observ<T>> &
        Observ<Object<String, T> & {
            _diff: Object<String, Any>
        }>

*/
module.exports = ObservStruct

function ObservStruct(struct) {
    var keys = Object.keys(struct)

    var initialState = {}
    var currentTransaction = NO_TRANSACTION
    var nestedTransaction = NO_TRANSACTION

    keys.forEach(function (key) {
        if (blackList.indexOf(key) !== -1) {
            throw new Error("cannot create an observ-struct " +
                "with a key named '" + key + "'.\n" +
                blackListReasons[key]);
        }

        var observ = struct[key]
        initialState[key] = typeof observ === "function" ?
            observ() : observ
    })

    var obs = Observ(initialState)
    keys.forEach(function (key) {
        var observ = struct[key]
        obs[key] = observ

        if (typeof observ === "function") {
            observ(function (value) {
                if (nestedTransaction === value) {
                    return
                }

                var state = extend(obs())
                state[key] = value
                var diff = {}
                diff[key] = value && value._diff ?
                    value._diff : value

                setNonEnumerable(state, "_diff", diff)
                currentTransaction = state
                obs.set(state)
                currentTransaction = NO_TRANSACTION
            })
        }
    })
    var _set = obs.set
    obs.set = function trackDiff(value) {
        if (currentTransaction === value) {
            return _set(value)
        }

        var newState = extend(value)
        setNonEnumerable(newState, "_diff", value)
        _set(newState)
    }

    obs(function (newState) {
        if (currentTransaction === newState) {
            return
        }

        keys.forEach(function (key) {
            var observ = struct[key]
            var newObservValue = newState[key]

            if (typeof observ === "function" &&
                observ() !== newObservValue
            ) {
                nestedTransaction = newObservValue
                observ.set(newState[key])
                nestedTransaction = NO_TRANSACTION
            }
        })
    })

    obs._type = "observ-struct"
    obs._version = "5"

    return obs
}

},{"observ":47,"xtend":43}],43:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],44:[function(require,module,exports){
var Observ = require('observ')
var extend = require('xtend')

var NO_TRANSACTION = {}

module.exports = ObservVarhash

function ObservVarhash (hash, createValue) {
  createValue = createValue || function (obj) { return obj }

  var initialState = {}
  var currentTransaction = NO_TRANSACTION

  var obs = Observ(initialState)
  setNonEnumerable(obs, '_removeListeners', {})

  setNonEnumerable(obs, 'set', obs.set)
  setNonEnumerable(obs, 'get', get.bind(obs))
  setNonEnumerable(obs, 'put', put.bind(obs, createValue, currentTransaction))
  setNonEnumerable(obs, 'delete', del.bind(obs))

  for (var key in hash) {
    obs[key] = typeof hash[key] === 'function' ?
      hash[key] : createValue(hash[key], key)

    if (isFn(obs[key])) {
      obs._removeListeners[key] = obs[key](watch(obs, key, currentTransaction))
    }
  }

  var newState = {}
  for (key in hash) {
    var observ = obs[key]
    checkKey(key)
    newState[key] = isFn(observ) ? observ() : observ
  }
  obs.set(newState)

  obs(function (newState) {
    if (currentTransaction === newState) {
      return
    }

    for (var key in hash) {
      var observ = hash[key]

      if (isFn(observ) && observ() !== newState[key]) {
        observ.set(newState[key])
      }
    }
  })

  return obs
}

// access and mutate
function get (key) {
  return this[key]
}

function put (createValue, currentTransaction, key, val) {
  checkKey(key)

  if (val === undefined) {
    throw new Error('cannot varhash.put(key, undefined).')
  }

  var observ = typeof val === 'function' ?
    val : createValue(val, key)
  var state = extend(this())

  state[key] = isFn(observ) ? observ() : observ

  if (isFn(this._removeListeners[key])) {
    this._removeListeners[key]()
  }

  this._removeListeners[key] = isFn(observ) ?
    observ(watch(this, key, currentTransaction)) : null

  setNonEnumerable(state, '_diff', diff(key, state[key]))

  this[key] = observ
  this.set(state)

  return this
}

function del (key) {
  var state = extend(this())
  if (isFn(this._removeListeners[key])) {
    this._removeListeners[key]()
  }

  delete this._removeListeners[key]
  delete state[key]
  delete this[key]

  setNonEnumerable(state, '_diff', diff(key, undefined))
  this.set(state)

  return this
}

// processing
function watch (obs, key, currentTransaction) {
  return function (value) {
    var state = extend(obs())
    state[key] = value

    setNonEnumerable(state, '_diff', diff(key, value))
    currentTransaction = state
    obs.set(state)
    currentTransaction = NO_TRANSACTION
  }
}

function diff (key, value) {
  var obj = {}
  obj[key] = value && value._diff ? value._diff : value
  return obj
}

function isFn (obj) {
  return typeof obj === 'function'
}

function setNonEnumerable(object, key, value) {
  Object.defineProperty(object, key, {
    value: value,
    writable: true,
    configurable: true,
    enumerable: false
  })
}

// errors
var blacklist = {
  name: 'Clashes with `Function.prototype.name`.',
  get: 'get is a reserved key of observ-varhash method',
  put: 'put is a reserved key of observ-varhash method',
  'delete': 'delete is a reserved key of observ-varhash method',
  _diff: '_diff is a reserved key of observ-varhash method',
  _removeListeners: '_removeListeners is a reserved key of observ-varhash'
}

function checkKey (key) {
  if (!blacklist[key]) return
  throw new Error(
    'cannot create an observ-varhash with key `' + key + '`. ' + blacklist[key]
  )
}

},{"observ":47,"xtend":45}],45:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"dup":43}],46:[function(require,module,exports){
var Observable = require("./index.js")

module.exports = computed

function computed(observables, lambda) {
    var values = observables.map(function (o) {
        return o()
    })
    var result = Observable(lambda.apply(null, values))

    observables.forEach(function (o, index) {
        o(function (newValue) {
            values[index] = newValue
            result.set(lambda.apply(null, values))
        })
    })

    return result
}

},{"./index.js":47}],47:[function(require,module,exports){
module.exports = Observable

function Observable(value) {
    var listeners = []
    value = value === undefined ? null : value

    observable.set = function (v) {
        value = v
        listeners.forEach(function (f) {
            f(v)
        })
    }

    return observable

    function observable(listener) {
        if (!listener) {
            return value
        }

        listeners.push(listener)

        return function remove() {
            listeners.splice(listeners.indexOf(listener), 1)
        }
    }
}

},{}],48:[function(require,module,exports){
module.exports = watch

function watch(observable, listener) {
    var remove = observable(listener)
    listener(observable())
    return remove
}

},{}],49:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*

*/

}).call(this,require('_process'))

},{"_process":50}],50:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],51:[function(require,module,exports){
var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
  , isNative = true

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  isNative = false

  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  if(!isNative) {
    return raf.call(global, fn)
  }
  return raf.call(global, function() {
    try{
      fn.apply(this, arguments)
    } catch(e) {
      setTimeout(function() { throw e }, 0)
    }
  })
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"performance-now":49}],52:[function(require,module,exports){
var nargs = /\{([0-9a-zA-Z]+)\}/g
var slice = Array.prototype.slice

module.exports = template

function template(string) {
    var args

    if (arguments.length === 2 && typeof arguments[1] === "object") {
        args = arguments[1]
    } else {
        args = slice.call(arguments, 1)
    }

    if (!args || !args.hasOwnProperty) {
        args = {}
    }

    return string.replace(nargs, function replaceArg(match, i, index) {
        var result

        if (string[index - 1] === "{" &&
            string[index + match.length] === "}") {
            return i
        } else {
            result = args.hasOwnProperty(i) ? args[i] : null
            if (result === null || result === undefined) {
                return ""
            }

            return result
        }
    })
}

},{}],53:[function(require,module,exports){
var Delegator = require('dom-delegator')

module.exports = BaseEvent

function BaseEvent(lambda) {
    return EventHandler;

    function EventHandler(fn, data, opts) {
        var handler = {
            fn: fn,
            data: data !== undefined ? data : {},
            opts: opts || {},
            handleEvent: handleEvent
        }

        if (fn && fn.type === 'dom-delegator-handle') {
            return Delegator.transformHandle(fn,
                handleLambda.bind(handler))
        }

        return handler;
    }

    function handleLambda(ev, broadcast) {
        if (this.opts.startPropagation && ev.startPropagation) {
            ev.startPropagation();
        }

        return lambda.call(this, ev, broadcast)
    }

    function handleEvent(ev) {
        var self = this

        if (self.opts.startPropagation && ev.startPropagation) {
            ev.startPropagation()
        }

        lambda.call(self, ev, broadcast)

        function broadcast(value) {
            if (typeof self.fn === 'function') {
                self.fn(value)
            } else {
                self.fn.write(value)
            }
        }
    }
}

},{"dom-delegator":9}],54:[function(require,module,exports){
var extend = require('xtend')
var getFormData = require('form-data-set/element')

var BaseEvent = require('./base-event.js')

var VALID_CHANGE = ['checkbox', 'file', 'select-multiple', 'select-one'];
var VALID_INPUT = ['color', 'date', 'datetime', 'datetime-local', 'email',
    'month', 'number', 'password', 'range', 'search', 'tel', 'text', 'time',
    'url', 'week'];

module.exports = BaseEvent(changeLambda);

function changeLambda(ev, broadcast) {
    var target = ev.target

    var isValid =
        (ev.type === 'input' && VALID_INPUT.indexOf(target.type) !== -1) ||
        (ev.type === 'change' && VALID_CHANGE.indexOf(target.type) !== -1);

    if (!isValid) {
        if (ev.startPropagation) {
            ev.startPropagation()
        }
        return
    }

    var value = getFormData(ev.currentTarget)
    var data = extend(value, this.data)

    broadcast(data)
}

},{"./base-event.js":53,"form-data-set/element":17,"xtend":59}],55:[function(require,module,exports){
var BaseEvent = require('./base-event.js');

module.exports = BaseEvent(clickLambda);

function clickLambda(ev, broadcast) {
    var opts = this.opts;

    if (!opts.ctrl && ev.ctrlKey) {
        return;
    }

    if (!opts.meta && ev.metaKey) {
        return;
    }

    if (!opts.rightClick && ev.which === 2) {
        return;
    }

    if (this.opts.preventDefault && ev.preventDefault) {
        ev.preventDefault();
    }

    broadcast(this.data);
}

},{"./base-event.js":53}],56:[function(require,module,exports){
var BaseEvent = require('./base-event.js');

module.exports = BaseEvent(eventLambda);

function eventLambda(ev, broadcast) {
    broadcast(this.data);
}

},{"./base-event.js":53}],57:[function(require,module,exports){
var BaseEvent = require('./base-event.js');

module.exports = BaseEvent(keyLambda);

function keyLambda(ev, broadcast) {
    var key = this.opts.key;

    if (ev.keyCode === key) {
        broadcast(this.data);
    }
}

},{"./base-event.js":53}],58:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],59:[function(require,module,exports){
var hasKeys = require("./has-keys")

module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        if (!hasKeys(source)) {
            continue
        }

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{"./has-keys":58}],60:[function(require,module,exports){
var extend = require('xtend')
var getFormData = require('form-data-set/element')

var BaseEvent = require('./base-event.js');

var ENTER = 13

module.exports = BaseEvent(submitLambda);

function submitLambda(ev, broadcast) {
    var target = ev.target

    var isValid =
        (ev.type === 'submit' && target.tagName === 'FORM') ||
        (ev.type === 'click' && target.tagName === 'BUTTON') ||
        (ev.type === 'click' && target.type === 'submit') ||
        (
            (target.type === 'text') &&
            (ev.keyCode === ENTER && ev.type === 'keydown')
        )

    if (!isValid) {
        if (ev.startPropagation) {
            ev.startPropagation()
        }
        return
    }

    var value = getFormData(ev.currentTarget)
    var data = extend(value, this.data)

    if (ev.preventDefault) {
        ev.preventDefault();
    }

    broadcast(data);
}

},{"./base-event.js":53,"form-data-set/element":17,"xtend":59}],61:[function(require,module,exports){
var extend = require('xtend')
var getFormData = require('form-data-set/element')

var BaseEvent = require('./base-event.js');

module.exports = BaseEvent(valueLambda);

function valueLambda(ev, broadcast) {
    var value = getFormData(ev.currentTarget)
    var data = extend(value, this.data)

    broadcast(data);
}

},{"./base-event.js":53,"form-data-set/element":17,"xtend":59}],62:[function(require,module,exports){
function Thunk(fn, args, key, eqArgs) {
    this.fn = fn;
    this.args = args;
    this.key = key;
    this.eqArgs = eqArgs;
}

Thunk.prototype.type = 'Thunk';
Thunk.prototype.render = render;
module.exports = Thunk;

function shouldUpdate(current, previous) {
    if (!current || !previous || current.fn !== previous.fn) {
        return true;
    }

    var cargs = current.args;
    var pargs = previous.args;

    return !current.eqArgs(cargs, pargs);
}

function render(previous) {
    if (shouldUpdate(this, previous)) {
        return this.fn.apply(null, this.args);
    } else {
        return previous.vnode;
    }
}

},{}],63:[function(require,module,exports){
var Partial = require('./partial');

module.exports = Partial();

},{"./partial":64}],64:[function(require,module,exports){
var shallowEq = require('./shallow-eq');
var Thunk = require('./immutable-thunk');

module.exports = createPartial;

function createPartial(eq) {
    return function partial(fn) {
        var args = copyOver(arguments, 1);
        var firstArg = args[0];
        var key;

        var eqArgs = eq || shallowEq;

        if (typeof firstArg === 'object' && firstArg !== null) {
            if ('key' in firstArg) {
                key = firstArg.key;
            } else if ('id' in firstArg) {
                key = firstArg.id;
            }
        }

        return new Thunk(fn, args, key, eqArgs);
    };
}

function copyOver(list, offset) {
    var newList = [];
    for (var i = list.length - 1; i >= offset; i--) {
        newList[i - offset] = list[i];
    }
    return newList;
}

},{"./immutable-thunk":62,"./shallow-eq":65}],65:[function(require,module,exports){
module.exports = shallowEq;

function shallowEq(currentArgs, previousArgs) {
    if (currentArgs.length === 0 && previousArgs.length === 0) {
        return true;
    }

    if (currentArgs.length !== previousArgs.length) {
        return false;
    }

    var len = currentArgs.length;

    for (var i = 0; i < len; i++) {
        if (currentArgs[i] !== previousArgs[i]) {
            return false;
        }
    }

    return true;
}

},{}],66:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":78,"is-object":25}],67:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":76,"../vnode/is-vnode.js":79,"../vnode/is-vtext.js":80,"../vnode/is-widget.js":81,"./apply-properties":66,"global/document":22}],68:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],69:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, bIndex) {
    var children = []
    var childNodes = domNode.childNodes
    var len = childNodes.length
    var i
    var reverseIndex = bIndex.reverse

    for (i = 0; i < len; i++) {
        children.push(domNode.childNodes[i])
    }

    var insertOffset = 0
    var move
    var node
    var insertNode
    var chainLength
    var insertedLength
    var nextSibling
    for (i = 0; i < len;) {
        move = bIndex[i]
        chainLength = 1
        if (move !== undefined && move !== i) {
            // try to bring forward as long of a chain as possible
            while (bIndex[i + chainLength] === move + chainLength) {
                chainLength++;
            }

            // the element currently at this index will be moved later so increase the insert offset
            if (reverseIndex[i] > i + chainLength) {
                insertOffset++
            }

            node = children[move]
            insertNode = childNodes[i + insertOffset] || null
            insertedLength = 0
            while (node !== insertNode && insertedLength++ < chainLength) {
                domNode.insertBefore(node, insertNode);
                node = children[move + insertedLength];
            }

            // the moved element came from the front of the array so reduce the insert offset
            if (move + chainLength < i) {
                insertOffset--
            }
        }

        // element at this index is scheduled to be removed so increase insert offset
        if (i in bIndex.removes) {
            insertOffset++
        }

        i += chainLength
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        console.log(oldRoot)
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":81,"../vnode/vpatch.js":84,"./apply-properties":66,"./create-element":67,"./update-widget":71}],70:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":68,"./patch-op":69,"global/document":22,"x-is-array":90}],71:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":81}],72:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":14}],73:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],74:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":77,"../vnode/is-vhook":78,"../vnode/is-vnode":79,"../vnode/is-vtext":80,"../vnode/is-widget":81,"../vnode/vnode.js":83,"../vnode/vtext.js":85,"./hooks/ev-hook.js":72,"./hooks/soft-set-hook.js":73,"./parse-tag.js":75,"x-is-array":90}],75:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":3}],76:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":77,"./is-vnode":79,"./is-vtext":80,"./is-widget":81}],77:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],78:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],79:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":82}],80:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":82}],81:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],82:[function(require,module,exports){
module.exports = "1"

},{}],83:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":77,"./is-vhook":78,"./is-vnode":79,"./is-widget":81,"./version":82}],84:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":82}],85:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":82}],86:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":78,"is-object":25}],87:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true;
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var bChildren = reorder(aChildren, b.children)

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (bChildren.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(VPatch.ORDER, a, bChildren.moves))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b);
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true;
        }
    }

    return false;
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {

    var bKeys = keyIndex(bChildren)

    if (!bKeys) {
        return bChildren
    }

    var aKeys = keyIndex(aChildren)

    if (!aKeys) {
        return bChildren
    }

    var bMatch = {}, aMatch = {}

    for (var aKey in bKeys) {
        bMatch[bKeys[aKey]] = aKeys[aKey]
    }

    for (var bKey in aKeys) {
        aMatch[aKeys[bKey]] = bKeys[bKey]
    }

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen
    var shuffle = []
    var freeIndex = 0
    var i = 0
    var moveIndex = 0
    var moves = {}
    var removes = moves.removes = {}
    var reverse = moves.reverse = {}
    var hasMoves = false

    while (freeIndex < len) {
        var move = aMatch[i]
        if (move !== undefined) {
            shuffle[i] = bChildren[move]
            if (move !== moveIndex) {
                moves[move] = moveIndex
                reverse[moveIndex] = move
                hasMoves = true
            }
            moveIndex++
        } else if (i in aMatch) {
            shuffle[i] = undefined
            removes[i] = moveIndex++
            hasMoves = true
        } else {
            while (bMatch[freeIndex] !== undefined) {
                freeIndex++
            }

            if (freeIndex < len) {
                var freeChild = bChildren[freeIndex]
                if (freeChild) {
                    shuffle[i] = freeChild
                    if (freeIndex !== moveIndex) {
                        hasMoves = true
                        moves[freeIndex] = moveIndex
                        reverse[moveIndex] = freeIndex
                    }
                    moveIndex++
                }
                freeIndex++
            }
        }
        i++
    }

    if (hasMoves) {
        shuffle.moves = moves
    }

    return shuffle
}

function keyIndex(children) {
    var i, keys

    for (i = 0; i < children.length; i++) {
        var child = children[i]

        if (child.key !== undefined) {
            keys = keys || {}
            keys[child.key] = i
        }
    }

    return keys
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":76,"../vnode/is-thunk":77,"../vnode/is-vnode":79,"../vnode/is-vtext":80,"../vnode/is-widget":81,"../vnode/vpatch":84,"./diff-props":86,"x-is-array":90}],88:[function(require,module,exports){
var hiddenStore = require('./hidden-store.js');

module.exports = createStore;

function createStore() {
    var key = {};

    return function (obj) {
        if ((typeof obj !== 'object' || obj === null) &&
            typeof obj !== 'function'
        ) {
            throw new Error('Weakmap-shim: Key must be object')
        }

        var store = obj.valueOf(key);
        return store && store.identity === key ?
            store : hiddenStore(obj, key);
    };
}

},{"./hidden-store.js":89}],89:[function(require,module,exports){
module.exports = hiddenStore;

function hiddenStore(obj, key) {
    var store = { identity: key };
    var valueOf = obj.valueOf;

    Object.defineProperty(obj, "valueOf", {
        value: function (value) {
            return value !== key ?
                valueOf.apply(this, arguments) : store;
        },
        writable: true
    });

    return store;
}

},{}],90:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],91:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],92:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],93:[function(require,module,exports){
var iterateMonth = require('./iterate-month');
var getDate = require('../get-date');

module.exports = {
  lastMonth: iterateMonth(getDate.last),
  nextMonth: iterateMonth(getDate.next),
  toggle: require('./toggle')
};

},{"../get-date":97,"./iterate-month":94,"./toggle":95}],94:[function(require,module,exports){
var hg = require('mercury');
var generateMonth = require('../generate-month');

module.exports = function iterateMonthFactory(iterator) {
  return function iterateMonth(state) {
    var date = iterator(state.model.displayedMonth(), state.model.displayedYear());
    var year = state.model.years[date.year] || {};

    state.model.displayedMonth.set(date.month);
    state.model.displayedYear.set(date.year);

    var month = generateMonth({
      currentMonth: state.model.currentMonth(),
      currentYear: state.model.currentYear(),
      currentDay: state.model.currentDay(),
      month: date.month,
      year: date.year,
      firstDay: state.model.translation.firstDay
    });

    state.model.years[date.year] = year;
    state.model.years[date.year][date.month] = month;
  };
};

},{"../generate-month":96,"mercury":29}],95:[function(require,module,exports){
module.exports = function toggle(state) {
  if (!state.model.isOpen()) {
    state.model.isPopUpTop.set(state.model.isButtonInBottomHalf());
  }

  state.model.isOpen.set(!state.model.isOpen());
};

},{}],96:[function(require,module,exports){
var times = require('lodash.times');
var monthDays = require('month-days');
var getDate = require('./get-date');
var getFirstDayOfMonth = require('./get-first-day-of-month');
var modulo = require('./modulo');
var settings = require('./settings');

module.exports = function generateMonth(args) {
  var lastDate = getDate.last(args.month, args.year);

  var numberOfDays = monthDays(args.month, args.year);
  var numberOfDaysLastMonth = monthDays(lastDate.month, lastDate.year);

  var firstDayOfMonth = getFirstDayOfMonth(args.month, args.year);

  // README: due to weird format of translation.firstDay.
  var firstDay = modulo(args.firstDay - 1, 7);
  var numberOfDaysShownFromLastMonth = modulo(7 + firstDayOfMonth - firstDay, 7);

  var numberOfDaysShownFromNextMonth = settings.numberOfDaysInCalendar -
    (numberOfDaysShownFromLastMonth + numberOfDays);

  // FIXME: all of the "isDisabled" are wrong.  they need to account for the difference
  // between the selected date and the current date. selected date may be in a different month
  var daysLastMonth = times(numberOfDaysShownFromLastMonth, function buildLastMonthDays(dayIndex) {
    return {
      dayOfMonth: numberOfDaysLastMonth - numberOfDaysShownFromLastMonth + dayIndex + 1,
      isDisabled: true
    };
  });

  var daysThisMonth = times(numberOfDays, function buildDays(dayIndex) {
    return {
      dayOfMonth: dayIndex + 1,
      isDisabled: dayIndex < args.currentDay
    };
  });

  var daysNextMonth = times(numberOfDaysShownFromNextMonth, function buildNextMonthDays(dayIndex) {
    return {
      dayOfMonth: dayIndex + 1,
      isDisabled: true
    };
  });

  return {
    displayedDays: daysLastMonth.concat(daysThisMonth).concat(daysNextMonth)
  };
};

},{"./get-date":97,"./get-first-day-of-month":98,"./modulo":101,"./settings":107,"lodash.times":27,"month-days":30}],97:[function(require,module,exports){
var modulo = require('./modulo');

function last(month, year) {
  var lastMonth = modulo(month - 1, 12);
  var lastYear = month === 0 ? year - 1 : year;

  return {
    month: lastMonth,
    year: lastYear
  };
}

function next(month, year) {
  var nextMonth = modulo(month + 1, 12);
  var nextYear = month === 11 ? year + 1 : year;

  return {
    month: nextMonth,
    year: nextYear
  };
}

module.exports = {
  last: last,
  next: next
};

},{"./modulo":101}],98:[function(require,module,exports){
module.exports = function getFirstDayOfMonth(month, year) {
  return new Date(year + '-' + (month + 1) + '-01').getDay();
};

},{}],99:[function(require,module,exports){
var render = require('./renderers/date-picker');
var mount = require('./mount');
var initializeState = require('./initialize-state');

var DatePicker = initializeState;
DatePicker.render = render;
DatePicker.mount = mount;

module.exports = DatePicker;

},{"./initialize-state":100,"./mount":102,"./renderers/date-picker":103}],100:[function(require,module,exports){
var hg = require('mercury');
var translations = require('./translations');
var dateFormat = require('dateformat');
var xtend = require('xtend');
var channels = require('./channels');
var generateMonth = require('./generate-month');

module.exports = function initializeState(opts) {
  var args = opts || {};
  var translation = xtend(translations['en-US'], translations[args.locale] || {});
  var currentDate = args.currentDate || new Date();
  var selectedDate = args.selectedDate || currentDate;

  var selectedDay = selectedDate.getDate();
  var selectedMonth = selectedDate.getMonth();
  var selectedYear = selectedDate.getFullYear();

  var currentDay = currentDate.getDate();
  var currentMonth = currentDate.getMonth();
  var currentYear = currentDate.getFullYear();

  dateFormat.i18n = {
    dayNames: translation.weekdaysShort.concat(translation.weekdaysFull),
    monthNames: translation.monthsShort.concat(translation.monthsFull)
  };

  var years = {};
  var month = generateMonth({
    currentDay: currentDay,
    currentMonth: currentMonth,
    currentYear: currentYear,
    firstDay: translation.firstDay,
    month: selectedMonth,
    year: selectedYear
  });

  years[selectedYear] = {};
  years[selectedYear][selectedMonth] = month;

  return hg.state({
    channels: channels,
    model: hg.struct({
      currentDay: hg.value(currentDay),
      currentMonth: hg.value(currentMonth),
      currentYear: hg.value(currentYear),
      displayedMonth: hg.value(selectedMonth),
      displayedYear: hg.value(selectedYear),
      highlightedDayIndex: hg.value(null),
      // FIXME: initialize from element if it exists
      isButtonInBottomHalf: hg.value(false),
      isPopUpTop: hg.value(false),
      isOpen: hg.value(false),
      selectedDay: hg.value(selectedDay),
      selectedMonth: hg.value(selectedMonth),
      selectedYear: hg.value(selectedYear),
      translation: translation,
      years: years
    })
  });
};

},{"./channels":93,"./generate-month":96,"./translations":128,"dateformat":6,"mercury":29,"xtend":91}],101:[function(require,module,exports){
module.exports = function modulo(n, m) {
  return ((n % m) + m) % m;
};

},{}],102:[function(require,module,exports){
var app = require('mercury').app;

module.exports = function mount(el, opts) {
  app(el, this(opts), this.render);
};

},{"mercury":29}],103:[function(require,module,exports){
var hg = require('mercury');
var dateFormat = require('dateformat');
var popUp = require('./pop-up');

var h = hg.h;

var styles = {
  datePicker: {
    textAlign: 'center'
  }
};

module.exports = function datePicker(state) {
  var selectedDate = new Date(
    state.model.selectedYear,
    state.model.selectedMonth,
    state.model.selectedDay
  );

  // FIXME: add hook for listening/unlistening from window scroll/resize events
  return h('div', {
    style: styles.datePicker
  }, [
    h('a', {
      'ev-click': hg.send(state.channels.toggle)
    },
    dateFormat(selectedDate, state.model.translation.format)),
    popUp(state)
  ]);
};

},{"./pop-up":105,"dateformat":6,"mercury":29}],104:[function(require,module,exports){
var hg = require('mercury');
var dateFormat = require('dateformat');

var h = hg.h;

var styles = {
  popUpHeader: {
    textAlign: 'center',
    position: 'relative'
  },
  lastMonth: {
    width: '30px',
    height: '30px',
    float: 'left',
    backgroundColor: 'black'
  },
  nextMonth: {
    height: '30px',
    width: '30px',
    float: 'right',
    backgroundColor: 'black'
  }
};

module.exports = function header(state) {
  var month = state
    .model
    .years[state.model.displayedYear][state.model.displayedYear];

  var displayedDate = new Date(
    state.model.displayedYear,
    state.model.displayedMonth
  );

  var title = dateFormat(displayedDate, 'mmmm yyyy');

  return h('div', {
    style: styles.popUpHeader
  }, [
    title,
    h('div', {
      style: styles.lastMonth,
      'ev-click': hg.send(state.channels.lastMonth)
    }),
    h('div', {
      style: styles.nextMonth,
      'ev-click': hg.send(state.channels.nextMonth)
    })
  ]);
};

},{"dateformat":6,"mercury":29}],105:[function(require,module,exports){
var h = require('mercury').h;
var xtend = require('xtend');
var header = require('./header');
var tableHead = require('./table-head');

var styles = {
  popUp: {
    borderRadius: '3px',
    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
    boxSizing: 'border-box',
    height: '18em',
    left: 'calc(50% - 11rem)',
    padding: '1em',
    position: 'absolute',
    // FIXME: use https://www.npmjs.com/package/autoprefix
    transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, position 0.15s ease-out, height 0s 0.15s',
    width: '22em'
  },
  table: {
    borderCollapse: 'collapse',
    borderSpacing: 0,
    boxSizing: 'border-box',
    fontSize: 'inherit',
    marginTop: '1rem',
    tableLayout: 'fixed',
    textAlign: 'center',
    width: '100%'
  }
};

module.exports = function popUp(state) {
  var popUpStyle = xtend(styles.popUp);

  if (state.model.isPopUpTop) {
    popUpStyle.top =  '-' + styles.popUp.height;
  }

  var translateY;
  if (!state.model.isOpen) {
    popUpStyle.opacity = 0;
    popUpStyle.zIndex = -2000;

    translateY = state.model.isPopUpTop ? 1 : -1;
  } else {
    translateY = 0;
  }

  popUpStyle.transform = 'translateY(' + translateY + 'em) perspective(600px) rotateX(0)';

  return h('div', {
    style: popUpStyle
  }, [
    header(state),
    h('table', {
      style: styles.table
    }, [
      tableHead(state)
      // tableBody(state)
    ])
  ]);
};

},{"./header":104,"./table-head":106,"mercury":29,"xtend":91}],106:[function(require,module,exports){
var h = require('mercury').h;
var modulo = require('../modulo');

var styles = {
  row: {
    height: '2em'
  }
};

module.exports = function tableHead(state) {
  var firstDay = state.model.translation.firstDay;

  var dayThs = [];

  for (var i = firstDay; i < firstDay + 7; i++) {
    var weekday = state.model.translation.weekdaysShort[modulo(i, 7)];
    var th = h('th', weekday);
    dayThs.push(th);
  }

  return h('thead', h('tr', { style: styles.row }, dayThs));
};

},{"../modulo":101,"mercury":29}],107:[function(require,module,exports){
module.exports={
  "numberOfRowsInCalendar": 6,
  "numberOfDaysInCalendar": 42
}

},{}],108:[function(require,module,exports){
module.exports={"monthsFull":["януари","февруари","март","април","май","юни","юли","август","септември","октомври","ноември","декември"],"monthsShort":["янр","фев","мар","апр","май","юни","юли","авг","сеп","окт","ное","дек"],"weekdaysFull":["неделя","понеделник","вторник","сряда","четвъртък","петък","събота"],"weekdaysShort":["нд","пн","вт","ср","чт","пт","сб"],"today":"днес","clear":"изтривам","firstDay":1,"format":"d mmmm yyyy г.","formatSubmit":"yyyy/mm/dd"}
},{}],109:[function(require,module,exports){
module.exports={"monthsFull":["januar","februar","mart","april","maj","juni","juli","august","septembar","oktobar","novembar","decembar"],"monthsShort":["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"],"weekdaysFull":["nedjelja","ponedjeljak","utorak","srijeda","cetvrtak","petak","subota"],"weekdaysShort":["ne","po","ut","sr","če","pe","su"],"today":"danas","clear":"izbrisati","firstDay":1,"format":"dd. mmmm yyyy.","formatSubmit":"yyyy/mm/dd"}
},{}],110:[function(require,module,exports){
module.exports={"monthsFull":["Gener","Febrer","Març","Abril","Maig","juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"],"monthsShort":["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"],"weekdaysFull":["diumenge","dilluns","dimarts","dimecres","dijous","divendres","dissabte"],"weekdaysShort":["diu","dil","dim","dmc","dij","div","dis"],"today":"avui","clear":"esborrar","close":"tancar","firstDay":1,"format":"dddd d !de mmmm !de yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],111:[function(require,module,exports){
module.exports={"monthsFull":["leden","únor","březen","duben","květen","červen","červenec","srpen","září","říjen","listopad","prosinec"],"monthsShort":["led","úno","bře","dub","kvě","čer","čvc","srp","zář","říj","lis","pro"],"weekdaysFull":["neděle","pondělí","úterý","středa","čtvrtek","pátek","sobota"],"weekdaysShort":["ne","po","út","st","čt","pá","so"],"today":"dnes","clear":"vymazat","firstDay":1,"format":"d. mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],112:[function(require,module,exports){
module.exports={"monthsFull":["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"],"monthsShort":["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"],"weekdaysFull":["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],"weekdaysShort":["søn","man","tir","ons","tor","fre","lør"],"today":"i dag","clear":"slet","close":"luk","firstDay":1,"format":"d. mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],113:[function(require,module,exports){
module.exports={"monthsFull":["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],"monthsShort":["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"],"weekdaysFull":["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],"weekdaysShort":["So","Mo","Di","Mi","Do","Fr","Sa"],"today":"Heute","clear":"Löschen","close":"Schließen","firstDay":1,"format":"d mmm yyyy","formatSubmit":"yyyy/mm/dd"}

},{}],114:[function(require,module,exports){
module.exports={"monthsFull":["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"],"monthsShort":["Ιαν","Φεβ","Μαρ","Απρ","Μαι","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"],"weekdaysFull":["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"],"weekdaysShort":["Κυρ","Δευ","Τρι","Τετ","Πεμ","Παρ","Σαβ"],"today":"σήμερα","clear":"Διαγραφή","firstDay":1,"format":"d mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],115:[function(require,module,exports){
module.exports={"monthsFull":["January","February","March","April","May","June","July","August","September","October","November","December"],"monthsShort":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"weekdaysFull":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"weekdaysShort":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"firstDay": 0, "format":"mmm d, yyyy"}

},{}],116:[function(require,module,exports){
module.exports={"monthsFull":["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],"monthsShort":["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],"weekdaysFull":["domingo","lunes","martes","miércoles","jueves","viernes","sábado"],"weekdaysShort":["dom","lun","mar","mié","jue","vie","sáb"],"today":"hoy","clear":"borrar","close":"cerrar","firstDay":1,"format":"d mmm yyyy","formatSubmit":"yyyy/mm/dd"}

},{}],117:[function(require,module,exports){
module.exports={"monthsFull":["jaanuar","veebruar","märts","aprill","mai","juuni","juuli","august","september","oktoober","november","detsember"],"monthsShort":["jaan","veebr","märts","apr","mai","juuni","juuli","aug","sept","okt","nov","dets"],"weekdaysFull":["pühapäev","esmaspäev","teisipäev","kolmapäev","neljapäev","reede","laupäev"],"weekdaysShort":["püh","esm","tei","kol","nel","ree","lau"],"today":"täna","clear":"kustutama","firstDay":1,"format":"d. mmmm yyyy. a","formatSubmit":"yyyy/mm/dd"}
},{}],118:[function(require,module,exports){
module.exports={"monthsFull":["urtarrila","otsaila","martxoa","apirila","maiatza","ekaina","uztaila","abuztua","iraila","urria","azaroa","abendua"],"monthsShort":["urt","ots","mar","api","mai","eka","uzt","abu","ira","urr","aza","abe"],"weekdaysFull":["igandea","astelehena","asteartea","asteazkena","osteguna","ostirala","larunbata"],"weekdaysShort":["ig.","al.","ar.","az.","og.","or.","lr."],"today":"gaur","clear":"garbitu","firstDay":1,"format":"dddd, yyyy(e)ko mmmmren da","formatSubmit":"yyyy/mm/dd"}
},{}],119:[function(require,module,exports){
module.exports={"monthsFull":["ژانویه","فوریه","مارس","آوریل","مه","ژوئن","ژوئیه","اوت","سپتامبر","اکتبر","نوامبر","دسامبر"],"monthsShort":["ژانویه","فوریه","مارس","آوریل","مه","ژوئن","ژوئیه","اوت","سپتامبر","اکتبر","نوامبر","دسامبر"],"weekdaysFull":["یکشنبه","دوشنبه","سه شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"],"weekdaysShort":["یکشنبه","دوشنبه","سه شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"],"today":"امروز","clear":"پاک کردن","close":"بستن","format":"yyyy mmmm dd","formatSubmit":"yyyy/mm/dd","labelMonthNext":"ماه بعدی","labelMonthPrev":"ماه قبلی"}
},{}],120:[function(require,module,exports){
module.exports={"monthsFull":["tammikuu","helmikuu","maaliskuu","huhtikuu","toukokuu","kesäkuu","heinäkuu","elokuu","syyskuu","lokakuu","marraskuu","joulukuu"],"monthsShort":["tammi","helmi","maalis","huhti","touko","kesä","heinä","elo","syys","loka","marras","joulu"],"weekdaysFull":["sunnuntai","maanantai","tiistai","keskiviikko","torstai","perjantai","lauantai"],"weekdaysShort":["su","ma","ti","ke","to","pe","la"],"today":"tänään","clear":"tyhjennä","firstDay":1,"format":"d.m.yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],121:[function(require,module,exports){
module.exports={"monthsFull":["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],"monthsShort":["Jan","Fev","Mar","Avr","Mai","Juin","Juil","Aou","Sep","Oct","Nov","Dec"],"weekdaysFull":["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"],"weekdaysShort":["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],"today":"Aujourd'hui","clear":"Effacer","close":"Fermer","firstDay":1,"format":"d mmm yyyy","formatSubmit":"yyyy/mm/dd","labelMonthNext":"Mois suivant","labelMonthPrev":"Mois précédent","labelMonthSelect":"Sélectionner un mois","labelYearSelect":"Sélectionner une année"}

},{}],122:[function(require,module,exports){
module.exports={"monthsFull":["Xaneiro","Febreiro","Marzo","Abril","Maio","Xuño","Xullo","Agosto","Setembro","Outubro","Novembro","Decembro"],"monthsShort":["xan","feb","mar","abr","mai","xun","xul","ago","sep","out","nov","dec"],"weekdaysFull":["domingo","luns","martes","mércores","xoves","venres","sábado"],"weekdaysShort":["dom","lun","mar","mér","xov","ven","sab"],"today":"hoxe","clear":"borrar","firstDay":1,"format":"dddd d !de mmmm !de yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],123:[function(require,module,exports){
module.exports={"monthsFull":["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],"monthsShort":["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ"],"weekdaysFull":["יום ראשון","יום שני","יום שלישי","יום רביעי","יום חמישי","יום ששי","יום שבת"],"weekdaysShort":["א","ב","ג","ד","ה","ו","ש"],"today":"היום","clear":"למחוק","format":"yyyy mmmmב d dddd","formatSubmit":"yyyy/mm/dd"}
},{}],124:[function(require,module,exports){
module.exports={"monthsFull":["जनवरी","फरवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितम्बर","अक्टूबर","नवम्बर","दिसम्बर"],"monthsShort":["जन","फर","मार्च","अप्रैल","मई","जून","जु","अग","सित","अक्टू","नव","दिस"],"weekdaysFull":["रविवार","सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार"],"weekdaysShort":["रवि","सोम","मंगल","बुध","गुरु","शुक्र","शनि"],"today":"आज की तारीख चयन करें","clear":"चुनी हुई तारीख को मिटाएँ","close":"विंडो बंद करे","firstDay":1,"format":"dd/mm/yyyy","formatSubmit":"yyyy/mm/dd","labelMonthNext":"अगले माह का चयन करें","labelMonthPrev":"पिछले माह का चयन करें","labelMonthSelect":"किसि एक महीने का चयन करें","labelYearSelect":"किसि एक वर्ष का चयन करें"}
},{}],125:[function(require,module,exports){
module.exports={"monthsFull":["sijećanj","veljača","ožujak","travanj","svibanj","lipanj","srpanj","kolovoz","rujan","listopad","studeni","prosinac"],"monthsShort":["sij","velj","ožu","tra","svi","lip","srp","kol","ruj","lis","stu","pro"],"weekdaysFull":["nedjelja","ponedjeljak","utorak","srijeda","četvrtak","petak","subota"],"weekdaysShort":["ned","pon","uto","sri","čet","pet","sub"],"today":"danas","clear":"izbrisati","firstDay":1,"format":"d. mmmm yyyy.","formatSubmit":"yyyy/mm/dd"}
},{}],126:[function(require,module,exports){
module.exports={"monthsFull":["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"],"monthsShort":["jan","febr","márc","ápr","máj","jún","júl","aug","szept","okt","nov","dec"],"weekdaysFull":["vasárnap","hétfő","kedd","szerda","csütörtök","péntek","szombat"],"weekdaysShort":["V","H","K","SZe","CS","P","SZo"],"today":"Ma","clear":"Törlés","firstDay":1,"format":"yyyy. mmmm dd.","formatSubmit":"yyyy/mm/dd"}
},{}],127:[function(require,module,exports){
module.exports={"monthsFull":["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"],"monthsShort":["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],"weekdaysFull":["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],"weekdaysShort":["Min","Sen","Sel","Rab","Kam","Jum","Sab"],"today":"hari ini","clear":"menghapus","firstDay":1,"format":"d mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],128:[function(require,module,exports){
// FIXME: only en-us should be requirable by default, all other languages
// should be passed in as args to minimize package size.
module.exports = {
  'bg-BG': require('./bg-BG'),
  'bs-BA': require('./bs-BA'),
  'ca-ES': require('./ca-ES'),
  'cs-CZ': require('./cs-CZ'),
  'da-DK': require('./da-DK'),
  'de-DE': require('./de-DE'),
  'el-GR': require('./el-GR'),
  'en-US': require('./en-US'),
  'es-ES': require('./es-ES'),
  'et-EE': require('./et-EE'),
  'eu-ES': require('./eu-ES'),
  'fa-ir': require('./fa-ir'),
  'fi-FI': require('./fi-FI'),
  'fr-FR': require('./fr-FR'),
  'gl-ES': require('./gl-ES'),
  'he-IL': require('./he-IL'),
  'hi-IN': require('./hi-IN'),
  'hr-HR': require('./hr-HR'),
  'hu-HU': require('./hu-HU'),
  'id-ID': require('./id-ID'),
  'is-IS': require('./is-IS'),
  'it-IT': require('./it-IT'),
  'ja-JP': require('./ja-JP'),
  'ko-KR': require('./ko-KR'),
  'lt-LT': require('./lt-LT'),
  'lv-LV': require('./lv-LV'),
  'nb-NO': require('./nb-NO'),
  'ne-NP': require('./ne-NP'),
  'nl-NL': require('./nl-NL'),
  'pl-PL': require('./pl-PL'),
  'pt-BR': require('./pt-BR'),
  'pt-PT': require('./pt-PT'),
  'ro-RO': require('./ro-RO'),
  'ru-RU': require('./ru-RU'),
  'sk-SK': require('./sk-SK'),
  'sl-SI': require('./sl-SI'),
  'sv-SE': require('./sv-SE'),
  'th-TH': require('./th-TH'),
  'tr-TR': require('./tr-TR'),
  'uk-UA': require('./uk-UA'),
  'vi-VN': require('./vi-VN'),
  'zh-CN': require('./zh-CN'),
  'zh-TW': require('./zh-TW')
};

},{"./bg-BG":108,"./bs-BA":109,"./ca-ES":110,"./cs-CZ":111,"./da-DK":112,"./de-DE":113,"./el-GR":114,"./en-US":115,"./es-ES":116,"./et-EE":117,"./eu-ES":118,"./fa-ir":119,"./fi-FI":120,"./fr-FR":121,"./gl-ES":122,"./he-IL":123,"./hi-IN":124,"./hr-HR":125,"./hu-HU":126,"./id-ID":127,"./is-IS":129,"./it-IT":130,"./ja-JP":131,"./ko-KR":132,"./lt-LT":133,"./lv-LV":134,"./nb-NO":135,"./ne-NP":136,"./nl-NL":137,"./pl-PL":138,"./pt-BR":139,"./pt-PT":140,"./ro-RO":141,"./ru-RU":142,"./sk-SK":143,"./sl-SI":144,"./sv-SE":145,"./th-TH":146,"./tr-TR":147,"./uk-UA":148,"./vi-VN":149,"./zh-CN":150,"./zh-TW":151}],129:[function(require,module,exports){
module.exports={"monthsFull":["janúar","febrúar","mars","apríl","maí","júní","júlí","ágúst","september","október","nóvember","desember"],"monthsShort":["jan","feb","mar","apr","maí","jún","júl","ágú","sep","okt","nóv","des"],"weekdaysFull":["sunnudagur","mánudagur","þriðjudagur","miðvikudagur","fimmtudagur","föstudagur","laugardagur"],"weekdaysShort":["sun","mán","þri","mið","fim","fös","lau"],"today":"Í dag","clear":"Hreinsa","firstDay":1,"format":"dd. mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],130:[function(require,module,exports){
module.exports={"monthsFull":["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],"monthsShort":["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"],"weekdaysFull":["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"],"weekdaysShort":["dom","lun","mar","mer","gio","ven","sab"],"today":"Oggi","clear":"Cancella","close":"Chiudi","firstDay":1,"format":"dddd d mmmm yyyy","formatSubmit":"yyyy/mm/dd","labelMonthNext":"Mese successivo","labelMonthPrev":"Mese precedente","labelMonthSelect":"Seleziona un mese","labelYearSelect":"Seleziona un anno"}
},{}],131:[function(require,module,exports){
module.exports={"monthsFull":["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],"monthsShort":["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],"weekdaysFull":["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"],"weekdaysShort":["日","月","火","水","木","金","土"],"today":"今日","clear":"消去","firstDay":1,"format":"yyyy/m/d","formatSubmit":"yyyy/mm/dd"}

},{}],132:[function(require,module,exports){
module.exports={"monthsFull":["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],"monthsShort":["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],"weekdaysFull":["일요일","월요일","화요일","수요일","목요일","금요일","토요일"],"weekdaysShort":["일","월","화","수","목","금","토"],"today":"오늘","clear":"취소","firstDay":1,"format":"yyyy 년 mm 월 dd 일","formatSubmit":"yyyy/mm/dd"}
},{}],133:[function(require,module,exports){
module.exports={"labelMonthNext":"Sekantis mėnuo","labelMonthPrev":"Ankstesnis mėnuo","labelMonthSelect":"Pasirinkite mėnesį","labelYearSelect":"Pasirinkite metus","monthsFull":["Sausis","Vasaris","Kovas","Balandis","Gegužė","Birželis","Liepa","Rugpjūtis","Rugsėjis","Spalis","Lapkritis","Gruodis"],"monthsShort":["Sau","Vas","Kov","Bal","Geg","Bir","Lie","Rgp","Rgs","Spa","Lap","Grd"],"weekdaysFull":["Sekmadienis","Pirmadienis","Antradienis","Trečiadienis","Ketvirtadienis","Penktadienis","Šeštadienis"],"weekdaysShort":["Sk","Pr","An","Tr","Kt","Pn","Št"],"today":"Šiandien","clear":"Išvalyti","close":"Uždaryti","firstDay":1,"format":"yyyy-mm-dd","formatSubmit":"yyyy/mm/dd"}
},{}],134:[function(require,module,exports){
module.exports={"monthsFull":["Janvāris","Februāris","Marts","Aprīlis","Maijs","Jūnijs","Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"],"monthsShort":["Jan","Feb","Mar","Apr","Mai","Jūn","Jūl","Aug","Sep","Okt","Nov","Dec"],"weekdaysFull":["Svētdiena","Pirmdiena","Otrdiena","Trešdiena","Ceturtdiena","Piektdiena","Sestdiena"],"weekdaysShort":["Sv","P","O","T","C","Pk","S"],"today":"Šodiena","clear":"Atcelt","firstDay":1,"format":"yyyy.mm.dd. dddd","formatSubmit":"yyyy/mm/dd"}
},{}],135:[function(require,module,exports){
module.exports={"monthsFull":["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"],"monthsShort":["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"],"weekdaysFull":["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"],"weekdaysShort":["søn","man","tir","ons","tor","fre","lør"],"today":"i dag","clear":"nullstill","close":"lukk","firstDay":1,"format":"dd. mmm. yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],136:[function(require,module,exports){
module.exports={"monthsFull":["जनवरी","फेब्रुअरी","मार्च","अप्रिल","मे","जुन","जुलाई","अगस्त","सेप्टेम्बर","अक्टोबर","नोवेम्बर","डिसेम्बर"],"monthsShort":["जन","फेब्रु","मार्च","अप्रिल","मे","जुन","जुल","अग","सेप्टे","अक्टो","नोभे","डिसे"],"weekdaysFull":["सोमबार","मङ्लबार","बुधबार","बिहीबार","शुक्रबार","शनिबार","आईतबार"],"weekdaysShort":["सोम","मंगल्","बुध","बिही","शुक्र","शनि","आईत"],"numbers":["०","१","२","३","४","५","६","७","८","९"],"today":"आज","clear":"मेटाउनुहोस्","format":"dddd, dd mmmm, yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],137:[function(require,module,exports){
module.exports={"monthsFull":["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],"monthsShort":["jan","feb","maa","apr","mei","jun","jul","aug","sep","okt","nov","dec"],"weekdaysFull":["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"],"weekdaysShort":["zo","ma","di","wo","do","vr","za"],"today":"vandaag","clear":"verwijderen","close":"sluiten","firstDay":1,"format":"dddd d mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],138:[function(require,module,exports){
module.exports={"monthsFull":["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"],"monthsShort":["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"],"weekdaysFull":["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"],"weekdaysShort":["niedz.","pn.","wt.","śr.","cz.","pt.","sob."],"today":"Dzisiaj","clear":"Usuń","close":"Zamknij","firstDay":1,"format":"d mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],139:[function(require,module,exports){
module.exports={"monthsFull":["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"],"monthsShort":["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],"weekdaysFull":["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"],"weekdaysShort":["dom","seg","ter","qua","qui","sex","sab"],"today":"hoje","clear":"limpar","close":"fechar","format":"dddd, d !de mmmm !de yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],140:[function(require,module,exports){
module.exports={"monthsFull":["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],"monthsShort":["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],"weekdaysFull":["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"],"weekdaysShort":["dom","seg","ter","qua","qui","sex","sab"],"today":"Hoje","clear":"Limpar","close":"Fechar","format":"d !de mmmm !de yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],141:[function(require,module,exports){
module.exports={"monthsFull":["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"],"monthsShort":["ian","feb","mar","apr","mai","iun","iul","aug","sep","oct","noi","dec"],"weekdaysFull":["duminică","luni","marţi","miercuri","joi","vineri","sâmbătă"],"weekdaysShort":["D","L","Ma","Mi","J","V","S"],"today":"azi","clear":"șterge","firstDay":1,"format":"dd mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],142:[function(require,module,exports){
module.exports={"monthsFull":["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],"monthsShort":["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"],"weekdaysFull":["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"],"weekdaysShort":["вс","пн","вт","ср","чт","пт","сб"],"today":"сегодня","clear":"удалить","close":"закрыть","firstDay":1,"format":"d mmmm yyyy г.","formatSubmit":"yyyy/mm/dd"}
},{}],143:[function(require,module,exports){
module.exports={"monthsFull":["január","február","marec","apríl","máj","jún","júl","august","september","október","november","december"],"monthsShort":["jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"],"weekdaysFull":["nedeľa","pondelok","utorok","streda","štvrtok","piatok","sobota"],"weekdaysShort":["Ne","Po","Ut","St","Št","Pi","So"],"today":"dnes","clear":"vymazať","close":"zavrieť","firstDay":1,"format":"d. mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],144:[function(require,module,exports){
module.exports={"monthsFull":["januar","februar","marec","april","maj","junij","julij","avgust","september","oktober","november","december"],"monthsShort":["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"],"weekdaysFull":["nedelja","ponedeljek","torek","sreda","četrtek","petek","sobota"],"weekdaysShort":["ned","pon","tor","sre","čet","pet","sob"],"today":"danes","clear":"izbriši","close":"zapri","firstDay":1,"format":"d. mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],145:[function(require,module,exports){
module.exports={"monthsFull":["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"],"monthsShort":["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"],"weekdaysFull":["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"],"weekdaysShort":["sön","mån","tis","ons","tor","fre","lör"],"today":"Idag","clear":"Rensa","close":"Stäng","firstDay":1,"format":"yyyy-mm-dd","formatSubmit":"yyyy/mm/dd","labelMonthNext":"Nästa månad","labelMonthPrev":"Föregående månad","labelMonthSelect":"Välj månad","labelYearSelect":"Välj år"}
},{}],146:[function(require,module,exports){
module.exports={"monthsFull":["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"],"monthsShort":["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."],"weekdaysFull":["อาทติย","จันทร","องัคาร","พุธ","พฤหสั บดี","ศกุร","เสาร"],"weekdaysShort":["อ.","จ.","อ.","พ.","พฤ.","ศ.","ส."],"today":"วันนี้","clear":"ลบ","format":"d mmmm yyyy","formatSubmit":"yyyy/mm/dd"}
},{}],147:[function(require,module,exports){
module.exports={"monthsFull":["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],"monthsShort":["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"],"weekdaysFull":["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"],"weekdaysShort":["Pzr","Pzt","Sal","Çrş","Prş","Cum","Cmt"],"today":"Bugün","clear":"Sil","close":"Kapat","firstDay":1,"format":"dd mmmm yyyy dddd","formatSubmit":"yyyy/mm/dd"}
},{}],148:[function(require,module,exports){
module.exports={"monthsFull":["січень","лютий","березень","квітень","травень","червень","липень","серпень","вересень","жовтень","листопад","грудень"],"monthsShort":["січ","лют","бер","кві","тра","чер","лип","сер","вер","жов","лис","гру"],"weekdaysFull":["неділя","понеділок","вівторок","середа","четвер","п‘ятниця","субота"],"weekdaysShort":["нд","пн","вт","ср","чт","пт","сб"],"today":"сьогодні","clear":"викреслити","firstDay":1,"format":"dd mmmm yyyy p.","formatSubmit":"yyyy/mm/dd"}
},{}],149:[function(require,module,exports){
module.exports={"monthsFull":["Tháng Một","Tháng Hai","Tháng Ba","Tháng Tư","Tháng Năm","Tháng Sáu","Tháng Bảy","Tháng Tám","Tháng Chín","Tháng Mười","Tháng Mười Một","Tháng Mười Hai"],"monthsShort":["Một","Hai","Ba","Tư","Năm","Sáu","Bảy","Tám","Chín","Mưới","Mười Một","Mười Hai"],"weekdaysFull":["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"],"weekdaysShort":["C.Nhật","T.Hai","T.Ba","T.Tư","T.Năm","T.Sáu","T.Bảy"],"today":"Hôm Nay","clear":"Xoá","firstDay":1}
},{}],150:[function(require,module,exports){
module.exports={"monthsFull":["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],"monthsShort":["一","二","三","四","五","六","七","八","九","十","十一","十二"],"weekdaysFull":["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],"weekdaysShort":["日","一","二","三","四","五","六"],"today":"今日","clear":"清除","close":"关闭","firstDay":1,"format":"yyyy 年 mm 月 dd 日","formatSubmit":"yyyy/mm/dd"}
},{}],151:[function(require,module,exports){
module.exports={"monthsFull":["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],"monthsShort":["一","二","三","四","五","六","七","八","九","十","十一","十二"],"weekdaysFull":["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],"weekdaysShort":["日","一","二","三","四","五","六"],"today":"今天","clear":"清除","close":"关闭","firstDay":1,"format":"yyyy 年 mm 月 dd 日","formatSubmit":"yyyy/mm/dd"}
},{}]},{},[99])(99)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRpZmYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FtZWxpemUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRlZm9ybWF0L2xpYi9kYXRlZm9ybWF0LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvYWRkLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvZG9tLWRlbGVnYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcHJveHktZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9yZW1vdmUtZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLXdhbGsvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXJyb3IvdHlwZWQuanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvb25lLXZlcnNpb24uanMiLCJub2RlX21vZHVsZXMvZm9ybS1kYXRhLXNldC9lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL2Zvcm0tZGF0YS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvbXVsdGlwbGUuanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvc2luZ2xlLmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5fYmluZGNhbGxiYWNrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50aW1lcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tYWluLWxvb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWVyY3VyeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tb250aC1kYXlzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hZGQtbGlzdGVuZXIuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LWFycmF5L2FwcGx5LXBhdGNoLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1tZXRob2RzLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1yZXZlcnNlLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1zb3J0LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvbGliL3NldC1ub24tZW51bWVyYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvcHV0LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9zZXQuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LWFycmF5L3NwbGljZS5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvdHJhbnNhY3Rpb24uanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LXN0cnVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtc3RydWN0L25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtdmFyaGFzaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYvY29tcHV0ZWQuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi93YXRjaC5qcyIsIm5vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcmFmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy10ZW1wbGF0ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9iYXNlLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZhbHVlLWV2ZW50L2NoYW5nZS5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9jbGljay5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9ldmVudC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9rZXkuanMiLCJub2RlX21vZHVsZXMvdmFsdWUtZXZlbnQvbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwibm9kZV9tb2R1bGVzL3ZhbHVlLWV2ZW50L25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9zdWJtaXQuanMiLCJub2RlX21vZHVsZXMvdmFsdWUtZXZlbnQvdmFsdWUuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9pbW11dGFibGUtdGh1bmsuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92ZG9tLXRodW5rL3BhcnRpYWwuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9zaGFsbG93LWVxLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vZG9tLWluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vcGF0Y2gtb3AuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9wYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9ob29rcy9ldi1ob29rLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaG9va3Mvc29mdC1zZXQtaG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92aXJ0dWFsLWh5cGVyc2NyaXB0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvcGFyc2UtdGFnLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2hhbmRsZS10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12aG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12dGV4dC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92cGF0Y2guanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdnRleHQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdnRyZWUvZGlmZi1wcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92dHJlZS9kaWZmLmpzIiwibm9kZV9tb2R1bGVzL3dlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmUuanMiLCJub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2hpZGRlbi1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9tdXRhYmxlLmpzIiwic3JjL2NoYW5uZWxzL2luZGV4LmpzIiwic3JjL2NoYW5uZWxzL2l0ZXJhdGUtbW9udGguanMiLCJzcmMvY2hhbm5lbHMvdG9nZ2xlLmpzIiwic3JjL2dlbmVyYXRlLW1vbnRoLmpzIiwic3JjL2dldC1kYXRlLmpzIiwic3JjL2dldC1maXJzdC1kYXktb2YtbW9udGguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvaW5pdGlhbGl6ZS1zdGF0ZS5qcyIsInNyYy9tb2R1bG8uanMiLCJzcmMvbW91bnQuanMiLCJzcmMvcmVuZGVyZXJzL2RhdGUtcGlja2VyLmpzIiwic3JjL3JlbmRlcmVycy9oZWFkZXIuanMiLCJzcmMvcmVuZGVyZXJzL3BvcC11cC5qcyIsInNyYy9yZW5kZXJlcnMvdGFibGUtaGVhZC5qcyIsInNyYy9zZXR0aW5ncy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9iZy1CRy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9icy1CQS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9jYS1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9jcy1DWi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9kYS1ESy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9kZS1ERS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lbC1HUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lbi1VUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lcy1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9ldC1FRS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9ldS1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9mYS1pci5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9maS1GSS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9mci1GUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9nbC1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oZS1JTC5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oaS1JTi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oci1IUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9odS1IVS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9pZC1JRC5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9pbmRleC5qcyIsInNyYy90cmFuc2xhdGlvbnMvaXMtSVMuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvaXQtSVQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvamEtSlAuanNvbiIsInNyYy90cmFuc2xhdGlvbnMva28tS1IuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbHQtTFQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbHYtTFYuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmItTk8uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmUtTlAuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmwtTkwuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcGwtUEwuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcHQtQlIuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcHQtUFQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcm8tUk8uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcnUtUlUuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc2stU0suanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc2wtU0kuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc3YtU0UuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdGgtVEguanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdHItVFIuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdWstVUEuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdmktVk4uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvemgtQ04uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvemgtVFcuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBO0FBQ0E7O0FDREE7O0FDQUE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTs7QUNBQTs7QUNBQTtBQUNBOztBQ0RBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBOztBQ0FBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIGhlYWQgKGEpIHtcbiAgcmV0dXJuIGFbMF1cbn1cblxuZnVuY3Rpb24gbGFzdCAoYSkge1xuICByZXR1cm4gYVthLmxlbmd0aCAtIDFdXG59XG5cbmZ1bmN0aW9uIHRhaWwoYSkge1xuICByZXR1cm4gYS5zbGljZSgxKVxufVxuXG5mdW5jdGlvbiByZXRyZWF0IChlKSB7XG4gIHJldHVybiBlLnBvcCgpXG59XG5cbmZ1bmN0aW9uIGhhc0xlbmd0aCAoZSkge1xuICByZXR1cm4gZS5sZW5ndGhcbn1cblxuZnVuY3Rpb24gYW55KGFyeSwgdGVzdCkge1xuICBmb3IodmFyIGk9MDtpPGFyeS5sZW5ndGg7aSsrKVxuICAgIGlmKHRlc3QoYXJ5W2ldKSlcbiAgICAgIHJldHVybiB0cnVlXG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBzY29yZSAoYSkge1xuICByZXR1cm4gYS5yZWR1Y2UoZnVuY3Rpb24gKHMsIGEpIHtcbiAgICAgIHJldHVybiBzICsgYS5sZW5ndGggKyBhWzFdICsgMVxuICB9LCAwKVxufVxuXG5mdW5jdGlvbiBiZXN0IChhLCBiKSB7XG4gIHJldHVybiBzY29yZShhKSA8PSBzY29yZShiKSA/IGEgOiBiXG59XG5cblxudmFyIF9ydWxlcyAvLyBzZXQgYXQgdGhlIGJvdHRvbSAgXG5cbi8vIG5vdGUsIG5haXZlIGltcGxlbWVudGF0aW9uLiB3aWxsIGJyZWFrIG9uIGNpcmN1bGFyIG9iamVjdHMuXG5cbmZ1bmN0aW9uIF9lcXVhbChhLCBiKSB7XG4gIGlmKGEgJiYgIWIpIHJldHVybiBmYWxzZVxuICBpZihBcnJheS5pc0FycmF5KGEpKVxuICAgIGlmKGEubGVuZ3RoICE9IGIubGVuZ3RoKSByZXR1cm4gZmFsc2VcbiAgaWYoYSAmJiAnb2JqZWN0JyA9PSB0eXBlb2YgYSkge1xuICAgIGZvcih2YXIgaSBpbiBhKVxuICAgICAgaWYoIV9lcXVhbChhW2ldLCBiW2ldKSkgcmV0dXJuIGZhbHNlXG4gICAgZm9yKHZhciBpIGluIGIpXG4gICAgICBpZighX2VxdWFsKGFbaV0sIGJbaV0pKSByZXR1cm4gZmFsc2VcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIHJldHVybiBhID09IGJcbn1cblxuZnVuY3Rpb24gZ2V0QXJncyhhcmdzKSB7XG4gIHJldHVybiBhcmdzLmxlbmd0aCA9PSAxID8gYXJnc1swXSA6IFtdLnNsaWNlLmNhbGwoYXJncylcbn1cblxuLy8gcmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgZWxlbWVudCBub3QgbGlrZSB0aGUgb3RoZXJzLCBvciAtMVxuZnVuY3Rpb24gb2RkRWxlbWVudChhcnksIGNtcCkge1xuICB2YXIgY1xuICBmdW5jdGlvbiBndWVzcyhhKSB7XG4gICAgdmFyIG9kZCA9IC0xXG4gICAgYyA9IDBcbiAgICBmb3IgKHZhciBpID0gYTsgaSA8IGFyeS5sZW5ndGg7IGkgKyspIHtcbiAgICAgIGlmKCFjbXAoYXJ5W2FdLCBhcnlbaV0pKSB7XG4gICAgICAgIG9kZCA9IGksIGMrK1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYyA+IDEgPyAtMSA6IG9kZFxuICB9XG4gIC8vYXNzdW1lIHRoYXQgaXQgaXMgdGhlIGZpcnN0IGVsZW1lbnQuXG4gIHZhciBnID0gZ3Vlc3MoMClcbiAgaWYoLTEgIT0gZykgcmV0dXJuIGdcbiAgLy8wIHdhcyB0aGUgb2RkIG9uZSwgdGhlbiBhbGwgdGhlIG90aGVyIGVsZW1lbnRzIGFyZSBlcXVhbFxuICAvL2Vsc2UgdGhlcmUgbW9yZSB0aGFuIG9uZSBkaWZmZXJlbnQgZWxlbWVudFxuICBndWVzcygxKVxuICByZXR1cm4gYyA9PSAwID8gMCA6IC0xXG59XG52YXIgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRlcHMsIGV4cG9ydHMpIHtcbiAgdmFyIGVxdWFsID0gKGRlcHMgJiYgZGVwcy5lcXVhbCkgfHwgX2VxdWFsXG4gIGV4cG9ydHMgPSBleHBvcnRzIHx8IHt9IFxuICBleHBvcnRzLmxjcyA9IFxuICBmdW5jdGlvbiBsY3MoKSB7XG4gICAgdmFyIGNhY2hlID0ge31cbiAgICB2YXIgYXJncyA9IGdldEFyZ3MoYXJndW1lbnRzKVxuICAgIHZhciBhID0gYXJnc1swXSwgYiA9IGFyZ3NbMV1cblxuICAgIGZ1bmN0aW9uIGtleSAoYSxiKXtcbiAgICAgIHJldHVybiBhLmxlbmd0aCArICc6JyArIGIubGVuZ3RoXG4gICAgfVxuXG4gICAgLy9maW5kIGxlbmd0aCB0aGF0IG1hdGNoZXMgYXQgdGhlIGhlYWRcblxuICAgIGlmKGFyZ3MubGVuZ3RoID4gMikge1xuICAgICAgLy9pZiBjYWxsZWQgd2l0aCBtdWx0aXBsZSBzZXF1ZW5jZXNcbiAgICAgIC8vcmVjdXJzZSwgc2luY2UgbGNzKGEsIGIsIGMsIGQpID09IGxjcyhsY3MoYSxiKSwgbGNzKGMsZCkpXG4gICAgICBhcmdzLnB1c2gobGNzKGFyZ3Muc2hpZnQoKSwgYXJncy5zaGlmdCgpKSlcbiAgICAgIHJldHVybiBsY3MoYXJncylcbiAgICB9XG4gICAgXG4gICAgLy90aGlzIHdvdWxkIGJlIGltcHJvdmVkIGJ5IHRydW5jYXRpbmcgaW5wdXQgZmlyc3RcbiAgICAvL2FuZCBub3QgcmV0dXJuaW5nIGFuIGxjcyBhcyBhbiBpbnRlcm1lZGlhdGUgc3RlcC5cbiAgICAvL3VudGlsbCB0aGF0IGlzIGEgcGVyZm9ybWFuY2UgcHJvYmxlbS5cblxuICAgIHZhciBzdGFydCA9IDAsIGVuZCA9IDBcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGggJiYgaSA8IGIubGVuZ3RoIFxuICAgICAgJiYgZXF1YWwoYVtpXSwgYltpXSlcbiAgICAgIDsgaSArK1xuICAgIClcbiAgICAgIHN0YXJ0ID0gaSArIDFcblxuICAgIGlmKGEubGVuZ3RoID09PSBzdGFydClcbiAgICAgIHJldHVybiBhLnNsaWNlKClcblxuICAgIGZvcih2YXIgaSA9IDA7ICBpIDwgYS5sZW5ndGggLSBzdGFydCAmJiBpIDwgYi5sZW5ndGggLSBzdGFydFxuICAgICAgJiYgZXF1YWwoYVthLmxlbmd0aCAtIDEgLSBpXSwgYltiLmxlbmd0aCAtIDEgLSBpXSlcbiAgICAgIDsgaSArK1xuICAgIClcbiAgICAgIGVuZCA9IGlcblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2UgKGEsIGIpIHtcbiAgICAgIGlmKCFhLmxlbmd0aCB8fCAhYi5sZW5ndGgpIHJldHVybiBbXVxuICAgICAgLy9hdm9pZCBleHBvbmVudGlhbCB0aW1lIGJ5IGNhY2hpbmcgdGhlIHJlc3VsdHNcbiAgICAgIGlmKGNhY2hlW2tleShhLCBiKV0pIHJldHVybiBjYWNoZVtrZXkoYSwgYildXG5cbiAgICAgIGlmKGVxdWFsKGFbMF0sIGJbMF0pKVxuICAgICAgICByZXR1cm4gW2hlYWQoYSldLmNvbmNhdChyZWN1cnNlKHRhaWwoYSksIHRhaWwoYikpKVxuICAgICAgZWxzZSB7IFxuICAgICAgICB2YXIgX2EgPSByZWN1cnNlKHRhaWwoYSksIGIpXG4gICAgICAgIHZhciBfYiA9IHJlY3Vyc2UoYSwgdGFpbChiKSlcbiAgICAgICAgcmV0dXJuIGNhY2hlW2tleShhLGIpXSA9IF9hLmxlbmd0aCA+IF9iLmxlbmd0aCA/IF9hIDogX2IgIFxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2YXIgbWlkZGxlQSA9IGEuc2xpY2Uoc3RhcnQsIGEubGVuZ3RoIC0gZW5kKVxuICAgIHZhciBtaWRkbGVCID0gYi5zbGljZShzdGFydCwgYi5sZW5ndGggLSBlbmQpXG5cbiAgICByZXR1cm4gKFxuICAgICAgYS5zbGljZSgwLCBzdGFydCkuY29uY2F0KFxuICAgICAgICByZWN1cnNlKG1pZGRsZUEsIG1pZGRsZUIpXG4gICAgICApLmNvbmNhdChhLnNsaWNlKGEubGVuZ3RoIC0gZW5kKSlcbiAgICApXG4gIH1cblxuICAvLyBnaXZlbiBuIHNlcXVlbmNlcywgY2FsYyB0aGUgbGNzLCBhbmQgdGhlbiBjaHVuayBzdHJpbmdzIGludG8gc3RhYmxlIGFuZCB1bnN0YWJsZSBzZWN0aW9ucy5cbiAgLy8gdW5zdGFibGUgY2h1bmtzIGFyZSBwYXNzZWQgdG8gYnVpbGRcbiAgZXhwb3J0cy5jaHVuayA9XG4gIGZ1bmN0aW9uIChxLCBidWlsZCkge1xuICAgIHZhciBxID0gcS5tYXAoZnVuY3Rpb24gKGUpIHsgcmV0dXJuIGUuc2xpY2UoKSB9KVxuICAgIHZhciBsY3MgPSBleHBvcnRzLmxjcy5hcHBseShudWxsLCBxKVxuICAgIHZhciBhbGwgPSBbbGNzXS5jb25jYXQocSlcblxuICAgIGZ1bmN0aW9uIG1hdGNoTGNzIChlKSB7XG4gICAgICBpZihlLmxlbmd0aCAmJiAhbGNzLmxlbmd0aCB8fCAhZS5sZW5ndGggJiYgbGNzLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIGZhbHNlIC8vaW5jYXNlIHRoZSBsYXN0IGl0ZW0gaXMgbnVsbFxuICAgICAgcmV0dXJuIGVxdWFsKGxhc3QoZSksIGxhc3QobGNzKSkgfHwgKChlLmxlbmd0aCArIGxjcy5sZW5ndGgpID09PSAwKVxuICAgIH1cblxuICAgIHdoaWxlKGFueShxLCBoYXNMZW5ndGgpKSB7XG4gICAgICAvL2lmIGVhY2ggZWxlbWVudCBpcyBhdCB0aGUgbGNzIHRoZW4gdGhpcyBjaHVuayBpcyBzdGFibGUuXG4gICAgICB3aGlsZShxLmV2ZXJ5KG1hdGNoTGNzKSAmJiBxLmV2ZXJ5KGhhc0xlbmd0aCkpXG4gICAgICAgIGFsbC5mb3JFYWNoKHJldHJlYXQpXG4gICAgICAvL2NvbGxlY3QgdGhlIGNoYW5nZXMgaW4gZWFjaCBhcnJheSB1cHRvIHRoZSBuZXh0IG1hdGNoIHdpdGggdGhlIGxjc1xuICAgICAgdmFyIGMgPSBmYWxzZVxuICAgICAgdmFyIHVuc3RhYmxlID0gcS5tYXAoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIGNoYW5nZSA9IFtdXG4gICAgICAgIHdoaWxlKCFtYXRjaExjcyhlKSkge1xuICAgICAgICAgIGNoYW5nZS51bnNoaWZ0KHJldHJlYXQoZSkpXG4gICAgICAgICAgYyA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hhbmdlXG4gICAgICB9KVxuICAgICAgaWYoYykgYnVpbGQocVswXS5sZW5ndGgsIHVuc3RhYmxlKVxuICAgIH1cbiAgfVxuXG4gIC8vY2FsY3VsYXRlIGEgZGlmZiB0aGlzIGlzIG9ubHkgdXBkYXRlc1xuICBleHBvcnRzLm9wdGltaXN0aWNEaWZmID1cbiAgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICB2YXIgTSA9IE1hdGgubWF4KGEubGVuZ3RoLCBiLmxlbmd0aClcbiAgICB2YXIgbSA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aClcbiAgICB2YXIgcGF0Y2ggPSBbXVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBNOyBpKyspXG4gICAgICBpZihhW2ldICE9PSBiW2ldKSB7XG4gICAgICAgIHZhciBjdXIgPSBbaSwwXSwgZGVsZXRlcyA9IDBcbiAgICAgICAgd2hpbGUoYVtpXSAhPT0gYltpXSAmJiBpIDwgbSkge1xuICAgICAgICAgIGN1clsxXSA9ICsrZGVsZXRlc1xuICAgICAgICAgIGN1ci5wdXNoKGJbaSsrXSlcbiAgICAgICAgfVxuICAgICAgICAvL3RoZSByZXN0IGFyZSBkZWxldGVzIG9yIGluc2VydHNcbiAgICAgICAgaWYoaSA+PSBtKSB7XG4gICAgICAgICAgLy90aGUgcmVzdCBhcmUgZGVsZXRlc1xuICAgICAgICAgIGlmKGEubGVuZ3RoID4gYi5sZW5ndGgpXG4gICAgICAgICAgICBjdXJbMV0gKz0gYS5sZW5ndGggLSBiLmxlbmd0aFxuICAgICAgICAgIC8vdGhlIHJlc3QgYXJlIGluc2VydHNcbiAgICAgICAgICBlbHNlIGlmKGEubGVuZ3RoIDwgYi5sZW5ndGgpXG4gICAgICAgICAgICBjdXIgPSBjdXIuY29uY2F0KGIuc2xpY2UoYS5sZW5ndGgpKVxuICAgICAgICB9XG4gICAgICAgIHBhdGNoLnB1c2goY3VyKVxuICAgICAgfVxuXG4gICAgcmV0dXJuIHBhdGNoXG4gIH1cblxuICBleHBvcnRzLmRpZmYgPVxuICBmdW5jdGlvbiAoYSwgYikge1xuICAgIHZhciBvcHRpbWlzdGljID0gZXhwb3J0cy5vcHRpbWlzdGljRGlmZihhLCBiKVxuICAgIHZhciBjaGFuZ2VzID0gW11cbiAgICBleHBvcnRzLmNodW5rKFthLCBiXSwgZnVuY3Rpb24gKGluZGV4LCB1bnN0YWJsZSkge1xuICAgICAgdmFyIGRlbCA9IHVuc3RhYmxlLnNoaWZ0KCkubGVuZ3RoXG4gICAgICB2YXIgaW5zZXJ0ID0gdW5zdGFibGUuc2hpZnQoKVxuICAgICAgY2hhbmdlcy5wdXNoKFtpbmRleCwgZGVsXS5jb25jYXQoaW5zZXJ0KSlcbiAgICB9KVxuICAgIHJldHVybiBiZXN0KG9wdGltaXN0aWMsIGNoYW5nZXMpXG4gIH1cblxuICBleHBvcnRzLnBhdGNoID0gZnVuY3Rpb24gKGEsIGNoYW5nZXMsIG11dGF0ZSkge1xuICAgIGlmKG11dGF0ZSAhPT0gdHJ1ZSkgYSA9IGEuc2xpY2UoYSkvL2NvcHkgYVxuICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoY2hhbmdlKSB7XG4gICAgICBbXS5zcGxpY2UuYXBwbHkoYSwgY2hhbmdlKVxuICAgIH0pXG4gICAgcmV0dXJuIGFcbiAgfVxuXG4gIC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29uY2VzdG9yXG4gIC8vIG1lLCBjb25jZXN0b3IsIHlvdS4uLlxuICBleHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gZ2V0QXJncyhhcmd1bWVudHMpXG4gICAgdmFyIHBhdGNoID0gZXhwb3J0cy5kaWZmMyhhcmdzKVxuICAgIHJldHVybiBleHBvcnRzLnBhdGNoKGFyZ3NbMF0sIHBhdGNoKVxuICB9XG5cbiAgZXhwb3J0cy5kaWZmMyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IGdldEFyZ3MoYXJndW1lbnRzKVxuICAgIHZhciByID0gW11cbiAgICBleHBvcnRzLmNodW5rKGFyZ3MsIGZ1bmN0aW9uIChpbmRleCwgdW5zdGFibGUpIHtcbiAgICAgIHZhciBtaW5lID0gdW5zdGFibGVbMF1cbiAgICAgIHZhciBpbnNlcnQgPSByZXNvbHZlKHVuc3RhYmxlKVxuICAgICAgaWYoZXF1YWwobWluZSwgaW5zZXJ0KSkgcmV0dXJuIFxuICAgICAgci5wdXNoKFtpbmRleCwgbWluZS5sZW5ndGhdLmNvbmNhdChpbnNlcnQpKSBcbiAgICB9KVxuICAgIHJldHVybiByXG4gIH1cbiAgZXhwb3J0cy5vZGRPbmVPdXQgPVxuICAgIGZ1bmN0aW9uIG9kZE9uZU91dCAoY2hhbmdlcykge1xuICAgICAgY2hhbmdlcyA9IGNoYW5nZXMuc2xpY2UoKVxuICAgICAgLy9wdXQgdGhlIGNvbmNlc3RvciBmaXJzdFxuICAgICAgY2hhbmdlcy51bnNoaWZ0KGNoYW5nZXMuc3BsaWNlKDEsMSlbMF0pXG4gICAgICB2YXIgaSA9IG9kZEVsZW1lbnQoY2hhbmdlcywgZXF1YWwpXG4gICAgICBpZihpID09IDApIC8vIGNvbmNlc3RvciB3YXMgZGlmZmVyZW50LCAnZmFsc2UgY29uZmxpY3QnXG4gICAgICAgIHJldHVybiBjaGFuZ2VzWzFdXG4gICAgICBpZiAofmkpXG4gICAgICAgIHJldHVybiBjaGFuZ2VzW2ldIFxuICAgIH1cbiAgZXhwb3J0cy5pbnNlcnRNZXJnZU92ZXJEZWxldGUgPSBcbiAgICAvL2kndmUgaW1wbGVtZW50ZWQgdGhpcyBhcyBhIHNlcGVyYXRlIHJ1bGUsXG4gICAgLy9iZWNhdXNlIEkgaGFkIHNlY29uZCB0aG91Z2h0cyBhYm91dCB0aGlzLlxuICAgIGZ1bmN0aW9uIGluc2VydE1lcmdlT3ZlckRlbGV0ZSAoY2hhbmdlcykge1xuICAgICAgY2hhbmdlcyA9IGNoYW5nZXMuc2xpY2UoKVxuICAgICAgY2hhbmdlcy5zcGxpY2UoMSwxKS8vIHJlbW92ZSBjb25jZXN0b3JcbiAgICAgIFxuICAgICAgLy9pZiB0aGVyZSBpcyBvbmx5IG9uZSBub24gZW1wdHkgY2hhbmdlIHRoYXRzIG9rYXkuXG4gICAgICAvL2Vsc2UgZnVsbCBjb25maWxjdFxuICAgICAgZm9yICh2YXIgaSA9IDAsIG5vbmVtcHR5OyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgaWYoY2hhbmdlc1tpXS5sZW5ndGgpIFxuICAgICAgICAgIGlmKCFub25lbXB0eSkgbm9uZW1wdHkgPSBjaGFuZ2VzW2ldXG4gICAgICAgICAgZWxzZSByZXR1cm4gLy8gZnVsbCBjb25mbGljdFxuICAgICAgcmV0dXJuIG5vbmVtcHR5XG4gICAgfVxuXG4gIHZhciBydWxlcyA9IChkZXBzICYmIGRlcHMucnVsZXMpIHx8IFtleHBvcnRzLm9kZE9uZU91dCwgZXhwb3J0cy5pbnNlcnRNZXJnZU92ZXJEZWxldGVdXG5cbiAgZnVuY3Rpb24gcmVzb2x2ZSAoY2hhbmdlcykge1xuICAgIHZhciBsID0gcnVsZXMubGVuZ3RoXG4gICAgZm9yICh2YXIgaSBpbiBydWxlcykgeyAvLyBmaXJzdFxuICAgICAgXG4gICAgICB2YXIgYyA9IHJ1bGVzW2ldICYmIHJ1bGVzW2ldKGNoYW5nZXMpXG4gICAgICBpZihjKSByZXR1cm4gY1xuICAgIH1cbiAgICBjaGFuZ2VzLnNwbGljZSgxLDEpIC8vIHJlbW92ZSBjb25jZXN0b3JcbiAgICAvL3JldHVybmluZyB0aGUgY29uZmxpY3RzIGFzIGFuIG9iamVjdCBpcyBhIHJlYWxseSBiYWQgaWRlYSxcbiAgICAvLyBiZWNhdXNlID09IHdpbGwgbm90IGRldGVjdCB0aGV5IGFyZSB0aGUgc2FtZS4gYW5kIGNvbmZsaWN0cyBidWlsZC5cbiAgICAvLyBiZXR0ZXIgdG8gdXNlXG4gICAgLy8gJzw8PDw8PDw8PDw8PDwnXG4gICAgLy8gb2YgY291cnNlLCBpIHdyb3RlIHRoaXMgYmVmb3JlIGkgc3RhcnRlZCBvbiBzbm9iLCBzbyBpIGRpZG4ndCBrbm93IHRoYXQgdGhlbi5cbiAgICAvKnZhciBjb25mbGljdCA9IFsnPj4+Pj4+Pj4+Pj4+Pj4+PiddXG4gICAgd2hpbGUoY2hhbmdlcy5sZW5ndGgpXG4gICAgICBjb25mbGljdCA9IGNvbmZsaWN0LmNvbmNhdChjaGFuZ2VzLnNoaWZ0KCkpLmNvbmNhdCgnPT09PT09PT09PT09JylcbiAgICBjb25mbGljdC5wb3AoKVxuICAgIGNvbmZsaWN0LnB1c2ggICAgICAgICAgKCc8PDw8PDw8PDw8PDw8PDwnKVxuICAgIGNoYW5nZXMudW5zaGlmdCAgICAgICAoJz4+Pj4+Pj4+Pj4+Pj4+PicpXG4gICAgcmV0dXJuIGNvbmZsaWN0Ki9cbiAgICAvL25haCwgYmV0dGVyIGlzIGp1c3QgdG8gdXNlIGFuIGVxdWFsIGNhbiBoYW5kbGUgb2JqZWN0c1xuICAgIHJldHVybiB7Jz8nOiBjaGFuZ2VzfVxuICB9XG4gIHJldHVybiBleHBvcnRzXG59XG5leHBvcnRzKG51bGwsIGV4cG9ydHMpXG4iLCIiLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykgcmV0dXJuIGNhbWVsQ2FzZShvYmopO1xuICAgIHJldHVybiB3YWxrKG9iaik7XG59O1xuXG5mdW5jdGlvbiB3YWxrIChvYmopIHtcbiAgICBpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JykgcmV0dXJuIG9iajtcbiAgICBpZiAoaXNEYXRlKG9iaikgfHwgaXNSZWdleChvYmopKSByZXR1cm4gb2JqO1xuICAgIGlmIChpc0FycmF5KG9iaikpIHJldHVybiBtYXAob2JqLCB3YWxrKTtcbiAgICByZXR1cm4gcmVkdWNlKG9iamVjdEtleXMob2JqKSwgZnVuY3Rpb24gKGFjYywga2V5KSB7XG4gICAgICAgIHZhciBjYW1lbCA9IGNhbWVsQ2FzZShrZXkpO1xuICAgICAgICBhY2NbY2FtZWxdID0gd2FsayhvYmpba2V5XSk7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xufVxuXG5mdW5jdGlvbiBjYW1lbENhc2Uoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXy4tXShcXHd8JCkvZywgZnVuY3Rpb24gKF8seCkge1xuICAgICAgICByZXR1cm4geC50b1VwcGVyQ2FzZSgpO1xuICAgIH0pO1xufVxuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnZhciBpc0RhdGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBEYXRlXSc7XG59O1xuXG52YXIgaXNSZWdleCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufTtcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKGhhcy5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICAgIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzLnB1c2goZih4c1tpXSwgaSkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiByZWR1Y2UgKHhzLCBmLCBhY2MpIHtcbiAgICBpZiAoeHMucmVkdWNlKSByZXR1cm4geHMucmVkdWNlKGYsIGFjYyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhY2MgPSBmKGFjYywgeHNbaV0sIGkpO1xuICAgIH1cbiAgICByZXR1cm4gYWNjO1xufVxuIiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICpcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLypnbG9iYWwgd2luZG93LCBuYXZpZ2F0b3IsIGRvY3VtZW50LCByZXF1aXJlLCBwcm9jZXNzLCBtb2R1bGUgKi9cbihmdW5jdGlvbiAoYXBwKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIG5hbWVzcGFjZSA9ICdjdWlkJyxcbiAgICBjID0gMCxcbiAgICBibG9ja1NpemUgPSA0LFxuICAgIGJhc2UgPSAzNixcbiAgICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSksXG5cbiAgICBwYWQgPSBmdW5jdGlvbiBwYWQobnVtLCBzaXplKSB7XG4gICAgICB2YXIgcyA9IFwiMDAwMDAwMDAwXCIgKyBudW07XG4gICAgICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGgtc2l6ZSk7XG4gICAgfSxcblxuICAgIHJhbmRvbUJsb2NrID0gZnVuY3Rpb24gcmFuZG9tQmxvY2soKSB7XG4gICAgICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICAgICAgICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgICAgICAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG4gICAgfSxcblxuICAgIHNhZmVDb3VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYyA9IChjIDwgZGlzY3JldGVWYWx1ZXMpID8gYyA6IDA7XG4gICAgICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgICAgIHJldHVybiBjIC0gMTtcbiAgICB9LFxuXG4gICAgYXBpID0gZnVuY3Rpb24gY3VpZCgpIHtcbiAgICAgIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gICAgICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gICAgICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICAgICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgICAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgICAgICBjb3VudGVyLFxuXG4gICAgICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICAgICAgZmluZ2VycHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKSxcblxuICAgICAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgICAgICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuXG4gICAgICByZXR1cm4gIChsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgZmluZ2VycHJpbnQgKyByYW5kb20pO1xuICAgIH07XG5cbiAgYXBpLnNsdWcgPSBmdW5jdGlvbiBzbHVnKCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgICAgY291bnRlcixcbiAgICAgIHByaW50ID0gYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoMCwxKSArXG4gICAgICAgIGFwaS5maW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gICAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpO1xuXG4gICAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICtcbiAgICAgIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbiAgfTtcblxuICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiBnbG9iYWxDb3VudCgpIHtcbiAgICAvLyBXZSB3YW50IHRvIGNhY2hlIHRoZSByZXN1bHRzIG9mIHRoaXNcbiAgICB2YXIgY2FjaGUgPSAoZnVuY3Rpb24gY2FsYygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgY291bnQgPSAwO1xuXG4gICAgICAgIGZvciAoaSBpbiB3aW5kb3cpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgfSgpKTtcblxuICAgIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNhY2hlOyB9O1xuICAgIHJldHVybiBjYWNoZTtcbiAgfTtcblxuICBhcGkuZmluZ2VycHJpbnQgPSBmdW5jdGlvbiBicm93c2VyUHJpbnQoKSB7XG4gICAgcmV0dXJuIHBhZCgobmF2aWdhdG9yLm1pbWVUeXBlcy5sZW5ndGggK1xuICAgICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5sZW5ndGgpLnRvU3RyaW5nKDM2KSArXG4gICAgICBhcGkuZ2xvYmFsQ291bnQoKS50b1N0cmluZygzNiksIDQpO1xuICB9O1xuXG4gIC8vIGRvbid0IGNoYW5nZSBhbnl0aGluZyBmcm9tIGhlcmUgZG93bi5cbiAgaWYgKGFwcC5yZWdpc3Rlcikge1xuICAgIGFwcC5yZWdpc3RlcihuYW1lc3BhY2UsIGFwaSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiAgfSBlbHNlIHtcbiAgICBhcHBbbmFtZXNwYWNlXSA9IGFwaTtcbiAgfVxuXG59KHRoaXMuYXBwbGl0dWRlIHx8IHRoaXMpKTtcbiIsIi8qXG4gKiBEYXRlIEZvcm1hdCAxLjIuM1xuICogKGMpIDIwMDctMjAwOSBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIE1JVCBsaWNlbnNlXG4gKlxuICogSW5jbHVkZXMgZW5oYW5jZW1lbnRzIGJ5IFNjb3R0IFRyZW5kYSA8c2NvdHQudHJlbmRhLm5ldD5cbiAqIGFuZCBLcmlzIEtvd2FsIDxjaXhhci5jb20vfmtyaXMua293YWwvPlxuICpcbiAqIEFjY2VwdHMgYSBkYXRlLCBhIG1hc2ssIG9yIGEgZGF0ZSBhbmQgYSBtYXNrLlxuICogUmV0dXJucyBhIGZvcm1hdHRlZCB2ZXJzaW9uIG9mIHRoZSBnaXZlbiBkYXRlLlxuICogVGhlIGRhdGUgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgZGF0ZS90aW1lLlxuICogVGhlIG1hc2sgZGVmYXVsdHMgdG8gZGF0ZUZvcm1hdC5tYXNrcy5kZWZhdWx0LlxuICovXG5cbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBkYXRlRm9ybWF0ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRva2VuID0gL2R7MSw0fXxtezEsNH18eXkoPzp5eSk/fChbSGhNc1R0XSlcXDE/fFtMbG9TWldOXXwnW14nXSonfCdbXiddKicvZztcbiAgICAgIHZhciB0aW1lem9uZSA9IC9cXGIoPzpbUE1DRUFdW1NEUF1UfCg/OlBhY2lmaWN8TW91bnRhaW58Q2VudHJhbHxFYXN0ZXJufEF0bGFudGljKSAoPzpTdGFuZGFyZHxEYXlsaWdodHxQcmV2YWlsaW5nKSBUaW1lfCg/OkdNVHxVVEMpKD86Wy0rXVxcZHs0fSk/KVxcYi9nO1xuICAgICAgdmFyIHRpbWV6b25lQ2xpcCA9IC9bXi0rXFxkQS1aXS9nO1xuICBcbiAgICAgIC8vIFJlZ2V4ZXMgYW5kIHN1cHBvcnRpbmcgZnVuY3Rpb25zIGFyZSBjYWNoZWQgdGhyb3VnaCBjbG9zdXJlXG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGUsIG1hc2ssIHV0YywgZ210KSB7XG4gIFxuICAgICAgICAvLyBZb3UgY2FuJ3QgcHJvdmlkZSB1dGMgaWYgeW91IHNraXAgb3RoZXIgYXJncyAodXNlIHRoZSAnVVRDOicgbWFzayBwcmVmaXgpXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIGtpbmRPZihkYXRlKSA9PT0gJ3N0cmluZycgJiYgIS9cXGQvLnRlc3QoZGF0ZSkpIHtcbiAgICAgICAgICBtYXNrID0gZGF0ZTtcbiAgICAgICAgICBkYXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gIFxuICAgICAgICBkYXRlID0gZGF0ZSB8fCBuZXcgRGF0ZTtcbiAgXG4gICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICB9XG4gIFxuICAgICAgICBpZiAoaXNOYU4oZGF0ZSkpIHtcbiAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ0ludmFsaWQgZGF0ZScpO1xuICAgICAgICB9XG4gIFxuICAgICAgICBtYXNrID0gU3RyaW5nKGRhdGVGb3JtYXQubWFza3NbbWFza10gfHwgbWFzayB8fCBkYXRlRm9ybWF0Lm1hc2tzWydkZWZhdWx0J10pO1xuICBcbiAgICAgICAgLy8gQWxsb3cgc2V0dGluZyB0aGUgdXRjL2dtdCBhcmd1bWVudCB2aWEgdGhlIG1hc2tcbiAgICAgICAgdmFyIG1hc2tTbGljZSA9IG1hc2suc2xpY2UoMCwgNCk7XG4gICAgICAgIGlmIChtYXNrU2xpY2UgPT09ICdVVEM6JyB8fCBtYXNrU2xpY2UgPT09ICdHTVQ6Jykge1xuICAgICAgICAgIG1hc2sgPSBtYXNrLnNsaWNlKDQpO1xuICAgICAgICAgIHV0YyA9IHRydWU7XG4gICAgICAgICAgaWYgKG1hc2tTbGljZSA9PT0gJ0dNVDonKSB7XG4gICAgICAgICAgICBnbXQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICBcbiAgICAgICAgdmFyIF8gPSB1dGMgPyAnZ2V0VVRDJyA6ICdnZXQnO1xuICAgICAgICB2YXIgZCA9IGRhdGVbXyArICdEYXRlJ10oKTtcbiAgICAgICAgdmFyIEQgPSBkYXRlW18gKyAnRGF5J10oKTtcbiAgICAgICAgdmFyIG0gPSBkYXRlW18gKyAnTW9udGgnXSgpO1xuICAgICAgICB2YXIgeSA9IGRhdGVbXyArICdGdWxsWWVhciddKCk7XG4gICAgICAgIHZhciBIID0gZGF0ZVtfICsgJ0hvdXJzJ10oKTtcbiAgICAgICAgdmFyIE0gPSBkYXRlW18gKyAnTWludXRlcyddKCk7XG4gICAgICAgIHZhciBzID0gZGF0ZVtfICsgJ1NlY29uZHMnXSgpO1xuICAgICAgICB2YXIgTCA9IGRhdGVbXyArICdNaWxsaXNlY29uZHMnXSgpO1xuICAgICAgICB2YXIgbyA9IHV0YyA/IDAgOiBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIHZhciBXID0gZ2V0V2VlayhkYXRlKTtcbiAgICAgICAgdmFyIE4gPSBnZXREYXlPZldlZWsoZGF0ZSk7XG4gICAgICAgIHZhciBmbGFncyA9IHtcbiAgICAgICAgICBkOiAgICBkLFxuICAgICAgICAgIGRkOiAgIHBhZChkKSxcbiAgICAgICAgICBkZGQ6ICBkYXRlRm9ybWF0LmkxOG4uZGF5TmFtZXNbRF0sXG4gICAgICAgICAgZGRkZDogZGF0ZUZvcm1hdC5pMThuLmRheU5hbWVzW0QgKyA3XSxcbiAgICAgICAgICBtOiAgICBtICsgMSxcbiAgICAgICAgICBtbTogICBwYWQobSArIDEpLFxuICAgICAgICAgIG1tbTogIGRhdGVGb3JtYXQuaTE4bi5tb250aE5hbWVzW21dLFxuICAgICAgICAgIG1tbW06IGRhdGVGb3JtYXQuaTE4bi5tb250aE5hbWVzW20gKyAxMl0sXG4gICAgICAgICAgeXk6ICAgU3RyaW5nKHkpLnNsaWNlKDIpLFxuICAgICAgICAgIHl5eXk6IHksXG4gICAgICAgICAgaDogICAgSCAlIDEyIHx8IDEyLFxuICAgICAgICAgIGhoOiAgIHBhZChIICUgMTIgfHwgMTIpLFxuICAgICAgICAgIEg6ICAgIEgsXG4gICAgICAgICAgSEg6ICAgcGFkKEgpLFxuICAgICAgICAgIE06ICAgIE0sXG4gICAgICAgICAgTU06ICAgcGFkKE0pLFxuICAgICAgICAgIHM6ICAgIHMsXG4gICAgICAgICAgc3M6ICAgcGFkKHMpLFxuICAgICAgICAgIGw6ICAgIHBhZChMLCAzKSxcbiAgICAgICAgICBMOiAgICBwYWQoTWF0aC5yb3VuZChMIC8gMTApKSxcbiAgICAgICAgICB0OiAgICBIIDwgMTIgPyAnYScgIDogJ3AnLFxuICAgICAgICAgIHR0OiAgIEggPCAxMiA/ICdhbScgOiAncG0nLFxuICAgICAgICAgIFQ6ICAgIEggPCAxMiA/ICdBJyAgOiAnUCcsXG4gICAgICAgICAgVFQ6ICAgSCA8IDEyID8gJ0FNJyA6ICdQTScsXG4gICAgICAgICAgWjogICAgZ210ID8gJ0dNVCcgOiB1dGMgPyAnVVRDJyA6IChTdHJpbmcoZGF0ZSkubWF0Y2godGltZXpvbmUpIHx8IFsnJ10pLnBvcCgpLnJlcGxhY2UodGltZXpvbmVDbGlwLCAnJyksXG4gICAgICAgICAgbzogICAgKG8gPiAwID8gJy0nIDogJysnKSArIHBhZChNYXRoLmZsb29yKE1hdGguYWJzKG8pIC8gNjApICogMTAwICsgTWF0aC5hYnMobykgJSA2MCwgNCksXG4gICAgICAgICAgUzogICAgWyd0aCcsICdzdCcsICduZCcsICdyZCddW2QgJSAxMCA+IDMgPyAwIDogKGQgJSAxMDAgLSBkICUgMTAgIT0gMTApICogZCAlIDEwXSxcbiAgICAgICAgICBXOiAgICBXLFxuICAgICAgICAgIE46ICAgIE5cbiAgICAgICAgfTtcbiAgXG4gICAgICAgIHJldHVybiBtYXNrLnJlcGxhY2UodG9rZW4sIGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICAgIGlmIChtYXRjaCBpbiBmbGFncykge1xuICAgICAgICAgICAgcmV0dXJuIGZsYWdzW21hdGNoXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG1hdGNoLnNsaWNlKDEsIG1hdGNoLmxlbmd0aCAtIDEpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfSkoKTtcblxuICBkYXRlRm9ybWF0Lm1hc2tzID0ge1xuICAgICdkZWZhdWx0JzogICAgICAgICAgICAgICAnZGRkIG1tbSBkZCB5eXl5IEhIOk1NOnNzJyxcbiAgICAnc2hvcnREYXRlJzogICAgICAgICAgICAgJ20vZC95eScsXG4gICAgJ21lZGl1bURhdGUnOiAgICAgICAgICAgICdtbW0gZCwgeXl5eScsXG4gICAgJ2xvbmdEYXRlJzogICAgICAgICAgICAgICdtbW1tIGQsIHl5eXknLFxuICAgICdmdWxsRGF0ZSc6ICAgICAgICAgICAgICAnZGRkZCwgbW1tbSBkLCB5eXl5JyxcbiAgICAnc2hvcnRUaW1lJzogICAgICAgICAgICAgJ2g6TU0gVFQnLFxuICAgICdtZWRpdW1UaW1lJzogICAgICAgICAgICAnaDpNTTpzcyBUVCcsXG4gICAgJ2xvbmdUaW1lJzogICAgICAgICAgICAgICdoOk1NOnNzIFRUIFonLFxuICAgICdpc29EYXRlJzogICAgICAgICAgICAgICAneXl5eS1tbS1kZCcsXG4gICAgJ2lzb1RpbWUnOiAgICAgICAgICAgICAgICdISDpNTTpzcycsXG4gICAgJ2lzb0RhdGVUaW1lJzogICAgICAgICAgICd5eXl5LW1tLWRkXFwnVFxcJ0hIOk1NOnNzbycsXG4gICAgJ2lzb1V0Y0RhdGVUaW1lJzogICAgICAgICdVVEM6eXl5eS1tbS1kZFxcJ1RcXCdISDpNTTpzc1xcJ1pcXCcnLFxuICAgICdleHBpcmVzSGVhZGVyRm9ybWF0JzogICAnZGRkLCBkZCBtbW0geXl5eSBISDpNTTpzcyBaJ1xuICB9O1xuXG4gIC8vIEludGVybmF0aW9uYWxpemF0aW9uIHN0cmluZ3NcbiAgZGF0ZUZvcm1hdC5pMThuID0ge1xuICAgIGRheU5hbWVzOiBbXG4gICAgICAnU3VuJywgJ01vbicsICdUdWUnLCAnV2VkJywgJ1RodScsICdGcmknLCAnU2F0JyxcbiAgICAgICdTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSdcbiAgICBdLFxuICAgIG1vbnRoTmFtZXM6IFtcbiAgICAgICdKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYycsXG4gICAgICAnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlcidcbiAgICBdXG4gIH07XG5cbmZ1bmN0aW9uIHBhZCh2YWwsIGxlbikge1xuICB2YWwgPSBTdHJpbmcodmFsKTtcbiAgbGVuID0gbGVuIHx8IDI7XG4gIHdoaWxlICh2YWwubGVuZ3RoIDwgbGVuKSB7XG4gICAgdmFsID0gJzAnICsgdmFsO1xuICB9XG4gIHJldHVybiB2YWw7XG59XG5cbi8qKlxuICogR2V0IHRoZSBJU08gODYwMSB3ZWVrIG51bWJlclxuICogQmFzZWQgb24gY29tbWVudHMgZnJvbVxuICogaHR0cDovL3RlY2hibG9nLnByb2N1cmlvcy5ubC9rL242MTgvbmV3cy92aWV3LzMzNzk2LzE0ODYzL0NhbGN1bGF0ZS1JU08tODYwMS13ZWVrLWFuZC15ZWFyLWluLWphdmFzY3JpcHQuaHRtbFxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gYGRhdGVgXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldFdlZWsoZGF0ZSkge1xuICAvLyBSZW1vdmUgdGltZSBjb21wb25lbnRzIG9mIGRhdGVcbiAgdmFyIHRhcmdldFRodXJzZGF5ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKTtcblxuICAvLyBDaGFuZ2UgZGF0ZSB0byBUaHVyc2RheSBzYW1lIHdlZWtcbiAgdGFyZ2V0VGh1cnNkYXkuc2V0RGF0ZSh0YXJnZXRUaHVyc2RheS5nZXREYXRlKCkgLSAoKHRhcmdldFRodXJzZGF5LmdldERheSgpICsgNikgJSA3KSArIDMpO1xuXG4gIC8vIFRha2UgSmFudWFyeSA0dGggYXMgaXQgaXMgYWx3YXlzIGluIHdlZWsgMSAoc2VlIElTTyA4NjAxKVxuICB2YXIgZmlyc3RUaHVyc2RheSA9IG5ldyBEYXRlKHRhcmdldFRodXJzZGF5LmdldEZ1bGxZZWFyKCksIDAsIDQpO1xuXG4gIC8vIENoYW5nZSBkYXRlIHRvIFRodXJzZGF5IHNhbWUgd2Vla1xuICBmaXJzdFRodXJzZGF5LnNldERhdGUoZmlyc3RUaHVyc2RheS5nZXREYXRlKCkgLSAoKGZpcnN0VGh1cnNkYXkuZ2V0RGF5KCkgKyA2KSAlIDcpICsgMyk7XG5cbiAgLy8gQ2hlY2sgaWYgZGF5bGlnaHQtc2F2aW5nLXRpbWUtc3dpdGNoIG9jY3VyZWQgYW5kIGNvcnJlY3QgZm9yIGl0XG4gIHZhciBkcyA9IHRhcmdldFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCkgLSBmaXJzdFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHRhcmdldFRodXJzZGF5LnNldEhvdXJzKHRhcmdldFRodXJzZGF5LmdldEhvdXJzKCkgLSBkcyk7XG5cbiAgLy8gTnVtYmVyIG9mIHdlZWtzIGJldHdlZW4gdGFyZ2V0IFRodXJzZGF5IGFuZCBmaXJzdCBUaHVyc2RheVxuICB2YXIgd2Vla0RpZmYgPSAodGFyZ2V0VGh1cnNkYXkgLSBmaXJzdFRodXJzZGF5KSAvICg4NjQwMDAwMCo3KTtcbiAgcmV0dXJuIDEgKyBNYXRoLmZsb29yKHdlZWtEaWZmKTtcbn1cblxuLyoqXG4gKiBHZXQgSVNPLTg2MDEgbnVtZXJpYyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF5IG9mIHRoZSB3ZWVrXG4gKiAxIChmb3IgTW9uZGF5KSB0aHJvdWdoIDcgKGZvciBTdW5kYXkpXG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gYGRhdGVgXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldERheU9mV2VlayhkYXRlKSB7XG4gIHZhciBkb3cgPSBkYXRlLmdldERheSgpO1xuICBpZihkb3cgPT09IDApIHtcbiAgICBkb3cgPSA3O1xuICB9XG4gIHJldHVybiBkb3c7XG59XG5cbi8qKlxuICoga2luZC1vZiBzaG9ydGN1dFxuICogQHBhcmFtICB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGtpbmRPZih2YWwpIHtcbiAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgIHJldHVybiAnbnVsbCc7XG4gIH1cblxuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICByZXR1cm4gJ2FycmF5JztcbiAgfVxuXG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKHZhbClcbiAgICAuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBkYXRlRm9ybWF0O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGF0ZUZvcm1hdDtcbiAgfSBlbHNlIHtcbiAgICBnbG9iYWwuZGF0ZUZvcm1hdCA9IGRhdGVGb3JtYXQ7XG4gIH1cbn0pKHRoaXMpO1xuIiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhZGRFdmVudFxuXG5mdW5jdGlvbiBhZGRFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IGhhbmRsZXJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnQpKSB7XG4gICAgICAgIGlmIChldmVudC5pbmRleE9mKGhhbmRsZXIpID09PSAtMSkge1xuICAgICAgICAgICAgZXZlbnQucHVzaChoYW5kbGVyKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudCAhPT0gaGFuZGxlcikge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBbZXZlbnQsIGhhbmRsZXJdXG4gICAgfVxufVxuIiwidmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcbnZhciBjcmVhdGVTdG9yZSA9IHJlcXVpcmUoXCJ3ZWFrbWFwLXNoaW0vY3JlYXRlLXN0b3JlXCIpXG5cbnZhciBhZGRFdmVudCA9IHJlcXVpcmUoXCIuL2FkZC1ldmVudC5qc1wiKVxudmFyIHJlbW92ZUV2ZW50ID0gcmVxdWlyZShcIi4vcmVtb3ZlLWV2ZW50LmpzXCIpXG52YXIgUHJveHlFdmVudCA9IHJlcXVpcmUoXCIuL3Byb3h5LWV2ZW50LmpzXCIpXG5cbnZhciBIQU5ETEVSX1NUT1JFID0gY3JlYXRlU3RvcmUoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERPTURlbGVnYXRvclxuXG5mdW5jdGlvbiBET01EZWxlZ2F0b3IoZG9jdW1lbnQpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRE9NRGVsZWdhdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IERPTURlbGVnYXRvcihkb2N1bWVudCk7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQgPSBkb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdGhpcy50YXJnZXQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICB0aGlzLmV2ZW50cyA9IHt9XG4gICAgdGhpcy5yYXdFdmVudExpc3RlbmVycyA9IHt9XG4gICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnMgPSB7fVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBhZGRFdmVudFxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gcmVtb3ZlRXZlbnRcblxuRE9NRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlID1cbiAgICBmdW5jdGlvbiBhbGxvY2F0ZUhhbmRsZShmdW5jKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSBuZXcgSGFuZGxlKClcblxuICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuYyA9IGZ1bmM7XG5cbiAgICAgICAgcmV0dXJuIGhhbmRsZVxuICAgIH1cblxuRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZSA9XG4gICAgZnVuY3Rpb24gdHJhbnNmb3JtSGFuZGxlKGhhbmRsZSwgYnJvYWRjYXN0KSB7XG4gICAgICAgIHZhciBmdW5jID0gSEFORExFUl9TVE9SRShoYW5kbGUpLmZ1bmNcblxuICAgICAgICByZXR1cm4gdGhpcy5hbGxvY2F0ZUhhbmRsZShmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGJyb2FkY2FzdChldiwgZnVuYyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEdsb2JhbEV2ZW50TGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIGFkZEdsb2JhbEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmbikge1xuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcbiAgICAgICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGZuKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5wdXNoKGZuKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IGxpc3RlbmVycztcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUucmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgICAgIHZhciBpbmRleCA9IGxpc3RlbmVycy5pbmRleE9mKGZuKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICB9XG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmxpc3RlblRvID0gZnVuY3Rpb24gbGlzdGVuVG8oZXZlbnROYW1lKSB7XG4gICAgaWYgKCEoZXZlbnROYW1lIGluIHRoaXMuZXZlbnRzKSkge1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdKys7XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMSkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdID1cbiAgICAgICAgICAgIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCB0aGlzKVxuICAgIH1cblxuICAgIHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSlcbn1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS51bmxpc3RlblRvID0gZnVuY3Rpb24gdW5saXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgdW5saXN0ZW5lZCB0byBldmVudC5cIik7XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXS0tO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gIT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdXG5cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3IjdW5saXN0ZW5UbzogY2Fubm90IFwiICtcbiAgICAgICAgICAgIFwidW5saXN0ZW4gdG8gXCIgKyBldmVudE5hbWUpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVIYW5kbGVyKGV2ZW50TmFtZSwgZGVsZWdhdG9yKSB7XG4gICAgdmFyIGdsb2JhbExpc3RlbmVycyA9IGRlbGVnYXRvci5nbG9iYWxMaXN0ZW5lcnM7XG4gICAgdmFyIGRlbGVnYXRvclRhcmdldCA9IGRlbGVnYXRvci50YXJnZXQ7XG5cbiAgICByZXR1cm4gaGFuZGxlclxuXG4gICAgZnVuY3Rpb24gaGFuZGxlcihldikge1xuICAgICAgICB2YXIgZ2xvYmFsSGFuZGxlcnMgPSBnbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXVxuXG4gICAgICAgIGlmIChnbG9iYWxIYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZ2xvYmFsRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgICAgICBnbG9iYWxFdmVudC5jdXJyZW50VGFyZ2V0ID0gZGVsZWdhdG9yVGFyZ2V0O1xuICAgICAgICAgICAgY2FsbExpc3RlbmVycyhnbG9iYWxIYW5kbGVycywgZ2xvYmFsRXZlbnQpXG4gICAgICAgIH1cblxuICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKGV2LnRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZWxlbSwgZXYsIGV2ZW50TmFtZSkge1xuICAgIHZhciBsaXN0ZW5lciA9IGdldExpc3RlbmVyKGVsZW0sIGV2ZW50TmFtZSlcblxuICAgIGlmIChsaXN0ZW5lciAmJiBsaXN0ZW5lci5oYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lckV2ZW50ID0gbmV3IFByb3h5RXZlbnQoZXYpO1xuICAgICAgICBsaXN0ZW5lckV2ZW50LmN1cnJlbnRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0XG4gICAgICAgIGNhbGxMaXN0ZW5lcnMobGlzdGVuZXIuaGFuZGxlcnMsIGxpc3RlbmVyRXZlbnQpXG5cbiAgICAgICAgaWYgKGxpc3RlbmVyRXZlbnQuX2J1YmJsZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXh0VGFyZ2V0ID0gbGlzdGVuZXIuY3VycmVudFRhcmdldC5wYXJlbnROb2RlXG4gICAgICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKG5leHRUYXJnZXQsIGV2LCBldmVudE5hbWUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldExpc3RlbmVyKHRhcmdldCwgdHlwZSkge1xuICAgIC8vIHRlcm1pbmF0ZSByZWN1cnNpb24gaWYgcGFyZW50IGlzIGBudWxsYFxuICAgIGlmICh0YXJnZXQgPT09IG51bGwgfHwgdHlwZW9mIHRhcmdldCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICAvLyBmZXRjaCBsaXN0IG9mIGhhbmRsZXIgZm5zIGZvciB0aGlzIGV2ZW50XG4gICAgdmFyIGhhbmRsZXIgPSBldmVudHNbdHlwZV1cbiAgICB2YXIgYWxsSGFuZGxlciA9IGV2ZW50cy5ldmVudFxuXG4gICAgaWYgKCFoYW5kbGVyICYmICFhbGxIYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiBnZXRMaXN0ZW5lcih0YXJnZXQucGFyZW50Tm9kZSwgdHlwZSlcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMgPSBbXS5jb25jYXQoaGFuZGxlciB8fCBbXSwgYWxsSGFuZGxlciB8fCBbXSlcbiAgICByZXR1cm4gbmV3IExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpXG59XG5cbmZ1bmN0aW9uIGNhbGxMaXN0ZW5lcnMoaGFuZGxlcnMsIGV2KSB7XG4gICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaGFuZGxlcihldilcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlci5oYW5kbGVFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyLmhhbmRsZUV2ZW50KGV2KVxuICAgICAgICB9IGVsc2UgaWYgKGhhbmRsZXIudHlwZSA9PT0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiKSB7XG4gICAgICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZXIpLmZ1bmMoZXYpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkb20tZGVsZWdhdG9yOiB1bmtub3duIGhhbmRsZXIgXCIgK1xuICAgICAgICAgICAgICAgIFwiZm91bmQ6IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFuZGxlcnMpKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpIHtcbiAgICB0aGlzLmN1cnJlbnRUYXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLmhhbmRsZXJzID0gaGFuZGxlcnNcbn1cblxuZnVuY3Rpb24gSGFuZGxlKCkge1xuICAgIHRoaXMudHlwZSA9IFwiZG9tLWRlbGVnYXRvci1oYW5kbGVcIlxufVxuIiwidmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKFwiaW5kaXZpZHVhbFwiKVxudmFyIGN1aWQgPSByZXF1aXJlKFwiY3VpZFwiKVxudmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgRE9NRGVsZWdhdG9yID0gcmVxdWlyZShcIi4vZG9tLWRlbGVnYXRvci5qc1wiKVxuXG52YXIgdmVyc2lvbktleSA9IFwiMTNcIlxudmFyIGNhY2hlS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVAXCIgKyB2ZXJzaW9uS2V5XG52YXIgY2FjaGVUb2tlbktleSA9IFwiX19ET01fREVMRUdBVE9SX0NBQ0hFX1RPS0VOQFwiICsgdmVyc2lvbktleVxudmFyIGRlbGVnYXRvckNhY2hlID0gSW5kaXZpZHVhbChjYWNoZUtleSwge1xuICAgIGRlbGVnYXRvcnM6IHt9XG59KVxudmFyIGNvbW1vbkV2ZW50cyA9IFtcbiAgICBcImJsdXJcIiwgXCJjaGFuZ2VcIiwgXCJjbGlja1wiLCAgXCJjb250ZXh0bWVudVwiLCBcImRibGNsaWNrXCIsXG4gICAgXCJlcnJvclwiLFwiZm9jdXNcIiwgXCJmb2N1c2luXCIsIFwiZm9jdXNvdXRcIiwgXCJpbnB1dFwiLCBcImtleWRvd25cIixcbiAgICBcImtleXByZXNzXCIsIFwia2V5dXBcIiwgXCJsb2FkXCIsIFwibW91c2Vkb3duXCIsIFwibW91c2V1cFwiLFxuICAgIFwicmVzaXplXCIsIFwic2VsZWN0XCIsIFwic3VibWl0XCIsIFwidG91Y2hjYW5jZWxcIixcbiAgICBcInRvdWNoZW5kXCIsIFwidG91Y2hzdGFydFwiLCBcInVubG9hZFwiXG5dXG5cbi8qICBEZWxlZ2F0b3IgaXMgYSB0aGluIHdyYXBwZXIgYXJvdW5kIGEgc2luZ2xldG9uIGBET01EZWxlZ2F0b3JgXG4gICAgICAgIGluc3RhbmNlLlxuXG4gICAgT25seSBvbmUgRE9NRGVsZWdhdG9yIHNob3VsZCBleGlzdCBiZWNhdXNlIHdlIGRvIG5vdCB3YW50XG4gICAgICAgIGR1cGxpY2F0ZSBldmVudCBsaXN0ZW5lcnMgYm91bmQgdG8gdGhlIERPTS5cblxuICAgIGBEZWxlZ2F0b3JgIHdpbGwgYWxzbyBgbGlzdGVuVG8oKWAgYWxsIGV2ZW50cyB1bmxlc3NcbiAgICAgICAgZXZlcnkgY2FsbGVyIG9wdHMgb3V0IG9mIGl0XG4qL1xubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0b3JcblxuZnVuY3Rpb24gRGVsZWdhdG9yKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHZhciBkb2N1bWVudCA9IG9wdHMuZG9jdW1lbnQgfHwgZ2xvYmFsRG9jdW1lbnRcblxuICAgIHZhciBjYWNoZUtleSA9IGRvY3VtZW50W2NhY2hlVG9rZW5LZXldXG5cbiAgICBpZiAoIWNhY2hlS2V5KSB7XG4gICAgICAgIGNhY2hlS2V5ID1cbiAgICAgICAgICAgIGRvY3VtZW50W2NhY2hlVG9rZW5LZXldID0gY3VpZCgpXG4gICAgfVxuXG4gICAgdmFyIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldXG5cbiAgICBpZiAoIWRlbGVnYXRvcikge1xuICAgICAgICBkZWxlZ2F0b3IgPSBkZWxlZ2F0b3JDYWNoZS5kZWxlZ2F0b3JzW2NhY2hlS2V5XSA9XG4gICAgICAgICAgICBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KVxuICAgIH1cblxuICAgIGlmIChvcHRzLmRlZmF1bHRFdmVudHMgIT09IGZhbHNlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tbW9uRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWxlZ2F0b3IubGlzdGVuVG8oY29tbW9uRXZlbnRzW2ldKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGVnYXRvclxufVxuXG5EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPSBET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGU7XG5EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID0gRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZTtcbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuXG52YXIgQUxMX1BST1BTID0gW1xuICAgIFwiYWx0S2V5XCIsIFwiYnViYmxlc1wiLCBcImNhbmNlbGFibGVcIiwgXCJjdHJsS2V5XCIsXG4gICAgXCJldmVudFBoYXNlXCIsIFwibWV0YUtleVwiLCBcInJlbGF0ZWRUYXJnZXRcIiwgXCJzaGlmdEtleVwiLFxuICAgIFwidGFyZ2V0XCIsIFwidGltZVN0YW1wXCIsIFwidHlwZVwiLCBcInZpZXdcIiwgXCJ3aGljaFwiXG5dXG52YXIgS0VZX1BST1BTID0gW1wiY2hhclwiLCBcImNoYXJDb2RlXCIsIFwia2V5XCIsIFwia2V5Q29kZVwiXVxudmFyIE1PVVNFX1BST1BTID0gW1xuICAgIFwiYnV0dG9uXCIsIFwiYnV0dG9uc1wiLCBcImNsaWVudFhcIiwgXCJjbGllbnRZXCIsIFwibGF5ZXJYXCIsXG4gICAgXCJsYXllcllcIiwgXCJvZmZzZXRYXCIsIFwib2Zmc2V0WVwiLCBcInBhZ2VYXCIsIFwicGFnZVlcIixcbiAgICBcInNjcmVlblhcIiwgXCJzY3JlZW5ZXCIsIFwidG9FbGVtZW50XCJcbl1cblxudmFyIHJrZXlFdmVudCA9IC9ea2V5fGlucHV0L1xudmFyIHJtb3VzZUV2ZW50ID0gL14oPzptb3VzZXxwb2ludGVyfGNvbnRleHRtZW51KXxjbGljay9cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eUV2ZW50XG5cbmZ1bmN0aW9uIFByb3h5RXZlbnQoZXYpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJveHlFdmVudCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGlmIChya2V5RXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IEtleUV2ZW50KGV2KVxuICAgIH0gZWxzZSBpZiAocm1vdXNlRXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vdXNlRXZlbnQoZXYpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxuICAgIHRoaXMuX2J1YmJsZXMgPSBmYWxzZTtcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmF3RXZlbnQucHJldmVudERlZmF1bHQoKVxufVxuXG5Qcm94eUV2ZW50LnByb3RvdHlwZS5zdGFydFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2J1YmJsZXMgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBNT1VTRV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbW91c2VQcm9wS2V5ID0gTU9VU0VfUFJPUFNbal1cbiAgICAgICAgdGhpc1ttb3VzZVByb3BLZXldID0gZXZbbW91c2VQcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbn1cblxuaW5oZXJpdHMoTW91c2VFdmVudCwgUHJveHlFdmVudClcblxuZnVuY3Rpb24gS2V5RXZlbnQoZXYpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IEtFWV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIga2V5UHJvcEtleSA9IEtFWV9QUk9QU1tqXVxuICAgICAgICB0aGlzW2tleVByb3BLZXldID0gZXZba2V5UHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKEtleUV2ZW50LCBQcm94eUV2ZW50KVxuIiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSByZW1vdmVFdmVudFxuXG5mdW5jdGlvbiByZW1vdmVFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gZXZlbnQuaW5kZXhPZihoYW5kbGVyKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IG51bGxcbiAgICB9XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2VcblxubW9kdWxlLmV4cG9ydHMgPSBpdGVyYXRpdmVseVdhbGtcblxuZnVuY3Rpb24gaXRlcmF0aXZlbHlXYWxrKG5vZGVzLCBjYikge1xuICAgIGlmICghKCdsZW5ndGgnIGluIG5vZGVzKSkge1xuICAgICAgICBub2RlcyA9IFtub2Rlc11cbiAgICB9XG4gICAgXG4gICAgbm9kZXMgPSBzbGljZS5jYWxsKG5vZGVzKVxuXG4gICAgd2hpbGUobm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBub2RlID0gbm9kZXMuc2hpZnQoKSxcbiAgICAgICAgICAgIHJldCA9IGNiKG5vZGUpXG5cbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuY2hpbGROb2RlcyAmJiBub2RlLmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlcyA9IHNsaWNlLmNhbGwobm9kZS5jaGlsZE5vZGVzKS5jb25jYXQobm9kZXMpXG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJ2YXIgY2FtZWxpemUgPSByZXF1aXJlKFwiY2FtZWxpemVcIilcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoXCJzdHJpbmctdGVtcGxhdGVcIilcbnZhciBleHRlbmQgPSByZXF1aXJlKFwieHRlbmQvbXV0YWJsZVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFR5cGVkRXJyb3JcblxuZnVuY3Rpb24gVHlwZWRFcnJvcihhcmdzKSB7XG4gICAgaWYgKCFhcmdzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImFyZ3MgaXMgcmVxdWlyZWRcIik7XG4gICAgfVxuICAgIGlmICghYXJncy50eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImFyZ3MudHlwZSBpcyByZXF1aXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKCFhcmdzLm1lc3NhZ2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXJncy5tZXNzYWdlIGlzIHJlcXVpcmVkXCIpO1xuICAgIH1cblxuICAgIHZhciBtZXNzYWdlID0gYXJncy5tZXNzYWdlXG5cbiAgICBpZiAoYXJncy50eXBlICYmICFhcmdzLm5hbWUpIHtcbiAgICAgICAgdmFyIGVycm9yTmFtZSA9IGNhbWVsaXplKGFyZ3MudHlwZSkgKyBcIkVycm9yXCJcbiAgICAgICAgYXJncy5uYW1lID0gZXJyb3JOYW1lWzBdLnRvVXBwZXJDYXNlKCkgKyBlcnJvck5hbWUuc3Vic3RyKDEpXG4gICAgfVxuXG4gICAgZXh0ZW5kKGNyZWF0ZUVycm9yLCBhcmdzKTtcbiAgICBjcmVhdGVFcnJvci5fbmFtZSA9IGFyZ3MubmFtZTtcblxuICAgIHJldHVybiBjcmVhdGVFcnJvcjtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG9wdHMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBFcnJvcigpXG5cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlc3VsdCwgXCJ0eXBlXCIsIHtcbiAgICAgICAgICAgIHZhbHVlOiByZXN1bHQudHlwZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9KVxuXG4gICAgICAgIHZhciBvcHRpb25zID0gZXh0ZW5kKHt9LCBhcmdzLCBvcHRzKVxuXG4gICAgICAgIGV4dGVuZChyZXN1bHQsIG9wdGlvbnMpXG4gICAgICAgIHJlc3VsdC5tZXNzYWdlID0gdGVtcGxhdGUobWVzc2FnZSwgb3B0aW9ucylcblxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBPbmVWZXJzaW9uQ29uc3RyYWludCA9IHJlcXVpcmUoJ2luZGl2aWR1YWwvb25lLXZlcnNpb24nKTtcblxudmFyIE1ZX1ZFUlNJT04gPSAnNyc7XG5PbmVWZXJzaW9uQ29uc3RyYWludCgnZXYtc3RvcmUnLCBNWV9WRVJTSU9OKTtcblxudmFyIGhhc2hLZXkgPSAnX19FVl9TVE9SRV9LRVlAJyArIE1ZX1ZFUlNJT047XG5cbm1vZHVsZS5leHBvcnRzID0gRXZTdG9yZTtcblxuZnVuY3Rpb24gRXZTdG9yZShlbGVtKSB7XG4gICAgdmFyIGhhc2ggPSBlbGVtW2hhc2hLZXldO1xuXG4gICAgaWYgKCFoYXNoKSB7XG4gICAgICAgIGhhc2ggPSBlbGVtW2hhc2hLZXldID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc2g7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qZ2xvYmFsIHdpbmRvdywgZ2xvYmFsKi9cblxudmFyIHJvb3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/XG4gICAgd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIGdsb2JhbCA6IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGl2aWR1YWw7XG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gcm9vdCkge1xuICAgICAgICByZXR1cm4gcm9vdFtrZXldO1xuICAgIH1cblxuICAgIHJvb3Rba2V5XSA9IHZhbHVlO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgSW5kaXZpZHVhbCA9IHJlcXVpcmUoJy4vaW5kZXguanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBPbmVWZXJzaW9uO1xuXG5mdW5jdGlvbiBPbmVWZXJzaW9uKG1vZHVsZU5hbWUsIHZlcnNpb24sIGRlZmF1bHRWYWx1ZSkge1xuICAgIHZhciBrZXkgPSAnX19JTkRJVklEVUFMX09ORV9WRVJTSU9OXycgKyBtb2R1bGVOYW1lO1xuICAgIHZhciBlbmZvcmNlS2V5ID0ga2V5ICsgJ19FTkZPUkNFX1NJTkdMRVRPTic7XG5cbiAgICB2YXIgdmVyc2lvblZhbHVlID0gSW5kaXZpZHVhbChlbmZvcmNlS2V5LCB2ZXJzaW9uKTtcblxuICAgIGlmICh2ZXJzaW9uVmFsdWUgIT09IHZlcnNpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBoYXZlIG9uZSBjb3B5IG9mICcgK1xuICAgICAgICAgICAgbW9kdWxlTmFtZSArICcuXFxuJyArXG4gICAgICAgICAgICAnWW91IGFscmVhZHkgaGF2ZSB2ZXJzaW9uICcgKyB2ZXJzaW9uVmFsdWUgK1xuICAgICAgICAgICAgJyBpbnN0YWxsZWQuXFxuJyArXG4gICAgICAgICAgICAnVGhpcyBtZWFucyB5b3UgY2Fubm90IGluc3RhbGwgdmVyc2lvbiAnICsgdmVyc2lvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIEluZGl2aWR1YWwoa2V5LCBkZWZhdWx0VmFsdWUpO1xufVxuIiwidmFyIHdhbGsgPSByZXF1aXJlKCdkb20td2FsaycpXG5cbnZhciBGb3JtRGF0YSA9IHJlcXVpcmUoJy4vaW5kZXguanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEZvcm1EYXRhXG5cbmZ1bmN0aW9uIGJ1aWxkRWxlbXMocm9vdEVsZW0pIHtcbiAgICB2YXIgaGFzaCA9IHt9XG4gICAgaWYgKHJvb3RFbGVtLm5hbWUpIHtcbiAgICBcdGhhc2hbcm9vdEVsZW0ubmFtZV0gPSByb290RWxlbVxuICAgIH1cblxuICAgIHdhbGsocm9vdEVsZW0sIGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBpZiAoY2hpbGQubmFtZSkge1xuICAgICAgICAgICAgaGFzaFtjaGlsZC5uYW1lXSA9IGNoaWxkXG4gICAgICAgIH1cbiAgICB9KVxuXG5cbiAgICByZXR1cm4gaGFzaFxufVxuXG5mdW5jdGlvbiBnZXRGb3JtRGF0YShyb290RWxlbSkge1xuICAgIHZhciBlbGVtZW50cyA9IGJ1aWxkRWxlbXMocm9vdEVsZW0pXG5cbiAgICByZXR1cm4gRm9ybURhdGEoZWxlbWVudHMpXG59XG4iLCIvKmpzaGludCBtYXhjb21wbGV4aXR5OiAxMCovXG5cbm1vZHVsZS5leHBvcnRzID0gRm9ybURhdGFcblxuLy9UT0RPOiBNYXNzaXZlIHNwZWM6IGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL2Fzc29jaWF0aW9uLW9mLWNvbnRyb2xzLWFuZC1mb3Jtcy5odG1sI2NvbnN0cnVjdGluZy1mb3JtLWRhdGEtc2V0XG5mdW5jdGlvbiBGb3JtRGF0YShlbGVtZW50cykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhlbGVtZW50cykucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGtleSkge1xuICAgICAgICB2YXIgZWxlbSA9IGVsZW1lbnRzW2tleV1cblxuICAgICAgICBhY2Nba2V5XSA9IHZhbHVlT2ZFbGVtZW50KGVsZW0pXG5cbiAgICAgICAgcmV0dXJuIGFjY1xuICAgIH0sIHt9KVxufVxuXG5mdW5jdGlvbiB2YWx1ZU9mRWxlbWVudChlbGVtKSB7XG4gICAgaWYgKHR5cGVvZiBlbGVtID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0oKVxuICAgIH0gZWxzZSBpZiAoY29udGFpbnNSYWRpbyhlbGVtKSkge1xuICAgICAgICB2YXIgZWxlbXMgPSB0b0xpc3QoZWxlbSlcbiAgICAgICAgdmFyIGNoZWNrZWQgPSBlbGVtcy5maWx0ZXIoZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtLmNoZWNrZWRcbiAgICAgICAgfSlbMF0gfHwgbnVsbFxuXG4gICAgICAgIHJldHVybiBjaGVja2VkID8gY2hlY2tlZC52YWx1ZSA6IG51bGxcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZWxlbSkpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0ubWFwKHZhbHVlT2ZFbGVtZW50KS5maWx0ZXIoZmlsdGVyTnVsbClcbiAgICB9IGVsc2UgaWYgKGVsZW0udGFnTmFtZSA9PT0gdW5kZWZpbmVkICYmIGVsZW0ubm9kZVR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gRm9ybURhdGEoZWxlbSlcbiAgICB9IGVsc2UgaWYgKGVsZW0udGFnTmFtZSA9PT0gXCJJTlBVVFwiICYmIGlzQ2hlY2tlZChlbGVtKSkge1xuICAgICAgICBpZiAoZWxlbS5oYXNBdHRyaWJ1dGUoXCJ2YWx1ZVwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0uY2hlY2tlZCA/IGVsZW0udmFsdWUgOiBudWxsXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbS5jaGVja2VkXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGVsZW0udGFnTmFtZSA9PT0gXCJJTlBVVFwiKSB7XG4gICAgICAgIHJldHVybiBlbGVtLnZhbHVlXG4gICAgfSBlbHNlIGlmIChlbGVtLnRhZ05hbWUgPT09IFwiVEVYVEFSRUFcIikge1xuICAgICAgICByZXR1cm4gZWxlbS52YWx1ZVxuICAgIH0gZWxzZSBpZiAoZWxlbS50YWdOYW1lID09PSBcIlNFTEVDVFwiKSB7XG4gICAgICAgIHJldHVybiBlbGVtLnZhbHVlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0NoZWNrZWQoZWxlbSkge1xuICAgIHJldHVybiBlbGVtLnR5cGUgPT09IFwiY2hlY2tib3hcIiB8fCBlbGVtLnR5cGUgPT09IFwicmFkaW9cIlxufVxuXG5mdW5jdGlvbiBjb250YWluc1JhZGlvKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLnRhZ05hbWUgfHwgdmFsdWUubm9kZVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIGVsZW1zID0gdG9MaXN0KHZhbHVlKVxuXG4gICAgcmV0dXJuIGVsZW1zLnNvbWUoZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0udGFnTmFtZSA9PT0gXCJJTlBVVFwiICYmIGVsZW0udHlwZSA9PT0gXCJyYWRpb1wiXG4gICAgfSlcbn1cblxuZnVuY3Rpb24gdG9MaXN0KHZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cblxuICAgIHJldHVybiBPYmplY3Qua2V5cyh2YWx1ZSkubWFwKHByb3AsIHZhbHVlKVxufVxuXG5mdW5jdGlvbiBwcm9wKHgpIHtcbiAgICByZXR1cm4gdGhpc1t4XVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJOdWxsKHZhbCkge1xuICAgIHJldHVybiB2YWwgIT09IG51bGxcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gRXZlbnRcblxuZnVuY3Rpb24gRXZlbnQoKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IFtdXG5cbiAgICByZXR1cm4geyBicm9hZGNhc3Q6IGJyb2FkY2FzdCwgbGlzdGVuOiBldmVudCB9XG5cbiAgICBmdW5jdGlvbiBicm9hZGNhc3QodmFsdWUpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxpc3RlbmVyc1tpXSh2YWx1ZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV2ZW50KGxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKVxuXG4gICAgICAgIHJldHVybiByZW1vdmVMaXN0ZW5lclxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpXG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciBldmVudCA9IHJlcXVpcmUoXCIuL3NpbmdsZS5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG11bHRpcGxlXG5cbmZ1bmN0aW9uIG11bHRpcGxlKG5hbWVzKSB7XG4gICAgcmV0dXJuIG5hbWVzLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBuYW1lKSB7XG4gICAgICAgIGFjY1tuYW1lXSA9IGV2ZW50KClcbiAgICAgICAgcmV0dXJuIGFjY1xuICAgIH0sIHt9KVxufVxuIiwidmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9ldmVudC5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gU2luZ2xlXG5cbmZ1bmN0aW9uIFNpbmdsZSgpIHtcbiAgICB2YXIgdHVwbGUgPSBFdmVudCgpXG5cbiAgICByZXR1cm4gZnVuY3Rpb24gZXZlbnQodmFsdWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHVwbGUubGlzdGVuKHZhbHVlKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHR1cGxlLmJyb2FkY2FzdCh2YWx1ZSlcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJ2YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbFxuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAocm9vdFtrZXldKSB7XG4gICAgICAgIHJldHVybiByb290W2tleV1cbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm9vdCwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG5cbiAgICByZXR1cm4gdmFsdWVcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgeCAhPT0gbnVsbDtcbn07XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZUNhbGxiYWNrYCB3aGljaCBvbmx5IHN1cHBvcnRzIGB0aGlzYCBiaW5kaW5nXG4gKiBhbmQgc3BlY2lmeWluZyB0aGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gYmluZC5cbiAqIEBwYXJhbSB7Kn0gdGhpc0FyZyBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICogQHBhcmFtIHtudW1iZXJ9IFthcmdDb3VudF0gVGhlIG51bWJlciBvZiBhcmd1bWVudHMgdG8gcHJvdmlkZSB0byBgZnVuY2AuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIGNhbGxiYWNrLlxuICovXG5mdW5jdGlvbiBiaW5kQ2FsbGJhY2soZnVuYywgdGhpc0FyZywgYXJnQ291bnQpIHtcbiAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gaWRlbnRpdHk7XG4gIH1cbiAgaWYgKHRoaXNBcmcgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG4gIHN3aXRjaCAoYXJnQ291bnQpIHtcbiAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSk7XG4gICAgfTtcbiAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICB9O1xuICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgfTtcbiAgICBjYXNlIDU6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgb3RoZXIsIGtleSwgb2JqZWN0LCBzb3VyY2UpIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUsIG90aGVyLCBrZXksIG9iamVjdCwgc291cmNlKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIGZpcnN0IGFyZ3VtZW50IHByb3ZpZGVkIHRvIGl0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0eVxuICogQHBhcmFtIHsqfSB2YWx1ZSBBbnkgdmFsdWUuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0geyAndXNlcic6ICdmcmVkJyB9O1xuICpcbiAqIF8uaWRlbnRpdHkob2JqZWN0KSA9PT0gb2JqZWN0O1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmluZENhbGxiYWNrO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjMgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBiaW5kQ2FsbGJhY2sgPSByZXF1aXJlKCdsb2Rhc2guX2JpbmRjYWxsYmFjaycpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZUZsb29yID0gTWF0aC5mbG9vcixcbiAgICBuYXRpdmVJc0Zpbml0ZSA9IGdsb2JhbC5pc0Zpbml0ZSxcbiAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbjtcblxuLyoqIFVzZWQgYXMgcmVmZXJlbmNlcyBmb3IgdGhlIG1heGltdW0gbGVuZ3RoIGFuZCBpbmRleCBvZiBhbiBhcnJheS4gKi9cbnZhciBNQVhfQVJSQVlfTEVOR1RIID0gNDI5NDk2NzI5NTtcblxuLyoqXG4gKiBJbnZva2VzIHRoZSBpdGVyYXRlZSBmdW5jdGlvbiBgbmAgdGltZXMsIHJldHVybmluZyBhbiBhcnJheSBvZiB0aGUgcmVzdWx0c1xuICogb2YgZWFjaCBpbnZvY2F0aW9uLiBUaGUgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aFxuICogb25lIGFyZ3VtZW50OyAoaW5kZXgpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0eVxuICogQHBhcmFtIHtudW1iZXJ9IG4gVGhlIG51bWJlciBvZiB0aW1lcyB0byBpbnZva2UgYGl0ZXJhdGVlYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtpdGVyYXRlZT1fLmlkZW50aXR5XSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBpdGVyYXRlZWAuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHJlc3VsdHMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBkaWNlUm9sbHMgPSBfLnRpbWVzKDMsIF8ucGFydGlhbChfLnJhbmRvbSwgMSwgNiwgZmFsc2UpKTtcbiAqIC8vID0+IFszLCA2LCA0XVxuICpcbiAqIF8udGltZXMoMywgZnVuY3Rpb24obikge1xuICogICBtYWdlLmNhc3RTcGVsbChuKTtcbiAqIH0pO1xuICogLy8gPT4gaW52b2tlcyBgbWFnZS5jYXN0U3BlbGwobilgIHRocmVlIHRpbWVzIHdpdGggYG5gIG9mIGAwYCwgYDFgLCBhbmQgYDJgXG4gKlxuICogXy50aW1lcygzLCBmdW5jdGlvbihuKSB7XG4gKiAgIHRoaXMuY2FzdChuKTtcbiAqIH0sIG1hZ2UpO1xuICogLy8gPT4gYWxzbyBpbnZva2VzIGBtYWdlLmNhc3RTcGVsbChuKWAgdGhyZWUgdGltZXNcbiAqL1xuZnVuY3Rpb24gdGltZXMobiwgaXRlcmF0ZWUsIHRoaXNBcmcpIHtcbiAgbiA9IG5hdGl2ZUZsb29yKG4pO1xuXG4gIC8vIEV4aXQgZWFybHkgdG8gYXZvaWQgYSBKU0MgSklUIGJ1ZyBpbiBTYWZhcmkgOFxuICAvLyB3aGVyZSBgQXJyYXkoMClgIGlzIHRyZWF0ZWQgYXMgYEFycmF5KDEpYC5cbiAgaWYgKG4gPCAxIHx8ICFuYXRpdmVJc0Zpbml0ZShuKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIHJlc3VsdCA9IEFycmF5KG5hdGl2ZU1pbihuLCBNQVhfQVJSQVlfTEVOR1RIKSk7XG5cbiAgaXRlcmF0ZWUgPSBiaW5kQ2FsbGJhY2soaXRlcmF0ZWUsIHRoaXNBcmcsIDEpO1xuICB3aGlsZSAoKytpbmRleCA8IG4pIHtcbiAgICBpZiAoaW5kZXggPCBNQVhfQVJSQVlfTEVOR1RIKSB7XG4gICAgICByZXN1bHRbaW5kZXhdID0gaXRlcmF0ZWUoaW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZShpbmRleCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGltZXM7XG4iLCJ2YXIgcmFmID0gcmVxdWlyZShcInJhZlwiKVxudmFyIFR5cGVkRXJyb3IgPSByZXF1aXJlKFwiZXJyb3IvdHlwZWRcIilcblxudmFyIEludmFsaWRVcGRhdGVJblJlbmRlciA9IFR5cGVkRXJyb3Ioe1xuICAgIHR5cGU6IFwibWFpbi1sb29wLmludmFsaWQudXBkYXRlLmluLXJlbmRlclwiLFxuICAgIG1lc3NhZ2U6IFwibWFpbi1sb29wOiBVbmV4cGVjdGVkIHVwZGF0ZSBvY2N1cnJlZCBpbiBsb29wLlxcblwiICtcbiAgICAgICAgXCJXZSBhcmUgY3VycmVudGx5IHJlbmRlcmluZyBhIHZpZXcsIFwiICtcbiAgICAgICAgICAgIFwieW91IGNhbid0IGNoYW5nZSBzdGF0ZSByaWdodCBub3cuXFxuXCIgK1xuICAgICAgICBcIlRoZSBkaWZmIGlzOiB7c3RyaW5nRGlmZn0uXFxuXCIgK1xuICAgICAgICBcIlNVR0dFU1RFRCBGSVg6IGZpbmQgdGhlIHN0YXRlIG11dGF0aW9uIGluIHlvdXIgdmlldyBcIiArXG4gICAgICAgICAgICBcIm9yIHJlbmRlcmluZyBmdW5jdGlvbiBhbmQgcmVtb3ZlIGl0LlxcblwiICtcbiAgICAgICAgXCJUaGUgdmlldyBzaG91bGQgbm90IGhhdmUgYW55IHNpZGUgZWZmZWN0cy5cXG5cIixcbiAgICBkaWZmOiBudWxsLFxuICAgIHN0cmluZ0RpZmY6IG51bGxcbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gbWFpblxuXG5mdW5jdGlvbiBtYWluKGluaXRpYWxTdGF0ZSwgdmlldywgb3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgICB2YXIgY3VycmVudFN0YXRlID0gaW5pdGlhbFN0YXRlXG4gICAgdmFyIGNyZWF0ZSA9IG9wdHMuY3JlYXRlXG4gICAgdmFyIGRpZmYgPSBvcHRzLmRpZmZcbiAgICB2YXIgcGF0Y2ggPSBvcHRzLnBhdGNoXG4gICAgdmFyIHJlZHJhd1NjaGVkdWxlZCA9IGZhbHNlXG5cbiAgICB2YXIgdHJlZSA9IG9wdHMuaW5pdGlhbFRyZWUgfHwgdmlldyhjdXJyZW50U3RhdGUpXG4gICAgdmFyIHRhcmdldCA9IG9wdHMudGFyZ2V0IHx8IGNyZWF0ZSh0cmVlLCBvcHRzKVxuICAgIHZhciBpblJlbmRlcmluZ1RyYW5zYWN0aW9uID0gZmFsc2VcblxuICAgIGN1cnJlbnRTdGF0ZSA9IG51bGxcblxuICAgIHZhciBsb29wID0ge1xuICAgICAgICBzdGF0ZTogaW5pdGlhbFN0YXRlLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgdXBkYXRlOiB1cGRhdGVcbiAgICB9XG4gICAgcmV0dXJuIGxvb3BcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZShzdGF0ZSkge1xuICAgICAgICBpZiAoaW5SZW5kZXJpbmdUcmFuc2FjdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgSW52YWxpZFVwZGF0ZUluUmVuZGVyKHtcbiAgICAgICAgICAgICAgICBkaWZmOiBzdGF0ZS5fZGlmZixcbiAgICAgICAgICAgICAgICBzdHJpbmdEaWZmOiBKU09OLnN0cmluZ2lmeShzdGF0ZS5fZGlmZilcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudFN0YXRlID09PSBudWxsICYmICFyZWRyYXdTY2hlZHVsZWQpIHtcbiAgICAgICAgICAgIHJlZHJhd1NjaGVkdWxlZCA9IHRydWVcbiAgICAgICAgICAgIHJhZihyZWRyYXcpXG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U3RhdGUgPSBzdGF0ZVxuICAgICAgICBsb29wLnN0YXRlID0gc3RhdGVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWRyYXcoKSB7XG4gICAgICAgIHJlZHJhd1NjaGVkdWxlZCA9IGZhbHNlXG4gICAgICAgIGlmIChjdXJyZW50U3RhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgaW5SZW5kZXJpbmdUcmFuc2FjdGlvbiA9IHRydWVcbiAgICAgICAgdmFyIG5ld1RyZWUgPSB2aWV3KGN1cnJlbnRTdGF0ZSlcblxuICAgICAgICBpZiAob3B0cy5jcmVhdGVPbmx5KSB7XG4gICAgICAgICAgICBpblJlbmRlcmluZ1RyYW5zYWN0aW9uID0gZmFsc2VcbiAgICAgICAgICAgIGNyZWF0ZShuZXdUcmVlLCBvcHRzKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHBhdGNoZXMgPSBkaWZmKHRyZWUsIG5ld1RyZWUsIG9wdHMpXG4gICAgICAgICAgICBpblJlbmRlcmluZ1RyYW5zYWN0aW9uID0gZmFsc2VcbiAgICAgICAgICAgIHRhcmdldCA9IHBhdGNoKHRhcmdldCwgcGF0Y2hlcywgb3B0cylcbiAgICAgICAgfVxuXG4gICAgICAgIHRyZWUgPSBuZXdUcmVlXG4gICAgICAgIGN1cnJlbnRTdGF0ZSA9IG51bGxcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBTaW5nbGVFdmVudCA9IHJlcXVpcmUoJ2dldmFsL3NpbmdsZScpO1xudmFyIE11bHRpcGxlRXZlbnQgPSByZXF1aXJlKCdnZXZhbC9tdWx0aXBsZScpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbi8qXG4gICAgUHJvIHRpcDogRG9uJ3QgcmVxdWlyZSBgbWVyY3VyeWAgaXRzZWxmLlxuICAgICAgcmVxdWlyZSBhbmQgZGVwZW5kIG9uIGFsbCB0aGVzZSBtb2R1bGVzIGRpcmVjdGx5IVxuKi9cbnZhciBtZXJjdXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy8gRW50cnlcbiAgICBtYWluOiByZXF1aXJlKCdtYWluLWxvb3AnKSxcbiAgICBhcHA6IGFwcCxcblxuICAgIC8vIEJhc2VcbiAgICBCYXNlRXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2Jhc2UtZXZlbnQnKSxcblxuICAgIC8vIElucHV0XG4gICAgRGVsZWdhdG9yOiByZXF1aXJlKCdkb20tZGVsZWdhdG9yJyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLmNoYW5uZWxzIGluc3RlYWQuXG4gICAgaW5wdXQ6IGlucHV0LFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5jaGFubmVscyBpbnN0ZWFkLlxuICAgIGhhbmRsZXM6IGNoYW5uZWxzLFxuICAgIGNoYW5uZWxzOiBjaGFubmVscyxcbiAgICAvLyBkZXByZWNhdGVkOiB1c2UgaGcuc2VuZCBpbnN0ZWFkLlxuICAgIGV2ZW50OiByZXF1aXJlKCd2YWx1ZS1ldmVudC9ldmVudCcpLFxuICAgIHNlbmQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2V2ZW50JyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLnNlbmRWYWx1ZSBpbnN0ZWFkLlxuICAgIHZhbHVlRXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L3ZhbHVlJyksXG4gICAgc2VuZFZhbHVlOiByZXF1aXJlKCd2YWx1ZS1ldmVudC92YWx1ZScpLFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5zZW5kU3VibWl0IGluc3RlYWQuXG4gICAgc3VibWl0RXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L3N1Ym1pdCcpLFxuICAgIHNlbmRTdWJtaXQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L3N1Ym1pdCcpLFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5zZW5kQ2hhbmdlIGluc3RlYWQuXG4gICAgY2hhbmdlRXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2NoYW5nZScpLFxuICAgIHNlbmRDaGFuZ2U6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2NoYW5nZScpLFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5zZW5kS2V5IGluc3RlYWQuXG4gICAga2V5RXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2tleScpLFxuICAgIHNlbmRLZXk6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2tleScpLFxuICAgIC8vIGRlcHJlY2F0ZWQgdXNlIGhnLnNlbmRDbGljayBpbnN0ZWFkLlxuICAgIGNsaWNrRXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2NsaWNrJyksXG4gICAgc2VuZENsaWNrOiByZXF1aXJlKCd2YWx1ZS1ldmVudC9jbGljaycpLFxuXG4gICAgLy8gU3RhdGVcbiAgICAvLyByZW1vdmUgZnJvbSBjb3JlOiBmYXZvciBoZy52YXJoYXNoIGluc3RlYWQuXG4gICAgYXJyYXk6IHJlcXVpcmUoJ29ic2Vydi1hcnJheScpLFxuICAgIHN0cnVjdDogcmVxdWlyZSgnb2JzZXJ2LXN0cnVjdCcpLFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5zdHJ1Y3QgaW5zdGVhZC5cbiAgICBoYXNoOiByZXF1aXJlKCdvYnNlcnYtc3RydWN0JyksXG4gICAgdmFyaGFzaDogcmVxdWlyZSgnb2JzZXJ2LXZhcmhhc2gnKSxcbiAgICB2YWx1ZTogcmVxdWlyZSgnb2JzZXJ2JyksXG4gICAgc3RhdGU6IHN0YXRlLFxuXG4gICAgLy8gUmVuZGVyXG4gICAgZGlmZjogcmVxdWlyZSgndmlydHVhbC1kb20vdnRyZWUvZGlmZicpLFxuICAgIHBhdGNoOiByZXF1aXJlKCd2aXJ0dWFsLWRvbS92ZG9tL3BhdGNoJyksXG4gICAgcGFydGlhbDogcmVxdWlyZSgndmRvbS10aHVuaycpLFxuICAgIGNyZWF0ZTogcmVxdWlyZSgndmlydHVhbC1kb20vdmRvbS9jcmVhdGUtZWxlbWVudCcpLFxuICAgIGg6IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQnKSxcblxuICAgIC8vIFV0aWxpdGllc1xuICAgIC8vIHJlbW92ZSBmcm9tIGNvcmU6IHJlcXVpcmUgY29tcHV0ZWQgZGlyZWN0bHkgaW5zdGVhZC5cbiAgICBjb21wdXRlZDogcmVxdWlyZSgnb2JzZXJ2L2NvbXB1dGVkJyksXG4gICAgLy8gcmVtb3ZlIGZyb20gY29yZTogcmVxdWlyZSB3YXRjaCBkaXJlY3RseSBpbnN0ZWFkLlxuICAgIHdhdGNoOiByZXF1aXJlKCdvYnNlcnYvd2F0Y2gnKVxufTtcblxuZnVuY3Rpb24gaW5wdXQobmFtZXMpIHtcbiAgICBpZiAoIW5hbWVzKSB7XG4gICAgICAgIHJldHVybiBTaW5nbGVFdmVudCgpO1xuICAgIH1cblxuICAgIHJldHVybiBNdWx0aXBsZUV2ZW50KG5hbWVzKTtcbn1cblxuZnVuY3Rpb24gc3RhdGUob2JqKSB7XG4gICAgdmFyIGNvcHkgPSBleHRlbmQob2JqKTtcbiAgICB2YXIgJGNoYW5uZWxzID0gY29weS5jaGFubmVscztcbiAgICB2YXIgJGhhbmRsZXMgPSBjb3B5LmhhbmRsZXM7XG5cbiAgICBpZiAoJGNoYW5uZWxzKSB7XG4gICAgICAgIGNvcHkuY2hhbm5lbHMgPSBtZXJjdXJ5LnZhbHVlKG51bGwpO1xuICAgIH0gZWxzZSBpZiAoJGhhbmRsZXMpIHtcbiAgICAgICAgY29weS5oYW5kbGVzID0gbWVyY3VyeS52YWx1ZShudWxsKTtcbiAgICB9XG5cbiAgICB2YXIgb2JzZXJ2ID0gbWVyY3VyeS5zdHJ1Y3QoY29weSk7XG4gICAgaWYgKCRjaGFubmVscykge1xuICAgICAgICBvYnNlcnYuY2hhbm5lbHMuc2V0KG1lcmN1cnkuY2hhbm5lbHMoJGNoYW5uZWxzLCBvYnNlcnYpKTtcbiAgICB9IGVsc2UgaWYgKCRoYW5kbGVzKSB7XG4gICAgICAgIG9ic2Vydi5oYW5kbGVzLnNldChtZXJjdXJ5LmNoYW5uZWxzKCRoYW5kbGVzLCBvYnNlcnYpKTtcbiAgICB9XG4gICAgcmV0dXJuIG9ic2Vydjtcbn1cblxuZnVuY3Rpb24gY2hhbm5lbHMoZnVuY3MsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoZnVuY3MpLnJlZHVjZShjcmVhdGVIYW5kbGUsIHt9KTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUhhbmRsZShhY2MsIG5hbWUpIHtcbiAgICAgICAgdmFyIGhhbmRsZSA9IG1lcmN1cnkuRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlKFxuICAgICAgICAgICAgZnVuY3NbbmFtZV0uYmluZChudWxsLCBjb250ZXh0KSk7XG5cbiAgICAgICAgYWNjW25hbWVdID0gaGFuZGxlO1xuICAgICAgICByZXR1cm4gYWNjO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXBwKGVsZW0sIG9ic2VydiwgcmVuZGVyLCBvcHRzKSB7XG4gICAgbWVyY3VyeS5EZWxlZ2F0b3Iob3B0cyk7XG4gICAgdmFyIGxvb3AgPSBtZXJjdXJ5Lm1haW4ob2JzZXJ2KCksIHJlbmRlciwgZXh0ZW5kKHtcbiAgICAgICAgZGlmZjogbWVyY3VyeS5kaWZmLFxuICAgICAgICBjcmVhdGU6IG1lcmN1cnkuY3JlYXRlLFxuICAgICAgICBwYXRjaDogbWVyY3VyeS5wYXRjaFxuICAgIH0sIG9wdHMpKTtcbiAgICBpZiAoZWxlbSkge1xuICAgICAgICBlbGVtLmFwcGVuZENoaWxkKGxvb3AudGFyZ2V0KTtcbiAgICB9XG4gICAgcmV0dXJuIG9ic2Vydihsb29wLnVwZGF0ZSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtb250aCwgeWVhcikge1xuXHR2YXIgbm93ID0gbmV3IERhdGUoKTtcblx0bW9udGggPSBtb250aCA9PSBudWxsID8gbm93LmdldFVUQ01vbnRoKCkgOiBtb250aDtcblx0eWVhciA9IHllYXIgPT0gbnVsbCA/IG5vdy5nZXRVVENGdWxsWWVhcigpIDogeWVhcjtcblxuXHRyZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGggKyAxLCAwKSkuZ2V0VVRDRGF0ZSgpO1xufTtcbiIsInZhciBzZXROb25FbnVtZXJhYmxlID0gcmVxdWlyZShcIi4vbGliL3NldC1ub24tZW51bWVyYWJsZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBhZGRMaXN0ZW5lclxuXG5mdW5jdGlvbiBhZGRMaXN0ZW5lcihvYnNlcnZBcnJheSwgb2JzZXJ2KSB7XG4gICAgdmFyIGxpc3QgPSBvYnNlcnZBcnJheS5fbGlzdFxuXG4gICAgcmV0dXJuIG9ic2VydihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbHVlTGlzdCA9ICBvYnNlcnZBcnJheSgpLnNsaWNlKClcbiAgICAgICAgdmFyIGluZGV4ID0gbGlzdC5pbmRleE9mKG9ic2VydilcblxuICAgICAgICAvLyBUaGlzIGNvZGUgcGF0aCBzaG91bGQgbmV2ZXIgaGl0LiBJZiB0aGlzIGhhcHBlbnNcbiAgICAgICAgLy8gdGhlcmUncyBhIGJ1ZyBpbiB0aGUgY2xlYW51cCBjb2RlXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gXCJvYnNlcnYtYXJyYXk6IFVucmVtb3ZlZCBvYnNlcnYgbGlzdGVuZXJcIlxuICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKVxuICAgICAgICAgICAgZXJyLmxpc3QgPSBsaXN0XG4gICAgICAgICAgICBlcnIuaW5kZXggPSBpbmRleFxuICAgICAgICAgICAgZXJyLm9ic2VydiA9IG9ic2VydlxuICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cblxuICAgICAgICB2YWx1ZUxpc3Quc3BsaWNlKGluZGV4LCAxLCB2YWx1ZSlcbiAgICAgICAgc2V0Tm9uRW51bWVyYWJsZSh2YWx1ZUxpc3QsIFwiX2RpZmZcIiwgWyBbaW5kZXgsIDEsIHZhbHVlXSBdKVxuXG4gICAgICAgIG9ic2VydkFycmF5Ll9vYnNlcnZTZXQodmFsdWVMaXN0KVxuICAgIH0pXG59XG4iLCJ2YXIgYWRkTGlzdGVuZXIgPSByZXF1aXJlKCcuL2FkZC1saXN0ZW5lci5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQYXRjaFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoICh2YWx1ZUxpc3QsIGFyZ3MpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciB2YWx1ZUFyZ3MgPSBhcmdzLm1hcCh1bnBhY2spXG5cbiAgICB2YWx1ZUxpc3Quc3BsaWNlLmFwcGx5KHZhbHVlTGlzdCwgdmFsdWVBcmdzKVxuICAgIG9icy5fbGlzdC5zcGxpY2UuYXBwbHkob2JzLl9saXN0LCBhcmdzKVxuXG4gICAgdmFyIGV4dHJhUmVtb3ZlTGlzdGVuZXJzID0gYXJncy5zbGljZSgyKS5tYXAoZnVuY3Rpb24gKG9ic2Vydikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgICAgIGFkZExpc3RlbmVyKG9icywgb2JzZXJ2KSA6XG4gICAgICAgICAgICBudWxsXG4gICAgfSlcblxuICAgIGV4dHJhUmVtb3ZlTGlzdGVuZXJzLnVuc2hpZnQoYXJnc1swXSwgYXJnc1sxXSlcbiAgICB2YXIgcmVtb3ZlZExpc3RlbmVycyA9IG9icy5fcmVtb3ZlTGlzdGVuZXJzLnNwbGljZVxuICAgICAgICAuYXBwbHkob2JzLl9yZW1vdmVMaXN0ZW5lcnMsIGV4dHJhUmVtb3ZlTGlzdGVuZXJzKVxuXG4gICAgcmVtb3ZlZExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChyZW1vdmVPYnNlcnZMaXN0ZW5lcikge1xuICAgICAgICBpZiAocmVtb3ZlT2JzZXJ2TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJlbW92ZU9ic2Vydkxpc3RlbmVyKClcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdmFsdWVBcmdzXG59XG5cbmZ1bmN0aW9uIHVucGFjayh2YWx1ZSwgaW5kZXgpe1xuICAgIGlmIChpbmRleCA9PT0gMCB8fCBpbmRleCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gdmFsdWUoKSA6IHZhbHVlXG59XG4iLCJ2YXIgT2JzZXJ2QXJyYXkgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKVxuXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2VcblxudmFyIEFSUkFZX01FVEhPRFMgPSBbXG4gICAgXCJjb25jYXRcIiwgXCJzbGljZVwiLCBcImV2ZXJ5XCIsIFwiZmlsdGVyXCIsIFwiZm9yRWFjaFwiLCBcImluZGV4T2ZcIixcbiAgICBcImpvaW5cIiwgXCJsYXN0SW5kZXhPZlwiLCBcIm1hcFwiLCBcInJlZHVjZVwiLCBcInJlZHVjZVJpZ2h0XCIsXG4gICAgXCJzb21lXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiXG5dXG5cbnZhciBtZXRob2RzID0gQVJSQVlfTUVUSE9EUy5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICByZXR1cm4gW25hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlcyA9IHRoaXMuX2xpc3RbbmFtZV0uYXBwbHkodGhpcy5fbGlzdCwgYXJndW1lbnRzKVxuXG4gICAgICAgIGlmIChyZXMgJiYgQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICAgICAgICByZXMgPSBPYnNlcnZBcnJheShyZXMpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzXG4gICAgfV1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXlNZXRob2RzXG5cbmZ1bmN0aW9uIEFycmF5TWV0aG9kcyhvYnMpIHtcbiAgICBvYnMucHVzaCA9IG9ic2VydkFycmF5UHVzaFxuICAgIG9icy5wb3AgPSBvYnNlcnZBcnJheVBvcFxuICAgIG9icy5zaGlmdCA9IG9ic2VydkFycmF5U2hpZnRcbiAgICBvYnMudW5zaGlmdCA9IG9ic2VydkFycmF5VW5zaGlmdFxuICAgIG9icy5yZXZlcnNlID0gcmVxdWlyZShcIi4vYXJyYXktcmV2ZXJzZS5qc1wiKVxuICAgIG9icy5zb3J0ID0gcmVxdWlyZShcIi4vYXJyYXktc29ydC5qc1wiKVxuXG4gICAgbWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uICh0dXBsZSkge1xuICAgICAgICBvYnNbdHVwbGVbMF1dID0gdHVwbGVbMV1cbiAgICB9KVxuICAgIHJldHVybiBvYnNcbn1cblxuXG5cbmZ1bmN0aW9uIG9ic2VydkFycmF5UHVzaCgpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIGFyZ3MudW5zaGlmdCh0aGlzLl9saXN0Lmxlbmd0aCwgMClcbiAgICB0aGlzLnNwbGljZS5hcHBseSh0aGlzLCBhcmdzKVxuXG4gICAgcmV0dXJuIHRoaXMuX2xpc3QubGVuZ3RoXG59XG5mdW5jdGlvbiBvYnNlcnZBcnJheVBvcCgpIHtcbiAgICByZXR1cm4gdGhpcy5zcGxpY2UodGhpcy5fbGlzdC5sZW5ndGggLSAxLCAxKVswXVxufVxuZnVuY3Rpb24gb2JzZXJ2QXJyYXlTaGlmdCgpIHtcbiAgICByZXR1cm4gdGhpcy5zcGxpY2UoMCwgMSlbMF1cbn1cbmZ1bmN0aW9uIG9ic2VydkFycmF5VW5zaGlmdCgpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIGFyZ3MudW5zaGlmdCgwLCAwKVxuICAgIHRoaXMuc3BsaWNlLmFwcGx5KHRoaXMsIGFyZ3MpXG5cbiAgICByZXR1cm4gdGhpcy5fbGlzdC5sZW5ndGhcbn1cblxuXG5mdW5jdGlvbiBub3RJbXBsZW1lbnRlZCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJQdWxsIHJlcXVlc3Qgd2VsY29tZVwiKVxufVxuIiwidmFyIGFwcGx5UGF0Y2ggPSByZXF1aXJlKFwiLi9hcHBseS1wYXRjaC5qc1wiKVxudmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKCcuL2xpYi9zZXQtbm9uLWVudW1lcmFibGUuanMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJldmVyc2VcblxuZnVuY3Rpb24gcmV2ZXJzZSgpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciBjaGFuZ2VzID0gZmFrZURpZmYob2JzLl9saXN0LnNsaWNlKCkucmV2ZXJzZSgpKVxuICAgIHZhciB2YWx1ZUxpc3QgPSBvYnMoKS5zbGljZSgpLnJldmVyc2UoKVxuXG4gICAgdmFyIHZhbHVlQ2hhbmdlcyA9IGNoYW5nZXMubWFwKGFwcGx5UGF0Y2guYmluZChvYnMsIHZhbHVlTGlzdCkpXG5cbiAgICBzZXROb25FbnVtZXJhYmxlKHZhbHVlTGlzdCwgXCJfZGlmZlwiLCB2YWx1ZUNoYW5nZXMpXG5cbiAgICBvYnMuX29ic2VydlNldCh2YWx1ZUxpc3QpXG4gICAgcmV0dXJuIGNoYW5nZXNcbn1cblxuZnVuY3Rpb24gZmFrZURpZmYoYXJyKSB7XG4gICAgdmFyIF9kaWZmXG4gICAgdmFyIGxlbiA9IGFyci5sZW5ndGhcblxuICAgIGlmKGxlbiAlIDIpIHtcbiAgICAgICAgdmFyIG1pZFBvaW50ID0gKGxlbiAtMSkgLyAyXG4gICAgICAgIHZhciBhID0gWzAsIG1pZFBvaW50XS5jb25jYXQoYXJyLnNsaWNlKDAsIG1pZFBvaW50KSlcbiAgICAgICAgdmFyIGIgPSBbbWlkUG9pbnQgKzEsIG1pZFBvaW50XS5jb25jYXQoYXJyLnNsaWNlKG1pZFBvaW50ICsxLCBsZW4pKVxuICAgICAgICB2YXIgX2RpZmYgPSBbYSwgYl1cbiAgICB9IGVsc2Uge1xuICAgICAgICBfZGlmZiA9IFsgWzAsIGxlbl0uY29uY2F0KGFycikgXVxuICAgIH1cblxuICAgIHJldHVybiBfZGlmZlxufVxuIiwidmFyIGFwcGx5UGF0Y2ggPSByZXF1aXJlKFwiLi9hcHBseS1wYXRjaC5qc1wiKVxudmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKFwiLi9saWIvc2V0LW5vbi1lbnVtZXJhYmxlLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gc29ydFxuXG5mdW5jdGlvbiBzb3J0KGNvbXBhcmUpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciBsaXN0ID0gb2JzLl9saXN0LnNsaWNlKClcblxuICAgIHZhciB1bnBhY2tlZCA9IHVucGFjayhsaXN0KVxuXG4gICAgdmFyIHNvcnRlZCA9IHVucGFja2VkXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uKGl0KSB7IHJldHVybiBpdC52YWwgfSlcbiAgICAgICAgICAgIC5zb3J0KGNvbXBhcmUpXG5cbiAgICB2YXIgcGFja2VkID0gcmVwYWNrKHNvcnRlZCwgdW5wYWNrZWQpXG5cbiAgICAvL2Zha2UgZGlmZiAtIGZvciBwZXJmXG4gICAgLy9hZGlmZiBvbiAxMGsgaXRlbXMgPT09IH4zMjAwbXNcbiAgICAvL2Zha2Ugb24gMTBrIGl0ZW1zID09PSB+MTEwbXNcbiAgICB2YXIgY2hhbmdlcyA9IFsgWyAwLCBwYWNrZWQubGVuZ3RoIF0uY29uY2F0KHBhY2tlZCkgXVxuXG4gICAgdmFyIHZhbHVlQ2hhbmdlcyA9IGNoYW5nZXMubWFwKGFwcGx5UGF0Y2guYmluZChvYnMsIHNvcnRlZCkpXG5cbiAgICBzZXROb25FbnVtZXJhYmxlKHNvcnRlZCwgXCJfZGlmZlwiLCB2YWx1ZUNoYW5nZXMpXG5cbiAgICBvYnMuX29ic2VydlNldChzb3J0ZWQpXG4gICAgcmV0dXJuIGNoYW5nZXNcbn1cblxuZnVuY3Rpb24gdW5wYWNrKGxpc3QpIHtcbiAgICB2YXIgdW5wYWNrZWQgPSBbXVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHVucGFja2VkLnB1c2goe1xuICAgICAgICAgICAgdmFsOiAoXCJmdW5jdGlvblwiID09IHR5cGVvZiBsaXN0W2ldKSA/IGxpc3RbaV0oKSA6IGxpc3RbaV0sXG4gICAgICAgICAgICBvYmo6IGxpc3RbaV1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIHVucGFja2VkXG59XG5cbmZ1bmN0aW9uIHJlcGFjayhzb3J0ZWQsIHVucGFja2VkKSB7XG4gICAgdmFyIHBhY2tlZCA9IFtdXG5cbiAgICB3aGlsZShzb3J0ZWQubGVuZ3RoKSB7XG4gICAgICAgIHZhciBzID0gc29ydGVkLnNoaWZ0KClcbiAgICAgICAgdmFyIGluZHggPSBpbmRleE9mKHMsIHVucGFja2VkKVxuICAgICAgICBpZih+aW5keCkgcGFja2VkLnB1c2godW5wYWNrZWQuc3BsaWNlKGluZHgsIDEpWzBdLm9iailcbiAgICB9XG5cbiAgICByZXR1cm4gcGFja2VkXG59XG5cbmZ1bmN0aW9uIGluZGV4T2YobiwgaCkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmKG4gPT09IGhbaV0udmFsKSByZXR1cm4gaVxuICAgIH1cbiAgICByZXR1cm4gLTFcbn1cbiIsInZhciBPYnNlcnYgPSByZXF1aXJlKFwib2JzZXJ2XCIpXG5cbi8vIGNpcmN1bGFyIGRlcCBiZXR3ZWVuIEFycmF5TWV0aG9kcyAmIHRoaXMgZmlsZVxubW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZBcnJheVxuXG52YXIgc3BsaWNlID0gcmVxdWlyZShcIi4vc3BsaWNlLmpzXCIpXG52YXIgcHV0ID0gcmVxdWlyZShcIi4vcHV0LmpzXCIpXG52YXIgc2V0ID0gcmVxdWlyZShcIi4vc2V0LmpzXCIpXG52YXIgdHJhbnNhY3Rpb24gPSByZXF1aXJlKFwiLi90cmFuc2FjdGlvbi5qc1wiKVxudmFyIEFycmF5TWV0aG9kcyA9IHJlcXVpcmUoXCIuL2FycmF5LW1ldGhvZHMuanNcIilcbnZhciBhZGRMaXN0ZW5lciA9IHJlcXVpcmUoXCIuL2FkZC1saXN0ZW5lci5qc1wiKVxuXG5cbi8qICBPYnNlcnZBcnJheSA6PSAoQXJyYXk8VD4pID0+IE9ic2VydjxcbiAgICAgICAgQXJyYXk8VD4gJiB7IF9kaWZmOiBBcnJheSB9XG4gICAgPiAmIHtcbiAgICAgICAgc3BsaWNlOiAoaW5kZXg6IE51bWJlciwgYW1vdW50OiBOdW1iZXIsIHJlc3QuLi46IFQpID0+XG4gICAgICAgICAgICBBcnJheTxUPixcbiAgICAgICAgcHVzaDogKHZhbHVlcy4uLjogVCkgPT4gTnVtYmVyLFxuICAgICAgICBmaWx0ZXI6IChsYW1iZGE6IEZ1bmN0aW9uLCB0aGlzVmFsdWU6IEFueSkgPT4gQXJyYXk8VD4sXG4gICAgICAgIGluZGV4T2Y6IChpdGVtOiBULCBmcm9tSW5kZXg6IE51bWJlcikgPT4gTnVtYmVyXG4gICAgfVxuXG4gICAgRml4IHRvIG1ha2UgaXQgbW9yZSBsaWtlIE9ic2Vydkhhc2guXG5cbiAgICBJLmUuIHlvdSB3cml0ZSBvYnNlcnZhYmxlcyBpbnRvIGl0LlxuICAgICAgICByZWFkaW5nIG1ldGhvZHMgdGFrZSBwbGFpbiBKUyBvYmplY3RzIHRvIHJlYWRcbiAgICAgICAgYW5kIHRoZSB2YWx1ZSBvZiB0aGUgYXJyYXkgaXMgYWx3YXlzIGFuIGFycmF5IG9mIHBsYWluXG4gICAgICAgIG9ianNlY3QuXG5cbiAgICAgICAgVGhlIG9ic2VydiBhcnJheSBpbnN0YW5jZSBpdHNlbGYgd291bGQgaGF2ZSBpbmRleGVkXG4gICAgICAgIHByb3BlcnRpZXMgdGhhdCBhcmUgdGhlIG9ic2VydmFibGVzXG4qL1xuZnVuY3Rpb24gT2JzZXJ2QXJyYXkoaW5pdGlhbExpc3QpIHtcbiAgICAvLyBsaXN0IGlzIHRoZSBpbnRlcm5hbCBtdXRhYmxlIGxpc3Qgb2JzZXJ2IGluc3RhbmNlcyB0aGF0XG4gICAgLy8gYWxsIG1ldGhvZHMgb24gYG9ic2AgZGlzcGF0Y2ggdG8uXG4gICAgdmFyIGxpc3QgPSBpbml0aWFsTGlzdFxuICAgIHZhciBpbml0aWFsU3RhdGUgPSBbXVxuXG4gICAgLy8gY29weSBzdGF0ZSBvdXQgb2YgaW5pdGlhbExpc3QgaW50byBpbml0aWFsU3RhdGVcbiAgICBsaXN0LmZvckVhY2goZnVuY3Rpb24gKG9ic2VydiwgaW5kZXgpIHtcbiAgICAgICAgaW5pdGlhbFN0YXRlW2luZGV4XSA9IHR5cGVvZiBvYnNlcnYgPT09IFwiZnVuY3Rpb25cIiA/XG4gICAgICAgICAgICBvYnNlcnYoKSA6IG9ic2VydlxuICAgIH0pXG5cbiAgICB2YXIgb2JzID0gT2JzZXJ2KGluaXRpYWxTdGF0ZSlcbiAgICBvYnMuc3BsaWNlID0gc3BsaWNlXG5cbiAgICAvLyBvdmVycmlkZSBzZXQgYW5kIHN0b3JlIG9yaWdpbmFsIGZvciBsYXRlciB1c2VcbiAgICBvYnMuX29ic2VydlNldCA9IG9icy5zZXRcbiAgICBvYnMuc2V0ID0gc2V0XG5cbiAgICBvYnMuZ2V0ID0gZ2V0XG4gICAgb2JzLmdldExlbmd0aCA9IGdldExlbmd0aFxuICAgIG9icy5wdXQgPSBwdXRcbiAgICBvYnMudHJhbnNhY3Rpb24gPSB0cmFuc2FjdGlvblxuXG4gICAgLy8geW91IGJldHRlciBub3QgbXV0YXRlIHRoaXMgbGlzdCBkaXJlY3RseVxuICAgIC8vIHRoaXMgaXMgdGhlIGxpc3Qgb2Ygb2JzZXJ2cyBpbnN0YW5jZXNcbiAgICBvYnMuX2xpc3QgPSBsaXN0XG5cbiAgICB2YXIgcmVtb3ZlTGlzdGVuZXJzID0gbGlzdC5tYXAoZnVuY3Rpb24gKG9ic2Vydikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgICAgIGFkZExpc3RlbmVyKG9icywgb2JzZXJ2KSA6XG4gICAgICAgICAgICBudWxsXG4gICAgfSk7XG4gICAgLy8gdGhpcyBpcyBhIGxpc3Qgb2YgcmVtb3ZhbCBmdW5jdGlvbnMgdGhhdCBtdXN0IGJlIGNhbGxlZFxuICAgIC8vIHdoZW4gb2JzZXJ2IGluc3RhbmNlcyBhcmUgcmVtb3ZlZCBmcm9tIGBvYnMubGlzdGBcbiAgICAvLyBub3QgY2FsbGluZyB0aGlzIG1lYW5zIHdlIGRvIG5vdCBHQyBvdXIgb2JzZXJ2IGNoYW5nZVxuICAgIC8vIGxpc3RlbmVycy4gV2hpY2ggY2F1c2VzIHJhZ2UgYnVnc1xuICAgIG9icy5fcmVtb3ZlTGlzdGVuZXJzID0gcmVtb3ZlTGlzdGVuZXJzXG5cbiAgICBvYnMuX3R5cGUgPSBcIm9ic2Vydi1hcnJheVwiXG4gICAgb2JzLl92ZXJzaW9uID0gXCIzXCJcblxuICAgIHJldHVybiBBcnJheU1ldGhvZHMob2JzLCBsaXN0KVxufVxuXG5mdW5jdGlvbiBnZXQoaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdFtpbmRleF1cbn1cblxuZnVuY3Rpb24gZ2V0TGVuZ3RoKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0Lmxlbmd0aFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBzZXROb25FbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiBzZXROb25FbnVtZXJhYmxlKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgfSk7XG59XG4iLCJ2YXIgYWRkTGlzdGVuZXIgPSByZXF1aXJlKFwiLi9hZGQtbGlzdGVuZXIuanNcIilcbnZhciBzZXROb25FbnVtZXJhYmxlID0gcmVxdWlyZShcIi4vbGliL3NldC1ub24tZW51bWVyYWJsZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwdXRcblxuLy8gYG9icy5wdXRgIGlzIGEgbXV0YWJsZSBpbXBsZW1lbnRhdGlvbiBvZiBgYXJyYXlbaW5kZXhdID0gdmFsdWVgXG4vLyB0aGF0IG11dGF0ZXMgYm90aCBgbGlzdGAgYW5kIHRoZSBpbnRlcm5hbCBgdmFsdWVMaXN0YCB0aGF0XG4vLyBpcyB0aGUgY3VycmVudCB2YWx1ZSBvZiBgb2JzYCBpdHNlbGZcbmZ1bmN0aW9uIHB1dChpbmRleCwgdmFsdWUpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciB2YWx1ZUxpc3QgPSBvYnMoKS5zbGljZSgpXG5cbiAgICB2YXIgb3JpZ2luYWxMZW5ndGggPSB2YWx1ZUxpc3QubGVuZ3RoXG4gICAgdmFsdWVMaXN0W2luZGV4XSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gdmFsdWUoKSA6IHZhbHVlXG5cbiAgICBvYnMuX2xpc3RbaW5kZXhdID0gdmFsdWVcblxuICAgIC8vIHJlbW92ZSBwYXN0IHZhbHVlIGxpc3RlbmVyIGlmIHdhcyBvYnNlcnZcbiAgICB2YXIgcmVtb3ZlTGlzdGVuZXIgPSBvYnMuX3JlbW92ZUxpc3RlbmVyc1tpbmRleF1cbiAgICBpZiAocmVtb3ZlTGlzdGVuZXIpe1xuICAgICAgICByZW1vdmVMaXN0ZW5lcigpXG4gICAgfVxuXG4gICAgLy8gYWRkIGxpc3RlbmVyIHRvIHZhbHVlIGlmIG9ic2VydlxuICAgIG9icy5fcmVtb3ZlTGlzdGVuZXJzW2luZGV4XSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgYWRkTGlzdGVuZXIob2JzLCB2YWx1ZSkgOlxuICAgICAgICBudWxsXG5cbiAgICAvLyBmYWtlIHNwbGljZSBkaWZmXG4gICAgdmFyIHZhbHVlQXJncyA9IGluZGV4IDwgb3JpZ2luYWxMZW5ndGggPyBcbiAgICAgICAgW2luZGV4LCAxLCB2YWx1ZUxpc3RbaW5kZXhdXSA6XG4gICAgICAgIFtpbmRleCwgMCwgdmFsdWVMaXN0W2luZGV4XV1cblxuICAgIHNldE5vbkVudW1lcmFibGUodmFsdWVMaXN0LCBcIl9kaWZmXCIsIFt2YWx1ZUFyZ3NdKVxuXG4gICAgb2JzLl9vYnNlcnZTZXQodmFsdWVMaXN0KVxuICAgIHJldHVybiB2YWx1ZVxufSIsInZhciBhcHBseVBhdGNoID0gcmVxdWlyZShcIi4vYXBwbHktcGF0Y2guanNcIilcbnZhciBzZXROb25FbnVtZXJhYmxlID0gcmVxdWlyZShcIi4vbGliL3NldC1ub24tZW51bWVyYWJsZS5qc1wiKVxudmFyIGFkaWZmID0gcmVxdWlyZShcImFkaWZmXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0XG5cbmZ1bmN0aW9uIHNldChyYXdMaXN0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJhd0xpc3QpKSByYXdMaXN0ID0gW11cblxuICAgIHZhciBvYnMgPSB0aGlzXG4gICAgdmFyIGNoYW5nZXMgPSBhZGlmZi5kaWZmKG9icy5fbGlzdCwgcmF3TGlzdClcbiAgICB2YXIgdmFsdWVMaXN0ID0gb2JzKCkuc2xpY2UoKVxuXG4gICAgdmFyIHZhbHVlQ2hhbmdlcyA9IGNoYW5nZXMubWFwKGFwcGx5UGF0Y2guYmluZChvYnMsIHZhbHVlTGlzdCkpXG5cbiAgICBzZXROb25FbnVtZXJhYmxlKHZhbHVlTGlzdCwgXCJfZGlmZlwiLCB2YWx1ZUNoYW5nZXMpXG5cbiAgICBvYnMuX29ic2VydlNldCh2YWx1ZUxpc3QpXG4gICAgcmV0dXJuIGNoYW5nZXNcbn1cbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuXG52YXIgYWRkTGlzdGVuZXIgPSByZXF1aXJlKFwiLi9hZGQtbGlzdGVuZXIuanNcIilcbnZhciBzZXROb25FbnVtZXJhYmxlID0gcmVxdWlyZShcIi4vbGliL3NldC1ub24tZW51bWVyYWJsZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzcGxpY2VcblxuLy8gYG9icy5zcGxpY2VgIGlzIGEgbXV0YWJsZSBpbXBsZW1lbnRhdGlvbiBvZiBgc3BsaWNlKClgXG4vLyB0aGF0IG11dGF0ZXMgYm90aCBgbGlzdGAgYW5kIHRoZSBpbnRlcm5hbCBgdmFsdWVMaXN0YCB0aGF0XG4vLyBpcyB0aGUgY3VycmVudCB2YWx1ZSBvZiBgb2JzYCBpdHNlbGZcbmZ1bmN0aW9uIHNwbGljZShpbmRleCwgYW1vdW50KSB7XG4gICAgdmFyIG9icyA9IHRoaXNcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKVxuICAgIHZhciB2YWx1ZUxpc3QgPSBvYnMoKS5zbGljZSgpXG5cbiAgICAvLyBnZW5lcmF0ZSBhIGxpc3Qgb2YgYXJncyB0byBtdXRhdGUgdGhlIGludGVybmFsXG4gICAgLy8gbGlzdCBvZiBvbmx5IG9ic1xuICAgIHZhciB2YWx1ZUFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gMCB8fCBpbmRleCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBtdXN0IHVucGFjayBvYnNlcnZhYmxlcyB0aGF0IHdlIGFyZSBhZGRpbmdcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gdmFsdWUoKSA6IHZhbHVlXG4gICAgfSlcblxuICAgIHZhbHVlTGlzdC5zcGxpY2UuYXBwbHkodmFsdWVMaXN0LCB2YWx1ZUFyZ3MpXG4gICAgLy8gd2UgcmVtb3ZlIHRoZSBvYnNlcnZzIHRoYXQgd2UgcmVtb3ZlXG4gICAgdmFyIHJlbW92ZWQgPSBvYnMuX2xpc3Quc3BsaWNlLmFwcGx5KG9icy5fbGlzdCwgYXJncylcblxuICAgIHZhciBleHRyYVJlbW92ZUxpc3RlbmVycyA9IGFyZ3Muc2xpY2UoMikubWFwKGZ1bmN0aW9uIChvYnNlcnYpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYnNlcnYgPT09IFwiZnVuY3Rpb25cIiA/XG4gICAgICAgICAgICBhZGRMaXN0ZW5lcihvYnMsIG9ic2VydikgOlxuICAgICAgICAgICAgbnVsbFxuICAgIH0pXG4gICAgZXh0cmFSZW1vdmVMaXN0ZW5lcnMudW5zaGlmdChhcmdzWzBdLCBhcmdzWzFdKVxuICAgIHZhciByZW1vdmVkTGlzdGVuZXJzID0gb2JzLl9yZW1vdmVMaXN0ZW5lcnMuc3BsaWNlXG4gICAgICAgIC5hcHBseShvYnMuX3JlbW92ZUxpc3RlbmVycywgZXh0cmFSZW1vdmVMaXN0ZW5lcnMpXG5cbiAgICByZW1vdmVkTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKHJlbW92ZU9ic2Vydkxpc3RlbmVyKSB7XG4gICAgICAgIGlmIChyZW1vdmVPYnNlcnZMaXN0ZW5lcikge1xuICAgICAgICAgICAgcmVtb3ZlT2JzZXJ2TGlzdGVuZXIoKVxuICAgICAgICB9XG4gICAgfSlcblxuICAgIHNldE5vbkVudW1lcmFibGUodmFsdWVMaXN0LCBcIl9kaWZmXCIsIFt2YWx1ZUFyZ3NdKVxuXG4gICAgb2JzLl9vYnNlcnZTZXQodmFsdWVMaXN0KVxuICAgIHJldHVybiByZW1vdmVkXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRyYW5zYWN0aW9uXG5cbmZ1bmN0aW9uIHRyYW5zYWN0aW9uIChmdW5jKSB7XG4gICAgdmFyIG9icyA9IHRoaXNcbiAgICB2YXIgcmF3TGlzdCA9IG9icy5fbGlzdC5zbGljZSgpXG5cbiAgICBpZiAoZnVuYyhyYXdMaXN0KSAhPT0gZmFsc2UpeyAvLyBhbGxvdyBjYW5jZWxcbiAgICAgICAgcmV0dXJuIG9icy5zZXQocmF3TGlzdClcbiAgICB9XG5cbn0iLCJ2YXIgT2JzZXJ2ID0gcmVxdWlyZShcIm9ic2VydlwiKVxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJ4dGVuZFwiKVxuXG52YXIgYmxhY2tMaXN0ID0gW1wibmFtZVwiLCBcIl9kaWZmXCIsIFwiX3R5cGVcIiwgXCJfdmVyc2lvblwiXVxudmFyIGJsYWNrTGlzdFJlYXNvbnMgPSB7XG4gICAgXCJuYW1lXCI6IFwiQ2xhc2hlcyB3aXRoIGBGdW5jdGlvbi5wcm90b3R5cGUubmFtZWAuXFxuXCIsXG4gICAgXCJfZGlmZlwiOiBcIl9kaWZmIGlzIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtc3RydWN0LlxcblwiLFxuICAgIFwiX3R5cGVcIjogXCJfdHlwZSBpcyByZXNlcnZlZCBrZXkgb2Ygb2JzZXJ2LXN0cnVjdC5cXG5cIixcbiAgICBcIl92ZXJzaW9uXCI6IFwiX3ZlcnNpb24gaXMgcmVzZXJ2ZWQga2V5IG9mIG9ic2Vydi1zdHJ1Y3QuXFxuXCJcbn1cbnZhciBOT19UUkFOU0FDVElPTiA9IHt9XG5cbmZ1bmN0aW9uIHNldE5vbkVudW1lcmFibGUob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICB9KVxufVxuXG4vKiBPYnNlcnZTdHJ1Y3QgOj0gKE9iamVjdDxTdHJpbmcsIE9ic2VydjxUPj4pID0+IFxuICAgIE9iamVjdDxTdHJpbmcsIE9ic2VydjxUPj4gJlxuICAgICAgICBPYnNlcnY8T2JqZWN0PFN0cmluZywgVD4gJiB7XG4gICAgICAgICAgICBfZGlmZjogT2JqZWN0PFN0cmluZywgQW55PlxuICAgICAgICB9PlxuXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZTdHJ1Y3RcblxuZnVuY3Rpb24gT2JzZXJ2U3RydWN0KHN0cnVjdCkge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3RydWN0KVxuXG4gICAgdmFyIGluaXRpYWxTdGF0ZSA9IHt9XG4gICAgdmFyIGN1cnJlbnRUcmFuc2FjdGlvbiA9IE5PX1RSQU5TQUNUSU9OXG4gICAgdmFyIG5lc3RlZFRyYW5zYWN0aW9uID0gTk9fVFJBTlNBQ1RJT05cblxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChibGFja0xpc3QuaW5kZXhPZihrZXkpICE9PSAtMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2Fubm90IGNyZWF0ZSBhbiBvYnNlcnYtc3RydWN0IFwiICtcbiAgICAgICAgICAgICAgICBcIndpdGggYSBrZXkgbmFtZWQgJ1wiICsga2V5ICsgXCInLlxcblwiICtcbiAgICAgICAgICAgICAgICBibGFja0xpc3RSZWFzb25zW2tleV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9ic2VydiA9IHN0cnVjdFtrZXldXG4gICAgICAgIGluaXRpYWxTdGF0ZVtrZXldID0gdHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgICAgIG9ic2VydigpIDogb2JzZXJ2XG4gICAgfSlcblxuICAgIHZhciBvYnMgPSBPYnNlcnYoaW5pdGlhbFN0YXRlKVxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHZhciBvYnNlcnYgPSBzdHJ1Y3Rba2V5XVxuICAgICAgICBvYnNba2V5XSA9IG9ic2VydlxuXG4gICAgICAgIGlmICh0eXBlb2Ygb2JzZXJ2ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIG9ic2VydihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAobmVzdGVkVHJhbnNhY3Rpb24gPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzdGF0ZSA9IGV4dGVuZChvYnMoKSlcbiAgICAgICAgICAgICAgICBzdGF0ZVtrZXldID0gdmFsdWVcbiAgICAgICAgICAgICAgICB2YXIgZGlmZiA9IHt9XG4gICAgICAgICAgICAgICAgZGlmZltrZXldID0gdmFsdWUgJiYgdmFsdWUuX2RpZmYgP1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5fZGlmZiA6IHZhbHVlXG5cbiAgICAgICAgICAgICAgICBzZXROb25FbnVtZXJhYmxlKHN0YXRlLCBcIl9kaWZmXCIsIGRpZmYpXG4gICAgICAgICAgICAgICAgY3VycmVudFRyYW5zYWN0aW9uID0gc3RhdGVcbiAgICAgICAgICAgICAgICBvYnMuc2V0KHN0YXRlKVxuICAgICAgICAgICAgICAgIGN1cnJlbnRUcmFuc2FjdGlvbiA9IE5PX1RSQU5TQUNUSU9OXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfSlcbiAgICB2YXIgX3NldCA9IG9icy5zZXRcbiAgICBvYnMuc2V0ID0gZnVuY3Rpb24gdHJhY2tEaWZmKHZhbHVlKSB7XG4gICAgICAgIGlmIChjdXJyZW50VHJhbnNhY3Rpb24gPT09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3NldCh2YWx1ZSlcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdTdGF0ZSA9IGV4dGVuZCh2YWx1ZSlcbiAgICAgICAgc2V0Tm9uRW51bWVyYWJsZShuZXdTdGF0ZSwgXCJfZGlmZlwiLCB2YWx1ZSlcbiAgICAgICAgX3NldChuZXdTdGF0ZSlcbiAgICB9XG5cbiAgICBvYnMoZnVuY3Rpb24gKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChjdXJyZW50VHJhbnNhY3Rpb24gPT09IG5ld1N0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgb2JzZXJ2ID0gc3RydWN0W2tleV1cbiAgICAgICAgICAgIHZhciBuZXdPYnNlcnZWYWx1ZSA9IG5ld1N0YXRlW2tleV1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvYnNlcnYgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgICAgIG9ic2VydigpICE9PSBuZXdPYnNlcnZWYWx1ZVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgbmVzdGVkVHJhbnNhY3Rpb24gPSBuZXdPYnNlcnZWYWx1ZVxuICAgICAgICAgICAgICAgIG9ic2Vydi5zZXQobmV3U3RhdGVba2V5XSlcbiAgICAgICAgICAgICAgICBuZXN0ZWRUcmFuc2FjdGlvbiA9IE5PX1RSQU5TQUNUSU9OXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSlcblxuICAgIG9icy5fdHlwZSA9IFwib2JzZXJ2LXN0cnVjdFwiXG4gICAgb2JzLl92ZXJzaW9uID0gXCI1XCJcblxuICAgIHJldHVybiBvYnNcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgT2JzZXJ2ID0gcmVxdWlyZSgnb2JzZXJ2JylcbnZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG5cbnZhciBOT19UUkFOU0FDVElPTiA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2VmFyaGFzaFxuXG5mdW5jdGlvbiBPYnNlcnZWYXJoYXNoIChoYXNoLCBjcmVhdGVWYWx1ZSkge1xuICBjcmVhdGVWYWx1ZSA9IGNyZWF0ZVZhbHVlIHx8IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiB9XG5cbiAgdmFyIGluaXRpYWxTdGF0ZSA9IHt9XG4gIHZhciBjdXJyZW50VHJhbnNhY3Rpb24gPSBOT19UUkFOU0FDVElPTlxuXG4gIHZhciBvYnMgPSBPYnNlcnYoaW5pdGlhbFN0YXRlKVxuICBzZXROb25FbnVtZXJhYmxlKG9icywgJ19yZW1vdmVMaXN0ZW5lcnMnLCB7fSlcblxuICBzZXROb25FbnVtZXJhYmxlKG9icywgJ3NldCcsIG9icy5zZXQpXG4gIHNldE5vbkVudW1lcmFibGUob2JzLCAnZ2V0JywgZ2V0LmJpbmQob2JzKSlcbiAgc2V0Tm9uRW51bWVyYWJsZShvYnMsICdwdXQnLCBwdXQuYmluZChvYnMsIGNyZWF0ZVZhbHVlLCBjdXJyZW50VHJhbnNhY3Rpb24pKVxuICBzZXROb25FbnVtZXJhYmxlKG9icywgJ2RlbGV0ZScsIGRlbC5iaW5kKG9icykpXG5cbiAgZm9yICh2YXIga2V5IGluIGhhc2gpIHtcbiAgICBvYnNba2V5XSA9IHR5cGVvZiBoYXNoW2tleV0gPT09ICdmdW5jdGlvbicgP1xuICAgICAgaGFzaFtrZXldIDogY3JlYXRlVmFsdWUoaGFzaFtrZXldLCBrZXkpXG5cbiAgICBpZiAoaXNGbihvYnNba2V5XSkpIHtcbiAgICAgIG9icy5fcmVtb3ZlTGlzdGVuZXJzW2tleV0gPSBvYnNba2V5XSh3YXRjaChvYnMsIGtleSwgY3VycmVudFRyYW5zYWN0aW9uKSlcbiAgICB9XG4gIH1cblxuICB2YXIgbmV3U3RhdGUgPSB7fVxuICBmb3IgKGtleSBpbiBoYXNoKSB7XG4gICAgdmFyIG9ic2VydiA9IG9ic1trZXldXG4gICAgY2hlY2tLZXkoa2V5KVxuICAgIG5ld1N0YXRlW2tleV0gPSBpc0ZuKG9ic2VydikgPyBvYnNlcnYoKSA6IG9ic2VydlxuICB9XG4gIG9icy5zZXQobmV3U3RhdGUpXG5cbiAgb2JzKGZ1bmN0aW9uIChuZXdTdGF0ZSkge1xuICAgIGlmIChjdXJyZW50VHJhbnNhY3Rpb24gPT09IG5ld1N0YXRlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gaGFzaCkge1xuICAgICAgdmFyIG9ic2VydiA9IGhhc2hba2V5XVxuXG4gICAgICBpZiAoaXNGbihvYnNlcnYpICYmIG9ic2VydigpICE9PSBuZXdTdGF0ZVtrZXldKSB7XG4gICAgICAgIG9ic2Vydi5zZXQobmV3U3RhdGVba2V5XSlcbiAgICAgIH1cbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIG9ic1xufVxuXG4vLyBhY2Nlc3MgYW5kIG11dGF0ZVxuZnVuY3Rpb24gZ2V0IChrZXkpIHtcbiAgcmV0dXJuIHRoaXNba2V5XVxufVxuXG5mdW5jdGlvbiBwdXQgKGNyZWF0ZVZhbHVlLCBjdXJyZW50VHJhbnNhY3Rpb24sIGtleSwgdmFsKSB7XG4gIGNoZWNrS2V5KGtleSlcblxuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCB2YXJoYXNoLnB1dChrZXksIHVuZGVmaW5lZCkuJylcbiAgfVxuXG4gIHZhciBvYnNlcnYgPSB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nID9cbiAgICB2YWwgOiBjcmVhdGVWYWx1ZSh2YWwsIGtleSlcbiAgdmFyIHN0YXRlID0gZXh0ZW5kKHRoaXMoKSlcblxuICBzdGF0ZVtrZXldID0gaXNGbihvYnNlcnYpID8gb2JzZXJ2KCkgOiBvYnNlcnZcblxuICBpZiAoaXNGbih0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSkpIHtcbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSgpXG4gIH1cblxuICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSA9IGlzRm4ob2JzZXJ2KSA/XG4gICAgb2JzZXJ2KHdhdGNoKHRoaXMsIGtleSwgY3VycmVudFRyYW5zYWN0aW9uKSkgOiBudWxsXG5cbiAgc2V0Tm9uRW51bWVyYWJsZShzdGF0ZSwgJ19kaWZmJywgZGlmZihrZXksIHN0YXRlW2tleV0pKVxuXG4gIHRoaXNba2V5XSA9IG9ic2VydlxuICB0aGlzLnNldChzdGF0ZSlcblxuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBkZWwgKGtleSkge1xuICB2YXIgc3RhdGUgPSBleHRlbmQodGhpcygpKVxuICBpZiAoaXNGbih0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSkpIHtcbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSgpXG4gIH1cblxuICBkZWxldGUgdGhpcy5fcmVtb3ZlTGlzdGVuZXJzW2tleV1cbiAgZGVsZXRlIHN0YXRlW2tleV1cbiAgZGVsZXRlIHRoaXNba2V5XVxuXG4gIHNldE5vbkVudW1lcmFibGUoc3RhdGUsICdfZGlmZicsIGRpZmYoa2V5LCB1bmRlZmluZWQpKVxuICB0aGlzLnNldChzdGF0ZSlcblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBwcm9jZXNzaW5nXG5mdW5jdGlvbiB3YXRjaCAob2JzLCBrZXksIGN1cnJlbnRUcmFuc2FjdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIHN0YXRlID0gZXh0ZW5kKG9icygpKVxuICAgIHN0YXRlW2tleV0gPSB2YWx1ZVxuXG4gICAgc2V0Tm9uRW51bWVyYWJsZShzdGF0ZSwgJ19kaWZmJywgZGlmZihrZXksIHZhbHVlKSlcbiAgICBjdXJyZW50VHJhbnNhY3Rpb24gPSBzdGF0ZVxuICAgIG9icy5zZXQoc3RhdGUpXG4gICAgY3VycmVudFRyYW5zYWN0aW9uID0gTk9fVFJBTlNBQ1RJT05cbiAgfVxufVxuXG5mdW5jdGlvbiBkaWZmIChrZXksIHZhbHVlKSB7XG4gIHZhciBvYmogPSB7fVxuICBvYmpba2V5XSA9IHZhbHVlICYmIHZhbHVlLl9kaWZmID8gdmFsdWUuX2RpZmYgOiB2YWx1ZVxuICByZXR1cm4gb2JqXG59XG5cbmZ1bmN0aW9uIGlzRm4gKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJ1xufVxuXG5mdW5jdGlvbiBzZXROb25FbnVtZXJhYmxlKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHtcbiAgICB2YWx1ZTogdmFsdWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG59XG5cbi8vIGVycm9yc1xudmFyIGJsYWNrbGlzdCA9IHtcbiAgbmFtZTogJ0NsYXNoZXMgd2l0aCBgRnVuY3Rpb24ucHJvdG90eXBlLm5hbWVgLicsXG4gIGdldDogJ2dldCBpcyBhIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtdmFyaGFzaCBtZXRob2QnLFxuICBwdXQ6ICdwdXQgaXMgYSByZXNlcnZlZCBrZXkgb2Ygb2JzZXJ2LXZhcmhhc2ggbWV0aG9kJyxcbiAgJ2RlbGV0ZSc6ICdkZWxldGUgaXMgYSByZXNlcnZlZCBrZXkgb2Ygb2JzZXJ2LXZhcmhhc2ggbWV0aG9kJyxcbiAgX2RpZmY6ICdfZGlmZiBpcyBhIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtdmFyaGFzaCBtZXRob2QnLFxuICBfcmVtb3ZlTGlzdGVuZXJzOiAnX3JlbW92ZUxpc3RlbmVycyBpcyBhIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtdmFyaGFzaCdcbn1cblxuZnVuY3Rpb24gY2hlY2tLZXkgKGtleSkge1xuICBpZiAoIWJsYWNrbGlzdFtrZXldKSByZXR1cm5cbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICdjYW5ub3QgY3JlYXRlIGFuIG9ic2Vydi12YXJoYXNoIHdpdGgga2V5IGAnICsga2V5ICsgJ2AuICcgKyBibGFja2xpc3Rba2V5XVxuICApXG59XG4iLCJ2YXIgT2JzZXJ2YWJsZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY29tcHV0ZWRcblxuZnVuY3Rpb24gY29tcHV0ZWQob2JzZXJ2YWJsZXMsIGxhbWJkYSkge1xuICAgIHZhciB2YWx1ZXMgPSBvYnNlcnZhYmxlcy5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIG8oKVxuICAgIH0pXG4gICAgdmFyIHJlc3VsdCA9IE9ic2VydmFibGUobGFtYmRhLmFwcGx5KG51bGwsIHZhbHVlcykpXG5cbiAgICBvYnNlcnZhYmxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgICAgICBvKGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgdmFsdWVzW2luZGV4XSA9IG5ld1ZhbHVlXG4gICAgICAgICAgICByZXN1bHQuc2V0KGxhbWJkYS5hcHBseShudWxsLCB2YWx1ZXMpKVxuICAgICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm4gcmVzdWx0XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGVcblxuZnVuY3Rpb24gT2JzZXJ2YWJsZSh2YWx1ZSkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSBbXVxuICAgIHZhbHVlID0gdmFsdWUgPT09IHVuZGVmaW5lZCA/IG51bGwgOiB2YWx1ZVxuXG4gICAgb2JzZXJ2YWJsZS5zZXQgPSBmdW5jdGlvbiAodikge1xuICAgICAgICB2YWx1ZSA9IHZcbiAgICAgICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIGYodilcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gb2JzZXJ2YWJsZVxuXG4gICAgZnVuY3Rpb24gb2JzZXJ2YWJsZShsaXN0ZW5lcikge1xuICAgICAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiByZW1vdmUoKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSwgMSlcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gd2F0Y2hcblxuZnVuY3Rpb24gd2F0Y2gob2JzZXJ2YWJsZSwgbGlzdGVuZXIpIHtcbiAgICB2YXIgcmVtb3ZlID0gb2JzZXJ2YWJsZShsaXN0ZW5lcilcbiAgICBsaXN0ZW5lcihvYnNlcnZhYmxlKCkpXG4gICAgcmV0dXJuIHJlbW92ZVxufVxuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCJ2YXIgbmFyZ3MgPSAvXFx7KFswLTlhLXpBLVpdKylcXH0vZ1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVcblxuZnVuY3Rpb24gdGVtcGxhdGUoc3RyaW5nKSB7XG4gICAgdmFyIGFyZ3NcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyICYmIHR5cGVvZiBhcmd1bWVudHNbMV0gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50c1sxXVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICB9XG5cbiAgICBpZiAoIWFyZ3MgfHwgIWFyZ3MuaGFzT3duUHJvcGVydHkpIHtcbiAgICAgICAgYXJncyA9IHt9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKG5hcmdzLCBmdW5jdGlvbiByZXBsYWNlQXJnKG1hdGNoLCBpLCBpbmRleCkge1xuICAgICAgICB2YXIgcmVzdWx0XG5cbiAgICAgICAgaWYgKHN0cmluZ1tpbmRleCAtIDFdID09PSBcIntcIiAmJlxuICAgICAgICAgICAgc3RyaW5nW2luZGV4ICsgbWF0Y2gubGVuZ3RoXSA9PT0gXCJ9XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBhcmdzLmhhc093blByb3BlcnR5KGkpID8gYXJnc1tpXSA6IG51bGxcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgIH1cbiAgICB9KVxufVxuIiwidmFyIERlbGVnYXRvciA9IHJlcXVpcmUoJ2RvbS1kZWxlZ2F0b3InKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudFxuXG5mdW5jdGlvbiBCYXNlRXZlbnQobGFtYmRhKSB7XG4gICAgcmV0dXJuIEV2ZW50SGFuZGxlcjtcblxuICAgIGZ1bmN0aW9uIEV2ZW50SGFuZGxlcihmbiwgZGF0YSwgb3B0cykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGZuOiBmbixcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCA/IGRhdGEgOiB7fSxcbiAgICAgICAgICAgIG9wdHM6IG9wdHMgfHwge30sXG4gICAgICAgICAgICBoYW5kbGVFdmVudDogaGFuZGxlRXZlbnRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmbiAmJiBmbi50eXBlID09PSAnZG9tLWRlbGVnYXRvci1oYW5kbGUnKSB7XG4gICAgICAgICAgICByZXR1cm4gRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZShmbixcbiAgICAgICAgICAgICAgICBoYW5kbGVMYW1iZGEuYmluZChoYW5kbGVyKSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUxhbWJkYShldiwgYnJvYWRjYXN0KSB7XG4gICAgICAgIGlmICh0aGlzLm9wdHMuc3RhcnRQcm9wYWdhdGlvbiAmJiBldi5zdGFydFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICBldi5zdGFydFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGFtYmRhLmNhbGwodGhpcywgZXYsIGJyb2FkY2FzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVFdmVudChldikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgICAgICBpZiAoc2VsZi5vcHRzLnN0YXJ0UHJvcGFnYXRpb24gJiYgZXYuc3RhcnRQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgZXYuc3RhcnRQcm9wYWdhdGlvbigpXG4gICAgICAgIH1cblxuICAgICAgICBsYW1iZGEuY2FsbChzZWxmLCBldiwgYnJvYWRjYXN0KVxuXG4gICAgICAgIGZ1bmN0aW9uIGJyb2FkY2FzdCh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLmZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5mbih2YWx1ZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5mbi53cml0ZSh2YWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG52YXIgZ2V0Rm9ybURhdGEgPSByZXF1aXJlKCdmb3JtLWRhdGEtc2V0L2VsZW1lbnQnKVxuXG52YXIgQmFzZUV2ZW50ID0gcmVxdWlyZSgnLi9iYXNlLWV2ZW50LmpzJylcblxudmFyIFZBTElEX0NIQU5HRSA9IFsnY2hlY2tib3gnLCAnZmlsZScsICdzZWxlY3QtbXVsdGlwbGUnLCAnc2VsZWN0LW9uZSddO1xudmFyIFZBTElEX0lOUFVUID0gWydjb2xvcicsICdkYXRlJywgJ2RhdGV0aW1lJywgJ2RhdGV0aW1lLWxvY2FsJywgJ2VtYWlsJyxcbiAgICAnbW9udGgnLCAnbnVtYmVyJywgJ3Bhc3N3b3JkJywgJ3JhbmdlJywgJ3NlYXJjaCcsICd0ZWwnLCAndGV4dCcsICd0aW1lJyxcbiAgICAndXJsJywgJ3dlZWsnXTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlRXZlbnQoY2hhbmdlTGFtYmRhKTtcblxuZnVuY3Rpb24gY2hhbmdlTGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZXYudGFyZ2V0XG5cbiAgICB2YXIgaXNWYWxpZCA9XG4gICAgICAgIChldi50eXBlID09PSAnaW5wdXQnICYmIFZBTElEX0lOUFVULmluZGV4T2YodGFyZ2V0LnR5cGUpICE9PSAtMSkgfHxcbiAgICAgICAgKGV2LnR5cGUgPT09ICdjaGFuZ2UnICYmIFZBTElEX0NIQU5HRS5pbmRleE9mKHRhcmdldC50eXBlKSAhPT0gLTEpO1xuXG4gICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgIGlmIChldi5zdGFydFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICBldi5zdGFydFByb3BhZ2F0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBnZXRGb3JtRGF0YShldi5jdXJyZW50VGFyZ2V0KVxuICAgIHZhciBkYXRhID0gZXh0ZW5kKHZhbHVlLCB0aGlzLmRhdGEpXG5cbiAgICBicm9hZGNhc3QoZGF0YSlcbn1cbiIsInZhciBCYXNlRXZlbnQgPSByZXF1aXJlKCcuL2Jhc2UtZXZlbnQuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlRXZlbnQoY2xpY2tMYW1iZGEpO1xuXG5mdW5jdGlvbiBjbGlja0xhbWJkYShldiwgYnJvYWRjYXN0KSB7XG4gICAgdmFyIG9wdHMgPSB0aGlzLm9wdHM7XG5cbiAgICBpZiAoIW9wdHMuY3RybCAmJiBldi5jdHJsS2V5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW9wdHMubWV0YSAmJiBldi5tZXRhS2V5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW9wdHMucmlnaHRDbGljayAmJiBldi53aGljaCA9PT0gMikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0cy5wcmV2ZW50RGVmYXVsdCAmJiBldi5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIGJyb2FkY2FzdCh0aGlzLmRhdGEpO1xufVxuIiwidmFyIEJhc2VFdmVudCA9IHJlcXVpcmUoJy4vYmFzZS1ldmVudC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudChldmVudExhbWJkYSk7XG5cbmZ1bmN0aW9uIGV2ZW50TGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICBicm9hZGNhc3QodGhpcy5kYXRhKTtcbn1cbiIsInZhciBCYXNlRXZlbnQgPSByZXF1aXJlKCcuL2Jhc2UtZXZlbnQuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlRXZlbnQoa2V5TGFtYmRhKTtcblxuZnVuY3Rpb24ga2V5TGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICB2YXIga2V5ID0gdGhpcy5vcHRzLmtleTtcblxuICAgIGlmIChldi5rZXlDb2RlID09PSBrZXkpIHtcbiAgICAgICAgYnJvYWRjYXN0KHRoaXMuZGF0YSk7XG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBoYXNLZXlzXG5cbmZ1bmN0aW9uIGhhc0tleXMoc291cmNlKSB7XG4gICAgcmV0dXJuIHNvdXJjZSAhPT0gbnVsbCAmJlxuICAgICAgICAodHlwZW9mIHNvdXJjZSA9PT0gXCJvYmplY3RcIiB8fFxuICAgICAgICB0eXBlb2Ygc291cmNlID09PSBcImZ1bmN0aW9uXCIpXG59XG4iLCJ2YXIgaGFzS2V5cyA9IHJlcXVpcmUoXCIuL2hhcy1rZXlzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBpZiAoIWhhc0tleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG52YXIgZ2V0Rm9ybURhdGEgPSByZXF1aXJlKCdmb3JtLWRhdGEtc2V0L2VsZW1lbnQnKVxuXG52YXIgQmFzZUV2ZW50ID0gcmVxdWlyZSgnLi9iYXNlLWV2ZW50LmpzJyk7XG5cbnZhciBFTlRFUiA9IDEzXG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUV2ZW50KHN1Ym1pdExhbWJkYSk7XG5cbmZ1bmN0aW9uIHN1Ym1pdExhbWJkYShldiwgYnJvYWRjYXN0KSB7XG4gICAgdmFyIHRhcmdldCA9IGV2LnRhcmdldFxuXG4gICAgdmFyIGlzVmFsaWQgPVxuICAgICAgICAoZXYudHlwZSA9PT0gJ3N1Ym1pdCcgJiYgdGFyZ2V0LnRhZ05hbWUgPT09ICdGT1JNJykgfHxcbiAgICAgICAgKGV2LnR5cGUgPT09ICdjbGljaycgJiYgdGFyZ2V0LnRhZ05hbWUgPT09ICdCVVRUT04nKSB8fFxuICAgICAgICAoZXYudHlwZSA9PT0gJ2NsaWNrJyAmJiB0YXJnZXQudHlwZSA9PT0gJ3N1Ym1pdCcpIHx8XG4gICAgICAgIChcbiAgICAgICAgICAgICh0YXJnZXQudHlwZSA9PT0gJ3RleHQnKSAmJlxuICAgICAgICAgICAgKGV2LmtleUNvZGUgPT09IEVOVEVSICYmIGV2LnR5cGUgPT09ICdrZXlkb3duJylcbiAgICAgICAgKVxuXG4gICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgIGlmIChldi5zdGFydFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICBldi5zdGFydFByb3BhZ2F0aW9uKClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBnZXRGb3JtRGF0YShldi5jdXJyZW50VGFyZ2V0KVxuICAgIHZhciBkYXRhID0gZXh0ZW5kKHZhbHVlLCB0aGlzLmRhdGEpXG5cbiAgICBpZiAoZXYucHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICBicm9hZGNhc3QoZGF0YSk7XG59XG4iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxudmFyIGdldEZvcm1EYXRhID0gcmVxdWlyZSgnZm9ybS1kYXRhLXNldC9lbGVtZW50JylcblxudmFyIEJhc2VFdmVudCA9IHJlcXVpcmUoJy4vYmFzZS1ldmVudC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudCh2YWx1ZUxhbWJkYSk7XG5cbmZ1bmN0aW9uIHZhbHVlTGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICB2YXIgdmFsdWUgPSBnZXRGb3JtRGF0YShldi5jdXJyZW50VGFyZ2V0KVxuICAgIHZhciBkYXRhID0gZXh0ZW5kKHZhbHVlLCB0aGlzLmRhdGEpXG5cbiAgICBicm9hZGNhc3QoZGF0YSk7XG59XG4iLCJmdW5jdGlvbiBUaHVuayhmbiwgYXJncywga2V5LCBlcUFyZ3MpIHtcclxuICAgIHRoaXMuZm4gPSBmbjtcclxuICAgIHRoaXMuYXJncyA9IGFyZ3M7XHJcbiAgICB0aGlzLmtleSA9IGtleTtcclxuICAgIHRoaXMuZXFBcmdzID0gZXFBcmdzO1xyXG59XHJcblxyXG5UaHVuay5wcm90b3R5cGUudHlwZSA9ICdUaHVuayc7XHJcblRodW5rLnByb3RvdHlwZS5yZW5kZXIgPSByZW5kZXI7XHJcbm1vZHVsZS5leHBvcnRzID0gVGh1bms7XHJcblxyXG5mdW5jdGlvbiBzaG91bGRVcGRhdGUoY3VycmVudCwgcHJldmlvdXMpIHtcclxuICAgIGlmICghY3VycmVudCB8fCAhcHJldmlvdXMgfHwgY3VycmVudC5mbiAhPT0gcHJldmlvdXMuZm4pIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY2FyZ3MgPSBjdXJyZW50LmFyZ3M7XHJcbiAgICB2YXIgcGFyZ3MgPSBwcmV2aW91cy5hcmdzO1xyXG5cclxuICAgIHJldHVybiAhY3VycmVudC5lcUFyZ3MoY2FyZ3MsIHBhcmdzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyKHByZXZpb3VzKSB7XHJcbiAgICBpZiAoc2hvdWxkVXBkYXRlKHRoaXMsIHByZXZpb3VzKSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZuLmFwcGx5KG51bGwsIHRoaXMuYXJncyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBwcmV2aW91cy52bm9kZTtcclxuICAgIH1cclxufVxyXG4iLCJ2YXIgUGFydGlhbCA9IHJlcXVpcmUoJy4vcGFydGlhbCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQYXJ0aWFsKCk7XHJcbiIsInZhciBzaGFsbG93RXEgPSByZXF1aXJlKCcuL3NoYWxsb3ctZXEnKTtcbnZhciBUaHVuayA9IHJlcXVpcmUoJy4vaW1tdXRhYmxlLXRodW5rJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlUGFydGlhbDtcblxuZnVuY3Rpb24gY3JlYXRlUGFydGlhbChlcSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBwYXJ0aWFsKGZuKSB7XG4gICAgICAgIHZhciBhcmdzID0gY29weU92ZXIoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgdmFyIGZpcnN0QXJnID0gYXJnc1swXTtcbiAgICAgICAgdmFyIGtleTtcblxuICAgICAgICB2YXIgZXFBcmdzID0gZXEgfHwgc2hhbGxvd0VxO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoJ2tleScgaW4gZmlyc3RBcmcpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBmaXJzdEFyZy5rZXk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCdpZCcgaW4gZmlyc3RBcmcpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBmaXJzdEFyZy5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgVGh1bmsoZm4sIGFyZ3MsIGtleSwgZXFBcmdzKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjb3B5T3ZlcihsaXN0LCBvZmZzZXQpIHtcbiAgICB2YXIgbmV3TGlzdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gb2Zmc2V0OyBpLS0pIHtcbiAgICAgICAgbmV3TGlzdFtpIC0gb2Zmc2V0XSA9IGxpc3RbaV07XG4gICAgfVxuICAgIHJldHVybiBuZXdMaXN0O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBzaGFsbG93RXE7XHJcblxyXG5mdW5jdGlvbiBzaGFsbG93RXEoY3VycmVudEFyZ3MsIHByZXZpb3VzQXJncykge1xyXG4gICAgaWYgKGN1cnJlbnRBcmdzLmxlbmd0aCA9PT0gMCAmJiBwcmV2aW91c0FyZ3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGN1cnJlbnRBcmdzLmxlbmd0aCAhPT0gcHJldmlvdXNBcmdzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgbGVuID0gY3VycmVudEFyZ3MubGVuZ3RoO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICBpZiAoY3VycmVudEFyZ3NbaV0gIT09IHByZXZpb3VzQXJnc1tpXSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcbnZhciBpc0hvb2sgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdmhvb2suanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVByb3BlcnRpZXNcblxuZnVuY3Rpb24gYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzLCBwcmV2aW91cykge1xuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV1cblxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUsIHByZXZpb3VzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hvb2socHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpXG4gICAgICAgICAgICBpZiAocHJvcFZhbHVlLmhvb2spIHtcbiAgICAgICAgICAgICAgICBwcm9wVmFsdWUuaG9vayhub2RlLFxuICAgICAgICAgICAgICAgICAgICBwcm9wTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QocHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUsIHByZXZpb3VzKSB7XG4gICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKCFpc0hvb2socHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcE5hbWUgPT09IFwic3R5bGVcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW2ldID0gXCJcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByZXZpb3VzVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IFwiXCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNWYWx1ZS51bmhvb2spIHtcbiAgICAgICAgICAgIHByZXZpb3VzVmFsdWUudW5ob29rKG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWRcblxuICAgIC8vIFNldCBhdHRyaWJ1dGVzXG4gICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSBwcm9wVmFsdWVbYXR0ck5hbWVdXG5cbiAgICAgICAgICAgIGlmIChhdHRyVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYocHJldmlvdXNWYWx1ZSAmJiBpc09iamVjdChwcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICBnZXRQcm90b3R5cGUocHJldmlvdXNWYWx1ZSkgIT09IGdldFByb3RvdHlwZShwcm9wVmFsdWUpKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghaXNPYmplY3Qobm9kZVtwcm9wTmFtZV0pKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0ge31cbiAgICB9XG5cbiAgICB2YXIgcmVwbGFjZXIgPSBwcm9wTmFtZSA9PT0gXCJzdHlsZVwiID8gXCJcIiA6IHVuZGVmaW5lZFxuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcHJvcFZhbHVlW2tdXG4gICAgICAgIG5vZGVbcHJvcE5hbWVdW2tdID0gKHZhbHVlID09PSB1bmRlZmluZWQpID8gcmVwbGFjZXIgOiB2YWx1ZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZub2RlLmpzXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12dGV4dC5qc1wiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldC5qc1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2hhbmRsZS10aHVuay5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh2bm9kZSwgb3B0cykge1xuICAgIHZhciBkb2MgPSBvcHRzID8gb3B0cy5kb2N1bWVudCB8fCBkb2N1bWVudCA6IGRvY3VtZW50XG4gICAgdmFyIHdhcm4gPSBvcHRzID8gb3B0cy53YXJuIDogbnVsbFxuXG4gICAgdm5vZGUgPSBoYW5kbGVUaHVuayh2bm9kZSkuYVxuXG4gICAgaWYgKGlzV2lkZ2V0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gdm5vZGUuaW5pdCgpXG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpXG4gICAgfSBlbHNlIGlmICghaXNWTm9kZSh2bm9kZSkpIHtcbiAgICAgICAgaWYgKHdhcm4pIHtcbiAgICAgICAgICAgIHdhcm4oXCJJdGVtIGlzIG5vdCBhIHZhbGlkIHZpcnR1YWwgZG9tIG5vZGVcIiwgdm5vZGUpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9ICh2bm9kZS5uYW1lc3BhY2UgPT09IG51bGwpID9cbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnQodm5vZGUudGFnTmFtZSkgOlxuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudE5TKHZub2RlLm5hbWVzcGFjZSwgdm5vZGUudGFnTmFtZSlcblxuICAgIHZhciBwcm9wcyA9IHZub2RlLnByb3BlcnRpZXNcbiAgICBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMpXG5cbiAgICB2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gY3JlYXRlRWxlbWVudChjaGlsZHJlbltpXSwgb3B0cylcbiAgICAgICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZE5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZVxufVxuIiwiLy8gTWFwcyBhIHZpcnR1YWwgRE9NIHRyZWUgb250byBhIHJlYWwgRE9NIHRyZWUgaW4gYW4gZWZmaWNpZW50IG1hbm5lci5cbi8vIFdlIGRvbid0IHdhbnQgdG8gcmVhZCBhbGwgb2YgdGhlIERPTSBub2RlcyBpbiB0aGUgdHJlZSBzbyB3ZSB1c2Vcbi8vIHRoZSBpbi1vcmRlciB0cmVlIGluZGV4aW5nIHRvIGVsaW1pbmF0ZSByZWN1cnNpb24gZG93biBjZXJ0YWluIGJyYW5jaGVzLlxuLy8gV2Ugb25seSByZWN1cnNlIGludG8gYSBET00gbm9kZSBpZiB3ZSBrbm93IHRoYXQgaXQgY29udGFpbnMgYSBjaGlsZCBvZlxuLy8gaW50ZXJlc3QuXG5cbnZhciBub0NoaWxkID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSBkb21JbmRleFxuXG5mdW5jdGlvbiBkb21JbmRleChyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMpIHtcbiAgICBpZiAoIWluZGljZXMgfHwgaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5kaWNlcy5zb3J0KGFzY2VuZGluZylcbiAgICAgICAgcmV0dXJuIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCAwKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleCkge1xuICAgIG5vZGVzID0gbm9kZXMgfHwge31cblxuXG4gICAgaWYgKHJvb3ROb2RlKSB7XG4gICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCByb290SW5kZXgpKSB7XG4gICAgICAgICAgICBub2Rlc1tyb290SW5kZXhdID0gcm9vdE5vZGVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2Q2hpbGRyZW4gPSB0cmVlLmNoaWxkcmVuXG5cbiAgICAgICAgaWYgKHZDaGlsZHJlbikge1xuXG4gICAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHJvb3ROb2RlLmNoaWxkTm9kZXNcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIHZhciB2Q2hpbGQgPSB2Q2hpbGRyZW5baV0gfHwgbm9DaGlsZFxuICAgICAgICAgICAgICAgIHZhciBuZXh0SW5kZXggPSByb290SW5kZXggKyAodkNoaWxkLmNvdW50IHx8IDApXG5cbiAgICAgICAgICAgICAgICAvLyBza2lwIHJlY3Vyc2lvbiBkb3duIHRoZSB0cmVlIGlmIHRoZXJlIGFyZSBubyBub2RlcyBkb3duIGhlcmVcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgbmV4dEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICByZWN1cnNlKGNoaWxkTm9kZXNbaV0sIHZDaGlsZCwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByb290SW5kZXggPSBuZXh0SW5kZXhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlc1xufVxuXG4vLyBCaW5hcnkgc2VhcmNoIGZvciBhbiBpbmRleCBpbiB0aGUgaW50ZXJ2YWwgW2xlZnQsIHJpZ2h0XVxuZnVuY3Rpb24gaW5kZXhJblJhbmdlKGluZGljZXMsIGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciBtaW5JbmRleCA9IDBcbiAgICB2YXIgbWF4SW5kZXggPSBpbmRpY2VzLmxlbmd0aCAtIDFcbiAgICB2YXIgY3VycmVudEluZGV4XG4gICAgdmFyIGN1cnJlbnRJdGVtXG5cbiAgICB3aGlsZSAobWluSW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgY3VycmVudEluZGV4ID0gKChtYXhJbmRleCArIG1pbkluZGV4KSAvIDIpID4+IDBcbiAgICAgICAgY3VycmVudEl0ZW0gPSBpbmRpY2VzW2N1cnJlbnRJbmRleF1cblxuICAgICAgICBpZiAobWluSW5kZXggPT09IG1heEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEl0ZW0gPj0gbGVmdCAmJiBjdXJyZW50SXRlbSA8PSByaWdodFxuICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJdGVtIDwgbGVmdCkge1xuICAgICAgICAgICAgbWluSW5kZXggPSBjdXJyZW50SW5kZXggKyAxXG4gICAgICAgIH0gZWxzZSAgaWYgKGN1cnJlbnRJdGVtID4gcmlnaHQpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYSA+IGIgPyAxIDogLTFcbn1cbiIsInZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXQuanNcIilcbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi4vdm5vZGUvdnBhdGNoLmpzXCIpXG5cbnZhciByZW5kZXIgPSByZXF1aXJlKFwiLi9jcmVhdGUtZWxlbWVudFwiKVxudmFyIHVwZGF0ZVdpZGdldCA9IHJlcXVpcmUoXCIuL3VwZGF0ZS13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVBhdGNoXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2godnBhdGNoLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHR5cGUgPSB2cGF0Y2gudHlwZVxuICAgIHZhciB2Tm9kZSA9IHZwYXRjaC52Tm9kZVxuICAgIHZhciBwYXRjaCA9IHZwYXRjaC5wYXRjaFxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgVlBhdGNoLlJFTU9WRTpcbiAgICAgICAgICAgIHJldHVybiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKVxuICAgICAgICBjYXNlIFZQYXRjaC5JTlNFUlQ6XG4gICAgICAgICAgICByZXR1cm4gaW5zZXJ0Tm9kZShkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVlRFWFQ6XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5nUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5XSURHRVQ6XG4gICAgICAgICAgICByZXR1cm4gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WTk9ERTpcbiAgICAgICAgICAgIHJldHVybiB2Tm9kZVBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guT1JERVI6XG4gICAgICAgICAgICByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgcGF0Y2gpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5QUk9QUzpcbiAgICAgICAgICAgIGFwcGx5UHJvcGVydGllcyhkb21Ob2RlLCBwYXRjaCwgdk5vZGUucHJvcGVydGllcylcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlRIVU5LOlxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VSb290KGRvbU5vZGUsXG4gICAgICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5wYXRjaChkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucykpXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSkge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCB2Tm9kZSk7XG5cbiAgICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudE5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmVudE5vZGVcbn1cblxuZnVuY3Rpb24gc3RyaW5nUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2VGV4dCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoZG9tTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBkb21Ob2RlLnJlcGxhY2VEYXRhKDAsIGRvbU5vZGUubGVuZ3RoLCB2VGV4dC50ZXh0KVxuICAgICAgICBuZXdOb2RlID0gZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgICAgIG5ld05vZGUgPSByZW5kZXIodlRleHQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB3aWRnZXRQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHdpZGdldCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciB1cGRhdGluZyA9IHVwZGF0ZVdpZGdldChsZWZ0Vk5vZGUsIHdpZGdldClcbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKHVwZGF0aW5nKSB7XG4gICAgICAgIG5ld05vZGUgPSB3aWRnZXQudXBkYXRlKGxlZnRWTm9kZSwgZG9tTm9kZSkgfHwgZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSByZW5kZXIod2lkZ2V0LCByZW5kZXJPcHRpb25zKVxuICAgIH1cblxuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSAmJiBuZXdOb2RlICE9PSBkb21Ob2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgaWYgKCF1cGRhdGluZykge1xuICAgICAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB2Tm9kZVBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHcpIHtcbiAgICBpZiAodHlwZW9mIHcuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiICYmIGlzV2lkZ2V0KHcpKSB7XG4gICAgICAgIHcuZGVzdHJveShkb21Ob2RlKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIGJJbmRleCkge1xuICAgIHZhciBjaGlsZHJlbiA9IFtdXG4gICAgdmFyIGNoaWxkTm9kZXMgPSBkb21Ob2RlLmNoaWxkTm9kZXNcbiAgICB2YXIgbGVuID0gY2hpbGROb2Rlcy5sZW5ndGhcbiAgICB2YXIgaVxuICAgIHZhciByZXZlcnNlSW5kZXggPSBiSW5kZXgucmV2ZXJzZVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goZG9tTm9kZS5jaGlsZE5vZGVzW2ldKVxuICAgIH1cblxuICAgIHZhciBpbnNlcnRPZmZzZXQgPSAwXG4gICAgdmFyIG1vdmVcbiAgICB2YXIgbm9kZVxuICAgIHZhciBpbnNlcnROb2RlXG4gICAgdmFyIGNoYWluTGVuZ3RoXG4gICAgdmFyIGluc2VydGVkTGVuZ3RoXG4gICAgdmFyIG5leHRTaWJsaW5nXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjspIHtcbiAgICAgICAgbW92ZSA9IGJJbmRleFtpXVxuICAgICAgICBjaGFpbkxlbmd0aCA9IDFcbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCAmJiBtb3ZlICE9PSBpKSB7XG4gICAgICAgICAgICAvLyB0cnkgdG8gYnJpbmcgZm9yd2FyZCBhcyBsb25nIG9mIGEgY2hhaW4gYXMgcG9zc2libGVcbiAgICAgICAgICAgIHdoaWxlIChiSW5kZXhbaSArIGNoYWluTGVuZ3RoXSA9PT0gbW92ZSArIGNoYWluTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhaW5MZW5ndGgrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIGVsZW1lbnQgY3VycmVudGx5IGF0IHRoaXMgaW5kZXggd2lsbCBiZSBtb3ZlZCBsYXRlciBzbyBpbmNyZWFzZSB0aGUgaW5zZXJ0IG9mZnNldFxuICAgICAgICAgICAgaWYgKHJldmVyc2VJbmRleFtpXSA+IGkgKyBjaGFpbkxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5vZGUgPSBjaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaW5zZXJ0Tm9kZSA9IGNoaWxkTm9kZXNbaSArIGluc2VydE9mZnNldF0gfHwgbnVsbFxuICAgICAgICAgICAgaW5zZXJ0ZWRMZW5ndGggPSAwXG4gICAgICAgICAgICB3aGlsZSAobm9kZSAhPT0gaW5zZXJ0Tm9kZSAmJiBpbnNlcnRlZExlbmd0aCsrIDwgY2hhaW5MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkb21Ob2RlLmluc2VydEJlZm9yZShub2RlLCBpbnNlcnROb2RlKTtcbiAgICAgICAgICAgICAgICBub2RlID0gY2hpbGRyZW5bbW92ZSArIGluc2VydGVkTGVuZ3RoXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIG1vdmVkIGVsZW1lbnQgY2FtZSBmcm9tIHRoZSBmcm9udCBvZiB0aGUgYXJyYXkgc28gcmVkdWNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAobW92ZSArIGNoYWluTGVuZ3RoIDwgaSkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldC0tXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbGVtZW50IGF0IHRoaXMgaW5kZXggaXMgc2NoZWR1bGVkIHRvIGJlIHJlbW92ZWQgc28gaW5jcmVhc2UgaW5zZXJ0IG9mZnNldFxuICAgICAgICBpZiAoaSBpbiBiSW5kZXgucmVtb3Zlcykge1xuICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgfVxuXG4gICAgICAgIGkgKz0gY2hhaW5MZW5ndGhcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VSb290KG9sZFJvb3QsIG5ld1Jvb3QpIHtcbiAgICBpZiAob2xkUm9vdCAmJiBuZXdSb290ICYmIG9sZFJvb3QgIT09IG5ld1Jvb3QgJiYgb2xkUm9vdC5wYXJlbnROb2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG9sZFJvb3QpXG4gICAgICAgIG9sZFJvb3QucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Um9vdCwgb2xkUm9vdClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Um9vdDtcbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcblxudmFyIGRvbUluZGV4ID0gcmVxdWlyZShcIi4vZG9tLWluZGV4XCIpXG52YXIgcGF0Y2hPcCA9IHJlcXVpcmUoXCIuL3BhdGNoLW9wXCIpXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG5cbmZ1bmN0aW9uIHBhdGNoKHJvb3ROb2RlLCBwYXRjaGVzKSB7XG4gICAgcmV0dXJuIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzKVxufVxuXG5mdW5jdGlvbiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBpbmRpY2VzID0gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpXG5cbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZG9tSW5kZXgocm9vdE5vZGUsIHBhdGNoZXMuYSwgaW5kaWNlcylcbiAgICB2YXIgb3duZXJEb2N1bWVudCA9IHJvb3ROb2RlLm93bmVyRG9jdW1lbnRcblxuICAgIGlmICghcmVuZGVyT3B0aW9ucykge1xuICAgICAgICByZW5kZXJPcHRpb25zID0geyBwYXRjaDogcGF0Y2hSZWN1cnNpdmUgfVxuICAgICAgICBpZiAob3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMuZG9jdW1lbnQgPSBvd25lckRvY3VtZW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGVJbmRleCA9IGluZGljZXNbaV1cbiAgICAgICAgcm9vdE5vZGUgPSBhcHBseVBhdGNoKHJvb3ROb2RlLFxuICAgICAgICAgICAgaW5kZXhbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHBhdGNoZXNbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2gocm9vdE5vZGUsIGRvbU5vZGUsIHBhdGNoTGlzdCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICghZG9tTm9kZSkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGlzQXJyYXkocGF0Y2hMaXN0KSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0W2ldLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5kaWNlcyhwYXRjaGVzKSB7XG4gICAgdmFyIGluZGljZXMgPSBbXVxuXG4gICAgZm9yICh2YXIga2V5IGluIHBhdGNoZXMpIHtcbiAgICAgICAgaWYgKGtleSAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIGluZGljZXMucHVzaChOdW1iZXIoa2V5KSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbmRpY2VzXG59XG4iLCJ2YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gdXBkYXRlV2lkZ2V0XG5cbmZ1bmN0aW9uIHVwZGF0ZVdpZGdldChhLCBiKSB7XG4gICAgaWYgKGlzV2lkZ2V0KGEpICYmIGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGlmIChcIm5hbWVcIiBpbiBhICYmIFwibmFtZVwiIGluIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmlkID09PSBiLmlkXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pbml0ID09PSBiLmluaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZTdG9yZSA9IHJlcXVpcmUoJ2V2LXN0b3JlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZIb29rO1xuXG5mdW5jdGlvbiBFdkhvb2sodmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRXZIb29rKSkge1xuICAgICAgICByZXR1cm4gbmV3IEV2SG9vayh2YWx1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5Fdkhvb2sucHJvdG90eXBlLmhvb2sgPSBmdW5jdGlvbiAobm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgdmFyIGVzID0gRXZTdG9yZShub2RlKTtcbiAgICB2YXIgcHJvcE5hbWUgPSBwcm9wZXJ0eU5hbWUuc3Vic3RyKDMpO1xuXG4gICAgZXNbcHJvcE5hbWVdID0gdGhpcy52YWx1ZTtcbn07XG5cbkV2SG9vay5wcm90b3R5cGUudW5ob29rID0gZnVuY3Rpb24obm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgdmFyIGVzID0gRXZTdG9yZShub2RlKTtcbiAgICB2YXIgcHJvcE5hbWUgPSBwcm9wZXJ0eU5hbWUuc3Vic3RyKDMpO1xuXG4gICAgZXNbcHJvcE5hbWVdID0gdW5kZWZpbmVkO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBTb2Z0U2V0SG9vaztcblxuZnVuY3Rpb24gU29mdFNldEhvb2sodmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU29mdFNldEhvb2spKSB7XG4gICAgICAgIHJldHVybiBuZXcgU29mdFNldEhvb2sodmFsdWUpO1xuICAgIH1cblxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuU29mdFNldEhvb2sucHJvdG90eXBlLmhvb2sgPSBmdW5jdGlvbiAobm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgaWYgKG5vZGVbcHJvcGVydHlOYW1lXSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICBub2RlW3Byb3BlcnR5TmFtZV0gPSB0aGlzLnZhbHVlO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgneC1pcy1hcnJheScpO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuLi92bm9kZS92bm9kZS5qcycpO1xudmFyIFZUZXh0ID0gcmVxdWlyZSgnLi4vdm5vZGUvdnRleHQuanMnKTtcbnZhciBpc1ZOb2RlID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdm5vZGUnKTtcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdnRleHQnKTtcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXdpZGdldCcpO1xudmFyIGlzSG9vayA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXZob29rJyk7XG52YXIgaXNWVGh1bmsgPSByZXF1aXJlKCcuLi92bm9kZS9pcy10aHVuaycpO1xuXG52YXIgcGFyc2VUYWcgPSByZXF1aXJlKCcuL3BhcnNlLXRhZy5qcycpO1xudmFyIHNvZnRTZXRIb29rID0gcmVxdWlyZSgnLi9ob29rcy9zb2Z0LXNldC1ob29rLmpzJyk7XG52YXIgZXZIb29rID0gcmVxdWlyZSgnLi9ob29rcy9ldi1ob29rLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gaDtcblxuZnVuY3Rpb24gaCh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbikge1xuICAgIHZhciBjaGlsZE5vZGVzID0gW107XG4gICAgdmFyIHRhZywgcHJvcHMsIGtleSwgbmFtZXNwYWNlO1xuXG4gICAgaWYgKCFjaGlsZHJlbiAmJiBpc0NoaWxkcmVuKHByb3BlcnRpZXMpKSB7XG4gICAgICAgIGNoaWxkcmVuID0gcHJvcGVydGllcztcbiAgICAgICAgcHJvcHMgPSB7fTtcbiAgICB9XG5cbiAgICBwcm9wcyA9IHByb3BzIHx8IHByb3BlcnRpZXMgfHwge307XG4gICAgdGFnID0gcGFyc2VUYWcodGFnTmFtZSwgcHJvcHMpO1xuXG4gICAgLy8gc3VwcG9ydCBrZXlzXG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KCdrZXknKSkge1xuICAgICAgICBrZXkgPSBwcm9wcy5rZXk7XG4gICAgICAgIHByb3BzLmtleSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IG5hbWVzcGFjZVxuICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eSgnbmFtZXNwYWNlJykpIHtcbiAgICAgICAgbmFtZXNwYWNlID0gcHJvcHMubmFtZXNwYWNlO1xuICAgICAgICBwcm9wcy5uYW1lc3BhY2UgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gZml4IGN1cnNvciBidWdcbiAgICBpZiAodGFnID09PSAnSU5QVVQnICYmXG4gICAgICAgICFuYW1lc3BhY2UgJiZcbiAgICAgICAgcHJvcHMuaGFzT3duUHJvcGVydHkoJ3ZhbHVlJykgJiZcbiAgICAgICAgcHJvcHMudmFsdWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAhaXNIb29rKHByb3BzLnZhbHVlKVxuICAgICkge1xuICAgICAgICBwcm9wcy52YWx1ZSA9IHNvZnRTZXRIb29rKHByb3BzLnZhbHVlKTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1Qcm9wZXJ0aWVzKHByb3BzKTtcblxuICAgIGlmIChjaGlsZHJlbiAhPT0gdW5kZWZpbmVkICYmIGNoaWxkcmVuICE9PSBudWxsKSB7XG4gICAgICAgIGFkZENoaWxkKGNoaWxkcmVuLCBjaGlsZE5vZGVzLCB0YWcsIHByb3BzKTtcbiAgICB9XG5cblxuICAgIHJldHVybiBuZXcgVk5vZGUodGFnLCBwcm9wcywgY2hpbGROb2Rlcywga2V5LCBuYW1lc3BhY2UpO1xufVxuXG5mdW5jdGlvbiBhZGRDaGlsZChjLCBjaGlsZE5vZGVzLCB0YWcsIHByb3BzKSB7XG4gICAgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgICBjaGlsZE5vZGVzLnB1c2gobmV3IFZUZXh0KGMpKTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hpbGQoYykpIHtcbiAgICAgICAgY2hpbGROb2Rlcy5wdXNoKGMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZENoaWxkKGNbaV0sIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjID09PSBudWxsIHx8IGMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVW5leHBlY3RlZFZpcnR1YWxFbGVtZW50KHtcbiAgICAgICAgICAgIGZvcmVpZ25PYmplY3Q6IGMsXG4gICAgICAgICAgICBwYXJlbnRWbm9kZToge1xuICAgICAgICAgICAgICAgIHRhZ05hbWU6IHRhZyxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wc1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVByb3BlcnRpZXMocHJvcHMpIHtcbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG5cbiAgICAgICAgICAgIGlmIChpc0hvb2sodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wTmFtZS5zdWJzdHIoMCwgMykgPT09ICdldi0nKSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGV2LWZvbyBzdXBwb3J0XG4gICAgICAgICAgICAgICAgcHJvcHNbcHJvcE5hbWVdID0gZXZIb29rKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNDaGlsZCh4KSB7XG4gICAgcmV0dXJuIGlzVk5vZGUoeCkgfHwgaXNWVGV4dCh4KSB8fCBpc1dpZGdldCh4KSB8fCBpc1ZUaHVuayh4KTtcbn1cblxuZnVuY3Rpb24gaXNDaGlsZHJlbih4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJyB8fCBpc0FycmF5KHgpIHx8IGlzQ2hpbGQoeCk7XG59XG5cbmZ1bmN0aW9uIFVuZXhwZWN0ZWRWaXJ0dWFsRWxlbWVudChkYXRhKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuXG4gICAgZXJyLnR5cGUgPSAndmlydHVhbC1oeXBlcnNjcmlwdC51bmV4cGVjdGVkLnZpcnR1YWwtZWxlbWVudCc7XG4gICAgZXJyLm1lc3NhZ2UgPSAnVW5leHBlY3RlZCB2aXJ0dWFsIGNoaWxkIHBhc3NlZCB0byBoKCkuXFxuJyArXG4gICAgICAgICdFeHBlY3RlZCBhIFZOb2RlIC8gVnRodW5rIC8gVldpZGdldCAvIHN0cmluZyBidXQ6XFxuJyArXG4gICAgICAgICdnb3Q6XFxuJyArXG4gICAgICAgIGVycm9yU3RyaW5nKGRhdGEuZm9yZWlnbk9iamVjdCkgK1xuICAgICAgICAnLlxcbicgK1xuICAgICAgICAnVGhlIHBhcmVudCB2bm9kZSBpczpcXG4nICtcbiAgICAgICAgZXJyb3JTdHJpbmcoZGF0YS5wYXJlbnRWbm9kZSlcbiAgICAgICAgJ1xcbicgK1xuICAgICAgICAnU3VnZ2VzdGVkIGZpeDogY2hhbmdlIHlvdXIgYGgoLi4uLCBbIC4uLiBdKWAgY2FsbHNpdGUuJztcbiAgICBlcnIuZm9yZWlnbk9iamVjdCA9IGRhdGEuZm9yZWlnbk9iamVjdDtcbiAgICBlcnIucGFyZW50Vm5vZGUgPSBkYXRhLnBhcmVudFZub2RlO1xuXG4gICAgcmV0dXJuIGVycjtcbn1cblxuZnVuY3Rpb24gZXJyb3JTdHJpbmcob2JqKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaiwgbnVsbCwgJyAgICAnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcob2JqKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzcGxpdCA9IHJlcXVpcmUoJ2Jyb3dzZXItc3BsaXQnKTtcblxudmFyIGNsYXNzSWRTcGxpdCA9IC8oW1xcLiNdP1thLXpBLVowLTlfOi1dKykvO1xudmFyIG5vdENsYXNzSWQgPSAvXlxcLnwjLztcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVRhZztcblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnLCBwcm9wcykge1xuICAgIGlmICghdGFnKSB7XG4gICAgICAgIHJldHVybiAnRElWJztcbiAgICB9XG5cbiAgICB2YXIgbm9JZCA9ICEocHJvcHMuaGFzT3duUHJvcGVydHkoJ2lkJykpO1xuXG4gICAgdmFyIHRhZ1BhcnRzID0gc3BsaXQodGFnLCBjbGFzc0lkU3BsaXQpO1xuICAgIHZhciB0YWdOYW1lID0gbnVsbDtcblxuICAgIGlmIChub3RDbGFzc0lkLnRlc3QodGFnUGFydHNbMV0pKSB7XG4gICAgICAgIHRhZ05hbWUgPSAnRElWJztcbiAgICB9XG5cbiAgICB2YXIgY2xhc3NlcywgcGFydCwgdHlwZSwgaTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWdQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0ID0gdGFnUGFydHNbaV07XG5cbiAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHR5cGUgPSBwYXJ0LmNoYXJBdCgwKTtcblxuICAgICAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSBwYXJ0O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcuJykge1xuICAgICAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMgfHwgW107XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnIycgJiYgbm9JZCkge1xuICAgICAgICAgICAgcHJvcHMuaWQgPSBwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2xhc3Nlcykge1xuICAgICAgICBpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocHJvcHMuY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb3BzLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9wcy5uYW1lc3BhY2UgPyB0YWdOYW1lIDogdGFnTmFtZS50b1VwcGVyQ2FzZSgpO1xufVxuIiwidmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaGFuZGxlVGh1bmtcblxuZnVuY3Rpb24gaGFuZGxlVGh1bmsoYSwgYikge1xuICAgIHZhciByZW5kZXJlZEEgPSBhXG4gICAgdmFyIHJlbmRlcmVkQiA9IGJcblxuICAgIGlmIChpc1RodW5rKGIpKSB7XG4gICAgICAgIHJlbmRlcmVkQiA9IHJlbmRlclRodW5rKGIsIGEpXG4gICAgfVxuXG4gICAgaWYgKGlzVGh1bmsoYSkpIHtcbiAgICAgICAgcmVuZGVyZWRBID0gcmVuZGVyVGh1bmsoYSwgbnVsbClcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiByZW5kZXJlZEEsXG4gICAgICAgIGI6IHJlbmRlcmVkQlxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyVGh1bmsodGh1bmssIHByZXZpb3VzKSB7XG4gICAgdmFyIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZVxuXG4gICAgaWYgKCFyZW5kZXJlZFRodW5rKSB7XG4gICAgICAgIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZSA9IHRodW5rLnJlbmRlcihwcmV2aW91cylcbiAgICB9XG5cbiAgICBpZiAoIShpc1ZOb2RlKHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1ZUZXh0KHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1dpZGdldChyZW5kZXJlZFRodW5rKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGh1bmsgZGlkIG5vdCByZXR1cm4gYSB2YWxpZCBub2RlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZFRodW5rXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzVGh1bmtcclxuXHJcbmZ1bmN0aW9uIGlzVGh1bmsodCkge1xyXG4gICAgcmV0dXJuIHQgJiYgdC50eXBlID09PSBcIlRodW5rXCJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzSG9va1xuXG5mdW5jdGlvbiBpc0hvb2soaG9vaykge1xuICAgIHJldHVybiBob29rICYmXG4gICAgICAodHlwZW9mIGhvb2suaG9vayA9PT0gXCJmdW5jdGlvblwiICYmICFob29rLmhhc093blByb3BlcnR5KFwiaG9va1wiKSB8fFxuICAgICAgIHR5cGVvZiBob29rLnVuaG9vayA9PT0gXCJmdW5jdGlvblwiICYmICFob29rLmhhc093blByb3BlcnR5KFwidW5ob29rXCIpKVxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsTm9kZVxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxOb2RlKHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbE5vZGVcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbFRleHRcblxuZnVuY3Rpb24gaXNWaXJ0dWFsVGV4dCh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxUZXh0XCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzV2lkZ2V0XG5cbmZ1bmN0aW9uIGlzV2lkZ2V0KHcpIHtcbiAgICByZXR1cm4gdyAmJiB3LnR5cGUgPT09IFwiV2lkZ2V0XCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIxXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG52YXIgaXNWSG9vayA9IHJlcXVpcmUoXCIuL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbE5vZGVcblxudmFyIG5vUHJvcGVydGllcyA9IHt9XG52YXIgbm9DaGlsZHJlbiA9IFtdXG5cbmZ1bmN0aW9uIFZpcnR1YWxOb2RlKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuLCBrZXksIG5hbWVzcGFjZSkge1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWVcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzIHx8IG5vUHJvcGVydGllc1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbiB8fCBub0NoaWxkcmVuXG4gICAgdGhpcy5rZXkgPSBrZXkgIT0gbnVsbCA/IFN0cmluZyhrZXkpIDogdW5kZWZpbmVkXG4gICAgdGhpcy5uYW1lc3BhY2UgPSAodHlwZW9mIG5hbWVzcGFjZSA9PT0gXCJzdHJpbmdcIikgPyBuYW1lc3BhY2UgOiBudWxsXG5cbiAgICB2YXIgY291bnQgPSAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB8fCAwXG4gICAgdmFyIGRlc2NlbmRhbnRzID0gMFxuICAgIHZhciBoYXNXaWRnZXRzID0gZmFsc2VcbiAgICB2YXIgaGFzVGh1bmtzID0gZmFsc2VcbiAgICB2YXIgZGVzY2VuZGFudEhvb2tzID0gZmFsc2VcbiAgICB2YXIgaG9va3NcblxuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3Byb3BOYW1lXVxuICAgICAgICAgICAgaWYgKGlzVkhvb2socHJvcGVydHkpICYmIHByb3BlcnR5LnVuaG9vaykge1xuICAgICAgICAgICAgICAgIGlmICghaG9va3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaG9va3MgPSB7fVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhvb2tzW3Byb3BOYW1lXSA9IHByb3BlcnR5XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpKSB7XG4gICAgICAgICAgICBkZXNjZW5kYW50cyArPSBjaGlsZC5jb3VudCB8fCAwXG5cbiAgICAgICAgICAgIGlmICghaGFzV2lkZ2V0cyAmJiBjaGlsZC5oYXNXaWRnZXRzKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFoYXNUaHVua3MgJiYgY2hpbGQuaGFzVGh1bmtzKSB7XG4gICAgICAgICAgICAgICAgaGFzVGh1bmtzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlc2NlbmRhbnRIb29rcyAmJiAoY2hpbGQuaG9va3MgfHwgY2hpbGQuZGVzY2VuZGFudEhvb2tzKSkge1xuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRIb29rcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzV2lkZ2V0cyAmJiBpc1dpZGdldChjaGlsZCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzVGh1bmtzICYmIGlzVGh1bmsoY2hpbGQpKSB7XG4gICAgICAgICAgICBoYXNUaHVua3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGNvdW50ICsgZGVzY2VuZGFudHNcbiAgICB0aGlzLmhhc1dpZGdldHMgPSBoYXNXaWRnZXRzXG4gICAgdGhpcy5oYXNUaHVua3MgPSBoYXNUaHVua3NcbiAgICB0aGlzLmhvb2tzID0gaG9va3NcbiAgICB0aGlzLmRlc2NlbmRhbnRIb29rcyA9IGRlc2NlbmRhbnRIb29rc1xufVxuXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxOb2RlLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsTm9kZVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxuVmlydHVhbFBhdGNoLk5PTkUgPSAwXG5WaXJ0dWFsUGF0Y2guVlRFWFQgPSAxXG5WaXJ0dWFsUGF0Y2guVk5PREUgPSAyXG5WaXJ0dWFsUGF0Y2guV0lER0VUID0gM1xuVmlydHVhbFBhdGNoLlBST1BTID0gNFxuVmlydHVhbFBhdGNoLk9SREVSID0gNVxuVmlydHVhbFBhdGNoLklOU0VSVCA9IDZcblZpcnR1YWxQYXRjaC5SRU1PVkUgPSA3XG5WaXJ0dWFsUGF0Y2guVEhVTksgPSA4XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFBhdGNoXG5cbmZ1bmN0aW9uIFZpcnR1YWxQYXRjaCh0eXBlLCB2Tm9kZSwgcGF0Y2gpIHtcbiAgICB0aGlzLnR5cGUgPSBOdW1iZXIodHlwZSlcbiAgICB0aGlzLnZOb2RlID0gdk5vZGVcbiAgICB0aGlzLnBhdGNoID0gcGF0Y2hcbn1cblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsUGF0Y2hcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFRleHRcblxuZnVuY3Rpb24gVmlydHVhbFRleHQodGV4dCkge1xuICAgIHRoaXMudGV4dCA9IFN0cmluZyh0ZXh0KVxufVxuXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxUZXh0LnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsVGV4dFwiXG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG52YXIgaXNIb29rID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlByb3BzXG5cbmZ1bmN0aW9uIGRpZmZQcm9wcyhhLCBiKSB7XG4gICAgdmFyIGRpZmZcblxuICAgIGZvciAodmFyIGFLZXkgaW4gYSkge1xuICAgICAgICBpZiAoIShhS2V5IGluIGIpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IHVuZGVmaW5lZFxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFWYWx1ZSA9IGFbYUtleV1cbiAgICAgICAgdmFyIGJWYWx1ZSA9IGJbYUtleV1cblxuICAgICAgICBpZiAoYVZhbHVlID09PSBiVmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoYVZhbHVlKSAmJiBpc09iamVjdChiVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoZ2V0UHJvdG90eXBlKGJWYWx1ZSkgIT09IGdldFByb3RvdHlwZShhVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzSG9vayhiVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdERpZmYgPSBkaWZmUHJvcHMoYVZhbHVlLCBiVmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdERpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IG9iamVjdERpZmZcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgYktleSBpbiBiKSB7XG4gICAgICAgIGlmICghKGJLZXkgaW4gYSkpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2JLZXldID0gYltiS2V5XVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgfVxufVxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4uL3Zub2RlL3ZwYXRjaFwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy10aHVua1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2hhbmRsZS10aHVua1wiKVxuXG52YXIgZGlmZlByb3BzID0gcmVxdWlyZShcIi4vZGlmZi1wcm9wc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gICAgdmFyIHBhdGNoID0geyBhOiBhIH1cbiAgICB3YWxrKGEsIGIsIHBhdGNoLCAwKVxuICAgIHJldHVybiBwYXRjaFxufVxuXG5mdW5jdGlvbiB3YWxrKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBhcHBseSA9IHBhdGNoW2luZGV4XVxuICAgIHZhciBhcHBseUNsZWFyID0gZmFsc2VcblxuICAgIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGIgPT0gbnVsbCkge1xuXG4gICAgICAgIC8vIElmIGEgaXMgYSB3aWRnZXQgd2Ugd2lsbCBhZGQgYSByZW1vdmUgcGF0Y2ggZm9yIGl0XG4gICAgICAgIC8vIE90aGVyd2lzZSBhbnkgY2hpbGQgd2lkZ2V0cy9ob29rcyBtdXN0IGJlIGRlc3Ryb3llZC5cbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhZGRpbmcgdHdvIHJlbW92ZSBwYXRjaGVzIGZvciBhIHdpZGdldC5cbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgY2xlYXJTdGF0ZShhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICBhcHBseSA9IHBhdGNoW2luZGV4XVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBhLCBiKSlcbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUoYikpIHtcbiAgICAgICAgaWYgKGlzVk5vZGUoYSkpIHtcbiAgICAgICAgICAgIGlmIChhLnRhZ05hbWUgPT09IGIudGFnTmFtZSAmJlxuICAgICAgICAgICAgICAgIGEubmFtZXNwYWNlID09PSBiLm5hbWVzcGFjZSAmJlxuICAgICAgICAgICAgICAgIGEua2V5ID09PSBiLmtleSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wc1BhdGNoID0gZGlmZlByb3BzKGEucHJvcGVydGllcywgYi5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGlmIChwcm9wc1BhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgYSwgcHJvcHNQYXRjaCkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFwcGx5ID0gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dChiKSkge1xuICAgICAgICBpZiAoIWlzVlRleHQoYSkpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgIH0gZWxzZSBpZiAoYS50ZXh0ICE9PSBiLnRleHQpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5XSURHRVQsIGEsIGIpKVxuICAgIH1cblxuICAgIGlmIChhcHBseSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBseVxuICAgIH1cblxuICAgIGlmIChhcHBseUNsZWFyKSB7XG4gICAgICAgIGNsZWFyU3RhdGUoYSwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpIHtcbiAgICB2YXIgYUNoaWxkcmVuID0gYS5jaGlsZHJlblxuICAgIHZhciBiQ2hpbGRyZW4gPSByZW9yZGVyKGFDaGlsZHJlbiwgYi5jaGlsZHJlbilcblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IGFDaGlsZHJlbltpXVxuICAgICAgICB2YXIgcmlnaHROb2RlID0gYkNoaWxkcmVuW2ldXG4gICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICBpZiAoIWxlZnROb2RlKSB7XG4gICAgICAgICAgICBpZiAocmlnaHROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGIgbmVlZCB0byBiZSBhZGRlZFxuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLklOU0VSVCwgbnVsbCwgcmlnaHROb2RlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhbGsobGVmdE5vZGUsIHJpZ2h0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVk5vZGUobGVmdE5vZGUpICYmIGxlZnROb2RlLmNvdW50KSB7XG4gICAgICAgICAgICBpbmRleCArPSBsZWZ0Tm9kZS5jb3VudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJDaGlsZHJlbi5tb3Zlcykge1xuICAgICAgICAvLyBSZW9yZGVyIG5vZGVzIGxhc3RcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guT1JERVIsIGEsIGJDaGlsZHJlbi5tb3ZlcykpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5XG59XG5cbmZ1bmN0aW9uIGNsZWFyU3RhdGUodk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBhIHNpbmdsZSB3YWxrLCBub3QgdHdvXG4gICAgdW5ob29rKHZOb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleClcbn1cblxuLy8gUGF0Y2ggcmVjb3JkcyBmb3IgYWxsIGRlc3Ryb3llZCB3aWRnZXRzIG11c3QgYmUgYWRkZWQgYmVjYXVzZSB3ZSBuZWVkXG4vLyBhIERPTSBub2RlIHJlZmVyZW5jZSBmb3IgdGhlIGRlc3Ryb3kgZnVuY3Rpb25cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXRzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNXaWRnZXQodk5vZGUpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygdk5vZGUuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBlbmRQYXRjaChcbiAgICAgICAgICAgICAgICBwYXRjaFtpbmRleF0sXG4gICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCB2Tm9kZSwgbnVsbClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZSh2Tm9kZSkgJiYgKHZOb2RlLmhhc1dpZGdldHMgfHwgdk5vZGUuaGFzVGh1bmtzKSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsodk5vZGUpKSB7XG4gICAgICAgIHRodW5rcyh2Tm9kZSwgbnVsbCwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuLy8gQ3JlYXRlIGEgc3ViLXBhdGNoIGZvciB0aHVua3NcbmZ1bmN0aW9uIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICB2YXIgbm9kZXMgPSBoYW5kbGVUaHVuayhhLCBiKTtcbiAgICB2YXIgdGh1bmtQYXRjaCA9IGRpZmYobm9kZXMuYSwgbm9kZXMuYilcbiAgICBpZiAoaGFzUGF0Y2hlcyh0aHVua1BhdGNoKSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5USFVOSywgbnVsbCwgdGh1bmtQYXRjaClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1BhdGNoZXMocGF0Y2gpIHtcbiAgICBmb3IgKHZhciBpbmRleCBpbiBwYXRjaCkge1xuICAgICAgICBpZiAoaW5kZXggIT09IFwiYVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLy8gRXhlY3V0ZSBob29rcyB3aGVuIHR3byBub2RlcyBhcmUgaWRlbnRpY2FsXG5mdW5jdGlvbiB1bmhvb2sodk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1ZOb2RlKHZOb2RlKSkge1xuICAgICAgICBpZiAodk5vZGUuaG9va3MpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGVuZFBhdGNoKFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSxcbiAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFxuICAgICAgICAgICAgICAgICAgICBWUGF0Y2guUFJPUFMsXG4gICAgICAgICAgICAgICAgICAgIHZOb2RlLFxuICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWRLZXlzKHZOb2RlLmhvb2tzKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2Tm9kZS5kZXNjZW5kYW50SG9va3MgfHwgdk5vZGUuaGFzVGh1bmtzKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgdW5ob29rKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsodk5vZGUpKSB7XG4gICAgICAgIHRodW5rcyh2Tm9kZSwgbnVsbCwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdW5kZWZpbmVkS2V5cyhvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge31cblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB1bmRlZmluZWRcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIExpc3QgZGlmZiwgbmFpdmUgbGVmdCB0byByaWdodCByZW9yZGVyaW5nXG5mdW5jdGlvbiByZW9yZGVyKGFDaGlsZHJlbiwgYkNoaWxkcmVuKSB7XG5cbiAgICB2YXIgYktleXMgPSBrZXlJbmRleChiQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWJLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYUtleXMgPSBrZXlJbmRleChhQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWFLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYk1hdGNoID0ge30sIGFNYXRjaCA9IHt9XG5cbiAgICBmb3IgKHZhciBhS2V5IGluIGJLZXlzKSB7XG4gICAgICAgIGJNYXRjaFtiS2V5c1thS2V5XV0gPSBhS2V5c1thS2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGJLZXkgaW4gYUtleXMpIHtcbiAgICAgICAgYU1hdGNoW2FLZXlzW2JLZXldXSA9IGJLZXlzW2JLZXldXG4gICAgfVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cbiAgICB2YXIgc2h1ZmZsZSA9IFtdXG4gICAgdmFyIGZyZWVJbmRleCA9IDBcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbW92ZUluZGV4ID0gMFxuICAgIHZhciBtb3ZlcyA9IHt9XG4gICAgdmFyIHJlbW92ZXMgPSBtb3Zlcy5yZW1vdmVzID0ge31cbiAgICB2YXIgcmV2ZXJzZSA9IG1vdmVzLnJldmVyc2UgPSB7fVxuICAgIHZhciBoYXNNb3ZlcyA9IGZhbHNlXG5cbiAgICB3aGlsZSAoZnJlZUluZGV4IDwgbGVuKSB7XG4gICAgICAgIHZhciBtb3ZlID0gYU1hdGNoW2ldXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSBiQ2hpbGRyZW5bbW92ZV1cbiAgICAgICAgICAgIGlmIChtb3ZlICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBtb3Zlc1ttb3ZlXSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IG1vdmVcbiAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgIH0gZWxzZSBpZiAoaSBpbiBhTWF0Y2gpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHJlbW92ZXNbaV0gPSBtb3ZlSW5kZXgrK1xuICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoYk1hdGNoW2ZyZWVJbmRleF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJlZUNoaWxkID0gYkNoaWxkcmVuW2ZyZWVJbmRleF1cbiAgICAgICAgICAgICAgICBpZiAoZnJlZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNodWZmbGVbaV0gPSBmcmVlQ2hpbGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyZWVJbmRleCAhPT0gbW92ZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVzW2ZyZWVJbmRleF0gPSBtb3ZlSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IGZyZWVJbmRleFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaSsrXG4gICAgfVxuXG4gICAgaWYgKGhhc01vdmVzKSB7XG4gICAgICAgIHNodWZmbGUubW92ZXMgPSBtb3Zlc1xuICAgIH1cblxuICAgIHJldHVybiBzaHVmZmxlXG59XG5cbmZ1bmN0aW9uIGtleUluZGV4KGNoaWxkcmVuKSB7XG4gICAgdmFyIGksIGtleXNcblxuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuXG4gICAgICAgIGlmIChjaGlsZC5rZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAga2V5cyA9IGtleXMgfHwge31cbiAgICAgICAgICAgIGtleXNbY2hpbGQua2V5XSA9IGlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBrZXlzXG59XG5cbmZ1bmN0aW9uIGFwcGVuZFBhdGNoKGFwcGx5LCBwYXRjaCkge1xuICAgIGlmIChhcHBseSkge1xuICAgICAgICBpZiAoaXNBcnJheShhcHBseSkpIHtcbiAgICAgICAgICAgIGFwcGx5LnB1c2gocGF0Y2gpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IFthcHBseSwgcGF0Y2hdXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXBwbHlcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0Y2hcbiAgICB9XG59XG4iLCJ2YXIgaGlkZGVuU3RvcmUgPSByZXF1aXJlKCcuL2hpZGRlbi1zdG9yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVN0b3JlO1xuXG5mdW5jdGlvbiBjcmVhdGVTdG9yZSgpIHtcbiAgICB2YXIga2V5ID0ge307XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBpZiAoKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkgJiZcbiAgICAgICAgICAgIHR5cGVvZiBvYmogIT09ICdmdW5jdGlvbidcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlYWttYXAtc2hpbTogS2V5IG11c3QgYmUgb2JqZWN0JylcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdG9yZSA9IG9iai52YWx1ZU9mKGtleSk7XG4gICAgICAgIHJldHVybiBzdG9yZSAmJiBzdG9yZS5pZGVudGl0eSA9PT0ga2V5ID9cbiAgICAgICAgICAgIHN0b3JlIDogaGlkZGVuU3RvcmUob2JqLCBrZXkpO1xuICAgIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhpZGRlblN0b3JlO1xuXG5mdW5jdGlvbiBoaWRkZW5TdG9yZShvYmosIGtleSkge1xuICAgIHZhciBzdG9yZSA9IHsgaWRlbnRpdHk6IGtleSB9O1xuICAgIHZhciB2YWx1ZU9mID0gb2JqLnZhbHVlT2Y7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBcInZhbHVlT2ZcIiwge1xuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgIT09IGtleSA/XG4gICAgICAgICAgICAgICAgdmFsdWVPZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogc3RvcmU7XG4gICAgICAgIH0sXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3RvcmU7XG59XG4iLCJ2YXIgbmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVJc0FycmF5IHx8IGlzQXJyYXlcblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBleHRlbmQodGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBpdGVyYXRlTW9udGggPSByZXF1aXJlKCcuL2l0ZXJhdGUtbW9udGgnKTtcbnZhciBnZXREYXRlID0gcmVxdWlyZSgnLi4vZ2V0LWRhdGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxhc3RNb250aDogaXRlcmF0ZU1vbnRoKGdldERhdGUubGFzdCksXG4gIG5leHRNb250aDogaXRlcmF0ZU1vbnRoKGdldERhdGUubmV4dCksXG4gIHRvZ2dsZTogcmVxdWlyZSgnLi90b2dnbGUnKVxufTtcbiIsInZhciBoZyA9IHJlcXVpcmUoJ21lcmN1cnknKTtcbnZhciBnZW5lcmF0ZU1vbnRoID0gcmVxdWlyZSgnLi4vZ2VuZXJhdGUtbW9udGgnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpdGVyYXRlTW9udGhGYWN0b3J5KGl0ZXJhdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiBpdGVyYXRlTW9udGgoc3RhdGUpIHtcbiAgICB2YXIgZGF0ZSA9IGl0ZXJhdG9yKHN0YXRlLm1vZGVsLmRpc3BsYXllZE1vbnRoKCksIHN0YXRlLm1vZGVsLmRpc3BsYXllZFllYXIoKSk7XG4gICAgdmFyIHllYXIgPSBzdGF0ZS5tb2RlbC55ZWFyc1tkYXRlLnllYXJdIHx8IHt9O1xuXG4gICAgc3RhdGUubW9kZWwuZGlzcGxheWVkTW9udGguc2V0KGRhdGUubW9udGgpO1xuICAgIHN0YXRlLm1vZGVsLmRpc3BsYXllZFllYXIuc2V0KGRhdGUueWVhcik7XG5cbiAgICB2YXIgbW9udGggPSBnZW5lcmF0ZU1vbnRoKHtcbiAgICAgIGN1cnJlbnRNb250aDogc3RhdGUubW9kZWwuY3VycmVudE1vbnRoKCksXG4gICAgICBjdXJyZW50WWVhcjogc3RhdGUubW9kZWwuY3VycmVudFllYXIoKSxcbiAgICAgIGN1cnJlbnREYXk6IHN0YXRlLm1vZGVsLmN1cnJlbnREYXkoKSxcbiAgICAgIG1vbnRoOiBkYXRlLm1vbnRoLFxuICAgICAgeWVhcjogZGF0ZS55ZWFyLFxuICAgICAgZmlyc3REYXk6IHN0YXRlLm1vZGVsLnRyYW5zbGF0aW9uLmZpcnN0RGF5XG4gICAgfSk7XG5cbiAgICBzdGF0ZS5tb2RlbC55ZWFyc1tkYXRlLnllYXJdID0geWVhcjtcbiAgICBzdGF0ZS5tb2RlbC55ZWFyc1tkYXRlLnllYXJdW2RhdGUubW9udGhdID0gbW9udGg7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0b2dnbGUoc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5tb2RlbC5pc09wZW4oKSkge1xuICAgIHN0YXRlLm1vZGVsLmlzUG9wVXBUb3Auc2V0KHN0YXRlLm1vZGVsLmlzQnV0dG9uSW5Cb3R0b21IYWxmKCkpO1xuICB9XG5cbiAgc3RhdGUubW9kZWwuaXNPcGVuLnNldCghc3RhdGUubW9kZWwuaXNPcGVuKCkpO1xufTtcbiIsInZhciB0aW1lcyA9IHJlcXVpcmUoJ2xvZGFzaC50aW1lcycpO1xudmFyIG1vbnRoRGF5cyA9IHJlcXVpcmUoJ21vbnRoLWRheXMnKTtcbnZhciBnZXREYXRlID0gcmVxdWlyZSgnLi9nZXQtZGF0ZScpO1xudmFyIGdldEZpcnN0RGF5T2ZNb250aCA9IHJlcXVpcmUoJy4vZ2V0LWZpcnN0LWRheS1vZi1tb250aCcpO1xudmFyIG1vZHVsbyA9IHJlcXVpcmUoJy4vbW9kdWxvJyk7XG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVNb250aChhcmdzKSB7XG4gIHZhciBsYXN0RGF0ZSA9IGdldERhdGUubGFzdChhcmdzLm1vbnRoLCBhcmdzLnllYXIpO1xuXG4gIHZhciBudW1iZXJPZkRheXMgPSBtb250aERheXMoYXJncy5tb250aCwgYXJncy55ZWFyKTtcbiAgdmFyIG51bWJlck9mRGF5c0xhc3RNb250aCA9IG1vbnRoRGF5cyhsYXN0RGF0ZS5tb250aCwgbGFzdERhdGUueWVhcik7XG5cbiAgdmFyIGZpcnN0RGF5T2ZNb250aCA9IGdldEZpcnN0RGF5T2ZNb250aChhcmdzLm1vbnRoLCBhcmdzLnllYXIpO1xuXG4gIC8vIFJFQURNRTogZHVlIHRvIHdlaXJkIGZvcm1hdCBvZiB0cmFuc2xhdGlvbi5maXJzdERheS5cbiAgdmFyIGZpcnN0RGF5ID0gbW9kdWxvKGFyZ3MuZmlyc3REYXkgLSAxLCA3KTtcbiAgdmFyIG51bWJlck9mRGF5c1Nob3duRnJvbUxhc3RNb250aCA9IG1vZHVsbyg3ICsgZmlyc3REYXlPZk1vbnRoIC0gZmlyc3REYXksIDcpO1xuXG4gIHZhciBudW1iZXJPZkRheXNTaG93bkZyb21OZXh0TW9udGggPSBzZXR0aW5ncy5udW1iZXJPZkRheXNJbkNhbGVuZGFyIC1cbiAgICAobnVtYmVyT2ZEYXlzU2hvd25Gcm9tTGFzdE1vbnRoICsgbnVtYmVyT2ZEYXlzKTtcblxuICAvLyBGSVhNRTogYWxsIG9mIHRoZSBcImlzRGlzYWJsZWRcIiBhcmUgd3JvbmcuICB0aGV5IG5lZWQgdG8gYWNjb3VudCBmb3IgdGhlIGRpZmZlcmVuY2VcbiAgLy8gYmV0d2VlbiB0aGUgc2VsZWN0ZWQgZGF0ZSBhbmQgdGhlIGN1cnJlbnQgZGF0ZS4gc2VsZWN0ZWQgZGF0ZSBtYXkgYmUgaW4gYSBkaWZmZXJlbnQgbW9udGhcbiAgdmFyIGRheXNMYXN0TW9udGggPSB0aW1lcyhudW1iZXJPZkRheXNTaG93bkZyb21MYXN0TW9udGgsIGZ1bmN0aW9uIGJ1aWxkTGFzdE1vbnRoRGF5cyhkYXlJbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBkYXlPZk1vbnRoOiBudW1iZXJPZkRheXNMYXN0TW9udGggLSBudW1iZXJPZkRheXNTaG93bkZyb21MYXN0TW9udGggKyBkYXlJbmRleCArIDEsXG4gICAgICBpc0Rpc2FibGVkOiB0cnVlXG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGRheXNUaGlzTW9udGggPSB0aW1lcyhudW1iZXJPZkRheXMsIGZ1bmN0aW9uIGJ1aWxkRGF5cyhkYXlJbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBkYXlPZk1vbnRoOiBkYXlJbmRleCArIDEsXG4gICAgICBpc0Rpc2FibGVkOiBkYXlJbmRleCA8IGFyZ3MuY3VycmVudERheVxuICAgIH07XG4gIH0pO1xuXG4gIHZhciBkYXlzTmV4dE1vbnRoID0gdGltZXMobnVtYmVyT2ZEYXlzU2hvd25Gcm9tTmV4dE1vbnRoLCBmdW5jdGlvbiBidWlsZE5leHRNb250aERheXMoZGF5SW5kZXgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZGF5T2ZNb250aDogZGF5SW5kZXggKyAxLFxuICAgICAgaXNEaXNhYmxlZDogdHJ1ZVxuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgZGlzcGxheWVkRGF5czogZGF5c0xhc3RNb250aC5jb25jYXQoZGF5c1RoaXNNb250aCkuY29uY2F0KGRheXNOZXh0TW9udGgpXG4gIH07XG59O1xuIiwidmFyIG1vZHVsbyA9IHJlcXVpcmUoJy4vbW9kdWxvJyk7XG5cbmZ1bmN0aW9uIGxhc3QobW9udGgsIHllYXIpIHtcbiAgdmFyIGxhc3RNb250aCA9IG1vZHVsbyhtb250aCAtIDEsIDEyKTtcbiAgdmFyIGxhc3RZZWFyID0gbW9udGggPT09IDAgPyB5ZWFyIC0gMSA6IHllYXI7XG5cbiAgcmV0dXJuIHtcbiAgICBtb250aDogbGFzdE1vbnRoLFxuICAgIHllYXI6IGxhc3RZZWFyXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5leHQobW9udGgsIHllYXIpIHtcbiAgdmFyIG5leHRNb250aCA9IG1vZHVsbyhtb250aCArIDEsIDEyKTtcbiAgdmFyIG5leHRZZWFyID0gbW9udGggPT09IDExID8geWVhciArIDEgOiB5ZWFyO1xuXG4gIHJldHVybiB7XG4gICAgbW9udGg6IG5leHRNb250aCxcbiAgICB5ZWFyOiBuZXh0WWVhclxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbGFzdDogbGFzdCxcbiAgbmV4dDogbmV4dFxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0Rmlyc3REYXlPZk1vbnRoKG1vbnRoLCB5ZWFyKSB7XG4gIHJldHVybiBuZXcgRGF0ZSh5ZWFyICsgJy0nICsgKG1vbnRoICsgMSkgKyAnLTAxJykuZ2V0RGF5KCk7XG59O1xuIiwidmFyIHJlbmRlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2RhdGUtcGlja2VyJyk7XG52YXIgbW91bnQgPSByZXF1aXJlKCcuL21vdW50Jyk7XG52YXIgaW5pdGlhbGl6ZVN0YXRlID0gcmVxdWlyZSgnLi9pbml0aWFsaXplLXN0YXRlJyk7XG5cbnZhciBEYXRlUGlja2VyID0gaW5pdGlhbGl6ZVN0YXRlO1xuRGF0ZVBpY2tlci5yZW5kZXIgPSByZW5kZXI7XG5EYXRlUGlja2VyLm1vdW50ID0gbW91bnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0ZVBpY2tlcjtcbiIsInZhciBoZyA9IHJlcXVpcmUoJ21lcmN1cnknKTtcbnZhciB0cmFuc2xhdGlvbnMgPSByZXF1aXJlKCcuL3RyYW5zbGF0aW9ucycpO1xudmFyIGRhdGVGb3JtYXQgPSByZXF1aXJlKCdkYXRlZm9ybWF0Jyk7XG52YXIgeHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xudmFyIGNoYW5uZWxzID0gcmVxdWlyZSgnLi9jaGFubmVscycpO1xudmFyIGdlbmVyYXRlTW9udGggPSByZXF1aXJlKCcuL2dlbmVyYXRlLW1vbnRoJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5pdGlhbGl6ZVN0YXRlKG9wdHMpIHtcbiAgdmFyIGFyZ3MgPSBvcHRzIHx8IHt9O1xuICB2YXIgdHJhbnNsYXRpb24gPSB4dGVuZCh0cmFuc2xhdGlvbnNbJ2VuLVVTJ10sIHRyYW5zbGF0aW9uc1thcmdzLmxvY2FsZV0gfHwge30pO1xuICB2YXIgY3VycmVudERhdGUgPSBhcmdzLmN1cnJlbnREYXRlIHx8IG5ldyBEYXRlKCk7XG4gIHZhciBzZWxlY3RlZERhdGUgPSBhcmdzLnNlbGVjdGVkRGF0ZSB8fCBjdXJyZW50RGF0ZTtcblxuICB2YXIgc2VsZWN0ZWREYXkgPSBzZWxlY3RlZERhdGUuZ2V0RGF0ZSgpO1xuICB2YXIgc2VsZWN0ZWRNb250aCA9IHNlbGVjdGVkRGF0ZS5nZXRNb250aCgpO1xuICB2YXIgc2VsZWN0ZWRZZWFyID0gc2VsZWN0ZWREYXRlLmdldEZ1bGxZZWFyKCk7XG5cbiAgdmFyIGN1cnJlbnREYXkgPSBjdXJyZW50RGF0ZS5nZXREYXRlKCk7XG4gIHZhciBjdXJyZW50TW9udGggPSBjdXJyZW50RGF0ZS5nZXRNb250aCgpO1xuICB2YXIgY3VycmVudFllYXIgPSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xuXG4gIGRhdGVGb3JtYXQuaTE4biA9IHtcbiAgICBkYXlOYW1lczogdHJhbnNsYXRpb24ud2Vla2RheXNTaG9ydC5jb25jYXQodHJhbnNsYXRpb24ud2Vla2RheXNGdWxsKSxcbiAgICBtb250aE5hbWVzOiB0cmFuc2xhdGlvbi5tb250aHNTaG9ydC5jb25jYXQodHJhbnNsYXRpb24ubW9udGhzRnVsbClcbiAgfTtcblxuICB2YXIgeWVhcnMgPSB7fTtcbiAgdmFyIG1vbnRoID0gZ2VuZXJhdGVNb250aCh7XG4gICAgY3VycmVudERheTogY3VycmVudERheSxcbiAgICBjdXJyZW50TW9udGg6IGN1cnJlbnRNb250aCxcbiAgICBjdXJyZW50WWVhcjogY3VycmVudFllYXIsXG4gICAgZmlyc3REYXk6IHRyYW5zbGF0aW9uLmZpcnN0RGF5LFxuICAgIG1vbnRoOiBzZWxlY3RlZE1vbnRoLFxuICAgIHllYXI6IHNlbGVjdGVkWWVhclxuICB9KTtcblxuICB5ZWFyc1tzZWxlY3RlZFllYXJdID0ge307XG4gIHllYXJzW3NlbGVjdGVkWWVhcl1bc2VsZWN0ZWRNb250aF0gPSBtb250aDtcblxuICByZXR1cm4gaGcuc3RhdGUoe1xuICAgIGNoYW5uZWxzOiBjaGFubmVscyxcbiAgICBtb2RlbDogaGcuc3RydWN0KHtcbiAgICAgIGN1cnJlbnREYXk6IGhnLnZhbHVlKGN1cnJlbnREYXkpLFxuICAgICAgY3VycmVudE1vbnRoOiBoZy52YWx1ZShjdXJyZW50TW9udGgpLFxuICAgICAgY3VycmVudFllYXI6IGhnLnZhbHVlKGN1cnJlbnRZZWFyKSxcbiAgICAgIGRpc3BsYXllZE1vbnRoOiBoZy52YWx1ZShzZWxlY3RlZE1vbnRoKSxcbiAgICAgIGRpc3BsYXllZFllYXI6IGhnLnZhbHVlKHNlbGVjdGVkWWVhciksXG4gICAgICBoaWdobGlnaHRlZERheUluZGV4OiBoZy52YWx1ZShudWxsKSxcbiAgICAgIC8vIEZJWE1FOiBpbml0aWFsaXplIGZyb20gZWxlbWVudCBpZiBpdCBleGlzdHNcbiAgICAgIGlzQnV0dG9uSW5Cb3R0b21IYWxmOiBoZy52YWx1ZShmYWxzZSksXG4gICAgICBpc1BvcFVwVG9wOiBoZy52YWx1ZShmYWxzZSksXG4gICAgICBpc09wZW46IGhnLnZhbHVlKGZhbHNlKSxcbiAgICAgIHNlbGVjdGVkRGF5OiBoZy52YWx1ZShzZWxlY3RlZERheSksXG4gICAgICBzZWxlY3RlZE1vbnRoOiBoZy52YWx1ZShzZWxlY3RlZE1vbnRoKSxcbiAgICAgIHNlbGVjdGVkWWVhcjogaGcudmFsdWUoc2VsZWN0ZWRZZWFyKSxcbiAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvbixcbiAgICAgIHllYXJzOiB5ZWFyc1xuICAgIH0pXG4gIH0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbW9kdWxvKG4sIG0pIHtcbiAgcmV0dXJuICgobiAlIG0pICsgbSkgJSBtO1xufTtcbiIsInZhciBhcHAgPSByZXF1aXJlKCdtZXJjdXJ5JykuYXBwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1vdW50KGVsLCBvcHRzKSB7XG4gIGFwcChlbCwgdGhpcyhvcHRzKSwgdGhpcy5yZW5kZXIpO1xufTtcbiIsInZhciBoZyA9IHJlcXVpcmUoJ21lcmN1cnknKTtcbnZhciBkYXRlRm9ybWF0ID0gcmVxdWlyZSgnZGF0ZWZvcm1hdCcpO1xudmFyIHBvcFVwID0gcmVxdWlyZSgnLi9wb3AtdXAnKTtcblxudmFyIGggPSBoZy5oO1xuXG52YXIgc3R5bGVzID0ge1xuICBkYXRlUGlja2VyOiB7XG4gICAgdGV4dEFsaWduOiAnY2VudGVyJ1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRhdGVQaWNrZXIoc3RhdGUpIHtcbiAgdmFyIHNlbGVjdGVkRGF0ZSA9IG5ldyBEYXRlKFxuICAgIHN0YXRlLm1vZGVsLnNlbGVjdGVkWWVhcixcbiAgICBzdGF0ZS5tb2RlbC5zZWxlY3RlZE1vbnRoLFxuICAgIHN0YXRlLm1vZGVsLnNlbGVjdGVkRGF5XG4gICk7XG5cbiAgLy8gRklYTUU6IGFkZCBob29rIGZvciBsaXN0ZW5pbmcvdW5saXN0ZW5pbmcgZnJvbSB3aW5kb3cgc2Nyb2xsL3Jlc2l6ZSBldmVudHNcbiAgcmV0dXJuIGgoJ2RpdicsIHtcbiAgICBzdHlsZTogc3R5bGVzLmRhdGVQaWNrZXJcbiAgfSwgW1xuICAgIGgoJ2EnLCB7XG4gICAgICAnZXYtY2xpY2snOiBoZy5zZW5kKHN0YXRlLmNoYW5uZWxzLnRvZ2dsZSlcbiAgICB9LFxuICAgIGRhdGVGb3JtYXQoc2VsZWN0ZWREYXRlLCBzdGF0ZS5tb2RlbC50cmFuc2xhdGlvbi5mb3JtYXQpKSxcbiAgICBwb3BVcChzdGF0ZSlcbiAgXSk7XG59O1xuIiwidmFyIGhnID0gcmVxdWlyZSgnbWVyY3VyeScpO1xudmFyIGRhdGVGb3JtYXQgPSByZXF1aXJlKCdkYXRlZm9ybWF0Jyk7XG5cbnZhciBoID0gaGcuaDtcblxudmFyIHN0eWxlcyA9IHtcbiAgcG9wVXBIZWFkZXI6IHtcbiAgICB0ZXh0QWxpZ246ICdjZW50ZXInLFxuICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnXG4gIH0sXG4gIGxhc3RNb250aDoge1xuICAgIHdpZHRoOiAnMzBweCcsXG4gICAgaGVpZ2h0OiAnMzBweCcsXG4gICAgZmxvYXQ6ICdsZWZ0JyxcbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICdibGFjaydcbiAgfSxcbiAgbmV4dE1vbnRoOiB7XG4gICAgaGVpZ2h0OiAnMzBweCcsXG4gICAgd2lkdGg6ICczMHB4JyxcbiAgICBmbG9hdDogJ3JpZ2h0JyxcbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICdibGFjaydcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoZWFkZXIoc3RhdGUpIHtcbiAgdmFyIG1vbnRoID0gc3RhdGVcbiAgICAubW9kZWxcbiAgICAueWVhcnNbc3RhdGUubW9kZWwuZGlzcGxheWVkWWVhcl1bc3RhdGUubW9kZWwuZGlzcGxheWVkWWVhcl07XG5cbiAgdmFyIGRpc3BsYXllZERhdGUgPSBuZXcgRGF0ZShcbiAgICBzdGF0ZS5tb2RlbC5kaXNwbGF5ZWRZZWFyLFxuICAgIHN0YXRlLm1vZGVsLmRpc3BsYXllZE1vbnRoXG4gICk7XG5cbiAgdmFyIHRpdGxlID0gZGF0ZUZvcm1hdChkaXNwbGF5ZWREYXRlLCAnbW1tbSB5eXl5Jyk7XG5cbiAgcmV0dXJuIGgoJ2RpdicsIHtcbiAgICBzdHlsZTogc3R5bGVzLnBvcFVwSGVhZGVyXG4gIH0sIFtcbiAgICB0aXRsZSxcbiAgICBoKCdkaXYnLCB7XG4gICAgICBzdHlsZTogc3R5bGVzLmxhc3RNb250aCxcbiAgICAgICdldi1jbGljayc6IGhnLnNlbmQoc3RhdGUuY2hhbm5lbHMubGFzdE1vbnRoKVxuICAgIH0pLFxuICAgIGgoJ2RpdicsIHtcbiAgICAgIHN0eWxlOiBzdHlsZXMubmV4dE1vbnRoLFxuICAgICAgJ2V2LWNsaWNrJzogaGcuc2VuZChzdGF0ZS5jaGFubmVscy5uZXh0TW9udGgpXG4gICAgfSlcbiAgXSk7XG59O1xuIiwidmFyIGggPSByZXF1aXJlKCdtZXJjdXJ5JykuaDtcbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG52YXIgaGVhZGVyID0gcmVxdWlyZSgnLi9oZWFkZXInKTtcbnZhciB0YWJsZUhlYWQgPSByZXF1aXJlKCcuL3RhYmxlLWhlYWQnKTtcblxudmFyIHN0eWxlcyA9IHtcbiAgcG9wVXA6IHtcbiAgICBib3JkZXJSYWRpdXM6ICczcHgnLFxuICAgIGJveFNoYWRvdzogJzAgMCAwIDFweCByZ2JhKDAsMCwwLC4xKScsXG4gICAgYm94U2l6aW5nOiAnYm9yZGVyLWJveCcsXG4gICAgaGVpZ2h0OiAnMThlbScsXG4gICAgbGVmdDogJ2NhbGMoNTAlIC0gMTFyZW0pJyxcbiAgICBwYWRkaW5nOiAnMWVtJyxcbiAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAvLyBGSVhNRTogdXNlIGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL2F1dG9wcmVmaXhcbiAgICB0cmFuc2l0aW9uOiAndHJhbnNmb3JtIDAuMTVzIGVhc2Utb3V0LCBvcGFjaXR5IDAuMTVzIGVhc2Utb3V0LCBwb3NpdGlvbiAwLjE1cyBlYXNlLW91dCwgaGVpZ2h0IDBzIDAuMTVzJyxcbiAgICB3aWR0aDogJzIyZW0nXG4gIH0sXG4gIHRhYmxlOiB7XG4gICAgYm9yZGVyQ29sbGFwc2U6ICdjb2xsYXBzZScsXG4gICAgYm9yZGVyU3BhY2luZzogMCxcbiAgICBib3hTaXppbmc6ICdib3JkZXItYm94JyxcbiAgICBmb250U2l6ZTogJ2luaGVyaXQnLFxuICAgIG1hcmdpblRvcDogJzFyZW0nLFxuICAgIHRhYmxlTGF5b3V0OiAnZml4ZWQnLFxuICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXG4gICAgd2lkdGg6ICcxMDAlJ1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBvcFVwKHN0YXRlKSB7XG4gIHZhciBwb3BVcFN0eWxlID0geHRlbmQoc3R5bGVzLnBvcFVwKTtcblxuICBpZiAoc3RhdGUubW9kZWwuaXNQb3BVcFRvcCkge1xuICAgIHBvcFVwU3R5bGUudG9wID0gICctJyArIHN0eWxlcy5wb3BVcC5oZWlnaHQ7XG4gIH1cblxuICB2YXIgdHJhbnNsYXRlWTtcbiAgaWYgKCFzdGF0ZS5tb2RlbC5pc09wZW4pIHtcbiAgICBwb3BVcFN0eWxlLm9wYWNpdHkgPSAwO1xuICAgIHBvcFVwU3R5bGUuekluZGV4ID0gLTIwMDA7XG5cbiAgICB0cmFuc2xhdGVZID0gc3RhdGUubW9kZWwuaXNQb3BVcFRvcCA/IDEgOiAtMTtcbiAgfSBlbHNlIHtcbiAgICB0cmFuc2xhdGVZID0gMDtcbiAgfVxuXG4gIHBvcFVwU3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVkoJyArIHRyYW5zbGF0ZVkgKyAnZW0pIHBlcnNwZWN0aXZlKDYwMHB4KSByb3RhdGVYKDApJztcblxuICByZXR1cm4gaCgnZGl2Jywge1xuICAgIHN0eWxlOiBwb3BVcFN0eWxlXG4gIH0sIFtcbiAgICBoZWFkZXIoc3RhdGUpLFxuICAgIGgoJ3RhYmxlJywge1xuICAgICAgc3R5bGU6IHN0eWxlcy50YWJsZVxuICAgIH0sIFtcbiAgICAgIHRhYmxlSGVhZChzdGF0ZSlcbiAgICAgIC8vIHRhYmxlQm9keShzdGF0ZSlcbiAgICBdKVxuICBdKTtcbn07XG4iLCJ2YXIgaCA9IHJlcXVpcmUoJ21lcmN1cnknKS5oO1xudmFyIG1vZHVsbyA9IHJlcXVpcmUoJy4uL21vZHVsbycpO1xuXG52YXIgc3R5bGVzID0ge1xuICByb3c6IHtcbiAgICBoZWlnaHQ6ICcyZW0nXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGFibGVIZWFkKHN0YXRlKSB7XG4gIHZhciBmaXJzdERheSA9IHN0YXRlLm1vZGVsLnRyYW5zbGF0aW9uLmZpcnN0RGF5O1xuXG4gIHZhciBkYXlUaHMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gZmlyc3REYXk7IGkgPCBmaXJzdERheSArIDc7IGkrKykge1xuICAgIHZhciB3ZWVrZGF5ID0gc3RhdGUubW9kZWwudHJhbnNsYXRpb24ud2Vla2RheXNTaG9ydFttb2R1bG8oaSwgNyldO1xuICAgIHZhciB0aCA9IGgoJ3RoJywgd2Vla2RheSk7XG4gICAgZGF5VGhzLnB1c2godGgpO1xuICB9XG5cbiAgcmV0dXJuIGgoJ3RoZWFkJywgaCgndHInLCB7IHN0eWxlOiBzdHlsZXMucm93IH0sIGRheVRocykpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJudW1iZXJPZlJvd3NJbkNhbGVuZGFyXCI6IDYsXG4gIFwibnVtYmVyT2ZEYXlzSW5DYWxlbmRhclwiOiA0MlxufVxuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcItGP0L3Rg9Cw0YDQuFwiLFwi0YTQtdCy0YDRg9Cw0YDQuFwiLFwi0LzQsNGA0YJcIixcItCw0L/RgNC40LtcIixcItC80LDQuVwiLFwi0Y7QvdC4XCIsXCLRjtC70LhcIixcItCw0LLQs9GD0YHRglwiLFwi0YHQtdC/0YLQtdC80LLRgNC4XCIsXCLQvtC60YLQvtC80LLRgNC4XCIsXCLQvdC+0LXQvNCy0YDQuFwiLFwi0LTQtdC60LXQvNCy0YDQuFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi0Y/QvdGAXCIsXCLRhNC10LJcIixcItC80LDRgFwiLFwi0LDQv9GAXCIsXCLQvNCw0LlcIixcItGO0L3QuFwiLFwi0Y7Qu9C4XCIsXCLQsNCy0LNcIixcItGB0LXQv1wiLFwi0L7QutGCXCIsXCLQvdC+0LVcIixcItC00LXQulwiXSxcIndlZWtkYXlzRnVsbFwiOltcItC90LXQtNC10LvRj1wiLFwi0L/QvtC90LXQtNC10LvQvdC40LpcIixcItCy0YLQvtGA0L3QuNC6XCIsXCLRgdGA0Y/QtNCwXCIsXCLRh9C10YLQstGK0YDRgtGK0LpcIixcItC/0LXRgtGK0LpcIixcItGB0YrQsdC+0YLQsFwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLQvdC0XCIsXCLQv9C9XCIsXCLQstGCXCIsXCLRgdGAXCIsXCLRh9GCXCIsXCLQv9GCXCIsXCLRgdCxXCJdLFwidG9kYXlcIjpcItC00L3QtdGBXCIsXCJjbGVhclwiOlwi0LjQt9GC0YDQuNCy0LDQvFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbW0geXl5eSDQsy5cIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51YXJcIixcImZlYnJ1YXJcIixcIm1hcnRcIixcImFwcmlsXCIsXCJtYWpcIixcImp1bmlcIixcImp1bGlcIixcImF1Z3VzdFwiLFwic2VwdGVtYmFyXCIsXCJva3RvYmFyXCIsXCJub3ZlbWJhclwiLFwiZGVjZW1iYXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFqXCIsXCJqdW5cIixcImp1bFwiLFwiYXVnXCIsXCJzZXBcIixcIm9rdFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJuZWRqZWxqYVwiLFwicG9uZWRqZWxqYWtcIixcInV0b3Jha1wiLFwic3JpamVkYVwiLFwiY2V0dnJ0YWtcIixcInBldGFrXCIsXCJzdWJvdGFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wibmVcIixcInBvXCIsXCJ1dFwiLFwic3JcIixcIsSNZVwiLFwicGVcIixcInN1XCJdLFwidG9kYXlcIjpcImRhbmFzXCIsXCJjbGVhclwiOlwiaXpicmlzYXRpXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkLiBtbW1tIHl5eXkuXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiR2VuZXJcIixcIkZlYnJlclwiLFwiTWFyw6dcIixcIkFicmlsXCIsXCJNYWlnXCIsXCJqdW55XCIsXCJKdWxpb2xcIixcIkFnb3N0XCIsXCJTZXRlbWJyZVwiLFwiT2N0dWJyZVwiLFwiTm92ZW1icmVcIixcIkRlc2VtYnJlXCJdLFwibW9udGhzU2hvcnRcIjpbXCJHZW5cIixcIkZlYlwiLFwiTWFyXCIsXCJBYnJcIixcIk1haVwiLFwiSnVuXCIsXCJKdWxcIixcIkFnb1wiLFwiU2V0XCIsXCJPY3RcIixcIk5vdlwiLFwiRGVzXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiZGl1bWVuZ2VcIixcImRpbGx1bnNcIixcImRpbWFydHNcIixcImRpbWVjcmVzXCIsXCJkaWpvdXNcIixcImRpdmVuZHJlc1wiLFwiZGlzc2FidGVcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiZGl1XCIsXCJkaWxcIixcImRpbVwiLFwiZG1jXCIsXCJkaWpcIixcImRpdlwiLFwiZGlzXCJdLFwidG9kYXlcIjpcImF2dWlcIixcImNsZWFyXCI6XCJlc2JvcnJhclwiLFwiY2xvc2VcIjpcInRhbmNhclwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZGRkIGQgIWRlIG1tbW0gIWRlIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJsZWRlblwiLFwiw7pub3JcIixcImLFmWV6ZW5cIixcImR1YmVuXCIsXCJrdsSbdGVuXCIsXCLEjWVydmVuXCIsXCLEjWVydmVuZWNcIixcInNycGVuXCIsXCJ6w6HFmcOtXCIsXCLFmcOtamVuXCIsXCJsaXN0b3BhZFwiLFwicHJvc2luZWNcIl0sXCJtb250aHNTaG9ydFwiOltcImxlZFwiLFwiw7pub1wiLFwiYsWZZVwiLFwiZHViXCIsXCJrdsSbXCIsXCLEjWVyXCIsXCLEjXZjXCIsXCJzcnBcIixcInrDocWZXCIsXCLFmcOtalwiLFwibGlzXCIsXCJwcm9cIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJuZWTEm2xlXCIsXCJwb25kxJtsw61cIixcIsO6dGVyw71cIixcInN0xZllZGFcIixcIsSNdHZydGVrXCIsXCJww6F0ZWtcIixcInNvYm90YVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJuZVwiLFwicG9cIixcIsO6dFwiLFwic3RcIixcIsSNdFwiLFwicMOhXCIsXCJzb1wiXSxcInRvZGF5XCI6XCJkbmVzXCIsXCJjbGVhclwiOlwidnltYXphdFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLiBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51YXJcIixcImZlYnJ1YXJcIixcIm1hcnRzXCIsXCJhcHJpbFwiLFwibWFqXCIsXCJqdW5pXCIsXCJqdWxpXCIsXCJhdWd1c3RcIixcInNlcHRlbWJlclwiLFwib2t0b2JlclwiLFwibm92ZW1iZXJcIixcImRlY2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJqYW5cIixcImZlYlwiLFwibWFyXCIsXCJhcHJcIixcIm1halwiLFwianVuXCIsXCJqdWxcIixcImF1Z1wiLFwic2VwXCIsXCJva3RcIixcIm5vdlwiLFwiZGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wic8O4bmRhZ1wiLFwibWFuZGFnXCIsXCJ0aXJzZGFnXCIsXCJvbnNkYWdcIixcInRvcnNkYWdcIixcImZyZWRhZ1wiLFwibMO4cmRhZ1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJzw7huXCIsXCJtYW5cIixcInRpclwiLFwib25zXCIsXCJ0b3JcIixcImZyZVwiLFwibMO4clwiXSxcInRvZGF5XCI6XCJpIGRhZ1wiLFwiY2xlYXJcIjpcInNsZXRcIixcImNsb3NlXCI6XCJsdWtcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZC4gbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiSmFudWFyXCIsXCJGZWJydWFyXCIsXCJNw6RyelwiLFwiQXByaWxcIixcIk1haVwiLFwiSnVuaVwiLFwiSnVsaVwiLFwiQXVndXN0XCIsXCJTZXB0ZW1iZXJcIixcIk9rdG9iZXJcIixcIk5vdmVtYmVyXCIsXCJEZXplbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiSmFuXCIsXCJGZWJcIixcIk3DpHJcIixcIkFwclwiLFwiTWFpXCIsXCJKdW5cIixcIkp1bFwiLFwiQXVnXCIsXCJTZXBcIixcIk9rdFwiLFwiTm92XCIsXCJEZXpcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJTb25udGFnXCIsXCJNb250YWdcIixcIkRpZW5zdGFnXCIsXCJNaXR0d29jaFwiLFwiRG9ubmVyc3RhZ1wiLFwiRnJlaXRhZ1wiLFwiU2Ftc3RhZ1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJTb1wiLFwiTW9cIixcIkRpXCIsXCJNaVwiLFwiRG9cIixcIkZyXCIsXCJTYVwiXSxcInRvZGF5XCI6XCJIZXV0ZVwiLFwiY2xlYXJcIjpcIkzDtnNjaGVuXCIsXCJjbG9zZVwiOlwiU2NobGllw59lblwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLOmc6xzr3Ov8+FzqzPgc65zr/PglwiLFwizqbOtc6yz4HOv8+FzqzPgc65zr/PglwiLFwizpzOrM+Bz4TOuc6/z4JcIixcIs6Rz4DPgc6vzrvOuc6/z4JcIixcIs6czqzOuc6/z4JcIixcIs6Zzr/Pjc69zrnOv8+CXCIsXCLOmc6/z43Ou865zr/PglwiLFwizpHPjc6zzr/Phc+Dz4TOv8+CXCIsXCLOo861z4DPhM6tzrzOss+BzrnOv8+CXCIsXCLOn866z4TPjs6yz4HOuc6/z4JcIixcIs6dzr/Orc68zrLPgc65zr/PglwiLFwizpTOtc66zq3OvM6yz4HOuc6/z4JcIl0sXCJtb250aHNTaG9ydFwiOltcIs6ZzrHOvVwiLFwizqbOtc6yXCIsXCLOnM6xz4FcIixcIs6Rz4DPgVwiLFwizpzOsc65XCIsXCLOmc6/z4XOvVwiLFwizpnOv8+FzrtcIixcIs6Rz4XOs1wiLFwizqPOtc+AXCIsXCLOn866z4RcIixcIs6dzr/OtVwiLFwizpTOtc66XCJdLFwid2Vla2RheXNGdWxsXCI6W1wizprPhc+BzrnOsc66zq5cIixcIs6UzrXPhc+Ezq3Pgc6xXCIsXCLOpM+Bzq/PhM63XCIsXCLOpM61z4TOrM+Bz4TOt1wiLFwizqDOrc68z4DPhM63XCIsXCLOoM6xz4HOsc+DzrrOtc+Fzq5cIixcIs6jzqzOss6yzrHPhM6/XCJdLFwid2Vla2RheXNTaG9ydFwiOltcIs6az4XPgVwiLFwizpTOtc+FXCIsXCLOpM+BzrlcIixcIs6kzrXPhFwiLFwizqDOtc68XCIsXCLOoM6xz4FcIixcIs6jzrHOslwiXSxcInRvZGF5XCI6XCLPg86uzrzOtc+BzrFcIixcImNsZWFyXCI6XCLOlM65zrHOs8+BzrHPhs6uXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiSmFudWFyeVwiLFwiRmVicnVhcnlcIixcIk1hcmNoXCIsXCJBcHJpbFwiLFwiTWF5XCIsXCJKdW5lXCIsXCJKdWx5XCIsXCJBdWd1c3RcIixcIlNlcHRlbWJlclwiLFwiT2N0b2JlclwiLFwiTm92ZW1iZXJcIixcIkRlY2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJKYW5cIixcIkZlYlwiLFwiTWFyXCIsXCJBcHJcIixcIk1heVwiLFwiSnVuXCIsXCJKdWxcIixcIkF1Z1wiLFwiU2VwXCIsXCJPY3RcIixcIk5vdlwiLFwiRGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiU3VuZGF5XCIsXCJNb25kYXlcIixcIlR1ZXNkYXlcIixcIldlZG5lc2RheVwiLFwiVGh1cnNkYXlcIixcIkZyaWRheVwiLFwiU2F0dXJkYXlcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiU3VuXCIsXCJNb25cIixcIlR1ZVwiLFwiV2VkXCIsXCJUaHVcIixcIkZyaVwiLFwiU2F0XCJdLFwiZmlyc3REYXlcIjogMCwgXCJmb3JtYXRcIjpcIm1tbSBkLCB5eXl5XCJ9XG4iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiZW5lcm9cIixcImZlYnJlcm9cIixcIm1hcnpvXCIsXCJhYnJpbFwiLFwibWF5b1wiLFwianVuaW9cIixcImp1bGlvXCIsXCJhZ29zdG9cIixcInNlcHRpZW1icmVcIixcIm9jdHVicmVcIixcIm5vdmllbWJyZVwiLFwiZGljaWVtYnJlXCJdLFwibW9udGhzU2hvcnRcIjpbXCJlbmVcIixcImZlYlwiLFwibWFyXCIsXCJhYnJcIixcIm1heVwiLFwianVuXCIsXCJqdWxcIixcImFnb1wiLFwic2VwXCIsXCJvY3RcIixcIm5vdlwiLFwiZGljXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiZG9taW5nb1wiLFwibHVuZXNcIixcIm1hcnRlc1wiLFwibWnDqXJjb2xlc1wiLFwianVldmVzXCIsXCJ2aWVybmVzXCIsXCJzw6FiYWRvXCJdLFwid2Vla2RheXNTaG9ydFwiOltcImRvbVwiLFwibHVuXCIsXCJtYXJcIixcIm1pw6lcIixcImp1ZVwiLFwidmllXCIsXCJzw6FiXCJdLFwidG9kYXlcIjpcImhveVwiLFwiY2xlYXJcIjpcImJvcnJhclwiLFwiY2xvc2VcIjpcImNlcnJhclwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYWFudWFyXCIsXCJ2ZWVicnVhclwiLFwibcOkcnRzXCIsXCJhcHJpbGxcIixcIm1haVwiLFwianV1bmlcIixcImp1dWxpXCIsXCJhdWd1c3RcIixcInNlcHRlbWJlclwiLFwib2t0b29iZXJcIixcIm5vdmVtYmVyXCIsXCJkZXRzZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphYW5cIixcInZlZWJyXCIsXCJtw6RydHNcIixcImFwclwiLFwibWFpXCIsXCJqdXVuaVwiLFwianV1bGlcIixcImF1Z1wiLFwic2VwdFwiLFwib2t0XCIsXCJub3ZcIixcImRldHNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJww7xoYXDDpGV2XCIsXCJlc21hc3DDpGV2XCIsXCJ0ZWlzaXDDpGV2XCIsXCJrb2xtYXDDpGV2XCIsXCJuZWxqYXDDpGV2XCIsXCJyZWVkZVwiLFwibGF1cMOkZXZcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wicMO8aFwiLFwiZXNtXCIsXCJ0ZWlcIixcImtvbFwiLFwibmVsXCIsXCJyZWVcIixcImxhdVwiXSxcInRvZGF5XCI6XCJ0w6RuYVwiLFwiY2xlYXJcIjpcImt1c3R1dGFtYVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLiBtbW1tIHl5eXkuIGFcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJ1cnRhcnJpbGFcIixcIm90c2FpbGFcIixcIm1hcnR4b2FcIixcImFwaXJpbGFcIixcIm1haWF0emFcIixcImVrYWluYVwiLFwidXp0YWlsYVwiLFwiYWJ1enR1YVwiLFwiaXJhaWxhXCIsXCJ1cnJpYVwiLFwiYXphcm9hXCIsXCJhYmVuZHVhXCJdLFwibW9udGhzU2hvcnRcIjpbXCJ1cnRcIixcIm90c1wiLFwibWFyXCIsXCJhcGlcIixcIm1haVwiLFwiZWthXCIsXCJ1enRcIixcImFidVwiLFwiaXJhXCIsXCJ1cnJcIixcImF6YVwiLFwiYWJlXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiaWdhbmRlYVwiLFwiYXN0ZWxlaGVuYVwiLFwiYXN0ZWFydGVhXCIsXCJhc3RlYXprZW5hXCIsXCJvc3RlZ3VuYVwiLFwib3N0aXJhbGFcIixcImxhcnVuYmF0YVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJpZy5cIixcImFsLlwiLFwiYXIuXCIsXCJhei5cIixcIm9nLlwiLFwib3IuXCIsXCJsci5cIl0sXCJ0b2RheVwiOlwiZ2F1clwiLFwiY2xlYXJcIjpcImdhcmJpdHVcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGRkZCwgeXl5eShlKWtvIG1tbW1yZW4gZGFcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLamNin2YbZiNuM2YdcIixcItmB2YjYsduM2YdcIixcItmF2KfYsdizXCIsXCLYotmI2LHbjNmEXCIsXCLZhdmHXCIsXCLamNmI2KbZhlwiLFwi2pjZiNim24zZh1wiLFwi2KfZiNiqXCIsXCLYs9m+2KrYp9mF2KjYsVwiLFwi2Kfaqdiq2KjYsVwiLFwi2YbZiNin2YXYqNixXCIsXCLYr9iz2KfZhdio2LFcIl0sXCJtb250aHNTaG9ydFwiOltcItqY2KfZhtmI24zZh1wiLFwi2YHZiNix24zZh1wiLFwi2YXYp9ix2LNcIixcItii2YjYsduM2YRcIixcItmF2YdcIixcItqY2YjYptmGXCIsXCLamNmI2KbbjNmHXCIsXCLYp9mI2KpcIixcItiz2b7Yqtin2YXYqNixXCIsXCLYp9qp2KrYqNixXCIsXCLZhtmI2KfZhdio2LFcIixcItiv2LPYp9mF2KjYsVwiXSxcIndlZWtkYXlzRnVsbFwiOltcItuM2qnYtNmG2KjZh1wiLFwi2K/ZiNi02YbYqNmHXCIsXCLYs9mHINi02YbYqNmHXCIsXCLahtmH2KfYsdi02YbYqNmHXCIsXCLZvtmG2KzYtNmG2KjZh1wiLFwi2KzZhdi52YdcIixcIti02YbYqNmHXCJdLFwid2Vla2RheXNTaG9ydFwiOltcItuM2qnYtNmG2KjZh1wiLFwi2K/ZiNi02YbYqNmHXCIsXCLYs9mHINi02YbYqNmHXCIsXCLahtmH2KfYsdi02YbYqNmHXCIsXCLZvtmG2KzYtNmG2KjZh1wiLFwi2KzZhdi52YdcIixcIti02YbYqNmHXCJdLFwidG9kYXlcIjpcItin2YXYsdmI2LJcIixcImNsZWFyXCI6XCLZvtin2qkg2qnYsdiv2YZcIixcImNsb3NlXCI6XCLYqNiz2KrZhlwiLFwiZm9ybWF0XCI6XCJ5eXl5IG1tbW0gZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwiLFwibGFiZWxNb250aE5leHRcIjpcItmF2KfZhyDYqNi52K/bjFwiLFwibGFiZWxNb250aFByZXZcIjpcItmF2KfZhyDZgtio2YTbjFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJ0YW1taWt1dVwiLFwiaGVsbWlrdXVcIixcIm1hYWxpc2t1dVwiLFwiaHVodGlrdXVcIixcInRvdWtva3V1XCIsXCJrZXPDpGt1dVwiLFwiaGVpbsOka3V1XCIsXCJlbG9rdXVcIixcInN5eXNrdXVcIixcImxva2FrdXVcIixcIm1hcnJhc2t1dVwiLFwiam91bHVrdXVcIl0sXCJtb250aHNTaG9ydFwiOltcInRhbW1pXCIsXCJoZWxtaVwiLFwibWFhbGlzXCIsXCJodWh0aVwiLFwidG91a29cIixcImtlc8OkXCIsXCJoZWluw6RcIixcImVsb1wiLFwic3l5c1wiLFwibG9rYVwiLFwibWFycmFzXCIsXCJqb3VsdVwiXSxcIndlZWtkYXlzRnVsbFwiOltcInN1bm51bnRhaVwiLFwibWFhbmFudGFpXCIsXCJ0aWlzdGFpXCIsXCJrZXNraXZpaWtrb1wiLFwidG9yc3RhaVwiLFwicGVyamFudGFpXCIsXCJsYXVhbnRhaVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJzdVwiLFwibWFcIixcInRpXCIsXCJrZVwiLFwidG9cIixcInBlXCIsXCJsYVwiXSxcInRvZGF5XCI6XCJ0w6Ruw6TDpG5cIixcImNsZWFyXCI6XCJ0eWhqZW5uw6RcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZC5tLnl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW52aWVyXCIsXCJGw6l2cmllclwiLFwiTWFyc1wiLFwiQXZyaWxcIixcIk1haVwiLFwiSnVpblwiLFwiSnVpbGxldFwiLFwiQW/Du3RcIixcIlNlcHRlbWJyZVwiLFwiT2N0b2JyZVwiLFwiTm92ZW1icmVcIixcIkTDqWNlbWJyZVwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiSmFuXCIsXCJGZXZcIixcIk1hclwiLFwiQXZyXCIsXCJNYWlcIixcIkp1aW5cIixcIkp1aWxcIixcIkFvdVwiLFwiU2VwXCIsXCJPY3RcIixcIk5vdlwiLFwiRGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiRGltYW5jaGVcIixcIkx1bmRpXCIsXCJNYXJkaVwiLFwiTWVyY3JlZGlcIixcIkpldWRpXCIsXCJWZW5kcmVkaVwiLFwiU2FtZWRpXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIkRpbVwiLFwiTHVuXCIsXCJNYXJcIixcIk1lclwiLFwiSmV1XCIsXCJWZW5cIixcIlNhbVwiXSxcInRvZGF5XCI6XCJBdWpvdXJkJ2h1aVwiLFwiY2xlYXJcIjpcIkVmZmFjZXJcIixcImNsb3NlXCI6XCJGZXJtZXJcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZCBtbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCIsXCJsYWJlbE1vbnRoTmV4dFwiOlwiTW9pcyBzdWl2YW50XCIsXCJsYWJlbE1vbnRoUHJldlwiOlwiTW9pcyBwcsOpY8OpZGVudFwiLFwibGFiZWxNb250aFNlbGVjdFwiOlwiU8OpbGVjdGlvbm5lciB1biBtb2lzXCIsXCJsYWJlbFllYXJTZWxlY3RcIjpcIlPDqWxlY3Rpb25uZXIgdW5lIGFubsOpZVwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIlhhbmVpcm9cIixcIkZlYnJlaXJvXCIsXCJNYXJ6b1wiLFwiQWJyaWxcIixcIk1haW9cIixcIlh1w7FvXCIsXCJYdWxsb1wiLFwiQWdvc3RvXCIsXCJTZXRlbWJyb1wiLFwiT3V0dWJyb1wiLFwiTm92ZW1icm9cIixcIkRlY2VtYnJvXCJdLFwibW9udGhzU2hvcnRcIjpbXCJ4YW5cIixcImZlYlwiLFwibWFyXCIsXCJhYnJcIixcIm1haVwiLFwieHVuXCIsXCJ4dWxcIixcImFnb1wiLFwic2VwXCIsXCJvdXRcIixcIm5vdlwiLFwiZGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiZG9taW5nb1wiLFwibHVuc1wiLFwibWFydGVzXCIsXCJtw6lyY29yZXNcIixcInhvdmVzXCIsXCJ2ZW5yZXNcIixcInPDoWJhZG9cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiZG9tXCIsXCJsdW5cIixcIm1hclwiLFwibcOpclwiLFwieG92XCIsXCJ2ZW5cIixcInNhYlwiXSxcInRvZGF5XCI6XCJob3hlXCIsXCJjbGVhclwiOlwiYm9ycmFyXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkZGQgZCAhZGUgbW1tbSAhZGUgeXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIteZ16DXldeQ16hcIixcItek15HXqNeV15DXqFwiLFwi157XqNelXCIsXCLXkNek16jXmdecXCIsXCLXnteQ15lcIixcIteZ15XXoNeZXCIsXCLXmdeV15zXmVwiLFwi15DXldeS15XXodeYXCIsXCLXodek15jXnteR16hcIixcIteQ15XXp9eY15XXkdeoXCIsXCLXoNeV15HXnteR16hcIixcIteT16bXnteR16hcIl0sXCJtb250aHNTaG9ydFwiOltcIteZ16DXlVwiLFwi16TXkdeoXCIsXCLXnteo16VcIixcIteQ16TXqFwiLFwi157XkNeZXCIsXCLXmdeV16BcIixcIteZ15XXnFwiLFwi15DXldeSXCIsXCLXodek15hcIixcIteQ15XXp1wiLFwi16DXldeRXCIsXCLXk9em155cIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLXmdeV150g16jXkNep15XXn1wiLFwi15nXldedINep16DXmVwiLFwi15nXldedINep15zXmdep15lcIixcIteZ15XXnSDXqNeR15nXoteZXCIsXCLXmdeV150g15fXnteZ16nXmVwiLFwi15nXldedINep16nXmVwiLFwi15nXldedINep15HXqlwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLXkFwiLFwi15FcIixcIteSXCIsXCLXk1wiLFwi15RcIixcIteVXCIsXCLXqVwiXSxcInRvZGF5XCI6XCLXlNeZ15XXnVwiLFwiY2xlYXJcIjpcItec157Xl9eV16dcIixcImZvcm1hdFwiOlwieXl5eSBtbW1t15EgZCBkZGRkXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi4KSc4KSo4KS14KSw4KWAXCIsXCLgpKvgpLDgpLXgpLDgpYBcIixcIuCkruCkvuCksOCljeCkmlwiLFwi4KSF4KSq4KWN4KSw4KWI4KSyXCIsXCLgpK7gpIhcIixcIuCknOClguCkqFwiLFwi4KSc4KWB4KSy4KS+4KSIXCIsXCLgpIXgpJfgpLjgpY3gpKRcIixcIuCkuOCkv+CkpOCkruCljeCkrOCksFwiLFwi4KSF4KSV4KWN4KSf4KWC4KSs4KSwXCIsXCLgpKjgpLXgpK7gpY3gpKzgpLBcIixcIuCkpuCkv+CkuOCkruCljeCkrOCksFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi4KSc4KSoXCIsXCLgpKvgpLBcIixcIuCkruCkvuCksOCljeCkmlwiLFwi4KSF4KSq4KWN4KSw4KWI4KSyXCIsXCLgpK7gpIhcIixcIuCknOClguCkqFwiLFwi4KSc4KWBXCIsXCLgpIXgpJdcIixcIuCkuOCkv+CkpFwiLFwi4KSF4KSV4KWN4KSf4KWCXCIsXCLgpKjgpLVcIixcIuCkpuCkv+CkuFwiXSxcIndlZWtkYXlzRnVsbFwiOltcIuCksOCkteCkv+CkteCkvuCksFwiLFwi4KS44KWL4KSu4KS14KS+4KSwXCIsXCLgpK7gpILgpJfgpLLgpLXgpL7gpLBcIixcIuCkrOClgeCkp+CkteCkvuCksFwiLFwi4KSX4KWB4KSw4KWB4KS14KS+4KSwXCIsXCLgpLbgpYHgpJXgpY3gpLDgpLXgpL7gpLBcIixcIuCktuCkqOCkv+CkteCkvuCksFwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLgpLDgpLXgpL9cIixcIuCkuOCli+CkrlwiLFwi4KSu4KSC4KSX4KSyXCIsXCLgpKzgpYHgpKdcIixcIuCkl+ClgeCksOClgVwiLFwi4KS24KWB4KSV4KWN4KSwXCIsXCLgpLbgpKjgpL9cIl0sXCJ0b2RheVwiOlwi4KSG4KScIOCkleClgCDgpKTgpL7gpLDgpYDgpJYg4KSa4KSv4KSoIOCkleCksOClh+CkglwiLFwiY2xlYXJcIjpcIuCkmuClgeCkqOClgCDgpLngpYHgpIgg4KSk4KS+4KSw4KWA4KSWIOCkleCliyDgpK7gpL/gpJ/gpL7gpI/gpIFcIixcImNsb3NlXCI6XCLgpLXgpL/gpILgpKHgpYsg4KSs4KSC4KSmIOCkleCksOClh1wiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZC9tbS95eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIixcImxhYmVsTW9udGhOZXh0XCI6XCLgpIXgpJfgpLLgpYcg4KSu4KS+4KS5IOCkleCkviDgpJrgpK/gpKgg4KSV4KSw4KWH4KSCXCIsXCJsYWJlbE1vbnRoUHJldlwiOlwi4KSq4KS/4KSb4KSy4KWHIOCkruCkvuCkuSDgpJXgpL4g4KSa4KSv4KSoIOCkleCksOClh+CkglwiLFwibGFiZWxNb250aFNlbGVjdFwiOlwi4KSV4KS/4KS44KS/IOCkj+CklSDgpK7gpLngpYDgpKjgpYcg4KSV4KS+IOCkmuCkr+CkqCDgpJXgpLDgpYfgpIJcIixcImxhYmVsWWVhclNlbGVjdFwiOlwi4KSV4KS/4KS44KS/IOCkj+CklSDgpLXgpLDgpY3gpLcg4KSV4KS+IOCkmuCkr+CkqCDgpJXgpLDgpYfgpIJcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wic2lqZcSHYW5qXCIsXCJ2ZWxqYcSNYVwiLFwib8W+dWpha1wiLFwidHJhdmFualwiLFwic3ZpYmFualwiLFwibGlwYW5qXCIsXCJzcnBhbmpcIixcImtvbG92b3pcIixcInJ1amFuXCIsXCJsaXN0b3BhZFwiLFwic3R1ZGVuaVwiLFwicHJvc2luYWNcIl0sXCJtb250aHNTaG9ydFwiOltcInNpalwiLFwidmVsalwiLFwib8W+dVwiLFwidHJhXCIsXCJzdmlcIixcImxpcFwiLFwic3JwXCIsXCJrb2xcIixcInJ1alwiLFwibGlzXCIsXCJzdHVcIixcInByb1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5lZGplbGphXCIsXCJwb25lZGplbGpha1wiLFwidXRvcmFrXCIsXCJzcmlqZWRhXCIsXCLEjWV0dnJ0YWtcIixcInBldGFrXCIsXCJzdWJvdGFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wibmVkXCIsXCJwb25cIixcInV0b1wiLFwic3JpXCIsXCLEjWV0XCIsXCJwZXRcIixcInN1YlwiXSxcInRvZGF5XCI6XCJkYW5hc1wiLFwiY2xlYXJcIjpcIml6YnJpc2F0aVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLiBtbW1tIHl5eXkuXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFudcOhclwiLFwiZmVicnXDoXJcIixcIm3DoXJjaXVzXCIsXCLDoXByaWxpc1wiLFwibcOhanVzXCIsXCJqw7puaXVzXCIsXCJqw7psaXVzXCIsXCJhdWd1c3p0dXNcIixcInN6ZXB0ZW1iZXJcIixcIm9rdMOzYmVyXCIsXCJub3ZlbWJlclwiLFwiZGVjZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViclwiLFwibcOhcmNcIixcIsOhcHJcIixcIm3DoWpcIixcImrDum5cIixcImrDumxcIixcImF1Z1wiLFwic3plcHRcIixcIm9rdFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJ2YXPDoXJuYXBcIixcImjDqXRmxZFcIixcImtlZGRcIixcInN6ZXJkYVwiLFwiY3PDvHTDtnJ0w7ZrXCIsXCJww6ludGVrXCIsXCJzem9tYmF0XCJdLFwid2Vla2RheXNTaG9ydFwiOltcIlZcIixcIkhcIixcIktcIixcIlNaZVwiLFwiQ1NcIixcIlBcIixcIlNab1wiXSxcInRvZGF5XCI6XCJNYVwiLFwiY2xlYXJcIjpcIlTDtnJsw6lzXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXkuIG1tbW0gZGQuXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiSmFudWFyaVwiLFwiRmVicnVhcmlcIixcIk1hcmV0XCIsXCJBcHJpbFwiLFwiTWVpXCIsXCJKdW5pXCIsXCJKdWxpXCIsXCJBZ3VzdHVzXCIsXCJTZXB0ZW1iZXJcIixcIk9rdG9iZXJcIixcIk5vdmVtYmVyXCIsXCJEZXNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiSmFuXCIsXCJGZWJcIixcIk1hclwiLFwiQXByXCIsXCJNZWlcIixcIkp1blwiLFwiSnVsXCIsXCJBZ3VcIixcIlNlcFwiLFwiT2t0XCIsXCJOb3ZcIixcIkRlc1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIk1pbmdndVwiLFwiU2VuaW5cIixcIlNlbGFzYVwiLFwiUmFidVwiLFwiS2FtaXNcIixcIkp1bWF0XCIsXCJTYWJ0dVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJNaW5cIixcIlNlblwiLFwiU2VsXCIsXCJSYWJcIixcIkthbVwiLFwiSnVtXCIsXCJTYWJcIl0sXCJ0b2RheVwiOlwiaGFyaSBpbmlcIixcImNsZWFyXCI6XCJtZW5naGFwdXNcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZCBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIi8vIEZJWE1FOiBvbmx5IGVuLXVzIHNob3VsZCBiZSByZXF1aXJhYmxlIGJ5IGRlZmF1bHQsIGFsbCBvdGhlciBsYW5ndWFnZXNcbi8vIHNob3VsZCBiZSBwYXNzZWQgaW4gYXMgYXJncyB0byBtaW5pbWl6ZSBwYWNrYWdlIHNpemUuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJ2JnLUJHJzogcmVxdWlyZSgnLi9iZy1CRycpLFxuICAnYnMtQkEnOiByZXF1aXJlKCcuL2JzLUJBJyksXG4gICdjYS1FUyc6IHJlcXVpcmUoJy4vY2EtRVMnKSxcbiAgJ2NzLUNaJzogcmVxdWlyZSgnLi9jcy1DWicpLFxuICAnZGEtREsnOiByZXF1aXJlKCcuL2RhLURLJyksXG4gICdkZS1ERSc6IHJlcXVpcmUoJy4vZGUtREUnKSxcbiAgJ2VsLUdSJzogcmVxdWlyZSgnLi9lbC1HUicpLFxuICAnZW4tVVMnOiByZXF1aXJlKCcuL2VuLVVTJyksXG4gICdlcy1FUyc6IHJlcXVpcmUoJy4vZXMtRVMnKSxcbiAgJ2V0LUVFJzogcmVxdWlyZSgnLi9ldC1FRScpLFxuICAnZXUtRVMnOiByZXF1aXJlKCcuL2V1LUVTJyksXG4gICdmYS1pcic6IHJlcXVpcmUoJy4vZmEtaXInKSxcbiAgJ2ZpLUZJJzogcmVxdWlyZSgnLi9maS1GSScpLFxuICAnZnItRlInOiByZXF1aXJlKCcuL2ZyLUZSJyksXG4gICdnbC1FUyc6IHJlcXVpcmUoJy4vZ2wtRVMnKSxcbiAgJ2hlLUlMJzogcmVxdWlyZSgnLi9oZS1JTCcpLFxuICAnaGktSU4nOiByZXF1aXJlKCcuL2hpLUlOJyksXG4gICdoci1IUic6IHJlcXVpcmUoJy4vaHItSFInKSxcbiAgJ2h1LUhVJzogcmVxdWlyZSgnLi9odS1IVScpLFxuICAnaWQtSUQnOiByZXF1aXJlKCcuL2lkLUlEJyksXG4gICdpcy1JUyc6IHJlcXVpcmUoJy4vaXMtSVMnKSxcbiAgJ2l0LUlUJzogcmVxdWlyZSgnLi9pdC1JVCcpLFxuICAnamEtSlAnOiByZXF1aXJlKCcuL2phLUpQJyksXG4gICdrby1LUic6IHJlcXVpcmUoJy4va28tS1InKSxcbiAgJ2x0LUxUJzogcmVxdWlyZSgnLi9sdC1MVCcpLFxuICAnbHYtTFYnOiByZXF1aXJlKCcuL2x2LUxWJyksXG4gICduYi1OTyc6IHJlcXVpcmUoJy4vbmItTk8nKSxcbiAgJ25lLU5QJzogcmVxdWlyZSgnLi9uZS1OUCcpLFxuICAnbmwtTkwnOiByZXF1aXJlKCcuL25sLU5MJyksXG4gICdwbC1QTCc6IHJlcXVpcmUoJy4vcGwtUEwnKSxcbiAgJ3B0LUJSJzogcmVxdWlyZSgnLi9wdC1CUicpLFxuICAncHQtUFQnOiByZXF1aXJlKCcuL3B0LVBUJyksXG4gICdyby1STyc6IHJlcXVpcmUoJy4vcm8tUk8nKSxcbiAgJ3J1LVJVJzogcmVxdWlyZSgnLi9ydS1SVScpLFxuICAnc2stU0snOiByZXF1aXJlKCcuL3NrLVNLJyksXG4gICdzbC1TSSc6IHJlcXVpcmUoJy4vc2wtU0knKSxcbiAgJ3N2LVNFJzogcmVxdWlyZSgnLi9zdi1TRScpLFxuICAndGgtVEgnOiByZXF1aXJlKCcuL3RoLVRIJyksXG4gICd0ci1UUic6IHJlcXVpcmUoJy4vdHItVFInKSxcbiAgJ3VrLVVBJzogcmVxdWlyZSgnLi91ay1VQScpLFxuICAndmktVk4nOiByZXF1aXJlKCcuL3ZpLVZOJyksXG4gICd6aC1DTic6IHJlcXVpcmUoJy4vemgtQ04nKSxcbiAgJ3poLVRXJzogcmVxdWlyZSgnLi96aC1UVycpXG59O1xuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbsO6YXJcIixcImZlYnLDumFyXCIsXCJtYXJzXCIsXCJhcHLDrWxcIixcIm1hw61cIixcImrDum7DrVwiLFwiasO6bMOtXCIsXCLDoWfDunN0XCIsXCJzZXB0ZW1iZXJcIixcIm9rdMOzYmVyXCIsXCJuw7N2ZW1iZXJcIixcImRlc2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJqYW5cIixcImZlYlwiLFwibWFyXCIsXCJhcHJcIixcIm1hw61cIixcImrDum5cIixcImrDumxcIixcIsOhZ8O6XCIsXCJzZXBcIixcIm9rdFwiLFwibsOzdlwiLFwiZGVzXCJdLFwid2Vla2RheXNGdWxsXCI6W1wic3VubnVkYWd1clwiLFwibcOhbnVkYWd1clwiLFwiw75yacOwanVkYWd1clwiLFwibWnDsHZpa3VkYWd1clwiLFwiZmltbXR1ZGFndXJcIixcImbDtnN0dWRhZ3VyXCIsXCJsYXVnYXJkYWd1clwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJzdW5cIixcIm3DoW5cIixcIsO+cmlcIixcIm1pw7BcIixcImZpbVwiLFwiZsO2c1wiLFwibGF1XCJdLFwidG9kYXlcIjpcIsONIGRhZ1wiLFwiY2xlYXJcIjpcIkhyZWluc2FcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGQuIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImdlbm5haW9cIixcImZlYmJyYWlvXCIsXCJtYXJ6b1wiLFwiYXByaWxlXCIsXCJtYWdnaW9cIixcImdpdWdub1wiLFwibHVnbGlvXCIsXCJhZ29zdG9cIixcInNldHRlbWJyZVwiLFwib3R0b2JyZVwiLFwibm92ZW1icmVcIixcImRpY2VtYnJlXCJdLFwibW9udGhzU2hvcnRcIjpbXCJnZW5cIixcImZlYlwiLFwibWFyXCIsXCJhcHJcIixcIm1hZ1wiLFwiZ2l1XCIsXCJsdWdcIixcImFnb1wiLFwic2V0XCIsXCJvdHRcIixcIm5vdlwiLFwiZGljXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiZG9tZW5pY2FcIixcImx1bmVkw6xcIixcIm1hcnRlZMOsXCIsXCJtZXJjb2xlZMOsXCIsXCJnaW92ZWTDrFwiLFwidmVuZXJkw6xcIixcInNhYmF0b1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJkb21cIixcImx1blwiLFwibWFyXCIsXCJtZXJcIixcImdpb1wiLFwidmVuXCIsXCJzYWJcIl0sXCJ0b2RheVwiOlwiT2dnaVwiLFwiY2xlYXJcIjpcIkNhbmNlbGxhXCIsXCJjbG9zZVwiOlwiQ2hpdWRpXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkZGQgZCBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwiLFwibGFiZWxNb250aE5leHRcIjpcIk1lc2Ugc3VjY2Vzc2l2b1wiLFwibGFiZWxNb250aFByZXZcIjpcIk1lc2UgcHJlY2VkZW50ZVwiLFwibGFiZWxNb250aFNlbGVjdFwiOlwiU2VsZXppb25hIHVuIG1lc2VcIixcImxhYmVsWWVhclNlbGVjdFwiOlwiU2VsZXppb25hIHVuIGFubm9cIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiMeaciFwiLFwiMuaciFwiLFwiM+aciFwiLFwiNOaciFwiLFwiNeaciFwiLFwiNuaciFwiLFwiN+aciFwiLFwiOOaciFwiLFwiOeaciFwiLFwiMTDmnIhcIixcIjEx5pyIXCIsXCIxMuaciFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiMeaciFwiLFwiMuaciFwiLFwiM+aciFwiLFwiNOaciFwiLFwiNeaciFwiLFwiNuaciFwiLFwiN+aciFwiLFwiOOaciFwiLFwiOeaciFwiLFwiMTDmnIhcIixcIjEx5pyIXCIsXCIxMuaciFwiXSxcIndlZWtkYXlzRnVsbFwiOltcIuaXpeabnOaXpVwiLFwi5pyI5puc5pelXCIsXCLngavmm5zml6VcIixcIuawtOabnOaXpVwiLFwi5pyo5puc5pelXCIsXCLph5Hmm5zml6VcIixcIuWcn+abnOaXpVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLml6VcIixcIuaciFwiLFwi54GrXCIsXCLmsLRcIixcIuacqFwiLFwi6YeRXCIsXCLlnJ9cIl0sXCJ0b2RheVwiOlwi5LuK5pelXCIsXCJjbGVhclwiOlwi5raI5Y67XCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXkvbS9kXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCIx7JuUXCIsXCIy7JuUXCIsXCIz7JuUXCIsXCI07JuUXCIsXCI17JuUXCIsXCI27JuUXCIsXCI37JuUXCIsXCI47JuUXCIsXCI57JuUXCIsXCIxMOyblFwiLFwiMTHsm5RcIixcIjEy7JuUXCJdLFwibW9udGhzU2hvcnRcIjpbXCIx7JuUXCIsXCIy7JuUXCIsXCIz7JuUXCIsXCI07JuUXCIsXCI17JuUXCIsXCI27JuUXCIsXCI37JuUXCIsXCI47JuUXCIsXCI57JuUXCIsXCIxMOyblFwiLFwiMTHsm5RcIixcIjEy7JuUXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi7J287JqU7J28XCIsXCLsm5TsmpTsnbxcIixcIu2ZlOyalOydvFwiLFwi7IiY7JqU7J28XCIsXCLrqqnsmpTsnbxcIixcIuq4iOyalOydvFwiLFwi7Yag7JqU7J28XCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuydvFwiLFwi7JuUXCIsXCLtmZRcIixcIuyImFwiLFwi66qpXCIsXCLquIhcIixcIu2GoFwiXSxcInRvZGF5XCI6XCLsmKTriphcIixcImNsZWFyXCI6XCLst6jshoxcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwieXl5eSDrhYQgbW0g7JuUIGRkIOydvFwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibGFiZWxNb250aE5leHRcIjpcIlNla2FudGlzIG3El251b1wiLFwibGFiZWxNb250aFByZXZcIjpcIkFua3N0ZXNuaXMgbcSXbnVvXCIsXCJsYWJlbE1vbnRoU2VsZWN0XCI6XCJQYXNpcmlua2l0ZSBtxJduZXPEr1wiLFwibGFiZWxZZWFyU2VsZWN0XCI6XCJQYXNpcmlua2l0ZSBtZXR1c1wiLFwibW9udGhzRnVsbFwiOltcIlNhdXNpc1wiLFwiVmFzYXJpc1wiLFwiS292YXNcIixcIkJhbGFuZGlzXCIsXCJHZWd1xb7El1wiLFwiQmlyxb5lbGlzXCIsXCJMaWVwYVwiLFwiUnVncGrFq3Rpc1wiLFwiUnVnc8SXamlzXCIsXCJTcGFsaXNcIixcIkxhcGtyaXRpc1wiLFwiR3J1b2Rpc1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wiU2F1XCIsXCJWYXNcIixcIktvdlwiLFwiQmFsXCIsXCJHZWdcIixcIkJpclwiLFwiTGllXCIsXCJSZ3BcIixcIlJnc1wiLFwiU3BhXCIsXCJMYXBcIixcIkdyZFwiXSxcIndlZWtkYXlzRnVsbFwiOltcIlNla21hZGllbmlzXCIsXCJQaXJtYWRpZW5pc1wiLFwiQW50cmFkaWVuaXNcIixcIlRyZcSNaWFkaWVuaXNcIixcIktldHZpcnRhZGllbmlzXCIsXCJQZW5rdGFkaWVuaXNcIixcIsWgZcWhdGFkaWVuaXNcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiU2tcIixcIlByXCIsXCJBblwiLFwiVHJcIixcIkt0XCIsXCJQblwiLFwixaB0XCJdLFwidG9kYXlcIjpcIsWgaWFuZGllblwiLFwiY2xlYXJcIjpcIknFoXZhbHl0aVwiLFwiY2xvc2VcIjpcIlXFvmRhcnl0aVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJ5eXl5LW1tLWRkXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiSmFudsSBcmlzXCIsXCJGZWJydcSBcmlzXCIsXCJNYXJ0c1wiLFwiQXByxKtsaXNcIixcIk1haWpzXCIsXCJKxatuaWpzXCIsXCJKxatsaWpzXCIsXCJBdWd1c3RzXCIsXCJTZXB0ZW1icmlzXCIsXCJPa3RvYnJpc1wiLFwiTm92ZW1icmlzXCIsXCJEZWNlbWJyaXNcIl0sXCJtb250aHNTaG9ydFwiOltcIkphblwiLFwiRmViXCIsXCJNYXJcIixcIkFwclwiLFwiTWFpXCIsXCJKxatuXCIsXCJKxatsXCIsXCJBdWdcIixcIlNlcFwiLFwiT2t0XCIsXCJOb3ZcIixcIkRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIlN2xJN0ZGllbmFcIixcIlBpcm1kaWVuYVwiLFwiT3RyZGllbmFcIixcIlRyZcWhZGllbmFcIixcIkNldHVydGRpZW5hXCIsXCJQaWVrdGRpZW5hXCIsXCJTZXN0ZGllbmFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiU3ZcIixcIlBcIixcIk9cIixcIlRcIixcIkNcIixcIlBrXCIsXCJTXCJdLFwidG9kYXlcIjpcIsWgb2RpZW5hXCIsXCJjbGVhclwiOlwiQXRjZWx0XCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXkubW0uZGQuIGRkZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51YXJcIixcImZlYnJ1YXJcIixcIm1hcnNcIixcImFwcmlsXCIsXCJtYWlcIixcImp1bmlcIixcImp1bGlcIixcImF1Z3VzdFwiLFwic2VwdGVtYmVyXCIsXCJva3RvYmVyXCIsXCJub3ZlbWJlclwiLFwiZGVzZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFpXCIsXCJqdW5cIixcImp1bFwiLFwiYXVnXCIsXCJzZXBcIixcIm9rdFwiLFwibm92XCIsXCJkZXNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJzw7huZGFnXCIsXCJtYW5kYWdcIixcInRpcnNkYWdcIixcIm9uc2RhZ1wiLFwidG9yc2RhZ1wiLFwiZnJlZGFnXCIsXCJsw7hyZGFnXCJdLFwid2Vla2RheXNTaG9ydFwiOltcInPDuG5cIixcIm1hblwiLFwidGlyXCIsXCJvbnNcIixcInRvclwiLFwiZnJlXCIsXCJsw7hyXCJdLFwidG9kYXlcIjpcImkgZGFnXCIsXCJjbGVhclwiOlwibnVsbHN0aWxsXCIsXCJjbG9zZVwiOlwibHVra1wiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZC4gbW1tLiB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi4KSc4KSo4KS14KSw4KWAXCIsXCLgpKvgpYfgpKzgpY3gpLDgpYHgpIXgpLDgpYBcIixcIuCkruCkvuCksOCljeCkmlwiLFwi4KSF4KSq4KWN4KSw4KS/4KSyXCIsXCLgpK7gpYdcIixcIuCknOClgeCkqFwiLFwi4KSc4KWB4KSy4KS+4KSIXCIsXCLgpIXgpJfgpLjgpY3gpKRcIixcIuCkuOClh+CkquCljeCkn+Clh+CkruCljeCkrOCksFwiLFwi4KSF4KSV4KWN4KSf4KWL4KSs4KSwXCIsXCLgpKjgpYvgpLXgpYfgpK7gpY3gpKzgpLBcIixcIuCkoeCkv+CkuOClh+CkruCljeCkrOCksFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi4KSc4KSoXCIsXCLgpKvgpYfgpKzgpY3gpLDgpYFcIixcIuCkruCkvuCksOCljeCkmlwiLFwi4KSF4KSq4KWN4KSw4KS/4KSyXCIsXCLgpK7gpYdcIixcIuCknOClgeCkqFwiLFwi4KSc4KWB4KSyXCIsXCLgpIXgpJdcIixcIuCkuOClh+CkquCljeCkn+Clh1wiLFwi4KSF4KSV4KWN4KSf4KWLXCIsXCLgpKjgpYvgpK3gpYdcIixcIuCkoeCkv+CkuOClh1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIuCkuOCli+CkruCkrOCkvuCksFwiLFwi4KSu4KSZ4KWN4KSy4KSs4KS+4KSwXCIsXCLgpKzgpYHgpKfgpKzgpL7gpLBcIixcIuCkrOCkv+CkueClgOCkrOCkvuCksFwiLFwi4KS24KWB4KSV4KWN4KSw4KSs4KS+4KSwXCIsXCLgpLbgpKjgpL/gpKzgpL7gpLBcIixcIuCkhuCkiOCkpOCkrOCkvuCksFwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLgpLjgpYvgpK5cIixcIuCkruCkguCkl+CksuCljVwiLFwi4KSs4KWB4KSnXCIsXCLgpKzgpL/gpLngpYBcIixcIuCktuClgeCkleCljeCksFwiLFwi4KS24KSo4KS/XCIsXCLgpIbgpIjgpKRcIl0sXCJudW1iZXJzXCI6W1wi4KWmXCIsXCLgpadcIixcIuClqFwiLFwi4KWpXCIsXCLgpapcIixcIuClq1wiLFwi4KWsXCIsXCLgpa1cIixcIuClrlwiLFwi4KWvXCJdLFwidG9kYXlcIjpcIuCkhuCknFwiLFwiY2xlYXJcIjpcIuCkruClh+Ckn+CkvuCkieCkqOClgeCkueCli+CkuOCljVwiLFwiZm9ybWF0XCI6XCJkZGRkLCBkZCBtbW1tLCB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFudWFyaVwiLFwiZmVicnVhcmlcIixcIm1hYXJ0XCIsXCJhcHJpbFwiLFwibWVpXCIsXCJqdW5pXCIsXCJqdWxpXCIsXCJhdWd1c3R1c1wiLFwic2VwdGVtYmVyXCIsXCJva3RvYmVyXCIsXCJub3ZlbWJlclwiLFwiZGVjZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYWFcIixcImFwclwiLFwibWVpXCIsXCJqdW5cIixcImp1bFwiLFwiYXVnXCIsXCJzZXBcIixcIm9rdFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJ6b25kYWdcIixcIm1hYW5kYWdcIixcImRpbnNkYWdcIixcIndvZW5zZGFnXCIsXCJkb25kZXJkYWdcIixcInZyaWpkYWdcIixcInphdGVyZGFnXCJdLFwid2Vla2RheXNTaG9ydFwiOltcInpvXCIsXCJtYVwiLFwiZGlcIixcIndvXCIsXCJkb1wiLFwidnJcIixcInphXCJdLFwidG9kYXlcIjpcInZhbmRhYWdcIixcImNsZWFyXCI6XCJ2ZXJ3aWpkZXJlblwiLFwiY2xvc2VcIjpcInNsdWl0ZW5cIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGRkZCBkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcInN0eWN6ZcWEXCIsXCJsdXR5XCIsXCJtYXJ6ZWNcIixcImt3aWVjaWXFhFwiLFwibWFqXCIsXCJjemVyd2llY1wiLFwibGlwaWVjXCIsXCJzaWVycGllxYRcIixcIndyemVzaWXFhFwiLFwicGHFumR6aWVybmlrXCIsXCJsaXN0b3BhZFwiLFwiZ3J1ZHppZcWEXCJdLFwibW9udGhzU2hvcnRcIjpbXCJzdHlcIixcImx1dFwiLFwibWFyXCIsXCJrd2lcIixcIm1halwiLFwiY3plXCIsXCJsaXBcIixcInNpZVwiLFwid3J6XCIsXCJwYcW6XCIsXCJsaXNcIixcImdydVwiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5pZWR6aWVsYVwiLFwicG9uaWVkemlhxYJla1wiLFwid3RvcmVrXCIsXCLFm3JvZGFcIixcImN6d2FydGVrXCIsXCJwacSFdGVrXCIsXCJzb2JvdGFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wibmllZHouXCIsXCJwbi5cIixcInd0LlwiLFwixZtyLlwiLFwiY3ouXCIsXCJwdC5cIixcInNvYi5cIl0sXCJ0b2RheVwiOlwiRHppc2lhalwiLFwiY2xlYXJcIjpcIlVzdcWEXCIsXCJjbG9zZVwiOlwiWmFta25palwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbmVpcm9cIixcImZldmVyZWlyb1wiLFwibWFyw6dvXCIsXCJhYnJpbFwiLFwibWFpb1wiLFwianVuaG9cIixcImp1bGhvXCIsXCJhZ29zdG9cIixcInNldGVtYnJvXCIsXCJvdXR1YnJvXCIsXCJub3ZlbWJyb1wiLFwiZGV6ZW1icm9cIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmV2XCIsXCJtYXJcIixcImFiclwiLFwibWFpXCIsXCJqdW5cIixcImp1bFwiLFwiYWdvXCIsXCJzZXRcIixcIm91dFwiLFwibm92XCIsXCJkZXpcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkb21pbmdvXCIsXCJzZWd1bmRhLWZlaXJhXCIsXCJ0ZXLDp2EtZmVpcmFcIixcInF1YXJ0YS1mZWlyYVwiLFwicXVpbnRhLWZlaXJhXCIsXCJzZXh0YS1mZWlyYVwiLFwic8OhYmFkb1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJkb21cIixcInNlZ1wiLFwidGVyXCIsXCJxdWFcIixcInF1aVwiLFwic2V4XCIsXCJzYWJcIl0sXCJ0b2RheVwiOlwiaG9qZVwiLFwiY2xlYXJcIjpcImxpbXBhclwiLFwiY2xvc2VcIjpcImZlY2hhclwiLFwiZm9ybWF0XCI6XCJkZGRkLCBkICFkZSBtbW1tICFkZSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiSmFuZWlyb1wiLFwiRmV2ZXJlaXJvXCIsXCJNYXLDp29cIixcIkFicmlsXCIsXCJNYWlvXCIsXCJKdW5ob1wiLFwiSnVsaG9cIixcIkFnb3N0b1wiLFwiU2V0ZW1icm9cIixcIk91dHVicm9cIixcIk5vdmVtYnJvXCIsXCJEZXplbWJyb1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZXZcIixcIm1hclwiLFwiYWJyXCIsXCJtYWlcIixcImp1blwiLFwianVsXCIsXCJhZ29cIixcInNldFwiLFwib3V0XCIsXCJub3ZcIixcImRlelwiXSxcIndlZWtkYXlzRnVsbFwiOltcIkRvbWluZ29cIixcIlNlZ3VuZGFcIixcIlRlcsOnYVwiLFwiUXVhcnRhXCIsXCJRdWludGFcIixcIlNleHRhXCIsXCJTw6FiYWRvXCJdLFwid2Vla2RheXNTaG9ydFwiOltcImRvbVwiLFwic2VnXCIsXCJ0ZXJcIixcInF1YVwiLFwicXVpXCIsXCJzZXhcIixcInNhYlwiXSxcInRvZGF5XCI6XCJIb2plXCIsXCJjbGVhclwiOlwiTGltcGFyXCIsXCJjbG9zZVwiOlwiRmVjaGFyXCIsXCJmb3JtYXRcIjpcImQgIWRlIG1tbW0gIWRlIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJpYW51YXJpZVwiLFwiZmVicnVhcmllXCIsXCJtYXJ0aWVcIixcImFwcmlsaWVcIixcIm1haVwiLFwiaXVuaWVcIixcIml1bGllXCIsXCJhdWd1c3RcIixcInNlcHRlbWJyaWVcIixcIm9jdG9tYnJpZVwiLFwibm9pZW1icmllXCIsXCJkZWNlbWJyaWVcIl0sXCJtb250aHNTaG9ydFwiOltcImlhblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFpXCIsXCJpdW5cIixcIml1bFwiLFwiYXVnXCIsXCJzZXBcIixcIm9jdFwiLFwibm9pXCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkdW1pbmljxINcIixcImx1bmlcIixcIm1hcsWjaVwiLFwibWllcmN1cmlcIixcImpvaVwiLFwidmluZXJpXCIsXCJzw6JtYsSDdMSDXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIkRcIixcIkxcIixcIk1hXCIsXCJNaVwiLFwiSlwiLFwiVlwiLFwiU1wiXSxcInRvZGF5XCI6XCJhemlcIixcImNsZWFyXCI6XCLImXRlcmdlXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcItGP0L3QstCw0YDRj1wiLFwi0YTQtdCy0YDQsNC70Y9cIixcItC80LDRgNGC0LBcIixcItCw0L/RgNC10LvRj1wiLFwi0LzQsNGPXCIsXCLQuNGO0L3Rj1wiLFwi0LjRjtC70Y9cIixcItCw0LLQs9GD0YHRgtCwXCIsXCLRgdC10L3RgtGP0LHRgNGPXCIsXCLQvtC60YLRj9Cx0YDRj1wiLFwi0L3QvtGP0LHRgNGPXCIsXCLQtNC10LrQsNCx0YDRj1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wi0Y/QvdCyXCIsXCLRhNC10LJcIixcItC80LDRgFwiLFwi0LDQv9GAXCIsXCLQvNCw0LlcIixcItC40Y7QvVwiLFwi0LjRjtC7XCIsXCLQsNCy0LNcIixcItGB0LXQvVwiLFwi0L7QutGCXCIsXCLQvdC+0Y9cIixcItC00LXQulwiXSxcIndlZWtkYXlzRnVsbFwiOltcItCy0L7RgdC60YDQtdGB0LXQvdGM0LVcIixcItC/0L7QvdC10LTQtdC70YzQvdC40LpcIixcItCy0YLQvtGA0L3QuNC6XCIsXCLRgdGA0LXQtNCwXCIsXCLRh9C10YLQstC10YDQs1wiLFwi0L/Rj9GC0L3QuNGG0LBcIixcItGB0YPQsdCx0L7RgtCwXCJdLFwid2Vla2RheXNTaG9ydFwiOltcItCy0YFcIixcItC/0L1cIixcItCy0YJcIixcItGB0YBcIixcItGH0YJcIixcItC/0YJcIixcItGB0LFcIl0sXCJ0b2RheVwiOlwi0YHQtdCz0L7QtNC90Y9cIixcImNsZWFyXCI6XCLRg9C00LDQu9C40YLRjFwiLFwiY2xvc2VcIjpcItC30LDQutGA0YvRgtGMXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tbSB5eXl5INCzLlwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnXDoXJcIixcImZlYnJ1w6FyXCIsXCJtYXJlY1wiLFwiYXByw61sXCIsXCJtw6FqXCIsXCJqw7puXCIsXCJqw7psXCIsXCJhdWd1c3RcIixcInNlcHRlbWJlclwiLFwib2t0w7NiZXJcIixcIm5vdmVtYmVyXCIsXCJkZWNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtw6FqXCIsXCJqw7puXCIsXCJqw7psXCIsXCJhdWdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5lZGXEvmFcIixcInBvbmRlbG9rXCIsXCJ1dG9yb2tcIixcInN0cmVkYVwiLFwixaF0dnJ0b2tcIixcInBpYXRva1wiLFwic29ib3RhXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIk5lXCIsXCJQb1wiLFwiVXRcIixcIlN0XCIsXCLFoHRcIixcIlBpXCIsXCJTb1wiXSxcInRvZGF5XCI6XCJkbmVzXCIsXCJjbGVhclwiOlwidnltYXphxaVcIixcImNsb3NlXCI6XCJ6YXZyaWXFpVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLiBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51YXJcIixcImZlYnJ1YXJcIixcIm1hcmVjXCIsXCJhcHJpbFwiLFwibWFqXCIsXCJqdW5palwiLFwianVsaWpcIixcImF2Z3VzdFwiLFwic2VwdGVtYmVyXCIsXCJva3RvYmVyXCIsXCJub3ZlbWJlclwiLFwiZGVjZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFqXCIsXCJqdW5cIixcImp1bFwiLFwiYXZnXCIsXCJzZXBcIixcIm9rdFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJuZWRlbGphXCIsXCJwb25lZGVsamVrXCIsXCJ0b3Jla1wiLFwic3JlZGFcIixcIsSNZXRydGVrXCIsXCJwZXRla1wiLFwic29ib3RhXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIm5lZFwiLFwicG9uXCIsXCJ0b3JcIixcInNyZVwiLFwixI1ldFwiLFwicGV0XCIsXCJzb2JcIl0sXCJ0b2RheVwiOlwiZGFuZXNcIixcImNsZWFyXCI6XCJpemJyacWhaVwiLFwiY2xvc2VcIjpcInphcHJpXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQuIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnVhcmlcIixcImZlYnJ1YXJpXCIsXCJtYXJzXCIsXCJhcHJpbFwiLFwibWFqXCIsXCJqdW5pXCIsXCJqdWxpXCIsXCJhdWd1c3RpXCIsXCJzZXB0ZW1iZXJcIixcIm9rdG9iZXJcIixcIm5vdmVtYmVyXCIsXCJkZWNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtYWpcIixcImp1blwiLFwianVsXCIsXCJhdWdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcInPDtm5kYWdcIixcIm3DpW5kYWdcIixcInRpc2RhZ1wiLFwib25zZGFnXCIsXCJ0b3JzZGFnXCIsXCJmcmVkYWdcIixcImzDtnJkYWdcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wic8O2blwiLFwibcOlblwiLFwidGlzXCIsXCJvbnNcIixcInRvclwiLFwiZnJlXCIsXCJsw7ZyXCJdLFwidG9kYXlcIjpcIklkYWdcIixcImNsZWFyXCI6XCJSZW5zYVwiLFwiY2xvc2VcIjpcIlN0w6RuZ1wiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJ5eXl5LW1tLWRkXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIixcImxhYmVsTW9udGhOZXh0XCI6XCJOw6RzdGEgbcOlbmFkXCIsXCJsYWJlbE1vbnRoUHJldlwiOlwiRsO2cmVnw6VlbmRlIG3DpW5hZFwiLFwibGFiZWxNb250aFNlbGVjdFwiOlwiVsOkbGogbcOlbmFkXCIsXCJsYWJlbFllYXJTZWxlY3RcIjpcIlbDpGxqIMOlclwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLguKHguIHguKPguLLguITguKFcIixcIuC4geC4uOC4oeC4oOC4suC4nuC4seC4meC4mOC5jFwiLFwi4Lih4Li14LiZ4Liy4LiE4LihXCIsXCLguYDguKHguKnguLLguKLguJlcIixcIuC4nuC4pOC4qeC4oOC4suC4hOC4oVwiLFwi4Lih4Li04LiW4Li44LiZ4Liy4Lii4LiZXCIsXCLguIHguKPguIHguI7guLLguITguKFcIixcIuC4quC4tOC4h+C4q+C4suC4hOC4oVwiLFwi4LiB4Lix4LiZ4Lii4Liy4Lii4LiZXCIsXCLguJXguLjguKXguLLguITguKFcIixcIuC4nuC4pOC4qOC4iOC4tOC4geC4suC4ouC4mVwiLFwi4LiY4Lix4LiZ4Lin4Liy4LiE4LihXCJdLFwibW9udGhzU2hvcnRcIjpbXCLguKEu4LiELlwiLFwi4LiBLuC4ni5cIixcIuC4oeC4tS7guIQuXCIsXCLguYDguKEu4LiiLlwiLFwi4LieLuC4hC5cIixcIuC4oeC4tC7guKIuXCIsXCLguIEu4LiELlwiLFwi4LiqLuC4hC5cIixcIuC4gS7guKIuXCIsXCLguJUu4LiELlwiLFwi4LieLuC4oi5cIixcIuC4mC7guIQuXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi4Lit4Liy4LiX4LiV4Li04LiiXCIsXCLguIjguLHguJnguJfguKNcIixcIuC4reC4h+C4seC4hOC4suC4o1wiLFwi4Lie4Li44LiYXCIsXCLguJ7guKTguKvguKrguLEg4Lia4LiU4Li1XCIsXCLguKjguIHguLjguKNcIixcIuC5gOC4quC4suC4o1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLguK0uXCIsXCLguIguXCIsXCLguK0uXCIsXCLguJ4uXCIsXCLguJ7guKQuXCIsXCLguKguXCIsXCLguKouXCJdLFwidG9kYXlcIjpcIuC4p+C4seC4meC4meC4teC5iVwiLFwiY2xlYXJcIjpcIuC4peC4mlwiLFwiZm9ybWF0XCI6XCJkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIk9jYWtcIixcIsWedWJhdFwiLFwiTWFydFwiLFwiTmlzYW5cIixcIk1hecSxc1wiLFwiSGF6aXJhblwiLFwiVGVtbXV6XCIsXCJBxJ91c3Rvc1wiLFwiRXlsw7xsXCIsXCJFa2ltXCIsXCJLYXPEsW1cIixcIkFyYWzEsWtcIl0sXCJtb250aHNTaG9ydFwiOltcIk9jYVwiLFwixZ51YlwiLFwiTWFyXCIsXCJOaXNcIixcIk1heVwiLFwiSGF6XCIsXCJUZW1cIixcIkHEn3VcIixcIkV5bFwiLFwiRWtpXCIsXCJLYXNcIixcIkFyYVwiXSxcIndlZWtkYXlzRnVsbFwiOltcIlBhemFyXCIsXCJQYXphcnRlc2lcIixcIlNhbMSxXCIsXCLDh2FyxZ9hbWJhXCIsXCJQZXLFn2VtYmVcIixcIkN1bWFcIixcIkN1bWFydGVzaVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJQenJcIixcIlB6dFwiLFwiU2FsXCIsXCLDh3LFn1wiLFwiUHLFn1wiLFwiQ3VtXCIsXCJDbXRcIl0sXCJ0b2RheVwiOlwiQnVnw7xuXCIsXCJjbGVhclwiOlwiU2lsXCIsXCJjbG9zZVwiOlwiS2FwYXRcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGQgbW1tbSB5eXl5IGRkZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLRgdGW0YfQtdC90YxcIixcItC70Y7RgtC40LlcIixcItCx0LXRgNC10LfQtdC90YxcIixcItC60LLRltGC0LXQvdGMXCIsXCLRgtGA0LDQstC10L3RjFwiLFwi0YfQtdGA0LLQtdC90YxcIixcItC70LjQv9C10L3RjFwiLFwi0YHQtdGA0L/QtdC90YxcIixcItCy0LXRgNC10YHQtdC90YxcIixcItC20L7QstGC0LXQvdGMXCIsXCLQu9C40YHRgtC+0L/QsNC0XCIsXCLQs9GA0YPQtNC10L3RjFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi0YHRltGHXCIsXCLQu9GO0YJcIixcItCx0LXRgFwiLFwi0LrQstGWXCIsXCLRgtGA0LBcIixcItGH0LXRgFwiLFwi0LvQuNC/XCIsXCLRgdC10YBcIixcItCy0LXRgFwiLFwi0LbQvtCyXCIsXCLQu9C40YFcIixcItCz0YDRg1wiXSxcIndlZWtkYXlzRnVsbFwiOltcItC90LXQtNGW0LvRj1wiLFwi0L/QvtC90LXQtNGW0LvQvtC6XCIsXCLQstGW0LLRgtC+0YDQvtC6XCIsXCLRgdC10YDQtdC00LBcIixcItGH0LXRgtCy0LXRgFwiLFwi0L/igJjRj9GC0L3QuNGG0Y9cIixcItGB0YPQsdC+0YLQsFwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLQvdC0XCIsXCLQv9C9XCIsXCLQstGCXCIsXCLRgdGAXCIsXCLRh9GCXCIsXCLQv9GCXCIsXCLRgdCxXCJdLFwidG9kYXlcIjpcItGB0YzQvtCz0L7QtNC90ZZcIixcImNsZWFyXCI6XCLQstC40LrRgNC10YHQu9C40YLQuFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZCBtbW1tIHl5eXkgcC5cIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJUaMOhbmcgTeG7mXRcIixcIlRow6FuZyBIYWlcIixcIlRow6FuZyBCYVwiLFwiVGjDoW5nIFTGsFwiLFwiVGjDoW5nIE7Eg21cIixcIlRow6FuZyBTw6F1XCIsXCJUaMOhbmcgQuG6o3lcIixcIlRow6FuZyBUw6FtXCIsXCJUaMOhbmcgQ2jDrW5cIixcIlRow6FuZyBNxrDhu51pXCIsXCJUaMOhbmcgTcaw4budaSBN4buZdFwiLFwiVGjDoW5nIE3GsOG7nWkgSGFpXCJdLFwibW9udGhzU2hvcnRcIjpbXCJN4buZdFwiLFwiSGFpXCIsXCJCYVwiLFwiVMawXCIsXCJOxINtXCIsXCJTw6F1XCIsXCJC4bqjeVwiLFwiVMOhbVwiLFwiQ2jDrW5cIixcIk3GsOG7m2lcIixcIk3GsOG7nWkgTeG7mXRcIixcIk3GsOG7nWkgSGFpXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiQ2jhu6cgTmjhuq10XCIsXCJUaOG7qSBIYWlcIixcIlRo4bupIEJhXCIsXCJUaOG7qSBUxrBcIixcIlRo4bupIE7Eg21cIixcIlRo4bupIFPDoXVcIixcIlRo4bupIELhuqN5XCJdLFwid2Vla2RheXNTaG9ydFwiOltcIkMuTmjhuq10XCIsXCJULkhhaVwiLFwiVC5CYVwiLFwiVC5UxrBcIixcIlQuTsSDbVwiLFwiVC5Tw6F1XCIsXCJULkLhuqN5XCJdLFwidG9kYXlcIjpcIkjDtG0gTmF5XCIsXCJjbGVhclwiOlwiWG/DoVwiLFwiZmlyc3REYXlcIjoxfSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLkuIDmnIhcIixcIuS6jOaciFwiLFwi5LiJ5pyIXCIsXCLlm5vmnIhcIixcIuS6lOaciFwiLFwi5YWt5pyIXCIsXCLkuIPmnIhcIixcIuWFq+aciFwiLFwi5Lmd5pyIXCIsXCLljYHmnIhcIixcIuWNgeS4gOaciFwiLFwi5Y2B5LqM5pyIXCJdLFwibW9udGhzU2hvcnRcIjpbXCLkuIBcIixcIuS6jFwiLFwi5LiJXCIsXCLlm5tcIixcIuS6lFwiLFwi5YWtXCIsXCLkuINcIixcIuWFq1wiLFwi5LmdXCIsXCLljYFcIixcIuWNgeS4gFwiLFwi5Y2B5LqMXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi5pif5pyf5pelXCIsXCLmmJ/mnJ/kuIBcIixcIuaYn+acn+S6jFwiLFwi5pif5pyf5LiJXCIsXCLmmJ/mnJ/lm5tcIixcIuaYn+acn+S6lFwiLFwi5pif5pyf5YWtXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuaXpVwiLFwi5LiAXCIsXCLkuoxcIixcIuS4iVwiLFwi5ZubXCIsXCLkupRcIixcIuWFrVwiXSxcInRvZGF5XCI6XCLku4rml6VcIixcImNsZWFyXCI6XCLmuIXpmaRcIixcImNsb3NlXCI6XCLlhbPpl61cIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwieXl5eSDlubQgbW0g5pyIIGRkIOaXpVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIuS4gOaciFwiLFwi5LqM5pyIXCIsXCLkuInmnIhcIixcIuWbm+aciFwiLFwi5LqU5pyIXCIsXCLlha3mnIhcIixcIuS4g+aciFwiLFwi5YWr5pyIXCIsXCLkuZ3mnIhcIixcIuWNgeaciFwiLFwi5Y2B5LiA5pyIXCIsXCLljYHkuozmnIhcIl0sXCJtb250aHNTaG9ydFwiOltcIuS4gFwiLFwi5LqMXCIsXCLkuIlcIixcIuWbm1wiLFwi5LqUXCIsXCLlha1cIixcIuS4g1wiLFwi5YWrXCIsXCLkuZ1cIixcIuWNgVwiLFwi5Y2B5LiAXCIsXCLljYHkuoxcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLmmJ/mnJ/ml6VcIixcIuaYn+acn+S4gFwiLFwi5pif5pyf5LqMXCIsXCLmmJ/mnJ/kuIlcIixcIuaYn+acn+Wbm1wiLFwi5pif5pyf5LqUXCIsXCLmmJ/mnJ/lha1cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wi5pelXCIsXCLkuIBcIixcIuS6jFwiLFwi5LiJXCIsXCLlm5tcIixcIuS6lFwiLFwi5YWtXCJdLFwidG9kYXlcIjpcIuS7iuWkqVwiLFwiY2xlYXJcIjpcIua4hemZpFwiLFwiY2xvc2VcIjpcIuWFs+mXrVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJ5eXl5IOW5tCBtbSDmnIggZGQg5pelXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iXX0=
