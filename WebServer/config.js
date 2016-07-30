var config = {}

config.aws = {};
config.aws.region = "us-west-2";
config.aws.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
config.aws.secretAccessKey = process.env.AWS_SECRET_KEY;

config.aws.sqs = {};
config.aws.sqs.queueUrl = process.env.AWS_SQS_QUEUE_URL; 

config.aws.s3 = {};
config.aws.s3.bucket = process.env.AWS_S3_BUCKET;

module.exports = config;