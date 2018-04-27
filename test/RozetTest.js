const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");

contract('Rozet', function(accounts) {

  var rozet;
  var rozetToken;
  var consumerAddress = accounts[0];
  var ownerAddress = accounts[1];
  var makerAddress = accounts[2];
  var indexOfOwnersLatestBadge;
  var makerBalance;

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
    
    it("Assign Badge", function() {
      // Maker issues Owner his first badge.
      return rozet.issueBadge("First Badge.", ownerAddress, "tag1", "tag2", "tag3", 0, {from: makerAddress}).then(function() {
        return rozet.getBadge.call(ownerAddress, 0);
      }).then(function([data, creator, owner]) {
        var data = data.substring(0, "First Badge.".length);
        assert.equal("First Badge.", data, "Badge data does not match.");
      });
    });

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

  });
});



// TODO remove voting code duplicataion from transfer and transferFrom
// TODO what happens if a badge is authenticated twice? Nothing right?

// TODO add attempt to authenticate a reputable user without paying.

// TODO add a test to make sure that the only address that can add badges
// to Rozet is the Rozet contract itself


// TODO create a special issueBadge function that calculates the cost of
// authentication and pays that cost to the badge owner so they can authenticate
// for free.


