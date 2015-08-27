var templatePath = require.resolve('./tabs.marko');
var template = require('marko').load(templatePath);

exports.render = function(input, out) {
    var nestedTabs;

    if (input.getTabs) {
        nestedTabs = [];
        // Invoke the body function to discover nested <ui-tab> tags
        input.getTabs({ // Invoke the body with the scoped "tabs" variable
            addTab: function(tab) {
                tab.id = tab.id || ("tab" + nestedTabs.length);
                nestedTabs.push(tab);
            }
        });
    } else {
        nestedTabs = input.tabs || [];
    }

    // Now render the markup for the tabs:
    template.render({
        tabs: nestedTabs
    }, out);
};