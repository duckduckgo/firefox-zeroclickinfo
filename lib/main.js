// Import the APIs we need.
var contextMenu = require("context-menu");
var xhr = require("xhr");

var data = require("self").data;
var us = require("userstyles");
var pageMod = require("page-mod");
var Request = require("request").Request;

const {Cc,Cu,Ci,Cm} = require("chrome");

var {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");
var {NetUtil} = Cu.import("resource://gre/modules/NetUtil.jsm");

const HTTP_OK                    = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY           = 502;
const HTTP_SERVICE_UNAVAILABLE   = 503;



var popupPanel = require("panel").Panel({
  contentURL: data.url("html/popup.html"),
  contentScriptFile: data.url("js/popup.js"),
  contentScriptWhen: "ready",
  height: 60,
  width: 520
});

popupPanel.on('show', function() {
    popupPanel.port.emit('opened', true);
});

var tabs = require("tabs");
popupPanel.port.on('open-ddg', function(url){
    console.log(url);
    tabs.open({
        url: url 
    });    
    popupPanel.hide();
});

popupPanel.port.on('swap-default', function(def){
    //console.log(def);
    var contentPrefService = require("preferences-service");
    if (def == true){
        contentPrefService.set("keyword.URL", "https://duckduckgo.com/?q=");
    } else {
        contentPrefService.set("keyword.URL", "");
    }
});

popupPanel.port.on('advanced-maximize', function(){
    popupPanel.resize(520, 270);
});

popupPanel.port.on('advanced-minimize', function(){
    popupPanel.resize(520, 60);
});

var widget = require("widget").Widget({
  id: "open-popup-panel",
  label: "DuckDuckGo Popup Panel",
  contentURL: data.url("img/icon_16.png"),
  panel: popupPanel
});


var pageMod = require("page-mod");
pageMod.PageMod({
    include: /^https?:\/\/(www|encrypted)\.google\..*\/.*$/,
    contentScriptWhen: 'ready',
    contentStyleFile: data.url("css/google.css"),
    contentScriptFile: data.url("js/google.js"),
    onAttach: function(worker) {
        worker.port.on('load-results', function(query){
            Request({
              url: 'https://api.duckduckgo.com?q=' + encodeURIComponent(query.query) + '&format=json&d=1',
              onComplete: function (response) {
                if (response.json) {
                    worker.port.emit('results-loaded', {'response': response.json});
                }
              }
            }).get();
        });
    }
});

pageMod.PageMod({
    include: /^https?:\/\/www\.bing\.com\/.*$/,
    contentScriptWhen: 'ready',
    contentStyleFile: data.url("css/bing.css"),
    contentScriptFile: data.url("js/bing.js"),
    onAttach: function(worker) {
        worker.port.on('load-results', function(query){
            Request({
              url: 'https://api.duckduckgo.com?q=' + encodeURIComponent(query.query) + '&format=json&d=1',
              onComplete: function (response) {
                if (response.json) {
                    worker.port.emit('results-loaded', {'response': response.json});
                }
              }
            }).get();
        });
    }
});

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

  var url = data.url('css/ddg.css');
  console.log(url);
  us.load(url);

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

  unregisterComponent(DDGAutocomplete);
}



function DDGAutocomplete() { }
DDGAutocomplete.prototype = {
  contractID: "@mozilla.org/autocomplete/search;1?name=duckduckgo",
  searchURL: "http://api.duckduckgo.com/%SEARCH_TERM%&format=json&no_html=1",
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
  let registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
  if (!comp.prototype.classID) {
    let uuidgen = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
    comp.prototype.classID = uuidgen.generateUUID();
  }
  if (!comp.prototype.factory)
    comp.prototype.factory = getFactory(comp);
  registrar.registerFactory(comp.prototype.classID, "", comp.prototype.contractID, comp.prototype.factory);
}

function unregisterComponent(comp) {
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



result = function (text) {
    if (text.length === 0) {
        throw ("Nothing to show.");
    }
    console.log("input: " + text);

    var request = new xhr.XMLHttpRequest();  
    request.open('GET', 'https://api.duckduckgo.com?q=' + encodeURIComponent(text) + '&format=json&d=1', false);
    request.send(null);  
      
    var out = [];
    if (request.status === 200) {  
        var res = JSON.parse(request.responseText);
        console.log(res['Type']);

     
        if (res['AnswerType'] !== "" || 
            (res['Type'] === 'A' && res['Abstract']  === '') || 
            res['Type'] === 'E') {
            out[0] = res['Answer'];       
            out[1] = 'http://duckduckgo.com/icon16.png';
        } else if (res['Type'] === 'A' && res['Abstract'] !== '') {
            out[0] = res['Heading'] + ": " + res['AbstractText'];
            var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*?\.)?(.*\..*?)\/.*/)[2];
            out[1] = 'http://duckduckgo.com/i/' + source_base_url + '.ico';
        } else if (res['Type'] === 'D' && res['Definition'] !== '') { 
            out[0] = res['Definition'];                                  
            var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*?\.)?(.*\..*?)\/.*/)[2];
            out[1] = 'http://duckduckgo.com/i/' + source_base_url + '.ico';
     
        }  
    }  
    return out;
}

var numClicks = 0;


exports.main = function(options, callbacks) {
    console.log(JSON.stringify(options, null, ' '));
    startup(null, null);
  // Create a new context menu item.
    var menuItem = contextMenu.Item({
 
    label: "Ask the duck",
    // Show this item when a selection exists.
 
    context: contextMenu.SelectionContext(),
 
    // When this item is clicked, post a message to the item with the
    // selected text and current URL.
    contentScript: 'self.on("context", function () {' +
                   '  var input = window.getSelection().toString();' +
                   '  self.postMessage(input); ' +
                   '  return "Ask the duck"; ' +
                   '});' + 
                   'self.on("click", function(){ ' +
                   '  var input = window.getSelection().toString();' +
                   '  window.location.href = "https://duckduckgo.com/" + input;' +
                   '});' ,
    onMessage: function(msg){
            res = result(msg);
            if (res !== null && res[0] !== '' && res[0] !== undefined) {
              //var x = '';
              //if (res[0].length > 40) {
              //    console.log(res[0]);
              //    x = res[0].substr(40, res[0].length)
              //    res[0] = res[0].substr(0, 40);

              //    this.label = res[0];
              //    menuItemSecond.label = x;
              //} else {
              //    this.label = res[0];
              //    menuItemSecond.label = ' ';
              //}
                this.label = res[0];
                this.image = res[1];
            } else {
                this.image = null;
                this.label = 'Ask the duck';
            }
        }
    });

  //var menuItemSecond = contextMenu.Item({
  //    label: 'second',
  //    context: contextMenu.SelectionContext()
  //});

};
 

exports.onUnload = function (reason) {
  console.log(reason);
};
