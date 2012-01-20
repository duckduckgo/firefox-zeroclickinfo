var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

const HTTP_OK                    = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY           = 502;
const HTTP_SERVICE_UNAVAILABLE   = 503;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

function loadIntoWindow(window) {
  if (!window) return;

  let urlbar = window.document.getElementById("urlbar");
  if (!urlbar) urlbar = window.document.getElementById("urlbar-edit");
  if (urlbar) {
    let oldSearch = urlbar.getAttribute("autocompletesearch");
    urlbar.setAttribute("autocompletesearch", oldSearch + " duckduckgo");
    urlbar.mSearchNames = null;
  }
}

function unloadFromWindow(window) {
  if (!window) return;

  let urlbar = window.document.getElementById("urlbar");
  if (!urlbar) urlbar = window.document.getElementById("urlbar-edit");
  if (urlbar) {
    let oldSearch = urlbar.getAttribute("autocompletesearch");
    urlbar.setAttribute("autocompletesearch", oldSearch.replace(" duckduckgo", ""));
    urlbar.mSearchNames = null;
  }
}

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

function startup(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  let enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    loadIntoWindow(win);
  }
  wm.addListener(windowListener);

  let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  let alias = Services.io.newFileURI(aData.installPath);
  if (!aData.installPath.isDirectory())
    alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
  resource.setSubstitution("ddg", alias);

  var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  var uri = NetUtil.newURI("resource://ddg/ddg.css");
  sss.loadAndRegisterSheet(uri, sss.USER_SHEET);

  registerComponent(DDGAutocomplete);
}

function install() {
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) return;
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  wm.removeListener(windowListener);
  let enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    unloadFromWindow(win);
  }

  let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  resource.setSubstitution("ddg", null);

  var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  var uri = NetUtil.newURI("resource://ddg/ddg.css");
  sss.unregisterSheet(uri, sss.USER_SHEET);

  unregisterComponent(DDGAutocomplete);
}

function uninstall() {
}

function DDGAutocomplete() { }
DDGAutocomplete.prototype = {
  contractID: "@mozilla.org/autocomplete/search;1?name=duckduckgo",
  searchURL: "http://api.duckduckgo.com/%SEARCH_TERM%&format=json",
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
    if (this._request) {
      this._request.abort();
      this._request = null;
    }
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch]),
  _isBackoffError: function (status) {
    return ((status == HTTP_INTERNAL_SERVER_ERROR) ||
            (status == HTTP_BAD_GATEWAY) ||
            (status == HTTP_SERVICE_UNAVAILABLE));
  },
  _noteServerError: function SAC__noteServeError() {
    console.log("server error");
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
    if (this._listener) {
      var results = new DDGResults(serverResults.Heading || this._searchString);
      var FormatResult = function(aType) {
        return function(aResult) {
          results._results.push({
            value: aResult.FirstURL,
            label: aResult.CustomLabel || aResult.FirstURL,
            comment: aResult.Text,
            style: aType,
            image: aResult.Icon ? aResult.Icon.URL : aResult.Image
          });
        };
      };
      if (serverResults.Answer) {
        FormatResult("Answer")({
          FirstURL: this.searchURL.replace(/%SEARCH_TERM%/, this._searchString),
          Text: serverResults.Answer,
          Icon: { URL: serverResults.Image }
        });
      }
      if (serverResults.DefinitionURL) {
        let title = serverResults.DefinitionSource || "Definition";
        FormatResult("Definition")({
          FirstURL: serverResults.DefinitionURL,
          Text: title + " - " + serverResults.Definition,
          Icon: { URL: serverResults.Image },
          CustomLabel: serverResults.Definition
        });
      }
      if (serverResults.AbstractURL) {
        let title = serverResults.AbstractSource || "Info";
        FormatResult("Abstract")({
          FirstURL: serverResults.AbstractURL,
          Text: title + " - " + serverResults.AbstractText,
          Icon: { URL: serverResults.Image },
          CustomLabel: serverResults.AbstractText
        });
      }
      serverResults.Results.forEach(FormatResult("Search"));
      serverResults.RelatedTopics.forEach(FormatResult("Similar"));
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

function registerComponent(comp) {
  let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
  if (!comp.prototype.classID) {
    let uuidgen = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
    comp.prototype.classID = uuidgen.generateUUID();
  }
  if (!comp.prototype.factory)
    comp.prototype.factory = getFactory(comp);
  registrar.registerFactory(comp.prototype.classID, "", comp.prototype.contractID, comp.prototype.factory);
}

function unregisterComponent(comp) {
  let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
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