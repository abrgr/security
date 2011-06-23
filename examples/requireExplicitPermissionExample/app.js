
/**
 * Module dependencies.
 */

var express = require('express');
var security = require('./security');

var app = module.exports = express.createServer();

// Configuration

security.secureRoutes(app);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

//app.get('/', function(req, res, next) { console.log('middleware'); req.permitRequest = true; next(); }, function(req, res){
app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});

//console.log(app.routes.routes.get[0].callback.toString());

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
