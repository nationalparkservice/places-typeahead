/* globals Bloodhound, Handlebars, jQuery, L, NPMap */

+function ($) {
  'use strict';

  // FIX: Change limit to five and no results display.
  var url = 'https://nps.cartodb.com/api/v2/sql?q=SELECT points_of_interest.places_id,points_of_interest.name,points_of_interest.places_id,parks.full_name,parks.unit_code,st_y(points_of_interest.the_geom) as lat,st_x(points_of_interest.the_geom) as lng,points_of_interest.type FROM points_of_interest,parks {{where}} ORDER BY points_of_interest.name,parks.full_name LIMIT(10)';
  var where = 'WHERE points_of_interest.unit_code=parks.unit_code AND points_of_interest.name IS NOT NULL AND points_of_interest.name ilike \'%25{{query}}%25\'';
  var map;
  var marker;
  var old;
  var Typeahead;

  function clear () {
    var options = map.options;

    if (marker) {
      map.removeLayer(marker);
    }

    map.setView(options.center, options.zoom);
    /*
    $('#places-typeahead-lat').val(null);
    $('#places-typeahead-lng').val(null);
    $('#places-typeahead-name').val(null);
    $('#places-typeahead-places_id').val(null);
    $('#places-typeahead-type').val(null);
    $('.places-typeahead-edit').hide();
    */
  }
  function create (element) {
    var $element = $(element);
    var $parent = $element.parent();
    var s = document.createElement('script');
    var $spinner;

    $parent.addClass('pt-wrapper');
    $element
      .after('' +
        '<i class="fa fa-lg fa-spin fa-spinner" style="display:none;"></i>' +
      '')
      .after('' +
        '<div class="pt-map"></div>' +
      '')
      .on('input', clear)
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
            return '' +
              '<div class="tt-selectable tt-suggestion" onclick="PlacesTypeahead.handleClick();return false;" onkeydown="console.log(1);return false;" tabindex="1">Can\'t find a location? Add it to Places.</div>' +
            '';
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
        clear();
      })
      .on('typeahead:select', function (e, val) {
        var latLng = {
          lat: val.lat,
          lng: val.lng
        };
        marker = new L.Marker(latLng, {
          clickable: false
        }).addTo(map);
        map.setView(latLng, 18);
        /*
        $('#places-typeahead-lat').val(val.lat);
        $('#places-typeahead-lng').val(val.lng);
        $('#places-typeahead-name').val(val.name);
        $('#places-typeahead-places_id').val(val.places_id);
        $('#places-typeahead-type').val(val.type);
        $('.places-typeahead-edit a').attr('href', 'http://insidemaps.nps.gov/places/edit/#background=mapbox-satellite&id=' + val.places_id + '&map=19.00/' + latLng.lng + '/' + latLng.lat + '&overlays=park-tiles-overlay');
        $('.places-typeahead-edit').show();
        */
      });

    $spinner = $($parent.children('.fa-spinner')[0]);
    window.NPMap = {
      baseLayers: [
        'nps-parkTilesImagery',
        'nps-parkTiles'
      ],
      boxZoom: false,
      div: $parent.children('.pt-map')[0],
      doubleClickZoom: false,
      dragging: false,
      homeControl: false,
      hooks: {
        init: function (callback) {
          map = NPMap.config.L;
          callback();
        }
      },
      keyboard: false,
      scrollWheelZoom: false,
      smallzoomControl: false,
      touchZoom: false
    };

    s.src = 'http://www.nps.gov/lib/npmap.js/2.0.0/npmap-bootstrap.min.js';
    document.body.appendChild(s);
  }

  Typeahead = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Typeahead.DEFAULTS, options);
  };

  Typeahead.VERSION = '0.0.0';
  Typeahead.DEFAULTS = {
    previewMap: true,
    supportEdit: true,
    supportSubmit: true
  };

  function Plugin (option, event) {
    console.log(this);

    var each = this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.typeahead');
      var options = $.extend({}, Typeahead.DEFAULTS, $this.data(), typeof option === 'object' && option);

      if (!data) {
        $this.data('bs.typeahead', (data = new Typeahead(this, options)));
      }

      if (typeof option === 'string') {
        data[option]();
      }
    });
    create(this[0]);
    return each;
  }

  old = $.fn.placesTypeahead;
  $.fn.placesTypeahead = Plugin;
  $.fn.placesTypeahead.Constructor = Typeahead;

  // TYPEAHEAD NO CONFLICT
  // ====================

  $.fn.placesTypeahead.noConflict = function () {
    $.fn.placesTypeahead = old;
    return this;
  };

  // TYPEAHEAD DATA-API
  // =====================
  /*
  $(window).on('load.bs.typeahead.data-api', function () {
    $('.typeahead').each(function () {
      var $typeahead = $(this);
      Plugin.call($typeahead, $typeahead.data());
    });
  });
  */
}(jQuery);
