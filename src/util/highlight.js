var hljs = require('highlight.js');

module.exports = function(code, lang) {
    if (lang) {
        return hljs.highlight(lang, code).value;
    } else {
        return hljs.highlightAuto(code).value;
    }
};