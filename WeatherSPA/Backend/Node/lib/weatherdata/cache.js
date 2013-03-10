var WeatherData = require('./weatherdata'),
    common = require('../common'),
    resourceful = require('resourceful'),
    errs = require('errs'),
    colors = require('colors'),
    utile = require('utile');

// Cached bundle resources.
var CachedData = resourceful.define('cachedData', function () {
  this.string('md5');
  this.array('data');
});

// A version of the bundler that caches. Use `.get(text)`.
var CachingWeatherData = module.exports = function (opts) {
  // This lets you create a new caching Bundler without the 'new' keyword.
  if (!(this instanceof CachingWeatherData)) {
    return new CachingWeatherData;
  }

  opts = opts || {};
  WeatherData.call(this, opts);
  // Set up resourceful to use couchdb.
  resourceful.use('memory');
}

utile.inherits(CachingWeatherData, WeatherData);

CachingWeatherData.prototype.getCached = function (tag, cb) {
  var self = this,
      md5 = common.md5(tag);

  CachedData.find({ md5: md5 }, function (err, bundles) {
    if (err) {
      return cb(realError(err));
    }
    // Any answer other than 1 means an actual md5 hash collison.
    switch (bundles.length) {
      case 1:
        console.log('info', 'Match found.');
        finish(null, bundles[0]);
        break;
      case 0:
        console.log('info', 'Not cached, building from database.');
	if (tag == 'stations') {
          getStations();
        } else {
          getTemps(tag);
        }
        break;
      default:
        console.log('Multiple caches describing this tag exist. Showing the first one of ' + bundles.length + '.');
        finish(null, bundles[0]);
        break;
    }
  });

  function getStations () {
    self.get('stations',function (err, data) {
      bundleIt(err,data,'stations')
    });
  }
  function getTemps (station) {
    self.get(station,function (err, data) {
      bundleIt(err,data,station)
    });
  }
  function bundleIt (err,data,tag) {
      if (err) {
        return cb(err);
      }
      var bundle = new CachedData();
      bundle.data = data;
      bundle.md5 = md5;
      CachedData.save(bundle, function (err, bundle) {
        if (err) {
          console.log('error', 'Error while caching bundle');
        }
        return finish(realError(err), bundle);
      });
  }

  function finish (err, bundle) {
    if (err) {
      return cb(err);
    }
    cb(null, bundle.data);
  }
};
// Attach the caching bundler, passing in our config options for the couch.
// Also emits logging events to the app.
CachingWeatherData.attach = function (options) {
  var app = this;

  this.weatherdata = new CachingWeatherData(utile.mixin(
    options,
    this.config.get('mysql')
  ));
  app.weatherdata.on('log::**', function (msg) {
    app.emit(this.event, msg);
  });
};

CachingWeatherData.init = WeatherData.init;

// A helper because, unfortunately, sometimes cradle returns errors that
// aren't of type Error and look like [object Object] when thrown.
function realError(err) {
  return err ? errs.merge(new Error(err.message || err.reason), err) : err;
}
