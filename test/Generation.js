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
const RozetToken = artifacts.require("RozetToken.sol")
const RozetGeneration = artifacts.require("RozetGeneration.sol")
const RozetTimelock = artifacts.require("RozetTimelock.sol")
let accounts = web3.eth.accounts
let rozetMemberOne = accounts[0]
let rozetMemberTwo = accounts[1]
let rozetMemberThree = accounts[2]
let partnerOne = accounts[3]
let partnerTwo = accounts[4]
let operationsAddress = accounts[5]
let buyerOne = accounts[6]
let buyerTwo = accounts[7]
let rozetToken
let rozetGeneration
let rozetTimelock

function deployContract() {
    return RozetGeneration.new(rozetMemberOne, rozetMemberTwo, rozetMemberThree, partnerOne, partnerTwo, operationsAddress, {
        from: rozetMemberOne
    }).then(function(_rozetGeneration) {
        rozetGeneration = _rozetGeneration
        return rozetGeneration.rozetToken()
    }).then(function(rozetTokenAddress) {
        rozetToken = RozetToken.at(rozetTokenAddress)
        return rozetGeneration.rozetTimelock()
    }).then(function(rozetTimelockAddress) {
        rozetTimelock = RozetTimelock.at(rozetTimelockAddress)
    })
}
contract('CappedCrowdsale', function([_, wallet]) {
    beforeEach(deployContract)
    describe('Accepting payments.', function() {
        it('Should accept payments within cap.', async function() {
            let cap = await rozetGeneration.cap()
            let lessThanCap = cap.div(10)
            let remainder = cap.minus(lessThanCap)
            await rozetGeneration.send(lessThanCap, {
                from: rozetMemberOne
            }).should.be.fulfilled
            await rozetGeneration.send(remainder, {
                from: rozetMemberOne
            }).should.be.fulfilled
        })
        it('Should reject payments outside cap.', async function() {
            let cap = await rozetGeneration.cap()
            await rozetGeneration.send(cap, {
                from: rozetMemberOne
            })
            await rozetGeneration.send(1).should.be.rejectedWith('revert')
        })
        it('Should reject payments that exceed cap.', async function() {
            let cap = await rozetGeneration.cap()
            await rozetGeneration.send(cap.plus(1), {
                from: rozetMemberOne
            }).should.be.rejectedWith('revert')
        })
    })
    describe('Ending.', function() {
        it('Should not reach cap if sent under cap.', async function() {
            let cap = await rozetGeneration.cap()
            let lessThanCap = cap.div(10)
            let capReached = await rozetGeneration.capReached()
            capReached.should.equal(false)
            await rozetGeneration.send(lessThanCap, {
                from: rozetMemberOne
            })
            capReached = await rozetGeneration.capReached()
            capReached.should.equal(false)
        })
        it('Should not reach cap if sent just under cap.', async function() {
            let cap = await rozetGeneration.cap()
            await rozetGeneration.send(cap.minus(1), {
                from: rozetMemberOne
            })
            let capReached = await rozetGeneration.capReached()
            capReached.should.equal(false)
        })
        it('Should reach cap if cap sent.', async function() {
            let cap = await rozetGeneration.cap()
            await rozetGeneration.send(cap, {
                from: rozetMemberOne
            })
            let capReached = await rozetGeneration.capReached()
            capReached.should.equal(true)
        })
    })
    describe('Accepting payments.', function() {
        it('Should accept payments.', async function() {
            await rozetGeneration.send(web3.toWei(300, 'ether'), {
                from: rozetMemberOne
            }).should.be.fulfilled
            await rozetGeneration.buyTokens(buyerOne, {
                value: web3.toWei(300, 'ether'),
                from: buyerTwo
            }).should.be.fulfilled
        })
    })
    describe('High-level purchase.', function() {
        it('Should assign tokens to sender.', async function() {
            let rate = await rozetGeneration.getCurrentRate()
            let etherToPay = web3.toWei(300, 'ether')
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let balance = await rozetToken.balanceOf(buyerOne)
            let expectedTokenAmount = rate.mul(etherToPay)
            balance.should.be.bignumber.equal(expectedTokenAmount)
        })
        it('Should assign tokens to beneficiary.', async function() {
            let etherToPay = web3.toWei(300, 'ether')
            await rozetGeneration.buyTokens(buyerOne, {
                value: etherToPay,
                from: buyerTwo
            })
            let rate = await rozetGeneration.getCurrentRate()
            let expectedTokenAmount = rate.mul(etherToPay)
            const balance = await rozetToken.balanceOf(buyerOne)
            balance.should.be.bignumber.equal(expectedTokenAmount)
        })
    })
    describe('Finalization.', function() {
        it('Should close ten seconds after closing time.', async function() {
            let closingTimeInSeconds = await rozetGeneration.closingTime()
            await increaseTimeTo(closingTimeInSeconds.plus(duration.seconds(1)))
            let closed = await rozetGeneration.hasClosed()
            closed.should.be.equal(true)
        })
        it('Should be open ten seconds before closing time.', async function() {
            let closingTimeInSeconds = await rozetGeneration.closingTime()
            await increaseTimeTo(closingTimeInSeconds.minus(duration.seconds(10)))
            let closed = await rozetGeneration.hasClosed()
            closed.should.be.equal(false)
        })
        it('Founder tokenlock should be funded after finalization.', async function() {
            // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let closingTimeInSeconds = await rozetGeneration.closingTime()
            await increaseTimeTo(closingTimeInSeconds.plus(duration.days(10)))
            await rozetGeneration.finalize()
            let founderAllocation = await rozetGeneration.founderAllocation()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            amountInLock.should.be.bignumber.equal(founderAllocation)
        })
        it('Should forward to rozet member one.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberOne)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.days(10)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            let tx = await rozetTimelock.release({
                from: rozetMemberOne
            })
            const post = await rozetToken.balanceOf(rozetMemberOne)
            post.should.be.bignumber.equal(amountPerFounder)
        })
        it('Should forward funds to rozet member two.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberTwo)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.days(10)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            let tx = await rozetTimelock.release({
                from: rozetMemberTwo
            })
            const post = await rozetToken.balanceOf(rozetMemberTwo)
            post.should.be.bignumber.equal(amountPerFounder)
        })
        it('Should forward funds to rozet member three.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberThree)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.days(10)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            let tx = await rozetTimelock.release({
                from: rozetMemberThree
            })
            const post = await rozetToken.balanceOf(rozetMemberThree)
            post.should.be.bignumber.equal(amountPerFounder)
        })
    })
    describe("Token Time Lock.", function() {
        beforeEach(deployContract)
        it('Cannot be released before time limit.', async function() {
            // await rozetGeneration.withdrawTimelockedTokens().should.be.rejected
            await rozetGeneration.sendTransaction({
                value: web3.toWei(300, 'ether'),
                from: buyerOne
            })
            await rozetTimelock.release().should.be.rejected
        })
        it('Cannot be released just before time limit.', async function() {
            await increaseTimeTo(rozetGeneration.memberOneReleaseTime - duration.seconds(3))
            await rozetTimelock.release().should.be.rejected
                // await rozetGeneration.withdrawTimelockedTokens().should.be.rejected
        })
        it('Can be released just after limit.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberOne)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.seconds(100)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            await rozetTimelock.release({
                from: rozetMemberOne
            })
            const post = await rozetToken.balanceOf(rozetMemberOne)
            post.should.be.bignumber.equal(amountPerFounder)
        })
        it('Can be released years after limit.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberOne)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.days(500)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            await rozetTimelock.release({
                from: rozetMemberOne
            })
            const post = await rozetToken.balanceOf(rozetMemberOne)
            post.should.be.bignumber.equal(amountPerFounder)
        })
        it('Cannot be released twice.', async function() {
            const pre = rozetToken.balanceOf(rozetMemberOne)
                // Run and finalize a token sale.
            let etherToPay = new BigNumber(web3.toWei(300, 'ether'))
            await rozetGeneration.sendTransaction({
                value: etherToPay,
                from: buyerOne
            })
            let releaseTime = await rozetTimelock.releaseTime()
            await increaseTimeTo(releaseTime.plus(duration.days(500)))
            await rozetGeneration.finalize()
            let amountInLock = await rozetToken.balanceOf(rozetTimelock.address)
            let amountPerFounder = amountInLock.div(3)
            await rozetTimelock.release({
                from: rozetMemberOne
            }).should.be.fulfilled
            await rozetTimelock.release({
                from: rozetMemberOne
            }).should.be.rejected

        })

    })

})
