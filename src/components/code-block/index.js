var escapeXml = require('raptor-util/escapeXml');
var hljs = require('highlight.js');
var removeIndentation = require('src/util/remove-indentation');

exports.renderer = function (data, out) {
    if (!data.renderBody) {
        return;
    }

    var lang = data.lang;

    var body = out.captureString(function () {
        data.renderBody(out);
    });

    body = removeIndentation(body);

    if (data.wrap !== false) {
        out.write('<pre><code class="hljs">');
    }

    if (lang) {
        out.write(hljs.highlight(lang, body).value);
    } else {
        out.write(escapeXml(body));
    }

    if (data.wrap !== false) {
        out.write('</code></pre>');
    }
};
