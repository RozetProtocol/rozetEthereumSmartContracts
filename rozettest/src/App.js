import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import RozetABI from "./RozetABI.json";
import RozetTokenABI from "./RozetTokenABI.json";
//const RozetTokenABI = artifacts.require("./RozetTokenABI.sol");

import {getWeb3, getUserAddress} from './util'
import Promise from 'bluebird'
const ethers = require('ethers');

let web3
let rozet
let rozetToken
// git clone git@bitbucket.org:davedm/automatetxs.git

// be sure to increase the gas amount manually when calling this from rinkeby because metamask gets it wrong for some reason
const testSync = () => {
  let reputationObject = {
    content: "content",
    image: "image",
    banner: "banner",
    permalink: "permalink",
    rating:"null",
    recipient: "null",
    recipientsEthAddress: "0x921285014b566db57d2acc3839ead5ed6d316c38",
    sender: "SENDER",
    sendersEthAddress: "0x921285014b566db57d2acc3839ead5ed6d316c38",
    timestamp: "12:39",
    title: "title",
    video: "ll"
  }
  sync(reputationObject)
}

const sync = async (reputationData) => {

  let reputationString =  JSON.stringify(reputationData)
  console.log(reputationString + reputationData.recipientsEthAddress + reputationData.sendersEthAddress)

  let userAccount = web3.eth.accounts[0]
  // console.log("string " + reputationString)
  // let unpacked = JSON.parse(reputationString)
  // console.log("unpacked")
  // console.dir(unpacked)

  rozet.issueBadge(reputationString, reputationData.recipientsEthAddress, ".", ".", ".", reputationData.sendersEthAddress, {from: userAccount}, function(err, tx) {
    console.log(err)
    console.log(tx)
  })

}

const sign = async () => {
/*
  //using ethers with metamask:
  if (typeof web3 !== 'undefined') {
    var web3Provider = new ethers.providers.Web3Provider(web3.currentProvider, ethers.providers.networks.ropsten);
    web3Provider.getBalance("..some address.."). then(function(balance) {
      var etherString = ethers.utils.formatEther(balance);
      console.log("Balance: " + etherString);
    });
  }*/


  const wallet = ethers.Wallet.createRandom();
  console.log("signing address " + wallet.address);
  let addressToPay = "0xa8012262b2057ad500483e6f115435d60e6ef959"
  let recipient = "0xf06162929767F6a7779af9339687023cf2351fc5"
  let data = "This is my review"
  //const msg = "This message's length: 32 bytes."
  const msg = addressToPay + recipient + data;

  const sig = wallet.signMessage(msg).slice(2);
  
  let r = '0x' + sig.slice(0,64);
  let s = '0x' + sig.slice(64, 128);
  let v = parseInt(sig.slice(128), 16);

  //console.log(r)
  //console.log(s)
  //console.log(v)

  let result = await rozet.verifyAsync(v, r, s)
 
  console.log("result " + result)
  
}

const getRozBalance = async (address) => {

  let balance = rozetToken.balnceOf(address);
  console.log("balance " + balance)
  return balance;

}

class App extends Component {

  async componentDidMount() {

    window.rozet = {testSync, sync}
    var tupple = await getWeb3
    web3 = tupple.web3
    
    //console.log("main account: " + web3.eth.accounts[0])
    
    const Rozet = web3.eth.contract(RozetABI)
    rozet = Rozet.at("0xa8012262b2057ad500483e6f115435d60e6ef959")
    Promise.promisifyAll(rozet)

    const RozetToken = web3.eth.contract(RozetTokenABI)
    let rozetTokenAddress = rozet.addressOfRozetTokenAsync();
    rozetToken = RozetToken.at(rozetTokenAddress)

    //console.log(rozetToken)

    Promise.promisifyAll(rozetToken)

    // new rozet account: horse verify wreck stand picnic divide boat art reunion night reduce blame
 
    await sign();

   // await sync(object);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }


}

export default App;
