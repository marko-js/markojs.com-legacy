var Collection = require('./Collection');

function Category(name, title) {
    this.name = name;
    this._posts = new Collection();
    this.title = title || name;
}

Category.prototype = {
    addPost: function(post) {
        this._posts.add(post.name, post);
    },
    getPostCount: function() {
        return this._posts.length;
    },
    get posts() {
        return this._posts.all;
    }
};

module.exports = Category;