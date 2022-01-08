import Decimal from 'decimal.js'

export const generatePaths = currencies => {
  return currencies
    .map(currency => currencies.map(currency2 => currencies.map(currency3 => {
      if (currency !== currency2 && currency !== currency3 && currency2 !== currency3) {
        return ({
          path: [currency, currency2, currency3],
          startingCurrency: currency,
        })
      }
      return null
    })))
    .flat(2)
    .filter(Boolean)
    .reduce((acc, pathObj) => {
      const {path} = pathObj
      const current = acc.map(a => a.path.join())
      if (
        !current.includes(path.join())
        && !current.includes([path[1], path[2], path[0]].join())
        && !current.includes([path[2], path[0], path[1]].join())
      ) {
        acc.push(pathObj)
      }
      return acc
    }, [])
}

export const addPairs = pairings => path => ({
  ...path,
  pairs: path.path.map((currency, idx) => {
    const nextCurrency = path.path[path.path[idx + 1] ? idx + 1 : 0]
    if (pairings[currency] && pairings[currency].includes(nextCurrency)) {
      return {
        base: nextCurrency,
        quote: currency,
        get id() {
          return `${this.base}${this.quote}`
        },
        side: 'BUY',
      }
    }
    if (pairings[nextCurrency] && pairings[nextCurrency].includes(currency)) {
      return {
        base: currency,
        quote: nextCurrency,
        get id() {
          return `${this.base}${this.quote}`
        },
        side: 'SELL',
      }
    }
    return null
  }),
})

export const pairsMap = (...callbacks) => path => callbacks.reduce((path, callback) => ({
  ...path,
  pairs: path.pairs.map(callback),
}), path)

export const addBalanceName = pair => ({
  ...pair,
  toName: pair.side === 'BUY' ? pair.base : pair.quote,
  fromName: pair.side === 'BUY' ? pair.quote : pair.base,
})

export const addPrice = prices => pair => ({
  ...pair,
  price: prices[pair.id] || {'BUY': 0, 'SELL': Infinity},
})

export const addBalance = feePerTrade => {
  const rawFeePerTrade = new Decimal(feePerTrade || 0).div(1000000)

  const recursive = (pair, idx, pairs) => {
    const balance = new Decimal(
      idx === 0
        ? 1
        : recursive(pairs[idx - 1], idx - 1, pairs).balance,
    )

    const calculator = {
      get 'BUY'() {
        const fee = balance.times(rawFeePerTrade)
        const balanceAfterFee = balance.minus(fee)
        return balanceAfterFee.div(pair.price['BUY'])
      },
      get 'SELL'() {
        const balanceAfterSold = balance.times(pair.price['SELL'])
        const fee = balanceAfterSold.times(rawFeePerTrade)
        return balanceAfterSold.minus(fee)
      },
    }

    return {
      ...pair,
      balance: calculator[pair.side],
    }
  }

  return recursive
}

export const addFinalBalance = path => {
  const startBalance = new Decimal(1)
  const endBalance = path.pairs[path.pairs.length - 1].balance

  return {
    ...path,
    finalBalance: endBalance.minus(startBalance),
    get percent() {
      return this.finalBalance.div(startBalance.abs()).mul(100)
    },
    get isProfitable() {
      return this.finalBalance > 0
    },
  }
}
