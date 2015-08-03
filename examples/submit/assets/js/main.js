/* globals $, geojson2osm, L, osmAuth */

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
  var auth = osmAuth({
    oauth_consumer_key: 'F7zPYlVCqE2BUH9Hr4SsWZSOnrKjpug1EgqkbsSb',
    oauth_secret: 'rIkjpPcBNkMQxrqzcOvOC4RRuYupYr7k8mfP13H5',
    url: 'http://10.147.153.193',
    modal: true
  });
  var $name;
  var $type;
  var marker;
  var name;
  var s = document.createElement('script');
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
          // console.log(geojson2osm(geojson, null, iD.data.presets.presets));
          uploadGeojson(geojson);
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

  auth.xhr({
    method: 'GET',
    path: '/api/0.6/user/details'
  }, function (error, response) {
    console.log(error);
    console.log(response);

    if (error) {
      // Redirect them to the login screen.
      auth.authenticate(function () {
        console.log('success');
      });
    } else {
      // Show the map.
    }
  });

  var uploadGeojson = function (geojson) {
    var changeset = {};

    // Create the Changeset
    auth.xhr({
      'method': 'PUT',
      'path': '/api/0.6/changeset/create',
      'content': '<osm><changeset version="0.3" generator="npmap-uploader"><tag k="created_by" v="npmap-uploader"/><tag k="locale" v="en-US"/><tag k="comment" v="Parking"/></changeset></osm>',
      options: {
        header: {
          'Content-Type': 'text/xml'
        }
      }
    }, function (err, result) {
      if (!err && result) {
        changeset = {
          'data': geojson2osm(geojson, result, iD.data.presets.presets),
          'id': result
        };

        // Update the changeset
        auth.xhr({
          'method': 'POST',
          'path': '/api/0.6/changeset/' + changeset.id + '/upload',
          'content': changeset.data,
          options: {
            header: {
              'Content-Type': 'text/xml'
            }
          }
        }, function (e, r) {
          console.log('e', e, 'r', r);

          // Close the changeset
          auth.xhr({
            'method': 'PUT',
            'path': '/api/0.6/changeset/' + changeset.id + '/close'
          }, function (e, r) {
            console.log('e', e, 'r', r);
          });
        });
      }
    });
  };

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

  window.addEventListener('message', receiveMessage, false);

  function receiveMessage (event) {
    if (event.origin !== 'http://insidemaps.nps.gov') {
      return;
    } else {
      console.log(event);
      authComplete(event.data);
    }
  }

});

