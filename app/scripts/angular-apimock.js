/* Create the main module, 'apiMock'. It's the one that needs to be included in
   other projects. */
angular.module('apiMock', [])

.config(function ($httpProvider) {
/* This is where the magic happens. Configure $httpProvider to use our
   httpInterceptor on all calls. It's what allows us to do automatic routing. */
  $httpProvider.interceptors.push('httpInterceptor');
})

.provider('apiMock', function () {
/* This is the default implementation of apiMock. It's driven by the maintainers
   goals, but can be overriden in apiMock.config(). The members are:
   'isApiPath' function: takes a `request` object and decides if the path
                         should be rerouted. Default: Checks the requested
                         URL for `apiPath` and returns true if it's the
                         beginning of the path.
   'reroutePath' function: takes a `request` object and replaces the URL with
                           the routed path. Default: Simply replaces `apiPath`
                           with `mockDataPath`, but adds the HTTP verb and
                           `.json` at the end of the path. A GET request to
                           '/api/user/5' turns into '/api/user/5.get.json'.
   'isGlobalMock' function: decides if mocking is enabled. Default: Checks
                           `$location` for a `apimock` variable and that it's set
                           to `true`.
   'isLocalMock' function: takes a `request` object and decides if mocking is
                           overriden. Default: checks the request object for a
                           `apimock` property set to `true`.
   'mockDataPath' string: the path to be rerouted to. Default: '/mock_data'.
   'apiPath' string: the path to be rerouted from. Default: '/api'. */

  var mockDataPath = '/mock_data';
  var apiPath = '/api';
  var $location;

  function ApiMock(_$location) {
    $location = _$location;
  }

  var p = ApiMock.prototype;

  p.shouldMock = function (req) {
    return (this._isGlobalMock() || this._isLocalMock(req)) && this._isApiPath(req);
  };

  p.doMock = function (req) {
    // replace apiPath with mockDataPath.
    var path = req.url.substring(config.apiPath.length);
    req.url = config.mockDataPath + path;

    // strip query strings (like ?search=banana).
    var regex = /[a-zA-z0-9/.\-]*/;
    req.url = regex.exec(req.url)[0];

    // add file endings (method verb and .json).
    if (req.url[req.url.length-1] === '/') {
      req.url = req.url.slice(0, -1);
    }
    req.url += '.' + req.method.toLowerCase() + '.json';
  };

  p._isApiPath = function (req) {
    return req.url.indexOf(config.apiPath) === 0;
  };

  p._isLocalMock = function (req) {
    return !!req.apiMock;
  };

  p._isGlobalMock = function () {
    var regex = /apimock/i;
    var found = false;

    angular.forEach($location.search(), function(value, key) {
      if (regex.test(key)) {
        // Update $location object with primitive boolean compatibility in case if string type.
        if (value === true || angular.lowercase(value) === 'true') {
          found = true;
          $location.search(key, null);
          $location.search('apimock', true);
        }
      }
    });

    return found;
  };

  var config = {
    mockDataPath: mockDataPath,
    apiPath: apiPath
  };

  this.config = function (options) {
    angular.extend(config, options);
  };

  this.$get = function ($location) {
    return new ApiMock($location);
  };
})

.service('httpInterceptor', function($q, apiMock) {
/* The main service. Is jacked in as a interceptor on $http so it gets called
   on every http call. This allows us to do our magic. */
  this.request = function (req) {
    if (req && apiMock.shouldMock(req)) {
      apiMock.doMock(req);
    }

    return req || $q.when(req);
  };
});
