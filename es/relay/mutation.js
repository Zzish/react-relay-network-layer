import _Object$keys from 'babel-runtime/core-js/object/keys';
import _JSON$stringify from 'babel-runtime/core-js/json/stringify';
import _Object$assign from 'babel-runtime/core-js/object/assign';
/* eslint-disable no-param-reassign, no-use-before-define, prefer-template */

import formatRequestErrors from '../formatRequestErrors';

export default function mutation(relayRequest, fetchWithMiddleware) {
  var req = {
    method: 'POST',
    relayReqId: Date.now(),
    relayReqObj: relayRequest,
    relayReqType: 'mutation'
  };

  if (_hasFiles(relayRequest)) {
    _Object$assign(req, _mutationWithFiles(relayRequest));
  } else {
    _Object$assign(req, _mutation(relayRequest));
  }

  return fetchWithMiddleware(req).then(function (payload) {
    if (payload.hasOwnProperty('errors')) {
      var error = new Error('Server request for mutation `' + relayRequest.getDebugName() + '` ' + 'failed for the following reasons:\n\n' + formatRequestErrors(relayRequest, payload.errors));
      error.source = payload;
      relayRequest.reject(error);
    } else {
      relayRequest.resolve({ response: payload.data });
    }
  }).catch(function (error) {
    return relayRequest.reject(error);
  });
}

function _hasFiles(relayRequest) {
  return !!(relayRequest.getFiles && relayRequest.getFiles());
}

function _mutationWithFiles(relayRequest) {
  var req = {
    headers: {}
  };

  if (_hasFiles(relayRequest)) {
    (function () {
      var files = relayRequest.getFiles();

      if (!global.FormData) {
        throw new Error('Uploading files without `FormData` not supported.');
      }
      var formData = new FormData();
      formData.append('query', relayRequest.getQueryString());
      formData.append('variables', _JSON$stringify(relayRequest.getVariables()));
      _Object$keys(files).forEach(function (filename) {
        formData.append(filename, files[filename]);
      });
      req.body = formData;
    })();
  }

  return req;
}

function _mutation(relayRequest) {
  var req = {
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json'
    }
  };

  req.body = _JSON$stringify({
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables()
  });

  return req;
}