<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { geoMercator, geoPath } from 'd3-geo';
  import { scaleSequential } from 'd3-scale';
  import { extent, interpolateYlGnBu } from 'd3';
  import { writable } from 'svelte/store';

  let countriesGeoJson = {};
  let countryNames = [];
  let goldMiningData = new Map();
  let error = '';
  let width = 928;
  let height = 600;
  let margin = { top: 100, bottom: 0, left: 0, right: 0 };
  let selectedYear = writable(2010);
  let colorScale2010;
  let svg; // Global variable for the SVG

  onMount(async () => {
    try {
      // Load GeoJSON data
      const geoJsonData = await d3.json('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/countries.geojson');
      
      if (geoJsonData.type === 'FeatureCollection' && Array.isArray(geoJsonData.features)) {
        countriesGeoJson = geoJsonData;
        countryNames = geoJsonData.features.map(d => d.properties.ADMIN);
        console.log("GeoJSON data:", countriesGeoJson);
      } else {
        throw new Error('Invalid GeoJSON structure');
      }

      // Load CSV data
      const rawData = await d3.csv('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/Gold-Mining-Production-Volumes-Data.csv');
      
      // Set up the color scale based on 2010 data
      processData(rawData, 2010);
      colorScale2010 = scaleSequential(interpolateYlGnBu).domain(extent(Array.from(goldMiningData.values())));

      createMap(); // Create the initial map

      selectedYear.subscribe(year => {
        processData(rawData, year);
        updateMap();
      });

      createLegend();

      // Add event listeners for search input
      const searchBox = document.getElementById('country-search');
      searchBox.addEventListener('input', searchCountry);
      searchBox.addEventListener('focus', showSuggestionsContainer);
      searchBox.addEventListener('blur', hideSuggestionsContainer);
    } catch (err) {
      error = 'Failed to load data. Please try again later.';
      console.error(err);
    }
  });

  function processData(rawData, year) {
    goldMiningData.clear();
    rawData.forEach(item => {
      const countryID = item['CountryID'];
      const value = parseFloat(item[year]);
      if (countryID && !isNaN(value)) {
        goldMiningData.set(countryID, value);
      }
    });
    console.log(`Gold Mining Data ${year}:`, goldMiningData);
  }

  function createMap() {
    if (!countriesGeoJson.features) return;

    const projection = geoMercator()
      .center([0, 0])
      .scale(150)
      .translate([width / 2, (height + margin.top) / 2]);
    const path = geoPath(projection);

    // Create SVG once
    svg = d3.select("#world-map").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; display: block; margin: 0 auto;");

    svg.append("g").attr("class", "countries");

    updateMap(); // Call updateMap to render the initial data
  }

  function updateMap() {
    if (!countriesGeoJson.features || !svg) return;

    const projection = geoMercator()
      .center([0, 0])
      .scale(150)
      .translate([width / 2, (height + margin.top) / 2]);
    const path = geoPath(projection);

    const countries = svg.select(".countries")
      .selectAll("path")
      .data(countriesGeoJson.features);

    countries.enter().append("path")
      .merge(countries)
      .attr("fill", d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070")
      .attr("stroke", "#333")
      .attr("d", path);

    countries.select("title").remove(); // Remove old titles

    countries.append("title") // Add new titles
      .text(d => `${d.properties.ADMIN}: ${goldMiningData.has(d.properties.ISO_A3) ? goldMiningData.get(d.properties.ISO_A3) + ' tonnes' : 'No data'}`);

    countries.exit().remove();
  }

  function createLegend() {
    // Create the fixed legend for 2010
    const legendContainer = d3.select("#legend-container");
    legendContainer.selectAll("*").remove(); // Clear previous legend content
    legendContainer.append(() => Legend(colorScale2010, { title: `Gold Mining Production Volume Tonnes (2010)`, width: 260 }));
  }

  function searchCountry(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredCountries = countryNames.filter(name => name.toLowerCase().includes(searchTerm));
    showSuggestions(filteredCountries);

    const matchedCountry = countriesGeoJson.features.find(d => d.properties.ADMIN.toLowerCase().includes(searchTerm));
    if (matchedCountry) {
      // Highlight the matched country
      svg.selectAll('path')
        .attr('stroke-width', 0.5)
        .attr('stroke', '#333')
        .attr('fill', d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070");

      svg.selectAll('path')
        .filter(d => d === matchedCountry)
        .attr('stroke-width', 2)
        .attr('stroke', 'red')
        .attr('fill', 'red');

      // Show info box
      showInfoBox(matchedCountry);
    } else {
      // Clear highlight and info box if no match found
      svg.selectAll('path')
        .attr('stroke-width', 0.5)
        .attr('stroke', '#333')
        .attr('fill', d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070");

      hideInfoBox();
    }
  }

  function showInfoBox(country) {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'block';
    infoBox.style.left = '10px';
    infoBox.style.top = '10px';
    infoBox.innerHTML = `<strong>${country.properties.ADMIN}</strong><br>Gold Production: ${goldMiningData.has(country.properties.ISO_A3) ? goldMiningData.get(country.properties.ISO_A3) + ' tonnes' : 'No data'}`;
  }

  function hideInfoBox() {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'none';
    infoBox.innerHTML = '';
  }

  function showSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('suggestions-container');
    suggestionsContainer.innerHTML = ''; // Clear previous suggestions

    suggestions.forEach(suggestion => {
      const div = document.createElement('div');
      div.className = 'suggestion';
      div.textContent = suggestion;
      div.addEventListener('click', () => {
        document.getElementById('country-search').value = suggestion;
        searchCountry({ target: { value: suggestion } });
      });
      suggestionsContainer.appendChild(div);
    });

    // Position the suggestions container directly above the search box
    const searchBox = document.getElementById('country-search');
    const searchBoxRect = searchBox.getBoundingClientRect();
    suggestionsContainer.style.bottom = `${window.innerHeight - searchBoxRect.top}px`;
    suggestionsContainer.style.left = `${searchBoxRect.left + window.scrollX}px`;
    suggestionsContainer.style.width = `${searchBoxRect.width}px`;
  }

  function showSuggestionsContainer() {
    const suggestionsContainer = document.getElementById('suggestions-container');
    suggestionsContainer.style.display = 'block';
  }

  function hideSuggestionsContainer() {
    // Delay hiding to allow click event on suggestions
    setTimeout(() => {
      const suggestionsContainer = document.getElementById('suggestions-container');
      suggestionsContainer.style.display = 'none';
    }, 200);
  }

  function Legend(color, {
    title,
    tickSize = 6,
    width = 320,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues
  } = {}) {

    function ramp(color, n = 256) {
      const canvas = document.createElement("canvas");
      canvas.width = n;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      for (let i = 0; i < n; ++i) {
        context.fillStyle = color(i / (n - 1));
        context.fillRect(i, 0, 1, 1);
      }
      return canvas;
    }

    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible")
      .style("display", "block");

    let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
    let x;

    if (color.interpolate) {
      const n = Math.min(color.domain().length, color.range().length);
      x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));
      svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
    } else if (color.interpolator) {
      x = Object.assign(color.copy().interpolator(d3.interpolateRound(marginLeft, width - marginRight)), {
        range() {
          return [marginLeft, width - marginRight];
        }
      });

      svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.interpolator()).toDataURL());
    } else if (color.invertExtent) {
      const thresholds = color.thresholds ? color.thresholds() :
        color.quantiles ? color.quantiles() :
        color.domain();

      const thresholdFormat = tickFormat === undefined ? d => d :
        typeof tickFormat === "string" ? d3.format(tickFormat) :
        tickFormat;

      x = d3.scaleLinear()
        .domain([-1, color.range().length - 1])
        .rangeRound([marginLeft, width - marginRight]);

      svg.append("g")
        .selectAll("rect")
        .data(color.range())
        .join("rect")
        .attr("x", (d, i) => x(i - 1))
        .attr("y", marginTop)
        .attr("width", (d, i) => x(i) - x(i - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", d => d);

      tickValues = d3.range(thresholds.length);
      tickFormat = i => thresholdFormat(thresholds[i], i);
    } else {
      x = d3.scaleBand()
        .domain(color.domain())
        .rangeRound([marginLeft, width - marginRight]);

      svg.append("g")
        .selectAll("rect")
        .data(color.domain())
        .join("rect")
        .attr("x", x)
        .attr("y", marginTop)
        .attr("width", Math.max(0, x.bandwidth() - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", color);

      tickAdjust = () => {};
    }

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues))
      .call(tickAdjust)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(title));

    return svg.node();
  }
