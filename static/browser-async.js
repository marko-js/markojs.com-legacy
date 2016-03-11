$rmod.main("/marko@3.0.0-rc.2/compiler", "index");
$rmod.def("/marko@3.0.0-rc.2/compiler/Compiler", function(require, exports, module, __filename, __dirname) { 'use strict';
var ok = require('assert').ok;
var CodeGenerator = require('./CodeGenerator');
var CompileContext = require('./CompileContext');
var createError = require('raptor-util/createError');

const FLAG_TRANSFORMER_APPLIED = 'transformerApply';

function transformNode(node, context) {
    try {
        context.taglibLookup.forEachNodeTransformer(node, function (transformer) {
            if (!node.isTransformerApplied(transformer)) {
                //Check to make sure a transformer of a certain type is only applied once to a node
                node.setTransformerApplied(transformer);
                //Mark the node as have been transformed by the current transformer
                context.setFlag(FLAG_TRANSFORMER_APPLIED);
                //Set the flag to indicate that a node was transformed
                // node.compiler = this;
                var transformerFunc = transformer.getFunc();
                transformerFunc.call(transformer, node, context);    //Have the transformer process the node (NOTE: Just because a node is being processed by the transformer doesn't mean that it has to modify the parse tree)
            }
        });
    } catch (e) {
        throw createError(new Error('Unable to compile template at path "' + context.filename + '". Error: ' + e.message), e);
    }
}

function transformTreeHelper(node, context) {
    transformNode(node, context);

    /*
     * Now process the child nodes by looping over the child nodes
     * and transforming the subtree recursively
     *
     * NOTE: The length of the childNodes array might change as the tree is being performed.
     *       The checks to prevent transformers from being applied multiple times makes
     *       sure that this is not a problem.
     */
    node.forEachChild(function (childNode) {
        if (childNode.isDetached()) {
            return;    //The child node might have been removed from the tree
        }
        transformTreeHelper(childNode, context);
    });
}

function transformTree(rootNode, context) {
    /*
     * The tree is continuously transformed until we go through an entire pass where
     * there were no new nodes that needed to be transformed. This loop makes sure that
     * nodes added by transformers are also transformed.
     */
    do {
        context.clearFlag(FLAG_TRANSFORMER_APPLIED);
        //Reset the flag to indicate that no transforms were yet applied to any of the nodes for this pass
        transformTreeHelper(rootNode, context);    //Run the transforms on the tree
    } while (context.isFlagSet(FLAG_TRANSFORMER_APPLIED));

    return rootNode;
}

class Compiler {
    constructor(options) {
        ok(options, '"options" is required');

        this.builder = options.builder;
        this.parser = options.parser;

        ok(this.builder, '"options.builder" is required');
        ok(this.parser, '"options.parser" is required');
    }

    compile(src, filename, options) {
        ok(typeof src === 'string', '"src" argument should be a string');
        ok(filename, '"filename" argument is required');
        ok(typeof filename === 'string', '"filename" argument should be a string');

        var context = new CompileContext(src, filename, this.builder);

        if (options) {
            if (options.preserveWhitespace) {
                context.setPreserveWhitespace(true);
            }
        }

        // STAGE 1: Parse the template to produce the initial AST
        var ast = this.parser.parse(src, context);
        context.root = ast;
        // console.log('ROOT', JSON.stringify(ast, null, 2));

        // STAGE 2: Transform the initial AST to produce the final AST
        var transformedAST = transformTree(ast, context);
        // console.log('transformedAST', JSON.stringify(ast, null, 2));

        // STAGE 3: Generate the code using the final AST
        var codeGenerator = new CodeGenerator(context);
        codeGenerator.generateCode(transformedAST);

        // If there were any errors then compilation failed.
        if (context.hasErrors()) {
            var errors = context.getErrors();

            var message = 'An error occurred while trying to compile template at path "' + filename + '". Error(s) in template:\n';
            for (var i = 0, len = errors.length; i < len; i++) {
                let error = errors[i];
                message += (i + 1) + ') ' + error.toString() + '\n';
            }
            var error = new Error(message);
            error.errors = errors;
            throw error;
        }

        // Return the generated code as the compiled output:
        var compiledSrc = codeGenerator.getCode();
        return compiledSrc;
    }
}

module.exports = Compiler;
});
$rmod.def("/marko@3.0.0-rc.2/compiler/Walker", function(require, exports, module, __filename, __dirname) { 'use strict';
var isArray = Array.isArray;
var Container = require('./ast/Container');

function noop() {}

class Walker {
    constructor(options) {
        this._enter = options.enter || noop;
        this._exit = options.exit || noop;
        this._stopped = false;
        this._reset();
        this._stack = [];
    }

    _reset() {
        this._skipped = false;
        this._replaced = undefined;
        this._removed = false;
    }

    skip() {
        this._skipped = true;
    }

    stop() {
        this._stopped = true;
    }

    replace(newNode) {
        this._replaced = newNode;
    }

    remove() {
        this._removed = true;
    }

    _walkArray(array) {
        var hasRemoval = false;

        array.forEach((node, i) => {
            var transformed = this.walk(node);
            if (transformed == null) {
                array[i] = null;
                hasRemoval = true;
            } else if (transformed !== node) {
                array[i] = transformed;
            }
        });

        if (hasRemoval) {
            for (let i=array.length-1; i>=0; i--) {
                if (array[i] == null) {
                    array.splice(i, 1);
                }
            }
        }

        return array;
    }

    _walkContainer(nodes) {
        nodes.forEach((node) => {
            var transformed = this.walk(node);
            if (!transformed) {
                node.container.removeChild(node);
            } else if (transformed !== node) {
                node.container.replaceChild(transformed, node);
            }
        });
    }

    walk(node) {
        if (!node || this._stopped || typeof node === 'string') {
            return node;
        }

        this._reset();

        var parent = this._stack.length ? this._stack[this._stack.length - 1] : undefined;

        this._stack.push(node);

        var replaced = this._enter(node, parent);
        if (replaced === undefined) {
            replaced = this._replaced;
        }

        if (this._removed) {
            replaced = null;
        }

        if (replaced !== undefined) {
            this._stack.pop();
            return replaced;
        }

        if (this._skipped || this._stopped) {
            this._stack.pop();
            return node;
        }

        if (isArray(node)) {
            let array = node;
            let newArray = this._walkArray(array);
            this._stack.pop();
            return newArray;
        } else if (node instanceof Container) {
            let container = node;
            this._walkContainer(container);
            this._stack.pop();
            return container;
        } else {
            if (node.walk) {
                node.walk(this);
            }
        }

        if (this._stopped) {
            this._stack.pop();
            return node;
        }

        this._reset();

        replaced = this._exit(node, parent);
        if (replaced === undefined) {
            replaced = this._replaced;
        }

        if (this._removed) {
            replaced = null;
        }

        if (replaced !== undefined) {
            this._stack.pop();
            return replaced;
        }

        this._stack.pop();
        return node;
    }
}

module.exports = Walker;


});
$rmod.def("/marko@3.0.0-rc.2/compiler/Parser", function(require, exports, module, __filename, __dirname) { 'use strict';
var ok = require('assert').ok;
var AttributePlaceholder = require('./ast/AttributePlaceholder');

var COMPILER_ATTRIBUTE_HANDLERS = {
    'preserve-whitespace': function(attr, context) {
        context.setPreserveWhitespace(true);
    },
    'preserve-comments': function(attr, context) {
        context.setPreserveComments(true);
    }
};

var ieConditionalCommentRegExp = /^\[if [^]*?<!\[endif\]$/;

function isIEConditionalComment(comment) {
    return ieConditionalCommentRegExp.test(comment);
}

function replacePlaceholderEscapeFuncs(node, context) {
    var walker = context.createWalker({
        exit: function(node, parent) {
            if (node.type === 'FunctionCall' &&
                node.callee.type === 'Identifier') {

                if (node.callee.name === '$noEscapeXml') {
                    return new AttributePlaceholder({escape: false, value: node.args[0]});
                } else if (node.callee.name === '$escapeXml') {
                    return new AttributePlaceholder({escape: true, value: node.args[0]});
                }
            }
        }
    });

    return walker.walk(node);
}

function mergeShorthandClassNames(el, shorthandClassNames, context) {
    var builder = context.builder;
    let classNames = shorthandClassNames.map((className) => {
        return builder.parseExpression(className.value);
    });

    var classAttr = el.getAttributeValue('class');
    if (classAttr) {
        classNames.push(classAttr);
    }

    let prevClassName;

    var finalClassNames = [];

    for (var i=0; i<classNames.length; i++) {
        let className = classNames[i];
        if (prevClassName && className.type === 'Literal' && prevClassName.type === 'Literal') {
            prevClassName.value += ' ' + className.value;
        } else {
            finalClassNames.push(className);
        }
        prevClassName = className;
    }

    if (finalClassNames.length === 1) {
        el.setAttributeValue('class', finalClassNames[0]);
    } else {
        var classListVar = context.addStaticVar('__classList', '__helpers.cl');
        el.setAttributeValue('class', builder.functionCall(classListVar, finalClassNames));
    }
}

class Parser {
    constructor(parserImpl) {
        ok(parserImpl, '"parserImpl" is required');

        this.parserImpl = parserImpl;

        this.prevTextNode = null;
        this.stack = null;

        // The context gets provided when parse is called
        // but we store it as part of the object so that the handler
        // methods have access
        this.context = null;
    }

    _reset() {
        this.prevTextNode = null;
        this.stack = [];
    }

    parse(src, context) {
        ok(typeof src === 'string', '"src" should be a string');
        ok(context, '"context" is required');

        this._reset();

        this.context = context;

        var builder = context.builder;
        var rootNode = builder.templateRoot();

        this.stack.push({
            node: rootNode
        });

        this.parserImpl.parse(src, this);

        return rootNode;
    }

    handleCharacters(text) {
        var builder = this.context.builder;

        if (this.prevTextNode && this.prevTextNode.isLiteral()) {
            this.prevTextNode.appendText(text);
        } else {
            var escape = false;
            this.prevTextNode = builder.text(builder.literal(text), escape);
            this.parentNode.appendChild(this.prevTextNode);
        }
    }

    handleStartElement(el) {
        var context = this.context;
        var builder = context.builder;

        var tagName = el.tagName;
        var tagNameExpression = el.tagNameExpression;
        var attributes = el.attributes;
        var argument = el.argument; // e.g. For <for(color in colors)>, argument will be "color in colors"

        if (argument) {
            argument = argument.value;
        }

        if (tagNameExpression) {
            tagName = builder.parseExpression(tagNameExpression);
        } else if (tagName === 'marko-compiler-options') {
            attributes.forEach(function (attr) {
                let attrName = attr.name;
                let handler = COMPILER_ATTRIBUTE_HANDLERS[attrName];

                if (!handler) {
                    context.addError({
                        code: 'ERR_INVALID_COMPILER_OPTION',
                        message: 'Invalid Marko compiler option of "' + attrName + '". Allowed: ' + Object.keys(COMPILER_ATTRIBUTE_HANDLERS).join(', '),
                        pos: el.pos,
                        node: el
                    });
                    return;
                }

                handler(attr, context);
            });

            return;
        }

        this.prevTextNode = null;

        var attributeParseErrors = [];

        var elDef = {
            tagName: tagName,
            argument: argument,
            openTagOnly: el.openTagOnly === true,
            selfClosed: el.selfClosed === true,
            pos: el.pos,
            attributes: attributes.map((attr) => {
                var attrValue;
                if (attr.hasOwnProperty('literalValue')) {
                    attrValue = builder.literal(attr.literalValue);
                } else if (attr.value == null) {
                    attrValue = undefined;
                } else {
                    let parsedExpression;
                    let valid = true;
                    try {
                        parsedExpression = builder.parseExpression(attr.value);
                    } catch(e) {
                        valid = false;
                        attributeParseErrors.push('Invalid JavaScript expression for attribute "' + attr.name + '": ' + e);
                    }

                    if (valid) {
                        attrValue = replacePlaceholderEscapeFuncs(parsedExpression, context);
                    } else {
                        attrValue = null;
                    }

                }

                var attrDef = {
                    name: attr.name,
                    value: attrValue,
                    rawValue: attr.value
                };

                if (attr.argument) {
                    // TODO Do something with the argument pos
                    attrDef.argument = attr.argument.value;
                }

                return attrDef;
            })
        };

        var node = this.context.createNodeForEl(elDef);

        if (attributeParseErrors.length) {

            attributeParseErrors.forEach((e) => {
                context.addError(node, e);
            });
        }

        if (el.shorthandClassNames) {
            mergeShorthandClassNames(node, el.shorthandClassNames, context);
        }

        if (el.shorthandId) {
            if (node.hasAttribute('id')) {
                context.addError(node, 'A shorthand ID cannot be used in conjunction with the "id" attribute');
            } else {
                node.setAttributeValue('id', builder.parseExpression(el.shorthandId.value));
            }
        }

        this.parentNode.appendChild(node);

        this.stack.push({
            node: node,
            tag: null
        });
    }

    handleEndElement(elementName) {
        if (elementName === 'marko-compiler-options') {
            return;
        }

        this.prevTextNode = null;

        this.stack.pop();
    }

    handleComment(comment) {
        this.prevTextNode = null;

        var builder = this.context.builder;

        var preserveComment = this.context.isPreserveComments() ||
            isIEConditionalComment(comment);

        if (preserveComment) {
            var commentNode = builder.htmlComment(builder.literal(comment));
            this.parentNode.appendChild(commentNode);
        }
    }

    handleBodyTextPlaceholder(expression, escape) {
        this.prevTextNode = null;
        var builder = this.context.builder;
        var parsedExpression = builder.parseExpression(expression);
        var preserveWhitespace = true;

        var text = builder.text(parsedExpression, escape, preserveWhitespace);
        this.parentNode.appendChild(text);
    }

    handleScriptlet(code) {
        this.prevTextNode = null;
        var builder = this.context.builder;
        var scriptlet = builder.scriptlet(code);
        this.parentNode.appendChild(scriptlet);
    }

    handleError(event) {
        this.context.addError({
            message: event.message,
            code: event.code,
            pos: event.pos,
            endPos: event.endPos
        });
    }

    get parentNode() {
        var last = this.stack[this.stack.length-1];
        return last.node;
    }

    getParserStateForTag(el) {
        var attributes = el.attributes;

        for (var i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            var attrName = attr.name;
            if (attrName === 'marko-body') {
                var parseMode;

                if (attr.literalValue) {
                    parseMode = attr.literalValue;
                }

                if (parseMode === 'static-text' ||
                    parseMode === 'parsed-text' ||
                    parseMode === 'html') {
                    return parseMode;
                } else {
                    this.context.addError({
                        message: 'Value for "marko-body" should be one of the following: "static-text", "parsed-text", "html"',
                        code: 'ERR_INVALID_ATTR'
                    });
                    return;
                }
            } else if (attrName === 'marko-init') {
                return 'static-text';
            }
        }

        var tagName = el.tagName;
        var tagDef = this.context.getTagDef(tagName);

        if (tagDef) {
            var body = tagDef.body;
            if (body) {
                return body; // 'parsed-text' | 'static-text' | 'html'
            }
        }

        return null; // Default parse state
    }

    isOpenTagOnly(tagName) {
        var tagDef = this.context.getTagDef(tagName);
        return tagDef && tagDef.openTagOnly;
    }
}

module.exports = Parser;
});
$rmod.def("/marko@3.0.0-rc.2/compiler/HtmlJsParser", function(require, exports, module, __filename, __dirname) { 'use strict';
var htmljs = require('htmljs-parser');

class HtmlJsParser {
    parse(src, handlers) {
        var listeners = {
            onText(event) {
                handlers.handleCharacters(event.value);
            },

            onPlaceholder(event) {
                if (event.withinBody) {
                    if (!event.withinString) {
                        handlers.handleBodyTextPlaceholder(event.value, event.escape);
                    }
                } else if (event.withinOpenTag) {
                    // Don't escape placeholder for dynamic attributes. For example: <div ${data.myAttrs}></div>
                } else {
                    // placeholder within attribute
                    if (event.escape) {
                        event.value = '$escapeXml(' + event.value + ')';
                    } else {
                        event.value = '$noEscapeXml(' + event.value + ')';
                    }
                }
                // placeholder within content

            },

            onCDATA(event) {
                handlers.handleCharacters(event.value);
            },

            onOpenTag(event, parser) {
                event.selfClosed = false; // Don't allow self-closed tags
                handlers.handleStartElement(event);

                var newParserState = handlers.getParserStateForTag(event);
                if (newParserState) {
                    if (newParserState === 'parsed-text') {
                        parser.enterParsedTextContentState();
                    } else if (newParserState === 'static-text') {
                        parser.enterStaticTextContentState();
                    }
                }
            },

            onCloseTag(event) {
                var tagName = event.tagName;
                handlers.handleEndElement(tagName);
            },

            onDocumentType(event) {

                // Document type: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd
                // NOTE: The value will be all of the text between "<!" and ">""
                handlers.handleCharacters('<!' + event.value + '>');
            },

            onDeclaration(event) {
                // Declaration (e.g. <?xml version="1.0" encoding="UTF-8" ?>)
                handlers.handleCharacters('<?' + event.value + '?>');
            },

            onComment(event) {
                // Text within XML comment
                handlers.handleComment(event.value);
            },

            onScriptlet(event) {
                // <% (code) %>
                handlers.handleScriptlet(event.value);
            },

            onError(event) {
                handlers.handleError(event);
            }
        };

        var parser = this.parser = htmljs.createParser(listeners, {
            isOpenTagOnly: function(tagName) {
                return handlers.isOpenTagOnly(tagName);
            }
        });
        parser.parse(src);
    }
}

module.exports = HtmlJsParser;
});
$rmod.def("/marko@3.0.0-rc.2/compiler/Builder", function(require, exports, module, __filename, __dirname) { 'use strict';
var isArray = Array.isArray;
var ok = require('assert').ok;

var Node = require('./ast/Node');
var Program = require('./ast/Program');
var TemplateRoot = require('./ast/TemplateRoot');
var FunctionDeclaration = require('./ast/FunctionDeclaration');
var FunctionCall = require('./ast/FunctionCall');
var Literal = require('./ast/Literal');
var Identifier = require('./ast/Identifier');
var If = require('./ast/If');
var ElseIf = require('./ast/ElseIf');
var Else = require('./ast/Else');
var Assignment = require('./ast/Assignment');
var BinaryExpression = require('./ast/BinaryExpression');
var LogicalExpression = require('./ast/LogicalExpression');
var Vars = require('./ast/Vars');
var Return = require('./ast/Return');
var HtmlElement = require('./ast/HtmlElement');
var Html = require('./ast/Html');
var Text = require('./ast/Text');
var ForEach = require('./ast/ForEach');
var ForEachProp = require('./ast/ForEachProp');
var ForRange = require('./ast/ForRange');
var Slot = require('./ast/Slot');
var HtmlComment = require('./ast/HtmlComment');
var SelfInvokingFunction = require('./ast/SelfInvokingFunction');
var ForStatement = require('./ast/ForStatement');
var BinaryExpression = require('./ast/BinaryExpression');
var UpdateExpression = require('./ast/UpdateExpression');
var UnaryExpression = require('./ast/UnaryExpression');
var MemberExpression = require('./ast/MemberExpression');
var Code = require('./ast/Code');
var InvokeMacro = require('./ast/InvokeMacro');
var Macro = require('./ast/Macro');
var ConditionalExpression = require('./ast/ConditionalExpression');
var NewExpression = require('./ast/NewExpression');
var ObjectExpression = require('./ast/ObjectExpression');
var ArrayExpression = require('./ast/ArrayExpression');
var Property = require('./ast/Property');
var VariableDeclarator = require('./ast/VariableDeclarator');
var ThisExpression = require('./ast/ThisExpression');
var Expression = require('./ast/Expression');
var Scriptlet = require('./ast/Scriptlet');
var ContainerNode = require('./ast/ContainerNode');
var WhileStatement = require('./ast/WhileStatement');

var parseExpression = require('./util/parseExpression');
var parseStatement = require('./util/parseStatement');
var parseJavaScriptArgs = require('./util/parseJavaScriptArgs');
var isValidJavaScriptIdentifier = require('./util/isValidJavaScriptIdentifier');

var DEFAULT_BUILDER;

function makeNode(arg) {
    if (typeof arg === 'string') {
        return parseExpression(arg, DEFAULT_BUILDER);
    } else if (arg instanceof Node) {
        return arg;
    } else if (arg == null) {
        return undefined;
    } else {
        throw new Error('Argument should be a string or Node or null. Actual: ' + arg);
    }
}

var literalNull = new Literal({value: null});
var literalUndefined = new Literal({value: null});
var literalTrue = new Literal({value: true});
var literalFalse = new Literal({value: true});
var identifierOut = new Identifier({name: 'out'});

class Builder {
    arrayExpression(elements) {
        if (elements) {
            if (!isArray(elements)) {
                elements = [elements];
            }

            for (var i=0; i<elements.length; i++) {
                elements[i] = makeNode(elements[i]);
            }
        } else {
            elements = [];
        }

        return new ArrayExpression({elements});
    }

    assignment(left, right, operator) {
        if (operator == null) {
            operator = '=';
        }
        left = makeNode(left);
        right = makeNode(right);
        return new Assignment({left, right, operator});
    }

    binaryExpression(left, operator, right) {
        left = makeNode(left);
        right = makeNode(right);
        return new BinaryExpression({left, operator, right});
    }

    code(value) {
        return new Code({value});
    }

    computedMemberExpression(object, property) {
        object = makeNode(object);
        property = makeNode(property);
        let computed = true;

        return new MemberExpression({object, property, computed});
    }

    concat(args) {
        var prev;
        let operator = '+';

        for (var i=1; i<arguments.length; i++) {
            var left;
            var right = makeNode(arguments[i]);
            if (i === 1) {
                left = makeNode(arguments[i-1]);
            } else {
                left = prev;
            }

            prev = new BinaryExpression({left, operator, right});
        }

        return prev;
    }

    conditionalExpression(test, consequent, alternate) {
        return new ConditionalExpression({test, consequent, alternate});
    }

    containerNode(type, generateCode) {
        if (typeof type === 'function') {
            generateCode = arguments[0];
            type = 'ContainerNode';
        }

        var node = new ContainerNode(type);
        if (generateCode) {
            node.setCodeGenerator(generateCode);
        }
        return node;
    }

    elseStatement(body) {
        return new Else({body});
    }

    elseIfStatement(test, body, elseStatement) {
        test = makeNode(test);

        return new ElseIf({test, body, else: elseStatement});
    }

    expression(value) {
        return new Expression({value});
    }

    forEach(varName, inExpression, body) {
        if (arguments.length === 1) {
            var def = arguments[0];
            return new ForEach(def);
        } else {
            varName = makeNode(varName);
            inExpression = makeNode(inExpression);
            return new ForEach({varName, in: inExpression, body});
        }
    }

    forEachProp(nameVarName, valueVarName, inExpression, body) {
        if (arguments.length === 1) {
            var def = arguments[0];
            return new ForEachProp(def);
        } else {
            nameVarName = makeNode(nameVarName);
            valueVarName = makeNode(valueVarName);
            inExpression = makeNode(inExpression);
            return new ForEachProp({nameVarName, valueVarName, in: inExpression, body});
        }
    }

    forRange(varName, from, to, step, body) {
        if (arguments.length === 1) {
            var def = arguments[0];
            return new ForRange(def);
        } else {
            varName = makeNode(varName);
            from = makeNode(from);
            to = makeNode(to);
            step = makeNode(step);
            body = makeNode(body);

            return new ForRange({varName, from, to, step, body});
        }
    }

    forStatement(init, test, update, body) {
        if (arguments.length === 1) {
            var def = arguments[0];
            return new ForStatement(def);
        } else {
            init = makeNode(init);
            test = makeNode(test);
            update = makeNode(update);
            return new ForStatement({init, test, update, body});
        }
    }

    functionCall(callee, args) {
        callee = makeNode(callee);

        if (args) {
            if (!isArray(args)) {
                throw new Error('"args" should be an array');
            }

            for (var i=0; i<args.length; i++) {
                args[i] = makeNode(args[i]);
            }
        } else {
            args = [];
        }

        return new FunctionCall({callee, args});
    }

    functionDeclaration(name, params, body) {
        return new FunctionDeclaration({name, params, body});
    }

    html(argument) {
        argument = makeNode(argument);

        return new Html({argument});
    }

    htmlComment(comment) {
        return new HtmlComment({comment});
    }

    htmlElement(tagName, attributes, body, argument, openTagOnly, selfClosed) {
        if (typeof tagName === 'object' && !(tagName instanceof Node)) {
            let def = arguments[0];
            return new HtmlElement(def);
        } else {
            return new HtmlElement({tagName, attributes, body, argument, openTagOnly, selfClosed});
        }
    }

    identifier(name) {
        ok(typeof name === 'string', '"name" should be a string');

        if (!isValidJavaScriptIdentifier(name)) {
            var error = new Error('Invalid JavaScript identifier: ' + name);
            error.code = 'INVALID_IDENTIFIER';
            throw error;
        }
        return new Identifier({name});
    }

    identifierOut(name) {
        return identifierOut;
    }

    ifStatement(test, body, elseStatement) {
        return new If({test, body, else: elseStatement});
    }

    invokeMacro(name, args, body) {
        return new InvokeMacro({name, args, body});
    }

    invokeMacroFromEl(el) {
        return new InvokeMacro({el});
    }

    literal(value) {
        return new Literal({value});
    }

    literalFalse() {
        return literalFalse;
    }

    literalNull() {
        return literalNull;
    }

    literalTrue() {
        return literalTrue;
    }

    literalUndefined() {
        return literalUndefined;
    }

    logicalExpression(left, operator, right) {
        left = makeNode(left);
        right = makeNode(right);
        return new LogicalExpression({left, operator, right});
    }

    macro(name, params, body) {
        return new Macro({name, params, body});
    }

    memberExpression(object, property, computed) {
        object = makeNode(object);
        property = makeNode(property);

        return new MemberExpression({object, property, computed});
    }

    negate(argument) {
        argument = makeNode(argument);

        var operator = '!';
        var prefix = true;
        return new UnaryExpression({argument, operator, prefix});
    }

    newExpression(callee, args) {
        callee = makeNode(callee);

        if (args) {
            if (!isArray(args)) {
                args = [args];
            }

            for (var i=0; i<args.length; i++) {
                args[i] = makeNode(args[i]);
            }
        } else {
            args = [];
        }

        return new NewExpression({callee, args});
    }

    node(type, generateCode) {
        if (typeof type === 'function') {
            generateCode = arguments[0];
            type = 'Node';
        }

        var node = new Node(type);
        if (generateCode) {
            node.setCodeGenerator(generateCode);
        }
        return node;
    }

    objectExpression(properties) {
        if (properties) {
            if (!isArray(properties)) {
                properties = [properties];
            }

            for (var i=0; i<properties.length; i++) {
                let prop = properties[i];
                prop.value = makeNode(prop.value);
            }
        } else {
            properties = [];
        }

        return new ObjectExpression({properties});
    }

    parseExpression(str, options) {
        ok(typeof str === 'string', '"str" should be a string expression');
        var parsed = parseExpression(str, DEFAULT_BUILDER);
        return parsed;
    }

    parseJavaScriptArgs(args) {
        ok(typeof args === 'string', '"args" should be a string');
        return parseJavaScriptArgs(args, DEFAULT_BUILDER);
    }

    parseStatement(str, options) {
        ok(typeof str === 'string', '"str" should be a string expression');
        var parsed = parseStatement(str, DEFAULT_BUILDER);
        return parsed;
    }

    program(body) {
        return new Program({body});
    }

    property(key, value) {
        key = makeNode(key);
        value = makeNode(value);

        return new Property({key, value});
    }

    renderBodyFunction(body) {
        let name = 'renderBody';
        let params = [new Identifier({name: 'out'})];
        return new FunctionDeclaration({name, params, body});
    }

    require(path) {
        path = makeNode(path);

        let callee = 'require';
        let args = [ path ];
        return new FunctionCall({callee, args});
    }

    requireResolve(path) {
        path = makeNode(path);

        let callee = new MemberExpression({
            object: new Identifier({name: 'require'}),
            property: new Identifier({name: 'resolve'})
        });

        let args = [ path ];
        return new FunctionCall({callee, args});
    }

    returnStatement(argument) {
        argument = makeNode(argument);

        return new Return({argument});
    }

    scriptlet(code) {
        return new Scriptlet({code});
    }

    selfInvokingFunction(params, args, body) {
        if (arguments.length === 1) {
            body = arguments[0];
            params = null;
            args = null;
        }

        return new SelfInvokingFunction({params, args, body});
    }

    slot(onDone) {
        return new Slot({onDone});
    }

    strictEquality(left, right) {
        left = makeNode(left);
        right = makeNode(right);

        var operator = '===';
        return new BinaryExpression({left, right, operator});
    }

    templateRoot(body) {
        return new TemplateRoot({body});
    }

    text(argument, escape, preserveWhitespace) {
        if (typeof argument === 'object' && !(argument instanceof Node)) {
            var def = arguments[0];
            return new Text(def);
        }
        argument = makeNode(argument);

        return new Text({argument, escape, preserveWhitespace});
    }

    thisExpression() {
        return new ThisExpression();
    }

    unaryExpression(argument, operator, prefix) {
        argument = makeNode(argument);

        return new UnaryExpression({argument, operator, prefix});
    }

    updateExpression(argument, operator, prefix) {
        argument = makeNode(argument);
        return new UpdateExpression({argument, operator, prefix});
    }

    variableDeclarator(id, init) {
        if (typeof id === 'string') {
            id = new Identifier({name: id});
        }
        if (init) {
            init = makeNode(init);
        }

        return new VariableDeclarator({id, init});
    }

    var(id, init, kind) {
        if (!kind) {
            kind = 'var';
        }

        id = makeNode(id);
        init = makeNode(init);

        var declarations = [
            new VariableDeclarator({id, init})
        ];

        return new Vars({declarations, kind});
    }

    vars(declarations, kind) {
        if (declarations) {
            if (Array.isArray(declarations)) {
                for (let i=0; i<declarations.length; i++) {
                    var declaration = declarations[i];
                    if (!declaration) {
                        throw new Error('Invalid variable declaration');
                    }
                    if (typeof declaration === 'string') {
                        declarations[i] = new VariableDeclarator({
                            id: new Identifier({name: declaration})
                        });
                    } else if (declaration instanceof Identifier) {
                        declarations[i] = new VariableDeclarator({
                            id: declaration
                        });
                    } else if (typeof declaration === 'object') {
                        if (!(declaration instanceof VariableDeclarator)) {
                            let id = declaration.id;
                            let init = declaration.init;

                            if (typeof id === 'string') {
                                id = new Identifier({name: id});
                            }

                            if (!id) {
                                throw new Error('Invalid variable declaration');
                            }

                            if (init) {
                                init = makeNode(init);
                            }


                            declarations[i] = new VariableDeclarator({id, init});
                        }
                    }
                }
            } else if (typeof declarations === 'object') {
                // Convert the object into an array of variables
                declarations = Object.keys(declarations).map((key) => {
                    let id = new Identifier({name: key});
                    let init = makeNode(declarations[key]);
                    return new VariableDeclarator({ id, init });
                });
            }
        }


        return new Vars({declarations, kind});
    }

    whileStatement(test, body) {
        return new WhileStatement({test, body});
    }
}

DEFAULT_BUILDER = new Builder();

Builder.DEFAULT_BUILDER = DEFAULT_BUILDER;

module.exports = Builder;
});
$rmod.main("/marko@3.0.0-rc.2/compiler/taglib-lookup", "index");
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-lookup/TaglibLookup", function(require, exports, module, __filename, __dirname) { /*
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

var ok = require('assert').ok;
var Taglib = require('../taglib-loader/Taglib');
var extend = require('raptor-util/extend');
var Text = require('../ast/Text');

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
class TaglibLookup {
    constructor() {
        this.merged = {};
        this.taglibsById = {};
        this._inputFiles = null;
    }

    hasTaglib(taglib) {
        return this.taglibsById.hasOwnProperty(taglib.id);
    }

    _mergeNestedTags(taglib) {
        var Tag = Taglib.Tag;
        // Loop over all of the nested tags and register a new custom tag
        // with the fully qualified name

        var merged = this.merged;

        function handleNestedTags(tag, parentTagName) {
            tag.forEachNestedTag(function(nestedTag) {
                var fullyQualifiedName = parentTagName + ':' + nestedTag.name;
                // Create a clone of the nested tag since we need to add some new
                // properties
                var clonedNestedTag = new Tag();
                extend(clonedNestedTag, nestedTag);
                // Record the fully qualified name of the parent tag that this
                // custom tag is associated with.
                clonedNestedTag.parentTagName = parentTagName;
                clonedNestedTag.name = fullyQualifiedName;
                merged.tags[fullyQualifiedName] = clonedNestedTag;
                handleNestedTags(clonedNestedTag, fullyQualifiedName);
            });
        }

        taglib.forEachTag(function(tag) {
            handleNestedTags(tag, tag.name);
        });
    }

    addTaglib(taglib) {
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
    }

    getTag(element) {
        if (typeof element === 'string') {
            element = {
                tagName: element
            };
        }
        var tags = this.merged.tags;
        if (!tags) {
            return;
        }

        var tagName = element.tagName;
        return tags[tagName];
    }

    getAttribute(element, attr) {

        if (typeof element === 'string') {
            element = {
                tagName: element
            };
        }

        if (typeof attr === 'string') {
            attr = {
                name: attr
            };
        }

        var tags = this.merged.tags;
        if (!tags) {
            return;
        }

        var tagName = element.tagName;
        var attrName = attr.name;

        function findAttributeForTag(tag, attributes, attrName) {
            // try by exact match first
            var attribute = attributes[attrName];
            if (attribute === undefined && attrName !== '*') {
                if (tag.patternAttributes) {
                    // try searching by pattern
                    for (var i = 0, len = tag.patternAttributes.length; i < len; i++) {
                        var patternAttribute = tag.patternAttributes[i];
                        if (patternAttribute.pattern.test(attrName)) {
                            attribute = patternAttribute;
                            break;
                        }
                    }
                }
            }

            return attribute;
        }

        var globalAttributes = this.merged.attributes;

        function tryAttribute(tagName, attrName) {
            var tag = tags[tagName];
            if (!tag) {
                return undefined;
            }

            return findAttributeForTag(tag, tag.attributes, attrName) ||
                   findAttributeForTag(tag, globalAttributes, attrName);
        }

        var attrDef = tryAttribute(tagName, attrName) || // Look for an exact match at the tag level
            tryAttribute('*', attrName) || // If not there, see if there is a exact match on the attribute name for attributes that apply to all tags
            tryAttribute(tagName, '*'); // Otherwise, see if there is a splat attribute for the tag

        return attrDef;
    }

    forEachNodeTransformer(node, callback, thisObj) {
        /*
         * Based on the type of node we have to choose how to transform it
         */
        if (node.tagName) {
            this.forEachTagTransformer(node, callback, thisObj);
        } else if (node instanceof Text) {
            this.forEachTextTransformer(callback, thisObj);
        }
    }

    forEachTagTransformer(element, callback, thisObj) {
        if (typeof element === 'string') {
            element = {
                tagName: element
            };
        }

        var tagName = element.tagName;
        /*
         * If the node is an element node then we need to find all matching
         * transformers based on the URI and the local name of the element.
         */

        var transformers = [];

        function addTransformer(transformer) {
            if (!transformer || !transformer.getFunc) {
                throw new Error('Invalid transformer');
            }

            transformers.push(transformer);
        }

        /*
         * Handle all of the transformers for all possible matching transformers.
         *
         * Start with the least specific and end with the most specific.
         */

        if (this.merged.tags) {
            if (this.merged.tags[tagName]) {
                this.merged.tags[tagName].forEachTransformer(addTransformer);
            }

            if (this.merged.tags['*']) {
                this.merged.tags['*'].forEachTransformer(addTransformer);
            }
        }

        transformers.sort(transformerComparator);

        transformers.forEach(callback, thisObj);
    }

    forEachTextTransformer(callback, thisObj) {
        if (this.merged.textTransformers) {
            this.merged.textTransformers.sort(transformerComparator);
            this.merged.textTransformers.forEach(callback, thisObj);
        }
    }

    getInputFiles() {
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
    }

    toString() {
        return 'lookup: ' + this.getInputFiles().join(', ');
    }
}

module.exports = TaglibLookup;
});
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-lookup/index", function(require, exports, module, __filename, __dirname) { /*
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
exports.registerTaglib = registerTaglib;
exports.buildLookup = buildLookup;
exports.clearCache = clearCache;

