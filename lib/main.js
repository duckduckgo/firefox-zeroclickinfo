/*
 * Copyright (C) 2012, 2014 DuckDuckGo, Inc.
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

var self = require("sdk/self");

var ss = require("sdk/simple-storage");
var prefSet = require("sdk/simple-prefs");

const {Cc,Cu,Ci,Cm} = require("chrome");

var { VersionManager } = require("./versionmanager");
var DDGAutocomplete  = require("./ddg-autocomplete");
var AskDax = require("./ddg-askdax");
var SE = require("./ddg-searchengine");

var ui = require("./ui");

var { SearchSettings } = require("./search-settings");

var {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");
var {NetUtil} = Cu.import("resource://gre/modules/NetUtil.jsm");


const ENGINE_URL = self.data.url("search.xml");
const PARTNER_QUERY_ADDITION = '';

var pageMod = require("sdk/page-mod");

prefSet.on("ddg_default", onPrefChange);
prefSet.on("toolbar_button", onPrefChange);
prefSet.on("ask_dax", onPrefChange);
prefSet.on("use_hotkey", onPrefChange);
prefSet.on("addressbar_autocomplete", onPrefChange);

function onPrefChange(prefName) {
    if (prefName == 'ddg_default') {
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
            //SE.uninstallDDGSearchEngine();
        }
    } else if (prefName == 'toolbar_button') {
        if (prefSet.prefs['toolbar_button'] === true) {
            ui.installToolbarButton();
        } else {
            ui.uninstallToolbarButton();
        }
    } else if (prefName == 'ask_dax') {
        if (prefSet.prefs['ask_dax'] === true) {
            AskDax.create(PARTNER_QUERY_ADDITION);
        } else {
            AskDax.destroy();
        }
    } else if (prefName == 'use_hotkey') {
        if (prefSet.prefs['use_hotkey'] === true) {
            ui.bindHotkey();
        } else {
            ui.unbindHotkey();
        }
    } else if (prefName == 'addressbar_autocomplete') {
        if (prefSet.prefs['addressbar_autocomplete'] == true) {
            DDGAutocomplete.enable();
        } else {
            DDGAutocomplete.disable();
        }
    }
}


exports.main = function(options, callbacks) {

    VersionManager.addMajorUpdate("0.4.6");

    SearchSettings.init(options.loadReason);

    // clear last_search
    ss.storage.last_search = '';

    // meaning on defaultly
    if (ss.storage.meanings === undefined) {
        ss.storage.meanings = true;
    }

    // toolbar button
    ui.prepareToobarButton(PARTNER_QUERY_ADDITION);

    if (options.loadReason == "install" || options.loadReason == "upgrade") {

        // thank you page
        if (self.version != ss.storage.last_version) {

            var last = ss.storage.last_version;
        }
    }

    if (options.loadReason == "install" || options.loadReason == "enable" ||
        options.loadReason == "upgrade") {

        ui.installToolbarButton();

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
            ui.uninstallToolbarButton();
        } else if (prefSet.prefs['toolbar_button'] == true) {
            ui.installToolbarButton();
        }
    }


    if (prefSet.prefs['dev']) console.log(JSON.stringify(options, null, ' '));

    DDGAutocomplete.startup();

    if (prefSet.prefs['addressbar_autocomplete'] == false) {
        DDGAutocomplete.disable();
    }

    if (prefSet.prefs['ask_dax']) {
        AskDax.create(PARTNER_QUERY_ADDITION);
    }

    if (prefSet.prefs['use_hotkey']) {
        ui.bindHotkey();
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
    pageMod.PageMod({
      include: /^https?:\/\/(www|encrypted)\.google\..*\/.*$/,
      contentStyleFile: './css/nopopup.css',
    });
};

exports.onUnload = function (reason) {
    if (prefSet.prefs['dev']) console.log(reason);

    if (reason == 'shutdown') {
        SE.ddgDefaultCheck();
    }

    SearchSettings.cleanup(reason);

    if (reason == 'disable') {
        Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
        //SE.uninstallDDGSearchEngine();
    }

    DDGAutocomplete.shutdown()
};
