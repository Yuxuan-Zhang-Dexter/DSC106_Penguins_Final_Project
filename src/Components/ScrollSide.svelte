<script>
  import Scrolly from "./Scrolly.svelte";
  import GoldPrices from "./GoldPrices.svelte";
  import { select } from "d3-selection";

  let value;

  // Paragraph text for scrolly
  $: steps = [
    `<h1 class='step-title'>Step 1: Stable Growth Period</h1>
       <br><br>
      <p>
        Before 2005, gold prices stayed relatively stable, with steady but modest increases. The demand for gold was driven by traditional factors such as jewelry, technology, and some investment. There were no significant economic upheavals during this period, allowing for a stable growth pattern.
      </p>`,
    `<h1 class='step-title'>Step 2: Dramatic Increase in Gold Prices</h1>
      <p>
        After 2005, gold prices began to increase dramatically. This was due to a variety of factors, including the financial crisis of 2008, increased investment demand, and geopolitical uncertainties. Although there was a short period of stability, recent years have seen significant increases in gold prices, driven by economic uncertainties and inflation concerns.
      </p>
    <br><br>
    The last five years have especially seen a significant rise in gold prices due to the COVID-19 pandemic, economic stimulus measures, and global economic instability.
  `,
  ];

  const target2event = {
    0: () => {
      select("#chart1").style("display", "block");
      select("#chart2").style("display", "none");
      select("#chart3").style("display", "block");
      select("#chart4").style("display", "none");
    },
    1: () => {
      select("#chart1").style("display", "none");
      select("#chart2").style("display", "block");
      select("#chart3").style("display", "none");
      select("#chart4").style("display", "block");
    },
    2: () => {
      select("#chart1").style("background-color", "transparent");
      select("#chart2").style("background-color", "transparent");
      select("#chart3").style("background-color", "transparent");
      select("#chart4").style("background-color", "transparent");
    },
  };

  $: if (typeof value !== "undefined") target2event[value]();
</script>

<h2 class="body-header">Gold Prices Analysis: Factors Influencing Changes</h2>
<p class="body-text">
  The analysis of gold prices over the years reveals significant trends influenced by various economic, political, and social factors. By understanding these changes, we can better grasp the underlying causes and potential future movements in gold prices.
</p>
<section>
  <!-- scroll container -->
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
      <div class="chart" id="chart1">
        <GoldPrices type="year" range="before2005" />
      </div>
      <div class="chart" id="chart2" style="display: none;">
        <GoldPrices type="year" range="all" />
      </div>
      <div class="chart" id="chart3">
        <GoldPrices type="month" range="before2005" />
      </div>
      <div class="chart" id="chart4" style="display: none;">
        <GoldPrices type="month" range="all" />
      </div>
    </div>
  </div>
  <br /><br />
  <p class="body-text">
    Understanding the historical trends in gold prices provides valuable insights into the market's response to various global events. By analyzing these trends, we can explore the potential factors driving changes in gold prices and make more informed predictions about future movements.
  </p>
</section>

<style>
  #chart1,
  #chart2,
  #chart3,
  #chart4 {
    width: 100%;
    height: 300px; /* Adjust the height to fit within the container */
  }
  .chart {
    width: 100%;
    height: 300px; /* Adjust the height to fit within the container */
  }
  /* space after scroll is finished */
  .spacer {
    height: 40vh;
  }

  .charts-container {
    position: -webkit-sticky; /* Required for Safari */
    position: sticky;
    top: 10%; /* This keeps the container at the top while scrolling */
    display: grid;
    width: 100%; /* Adjust width to better fit the viewport */
    max-width: 600px; /* Ensure it doesn't exceed a reasonable width */
    grid-template-columns: 1fr; /* Single column */
    grid-template-rows: repeat(2, 300px); /* Two rows */
    grid-gap: 1rem; /* Add some gap between the charts */
    height: 620px; /* Adjust the height to fit both charts within the box */
    border: 3px solid black;
    padding: 1rem; /* Add some padding */
    box-sizing: border-box;
  }

  .section-container {
    margin-top: 1em;
    text-align: center;
    transition: background 100ms;
    display: flex;
    justify-content: space-between; /* Space between steps and charts */
  }

  .step {
    height: 110vh;
    display: flex;
    place-items: center;
    justify-content: center;
  }

  .step-content {
    font-size: 18px;
    background: rgba(255, 255, 255, 0.9); /* Slightly opaque white background for better visibility */
    color: #333; /* Darker text color for better contrast */
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
    font-family: var (--font-main);
    line-height: 1.3;
    border: 1px solid #ccc; /* Light border */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Subtle shadow for better visibility */
  }

  .step.active .step-content {
    background: rgba(240, 240, 240, 0.95); /* Slightly darker background when active */
    color: var (--squid-ink);
  }

  .steps-container {
    height: 100%;
    flex: 1 1 40%; /* Take up 40% of the width */
    z-index: 10;
    margin-right: 2rem; /* Add space between steps and charts */
  }

  /* Comment out the following line to always make it 'text-on-top' */
  @media screen and (max-width: 950px) {
    .section-container {
      flex-direction: column;
    }

    .steps-container {
      pointer-events: none;
      margin-right: 0; /* Remove margin in mobile view */
    }

    .charts-container {
      top: 7.5%;
      width: 95%;
      margin: auto;
    }

    .step {
      height: 130vh;
    }

    .step-content {
      width: 95%;
      max-width: 768px;
      font-size: 17px;
      line-height: 1.6;
    }

    .spacer {
      height: 100vh;
    }
  }
</style>
