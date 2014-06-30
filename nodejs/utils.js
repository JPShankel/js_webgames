var async = require('async');
var crypto = require('crypto');
var domain = require('domain');
var ent = require('ent');
var express = require('express');
var fs = require('fs');
var log = require('winston');
var nodemailer = require('nodemailer');
var os = require('os');
var path = require('path');
var readline = require('readline');
var config = require('./config');

exports.unixTimestamp = unixTimestamp;
exports.fromUnixTimestamp = fromUnixTimestamp;
exports.getTZOffset = getTZOffset;
exports.localEpochHours = localEpochHours;
exports.localEpochDays = localEpochDays;
exports.getStartOfDay = getStartOfDay;
exports.adjustDateTimezone = adjustDateTimezone;
exports.isMongoID = isMongoID;
exports.error = error;
exports.catchRequestErrors = catchRequestErrors;
exports.allowCORS = allowCORS;
exports.handle404 = handle404;
exports.handle500 = handle500;
exports.mailError = mailError;
exports.requestLogger = requestLogger;
exports.requestErrorLogger = requestErrorLogger;
exports.logSlowResponses = logSlowResponses;
exports.setupLogging = setupLogging;
exports.shortDate = shortDate;
exports.pad2 = pad2;
exports.pad = pad;
exports.padStr = padStr;
exports.snippet = snippet;
exports.clamp = clamp;
exports.md5 = md5;
exports.sha1 = sha1;
exports.parseBool = parseBool;
exports.isNumber = isNumber;
exports.base64Encode = base64Encode;
exports.base64Decode = base64Decode;
exports.uuid = uuid;
exports.base64UrlEncode = base64UrlEncode;
exports.base64UrlDecode = base64UrlDecode;
exports.extend = extend;
exports.exponentialBackoff = exponentialBackoff;
exports.randomChars = randomChars;
exports.readCSV = readCSV;
exports.findAllFiles = findAllFiles;
exports.countLines = countLines;
exports.noOp = noOp;
exports.urlFriendly = urlFriendly;
exports.mongoFriendly = mongoFriendly;
exports.removeDiacritics = removeDiacritics;
exports.locationMatchScore = locationMatchScore;
exports.levenshteinDistance = levenshteinDistance;
exports.greatCircleDistance = greatCircleDistance;
exports.vincentyDistance = vincentyDistance;

exports.ERR_BAD_REQUEST = 400;
exports.ERR_SERVICE_UNAVAILABLE = 503;
exports.ERR_DB_CONNECTION = 10000;
exports.ERR_DB_DUPLICATE_KEY = 11000;

/*****************************************************************************/

/**
 * Check if a string starts with another string (case-sensitive).
 */
String.prototype.startsWith = function(prefix) {
  return this.indexOf(prefix) === 0;
};

/**
 * Check if a string ends with another string (case-sensitive).
 */
String.prototype.endsWith = function(suffix) {
  return this.slice(-suffix.length) === suffix;
};

/**
 * Simple string formatting using "The quick {0} {1} jumps over the lazy {2}"
 * style format strings.
 */
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function(match, num) {
    num = parseInt(num, 10);
    return typeof args[num] !== 'undefined' ? args[num] : match;
  });
};

/**
 * Return a copy of the string with the first letter capitalized.
 */
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * ES6 Array.prototype.find() spec. Searches for the first element in an array
 * that matches the given predicate function, in ascending order, and
 * immediately returns the found element. Returns undefined otherwise.
 */
Array.prototype.find = function(predicate, thisArg) {
  for(var
    k = 0,
    len = this.length;
    k < len && !(
      k in this &&
      predicate.call(thisArg, this[k], k, this)
    );
    k++
  );
  return this[k];
};

/**
 * Randomize an array in-place using the Fisher-Yates shuffle.
 */
Array.prototype.shuffle = function() {
  var i = this.length;
  while (--i > 0) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
  return this;
};

/**
 * Return a new date that is offset by the given number of seconds.
 */
Date.prototype.addSeconds = function(seconds) {
  return new Date(this.getTime() + 1000 * seconds);
};

/**
 * Get the number of seconds passed since the UNIX epoch from this Date object.
 */
