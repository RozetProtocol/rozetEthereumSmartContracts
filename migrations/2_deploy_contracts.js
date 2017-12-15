const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");
const RozetTokenSale = artifacts.require("./RozetTokenSale.sol");


module.exports = function(deployer) {
  deployer.deploy(Rozet);
  deployer.deploy(RozetToken, 100, "Rozet Token", "ROZ");
  const wallet = "0x9d217bcbd0bfae4d7f8f12c7702108d162e3ab79";

  deployer.deploy(RozetTokenSale,
        1514800000, // Start
        1514836800, // End: January 1, 2018 at 12:00PM PST
        1000, // Rate
        100, // Goal
        wallet, // Wallet
        10000  // Cap
      );

};
