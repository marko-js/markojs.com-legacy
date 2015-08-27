module.exports = function paginate(pageSize, comparator) {
    var data = this.all.concat([]);

    if (comparator) {
        data.sort(comparator);
    }

    var pageCount = Math.ceil(data.size / pageSize);
    var pages = new Array(pageCount);
    var start = 0;
    var end = pageSize;

    var i = 0;

    while (start < data.length) {
        if (end > data.length) {
            end = data.length;
        }

        var pageData = data.slice(start, end);
        var pageIndex = i++;

        pages[pageIndex] = {
            data: data.slice(start, end),
            index: pageIndex,
            hasNext: pageIndex < pageCount-1,
            hasPrev: pageIndex > 0
        };
    }

    return  pages;
};