var firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver');
var assert = require('selenium-webdriver/testing/assert');
var until = webdriver.until;
var By = webdriver.By;
var process = require('process');
var env = process.env;
var fs = require('fs');

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

var ids = {
    loginBtn: 'gb_70',
    emailBox: 'Email',
    emailSubmitBtn: 'next',
    passwdBox: 'Passwd',
    passSubmitBtn: 'signIn',
    userIcon: 'gb_9a gbii',
    userModal: 'gb_mb gb_ha gb_g',
    signOutBtn: 'gb_71'
};

wd.get('http://google.com');
wd.findElement({id: ids.loginBtn}).click().then(function() {
        wd.wait(until.elementLocated( By.id(ids.emailBox)), 4000).then(function(emailBox) {
            emailBox.sendKeys(ddgEmail);
            wd.findElement({id: ids.emailSubmitBtn}).click();


            wd.wait(until.elementLocated( By.id(ids.passwdBox)), 2000).then(function(passwordBox){
                wd.wait(until.elementIsVisible(passwordBox), 2000).then(function(passwordBox){
                    passwordBox.sendKeys(ddgEmailPw);
                    wd.findElement({id: ids.passSubmitBtn}).click();

                    wd.wait(until.elementLocated( By.className(ids.userIcon)), 4000, 'User icon should exist').then(function(userIcon) {
                        // wait for page to completely load
                        wd.sleep(4000).then(function(){
                            wd.findElement(By.className('gb_9a gbii')).click();
                            wd.findElement(By.className('gb_9a gbii')).click();
                            
                            // wait for modal
                            wd.sleep(4000).then(function(){
                                wd.takeScreenshot().then(function(img){
                                    fs.writeFile('modal.png', img, 'base64');
                                });

                                wd.wait(until.elementLocated( By.xpath("//div[*/@aria-label='Account Information']")), 4000, 'Signout modal should exist').then( function(signoutModal){
                                    wd.wait(until.elementIsVisible(signoutModal), 4000).then( function() {

                                         wd.wait(until.elementLocated( By.id(ids.signOutBtn)), 2000, 'Signin button should exist').then(function(signoutBtn){
                                                wd.findElement(By.id(ids.signOutBtn)).click().then(function(){
                                                    
                                                    // wait for logout and take screenshot to verify
                                                    wd.sleep(5000).then(function(){
                                                        // check to see that login button is back
                                                        wd.wait(until.elementLocated(By.id(ids.loginBtn)), 2000);
                                                        wd.takeScreenshot().then(function(img2){
                                                            fs.writeFile('end.png', img2, 'base64');
                                                            wd.close();
                                                            wd.quit();
                                                        });
                                                    });
                                                });
                                        });
                                    });
                                });
                            });

                        });
                    });
                });
            });
        });
});

