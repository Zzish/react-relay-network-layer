import _extends from 'babel-runtime/helpers/extends';
import _Promise from 'babel-runtime/core-js/promise';
export default function (graphqlHTTPMiddleware) {
  return function (req, res) {
    var subResponses = [];
    return _Promise.all(req.body.map(function (data) {
      return new _Promise(function (resolve) {
        var subRequest = _extends({
          __proto__: req.__proto__ }, req, {
          body: data
        });
        var subResponse = {
          status: function status(st) {
            this.statusCode = st;return this;
          },
          set: function set() {
            return this;
          },
          send: function send(payload) {
            resolve({ status: this.statusCode, id: data.id, payload: payload });
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
            resolve({ status: this.statusCode, id: data.id, payload: this.payload });
          }
        };
        subResponses.push(subResponse);
        graphqlHTTPMiddleware(subRequest, subResponse);
      });
    })).then(function (responses) {
      var response = '';
      responses.forEach(function (_ref, idx) {
        var status = _ref.status;
        var id = _ref.id;
        var payload = _ref.payload;

        if (status) {
          res.status(status);
        }
        var comma = responses.length - 1 > idx ? ',' : '';
        response += '{ "id":"' + id + '", "payload":' + payload + ' }' + comma;
      });
      res.set('Content-Type', 'application/json');
      res.send('[' + response + ']');
    }).catch(function (err) {
      res.status(500).send({ error: err.message });
    });
  };
}