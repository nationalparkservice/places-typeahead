# places-typeahead

[![Circle CI](https://circleci.com/gh/nationalparkservice/places-typeahead.svg?style=svg)](https://circleci.com/gh/nationalparkservice/places-typeahead)

Autocomplete search for the National Park Service's Places system, built as a Bootstrap 3 plugin on top of Twitter's [typeahead.js](https://twitter.github.io/typeahead.js/) library.

## Getting started

Take a look at index.html for a working example of the plugin.

## Browser Support

* Chrome
* Firefox 3.5+
* Safari 4+
* Internet Explorer 8+
* Opera 11+

**NOTE:** places-typeahead is not tested on mobile browsers.

## Issues

Discover a bug? Please [create an issue](https://github.com/nationalparkservice/places-typeahead/issues/new)!

## Versioning

For transparency and insight into our release cycle, releases will be numbered with the following format:

`<major>.<minor>.<patch>`

And constructed with the following guidelines:

* Breaking backwards compatibility bumps the major
* New additions without breaking backwards compatibility bumps the minor
* Bug fixes and misc changes bump the patch

For more information on semantic versioning, please visit [http://semver.org/](http://semver.org/).

## Testing

Tests are written using [Jasmine](http://jasmine.github.io/) and run with [Karma](http://karma-runner.github.io/). To run the test suite with PhantomJS, run `$ npm test`.

## Developers

In order to build and test places-typeahead, you'll need to install its dev dependencies (`$ npm install`) and have [grunt-cli](https://github.com/gruntjs/grunt-cli) installed (`$ npm install -g grunt-cli`). Below is an overview of the available Grunt tasks that'll be useful in development:

* `grunt build` – Builds *places-typeahead* from source.
* `grunt lint` – Runs source and test files through JSHint.
* `grunt watch` – Rebuilds *places-typeahead* whenever a source file is modified.
* `grunt server` – Serves files from the root of *places-typeahead* on localhost:8888. Useful for using *test/playground.html* for debugging/testing.
* `grunt dev` – Runs `grunt watch` and `grunt server` in parallel.
* `grunt places` - Builds a working "site" in the `_site` directory.

## License

Twitter's typeahead.js is licensed under the MIT license.
