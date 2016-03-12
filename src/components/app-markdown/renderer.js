var markdown = require('src/util/markdown');

module.exports = function(input, out) {
    var markdownSource = out.captureString(function() {
        input.renderBody(out);
    });

    var html = markdown.render(markdownSource);
    out.write(html);
};