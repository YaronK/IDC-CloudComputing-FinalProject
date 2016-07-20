module.exports = {
    getS3FileNames: function (s3, directoryPrefix, onSuccess, onFailure) {
        s3.listObjects({ Prefix: directoryPrefix }, function (err, data) {
            if (err) { onFailure(err) }
            else {
                var keys = data.Contents.map(function (object) { return object.Key; });
                keys.splice(keys.indexOf(directoryPrefix), 1);
                var fileNames = keys.map(function (key) { return key.substring(directoryPrefix.length) });
                onSuccess(fileNames);
            }
        });
    }
};