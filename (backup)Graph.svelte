<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { writable } from 'svelte/store';

    const selectedRegions = writable({
        North_America: true,
        Europe: true,
        Asia: true,
        Other: true,
        Gold_Price: true,
    });

    let data, svg, x, y, y2, area, line, tooltip;

    // change colors here
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

        svg.selectAll("path.area")
            .data(series)
            .enter().append("path")
            .attr("class", "area")
            .attr("d", area)
            .attr("fill", d => color(d.key))
            .style("display", d => currentRegions.includes(d.key) ? null : "none")
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
                .attr("fill", "none");
        }

        svg.append("g")
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
            .attr("transform", `translate(${0 - margin.left / 2 + 55},${-10})`)
            .text("Holdings(Tonnes)");

        svg.append("text")
            .attr("class", "y2 axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${width + margin.right / 2 - 60},${-10})`)
            .text("Gold(US$/oz)");
    }

    function toggleRegion(region) {
        selectedRegions.update(sel => {
            sel[region] = !sel[region];
            return sel;
        });
    }

    onMount(async () => {

        // graph size adjust
        const margin = { top: 40, right: 100, bottom: 30, left: 60 };
        const width = 960 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 20)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
            
        const parseDate = d3.timeParse("%Y-%m-%d");

        try {
            data = await d3.csv('/src/data/gold_data.csv', d => ({
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

            selectedRegions.subscribe(() => updateChart(margin, width, height));
            updateChart(margin, width, height);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    });
</script>

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
</div>

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
    }

    .buttons {
        display: flex;
        flex-direction: column;
        margin-right: 20px;
        margin-left: 0;
        position: absolute;
        left: 110px;
        top: 175px;
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
</style>
