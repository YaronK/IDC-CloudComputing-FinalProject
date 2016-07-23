var log = require('./log');
var redis = require('redis');

var redisClient = redis.createClient();
redisClient.flushall();

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

var fileNamesCacheKeyFormat = "{0}.FileNames";

function tryGetKeyFromCache(key, onDataCallback, getDataCallback) {
    redisClient.get(key, function (err, reply) {
        if (reply != null) {
            log("Getting {0} from cache.".format(key));
            onDataCallback(JSON.parse(reply));
        }
        else {
            if (err) { log("Error using cache (regarding as a cache miss)."); }
            else { log("{0} was not found in cache.".format(key)); }
            getDataCallback(function (data) {
                log("Setting {0} from cache.".format(key));
                redisClient.set(key, JSON.stringify(data));
                onDataCallback(data);
            });
        }
    });
}

function getFileNamesFromS3(s3, directoryPrefix, onDataCallback) {
    s3.listObjects({ Prefix: directoryPrefix }, function (err, data) {
        if (err) { log(err) }
        else {
            var keys = data.Contents.map(function (object) { return object.Key; });
            keys.splice(keys.indexOf(directoryPrefix), 1);
            var fileNames = keys.map(function (key) { return key.substring(directoryPrefix.length) });
            onDataCallback(fileNames);
        }
    });
}

module.exports = {
    getFileNames: function (s3, directoryPrefix, onSuccess) {
        tryGetKeyFromCache(
            fileNamesCacheKeyFormat.format(directoryPrefix),
            onSuccess,
            function (onDataCallback) {
                getFileNamesFromS3(s3, directoryPrefix, onDataCallback);
            }
        );
    }
};