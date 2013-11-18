/*
 * Copyright (C) 2012, 2013 DuckDuckGo, Inc.
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

// Import the APIs we need.
var contextMenu = require("sdk/context-menu");
var xhr = require("sdk/net/xhr");


var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var Request = require("sdk/request").Request;

var { Hotkey } = require("sdk/hotkeys");

var ss = require("sdk/simple-storage");
var contentPrefService = require("sdk/preferences/service");
var prefSet = require("sdk/simple-prefs");

var { SearchSettings } = require("search-settings");

const {Cc,Cu,Ci,Cm} = require("chrome");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");

var {loadIntoWindow, 
     unloadFromWindow, 
     DDGAutocomplete, 
     registerComponent,
     unregisterComponent} = require("ddg-autocomplete");



const ENGINE_URL = self.data.url("search.xml");
const THANKS_URL = 'https://duckduckgo.com/extensions/thanks/';

let browserSearchService = Cc["@mozilla.org/browser/search-service;1"]
                           .getService(Ci.nsIBrowserSearchService); 


const winUtils = require("window-utils");

var delegate = {
    onTrack: function (window) {
        if ("chrome://browser/content/browser.xul" != window.location)
            return;

        window.addEventListener("aftercustomization", function(e){
            var mediator = Cc['@mozilla.org/appshell/window-mediator;1']
                            .getService(Ci.nsIWindowMediator);
            var document = mediator.getMostRecentWindow('navigator:browser').document;
            var tb = document.getElementById('ddg-toolbar-button');
            prefSet.prefs['toolbar_button'] = (tb !== null);

        }, false);
    }
}

var tracker = winUtils.WindowTracker(delegate);

var pageModGoogle;
var pageModBing;
var toolbarButton;
var toolbarButton_destroyed = false;
var menuItem;
var showPopupHotKey;

function bindHotkey() {
    var combo = "alt-g";

    var osString = Cc["@mozilla.org/xre/app-info;1"]
                    .getService(Ci.nsIXULRuntime).OS;

    if (osString == "Darwin") {
        combo = "accel-alt-g"; 
    }

    showPopupHotKey = Hotkey({
      combo: combo,
      onPress: function() {
        openPopupPanel();
      }
    });
}

function unbindHotkey() {
    showPopupHotKey.destroy();
}


var popupPanel = require("sdk/panel").Panel({
  contentURL: self.data.url("html/popup.html"),
  contentScriptFile: self.data.url("js/popup.js"),
  contentScriptWhen: "ready",
  height: 60,
  width: 530
});



// clear last_search 
ss.storage.last_search = '';

// meaning on defaultly
if (ss.storage.meanings === undefined) {
    ss.storage.meanings = true;
}


function ddgDefaultCheck() {
    var engine = Services.search.getEngineByName('DuckDuckGo');

    if (Services.search.currentEngine != engine) {
        prefSet.prefs['ddg_default'] = false;
    } else {
        prefSet.prefs['ddg_default'] = true;
    }
    if (prefSet.prefs['dev']) console.log('default engine',
                                           Services.search.currentEngine.name,
                                           prefSet.prefs['ddg_default']);
}

function openPopupPanel() {
            var mediator = Cc['@mozilla.org/appshell/window-mediator;1']
                            .getService(Ci.nsIWindowMediator);
            var document = mediator.getMostRecentWindow('navigator:browser').document;
            var navBar = document.getElementById('ddg-toolbar-button');
            popupPanel.show({position: toolbarButton}, navBar);
}

popupPanel.on('show', function() {
    ddgDefaultCheck();
    popupPanel.port.emit('opened', 
                            [ss.storage.maximized, 
                             prefSet.prefs['ddg_default'],
                             ss.storage.ducky,
                             ss.storage.meanings,
                             prefSet.prefs['zeroclick'],
                             ((prefSet.prefs['remember_last_search'] == true) ? ss.storage.last_search : undefined),
                             prefSet.prefs['toolbar_button']]);
});

var tabs = require("sdk/tabs");
popupPanel.port.on('open-ddg', function(url){
    if (prefSet.prefs['dev']) console.log(url);

    if (tabs.activeTab.url == 'about:blank') {
        tabs.activeTab.url = url;
    } else {
        tabs.open({
            url: url 
        });    
    }
    popupPanel.hide();
});

popupPanel.port.on('swap-default', function(def){
    if (prefSet.prefs['dev']) console.log('swap-def:', def);

    if (def == true){
        var ddg = Services.search.getEngineByName('DuckDuckGo');
        if (ddg == null) {
            SearchSettings.addSearchEngine(ENGINE_URL, true);
        } else {
            Services.search.currentEngine = ddg; 
        }
    } else {
        SearchSettings.cleanup('uninstall');
        Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
        //uninstallDDGSearchEngine();
    }

    prefSet.prefs['ddg_default'] = def;
});

popupPanel.port.on('swap-toolbarbutton', function(def){
    if (def == true){
        installToolbarButton();
    } else {
        uninstallToolbarButton();
    }

    prefSet.prefs['toolbar_button'] = def;
});

popupPanel.port.on('ducky-swap', function(def){
    ss.storage.ducky = def;
});

popupPanel.port.on('meanings-swap', function(def){
    ss.storage.meanings = def;
});

popupPanel.port.on('zeroclick-swap', function(def){
    prefSet.prefs['zeroclick'] = def;
});

popupPanel.port.on('meanings-swap', function(def){
    ss.storage.meanings = def;
});

popupPanel.port.on('advanced-maximize', function(){
    ss.storage.maximized = true;
    popupPanel.resize(530, 220);
});

popupPanel.port.on('advanced-minimize', function(){
    ss.storage.maximized = false;
    popupPanel.resize(530, 60);
});

popupPanel.port.on('set-last_search', function(val){
    ss.storage.last_search = val;
});



function loadPageMod() {
    var pageMod = require("sdk/page-mod");
    pageModGoogle = pageMod.PageMod({
        include: /^https?:\/\/(www|encrypted)\.google\..*\/.*$/,
        contentScriptWhen: 'ready',
        contentStyleFile: [
            self.data.url("css/common.css"),
            self.data.url("css/google.css")
        ],
        contentScriptFile: [
            self.data.url("js/jquery.js"),  
            self.data.url("js/common.js"),  
            self.data.url("js/google.js")  
        ],
        onAttach: function(worker) {
            worker.port.on('load-results', function(query){
                var url = 'https://api.duckduckgo.com?q=' + encodeURIComponent(query.query) + '&format=json';
                if (ss.storage.meanings == false) {
                    url += '&d=1';
                }

                if(prefSet.prefs['dev']) console.log(url);

                Request({
                  url: url, 
                  onComplete: function (response) {
                    if (response.json) {
                        worker.port.emit('results-loaded', {'response': response.json});
                    }
                  }
                }).get();
            });
            
            worker.port.on('get-options', function(){
                worker.port.emit('set-options', {'options': {'dev': prefSet.prefs['dev']}});
            });
        }
    });

    pageModBing = pageMod.PageMod({
        include: /^https?:\/\/www\.bing\.com\/.*$/,
        contentScriptWhen: 'ready',
        contentStyleFile: [
            self.data.url("css/common.css"),
            self.data.url("css/bing.css")
        ],
        contentScriptFile: [
            self.data.url("js/jquery.js"),  
            self.data.url("js/common.js"),  
            self.data.url("js/bing.js")  
        ],
        onAttach: function(worker) {
            worker.port.on('load-results', function(query){
                var url = 'https://api.duckduckgo.com?q=' + encodeURIComponent(query.query) + '&format=json';

                if (ss.storage.meanings == false)
                    url += '&d=1';

                Request({
                  url: url,
                  onComplete: function (response) {
                    if (response.json) {
                        worker.port.emit('results-loaded', {'response': response.json});
                    }
                  }
                }).get();
            });

            worker.port.on('get-options', function(){
                worker.port.emit('set-options', {'options': {'dev': prefSet.prefs['dev']}});
            });
        }
    });
}

function destroyPageMod() {
    pageModGoogle.destroy();
    pageModBing.destroy();
}

function uninstallDDGSearchEngine() {
    var ddg = Services.search.getEngineByName('DuckDuckGo');
    if (ddg != null)
        Services.search.removeEngine(ddg);
}

function prepareToobarButton() {
    toolbarButton = require("toolbarbutton").ToolbarButton({
        id: 'ddg-toolbar-button',
        label: 'DuckDuckGo',
        image: self.data.url('img/icon_16.png'),
        onCommand: function() {
            openPopupPanel();
        }
    });
}

function installToolbarButton () {
    if (toolbarButton_destroyed) {
        prepareToobarButton(); 
    }

    toolbarButton.moveTo({
      toolbarID: "nav-bar",
      forceMove: false
    });

    toolbarButton_destroyed = false;
}

function uninstallToolbarButton() {
    toolbarButton.destroy();
    toolbarButton_destroyed = true;
}

function createAskDax() {
    menuItem = contextMenu.Item({
        label: "Ask DuckDuckGo about that",
        context: contextMenu.SelectionContext(),
        contentScript:'self.on("context", function () {' +
                 '  var input = window.getSelection().toString();' +
                 '  self.postMessage(input);' + 
                 '  return true;' +
                 '});' + 
                 ' self.on("click", function(){ ' +
                 ' var input = window.getSelection().toString(); ' + 
                 ' window.open("https://duckduckgo.com/?q=" + input, "_blank");' +
                 ' });',
        image: self.data.url('img/icon_16.png'),
        onMessage: function(msg){
            res = result(msg);
            if (res !== null && res[0] !== '' && res[0] !== undefined) {
                this.label = res[0];
                this.image = self.data.url('img/icon_16.png'); // res[1]
            } else {
                this.image = self.data.url('img/icon_16.png');
                this.label = 'Ask Dax about ' + msg ;
            }
        }
    });
}

function destroyAskDax() {
    menuItem.destroy();
}

if (prefSet.prefs['zeroclick']) {
    loadPageMod();
}

prefSet.on("zeroclick", onPrefChange);
prefSet.on("ddg_default", onPrefChange);
prefSet.on("toolbar_button", onPrefChange);
prefSet.on("ask_dax", onPrefChange);
prefSet.on("use_hotkey", onPrefChange);

function onPrefChange(prefName) {
    if (prefName == 'zeroclick') {
        if (prefSet.prefs['zeroclick'] === true) {
            loadPageMod();
        } else {
            destroyPageMod();
        }
    } else if (prefName == 'ddg_default') {
        if (prefSet.prefs['ddg_default'] === true) {

            var ddg = Services.search.getEngineByName('DuckDuckGo');
            if (ddg == null) {
                SearchSettings.addSearchEngine(ENGINE_URL, true);
            } else {
                Services.search.currentEngine = ddg; 
            }
        } else {
            SearchSettings.cleanup('uninstall');
            Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
            //uninstallDDGSearchEngine();
        }
    } else if (prefName == 'toolbar_button') {
        if (prefSet.prefs['toolbar_button'] === true) {
            installToolbarButton();
        } else {
            uninstallToolbarButton();
        }
    } else if (prefName == 'ask_dax') {
        if (prefSet.prefs['ask_dax'] === true) {
            createAskDax();
        } else {
            destroyAskDax();
        }
    } else if (prefName == 'use_hotkey') {
        if (prefSet.prefs['use_hotkey'] === true) {
            bindHotkey();
        } else {
            unbindHotkey();
        }
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
  
  registerComponent(DDGAutocomplete);
}

function install() {
}

function shutdown(aData, aReason) {
  // if (aReason == APP_SHUTDOWN) return;
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  wm.removeListener(windowListener);
  let enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    unloadFromWindow(win);
  }

  unregisterComponent(DDGAutocomplete);
}



function truncate(text, limit, append) {
  if (!append) 
    append = '...';

  subtext = text.substr(0, limit);
  subtext = subtext.replace(/\s+\S*$/, "");

  return subtext + ' ' + append;
}


result = function (text) {
    if (text.length === 0) {
        throw ("Nothing to show.");
    }

    if (prefSet.prefs['dev']) console.log("input: " + text);

    var request = new xhr.XMLHttpRequest();  
    request.open('GET', 'https://api.duckduckgo.com?q=' + encodeURIComponent(text) + '&format=json&d=1', false);
    request.send(null);  
      
    var out = [];
    if (request.status === 200) {  
        var res = JSON.parse(request.responseText);
        if (prefSet.prefs['dev']) console.log(res['Type']);

     
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
    if (out[0] == undefined) 
        return '';
    out[0] = truncate(out[0], 40);
    return out;
}


exports.main = function(options, callbacks) {

    SearchSettings.init(options.loadReason);

    // toolbar button
    prepareToobarButton();

    if (options.loadReason == "install" || options.loadReason == "upgrade") {

        // thank you page
        if (self.version != ss.storage.last_version) {

            var last = ss.storage.last_version;

            // in the worst case this will make sure that no page will show next
            // time
            ss.storage.last_version = self.version;

            // make sure that the show thankspage option is respected
            if (prefSet.prefs['thankspage']) {
                var tabs = require('sdk/tabs');
                var timers = require('sdk/timers');
                if (last == undefined) {
                    timers.setTimeout(function(){
                        tabs.open(THANKS_URL + '?to=' + self.version);
                    }, 1000);
                } else {
                    var path = '?from=' + last + '&to=' + self.version;
                    timers.setTimeout(function(){
                        tabs.open(THANKS_URL + path);
                    }, 1000);
                }
            }

        }
    }

    if (options.loadReason == "install" || options.loadReason == "enable" ||
        options.loadReason == "upgrade") {

        installToolbarButton();

        ss.storage.last_default_engine = Services.search.currentEngine.name;

        var ddg = Services.search.getEngineByName('DuckDuckGo');
        if (ddg == null) {
            SearchSettings.addSearchEngine(ENGINE_URL, true);
        } else {
            Services.search.currentEngine = ddg;
        }

        prefSet.prefs['ddg_default'] = true;
    } else {
        if (prefSet.prefs['toolbar_button'] == false) {
            uninstallToolbarButton();
        } else if (prefSet.prefs['toolbar_button'] == true) {
            installToolbarButton();
        }
    }


    if (prefSet.prefs['dev']) console.log(JSON.stringify(options, null, ' '));
    startup(null, null);

    if (prefSet.prefs['ask_dax']) {
        createAskDax();
    }

    if (prefSet.prefs['use_hotkey']) {
        bindHotkey();
    }

    var timers = require('sdk/timers');
    var engine = Services.search.currentEngine;

    var ddg = Services.search.getEngineByName('DuckDuckGo');
    if (ddg == null && (options.loadReason != 'install' && options.loadReason != 'enable'))
      SearchSettings.addSearchEngine(ENGINE_URL);

    if (prefSet.prefs['ddg_default'] != true) {
        timers.setTimeout(function(){
            Services.search.currentEngine = engine;
        }, 1000);
    }

};
 

exports.onUnload = function (reason) {
    if (prefSet.prefs['dev']) console.log(reason);

    if (reason == 'shutdown') {
        ddgDefaultCheck();
    }

    SearchSettings.cleanup(reason);

    if (reason == 'disable') {
        Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
        //uninstallDDGSearchEngine(); 
    }

    shutdown();
};
