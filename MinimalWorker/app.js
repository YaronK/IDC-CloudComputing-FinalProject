var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    im = require('imagemagick'),
    log = require('./log.js'),
    process = require('process');

var app = express();

AWS.config.region = config.aws.region;
var s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

app.post('/', bodyParser.json(), function (request, response) {
    log("Received message, body:" + JSON.stringify(request.body));

    var fileName = request.body.fileName,
        inputFilePath = "input/" + fileName,
        outputFilePath = "output/" + fileName,
        tempFilePath = "/tmp/" + fileName;

    s3.getObject({ Key: inputFilePath }, function (err, data) {
        if (err) { log(err); return; }

        im.resize({
            srcData: data.Body,
            dstPath: tempFilePath,
            width: 100
        }, function (err) {
            if (err) { log(err); return; }

            s3.upload({
                Key: outputFilePath,
                Body: fs.createReadStream(tempFilePath),
                ACL: "public-read"
            }).send(function (err) { if (err) log(err); });

            fs.unlink(tempFilePath);
        });

        s3.deleteObject({ Key: inputFilePath }, function (err) { if (err) log(err); });
    });

    request.on('end', function () {
        response.sendStatus(200);
    });
});

app.listen(process.env.PORT || '3000');