var template = require('./template.marko');

exports.tag = {
    attributes: {
        'disqus-shortname': 'string',
        'page-id': 'string',
        'page-title': 'string'
    }
};

module.exports = function render(input, context) {
    var vars = {
        disqus_shortname: input.disqusShortname,
        disqus_identifier: input.pageId,
        disqus_title: input.pageTitle
    };

    var varsCode = '';

    for (var varName in vars) {
        if (vars.hasOwnProperty(varName)) {
            var value = vars[varName];
            if (value) {
                varsCode += 'var ' + varName + ' = ' + JSON.stringify(value) + ';';
            }
        }
    }

    if (!input.disqusShortname) {
        throw new Error('disqusShortname is required');
    }

    template.render({
            varsCode: varsCode
        },
        context);
};