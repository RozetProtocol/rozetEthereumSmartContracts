import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import RozetABI from "./RozetABI.json";
import {getWeb3, getUserAddress} from './util'
import Promise from 'bluebird'

let rozet
let web3
//git clone git@bitbucket.org:davedm/automatetxs.git

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
  //console.log("string " + reputationString)
  //let unpacked = JSON.parse(reputationString)
  //console.log("unpacked")
  //console.dir(unpacked)

  rozet.issueBadge(reputationString, reputationData.recipientsEthAddress, ".", ".", ".", reputationData.sendersEthAddress, {from: userAccount}, function(err, tx) {
    console.log(err)
    console.log(tx)
  })

}

class App extends Component {

  async componentDidMount() { 

    window.rozet = {testSync, sync}
    console.log('here')
    var tupple = await getWeb3
    web3 = tupple.web3
    
    console.log("here" + web3.eth.accounts[0])
    
    const Rozet = web3.eth.contract(RozetABI)
    rozet = Rozet.at("0x81fe769b327a2c25cabf05bc5218392918196955")
    console.log(rozet)

    //Promise.promisifyAll(rozet)
    Promise.promisifyAll(web3.eth)


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
