var moment = require('moment');

function padTimeField(n){
    return n<10 ? '0'+n : n;
}

exports.formatDate = function(date) {
    return moment(date).format('dddd, MMM Do, YYYY');
};

exports.formatMonthDay = function(date) {
    return moment(date).format('MMM DD');
};

exports.machineDate = function(date) {
    return date.getUTCFullYear() + '-' +
       padTimeField(date.getUTCMonth()+1) + '-' +
       padTimeField(date.getUTCDate());
};