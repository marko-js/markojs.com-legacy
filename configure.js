require('native-promise-only');
require('marko/node-require').install();

// If the process was started using browser-refresh then enable
// hot reloading for certain types of files to short-circuit
// a full process restart. You *should* use browser-refresh
// in development: https://www.npmjs.com/package/browser-refresh
require('marko/browser-refresh').enable();
require('lasso/browser-refresh').enable('*.marko *.css *.less');
require('app-module-path').addPath(__dirname);

var path =   require('path');
var lasso =  require('lasso');


// The following line allows us to require *.css and *.less
// files in code that runs on the server, but nothing
// actually happens on the server
require('lasso/node-require-no-op').enable('.css', '.less');

var isProduction = (process.env.NODE_ENV === 'production');

lasso.configure({
    plugins: [
        'lasso-marko' // Auto compile Marko template files
    ],

    // Directory where generated JS and CSS bundles are written
    outputDir: path.join(__dirname, 'build/static'),

    // URL prefix for static assets
    urlPrefix: '/static',

    // Only bundle up JS and CSS files in production builds
    bundlingEnabled: isProduction,

    // Only minify JS and CSS files in production builds
    minify: isProduction,

    // Only fingerprint JS and CSS files in production builds
    fingerprintsEnabled: isProduction,

    bundles: [
        {
            name: "marko",
            dependencies: [
                { "path": "require: marko", "recurseInto": "all" }
            ]
        },
        {
            name: "marko-widgets",
            dependencies: [
                { "path": "require: marko-widgets", "recurseInto": "all" }
            ]
        },
        {
            name: "marko-compiler",
            dependencies: [
                { "path": "require: marko/compiler", "recurseInto": "all" }
            ]
        }
    ]
});