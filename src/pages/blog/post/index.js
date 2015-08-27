var template = require('./template.marko');
var viewUtil = require('src/util/view-util');

module.exports = function(input, out) {
    template.render({
        post: input.post,
        blog: input.blog,
        site: input.site,
        util: viewUtil
    }, out);
};