Date.prototype.unixTimestamp = function() {
  return ~~(this.getTime() / 1000);
};

/*****************************************************************************/

/**
 * Get the number of seconds passed since the UNIX epoch using the current
 * system time.
 */
function unixTimestamp() {
  return ~~(new Date().getTime() / 1000);
}

/**
 * Convert a UNIX timestamp into a Date object.
 */
function fromUnixTimestamp(timestamp) {
  if (typeof timestamp === 'string')
    timestamp = parseInt(timestamp, 10);
  return new Date(timestamp * 1000);
}

/**
 * Get the timezone offset of an ISO date string represented in minutes.
 * 'America/Los_Angeles' during daylight savings would be -420.
 */
function getTZOffset(dateStr) {
  if (!dateStr)
    return 0;

  var tzMatch = dateStr.match(/([+-][0-9:]{4,5})$/);
  if (!tzMatch)
    return 0;

  var hhmm = Number(tzMatch[1].replace(':', ''));
  if (isNaN(hhmm))
    return 0;

  var hours = ~~(hhmm/100);
  var minutes = hhmm - hours*100;

  return hours * 60 + minutes;
}

/**
 * Get the number of hours (rounded down to the nearest integer) that have
 * passed since the UNIX epoch for the given date with the given timezone
 * offset in minutes.
 */
function localEpochHours(date, tzOffset) {
  tzOffset = tzOffset || 0;
  date = adjustDateTimezone(date, tzOffset);
  return Math.floor(date.getTime() / 3600000);
}

/**
 * Get the number of days (rounded down to the nearest integer) that have
 * passed since the UNIX epoch for the given date with the given timezone
 * offset in minutes.
 */
function localEpochDays(date, tzOffset) {
  tzOffset = tzOffset || 0;
  date = adjustDateTimezone(date, tzOffset);
  return Math.floor(date.getTime() / 86400000);
}

/**
 * Get the start (00:00:00) of the given or current day.
 */
function getStartOfDay(date) {
  date = date || new Date();

  return new Date(date - (
    date.getMilliseconds() +
    date.getSeconds() * 1000 +
    date.getMinutes() * 1000 * 60 +
    date.getHours()   * 1000 * 60 * 60)
  );
}

/**
 * Apply a timezone offset to a date, adjusting for the local system timezone.
 */
function adjustDateTimezone(date, tzOffset) {
  tzOffset = tzOffset || 0;
  var localOffset = -(new Date()).getTimezoneOffset();
  return date.addSeconds((tzOffset - localOffset) * 60);
}

/**
 * Returns true if the given string can be interpreted as a MongoID
 * (24-character hex string), otherwise false.
 */
function isMongoID(str) {
  return (/^[a-f0-9]{24}$/).test(str);
}

/**
 * Creates an Error object with a custom error code attached.
 */
function error(msg, code) {
  var err = new Error(msg);
  Error.captureStackTrace(err, arguments.callee);
  err.code = code || 0;
  return err;
}

/**
 * Create a domain for each HTTP request to gracefully handle errors.
 */
function catchRequestErrors(req, res, next) {
  var d = domain.create();
  d.add(req);
  d.add(res);
  d.on('error', function(err) {
    log.warn('[DOMAIN] Caught error: ' + err);
    try {
      res.on('close', function() { d.dispose(); });
      next(err);
    } catch (ex) {
      log.warn('[DOMAIN] Failed to send response: ' + ex);
      d.dispose();
    }
  });
  d.run(next);
}

/**
 * Add permissive Access-Control-Allow-* headers to responses and immediately
 * respond to OPTIONS requests with a 200.
 */
function allowCORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS')
    return res.send(200);

  next();
}

function handle404(req, res, next) {
  res.statusCode = 404;

  var contentType = res.getHeader('content-type') || '';
  if (req.xhr || contentType.indexOf('application/json') === 0) {
    // JSON
    res.jsonp({ success: false, error: 'Not Found', code: 404 });
  } else {
    res.send(404);
  }
}

