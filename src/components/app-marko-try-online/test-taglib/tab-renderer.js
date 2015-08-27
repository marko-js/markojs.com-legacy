exports.render = function(input, out) {
    // Register with parent but don't render anything
    input.tabs.addTab(input);
};