var fs = require('fs');
var nodePath = require('path');

function Sample(name, template, data, options, sampleConfig, syntax) {
    sampleConfig = sampleConfig || {};

    this.id = null;
    this.name = name;
    this.template = template;
    this.data = data;
    this.options = options;
    this.autoFormat = sampleConfig.autoFormat !== false;
    this.syntax = syntax;
}

function Category(name) {
    this.id = null;
    this.name = name;
    this.samples = [];

    this.addSample = function(sample) {
        this.samples.push(sample);
    };

}

function Samples() {
    this.categories = [];

    this.addCategory = function(category) {
        this.categories.push(category);
    };

    this.finalize = function(sortOrders) {

        var sortOrderLookup = {};
        sortOrders.forEach(function(categoryArray, i) {
            var categoryName = categoryArray[0];
            var sampleArray = categoryArray[1];
            sortOrderLookup[categoryName] = i;

            sampleArray.forEach(function(sampleName, i) {
                sortOrderLookup[categoryName + '|' + sampleName] = i;
            });
        });

        this.categories.sort(function(a, b) {
            a = sortOrderLookup[a.name];
            b = sortOrderLookup[b.name];
            if (a == null) {
                a = Number.MAX_VALUE;
            }

            if (b == null) {
                b = Number.MAX_VALUE;
            }

            return a - b;
        });

        var nextCategoryId = 0;
        var nextSampleId = 0;

        this.categories.forEach(function(category) {
            category.id = nextCategoryId++;

            category.samples.sort(function(a, b) {
                a = sortOrderLookup[category.name + '|' + a.name];
                b = sortOrderLookup[category.name + '|' + b.name];

                if (a == null) {
                    a = Number.MAX_VALUE;
                }

                if (b == null) {
                    b = Number.MAX_VALUE;
                }
                return a - b;
            });

            category.samples.forEach(function(sample) {
                sample.id = nextSampleId++;
            });
        });
    };
}

exports.load = function() {
    var dir = nodePath.join(__dirname, 'samples');
    var sortOrders = require(nodePath.join(__dirname, 'samples-sort-order.json'));


    var samples = new Samples();
    var categoryDirs = fs.readdirSync(dir);



    categoryDirs.forEach(function(categoryName) {

        if (categoryName.charAt(0) === '.' || categoryName.indexOf('.json') !== -1) {
            return;
        }

        var categoryDir = nodePath.join(dir, categoryName);

        var category = new Category(categoryName);
        samples.addCategory(category);

        var sampleDirs = fs.readdirSync(categoryDir);
        sampleDirs.forEach(function(sampleName) {
            if (sampleName.charAt(0) === '.') {
                return;
            }

            var sampleDir = nodePath.join(categoryDir, sampleName);

            var dataPath = nodePath.join(sampleDir, 'data.js');
            var templatePath;
            var syntax;

            templatePath = nodePath.join(sampleDir, 'template.marko');
            if (fs.existsSync(templatePath)) {
                syntax = 'concise';
            } else {
                templatePath = nodePath.join(sampleDir, 'template.concise.marko');
                if (fs.existsSync(templatePath)) {
                    syntax = 'concise';
                } else {
                    templatePath = nodePath.join(sampleDir, 'template.html.marko');
                    if (fs.existsSync(templatePath)) {
                        syntax = 'html';
                    } else {
                        throw new Error('Missing template for sample "' + sampleDir + '"');
                    }
                }
            }

            var optionsPath = nodePath.join(sampleDir, 'options.js');
            var sampleConfigPath = nodePath.join(sampleDir, 'sample.json');

            var data;
            var options;
            var sampleConfig;
            var sampleConfigJSON;

            var template = fs.readFileSync(templatePath, 'utf8');

            try {
                data = fs.readFileSync(dataPath, 'utf8');
            } catch(e) {
                data = '{\n}';
            }

            try {
                options = fs.readFileSync(optionsPath, 'utf8');
            } catch(e) {
                options = null;
            }

            try {
                sampleConfigJSON = fs.readFileSync(sampleConfigPath, 'utf8');
            } catch(e) {
                sampleConfigJSON = null;
            }

            if (sampleConfigJSON) {
                sampleConfig = JSON.parse(sampleConfigJSON);
            }

            var sample = new Sample(sampleName, template, data, options, sampleConfig, syntax);
            category.addSample(sample);
        });
    });

    samples.finalize(sortOrders);

    return samples;
};