function handle500(err, req, res, next) {
  var errMsg = (err.message) ? err.message : (err instanceof Error) ? ''+err : JSON.stringify(err);
  var stack = err.stack || '';
  var errCode = (err.code >= 400 && err.code <= 599) ? err.code : 500;

  res.statusCode = errCode;

  var contentType = res.getHeader('content-type') || '';
  if (req.xhr || contentType.indexOf('application/json') === 0) {
    // JSON
    res.jsonp({ success: false, error: errMsg, code: errCode, stack: stack });
  } else {
    // Stack trace
    fs.readFile(path.join(__dirname, '500.html'), function(err, html) {
      if (err) {
        res.type('text/plain');
        return res.send(errCode + '\n' + errMsg + '\n' + stack);
      }

      res.type('text/html');
      res.send(html.toString().replace(/\{ERROR\}/, ent.encode(errMsg + '\n' + stack)));
    });
  }
}

function mailError(options, callback) {
  callback = callback || noOp;

  if (!options.err)
    return callback('mailError() called with no err');

  var mailSender = config.get('mail_sender');
  if (!mailSender)
    return callback('Missing required mail_* config settings');

  var from = options.from || config.get('mail_from');
  var to = options.to || config.get('mail_recipients');
  var subject = '[ERROR ' + (options.type || options.err.type || 'ERR_UNKNOWN') + '] ' + os.hostname();
  var text = options.err.stack || '' + options.err;

  log.error('[ERROR_EMAIL]' + subject + ' - ' + text);

  // Don't actually send email in debug mode
  if (config.get('debug'))
    return callback(null);

  var smtpTransport = nodemailer.createTransport('SMTP', mailSender);
  var mailOptions = { from: from, to: to, subject: subject, text: text };

  smtpTransport.sendMail(mailOptions, function(mailErr, res) {
    if (mailErr) log.error('Failed to send error e-mail: ' + mailErr);

    callback(mailErr);
  });
}

/**
 * Log HTTP requests in common log format
 * (see http://httpd.apache.org/docs/1.3/logs.html#common).
 */
function requestLogger(options) {
  var STATUS_RE = /HTTP\/[\d\.]+" (\d+) /;

  return express.logger({ stream: {
    write: function(str) {
      // Remove any trailing newline in the log message
      if (str[str.length - 1] === '\n')
        str = str.substr(0, str.length - 1);

      // Parse the status code out of the message to determine an appropriate
      // log level
      var match = str.match(STATUS_RE);
      var level = (match && parseInt(match[1], 10) >= 400) ? 'warn' : 'info';

      for (var i = 0; i < options.transports.length; i++)
        options.transports[i].log(level, str, null, noOp);
    }
  } });
}

/**
 * Log detailed information about request errors.
 */
function requestErrorLogger(options) {
  var REQ_WHITELIST = ['url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query'];

  return function(err, req, res, next) {
    var exMeta = {};
    if (err.stack)
      exMeta.stack = err.stack;
    else
      exMeta.error = '"' + err.toString() + '"';

    exMeta.code = (err.code >= 400 && err.code <= 599) ? err.code : 500;

    exMeta.req = {};
    REQ_WHITELIST.forEach(function(propName) {
      var value = req[propName];
      if (typeof (value) !== 'undefined')
        exMeta.req[propName] = value;
    });

    for (var i = 0; i < options.transports.length; i++)
      options.transports[i].logException('middlewareError', exMeta, noOp);

    next(err);
  };
}

/**
 * Log a warning if a request takes longer than the configured timeout to send
 * response headers.
 */
function logSlowResponses(req, res, next) {
  var TIMEOUT_MS = 8000;

  var writeHead = res.writeHead;

  var timer = setTimeout(function() {
    log.warn('[TIMEOUT] ' + req.method + ' ' + req.url + ' (' + req.ip + ')');
  }, TIMEOUT_MS);

  req.clearTimeout = function() { clearTimeout(timer); };

  res.writeHead = function(code, headers) {
    res.writeHead = writeHead;
    req.clearTimeout();
    res.writeHead(code, headers);
  };

  next();
}

/**
 * Setup the configured log level, our custom log timestamps, and enable
 * colored logging to the console.
 */
