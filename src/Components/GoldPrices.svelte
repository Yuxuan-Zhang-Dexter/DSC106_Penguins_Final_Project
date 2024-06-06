<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";

  export let type; // "year" or "month"
  export let range; // "before2005" or "after2005" or "all"

  let chartContainer;

  async function drawChart() {
    const dataUrl =
      type === "year"
        ? "https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/prices_year.csv"
        : "https://raw.githubusercontent.com/Yuxuan-Zhang-Dexter/DSC106_Penguins_Final_Project/yuxuan/dataset/prices_month.csv";
    const dateField = type === "year" ? "Date_Year" : "Date_Month";

    const data = await d3.csv(dataUrl, (d) => ({
      date: new Date(d[dateField]),
      price: +d.USD,
    }));

    let filteredData;
    if (range === "before2005") {
      filteredData = data.filter((d) => d.date < new Date("2005-01-01"));
    } else if (range === "after2005") {
      filteredData = data.filter((d) => d.date >= new Date("2005-01-01"));
    } else {
      filteredData = data;
    }

    const maxPrice = d3.max(data, d => d.price);

    const width = 400;
    const height = 300;
    const marginTop = 40;
    const marginRight = 30;
    const marginBottom = 50;
    const marginLeft = 60; // Increased to provide more space for y-axis label

    const x = d3.scaleUtc()
      .domain(d3.extent(filteredData, (d) => d.date))
      .range([marginLeft, width - marginRight]);

    const y = d3.scaleLinear()
      .domain([0, maxPrice])
      .nice()
      .range([height - marginBottom, marginTop]);

    const line = d3.line()
      .x((d) => x(d.date))
      .y((d) => y(d.price));

    const svg = d3.select(chartContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(d3.timeYear.every(3)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(10)) // Set a fixed number of ticks for similarity
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call((g) => g.append("text")
        .attr("x", -marginLeft + 10) // Adjusted to prevent overlap
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Gold price (USD per oz)"));

    svg.append("path")
      .datum(filteredData)
      .attr("fill", "none")
      .attr("stroke", type === "year" ? "blue" : "green")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add a title to the chart
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", marginTop - 10) // Moved down by increasing y-value
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(type === "year" ? `Yearly Gold Prices (${range})` : `Monthly Gold Prices (${range})`);
  }

  onMount(drawChart);
</script>

<div bind:this={chartContainer}></div>

<style>
  div {
    width: 100%;
    height: 100%;
  }
</style>
