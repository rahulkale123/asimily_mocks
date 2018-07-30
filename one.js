var data = [],
    svg,
    defs,
    gBrush,
    brush,
    main_xScale,
    mini_xScale,
    main_yScale,
    mini_yScale,
    main_yAxis,
    mini_width,
    brushTotalStart,
    brushTotalEnd,
    updatedData,
    mousewheelTimer,
    scrolling = false,
    scrollEnd = false;

var colors = d3.scale.ordinal().range(["#4DAA89"]);

init();

function init() {

    //Create the random data
    for (var i = 0; i < 40; i++) {
        var my_object = {};
        my_object.key = i;
        my_object.country = makeWord(i);
        my_object.value = Math.floor(Math.random() * 600);
        data.push(my_object);
    } //for i 
    data.sort(function(a, b) { return b.value - a.value; });

    /////////////////////////////////////////////////////////////
    ///////////////// Set-up SVG and wrappers ///////////////////
    /////////////////////////////////////////////////////////////

    //Added only for the mouse wheel
    var zoomer = d3.behavior.zoom()
        .on("zoom", null);

    var main_margin = { top: 10, right: 0, bottom: 10, left: 120 },
        main_width = 550 - main_margin.left - main_margin.right,
        main_height = 250 - main_margin.top - main_margin.bottom;

    var mini_margin = { top: 10, right: 0, bottom: 10, left: 10 },
        mini_height = 250 - mini_margin.top - mini_margin.bottom;
    mini_width = 100 - mini_margin.left - mini_margin.right;

    svg = d3.select("#one").append("svg")
        .attr("class", "svgWrapper")
        .attr("width", main_width + main_margin.left + main_margin.right + mini_width + mini_margin.left + mini_margin.right)
        .attr("height", main_height + main_margin.top + main_margin.bottom)
        .call(zoomer)
        .on("wheel.zoom", scroll)
        //.on("mousewheel.zoom", scroll)
        //.on("DOMMouseScroll.zoom", scroll)
        //.on("MozMousePixelScroll.zoom", scroll)
        //Is this needed?
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);

    var mainGroup = svg.append("g")
        .attr("class", "mainGroup")
        .attr("transform", "translate(" + main_margin.left + "," + main_margin.top + ")");

    var miniGroup = svg.append("g")
        .attr("class", "miniGroup")
        .attr("transform", "translate(" + (main_margin.left + main_width + main_margin.right + mini_margin.left) + "," + mini_margin.top + ")");

    var brushGroup = svg.append("g")
        .attr("class", "brushGroup")
        .attr("transform", "translate(" + (main_margin.left + main_width + main_margin.right + mini_margin.left) + "," + mini_margin.top + ")");

    /////////////////////////////////////////////////////////////
    ////////////////////// Initiate scales //////////////////////
    /////////////////////////////////////////////////////////////

    main_xScale = d3.scale.linear().range([0, main_width]);
    mini_xScale = d3.scale.linear().range([0, mini_width]);

    main_yScale = d3.scale.ordinal().rangeRoundBands([0, main_height], 0.4, 0);
    mini_yScale = d3.scale.ordinal().rangeBands([0, mini_height], 0.4, 0);

    //Create y axis object
    main_yAxis = d3.svg.axis()
        .scale(main_yScale)
        .orient("left")
        .tickSize(0)
        .outerTickSize(0);

    //Add group for the y axis
    mainGroup.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-5,0)");

    /////////////////////////////////////////////////////////////
    /////////////////////// Update scales ///////////////////////
    /////////////////////////////////////////////////////////////

    //Update the scales
    main_xScale.domain([0, d3.max(data, function(d) { return d.value; })]);
    mini_xScale.domain([0, d3.max(data, function(d) { return d.value; })]);
    main_yScale.domain(data.map(function(d) { return d.country; }));
    mini_yScale.domain(data.map(function(d) { return d.country; }));

    //Create the visual part of the y axis
    d3.select(".mainGroup").select(".y.axis").call(main_yAxis);

    brushTotalStart = mini_yScale.domain()[0];
    brushTotalEnd = mini_yScale.domain()[1];

    /////////////////////////////////////////////////////////////
    ///////////////////////// Create brush //////////////////////
    /////////////////////////////////////////////////////////////

    //What should the first extent of the brush become - a bit arbitrary this
    var brushExtent = Math.max(1, Math.min(20, Math.round(data.length * 0.2)));

    brush = d3.svg.brush()
        .y(mini_yScale)
        .extent([mini_yScale(data[0].country), mini_yScale(data[brushExtent].country)])
        .on("brush", brushmove)
        .on("brushend", brushend);

    //Set up the visual part of the brush
    gBrush = d3.select(".brushGroup").append("g")
        .attr("class", "brush")
        .call(brush);

    gBrush.selectAll(".resize")
        .append("line")
        .attr("x2", mini_width);

    gBrush.selectAll(".resize")
        .append("path")
        .attr("d", d3.svg.symbol().type("triangle-up").size(20))
        .attr("transform", function(d, i) {
            return i ? "translate(" + (mini_width / 2) + "," + 4 + ") rotate(180)" : "translate(" + (mini_width / 2) + "," + -4 + ") rotate(0)";
        });

    gBrush.selectAll("rect")
        .attr("width", mini_width);

    gBrush.select(".background")
        .on("mousedown.brush", brushcenter)
        .on("touchstart.brush", brushcenter);

    ///////////////////////////////////////////////////////////////////////////
    /////////////////// Create a rainbow gradient - for fun ///////////////////
    ///////////////////////////////////////////////////////////////////////////

    defs = svg.append("defs")

    //Create two separate gradients for the main and mini bar - just because it looks fun
    // createGradient("gradient-rainbow-main", "60%");
    // createGradient("gradient-rainbow-mini", "13%");

    /////////////////////////////////////////////////////////////
    //////////////// Set-up the main bar chart //////////////////
    /////////////////////////////////////////////////////////////

    //DATA JOIN
    var bar = d3.select(".mainGroup").selectAll(".bar")
        .data(data, function(d) { return d.key; });

    //UPDATE
    bar
        .attr("width", function(d) { return main_xScale(d.value); })
        .attr("y", function(d, i) { return main_yScale(d.country); })
        .attr("height", main_yScale.rangeBand());

    //ENTER
    bar.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("width", function(d) { return main_xScale(d.value); })
        .attr("y", function(d, i) { return main_yScale(d.country); })
        .attr("height", main_yScale.rangeBand())
        .style("fill", function(d, i) {
            return colors(i);
        });
    //.style("fill", "#3B8C3D");

    //EXIT
    bar.exit()
        .remove();

    /////////////////////////////////////////////////////////////
    /////////////// Set-up the mini bar chart ///////////////////
    /////////////////////////////////////////////////////////////

    //The mini brushable bar
    //DATA JOIN
    var mini_bar = d3.select(".miniGroup").selectAll(".bar")
        .data(data, function(d) { return d.key; });

    //UDPATE
    mini_bar
        .attr("width", function(d) { return mini_xScale(d.value); })
        .attr("y", function(d, i) { return mini_yScale(d.country); })
        .attr("height", mini_yScale.rangeBand());


    //ENTER
    mini_bar.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("width", function(d) { return mini_xScale(d.value); })
        .attr("y", function(d, i) { return mini_yScale(d.country); })
        .attr("height", mini_yScale.rangeBand())
        .style("fill", function(d, i) {
            return colors(i);
        });
    //.style("fill", "#3B8C3D");

    //EXIT
    mini_bar.exit()
        .remove();

    //Start the brush
    gBrush.call(brush.event);

} //init

