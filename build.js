require('./configure');

var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var loadRoutes = require('./routes').loadRoutes;

loadRoutes()
    .then(function(routes) {
        async.series(
            routes.map(function(route) {
                return function writeFile(callback) {
                    var type = route.type || 'html';
                    var outputFile;

                    if (type === 'html') {
                        outputFile = path.join(__dirname, 'build/' + route.path + '/index.html');
                    } else if (type === 'file' ){
                        outputFile = path.join(__dirname, 'build/' + route.path);
                    } else {
                        return callback(new Error('Invalid type: ' + route.type));
                    }

                    mkdirp.sync(path.dirname(outputFile));

                    console.log('Building ' + outputFile + '...');

                    var out = fs.createWriteStream(outputFile, { encoding: 'utf8' });

                    out.on('finish', callback)
                        .on('error', callback);

                    route.handler(
                        route.data,
                        out);
                };

            }),
            function (err) {

                if (err) {
                    throw err;
                }

                console.log('Build complete!');
            });
    })
    .catch(function(e) {
        console.log('An error has occurred:', (e.stack || e));
        process.nextTick(function() {
            throw e;
        });
    });



