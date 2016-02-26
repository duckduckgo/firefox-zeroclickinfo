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

var ICON_MAXIMIZE = "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDIwIDIwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgaWQ9Im1heGltaXplIj48cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojQUFBQUFBOyIgZD0iTTEwLDBjNS41LDAsMTAsNC41LDEwLDEwYzAsNS41LTQuNSwxMC0xMCwxMFMwLDE1LjUsMCwxMEMwLDQuNSw0LjUsMCwxMCwweiIvPjxnPjxnPjxwb2x5Z29uIHN0eWxlPSJmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNGRkZGRkY7IiBwb2ludHM9IjE0LDkgMTEsOSAxMSw2IDksNiA5LDkgNiw5IDYsMTEgOSwxMSA5LDE0IDExLDE0IDExLDExIDE0LDExICIvPjwvZz48L2c+PC9nPjwvc3ZnPg==";

var ICON_MINIMIZE = "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDIwIDIwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgaWQ9Im1pbmltaXplIj48cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojQUFBQUFBOyIgZD0iTTEwLDBjNS41LDAsMTAsNC41LDEwLDEwYzAsNS41LTQuNSwxMC0xMCwxMFMwLDE1LjUsMCwxMEMwLDQuNSw0LjUsMCwxMCwweiIvPjxwYXRoIHN0eWxlPSJmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNGRkZGRkY7IiBkPSJNMTQsOXYySDZWOUgxNHoiLz48L2c+PC9zdmc+"

var BTN_NORMAL = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2IDE2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzYxQTVEQSIgZD0iTTE0LDE2SDJjLTEuMSwwLTItMC45LTItMlYyYzAtMS4xLDAuOS0yLDItMmgxMmMxLjEsMCwyLDAuOSwyLDJ2MTJDMTYsMTUuMSwxNS4xLDE2LDE0LDE2eiIvPjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjEyLDcgOSw3IDksNCA3LDQgNyw3IDQsNyA0LDkgNyw5IDcsMTIgOSwxMiA5LDkgMTIsOSAiLz48L3N2Zz4=";

var BTN_HOVER = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2IDE2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzQ0OTVENCIgZD0iTTE0LDE2SDJjLTEuMSwwLTItMC45LTItMlYyYzAtMS4xLDAuOS0yLDItMmgxMmMxLjEsMCwyLDAuOSwyLDJ2MTJDMTYsMTUuMSwxNS4xLDE2LDE0LDE2eiIvPjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjEyLDcgOSw3IDksNCA3LDQgNyw3IDQsNyA0LDkgNyw5IDcsMTIgOSwxMiA5LDkgMTIsOSAiLz48L3N2Zz4=";

var use_safe_search = true;
var partner_query_addition = '';

self.port.on('opened', function(options) {

  if (options.feeling_ducky === true) {
    document.getElementById('adv_ducky').checked = true;
  }

  if (options.ddg_default === true) {
    document.getElementById('default_search').checked = true;
  } else {
    document.getElementById('default_search').checked = false;
  }

//if (options[3] === true)
//  document.getElementById('adv_meanings').checked = true;

  if (options.zeroclick === true)
    document.getElementById('adv_zeroclick').checked = true;

  if (options.toolbar_button === true)
    document.getElementById('adv_toolbarbutton').checked = true;



  // putting selected text or last searched value to the input
  if (options.selected_text || options.last_search != undefined && options.last_search !== '' && options.last_search.length != 0) {
      document.getElementById("search_form_input_homepage").value = options.selected_text ? options.selected_text : options.last_search;
      document.getElementById("search_form_input_clear").style.display = 'inline-block';
      document.getElementById("search_button_homepage").className = 'selected';
      document.getElementById('search_form_input_homepage').select();
  } else {
      document.getElementById("search_form_input_homepage").value = '';
      document.getElementById('search_form_input_homepage').focus();
  }

  use_safe_search = options.safe_search;
  partner_query_addition = options.partner_query_addition;

  if (options.popup_maximized !== false) {
    self.port.emit('advanced-maximize');
    document.getElementById('icon_advanced').src = ICON_MINIMIZE;

    document.getElementById('advanced').style.display = 'block';
    document.getElementById('icon_advanced').className = 'maximized';
  } else {
    self.port.emit('advanced-minimize');
    document.getElementById('icon_advanced').src = ICON_MAXIMIZE;

    document.getElementById('advanced').style.display = 'none';
    document.getElementById('icon_advanced').className = 'minimized';
  }

  document.getElementById('adv_ducky').onclick = ducky_check;
  document.getElementById('default_search').onclick = change_default;
//document.getElementById('adv_meanings').onclick = meanings_check;
  document.getElementById('adv_zeroclick').onclick = zeroclick_check;
  document.getElementById('adv_toolbarbutton').onclick = toolbarbutton_check;

  document.getElementById('search_form_input_clear').onclick = search_input_clear;

  document.getElementById('bang_gi').onclick = function(){
    add_bang('!gi');
  }
  document.getElementById('bang_w').onclick = function(){
    add_bang('!w');
  }
  document.getElementById('bang_bi').onclick = function(){
    add_bang('!bi');
  }
  document.getElementById('bang_a').onclick = function(){
    add_bang('!a');
  }
  document.getElementById('bang_n').onclick = function(){
    add_bang('!n');
  }
  document.getElementById('bang_yt').onclick = function(){
    add_bang('!yt');
  }
  document.getElementById('bang_m').onclick = function(){
    add_bang('!m');
  }

  var images = document.querySelectorAll('li img');
  for(var i = 0; i < images.length; i++) {
    images[i].onmouseover = function() {
        this.src = BTN_HOVER;
    }

    images[i].onmouseout = function() {
        this.src = BTN_NORMAL;
    }
  }

  document.getElementById("search_form_input_homepage").onkeydown = function(){
    document.getElementById("search_form_input_clear").style.display = 'inline-block';
    document.getElementById("search_button_homepage").className = 'selected';
    this.style.color = '#000000';
  };
  document.getElementById("search_form_input_homepage").onkeyup = function(){
    if (this.value == '') {
      this.style.color = '#999999';
      search_input_clear();
    }
  };


  document.getElementById('search_form_homepage').onsubmit = function(e){
    e.preventDefault();
    return search();
  }

  document.getElementById('all_bangs_link').onclick = function(){
    self.port.emit('open-ddg', "http://duckduckgo.com/bang.html");
  }

});


