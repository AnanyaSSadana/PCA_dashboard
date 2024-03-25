// Global variable to store the selected number of PCs
let selectedDimensionalityIndex = 2; 
let selectedNumClusters = 2;

// SCREE PLOT
function drawScreePlot(pcaData, selectedComponents = null) {
    d3.select("#scree-plot-container svg").remove();
    // Adjust these dimensions as per the actual size you need
    const margin = { top: 20, right: 20, bottom: 40, left: 50 },
    width = 860 - margin.left - margin.right, // Width of the actual plot area
    height = 300 - margin.top - margin.bottom; // Height of the actual plot area

    const svg = d3.select("#scree-plot-container")
        .append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("viewBox", '0 0 860 300')
        .classed("svg-content-responsive", true)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    const x = d3.scaleBand()
                .range([0, width])
                .domain(pcaData.explained_variance_ratio.map((_, i) => i + 1))
                .padding(0.1);
    svg.append("g")
       .attr("transform", "translate(0," + height + ")")
       .call(d3.axisBottom(x));

    const y = d3.scaleLinear()
                .domain([0, 1]) // Updated to range up to 1
                .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // X axis label
    svg.append("text")
    .attr("text-anchor", "end")
    .attr("x", width / 2 + margin.left)
    .attr("y", height + margin.top + 10)
    .text("Principal Component")
    .style("fill", "white")
    .style("font-size", "12px");

    // Y axis label
    svg.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -margin.top - (height / 2) + 50) 
    .text("Variance Explained")
    .style("fill", "white")
    .style("font-size", "12px");

    // Draw the bar chart
    svg.selectAll(".bar")
       .data(pcaData.explained_variance_ratio)
       .enter()
       .append("rect")
       .attr("class", "bar")
       .attr("x", (d, i) => x(i + 1))
       .attr("y", d => y(d))
       .attr("width", x.bandwidth())
       .attr("height", d => height - y(d))
       .attr("fill", "#69b3a2");

    // Draw the line chart
    svg.append("path")
       .datum(pcaData.cumulative_explained_variance) // Use the cumulative data for the line
       .attr("fill", "none")
       .attr("stroke", "red")
       .attr("stroke-width", 1.5)
       .attr("d", d3.line()
                    .x((_, i) => x(i + 1) + x.bandwidth() / 2) // Center the line in the bars
                    .y(d => y(d)));

    // Draw the dots on the line chart
    svg.selectAll(".dot")
       .data(pcaData.cumulative_explained_variance)
       .enter()
       .append("circle")
       .attr("class", "dot")
       .attr("cx", (_, i) => x(i + 1) + x.bandwidth() / 2)
       .attr("cy", d => y(d))
       .attr("r", 5)
       .attr("fill", "red");
    
    // Add interactivity for the dots (if needed)
    svg.selectAll(".dot")
       .on('click', function(event, d) {
           const i = pcaData.cumulative_explained_variance.indexOf(d);
           // Update based on the clicked dot
           onScreePlotDataPointClick(i + 1);
       });

    // Highlight the selected components
    if (selectedComponents) {
        svg.selectAll(".bar")
            .attr("fill", (d, i) => i < selectedComponents ? "steelblue" : "#69b3a2"); // Highlight selected bars

        svg.selectAll(".dot")
            .attr("fill", (d, i) => i < selectedComponents ? "orange" : "red"); // Highlight selected dots
    }

    // Add tooltips to dots
    svg.selectAll(".dot")
       .append("title")
       .text((d, i) => `PC${i + 1}: ${d.toFixed(4)}`);

}

// Function to update the scree plot when a new principal component is selected
function updateScreePlot(selectedComponents, pcaData) {
    // Clear the previous scree plot
    d3.select("#scree-plot-container svg").remove();
    // Draw a new scree plot with updated component highlighting
    drawScreePlot(pcaData, selectedComponents);
}

// Function that handles the logic when a dot on the scree plot is clicked
function onScreePlotDataPointClick(selectedComponents) {
    // Update global state
    selectedDimensionalityIndex = selectedComponents;

    // Redraw scree plot with updated component highlighting
    updateScreePlot(selectedComponents, window.pcaData);

    // Fetch and redraw biplot and scatterplot matrix with the selected number of components
    fetchBiplotAndScatterplotData(selectedComponents);

    // Fetch and redraw k-means elbow plot with the selected number of components
    fetchKmeansData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], selectedComponents);
}