//Function runs on a brush move - to update the big bar chart
function update(data) {
var colors = d3.scale.ordinal().range(["#4DAA89"]);

    //The transition (& delay) time of the bars and the axis
    var transTime = 400;
    var delayTime = scrollEnd ? 0 : transTime;

    /////////////////////////////////////////////////////////////
    ///////////////////// Update the axis ///////////////////////
    /////////////////////////////////////////////////////////////

    //Update the domain of the y scale of the big bar chart
    main_yScale.domain(data.map(function(d) { return d.country; }));

    //Update the y axis of the big chart
    d3.select(".mainGroup")
        .select(".y.axis")
        .transition()
        .duration(transTime).delay(delayTime)
        .call(main_yAxis);

    /////////////////////////////////////////////////////////////
    ////////// Update the bars of the main bar chart ////////////
    /////////////////////////////////////////////////////////////

    //DATA JOIN
    var bar = d3.select(".mainGroup").selectAll(".bar")
        .data(data, function(d) { return d.key; });

    //UPDATE
    bar
        .transition().duration(transTime).delay(delayTime)
        .attr("x", 0)
        .attr("width", function(d) { return main_xScale(d.value); })
        .attr("y", function(d, i) { return main_yScale(d.country); })
        .attr("height", main_yScale.rangeBand());

    //ENTER
    bar.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("width", 0)
        .attr("y", function(d, i) { return main_yScale(d.country); })
        .attr("height", main_yScale.rangeBand())
        .transition().duration(transTime).delay(delayTime * 2)
        .attr("width", function(d) { return main_xScale(d.value) 
        })
        .style("fill", function(d, i) {
            return colors(i);
        });

    //EXIT
    bar.exit()
        .transition().duration(transTime)
        .attr("width", 0)
        .remove();

} //update

