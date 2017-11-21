
const RozetToken = artifacts.require("./RozetToken.sol");

contract('RozetToken', function(accounts) {

  it("Burn Roz", function() {
    var rozetToken;
    var initalBalance;
    var amountToBurn = 5000;
    return RozetToken.deployed().then(function(instance) {
      rozetToken = instance;
      return rozetToken.showBalance.call();
    }).then(function(balance) {
      initalBalance = balance;
      return rozetToken.burn(amountToBurn);
    }).then(function() {
      return rozetToken.showBalance.call();
    }).then(function(balance) {
      assert.equal(balance, initalBalance - amountToBurn,
        "Failed to burn correct amount of Roz.");
    });
  });

  it("Send Rozet Token", function() {
    var rozetToken;
    var initalBalanceOfReciever = 0;
    var amountToSend = 5;
    var senderAddress = accounts[0];
    var recieverAddress = accounts[1];
    return RozetToken.deployed().then(function(instance) {
      rozetToken = instance;
      return rozetToken.showBalanceOf.call(recieverAddress);
    }).then(function(balance) {
      initalBalanceOfReciever += balance.toNumber();
      return rozetToken.transfer(recieverAddress, amountToSend);
    }).then(function() {
        return rozetToken.showBalanceOf.call(recieverAddress);
    }).then(function(newBalance) {
      var expectedAmount = initalBalanceOfReciever + amountToSend;
      assert.equal(newBalance.toNumber(), expectedAmount,
      "Amounts do not match.");
    });
  });

  it("Withdraw Rozet Token", function() {
    var rozetToken;
    var initalBalanceOfReciever = 0;
    var amountToWithdraw = 5;
    var senderAddress = accounts[0];
    var recieverAddress = accounts[1];
    return RozetToken.deployed().then(function(instance) {
      rozetToken = instance;
      return rozetToken.showBalanceOf.call(recieverAddress);
    }).then(function(balance) {
      initalBalanceOfReciever += balance.toNumber();
      // Allow reciever to take money from senders account whenever they want.
      return rozetToken.approve(recieverAddress, amountToWithdraw,
      {from: senderAddress});
    }).then(function() {
      return rozetToken.transferFrom(senderAddress, recieverAddress,
      amountToWithdraw, {from: recieverAddress});
    }).then(function() {
        return rozetToken.showBalanceOf.call(recieverAddress);
    }).then(function(newBalance) {
      var expectedAmount = initalBalanceOfReciever + amountToWithdraw;
      assert.equal(newBalance.toNumber(), expectedAmount,
      "Amounts do not match.");
    });
  });

});
