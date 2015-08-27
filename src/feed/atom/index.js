module.exports = function(input, out) {
    var site = input.site;
    var feed = site.feed;

    var atomXml = feed.render('atom-1.0');
    out.end(atomXml);
}