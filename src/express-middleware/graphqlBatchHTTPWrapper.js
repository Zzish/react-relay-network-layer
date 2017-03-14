export default function (graphqlHTTPMiddleware) {
  return (req, res) => {
    const subResponses = [];
    return Promise.all(
      req.body.map(
        data =>
          new Promise(resolve => {
            const subRequest = {
              __proto__: req.__proto__, // eslint-disable-line
              ...req,
              body: data,
            };
            const subResponse = {
              status(st) {
                this.statusCode = st;
                return this;
              },
              set(headerName, headerValue) {
                this.headers = this.headers || {};
                this.headers[headerName] = headerValue;
                return this;
              },
              send(payload) {
                resolve({ status: this.statusCode, id: data.id, payload, headers: this.headers });
              },

              // support express-graphql@0.5.2
              setHeader() {
                return this;
              },
              header() {},
              write(payload) {
                this.payload = payload;
              },
              end(payload) {
                // support express-graphql@0.5.4
                if (payload) {
                  this.payload = payload;
                }
                resolve({ status: this.statusCode, id: data.id, payload: this.payload, headers: this.headers });
              },
            };
            subResponses.push(subResponse);
            graphqlHTTPMiddleware(subRequest, subResponse);
          }),
      ),
    )
      .then(responses => {
        let response = '';
        responses.forEach(({ status, headers, id, payload }, idx) => {
          if (status) {
            res.status(status);
          }
          if (headers) {
            for (var headerName in headers) {
                if (headers.hasOwnProperty(headerName)) {
                    res.set(headerName, headers[headerName]);
                }
            }
          }
          const comma = responses.length - 1 > idx ? ',' : '';
          response += `{ "id":"${id}", "payload":${payload} }${comma}`;
        });
        res.set('Content-Type', 'application/json');
        res.send(`[${response}]`);
      })
      .catch(err => {
        res.status(500).send({ error: err.message });
      });
  };
}
