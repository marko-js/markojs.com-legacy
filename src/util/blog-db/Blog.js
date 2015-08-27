var Post = require('./Post');
var Author = require('./Author');
var Category = require('./Category');
var Collection = require('./Collection');

function dateComparatorDescending(a, b) {
    a = a.date.getTime();
    b = b.date.getTime();

    return b - a;
}

function categoryComparator(a, b) {
    a = a.title;
    b = b.title;
    return a < b ? -1 : (a === b ? 0 : 1);
}

function Blog() {
    this._posts = new Collection();
    this._categories = new Collection();
    this._authors = new Collection();
    this._author = null;
}

Blog.prototype = {
    author: {
        get: function() {
            var author = this._author;
            if (typeof author === 'string') {
                return this.getAuthor(author);
            }

            return author;
        },
        set: function(value) {
            this._author = value;
        }
    },
    getAuthor: function(authorAlias) {
        if (typeof authorAlias === 'string') {
            var author = this._authors.byId[authorAlias];
            if (!author) {
                throw new Error('Invalid author: ' + authorAlias);
            }
            return author;
        } else {
            return authorAlias;
        }

    },
    addPost: function(postData) {

        var categoryNames = postData.categories;

        var post = new Post(postData);
        post.setBlog(this);

        var authorAlias = postData.author;
        if (authorAlias) {
            post.author = this._authors.byId[authorAlias];
            if (!post.author) {
                throw new Error('Invalid author for post: ', postData.author);
            }
        }

        if (!post.author) {
            throw new Error('Invalid author of "' + postData.author + '" for post: ' + post.name);
        }

        this._posts.add(post.name, post);


        if (categoryNames) {
            categoryNames.forEach(function(categoryName) {
                var category = this._getOrCreateCategory(categoryName);
                category.addPost(post);
            }.bind(this));
        }
    },

    addAuthor: function(authorData) {
        this._authors.add(authorData.alias, authorData);
        if (authorData.email) {
            this._authors.add(authorData.email, authorData);
        }
    },

    getCategory: function(categoryName) {
        return this._categories.byId[categoryName];
    },

    _getOrCreateCategory: function(categoryName) {
        var category = this._categories.byId[categoryName];
        if (!category) {
            category = new Category(categoryName);
            this._categories.add(category.name, category);
        }

        return category;
    },

    getAllPosts: function() {
        var allPosts = this._posts.all.map(function(post) {
            return post.clone();
        });

        allPosts.sort(dateComparatorDescending);

        for (var i=0; i<allPosts.length; i++) {
            var post = allPosts[i];
            post.nextOlderPost = allPosts[i+1];
            post.nextNewerPost = allPosts[i-1];
        }

        return allPosts;
    },

    getAllCategories: function() {
        var categories = this._categories.all.map(function(category) {
                return {
                    name: category.name,
                    title: category.name,
                    postCount: category.posts.length,
                    posts: category.posts
                };
            });
        categories.sort(categoryComparator);
        return categories;
    }
};

module.exports = Blog;