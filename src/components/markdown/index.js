var markdownRenderer = require('src/util/markdown/markdown-renderer').render;

var removeIndentation = require('src/util/remove-indentation');

exports.renderer = function(input, out) {
    var body = out.captureString(function () {
        input.renderBody(out);
    });

	body = removeIndentation(body);

    out.write(markdownRenderer(body));
};
