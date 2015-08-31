/* globals Bloodhound, Handlebars, jQuery, L, NPMap */

+function ($) {
  'use strict';

  // FIX: Change limit to five and no results display.
  var url = 'https://nps.cartodb.com/api/v2/sql?q=SELECT points_of_interest.places_id,points_of_interest.name,points_of_interest.places_id,parks.full_name,parks.unit_code,st_y(points_of_interest.the_geom) as lat,st_x(points_of_interest.the_geom) as lng,points_of_interest.type FROM points_of_interest,parks {{where}} ORDER BY points_of_interest.name,parks.full_name LIMIT(10)';
  var $editWrapper;
  var $lat;
  var $lng;
  var $mapWrapper;
  var $parent;
  var $placesId;
  var $spinner;
  var $type;
  var map;
  var marker;
  var old;
  var Typeahead;
  var where;

  function clear () {
    var options = map.options;

    if (marker) {
      map.removeLayer(marker);
    }

    map.setView(options.center, options.zoom);
    $parent
      .children('input:hidden').val(null)
      .children('.pt-edit').hide();
  }
  function create (element, options) {
    var $element = $(element);
    var $edit;

    function callback () {
      $parent = $element.parent();
      $parent.addClass('pt-wrapper');
      $element
        .attr('autocomplete', 'false')
        .after('' +
          '<i class="fa fa-lg fa-spin fa-spinner"></i>' +
          '<input name="lat" type="hidden">' +
          '<input name="lng" type="hidden">' +
          '<input name="places_id" type="hidden">' +
          '<input name="type" type="hidden">' +
          '<div class="pt-map-wrapper row">' +
            '<div class="col-md-12">' +
              '<div class="pt-map"></div>' +
            '</div>' +
          '</div>' +
          '<div class="pt-edit-wrapper row">' +
            '<div class="col-md-12">' +
              '<div class="pt-edit text-center">' +
                '<span style="margin-right:5px;">Location, name, or type incorrect?</span><a class="btn btn-primary" href="#" target="_blank">Edit this Place</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
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
                '<div class="tt-suggestion tt-selectable" onclick="PlacesTypeahead.handleClick();return false;" onkeydown="console.log(1);return false;" tabindex="1">Can\'t find a location? Add it to Places.</div>' +
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
          $lat.val(val.lat);
          $lng.val(val.lng);
          $placesId.val(val.places_id);
          $type.val(val.type);
          $($edit.find('a')[0]).attr('href', 'http://insidemaps.nps.gov/places/edit/#background=mapbox-satellite&id=' + val.places_id + '&map=19.00/' + latLng.lng + '/' + latLng.lat + '&overlays=park-tiles-overlay');
          $edit.show();
        });

      $edit = $($parent.find('.pt-edit')[0]);
      $editWrapper = $($parent.find('.pt-edit-wrapper')[0]);
      $lat = $($parent.find('input[name="lat"]')[0]);
      $lng = $($parent.find('input[name="lng"]')[0]);
      $mapWrapper = $($parent.find('.pt-map-wrapper')[0]);
      $placesId = $($parent.find('input[name="places_id"]')[0]);
      $type = $($parent.find('input[name="type"]')[0]);
      $spinner = $($parent.find('.fa-spinner')[0]);

      if (typeof options === 'object' && typeof options.parks === 'string') {
        $.ajax({
          success: function (response) {
            if (response.total_rows) {
              loadMap(JSON.parse(response.rows[0].bounds));
            }
          },
          url: 'https://nps.cartodb.com/api/v2/sql?q=SELECT%20ST_AsGeoJSON(ST_Extent(the_geom))%20AS%20%22bounds%22%20FROM%20parks%20WHERE%20%22the_geom%22%20IS%20NOT%20NULL%20AND%20LOWER(%22unit_code%22)%20%3D%20LOWER(%27' + options.parks + '%27)'
        });
      } else {
        loadMap();
      }
    }

    if (typeof window.L !== 'object') {
      $('head').append($('<link rel="stylesheet">').attr('href', 'http://www.nps.gov/lib/npmap.js/2.0.0/npmap.min.css'));
      $.getScript('http://www.nps.gov/lib/npmap.js/2.0.0/npmap.min.js', callback);
    } else {
      callback();
    }
  }
  function loadMap (bounds) {
    map = L.npmap.map({
      baseLayers: [
        'nps-parkTilesImagery',
        'nps-parkTiles'
      ],
      boxZoom: false,
      div: $parent.find('.pt-map')[0],
      doubleClickZoom: false,
      dragging: false,
      homeControl: false,
      keyboard: false,
      scrollWheelZoom: false,
      smallzoomControl: false,
      touchZoom: false
    });

    if (bounds) {
      map.fitBounds(L.geoJson(bounds).getBounds());
      map.options.center = map.getCenter();
      map.options.zoom = map.getZoom();
    }
  }

  Typeahead = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Typeahead.DEFAULTS, options);
    this._setFilter(this.options);
  };

  Typeahead.VERSION = '0.11.1';
  Typeahead.DEFAULTS = {
    previewMap: true,
    supportEdit: true,
    supportSubmit: true
  };

  Typeahead.prototype._setFilter = function (obj) {
    where = 'WHERE points_of_interest.unit_code=parks.unit_code AND points_of_interest.name IS NOT NULL AND points_of_interest.name ilike \'%25{{query}}%25\'';

    if (obj) {
      var parks = obj.parks;
      var types = obj.types;

      if (parks) {
        parks = parks.split(',');
        where += ' AND (';
        $.each(parks, function (i, park) {
          where += 'points_of_interest.unit_code=\'' + park + '\' AND ';
        });
        where = where.slice(0, where.length - 5) + ')';
      }

      if (types) {
        types = types.split(',');
        where += ' AND (';
        $.each(types, function (i, type) {
          where += 'points_of_interest.type=\'' + type + '\' AND ';
        });
        where = where.slice(0, where.length - 5) + ')';
      }
    }
  };
  Typeahead.prototype.destroy = function () {
    this.$element
      .typeahead('destroy')
      .removeAttr('autocomplete');
    $parent.removeClass('pt-wrapper');
    $editWrapper.remove();
    $lat.remove();
    $lng.remove();
    $mapWrapper.remove();
    $placesId.remove();
    $spinner.remove();
    $type.remove();
  };
  Typeahead.prototype.getMap = function () {
    return map;
  };

  function Plugin (option) {
    if (this.length === 1 && typeof option === 'string') {
      var $this = $(this[0]);
      var data = $this.data('bs.placesTypeahead');
      var options = $.extend({}, Typeahead.DEFAULTS, $this.data(), typeof option === 'object' && option);

      if (!data) {
        $this.data('bs.placesTypeahead', (data = new Typeahead(this[0], options)));
      }

      return data[option]();
    } else {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data('bs.placesTypeahead');
        var options = $.extend({}, Typeahead.DEFAULTS, $this.data(), typeof option === 'object' && option);

        if (!data) {
          $this.data('bs.placesTypeahead', (data = new Typeahead(this, options)));
        }

        if (typeof option === 'string') {
          data[option]();
        } else {
          create(this, data.options);
        }
      });
    }
  }

  old = $.fn.placesTypeahead;
  $.fn.placesTypeahead = Plugin;
  $.fn.placesTypeahead.Constructor = Typeahead;

  // PLACES-TYPEAHEAD NO CONFLICT
  // ===========================

  $.fn.placesTypeahead.noConflict = function () {
    $.fn.placesTypeahead = old;
    return this;
  };

  // PLACES-TYPEAHEAD DATA-API
  // ========================

  $(window).on('load.bs.placesTypeahead.data-api', function () {
    $('.places-typeahead').each(function () {
      var $typeahead = $(this);
      Plugin.call($typeahead, $typeahead.data());
    });
  });
}(jQuery);
