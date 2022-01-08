<script lang="ts">
  import {
    addBalance,
    addBalanceName,
    addFinalBalance,
    addPairs,
    addPrice,
    generatePaths,
    pairsMap,
  } from './utils/path-utils'
  import {getPairings} from './utils/exchange'

  import {onMount} from 'svelte'


  let feePerTrade = 1000
  let prices = {}
  let paths = []
  let pairings = {}
  let availableQuoteCurrencies = []
  let availableBaseCurrencies = []
  let selectedCurrencies = []
  let activePairIds = []

  let ws

  let wsStatus = 0


  const initTicker = () => {
    ws = new WebSocket('wss://stream.binance.com/stream')
    ws.onopen = () => {
      wsStatus = 2
      if (activePairIds.length > 0) {
        ws.send(JSON.stringify({method: 'SUBSCRIBE', params: activePairIds, id: 1}))
      }
    }
    ws.onmessage = stream => {
      const data = JSON.parse(stream.data)
      if (data?.data) {
        const {s, a, b} = data.data
        if (s && a && b) {
          prices[s] = {
            'BUY': a,
            'SELL': b,
          }
        }
      }
      onPriceChange()
    }
    ws.onclose = () => {
      wsStatus = 0
      setTimeout(() => {
        wsStatus = 1
        initTicker()
      }, 1000)
    }
  }

  onMount(() => {
    getPairings().then(remotePairings => {
      pairings = remotePairings
      const remoteAvailableQuoteCurrencies = []
      const remoteAvailableBaseCurrencies = []
      Object.entries(remotePairings).forEach(([quote, bases]) => {
        remoteAvailableQuoteCurrencies.push(quote)
        remoteAvailableBaseCurrencies.push(...bases)
      })
      availableQuoteCurrencies = [...new Set(remoteAvailableQuoteCurrencies)]
      availableBaseCurrencies = [...new Set(remoteAvailableBaseCurrencies)].filter(base => !Object.keys(remotePairings).includes(base))
    })

    initTicker()
  })

  const fillPaths = () => {
    const possiblePaths = generatePaths(selectedCurrencies)
      .map(addPairs(pairings))
      .filter(path => path.pairs.every(Boolean))

    const pairIds = possiblePaths.flatMap(path => path.pairs.map(pair => `${pair.id.toLowerCase()}@bookTicker`))

    pairIds.forEach(pairId => {
      if (!activePairIds.includes(pairId)) {
        ws.send(JSON.stringify({method: 'SUBSCRIBE', params: [pairId], id: 1}))
        activePairIds = [...activePairIds, pairId]
      }
    })

    activePairIds.forEach(activePairId => {
      if (!pairIds.includes(activePairId)) {
        ws.send(JSON.stringify({method: 'UNSUBSCRIBE', params: [activePairId], id: 312}))
        activePairIds = activePairIds.filter(pairId => pairId !== activePairId)
      }
    })

    paths = possiblePaths
      .map(
        pairsMap(
          addBalanceName,
          addPrice(prices),
          addBalance(feePerTrade),
        ),
      )
      .map(addFinalBalance)
      .sort((a, b) => b.percent - a.percent)
  }

  const onPriceChange = () => {
    paths =
      paths
        .map(
          pairsMap(
            addPrice(prices),
            addBalance(feePerTrade),
          ),
        )
        .map(addFinalBalance)
        .sort((a, b) => b.percent - a.percent)
  }

  const onInputChange = () => {
    paths =
      paths
        .map(pairsMap(addBalance(feePerTrade)))
        .map(addFinalBalance)
        .sort((a, b) => b.percent - a.percent)
  }
</script>

<style>
    table#result tr > td:first-child {
        display: none;
    }

    div.select {
        display: flex;
        width: 100vw;
        flex-wrap: wrap;
    }

    div.select > label {
        width: 7.5rem;
    }

    td.number-cell {
        text-align: right;
        font-weight: bold;
    }

    div.center-box {
        width: 100vw;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>

<div class="center-box">
  <h1>
    Binance <span style="color: {wsStatus === 0 ? 'red' : wsStatus === 1 ? 'orange' : 'green'}">▲</span> Triangular arbitrage monitor
  </h1>
</div>

<div class="center-box">
  <form>
    <table>
      <tr>
        <td>FEES</td>
        <td><input bind:value={feePerTrade} on:keyup={onInputChange} type="number"></td>
      </tr>
    </table>
  </form>
</div>

<div style="height: 4rem;"></div>


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

<div style="height: 4rem;"></div>

<div class="center-box">
  <table id="result">
    {#each paths as path (path.path.join())}
      <tr>
        {#each path.path as currency}
          <td>-></td>
          <td>{currency}</td>
        {/each}
        {#each path.pairs as pair}
          <td style="width: 25px;"></td>
          <td class="number-cell">{pair.balance.toFixed(4)}</td>
          <td>{pair.toName}</td>
        {/each}
        <td style="width: 25px;"></td>
        <td style="color: {path.isProfitable ? 'green' : 'red'};"
            class="number-cell">{path.finalBalance.toFixed(4)}</td>
        <td style="color: {path.isProfitable ? 'green' : 'red'};">{path.startingCurrency}</td>
        <td style="width: 25px;"></td>
        <td style="color: {path.isProfitable ? 'green' : 'red'};" class="number-cell">{path.percent.toFixed(4)}</td>
        <td style="color: {path.isProfitable ? 'green' : 'red'};">%</td>
      </tr>
    {/each}
  </table>
</div>