/////////////////////////////////////////////////////////////
////////////////////// Brush functions //////////////////////
/////////////////////////////////////////////////////////////

//First function that runs on a brush move
function brushmove() {
var colors = d3.scale.ordinal().range(["#4DAA89"]);


    //What is the extent of the brush
    var extent = brush.extent();

    //Adjust the extent of the brush so that is snaps to the bars
    if (d3.event.mode === "move" || scrollEnd === true) {
        //If dragging, preserve the width of the extent

        //Does the top edge lie closer to the upper or lower bar
        var topExtent = extent[0];
        //Using ES5 - http://stackoverflow.com/questions/8584902/get-closest-number-out-of-array
        var closestTop = mini_yScale.range().reduce(function(prev, curr) {
            return (Math.abs(curr - topExtent) < Math.abs(prev - topExtent) ? curr : prev);
        });

        //Pixel location of the bottom bar
        var maxBar = d3.max(mini_yScale.range());
        //Does the top edge lie closer to the upper or lower bar
        var bottomExtent = extent[1];
        //Using ES5 - http://stackoverflow.com/questions/8584902/get-closest-number-out-of-array
        var closestBottom = mini_yScale.range().reduce(function(prev, curr) {
            return (Math.abs(curr - bottomExtent) < Math.abs(prev - bottomExtent) ? curr : prev);
        });

        //Don't let it go over the last bar in the design
        if (maxBar === closestBottom) {
            //The new extent that snaps to the bars
            extent = [closestBottom + mini_yScale.rangeBand() - (extent[1] - extent[0]), closestBottom + mini_yScale.rangeBand()];
        } else {
            //The new extent that snaps to the bars
            extent = [closestTop, closestTop + (extent[1] - extent[0])];
        } //else

    } else if (!scrolling) {
        //If changing size, snap to the nearest rect

        //Find the pixel values of the bars that lie within the selected brush
        var pixelRanges = mini_yScale.range()
            .filter(function(d) { return (d >= extent[0] - mini_yScale.rangeBand() / 2) && (d <= extent[1]); });

        //The new extent that snaps to the bars within the selection
        extent = [d3.min(pixelRanges), d3.max(pixelRanges) + mini_yScale.rangeBand()];
    } //else if 
    //else do nothing - then it comes from the scrolling and the extent has already been determined

    //Snap to rect edge - the new extent
    d3.select("g.brush")
        .call(brush.extent(extent));

    //What bars are captured in the brush
    //During scrolling take a wider range and don't snap
    if (scrolling) {
        var selected = mini_yScale.domain()
            .filter(function(d) { return (extent[0] - 1e-3 - mini_yScale.rangeBand() <= mini_yScale(d)) && (mini_yScale(d) <= extent[1] + 1e-3 + mini_yScale.rangeBand()); });
    } else {
        var selected = mini_yScale.domain()
            .filter(function(d) { return (extent[0] - 1e-3 <= mini_yScale(d)) && (mini_yScale(d) <= extent[1] + 1e-3); });
    }

    //Take a subset of the selected data from the original dataset
    updatedData = data.filter(function(d) { return selected.indexOf(d.country) > -1; });

    //Update the colors of the mini chart - Make everything outside the brush grey
    d3.select(".miniGroup").selectAll(".bar")
        .style("fill", function(d, i) { return selected.indexOf(d.country) > -1 ?  colors(i) : "#e0e0e0"; });

    ////Update the main chart
    ////If you want to see update during a brush moving uncomment this
    ////But that doesn't work very well with the transitions of the bars in the update function & scrolling
    //update(updatedData);

} //brushmove

//Finally update the data
function brushend() {
    if (!scrolling) update(updatedData);
}

