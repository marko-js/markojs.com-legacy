var path = require('path');
var loaderBlog = require('./loader-blog');
var Site = require('./Site');
var resolveProps = require('../resolveProps');

exports.loadSite = function(rootDir) {
    var siteMetadataFile = path.join(rootDir, 'site.json');
    var siteMetadata = require(siteMetadataFile);

    return resolveProps(siteMetadata)
        .then(function(siteMetadata) {
            var site = new Site(siteMetadata);

            var postsDir = path.join(rootDir, 'src/blog-posts');

            return loaderBlog.loadBlog(postsDir, siteMetadata)
                .then(function(blog) {
                    site.blog = blog;
                    return site;
                });
        });

};