var taglibLoader = require('../taglib-loader');
var taglibFinder = require('../taglib-finder');
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

function clearCache() {
	lookupCache = {};
}
});
$rmod.main("/marko@3.0.0-rc.2/compiler/taglib-loader", "index");
$rmod.main("/assert@1.3.0", "assert");
$rmod.dep("", "assert", "1.3.0");
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
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/handleAttributes", function(require, exports, module, __filename, __dirname) { /*
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
var forEachEntry = require('/$/marko/$/raptor-util/forEachEntry'/*'raptor-util/forEachEntry'*/);
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
$rmod.remap("/marko@3.0.0-rc.2/compiler/taglib-loader/scanTagsDir", "scanTagsDir-browser");
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/scanTagsDir-browser", function(require, exports, module, __filename, __dirname) { /*
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
$rmod.remap("/marko@3.0.0-rc.2/compiler/util/resolve", "resolve-browser");
$rmod.def("/marko@3.0.0-rc.2/compiler/util/resolve-browser", function(require, exports, module, __filename, __dirname) { /*
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
$rmod.remap("/marko@3.0.0-rc.2/compiler/taglib-loader/taglib-reader", "taglib-reader-browser");
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/taglib-reader-browser", function(require, exports, module, __filename, __dirname) { /*
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
$rmod.main("/try-require@1.2.1", "index");
$rmod.dep("/$/marko", "try-require", "1.2.1");
$rmod.def("/try-require@1.2.1/index", function(require, exports, module, __filename, __dirname) { 'use strict';

var lastError = null;

var tryRequire = function tryRequire( id, req ) {
    var path;
    var _req = req || require;

    try {
        path = _req.resolve( id );

        lastError = null;
    } catch ( e ) {
        lastError = e;
    }

    if ( path ) {
        return _req( path );
    }

    return undefined;
};

var resolve = function tryRequireResolve( id, req ) {
    var path;
    var _req = req || require;

    try {
        path = _req.resolve( id );

        lastError = null;
    } catch ( e ) {
        lastError = e;
    }

    return path;
};

tryRequire.resolve = resolve;
tryRequire.lastError = function() {
    return lastError;
};

module.exports = tryRequire;

});
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/loader-taglib", function(require, exports, module, __filename, __dirname) { /*
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
var nodePath = require('path-browserify'/*'path'*/);
var handleAttributes = require('./handleAttributes');
var scanTagsDir = require('./scanTagsDir');
var resolve = require('../util/resolve'); // NOTE: different implementation for browser
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var Taglib = require('./Taglib');
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
                                    importPath = resolveFrom(dirname, dependencyName + '/marko.json');
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
$rmod.dep("/$/marko", "raptor-polyfill", "1.0.2");
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
$rmod.def("/raptor-util@1.0.10/forEach", function(require, exports, module, __filename, __dirname) { /**
 * Utility method to iterate over elements in an Array that
 * internally uses the "forEach" property of the array.
 *
 * <p>
 * If the input Array is null/undefined then nothing is done.
 *
 * <p>
 * If the input object does not have a "forEach" method then
 * it is converted to a single element Array and iterated over.
 *
 *
 * @param  {Array|Object} a An Array or an Object
 * @param  {Function} fun The callback function for each property
 * @param  {Object} thisp The "this" object to use for the callback function
 * @return {void}
 */
module.exports = function(a, func, thisp) {
    if (a != null) {
        (a.forEach ? a : [a]).forEach(func, thisp);
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
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/loader-tag", function(require, exports, module, __filename, __dirname) { /*
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
var Taglib = require('./Taglib');
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var isObjectEmpty = require('/$/marko/$/raptor-util/isObjectEmpty'/*'raptor-util/isObjectEmpty'*/);
var nodePath = require('path-browserify'/*'path'*/);
var resolve = require('../util/resolve'); // NOTE: different implementation for browser
var ok = require('assert'/*'assert'*/).ok;
var bodyFunctionRegExp = /^([A-Za-z_$][A-Za-z0-9_]*)(?:\(([^)]*)\))?$/;
var safeVarName = /^[A-Za-z_$][A-Za-z0-9_]*$/;
var handleAttributes = require('./handleAttributes');
var Taglib = require('./Taglib');
var propertyHandlers = require('/$/marko/$/property-handlers'/*'property-handlers'*/);
var forEachEntry = require('/$/marko/$/raptor-util'/*'raptor-util'*/).forEachEntry;
var loader = require('./loader');
var markoCompiler = require('../');

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
     * A custom tag can be mapped to module that is is used
     * to generate compile-time code for the custom tag. A
     * node type is created based on the methods and methods
     * exported by the code codegen module.
     */
    codeGenerator: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;

        var path = resolve(value, dirname);
        tag.codeGeneratorModulePath = path;
        this.taglib.addInputFile(path);
    },

    /**
     * A custom tag can be mapped to a compile-time Node that gets
     * added to the parsed Abstract Syntax Tree (AST). The Node can
     * then generate custom JS code at compile time. The value
     * should be a path to a JS module that gets resolved using the
     * equivalent of require.resolve(path)
     */
    nodeFactory: function(value) {
        var tag = this.tag;
        var dirname = this.dirname;

        var path = resolve(value, dirname);
        tag.nodeFactoryPath = path;
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

            importedVar.expression = markoCompiler.builder.parseExpression(expression);
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
    },

    /**
     * Sends the body content type. This is used to control how the body
     * content is parsed.
     */
    body: function(value) {
        if (value === 'static-text' || value === 'parsed-text' || value === 'html') {
            this.tag.body = value;
        } else {
            throw new Error('Invalid value for "body". Allowed: "static-text", "parsed-text" or "html"');
        }
    },

    openTagOnly: function(value) {
        this.tag.openTagOnly = value;
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
            '*': {
                type: 'string',
                targetProperty: null
            }
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
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/loader-attribute", function(require, exports, module, __filename, __dirname) { /*
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
var Taglib = require('./Taglib');

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
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/loader", function(require, exports, module, __filename, __dirname) { /*
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
$rmod.main("/marko@3.0.0-rc.2/compiler/taglib-loader/Taglib", "index");
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/Taglib/Taglib", function(require, exports, module, __filename, __dirname) { /*
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

var forEachEntry = require('raptor-util/forEachEntry');
var ok = require('assert').ok;
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



class Taglib {
    constructor(path) {
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

    addInputFile(path) {
        this.inputFilesLookup[path] = true;
    }

    getInputFiles() {
        return Object.keys(this.inputFilesLookup);
    }

    addAttribute (attribute) {
        if (attribute.pattern) {
            this.patternAttributes.push(attribute);
        } else if (attribute.name) {
            this.attributes[attribute.name] = attribute;
        } else {
            throw new Error('Invalid attribute: ' + require('util').inspect(attribute));
        }
    }
    getAttribute (name) {
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
    }
    addTag (tag) {
        ok(arguments.length === 1, 'Invalid args');
        if (!tag.name) {
            throw new Error('"tag.name" is required: ' + JSON.stringify(tag));
        }
        this.tags[tag.name] = tag;
        tag.taglibId = this.id || this.path;
    }
    addTextTransformer (transformer) {
        this.textTransformers.push(transformer);
    }
    forEachTag (callback, thisObj) {
        forEachEntry(this.tags, function (key, tag) {
            callback.call(thisObj, tag);
        }, this);
    }

    addImport(path) {
        var importedTaglib = taglibLoader.load(path);
        handleImport(this, importedTaglib);
    }

    toJSON() {
        return {
            path: this.path,
            tags: this.tags,
            textTransformers: this.textTransformers,
            attributes: this.attributes,
            patternAttributes: this.patternAttributes,
            imports: this.imports
        };
    }
}

Taglib.Tag = require('./Tag');
Taglib.Attribute = require('./Attribute');
Taglib.Property = require('./Property');
Taglib.NestedVariable = require('./NestedVariable');
Taglib.ImportedVariable = require('./ImportedVariable');
Taglib.Transformer = require('./Transformer');

module.exports = Taglib;

taglibLoader = require('../');
});
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/Taglib/index", function(require, exports, module, __filename, __dirname) { module.exports = require('./Taglib');
});
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-loader/index", function(require, exports, module, __filename, __dirname) { /*
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
var Taglib = require('./Taglib');

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

exports.clearCache = function() {
    cache = {};
};

exports.load = load;

});
$rmod.main("/marko@3.0.0-rc.2/compiler/taglib-finder", "index");
$rmod.remap("/marko@3.0.0-rc.2/compiler/taglib-finder/index", "index-browser");
$rmod.def("/marko@3.0.0-rc.2/compiler/taglib-finder/index-browser", function(require, exports, module, __filename, __dirname) { /*
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
$rmod.def("/marko@3.0.0-rc.2/taglibs/core/marko", {
    "<assign>": {
        "code-generator": "./assign-tag"
    },
    "<else>": {
        "node-factory": "./else-tag"
    },
    "<else-if>": {
        "node-factory": "./else-if-tag"
    },
    "<for>": {
        "code-generator": "./for-tag"
    },
    "<if>": {
        "node-factory": "./if-tag"
    },
    "<include>": {
        "code-generator": "./include-tag"
    },
    "<include-text>": {
        "code-generator": "./include-text-tag"
    },
    "<invoke>": {
        "code-generator": "./invoke-tag"
    },
    "<macro>": {
        "code-generator": "./macro-tag"
    },
    "<macro-body>": {
        "code-generator": "./macro-body-tag"
    },
    "<pre>": {
        "preserve-whitespace": true
    },
    "<script>": {
        "preserve-whitespace": true,
        "@marko-init": "boolean",
        "@*": {
            "ignore": true
        }
    },
    "<style>": {
        "preserve-whitespace": true
    },
    "<textarea>": {
        "preserve-whitespace": true
    },
    "<unless>": {
        "node-factory": "./unless-tag"
    },
    "<var>": {
        "node-factory": "./var-tag"
    },
    "<while>": {
        "code-generator": "./while-tag"
    },
    "<*>": {
        "@if": "argument",
        "@else-if": "argument",
        "@else": "argument",
        "@for": "argument",
        "@while": "argument",
        "transformer": {
            "path": "./core-transformer",
            "priority": 0
        }
    }
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/layout/marko", {
    "<layout-use>": {
        "@__template": "template",
        "@__data": "template",
        "@*": {
            "remove-dashes": true,
            "type": "string"
        },
        "renderer": "./use-tag",
        "body-function": "getContent(__layoutHelper)",
        "transformer": "./use-tag-transformer.js"
    },
    "<layout-put>": {
        "@into": "string",
        "@value": "string",
        "renderer": "./put-tag",
        "import-var": {
            "layout": "__layoutHelper"
        }
    },
    "<layout-placeholder>": {
        "@name": "string",
        "renderer": "./placeholder-tag",
        "import-var": {
            "content": "data.layoutContent"
        }
    }
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/html/marko", {
    "taglib-id": "marko-html",
    "<html-comment>": {
        "renderer": "./html-comment-tag.js"
    }
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/async-fragment-nested-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';

module.exports = function transform(el, context) {
    var parentNode = el.parentNode;

    if (parentNode.tagName !== 'async-fragment') {
        context.addError(el, 'The <' + el.tagName + '> should be nested within an <async-fragment> tag.');
        return;
    }

    var targetProp;

    if (el.tagName === 'async-fragment-error') {
        targetProp = 'renderError';
    } else if (el.tagName === 'async-fragment-timeout') {
        targetProp = 'renderTimeout';
    } else if (el.tagName === 'async-fragment-placeholder') {
        targetProp = 'renderPlaceholder';
    }

    var builder = context.builder;

    parentNode.setAttributeValue(targetProp, builder.renderBodyFunction(el.body));
    el.detach();
};

});
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/async-fragment-tag-transformer", function(require, exports, module, __filename, __dirname) { 'use strict';

var isObjectEmpty = require('raptor-util/isObjectEmpty');

module.exports = function transform(el, context) {
    var varName = el.getAttributeValue('var');
    if (varName) {
        if (varName.type !== 'Literal' || typeof varName.value !== 'string') {
            context.addError(el, 'The "var" attribute value should be a string');
            return;
        }

        varName = varName.value;

        if (!context.util.isValidJavaScriptIdentifier(varName)) {
            context.addError(el, 'The "var" attribute value should be a valid JavaScript identifier');
            return;
        }
    } else {
        context.addError(el, 'The "var" attribute is required');
        return;
    }

    var attrs = el.getAttributes().concat([]);
    var arg = {};
    var builder = context.builder;

    attrs.forEach((attr) => {
        var attrName = attr.name;
        if (attrName.startsWith('arg-')) {
            let argName = attrName.substring('arg-'.length);
            arg[argName] = attr.value;
            el.removeAttribute(attrName);
        }
    });

    var dataProviderAttr = el.getAttribute('data-provider');
    if (!dataProviderAttr) {
        context.addError(el, 'The "data-provider" attribute is required');
        return;
    }

    if (dataProviderAttr.value == null) {
        context.addError(el, 'A value is required for the "data-provider" attribute');
        return;
    }

    if (dataProviderAttr.value.type == 'Literal') {
        context.addError(el, 'The "data-provider" attribute value should not be a literal ' + (typeof dataProviderAttr.value.value));
        return;
    }

    var name = el.getAttributeValue('name');
    if (name == null) {
        el.setAttributeValue('_name', builder.literal(dataProviderAttr.rawValue));
    }

    if (el.hasAttribute('arg')) {
        if (isObjectEmpty(arg)) {
            arg = el.getAttributeValue('arg');
        } else {
            let mergeVar = context.addStaticVar('__merge', '__helpers.m');
            arg = builder.functionCall(mergeVar, [
                builder.literal(arg), // Input props from the attributes take precedence
                el.getAttributeValue('arg')
            ]);
        }
    } else {
        if (isObjectEmpty(arg)) {
            arg = null;
        } else {
            arg = builder.literal(arg);
        }
    }

    if (arg) {
        el.setAttributeValue('arg', arg);
    }

    var timeoutMessage = el.getAttributeValue('timeout-message');
    if (timeoutMessage) {
        el.removeAttribute('timeout-message');
        el.setAttributeValue('renderTimeout', builder.renderBodyFunction([
            builder.text(timeoutMessage)
        ]));
    }

    var errorMessage = el.getAttributeValue('error-message');
    if (errorMessage) {
        el.removeAttribute('error-message');
        el.setAttributeValue('renderError', builder.renderBodyFunction([
            builder.text(errorMessage)
        ]));
    }

    var placeholder = el.getAttributeValue('placeholder');
    if (placeholder) {
        el.removeAttribute('placeholder');
        el.setAttributeValue('renderPlaceholder', builder.renderBodyFunction([
            builder.text(placeholder)
        ]));
    }
};

});
$rmod.dep("/$/marko", "raptor-logging", "1.0.8");
$rmod.dep("/$/marko/$/raptor-logging", "raptor-stacktraces", "1.0.1");
$rmod.dep("/$/marko", "raptor-async", "1.1.2");
$rmod.remap("/marko@3.0.0-rc.2/taglibs/async/client-reorder", "client-reorder-browser");
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/client-reorder-browser", function(require, exports, module, __filename, __dirname) { exports.isSupported = false;
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/async-fragment-tag", function(require, exports, module, __filename, __dirname) { 'use strict';

var logger = require('/$/marko/$/raptor-logging'/*'raptor-logging'*/).logger(module);
var asyncWriter = require('/$/marko/$/async-writer'/*'async-writer'*/);
var AsyncValue = require('/$/marko/$/raptor-async/AsyncValue'/*'raptor-async/AsyncValue'*/);
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

    function renderBody(err, data, renderTimeout) {
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
            if (input.renderError) {
                console.error('Async fragment (' + name + ') failed. Error:', (err.stack || err));
                input.renderError(targetOut);
            } else {
                targetOut.error(err);
            }
        } else if (renderTimeout) {
            renderTimeout(asyncOut);
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
        var renderTimeout = input.renderTimeout;

        if (timeout == null) {
            timeout = 10000;
        } else if (timeout <= 0) {
            timeout = null;
        }

        if (timeout != null) {
            timeoutId = setTimeout(function() {
                var message = 'Async fragment (' + name + ') timed out after ' + timeout + 'ms';

                if (renderTimeout) {
                    logger.error(message);
                    renderBody(null, null, renderTimeout);
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
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/async-fragments-tag", function(require, exports, module, __filename, __dirname) { var clientReorder = require('./client-reorder');

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
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/client-reorder-runtime", function(require, exports, module, __filename, __dirname) { function $af(id, after, doc, sourceEl, targetEl, docFragment, childNodes, i, len, af) {
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
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/client-reorder-runtime.min", function(require, exports, module, __filename, __dirname) { function $af(d,a,e,l,g,h,k,b,f,c){c=$af;if(a&&!c[a])(c[a+="$"]||(c[a]=[])).push(d);else{e=document;l=e.getElementById("af"+d);g=e.getElementById("afph"+d);h=e.createDocumentFragment();k=l.childNodes;b=0;for(f=k.length;b<f;b++)h.appendChild(k.item(0));g.parentNode.replaceChild(h,g);c[d]=1;if(a=c[d+"$"])for(b=0,f=a.length;b<f;b++)c(a[b])}};
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/async/marko", {
    "<async-fragment>": {
        "renderer": "./async-fragment-tag",
        "@data-provider": "expression",
        "@arg": {
            "type": "expression",
            "preserve-name": true
        },
        "@arg-*": {
            "pattern": true,
            "type": "string",
            "preserve-name": true
        },
        "@var": "identifier",

        "@method": "string",

        "@timeout": "integer",

        "@timeout-message": "string",
        "@error-message": "string",
        "@placeholder": "string",

        "@renderTimeout": "function",
        "@renderError": "function",
        "@renderPlaceholder": "function",

        "@name": {
            "type": "string",
            "description": "Name of async fragment"
        },
        "@_name": "string",
        "@client-reorder": {
            "type": "boolean",
            "description": "Use JavaScript on client to move async fragment into the proper place."
        },
        "@scope": {
            "type": "expression",
            "description": "The value of 'this' when invoking the data provider function (N/A with promises)"
        },
        "@show-after": {
            "type": "string"
        },

        "vars": [{
            "name-from-attribute": "var"
        }],
        "transformer": "./async-fragment-tag-transformer"
    },
    "<async-fragments>": {
        "renderer": "./async-fragments-tag"
    },
    "<async-fragment-placeholder>": {
        "transformer": "./async-fragment-nested-tag-transformer"
    },
    "<async-fragment-timeout>": {
        "transformer": "./async-fragment-nested-tag-transformer"
    },
    "<async-fragment-error>": {
        "transformer": "./async-fragment-nested-tag-transformer"
    }
});
$rmod.def("/marko@3.0.0-rc.2/taglibs/cache/marko", {
    "<cached-fragment>": {
        "renderer": "./cached-fragment-tag",
        "@cache-key": "string",
        "@cache-name": "string",
        "@cache-manager": "string",
        "transformer": "./cached-fragment-tag-transformer.js"
    }
});
$rmod.def("/marko@3.0.0-rc.2/compiler/index", function(require, exports, module, __filename, __dirname) { var process=require("process"); 'use strict';

var Compiler = require('./Compiler');
var Walker = require('./Walker');
var Parser = require('./Parser');
var HtmlJsParser = require('./HtmlJsParser');
var Builder = require('./Builder');
var extend = require('/$/marko/$/raptor-util/extend'/*'raptor-util/extend'*/);
var NODE_ENV = process.env.NODE_ENV;
var defaultParser = new Parser(new HtmlJsParser());

var defaultOptions = {
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
        writeToDisk: true,

        /**
         * If true, then the compiled template on disk will assumed to be up-to-date if it exists.
         */
        assumeUpToDate: NODE_ENV == null ? false : (NODE_ENV !== 'development' && NODE_ENV !== 'dev')
    };

function configure(config) {
    extend(defaultOptions, config);
}

var defaultCompiler = new Compiler({
    parser: defaultParser,
    builder: Builder.DEFAULT_BUILDER
});

var req = require;

function createBuilder(options) {
    return new Builder(options);
}

function createWalker(options) {
    return new Walker(options);
}

function compileFile(filename, options, callback) {
    var fs = req('fs');
    var compiler;

    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    if (options) {
        compiler = options.compiler;
    }

    if (!compiler) {
        compiler = defaultCompiler;
    }

    if (callback) {
        fs.readFile(filename, {encoding: 'utf8'}, function(err, templateSrc) {
            if (err) {
                return callback(err);
            }

            try {
                callback(null, compiler.compile(templateSrc, filename, options));
            } catch(e) {
                callback(e);
            }
        });
    } else {
        let templateSrc = fs.readFileSync(filename, {encoding: 'utf8'});
        return compiler.compile(templateSrc, filename, options);
    }
}

function compile(src, filename, options, callback) {
    var compiler;

    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    if (options) {
        compiler = options.compiler;
    }

    if (!compiler) {
        compiler = defaultCompiler;
    }

    if (callback) {
        try {
            callback(null, compiler.compile(src, filename, options));
        } catch(e) {
            callback(e);
        }
    } else {
        return compiler.compile(src, filename, options);
    }
}

function checkUpToDate(templateFile, templateJsFile) {
    return false; // TODO Implement checkUpToDate
}

function getLastModified(path, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }

    callback(null, -1); // TODO Implement getLastModified
}

function clearCaches() {
    exports.taglibLookup.clearCache();
    exports.taglibFinder.clearCache();
    exports.taglibLoader.clearCache();
}

exports.createBuilder = createBuilder;
exports.compileFile = compileFile;
exports.compile = compile;
exports.defaultOptions = defaultOptions;
exports.checkUpToDate = checkUpToDate;
exports.getLastModified = getLastModified;
exports.createWalker = createWalker;
exports.builder = Builder.DEFAULT_BUILDER;
exports.configure = configure;
exports.clearCaches = clearCaches;

var taglibLookup = require('./taglib-lookup');
exports.taglibLookup = taglibLookup;
exports.taglibLoader = require('./taglib-loader');
exports.taglibFinder = require('./taglib-finder');

taglibLookup.registerTaglib(require.resolve('../taglibs/core/marko.json'));
taglibLookup.registerTaglib(require.resolve('../taglibs/layout/marko.json'));
taglibLookup.registerTaglib(require.resolve('../taglibs/html/marko.json'));
taglibLookup.registerTaglib(require.resolve('../taglibs/async/marko.json'));
taglibLookup.registerTaglib(require.resolve('../taglibs/cache/marko.json'));

exports.registerTaglib = function(path) {
    taglibLookup.registerTaglib(path);
    clearCaches();
};

/*
exports.Taglib = require('./Taglib');

exports.lookup = require('./taglib-lookup');
exports.buildLookup = exports.lookup.buildLookup;
exports.registerTaglib = exports.lookup.registerTaglib;
exports.excludeDir = exports.lookup.excludeDir;
exports.clearCaches = function() {
    exports.lookup.clearCaches();
    require('./taglib-finder').clearCaches();
};
*/
});
$rmod.def("/marko-widgets@6.0.0-rc.1/marko", {
    "<*>": {
        "@w-bind": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-scope": {
            "type": "expression",
            "preserve-name": true
        },

        "@w-extend": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-config": {
            "type": "expression",
            "preserve-name": true
        },
        "@w-for": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-id": {
            "type": "string",
            "preserve-name": true
        },
        "@w-on*": {
            "pattern": true,
            "type": "string",
            "allow-expressions": true,
            "preserve-name": true,
            "set-flag": "hasWidgetEvents"
        },
        "@w-body": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-preserve": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-preserve-body": {
            "type": "custom",
            "preserve-name": true
        },
        "@w-preserve-if": {
            "type": "expression",
            "preserve-name": true
        },
        "@w-preserve-body-if": {
            "type": "expression",
            "preserve-name": true
        },
        "@w-preserve-attrs": {
            "type": "string",
            "preserve-name": true
        },
        "transformer": "./taglib/widgets-transformer.js"
    },
    "<w-widget>": {
        "renderer": "./taglib/widget-tag.js",
        "@type": "object",
        "@config": "object",
        "@id": "string",
        "@hasDomEvents": "number",
        "@body": "string",
        "var": "widget",
        "import-var": {
            "_cfg": "data.widgetConfig",
            "_state": "data.widgetState",
            "_props": "data.widgetProps",
            "_body": "data.widgetBody"
        }
    },
    "<init-widgets>": {
        "renderer": "./taglib/init-widgets-tag.js",
        "@function-name": "string",
        "@include-script-tag": "boolean",
        "@immediate": "boolean"
    },
    "<w-preserve>": {
        "renderer": "./taglib/preserve-tag.js",
        "@id": "string",
        "@if": "expression",
        "@body-only": "expression"
    },
    "<widget-types>": {
        "code-generator": "./taglib/widget-types-tag.js",
        "@*": "string"
    }
});