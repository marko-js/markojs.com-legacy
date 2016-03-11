require('codemirror/lib/codemirror.css');
require('./style.css');

var removeClass = require('dom-classes').remove;
var addClass = require('dom-classes').add;

var codeMirrorFactory;

var html = require('html');

if (typeof window !== 'undefined') {
    codeMirrorFactory = require('codemirror');
    var codemirrorAtomModes = require('codemirror-atom-modes');

    codemirrorAtomModes.registerGrammar(require('src/atom-grammars/css.cson'), codeMirrorFactory);
    codemirrorAtomModes.registerGrammar(require('src/atom-grammars/javascript.cson'), codeMirrorFactory);
    codemirrorAtomModes.registerGrammar(require('src/atom-grammars/marko.cson'), codeMirrorFactory);
}

module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),

    getInitialProps: function(input) {
        input.autoResize = input.autoResize === true;
        return input;
    },

    getWidgetConfig: function(input) {
        var mode = input.mode;

        if (mode === 'marko') {
            mode = 'Marko';
        }

        return {
            code: input.code,
            mode: mode,
            autoResize: input.autoResize,
            readOnly: input.readOnly === true,
            autoFormat: input.autoFormat === true,
            theme: input.theme,
            lineNumbers: false
        };
    },

    getTemplateData: function(state, input) {
        return {
            autoResize: input.autoResize,
            fullscreen: input.fullscreen === true
        };
    },

    init: function(widgetConfig) {
        this.autoFormat = widgetConfig.autoFormat === true;
        var self = this;

        this.mode = widgetConfig.mode;

        var code = widgetConfig.code;

        if (code && this.autoFormat) {
            code = this.format(code);
        }

        var codeMirrorConfig = {
            value: code || '',
            mode: widgetConfig.mode,
            lineNumbers: widgetConfig.lineNumbers !== false,
            readOnly: widgetConfig.readOnly === true,
            indentUnit: 4
        };

        if (widgetConfig.autoResize) {
            codeMirrorConfig.viewportMargin = Infinity;
        }

        if (widgetConfig.theme) {
            codeMirrorConfig.theme = widgetConfig.theme;
        }

        this.codeMirror = codeMirrorFactory(this.el, codeMirrorConfig);

        this.codeMirror.on('change', function(editor) {
            self.emit('change', {
                codeEditor: self,
                value: editor.getValue()
            });
        });
    },

    getTextArea: function() {
        return this.codeMirror.getTextArea();
    },

    getValue: function() {
        return this.codeMirror.getValue();
    },

    setValue: function(value) {
        if (this.autoFormat) {
            value = this.format(value);
        }

        this.codeMirror.setValue(value);
    },

    setAutoFormat: function(autoFormat) {
        if (this.autoFormat === autoFormat) {
            return;
        }

        this.autoFormat = autoFormat === true;

        if (this.autoFormat) {
            this.setValue(this.format(this.getValue()));
        }
    },

    isAutoFormat: function() {
        return this.autoFormat === true;
    },

    format: function(code) {
        if (this.mode !== 'htmlmixed') {
            return code;
        }

        code = html.prettyPrint(code);
        return code;
    },

    show: function() {
        removeClass(this.el, 'hidden');
    },

    hide: function() {
        addClass(this.el, 'hidden');
    }
});