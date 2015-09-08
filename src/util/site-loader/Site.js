var extend = require('raptor-util/extend');
var safeFilename = require('../safeFilename');
var Feed = require('feed');

function Site(metadata) {
    extend(this, metadata);
    this.blog = null;
    this._feed = null;
}

Site.prototype = {
    postCategoryRoute: function(category) {
        return '/blog/category/' + safeFilename(category.name.toLowerCase());
    },
    postRoute: function(post) {
        return '/blog/' + post.name;
    },

    postCategoryUrl: function(category) {
        return this.postCategoryRoute(category) + '/';
    },
    postUrl: function(post) {
        return this.postRoute(post) + '/';
    },
    staticResourceUrl: function(path) {
        return path + '/';
    },
    feedUrl: function() {
        return '/rss.xml';
    },
    indexUrl: function() {
        return '/';
    },
    get feed() {
        if (!this._feed) {
            this._feed = this._createFeed();
        }
        return this._feed;
    },
    _createFeed: function() {
        var site = this;
        var feed = new Feed({
                title: this.title,
                description: this.description,
                link: this.url,
                image: this.feedImage,
                copyright: this.copyright,
                author: this.author
            });

        var feedUrl = this.url;
        if (feedUrl.endsWith('/')) {
            feedUrl = feedUrl.slice(0, -1);
        }

        function feedAddPost(post) {
            var description = post.summaryHtml;

            var postUrl = feedUrl + site.postUrl(post);

            if (post.rssSummarize !== false) {
                description = post.summaryHtml + '<p><a href="' + postUrl + '">Continue Reading on ' + site.url + ' &raquo;</a></p>';
            }

            description = description || post.html;

            var authors = post.authors || post.author;
            var contributors = post.contributors || post.contributor;

            if (contributors) {
                if (!Array.isArray(contributors)) {
                    contributors = [contributors];
                }
            }

            feed.addItem({
                title: post.title,
                link: postUrl,
                description: description,
                author: Array.isArray(authors) ? authors : [authors],
                contributor: contributors,
                date: post.date,
                image: post.image
            });
        }

        this.blog.getAllPosts().forEach(feedAddPost);

        return feed;
    }
};

module.exports = Site;