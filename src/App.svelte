<script lang="ts">
  import {addPairs, addPercentChange, generatePaths} from './utils/path-utils';
  import {getPairings, subscribeAction, unsubscribeAction} from './utils/exchange';
  import {onMount} from 'svelte';
  import StickyContent from './components/StickyContent.svelte';

  let feePerTrade = 75;

  let availableQuoteAssets: string[] = [];
  let availableBaseAssets: string[] = [];
  let relatedQuoteAssets: string[] = [];
  let selectedAssets: string[] = [];

  let paths = [];
  let prices: Record<string, number> = {};
  let pairings: Record<string, string[]> = {};
  let activePairIds: string[] = [];

  let ws: WebSocket;
  let wsStatus: 'red' | 'green' | 'yellow' = 'red';
  let sortingInterval: number;

  onMount(() => {
    getPairings().then(remotePairings => {
      pairings = remotePairings;
      availableQuoteAssets = Object.keys(remotePairings);
      availableBaseAssets = [...new Set((Object.values(remotePairings) as string[]).flat(1))]
        .filter(base => !Object.keys(remotePairings).includes(base));
    });

    initTicker();
  });

  function initTicker() {
    ws = new WebSocket('wss://stream.binance.com/stream');
    ws.onopen = () => {
      wsStatus = 'green';
      sortingInterval = setInterval(sortPaths, 1000);
      if (activePairIds.length > 0) {
        ws.send(subscribeAction(activePairIds));
      }
    };
    ws.onmessage = stream => {
      const data = JSON.parse(stream.data);
      if (data?.data) {
        const {s, a, b} = data.data;
        prices[s] = {'BUY': a, 'SELL': b};
        addPercent(paths, s);
      }
    };
    ws.onclose = () => {
      wsStatus = 'red';
      clearInterval(sortingInterval);
      setTimeout(() => {
        wsStatus = 'yellow';
        initTicker();
      }, 1000);
    };
  }

  function handleWsSubscriptions(possiblePaths) {
    const pairIds = [...new Set(possiblePaths.flatMap(path => path.pairs.map(pair => pair.tickerName)))];

    let newPairIds = pairIds.filter(id => !activePairIds.includes(id));
    if (newPairIds.length > 0) {
      ws.send(subscribeAction(newPairIds));
      activePairIds = [...activePairIds, ...newPairIds];
    }

    let oldPairIds = activePairIds.filter(id => !pairIds.includes(id));
    if (oldPairIds.length > 0) {
      ws.send(unsubscribeAction(oldPairIds));
      activePairIds = activePairIds.filter(id => !oldPairIds.includes(id));
    }
  }

  function sortPaths() {
    paths = paths.sort((a, b) => b.percent - a.percent);
  }

  function addPercent(possiblePaths, changedId?) {
    const fees = (feePerTrade || 0) / 100000;
    paths = possiblePaths.map(addPercentChange(prices, fees, changedId));
  }

  function newPaths(possiblePaths) {
    if (possiblePaths.length > paths.length) {
      return possiblePaths.map(possiblePath => paths.find(({joined}) => joined === possiblePath.joined) || possiblePath);
    } else {
      return paths.filter(({joined}) => possiblePaths.map(({joined}) => joined).includes(joined));
    }
  }

  function fillPaths() {
    const nextPaths = generatePaths(selectedAssets)
      .map(addPairs(pairings))
      .filter(path => path.pairs.every(Boolean));

    handleWsSubscriptions(nextPaths);
    addPercent(newPaths(nextPaths));
  }

  function toggleAsset(asset) {
    if (selectedAssets.includes(asset)) {
      selectedAssets = selectedAssets.filter(c => c !== asset);
    } else {
      selectedAssets = [...selectedAssets, asset];
    }
    fillPaths();
  }

  function showRelatedQuoteAssets(asset) {
    relatedQuoteAssets = Object.keys(pairings).filter(c => pairings[c].includes(asset));
  }

  function resetRelatedQuoteAssets() {
    relatedQuoteAssets = [];
  }

  function quoteBackgroundColor(selectedAssets: string[], relatedQuoteAssets: string[], asset: string) {
    const isSelected = selectedAssets.includes(asset);
    const isRelated = relatedQuoteAssets.includes(asset);
    return isSelected && isRelated ? '#c8c8e6'
      : isSelected ? '#c8c8c8'
        : isRelated ? '#c8c8ff'
          : '#fff';
  }
</script>

