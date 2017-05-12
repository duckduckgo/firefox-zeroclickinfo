// grab the ATB param from the html element's class
function getATBParam() {
  return document.querySelector('html').getAttribute('data-atb');
}
function getHideToolbarIcon() {
  return document.querySelector('html').getAttribute('data-hidetoolbaricon');
}

var atbParam = getATBParam();
var hideToolbarIcon = getHideToolbarIcon();
self.port.emit('loaded', atbParam, hideToolbarIcon);
