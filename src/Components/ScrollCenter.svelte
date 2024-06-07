<script>
  import Scrolly from "./Scrolly.svelte";
  import { select, selectAll } from "d3-selection";
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { writable } from 'svelte/store';

  let value;
  $: steps = [
    `<h1 class='step-title'>Gold ETFs Holdings & Gold Prices by Month</h1>
    <br><br>
    <p>
      Try single-click, double-click on the buttons on the left or 
      playing with the grey bar below the chart!
      What did you say? How to play with the grey bar? 
      Click and drag the far left side of the grey bar or the far right side. 
      You will see the chart changed. Now you can also drag the middle area of the bar around. 
    </p>`,
  ];

  const target2event = {
    0: () => {
      select("#chart3").style("background-color", "darkorange");
      select("#chart4").style("background-color", "black");
    },
    1: () => {
      select("#chart3").style("background-color", "salmon");
      select("#chart4").style("background-color", "pink");
    },
  };

  $: if (typeof value !== "undefined") target2event[value]();

  const selectedRegions = writable({
        North_America: true,
        Europe: true,
        Asia: true,
        Other: true,
        Gold_Price: true,
    });

    let data, svg, x, y, y2, area, line, tooltip, brush, brushSvg, brushX, brushY, brushHeight;
    let brushSelection = null;

    const color = d3.scaleOrdinal()
        .domain(["North_America", "Europe", "Asia", "Other"])
        .range(["#002b63", "#09b3d9", "#1cb614", "#dc3545"]);

    function updateChart(margin, width, height) {
        const currentRegions = [];
        selectedRegions.subscribe(sel => {
            for (const region in sel) {
                if (sel[region]) {
                    currentRegions.push(region);
                }
            }
        })();

        const keys = currentRegions.filter(key => key !== 'Gold_Price');
        const stack = d3.stack().keys(keys);
        const series = stack(data);

        y = d3.scaleLinear()
            .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
            .range([height, 0]);

        y2 = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Gold_Price)])
            .range([height, 0]);

        svg.selectAll("*").remove();

        // Define clip path
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        svg.selectAll("path.area")
            .data(series)
            .enter().append("path")
            .attr("class", "area")
            .attr("d", area)
            .attr("fill", d => color(d.key))
            .style("display", d => currentRegions.includes(d.key) ? null : "none")
            .attr("clip-path", "url(#clip)")
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible").text(d.key.replace("_", " "));
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY - 10) + "px")
                       .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        if (currentRegions.includes('Gold_Price')) {
            svg.append("path")
                .datum(data)
                .attr("class", "line")
                .attr("d", line)
                .attr("stroke", "#cbb80e")
                .attr("stroke-width", 3)
                .attr("fill", "none")
                .attr("clip-path", "url(#clip)");
        }

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
            .attr("x2", width)
            .attr("stroke-opacity", 0.1));

        svg.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(y2))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").remove());

        svg.append("text")
            .attr("class", "y axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${0 - margin.left / 2 + 135},${-10})`)
            .text("Holdings(Tonnes)");

        svg.append("text")
            .attr("class", "y2 axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${width + margin.right / 2 - 60},${-10})`)
            .text("Gold(US$/oz)");

        brushY = d3.scaleLinear()
            .range([brushHeight, 0]);

        brushSvg.append("path")
            .datum(data)
            .attr("class", "brush-area")
            .attr("d", d3.area()
                .x(d => brushX(d.Date))
                .y0(brushHeight)
                .y1(d => brushY(d.Gold_Price)))
            ;
        
        brushSvg.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, brushSelection ? brushSelection.map(brushX) : brushX.range())
            .attr("fill", "white");
    }

    function toggleRegion(region) {
        selectedRegions.update(sel => {
            sel[region] = !sel[region];
            return sel;
        });
    }

    onMount(async () => {

        const margin = { top: 40, right: 50, bottom: 30, left: 220 };
        const width = 960 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 20)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const brushHeight = 50;
        const brushMargin = { top: height + 50, right: margin.right - 6, bottom: margin.bottom, left: margin.left };
            
        brushSvg = d3.select("#brush")
            .append("svg")
            .attr("width", width + brushMargin.left + brushMargin.right)
            .attr("height", brushHeight + brushMargin.top + brushMargin.bottom)
            .append("g")
            .attr("transform", `translate(${brushMargin.left},${brushMargin.top})`);
        
        const parseDate = d3.timeParse("%Y-%m-%d");

        try {
            data = await d3.csv('./assets/gold_data.csv', d => ({
                Date: parseDate(d.Date),
                North_America: +d.North_America,
                Europe: +d.Europe,
                Asia: +d.Asia,
                Other: +d.Other,
                Gold_Price: +d["Gold Price"]
            }));

            console.log(data);

            x = d3.scaleTime()
                .domain(d3.extent(data, d => d.Date))
                .range([0, width]);

            area = d3.area()
                .x(d => x(d.data.Date))
                .y0(d => y(d[0]))
                .y1(d => y(d[1]));

            line = d3.line()
                .x(d => x(d.Date))
                .y(d => y2(d.Gold_Price));

            tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("z-index", "10")
                .style("visibility", "hidden")
                .style("background", "#fff")
                .style("border", "1px solid #ccc")
                .style("padding", "5px")
                .style("border-radius", "5px")
                .style("font-size", "12px");

            brushX = d3.scaleTime()
                .domain(x.domain())
                .range([0, width]);

            brush = d3.brushX()
                .extent([[0, 0], [width, brushHeight]])
                .on("brush end", brushed);

            function brushed({ selection }) {
                if (selection) {
                    brushSelection = selection.map(brushX.invert);
                    const [x0, x1] = brushSelection;
                    x.domain([x0, x1]);

                    svg.selectAll("path.area")
                        .attr("d", area);

                    svg.selectAll("path.line")
                        .attr("d", line);

                    svg.select(".x.axis").call(d3.axisBottom(x));
                }
            }

            selectedRegions.subscribe(() => updateChart(margin, width, height));
            updateChart(margin, width, height);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    });
