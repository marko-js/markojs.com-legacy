module.exports = function safeFilename(str) {
    return str.replace(/[^A-Za-z0-9_]+/g, '-');
}