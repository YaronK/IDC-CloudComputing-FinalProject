function getRadioButtonValue(name) {
    var radios = document.getElementsByName(name);
    for (var i = 0, length = radios.length; i < length; i++) {
        if (radios[i].checked) {
            return radios[i].value;
        }
    }
}

function setRadioButtonValue(name, index) {
    document.getElementsByName(name)[index].checked = true;
}

var firstFeatureName = "first-feature";
var secondFeatureName = "second-feature";
var labelColumnName = "species";

var graphData;

function initializeGraph(resultId) {
    d3.tsv("/single-result-data/" + resultId, function (error, data) {
        graphData = data;
        var table = d3.select("#features");
        Object.keys(data[0]).forEach(function (key) {
            if (key === labelColumnName) { return; }
            var row = table.append("tr");
            [firstFeatureName, secondFeatureName].forEach(function (feature_name) {
                var cell = row.append("td");
                cell.append("input").
                    attr("type", "radio").
                    attr("name", feature_name).
                    attr("value", key);
                cell.append("span").text(key);
            });
        });
        setRadioButtonValue(firstFeatureName, 0);
        setRadioButtonValue(secondFeatureName, 1);
    });
}

function displayGraph() {
    var firstFeature = getRadioButtonValue(firstFeatureName);
    var secondFeature = getRadioButtonValue(secondFeatureName);

    d3.select("body").select("svg").remove();

    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    graphData.forEach(function (d) {
        d[firstFeature] = +d[firstFeature];
        d[secondFeature] = +d[secondFeature];
    });

    x.domain(d3.extent(graphData, function (d) { return d[secondFeature]; })).nice();
    y.domain(d3.extent(graphData, function (d) { return d[firstFeature]; })).nice();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(secondFeature);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(firstFeature)

    svg.selectAll(".dot")
        .data(graphData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function (d) { return x(d[secondFeature]); })
        .attr("cy", function (d) { return y(d[firstFeature]); })
        .style("fill", function (d) { return color(d[labelColumnName]); });

    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) { return d; });
}