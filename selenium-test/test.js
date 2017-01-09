var firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver');
var assert = require('selenium-webdriver/testing/assert');

var profile = new firefox.Profile();
profile.addExtension('../build/duckduckgo_plus.xpi');

var options = new firefox.Options().setProfile(profile);
var driver = new firefox.Driver(options);

var capabilities = webdriver.Capabilities.firefox();
capabilities.set('firefox_profile', profile);

var wd = new webdriver.Builder()
	.forBrowser('firefox')
	.withCapabilities(capabilities)
	.build();


wd.get("resource://jid1-zadieub7xozojw-at-jetpack/data/html/popup.html");
assert(driver.findElement(new webdriver.By('id','search_form_homepage')));
