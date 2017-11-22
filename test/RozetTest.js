const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");

contract('Rozet', function(accounts) {
  var rozet;
  var rozetToken;
  var authenticationPrice;
  var consumerAddress = accounts[0];
  var ownerAddress = accounts[1];
  var makerAddress = accounts[2];
  var indexOfOwnersLatestBadge;
  var makerBalance;

  it("Connect to Rozet", function() {
    return Rozet.deployed().then(function(instance) {
      rozet = instance;
      return RozetToken.deployed();
    }).then(function(instance) {
      rozetToken = instance;
      return rozet.getAuthenticationPrice.call();
    }).then(function(price) {
      authenticationPrice = price.toNumber();
      assert.notEqual(authenticationPrice, 0,
      "Authentication Price can not be free.");
    });
  });

  it("Register Name", function() {
    return rozet.register("Maker", {from: makerAddress}).then(function() {
      return rozet.getName.call({from: makerAddress});
    }).then(function(nameBytes) {
      const nameString = web3.toAscii(nameBytes).substring(0, "Maker".length);
      assert.equal("Maker", nameString, "Name was not registered.");
    });
  });

  it("Register Name", function() {
    return rozet.register("Owner", {from: ownerAddress}).then(function() {
      return rozet.getName.call({from: ownerAddress});
    }).then(function(nameBytes) {
      const nameString = web3.toAscii(nameBytes).substring(0, "Owner".length);
      assert.equal("Owner", nameString, "Name was not registered.");
    });
  });

  it("Assign Badge", function() {
    // Maker issues Owner his first badge.
    return rozet.issueBadge("First Badge.", ownerAddress,
    0, {from: makerAddress}).then(function() {
      return rozet.getBadge.call(ownerAddress, 0);
    }).then(function([data, creator, owner]) {
      var data = web3.toAscii(data).substring(0, "First Badge.".length);
      assert.equal("First Badge.", data, "Badge data does not match.");
    });
  });

  it("Authenticate the First Badge for Free", function() {
    return rozet.getNumberOfBadges.call(ownerAddress).then(function(number) {
      indexOfOwnersLatestBadge = number.toNumber() - 1;
      // Owner authenticates his newest badge.
      // This is free for Maker since Owner has no reputation yet.
      return rozet.authenticateBadge(rozetToken.address, ownerAddress,
        indexOfOwnersLatestBadge, {from: ownerAddress});

    }).then(function() {
      return rozet.isBadgeAuthenticated.call(ownerAddress,
      indexOfOwnersLatestBadge);

    }).then(function(result) {
      assert.equal(result, true, "First badge was not authenticated.");
    });
  });

  it("Issue and Authenticate a Second Badge", function() {

    return rozetToken.showBalanceOf(makerAddress).then(function(balance) {
      makerBalance = balance.toNumber();
      console.log("Maker's balance before authentication: " + makerBalance);
      // Consumer issues the second badge to owner. Consumer sets the
      // addressToPay to makerAddress because Maker is the one that
      // established Consumer's reputation by issuing the first badge.
      return rozet.issueBadge("Second Badge.", ownerAddress, makerAddress,
      {from: consumerAddress});

    }).then(function() {
      return rozet.getNumberOfBadges.call(ownerAddress);

    }).then(function(numberOfOwnersBadges) {
      console.log("Number of Owner's Badges: " + numberOfOwnersBadges);
      indexOfOwnersLatestBadge = numberOfOwnersBadges.toNumber() - 1;
      // Consumer approves Rozet to take roz from their account
      // if owner is able to authenticate the second badge.
      return rozetToken.approve(rozet.address, authenticationPrice,
      {from: consumerAddress});

    }).then(function() {
      // Owner then authenticates Consumer's badge and in the process Maker
      // recieves payment from Consumer.
      return rozet.authenticateBadge(rozetToken.address, ownerAddress,
      indexOfOwnersLatestBadge, {from: ownerAddress});

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
      var dataArray = badges[0];
      var makerArray = badges[1];
      var ownerArray = badges[2];
      console.log(dataArray);
      assert.equal(dataArray.length, 2, "Owner should have two badges.");
    });
  });

});

// TODO make sure that geting badges works in parallel. in otherwords
// what happens if you auth the lastest badge but then someone assings a new
// badge during that process?

/* TODO
in theory:  .call() functions will not change the state of the network even
if you try.  functions without .call() can not return a value even if you try.
yet is solidity when i get the return value of transferFrom i do get a bool
so why is it that i can seem to get a return value from a transaction in solidity
but i cant in javascript?
 maybe because when i call from solidity its part of the same transaction?
*/

/*TODO what happens if a badge is authenticated twice? Nothing right? */

// TODO add attempt to authenticate a reputable user without paying.

// TODO add a test to make sure that the only address that can add badges
// to Rozet is the Rozet contract itself

// TODO replace the DNS with some mechanism so that we can add one later.

// TODO how can we ensure that when ethereum adds the new feature for
// third party gas payment that our code can update to use it?
// would we hard fork? or can i encapsulate the function on an address
// and then swap out the code at that address?

// TODO create a special issueBadge function that calculates the cost of
// authentication and pays that cost to the badge owner so they can authenticate
// for free.

// TODO is the DNS actually secure as written? Since the caller can only change
// their own address name then i dont think there is a way to change someone
// elses name?

// This is just code that can be used to catch and print debug events from
// solidity:
//var event = rozet.DebugOutput();
//event.watch(function(error, result) {
//  console.log(result);
//});
