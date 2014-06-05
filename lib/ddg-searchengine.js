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


const {Cc,Cu,Ci,Cm} = require("chrome");
var prefSet = require("sdk/simple-prefs");
var {Services} = Cu.import("resource://gre/modules/Services.jsm");

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

exports.ddgDefaultCheck = ddgDefaultCheck;
