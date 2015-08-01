/* globals $, geojson2osm, L */

/*

  - Check against InsideMaps status to see if user is logged in.
  - If they are, show map, etc.
  - If they aren't, redirect them to the InsideMaps login page
    - Pass hash information in so it is captured properly
    - Once they've saved a point, call the function, via postMessage, that is passed in via the URL

*/

var iD = {
  data: {}
};
var NPMap;

$(document).ready(function () {
  var s = document.createElement('script');
  var $name;
  var $type;
  var marker;
  var name;
  var type;
  var types;

  function buildPopup (e) {
    e = e || this;
    e.target.openPopup();
    generateForm();

    if (name) {
      $name.val(name);
    }

    $name.focus();
    $type.val(type);
  }
  function generateForm () {
    var interval = setInterval(function () {
      $name = $('#name');

      if (typeof $name === 'object') {
        clearInterval(interval);
        $type = $('#type');
        $.each(types, function (i, type) {
          var name = type.name;
          $type.append('<option value="' + name + '">' + name + '</option>');
        });
        $type.on('change', function () {
          type = $(this).val();
        });
        $name
          .focus()
          .on('input', function () {
            name = $(this).val();
          });
        $('form').submit(function () {
          var geojson = marker.toGeoJSON();
          geojson.properties.name = name;
          geojson.properties['nps:preset'] = type;
          console.log(geojson);
          console.log(geojson2osm(geojson, 1234, iD.data.presets.presets));
          return false;
        });

        if (name) {
          $name.val(name);
        }

        if (type) {
          $type.val(type);
        } else {
          type = $type.val();
        }
      }
    }, 100);
  }

  NPMap = {
    baseLayers: [
      'nps-parkTilesImagery'
    ],
    closePopupOnClick: false,
    div: 'map',
    draggable: true,
    events: [{
      fn: function (e) {
        if (!marker) {
          var popup = L.popup({
            autoPanPadding: L.point(65, 65),
            closeButton: false,
            closeOnClick: false,
            keepInView: true
          })
            .setContent('' +
              '<form>' +
                '<div class="form-group">' +
                  '<label for="name">Name</label>' +
                  '<input class="form-control" id="name" type="text">' +
                '</div>' +
                '<div class="form-group">' +
                  '<label for="type=">Type</label>' +
                  '<select class="form-control" id="type">' +
                  '</select>' +
                '</div>' +
                '<div style="text-align:center;">' +
                  '<button class="btn btn-primary">Submit</button>' +
                '</div>' +
              '</form>' +
            '');

          document.getElementsByClassName('panel-body')[0].childNodes[0].innerHTML = 'Drag the marker to position it then fill out and submit the form.';
          marker = L.marker(e.latlng, {
            draggable: true
          })
            .addTo(NPMap.config.L)
            .bindPopup(popup)
            .openPopup()
            .on('click', buildPopup)
            .on('dragend', buildPopup);
          generateForm();
        }
      },
      type: 'click'
    }],
    hashControl: true,
    homeControl: false,
    hooks: {
      init: function (callback) {
        var div = document.createElement('div');
        div.className = 'wrapper';
        div.innerHTML = '' +
          '<div class="panel panel-default">' +
            '<div class="panel-body">' +
              '<p>Click the map to add a location.</p>' +
            '</div>' +
          '</div>' +
        '';
        document.getElementsByClassName('npmap-container')[0].appendChild(div);
        L.npmap.util._.reqwest({
          success: function (response) {
            var points = [];
            var presets = iD.data.presets.presets;

            for (var prop in presets) {
              if (prop.indexOf('nps') > -1) {
                var preset = presets[prop];

                if (preset.geometry.indexOf('point') > -1 && points.indexOf(preset) === -1) {
                  points.push(preset);
                }
              }
            }

            points.sort(function (a, b) {
              return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            types = points;
          },
          url: 'http://insidemaps.nps.gov/dist/presets.js'
        });
        callback();
      }
    }
  };
  s.src = 'http://www.nps.gov/lib/npmap.js/2.0.0/npmap-bootstrap.min.js';
  document.body.appendChild(s);
});
