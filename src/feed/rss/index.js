module.exports = function(input, out) {
    var site = input.site;
    var feed = site.feed;

    var rssXml = feed.render('rss-2.0');
    out.end(rssXml);
};