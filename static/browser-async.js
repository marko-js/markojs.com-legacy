$rmod.main("/marko@2.7.28/compiler", "marko-compiler");
$rmod.def("/marko@2.7.28/taglibs/caching/cached-fragment-tag", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';
var raptorCache;
var defaultCacheManager;
var req = require; // Fool the optimizer

var caches = {};

function createCache() {
    var cache = {};

    return {
        get: function(cacheKey, options, callback) {
            var value = cache[cacheKey];
            if (value !== undefined) {
                return callback(null, value);
            }

            var builder = options.builder;
            builder(function(err, value) {
                if (err) {
                    return callback(err);
                }

                if (value === undefined) {
                    value = null;
                }

                cache[cacheKey] = value;

                callback(null, value);
            });
        }
    };
}

var defaultCacheManager = {
    getCache: function(cacheName) {
        return caches[cacheName] || (caches[cacheName] = createCache());
    }
};

module.exports = {
    render: function (input, out) {
        if (raptorCache === undefined) {
            try {
                raptorCache = req('raptor-cache');
                defaultCacheManager = raptorCache.createCacheManager({
                    profiles: {
                        '*': {
                            'marko/cached-fragment': {
                                store: 'memory',
                                encoding: 'utf8'
                            }
                        }
                    }
                });
            }
            catch(e) {}
        }

        var cacheKey = input.cacheKey;
        if (!cacheKey) {
            throw new Error('cache-key is required for <cached-fragment>');
        }

        var cacheManager = input.cacheManager || defaultCacheManager;

        var cache = cacheManager.getCache(input.cacheName || 'marko/cached-fragment');

        var asyncContext = out.beginAsync();

        cache.get(cacheKey,
            {
                builder: function(callback) {
                    var result = out.captureString(function () {
                        if (input.renderBody) {
                            input.renderBody(out);
                        }
                    });
                    callback(null, result);
                }
            }, function(err, result) {
                if (err) {
                    return asyncContext.error(err);
                }

                asyncContext.end(result);
            });
    }
};

});
$rmod.def("/marko@2.7.28/taglibs/core/AssignNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
// var varNameRegExp = /^[A-Za-z_][A-Za-z0-9_\.]*$/;
function AssignNode(props) {
    AssignNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
AssignNode.prototype = {
    doGenerateCode: function (template) {
        var varName = this.getProperty('var');
        var value = this.getProperty('value');
        if (!varName) {
            this.addError('"var" attribute is required');
        }
        if (!value) {
            this.addError('"value" attribute is required');
        }
        if (varName) {
            template.statement(varName + '=' + value + ';');
        }
    }
};

module.exports = AssignNode;

});
$rmod.def("/marko@2.7.28/taglibs/core/DefNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var funcDefRegExp = /^([A-Za-z_][A-Za-z0-9_]*)(?:\(((?:[A-Za-z_][A-Za-z0-9_]*,\s*)*[A-Za-z_][A-Za-z0-9_]*)?\))?$/;
function DefNode(props) {
    DefNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
DefNode.prototype = {
    doGenerateCode: function (template) {
        var func = this.getProperty('function');
        if (!func) {
            this.addError('"function" attribute is required');
            this.generateCodeForChildren(template);
            return;
        }
        func = func.trim();
        var matches = funcDefRegExp.exec(func);
        if (matches) {
            var name = matches[1];
            var params = matches[2] ? matches[2].split(/\s*,\s*/) : [];
            var definedFunctions = template.getAttribute('core:definedFunctions');
            if (!definedFunctions) {
                definedFunctions = template.setAttribute('core:definedFunctions', {});
            }
            definedFunctions[name] = {
                params: params,
                bodyParam: this.getProperty('bodyParam')
            };
        } else {
            this.addError('Invalid function name of "' + func + '"');
            this.generateCodeForChildren(template);
            return;
        }

        if (func.indexOf('(') === -1) {
            func += '()';
        }

        template.statement('function ' + func + ' {').indent(function () {
            template.line('return __helpers.c(out, function() {').indent(function () {
                this.generateCodeForChildren(template);
            }, this).line('});');
        }, this).line('}');
    }
};

module.exports = DefNode;

});
$rmod.def("/marko@2.7.28/taglibs/core/ElseIfNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function ElseIfNode(props) {
    ElseIfNode.$super.call(this, 'else-if');
    if (props) {
        this.setProperties(props);
    }
}
ElseIfNode.nodeType = 'element';

ElseIfNode.prototype = {
    doGenerateCode: function (template) {
        var test = this.getProperty('test');
        if (!test) {
            this.addError('"test" attribute is required');
            return;
        }
        template.line('else if (' + test + ') {').indent(function () {
            this.generateCodeForChildren(template);
        }, this).line('}');
    }
};

module.exports = ElseIfNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/ElseNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function ElseNode(props) {
    ElseNode.$super.call(this, 'else');
    if (props) {
        this.setProperties(props);
    }
}

ElseNode.nodeType = 'element';

ElseNode.prototype = {
    doGenerateCode: function (template) {
        if (this.valid == null) {
            return;    //Don't generate code for an invalid else
        }
        template.line('else {').indent(function () {
            this.generateCodeForChildren(template);
        }, this).line('}');
    }
};

module.exports = ElseNode;
});
$rmod.main("/raptor-strings@1.0.2", "lib/raptor-strings");
$rmod.dep("/$/marko", "raptor-strings", "1.0.2");
$rmod.dep("/$/marko", "raptor-polyfill", "1.0.2");
$rmod.def("/raptor-polyfill@1.0.2/string/startsWith", function(require, exports, module, __filename, __dirname) { if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(prefix, position) {
        var str = this;
        
        if (position) {
            str = str.substring(position);
        }
        
        if (str.length < prefix.length) {
            return false;
        }
        
        return str.substring(0, prefix.length) == prefix;
    };
}
});
$rmod.def("/raptor-strings@1.0.2/lib/StringBuilder", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


    
/**
 * Used to build a string by using an array of strings as a buffer.
 * When it is ready to be converted to a string the array elements
 * are joined together with an empty space.
 * 
 * @constructs
 * @constructor Initializes an empty StringBuilder
 * @class
 */
function StringBuilder() {
    /**
     * @type Array
     */
    this.array = [];
    /**
     * The length of the string
     * @type Number
     */
    this.length = 0;

}

StringBuilder.prototype = {
        /**
         * Appends a string to the string being constructed.
         * 
         * @param {Object} obj The string or object to append
         * @returns {raptor/strings/StringBuilder} Returns itself
         */
        append: function(obj)
        {
            if (typeof obj !== 'string') {
                obj = obj.toString();
            }
            this.array.push(obj);
            this.length += obj.length;
            
            return this;
        },
        
        /**
         * Converts the string buffer into a String.
         * 
         * @returns {String} The built String
         */
        toString: function()
        {
            return this.array.join('');
        },
        
        /**
         * Clears the string
         * 
         * @returns {raptor/strings/StringBuilder} Returns itself
         */
        clear: function()
        {
            this.array = [];
            this.length = 0;
            return this;
        }
};

StringBuilder.prototype.write = StringBuilder.prototype.append;

module.exports = StringBuilder;
});
$rmod.def("/raptor-strings@1.0.2/lib/raptor-strings", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('/$/marko/$/raptor-polyfill/string/startsWith'/*'raptor-polyfill/string/startsWith'*/);
require('/$/marko/$/raptor-polyfill/string/endsWith'/*'raptor-polyfill/string/endsWith'*/);

var EMPTY_STRING = '';
function trim(s){
    return s ? s.trim() : EMPTY_STRING;
}
var StringBuilder = require('./StringBuilder');
var varRegExp = /\$\{([A-Za-z0-9_\.]+)\}/g;

module.exports = {

    compare: function(s1, s2)
    {
        return s1 < s2 ? -1 : (s1 > s2 ? 1 : 0);
    },

    /**
     * @param {string} s The string to operate on
     * @return {boolean} Returns true if the string is null or only consists of whitespace
     *
     * @static
     */
    isEmpty: function(s)
    {
        return s == null || trim(s).length === 0;
    },

    /**
     * @param {string} s The string to operate on
     * @return {integer} Returns the length of the string or 0 if the string is null
     *
     * @static
     */
    length: function(s)
    {
        return s == null ? 0 : s.length;
    },

    /**
     * @param {object} o The object to test
     * @return {boolean} Returns true if the object is a string, false otherwise.
     *
     * @static
     */
    isString: function(s) {
        return typeof s === 'string';
    },

    /**
     * Tests if two strings are equal
     *
     * @param s1 {string} The first string to compare
     * @param s2 {string} The second string to compare
     * @param shouldTrim {boolean} If true the string is trimmed, otherwise the string is not trimmed (optional, defualts to true)
     * @return {boolean} Returns true if the strings are equal, false otherwise
     *
     * @static
     */
    equals: function(s1, s2, shouldTrim)
    {
        if (shouldTrim !== false)
        {
            s1 = trim(s1);
            s2 = trim(s2);
        }
        return s1 == s2;
    },

    /**
     * Tests if two strings are not equal
     *
     * @param s1 {string} The first string to compare
     * @param s2 {string} The second string to compare
     * @param trim {boolean} If true the string is trimmed, otherwise the string is not trimmed (optional, defualts to true)
     * @return {boolean} Returns true if the strings are equal, false otherwise
     *
     * @see {@link #equals}
     * @static
     */
    notEquals: function(s1, s2, shouldTrim)
    {
        return this.equals(s1, s2, shouldTrim) === false;
    },

    trim: trim,

    ltrim: function(s){
        return s ? s.replace(/^\s\s*/,'') : EMPTY_STRING;
    },

    rtrim: function(s){
        return s ? s.replace(/\s\s*$/,'') : EMPTY_STRING;
    },

    startsWith: function(s, prefix) {
        return s == null ? false : s.startsWith(prefix);
    },

    endsWith: function(s, suffix) {
        return s == null ? false : s.endsWith(suffix);
    },

    /**
     *
     * @param c
     * @returns
     */
    unicodeEncode: function(c) {
        return '\\u'+('0000'+(+(c.charCodeAt(0))).toString(16)).slice(-4);
    },

    merge: function(str, data) {
        var varMatches,
            replacement,
            parts = [],
            lastIndex = 0;

        varRegExp.lastIndex = 0;

        while ((varMatches = varRegExp.exec(str))) {
            parts.push(str.substring(lastIndex, varMatches.index));
            replacement = data[varMatches[1]];
            parts.push(replacement !== undefined ? replacement : varMatches[0]);
            lastIndex = varRegExp.lastIndex;
        }

        parts.push(str.substring(lastIndex));
        return parts.join('');
    },

    StringBuilder: StringBuilder,

    createStringBuilder: function() {
        return new StringBuilder();
    }

};

});
$rmod.dep("/$/marko", "raptor-json", "1.1.0");
$rmod.def("/raptor-json@1.1.0/stringify", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Defines a "stringify" function that can be pulled in using require.
 *
 * Example:
 * <js>
 * var stringify = require('raptor/json/stringify');
 * var json = stringify({hello: "world"});
 * //Output: {"hello":"world"}
 * </js>
 *
 * The Raptor stringify function supports additional options not provided
 * by the builtin JSON object:
 * <b>special</b>: A regular expression to indicate "special" characters that must be escaped
 * <b>useSingleQuote</b>: If true, then single quotes will be used for strings instead of double quotes (helpful if the the string values contain a lot of double quotes)
 *
 */

var raptorStrings = require('/$/marko/$/raptor-strings'/*'raptor-strings'*/);
var unicodeEncode = raptorStrings.unicodeEncode; //Pick up the unicodeEncode method from the strings module
var COMMA = ',';
var NULL = 'null';
var ARRAY = Array;
var SPECIAL = /([^ -~]|(["'\\]))/g;
var REPLACE_CHARS = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
};

function stringify(o, options) {
    if (!options) {
        options = {};
    }

    var specialRegExp = options.special || SPECIAL;
    var replace = options.replace || REPLACE_CHARS;

    var buffer = raptorStrings.createStringBuilder();

    function append(str) {
        buffer.append(str);
    }

    var useSingleQuote = options.useSingleQuote === true;
    var strChar = useSingleQuote === true ? "'" : '"';
    function encodeString(s) {
        return strChar +
            s.replace(specialRegExp, function(c) {
                var replacement = replace[c];

                if (replacement) {
                    return replacement;
                }

                if (c === '"') {
                    return useSingleQuote ? '"' : '\\"';
                } else if (c === "'") {
                    return useSingleQuote ? "\\'" : "'";
                } else {
                    return unicodeEncode(c);
                }
            }) +
            strChar;
    }

    function serialize(o) {
        if (o == null) {
            append(NULL);
            return;
        }

        var constr = o.constructor, i, len;

        if (typeof o.toJSON === 'function') {
            if (constr !== Date) { // Dates are handled later
                o = o.toJSON();
                if (o == null) {
                    append(NULL);
                    return;
                }
                
                constr = o.constructor;
            }
        }

        if (o === true || o === false || constr === Boolean) {
            append(o.toString());
        } else if (constr === ARRAY) {
            append('[');

            len = o.length;
            for (i=0; i<len; i++) {
                if (i !== 0) {
                    append(COMMA);
                }

                serialize(o[i]);
            }

            append(']');
        } else if (constr === Date) {
            append(o.getTime());
        } else {
            var type = typeof o;
            switch(type) {
                case 'string':
                    append(encodeString(o));
                    break;
                case 'number':
                    append(isFinite(o) ? o + '' : NULL);
                    break;
                case 'object':
                    append('{');
                    var first = true, v;
                    for (var k in o) {
                        if (o.hasOwnProperty(k)) {
                            v = o[k];
                            if (v == null || typeof v === 'function') continue;

                            if (first === false)
                            {
                                append(COMMA);
                            } else {
                                first = false;
                            }

                            append(encodeString(k));
                            append(":");
                            serialize(v);
                        }
                    }
                    append('}');
                    break;
                default:
                    append(NULL);
            }
        }
    }

    serialize(o);

    return buffer.toString();
}

module.exports = stringify;
});
$rmod.def("/marko@2.7.28/taglibs/core/ForNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var forEachRegEx = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+)$/;
var forEachPropRegEx = /^\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s+in\s+(.+)$/;
var forRangeRegEx = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s+from\s+(.+)$/; // i from 0 to 10  or  i from 0 to 10 step 5
var forRangeKeywordsRegExp = /"(?:[^"]|\\")*"|'(?:[^']|\\')*'|\s+(to|step)\s+/g;
var integerRegExp = /^-?\d+$/;
var numberRegExp = /^-?(?:\d+|\d+\.\d*|\d*\.\d+|\d+\.\d+)$/;

function convertNumber(str) {
    if (!str) {
        return str;
    }

    if (integerRegExp.test(str)) {
        return parseInt(str, 10);
    } else if (numberRegExp.test(str)) {
        return parseFloat(str);
    } else {
        return str;
    }
}

var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/).stringify;
function parseForEach(value) {
    var match = value.match(forEachRegEx);
    if (match) {
        return {
            'var': match[1],
            'in': match[2]
        };
    } else if ((match = value.match(forEachPropRegEx))) {


        return {
            'nameVar': match[1],
            'valueVar': match[2],
            'in': match[3]
        };
    } else if ((match = value.match(forRangeRegEx))) {
        var nameVar = match[1];


        var remainder = match[2];
        var rangeMatches;

        var fromStart = 0;
        var fromEnd = -1;

        var toStart = -1;
        var toEnd = remainder.length;

        var stepStart = -1;
        var stepEnd = -1;

        while ((rangeMatches = forRangeKeywordsRegExp.exec(remainder))) {
            if (rangeMatches[1] === 'to') {
                fromEnd = rangeMatches.index;
                toStart = forRangeKeywordsRegExp.lastIndex;
            } else if (rangeMatches[1] === 'step') {
                if (toStart === -1) {
                    continue;
                }
                toEnd = rangeMatches.index;
                stepStart = forRangeKeywordsRegExp.lastIndex;
                stepEnd = remainder.length;
            }
        }

        if (toStart === -1 || fromEnd === -1) {
            throw new Error('Invalid each attribute of "' + value + '"');
        }

        var from = remainder.substring(fromStart, fromEnd).trim();
        var to = remainder.substring(toStart, toEnd).trim();
        var step;

        from = convertNumber(from);
        to = convertNumber(to);

        if (stepStart !== -1) {
            step = remainder.substring(stepStart, stepEnd).trim();
            step = convertNumber(step);
        } else {
            if (typeof from === 'number' && typeof to === 'number') {
                if (from < to) {
                    step = 1;
                } else {
                    step = -1;
                }
            } else {
                step = 1;
            }

        }

        return {
            'nameVar': nameVar,
            'from': from,
            'to': to,
            'step': step
        };
    } else {
        throw new Error('Invalid each attribute of "' + value + '"');
    }
}
function ForNode(props) {
    ForNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
ForNode.prototype = {
    doGenerateCode: function (template) {
        var each = this.getProperty('each');
        var separator = this.getProperty('separator');
        var statusVar = this.getProperty('statusVar') || this.getProperty('varStatus');
        var customIterator = this.getProperty('iterator');
        if (!each) {
            this.addError('"each" attribute is required');
            this.generateCodeForChildren(template);
            return;
        }
        var parts;
        try {
            parts = parseForEach(each);
        } catch (e) {
            this.addError(e.message);
            this.generateCodeForChildren(template);
            return;
        }

        if (parts.hasOwnProperty('from')) {
            // This is a range loop


            var nameVar = parts.nameVar;
            var from = parts.from;
            var to = parts.to;
            var step = parts.step;
            var comparison = '<=';

            if (typeof step === 'number') {
                if (step < 0) {
                    comparison = '>=';
                }

                if (step === 1) {
                    step = nameVar + '++';
                } else if (step  === -1) {
                    step = nameVar + '--';
                } else if (step > 0) {
                    step = nameVar + '+=' + step;
                } else if (step === 0) {
                    throw new Error('Invalid step of 0');
                } else if (step < 0) {
                    step = 0-step; // Make the step positive and switch to -=
                    step = nameVar + '-=' + step;
                }
            } else {
                step = nameVar + '+=' + step;
            }

            template.statement('(function() {').indent(function () {
                template.statement('for (var ' + nameVar + '=' + from + '; ' + nameVar + comparison + to + '; ' + step + ') {').indent(function () {
                    this.generateCodeForChildren(template);
                }, this).line('}');
            }, this).line('}());');
            return;
        }

        var items = template.makeExpression(parts['in']);
        var varName = parts['var'];
        var nameVarName = parts.nameVar;
        var valueVarName = parts.valueVar;
        if (nameVarName) {
            if (separator) {
                this.addError('Separator is not supported when looping over properties');
                this.generateCodeForChildren(template);
                return;
            }
            if (statusVar) {
                this.addError('Loop status variable not supported when looping over properties');
                this.generateCodeForChildren(template);
                return;
            }
        }
        if (separator && !statusVar) {
            statusVar = '__loop';
        }
        var funcName;
        var forEachParams;

        if (customIterator) {
            var statusVarFlag = '';
            if (statusVar) {
                statusVarFlag = ', true';
                forEachParams = [
                    varName,
                    statusVar
                ];
            } else {
                forEachParams = [varName];
            }
            template.statement(customIterator + '(' + items + ', function(' + forEachParams.join(',') + ') {').indent(function () {
                this.generateCodeForChildren(template);
            }, this).line('}' + statusVarFlag + ');');
        } else if (statusVar) {
            forEachParams = [
                varName,
                statusVar
            ];
            funcName = template.getStaticHelperFunction('forEachWithStatusVar', 'fv');
            template.statement(funcName + '(' + items + ', function(' + forEachParams.join(',') + ') {').indent(function () {
                this.generateCodeForChildren(template);
                if (separator) {
                    template.statement('if (!' + statusVar + '.isLast()) {').indent(function () {
                        template.write(template.isExpression(separator) ? separator.getExpression() : stringify(separator));
                    }, this).line('}');
                }
            }, this).line('});');
        } else {
            var forLoopProp = this.getProperty('forLoop');

            if (forLoopProp && forLoopProp.toString() === 'true') {
                forEachParams = [
                    '__array',
                    '__index',
                    '__length',
                    varName
                ];
                template.statement(template.getStaticHelperFunction('forLoop', 'fl') + '(' + items + ', function(' + forEachParams.join(',') + ') {').indent(function () {
                    template.statement('for (;__index<__length;__index++) {').indent(function () {
                        template.statement(varName + '=__array[__index];');
                        this.generateCodeForChildren(template);
                    }, this).line('}');
                }, this).line('});');
            } else {
                forEachParams = nameVarName ? [
                    nameVarName,
                    valueVarName
                ] : [varName];
                funcName = nameVarName ? template.getStaticHelperFunction('forEachProp', 'fp') : template.getStaticHelperFunction('forEach', 'f');
                template.statement(funcName + '(' + items + ', function(' + forEachParams.join(',') + ') {').indent(function () {
                    this.generateCodeForChildren(template);
                }, this).line('});');
            }
        }
    }
};

module.exports = ForNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/IfNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function IfNode(props) {
    IfNode.$super.call(this, 'if');
    if (props) {
        this.setProperties(props);
    }
}

IfNode.nodeType = 'element';

IfNode.prototype = {
    doGenerateCode: function (template) {
        var test = this.getProperty('test');
        if (!test) {
            this.addError('"test" attribute is required');
        }
        template.statement('if (' + test + ') {').indent(function () {
            this.generateCodeForChildren(template);
        }, this).line('}');
    }
};

module.exports = IfNode;
});
$rmod.main("/raptor-util@1.0.10", "raptor-util");
$rmod.def("/raptor-util@1.0.10/tryRequire", function(require, exports, module, __filename, __dirname) { 
module.exports = function(id, require) {
    var path;
    
    try {
        path = require.resolve(id);
    }
    catch(e) {}

    if (path) {
        return require(path);
    }
};
});
$rmod.def("/raptor-util@1.0.10/makeClass", function(require, exports, module, __filename, __dirname) { var inherit = require('./inherit');

module.exports = function(clazz) {
    var superclass;

    if (typeof clazz === 'function') {
        superclass = clazz.$super;
    }
    else {
        var o = clazz;
        clazz = o.$init || function() {};
        superclass = o.$super;

        delete o.$super;
        delete o.$init;

        clazz.prototype = o;
    }
    
    if (superclass) {
        inherit(clazz, superclass);
    }

    var proto = clazz.prototype;
    proto.constructor = clazz;
    
    return clazz;
};
});
$rmod.def("/raptor-util@1.0.10/makeEnum", function(require, exports, module, __filename, __dirname) { var makeClass = require('./makeClass');
var extend = require('./extend');
var forEachEntry = require('./forEachEntry');

module.exports = function(enumValues, Ctor) {
    if (Ctor) {
        Ctor = makeClass(Ctor);
    } else {
        Ctor = function () {};
    }

    var proto = Ctor.prototype;
    var count = 0;

    function _addEnumValue(name, EnumCtor) {
        var ordinal = count++;
        return extend(Ctor[name] = new EnumCtor(), {
            ordinal: ordinal,
            compareTo: function(other) {
                return ordinal - other.ordinal;
            },
            name: name
        });
    }

    function EnumCtor() {}

    if (Array.isArray(enumValues)) {
        enumValues.forEach(function (name) {
            _addEnumValue(name, Ctor);
        });
    } else if (enumValues) {
        EnumCtor.prototype = proto;
        forEachEntry(enumValues, function (name, args) {
            Ctor.apply(_addEnumValue(name, EnumCtor), args || []);
        });
    }

    Ctor.valueOf = function (name) {
        return Ctor[name];
    };


    if (proto.toString == Object.prototype.toString) {
        proto.toString = function() {
            return this.name;
        };
    }

    return Ctor;
};
});
$rmod.def("/raptor-util@1.0.10/forEachEntry", function(require, exports, module, __filename, __dirname) { /**
 * Invokes a provided callback for each name/value pair
 * in a JavaScript object.
 *
 * <p>
 * <h2>Usage</h2>
 * <js>
 * raptor.forEachEntry(
 *     {
 *         firstName: "John",
 *         lastName: "Doe"
 *     },
 *     function(name, value) {
 *         console.log(name + '=' + value);
 *     },
 *     this);
 * )
 * // Output:
 * // firstName=John
 * // lastName=Doe
 * </js>
 * @param  {Object} o A JavaScript object that contains properties to iterate over
 * @param  {Function} fun The callback function for each property
 * @param  {Object} thisp The "this" object to use for the callback function
 * @return {void}
 */
module.exports = function(o, fun, thisp) {
    for (var k in o)
    {
        if (o.hasOwnProperty(k))
        {
            fun.call(thisp, k, o[k]);
        }
    }
};
});
$rmod.def("/raptor-util@1.0.10/createError", function(require, exports, module, __filename, __dirname) { module.exports = function(message, cause) {
    var error;
    var argsLen = arguments.length;
    var E = Error;
    
    if (argsLen == 2) {
        error = message instanceof E ? message : new E(message);
        if (error.stack) {
            error.stack += '\nCaused by: ' + (cause.stack || cause);
        } else {
            error._cause = cause;    
        }
    } else if (argsLen == 1) {
        error = message instanceof E ? message : new E(message);
    }
    
    return error;
};
});
$rmod.def("/raptor-util@1.0.10/isObjectEmpty", function(require, exports, module, __filename, __dirname) { module.exports = function isObjectEmpty(o) {
    if (!o) {
        return true;
    }
    
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
};
});
$rmod.def("/raptor-util@1.0.10/toArray", function(require, exports, module, __filename, __dirname) { var slice = [].slice;

module.exports = function toArray(o) {
    if (o == null || Array.isArray(o)) {
        return o;
    }

    if (typeof o === 'string') {
        return o.split('');
    }

    if (o.length) {
        return slice.call(o, 0);
    }

    return [o];
};
});
$rmod.def("/raptor-util@1.0.10/raptor-util", function(require, exports, module, __filename, __dirname) { module.exports = {
    tryRequire: require('./tryRequire'),
    inherit: require('./inherit'),
    makeClass: require('./makeClass'),
    makeEnum: require('./makeEnum'),
    extend: require('./extend'),
    forEachEntry: require('./forEachEntry'),
    forEach: require('./forEach'),
    createError: require('./createError'),
    arrayFromArguments: require('./arrayFromArguments'),
    escapeXml: require('./escapeXml'),
    escapeXmlAttr: require('./escapeXml').attr,
    attr: require('./attr'),
    attrs: require('./attrs'),
    isObjectEmpty: require('./isObjectEmpty'),
    toArray: require('./toArray')
};
});
$rmod.def("/marko@2.7.28/taglibs/core/IncludeNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/);
var nodePath = require('path-browserify'/*'path'*/);
var req = require;
var fs;

try {
    fs = req('fs');
} catch(e) {}


var extend = require('/$/marko/$/raptor-util'/*'raptor-util'*/).extend;
function IncludeNode(props) {
    if (IncludeNode.$super) {
        IncludeNode.$super.call(this);
    }

    if (props) {
        this.setProperties(props);
    }
}
IncludeNode.convertNode = function (node, template) {
    extend(node, IncludeNode.prototype);
    IncludeNode.call(node);
    node.setProperty('template', template);
};
IncludeNode.prototype = {
    doGenerateCode: function (template) {
        var templatePath = this.getProperty('template') || this.getAttribute('template');
        var templateData = this.getProperty('templateData') || this.getProperty('template-data');
        var resourcePath;
        var _this = this;

        this.removeProperty('template');
        this.removeProperty('templateData');
        this.removeProperty('template-data');

        if (templatePath) {

            var dataExpression = {
                    toString: function () {
                        var propParts = [];

                        _this.forEachProperty(function (name, value) {
                            name = name.replace(/-([a-z])/g, function (match, lower) {
                                return lower.toUpperCase();
                            });
                            propParts.push(stringify(name) + ': ' + value);
                        }, _this);

                        if (_this.hasChildren()) {
                            propParts.push(stringify('body') + ': ' + _this.getBodyContentExpression(template, false));
                        }

                        var propsCode = '{' + propParts.join(', ') + '}';

                        if (templateData) {
                            if (propParts.length) {
                                var extendVar = template.addStaticVar('__extend', '__helpers.xt');
                                propsCode = extendVar + '(' +
                                            extendVar + '({}, ' + templateData + '), ' +
                                            propsCode +
                                        ')';
                            } else {
                                propsCode = templateData;
                            }
                        }

                        return propsCode;
                    }
                };

            template.include(templatePath, dataExpression);
        } else if ((resourcePath = this.getAttribute('resource'))) {
            var isStatic = this.getProperty('static') !== false;
            if (isStatic) {
                resourcePath = nodePath.resolve(template.dirname, resourcePath);
                if (!fs.existsSync(resourcePath)) {
                    this.addError('Resource not found: ' + resourcePath);
                    return;
                }
                template.write(stringify(fs.readFileSync(resourcePath, {encoding: 'utf8'})));
            }
        } else {
            this.addError('"template" or "resource" attribute is required');
        }
    }
};

module.exports = IncludeNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/InvokeNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var forEach = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEach;

function InvokeNode(props) {
    InvokeNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}

InvokeNode.prototype = {
    doGenerateCode: function (template) {
        var func = this.getProperty('function');
        var funcDef;
        var bodyParam;
        var definedFunctions = template.getAttribute('core:definedFunctions');
        if (!func) {
            this.addError('"function" attribute is required');
            return;
        }
        if (func.indexOf('(') === -1) {
            funcDef = definedFunctions ? definedFunctions[func] : null;
            var argParts = [];
            var validParamsLookup = {};
            var params = [];
            if (funcDef) {
                params = funcDef.params || [];
                bodyParam = funcDef.bodyParam;
                /*
                 * Loop over the defined parameters to figure out the names of allowed parameters and add them to a lookup
                 */
                forEach(params, function (param) {
                    validParamsLookup[param] = true;
                }, this);
            }
            var bodyArg = null;
            if (this.hasChildren()) {
                if (!funcDef || !funcDef.bodyParam) {
                    this.addError('Nested content provided when invoking macro "' + func + '" but defined macro does not support nested content.');
                } else {
                    bodyArg = this.getBodyContentExpression(template, false);
                }
            }
            /*
             * VALIDATION:
             * Loop over all of the provided attributes and make sure they are allowed 
             */
            this.forEachProperty(function (name, value) {
                if (name === 'function') {
                    return;
                }
                if (!validParamsLookup[name]) {
                    this.addError('Parameter with name "' + name + '" not supported for function with name "' + func + '". Allowed parameters: ' + params.join(', '));
                }
            }, this);
            /*
             * One more pass to build the argument list
             */
            forEach(params, function (param) {
                validParamsLookup[param] = true;
                if (param === bodyParam) {
                    argParts.push(bodyArg ? bodyArg : 'undefined');
                } else {
                    var arg = this.getAttribute(param);
                    if (arg == null) {
                        argParts.push('undefined');
                    } else {
                        argParts.push(this.getProperty(param));
                    }
                }
            }, this);
            template.write(func + '(' + argParts.join(',') + ')');
        } else {
            var funcName = func.substring(0, func.indexOf('('));
            funcDef = definedFunctions ? definedFunctions[funcName] : null;
            if (funcDef) {
                template.write(func);
            } else {
                template.statement(func + ';\n');
            }
        }
    }
};

module.exports = InvokeNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/RequireNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function RequireNode(props) {
    RequireNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
RequireNode.prototype = {
    javaScriptOnly: true,
    
    doGenerateCode: function (template) {
        var module = this.getProperty('module');
        var varName = this.getProperty('var');

        if (!module) {
            this.addError('"module" attribute is required');
            return;
        }
        if (varName) {
            template.addStaticVar(varName, 'require(' + module + ')');
        } else {
            template.functionCall('require', module);
        }
    }
};

module.exports = RequireNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/ScriptletNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function ScriptletNode(code) {
    ScriptletNode.$super.call(this, 'scriptlet');
    this.code = code;
}
ScriptletNode.prototype = {
    doGenerateCode: function (template) {
        if (this.code) {
            template.code(this.code);
        }
    },
    toString: function () {
        return '{%' + this.code + '%}';
    }
};

module.exports = ScriptletNode;
});
$rmod.remap("/marko@2.7.28/taglibs/core/requireVarName", "requireVarName-browser");
$rmod.def("/marko@2.7.28/taglibs/core/requireVarName-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

module.exports = function(target, from) {
    return target;
};
});
$rmod.def("/marko@2.7.28/taglibs/core/TagHandlerNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var extend = require('/$/marko/$/raptor-util'/*'raptor-util'*/).extend;
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/);
var isObjectEmpty = require('/$/marko/$/raptor-util/isObjectEmpty'/*'raptor-util/isObjectEmpty'*/);
var requireVarName = require('./requireVarName');

function addHandlerVar(template, renderer) {
    var handlerVars = template._handlerVars || (template._handlerVars = {});
    var handlerVar = handlerVars[renderer];
    if (!handlerVar) {
        handlerVar = requireVarName(renderer, template.dirname);
        handlerVar = template.addStaticVar(handlerVar, '__renderer(require(' + stringify(renderer) + '))');
        handlerVars[renderer] = handlerVar;
    }
    return handlerVar;
}
function getPropsStr(props, template) {
    var propsArray = [];
    if (props) {
        template.indent(function () {
            forEachEntry(props, function (name, value) {
                if (typeof value === 'function') {
                    value = template.captureCode(function() {
                        return value(template);
                    });

                    if (!value) {
                        throw new Error('Invalid value for property "' + name + '"');
                    }

                    value = template.makeExpression(value, false);
                }

                if (template.isExpression(value)) {
                    var expressionStr;
                    template.indent(function () {
                        expressionStr = value.expression.toString();
                    });
                    propsArray.push(template.indentStr() + stringify(name) + ': ' + expressionStr);
                } else if (typeof value === 'string' || typeof value === 'object') {
                    propsArray.push(template.indentStr() + stringify(name) + ': ' + stringify(value));
                } else {
                    propsArray.push(template.indentStr() + stringify(name) + ': ' + value);
                }
            });
        });

        if (propsArray.length) {
            return '{\n' + propsArray.join(',\n') + '\n' + template.indentStr() + '}';
        } else {
            return '{}';
        }
    } else {
        return '{}';
    }
}

function getNextNestedTagVarName(template) {
    if (template.data.nextNestedTagId == null) {
        template.data.nextNestedTagId = 0;
    }

    return '__nestedTagInput' + (template.data.nextNestedTagId++);
}

function getNestedTagParentNode(nestedTagNode, tag) {
    var parentTagName = tag.parentTagName;

    var currentNode = nestedTagNode.parentNode;
    while (currentNode) {
        if (currentNode.localName === parentTagName) {
            return currentNode;
        }

        currentNode = currentNode.parentNode;
    }
}

function TagHandlerNode(tag) {
    if (!this.nodeType) {
        TagHandlerNode.$super.call(this);
    }
    this.tag = tag;
    this.dynamicAttributes = null;
    this.inputExpression = null;
    this.additionalVars = [];
}
TagHandlerNode.nodeType = 'element';

TagHandlerNode.convertNode = function (node, tag) {
    if (node._TagHandlerNode) {
        return;
    }

    extend(node, TagHandlerNode.prototype);
    TagHandlerNode.call(node, tag);
};

TagHandlerNode.prototype = {

    _TagHandlerNode: true,

    addNestedVariable: function(name) {
        this.additionalVars.push(name);
    },
    addDynamicAttribute: function (name, value) {
        if (!this.dynamicAttributes) {
            this.dynamicAttributes = {};
        }
        this.dynamicAttributes[name] = value;
    },
    setDynamicAttributesProperty: function(name) {
        this.dynamicAttributesProperty = name;
    },
    setInputExpression: function (expression) {
        this.inputExpression = expression;
    },
    doGenerateCode: function (template) {
        template.addStaticVar('__renderer', '__helpers.r');
        var _this = this;
        var tag = this.tag;

        var rendererPath;
        var handlerVar;

        if (tag.renderer) {
            rendererPath = template.getRequirePath(this.tag.renderer); // Resolve a path to the renderer relative to the directory of the template
            handlerVar = addHandlerVar(template, rendererPath);
        }


        var bodyFunction = tag.bodyFunction;
        var bodyProperty = tag.bodyProperty;
        var isNestedTag = tag.isNestedTag === true;
        var hasNestedTags = tag.hasNestedTags();
        var tagHelperVar = template.addStaticVar('__tag', '__helpers.t');

        var nestedTagVar;
        var nestedTagParentNode = null;

        if (isNestedTag) {
            nestedTagParentNode = getNestedTagParentNode(this, tag);
            if (nestedTagParentNode == null) {
                this.addError('Invalid usage of the ' + this + ' nested tag. Tag not nested within a <' + tag.parentTagName + '> tag.');
                return;
            }

            nestedTagVar = nestedTagParentNode.data.nestedTagVar;
        }

        if (hasNestedTags) {
            nestedTagVar = this.data.nestedTagVar = getNextNestedTagVarName(template);
        }

        tag.forEachImportedVariable(function (importedVariable) {
            this.setProperty(importedVariable.targetProperty, template.makeExpression(importedVariable.expression));
        }, this);

        if (this.hasChildren()) {
            if (bodyFunction) {
                this.setProperty(bodyFunction.name, function(template) {
                    template.code('function(' + bodyFunction.params + ') {\n').indent(function () {
                        _this.generateCodeForChildren(template);
                    }).indent().code('}');
                });
            } else if (bodyProperty) {
                this.setProperty(bodyProperty, function(template) {
                    return _this.getBodyContentExpression(template);
                });
            }
        }


        var variableNames = [];
        tag.forEachVariable(function (nestedVar) {
            var varName;
            if (nestedVar.nameFromAttribute) {
                var possibleNameAttributes = nestedVar.nameFromAttribute.split(/\s+or\s+|\s*,\s*/i);
                for (var i = 0, len = possibleNameAttributes.length; i < len; i++) {
                    var attrName = possibleNameAttributes[i];
                    var keep = false;
                    if (attrName.endsWith('|keep')) {
                        keep = true;
                        attrName = attrName.slice(0, 0 - '|keep'.length);
                        possibleNameAttributes[i] = attrName;
                    }
                    varName = this.getAttribute(attrName);
                    if (varName) {
                        if (!keep) {
                            this.removeProperty(attrName);
                        }
                        break;
                    }
                }
                if (!varName) {
                    this.addError('Attribute ' + possibleNameAttributes.join(' or ') + ' is required');
                    varName = '_var';    // Let it continue with errors
                }
            } else {
                varName = nestedVar.name;
                if (!varName) {
                    this.addError('Variable name is required');
                    varName = '_var';    // Let it continue with errors
                }
            }
            variableNames.push(varName);
        }, this);

        if (this.additionalVars.length) {
            variableNames = variableNames.concat(this.additionalVars);
        }

        template.functionCall(tagHelperVar, function () {
            template.code('out,\n').indent(function () {
                template.line((handlerVar ? handlerVar : 'null') + ',').indent();

                if (_this.dynamicAttributes) {
                    template.indent(function() {
                        _this.setProperty(_this.dynamicAttributesProperty, template.makeExpression(getPropsStr(_this.dynamicAttributes, template)));
                    });
                }

                var props = _this.getProperties();

                var propsCode = getPropsStr(props, template);

                if (_this.inputExpression) {
                    if (isObjectEmpty(props)) {
                        propsCode = _this.inputExpression;
                    } else {
                        // We need to generate code that merges in the attribute properties with
                        // the provided data object. We don't want to modify the existing
                        // data object provided by the user so first need to create a new
                        // empty object and then merge in the existing properties from the
                        // provided object. When then extend that object with the properties
                        // that came from the attributes.
                        //
                        // The generated code will be similar to the following:
                        //
                        // extend(extend({}, <input_expression>), <attr_props>);
                        var extendVar = template.addStaticVar('__extend', '__helpers.xt');
                        propsCode = extendVar + '(' +
                                    extendVar + '({}, ' + _this.inputExpression + '), ' +
                                    propsCode +
                                ')';
                    }

                }

                template.code(propsCode);

                var hasOutParam = false;

                if (_this.hasChildren() && !tag.bodyFunction) {
                    var bodyParams = [];


                    if (hasNestedTags) {
                        bodyParams.push(nestedTagVar);
                    } else {
                        variableNames.forEach(function (varName) {
                            if (varName === 'out') {
                                hasOutParam = true;
                            }
                            bodyParams.push(varName);
                        });
                    }

                    var params;

                    if (hasOutParam) {
                        params = bodyParams.join(',');
                    } else {
                        params = 'out' + (bodyParams.length ? ', ' + bodyParams.join(', ') : '');
                    }

                    template.code(',\n').line('function(' + params + ') {').indent(function () {
                        _this.generateCodeForChildren(template);
                    }).indent().code('}');
                }

                if (hasNestedTags || isNestedTag || hasOutParam) {
                    var options = [];

                    if (hasNestedTags) {
                        options.push('hasNestedTags: 1');
                    }

                    if (hasOutParam) {
                        options.push('hasOutParam: 1');
                    }

                    if (isNestedTag) {
                        options.push('targetProperty: ' + JSON.stringify(tag.targetProperty));
                        options.push('parent: ' + nestedTagVar);
                        if (tag.isRepeated) {
                            options.push('isRepeated: 1');
                        }
                    }

                    template.code(',\n').code(template.indentStr() + '{ ' + options.join(', ') + ' }');
                }
            });
        });
    }
};

module.exports = TagHandlerNode;

});
$rmod.def("/marko@2.7.28/taglibs/core/TemplateNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function TemplateNode(props) {
    TemplateNode.$super.call(this, 'c-template');
    if (props) {
        this.setProperties(props);
    }
}

TemplateNode.nodeType = 'element';

TemplateNode.prototype = {
    doGenerateCode: function (template) {
        var params = this.getProperty('params');
        if (params) {
            params = params.split(/(?:\s*,\s*)|(?:\s+)/g);
            params.forEach(function (param) {
                param = param.trim();
                if (param.length) {
                    template.addVar(param, 'data.' + param);
                }
            }, this);
        } else {
            params = null;
        }
        
        this.generateCodeForChildren(template);
    }
};

module.exports = TemplateNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/UnlessNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function UnlessNode(props) {
    UnlessNode.$super.call(this, 'unless');
    if (props) {
        this.setProperties(props);
    }
}

UnlessNode.nodeType = 'element';

UnlessNode.prototype = {
    doGenerateCode: function (template) {
        var test = this.getProperty('test');
        if (!test) {
            this.addError('"test" attribute is required');
        }
        template.statement('if (!' + test + ') {').indent(function () {
            this.generateCodeForChildren(template);
        }, this).line('}');
    }
};

module.exports = UnlessNode;

});
$rmod.def("/marko@2.7.28/taglibs/core/VarNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var varNameRegExp = /^[A-Za-z_][A-Za-z0-9_]*$/;
function VarNode(props) {
    VarNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
VarNode.prototype = {
    javaScriptOnly: true,
    doGenerateCode: function (template) {
        var varName = this.getProperty('name');
        var value = this.getProperty('value') || this.getProperty('string-value');
        if (!varName) {
            this.addError('"name" attribute is required');
        } else if (!varNameRegExp.test(varName)) {
            this.addError('Invalid variable name of "' + varName + '"');
            varName = null;
        }

        var isStatic = this.getProperty('static');

        if (varName) {
            if (isStatic) {
                template.addStaticVar(varName, value);
            } else {
                template.statement('var ' + varName + (value ? ' = ' + value : '') + ';');    
            }
        }
    }
};
module.exports = VarNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/WithNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var varNameRegExp = /^[A-Za-z_][A-Za-z0-9_]*$/;
function WithNode(props) {
    WithNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
WithNode.prototype = {
    doGenerateCode: function (template) {
        var vars = this.getProperty('vars');
        var _this = this;
        if (!vars) {
            this.addError('"vars" attribute is required');
        }
        var withVars = template.parseAttribute(vars, { '*': { type: 'expression' } }, {
                ordered: true,
                errorHandler: function (message) {
                    _this.addError('Invalid variable declarations of "' + vars + '". Error: ' + message);
                }
            });
        var varDefs = [];
        withVars.forEach(function (withVar, i) {
            if (!varNameRegExp.test(withVar.name)) {
                this.addError('Invalid variable name of "' + withVar.name + '" in "' + vars + '"');
            }
            varDefs.push((i > 0 ? template.indentStr(1) + '    ' : '') + withVar.name + (withVar.value ? '=' + withVar.value : '') + (i < withVars.length - 1 ? ',\n' : ';'));
        }, this);
        template.statement('(function() {').indent(function () {
            template.statement('var ' + varDefs.join(''));
            this.generateCodeForChildren(template);
        }, this).line('}());');
    }
};

module.exports = WithNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/WriteNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

function WriteNode(props) {
    WriteNode.$super.call(this, 'c-write');
    if (props) {
        this.setProperties(props);
    }
}

WriteNode.nodeType = 'element';

WriteNode.prototype = {
    doGenerateCode: function (template) {
        var expression = this.getExpression();
        var escapeXml;
        var options = {};

        if (this.hasProperty('escapeXml')) {
            escapeXml = this.getProperty('escapeXml') !== false;
        } else {
            escapeXml = this.getProperty('escape-xml') !== false;
        }

        if (escapeXml === true) {
            if (this.getEscapeXmlContext() === 'ATTRIBUTE') {
                options.escapeXmlAttr = true;
            } else {
                options.escapeXml = true;
            }
        }
        if (expression) {
            template.write(expression, options);
        }
    },
    getExpression: function () {
        return this.getProperty('expression') || this.getProperty('value') || this.getAttribute('expression') || this.getAttribute('value');
    },
    toString: function () {
        return '<c-write expression="' + this.getExpression() + '">';
    }
};

module.exports = WriteNode;
});
$rmod.def("/marko@2.7.28/taglibs/core/core-tag-transformer", function(require, exports, module, __filename, __dirname) { var process=require("process"); /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function removeDashes(str) {
    return str.replace(/-([a-z])/g, function (match, lower) {
        return lower.toUpperCase();
    });
}
var extend = require('/$/marko/$/raptor-util'/*'raptor-util'*/).extend;
var ForNode = require('./ForNode');
var IfNode = require('./IfNode');
var UnlessNode = require('./UnlessNode');
var ElseIfNode = require('./ElseIfNode');
var ElseNode = require('./ElseNode');
var WithNode = require('./WithNode');
var TagHandlerNode = require('./TagHandlerNode');
var IncludeNode = require('./IncludeNode');
var path = require('path-browserify'/*'path'*/);

function getTaglibPath(taglibPath) {
    if (typeof window === 'undefined') {
        return path.relative(process.cwd(), taglibPath);
    } else {
        return taglibPath;
    }
}

var coreAttrHandlers = [
    [
        'c-space', function(attr, node) {
            this['c-whitespace'](attr, node);
        }
    ],
    [
        'c-whitespace', function(attr, node) {
            if (attr === 'preserve') {
                node.setPreserveWhitespace(true);
            }
        }
    ],
    [
        'c-escape-xml', function(attr, node) {
            node.setEscapeXmlBodyText(attr !== 'false');
        }
    ],
    [
        'c-parse-body-text', function(attr, node) {
            node.parseBodyText = attr !== 'false';
        }
    ],
    [
        'attrs', function(attr, node) {
            if (this.tag) {
                this.inputAttr = attr;
            } else {
                if (!node.addDynamicAttributes) {
                    node.addError('Node does not support the "attrs" attribute');
                } else {
                    node.addDynamicAttributes(attr);
                }
            }
        }
    ],
    [
        'for-each', function(attr, node) {
            this['for'](attr, node);
        }
    ],
    [
        'for', function(attr, node) {
            var forEachProps = this.compiler.parseAttribute(attr, {
                    each: { type: 'custom' },
                    separator: { type: 'expression' },
                    'iterator': { type: 'expression' },
                    'status-var': { type: 'identifier' },
                    'for-loop': {
                        type: 'boolean',
                        allowExpressions: false
                    }
                }, {
                    removeDashes: true,
                    defaultName: 'each',
                    errorHandler: function (message) {
                        node.addError('Invalid for attribute of "' + attr + '". Error: ' + message);
                    }
                });
            forEachProps.pos = node.getPosition();
            //Copy the position property
            var forEachNode = this.compiler.createNode(ForNode, forEachProps);
            //Surround the existing node with an "forEach" node by replacing the current
            //node with the new "forEach" node and then adding the current node as a child
            node.parentNode.replaceChild(forEachNode, node);
            forEachNode.appendChild(node);
        }
    ],
    [
        'if', function(attr, node) {
            var ifNode = this.compiler.createNode(IfNode, {
                    test: this.template.makeExpression(attr),
                    pos: node.getPosition()
                });
            //Surround the existing node with an "if" node by replacing the current
            //node with the new "if" node and then adding the current node as a child
            node.parentNode.replaceChild(ifNode, node);
            ifNode.appendChild(node);
        }
    ],
    [
        'unless', function(attr, node) {
            var unlessNode = this.compiler.createNode(UnlessNode, {
                    test: this.template.makeExpression(attr),
                    pos: node.getPosition()
                });
            //Surround the existing node with an "unlessNode" node by replacing the current
            //node with the new "unlessNode" node and then adding the current node as a child
            node.parentNode.replaceChild(unlessNode, node);
            unlessNode.appendChild(node);
        }
    ],
    [
        'else-if', function(attr, node) {
            var elseIfNode = this.compiler.createNode(ElseIfNode, {
                    test: this.template.makeExpression(attr),
                    pos: node.getPosition()
                });
            //Surround the existing node with an "if" node by replacing the current
            //node with the new "if" node and then adding the current node as a child
            node.parentNode.replaceChild(elseIfNode, node);
            elseIfNode.appendChild(node);
        }
    ],
    [
        'else', function(attr, node) {
            var elseNode = this.compiler.createNode(ElseNode, { pos: node.getPosition() });
            //Surround the existing node with an "if" node by replacing the current
            //node with the new "if" node and then adding the current node as a child
            node.parentNode.replaceChild(elseNode, node);
            elseNode.appendChild(node);
        }
    ],
    [
        'with', function(attr, node) {
            var withNode = this.compiler.createNode(WithNode, {
                    vars: attr,
                    pos: node.getPosition()
                });
            node.parentNode.replaceChild(withNode, node);
            withNode.appendChild(node);
        }
    ],
    [
        'c-trim-body-indent', function(attr, node) {
            if (attr === 'true') {
                node.trimBodyIndent = true;
            }
        }
    ],
    [
        'body-only-if', function(attr, node) {
            if (!node.setStripExpression) {
                node.addError('The c-strip directive is not allowed for target node');
            }
            node.setStripExpression(attr);
        }
    ],
    [
        'c-input', function(attr, node) {
            this.inputAttr = attr;
        }
    ],
    [
        'c-data', function(attr, node) {
            console.log('c-data', typeof attr);
            this.inputAttr = attr;
        }
    ]
];


function Transformer(template, compiler, tag) {
    this.template = template;
    this.compiler = compiler;
    this.tag = tag;
    this.inputAttr = null;
}

Transformer.prototype = {
    transformNode: function(node) {

        for (var i=0, len=coreAttrHandlers.length; i<len; i++) {
            var attrHandler = coreAttrHandlers[i];
            var name = attrHandler[0];
            if (name === 'for' && node.tagName === 'label') {
                continue;
            }
            var attr = node.getAttribute(name);
            if (attr != null) {
                node.removeAttribute(name);
                node = this[name](attr, node) || node;
            }
        }

        return node;
    }
};

coreAttrHandlers.forEach(function(attrHandler) {
    var name = attrHandler[0];
    var func = attrHandler[1];
    Transformer.prototype[name] = func;
});


function handleAttr(node, compiler, template) {
    var parentNode = node.parentNode;
    if (!parentNode.isElementNode()) {
        node.addError(node.toString() + ' tag is not nested within an element tag.');
        return;
    }
    var hasValue = node.hasAttribute('value');
    var attrName = node.getAttribute('name');
    var attrValue = node.getAttribute('value');
    var attrUri = node.getAttribute('namespace') || '';
    var attrPrefix = node.getAttribute('prefix') || '';
    if (parentNode.hasAttributeNS(attrUri, attrName)) {
        node.addError(node.toString() + ' tag adds duplicate attribute with name "' + attrName + '"' + (attrUri ? ' and URI "' + attrUri + '"' : ''));
        return;
    }
    node.removeAttribute('name');
    node.removeAttribute('value');
    node.removeAttribute('namespace');
    node.removeAttribute('prefix');
    if (node.hasAttributesAnyNS()) {
        var invalidAttrs = node.getAllAttributes().map(function (attr) {
                return attr.qName;
            });
        node.addError('Invalid attributes for tag ' + node.toString() + ': ' + invalidAttrs.join(', '));
        return;
    }
    //Cleanup whitespace between <attr> tags
    if (node.previousSibling && node.previousSibling.isTextNode() && node.previousSibling.getText().trim() === '') {
        node.previousSibling.detach();
    }
    if (node.nextSibling && node.nextSibling.isTextNode() && node.nextSibling.getText().trim() === '') {
        node.nextSibling.detach();
    }
    if (node.nextSibling && node.nextSibling.isTextNode()) {
        node.nextSibling.setText(node.nextSibling.getText().replace(/^\n\s*/, ''));
    }
    node.detach();
    //Remove the node out of the tree
    compiler.transformTree(node, template);
    if (hasValue) {
        parentNode.setAttributeNS(attrUri, attrName, attrValue, attrPrefix);
    } else {
        node.setEscapeXmlContext('ATTRIBUTE');
        //Escape body text and expressions as attributes
        parentNode.setAttributeNS(attrUri, attrName, node.getBodyContentExpression(template), attrPrefix, false);
    }
}

function findNestedAttrs(node, compiler, template) {
    node.forEachChild(function (child) {
        if (child.qName === 'attr') {
            handleAttr(child, compiler, template);
        }
    });
}

module.exports = function transform(node, compiler, template) {
    //Find and handle nested <attrs> elements
    findNestedAttrs(node, compiler, template);

    var tag;
    tag = node.tag || compiler.taglibs.getTag(node);

    var transformer = new Transformer(template, compiler, tag);
    node = transformer.transformNode(node);
    var inputAttr = transformer.inputAttr;
    var shouldRemoveAttr = true;

    if (tag) {
        if (tag.renderer || tag.template) {
            node.tag = tag;
        }

        if (tag.preserveWhitespace) {
            node.setPreserveWhitespace(true);
        }

        if (tag.escapeXmlBody === false) {
            node.setEscapeXmlBodyText(false);
        }

        if (tag.renderer || tag.isNestedTag) {
            shouldRemoveAttr = false;

            //Instead of compiling as a static XML element, we'll
            //make the node render as a tag handler node so that
            //writes code that invokes the handler
            TagHandlerNode.convertNode(node, tag);
            if (inputAttr) {
                node.setInputExpression(template.makeExpression(inputAttr));
            }
        } else if (tag.template) {
            shouldRemoveAttr = false;
            var templatePath = compiler.getRequirePath(tag.template);
            // The tag is mapped to a template that will be used to perform
            // the rendering so convert the node into a "IncludeNode" that can
            // be used to include the output of rendering a template
            IncludeNode.convertNode(node, templatePath);
        } else if (tag.nodeClass) {
            shouldRemoveAttr = false;

            var NodeCompilerClass = require(tag.nodeClass);
            compiler.inheritNode(NodeCompilerClass);
            extend(node, NodeCompilerClass.prototype);
            NodeCompilerClass.call(node);
            node.setNodeClass(NodeCompilerClass);
        }
    }

    function handleProp(name, value, attrDef, attr) {
        if (attrDef.setFlag) {
            node.setFlag(attrDef.setFlag);
        }

        if (shouldRemoveAttr && attr) {
            // When an attribute is converted to a property we remove
            // the old attribute and only keep the resulting
            // property in the property map.
            node.removeAttributeNS(attr.namespace, attr.localName);
        }

        if (attrDef.dynamicAttribute) {
            if (attrDef.removeDashes === true) {
                name = removeDashes(name);
            }
            if (node.addDynamicAttribute && attrDef.targetProperty) {
                node.addDynamicAttribute(name, value);
                node.setDynamicAttributesProperty(attrDef.targetProperty);
            } else {
                node.setProperty(name, value);
            }
        } else {
            node.setProperty(name, value);
        }
    }

    function handleAttrs() {
        // Convert tag attributes to JavaScript expressions based on loaded
        // taglibs. Attributes are converted to properties and applied
        // to either the runtime render tag or a compile-time AST Node.

        function convertAttrValue(attr, type, attrDef) {
            type = type || (attrDef ? attrDef.type : 'string') || 'string';

            try {
                return compiler.convertType(attr.value, type, attrDef ? attrDef.allowExpressions !== false : true);
            } catch (e) {
                node.addError('Invalid attribute value of "' + attr.value + '" for attribute "' + attr.name + '": ' + e.message);
                return attr.value;
            }
        }

        var foundProps = {};

        node.forEachAttributeAnyNS(function (attr) {
            var attrDef = compiler.taglibs.getAttribute(node, attr);
            if (!attrDef) {
                if (tag) {
                    // var isAttrForTaglib = compiler.taglibs.isTaglib(attrUri);
                    //Tag doesn't allow dynamic attributes
                    node.addError('The tag "' + tag.name + '" in taglib "' + getTaglibPath(tag.taglibId) + '" does not support attribute "' + attr + '"');
                }
                return;
            }

            if (attrDef.ignore) {
                // Skip attributes that are marked as "ignore" by the
                // taglib author. They'll handle the attribute themselves
                // and we don't need to bother copying it into
                // the properties map
                return;
            }

            var type = attrDef.type || 'string';

            var value;

            if (compiler.isExpression(attr.value)) {
                value = attr.value;
            } else {
                if (type === 'path') {
                    var pathVar;
                    if (compiler.hasExpression(attr.value)) {
                        value = convertAttrValue(
                            attr,
                            'string',
                            attrDef);

                    } else {
                        // Resolve the static string to a full path only once
                        pathVar = template.addStaticVar(attr.value, 'require.resolve(' + compiler.convertType(attr.value, 'string', true) + ')');
                        value = compiler.makeExpression(pathVar);
                    }
                } else if (type === 'template') {
                    template.addStaticVar('__loadTemplate', '__helpers.l');
                    var templateVar;
                    if (compiler.hasExpression(attr.value)) {
                        value = compiler.makeExpression('__loadTemplate(' +
                            convertAttrValue(
                                attr,
                                'string',
                                attrDef) +
                                ', require' + // Include the "require" variable to allow relative paths to be resolved
                            ')');
                    } else {
                        // Resolve the static string to a full path only once
                        templateVar = template.addStaticVar(attr.value, '__loadTemplate(require.resolve(' + compiler.convertType(attr.value, 'string', true) + '), require)');
                        value = compiler.makeExpression(templateVar);
                    }
                } else {
                    value = convertAttrValue(attr, type, attrDef);
                }
            }
            var propName;
            if (attrDef.dynamicAttribute) {
                // Dynamic attributes are allowed attributes
                // that are not declared (i.e. "*" attributes)
                //
                if (attrDef.preserveName === false) {
                    propName = removeDashes(attr.localName);
                } else {
                    propName = attr.qName;
                }



            } else {
                // Attributes map to properties and we allow the taglib
                // author to control how an attribute name resolves
                // to a property name.
                if (attrDef.targetProperty) {
                    propName = attrDef.targetProperty;
                } else if (attrDef.preserveName) {
                    propName = attr.localName;
                } else {
                    propName = removeDashes(attr.localName);
                }
            }

            foundProps[propName] = true;
            handleProp(propName, value, attrDef, attr);
        });

        if (tag) {
            // Add default values for any attributes. If an attribute has a declared
            // default value and the attribute was not found on the element
            // then add the property with the specified default value
            tag.forEachAttribute(function (attrDef) {
                if (attrDef.hasOwnProperty('defaultValue') && !foundProps[attrDef.name]) {
                    handleProp(
                        attrDef.name,
                        template.makeExpression(JSON.stringify(attrDef.defaultValue)),
                        attrDef,
                        null);
                }
            });
        }
    }

    handleAttrs();
};

});
$rmod.def("/marko@2.7.28/taglibs/core/core-text-transformer", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var WriteNode = require('./WriteNode');
var ScriptletNode = require('./ScriptletNode');

module.exports = function transform(node, compiler) {
    if (node.parentNode && node.parentNode.parseBodyText === false) {
        return;    //Don't try to parse expressions
    }
    var parts = [];
    compiler.parseExpression(node.text, {
        text: function (text, escapeXml) {
            parts.push({
                text: text,
                escapeXml: escapeXml
            });
        },
        expression: function (expression, escapeXml) {
            parts.push({
                expression: expression,
                escapeXml: escapeXml
            });
        },
        scriptlet: function (scriptlet) {
            parts.push({ scriptlet: scriptlet });
        },
        error: function (message) {
            node.addError(message);
        }
    });
    if (parts.length > 0) {
        var startIndex = 0;
        if (parts[0].text) {
            node.setText(parts[0].text);
            //Update this text node to match first text part and we'll add the remaining
            node.setEscapeXml(parts[0].escapeXml !== false);
            startIndex = 1;
        } else {
            node.text = '';
            //The first part is an expression so we'll just zero out this text node
            startIndex = 0;
        }
        var newNodes = [];
        for (var i = startIndex, part, newNode; i < parts.length; i++) {
            part = parts[i];
            newNode = null;
            if (part.hasOwnProperty('text')) {
                newNode = compiler.createTextNode(part.text, part.escapeXml !== false);
                newNode.setTransformerApplied(this);    //We shouldn't reprocess the new text node
            } else if (part.hasOwnProperty('expression')) {
                newNode = compiler.createNode(WriteNode, {
                    expression: part.expression,
                    escapeXml: part.escapeXml !== false
                });
            } else if (part.hasOwnProperty('scriptlet')) {
                newNode = compiler.createNode(ScriptletNode, part.scriptlet);
            }
            if (newNode) {
                newNode.setPosition(node.getPosition());
                newNodes.push(newNode);
            }
        }
        if (newNodes.length) {
            node.parentNode.insertAfter(newNodes, node);
        }
    }
};
});
$rmod.def("/marko@2.7.28/taglibs/core/else-tag-transformer", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
module.exports = function transform(node, compiler) {
    var curNode = node.previousSibling;
    var matchingNode;
    var IfNode = compiler.getNodeClass('if');
    var UnlessNode = compiler.getNodeClass('unless');
    var ElseIfNode = compiler.getNodeClass('else-if');
    var whitespaceNodes = [];
    while (curNode) {
        if (curNode.getNodeClass() === ElseIfNode || curNode.getNodeClass() === IfNode || curNode.getNodeClass() === UnlessNode) {
            matchingNode = curNode;
            break;
        } else if (curNode.isTextNode()) {
            var trimmed = curNode.getText().trim();
            if (trimmed !== '') {
                node.addError('Static text "' + trimmed + '" is not allowed before ' + node.toString() + ' tag.');
                return;
            } else {
                whitespaceNodes.push(curNode);
            }
        } else {
            node.addError(curNode + ' is not allowed before ' + node.toString() + ' tag.');
            return;
        }
        curNode = curNode.previousSibling;
    }
    if (!matchingNode) {
        node.addError('<if>, <unless> or <else-if> node not found immediately before ' + node.toString() + ' tag.');
        return;
    }
    whitespaceNodes.forEach(function (whitespaceNode) {
        whitespaceNode.parentNode.removeChild(whitespaceNode);
    });
    matchingNode.hasElse = true;
    node.valid = true;
};

});
$rmod.def("/marko@2.7.28/taglibs/html/CommentTag", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';
module.exports = function render(input, out) {
    out.write('<!--');
    if (input.renderBody) {
        input.renderBody(out);
    }
    out.write('-->');
};

});
$rmod.def("/marko@2.7.28/taglibs/html/DocTypeNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

function DocTypeNode(props) {
    DocTypeNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
DocTypeNode.nodeType = 'element';

DocTypeNode.prototype = {
    doGenerateCode: function (template) {
        var doctype = this.getAttribute('value') || this.getProperty('value');
        template.text('<!DOCTYPE ');
        template.parseExpression(doctype, {
            text: function (text, escapeXml) {
                template.text(text);
            },
            expression: function (expression) {
                template.write(expression);
            },
            error: function (message) {
                this.addError('Invalid doctype: "' + doctype + '". ' + message);
            }
        }, this);
        template.text('>');
    }
};

module.exports = DocTypeNode;
});
$rmod.def("/marko@2.7.28/taglibs/html/HtmlElementNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

function HtmlElementNode(props) {
    HtmlElementNode.$super.call(this);
    if (props) {
        this.setProperties(props);
    }
}
HtmlElementNode.nodeType = 'element';

HtmlElementNode.prototype = {
    doGenerateCode: function (template) {
        this.removeAttribute('tag-name');
        this.localName = this.getProperty('tagName');
        HtmlElementNode.$super.prototype.doGenerateCode.call(this, template);
    },

};

module.exports = HtmlElementNode;
});
$rmod.def("/marko@2.7.28/taglibs/html/html-tag-transformer", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var DocTypeNode = require('./DocTypeNode');

module.exports = function transform(node, compiler) {
    if (node.isElementNode()) {
        var options = compiler.options || {};
        var preserveWhitespace = options.preserveWhitespace || {};
        var allowSelfClosing = options.allowSelfClosing || {};
        var startTagOnly = options.startTagOnly || {};
        var lookupKey = node.namespace ? node.namespace + ':' + node.localName : node.localName;

        if (node.isPreserveWhitespace() == null) {
            if (preserveWhitespace[lookupKey] === true) {
                node.setPreserveWhitespace(true);
            }
        }
        if (allowSelfClosing[lookupKey] === true) {
            node.setAllowSelfClosing(true);
        }
        if (compiler.options.xhtml !== true && startTagOnly[lookupKey] === true) {
            node.setStartTagOnly(true);
        }

        var doctype;

        if (node.getQName() === 'html' && (doctype = node.getProperty('html-doctype'))) {

            var docTypeNode = compiler.createNode(DocTypeNode, {
                    value: doctype,
                    pos: node.getPosition()
                });
            node.parentNode.insertBefore(docTypeNode, node);
        }
    }
};
});
$rmod.dep("/$/marko", "marko-async", "2.0.8");
$rmod.def("/marko-async@2.0.8/AsyncFragmentErrorNode", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';
function AsyncFragmentErrorNode(props) {
  AsyncFragmentErrorNode.$super.call(this, 'async-fragment-error');
    if (props) {
        this.setProperties(props);
    }
}

AsyncFragmentErrorNode.nodeType = 'element';

AsyncFragmentErrorNode.prototype = {
    doGenerateCode: function (template) {
        throw new Error('Illegal State. This node should have been removed');
    }
};

module.exports = AsyncFragmentErrorNode;

});
$rmod.def("/marko-async@2.0.8/AsyncFragmentPlaceholderNode", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';
function AsyncFragmentPlaceholderNode(props) {
    AsyncFragmentPlaceholderNode.$super.call(this, 'async-fragment-placeholder');
    if (props) {
        this.setProperties(props);
    }
}

AsyncFragmentPlaceholderNode.nodeType = 'element';

AsyncFragmentPlaceholderNode.prototype = {
    doGenerateCode: function (template) {
        throw new Error('Illegal State. This node should have been removed');
    }
};

module.exports = AsyncFragmentPlaceholderNode;
});
$rmod.def("/marko-async@2.0.8/AsyncFragmentTimeoutNode", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';
function AsyncFragmentTimeoutNode(props) {
  AsyncFragmentTimeoutNode.$super.call(this, 'async-fragment-timeout');
    if (props) {
        this.setProperties(props);
    }
}

AsyncFragmentTimeoutNode.nodeType = 'element';

AsyncFragmentTimeoutNode.prototype = {
    doGenerateCode: function (template) {
        throw new Error('Illegal State. This node should have been removed');
    }
};

module.exports = AsyncFragmentTimeoutNode;

});
$rmod.def("/marko-async@2.0.8/async-fragment-error-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';

module.exports = function transform(node, compiler, template) {

    var asyncFragmentNode = node.parentNode;

    if (!asyncFragmentNode) {
        template.addError('<async-fragment-error> should be nested directly below an <async-fragment> tag.');
        return;
    }

    // Remove the node from the tree
    node.detach();

    asyncFragmentNode.setProperty('errorMessage', node.getBodyContentExpression(template));
};

});
$rmod.def("/marko-async@2.0.8/async-fragment-placeholder-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';

module.exports = function transform(node, compiler, template) {

    var asyncFragmentNode = node.parentNode;

    // Remove the node from the tree
    node.detach();

    asyncFragmentNode.setProperty('placeholder', node.getBodyContentExpression(template));
};

});
$rmod.def("/marko-async@2.0.8/async-fragment-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';
var varNameRegExp = /^[A-Za-z_][A-Za-z0-9_]*$/;
module.exports = function transform(node, compiler, template) {
    var varName = node.getAttribute('var') || node.getAttribute('data-provider') || node.getAttribute('dependency');
    if (varName) {
        if (!varNameRegExp.test(varName)) {
            node.addError('Invalid variable name of "' + varName + '"');
            return;
        }
    } else {
        node.addError('Either "var" or "data-provider" is required');
        return;
    }


    var argProps = [];
    var propsToRemove = [];

    var hasNameProp = false;
    node.forEachProperty(function (name, value) {
        if (name.startsWith('arg-')) {
            var argName = name.substring('arg-'.length);
            argProps.push(JSON.stringify(argName) + ': ' + value);
            propsToRemove.push(name);
        } else if (name === 'name') {
            hasNameProp = true;
        }
    });

    if (!hasNameProp) {
        var name = node.getAttribute('data-provider');
        node.setProperty('_name', name);
    }

    propsToRemove.forEach(function (propName) {
        node.removeProperty(propName);
    });
    var argString;
    if (argProps.length) {
        argString = '{' + argProps.join(', ') + '}';
    }
    var arg = node.getProperty('arg');
    if (arg) {
        var extendFuncName = template.getStaticHelperFunction('extend', 'xt');
        argString = extendFuncName + '(' + arg + ', ' + argString + ')';
    }
    if (argString) {
        node.setProperty('arg', template.makeExpression(argString));
    }
};

});
$rmod.dep("/$/marko/$/marko-async", "raptor-async", "1.1.2");
$rmod.remap("/marko-async@2.0.8/client-reorder", "client-reorder-browser");
$rmod.def("/marko-async@2.0.8/client-reorder-browser", function(require, exports, module, __filename, __dirname) { exports.isSupported = false;
});
$rmod.def("/marko-async@2.0.8/async-fragment-tag", function(require, exports, module, __filename, __dirname) { 'use strict';

var logger = require('/$/marko/$/raptor-logging'/*'raptor-logging'*/).logger(module);
var asyncWriter = require('/$/marko/$/async-writer'/*'async-writer'*/);
var AsyncValue = require('/$/marko/$/marko-async/$/raptor-async/AsyncValue'/*'raptor-async/AsyncValue'*/);
var isClientReorderSupported = require('./client-reorder').isSupported;

function isPromise(o) {
    return o && typeof o.then === 'function';
}

function promiseToCallback(promise, callback, thisObj) {
    if (callback) {
      var finalPromise = promise
        .then(function(data) {
          callback(null, data);
        });

      if (typeof promise.catch === 'function') {
        finalPromise = finalPromise.catch(function(err) {
          callback(err);
        });
      } else if (typeof promise.fail === 'function') {
        finalPromise = finalPromise.fail(function(err) {
          callback(err);
        });
      }

      if (finalPromise.done) {
        finalPromise.done();
      }
    }

    return promise;
}

function requestData(provider, args, callback, thisObj) {

    if (isPromise(provider)) {
        // promises don't support a scope so we can ignore thisObj
        promiseToCallback(provider, callback);
        return;
    }

    if (typeof provider === 'function') {
        var data = (provider.length === 1) ?
        // one argument so only provide callback to function call
        provider.call(thisObj, callback) :

        // two arguments so provide args and callback to function call
        provider.call(thisObj, args, callback);

        if (data !== undefined) {
            if (isPromise(data)) {
                promiseToCallback(data, callback);
            }
            else {
                callback(null, data);
            }
        }
    } else {
        // Assume the provider is a data object...
        callback(null, provider);
    }
}

module.exports = function render(input, out) {
    var dataProvider = input.dataProvider;
    var arg = input.arg || {};
    arg.out = out;
    var events = out.global.events;

    var clientReorder = isClientReorderSupported && input.clientReorder === true;
    var asyncOut;
    var done = false;
    var timeoutId = null;
    var name = input.name || input._name;
    var scope = input.scope || this;

    function renderBody(err, data, timeoutMessage) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        done = true;

        var targetOut = asyncOut || out;

        events.emit('asyncFragmentBeforeRender', {
            clientReorder: clientReorder,
            out: targetOut,
            name: name
        });

        if (err) {
            if (input.errorMessage) {
                console.error('Async fragment (' + name + ') failed. Error:', (err.stack || err));
                targetOut.write(input.errorMessage);
            } else {
                targetOut.error(err);
            }
        } else if (timeoutMessage) {
            asyncOut.write(timeoutMessage);
        } else {
            if (input.renderBody) {
                input.renderBody(targetOut, data);
            }
        }

        if (!clientReorder) {
            events.emit('asyncFragmentFinish', {
                clientReorder: false,
                out: targetOut
            });
        }

        if (asyncOut) {
            asyncOut.end();

            // Only flush if we rendered asynchronously and we aren't using
            // client-reordering
            if (!clientReorder) {
                out.flush();
            }
        }
    }

    var method = input.method;
    if (method) {
        dataProvider = dataProvider[method].bind(dataProvider);
    }

    requestData(dataProvider, arg, renderBody, scope);

    if (!done) {
        var timeout = input.timeout;
        var timeoutMessage = input.timeoutMessage;

        if (timeout == null) {
            timeout = 10000;
        } else if (timeout <= 0) {
            timeout = null;
        }

        if (timeout != null) {
            timeoutId = setTimeout(function() {
                var message = 'Async fragment (' + name + ') timed out after ' + timeout + 'ms';

                if (timeoutMessage) {
                    logger.error(message);
                    renderBody(null, null, timeoutMessage);
                } else {
                    renderBody(new Error(message));
                }
            }, timeout);
        }

        if (clientReorder) {
            var asyncFragmentContext = out.global.__asyncFragments || (asyncFragmentContext = out.global.__asyncFragments = {
                fragments: [],
                nextId: 0
            });

            var id = input.name || asyncFragmentContext.nextId++;

            out.write('<span id="afph' + id + '">' + (input.placeholder || '') + '</span>');
            var asyncValue = new AsyncValue();

            // Write to an in-memory buffer
            asyncOut = asyncWriter.create(null, {global: out.global});

            asyncOut
                .on('finish', function() {
                    asyncValue.resolve(asyncOut.getOutput());
                })
                .on('error', function(err) {
                    asyncValue.reject(err);
                });

            var fragmentInfo = {
                id: id,
                asyncValue: asyncValue,
                out: asyncOut,
                after: input.showAfter
            };

            if (asyncFragmentContext.fragments) {
                asyncFragmentContext.fragments.push(fragmentInfo);
            } else {
                events.emit('asyncFragmentBegin', fragmentInfo);
            }

        } else {
            out.flush(); // Flush everything up to this async fragment
            asyncOut = out.beginAsync({
                timeout: 0, // We will use our code for controlling timeout
                name: name
            });
        }
    }
};

});
$rmod.def("/marko-async@2.0.8/async-fragment-timeout-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';

module.exports = function transform(node, compiler, template) {

    var asyncFragmentNode = node.parentNode;

    // Remove the node from the tree
    node.detach();

    asyncFragmentNode.setProperty('timeoutMessage', node.getBodyContentExpression(template));
};

});
$rmod.def("/marko-async@2.0.8/async-fragments-tag", function(require, exports, module, __filename, __dirname) { var clientReorder = require('./client-reorder');

module.exports = function(input, out) {
    var global = out.global;
    var events = global.events;

    out.flush();

    var asyncOut = out.beginAsync({ last: true, timeout: -1 });
    out.onLast(function(next) {
        var asyncFragmentsContext = global.__asyncFragments;

        if (!asyncFragmentsContext || !asyncFragmentsContext.fragments.length) {
            asyncOut.end();
            next();
            return;
        }

        var remaining = asyncFragmentsContext.fragments.length;

        var done = false;

        function handleAsyncFragment(af) {
            af.asyncValue.done(function(err, html) {
                if (done) {
                    return;
                }

                if (err) {
                    done = true;
                    return asyncOut.error(err);
                }

                if (!global._afRuntime) {
                    asyncOut.write(clientReorder.getCode());
                    global._afRuntime = true;
                }

                asyncOut.write('<div id="af' + af.id + '" style="display:none">' +
                    html +
                    '</div>' +
                    '<script type="text/javascript">$af(' + (typeof af.id === 'number' ? af.id : '"' + af.id + '"') + (af.after ? (',"' + af.after + '"') : '' ) + ')</script>');

                af.out.writer = asyncOut.writer;

                events.emit('asyncFragmentFinish', {
                    clientReorder: true,
                    out: af.out
                });

                out.flush();

                if (--remaining === 0) {
                    done = true;
                    asyncOut.end();
                    next();
                }
            });
        }

        asyncFragmentsContext.fragments.forEach(handleAsyncFragment);

        events.on('asyncFragmentBegin', function(af) {
            remaining++;
            handleAsyncFragment(af);
        });

        // Now that we have a listener attached, we want to receive any additional
        // out-of-sync fragments via an event
        delete asyncFragmentsContext.fragments;
    });
};
});
$rmod.def("/marko-async@2.0.8/client-reorder-runtime", function(require, exports, module, __filename, __dirname) { function $af(id, after, doc, sourceEl, targetEl, docFragment, childNodes, i, len, af) {
    af = $af;

    if (after && !af[after]) {
        (af[(after = after + '$')] || (af[after] = [])).push(id);
    } else {
        doc = document;
        sourceEl = doc.getElementById('af' + id);
        targetEl = doc.getElementById('afph' + id);
        docFragment = doc.createDocumentFragment();
        childNodes = sourceEl.childNodes;
        i = 0;
        len=childNodes.length;

        for (; i<len; i++) {
            docFragment.appendChild(childNodes.item(0));
        }

        targetEl.parentNode.replaceChild(docFragment, targetEl);
        af[id] = 1;

        after = af[id + '$'];

        if (after) {
            i = 0;
            len = after.length;

            for (; i<len; i++) {
                af(after[i]);
            }
        }
    }

    // sourceEl.parentNode.removeChild(sourceEl);
}
});
$rmod.def("/marko-async@2.0.8/client-reorder-runtime.min", function(require, exports, module, __filename, __dirname) { function $af(d,a,e,l,g,h,k,b,f,c){c=$af;if(a&&!c[a])(c[a+="$"]||(c[a]=[])).push(d);else{e=document;l=e.getElementById("af"+d);g=e.getElementById("afph"+d);h=e.createDocumentFragment();k=l.childNodes;b=0;for(f=k.length;b<f;b++)h.appendChild(k.item(0));g.parentNode.replaceChild(h,g);c[d]=1;if(a=c[d+"$"])for(b=0,f=a.length;b<f;b++)c(a[b])}};
});
$rmod.dep("/$/marko", "marko-layout", "2.0.2");
$rmod.main("/path-browserify@0.0.0", "index");
$rmod.dep("", "path-browserify", "0.0.0", "path");
$rmod.dep("", "path-browserify", "0.0.0");
$rmod.def("/path-browserify@0.0.0/index", function(require, exports, module, __filename, __dirname) { var process=require("process"); // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

});
$rmod.main("/raptor-strings@1.0.2/StringBuilder", "../lib/StringBuilder");
$rmod.def("/marko@2.7.28/compiler/TemplateBuilder", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var nodePath = require('path-browserify'/*'path'*/);
var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/);
var StringBuilder = require('/$/marko/$/raptor-strings/StringBuilder'/*'raptor-strings/StringBuilder'*/);
var Expression = require('./Expression');
var arrayFromArguments = require('/$/marko/$/raptor-util'/*'raptor-util'*/).arrayFromArguments;
var INDENT = '  ';

function writeArg(writer, arg) {
    if (typeof arg === 'string') {
        writer._code.append(arg);
    } else if (typeof arg === 'boolean') {
        writer._code.append(arg ? 'true' : 'false');
    } else if (typeof arg === 'function') {
        arg();
    } else if (arg instanceof Expression) {
        writer._code.append( arg.toString() );
    } else if (arg) {
        writer._code.append(arg.toString());
    } else {
        throw createError(new Error('Illegal arg: ' + arg.toString()));
    }
}

function writeArgs(writer, args) {
    for (var i=0, len=args.length; i<len; i++) {
        var arg = args[i];
        if (i !== 0) {
            writer._code.append(', ');
        }

        writeArg(writer, arg);
    }
}


function safeVarName(varName) {
    return varName.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[0-9]+/, function(match) {
        var str = '';
        for (var i=0; i<match.length; i++) {
            str += '_';
        }
        return str;
    });
}


/**
 * This class is used internally to manage how code and static text is added
 * to the compiled text. It has logic to group up contiguous blocks of static
 * text so that the static text is written out as a single string. It will
 * also change writes.
 *
 *  For example:
 *  	out.w('foo')
 *  	   .w('bar')
 *
 *  Instead of:
 *      out.w('foo');
 *      out.w('bar');
 *
 */
function CodeWriter(concatWrites, indent) {
    this._indent = indent != null ? indent : INDENT + INDENT;
    this._code = new StringBuilder();
    this.firstStatement = true;
    this._bufferedText = null;
    this._bufferedWrites = null;
    this.concatWrites = concatWrites;
}
CodeWriter.prototype = {
    write: function (expression) {
        this.flushText();
        if (!this._bufferedWrites) {
            this._bufferedWrites = [];
        }

        this._bufferedWrites.push(expression);


    },
    text: function (text) {
        if (this._bufferedText === null) {
            this._bufferedText = text;
        } else {
            this._bufferedText += text;
        }
    },
    functionCall: function (varName, args) {
        this.flush();
        this._code.append(this._indent + varName + '(');
        writeArgs(this, args);
        this._code.append(');\n');
    },
    code: function (code) {
        if (typeof code === 'function') {
            code = code();
        }

        this.flush();
        this._code.append(code);
    },
    statement: function (code) {
        this.flush();
        this.code((this.firstStatement ? '' : '\n') + this._indent + code + '\n');
        this.firstStatement = false;
    },
    line: function (code) {
        this.code(this._indent + code + '\n');
    },
    indentStr: function (delta) {
        if (arguments.length === 0) {
            return this._indent;
        } else {
            var indent = this._indent;
            for (var i = 0; i < delta; i++) {
                indent += INDENT;
            }
            return indent;
        }
    },
    indent: function () {
        if (arguments.length === 0) {
            this.code(this._indent);
        } else if (arguments.length === 1 && typeof arguments[0] === 'number') {
            this.code(this.indentStr(arguments[0]));
        } else if (typeof arguments[0] === 'function' || typeof arguments[1] === 'function') {
            var func;
            var thisObj;
            var delta;
            if (typeof arguments[0] === 'function') {
                delta = 1;
                func = arguments[0];
                thisObj = arguments[1];
            } else {
                delta = arguments[0];
                func = arguments[1];
                thisObj = arguments[2];
            }
            this.incIndent(delta);
            func.call(thisObj, this);
            this.decIndent(delta);
        } else if (typeof arguments[0] === 'string') {
            this.code(this._indent + arguments[0]);
        }
        return this;
    },
    flush: function () {
        this.flushText();
        this.flushWrites();
    },
    flushText: function () {
        var curText = this._bufferedText;
        if (curText) {
            this._bufferedText = null;
            this.write(stringify(curText, { useSingleQuote: true }));
        }
    },
    flushWrites: function () {
        var _this = this;
        var code = this._code;

        function concat() {

            code.append(_this.indentStr() + 'out.w(');

            _bufferedWrites.forEach(function (expression, i) {
                if (i !== 0) {
                    _this.incIndent();
                    code.append(' +\n' + this.indentStr());
                }

                writeArg(_this, expression);

                if (i !== 0) {
                    _this.decIndent();
                }
            }, _this);

            code.append(');\n');
        }

        function chain() {
            _bufferedWrites.forEach(function (arg, i) {

                if (i === 0) {
                    this._code.append(this.indentStr() + 'out.w(');
                } else {
                    this.incIndent();
                    this._code.append(this.indentStr() + '.w(');
                }

                writeArg(this, arg);

                if (i < _bufferedWrites.length - 1) {
                    this._code.append(')\n');
                } else {
                    this._code.append(');\n');
                }
                if (i !== 0) {
                    this.decIndent();
                }
            }, _this);
        }

        var _bufferedWrites = this._bufferedWrites;
        if (_bufferedWrites) {
            if (!this.firstStatement) {
                this._code.append('\n');
            }
            this.firstStatement = false;
            this._bufferedWrites = null;
            if (this.concatWrites) {
                concat();
            } else {
                chain();
            }

        }
    },
    incIndent: function (delta) {
        if (arguments.length === 0) {
            delta = 1;
        }
        this.flush();
        this._indent = this.indentStr(delta);
        this.firstStatement = true;
    },
    decIndent: function (delta) {
        if (arguments.length === 0) {
            delta = 1;
        }
        this.flush();
        this._indent = this._indent.substring(INDENT.length * delta);
        this.firstStatement = false;
    },
    getOutput: function () {
        this.flush();
        return this._code.toString();
    }
};

/**
 * This class provides the interface that compile-time transformers
 * and compile-time tags can use to add JavaScript code to the final
 * template.
 *
 * This class ensures that proper indentation is maintained so that
 * compiled templates are readable.
 */
function TemplateBuilder(compiler, path, rootNode) {
    this.rootNode = rootNode; // This is the root node for the AST. It should be a TemplateNode
    this.compiler = compiler; // A reference to the compiler
    this.path = path; // The file system path of the template being compiled
    this.dirname = nodePath.dirname(path); // The file system directory of the template being compiled
    this.options = compiler.options || {}; // Compiler options
    this.data = this.attributes /* deprecated */ = {};
    this.concatWrites = this.options.concatWrites !== false;
    this.writer = new CodeWriter(this.concatWrites);
    this.staticVars = [];
    this.staticVarsLookup = {};
    this.helperFunctionsAdded = {};
    this.vars = [];
    this.varsLookup = {};
    this.staticCode = [];

    this.getStaticHelperFunction('str', 's');
    this.getStaticHelperFunction('empty', 'e');
    this.getStaticHelperFunction('notEmpty', 'ne');
}

TemplateBuilder.prototype = {

    captureCode: function (func, thisObj) {
        var oldWriter = this.writer;
        var newWriter = new CodeWriter(this.concatWrites, oldWriter.indentStr());
        try {
            this.writer = newWriter;
            var value = func.call(thisObj);
            return value == null ? newWriter.getOutput() : value;
        } finally {
            this.writer = oldWriter;
        }
    },
    getStaticHelperFunction: function (varName, propName) {

        var added = this.helperFunctionsAdded[propName];
        if (added) {
            return added;
        } else {
            this.addStaticVar(varName, '__helpers.' + propName);
            this.helperFunctionsAdded[propName] = varName;
            return varName;
        }
    },
    addStaticCode: function(codeOrFunc) {
        this.staticCode.push(codeOrFunc);
    },

    _getStaticCode: function() {

        var staticCodeList = this.staticCode;

        if (!staticCodeList.length) {
            return;
        }

        var codeWriter = new CodeWriter(this.concatWrites, INDENT);
        codeWriter.code('\n');

        for (var i=0, len=staticCodeList.length; i<len; i++) {
            var code = staticCodeList[i];
            if (typeof code === 'function') {
                var result = code(codeWriter);
                if (result != null) {
                    codeWriter.code(result.toString());
                }
            } else {
                codeWriter.code(code.toString());
            }
        }

        return codeWriter.getOutput();
    },
    hasStaticVar: function (name) {
        return this.staticVarsLookup[name] === true;
    },
    addStaticVar: function (name, expression) {
        name = safeVarName(name);

        if (!this.staticVarsLookup.hasOwnProperty(name)) {
            this.staticVarsLookup[name] = true;
            this.staticVars.push({
                name: name,
                expression: expression
            });
        }
        return name;
    },
    hasVar: function (name) {
        return this.vars[name] === true;
    },
    addVar: function (name, expression) {
        name = safeVarName(name);

        this.vars[name] = true;
        this.vars.push({
            name: name,
            expression: expression
        });
    },
    _writeVars: function (vars, out, indent) {
        if (!vars.length) {
            return;
        }
        out.append(indent + 'var ');
        var declarations = [];
        vars.forEach(function (v, i) {
            declarations.push((i !== 0 ? indent + '    ' : '') + v.name + ' = ' + v.expression + (i === vars.length - 1 ? ';\n' : ',\n'));
        });
        out.append(declarations.join(''));
    },
    text: function (text) {
        if (!this.hasErrors()) {
            this.writer.text(text);
        }
        return this;
    },
    attr: function (name, valueExpression, escapeXml) {
        if (!this.hasErrors()) {
            var expression;

            if (escapeXml === false) {
                expression = this.getStaticHelperFunction('attr', 'a') + '(' + stringify(name) + ', ' + valueExpression + ', false)';
            } else {
                expression = this.getStaticHelperFunction('attr', 'a') + '(' + stringify(name) + ', ' + valueExpression + ')';
            }

            this.write(expression);
        }

        return this;
    },
    attrs: function (attrsExpression) {
        if (!this.hasErrors()) {
            var expression = this.getStaticHelperFunction('attrs', 'as') + '(' + attrsExpression + ')';
            this.write(expression);
        }
        return this;
    },
    include: function (templatePath, dataExpression) {
        if (!this.hasErrors()) {

            if (typeof templatePath === 'string') {
                var templateVar;
                if (!this.hasExpression(templatePath)) {
                    // Resolve the static string to a full path only once
                    templateVar = this.addStaticVar(templatePath, '__helpers.l(require.resolve(' + this.compiler.convertType(templatePath, 'string', true) + '))');
                    this.statement(this.makeExpression(templateVar + '.render(' + dataExpression + ', out);'));
                    return;
                }
            }

            this.contextHelperMethodCall(
                'i',
                typeof templatePath === 'string' ?
                    this.compiler.convertType(templatePath, 'string', true) :
                    templatePath,
                dataExpression);
        }
        return this;
    },
    load: function (templatePath) {
        if (!this.hasErrors()) {
            this.contextHelperMethodCall('l', new Expression('require.resolve(' + templatePath + ')'));
        }
        return this;
    },
    functionCall: function(varName, args) {
        if (!this.hasErrors()) {
            args = arrayFromArguments(arguments, 1);
            this.writer.functionCall(varName, args);
        }
        return this;
    },
    contextHelperMethodCall: function (methodName, args) {
        if (!this.hasErrors()) {
            args = arrayFromArguments(arguments, 1);
            args.unshift('out');
            this.writer.functionCall('__helpers.' + methodName, args);
        }
        return this;
    },
    getEscapeXmlFunction: function() {
        return this.getStaticHelperFunction('escapeXml', 'x');
    },
    getEscapeXmlAttrFunction: function() {
        return this.getStaticHelperFunction('escapeXmlAttr', 'xa');
    },
    write: function (expression, options) {
        if (!this.hasErrors()) {
            if (options) {
                if (options.escapeXml) {
                    expression = this.getEscapeXmlFunction() + '(' + expression + ')';
                } else if (options.escapeXmlAttr) {
                    expression = this.getEscapeXmlAttrFunction() + '(' + expression + ')';
                }
            }
            this.writer.write(expression);
        }
        return this;
    },
    incIndent: function () {
        if (!this.hasErrors()) {
            this.writer.incIndent.apply(this.writer, arguments);
        }
        return this;
    },
    decIndent: function () {
        if (!this.hasErrors()) {
            this.writer.decIndent.apply(this.writer, arguments);
        }
        return this;
    },
    code: function (code) {
        if (!this.hasErrors()) {
            this.writer.code(code);
        }
        return this;
    },
    statement: function (code) {
        if (!this.hasErrors()) {
            this.writer.statement(code);
        }
        return this;
    },
    line: function (code) {
        if (!this.hasErrors()) {
            this.writer.line(code);
        }
        return this;
    },
    indentStr: function (delta) {
        return this.writer.indentStr(delta);
    },
    indent: function () {
        if (!this.hasErrors()) {
            this.writer.indent.apply(this.writer, arguments);
        }
        return this;
    },
    getPath: function () {
        return this.path;
    },
    getOutput: function () {
        if (this.hasErrors()) {
            return '';
        }
        var out = new StringBuilder();

        var params = this.params;
        if (params) {
            params = ['out'].concat(params);
        } else {
            params = ['out'];
        }

        // Don't use "use strict" in compiled templates since it
        // could break backwards compatibility.
        // out.append('"use strict";\n');

        out.append('function create(__helpers) {\n');
        //Write out the static variables
        this.writer.flush();
        this._writeVars(this.staticVars, out, INDENT);

        var staticCode = this._getStaticCode();
        if (staticCode) {
            out.append(staticCode);
        }

        out.append('\n' + INDENT + 'return function render(data, out) {\n');
        //Write out the render variables
        if (this.vars && this.vars.length) {
            this._writeVars(this.vars, out, INDENT + INDENT);
            out.append('\n');
        }
        out.append(this.writer.getOutput());
        // We generate code that assign a partially Template instance to module.exports
        // and then we fully initialize the Template instance. This was done to avoid
        // problems with circular dependencies.
        out.append(INDENT + '};\n}\n(module.exports = require("marko").c(__filename)).c(create);');
        return out.toString();
    },
    makeExpression: function (expression, replaceSpecialOperators) {
        return this.compiler.makeExpression(expression, replaceSpecialOperators);
    },
    hasExpression: function (str) {
        return this.compiler.hasExpression(str);
    },
    isExpression: function (expression) {
        return this.compiler.isExpression(expression);
    },
    parseExpression: function(str, listeners, options) {
        return this.compiler.parseExpression(str, listeners, options);
    },
    parseAttribute: function(attr, types, options) {
        return this.compiler.parseAttribute(attr, types, options);
    },
    getAttribute: function (name) {
        return this.attributes[name];
    },
    setAttribute: function (name, value) {
        this.attributes[name] = value;
        return value;
    },
    hasErrors: function () {
        return this.compiler.hasErrors();
    },
    addError: function (message, pos) {
        this.compiler.addError(message, pos);
    },
    getErrors: function () {
        return this.compiler.getErrors();
    },
    getNodeClass: function (namespace, localName) {
        return this.compiler.getNodeClass(namespace, localName);
    },
    transformTree: function (node) {
        this.compiler.transformTree(node, this);
    },
    getRequirePath: function(targetModuleFile) {
        return this.compiler.getRequirePath(targetModuleFile);
    },
    INDENT: INDENT
};
module.exports = TemplateBuilder;

});
$rmod.main("/htmlparser2@3.8.3", "lib/index");
$rmod.dep("/$/marko", "htmlparser2", "3.8.3");
$rmod.main("/util@0.10.3", "util");
$rmod.dep("", "util", "0.10.3");
$rmod.remap("/util@0.10.3/support/isBuffer", "isBufferBrowser");
$rmod.def("/util@0.10.3/support/isBufferBrowser", function(require, exports, module, __filename, __dirname) { module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
});
$rmod.main("/inherits@2.0.1", "inherits");
$rmod.dep("", "inherits", "2.0.1");
$rmod.remap("/inherits@2.0.1/inherits", "inherits_browser");
$rmod.def("/inherits@2.0.1/inherits_browser", function(require, exports, module, __filename, __dirname) { if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

});
$rmod.def("/util@0.10.3/util", function(require, exports, module, __filename, __dirname) { var process=require("process"); // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits'/*'inherits'*/);

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

});
$rmod.def("/htmlparser2@3.8.3/lib/Parser", function(require, exports, module, __filename, __dirname) { var Tokenizer = require("./Tokenizer.js");

/*
	Options:

	xmlMode: Disables the special behavior for script/style tags (false by default)
	lowerCaseAttributeNames: call .toLowerCase for each attribute name (true if xmlMode is `false`)
	lowerCaseTags: call .toLowerCase for each tag name (true if xmlMode is `false`)
*/

/*
	Callbacks:

	oncdataend,
	oncdatastart,
	onclosetag,
	oncomment,
	oncommentend,
	onerror,
	onopentag,
	onprocessinginstruction,
	onreset,
	ontext
*/

var formTags = {
	input: true,
	option: true,
	optgroup: true,
	select: true,
	button: true,
	datalist: true,
	textarea: true
};

var openImpliesClose = {
	tr      : { tr:true, th:true, td:true },
	th      : { th:true },
	td      : { thead:true, th:true, td:true },
	body    : { head:true, link:true, script:true },
	li      : { li:true },
	p       : { p:true },
	h1      : { p:true },
	h2      : { p:true },
	h3      : { p:true },
	h4      : { p:true },
	h5      : { p:true },
	h6      : { p:true },
	select  : formTags,
	input   : formTags,
	output  : formTags,
	button  : formTags,
	datalist: formTags,
	textarea: formTags,
	option  : { option:true },
	optgroup: { optgroup:true }
};

var voidElements = {
	__proto__: null,
	area: true,
	base: true,
	basefont: true,
	br: true,
	col: true,
	command: true,
	embed: true,
	frame: true,
	hr: true,
	img: true,
	input: true,
	isindex: true,
	keygen: true,
	link: true,
	meta: true,
	param: true,
	source: true,
	track: true,
	wbr: true,

	//common self closing svg elements
	path: true,
	circle: true,
	ellipse: true,
	line: true,
	rect: true,
	use: true,
	stop: true,
	polyline: true,
	polygon: true
};

var re_nameEnd = /\s|\//;

function Parser(cbs, options){
	this._options = options || {};
	this._cbs = cbs || {};

	this._tagname = "";
	this._attribname = "";
	this._attribvalue = "";
	this._attribs = null;
	this._stack = [];

	this.startIndex = 0;
	this.endIndex = null;

	this._lowerCaseTagNames = "lowerCaseTags" in this._options ?
									!!this._options.lowerCaseTags :
									!this._options.xmlMode;
	this._lowerCaseAttributeNames = "lowerCaseAttributeNames" in this._options ?
									!!this._options.lowerCaseAttributeNames :
									!this._options.xmlMode;

	this._tokenizer = new Tokenizer(this._options, this);

	if(this._cbs.onparserinit) this._cbs.onparserinit(this);
}

require('util'/*"util"*/).inherits(Parser, require('/$/marko/$/events'/*"events"*/).EventEmitter);

Parser.prototype._updatePosition = function(initialOffset){
	if(this.endIndex === null){
		if(this._tokenizer._sectionStart <= initialOffset){
			this.startIndex = 0;
		} else {
			this.startIndex = this._tokenizer._sectionStart - initialOffset;
		}
	}
	else this.startIndex = this.endIndex + 1;
	this.endIndex = this._tokenizer.getAbsoluteIndex();
};

//Tokenizer event handlers
Parser.prototype.ontext = function(data){
	this._updatePosition(1);
	this.endIndex--;

	if(this._cbs.ontext) this._cbs.ontext(data);
};

Parser.prototype.onopentagname = function(name){
	if(this._lowerCaseTagNames){
		name = name.toLowerCase();
	}

	this._tagname = name;

	if(!this._options.xmlMode && name in openImpliesClose) {
		for(
			var el;
			(el = this._stack[this._stack.length - 1]) in openImpliesClose[name];
			this.onclosetag(el)
		);
	}

	if(this._options.xmlMode || !(name in voidElements)){
		this._stack.push(name);
	}

	if(this._cbs.onopentagname) this._cbs.onopentagname(name);
	if(this._cbs.onopentag) this._attribs = {};
};

Parser.prototype.onopentagend = function(){
	this._updatePosition(1);

	if(this._attribs){
		if(this._cbs.onopentag) this._cbs.onopentag(this._tagname, this._attribs);
		this._attribs = null;
	}

	if(!this._options.xmlMode && this._cbs.onclosetag && this._tagname in voidElements){
		this._cbs.onclosetag(this._tagname);
	}

	this._tagname = "";
};

Parser.prototype.onclosetag = function(name){
	this._updatePosition(1);

	if(this._lowerCaseTagNames){
		name = name.toLowerCase();
	}

	if(this._stack.length && (!(name in voidElements) || this._options.xmlMode)){
		var pos = this._stack.lastIndexOf(name);
		if(pos !== -1){
			if(this._cbs.onclosetag){
				pos = this._stack.length - pos;
				while(pos--) this._cbs.onclosetag(this._stack.pop());
			}
			else this._stack.length = pos;
		} else if(name === "p" && !this._options.xmlMode){
			this.onopentagname(name);
			this._closeCurrentTag();
		}
	} else if(!this._options.xmlMode && (name === "br" || name === "p")){
		this.onopentagname(name);
		this._closeCurrentTag();
	}
};

Parser.prototype.onselfclosingtag = function(){
	if(this._options.xmlMode || this._options.recognizeSelfClosing){
		this._closeCurrentTag();
	} else {
		this.onopentagend();
	}
};

Parser.prototype._closeCurrentTag = function(){
	var name = this._tagname;

	this.onopentagend();

	//self-closing tags will be on the top of the stack
	//(cheaper check than in onclosetag)
	if(this._stack[this._stack.length - 1] === name){
		if(this._cbs.onclosetag){
			this._cbs.onclosetag(name);
		}
		this._stack.pop();
	}
};

Parser.prototype.onattribname = function(name){
	if(this._lowerCaseAttributeNames){
		name = name.toLowerCase();
	}
	this._attribname = name;
};

Parser.prototype.onattribdata = function(value){
	this._attribvalue += value;
};

Parser.prototype.onattribend = function(){
	if(this._cbs.onattribute) this._cbs.onattribute(this._attribname, this._attribvalue);
	if(
		this._attribs &&
		!Object.prototype.hasOwnProperty.call(this._attribs, this._attribname)
	){
		this._attribs[this._attribname] = this._attribvalue;
	}
	this._attribname = "";
	this._attribvalue = "";
};

Parser.prototype._getInstructionName = function(value){
	var idx = value.search(re_nameEnd),
	    name = idx < 0 ? value : value.substr(0, idx);

	if(this._lowerCaseTagNames){
		name = name.toLowerCase();
	}

	return name;
};

Parser.prototype.ondeclaration = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = this._getInstructionName(value);
		this._cbs.onprocessinginstruction("!" + name, "!" + value);
	}
};

Parser.prototype.onprocessinginstruction = function(value){
	if(this._cbs.onprocessinginstruction){
		var name = this._getInstructionName(value);
		this._cbs.onprocessinginstruction("?" + name, "?" + value);
	}
};

Parser.prototype.oncomment = function(value){
	this._updatePosition(4);

	if(this._cbs.oncomment) this._cbs.oncomment(value);
	if(this._cbs.oncommentend) this._cbs.oncommentend();
};

Parser.prototype.oncdata = function(value){
	this._updatePosition(1);

	if(this._options.xmlMode || this._options.recognizeCDATA){
		if(this._cbs.oncdatastart) this._cbs.oncdatastart();
		if(this._cbs.ontext) this._cbs.ontext(value);
		if(this._cbs.oncdataend) this._cbs.oncdataend();
	} else {
		this.oncomment("[CDATA[" + value + "]]");
	}
};

Parser.prototype.onerror = function(err){
	if(this._cbs.onerror) this._cbs.onerror(err);
};

Parser.prototype.onend = function(){
	if(this._cbs.onclosetag){
		for(
			var i = this._stack.length;
			i > 0;
			this._cbs.onclosetag(this._stack[--i])
		);
	}
	if(this._cbs.onend) this._cbs.onend();
};


//Resets the parser to a blank state, ready to parse a new HTML document
Parser.prototype.reset = function(){
	if(this._cbs.onreset) this._cbs.onreset();
	this._tokenizer.reset();

	this._tagname = "";
	this._attribname = "";
	this._attribs = null;
	this._stack = [];

	if(this._cbs.onparserinit) this._cbs.onparserinit(this);
};

//Parses a complete HTML document and pushes it to the handler
Parser.prototype.parseComplete = function(data){
	this.reset();
	this.end(data);
};

Parser.prototype.write = function(chunk){
	this._tokenizer.write(chunk);
};

Parser.prototype.end = function(chunk){
	this._tokenizer.end(chunk);
};

Parser.prototype.pause = function(){
	this._tokenizer.pause();
};

Parser.prototype.resume = function(){
	this._tokenizer.resume();
};

//alias for backwards compat
Parser.prototype.parseChunk = Parser.prototype.write;
Parser.prototype.done = Parser.prototype.end;

module.exports = Parser;

});
$rmod.main("/domhandler@2.3.0", "index");
$rmod.dep("/$/marko/$/htmlparser2", "domhandler", "2.3.0");
$rmod.def("/domhandler@2.3.0/lib/node", function(require, exports, module, __filename, __dirname) { // This object will be used as the prototype for Nodes when creating a
// DOM-Level-1-compliant structure.
var NodePrototype = module.exports = {
	get firstChild() {
		var children = this.children;
		return children && children[0] || null;
	},
	get lastChild() {
		var children = this.children;
		return children && children[children.length - 1] || null;
	},
	get nodeType() {
		return nodeTypes[this.type] || nodeTypes.element;
	}
};

var domLvl1 = {
	tagName: "name",
	childNodes: "children",
	parentNode: "parent",
	previousSibling: "prev",
	nextSibling: "next",
	nodeValue: "data"
};

var nodeTypes = {
	element: 1,
	text: 3,
	cdata: 4,
	comment: 8
};

Object.keys(domLvl1).forEach(function(key) {
	var shorthand = domLvl1[key];
	Object.defineProperty(NodePrototype, key, {
		get: function() {
			return this[shorthand] || null;
		},
		set: function(val) {
			this[shorthand] = val;
			return val;
		}
	});
});

});
$rmod.def("/domhandler@2.3.0/lib/element", function(require, exports, module, __filename, __dirname) { // DOM-Level-1-compliant structure
var NodePrototype = require('./node');
var ElementPrototype = module.exports = Object.create(NodePrototype);

var domLvl1 = {
	tagName: "name"
};

Object.keys(domLvl1).forEach(function(key) {
	var shorthand = domLvl1[key];
	Object.defineProperty(ElementPrototype, key, {
		get: function() {
			return this[shorthand] || null;
		},
		set: function(val) {
			this[shorthand] = val;
			return val;
		}
	});
});

});
$rmod.def("/domhandler@2.3.0/index", function(require, exports, module, __filename, __dirname) { var ElementType = require('/$/marko/$/htmlparser2/$/domelementtype'/*"domelementtype"*/);

var re_whitespace = /\s+/g;
var NodePrototype = require("./lib/node");
var ElementPrototype = require("./lib/element");

function DomHandler(callback, options, elementCB){
	if(typeof callback === "object"){
		elementCB = options;
		options = callback;
		callback = null;
	} else if(typeof options === "function"){
		elementCB = options;
		options = defaultOpts;
	}
	this._callback = callback;
	this._options = options || defaultOpts;
	this._elementCB = elementCB;
	this.dom = [];
	this._done = false;
	this._tagStack = [];
	this._parser = this._parser || null;
}

//default options
var defaultOpts = {
	normalizeWhitespace: false, //Replace all whitespace with single spaces
	withStartIndices: false, //Add startIndex properties to nodes
};

DomHandler.prototype.onparserinit = function(parser){
	this._parser = parser;
};

//Resets the handler back to starting state
DomHandler.prototype.onreset = function(){
	DomHandler.call(this, this._callback, this._options, this._elementCB);
};

//Signals the handler that parsing is done
DomHandler.prototype.onend = function(){
	if(this._done) return;
	this._done = true;
	this._parser = null;
	this._handleCallback(null);
};

DomHandler.prototype._handleCallback =
DomHandler.prototype.onerror = function(error){
	if(typeof this._callback === "function"){
		this._callback(error, this.dom);
	} else {
		if(error) throw error;
	}
};

DomHandler.prototype.onclosetag = function(){
	//if(this._tagStack.pop().name !== name) this._handleCallback(Error("Tagname didn't match!"));
	var elem = this._tagStack.pop();
	if(this._elementCB) this._elementCB(elem);
};

DomHandler.prototype._addDomElement = function(element){
	var parent = this._tagStack[this._tagStack.length - 1];
	var siblings = parent ? parent.children : this.dom;
	var previousSibling = siblings[siblings.length - 1];

	element.next = null;

	if(this._options.withStartIndices){
		element.startIndex = this._parser.startIndex;
	}

	if (this._options.withDomLvl1) {
		element.__proto__ = element.type === "tag" ? ElementPrototype : NodePrototype;
	}

	if(previousSibling){
		element.prev = previousSibling;
		previousSibling.next = element;
	} else {
		element.prev = null;
	}

	siblings.push(element);
	element.parent = parent || null;
};

DomHandler.prototype.onopentag = function(name, attribs){
	var element = {
		type: name === "script" ? ElementType.Script : name === "style" ? ElementType.Style : ElementType.Tag,
		name: name,
		attribs: attribs,
		children: []
	};

	this._addDomElement(element);

	this._tagStack.push(element);
};

DomHandler.prototype.ontext = function(data){
	//the ignoreWhitespace is officially dropped, but for now,
	//it's an alias for normalizeWhitespace
	var normalize = this._options.normalizeWhitespace || this._options.ignoreWhitespace;

	var lastTag;

	if(!this._tagStack.length && this.dom.length && (lastTag = this.dom[this.dom.length-1]).type === ElementType.Text){
		if(normalize){
			lastTag.data = (lastTag.data + data).replace(re_whitespace, " ");
		} else {
			lastTag.data += data;
		}
	} else {
		if(
			this._tagStack.length &&
			(lastTag = this._tagStack[this._tagStack.length - 1]) &&
			(lastTag = lastTag.children[lastTag.children.length - 1]) &&
			lastTag.type === ElementType.Text
		){
			if(normalize){
				lastTag.data = (lastTag.data + data).replace(re_whitespace, " ");
			} else {
				lastTag.data += data;
			}
		} else {
			if(normalize){
				data = data.replace(re_whitespace, " ");
			}

			this._addDomElement({
				data: data,
				type: ElementType.Text
			});
		}
	}
};

DomHandler.prototype.oncomment = function(data){
	var lastTag = this._tagStack[this._tagStack.length - 1];

	if(lastTag && lastTag.type === ElementType.Comment){
		lastTag.data += data;
		return;
	}

	var element = {
		data: data,
		type: ElementType.Comment
	};

	this._addDomElement(element);
	this._tagStack.push(element);
};

DomHandler.prototype.oncdatastart = function(){
	var element = {
		children: [{
			data: "",
			type: ElementType.Text
		}],
		type: ElementType.CDATA
	};

	this._addDomElement(element);
	this._tagStack.push(element);
};

DomHandler.prototype.oncommentend = DomHandler.prototype.oncdataend = function(){
	this._tagStack.pop();
};

DomHandler.prototype.onprocessinginstruction = function(name, data){
	this._addDomElement({
		name: name,
		data: data,
		type: ElementType.Directive
	});
};

module.exports = DomHandler;

});
$rmod.def("/entities@1.0.0/maps/decode", {"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376});
$rmod.dep("/$/marko/$/htmlparser2", "entities", "1.0.0");
$rmod.def("/entities@1.0.0/lib/decode_codepoint", function(require, exports, module, __filename, __dirname) { var decodeMap = require("../maps/decode.json");

module.exports = decodeCodePoint;

// modified version of https://github.com/mathiasbynens/he/blob/master/src/he.js#L94-L119
function decodeCodePoint(codePoint){

	if((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF){
		return "\uFFFD";
	}

	if(codePoint in decodeMap){
		codePoint = decodeMap[codePoint];
	}

	var output = "";

	if(codePoint > 0xFFFF){
		codePoint -= 0x10000;
		output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
		codePoint = 0xDC00 | codePoint & 0x3FF;
	}

	output += String.fromCharCode(codePoint);
	return output;
}

});
$rmod.def("/entities@1.0.0/maps/entities", {"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"});
$rmod.def("/entities@1.0.0/maps/legacy", {"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"});
$rmod.def("/entities@1.0.0/maps/xml", {"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}
);
$rmod.def("/htmlparser2@3.8.3/lib/Tokenizer", function(require, exports, module, __filename, __dirname) { module.exports = Tokenizer;

var decodeCodePoint = require('/$/marko/$/htmlparser2/$/entities/lib/decode_codepoint'/*"entities/lib/decode_codepoint.js"*/),
    entityMap = require('/$/marko/$/htmlparser2/$/entities/maps/entities'/*"entities/maps/entities.json"*/),
    legacyMap = require('/$/marko/$/htmlparser2/$/entities/maps/legacy'/*"entities/maps/legacy.json"*/),
    xmlMap    = require('/$/marko/$/htmlparser2/$/entities/maps/xml'/*"entities/maps/xml.json"*/),

    i = 0,

    TEXT                      = i++,
    BEFORE_TAG_NAME           = i++, //after <
    IN_TAG_NAME               = i++,
    IN_SELF_CLOSING_TAG       = i++,
    BEFORE_CLOSING_TAG_NAME   = i++,
    IN_CLOSING_TAG_NAME       = i++,
    AFTER_CLOSING_TAG_NAME    = i++,

    //attributes
    BEFORE_ATTRIBUTE_NAME     = i++,
    IN_ATTRIBUTE_NAME         = i++,
    AFTER_ATTRIBUTE_NAME      = i++,
    BEFORE_ATTRIBUTE_VALUE    = i++,
    IN_ATTRIBUTE_VALUE_DQ     = i++, // "
    IN_ATTRIBUTE_VALUE_SQ     = i++, // '
    IN_ATTRIBUTE_VALUE_NQ     = i++,

    //declarations
    BEFORE_DECLARATION        = i++, // !
    IN_DECLARATION            = i++,

    //processing instructions
    IN_PROCESSING_INSTRUCTION = i++, // ?

    //comments
    BEFORE_COMMENT            = i++,
    IN_COMMENT                = i++,
    AFTER_COMMENT_1           = i++,
    AFTER_COMMENT_2           = i++,

    //cdata
    BEFORE_CDATA_1            = i++, // [
    BEFORE_CDATA_2            = i++, // C
    BEFORE_CDATA_3            = i++, // D
    BEFORE_CDATA_4            = i++, // A
    BEFORE_CDATA_5            = i++, // T
    BEFORE_CDATA_6            = i++, // A
    IN_CDATA                  = i++, // [
    AFTER_CDATA_1             = i++, // ]
    AFTER_CDATA_2             = i++, // ]

    //special tags
    BEFORE_SPECIAL            = i++, //S
    BEFORE_SPECIAL_END        = i++,   //S

    BEFORE_SCRIPT_1           = i++, //C
    BEFORE_SCRIPT_2           = i++, //R
    BEFORE_SCRIPT_3           = i++, //I
    BEFORE_SCRIPT_4           = i++, //P
    BEFORE_SCRIPT_5           = i++, //T
    AFTER_SCRIPT_1            = i++, //C
    AFTER_SCRIPT_2            = i++, //R
    AFTER_SCRIPT_3            = i++, //I
    AFTER_SCRIPT_4            = i++, //P
    AFTER_SCRIPT_5            = i++, //T

    BEFORE_STYLE_1            = i++, //T
    BEFORE_STYLE_2            = i++, //Y
    BEFORE_STYLE_3            = i++, //L
    BEFORE_STYLE_4            = i++, //E
    AFTER_STYLE_1             = i++, //T
    AFTER_STYLE_2             = i++, //Y
    AFTER_STYLE_3             = i++, //L
    AFTER_STYLE_4             = i++, //E

    BEFORE_ENTITY             = i++, //&
    BEFORE_NUMERIC_ENTITY     = i++, //#
    IN_NAMED_ENTITY           = i++,
    IN_NUMERIC_ENTITY         = i++,
    IN_HEX_ENTITY             = i++, //X

    j = 0,

    SPECIAL_NONE              = j++,
    SPECIAL_SCRIPT            = j++,
    SPECIAL_STYLE             = j++;

function whitespace(c){
	return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}

function characterState(char, SUCCESS){
	return function(c){
		if(c === char) this._state = SUCCESS;
	};
}

function ifElseState(upper, SUCCESS, FAILURE){
	var lower = upper.toLowerCase();

	if(upper === lower){
		return function(c){
			if(c === lower){
				this._state = SUCCESS;
			} else {
				this._state = FAILURE;
				this._index--;
			}
		};
	} else {
		return function(c){
			if(c === lower || c === upper){
				this._state = SUCCESS;
			} else {
				this._state = FAILURE;
				this._index--;
			}
		};
	}
}

function consumeSpecialNameChar(upper, NEXT_STATE){
	var lower = upper.toLowerCase();

	return function(c){
		if(c === lower || c === upper){
			this._state = NEXT_STATE;
		} else {
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}
	};
}

function Tokenizer(options, cbs){
	this._state = TEXT;
	this._buffer = "";
	this._sectionStart = 0;
	this._index = 0;
	this._bufferOffset = 0; //chars removed from _buffer
	this._baseState = TEXT;
	this._special = SPECIAL_NONE;
	this._cbs = cbs;
	this._running = true;
	this._ended = false;
	this._xmlMode = !!(options && options.xmlMode);
	this._decodeEntities = !!(options && options.decodeEntities);
}

Tokenizer.prototype._stateText = function(c){
	if(c === "<"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._state = BEFORE_TAG_NAME;
		this._sectionStart = this._index;
	} else if(this._decodeEntities && this._special === SPECIAL_NONE && c === "&"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._baseState = TEXT;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeTagName = function(c){
	if(c === "/"){
		this._state = BEFORE_CLOSING_TAG_NAME;
	} else if(c === ">" || this._special !== SPECIAL_NONE || whitespace(c)) {
		this._state = TEXT;
	} else if(c === "!"){
		this._state = BEFORE_DECLARATION;
		this._sectionStart = this._index + 1;
	} else if(c === "?"){
		this._state = IN_PROCESSING_INSTRUCTION;
		this._sectionStart = this._index + 1;
	} else if(c === "<"){
		this._cbs.ontext(this._getSection());
		this._sectionStart = this._index;
	} else {
		this._state = (!this._xmlMode && (c === "s" || c === "S")) ?
						BEFORE_SPECIAL : IN_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInTagName = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._emitToken("onopentagname");
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateBeforeCloseingTagName = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._state = TEXT;
	} else if(this._special !== SPECIAL_NONE){
		if(c === "s" || c === "S"){
			this._state = BEFORE_SPECIAL_END;
		} else {
			this._state = TEXT;
			this._index--;
		}
	} else {
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInCloseingTagName = function(c){
	if(c === ">" || whitespace(c)){
		this._emitToken("onclosetag");
		this._state = AFTER_CLOSING_TAG_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateAfterCloseingTagName = function(c){
	//skip everything until ">"
	if(c === ">"){
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeAttributeName = function(c){
	if(c === ">"){
		this._cbs.onopentagend();
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(c === "/"){
		this._state = IN_SELF_CLOSING_TAG;
	} else if(!whitespace(c)){
		this._state = IN_ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInSelfClosingTag = function(c){
	if(c === ">"){
		this._cbs.onselfclosingtag();
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(!whitespace(c)){
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateInAttributeName = function(c){
	if(c === "=" || c === "/" || c === ">" || whitespace(c)){
		this._cbs.onattribname(this._getSection());
		this._sectionStart = -1;
		this._state = AFTER_ATTRIBUTE_NAME;
		this._index--;
	}
};

Tokenizer.prototype._stateAfterAttributeName = function(c){
	if(c === "="){
		this._state = BEFORE_ATTRIBUTE_VALUE;
	} else if(c === "/" || c === ">"){
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	} else if(!whitespace(c)){
		this._cbs.onattribend();
		this._state = IN_ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeAttributeValue = function(c){
	if(c === "\""){
		this._state = IN_ATTRIBUTE_VALUE_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = IN_ATTRIBUTE_VALUE_SQ;
		this._sectionStart = this._index + 1;
	} else if(!whitespace(c)){
		this._state = IN_ATTRIBUTE_VALUE_NQ;
		this._sectionStart = this._index;
		this._index--; //reconsume token
	}
};

Tokenizer.prototype._stateInAttributeValueDoubleQuotes = function(c){
	if(c === "\""){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInAttributeValueSingleQuotes = function(c){
	if(c === "'"){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInAttributeValueNoQuotes = function(c){
	if(whitespace(c) || c === ">"){
		this._emitToken("onattribdata");
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	} else if(this._decodeEntities && c === "&"){
		this._emitToken("onattribdata");
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeDeclaration = function(c){
	this._state = c === "[" ? BEFORE_CDATA_1 :
					c === "-" ? BEFORE_COMMENT :
						IN_DECLARATION;
};

Tokenizer.prototype._stateInDeclaration = function(c){
	if(c === ">"){
		this._cbs.ondeclaration(this._getSection());
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateInProcessingInstruction = function(c){
	if(c === ">"){
		this._cbs.onprocessinginstruction(this._getSection());
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeComment = function(c){
	if(c === "-"){
		this._state = IN_COMMENT;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
	}
};

Tokenizer.prototype._stateInComment = function(c){
	if(c === "-") this._state = AFTER_COMMENT_1;
};

Tokenizer.prototype._stateAfterComment1 = function(c){
	if(c === "-"){
		this._state = AFTER_COMMENT_2;
	} else {
		this._state = IN_COMMENT;
	}
};

Tokenizer.prototype._stateAfterComment2 = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(c !== "-"){
		this._state = IN_COMMENT;
	}
	// else: stay in AFTER_COMMENT_2 (`--->`)
};

Tokenizer.prototype._stateBeforeCdata1 = ifElseState("C", BEFORE_CDATA_2, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata2 = ifElseState("D", BEFORE_CDATA_3, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata3 = ifElseState("A", BEFORE_CDATA_4, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata4 = ifElseState("T", BEFORE_CDATA_5, IN_DECLARATION);
Tokenizer.prototype._stateBeforeCdata5 = ifElseState("A", BEFORE_CDATA_6, IN_DECLARATION);

Tokenizer.prototype._stateBeforeCdata6 = function(c){
	if(c === "["){
		this._state = IN_CDATA;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
		this._index--;
	}
};

Tokenizer.prototype._stateInCdata = function(c){
	if(c === "]") this._state = AFTER_CDATA_1;
};

Tokenizer.prototype._stateAfterCdata1 = characterState("]", AFTER_CDATA_2);

Tokenizer.prototype._stateAfterCdata2 = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncdata(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if(c !== "]") {
		this._state = IN_CDATA;
	}
	//else: stay in AFTER_CDATA_2 (`]]]>`)
};

Tokenizer.prototype._stateBeforeSpecial = function(c){
	if(c === "c" || c === "C"){
		this._state = BEFORE_SCRIPT_1;
	} else if(c === "t" || c === "T"){
		this._state = BEFORE_STYLE_1;
	} else {
		this._state = IN_TAG_NAME;
		this._index--; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeSpecialEnd = function(c){
	if(this._special === SPECIAL_SCRIPT && (c === "c" || c === "C")){
		this._state = AFTER_SCRIPT_1;
	} else if(this._special === SPECIAL_STYLE && (c === "t" || c === "T")){
		this._state = AFTER_STYLE_1;
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeScript1 = consumeSpecialNameChar("R", BEFORE_SCRIPT_2);
Tokenizer.prototype._stateBeforeScript2 = consumeSpecialNameChar("I", BEFORE_SCRIPT_3);
Tokenizer.prototype._stateBeforeScript3 = consumeSpecialNameChar("P", BEFORE_SCRIPT_4);
Tokenizer.prototype._stateBeforeScript4 = consumeSpecialNameChar("T", BEFORE_SCRIPT_5);

Tokenizer.prototype._stateBeforeScript5 = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_SCRIPT;
	}
	this._state = IN_TAG_NAME;
	this._index--; //consume the token again
};

Tokenizer.prototype._stateAfterScript1 = ifElseState("R", AFTER_SCRIPT_2, TEXT);
Tokenizer.prototype._stateAfterScript2 = ifElseState("I", AFTER_SCRIPT_3, TEXT);
Tokenizer.prototype._stateAfterScript3 = ifElseState("P", AFTER_SCRIPT_4, TEXT);
Tokenizer.prototype._stateAfterScript4 = ifElseState("T", AFTER_SCRIPT_5, TEXT);

Tokenizer.prototype._stateAfterScript5 = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 6;
		this._index--; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeStyle1 = consumeSpecialNameChar("Y", BEFORE_STYLE_2);
Tokenizer.prototype._stateBeforeStyle2 = consumeSpecialNameChar("L", BEFORE_STYLE_3);
Tokenizer.prototype._stateBeforeStyle3 = consumeSpecialNameChar("E", BEFORE_STYLE_4);

Tokenizer.prototype._stateBeforeStyle4 = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_STYLE;
	}
	this._state = IN_TAG_NAME;
	this._index--; //consume the token again
};

Tokenizer.prototype._stateAfterStyle1 = ifElseState("Y", AFTER_STYLE_2, TEXT);
Tokenizer.prototype._stateAfterStyle2 = ifElseState("L", AFTER_STYLE_3, TEXT);
Tokenizer.prototype._stateAfterStyle3 = ifElseState("E", AFTER_STYLE_4, TEXT);

Tokenizer.prototype._stateAfterStyle4 = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 5;
		this._index--; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeEntity = ifElseState("#", BEFORE_NUMERIC_ENTITY, IN_NAMED_ENTITY);
Tokenizer.prototype._stateBeforeNumericEntity = ifElseState("X", IN_HEX_ENTITY, IN_NUMERIC_ENTITY);

//for entities terminated with a semicolon
Tokenizer.prototype._parseNamedEntityStrict = function(){
	//offset = 1
	if(this._sectionStart + 1 < this._index){
		var entity = this._buffer.substring(this._sectionStart + 1, this._index),
		    map = this._xmlMode ? xmlMap : entityMap;

		if(map.hasOwnProperty(entity)){
			this._emitPartial(map[entity]);
			this._sectionStart = this._index + 1;
		}
	}
};


//parses legacy entities (without trailing semicolon)
Tokenizer.prototype._parseLegacyEntity = function(){
	var start = this._sectionStart + 1,
	    limit = this._index - start;

	if(limit > 6) limit = 6; //the max length of legacy entities is 6

	while(limit >= 2){ //the min length of legacy entities is 2
		var entity = this._buffer.substr(start, limit);

		if(legacyMap.hasOwnProperty(entity)){
			this._emitPartial(legacyMap[entity]);
			this._sectionStart += limit + 1;
			return;
		} else {
			limit--;
		}
	}
};

Tokenizer.prototype._stateInNamedEntity = function(c){
	if(c === ";"){
		this._parseNamedEntityStrict();
		if(this._sectionStart + 1 < this._index && !this._xmlMode){
			this._parseLegacyEntity();
		}
		this._state = this._baseState;
	} else if((c < "a" || c > "z") && (c < "A" || c > "Z") && (c < "0" || c > "9")){
		if(this._xmlMode);
		else if(this._sectionStart + 1 === this._index);
		else if(this._baseState !== TEXT){
			if(c !== "="){
				this._parseNamedEntityStrict();
			}
		} else {
			this._parseLegacyEntity();
		}

		this._state = this._baseState;
		this._index--;
	}
};

Tokenizer.prototype._decodeNumericEntity = function(offset, base){
	var sectionStart = this._sectionStart + offset;

	if(sectionStart !== this._index){
		//parse entity
		var entity = this._buffer.substring(sectionStart, this._index);
		var parsed = parseInt(entity, base);

		this._emitPartial(decodeCodePoint(parsed));
		this._sectionStart = this._index;
	} else {
		this._sectionStart--;
	}

	this._state = this._baseState;
};

Tokenizer.prototype._stateInNumericEntity = function(c){
	if(c === ";"){
		this._decodeNumericEntity(2, 10);
		this._sectionStart++;
	} else if(c < "0" || c > "9"){
		if(!this._xmlMode){
			this._decodeNumericEntity(2, 10);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

Tokenizer.prototype._stateInHexEntity = function(c){
	if(c === ";"){
		this._decodeNumericEntity(3, 16);
		this._sectionStart++;
	} else if((c < "a" || c > "f") && (c < "A" || c > "F") && (c < "0" || c > "9")){
		if(!this._xmlMode){
			this._decodeNumericEntity(3, 16);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

Tokenizer.prototype._cleanup = function (){
	if(this._sectionStart < 0){
		this._buffer = "";
		this._index = 0;
		this._bufferOffset += this._index;
	} else if(this._running){
		if(this._state === TEXT){
			if(this._sectionStart !== this._index){
				this._cbs.ontext(this._buffer.substr(this._sectionStart));
			}
			this._buffer = "";
			this._index = 0;
			this._bufferOffset += this._index;
		} else if(this._sectionStart === this._index){
			//the section just started
			this._buffer = "";
			this._index = 0;
			this._bufferOffset += this._index;
		} else {
			//remove everything unnecessary
			this._buffer = this._buffer.substr(this._sectionStart);
			this._index -= this._sectionStart;
			this._bufferOffset += this._sectionStart;
		}

		this._sectionStart = 0;
	}
};

//TODO make events conditional
Tokenizer.prototype.write = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".write() after done!"));

	this._buffer += chunk;
	this._parse();
};

Tokenizer.prototype._parse = function(){
	while(this._index < this._buffer.length && this._running){
		var c = this._buffer.charAt(this._index);
		if(this._state === TEXT) {
			this._stateText(c);
		} else if(this._state === BEFORE_TAG_NAME){
			this._stateBeforeTagName(c);
		} else if(this._state === IN_TAG_NAME) {
			this._stateInTagName(c);
		} else if(this._state === BEFORE_CLOSING_TAG_NAME){
			this._stateBeforeCloseingTagName(c);
		} else if(this._state === IN_CLOSING_TAG_NAME){
			this._stateInCloseingTagName(c);
		} else if(this._state === AFTER_CLOSING_TAG_NAME){
			this._stateAfterCloseingTagName(c);
		} else if(this._state === IN_SELF_CLOSING_TAG){
			this._stateInSelfClosingTag(c);
		}

		/*
		*	attributes
		*/
		else if(this._state === BEFORE_ATTRIBUTE_NAME){
			this._stateBeforeAttributeName(c);
		} else if(this._state === IN_ATTRIBUTE_NAME){
			this._stateInAttributeName(c);
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
			this._stateAfterAttributeName(c);
		} else if(this._state === BEFORE_ATTRIBUTE_VALUE){
			this._stateBeforeAttributeValue(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_DQ){
			this._stateInAttributeValueDoubleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_SQ){
			this._stateInAttributeValueSingleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_NQ){
			this._stateInAttributeValueNoQuotes(c);
		}

		/*
		*	declarations
		*/
		else if(this._state === BEFORE_DECLARATION){
			this._stateBeforeDeclaration(c);
		} else if(this._state === IN_DECLARATION){
			this._stateInDeclaration(c);
		}

		/*
		*	processing instructions
		*/
		else if(this._state === IN_PROCESSING_INSTRUCTION){
			this._stateInProcessingInstruction(c);
		}

		/*
		*	comments
		*/
		else if(this._state === BEFORE_COMMENT){
			this._stateBeforeComment(c);
		} else if(this._state === IN_COMMENT){
			this._stateInComment(c);
		} else if(this._state === AFTER_COMMENT_1){
			this._stateAfterComment1(c);
		} else if(this._state === AFTER_COMMENT_2){
			this._stateAfterComment2(c);
		}

		/*
		*	cdata
		*/
		else if(this._state === BEFORE_CDATA_1){
			this._stateBeforeCdata1(c);
		} else if(this._state === BEFORE_CDATA_2){
			this._stateBeforeCdata2(c);
		} else if(this._state === BEFORE_CDATA_3){
			this._stateBeforeCdata3(c);
		} else if(this._state === BEFORE_CDATA_4){
			this._stateBeforeCdata4(c);
		} else if(this._state === BEFORE_CDATA_5){
			this._stateBeforeCdata5(c);
		} else if(this._state === BEFORE_CDATA_6){
			this._stateBeforeCdata6(c);
		} else if(this._state === IN_CDATA){
			this._stateInCdata(c);
		} else if(this._state === AFTER_CDATA_1){
			this._stateAfterCdata1(c);
		} else if(this._state === AFTER_CDATA_2){
			this._stateAfterCdata2(c);
		}

		/*
		* special tags
		*/
		else if(this._state === BEFORE_SPECIAL){
			this._stateBeforeSpecial(c);
		} else if(this._state === BEFORE_SPECIAL_END){
			this._stateBeforeSpecialEnd(c);
		}

		/*
		* script
		*/
		else if(this._state === BEFORE_SCRIPT_1){
			this._stateBeforeScript1(c);
		} else if(this._state === BEFORE_SCRIPT_2){
			this._stateBeforeScript2(c);
		} else if(this._state === BEFORE_SCRIPT_3){
			this._stateBeforeScript3(c);
		} else if(this._state === BEFORE_SCRIPT_4){
			this._stateBeforeScript4(c);
		} else if(this._state === BEFORE_SCRIPT_5){
			this._stateBeforeScript5(c);
		}

		else if(this._state === AFTER_SCRIPT_1){
			this._stateAfterScript1(c);
		} else if(this._state === AFTER_SCRIPT_2){
			this._stateAfterScript2(c);
		} else if(this._state === AFTER_SCRIPT_3){
			this._stateAfterScript3(c);
		} else if(this._state === AFTER_SCRIPT_4){
			this._stateAfterScript4(c);
		} else if(this._state === AFTER_SCRIPT_5){
			this._stateAfterScript5(c);
		}

		/*
		* style
		*/
		else if(this._state === BEFORE_STYLE_1){
			this._stateBeforeStyle1(c);
		} else if(this._state === BEFORE_STYLE_2){
			this._stateBeforeStyle2(c);
		} else if(this._state === BEFORE_STYLE_3){
			this._stateBeforeStyle3(c);
		} else if(this._state === BEFORE_STYLE_4){
			this._stateBeforeStyle4(c);
		}

		else if(this._state === AFTER_STYLE_1){
			this._stateAfterStyle1(c);
		} else if(this._state === AFTER_STYLE_2){
			this._stateAfterStyle2(c);
		} else if(this._state === AFTER_STYLE_3){
			this._stateAfterStyle3(c);
		} else if(this._state === AFTER_STYLE_4){
			this._stateAfterStyle4(c);
		}

		/*
		* entities
		*/
		else if(this._state === BEFORE_ENTITY){
			this._stateBeforeEntity(c);
		} else if(this._state === BEFORE_NUMERIC_ENTITY){
			this._stateBeforeNumericEntity(c);
		} else if(this._state === IN_NAMED_ENTITY){
			this._stateInNamedEntity(c);
		} else if(this._state === IN_NUMERIC_ENTITY){
			this._stateInNumericEntity(c);
		} else if(this._state === IN_HEX_ENTITY){
			this._stateInHexEntity(c);
		}

		else {
			this._cbs.onerror(Error("unknown _state"), this._state);
		}

		this._index++;
	}

	this._cleanup();
};

Tokenizer.prototype.pause = function(){
	this._running = false;
};
Tokenizer.prototype.resume = function(){
	this._running = true;

	if(this._index < this._buffer.length){
		this._parse();
	}
	if(this._ended){
		this._finish();
	}
};

Tokenizer.prototype.end = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".end() after done!"));
	if(chunk) this.write(chunk);

	this._ended = true;

	if(this._running) this._finish();
};

Tokenizer.prototype._finish = function(){
	//if there is remaining data, emit it in a reasonable way
	if(this._sectionStart < this._index){
		this._handleTrailingData();
	}

	this._cbs.onend();
};

Tokenizer.prototype._handleTrailingData = function(){
	var data = this._buffer.substr(this._sectionStart);

	if(this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2){
		this._cbs.oncdata(data);
	} else if(this._state === IN_COMMENT || this._state === AFTER_COMMENT_1 || this._state === AFTER_COMMENT_2){
		this._cbs.oncomment(data);
	} else if(this._state === IN_NAMED_ENTITY && !this._xmlMode){
		this._parseLegacyEntity();
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_NUMERIC_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(2, 10);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_HEX_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(3, 16);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(
		this._state !== IN_TAG_NAME &&
		this._state !== BEFORE_ATTRIBUTE_NAME &&
		this._state !== BEFORE_ATTRIBUTE_VALUE &&
		this._state !== AFTER_ATTRIBUTE_NAME &&
		this._state !== IN_ATTRIBUTE_NAME &&
		this._state !== IN_ATTRIBUTE_VALUE_SQ &&
		this._state !== IN_ATTRIBUTE_VALUE_DQ &&
		this._state !== IN_ATTRIBUTE_VALUE_NQ &&
		this._state !== IN_CLOSING_TAG_NAME
	){
		this._cbs.ontext(data);
	}
	//else, ignore remaining data
	//TODO add a way to remove current tag
};

Tokenizer.prototype.reset = function(){
	Tokenizer.call(this, {xmlMode: this._xmlMode, decodeEntities: this._decodeEntities}, this._cbs);
};

Tokenizer.prototype.getAbsoluteIndex = function(){
	return this._bufferOffset + this._index;
};

Tokenizer.prototype._getSection = function(){
	return this._buffer.substring(this._sectionStart, this._index);
};

Tokenizer.prototype._emitToken = function(name){
	this._cbs[name](this._getSection());
	this._sectionStart = -1;
};

Tokenizer.prototype._emitPartial = function(value){
	if(this._baseState !== TEXT){
		this._cbs.onattribdata(value); //TODO implement the new event
	} else {
		this._cbs.ontext(value);
	}
};

});
$rmod.main("/domelementtype@1.3.0", "index");
$rmod.dep("/$/marko/$/htmlparser2", "domelementtype", "1.3.0");
$rmod.def("/domelementtype@1.3.0/index", function(require, exports, module, __filename, __dirname) { //Types of elements found in the DOM
module.exports = {
	Text: "text", //Text
	Directive: "directive", //<? ... ?>
	Comment: "comment", //<!-- ... -->
	Script: "script", //<script> tags
	Style: "style", //<style> tags
	Tag: "tag", //Any tag
	CDATA: "cdata", //<![CDATA[ ... ]]>
	Doctype: "doctype",

	isTag: function(elem){
		return elem.type === "tag" || elem.type === "script" || elem.type === "style";
	}
};

});
$rmod.def("/htmlparser2@3.8.3/lib/FeedHandler", function(require, exports, module, __filename, __dirname) { var index = require("./index.js"),
    DomHandler = index.DomHandler,
	DomUtils = index.DomUtils;

//TODO: make this a streamable handler
function FeedHandler(callback, options){
	this.init(callback, options);
}

require('util'/*"util"*/).inherits(FeedHandler, DomHandler);

FeedHandler.prototype.init = DomHandler;

function getElements(what, where){
	return DomUtils.getElementsByTagName(what, where, true);
}
function getOneElement(what, where){
	return DomUtils.getElementsByTagName(what, where, true, 1)[0];
}
function fetch(what, where, recurse){
	return DomUtils.getText(
		DomUtils.getElementsByTagName(what, where, recurse, 1)
	).trim();
}

function addConditionally(obj, prop, what, where, recurse){
	var tmp = fetch(what, where, recurse);
	if(tmp) obj[prop] = tmp;
}

var isValidFeed = function(value){
	return value === "rss" || value === "feed" || value === "rdf:RDF";
};

FeedHandler.prototype.onend = function(){
	var feed = {},
		feedRoot = getOneElement(isValidFeed, this.dom),
		tmp, childs;

	if(feedRoot){
		if(feedRoot.name === "feed"){
			childs = feedRoot.children;

			feed.type = "atom";
			addConditionally(feed, "id", "id", childs);
			addConditionally(feed, "title", "title", childs);
			if((tmp = getOneElement("link", childs)) && (tmp = tmp.attribs) && (tmp = tmp.href)) feed.link = tmp;
			addConditionally(feed, "description", "subtitle", childs);
			if((tmp = fetch("updated", childs))) feed.updated = new Date(tmp);
			addConditionally(feed, "author", "email", childs, true);

			feed.items = getElements("entry", childs).map(function(item){
				var entry = {}, tmp;

				item = item.children;

				addConditionally(entry, "id", "id", item);
				addConditionally(entry, "title", "title", item);
				if((tmp = getOneElement("link", item)) && (tmp = tmp.attribs) && (tmp = tmp.href)) entry.link = tmp;
				if((tmp = fetch("summary", item) || fetch("content", item))) entry.description = tmp;
				if((tmp = fetch("updated", item))) entry.pubDate = new Date(tmp);
				return entry;
			});
		} else {
			childs = getOneElement("channel", feedRoot.children).children;

			feed.type = feedRoot.name.substr(0, 3);
			feed.id = "";
			addConditionally(feed, "title", "title", childs);
			addConditionally(feed, "link", "link", childs);
			addConditionally(feed, "description", "description", childs);
			if((tmp = fetch("lastBuildDate", childs))) feed.updated = new Date(tmp);
			addConditionally(feed, "author", "managingEditor", childs, true);

			feed.items = getElements("item", feedRoot.children).map(function(item){
				var entry = {}, tmp;

				item = item.children;

				addConditionally(entry, "id", "guid", item);
				addConditionally(entry, "title", "title", item);
				addConditionally(entry, "link", "link", item);
				addConditionally(entry, "description", "description", item);
				if((tmp = fetch("pubDate", item))) entry.pubDate = new Date(tmp);
				return entry;
			});
		}
	}
	this.dom = feed;
	DomHandler.prototype._handleCallback.call(
		this, feedRoot ? null : Error("couldn't find root of feed")
	);
};

module.exports = FeedHandler;

});
$rmod.def("/htmlparser2@3.8.3/lib/Stream", function(require, exports, module, __filename, __dirname) { module.exports = Stream;

var Parser = require("./WritableStream.js");

function Stream(options){
	Parser.call(this, new Cbs(this), options);
}

require('util'/*"util"*/).inherits(Stream, Parser);

Stream.prototype.readable = true;

function Cbs(scope){
	this.scope = scope;
}

var EVENTS = require("../").EVENTS;

Object.keys(EVENTS).forEach(function(name){
	if(EVENTS[name] === 0){
		Cbs.prototype["on" + name] = function(){
			this.scope.emit(name);
		};
	} else if(EVENTS[name] === 1){
		Cbs.prototype["on" + name] = function(a){
			this.scope.emit(name, a);
		};
	} else if(EVENTS[name] === 2){
		Cbs.prototype["on" + name] = function(a, b){
			this.scope.emit(name, a, b);
		};
	} else {
		throw Error("wrong number of arguments!");
	}
});
});
$rmod.main("/stream-browserify@1.0.0", "index");
$rmod.dep("", "stream-browserify", "1.0.0", "stream");
$rmod.main("/isarray@0.0.1", "index");
$rmod.dep("", "isarray", "0.0.1");
$rmod.def("/isarray@0.0.1/index", function(require, exports, module, __filename, __dirname) { module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

});
$rmod.main("/buffer-browserify@0.2.5", "index");
$rmod.dep("", "buffer-browserify", "0.2.5", "buffer");
$rmod.main("/base64-js@0.0.8", "lib/b64");
$rmod.dep("", "base64-js", "0.0.8");
$rmod.def("/base64-js@0.0.8/lib/b64", function(require, exports, module, __filename, __dirname) { var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

});
$rmod.def("/buffer-browserify@0.2.5/buffer_ieee754", function(require, exports, module, __filename, __dirname) { exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

});
$rmod.dep("", "buffer-browserify", "0.2.5");
$rmod.def("/buffer-browserify@0.2.5/index", function(require, exports, module, __filename, __dirname) { var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert'/*'assert'*/);
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new TypeError('First argument needs to be a number, ' +
                            'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          // Round-up subject[i] to a UInt8.
          // e.g.: ((-432 % 256) + 256) % 256 = (-176 + 256) % 256
          //                                  = 80
          this[i] = ((subject[i] % 256) + 256) % 256;
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require('base64-js'/*"base64-js"*/).fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var b = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(b)) throw new Error('Invalid hex string');
    this[offset + i] = b;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require('base64-js'/*"base64-js"*/).toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

});
$rmod.main("/core-util-is@1.0.1", "lib/util");
$rmod.dep("", "core-util-is", "1.0.1");
$rmod.def("/core-util-is@1.0.1/lib/util", function(require, exports, module, __filename, __dirname) { // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
});
$rmod.main("/string_decoder@0.10.31", "index");
$rmod.dep("", "string_decoder", "0.10.31");
$rmod.def("/string_decoder@0.10.31/index", function(require, exports, module, __filename, __dirname) { // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer-browserify'/*'buffer'*/).Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

});
$rmod.def("/readable-stream@1.1.13/lib/_stream_readable", function(require, exports, module, __filename, __dirname) { var process=require("process"); // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray'/*'isarray'*/);
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer-browserify'/*'buffer'*/).Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events'/*'events'*/).EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream-browserify'/*'stream'*/);

/*<replacement>*/
var util = require('core-util-is'/*'core-util-is'*/);
util.inherits = require('inherits'/*'inherits'*/);
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util'/*'util'*/);
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder'/*'string_decoder/'*/).StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder'/*'string_decoder/'*/).StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

});
$rmod.def("/readable-stream@1.1.13/lib/_stream_writable", function(require, exports, module, __filename, __dirname) { var process=require("process"); // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer-browserify'/*'buffer'*/).Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is'/*'core-util-is'*/);
util.inherits = require('inherits'/*'inherits'*/);
/*</replacement>*/

var Stream = require('stream-browserify'/*'stream'*/);

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

});
$rmod.def("/readable-stream@1.1.13/lib/_stream_duplex", function(require, exports, module, __filename, __dirname) { var process=require("process"); // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is'/*'core-util-is'*/);
util.inherits = require('inherits'/*'inherits'*/);
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

});
$rmod.def("/readable-stream@1.1.13/lib/_stream_transform", function(require, exports, module, __filename, __dirname) { // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is'/*'core-util-is'*/);
util.inherits = require('inherits'/*'inherits'*/);
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

});
$rmod.def("/readable-stream@1.1.13/lib/_stream_passthrough", function(require, exports, module, __filename, __dirname) { // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is'/*'core-util-is'*/);
util.inherits = require('inherits'/*'inherits'*/);
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

});
$rmod.dep("", "readable-stream", "1.1.13");
$rmod.def("/readable-stream@1.1.13/readable", function(require, exports, module, __filename, __dirname) { exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream-browserify'/*'stream'*/);
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

});
$rmod.def("/readable-stream@1.1.13/writable", function(require, exports, module, __filename, __dirname) { module.exports = require("./lib/_stream_writable.js")

});
$rmod.def("/readable-stream@1.1.13/duplex", function(require, exports, module, __filename, __dirname) { module.exports = require("./lib/_stream_duplex.js")

});
$rmod.def("/readable-stream@1.1.13/transform", function(require, exports, module, __filename, __dirname) { module.exports = require("./lib/_stream_transform.js")

});
$rmod.def("/readable-stream@1.1.13/passthrough", function(require, exports, module, __filename, __dirname) { module.exports = require("./lib/_stream_passthrough.js")

});
$rmod.dep("", "stream-browserify", "1.0.0");
$rmod.def("/stream-browserify@1.0.0/index", function(require, exports, module, __filename, __dirname) { // Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events'/*'events'*/).EventEmitter;
var inherits = require('inherits'/*'inherits'*/);

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable'/*'readable-stream/readable.js'*/);
Stream.Writable = require('readable-stream/writable'/*'readable-stream/writable.js'*/);
Stream.Duplex = require('readable-stream/duplex'/*'readable-stream/duplex.js'*/);
Stream.Transform = require('readable-stream/transform'/*'readable-stream/transform.js'*/);
Stream.PassThrough = require('readable-stream/passthrough'/*'readable-stream/passthrough.js'*/);

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

});
$rmod.main("/readable-stream@1.1.13", "readable");
$rmod.dep("/$/marko/$/htmlparser2", "readable-stream", "1.1.13");
$rmod.dep("/$/marko/$/htmlparser2/$/readable-stream", "isarray", "0.0.1");
$rmod.dep("/$/marko/$/htmlparser2/$/readable-stream", "core-util-is", "1.0.1");
$rmod.dep("/$/marko/$/htmlparser2/$/readable-stream", "inherits", "2.0.1");
$rmod.dep("/$/marko/$/htmlparser2/$/readable-stream", "string_decoder", "0.10.31");
$rmod.def("/htmlparser2@3.8.3/lib/WritableStream", function(require, exports, module, __filename, __dirname) { module.exports = Stream;

var Parser = require("./Parser.js"),
    WritableStream = require('stream-browserify'/*"stream"*/).Writable || require('/$/marko/$/htmlparser2/$/readable-stream'/*"readable-stream"*/).Writable;

function Stream(cbs, options){
	var parser = this._parser = new Parser(cbs, options);

	WritableStream.call(this, {decodeStrings: false});

	this.once("finish", function(){
		parser.end();
	});
}

require('util'/*"util"*/).inherits(Stream, WritableStream);

WritableStream.prototype._write = function(chunk, encoding, cb){
	this._parser.write(chunk);
	cb();
};
});
$rmod.main("/htmlparser2@3.8.3/lib", "index");
$rmod.def("/htmlparser2@3.8.3/lib/ProxyHandler", function(require, exports, module, __filename, __dirname) { module.exports = ProxyHandler;

function ProxyHandler(cbs){
	this._cbs = cbs || {};
}

var EVENTS = require("./").EVENTS;
Object.keys(EVENTS).forEach(function(name){
	if(EVENTS[name] === 0){
		name = "on" + name;
		ProxyHandler.prototype[name] = function(){
			if(this._cbs[name]) this._cbs[name]();
		};
	} else if(EVENTS[name] === 1){
		name = "on" + name;
		ProxyHandler.prototype[name] = function(a){
			if(this._cbs[name]) this._cbs[name](a);
		};
	} else if(EVENTS[name] === 2){
		name = "on" + name;
		ProxyHandler.prototype[name] = function(a, b){
			if(this._cbs[name]) this._cbs[name](a, b);
		};
	} else {
		throw Error("wrong number of arguments");
	}
});
});
$rmod.main("/domutils@1.5.1", "index");
$rmod.dep("/$/marko/$/htmlparser2", "domutils", "1.5.1");
$rmod.main("/dom-serializer@0.1.0", "index");
$rmod.dep("/$/marko/$/htmlparser2/$/domutils", "dom-serializer", "0.1.0");
$rmod.main("/domelementtype@1.1.3", "index");
$rmod.dep("/$/marko/$/htmlparser2/$/domutils/$/dom-serializer", "domelementtype", "1.1.3");
$rmod.def("/domelementtype@1.1.3/index", function(require, exports, module, __filename, __dirname) { //Types of elements found in the DOM
module.exports = {
	Text: "text", //Text
	Directive: "directive", //<? ... ?>
	Comment: "comment", //<!-- ... -->
	Script: "script", //<script> tags
	Style: "style", //<style> tags
	Tag: "tag", //Any tag
	CDATA: "cdata", //<![CDATA[ ... ]]>

	isTag: function(elem){
		return elem.type === "tag" || elem.type === "script" || elem.type === "style";
	}
};
});
$rmod.main("/entities@1.1.1", "index");
$rmod.dep("/$/marko/$/htmlparser2/$/domutils/$/dom-serializer", "entities", "1.1.1");
$rmod.def("/entities@1.1.1/maps/xml", {"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}
);
$rmod.def("/entities@1.1.1/maps/entities", {"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"});
$rmod.def("/entities@1.1.1/lib/encode", function(require, exports, module, __filename, __dirname) { var inverseXML = getInverseObj(require("../maps/xml.json")),
    xmlReplacer = getInverseReplacer(inverseXML);

exports.XML = getInverse(inverseXML, xmlReplacer);

var inverseHTML = getInverseObj(require("../maps/entities.json")),
    htmlReplacer = getInverseReplacer(inverseHTML);

exports.HTML = getInverse(inverseHTML, htmlReplacer);

function getInverseObj(obj){
	return Object.keys(obj).sort().reduce(function(inverse, name){
		inverse[obj[name]] = "&" + name + ";";
		return inverse;
	}, {});
}

function getInverseReplacer(inverse){
	var single = [],
	    multiple = [];

	Object.keys(inverse).forEach(function(k){
		if(k.length === 1){
			single.push("\\" + k);
		} else {
			multiple.push(k);
		}
	});

	//TODO add ranges
	multiple.unshift("[" + single.join("") + "]");

	return new RegExp(multiple.join("|"), "g");
}

var re_nonASCII = /[^\0-\x7F]/g,
    re_astralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

function singleCharReplacer(c){
	return "&#x" + c.charCodeAt(0).toString(16).toUpperCase() + ";";
}

function astralReplacer(c){
	// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
	var high = c.charCodeAt(0);
	var low  = c.charCodeAt(1);
	var codePoint = (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
	return "&#x" + codePoint.toString(16).toUpperCase() + ";";
}

function getInverse(inverse, re){
	function func(name){
		return inverse[name];
	}

	return function(data){
		return data
				.replace(re, func)
				.replace(re_astralSymbols, astralReplacer)
				.replace(re_nonASCII, singleCharReplacer);
	};
}

var re_xmlChars = getInverseReplacer(inverseXML);

function escapeXML(data){
	return data
			.replace(re_xmlChars, singleCharReplacer)
			.replace(re_astralSymbols, astralReplacer)
			.replace(re_nonASCII, singleCharReplacer);
}

exports.escape = escapeXML;

});
$rmod.def("/entities@1.1.1/maps/legacy", {"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"});
$rmod.def("/entities@1.1.1/maps/decode", {"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376});
$rmod.def("/entities@1.1.1/lib/decode_codepoint", function(require, exports, module, __filename, __dirname) { var decodeMap = require("../maps/decode.json");

module.exports = decodeCodePoint;

// modified version of https://github.com/mathiasbynens/he/blob/master/src/he.js#L94-L119
function decodeCodePoint(codePoint){

	if((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF){
		return "\uFFFD";
	}

	if(codePoint in decodeMap){
		codePoint = decodeMap[codePoint];
	}

	var output = "";

	if(codePoint > 0xFFFF){
		codePoint -= 0x10000;
		output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
		codePoint = 0xDC00 | codePoint & 0x3FF;
	}

	output += String.fromCharCode(codePoint);
	return output;
}

});
$rmod.def("/entities@1.1.1/lib/decode", function(require, exports, module, __filename, __dirname) { var entityMap = require("../maps/entities.json"),
    legacyMap = require("../maps/legacy.json"),
    xmlMap    = require("../maps/xml.json"),
    decodeCodePoint = require("./decode_codepoint.js");

var decodeXMLStrict  = getStrictDecoder(xmlMap),
    decodeHTMLStrict = getStrictDecoder(entityMap);

function getStrictDecoder(map){
	var keys = Object.keys(map).join("|"),
	    replace = getReplacer(map);

	keys += "|#[xX][\\da-fA-F]+|#\\d+";

	var re = new RegExp("&(?:" + keys + ");", "g");

	return function(str){
		return String(str).replace(re, replace);
	};
}

var decodeHTML = (function(){
	var legacy = Object.keys(legacyMap)
		.sort(sorter);

	var keys = Object.keys(entityMap)
		.sort(sorter);

	for(var i = 0, j = 0; i < keys.length; i++){
		if(legacy[j] === keys[i]){
			keys[i] += ";?";
			j++;
		} else {
			keys[i] += ";";
		}
	}

	var re = new RegExp("&(?:" + keys.join("|") + "|#[xX][\\da-fA-F]+;?|#\\d+;?)", "g"),
	    replace = getReplacer(entityMap);

	function replacer(str){
		if(str.substr(-1) !== ";") str += ";";
		return replace(str);
	}

	//TODO consider creating a merged map
	return function(str){
		return String(str).replace(re, replacer);
	};
}());

function sorter(a, b){
	return a < b ? 1 : -1;
}

function getReplacer(map){
	return function replace(str){
		if(str.charAt(1) === "#"){
			if(str.charAt(2) === "X" || str.charAt(2) === "x"){
				return decodeCodePoint(parseInt(str.substr(3), 16));
			}
			return decodeCodePoint(parseInt(str.substr(2), 10));
		}
		return map[str.slice(1, -1)];
	};
}

module.exports = {
	XML: decodeXMLStrict,
	HTML: decodeHTML,
	HTMLStrict: decodeHTMLStrict
};
});
$rmod.def("/entities@1.1.1/index", function(require, exports, module, __filename, __dirname) { var encode = require("./lib/encode.js"),
    decode = require("./lib/decode.js");

exports.decode = function(data, level){
	return (!level || level <= 0 ? decode.XML : decode.HTML)(data);
};

exports.decodeStrict = function(data, level){
	return (!level || level <= 0 ? decode.XML : decode.HTMLStrict)(data);
};

exports.encode = function(data, level){
	return (!level || level <= 0 ? encode.XML : encode.HTML)(data);
};

exports.encodeXML = encode.XML;

exports.encodeHTML4 =
exports.encodeHTML5 =
exports.encodeHTML  = encode.HTML;

exports.decodeXML =
exports.decodeXMLStrict = decode.XML;

exports.decodeHTML4 =
exports.decodeHTML5 =
exports.decodeHTML = decode.HTML;

exports.decodeHTML4Strict =
exports.decodeHTML5Strict =
exports.decodeHTMLStrict = decode.HTMLStrict;

exports.escape = encode.escape;

});
$rmod.def("/dom-serializer@0.1.0/index", function(require, exports, module, __filename, __dirname) { /*
  Module dependencies
*/
var ElementType = require('/$/marko/$/htmlparser2/$/domutils/$/dom-serializer/$/domelementtype'/*'domelementtype'*/);
var entities = require('/$/marko/$/htmlparser2/$/domutils/$/dom-serializer/$/entities'/*'entities'*/);

/*
  Boolean Attributes
*/
var booleanAttributes = {
  __proto__: null,
  allowfullscreen: true,
  async: true,
  autofocus: true,
  autoplay: true,
  checked: true,
  controls: true,
  default: true,
  defer: true,
  disabled: true,
  hidden: true,
  ismap: true,
  loop: true,
  multiple: true,
  muted: true,
  open: true,
  readonly: true,
  required: true,
  reversed: true,
  scoped: true,
  seamless: true,
  selected: true,
  typemustmatch: true
};

var unencodedElements = {
  __proto__: null,
  style: true,
  script: true,
  xmp: true,
  iframe: true,
  noembed: true,
  noframes: true,
  plaintext: true,
  noscript: true
};

/*
  Format attributes
*/
function formatAttrs(attributes, opts) {
  if (!attributes) return;

  var output = '',
      value;

  // Loop through the attributes
  for (var key in attributes) {
    value = attributes[key];
    if (output) {
      output += ' ';
    }

    if (!value && booleanAttributes[key]) {
      output += key;
    } else {
      output += key + '="' + (opts.decodeEntities ? entities.encodeXML(value) : value) + '"';
    }
  }

  return output;
}

/*
  Self-enclosing tags (stolen from node-htmlparser)
*/
var singleTag = {
  __proto__: null,
  area: true,
  base: true,
  basefont: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  isindex: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
};


var render = module.exports = function(dom, opts) {
  if (!Array.isArray(dom) && !dom.cheerio) dom = [dom];
  opts = opts || {};

  var output = '';

  for(var i = 0; i < dom.length; i++){
    var elem = dom[i];

    if (elem.type === 'root')
      output += render(elem.children, opts);
    else if (ElementType.isTag(elem))
      output += renderTag(elem, opts);
    else if (elem.type === ElementType.Directive)
      output += renderDirective(elem);
    else if (elem.type === ElementType.Comment)
      output += renderComment(elem);
    else if (elem.type === ElementType.CDATA)
      output += renderCdata(elem);
    else
      output += renderText(elem, opts);
  }

  return output;
};

function renderTag(elem, opts) {
  // Handle SVG
  if (elem.name === "svg") opts = {decodeEntities: opts.decodeEntities, xmlMode: true};

  var tag = '<' + elem.name,
      attribs = formatAttrs(elem.attribs, opts);

  if (attribs) {
    tag += ' ' + attribs;
  }

  if (
    opts.xmlMode
    && (!elem.children || elem.children.length === 0)
  ) {
    tag += '/>';
  } else {
    tag += '>';
    if (elem.children) {
      tag += render(elem.children, opts);
    }

    if (!singleTag[elem.name] || opts.xmlMode) {
      tag += '</' + elem.name + '>';
    }
  }

  return tag;
}

function renderDirective(elem) {
  return '<' + elem.data + '>';
}

function renderText(elem, opts) {
  var data = elem.data || '';

  // if entities weren't decoded, no need to encode them back
  if (opts.decodeEntities && !(elem.parent && elem.parent.name in unencodedElements)) {
    data = entities.encodeXML(data);
  }

  return data;
}

function renderCdata(elem) {
  return '<![CDATA[' + elem.children[0].data + ']]>';
}

function renderComment(elem) {
  return '<!--' + elem.data + '-->';
}

});
$rmod.def("/domutils@1.5.1/lib/stringify", function(require, exports, module, __filename, __dirname) { var ElementType = require('/$/marko/$/htmlparser2/$/domelementtype'/*"domelementtype"*/),
    getOuterHTML = require('/$/marko/$/htmlparser2/$/domutils/$/dom-serializer'/*"dom-serializer"*/),
    isTag = ElementType.isTag;

module.exports = {
	getInnerHTML: getInnerHTML,
	getOuterHTML: getOuterHTML,
	getText: getText
};

function getInnerHTML(elem, opts){
	return elem.children ? elem.children.map(function(elem){
		return getOuterHTML(elem, opts);
	}).join("") : "";
}

function getText(elem){
	if(Array.isArray(elem)) return elem.map(getText).join("");
	if(isTag(elem) || elem.type === ElementType.CDATA) return getText(elem.children);
	if(elem.type === ElementType.Text) return elem.data;
	return "";
}

});
$rmod.def("/domutils@1.5.1/lib/traversal", function(require, exports, module, __filename, __dirname) { var getChildren = exports.getChildren = function(elem){
	return elem.children;
};

var getParent = exports.getParent = function(elem){
	return elem.parent;
};

exports.getSiblings = function(elem){
	var parent = getParent(elem);
	return parent ? getChildren(parent) : [elem];
};

exports.getAttributeValue = function(elem, name){
	return elem.attribs && elem.attribs[name];
};

exports.hasAttrib = function(elem, name){
	return !!elem.attribs && hasOwnProperty.call(elem.attribs, name);
};

exports.getName = function(elem){
	return elem.name;
};

});
$rmod.def("/domutils@1.5.1/lib/manipulation", function(require, exports, module, __filename, __dirname) { exports.removeElement = function(elem){
	if(elem.prev) elem.prev.next = elem.next;
	if(elem.next) elem.next.prev = elem.prev;

	if(elem.parent){
		var childs = elem.parent.children;
		childs.splice(childs.lastIndexOf(elem), 1);
	}
};

exports.replaceElement = function(elem, replacement){
	var prev = replacement.prev = elem.prev;
	if(prev){
		prev.next = replacement;
	}

	var next = replacement.next = elem.next;
	if(next){
		next.prev = replacement;
	}

	var parent = replacement.parent = elem.parent;
	if(parent){
		var childs = parent.children;
		childs[childs.lastIndexOf(elem)] = replacement;
	}
};

exports.appendChild = function(elem, child){
	child.parent = elem;

	if(elem.children.push(child) !== 1){
		var sibling = elem.children[elem.children.length - 2];
		sibling.next = child;
		child.prev = sibling;
		child.next = null;
	}
};

exports.append = function(elem, next){
	var parent = elem.parent,
		currNext = elem.next;

	next.next = currNext;
	next.prev = elem;
	elem.next = next;
	next.parent = parent;

	if(currNext){
		currNext.prev = next;
		if(parent){
			var childs = parent.children;
			childs.splice(childs.lastIndexOf(currNext), 0, next);
		}
	} else if(parent){
		parent.children.push(next);
	}
};

exports.prepend = function(elem, prev){
	var parent = elem.parent;
	if(parent){
		var childs = parent.children;
		childs.splice(childs.lastIndexOf(elem), 0, prev);
	}

	if(elem.prev){
		elem.prev.next = prev;
	}
	
	prev.parent = parent;
	prev.prev = elem.prev;
	prev.next = elem;
	elem.prev = prev;
};



});
$rmod.def("/domutils@1.5.1/lib/querying", function(require, exports, module, __filename, __dirname) { var isTag = require('/$/marko/$/htmlparser2/$/domelementtype'/*"domelementtype"*/).isTag;

module.exports = {
	filter: filter,
	find: find,
	findOneChild: findOneChild,
	findOne: findOne,
	existsOne: existsOne,
	findAll: findAll
};

function filter(test, element, recurse, limit){
	if(!Array.isArray(element)) element = [element];

	if(typeof limit !== "number" || !isFinite(limit)){
		limit = Infinity;
	}
	return find(test, element, recurse !== false, limit);
}

function find(test, elems, recurse, limit){
	var result = [], childs;

	for(var i = 0, j = elems.length; i < j; i++){
		if(test(elems[i])){
			result.push(elems[i]);
			if(--limit <= 0) break;
		}

		childs = elems[i].children;
		if(recurse && childs && childs.length > 0){
			childs = find(test, childs, recurse, limit);
			result = result.concat(childs);
			limit -= childs.length;
			if(limit <= 0) break;
		}
	}

	return result;
}

function findOneChild(test, elems){
	for(var i = 0, l = elems.length; i < l; i++){
		if(test(elems[i])) return elems[i];
	}

	return null;
}

function findOne(test, elems){
	var elem = null;

	for(var i = 0, l = elems.length; i < l && !elem; i++){
		if(!isTag(elems[i])){
			continue;
		} else if(test(elems[i])){
			elem = elems[i];
		} else if(elems[i].children.length > 0){
			elem = findOne(test, elems[i].children);
		}
	}

	return elem;
}

function existsOne(test, elems){
	for(var i = 0, l = elems.length; i < l; i++){
		if(
			isTag(elems[i]) && (
				test(elems[i]) || (
					elems[i].children.length > 0 &&
					existsOne(test, elems[i].children)
				)
			)
		){
			return true;
		}
	}

	return false;
}

function findAll(test, elems){
	var result = [];
	for(var i = 0, j = elems.length; i < j; i++){
		if(!isTag(elems[i])) continue;
		if(test(elems[i])) result.push(elems[i]);

		if(elems[i].children.length > 0){
			result = result.concat(findAll(test, elems[i].children));
		}
	}
	return result;
}

});
$rmod.def("/domutils@1.5.1/lib/legacy", function(require, exports, module, __filename, __dirname) { var ElementType = require('/$/marko/$/htmlparser2/$/domelementtype'/*"domelementtype"*/);
var isTag = exports.isTag = ElementType.isTag;

exports.testElement = function(options, element){
	for(var key in options){
		if(!options.hasOwnProperty(key));
		else if(key === "tag_name"){
			if(!isTag(element) || !options.tag_name(element.name)){
				return false;
			}
		} else if(key === "tag_type"){
			if(!options.tag_type(element.type)) return false;
		} else if(key === "tag_contains"){
			if(isTag(element) || !options.tag_contains(element.data)){
				return false;
			}
		} else if(!element.attribs || !options[key](element.attribs[key])){
			return false;
		}
	}
	return true;
};

var Checks = {
	tag_name: function(name){
		if(typeof name === "function"){
			return function(elem){ return isTag(elem) && name(elem.name); };
		} else if(name === "*"){
			return isTag;
		} else {
			return function(elem){ return isTag(elem) && elem.name === name; };
		}
	},
	tag_type: function(type){
		if(typeof type === "function"){
			return function(elem){ return type(elem.type); };
		} else {
			return function(elem){ return elem.type === type; };
		}
	},
	tag_contains: function(data){
		if(typeof data === "function"){
			return function(elem){ return !isTag(elem) && data(elem.data); };
		} else {
			return function(elem){ return !isTag(elem) && elem.data === data; };
		}
	}
};

function getAttribCheck(attrib, value){
	if(typeof value === "function"){
		return function(elem){ return elem.attribs && value(elem.attribs[attrib]); };
	} else {
		return function(elem){ return elem.attribs && elem.attribs[attrib] === value; };
	}
}

function combineFuncs(a, b){
	return function(elem){
		return a(elem) || b(elem);
	};
}

exports.getElements = function(options, element, recurse, limit){
	var funcs = Object.keys(options).map(function(key){
		var value = options[key];
		return key in Checks ? Checks[key](value) : getAttribCheck(key, value);
	});

	return funcs.length === 0 ? [] : this.filter(
		funcs.reduce(combineFuncs),
		element, recurse, limit
	);
};

exports.getElementById = function(id, element, recurse){
	if(!Array.isArray(element)) element = [element];
	return this.findOne(getAttribCheck("id", id), element, recurse !== false);
};

exports.getElementsByTagName = function(name, element, recurse, limit){
	return this.filter(Checks.tag_name(name), element, recurse, limit);
};

exports.getElementsByTagType = function(type, element, recurse, limit){
	return this.filter(Checks.tag_type(type), element, recurse, limit);
};

});
$rmod.def("/domutils@1.5.1/lib/helpers", function(require, exports, module, __filename, __dirname) { // removeSubsets
// Given an array of nodes, remove any member that is contained by another.
exports.removeSubsets = function(nodes) {
	var idx = nodes.length, node, ancestor, replace;

	// Check if each node (or one of its ancestors) is already contained in the
	// array.
	while (--idx > -1) {
		node = ancestor = nodes[idx];

		// Temporarily remove the node under consideration
		nodes[idx] = null;
		replace = true;

		while (ancestor) {
			if (nodes.indexOf(ancestor) > -1) {
				replace = false;
				nodes.splice(idx, 1);
				break;
			}
			ancestor = ancestor.parent;
		}

		// If the node has been found to be unique, re-insert it.
		if (replace) {
			nodes[idx] = node;
		}
	}

	return nodes;
};

// Source: http://dom.spec.whatwg.org/#dom-node-comparedocumentposition
var POSITION = {
	DISCONNECTED: 1,
	PRECEDING: 2,
	FOLLOWING: 4,
	CONTAINS: 8,
	CONTAINED_BY: 16
};

// Compare the position of one node against another node in any other document.
// The return value is a bitmask with the following values:
//
// document order:
// > There is an ordering, document order, defined on all the nodes in the
// > document corresponding to the order in which the first character of the
// > XML representation of each node occurs in the XML representation of the
// > document after expansion of general entities. Thus, the document element
// > node will be the first node. Element nodes occur before their children.
// > Thus, document order orders element nodes in order of the occurrence of
// > their start-tag in the XML (after expansion of entities). The attribute
// > nodes of an element occur after the element and before its children. The
// > relative order of attribute nodes is implementation-dependent./
// Source:
// http://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-document-order
//
// @argument {Node} nodaA The first node to use in the comparison
// @argument {Node} nodeB The second node to use in the comparison
//
// @return {Number} A bitmask describing the input nodes' relative position.
//         See http://dom.spec.whatwg.org/#dom-node-comparedocumentposition for
//         a description of these values.
var comparePos = exports.compareDocumentPosition = function(nodeA, nodeB) {
	var aParents = [];
	var bParents = [];
	var current, sharedParent, siblings, aSibling, bSibling, idx;

	if (nodeA === nodeB) {
		return 0;
	}

	current = nodeA;
	while (current) {
		aParents.unshift(current);
		current = current.parent;
	}
	current = nodeB;
	while (current) {
		bParents.unshift(current);
		current = current.parent;
	}

	idx = 0;
	while (aParents[idx] === bParents[idx]) {
		idx++;
	}

	if (idx === 0) {
		return POSITION.DISCONNECTED;
	}

	sharedParent = aParents[idx - 1];
	siblings = sharedParent.children;
	aSibling = aParents[idx];
	bSibling = bParents[idx];

	if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
		if (sharedParent === nodeB) {
			return POSITION.FOLLOWING | POSITION.CONTAINED_BY;
		}
		return POSITION.FOLLOWING;
	} else {
		if (sharedParent === nodeA) {
			return POSITION.PRECEDING | POSITION.CONTAINS;
		}
		return POSITION.PRECEDING;
	}
};

// Sort an array of nodes based on their relative position in the document and
// remove any duplicate nodes. If the array contains nodes that do not belong
// to the same document, sort order is unspecified.
//
// @argument {Array} nodes Array of DOM nodes
//
// @returns {Array} collection of unique nodes, sorted in document order
exports.uniqueSort = function(nodes) {
	var idx = nodes.length, node, position;

	nodes = nodes.slice();

	while (--idx > -1) {
		node = nodes[idx];
		position = nodes.indexOf(node);
		if (position > -1 && position < idx) {
			nodes.splice(idx, 1);
		}
	}
	nodes.sort(function(a, b) {
		var relative = comparePos(a, b);
		if (relative & POSITION.PRECEDING) {
			return -1;
		} else if (relative & POSITION.FOLLOWING) {
			return 1;
		}
		return 0;
	});

	return nodes;
};

});
$rmod.def("/domutils@1.5.1/index", function(require, exports, module, __filename, __dirname) { var DomUtils = module.exports;

[
	require("./lib/stringify"),
	require("./lib/traversal"),
	require("./lib/manipulation"),
	require("./lib/querying"),
	require("./lib/legacy"),
	require("./lib/helpers")
].forEach(function(ext){
	Object.keys(ext).forEach(function(key){
		DomUtils[key] = ext[key].bind(DomUtils);
	});
});

});
$rmod.def("/htmlparser2@3.8.3/lib/CollectingHandler", function(require, exports, module, __filename, __dirname) { module.exports = CollectingHandler;

function CollectingHandler(cbs){
	this._cbs = cbs || {};
	this.events = [];
}

var EVENTS = require("./").EVENTS;
Object.keys(EVENTS).forEach(function(name){
	if(EVENTS[name] === 0){
		name = "on" + name;
		CollectingHandler.prototype[name] = function(){
			this.events.push([name]);
			if(this._cbs[name]) this._cbs[name]();
		};
	} else if(EVENTS[name] === 1){
		name = "on" + name;
		CollectingHandler.prototype[name] = function(a){
			this.events.push([name, a]);
			if(this._cbs[name]) this._cbs[name](a);
		};
	} else if(EVENTS[name] === 2){
		name = "on" + name;
		CollectingHandler.prototype[name] = function(a, b){
			this.events.push([name, a, b]);
			if(this._cbs[name]) this._cbs[name](a, b);
		};
	} else {
		throw Error("wrong number of arguments");
	}
});

CollectingHandler.prototype.onreset = function(){
	this.events = [];
	if(this._cbs.onreset) this._cbs.onreset();
};

CollectingHandler.prototype.restart = function(){
	if(this._cbs.onreset) this._cbs.onreset();

	for(var i = 0, len = this.events.length; i < len; i++){
		if(this._cbs[this.events[i][0]]){

			var num = this.events[i].length;

			if(num === 1){
				this._cbs[this.events[i][0]]();
			} else if(num === 2){
				this._cbs[this.events[i][0]](this.events[i][1]);
			} else {
				this._cbs[this.events[i][0]](this.events[i][1], this.events[i][2]);
			}
		}
	}
};

});
$rmod.def("/htmlparser2@3.8.3/lib/index", function(require, exports, module, __filename, __dirname) { var Parser = require("./Parser.js"),
    DomHandler = require('/$/marko/$/htmlparser2/$/domhandler'/*"domhandler"*/);

function defineProp(name, value){
	delete module.exports[name];
	module.exports[name] = value;
	return value;
}

module.exports = {
	Parser: Parser,
	Tokenizer: require("./Tokenizer.js"),
	ElementType: require('/$/marko/$/htmlparser2/$/domelementtype'/*"domelementtype"*/),
	DomHandler: DomHandler,
	get FeedHandler(){
		return defineProp("FeedHandler", require("./FeedHandler.js"));
	},
	get Stream(){
		return defineProp("Stream", require("./Stream.js"));
	},
	get WritableStream(){
		return defineProp("WritableStream", require("./WritableStream.js"));
	},
	get ProxyHandler(){
		return defineProp("ProxyHandler", require("./ProxyHandler.js"));
	},
	get DomUtils(){
		return defineProp("DomUtils", require('/$/marko/$/htmlparser2/$/domutils'/*"domutils"*/));
	},
	get CollectingHandler(){
		return defineProp("CollectingHandler", require("./CollectingHandler.js"));
	},
	// For legacy support
	DefaultHandler: DomHandler,
	get RssHandler(){
		return defineProp("RssHandler", this.FeedHandler);
	},
	//helper methods
	parseDOM: function(data, options){
		var handler = new DomHandler(options);
		new Parser(handler, options).end(data);
		return handler.dom;
	},
	parseFeed: function(feed, options){
		var handler = new module.exports.FeedHandler(options);
		new Parser(handler, options).end(feed);
		return handler.dom;
	},
	createDomStream: function(cb, options, elementCb){
		var handler = new DomHandler(cb, options, elementCb);
		return new Parser(handler, options);
	},
	// List of all events that the parser emits
	EVENTS: { /* Format: eventname: number of arguments */
		attribute: 2,
		cdatastart: 0,
		cdataend: 0,
		text: 1,
		processinginstruction: 2,
		comment: 1,
		commentend: 0,
		closetag: 1,
		opentag: 2,
		opentagname: 1,
		error: 1,
		end: 0
	}
};

});
$rmod.def("/marko@2.7.28/compiler/CommentNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
function CommentNode(comment) {
    CommentNode.$super.call(this, 'comment');
    this.comment = comment;
}
CommentNode.prototype = {
    doGenerateCode: function (template) {
        if (!this.comment) {
            return;
        }

        template.text('<!--' + (this.comment || '') + '-->');
    },
    setComment: function (comment) {
        this.comment = comment;
    },
    isTextNode: function () {
        return false;
    },
    isElementNode: function () {
        return false;
    },
    toString: function () {
        return '<!--' + this.comment + '-->';
    }
};
require('/$/marko/$/raptor-util'/*'raptor-util'*/).inherit(CommentNode, require('./Node'));
module.exports = CommentNode;
});
$rmod.main("/char-props@0.1.5", "lib/charProps");
$rmod.dep("/$/marko", "char-props", "0.1.5");
$rmod.def("/char-props@0.1.5/lib/charProps", function(require, exports, module, __filename, __dirname) { /**
 * Indexer constructor (takes index and performs pre-emptive caching)
 * @constructor
 * @param {String} input Content to index
 */
function Indexer(input) {
  this.input = input;

  // Break up lines by line breaks
  var lines = input.split('\n');

  // Iterate over the lines until we reach the end or we hit our index
  var i = 0,
      len = lines.length,
      line,
      lineStart = 0,
      lineEnd,
      lineMap = {'length': len};
  for (; i < len; i++) {
    // Grab the line
    line = lines[i];

    // Calculate the line end (includes \n we removed)
    lineEnd = lineStart + line.length + 1;

    // Save the line to its map
    lineMap[i] = {'start': lineStart, 'end': lineEnd};

    // Overwrite lineStart with lineEnd
    lineStart = lineEnd;
  }

  // Save the lineMap to this
  this.lineMap = lineMap;
}
Indexer.prototype = {
  /**
   * Get the line of the character at a certain index
   * @param {Number} index Index of character to retrieve line of
   * @param {Object} [options] Options to use for search
   * @param {Number} [options.minLine=0] Minimum line for us to search on
   * TODO: The following still have to be built/implemented
   * @param {Number} [options.maxLine=lines.length] Maximum line for us to search on
   * @param {String} [options.guess="average"] Affects searching pattern -- can be "high", "low", or "average" (linear top-down, linear bottom-up, or binary)
   * @returns {Number} Line number of character
   */
  'lineAt': function (index, options) {
    // Fallback options
    options = options || {};

    // TODO: We can binary search here
    // Grab the line map and iterate over it
    var lineMap = this.lineMap,
        i = options.minLine || 0,
        len = lineMap.length,
        lineItem;

    for (; i < len; i++) {
      // TODO: If binary searching, this requires both above and below
      // If the index is under end of the lineItem, stop
      lineItem = lineMap[i];

      if (index < lineItem.end) {
        break;
      }
    }

    // Return the line we stopped on
    return i;
  },
  /**
   * Get the column of the character at a certain index
   * @param {Number} index Index of character to retrieve column of
   * @returns {Number} Column number of character
   */
  'columnAt': function (index) {
    // Start at the index - 1
    var input = this.input,
        char,
        i = index - 1;

    // If the index is negative, return now
    if (index < 0) {
      return 0;
    }

    // Continue left until index < 0 or we hit a line break
    for (; i >= 0; i--) {
      char = input.charAt(i);
      if (char === '\n') {
        break;
      }
    }

    // Return the col of our index - 1 (line break is not in the column count)
    var col = index - i - 1;
    return col;
  },
  /**
   * Get the index of the character at a line and column
   * @param {Object} params Object containing line and column
   * @param {Number} params.line Line of character
   * @param {Number} params.column Column of character
   * @returns {Number} Index of character
   */
  'indexAt': function (params) {
    // Grab the parameters and lineMap
    var line = params.line,
        column = params.column,
        lineMap = this.lineMap;

    // Go to the nth line and get the start
    var retLine = lineMap[line],
        lineStart = retLine.start;

    // Add on the column to the line start and return
    var retVal = lineStart + column;
    return retVal;
  },
  /**
   * Get the character at a line and column
   * @param {Object} params Object containing line and column
   * @param {Number} params.line Line of character
   * @param {Number} params.column Column of character
   * @returns {String} Character at specified location
   */
  'charAt': function (params) {
    // Get the index of the character, look it up, and return
    var index = this.indexAt(params),
        input = this.input,
        retVal = input.charAt(index);
    return retVal;
  }
};

function charProps(input) {
  // Create and return a new Indexer with the content
  var indexer = new Indexer(input);
  return indexer;
}

// Expose Indexer to charProps
charProps.Indexer = Indexer;

// Export charProps
module.exports = charProps;
});
$rmod.def("/marko@2.7.28/compiler/ParseTreeBuilder", function(require, exports, module, __filename, __dirname) { var process=require("process"); /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var TextNode = require('./TextNode');
var ElementNode = require('./ElementNode');
var CommentNode = require('./CommentNode');
var charProps = require('/$/marko/$/char-props'/*'char-props'*/);
var path = require('path-browserify'/*'path'*/);

var ieConditionalCommentRegExp = /^\[if [^]*?<!\[endif\]$/;
// IE conditional comment format: <!--[if expression]> HTML <![endif]-->;

function isIEConditionalComment(comment) {
    return ieConditionalCommentRegExp.test(comment);
}

function getRelativePath(absolutePath) {
    if (typeof window === 'undefined') {
        absolutePath = path.resolve(process.cwd(), absolutePath);
        return path.relative(process.cwd(), absolutePath);
    } else {
        return absolutePath;
    }
}

function Pos(filePath, line, column) {
    this.filePath = getRelativePath(filePath);
    this.line = line;
    this.column = column;
}

Pos.prototype = {
    toString: function() {
        return this.filePath + ":" + this.line + ":" + this.column;
    }
};

function ParseTreeBuilder(taglibs) {
    this.taglibs = taglibs;

    this.rootNode = null;
    this.prevTextNode = null;
    this.parentNode = null;
    this.src = null;
    this.filePath = null;
    this.charProps = null;

    this.nsStack = [];
    this.compilerOptions = undefined;
}

var COMPILER_ATTRIBUTE_HANDLERS = {
    whitespace: function(attr, compilerOptions) {
        if (attr.value === 'preserve') {
            compilerOptions.preserveWhitespace = true;
        }
    },
    comments: function(attr, compilerOptions) {
        if (attr.value === 'preserve') {
            compilerOptions.preserveComments = true;
        }
    }
};

ParseTreeBuilder.prototype = {
    createPos: function(line, column) {
        if (arguments.length === 1) {
            var index = arguments[0];
            if (!this.charProps) {
                this.charProps = charProps(this.src);
            }
            line = this.charProps.lineAt(index)+1;
            column = this.charProps.columnAt(index);
        }

        return new Pos(this.filePath, line, column);
    },
    parse: function(src, filePath) {
        this.src = src;
        this.filePath = filePath;

        this.doParse(src, filePath);

        var rootNode = this.rootNode;

        // Cleanup
        this.src = null;
        this.filePath = null;
        this.charProps = null;
        this.rootNode = null;
        this.prevTextNode = null;
        this.parentNode = null;
        this.nsStack = [];

        // Put the compiler options into the rootNode so that
        // TemplateCompiler has access to these
        rootNode.compilerOptions = this.compilerOptions;

        return rootNode;
    },

    handleCharacters: function(t) {
        if (!this.parentNode) {
            return;    //Some bad XML parsers allow text after the ending element...
        }

        if (this.prevTextNode) {
            this.prevTextNode.text += t;
        } else {
            this.prevTextNode = new TextNode(t);
            this.prevTextNode.pos = this.getPos();
            this.parentNode.appendChild(this.prevTextNode);
        }
    },

    handleStartElement: function(el, attributes) {
        var self = this;

        if (el.localName === 'compiler-options') {
            attributes.forEach(function (attr) {
                var attrLocalName = attr.localName;
                var attrPrefix = attr.prefix;
                var handler;
                if (attrPrefix || ((handler = COMPILER_ATTRIBUTE_HANDLERS[attrLocalName]) === undefined)) {
                    var attrName = attrPrefix;
                    attrName = (attrName) ? attrName + ':' + attrLocalName : attrLocalName;
                    throw new Error('Invalid Marko compiler option: ' + attrName + ', Allowed: ' + Object.keys(COMPILER_ATTRIBUTE_HANDLERS));
                }

                handler(attr, self.compilerOptions || (self.compilerOptions = {}));
            }, this);
            return;
        }

        this.prevTextNode = null;

        var namespaceMappings = this.nsStack.length ? Object.create(this.nsStack[this.nsStack.length-1]) : {};
        this.nsStack.push(namespaceMappings);

        attributes.forEach(function (attr) {
            if (attr.prefix === 'xmlns') {
                var nsPrefix = attr.localName;
                var targetNS = attr.value;
                namespaceMappings[nsPrefix] = targetNS;
            }
        }, this);

        function getNS(node) {
            if (node.namespace) {
                return node.namespace;
            } else if (node.prefix) {
                if (node.prefix === 'xml') {
                    return 'http://www.w3.org/XML/1998/namespace';
                }
                return namespaceMappings[node.prefix] || node.prefix;
            }
            else {
                return '';
            }
        }

        var elNS = getNS(el);

        var elementNode = new ElementNode(
            el.localName,
            elNS,
            el.prefix);

        elementNode.pos = this.getPos();

        if (this.parentNode) {
            this.parentNode.appendChild(elementNode);
        } else {

            elementNode.setRoot(true);

            if (!elNS && el.localName === 'template') {
                elementNode.localName = 'c-template';
            }

            this.rootNode = elementNode;
        }

        attributes.forEach(function (attr) {
            var attrNS = getNS(attr);
            var attrLocalName = attr.localName;
            var attrPrefix = attr.prefix;
            elementNode.setAttributeNS(attrNS, attrLocalName, attr.value, attrPrefix);
        }, this);

        this.parentNode = elementNode;
    },

    handleEndElement: function(elementName) {
        if (elementName === 'compiler-options') {
            return;
        }

        this.prevTextNode = null;
        this.parentNode = this.parentNode.parentNode;
        this.nsStack.pop();
    },

    handleComment: function(comment) {
        var compilerOptions = this.compilerOptions;
        var preserveComment = (compilerOptions && compilerOptions.preserveComments === true) ||
            isIEConditionalComment(comment);

        if (preserveComment) {
            var commentNode = new CommentNode(comment);
            this.parentNode.appendChild(commentNode);
        }
    },

    getRootNode: function () {
        return this.rootNode;
    }
};

module.exports = ParseTreeBuilder;

});
$rmod.def("/marko@2.7.28/compiler/ParseTreeBuilderHtml", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var htmlparser = require('/$/marko/$/htmlparser2'/*"htmlparser2"*/);
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;

var parserOptions  = {
    recognizeSelfClosing: true,
    recognizeCDATA: true,
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    xmlMode: false
};

function splitName(name) {
    var parts = name.split(':');
    if (parts.length === 1) {
        return {
            localName: name
        };
    }
    else if (parts.length === 2) {
        return {
            prefix: parts[0],
            localName: parts[1]
        };
    }
}

var entities = {
    quot: '"',
    lt: '<',
    gt: '>',
    amp: '&'
};

function decodeEntities(data) {
    // match numeric, hexadecimal & named entities
    return data.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, function(match, entityName) {
        return entities[entityName] || '${entity:' + entityName + '}';
    });
}

function ParseTreeBuilderHtml(taglibs) {
    ParseTreeBuilderHtml.$super.apply(this, arguments);
    this.parser = null;
}

ParseTreeBuilderHtml.prototype = {
    getPos: function() {
        return this.parser ? this.createPos(this.parser.startIndex) : null;
    },

    doParse: function (src, filePath) {

        var _this = this;

        // Create a pseudo root node
        this.handleStartElement(splitName('c-template'), []);

        var parser = this.parser = new htmlparser.Parser({
            onopentag: function(name, attribs){
                var el = splitName(name);

                var attributes = [];
                forEachEntry(attribs, function(name, value) {
                    var attr = splitName(name);
                    attr.value = decodeEntities(value);
                    attributes.push(attr);
                });

                if (name.toLowerCase() === 'script') {
                    attributes.push({
                        localName: 'c-escape-xml',
                        value: 'false'
                    });
                }

                _this.handleStartElement(el, attributes);
            },
            onprocessinginstruction: function(name, data) {
                _this.handleCharacters('${startTag:' + data + '}');
                // _this.handleCharacters(data);
                // _this.handleCharacters('${entity:gt}');
            },
            // oncdatastart: function() {
            //     console.log('oncdatastart: ', arguments);
            // },
            // oncdataend: function() {
            //     console.log('oncommentend: ', arguments);
            // },
            ontext: function(text){
                _this.handleCharacters(decodeEntities(text));
            },
            onclosetag: function(name){
                _this.handleEndElement(name);
            },
            oncomment: function(comment) {
                _this.handleComment(comment);
            }
        }, parserOptions);
        parser.write(src);
        parser.end();

        // End the pseudo root node:
        _this.handleEndElement();
    }
};

require('/$/marko/$/raptor-util'/*'raptor-util'*/).inherit(ParseTreeBuilderHtml, require('./ParseTreeBuilder'));

module.exports = ParseTreeBuilderHtml;

});
$rmod.main("/sax@0.6.1", "lib/sax");
$rmod.dep("/$/marko", "sax", "0.6.1");
$rmod.def("/sax@0.6.1/lib/sax", function(require, exports, module, __filename, __dirname) { // wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
  parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.trackPosition = parser.opt.position !== false
  if (parser.trackPosition) {
    parser.position = parser.line = parser.column = 0
  }
  emit(parser, "onready")
}

if (!Object.create) Object.create = function (o) {
  function f () { this.__proto__ = o }
  f.prototype = o
  return new f
}

if (!Object.getPrototypeOf) Object.getPrototypeOf = function (o) {
  return o.__proto__
}

if (!Object.keys) Object.keys = function (o) {
  var a = []
  for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
  return a
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

function flushBuffers (parser) {
  closeText(parser)
  if (parser.cdata !== "") {
    emitNode(parser, "oncdata", parser.cdata)
    parser.cdata = ""
  }
  if (parser.script !== "") {
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  , flush: function () { flushBuffers(this) }
  }

try {
  var Stream = require('stream-browserify'/*"stream"*/).Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(this)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  this._decoder = null;

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  if (typeof Buffer === 'function' &&
      typeof Buffer.isBuffer === 'function' &&
      Buffer.isBuffer(data)) {
    if (!this._decoder) {
      var SD = require('string_decoder'/*'string_decoder'*/).StringDecoder
      this._decoder = new SD('utf8')
    }
    data = this._decoder.write(data);
  }

  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this.write(chunk)
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)

// http://www.w3.org/TR/REC-xml/#NT-NameStartChar
// This implementation works on strings, a single character at a time
// as such, it cannot ever support astral-plane characters (10000-EFFFF)
// without a significant breaking change to either this  parser, or the
// JavaScript language.  Implementation of an emoji-capable xml parser
// is left as an exercise for the reader.
var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/

var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function isRegExp (c) {
  return Object.prototype.toString.call(c) === '[object RegExp]'
}

function is (charclass, c) {
  return isRegExp(charclass) ? !!c.match(charclass) : charclass[c]
}

function not (charclass, c) {
  return !is(charclass, c)
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_CLOSED       : S++ // <a foo="bar"
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "amp" : "&"
, "gt" : ">"
, "lt" : "<"
, "quot" : "\""
, "apos" : "'"
, "AElig" : 198
, "Aacute" : 193
, "Acirc" : 194
, "Agrave" : 192
, "Aring" : 197
, "Atilde" : 195
, "Auml" : 196
, "Ccedil" : 199
, "ETH" : 208
, "Eacute" : 201
, "Ecirc" : 202
, "Egrave" : 200
, "Euml" : 203
, "Iacute" : 205
, "Icirc" : 206
, "Igrave" : 204
, "Iuml" : 207
, "Ntilde" : 209
, "Oacute" : 211
, "Ocirc" : 212
, "Ograve" : 210
, "Oslash" : 216
, "Otilde" : 213
, "Ouml" : 214
, "THORN" : 222
, "Uacute" : 218
, "Ucirc" : 219
, "Ugrave" : 217
, "Uuml" : 220
, "Yacute" : 221
, "aacute" : 225
, "acirc" : 226
, "aelig" : 230
, "agrave" : 224
, "aring" : 229
, "atilde" : 227
, "auml" : 228
, "ccedil" : 231
, "eacute" : 233
, "ecirc" : 234
, "egrave" : 232
, "eth" : 240
, "euml" : 235
, "iacute" : 237
, "icirc" : 238
, "igrave" : 236
, "iuml" : 239
, "ntilde" : 241
, "oacute" : 243
, "ocirc" : 244
, "ograve" : 242
, "oslash" : 248
, "otilde" : 245
, "ouml" : 246
, "szlig" : 223
, "thorn" : 254
, "uacute" : 250
, "ucirc" : 251
, "ugrave" : 249
, "uuml" : 252
, "yacute" : 253
, "yuml" : 255
, "copy" : 169
, "reg" : 174
, "nbsp" : 160
, "iexcl" : 161
, "cent" : 162
, "pound" : 163
, "curren" : 164
, "yen" : 165
, "brvbar" : 166
, "sect" : 167
, "uml" : 168
, "ordf" : 170
, "laquo" : 171
, "not" : 172
, "shy" : 173
, "macr" : 175
, "deg" : 176
, "plusmn" : 177
, "sup1" : 185
, "sup2" : 178
, "sup3" : 179
, "acute" : 180
, "micro" : 181
, "para" : 182
, "middot" : 183
, "cedil" : 184
, "ordm" : 186
, "raquo" : 187
, "frac14" : 188
, "frac12" : 189
, "frac34" : 190
, "iquest" : 191
, "times" : 215
, "divide" : 247
, "OElig" : 338
, "oelig" : 339
, "Scaron" : 352
, "scaron" : 353
, "Yuml" : 376
, "fnof" : 402
, "circ" : 710
, "tilde" : 732
, "Alpha" : 913
, "Beta" : 914
, "Gamma" : 915
, "Delta" : 916
, "Epsilon" : 917
, "Zeta" : 918
, "Eta" : 919
, "Theta" : 920
, "Iota" : 921
, "Kappa" : 922
, "Lambda" : 923
, "Mu" : 924
, "Nu" : 925
, "Xi" : 926
, "Omicron" : 927
, "Pi" : 928
, "Rho" : 929
, "Sigma" : 931
, "Tau" : 932
, "Upsilon" : 933
, "Phi" : 934
, "Chi" : 935
, "Psi" : 936
, "Omega" : 937
, "alpha" : 945
, "beta" : 946
, "gamma" : 947
, "delta" : 948
, "epsilon" : 949
, "zeta" : 950
, "eta" : 951
, "theta" : 952
, "iota" : 953
, "kappa" : 954
, "lambda" : 955
, "mu" : 956
, "nu" : 957
, "xi" : 958
, "omicron" : 959
, "pi" : 960
, "rho" : 961
, "sigmaf" : 962
, "sigma" : 963
, "tau" : 964
, "upsilon" : 965
, "phi" : 966
, "chi" : 967
, "psi" : 968
, "omega" : 969
, "thetasym" : 977
, "upsih" : 978
, "piv" : 982
, "ensp" : 8194
, "emsp" : 8195
, "thinsp" : 8201
, "zwnj" : 8204
, "zwj" : 8205
, "lrm" : 8206
, "rlm" : 8207
, "ndash" : 8211
, "mdash" : 8212
, "lsquo" : 8216
, "rsquo" : 8217
, "sbquo" : 8218
, "ldquo" : 8220
, "rdquo" : 8221
, "bdquo" : 8222
, "dagger" : 8224
, "Dagger" : 8225
, "bull" : 8226
, "hellip" : 8230
, "permil" : 8240
, "prime" : 8242
, "Prime" : 8243
, "lsaquo" : 8249
, "rsaquo" : 8250
, "oline" : 8254
, "frasl" : 8260
, "euro" : 8364
, "image" : 8465
, "weierp" : 8472
, "real" : 8476
, "trade" : 8482
, "alefsym" : 8501
, "larr" : 8592
, "uarr" : 8593
, "rarr" : 8594
, "darr" : 8595
, "harr" : 8596
, "crarr" : 8629
, "lArr" : 8656
, "uArr" : 8657
, "rArr" : 8658
, "dArr" : 8659
, "hArr" : 8660
, "forall" : 8704
, "part" : 8706
, "exist" : 8707
, "empty" : 8709
, "nabla" : 8711
, "isin" : 8712
, "notin" : 8713
, "ni" : 8715
, "prod" : 8719
, "sum" : 8721
, "minus" : 8722
, "lowast" : 8727
, "radic" : 8730
, "prop" : 8733
, "infin" : 8734
, "ang" : 8736
, "and" : 8743
, "or" : 8744
, "cap" : 8745
, "cup" : 8746
, "int" : 8747
, "there4" : 8756
, "sim" : 8764
, "cong" : 8773
, "asymp" : 8776
, "ne" : 8800
, "equiv" : 8801
, "le" : 8804
, "ge" : 8805
, "sub" : 8834
, "sup" : 8835
, "nsub" : 8836
, "sube" : 8838
, "supe" : 8839
, "oplus" : 8853
, "otimes" : 8855
, "perp" : 8869
, "sdot" : 8901
, "lceil" : 8968
, "rceil" : 8969
, "lfloor" : 8970
, "rfloor" : 8971
, "lang" : 9001
, "rang" : 9002
, "loz" : 9674
, "spades" : 9824
, "clubs" : 9827
, "hearts" : 9829
, "diams" : 9830
}

Object.keys(sax.ENTITIES).forEach(function (key) {
    var e = sax.ENTITIES[key]
    var s = typeof e === 'number' ? String.fromCharCode(e) : e
    sax.ENTITIES[key] = s
})

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  if (parser.trackPosition) {
    er += "\nLine: "+parser.line+
          "\nColumn: "+parser.column+
          "\nChar: "+parser.c
  }
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (!parser.closedRoot) strictFail(parser, "Unclosed root tag")
  if ((parser.state !== S.BEGIN) && (parser.state !== S.TEXT)) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (typeof parser !== 'object' || !(parser instanceof SAXParser))
    throw new Error('bad call to strictFail');
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name, attribute) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (attribute && name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (!parser.strict) parser.attribName = parser.attribName[parser.looseCase]()

  if (parser.attribList.indexOf(parser.attribName) !== -1 ||
      parser.tag.attributes.hasOwnProperty(parser.attribName)) {
    return parser.attribName = parser.attribValue = ""
  }

  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName, true)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || ""

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
      tag.uri = qn.prefix
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    // Note: do not apply default ns to attributes:
    //   http://www.w3.org/TR/REC-xml-names/#defaulting
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name, true)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = prefix == "" ? "" : (tag.ns[prefix] || "")
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  parser.tag.isSelfClosing = !!selfClosing

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }

  if (parser.script) {
    if (parser.tagName !== "script") {
      parser.script += "</" + parser.tagName + ">"
      parser.tagName = ""
      parser.state = S.SCRIPT
      return
    }
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }

  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.looseCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity
    , entityLC = entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity])
    return parser.ENTITIES[entity]
  if (parser.ENTITIES[entityLC])
    return parser.ENTITIES[entityLC]
  entity = entityLC
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }

  return String.fromCodePoint(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    if (parser.trackPosition) {
      parser.position ++
      if (c === "\n") {
        parser.line ++
        parser.column = 0
      } else parser.column ++
    }
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c && parser.trackPosition) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail(parser, "Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          parser.state = S.CLOSE_TAG
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          // if there was some whitespace, then add that in.
          if (parser.startTagPosition + 1 < parser.position) {
            var pad = parser.position - parser.startTagPosition
            c = new Array(pad).join(" ") + c
          }
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (c === ">") {
          strictFail(parser, "Attribute without value")
          parser.attribValue = parser.attribName
          attrib(parser)
          openTag(parser)
        }
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB_VALUE_CLOSED
      continue

      case S.ATTRIB_VALUE_CLOSED:
        if (is(whitespace, c)) {
          parser.state = S.ATTRIB
        } else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          strictFail(parser, "No whitespace between attributes")
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) {
            if (parser.script) {
              parser.script += "</" + c
              parser.state = S.SCRIPT
            } else {
              strictFail(parser, "Invalid tagname in closing tag.")
            }
          } else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else if (parser.script) {
          parser.script += "</" + parser.tagName
          parser.tagName = ""
          parser.state = S.SCRIPT
        } else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail(parser, "Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail(parser, "Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
        (function() {
                var stringFromCharCode = String.fromCharCode;
                var floor = Math.floor;
                var fromCodePoint = function() {
                        var MAX_SIZE = 0x4000;
                        var codeUnits = [];
                        var highSurrogate;
                        var lowSurrogate;
                        var index = -1;
                        var length = arguments.length;
                        if (!length) {
                                return '';
                        }
                        var result = '';
                        while (++index < length) {
                                var codePoint = Number(arguments[index]);
                                if (
                                        !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                        codePoint < 0 || // not a valid Unicode code point
                                        codePoint > 0x10FFFF || // not a valid Unicode code point
                                        floor(codePoint) != codePoint // not an integer
                                ) {
                                        throw RangeError('Invalid code point: ' + codePoint);
                                }
                                if (codePoint <= 0xFFFF) { // BMP code point
                                        codeUnits.push(codePoint);
                                } else { // Astral code point; split in surrogate halves
                                        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                                        codePoint -= 0x10000;
                                        highSurrogate = (codePoint >> 10) + 0xD800;
                                        lowSurrogate = (codePoint % 0x400) + 0xDC00;
                                        codeUnits.push(highSurrogate, lowSurrogate);
                                }
                                if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                                        result += stringFromCharCode.apply(null, codeUnits);
                                        codeUnits.length = 0;
                                }
                        }
                        return result;
                };
                if (Object.defineProperty) {
                        Object.defineProperty(String, 'fromCodePoint', {
                                'value': fromCodePoint,
                                'configurable': true,
                                'writable': true
                        });
                } else {
                        String.fromCodePoint = fromCodePoint;
                }
        }());
}

})(typeof exports === "undefined" ? sax = {} : exports);

});
$rmod.def("/marko@2.7.28/compiler/ParseTreeBuilderXml", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var sax = require('/$/marko/$/sax'/*"sax"*/);
var extend = require('/$/marko/$/raptor-util/extend'/*'raptor-util/extend'*/);

function ParseTreeBuilderXml(taglibs) {
    ParseTreeBuilderXml.$super.apply(this, arguments);
    this.parser = null;
    this.filePath = null;
}

ParseTreeBuilderXml.prototype = {
    getPos: function() {
        var parser = this.parser;
        var filePath = this.filePath;

        var line = parser.line + 1;

        return {
            line: line,
            column: parser.column,
            filePath: filePath,
            toString: function() {
                return this.filePath + ":" + this.line + ":" + this.column;
            }

        };
    },

    doParse: function (src, filePath) {

        this.filePath = filePath;
        var parser = this.parser = sax.parser(true /*strict*/, {
            trim: false,
            normalize: false,
            lowercasetags: false,
            xmlns: true
        });

        var _this = this;

        extend(parser, {
            onerror: function(e) {
                throw e;
            },

            ontext: function(text) {
                text = text.replace(/\r\n|\r/g, "\n");
                _this.handleCharacters(text);
            },

            oncdata: function(text) {
                text = text.replace(/\r\n|\r/g, "\n");
                _this.handleCharacters(text);
            },

            onopentag: function (node) {
                var el = {
                    namespace: node.uri,
                    prefix: node.prefix,
                    localName: node.local
                };

                var attributes = Object.keys(node.attributes).map(function(attrName) {
                    var attr = node.attributes[attrName];
                    return {
                        namespace: attr.uri,
                        localName: attr.local,
                        prefix: attr.prefix,
                        value: attr.value
                    };
                });

                _this.handleStartElement(el, attributes);
            },



            onclosetag: function (name) {
                _this.handleEndElement(name);
            },

            oncomment: function (comment) {
            }
        });

        parser.write(src).close();
    }
};

require('/$/marko/$/raptor-util'/*'raptor-util'*/).inherit(ParseTreeBuilderXml, require('./ParseTreeBuilder'));

module.exports = ParseTreeBuilderXml;

});
$rmod.def("/marko@2.7.28/compiler/parser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

require('/$/marko/$/raptor-polyfill/string/endsWith'/*'raptor-polyfill/string/endsWith'*/);
var ParseTreeBuilderHtml = require('./ParseTreeBuilderHtml');
var ParseTreeBuilderXml = require('./ParseTreeBuilderXml');

function parse(src, filePath, taglibs) {
    var ParseTreeBuilder = filePath.endsWith('.marko.xml') ?
        ParseTreeBuilderXml :
        ParseTreeBuilderHtml;

    var parseTreeBuilder = new ParseTreeBuilder(taglibs);
    
    return parseTreeBuilder.parse(src, filePath);
}

exports.parse = parse;
});
$rmod.main("/assert@1.3.0", "assert");
$rmod.dep("", "assert", "1.3.0");
$rmod.def("/assert@1.3.0/assert", function(require, exports, module, __filename, __dirname) { // http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util'/*'util/'*/);

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

});
$rmod.def("/marko@2.7.28/compiler/attribute-parser", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Utility class to support sub-attributes in an XML attribute. Each sub-attribute must
 * be separated by a semicolon. Within each sub-attribute, the name/value pair must
 * be split using an equal sign. However, the name for the first sub-attribute
 * is optional and a default name can be provided when reading the sub-attributes.
 *
 * <p>
 * Sub-attribute format:
 * (<attr-value>)?(<attr-name>=<attr-value>;)*(<attr-name>=<attr-value>)
 *
 *
 *
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var strings = require('/$/marko/$/raptor-strings'/*'raptor-strings'*/);
var TypeConverter = require('./TypeConverter');
var regExp = /"(?:[^"]|\\")*"|'(?:[^']|\\')*'|==|===|[;=]/g;

/**
 * Parses the provided string to find the sub-attributes that it contains.
 * The parsed output can be either returned as an array or a map. By default,
 * the parsed output is returned as a map where each property corresponds
 * to a sub-attribute. However, if the order of the sub-attributes is important
 * then the "ordered" option can be set to "true" and
 * an array will instead be returned where each element in the array is an object
 * with a name and value property that corresponds to the matching sub-attribute.
 *
 * <p>
 * Supported options:
 * <ul>
 *  <li>ordered (boolean, defaults to "false") - If true then an array is returned (see above). Otherwise, an object is returned.
 * </ul>
 *
 * @memberOf raptor/templating/compiler$AttributeSplitter
 * @param attr {String} The attribute to split
 * @param types {Object} Type definitions for the possible sub-attributes.
 * @param options
 * @returns
 */
exports.parse = function (attr, types, options) {
    if (!options) {
        options = {};
    }
    var partStart = 0;
    var ordered = options.ordered === true;
    var defaultName = options.defaultName;
    var removeDashes = options.removeDashes === true;
    var matches;
    var equalIndex = -1;
    var result = ordered ? [] : {};
    function handleError(message) {
        if (options.errorHandler) {
            options.errorHandler(message);
            return;
        } else {
            throw createError(new Error(message));
        }
    }
    function finishPart(endIndex) {
        if (partStart === endIndex) {
            //The part is an empty string... ignore it
            return;
        }
        var name;
        var value;
        if (equalIndex != -1) {
            name = strings.trim(attr.substring(partStart, equalIndex));
            value = attr.substring(equalIndex + 1, endIndex);
        } else {
            if (defaultName) {
                name = defaultName;
                value = attr.substring(partStart, endIndex);
                if (!strings.trim(value).length) {
                    return;    //ignore empty parts
                }
            } else {
                name = attr.substring(partStart, endIndex);
            }
        }
        if (name) {
            name = strings.trim(name);
        }
        if (!strings.trim(name).length && !strings.trim(value).length) {
            equalIndex = -1;
            return;    //ignore empty parts
        }
        if (types) {
            var type = types[name] || types['*'];
            if (type) {
                if (value != null) {
                    value = TypeConverter.convert(value, type.type, type.allowExpressions !== false);
                }
                if (type.name) {
                    name = type.name;
                }
            } else {
                handleError('Invalid sub-attribute name of "' + name + '"');
            }
        }
        if (name && removeDashes) {
            name = name.replace(/-([a-z])/g, function (match, lower) {
                return lower.toUpperCase();
            });
        }
        if (ordered) {
            result.push({
                name: name,
                value: value
            });
        } else {
            result[name] = value;
        }
        equalIndex = -1;    //Reset the equal index
    }
    /*
     * Keep searching the string for the relevant tokens.
     *
     * NOTE: The regular expression will also return matches for JavaScript strings,
     *       but they are just ignored. This ensures that semicolons inside strings
     *       are not treated as
     */
    while ((matches = regExp.exec(attr))) {
        //console.error(matches[0]);
        if (matches[0] == ';') {
            finishPart(matches.index);
            partStart = matches.index + 1;
            equalIndex = -1;
        } else if (matches[0] == '=') {
            if (equalIndex == -1) {
                equalIndex = matches.index;
            }
        }
    }
    finishPart(attr.length);
    //console.error("AttributeSplitter - result: ", result);
    return result;
};
});
$rmod.remap("/marko@2.7.28/compiler/util/deresolve", "deresolve-browser");
$rmod.def("/marko@2.7.28/compiler/util/deresolve-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

module.exports = function(resolvedPath, from) {
    return resolvedPath;
};
});
$rmod.remap("/marko@2.7.28/compiler/up-to-date", "up-to-date-browser");
$rmod.def("/marko@2.7.28/compiler/up-to-date-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

exports.getLastModified = function(sourceFile, taglibs) {
    return -1;
};

exports.checkUpToDate = function(targetFile, sourceFile, taglibs) {
    return false;
};
});
$rmod.def("/marko@2.7.28/compiler/TemplateCompiler", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var TemplateBuilder = require('./TemplateBuilder');
var parser = require('./parser');
var Expression = require('./Expression');
var TypeConverter = require('./TypeConverter');
var taglibs = require('./taglibs');
var nodePath = require('path-browserify'/*'path'*/);
var ok = require('assert'/*'assert'*/).ok;
var attributeParser = require('./attribute-parser');
var expressionParser = require('./expression-parser');
var inherit = require('/$/marko/$/raptor-util/inherit'/*'raptor-util/inherit'*/);
var extend = require('/$/marko/$/raptor-util/extend'/*'raptor-util/extend'*/);
var _Node = require('./Node');
var ElementNode = require('./ElementNode');
var TextNode = require('./TextNode');
var TagHandlerNode = require('../taglibs/core/TagHandlerNode');
var deresolve = require('./util/deresolve');
var upToDate = require('./up-to-date');

function TemplateCompiler(path, options) {
    this.dirname = nodePath.dirname(path);
    this.path = path;
    this.taglibs = taglibs.buildLookup(this.dirname);
    this.options = options || {};
    this.errors = [];
}

TemplateCompiler.prototype = {
    isTaglib: function(ns) {
        return this.taglibs.isTaglib(ns);
    },

    transformTree: function (rootNode, templateBuilder) {
        if (!templateBuilder) {
            throw createError(new Error('The templateBuilder argument is required'));
        }

        var _this = this;

        function transformTreeHelper(node) {
            try {
                _this.taglibs.forEachNodeTransformer(node, function (transformer) {

                    if (!node.isTransformerApplied(transformer)) {
                        //Check to make sure a transformer of a certain type is only applied once to a node
                        node.setTransformerApplied(transformer);
                        //Mark the node as have been transformed by the current transformer
                        _this._transformerApplied = true;
                        //Set the flag to indicate that a node was transformed
                        node.compiler = _this;
                        var transformerFunc = transformer.getFunc();
                        transformerFunc.call(transformer, node, _this, templateBuilder);    //Have the transformer process the node (NOTE: Just because a node is being processed by the transformer doesn't mean that it has to modify the parse tree)
                    }
                });
            } catch (e) {
                throw createError(new Error('Unable to compile template at path "' + _this.path + '". Error: ' + e.message), e);
            }
            /*
             * Now process the child nodes by looping over the child nodes
             * and transforming the subtree recursively
             *
             * NOTE: The length of the childNodes array might change as the tree is being performed.
             *       The checks to prevent transformers from being applied multiple times makes
             *       sure that this is not a problem.
             */
            node.forEachChild(function (childNode) {
                if (!childNode.parentNode) {
                    return;    //The child node might have been removed from the tree
                }
                transformTreeHelper(childNode);
            });
        }
        /*
         * The tree is continuously transformed until we go through an entire pass where
         * there were no new nodes that needed to be transformed. This loop makes sure that
         * nodes added by transformers are also transformed.
         */
        do {
            this._transformerApplied = false;
            //Reset the flag to indicate that no transforms were yet applied to any of the nodes for this pass
            transformTreeHelper(rootNode);    //Run the transforms on the tree
        } while (this._transformerApplied);
    },
    compile: function (src, callback, thisObj) {
        var _this = this;
        var filePath = this.path;
        var rootNode;
        var templateBuilder;

        function returnError(err) {
            if (callback) {
                return callback.call(thisObj, err);
            } else {
                throw err;
            }
        }

        try {
            /*
             * First build the parse tree for the tempate
             */
            rootNode = parser.parse(src, filePath, this.taglibs);

            if (rootNode.compilerOptions) {
                // compiler options were set in the template so use those here
                this.options = extend(extend({}, this.options), rootNode.compilerOptions);
            }

            //Build a parse tree from the input XML
            templateBuilder = new TemplateBuilder(this, filePath, rootNode);
            //The templateBuilder object is need to manage the compiled JavaScript output
            this.transformTree(rootNode, templateBuilder);
        } catch (e) {
            var err = createError(new Error('An error occurred while trying to compile template at path "' + filePath + '". Exception: ' + (e.stack || e)), e);
            return returnError(err);
        }

        try {
            /*
             * The tree has been transformed and we can now generate
             */
            rootNode.generateCode(templateBuilder);    //Generate the code and have all output be managed by the TemplateBuilder
        } catch (e) {
            var err = createError(new Error('An error occurred while trying to compile template at path "' + filePath + '". Exception: ' + e), e);
            return returnError(err);
        }

        if (this.hasErrors()) {
            var message = 'An error occurred while trying to compile template at path "' + filePath + '". Error(s) in template:\n';
            var errors = _this.getErrors();
            for (var i = 0, len = errors.length; i < len; i++) {
                message += (i + 1) + ') ' + (errors[i].pos ? '[' + errors[i].pos + '] ' : '') + errors[i].message + '\n';
            }
            var error = new Error(message);
            error.errors = _this.getErrors();
            return returnError(error);
        } else {
            var output = templateBuilder.getOutput();
            if (callback) {
                callback.call(thisObj, null, output);
            }
            return output;
        }
    },
    isExpression: function (expression) {
        return expression instanceof Expression;
    },
    hasExpression: function(str) {
        return expressionParser.hasExpression(str);
    },
    makeExpression: function (expression, replaceSpecialOperators) {
        if (this.isExpression(expression)) {
            return expression;
        } else {
            return new Expression(expression, replaceSpecialOperators);
        }
    },
    parseExpression: function(str, listeners, options) {
        return expressionParser.parse(str, listeners, options);
    },
    parseAttribute: function(attr, types, options) {
        return attributeParser.parse(attr, types, options);
    },
    createTagHandlerNode: function (tagName) {
        var tag = this.taglibs.getTag(tagName);
        var tagHandlerNode = this.createNode(TagHandlerNode, tag);
        tagHandlerNode.localName = tagName;
        return tagHandlerNode;
    },
    convertType: function (value, type, allowExpressions) {
        return TypeConverter.convert(value, type, allowExpressions);
    },
    addError: function (message, pos) {
        this.errors.push({
            message: message,
            pos: pos
        });
    },
    hasErrors: function () {
        return this.errors.length !== 0;
    },
    getErrors: function () {
        return this.errors;
    },
    /**
     * Returns the constructor for an AST node based
     * on the tag name.
     */
    getNodeClass: function (tagName) {
        ok(arguments.length === 1, 'Invalid args');

        var tag = this.taglibs.getTag(tagName);
        if (tag && tag.nodeClass) {
            var nodeClass = require(tag.nodeClass);
            nodeClass.prototype.constructor = nodeClass;
            return nodeClass;
        } else {
            return ElementNode;
        }
        throw createError(new Error('Node class not found for tag "' + tagName + '"'));
    },

    /**
     * There are three types of nodes that can be added to an AST: Node, ElementNode and TextNode
     * Nodes that produce an HTML tag should extend ElementNode.
     * Nodes that produce text should extend TextNode
     * For everything else, a node should inherit from the base Node class
     */
    inheritNode: function(Ctor) {
        if (!Ctor.prototype.__NODE) {
            var nodeType = Ctor.nodeType || 'node';
            nodeType = nodeType.toLowerCase();

            if (nodeType === 'element') {
                inherit(Ctor, ElementNode);
            } else if (nodeType === 'node') {
                inherit(Ctor, _Node);
            } else {
                throw new Error('Invalid node type: ' + nodeType);
            }
        }
    },

    /**
     * Create a new AST node that can be added to the AST tree
     *
     * The first argument can either be a tag name or a construtor
     * function.
     */
    createNode: function(Ctor, arg) {
        if (typeof Ctor === 'string') {
            var tagName = Ctor;
            Ctor = this.getNodeClass(tagName);

            if (Ctor === ElementNode) {
                return new ElementNode(
                    tagName,
                    '',
                    '');
            }
        }

        ok(Ctor != null, 'Ctor is required');
        ok(typeof Ctor === 'function', 'Ctor should be a function');

        this.inheritNode(Ctor);

        return new Ctor(arg);
    },

    /**
     * Helper method to create a new Text node that can be added to the AST.
     * The Text node will generate code that renders static HTML
     */
    createTextNode: function(text, escapeXml) {
        return new TextNode(text, escapeXml);
    },

    /**
     * Returns the max last modified date of a template and all of its taglibs
     */
    getLastModified: function() {
        return upToDate.getLastModified(this.path, this.taglibs);
    },

    checkUpToDate: function(targetFile) {
        if (this.options.checkUpToDate === false) {
            return false;
        }

        return upToDate.checkUpToDate(targetFile, this.path, this.taglibs);

    },
    getRequirePath: function(targetModuleFile) {
        return deresolve(targetModuleFile, this.dirname);
    }
};
module.exports = TemplateCompiler;

});
$rmod.def("/marko@2.7.28/compiler/Node", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var extend = require('/$/marko/$/raptor-util'/*'raptor-util'*/).extend;
var isArray = Array.isArray;
var EscapeXmlContext = require('./EscapeXmlContext');

function Node(nodeType) {
    if (!this.nodeType) {
        this._isRoot = false;
        this.preserveWhitespace = null;
        this.wordWrapEnabled = null;
        this.escapeXmlBodyText = null;
        this.escapeXmlContext = null;
        this.nodeType = nodeType;
        this.parentNode = null;
        this.previousSibling = null;
        this.nextSibling = null;
        this.firstChild = null;
        this.lastChild = null;
        this.namespaceMappings = {};
        this.prefixMappings = {};
        this.transformersApplied = {};
        this.properties = {};
        this.beforeCode = [];
        this.afterCode = [];
        this.data = {}; // Property for associating arbitrary data with a node
        this.flags = null;
    }
}

Node.isNode = function(node) {
    return node.__NODE === true;
};

Node.prototype = {
    /**
     * Marks this node with an arbitrary flag
     * @param  {String} flag The flag name
     */
    setFlag: function(flag) {
        if (!this.flags) {
            this.flags = {};
        }
        this.flags[flag] = true;
    },

    /**
     * Checks if this node has been marked with an arbitrary flag
     * @param  {String} flag The flag name
     * @return {Boolean} True, if marked. False, otherwise.
     */
    hasFlag: function(flag) {
        return this.flags ? this.flags.hasOwnProperty(flag) : false;
    },
    /**
     * Marks this node as being the root node of the tmeplate
     * @param {Boolean} isRoot
     */
    setRoot: function (isRoot) {
        this._isRoot = isRoot;
    },
    /**
     * Gets the position information associated with this node.
     *
     * The returned position object has the following properties:
     * - filePath
     * - line;
     * - column;
     */
    getPosition: function () {
        var pos = this.pos || this.getProperty('pos') || {
                toString: function () {
                    return '(unknown position)';
                }
            };
        return pos;
    },
    /**
     * Stores position information with this node.
     */
    setPosition: function (pos) {
        this.pos = pos;
    },
    /**
     * Associates a compile-time error with this node that will be reported by the comiler.
     */
    addError: function (error) {
        var compiler = this.compiler;
        var curNode = this;
        while (curNode != null && !compiler) {
            compiler = curNode.compiler;
            if (compiler) {
                break;
            }
            curNode = curNode.parentNode;
        }
        if (!compiler) {
            throw createError(new Error('Template compiler not set for node ' + this));
        }
        var pos = this.getPosition();
        compiler.addError(error + ' (' + this.toString() + ')', pos);
    },
    resolveNamespace: function(namespace) {
        return namespace || '';
    },
    setProperty: function (name, value) {
        this.properties[name] = value;
    },
    setProperties: function (props) {
        if (!props) {
            return;
        }
        extend(this.properties, props);
    },
    getProperties: function () {
        return this.properties;
    },
    hasProperty: function (name) {
        return this.properties.hasOwnProperty(name);
    },
    forEachProperty: function (callback, thisObj) {
        forEachEntry(this.properties, callback, this);
    },
    getProperty: function (name) {
        return this.properties[name];
    },
    removeProperty: function (name) {
        delete this.properties[name];
    },
    /**
     * Loops over the child nodes of this node
     * @param  {Function} callback A callback function
     * @param  {Boolean}  thisObj  The "this" for the callback function
     */
    forEachChild: function (callback, thisObj) {
        if (!this.firstChild) {
            return;
        }
        var children = [];
        var curChild = this.firstChild;
        while (curChild) {
            children.push(curChild);
            curChild = curChild.nextSibling;
        }
        for (var i = 0, len = children.length; i < len; i++) {
            curChild = children[i];
            if (curChild.parentNode === this) {
                //Make sure the node is still a child of this node
                if (false === callback.call(thisObj, curChild)) {
                    return;
                }
            }
        }
    },
    getExpression: function (template, childrenOnly, escapeXml, asFunction) {
        if (!template) {
            throw createError(new Error('template argument is required'));
        }
        var _this = this;

        var methodCall;

        if (escapeXml !== false) {
            methodCall = 'out.captureString(';
        } else {
            methodCall = '__helpers.c(out, ';
        }

        return template.makeExpression({
            toString: function () {
                return template.captureCode(function () {
                    if (asFunction) {
                        template.code('function() {\n').code(template.indentStr(2) + 'return ' + methodCall + 'function() {\n').indent(3, function () {
                            if (childrenOnly === true) {
                                _this.generateCodeForChildren(template);
                            } else {
                                _this.generateCode(template);
                            }
                        }).code(template.indentStr(2) + '});\n').code(template.indentStr() + '}');
                    } else {
                        template.code(methodCall + 'function() {\n').indent(function () {
                            if (childrenOnly === true) {
                                _this.generateCodeForChildren(template);
                            } else {
                                _this.generateCode(template);
                            }
                        }).code(template.indentStr() + '})');
                    }
                });
            }
        });
    },
    getBodyContentExpression: function (template, escapeXml) {
        return this.getExpression(template, true, escapeXml, false);
    },
    getBodyContentFunctionExpression: function (template, escapeXml) {
        return this.getExpression(template, true, escapeXml, true);
    },
    isTransformerApplied: function (transformer) {
        return this.transformersApplied[transformer.id] === true;
    },
    setTransformerApplied: function (transformer) {
        this.transformersApplied[transformer.id] = true;
    },
    hasChildren: function () {
        return this.firstChild != null;
    },
    appendChild: function (childNode) {
        if (childNode.parentNode) {
            childNode.parentNode.removeChild(childNode);
        }
        if (!this.firstChild) {
            this.firstChild = this.lastChild = childNode;
            childNode.nextSibling = null;
            childNode.previousSibling = null;
        } else {
            this.lastChild.nextSibling = childNode;
            childNode.previousSibling = this.lastChild;
            this.lastChild = childNode;
        }
        childNode.parentNode = this;
    },
    appendChildren: function (childNodes) {
        if (!childNodes) {
            return;
        }
        childNodes.forEach(function (childNode) {
            this.appendChild(childNode);
        }, this);
    },
    isRoot: function () {
        return this._isRoot === true;
    },
    detach: function () {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    },
    removeChild: function (childNode) {
        if (childNode.parentNode !== this) {
            //Check if the child node is a child of the parent
            return null;
        }
        var previousSibling = childNode.previousSibling;
        var nextSibling = childNode.nextSibling;
        if (this.firstChild === childNode && this.lastChild === childNode) {
            //The child node is the one and only child node being removed
            this.firstChild = this.lastChild = null;
        } else if (this.firstChild === childNode) {
            //The child node being removed is the first child and there is another child after it
            this.firstChild = this.firstChild.nextSibling;
            //Make the next child the first child
            this.firstChild.previousSibling = null;
        } else if (this.lastChild === childNode) {
            //The child node being removed is the last child and there is another child before it
            this.lastChild = this.lastChild.previousSibling;
            //Make the previous child the last child
            this.lastChild.nextSibling = null;
        } else {
            previousSibling.nextSibling = nextSibling;
            nextSibling.previousSibling = previousSibling;
        }
        //Make sure the removed node is completely detached
        childNode.parentNode = null;
        childNode.previousSibling = null;
        childNode.nextSibling = null;
        return childNode;
    },
    removeChildren: function () {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }
    },
    replaceChild: function (newChild, replacedChild) {
        if (newChild === replacedChild) {
            return false;
        }
        if (!replacedChild) {
            return false;
        }
        if (replacedChild.parentNode !== this) {
            return false;    //The parent does not have the replacedChild as a child... nothing to do
        }
        if (this.firstChild === replacedChild && this.lastChild === replacedChild) {
            this.firstChild = newChild;
            this.lastChild = newChild;
            newChild.previousSibling = null;
            newChild.nextSibling = null;
        } else if (this.firstChild === replacedChild) {
            newChild.nextSibling = replacedChild.nextSibling;
            replacedChild.nextSibling.previousSibling = newChild;
            this.firstChild = newChild;
        } else if (this.lastChild === replacedChild) {
            newChild.previousSibling = replacedChild.previousSibling;
            newChild.nextSibling = null;
            replacedChild.previousSibling.nextSibling = newChild;
            this.lastChild = newChild;
        } else {
            replacedChild.nextSibling.previousSibling = newChild;
            replacedChild.previousSibling.nextSibling = newChild;
            newChild.nextSibling = replacedChild.nextSibling;
            newChild.previousSibling = replacedChild.previousSibling;
        }
        newChild.parentNode = this;
        replacedChild.parentNode = null;
        replacedChild.previousSibling = null;
        replacedChild.nextSibling = null;
        return true;
    },
    insertAfter: function (node, referenceNode) {
        if (!node) {
            return false;
        }
        if (referenceNode && referenceNode.parentNode !== this) {
            return false;
        }
        if (isArray(node)) {
            node.forEach(function (node) {
                this.insertAfter(node, referenceNode);
                referenceNode = node;
            }, this);
            return true;
        }
        if (node === referenceNode) {
            return false;
        }
        if (referenceNode === this.lastChild) {
            this.appendChild(node);
            return true;
        }
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        if (!referenceNode || referenceNode === this.lastChild) {
            this.appendChild(node);
            return true;
        } else {
            referenceNode.nextSibling.previousSibling = node;
            node.nextSibling = referenceNode.nextSibling;
            node.previousSibling = referenceNode;
            referenceNode.nextSibling = node;
        }
        node.parentNode = this;
        return true;
    },
    insertBefore: function (node, referenceNode) {
        if (!node) {
            return false;
        }
        if (referenceNode && referenceNode.parentNode !== this) {
            return false;
        }
        if (isArray(node)) {
            var nodes = node;
            var i;
            for (i = nodes.length - 1; i >= 0; i--) {
                this.insertBefore(nodes[i], referenceNode);
                referenceNode = nodes[i];
            }
            return true;
        }
        if (node === referenceNode) {
            return false;
        }
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        if (!referenceNode) {
            this.appendChild(node);
        } else if (this.firstChild === referenceNode) {
            this.firstChild = node;
            this.firstChild.nextSibling = referenceNode;
            this.firstChild.previousSibling = null;
            referenceNode.previousSibling = this.firstChild;
            node.parentNode = this;
        } else {
            this.insertAfter(node, referenceNode.previousSibling);
        }
        return true;
    },
    __NODE: true,
    isTextNode: function () {
        return false;
    },
    isElementNode: function () {
        return false;
    },
    setStripExpression: function (stripExpression) {
        this.stripExpression = stripExpression;
    },

    addBeforeCode: function (code) {
        this.beforeCode.push(code);
    },
    addAfterCode: function (code) {
        this.afterCode.push(code);
    },

    generateCode: function (template) {
        this.compiler = template.compiler;

        if (this.beforeCode.length) {
            this.beforeCode.forEach(function (code) {
                template.indent().code(code).code('\n');
            });
        }


        var preserveWhitespace = this.isPreserveWhitespace();
        if (preserveWhitespace == null) {
            preserveWhitespace = template.options.preserveWhitespace;
            if (preserveWhitespace === true || preserveWhitespace && preserveWhitespace['*']) {
                this.setPreserveWhitespace(true);
            } else {
                this.setPreserveWhitespace(false);
            }
        }
        var wordWrapEnabled = this.isWordWrapEnabled();
        if (wordWrapEnabled == null) {
            wordWrapEnabled = template.options.wordWrapEnabled;
            if (wordWrapEnabled !== false) {
                this.setWordWrapEnabled(true);
            }
        }
        if (this.isEscapeXmlBodyText() == null) {
            this.setEscapeXmlBodyText(true);
        }
        try {
            if (!this.stripExpression || this.stripExpression.toString() === 'false') {
                this.doGenerateCode(template);
            } else if (this.stripExpression.toString() === 'true') {
                this.generateCodeForChildren(template);
            } else {
                //There is a strip expression
                if (!this.generateBeforeCode || !this.generateAfterCode) {
                    this.addError('The c-strip directive is not supported for node ' + this);
                    this.generateCodeForChildren(template);
                    return;
                }
                var nextStripVarId = template.data.nextStripVarId || (template.data.nextStripVarId = 0);
                template.data.nextStripVarId++;

                var varName = '__strip' + nextStripVarId++;
                template.statement('var ' + varName + ' = !(' + this.stripExpression + ');');
                template.statement('if (' + varName + ') {').indent(function () {
                    this.generateBeforeCode(template);
                }, this).line('}');
                this.generateCodeForChildren(template);
                template.statement('if (' + varName + ') {').indent(function () {
                    this.generateAfterCode(template);
                }, this).line('}');
            }
        } catch (e) {
            throw createError(new Error('Unable to generate code for node ' + this + ' at position [' + this.getPosition() + ']. Exception: ' + e), e);
        }

        if (this.afterCode.length) {
            this.afterCode.forEach(function (code) {
                template.indent().code(code).code('\n');
            });
        }
    },
    isPreserveWhitespace: function () {
        return this.preserveWhitespace;
    },
    setPreserveWhitespace: function (preserve) {
        this.preserveWhitespace = preserve;
    },
    isWordWrapEnabled: function () {
        return this.wordWrapEnabled;
    },
    setWordWrapEnabled: function (enabled) {
        this.wordWrapEnabled = enabled;
    },
    doGenerateCode: function (template) {
        this.generateCodeForChildren(template);
    },
    generateCodeForChildren: function (template, indent) {
        if (!template) {
            throw createError(new Error('The "template" argument is required'));
        }
        if (indent === true) {
            template.incIndent();
        }
        this.forEachChild(function (childNode) {
            if (childNode.isPreserveWhitespace() == null) {
                childNode.setPreserveWhitespace(this.isPreserveWhitespace() === true);
            }
            if (childNode.isWordWrapEnabled() == null) {
                childNode.setWordWrapEnabled(this.isWordWrapEnabled() === true);
            }
            if (childNode.isEscapeXmlBodyText() == null) {
                childNode.setEscapeXmlBodyText(this.isEscapeXmlBodyText() !== false);
            }
            if (childNode.getEscapeXmlContext() == null) {
                childNode.setEscapeXmlContext(this.getEscapeXmlContext() || require('./EscapeXmlContext').ELEMENT);
            }
            childNode.generateCode(template);
        }, this);
        if (indent === true) {
            template.decIndent();
        }
    },
    addNamespaceMappings: function (namespaceMappings) {
        if (!namespaceMappings) {
            return;
        }
        var existingNamespaceMappings = this.namespaceMappings;
        var prefixMappings = this.prefixMappings;
        forEachEntry(namespaceMappings, function (prefix, namespace) {
            existingNamespaceMappings[prefix] = namespace;
            prefixMappings[namespace] = prefix;
        });
    },
    hasNamespacePrefix: function (namespace) {
        return this.prefixMappings.hasOwnProperty(namespace);
    },
    resolveNamespacePrefix: function (namespace) {
        var prefix = this.prefixMappings[namespace];
        return !prefix && this.parentNode ? this.parentNode.resolveNamespacePrefix() : prefix;
    },
    forEachNamespace: function (callback, thisObj) {
        forEachEntry(this.namespaceMappings, callback, thisObj);
    },
    getNodeClass: function () {
        return this.nodeClass || this.constructor;
    },
    setNodeClass: function (nodeClass) {
        this.nodeClass = nodeClass;
    },
    prettyPrintTree: function () {
        var out = [];
        function printNode(node, indent) {
            out.push(indent + node.toString() + '\n');
            node.forEachChild(function (child) {
                printNode(child, indent + '  ');
            });
        }
        printNode(this, '');
        return out.join('');
    },
    setEscapeXmlBodyText: function (escapeXmlBodyText) {
        this.escapeXmlBodyText = escapeXmlBodyText;
    },
    isEscapeXmlBodyText: function () {
        return this.escapeXmlBodyText;
    },
    setEscapeXmlContext: function (escapeXmlContext) {
        if (typeof escapeXmlContext === 'string') {
            escapeXmlContext = EscapeXmlContext[escapeXmlContext.toUpperCase()];
        }

        this.escapeXmlContext = escapeXmlContext;
    },
    getEscapeXmlContext: function () {
        return this.escapeXmlContext;
    }
};
module.exports = Node;

});
$rmod.def("/marko@2.7.28/compiler/ElementNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var escapeXmlAttr = require('/$/marko/$/raptor-util/escapeXml'/*'raptor-util/escapeXml'*/).attr;
var XML_URI = 'http://www.w3.org/XML/1998/namespace';
var XML_URI_ALT = 'http://www.w3.org/XML/1998/namespace';
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;

function isEmpty(o) {
    if (!o) {
        return true;
    }

    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
}

function ElementNode(localName, namespace, prefix) {
    ElementNode.$super.call(this, 'element');
    if (!this._elementNode) {
        this._elementNode = true;
        this.dynamicAttributesExpressionArray = null;
        this.attributesByNS = {};
        this.prefix = prefix;
        this.localName = localName;
        this.namespace = namespace;
        this.allowSelfClosing = false;
        this.startTagOnly = false;
    }
}
ElementNode.prototype = {
    addDynamicAttributes: function(expression) {
        if (!this.dynamicAttributesExpressionArray) {
            this.dynamicAttributesExpressionArray = [];
        }

        this.dynamicAttributesExpressionArray.push(expression);
    },
    getQName: function () {
        return this.localName ? (this.prefix ? this.prefix + ':' : '') + this.localName : null;
    },
    setStartTagOnly: function (startTagOnly) {
        this.startTagOnly = true;
    },
    setAllowSelfClosing: function (allowSelfClosing) {
        this.allowSelfClosing = allowSelfClosing;
    },
    isElementNode: function () {
        return true;
    },
    isTextNode: function () {
        return false;
    },
    getAllAttributes: function () {
        var allAttrs = [];
        forEachEntry(this.attributesByNS, function (namespace, attrs) {
            forEachEntry(attrs, function (name, attr) {
                allAttrs.push(attr);
            });
        }, this);
        return allAttrs;
    },
    forEachAttributeAnyNS: function (callback, thisObj) {
        var attributes = [];
        forEachEntry(this.attributesByNS, function (namespace, attrs) {
            forEachEntry(attrs, function (name, attr) {
                attributes.push(attr);
            });
        });

        attributes.forEach(callback, thisObj);
    },
    forEachAttributeNS: function (namespace, callback, thisObj) {
        namespace = this.resolveNamespace(namespace);

        var attrs = this.attributesByNS[namespace];
        if (attrs) {
            forEachEntry(attrs, function (name, attr) {
                callback.call(thisObj, attr);
            });
        }
    },
    getAttributes: function() {
        return this.getAttributesNS('');
    },
    getAttributesNS: function (namespace) {
        var attributes = [];
        if (this.attributesByNS[namespace]) {
            forEachEntry(this.attributesByNS[namespace], function (name, attr) {
                attributes.push(attr);
            });
        }

        return attributes;
    },
    getAttribute: function (name) {
        return this.getAttributeNS(null, name);
    },
    getAttributeNS: function (namespace, localName) {
        namespace = this.resolveNamespace(namespace);
        var attrNS = this.attributesByNS[namespace];
        var attr = attrNS ? attrNS[localName] : undefined;
        return attr ? attr.value : undefined;
    },
    setAttribute: function (localName, value, escapeXml) {
        this.setAttributeNS(null, localName, value, null, escapeXml);
    },
    setAttributeNS: function (namespace, localName, value, prefix, escapeXml) {
        namespace = this.resolveNamespace(namespace);
        var attrNS = this.attributesByNS[namespace] || (this.attributesByNS[namespace] = {});
        attrNS[localName] = {
            localName: localName,
            value: value,
            prefix: prefix,
            namespace: namespace,
            escapeXml: escapeXml,
            qName: prefix ? prefix + ':' + localName : localName,
            name: namespace ? namespace + ':' + localName : localName,
            toString: function () {
                return this.name;
            }
        };
    },
    setEmptyAttribute: function (name) {
        this.setAttribute(name, null);
    },
    removeAttribute: function (localName) {
        this.removeAttributeNS(null, localName);
    },
    removeAttributeNS: function (namespace, localName) {
        namespace = this.resolveNamespace(namespace);
        var attrNS = this.attributesByNS[namespace] || (this.attributesByNS[namespace] = {});
        if (attrNS) {
            delete attrNS[localName];
            if (isEmpty(attrNS)) {
                delete this.attributesByNS[namespace];
            }
        }
    },
    removeAttributesNS: function (namespace) {
        namespace = this.resolveNamespace(namespace);
        delete this.attributesByNS[namespace];
    },
    isPreserveWhitespace: function () {
        var preserveSpace = ElementNode.$super.prototype.isPreserveWhitespace.call(this);
        if (preserveSpace === true) {
            return true;
        }
        var preserveAttr = this.getAttributeNS(XML_URI, 'space') || this.getAttributeNS(XML_URI_ALT, 'space') || this.getAttribute('xml:space') === 'preserve';
        if (preserveAttr === 'preserve') {
            return true;
        }
        return preserveSpace;
    },
    hasAttributesAnyNS: function () {
        return !isEmpty(this.attributesByNS);
    },
    hasAttributes: function () {
        return this.hasAttributesNS('');
    },
    hasAttributesNS: function (namespace) {
        namespace = this.resolveNamespace(namespace);
        return this.attributesByNS[namespace] !== undefined;
    },
    hasAttribute: function (localName) {
        return this.hasAttributeNS('', localName);
    },
    hasAttributeNS: function (namespace, localName) {
        namespace = this.resolveNamespace(namespace);
        var attrsNS = this.attributesByNS[namespace];
        return attrsNS ? attrsNS.hasOwnProperty(localName) : false;
    },
    removePreserveSpaceAttr: function () {
        this.removeAttributeNS(XML_URI, 'space');
        this.removeAttributeNS(XML_URI_ALT, 'space');
        this.removeAttribute('space');
    },
    setStripExpression: function (stripExpression) {
        this.stripExpression = stripExpression;
    },
    doGenerateCode: function (template) {
        this.generateBeforeCode(template);
        this.generateCodeForChildren(template);
        this.generateAfterCode(template);
    },
    generateBeforeCode: function (template) {
        var preserveWhitespace = this.preserveWhitespace = this.isPreserveWhitespace();
        var name = this.prefix ? this.prefix + ':' + this.localName : this.localName;
        if (preserveWhitespace) {
            this.removePreserveSpaceAttr();
        }

        var _this = this;

        if (template.isExpression(name)) {
            template.text('<');
            template.write(name);
        } else {
            template.text('<' + name);
        }

        this.forEachAttributeAnyNS(function (attr) {
            var prefix = attr.prefix;
            if (!prefix && attr.namespace) {
                prefix = this.resolveNamespacePrefix(attr.namespace);
            }
            if (prefix) {
                name = prefix + (attr.localName ? ':' + attr.localName : '');
            } else {
                name = attr.localName;
            }
            if (attr.value === null || attr.value === undefined) {
                template.text(' ' + name);
            } else if (attr.value === '') {
                // Treat empty attributes as boolean attributes
                template.text(' ' + name);
            } else if (template.isExpression(attr.value)) {
                template.attr(name, attr.value, attr.escapeXml !== false);
            } else {
                var attrParts = [];
                var hasExpression = false;
                var invalidAttr = false;
                template.parseExpression(attr.value, {
                    text: function (text, escapeXml) {
                        attrParts.push({
                            text: text,
                            escapeXml: escapeXml !== false
                        });
                    },
                    expression: function (expression, escapeXml) {
                        hasExpression = true;
                        attrParts.push({
                            expression: expression,
                            escapeXml: escapeXml !== false
                        });
                    },
                    error: function (message) {
                        invalidAttr = true;
                        _this.addError('Invalid expression found in attribute "' + name + '". ' + message);
                    }
                });

                if (invalidAttr) {
                    template.text(name + '="' + escapeXmlAttr(attr.value) + '"');
                } else {
                    if (hasExpression && attrParts.length === 1) {
                        template.attr(name, attrParts[0].expression, attrParts[0].escapeXml !== false);
                    } else {
                        template.text(' ' + name + '="');
                        attrParts.forEach(function (part) {
                            if (part.text) {
                                template.text(part.escapeXml !== false ? escapeXmlAttr(part.text) : part.text);
                            } else if (part.expression) {
                                template.write(part.expression, { escapeXmlAttr: part.escapeXml !== false });
                            } else {
                                throw createError(new Error('Illegal state'));
                            }
                        });
                        template.text('"');
                    }
                }
            }
        }, this);
        if (this.dynamicAttributesExpressionArray && this.dynamicAttributesExpressionArray.length) {
            this.dynamicAttributesExpressionArray.forEach(function(expression) {
                template.attrs(expression);
            });
        }
        if (this.hasChildren()) {
            template.text('>');
        } else {
            if (this.startTagOnly) {
                template.text('>');
            } else if (this.allowSelfClosing) {
                template.text('/>');
            }
        }
    },
    generateAfterCode: function (template) {
        var name = this.prefix ? this.prefix + ':' + this.localName : this.localName;


        if (template.isExpression(name)) {
            template.text('</');
            template.write(name);
            template.text('>');
        } else {
            if (this.hasChildren()) {
                template.text('</' + name + '>');
            } else {
                if (!this.startTagOnly && !this.allowSelfClosing) {
                    template.text('></' + name + '>');
                }
            }
        }
    },
    toString: function () {
        return '<' + (this.prefix ? this.prefix + ':' + this.localName : this.localName) + '>';
    }
};
require('/$/marko/$/raptor-util'/*'raptor-util'*/).inherit(ElementNode, require('./Node'));

Object.defineProperty(ElementNode.prototype, 'tagName', {
    get: function() {
        return this._localName;
    },
    set: function(value) {
        this._localName = value;
    }
});

Object.defineProperty(ElementNode.prototype, 'localName', {
    get: function() {
        return this._localName;
    },
    set: function(value) {
        this._localName = value;
    }
});

Object.defineProperty(ElementNode.prototype, 'qName', {
    get: function() {
        if (this.prefix) {
            return this.prefix + ':' + this.localName;
        } else {
            return this.localName;
        }
    }
});

module.exports = ElementNode;
});
$rmod.def("/marko@2.7.28/compiler/TextNode", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var escapeXml = require('/$/marko/$/raptor-util/escapeXml'/*'raptor-util/escapeXml'*/);
var EscapeXmlContext = require('./EscapeXmlContext');

var attrReplace = /[&<>\"\']/g;
var replacements = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&apos;'
    };
function escapeXmlAttr(str) {
    return str.replace(attrReplace, function (match) {
        return replacements[match];
    });
}

function TextNode(text, escapeXml) {
    TextNode.$super.call(this, 'text');
    if (text != null && typeof text !== 'string') {
        throw createError('Invalid text: ' + text);
    }

    if (text) {
        text = text.replace(/\r\n/g, '\n');
    }

    this.text = text;
    this.escapeXml = escapeXml !== false;
}
TextNode.prototype = {
    normalizeText: function () {
        var normalizedText = this.getEscapedText();
        var curChild = this.nextSibling;
        var nodeToRemove;
        while (curChild && (curChild.isTextNode() || curChild.javaScriptOnly)) {
            if (curChild.javaScriptOnly) {
                curChild = curChild.nextSibling;
                continue;
            }
            normalizedText += curChild.getEscapedText();
            nodeToRemove = curChild;
            curChild = curChild.nextSibling;
            nodeToRemove.detach();
        }
        this.setText(normalizedText);
        this.escapeXml = false;    //Make sure the text is not re-escaped
    },
    getEscapedText: function () {
        var text = this.getText();
        var parentNode = this.parentNode;
        var shouldEscapeXml = this.escapeXml !== false && parentNode && parentNode.isEscapeXmlBodyText() !== false;
        if (shouldEscapeXml) {
            if (this.getEscapeXmlContext() === EscapeXmlContext.ATTRIBUTE) {
                return escapeXmlAttr(text);
            } else {
                return escapeXml(text);
            }
        } else {
            return text;
        }
    },
    trim: function () {
        var text = this.getText();
        if (!text) {
            return;
        }
        var parentNode = this.parentNode;
        if (parentNode && parentNode.trimBodyIndent) {
            var initialSpaceMatches = /^\s+/.exec(text);
            if (initialSpaceMatches) {
                var indentMatches = /\n[^\n]*$/.exec(initialSpaceMatches[0]);
                if (indentMatches) {
                    var indentRegExp = new RegExp(indentMatches[0].replace(/\n/g, '\\n'), 'g');
                    text = text.replace(indentRegExp, '\n');
                }
                text = text.replace(/^\s*/, '').replace(/\s*$/, '');
                this.setText(text);
            }
        }
        if (this.isPreserveWhitespace()) {
            return;
        }

        var previousSibling = this.previousSibling;
        while (previousSibling && previousSibling.javaScriptOnly) {
            previousSibling = previousSibling.previousSibling;
        }

        var nextSibling = this.nextSibling;
        while (nextSibling && nextSibling.javaScriptOnly) {
            nextSibling = nextSibling.nextSibling;
        }

        if (!previousSibling) {
            //First child
            text = text.replace(/^\n\s*/g, '');
        }
        if (!nextSibling) {
            //Last child
            text = text.replace(/\n\s*$/g, '');
        }
        if (/^\n\s*$/.test(text)) {
            //Whitespace between elements
            text = '';
        }
        text = text.replace(/\s+/g, ' ');
        if (this.isWordWrapEnabled() && text.length > 80) {
            var start = 0;
            var end;
            while (start < text.length) {
                end = Math.min(start + 80, text.length);
                var lastSpace = text.substring(start, end).lastIndexOf(' ');
                if (lastSpace != -1) {
                    lastSpace = lastSpace + start;    //Adjust offset into original string
                } else {
                    lastSpace = text.indexOf(' ', end);    //No space before the 80 column mark... search for the first space after to break on
                }
                if (lastSpace != -1) {
                    text = text.substring(0, lastSpace) + '\n' + text.substring(lastSpace + 1);
                    start = lastSpace + 1;
                } else {
                    break;
                }
            }
        }
        this.setText(text);
    },
    doGenerateCode: function (template) {
        /*
         * After all of the transformation of the tree we
         * might have ended up with multiple text nodes
         * as siblings. We want to normalize adjacent
         * text nodes so that whitespace removal rules
         * will be correct
         */
        this.normalizeText();
        this.trim();
        var text = this.getText();
        if (text) {
            template.text(text);
        }
    },
    getText: function () {
        return this.text;
    },
    setText: function (text) {
        this.text = text;
    },
    isTextNode: function () {
        return true;
    },
    isElementNode: function () {
        return false;
    },
    setEscapeXml: function (escapeXml) {
        this.escapeXml = escapeXml;
    },
    isEscapeXml: function () {
        return this.escapeXml;
    },
    toString: function () {
        var text = this.text && this.text.length > 25 ? this.text.substring(0, 25) + '...' : this.text;
        text = text.replace(/[\n]/g, '\\n');
        return '[text: ' + text + ']';
    }
};
require('/$/marko/$/raptor-util'/*'raptor-util'*/).inherit(TextNode, require('./Node'));
module.exports = TextNode;
});
$rmod.main("/raptor-regexp@1.0.1", "lib/raptor-regexp");
$rmod.dep("/$/marko", "raptor-regexp", "1.0.1");
$rmod.def("/raptor-regexp@1.0.1/lib/raptor-regexp", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var simpleSpecial = {
    "*": ".*?",
    "?": ".?"
};

module.exports = {
    
    /**
     * Escapes special regular expression characters in a string so that the resulting string can be used
     * as a literal in a constructed RegExp object.
     * 
     * Example:
     * <js>
     * strings.escapeRegExp("hello{world}");
     * //output: "hello\{world\}"
     * </js>
     * @param str The string to escape
     * @returns {String} The string with all special regular expression characters escaped
     */
    escape: function(str) {
        return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    },
    
    /**
     * Converts a string consisting of two types of wildcards to a regular expression:
     * Question Mark (?) - Represents a single character that can be any character
     * Asterisk (*) - This represents any sequence of characters 
     * 
     * @param {String} str The string that represents the simple regular expression
     * @return {RegExp} The resulting regular expression
     */
    simple: function(str) {
        var _this = this;
        
        return new RegExp("^" + str.replace(/[\*\?]|[^\*\?]*/g, function(match) {
            return simpleSpecial[match] || _this.escape(match);
        }) + "$");
    }
    
};

});
$rmod.def("/marko@2.7.28/compiler/expression-parser", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var Expression = require('./Expression');
var strings = require('/$/marko/$/raptor-strings'/*'raptor-strings'*/);
var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/);
var regexp = require('/$/marko/$/raptor-regexp'/*'raptor-regexp'*/);
var ok = require('assert'/*'assert'*/).ok;

var endingTokens = {
        '${': '}',
        '$!{': '}',
        '{%': '%}',
        '{?': '}',
        '$': null,
        '$!': null
    };

var parse;

function createStartRegExpStr(starts) {
    var parts = [];
    starts.forEach(function (start) {
        parts.push(regexp.escape('\\\\' + start));
        parts.push(regexp.escape('\\' + start));
        parts.push(regexp.escape(start));
    });
    return parts.join('|');
}
var startRegExpStr = createStartRegExpStr([
        '{%',
        '${',
        '$!{',
        '$!',
        '$',
        '{?'
    ]);
function createStartRegExp() {
    return new RegExp(startRegExpStr, 'g');
}

function getLine(str, pos) {
    var lines = str.split('\n');
    var index = 0;
    var line;

    while (index < lines.length) {
        line = lines[index];
        if (pos - line.length + 1 < 0) {
            break;
        } else {
            pos -= line.length + 1;
        }
        index++;
    }

    return {
        str: line,
        pos: pos
    };
}
function errorContext(str, pos, length) {
    var line = getLine(str, pos);
    pos = line.pos;
    str = line.str;
    var start = pos - length;
    var end = pos + length;
    var i;
    if (start < 0) {
        start = 0;
    }
    if (end > str.length) {
        end = str.length;
    }
    var prefix = '...';
    var suffix = '...';
    var context = '\n' + prefix + str.substring(start, end) + suffix + '\n';
    for (i = 0; i < prefix.length; i++) {
        context += ' ';
    }
    for (i = start; i < end; i++) {
        context += i === pos ? '^' : ' ';
    }
    for (i = 0; i < suffix.length; i++) {
        context += ' ';
    }
    return context;
}
function getConditionalExpression(expression) {
    var tokensRegExp = /"(?:[^"]|\\")*"|'(?:[^']|\\')*'|\\\\;|\\;|[\{\};]/g;
    var matches;
    var depth = 0;
    var parts = [];
    var partStart = 0;
    while ((matches = tokensRegExp.exec(expression))) {
        if (matches[0] === '{') {
            depth++;
            continue;
        } else if (matches[0] === '}') {
            if (depth !== 0) {
                depth--;
                continue;
            }
        } else if (matches[0] === '\\\\;') {
            /*
             * 1) Convert \\; --> \;
             * 2) Start searching again after the single slash
             */
            expression = expression.substring(0, matches.index) + '\\;' + expression.substring(tokensRegExp.lastIndex);
            tokensRegExp.lastIndex = matches.index + 1;
            continue;
        } else if (matches[0] === '\\;') {
            /*
             * 1) Convert \; --> ;
             * 2) Start searching again after the semicolon
             */
            expression = expression.substring(0, matches.index) + ';' + expression.substring(tokensRegExp.lastIndex);
            tokensRegExp.lastIndex = matches.index + 1;
            continue;
        } else if (matches[0] === ';') {
            if (depth === 0) {
                parts.push(expression.substring(partStart, matches.index));
                partStart = tokensRegExp.lastIndex;
            }
        }
    }
    if (partStart < expression.length) {
        parts.push(expression.substring(partStart));
    }
    function getExpression(part) {
        var expressionParts = [];
        parse(part, {
            text: function (text) {
                expressionParts.push(stringify(text));
            },
            expression: function (expression) {
                expressionParts.push(expression);
            }
        });
        return expressionParts.join('+');
    }
    if (parts.length === 1) {
        return '(' + parts[0] + ' ? ' + 'null' + ' : \'\')';
    } else if (parts.length === 2) {
        return '(' + parts[0] + ' ? ' + getExpression(parts[1]) + ' : \'\')';
    } else if (parts.length === 3) {
        return'(' + parts[0] + ' ? ' + getExpression(parts[1]) + ' : ' + getExpression(parts[2]) + ')';
    } else {
        throw new Error('Invalid simple conditional of "' + expression + '". Simple conditionals should be in the form {?<expression>;<true-template>[;<false-template>]}');
    }
}
function processNestedStrings(expression, foundStrings) {
    var hasExpression;
    var parts;
    function handleText(text) {
        parts.push(foundString.quote + text + foundString.quote);
    }
    function handleExpression(expression) {
        hasExpression = true;
        parts.push(expression);
    }
    for (var i = foundStrings.length - 1, foundString; i >= 0; i--) {
        foundString = foundStrings[i];
        if (!foundString.value) {
            continue;
        }
        hasExpression = false;
        parts = [];
        parse(foundString.value, {
            text: handleText,
            expression: handleExpression
        });
        if (hasExpression) {
            expression = expression.substring(0, foundString.start) + '(' + parts.join('+') + ')' + expression.substring(foundString.end);
        }
    }
    return expression;
}

function ExpressionParserHelper(listeners) {
    this.listeners = listeners;
    this.prevText = null;
    this.prevEscapeXml = null;
}

ExpressionParserHelper.prototype = {
    _invokeCallback: function (name, value, escapeXml) {
        if (!this.listeners[name]) {
            throw createError(new Error(name + ' not allowed: ' + value));
        }
        this.listeners[name](value, escapeXml);
    },
    _endText: function () {
        if (this.prevText !== null) {
            this._invokeCallback('text', this.prevText, this.prevEscapeXml);
            this.prevText = null;
            this.prevEscapeXml = null;
        }
    },
    addXmlText: function (xmlText) {
        this.addText(xmlText, false);
    },
    addText: function (text, escapeXml) {
        if (this.prevText !== null && this.prevEscapeXml === escapeXml) {
            this.prevText += text;
        } else {
            this._endText();
            this.prevText = text;
            this.prevEscapeXml = escapeXml;
        }
    },
    addUnescapedExpression: function (expression, escapeXml) {
        this.addExpression(expression, false);
    },
    addExpression: function (expression, escapeXml) {
        this._endText();
        escapeXml = escapeXml !== false;

        if (!(expression instanceof Expression)) {
            if (!escapeXml) {
                // The expression might be a ternary operator
                // so we need to surround it with parentheses.
                // Minification will remove unnecessary parentheses.
                // We don't need to surround with parentheses if
                // the expression will be escaped since the expression
                // is an argument to a function call
                expression = 'str(' + expression + ')';
            }
            expression = new Expression(expression);
        }
        this._invokeCallback('expression', expression, escapeXml !== false);
    },
    addScriptlet: function (scriptlet) {
        this._endText();
        this._invokeCallback('scriptlet', scriptlet);
    }
};


/**
 * @memberOf raptor/templating/compiler$ExpressionParser
 *
 * @param str
 * @param callback
 * @param thisObj
 */
parse = function (str, listeners, options) {

    ok(str != null, '"str" is required');
    
    if (!options) {
        options = {};
    }
    var textStart = 0;
    var textEnd;
    var startMatches;
    var endMatches;
    var expressionStart;
    var expression;
    var isScriptlet;
    var isConditional;
    var startToken;
    var custom = options.custom || {};
    function handleError(message) {
        if (listeners.error) {
            listeners.error(message);
            return;
        } else {
            throw createError(new Error(message));
        }
    }
    var startRegExp = createStartRegExp();
    var helper = new ExpressionParserHelper(listeners);
    startRegExp.lastIndex = 0;
    /*
     * Look for any of the possible start tokens (including the escaped and double-escaped versions)
     */
    outer:
        while ((startMatches = startRegExp.exec(str))) {
            if (strings.startsWith(startMatches[0], '\\\\')) {
                // \\${
                /*
                 * We found a double-escaped start token.
                 *
                 * We found a start token that is preceeded by an escaped backslash...
                 * The start token is a valid start token preceded by an escaped
                 * backslash. Add a single black slash and handle the expression
                 */
                textEnd = startMatches.index + 1;
                //Include everything up to and include the first backslash as part of the text
                startToken = startMatches[0].substring(2);
                //Record the start token
                expressionStart = startMatches.index + startMatches[0].length;    //The expression starts after the start token
            } else if (strings.startsWith(startMatches[0], '\\')) {
                // \${
                /*
                 * We found a start token that is escaped. We should
                 * add the unescaped start token to the text output.
                 */
                helper.addText(str.substring(textStart, startMatches.index));
                //Add everything preceeding the start token
                helper.addText(startMatches[0].substring(1));
                //Add the start token excluding the initial escape character
                textStart = startRegExp.lastIndex;
                // The next text block we find will be after this match
                continue;
            } else if (endingTokens.hasOwnProperty(startMatches[0])) {
                /*
                 * We found a valid start token
                 */
                startToken = startMatches[0];
                //Record the start token
                textEnd = startMatches.index;    //The text ends where the start token begins
            } else {
                throw createError(new Error('Illegal state. Unexpected start token: ' + startMatches[0]));
            }
            expressionStart = startRegExp.lastIndex;
            //Expression starts where the start token ended
            if (textStart !== textEnd) {
                //If there was any text between expressions then add it now
                helper.addText(str.substring(textStart, textEnd));
            }
            var endToken = endingTokens[startToken];
            //Look up the end token
            if (!endToken) {
                var variableRegExp = /^([_a-zA-Z]\w*(?:\.[_a-zA-Z]\w*)*)/g;
                variableRegExp.lastIndex = 0;
                var variableMatches = variableRegExp.exec(str.substring(expressionStart));
                //Find the variable name that follows the starting "$" token
                if (!variableMatches) {
                    //We did not find a valid variable name after the starting "$" token
                    //handleError('Invalid simple variable expression. Location: ' + errorContext(str, expressionStart, 10)); //TODO: Provide a more helpful error message
                    helper.addText(startMatches[0]);
                    startRegExp.lastIndex = textStart = expressionStart;
                    continue outer;
                }
                var varName = variableMatches[1];
                if (startToken === '$!') {
                    helper.addUnescapedExpression(varName);    //Add the variable as an expression
                } else {
                    helper.addExpression(varName);    //Add the variable as an expression
                }
                startRegExp.lastIndex = textStart = expressionStart = expressionStart + varName.length;
                continue outer;
            }
            isScriptlet = startToken === '{%';
            isConditional = startToken === '{?';
            var endRegExp = /"((?:[^"]|\\")*)"|'((?:[^']|\\')*)'|\%\}|[\{\}]/g;
            //Now we need to find the ending curly
            endRegExp.lastIndex = expressionStart;
            var depth = 0;
            var foundStrings = [];
            var handler;
            while ((endMatches = endRegExp.exec(str))) {
                if (endMatches[0] === '{') {
                    depth++;
                    continue;
                } else if (endMatches[0] === '}') {
                    if (isScriptlet) {
                        continue;
                    }
                    if (depth !== 0) {
                        depth--;
                        continue;
                    }
                } else if (endMatches[0] === '%}') {
                    if (!isScriptlet) {
                        handleError('Ending "' + endMatches[0] + '" token was found but matched with starting "' + startToken + '" token. Location: ' + errorContext(str, endMatches.index, 10));
                    }
                } else {
                    if (endMatches[0].charAt(0) === '\'' || endMatches[0].charAt(0) === '"') {
                        foundStrings.push({
                            start: endMatches.index - expressionStart,
                            end: endMatches.index + endMatches[0].length - expressionStart,
                            value: endMatches[0].slice(1, -1),
                            json: endMatches[0],
                            quote: endMatches[0].charAt(0)
                        });
                    }
                    continue;
                }
                //console.log("EXPRESSION: " + str.substring(firstCurly+1, endMatches.index));
                expression = str.substring(expressionStart, endMatches.index);
                handler = null;
                if (startToken === '${') {
                    var firstColon = expression.indexOf(':');
                    var customType;
                    if (firstColon != -1) {
                        customType = expression.substring(0, firstColon);
                        handler = custom[customType] || exports.custom[customType];
                        if (handler) {
                            handler.call(exports, expression.substring(firstColon + 1), helper);
                        }
                    }
                }
                if (!handler) {
                    if (isScriptlet) {
                        helper.addScriptlet(expression);
                    } else if (isConditional) {
                        helper.addExpression(getConditionalExpression(expression));
                    } else {
                        if (foundStrings.length > 0) {
                            expression = processNestedStrings(expression, foundStrings);
                        }
                        if (startToken === '$!{') {
                            helper.addUnescapedExpression(expression);
                        } else {
                            helper.addExpression(expression);
                        }
                    }
                }
                startRegExp.lastIndex = endRegExp.lastIndex;
                //Start searching from where the end token ended
                textStart = endRegExp.lastIndex;
                //console.log('Found ending curly. Start index now: ' + searchStart);
                continue outer;
            }
            handleError('Ending "' + endingTokens[startToken] + '" token not found for "' + startToken + '" token. Location: ' + errorContext(str, startMatches.index, 10) + '\n');
        }
    if (textStart !== str.length) {
        helper.addText(str.substring(textStart, str.length));
    }
    helper._endText();
};

function hasExpression(str) {
    var hasExpressionFlag = false;
    parse(str, {
        text: function (text) {
        },
        expression: function (expression) {
            hasExpressionFlag = true;
        }
    });

    return hasExpressionFlag;
}

exports.hasExpression = hasExpression;
exports.parse = parse;
exports.custom = {
    'xml': function (expression, helper) {
        helper.addUnescapedExpression(new Expression(expression));
    },
    'entity': function (expression, helper) {
        helper.addXmlText('&' + expression + ';');
    },
    'startTag': function (expression, helper) {
        helper.addXmlText('<' + expression + '>');
    },
    'endTag': function (expression, helper) {
        helper.addXmlText('</' + expression + '>');
    },
    'newline': function (expression, helper) {
        helper.addText('\n');
    }
};

});
$rmod.def("/marko@2.7.28/compiler/Expression", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var operatorsRegExp = /"(?:[^"]|\\")*"|'(?:[^']|\\')*'|\s+(?:and|or|lt|gt|eq|ne|lt|gt|ge|le)\s+/g;
var replacements = {
        'and': ' && ',
        'or': ' || ',
        'eq': ' === ',
        'ne': ' !== ',
        'lt': ' < ',
        'gt': ' > ',
        'ge': ' >= ',
        'le': ' <= '
    };
function handleBinaryOperators(str) {
    return str.replace(operatorsRegExp, function (match) {
        return replacements[match.trim()] || match;
    });
}
function Expression(expression, replaceSpecialOperators) {
    if (expression == null) {
        throw createError(new Error('expression argument is required'));
    }
    if (replaceSpecialOperators !== false && typeof expression === 'string') {
        expression = handleBinaryOperators(expression);
    }
    this.expression = expression;
}
Expression.prototype = {
    getExpression: function () {
        return this.expression;
    },
    toString: function () {
        return this.expression.toString();
    }
};
module.exports = Expression;
});
$rmod.def("/marko@2.7.28/compiler/TypeConverter", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var expressionParser = require('./expression-parser');
var stringify = require('/$/marko/$/raptor-json/stringify'/*'raptor-json/stringify'*/);
var Expression = require('./Expression');
function TypeConverter() {
}
TypeConverter.convert = function (value, targetType, allowExpressions) {
    var hasExpression = false;
    var expressionParts = [];
    if (value == null) {
        return value;
    }
    if (targetType === 'custom' || targetType === 'identifier') {
        return value;
    }

    if (targetType === 'expression' || targetType === 'object' || targetType === 'array') {
        if (value === '') {
            value = 'null';
        }
        return new Expression(value);
    }
    var processedText = '';
    if (allowExpressions) {
        expressionParser.parse(value, {
            text: function (text) {
                processedText += text;
                expressionParts.push(stringify(text));
            },
            expression: function (expression) {
                expressionParts.push(expression);
                hasExpression = true;
            }
        });

        if (hasExpression) {
            value = new Expression(expressionParts.join('+'));

            if (targetType === 'template') {
                return new Expression('__helpers.l(' + value + ')');
            } else {
                return value;
            }
        }

        value = processedText;
    }
    if (targetType === 'string') {
        return allowExpressions ? new Expression(value != null ? stringify(value) : 'null') : value;
    } else if (targetType === 'boolean') {
        if (!allowExpressions) {
            value = value.toLowerCase();
        }

        if (!allowExpressions || value === 'true' || value === 'yes' || value === '') {
            //convert it to a boolean
            return new Expression(true);
        }

        return new Expression(value);
    } else if (targetType === 'float' || targetType === 'double' || targetType === 'number' || targetType === 'integer' || targetType === 'int') {
        if (allowExpressions) {
            return new Expression(value);
        } else {
            if (targetType === 'integer') {
                value = parseInt(value, 10);
            } else {
                value = parseFloat(value);
            }
            return value;
        }
    } else if (targetType === 'path') {
        return new Expression('require.resolve(' + JSON.stringify(value) + ')');
    } else if (targetType === 'template') {
        return new Expression('__helpers.l(require.resolve(' + JSON.stringify(value) + '))');
    } else {
        throw createError(new Error('Unsupported attribute type: ' + targetType));
    }
};
module.exports = TypeConverter;
});
$rmod.def("/marko@2.7.28/compiler/EscapeXmlContext", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
module.exports = {
    'ELEMENT': 'ELEMENT',
    'ATTRIBUTE': 'ATTRIBUTE'
};
});
$rmod.main("/marko@2.7.28/compiler/taglibs", "index");
$rmod.main("/marko@2.7.28/compiler/taglibs/Taglib", "index");
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/Tag", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var ok = require('assert'/*'assert'*/).ok;

function inheritProps(sub, sup) {
    forEachEntry(sup, function (k, v) {
        if (!sub[k]) {
            sub[k] = v;
        }
    });
}

module.exports = makeClass({
    $init: function(taglib) {
        this.taglibId = taglib ? taglib.id : null;
        this.renderer = null;
        this.nodeClass = null;
        this.template = null;
        this.attributes = {};
        this.transformers = {};
        this.nestedVariables = null;
        this.importedVariables = null;
        this.patternAttributes = [];
        this.bodyFunction = null;
        this.nestedTags = null;
        this.isRepeated = null;
        this.isNestedTag = false;
        this.parentTagName = null;
        this.type = null; // Only applicable for nested tags
    },
    inheritFrom: function (superTag) {
        var subTag = this;
        /*
         * Have the sub tag inherit any properties from the super tag that are not in the sub tag
         */
        forEachEntry(superTag, function (k, v) {
            if (subTag[k] === undefined) {
                subTag[k] = v;
            }
        });
        [
            'attributes',
            'transformers',
            'nestedVariables',
            'importedVariables',
            'bodyFunction'
        ].forEach(function (propName) {
            inheritProps(subTag[propName], superTag[propName]);
        });
        subTag.patternAttributes = superTag.patternAttributes.concat(subTag.patternAttributes);
    },
    forEachVariable: function (callback, thisObj) {
        if (!this.nestedVariables) {
            return;
        }

        this.nestedVariables.vars.forEach(callback, thisObj);
    },
    forEachImportedVariable: function (callback, thisObj) {
        if (!this.importedVariables) {
            return;
        }

        forEachEntry(this.importedVariables, function (key, importedVariable) {
            callback.call(thisObj, importedVariable);
        });
    },
    forEachTransformer: function (callback, thisObj) {
        forEachEntry(this.transformers, function (key, transformer) {
            callback.call(thisObj, transformer);
        });
    },
    hasTransformers: function () {
        /*jshint unused:false */
        for (var k in this.transformers) {
            if (this.transformers.hasOwnProperty(k)) {
                return true;
            }

        }
        return false;
    },
    addAttribute: function (attr) {
        if (attr.pattern) {
            this.patternAttributes.push(attr);
        } else {
            if (attr.name === '*') {
                attr.dynamicAttribute = true;

                if (attr.targetProperty === null || attr.targetProperty === '') {
                    attr.targetProperty = null;

                }
                else if (!attr.targetProperty) {
                    attr.targetProperty = '*';
                }
            }

            this.attributes[attr.name] = attr;
        }
    },
    toString: function () {
        return '[Tag: <' + this.name + '@' + this.taglibId + '>]';
    },
    forEachAttribute: function (callback, thisObj) {
        for (var attrName in this.attributes) {
            if (this.attributes.hasOwnProperty(attrName)) {
                callback.call(thisObj, this.attributes[attrName]);
            }
        }
    },
    addNestedVariable: function (nestedVariable) {
        if (!this.nestedVariables) {
            this.nestedVariables = {
                __noMerge: true,
                vars: []
            };
        }

        this.nestedVariables.vars.push(nestedVariable);
    },
    addImportedVariable: function (importedVariable) {
        if (!this.importedVariables) {
            this.importedVariables = {};
        }
        var key = importedVariable.targetProperty;
        this.importedVariables[key] = importedVariable;
    },
    addTransformer: function (transformer) {
        var key = transformer.path;
        transformer.taglibId = this.taglibId;
        this.transformers[key] = transformer;
    },
    setBodyFunction: function(name, params) {
        this.bodyFunction = {
            __noMerge: true,
            name: name,
            params: params
        };
    },
    setBodyProperty: function(propertyName) {
        this.bodyProperty = propertyName;
    },
    addNestedTag: function(nestedTag) {
        ok(nestedTag.name, '"nestedTag.name" is required');

        if (!this.nestedTags) {
            this.nestedTags = {};
        }

        nestedTag.isNestedTag = true;

        if (!nestedTag.targetProperty) {
            nestedTag.targetProperty = nestedTag.name;
        }

        this.nestedTags[nestedTag.name] = nestedTag;
    },
    forEachNestedTag: function (callback, thisObj) {
        if (!this.nestedTags) {
            return;
        }

        forEachEntry(this.nestedTags, function (key, nestedTag) {
            callback.call(thisObj, nestedTag);
        });
    },
    hasNestedTags: function() {
        return this.nestedTags != null;
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/Attribute", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;

module.exports = makeClass({
    $init: function(name) {
        this.name = name;
        this.type = null;
        this.required = false;
        this.type = 'string';
        this.allowExpressions = true;
        this.setFlag = null;
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/Property", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;

module.exports = makeClass({
    $init: function() {
        this.name = null;
        this.type = 'string';
        this.value = undefined;
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/NestedVariable", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;

module.exports = makeClass({
    $init: function() {
        this.name = null;
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/ImportedVariable", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;

module.exports = makeClass({
    $init: function() {
        this.targetProperty = null;
        this.expression = null;
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/Transformer", function(require, exports, module, __filename, __dirname) { var process=require("process"); /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var makeClass = require('/$/marko/$/raptor-util'/*'raptor-util'*/).makeClass;

var nextTransformerId = 0;

module.exports = makeClass({
    $init: function() {
        this.id = nextTransformerId++;
        this.name = null;
        this.tag = null;
        this.path = null;
        this.priority = null;
        this._func = null;
        this.properties = {};
    },

    getFunc: function () {
        if (!this.path) {
            throw new Error('Transformer path not defined for tag transformer (tag=' + this.tag + ')');
        }

        if (!this._func) {
            var transformer = require(this.path);

            if (typeof transformer === 'function') {
                if (transformer.prototype.process) {
                    var Clazz = transformer;
                    var instance = new Clazz();
                    instance.id = this.id;
                    this._func = instance.process.bind(instance);
                } else {
                    this._func = transformer;
                }
            } else {
                this._func = transformer.process || transformer.transform;
            }
        }
        return this._func;
    },
    toString: function () {
        return '[Taglib.Transformer: ' + this.path + ']';
    }
});
});
$rmod.def("/marko@2.7.28/compiler/taglibs/Taglib/index", function(require, exports, module, __filename, __dirname) { /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var ok = require('assert'/*'assert'*/).ok;
var taglibLoader;

function handleImport(taglib, importedTaglib) {
    var importsLookup = taglib.importsLookup || (taglib.importsLookup = {});
    if (importsLookup.hasOwnProperty(importedTaglib.path)) {
        return;
    }

    importsLookup[importedTaglib.path] = importedTaglib;

    if (!taglib.imports) {
        taglib.imports = [];
    }

    taglib.imports.push(importedTaglib);
    taglib.addInputFile(importedTaglib.path);

    if (importedTaglib.imports) {
        importedTaglib.imports.forEach(function(nestedImportedTaglib) {
            handleImport(taglib, nestedImportedTaglib);
        });
    }
}

function Taglib(path) {
    ok(path, '"path" expected');
    this.path = this.id = path;
    this.dirname = null;
    this.tags = {};
    this.textTransformers = [];
    this.attributes = {};
    this.patternAttributes = [];
    this.inputFilesLookup = {};
    this.imports = null;
    this.importsLookup = null;
}

Taglib.prototype = {

    addInputFile: function(path) {
        this.inputFilesLookup[path] = true;
    },

    getInputFiles: function() {
        return Object.keys(this.inputFilesLookup);
    },

    addAttribute: function (attribute) {
        if (attribute.pattern) {
            this.patternAttributes.push(attribute);
        } else if (attribute.name) {
            this.attributes[attribute.name] = attribute;
        } else {
            throw new Error('Invalid attribute: ' + require('util'/*'util'*/).inspect(attribute));
        }
    },
    getAttribute: function (name) {
        var attribute = this.attributes[name];
        if (!attribute) {
            for (var i = 0, len = this.patternAttributes.length; i < len; i++) {
                var patternAttribute = this.patternAttributes[i];
                if (patternAttribute.pattern.test(name)) {
                    attribute = patternAttribute;
                }
            }
        }
        return attribute;
    },
    addTag: function (tag) {
        ok(arguments.length === 1, 'Invalid args');
        ok(tag.name, '"tag.name" is required');
        this.tags[tag.name] = tag;
        tag.taglibId = this.id || this.path;
    },
    addTextTransformer: function (transformer) {
        this.textTransformers.push(transformer);
    },
    forEachTag: function (callback, thisObj) {
        forEachEntry(this.tags, function (key, tag) {
            callback.call(thisObj, tag);
        }, this);
    },

    addImport: function(path) {
        var importedTaglib = taglibLoader.load(path);
        handleImport(this, importedTaglib);
    }
};

Taglib.Tag = require('./Tag');
Taglib.Attribute = require('./Attribute');
Taglib.Property = require('./Property');
Taglib.NestedVariable = require('./NestedVariable');
Taglib.ImportedVariable = require('./ImportedVariable');
Taglib.Transformer = require('./Transformer');

module.exports = Taglib;

taglibLoader = require('../taglib-loader');
});
$rmod.main("/marko@2.7.28/compiler/taglibs/taglib-loader", "index");
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/handleAttributes", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var ok = require('assert'/*'assert'*/).ok;
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var loader = require('./loader');

module.exports = function handleAttributes(value, parent, path) {
    ok(parent);

    forEachEntry(value, function(attrName, attrProps) {
        var attr = loader.attributeLoader.loadAttribute(
            attrName,
            attrProps,
            '"' + attrName + '" attribute as part of ' + path);

        parent.addAttribute(attr);
    });
};
});
$rmod.remap("/marko@2.7.28/compiler/taglibs/taglib-loader/scanTagsDir", "scanTagsDir-browser");
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/scanTagsDir-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

module.exports = function scanTagsDir() {
    // no-op in the browser
};
});
$rmod.remap("/marko@2.7.28/compiler/util/resolve", "resolve-browser");
$rmod.def("/marko@2.7.28/compiler/util/resolve-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var nodePath = require('path-browserify'/*'path'*/);

module.exports = function(target, from) {
    return nodePath.join(from, target);
};
});
$rmod.main("/property-handlers@1.0.1", "lib/index");
$rmod.dep("/$/marko", "property-handlers", "1.0.1");
$rmod.def("/property-handlers@1.0.1/lib/index", function(require, exports, module, __filename, __dirname) { function removeDashes(str) {
    return str.replace(/-([a-z])/g, function (match, lower) {
        return lower.toUpperCase();
    });
}

module.exports = function invokeHandlers(config, handlers, options) {
    var path;

    if (options != null) {
        if (typeof options === 'string') {
            path = options;
        } else {
            path = options.path;
        }
    }

    function error(message, cause) {
        if (cause) {
            if (cause.__propertyHandlers) {
                throw cause;
            }

            message += '. Cause: ' + (cause.stack || cause);
        }

        if (path) {
            message = 'Error while handling properties for ' + path + ': ' + message;
        }

        var e = new Error(message);
        e.__propertyHandlers = true;
        throw e;
    }

    if (!config) {
        error('"config" argument is required');
    }

    if (typeof config !== 'object') {
        error('object expected');
    }

    for (var k in config) {
        if (config.hasOwnProperty(k)) {
            var value = config[k];
            var keyNoDashes = removeDashes(k);
            var handler = handlers[keyNoDashes];
            var isDefaultHandler = false;

            if (!handler) {
                handler = handlers['*'];
                isDefaultHandler = true;
            }

            if (!handler) {
                error('Invalid option of "' + keyNoDashes + '". Allowed: ' + Object.keys(handlers).join(', '));
            }

            try {
                if (isDefaultHandler) {
                    if (handler.call(handlers, k, value) === false) {
                        error('Invalid option: ' + k);
                    }
                } else {
                    handler.call(handlers, value);
                }
            } catch(e) {
                error('Error while applying option of "' + k + '"', e);
            }
        }
    }

    if (handlers._end) {
        try {
            handlers._end();
        }
        catch(e) {
            error('Error after applying properties', e);
        }
    }
};
});
$rmod.remap("/marko@2.7.28/compiler/taglibs/taglib-loader/taglib-reader", "taglib-reader-browser");
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/taglib-reader-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

exports.readTaglib = function (path) {
    var taglibProps;

    try {
        taglibProps = require(path);
    } catch(e) {
        throw new Error('Unable to parse taglib JSON at path "' + path + '". Exception: ' + e);
    }

    return taglibProps;
};
});
$rmod.dep("/$/marko", "try-require", "1.2.1");
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/loader-taglib", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

require('/$/marko/$/raptor-polyfill/string/startsWith'/*'raptor-polyfill/string/startsWith'*/);
var ok = require('assert'/*'assert'*/).ok;
var nodePath = require('path-browserify'/*'path'*/);
var handleAttributes = require('./handleAttributes');
var scanTagsDir = require('./scanTagsDir');
var resolve = require('../../util/resolve'); // NOTE: different implementation for browser
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var Taglib = require('../Taglib');
var taglibReader = require('./taglib-reader');
var loader = require('./loader');
var tryRequire = require('/$/marko/$/try-require'/*'try-require'*/);
var resolveFrom = tryRequire('resolve-from', require);

function exists(path) {
    try {
        require.resolve(path);
        return true;
    } catch(e) {
        return false;
    }
}

function handleTag(taglibHandlers, tagName, path) {
    var taglib = taglibHandlers.taglib;
    var dirname = taglibHandlers.dirname;

    ok(path, 'Invalid tag definition for "' + tagName + '"');

    var tagObject;

    var tagDirname;

    if (typeof path === 'string') {
        path = nodePath.resolve(dirname, path);
        taglib.addInputFile(path);

        tagDirname = nodePath.dirname(path);
        if (!exists(path)) {
            throw new Error('Tag at path "' + path + '" does not exist. Taglib: ' + taglib.path);
        }

        try {
            tagObject = require(path);
        } catch(e) {
            throw new Error('Unable to parse tag JSON for tag at path "' + path + '"');
        }
    } else {
        tagDirname = dirname; // Tag is in the same taglib file
        tagObject = path;
        path = '<' + tagName + '> tag in ' + taglib.path;
    }


    var tag = loader.tagLoader.loadTag(tagObject, path, taglib, tagDirname);
    if (tag.name === undefined) {
        tag.name = tagName;
    }
    taglib.addTag(tag);
}

/**
 * We load a taglib definion using this class. Properties in the taglib
 * definition (which is just a JavaScript object with properties)
 * are mapped to handler methods in an instance of this type.
 *
 *
 * @param {Taglib} taglib The initially empty Taglib instance that we will populate
 * @param {String} path The file system path to the taglib that we are loading
 */
function TaglibHandlers(taglib, path) {
    ok(taglib);
    ok(path);

    this.taglib = taglib;
    this.path = path;
    this.dirname = nodePath.dirname(path);
}

TaglibHandlers.prototype = {
    attributes: function(value) {
        // The value of the "attributes" property will be an object
        // where each property maps to an attribute definition. Since these
        // attributes are on the taglib they will be "global" attribute
        // defintions.
        //
        // The property key will be the attribute name and the property value
        // will be the attribute definition. Example:
        // {
        //     "attributes": {
        //         "foo": "string",
        //         "bar": "expression"
        //     }
        // }
        var taglib = this.taglib;
        var path = this.path;

        handleAttributes(value, taglib, path);
    },
    tags: function(tags) {
        // The value of the "tags" property will be an object
        // where each property maps to an attribute definition. The property
        // key will be the tag name and the property value
        // will be the tag definition. Example:
        // {
        //     "tags": {
        //         "foo": {
        //             "attributes": { ... }
        //         },
        //         "bar": {
        //             "attributes": { ... }
        //         },
        //     }
        // }

        for (var tagName in tags) {
            if (tags.hasOwnProperty(tagName)) {
                handleTag(this, tagName, tags[tagName]);
            }
        }
    },
    tagsDir: function(dir) {
        // The "tags-dir" property is used to supporting scanning
        // of a directory to discover custom tags. Scanning a directory
        // is a much simpler way for a developer to create custom tags.
        // Only one tag is allowed per directory and the directory name
        // corresponds to the tag name. We only search for directories
        // one level deep.
        var taglib = this.taglib;
        var path = this.path;
        var dirname = this.dirname;

        if (Array.isArray(dir)) {
            for (var i = 0; i < dir.length; i++) {
                scanTagsDir(path, dirname, dir[i], taglib);
            }
        } else {
            scanTagsDir(path, dirname, dir, taglib);
        }
    },

    taglibImports: function(imports) {
        if (!resolveFrom) {
            return;
        }
        // The "taglib-imports" property allows another taglib to be imported
        // into this taglib so that the tags defined in the imported taglib
        // will be part of this taglib.
        //
        // NOTE: If a taglib import refers to a package.json file then we read
        //       the package.json file and automatically import *all* of the
        //       taglibs from the installed modules found in the "dependencies"
        //       section
        var taglib = this.taglib;
        var dirname = this.dirname;
        var importPath;

        if (imports && Array.isArray(imports)) {
            for (var i=0; i<imports.length; i++) {
                var curImport = imports[i];
                if (typeof curImport === 'string') {
                    var basename = nodePath.basename(curImport);
                    if (basename === 'package.json') {
                        var packagePath = resolve(curImport, dirname);
                        var pkg = require(packagePath);
                        var dependencies = pkg.dependencies;
                        if (dependencies) {
                            var dependencyNames = Object.keys(dependencies);
                            for (var j=0; j<dependencyNames.length; j++) {
                                var dependencyName = dependencyNames[j];

                                try {
                                    importPath = resolveFrom(dirname, dependencyName + '/marko-taglib.json');
                                } catch(e) {}

                                if (importPath) {
                                    taglib.addImport(importPath);
                                }
                            }
                        }
                    } else {
                        importPath = resolveFrom(dirname, curImport);
                        taglib.addImport(importPath);
                    }
                }
            }
        }
    },

    textTransformer: function(value) {
        // Marko allows a "text-transformer" to be registered. The provided
        // text transformer will be called for any static text found in a template.
        var taglib = this.taglib;
        var path = this.path;
        var dirname = this.dirname;

        var transformer = new Taglib.Transformer();

        if (typeof value === 'string') {
            value = {
                path: value
            };
        }

        propertyHandlers(value, {
            path: function(value) {
                var path = resolve(value, dirname);
                transformer.path = path;
            }

        }, 'text-transformer in ' + path);

        ok(transformer.path, '"path" is required for transformer');

        taglib.addInputFile(transformer.path);

        taglib.addTextTransformer(transformer);
    },

    /**
     * Allows an ID to be explicitly assigned to a taglib.
     * The taglib ID is used to prevent the same taglib  (even if different versions)
     * from being loaded multiple times.
     *
     * NOTE: Introduced as part of fix for #73
     *
     * @param  {String} value The taglib ID
     */
    taglibId: function(value) {
        var taglib = this.taglib;
        taglib.id = value;
    }
};

exports.loadTaglib = function(path, taglib) {
    var taglibProps = taglibReader.readTaglib(path);

    taglib = taglib || new Taglib(path);
    taglib.addInputFile(path);

    var taglibHandlers = new TaglibHandlers(taglib, path);

    // We register a wildcard handler to handle "@my-attr" and "<my-tag>"
    // properties (shorthand syntax)
    taglibHandlers['*'] = function(name, value) {
        var taglib = this.taglib;
        var path = this.path;

        if (name.startsWith('<')) {
            handleTag(this, name.slice(1, -1), value);
        } else if (name.startsWith('@')) {
            var attrName = name.substring(1);

            var attr = loader.attributeLoader.loadAttribute(
                attrName,
                value,
                '"' + attrName + '" attribute as part of ' + path);

            taglib.addAttribute(attr);
        } else {
            return false;
        }
    };

    propertyHandlers(taglibProps, taglibHandlers, path);

    taglib.path = path;

    if (!taglib.id) {
        // Fixes #73
        // See if there is a package.json in the same directory as the taglib file.
        // If so, and if that package.json file has a "name" property then we will
        // use the the name as the "taglib ID". The taglib ID is used to uniquely
        // identity a taglib (ignoring version) and it is used to prevent the same
        // taglib from being loaded multiple times.
        //
        // Using the file path as the taglib ID doesn't work so well since we might find
        // the same taglib multiple times in the Node.js module search path with
        // different paths.
        var dirname = nodePath.dirname(path);
        var packageJsonPath = nodePath.join(dirname, 'package.json');


        try {
            var pkg = require(packageJsonPath);
            taglib.id = pkg.name;
        } catch(e) {}

        if (!taglib.id) {
            taglib.id = path;
        }
    }

    return taglib;
};
});
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/loader-tag", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

require('/$/marko/$/raptor-polyfill/string/startsWith'/*'raptor-polyfill/string/startsWith'*/);
var ok = require('assert'/*'assert'*/).ok;
var Taglib = require('../Taglib');
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var isObjectEmpty = require('/$/marko/$/raptor-util/isObjectEmpty'/*'raptor-util/isObjectEmpty'*/);
var nodePath = require('path-browserify'/*'path'*/);
var resolve = require('../../util/resolve'); // NOTE: different implementation for browser
var ok = require('assert'/*'assert'*/).ok;
var bodyFunctionRegExp = /^([A-Za-z_$][A-Za-z0-9_]*)(?:\(([^)]*)\))?$/;
var safeVarName = /^[A-Za-z_$][A-Za-z0-9_]*$/;
var handleAttributes = require('./handleAttributes');
var Taglib = require('../Taglib');
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var loader = require('./loader');

function exists(path) {
    try {
        require.resolve(path);
        return true;
    } catch(e) {
        return false;
    }
}

function removeDashes(str) {
    return str.replace(/-([a-z])/g, function (match, lower) {
        return lower.toUpperCase();
    });
}

function handleVar(tag, value, path) {
    var nestedVariable;

    if (typeof value === 'string') {
        nestedVariable = {
            name: value
        };
    } else {
        nestedVariable = {};

        propertyHandlers(value, {

            name: function(value) {
                nestedVariable.name = value;
            },

            nameFromAttribute: function(value) {
                nestedVariable.nameFromAttribute = value;
            }

        }, path);

        if (!nestedVariable.name && !nestedVariable.nameFromAttribute) {
            throw new Error('The "name" or "name-from-attribute" attribute is required for a nested variable');
        }
    }

    tag.addNestedVariable(nestedVariable);
}


/**
 * We load tag definition using this class. Properties in the taglib
 * definition (which is just a JavaScript object with properties)
 * are mapped to handler methods in an instance of this type.
 *
 * @param {Tag} tag The initially empty Tag instance that we populate
 * @param {String} dirname The full file system path associated with the tag being loaded
 * @param {String} path An informational path associated with this tag (used for error reporting)
 */
function TagHandlers(tag, dirname, path, taglib) {
    this.tag = tag;
    this.dirname = dirname;
    this.path = path;
    this.taglib = taglib;

    if (!taglib) {
        throw new Error('taglib expected');
    }
}

TagHandlers.prototype = {
    /**
     * The tag name
     * @param {String} value The tag name
     */
    name: function(value) {
        var tag = this.tag;
        tag.name = value;
    },

    /**
     * The path to the renderer JS module to use for this tag.
     *
     * NOTE: We use the equivalent of require.resolve to resolve the JS module
     * 		 and use the tag directory as the "from".
     *
     * @param {String} value The renderer path
     */
    renderer: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;
        var path = resolve(value, dirname);

        this.taglib.addInputFile(path);

        tag.renderer = path;
    },

    /**
     * A tag can use a renderer or a template to do the rendering. If
     * a template is provided then the value should be the path to the
     * template to use to render the custom tag.
     */
    template: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;

        var path = nodePath.resolve(dirname, value);
        if (!exists(path)) {
            throw new Error('Template at path "' + path + '" does not exist.');
        }

        this.taglib.addInputFile(path);

        tag.template = path;
    },

    /**
     * An Object where each property maps to an attribute definition.
     * The property key will be the attribute name and the property value
     * will be the attribute definition. Example:
     * {
     *     "attributes": {
     *         "foo": "string",
     *         "bar": "expression"
     *     }
     * }
     */
    attributes: function(value) {
        var tag = this.tag;
        var path = this.path;

        handleAttributes(value, tag, path);
    },

    /**
     * A custom tag can be mapped to a compile-time Node that gets
     * added to the parsed Abstract Syntax Tree (AST). The Node can
     * then generate custom JS code at compile time. The value
     * should be a path to a JS module that gets resolved using the
     * equivalent of require.resolve(path)
     */
    nodeClass: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;

        var path = resolve(value, dirname);
        tag.nodeClass = path;
        this.taglib.addInputFile(path);
    },
    /**
     * If the "preserve-whitespace" property is set to true then
     * all whitespace nested below the custom tag in a template
     * will be stripped instead of going through the normal whitespace
     * removal rules.
     */
    preserveWhitespace: function(value) {
        var tag = this.tag;
        tag.preserveWhitespace = !!value;
    },

    /**
     * If a custom tag has an associated transformer then the transformer
     * will be called on the compile-time Node. The transformer can manipulate
     * the AST using the DOM-like API to change how the code gets generated.
     */
    transformer: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;
        var path = this.path;
        var taglib = this.taglib;

        var transformer = new Taglib.Transformer();

        if (typeof value === 'string') {
            // The value is a simple string type
            // so treat the value as the path to the JS
            // module for the transformer
            value = {
                path: value
            };
        }

        /**
         * The transformer is a complex type and we need
         * to process each property to load the Transformer
         * definition.
         */
        propertyHandlers(value, {
            path: function(value) {
                var path = resolve(value, dirname);
                transformer.path = path;
                taglib.addInputFile(path);
            },

            priority: function(value) {
                transformer.priority = value;
            },

            name: function(value) {
                transformer.name = value;
            },

            properties: function(value) {
                var properties = transformer.properties || (transformer.properties = {});
                for (var k in value) {
                    if (value.hasOwnProperty(k)) {
                        properties[k] = value[k];
                    }
                }
            }

        }, 'transformer in ' + path);

        ok(transformer.path, '"path" is required for transformer');

        tag.addTransformer(transformer);
    },

    /**
     * The "var" property is used to declared nested variables that get
     * added as JavaScript variables at compile time.
     *
     * Examples:
     *
     * "var": "myScopedVariable",
     *
     * "var": {
     *     "name": "myScopedVariable"
     * }
     *
     * "var": {
     *     "name-from-attribute": "var"
     * }
     */
    'var': function(value) {
        handleVar(this.tag, value, '"var" in tag ' + this.path);
    },
    /**
     * The "vars" property is equivalent to the "var" property
     * except that it expects an array of nested variables.
     */
    vars: function(value) {
        var tag = this.tag;
        var self = this;

        if (value) {
            value.forEach(function(v, i) {
                handleVar(tag, v, '"vars"[' + i + '] in tag ' + self.path);
            });
        }
    },
    /**
     * The "body-function" property" allows the nested body content to be mapped
     * to a function at compile time. The body function gets mapped to a property
     * of the tag renderer at render time. The body function can have any number
     * of parameters.
     *
     * Example:
     * - "body-function": "_handleBody(param1, param2, param3)"
     */
    bodyFunction: function(value) {
        var tag = this.tag;
        var parts = bodyFunctionRegExp.exec(value);
        if (!parts) {
            throw new Error('Invalid value of "' + value + '" for "body-function". Expected value to be of the following form: <function-name>([param1, param2, ...])');
        }

        var functionName = parts[1];
        var params = parts[2];
        if (params) {
            params = params.trim().split(/\s*,\s*/);
            for (var i=0; i<params.length; i++) {
                if (params[i].length === 0) {
                    throw new Error('Invalid parameters for body-function with value of "' + value + '"');
                } else if (!safeVarName.test(params[i])) {
                    throw new Error('Invalid parameter name of "' + params[i] + '" for body-function with value of "' + value + '"');
                }
            }
        } else {
            params = [];
        }

        tag.setBodyFunction(functionName, params);
    },
    /**
     * The "body-property" property can be used to map the body content
     * to a String property on the renderer's input object.
     *
     * Example:
     * "body-property": "label"
     */
    bodyProperty: function(value) {
        var tag = this.tag;
        tag.setBodyProperty(value);
    },
    /**
     * The "import-var" property can be used to add a property to the
     * input object of the tag renderer whose value is determined by
     * a JavaScript expression.
     *
     * Example:
     * "import-var": {
     *     "myTargetProperty": "data.myCompileTimeJavaScriptExpression",
     * }
     */
    importVar: function(value) {
        var tag = this.tag;
        forEachEntry(value, function(varName, varValue) {
            var importedVar = {
                targetProperty: varName
            };

            var expression = varValue;

            if (!expression) {
                expression = varName;
            }
            else if (typeof expression === 'object') {
                expression = expression.expression;
            }

            if (!expression) {
                throw new Error('Invalid "import-var": ' + require('util'/*'util'*/).inspect(varValue));
            }

            importedVar.expression = expression;
            tag.addImportedVariable(importedVar);
        });
    },
    /**
     * The tag type.
     */
    type: function(value) {
        var tag = this.tag;
        tag.type = value;
    },
    /**
     * Declare a nested tag.
     *
     * Example:
     * {
     *     ...
     *     "nested-tags": {
     *        "tab": {
     *            "target-property": "tabs",
     *            "isRepeated": true
     *        }
     *     }
     * }
     */
    nestedTags: function(value) {
        var tagPath = this.path;
        var taglib = this.taglib;
        var dirname = this.dirname;
        var tag = this.tag;

        forEachEntry(value, function(nestedTagName, nestedTagDef) {
            var nestedTag = loadTag(
                nestedTagDef,
                nestedTagName + ' of ' + tagPath,
                taglib,
                dirname);
            nestedTag.name = nestedTagName;
            tag.addNestedTag(nestedTag);
        });
    },
    escapeXmlBody: function(value) {
        if (value === false) {
            this.tag.escapeXmlBody = false;
        }
    }
};

exports.isSupportedProperty = function(name) {
    return TagHandlers.prototype.hasOwnProperty(name);
};

function hasAttributes(tagProps) {
    if (tagProps.attributes != null) {
        return true;
    }

    for (var name in tagProps) {
        if (tagProps.hasOwnProperty(name) && name.startsWith('@')) {
            return true;
        }
    }

    return false;
}

function loadTag(tagProps, path, taglib, dirname) {
    ok(tagProps);
    ok(typeof path === 'string');
    ok(taglib);
    ok(typeof dirname === 'string');

    var tag = new Taglib.Tag(taglib);



    if (!hasAttributes(tagProps)) {
        // allow any attributes if no attributes are declared
        tagProps.attributes = {
            '*': 'string'
        };
    }

    var tagHandlers = new TagHandlers(tag, dirname, path, taglib);

    // We add a handler for any properties that didn't match
    // one of the default property handlers. This is used to
    // match properties in the form of "@attr_name" or
    // "<nested_tag_name>"
    tagHandlers['*'] = function(name, value) {
        var parts = name.split(/\s+|\s+[,]\s+/);

        var i;
        var part;

        var hasNestedTag = false;
        var hasAttr = false;
        var nestedTagTargetProperty = null;

        // We do one pass to figure out if there is an
        // attribute or nested tag or both
        for (i=0; i<parts.length; i++) {
            part = parts[i];
            if (part.startsWith('@')) {
                hasAttr = true;

                if (i === 0) {
                    // Use the first attribute value as the name of the target property
                    nestedTagTargetProperty = part.substring(1);
                }
            } else if (part.startsWith('<')) {
                hasNestedTag = true;
            } else {
                // Unmatched property that is not an attribute or a
                // nested tag
                return false;
            }
        }

        var attrProps = {};
        var tagProps = {};
        var k;

        if (value != null && typeof value === 'object') {
            for (k in value) {
                if (value.hasOwnProperty(k)) {
                    if (k.startsWith('@') || k.startsWith('<')) {
                        // Move over all of the attributes and nested tags
                        // to the tag definition.
                        tagProps[k] = value[k];
                        delete value[k];
                    } else {
                        // The property is not a shorthand attribute or shorthand
                        // tag so move it over to either the tag definition
                        // or the attribute definition or both the tag definition
                        // and attribute definition.
                        var propNameDashes = removeDashes(k);

                        if (loader.tagLoader.isSupportedProperty(propNameDashes) &&
                            loader.attributeLoader.isSupportedProperty(propNameDashes)) {
                            // Move over all of the properties that are associated with a tag
                            // and attribute
                            tagProps[k] = value[k];
                            attrProps[k] = value[k];
                            delete value[k];
                        } else if (loader.tagLoader.isSupportedProperty(propNameDashes)) {
                            // Move over all of the properties that are associated with a tag
                            tagProps[k] = value[k];
                            delete value[k];
                        } else if (loader.attributeLoader.isSupportedProperty(propNameDashes)) {
                            // Move over all of the properties that are associated with an attr
                            attrProps[k] = value[k];
                            delete value[k];
                        }
                    }
                }
            }

            // If there are any left over properties then something is wrong
            // with the user's taglib.
            if (!isObjectEmpty(value)) {
                throw new Error('Unsupported properties of [' +
                    Object.keys(value).join(', ') +
                    '] for "' + name + '" in "'  + path + '"');
            }

            var type = attrProps.type;
            if (!type && hasAttr && hasNestedTag) {
                // If we have an attribute and a nested tag then default
                // the attribute type to "expression"
                attrProps.type = 'expression';
            }
        } else if (typeof value === 'string') {
            if (hasNestedTag && hasAttr) {
                tagProps = attrProps = {
                    type: value
                };
            } else if (hasNestedTag) {
                tagProps = {
                    type: value
                };
            } else {
                attrProps = {
                    type: value
                };
            }
        }

        // Now that we have separated out attribute properties and tag properties
        // we need to create the actual attributes and nested tags
        for (i=0; i<parts.length; i++) {
            part = parts[i];
            if (part.startsWith('@')) {
                // This is a shorthand attribute
                var attrName = part.substring(1);

                var attr = loader.attributeLoader.loadAttribute(
                    attrName,
                    attrProps,
                    '"' + attrName + '" attribute as part of ' + path);

                tag.addAttribute(attr);
            } else if (part.startsWith('<')) {

                // This is a shorthand nested tag
                var nestedTag = loadTag(
                    tagProps,
                    name + ' of ' + path,
                    taglib,
                    dirname);

                // We use the '[]' suffix to indicate that a nested tag
                // can be repeated
                var isNestedTagRepeated = false;
                if (part.endsWith('[]')) {
                    isNestedTagRepeated = true;
                    part = part.slice(0, -2);
                }

                var nestedTagName = part.substring(1, part.length-1);
                nestedTag.name = nestedTagName;
                nestedTag.isRepeated = isNestedTagRepeated;
                // Use the name of the attribute as the target property unless
                // this target property was explicitly provided
                nestedTag.targetProperty = attrProps.targetProperty || nestedTagTargetProperty;
                tag.addNestedTag(nestedTag);
            } else {
                return false;
            }
        }
    };

    propertyHandlers(tagProps, tagHandlers, path);

    return tag;
}

exports.loadTag = loadTag;
});
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/loader-attribute", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var assert = require('assert'/*'assert'*/);
var raptorRegexp = require('/$/marko/$/raptor-regexp'/*'raptor-regexp'*/);
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var Taglib = require('../Taglib');

function AttrHandlers(attr){
    assert.ok(attr);
    assert.equal(typeof attr, 'object');
    this.attr = attr;
}

AttrHandlers.prototype = {
    /**
     * The attribute type. One of the following:
     * - string (the default)
     * - expression (a JavaScript expression)
     * - number
     * - integer
     * - int
     * - boolean
     * - float
     * - double
     * - object
     * - array
     *
     */
    type: function(value) {
        var attr = this.attr;
        attr.type = value;
    },

    /**
     * The name of the target property to use when mapping
     * the attribute to a property on the target object.
     */
    targetProperty: function(value) {
        var attr = this.attr;
        attr.targetProperty = value;
    },
    /**
     * The "default-value" property allows a default value
     * to be provided when the attribute is not declared
     * on the custom tag.
     */
    defaultValue: function(value) {
        var attr = this.attr;
        attr.defaultValue = value;
    },
    /**
     * The "pattern" property allows the attribute
     * to be matched based on a simplified regular expression.
     *
     * Example:
     *
     * "pattern": "myprefix-*"
     */
    pattern: function(value) {
        var attr = this.attr;
        if (value === true) {
            var patternRegExp = raptorRegexp.simple(attr.name);
            attr.pattern = patternRegExp;
        }
    },

    /**
     * If "allow-expressions" is set to true (the default) then
     * the the attribute value will be parsed to find any dynamic
     * parts.
     */
    allowExpressions: function(value) {
        var attr = this.attr;
        attr.allowExpressions = value;
    },

    /**
     * By default, the Marko compiler maps an attribute
     * to a property by removing all dashes from the attribute
     * name and converting each character after a dash to
     * an uppercase character (e.g. "my-attr" --> "myAttr").
     *
     * Setting "preserve-name" to true will prevent this from
     * happening for the attribute.
     */
    preserveName: function(value) {
        var attr = this.attr;
        attr.preserveName = value;
    },
    /**
     * Declares an attribute as required. Currently, this is
     * not enforced and is only used for documentation purposes.
     *
     * Example:
     * "required": true
     */
    required: function(value) {
        var attr = this.attr;
        attr.required = value === true;
    },
    /**
     * This is the opposite of "preserve-name" and will result
     * in dashes being removed from the attribute if set to true.
     */
    removeDashes: function(value) {
        var attr = this.attr;
        attr.removeDashes = value === true;
    },
    /**
     * The description of the attribute. Only used for documentation.
     */
    description: function() {

    },

    /**
     * The "set-flag" property allows a "flag" to be added to a Node instance
     * at compile time if the attribute is found on the node. This is helpful
     * if an attribute uses a pattern and a transformer wants to have a simple
     * check to see if the Node has an attribute that matched the pattern.
     *
     * Example:
     *
     * "set-flag": "myCustomFlag"
     *
     * A Node instance can be checked if it has a flag set as shown below:
     *
     * if (node.hasFlag('myCustomFlag')) { ... }
     *
     *
     */
    setFlag: function(value) {
        var attr = this.attr;
        attr.setFlag = value;
    },
    /**
     * An attribute can be marked for ignore. Ignored attributes
     * will be ignored during compilation.
     */
    ignore: function(value) {
        var attr = this.attr;
        if (value === true) {
            attr.ignore = true;
        }
    }
};

exports.isSupportedProperty = function(name) {
    return AttrHandlers.prototype.hasOwnProperty(name);
};

exports.loadAttribute = function loadAttribute(attrName, attrProps, path) {
    var attr = new Taglib.Attribute(attrName);

    if (attrProps == null) {
        attrProps = {
            type: 'string'
        };
    } else if (typeof attrProps === 'string') {
        attrProps = {
            type: attrProps
        };
    }

    var attrHandlers = new AttrHandlers(attr);
    propertyHandlers(attrProps, attrHandlers, path);
    return attr;
};
});
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/loader", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

exports.taglibLoader = require('./loader-taglib');
exports.tagLoader = require('./loader-tag');
exports.attributeLoader = require('./loader-attribute');
});
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-loader/index", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var loader = require('./loader');
var Taglib = require('../Taglib');

var cache = {};

function load(path) {
    // Only load a taglib once by caching the loaded taglibs using the file
    // system path as the key
    if (cache[path]) {
        return cache[path];
    }

    var taglib = cache[path] = new Taglib(path);

    loader.taglibLoader.loadTaglib(path, taglib);

    cache[path] = taglib;

    return taglib;
}

exports.load = load;

});
$rmod.def("/marko@2.7.28/compiler/taglibs/TaglibLookup", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var ok = require('assert'/*'assert'*/).ok;
var createError = require('/$/marko/$/raptor-util'/*'raptor-util'*/).createError;
var Taglib = require('./Taglib');
var extend = require('/$/marko/$/raptor-util/extend'/*'raptor-util/extend'*/);

function transformerComparator(a, b) {
    a = a.priority;
    b = b.priority;

    if (a == null) {
        a = Number.MAX_VALUE;
    }

    if (b == null) {
        b = Number.MAX_VALUE;
    }

    return a - b;
}

function merge(target, source) {
    for (var k in source) {
        if (source.hasOwnProperty(k)) {
            if (target[k] && typeof target[k] === 'object' &&
                source[k] && typeof source[k] === 'object') {

                if (source.__noMerge) {
                    // Don't merge objects that are explicitly marked as "do not merge"
                    continue;
                }

                if (Array.isArray(target[k]) || Array.isArray(source[k])) {

                    var targetArray = target[k];
                    var sourceArray = source[k];


                    if (!Array.isArray(targetArray)) {
                        targetArray = [targetArray];
                    }

                    if (!Array.isArray(sourceArray)) {
                        sourceArray = [sourceArray];
                    }

                    target[k] = [].concat(targetArray).concat(sourceArray);
                } else {
                    var Ctor = target[k].constructor;
                    var newTarget = new Ctor();
                    merge(newTarget, target[k]);
                    merge(newTarget, source[k]);
                    target[k] = newTarget;
                }

            } else {
                target[k] = source[k];
            }
        }
    }

    return target;
}

/**
 * A taglib lookup merges in multiple taglibs so there is a single and fast lookup
 * for custom tags and custom attributes.
 */
function TaglibLookup() {
    this.merged = {};
    this.taglibsById = {};
    this._inputFiles = null;
}

TaglibLookup.prototype = {

    hasTaglib: function(taglib) {
        return this.taglibsById.hasOwnProperty(taglib.id);
    },

    _mergeNestedTags: function(taglib) {
        var Tag = Taglib.Tag;
        // Loop over all of the nested tags and register a new custom tag
        // with the fully qualified name

        var merged = this.merged;

        function handleNestedTag(nestedTag, parentTagName) {
            var fullyQualifiedName = parentTagName + '.' + nestedTag.name;

            // Create a clone of the nested tag since we need to add some new
            // properties
            var clonedNestedTag = new Tag();
            extend(clonedNestedTag ,nestedTag);
            // Record the fully qualified name of the parent tag that this
            // custom tag is associated with.
            clonedNestedTag.parentTagName = parentTagName;
            clonedNestedTag.name = fullyQualifiedName;
            merged.tags[fullyQualifiedName] = clonedNestedTag;
        }

        taglib.forEachTag(function(tag) {
            tag.forEachNestedTag(function(nestedTag) {
                handleNestedTag(nestedTag, tag.name);
            });
        });
    },

    addTaglib: function (taglib) {
        ok(taglib, '"taglib" is required');
        ok(taglib.id, '"taglib.id" expected');

        if (this.taglibsById.hasOwnProperty(taglib.id)) {
            return;
        }

        this.taglibsById[taglib.id] = taglib;

        merge(this.merged, {
            tags: taglib.tags,
            textTransformers: taglib.textTransformers,
            attributes: taglib.attributes,
            patternAttributes: taglib.patternAttributes
        });

        this._mergeNestedTags(taglib);
    },

    getTag: function (element) {
        if (typeof element === 'string') {
            element = {
                localName: element
            };
        }
        var tags = this.merged.tags;
        if (!tags) {
            return;
        }

        var tagKey = element.namespace ? element.namespace + ':' + element.localName : element.localName;
        return tags[tagKey];
    },

    getAttribute: function (element, attr) {

        if (typeof element === 'string') {
            element = {
                localName: element
            };
        }

        if (typeof attr === 'string') {
            attr = {
                localName: attr
            };
        }

        var tags = this.merged.tags;
        if (!tags) {
            return;
        }

        var tagKey = element.namespace ? element.namespace + ':' + element.localName : element.localName;
        var attrKey = attr.namespace ? attr.namespace + ':' + attr.localName : attr.localName;

        function findAttributeForTag(tag, attributes, attrKey) {
            // try by exact match first
            var attribute = attributes[attrKey];
            if (attribute === undefined && attrKey !== '*') {
                if (tag.patternAttributes) {
                    // try searching by pattern
                    for (var i = 0, len = tag.patternAttributes.length; i < len; i++) {
                        var patternAttribute = tag.patternAttributes[i];
                        if (patternAttribute.pattern.test(attrKey)) {
                            attribute = patternAttribute;
                            break;
                        }
                    }
                }
            }

            return attribute;
        }

        var globalAttributes = this.merged.attributes;

        function tryAttribute(tagKey, attrKey) {
            var tag = tags[tagKey];
            if (!tag) {
                return undefined;
            }

            return findAttributeForTag(tag, tag.attributes, attrKey) ||
                   findAttributeForTag(tag, globalAttributes, attrKey);
        }

        var attrDef = tryAttribute(tagKey, attrKey) || // Look for an exact match at the tag level
            tryAttribute('*', attrKey) || // If not there, see if there is a exact match on the attribute name for attributes that apply to all tags
            tryAttribute(tagKey, '*'); // Otherwise, see if there is a splat attribute for the tag

        return attrDef;
    },

    forEachNodeTransformer: function (node, callback, thisObj) {
        /*
         * Based on the type of node we have to choose how to transform it
         */
        if (node.isElementNode()) {
            this.forEachTagTransformer(node, callback, thisObj);
        } else if (node.isTextNode()) {
            this.forEachTextTransformer(callback, thisObj);
        }
    },
    forEachTagTransformer: function (element, callback, thisObj) {
        if (typeof element === 'string') {
            element = {
                localName: element
            };
        }

        var tagKey = element.namespace ? element.namespace + ':' + element.localName : element.localName;
        /*
         * If the node is an element node then we need to find all matching
         * transformers based on the URI and the local name of the element.
         */

        var transformers = [];

        function addTransformer(transformer) {
            if (!transformer || !transformer.getFunc) {
                throw createError(new Error('Invalid transformer'));
            }

            transformers.push(transformer);
        }

        /*
         * Handle all of the transformers for all possible matching transformers.
         *
         * Start with the least specific and end with the most specific.
         */

        if (this.merged.tags) {
            if (this.merged.tags[tagKey]) {
                this.merged.tags[tagKey].forEachTransformer(addTransformer);
            }

            if (this.merged.tags['*']) {
                this.merged.tags['*'].forEachTransformer(addTransformer);
            }
        }

        transformers.sort(transformerComparator);

        transformers.forEach(callback, thisObj);
    },
    forEachTextTransformer: function (callback, thisObj) {
        if (this.merged.textTransformers) {
            this.merged.textTransformers.sort(transformerComparator);
            this.merged.textTransformers.forEach(callback, thisObj);
        }
    },
    getInputFiles: function() {
        if (!this._inputFiles) {
            var inputFilesSet = {};

            for (var taglibId in this.taglibsById) {
                if (this.taglibsById.hasOwnProperty(taglibId)) {

                    var taglibInputFiles = this.taglibsById[taglibId].getInputFiles();
                    var len = taglibInputFiles.length;
                    if (len) {
                        for (var i=0; i<len; i++) {
                            inputFilesSet[taglibInputFiles[i]] = true;
                        }
                    }
                }
            }

            this._inputFiles = Object.keys(inputFilesSet);
        }

        return this._inputFiles;
    },

    toString: function() {
        return 'lookup: ' + this.getInputFiles().join(', ');
    }
};
module.exports = TaglibLookup;
});
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-lookup", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/



var taglibLoader = require('./taglib-loader');
var taglibFinder = require('./taglib-finder');
var TaglibLookup = require('./TaglibLookup');

exports.registeredTaglibs = [];

var lookupCache = {};

function handleImports(lookup, taglib) {
	if (taglib.imports) {
		for (var i=0; i<taglib.imports.length; i++) {
			var importedTaglib = taglib.imports[i];

			if (!lookup.hasTaglib(importedTaglib)) {
				lookup.addTaglib(importedTaglib);
			}
		}
	}
}

function buildLookup(dirname) {
	var taglibs = taglibFinder.find(dirname, exports.registeredTaglibs);

	var lookupCacheKey = taglibs
		.map(function(taglib) {
			return taglib.id;
		})
		.join(',');

	var lookup = lookupCache[lookupCacheKey];
	if (lookup === undefined) {
		lookup = new TaglibLookup();
		// The taglibs "closer" to the template will be earlier in the list
		// and the taglibs "farther" from the template will be later. We
		// want closer taglibs to take precedence (especially when de-duping)
		// so we loop from beginning to end. We used to loop from the end
		// to the beginning, but that appears to have been a mistake.
        for (var i=0; i<taglibs.length; i++) {
			var taglib = taglibs[i];
			lookup.addTaglib(taglib);
			handleImports(lookup, taglib);
		}

		lookupCache[lookupCacheKey] = lookup;
	}

	return lookup;
}

function registerTaglib(taglib) {
    if (typeof taglib === 'string') {
        taglib = taglibLoader.load(taglib);
    }

    exports.registeredTaglibs.push(taglib);
}

exports.excludeDir = taglibFinder.excludeDir;
exports.registerTaglib = registerTaglib;
exports.buildLookup = buildLookup;
exports.clearCaches = function() {
	lookupCache = {};
};
});
$rmod.remap("/marko@2.7.28/compiler/taglibs/taglib-finder", "taglib-finder-browser");
$rmod.def("/marko@2.7.28/compiler/taglibs/taglib-finder-browser", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

function find(dirname, registeredTaglibs) {
    return registeredTaglibs || [];
}

function excludeDir(dirname) {
    // no-op
}

exports.find = find;
exports.excludeDir = excludeDir;
});
$rmod.def("/marko@2.7.28/compiler/taglibs/index", function(require, exports, module, __filename, __dirname) { /*
* Copyright 2011 eBay Software Foundation
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

exports.Taglib = require('./Taglib');
exports.loader = require('./taglib-loader');
exports.lookup = require('./taglib-lookup');
exports.buildLookup = exports.lookup.buildLookup;
exports.registerTaglib = exports.lookup.registerTaglib;
exports.excludeDir = exports.lookup.excludeDir;
exports.clearCaches = function() {
    exports.lookup.clearCaches();
    require('./taglib-finder').clearCaches();
};
});
$rmod.def("/marko@2.7.28/taglibs/core/marko-taglib", {
    "taglib-id": "marko-core",
    "tags": {
        "c-template": {
            "attributes": {
                "name": {
                    "allow-expressions": false,
                    "type": "string"
                },
                "params": {
                    "allow-expressions": false,
                    "type": "string"
                }
            },
            "node-class": "./TemplateNode"
        },
        "*": {
            "attributes": {
                "c-space": {
                    "type": "custom",
                    "allow-expressions": false,
                    "ignore": true
                },
                "c-whitespace": {
                    "type": "custom",
                    "allow-expressions": false,
                    "ignore": true
                },
                "for": {
                    "type": "custom",
                    "allow-expressions": false,
                    "ignore": true
                },
                "for-each": {
                    "allow-expressions": false,
                    "type": "string",
                    "ignore": true
                },
                "if": {
                    "type": "expression",
                    "ignore": true
                },
                "unless": {
                    "type": "expression",
                    "ignore": true
                },
                "else": {
                    "type": "empty",
                    "ignore": true
                },
                "else-if": {
                    "type": "expression",
                    "ignore": true
                },
                "attrs": {
                    "type": "expression",
                    "ignore": true
                },
                "when": {
                    "type": "expression",
                    "ignore": true
                },
                "with": {
                    "type": "custom",
                    "ignore": true
                },
                "c-parse-body-text": {
                    "type": "boolean",
                    "allow-expressions": false,
                    "ignore": true
                },
                "c-trim-body-indent": {
                    "type": "boolean",
                    "allow-expressions": false,
                    "ignore": true
                },
                "c-input": {
                    "type": "expression",
                    "ignore": true
                }
            },
            "transformer": {
                "path": "./core-tag-transformer",
                "priority": 0
            }
        },
        "for": {
            "node-class": "./ForNode",
            "attributes": {
                "each": {
                    "required": false,
                    "allow-expressions": false,
                    "type": "string"
                },
                "separator": {
                    "type": "string"
                },
                "status-var": {
                    "type": "identifier",
                    "allow-expressions": false
                },
                "for-loop": {
                    "type": "boolean",
                    "allow-expressions": false
                },
                "iterator": {
                    "type": "expression"
                }
            }
        },
        "c-write": {
            "node-class": "./WriteNode",
            "attributes": {
                "value": {
                    "required": true,
                    "type": "expression"
                },
                "escape-xml": {
                    "type": "boolean",
                    "allow-expressions": false
                }
            }
        },
        "if": {
            "node-class": "./IfNode",
            "attributes": {
                "test": {
                    "type": "expression"
                }
            }
        },
        "unless": {
            "node-class": "./UnlessNode",
            "attributes": {
                "test": {
                    "type": "expression"
                }
            }
        },
        "else": {
            "node-class": "./ElseNode",
            "transformer": {
                "path": "./else-tag-transformer",
                "properties": {
                    "type": "else"
                }
            }
        },
        "else-if": {
            "attributes": {
                "test": {
                    "type": "expression"
                }
            },
            "node-class": "./ElseIfNode",
            "transformer": {
                "path": "./else-tag-transformer",
                "properties": {
                    "type": "else-if"
                }
            }
        },
        "invoke": {
            "node-class": "./InvokeNode",
            "attributes": {
                "function": {
                    "type": "custom",
                    "allow-expressions": false,
                    "required": true
                },
                "*": {
                    "type": "string",
                    "allow-expressions": true
                }
            }
        },
        "def": {
            "node-class": "./DefNode",
            "attributes": {
                "function": {
                    "type": "custom",
                    "allow-expressions": false
                },
                "body-param": {
                    "type": "custom",
                    "allow-expressions": false
                }
            }
        },
        "with": {
            "node-class": "./WithNode",
            "attributes": {
                "vars": {
                    "type": "custom",
                    "allow-expressions": false
                }
            }
        },
        "include": {
            "node-class": "./IncludeNode",
            "attributes": {
                "template": {
                    "type": "template"
                },
                "template-data": {
                    "type": "expression"
                },
                "resource": {
                    "type": "string"
                },
                "static": {
                    "type": "boolean",
                    "allow-expressions": false
                },
                "*": {
                    "type": "string"
                }
            }
        },
        "attr": {
            "attributes": {
                "name": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "namespace": {
                    "type": "string"
                },
                "prefix": {
                    "type": "string"
                }
            }
        },
        "var": {
            "node-class": "./VarNode",
            "attributes": {
                "name": {
                    "type": "custom",
                    "allow-expressions": false
                },
                "value": {
                    "type": "expression"
                },
                "static": {
                    "type": "boolean"
                },
                "string-value": {
                    "type": "string"
                },
                "boolean-value": {
                    "type": "boolean"
                },
                "number-value": {
                    "type": "number"
                }
            }
        },
        "require": {
            "node-class": "./RequireNode",
            "attributes": {
                "module": {
                    "type": "string"
                },
                "var": {
                    "type": "custom",
                    "allow-expressions": false
                }
            }
        },
        "assign": {
            "node-class": "./AssignNode",
            "attributes": {
                "var": {
                    "type": "custom",
                    "allow-expressions": false
                },
                "value": {
                    "type": "expression"
                }
            }
        }
    },
    "text-transformer": {
        "path": "./core-text-transformer"
    }
}
);
$rmod.def("/marko@2.7.28/taglibs/html/marko-taglib", {
    "taglib-id": "marko-html",
    "tags": {
        "html": {
            "attributes": {
                "html-doctype": {
                    "type": "custom",
                    "preserve-name": true
                },
                "*": {
                    "type": "string",
                    "ignore": true
                }
            }
        },
        "html-doctype": {
            "attributes": {
                "value": {
                    "type": "custom"
                }
            },
            "node-class": "./DocTypeNode"
        },
        "html-element": {
            "@tag-name": "string",
            "@*": {
                "ignore": true
            },
            "node-class": "./HtmlElementNode"
        },
        "*": {
            "transformer": "./html-tag-transformer"
        },
        "html-comment": {
            "renderer": "./CommentTag",
            "escape-xml-body": false
        }
    }
});
$rmod.def("/marko@2.7.28/taglibs/caching/marko-taglib", {
    "taglib-id": "marko-caching",
    "tags": {
        "cached-fragment": {
            "renderer": "./cached-fragment-tag",
            "attributes": {
                "cache-key": {
                    "type": "string"
                },
                "cache-name": {
                    "type": "string"
                }
            }
        }
    }
});
$rmod.def("/marko-layout@2.0.2/marko-taglib", {
    "tags": {
        "layout-use": {
            "renderer": "./use-tag",
            "attributes": {
                "template": {
                    "type": "template"
                },
                "*": {
                    "remove-dashes": true,
                    "type": "string"
                }
            },
            "body-function": "getContent(__layoutHelper)"
        },
        "layout-put": {
            "renderer": "./put-tag",
            "attributes": {
                "into": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "import-var": {
                "layout": "__layoutHelper"
            }
        },
        "layout-placeholder": {
            "renderer": "./placeholder-tag",
            "attributes": {
                "name": {
                    "type": "string"
                }
            },
            "import-var": {
                "content": "data.layoutContent"
            }
        }
    }
});
$rmod.def("/marko-async@2.0.8/marko-taglib", {
    "tags": {
        "async-fragment": {
            "renderer": "./async-fragment-tag",
            "attributes": {
                "data-provider": {
                    "type": "expression"
                },
                "arg": {
                    "type": "expression",
                    "preserve-name": true
                },
                "arg-*": {
                    "pattern": true,
                    "type": "string",
                    "preserve-name": true
                },
                "var": {
                    "type": "identifier"
                },
                "timeout": {
                    "type": "integer"
                },
                "method": {
                    "type": "string"
                },
                "timeout-message": {
                    "type": "string"
                },
                "error-message": {
                    "type": "string"
                },
                "name": {
                    "type": "string",
                    "description": "Name of async fragment (for debugging purposes only)"
                },
                "client-reorder": {
                    "type": "boolean",
                    "description": "Use JavaScript on client to move async fragment into the proper place."
                },
                "scope": {
                    "type": "expression"
                },
                "show-after": {
                    "type": "string"
                },
                "placeholder": {
                    "type": "string"
                }
            },
            "vars": [
                {
                    "name-from-attribute": "var"
                }
            ],
            "transformer": "./async-fragment-tag-transformer"
        },
        "async-fragments": {
            "renderer": "./async-fragments-tag",
            "attributes": {
            }
        },
        "async-fragment-placeholder": {
            "node-class": "./AsyncFragmentPlaceholderNode",
            "transformer": "./async-fragment-placeholder-tag-transformer"
        },
        "async-fragment-timeout": {
          "node-class": "./AsyncFragmentTimeoutNode",
          "transformer": "./async-fragment-timeout-tag-transformer"
        },
        "async-fragment-error": {
          "node-class": "./AsyncFragmentErrorNode",
          "transformer": "./async-fragment-error-tag-transformer"
        }
    }
}
);
$rmod.def("/marko@2.7.28/compiler/marko-compiler", function(require, exports, module, __filename, __dirname) { var process=require("process"); /*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var extend = require('/$/marko/$/raptor-util/extend'/*'raptor-util/extend'*/);
var req = require; // Fool code inspectors used by client-side bundles
var nodePath = require('path-browserify'/*'path'*/);

var defaultOptions = {
        /**
         * Set of tag names that should automatically have whitespace preserved.
         * Alternatively, if value is `true` then whitespace will be preserved
         * for all tags.
         */
        preserveWhitespace: {
            'pre': true,
            'textarea': true,
            'script': true
        },
        /**
         * Set of tag names that should be allowed to be rendered as a self-closing
         * XML tag. A self-closing tag will only be rendered if the tag has no nested
         * content. HTML doesn't allow self-closing tags so you should likely
         * never use this.
         */
        allowSelfClosing: {},
        /**
         * Set of tag names that should be rendered with a start tag only.
         */
        startTagOnly: {
            'img': true,
            'br': true,
            'input': true,
            'meta': true,
            'link': true,
            'hr': true
        },
        /**
         * If true, then the compiler will check the disk to see if a previously compiled
         * template is the same age or newer than the source template. If so, the previously
         * compiled template will be loaded. Otherwise, the template will be recompiled
         * and saved to disk.
         *
         * If false, the template will always be recompiled. If `writeToDisk` is false
         * then this option will be ignored.
         */
        checkUpToDate: true,
        /**
         * If true (the default) then compiled templates will be written to disk. If false,
         * compiled templates will not be written to disk (i.e., no `.marko.js` file will
         * be generated)
         */
        writeToDisk: true
    };

if (process.env.MARKO_CLEAN === '' || process.env.MARKO_CLEAN === 'true') {
    defaultOptions.checkUpToDate = false;
}

extend(exports, {
    createCompiler: function (path, options) {
        var TemplateCompiler = require('./TemplateCompiler');
        //Get a reference to the TemplateCompiler class
        if (options) {
            /*
             * If options were provided then they should override the default options.
             * NOTE: Only top-level properties are overridden
             */
            options = extend(extend({}, defaultOptions), options);
        } else {
            options = defaultOptions;    //Otherwise, no options were provided so use the default options
        }

        return new TemplateCompiler(path, options);
    },

    compile: function (src, path, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        return this.createCompiler(path, options).compile(src, callback);
    },

    compileFile: function(path, options, callback) {
        var fs = req('fs');

        if (typeof options === 'function') {
            callback = options;
            options = null;
        }

        var compiler = this.createCompiler(path, options);

        fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
            if (err) {
                return callback(err);
            }

            try {
                callback(null, compiler.compile(src));
            } catch(e) {
                callback(e);
            }
        });
    },

    getLastModified: function(path, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = null;
        }

        var compiler = this.createCompiler(path, options);
        callback(null, compiler.getLastModified());
    },

    Node: require('./Node'),
    ElementNode: require('./ElementNode'),
    TextNode: require('./TextNode'),
    expressionParser: require('./expression-parser'),
    Expression: require('./Expression'),
    TypeConverter: require('./TypeConverter'),
    EscapeXmlContext: require('./EscapeXmlContext'),
    defaultOptions: defaultOptions,
    clearCaches: function() {
        exports.taglibs.clearCaches();
    }
});

exports.TemplateCompiler = require('./TemplateCompiler');
exports.taglibs = require('./taglibs');
exports.taglibs.excludeDir(nodePath.join(__dirname, '../'));

exports.taglibs.registerTaglib(require.resolve('../taglibs/core/marko-taglib.json'));
exports.taglibs.registerTaglib(require.resolve('../taglibs/html/marko-taglib.json'));
exports.taglibs.registerTaglib(require.resolve('../taglibs/caching/marko-taglib.json'));
exports.taglibs.registerTaglib(require.resolve('/$/marko/$/marko-layout/marko-taglib'/*'marko-layout/marko-taglib.json'*/));
exports.taglibs.registerTaglib(require.resolve('/$/marko/$/marko-async/marko-taglib'/*'marko-async/marko-taglib.json'*/));

});
$rmod.def("/src/components/app-try-marko/test-taglib/marko-taglib", {
    "tags": {
        "test-button": {
            "renderer": "./button-renderer.js",
            "attributes": {
                "label": "string",
                "color": "string",
                "disabled": "boolean"
            }
        },
        "test-tabs": {
            "renderer": "./tabs-renderer",
            "body-function": "getTabs(__tabsHelper)"
        },
        "test-tab": {
            "renderer": "./tab-renderer",
            "import-var": {
                "tabs": "__tabsHelper"
            },
            "attributes": {
                "title": "string"
            }
        }
    }
});