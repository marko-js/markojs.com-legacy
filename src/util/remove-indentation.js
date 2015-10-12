module.exports = function(str) {
    var lines = str.split('\n');
    if (lines.length === 0) {
        return '';
    }

    var indentation = 0;
    var i;

    for (i = 0; i < lines.length; i++) {
    	var line = lines[i];
    	var lineIndentation = 0;
    	for (var j = 0; j < line.length; j++) {
    		if (line.charAt(j) === ' ') {
    			lineIndentation++;
    		} else {
    			break;
    		}
    	}

    	if (lineIndentation === line.length) {
            lines[i] = '';
        } else if ((indentation === 0) || (lineIndentation < indentation)) {
    		indentation = lineIndentation;
    	}
    }

    if (indentation) {
    	// remove all of the leading indentation
    	for (i = 0; i < lines.length; i++) {
    		lines[i] = lines[i].substring(indentation);
    	}
    }

    // Check for leading and trailing empty lines
    var begin = 0;
    var end = lines.length;

    if (lines[0].length === 0) {
        begin++;
    }

    if (lines[end - 1].length === 0) {
        end--;
    }

    // remove leading and trailing empty lines
    lines = lines.slice(begin, end);

    return lines.join('\n');
};