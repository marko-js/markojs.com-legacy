require('./style.css');

var samples = require('./samples-loader').load();

var compiler = require('marko/compiler');
compiler.taglibs.registerTaglib(require.resolve('./test-taglib/marko-taglib.json'));

if (typeof window !== 'undefined') {
    window.testTemplate = require('./include-target.marko');
    window.layoutTemplate = require('./layout-use-target.marko');
}

function getUniqueSampleName(category, sample) {
    var catName = category.name;
    var sampleName = sample.name;
    return (catName + '_' + sampleName).replace(/\W+/g, '_');
}

function compileAndLoadTemplate(templateSrc, path, compileOptions, callback) {
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
}

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),
    getWidgetConfig: function() {
        return {
            samples: samples
        };
    },
    getTemplateData: function() {
        var theme = null; // 'monokai'

        return {
            samples: samples,
            theme: theme
        };
    },

    init: function(widgetConfig) {
        this.autoRender = true;
        this.compileRequired = true;
        this.renderRequired = true;
        this.currentSample = null;

        this.editorsState = {
            data: null,
            options: null,
            dataModified: true,
            optionsModified: true,
        };

        this.currentCategoryId = null;
        this.currentSampleId = null;
        this.halt = false;

        this.$htmlViewer = this.$("#htmlViewer");

        var samples = widgetConfig.samples;

        var samplesById = this.samplesById = {};
        var categoriesById = this.categoriesById = {};
        var samplesByName = this.samplesByName = {};

        this.changeHash = true;

        samples.categories.forEach(function(category) {
            categoriesById[category.id] = category;

            category.samples.forEach(function(sample) {
                sample.category = category;
                samplesById[sample.id] = sample;
                sample.uniqueName = getUniqueSampleName(category, sample);
                samplesByName[sample.uniqueName] = sample;
            });
        });

        if (document.location.hash) {
            var sample = samplesByName[document.location.hash.substring(1)];
            if (sample) {
                this.showSample(sample.id);
            } else {
                this.showCategory(samples.categories[0].id);
            }
        } else {
            this.changeHash = false;
            this.showCategory(samples.categories[0].id);
            this.changeHash = true;
        }

        var self = this;

        window.addEventListener("hashchange", function() {
            var sample = samplesByName[document.location.hash.substring(1)];
            if (sample) {
                self.showSample(sample.id);
            }
        }, false);
    },


    showCategory: function(categoryId) {
        var category = this.categoriesById[categoryId];
        if (!category || category.samples.length === 0) {
            return;
        }

        this.showSample(category.samples[0].id);
    },

    showSample: function(sampleId) {
        if (this.currentSampleId === sampleId) {
            return;
        }

        var sample = this.samplesById[sampleId];

        if (!sample) {
            return;
        }

        this.currentSample = sample;

        var categoryId = sample.category.id;

        if (this.currentCategoryId !== categoryId) {
            if (this.currentCategoryId !== -1) {
                this.$('.mto-category-btn[data-cat-id="' + this.currentCategoryId + '"]').removeClass('mto-btn-active');
                this.$('.mto-sample-nav[data-cat-id="' + this.currentCategoryId + '"]').removeClass('mto-sample-nav-active');
            }

            this.currentCategoryId = categoryId;

            this.$('.mto-category-btn[data-cat-id="' + this.currentCategoryId + '"]').addClass('mto-btn-active');
            this.$('.mto-sample-nav[data-cat-id="' + this.currentCategoryId + '"]').addClass('mto-sample-nav-active');

            // Select the first sample

            var category = this.categoriesById[categoryId];

            if (sampleId == null) {
                if (category.samples.length) {
                    sampleId = category.samples[0].id;
                }
            }

            if (category.samples.length === 1) {
                this.$('#sampleNavs').hide();
            } else {
                this.$('#sampleNavs').show();
            }
        }

        if (this.currentSampleId !== -1) {
            this.$('.mto-sample-btn[data-sample-id="' + this.currentSampleId + '"]').removeClass('mto-btn-active');
        }

        this.currentSampleId = sampleId;

        this.$('.mto-sample-btn[data-sample-id="' + this.currentSampleId + '"]').addClass('mto-btn-active');

        if (sample.options) {
            this.$('#optionsContainer').show();
        } else {
            this.$('#optionsContainer').hide();
        }


        var template = sample.template;
        var data = sample.data;
        var options = sample.options;
        var autoFormat = sample.autoFormat === true;

        this.getWidget('outputEditor').setAutoFormat(autoFormat);
        this.halt = true;

        this.getWidget('dataEditor').setValue(data || '{\n}');

        if (options) {
            this.getWidget('optionsEditor').setValue(options);
        }

        this.getWidget('templateEditor').setValue(template);

        this.halt = false;

        this.update();

        if (this.changeHash !== false) {
            document.location.hash = sample.uniqueName;
        }
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

        var compileOptions = this.currentSample.options ?
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
                    self.$htmlViewer.html('');
                    return;
                }

                self.getWidget('outputEditor').setValue(html);
                self.$htmlViewer.html(html);
            });
        } catch(err) {
            this.handleEditorException(this.getWidget('templateErrors'), err);
            this.$htmlViewer.html('');
        }

        this.renderRequired = false;
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

        if (this.editorsState.dataModified) {
            this.getWidget('templateErrors').clearErrors();
        }

        this.updateJSON('optionsData', 'optionsModified', this.getWidget('optionsEditor'),this.getWidget('optionsErrors'));
        this.compileTemplate();
        this.updateJSON('templateData', 'dataModified', this.getWidget('dataEditor'), this.getWidget('dataErrors'));

        this.renderTemplate();
    },

    ///////////////////////////
    // Event handler methods //
    ///////////////////////////
    handleCategoryClick: function(event, el) {
        var categoryId = el.getAttribute('data-cat-id');
        if (categoryId == null) {
            return;
        }

        categoryId = parseInt(categoryId, 10);
        this.showCategory(categoryId);
    },

    handleSampleButtonClick: function(event, el) {
        var sampleId = el.getAttribute('data-sample-id');
        if (sampleId == null) {
            return;
        }

        sampleId = parseInt(sampleId, 10);
        this.showSample(sampleId);
    },

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