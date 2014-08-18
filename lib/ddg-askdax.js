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

var contextMenu = require("sdk/context-menu");
var xhr = require("sdk/net/xhr");
var self = require("sdk/self");
var menuItem;

exports.create = function (PARTNER_QUERY_ADDITION) {
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
                 ' window.open("https://duckduckgo.com/?q=" + input + "' + PARTNER_QUERY_ADDITION + '", "_blank");' +
                 ' });',
        image: self.data.url('img/icon_16.png'),
        onMessage: function(msg){
            res = result(msg);
            this.image = self.data.url('img/icon_16.png');

            if (res !== null && res[0] !== '' && res[0] !== undefined) {
                this.label = res[0];

                if (res[1] !== undefined) {
                    this.image = res[1];
                }

            } else {
                this.label = 'Ask Dax about ' + msg ;
            }
        }
    });
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

    var request = new xhr.XMLHttpRequest();
    request.open('GET', 'https://api.duckduckgo.com?q=' + encodeURIComponent(text) + '&format=json&d=1', false);
    request.send(null);

    var out = [];
    if (request.status === 200) {
        var res = JSON.parse(request.responseText);

        out[1] = 'https://duckduckgo.com/icon16.png';

        if (res['AnswerType'] !== "" || (res['Type'] === 'A' && res['Abstract']  === '') ||
            res['Type'] === 'E') {

            out[0] = res['Answer'];

        } else if (res['Type'] === 'A' && res['Abstract'] !== '') {
            out[0] = res['Heading'] + ": " + res['AbstractText'];
            var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*\..*?)\/.*/)[1];
            if (source_base_url != undefined)
                out[1] = 'http://duckduckgo.com/i/' + source_base_url + '.ico';

        } else if (res['Type'] === 'D' && res['Definition'] !== '') {
            out[0] = res['Definition'];
            var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*\..*?)\/.*/)[1];
            if (source_base_url != undefined)
                out[1] = 'http://duckduckgo.com/i/' + source_base_url + '.ico';
        }
    }
    if (out[0] == undefined)
        return '';
    out[0] = truncate(out[0], 40);
    return out;
}


exports.destroy = function() {
    menuItem.destroy();
}
