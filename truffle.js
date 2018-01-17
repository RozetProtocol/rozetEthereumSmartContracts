var HDWalletProvider = require("truffle-hdwallet-provider");

var mnemonic =
  "rent notice region deal good lucky fee indicate inject fit melody animal teach twice region";

const rinkebyProvider = new HDWalletProvider(
  mnemonic,
  "https://rinkeby.infura.io/8M4M4zT6uiGQe2I0fiB2 "
);

//console.log("Provider: ")
//console.log(rinkebyProvider);

require("babel-register");
require("babel-polyfill");

module.exports = {
  networks: {
   /* development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6712388
    },
    /*
    rinkeby: {
      network_id: 4,
      provider: rinkebyProvider,
      gasPrice: "20000000000",
      gasLimit: "4704624",
      gas: "4704624"
    }*//*
    rinkeby: {
  	 host: "localhost", // Connect to geth on the specified
      port: 8545,
      from: "0xF69e96a3e03DAA29ceE9364cAd107219CB24C807", // default address to use for any transaction Truffle makes during migrations
      network_id: 4,
      gas: 4712388 // Gas limit used for deploys
  	}*/
  }
};
