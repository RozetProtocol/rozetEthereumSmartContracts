import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import RozetABI from "./RozetABI.json";
import RozetTokenABI from "./RozetTokenABI.json";
import {getWeb3, getUserAddress} from './util'
import Promise from 'bluebird'
const ethers = require('ethers');
var sigUtil = require('eth-sig-util')
const ethAbi = require('ethereumjs-abi')
var Eth = require('ethjs')
var ethUtil = require('ethereumjs-util')
var signedIssueBadge = {}

window.Eth = Eth

let web3
let rozet
let rozetToken
let eth


const signIssueBadge = async () => {

  let sender = web3.eth.accounts[0]
  let recipient = sender
  let addressToPay = "0xb576B32e578cd3bEFDc677FcbaF12Ee76143e581"
  let review = "Avengers is 5 stars."

  if (sender == undefined) {
    console.log("Metamask is probably not signed in.")
  }

  const msgParams = [
    {
      type: 'address',
      name: 'Sender',
      value: sender
    },
    {
      type: 'address',
      name: 'Recipient',
      value: recipient
    },
    {
      type: 'address',
      name: 'Address to Pay',
      value: addressToPay
    },
    {
      type: 'string',
      name: 'Data',
      value: review
    }
  ]

  var params = [msgParams, sender]
  let signed = await eth.signTypedDataAsync(msgParams, sender)
  const recovered = sigUtil.recoverTypedSignature({ data: msgParams, sig: signed })
  if (recovered === sender ) {
    console.log("Javascript successfully ecRecovered signer as " + sender)
  } else {
    console.log("Failed to verify signer when comparing " + signed + " to " + sender)
  }

  signed = signed.slice(2)
  let r = '0x' + signed.slice(0, 64)
  let s = '0x' + signed.slice(64, 128)
  let v = parseInt(signed.slice(128), 16)

  signedIssueBadge.v = v
  signedIssueBadge.r = r
  signedIssueBadge.s = s
  signedIssueBadge.sender = sender
  signedIssueBadge.recipient = recipient
  signedIssueBadge.addressToPay = addressToPay
  signedIssueBadge.data = review

  // Upload signed message to server here

  /*
  console.log("v " + v)
  console.log("r " + r)
  console.log("s " + s)
  console.log("sender " + sender)
  console.log("recipient " + recipient)
  console.log("addy to pay " + addressToPay)
  console.log("data " + review)
  */
}

const sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const waitForTransaction = async (txHash) => {
  let sucess = 0
	// wait for the transaction to finish
	let waitTime = 9000
	console.log("waiting for transaction " + txHash + " to process \n")
	while(true) {
		console.log(".")
		// sleep one minute
		await sleep(waitTime)
		let recipt = await web3.eth.getTransactionReceiptAsync(txHash)
		// if the transcation is not pending
		if (recipt != null) {
			if (recipt.blockNumber != null) {
				// if the transaction was sucesfull
				if (recipt.status == "0x1") {
					sucess = 1
				} else {
					sucess = 0
				}
				break;
			}
		}
	}
	return sucess
}

const submitSignedBadge = async () => {

  /*
  console.log("v " + signedIssueBadge.v)
  console.log("r " + signedIssueBadge.r)
  console.log("s " + signedIssueBadge.s)
  console.log("sender " + signedIssueBadge.sender)
  console.log("recipient " + signedIssueBadge.recipient)
  console.log("addy to pay " + signedIssueBadge.addressToPay)
  console.log("data " + signedIssueBadge.data)*/

  let txHash = await rozet.issueBadgeFromSignatureAsync(signedIssueBadge.v, signedIssueBadge.r, signedIssueBadge.s, 
      signedIssueBadge.sender, signedIssueBadge.recipient, signedIssueBadge.addressToPay, signedIssueBadge.data)
  await waitForTransaction(txHash)
  let mostRecentBadge = await rozet.getMostRecentBadgeAsync(signedIssueBadge.recipient)
  console.log(mostRecentBadge)
  let dataFromMostRecentBadge = mostRecentBadge[0]
  if (dataFromMostRecentBadge == signedIssueBadge.data) {
    console.log("Sucessfully issued badge from signature.")
    console.log(dataFromMostRecentBadge)
  }
 
}

class App extends Component {

  async componentDidMount() {
    var tupple = await getWeb3
    web3 = tupple.web3
    eth = new Eth(web3.currentProvider)

    const Rozet = web3.eth.contract(RozetABI)
    rozet = Rozet.at("0x2c3de8ce5b2213971af24d80e9bf3212a230d60a")

    // Default account is required for metamask to work.
    web3.eth.defaultAccount = web3.eth.accounts[0]

    Promise.promisifyAll(rozet)
    Promise.promisifyAll(eth)
    Promise.promisifyAll(web3.eth)

  }


  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
        <button onClick={signIssueBadge}>Sign Issue Badge</button>
        <button onClick={submitSignedBadge}>Submit Signed Badge</button>

        </p>

      </div>
    );
  }


}

export default App;


/*
//  let sender = web3.eth.accounts[0] // optionally i can use eth.personal.sign and set up the same private key for accounts[0] https://ethereum.stackexchange.com/questions/44735/sign-data-with-private-key-inside-a-truffle-test-file

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

const sign = async() => {

  let sender = web3.eth.accounts[0] // optionally i can use eth.personal.sign and set up the same private key for accounts[0] https://ethereum.stackexchange.com/questions/44735/sign-data-with-private-key-inside-a-truffle-test-file
  console.log("sender " + sender)

  let recipient = "0x96311e071Ecc22A486144c9E178f21776F876873" 
  let addressToPay = "0xb576B32e578cd3bEFDc677FcbaF12Ee76143e581"
  let review = "Avengers is 5 stars. You should see it."

  var text = "TEST"
  var msg = ethUtil.bufferToHex(new Buffer(text, 'utf8'))
  var from = web3.eth.accounts[0]

  // This hash will be reproduced on the chain and checked for authentisity.
  msg = abi.soliditySHA3(
    ["address", "address", "address", "string"],
    [sender, recipient, addressToPay, review]
  ).toString("hex");

  // Take the message, attach it to the end of "\x19Ethereum Signed Message:\n32", take the hash of the whole thing, then return a signature of that hash.
  //  signature = await web3.eth.sign(sender, message)
  //  r = '0x' + signature.slice(0, 64);
  //  s = '0x' + signature.slice(64, 128);
  //  v = parseInt(signature.slice(128), 16);


  // Now with Eth.js
  var eth = new Eth(web3.currentProvider)

  eth.personal_sign(msg, from)
  .then(async function(signed) {
    console.log('Signed!  Result is: ', signed)
    console.log('Recovering...')
    let signature = signed
    let r = '0x' + signature.slice(0, 64);
    let s = '0x' + signature.slice(64, 128);
    let v = parseInt(signature.slice(128), 16);
    let sigReturn = await rozet.issueBadgeFromSignatureAsync(v, r, s, sender, recipient, addressToPay, review)
    console.log("sig return " + sigReturn) 
    return eth.personal_ecRecover(msg, signed)
  })
  .then((recovered) => {

    if (recovered === from) {
      console.log('Ethjs recovered the message signer!')
    } else {
      console.log('Ethjs failed to recover the message signer!')
      console.dir({ recovered })
    }
  })
}


*/