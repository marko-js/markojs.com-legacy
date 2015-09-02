module.exports = require('marko-widgets').defineComponent({
    /**
     * The template to use as the view
     */
    template: require('./template.marko'),

    /**
     * Return an object that is used as the template data. The
     * template data should be based on the current widget state
     * that is passed in as the first argument
     */
    getTemplateData: function(state, input) {
        return {
            greetingName: input.greetingName
        };
    },

    /**
     * This is the constructor for the widget. Called once when
     * the widget is first added to the DOM.
     */
    init: function() {
        this.clickCount = 0;
    },

    updateClickCount: function() {
        var timesMessage = this.clickCount === 1 ? ' time' : ' times';
        this.getEl('clickCount').innerHTML = this.clickCount + timesMessage;
    },

    /**
     * Handler method for the button "click" event. This method name
     * matches the name of the `w-onClick` attribute in the template.
     */
    handleButtonClick: function(event, el) {
        this.clickCount++;
        this.updateClickCount();
    },

    /**
     * Expose a method to let other code change the "greeting name".
     */
    setGreetingName: function(newName) {
        var greetingNameEl = this.getEl('greetingName');
        greetingNameEl.innerHTML = '';
        greetingNameEl.appendChild(document.createTextNode(newName));
    }
});