var firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver');
var test = require('selenium-webdriver/testing/assert');

var profile = new firefox.Profile();
profile.addExtension('../build/duckduckgo_plus.xpi');

//var binary = new firefox.Binary("/Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin");
var options = new firefox.Options()
//	.setBinary(binary)
	.setProfile(profile);
var driver = new firefox.Driver(options);

var capabilities = webdriver.Capabilities.firefox();
capabilities.set('firefox_profile', profile);

var wd = new webdriver.Builder()
	.forBrowser('firefox')
	.withCapabilities(capabilities)
	.build();


wd.get("resource://jid1-zadieub7xozojw-at-jetpack/data/html/popup.html");
test(driver.findElement(new webdriver.By('id','search_form_homepage')));