//Based on http://bl.ocks.org/mbostock/6498000
//What to do when the user clicks on another location along the brushable bar chart
function brushcenter() {
    var target = d3.event.target,
        extent = brush.extent(),
        size = extent[1] - extent[0],
        range = mini_yScale.range(),
        y0 = d3.min(range) + size / 2,
        y1 = d3.max(range) + mini_yScale.rangeBand() - size / 2,
        center = Math.max(y0, Math.min(y1, d3.mouse(target)[1]));

    d3.event.stopPropagation();

    gBrush
        .call(brush.extent([center - size / 2, center + size / 2]))
        .call(brush.event);

} //brushcenter


/////////////////////////////////////////////////////////////
///////////////////// Scroll functions //////////////////////
/////////////////////////////////////////////////////////////


//Function to calculate what should happen on a mouse scroll
function scroll() {

    if (mousewheelTimer) clearTimeout(mousewheelTimer);

    var extent = brush.extent(),
        size = extent[1] - extent[0],
        range = mini_yScale.range(),
        y0 = d3.min(range),
        y1 = d3.max(range),
        dy = d3.event.deltaY,
        topSection;

    scrolling = true;

    if (extent[0] - dy < y0) {
        topSection = y0;
    } else if (extent[1] - dy > y1) {
        topSection = y1 - size;
    } else {
        topSection = extent[0] - dy;
    } //else

    //Once the person stops scrolling, run the update data function
    mousewheelTimer = setTimeout(function() {
        mousewheelTimer = null;
        scrolling = false;
        scrollEnd = true;

        //Finally snap the brush and update the data
        gBrush
            .call(brush.event);

        scrollEnd = false;
    }, 200);

    d3.event.stopPropagation();
    d3.event.preventDefault();

    //Update the brush position during the scrolling
    if (scrolling) {
        gBrush
            .call(brush.extent([topSection, topSection + size]))
            .call(brush.event);
    } //if

} //scroll

/////////////////////////////////////////////////////////////
///////////////////// Helper functions //////////////////////
/////////////////////////////////////////////////////////////

//Create a gradient 
function createGradient(idName, endPerc) {

    var coloursRainbow = ["#ffdf86"];

    defs.append("linearGradient")
        .attr("id", idName)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", endPerc).attr("y2", "0%")
        .selectAll("stop")
        .data(coloursRainbow)
        .enter().append("stop")
        .attr("offset", function(d, i) { return i / (coloursRainbow.length - 1); })
        .attr("stop-color", function(d) { return d; });
} //createGradient

//Function to generate random strings of 5 letters - for the demo only
function makeWord(i) {
    text = ["Apple", "MurataCo.", "Cisco Systems", "Inc", "SAMSUNG", "Samsung", "Alaris", "LG", "VMware", " Inc.", "Intel", "Motorola", "Lenovo Company", "zte", "HTC Corporation", "Hewlett Packard", "Amazon  Inc.", "TCT mobile ", "Hon Hai Precision Ind. Co.", "HUAWEI  CO.", "Liteon Technology Corporation", "AMERICAN CORP", "Microsoft", "F5", "Forcepoint", "intersystems", "Private", "Yulong Computer Tele Scientific (Shenzhen) Co.", "ASUSTek COMPUTER INC.", "Sony", "Nintendo Co.", "AzureWave  Inc.", "Microsoft", "OnePlus", "IEEE", "Philips", "KYOCERA", "QUANTA", "GE", "MECHANICS CO.", "Essential Products", " Inc.", "Rivet Networks", "BLU Products Inc", "Sun Cupid", "OnePlus", "Xiaomi  Co", "Gemtek Technology Co.", "BlackBerry RTS", "Motorola  Co.", "Barnes&Noble", "epson", "Super Micro Computer", " Inc.", "Chicony  Co.", "Shanghai X-Cheng telecom", "SHENZHEN ALONG INVESTMENT CO.", "InPro Comm", "Broadcom", "Qingdao Hisense  Co.", "BLU Products Inc.", "Dell Inc.", "Microsoft Mobile Oy", "SHARP Corporation", "Vizio", "ICANN", " IANA Department", "AMPAK Technology", " Inc.", "Axis  AB", "HMD Global Oy", "Epigram", " Inc.", "Nokia Corporation", "FN-LINK TECHNOLOGY LIMITED", "IBM Corp", "Beckman Coulter K.K.", "Chi Mei  Systems", "Lenovo Mobile", "Danfoss Inc."];
    return text[i];
} //makeWord