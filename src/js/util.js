import Web3 from 'web3'

export const getWeb3 = new Promise(function(resolve, reject) {
	
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

export const onMetaMaskChange = async (accountChangeCallback, networkChangeCallback) => {
	//const web3 = await getWeb3
	var tupple = await getWeb3
	const web3 = tupple.web3
	const hasAccount = tupple.hasAccount
	let account = web3.eth.accounts[0]
	let networkId

	setInterval( () => {
		if (web3.eth.accounts[0] !== account) {	
			account = web3.eth.accounts[0]
			accountChangeCallback()
		}

		web3.version.getNetwork((err, netId) => {
			if (networkId != netId) {
				networkChangeCallback()
			}
			networkId = netId
		})

	}, 300)
}

export const getUserNetwork = async () => {
	var tupple = await getWeb3
	const web3 = tupple.web3
	const hasAccount = tupple.hasAccount

	return new Promise( (resolve, reject) => {
		web3.version.getNetwork((err, netId) => {
			if (err) return reject(err)
			resolve(netId)
		})
	})
}

export const getUserAddress = async () => {
	var tupple = await getWeb3
	const web3 = tupple.web3
	const hasAccount = tupple.hasAccount
	const userAddress = await web3.eth.accounts[0]
	return userAddress
}

export const formatSeconds = (seconds) => {
	seconds = (seconds | 0)
	if ( /^\d$/.test(seconds) ) seconds = '0' + seconds
	return seconds
}