</script>

<h1 class="body-header">Gold Mine Production Map</h1>
<p class="body-text">
  This visualization shows gold mine productions among the major countries from 2010 to 2022. We want to explore whether the increase or the decrease of mine production is the main factor influencing the gold price.
</p>

<div id="controls" style="margin: 1rem auto; width: 80%; text-align: left; display: flex; align-items: center;">
  <label for="year-slider" style="margin-right: 10px;">Year {$selectedYear} :</label>
  <input type="range" id="year-slider" min="2010" max="2022" bind:value={$selectedYear} style="width: 30%; margin-right: 10px;" autocomplete="off">
  <input type="text" id="country-search" placeholder="Search country" style="width: 20%;" autocomplete="off">
  <div id="suggestions-container" style="position: fixed; background: white; border: 1px solid #ccc; z-index: 10; max-height: 150px; overflow-y: auto; display: none;"></div>
  <span id="slider-bar"></span>
</div>
<div id="world-map" style="position: relative; margin: auto; max-height: 75vh; width: 80%; margin: 2rem auto;">
  <div id="legend-container" style="position: absolute; bottom: 10px; right: 10px;"></div>
</div>
<div id="info-box"></div>

<style>
  path {
    stroke-width: 0.5px;
  }
  #controls {
    margin-bottom: 1rem;
    position: relative;
  }
  #year-slider {
    display: block;
    width: 30%; /* Set a fixed width for the slider */
  }
  #country-search {
    display: block;
    width: 20%;
    margin-left: 10px; /* Add some space between the slider and the search bar */
  }
  #suggestions-container {
    bottom: 60px; /* Adjusted to position the suggestions on top of the search box */
    left: 0px; /* Adjusted to position the suggestions closer to the search box */
  }
  .suggestion {
    padding: 5px;
    cursor: pointer;
  }
  .suggestion:hover {
    background-color: #f0f0f0;
  }
  #info-box {
    display: none;
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    padding: 10px;
    z-index: 10;
  }
</style>
