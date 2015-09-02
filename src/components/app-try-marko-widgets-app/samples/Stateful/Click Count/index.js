module.exports = require('marko-widgets').defineComponent({
    /**
     * The template to use as the view
     */
    template: require('./template.marko'),

    /**
     * Return the initial state for the UI component based on
     * the input properties that were provided.
     */
    getInitialState: function(input) {
        return {
            greetingName: input.greetingName,
            clickCount: 0
        };
    },

    /**
     * Return an object that is used as the template data. The
     * template data should be based on the current widget state
     * that is passed in as the first argument
     */
    getTemplateData: function(state) {
        var clickCount = state.clickCount;
        var timesMessage = clickCount === 1 ? 'time' : 'times';

        return {
            greetingName: state.greetingName,
            clickCount: clickCount,
            timesMessage: timesMessage
        };
    },

    /**
     * This is the constructor for the widget. Called once when
     * the widget is first added to the DOM.
     */
    init: function() {
        var el = this.el;
        // "el" will be reference the raw HTML element that this
        // widget is bound to. You can do whatever you want with it...
        // el.style.color = 'red';
    },

    /**
     * Handler method for the button "click" event. This method name
     * matches the name of the `w-onClick` attribute in the template.
     */
    handleButtonClick: function(event, el) {
        this.setState('clickCount', this.state.clickCount + 1);
    },

    /**
     * Expose a method to let other code change the "greeting name".
     * If the value of the "greetingName" state property changes
     * then the UI component will automatically rerender and the
     * DOM will be updated.
     */
    setGreetingName: function(newName) {
        this.setState('greetingName', newName);
    }
});