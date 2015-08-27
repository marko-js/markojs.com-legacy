var loadBlogPosts = require('./loader-blog-posts').loadBlogPosts;

exports.loadBlog = function(postsDir, siteMetadata) {
    var blog = require('../blog-db').createBlog();

    // Load the authors
    var authors = siteMetadata.authors;
    if (authors) {
        Object.keys(authors).forEach(function(authorAlias) {
            var author = authors[authorAlias];
            author.alias = authorAlias;
            blog.addAuthor(author);
        });
    }

    blog.author = siteMetadata.author;

    return Promise.all([
            loadBlogPosts(blog, postsDir)
        ])
        .then(function() {
            return blog;
        });
};