require('./style.css');

var removeClass = require('dom-classes').remove;
var addClass = require('dom-classes').add;
var AsyncValue = require('raptor-async/AsyncValue');
var extend = require('raptor-util/extend');
var nodePath = require('path');
var markoWidgets = require('marko-widgets');
var compilerAsyncValue = null;

var TransformHelper = require('marko-widgets/taglib/TransformHelper');
TransformHelper.prototype.getDefaultWidgetModule = function() {
    if (this.template.dirname === '/try-online') {
        return '/try-online/index';
    } else {
        var dirname = this.template.dirname;

        try {
            require.resolve(nodePath.join(dirname, 'widget'));
            return './widget';
        } catch(e) {
            try {
                require.resolve(nodePath.join(dirname, 'index'));
                return './index';
            } catch(e) {
                return null;
            }
        }
    }
};

function loadCompiler(callback) {
    if (!compilerAsyncValue) {
        compilerAsyncValue = new AsyncValue();

        require('raptor-loader').async(function() {
            var compiler = require('marko/compiler');
            compiler.taglibs.registerTaglib(require.resolve('marko-widgets/marko-taglib.json'));
            compilerAsyncValue.resolve(compiler);
        });
    }

    compilerAsyncValue.done(callback);
}

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),
    getWidgetConfig: function(input) {
        return {};
    },
    getTemplateData: function(state, input) {
        var javaScriptCode = input.javaScriptCode;
        var templateCode = input.templateCode;
        var inputCode = input.inputCode;
        var cssCode = input.cssCode;

        return {
            javaScriptCode: javaScriptCode,
            templateCode: templateCode,
            inputCode: inputCode,
            cssCode: cssCode
        };
    },

    init: function(widgetConfig) {
        this.renderRequired = true;
        this.loadJavaScriptRequired = true;
        this.loadTemplateRequired = true;
        this.loadCssRequired = true;
        this.loadInputRequired = true;
        this.renderRequired = true;
        this.destroyRequired = false;

        this.newInput = false;

        this.loadedTemplate = null;
        this.loadedComponent = null;
        this.loadedInput = {};
        this.renderedWidget = null;

        this.editorsState = {
            data: null,
            options: null,
            dataModified: true,
            optionsModified: true,
        };

        this.halt = false;
    },

    setCode: function(options) {
        var javaScriptCode = options.javaScript;
        var templateCode = options.template;
        var inputCode = options.input;
        var cssCode = options.css;

        this.halt = true;

        this.getWidget('javaScriptEditor').setValue(javaScriptCode + '\n\n\n');
        this.getWidget('inputEditor').setValue(inputCode || '{\n}');
        this.getWidget('templateEditor').setValue(templateCode);
        this.getWidget('cssEditor').setValue(cssCode || '');

        this.halt = false;

        this.update();
    },

    loadModule: function(src, path) {
        var wrappedSource = '(function(require, exports, module, __filename, __dirname) { ' + src + ' })';
        var factoryFunc = eval(wrappedSource);
        var newExports = {};
        var newModule = {
            require: require,
            exports: newExports,
            id: path
        };

        var self = this;

        function requireProxy(path) {
            if (path === './template.marko') {
                return self.loadedTemplate;
            } else if (path === '/try-online/index') {
                return self.loadedComponent;
            } else {
                return require(path);
            }
        }

        extend(requireProxy, require);

        factoryFunc(requireProxy, newExports, newModule, path, '/');
        return newModule.exports;
    },

    handleEditorException: function(errorsWidget, e) {
        console.log('Error: ', (e.stack || e));
        var errors = e.errors;

        if (!errors) {
            errors = [{message: e.toString()}];
        }

        errorsWidget.addErrors(errors);
    },

    loadTemplate: function(callback) {
        if (!this.loadTemplateRequired) {
            return callback();
        }

        this.loadTemplateRequired = false;

        removeClass(this.getEl('templateWrapper'), 'has-errors');
        this.getWidget('templateErrors').clearErrors();


        var templateSrc = this.getWidget('templateEditor').getValue();

        var pseudoPath = '/try-online/template.marko';

        var self = this;

        loadCompiler(function(err, compiler) {
            if (err) {
                self.handleEditorException(self.getWidget('templateErrors'), err);
                return callback();
            }

            try {
                compiler.compile(templateSrc, pseudoPath, null, function(err, compiledSrc) {
                    if (err) {
                        addClass(self.getEl('templateWrapper'), 'has-errors');
                        self.handleEditorException(self.getWidget('templateErrors'), err);
                        return;
                    }

                    var loadedTemplate = self.loadModule(compiledSrc, pseudoPath);
                    if (self.loadedTemplate) {
                        extend(self.loadedTemplate, loadedTemplate);
                    } else {
                        self.loadedTemplate = loadedTemplate;
                    }

                    self.loadTemplateRequired = false;
                    return callback();
                });
            } catch(e) {
                self.handleEditorException(self.getWidget('templateErrors'), e);
                addClass(self.getEl('templateWrapper'), 'has-errors');
                return callback();
            }
        });
    },

    loadJavaScript: function() {
        if (!this.loadJavaScriptRequired) {
            return;
        }

        this.loadJavaScriptRequired = false;

        removeClass(this.getEl('javaScriptWrapper'), 'has-errors');
        this.getWidget('javaScriptErrors').clearErrors();

        var javaScriptSrc = this.getWidget('javaScriptEditor').getValue();

        try {
            this.loadedComponent = this.loadModule(javaScriptSrc, '/try-online/index.js');
            markoWidgets.registerWidget("/try-online/index", this.loadedComponent);
            return this.loadedComponent;
        } catch(e) {
            this.handleEditorException(this.getWidget('javaScriptErrors'), e);
            addClass(this.getEl('javaScriptWrapper'), 'has-errors');
            return null;
        }
    },

    loadInput: function() {
        if (!this.loadInputRequired) {
            return;
        }

        this.loadInputRequired = false;

        removeClass(this.getEl('inputWrapper'), 'has-errors');
        this.getWidget('inputErrors').clearErrors();

        var inputSrc = this.getWidget('inputEditor').getValue().trim() || {};
        this.loadedInput = null;

        try {
            this.loadedInput = eval('(' + inputSrc + ')');
        } catch(e) {
            this.handleEditorException(this.getWidget('inputErrors'), e);
            addClass(this.getEl('inputWrapper'), 'has-errors');
            return null;
        }
    },

    loadCss: function() {
        if (!this.loadCssRequired) {
            return;
        }

        this.loadCssRequired = false;

        if (this.loadedCss) {
            this.loadedCss.innerHTML = '';
        } else {
            this.loadedCss = document.createElement('style');
            document.body.appendChild(this.loadedCss);
        }

        var cssText = this.getWidget('cssEditor').getValue().trim();
        this.loadedCss.appendChild(document.createTextNode(cssText));
    },

    update: function() {
        if (this.halt) {
            return;
        }
        var self = this;

        // Load the template first since it may be asynchronous (we asynchronously load the compiler)
        this.loadTemplate(function(err, loadedTemplate) {
            // Now load the UI component from the provided JavaScript module
            self.loadJavaScript();
            self.loadInput();
            self.loadCss();
            self.render();
        });
    },

    render: function() {
        if (!this.renderRequired) {
            return;
        }

        if (!this.loadedTemplate || !this.loadedComponent || !this.loadedInput) {
            // We can only render if everything loaded successfully
            return;
        }

        this.getWidget('renderErrors').clearErrors();

        this.renderRequired = false;

        if (this.renderedWidget && this.destroyRequired) {
            this.renderedWidget.destroy();
            this.renderedWidget = null;
        }

        this.destroyRequired = false;
        var newInput = this.newInput === true;
        this.newInput = false;

        removeClass(this.getEl('outputWrapper'), 'has-errors');

        try {
            if (this.renderedWidget) {
                if (newInput) {
                    this.renderedWidget.setProps(this.loadedInput);
                } else {
                    this.renderedWidget.rerender();
                }

            } else {
                this.renderedWidget = this.loadedComponent.render(this.loadedInput)
                    .appendTo(this.getEl('htmlViewer'))
                    .getWidget();
            }
        } catch(e) {
            if (this.renderedWidget) {
                this.renderedWidget.destroy();
                this.renderedWidget = null;
            }

            this.getEl('htmlViewer').innerHTML = '';

            addClass(this.getEl('outputWrapper'), 'has-errors');
            this.handleEditorException(this.getWidget('renderErrors'), e);
        }
    },

    ///////////////////////////
    // Event handler methods //
    ///////////////////////////
    handleJavaScriptEditorChange: function() {
        this.destroyRequired = true;
        this.renderRequired = true;
        this.loadJavaScriptRequired = true;
        this.update();
    },

    handleTemplateEditorChange: function() {
        this.renderRequired = true;
        this.loadTemplateRequired = true;
        this.update();
    },

    handleInputEditorChange: function() {
        this.renderRequired = true;
        this.loadInputRequired = true;
        this.newInput = true;
        this.update();
    },

    handleCssEditorChange: function() {
        this.loadCssRequired = true;
        this.update();
    }
});