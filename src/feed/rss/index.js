module.exports = function(input, out) {
    var site = input.site;
    var feed = site.feed;

    var rssXml = feed.rss2();
    out.end(rssXml);
};
