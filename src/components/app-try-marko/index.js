require('./style.css');

var AsyncValue = require('raptor-async/AsyncValue');

var compilerAsyncValue = null;

function loadCompiler(callback) {
    if (!compilerAsyncValue) {
        compilerAsyncValue = new AsyncValue();

        require('raptor-loader').async(function() {
            var compiler = require('marko/compiler');
            compiler.taglibs.registerTaglib(require.resolve('./test-taglib/marko-taglib.json'));
            compilerAsyncValue.resolve(compiler);
        });
    }

    compilerAsyncValue.done(callback);
}

function compileAndLoadTemplate(templateSrc, path, compileOptions, callback) {
    loadCompiler(function(err, compiler) {
        if (err) {
            throw err;
        }

        try {
            compiler.compile(templateSrc, path, compileOptions, function(err, compiledSrc) {
                if (err) {
                    return callback(err);
                }

                var wrappedSource = '(function(require, exports, module, __filename, __dirname) { ' + compiledSrc + ' })';
                var factoryFunc = eval(wrappedSource);
                var templateExports = {};
                var templateModule = {
                    require: require,
                    exports: templateExports,
                    id: '/template.marko'
                };

                factoryFunc(require, templateExports, templateModule, '/template.marko', '/');
                callback(null, templateModule.exports, compiledSrc);
            });
        } catch(e) {
            if (window.console) {
                console.error(e);
            }

            callback(e);
        }
    });
}

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),
    getWidgetConfig: function(input) {
        return {
            inline: input.inline === true
        };
    },
    getTemplateData: function(state, input) {
        var templateNav = input['template-nav'];
        var dataCode = input.dataCode;
        var templateCode = input.templateCode;
        var compiledCode = input.compiledCode;
        var htmlCode = input.htmlCode;

        return {
            templateNav: templateNav,
            dataCode: dataCode,
            templateCode: templateCode,
            compiledCode: compiledCode,
            htmlCode: htmlCode,
            inline: input.inline === true
        };
    },

    init: function(widgetConfig) {
        this.autoRender = true;
        this.compileRequired = true;
        this.renderRequired = true;
        this.inline = widgetConfig.inline === true;

        this.editorsState = {
            data: null,
            options: null,
            dataModified: true,
            optionsModified: true,
        };

        this.halt = false;
    },

    setCode: function(options) {

        var showOptions = options.showOptions === true;

        if (showOptions) {
            this.getWidget('optionsEditor').show();
        } else {
            this.getWidget('optionsEditor').hide();
        }

        var template = options.template;
        var data = options.data;
        var compilerOptions = options.compilerOptions;
        var autoFormat = options.autoFormat === true;

        this.getWidget('outputEditor').setAutoFormat(autoFormat);
        this.halt = true;
        this.getWidget('dataEditor').setValue(data || '{\n}');

        if (compilerOptions) {
            this.getWidget('optionsEditor').setValue(compilerOptions);
        }

        this.compilerOptions = compilerOptions;

        this.getWidget('templateEditor').setValue(template);

        this.halt = false;

        this.update();
    },

    handleEditorException: function(errorsWidget, e) {
        var errors = e.errors;

        if (!errors) {
            errors = [{message: e.toString()}];
        }

        errorsWidget.addErrors(errors);
    },

    compileTemplate: function() {
        if (!this.compileRequired) {
            return;
        }

        this.getWidget('templateErrors').clearErrors();
        var templateSrc = this.getWidget('templateEditor').getValue();
        var pseudoPath = '/template.marko';

        var compileOptions = this.compilerOptions ?
            this.editorsState.optionsData :
            null;

        var self = this;

        compileAndLoadTemplate(
            templateSrc,
            pseudoPath,
            compileOptions,
            function(err, loadedTemplate, compiledSrc) {
                if (err) {
                    self.handleEditorException(self.getWidget('templateErrors'), err);
                    return;
                }

                self.loadedTemplate = loadedTemplate;

                self.getWidget('compiledEditor').setValue(compiledSrc);
                self.compileRequired = false;
            });
    },

    renderTemplate: function() {
        if (!this.renderRequired) {
            return;
        }

        var viewModel = this.editorsState.templateData;
        var self = this;

        try {
            this.loadedTemplate.render(viewModel, function(err, html) {
                if (err) {
                    this.handleEditorException(self.getWidget('templateErrors'), err);
                    self.getEl('htmlViewer').innerHTML = '';
                    return;
                }

                self.getWidget('outputEditor').setValue(html);
                self.updateHTMLViewer(html);
            });
        } catch(err) {
            this.handleEditorException(this.getWidget('templateErrors'), err);
            this.updateHTMLViewer('');
        }

        this.renderRequired = false;
    },

    updateHTMLViewer: function(code) {
        if (this.inline) {
            return;
        }
        this.getEl('htmlViewer').innerHTML = code;
    },

    updateJSON: function(targetProp, modifiedProp, editor, errors) {
        if (!this.editorsState[modifiedProp]) {
            return;
        }

        this.editorsState[targetProp] = null;
        errors.clearErrors();

        var jsonData = editor.getValue();

        var data;

        if (jsonData.trim() === '') {
            data = {};
        } else {
            try {
                data = eval("(" + jsonData + ")");
                this.editorsState[targetProp] = data;
            } catch(e) {
                this.handleEditorException(errors, e);
            }
        }

        this.editorsState[modifiedProp] = false;
    },

    update: function() {
        if (this.halt) {
            return;
        }
        var self = this;

        loadCompiler(function() {
            if (self.editorsState.dataModified) {
                self.getWidget('templateErrors').clearErrors();
            }

            self.updateJSON('optionsData', 'optionsModified', self.getWidget('optionsEditor'),self.getWidget('optionsErrors'));
            self.compileTemplate();
            self.updateJSON('templateData', 'dataModified', self.getWidget('dataEditor'), self.getWidget('dataErrors'));

            self.renderTemplate();
        });
    },

    ///////////////////////////
    // Event handler methods //
    ///////////////////////////
    handleTemplateEditorChange: function() {
        this.compileRequired = true;
        this.renderRequired = true;

        if (this.autoRender) {
            this.update();
        }
    },

    handleDataEditorChange: function() {
        this.editorsState.dataModified = true;
        this.renderRequired = true;

        if (this.autoRender) {
            this.update();
        }
    },

    handleOptionsEditorChange: function() {
        this.editorsState.optionsModified = true;
        this.renderRequired = true;
        this.compileRequired = true;

        if (this.autoRender) {
            this.update();
        }
    }
});