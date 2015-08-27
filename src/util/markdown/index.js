var titleSummaryRegExp = /^\s*([^=\n]+)\s*[=]{4,}\s+([^]+?)(\n\{TOC\}|\n[#]|$)/i;
var titleBodyRegExp = /^\s*([^=\n]+)\s*[=]{3,}[=]+\s*([^=][^]*)\s*$/;

var frontMatter = require('front-matter');
var fs = require('fs');
var markdownRenderer = require('./markdown-renderer');

exports.readFile = function(file) {
    var summaryHtml;
    var summaryMarkdown;

    var markdown = fs.readFileSync(file, { encoding: 'utf8' });

    var fm = frontMatter(markdown);
    var attributes = fm.attributes || {};

    var titleSummaryMatches = titleSummaryRegExp.exec(fm.body);

    if (titleSummaryMatches) {
        attributes.title = attributes.title || titleSummaryMatches[1];
        if (titleSummaryMatches[2]) {
            summaryMarkdown = titleSummaryMatches[2];
            summaryHtml = markdownRenderer.render(titleSummaryMatches[2].trim());
        }
    }

    var bodyHtml;

    var titleBodyMatches = titleBodyRegExp.exec(fm.body);
    if (titleBodyMatches) {
        var body = titleBodyMatches[2] || '';
        bodyHtml = markdownRenderer.render(body);
    }

    return {
        html: bodyHtml,
        summaryHtml: summaryHtml,
        frontMatter: attributes
    };
};

exports.render = function renderMarkdown(markdown) {
    return markdownRenderer.render(markdown);
};