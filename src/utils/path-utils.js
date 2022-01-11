export const generatePaths = currencies => {
  return currencies
    .map(currency => currencies.map(currency2 => currencies.map(currency3 => {
      if (currency !== currency2 && currency !== currency3 && currency2 !== currency3) {
        return ({
          path: [currency, currency2, currency3],
          joined: `${currency}/${currency2}/${currency3}`,
        });
      }
      return null;
    })))
    .flat(2)
    .filter(Boolean)
    .reduce((acc, pathObj) => {
      const {path} = pathObj;
      const current = acc.map(a => a.path.join());
      if (
        !current.includes(path.join())
        && !current.includes([path[1], path[2], path[0]].join())
        && !current.includes([path[2], path[0], path[1]].join())
      ) {
        acc.push(pathObj);
      }
      return acc;
    }, []);
};

export const addPairs = pairings => path => ({
  ...path,
  pairs: path.path
    .map((currency, idx) => {
      const nextCurrency = path.path[path.path[idx + 1] ? idx + 1 : 0];
      if (pairings[currency] && pairings[currency].includes(nextCurrency)) {
        return {base: nextCurrency, quote: currency, side: 'BUY'};
      }
      if (pairings[nextCurrency] && pairings[nextCurrency].includes(currency)) {
        return {base: currency, quote: nextCurrency, side: 'SELL'};
      }
      return null;
    })
    .map(pair => {
      if (pair) {
        return {
          ...pair,
          get id() {
            return `${this.base}${this.quote}`;
          },
          get tickerName() {
            return `${this.id.toLowerCase()}@bookTicker`;
          },
        };
      }
      return null;
    }),
});

export const addPercentChange = (prices, feePerTrade, changedId) => path => {
  if (
    path.percent
      ? !path.pairs.some(({id}) => id === changedId)
      : !path.pairs.every(({id}) => prices[id])
  ) {
    return path;
  }

  const endBalance = path.pairs.reduce((balance, {id, side}) => {
    if (side === 'BUY') {
      const fee = balance * feePerTrade;
      const balanceAfterFee = balance - fee;
      return balanceAfterFee / prices[id]['BUY'];
    }
    const balanceAfterSold = balance * prices[id]['SELL'];
    const fee = balanceAfterSold * feePerTrade;
    return balanceAfterSold - fee;
  }, 1);

  const finalBalance = endBalance - 1;

  return {
    ...path,
    percent: (finalBalance * 100).toFixed(4),
    isProfitable: finalBalance > 0,
  };
};
