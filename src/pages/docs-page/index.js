var template = require('./template.marko');
var markdown = require('src/util/markdown');
var extend = require('raptor-util/extend');

module.exports = function(input, out) {
    var markdownFile = input.markdownFile;
    var markdownData = markdown.readFile(markdownFile, {
        linkMappings: {
            './component-lifecycle.md': '/docs/marko-widgets/component-lifecycle'
        }
    });

    var frontMatter = markdownData.frontMatter;
    var project = input.project;
    var projectTitle = project === 'marko' ? 'Marko' : 'Marko Widgets';

    var lassoFlags = [];

    if (frontMatter && frontMatter.presentation) {
        lassoFlags.push('presentation');
    }
    var templateData = {
        site: input.site,
        blog: input.blog,
        html: markdownData.html,
        activeLink: input.project + '/' + input.name,
        projectTitle: projectTitle,
        lassoFlags: lassoFlags,
        githubUrl: input.githubUrl
    };

    extend(templateData, markdownData.frontMatter);

    template.render(templateData, out);
};