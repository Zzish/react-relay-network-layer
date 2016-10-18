/* eslint-disable arrow-body-style, no-unused-vars */
import io from 'socket.io-client';

import queries from './relay/queries';
import queriesBatch from './relay/queriesBatch';
import mutation from './relay/mutation';
import fetchWrapper from './fetchWrapper';


export default class RelayNetworkLayer {
  constructor(middlewares, options) {
    this._options = options;
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    this._supportedOptions = [];

    // socket configuration
    this._socket = io(options.ioUrl, options.ioOptions);
    this._requests = Object.create(null);

    this._socket.on('subscription update', ({ id, data, errors }) => {
      const request = this._requests[id];
      if (errors) {
        request.onError(errors);
      } else {
        request.onNext(data);
      }
    });

    this._socket.on('subscription closed', (id) => {
      const request = this._requests[id];
      if (!request) {
        return;
      }

      console.log(`Subscription ${id} is completed`);
      request.onCompleted();
      delete this._requests[id];
    });

    this._socket.on('error', (error) => {
      Object.values(this._requests).forEach((request) => {
        request.onError(error);
      });
    });

    this._socket.on("disconnect", () => {
        console.log("Socket disconnectedd");
        Object.values(this._requests).forEach((request) => {
          request.onError("disconnect");
        });
    });



    this._middlewares.forEach(mw => {
      if (mw && mw.supports) {
        if (Array.isArray(mw.supports)) {
          this._supportedOptions.push(...mw.supports);
        } else {
          this._supportedOptions.push(mw.supports);
        }
      }
    });
  }

  supports = (...options) => {
    return options.every(option => this._supportedOptions.indexOf(option) !== -1);
  };

  sendQueries = (requests) => {
    if (requests.length > 1 && !this._isBatchQueriesDisabled()) {
      return queriesBatch(requests, this._fetchWithMiddleware);
    }

    return queries(requests, this._fetchWithMiddleware);
  };

  sendMutation = (request) => {
    return mutation(request, this._fetchWithMiddleware);
  };

  sendSubscription(request) {
    const id = request.getClientSubscriptionId();
    this._requests[id] = request;

    this._socket.emit('subscribe', {
      id,
      query: request.getQueryString(),
      variables: request.getVariables(),
    });


    return {
      dispose: () => {
        setTimeout(() => {
            delete this._requests[id];
        }, 1000);
        this._socket.emit('unsubscribe', id);
      },
    };
  }

  _fetchWithMiddleware = (req) => {
    return fetchWrapper(req, this._middlewares);
  };

  _isBatchQueriesDisabled = () => {
    return this._options && this._options.disableBatchQuery;
  };
}
