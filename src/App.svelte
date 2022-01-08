<script lang="ts">
  import {addPairs, addPercentChange, generatePaths} from './utils/path-utils'
  import {getPairings, subscribeAction, unsubscribeAction} from './utils/exchange'

  import {onMount} from 'svelte'


  let feePerTrade = 1000
  let selectedCurrencies = []

  let availableQuoteCurrencies = []
  let availableBaseCurrencies = []
  let paths = []
  let prices = {}
  let pairings = {}
  let activePairIds = []

  let ws

  let wsStatus = 0

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
      wsStatus = 2
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
      wsStatus = 0
      clearInterval(sortingInterval)
      setTimeout(() => {
        wsStatus = 1
        initTicker()
      }, 1000)
    }
  }

  function handleWsSubsriptions(possiblePaths) {
    const pairIds = [...new Set(possiblePaths.flatMap(path => path.pairs.map(pair => pair.tickerName)))]

    pairIds.forEach(pairId => {
      if (!activePairIds.includes(pairId)) {
        ws.send(subscribeAction([pairId]))
        activePairIds = [...activePairIds, pairId]
      }
    })

    activePairIds.forEach(activePairId => {
      if (!pairIds.includes(activePairId)) {
        ws.send(unsubscribeAction([activePairId]))
        activePairIds = activePairIds.filter(pairId => pairId !== activePairId)
      }
    })
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

    handleWsSubsriptions(possiblePaths)
    addPercent(possiblePaths)
  }
</script>

<style>
    div.select {
        display: flex;
        flex-wrap: wrap;
    }

    div.select > label {
        width: 7.5rem;
    }

    div.center-box {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>

<div class="center-box">
  <h1>
    Binance <span style="color: {wsStatus === 0 ? 'red' : wsStatus === 1 ? 'orange' : 'green'}">▲</span> Triangular
    arbitrage monitor
  </h1>
</div>

<div class="center-box">
  <div style="display: flex; align-items: center">
    <span>FEES</span>
    <div style="width: 1rem;"></div>
    <input bind:value={feePerTrade} on:keyup={addPercent} type="number">
    <div style="width: 1rem;"></div>
    <span>{feePerTrade / 10000}%</span>
  </div>
</div>

<div style="height: 4rem;"></div>

<div style="width: 98vw; display: flex;">
  <div style="width: 49vw;">
    <div class="select">
      {#each availableQuoteCurrencies as currency}
        <label>
          <input type=checkbox bind:group={selectedCurrencies} value={currency} on:change={fillPaths}>
          {currency}
        </label>
      {/each}
    </div>

    <div style="height: 1rem;"></div>

    <div class="select">
      {#each availableBaseCurrencies as currency}
        <label>
          <input type=checkbox bind:group={selectedCurrencies} value={currency} on:change={fillPaths}>
          {currency}
        </label>
      {/each}
    </div>
  </div>

  <div style="width: 49vw;">
    <div style="display: flex; flex-wrap: wrap">
      {#each paths as path (path.joined)}
        {#if !isNaN(path.percent) && isFinite(path.percent)}
          <div style="display: flex;">
            <span style="width: 5rem; font-weight: bold; color: {path.isProfitable ? 'green' : 'red'};">
              {path.percent.toFixed(4)}%
            </span>
            <span style="width: 10rem;">{path.joined}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
