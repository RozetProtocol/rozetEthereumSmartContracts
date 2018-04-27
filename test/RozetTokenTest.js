function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}

function advanceBlock() {
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
async function advanceToBlock(number) {
  if (web3.eth.blockNumber > number) {
    throw Error(`block number ${number} is in the past (current is ${web3.eth.blockNumber})`);
  }

  while (web3.eth.blockNumber < number) {
    await advanceBlock();
  }
}

// Works for testrpc v4.1.3
const mineOneBlock = async () => {
  await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_mine",
    params: [],
    id: 0
  });
};

const forwardEVMTime = async seconds => {
  await web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_increaseTime",
    params: [seconds],
    id: 0
  });
  await mineOneBlock();
};

// Increases testrpc time by the passed duration in seconds
function increaseTime(duration) {
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

function latestTime() {
  return web3.eth.getBlock('latest').timestamp;
}

/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
function increaseTimeTo(target) {
  let now = latestTime();
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

const duration = {
  seconds: function (val) {
    return val;
  },
  minutes: function (val) {
    return val * this.seconds(60);
  },
  hours: function (val) {
    return val * this.minutes(60);
  },
  days: function (val) {
    return val * this.hours(24);
  },
  weeks: function (val) {
    return val * this.days(7);
  },
  years: function (val) {
    return val * this.days(365);
  },
};

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const RozetToken = artifacts.require("./RozetToken.sol");
let rozetToken;
let tokenHolder = web3.eth.accounts[0]
let tokenReceiver = web3.eth.accounts[1]
let voterOne = web3.eth.accounts[2]
let voterTwo = web3.eth.accounts[3]
let voterThree = web3.eth.accounts[4]

function deployContract() {
  return RozetToken.new().then(function (_rozetToken) {
    rozetToken = _rozetToken;
  });
}

contract('RozetToken', function (accounts) {

  before(deployContract);

  describe('Basic functionality', function () {

    it("Send Rozet Token", function () {
      let initalBalanceOfReceiver = 0;
      let amountToSend = 5;
      return rozetToken.balanceOf.call(tokenReceiver).then(function (balance) {
        initalBalanceOfReceiver += balance.toNumber();
        return rozetToken.transfer(tokenReceiver, amountToSend, {
          from: tokenHolder
        });
      }).then(function () {
        return rozetToken.balanceOf.call(tokenReceiver);
      }).then(function (newBalance) {
        let expectedAmount = initalBalanceOfReceiver + amountToSend;
        assert.equal(newBalance.toNumber(), expectedAmount,
          "Amounts do not match.");
      });
    });

    it("Withdraw Rozet Token", function () {
      let initalBalanceOfReceiver = 0;
      let amountToWithdraw = 5;
      return rozetToken.balanceOf.call(tokenReceiver).then(function (balance) {
        initalBalanceOfReceiver += balance.toNumber();
        // Allow Receiver to take money from senders account whenever they want.
        return rozetToken.approve(tokenReceiver, amountToWithdraw, {
          from: tokenHolder
        });
      }).then(function () {
        return rozetToken.transferFrom(tokenHolder, tokenReceiver, amountToWithdraw, {
          from: tokenReceiver
        });
      }).then(function () {
        return rozetToken.balanceOf.call(tokenReceiver);
      }).then(function (newBalance) {
        let expectedAmount = initalBalanceOfReceiver + amountToWithdraw;
        assert.equal(newBalance.toNumber(), expectedAmount,
          "Amounts do not match.");
      });
    });

    it("Transfer to multiple accounts", async function () {
      let accountsToReceive = [accounts[6], accounts[7], accounts[8], accounts[9]]
      let amounts = [2,3,4,5]
      let transferRequest = await rozetToken.transferToMultipleAccounts(accountsToReceive, amounts)
      let balance = await rozetToken.balanceOf(accounts[7])
      assert.equal(balance, 3, "balance was not distributed")
    });

  });

  describe('Voting', function () {

    before(async function () {
      // Give 10 roz to voterOne and 5 roz to voterTwo.
      await rozetToken.transfer(voterOne, 15, {
        from: tokenHolder
      })
      await rozetToken.transfer(voterTwo, 5, {
        from: tokenHolder
      })
    })

    it('Roz holders should be able to vote for price.', async function () {
      await rozetToken.voteForBadgePrice(20, {
        from: voterOne
      })
      let vote = await rozetToken.votesForBadgePrice(voterOne)
      assert.equal(vote, 20)
      let totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      // 20 * 15 == 300
      assert.equal(totalWeightOfAllVoters, 300)



      await rozetToken.voteForBadgePrice(10, {
        from: voterTwo
      })
      vote = await rozetToken.votesForBadgePrice(voterTwo)
      assert.equal(vote, 10)
      totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      // 300 + 5 * 10 = 350
      assert.equal(totalWeightOfAllVoters, 350)


    })

    it('Votes should be countable.', async function () {
      // VoterOne is voting for 20 and voterTwo is voting for 10.
      // So the total vote will be:
      // (voterOne's vote * voterOne's supply + voterTwo's vote * voterTwo's supply) / (voterOne's supply + voterTwo's supply) ->
      // (15 * 20 + 5 * 10) / (15 + 5) = 17.5 -> rounded down to 17
      await rozetToken.updateBadgePrice()
      let badgePrice = await rozetToken.badgePrice()
      assert.equal(badgePrice.toNumber(), 17)
    })

    it('Somone with no roz should not have their vote counted.', async function () {
      let totalSupplyOfAllVoters = await rozetToken.totalSupplyOfAllVoters()
      let totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      await rozetToken.voteForBadgePrice(100, {
        from: voterThree
      })
      let newTotalSupplyOfAllVoters = await rozetToken.totalSupplyOfAllVoters()
      let newTotalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      assert.equal(totalSupplyOfAllVoters.toNumber(), newTotalSupplyOfAllVoters.toNumber())
      assert.equal(totalWeightOfAllVoters.toNumber(), newTotalWeightOfAllVoters.toNumber())
    })

    it('Votes can not be counted more than once per week.', async function () {
      await rozetToken.updateBadgePrice().should.be.rejected
    })

    it('Votes can be counted again after the one week cooldown.', async function () {
      await increaseTimeTo(latestTime() + duration.weeks(2))
      await rozetToken.updateBadgePrice()
      let badgePrice = await rozetToken.badgePrice()
      assert.equal(badgePrice.toNumber(), 17)
    })

    it('Setting vote to zero lowers total supply of voting roz.', async function () {
      await rozetToken.voteForBadgePrice(0, {
        from: voterOne
      })
      let totalSupplyOfAllVoters = await rozetToken.totalSupplyOfAllVoters()
      assert.equal(totalSupplyOfAllVoters, 5)
    })

    it('Setting vote to zero lowers total weight.', async function () {

      let totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      assert.equal(totalWeightOfAllVoters.toNumber(), 50)
    })

    it('Voting changes the total weight.', async function () {

      let totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      assert.equal(totalWeightOfAllVoters.toNumber(), 50)

      await rozetToken.voteForBadgePrice(20, {
        from: voterOne
      })

      totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()
      assert.equal(totalWeightOfAllVoters.toNumber(), 350)

    })

    it('Sending roz changes the total weight.', async function () {

      await rozetToken.transfer(voterTwo, 5, {
        from: voterOne
      })
      let totalWeightOfAllVoters = await rozetToken.totalWeightOfAllVoters()

      // Now voterOne and voterTwo both have 10 roz
      // VoterOne's vote is for 20 and so his weight contribution is 20 * 10 = 200
      // VoterTwo's vote is for 10 and so his weight contribution is 10 * 10 = 100
      // So the total weight is expected to be 250
      assert.equal(totalWeightOfAllVoters.toNumber(), 300)

    })

    it('System is stable if no one votes.', async function () {

    })

  });

  describe('burn', function () {

    //before(deployContract);

    it('burns the requested amount', async function () {
      let balance = await rozetToken.balanceOf(tokenHolder)
      await rozetToken.burn(100, { tokenHolder });
      const newBalance = await rozetToken.balanceOf(tokenHolder);
      assert.equal(balance - 100, newBalance);
    });

    it('emits a burn event', async function () {
      const { logs } = await rozetToken.burn(100, { tokenHolder });
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      assert.equal(logs.length, 2);
      assert.equal(logs[0].event, 'Burn');
      assert.equal(logs[0].args.burner, tokenHolder);
      assert.equal(logs[0].args.value, 100);

      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, tokenHolder);
      assert.equal(logs[1].args.to, ZERO_ADDRESS);
      assert.equal(logs[1].args.value, 100);
    });
   
    it('when the given amount is greater than the balance of the sender', async function () {
      let amount = await rozetToken.balanceOf(tokenHolder)
      amount = amount.toNumber() + 1
      await rozetToken.burn(amount, {from: tokenHolder}).should.be.rejectedWith('revert')
    });

  });


});