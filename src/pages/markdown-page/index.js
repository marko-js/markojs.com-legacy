var template = require('./template.marko');
var markdown = require('src/util/markdown');
var path = require('path');
var extend = require('raptor-util/extend');

module.exports = function(input, out) {
    var markdownFile = input.markdownFile;
    var pageName = path.basename(markdownFile).slice(0, -3);

    var packagePaths = [
        require.resolve('./browser.json')
    ];

    var markdownData = markdown.readFile(markdownFile);

    var templateData = {
        lassoCacheKey: markdownFile,
        packagePaths: packagePaths,
        pageName: pageName,
        site: input.site,
        blog: input.blog,
        html: markdownData.html,
        activeSection: input.activeSection
    };

    extend(templateData, markdownData.frontMatter);

    template.render(templateData, out);
};