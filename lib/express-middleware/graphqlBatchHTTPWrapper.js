"use strict";

exports.__esModule = true;

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

exports.default = function (graphqlHTTPMiddleware) {
  return function (req, res) {
    var subResponses = [];
    return _promise2.default.all(req.body.map(function (data) {
      return new _promise2.default(function (resolve) {
        var subRequest = (0, _extends3.default)({
          __proto__: req.__proto__ }, req, {
          body: data
        });
        var subResponse = {
          status: function status(st) {
            this.statusCode = st;
            return this;
          },
          set: function set(headerName, headerValue) {
            this.headers = this.headers || {};
            this.headers[headerName] = headerValue;
            console.log("headerNameheaderName", headerName, headerValue, this);
            return this;
          },
          send: function send(payload) {
            resolve({ status: this.statusCode, id: data.id, payload: payload, headers: this.headers });
          },


          // support express-graphql@0.5.2
          setHeader: function setHeader() {
            return this;
          },
          header: function header() {},
          write: function write(payload) {
            this.payload = payload;
          },
          end: function end(payload) {
            // support express-graphql@0.5.4
            if (payload) {
              this.payload = payload;
            }
            resolve({ status: this.statusCode, id: data.id, payload: this.payload, headers: this.headers });
          }
        };
        subResponses.push(subResponse);
        graphqlHTTPMiddleware(subRequest, subResponse);
      });
    })).then(function (responses) {
      var response = '';
      console.log("responseresponseresponse", responses);
      responses.forEach(function (_ref, idx) {
        var status = _ref.status;
        var headers = _ref.headers;
        var id = _ref.id;
        var payload = _ref.payload;

        if (status) {
          res.status(status);
        }
        if (headers) {
          for (var headerName in headers) {
            if (headers.hasOwnProperty(headerName)) {
              console.log("calling set on res", headerName, headers[headerName]);
              res.set(headerName, headers[headerName]);
            }
          }
        }
        var comma = responses.length - 1 > idx ? ',' : '';
        response += "{ \"id\":\"" + id + "\", \"payload\":" + payload + " }" + comma;
      });
      res.set('Content-Type', 'application/json');
      res.send("[" + response + "]");
    }).catch(function (err) {
      res.status(500).send({ error: err.message });
    });
  };
};

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];