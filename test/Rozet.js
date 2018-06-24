const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");
const RozetGeneration = artifacts.require("./RozetGeneration.sol");

const ethers = require('ethers');
const ethAbi = require('ethereumjs-abi')
var Eth = require('ethjs')
const {duration, increaseTimeTo, latestTime, increaseTime, mineOneBlock, advanceToBlock, ether} = require('./Helper.js')

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

contract('Rozet', function(accounts) {

  let rozet
  let rozetGeneration
  let rozetToken
  let senderAddress = accounts[0]
  let recipientAddress = accounts[1]
  let sponsorAddress = accounts[2]
  let consumerAddress = accounts[3]
  let member = accounts[4]
  let voterOne = accounts[5]
  let voterTwo = accounts[6]
  let tokenHolder = accounts[7]

  let indexOfOwnersLatestBadge
  let sponsorBalance

  function deployContract() {
    return RozetGeneration.new(member, member, member,
    member, member, member, {from: member}).then(function(_rozetGeneration) {
      rozetGeneration = _rozetGeneration;
      return rozetGeneration.rozetToken();
    }).then(function(rozetTokenAddress) {
      rozetToken = RozetToken.at(rozetTokenAddress);
      return Rozet.new(rozetTokenAddress);
    }).then(function(_rozet) {
      rozet = _rozet;
    });
  }

  describe("Initial state", function() {

    before(deployContract);

    it("Issue first badge.", async function() {
      await rozet.issueBadge(senderAddress, recipientAddress, 0,
         "First badge sender data one.", "tag", {from: sponsorAddress})
      let badgeIds = await rozet.badgesOf(recipientAddress)
      let latestBadge = await rozet.getBadgeById(badgeIds[badgeIds.length -1])
      let data = latestBadge[0].substring(0, "First badge sender data one.".length)
      data.should.be.equal("First badge sender data one.")
    });

    it("Receive first badge for free.", async function () {
      let badges = await rozet.badgesOf(recipientAddress)
      let latestBadgeId = badges[badges.length -1]
      let txHash = await rozet.receiveBadge(latestBadgeId,
         "First badge recipient data.", {from: recipientAddress})
      let latestBadge = await rozet.getBadgeById(latestBadgeId)
      let data = latestBadge[1].substring(0, "First badge recipient data.".length)
      data.should.be.equal("First badge recipient data.")
    });

    it("Issue second badge.", async function() {
      // The consumer buys Roz from the TGE.
      await rozetGeneration.sendTransaction({ value: web3.toWei(1000, 'ether'),
       from: consumerAddress });
      // The consumer issues a badge to be received.
      // The sponsor must be set as the beneficiary since he created the users only other badge.
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
         "Second badge sender data two.", "tag", {from: consumerAddress})
      // The consumer queries the badge price and approves the rozet contract to
      // take this payment when the recipient recieves the badge.
      let badgePrice = await rozetToken.badgePrice()
      await rozetToken.approve(rozet.address, badgePrice, {from: consumerAddress})
      let badgeIds = await rozet.badgesOf(recipientAddress)
      let latestBadge = await rozet.getBadgeById(badgeIds[badgeIds.length -1])
      let data = latestBadge[0].substring(0, "Second badge sender data two.".length)
      data.should.be.equal("Second badge sender data two.")
    });

    it("Receive second badge and distribute payment.", async function() {
      let initialRozBalanceOfConsumer = await rozetToken.balanceOf(consumerAddress)
      let initialRozBalanceOfSponsor = await rozetToken.balanceOf(sponsorAddress)
      // The recipient finds their most recent badge.
      let badges = await rozet.badgesOf(recipientAddress)
      let secondBadgeId = badges[badges.length -1]
      // The recipient recieves the badge and triggers the Roz distribution from the
      // consumer to the badge sponsor.
      await rozet.receiveBadge(secondBadgeId, "Second Badge recipient data.",
       {from: recipientAddress})
      // The new balance of the consumer is less the voted on badge price.
      let newRozBlanceOfConsumer = await rozetToken.balanceOf(consumerAddress)
      let badgePrice = await rozetToken.badgePrice()
      newRozBlanceOfConsumer.should.be.bignumber.equal(
        initialRozBalanceOfConsumer.minus(badgePrice))
      // The second badge has been fully recieved and now reflects the recipients
      // contribution to the badge data.
      let secondBadge = await rozet.getBadgeById(secondBadgeId)
      let data = secondBadge[1].substring(0, "Second Badge recipient data.".length)
      data.should.be.equal("Second Badge recipient data.")
      // TODO add a check to see if the sponsor got paid roz.
    });

    // TODO add a similar test except issue the 5th most recent badge the previous day to test the 5 per day limit.
    it("Stake tokens for yourself.", async function() {

      // Consumer issues four more badges.
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
        "Second badge sender data two.", "tag", {from: consumerAddress})
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
        "Second badge sender data three.", "tag", {from: consumerAddress})
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
        "Second badge sender data four.", "tag", {from: consumerAddress})
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
        "Second badge sender data five.", "tag", {from: consumerAddress})
      let hasStake = await rozet.hasEnoughStakeToIssue(consumerAddress)
      if (hasStake) {
        console.log("Error user should not have stake here");
      }

      // The sixth badge should be rejected due to insufficient stake.
      await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress, "Second badge sender data six.", "tag",
      {from: consumerAddress}).should.be.rejectedWith('revert');
      // console.log(txHash)

      // Stake the minimum amount needed to issue badges at the second volume tier.
      let stakeAmount = await rozet.tierTwoRequirement()
      console.log("stake amount")
      await rozetToken.approve(rozet.address, stakeAmount, {from: consumerAddress})
      // The sponsor buys Roz from the TGE so they can use it to stake for the consumer.
      await rozetGeneration.sendTransaction({ value: web3.toWei(1000, 'ether'),
       from: sponsorAddress });
      // The 0, 0 means that the sponsor is choosing not to vote.
      await rozetToken.stakeTokens(consumerAddress, stakeAmount, 0, 0, {from: sponsorAddress})
      hasStake = await rozet.hasEnoughStakeToIssue(consumerAddress)
      if(hasStake) {
        console.log("consumer staked" )
      } else {
        console.log("no stake")
      }

      //await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress, "Second badge sender data six.", "tag", {from: consumerAddress})

      //let badgeIds = await rozet.badgesOf(recipientAddress)
      //let latestBadge = await rozet.getBadgeById(badgeIds[badgeIds.length -1])
      //let data = latestBadge[0].substring(0, "Second badge sender data two.".length)
      //data.should.be.equal("Second badge sender data two.")

    });

    it("Stake tokens for someone else.", async function() {


    });

    /*
    it("Get Badge by ID", function() {
      return rozet.getBadgeByID.call(0).then(function(badgeData) {
        var data = badgeData[0];
        var maker = badgeData[1];
        var owner = badgeData[2];
        assert.equal(data, "First Badge.");
      });
    });*/

  });
