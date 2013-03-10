var EventEmitter2 = require('eventemitter2').EventEmitter2,
    mysql = require("mysql"),
    util = require('utile');

var WeatherData = module.exports = function (opts) {
  if (!(this instanceof WeatherData)) {
    return new WeatherData;
  }

  var weatherdata = this;

  weatherdata.options = opts || {};

  EventEmitter2.call(this, {
    wildcard: true,
    delimiter: '::',
    maxListeners: 0
  });
  weatherdata.connection = mysql.createConnection({
    host     : weatherdata.options.host,
    user     : weatherdata.options.auth.username,
    password : weatherdata.options.auth.password,
    database : weatherdata.options.database,
  });
  weatherdata.ready = true;
  weatherdata.emit('weatherdata::ready');
};

util.inherits(WeatherData, EventEmitter2);

WeatherData.prototype.get = function (station, cb) {
  var weatherdata = this;
  var query, parms;
  if (station == 'stations') {
    query = "SELECT Station, Name from Xref order by 2";
    parms = [];
  } else {
    query = "SELECT DATE_FORMAT(`When`,'%m/%d/%Y') as date, Temperature as temp from Log where `When` > ? and hour(`When`) =14 and Station = ?";
    parms = [new Date(2012,1,1), station];
  }
  weatherdata.connection.query(query,parms,
    function(err, rows) {
      if (err) throw err;
      console.log('Got ' + rows.length + ' from database');
      cb(null, rows);
  });
};
WeatherData.prototype.getCached = function (station, cb) {
  var self = this;
  self.get(station,cb);
};
WeatherData.attach = function (opts) {
  this.weatherdata = new WeatherData(opts);
}

WeatherData.init = function (done) {
  if (this.weatherdata.ready) {
    console.log('init: %s is ready.', this);
    return done();
  } else {
    console.log('init: Waiting for %s.', this);
    this.weatherdata.once('weatherdata::ready', function () {
      console.log('init: %s is ready.', this);
      return done();
    });
  }
}
