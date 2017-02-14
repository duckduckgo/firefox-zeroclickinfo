var firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver');
var assert = require('selenium-webdriver/testing/assert');
var until = webdriver.until;
var By = webdriver.By;
var process = require('process');
var env = process.env;

var ddgEmail = env.DDG_TEST_EMAIL;
var ddgEmailPw = env.DDG_TEST_EMAIL_PW;

if(!ddgEmail || !ddgEmailPw){
    console.log('Missing login user and pass');
    process.exit(1);
}

var profile = new firefox.Profile();
profile.addExtension( __dirname + '/../build/duckduckgo_plus.xpi');

var options = new firefox.Options().setProfile(profile);
var driver = new firefox.Driver(options);
var capabilities = webdriver.Capabilities.firefox();
capabilities.set('firefox_profile', profile);

var wd = new webdriver.Builder()
	.forBrowser('firefox')
	.setFirefoxOptions(options)
	.build();

wd.get('http://google.com');
wd.findElement({id: 'gb_70'}).click().then(function() {
        wd.wait(until.elementLocated( By.id('Email')), 2000).then(function(emailBox) {
            emailBox.sendKeys(ddgEmail);
            wd.findElement({id: 'next'}).click();

            wd.wait(until.elementLocated( By.id('Passwd')), 2000).then(function(passwordBox){
                wd.wait(until.elementIsVisible(passwordBox), 2000).then(function(passwordBox){
                    passwordBox.sendKeys(ddgEmailPw);
                    wd.findElement({id: 'signIn'}).click();

                    wd.wait(until.elementLocated( By.className('gb_b gb_eb gb_R')), 2000, 'User icon should exist').then(function(userIcon) {
                        userIcon.click();
                            
                        wd.wait(until.elementLocated( By.id('signout')), 2000, 'Signout button should exist').then( function(logoutBtn){
                            wd.wait(until.elementIsVisible(logoutBtn), 2000).then( function(logoutBtn) {
                                logoutBtn.click();
                                wd.wait(until.elementLocated( By.id('gb_70')), 2000, 'Signin button should exist');
                            });
                        });

                    });
                });
            });
        });
});

