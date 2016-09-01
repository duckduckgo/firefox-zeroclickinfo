// grab the ATB param from the html element's class
function getATBParam() {
  return document.querySelector('html').getAttribute('data-atb');
}

var atbParam = getATBParam();
self.port.emit('loaded', atbParam);
