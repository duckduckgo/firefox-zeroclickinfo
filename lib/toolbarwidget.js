/**
 * (c) 2013 Rob W <gwnRob@gmail.com>
 * MIT license
 **/
/*globals require, exports, console*/
'use strict';
const winUtils = require('sdk/window/utils');
const { browserWindows } = require('sdk/windows');

const browserURL = 'chrome://browser/content/browser.xul';
const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * widgetID: A sdk/widget ID
 *
 * Returns: The ID of the corresponding <toolbarbutton> element.
 */
function getWidgetId(widgetId) {
    // This method is based on code in sdk/widget.js, look for setAttribute("id", id);

    // Temporary work around require("self") failing on unit-test execution ...
    let jetpackID = "testID";
    try {
        jetpackID = require("sdk/self").id;
    } catch(e) {}
    return "widget:" + jetpackID + "-" + widgetId;
}

// currentset manipulation methods
function getCurrentSet(toolbar) {
    let currentSet = toolbar.getAttribute('currentset') || toolbar.currentSet;
    currentSet = currentSet == '__empty' ? [] : currentSet.split(',');
    return currentSet;
}
function setCurrentSet(toolbar, /*array*/currentSet) {
    currentSet = currentSet.length ? currentSet.join(',') : '__empty';
    toolbar.setAttribute('currentset', currentSet);
    // Save position
    toolbar.ownerDocument.persist(toolbar.id, 'currentset');
}

// Change the currentset attribute of a toolbar.
function moveWidgetToToolbar(config) {
    let { toolbarID, insertbefore, widgetId, forceMove, weakmap } = config;
    let movedWidgets = 0;

    // Go through all windows, and set the currentset attribute of the <toolbar>
    // with ID toolbarID (unless a different toolbar has contains the widget,
    //   and forceMove is false)
    windowsLoop: for (let window of winUtils.windows()) {
        if (window === null || window.location != browserURL) continue;

        // Skip window if forceMove is false and it was already seen
        if (!forceMove && weakmap.has(window)) continue;
        weakmap.set(window, '');

        for (let toolbar of window.document.getElementsByTagNameNS(NS_XUL, 'toolbar')) {
            let currentSet = getCurrentSet(toolbar);
            let index = currentSet.indexOf(widgetId);
            if (~index) { // Toolbar contains widget...
                if (toolbar.getAttribute('id') != toolbarID && forceMove) {
                    currentSet.splice(index, 1);
                    setCurrentSet(toolbar, currentSet);
                    // Now put the widget on the desired toolbar
                    saveWidgetToToolbar(window.document);
                }
                continue windowsLoop;
            }
        }
        // Didn't find any toolbar matching the ID.
        saveWidgetToToolbar(window.document);
    }
    function saveWidgetToToolbar(document) {
        let toolbar = document.getElementById(toolbarID);
        // TODO: Remove console.error, or emit error events?
        if (!toolbar) {
            console.error('No toolbar found with ID "' + toolbarID + '"!');
            return;
        }
        if (!/^toolbar$/i.test(toolbar.tagName)) { // TODO: Is this check needed?
            console.error('Element with ID "' + toolbarID + '" is not a <toolbar>!');
            return;
        }
        let currentSet = getCurrentSet(toolbar);
        let index = -1;
        // Insert element before first found insertbefore, if specified.
        for (let beforeElementId of insertbefore) {
            if ((index = currentSet.indexOf(beforeElementId)) !== -1) {
                break;
            }
        }
        if (index !== -1) {
            currentSet.splice(index, 0, widgetId);
        } else {
            currentSet.push(widgetId);
        }
        setCurrentSet(toolbar, currentSet);
        ++movedWidgets;
    }
    return movedWidgets;
}

