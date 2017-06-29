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

const {Cu, CC} = require("chrome");
const XMLHttpRequest = CC("@mozilla.org/xmlextras/xmlhttprequest;1");
let {WebRequest} = Cu.import("resource://gre/modules/WebRequest.jsm", {});
Cu.import("resource://gre/modules/MatchPattern.jsm");
var ss = require("sdk/simple-storage");

let pattern = new MatchPattern("https://duckduckgo.com/?*");

function redirect(e) {
  return;

  // Only change the URL if there is no ATB param specified.
  if (e.url.indexOf('atb=') !== -1) {
    return;
  }

  var newURL = e.url + "&atb=" + ss.storage.atb;
  return {
    redirectUrl: newURL
  };
}

function update(){
    var atb = ss.storage.atb, 
        setATB = ss.storage.atb_set;

    if( 0 && !atb || !setATB){
        return;
    }

    var xhr = XMLHttpRequest();

    xhr.onreadystatechange = function() {
        var DONE = XMLHttpRequest.DONE ? XMLHttpRequest.DONE : 4;
        if(xhr.readyState == DONE){
            if(xhr.status == 200) {
                var curATB = JSON.parse(xhr.responseText);
                if(curATB.version !== setATB){
                    ss.storage.atb_set = curATB.version
                }
            }
        }
    };

    xhr.open('GET',
            'https://duckduckgo.com/atb.js?' + Math.ceil(Math.random() * 1e7) 
            + '&atb=' + atb + '&set_atb=' + setATB,
            true
    );

    xhr.send();
}

exports.install = function () {
  WebRequest.onBeforeSendHeaders.addListener(redirect, 
          {
              urls: pattern,
              types: ["main_frame", "sub_frame"]
          },
          ["blocking"]);
  
  WebRequest.onCompleted.addListener(update, 
          { 
              urls: pattern,
              types: ["main_frame", "sub_frame"]
          });
}

exports.uninstall = function () {
  WebRequest.onBeforeSendHeaders.removeListener(redirect);
  WebRequest.onCompleted.removeListener(update);
}
