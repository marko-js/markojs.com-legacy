var errorsTemplate = require('./errors-template.marko');

require('./style.css');

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),

    getTemplateData: function() {
        return {};
    },

    setErrors: function(errors) {
        this.$().empty();

        if (errors && errors.length) {
            this.addErrors(errors);
        } else {
            this._hasErrors = false;
            this.$().hide();
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


            this.$().append(html);
            this.$().show();
        }
    }
});