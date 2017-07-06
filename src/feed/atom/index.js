module.exports = function(input, out) {
    var site = input.site;
    var feed = site.feed;

    var atomXml = feed.atom1();
    out.end(atomXml);
}
