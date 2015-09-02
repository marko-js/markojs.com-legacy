require('./style.css');

var removeClass = require('dom-classes').remove;
var addClass = require('dom-classes').add;

var samples = require('./samples-loader').load();

function getUniqueSampleName(category, sample) {
    var catName = category.name;
    var sampleName = sample.name;
    return (catName + '_' + sampleName).replace(/\W+/g, '_');
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
        this.currentCategoryId = null;
        this.currentSampleId = null;

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
            if (this.currentCategoryId != null) {
                removeClass(this.getCategoryButtonEl(this.currentCategoryId), 'active');
                removeClass(this.getCategoryNavEl(this.currentCategoryId), 'active');
            }

            this.currentCategoryId = categoryId;

            addClass(this.getCategoryButtonEl(this.currentCategoryId), 'active');
            addClass(this.getCategoryNavEl(this.currentCategoryId), 'active');

            // Select the first sample
            var category = this.categoriesById[categoryId];

            if (sampleId == null) {
                if (category.samples.length) {
                    sampleId = category.samples[0].id;
                }
            }


            // if (category.samples.length === 1) {
            //     addClass(this.getEl('sampleNavs'), 'hidden');
            // } else {
            //     removeClass(this.getEl('sampleNavs'), 'hidden');
            // }
        }

        if (this.currentSampleId != null) {
            removeClass(this.getSampleButtonEl(this.currentSampleId), 'active');
        }

        this.currentSampleId = sampleId;

        addClass(this.getSampleButtonEl(this.currentSampleId), 'active');

        this.getWidget('tryMarkoWidgets').setCode({
            javaScript: sample.javaScriptCode,
            template: sample.templateCode,
            input: sample.inputCode,
            css: sample.cssCode
        });

        if (this.changeHash !== false) {
            document.location.hash = sample.uniqueName;
        }
    },

    getCategoryNavEl: function(categoryId) {
        return this.getEl('categoryNav' + categoryId);
    },

    getCategoryButtonEl: function(categoryId) {
        return this.getEl('categoryButton' + categoryId);
    },

    getSampleButtonEl: function(sampleId) {
        return this.getEl('sampleButton' + sampleId);
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
    }
});