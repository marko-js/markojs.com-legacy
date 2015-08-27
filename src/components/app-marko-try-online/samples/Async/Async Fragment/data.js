{
    userDataProvider: function(args, callback) {
        setTimeout(function() {
            callback(null, {
                firstName: 'John',
                lastName: 'Doe',
                age: 50
            });
        }, 500);
    }
}