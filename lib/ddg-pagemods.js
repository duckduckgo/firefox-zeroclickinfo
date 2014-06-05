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

var pageMod = require("sdk/page-mod");
var self = require("sdk/self");
var Request = require("sdk/request").Request;
var prefSet = require("sdk/simple-prefs");
var ss = require("sdk/simple-storage");

var pageModGoogle;
var pageModBing;

function load() {
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
                worker.port.emit('set-options', {
                    'options': {
                        'dev': prefSet.prefs['dev'],
                        'zeroclick_google_right': prefSet.prefs['zeroclick_google_right']
                    }
                });
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

function destroy() {
    pageModGoogle.destroy();
    pageModBing.destroy();
}

exports.load = load;
exports.destroy = destroy;
