import ether from './helpers/ether';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const MintableToken = artifacts.require('MintableToken');
const CappedCrowdsale = artifacts.require('RozetTokenSale');

contract('CappedCrowdsale', function (accounts) { //([_, wallet]) {
  const wallet = accounts[0];
  const rate = new BigNumber(1);
  const cap = ether(20);
  const goal = ether(5);
  const lessThanCap = ether(10);

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now"
    // function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {

    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);

    this.crowdsale = await CappedCrowdsale.new(this.startTime, this.endTime,
    rate, goal, wallet, cap);

    this.token = MintableToken.at(await this.crowdsale.token());
  });

  describe('creating a valid crowdsale', function () {

    it('should fail with zero cap', async function () {
      await CappedCrowdsale.new(this.startTime, this.endTime, rate, goal,
      wallet, 0).should.be.rejectedWith(EVMRevert);
    });

  });

  describe('accepting payments', function () {

    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should accept payments within cap', async function () {

      console.log("CAP" + ether(cap));
      console.log("Balance of Wallet" + web3.eth.getBalance(wallet));

      await this.crowdsale.send(cap.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;
    });

    it('should reject payments outside cap', async function () {
      await this.crowdsale.send(cap);
      await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
    });

    it('should reject payments that exceed cap', async function () {
      await this.crowdsale.send(cap.plus(1)).should.be.rejectedWith(EVMRevert);
    });

  });

  describe('ending', function () {

    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should not be ended if under cap', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(lessThanCap);
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should not be ended if just under cap', async function () {
      await this.crowdsale.send(cap.minus(1));
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should be ended if cap reached', async function () {
      await this.crowdsale.send(cap);
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(true);
    });

  });

});
