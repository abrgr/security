var express = require('express');
var crypto = require('crypto');

/**
* Middleware that only allows the request to proceed if request.permitRequest is set
**/
var secureMiddleware = function(req, res, next) {
    if ( !!req.permitRequest ) {
        return next();
    }

    return next(new Error('Attempted invocation of [' + req.url + '] when request.permitRequest was not set.'));
};

/**
* Proxies all routes on app (existing and future) to ensure that request.permitRequest is set.  If it is not set,
* an error will be passed to the next function passed to the route
* @param {Object} app - HTTPServer or HTTPSServer on which to secure the routes
**/
var secureRoutes = module.exports.secureRoutes = function(app) {
    // proxy any routes already setup
    var currentRoutesByMethod = app.routes.routes;
    Object.keys(currentRoutesByMethod).forEach(function(method) {
        currentRoutesByMethod[method].forEach(function(route) {
            route.middleware.push(secureMiddleware);
        });
    });

    var methods = express.router.methods;

    // proxy all future routes
    methods.forEach(function(method) {
        var originalRegistrationFn = app[method];

        // when app.get('path', fn) is called, we want to add route-specific middleware that
        // ensures that req.permitRequest has been set
        app[method] = function(path, originalRoute) {
            var routeSpecificMiddleware = [];
            var route = originalRoute;

            var argCount = arguments.length;
            if ( argCount > 2 ) {
                // we have other route-specific middleware
                routeSpecificMiddleware = Array.prototype.slice.call(arguments, 1, -1);
                route = arguments[argCount - 1];
            }

            routeSpecificMiddleware.push(secureMiddleware);
            var args = [path].concat(routeSpecificMiddleware).concat([route]);

            return originalRegistrationFn.apply(app, args);
        };
    });

    return app;
};

module.exports.allowAll = function(req, res, next) {
    req.permitRequest = true;
    return next();
};

var generateCsrfToken = function(sessionId, url) {
    if ( !sessionId ) {
        throw new Error('No session id provided');
    }

    if ( !url ) {
        throw new Error('No url provided');
    }

    var hmac = crypto.createHmac('sha1', module.exports.csrfProtector.SECRET + sessionId);
    hmac.update(url);
    return hmac.digest('base64');
};

module.exports.csrfProtector = function(app) {
    app.dynamicHelpers({csrf: function(req, res) { return generateCsrfToken.bind(null, req.sessionID); }});

    return function(req, res, next) {
        try {
            if ( module.exports.csrfProtector.ignoreMethods.indexOf(req.method) > -1 ) { 
                // skip this type of method
                return next(); 
            }

            // get the csrf token
            var csrfToken = req.body._csrf;
            if ( !csrfToken ) {
                return next(new Error('No csrf token received for request for url: [' + req.url + '], sessionID: [' + req.sessionID + ']'));
            }

            var expectedCsrfToken = generateCsrfToken(req.sessionID, req.url);

            if ( csrfToken != expectedCsrfToken ) {
                return next(new Error('Incorrect CSRF token for url: [' + req.url + '], sessionID: [' + req.sessionID + ']'));
            }

            return next();
        } catch ( e ) {
            next(e);
        };
    };
};

module.exports.csrfProtector.ignoreMethods = ['GET'];
module.exports.csrfProtector.SECRET = 'secret';
