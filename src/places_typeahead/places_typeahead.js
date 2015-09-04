/* globals Bloodhound, Handlebars, jQuery, L, NPMap */

// TODO: Make fetch configurable.
// FIX: Change limit on CartoDB query to five and no results display.
// FIX: This query "bodie" returns results, but they don't display.

+function ($) {
  'use strict';

  var url = 'https://nps.cartodb.com/api/v2/sql?q=SELECT points_of_interest.name as n,points_of_interest.places_id as i,parks.full_name as f,parks.unit_code as u,st_y(points_of_interest.the_geom) as y,st_x(points_of_interest.the_geom) as x,points_of_interest.type as t FROM points_of_interest,parks {{where}} ORDER BY points_of_interest.name,parks.full_name LIMIT(10)';
  // var urlFetch = 'https://nps.cartodb.com/api/v2/sql?q=SELECT points_of_interest.name as n,points_of_interest.places_id as i,st_y(points_of_interest.the_geom) as y,st_x(points_of_interest.the_geom) as x,points_of_interest.type as t FROM points_of_interest,parks {{where}} ORDER BY points_of_interest.name,parks.full_name';
  var $help;
  var $lat;
  var $lng;
  var $mapWrapper;
  var $modal;
  var $parent;
  var $placesId;
  var $spinner;
  var $type;
  var map;
  var marker;
  var old;
  var Typeahead;
  var where;
  var whereFetch;

  function clear () {
    var options = map.options;

    if (marker) {
      map.removeLayer(marker);
    }

    map.setView(options.center, options.zoom);
    $help.html('Nothing selected.')
    $parent
      .children('input:hidden').val(null);
  }
  function create (element, options) {
    var $element = $(element);

    function callback () {
      $parent = $element.parent();
      $parent.addClass('pt-wrapper');
      $element
        .attr('autocomplete', 'false')
        .after('' +
          '<i class="fa fa-lg fa-spin fa-spinner"></i>' +
          '<p class="help-block">Nothing selected.</p>' +
          '<input name="lat" type="hidden">' +
          '<input name="lng" type="hidden">' +
          '<input name="places_id" type="hidden">' +
          '<input name="type" type="hidden">' +
          '<div class="pt-map-wrapper row">' +
            '<div class="col-md-12">' +
              '<div class="pt-map"></div>' +
            '</div>' +
          '</div>' +
        '')
        .on('input', clear)
        .typeahead({
          highlight: true,
          valueKey: 'name'
        }, {
          async: true,
          display: 'name',
          name: 'points_of_interest',
          source: new Bloodhound({
            datumTokenizer: function (datum) {
              return Bloodhound.tokenizers.whitespace(datum.name);
            },
            identify: function (obj) {
              console.log(obj);
              return obj.places_id;
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            /*
            prefetch: (typeof options === 'object' && typeof options.parks === 'string' ? {
              cache: false,
              url: urlFetch.replace('{{where}}', whereFetch)
            } : undefined),
            remote: (typeof options !== 'object' || typeof options.parks !== 'string' ? {
              filter: function (response) {
                return $.map(response.rows, function (row) {
                  return {
                    lat: row.y,
                    lng: row.x,
                    name: row.n,
                    park: row.f,
                    places_id: row.i,
                    type: row.t,
                    unit_code: row.u
                  };
                });
              },
              replace: function (url, query) {
                return url.replace('{{query}}', query.replace(/'/g, '\'\''));
              },
              url: url.replace('{{where}}', where),
              wildcard: '{{query}}'
            } : undefined)
            */
            remote: {
              filter: function (response) {
                return $.map(response.rows, function (row) {
                  return {
                    lat: row.y,
                    lng: row.x,
                    name: row.n,
                    park: row.f,
                    places_id: row.i,
                    type: row.t,
                    unit_code: row.u
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
              return $('' +
                '<div class="tt-suggestion">Can\'t find a location? Click here to add it to Places.</div>' +
              '').click(function () {
                $parent.append('<div class="modal pt-submit">' +
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
                $modal = $($parent.find('.pt-submit')[0]);
                $modal.modal({
                  backdrop: 'static',
                  keyboard: false
                });
              });
            },
            suggestion: Handlebars.compile('' +
              '<div>' +
                '<strong>{{name}}</strong><br><span class="no-highlight"><em>{{#if type}}{{type}}</em> in {{/if}}<em>{{park}}</em></span>' +
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
          marker = new L.Marker(latLng, {
            clickable: false
          }).addTo(map);
          map.setView(latLng, 18);
          $lat.val(val.lat);
          $lng.val(val.lng);
          $placesId.val(val.places_id);
          $type.val(val.type);
          $help.html('<em>"' + val.type + '"</em> in <em>"' + val.park + '"</em>. Something look incorrect? Fix it with <a href="http://insidemaps.nps.gov/places/edit/#background=mapbox-satellite&id=' + val.places_id + '&map=19.00/' + latLng.lng + '/' + latLng.lat + '&overlays=park-tiles-overlay" target="_blank">Places Editor</a>.');
        });

      $help = $($parent.find('.help-block')[0]);
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
      $.ajax({
        cache: true,
        dataType: 'script',
        success: callback,
        type: 'GET',
        url: 'http://www.nps.gov/lib/npmap.js/2.0.0/npmap.min.js'
      });
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

    setTimeout(function () {
      map.invalidateSize();
    }, 300);
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
    whereFetch = 'WHERE points_of_interest.unit_code=parks.unit_code AND points_of_interest.name IS NOT NULL';

    if (obj) {
      var parks = obj.parks;
      var types = obj.types;
      var add;

      if (parks) {
        add = ' AND (';
        parks = parks.split(',');
        where += add;
        whereFetch += add;
        $.each(parks, function (i, park) {
          add = 'points_of_interest.unit_code=\'' + park + '\' AND ';
          where += add;
          whereFetch += add;
        });
        where = where.slice(0, where.length - 5) + ')';
        whereFetch = whereFetch.slice(0, whereFetch.length - 5) + ')';
      }

      if (types) {
        add = ' AND (';
        types = types.split(',');
        where += add;
        whereFetch += add;
        $.each(types, function (i, type) {
          add = 'points_of_interest.type=\'' + type + '\' AND ';
          where += add;
          whereFetch += add;
        });
        where = where.slice(0, where.length - 5) + ')';
        whereFetch = whereFetch.slice(0, whereFetch.length - 5) + ')';
      }
    }
  };
  Typeahead.prototype.destroy = function () {
    this.$element
      .typeahead('destroy')
      .removeAttr('autocomplete');
    $parent.removeClass('pt-wrapper');
    $help.remove();
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

/*

// TODO: Make the filter button configurable.

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
*/
