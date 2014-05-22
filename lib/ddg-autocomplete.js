/*
 * Copyright (C) 2014 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


let { uuid } = require('sdk/util/uuid');

const {Cc,Cu,Ci,Cm} = require("chrome");

const HTTP_OK                    = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY           = 502;
const HTTP_SERVICE_UNAVAILABLE   = 503;

const AWESOMEBAR_COMPONENT_UUID = '{dd1750e1-1e6b-4717-b058-b93aea12879e}';

var {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");
var {NetUtil} = Cu.import("resource://gre/modules/NetUtil.jsm");

function DDGAutocomplete() { }
DDGAutocomplete.prototype = {
  contractID: "@mozilla.org/autocomplete/search;1?name=duckduckgo",
  searchURL: "https://ac.duckduckgo.com/ac/?q=%SEARCH_TERM%&type=list",
  resultsURL: "https://duckduckgo.com/?q=%SEARCH_TERM%",
  _searchString: "",

  startSearch: function(searchString, searchParam, previousResult, listener) {
    this._searchString = searchString;
    this._listener = listener;
    if (!previousResult)
      this._formHistoryResult = null;

    this._request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    var submission = NetUtil.newURI(this.searchURL.replace(/%SEARCH_TERM%/, searchString));
    var method = "GET";
    this._request.open(method, submission.spec, true);

    this._request.onreadystatechange = this.onReadyStateChange.bind(this);
    this._request.send(submission.postData);
  },

  stopSearch: function() {
  //if (this._request) {
  //  this._request.abort();
  //  this._request = null;
  //}
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch]),
  _isBackoffError: function (status) {
    return ((status == HTTP_INTERNAL_SERVER_ERROR) ||
            (status == HTTP_BAD_GATEWAY) ||
            (status == HTTP_SERVICE_UNAVAILABLE));
  },
  _noteServerError: function SAC__noteServeError() {
    if (prefSet.prefs['dev']) console.log("server error");
  },
  onReadyStateChange: function() {
    if (!this._request || this._request.readyState != 4) return;

    try {var status = this._request.status; }
    catch (e) { return; }

    if (this._isBackoffError(status)) {
      this._noteServerError();
      return;
    }

    var responseText = this._request.responseText;
    if (status != HTTP_OK || responseText == "")
      return;

    var serverResults = JSON.parse(responseText);
    var $this = this;

    if (this._listener) {
      var results = new DDGResults(this._searchString);
      var FormatResult = function(aType) {
        return function(aResult) {
          results._results.push({
            value: $this.resultsURL.replace(/%SEARCH_TERM%/, aResult),
            label: $this.resultsURL.replace(/%SEARCH_TERM%/, aResult),
            comment: aResult,
            style: aType,
            image: 'https://duckduckgo.com/favicon.ico'
          });
        };
      };

      serverResults[1].forEach(FormatResult("Answer"));

      this._listener.onSearchResult(this, results);
      this._listener = null;
    }
    this.request = null;
  }
};

function DDGResults(aSearchString, aResult) {
  this.searchString = aSearchString;
  this.searchResult = aResult || Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
  this._results = [];
};

DDGResults.prototype = {
  defaultIndex: 0,
  errorDescription: "",
  get matchCount() { return this._results.length; },
  getValueAt: function(index) { return this._results[index].value; },
  getLabelAt: function(index) { return this._results[index].label; },
  getCommentAt: function(index) { return this._results[index].comment; },
  getStyleAt: function(index) { return this._results[index].style; },
  getImageAt: function(index) { return this._results[index].image; }
}

exports.registerComponent = function(comp) {
  let registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
  if (!comp.prototype.classID) {
    comp.prototype.classID = uuid(AWESOMEBAR_COMPONENT_UUID);
  }
  if (!comp.prototype.factory)
    comp.prototype.factory = getFactory(comp);
  registrar.registerFactory(comp.prototype.classID, "", comp.prototype.contractID, comp.prototype.factory);
}

exports.unregisterComponent = function (comp) {
  let registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
  registrar.unregisterFactory(comp.prototype.classID, comp.prototype.factory);
}

function getFactory(comp) {
  return {
    createInstance: function (outer, iid) {
      if (outer) throw Cr.NS_ERROR_NO_AGGREGATION;
      return (new comp()).QueryInterface(iid);
    }
  }
}

exports.DDGAutocomplete = DDGAutocomplete;