// Ensures that all widgets has the following height
// Return the smallest height of all changed buttons
function setWidgetHeight(options) {
    let { widgetId, height } = options;
    let minHeight = height;

    // If you're on private browsing mode, winUtils.windows
    // Does not correctly give you all the private windows even if you've
    // selected the permissions so we will ensure that at least the current
    // window has the correct toolbar widget by building an array of windows
    // manually
    let currentWin = winUtils.getFocusedWindow();
    let windows = winUtils.windows();

    // Only add the current window if it isn't already found
    if (windows.indexOf(currentWin) === -1) {
        windows.push(currentWin);
    }
    for (let window of windows) {
        if (window === null || window.location != browserURL) continue;
        let widget = window.document.getElementById(widgetId);
        if (widget) {
            let iframe = widget.querySelector('iframe');
            if (!iframe) continue;
            let _height = height;

            // Make sure that the widget is not too large
            // NOTE: The following assumes that the button is already sufficiently small.
            // If the toolbar's height is reduced, the following piece of code will not
            // shrink the widget.
            let toolbarHeight = widget.parentNode.getBoundingClientRect().height;
            if (toolbarHeight && _height > toolbarHeight) {
                _height = toolbarHeight;
                minHeight = _height;
            }

            let heightPx = _height + 'px';

            if (iframe.style.height != heightPx) {
                // Update one-time properties from widget.js, methods _createNode and .fill
                iframe.style.height = iframe.style.maxHeight = heightPx;
                if (parseFloat(widget.style.minHeight) > height) {
                    widget.style.minHeight = heightPx;
                }
            }
        }
    }
    return minHeight;
}

function validateHeight(height) {
    if (typeof height != 'number' || height < 0 || isNaN(height) || !isFinite(height)) {
        throw new Error('ToolbarWidget.height is not a number ' + height);
    }
    return true;
}

// Identical to sdk/widget, with one addition:
// - optional string toolbarID
// - optional string or array of strings insertbefore
// - optional boolean forceMove
// - optional number height
exports.ToolbarWidget = function(options) {
    let config;
    let minHeight = 16; // Default height according to sdk/widget.js
    if (options) {
        if ('height' in options) validateHeight(options.height);
        config = {
            height: options.height,

            toolbarID: options.toolbarID,
            insertbefore: options.insertbefore || [],
            widgetId: getWidgetId(options.id), // ID of <toolbaritem> XUL element
            forceMove: !!options.forceMove,
            weakmap: new WeakMap() // Used to request a movement only once if forceMove is false
        };
        if (!Array.isArray(config.insertbefore)) {
            config.insertbefore = [config.insertbefore];
        }
        if (config.toolbarID)
            moveWidgetToToolbar(config);
    }
    let sdkWidget = require('sdk/widget').Widget(options);
    if (config) {
        let updateWidgetHeight = function() {
            if (!config.height) return;
            minHeight = setWidgetHeight(config);
            // TODO: Detect toolbar size preference change and check if button still fits
            // in the toolbar?
            // TODO: Emit resize event? What if someone wants to maintain a square button?
            // Just use an onAttached event and read the value of widget.minHeight.
        };
        // Watch new windows and apply position
        if (config.toolbarID || config.height) {
            let onNewWindow = function() {
                if (config.toolbarID)
                    moveWidgetToToolbar(config);
                updateWidgetHeight();
            };
            browserWindows.on('open', onNewWindow);
            sdkWidget.on('destroy', function() {
                browserWindows.off('open', onNewWindow);
            });
        }
        updateWidgetHeight();

        // Add extra properties to returned object
        Object.defineProperties(sdkWidget, {
            toolbarID: {
                get: function() config.toolbarID,
                enumerable: true
            },
            insertbefore: {
                get: function() config.insertbefore.slice(),
                enumerable: true
            },
            forceMove: {
                get: function() config.forceMove,
                set: function(val) config.forceMove = !!val,
                enumerable: true
            },
            height: {
                get: function() config.height,
                set: function(val) {
                    if (validateHeight(val)) {
                        config.height = val;
                        setWidgetHeight(config);
                    }
                },
                enumerable: true
            },
            minHeight: {
                get: function() minHeight,
                enumerable: true
            }
        });
    }
    return sdkWidget;
};
// For testing purposes, define a hidden property:
Object.defineProperty(exports, 'getWidgetId', {
    get: function() getWidgetId
});
