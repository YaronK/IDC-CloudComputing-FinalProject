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

AWS.config.accessKeyId = config.aws.accessKeyId;
AWS.config.secretAccessKey = config.aws.secretAccessKey;
AWS.config.region = config.aws.region;

var s3 = new AWS.S3({ params: { Bucket: config.aws.s3.bucket } });

app.post('/', bodyParser.json(), function (request, response) {
    var inputFilePath = "datasets/" + request.body.dataset;
    log("Recieved post request: " + inputFilePath);

    s3.getObject({ Key: inputFilePath }, function (err, data) {
        if (err) log(err);
        else {
            log("Fetched csv file from s3.");
            csvParse(data.Body.toString(), {}, function (err, data) {
                clusterData(request, response, inputFilePath, data);
            });
        };
    });
});

function clusterData(request, response, inputFilePath, data) {
    var firstRow = data.shift();
    var method = request.body.method.toString();
    var params = request.body.params;

    sendSMS(inputFilePath, method);

    log("Starting " + method + " Clustering, with " + inputFilePath + " as dataset");

    if (method == "k-means") {
        var kNum = params.kNum;
        var resultFilePath = inputFilePath.replace('datasets/', 'results/').replace('csv', method + "." + kNum + ".csv");

        kMeansClustering(data, firstRow, kNum, resultFilePath, response);
    }
    else {
        var clusterRadius = params.clusterRadius;
        var clusterMembers = params.clusterMembers;
        var resultFilePath = inputFilePath.replace('datasets/', 'results/').replace('csv', method + "." + clusterRadius + "." + clusterMembers + ".csv");

        if (method == "DBSCAN") {
            dbscanClustering(data, firstRow, resultFilePath, response, clusterRadius, clusterMembers);
        }
        else //(method == "OPTIC") 
        {
            opticClustering(data, firstRow, resultFilePath, response, clusterRadius, clusterMembers);
        };
    };
}

function kMeansClustering(data, firstRow, kNum, outputFilePath, response) {
    log("Performing K Means Clustering");
    var vectors = data;
    var result = data;

    kmeans.clusterize(vectors, { k: kNum }, (err, res) => {
        if (err) log(err);
        else {
            for (var i = 0; i < res.length; i++) {
                clusterIds = res[i].clusterInd;
                for (var j = 0; j < clusterIds.length; j++) {
                    clusterId = clusterIds[j];
                    var clusterName = "Cluster " + (i).toString();
                    result[clusterId].push(clusterName);
                };
            };
            uploadResults(firstRow, result, outputFilePath, response);
        }
    });
}

function dbscanClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers) {
    log("Performing DBSCAN Clustering");
    var dbscan = new clustering.DBSCAN();
    var result = data;

    var clusters = dbscan.run(data, clusterRadius, clusterMembers);

    refactorResults(clusters, firstRow, result, outputFilePath);
}

function opticClustering(data, firstRow, outputFilePath, response, clusterRadius, clusterMembers) {
    log("Performing Optic Clustering");

    var optics = new clustering.OPTICS();
    var result = data;

    var clusters = optics.run(data, 600, 20);

    refactorResults(clusters, firstRow, result, outputFilePath, response);
}

function refactorResults(clusters, firstRow, result, outputFilePath, response) {
    for (var i = 0; i < clusters.length; i++) {
        cluster = clusters[i];
        for (var j = 0; j < cluster.length; j++) {
            clusterMember = cluster[j];
            var clusterName = "Cluster " + (i).toString();
            result[clusterMember].push(clusterName);
        };
    };

    uploadResults(firstRow, result, outputFilePath, response);
}

function uploadResults(firstRow, result, outputFilePath, response) {
    log("Uploading Results");
    // Create first row of parameters
    firstRow.push("clusterIndex");
    result.unshift(firstRow);

    // Parse results into a csv format
    var lineArray = [];
    result.forEach(function (infoArray, index) {
        var line = infoArray.join(",");
        lineArray.push(index == 0 ? "" + line : line);
    });

    s3.putObject({ Key: outputFilePath, Body: lineArray.join("\n") }, function (err) {
        log("Successfully uploaded csv to s3");
        response.status(200).end();
    });
}

function sendSMS(dataset, method) {
    log("Trying to send SMS");
    var sns = new AWS.SNS({ region: 'us-west-2' });
    sns.publish({
        TargetArn: 'arn:aws:sns:us-west-2:079044478150:idc_cloudComputing_YaronKaner_GiladLevy_FP',
        Message: "Succeeded clustering the dataset: " + dataset + " with " + method + " method",
        Subject: "ClusteringMadness"
    },
        function (err, data) {
            if (err) {
                log("Error sending a message " + err);
            } else {
                log("Sent message: " + data.MessageId);
            }
        });
}

app.listen(process.env.PORT || '3000');