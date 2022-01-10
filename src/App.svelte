<script lang="ts">
  import {addPairs, addPercentChange, generatePaths} from './utils/path-utils'
  import {getPairings, subscribeAction, unsubscribeAction} from './utils/exchange'
  import {onMount} from 'svelte'

  let feePerTrade = 750
  let selectedCurrencies = []

  let availableQuoteCurrencies = []
  let availableBaseCurrencies = []
  let paths = []
  let prices = {}
  let pairings = {}
  let activePairIds = []

  let ws
  let wsStatus = 'red'
  let sortingInterval

  onMount(() => {
    getPairings().then(remotePairings => {
      pairings = remotePairings
      availableQuoteCurrencies = Object.keys(remotePairings)
      availableBaseCurrencies = [...new Set(Object.values(remotePairings).flat(1))]
        .filter(base => !Object.keys(remotePairings).includes(base))
    })

    initTicker()
  })

  function initTicker() {
    ws = new WebSocket('wss://stream.binance.com/stream')
    ws.onopen = () => {
      wsStatus = 'green'
      sortingInterval = setInterval(sortPaths, 1000)
      if (activePairIds.length > 0) {
        ws.send(subscribeAction(activePairIds))
      }
    }
    ws.onmessage = stream => {
      const data = JSON.parse(stream.data)
      if (data?.data) {
        const {s, a, b} = data.data
        prices[s] = {'BUY': a, 'SELL': b}
      }
      addPercent()
    }
    ws.onclose = () => {
      wsStatus = 'red'
      clearInterval(sortingInterval)
      setTimeout(() => {
        wsStatus = 'yellow'
        initTicker()
      }, 1000)
    }
  }

  function handleWsSubscriptions(possiblePaths) {
    const pairIds = [...new Set(possiblePaths.flatMap(path => path.pairs.map(pair => pair.tickerName)))]

    let newPairIds = pairIds.filter(id => !activePairIds.includes(id))
    if (newPairIds.length > 0) {
      ws.send(subscribeAction(newPairIds))
      activePairIds = [...activePairIds, ...newPairIds]
    }

    let oldPairIds = activePairIds.filter(id => !pairIds.includes(id))
    if (oldPairIds.length > 0) {
      ws.send(unsubscribeAction(oldPairIds))
      activePairIds = activePairIds.filter(id => !oldPairIds.includes(id))
    }
  }

  function sortPaths() {
    paths = paths.sort((a, b) => b.percent - a.percent)
  }

  function addPercent(possiblePaths = paths) {
    paths = possiblePaths.map(addPercentChange(prices, feePerTrade))
  }

  function fillPaths() {
    const possiblePaths = generatePaths(selectedCurrencies)
      .map(addPairs(pairings))
      .filter(path => path.pairs.every(Boolean))

    handleWsSubscriptions(possiblePaths)
    addPercent(possiblePaths)
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
    background-color: #fafafa;
  }

</style>

<div class="h-4"></div>

<div class="flex justify-center items-center">
  <h1 class="text-2xl">
    Binance <span style="color: {wsStatus}">▲</span> Triangular arbitrage monitor
  </h1>
</div>

<div class="h-4"></div>

<div class="flex justify-center items-center">
  <div class="p-4 shadow">
    <div class="flex items-center">
      <span>FEES</span>
      <div class="w-4"></div>
      <input bind:value={feePerTrade} on:keyup={addPercent} type="number">
      <div class="w-4"></div>
      <span>{feePerTrade / 10000}%</span>
    </div>
  </div>
</div>

<div class="h-4"></div>

<div class="w-full flex">
  <div class="w-1/3">

    <div class="p-4 shadow">
      <div class="text-xl">Quote Currencies</div>
      <div class="flex flex-wrap">
        {#each availableQuoteCurrencies as currency}
          <label class="w-24">
            <input type=checkbox bind:group={selectedCurrencies} value={currency} on:change={fillPaths}>
            {currency}
          </label>
        {/each}
      </div>
    </div>

    <div class="h-4"></div>

    <div class="p-4 shadow">
      <div class="text-xl">Base Currencies</div>
      <div class="flex flex-wrap select">
        {#each availableBaseCurrencies as currency}
          <label class="w-24">
            <input type=checkbox bind:group={selectedCurrencies} value={currency} on:change={fillPaths}>
            {currency}
          </label>
        {/each}
      </div>
    </div>
  </div>

  <div class="w-4"></div>

  <div class="w-2/3">
    <div class="p-4 shadow">
      <div class="text-xl flex justify-center">Paths</div>
      <div class="flex flex-wrap justify-center">
        {#each paths as path (path.joined)}
          {#if !isNaN(path.percent) && isFinite(path.percent)}
            <div class="flex">
              <span class="w-20 font-bold font-mono flex justify-end"
                    style="color: {path.isProfitable ? 'green' : 'red'};">
                {path.percent.toFixed(4)}%
              </span>
              <div class="w-1"></div>
              <span class="w-40">{path.joined}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<div class="h-4"></div>