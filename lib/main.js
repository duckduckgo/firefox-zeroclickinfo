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
var windows = require("sdk/windows").browserWindows;

const {Cc,Cu,Ci,Cm} = require("chrome");

var { VersionManager } = require("./versionmanager");
var DDGAutocomplete  = require("./ddg-autocomplete");
var AskDax = require("./ddg-askdax");

var ui = require("./ui");
var ATB = require("./ddg-atb");
var nopopup = require("./ddg-nopopup");
var noatb = require("./ddg-noatb");
var atbgrabber = require("./ddg-atbgrabber");
var atbgen = require("./ddg-atbgen");


var {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");
var {NetUtil} = Cu.import("resource://gre/modules/NetUtil.jsm");


const PARTNER_QUERY_ADDITION = '';

// version for uninstall survey
var version = '';

const webExtension = require("sdk/webextension");
webExtension.startup().then(api => {
    // remove toolbar icon and set ddg as default
    ui.uninstallToolbarButton();
    onPrefChange('ddg_default');

    let {browser} = api;

    browser.runtime.onMessage.addListener(function(message){
        if (message.version) {
            if (message.version === "beta")
                version = 'ffv2_';
            else
                version = '';
        }
    });
});

prefSet.on("ddg_default", onPrefChange);
prefSet.on("toolbar_button", onPrefChange);
prefSet.on("ask_dax", onPrefChange);
prefSet.on("use_hotkey", onPrefChange);
prefSet.on("addressbar_autocomplete", onPrefChange);
prefSet.on("atb_param", onPrefChange);
prefSet.on("no_popup", onPrefChange);

function onPrefChange(prefName) {
    if (prefName == 'ddg_default') {
        if (prefSet.prefs['ddg_default'] === true) {
            var ddg = Services.search.getEngineByName('DuckDuckGo');
            if (ddg != null) {
                Services.search.currentEngine = ddg;
            }
        } else {
            Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
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
    } else if (prefName == 'no_popup') {
        if (prefSet.prefs['no_popup'] == true) {
            nopopup.install();
        } else {
            nopopup.uninstall();
        }
    } else if (prefName == 'atb_param') {
        if (prefSet.prefs['atb_param'] == true) {
            ATB.install();
        } else {
            ATB.uninstall();
        }
    }
}

exports.main = function(options, callbacks) {

    VersionManager.addMajorUpdate("0.4.6");

    // clear last_search
    ss.storage.last_search = '';

    // meaning on defaultly
    if (ss.storage.meanings === undefined) {
        ss.storage.meanings = true;
    }

    // if the ATB parm is not defined, the extension is either being installed
    // or we ran into a strange bug with Firefox v49 which requires a restart
    // for the install of the first extension and never sends the 'install'
    // trigger from options.loadReason
    if (!ss.storage.atb) {
      options.loadReason = "install";
    }

    // only set the atb parameter for new users
    if (options.loadReason == "install") {
      // set the default ATB param
      if (ss.storage.atb == undefined) {
          var majorVersion = atbgen.calc.majorVersion(),
              minorVersion = atbgen.calc.minorVersion();

          ss.storage.atb = 'v' + majorVersion + '-' + minorVersion;
      }

      ss.storage.installed_version = self.version;
    }

    // toolbar button
    ui.prepareToobarButton(PARTNER_QUERY_ADDITION);

    if (options.loadReason == "install" || options.loadReason == "upgrade") {

        // thank you page
        if (self.version != ss.storage.last_version) {

            var last = ss.storage.last_version;
        }
    }

    if (options.loadReason == "install" || options.loadReason == "enable") {

        ui.installToolbarButton();

        ss.storage.last_default_engine = Services.search.currentEngine.name;

        var ddg = Services.search.getEngineByName('DuckDuckGo');
        if (ddg != null) {
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

    if (prefSet.prefs['no_popup']) {
      nopopup.install();
    }

    if (prefSet.prefs['atb_param']) {
      // only redirect if there is an atb parameter set
      if (ss.storage.atb != undefined) {
        ATB.install();
      }
    }
    noatb.install();

    // Try to grab the ATB param from the site, only for users who installed
    // the version whose major param is 1.
    if (!ss.storage.atb_set) {
      var ver_major_str = ss.storage.installed_version.split('.')[0] || 0;
      var ver_major = parseInt(ver_major_str);
      if (ver_major == 1) {
        atbgrabber.install();
      }
    }
};

exports.onUnload = function (reason) {
    if (prefSet.prefs['dev']) console.log(reason);

    if (reason == 'disable') {
        Services.search.currentEngine = Services.search.getEngineByName(ss.storage.last_default_engine);
    }

    if (reason == 'uninstall') {
        var atbDelta = atbgen.calc.atbDelta(ss.storage.atb),
            surveyUrlParam = atbDelta <= 14 ? atbDelta : 15,
            surveyURL = 'https://www.surveymonkey.com/r/' + version + 'DOC_' + surveyUrlParam;

        windows.open(surveyURL);
    }

    DDGAutocomplete.shutdown()
};