function setupLogging(winston) {
  if (winston)
    doLoggingSetup(winston);
  doLoggingSetup(log);

  function doLoggingSetup(loggerRef) {
    // Setup console logging
    loggerRef.loggers.options.transports = [];
    loggerRef.remove(loggerRef.transports.Console);
    var logger = loggerRef.add(loggerRef.transports.Console, {
      level: config.get('log_level') || 'debug',
      colorize: true,
      timestamp: shortDate
    });
    loggerRef.loggers.options.transports.push(logger.transports.console);
  }
}

/**
 * Returns a date string with the format "26 Feb 16:19:34".
 */
function shortDate(date) {
  var SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'];

  var d = date || new Date();
  return d.getDate() + ' ' + SHORT_MONTHS[d.getMonth()] + ' ' +
    pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

/**
 * Convert a number to a string and pad numbers from [0-9] with a leading '0'.
 */
function pad2(n) {
  return n < 10 && n >= 0 ? '0' + n.toString(10) : n.toString(10);
}

/**
 * Convert a number to a string padded with leading zeros so the final string
 * contains at least 'length' characters.
 */
function pad(n, length) {
  length = length || 2;

  var absN = Math.abs(n);
  var zeros = Math.max(0, length - Math.floor(absN).toString().length);
  var zeroString = Math.pow(10, zeros).toString().substr(1);

  if (n < 0)
    zeroString = '-' + zeroString;

  return zeroString + absN;
}

/**
 * Prepend leading characters (defaulting to '0') so the final string contains
 * at least 'length' characters.
 */
function padStr(str, length, padChar) {
  padChar = padChar || '0';
  var padLen = Math.max(0, length - str.length);
  return new Array(padLen + 1).join(padChar) + str;
}

/**
 * Trim text at word boundaries using a tail like '...' such that the final
 * string length does not exceed the requested length.
 */
function snippet(text, length, tail) {
  if (typeof text !== 'string') return text;
  if (typeof tail !== 'string') tail = '...';

  var textlen = text.length;

  if (textlen > length) {
    var i = 0;
    for (i = 1; text[length - i] !== ' '; i++) {
      if (i === length)
        return text.substr(0, length).replace(/[ ,]$/, '') + tail;
    }

    return text.substr(0, length - i + 1).replace(/[ ,]$/, '') + tail;
  }

  return text;
}

/**
 * Clamp a number from [min...max]
 */
function clamp(num, min, max) {
  if (typeof num !== 'number')
    num = parseInt(num, 10) || 0;
  return Math.max(min, Math.min(max, num));
}

/**
 * Return the MD5 hash of a string as a 32 character hex string.
 */
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Return the SHA1 hash of a string as a 40 character hex string.
 */
function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

/**
 * Parse a string as a boolean (true/false) value.
 */
function parseBool(str) {
  if (!str) return false;
  str = (''+str).toLowerCase();
  return !(!str || str === 'false' || str === '0' || str === 'null' || str === 'undefined' || str === 'no');
}

/**
 * Check if a string can be parsed as a valid finite number.
 */
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Encode string or Buffer data as a base64 string.
 */
function base64Encode(unencoded) {
  return new Buffer(unencoded || '').toString('base64');
}

/**
 * Decode a base64 string into a Buffer object.
 */
function base64Decode(encoded) {
  return new Buffer(encoded || '', 'base64').toString('utf8');
}

/**
 * Encode string or Buffer data as a URL-safe base64 string ("+" becomes "-",
 * "/" becomes "_", trailing "=" characters are removed).
 * See <http://en.wikipedia.org/wiki/Base64#URL_applications>
 */
function base64UrlEncode(unencoded) {
  var encoded = base64Encode(unencoded);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}

/**
 * Decode a URL-safe base64 string into a Buffer object.
 */
function base64UrlDecode(encoded) {
  encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4)
    encoded += '=';
  return base64Decode(encoded);
}

/**
 * Generates an RFC 4122 version 4 (random) UUID.
 */
