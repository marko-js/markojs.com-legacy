var template = require('./template.marko');
var viewUtil = require('src/util/view-util');

module.exports = function(input, out) {
    var blog = input.blog;
    var posts = blog.getAllPosts();

    template.render({
        site: input.site,
        blog: input.blog,
        posts: posts,
        util: viewUtil
    }, out);
};