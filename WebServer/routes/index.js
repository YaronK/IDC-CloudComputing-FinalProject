var
  AWS = require('aws-sdk'),
  config = require("../config"),
  express = require('express'),
  fs = require('fs'),
  log = require('../log'),
  multer = require('multer'),
  rendering = require('../views/rendering'),
  s3Utilities = require('../s3-utilities');

AWS.config.region = config.aws.region;

var
  router = express.Router(),
  upload = multer({ dest: 'uploads/' }),
  s3 = new AWS.S3({
    params: { Bucket: config.aws.s3.bucket },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }),
  sqs = new AWS.SQS({
    params: { QueueUrl: config.aws.sqs.queueUrl },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
  });

var
  datasetsS3Prefix = "datasets/",
  resultsS3Prefix = "results/";

router.get('/', function (req, res) { rendering.renderAllResultsView(res, s3, resultsS3Prefix); });

router.get('/all-results', function (req, res) { rendering.renderAllResultsView(res, s3, resultsS3Prefix); });

router.get('/single-result/:resultId', function (req, res) { rendering.renderSingleResultView(res, req.params.resultId) });

router.get('/single-result-data/:resultId', function (req, res) { s3.getObject({ Key: resultsS3Prefix + req.params.resultId }).createReadStream().pipe(res); });

router.get('/cluster-dataset', function (req, res) {
  s3Utilities.getFileNames(
    s3,
    datasetsS3Prefix,
    function (fileNames) { rendering.renderClusterDatasetView(res, fileNames, null); },
    function (err) { log(err); rendering.renderErrorView(res, err); }
  );
});

router.post('/cluster-dataset', function (req, res) {
  sqs.sendMessage(
    {
      MessageBody: JSON.stringify({
        dataset: req.body["dataset-name"],
        method: req.body["clustering-method"],
        params: {
          kNum: req.body["k-means-k"],
          clusterMembers: req.body["clusterMembers"],
          clusterRadius: req.body["clusterRadius"]
        }
      })
    },
    function (err, data) {
      if (err != null) { rendering.renderErrorView(res, err); }
      else { rendering.renderClusterDatasetView(res, null, "Queued request."); }
    });
});

router.get('/upload-dataset', function (req, res) { rendering.renderUploadDatasetView(res) });

router.post('/upload-dataset', upload.single('dataset-file'), function (req, res) {
  var localFilePath = req.file.path;
  var remoteFilePath = datasetsS3Prefix + req.file.originalname;

  s3.upload({ Key: remoteFilePath, Body: fs.createReadStream(localFilePath) }).
    send(function (err, data) {
      if (err != null) { rendering.renderErrorView(res, err); }
      else {
        fs.unlink(localFilePath);
        rendering.renderUploadDatasetView(res, "Uploaded dataset.");
      }
    });
});

module.exports = router;
