var extend = require('raptor-util/extend');
var assert = require('assert');

function Post(postData) {
    var author = postData.author;
    delete postData.author;

    var categoryNames = postData.categories;
    delete postData.categories;
    this._categoryNames = categoryNames || [];

    this._categories = undefined;

    extend(this, postData);

    if (!this.date) {
        this.date = new Date();
    }

    this._author = author;

    if (!this.title) {
        this.title = this.name;
    }

    assert.ok(this.name, 'name is required');
}

Post.prototype = {
    setBlog: function(blog) {
        Object.defineProperty(this, 'blog', {
            value: blog,
            enumerable: false
        });
    },
    get author() {
        return this.blog.getAuthor(this._author) || this.blog.author;
    },
    clone: function() {
        var clone = new Post(this);
        clone.setBlog(this.blog);
        return clone;
    },

    get categories() {
        if (!this._categories) {
            var blog = this.blog;

            this._categories = this._categoryNames.map(function(categoryName) {
                return blog.getCategory(categoryName);
            })
        }

        return this._categories;
    }
};

module.exports = Post;