<style lang="postcss" global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #333;
    background-color: #fafaff;
  }

  li a {
    color: #333;
    text-decoration: none;
  }
</style>

<div class="h-4"></div>

<div class="flex">
  <div class="w-1/3">
    <div class="w-full h-full flex justify-center items-center">
      <img class="w-40" alt="logo"
           src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Logo_Comit%C3%A9_d%27arbitrage.svg/1024px-Logo_Comit%C3%A9_d%27arbitrage.svg.png"/>
    </div>
  </div>
  <div class="w-4"></div>
  <div class="flex flex-col w-2/3">
    <h1 class="text-2xl">
      Binance <span id="websocket-status" style="color: {wsStatus}">▲</span> Triangular arbitrage monitor
    </h1>
    <h2 class="test-xl">
      Monitoring arbitrage opportunities on Binance
    </h2>
    <div class="h-4"></div>
    <p class="w-[50vw]">
      This app monitors arbitrage opportunities on Binance. It is a web app that uses the Binance API to fetch the
      current price of the assets and then calculates the arbitrage opportunities. The arbitrage opportunities are then
      displayed in a table.
    </p>

    <div class="h-4"></div>

    <div class="p-4 shadow rounded bg-white">
      <div class="flex items-center justify-between">
        <nav>
          <ul class="flex gap-4">
            <li><a class="font-bold" href="#">Triangular</a></li>
            <li><a href="#">Quadupular</a></li>
            <li><a href="#">Quintupular</a></li>
          </ul>
        </nav>

        <form id="fees" class="flex items-center justify-center">
          <span>FEES</span>
          <div class="w-4"></div>
          <input bind:value={feePerTrade} on:keyup={() => addPercent()} type="number" class="p-1">
          <div class="w-4"></div>
          <span class="font-mono">{(feePerTrade / 1000).toFixed(4)}%</span>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="h-4"></div>

<div class="w-full flex">
  <div class="w-1/3">

    <div id="asset-buttons" class="shadow rounded bg-white">
      <div id="asset-buttons-description" class="p-4">
        <div class="text-2xl">Select Assets</div>
        <p>
          Click on the assets you want to monitor. First select a couple of quote asset, then the base assets.
          Hovering over an asset will highlight the related quote assets.
          Once you've selected base and quote assets, the arbitrage results will be displayed on the right.
        </p>

      </div>
      <StickyContent>

        <div slot="content">
          <div>
            <span class="text-xl">Quote Assets</span>
            <span>(select at least 2)</span>
          </div>
          <div class="flex flex-wrap justify-center">
            {#each availableQuoteAssets as asset}
              <button class="w-24 mr-1 mb-1"
                      value={asset}
                      style="background-color: {quoteBackgroundColor(selectedAssets, relatedQuoteAssets, asset)}"
                      on:click={() => toggleAsset(asset)}
                      on:mouseenter={() => showRelatedQuoteAssets(asset)}
                      on:mouseleave={resetRelatedQuoteAssets}>
                {asset}
              </button>
            {/each}
          </div>
        </div>

        <div slot="wrapper" class="p-4">
          <div class="h-4"></div>
          <div class="text-xl">Base Assets</div>
          <div class="flex flex-wrap justify-center">
            {#each availableBaseAssets as asset}
              <button class="w-24 mr-1 mb-1"
                      value={asset}
                      style="background-color: {selectedAssets.includes(asset) ? '#c8c8c8' : '#fff'}"
                      on:click={() => toggleAsset(asset)}
                      on:mouseenter={() => showRelatedQuoteAssets(asset)}
                      on:mouseleave={resetRelatedQuoteAssets}>
                {asset}
              </button>
            {/each}
          </div>
        </div>

      </StickyContent>
    </div>
  </div>

  <div class="w-4"></div>

  <div class="w-2/3">
    <div class="p-4 shadow rounded bg-white flex flex-col items-center">
      <div class="text-xl flex justify-center">Paths</div>
      {#if !paths.length}
        <div class="h-4"></div>
        <p>
          No paths found. Try to select different quote and base assets.
        </p>
      {/if}
      <div class="flex flex-wrap justify-center">
        {#each paths.filter(path => 'percent' in path) as path (path.joined)}
          <div class="flex">
            <span class="w-20 font-bold font-mono flex justify-end"
                  style="color: {path.isProfitable ? 'green' : 'red'};">
              {path.percent}%
            </span>
            <div class="w-1"></div>
            <span class="w-40">{path.joined}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<div class="h-4"></div>

<footer>
  © 2022 - Vince Liem
</footer>