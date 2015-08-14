/* globals $, Bloodhound, Handlebars, L, NPMap */
/* jshint camelcase: false */

// TODO: Preload park names into typeahead as a separate data source. (Do this in one example, but it should be a config option.)
// TODO: Integrate into NPMap.js' geocoder control.

/*
Turn this into a legit plugin. What configuration options should you support?
  - unit_code(s)
  - type(s)
  - showFilterButton
  - showPreviewMap
How to handle points that don't exist? This should be another configuration option:
  - Kick them directly to Places Editor
  - Bring up interface to allow them to submit without leaving current page
Is it possible to "wrap" typeahead.js with the functionality you need and still make it a Bootstrap plugin?
*/

var PlacesTypeahead = {};

$(document).ready(function () {
  var $preview = $('#preview');
  var $typeahead = $('.typeahead');
  var baseWhere = 'WHERE points_of_interest.unit_code=parks.unit_code AND points_of_interest.name IS NOT NULL AND points_of_interest.name ilike \'%25{{query}}%25\'';
  var filterPark = null;
  var filterType = null;
  var parks = [];
  var s = document.createElement('script');
  var types = [];
  // FIX: Change limit to five and no results display.
  var url = 'https://nps.cartodb.com/api/v2/sql?q=SELECT points_of_interest.places_id,points_of_interest.name,points_of_interest.places_id,parks.full_name,parks.unit_code,st_y(points_of_interest.the_geom) as lat,st_x(points_of_interest.the_geom) as lng,points_of_interest.type FROM points_of_interest,parks {{where}} ORDER BY points_of_interest.name,parks.full_name LIMIT(10)';
  var where = baseWhere;
  var map;
  var marker;

  function createTypeahead () {
    var $spinner = $('.fa-spinner');

    $typeahead
      .typeahead({
        highlight: true,
        valueKey: 'name'
      }, {
        display: 'name',
        source: new Bloodhound({
          datumTokenizer: function (datum) {
            return Bloodhound.tokenizers.whitespace(datum.name);
          },
          identify: function (obj) {
            return obj.places_id;
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          remote: {
            filter: function (response) {
              return $.map(response.rows, function (row) {
                return {
                  lat: row.lat,
                  lng: row.lng,
                  name: row.name,
                  park: row.full_name,
                  places_id: row.places_id,
                  type: row.type,
                  unit_code: row.unit_code
                };
              });
            },
            replace: function (url, query) {
              return url.replace('{{query}}', query.replace(/'/g, '\'\''));
            },
            url: url.replace('{{where}}', where),
            wildcard: '{{query}}'
          }
        }),
        templates: {
          notFound: function (query) {
            return '<div class="tt-selectable tt-suggestion" onclick="PlacesTypeahead.handleClick();return false;">Can\'t find a location? Add it to Places.</div>';
          },
          suggestion: Handlebars.compile('' +
            '<div>' +
              '<strong>{{name}}</strong><br><em>{{#if type}}{{type}}</em> in {{/if}}<em>{{park}}</em>' +
            '</div>' +
          '')
        }
      })
      .on('typeahead:asynccancel', function () {
        $spinner.hide();
      })
      .on('typeahead:asyncreceive', function () {
        $spinner.hide();
      })
      .on('typeahead:asyncrequest', function () {
        $spinner.show();
      })
      .on('typeahead:select', function (e, val) {
        var latLng = {
          lat: val.lat,
          lng: val.lng
        };

        if (marker) {
          map.removeLayer(marker);
        }

        marker = new L.Marker(latLng, {
          clickable: false
        }).addTo(map);
        map.setView(latLng, 18);
        $('#preview p').html(JSON.stringify(val, null, 2));
        $('#preview a').attr('href', 'http://insidemaps.nps.gov/places/edit/#background=mapbox-satellite&id=' + val.places_id + '&map=19.00/' + latLng.lng + '/' + latLng.lat + '&overlays=park-tiles-overlay');
        $preview.show();
      });
    $typeahead.focus();
  }

  $.getJSON('https://nps.cartodb.com/api/v2/sql?q=SELECT full_name,unit_code FROM parks WHERE the_geom IS NOT NULL ORDER BY full_name', function (response) {
    parks = response.rows;
  });
  $.getJSON('https://nps.cartodb.com/api/v2/sql?q=SELECT DISTINCT type FROM points_of_interest ORDER BY type', function (response) {
    types = response.rows;
  });
  $('.input-group .btn-primary')
    .click(function () {
      $(this)
        .addClass('active')
        .popover('show');
    })
    .popover({
      animation: false,
      container: 'body',
      content: '' +
        '<div id="options">' +
          '<div class="form-group">' +
            '<label for="park">Park</label>' +
            '<select class="form-control" id="park"></select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label for="type">Type</label>' +
            '<select class="form-control" id="type"></select>' +
          '</div>' +
          '<div style="margin-top:10px;text-align:center;">' +
            '<button class="btn btn-default" style="margin-right:5px;">Cancel</button>' +
            '<button class="btn btn-primary">Submit</button>' +
          '</div>' +
        '</div>' +
      '',
      html: true,
      placement: 'bottom',
      toggle: 'popover',
      trigger: 'manual'
    })
      .on('hidden.bs.popover', function () {
        $('body .backdrop').remove();
        $('.input-group .btn-primary').removeClass('active');
      })
      .on('shown.bs.popover', function () {
        var $me = $(this);
        var $park = $('#park');
        var $type = $('#type');

        $park.append('<option value="">Servicewide</option>');
        $.each(parks, function (i, park) {
          $park.append('<option value="' + park.unit_code + '">' + park.full_name + '</option>');
        });
        $park.focus();
        $type.append('<option value="">All</option>');
        $.each(types, function (i, type) {
          if (type.type) {
            $type.append('<option>' + type.type + '</option>');
          }
        });
        $('body').append('<div class="backdrop in modal-backdrop" style="z-index:1059;"></div>');
        $('#options .btn-default').click(function () {
          $me.popover('hide');
        });
        $('#options .btn-primary').click(function () {
          var type = $type.val();
          var unit_code = $park.val();
          var filterText;

          if (type) {
            filterType = type;
          } else {
            filterType = null;
          }

          if (unit_code) {
            filterPark = unit_code;
          } else {
            filterPark = null;
          }

          if (type && unit_code) {
            filterText = 'Filtered by "' + unit_code + '" and "' + type + '".';
            where = baseWhere + ' AND points_of_interest.unit_code=\'' + $park.children('option').filter(':selected').text() + '\' AND points_of_interest.type=\'' + type + '\'';
          } else if (type) {
            filterText = 'Filtered by "' + type + '".';
            where = baseWhere + ' AND points_of_interest.type=\'' + type + '\'';
          } else if (unit_code) {
            filterText = 'Filtered by "' + $park.children('option').filter(':selected').text() + '".';
            where = baseWhere + ' AND points_of_interest.unit_code=\'' + $('#park').val() + '\'';
          } else {
            where = baseWhere;
          }

          $('.help-block').html(filterText);
          $typeahead
            .val(null)
            .typeahead('destroy');
          map.setView(map.options.center, map.options.zoom);

          if (marker) {
            map.removeLayer(marker);
            marker = null;
          }

          $me.popover('hide');
          createTypeahead();
        });

        if (filterPark) {
          $park.val(filterPark);
        }

        if (filterType) {
          $type.val(filterType);
        }
      });
  createTypeahead();
  $('.modal').modal({
    backdrop: 'static',
    keyboard: false,
    show: false
  });
  PlacesTypeahead.handleClick = function () {
    $(document.body).append('<div class="modal" id="modal-places-typeahead-submit">' +
      '<div class="modal-dialog">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
              '<span aria-hidden="true">&times;</span>' +
            '</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<iframe src="http://insidemaps.nps.gov/places/submit/?dev=true&iframe=true" style="border:none;height:450px;width:100%;"></iframe>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>');
    $('#modal-places-typeahead-submit').modal('show');
  };
  window.NPMap = {
    baseLayers: [
      'nps-parkTilesImagery',
      'nps-parkTiles'
    ],
    div: 'map',
    hooks: {
      init: function (callback) {
        map = NPMap.config.L;
        callback();
      }
    },
    scrollWheelZoom: false
  };

  s.src = 'http://www.nps.gov/lib/npmap.js/2.0.0/npmap-bootstrap.min.js';
  document.body.appendChild(s);
});
