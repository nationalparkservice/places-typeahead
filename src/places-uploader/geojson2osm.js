/* exported geojson2osm */
var geojson2osm = function (geojson, changeset, presets) {
  var intersection = function intersection (arrayA, arrayB) {
    var returnValue = 0;
    for (var i = 0; i < arrayB.length; i++) {
      if (arrayA.indexOf(arrayB[i]) >= 0) returnValue++;
    }
    return returnValue;
  };
  var roundCoords = function roundCoords (coords) {
    for (var a = 0; a < coords.length; a++) {
      coords[a][0] = Math.round(coords[a][0] * 1000000) / 1000000;
      coords[a][1] = Math.round(coords[a][1] * 1000000) / 1000000;
    }
    return coords;
  };
  var propertiesToTags = function propertiesToTags (properties, geometry) {
    var tags = '';
    var newTags = {};

    if (presets && properties['nps:preset']) {
      // Find that preset
      for (var preset in presets) {
        if (intersection(presets[preset].geometry, geometry) && presets[preset].name === properties['nps:preset']) {
          newTags = presets[preset].tags;
          break;
        }
      }
      delete properties['nps:preset'];
    }

    for (var newTag in newTags) {
      properties[newTag] = newTags[newTag] === '*' ? 'yes' : newTags[newTag];
    }

    // TODO: Add unit code
    // This will require changing this from sync to async
    // Maybe have this added elsewhere?

    for (var tag in properties) {
      if (properties[tag] !== null) {
        tags += '<tag k="' + tag + '" v="' + properties[tag] + '"/>';
      }
    }
    return tags;
  };
  var count = -1;
  var Point = function Point (geo, properties) {
    var nodes = '';
    var coord = roundCoords([geo.coordinates]);
    nodes += '<node id="' + count + '" lat="' + coord[0][1] + '" lon="' + coord[0][0] + '" changeset="' + changeset + '">';
    nodes += propertiesToTags(properties, ['point', 'vertex']);
    nodes += '</node>';
    count--;
    return {
      nodes: nodes
    };
  };
  var LineString = function LineString (geo, properties) {
    var nodes = '',
      ways = '';
    var coords = [];
    ways += '<way id="' + count + '" changeset="' + changeset + '">';
    count--;
    for (var i = 0; i <= geo.coordinates.length - 1; i++) {
      coords.push([geo.coordinates[i][1], geo.coordinates[i][0]]);
    }
    coords = createNodes(coords, false);
    nodes += coords.nodes;
    ways += coords.nds;
    ways += propertiesToTags(properties, ['line', 'area']);
    ways += '</way>';
    return {
      nodes: nodes,
      ways: ways
    };
  };
  var MultiLineString = function MultiLineString (geo, properties) {
    var nodes = '';
    var ways = '';

    var coords = [];
    ways += '<way id="' + count + '" changeset="' + changeset + '">';
    count--;

    for (var i = 0; i <= geo.coordinates[0].length - 1; i++) {
      coords.push([geo.coordinates[0][i][1], geo.coordinates[0][i][0]]);
    }
    coords = createNodes(coords, false);
    nodes += coords.nodes;
    ways += coords.nds;
    ways += propertiesToTags(properties, ['line', 'area']);
    ways += '</way>';
    return {
      nodes: nodes,
      ways: ways
    };
  };
  var Polygon = function Polygon (geo, properties) {
    var nodes = '';
    var ways = '';
    var coords = [];
    ways += '<way id="' + count + '" changeset="' + changeset + '">';
    count--;

    for (var i = 0; i <= geo.coordinates[0].length - 1; i++) {
      coords.push([geo.coordinates[0][i][1], geo.coordinates[0][i][0]]);
    }
    coords = createNodes(coords, false);
    nodes += coords.nodes;
    ways += coords.nds;
    ways += propertiesToTags(properties, ['line', 'area']);
    ways += '</way>';
    return {
      nodes: nodes,
      ways: ways
    };
  };
  var createNodes = function createNodes (coords, repeatLastND) {
    var nds = '';
    var nodes = '';
    var length = coords.length;
    repeatLastND = repeatLastND || false;
    coords = roundCoords(coords);
    for (var a = 0; a < length; a++) {
      if (hash.hasOwnProperty(coords[a])) {
        nds += '<nd ref="' + hash[coords[a]] + '"/>';
      } else {
        hash[coords[a]] = count;
        if (repeatLastND && a === 0) {
          repeatLastND = count;
        }
        nds += '<nd ref="' + count + '"/>';
        nodes += '<node id="' + count + '" lat="' + coords[a][0] + '" lon="' + coords[a][1] + '" changeset="' + changeset + '"/>';

        if (repeatLastND && a === length - 1) {
          nds += '<nd ref="' + repeatLastND + '"/>';
        }
      }
      count--;
    }
    return {
      'nds': nds,
      'nodes': nodes
    };
  };
  var togeojson = function togeojson (geo, properties) {
    if (typeof geo === 'string') geo = JSON.parse(geo);
    var nodes = '';
    var ways = '';
    var relations = '';
    var append = function append (obj) {
      nodes += obj.nodes || '';
      ways += obj.ways || '';
      relations += obj.relations || '';
    };

    properties = properties || {};
    switch (geo.type) {
      case 'Point':
        append(new Point(geo, properties));
        break;
      case 'MultiPoint':
        break;
      case 'LineString':
        append(new LineString(geo, properties)); // if polygon is made with LineString,this working too.
        break;
      case 'MultiLineString':
        append(new MultiLineString(geo, properties));
        break;
      case 'Polygon':
        append(new Polygon(geo, properties));
        break;
      case 'MultiPolygon':
        break;
    }

    return {
      nodes: nodes,
      ways: ways,
      relations: relations
    };
  };
  var hash = {};
  var osmFile = '';
  changeset = changeset || 'false';

  if (typeof geojson === 'string') geojson = JSON.parse(geojson);
  switch (geojson.type) {
    case 'FeatureCollection':
      var temp = {
        nodes: '',
        ways: '',
        relations: ''
      };
      var obj = [];
      for (var i = 0; i < geojson.features.length; i++) {
        obj.push(togeojson(geojson.features[i].geometry, geojson.features[i].properties));
      }
      for (var n = 0; n < obj.length; n++) {
        temp.nodes += obj[n].nodes;
        temp.ways += obj[n].ways;
        temp.relations += obj[n].relations;
      }
      temp.osm = '<osmChange version="0.3" generator="geojson2osmChangeset"><create>';
      var types = ['nodes', 'ways', 'relations'];
      for (var j = 0; j < types.length; j++) {
        temp.osm += temp[types[j]] || '';
      }
      temp.osm += '</create><modify/><delete if-unused="true"/></osmChange>';
      osmFile = temp.osm;
      break;
    default:
      console.log('default');
      break;
  }
  return osmFile;
};

