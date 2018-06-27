const Rozet = artifacts.require("./Rozet.sol")
const RozetToken = artifacts.require("./RozetToken.sol")
const RozetGeneration = artifacts.require("./RozetGeneration.sol")

const ethers = require('ethers')
const ethAbi = require('ethereumjs-abi')
var Eth = require('ethjs')
const {
    duration,
    increaseTimeTo,
    latestTime,
    increaseTime,
    mineOneBlock,
    advanceToBlock,
    ether
} = require('./Helper.js')

const BigNumber = web3.BigNumber

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
            member, member, member, {
                from: member
            }).then(function(_rozetGeneration) {
            rozetGeneration = _rozetGeneration
            return rozetGeneration.rozetToken()
        }).then(function(rozetTokenAddress) {
            rozetToken = RozetToken.at(rozetTokenAddress)
            return Rozet.new(rozetTokenAddress)
        }).then(function(_rozet) {
            rozet = _rozet
        })
    }

    describe("Initial state.", function() {

        before(deployContract)

        it('Can set trusted sponsor.', async function() {
            let numberOfTrustedSponsors = await rozet.numberOfTrustedSponsors()
            await rozet.setTrustedSponsor(tokenHolder, numberOfTrustedSponsors - 1, {
                from: voterOne
            })
            let trustedSponsors = await rozet.getTrustedSponsors(voterOne)
            trustedSponsors[trustedSponsors.length - 1].should.be.equal(tokenHolder)
        })

        it('Can remove trusted sponsor.', async function() {
            let numberOfTrustedSponsors = await rozet.numberOfTrustedSponsors()
            await rozet.setTrustedSponsor('0x0000000000000000000000000000000000000000',
                numberOfTrustedSponsors - 1, {
                    from: voterOne
                })
            let trustedSponsors = await rozet.getTrustedSponsors(voterOne)
            trustedSponsors[trustedSponsors.length - 1].should.be.equal(
                '0x0000000000000000000000000000000000000000')
        })

        it('Can not exceed limit for trusted sponsors.', async function() {
            let numberOfTrustedSponsors = await rozet.numberOfTrustedSponsors()
            await rozet.setTrustedSponsor(tokenHolder, numberOfTrustedSponsors, {
                from: voterOne
            }).should.be.rejectedWith('revert')
        })

        it("Issue first badge.", async function() {
            await rozet.issueBadge(senderAddress, recipientAddress, 0,
                "First badge sender data one.", {
                    from: sponsorAddress
                })
            let badgeIds = await rozet.badgesOf(recipientAddress)
            let latestBadge = await rozet.getBadgeById(badgeIds[badgeIds.length - 1])
            let data = latestBadge[0].substring(0, "First badge sender data one.".length)
            data.should.be.equal("First badge sender data one.")
        })

        it("Receive first badge for free.", async function() {
            let badges = await rozet.badgesOf(recipientAddress)
            let latestBadgeId = badges[badges.length - 1]
            let txHash = await rozet.receiveBadge(latestBadgeId,
                "First badge recipient data.", {
                    from: recipientAddress
                })
            let latestBadge = await rozet.getBadgeById(latestBadgeId)
            let data = latestBadge[1].substring(0, "First badge recipient data.".length)
            data.should.be.equal("First badge recipient data.")
        })

        it("Issue second badge.", async function() {
            // The consumer buys Roz from the TGE.
            await rozetGeneration.sendTransaction({
                    value: web3.toWei(1000, 'ether'),
                    from: consumerAddress
                })
                // The consumer issues a badge to be received.
                // The sponsor must be set as the beneficiary since he created the users only other badge.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data two.", {
                    from: consumerAddress
                })

            let badgeIds = await rozet.badgesOf(recipientAddress)
            let latestBadge = await rozet.getBadgeById(badgeIds[badgeIds.length - 1])
            let data = latestBadge[0].substring(0, "Second badge sender data two.".length)
            data.should.be.equal("Second badge sender data two.")
        })

        it("Second badge can not be received without payment.", async function() {
            let initialRozBalanceOfConsumer = await rozetToken.balanceOf(consumerAddress)
            let badges = await rozet.badgesOf(recipientAddress)
            let secondBadgeId = badges[badges.length - 1]
            await rozet.receiveBadge(secondBadgeId, "Second Badge recipient data.", {
                from: recipientAddress
            }).should.be.rejectedWith('revert')

        })

        it("Receive second badge and distribute payment.", async function() {

            // The consumer queries the badge price and approves the rozet contract to
            // take this payment when the recipient recieves the badge.
            let badgePrice = await rozetToken.badgePrice()
            await rozetToken.approve(rozet.address, badgePrice, {
                from: consumerAddress
            })

            let initialRozBalanceOfConsumer = await rozetToken.balanceOf(consumerAddress)
                // The recipient finds their most recent badge.
            let badges = await rozet.badgesOf(recipientAddress)
            let secondBadgeId = badges[badges.length - 1]
                // The recipient recieves the badge and triggers the Roz distribution from the
                // consumer to the badge sponsor.
            await rozet.receiveBadge(secondBadgeId, "Second Badge recipient data.", {
                    from: recipientAddress
                })
                // The new balance of the consumer is less the voted on badge price.
            let newRozBlanceOfConsumer = await rozetToken.balanceOf(consumerAddress)
            newRozBlanceOfConsumer.should.be.bignumber.equal(
                    initialRozBalanceOfConsumer.minus(badgePrice))
                // The second badge has been fully recieved and now reflects the recipients
                // contribution to the badge data.
            let secondBadge = await rozet.getBadgeById(secondBadgeId)
            let data = secondBadge[1].substring(0, "Second Badge recipient data.".length)
            data.should.be.equal("Second Badge recipient data.")
        })

        it("Can not issue badge with no stake.", async function() {

            // Consumer issues four more badges.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data two.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data three.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data four.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data five.", {
                    from: consumerAddress
                })
            let hasStake = await rozet.hasEnoughStakeToIssue(consumerAddress)
            if (hasStake) {
                console.log("Error user should not have stake here")
            }

            // The sixth badge should be rejected due to insufficient stake.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress, "Second badge sender data six.", {
                from: consumerAddress
            }).should.be.rejectedWith('revert')

        })

        it("Can issue badge if you staked for yourself.", async function() {
            let beneficiary = consumerAddress
            let badgeVote = 0
            let stakeVote = 0
            let amount = await rozet.tierTwoRequirement()
            await rozetToken.stakeTokens(beneficiary, amount, badgeVote, stakeVote, {
                from: beneficiary
            })

            // The sixth badge should be made since the consumer staked for themselves.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress, "Second badge sender data six.", {
                from: consumerAddress
            }).should.be.fulfilled

        })

        it("Can not issue over five badges per day if you remove your stake.", async function() {

            // Must wait to release the stake.
            await increaseTime(duration.days(4))
            let stakeIds = await rozetToken.stakesOf(consumerAddress)
            let stakeId = stakeIds[0]

            await rozetToken.releaseStakedTokens(stakeId, {
                from: consumerAddress
            })

            // Consumer issues five more badges.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data one.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data two.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data three.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data four.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data five.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data six.", {
                    from: consumerAddress
                }).should.be.rejectedWith('revert')

        })

        it("Badge limit resets after one dayt.", async function() {
            await increaseTime(duration.days(1))
                // Even though the user has issued 5 badges they will not reach the limit
                // because the five badges was issued on the previous day.
                // Consumer issues five more badges.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data one.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data two.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data three.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data four.", {
                    from: consumerAddress
                })
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data five.", {
                    from: consumerAddress
                }).should.be.fulfilled

        })

        it("Can issue badge if someone else stakes for you.", async function() {

            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress,
                "Second badge sender data six.", {
                    from: consumerAddress
                }).should.be.rejectedWith('revert')

            let beneficiary = consumerAddress
            let badgeVote = 0
            let stakeVote = 0
            let amount = await rozet.tierTwoRequirement()

            // Sponsor buys Roz from the TGE and uses it to stake consumer.
            await rozetGeneration.sendTransaction({
                value: web3.toWei(1000, 'ether'),
                from: sponsorAddress
            })
            await rozetToken.stakeTokens(beneficiary, amount, badgeVote, stakeVote, {
                from: sponsorAddress
            })

            // The sixth badge should be made since the consumer staked for themselves.
            await rozet.issueBadge(consumerAddress, recipientAddress, sponsorAddress, "Second badge sender data six.", {
                from: consumerAddress
            }).should.be.fulfilled
        })


    })

    describe('Domain Name System.', function() {

        before(async function() {
            await deployContract
            await rozetGeneration.sendTransaction({
                value: web3.toWei(1000, 'ether'),
                from: voterOne
            })
            await rozetGeneration.sendTransaction({
                value: web3.toWei(1000, 'ether'),
                from: voterTwo
            })

        })

        it('Purchace name from the DNS.', async function() {

            let fee = await rozet.getDNSFee()
            await rozetToken.approve(rozet.address, fee, {
                from: voterOne
            })
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

})



// *********** The following are unit test is not yet supported by ganache ***********

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
        let r = '0x' + signed.slice(0, 64)
        let s = '0x' + signed.slice(64, 128)
        let v = parseInt(signed.slice(128), 16)

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
  signature = signature.slice(2)
  let r = '0x' + signature.slice(0, 64)
  let s = '0x' + signature.slice(64, 128)
  let v = parseInt(signature.slice(128), 16)

  let recoveredSender = await rozet.issueBadgeFromSignature(v, r, s, sender, recipient, addressToPay, review)
  console.log(sender)
  console.log(recoveredSender)
})*/
