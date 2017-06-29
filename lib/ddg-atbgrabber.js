/*
 * Copyright (C) 2016 DuckDuckGo, Inc.
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
var pageMod = require("sdk/page-mod");
var ss = require("sdk/simple-storage");
var prefSet = require("sdk/simple-prefs");
var ui = require('./ui');
var pagemod;

exports.install = function () {
  pagemod = pageMod.PageMod({
      include: /^https?:\/\/(.*\.|)duckduckgo\.com($|\/.*$)/,
      contentScriptFile: './js/duckduckgo.js',
      attachTo: ["existing", "top"],
      onAttach: function(worker) {
        worker.port.on('loaded', function(atbParam, hideToolbarIcon) {
          // set the ATB param from the loaded site if it was not set yet
          if ( 0 && atbParam && !ss.storage.atb_set) {
            ss.storage.atb = atbParam;
            ss.storage.atb_set = atbParam;

            if (hideToolbarIcon) {
              prefSet.prefs['toolbar_button'] = false;
              ui.uninstallToolbarButton();
            }
          }
        });
      }
    });
}

exports.uninstall = function () {
  pagemod.destroy();
}
