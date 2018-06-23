/*
{
  content: null,
  image: null,
  banner: null,
  permalink: null,
  rating: null,
  recipient: null,
  recipientsEthAddress: null,
  sender: null,
  sendersEthAddress: null,
  timestamp: null,
  title: null,
  video null,
  type: 'reply/review'
}
wrie this as a .json string in data 
*/

let RozetABI = require('./RozetABI.json');
//import RozetABI from "./RozetABI.json";
//import Web3 from "web3";
let Web3 = require('web3');


//import Promise from "bluebird";

let rozet;
let accounts;
let web3;

const getWeb3 = new Promise(function(resolve, reject) {
	
	// Wait for loading completion to avoid race conditions with web3 injection timing.
	window.addEventListener('load', function() {
		var web3 = window.web3

		// Checking if Web3 has been injected by the browser (Mist/MetaMask)
		if (typeof web3 !== 'undefined') {
			// Use Mist/MetaMask's provider.
			web3 = new Web3(web3.currentProvider)

			console.log('Injected web3 detected.');

			resolve({
				web3: web3,
				hasAccount: true
			})

		} else {			
			// Fallback to infura
			web3 = new Web3( new Web3.providers.HttpProvider('https://rinkeby.infura.io/uaNKEkpjsyvArG0sHifx'));

			resolve({
				web3: web3,
				hasAccount: false
			})
			
		}
	})
})

const App = {

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
  rozet.issueBadge("Badge3", ownerAddress, ownerAddress, {from: ownerAddress});
  */

  init: async function() {

    var tupple = await getWeb3
	  web3 = tupple.web3
    doesHaveAccount = tupple.hasAccount
    
    App.web3Provider = web3.currentProvider;
    web3 = new Web3(web3.currentProvider);
  

    return App.initContract();
  },

  initContract: function() {
    // to run on real server:
    //$.getJSON('../build/contracts/Rozet.json', function(data) {
    // to run locally:
    const Rozet = web3.eth.contract(RozetABI)
    rozet = Rozet.at("0x921285014b566db57d2acc3839ead5ed6d316c38")
    Promise.promisifyAll(rozet)

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
    console.log("here");

    App.contracts.Rozet.deployed().then(function(instance) {
      rozet = instance;
      console.log("here");

      return rozet.getName.call();

    }).then(function(bytesName) {

      var name = "You are logged in as: " + web3.toAscii(bytesName);
      document.getElementById("title").innerHTML=name;
      return rozet.getBadges.call();

    }).then(function(badges) {
      var dataArray = badges[0];
      var makerArray = badges[1];
      var makerNameArray = badges[2];

      // Display the data for each badge in the user's profile.
      for (i in dataArray) {

        badge = document.createElement("div");
        badge.innerHTML = "<p>" + web3.toAscii(dataArray[i]) + "<br>" +
        "Made by: " + web3.toAscii(makerNameArray[i]) + " " + makerArray[i] +"</p>";
        document.getElementById("badgeRow").appendChild(badge);
      }

    }).catch(function(err) {
      console.log(err.message);
    });
  },

  sendBadge: function() {
    var data = document.getElementById("dataField").value;
    var owner = document.getElementById("ownerField").value;

    return rozet.issueBadge(data, owner, "tag1", "tag2", "tag3", 0).then(function() {
      // TODO refresh the webage.
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
