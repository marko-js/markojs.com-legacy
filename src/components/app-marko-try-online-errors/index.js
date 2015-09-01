var errorsTemplate = require('./errors-template.marko');

var appendHtml = require('src/util/dom-util').appendHtml;

var removeClass = require('dom-classes').remove;
var addClass = require('dom-classes').add;

require('./style.css');

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),

    getTemplateData: function() {
        return {};
    },

    setErrors: function(errors) {
        this.el.innerHTML = '';

        if (errors && errors.length) {
            this.addErrors(errors);
        } else {
            this._hasErrors = false;
            addClass(this.el, 'hidden');
        }
    },

    clearErrors: function() {
        this.setErrors(null);
    },

    hasErrors: function() {
        return this._hasErrors;
    },

    addErrors: function(errors) {
        if (errors && errors.length) {
            this._hasErrors = true;

            var html = errorsTemplate.renderSync(
                {
                    errors: errors
                });

            appendHtml(this.el, html);
            removeClass(this.el, 'hidden');
        }
    }
});