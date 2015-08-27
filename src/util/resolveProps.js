var shortstop = require('shortstop');
var nodePath = require('path');
var renderMarkdown = require('./markdown').render;
var fs = require('fs');

module.exports = function resolveProps(o, options) {
    return new Promise(function(resolve, reject) {
        options = options || {};
        var dirname = options.dirname || process.cwd();

        var resolver = shortstop.create();

        resolver.use('path', function resolve(value) {
            return nodePath.resolve(dirname, value);
        });

        resolver.use('markdown', function resolve(value) {
            var path = nodePath.resolve(dirname, value);
            var markdown = fs.readFileSync(path, 'utf8');
            return renderMarkdown(markdown);
        });

        resolver.resolve(o, function (err, o) {
            if (err) {
                return reject(err);
            }

            resolve(o);
        });
    });
};