function search(){
  var input = document.getElementById("search_form_input_homepage").value;

  if (input == '')
      return false;


  self.port.emit('set-last_search', input);

  if (document.getElementById('adv_ducky').checked === true) {
    input = "\\" + input;
  }

  var special = '';
//if(document.getElementById('adv_meanings').checked !== true) {
//  special = '&d=1';
//}

  // special += '&kp=' + ((use_safe_search) ? '1' : '-1');
  special += partner_query_addition;

  var os = "o";
  if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
  if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
  if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

  special += '&bext=' + os + 'fp';

  self.port.emit('open-ddg', "https://duckduckgo.com/?q="+encodeURIComponent(input)+special);

  return false;
}

document.getElementById('icon_advanced').onclick = function(){
  if (this.className == 'minimized') {
    self.port.emit('advanced-maximize');
    this.src = ICON_MAXIMIZE;

    document.getElementById('advanced').style.display = 'block';
    this.className = 'maximized';
  } else {
    self.port.emit('advanced-minimize');
    this.src = ICON_MAXIMIZE;

    document.getElementById('advanced').style.display = 'none';
    this.className = 'minimized';
  }
  document.getElementById('search_form_input_homepage').focus();
}

function add_bang(bang) {
    var inp = document.getElementById('search_form_input_homepage');

    var bang_regex = /\!\w+/;

    document.getElementById("search_form_input_clear").style.display= 'inline-block';
    document.getElementById("search_button_homepage").className = 'selected';

    if (inp.value === '') {
        inp.style.color = '#000';
        inp.value = bang + ' ';
        inp.focus();
    } else {
        var found_bangs = bang_regex.exec(inp.value);
        if (found_bangs !== null) {
            inp.value = inp.value.replace(found_bangs[0], bang);
            inp.focus();
        } else {
            inp.value += ' ' + bang;
            search();
        }
    }
}


function ducky_check(){
  self.port.emit('ducky-swap', document.getElementById('adv_ducky').checked);
}

////function meanings_check(){
////  self.port.emit('meanings-swap', document.getElementById('adv_ducky').checked);
////}

function zeroclick_check(){
  self.port.emit('zeroclick-swap', document.getElementById('adv_zeroclick').checked);
}

function change_default(){
  self.port.emit('swap-default', document.getElementById('default_search').checked);
}

function toolbarbutton_check(){
  self.port.emit('swap-toolbarbutton', document.getElementById('adv_toolbarbutton').checked);
}

function search_input_clear() {
  self.port.emit('set-last_search', '');

  document.getElementById('search_form_input_homepage').value = '';
  document.getElementById("search_form_input_clear").style.display= 'none';
  document.getElementById('search_form_input_homepage').focus();
  document.getElementById("search_button_homepage").className = '';
 }
