var Blog = require('./Blog');

exports.createBlog = function(data) {
    var blog = new Blog(data);
    return blog;
};