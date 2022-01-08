let binanceApi

const getMarketData = () => {
  binanceApi = binanceApi || new window.ccxt.binance()
  return binanceApi.loadMarkets()
}

export const getPairings = () => {
  return getMarketData()
    .then(marketData => {
      return Object.values(marketData).reduce((acc, market, idx) => {
        if (idx === 0) {
          console.log(market)
        }

        if (!market.active || !market.spot) {
          return acc
        }

        if (!acc[market.quote]) {
          acc[market.quote] = [market.base]
        } else {
          acc[market.quote].push(market.base)
        }
        return acc
      }, {})
    })
    .then(pairings => {
      return Object.entries(pairings).reduce((acc, [quote, bases]) => {
        acc[quote] = bases.filter(base => {
          if (acc[base]) {
            return true
          }
          return Object.entries(pairings).some(([quote2, bases2]) => {
            if (quote2 === quote) {
              return false
            }
            return bases2.includes(base);
          })
        })
        return acc
      }, {})
    })
}
