var s3Utilities = require('../s3-utilities');

module.exports = {
    renderAllResultsView: function (res, s3, resultsS3Prefix) {
        s3Utilities.getS3FileNames(
            s3,
            resultsS3Prefix,
            function (fileNames) { res.render('all-results', { resultIds: fileNames }); },
            function (err) { log(err); renderErrorView(res, err); }
        );
    },

    renderErrorView: function (res, err) {
        res.render('error', { message: err.message, error: err });
    },

    renderClusterDatasetView: function (res, datasetNames, message) {
        res.render('cluster-dataset', { dataset_names: datasetNames, message: message });
    },

    renderSingleResultView: function (res, resultId) {
        res.render('single-result', { resultId: resultId });
    },

    renderUploadDatasetView: function (res, message) {
        res.render('upload-dataset', { message: message });
    },
};