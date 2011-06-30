var express = require('express');

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
