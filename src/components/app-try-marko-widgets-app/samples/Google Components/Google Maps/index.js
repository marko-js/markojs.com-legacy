module.exports = require('marko-widgets').defineComponent({
    template: require('./template.marko'),
    getInitialState: function(input) {
        var height = input.height;
        var width = input.width;

        return {
            width: width,
            height: height,
            lat: input.lat,
            lng: input.lng
        };
    },
    getTemplateData: function(state, input) {
        var height = state.height;
        var width = state.width;

        var style = '';
        if (height) {
            style += 'height: ' + height + ';';
        }

        if (width) {
            style += 'width: ' + width + ';';
        }

        return {
            style: style
        };
    },
    init: function() {
    },
    onRender: function() {
        this.renderGoogleMap();
    },
    renderGoogleMap: function() {
        var el = this.el;
        var google = window.google;

        var lat = this.state.lat;
        var lng = this.state.lng;

        // If there is no internet connection then
        // the Google Maps API will fail to load and
        // window.google will be undefined
        if (google && google.maps && google.maps.Map) {
            var Map = google.maps.Map;
            var LatLng = google.maps.LatLng;

            this._map = new Map(el, {
                zoom: 8,
                center: new LatLng(
                    lat,
                    lng)
                });
        } else {
            this.el.innerHTML = 'Failed to load Google Maps API. Is your internet connection working?';
        }
    },
    _panToNewState: function() {
        var google = window.google;
        var latLng = new google.maps.LatLng(this.state.lat, this.state.lng);
        this._map.panTo(latLng);
    },
    update_lat: function() {
        this._panToNewState();
    },
    update_lng: function() {
        this._panToNewState();
    }
});