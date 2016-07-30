var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    log = require('./log.js'),
    process = require('process'),
    csvParse = require('csv-parse'),
    clustering = require('density-clustering'),
    kmeans = require('node-kmeans');

var app = express();

AWS.config.region = config.aws.region;
var s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

app.get('/', bodyParser.json(), function (request, response) {
    response.status(200).end();
});

app.post('/', bodyParser.json(), function (request, response) {
    var inputFilePath = "datasets/" + request.body.dataset;

    // Fetching requested object
    s3.getObject({ Key: inputFilePath }, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log("Succeeded reading csv file from s3");
            csvParse(data.Body.toString(), {}, function (err, data) {
                firstRow = data.shift();
                initiateClustering(request, response, data, firstRow, inputFilePath)
            });
        };
    });
});

function initiateClustering(request, response, data, firstRow, inputFilePath) {
    console.log("Initating clustering method");
    var method = request.body.method.toString();
    console.log("Starting " + method + " Clustering, with " + inputFilePath + " as dataset");

    if (request.body.method.toString() == "k-means") {
        var kNum = request.body.params.kNum,
            outputFilePath = inputFilePath.replace('datasets/', 'results/').replace('csv', method + "." + kNum + ".csv");

        kMeansClustering(data, firstRow, kNum, outputFilePath, response);
    }
    // Method is ether DBSCAN or OPTIC
    else {
        var clusterRadius = request.body.params.clusterRadius,
            clusterMembers = request.body.params.clusterMembers,
            outputFilePath = inputFilePath.replace('datasets/', 'results/').replace('csv', method + "." +
                clusterRadius + "." + clusterMembers + ".csv");

        if (request.body.method.toString() == "DBSCAN") {
            DbscanClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers);
        };

        if (request.body.method.toString() == "OPTIC") {
            OpticClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers);
        };
    };
}

function DbscanClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers) {
    console.log("Performing DBSCAN Clustering");
    var dbscan = new clustering.DBSCAN();
    var result = data;

    var clusters = dbscan.run(data, clusterRadius, clusterMembers);

    RefactoringResults(clusters, firstRow, result, outputFilePath);
}

function OpticClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers) {
    console.log("Performing Optic Clustering");

    var optics = new clustering.OPTICS();
    var result = data;

    var clusters = optics.run(data, 600, 20);
    var plot = optics.getReachabilityPlot();

    RefactoringResults(clusters, firstRow, result, outputFilePath, response);
}

function RefactoringResults(clusters, firstRow, result, outputFilePath, response) {
    for (var i = 0; i < clusters.length; i++) {
        cluster = clusters[i];
        for (var j = 0; j < cluster.length; j++) {
            clusterMember = cluster[j];
            var clusterName = "Cluster " + (i).toString();
            result[clusterMember].push(clusterName);
        };
    };

    UploadingResults(firstRow, result, outputFilePath, response);
}
function kMeansClustering(data, firstRow, kNum, outputFilePath, response) {
    console.log("Performing K Means Clustering");
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
            UploadingResults(firstRow, result, outputFilePath, response);
        }
    });
}

function UploadingResults(firstRow, result, outputFilePath, response) {
    console.log("Uploading Results");
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
}

app.listen(process.env.PORT || '3000');