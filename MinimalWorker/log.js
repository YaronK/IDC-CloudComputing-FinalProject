var fs = require('fs');

var log = function(entry) {
    fs.appendFileSync('/tmp/app-log.log', new Date().toISOString() + ' - ' + entry + '\n');
};

module.exports = log;