</script>

<h2 class="body-header">Other explorations about gold prices</h2>
<p class="body-text">
  Let's look at gold ETF and the correlation between it and the rise and fall of Gold Prices. 
  ETF stands for exchange-traded funds. Physically-backed gold exchange-traded funds (gold ETFs) are 
  an important source of gold demand, with institutional and individual investors using them as 
  part of well-diversified investment strategies. The comprehensive dataset we use covers more than 100 
  physically-backed gold ETFs and similar products worldwide, providing regional and fund-specific 
  analysis of demand in tonnes from April 2003 to April 2025. What's more, you can also see the 
  gold price changes over the same period of time on the same graph.
</p>
<section>
  <div class="section-container">
    <div class="steps-container">
      <Scrolly bind:value>
        {#each steps as text, i}
          <div class="step" class:active={value === i}>
            <div class="step-content">{@html text}</div>
          </div>
        {/each}
        <div class="spacer" />
      </Scrolly>
    </div>
    <div class="charts-container">
      <div id="wrapper">
        <div class="buttons">
          <button class="btn-na" on:click={() => toggleRegion('North_America')}
              class:selected="{!$selectedRegions.North_America}">North_America</button>
          <button class="btn-eu" on:click={() => toggleRegion('Europe')}
              class:selected="{!$selectedRegions.Europe}">Europe</button>
          <button class="btn-as" on:click={() => toggleRegion('Asia')}
              class:selected="{!$selectedRegions.Asia}">Asia</button>
          <button class="btn-ot" on:click={() => toggleRegion('Other')}
              class:selected="{!$selectedRegions.Other}">Other</button>
          <button class="btn-gp" on:click={() => toggleRegion('Gold_Price')}
              class:selected="{!$selectedRegions.Gold_Price}">Gold_Price</button>
        </div>
        <div id="chart"></div>
        <div id="brush"></div>
      </div>
    </div>
  </div>
  <br /><br />
</section>
<p class="body-text">
  As we can see, overall there seems to be a positive correlation between gold ETFs and gold price.
  At the same time we can also see the negative correlation between them starting from roughly 2023.
  <br><br>
</p>

<style>
  #wrapper {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    height: 100%;
  }

  #chart {
      font-family: sans-serif;
      text-align: left;
      height: 80vh;
      flex-grow: 1;
      z-index: 1;
  }

  #brush {
      margin-top: 20px;
      position: absolute;
      left: 0px;
      z-index: 1;
  }

  .buttons {
      display: flex;
      flex-direction: column;
      margin-right: 20px;
      margin-left: 0;
      position: absolute;
      left: 28px;
      top: 110px;
      z-index: 10;
  }

  button {
      margin-bottom: 10px;
      padding: 10px;
      font-size: 16px;
      cursor: pointer;
      border: 1px solid #ccc;
      border-radius: 5px;
      color: white;
  }

  button.selected {
      background-color: rgb(214, 214, 214);
      color: black;
  }

  .btn-na {
      background-color: #002b63;
  }

  .btn-eu {
      background-color: #09b3d9;
  }

  .btn-as {
      background-color: #1cb614;
  }

  .btn-ot {
      background-color: #dc3545;
  }

  .btn-gp {
      background-color: #cbb80e;
  }
/* space after scroll is finished */
.spacer {
  height: 40vh;
}

.charts-container {
  position: sticky;
  top: 10%;
  display: grid;
  width: 100%;
  grid-template-columns: 100%;
  grid-row-gap: 2rem;
  grid-column-gap: 0rem;
  grid-template-rows: repeat(2, 1fr);
  height: 72vh;
  border: 3px solid black;
  z-index: 1;
}

.section-container {
  margin-top: 1em;
  text-align: center;
  transition: background 100ms;
  display: flex;
}

.step {
  height: 110vh;
  display: flex;
  place-items: center;
  justify-content: center;
}

.step-content {
  font-size: 18px;
  background: var(--bg);
  color: #ccc;
  border-radius: 1px;
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: background 500ms ease;
  text-align: left;
  width: 75%;
  margin: auto;
  max-width: 500px;
  font-family: var(--font-main);
  line-height: 1.3;
  border: 5px solid var(--default);
}

.step.active .step-content {
  background: #f1f3f3ee;
  color: var(--squid-ink);
}

.steps-container {
  height: 100%;
}

.steps-container {
  flex: 1 1 40%;
  z-index: 11;
}

/* make side centered */
.section-container {
  flex-direction: column-reverse;
}

.steps-container {
  pointer-events: none;
}

.charts-container {
  top: 7.5%;
  width: 75%;
  margin: auto;
}

.step {
  height: 130vh;
}

.step-content {
  width: 65%;
  max-width: 768px;
  font-size: 17px;
  line-height: 1.6;
}

.spacer {
  height: 100vh;
}
</style>
