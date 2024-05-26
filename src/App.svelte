<script>
  import Meta from "./Meta.svelte";
  import Title from "./Components/Title.svelte";
  import Intro from "./Components/Intro.svelte";
  import TextAndMathEquations from "./Components/TextAndMathEquations.svelte";
  import LineChart from "./Components/LineChart.svelte";
  import ScrollCenter from "./Components/ScrollCenter.svelte";
  import Conclusion from "./Components/Conclusion.svelte";
  import Resources from "./Components/Resources.svelte";
  import ScrollSide from "./Components/ScrollSide.svelte";
  const basePath = process.env.BASE_PATH || '/';
</script>

<Meta />
<Title />
<Intro />
<TextAndMathEquations />
<ScrollSide />
<LineChart />
<ScrollCenter />
<Conclusion />
<Resources />

<img src={`${basePath}assets/favicon.svg`} alt="favicon">
