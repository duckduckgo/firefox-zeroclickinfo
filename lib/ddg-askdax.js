
exports.create = function () {
    menuItem = contextMenu.Item({
        label: "Ask DuckDuckGo about that",
        context: contextMenu.SelectionContext(),
        contentScript:'self.on("context", function () {' +
                 '  var input = window.getSelection().toString();' +
                 '  self.postMessage(input);' +
                 '  return true;' +
                 '});' +
                 ' self.on("click", function(){ ' +
                 ' var input = window.getSelection().toString(); ' +
                 ' window.open("https://duckduckgo.com/?q=" + input + "' + PARTNER_QUERY_ADDITION + '", "_blank");' +
                 ' });',
        image: self.data.url('img/icon_16.png'),
        onMessage: function(msg){
            res = result(msg);
            if (res !== null && res[0] !== '' && res[0] !== undefined) {
                this.label = res[0];
                this.image = self.data.url('img/icon_16.png'); // res[1]
            } else {
                this.image = self.data.url('img/icon_16.png');
                this.label = 'Ask Dax about ' + msg ;
            }
        }
    });
}

exports.destroy = function() {
    menuItem.destroy();
}