// BIPLOT 

// Function to draw the biplot
function drawBiplot(biplotData) {
    //const { scores, loadings, featureNames, observationNames } = biplotData;
    console.log(biplotData.loadings);
    console.log(biplotData.feature_names);

    // Clear any existing SVG to make room for the biplot
    d3.select("#biplot-container svg").remove();

    // Set the dimensions and margins of the graph
    const margin = { top: 20, right: 20, bottom: 40, left: 50 },
          width = 760 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Get the full extent of the data including negative values
    const xExtent = d3.extent([...biplotData.scores.map(d => d[0]), ...biplotData.loadings.flat()]);
    const yExtent = d3.extent([...biplotData.scores.map(d => d[1]), ...biplotData.loadings.flat()]);

    // Update the scales
    const xScale = d3.scaleLinear()
                     .domain(xExtent)
                     .range([0, width]);
    const yScale = d3.scaleLinear()
                     .domain(yExtent)
                     .range([height, 0]);


    // Adjust SVG width and ViewBox
    const svg = d3.select("#biplot-container")
              .append("svg")
              .attr("width", '100%') // Set SVG width to 100% of the parent container
              .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
              .append("g")
              .attr("transform", `translate(${margin.left},${margin.top})`);

    // Translate the axes to the center
    svg.append("g")
       .attr("transform", `translate(0,${yScale(0)})`) // Translate to vertical center
       .call(d3.axisBottom(xScale));

    svg.append("g")
       .attr("transform", `translate(${xScale(0)},0)`) // Translate to horizontal center
       .call(d3.axisLeft(yScale));

    // Add label for X axis (PC1)
    svg.append("text")
       .attr("transform", `translate(${(width / 2) + 220} , ${(height - margin.bottom) / 1.4})`) // Move closer to X axis
       .style("text-anchor", "middle")
       .text("PC1")
       .style("fill", "white");

    // Add label for Y axis (PC2)
    svg.append("text")
       .attr("transform", "rotate(-90)") // Rotate for vertical text
       .attr("y", margin.left * 3.2) // Move closer to Y axis
       .attr("x", -(height / 2) + 155)
       .style("text-anchor", "middle")
       .text("PC2")
       .style("fill", "white");
    
    // Create the tooltip div as a hidden element in the body
    const tooltipDiv = d3.select("body").append("div")
                          .attr("id", "tooltip")
                          .style("opacity", 0)
                          .style("position", "absolute")
                          .style("display", "none"); // Start hidden, CSS will control the rest

    // Later on, when you create the dots:
    const dots = svg.selectAll(".dot")
                     .data(biplotData.scores)
                     .enter()
                     .append("circle")
                     .attr("data-index", (d, i) => i)
                     .attr("class", "dot")
                     .attr("cx", d => xScale(d[0]))
                     .attr("cy", d => yScale(d[1]))
                     .attr("r", 3)
                     .style("fill", "#69b3a2");

    const scalingFactor = 10;
    // Draw loading vectors for each feature
    biplotData.feature_names.forEach((feature, i) => {
        const loading = biplotData.loadings.map(d => d[i]); // Get the ith loading from each PC
        //const maxLoadingValue = Math.max(...loading.map(l => Math.abs(l))); // Find the max loading value for scaling
                
        svg.append("line")
           .attr("x1", xScale(0))
           .attr("y1", yScale(0))
           .attr("x2", xScale(loading[0] * scalingFactor)) // Scale and center the loading vector
           .attr("y2", yScale(loading[1] * scalingFactor)) // Scale and center the loading vector
           .style("stroke", "red")
           .style("stroke-width", 1);
                
        svg.append("text")
           .attr("x", xScale(loading[0] * scalingFactor))
           .attr("y", yScale(loading[1] * scalingFactor))
           .text(feature)
           .style("text-anchor", "start")
           .style("fill", "black")
           .style("font-size", "12px");
    });                

    
    // Add mouseover and mouseout events to the dots
    dots.on("mouseover", function(event, d) {
        const index = d3.select(this).attr("data-index"); // Get the index from the data attribute
        tooltipDiv.transition()
                  .duration(200)
                  .style("opacity", .9)
                  .style("display", "block"); // Show the tooltip

        tooltipDiv.html(biplotData.observation_names[index]) // Get the name using the index
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 10) + "px"); // Position the tooltip above the cursor
    })
    .on("mouseout", function() {
        tooltipDiv.transition()
                  .duration(500)
                  .style("opacity", 0)
                  .style("display", "none"); // Hide the tooltip after mouseout
    });                
       

}


