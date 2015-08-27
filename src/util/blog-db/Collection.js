var util = require('util');

var paginate = require('./paginate');
function Collection() {
    this.all = [];
    this.byId = {};
}

Collection.prototype = {
    add: function(id, o) {
        if (!id) {
            throw new Error('"id" is null for ' + util.inspect(o));
        }
        if (this.byId.hasOwnProperty(id)) {
            throw new Error('Already exists: ' + id);
        }

        this.byId[id] = o;
        this.all.push(o);
    },

    paginate: function(pageSize, comparator) {
        return paginate(pageSize, comparator);
    },

    get length() {
        return this.all.length;
    }
};

module.exports = Collection;
