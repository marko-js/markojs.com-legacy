var siteLoader = require('./src/util/site-loader');
var nodePath = require('path');
var fs = require('fs');

var docsDirs = {
    'marko': nodePath.join(nodePath.dirname(require.resolve('marko/README.md')), 'docs'),
    'marko-widgets': nodePath.join(nodePath.dirname(require.resolve('marko-widgets/README.md')), 'docs')
};

function checkDocs() {
    Object.keys(docsDirs).forEach(function(project) {
        var dir = docsDirs[project];

        if (!fs.existsSync(dir)) {
            throw new Error('Docs dir not found at path "' + nodePath.relative(process.cwd(), dir) + '". Did you forget to run `npm link ' + project + '`');
        }
    });
}

checkDocs();

exports.loadRoutes = function() {
    return siteLoader.loadSite(__dirname)
        .then(function(site) {
            var blog = site.blog;

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

            function addMarkdownPage(path, markdownFile, options) {
                options = options || {};

                routes.push({
                    handler: require('./src/pages/markdown-page'),
                    path: path,
                    data: {
                        blog: blog,
                        site: site,
                        markdownFile: markdownFile,
                        activeSection: options.activeSection
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
                        markdownFile: nodePath.join(docsDirs[project], name + '.md'),
                        githubUrl: 'https://github.com/marko-js/' + project + '/blob/master/docs/' + name + '.md'
                    }
                });
            }

            // addPage('/docs', require('./src/pages/docs'));
            addMarkdownPage('/community', require.resolve('./src/pages/community.md'), { activeSection: 'community' });
            addMarkdownPage('/github', require.resolve('./src/pages/github.md'), { activeSection: 'github' });

            // addMarkdownPage('/marko-v3-draft', require.resolve('./src/blog-posts/published/2016-03-16-marko-v3.md'), { activeSection: 'github' });


            addDocsPage('/docs/', 'marko', 'overview');
            addDocsPage('/docs/marko/get-started', 'marko', 'get-started');
            addDocsPage('/docs/marko/javascript-api', 'marko', 'javascript-api');
            addDocsPage('/docs/marko/language-guide', 'marko', 'language-guide');
            addDocsPage('/docs/marko/custom-taglibs', 'marko', 'custom-taglibs');
            addDocsPage('/docs/marko/compiler', 'marko', 'compiler');
            addDocsPage('/docs/marko/faq', 'marko', 'faq');
            addDocsPage('/docs/marko/additional-resources', 'marko', 'additional-resources');
            addDocsPage('/docs/marko/async-taglib', 'marko', 'async-taglib');
            addDocsPage('/docs/marko/layout-taglib', 'marko', 'layout-taglib');
            addDocsPage('/docs/marko/what-is-new-marko-v3', 'marko', 'what-is-new-marko-v3');
            addDocsPage('/docs/marko/marko-v3-presentation', 'marko', 'marko-v3-presentation');
            addDocsPage('/docs/marko/hapi', 'marko', 'hapi-marko');
            addDocsPage('/docs/marko/koa', 'marko', 'koa-marko');
            addDocsPage('/docs/marko/express', 'marko', 'express-marko');

            addDocsPage('/docs/marko-widgets', 'marko-widgets', 'overview');
            addDocsPage('/docs/marko-widgets/get-started', 'marko-widgets', 'get-started');
            addDocsPage('/docs/marko-widgets/component-lifecycle', 'marko-widgets', 'component-lifecycle');
            addDocsPage('/docs/marko-widgets/javascript-api', 'marko-widgets', 'javascript-api');
            addDocsPage('/docs/marko-widgets/faq', 'marko-widgets', 'faq');
            addDocsPage('/docs/marko-widgets/additional-resources', 'marko-widgets', 'additional-resources');



            addPage('/try-online', require('./src/pages/marko-try-online'));
            addPage('/marko-widgets/try-online', require('./src/pages/marko-widgets-try-online'));
            addPage('/', require('./src/pages/home'));

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