/*
  describe('DNS', function() {

    before(async function() {
        await deployContract
        await rozetGeneration.sendTransaction({ value: web3.toWei(1000, 'ether'), from: voterOne });
        await rozetGeneration.sendTransaction({ value: web3.toWei(1000, 'ether'), from: voterTwo });

    })

      it('Purchace name from the DNS.', async function() {

          let fee = await rozet.getDNSFee()
          await rozetToken.approve(rozet.address, fee, {from: voterOne})
          await rozet.setName("Name to set", {
              from: voterOne
          })
          let name = await rozet.getNameFromAddress(voterOne)
          name = web3.toAscii(name).substring(0, "Name to set".length)
          let address = await rozet.getAddressFromName("Name to set")
          name.should.be.equal("Name to set")
          address.should.be.equal(voterOne)

      })

      it('Should not be able to buy DNS name without payment.', async function() {
          // VoterTwo has no roz.
          await rozet.setName("Name to set", {
              form: voterTwo
          }).should.be.rejectedWith('revert')
      })


  })
*/

});




// TODO add attempt to authenticate a reputable user without paying.





// *********** The following are unit tests that are not yet supported by ganache ***********

/*
    // Ganache does not support our current singing method yet: https://github.com/trufflesuite/ganache-core/pull/76

    it("send badge for free", async function() {

      let sender = senderAddress
      let recipient = "0x96311e071Ecc22A486144c9E178f21776F876873"
      let addressToPay = "0xb576B32e578cd3bEFDc677FcbaF12Ee76143e581"
      let review = "Avengers is 5 stars."

      const msgParams = [
        {
          type: 'address',
          name: 'Sender',
          value: sender
        },
        {
          type: 'address',
          name: 'Recipient',
          value: recipient
        },
        {
          type: 'address',
          name: 'Address to Pay',
          value: addressToPay
        },
        {
          type: 'string',
          name: 'Data',
          value: review
        }
      ]

      var params = [msgParams, sender]

      var eth = new Eth(web3.currentProvider)

      eth.signTypedData(msgParams, sender)
      .then(async function(signed) {
        console.log('Signed!  Result is: ', signed)
        console.log('Recovering...')
        const recovered = sigUtil.recoverTypedSignature({ data: msgParams, sig: signed })

        signed = signed.slice(2)
        let r = '0x' + signed.slice(0, 64);
        let s = '0x' + signed.slice(64, 128);
        let v = parseInt(signed.slice(128), 16);

        let sigerAsPerEtherum = await rozet.issueBadgeFromSignature(v, r, s, sender, recipient, addressToPay, review)
        console.log("signature return " + sigerAsPerEtherum)

        if (recovered === sender ) {
          alert('Successfully ecRecovered signer as ' + sender)
        } else {
          alert('Failed to verify signer when comparing ' + signed + ' to ' + sender)
        }

      })
    })*/

    /* this is an alternative form of signing that we could use as a unit test
    it("send badge for free", async function() {

      // This is a temporary workaround to ganache using ethers.js derived from here: https://ethereum.stackexchange.com/questions/34013/ecrecover-on-bytes32-array-elements
      const wallet = ethers.Wallet.createRandom()

      let sender = wallet.address
      let recipient = recipientAddress
      let addressToPay = sponsorAddress
      let review = "The latest Marvel movie is 5 stars."

      // This hash will be reproduced on the chain and checked for authentisity.
      let message = ethAbi.soliditySHA3(
        ["address", "address", "address", "string"],
        [sender, recipient, addressToPay, review]
      )

      // Take the message, attach it to the end of "\x19Ethereum Signed Message:\n32", take the hash of the whole thing, then return a signature of that hash.
      let signature = wallet.signMessage(message)
      console.log("SIG " + signature)
      signature = signature.slice(2);
      let r = '0x' + signature.slice(0, 64);
      let s = '0x' + signature.slice(64, 128);
      let v = parseInt(signature.slice(128), 16);

      let recoveredSender = await rozet.issueBadgeFromSignature(v, r, s, sender, recipient, addressToPay, review)
      console.log(sender)
      console.log(recoveredSender)
    });*/
