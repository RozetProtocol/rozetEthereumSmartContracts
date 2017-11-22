App = {
  web3Provider: null,
  contracts: {},

  // To make this site appear on the github server
  // change the directories of all .getJSON() calls.
  // For example: to run locally the directory for Rozet would be:
  // .getJSON('Rozet.json')
  // to run on the real server the direcotry would be:
  // .getJSON(../build/contracts/Rozet.json')


  /*
  This is code to copy and paste into the turffle console that will populate
  the blockchain with a test rozet network so the website has something to
  display.

  var rozet;
  Rozet.deployed().then((res) => {rozet = res});
  var accounts;
  web3.eth.getAccounts(function(err,res) { accounts = res; });

  var ownerAddress = accounts[0];
  var consumerAddress = accounts[1];
  var makerAddress = accounts[2];
  rozet.register("Owner", {from: ownerAddress});

  rozet.issueBadge("Badge1", ownerAddress, makerAddress, {from: makerAddress});
  rozet.issueBadge("Badge2", ownerAddress, makerAddress, {from: makerAddress});

  */

  init: function() {

    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // For production if we end up here we need to tell the user
      // that they need to install metamask if they are using chrome
      // or switch to mist or something like that.
      console.log("Could not find injected web3.");
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }

    return App.initContract();
  },

  initContract: function() {

    $.getJSON('Rozet.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var RozetArtifact = data;
      App.contracts.Rozet = TruffleContract(RozetArtifact);
      // Set the provider for our contract.
      App.contracts.Rozet.setProvider(App.web3Provider);
      // Use our contract to get the profile name of the current user.
      return App.populateProfile();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-authenticate', App.handleAuthenticate);
  },

  populateProfile: function() {
   var rozet;

    App.contracts.Rozet.deployed().then(function(instance) {
      rozet = instance;
      return rozet.getName.call();

    }).then(function(bytesName) {
      var name = web3.toAscii(bytesName);
      document.getElementById("title").innerHTML=name;
      return rozet.getBadges.call();

    }).then(function(badges) {
      var dataArray = badges[0];
      var makerArray = badges[1];

      // Display the data for each badge in the user's profile.
      console.log(dataArray);

    }).catch(function(err) {
      console.log(err.message);
    });
  },

  markAuthenticated: function() {

  },

  handleAuthenticate: function() {

  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
