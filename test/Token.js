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

const RozetToken = artifacts.require("./RozetToken.sol")
let rozetToken
let tokenHolder = web3.eth.accounts[0]
let tokenReceiver = web3.eth.accounts[1]
let voterOne = web3.eth.accounts[2]
let voterTwo = web3.eth.accounts[3]
let voterThree = web3.eth.accounts[4]

function deployContract() {
    return RozetToken.new().then(function(_rozetToken) {
        rozetToken = _rozetToken
        return rozetToken.mint(tokenHolder, web3.toWei(500000, 'ether'))
    })
}

contract('RozetToken', function(accounts) {

    describe('Basic functionality', function() {

        before(deployContract)

        it("Send Rozet token.", async function() {

            rozetToken.transfer(tokenReceiver, 10, {
                from: tokenHolder
            })
            let recieved = await rozetToken.balanceOf(tokenReceiver)
            recieved.should.be.bignumber.equal(10)

        })

        it("Approve Rozet token transfer.", async function() {
            let amountToWithdraw = 5
            let initalBalanceOfReceiver = await rozetToken.balanceOf(tokenReceiver)
            await rozetToken.approve(tokenReceiver, amountToWithdraw)
            await rozetToken.transferFrom(tokenHolder, tokenReceiver, amountToWithdraw, {
                from: tokenReceiver
            })
            let newBalance = await rozetToken.balanceOf(tokenReceiver)
            newBalance.should.be.bignumber.equal(initalBalanceOfReceiver.plus(amountToWithdraw))

        })

        it("Transfer to multiple accounts", async function() {
            let accountsToReceive = [accounts[6], accounts[7], accounts[8], accounts[9]]
            let amounts = [2, 3, 4, 5]
            let transferRequest = await rozetToken.transferToMultipleAccounts(accountsToReceive,
               amounts)
            let balance = await rozetToken.balanceOf(accounts[7])
            assert.equal(balance, 3, "balance was not distributed")
        })

    })

    describe('Voting', function() {

        before(async function() {
            await deployContract
            // Give 10 roz to voterOne and 5 roz to voterTwo.
            await rozetToken.transfer(voterOne, web3.toWei(500, 'ether'), {
                from: tokenHolder
            })
            await rozetToken.transfer(voterTwo, web3.toWei(500, 'ether'), {
                from: tokenHolder
            })
        })

        it('Roz holders should be able to vote for badge price.', async function() {
            let beneficiary = voterOne
            let amount = web3.toWei(1, 'ether')
            let badgeVote = 20
            let stakeVote = 20
            await rozetToken.stakeTokens(beneficiary, amount, badgeVote, stakeVote,
              {from: voterOne})

            let totalBadgePriceVote = await rozetToken.totalBadgePriceVote()
            let totalBadgePriceVoteAmount = await rozetToken.totalBadgePriceVoteAmount()

            // The total badgePriceVote is the amount * badgeVote for each voter.
            // Since there is only one voter so far that is going to be 20 * 1 ether.
            totalBadgePriceVote.should.be.bignumber.equal(web3.toWei(20, 'ether'))
            totalBadgePriceVoteAmount.should.be.bignumber.equal(web3.toWei(1, 'ether'))

            beneficiary = voterTwo
            amount = web3.toWei(1, 'ether')
            badgeVote = 10
            stakeVote = 20
            await rozetToken.stakeTokens(beneficiary, amount, badgeVote, stakeVote)
            let badgePrice = await rozetToken.badgePrice()

            badgePrice.should.be.bignumber.equal(15)

        })

        it('Roz holders should be able to vote for stake price.', async function() {
          // The total stake requirement vote is the amount * vote for each voter.

          let totalStakeRequirementVote = await rozetToken.totalStakeRequirementVote()
          let totalStakeRequirementVoteAmount = await rozetToken.totalStakeRequirementVoteAmount()
          let stakeRequirement = await rozetToken.stakeRequirement()

          // This is voter one's stake * voter ones vote + voter twos stake * voter two's vote ->
          // 1 eth * 20 + 1 eth * 20 = 40 eth
          totalStakeRequirementVote.should.be.bignumber.equal(web3.toWei(40, 'ether'))
          totalStakeRequirementVoteAmount.should.be.bignumber.equal(web3.toWei(2, 'ether'))
          // Since there are two voters and each is voting for 20 then the result should be 20.
          stakeRequirement.should.be.bignumber.equal(20)

        })

        it('Voter cant vote without stake.', async function() {
          let beneficiary = voterThree
          let amount = web3.toWei(1, 'ether')
          let badgeVote = 20
          let stakeVote = 0
          await rozetToken.stakeTokens(beneficiary, amount, badgeVote, stakeVote,
            {from: voterThree}).should.be.rejectedWith('revert')

        })

        it('Stake can not be released before duration.', async function() {
          let stakeIds = await rozetToken.stakesOf(voterOne)
          let stakeId = stakeIds[0]
          // Stake time is three days. Tokens can only be released after stake time.
          await increaseTime(duration.days(2))
          await rozetToken.releaseStakedTokens(stakeId,
            {from: voterOne}).should.be.rejectedWith('revert')

        })

        it('Only stake owner may release their stake.', async function() {
          let stakeIds = await rozetToken.stakesOf(voterOne)
          let stakeId = stakeIds[0]
          // Stake time is three days. Tokens can only be released after stake time.
          await increaseTime(duration.days(4))
          await rozetToken.releaseStakedTokens(stakeId,
            {from: voterTwo}).should.be.rejectedWith('revert')

        })

        it('Removing stake removes vote for badge price.', async function() {
          let stakeIds = await rozetToken.stakesOf(voterOne)
          let stakeId = stakeIds[0]
          // Stake time is three days. Tokens can only be released after stake time.
          await increaseTime(duration.days(4))
          // VoterOne voted for 20 and voterTwo voted for 10. When voterOne withdraws
          // their vote then the only remaining vote will be for 10.
          await rozetToken.releaseStakedTokens(stakeId, {from: voterOne})

          let badgePrice = await rozetToken.badgePrice()
          badgePrice.should.be.bignumber.equal(10)

        })

        it('Removing stake removes vote for stake requirement.', async function() {

          let totalStakeRequirementVote = await rozetToken.totalStakeRequirementVote()
          let totalStakeRequirementVoteAmount = await rozetToken.totalStakeRequirementVoteAmount()
          let stakeRequirement = await rozetToken.stakeRequirement()

          // Since there is only one voter now and their stake was 1 eth and vote was 20,
          // then the total vote is 1 eth * 20  = 20 eth
          totalStakeRequirementVote.should.be.bignumber.equal(web3.toWei(20, 'ether'))
          totalStakeRequirementVoteAmount.should.be.bignumber.equal(web3.toWei(1, 'ether'))
          // Since there are two voters and each is voting for 20 then the result should be 20.
          stakeRequirement.should.be.bignumber.equal(20)

        })

        it('Cant remove the same stake twice.', async function() {
          let stakeIds = await rozetToken.stakesOf(voterOne)
          let stakeId = stakeIds[0]
          await rozetToken.releaseStakedTokens(stakeId,
            {from: voterOne}).should.be.rejectedWith('revert')

        })

        it('Can vote for super users.', async function() {
          let numberOfVotes = await rozetToken.numberOfVotesForSuperUsers()
          await rozetToken.voteForSuperUser(tokenHolder, numberOfVotes - 1, {from: voterOne})
          let votes = await rozetToken.getVotesForSuperUsers(voterOne)
          votes[votes.length - 1].should.be.equal(tokenHolder)
        })

        it('Can un-vote for super user.', async function() {
          let numberOfVotes = await rozetToken.numberOfVotesForSuperUsers()
          await rozetToken.voteForSuperUser('0x0000000000000000000000000000000000000000',
           numberOfVotes - 1, {from: voterOne})
          let votes = await rozetToken.getVotesForSuperUsers(voterOne)
          votes[votes.length - 1].should.be.equal('0x0000000000000000000000000000000000000000')
        })

        it('Can not exceed vote limit for super users.', async function() {
          let numberOfVotes = await rozetToken.numberOfVotesForSuperUsers()
          await rozetToken.voteForSuperUser(tokenHolder, numberOfVotes,
            {from: voterOne}).should.be.rejectedWith('revert')
        })

        it('Can set trusted sponsor.', async function() {
          let numberOfTrustedSponsors = await rozetToken.numberOfTrustedSponsors()
          await rozetToken.setTrustedSponsor(tokenHolder, numberOfTrustedSponsors - 1,
            {from: voterOne})
          let trustedSponsors = await rozetToken.getTrustedSponsors(voterOne)
          trustedSponsors[trustedSponsors.length - 1].should.be.equal(tokenHolder)
        })

        it('Can remove trusted sponsor.', async function() {
          let numberOfTrustedSponsors = await rozetToken.numberOfTrustedSponsors()
          await rozetToken.setTrustedSponsor('0x0000000000000000000000000000000000000000',
          numberOfTrustedSponsors - 1, {from: voterOne})
          let trustedSponsors = await rozetToken.getTrustedSponsors(voterOne)
          trustedSponsors[trustedSponsors.length - 1].should.be.equal(
            '0x0000000000000000000000000000000000000000')
        })

        it('Can not exceed limit for trusted sponsors.', async function() {
          let numberOfTrustedSponsors = await rozetToken.numberOfTrustedSponsors()
          await rozetToken.setTrustedSponsor(tokenHolder, numberOfTrustedSponsors,
             {from: voterOne}).should.be.rejectedWith('revert')
        })


    })

    describe('burn', function() {

        before(deployContract)

        it('burns the requested amount', async function() {
            let balance = await rozetToken.balanceOf(tokenHolder)
            await rozetToken.burn(100, {
                tokenHolder
            })
            const newBalance = await rozetToken.balanceOf(tokenHolder)
            assert.equal(balance - 100, newBalance)
        })

        it('emits a burn event', async function() {
            const {
                logs
            } = await rozetToken.burn(100, {
                tokenHolder
            })
            const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
            assert.equal(logs.length, 2)
            assert.equal(logs[0].event, 'Burn')
            assert.equal(logs[0].args.burner, tokenHolder)
            assert.equal(logs[0].args.value, 100)
            assert.equal(logs[1].event, 'Transfer')
            assert.equal(logs[1].args.from, tokenHolder)
            assert.equal(logs[1].args.to, ZERO_ADDRESS)
            assert.equal(logs[1].args.value, 100)
        })

        it('when the given amount is greater than the balance of the sender', async function() {
            let amount = await rozetToken.balanceOf(tokenHolder)
            amount = amount.toNumber() + 1
            await rozetToken.burn(amount, {
                from: tokenHolder
            }).should.be.rejectedWith('revert')
        })

    })
/*
    describe('DNS', function() {

        before(deployContract)

        it('Purchace name from the DNS.', async function() {
            // Token holder gives all his Roz to voter one.
            let balanceOfTokenHolder = await rozetToken.balanceOf(tokenHolder)
            await rozetToken.transfer(voterOne, balanceOfTokenHolder.toNumber(), {
                from: tokenHolder
            })
            let balanceOfVoterOne = await rozetToken.balanceOf(voterOne)
            await rozetToken.setName("Name to set", {
                from: voterOne
            })
            let name = await rozetToken.getNameFromAddress(voterOne)
            name = web3.toAscii(name).substring(0, "Name to set".length)
            let address = await rozetToken.getAddressFromName("Name to set")
            name.should.be.equal("Name to set")
            address.should.be.equal(voterOne)
        })

        it('DNS fee should be distributed.', async function() {
            let fee = await rozetToken.getDNSFee()
            let balanceOfTokenHolder = await rozetToken.balanceOf(tokenHolder)
            fee.should.be.bignumber.equal(balanceOfTokenHolder)
        })

        it('Should not be able to buy DNS name without payment.', async function() {
            // VoterTwo has no roz.
            await rozetToken.setName("Name to set", {
                form: voterTwo
            }).should.be.rejectedWith('revert')
        })



    })

*/
})
