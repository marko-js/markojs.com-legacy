var titleSummaryRegExp = /^\s*([^=\n]+)\s*[=]{4,}\s+([^]+?)(\n\{TOC\}|\n[#]|$)/i;
var titleBodyRegExp = /^\s*([^=\n]+)\s*[=]{3,}[=]+\s*([^=][^]*)\s*$/;

var frontMatter = require('front-matter');
var fs = require('fs');
var markdownRenderer = require('./markdown-renderer');

var linkRegExp = /\(([^\)]+)\)/g;

function processLinkMappings(markdown, linkMappings) {
    return markdown.replace(linkRegExp, function(match, path) {
        var targetPath = linkMappings[path];
        return '(' + (targetPath || path) + ')';
    });
}

exports.readFile = function(file, options) {
    var summaryHtml;
    var summaryMarkdown;

    options = options || {};

    var linkMappings = options.linkMappings;

    var markdown = fs.readFileSync(file, { encoding: 'utf8' });

    if (linkMappings) {
        markdown = processLinkMappings(markdown, linkMappings);
    }

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