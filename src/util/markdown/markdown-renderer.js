var marked = require('marked');
var markdownAnchorName = require('./markdown-anchor-name');
var markdownTOC = require('./markdown-toc');

marked.setOptions({
    highlight: require('src/util/highlight')
});

var tocRegExp = /^.*\{TOC\}.*$/im;


exports.render = function renderMarkdown(markdown) {

    markdown = markdown.replace(/http:\/\/markojs\.com\//g, '/');

    var markedRenderer = new marked.Renderer();
    markedRenderer.table = function(header, body) {
        var output = '<table class="markdown-table">';
        if (header) {
            output += '<thead>' + header + '</thead>';
        }

        if (body) {
            output += '<tbody>' + body + '</tbody>';
        }
        output += '</table>';
        return output;
    };

    var anchorNameGenerator = markdownAnchorName.create();

    var hasTOC = false;

    markdown = markdown.replace(/\{TOC\}/i, function(match) {
        hasTOC = true;
        return '{TOC}';
    });

    var toc;

    if (hasTOC) {
        toc = markdownTOC.create();
    }

    markedRenderer.heading = function(text, level) {
        var anchorName = anchorNameGenerator.anchorName(text);

        if (toc) {
            toc.addHeading(text, anchorName, level);
        }

        level++; // Page title is h1

        return '<h' + level + ' id="' + anchorName + '"><a name="' +
                        anchorName +
                         '" class="anchor" href="#' +
                         anchorName +
                         '"><span class="header-link"></span></a>' +
                          text + '</h' + level + '>';
    };

    var html = marked(markdown, {
        renderer: markedRenderer
    });

    if (hasTOC) {
        var tocHtml = toc.toHTML();
        html = html.replace(tocRegExp, tocHtml);
    }

    return html;
};