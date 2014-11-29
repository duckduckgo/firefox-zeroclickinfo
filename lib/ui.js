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

"use strict";

var self = require("sdk/self");
var prefSet = require("sdk/simple-prefs");
var ss = require("sdk/simple-storage");
var tabs = require("sdk/tabs");
var { Hotkey } = require("sdk/hotkeys");
var selection = require("sdk/selection");

const {Cc,Cu,Ci,Cm} = require("chrome");
const {Services} = Cu.import('resource://gre/modules/Services.jsm');
const {SearchSettings} = require("search-settings");

var SE = require("ddg-searchengine");

var toolbarButton;
var toolbarButton_destroyed = false;

var PARTNER_QUERY_ADDITION = '';

const winUtils = require("sdk/deprecated/window-utils");

const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { id: addonID } = require("sdk/self");

const ENGINE_URL = self.data.url("search.xml");

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


const xulapp = require("sdk/system/xul-app");
const usingAustralis = xulapp.satisfiesVersion(">=29");

var popupPanel = require("sdk/panel").Panel({
  contentURL: self.data.url("html/popup.html"),
  contentScriptFile: self.data.url("js/popup.js"),
  contentScriptWhen: "ready",
  height: 60,
  width: 530,
  onHide: function() {
      if (usingAustralis) {
          toolbarButton.state("window", {checked: false});
      }
  }
});

function openPopupPanel() {
    if (usingAustralis) {

        // taken from privacybadger
        // https://github.com/EFForg/privacybadgerfirefox/blob/master/lib/ui.js

        const buttonPrefix =
          'button--' + addonID.toLowerCase().replace(/[^a-z0-9-_]/g, '');

        const toWidgetID = id => buttonPrefix + '-' + id;

        const nodeFor = ({id}) =>
          getMostRecentBrowserWindow().document.getElementById(toWidgetID(id))

        popupPanel.show({ position: toolbarButton }, nodeFor(toolbarButton));

    } else {
        var mediator = Cc['@mozilla.org/appshell/window-mediator;1']
                        .getService(Ci.nsIWindowMediator);
        var document = mediator.getMostRecentWindow('navigator:browser').document;
        var navBar = document.getElementById('ddg-toolbar-button');
        popupPanel.show({position: toolbarButton}, navBar);
    }
}

popupPanel.on('show', function() {
    SE.ddgDefaultCheck();
    popupPanel.port.emit('opened', {
        popup_maximized: ss.storage.maximized,
        ddg_default: prefSet.prefs['ddg_default'],
        feeling_ducky: ss.storage.ducky,
        show_meanings: ss.storage.meanings,
        zeroclick: prefSet.prefs['zeroclick'],
        selected_text: selection.text,
        last_search: ((prefSet.prefs['remember_last_search'] == true) ? ss.storage.last_search : undefined),
        toolbar_button: prefSet.prefs['toolbar_button'],
        safe_search: prefSet.prefs['safe_search'],
        partner_query_addition: PARTNER_QUERY_ADDITION
    });
});

popupPanel.port.on('open-ddg', function(url){
    if (prefSet.prefs['dev']) console.log(url);

    if (tabs.activeTab.url == 'about:blank') {
        tabs.activeTab.url = url;
    } else if (url == 'about:addons') {
        Services.wm.getMostRecentWindow('navigator:browser').BrowserOpenAddonsMgr('addons://detail/jid1-ZAdIEUB7XOzOJw%40jetpack/preferences');
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



function prepareToobarButton(partner_query_addition) {

    var img = self.data.url('img/icon_16.png');

    if (usingAustralis) {
        var { ToggleButton } = require('sdk/ui/button/toggle');

        toolbarButton = ToggleButton({
            id: 'ddg-toolbar-button',
            label: 'DuckDuckGo',
            icon: {
                '16': self.data.url('img/icon_16.png'),
                '32': self.data.url('img/icon_32.png'),
                '64': self.data.url('img/icon_64.png')
            },
            onChange: function(state) {
                if (state.checked) {
                    openPopupPanel();
                }
            },
        });

    } else {
        toolbarButton = require("toolbarbutton").ToolbarButton({
            id: 'ddg-toolbar-button',
            label: 'DuckDuckGo',
            image: img,
            onCommand: function() {
                openPopupPanel();
            }
        });

    }

    PARTNER_QUERY_ADDITION = partner_query_addition;

    if (!usingAustralis)
        var tracker = winUtils.WindowTracker(delegate);
}

function installToolbarButton () {
    if (toolbarButton_destroyed) {
        prepareToobarButton(PARTNER_QUERY_ADDITION);
    }

    if (!usingAustralis) {
        toolbarButton.moveTo({
          toolbarID: "nav-bar",
          forceMove: false
        });
    }

    toolbarButton_destroyed = false;
}

function uninstallToolbarButton() {
    toolbarButton.destroy();
    toolbarButton_destroyed = true;
}

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


exports.installToolbarButton = installToolbarButton;
exports.uninstallToolbarButton = uninstallToolbarButton;
exports.prepareToobarButton = prepareToobarButton;
exports.openPopupPanel = openPopupPanel;
exports.bindHotkey = bindHotkey;
exports.unbindHotkey = unbindHotkey;
