var template = require('./template.marko');

exports.tag = {
    attributes: {
        'tracking-id': 'string',
        'domain': 'string'
    }
};

module.exports = function render(input, context) {
    if (input.trackingId && input.domain) {
        template.render(
            input,
            context);
    }
};