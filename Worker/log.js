var fs = require('fs');

var log = function(entry) {
    console.log(entry);
    if (entry.stack){
        console.log(entry.stack);
    }
    fs.appendFileSync('/tmp/app-log.log', new Date().toISOString() + ' - ' + entry + '\n');
};

module.exports = log;