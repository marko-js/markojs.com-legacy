var template = require('marko').load(require.resolve('./button.marko'));

module.exports = function(input, out) {
    var attrs = {};

    if (input.color) {
        attrs.style = 'background-color: ' + input.color + ';';
    }

    var viewModel = {
        label: input.label,
        attrs: attrs,
        renderBody: input.renderBody,
        disabled: input.disabled === true
    };

    template.render(viewModel, out);
};