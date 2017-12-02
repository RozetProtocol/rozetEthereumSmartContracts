module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4600000
    },
    rinkby: {
  	 host: "localhost", // Connect to geth on the specified
      port: 8545,
      from: "0xF69e96a3e03DAA29ceE9364cAd107219CB24C807", // default address to use for any transaction Truffle makes during migrations
      network_id: 4,
      gas: 4600000 // Gas limit used for deploys
  	}
  }
};
