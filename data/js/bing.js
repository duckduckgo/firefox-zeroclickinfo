self.port.emit('get-options');
var options = [];
self.port.on('set-options', function(opt){
    options = opt;
});

var ddgBox = new DuckDuckBox('q', [], 'results', false);

ddgBox.search = function(query) {

    self.port.emit('load-results', {'query': query});
    self.port.on('results-loaded', function(data) {
        //console.log('got data for ', query,':', JSON.stringify(data));
        ddgBox.renderZeroClick(data.response, query);
    });

    if (options.dev)
        console.log("query:", query);
}

var ddg_timer;

function getQuery(direct) {
    var instant = document.getElementsByClassName("gssb_a");
    if (instant.length !== 0 && !direct){
        var selected_instant = instant[0];
        
        var query = selected_instant.childNodes[0].childNodes[0].childNodes[0].
                    childNodes[0].childNodes[0].childNodes[0].innerHTML;
        query = query.replace(/<\/?(?!\!)[^>]*>/gi, '');

        if(options.dev)
            console.log(query);

        return query;
    } else {
        return document.getElementsByName('q')[0].value;
    }
}

function qsearch(direct) {
    var query = getQuery(direct);
    ddgBox.lastQuery = query;
    ddgBox.search(query);
} 

// instant search
document.getElementsByName('q')[0].onkeyup = function(e){

    query = getQuery();
    if(ddgBox.lastQuery !== query && query !== '')
        ddgBox.hideZeroClick();

    if(options.dev)
        console.log(e.keyCode);

    var direct = false;
    if(e.keyCode == 40 || e.keyCode == 38)
        direct = true;

    clearTimeout(ddg_timer);
    ddg_timer = setTimeout(function(){
        qsearch(direct);
    }, 700);
};

document.getElementsByName("go")[0].onclick = function(){
    qsearch();
};

ddgBox.init();

