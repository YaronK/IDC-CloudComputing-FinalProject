var
  AWS = require('aws-sdk'),
  config = require("../config"),
  express = require('express'),
  fs = require('fs'),
  log = require('../log'),
  multer = require('multer'),
  router = express.Router();

AWS.config.region = config.aws.region;
upload = multer({ dest: 'uploads/' });

var s3 = new AWS.S3({
  params: { Bucket: config.aws.s3.bucket },
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});
var s3bucketHref = s3.endpoint.href + config.aws.s3.bucket + "/";
var sqs = new AWS.SQS({ params: { QueueUrl: config.aws.sqs.queueUrl } });

function renderError(res, err) { res.render('error', { message: err.message, error: err }); }
function renderIndex(res, message) {
  s3.listObjects({ Prefix: "output/" }, function (err, data) {
    if (err) log(err);
    else {
      var keys = data.Contents.map(function (object) { return object.Key; });
      keys.splice(keys.indexOf('output/'), 1);
      var urls = keys.map(function (key) { return s3bucketHref + key; });
      res.render('index', { hrefs: urls, message: message });
    }
  });
}

router.get('/', function (req, res, next) {
  renderIndex(res, "");
});

router.post('/', upload.single('image'), function (req, res, next) {
  if (!req.file) { renderIndex(res, "Please select an image first."); return; }

  var localFilePath = req.file.path;
  var remoteFileName = req.file.filename + '.' + req.file.originalname.split('.').pop();
  var remoteFilePath = "input/" + remoteFileName;

  s3.upload({ Key: remoteFilePath, Body: fs.createReadStream(localFilePath) }).
    send(function (err, data) {
      if (err != null) { renderError(res, err); }
      else {
        fs.unlink(localFilePath);
        sqs.sendMessage(
          { MessageBody: JSON.stringify({ fileName: remoteFileName }) },
          function (err, data) {
            if (err != null) { renderError(res, err); }
            else { renderIndex(res, req.file.originalname + " uploaded successfully") }
          });
      }
    });
});

router.get('/cluster-dataset', function(req, res, next) {
  res.render('cluster-dataset', {dataset_names: ["1", "2"]});
});

router.get('/upload-dataset', function(req, res, next) {
  res.render('upload-dataset');
});

module.exports = router;
