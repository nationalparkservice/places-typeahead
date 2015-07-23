Files:
-------
* geojson2osm.html - A test application for the geojson2osm tool
* geojson2osm.js - Modified code from a project called geojson2osm that creates osm changesets from geojson
* index.html - This is the main screen that does the auth and the uploading
* osmauth.js - This is the tool that does the osm authentication, it is mostly the same as the one we use in iD 
* uploadGeojson.js - This is a single script that opens a changeset, adds data to the changeset, and closes that changeset


Quick Guide:
-------------------
This requires the file at http://insidemaps.nps.gov/dist_dev/land2.html to be modified.
The Line:
`caller.postMessage(window.location.href, 'http://10.147.153.192:5001');`

Needs to be changed with the URL to the server where you are hosting the index.html

1. Navigate to the index.html
2. Login through the interface
3. Create a geojson object in the console:
`var gj = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "nps:preset": "Showers"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -110.5568790435791,
          44.39989293784588
        ]
      }
    }
  ]
}`
_Note in the properties that you can add an "nps:preset"_
These come from: https://docs.google.com/spreadsheets/d/1sQZRUZDe8vPu8PANxoIc5k0Pv85xNd5ae4uGJ0fwEt0/edit#gid=1063193272 and are case sensitive
4. In the console run the command: uploadGeojson(gj);
5. Check in places to see your object
6. You probably want to delete it at this point



