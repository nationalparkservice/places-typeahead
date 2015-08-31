/* globals $ */

(function () {
  var $parks = $('#configure-park');
  var $previewTab = $('a[aria-controls="preview"]');
  var $types = $('#configure-type');
  var url = 'https://nps.cartodb.com/api/v2/sql?q=';

  $previewTab.on('shown.bs.tab', function (e) {
    var map = $('#places-typeahead').placesTypeahead('getMap');

    if (typeof map === 'object') {
      map.invalidateSize();
    }
  });
  $('#configure form').submit(function () {
    var park = $parks.val();
    var type = $types.val();
    var filter;

    $previewTab.tab('show');

    if (type === 'all') {
      filter = 'All types';
    } else {
      filter = '"' + type + '"';
    }

    filter += ' in ';

    if (park === 'all') {
      filter += 'all parks';
    } else {
      filter += '"' + $('#configure-park option:selected').text() + '"';
    }

    $('#places-typeahead')
      .val(null)
      .placesTypeahead('destroy');
    $('#places-typeahead').placesTypeahead({
      parks: park === 'all' ? null : park,
      types: type === 'all' ? null : type
    });
    $('.bg-info').html(filter);
    $('#code-example').html('' +
      '&lt;div class="form-group"&gt;\n' +
        '  &lt;label for="places-typeahead">Start typing the name of a place to search for a point of interest.&lt;/label&gt;\n' +
        '  &lt;input class="form-control places-typeahead"' + (park === 'all' ? '' : ' data-parks="' + park + '"') + (type === 'all' ? '' : ' data-types="' + type + '"') + ' id="places-typeahead" placeholder="e.g., abo visitor center, old faithful, macarthur meadow..." type="text"&gt;\n' +
      '&lt;/div&gt;' +
    '');
    return false;
  });
  $.getJSON(url + 'SELECT full_name,unit_code FROM parks WHERE the_geom IS NOT NULL ORDER BY full_name', function (response) {
    $.each(response.rows, function (i, row) {
      $parks.append('' +
        '<option value="' + row.unit_code + '">' + row.full_name + '</option>' +
      '');
    });
  });
  $.getJSON(url + 'SELECT DISTINCT type FROM points_of_interest ORDER BY type', function (response) {
    $.each(response.rows, function (i, row) {
      var type = row.type;

      if (type) {
        $types.append('' +
          '<option>' + type + '</option>' +
        '');
      }
    });
  });
})();
