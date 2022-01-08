var ghpages = require('gh-pages');

ghpages.publish(
  'public', // path to public directory
  {
    branch: 'main',
    repo: 'https://github.com/CH-Vince/binance-triangular-arbitrage-monitor.git', // Update to point to your repository
    user: {
      name: 'Vince Liem', // update to use your name
      email: 'vincepaul.liem@cryptohopper.com' // Update to use your email
    }
  },
  () => {
    console.log('Deploy Complete!')
  }
)
