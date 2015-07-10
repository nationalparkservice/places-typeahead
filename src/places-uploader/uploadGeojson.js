/* exported uploadGeojson */
/* globals auth, geojson2osm, iD */
var uploadGeojson = function(geojson) {
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
    }, function(err, result) {
      if (result) {

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
        }, function(e, r) {
          console.log('e', e, 'r', r);

          // Close the changeset
          auth.xhr({
            'method': 'PUT',
            'path': '/api/0.6/changeset/' + changeset.id + '/close'
          }, function(e, r) {
            console.log('e', e, 'r', r);
          });
        });
      }
    });
};
