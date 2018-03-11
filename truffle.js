/*
have event on sync for: 
reviews
replies
set synced=true in firebase and also double check that the content is the same as on ethereum

distribution: 
Locked
Reserve 10% (locked forever)

Manual set
Rozet Team 20% (locked for 1 year)
Rozet partners 20% (mix of locked / unlocked)
Rozet airdrop 10% (unlocked)

Auto set
price tier increases if date is met or if 10% of tokens are sold. 

Rozet token sale contract price tier 1 (10% of all tokens)
Rozet token sale contract price tier 2 (10%)
Rozet token sale contract price tier 3 (10%)
Rozet token sale contract price tier 4 (10%)
Rozet token sale contract price tier 5 (10%)


// first download the repository
git clone https://github.com/RozetPlatform/RozetPlatform.github.io.git
// if someone else makes changes then add them and resolve conflicts
git pull
// next add every file thats changed to the temp tree
git add *
// next move those files form teh tree to the head
git commit -m "update message"
// finally push them to the server
git push origin master

*/

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