var _byteToHex;
function uuid() {
  // Generate 16 bytes of random data in a Buffer object
  var buf = crypto.randomBytes(16);

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  // Lazily initialize our mapping from byte values to hex strings
  if (!_byteToHex) {
    _byteToHex = new Array(256);
    for (var i = 0; i < 256; i++)
      _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  }

  // Return the formatted string
  var bth = _byteToHex;
  return bth[buf[0]] + bth[buf[1]] +
         bth[buf[2]] + bth[buf[3]] + '-' +
         bth[buf[4]] + bth[buf[5]] + '-' +
         bth[buf[6]] + bth[buf[7]] + '-' +
         bth[buf[8]] + bth[buf[9]] + '-' +
         bth[buf[10]] + bth[buf[11]] +
         bth[buf[12]] + bth[buf[13]] +
         bth[buf[14]] + bth[buf[15]];
}

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by mscdex to use Array.isArray instead of the custom isArray method
 */
function extend() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && typeof target !== 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || obj.toString() !== '[object Object]' || obj.nodeType || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
    var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;

    return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
  };

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
          continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (typeof copy !== 'undefined')
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
}

/**
 * Returns the number of milliseconds to wait before retrying an action,
 * given the current number of retries and the approximate maximum waiting
 * period between attempts. Wait times start at ~1s and are exponential plus up
 * to a 10% additional random value.
 * @param {Number} retries Number of times the action has already been retried,
 *        from [0-Inf]
 * @param {Number} limit (Optional) approximate maximum return value, in
 *        milliseconds.
 * @returns {Number} Time to wait, in milliseconds.
 */
function exponentialBackoff(retries, limit) {
  limit = limit || Number.MAX_VALUE;
  var delay = Math.min(Math.pow(2, retries) * 1000, limit);
  var random = Math.round(Math.random() * delay * 0.10);
  return delay + random;
}

/**
 * Return a string of random ASCII characters of the requested length.
 */
var RAND_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var RAND_LOWER_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomChars(count, lowercase) {
  var alphabet = lowercase ? RAND_LOWER_ALPHABET : RAND_ALPHABET;

  var output = '';
  for (var i = 0; i < count; i++)
    output += alphabet.charAt(~~(Math.random() * alphabet.length));

  return output;
}

/**
 * Asynchronously read a comma-separated value style file.
 *
 * @param {String} filename File to read.
 * @param {String} separator Separator character, defaulting to a comma.
 * @param {Function} eachCallback(parts, done(err)) Fired on each parsed line.
 *        Further parsing is paused until the done() function is called.
 * @param {Function} doneCallback(err) Fired when all lines have been parsed or
 *        an error was encountered.
 */
