'use strict';

exports.__esModule = true;

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _create = require('babel-runtime/core-js/object/create');

var _create2 = _interopRequireDefault(_create);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _queries = require('./relay/queries');

var _queries2 = _interopRequireDefault(_queries);

var _queriesBatch = require('./relay/queriesBatch');

var _queriesBatch2 = _interopRequireDefault(_queriesBatch);

var _mutation = require('./relay/mutation');

var _mutation2 = _interopRequireDefault(_mutation);

var _fetchWrapper = require('./fetchWrapper');

var _fetchWrapper2 = _interopRequireDefault(_fetchWrapper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RelayNetworkLayer = function () {
  function RelayNetworkLayer(middlewares, options) {
    var _this = this;

    (0, _classCallCheck3.default)(this, RelayNetworkLayer);

    _initialiseProps.call(this);

    this._options = options;
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    this._supportedOptions = [];

    // socket configuration
    this._socket = (0, _socket2.default)(options.ioUrl, options.ioOptions);
    this._requests = (0, _create2.default)(null);

    this._socket.on('subscription update', function (_ref) {
      var id = _ref.id;
      var data = _ref.data;
      var errors = _ref.errors;

      var request = _this._requests[id];
      if (errors) {
        request.onError(errors);
      } else {
        request.onNext(data);
      }
    });

    this._socket.on('subscription closed', function (id) {
      var request = _this._requests[id];
      if (!request) {
        return;
      }

      console.log('Subscription ' + id + ' is completed');
      request.onCompleted();
      delete _this._requests[id];
    });

    this._socket.on('error', function (error) {
      (0, _values2.default)(_this._requests).forEach(function (request) {
        request.onError(error);
      });
    });

    this._socket.on("disconnect", function () {
      console.log("Socket disconnectedd");
      (0, _values2.default)(_this._requests).forEach(function (request) {
        request.onError("disconnect");
      });
    });

    this._middlewares.forEach(function (mw) {
      if (mw && mw.supports) {
        if (Array.isArray(mw.supports)) {
          var _supportedOptions;

          (_supportedOptions = _this._supportedOptions).push.apply(_supportedOptions, mw.supports);
        } else {
          _this._supportedOptions.push(mw.supports);
        }
      }
    });
  }

  RelayNetworkLayer.prototype.sendSubscription = function sendSubscription(request) {
    var _this2 = this;

    var id = request.getClientSubscriptionId();
    this._requests[id] = request;

    this._socket.emit('subscribe', {
      id: id,
      query: request.getQueryString(),
      variables: request.getVariables()
    });

    return {
      dispose: function dispose() {
        setTimeout(function () {
          delete _this2._requests[id];
        }, 1000);
        _this2._socket.emit('unsubscribe', id);
      }
    };
  };

  return RelayNetworkLayer;
}(); /* eslint-disable arrow-body-style, no-unused-vars */


var _initialiseProps = function _initialiseProps() {
  var _this3 = this;

  this.supports = function () {
    for (var _len = arguments.length, options = Array(_len), _key = 0; _key < _len; _key++) {
      options[_key] = arguments[_key];
    }

    return options.every(function (option) {
      return _this3._supportedOptions.indexOf(option) !== -1;
    });
  };

  this.sendQueries = function (requests) {
    if (requests.length > 1 && !_this3._isBatchQueriesDisabled()) {
      return (0, _queriesBatch2.default)(requests, _this3._fetchWithMiddleware);
    }

    return (0, _queries2.default)(requests, _this3._fetchWithMiddleware);
  };

  this.sendMutation = function (request) {
    return (0, _mutation2.default)(request, _this3._fetchWithMiddleware);
  };

  this._fetchWithMiddleware = function (req) {
    return (0, _fetchWrapper2.default)(req, _this3._middlewares);
  };

  this._isBatchQueriesDisabled = function () {
    return _this3._options && _this3._options.disableBatchQuery;
  };
};

exports.default = RelayNetworkLayer;
module.exports = exports['default'];