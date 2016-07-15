var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    log = require('./log.js'),
    process = require('process');
    kMeans = require('kmeans-js');

var app = express();

AWS.config.region = config.aws.region;
var s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

app.post('/', bodyParser.json(), function (request, response) {
    log("Received message, body:" + JSON.stringify(request.body));

    // var fileName = request.body.fileName,
    //    inputFilePath = "input/" + fileName,
    //    outputFilePath = "output/" + fileName,
    //    tempFilePath = "/tmp/" + fileName;

    var filename = "test.csv"

    s3.getObject({ Key: inputFilePath }, function (err, data) {
        if (err) { log(err); return; }

            console.log(data)
            /** 
            var data = [[1, 2, 3], [69, 10, 25]];
            var km = new kMeans({
                K: 2
            });

            km.cluster(data);
            while (km.step()) {
                km.findClosestCentroids();
                km.moveCentroids();

                console.log(km.centroids);

                if(km.hasConverged()) break;
            }

            console.log('Finished in:', km.currentIteration, ' iterations');
            console.log(km.centroids, km.clusters);
            */
        s3.deleteObject({ Key: inputFilePath }, function (err) { if (err) log(err); });
    });

    request.on('end', function () {
        response.sendStatus(200);
    });
});

app.listen(process.env.PORT || '3000');