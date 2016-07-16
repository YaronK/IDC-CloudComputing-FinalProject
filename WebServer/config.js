var config = {}

config.aws = {};
config.aws.region = "us-west-2";

config.aws.sqs = {};
config.aws.sqs.queueUrl = "https://sqs.us-west-2.amazonaws.com/247705104231/Ex1WorkerQueue";

config.aws.s3 = {};
config.aws.s3.bucket = "idc-clustering-madness";

module.exports = config;