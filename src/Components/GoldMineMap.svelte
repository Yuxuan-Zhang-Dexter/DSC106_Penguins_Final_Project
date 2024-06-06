<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { writable } from 'svelte/store';

  let countriesGeoJson = {};
  let countryNames = [];
  let goldMiningData = new Map();
  let error = '';
  let width = 828; // Smaller width
  let height = 500; // Smaller height
  let margin = { top: 20, right: 30, bottom: 40, left: 90 };
  let selectedYear = writable(2010);
  let barChartSvg; // Global variable for the bar chart SVG
  let mapSvg; // Global variable for the map SVG
  let xScale; // Global variable for the x-axis scale
  let maxGoldProduction = 0; // Maximum gold production value across all years
  let colorScale2010;
  let searchBarVisible = writable(true);

  onMount(async () => {
    try {
      const geoJsonData = await d3.json('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/countries.geojson');
      
      if (geoJsonData.type === 'FeatureCollection' && Array.isArray(geoJsonData.features)) {
        countriesGeoJson = geoJsonData;
        countryNames = geoJsonData.features.map(d => d.properties.ADMIN);
        console.log("GeoJSON data:", countriesGeoJson);
      } else {
        throw new Error('Invalid GeoJSON structure');
      }

      const rawData = await d3.csv('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/Gold-Mining-Production-Volumes-Data.csv');
      
      rawData.forEach(item => {
        for (let year = 2010; year <= 2022; year++) {
          const value = parseFloat(item[year]);
          if (!isNaN(value) && value > maxGoldProduction) {
            maxGoldProduction = value;
          }
        }
      });

      xScale = d3.scaleLinear().domain([0, maxGoldProduction]).range([0, width]);
      colorScale2010 = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxGoldProduction]);

      processData(rawData, 2010);
      createBarChart();
      createMap();

      selectedYear.subscribe(year => {
        processData(rawData, year);
        updateBarChart();
        updateMap();
      });

      attachSearchEventListeners();
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

  function createBarChart() {
    barChartSvg = d3.select("#bar-chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    updateBarChart();
  }

  function updateBarChart() {
    if (!goldMiningData || !barChartSvg) return;

    barChartSvg.selectAll("*").remove();

    const data = Array.from(goldMiningData.entries()).map(([countryID, value]) => {
      const country = countriesGeoJson.features.find(d => d.properties.ISO_A3 === countryID);
      return { country: country ? country.properties.ADMIN : countryID, value };
    }).sort((a, b) => b.value - a.value).slice(0, 10);

    const y = d3.scaleBand().range([0, height]).domain(data.map(d => d.country)).padding(0.1);

    barChartSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    barChartSvg.append("g").call(d3.axisLeft(y));

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "10px")
      .style("display", "none");

    barChartSvg.selectAll("rect").data(data).enter().append("rect")
      .attr("x", xScale(0))
      .attr("y", d => y(d.country))
      .attr("width", d => xScale(d.value))
      .attr("height", y.bandwidth())
      .attr("fill", "#69b3a2")
      .on("mouseover", function(event, d) {
        tooltip.style("display", "block");
        tooltip.html(`<strong>${d.country}</strong><br>Gold Production: ${d.value} tonnes`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });
  }

  function createMap() {
    mapSvg = d3.select("#world-map").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; display: block; margin: 0 auto;");

    mapSvg.append("g").attr("class", "countries");

    createLegend();
    updateMap();
  }

  function updateMap() {
    if (!countriesGeoJson.features || !mapSvg) return;

    const projection = d3.geoMercator().center([0, 0]).scale(150).translate([width / 2, (height + margin.top) / 2]);
    const path = d3.geoPath(projection);

    const countries = mapSvg.select(".countries").selectAll("path").data(countriesGeoJson.features);

    countries.enter().append("path").merge(countries)
      .attr("fill", d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070")
      .attr("stroke", "#333")
      .attr("d", path);

    countries.select("title").remove();

    countries.append("title").text(d => `${d.properties.ADMIN}: ${goldMiningData.has(d.properties.ISO_A3) ? goldMiningData.get(d.properties.ISO_A3) + ' tonnes' : 'No data'}`);

    countries.exit().remove();
  }

  function createLegend() {
    const legendContainer = d3.select("#legend-container");
    legendContainer.selectAll("*").remove();
    legendContainer.append(() => Legend(colorScale2010, { title: `Gold Mining Production Volume Tonnes (2010)`, width: 260 }));
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

    const svg = d3.create("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]).style("overflow", "visible").style("display", "block");

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
      const thresholds = color.thresholds ? color.thresholds() : color.quantiles ? color.quantiles() : color.domain();
      const thresholdFormat = tickFormat === undefined ? d => d : typeof tickFormat === "string" ? d3.format(tickFormat) : tickFormat;

      x = d3.scaleLinear().domain([-1, color.range().length - 1]).rangeRound([marginLeft, width - marginRight]);

      svg.append("g").selectAll("rect").data(color.range()).join("rect")
        .attr("x", (d, i) => x(i - 1))
        .attr("y", marginTop)
        .attr("width", (d, i) => x(i) - x(i - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", d => d);

      tickValues = d3.range(thresholds.length);
      tickFormat = i => thresholdFormat(thresholds[i], i);
    } else {
      x = d3.scaleBand().domain(color.domain()).rangeRound([marginLeft, width - marginRight]);

      svg.append("g").selectAll("rect").data(color.domain()).join("rect")
        .attr("x", x)
        .attr("y", marginTop)
        .attr("width", Math.max(0, x.bandwidth() - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", color);

      tickAdjust = () => {};
    }

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined).tickFormat(typeof tickFormat === "function" ? tickFormat : undefined).tickSize(tickSize).tickValues(tickValues))
      .call(tickAdjust)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text").attr("x", marginLeft).attr("y", marginTop + marginBottom - height - 6).attr("fill", "currentColor").attr("text-anchor", "start").attr("font-weight", "bold").text(title));

    return svg.node();
  }

  function switchToMap() {
    document.getElementById('world-map').style.display = 'block';
    document.getElementById('bar-chart').style.display = 'none';
    searchBarVisible.set(true);
    // Wait for DOM update and then re-attach event listeners
    setTimeout(() => {
      attachSearchEventListeners();
    }, 0);
  }

  function switchToBarChart() {
    document.getElementById('world-map').style.display = 'none';
    document.getElementById('bar-chart').style.display = 'block';
    searchBarVisible.set(false);
    updateBarChart(); // Ensure bar chart is updated when switched to
  }

  function attachSearchEventListeners() {
    const searchBox = document.getElementById('country-search');
    if (searchBox) {
      searchBox.removeEventListener('input', searchCountry);
      searchBox.removeEventListener('focus', showSuggestionsContainer);
      searchBox.removeEventListener('blur', hideSuggestionsContainer);
      searchBox.addEventListener('input', searchCountry);
      searchBox.addEventListener('focus', showSuggestionsContainer);
      searchBox.addEventListener('blur', hideSuggestionsContainer);
    }
  }

  function searchCountry(event) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm === '') {
      hideInfoBox();
      mapSvg.selectAll('path')
        .attr('stroke-width', 0.5)
        .attr('stroke', '#333')
        .attr('fill', d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070");
      return;
    }
    const filteredCountries = countryNames.filter(name => name.toLowerCase().includes(searchTerm));
    showSuggestions(filteredCountries);

    const matchedCountry = countriesGeoJson.features.find(d => d.properties.ADMIN.toLowerCase().includes(searchTerm));
    if (matchedCountry) {
      mapSvg.selectAll('path')
        .attr('stroke-width', 0.5)
        .attr('stroke', '#333')
        .attr('fill', d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070");

      mapSvg.selectAll('path')
        .filter(d => d === matchedCountry)
        .attr('stroke-width', 2)
        .attr('stroke', 'red')
        .attr('fill', 'red');

      showInfoBox(matchedCountry);
    } else {
      mapSvg.selectAll('path')
        .attr('stroke-width', 0.5)
        .attr('stroke', '#333')
        .attr('fill', d => goldMiningData.has(d.properties.ISO_A3) ? colorScale2010(goldMiningData.get(d.properties.ISO_A3)) : "#3cd070");

      hideInfoBox();
    }
  }

  function showInfoBox(country) {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'block';
    infoBox.innerHTML = `<strong>${country.properties.ADMIN}</strong><br>Gold Production: ${goldMiningData.has(country.properties.ISO_A3) ? goldMiningData.get(country.properties.ISO_A3) + ' tonnes' : 'No data'}`;
  }

  function hideInfoBox() {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'none';
    infoBox.innerHTML = '';
  }

  function showSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('suggestions-container');
    suggestionsContainer.innerHTML = '';

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
    setTimeout(() => {
      const suggestionsContainer = document.getElementById('suggestions-container');
      suggestionsContainer.style.display = 'none';
    }, 200);
  }
</script>

<h1 class="body-header">Gold Mine Production</h1>
<p class="body-text">
  This visualization shows gold mine productions among the major countries from 2010 to 2022. We want to explore whether the increase or the decrease of mine production is the main factor influencing the gold price. In this visualization, we provide a choropleth world map and a bar chart to visualize the gold mine production. In the choropleth map, you can move the year slider to observe how much gold mine production change over years and you could also use search box to check the gold mine production of a specific country. In  the bar chart, you could compare the first ten countries with highest gold mine production and you could also move year slider to observe how much these top ten gold mine production change over time.
</p>

<div id="controls" style="margin: 1rem auto; width: 80%; text-align: left; display: flex; align-items: center;">
  <button on:click={switchToMap} style="background-color: #4CAF50; color: white; padding: 10px 20px; margin-right: 10px; border: none; cursor: pointer;">World Gold Mining Map</button>
  <button on:click={switchToBarChart} style="background-color: #008CBA; color: white; padding: 10px 20px; margin-right: 10px; border: none; cursor: pointer;">World Gold Mining Bar Chart</button>
  <label for="year-slider" style="margin-right: 10px;">Year <span>{$selectedYear}</span> :</label>
  <input type="range" id="year-slider" min="2010" max="2022" bind:value={$selectedYear} style="width: 30%; margin-right: 10px;" autocomplete="off">
  {#if $searchBarVisible}
    <input type="text" id="country-search" placeholder="Search country" style="width: 20%;" autocomplete="off">
    <div id="suggestions-container" style="position: fixed; background: white; border: 1px solid #ccc; z-index: 10; max-height: 150px; overflow-y: auto; display: none;"></div>
  {/if}
</div>

<div id="world-map" style="position: relative; margin: auto; max-height: 75vh; width: 80%; margin: 2rem auto;">
  <div id="legend-container" style="position: absolute; bottom: 10px; right: 10px;"></div>
  <div id="info-box" style="display: none; position: absolute; background: white; border: 1px solid #ccc; padding: 10px; z-index: 10; width: 200px; height: 100px; bottom: 10px; left: 10px;"></div>
</div>

<div id="bar-chart" style="display: none; position: relative; margin: auto; max-height: 75vh; width: 80%; margin: 2rem auto;"></div>
<p class="body-text">
  In conclusion, the total gold mine production increase slightly among major countries from 2010 to 2022. There is no big increase or decrease in gold mine production. Gold mine production is probably not the major component to determine the gold price.
</p>
<style>
  #controls {
    margin-bottom: 1rem;
    position: relative;
  }
  #year-slider {
    display: block;
    width: 30%;
  }
  #country-search {
    display: block;
    width: 20%;
    margin-left: 10px;
  }
  #suggestions-container {
    bottom: 60px;
    left: 0px;
  }
  .suggestion {
    padding: 5px;
    cursor: pointer;
  }
  .suggestion:hover {
    background-color: #f0f0f0;
  }
  .tooltip {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    padding: 10px;
    display: none;
  }
</style>
