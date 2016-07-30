var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    log = require('./log.js'),
    process = require('process'),
    csvParse = require('csv-parse'),
    kmeans = require('node-kmeans');

var app = express();

AWS.config.accessKeyId = config.aws.accessKeyId;
AWS.config.secretAccessKey = config.aws.secretAccessKey;
AWS.config.region = config.aws.region;

var s3 = new AWS.S3({ params: { Bucket: config.aws.s3.bucket } });

app.get('/', bodyParser.json(), function (request, response) {
    var kNum = 3;
    var inputFilePath = "datasets/iris.csv"
    initateKMeans(inputFilePath, kNum, response);
});

app.post('/', bodyParser.json(), function (request, response) {
    var inputFilePath = "datasets/" + request.body.dataset;
    var kNum = request.body.params.kNum;
    if (request.method.toString() == "KMean") {
        initateKMeans(inputFilePath, kNum, response);
    };
});

function initateKMeans(inputFilePath, kNum, response) {
    var outputFilePath = inputFilePath.replace('datasets/', 'results/').replace('csv', "KMean." + kNum + ".csv");

    s3.getObject({ Key: inputFilePath }, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log("Succeeded reading csv file from s3");
            csvParse(data.Body.toString(), {}, function (err, data) {
                firstRow = data.shift();
                kMeansClustering(data, firstRow, kNum, outputFilePath, response);
            });
        };
    });
}
function kMeansClustering(data, firstRow, kNum, outputFilePath, response) {
    var vectors = data;
    var result = data;

    kmeans.clusterize(vectors, { k: kNum }, (err, res) => {
        if (err) console.error(err);
        else {
            for (var i = 0; i < res.length; i++) {
                clusterIds = res[i].clusterInd;
                for (var j = 0; j < clusterIds.length; j++) {
                    clusterId = clusterIds[j];
                    var clusterName = "Cluster " + (i).toString();
                    result[clusterId].push(clusterName);
                };
            };
            // Create first row of parameters
            firstRow.push("clusterIndex");
            result.unshift(firstRow);

            // Parse results into a csv format
            var lineArray = [];
            result.forEach(function (infoArray, index) {
                var line = infoArray.join(",");
                lineArray.push(index == 0 ? "" + line : line);
            });

            // Uplocad csv to S3
            var uploadParams = {
                Key: outputFilePath,
                Body: lineArray.join("\n")
            };
            var put = s3.putObject(uploadParams, function (err, data) {
                console.log("Successfully uploaded csv to s3");
                response.status(200).end();
            });
            console.log("");
        }
    });
}

app.listen(process.env.PORT || '3000');