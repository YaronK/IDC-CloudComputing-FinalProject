var s3Utilities = require('../s3-utilities');

function merge_options(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

function select_tab(selected_tab) {
    var arguments = {
        upload_dataset_td: "tab_wide menu_tab",
        cluster_dataset_td: "tab_wide menu_tab",
        all_results_td: "tab_wide menu_tab",
    };

    if (selected_tab === 'upload-dataset') {
        arguments.upload_dataset_td += " selected_tab";
        arguments.upload_dataset_a = "selected_tab";
    }
    else if (selected_tab === 'cluster-dataset') {
        arguments.cluster_dataset_td += " selected_tab";
        arguments.cluster_dataset_a = "selected_tab";
    }
    else {
        arguments.all_results_td += " selected_tab";
        arguments.all_results_a = "selected_tab";
    }

    return arguments;
}

module.exports = {

    renderAllResultsView: function (res, s3, resultsS3Prefix) {
        s3Utilities.getFileNames(
            s3,
            resultsS3Prefix,
            function (fileNames) { res.render('all-results', merge_options({ resultIds: fileNames }, select_tab('all-results'))); },
            function (err) { log(err); renderErrorView(res, err); }
        );
    },

    renderErrorView: function (res, err) {
        res.render('error', { message: err.message, error: err });
    },

    renderClusterDatasetView: function (res, datasetNames, message) {
        res.render('cluster-dataset', merge_options({ dataset_names: datasetNames, message: message }, select_tab('cluster-dataset')));
    },

    renderSingleResultView: function (res, resultId) {
        res.render('single-result', merge_options({ resultId: resultId }, select_tab('all-results')));
    },

    renderUploadDatasetView: function (res, message) {
        res.render('upload-dataset', merge_options({ message: message }, select_tab('upload-dataset')));
    },
};