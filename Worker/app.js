var
    AWS = require('aws-sdk'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    express = require('express'),
    fs = require('fs'),
    log = require('./log.js'),
    process = require('process'),
    csv = require("fast-csv"),
    kMeans = require('kmeans-js');

var app = express();

AWS.config.region = config.aws.region;
var s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

app.get('/', bodyParser.json(), function (request, response) {
    var filename = "test.csv"
    var inputFilePath = filename
    var params = {Key: inputFilePath};
    output_path = "C:\\Users\\gilad\\Desktop\\" + filename;

    //Get csv file from S3

    var file = fs.createWriteStream(output_path);
    file.on('close', function(){
        console.log('done');  //prints, file created
    });

    s3.getObject(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else{
        console.log("Succsess reading csv file from s3");
        console.log(data);
        
        
        };     
    });
    
    s3.getObject(params).createReadStream(function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else{
        console.log("Succsess reading csv file from s3");
        console.log(data);
        
        
        };     
    });

    s3.getObject(params).createReadStream().pipe(file);



    // Read csv file from disk 
    fs.createReadStream(output_path)
        .pipe(csv())
        .on("data", function(data){
        console.log(data);
        })
        .on("end", function(){
            console.log("done");
        });

    request.on('end', function () {
        response.sendStatus(200);
    });
    
  

});

app.post('/', bodyParser.json(), function (request, response) {
    console.log("Received message, body:" + JSON.stringify(request.body));

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