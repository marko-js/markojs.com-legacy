/*
Original Source: https://github.com/thlorenz/anchor-markdown-header
 */


function nameFromHeader(text) {
    return text.toLowerCase().replace(/ /g,'-').replace(/[\/?:\[\]`.,()*"';{}+]/g,'');
}


var modes = {
    github: function(text, repetitionFunc) {
        var anchorName = nameFromHeader(text);
        var repetition = repetitionFunc(anchorName);
        if (repetition) {
            anchorName += '-' + repetition;
        }

        return anchorName;
    },

    bitbucket: function(text, repetitionFunc) {
        var anchorName = 'markdown-header-' + nameFromHeader(text);
        var repetition = repetitionFunc(anchorName);
        if (repetition) {
            anchorName += '_' + repetition;
        }
        return anchorName;
    }
};

exports.create = function(mode) {
    mode = mode || 'github';
    var repetitionByAnchorName = {};

    function repetitionFunc(anchorName) {
        return repetitionByAnchorName[anchorName] != null ?
                ++repetitionByAnchorName[anchorName] :
                (repetitionByAnchorName[anchorName] = 0);
    }

    var modeFunc = modes[mode];

    return {
        anchorName: function(header) {
            return modeFunc(header, repetitionFunc);
        }
    };
};