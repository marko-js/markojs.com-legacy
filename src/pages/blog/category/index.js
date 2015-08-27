var template = require('./template.marko');
var viewUtil = require('src/util/view-util');

function dateComparator(a, b) {
    a = a.date.getTime();
    b = b.date.getTime();

    return a - b;
}

module.exports = function(input, out) {
    var site = input.site;
    var posts = input.category.posts.concat([]);
    posts.sort(dateComparator);

    template.render({
        category: input.category,
        site: site,
        posts: posts,
        util: viewUtil
    }, out);
};