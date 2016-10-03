import _Object$values from 'babel-runtime/core-js/object/values';
import _Object$create from 'babel-runtime/core-js/object/create';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
/* eslint-disable arrow-body-style, no-unused-vars */
import io from 'socket.io-client';

import queries from './relay/queries';
import queriesBatch from './relay/queriesBatch';
import mutation from './relay/mutation';
import fetchWrapper from './fetchWrapper';

var RelayNetworkLayer = function () {
  function RelayNetworkLayer(middlewares, options) {
    var _this = this;

    _classCallCheck(this, RelayNetworkLayer);

    _initialiseProps.call(this);

    this._options = options;
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    this._supportedOptions = [];

    // socket configuration
    this._socket = io(options.ioUrl, options.ioOptions);
    this._requests = _Object$create(null);

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
      _Object$values(_this._requests).forEach(function (request) {
        request.onError(error);
      });
    });

    this._socket.on("disconnect", function () {
      console.log("Socket disconnectedd");
      _Object$values(_this._requests).forEach(function (request) {
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
        console.log("disposing", id);
        _this2._socket.emit('unsubscribe', id);
      }
    };
  };

  return RelayNetworkLayer;
}();

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
      return queriesBatch(requests, _this3._fetchWithMiddleware);
    }

    return queries(requests, _this3._fetchWithMiddleware);
  };

  this.sendMutation = function (request) {
    return mutation(request, _this3._fetchWithMiddleware);
  };

  this._fetchWithMiddleware = function (req) {
    return fetchWrapper(req, _this3._middlewares);
  };

  this._isBatchQueriesDisabled = function () {
    return _this3._options && _this3._options.disableBatchQuery;
  };
};

export default RelayNetworkLayer;