//ATTRIBUTE TABLE

function drawAttributesTable(attributesData, sumOfSquaredLoadings) {

    // Select the container where the table will be added
    const container = d3.select('#attributes-table-container');
    
    // Clear any previous content
    container.selectAll('*').remove();
    
    // Create the table element with additional styling
    // Add top margin to the table
    const table = container.append('table')
                           .attr('class', 'table table-bordered table-striped attribute-table')
                           .style('margin-top', '20px'); // Add top margin here

    // Create the table header
    const thead = table.append('thead');
    const headerRow = thead.append('tr');
    headerRow.append('th').text('Attribute').attr('class', 'header-cell');
    headerRow.append('th').text('Sum Of Squared Loadings').attr('class', 'header-cell');

    // Create the table body and add data in transposed form
    const tbody = table.append('tbody');

    attributesData.forEach((attr, index) => {
        let row = tbody.append('tr');
        row.append('td').text(attr).attr('class', 'data-cell'); // Attribute name cell
        row.append('td').text(sumOfSquaredLoadings[index].toFixed(4)).attr('class', 'data-cell'); // SOS loading cell
    });
}


//SCATTERPLOT MATRIX 

// Function to format tick labels
function formatTick(d) {
    const s = d3.format(".2s")(d);
    return s.replace('G', 'B'); // replace G with B for Billion
}

function drawScatterplotMatrix(data, attributes) {
    const container = d3.select('#scatterplot-matrix-container');
    container.selectAll('*').remove();

    const matrixMargin = { top: 20, right: 20, bottom: 20, left: 20 }; // Margins around the matrix
    const scatterplotPadding = 10; // Padding between each scatterplot

    const size = 165; // Size of each scatterplot including padding
    const scalePadding = 20;
    const axisPadding = 30; // Padding for axes

    const scales = {};
    attributes.forEach(attr => {
        scales[attr] = d3.scaleLinear()
            .domain([
                d3.min(data, d => d[attr]) - scalePadding, 
                d3.max(data, d => d[attr]) + scalePadding
            ])
            .range([axisPadding, size - axisPadding - scatterplotPadding]); // Adjust range for axis
    });

    const svgSize = attributes.length * size + matrixMargin.left + matrixMargin.right;
    const svg = container.append('svg')
        .attr('width', svgSize)
        .attr('height', svgSize);

    attributes.forEach((attrX, i) => {
        attributes.forEach((attrY, j) => {
            const g = svg.append('g')
                .attr('transform', `translate(${matrixMargin.left + i * size}, ${matrixMargin.top + j * size})`);

            g.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', size - scatterplotPadding)
                .attr('height', size - scatterplotPadding)
                .style('fill', 'none')
                .style('stroke', 'black');

            if (i === j) {
                g.append('text')
                    .attr('x', (size - scatterplotPadding) / 2)
                    .attr('y', (size - scatterplotPadding) / 2)
                    .attr('text-anchor', 'middle')
                    .style('font-weight', 'bold')
                    .text(attrX);
            } else {
                g.selectAll('circle')
                .data(data)
                .enter().append('circle')
                .attr('cx', d => scales[attrX](d[attrX]))
                .attr('cy', d => scales[attrY](d[attrY]))
                .attr('r', 3)
                .style("fill", "none") // No fill color for the circles
                .style("stroke", "#ADD8E6"); // Stroke color for the outline;

                // Bottom axis
                g.append('g')
                 .attr('transform', `translate(${scatterplotPadding}, ${size - scatterplotPadding})`)
                 .call(d3.axisBottom(scales[attrX])
                      .ticks(3)
                      .tickSize(5)  
                      .tickFormat(formatTick)
                )
                 .call(g => g.select('.domain').remove())  // Remove axis line
                 .selectAll(".tick text")  // Select tick labels
                 .attr("y", -axisPadding + 25)  // Move tick labels up to align with the border
                 .style("text-anchor", "middle")
                 .attr('dy', '0.12em');  

                // Left axis
                g.append('g')
                 .attr('transform', `translate(${axisPadding}, ${scatterplotPadding})`)
                 .call(d3.axisLeft(scales[attrY])
                   .ticks(3)
                   .tickSize(-5)  
                   .tickFormat(formatTick)
                )
                 .call(g => g.select('.domain').remove())  // Remove axis line
                 .selectAll(".tick line")  // Select tick lines
                 .attr("x1", -axisPadding)  // Start of tick line (closer to the border)
                 .attr("x2", -axisPadding + 5)
                 .selectAll(".tick text")  // Select tick labels
                 .attr("x", -axisPadding + 5)  // Move tick labels left to align with the border
                 .style("text-anchor", "end")
                 .attr('dx', '-0.12em');  
                
            }
        });
    });
}



