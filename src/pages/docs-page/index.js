var template = require('./template.marko');
var markdown = require('src/util/markdown');
var extend = require('raptor-util/extend');

module.exports = function(input, out) {
    var markdownFile = input.markdownFile;
    var markdownData = markdown.readFile(markdownFile);
    var project = input.project;
    var projectTitle = project === 'marko' ? 'Marko' : 'Marko Widgets';

    var templateData = {
        site: input.site,
        blog: input.blog,
        html: markdownData.html,
        activeLink: input.project + '/' + input.name,
        projectTitle: projectTitle
    };

    extend(templateData, markdownData.frontMatter);

    template.render(templateData, out);
};