
if (typeof require == "function") {
    var { Cc, Ci, Cu, Cr, CC } = require("chrome");
    // Classy, Jetpack...
    // Steal Iterator from Services.jsm since Jetpack sees fit not to
    // provide it.
    var { Iterator } = Cu.import("resource://gre/modules/Services.jsm");
}
else {
    var { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, Constructor: CC } = Components;
}

// Import the Services module.
Cu.import("resource://gre/modules/Services.jsm");

const XMLHttpRequest = CC("@mozilla.org/xmlextras/xmlhttprequest;1");

const SupportsString = CC("@mozilla.org/supports-string;1", "nsISupportsString");
function Prefs(branch, defaults) {
    this.constructor = Prefs; // Ends up Object otherwise... Why?

    this.branch = Services.prefs[defaults ? "getDefaultBranch" : "getBranch"](branch || "");
    if (this.branch instanceof Ci.nsIPrefBranch2)
        this.branch.QueryInterface(Ci.nsIPrefBranch2);

    this.defaults = defaults ? this : new this.constructor(branch, true);
}
Prefs.prototype = {
    /**
     * Returns a new Prefs object for the sub-branch *branch* of this
     * object.
     *
     * @param {string} branch The sub-branch to return.
     */
    Branch: function Branch(branch) new this.constructor(this.root + branch),

    /**
     * Returns the full name of this object's preference branch.
     */
    get root() this.branch.root,

    /**
     * Returns the value of the preference *name*, or *defaultValue* if
     * the preference does not exist.
     *
     * @param {string} name The name of the preference to return.
     * @param {*} defaultValue The value to return if the preference has no value.
     * @optional
     */
    get: function get(name, defaultValue) {
        let type = this.branch.getPrefType(name);

        try {
            if (type === Ci.nsIPrefBranch.PREF_STRING)
                return this.branch.getComplexValue(name, Ci.nsISupportsString).data;

            if (type === Ci.nsIPrefBranch.PREF_INT)
                return this.branch.getIntPref(name);

            if (type === Ci.nsIPrefBranch.PREF_BOOL)
                return this.branch.getBoolPref(name);
        }
        catch (e if e.result == Cr.NS_ERROR_UNEXPECTED) {}

        return defaultValue;
    },

    /**
     * Returns true if the given preference exists in this branch.
     *
     * @param {string} name The name of the preference to check.
     */
    has: function has(name) this.branch.getPrefType(name) !== 0,

    /**
     * Returns an array of all preference names in this branch or the
     * given sub-branch.
     *
     * @param {string} branch The sub-branch for which to return preferences.
     * @optional
     */
    getNames: function getNames(branch) this.branch.getChildList(branch || "", { value: 0 }),

    /**
     * Returns true if the given preference is set to its default value.
     *
     * @param {string} name The name of the preference to check.
     */
    isDefault: function isDefault(name) !this.branch.prefHasUserValue(name),

    /**
     * Sets the preference *name* to *value*. If the preference already
     * exists, it must have the same type as the given value.
     *
     * @param {name} name The name of the preference to change.
     * @param {string|number|boolean} value The value to set.
     */
    set: function set(name, value) {
        let type = typeof value;
        if (type === "string") {
            let string = SupportsString();
            string.data = value;
            this.branch.setComplexValue(name, Ci.nsISupportsString, string);
        }
        else if (type === "number")
            this.branch.setIntPref(name, value);
        else if (type === "boolean")
            this.branch.setBoolPref(name, value);
        else if (value == null)
            this.reset(name);
        else
            throw TypeError("Unknown preference type: " + type);
    },

    /**
     * Sets the preference *name* to *value* only if it doesn't
     * already have that value. Avoids triggering preference observers
     * when unnecessary.
     */
    maybeSet: function maybeSet(name, value) {
        if (this.get(name) != value)
            this.set(name, value);
    },

    /**
     * Resets the preference *name* to its default value.
     *
     * @param {string} name The name of the preference to reset.
     */
    reset: function reset(name) {
        if (this != this.defaults && this.branch.prefHasUserValue(name))
            this.branch.clearUserPref(name);
    }
};