// Define a color scale for the clusters
const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10); // Adjust scheme based on the number of clusters

function updateBiplotWithClusters(clusterLabels) {
    // Select the dots in the biplot
    const dots = d3.selectAll("#biplot-container .dot");
    
    // Update the fill color based on the clusterLabels
    dots.data(clusterLabels)
        .style("fill", d => clusterColorScale(d)); // Use a color scale for clusters
}

function updateScatterplotMatrixWithClusters(clusterLabels) {
    d3.selectAll("#scatterplot-matrix-container g")
      .each(function() {
          // In each 'g', select the circles and update their fill color
          d3.select(this).selectAll("circle")
            .style("fill", (d, i) => clusterColorScale(clusterLabels[i]));
      });
}


//K-MEANS ELBOW PLOT

function drawKMeansElbowPlot(inertiaData, selectedClusters=2) {

    if (!inertiaData) {
        console.error('No inertia data to plot');
        return; // Exit the function if there's no data
    }
    // Clear any existing SVG to make room for the new plot
    d3.select("#kmeans-elbow-container svg").remove();

    const margin = { top: 20, right: 50, bottom: 40, left: 60 },
    // Adjust the width to fit within the parent container, considering the new margin
    width = parseInt(d3.select("#kmeans-elbow-container").style("width")) - margin.left - margin.right,
    height = 250 - margin.top - margin.bottom;

     // Adjust the transform translate to account for the new margins
     const svg = d3.select("#kmeans-elbow-container")
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                  // Apply the translation with the updated margins
                    .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scaleLinear()
                .domain([1, inertiaData.length]) // Assuming inertiaData is an array
                .range([0, width]);
    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).ticks(inertiaData.length));

    // Add Y axis with a tick format to reduce the length of the labels
    const y = d3.scaleLinear()
                .domain([0, d3.max(inertiaData)])
                .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format(".1s"))); // This will use SI-prefix with one significant digit


    // Add the line
    svg.append("path")
       .datum(inertiaData)
       .attr("fill", "none")
       .attr("stroke", "steelblue")
       .attr("stroke-width", 1.5)
       .attr("d", d3.line()
                    .x((_, i) => x(i + 1))
                    .y(d => y(d)));

    // Bind the click event to the dots
    svg.selectAll(".dot")
        .data(inertiaData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (_, i) => x(i + 1))
        .attr("cy", d => y(d))
        .attr("r", 5)
        .attr("fill", d => selectedClusters === inertiaData.indexOf(d) + 1 ? "#ffab00" : "steelblue")
        .on('click', function(event, d) {
            const k = inertiaData.indexOf(d) + 1;
            onKMeansClusterSelect(k, inertiaData);
        });

    // Add labels to the x-axis to indicate the number of clusters
    svg.append("text")
       .attr("text-anchor", "end")
       .attr("x", width / 2 + margin.left)
       .attr("y", height + margin.top + 5)
       .text("Number of clusters (k)")
       .style("fill", "white")
       .style("font-size", "12px");

    // Add y-axis label
    svg.append("text")
       .attr("text-anchor", "end")
       .attr("transform", "rotate(-90)")
       .attr("y", -margin.left + 20)
       .attr("x", -margin.top - (height / 2) + 10) 
       .text("Inertia")
       .style("fill", "white")
       .style("font-size", "12px");

    // Draw the elbow line (you will need to define the 'findElbowPoint' function)
    const elbowPoint = findElbowPoint(inertiaData);
    if (elbowPoint) {
        svg.append("line")
            .attr("x1", x(elbowPoint.k))
            .attr("y1", y(inertiaData[elbowPoint.k - 1]))
            .attr("x2", x(elbowPoint.k))
            .attr("y2", y(elbowPoint.value))
            .attr("stroke", "red")
            .attr("stroke-dasharray", "4");

        svg.append("path")
            .attr("d", d3.symbol().type(d3.symbolTriangle).size(50))
            .attr("transform", `translate(${x(elbowPoint.k)},${y(elbowPoint.value)}) rotate(-90)`)
            .attr("fill", "red");
    }
}

