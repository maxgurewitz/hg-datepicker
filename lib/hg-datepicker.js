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

},{"../generate-month":96}],95:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRpZmYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FtZWxpemUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRlZm9ybWF0L2xpYi9kYXRlZm9ybWF0LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvYWRkLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvZG9tLWRlbGVnYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcHJveHktZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9yZW1vdmUtZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLXdhbGsvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXJyb3IvdHlwZWQuanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvb25lLXZlcnNpb24uanMiLCJub2RlX21vZHVsZXMvZm9ybS1kYXRhLXNldC9lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL2Zvcm0tZGF0YS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvbXVsdGlwbGUuanMiLCJub2RlX21vZHVsZXMvZ2V2YWwvc2luZ2xlLmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5fYmluZGNhbGxiYWNrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50aW1lcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tYWluLWxvb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWVyY3VyeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tb250aC1kYXlzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hZGQtbGlzdGVuZXIuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LWFycmF5L2FwcGx5LXBhdGNoLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1tZXRob2RzLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1yZXZlcnNlLmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9hcnJheS1zb3J0LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvbGliL3NldC1ub24tZW51bWVyYWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvcHV0LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi1hcnJheS9zZXQuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LWFycmF5L3NwbGljZS5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtYXJyYXkvdHJhbnNhY3Rpb24uanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2LXN0cnVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtc3RydWN0L25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYtdmFyaGFzaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYnNlcnYvY29tcHV0ZWQuanMiLCJub2RlX21vZHVsZXMvb2JzZXJ2L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29ic2Vydi93YXRjaC5qcyIsIm5vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcmFmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy10ZW1wbGF0ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9iYXNlLWV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZhbHVlLWV2ZW50L2NoYW5nZS5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9jbGljay5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9ldmVudC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9rZXkuanMiLCJub2RlX21vZHVsZXMvdmFsdWUtZXZlbnQvbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwibm9kZV9tb2R1bGVzL3ZhbHVlLWV2ZW50L25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92YWx1ZS1ldmVudC9zdWJtaXQuanMiLCJub2RlX21vZHVsZXMvdmFsdWUtZXZlbnQvdmFsdWUuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9pbW11dGFibGUtdGh1bmsuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92ZG9tLXRodW5rL3BhcnRpYWwuanMiLCJub2RlX21vZHVsZXMvdmRvbS10aHVuay9zaGFsbG93LWVxLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vZG9tLWluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vcGF0Y2gtb3AuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9wYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9ob29rcy9ldi1ob29rLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaG9va3Mvc29mdC1zZXQtaG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92aXJ0dWFsLWh5cGVyc2NyaXB0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvcGFyc2UtdGFnLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2hhbmRsZS10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12aG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12dGV4dC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92cGF0Y2guanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdnRleHQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdnRyZWUvZGlmZi1wcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92dHJlZS9kaWZmLmpzIiwibm9kZV9tb2R1bGVzL3dlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmUuanMiLCJub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2hpZGRlbi1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9tdXRhYmxlLmpzIiwic3JjL2NoYW5uZWxzL2luZGV4LmpzIiwic3JjL2NoYW5uZWxzL2l0ZXJhdGUtbW9udGguanMiLCJzcmMvY2hhbm5lbHMvdG9nZ2xlLmpzIiwic3JjL2dlbmVyYXRlLW1vbnRoLmpzIiwic3JjL2dldC1kYXRlLmpzIiwic3JjL2dldC1maXJzdC1kYXktb2YtbW9udGguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvaW5pdGlhbGl6ZS1zdGF0ZS5qcyIsInNyYy9tb2R1bG8uanMiLCJzcmMvbW91bnQuanMiLCJzcmMvcmVuZGVyZXJzL2RhdGUtcGlja2VyLmpzIiwic3JjL3JlbmRlcmVycy9oZWFkZXIuanMiLCJzcmMvcmVuZGVyZXJzL3BvcC11cC5qcyIsInNyYy9yZW5kZXJlcnMvdGFibGUtaGVhZC5qcyIsInNyYy9zZXR0aW5ncy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9iZy1CRy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9icy1CQS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9jYS1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9jcy1DWi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9kYS1ESy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9kZS1ERS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lbC1HUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lbi1VUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9lcy1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9ldC1FRS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9ldS1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9mYS1pci5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9maS1GSS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9mci1GUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9nbC1FUy5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oZS1JTC5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oaS1JTi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9oci1IUi5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9odS1IVS5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9pZC1JRC5qc29uIiwic3JjL3RyYW5zbGF0aW9ucy9pbmRleC5qcyIsInNyYy90cmFuc2xhdGlvbnMvaXMtSVMuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvaXQtSVQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvamEtSlAuanNvbiIsInNyYy90cmFuc2xhdGlvbnMva28tS1IuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbHQtTFQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbHYtTFYuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmItTk8uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmUtTlAuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvbmwtTkwuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcGwtUEwuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcHQtQlIuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcHQtUFQuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcm8tUk8uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvcnUtUlUuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc2stU0suanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc2wtU0kuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvc3YtU0UuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdGgtVEguanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdHItVFIuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdWstVUEuanNvbiIsInNyYy90cmFuc2xhdGlvbnMvdmktVk4uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvemgtQ04uanNvbiIsInNyYy90cmFuc2xhdGlvbnMvemgtVFcuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTs7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7QUFDQTs7QUNEQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBOztBQ0FBOztBQ0FBO0FBQ0E7O0FDREE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUE7O0FDQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gaGVhZCAoYSkge1xuICByZXR1cm4gYVswXVxufVxuXG5mdW5jdGlvbiBsYXN0IChhKSB7XG4gIHJldHVybiBhW2EubGVuZ3RoIC0gMV1cbn1cblxuZnVuY3Rpb24gdGFpbChhKSB7XG4gIHJldHVybiBhLnNsaWNlKDEpXG59XG5cbmZ1bmN0aW9uIHJldHJlYXQgKGUpIHtcbiAgcmV0dXJuIGUucG9wKClcbn1cblxuZnVuY3Rpb24gaGFzTGVuZ3RoIChlKSB7XG4gIHJldHVybiBlLmxlbmd0aFxufVxuXG5mdW5jdGlvbiBhbnkoYXJ5LCB0ZXN0KSB7XG4gIGZvcih2YXIgaT0wO2k8YXJ5Lmxlbmd0aDtpKyspXG4gICAgaWYodGVzdChhcnlbaV0pKVxuICAgICAgcmV0dXJuIHRydWVcbiAgcmV0dXJuIGZhbHNlXG59XG5cbmZ1bmN0aW9uIHNjb3JlIChhKSB7XG4gIHJldHVybiBhLnJlZHVjZShmdW5jdGlvbiAocywgYSkge1xuICAgICAgcmV0dXJuIHMgKyBhLmxlbmd0aCArIGFbMV0gKyAxXG4gIH0sIDApXG59XG5cbmZ1bmN0aW9uIGJlc3QgKGEsIGIpIHtcbiAgcmV0dXJuIHNjb3JlKGEpIDw9IHNjb3JlKGIpID8gYSA6IGJcbn1cblxuXG52YXIgX3J1bGVzIC8vIHNldCBhdCB0aGUgYm90dG9tICBcblxuLy8gbm90ZSwgbmFpdmUgaW1wbGVtZW50YXRpb24uIHdpbGwgYnJlYWsgb24gY2lyY3VsYXIgb2JqZWN0cy5cblxuZnVuY3Rpb24gX2VxdWFsKGEsIGIpIHtcbiAgaWYoYSAmJiAhYikgcmV0dXJuIGZhbHNlXG4gIGlmKEFycmF5LmlzQXJyYXkoYSkpXG4gICAgaWYoYS5sZW5ndGggIT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZVxuICBpZihhICYmICdvYmplY3QnID09IHR5cGVvZiBhKSB7XG4gICAgZm9yKHZhciBpIGluIGEpXG4gICAgICBpZighX2VxdWFsKGFbaV0sIGJbaV0pKSByZXR1cm4gZmFsc2VcbiAgICBmb3IodmFyIGkgaW4gYilcbiAgICAgIGlmKCFfZXF1YWwoYVtpXSwgYltpXSkpIHJldHVybiBmYWxzZVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgcmV0dXJuIGEgPT0gYlxufVxuXG5mdW5jdGlvbiBnZXRBcmdzKGFyZ3MpIHtcbiAgcmV0dXJuIGFyZ3MubGVuZ3RoID09IDEgPyBhcmdzWzBdIDogW10uc2xpY2UuY2FsbChhcmdzKVxufVxuXG4vLyByZXR1cm4gdGhlIGluZGV4IG9mIHRoZSBlbGVtZW50IG5vdCBsaWtlIHRoZSBvdGhlcnMsIG9yIC0xXG5mdW5jdGlvbiBvZGRFbGVtZW50KGFyeSwgY21wKSB7XG4gIHZhciBjXG4gIGZ1bmN0aW9uIGd1ZXNzKGEpIHtcbiAgICB2YXIgb2RkID0gLTFcbiAgICBjID0gMFxuICAgIGZvciAodmFyIGkgPSBhOyBpIDwgYXJ5Lmxlbmd0aDsgaSArKykge1xuICAgICAgaWYoIWNtcChhcnlbYV0sIGFyeVtpXSkpIHtcbiAgICAgICAgb2RkID0gaSwgYysrXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjID4gMSA/IC0xIDogb2RkXG4gIH1cbiAgLy9hc3N1bWUgdGhhdCBpdCBpcyB0aGUgZmlyc3QgZWxlbWVudC5cbiAgdmFyIGcgPSBndWVzcygwKVxuICBpZigtMSAhPSBnKSByZXR1cm4gZ1xuICAvLzAgd2FzIHRoZSBvZGQgb25lLCB0aGVuIGFsbCB0aGUgb3RoZXIgZWxlbWVudHMgYXJlIGVxdWFsXG4gIC8vZWxzZSB0aGVyZSBtb3JlIHRoYW4gb25lIGRpZmZlcmVudCBlbGVtZW50XG4gIGd1ZXNzKDEpXG4gIHJldHVybiBjID09IDAgPyAwIDogLTFcbn1cbnZhciBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZGVwcywgZXhwb3J0cykge1xuICB2YXIgZXF1YWwgPSAoZGVwcyAmJiBkZXBzLmVxdWFsKSB8fCBfZXF1YWxcbiAgZXhwb3J0cyA9IGV4cG9ydHMgfHwge30gXG4gIGV4cG9ydHMubGNzID0gXG4gIGZ1bmN0aW9uIGxjcygpIHtcbiAgICB2YXIgY2FjaGUgPSB7fVxuICAgIHZhciBhcmdzID0gZ2V0QXJncyhhcmd1bWVudHMpXG4gICAgdmFyIGEgPSBhcmdzWzBdLCBiID0gYXJnc1sxXVxuXG4gICAgZnVuY3Rpb24ga2V5IChhLGIpe1xuICAgICAgcmV0dXJuIGEubGVuZ3RoICsgJzonICsgYi5sZW5ndGhcbiAgICB9XG5cbiAgICAvL2ZpbmQgbGVuZ3RoIHRoYXQgbWF0Y2hlcyBhdCB0aGUgaGVhZFxuXG4gICAgaWYoYXJncy5sZW5ndGggPiAyKSB7XG4gICAgICAvL2lmIGNhbGxlZCB3aXRoIG11bHRpcGxlIHNlcXVlbmNlc1xuICAgICAgLy9yZWN1cnNlLCBzaW5jZSBsY3MoYSwgYiwgYywgZCkgPT0gbGNzKGxjcyhhLGIpLCBsY3MoYyxkKSlcbiAgICAgIGFyZ3MucHVzaChsY3MoYXJncy5zaGlmdCgpLCBhcmdzLnNoaWZ0KCkpKVxuICAgICAgcmV0dXJuIGxjcyhhcmdzKVxuICAgIH1cbiAgICBcbiAgICAvL3RoaXMgd291bGQgYmUgaW1wcm92ZWQgYnkgdHJ1bmNhdGluZyBpbnB1dCBmaXJzdFxuICAgIC8vYW5kIG5vdCByZXR1cm5pbmcgYW4gbGNzIGFzIGFuIGludGVybWVkaWF0ZSBzdGVwLlxuICAgIC8vdW50aWxsIHRoYXQgaXMgYSBwZXJmb3JtYW5jZSBwcm9ibGVtLlxuXG4gICAgdmFyIHN0YXJ0ID0gMCwgZW5kID0gMFxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aCAmJiBpIDwgYi5sZW5ndGggXG4gICAgICAmJiBlcXVhbChhW2ldLCBiW2ldKVxuICAgICAgOyBpICsrXG4gICAgKVxuICAgICAgc3RhcnQgPSBpICsgMVxuXG4gICAgaWYoYS5sZW5ndGggPT09IHN0YXJ0KVxuICAgICAgcmV0dXJuIGEuc2xpY2UoKVxuXG4gICAgZm9yKHZhciBpID0gMDsgIGkgPCBhLmxlbmd0aCAtIHN0YXJ0ICYmIGkgPCBiLmxlbmd0aCAtIHN0YXJ0XG4gICAgICAmJiBlcXVhbChhW2EubGVuZ3RoIC0gMSAtIGldLCBiW2IubGVuZ3RoIC0gMSAtIGldKVxuICAgICAgOyBpICsrXG4gICAgKVxuICAgICAgZW5kID0gaVxuXG4gICAgZnVuY3Rpb24gcmVjdXJzZSAoYSwgYikge1xuICAgICAgaWYoIWEubGVuZ3RoIHx8ICFiLmxlbmd0aCkgcmV0dXJuIFtdXG4gICAgICAvL2F2b2lkIGV4cG9uZW50aWFsIHRpbWUgYnkgY2FjaGluZyB0aGUgcmVzdWx0c1xuICAgICAgaWYoY2FjaGVba2V5KGEsIGIpXSkgcmV0dXJuIGNhY2hlW2tleShhLCBiKV1cblxuICAgICAgaWYoZXF1YWwoYVswXSwgYlswXSkpXG4gICAgICAgIHJldHVybiBbaGVhZChhKV0uY29uY2F0KHJlY3Vyc2UodGFpbChhKSwgdGFpbChiKSkpXG4gICAgICBlbHNlIHsgXG4gICAgICAgIHZhciBfYSA9IHJlY3Vyc2UodGFpbChhKSwgYilcbiAgICAgICAgdmFyIF9iID0gcmVjdXJzZShhLCB0YWlsKGIpKVxuICAgICAgICByZXR1cm4gY2FjaGVba2V5KGEsYildID0gX2EubGVuZ3RoID4gX2IubGVuZ3RoID8gX2EgOiBfYiAgXG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHZhciBtaWRkbGVBID0gYS5zbGljZShzdGFydCwgYS5sZW5ndGggLSBlbmQpXG4gICAgdmFyIG1pZGRsZUIgPSBiLnNsaWNlKHN0YXJ0LCBiLmxlbmd0aCAtIGVuZClcblxuICAgIHJldHVybiAoXG4gICAgICBhLnNsaWNlKDAsIHN0YXJ0KS5jb25jYXQoXG4gICAgICAgIHJlY3Vyc2UobWlkZGxlQSwgbWlkZGxlQilcbiAgICAgICkuY29uY2F0KGEuc2xpY2UoYS5sZW5ndGggLSBlbmQpKVxuICAgIClcbiAgfVxuXG4gIC8vIGdpdmVuIG4gc2VxdWVuY2VzLCBjYWxjIHRoZSBsY3MsIGFuZCB0aGVuIGNodW5rIHN0cmluZ3MgaW50byBzdGFibGUgYW5kIHVuc3RhYmxlIHNlY3Rpb25zLlxuICAvLyB1bnN0YWJsZSBjaHVua3MgYXJlIHBhc3NlZCB0byBidWlsZFxuICBleHBvcnRzLmNodW5rID1cbiAgZnVuY3Rpb24gKHEsIGJ1aWxkKSB7XG4gICAgdmFyIHEgPSBxLm1hcChmdW5jdGlvbiAoZSkgeyByZXR1cm4gZS5zbGljZSgpIH0pXG4gICAgdmFyIGxjcyA9IGV4cG9ydHMubGNzLmFwcGx5KG51bGwsIHEpXG4gICAgdmFyIGFsbCA9IFtsY3NdLmNvbmNhdChxKVxuXG4gICAgZnVuY3Rpb24gbWF0Y2hMY3MgKGUpIHtcbiAgICAgIGlmKGUubGVuZ3RoICYmICFsY3MubGVuZ3RoIHx8ICFlLmxlbmd0aCAmJiBsY3MubGVuZ3RoKVxuICAgICAgICByZXR1cm4gZmFsc2UgLy9pbmNhc2UgdGhlIGxhc3QgaXRlbSBpcyBudWxsXG4gICAgICByZXR1cm4gZXF1YWwobGFzdChlKSwgbGFzdChsY3MpKSB8fCAoKGUubGVuZ3RoICsgbGNzLmxlbmd0aCkgPT09IDApXG4gICAgfVxuXG4gICAgd2hpbGUoYW55KHEsIGhhc0xlbmd0aCkpIHtcbiAgICAgIC8vaWYgZWFjaCBlbGVtZW50IGlzIGF0IHRoZSBsY3MgdGhlbiB0aGlzIGNodW5rIGlzIHN0YWJsZS5cbiAgICAgIHdoaWxlKHEuZXZlcnkobWF0Y2hMY3MpICYmIHEuZXZlcnkoaGFzTGVuZ3RoKSlcbiAgICAgICAgYWxsLmZvckVhY2gocmV0cmVhdClcbiAgICAgIC8vY29sbGVjdCB0aGUgY2hhbmdlcyBpbiBlYWNoIGFycmF5IHVwdG8gdGhlIG5leHQgbWF0Y2ggd2l0aCB0aGUgbGNzXG4gICAgICB2YXIgYyA9IGZhbHNlXG4gICAgICB2YXIgdW5zdGFibGUgPSBxLm1hcChmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgY2hhbmdlID0gW11cbiAgICAgICAgd2hpbGUoIW1hdGNoTGNzKGUpKSB7XG4gICAgICAgICAgY2hhbmdlLnVuc2hpZnQocmV0cmVhdChlKSlcbiAgICAgICAgICBjID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaGFuZ2VcbiAgICAgIH0pXG4gICAgICBpZihjKSBidWlsZChxWzBdLmxlbmd0aCwgdW5zdGFibGUpXG4gICAgfVxuICB9XG5cbiAgLy9jYWxjdWxhdGUgYSBkaWZmIHRoaXMgaXMgb25seSB1cGRhdGVzXG4gIGV4cG9ydHMub3B0aW1pc3RpY0RpZmYgPVxuICBmdW5jdGlvbiAoYSwgYikge1xuICAgIHZhciBNID0gTWF0aC5tYXgoYS5sZW5ndGgsIGIubGVuZ3RoKVxuICAgIHZhciBtID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKVxuICAgIHZhciBwYXRjaCA9IFtdXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IE07IGkrKylcbiAgICAgIGlmKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgICAgdmFyIGN1ciA9IFtpLDBdLCBkZWxldGVzID0gMFxuICAgICAgICB3aGlsZShhW2ldICE9PSBiW2ldICYmIGkgPCBtKSB7XG4gICAgICAgICAgY3VyWzFdID0gKytkZWxldGVzXG4gICAgICAgICAgY3VyLnB1c2goYltpKytdKVxuICAgICAgICB9XG4gICAgICAgIC8vdGhlIHJlc3QgYXJlIGRlbGV0ZXMgb3IgaW5zZXJ0c1xuICAgICAgICBpZihpID49IG0pIHtcbiAgICAgICAgICAvL3RoZSByZXN0IGFyZSBkZWxldGVzXG4gICAgICAgICAgaWYoYS5sZW5ndGggPiBiLmxlbmd0aClcbiAgICAgICAgICAgIGN1clsxXSArPSBhLmxlbmd0aCAtIGIubGVuZ3RoXG4gICAgICAgICAgLy90aGUgcmVzdCBhcmUgaW5zZXJ0c1xuICAgICAgICAgIGVsc2UgaWYoYS5sZW5ndGggPCBiLmxlbmd0aClcbiAgICAgICAgICAgIGN1ciA9IGN1ci5jb25jYXQoYi5zbGljZShhLmxlbmd0aCkpXG4gICAgICAgIH1cbiAgICAgICAgcGF0Y2gucHVzaChjdXIpXG4gICAgICB9XG5cbiAgICByZXR1cm4gcGF0Y2hcbiAgfVxuXG4gIGV4cG9ydHMuZGlmZiA9XG4gIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgdmFyIG9wdGltaXN0aWMgPSBleHBvcnRzLm9wdGltaXN0aWNEaWZmKGEsIGIpXG4gICAgdmFyIGNoYW5nZXMgPSBbXVxuICAgIGV4cG9ydHMuY2h1bmsoW2EsIGJdLCBmdW5jdGlvbiAoaW5kZXgsIHVuc3RhYmxlKSB7XG4gICAgICB2YXIgZGVsID0gdW5zdGFibGUuc2hpZnQoKS5sZW5ndGhcbiAgICAgIHZhciBpbnNlcnQgPSB1bnN0YWJsZS5zaGlmdCgpXG4gICAgICBjaGFuZ2VzLnB1c2goW2luZGV4LCBkZWxdLmNvbmNhdChpbnNlcnQpKVxuICAgIH0pXG4gICAgcmV0dXJuIGJlc3Qob3B0aW1pc3RpYywgY2hhbmdlcylcbiAgfVxuXG4gIGV4cG9ydHMucGF0Y2ggPSBmdW5jdGlvbiAoYSwgY2hhbmdlcywgbXV0YXRlKSB7XG4gICAgaWYobXV0YXRlICE9PSB0cnVlKSBhID0gYS5zbGljZShhKS8vY29weSBhXG4gICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChjaGFuZ2UpIHtcbiAgICAgIFtdLnNwbGljZS5hcHBseShhLCBjaGFuZ2UpXG4gICAgfSlcbiAgICByZXR1cm4gYVxuICB9XG5cbiAgLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db25jZXN0b3JcbiAgLy8gbWUsIGNvbmNlc3RvciwgeW91Li4uXG4gIGV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBnZXRBcmdzKGFyZ3VtZW50cylcbiAgICB2YXIgcGF0Y2ggPSBleHBvcnRzLmRpZmYzKGFyZ3MpXG4gICAgcmV0dXJuIGV4cG9ydHMucGF0Y2goYXJnc1swXSwgcGF0Y2gpXG4gIH1cblxuICBleHBvcnRzLmRpZmYzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gZ2V0QXJncyhhcmd1bWVudHMpXG4gICAgdmFyIHIgPSBbXVxuICAgIGV4cG9ydHMuY2h1bmsoYXJncywgZnVuY3Rpb24gKGluZGV4LCB1bnN0YWJsZSkge1xuICAgICAgdmFyIG1pbmUgPSB1bnN0YWJsZVswXVxuICAgICAgdmFyIGluc2VydCA9IHJlc29sdmUodW5zdGFibGUpXG4gICAgICBpZihlcXVhbChtaW5lLCBpbnNlcnQpKSByZXR1cm4gXG4gICAgICByLnB1c2goW2luZGV4LCBtaW5lLmxlbmd0aF0uY29uY2F0KGluc2VydCkpIFxuICAgIH0pXG4gICAgcmV0dXJuIHJcbiAgfVxuICBleHBvcnRzLm9kZE9uZU91dCA9XG4gICAgZnVuY3Rpb24gb2RkT25lT3V0IChjaGFuZ2VzKSB7XG4gICAgICBjaGFuZ2VzID0gY2hhbmdlcy5zbGljZSgpXG4gICAgICAvL3B1dCB0aGUgY29uY2VzdG9yIGZpcnN0XG4gICAgICBjaGFuZ2VzLnVuc2hpZnQoY2hhbmdlcy5zcGxpY2UoMSwxKVswXSlcbiAgICAgIHZhciBpID0gb2RkRWxlbWVudChjaGFuZ2VzLCBlcXVhbClcbiAgICAgIGlmKGkgPT0gMCkgLy8gY29uY2VzdG9yIHdhcyBkaWZmZXJlbnQsICdmYWxzZSBjb25mbGljdCdcbiAgICAgICAgcmV0dXJuIGNoYW5nZXNbMV1cbiAgICAgIGlmICh+aSlcbiAgICAgICAgcmV0dXJuIGNoYW5nZXNbaV0gXG4gICAgfVxuICBleHBvcnRzLmluc2VydE1lcmdlT3ZlckRlbGV0ZSA9IFxuICAgIC8vaSd2ZSBpbXBsZW1lbnRlZCB0aGlzIGFzIGEgc2VwZXJhdGUgcnVsZSxcbiAgICAvL2JlY2F1c2UgSSBoYWQgc2Vjb25kIHRob3VnaHRzIGFib3V0IHRoaXMuXG4gICAgZnVuY3Rpb24gaW5zZXJ0TWVyZ2VPdmVyRGVsZXRlIChjaGFuZ2VzKSB7XG4gICAgICBjaGFuZ2VzID0gY2hhbmdlcy5zbGljZSgpXG4gICAgICBjaGFuZ2VzLnNwbGljZSgxLDEpLy8gcmVtb3ZlIGNvbmNlc3RvclxuICAgICAgXG4gICAgICAvL2lmIHRoZXJlIGlzIG9ubHkgb25lIG5vbiBlbXB0eSBjaGFuZ2UgdGhhdHMgb2theS5cbiAgICAgIC8vZWxzZSBmdWxsIGNvbmZpbGN0XG4gICAgICBmb3IgKHZhciBpID0gMCwgbm9uZW1wdHk7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKVxuICAgICAgICBpZihjaGFuZ2VzW2ldLmxlbmd0aCkgXG4gICAgICAgICAgaWYoIW5vbmVtcHR5KSBub25lbXB0eSA9IGNoYW5nZXNbaV1cbiAgICAgICAgICBlbHNlIHJldHVybiAvLyBmdWxsIGNvbmZsaWN0XG4gICAgICByZXR1cm4gbm9uZW1wdHlcbiAgICB9XG5cbiAgdmFyIHJ1bGVzID0gKGRlcHMgJiYgZGVwcy5ydWxlcykgfHwgW2V4cG9ydHMub2RkT25lT3V0LCBleHBvcnRzLmluc2VydE1lcmdlT3ZlckRlbGV0ZV1cblxuICBmdW5jdGlvbiByZXNvbHZlIChjaGFuZ2VzKSB7XG4gICAgdmFyIGwgPSBydWxlcy5sZW5ndGhcbiAgICBmb3IgKHZhciBpIGluIHJ1bGVzKSB7IC8vIGZpcnN0XG4gICAgICBcbiAgICAgIHZhciBjID0gcnVsZXNbaV0gJiYgcnVsZXNbaV0oY2hhbmdlcylcbiAgICAgIGlmKGMpIHJldHVybiBjXG4gICAgfVxuICAgIGNoYW5nZXMuc3BsaWNlKDEsMSkgLy8gcmVtb3ZlIGNvbmNlc3RvclxuICAgIC8vcmV0dXJuaW5nIHRoZSBjb25mbGljdHMgYXMgYW4gb2JqZWN0IGlzIGEgcmVhbGx5IGJhZCBpZGVhLFxuICAgIC8vIGJlY2F1c2UgPT0gd2lsbCBub3QgZGV0ZWN0IHRoZXkgYXJlIHRoZSBzYW1lLiBhbmQgY29uZmxpY3RzIGJ1aWxkLlxuICAgIC8vIGJldHRlciB0byB1c2VcbiAgICAvLyAnPDw8PDw8PDw8PDw8PCdcbiAgICAvLyBvZiBjb3Vyc2UsIGkgd3JvdGUgdGhpcyBiZWZvcmUgaSBzdGFydGVkIG9uIHNub2IsIHNvIGkgZGlkbid0IGtub3cgdGhhdCB0aGVuLlxuICAgIC8qdmFyIGNvbmZsaWN0ID0gWyc+Pj4+Pj4+Pj4+Pj4+Pj4+J11cbiAgICB3aGlsZShjaGFuZ2VzLmxlbmd0aClcbiAgICAgIGNvbmZsaWN0ID0gY29uZmxpY3QuY29uY2F0KGNoYW5nZXMuc2hpZnQoKSkuY29uY2F0KCc9PT09PT09PT09PT0nKVxuICAgIGNvbmZsaWN0LnBvcCgpXG4gICAgY29uZmxpY3QucHVzaCAgICAgICAgICAoJzw8PDw8PDw8PDw8PDw8PCcpXG4gICAgY2hhbmdlcy51bnNoaWZ0ICAgICAgICgnPj4+Pj4+Pj4+Pj4+Pj4+JylcbiAgICByZXR1cm4gY29uZmxpY3QqL1xuICAgIC8vbmFoLCBiZXR0ZXIgaXMganVzdCB0byB1c2UgYW4gZXF1YWwgY2FuIGhhbmRsZSBvYmplY3RzXG4gICAgcmV0dXJuIHsnPyc6IGNoYW5nZXN9XG4gIH1cbiAgcmV0dXJuIGV4cG9ydHNcbn1cbmV4cG9ydHMobnVsbCwgZXhwb3J0cylcbiIsIiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSByZXR1cm4gY2FtZWxDYXNlKG9iaik7XG4gICAgcmV0dXJuIHdhbGsob2JqKTtcbn07XG5cbmZ1bmN0aW9uIHdhbGsgKG9iaikge1xuICAgIGlmICghb2JqIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuICAgIGlmIChpc0RhdGUob2JqKSB8fCBpc1JlZ2V4KG9iaikpIHJldHVybiBvYmo7XG4gICAgaWYgKGlzQXJyYXkob2JqKSkgcmV0dXJuIG1hcChvYmosIHdhbGspO1xuICAgIHJldHVybiByZWR1Y2Uob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbiAgICAgICAgdmFyIGNhbWVsID0gY2FtZWxDYXNlKGtleSk7XG4gICAgICAgIGFjY1tjYW1lbF0gPSB3YWxrKG9ialtrZXldKTtcbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIGNhbWVsQ2FzZShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1tfLi1dKFxcd3wkKS9nLCBmdW5jdGlvbiAoXyx4KSB7XG4gICAgICAgIHJldHVybiB4LnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG59XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxudmFyIGlzRGF0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IERhdGVdJztcbn07XG5cbnZhciBpc1JlZ2V4ID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59O1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAoaGFzLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIGtleXM7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gICAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIHJlZHVjZSAoeHMsIGYsIGFjYykge1xuICAgIGlmICh4cy5yZWR1Y2UpIHJldHVybiB4cy5yZWR1Y2UoZiwgYWNjKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFjYyA9IGYoYWNjLCB4c1tpXSwgaSk7XG4gICAgfVxuICAgIHJldHVybiBhY2M7XG59XG4iLCIvKipcbiAqIGN1aWQuanNcbiAqIENvbGxpc2lvbi1yZXNpc3RhbnQgVUlEIGdlbmVyYXRvciBmb3IgYnJvd3NlcnMgYW5kIG5vZGUuXG4gKiBTZXF1ZW50aWFsIGZvciBmYXN0IGRiIGxvb2t1cHMgYW5kIHJlY2VuY3kgc29ydGluZy5cbiAqIFNhZmUgZm9yIGVsZW1lbnQgSURzIGFuZCBzZXJ2ZXItc2lkZSBsb29rdXBzLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIENMQ1RSXG4gKlxuICogQ29weXJpZ2h0IChjKSBFcmljIEVsbGlvdHQgMjAxMlxuICogTUlUIExpY2Vuc2VcbiAqL1xuXG4vKmdsb2JhbCB3aW5kb3csIG5hdmlnYXRvciwgZG9jdW1lbnQsIHJlcXVpcmUsIHByb2Nlc3MsIG1vZHVsZSAqL1xuKGZ1bmN0aW9uIChhcHApIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgbmFtZXNwYWNlID0gJ2N1aWQnLFxuICAgIGMgPSAwLFxuICAgIGJsb2NrU2l6ZSA9IDQsXG4gICAgYmFzZSA9IDM2LFxuICAgIGRpc2NyZXRlVmFsdWVzID0gTWF0aC5wb3coYmFzZSwgYmxvY2tTaXplKSxcblxuICAgIHBhZCA9IGZ1bmN0aW9uIHBhZChudW0sIHNpemUpIHtcbiAgICAgIHZhciBzID0gXCIwMDAwMDAwMDBcIiArIG51bTtcbiAgICAgIHJldHVybiBzLnN1YnN0cihzLmxlbmd0aC1zaXplKTtcbiAgICB9LFxuXG4gICAgcmFuZG9tQmxvY2sgPSBmdW5jdGlvbiByYW5kb21CbG9jaygpIHtcbiAgICAgIHJldHVybiBwYWQoKE1hdGgucmFuZG9tKCkgKlxuICAgICAgICAgICAgZGlzY3JldGVWYWx1ZXMgPDwgMClcbiAgICAgICAgICAgIC50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcbiAgICB9LFxuXG4gICAgc2FmZUNvdW50ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjID0gKGMgPCBkaXNjcmV0ZVZhbHVlcykgPyBjIDogMDtcbiAgICAgIGMrKzsgLy8gdGhpcyBpcyBub3Qgc3VibGltaW5hbFxuICAgICAgcmV0dXJuIGMgLSAxO1xuICAgIH0sXG5cbiAgICBhcGkgPSBmdW5jdGlvbiBjdWlkKCkge1xuICAgICAgLy8gU3RhcnRpbmcgd2l0aCBhIGxvd2VyY2FzZSBsZXR0ZXIgbWFrZXNcbiAgICAgIC8vIGl0IEhUTUwgZWxlbWVudCBJRCBmcmllbmRseS5cbiAgICAgIHZhciBsZXR0ZXIgPSAnYycsIC8vIGhhcmQtY29kZWQgYWxsb3dzIGZvciBzZXF1ZW50aWFsIGFjY2Vzc1xuXG4gICAgICAgIC8vIHRpbWVzdGFtcFxuICAgICAgICAvLyB3YXJuaW5nOiB0aGlzIGV4cG9zZXMgdGhlIGV4YWN0IGRhdGUgYW5kIHRpbWVcbiAgICAgICAgLy8gdGhhdCB0aGUgdWlkIHdhcyBjcmVhdGVkLlxuICAgICAgICB0aW1lc3RhbXAgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKGJhc2UpLFxuXG4gICAgICAgIC8vIFByZXZlbnQgc2FtZS1tYWNoaW5lIGNvbGxpc2lvbnMuXG4gICAgICAgIGNvdW50ZXIsXG5cbiAgICAgICAgLy8gQSBmZXcgY2hhcnMgdG8gZ2VuZXJhdGUgZGlzdGluY3QgaWRzIGZvciBkaWZmZXJlbnRcbiAgICAgICAgLy8gY2xpZW50cyAoc28gZGlmZmVyZW50IGNvbXB1dGVycyBhcmUgZmFyIGxlc3NcbiAgICAgICAgLy8gbGlrZWx5IHRvIGdlbmVyYXRlIHRoZSBzYW1lIGlkKVxuICAgICAgICBmaW5nZXJwcmludCA9IGFwaS5maW5nZXJwcmludCgpLFxuXG4gICAgICAgIC8vIEdyYWIgc29tZSBtb3JlIGNoYXJzIGZyb20gTWF0aC5yYW5kb20oKVxuICAgICAgICByYW5kb20gPSByYW5kb21CbG9jaygpICsgcmFuZG9tQmxvY2soKTtcblxuICAgICAgICBjb3VudGVyID0gcGFkKHNhZmVDb3VudGVyKCkudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG5cbiAgICAgIHJldHVybiAgKGxldHRlciArIHRpbWVzdGFtcCArIGNvdW50ZXIgKyBmaW5nZXJwcmludCArIHJhbmRvbSk7XG4gICAgfTtcblxuICBhcGkuc2x1ZyA9IGZ1bmN0aW9uIHNsdWcoKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKS50b1N0cmluZygzNiksXG4gICAgICBjb3VudGVyLFxuICAgICAgcHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKS5zbGljZSgwLDEpICtcbiAgICAgICAgYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoLTEpLFxuICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKS5zbGljZSgtMik7XG5cbiAgICAgIGNvdW50ZXIgPSBzYWZlQ291bnRlcigpLnRvU3RyaW5nKDM2KS5zbGljZSgtNCk7XG5cbiAgICByZXR1cm4gZGF0ZS5zbGljZSgtMikgK1xuICAgICAgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xuICB9O1xuXG4gIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uIGdsb2JhbENvdW50KCkge1xuICAgIC8vIFdlIHdhbnQgdG8gY2FjaGUgdGhlIHJlc3VsdHMgb2YgdGhpc1xuICAgIHZhciBjYWNoZSA9IChmdW5jdGlvbiBjYWxjKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICBjb3VudCA9IDA7XG5cbiAgICAgICAgZm9yIChpIGluIHdpbmRvdykge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICB9KCkpO1xuXG4gICAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gY2FjaGU7IH07XG4gICAgcmV0dXJuIGNhY2hlO1xuICB9O1xuXG4gIGFwaS5maW5nZXJwcmludCA9IGZ1bmN0aW9uIGJyb3dzZXJQcmludCgpIHtcbiAgICByZXR1cm4gcGFkKChuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aCArXG4gICAgICBuYXZpZ2F0b3IudXNlckFnZW50Lmxlbmd0aCkudG9TdHJpbmcoMzYpICtcbiAgICAgIGFwaS5nbG9iYWxDb3VudCgpLnRvU3RyaW5nKDM2KSwgNCk7XG4gIH07XG5cbiAgLy8gZG9uJ3QgY2hhbmdlIGFueXRoaW5nIGZyb20gaGVyZSBkb3duLlxuICBpZiAoYXBwLnJlZ2lzdGVyKSB7XG4gICAgYXBwLnJlZ2lzdGVyKG5hbWVzcGFjZSwgYXBpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gYXBpO1xuICB9IGVsc2Uge1xuICAgIGFwcFtuYW1lc3BhY2VdID0gYXBpO1xuICB9XG5cbn0odGhpcy5hcHBsaXR1ZGUgfHwgdGhpcykpO1xuIiwiLypcbiAqIERhdGUgRm9ybWF0IDEuMi4zXG4gKiAoYykgMjAwNy0yMDA5IFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogTUlUIGxpY2Vuc2VcbiAqXG4gKiBJbmNsdWRlcyBlbmhhbmNlbWVudHMgYnkgU2NvdHQgVHJlbmRhIDxzY290dC50cmVuZGEubmV0PlxuICogYW5kIEtyaXMgS293YWwgPGNpeGFyLmNvbS9+a3Jpcy5rb3dhbC8+XG4gKlxuICogQWNjZXB0cyBhIGRhdGUsIGEgbWFzaywgb3IgYSBkYXRlIGFuZCBhIG1hc2suXG4gKiBSZXR1cm5zIGEgZm9ybWF0dGVkIHZlcnNpb24gb2YgdGhlIGdpdmVuIGRhdGUuXG4gKiBUaGUgZGF0ZSBkZWZhdWx0cyB0byB0aGUgY3VycmVudCBkYXRlL3RpbWUuXG4gKiBUaGUgbWFzayBkZWZhdWx0cyB0byBkYXRlRm9ybWF0Lm1hc2tzLmRlZmF1bHQuXG4gKi9cblxuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGRhdGVGb3JtYXQgPSAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdG9rZW4gPSAvZHsxLDR9fG17MSw0fXx5eSg/Onl5KT98KFtIaE1zVHRdKVxcMT98W0xsb1NaV05dfCdbXiddKid8J1teJ10qJy9nO1xuICAgICAgdmFyIHRpbWV6b25lID0gL1xcYig/OltQTUNFQV1bU0RQXVR8KD86UGFjaWZpY3xNb3VudGFpbnxDZW50cmFsfEVhc3Rlcm58QXRsYW50aWMpICg/OlN0YW5kYXJkfERheWxpZ2h0fFByZXZhaWxpbmcpIFRpbWV8KD86R01UfFVUQykoPzpbLStdXFxkezR9KT8pXFxiL2c7XG4gICAgICB2YXIgdGltZXpvbmVDbGlwID0gL1teLStcXGRBLVpdL2c7XG4gIFxuICAgICAgLy8gUmVnZXhlcyBhbmQgc3VwcG9ydGluZyBmdW5jdGlvbnMgYXJlIGNhY2hlZCB0aHJvdWdoIGNsb3N1cmVcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoZGF0ZSwgbWFzaywgdXRjLCBnbXQpIHtcbiAgXG4gICAgICAgIC8vIFlvdSBjYW4ndCBwcm92aWRlIHV0YyBpZiB5b3Ugc2tpcCBvdGhlciBhcmdzICh1c2UgdGhlICdVVEM6JyBtYXNrIHByZWZpeClcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYga2luZE9mKGRhdGUpID09PSAnc3RyaW5nJyAmJiAhL1xcZC8udGVzdChkYXRlKSkge1xuICAgICAgICAgIG1hc2sgPSBkYXRlO1xuICAgICAgICAgIGRhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGRhdGUgPSBkYXRlIHx8IG5ldyBEYXRlO1xuICBcbiAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgICAgICBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGlmIChpc05hTihkYXRlKSkge1xuICAgICAgICAgIHRocm93IFR5cGVFcnJvcignSW52YWxpZCBkYXRlJyk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIG1hc2sgPSBTdHJpbmcoZGF0ZUZvcm1hdC5tYXNrc1ttYXNrXSB8fCBtYXNrIHx8IGRhdGVGb3JtYXQubWFza3NbJ2RlZmF1bHQnXSk7XG4gIFxuICAgICAgICAvLyBBbGxvdyBzZXR0aW5nIHRoZSB1dGMvZ210IGFyZ3VtZW50IHZpYSB0aGUgbWFza1xuICAgICAgICB2YXIgbWFza1NsaWNlID0gbWFzay5zbGljZSgwLCA0KTtcbiAgICAgICAgaWYgKG1hc2tTbGljZSA9PT0gJ1VUQzonIHx8IG1hc2tTbGljZSA9PT0gJ0dNVDonKSB7XG4gICAgICAgICAgbWFzayA9IG1hc2suc2xpY2UoNCk7XG4gICAgICAgICAgdXRjID0gdHJ1ZTtcbiAgICAgICAgICBpZiAobWFza1NsaWNlID09PSAnR01UOicpIHtcbiAgICAgICAgICAgIGdtdCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gIFxuICAgICAgICB2YXIgXyA9IHV0YyA/ICdnZXRVVEMnIDogJ2dldCc7XG4gICAgICAgIHZhciBkID0gZGF0ZVtfICsgJ0RhdGUnXSgpO1xuICAgICAgICB2YXIgRCA9IGRhdGVbXyArICdEYXknXSgpO1xuICAgICAgICB2YXIgbSA9IGRhdGVbXyArICdNb250aCddKCk7XG4gICAgICAgIHZhciB5ID0gZGF0ZVtfICsgJ0Z1bGxZZWFyJ10oKTtcbiAgICAgICAgdmFyIEggPSBkYXRlW18gKyAnSG91cnMnXSgpO1xuICAgICAgICB2YXIgTSA9IGRhdGVbXyArICdNaW51dGVzJ10oKTtcbiAgICAgICAgdmFyIHMgPSBkYXRlW18gKyAnU2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBMID0gZGF0ZVtfICsgJ01pbGxpc2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBvID0gdXRjID8gMCA6IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgdmFyIFcgPSBnZXRXZWVrKGRhdGUpO1xuICAgICAgICB2YXIgTiA9IGdldERheU9mV2VlayhkYXRlKTtcbiAgICAgICAgdmFyIGZsYWdzID0ge1xuICAgICAgICAgIGQ6ICAgIGQsXG4gICAgICAgICAgZGQ6ICAgcGFkKGQpLFxuICAgICAgICAgIGRkZDogIGRhdGVGb3JtYXQuaTE4bi5kYXlOYW1lc1tEXSxcbiAgICAgICAgICBkZGRkOiBkYXRlRm9ybWF0LmkxOG4uZGF5TmFtZXNbRCArIDddLFxuICAgICAgICAgIG06ICAgIG0gKyAxLFxuICAgICAgICAgIG1tOiAgIHBhZChtICsgMSksXG4gICAgICAgICAgbW1tOiAgZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbV0sXG4gICAgICAgICAgbW1tbTogZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbSArIDEyXSxcbiAgICAgICAgICB5eTogICBTdHJpbmcoeSkuc2xpY2UoMiksXG4gICAgICAgICAgeXl5eTogeSxcbiAgICAgICAgICBoOiAgICBIICUgMTIgfHwgMTIsXG4gICAgICAgICAgaGg6ICAgcGFkKEggJSAxMiB8fCAxMiksXG4gICAgICAgICAgSDogICAgSCxcbiAgICAgICAgICBISDogICBwYWQoSCksXG4gICAgICAgICAgTTogICAgTSxcbiAgICAgICAgICBNTTogICBwYWQoTSksXG4gICAgICAgICAgczogICAgcyxcbiAgICAgICAgICBzczogICBwYWQocyksXG4gICAgICAgICAgbDogICAgcGFkKEwsIDMpLFxuICAgICAgICAgIEw6ICAgIHBhZChNYXRoLnJvdW5kKEwgLyAxMCkpLFxuICAgICAgICAgIHQ6ICAgIEggPCAxMiA/ICdhJyAgOiAncCcsXG4gICAgICAgICAgdHQ6ICAgSCA8IDEyID8gJ2FtJyA6ICdwbScsXG4gICAgICAgICAgVDogICAgSCA8IDEyID8gJ0EnICA6ICdQJyxcbiAgICAgICAgICBUVDogICBIIDwgMTIgPyAnQU0nIDogJ1BNJyxcbiAgICAgICAgICBaOiAgICBnbXQgPyAnR01UJyA6IHV0YyA/ICdVVEMnIDogKFN0cmluZyhkYXRlKS5tYXRjaCh0aW1lem9uZSkgfHwgWycnXSkucG9wKCkucmVwbGFjZSh0aW1lem9uZUNsaXAsICcnKSxcbiAgICAgICAgICBvOiAgICAobyA+IDAgPyAnLScgOiAnKycpICsgcGFkKE1hdGguZmxvb3IoTWF0aC5hYnMobykgLyA2MCkgKiAxMDAgKyBNYXRoLmFicyhvKSAlIDYwLCA0KSxcbiAgICAgICAgICBTOiAgICBbJ3RoJywgJ3N0JywgJ25kJywgJ3JkJ11bZCAlIDEwID4gMyA/IDAgOiAoZCAlIDEwMCAtIGQgJSAxMCAhPSAxMCkgKiBkICUgMTBdLFxuICAgICAgICAgIFc6ICAgIFcsXG4gICAgICAgICAgTjogICAgTlxuICAgICAgICB9O1xuICBcbiAgICAgICAgcmV0dXJuIG1hc2sucmVwbGFjZSh0b2tlbiwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICAgICAgaWYgKG1hdGNoIGluIGZsYWdzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmxhZ3NbbWF0Y2hdO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbWF0Y2guc2xpY2UoMSwgbWF0Y2gubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9KSgpO1xuXG4gIGRhdGVGb3JtYXQubWFza3MgPSB7XG4gICAgJ2RlZmF1bHQnOiAgICAgICAgICAgICAgICdkZGQgbW1tIGRkIHl5eXkgSEg6TU06c3MnLFxuICAgICdzaG9ydERhdGUnOiAgICAgICAgICAgICAnbS9kL3l5JyxcbiAgICAnbWVkaXVtRGF0ZSc6ICAgICAgICAgICAgJ21tbSBkLCB5eXl5JyxcbiAgICAnbG9uZ0RhdGUnOiAgICAgICAgICAgICAgJ21tbW0gZCwgeXl5eScsXG4gICAgJ2Z1bGxEYXRlJzogICAgICAgICAgICAgICdkZGRkLCBtbW1tIGQsIHl5eXknLFxuICAgICdzaG9ydFRpbWUnOiAgICAgICAgICAgICAnaDpNTSBUVCcsXG4gICAgJ21lZGl1bVRpbWUnOiAgICAgICAgICAgICdoOk1NOnNzIFRUJyxcbiAgICAnbG9uZ1RpbWUnOiAgICAgICAgICAgICAgJ2g6TU06c3MgVFQgWicsXG4gICAgJ2lzb0RhdGUnOiAgICAgICAgICAgICAgICd5eXl5LW1tLWRkJyxcbiAgICAnaXNvVGltZSc6ICAgICAgICAgICAgICAgJ0hIOk1NOnNzJyxcbiAgICAnaXNvRGF0ZVRpbWUnOiAgICAgICAgICAgJ3l5eXktbW0tZGRcXCdUXFwnSEg6TU06c3NvJyxcbiAgICAnaXNvVXRjRGF0ZVRpbWUnOiAgICAgICAgJ1VUQzp5eXl5LW1tLWRkXFwnVFxcJ0hIOk1NOnNzXFwnWlxcJycsXG4gICAgJ2V4cGlyZXNIZWFkZXJGb3JtYXQnOiAgICdkZGQsIGRkIG1tbSB5eXl5IEhIOk1NOnNzIFonXG4gIH07XG5cbiAgLy8gSW50ZXJuYXRpb25hbGl6YXRpb24gc3RyaW5nc1xuICBkYXRlRm9ybWF0LmkxOG4gPSB7XG4gICAgZGF5TmFtZXM6IFtcbiAgICAgICdTdW4nLCAnTW9uJywgJ1R1ZScsICdXZWQnLCAnVGh1JywgJ0ZyaScsICdTYXQnLFxuICAgICAgJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J1xuICAgIF0sXG4gICAgbW9udGhOYW1lczogW1xuICAgICAgJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJyxcbiAgICAgICdKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ1xuICAgIF1cbiAgfTtcblxuZnVuY3Rpb24gcGFkKHZhbCwgbGVuKSB7XG4gIHZhbCA9IFN0cmluZyh2YWwpO1xuICBsZW4gPSBsZW4gfHwgMjtcbiAgd2hpbGUgKHZhbC5sZW5ndGggPCBsZW4pIHtcbiAgICB2YWwgPSAnMCcgKyB2YWw7XG4gIH1cbiAgcmV0dXJuIHZhbDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIElTTyA4NjAxIHdlZWsgbnVtYmVyXG4gKiBCYXNlZCBvbiBjb21tZW50cyBmcm9tXG4gKiBodHRwOi8vdGVjaGJsb2cucHJvY3VyaW9zLm5sL2svbjYxOC9uZXdzL3ZpZXcvMzM3OTYvMTQ4NjMvQ2FsY3VsYXRlLUlTTy04NjAxLXdlZWstYW5kLXllYXItaW4tamF2YXNjcmlwdC5odG1sXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBgZGF0ZWBcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0V2VlayhkYXRlKSB7XG4gIC8vIFJlbW92ZSB0aW1lIGNvbXBvbmVudHMgb2YgZGF0ZVxuICB2YXIgdGFyZ2V0VGh1cnNkYXkgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCkpO1xuXG4gIC8vIENoYW5nZSBkYXRlIHRvIFRodXJzZGF5IHNhbWUgd2Vla1xuICB0YXJnZXRUaHVyc2RheS5zZXREYXRlKHRhcmdldFRodXJzZGF5LmdldERhdGUoKSAtICgodGFyZ2V0VGh1cnNkYXkuZ2V0RGF5KCkgKyA2KSAlIDcpICsgMyk7XG5cbiAgLy8gVGFrZSBKYW51YXJ5IDR0aCBhcyBpdCBpcyBhbHdheXMgaW4gd2VlayAxIChzZWUgSVNPIDg2MDEpXG4gIHZhciBmaXJzdFRodXJzZGF5ID0gbmV3IERhdGUodGFyZ2V0VGh1cnNkYXkuZ2V0RnVsbFllYXIoKSwgMCwgNCk7XG5cbiAgLy8gQ2hhbmdlIGRhdGUgdG8gVGh1cnNkYXkgc2FtZSB3ZWVrXG4gIGZpcnN0VGh1cnNkYXkuc2V0RGF0ZShmaXJzdFRodXJzZGF5LmdldERhdGUoKSAtICgoZmlyc3RUaHVyc2RheS5nZXREYXkoKSArIDYpICUgNykgKyAzKTtcblxuICAvLyBDaGVjayBpZiBkYXlsaWdodC1zYXZpbmctdGltZS1zd2l0Y2ggb2NjdXJlZCBhbmQgY29ycmVjdCBmb3IgaXRcbiAgdmFyIGRzID0gdGFyZ2V0VGh1cnNkYXkuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIGZpcnN0VGh1cnNkYXkuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgdGFyZ2V0VGh1cnNkYXkuc2V0SG91cnModGFyZ2V0VGh1cnNkYXkuZ2V0SG91cnMoKSAtIGRzKTtcblxuICAvLyBOdW1iZXIgb2Ygd2Vla3MgYmV0d2VlbiB0YXJnZXQgVGh1cnNkYXkgYW5kIGZpcnN0IFRodXJzZGF5XG4gIHZhciB3ZWVrRGlmZiA9ICh0YXJnZXRUaHVyc2RheSAtIGZpcnN0VGh1cnNkYXkpIC8gKDg2NDAwMDAwKjcpO1xuICByZXR1cm4gMSArIE1hdGguZmxvb3Iod2Vla0RpZmYpO1xufVxuXG4vKipcbiAqIEdldCBJU08tODYwMSBudW1lcmljIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkYXkgb2YgdGhlIHdlZWtcbiAqIDEgKGZvciBNb25kYXkpIHRocm91Z2ggNyAoZm9yIFN1bmRheSlcbiAqIFxuICogQHBhcmFtICB7T2JqZWN0fSBgZGF0ZWBcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0RGF5T2ZXZWVrKGRhdGUpIHtcbiAgdmFyIGRvdyA9IGRhdGUuZ2V0RGF5KCk7XG4gIGlmKGRvdyA9PT0gMCkge1xuICAgIGRvdyA9IDc7XG4gIH1cbiAgcmV0dXJuIGRvdztcbn1cblxuLyoqXG4gKiBraW5kLW9mIHNob3J0Y3V0XG4gKiBAcGFyYW0gIHsqfSB2YWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24ga2luZE9mKHZhbCkge1xuICBpZiAodmFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuICdudWxsJztcbiAgfVxuXG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB0eXBlb2YgdmFsO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgIHJldHVybiAnYXJyYXknO1xuICB9XG5cbiAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwodmFsKVxuICAgIC5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcbn07XG5cblxuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGRhdGVGb3JtYXQ7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkYXRlRm9ybWF0O1xuICB9IGVsc2Uge1xuICAgIGdsb2JhbC5kYXRlRm9ybWF0ID0gZGF0ZUZvcm1hdDtcbiAgfVxufSkodGhpcyk7XG4iLCJ2YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZEV2ZW50XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KHRhcmdldCwgdHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbdHlwZV1cblxuICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgZXZlbnRzW3R5cGVdID0gaGFuZGxlclxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgaWYgKGV2ZW50LmluZGV4T2YoaGFuZGxlcikgPT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5wdXNoKGhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ICE9PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IFtldmVudCwgaGFuZGxlcl1cbiAgICB9XG59XG4iLCJ2YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxudmFyIGNyZWF0ZVN0b3JlID0gcmVxdWlyZShcIndlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmVcIilcblxudmFyIGFkZEV2ZW50ID0gcmVxdWlyZShcIi4vYWRkLWV2ZW50LmpzXCIpXG52YXIgcmVtb3ZlRXZlbnQgPSByZXF1aXJlKFwiLi9yZW1vdmUtZXZlbnQuanNcIilcbnZhciBQcm94eUV2ZW50ID0gcmVxdWlyZShcIi4vcHJveHktZXZlbnQuanNcIilcblxudmFyIEhBTkRMRVJfU1RPUkUgPSBjcmVhdGVTdG9yZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRGVsZWdhdG9yXG5cbmZ1bmN0aW9uIERPTURlbGVnYXRvcihkb2N1bWVudCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBET01EZWxlZ2F0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KTtcbiAgICB9XG5cbiAgICBkb2N1bWVudCA9IGRvY3VtZW50IHx8IGdsb2JhbERvY3VtZW50XG5cbiAgICB0aGlzLnRhcmdldCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIHRoaXMuZXZlbnRzID0ge31cbiAgICB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzID0ge31cbiAgICB0aGlzLmdsb2JhbExpc3RlbmVycyA9IHt9XG59XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGFkZEV2ZW50XG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSByZW1vdmVFdmVudFxuXG5ET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPVxuICAgIGZ1bmN0aW9uIGFsbG9jYXRlSGFuZGxlKGZ1bmMpIHtcbiAgICAgICAgdmFyIGhhbmRsZSA9IG5ldyBIYW5kbGUoKVxuXG4gICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlKS5mdW5jID0gZnVuYztcblxuICAgICAgICByZXR1cm4gaGFuZGxlXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID1cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1IYW5kbGUoaGFuZGxlLCBicm9hZGNhc3QpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuY1xuXG4gICAgICAgIHJldHVybiB0aGlzLmFsbG9jYXRlSGFuZGxlKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgYnJvYWRjYXN0KGV2LCBmdW5jKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gYWRkR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuICAgICAgICBpZiAobGlzdGVuZXJzLmluZGV4T2YoZm4pID09PSAtMSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnB1c2goZm4pXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdID0gbGlzdGVuZXJzO1xuICAgIH1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiByZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZm4pIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICAgICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YoZm4pXG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUubGlzdGVuVG8gPSBmdW5jdGlvbiBsaXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0rKztcblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdICE9PSAxKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMucmF3RXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPVxuICAgICAgICAgICAgY3JlYXRlSGFuZGxlcihldmVudE5hbWUsIHRoaXMpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnVubGlzdGVuVG8gPSBmdW5jdGlvbiB1bmxpc3RlblRvKGV2ZW50TmFtZSkge1xuICAgIGlmICghKGV2ZW50TmFtZSBpbiB0aGlzLmV2ZW50cykpIHtcbiAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSB1bmxpc3RlbmVkIHRvIGV2ZW50LlwiKTtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdLS07XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cblxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZG9tLWRlbGVnYXRvciN1bmxpc3RlblRvOiBjYW5ub3QgXCIgK1xuICAgICAgICAgICAgXCJ1bmxpc3RlbiB0byBcIiArIGV2ZW50TmFtZSlcbiAgICB9XG5cbiAgICB0aGlzLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCBkZWxlZ2F0b3IpIHtcbiAgICB2YXIgZ2xvYmFsTGlzdGVuZXJzID0gZGVsZWdhdG9yLmdsb2JhbExpc3RlbmVycztcbiAgICB2YXIgZGVsZWdhdG9yVGFyZ2V0ID0gZGVsZWdhdG9yLnRhcmdldDtcblxuICAgIHJldHVybiBoYW5kbGVyXG5cbiAgICBmdW5jdGlvbiBoYW5kbGVyKGV2KSB7XG4gICAgICAgIHZhciBnbG9iYWxIYW5kbGVycyA9IGdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdXG5cbiAgICAgICAgaWYgKGdsb2JhbEhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBnbG9iYWxFdmVudCA9IG5ldyBQcm94eUV2ZW50KGV2KTtcbiAgICAgICAgICAgIGdsb2JhbEV2ZW50LmN1cnJlbnRUYXJnZXQgPSBkZWxlZ2F0b3JUYXJnZXQ7XG4gICAgICAgICAgICBjYWxsTGlzdGVuZXJzKGdsb2JhbEhhbmRsZXJzLCBnbG9iYWxFdmVudClcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZXYudGFyZ2V0LCBldiwgZXZlbnROYW1lKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmluZEFuZEludm9rZUxpc3RlbmVycyhlbGVtLCBldiwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gZ2V0TGlzdGVuZXIoZWxlbSwgZXZlbnROYW1lKVxuXG4gICAgaWYgKGxpc3RlbmVyICYmIGxpc3RlbmVyLmhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGxpc3RlbmVyRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgIGxpc3RlbmVyRXZlbnQuY3VycmVudFRhcmdldCA9IGxpc3RlbmVyLmN1cnJlbnRUYXJnZXRcbiAgICAgICAgY2FsbExpc3RlbmVycyhsaXN0ZW5lci5oYW5kbGVycywgbGlzdGVuZXJFdmVudClcblxuICAgICAgICBpZiAobGlzdGVuZXJFdmVudC5fYnViYmxlcykge1xuICAgICAgICAgICAgdmFyIG5leHRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0LnBhcmVudE5vZGVcbiAgICAgICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMobmV4dFRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0TGlzdGVuZXIodGFyZ2V0LCB0eXBlKSB7XG4gICAgLy8gdGVybWluYXRlIHJlY3Vyc2lvbiBpZiBwYXJlbnQgaXMgYG51bGxgXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0eXBlb2YgdGFyZ2V0ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIC8vIGZldGNoIGxpc3Qgb2YgaGFuZGxlciBmbnMgZm9yIHRoaXMgZXZlbnRcbiAgICB2YXIgaGFuZGxlciA9IGV2ZW50c1t0eXBlXVxuICAgIHZhciBhbGxIYW5kbGVyID0gZXZlbnRzLmV2ZW50XG5cbiAgICBpZiAoIWhhbmRsZXIgJiYgIWFsbEhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuIGdldExpc3RlbmVyKHRhcmdldC5wYXJlbnROb2RlLCB0eXBlKVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyA9IFtdLmNvbmNhdChoYW5kbGVyIHx8IFtdLCBhbGxIYW5kbGVyIHx8IFtdKVxuICAgIHJldHVybiBuZXcgTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycylcbn1cblxuZnVuY3Rpb24gY2FsbExpc3RlbmVycyhoYW5kbGVycywgZXYpIHtcbiAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyKGV2KVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyLmhhbmRsZUV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlRXZlbnQoZXYpXG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlci50eXBlID09PSBcImRvbS1kZWxlZ2F0b3ItaGFuZGxlXCIpIHtcbiAgICAgICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlcikuZnVuYyhldilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3I6IHVua25vd24gaGFuZGxlciBcIiArXG4gICAgICAgICAgICAgICAgXCJmb3VuZDogXCIgKyBKU09OLnN0cmluZ2lmeShoYW5kbGVycykpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxuZnVuY3Rpb24gTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycykge1xuICAgIHRoaXMuY3VycmVudFRhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVyc1xufVxuXG5mdW5jdGlvbiBIYW5kbGUoKSB7XG4gICAgdGhpcy50eXBlID0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiXG59XG4iLCJ2YXIgSW5kaXZpZHVhbCA9IHJlcXVpcmUoXCJpbmRpdmlkdWFsXCIpXG52YXIgY3VpZCA9IHJlcXVpcmUoXCJjdWlkXCIpXG52YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBET01EZWxlZ2F0b3IgPSByZXF1aXJlKFwiLi9kb20tZGVsZWdhdG9yLmpzXCIpXG5cbnZhciB2ZXJzaW9uS2V5ID0gXCIxM1wiXG52YXIgY2FjaGVLZXkgPSBcIl9fRE9NX0RFTEVHQVRPUl9DQUNIRUBcIiArIHZlcnNpb25LZXlcbnZhciBjYWNoZVRva2VuS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVfVE9LRU5AXCIgKyB2ZXJzaW9uS2V5XG52YXIgZGVsZWdhdG9yQ2FjaGUgPSBJbmRpdmlkdWFsKGNhY2hlS2V5LCB7XG4gICAgZGVsZWdhdG9yczoge31cbn0pXG52YXIgY29tbW9uRXZlbnRzID0gW1xuICAgIFwiYmx1clwiLCBcImNoYW5nZVwiLCBcImNsaWNrXCIsICBcImNvbnRleHRtZW51XCIsIFwiZGJsY2xpY2tcIixcbiAgICBcImVycm9yXCIsXCJmb2N1c1wiLCBcImZvY3VzaW5cIiwgXCJmb2N1c291dFwiLCBcImlucHV0XCIsIFwia2V5ZG93blwiLFxuICAgIFwia2V5cHJlc3NcIiwgXCJrZXl1cFwiLCBcImxvYWRcIiwgXCJtb3VzZWRvd25cIiwgXCJtb3VzZXVwXCIsXG4gICAgXCJyZXNpemVcIiwgXCJzZWxlY3RcIiwgXCJzdWJtaXRcIiwgXCJ0b3VjaGNhbmNlbFwiLFxuICAgIFwidG91Y2hlbmRcIiwgXCJ0b3VjaHN0YXJ0XCIsIFwidW5sb2FkXCJcbl1cblxuLyogIERlbGVnYXRvciBpcyBhIHRoaW4gd3JhcHBlciBhcm91bmQgYSBzaW5nbGV0b24gYERPTURlbGVnYXRvcmBcbiAgICAgICAgaW5zdGFuY2UuXG5cbiAgICBPbmx5IG9uZSBET01EZWxlZ2F0b3Igc2hvdWxkIGV4aXN0IGJlY2F1c2Ugd2UgZG8gbm90IHdhbnRcbiAgICAgICAgZHVwbGljYXRlIGV2ZW50IGxpc3RlbmVycyBib3VuZCB0byB0aGUgRE9NLlxuXG4gICAgYERlbGVnYXRvcmAgd2lsbCBhbHNvIGBsaXN0ZW5UbygpYCBhbGwgZXZlbnRzIHVubGVzc1xuICAgICAgICBldmVyeSBjYWxsZXIgb3B0cyBvdXQgb2YgaXRcbiovXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRvclxuXG5mdW5jdGlvbiBEZWxlZ2F0b3Iob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdmFyIGRvY3VtZW50ID0gb3B0cy5kb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdmFyIGNhY2hlS2V5ID0gZG9jdW1lbnRbY2FjaGVUb2tlbktleV1cblxuICAgIGlmICghY2FjaGVLZXkpIHtcbiAgICAgICAgY2FjaGVLZXkgPVxuICAgICAgICAgICAgZG9jdW1lbnRbY2FjaGVUb2tlbktleV0gPSBjdWlkKClcbiAgICB9XG5cbiAgICB2YXIgZGVsZWdhdG9yID0gZGVsZWdhdG9yQ2FjaGUuZGVsZWdhdG9yc1tjYWNoZUtleV1cblxuICAgIGlmICghZGVsZWdhdG9yKSB7XG4gICAgICAgIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldID1cbiAgICAgICAgICAgIG5ldyBET01EZWxlZ2F0b3IoZG9jdW1lbnQpXG4gICAgfVxuXG4gICAgaWYgKG9wdHMuZGVmYXVsdEV2ZW50cyAhPT0gZmFsc2UpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21tb25FdmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGRlbGVnYXRvci5saXN0ZW5Ubyhjb21tb25FdmVudHNbaV0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVsZWdhdG9yXG59XG5cbkRlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZSA9IERPTURlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZTtcbkRlbGVnYXRvci50cmFuc2Zvcm1IYW5kbGUgPSBET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlO1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZShcImluaGVyaXRzXCIpXG5cbnZhciBBTExfUFJPUFMgPSBbXG4gICAgXCJhbHRLZXlcIiwgXCJidWJibGVzXCIsIFwiY2FuY2VsYWJsZVwiLCBcImN0cmxLZXlcIixcbiAgICBcImV2ZW50UGhhc2VcIiwgXCJtZXRhS2V5XCIsIFwicmVsYXRlZFRhcmdldFwiLCBcInNoaWZ0S2V5XCIsXG4gICAgXCJ0YXJnZXRcIiwgXCJ0aW1lU3RhbXBcIiwgXCJ0eXBlXCIsIFwidmlld1wiLCBcIndoaWNoXCJcbl1cbnZhciBLRVlfUFJPUFMgPSBbXCJjaGFyXCIsIFwiY2hhckNvZGVcIiwgXCJrZXlcIiwgXCJrZXlDb2RlXCJdXG52YXIgTU9VU0VfUFJPUFMgPSBbXG4gICAgXCJidXR0b25cIiwgXCJidXR0b25zXCIsIFwiY2xpZW50WFwiLCBcImNsaWVudFlcIiwgXCJsYXllclhcIixcbiAgICBcImxheWVyWVwiLCBcIm9mZnNldFhcIiwgXCJvZmZzZXRZXCIsIFwicGFnZVhcIiwgXCJwYWdlWVwiLFxuICAgIFwic2NyZWVuWFwiLCBcInNjcmVlbllcIiwgXCJ0b0VsZW1lbnRcIlxuXVxuXG52YXIgcmtleUV2ZW50ID0gL15rZXl8aW5wdXQvXG52YXIgcm1vdXNlRXZlbnQgPSAvXig/Om1vdXNlfHBvaW50ZXJ8Y29udGV4dG1lbnUpfGNsaWNrL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb3h5RXZlbnRcblxuZnVuY3Rpb24gUHJveHlFdmVudChldikge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm94eUV2ZW50KSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3h5RXZlbnQoZXYpXG4gICAgfVxuXG4gICAgaWYgKHJrZXlFdmVudC50ZXN0KGV2LnR5cGUpKSB7XG4gICAgICAgIHJldHVybiBuZXcgS2V5RXZlbnQoZXYpXG4gICAgfSBlbHNlIGlmIChybW91c2VFdmVudC50ZXN0KGV2LnR5cGUpKSB7XG4gICAgICAgIHJldHVybiBuZXcgTW91c2VFdmVudChldilcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG4gICAgdGhpcy5fYnViYmxlcyA9IGZhbHNlO1xufVxuXG5Qcm94eUV2ZW50LnByb3RvdHlwZS5wcmV2ZW50RGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9yYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpXG59XG5cblByb3h5RXZlbnQucHJvdG90eXBlLnN0YXJ0UHJvcGFnYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYnViYmxlcyA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIE1vdXNlRXZlbnQoZXYpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IE1PVVNFX1BST1BTLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBtb3VzZVByb3BLZXkgPSBNT1VTRV9QUk9QU1tqXVxuICAgICAgICB0aGlzW21vdXNlUHJvcEtleV0gPSBldlttb3VzZVByb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxufVxuXG5pbmhlcml0cyhNb3VzZUV2ZW50LCBQcm94eUV2ZW50KVxuXG5mdW5jdGlvbiBLZXlFdmVudChldikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQUxMX1BST1BTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wS2V5ID0gQUxMX1BST1BTW2ldXG4gICAgICAgIHRoaXNbcHJvcEtleV0gPSBldltwcm9wS2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgS0VZX1BST1BTLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBrZXlQcm9wS2V5ID0gS0VZX1BST1BTW2pdXG4gICAgICAgIHRoaXNba2V5UHJvcEtleV0gPSBldltrZXlQcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbn1cblxuaW5oZXJpdHMoS2V5RXZlbnQsIFByb3h5RXZlbnQpXG4iLCJ2YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbW92ZUV2ZW50XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50KHRhcmdldCwgdHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbdHlwZV1cblxuICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGV2ZW50KSkge1xuICAgICAgICB2YXIgaW5kZXggPSBldmVudC5pbmRleE9mKGhhbmRsZXIpXG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGV2ZW50LnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZXZlbnQgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgZXZlbnRzW3R5cGVdID0gbnVsbFxuICAgIH1cbn1cbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuXG5tb2R1bGUuZXhwb3J0cyA9IGl0ZXJhdGl2ZWx5V2Fsa1xuXG5mdW5jdGlvbiBpdGVyYXRpdmVseVdhbGsobm9kZXMsIGNiKSB7XG4gICAgaWYgKCEoJ2xlbmd0aCcgaW4gbm9kZXMpKSB7XG4gICAgICAgIG5vZGVzID0gW25vZGVzXVxuICAgIH1cbiAgICBcbiAgICBub2RlcyA9IHNsaWNlLmNhbGwobm9kZXMpXG5cbiAgICB3aGlsZShub2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlcy5zaGlmdCgpLFxuICAgICAgICAgICAgcmV0ID0gY2Iobm9kZSlcblxuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZE5vZGVzICYmIG5vZGUuY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5vZGVzID0gc2xpY2UuY2FsbChub2RlLmNoaWxkTm9kZXMpLmNvbmNhdChub2RlcylcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciBjYW1lbGl6ZSA9IHJlcXVpcmUoXCJjYW1lbGl6ZVwiKVxudmFyIHRlbXBsYXRlID0gcmVxdWlyZShcInN0cmluZy10ZW1wbGF0ZVwiKVxudmFyIGV4dGVuZCA9IHJlcXVpcmUoXCJ4dGVuZC9tdXRhYmxlXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVHlwZWRFcnJvclxuXG5mdW5jdGlvbiBUeXBlZEVycm9yKGFyZ3MpIHtcbiAgICBpZiAoIWFyZ3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXJncyBpcyByZXF1aXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKCFhcmdzLnR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXJncy50eXBlIGlzIHJlcXVpcmVkXCIpO1xuICAgIH1cbiAgICBpZiAoIWFyZ3MubWVzc2FnZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhcmdzLm1lc3NhZ2UgaXMgcmVxdWlyZWRcIik7XG4gICAgfVxuXG4gICAgdmFyIG1lc3NhZ2UgPSBhcmdzLm1lc3NhZ2VcblxuICAgIGlmIChhcmdzLnR5cGUgJiYgIWFyZ3MubmFtZSkge1xuICAgICAgICB2YXIgZXJyb3JOYW1lID0gY2FtZWxpemUoYXJncy50eXBlKSArIFwiRXJyb3JcIlxuICAgICAgICBhcmdzLm5hbWUgPSBlcnJvck5hbWVbMF0udG9VcHBlckNhc2UoKSArIGVycm9yTmFtZS5zdWJzdHIoMSlcbiAgICB9XG5cbiAgICBleHRlbmQoY3JlYXRlRXJyb3IsIGFyZ3MpO1xuICAgIGNyZWF0ZUVycm9yLl9uYW1lID0gYXJncy5uYW1lO1xuXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlRXJyb3Iob3B0cykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEVycm9yKClcblxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVzdWx0LCBcInR5cGVcIiwge1xuICAgICAgICAgICAgdmFsdWU6IHJlc3VsdC50eXBlLFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pXG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBleHRlbmQoe30sIGFyZ3MsIG9wdHMpXG5cbiAgICAgICAgZXh0ZW5kKHJlc3VsdCwgb3B0aW9ucylcbiAgICAgICAgcmVzdWx0Lm1lc3NhZ2UgPSB0ZW1wbGF0ZShtZXNzYWdlLCBvcHRpb25zKVxuXG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE9uZVZlcnNpb25Db25zdHJhaW50ID0gcmVxdWlyZSgnaW5kaXZpZHVhbC9vbmUtdmVyc2lvbicpO1xuXG52YXIgTVlfVkVSU0lPTiA9ICc3Jztcbk9uZVZlcnNpb25Db25zdHJhaW50KCdldi1zdG9yZScsIE1ZX1ZFUlNJT04pO1xuXG52YXIgaGFzaEtleSA9ICdfX0VWX1NUT1JFX0tFWUAnICsgTVlfVkVSU0lPTjtcblxubW9kdWxlLmV4cG9ydHMgPSBFdlN0b3JlO1xuXG5mdW5jdGlvbiBFdlN0b3JlKGVsZW0pIHtcbiAgICB2YXIgaGFzaCA9IGVsZW1baGFzaEtleV07XG5cbiAgICBpZiAoIWhhc2gpIHtcbiAgICAgICAgaGFzaCA9IGVsZW1baGFzaEtleV0gPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzaDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypnbG9iYWwgd2luZG93LCBnbG9iYWwqL1xuXG52YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbDtcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGtleSBpbiByb290KSB7XG4gICAgICAgIHJldHVybiByb290W2tleV07XG4gICAgfVxuXG4gICAgcm9vdFtrZXldID0gdmFsdWU7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBJbmRpdmlkdWFsID0gcmVxdWlyZSgnLi9pbmRleC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9uZVZlcnNpb247XG5cbmZ1bmN0aW9uIE9uZVZlcnNpb24obW9kdWxlTmFtZSwgdmVyc2lvbiwgZGVmYXVsdFZhbHVlKSB7XG4gICAgdmFyIGtleSA9ICdfX0lORElWSURVQUxfT05FX1ZFUlNJT05fJyArIG1vZHVsZU5hbWU7XG4gICAgdmFyIGVuZm9yY2VLZXkgPSBrZXkgKyAnX0VORk9SQ0VfU0lOR0xFVE9OJztcblxuICAgIHZhciB2ZXJzaW9uVmFsdWUgPSBJbmRpdmlkdWFsKGVuZm9yY2VLZXksIHZlcnNpb24pO1xuXG4gICAgaWYgKHZlcnNpb25WYWx1ZSAhPT0gdmVyc2lvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGhhdmUgb25lIGNvcHkgb2YgJyArXG4gICAgICAgICAgICBtb2R1bGVOYW1lICsgJy5cXG4nICtcbiAgICAgICAgICAgICdZb3UgYWxyZWFkeSBoYXZlIHZlcnNpb24gJyArIHZlcnNpb25WYWx1ZSArXG4gICAgICAgICAgICAnIGluc3RhbGxlZC5cXG4nICtcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHlvdSBjYW5ub3QgaW5zdGFsbCB2ZXJzaW9uICcgKyB2ZXJzaW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gSW5kaXZpZHVhbChrZXksIGRlZmF1bHRWYWx1ZSk7XG59XG4iLCJ2YXIgd2FsayA9IHJlcXVpcmUoJ2RvbS13YWxrJylcblxudmFyIEZvcm1EYXRhID0gcmVxdWlyZSgnLi9pbmRleC5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Rm9ybURhdGFcblxuZnVuY3Rpb24gYnVpbGRFbGVtcyhyb290RWxlbSkge1xuICAgIHZhciBoYXNoID0ge31cbiAgICBpZiAocm9vdEVsZW0ubmFtZSkge1xuICAgIFx0aGFzaFtyb290RWxlbS5uYW1lXSA9IHJvb3RFbGVtXG4gICAgfVxuXG4gICAgd2Fsayhyb290RWxlbSwgZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGlmIChjaGlsZC5uYW1lKSB7XG4gICAgICAgICAgICBoYXNoW2NoaWxkLm5hbWVdID0gY2hpbGRcbiAgICAgICAgfVxuICAgIH0pXG5cblxuICAgIHJldHVybiBoYXNoXG59XG5cbmZ1bmN0aW9uIGdldEZvcm1EYXRhKHJvb3RFbGVtKSB7XG4gICAgdmFyIGVsZW1lbnRzID0gYnVpbGRFbGVtcyhyb290RWxlbSlcblxuICAgIHJldHVybiBGb3JtRGF0YShlbGVtZW50cylcbn1cbiIsIi8qanNoaW50IG1heGNvbXBsZXhpdHk6IDEwKi9cblxubW9kdWxlLmV4cG9ydHMgPSBGb3JtRGF0YVxuXG4vL1RPRE86IE1hc3NpdmUgc3BlYzogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvYXNzb2NpYXRpb24tb2YtY29udHJvbHMtYW5kLWZvcm1zLmh0bWwjY29uc3RydWN0aW5nLWZvcm0tZGF0YS1zZXRcbmZ1bmN0aW9uIEZvcm1EYXRhKGVsZW1lbnRzKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGVsZW1lbnRzKS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywga2V5KSB7XG4gICAgICAgIHZhciBlbGVtID0gZWxlbWVudHNba2V5XVxuXG4gICAgICAgIGFjY1trZXldID0gdmFsdWVPZkVsZW1lbnQoZWxlbSlcblxuICAgICAgICByZXR1cm4gYWNjXG4gICAgfSwge30pXG59XG5cbmZ1bmN0aW9uIHZhbHVlT2ZFbGVtZW50KGVsZW0pIHtcbiAgICBpZiAodHlwZW9mIGVsZW0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gZWxlbSgpXG4gICAgfSBlbHNlIGlmIChjb250YWluc1JhZGlvKGVsZW0pKSB7XG4gICAgICAgIHZhciBlbGVtcyA9IHRvTGlzdChlbGVtKVxuICAgICAgICB2YXIgY2hlY2tlZCA9IGVsZW1zLmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0uY2hlY2tlZFxuICAgICAgICB9KVswXSB8fCBudWxsXG5cbiAgICAgICAgcmV0dXJuIGNoZWNrZWQgPyBjaGVja2VkLnZhbHVlIDogbnVsbFxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShlbGVtKSkge1xuICAgICAgICByZXR1cm4gZWxlbS5tYXAodmFsdWVPZkVsZW1lbnQpLmZpbHRlcihmaWx0ZXJOdWxsKVxuICAgIH0gZWxzZSBpZiAoZWxlbS50YWdOYW1lID09PSB1bmRlZmluZWQgJiYgZWxlbS5ub2RlVHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBGb3JtRGF0YShlbGVtKVxuICAgIH0gZWxzZSBpZiAoZWxlbS50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgaXNDaGVja2VkKGVsZW0pKSB7XG4gICAgICAgIGlmIChlbGVtLmhhc0F0dHJpYnV0ZShcInZhbHVlXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbS5jaGVja2VkID8gZWxlbS52YWx1ZSA6IG51bGxcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtLmNoZWNrZWRcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZWxlbS50YWdOYW1lID09PSBcIklOUFVUXCIpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0udmFsdWVcbiAgICB9IGVsc2UgaWYgKGVsZW0udGFnTmFtZSA9PT0gXCJURVhUQVJFQVwiKSB7XG4gICAgICAgIHJldHVybiBlbGVtLnZhbHVlXG4gICAgfSBlbHNlIGlmIChlbGVtLnRhZ05hbWUgPT09IFwiU0VMRUNUXCIpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0udmFsdWVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlzQ2hlY2tlZChlbGVtKSB7XG4gICAgcmV0dXJuIGVsZW0udHlwZSA9PT0gXCJjaGVja2JveFwiIHx8IGVsZW0udHlwZSA9PT0gXCJyYWRpb1wiXG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zUmFkaW8odmFsdWUpIHtcbiAgICBpZiAodmFsdWUudGFnTmFtZSB8fCB2YWx1ZS5ub2RlVHlwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgZWxlbXMgPSB0b0xpc3QodmFsdWUpXG5cbiAgICByZXR1cm4gZWxlbXMuc29tZShmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbS50YWdOYW1lID09PSBcIklOUFVUXCIgJiYgZWxlbS50eXBlID09PSBcInJhZGlvXCJcbiAgICB9KVxufVxuXG5mdW5jdGlvbiB0b0xpc3QodmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5tYXAocHJvcCwgdmFsdWUpXG59XG5cbmZ1bmN0aW9uIHByb3AoeCkge1xuICAgIHJldHVybiB0aGlzW3hdXG59XG5cbmZ1bmN0aW9uIGZpbHRlck51bGwodmFsKSB7XG4gICAgcmV0dXJuIHZhbCAhPT0gbnVsbFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBFdmVudFxuXG5mdW5jdGlvbiBFdmVudCgpIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gW11cblxuICAgIHJldHVybiB7IGJyb2FkY2FzdDogYnJvYWRjYXN0LCBsaXN0ZW46IGV2ZW50IH1cblxuICAgIGZ1bmN0aW9uIGJyb2FkY2FzdCh2YWx1ZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGlzdGVuZXJzW2ldKHZhbHVlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXZlbnQobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpXG5cbiAgICAgICAgcmV0dXJuIHJlbW92ZUxpc3RlbmVyXG5cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcilcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIGV2ZW50ID0gcmVxdWlyZShcIi4vc2luZ2xlLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gbXVsdGlwbGVcblxuZnVuY3Rpb24gbXVsdGlwbGUobmFtZXMpIHtcbiAgICByZXR1cm4gbmFtZXMucmVkdWNlKGZ1bmN0aW9uIChhY2MsIG5hbWUpIHtcbiAgICAgICAgYWNjW25hbWVdID0gZXZlbnQoKVxuICAgICAgICByZXR1cm4gYWNjXG4gICAgfSwge30pXG59XG4iLCJ2YXIgRXZlbnQgPSByZXF1aXJlKCcuL2V2ZW50LmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBTaW5nbGVcblxuZnVuY3Rpb24gU2luZ2xlKCkge1xuICAgIHZhciB0dXBsZSA9IEV2ZW50KClcblxuICAgIHJldHVybiBmdW5jdGlvbiBldmVudCh2YWx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0dXBsZS5saXN0ZW4odmFsdWUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHVwbGUuYnJvYWRjYXN0KHZhbHVlKVxuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsInZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsXG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChyb290W2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XVxuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyb290LCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcblxuICAgIHJldHVybiB2YWx1ZVxufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc09iamVjdCh4KSB7XG5cdHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsO1xufTtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlQ2FsbGJhY2tgIHdoaWNoIG9ubHkgc3VwcG9ydHMgYHRoaXNgIGJpbmRpbmdcbiAqIGFuZCBzcGVjaWZ5aW5nIHRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRvIHByb3ZpZGUgdG8gYGZ1bmNgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBiaW5kLlxuICogQHBhcmFtIHsqfSB0aGlzQXJnIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgZnVuY2AuXG4gKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgY2FsbGJhY2suXG4gKi9cbmZ1bmN0aW9uIGJpbmRDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBpZGVudGl0eTtcbiAgfVxuICBpZiAodGhpc0FyZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbiAgc3dpdGNoIChhcmdDb3VudCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgICB9O1xuICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgIH07XG4gICAgY2FzZSA0OiByZXR1cm4gZnVuY3Rpb24oYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICB9O1xuICAgIGNhc2UgNTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBvdGhlciwga2V5LCBvYmplY3QsIHNvdXJjZSkge1xuICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgb3RoZXIsIGtleSwgb2JqZWN0LCBzb3VyY2UpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2QgcmV0dXJucyB0aGUgZmlyc3QgYXJndW1lbnQgcHJvdmlkZWQgdG8gaXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIGB2YWx1ZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICd1c2VyJzogJ2ZyZWQnIH07XG4gKlxuICogXy5pZGVudGl0eShvYmplY3QpID09PSBvYmplY3Q7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kQ2FsbGJhY2s7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuMyAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGJpbmRDYWxsYmFjayA9IHJlcXVpcmUoJ2xvZGFzaC5fYmluZGNhbGxiYWNrJyk7XG5cbi8qIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlRmxvb3IgPSBNYXRoLmZsb29yLFxuICAgIG5hdGl2ZUlzRmluaXRlID0gZ2xvYmFsLmlzRmluaXRlLFxuICAgIG5hdGl2ZU1pbiA9IE1hdGgubWluO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB0aGUgbWF4aW11bSBsZW5ndGggYW5kIGluZGV4IG9mIGFuIGFycmF5LiAqL1xudmFyIE1BWF9BUlJBWV9MRU5HVEggPSA0Mjk0OTY3Mjk1O1xuXG4vKipcbiAqIEludm9rZXMgdGhlIGl0ZXJhdGVlIGZ1bmN0aW9uIGBuYCB0aW1lcywgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHRoZSByZXN1bHRzXG4gKiBvZiBlYWNoIGludm9jYXRpb24uIFRoZSBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoXG4gKiBvbmUgYXJndW1lbnQ7IChpbmRleCkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIGludm9rZSBgaXRlcmF0ZWVgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2l0ZXJhdGVlPV8uaWRlbnRpdHldIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGl0ZXJhdGVlYC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcmVzdWx0cy5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIGRpY2VSb2xscyA9IF8udGltZXMoMywgXy5wYXJ0aWFsKF8ucmFuZG9tLCAxLCA2LCBmYWxzZSkpO1xuICogLy8gPT4gWzMsIDYsIDRdXG4gKlxuICogXy50aW1lcygzLCBmdW5jdGlvbihuKSB7XG4gKiAgIG1hZ2UuY2FzdFNwZWxsKG4pO1xuICogfSk7XG4gKiAvLyA9PiBpbnZva2VzIGBtYWdlLmNhc3RTcGVsbChuKWAgdGhyZWUgdGltZXMgd2l0aCBgbmAgb2YgYDBgLCBgMWAsIGFuZCBgMmBcbiAqXG4gKiBfLnRpbWVzKDMsIGZ1bmN0aW9uKG4pIHtcbiAqICAgdGhpcy5jYXN0KG4pO1xuICogfSwgbWFnZSk7XG4gKiAvLyA9PiBhbHNvIGludm9rZXMgYG1hZ2UuY2FzdFNwZWxsKG4pYCB0aHJlZSB0aW1lc1xuICovXG5mdW5jdGlvbiB0aW1lcyhuLCBpdGVyYXRlZSwgdGhpc0FyZykge1xuICBuID0gbmF0aXZlRmxvb3Iobik7XG5cbiAgLy8gRXhpdCBlYXJseSB0byBhdm9pZCBhIEpTQyBKSVQgYnVnIGluIFNhZmFyaSA4XG4gIC8vIHdoZXJlIGBBcnJheSgwKWAgaXMgdHJlYXRlZCBhcyBgQXJyYXkoMSlgLlxuICBpZiAobiA8IDEgfHwgIW5hdGl2ZUlzRmluaXRlKG4pKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHZhciBpbmRleCA9IC0xLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobmF0aXZlTWluKG4sIE1BWF9BUlJBWV9MRU5HVEgpKTtcblxuICBpdGVyYXRlZSA9IGJpbmRDYWxsYmFjayhpdGVyYXRlZSwgdGhpc0FyZywgMSk7XG4gIHdoaWxlICgrK2luZGV4IDwgbikge1xuICAgIGlmIChpbmRleCA8IE1BWF9BUlJBWV9MRU5HVEgpIHtcbiAgICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShpbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlKGluZGV4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0aW1lcztcbiIsInZhciByYWYgPSByZXF1aXJlKFwicmFmXCIpXG52YXIgVHlwZWRFcnJvciA9IHJlcXVpcmUoXCJlcnJvci90eXBlZFwiKVxuXG52YXIgSW52YWxpZFVwZGF0ZUluUmVuZGVyID0gVHlwZWRFcnJvcih7XG4gICAgdHlwZTogXCJtYWluLWxvb3AuaW52YWxpZC51cGRhdGUuaW4tcmVuZGVyXCIsXG4gICAgbWVzc2FnZTogXCJtYWluLWxvb3A6IFVuZXhwZWN0ZWQgdXBkYXRlIG9jY3VycmVkIGluIGxvb3AuXFxuXCIgK1xuICAgICAgICBcIldlIGFyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGEgdmlldywgXCIgK1xuICAgICAgICAgICAgXCJ5b3UgY2FuJ3QgY2hhbmdlIHN0YXRlIHJpZ2h0IG5vdy5cXG5cIiArXG4gICAgICAgIFwiVGhlIGRpZmYgaXM6IHtzdHJpbmdEaWZmfS5cXG5cIiArXG4gICAgICAgIFwiU1VHR0VTVEVEIEZJWDogZmluZCB0aGUgc3RhdGUgbXV0YXRpb24gaW4geW91ciB2aWV3IFwiICtcbiAgICAgICAgICAgIFwib3IgcmVuZGVyaW5nIGZ1bmN0aW9uIGFuZCByZW1vdmUgaXQuXFxuXCIgK1xuICAgICAgICBcIlRoZSB2aWV3IHNob3VsZCBub3QgaGF2ZSBhbnkgc2lkZSBlZmZlY3RzLlxcblwiLFxuICAgIGRpZmY6IG51bGwsXG4gICAgc3RyaW5nRGlmZjogbnVsbFxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBtYWluXG5cbmZ1bmN0aW9uIG1haW4oaW5pdGlhbFN0YXRlLCB2aWV3LCBvcHRzKSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge31cblxuICAgIHZhciBjdXJyZW50U3RhdGUgPSBpbml0aWFsU3RhdGVcbiAgICB2YXIgY3JlYXRlID0gb3B0cy5jcmVhdGVcbiAgICB2YXIgZGlmZiA9IG9wdHMuZGlmZlxuICAgIHZhciBwYXRjaCA9IG9wdHMucGF0Y2hcbiAgICB2YXIgcmVkcmF3U2NoZWR1bGVkID0gZmFsc2VcblxuICAgIHZhciB0cmVlID0gb3B0cy5pbml0aWFsVHJlZSB8fCB2aWV3KGN1cnJlbnRTdGF0ZSlcbiAgICB2YXIgdGFyZ2V0ID0gb3B0cy50YXJnZXQgfHwgY3JlYXRlKHRyZWUsIG9wdHMpXG4gICAgdmFyIGluUmVuZGVyaW5nVHJhbnNhY3Rpb24gPSBmYWxzZVxuXG4gICAgY3VycmVudFN0YXRlID0gbnVsbFxuXG4gICAgdmFyIGxvb3AgPSB7XG4gICAgICAgIHN0YXRlOiBpbml0aWFsU3RhdGUsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0LFxuICAgICAgICB1cGRhdGU6IHVwZGF0ZVxuICAgIH1cbiAgICByZXR1cm4gbG9vcFxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHN0YXRlKSB7XG4gICAgICAgIGlmIChpblJlbmRlcmluZ1RyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBJbnZhbGlkVXBkYXRlSW5SZW5kZXIoe1xuICAgICAgICAgICAgICAgIGRpZmY6IHN0YXRlLl9kaWZmLFxuICAgICAgICAgICAgICAgIHN0cmluZ0RpZmY6IEpTT04uc3RyaW5naWZ5KHN0YXRlLl9kaWZmKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50U3RhdGUgPT09IG51bGwgJiYgIXJlZHJhd1NjaGVkdWxlZCkge1xuICAgICAgICAgICAgcmVkcmF3U2NoZWR1bGVkID0gdHJ1ZVxuICAgICAgICAgICAgcmFmKHJlZHJhdylcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTdGF0ZSA9IHN0YXRlXG4gICAgICAgIGxvb3Auc3RhdGUgPSBzdGF0ZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZHJhdygpIHtcbiAgICAgICAgcmVkcmF3U2NoZWR1bGVkID0gZmFsc2VcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBpblJlbmRlcmluZ1RyYW5zYWN0aW9uID0gdHJ1ZVxuICAgICAgICB2YXIgbmV3VHJlZSA9IHZpZXcoY3VycmVudFN0YXRlKVxuXG4gICAgICAgIGlmIChvcHRzLmNyZWF0ZU9ubHkpIHtcbiAgICAgICAgICAgIGluUmVuZGVyaW5nVHJhbnNhY3Rpb24gPSBmYWxzZVxuICAgICAgICAgICAgY3JlYXRlKG5ld1RyZWUsIG9wdHMpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcGF0Y2hlcyA9IGRpZmYodHJlZSwgbmV3VHJlZSwgb3B0cylcbiAgICAgICAgICAgIGluUmVuZGVyaW5nVHJhbnNhY3Rpb24gPSBmYWxzZVxuICAgICAgICAgICAgdGFyZ2V0ID0gcGF0Y2godGFyZ2V0LCBwYXRjaGVzLCBvcHRzKVxuICAgICAgICB9XG5cbiAgICAgICAgdHJlZSA9IG5ld1RyZWVcbiAgICAgICAgY3VycmVudFN0YXRlID0gbnVsbFxuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFNpbmdsZUV2ZW50ID0gcmVxdWlyZSgnZ2V2YWwvc2luZ2xlJyk7XG52YXIgTXVsdGlwbGVFdmVudCA9IHJlcXVpcmUoJ2dldmFsL211bHRpcGxlJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcblxuLypcbiAgICBQcm8gdGlwOiBEb24ndCByZXF1aXJlIGBtZXJjdXJ5YCBpdHNlbGYuXG4gICAgICByZXF1aXJlIGFuZCBkZXBlbmQgb24gYWxsIHRoZXNlIG1vZHVsZXMgZGlyZWN0bHkhXG4qL1xudmFyIG1lcmN1cnkgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLyBFbnRyeVxuICAgIG1haW46IHJlcXVpcmUoJ21haW4tbG9vcCcpLFxuICAgIGFwcDogYXBwLFxuXG4gICAgLy8gQmFzZVxuICAgIEJhc2VFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQvYmFzZS1ldmVudCcpLFxuXG4gICAgLy8gSW5wdXRcbiAgICBEZWxlZ2F0b3I6IHJlcXVpcmUoJ2RvbS1kZWxlZ2F0b3InKSxcbiAgICAvLyBkZXByZWNhdGVkOiB1c2UgaGcuY2hhbm5lbHMgaW5zdGVhZC5cbiAgICBpbnB1dDogaW5wdXQsXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLmNoYW5uZWxzIGluc3RlYWQuXG4gICAgaGFuZGxlczogY2hhbm5lbHMsXG4gICAgY2hhbm5lbHM6IGNoYW5uZWxzLFxuICAgIC8vIGRlcHJlY2F0ZWQ6IHVzZSBoZy5zZW5kIGluc3RlYWQuXG4gICAgZXZlbnQ6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2V2ZW50JyksXG4gICAgc2VuZDogcmVxdWlyZSgndmFsdWUtZXZlbnQvZXZlbnQnKSxcbiAgICAvLyBkZXByZWNhdGVkOiB1c2UgaGcuc2VuZFZhbHVlIGluc3RlYWQuXG4gICAgdmFsdWVFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQvdmFsdWUnKSxcbiAgICBzZW5kVmFsdWU6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L3ZhbHVlJyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLnNlbmRTdWJtaXQgaW5zdGVhZC5cbiAgICBzdWJtaXRFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQvc3VibWl0JyksXG4gICAgc2VuZFN1Ym1pdDogcmVxdWlyZSgndmFsdWUtZXZlbnQvc3VibWl0JyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLnNlbmRDaGFuZ2UgaW5zdGVhZC5cbiAgICBjaGFuZ2VFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQvY2hhbmdlJyksXG4gICAgc2VuZENoYW5nZTogcmVxdWlyZSgndmFsdWUtZXZlbnQvY2hhbmdlJyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLnNlbmRLZXkgaW5zdGVhZC5cbiAgICBrZXlFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQva2V5JyksXG4gICAgc2VuZEtleTogcmVxdWlyZSgndmFsdWUtZXZlbnQva2V5JyksXG4gICAgLy8gZGVwcmVjYXRlZCB1c2UgaGcuc2VuZENsaWNrIGluc3RlYWQuXG4gICAgY2xpY2tFdmVudDogcmVxdWlyZSgndmFsdWUtZXZlbnQvY2xpY2snKSxcbiAgICBzZW5kQ2xpY2s6IHJlcXVpcmUoJ3ZhbHVlLWV2ZW50L2NsaWNrJyksXG5cbiAgICAvLyBTdGF0ZVxuICAgIC8vIHJlbW92ZSBmcm9tIGNvcmU6IGZhdm9yIGhnLnZhcmhhc2ggaW5zdGVhZC5cbiAgICBhcnJheTogcmVxdWlyZSgnb2JzZXJ2LWFycmF5JyksXG4gICAgc3RydWN0OiByZXF1aXJlKCdvYnNlcnYtc3RydWN0JyksXG4gICAgLy8gZGVwcmVjYXRlZDogdXNlIGhnLnN0cnVjdCBpbnN0ZWFkLlxuICAgIGhhc2g6IHJlcXVpcmUoJ29ic2Vydi1zdHJ1Y3QnKSxcbiAgICB2YXJoYXNoOiByZXF1aXJlKCdvYnNlcnYtdmFyaGFzaCcpLFxuICAgIHZhbHVlOiByZXF1aXJlKCdvYnNlcnYnKSxcbiAgICBzdGF0ZTogc3RhdGUsXG5cbiAgICAvLyBSZW5kZXJcbiAgICBkaWZmOiByZXF1aXJlKCd2aXJ0dWFsLWRvbS92dHJlZS9kaWZmJyksXG4gICAgcGF0Y2g6IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3Zkb20vcGF0Y2gnKSxcbiAgICBwYXJ0aWFsOiByZXF1aXJlKCd2ZG9tLXRodW5rJyksXG4gICAgY3JlYXRlOiByZXF1aXJlKCd2aXJ0dWFsLWRvbS92ZG9tL2NyZWF0ZS1lbGVtZW50JyksXG4gICAgaDogcmVxdWlyZSgndmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdCcpLFxuXG4gICAgLy8gVXRpbGl0aWVzXG4gICAgLy8gcmVtb3ZlIGZyb20gY29yZTogcmVxdWlyZSBjb21wdXRlZCBkaXJlY3RseSBpbnN0ZWFkLlxuICAgIGNvbXB1dGVkOiByZXF1aXJlKCdvYnNlcnYvY29tcHV0ZWQnKSxcbiAgICAvLyByZW1vdmUgZnJvbSBjb3JlOiByZXF1aXJlIHdhdGNoIGRpcmVjdGx5IGluc3RlYWQuXG4gICAgd2F0Y2g6IHJlcXVpcmUoJ29ic2Vydi93YXRjaCcpXG59O1xuXG5mdW5jdGlvbiBpbnB1dChuYW1lcykge1xuICAgIGlmICghbmFtZXMpIHtcbiAgICAgICAgcmV0dXJuIFNpbmdsZUV2ZW50KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE11bHRpcGxlRXZlbnQobmFtZXMpO1xufVxuXG5mdW5jdGlvbiBzdGF0ZShvYmopIHtcbiAgICB2YXIgY29weSA9IGV4dGVuZChvYmopO1xuICAgIHZhciAkY2hhbm5lbHMgPSBjb3B5LmNoYW5uZWxzO1xuICAgIHZhciAkaGFuZGxlcyA9IGNvcHkuaGFuZGxlcztcblxuICAgIGlmICgkY2hhbm5lbHMpIHtcbiAgICAgICAgY29weS5jaGFubmVscyA9IG1lcmN1cnkudmFsdWUobnVsbCk7XG4gICAgfSBlbHNlIGlmICgkaGFuZGxlcykge1xuICAgICAgICBjb3B5LmhhbmRsZXMgPSBtZXJjdXJ5LnZhbHVlKG51bGwpO1xuICAgIH1cblxuICAgIHZhciBvYnNlcnYgPSBtZXJjdXJ5LnN0cnVjdChjb3B5KTtcbiAgICBpZiAoJGNoYW5uZWxzKSB7XG4gICAgICAgIG9ic2Vydi5jaGFubmVscy5zZXQobWVyY3VyeS5jaGFubmVscygkY2hhbm5lbHMsIG9ic2VydikpO1xuICAgIH0gZWxzZSBpZiAoJGhhbmRsZXMpIHtcbiAgICAgICAgb2JzZXJ2LmhhbmRsZXMuc2V0KG1lcmN1cnkuY2hhbm5lbHMoJGhhbmRsZXMsIG9ic2VydikpO1xuICAgIH1cbiAgICByZXR1cm4gb2JzZXJ2O1xufVxuXG5mdW5jdGlvbiBjaGFubmVscyhmdW5jcywgY29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhmdW5jcykucmVkdWNlKGNyZWF0ZUhhbmRsZSwge30pO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlSGFuZGxlKGFjYywgbmFtZSkge1xuICAgICAgICB2YXIgaGFuZGxlID0gbWVyY3VyeS5EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUoXG4gICAgICAgICAgICBmdW5jc1tuYW1lXS5iaW5kKG51bGwsIGNvbnRleHQpKTtcblxuICAgICAgICBhY2NbbmFtZV0gPSBoYW5kbGU7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhcHAoZWxlbSwgb2JzZXJ2LCByZW5kZXIsIG9wdHMpIHtcbiAgICBtZXJjdXJ5LkRlbGVnYXRvcihvcHRzKTtcbiAgICB2YXIgbG9vcCA9IG1lcmN1cnkubWFpbihvYnNlcnYoKSwgcmVuZGVyLCBleHRlbmQoe1xuICAgICAgICBkaWZmOiBtZXJjdXJ5LmRpZmYsXG4gICAgICAgIGNyZWF0ZTogbWVyY3VyeS5jcmVhdGUsXG4gICAgICAgIHBhdGNoOiBtZXJjdXJ5LnBhdGNoXG4gICAgfSwgb3B0cykpO1xuICAgIGlmIChlbGVtKSB7XG4gICAgICAgIGVsZW0uYXBwZW5kQ2hpbGQobG9vcC50YXJnZXQpO1xuICAgIH1cbiAgICByZXR1cm4gb2JzZXJ2KGxvb3AudXBkYXRlKTtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG1vbnRoLCB5ZWFyKSB7XG5cdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXHRtb250aCA9IG1vbnRoID09IG51bGwgPyBub3cuZ2V0VVRDTW9udGgoKSA6IG1vbnRoO1xuXHR5ZWFyID0geWVhciA9PSBudWxsID8gbm93LmdldFVUQ0Z1bGxZZWFyKCkgOiB5ZWFyO1xuXG5cdHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCArIDEsIDApKS5nZXRVVENEYXRlKCk7XG59O1xuIiwidmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKFwiLi9saWIvc2V0LW5vbi1lbnVtZXJhYmxlLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZExpc3RlbmVyXG5cbmZ1bmN0aW9uIGFkZExpc3RlbmVyKG9ic2VydkFycmF5LCBvYnNlcnYpIHtcbiAgICB2YXIgbGlzdCA9IG9ic2VydkFycmF5Ll9saXN0XG5cbiAgICByZXR1cm4gb2JzZXJ2KGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgdmFsdWVMaXN0ID0gIG9ic2VydkFycmF5KCkuc2xpY2UoKVxuICAgICAgICB2YXIgaW5kZXggPSBsaXN0LmluZGV4T2Yob2JzZXJ2KVxuXG4gICAgICAgIC8vIFRoaXMgY29kZSBwYXRoIHNob3VsZCBuZXZlciBoaXQuIElmIHRoaXMgaGFwcGVuc1xuICAgICAgICAvLyB0aGVyZSdzIGEgYnVnIGluIHRoZSBjbGVhbnVwIGNvZGVcbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIm9ic2Vydi1hcnJheTogVW5yZW1vdmVkIG9ic2VydiBsaXN0ZW5lclwiXG4gICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKG1lc3NhZ2UpXG4gICAgICAgICAgICBlcnIubGlzdCA9IGxpc3RcbiAgICAgICAgICAgIGVyci5pbmRleCA9IGluZGV4XG4gICAgICAgICAgICBlcnIub2JzZXJ2ID0gb2JzZXJ2XG4gICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbHVlTGlzdC5zcGxpY2UoaW5kZXgsIDEsIHZhbHVlKVxuICAgICAgICBzZXROb25FbnVtZXJhYmxlKHZhbHVlTGlzdCwgXCJfZGlmZlwiLCBbIFtpbmRleCwgMSwgdmFsdWVdIF0pXG5cbiAgICAgICAgb2JzZXJ2QXJyYXkuX29ic2VydlNldCh2YWx1ZUxpc3QpXG4gICAgfSlcbn1cbiIsInZhciBhZGRMaXN0ZW5lciA9IHJlcXVpcmUoJy4vYWRkLWxpc3RlbmVyLmpzJylcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVBhdGNoXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2ggKHZhbHVlTGlzdCwgYXJncykge1xuICAgIHZhciBvYnMgPSB0aGlzXG4gICAgdmFyIHZhbHVlQXJncyA9IGFyZ3MubWFwKHVucGFjaylcblxuICAgIHZhbHVlTGlzdC5zcGxpY2UuYXBwbHkodmFsdWVMaXN0LCB2YWx1ZUFyZ3MpXG4gICAgb2JzLl9saXN0LnNwbGljZS5hcHBseShvYnMuX2xpc3QsIGFyZ3MpXG5cbiAgICB2YXIgZXh0cmFSZW1vdmVMaXN0ZW5lcnMgPSBhcmdzLnNsaWNlKDIpLm1hcChmdW5jdGlvbiAob2JzZXJ2KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2Ygb2JzZXJ2ID09PSBcImZ1bmN0aW9uXCIgP1xuICAgICAgICAgICAgYWRkTGlzdGVuZXIob2JzLCBvYnNlcnYpIDpcbiAgICAgICAgICAgIG51bGxcbiAgICB9KVxuXG4gICAgZXh0cmFSZW1vdmVMaXN0ZW5lcnMudW5zaGlmdChhcmdzWzBdLCBhcmdzWzFdKVxuICAgIHZhciByZW1vdmVkTGlzdGVuZXJzID0gb2JzLl9yZW1vdmVMaXN0ZW5lcnMuc3BsaWNlXG4gICAgICAgIC5hcHBseShvYnMuX3JlbW92ZUxpc3RlbmVycywgZXh0cmFSZW1vdmVMaXN0ZW5lcnMpXG5cbiAgICByZW1vdmVkTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKHJlbW92ZU9ic2Vydkxpc3RlbmVyKSB7XG4gICAgICAgIGlmIChyZW1vdmVPYnNlcnZMaXN0ZW5lcikge1xuICAgICAgICAgICAgcmVtb3ZlT2JzZXJ2TGlzdGVuZXIoKVxuICAgICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB2YWx1ZUFyZ3Ncbn1cblxuZnVuY3Rpb24gdW5wYWNrKHZhbHVlLCBpbmRleCl7XG4gICAgaWYgKGluZGV4ID09PSAwIHx8IGluZGV4ID09PSAxKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyB2YWx1ZSgpIDogdmFsdWVcbn1cbiIsInZhciBPYnNlcnZBcnJheSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpXG5cbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZVxuXG52YXIgQVJSQVlfTUVUSE9EUyA9IFtcbiAgICBcImNvbmNhdFwiLCBcInNsaWNlXCIsIFwiZXZlcnlcIiwgXCJmaWx0ZXJcIiwgXCJmb3JFYWNoXCIsIFwiaW5kZXhPZlwiLFxuICAgIFwiam9pblwiLCBcImxhc3RJbmRleE9mXCIsIFwibWFwXCIsIFwicmVkdWNlXCIsIFwicmVkdWNlUmlnaHRcIixcbiAgICBcInNvbWVcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCJcbl1cblxudmFyIG1ldGhvZHMgPSBBUlJBWV9NRVRIT0RTLm1hcChmdW5jdGlvbiAobmFtZSkge1xuICAgIHJldHVybiBbbmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVzID0gdGhpcy5fbGlzdFtuYW1lXS5hcHBseSh0aGlzLl9saXN0LCBhcmd1bWVudHMpXG5cbiAgICAgICAgaWYgKHJlcyAmJiBBcnJheS5pc0FycmF5KHJlcykpIHtcbiAgICAgICAgICAgIHJlcyA9IE9ic2VydkFycmF5KHJlcylcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNcbiAgICB9XVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSBBcnJheU1ldGhvZHNcblxuZnVuY3Rpb24gQXJyYXlNZXRob2RzKG9icykge1xuICAgIG9icy5wdXNoID0gb2JzZXJ2QXJyYXlQdXNoXG4gICAgb2JzLnBvcCA9IG9ic2VydkFycmF5UG9wXG4gICAgb2JzLnNoaWZ0ID0gb2JzZXJ2QXJyYXlTaGlmdFxuICAgIG9icy51bnNoaWZ0ID0gb2JzZXJ2QXJyYXlVbnNoaWZ0XG4gICAgb2JzLnJldmVyc2UgPSByZXF1aXJlKFwiLi9hcnJheS1yZXZlcnNlLmpzXCIpXG4gICAgb2JzLnNvcnQgPSByZXF1aXJlKFwiLi9hcnJheS1zb3J0LmpzXCIpXG5cbiAgICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKHR1cGxlKSB7XG4gICAgICAgIG9ic1t0dXBsZVswXV0gPSB0dXBsZVsxXVxuICAgIH0pXG4gICAgcmV0dXJuIG9ic1xufVxuXG5cblxuZnVuY3Rpb24gb2JzZXJ2QXJyYXlQdXNoKCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgYXJncy51bnNoaWZ0KHRoaXMuX2xpc3QubGVuZ3RoLCAwKVxuICAgIHRoaXMuc3BsaWNlLmFwcGx5KHRoaXMsIGFyZ3MpXG5cbiAgICByZXR1cm4gdGhpcy5fbGlzdC5sZW5ndGhcbn1cbmZ1bmN0aW9uIG9ic2VydkFycmF5UG9wKCkge1xuICAgIHJldHVybiB0aGlzLnNwbGljZSh0aGlzLl9saXN0Lmxlbmd0aCAtIDEsIDEpWzBdXG59XG5mdW5jdGlvbiBvYnNlcnZBcnJheVNoaWZ0KCkge1xuICAgIHJldHVybiB0aGlzLnNwbGljZSgwLCAxKVswXVxufVxuZnVuY3Rpb24gb2JzZXJ2QXJyYXlVbnNoaWZ0KCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgYXJncy51bnNoaWZ0KDAsIDApXG4gICAgdGhpcy5zcGxpY2UuYXBwbHkodGhpcywgYXJncylcblxuICAgIHJldHVybiB0aGlzLl9saXN0Lmxlbmd0aFxufVxuXG5cbmZ1bmN0aW9uIG5vdEltcGxlbWVudGVkKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlB1bGwgcmVxdWVzdCB3ZWxjb21lXCIpXG59XG4iLCJ2YXIgYXBwbHlQYXRjaCA9IHJlcXVpcmUoXCIuL2FwcGx5LXBhdGNoLmpzXCIpXG52YXIgc2V0Tm9uRW51bWVyYWJsZSA9IHJlcXVpcmUoJy4vbGliL3NldC1ub24tZW51bWVyYWJsZS5qcycpXG5cbm1vZHVsZS5leHBvcnRzID0gcmV2ZXJzZVxuXG5mdW5jdGlvbiByZXZlcnNlKCkge1xuICAgIHZhciBvYnMgPSB0aGlzXG4gICAgdmFyIGNoYW5nZXMgPSBmYWtlRGlmZihvYnMuX2xpc3Quc2xpY2UoKS5yZXZlcnNlKCkpXG4gICAgdmFyIHZhbHVlTGlzdCA9IG9icygpLnNsaWNlKCkucmV2ZXJzZSgpXG5cbiAgICB2YXIgdmFsdWVDaGFuZ2VzID0gY2hhbmdlcy5tYXAoYXBwbHlQYXRjaC5iaW5kKG9icywgdmFsdWVMaXN0KSlcblxuICAgIHNldE5vbkVudW1lcmFibGUodmFsdWVMaXN0LCBcIl9kaWZmXCIsIHZhbHVlQ2hhbmdlcylcblxuICAgIG9icy5fb2JzZXJ2U2V0KHZhbHVlTGlzdClcbiAgICByZXR1cm4gY2hhbmdlc1xufVxuXG5mdW5jdGlvbiBmYWtlRGlmZihhcnIpIHtcbiAgICB2YXIgX2RpZmZcbiAgICB2YXIgbGVuID0gYXJyLmxlbmd0aFxuXG4gICAgaWYobGVuICUgMikge1xuICAgICAgICB2YXIgbWlkUG9pbnQgPSAobGVuIC0xKSAvIDJcbiAgICAgICAgdmFyIGEgPSBbMCwgbWlkUG9pbnRdLmNvbmNhdChhcnIuc2xpY2UoMCwgbWlkUG9pbnQpKVxuICAgICAgICB2YXIgYiA9IFttaWRQb2ludCArMSwgbWlkUG9pbnRdLmNvbmNhdChhcnIuc2xpY2UobWlkUG9pbnQgKzEsIGxlbikpXG4gICAgICAgIHZhciBfZGlmZiA9IFthLCBiXVxuICAgIH0gZWxzZSB7XG4gICAgICAgIF9kaWZmID0gWyBbMCwgbGVuXS5jb25jYXQoYXJyKSBdXG4gICAgfVxuXG4gICAgcmV0dXJuIF9kaWZmXG59XG4iLCJ2YXIgYXBwbHlQYXRjaCA9IHJlcXVpcmUoXCIuL2FwcGx5LXBhdGNoLmpzXCIpXG52YXIgc2V0Tm9uRW51bWVyYWJsZSA9IHJlcXVpcmUoXCIuL2xpYi9zZXQtbm9uLWVudW1lcmFibGUuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBzb3J0XG5cbmZ1bmN0aW9uIHNvcnQoY29tcGFyZSkge1xuICAgIHZhciBvYnMgPSB0aGlzXG4gICAgdmFyIGxpc3QgPSBvYnMuX2xpc3Quc2xpY2UoKVxuXG4gICAgdmFyIHVucGFja2VkID0gdW5wYWNrKGxpc3QpXG5cbiAgICB2YXIgc29ydGVkID0gdW5wYWNrZWRcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oaXQpIHsgcmV0dXJuIGl0LnZhbCB9KVxuICAgICAgICAgICAgLnNvcnQoY29tcGFyZSlcblxuICAgIHZhciBwYWNrZWQgPSByZXBhY2soc29ydGVkLCB1bnBhY2tlZClcblxuICAgIC8vZmFrZSBkaWZmIC0gZm9yIHBlcmZcbiAgICAvL2FkaWZmIG9uIDEwayBpdGVtcyA9PT0gfjMyMDBtc1xuICAgIC8vZmFrZSBvbiAxMGsgaXRlbXMgPT09IH4xMTBtc1xuICAgIHZhciBjaGFuZ2VzID0gWyBbIDAsIHBhY2tlZC5sZW5ndGggXS5jb25jYXQocGFja2VkKSBdXG5cbiAgICB2YXIgdmFsdWVDaGFuZ2VzID0gY2hhbmdlcy5tYXAoYXBwbHlQYXRjaC5iaW5kKG9icywgc29ydGVkKSlcblxuICAgIHNldE5vbkVudW1lcmFibGUoc29ydGVkLCBcIl9kaWZmXCIsIHZhbHVlQ2hhbmdlcylcblxuICAgIG9icy5fb2JzZXJ2U2V0KHNvcnRlZClcbiAgICByZXR1cm4gY2hhbmdlc1xufVxuXG5mdW5jdGlvbiB1bnBhY2sobGlzdCkge1xuICAgIHZhciB1bnBhY2tlZCA9IFtdXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdW5wYWNrZWQucHVzaCh7XG4gICAgICAgICAgICB2YWw6IChcImZ1bmN0aW9uXCIgPT0gdHlwZW9mIGxpc3RbaV0pID8gbGlzdFtpXSgpIDogbGlzdFtpXSxcbiAgICAgICAgICAgIG9iajogbGlzdFtpXVxuICAgICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gdW5wYWNrZWRcbn1cblxuZnVuY3Rpb24gcmVwYWNrKHNvcnRlZCwgdW5wYWNrZWQpIHtcbiAgICB2YXIgcGFja2VkID0gW11cblxuICAgIHdoaWxlKHNvcnRlZC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHMgPSBzb3J0ZWQuc2hpZnQoKVxuICAgICAgICB2YXIgaW5keCA9IGluZGV4T2YocywgdW5wYWNrZWQpXG4gICAgICAgIGlmKH5pbmR4KSBwYWNrZWQucHVzaCh1bnBhY2tlZC5zcGxpY2UoaW5keCwgMSlbMF0ub2JqKVxuICAgIH1cblxuICAgIHJldHVybiBwYWNrZWRcbn1cblxuZnVuY3Rpb24gaW5kZXhPZihuLCBoKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYobiA9PT0gaFtpXS52YWwpIHJldHVybiBpXG4gICAgfVxuICAgIHJldHVybiAtMVxufVxuIiwidmFyIE9ic2VydiA9IHJlcXVpcmUoXCJvYnNlcnZcIilcblxuLy8gY2lyY3VsYXIgZGVwIGJldHdlZW4gQXJyYXlNZXRob2RzICYgdGhpcyBmaWxlXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydkFycmF5XG5cbnZhciBzcGxpY2UgPSByZXF1aXJlKFwiLi9zcGxpY2UuanNcIilcbnZhciBwdXQgPSByZXF1aXJlKFwiLi9wdXQuanNcIilcbnZhciBzZXQgPSByZXF1aXJlKFwiLi9zZXQuanNcIilcbnZhciB0cmFuc2FjdGlvbiA9IHJlcXVpcmUoXCIuL3RyYW5zYWN0aW9uLmpzXCIpXG52YXIgQXJyYXlNZXRob2RzID0gcmVxdWlyZShcIi4vYXJyYXktbWV0aG9kcy5qc1wiKVxudmFyIGFkZExpc3RlbmVyID0gcmVxdWlyZShcIi4vYWRkLWxpc3RlbmVyLmpzXCIpXG5cblxuLyogIE9ic2VydkFycmF5IDo9IChBcnJheTxUPikgPT4gT2JzZXJ2PFxuICAgICAgICBBcnJheTxUPiAmIHsgX2RpZmY6IEFycmF5IH1cbiAgICA+ICYge1xuICAgICAgICBzcGxpY2U6IChpbmRleDogTnVtYmVyLCBhbW91bnQ6IE51bWJlciwgcmVzdC4uLjogVCkgPT5cbiAgICAgICAgICAgIEFycmF5PFQ+LFxuICAgICAgICBwdXNoOiAodmFsdWVzLi4uOiBUKSA9PiBOdW1iZXIsXG4gICAgICAgIGZpbHRlcjogKGxhbWJkYTogRnVuY3Rpb24sIHRoaXNWYWx1ZTogQW55KSA9PiBBcnJheTxUPixcbiAgICAgICAgaW5kZXhPZjogKGl0ZW06IFQsIGZyb21JbmRleDogTnVtYmVyKSA9PiBOdW1iZXJcbiAgICB9XG5cbiAgICBGaXggdG8gbWFrZSBpdCBtb3JlIGxpa2UgT2JzZXJ2SGFzaC5cblxuICAgIEkuZS4geW91IHdyaXRlIG9ic2VydmFibGVzIGludG8gaXQuXG4gICAgICAgIHJlYWRpbmcgbWV0aG9kcyB0YWtlIHBsYWluIEpTIG9iamVjdHMgdG8gcmVhZFxuICAgICAgICBhbmQgdGhlIHZhbHVlIG9mIHRoZSBhcnJheSBpcyBhbHdheXMgYW4gYXJyYXkgb2YgcGxhaW5cbiAgICAgICAgb2Jqc2VjdC5cblxuICAgICAgICBUaGUgb2JzZXJ2IGFycmF5IGluc3RhbmNlIGl0c2VsZiB3b3VsZCBoYXZlIGluZGV4ZWRcbiAgICAgICAgcHJvcGVydGllcyB0aGF0IGFyZSB0aGUgb2JzZXJ2YWJsZXNcbiovXG5mdW5jdGlvbiBPYnNlcnZBcnJheShpbml0aWFsTGlzdCkge1xuICAgIC8vIGxpc3QgaXMgdGhlIGludGVybmFsIG11dGFibGUgbGlzdCBvYnNlcnYgaW5zdGFuY2VzIHRoYXRcbiAgICAvLyBhbGwgbWV0aG9kcyBvbiBgb2JzYCBkaXNwYXRjaCB0by5cbiAgICB2YXIgbGlzdCA9IGluaXRpYWxMaXN0XG4gICAgdmFyIGluaXRpYWxTdGF0ZSA9IFtdXG5cbiAgICAvLyBjb3B5IHN0YXRlIG91dCBvZiBpbml0aWFsTGlzdCBpbnRvIGluaXRpYWxTdGF0ZVxuICAgIGxpc3QuZm9yRWFjaChmdW5jdGlvbiAob2JzZXJ2LCBpbmRleCkge1xuICAgICAgICBpbml0aWFsU3RhdGVbaW5kZXhdID0gdHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgICAgIG9ic2VydigpIDogb2JzZXJ2XG4gICAgfSlcblxuICAgIHZhciBvYnMgPSBPYnNlcnYoaW5pdGlhbFN0YXRlKVxuICAgIG9icy5zcGxpY2UgPSBzcGxpY2VcblxuICAgIC8vIG92ZXJyaWRlIHNldCBhbmQgc3RvcmUgb3JpZ2luYWwgZm9yIGxhdGVyIHVzZVxuICAgIG9icy5fb2JzZXJ2U2V0ID0gb2JzLnNldFxuICAgIG9icy5zZXQgPSBzZXRcblxuICAgIG9icy5nZXQgPSBnZXRcbiAgICBvYnMuZ2V0TGVuZ3RoID0gZ2V0TGVuZ3RoXG4gICAgb2JzLnB1dCA9IHB1dFxuICAgIG9icy50cmFuc2FjdGlvbiA9IHRyYW5zYWN0aW9uXG5cbiAgICAvLyB5b3UgYmV0dGVyIG5vdCBtdXRhdGUgdGhpcyBsaXN0IGRpcmVjdGx5XG4gICAgLy8gdGhpcyBpcyB0aGUgbGlzdCBvZiBvYnNlcnZzIGluc3RhbmNlc1xuICAgIG9icy5fbGlzdCA9IGxpc3RcblxuICAgIHZhciByZW1vdmVMaXN0ZW5lcnMgPSBsaXN0Lm1hcChmdW5jdGlvbiAob2JzZXJ2KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2Ygb2JzZXJ2ID09PSBcImZ1bmN0aW9uXCIgP1xuICAgICAgICAgICAgYWRkTGlzdGVuZXIob2JzLCBvYnNlcnYpIDpcbiAgICAgICAgICAgIG51bGxcbiAgICB9KTtcbiAgICAvLyB0aGlzIGlzIGEgbGlzdCBvZiByZW1vdmFsIGZ1bmN0aW9ucyB0aGF0IG11c3QgYmUgY2FsbGVkXG4gICAgLy8gd2hlbiBvYnNlcnYgaW5zdGFuY2VzIGFyZSByZW1vdmVkIGZyb20gYG9icy5saXN0YFxuICAgIC8vIG5vdCBjYWxsaW5nIHRoaXMgbWVhbnMgd2UgZG8gbm90IEdDIG91ciBvYnNlcnYgY2hhbmdlXG4gICAgLy8gbGlzdGVuZXJzLiBXaGljaCBjYXVzZXMgcmFnZSBidWdzXG4gICAgb2JzLl9yZW1vdmVMaXN0ZW5lcnMgPSByZW1vdmVMaXN0ZW5lcnNcblxuICAgIG9icy5fdHlwZSA9IFwib2JzZXJ2LWFycmF5XCJcbiAgICBvYnMuX3ZlcnNpb24gPSBcIjNcIlxuXG4gICAgcmV0dXJuIEFycmF5TWV0aG9kcyhvYnMsIGxpc3QpXG59XG5cbmZ1bmN0aW9uIGdldChpbmRleCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0W2luZGV4XVxufVxuXG5mdW5jdGlvbiBnZXRMZW5ndGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3QubGVuZ3RoXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNldE5vbkVudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHNldE5vbkVudW1lcmFibGUob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICB9KTtcbn1cbiIsInZhciBhZGRMaXN0ZW5lciA9IHJlcXVpcmUoXCIuL2FkZC1saXN0ZW5lci5qc1wiKVxudmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKFwiLi9saWIvc2V0LW5vbi1lbnVtZXJhYmxlLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHB1dFxuXG4vLyBgb2JzLnB1dGAgaXMgYSBtdXRhYmxlIGltcGxlbWVudGF0aW9uIG9mIGBhcnJheVtpbmRleF0gPSB2YWx1ZWBcbi8vIHRoYXQgbXV0YXRlcyBib3RoIGBsaXN0YCBhbmQgdGhlIGludGVybmFsIGB2YWx1ZUxpc3RgIHRoYXRcbi8vIGlzIHRoZSBjdXJyZW50IHZhbHVlIG9mIGBvYnNgIGl0c2VsZlxuZnVuY3Rpb24gcHV0KGluZGV4LCB2YWx1ZSkge1xuICAgIHZhciBvYnMgPSB0aGlzXG4gICAgdmFyIHZhbHVlTGlzdCA9IG9icygpLnNsaWNlKClcblxuICAgIHZhciBvcmlnaW5hbExlbmd0aCA9IHZhbHVlTGlzdC5sZW5ndGhcbiAgICB2YWx1ZUxpc3RbaW5kZXhdID0gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyB2YWx1ZSgpIDogdmFsdWVcblxuICAgIG9icy5fbGlzdFtpbmRleF0gPSB2YWx1ZVxuXG4gICAgLy8gcmVtb3ZlIHBhc3QgdmFsdWUgbGlzdGVuZXIgaWYgd2FzIG9ic2VydlxuICAgIHZhciByZW1vdmVMaXN0ZW5lciA9IG9icy5fcmVtb3ZlTGlzdGVuZXJzW2luZGV4XVxuICAgIGlmIChyZW1vdmVMaXN0ZW5lcil7XG4gICAgICAgIHJlbW92ZUxpc3RlbmVyKClcbiAgICB9XG5cbiAgICAvLyBhZGQgbGlzdGVuZXIgdG8gdmFsdWUgaWYgb2JzZXJ2XG4gICAgb2JzLl9yZW1vdmVMaXN0ZW5lcnNbaW5kZXhdID0gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgP1xuICAgICAgICBhZGRMaXN0ZW5lcihvYnMsIHZhbHVlKSA6XG4gICAgICAgIG51bGxcblxuICAgIC8vIGZha2Ugc3BsaWNlIGRpZmZcbiAgICB2YXIgdmFsdWVBcmdzID0gaW5kZXggPCBvcmlnaW5hbExlbmd0aCA/IFxuICAgICAgICBbaW5kZXgsIDEsIHZhbHVlTGlzdFtpbmRleF1dIDpcbiAgICAgICAgW2luZGV4LCAwLCB2YWx1ZUxpc3RbaW5kZXhdXVxuXG4gICAgc2V0Tm9uRW51bWVyYWJsZSh2YWx1ZUxpc3QsIFwiX2RpZmZcIiwgW3ZhbHVlQXJnc10pXG5cbiAgICBvYnMuX29ic2VydlNldCh2YWx1ZUxpc3QpXG4gICAgcmV0dXJuIHZhbHVlXG59IiwidmFyIGFwcGx5UGF0Y2ggPSByZXF1aXJlKFwiLi9hcHBseS1wYXRjaC5qc1wiKVxudmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKFwiLi9saWIvc2V0LW5vbi1lbnVtZXJhYmxlLmpzXCIpXG52YXIgYWRpZmYgPSByZXF1aXJlKFwiYWRpZmZcIilcblxubW9kdWxlLmV4cG9ydHMgPSBzZXRcblxuZnVuY3Rpb24gc2V0KHJhd0xpc3QpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmF3TGlzdCkpIHJhd0xpc3QgPSBbXVxuXG4gICAgdmFyIG9icyA9IHRoaXNcbiAgICB2YXIgY2hhbmdlcyA9IGFkaWZmLmRpZmYob2JzLl9saXN0LCByYXdMaXN0KVxuICAgIHZhciB2YWx1ZUxpc3QgPSBvYnMoKS5zbGljZSgpXG5cbiAgICB2YXIgdmFsdWVDaGFuZ2VzID0gY2hhbmdlcy5tYXAoYXBwbHlQYXRjaC5iaW5kKG9icywgdmFsdWVMaXN0KSlcblxuICAgIHNldE5vbkVudW1lcmFibGUodmFsdWVMaXN0LCBcIl9kaWZmXCIsIHZhbHVlQ2hhbmdlcylcblxuICAgIG9icy5fb2JzZXJ2U2V0KHZhbHVlTGlzdClcbiAgICByZXR1cm4gY2hhbmdlc1xufVxuIiwidmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlXG5cbnZhciBhZGRMaXN0ZW5lciA9IHJlcXVpcmUoXCIuL2FkZC1saXN0ZW5lci5qc1wiKVxudmFyIHNldE5vbkVudW1lcmFibGUgPSByZXF1aXJlKFwiLi9saWIvc2V0LW5vbi1lbnVtZXJhYmxlLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNwbGljZVxuXG4vLyBgb2JzLnNwbGljZWAgaXMgYSBtdXRhYmxlIGltcGxlbWVudGF0aW9uIG9mIGBzcGxpY2UoKWBcbi8vIHRoYXQgbXV0YXRlcyBib3RoIGBsaXN0YCBhbmQgdGhlIGludGVybmFsIGB2YWx1ZUxpc3RgIHRoYXRcbi8vIGlzIHRoZSBjdXJyZW50IHZhbHVlIG9mIGBvYnNgIGl0c2VsZlxuZnVuY3Rpb24gc3BsaWNlKGluZGV4LCBhbW91bnQpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDApXG4gICAgdmFyIHZhbHVlTGlzdCA9IG9icygpLnNsaWNlKClcblxuICAgIC8vIGdlbmVyYXRlIGEgbGlzdCBvZiBhcmdzIHRvIG11dGF0ZSB0aGUgaW50ZXJuYWxcbiAgICAvLyBsaXN0IG9mIG9ubHkgb2JzXG4gICAgdmFyIHZhbHVlQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwIHx8IGluZGV4ID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG11c3QgdW5wYWNrIG9ic2VydmFibGVzIHRoYXQgd2UgYXJlIGFkZGluZ1xuICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyB2YWx1ZSgpIDogdmFsdWVcbiAgICB9KVxuXG4gICAgdmFsdWVMaXN0LnNwbGljZS5hcHBseSh2YWx1ZUxpc3QsIHZhbHVlQXJncylcbiAgICAvLyB3ZSByZW1vdmUgdGhlIG9ic2VydnMgdGhhdCB3ZSByZW1vdmVcbiAgICB2YXIgcmVtb3ZlZCA9IG9icy5fbGlzdC5zcGxpY2UuYXBwbHkob2JzLl9saXN0LCBhcmdzKVxuXG4gICAgdmFyIGV4dHJhUmVtb3ZlTGlzdGVuZXJzID0gYXJncy5zbGljZSgyKS5tYXAoZnVuY3Rpb24gKG9ic2Vydikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiID9cbiAgICAgICAgICAgIGFkZExpc3RlbmVyKG9icywgb2JzZXJ2KSA6XG4gICAgICAgICAgICBudWxsXG4gICAgfSlcbiAgICBleHRyYVJlbW92ZUxpc3RlbmVycy51bnNoaWZ0KGFyZ3NbMF0sIGFyZ3NbMV0pXG4gICAgdmFyIHJlbW92ZWRMaXN0ZW5lcnMgPSBvYnMuX3JlbW92ZUxpc3RlbmVycy5zcGxpY2VcbiAgICAgICAgLmFwcGx5KG9icy5fcmVtb3ZlTGlzdGVuZXJzLCBleHRyYVJlbW92ZUxpc3RlbmVycylcblxuICAgIHJlbW92ZWRMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAocmVtb3ZlT2JzZXJ2TGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKHJlbW92ZU9ic2Vydkxpc3RlbmVyKSB7XG4gICAgICAgICAgICByZW1vdmVPYnNlcnZMaXN0ZW5lcigpXG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgc2V0Tm9uRW51bWVyYWJsZSh2YWx1ZUxpc3QsIFwiX2RpZmZcIiwgW3ZhbHVlQXJnc10pXG5cbiAgICBvYnMuX29ic2VydlNldCh2YWx1ZUxpc3QpXG4gICAgcmV0dXJuIHJlbW92ZWRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdHJhbnNhY3Rpb25cblxuZnVuY3Rpb24gdHJhbnNhY3Rpb24gKGZ1bmMpIHtcbiAgICB2YXIgb2JzID0gdGhpc1xuICAgIHZhciByYXdMaXN0ID0gb2JzLl9saXN0LnNsaWNlKClcblxuICAgIGlmIChmdW5jKHJhd0xpc3QpICE9PSBmYWxzZSl7IC8vIGFsbG93IGNhbmNlbFxuICAgICAgICByZXR1cm4gb2JzLnNldChyYXdMaXN0KVxuICAgIH1cblxufSIsInZhciBPYnNlcnYgPSByZXF1aXJlKFwib2JzZXJ2XCIpXG52YXIgZXh0ZW5kID0gcmVxdWlyZShcInh0ZW5kXCIpXG5cbnZhciBibGFja0xpc3QgPSBbXCJuYW1lXCIsIFwiX2RpZmZcIiwgXCJfdHlwZVwiLCBcIl92ZXJzaW9uXCJdXG52YXIgYmxhY2tMaXN0UmVhc29ucyA9IHtcbiAgICBcIm5hbWVcIjogXCJDbGFzaGVzIHdpdGggYEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lYC5cXG5cIixcbiAgICBcIl9kaWZmXCI6IFwiX2RpZmYgaXMgcmVzZXJ2ZWQga2V5IG9mIG9ic2Vydi1zdHJ1Y3QuXFxuXCIsXG4gICAgXCJfdHlwZVwiOiBcIl90eXBlIGlzIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtc3RydWN0LlxcblwiLFxuICAgIFwiX3ZlcnNpb25cIjogXCJfdmVyc2lvbiBpcyByZXNlcnZlZCBrZXkgb2Ygb2JzZXJ2LXN0cnVjdC5cXG5cIlxufVxudmFyIE5PX1RSQU5TQUNUSU9OID0ge31cblxuZnVuY3Rpb24gc2V0Tm9uRW51bWVyYWJsZShvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH0pXG59XG5cbi8qIE9ic2VydlN0cnVjdCA6PSAoT2JqZWN0PFN0cmluZywgT2JzZXJ2PFQ+PikgPT4gXG4gICAgT2JqZWN0PFN0cmluZywgT2JzZXJ2PFQ+PiAmXG4gICAgICAgIE9ic2VydjxPYmplY3Q8U3RyaW5nLCBUPiAmIHtcbiAgICAgICAgICAgIF9kaWZmOiBPYmplY3Q8U3RyaW5nLCBBbnk+XG4gICAgICAgIH0+XG5cbiovXG5tb2R1bGUuZXhwb3J0cyA9IE9ic2VydlN0cnVjdFxuXG5mdW5jdGlvbiBPYnNlcnZTdHJ1Y3Qoc3RydWN0KSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzdHJ1Y3QpXG5cbiAgICB2YXIgaW5pdGlhbFN0YXRlID0ge31cbiAgICB2YXIgY3VycmVudFRyYW5zYWN0aW9uID0gTk9fVFJBTlNBQ1RJT05cbiAgICB2YXIgbmVzdGVkVHJhbnNhY3Rpb24gPSBOT19UUkFOU0FDVElPTlxuXG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGJsYWNrTGlzdC5pbmRleE9mKGtleSkgIT09IC0xKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW5ub3QgY3JlYXRlIGFuIG9ic2Vydi1zdHJ1Y3QgXCIgK1xuICAgICAgICAgICAgICAgIFwid2l0aCBhIGtleSBuYW1lZCAnXCIgKyBrZXkgKyBcIicuXFxuXCIgK1xuICAgICAgICAgICAgICAgIGJsYWNrTGlzdFJlYXNvbnNba2V5XSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2JzZXJ2ID0gc3RydWN0W2tleV1cbiAgICAgICAgaW5pdGlhbFN0YXRlW2tleV0gPSB0eXBlb2Ygb2JzZXJ2ID09PSBcImZ1bmN0aW9uXCIgP1xuICAgICAgICAgICAgb2JzZXJ2KCkgOiBvYnNlcnZcbiAgICB9KVxuXG4gICAgdmFyIG9icyA9IE9ic2Vydihpbml0aWFsU3RhdGUpXG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgdmFyIG9ic2VydiA9IHN0cnVjdFtrZXldXG4gICAgICAgIG9ic1trZXldID0gb2JzZXJ2XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYnNlcnYgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgb2JzZXJ2KGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChuZXN0ZWRUcmFuc2FjdGlvbiA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHN0YXRlID0gZXh0ZW5kKG9icygpKVxuICAgICAgICAgICAgICAgIHN0YXRlW2tleV0gPSB2YWx1ZVxuICAgICAgICAgICAgICAgIHZhciBkaWZmID0ge31cbiAgICAgICAgICAgICAgICBkaWZmW2tleV0gPSB2YWx1ZSAmJiB2YWx1ZS5fZGlmZiA/XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLl9kaWZmIDogdmFsdWVcblxuICAgICAgICAgICAgICAgIHNldE5vbkVudW1lcmFibGUoc3RhdGUsIFwiX2RpZmZcIiwgZGlmZilcbiAgICAgICAgICAgICAgICBjdXJyZW50VHJhbnNhY3Rpb24gPSBzdGF0ZVxuICAgICAgICAgICAgICAgIG9icy5zZXQoc3RhdGUpXG4gICAgICAgICAgICAgICAgY3VycmVudFRyYW5zYWN0aW9uID0gTk9fVFJBTlNBQ1RJT05cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9KVxuICAgIHZhciBfc2V0ID0gb2JzLnNldFxuICAgIG9icy5zZXQgPSBmdW5jdGlvbiB0cmFja0RpZmYodmFsdWUpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRUcmFuc2FjdGlvbiA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfc2V0KHZhbHVlKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld1N0YXRlID0gZXh0ZW5kKHZhbHVlKVxuICAgICAgICBzZXROb25FbnVtZXJhYmxlKG5ld1N0YXRlLCBcIl9kaWZmXCIsIHZhbHVlKVxuICAgICAgICBfc2V0KG5ld1N0YXRlKVxuICAgIH1cblxuICAgIG9icyhmdW5jdGlvbiAobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRUcmFuc2FjdGlvbiA9PT0gbmV3U3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBvYnNlcnYgPSBzdHJ1Y3Rba2V5XVxuICAgICAgICAgICAgdmFyIG5ld09ic2VydlZhbHVlID0gbmV3U3RhdGVba2V5XVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydiA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAgICAgb2JzZXJ2KCkgIT09IG5ld09ic2VydlZhbHVlXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBuZXN0ZWRUcmFuc2FjdGlvbiA9IG5ld09ic2VydlZhbHVlXG4gICAgICAgICAgICAgICAgb2JzZXJ2LnNldChuZXdTdGF0ZVtrZXldKVxuICAgICAgICAgICAgICAgIG5lc3RlZFRyYW5zYWN0aW9uID0gTk9fVFJBTlNBQ1RJT05cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9KVxuXG4gICAgb2JzLl90eXBlID0gXCJvYnNlcnYtc3RydWN0XCJcbiAgICBvYnMuX3ZlcnNpb24gPSBcIjVcIlxuXG4gICAgcmV0dXJuIG9ic1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBPYnNlcnYgPSByZXF1aXJlKCdvYnNlcnYnKVxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcblxudmFyIE5PX1RSQU5TQUNUSU9OID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZWYXJoYXNoXG5cbmZ1bmN0aW9uIE9ic2VydlZhcmhhc2ggKGhhc2gsIGNyZWF0ZVZhbHVlKSB7XG4gIGNyZWF0ZVZhbHVlID0gY3JlYXRlVmFsdWUgfHwgZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqIH1cblxuICB2YXIgaW5pdGlhbFN0YXRlID0ge31cbiAgdmFyIGN1cnJlbnRUcmFuc2FjdGlvbiA9IE5PX1RSQU5TQUNUSU9OXG5cbiAgdmFyIG9icyA9IE9ic2Vydihpbml0aWFsU3RhdGUpXG4gIHNldE5vbkVudW1lcmFibGUob2JzLCAnX3JlbW92ZUxpc3RlbmVycycsIHt9KVxuXG4gIHNldE5vbkVudW1lcmFibGUob2JzLCAnc2V0Jywgb2JzLnNldClcbiAgc2V0Tm9uRW51bWVyYWJsZShvYnMsICdnZXQnLCBnZXQuYmluZChvYnMpKVxuICBzZXROb25FbnVtZXJhYmxlKG9icywgJ3B1dCcsIHB1dC5iaW5kKG9icywgY3JlYXRlVmFsdWUsIGN1cnJlbnRUcmFuc2FjdGlvbikpXG4gIHNldE5vbkVudW1lcmFibGUob2JzLCAnZGVsZXRlJywgZGVsLmJpbmQob2JzKSlcblxuICBmb3IgKHZhciBrZXkgaW4gaGFzaCkge1xuICAgIG9ic1trZXldID0gdHlwZW9mIGhhc2hba2V5XSA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICBoYXNoW2tleV0gOiBjcmVhdGVWYWx1ZShoYXNoW2tleV0sIGtleSlcblxuICAgIGlmIChpc0ZuKG9ic1trZXldKSkge1xuICAgICAgb2JzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XSA9IG9ic1trZXldKHdhdGNoKG9icywga2V5LCBjdXJyZW50VHJhbnNhY3Rpb24pKVxuICAgIH1cbiAgfVxuXG4gIHZhciBuZXdTdGF0ZSA9IHt9XG4gIGZvciAoa2V5IGluIGhhc2gpIHtcbiAgICB2YXIgb2JzZXJ2ID0gb2JzW2tleV1cbiAgICBjaGVja0tleShrZXkpXG4gICAgbmV3U3RhdGVba2V5XSA9IGlzRm4ob2JzZXJ2KSA/IG9ic2VydigpIDogb2JzZXJ2XG4gIH1cbiAgb2JzLnNldChuZXdTdGF0ZSlcblxuICBvYnMoZnVuY3Rpb24gKG5ld1N0YXRlKSB7XG4gICAgaWYgKGN1cnJlbnRUcmFuc2FjdGlvbiA9PT0gbmV3U3RhdGUpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBoYXNoKSB7XG4gICAgICB2YXIgb2JzZXJ2ID0gaGFzaFtrZXldXG5cbiAgICAgIGlmIChpc0ZuKG9ic2VydikgJiYgb2JzZXJ2KCkgIT09IG5ld1N0YXRlW2tleV0pIHtcbiAgICAgICAgb2JzZXJ2LnNldChuZXdTdGF0ZVtrZXldKVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gb2JzXG59XG5cbi8vIGFjY2VzcyBhbmQgbXV0YXRlXG5mdW5jdGlvbiBnZXQgKGtleSkge1xuICByZXR1cm4gdGhpc1trZXldXG59XG5cbmZ1bmN0aW9uIHB1dCAoY3JlYXRlVmFsdWUsIGN1cnJlbnRUcmFuc2FjdGlvbiwga2V5LCB2YWwpIHtcbiAgY2hlY2tLZXkoa2V5KVxuXG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHZhcmhhc2gucHV0KGtleSwgdW5kZWZpbmVkKS4nKVxuICB9XG5cbiAgdmFyIG9ic2VydiA9IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicgP1xuICAgIHZhbCA6IGNyZWF0ZVZhbHVlKHZhbCwga2V5KVxuICB2YXIgc3RhdGUgPSBleHRlbmQodGhpcygpKVxuXG4gIHN0YXRlW2tleV0gPSBpc0ZuKG9ic2VydikgPyBvYnNlcnYoKSA6IG9ic2VydlxuXG4gIGlmIChpc0ZuKHRoaXMuX3JlbW92ZUxpc3RlbmVyc1trZXldKSkge1xuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyc1trZXldKClcbiAgfVxuXG4gIHRoaXMuX3JlbW92ZUxpc3RlbmVyc1trZXldID0gaXNGbihvYnNlcnYpID9cbiAgICBvYnNlcnYod2F0Y2godGhpcywga2V5LCBjdXJyZW50VHJhbnNhY3Rpb24pKSA6IG51bGxcblxuICBzZXROb25FbnVtZXJhYmxlKHN0YXRlLCAnX2RpZmYnLCBkaWZmKGtleSwgc3RhdGVba2V5XSkpXG5cbiAgdGhpc1trZXldID0gb2JzZXJ2XG4gIHRoaXMuc2V0KHN0YXRlKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIGRlbCAoa2V5KSB7XG4gIHZhciBzdGF0ZSA9IGV4dGVuZCh0aGlzKCkpXG4gIGlmIChpc0ZuKHRoaXMuX3JlbW92ZUxpc3RlbmVyc1trZXldKSkge1xuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVyc1trZXldKClcbiAgfVxuXG4gIGRlbGV0ZSB0aGlzLl9yZW1vdmVMaXN0ZW5lcnNba2V5XVxuICBkZWxldGUgc3RhdGVba2V5XVxuICBkZWxldGUgdGhpc1trZXldXG5cbiAgc2V0Tm9uRW51bWVyYWJsZShzdGF0ZSwgJ19kaWZmJywgZGlmZihrZXksIHVuZGVmaW5lZCkpXG4gIHRoaXMuc2V0KHN0YXRlKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIHByb2Nlc3NpbmdcbmZ1bmN0aW9uIHdhdGNoIChvYnMsIGtleSwgY3VycmVudFRyYW5zYWN0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgc3RhdGUgPSBleHRlbmQob2JzKCkpXG4gICAgc3RhdGVba2V5XSA9IHZhbHVlXG5cbiAgICBzZXROb25FbnVtZXJhYmxlKHN0YXRlLCAnX2RpZmYnLCBkaWZmKGtleSwgdmFsdWUpKVxuICAgIGN1cnJlbnRUcmFuc2FjdGlvbiA9IHN0YXRlXG4gICAgb2JzLnNldChzdGF0ZSlcbiAgICBjdXJyZW50VHJhbnNhY3Rpb24gPSBOT19UUkFOU0FDVElPTlxuICB9XG59XG5cbmZ1bmN0aW9uIGRpZmYgKGtleSwgdmFsdWUpIHtcbiAgdmFyIG9iaiA9IHt9XG4gIG9ialtrZXldID0gdmFsdWUgJiYgdmFsdWUuX2RpZmYgPyB2YWx1ZS5fZGlmZiA6IHZhbHVlXG4gIHJldHVybiBvYmpcbn1cblxuZnVuY3Rpb24gaXNGbiAob2JqKSB7XG4gIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nXG59XG5cbmZ1bmN0aW9uIHNldE5vbkVudW1lcmFibGUob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwge1xuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbn1cblxuLy8gZXJyb3JzXG52YXIgYmxhY2tsaXN0ID0ge1xuICBuYW1lOiAnQ2xhc2hlcyB3aXRoIGBGdW5jdGlvbi5wcm90b3R5cGUubmFtZWAuJyxcbiAgZ2V0OiAnZ2V0IGlzIGEgcmVzZXJ2ZWQga2V5IG9mIG9ic2Vydi12YXJoYXNoIG1ldGhvZCcsXG4gIHB1dDogJ3B1dCBpcyBhIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtdmFyaGFzaCBtZXRob2QnLFxuICAnZGVsZXRlJzogJ2RlbGV0ZSBpcyBhIHJlc2VydmVkIGtleSBvZiBvYnNlcnYtdmFyaGFzaCBtZXRob2QnLFxuICBfZGlmZjogJ19kaWZmIGlzIGEgcmVzZXJ2ZWQga2V5IG9mIG9ic2Vydi12YXJoYXNoIG1ldGhvZCcsXG4gIF9yZW1vdmVMaXN0ZW5lcnM6ICdfcmVtb3ZlTGlzdGVuZXJzIGlzIGEgcmVzZXJ2ZWQga2V5IG9mIG9ic2Vydi12YXJoYXNoJ1xufVxuXG5mdW5jdGlvbiBjaGVja0tleSAoa2V5KSB7XG4gIGlmICghYmxhY2tsaXN0W2tleV0pIHJldHVyblxuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgJ2Nhbm5vdCBjcmVhdGUgYW4gb2JzZXJ2LXZhcmhhc2ggd2l0aCBrZXkgYCcgKyBrZXkgKyAnYC4gJyArIGJsYWNrbGlzdFtrZXldXG4gIClcbn1cbiIsInZhciBPYnNlcnZhYmxlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjb21wdXRlZFxuXG5mdW5jdGlvbiBjb21wdXRlZChvYnNlcnZhYmxlcywgbGFtYmRhKSB7XG4gICAgdmFyIHZhbHVlcyA9IG9ic2VydmFibGVzLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gbygpXG4gICAgfSlcbiAgICB2YXIgcmVzdWx0ID0gT2JzZXJ2YWJsZShsYW1iZGEuYXBwbHkobnVsbCwgdmFsdWVzKSlcblxuICAgIG9ic2VydmFibGVzLmZvckVhY2goZnVuY3Rpb24gKG8sIGluZGV4KSB7XG4gICAgICAgIG8oZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICB2YWx1ZXNbaW5kZXhdID0gbmV3VmFsdWVcbiAgICAgICAgICAgIHJlc3VsdC5zZXQobGFtYmRhLmFwcGx5KG51bGwsIHZhbHVlcykpXG4gICAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiByZXN1bHRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YWJsZVxuXG5mdW5jdGlvbiBPYnNlcnZhYmxlKHZhbHVlKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IFtdXG4gICAgdmFsdWUgPSB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHZhbHVlXG5cbiAgICBvYnNlcnZhYmxlLnNldCA9IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgIHZhbHVlID0gdlxuICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAoZikge1xuICAgICAgICAgICAgZih2KVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlXG5cbiAgICBmdW5jdGlvbiBvYnNlcnZhYmxlKGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVxuICAgICAgICB9XG5cbiAgICAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UobGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpLCAxKVxuICAgICAgICB9XG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB3YXRjaFxuXG5mdW5jdGlvbiB3YXRjaChvYnNlcnZhYmxlLCBsaXN0ZW5lcikge1xuICAgIHZhciByZW1vdmUgPSBvYnNlcnZhYmxlKGxpc3RlbmVyKVxuICAgIGxpc3RlbmVyKG9ic2VydmFibGUoKSlcbiAgICByZXR1cm4gcmVtb3ZlXG59XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsInZhciBuYXJncyA9IC9cXHsoWzAtOWEtekEtWl0rKVxcfS9nXG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2VcblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZVxuXG5mdW5jdGlvbiB0ZW1wbGF0ZShzdHJpbmcpIHtcbiAgICB2YXIgYXJnc1xuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIGFyZ3VtZW50c1sxXSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBhcmdzID0gYXJndW1lbnRzWzFdXG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgIH1cblxuICAgIGlmICghYXJncyB8fCAhYXJncy5oYXNPd25Qcm9wZXJ0eSkge1xuICAgICAgICBhcmdzID0ge31cbiAgICB9XG5cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UobmFyZ3MsIGZ1bmN0aW9uIHJlcGxhY2VBcmcobWF0Y2gsIGksIGluZGV4KSB7XG4gICAgICAgIHZhciByZXN1bHRcblxuICAgICAgICBpZiAoc3RyaW5nW2luZGV4IC0gMV0gPT09IFwie1wiICYmXG4gICAgICAgICAgICBzdHJpbmdbaW5kZXggKyBtYXRjaC5sZW5ndGhdID09PSBcIn1cIikge1xuICAgICAgICAgICAgcmV0dXJuIGlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGFyZ3MuaGFzT3duUHJvcGVydHkoaSkgPyBhcmdzW2ldIDogbnVsbFxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCByZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfVxuICAgIH0pXG59XG4iLCJ2YXIgRGVsZWdhdG9yID0gcmVxdWlyZSgnZG9tLWRlbGVnYXRvcicpXG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUV2ZW50XG5cbmZ1bmN0aW9uIEJhc2VFdmVudChsYW1iZGEpIHtcbiAgICByZXR1cm4gRXZlbnRIYW5kbGVyO1xuXG4gICAgZnVuY3Rpb24gRXZlbnRIYW5kbGVyKGZuLCBkYXRhLCBvcHRzKSB7XG4gICAgICAgIHZhciBoYW5kbGVyID0ge1xuICAgICAgICAgICAgZm46IGZuLFxuICAgICAgICAgICAgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkID8gZGF0YSA6IHt9LFxuICAgICAgICAgICAgb3B0czogb3B0cyB8fCB7fSxcbiAgICAgICAgICAgIGhhbmRsZUV2ZW50OiBoYW5kbGVFdmVudFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZuICYmIGZuLnR5cGUgPT09ICdkb20tZGVsZWdhdG9yLWhhbmRsZScpIHtcbiAgICAgICAgICAgIHJldHVybiBEZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlKGZuLFxuICAgICAgICAgICAgICAgIGhhbmRsZUxhbWJkYS5iaW5kKGhhbmRsZXIpKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGhhbmRsZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlTGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0cy5zdGFydFByb3BhZ2F0aW9uICYmIGV2LnN0YXJ0UHJvcGFnYXRpb24pIHtcbiAgICAgICAgICAgIGV2LnN0YXJ0UHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsYW1iZGEuY2FsbCh0aGlzLCBldiwgYnJvYWRjYXN0KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KGV2KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgICAgIGlmIChzZWxmLm9wdHMuc3RhcnRQcm9wYWdhdGlvbiAmJiBldi5zdGFydFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgICBldi5zdGFydFByb3BhZ2F0aW9uKClcbiAgICAgICAgfVxuXG4gICAgICAgIGxhbWJkYS5jYWxsKHNlbGYsIGV2LCBicm9hZGNhc3QpXG5cbiAgICAgICAgZnVuY3Rpb24gYnJvYWRjYXN0KHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYuZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmZuKHZhbHVlKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLmZuLndyaXRlKHZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcbnZhciBnZXRGb3JtRGF0YSA9IHJlcXVpcmUoJ2Zvcm0tZGF0YS1zZXQvZWxlbWVudCcpXG5cbnZhciBCYXNlRXZlbnQgPSByZXF1aXJlKCcuL2Jhc2UtZXZlbnQuanMnKVxuXG52YXIgVkFMSURfQ0hBTkdFID0gWydjaGVja2JveCcsICdmaWxlJywgJ3NlbGVjdC1tdWx0aXBsZScsICdzZWxlY3Qtb25lJ107XG52YXIgVkFMSURfSU5QVVQgPSBbJ2NvbG9yJywgJ2RhdGUnLCAnZGF0ZXRpbWUnLCAnZGF0ZXRpbWUtbG9jYWwnLCAnZW1haWwnLFxuICAgICdtb250aCcsICdudW1iZXInLCAncGFzc3dvcmQnLCAncmFuZ2UnLCAnc2VhcmNoJywgJ3RlbCcsICd0ZXh0JywgJ3RpbWUnLFxuICAgICd1cmwnLCAnd2VlayddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudChjaGFuZ2VMYW1iZGEpO1xuXG5mdW5jdGlvbiBjaGFuZ2VMYW1iZGEoZXYsIGJyb2FkY2FzdCkge1xuICAgIHZhciB0YXJnZXQgPSBldi50YXJnZXRcblxuICAgIHZhciBpc1ZhbGlkID1cbiAgICAgICAgKGV2LnR5cGUgPT09ICdpbnB1dCcgJiYgVkFMSURfSU5QVVQuaW5kZXhPZih0YXJnZXQudHlwZSkgIT09IC0xKSB8fFxuICAgICAgICAoZXYudHlwZSA9PT0gJ2NoYW5nZScgJiYgVkFMSURfQ0hBTkdFLmluZGV4T2YodGFyZ2V0LnR5cGUpICE9PSAtMSk7XG5cbiAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgaWYgKGV2LnN0YXJ0UHJvcGFnYXRpb24pIHtcbiAgICAgICAgICAgIGV2LnN0YXJ0UHJvcGFnYXRpb24oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGdldEZvcm1EYXRhKGV2LmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIGRhdGEgPSBleHRlbmQodmFsdWUsIHRoaXMuZGF0YSlcblxuICAgIGJyb2FkY2FzdChkYXRhKVxufVxuIiwidmFyIEJhc2VFdmVudCA9IHJlcXVpcmUoJy4vYmFzZS1ldmVudC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudChjbGlja0xhbWJkYSk7XG5cbmZ1bmN0aW9uIGNsaWNrTGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICB2YXIgb3B0cyA9IHRoaXMub3B0cztcblxuICAgIGlmICghb3B0cy5jdHJsICYmIGV2LmN0cmxLZXkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghb3B0cy5tZXRhICYmIGV2Lm1ldGFLZXkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghb3B0cy5yaWdodENsaWNrICYmIGV2LndoaWNoID09PSAyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLnByZXZlbnREZWZhdWx0ICYmIGV2LnByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgYnJvYWRjYXN0KHRoaXMuZGF0YSk7XG59XG4iLCJ2YXIgQmFzZUV2ZW50ID0gcmVxdWlyZSgnLi9iYXNlLWV2ZW50LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUV2ZW50KGV2ZW50TGFtYmRhKTtcblxuZnVuY3Rpb24gZXZlbnRMYW1iZGEoZXYsIGJyb2FkY2FzdCkge1xuICAgIGJyb2FkY2FzdCh0aGlzLmRhdGEpO1xufVxuIiwidmFyIEJhc2VFdmVudCA9IHJlcXVpcmUoJy4vYmFzZS1ldmVudC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VFdmVudChrZXlMYW1iZGEpO1xuXG5mdW5jdGlvbiBrZXlMYW1iZGEoZXYsIGJyb2FkY2FzdCkge1xuICAgIHZhciBrZXkgPSB0aGlzLm9wdHMua2V5O1xuXG4gICAgaWYgKGV2LmtleUNvZGUgPT09IGtleSkge1xuICAgICAgICBicm9hZGNhc3QodGhpcy5kYXRhKTtcbiAgICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhhc0tleXNcblxuZnVuY3Rpb24gaGFzS2V5cyhzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlICE9PSBudWxsICYmXG4gICAgICAgICh0eXBlb2Ygc291cmNlID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgIHR5cGVvZiBzb3VyY2UgPT09IFwiZnVuY3Rpb25cIilcbn1cbiIsInZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcbnZhciBnZXRGb3JtRGF0YSA9IHJlcXVpcmUoJ2Zvcm0tZGF0YS1zZXQvZWxlbWVudCcpXG5cbnZhciBCYXNlRXZlbnQgPSByZXF1aXJlKCcuL2Jhc2UtZXZlbnQuanMnKTtcblxudmFyIEVOVEVSID0gMTNcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlRXZlbnQoc3VibWl0TGFtYmRhKTtcblxuZnVuY3Rpb24gc3VibWl0TGFtYmRhKGV2LCBicm9hZGNhc3QpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZXYudGFyZ2V0XG5cbiAgICB2YXIgaXNWYWxpZCA9XG4gICAgICAgIChldi50eXBlID09PSAnc3VibWl0JyAmJiB0YXJnZXQudGFnTmFtZSA9PT0gJ0ZPUk0nKSB8fFxuICAgICAgICAoZXYudHlwZSA9PT0gJ2NsaWNrJyAmJiB0YXJnZXQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHx8XG4gICAgICAgIChldi50eXBlID09PSAnY2xpY2snICYmIHRhcmdldC50eXBlID09PSAnc3VibWl0JykgfHxcbiAgICAgICAgKFxuICAgICAgICAgICAgKHRhcmdldC50eXBlID09PSAndGV4dCcpICYmXG4gICAgICAgICAgICAoZXYua2V5Q29kZSA9PT0gRU5URVIgJiYgZXYudHlwZSA9PT0gJ2tleWRvd24nKVxuICAgICAgICApXG5cbiAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgaWYgKGV2LnN0YXJ0UHJvcGFnYXRpb24pIHtcbiAgICAgICAgICAgIGV2LnN0YXJ0UHJvcGFnYXRpb24oKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGdldEZvcm1EYXRhKGV2LmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIGRhdGEgPSBleHRlbmQodmFsdWUsIHRoaXMuZGF0YSlcblxuICAgIGlmIChldi5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIGJyb2FkY2FzdChkYXRhKTtcbn1cbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG52YXIgZ2V0Rm9ybURhdGEgPSByZXF1aXJlKCdmb3JtLWRhdGEtc2V0L2VsZW1lbnQnKVxuXG52YXIgQmFzZUV2ZW50ID0gcmVxdWlyZSgnLi9iYXNlLWV2ZW50LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUV2ZW50KHZhbHVlTGFtYmRhKTtcblxuZnVuY3Rpb24gdmFsdWVMYW1iZGEoZXYsIGJyb2FkY2FzdCkge1xuICAgIHZhciB2YWx1ZSA9IGdldEZvcm1EYXRhKGV2LmN1cnJlbnRUYXJnZXQpXG4gICAgdmFyIGRhdGEgPSBleHRlbmQodmFsdWUsIHRoaXMuZGF0YSlcblxuICAgIGJyb2FkY2FzdChkYXRhKTtcbn1cbiIsImZ1bmN0aW9uIFRodW5rKGZuLCBhcmdzLCBrZXksIGVxQXJncykge1xyXG4gICAgdGhpcy5mbiA9IGZuO1xyXG4gICAgdGhpcy5hcmdzID0gYXJncztcclxuICAgIHRoaXMua2V5ID0ga2V5O1xyXG4gICAgdGhpcy5lcUFyZ3MgPSBlcUFyZ3M7XHJcbn1cclxuXHJcblRodW5rLnByb3RvdHlwZS50eXBlID0gJ1RodW5rJztcclxuVGh1bmsucHJvdG90eXBlLnJlbmRlciA9IHJlbmRlcjtcclxubW9kdWxlLmV4cG9ydHMgPSBUaHVuaztcclxuXHJcbmZ1bmN0aW9uIHNob3VsZFVwZGF0ZShjdXJyZW50LCBwcmV2aW91cykge1xyXG4gICAgaWYgKCFjdXJyZW50IHx8ICFwcmV2aW91cyB8fCBjdXJyZW50LmZuICE9PSBwcmV2aW91cy5mbikge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjYXJncyA9IGN1cnJlbnQuYXJncztcclxuICAgIHZhciBwYXJncyA9IHByZXZpb3VzLmFyZ3M7XHJcblxyXG4gICAgcmV0dXJuICFjdXJyZW50LmVxQXJncyhjYXJncywgcGFyZ3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXIocHJldmlvdXMpIHtcclxuICAgIGlmIChzaG91bGRVcGRhdGUodGhpcywgcHJldmlvdXMpKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZm4uYXBwbHkobnVsbCwgdGhpcy5hcmdzKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLnZub2RlO1xyXG4gICAgfVxyXG59XHJcbiIsInZhciBQYXJ0aWFsID0gcmVxdWlyZSgnLi9wYXJ0aWFsJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnRpYWwoKTtcclxuIiwidmFyIHNoYWxsb3dFcSA9IHJlcXVpcmUoJy4vc2hhbGxvdy1lcScpO1xudmFyIFRodW5rID0gcmVxdWlyZSgnLi9pbW11dGFibGUtdGh1bmsnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVQYXJ0aWFsO1xuXG5mdW5jdGlvbiBjcmVhdGVQYXJ0aWFsKGVxKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHBhcnRpYWwoZm4pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBjb3B5T3Zlcihhcmd1bWVudHMsIDEpO1xuICAgICAgICB2YXIgZmlyc3RBcmcgPSBhcmdzWzBdO1xuICAgICAgICB2YXIga2V5O1xuXG4gICAgICAgIHZhciBlcUFyZ3MgPSBlcSB8fCBzaGFsbG93RXE7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBmaXJzdEFyZyA9PT0gJ29iamVjdCcgJiYgZmlyc3RBcmcgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmICgna2V5JyBpbiBmaXJzdEFyZykge1xuICAgICAgICAgICAgICAgIGtleSA9IGZpcnN0QXJnLmtleTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2lkJyBpbiBmaXJzdEFyZykge1xuICAgICAgICAgICAgICAgIGtleSA9IGZpcnN0QXJnLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBUaHVuayhmbiwgYXJncywga2V5LCBlcUFyZ3MpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNvcHlPdmVyKGxpc3QsIG9mZnNldCkge1xuICAgIHZhciBuZXdMaXN0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSBvZmZzZXQ7IGktLSkge1xuICAgICAgICBuZXdMaXN0W2kgLSBvZmZzZXRdID0gbGlzdFtpXTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld0xpc3Q7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHNoYWxsb3dFcTtcclxuXHJcbmZ1bmN0aW9uIHNoYWxsb3dFcShjdXJyZW50QXJncywgcHJldmlvdXNBcmdzKSB7XHJcbiAgICBpZiAoY3VycmVudEFyZ3MubGVuZ3RoID09PSAwICYmIHByZXZpb3VzQXJncy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY3VycmVudEFyZ3MubGVuZ3RoICE9PSBwcmV2aW91c0FyZ3MubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBsZW4gPSBjdXJyZW50QXJncy5sZW5ndGg7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIGlmIChjdXJyZW50QXJnc1tpXSAhPT0gcHJldmlvdXNBcmdzW2ldKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12aG9vay5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UHJvcGVydGllc1xuXG5mdW5jdGlvbiBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMsIHByZXZpb3VzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSG9vayhwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wTmFtZSwgcHJvcFZhbHVlLCBwcmV2aW91cylcbiAgICAgICAgICAgIGlmIChwcm9wVmFsdWUuaG9vaykge1xuICAgICAgICAgICAgICAgIHByb3BWYWx1ZS5ob29rKG5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHByb3BOYW1lLFxuICAgICAgICAgICAgICAgICAgICBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpIHtcbiAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91c1twcm9wTmFtZV1cblxuICAgICAgICBpZiAoIWlzSG9vayhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wTmFtZSA9PT0gXCJzdHlsZVwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc3R5bGVbaV0gPSBcIlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJldmlvdXNWYWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gXCJcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c1ZhbHVlLnVuaG9vaykge1xuICAgICAgICAgICAgcHJldmlvdXNWYWx1ZS51bmhvb2sobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZFxuXG4gICAgLy8gU2V0IGF0dHJpYnV0ZXNcbiAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByb3BWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGF0dHJWYWx1ZSA9IHByb3BWYWx1ZVthdHRyTmFtZV1cblxuICAgICAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZihwcmV2aW91c1ZhbHVlICYmIGlzT2JqZWN0KHByZXZpb3VzVmFsdWUpICYmXG4gICAgICAgIGdldFByb3RvdHlwZShwcmV2aW91c1ZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKCFpc09iamVjdChub2RlW3Byb3BOYW1lXSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSB7fVxuICAgIH1cblxuICAgIHZhciByZXBsYWNlciA9IHByb3BOYW1lID09PSBcInN0eWxlXCIgPyBcIlwiIDogdW5kZWZpbmVkXG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BWYWx1ZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwcm9wVmFsdWVba11cbiAgICAgICAgbm9kZVtwcm9wTmFtZV1ba10gPSAodmFsdWUgPT09IHVuZGVmaW5lZCkgPyByZXBsYWNlciA6IHZhbHVlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICAgIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgIH1cbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcblxudmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdm5vZGUuanNcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZ0ZXh0LmpzXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0LmpzXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi4vdm5vZGUvaGFuZGxlLXRodW5rLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudFxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KHZub2RlLCBvcHRzKSB7XG4gICAgdmFyIGRvYyA9IG9wdHMgPyBvcHRzLmRvY3VtZW50IHx8IGRvY3VtZW50IDogZG9jdW1lbnRcbiAgICB2YXIgd2FybiA9IG9wdHMgPyBvcHRzLndhcm4gOiBudWxsXG5cbiAgICB2bm9kZSA9IGhhbmRsZVRodW5rKHZub2RlKS5hXG5cbiAgICBpZiAoaXNXaWRnZXQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiB2bm9kZS5pbml0KClcbiAgICB9IGVsc2UgaWYgKGlzVlRleHQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2MuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dClcbiAgICB9IGVsc2UgaWYgKCFpc1ZOb2RlKHZub2RlKSkge1xuICAgICAgICBpZiAod2Fybikge1xuICAgICAgICAgICAgd2FybihcIkl0ZW0gaXMgbm90IGEgdmFsaWQgdmlydHVhbCBkb20gbm9kZVwiLCB2bm9kZSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBub2RlID0gKHZub2RlLm5hbWVzcGFjZSA9PT0gbnVsbCkgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudCh2bm9kZS50YWdOYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlModm5vZGUubmFtZXNwYWNlLCB2bm9kZS50YWdOYW1lKVxuXG4gICAgdmFyIHByb3BzID0gdm5vZGUucHJvcGVydGllc1xuICAgIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcylcblxuICAgIHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZE5vZGUgPSBjcmVhdGVFbGVtZW50KGNoaWxkcmVuW2ldLCBvcHRzKVxuICAgICAgICBpZiAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2RlXG59XG4iLCIvLyBNYXBzIGEgdmlydHVhbCBET00gdHJlZSBvbnRvIGEgcmVhbCBET00gdHJlZSBpbiBhbiBlZmZpY2llbnQgbWFubmVyLlxuLy8gV2UgZG9uJ3Qgd2FudCB0byByZWFkIGFsbCBvZiB0aGUgRE9NIG5vZGVzIGluIHRoZSB0cmVlIHNvIHdlIHVzZVxuLy8gdGhlIGluLW9yZGVyIHRyZWUgaW5kZXhpbmcgdG8gZWxpbWluYXRlIHJlY3Vyc2lvbiBkb3duIGNlcnRhaW4gYnJhbmNoZXMuXG4vLyBXZSBvbmx5IHJlY3Vyc2UgaW50byBhIERPTSBub2RlIGlmIHdlIGtub3cgdGhhdCBpdCBjb250YWlucyBhIGNoaWxkIG9mXG4vLyBpbnRlcmVzdC5cblxudmFyIG5vQ2hpbGQgPSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUluZGV4XG5cbmZ1bmN0aW9uIGRvbUluZGV4KHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcykge1xuICAgIGlmICghaW5kaWNlcyB8fCBpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9IGVsc2Uge1xuICAgICAgICBpbmRpY2VzLnNvcnQoYXNjZW5kaW5nKVxuICAgICAgICByZXR1cm4gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIDApXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KSB7XG4gICAgbm9kZXMgPSBub2RlcyB8fCB7fVxuXG5cbiAgICBpZiAocm9vdE5vZGUpIHtcbiAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIHJvb3RJbmRleCkpIHtcbiAgICAgICAgICAgIG5vZGVzW3Jvb3RJbmRleF0gPSByb290Tm9kZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZDaGlsZHJlbiA9IHRyZWUuY2hpbGRyZW5cblxuICAgICAgICBpZiAodkNoaWxkcmVuKSB7XG5cbiAgICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gcm9vdE5vZGUuY2hpbGROb2Rlc1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByb290SW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgdmFyIHZDaGlsZCA9IHZDaGlsZHJlbltpXSB8fCBub0NoaWxkXG4gICAgICAgICAgICAgICAgdmFyIG5leHRJbmRleCA9IHJvb3RJbmRleCArICh2Q2hpbGQuY291bnQgfHwgMClcblxuICAgICAgICAgICAgICAgIC8vIHNraXAgcmVjdXJzaW9uIGRvd24gdGhlIHRyZWUgaWYgdGhlcmUgYXJlIG5vIG5vZGVzIGRvd24gaGVyZVxuICAgICAgICAgICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCBuZXh0SW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2UoY2hpbGROb2Rlc1tpXSwgdkNoaWxkLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJvb3RJbmRleCA9IG5leHRJbmRleFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVzXG59XG5cbi8vIEJpbmFyeSBzZWFyY2ggZm9yIGFuIGluZGV4IGluIHRoZSBpbnRlcnZhbCBbbGVmdCwgcmlnaHRdXG5mdW5jdGlvbiBpbmRleEluUmFuZ2UoaW5kaWNlcywgbGVmdCwgcmlnaHQpIHtcbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIG1pbkluZGV4ID0gMFxuICAgIHZhciBtYXhJbmRleCA9IGluZGljZXMubGVuZ3RoIC0gMVxuICAgIHZhciBjdXJyZW50SW5kZXhcbiAgICB2YXIgY3VycmVudEl0ZW1cblxuICAgIHdoaWxlIChtaW5JbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICBjdXJyZW50SW5kZXggPSAoKG1heEluZGV4ICsgbWluSW5kZXgpIC8gMikgPj4gMFxuICAgICAgICBjdXJyZW50SXRlbSA9IGluZGljZXNbY3VycmVudEluZGV4XVxuXG4gICAgICAgIGlmIChtaW5JbmRleCA9PT0gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50SXRlbSA+PSBsZWZ0ICYmIGN1cnJlbnRJdGVtIDw9IHJpZ2h0XG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudEl0ZW0gPCBsZWZ0KSB7XG4gICAgICAgICAgICBtaW5JbmRleCA9IGN1cnJlbnRJbmRleCArIDFcbiAgICAgICAgfSBlbHNlICBpZiAoY3VycmVudEl0ZW0gPiByaWdodCkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBjdXJyZW50SW5kZXggLSAxXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICAgIHJldHVybiBhID4gYiA/IDEgOiAtMVxufVxuIiwidmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldC5qc1wiKVxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCIuLi92bm9kZS92cGF0Y2guanNcIilcblxudmFyIHJlbmRlciA9IHJlcXVpcmUoXCIuL2NyZWF0ZS1lbGVtZW50XCIpXG52YXIgdXBkYXRlV2lkZ2V0ID0gcmVxdWlyZShcIi4vdXBkYXRlLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UGF0Y2hcblxuZnVuY3Rpb24gYXBwbHlQYXRjaCh2cGF0Y2gsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgdHlwZSA9IHZwYXRjaC50eXBlXG4gICAgdmFyIHZOb2RlID0gdnBhdGNoLnZOb2RlXG4gICAgdmFyIHBhdGNoID0gdnBhdGNoLnBhdGNoXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBWUGF0Y2guUkVNT1ZFOlxuICAgICAgICAgICAgcmV0dXJuIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpXG4gICAgICAgIGNhc2UgVlBhdGNoLklOU0VSVDpcbiAgICAgICAgICAgIHJldHVybiBpbnNlcnROb2RlKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WVEVYVDpcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLldJREdFVDpcbiAgICAgICAgICAgIHJldHVybiB3aWRnZXRQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZOT0RFOlxuICAgICAgICAgICAgcmV0dXJuIHZOb2RlUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5PUkRFUjpcbiAgICAgICAgICAgIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBwYXRjaClcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlBST1BTOlxuICAgICAgICAgICAgYXBwbHlQcm9wZXJ0aWVzKGRvbU5vZGUsIHBhdGNoLCB2Tm9kZS5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guVEhVTks6XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVJvb3QoZG9tTm9kZSxcbiAgICAgICAgICAgICAgICByZW5kZXJPcHRpb25zLnBhdGNoKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKSlcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHZOb2RlKTtcblxuICAgIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGluc2VydE5vZGUocGFyZW50Tm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobmV3Tm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyZW50Tm9kZVxufVxuXG5mdW5jdGlvbiBzdHJpbmdQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZUZXh0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChkb21Ob2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGRvbU5vZGUucmVwbGFjZURhdGEoMCwgZG9tTm9kZS5sZW5ndGgsIHZUZXh0LnRleHQpXG4gICAgICAgIG5ld05vZGUgPSBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlcih2VGV4dCwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHdpZGdldFBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgd2lkZ2V0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHVwZGF0aW5nID0gdXBkYXRlV2lkZ2V0KGxlZnRWTm9kZSwgd2lkZ2V0KVxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAodXBkYXRpbmcpIHtcbiAgICAgICAgbmV3Tm9kZSA9IHdpZGdldC51cGRhdGUobGVmdFZOb2RlLCBkb21Ob2RlKSB8fCBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlcih3aWRnZXQsIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlICYmIG5ld05vZGUgIT09IGRvbU5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBpZiAoIXVwZGF0aW5nKSB7XG4gICAgICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHZOb2RlUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdykge1xuICAgIGlmICh0eXBlb2Ygdy5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIgJiYgaXNXaWRnZXQodykpIHtcbiAgICAgICAgdy5kZXN0cm95KGRvbU5vZGUpXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgYkluZGV4KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gW11cbiAgICB2YXIgY2hpbGROb2RlcyA9IGRvbU5vZGUuY2hpbGROb2Rlc1xuICAgIHZhciBsZW4gPSBjaGlsZE5vZGVzLmxlbmd0aFxuICAgIHZhciBpXG4gICAgdmFyIHJldmVyc2VJbmRleCA9IGJJbmRleC5yZXZlcnNlXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChkb21Ob2RlLmNoaWxkTm9kZXNbaV0pXG4gICAgfVxuXG4gICAgdmFyIGluc2VydE9mZnNldCA9IDBcbiAgICB2YXIgbW92ZVxuICAgIHZhciBub2RlXG4gICAgdmFyIGluc2VydE5vZGVcbiAgICB2YXIgY2hhaW5MZW5ndGhcbiAgICB2YXIgaW5zZXJ0ZWRMZW5ndGhcbiAgICB2YXIgbmV4dFNpYmxpbmdcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOykge1xuICAgICAgICBtb3ZlID0gYkluZGV4W2ldXG4gICAgICAgIGNoYWluTGVuZ3RoID0gMVxuICAgICAgICBpZiAobW92ZSAhPT0gdW5kZWZpbmVkICYmIG1vdmUgIT09IGkpIHtcbiAgICAgICAgICAgIC8vIHRyeSB0byBicmluZyBmb3J3YXJkIGFzIGxvbmcgb2YgYSBjaGFpbiBhcyBwb3NzaWJsZVxuICAgICAgICAgICAgd2hpbGUgKGJJbmRleFtpICsgY2hhaW5MZW5ndGhdID09PSBtb3ZlICsgY2hhaW5MZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFpbkxlbmd0aCsrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0aGUgZWxlbWVudCBjdXJyZW50bHkgYXQgdGhpcyBpbmRleCB3aWxsIGJlIG1vdmVkIGxhdGVyIHNvIGluY3JlYXNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAocmV2ZXJzZUluZGV4W2ldID4gaSArIGNoYWluTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZSA9IGNoaWxkcmVuW21vdmVdXG4gICAgICAgICAgICBpbnNlcnROb2RlID0gY2hpbGROb2Rlc1tpICsgaW5zZXJ0T2Zmc2V0XSB8fCBudWxsXG4gICAgICAgICAgICBpbnNlcnRlZExlbmd0aCA9IDBcbiAgICAgICAgICAgIHdoaWxlIChub2RlICE9PSBpbnNlcnROb2RlICYmIGluc2VydGVkTGVuZ3RoKysgPCBjaGFpbkxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRvbU5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGluc2VydE5vZGUpO1xuICAgICAgICAgICAgICAgIG5vZGUgPSBjaGlsZHJlblttb3ZlICsgaW5zZXJ0ZWRMZW5ndGhdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0aGUgbW92ZWQgZWxlbWVudCBjYW1lIGZyb20gdGhlIGZyb250IG9mIHRoZSBhcnJheSBzbyByZWR1Y2UgdGhlIGluc2VydCBvZmZzZXRcbiAgICAgICAgICAgIGlmIChtb3ZlICsgY2hhaW5MZW5ndGggPCBpKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0LS1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVsZW1lbnQgYXQgdGhpcyBpbmRleCBpcyBzY2hlZHVsZWQgdG8gYmUgcmVtb3ZlZCBzbyBpbmNyZWFzZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgIGlmIChpIGluIGJJbmRleC5yZW1vdmVzKSB7XG4gICAgICAgICAgICBpbnNlcnRPZmZzZXQrK1xuICAgICAgICB9XG5cbiAgICAgICAgaSArPSBjaGFpbkxlbmd0aFxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZVJvb3Qob2xkUm9vdCwgbmV3Um9vdCkge1xuICAgIGlmIChvbGRSb290ICYmIG5ld1Jvb3QgJiYgb2xkUm9vdCAhPT0gbmV3Um9vdCAmJiBvbGRSb290LnBhcmVudE5vZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2cob2xkUm9vdClcbiAgICAgICAgb2xkUm9vdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdSb290LCBvbGRSb290KVxuICAgIH1cblxuICAgIHJldHVybiBuZXdSb290O1xufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgZG9tSW5kZXggPSByZXF1aXJlKFwiLi9kb20taW5kZXhcIilcbnZhciBwYXRjaE9wID0gcmVxdWlyZShcIi4vcGF0Y2gtb3BcIilcbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcblxuZnVuY3Rpb24gcGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMpIHtcbiAgICByZXR1cm4gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMpXG59XG5cbmZ1bmN0aW9uIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIGluZGljZXMgPSBwYXRjaEluZGljZXMocGF0Y2hlcylcblxuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBkb21JbmRleChyb290Tm9kZSwgcGF0Y2hlcy5hLCBpbmRpY2VzKVxuICAgIHZhciBvd25lckRvY3VtZW50ID0gcm9vdE5vZGUub3duZXJEb2N1bWVudFxuXG4gICAgaWYgKCFyZW5kZXJPcHRpb25zKSB7XG4gICAgICAgIHJlbmRlck9wdGlvbnMgPSB7IHBhdGNoOiBwYXRjaFJlY3Vyc2l2ZSB9XG4gICAgICAgIGlmIChvd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5kb2N1bWVudCA9IG93bmVyRG9jdW1lbnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZUluZGV4ID0gaW5kaWNlc1tpXVxuICAgICAgICByb290Tm9kZSA9IGFwcGx5UGF0Y2gocm9vdE5vZGUsXG4gICAgICAgICAgICBpbmRleFtub2RlSW5kZXhdLFxuICAgICAgICAgICAgcGF0Y2hlc1tub2RlSW5kZXhdLFxuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gYXBwbHlQYXRjaChyb290Tm9kZSwgZG9tTm9kZSwgcGF0Y2hMaXN0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKCFkb21Ob2RlKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoaXNBcnJheShwYXRjaExpc3QpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3RbaV0sIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0LCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IFtdXG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcGF0Y2hlcykge1xuICAgICAgICBpZiAoa2V5ICE9PSBcImFcIikge1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKE51bWJlcihrZXkpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGljZXNcbn1cbiIsInZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXQuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSB1cGRhdGVXaWRnZXRcblxuZnVuY3Rpb24gdXBkYXRlV2lkZ2V0KGEsIGIpIHtcbiAgICBpZiAoaXNXaWRnZXQoYSkgJiYgaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKFwibmFtZVwiIGluIGEgJiYgXCJuYW1lXCIgaW4gYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhLmluaXQgPT09IGIuaW5pdFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdlN0b3JlID0gcmVxdWlyZSgnZXYtc3RvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdkhvb2s7XG5cbmZ1bmN0aW9uIEV2SG9vayh2YWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFdkhvb2spKSB7XG4gICAgICAgIHJldHVybiBuZXcgRXZIb29rKHZhbHVlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbkV2SG9vay5wcm90b3R5cGUuaG9vayA9IGZ1bmN0aW9uIChub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgZXMgPSBFdlN0b3JlKG5vZGUpO1xuICAgIHZhciBwcm9wTmFtZSA9IHByb3BlcnR5TmFtZS5zdWJzdHIoMyk7XG5cbiAgICBlc1twcm9wTmFtZV0gPSB0aGlzLnZhbHVlO1xufTtcblxuRXZIb29rLnByb3RvdHlwZS51bmhvb2sgPSBmdW5jdGlvbihub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgZXMgPSBFdlN0b3JlKG5vZGUpO1xuICAgIHZhciBwcm9wTmFtZSA9IHByb3BlcnR5TmFtZS5zdWJzdHIoMyk7XG5cbiAgICBlc1twcm9wTmFtZV0gPSB1bmRlZmluZWQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvZnRTZXRIb29rO1xuXG5mdW5jdGlvbiBTb2Z0U2V0SG9vayh2YWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTb2Z0U2V0SG9vaykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTb2Z0U2V0SG9vayh2YWx1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5Tb2Z0U2V0SG9vay5wcm90b3R5cGUuaG9vayA9IGZ1bmN0aW9uIChub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICBpZiAobm9kZVtwcm9wZXJ0eU5hbWVdICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgIG5vZGVbcHJvcGVydHlOYW1lXSA9IHRoaXMudmFsdWU7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCd4LWlzLWFycmF5Jyk7XG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoJy4uL3Zub2RlL3Zub2RlLmpzJyk7XG52YXIgVlRleHQgPSByZXF1aXJlKCcuLi92bm9kZS92dGV4dC5qcycpO1xudmFyIGlzVk5vZGUgPSByZXF1aXJlKCcuLi92bm9kZS9pcy12bm9kZScpO1xudmFyIGlzVlRleHQgPSByZXF1aXJlKCcuLi92bm9kZS9pcy12dGV4dCcpO1xudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtd2lkZ2V0Jyk7XG52YXIgaXNIb29rID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdmhvb2snKTtcbnZhciBpc1ZUaHVuayA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXRodW5rJyk7XG5cbnZhciBwYXJzZVRhZyA9IHJlcXVpcmUoJy4vcGFyc2UtdGFnLmpzJyk7XG52YXIgc29mdFNldEhvb2sgPSByZXF1aXJlKCcuL2hvb2tzL3NvZnQtc2V0LWhvb2suanMnKTtcbnZhciBldkhvb2sgPSByZXF1aXJlKCcuL2hvb2tzL2V2LWhvb2suanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBoO1xuXG5mdW5jdGlvbiBoKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIGNoaWxkTm9kZXMgPSBbXTtcbiAgICB2YXIgdGFnLCBwcm9wcywga2V5LCBuYW1lc3BhY2U7XG5cbiAgICBpZiAoIWNoaWxkcmVuICYmIGlzQ2hpbGRyZW4ocHJvcGVydGllcykpIHtcbiAgICAgICAgY2hpbGRyZW4gPSBwcm9wZXJ0aWVzO1xuICAgICAgICBwcm9wcyA9IHt9O1xuICAgIH1cblxuICAgIHByb3BzID0gcHJvcHMgfHwgcHJvcGVydGllcyB8fCB7fTtcbiAgICB0YWcgPSBwYXJzZVRhZyh0YWdOYW1lLCBwcm9wcyk7XG5cbiAgICAvLyBzdXBwb3J0IGtleXNcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoJ2tleScpKSB7XG4gICAgICAgIGtleSA9IHByb3BzLmtleTtcbiAgICAgICAgcHJvcHMua2V5ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIHN1cHBvcnQgbmFtZXNwYWNlXG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KCduYW1lc3BhY2UnKSkge1xuICAgICAgICBuYW1lc3BhY2UgPSBwcm9wcy5uYW1lc3BhY2U7XG4gICAgICAgIHByb3BzLm5hbWVzcGFjZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBmaXggY3Vyc29yIGJ1Z1xuICAgIGlmICh0YWcgPT09ICdJTlBVVCcgJiZcbiAgICAgICAgIW5hbWVzcGFjZSAmJlxuICAgICAgICBwcm9wcy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSAmJlxuICAgICAgICBwcm9wcy52YWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICFpc0hvb2socHJvcHMudmFsdWUpXG4gICAgKSB7XG4gICAgICAgIHByb3BzLnZhbHVlID0gc29mdFNldEhvb2socHJvcHMudmFsdWUpO1xuICAgIH1cblxuICAgIHRyYW5zZm9ybVByb3BlcnRpZXMocHJvcHMpO1xuXG4gICAgaWYgKGNoaWxkcmVuICE9PSB1bmRlZmluZWQgJiYgY2hpbGRyZW4gIT09IG51bGwpIHtcbiAgICAgICAgYWRkQ2hpbGQoY2hpbGRyZW4sIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIG5ldyBWTm9kZSh0YWcsIHByb3BzLCBjaGlsZE5vZGVzLCBrZXksIG5hbWVzcGFjZSk7XG59XG5cbmZ1bmN0aW9uIGFkZENoaWxkKGMsIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpIHtcbiAgICBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNoaWxkTm9kZXMucHVzaChuZXcgVlRleHQoYykpO1xuICAgIH0gZWxzZSBpZiAoaXNDaGlsZChjKSkge1xuICAgICAgICBjaGlsZE5vZGVzLnB1c2goYyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGMpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYWRkQ2hpbGQoY1tpXSwgY2hpbGROb2RlcywgdGFnLCBwcm9wcyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGMgPT09IG51bGwgfHwgYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBVbmV4cGVjdGVkVmlydHVhbEVsZW1lbnQoe1xuICAgICAgICAgICAgZm9yZWlnbk9iamVjdDogYyxcbiAgICAgICAgICAgIHBhcmVudFZub2RlOiB7XG4gICAgICAgICAgICAgICAgdGFnTmFtZTogdGFnLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BzXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtUHJvcGVydGllcyhwcm9wcykge1xuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcblxuICAgICAgICAgICAgaWYgKGlzSG9vayh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByb3BOYW1lLnN1YnN0cigwLCAzKSA9PT0gJ2V2LScpIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgZXYtZm9vIHN1cHBvcnRcbiAgICAgICAgICAgICAgICBwcm9wc1twcm9wTmFtZV0gPSBldkhvb2sodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0NoaWxkKHgpIHtcbiAgICByZXR1cm4gaXNWTm9kZSh4KSB8fCBpc1ZUZXh0KHgpIHx8IGlzV2lkZ2V0KHgpIHx8IGlzVlRodW5rKHgpO1xufVxuXG5mdW5jdGlvbiBpc0NoaWxkcmVuKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnIHx8IGlzQXJyYXkoeCkgfHwgaXNDaGlsZCh4KTtcbn1cblxuZnVuY3Rpb24gVW5leHBlY3RlZFZpcnR1YWxFbGVtZW50KGRhdGEpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG5cbiAgICBlcnIudHlwZSA9ICd2aXJ0dWFsLWh5cGVyc2NyaXB0LnVuZXhwZWN0ZWQudmlydHVhbC1lbGVtZW50JztcbiAgICBlcnIubWVzc2FnZSA9ICdVbmV4cGVjdGVkIHZpcnR1YWwgY2hpbGQgcGFzc2VkIHRvIGgoKS5cXG4nICtcbiAgICAgICAgJ0V4cGVjdGVkIGEgVk5vZGUgLyBWdGh1bmsgLyBWV2lkZ2V0IC8gc3RyaW5nIGJ1dDpcXG4nICtcbiAgICAgICAgJ2dvdDpcXG4nICtcbiAgICAgICAgZXJyb3JTdHJpbmcoZGF0YS5mb3JlaWduT2JqZWN0KSArXG4gICAgICAgICcuXFxuJyArXG4gICAgICAgICdUaGUgcGFyZW50IHZub2RlIGlzOlxcbicgK1xuICAgICAgICBlcnJvclN0cmluZyhkYXRhLnBhcmVudFZub2RlKVxuICAgICAgICAnXFxuJyArXG4gICAgICAgICdTdWdnZXN0ZWQgZml4OiBjaGFuZ2UgeW91ciBgaCguLi4sIFsgLi4uIF0pYCBjYWxsc2l0ZS4nO1xuICAgIGVyci5mb3JlaWduT2JqZWN0ID0gZGF0YS5mb3JlaWduT2JqZWN0O1xuICAgIGVyci5wYXJlbnRWbm9kZSA9IGRhdGEucGFyZW50Vm5vZGU7XG5cbiAgICByZXR1cm4gZXJyO1xufVxuXG5mdW5jdGlvbiBlcnJvclN0cmluZyhvYmopIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqLCBudWxsLCAnICAgICcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhvYmopO1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNwbGl0ID0gcmVxdWlyZSgnYnJvd3Nlci1zcGxpdCcpO1xuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOV86LV0rKS87XG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlVGFnO1xuXG5mdW5jdGlvbiBwYXJzZVRhZyh0YWcsIHByb3BzKSB7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgICAgcmV0dXJuICdESVYnO1xuICAgIH1cblxuICAgIHZhciBub0lkID0gIShwcm9wcy5oYXNPd25Qcm9wZXJ0eSgnaWQnKSk7XG5cbiAgICB2YXIgdGFnUGFydHMgPSBzcGxpdCh0YWcsIGNsYXNzSWRTcGxpdCk7XG4gICAgdmFyIHRhZ05hbWUgPSBudWxsO1xuXG4gICAgaWYgKG5vdENsYXNzSWQudGVzdCh0YWdQYXJ0c1sxXSkpIHtcbiAgICAgICAgdGFnTmFtZSA9ICdESVYnO1xuICAgIH1cblxuICAgIHZhciBjbGFzc2VzLCBwYXJ0LCB0eXBlLCBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRhZ1BhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnQgPSB0YWdQYXJ0c1tpXTtcblxuICAgICAgICBpZiAoIXBhcnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdHlwZSA9IHBhcnQuY2hhckF0KDApO1xuXG4gICAgICAgIGlmICghdGFnTmFtZSkge1xuICAgICAgICAgICAgdGFnTmFtZSA9IHBhcnQ7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy4nKSB7XG4gICAgICAgICAgICBjbGFzc2VzID0gY2xhc3NlcyB8fCBbXTtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCkpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcjJyAmJiBub0lkKSB7XG4gICAgICAgICAgICBwcm9wcy5pZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjbGFzc2VzKSB7XG4gICAgICAgIGlmIChwcm9wcy5jbGFzc05hbWUpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChwcm9wcy5jbGFzc05hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvcHMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb3BzLm5hbWVzcGFjZSA/IHRhZ05hbWUgOiB0YWdOYW1lLnRvVXBwZXJDYXNlKCk7XG59XG4iLCJ2YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGVUaHVua1xuXG5mdW5jdGlvbiBoYW5kbGVUaHVuayhhLCBiKSB7XG4gICAgdmFyIHJlbmRlcmVkQSA9IGFcbiAgICB2YXIgcmVuZGVyZWRCID0gYlxuXG4gICAgaWYgKGlzVGh1bmsoYikpIHtcbiAgICAgICAgcmVuZGVyZWRCID0gcmVuZGVyVGh1bmsoYiwgYSlcbiAgICB9XG5cbiAgICBpZiAoaXNUaHVuayhhKSkge1xuICAgICAgICByZW5kZXJlZEEgPSByZW5kZXJUaHVuayhhLCBudWxsKVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IHJlbmRlcmVkQSxcbiAgICAgICAgYjogcmVuZGVyZWRCXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJUaHVuayh0aHVuaywgcHJldmlvdXMpIHtcbiAgICB2YXIgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlXG5cbiAgICBpZiAoIXJlbmRlcmVkVGh1bmspIHtcbiAgICAgICAgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlID0gdGh1bmsucmVuZGVyKHByZXZpb3VzKVxuICAgIH1cblxuICAgIGlmICghKGlzVk5vZGUocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzVlRleHQocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzV2lkZ2V0KHJlbmRlcmVkVGh1bmspKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0aHVuayBkaWQgbm90IHJldHVybiBhIHZhbGlkIG5vZGVcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkVGh1bmtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNUaHVua1xyXG5cclxuZnVuY3Rpb24gaXNUaHVuayh0KSB7XHJcbiAgICByZXR1cm4gdCAmJiB0LnR5cGUgPT09IFwiVGh1bmtcIlxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNIb29rXG5cbmZ1bmN0aW9uIGlzSG9vayhob29rKSB7XG4gICAgcmV0dXJuIGhvb2sgJiZcbiAgICAgICh0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiYgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpIHx8XG4gICAgICAgdHlwZW9mIGhvb2sudW5ob29rID09PSBcImZ1bmN0aW9uXCIgJiYgIWhvb2suaGFzT3duUHJvcGVydHkoXCJ1bmhvb2tcIikpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjFcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcbnZhciBpc1ZIb29rID0gcmVxdWlyZShcIi4vaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsTm9kZVxuXG52YXIgbm9Qcm9wZXJ0aWVzID0ge31cbnZhciBub0NoaWxkcmVuID0gW11cblxuZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4sIGtleSwgbmFtZXNwYWNlKSB7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwgbm9Qcm9wZXJ0aWVzXG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuIHx8IG5vQ2hpbGRyZW5cbiAgICB0aGlzLmtleSA9IGtleSAhPSBudWxsID8gU3RyaW5nKGtleSkgOiB1bmRlZmluZWRcbiAgICB0aGlzLm5hbWVzcGFjZSA9ICh0eXBlb2YgbmFtZXNwYWNlID09PSBcInN0cmluZ1wiKSA/IG5hbWVzcGFjZSA6IG51bGxcblxuICAgIHZhciBjb3VudCA9IChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHx8IDBcbiAgICB2YXIgZGVzY2VuZGFudHMgPSAwXG4gICAgdmFyIGhhc1dpZGdldHMgPSBmYWxzZVxuICAgIHZhciBoYXNUaHVua3MgPSBmYWxzZVxuICAgIHZhciBkZXNjZW5kYW50SG9va3MgPSBmYWxzZVxuICAgIHZhciBob29rc1xuXG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG4gICAgICAgICAgICBpZiAoaXNWSG9vayhwcm9wZXJ0eSkgJiYgcHJvcGVydHkudW5ob29rKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFob29rcykge1xuICAgICAgICAgICAgICAgICAgICBob29rcyA9IHt9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaG9va3NbcHJvcE5hbWVdID0gcHJvcGVydHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkpIHtcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzICs9IGNoaWxkLmNvdW50IHx8IDBcblxuICAgICAgICAgICAgaWYgKCFoYXNXaWRnZXRzICYmIGNoaWxkLmhhc1dpZGdldHMpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWhhc1RodW5rcyAmJiBjaGlsZC5oYXNUaHVua3MpIHtcbiAgICAgICAgICAgICAgICBoYXNUaHVua3MgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVzY2VuZGFudEhvb2tzICYmIChjaGlsZC5ob29rcyB8fCBjaGlsZC5kZXNjZW5kYW50SG9va3MpKSB7XG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudEhvb2tzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNXaWRnZXRzICYmIGlzV2lkZ2V0KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGlsZC5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNUaHVua3MgJiYgaXNUaHVuayhjaGlsZCkpIHtcbiAgICAgICAgICAgIGhhc1RodW5rcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gY291bnQgKyBkZXNjZW5kYW50c1xuICAgIHRoaXMuaGFzV2lkZ2V0cyA9IGhhc1dpZGdldHNcbiAgICB0aGlzLmhhc1RodW5rcyA9IGhhc1RodW5rc1xuICAgIHRoaXMuaG9va3MgPSBob29rc1xuICAgIHRoaXMuZGVzY2VuZGFudEhvb2tzID0gZGVzY2VuZGFudEhvb2tzXG59XG5cblZpcnR1YWxOb2RlLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxOb2RlXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5WaXJ0dWFsUGF0Y2guTk9ORSA9IDBcblZpcnR1YWxQYXRjaC5WVEVYVCA9IDFcblZpcnR1YWxQYXRjaC5WTk9ERSA9IDJcblZpcnR1YWxQYXRjaC5XSURHRVQgPSAzXG5WaXJ0dWFsUGF0Y2guUFJPUFMgPSA0XG5WaXJ0dWFsUGF0Y2guT1JERVIgPSA1XG5WaXJ0dWFsUGF0Y2guSU5TRVJUID0gNlxuVmlydHVhbFBhdGNoLlJFTU9WRSA9IDdcblZpcnR1YWxQYXRjaC5USFVOSyA9IDhcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsUGF0Y2hcblxuZnVuY3Rpb24gVmlydHVhbFBhdGNoKHR5cGUsIHZOb2RlLCBwYXRjaCkge1xuICAgIHRoaXMudHlwZSA9IE51bWJlcih0eXBlKVxuICAgIHRoaXMudk5vZGUgPSB2Tm9kZVxuICAgIHRoaXMucGF0Y2ggPSBwYXRjaFxufVxuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxQYXRjaFwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBWaXJ0dWFsVGV4dCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0ID0gU3RyaW5nKHRleHQpXG59XG5cblZpcnR1YWxUZXh0LnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFRleHQucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxUZXh0XCJcbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcbnZhciBpc0hvb2sgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmUHJvcHNcblxuZnVuY3Rpb24gZGlmZlByb3BzKGEsIGIpIHtcbiAgICB2YXIgZGlmZlxuXG4gICAgZm9yICh2YXIgYUtleSBpbiBhKSB7XG4gICAgICAgIGlmICghKGFLZXkgaW4gYikpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gdW5kZWZpbmVkXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYVZhbHVlID0gYVthS2V5XVxuICAgICAgICB2YXIgYlZhbHVlID0gYlthS2V5XVxuXG4gICAgICAgIGlmIChhVmFsdWUgPT09IGJWYWx1ZSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChhVmFsdWUpICYmIGlzT2JqZWN0KGJWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChnZXRQcm90b3R5cGUoYlZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKGFWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKGJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0RGlmZiA9IGRpZmZQcm9wcyhhVmFsdWUsIGJWYWx1ZSlcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0RGlmZikge1xuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gb2JqZWN0RGlmZlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBiS2V5IGluIGIpIHtcbiAgICAgICAgaWYgKCEoYktleSBpbiBhKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYktleV0gPSBiW2JLZXldXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICB9XG59XG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG5cbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi4vdm5vZGUvdnBhdGNoXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXRodW5rXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi4vdm5vZGUvaGFuZGxlLXRodW5rXCIpXG5cbnZhciBkaWZmUHJvcHMgPSByZXF1aXJlKFwiLi9kaWZmLXByb3BzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuXG5mdW5jdGlvbiBkaWZmKGEsIGIpIHtcbiAgICB2YXIgcGF0Y2ggPSB7IGE6IGEgfVxuICAgIHdhbGsoYSwgYiwgcGF0Y2gsIDApXG4gICAgcmV0dXJuIHBhdGNoXG59XG5cbmZ1bmN0aW9uIHdhbGsoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG4gICAgdmFyIGFwcGx5Q2xlYXIgPSBmYWxzZVxuXG4gICAgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoYiA9PSBudWxsKSB7XG5cbiAgICAgICAgLy8gSWYgYSBpcyBhIHdpZGdldCB3ZSB3aWxsIGFkZCBhIHJlbW92ZSBwYXRjaCBmb3IgaXRcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGFueSBjaGlsZCB3aWRnZXRzL2hvb2tzIG11c3QgYmUgZGVzdHJveWVkLlxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGFkZGluZyB0d28gcmVtb3ZlIHBhdGNoZXMgZm9yIGEgd2lkZ2V0LlxuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBjbGVhclN0YXRlKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG4gICAgICAgIH1cblxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGEsIGIpKVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZShiKSkge1xuICAgICAgICBpZiAoaXNWTm9kZShhKSkge1xuICAgICAgICAgICAgaWYgKGEudGFnTmFtZSA9PT0gYi50YWdOYW1lICYmXG4gICAgICAgICAgICAgICAgYS5uYW1lc3BhY2UgPT09IGIubmFtZXNwYWNlICYmXG4gICAgICAgICAgICAgICAgYS5rZXkgPT09IGIua2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzUGF0Y2ggPSBkaWZmUHJvcHMoYS5wcm9wZXJ0aWVzLCBiLnByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgaWYgKHByb3BzUGF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCBhLCBwcm9wc1BhdGNoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KGIpKSB7XG4gICAgICAgIGlmICghaXNWVGV4dChhKSkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgfSBlbHNlIGlmIChhLnRleHQgIT09IGIudGV4dCkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpZGdldChiKSkge1xuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLldJREdFVCwgYSwgYikpXG4gICAgfVxuXG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGx5XG4gICAgfVxuXG4gICAgaWYgKGFwcGx5Q2xlYXIpIHtcbiAgICAgICAgY2xlYXJTdGF0ZShhLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleCkge1xuICAgIHZhciBhQ2hpbGRyZW4gPSBhLmNoaWxkcmVuXG4gICAgdmFyIGJDaGlsZHJlbiA9IHJlb3JkZXIoYUNoaWxkcmVuLCBiLmNoaWxkcmVuKVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBiQ2hpbGRyZW5baV1cbiAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgIGlmICghbGVmdE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChyaWdodE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYiBuZWVkIHRvIGJlIGFkZGVkXG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guSU5TRVJULCBudWxsLCByaWdodE5vZGUpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FsayhsZWZ0Tm9kZSwgcmlnaHROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNWTm9kZShsZWZ0Tm9kZSkgJiYgbGVmdE5vZGUuY291bnQpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IGxlZnROb2RlLmNvdW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYkNoaWxkcmVuLm1vdmVzKSB7XG4gICAgICAgIC8vIFJlb3JkZXIgbm9kZXMgbGFzdFxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5PUkRFUiwgYSwgYkNoaWxkcmVuLm1vdmVzKSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlcbn1cblxuZnVuY3Rpb24gY2xlYXJTdGF0ZSh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgLy8gVE9ETzogTWFrZSB0aGlzIGEgc2luZ2xlIHdhbGssIG5vdCB0d29cbiAgICB1bmhvb2sodk5vZGUsIHBhdGNoLCBpbmRleClcbiAgICBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KVxufVxuXG4vLyBQYXRjaCByZWNvcmRzIGZvciBhbGwgZGVzdHJveWVkIHdpZGdldHMgbXVzdCBiZSBhZGRlZCBiZWNhdXNlIHdlIG5lZWRcbi8vIGEgRE9NIG5vZGUgcmVmZXJlbmNlIGZvciB0aGUgZGVzdHJveSBmdW5jdGlvblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1dpZGdldCh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2Tm9kZS5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGVuZFBhdGNoKFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSxcbiAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIHZOb2RlLCBudWxsKVxuICAgICAgICAgICAgKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKHZOb2RlKSAmJiAodk5vZGUuaGFzV2lkZ2V0cyB8fCB2Tm9kZS5oYXNUaHVua3MpKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayh2Tm9kZSkpIHtcbiAgICAgICAgdGh1bmtzKHZOb2RlLCBudWxsLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG4vLyBDcmVhdGUgYSBzdWItcGF0Y2ggZm9yIHRodW5rc1xuZnVuY3Rpb24gdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIHZhciBub2RlcyA9IGhhbmRsZVRodW5rKGEsIGIpO1xuICAgIHZhciB0aHVua1BhdGNoID0gZGlmZihub2Rlcy5hLCBub2Rlcy5iKVxuICAgIGlmIChoYXNQYXRjaGVzKHRodW5rUGF0Y2gpKSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlRIVU5LLCBudWxsLCB0aHVua1BhdGNoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzUGF0Y2hlcyhwYXRjaCkge1xuICAgIGZvciAodmFyIGluZGV4IGluIHBhdGNoKSB7XG4gICAgICAgIGlmIChpbmRleCAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBFeGVjdXRlIGhvb2tzIHdoZW4gdHdvIG5vZGVzIGFyZSBpZGVudGljYWxcbmZ1bmN0aW9uIHVuaG9vayh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzVk5vZGUodk5vZGUpKSB7XG4gICAgICAgIGlmICh2Tm9kZS5ob29rcykge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwZW5kUGF0Y2goXG4gICAgICAgICAgICAgICAgcGF0Y2hbaW5kZXhdLFxuICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goXG4gICAgICAgICAgICAgICAgICAgIFZQYXRjaC5QUk9QUyxcbiAgICAgICAgICAgICAgICAgICAgdk5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZEtleXModk5vZGUuaG9va3MpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZOb2RlLmRlc2NlbmRhbnRIb29rcyB8fCB2Tm9kZS5oYXNUaHVua3MpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB1bmhvb2soY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayh2Tm9kZSkpIHtcbiAgICAgICAgdGh1bmtzKHZOb2RlLCBudWxsLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG5mdW5jdGlvbiB1bmRlZmluZWRLZXlzKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fVxuXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICByZXN1bHRba2V5XSA9IHVuZGVmaW5lZFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbn1cblxuLy8gTGlzdCBkaWZmLCBuYWl2ZSBsZWZ0IHRvIHJpZ2h0IHJlb3JkZXJpbmdcbmZ1bmN0aW9uIHJlb3JkZXIoYUNoaWxkcmVuLCBiQ2hpbGRyZW4pIHtcblxuICAgIHZhciBiS2V5cyA9IGtleUluZGV4KGJDaGlsZHJlbilcblxuICAgIGlmICghYktleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBhS2V5cyA9IGtleUluZGV4KGFDaGlsZHJlbilcblxuICAgIGlmICghYUtleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBiTWF0Y2ggPSB7fSwgYU1hdGNoID0ge31cblxuICAgIGZvciAodmFyIGFLZXkgaW4gYktleXMpIHtcbiAgICAgICAgYk1hdGNoW2JLZXlzW2FLZXldXSA9IGFLZXlzW2FLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgYktleSBpbiBhS2V5cykge1xuICAgICAgICBhTWF0Y2hbYUtleXNbYktleV1dID0gYktleXNbYktleV1cbiAgICB9XG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuICAgIHZhciBzaHVmZmxlID0gW11cbiAgICB2YXIgZnJlZUluZGV4ID0gMFxuICAgIHZhciBpID0gMFxuICAgIHZhciBtb3ZlSW5kZXggPSAwXG4gICAgdmFyIG1vdmVzID0ge31cbiAgICB2YXIgcmVtb3ZlcyA9IG1vdmVzLnJlbW92ZXMgPSB7fVxuICAgIHZhciByZXZlcnNlID0gbW92ZXMucmV2ZXJzZSA9IHt9XG4gICAgdmFyIGhhc01vdmVzID0gZmFsc2VcblxuICAgIHdoaWxlIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgdmFyIG1vdmUgPSBhTWF0Y2hbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGJDaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaWYgKG1vdmUgIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgIG1vdmVzW21vdmVdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gbW92ZVxuICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgfSBlbHNlIGlmIChpIGluIGFNYXRjaCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgcmVtb3Zlc1tpXSA9IG1vdmVJbmRleCsrXG4gICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChiTWF0Y2hbZnJlZUluZGV4XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlQ2hpbGQgPSBiQ2hpbGRyZW5bZnJlZUluZGV4XVxuICAgICAgICAgICAgICAgIGlmIChmcmVlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGZyZWVDaGlsZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJlZUluZGV4ICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZXNbZnJlZUluZGV4XSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gZnJlZUluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpKytcbiAgICB9XG5cbiAgICBpZiAoaGFzTW92ZXMpIHtcbiAgICAgICAgc2h1ZmZsZS5tb3ZlcyA9IG1vdmVzXG4gICAgfVxuXG4gICAgcmV0dXJuIHNodWZmbGVcbn1cblxuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4pIHtcbiAgICB2YXIgaSwga2V5c1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cbiAgICAgICAgaWYgKGNoaWxkLmtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBrZXlzID0ga2V5cyB8fCB7fVxuICAgICAgICAgICAga2V5c1tjaGlsZC5rZXldID0gaVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXNcbn1cblxuZnVuY3Rpb24gYXBwZW5kUGF0Y2goYXBwbHksIHBhdGNoKSB7XG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFwcGx5KSkge1xuICAgICAgICAgICAgYXBwbHkucHVzaChwYXRjaClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gW2FwcGx5LCBwYXRjaF1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcHBseVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRjaFxuICAgIH1cbn1cbiIsInZhciBoaWRkZW5TdG9yZSA9IHJlcXVpcmUoJy4vaGlkZGVuLXN0b3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlU3RvcmU7XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0b3JlKCkge1xuICAgIHZhciBrZXkgPSB7fTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSAmJlxuICAgICAgICAgICAgdHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2Vha21hcC1zaGltOiBLZXkgbXVzdCBiZSBvYmplY3QnKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0b3JlID0gb2JqLnZhbHVlT2Yoa2V5KTtcbiAgICAgICAgcmV0dXJuIHN0b3JlICYmIHN0b3JlLmlkZW50aXR5ID09PSBrZXkgP1xuICAgICAgICAgICAgc3RvcmUgOiBoaWRkZW5TdG9yZShvYmosIGtleSk7XG4gICAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaGlkZGVuU3RvcmU7XG5cbmZ1bmN0aW9uIGhpZGRlblN0b3JlKG9iaiwga2V5KSB7XG4gICAgdmFyIHN0b3JlID0geyBpZGVudGl0eToga2V5IH07XG4gICAgdmFyIHZhbHVlT2YgPSBvYmoudmFsdWVPZjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFwidmFsdWVPZlwiLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSAhPT0ga2V5ID9cbiAgICAgICAgICAgICAgICB2YWx1ZU9mLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBzdG9yZTtcbiAgICAgICAgfSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHJldHVybiBzdG9yZTtcbn1cbiIsInZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheVxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5hdGl2ZUlzQXJyYXkgfHwgaXNBcnJheVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwidmFyIGl0ZXJhdGVNb250aCA9IHJlcXVpcmUoJy4vaXRlcmF0ZS1tb250aCcpO1xudmFyIGdldERhdGUgPSByZXF1aXJlKCcuLi9nZXQtZGF0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbGFzdE1vbnRoOiBpdGVyYXRlTW9udGgoZ2V0RGF0ZS5sYXN0KSxcbiAgbmV4dE1vbnRoOiBpdGVyYXRlTW9udGgoZ2V0RGF0ZS5uZXh0KSxcbiAgdG9nZ2xlOiByZXF1aXJlKCcuL3RvZ2dsZScpXG59O1xuIiwidmFyIGdlbmVyYXRlTW9udGggPSByZXF1aXJlKCcuLi9nZW5lcmF0ZS1tb250aCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGl0ZXJhdGVNb250aEZhY3RvcnkoaXRlcmF0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGl0ZXJhdGVNb250aChzdGF0ZSkge1xuICAgIHZhciBkYXRlID0gaXRlcmF0b3Ioc3RhdGUubW9kZWwuZGlzcGxheWVkTW9udGgoKSwgc3RhdGUubW9kZWwuZGlzcGxheWVkWWVhcigpKTtcbiAgICB2YXIgeWVhciA9IHN0YXRlLm1vZGVsLnllYXJzW2RhdGUueWVhcl0gfHwge307XG5cbiAgICBzdGF0ZS5tb2RlbC5kaXNwbGF5ZWRNb250aC5zZXQoZGF0ZS5tb250aCk7XG4gICAgc3RhdGUubW9kZWwuZGlzcGxheWVkWWVhci5zZXQoZGF0ZS55ZWFyKTtcblxuICAgIHZhciBtb250aCA9IGdlbmVyYXRlTW9udGgoe1xuICAgICAgY3VycmVudE1vbnRoOiBzdGF0ZS5tb2RlbC5jdXJyZW50TW9udGgoKSxcbiAgICAgIGN1cnJlbnRZZWFyOiBzdGF0ZS5tb2RlbC5jdXJyZW50WWVhcigpLFxuICAgICAgY3VycmVudERheTogc3RhdGUubW9kZWwuY3VycmVudERheSgpLFxuICAgICAgbW9udGg6IGRhdGUubW9udGgsXG4gICAgICB5ZWFyOiBkYXRlLnllYXIsXG4gICAgICBmaXJzdERheTogc3RhdGUubW9kZWwudHJhbnNsYXRpb24uZmlyc3REYXlcbiAgICB9KTtcblxuICAgIHN0YXRlLm1vZGVsLnllYXJzW2RhdGUueWVhcl0gPSB5ZWFyO1xuICAgIHN0YXRlLm1vZGVsLnllYXJzW2RhdGUueWVhcl1bZGF0ZS5tb250aF0gPSBtb250aDtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRvZ2dsZShzdGF0ZSkge1xuICBpZiAoIXN0YXRlLm1vZGVsLmlzT3BlbigpKSB7XG4gICAgc3RhdGUubW9kZWwuaXNQb3BVcFRvcC5zZXQoc3RhdGUubW9kZWwuaXNCdXR0b25JbkJvdHRvbUhhbGYoKSk7XG4gIH1cblxuICBzdGF0ZS5tb2RlbC5pc09wZW4uc2V0KCFzdGF0ZS5tb2RlbC5pc09wZW4oKSk7XG59O1xuIiwidmFyIHRpbWVzID0gcmVxdWlyZSgnbG9kYXNoLnRpbWVzJyk7XG52YXIgbW9udGhEYXlzID0gcmVxdWlyZSgnbW9udGgtZGF5cycpO1xudmFyIGdldERhdGUgPSByZXF1aXJlKCcuL2dldC1kYXRlJyk7XG52YXIgZ2V0Rmlyc3REYXlPZk1vbnRoID0gcmVxdWlyZSgnLi9nZXQtZmlyc3QtZGF5LW9mLW1vbnRoJyk7XG52YXIgbW9kdWxvID0gcmVxdWlyZSgnLi9tb2R1bG8nKTtcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZU1vbnRoKGFyZ3MpIHtcbiAgdmFyIGxhc3REYXRlID0gZ2V0RGF0ZS5sYXN0KGFyZ3MubW9udGgsIGFyZ3MueWVhcik7XG5cbiAgdmFyIG51bWJlck9mRGF5cyA9IG1vbnRoRGF5cyhhcmdzLm1vbnRoLCBhcmdzLnllYXIpO1xuICB2YXIgbnVtYmVyT2ZEYXlzTGFzdE1vbnRoID0gbW9udGhEYXlzKGxhc3REYXRlLm1vbnRoLCBsYXN0RGF0ZS55ZWFyKTtcblxuICB2YXIgZmlyc3REYXlPZk1vbnRoID0gZ2V0Rmlyc3REYXlPZk1vbnRoKGFyZ3MubW9udGgsIGFyZ3MueWVhcik7XG5cbiAgLy8gUkVBRE1FOiBkdWUgdG8gd2VpcmQgZm9ybWF0IG9mIHRyYW5zbGF0aW9uLmZpcnN0RGF5LlxuICB2YXIgZmlyc3REYXkgPSBtb2R1bG8oYXJncy5maXJzdERheSAtIDEsIDcpO1xuICB2YXIgbnVtYmVyT2ZEYXlzU2hvd25Gcm9tTGFzdE1vbnRoID0gbW9kdWxvKDcgKyBmaXJzdERheU9mTW9udGggLSBmaXJzdERheSwgNyk7XG5cbiAgdmFyIG51bWJlck9mRGF5c1Nob3duRnJvbU5leHRNb250aCA9IHNldHRpbmdzLm51bWJlck9mRGF5c0luQ2FsZW5kYXIgLVxuICAgIChudW1iZXJPZkRheXNTaG93bkZyb21MYXN0TW9udGggKyBudW1iZXJPZkRheXMpO1xuXG4gIC8vIEZJWE1FOiBhbGwgb2YgdGhlIFwiaXNEaXNhYmxlZFwiIGFyZSB3cm9uZy4gIHRoZXkgbmVlZCB0byBhY2NvdW50IGZvciB0aGUgZGlmZmVyZW5jZVxuICAvLyBiZXR3ZWVuIHRoZSBzZWxlY3RlZCBkYXRlIGFuZCB0aGUgY3VycmVudCBkYXRlLiBzZWxlY3RlZCBkYXRlIG1heSBiZSBpbiBhIGRpZmZlcmVudCBtb250aFxuICB2YXIgZGF5c0xhc3RNb250aCA9IHRpbWVzKG51bWJlck9mRGF5c1Nob3duRnJvbUxhc3RNb250aCwgZnVuY3Rpb24gYnVpbGRMYXN0TW9udGhEYXlzKGRheUluZGV4KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRheU9mTW9udGg6IG51bWJlck9mRGF5c0xhc3RNb250aCAtIG51bWJlck9mRGF5c1Nob3duRnJvbUxhc3RNb250aCArIGRheUluZGV4ICsgMSxcbiAgICAgIGlzRGlzYWJsZWQ6IHRydWVcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZGF5c1RoaXNNb250aCA9IHRpbWVzKG51bWJlck9mRGF5cywgZnVuY3Rpb24gYnVpbGREYXlzKGRheUluZGV4KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRheU9mTW9udGg6IGRheUluZGV4ICsgMSxcbiAgICAgIGlzRGlzYWJsZWQ6IGRheUluZGV4IDwgYXJncy5jdXJyZW50RGF5XG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGRheXNOZXh0TW9udGggPSB0aW1lcyhudW1iZXJPZkRheXNTaG93bkZyb21OZXh0TW9udGgsIGZ1bmN0aW9uIGJ1aWxkTmV4dE1vbnRoRGF5cyhkYXlJbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBkYXlPZk1vbnRoOiBkYXlJbmRleCArIDEsXG4gICAgICBpc0Rpc2FibGVkOiB0cnVlXG4gICAgfTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwbGF5ZWREYXlzOiBkYXlzTGFzdE1vbnRoLmNvbmNhdChkYXlzVGhpc01vbnRoKS5jb25jYXQoZGF5c05leHRNb250aClcbiAgfTtcbn07XG4iLCJ2YXIgbW9kdWxvID0gcmVxdWlyZSgnLi9tb2R1bG8nKTtcblxuZnVuY3Rpb24gbGFzdChtb250aCwgeWVhcikge1xuICB2YXIgbGFzdE1vbnRoID0gbW9kdWxvKG1vbnRoIC0gMSwgMTIpO1xuICB2YXIgbGFzdFllYXIgPSBtb250aCA9PT0gMCA/IHllYXIgLSAxIDogeWVhcjtcblxuICByZXR1cm4ge1xuICAgIG1vbnRoOiBsYXN0TW9udGgsXG4gICAgeWVhcjogbGFzdFllYXJcbiAgfTtcbn1cblxuZnVuY3Rpb24gbmV4dChtb250aCwgeWVhcikge1xuICB2YXIgbmV4dE1vbnRoID0gbW9kdWxvKG1vbnRoICsgMSwgMTIpO1xuICB2YXIgbmV4dFllYXIgPSBtb250aCA9PT0gMTEgPyB5ZWFyICsgMSA6IHllYXI7XG5cbiAgcmV0dXJuIHtcbiAgICBtb250aDogbmV4dE1vbnRoLFxuICAgIHllYXI6IG5leHRZZWFyXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsYXN0OiBsYXN0LFxuICBuZXh0OiBuZXh0XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRGaXJzdERheU9mTW9udGgobW9udGgsIHllYXIpIHtcbiAgcmV0dXJuIG5ldyBEYXRlKHllYXIgKyAnLScgKyAobW9udGggKyAxKSArICctMDEnKS5nZXREYXkoKTtcbn07XG4iLCJ2YXIgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvZGF0ZS1waWNrZXInKTtcbnZhciBtb3VudCA9IHJlcXVpcmUoJy4vbW91bnQnKTtcbnZhciBpbml0aWFsaXplU3RhdGUgPSByZXF1aXJlKCcuL2luaXRpYWxpemUtc3RhdGUnKTtcblxudmFyIERhdGVQaWNrZXIgPSBpbml0aWFsaXplU3RhdGU7XG5EYXRlUGlja2VyLnJlbmRlciA9IHJlbmRlcjtcbkRhdGVQaWNrZXIubW91bnQgPSBtb3VudDtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRlUGlja2VyO1xuIiwidmFyIGhnID0gcmVxdWlyZSgnbWVyY3VyeScpO1xudmFyIHRyYW5zbGF0aW9ucyA9IHJlcXVpcmUoJy4vdHJhbnNsYXRpb25zJyk7XG52YXIgZGF0ZUZvcm1hdCA9IHJlcXVpcmUoJ2RhdGVmb3JtYXQnKTtcbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG52YXIgY2hhbm5lbHMgPSByZXF1aXJlKCcuL2NoYW5uZWxzJyk7XG52YXIgZ2VuZXJhdGVNb250aCA9IHJlcXVpcmUoJy4vZ2VuZXJhdGUtbW9udGgnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbml0aWFsaXplU3RhdGUob3B0cykge1xuICB2YXIgYXJncyA9IG9wdHMgfHwge307XG4gIHZhciB0cmFuc2xhdGlvbiA9IHh0ZW5kKHRyYW5zbGF0aW9uc1snZW4tVVMnXSwgdHJhbnNsYXRpb25zW2FyZ3MubG9jYWxlXSB8fCB7fSk7XG4gIHZhciBjdXJyZW50RGF0ZSA9IGFyZ3MuY3VycmVudERhdGUgfHwgbmV3IERhdGUoKTtcbiAgdmFyIHNlbGVjdGVkRGF0ZSA9IGFyZ3Muc2VsZWN0ZWREYXRlIHx8IGN1cnJlbnREYXRlO1xuXG4gIHZhciBzZWxlY3RlZERheSA9IHNlbGVjdGVkRGF0ZS5nZXREYXRlKCk7XG4gIHZhciBzZWxlY3RlZE1vbnRoID0gc2VsZWN0ZWREYXRlLmdldE1vbnRoKCk7XG4gIHZhciBzZWxlY3RlZFllYXIgPSBzZWxlY3RlZERhdGUuZ2V0RnVsbFllYXIoKTtcblxuICB2YXIgY3VycmVudERheSA9IGN1cnJlbnREYXRlLmdldERhdGUoKTtcbiAgdmFyIGN1cnJlbnRNb250aCA9IGN1cnJlbnREYXRlLmdldE1vbnRoKCk7XG4gIHZhciBjdXJyZW50WWVhciA9IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XG5cbiAgZGF0ZUZvcm1hdC5pMThuID0ge1xuICAgIGRheU5hbWVzOiB0cmFuc2xhdGlvbi53ZWVrZGF5c1Nob3J0LmNvbmNhdCh0cmFuc2xhdGlvbi53ZWVrZGF5c0Z1bGwpLFxuICAgIG1vbnRoTmFtZXM6IHRyYW5zbGF0aW9uLm1vbnRoc1Nob3J0LmNvbmNhdCh0cmFuc2xhdGlvbi5tb250aHNGdWxsKVxuICB9O1xuXG4gIHZhciB5ZWFycyA9IHt9O1xuICB2YXIgbW9udGggPSBnZW5lcmF0ZU1vbnRoKHtcbiAgICBjdXJyZW50RGF5OiBjdXJyZW50RGF5LFxuICAgIGN1cnJlbnRNb250aDogY3VycmVudE1vbnRoLFxuICAgIGN1cnJlbnRZZWFyOiBjdXJyZW50WWVhcixcbiAgICBmaXJzdERheTogdHJhbnNsYXRpb24uZmlyc3REYXksXG4gICAgbW9udGg6IHNlbGVjdGVkTW9udGgsXG4gICAgeWVhcjogc2VsZWN0ZWRZZWFyXG4gIH0pO1xuXG4gIHllYXJzW3NlbGVjdGVkWWVhcl0gPSB7fTtcbiAgeWVhcnNbc2VsZWN0ZWRZZWFyXVtzZWxlY3RlZE1vbnRoXSA9IG1vbnRoO1xuXG4gIHJldHVybiBoZy5zdGF0ZSh7XG4gICAgY2hhbm5lbHM6IGNoYW5uZWxzLFxuICAgIG1vZGVsOiBoZy5zdHJ1Y3Qoe1xuICAgICAgY3VycmVudERheTogaGcudmFsdWUoY3VycmVudERheSksXG4gICAgICBjdXJyZW50TW9udGg6IGhnLnZhbHVlKGN1cnJlbnRNb250aCksXG4gICAgICBjdXJyZW50WWVhcjogaGcudmFsdWUoY3VycmVudFllYXIpLFxuICAgICAgZGlzcGxheWVkTW9udGg6IGhnLnZhbHVlKHNlbGVjdGVkTW9udGgpLFxuICAgICAgZGlzcGxheWVkWWVhcjogaGcudmFsdWUoc2VsZWN0ZWRZZWFyKSxcbiAgICAgIGhpZ2hsaWdodGVkRGF5SW5kZXg6IGhnLnZhbHVlKG51bGwpLFxuICAgICAgLy8gRklYTUU6IGluaXRpYWxpemUgZnJvbSBlbGVtZW50IGlmIGl0IGV4aXN0c1xuICAgICAgaXNCdXR0b25JbkJvdHRvbUhhbGY6IGhnLnZhbHVlKGZhbHNlKSxcbiAgICAgIGlzUG9wVXBUb3A6IGhnLnZhbHVlKGZhbHNlKSxcbiAgICAgIGlzT3BlbjogaGcudmFsdWUoZmFsc2UpLFxuICAgICAgc2VsZWN0ZWREYXk6IGhnLnZhbHVlKHNlbGVjdGVkRGF5KSxcbiAgICAgIHNlbGVjdGVkTW9udGg6IGhnLnZhbHVlKHNlbGVjdGVkTW9udGgpLFxuICAgICAgc2VsZWN0ZWRZZWFyOiBoZy52YWx1ZShzZWxlY3RlZFllYXIpLFxuICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uLFxuICAgICAgeWVhcnM6IHllYXJzXG4gICAgfSlcbiAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtb2R1bG8obiwgbSkge1xuICByZXR1cm4gKChuICUgbSkgKyBtKSAlIG07XG59O1xuIiwidmFyIGFwcCA9IHJlcXVpcmUoJ21lcmN1cnknKS5hcHA7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbW91bnQoZWwsIG9wdHMpIHtcbiAgYXBwKGVsLCB0aGlzKG9wdHMpLCB0aGlzLnJlbmRlcik7XG59O1xuIiwidmFyIGhnID0gcmVxdWlyZSgnbWVyY3VyeScpO1xudmFyIGRhdGVGb3JtYXQgPSByZXF1aXJlKCdkYXRlZm9ybWF0Jyk7XG52YXIgcG9wVXAgPSByZXF1aXJlKCcuL3BvcC11cCcpO1xuXG52YXIgaCA9IGhnLmg7XG5cbnZhciBzdHlsZXMgPSB7XG4gIGRhdGVQaWNrZXI6IHtcbiAgICB0ZXh0QWxpZ246ICdjZW50ZXInXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGF0ZVBpY2tlcihzdGF0ZSkge1xuICB2YXIgc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoXG4gICAgc3RhdGUubW9kZWwuc2VsZWN0ZWRZZWFyLFxuICAgIHN0YXRlLm1vZGVsLnNlbGVjdGVkTW9udGgsXG4gICAgc3RhdGUubW9kZWwuc2VsZWN0ZWREYXlcbiAgKTtcblxuICAvLyBGSVhNRTogYWRkIGhvb2sgZm9yIGxpc3RlbmluZy91bmxpc3RlbmluZyBmcm9tIHdpbmRvdyBzY3JvbGwvcmVzaXplIGV2ZW50c1xuICByZXR1cm4gaCgnZGl2Jywge1xuICAgIHN0eWxlOiBzdHlsZXMuZGF0ZVBpY2tlclxuICB9LCBbXG4gICAgaCgnYScsIHtcbiAgICAgICdldi1jbGljayc6IGhnLnNlbmQoc3RhdGUuY2hhbm5lbHMudG9nZ2xlKVxuICAgIH0sXG4gICAgZGF0ZUZvcm1hdChzZWxlY3RlZERhdGUsIHN0YXRlLm1vZGVsLnRyYW5zbGF0aW9uLmZvcm1hdCkpLFxuICAgIHBvcFVwKHN0YXRlKVxuICBdKTtcbn07XG4iLCJ2YXIgaGcgPSByZXF1aXJlKCdtZXJjdXJ5Jyk7XG52YXIgZGF0ZUZvcm1hdCA9IHJlcXVpcmUoJ2RhdGVmb3JtYXQnKTtcblxudmFyIGggPSBoZy5oO1xuXG52YXIgc3R5bGVzID0ge1xuICBwb3BVcEhlYWRlcjoge1xuICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXG4gICAgcG9zaXRpb246ICdyZWxhdGl2ZSdcbiAgfSxcbiAgbGFzdE1vbnRoOiB7XG4gICAgd2lkdGg6ICczMHB4JyxcbiAgICBoZWlnaHQ6ICczMHB4JyxcbiAgICBmbG9hdDogJ2xlZnQnLFxuICAgIGJhY2tncm91bmRDb2xvcjogJ2JsYWNrJ1xuICB9LFxuICBuZXh0TW9udGg6IHtcbiAgICBoZWlnaHQ6ICczMHB4JyxcbiAgICB3aWR0aDogJzMwcHgnLFxuICAgIGZsb2F0OiAncmlnaHQnLFxuICAgIGJhY2tncm91bmRDb2xvcjogJ2JsYWNrJ1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhlYWRlcihzdGF0ZSkge1xuICB2YXIgZGlzcGxheWVkRGF0ZSA9IG5ldyBEYXRlKFxuICAgIHN0YXRlLm1vZGVsLmRpc3BsYXllZFllYXIsXG4gICAgc3RhdGUubW9kZWwuZGlzcGxheWVkTW9udGhcbiAgKTtcblxuICB2YXIgdGl0bGUgPSBkYXRlRm9ybWF0KGRpc3BsYXllZERhdGUsICdtbW1tIHl5eXknKTtcblxuICByZXR1cm4gaCgnZGl2Jywge1xuICAgIHN0eWxlOiBzdHlsZXMucG9wVXBIZWFkZXJcbiAgfSwgW1xuICAgIHRpdGxlLFxuICAgIGgoJ2RpdicsIHtcbiAgICAgIHN0eWxlOiBzdHlsZXMubGFzdE1vbnRoLFxuICAgICAgJ2V2LWNsaWNrJzogaGcuc2VuZChzdGF0ZS5jaGFubmVscy5sYXN0TW9udGgpXG4gICAgfSksXG4gICAgaCgnZGl2Jywge1xuICAgICAgc3R5bGU6IHN0eWxlcy5uZXh0TW9udGgsXG4gICAgICAnZXYtY2xpY2snOiBoZy5zZW5kKHN0YXRlLmNoYW5uZWxzLm5leHRNb250aClcbiAgICB9KVxuICBdKTtcbn07XG4iLCJ2YXIgaCA9IHJlcXVpcmUoJ21lcmN1cnknKS5oO1xudmFyIHh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcbnZhciBoZWFkZXIgPSByZXF1aXJlKCcuL2hlYWRlcicpO1xudmFyIHRhYmxlSGVhZCA9IHJlcXVpcmUoJy4vdGFibGUtaGVhZCcpO1xuXG52YXIgc3R5bGVzID0ge1xuICBwb3BVcDoge1xuICAgIGJvcmRlclJhZGl1czogJzNweCcsXG4gICAgYm94U2hhZG93OiAnMCAwIDAgMXB4IHJnYmEoMCwwLDAsLjEpJyxcbiAgICBib3hTaXppbmc6ICdib3JkZXItYm94JyxcbiAgICBoZWlnaHQ6ICcxOGVtJyxcbiAgICBsZWZ0OiAnY2FsYyg1MCUgLSAxMXJlbSknLFxuICAgIHBhZGRpbmc6ICcxZW0nLFxuICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgIC8vIEZJWE1FOiB1c2UgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvYXV0b3ByZWZpeFxuICAgIHRyYW5zaXRpb246ICd0cmFuc2Zvcm0gMC4xNXMgZWFzZS1vdXQsIG9wYWNpdHkgMC4xNXMgZWFzZS1vdXQsIHBvc2l0aW9uIDAuMTVzIGVhc2Utb3V0LCBoZWlnaHQgMHMgMC4xNXMnLFxuICAgIHdpZHRoOiAnMjJlbSdcbiAgfSxcbiAgdGFibGU6IHtcbiAgICBib3JkZXJDb2xsYXBzZTogJ2NvbGxhcHNlJyxcbiAgICBib3JkZXJTcGFjaW5nOiAwLFxuICAgIGJveFNpemluZzogJ2JvcmRlci1ib3gnLFxuICAgIGZvbnRTaXplOiAnaW5oZXJpdCcsXG4gICAgbWFyZ2luVG9wOiAnMXJlbScsXG4gICAgdGFibGVMYXlvdXQ6ICdmaXhlZCcsXG4gICAgdGV4dEFsaWduOiAnY2VudGVyJyxcbiAgICB3aWR0aDogJzEwMCUnXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcG9wVXAoc3RhdGUpIHtcbiAgdmFyIHBvcFVwU3R5bGUgPSB4dGVuZChzdHlsZXMucG9wVXApO1xuXG4gIGlmIChzdGF0ZS5tb2RlbC5pc1BvcFVwVG9wKSB7XG4gICAgcG9wVXBTdHlsZS50b3AgPSAgJy0nICsgc3R5bGVzLnBvcFVwLmhlaWdodDtcbiAgfVxuXG4gIHZhciB0cmFuc2xhdGVZO1xuICBpZiAoIXN0YXRlLm1vZGVsLmlzT3Blbikge1xuICAgIHBvcFVwU3R5bGUub3BhY2l0eSA9IDA7XG4gICAgcG9wVXBTdHlsZS56SW5kZXggPSAtMjAwMDtcblxuICAgIHRyYW5zbGF0ZVkgPSBzdGF0ZS5tb2RlbC5pc1BvcFVwVG9wID8gMSA6IC0xO1xuICB9IGVsc2Uge1xuICAgIHRyYW5zbGF0ZVkgPSAwO1xuICB9XG5cbiAgcG9wVXBTdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWSgnICsgdHJhbnNsYXRlWSArICdlbSkgcGVyc3BlY3RpdmUoNjAwcHgpIHJvdGF0ZVgoMCknO1xuXG4gIHJldHVybiBoKCdkaXYnLCB7XG4gICAgc3R5bGU6IHBvcFVwU3R5bGVcbiAgfSwgW1xuICAgIGhlYWRlcihzdGF0ZSksXG4gICAgaCgndGFibGUnLCB7XG4gICAgICBzdHlsZTogc3R5bGVzLnRhYmxlXG4gICAgfSwgW1xuICAgICAgdGFibGVIZWFkKHN0YXRlKVxuICAgICAgLy8gdGFibGVCb2R5KHN0YXRlKVxuICAgIF0pXG4gIF0pO1xufTtcbiIsInZhciBoID0gcmVxdWlyZSgnbWVyY3VyeScpLmg7XG52YXIgbW9kdWxvID0gcmVxdWlyZSgnLi4vbW9kdWxvJyk7XG5cbnZhciBzdHlsZXMgPSB7XG4gIHJvdzoge1xuICAgIGhlaWdodDogJzJlbSdcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0YWJsZUhlYWQoc3RhdGUpIHtcbiAgdmFyIGZpcnN0RGF5ID0gc3RhdGUubW9kZWwudHJhbnNsYXRpb24uZmlyc3REYXk7XG5cbiAgdmFyIGRheVRocyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSBmaXJzdERheTsgaSA8IGZpcnN0RGF5ICsgNzsgaSsrKSB7XG4gICAgdmFyIHdlZWtkYXkgPSBzdGF0ZS5tb2RlbC50cmFuc2xhdGlvbi53ZWVrZGF5c1Nob3J0W21vZHVsbyhpLCA3KV07XG4gICAgdmFyIHRoID0gaCgndGgnLCB3ZWVrZGF5KTtcbiAgICBkYXlUaHMucHVzaCh0aCk7XG4gIH1cblxuICByZXR1cm4gaCgndGhlYWQnLCBoKCd0cicsIHsgc3R5bGU6IHN0eWxlcy5yb3cgfSwgZGF5VGhzKSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm51bWJlck9mUm93c0luQ2FsZW5kYXJcIjogNixcbiAgXCJudW1iZXJPZkRheXNJbkNhbGVuZGFyXCI6IDQyXG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi0Y/QvdGD0LDRgNC4XCIsXCLRhNC10LLRgNGD0LDRgNC4XCIsXCLQvNCw0YDRglwiLFwi0LDQv9GA0LjQu1wiLFwi0LzQsNC5XCIsXCLRjtC90LhcIixcItGO0LvQuFwiLFwi0LDQstCz0YPRgdGCXCIsXCLRgdC10L/RgtC10LzQstGA0LhcIixcItC+0LrRgtC+0LzQstGA0LhcIixcItC90L7QtdC80LLRgNC4XCIsXCLQtNC10LrQtdC80LLRgNC4XCJdLFwibW9udGhzU2hvcnRcIjpbXCLRj9C90YBcIixcItGE0LXQslwiLFwi0LzQsNGAXCIsXCLQsNC/0YBcIixcItC80LDQuVwiLFwi0Y7QvdC4XCIsXCLRjtC70LhcIixcItCw0LLQs1wiLFwi0YHQtdC/XCIsXCLQvtC60YJcIixcItC90L7QtVwiLFwi0LTQtdC6XCJdLFwid2Vla2RheXNGdWxsXCI6W1wi0L3QtdC00LXQu9GPXCIsXCLQv9C+0L3QtdC00LXQu9C90LjQulwiLFwi0LLRgtC+0YDQvdC40LpcIixcItGB0YDRj9C00LBcIixcItGH0LXRgtCy0YrRgNGC0YrQulwiLFwi0L/QtdGC0YrQulwiLFwi0YHRitCx0L7RgtCwXCJdLFwid2Vla2RheXNTaG9ydFwiOltcItC90LRcIixcItC/0L1cIixcItCy0YJcIixcItGB0YBcIixcItGH0YJcIixcItC/0YJcIixcItGB0LFcIl0sXCJ0b2RheVwiOlwi0LTQvdC10YFcIixcImNsZWFyXCI6XCLQuNC30YLRgNC40LLQsNC8XCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tbSB5eXl5INCzLlwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnVhclwiLFwiZmVicnVhclwiLFwibWFydFwiLFwiYXByaWxcIixcIm1halwiLFwianVuaVwiLFwianVsaVwiLFwiYXVndXN0XCIsXCJzZXB0ZW1iYXJcIixcIm9rdG9iYXJcIixcIm5vdmVtYmFyXCIsXCJkZWNlbWJhclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtYWpcIixcImp1blwiLFwianVsXCIsXCJhdWdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5lZGplbGphXCIsXCJwb25lZGplbGpha1wiLFwidXRvcmFrXCIsXCJzcmlqZWRhXCIsXCJjZXR2cnRha1wiLFwicGV0YWtcIixcInN1Ym90YVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJuZVwiLFwicG9cIixcInV0XCIsXCJzclwiLFwixI1lXCIsXCJwZVwiLFwic3VcIl0sXCJ0b2RheVwiOlwiZGFuYXNcIixcImNsZWFyXCI6XCJpemJyaXNhdGlcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGQuIG1tbW0geXl5eS5cIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJHZW5lclwiLFwiRmVicmVyXCIsXCJNYXLDp1wiLFwiQWJyaWxcIixcIk1haWdcIixcImp1bnlcIixcIkp1bGlvbFwiLFwiQWdvc3RcIixcIlNldGVtYnJlXCIsXCJPY3R1YnJlXCIsXCJOb3ZlbWJyZVwiLFwiRGVzZW1icmVcIl0sXCJtb250aHNTaG9ydFwiOltcIkdlblwiLFwiRmViXCIsXCJNYXJcIixcIkFiclwiLFwiTWFpXCIsXCJKdW5cIixcIkp1bFwiLFwiQWdvXCIsXCJTZXRcIixcIk9jdFwiLFwiTm92XCIsXCJEZXNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkaXVtZW5nZVwiLFwiZGlsbHVuc1wiLFwiZGltYXJ0c1wiLFwiZGltZWNyZXNcIixcImRpam91c1wiLFwiZGl2ZW5kcmVzXCIsXCJkaXNzYWJ0ZVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJkaXVcIixcImRpbFwiLFwiZGltXCIsXCJkbWNcIixcImRpalwiLFwiZGl2XCIsXCJkaXNcIl0sXCJ0b2RheVwiOlwiYXZ1aVwiLFwiY2xlYXJcIjpcImVzYm9ycmFyXCIsXCJjbG9zZVwiOlwidGFuY2FyXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkZGQgZCAhZGUgbW1tbSAhZGUgeXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImxlZGVuXCIsXCLDum5vclwiLFwiYsWZZXplblwiLFwiZHViZW5cIixcImt2xJt0ZW5cIixcIsSNZXJ2ZW5cIixcIsSNZXJ2ZW5lY1wiLFwic3JwZW5cIixcInrDocWZw61cIixcIsWZw61qZW5cIixcImxpc3RvcGFkXCIsXCJwcm9zaW5lY1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wibGVkXCIsXCLDum5vXCIsXCJixZllXCIsXCJkdWJcIixcImt2xJtcIixcIsSNZXJcIixcIsSNdmNcIixcInNycFwiLFwiesOhxZlcIixcIsWZw61qXCIsXCJsaXNcIixcInByb1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5lZMSbbGVcIixcInBvbmTEm2zDrVwiLFwiw7p0ZXLDvVwiLFwic3TFmWVkYVwiLFwixI10dnJ0ZWtcIixcInDDoXRla1wiLFwic29ib3RhXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIm5lXCIsXCJwb1wiLFwiw7p0XCIsXCJzdFwiLFwixI10XCIsXCJww6FcIixcInNvXCJdLFwidG9kYXlcIjpcImRuZXNcIixcImNsZWFyXCI6XCJ2eW1hemF0XCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQuIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnVhclwiLFwiZmVicnVhclwiLFwibWFydHNcIixcImFwcmlsXCIsXCJtYWpcIixcImp1bmlcIixcImp1bGlcIixcImF1Z3VzdFwiLFwic2VwdGVtYmVyXCIsXCJva3RvYmVyXCIsXCJub3ZlbWJlclwiLFwiZGVjZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFqXCIsXCJqdW5cIixcImp1bFwiLFwiYXVnXCIsXCJzZXBcIixcIm9rdFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJzw7huZGFnXCIsXCJtYW5kYWdcIixcInRpcnNkYWdcIixcIm9uc2RhZ1wiLFwidG9yc2RhZ1wiLFwiZnJlZGFnXCIsXCJsw7hyZGFnXCJdLFwid2Vla2RheXNTaG9ydFwiOltcInPDuG5cIixcIm1hblwiLFwidGlyXCIsXCJvbnNcIixcInRvclwiLFwiZnJlXCIsXCJsw7hyXCJdLFwidG9kYXlcIjpcImkgZGFnXCIsXCJjbGVhclwiOlwic2xldFwiLFwiY2xvc2VcIjpcImx1a1wiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLiBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW51YXJcIixcIkZlYnJ1YXJcIixcIk3DpHJ6XCIsXCJBcHJpbFwiLFwiTWFpXCIsXCJKdW5pXCIsXCJKdWxpXCIsXCJBdWd1c3RcIixcIlNlcHRlbWJlclwiLFwiT2t0b2JlclwiLFwiTm92ZW1iZXJcIixcIkRlemVtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJKYW5cIixcIkZlYlwiLFwiTcOkclwiLFwiQXByXCIsXCJNYWlcIixcIkp1blwiLFwiSnVsXCIsXCJBdWdcIixcIlNlcFwiLFwiT2t0XCIsXCJOb3ZcIixcIkRlelwiXSxcIndlZWtkYXlzRnVsbFwiOltcIlNvbm50YWdcIixcIk1vbnRhZ1wiLFwiRGllbnN0YWdcIixcIk1pdHR3b2NoXCIsXCJEb25uZXJzdGFnXCIsXCJGcmVpdGFnXCIsXCJTYW1zdGFnXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIlNvXCIsXCJNb1wiLFwiRGlcIixcIk1pXCIsXCJEb1wiLFwiRnJcIixcIlNhXCJdLFwidG9kYXlcIjpcIkhldXRlXCIsXCJjbGVhclwiOlwiTMO2c2NoZW5cIixcImNsb3NlXCI6XCJTY2hsaWXDn2VuXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIs6ZzrHOvc6/z4XOrM+BzrnOv8+CXCIsXCLOps61zrLPgc6/z4XOrM+BzrnOv8+CXCIsXCLOnM6sz4HPhM65zr/PglwiLFwizpHPgM+Bzq/Ou865zr/PglwiLFwizpzOrM65zr/PglwiLFwizpnOv8+Nzr3Ouc6/z4JcIixcIs6Zzr/Pjc67zrnOv8+CXCIsXCLOkc+NzrPOv8+Fz4PPhM6/z4JcIixcIs6jzrXPgM+Ezq3OvM6yz4HOuc6/z4JcIixcIs6fzrrPhM+OzrLPgc65zr/PglwiLFwizp3Ov86tzrzOss+BzrnOv8+CXCIsXCLOlM61zrrOrc68zrLPgc65zr/PglwiXSxcIm1vbnRoc1Nob3J0XCI6W1wizpnOsc69XCIsXCLOps61zrJcIixcIs6czrHPgVwiLFwizpHPgM+BXCIsXCLOnM6xzrlcIixcIs6Zzr/Phc69XCIsXCLOmc6/z4XOu1wiLFwizpHPhc6zXCIsXCLOo861z4BcIixcIs6fzrrPhFwiLFwizp3Ov861XCIsXCLOlM61zrpcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLOms+Fz4HOuc6xzrrOrlwiLFwizpTOtc+Fz4TOrc+BzrFcIixcIs6kz4HOr8+EzrdcIixcIs6kzrXPhM6sz4HPhM63XCIsXCLOoM6tzrzPgM+EzrdcIixcIs6gzrHPgc6xz4POus61z4XOrlwiLFwizqPOrM6yzrLOsc+Ezr9cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wizprPhc+BXCIsXCLOlM61z4VcIixcIs6kz4HOuVwiLFwizqTOtc+EXCIsXCLOoM61zrxcIixcIs6gzrHPgVwiLFwizqPOsc6yXCJdLFwidG9kYXlcIjpcIs+Dzq7OvM61z4HOsVwiLFwiY2xlYXJcIjpcIs6UzrnOsc6zz4HOsc+Gzq5cIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZCBtbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW51YXJ5XCIsXCJGZWJydWFyeVwiLFwiTWFyY2hcIixcIkFwcmlsXCIsXCJNYXlcIixcIkp1bmVcIixcIkp1bHlcIixcIkF1Z3VzdFwiLFwiU2VwdGVtYmVyXCIsXCJPY3RvYmVyXCIsXCJOb3ZlbWJlclwiLFwiRGVjZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcIkphblwiLFwiRmViXCIsXCJNYXJcIixcIkFwclwiLFwiTWF5XCIsXCJKdW5cIixcIkp1bFwiLFwiQXVnXCIsXCJTZXBcIixcIk9jdFwiLFwiTm92XCIsXCJEZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJTdW5kYXlcIixcIk1vbmRheVwiLFwiVHVlc2RheVwiLFwiV2VkbmVzZGF5XCIsXCJUaHVyc2RheVwiLFwiRnJpZGF5XCIsXCJTYXR1cmRheVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJTdW5cIixcIk1vblwiLFwiVHVlXCIsXCJXZWRcIixcIlRodVwiLFwiRnJpXCIsXCJTYXRcIl0sXCJmaXJzdERheVwiOiAwLCBcImZvcm1hdFwiOlwibW1tIGQsIHl5eXlcIn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJlbmVyb1wiLFwiZmVicmVyb1wiLFwibWFyem9cIixcImFicmlsXCIsXCJtYXlvXCIsXCJqdW5pb1wiLFwianVsaW9cIixcImFnb3N0b1wiLFwic2VwdGllbWJyZVwiLFwib2N0dWJyZVwiLFwibm92aWVtYnJlXCIsXCJkaWNpZW1icmVcIl0sXCJtb250aHNTaG9ydFwiOltcImVuZVwiLFwiZmViXCIsXCJtYXJcIixcImFiclwiLFwibWF5XCIsXCJqdW5cIixcImp1bFwiLFwiYWdvXCIsXCJzZXBcIixcIm9jdFwiLFwibm92XCIsXCJkaWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkb21pbmdvXCIsXCJsdW5lc1wiLFwibWFydGVzXCIsXCJtacOpcmNvbGVzXCIsXCJqdWV2ZXNcIixcInZpZXJuZXNcIixcInPDoWJhZG9cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiZG9tXCIsXCJsdW5cIixcIm1hclwiLFwibWnDqVwiLFwianVlXCIsXCJ2aWVcIixcInPDoWJcIl0sXCJ0b2RheVwiOlwiaG95XCIsXCJjbGVhclwiOlwiYm9ycmFyXCIsXCJjbG9zZVwiOlwiY2VycmFyXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphYW51YXJcIixcInZlZWJydWFyXCIsXCJtw6RydHNcIixcImFwcmlsbFwiLFwibWFpXCIsXCJqdXVuaVwiLFwianV1bGlcIixcImF1Z3VzdFwiLFwic2VwdGVtYmVyXCIsXCJva3Rvb2JlclwiLFwibm92ZW1iZXJcIixcImRldHNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFhblwiLFwidmVlYnJcIixcIm3DpHJ0c1wiLFwiYXByXCIsXCJtYWlcIixcImp1dW5pXCIsXCJqdXVsaVwiLFwiYXVnXCIsXCJzZXB0XCIsXCJva3RcIixcIm5vdlwiLFwiZGV0c1wiXSxcIndlZWtkYXlzRnVsbFwiOltcInDDvGhhcMOkZXZcIixcImVzbWFzcMOkZXZcIixcInRlaXNpcMOkZXZcIixcImtvbG1hcMOkZXZcIixcIm5lbGphcMOkZXZcIixcInJlZWRlXCIsXCJsYXVww6RldlwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJww7xoXCIsXCJlc21cIixcInRlaVwiLFwia29sXCIsXCJuZWxcIixcInJlZVwiLFwibGF1XCJdLFwidG9kYXlcIjpcInTDpG5hXCIsXCJjbGVhclwiOlwia3VzdHV0YW1hXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQuIG1tbW0geXl5eS4gYVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcInVydGFycmlsYVwiLFwib3RzYWlsYVwiLFwibWFydHhvYVwiLFwiYXBpcmlsYVwiLFwibWFpYXR6YVwiLFwiZWthaW5hXCIsXCJ1enRhaWxhXCIsXCJhYnV6dHVhXCIsXCJpcmFpbGFcIixcInVycmlhXCIsXCJhemFyb2FcIixcImFiZW5kdWFcIl0sXCJtb250aHNTaG9ydFwiOltcInVydFwiLFwib3RzXCIsXCJtYXJcIixcImFwaVwiLFwibWFpXCIsXCJla2FcIixcInV6dFwiLFwiYWJ1XCIsXCJpcmFcIixcInVyclwiLFwiYXphXCIsXCJhYmVcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJpZ2FuZGVhXCIsXCJhc3RlbGVoZW5hXCIsXCJhc3RlYXJ0ZWFcIixcImFzdGVhemtlbmFcIixcIm9zdGVndW5hXCIsXCJvc3RpcmFsYVwiLFwibGFydW5iYXRhXCJdLFwid2Vla2RheXNTaG9ydFwiOltcImlnLlwiLFwiYWwuXCIsXCJhci5cIixcImF6LlwiLFwib2cuXCIsXCJvci5cIixcImxyLlwiXSxcInRvZGF5XCI6XCJnYXVyXCIsXCJjbGVhclwiOlwiZ2FyYml0dVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZGRkLCB5eXl5KGUpa28gbW1tbXJlbiBkYVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcItqY2KfZhtmI24zZh1wiLFwi2YHZiNix24zZh1wiLFwi2YXYp9ix2LNcIixcItii2YjYsduM2YRcIixcItmF2YdcIixcItqY2YjYptmGXCIsXCLamNmI2KbbjNmHXCIsXCLYp9mI2KpcIixcItiz2b7Yqtin2YXYqNixXCIsXCLYp9qp2KrYqNixXCIsXCLZhtmI2KfZhdio2LFcIixcItiv2LPYp9mF2KjYsVwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi2pjYp9mG2YjbjNmHXCIsXCLZgdmI2LHbjNmHXCIsXCLZhdin2LHYs1wiLFwi2KLZiNix24zZhFwiLFwi2YXZh1wiLFwi2pjZiNim2YZcIixcItqY2YjYptuM2YdcIixcItin2YjYqlwiLFwi2LPZvtiq2KfZhdio2LFcIixcItin2qnYqtio2LFcIixcItmG2YjYp9mF2KjYsVwiLFwi2K/Ys9in2YXYqNixXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi24zaqdi02YbYqNmHXCIsXCLYr9mI2LTZhtio2YdcIixcItiz2Ycg2LTZhtio2YdcIixcItqG2YfYp9ix2LTZhtio2YdcIixcItm+2YbYrNi02YbYqNmHXCIsXCLYrNmF2LnZh1wiLFwi2LTZhtio2YdcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wi24zaqdi02YbYqNmHXCIsXCLYr9mI2LTZhtio2YdcIixcItiz2Ycg2LTZhtio2YdcIixcItqG2YfYp9ix2LTZhtio2YdcIixcItm+2YbYrNi02YbYqNmHXCIsXCLYrNmF2LnZh1wiLFwi2LTZhtio2YdcIl0sXCJ0b2RheVwiOlwi2KfZhdix2YjYslwiLFwiY2xlYXJcIjpcItm+2KfaqSDaqdix2K/ZhlwiLFwiY2xvc2VcIjpcItio2LPYqtmGXCIsXCJmb3JtYXRcIjpcInl5eXkgbW1tbSBkZFwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCIsXCJsYWJlbE1vbnRoTmV4dFwiOlwi2YXYp9mHINio2LnYr9uMXCIsXCJsYWJlbE1vbnRoUHJldlwiOlwi2YXYp9mHINmC2KjZhNuMXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcInRhbW1pa3V1XCIsXCJoZWxtaWt1dVwiLFwibWFhbGlza3V1XCIsXCJodWh0aWt1dVwiLFwidG91a29rdXVcIixcImtlc8Oka3V1XCIsXCJoZWluw6RrdXVcIixcImVsb2t1dVwiLFwic3l5c2t1dVwiLFwibG9rYWt1dVwiLFwibWFycmFza3V1XCIsXCJqb3VsdWt1dVwiXSxcIm1vbnRoc1Nob3J0XCI6W1widGFtbWlcIixcImhlbG1pXCIsXCJtYWFsaXNcIixcImh1aHRpXCIsXCJ0b3Vrb1wiLFwia2Vzw6RcIixcImhlaW7DpFwiLFwiZWxvXCIsXCJzeXlzXCIsXCJsb2thXCIsXCJtYXJyYXNcIixcImpvdWx1XCJdLFwid2Vla2RheXNGdWxsXCI6W1wic3VubnVudGFpXCIsXCJtYWFuYW50YWlcIixcInRpaXN0YWlcIixcImtlc2tpdmlpa2tvXCIsXCJ0b3JzdGFpXCIsXCJwZXJqYW50YWlcIixcImxhdWFudGFpXCJdLFwid2Vla2RheXNTaG9ydFwiOltcInN1XCIsXCJtYVwiLFwidGlcIixcImtlXCIsXCJ0b1wiLFwicGVcIixcImxhXCJdLFwidG9kYXlcIjpcInTDpG7DpMOkblwiLFwiY2xlYXJcIjpcInR5aGplbm7DpFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkLm0ueXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIkphbnZpZXJcIixcIkbDqXZyaWVyXCIsXCJNYXJzXCIsXCJBdnJpbFwiLFwiTWFpXCIsXCJKdWluXCIsXCJKdWlsbGV0XCIsXCJBb8O7dFwiLFwiU2VwdGVtYnJlXCIsXCJPY3RvYnJlXCIsXCJOb3ZlbWJyZVwiLFwiRMOpY2VtYnJlXCJdLFwibW9udGhzU2hvcnRcIjpbXCJKYW5cIixcIkZldlwiLFwiTWFyXCIsXCJBdnJcIixcIk1haVwiLFwiSnVpblwiLFwiSnVpbFwiLFwiQW91XCIsXCJTZXBcIixcIk9jdFwiLFwiTm92XCIsXCJEZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJEaW1hbmNoZVwiLFwiTHVuZGlcIixcIk1hcmRpXCIsXCJNZXJjcmVkaVwiLFwiSmV1ZGlcIixcIlZlbmRyZWRpXCIsXCJTYW1lZGlcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiRGltXCIsXCJMdW5cIixcIk1hclwiLFwiTWVyXCIsXCJKZXVcIixcIlZlblwiLFwiU2FtXCJdLFwidG9kYXlcIjpcIkF1am91cmQnaHVpXCIsXCJjbGVhclwiOlwiRWZmYWNlclwiLFwiY2xvc2VcIjpcIkZlcm1lclwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIixcImxhYmVsTW9udGhOZXh0XCI6XCJNb2lzIHN1aXZhbnRcIixcImxhYmVsTW9udGhQcmV2XCI6XCJNb2lzIHByw6ljw6lkZW50XCIsXCJsYWJlbE1vbnRoU2VsZWN0XCI6XCJTw6lsZWN0aW9ubmVyIHVuIG1vaXNcIixcImxhYmVsWWVhclNlbGVjdFwiOlwiU8OpbGVjdGlvbm5lciB1bmUgYW5uw6llXCJ9XG4iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiWGFuZWlyb1wiLFwiRmVicmVpcm9cIixcIk1hcnpvXCIsXCJBYnJpbFwiLFwiTWFpb1wiLFwiWHXDsW9cIixcIlh1bGxvXCIsXCJBZ29zdG9cIixcIlNldGVtYnJvXCIsXCJPdXR1YnJvXCIsXCJOb3ZlbWJyb1wiLFwiRGVjZW1icm9cIl0sXCJtb250aHNTaG9ydFwiOltcInhhblwiLFwiZmViXCIsXCJtYXJcIixcImFiclwiLFwibWFpXCIsXCJ4dW5cIixcInh1bFwiLFwiYWdvXCIsXCJzZXBcIixcIm91dFwiLFwibm92XCIsXCJkZWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkb21pbmdvXCIsXCJsdW5zXCIsXCJtYXJ0ZXNcIixcIm3DqXJjb3Jlc1wiLFwieG92ZXNcIixcInZlbnJlc1wiLFwic8OhYmFkb1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJkb21cIixcImx1blwiLFwibWFyXCIsXCJtw6lyXCIsXCJ4b3ZcIixcInZlblwiLFwic2FiXCJdLFwidG9kYXlcIjpcImhveGVcIixcImNsZWFyXCI6XCJib3JyYXJcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGRkZCBkICFkZSBtbW1tICFkZSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi15nXoNeV15DXqFwiLFwi16TXkdeo15XXkNeoXCIsXCLXnteo16VcIixcIteQ16TXqNeZ15xcIixcItee15DXmVwiLFwi15nXldeg15lcIixcIteZ15XXnNeZXCIsXCLXkNeV15LXldeh15hcIixcIteh16TXmNee15HXqFwiLFwi15DXlden15jXldeR16hcIixcIteg15XXkdee15HXqFwiLFwi15PXptee15HXqFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi15nXoNeVXCIsXCLXpNeR16hcIixcItee16jXpVwiLFwi15DXpNeoXCIsXCLXnteQ15lcIixcIteZ15XXoFwiLFwi15nXldecXCIsXCLXkNeV15JcIixcIteh16TXmFwiLFwi15DXldenXCIsXCLXoNeV15FcIixcIteT16bXnlwiXSxcIndlZWtkYXlzRnVsbFwiOltcIteZ15XXnSDXqNeQ16nXldefXCIsXCLXmdeV150g16nXoNeZXCIsXCLXmdeV150g16nXnNeZ16nXmVwiLFwi15nXldedINeo15HXmdei15lcIixcIteZ15XXnSDXl9ee15nXqdeZXCIsXCLXmdeV150g16nXqdeZXCIsXCLXmdeV150g16nXkdeqXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIteQXCIsXCLXkVwiLFwi15JcIixcIteTXCIsXCLXlFwiLFwi15VcIixcItepXCJdLFwidG9kYXlcIjpcIteU15nXldedXCIsXCJjbGVhclwiOlwi15zXnteX15XXp1wiLFwiZm9ybWF0XCI6XCJ5eXl5IG1tbW3XkSBkIGRkZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLgpJzgpKjgpLXgpLDgpYBcIixcIuCkq+CksOCkteCksOClgFwiLFwi4KSu4KS+4KSw4KWN4KSaXCIsXCLgpIXgpKrgpY3gpLDgpYjgpLJcIixcIuCkruCkiFwiLFwi4KSc4KWC4KSoXCIsXCLgpJzgpYHgpLLgpL7gpIhcIixcIuCkheCkl+CkuOCljeCkpFwiLFwi4KS44KS/4KSk4KSu4KWN4KSs4KSwXCIsXCLgpIXgpJXgpY3gpJ/gpYLgpKzgpLBcIixcIuCkqOCkteCkruCljeCkrOCksFwiLFwi4KSm4KS/4KS44KSu4KWN4KSs4KSwXCJdLFwibW9udGhzU2hvcnRcIjpbXCLgpJzgpKhcIixcIuCkq+CksFwiLFwi4KSu4KS+4KSw4KWN4KSaXCIsXCLgpIXgpKrgpY3gpLDgpYjgpLJcIixcIuCkruCkiFwiLFwi4KSc4KWC4KSoXCIsXCLgpJzgpYFcIixcIuCkheCkl1wiLFwi4KS44KS/4KSkXCIsXCLgpIXgpJXgpY3gpJ/gpYJcIixcIuCkqOCktVwiLFwi4KSm4KS/4KS4XCJdLFwid2Vla2RheXNGdWxsXCI6W1wi4KSw4KS14KS/4KS14KS+4KSwXCIsXCLgpLjgpYvgpK7gpLXgpL7gpLBcIixcIuCkruCkguCkl+CksuCkteCkvuCksFwiLFwi4KSs4KWB4KSn4KS14KS+4KSwXCIsXCLgpJfgpYHgpLDgpYHgpLXgpL7gpLBcIixcIuCktuClgeCkleCljeCksOCkteCkvuCksFwiLFwi4KS24KSo4KS/4KS14KS+4KSwXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuCksOCkteCkv1wiLFwi4KS44KWL4KSuXCIsXCLgpK7gpILgpJfgpLJcIixcIuCkrOClgeCkp1wiLFwi4KSX4KWB4KSw4KWBXCIsXCLgpLbgpYHgpJXgpY3gpLBcIixcIuCktuCkqOCkv1wiXSxcInRvZGF5XCI6XCLgpIbgpJwg4KSV4KWAIOCkpOCkvuCksOClgOCkliDgpJrgpK/gpKgg4KSV4KSw4KWH4KSCXCIsXCJjbGVhclwiOlwi4KSa4KWB4KSo4KWAIOCkueClgeCkiCDgpKTgpL7gpLDgpYDgpJYg4KSV4KWLIOCkruCkv+Ckn+CkvuCkj+CkgVwiLFwiY2xvc2VcIjpcIuCkteCkv+CkguCkoeCliyDgpKzgpILgpKYg4KSV4KSw4KWHXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkL21tL3l5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwiLFwibGFiZWxNb250aE5leHRcIjpcIuCkheCkl+CksuClhyDgpK7gpL7gpLkg4KSV4KS+IOCkmuCkr+CkqCDgpJXgpLDgpYfgpIJcIixcImxhYmVsTW9udGhQcmV2XCI6XCLgpKrgpL/gpJvgpLLgpYcg4KSu4KS+4KS5IOCkleCkviDgpJrgpK/gpKgg4KSV4KSw4KWH4KSCXCIsXCJsYWJlbE1vbnRoU2VsZWN0XCI6XCLgpJXgpL/gpLjgpL8g4KSP4KSVIOCkruCkueClgOCkqOClhyDgpJXgpL4g4KSa4KSv4KSoIOCkleCksOClh+CkglwiLFwibGFiZWxZZWFyU2VsZWN0XCI6XCLgpJXgpL/gpLjgpL8g4KSP4KSVIOCkteCksOCljeCktyDgpJXgpL4g4KSa4KSv4KSoIOCkleCksOClh+CkglwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJzaWplxIdhbmpcIixcInZlbGphxI1hXCIsXCJvxb51amFrXCIsXCJ0cmF2YW5qXCIsXCJzdmliYW5qXCIsXCJsaXBhbmpcIixcInNycGFualwiLFwia29sb3ZvelwiLFwicnVqYW5cIixcImxpc3RvcGFkXCIsXCJzdHVkZW5pXCIsXCJwcm9zaW5hY1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wic2lqXCIsXCJ2ZWxqXCIsXCJvxb51XCIsXCJ0cmFcIixcInN2aVwiLFwibGlwXCIsXCJzcnBcIixcImtvbFwiLFwicnVqXCIsXCJsaXNcIixcInN0dVwiLFwicHJvXCJdLFwid2Vla2RheXNGdWxsXCI6W1wibmVkamVsamFcIixcInBvbmVkamVsamFrXCIsXCJ1dG9yYWtcIixcInNyaWplZGFcIixcIsSNZXR2cnRha1wiLFwicGV0YWtcIixcInN1Ym90YVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJuZWRcIixcInBvblwiLFwidXRvXCIsXCJzcmlcIixcIsSNZXRcIixcInBldFwiLFwic3ViXCJdLFwidG9kYXlcIjpcImRhbmFzXCIsXCJjbGVhclwiOlwiaXpicmlzYXRpXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQuIG1tbW0geXl5eS5cIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51w6FyXCIsXCJmZWJydcOhclwiLFwibcOhcmNpdXNcIixcIsOhcHJpbGlzXCIsXCJtw6FqdXNcIixcImrDum5pdXNcIixcImrDumxpdXNcIixcImF1Z3VzenR1c1wiLFwic3plcHRlbWJlclwiLFwib2t0w7NiZXJcIixcIm5vdmVtYmVyXCIsXCJkZWNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJyXCIsXCJtw6FyY1wiLFwiw6FwclwiLFwibcOhalwiLFwiasO6blwiLFwiasO6bFwiLFwiYXVnXCIsXCJzemVwdFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcInZhc8Ohcm5hcFwiLFwiaMOpdGbFkVwiLFwia2VkZFwiLFwic3plcmRhXCIsXCJjc8O8dMO2cnTDtmtcIixcInDDqW50ZWtcIixcInN6b21iYXRcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiVlwiLFwiSFwiLFwiS1wiLFwiU1plXCIsXCJDU1wiLFwiUFwiLFwiU1pvXCJdLFwidG9kYXlcIjpcIk1hXCIsXCJjbGVhclwiOlwiVMO2cmzDqXNcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwieXl5eS4gbW1tbSBkZC5cIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW51YXJpXCIsXCJGZWJydWFyaVwiLFwiTWFyZXRcIixcIkFwcmlsXCIsXCJNZWlcIixcIkp1bmlcIixcIkp1bGlcIixcIkFndXN0dXNcIixcIlNlcHRlbWJlclwiLFwiT2t0b2JlclwiLFwiTm92ZW1iZXJcIixcIkRlc2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJKYW5cIixcIkZlYlwiLFwiTWFyXCIsXCJBcHJcIixcIk1laVwiLFwiSnVuXCIsXCJKdWxcIixcIkFndVwiLFwiU2VwXCIsXCJPa3RcIixcIk5vdlwiLFwiRGVzXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiTWluZ2d1XCIsXCJTZW5pblwiLFwiU2VsYXNhXCIsXCJSYWJ1XCIsXCJLYW1pc1wiLFwiSnVtYXRcIixcIlNhYnR1XCJdLFwid2Vla2RheXNTaG9ydFwiOltcIk1pblwiLFwiU2VuXCIsXCJTZWxcIixcIlJhYlwiLFwiS2FtXCIsXCJKdW1cIixcIlNhYlwiXSxcInRvZGF5XCI6XCJoYXJpIGluaVwiLFwiY2xlYXJcIjpcIm1lbmdoYXB1c1wiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwiLy8gRklYTUU6IG9ubHkgZW4tdXMgc2hvdWxkIGJlIHJlcXVpcmFibGUgYnkgZGVmYXVsdCwgYWxsIG90aGVyIGxhbmd1YWdlc1xuLy8gc2hvdWxkIGJlIHBhc3NlZCBpbiBhcyBhcmdzIHRvIG1pbmltaXplIHBhY2thZ2Ugc2l6ZS5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAnYmctQkcnOiByZXF1aXJlKCcuL2JnLUJHJyksXG4gICdicy1CQSc6IHJlcXVpcmUoJy4vYnMtQkEnKSxcbiAgJ2NhLUVTJzogcmVxdWlyZSgnLi9jYS1FUycpLFxuICAnY3MtQ1onOiByZXF1aXJlKCcuL2NzLUNaJyksXG4gICdkYS1ESyc6IHJlcXVpcmUoJy4vZGEtREsnKSxcbiAgJ2RlLURFJzogcmVxdWlyZSgnLi9kZS1ERScpLFxuICAnZWwtR1InOiByZXF1aXJlKCcuL2VsLUdSJyksXG4gICdlbi1VUyc6IHJlcXVpcmUoJy4vZW4tVVMnKSxcbiAgJ2VzLUVTJzogcmVxdWlyZSgnLi9lcy1FUycpLFxuICAnZXQtRUUnOiByZXF1aXJlKCcuL2V0LUVFJyksXG4gICdldS1FUyc6IHJlcXVpcmUoJy4vZXUtRVMnKSxcbiAgJ2ZhLWlyJzogcmVxdWlyZSgnLi9mYS1pcicpLFxuICAnZmktRkknOiByZXF1aXJlKCcuL2ZpLUZJJyksXG4gICdmci1GUic6IHJlcXVpcmUoJy4vZnItRlInKSxcbiAgJ2dsLUVTJzogcmVxdWlyZSgnLi9nbC1FUycpLFxuICAnaGUtSUwnOiByZXF1aXJlKCcuL2hlLUlMJyksXG4gICdoaS1JTic6IHJlcXVpcmUoJy4vaGktSU4nKSxcbiAgJ2hyLUhSJzogcmVxdWlyZSgnLi9oci1IUicpLFxuICAnaHUtSFUnOiByZXF1aXJlKCcuL2h1LUhVJyksXG4gICdpZC1JRCc6IHJlcXVpcmUoJy4vaWQtSUQnKSxcbiAgJ2lzLUlTJzogcmVxdWlyZSgnLi9pcy1JUycpLFxuICAnaXQtSVQnOiByZXF1aXJlKCcuL2l0LUlUJyksXG4gICdqYS1KUCc6IHJlcXVpcmUoJy4vamEtSlAnKSxcbiAgJ2tvLUtSJzogcmVxdWlyZSgnLi9rby1LUicpLFxuICAnbHQtTFQnOiByZXF1aXJlKCcuL2x0LUxUJyksXG4gICdsdi1MVic6IHJlcXVpcmUoJy4vbHYtTFYnKSxcbiAgJ25iLU5PJzogcmVxdWlyZSgnLi9uYi1OTycpLFxuICAnbmUtTlAnOiByZXF1aXJlKCcuL25lLU5QJyksXG4gICdubC1OTCc6IHJlcXVpcmUoJy4vbmwtTkwnKSxcbiAgJ3BsLVBMJzogcmVxdWlyZSgnLi9wbC1QTCcpLFxuICAncHQtQlInOiByZXF1aXJlKCcuL3B0LUJSJyksXG4gICdwdC1QVCc6IHJlcXVpcmUoJy4vcHQtUFQnKSxcbiAgJ3JvLVJPJzogcmVxdWlyZSgnLi9yby1STycpLFxuICAncnUtUlUnOiByZXF1aXJlKCcuL3J1LVJVJyksXG4gICdzay1TSyc6IHJlcXVpcmUoJy4vc2stU0snKSxcbiAgJ3NsLVNJJzogcmVxdWlyZSgnLi9zbC1TSScpLFxuICAnc3YtU0UnOiByZXF1aXJlKCcuL3N2LVNFJyksXG4gICd0aC1USCc6IHJlcXVpcmUoJy4vdGgtVEgnKSxcbiAgJ3RyLVRSJzogcmVxdWlyZSgnLi90ci1UUicpLFxuICAndWstVUEnOiByZXF1aXJlKCcuL3VrLVVBJyksXG4gICd2aS1WTic6IHJlcXVpcmUoJy4vdmktVk4nKSxcbiAgJ3poLUNOJzogcmVxdWlyZSgnLi96aC1DTicpLFxuICAnemgtVFcnOiByZXF1aXJlKCcuL3poLVRXJylcbn07XG4iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFuw7phclwiLFwiZmVicsO6YXJcIixcIm1hcnNcIixcImFwcsOtbFwiLFwibWHDrVwiLFwiasO6bsOtXCIsXCJqw7psw61cIixcIsOhZ8O6c3RcIixcInNlcHRlbWJlclwiLFwib2t0w7NiZXJcIixcIm7Ds3ZlbWJlclwiLFwiZGVzZW1iZXJcIl0sXCJtb250aHNTaG9ydFwiOltcImphblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWHDrVwiLFwiasO6blwiLFwiasO6bFwiLFwiw6Fnw7pcIixcInNlcFwiLFwib2t0XCIsXCJuw7N2XCIsXCJkZXNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJzdW5udWRhZ3VyXCIsXCJtw6FudWRhZ3VyXCIsXCLDvnJpw7BqdWRhZ3VyXCIsXCJtacOwdmlrdWRhZ3VyXCIsXCJmaW1tdHVkYWd1clwiLFwiZsO2c3R1ZGFndXJcIixcImxhdWdhcmRhZ3VyXCJdLFwid2Vla2RheXNTaG9ydFwiOltcInN1blwiLFwibcOhblwiLFwiw75yaVwiLFwibWnDsFwiLFwiZmltXCIsXCJmw7ZzXCIsXCJsYXVcIl0sXCJ0b2RheVwiOlwiw40gZGFnXCIsXCJjbGVhclwiOlwiSHJlaW5zYVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZC4gbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiZ2VubmFpb1wiLFwiZmViYnJhaW9cIixcIm1hcnpvXCIsXCJhcHJpbGVcIixcIm1hZ2dpb1wiLFwiZ2l1Z25vXCIsXCJsdWdsaW9cIixcImFnb3N0b1wiLFwic2V0dGVtYnJlXCIsXCJvdHRvYnJlXCIsXCJub3ZlbWJyZVwiLFwiZGljZW1icmVcIl0sXCJtb250aHNTaG9ydFwiOltcImdlblwiLFwiZmViXCIsXCJtYXJcIixcImFwclwiLFwibWFnXCIsXCJnaXVcIixcImx1Z1wiLFwiYWdvXCIsXCJzZXRcIixcIm90dFwiLFwibm92XCIsXCJkaWNcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJkb21lbmljYVwiLFwibHVuZWTDrFwiLFwibWFydGVkw6xcIixcIm1lcmNvbGVkw6xcIixcImdpb3ZlZMOsXCIsXCJ2ZW5lcmTDrFwiLFwic2FiYXRvXCJdLFwid2Vla2RheXNTaG9ydFwiOltcImRvbVwiLFwibHVuXCIsXCJtYXJcIixcIm1lclwiLFwiZ2lvXCIsXCJ2ZW5cIixcInNhYlwiXSxcInRvZGF5XCI6XCJPZ2dpXCIsXCJjbGVhclwiOlwiQ2FuY2VsbGFcIixcImNsb3NlXCI6XCJDaGl1ZGlcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGRkZCBkIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCIsXCJsYWJlbE1vbnRoTmV4dFwiOlwiTWVzZSBzdWNjZXNzaXZvXCIsXCJsYWJlbE1vbnRoUHJldlwiOlwiTWVzZSBwcmVjZWRlbnRlXCIsXCJsYWJlbE1vbnRoU2VsZWN0XCI6XCJTZWxlemlvbmEgdW4gbWVzZVwiLFwibGFiZWxZZWFyU2VsZWN0XCI6XCJTZWxlemlvbmEgdW4gYW5ub1wifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCIx5pyIXCIsXCIy5pyIXCIsXCIz5pyIXCIsXCI05pyIXCIsXCI15pyIXCIsXCI25pyIXCIsXCI35pyIXCIsXCI45pyIXCIsXCI55pyIXCIsXCIxMOaciFwiLFwiMTHmnIhcIixcIjEy5pyIXCJdLFwibW9udGhzU2hvcnRcIjpbXCIx5pyIXCIsXCIy5pyIXCIsXCIz5pyIXCIsXCI05pyIXCIsXCI15pyIXCIsXCI25pyIXCIsXCI35pyIXCIsXCI45pyIXCIsXCI55pyIXCIsXCIxMOaciFwiLFwiMTHmnIhcIixcIjEy5pyIXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi5pel5puc5pelXCIsXCLmnIjmm5zml6VcIixcIueBq+abnOaXpVwiLFwi5rC05puc5pelXCIsXCLmnKjmm5zml6VcIixcIumHkeabnOaXpVwiLFwi5Zyf5puc5pelXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuaXpVwiLFwi5pyIXCIsXCLngatcIixcIuawtFwiLFwi5pyoXCIsXCLph5FcIixcIuWcn1wiXSxcInRvZGF5XCI6XCLku4rml6VcIixcImNsZWFyXCI6XCLmtojljrtcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwieXl5eS9tL2RcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifVxuIiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIjHsm5RcIixcIjLsm5RcIixcIjPsm5RcIixcIjTsm5RcIixcIjXsm5RcIixcIjbsm5RcIixcIjfsm5RcIixcIjjsm5RcIixcIjnsm5RcIixcIjEw7JuUXCIsXCIxMeyblFwiLFwiMTLsm5RcIl0sXCJtb250aHNTaG9ydFwiOltcIjHsm5RcIixcIjLsm5RcIixcIjPsm5RcIixcIjTsm5RcIixcIjXsm5RcIixcIjbsm5RcIixcIjfsm5RcIixcIjjsm5RcIixcIjnsm5RcIixcIjEw7JuUXCIsXCIxMeyblFwiLFwiMTLsm5RcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLsnbzsmpTsnbxcIixcIuyblOyalOydvFwiLFwi7ZmU7JqU7J28XCIsXCLsiJjsmpTsnbxcIixcIuuqqeyalOydvFwiLFwi6riI7JqU7J28XCIsXCLthqDsmpTsnbxcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wi7J28XCIsXCLsm5RcIixcIu2ZlFwiLFwi7IiYXCIsXCLrqqlcIixcIuq4iFwiLFwi7YagXCJdLFwidG9kYXlcIjpcIuyYpOuKmFwiLFwiY2xlYXJcIjpcIuy3qOyGjFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJ5eXl5IOuFhCBtbSDsm5QgZGQg7J28XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJsYWJlbE1vbnRoTmV4dFwiOlwiU2VrYW50aXMgbcSXbnVvXCIsXCJsYWJlbE1vbnRoUHJldlwiOlwiQW5rc3Rlc25pcyBtxJdudW9cIixcImxhYmVsTW9udGhTZWxlY3RcIjpcIlBhc2lyaW5raXRlIG3El25lc8SvXCIsXCJsYWJlbFllYXJTZWxlY3RcIjpcIlBhc2lyaW5raXRlIG1ldHVzXCIsXCJtb250aHNGdWxsXCI6W1wiU2F1c2lzXCIsXCJWYXNhcmlzXCIsXCJLb3Zhc1wiLFwiQmFsYW5kaXNcIixcIkdlZ3XFvsSXXCIsXCJCaXLFvmVsaXNcIixcIkxpZXBhXCIsXCJSdWdwasWrdGlzXCIsXCJSdWdzxJdqaXNcIixcIlNwYWxpc1wiLFwiTGFwa3JpdGlzXCIsXCJHcnVvZGlzXCJdLFwibW9udGhzU2hvcnRcIjpbXCJTYXVcIixcIlZhc1wiLFwiS292XCIsXCJCYWxcIixcIkdlZ1wiLFwiQmlyXCIsXCJMaWVcIixcIlJncFwiLFwiUmdzXCIsXCJTcGFcIixcIkxhcFwiLFwiR3JkXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiU2VrbWFkaWVuaXNcIixcIlBpcm1hZGllbmlzXCIsXCJBbnRyYWRpZW5pc1wiLFwiVHJlxI1pYWRpZW5pc1wiLFwiS2V0dmlydGFkaWVuaXNcIixcIlBlbmt0YWRpZW5pc1wiLFwixaBlxaF0YWRpZW5pc1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJTa1wiLFwiUHJcIixcIkFuXCIsXCJUclwiLFwiS3RcIixcIlBuXCIsXCLFoHRcIl0sXCJ0b2RheVwiOlwixaBpYW5kaWVuXCIsXCJjbGVhclwiOlwiScWhdmFseXRpXCIsXCJjbG9zZVwiOlwiVcW+ZGFyeXRpXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXktbW0tZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW52xIFyaXNcIixcIkZlYnJ1xIFyaXNcIixcIk1hcnRzXCIsXCJBcHLEq2xpc1wiLFwiTWFpanNcIixcIkrFq25panNcIixcIkrFq2xpanNcIixcIkF1Z3VzdHNcIixcIlNlcHRlbWJyaXNcIixcIk9rdG9icmlzXCIsXCJOb3ZlbWJyaXNcIixcIkRlY2VtYnJpc1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wiSmFuXCIsXCJGZWJcIixcIk1hclwiLFwiQXByXCIsXCJNYWlcIixcIkrFq25cIixcIkrFq2xcIixcIkF1Z1wiLFwiU2VwXCIsXCJPa3RcIixcIk5vdlwiLFwiRGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiU3bEk3RkaWVuYVwiLFwiUGlybWRpZW5hXCIsXCJPdHJkaWVuYVwiLFwiVHJlxaFkaWVuYVwiLFwiQ2V0dXJ0ZGllbmFcIixcIlBpZWt0ZGllbmFcIixcIlNlc3RkaWVuYVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJTdlwiLFwiUFwiLFwiT1wiLFwiVFwiLFwiQ1wiLFwiUGtcIixcIlNcIl0sXCJ0b2RheVwiOlwixaBvZGllbmFcIixcImNsZWFyXCI6XCJBdGNlbHRcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwieXl5eS5tbS5kZC4gZGRkZFwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnVhclwiLFwiZmVicnVhclwiLFwibWFyc1wiLFwiYXByaWxcIixcIm1haVwiLFwianVuaVwiLFwianVsaVwiLFwiYXVndXN0XCIsXCJzZXB0ZW1iZXJcIixcIm9rdG9iZXJcIixcIm5vdmVtYmVyXCIsXCJkZXNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtYWlcIixcImp1blwiLFwianVsXCIsXCJhdWdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlc1wiXSxcIndlZWtkYXlzRnVsbFwiOltcInPDuG5kYWdcIixcIm1hbmRhZ1wiLFwidGlyc2RhZ1wiLFwib25zZGFnXCIsXCJ0b3JzZGFnXCIsXCJmcmVkYWdcIixcImzDuHJkYWdcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wic8O4blwiLFwibWFuXCIsXCJ0aXJcIixcIm9uc1wiLFwidG9yXCIsXCJmcmVcIixcImzDuHJcIl0sXCJ0b2RheVwiOlwiaSBkYWdcIixcImNsZWFyXCI6XCJudWxsc3RpbGxcIixcImNsb3NlXCI6XCJsdWtrXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkLiBtbW0uIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCLgpJzgpKjgpLXgpLDgpYBcIixcIuCkq+Clh+CkrOCljeCksOClgeCkheCksOClgFwiLFwi4KSu4KS+4KSw4KWN4KSaXCIsXCLgpIXgpKrgpY3gpLDgpL/gpLJcIixcIuCkruClh1wiLFwi4KSc4KWB4KSoXCIsXCLgpJzgpYHgpLLgpL7gpIhcIixcIuCkheCkl+CkuOCljeCkpFwiLFwi4KS44KWH4KSq4KWN4KSf4KWH4KSu4KWN4KSs4KSwXCIsXCLgpIXgpJXgpY3gpJ/gpYvgpKzgpLBcIixcIuCkqOCli+CkteClh+CkruCljeCkrOCksFwiLFwi4KSh4KS/4KS44KWH4KSu4KWN4KSs4KSwXCJdLFwibW9udGhzU2hvcnRcIjpbXCLgpJzgpKhcIixcIuCkq+Clh+CkrOCljeCksOClgVwiLFwi4KSu4KS+4KSw4KWN4KSaXCIsXCLgpIXgpKrgpY3gpLDgpL/gpLJcIixcIuCkruClh1wiLFwi4KSc4KWB4KSoXCIsXCLgpJzgpYHgpLJcIixcIuCkheCkl1wiLFwi4KS44KWH4KSq4KWN4KSf4KWHXCIsXCLgpIXgpJXgpY3gpJ/gpYtcIixcIuCkqOCli+CkreClh1wiLFwi4KSh4KS/4KS44KWHXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi4KS44KWL4KSu4KSs4KS+4KSwXCIsXCLgpK7gpJngpY3gpLLgpKzgpL7gpLBcIixcIuCkrOClgeCkp+CkrOCkvuCksFwiLFwi4KSs4KS/4KS54KWA4KSs4KS+4KSwXCIsXCLgpLbgpYHgpJXgpY3gpLDgpKzgpL7gpLBcIixcIuCktuCkqOCkv+CkrOCkvuCksFwiLFwi4KSG4KSI4KSk4KSs4KS+4KSwXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuCkuOCli+CkrlwiLFwi4KSu4KSC4KSX4KSy4KWNXCIsXCLgpKzgpYHgpKdcIixcIuCkrOCkv+CkueClgFwiLFwi4KS24KWB4KSV4KWN4KSwXCIsXCLgpLbgpKjgpL9cIixcIuCkhuCkiOCkpFwiXSxcIm51bWJlcnNcIjpbXCLgpaZcIixcIuClp1wiLFwi4KWoXCIsXCLgpalcIixcIuClqlwiLFwi4KWrXCIsXCLgpaxcIixcIuClrVwiLFwi4KWuXCIsXCLgpa9cIl0sXCJ0b2RheVwiOlwi4KSG4KScXCIsXCJjbGVhclwiOlwi4KSu4KWH4KSf4KS+4KSJ4KSo4KWB4KS54KWL4KS44KWNXCIsXCJmb3JtYXRcIjpcImRkZGQsIGRkIG1tbW0sIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJqYW51YXJpXCIsXCJmZWJydWFyaVwiLFwibWFhcnRcIixcImFwcmlsXCIsXCJtZWlcIixcImp1bmlcIixcImp1bGlcIixcImF1Z3VzdHVzXCIsXCJzZXB0ZW1iZXJcIixcIm9rdG9iZXJcIixcIm5vdmVtYmVyXCIsXCJkZWNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hYVwiLFwiYXByXCIsXCJtZWlcIixcImp1blwiLFwianVsXCIsXCJhdWdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcInpvbmRhZ1wiLFwibWFhbmRhZ1wiLFwiZGluc2RhZ1wiLFwid29lbnNkYWdcIixcImRvbmRlcmRhZ1wiLFwidnJpamRhZ1wiLFwiemF0ZXJkYWdcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiem9cIixcIm1hXCIsXCJkaVwiLFwid29cIixcImRvXCIsXCJ2clwiLFwiemFcIl0sXCJ0b2RheVwiOlwidmFuZGFhZ1wiLFwiY2xlYXJcIjpcInZlcndpamRlcmVuXCIsXCJjbG9zZVwiOlwic2x1aXRlblwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZGRkIGQgbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wic3R5Y3plxYRcIixcImx1dHlcIixcIm1hcnplY1wiLFwia3dpZWNpZcWEXCIsXCJtYWpcIixcImN6ZXJ3aWVjXCIsXCJsaXBpZWNcIixcInNpZXJwaWXFhFwiLFwid3J6ZXNpZcWEXCIsXCJwYcW6ZHppZXJuaWtcIixcImxpc3RvcGFkXCIsXCJncnVkemllxYRcIl0sXCJtb250aHNTaG9ydFwiOltcInN0eVwiLFwibHV0XCIsXCJtYXJcIixcImt3aVwiLFwibWFqXCIsXCJjemVcIixcImxpcFwiLFwic2llXCIsXCJ3cnpcIixcInBhxbpcIixcImxpc1wiLFwiZ3J1XCJdLFwid2Vla2RheXNGdWxsXCI6W1wibmllZHppZWxhXCIsXCJwb25pZWR6aWHFgmVrXCIsXCJ3dG9yZWtcIixcIsWbcm9kYVwiLFwiY3p3YXJ0ZWtcIixcInBpxIV0ZWtcIixcInNvYm90YVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJuaWVkei5cIixcInBuLlwiLFwid3QuXCIsXCLFm3IuXCIsXCJjei5cIixcInB0LlwiLFwic29iLlwiXSxcInRvZGF5XCI6XCJEemlzaWFqXCIsXCJjbGVhclwiOlwiVXN1xYRcIixcImNsb3NlXCI6XCJaYW1rbmlqXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQgbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFuZWlyb1wiLFwiZmV2ZXJlaXJvXCIsXCJtYXLDp29cIixcImFicmlsXCIsXCJtYWlvXCIsXCJqdW5ob1wiLFwianVsaG9cIixcImFnb3N0b1wiLFwic2V0ZW1icm9cIixcIm91dHVicm9cIixcIm5vdmVtYnJvXCIsXCJkZXplbWJyb1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZXZcIixcIm1hclwiLFwiYWJyXCIsXCJtYWlcIixcImp1blwiLFwianVsXCIsXCJhZ29cIixcInNldFwiLFwib3V0XCIsXCJub3ZcIixcImRlelwiXSxcIndlZWtkYXlzRnVsbFwiOltcImRvbWluZ29cIixcInNlZ3VuZGEtZmVpcmFcIixcInRlcsOnYS1mZWlyYVwiLFwicXVhcnRhLWZlaXJhXCIsXCJxdWludGEtZmVpcmFcIixcInNleHRhLWZlaXJhXCIsXCJzw6FiYWRvXCJdLFwid2Vla2RheXNTaG9ydFwiOltcImRvbVwiLFwic2VnXCIsXCJ0ZXJcIixcInF1YVwiLFwicXVpXCIsXCJzZXhcIixcInNhYlwiXSxcInRvZGF5XCI6XCJob2plXCIsXCJjbGVhclwiOlwibGltcGFyXCIsXCJjbG9zZVwiOlwiZmVjaGFyXCIsXCJmb3JtYXRcIjpcImRkZGQsIGQgIWRlIG1tbW0gIWRlIHl5eXlcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSIsIm1vZHVsZS5leHBvcnRzPXtcIm1vbnRoc0Z1bGxcIjpbXCJKYW5laXJvXCIsXCJGZXZlcmVpcm9cIixcIk1hcsOnb1wiLFwiQWJyaWxcIixcIk1haW9cIixcIkp1bmhvXCIsXCJKdWxob1wiLFwiQWdvc3RvXCIsXCJTZXRlbWJyb1wiLFwiT3V0dWJyb1wiLFwiTm92ZW1icm9cIixcIkRlemVtYnJvXCJdLFwibW9udGhzU2hvcnRcIjpbXCJqYW5cIixcImZldlwiLFwibWFyXCIsXCJhYnJcIixcIm1haVwiLFwianVuXCIsXCJqdWxcIixcImFnb1wiLFwic2V0XCIsXCJvdXRcIixcIm5vdlwiLFwiZGV6XCJdLFwid2Vla2RheXNGdWxsXCI6W1wiRG9taW5nb1wiLFwiU2VndW5kYVwiLFwiVGVyw6dhXCIsXCJRdWFydGFcIixcIlF1aW50YVwiLFwiU2V4dGFcIixcIlPDoWJhZG9cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiZG9tXCIsXCJzZWdcIixcInRlclwiLFwicXVhXCIsXCJxdWlcIixcInNleFwiLFwic2FiXCJdLFwidG9kYXlcIjpcIkhvamVcIixcImNsZWFyXCI6XCJMaW1wYXJcIixcImNsb3NlXCI6XCJGZWNoYXJcIixcImZvcm1hdFwiOlwiZCAhZGUgbW1tbSAhZGUgeXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImlhbnVhcmllXCIsXCJmZWJydWFyaWVcIixcIm1hcnRpZVwiLFwiYXByaWxpZVwiLFwibWFpXCIsXCJpdW5pZVwiLFwiaXVsaWVcIixcImF1Z3VzdFwiLFwic2VwdGVtYnJpZVwiLFwib2N0b21icmllXCIsXCJub2llbWJyaWVcIixcImRlY2VtYnJpZVwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiaWFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtYWlcIixcIml1blwiLFwiaXVsXCIsXCJhdWdcIixcInNlcFwiLFwib2N0XCIsXCJub2lcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcImR1bWluaWPEg1wiLFwibHVuaVwiLFwibWFyxaNpXCIsXCJtaWVyY3VyaVwiLFwiam9pXCIsXCJ2aW5lcmlcIixcInPDom1ixIN0xINcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiRFwiLFwiTFwiLFwiTWFcIixcIk1pXCIsXCJKXCIsXCJWXCIsXCJTXCJdLFwidG9kYXlcIjpcImF6aVwiLFwiY2xlYXJcIjpcIsiZdGVyZ2VcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZGQgbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi0Y/QvdCy0LDRgNGPXCIsXCLRhNC10LLRgNCw0LvRj1wiLFwi0LzQsNGA0YLQsFwiLFwi0LDQv9GA0LXQu9GPXCIsXCLQvNCw0Y9cIixcItC40Y7QvdGPXCIsXCLQuNGO0LvRj1wiLFwi0LDQstCz0YPRgdGC0LBcIixcItGB0LXQvdGC0Y/QsdGA0Y9cIixcItC+0LrRgtGP0LHRgNGPXCIsXCLQvdC+0Y/QsdGA0Y9cIixcItC00LXQutCw0LHRgNGPXCJdLFwibW9udGhzU2hvcnRcIjpbXCLRj9C90LJcIixcItGE0LXQslwiLFwi0LzQsNGAXCIsXCLQsNC/0YBcIixcItC80LDQuVwiLFwi0LjRjtC9XCIsXCLQuNGO0LtcIixcItCw0LLQs1wiLFwi0YHQtdC9XCIsXCLQvtC60YJcIixcItC90L7Rj1wiLFwi0LTQtdC6XCJdLFwid2Vla2RheXNGdWxsXCI6W1wi0LLQvtGB0LrRgNC10YHQtdC90YzQtVwiLFwi0L/QvtC90LXQtNC10LvRjNC90LjQulwiLFwi0LLRgtC+0YDQvdC40LpcIixcItGB0YDQtdC00LBcIixcItGH0LXRgtCy0LXRgNCzXCIsXCLQv9GP0YLQvdC40YbQsFwiLFwi0YHRg9Cx0LHQvtGC0LBcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wi0LLRgVwiLFwi0L/QvVwiLFwi0LLRglwiLFwi0YHRgFwiLFwi0YfRglwiLFwi0L/RglwiLFwi0YHQsVwiXSxcInRvZGF5XCI6XCLRgdC10LPQvtC00L3Rj1wiLFwiY2xlYXJcIjpcItGD0LTQsNC70LjRgtGMXCIsXCJjbG9zZVwiOlwi0LfQsNC60YDRi9GC0YxcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZCBtbW1tIHl5eXkg0LMuXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFudcOhclwiLFwiZmVicnXDoXJcIixcIm1hcmVjXCIsXCJhcHLDrWxcIixcIm3DoWpcIixcImrDum5cIixcImrDumxcIixcImF1Z3VzdFwiLFwic2VwdGVtYmVyXCIsXCJva3TDs2JlclwiLFwibm92ZW1iZXJcIixcImRlY2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJqYW5cIixcImZlYlwiLFwibWFyXCIsXCJhcHJcIixcIm3DoWpcIixcImrDum5cIixcImrDumxcIixcImF1Z1wiLFwic2VwXCIsXCJva3RcIixcIm5vdlwiLFwiZGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wibmVkZcS+YVwiLFwicG9uZGVsb2tcIixcInV0b3Jva1wiLFwic3RyZWRhXCIsXCLFoXR2cnRva1wiLFwicGlhdG9rXCIsXCJzb2JvdGFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiTmVcIixcIlBvXCIsXCJVdFwiLFwiU3RcIixcIsWgdFwiLFwiUGlcIixcIlNvXCJdLFwidG9kYXlcIjpcImRuZXNcIixcImNsZWFyXCI6XCJ2eW1hemHFpVwiLFwiY2xvc2VcIjpcInphdnJpZcWlXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImQuIG1tbW0geXl5eVwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcImphbnVhclwiLFwiZmVicnVhclwiLFwibWFyZWNcIixcImFwcmlsXCIsXCJtYWpcIixcImp1bmlqXCIsXCJqdWxpalwiLFwiYXZndXN0XCIsXCJzZXB0ZW1iZXJcIixcIm9rdG9iZXJcIixcIm5vdmVtYmVyXCIsXCJkZWNlbWJlclwiXSxcIm1vbnRoc1Nob3J0XCI6W1wiamFuXCIsXCJmZWJcIixcIm1hclwiLFwiYXByXCIsXCJtYWpcIixcImp1blwiLFwianVsXCIsXCJhdmdcIixcInNlcFwiLFwib2t0XCIsXCJub3ZcIixcImRlY1wiXSxcIndlZWtkYXlzRnVsbFwiOltcIm5lZGVsamFcIixcInBvbmVkZWxqZWtcIixcInRvcmVrXCIsXCJzcmVkYVwiLFwixI1ldHJ0ZWtcIixcInBldGVrXCIsXCJzb2JvdGFcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wibmVkXCIsXCJwb25cIixcInRvclwiLFwic3JlXCIsXCLEjWV0XCIsXCJwZXRcIixcInNvYlwiXSxcInRvZGF5XCI6XCJkYW5lc1wiLFwiY2xlYXJcIjpcIml6YnJpxaFpXCIsXCJjbG9zZVwiOlwiemFwcmlcIixcImZpcnN0RGF5XCI6MSxcImZvcm1hdFwiOlwiZC4gbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiamFudWFyaVwiLFwiZmVicnVhcmlcIixcIm1hcnNcIixcImFwcmlsXCIsXCJtYWpcIixcImp1bmlcIixcImp1bGlcIixcImF1Z3VzdGlcIixcInNlcHRlbWJlclwiLFwib2t0b2JlclwiLFwibm92ZW1iZXJcIixcImRlY2VtYmVyXCJdLFwibW9udGhzU2hvcnRcIjpbXCJqYW5cIixcImZlYlwiLFwibWFyXCIsXCJhcHJcIixcIm1halwiLFwianVuXCIsXCJqdWxcIixcImF1Z1wiLFwic2VwXCIsXCJva3RcIixcIm5vdlwiLFwiZGVjXCJdLFwid2Vla2RheXNGdWxsXCI6W1wic8O2bmRhZ1wiLFwibcOlbmRhZ1wiLFwidGlzZGFnXCIsXCJvbnNkYWdcIixcInRvcnNkYWdcIixcImZyZWRhZ1wiLFwibMO2cmRhZ1wiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCJzw7ZuXCIsXCJtw6VuXCIsXCJ0aXNcIixcIm9uc1wiLFwidG9yXCIsXCJmcmVcIixcImzDtnJcIl0sXCJ0b2RheVwiOlwiSWRhZ1wiLFwiY2xlYXJcIjpcIlJlbnNhXCIsXCJjbG9zZVwiOlwiU3TDpG5nXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXktbW0tZGRcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwiLFwibGFiZWxNb250aE5leHRcIjpcIk7DpHN0YSBtw6VuYWRcIixcImxhYmVsTW9udGhQcmV2XCI6XCJGw7ZyZWfDpWVuZGUgbcOlbmFkXCIsXCJsYWJlbE1vbnRoU2VsZWN0XCI6XCJWw6RsaiBtw6VuYWRcIixcImxhYmVsWWVhclNlbGVjdFwiOlwiVsOkbGogw6VyXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIuC4oeC4geC4o+C4suC4hOC4oVwiLFwi4LiB4Li44Lih4Lig4Liy4Lie4Lix4LiZ4LiY4LmMXCIsXCLguKHguLXguJnguLLguITguKFcIixcIuC5gOC4oeC4qeC4suC4ouC4mVwiLFwi4Lie4Lik4Lip4Lig4Liy4LiE4LihXCIsXCLguKHguLTguJbguLjguJnguLLguKLguJlcIixcIuC4geC4o+C4geC4juC4suC4hOC4oVwiLFwi4Liq4Li04LiH4Lir4Liy4LiE4LihXCIsXCLguIHguLHguJnguKLguLLguKLguJlcIixcIuC4leC4uOC4peC4suC4hOC4oVwiLFwi4Lie4Lik4Lio4LiI4Li04LiB4Liy4Lii4LiZXCIsXCLguJjguLHguJnguKfguLLguITguKFcIl0sXCJtb250aHNTaG9ydFwiOltcIuC4oS7guIQuXCIsXCLguIEu4LieLlwiLFwi4Lih4Li1LuC4hC5cIixcIuC5gOC4oS7guKIuXCIsXCLguJ4u4LiELlwiLFwi4Lih4Li0LuC4oi5cIixcIuC4gS7guIQuXCIsXCLguKou4LiELlwiLFwi4LiBLuC4oi5cIixcIuC4lS7guIQuXCIsXCLguJ4u4LiiLlwiLFwi4LiYLuC4hC5cIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLguK3guLLguJfguJXguLTguKJcIixcIuC4iOC4seC4meC4l+C4o1wiLFwi4Lit4LiH4Lix4LiE4Liy4LijXCIsXCLguJ7guLjguJhcIixcIuC4nuC4pOC4q+C4quC4sSDguJrguJTguLVcIixcIuC4qOC4geC4uOC4o1wiLFwi4LmA4Liq4Liy4LijXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIuC4rS5cIixcIuC4iC5cIixcIuC4rS5cIixcIuC4ni5cIixcIuC4nuC4pC5cIixcIuC4qC5cIixcIuC4qi5cIl0sXCJ0b2RheVwiOlwi4Lin4Lix4LiZ4LiZ4Li14LmJXCIsXCJjbGVhclwiOlwi4Lil4LiaXCIsXCJmb3JtYXRcIjpcImQgbW1tbSB5eXl5XCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wiT2Nha1wiLFwixZ51YmF0XCIsXCJNYXJ0XCIsXCJOaXNhblwiLFwiTWF5xLFzXCIsXCJIYXppcmFuXCIsXCJUZW1tdXpcIixcIkHEn3VzdG9zXCIsXCJFeWzDvGxcIixcIkVraW1cIixcIkthc8SxbVwiLFwiQXJhbMSxa1wiXSxcIm1vbnRoc1Nob3J0XCI6W1wiT2NhXCIsXCLFnnViXCIsXCJNYXJcIixcIk5pc1wiLFwiTWF5XCIsXCJIYXpcIixcIlRlbVwiLFwiQcSfdVwiLFwiRXlsXCIsXCJFa2lcIixcIkthc1wiLFwiQXJhXCJdLFwid2Vla2RheXNGdWxsXCI6W1wiUGF6YXJcIixcIlBhemFydGVzaVwiLFwiU2FsxLFcIixcIsOHYXLFn2FtYmFcIixcIlBlcsWfZW1iZVwiLFwiQ3VtYVwiLFwiQ3VtYXJ0ZXNpXCJdLFwid2Vla2RheXNTaG9ydFwiOltcIlB6clwiLFwiUHp0XCIsXCJTYWxcIixcIsOHcsWfXCIsXCJQcsWfXCIsXCJDdW1cIixcIkNtdFwiXSxcInRvZGF5XCI6XCJCdWfDvG5cIixcImNsZWFyXCI6XCJTaWxcIixcImNsb3NlXCI6XCJLYXBhdFwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJkZCBtbW1tIHl5eXkgZGRkZFwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcItGB0ZbRh9C10L3RjFwiLFwi0LvRjtGC0LjQuVwiLFwi0LHQtdGA0LXQt9C10L3RjFwiLFwi0LrQstGW0YLQtdC90YxcIixcItGC0YDQsNCy0LXQvdGMXCIsXCLRh9C10YDQstC10L3RjFwiLFwi0LvQuNC/0LXQvdGMXCIsXCLRgdC10YDQv9C10L3RjFwiLFwi0LLQtdGA0LXRgdC10L3RjFwiLFwi0LbQvtCy0YLQtdC90YxcIixcItC70LjRgdGC0L7Qv9Cw0LRcIixcItCz0YDRg9C00LXQvdGMXCJdLFwibW9udGhzU2hvcnRcIjpbXCLRgdGW0YdcIixcItC70Y7RglwiLFwi0LHQtdGAXCIsXCLQutCy0ZZcIixcItGC0YDQsFwiLFwi0YfQtdGAXCIsXCLQu9C40L9cIixcItGB0LXRgFwiLFwi0LLQtdGAXCIsXCLQttC+0LJcIixcItC70LjRgVwiLFwi0LPRgNGDXCJdLFwid2Vla2RheXNGdWxsXCI6W1wi0L3QtdC00ZbQu9GPXCIsXCLQv9C+0L3QtdC00ZbQu9C+0LpcIixcItCy0ZbQstGC0L7RgNC+0LpcIixcItGB0LXRgNC10LTQsFwiLFwi0YfQtdGC0LLQtdGAXCIsXCLQv+KAmNGP0YLQvdC40YbRj1wiLFwi0YHRg9Cx0L7RgtCwXCJdLFwid2Vla2RheXNTaG9ydFwiOltcItC90LRcIixcItC/0L1cIixcItCy0YJcIixcItGB0YBcIixcItGH0YJcIixcItC/0YJcIixcItGB0LFcIl0sXCJ0b2RheVwiOlwi0YHRjNC+0LPQvtC00L3RllwiLFwiY2xlYXJcIjpcItCy0LjQutGA0LXRgdC70LjRgtC4XCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcImRkIG1tbW0geXl5eSBwLlwiLFwiZm9ybWF0U3VibWl0XCI6XCJ5eXl5L21tL2RkXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIlRow6FuZyBN4buZdFwiLFwiVGjDoW5nIEhhaVwiLFwiVGjDoW5nIEJhXCIsXCJUaMOhbmcgVMawXCIsXCJUaMOhbmcgTsSDbVwiLFwiVGjDoW5nIFPDoXVcIixcIlRow6FuZyBC4bqjeVwiLFwiVGjDoW5nIFTDoW1cIixcIlRow6FuZyBDaMOtblwiLFwiVGjDoW5nIE3GsOG7nWlcIixcIlRow6FuZyBNxrDhu51pIE3hu5l0XCIsXCJUaMOhbmcgTcaw4budaSBIYWlcIl0sXCJtb250aHNTaG9ydFwiOltcIk3hu5l0XCIsXCJIYWlcIixcIkJhXCIsXCJUxrBcIixcIk7Eg21cIixcIlPDoXVcIixcIkLhuqN5XCIsXCJUw6FtXCIsXCJDaMOtblwiLFwiTcaw4bubaVwiLFwiTcaw4budaSBN4buZdFwiLFwiTcaw4budaSBIYWlcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCJDaOG7pyBOaOG6rXRcIixcIlRo4bupIEhhaVwiLFwiVGjhu6kgQmFcIixcIlRo4bupIFTGsFwiLFwiVGjhu6kgTsSDbVwiLFwiVGjhu6kgU8OhdVwiLFwiVGjhu6kgQuG6o3lcIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wiQy5OaOG6rXRcIixcIlQuSGFpXCIsXCJULkJhXCIsXCJULlTGsFwiLFwiVC5OxINtXCIsXCJULlPDoXVcIixcIlQuQuG6o3lcIl0sXCJ0b2RheVwiOlwiSMO0bSBOYXlcIixcImNsZWFyXCI6XCJYb8OhXCIsXCJmaXJzdERheVwiOjF9IiwibW9kdWxlLmV4cG9ydHM9e1wibW9udGhzRnVsbFwiOltcIuS4gOaciFwiLFwi5LqM5pyIXCIsXCLkuInmnIhcIixcIuWbm+aciFwiLFwi5LqU5pyIXCIsXCLlha3mnIhcIixcIuS4g+aciFwiLFwi5YWr5pyIXCIsXCLkuZ3mnIhcIixcIuWNgeaciFwiLFwi5Y2B5LiA5pyIXCIsXCLljYHkuozmnIhcIl0sXCJtb250aHNTaG9ydFwiOltcIuS4gFwiLFwi5LqMXCIsXCLkuIlcIixcIuWbm1wiLFwi5LqUXCIsXCLlha1cIixcIuS4g1wiLFwi5YWrXCIsXCLkuZ1cIixcIuWNgVwiLFwi5Y2B5LiAXCIsXCLljYHkuoxcIl0sXCJ3ZWVrZGF5c0Z1bGxcIjpbXCLmmJ/mnJ/ml6VcIixcIuaYn+acn+S4gFwiLFwi5pif5pyf5LqMXCIsXCLmmJ/mnJ/kuIlcIixcIuaYn+acn+Wbm1wiLFwi5pif5pyf5LqUXCIsXCLmmJ/mnJ/lha1cIl0sXCJ3ZWVrZGF5c1Nob3J0XCI6W1wi5pelXCIsXCLkuIBcIixcIuS6jFwiLFwi5LiJXCIsXCLlm5tcIixcIuS6lFwiLFwi5YWtXCJdLFwidG9kYXlcIjpcIuS7iuaXpVwiLFwiY2xlYXJcIjpcIua4hemZpFwiLFwiY2xvc2VcIjpcIuWFs+mXrVwiLFwiZmlyc3REYXlcIjoxLFwiZm9ybWF0XCI6XCJ5eXl5IOW5tCBtbSDmnIggZGQg5pelXCIsXCJmb3JtYXRTdWJtaXRcIjpcInl5eXkvbW0vZGRcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJtb250aHNGdWxsXCI6W1wi5LiA5pyIXCIsXCLkuozmnIhcIixcIuS4ieaciFwiLFwi5Zub5pyIXCIsXCLkupTmnIhcIixcIuWFreaciFwiLFwi5LiD5pyIXCIsXCLlhavmnIhcIixcIuS5neaciFwiLFwi5Y2B5pyIXCIsXCLljYHkuIDmnIhcIixcIuWNgeS6jOaciFwiXSxcIm1vbnRoc1Nob3J0XCI6W1wi5LiAXCIsXCLkuoxcIixcIuS4iVwiLFwi5ZubXCIsXCLkupRcIixcIuWFrVwiLFwi5LiDXCIsXCLlhatcIixcIuS5nVwiLFwi5Y2BXCIsXCLljYHkuIBcIixcIuWNgeS6jFwiXSxcIndlZWtkYXlzRnVsbFwiOltcIuaYn+acn+aXpVwiLFwi5pif5pyf5LiAXCIsXCLmmJ/mnJ/kuoxcIixcIuaYn+acn+S4iVwiLFwi5pif5pyf5ZubXCIsXCLmmJ/mnJ/kupRcIixcIuaYn+acn+WFrVwiXSxcIndlZWtkYXlzU2hvcnRcIjpbXCLml6VcIixcIuS4gFwiLFwi5LqMXCIsXCLkuIlcIixcIuWbm1wiLFwi5LqUXCIsXCLlha1cIl0sXCJ0b2RheVwiOlwi5LuK5aSpXCIsXCJjbGVhclwiOlwi5riF6ZmkXCIsXCJjbG9zZVwiOlwi5YWz6ZetXCIsXCJmaXJzdERheVwiOjEsXCJmb3JtYXRcIjpcInl5eXkg5bm0IG1tIOaciCBkZCDml6VcIixcImZvcm1hdFN1Ym1pdFwiOlwieXl5eS9tbS9kZFwifSJdfQ==
