module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),

    getInitialState: function(input) {
        return {
            running: false,
            elapsedTime: 0
        };
    },
    getTemplateData: function(state, input) {
        return {
            running: state.running,
            elapsedTime: state.elapsedTime,
            stopDisabled: state.elapsedTime === 0 && state.running === false
        };
    },

    init: function() {
        this.intervalId = null;
    },

    onDestroy: function() {
        if (this.state.running) {
            clearInterval(this.intervalId);
        }
    },

    handleStartClick: function() {
        var self = this;

        this.setState('running', true);

        this.intervalId = setInterval(function() {
            self.setState('elapsedTime', self.state.elapsedTime+1);
        }, 1000);
    },
    handlePauseClick: function() {
        clearInterval(this.intervalId);
        this.setState('running', false);
    },
    handleStopClick: function() {
        clearInterval(this.intervalId);
        this.setState({
            running: false,
            elapsedTime: 0
        });
    }
});