// Function that handles the logic when a dot on the k-means plot is clicked
function onKMeansClusterSelect(numClusters, inertiaData) {
    selectedNumClusters = numClusters;
    fetchKmeansData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], selectedDimensionalityIndex);    
}

// Function to determine the elbow point
function findElbowPoint(inertiaData) {
    // This example implementation is overly simplistic and would need refinement
    let distances = [];

    // Calculate the line from the first to the last point
    let lineSlope = (inertiaData[inertiaData.length - 1] - inertiaData[0]) / (inertiaData.length - 1);
    let lineIntercept = inertiaData[0];

    inertiaData.forEach((inertia, index) => {
        let lineY = lineSlope * index + lineIntercept;
        distances.push({ k: index + 1, distance: Math.abs(inertia - lineY), value: inertia });
    });

    // Find the point with the maximum distance from the line
    distances.sort((a, b) => b.distance - a.distance);
    return distances[0];
}


// Initialize all visualizations once the data is loaded
function initializeDashboard() {
    fetchScreePlotData();
    fetchBiplotAndScatterplotData(selectedDimensionalityIndex);
    fetchKmeansData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], selectedDimensionalityIndex);
}

// Fetch and draw the scree plot
function fetchScreePlotData() {
    fetch('/pca_data')
        .then(response => response.json())
        .then(data => {
            window.pcaData = data;
            drawScreePlot(data, selectedDimensionalityIndex);
        })
        .catch(error => {
            console.error('Error fetching scree plot data:', error);
        });
}

// Fetch and draw the biplot and scatterplot matrix based on the selected dimensionality index
function fetchBiplotAndScatterplotData(dimensionalityIndex) {
    console.log(dimensionalityIndex);
    fetch('/biplot_scatterplot_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dimensionalityIndex: dimensionalityIndex })
    })
    .then(response => response.json())
    .then(data => {
        // Now passing observation names to the biplot drawing function
        drawBiplot(data.biplot);
        drawAttributesTable(data.scatterplot_matrix.attributes, data.sum_of_squared_loadings);
        drawScatterplotMatrix(data.scatterplot_matrix.data, data.scatterplot_matrix.attributes);
    })
    .catch(error => {
        console.error('Error fetching biplot and scatterplot matrix data:', error);
    });
}


function fetchKmeansData(kRange, dimensionalityIndex) {
    fetch('/kmeans', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            kRange: kRange, 
            dimensionalityIndex: dimensionalityIndex  // Include the selected number of components
        })
    })
    .then(response => response.json())
    .then(data => {
        // Ensure the data contains 'inertia_scores' and it's an array
        if (data && Array.isArray(data.inertia_scores)) {
            drawKMeansElbowPlot(data.inertia_scores, selectedNumClusters);
            updateBiplotWithClusters(data.cluster_labels_dict[selectedNumClusters]);
            updateScatterplotMatrixWithClusters(data.cluster_labels_dict[selectedNumClusters]);
        } else {
            throw new Error('Missing or invalid inertia_scores');
        }
    })
    .catch(error => {
        console.error('Error fetching k-means data:', error);
    });
}


// Call to initialize the dashboard on page load
document.addEventListener('DOMContentLoaded', initializeDashboard);
