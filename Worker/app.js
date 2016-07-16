var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    log = require('./log.js'),
    process = require('process'),
    parse = require('csv-parse'),
    kmeans = require('node-kmeans');

var app = express();

AWS.config.region = config.aws.region;
var s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

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
    
    //Initiate parameters
    inputFilePath = inputFilePath.toString();
    var params = { Key: inputFilePath };
    outputName = inputFilePath.replace('csv', '')
    outputName = outputName.replace('datasets/', 'results/')
    var output_path = outputName + "KMean." + kNum + ".csv";

    // Get data from S3
    s3.getObject(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log("Succeeded reading csv file from s3");

            // Parse data into a csv format
            parse(data.Body.toString(), {}, function (err, output) {
                firstRow = output.shift();

                // Call KMean clustering function
                kMeanClustering(output, firstRow, kNum, output_path, response);
            });
        };
    });
}
function kMeanClustering(data, firstRow, kNum, output_path, response) {
    var vectors = data;
    var result = data;

    // K Mean Clustering
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
            var csvContent = lineArray.join("\n");

            // Uplocad csv to S3
            var uploadParams = {
                Key: output_path,
                Body: csvContent
            };
            s3.putObject(uploadParams, function (err, data) {
                console.log("Successfully uploaded csv to s3");
                response.status(200).end();
            });
        }
    });
}

app.listen(process.env.PORT || '3000');