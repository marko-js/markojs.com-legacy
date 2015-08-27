require('./configure');

var path = require('path');
var express = require('express');
var serveStatic = require('serve-static');
var loadRoutes = require('./routes').loadRoutes;

// Create an Express app that we will use to register HTTP routes
// and middleware
var app = express();

var port = 8080; // HTTP port to listen on

// We will be writing static JS and CSS bundles into the
// "build/static" directory so use the Express static
// middleware to serve up those files for our app
app.use('/static', serveStatic(path.join(__dirname, 'build/static')));

loadRoutes()
    .then(function(routes) {
        // Register the HTTP routes declared in the ./routes.js file
        routes.forEach(function(route) {
            // We use HTTP GET for each route
            app.get(route.path, function(req, res) {
                // Invoke the route handler with the provided
                // template data and the HTTP response output stream
                route.handler(
                    route.data,
                    res);
            });
        });

        app.use('/', serveStatic(path.join(__dirname, 'src/static')));


        app.listen(port, function() {
            console.log('Listening on port %d', port);
            console.log('http://localhost:' + port + '/');

            if (process.send) {
                // The browser-refresh process launcher uses this information
                // to know when it is safe to refresh the browser pages
                // See: https://github.com/patrick-steele-idem/browser-refresh
                process.send('online');
            }
        });
    })
    .catch(function(e) {
        console.log('An error has occurred:', (e.stack || e));
        process.nextTick(function() {
            throw e;
        });
    });