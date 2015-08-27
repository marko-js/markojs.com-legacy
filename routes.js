var siteLoader = require('./src/util/site-loader');
var nodePath = require('path');

exports.loadRoutes = function() {
    return siteLoader.loadSite(__dirname)
        .then(function(site) {
            var routes = [];

            function addPage(path, handler) {
                routes.push({
                    handler: handler,
                    path: path,
                    data: {
                        blog: blog,
                        site: site
                    }
                });
            }

            function addMarkdownPage(path, markdownFile) {
                routes.push({
                    handler: require('./src/pages/markdown-page'),
                    path: path,
                    data: {
                        blog: blog,
                        site: site,
                        markdownFile: markdownFile
                    }
                });
            }

            function addDocsPage(path, project, name) {
                routes.push({
                    handler: require('./src/pages/docs-page'),
                    path: path,
                    data: {
                        blog: blog,
                        site: site,
                        project: project,
                        name: name,
                        markdownFile: nodePath.join(__dirname, '../' + project + '/docs/' + name + '.md')
                    }
                });
            }

            // addPage('/docs', require('./src/pages/docs'));
            addMarkdownPage('/community', require.resolve('./src/pages/community.md'));
            addMarkdownPage('/github', require.resolve('./src/pages/github.md'));

            addDocsPage('/docs/', 'marko', 'overview');
            addDocsPage('/docs/marko/get-started', 'marko', 'get-started');
            addDocsPage('/docs/marko/javascript-api', 'marko', 'javascript-api');
            addDocsPage('/docs/marko/language-guide', 'marko', 'language-guide');
            addDocsPage('/docs/marko/custom-taglibs', 'marko', 'custom-taglibs');
            addDocsPage('/docs/marko/faq', 'marko', 'faq');
            addDocsPage('/docs/marko/additional-resources', 'marko', 'additional-resources');

            addDocsPage('/docs/marko-widgets', 'marko-widgets', 'overview');
            addDocsPage('/docs/marko-widgets/get-started', 'marko-widgets', 'get-started');
            addDocsPage('/docs/marko-widgets/javascript-api', 'marko-widgets', 'javascript-api');
            addDocsPage('/docs/marko-widgets/faq', 'marko-widgets', 'faq');
            addDocsPage('/docs/marko-widgets/additional-resources', 'marko-widgets', 'additional-resources');

            addPage('/try-online', require('./src/pages/marko-try-online'));
            addPage('/', require('./src/pages/home'));

            var blog = site.blog;
            var posts = blog.getAllPosts();
            posts.forEach(function(post) {
                routes.push({
                    handler: require('./src/pages/blog/post'),
                    path: site.postRoute(post),
                    data: {
                        post: post,
                        blog: blog,
                        site: site
                    }
                });
            });

            var categories = blog.getAllCategories();
            categories.forEach(function(category) {
                routes.push({
                    handler: require('./src/pages/blog/category'),
                    path: site.postCategoryRoute(category),
                    data: {
                        category: category,
                        blog: blog,
                        site: site
                    }
                });
            });

            routes.push({
                handler: require('./src/pages/blog/index'),
                path: '/blog',
                data: {
                    blog: blog,
                    site: site
                }
            });

            routes.push({
                handler: require('./src/pages/blog/archive'),
                path: '/blog/archive',
                data: {
                    blog: blog,
                    site: site
                }
            });

            routes.push({
                handler: require('./src/pages/blog/subscribe'),
                path: '/blog/subscribe',
                data: {
                    blog: blog,
                    site: site
                }
            });

            routes.push({
                handler: require('./src/feed/rss'),
                path: '/rss.xml',
                type: 'file',
                data: {
                    blog: blog,
                    site: site
                }
            });

            routes.push({
                handler: require('./src/feed/atom'),
                path: '/atom.xml',
                type: 'file',
                data: {
                    blog: blog,
                    site: site
                }
            });

            return routes;
        });
};