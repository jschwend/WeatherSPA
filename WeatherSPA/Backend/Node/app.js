var path = require('path'),
    utile = require('utile');

utile.inspect = require('util').inspect;

var flatiron = require('flatiron'),
    app = flatiron.app;

var weatherdata = require('./lib/weatherdata');

var title = 'SchwenderWeather'.rainbow;

app.config.file({ file: path.join(__dirname, 'config.json') });

app.use(flatiron.plugins.http);
app.use(weatherdata,app.config.get('mysql'));

app.router.path('/temps', function () {
  this.get(function () {

    var req = this.req,
        res = this.res;
    var station = req.query.station ? req.query.station : 'KNJFLEMI11';

    app.weatherdata.getCached(station, function (err, data) {
      if (err) {
        return res.json(500, {
          success: false,
          reason: err.message || 'unknown'
        });
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    });
  });
});
app.router.path('/stations', function () {
  this.get(function () {

    var req = this.req,
        res = this.res;
    app.weatherdata.getCached('stations', function (err, data) {
      if (err) {
        return res.json(500, {
          success: false,
          reason: err.message || 'unknown'
        });
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.json(data);
      res.end();
    });
  });
});

app.start(app.config.get('port') || 8080, function (err) {
  if (err) {
    throw err;
  }

  var addr = app.server.address();

  app.log.info(title + ' Listening on http://' + addr.address + ':' + addr.port);
});
