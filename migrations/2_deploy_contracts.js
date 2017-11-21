const Rozet = artifacts.require("./Rozet.sol");
const RozetToken = artifacts.require("./RozetToken.sol");


module.exports = function(deployer) {
  deployer.deploy(Rozet);
  deployer.deploy(RozetToken, 100, "Rozet Token", "ROZ");

};
