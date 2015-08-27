require('raptor-polyfill/string/endsWith');
var fs = require('fs');
var path = require('path');
var publishedRegExp = /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})-(.+?)\.md$/i;
var markdown = require('../markdown');
var extend = require('raptor-util/extend');
var assert = require('assert');

exports.loadBlogPosts = function(blog, postsDir) {

    function preprocessPost(markdownFile, postData) {
        assert.equal(typeof markdownFile, 'string');
        assert.ok(postData);

        var markdownInfo = markdown.readFile(markdownFile);
        extend(postData, markdownInfo.frontMatter);

        var author = postData.author;
        if (author) {
            postData.author = blog.getAuthor(author);
        } else {
            postData.author = blog.author;
        }

        postData.html = markdownInfo.html;
        postData.summaryHtml = markdownInfo.summaryHtml;
    }

    function loadDrafts() {
        return new Promise(function(resolve, reject) {

            if (process.env.NODE_ENV === 'production') {
                return resolve();
            }

            var draftsDir = path.join(postsDir, 'drafts');
            fs.readdirSync(draftsDir).forEach(function(filename) {
                if (!filename.toLowerCase().endsWith('.md')) {
                    return;
                }

                var postName = filename.slice(0, -3);
                var markdownFile = path.join(draftsDir, filename);

                var postData = {
                    name: postName,
                    markdownFile: markdownFile,
                    status: 'draft'
                };

                preprocessPost(markdownFile, postData);

                blog.addPost(postData);
            });

            resolve();
        });
    }

    function loadPublished() {
        return new Promise(function(resolve, reject) {
            var publishedDir = path.join(postsDir, 'published');
            fs.readdirSync(publishedDir).forEach(function(filename) {
                if (!filename.toLowerCase().endsWith('.md')) {
                    return;
                }

                var matches = publishedRegExp.exec(filename);
                if (!matches) {
                    return;
                }

                var year = parseInt(matches[1], 10);
                var month = parseInt(matches[2], 10);
                var day = parseInt(matches[3], 10);
                var date = new Date(year, month-1, day);

                var postName = matches[4];

                var markdownFile = path.join(publishedDir, filename);

                var postData = {
                    name: postName,
                    markdownFile: markdownFile,
                    date: date,
                    status: 'published'
                };

                preprocessPost(markdownFile, postData);

                blog.addPost(postData);
            });

            resolve();
        });
    }

    return Promise.all([
        loadDrafts(),
        loadPublished()
    ]);

};