const hasOwnProperty = Function.call.bind({}.hasOwnProperty);

function isString(value) Object.prototype.toString.call(value) == "[object String]";

const SearchSettings = {
    ENGINE_ADDED: "browser-search-engine-modified",

    _observers: [],

    // Observer called after our engine has been successfully added
    observe: function SS_observe(subject, topic, data) {
        switch (topic) {
        case this.ENGINE_ADDED:
            if (data != "engine-added")
                break;

            let engine = subject.QueryInterface(Ci.nsISearchEngine);
            if (!hasOwnProperty(this.engines, engine.name))
                break;

            if (this.engines[engine.name].unprocessed)
                this._processEngine(engine);
            break;
        }
    },

    engines: {},

    _processEngine: function SS__processEngine(engine) {
        let self = this;

        let engineDetails = this.engines[engine.name];
        engineDetails.unprocessed = false;

        // If the engine is not hidden and this is the first run, move
        // it to the first position in the engine list and select it
        if (engineDetails.setDefault && !engine.hidden) {
            Services.search.moveEngine(engine, 0);
            if (self.firstRun)
                Services.search.currentEngine = engine;

            if (Services.vc.compare(Services.appinfo.platformVersion, "23.0") < 0) {
                this.setPref("browser.search.defaultenginename", engine.name, true);
                this.setPref("keyword.URL", "");
            }
        }

        for (let [, engine] in Iterator(this.engines))
            if (engine.unprocessed)
                return;
        this._removeObserver();
    },

    _addObserver: function SS__addObserver() {
        if (!~this._observers.indexOf(this.ENGINE_ADDED)) {
            Services.obs.addObserver(this, this.ENGINE_ADDED, false);
            this._observers.push(this.ENGINE_ADDED);
        }
    },

    _removeObserver: function SS__removeObserver() {
        if (~this._observers.indexOf(this.ENGINE_ADDED)) {
            Services.obs.removeObserver(this, this.ENGINE_ADDED);
            this._observers.splice(this._observers.indexOf(this.ENGINE_ADDED), 1);
        }
    },

    /**
     * Adds a new search engine and optionally sets it as the default
     * engine by which about:home and location bar searches will be
     * performed.
     *
     * @param {string|object} details The URL (within the add-on) of an
     *      OpenSearch XML search description file, or an object of the
     *      form:
     *
     *      {
     *          name: "Example Engine",
     *          iconURL: "data:image/png;base64,...",
     *          alias: "example-engine", // Used as a keyword for location bar searches
     *          description: "An example search engine",
     *          method: "GET", // The HTTP request method
     *          url: "https://www.example.com/?q=_searchTerms_"
     *      }
     * @param {boolean} default If true, this engine is set as the
     *      default search engine.
     */
    addSearchEngine: function SS_addSearchEngine(details, setDefault) {
        const ENGINE_PROPERTIES = ["name", "iconURL", "alias", "description", "method", "url"];
        let self = this;

        setDefault = Boolean(setDefault);

        if (isString(details)) {
            // Search description file URL

            let url = details;
            let xhr = XMLHttpRequest();

            xhr.open("GET", url);
            xhr.onload = function () {
                details = {
                    name: this.responseXML.querySelector(":root > ShortName").textContent,
                    unprocessed: setDefault,
                    setDefault: setDefault
                };
                self.engines[details.name] = details;

                // Only add the engine if it doesn't already exist.
                let engine = Services.search.getEngineByName(details.name);
                if (engine)
                    self._processEngine(engine);
                else {
                    // Register an observer to detect when the engine has been added, if
                    // necessary.
                    if (setDefault)
                        self._addObserver();

                    Services.search.addEngine(url, Ci.nsISearchEngine.DATA_XML,
                                              null, false);
                }
            };
            xhr.send();
        }
        else {
            // Search engine details object

            let newDetails = { setDefault: setDefault };
            ENGINE_PROPERTIES.forEach(function (prop) {
                newDetails[prop] = details[prop];
            });
            this.engines[newDetails.name] = newDetails;

            if (!Services.search.getEngineByName(details.name)) {
                Services.search.addEngineWithDetails.apply(Services.search,
                    ENGINE_PROPERTIES.map(function (k) details[k]))
            }

            this._processEngine(Services.search.getEngineByName(details.name));
        }
    },

    prefs: new Prefs(""),

    // Stores the original values of changed preferences.
    savedPrefs: {},

    /**
     * Change the default value of the preference *name* to *value*.
     * A default for this preference must exist, and it must be a
     * character preference.
     *
     * The user preference will be reset only on first run, as
     * determined by the value passed to init().
     *
     * @param {string} name The name of the preference to change.
     * @param {string|boolean|number} value The new value to set. Must
     *      be the same type as the original default, if it exists.
     * @param {boolean} localized If true, set the preference as a
     *      URL pointing to a property file, as required by the
     *      localized preference retrieval process.
     */
    setPref: function SS_setPref(name, value, localized) {
        // If this is a localized preference, transform the value into an
        // appropriate data: URL.
        if (localized)
            value = "data:text/plain," + encodeURIComponent(name + "=" + value.replace(/ /g, "\\u0020"));

        // Save the original and new values.
        this.savedPrefs[name] = [this.prefs.defaults.get(name), value];

        // Change the default
        this.prefs.defaults.set(name, value);

        // Clear the user value if this is the first run, or the
        // new default is the same as the user value.
        if (this.firstRun || this.prefs.get(name) == value)
            this.prefs.reset(name);
    },

    /**
     * Must be called at startup.
     *
     * @param {string} reason The reason that initialization is required. Must
     *    be one of:
     *
     *      startup   - The app is starting up.
     *      enable    - The add-on is being enabled.
     *      install   - The add-on is being installed.
     *      upgrade   - The add-on is being upgraded.
     *      downgrade - The add-on is being downgraded.
     */
    init: function SS_cleanup(reason) {
        if (reason == "install")
            this.firstRun = true;
    },

    firstRun: false,

    /**
     * Must be called at shutdown or when the add-on is disabled or
     * uninstalled.
     *
     * Automatically called when loaded as an Add-on SDK module.
     *
     * @param {string} reason The reason that cleanup is required. Must
     *    be one of:
     *
     *      shutdown  - The app is being shutdown.
     *      disable   - The add-on is being disabled.
     *      uninstall - The add-on is being uninstalled.
     *      upgrade   - The add-on is being upgraded.
     *      downgrade - The add-on is being downgraded.
     */
    cleanup: function SS_cleanup(reason) {
        if (reason == "shutdown")
            return;

        this._observers.forEach(function (observer) {
            Services.obs.removeObserver(this, observer);
        }, this);

        // Reset our changes if the values have not been changed
        // in the mean time.
        for (let [name, [origValue, value]] in Iterator(this.savedPrefs)) {
            if (this.prefs.defaults.get(name) == value) {
                this.prefs.defaults.set(name, origValue);
                // Clear the user value if it's the same as the default. 
                if (this.prefs.get(name) == origValue)
                    this.prefs.reset(name);
            }
        }

        // Remove our search engines on disable or uninstall
        if (~["disable", "uninstall"].indexOf(reason)) {
            for (let [name, details] in Iterator(this.engines)) {
                let engine = Services.search.getEngineByName(name);
                // Only remove the engine if it appears to be the same one we
                // added.
                if (engine && (!details.url || engine.getSubmission("_searchTerms_")
                                                     .uri.spec == details.url))
                    Services.search.removeEngine(engine);
            }
        }
    }
};

if (typeof require == "function")
    require("unload").when(SearchSettings.cleanup.bind(SearchSettings));

var EXPORTED_SYMBOLS = ["SearchSettings"];
if (typeof exports == "object")
    exports.SearchSettings = SearchSettings;
