var template = require('./template.marko');

module.exports = function(input, out) {
    var templateData = {
        site: input.site,
        blog: input.blog
    };

    template.render(input, out);
};