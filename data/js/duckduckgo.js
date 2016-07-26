self.port.emit('loaded');
self.port.on('on-install', function() {
  var i = new Image();
  i.src = 'https://duckduckgo.com/t/exti?' + Math.ceil(Math.random() * 1e7);
});