function readCSV(filename, separator, eachCallback, doneCallback) {
  var error;
  var waitingOn = 0;
  var closed = false;

  separator = separator || ',';

  var reader = readline.createInterface({
    input: fs.createReadStream(filename),
    output: null,
    terminal: false
  });

  reader.on('line', function(line) {
    if (!line) return;

    var self = this;
    this.pause();

    var parts;
    if (line[0] === '"') {
      line = line.substr(1, line.length - 2);
      parts = line.split('"' + separator + '"');
    } else {
      parts = line.split(separator);
    }

    // Unescape quotes
    for (var i = 0; i < parts.length; i++)
      parts[i] = parts[i].replace(/\\"/g, '"');

    waitingOn++;
    eachCallback(parts, function(err) {
      waitingOn--;
      if (closed && !waitingOn)
        return doneCallback(error);

      if (err) {
        error = err;
        return self.close();
      }
      self.resume();
    });
  });

  reader.on('error', function(err) {
    error = err;
    closed = true;
    if (!waitingOn)
      doneCallback(error);
  });

  reader.on('close', function() {
    closed = true;
    if (!waitingOn)
      doneCallback(error);
  });
}

/**
 * Recursively search for all files in a directory and return an array of all
 * discovered file paths.
 *
 * @param {String} dir Directory to search.
 * @param {Function} callback(err, [files]) Callback to execute when the search
 *        is finished.
 */
function findAllFiles(dir, callback) {
  // Read all of the entries in this directory
  fs.readdir(dir, function(err, list) {
    if (err) return callback(err, null);

    // Iterate over each entry
    async.map(list,
      function(filename, done) {
        var fullpath = path.join(dir, filename);

        // Check if this is a file or folder
        fs.stat(fullpath, function(err, stat) {
          if (err) return done(err, null);

          if (stat.isDirectory()) {
            // Recurse into this directory
            findAllFiles(fullpath, done);
          } else {
            done(null, [ fullpath ]);
          }
        });
      },
      function(err, filesArrays) {
        if (err) return callback(err, null);

        // Flatten the array of arrays into a single array
        var merged = [];
        merged = merged.concat.apply(merged, filesArrays);

        callback(null, merged);
      }
    );
  });
}

/**
 * Count the number of newline (\n) characters in a text file.
 *
 * @param {String} filename File to read.
 * @param {Function} callback(err, count) Callback.
 */
function countLines(filename, callback) {
  var count = 0;
  var stream = fs.createReadStream(filename);

  stream.on('data', function(chunk) {
    for (var i = 0; i < chunk.length; i++) {
      if (chunk[i] === 10)
        count++;
    }
  });

  stream.on('error', callback);

  stream.on('end', function() {
    callback(null, count);
  });
}

/**
 * Does nothing!
 */
function noOp() { }

/**
 * Convert a string into a URL-safe and human readable version.
 */
function urlFriendly(str) {
  if (!str) return str;

  return removeDiacritics(str) // Remove any accent marks from letters
    .trim() // Remove leading and trailing whitespace
    .replace(/['"]+/g, '') // Remove apostrophes and quotes
    .replace(/[\W]+/g, '-') // Replace all non alphanumeric sections with a dash
    .replace(/^-/, '') // Remove leading dash if one exists
    .replace(/-$/, '') // Remove trailing dash if one exists
    .toLowerCase(); // Convert to lowercase
}

/**
 * Convert a string into a string that is safe to use as a MongoDB key.
 */
function mongoFriendly(str) {
  if (!str) return str;

  return removeDiacritics(str) // Remove any accent marks from letters
    .trim() // Remove leading and trailing whitespace
    .replace(/[\.$]/g, '_');
}

var diacriticsRemovalMap = [
  {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
  {'base':'AA','letters':/[\uA732]/g},
  {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
  {'base':'AO','letters':/[\uA734]/g},
  {'base':'AU','letters':/[\uA736]/g},
  {'base':'AV','letters':/[\uA738\uA73A]/g},
  {'base':'AY','letters':/[\uA73C]/g},
  {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
  {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
  {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
  {'base':'DZ','letters':/[\u01F1\u01C4]/g},
  {'base':'Dz','letters':/[\u01F2\u01C5]/g},
  {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
  {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
  {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
  {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
  {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
  {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
  {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
  {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
  {'base':'LJ','letters':/[\u01C7]/g},
  {'base':'Lj','letters':/[\u01C8]/g},
  {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
  {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
  {'base':'NJ','letters':/[\u01CA]/g},
  {'base':'Nj','letters':/[\u01CB]/g},
  {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
  {'base':'OI','letters':/[\u01A2]/g},
  {'base':'OO','letters':/[\uA74E]/g},
  {'base':'OU','letters':/[\u0222]/g},
  {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
  {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
  {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
  {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
  {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
  {'base':'TZ','letters':/[\uA728]/g},
  {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
  {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
  {'base':'VY','letters':/[\uA760]/g},
  {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
  {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
  {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
  {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
  {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
  {'base':'aa','letters':/[\uA733]/g},
  {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
  {'base':'ao','letters':/[\uA735]/g},
  {'base':'au','letters':/[\uA737]/g},
  {'base':'av','letters':/[\uA739\uA73B]/g},
  {'base':'ay','letters':/[\uA73D]/g},
  {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
  {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
  {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
  {'base':'dz','letters':/[\u01F3\u01C6]/g},
  {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
  {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
  {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
  {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
  {'base':'hv','letters':/[\u0195]/g},
  {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
  {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
  {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
  {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
  {'base':'lj','letters':/[\u01C9]/g},
  {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
  {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
  {'base':'nj','letters':/[\u01CC]/g},
  {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
  {'base':'oi','letters':/[\u01A3]/g},
  {'base':'ou','letters':/[\u0223]/g},
  {'base':'oo','letters':/[\uA74F]/g},
  {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
  {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
  {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
  {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
  {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
  {'base':'tz','letters':/[\uA729]/g},
  {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
  {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
  {'base':'vy','letters':/[\uA761]/g},
  {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
  {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
  {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
  {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
];

/**
 * Remove accent marks by converting é to e, ü to u, etc.
 */
function removeDiacritics(str) {
  for (var i = 0; i < diacriticsRemovalMap.length; i++)
    str = str.replace(diacriticsRemovalMap[i].letters, diacriticsRemovalMap[i].base);
  return str;
}

/**
 * Compute similarity score between two locations using geographical distance
 * and levenshteinDistance. Helper functions compute levenshteinDistance and
 * greatCircleDistance.
 */
function locationMatchScore(sourceName, sourceLatitude, sourceLongitude, targetName, targetLatitude, targetLongitude) {
  var DISTANCE_THRESHOLD = 500; // meters
  var LEVENSHTEIN_MATCH_THRESHOLD = 0.25;

  var dScore = 0;
  var distance = greatCircleDistance(sourceLatitude, sourceLongitude, targetLatitude, targetLongitude);
  if (distance < DISTANCE_THRESHOLD) {
    dScore = (DISTANCE_THRESHOLD - distance)/DISTANCE_THRESHOLD;
  }

  var lScore = 1 - levenshteinDistance(sourceName, targetName) / sourceName.length;
  if (lScore < LEVENSHTEIN_MATCH_THRESHOLD) return 0;
  return lScore + dScore;
}

/**
 * Calculates the classic Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  var i, j;
  var matrix = [];

  // increment along the first column of each row
  for (i = 0; i <= b.length; i++)
    matrix[i] = [i];

  // increment each column in the first row
  for (j = 0; j <= a.length; j++)
    matrix[0][j] = j;

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) == a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i  ][j-1] + 1, // insertion
          matrix[i-1][j  ] + 1  // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates the shortest distance between two lat/lon points on a perfect
 * sphere approximation of the Earth.
 */
function greatCircleDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = (lat2-lat1) * Math.PI / 180;
  var dLon = (lon2-lon1) * Math.PI / 180;
  lat1 = lat1 * Math.PI / 180;
  lat2 = lat2 * Math.PI / 180;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000;
}

/**
 * Accurate calculation of the shortest distance between two lat/lon points on
 * a WGS-84 spheroid model of the Earth. Uses the Vincenty iterative formula.
 */
function vincentyDistance(lat1, lon1, lat2, lon2) {
  var a = 6378137, b = 6356752.3142, f = 1/298.257223563; // WGS-84 ellipsoid params
  var L = (lon2 - lon1).toRad();
  var U1 = Math.atan((1 - f) * Math.tan(lat1.toRad()));
  var U2 = Math.atan((1 - f) * Math.tan(lat2.toRad()));
  var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  var lambda = L;
  var lambdaP, sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha,
    cosSqAlpha, cos2SigmaM, C;
  var iterLimit = 100;

  do {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) +
      (cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
    if (sinSigma === 0) return 0; // Co-incident points
    cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = 1 - sinAlpha*sinAlpha;
    cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
    if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // Equatorial line: cosSqAlpha=0 (§6)
    C = f/16*cosSqAlpha*(4+f*(4 - 3*cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1 - C) * f * sinAlpha *
      (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1 + 2*cos2SigmaM*cos2SigmaM)));
  } while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit > 0);

  // If the formula fails to converge, return halfway around the equator
  if (iterLimit === 0) return 20037508.5;

  var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
  var A = 1 + uSq/16384*(4096 + uSq*(-768 + uSq*(320 - 175*uSq)));
  var B = uSq/1024 * (256 + uSq*(-128 + uSq*(74 - 47*uSq)));
  var deltaSigma = B*sinSigma*(cos2SigmaM + B/4*(cosSigma*(-1 + 2*cos2SigmaM*cos2SigmaM) -
    B/6*cos2SigmaM*(-3 + 4*sinSigma*sinSigma)*(-3 + 4*cos2SigmaM*cos2SigmaM)));
  var s = b*A*(sigma - deltaSigma);

  return s;
}
