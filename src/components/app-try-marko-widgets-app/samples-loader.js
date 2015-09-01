var fs = require('fs');
var nodePath = require('path');

function Sample(options) {
    this.id = null;
    this.name = options.name;
    this.javaScriptCode = options.javaScriptCode;
    this.templateCode = options.templateCode;
    this.inputCode = options.inputCode;
    this.cssCode = options.cssCode;
    this.config = options.config || {};
    this.autoFormat = this.config.autoFormat !== false;
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

            var javaScriptPath = nodePath.join(sampleDir, 'index.js');
            var templatePath = nodePath.join(sampleDir, 'template.marko');
            var inputPath = nodePath.join(sampleDir, 'input.js');
            var cssPath = nodePath.join(sampleDir, 'style.css');
            var sampleConfigPath = nodePath.join(sampleDir, 'sample.json');

            var inputCode;
            var cssCode;
            var templateCode = fs.readFileSync(templatePath, 'utf8');
            var javaScriptCode = fs.readFileSync(javaScriptPath, 'utf8');
            var sampleConfigJSON;
            var sampleConfig;

            try {
                inputCode = fs.readFileSync(inputPath, 'utf8');
            } catch(e) {
                inputCode = '{\n}';
            }

            try {
                cssCode = fs.readFileSync(cssPath, 'utf8');
            } catch(e) {
                cssCode = null;
            }

            try {
                sampleConfigJSON = fs.readFileSync(sampleConfigPath, 'utf8');
            } catch(e) {
                sampleConfigJSON = null;
            }

            if (sampleConfigJSON) {
                sampleConfig = JSON.parse(sampleConfigJSON);
            } else {
                sampleConfig = {};
            }

            var sample = new Sample({
                name: sampleName,
                javaScriptCode: javaScriptCode,
                templateCode: templateCode,
                inputCode: inputCode,
                cssCode: cssCode,
                config: sampleConfig
            });
            category.addSample(sample);
        });
    });

    samples.finalize(sortOrders);

    return samples;
};