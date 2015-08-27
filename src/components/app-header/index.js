module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),
    init: function() {
        this.mobileMenuHidden = true;
    },
    handleToggleMenuClick: function() {
        var nav = document.getElementById('nav');
        this.mobileMenuHidden = !this.mobileMenuHidden;
        nav.className = this.mobileMenuHidden ? 'mobile-hidden' : '';
    }
});