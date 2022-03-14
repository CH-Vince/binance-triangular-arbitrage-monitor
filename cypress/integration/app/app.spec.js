describe('header', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('Shows the title', () => {
    cy.get('h1').first().should('have.text', 'Binance ▲ Triangular arbitrage monitor');
  });

  it('Shows the subtitle', () => {
    cy.get('h2').first().should('have.text', 'Monitoring arbitrage opportunities on Binance');
  });

  it('Shows the description', () => {
    cy.get('p').first().should('contain.text', 'This app monitors arbitrage opportunities on Binance.');
  });

  it('Shows the footer', () => {
    cy.get('footer').first().should('contain.text', '© 2022 - Vince Liem');
  });

  it('Shows the logo', () => {
    cy.get('img').first().should('have.attr', 'src', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Logo_Comit%C3%A9_d%27arbitrage.svg/1024px-Logo_Comit%C3%A9_d%27arbitrage.svg.png');
  });
});

describe('navigation', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should show the navigation', () => {
    cy.get('nav').first().should('contain.text', 'Triangular');
    cy.get('nav').first().should('contain.text', 'Quadupular');
    cy.get('nav').first().should('contain.text', 'Quintupular');
  });
});

describe('Fees form', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should show the FEES settings', () => {
    cy.get('#fees').should('contain.text', 'FEES');
  });

  it('should have an input for the fee', () => {
    cy.get('#fees input').should('have.attr', 'type', 'number');
  });

  it('should show the fees in percentage next to the input', () => {
    cy.get('#fees span').last().should('contain.text', '%');
  });

  it('should be able to change the fee', () => {
    cy.get('#fees input').clear().type('100');
    cy.get('#fees input').should('have.value', '100');
  });

  it('should be able to change the fee to 0', () => {
    cy.get('#fees input').clear().type('0');
    cy.get('#fees input').should('have.value', '0');
  });

  it('should be able to change the fee to a negative number', () => {
    cy.get('#fees input').clear().type('-100');
    cy.get('#fees input').should('have.value', '-100');
  });

  it('should be able to change the fee to a decimal number', () => {
    cy.get('#fees input').clear().type('0.1');
    cy.get('#fees input').should('have.value', '0.1');
  });

  it('should reflect the right percentage next to the input with 4 decimals', () => {
    cy.get('#fees input').clear().type('100');
    cy.get('#fees span').last().should('contain.text', '0.1000%');
  });
});

describe('Websocket connection display', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should show the websocket connection status', () => {
    cy.get('#websocket-status').should('contain.text', '▲');
  });

  it('should show the websocket connection status as disconnected', () => {
    cy.get('#websocket-status').should('have.css', 'color', 'rgb(255, 0, 0)');
  });

  it('should show the websocket connection status as connected', () => {
    cy.get('#websocket-status').should('have.css', 'color', 'rgb(0, 128, 0)');
  });
});

describe('Asset buttons description', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should show the asset buttons description', () => {
    cy.get('#asset-buttons-description').should('contain.text', 'Select Assets');
  });

  it('should show the asset buttons description', () => {
    cy.get('#asset-buttons-description').should('contain.text', 'Click on the assets you want to monitor.');
  });
})

describe('Asset buttons display', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should show asset buttons', () => {
    cy.get('#asset-buttons').should('contain.text', 'Asset');
  });

  it('should show the buttons for the assets', () => {
    cy.get('#asset-buttons button').should('contain.text', 'BTC');
    cy.get('#asset-buttons button').should('contain.text', 'ETH');
    cy.get('#asset-buttons button').should('contain.text', 'BNB');
    cy.get('#asset-buttons button').should('contain.text', 'USDT');
  });
});

describe('Asset buttons hover', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/');
  });

  it('should highlight related quote assets of BTC asset', () => {
    const button = cy.get('#asset-buttons button').contains('BTC').trigger('mouseenter');
    cy.get('#asset-buttons button').contains('USDT').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    cy.get('#asset-buttons button').contains('TUSD').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    cy.get('#asset-buttons button').contains('BUSD').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    button.trigger('mouseleave');
    cy.get('#asset-buttons button').should('not.have.css', 'background-color', 'rgb(200, 200, 255)');
  });

  it('should highlight related quote assets of ONE asset', () => {
    const button = cy.get('#asset-buttons button').contains('ONE').trigger('mouseenter');
    cy.get('#asset-buttons button').contains('BTC').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    cy.get('#asset-buttons button').contains('ETH').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    cy.get('#asset-buttons button').contains('BNB').should('have.css', 'background-color', 'rgb(200, 200, 255)');
    button.trigger('mouseleave');
    cy.get('#asset-buttons button').should('not.have.css', 'background-color', 'rgb(200, 200, 255)');
  });

  function pressBtcEthBnb(colorMatch = 'rgb(200, 200, 200)') {
    cy.get('#websocket-status').should('have.css', 'color', 'rgb(0, 128, 0)');
    cy.get('#asset-buttons button').contains('BTC')
      .trigger('click').should('have.css', 'background-color', colorMatch);
    cy.get('#asset-buttons button').contains('ETH')
      .trigger('click').should('have.css', 'background-color', colorMatch);
    cy.get('#asset-buttons button').contains('BNB')
      .trigger('click').should('have.css', 'background-color', colorMatch);
  }

  it('should show that assets are selected', () => {
    pressBtcEthBnb();
  });

  it('should highlight a selected button of DOT asset', () => {
    pressBtcEthBnb();

    cy.get('#asset-buttons button').contains('DOT').trigger('mouseenter');

    cy.get('#asset-buttons button').contains('BTC')
      .should('have.css', 'background-color', 'rgb(200, 200, 230)');
    cy.get('#asset-buttons button').contains('ETH')
      .should('have.css', 'background-color', 'rgb(200, 200, 230)');
    cy.get('#asset-buttons button').contains('BNB')
      .should('have.css', 'background-color', 'rgb(200, 200, 230)');

    cy.get('#asset-buttons button').contains('USDT')
      .should('have.css', 'background-color', 'rgb(200, 200, 255)');

    cy.get('#asset-buttons button').contains('DOT').trigger('mouseleave');
    cy.get('#asset-buttons button')
      .should('not.have.css', 'background-color', 'rgb(200, 200, 255)')
      .should('not.have.css', 'background-color', 'rgb(200, 200, 230)');

    cy.get('#asset-buttons button').contains('BTC')
      .should('have.css', 'background-color', 'rgb(200, 200, 200)');
    cy.get('#asset-buttons button').contains('ETH')
      .should('have.css', 'background-color', 'rgb(200, 200, 200)');
    cy.get('#asset-buttons button').contains('BNB')
      .should('have.css', 'background-color', 'rgb(200, 200, 200)');

    cy.get('#asset-buttons button').contains('USDT')
      .should('have.css', 'background-color', 'rgb(255, 255, 255)');

    cy.scrollTo('top');
    pressBtcEthBnb('rgb(255, 255, 255)');
  });
});

describe('websocket connection', () => {

})

export {};
