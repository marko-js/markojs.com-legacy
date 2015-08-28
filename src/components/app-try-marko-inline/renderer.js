var nodePath = require('path');
var fs = require('fs');

module.exports = require('marko-widgets').defineRenderer({
    template: require('./template.marko'),

    getTemplateData: function(state, input) {
        var dirname = input.__dirname;
        var path = input.path;
        var dir = nodePath.resolve(dirname, path);

        var dataFile = nodePath.join(dir, 'data.js');
        var dataCode = fs.readFileSync(dataFile, { encoding: 'utf8' });

        var templateFile = nodePath.join(dir, 'template.marko');
        var templateCode = fs.readFileSync(templateFile, { encoding: 'utf8' });

        return {
            dataCode: dataCode,
            templateCode: templateCode
        };
    }
});