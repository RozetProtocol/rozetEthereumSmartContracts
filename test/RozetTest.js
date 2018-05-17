const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");
const ethers = require('ethers');
const ethereumjs = require('ethereumjs-abi')
console.log(etherumjs)

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


contract('Rozet', function(accounts) {

  let rozet;
  let rozetToken;
  let consumerAddress = accounts[0];
  let recipientAddress = accounts[1];
  let makerAddress = accounts[2];
  let senderAddress = accounts[3];
  let indexOfOwnersLatestBadge;
  let makerBalance;

  function deployContract() {

    return RozetToken.new().then(function(_rozetToken) {
      rozetToken = _rozetToken;
      return Rozet.new(rozetToken.address);
    }).then(function(_rozet) {
      rozet = _rozet;
    });
  }

  describe("Initial state", function() {

    before(deployContract);
    
    it("Assign Badge", async function() {
      await rozet.issueBadge("First Badge.", recipientAddress, senderAddress, "tag1", "tag2", "tag3", 0, {from: makerAddress});
      let badge = await rozet.getBadge(recipientAddress, 0);
      let data = badge[0].substring(0, "First Badge.".length)
      data.should.be.equal("First Badge.")
     
    });

    it("send badge as proxy", async function() {

      // let message_hash = web3.eth.accounts.hashMessage("I am but a stack exchange post")
      const wallet = ethers.Wallet.createRandom();
      console.log("signing address " + wallet.address);
      let addressToPay = "0xa8012262b2057ad500483e6f115435d60e6ef959"
      let recipient = "0xf06162929767F6a7779af9339687023cf2351fc5"
      let data = "This is my review"
      let msg = "This message's length: 32 bytes."

      //let review = etherumjs.ABI.soliditySHA3(reviewString)
      let review = "This message's length: 32 bytes."
      console.log(etherumjs)

      /*
      msg = "0x" + ethereumjs.ABI.soliditySHA3(
        ["address", "uint256", "bytes32", "address"],
        [recipient, 1234, review, addressToPay]
      ).toString("hex");*/
      //const msg = addressToPay + recipient + data;
      // msg = web3.sha3(recipient + review + addressToPay);
      console.log(msg)

      const sig = wallet.signMessage(msg).slice(2);
      
      let r = '0x' + sig.slice(0,64);
      let s = '0x' + sig.slice(64, 128);
      let v = parseInt(sig.slice(128), 16);

      // let hash = web3.sha3("message to sign");
      // web3.personal.sign(hash, senderAddress, function (result) { console.log(result) });

      //console.log(r)
      //console.log(s)
      //console.log(v)

      let result = await rozet.verify(v, r, s, msg)
    
      console.log("result " + result)
    });

    /*

    it("Authenticate the First Badge for Free", function() {
      return rozet.getNumberOfBadges.call(ownerAddress).then(function(number) {
        indexOfOwnersLatestBadge = number.toNumber() - 1;
        // Owner authenticates his newest badge.
        // This is free for Maker since Owner has no reputation yet.
        return rozet.authenticateBadge(ownerAddress,
          indexOfOwnersLatestBadge, {from: ownerAddress});

      }).then(function() {
        return rozet.isBadgeAuthenticated.call(ownerAddress,
        indexOfOwnersLatestBadge);

      }).then(function(result) {
        assert.equal(result, true, "First badge was not authenticated.");
      });
    });

    it("Issue and Authenticate a Second Badge", function() {

      let authenticationPrice;
      return rozetToken.balanceOf(makerAddress).then(function(balance) {
        makerBalance = balance.toNumber();
        //console.log("Maker's balance before authentication: " + makerBalance);
        // Consumer issues the second badge to owner. Consumer sets the
        // addressToPay to makerAddress because Maker is the one that
        // established Consumer's reputation by issuing the first badge.

        return rozet.issueBadge("Second Badge.", ownerAddress, "tag1", "tag2", "tag3", makerAddress, {from: consumerAddress});

      }).then(function(badgeId) {
        return rozet.getNumberOfBadges.call(ownerAddress);

      }).then(function(numberOfOwnersBadges) {
        //console.log("Number of Owner's Badges: " + numberOfOwnersBadges);
        indexOfOwnersLatestBadge = numberOfOwnersBadges.toNumber() - 1;
        // Consumer approves Rozet to take roz from their account if owner is able to authenticate the second badge.
        return rozetToken.balanceOf(consumerAddress);

      }).then(function(balance) {
       // console.log("Balance of consumer: " + balance);

        return rozetToken.badgePrice();

      }).then(function(_badgePrice) {
        authenticationPrice = _badgePrice;
        return rozetToken.approve(rozet.address, authenticationPrice, {from: consumerAddress});

      }).then(function() {
        // Owner then authenticates Consumer's badge and in the process Maker
        // recieves payment from Consumer.
        return rozet.authenticateBadge(ownerAddress, indexOfOwnersLatestBadge, {from: ownerAddress});

      }).then(function() {
        return rozet.isBadgeAuthenticated.call(ownerAddress,
        indexOfOwnersLatestBadge);

      }).then(function(result) {
        assert.equal(result, true, "Second Badge was not authenticated.");
        return rozetToken.balanceOf(makerAddress);

      }).then(function(newBalance) {
        console.log("Maker's balance after authentication: " +
        newBalance.toNumber());
        assert.equal(makerBalance + authenticationPrice,
        newBalance.toNumber(), "Maker did not recieve Roz from Consumer");
      });
    });

    it("Get Badges", function() {
      return rozet.getBadgesFrom.call(ownerAddress).then(function(badges) {
        var idArray = badges[0];
        var makerArray = badges[1];
        var ownerArray = badges[2];
        console.log(idArray);
        assert.equal(idArray.length, 2, "Owner should have two badges.");
      });
    });

    it("Get Badge by ID", function() {
      return rozet.getBadgeByID.call(0).then(function(badgeData) {
        var data = badgeData[0];
        var maker = badgeData[1];
        var owner = badgeData[2];
        assert.equal(data, "First Badge.");
      });
    });
    */
  });
});


// TODO move all the duplicate helper code into one file and import it
// TODO add test to ensure that roz can be broken down into 18 decimal places like eth. see if you can buy a badge for on rozWei
// TODO remove voting code duplicataion from transfer and transferFrom
// TODO what happens if a badge is authenticated twice? Nothing right?

// TODO add attempt to authenticate a reputable user without paying.

// TODO add a test to make sure that the only address that can add badges
// to Rozet is the Rozet contract itself

// TODO create a special issueBadge function that calculates the cost of
// authentication and pays that cost to the badge owner so they can authenticate
// for free.


