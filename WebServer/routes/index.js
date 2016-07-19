var
  AWS = require('aws-sdk'),
  config = require("../config"),
  express = require('express'),
  fs = require('fs'),
  log = require('../log'),
  multer = require('multer'),
  router = express.Router();

AWS.config.region = config.aws.region;

var s3 = new AWS.S3({
  params: { Bucket: config.aws.s3.bucket },
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});
var s3bucketHref = s3.endpoint.href + config.aws.s3.bucket + "/";
var sqs = new AWS.SQS({ params: { QueueUrl: config.aws.sqs.queueUrl } });

var upload = multer({ dest: 'uploads/' });

var datasetsS3Prefix = "datasets/";
var resultsS3Prefix = "results/";

function getFileNames(directoryPrefix, onSuccess, onFailure) {
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

function renderError(res, err) { res.render('error', { message: err.message, error: err }); }
function renderAllResults(res) {
  getFileNames(
    resultsS3Prefix,
    function (fileNames) { res.render('all-results', { resultIds: fileNames }); },
    function (err) { log(err); renderError(res, err); }
  );
}

router.get('/', function (req, res) { renderAllResults(res); });

router.get('/all-results', function (req, res) { renderAllResults(res); });

router.get('/single-result/:resultId', function (req, res) { res.render('single-result', { resultId: req.params.resultId }); });

router.get('/single-result-data/:resultId', function (req, res) { s3.getObject({ Key: resultsS3Prefix + req.params.resultId }).createReadStream().pipe(res); });

router.get('/cluster-dataset', function (req, res) {
  getFileNames(
    datasetsS3Prefix,
    function (fileNames) { res.render('cluster-dataset', { dataset_names: fileNames }); },
    function (err) { log(err); renderError(res, err); }
  );
});

router.post('/cluster-dataset', function (req, res) {
  sqs.sendMessage(
    {
      MessageBody: JSON.stringify({
        dataset: req.body["dataset-name"],
        method: req.body["clustering-method"],
        params: { kNum: req.body["k-means-k"] }
      })
    },
    function (err, data) {
      if (err != null) { renderError(res, err); }
      else { res.render('cluster-dataset', { message: "Queued request." }); }
    });
});

router.get('/upload-dataset', function (req, res) { res.render('upload-dataset'); });

router.post('/upload-dataset', upload.single('dataset-file'), function (req, res) {
  var localFilePath = req.file.path;
  var remoteFilePath = datasetsS3Prefix + req.file.originalname;

  s3.upload({ Key: remoteFilePath, Body: fs.createReadStream(localFilePath) }).
    send(function (err, data) {
      if (err != null) { renderError(res, err); }
      else {
        fs.unlink(localFilePath);
        res.render('upload-dataset', { message: "Uploaded dataset." });
      }
    });
});

module.exports = router;
