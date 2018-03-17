
const Promise = require('bluebird')

function ether (n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

function advanceBlock () {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: Date.now(),
    }, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

// Advances the block number so that the last mined block is `number`.
async function advanceToBlock (number) {
  if (web3.eth.blockNumber > number) {
    throw Error(`block number ${number} is in the past (current is ${web3.eth.blockNumber})`);
  }

  while (web3.eth.blockNumber < number) {
    await advanceBlock();
  }
}

// Increases testrpc time by the passed duration in seconds
function increaseTime (duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

function latestTime () {
  return web3.eth.getBlock('latest').timestamp;
}

/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
function increaseTimeTo (target) {
  let now = latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const RozetToken = artifacts.require("RozetToken.sol");
const RozetGeneration = artifacts.require("RozetGeneration.sol");

let accounts = web3.eth.accounts;
let rozetMemberOne = accounts[0];
let rozetMemberTwo = accounts[1];
let rozetMemberThree = accounts[2];
let partnerOne = accounts[3];
let investor = accounts[4];
let purchaser = accounts[5];

let rozetToken;
let rozetGeneration;

function deployContract() {
  
  return RozetToken.new().then(function(_rozetToken) {
    rozetToken = _rozetToken;
    return RozetGeneration.new(rozetToken.address, rozetMemberOne, rozetMemberTwo, rozetMemberThree, partnerOne, {from: rozetMemberOne});
  }).then(function(_rozetGeneration) {
    rozetGeneration = _rozetGeneration;
    return rozetToken.totalSupply();
  }).then(function(supply) {
    return rozetToken.transfer(rozetGeneration.address, supply);
  }).then(function(tx) {
    Promise.promisifyAll(web3.eth)
    Promise.promisifyAll(rozetGeneration)
    Promise.promisifyAll(rozetToken)
  });
}

contract('CappedCrowdsale', function ([_, wallet]) {
  let rate = new BigNumber(1);
  let cap = ether(10);
  let lessThanCap = ether(2);
  let tokenSupply = new BigNumber('1e22');
  const value = ether(3);
  const expectedTokenAmount = rate.mul(value);
  const expectedMemberShare = value.div(3);

  beforeEach(deployContract); 

  describe('accepting payments', function () {

    it('should accept payments within cap', async function () {
      await rozetGeneration.send(cap.minus(lessThanCap), {from: rozetMemberOne}).should.be.fulfilled;
      await rozetGeneration.send(lessThanCap, {from: rozetMemberOne} ).should.be.fulfilled;
    });

    it('should reject payments outside cap', async function () {
      await rozetGeneration.send(cap);
      await rozetGeneration.send(1).should.be.rejectedWith('revert');
    });

    it('should reject payments that exceed cap', async function () {
      await rozetGeneration.send(cap.plus(1)).should.be.rejectedWith('revert');
    });
  });

  describe('ending', function () {

    it('should not reach cap if sent under cap', async function () {
      let capReached = await rozetGeneration.capReached();
      capReached.should.equal(false);
      await rozetGeneration.send(lessThanCap, {from: rozetMemberOne});
      capReached = await rozetGeneration.capReached();
      capReached.should.equal(false);
    });

    it('should not reach cap if sent just under cap', async function () {
      await rozetGeneration.send(cap.minus(1), {from: rozetMemberOne});
      let capReached = await rozetGeneration.capReached();
      capReached.should.equal(false);
    });

    it('should reach cap if cap sent', async function () {
      await rozetGeneration.send(cap, {from: rozetMemberOne});
      let capReached = await rozetGeneration.capReached();
      capReached.should.equal(true);
    });
  });

  describe('accepting payments', function () {

    it('should accept payments', async function () {
      let balance = web3.eth.getBalance(rozetMemberOne);
      await rozetGeneration.send(value, {from: rozetMemberOne}).should.be.fulfilled;
      await rozetGeneration.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });

  describe('high-level purchase', function () {
   
    it('should assign tokens to sender', async function () {
      await rozetGeneration.sendTransaction({ value: value, from: investor });
      let balance = await rozetToken.balanceOf(investor);
      let expectedTokenAmount = rate.mul(balance);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to rozet member one', async function () {
      const pre = web3.eth.getBalance(rozetMemberOne);
      await rozetGeneration.sendTransaction({ value, from: investor });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberOne);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });

    it('should forward funds to rozet member two', async function () {
      const pre = web3.eth.getBalance(rozetMemberTwo);
      await rozetGeneration.sendTransaction({ value, from: investor });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberTwo);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });

    it('should forward funds to rozet member three', async function () {
      const pre = web3.eth.getBalance(rozetMemberThree);
      await rozetGeneration.sendTransaction({ value, from: investor });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberThree);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });
  });

  describe('low-level purchase', function () {

    it('should assign tokens to beneficiary', async function () {
      await rozetGeneration.buyTokens(investor, { value, from: purchaser });
      const balance = await rozetToken.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to rozet member one', async function () {
      const pre = web3.eth.getBalance(rozetMemberOne);
      await rozetGeneration.buyTokens(investor, { value, from: purchaser });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberOne);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });

    it('should forward funds to rozet member two', async function () {
      const pre = web3.eth.getBalance(rozetMemberTwo);
      await rozetGeneration.buyTokens(investor, { value, from: purchaser });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberTwo);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });

    it('should forward funds to rozet member three', async function () {
      const pre = web3.eth.getBalance(rozetMemberThree);
      await rozetGeneration.buyTokens(investor, { value, from: purchaser });
      await rozetGeneration.withdraw({from: investor});
      const post = web3.eth.getBalance(rozetMemberThree);
      post.minus(pre).should.be.bignumber.equal(expectedMemberShare);
    });
  });

});
