<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3-fetch';
  import { geoMercator, geoPath } from 'd3-geo';
  import { scaleSequential } from 'd3-scale';
  import { extent, interpolateYlGnBu } from 'd3';
  import { feature } from 'topojson-client';

  let countriesGeoJson = {};
  let goldMiningData = new Map();
  let error = '';
  let width = 928;
  let height = 600; // Increased the height
  let margin = { top: 100, bottom: 0, left: 0, right: 0 }; // Adjusted top margin

  onMount(async () => {
    try {
      // Load GeoJSON data
      const geoJsonData = await d3.json('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/countries.geojson');
      
      if (geoJsonData.type === 'FeatureCollection' && Array.isArray(geoJsonData.features)) {
        countriesGeoJson = geoJsonData;
        console.log("GeoJSON data:", countriesGeoJson);
      } else {
        throw new Error('Invalid GeoJSON structure');
      }

      // Load CSV data
      const rawData = await d3.csv('https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/Gold-Mining-Production-Volumes-Data.csv');
      processData(rawData);
    } catch (err) {
      error = 'Failed to load data. Please try again later.';
      console.error(err);
    }
  });

  function processData(rawData) {
    rawData.forEach(item => {
      const countryID = item['CountryID'];
      const value2010 = parseFloat(item['2010']);
      if (countryID && !isNaN(value2010)) {
        goldMiningData.set(countryID, value2010);
      }
    });
    console.log('Gold Mining Data 2010:', goldMiningData);
  }

  let projection;
  let path;
  let colorScale;

  $: if (countriesGeoJson.features) {
    projection = geoMercator()
      .center([0, 0]) // Center of the map
      .scale(150)
      .translate([width / 2, (height + margin.top) / 2]); // Adjusted translation
    path = geoPath(projection);

    // Create a color scale based on the data
    const values = Array.from(goldMiningData.values());
    colorScale = scaleSequential(extent(values), interpolateYlGnBu);
  }
</script>

<h1 class="body-header">World Map Example</h1>
<p class="body-text">
  This component is an example of a responsive world map built with Svelte and D3.js.
</p>

<div id="world-map" bind:offsetWidth={width} bind:offsetHeight={height}>
  <svg
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    style="max-width: 100%; height: auto;"
  >
    {#if countriesGeoJson.features}
      <!-- Add a path for each country -->
      <g>
        {#each countriesGeoJson.features as feature}
          {#if goldMiningData.has(feature.properties.ISO_A3)}
            <path
              fill={colorScale(goldMiningData.get(feature.properties.ISO_A3))}
              stroke="#333"
              d={path(feature)}
            >
              <title>{feature.properties.ADMIN}: {goldMiningData.get(feature.properties.ISO_A3)}</title>
            </path>
          {:else}
            <path
              fill="#ccc"
              stroke="#333"
              d={path(feature)}
            >
              <title>{feature.properties.ADMIN}: No data</title>
            </path>
          {/if}
        {/each}
      </g>
    {/if}
  </svg>
</div>

<style>
  #world-map {
    margin: auto;
    max-height: 75vh; /* Increased max-height */
    width: 80%; /* Adjusted width */
    margin: 2rem auto; /* Adjusted margin */
  }

  path {
    stroke-width: 0.5px;
  }

  /* Add additional styles as needed */
</style>
