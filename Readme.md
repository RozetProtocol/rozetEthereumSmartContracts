**Contents**

- [Introduction](#introduction)
- [Installation](#installation)
- [Rozet](#rozet)
  - [issueBadge](#issuebadge)
  - [issueBadgeFromSignature](#issuebadgefromsignature)
  - [receiveBadge](#receivebadge)
  - [getBadgeById](#getbadgebyid)
  - [badgesOf](#badgesof)
  - [setTrustedSponsor](#settrustedsponsor)
  - [getTrustedSponsors](#gettrustedsponsors)
  - [getNameFromAddress](#getnamefromaddress)
  - [getAddressFromName](#getaddressfromname)
  - [DNSFee](#dnsfee)
  - [setName](#setname)
  - [hasEnoughStakeToIssue](#hasenoughstaketoissue)
  - [tierTwoRequirement](#tiertworequirement)
  - [tierThreeRequirement](#tierthreerequirement)
  - [tierFourRequirement](#tierfourrequirement)
  - [hasEnoughStakeToReceive](#hasenoughstaketoreceive)
  - [getValidBeneficiaries](#getvalidbeneficiaries)
  - [setProfile](#setprofile)
  - [getProfile](#getprofile)
 - [RozetToken](#rozettoken)
   - [voteForSuperUser](#voteforsuperuser)
   - [getVotesForSuperUsers](#getvotesforsuperusers)
   - [stakeTokens](#staketokens)
   - [stakesOf](#stakesof)
   - [getStakeById](#getstakebyid)
   - [releaseStakedTokens](#releasestakedtokens)
   - [getVoters](#getvoters)
   - [totalSupply](#totalsupply)
   - [approve](#approve)
   - [increaseApproval](#increaseapproval)
   - [decreaseApproval](#decreaseapproval)
   - [transferFrom](#transferfrom)
   - [transfer](#transfer)
   - [burn](#burn)
   - [badgePrice](#badgeprice)
   - [stakeRequirement](#stakerequirement)


# Introduction
Rozet is a proof of stake protocol to replace the centralized search ranking, consumer reviews, and fraud detection industry.



## Installation
Get started by downloading the repository and running the unit tests.

```bash
git clone https://github.com/RozetProtocol/rozetEthereumSmartContracts.git
```

```bash
cd rozetEthereumSmartContracts
```

```bash
npm install
```

Start ganache with 600000 eth as the default starting amount for each account.

```bash
ganache-cli -e 600000
```

```bash
truffle test
```
***

# Rozet

This is the contract responsible for issuing and receiving badges. It is instantiated with the RozetToken ERC20 contract, which is used for all governance and payment functions.

***

## issueBadge


 In Rozet a badge represents a review or type of reputation information. Issuing a badge to someone is analogous to writing something on a piece of paper and handing it to someone else. The only difference is that the recipient can not alter anything that was written.

Examples of a badge are, a movie review, diploma, trophy, or award.

##### Parameters

1. `address` - The address of the sender. The address that supplied the data for  ```badge.senderData```. In the example of a review, the sender is the person who writes the review.
2. `address` - The address of the recipient. In the example of a review, the recipient is the address of the product or entity being reviewed (if one exists).
3. `address` - The address of the beneficiary. In the event that this address is the zero address, then the badge issued will not be receivable. Receivable badges are generally more reputable than non-receivable, however they require a fee to be paied to the beneficiary.  If the caller wishes this badge to be [receivable](#receivebadge) then this is the address that will be paid the badge price fee after the badge is received by the recipient. For this address to be valid it must be present in the recipient's ```receivedSponsorsIterable``` array which can be queried via [getValidBeneficiaries](#getValidbeneficiaries) by passing the recipients address as the parameter.
4. `string` - This is the data provided by the badge sender. It is stored in ```badge.senderData```. In the example of a review, this would be the review content provided by the sender. A recipient could also contributed to a review, but it would be stored in  ```badge.recipientData``` and can only be uploaded by the recipient by calling [receiveBadge](#receivebadge) and passing the badge ID of this badge.

##### Returns

`uint` - The unique badge ID of this badge. This can be used to query badge data by passing it to [getBadgeById](#getbadgebyid). It can also be used by the recipient to receive the badge by passing it to [receiveBadge](#receivebadge).

##### Example

```js
rozet.issueBadge('0xf06162929767F6a7779af9339687023cf2351fc5', '0x96311e071Ecc22A486144c9E178f21776F876873', '0x0000000000000000000000000000000000000000', "Infinity War is 5 stars.")
```
***
## issueBadgeFromSignature

Issuing a badge from signature is provides the same functionality as [issueBadge](#issuebadge) except that it can be called by a third party on behalf of a sender to save the sender gas.

##### Parameters
The first three parameters v, r, and s are all parts of the elliptic curve signature that the Rozet smart contract uses to prove that only the true owner of the sender's address signed the transaction. See the Javascript example below.
1. `uint8` - v.
2. `uint8` - r.
3. `uint8` - s.   
4. `address` - The address of the sender. The address that supplied the data for  ```badge.senderData```. In the example of a review, the sender is the person who writes the review.
5. `address` - The address of the recipient. In the example of a review, the recipient is the address of the product or entity being reviewed (if one exists).
6. `address` - The address of the beneficiary. In the event that this address is the zero address, then the badge issued will not be receivable. Receivable badges are generally more reputable than non-receivable, however they require a fee to be paid to the beneficiary.  If the caller wishes this badge to be [receivable](#receivebadge) then this is the address that will be paid the badge price fee after the badge is received by the recipient. For this address to be valid it must be present in the recipient's ```receivedSponsorsIterable``` array which can be queried via [getValidBeneficiaries](#getValidbeneficiaries) by passing the recipients address as the parameter.
7. `string` - This is the data provided by the badge sender. It is stored in ```badge.senderData```. In the example of a review, this would be the review content provided by the sender. A recipient could also contributed to a review, but it would be stored in  ```badge.recipientData``` and can only be uploaded by the recipient by calling [receiveBadge](#receivebadge) and passing the badge ID of this badge.

##### Returns

`uint` - The unique badge ID of this badge. This can be used to query badge data by passing it to [getBadgeById](#getbadgebyid). It can also be used by the recipient to receive the badge by passing it to [receiveBadge](#receivebadge).

##### Example
Note ```ethers.Wallet.createRandom``` is from https://github.com/ethers-io/ethers.js/ and
```ethAbi.soliditySHA3``` is from https://github.com/ethereumjs/ethereumjs-abi


```js
  const wallet = ethers.Wallet.createRandom()
  let sender = '0xf06162929767F6a7779af9339687023cf2351fc5'
  let recipient = '0x96311e071Ecc22A486144c9E178f21776F876873'
  let beneficiary = '0x0000000000000000000000000000000000000000'
  let review = "Infinity War is 5 stars."

  let message = ethAbi.soliditySHA3(
    ["address", "address", "address", "string"],
    [sender, recipient, addressToPay, review]
  )
  let signature = wallet.signMessage(message)
  signature = signature.slice(2)
  let r = '0x' + signature.slice(0, 64)
  let s = '0x' + signature.slice(64, 128)
  let v = parseInt(signature.slice(128), 16)

  let recoveredSender = await rozet.issueBadgeFromSignature(v, r, s, sender, recipient, addressToPay, review)

```
***


## receiveBadge

Receiving a badge increases the weight that reputation algorithms place on a badge. Only the badge's true recipient my receive a badge.  Most badges require a fee to be received. If the badge sender or sponsor has not authorized the Rozet contract to be paid the fee via the RozetToken [approve](#approve) function then receiveBadge will revert. The fee is similar to a stake, in that if the badge issuer may recoup the fee at a later time if they are reputable, but lose the fee if they are not reputable.

##### Parameters

1. `uint` - The ID of the badge that is to be received. This is the index of the badge in the global array ```allBadges```.
2. `string` - The recipient data. When receiving a badge a recipient may optionally contribute their own data to a badge. The recipient and only the recipient may alter this field. This is useful for what we call "selective crowd sourcing." For example, IMDB could issue badges to only reputable users and request movie reviews from them. Those reviews are examples of recipient data.


##### Returns

None.

##### Example

```js
rozet.receiveBadge(3, "Infinity War is 5 stars.");
```
***


## getBadgeById

Returns badge properties give the ID of a badge.

##### Parameters

`uint` - The ID of the badge whose data is to be retrieved.

##### Returns

1. `string` - The sender data. For example a review.
2. `string` - The recipient data. For example a review or response to a review.
3. 'address' - The sponsor. A sponsor is someone who sends a badge on behalf of a user without that users signature. A user may later approve a sponsor and thus signal that they approve of the message sent on their behalf. If a user does not wish to take the risk of a sponsor sending data on their behalf they are free to use [issueBadgeFromSignature](#issuebadgefromsignature). Neither method requires the user paying gas. Additionally a user may sponsor their own badges, which requires them to pay the gas fee and badge fee, but also makes them eligible for future Roz rewards since they can now be valid beneficiaries to future badge issuers that are required to pay the network.
4. `string` - The address of the user who may have written badge.senderData.
5. `address` - The recipient address. Only this address is allowed to upload recipientData via [receiveBadge](#receivebadge).
6. `bool` - Recipient Signed. This indicates that the recipient has received this badge.
7. `bool` - Sender Signed. This indicates that the sender has either issued the bage on their own behalf, or signed the transaction to issue the badge. In the case that this is false, a sponsor has issued a badge on behalf of the sender without approval from the sender. A sender can, at any time, upload their opinion of any sponsor to the blockchain via [setTrustedSponsor](#settrustedsponsor). Or if they wish to operate without the need to trust a sponsor a badge issuer may issue a badge, with no gas fee, via [issueBadgeFromSignature](#issuebadgefromsignature). A third option would be for the user to call [issueBadge](#issuebadge) directly and pay for the gas. In this third case the ```senderSigned``` is set to true.
8. `address` - The beneficiary address. This is the address that the issuer has chosen to pay the badge issuing fee to in the event that a user recieves this badge with [receiveBadge](#receivebadge). If the ```RozetToken``` contract has not been approved to take the fee, or this address is invalid as determined by [receiveBadge](#receivebadge) then the badge will not be receivable, and thus may be less reputable.
9. `address` - The time issued. This time stamp is used by the Rozet contract to determine if a user has reached their limit of issuing five or more badges per day. Issuing more than five badges per day requires a stake of Roz tokens. See [hasEnoughStakeToIssue](#hasenoughstaketoissue).
##### Example

```js
let badgeInformation = rozet.getBadgeById(3);
```
***


## badgesOf

Returns an array of badge IDs that have been issued to a given address.  

##### Parameters

 `address` - The address of the user whose badge's are to be queried.

##### Returns

 `uint[]` - The array of badge IDs that the user is the recipient of regardless of whether or not the user has called [receiveBadge](#receivebadge) on that badge or not.

##### Example

```js
let badges = rozet.badgesof('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***



## setTrustedSponsor

In the event that a user opts not to sign a transaction a sponsor may issue a badge on that users behalf. In the event that the user feels that the sponsor has represented that user accurately, the user may broadcast this to the network via the setTrustedSponsor method. Each user may elect up to 100 trusted sponsors. This data is useful to RozetRank algorithms for determining the validity of a sponsored badge.

##### Parameters

1. `address` - The address of the sponsor that the user has decided is trustworthy.
2. `uint` - The index in the array of 100 total sponsors that a user can elect.

##### Returns

None.

##### Example

```js
rozet.setTrustedSponsor('0x96311e071Ecc22A486144c9E178f21776F876873', 0);
```
***
## getTrustedSponsor

This method can be called by RozetRank algorithms to assess the quality of a badge issued by a sponsor on behalf of that badge's sender.  

##### Parameters

 `address` - The address of the sender in question.


##### Returns

 `address[]` - The sender has approved any sponsors, they will be returned in this array.


##### Example

```js
let sponsors = rozet.getTrustedSponsor('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***

## getNameFromAddress

This method is part of the Rozet Domain Name System.  

##### Parameters

 `address` - The address to query. If this address has registered a name with the Rozet DNS, then it will be returned.


##### Returns

 `bytes32` - The name, if any,  that the given address has registered with the DNS.

##### Example

```js
let name = rozet.getNameFromAddress('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***



## DNSFee

Returns the fee that the DNS requires to reserve a name for an address.

##### Parameters

None.


##### Returns

 `uint` - The fee, in Roz-Wei, required to call [setName](#setname)

##### Example

```js
let fee = rozet.DNSFee();
```
***

## setName

This method reserves a name for the caller in the Rozet DNS. Each address can have only one name associated with it, and each unique name can only be associated with one address. This method requires a fee. The fee is voted on by stakers. The latest fee can be determined by calling [DNSFee](#dnsfee). The fee is paid by approving the Rozet contract address to take the fee, and then calling [setName](#setname).

##### Parameters

 `string` - The name the calling address wishes to reserve.


##### Returns

None.

##### Example

```js
let fee = await rozet.DNSFee()
await rozetToken.approve(rozet.address, fee, {from: voterOne})
await rozet.setName("Name to set", {from: voterOne})
```
***

## hasEnoughStakeToIssue

Each user can issue no more than five badges per day without any stake. To issue a higher volume of badges, a user must stake Roz equal to the staking requirements. This function determines if a user has enough stake to issue a badge based on their usage history thus far.

The specific stake requirements vary depending on how the Roz holders vote. The current stake requirements are queried with:
 [tierTwoRequirement](#tiertworequirement) (5 or more badges per day),
[tierThreeRequirement](#tierthreerequirement) (100 or more badges per day), and
[tierFourRequirement](#tierfourrequirement) (1000 or more badges per day).

##### Parameters

 `address` - The address to query.

##### Returns

 `bool` - Will return true if this address has enough stake to call [issueBadge](#issuebadge) or false otherwise. Note that the caller (```msg.sender```) of the [issueBadge](#issuebadge) function, and not the actual sender of the badge is required to have stake. For example, an address can call [issueBadgeFromSignature](#issuebadgefromsignature) with a different address as the ```sender``` parameter, and the caller will be required to have an appropriate level of stake.

##### Example

```js
let hasEnough = rozet.hasEnoughStakeToIssue('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***


## hasEnoughStakeToReceive

Each user can receive no more than five badges per day without any stake. To receive a higher volume of badges, a user must stake Roz equal to the staking requirements. This function determines if a user has enough stake to issue a badge based on their usage history thus far.

The specific stake requirements vary depending on how the Roz holders vote. The current stake requirements are queried with:
 [tierTwoRequirement](#tiertworequirement) (5 or more badges per day),
[tierThreeRequirement](#tierthreerequirement) (100 or more badges per day), and
[tierFourRequirement](#tierfourrequirement) (1000 or more badges per day).

##### Parameters

`address` - The address to query.

##### Returns

 `bool` - Will return true if this address has enough stake to call [receiveBadge](#receivebadge) or false otherwise.

##### Example

```js
let hasEnough = rozet.receiveBadge('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***

## tierTwoRequirement

This function returns the required amount of Roz stake (denominated in Roz-Wei) to issue or receive more than five badges per 24 hour period. Note that issuing and receiving are tallied separately. For example, if an address issues four badges and receives three badges then they will be able to issue one more badge and receive two more badge before reaching the sending and receiving limit for tier two is reached.

To see how voting for this value works please see [stakeTokens](#staketokens).

##### Parameters

None.

##### Returns

`uint` - The required amount of stake necessary to call
 [issueBadge](#issuebadge) or  [issueBadgeFromSignature](#issuebadgefromsignature) more than five times in a 24 hour period. This value is also the required amount of stake needed to call [receiveBadge](#receivebadge) more than five times in a 24 hour period.

##### Example

```js
let tierTwoRequirement = rozet.tierTwoRequirement();
```
***


## tierThreeRequirement

This function returns the required amount of Roz stake (denominated in Roz-Wei) to issue or receive more than 100 badges per 24 hour period.

To see how voting for this value works please see [stakeTokens](#staketokens)

##### Parameters

None.

##### Returns

 `uint` - The required amount of stake necessary to call
 [issueBadge](#issuebadge) or  [issueBadgeFromSignature](#issuebadgefromsignature) more than 100 times in a 24 hour period. This value is also the required amount of stake needed to call [receiveBadge](#receivebadge) more than 100 times in a 24 hour period.

##### Example

```js
let tierThreeRequirement = rozet.tierThreeRequirement();
```
***

## tierFoureRequirement

This function returns the required amount of Roz stake (denominated in Roz-Wei) to issue or receive more than 1000 badges per 24 hour period.

To see how voting for this value works please see [stakeTokens](#staketokens)

##### Parameters

None.

##### Returns

 `uint` - The required amount of stake necessary to call
 [issueBadge](#issuebadge) or  [issueBadgeFromSignature](#issuebadgefromsignature) more than 1000 times in a 24 hour period. This value is also the required amount of stake needed to call [receiveBadge](#receivebadge) more than 1000 times in a 24 hour period.

##### Example

```js
let tierFourRequirement = rozet.tierFourRequirement();
```
***


## getValidBeneficiaries

The Rozet badges can be receivable or not receivable. A receivable badge is more reputable than a non-receivable badge, but it requires a fee. This fee is not paid to a central authority, instead it is paid to the most reputable users of the network. These reputable users are called beneficiaries.

When sending a receivable badge to a user the fee must be paid to a valid beneficiary. This function is used to determine what addresses are owned by valid beneficiaries. The address is then passed to [issueBadge](#issuebadge) or [issueBadgeFromSignature](#issuebadgefromsignature) to issue a receivable badge.

If there are no valid beneficiaries for a given recipient, then it is free to send that recipient a receivable badge.

##### Parameters

 `address` - The intended recipient of the receivable badge. Valid beneficiaries must be a ```badge.sponsor``` of the recipient's previous badges that has already been received via [receiveBadge](#receivebadge).

##### Returns

 `address[]` - An array of valid beneficiaries. Passing any valid beneficiary to [issueBadge](#issuebadge) will result in a receivable badge being issued. It is up to the badge issuer to choose a beneficiary to reward.

##### Example

```js
let validBeneficiaries = rozet.getValidBeneficiaries('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***

## setProfile

A profile is a data structure that can optionally be uploaded with no Roz fee that describes properties of an associated address.

##### Parameters

1. `string` - Country. The country of origin associated with the caller's address.
2. `string` - URL. A web address associated with the caller's address.
3. `string` - A link to a .jpg, .png, or .gif banner associated to the caller's address.
4.  `string` - A description or Biography associated with the caller's address.
5.  `string` - An additional data field reserved for third party use.
6.  `string` - An additional data field reserved for third party use.

##### Returns

None.

##### Example

```js
 rozet.setProfile('Canada', 'www.Canada.com', 'www.Canada_flag.jpg', 'Canada is lush and verdant', 'Reserved', 'Reserved');
```
***


## getProfile

A profile is a data structure that can optionally be uploaded with no Roz fee that describes properties of an associated address.

##### Parameters

 `address` - The address who's associated profile data you wish to query.

##### Returns

1. `string` - Country. The country of origin associated with the caller's address.
2. `string` - URL. A webaddress associated with the caller's address.
3. `string` - A link to a .jpg, .png, or .gif banner associated to the caller's address.
4.  `string` - A description or Biography associated with the caller's address.
5.  `string` - An additional data field reserved for third party use.
6.  `string` - An additional data field reserved for third party use.

##### Example

```js
 let profileData = rozet.getProfile('0x96311e071Ecc22A486144c9E178f21776F876873');
```
***

# RozetToken

The RozetToken is a mintable standard token primarily derived from OpenZepplin (https://github.com/OpenZeppelin/openzeppelin-solidity/tree/master/contracts/token/ERC20). It has been extended to allow for staking and voting for use with the Rozet smart contract.

***

## voteForSuperUser

Roz token holders can vote for superusers. A superuser is an additional tag that a RozetRank algorithm can use when determining the overall reputation of an address.

##### Parameters

1. `address` - The address that the caller wishes to associated with the superuser tag.
2. `uint` - The index of the voter's vote. Each vote is stored in an array of length 100. The index must be from 0-99. If an index of a previous vote is passed, then the previous vote will be overwritten.
##### Returns

None.

##### Example

```js
rozetToken.voteForSuperUser('0xf06162929767F6a7779af9339687023cf2351fc5')
```

## getVotesForSuperUsers

Roz token holders can vote for superusers. A superuser is an additional tag that a RozetRank algorithm can use when determining the overall reputation of an address.

##### Parameters

 `address` - The address whose votes are to be queried.

##### Returns

`address[]` - The addresses of the superusers that the given address has voted for.

##### Example

```js
let votedAddresses = rozetToken.getVotesForSuperUsers('0xf06162929767F6a7779af9339687023cf2351fc5')
```

## stakeTokens

Staking tokens is required to call [issueBadge](#issuebadge), [issueBadgeFromSignature](#issuebadgefromsignature), and
  [receiveBadge](#receivebadge) more than five times per day. It is also required to vote for [badgePrice](#badgeprice) and [stakeRequirement](#stakerequirement). Staked tokens send a signal to RozetRank algorithms that the associated address has a vested interest in the health of the reputation system.

##### Parameters

1. `address` - The beneficiary of the stake. If you intend to stake tokens for yourself then this is your address. You may also stake tokens for some other address in exchange for payment off-chain.
2. `uint` - The amount of Roz tokens to be staked, denominated in Roz-Wei.
3. `uint` - A vote for the badge price required to issue a receivable ([receiveBadge](#receivebadge)) badge with [issueBadge](#issuebadge). A value of zero abstains from voting. The price is denominated in Roz-Wei.
4. `uint` - A vote for stake requirements. This is a base multiplier that is used to determined the stake amount (denominated in Roz-Wei) for issuing more than five badges per day (i.e. [tierTwoRequirement](#tiertwotrequirement)). This value is  multiplied by ten to determine the stake requirement to issue more than 100 badges per day ([tierThreeRequirement](#tierthreerequirement). This value is multiplied by 100 to determine the stake requirements to issue more than 1000 badges per day ([tierFourRequirement](#tierfourrequirement). A value of zero abstains from voting.


##### Returns

None.

##### Example
Note that 'ether' denotes the denomination and not the currency. In this example Roz is being used to stake and vote not Ether.

```js
rozetToken.stakeTokens('0xf06162929767F6a7779af9339687023cf2351fc5', web3.toWei(50, 'ether'), web3.toWei(1, 'ether'), web3.toWei(2, 'ether'))
```


## stakesOf

Returns the IDs of any stake objects that a given address has issued.

##### Parameters

 `address` - The address of the stake issuer.


##### Returns

`uint[]` - An array of stake IDs. The ID can be used to query the properties of the stake by calling [getStakeById](#getstakebyid).

##### Example

```js
let stakeIDs = rozetToken.stakesOf('0xf06162929767F6a7779af9339687023cf2351fc5')
```

## getStakeById

Returns the properties of a stake given the stake ID.

##### Parameters

  `uint` - The ID of the stake returned by [stakesOf](#stakesof).

##### Returns

1. `address` - The address of the stake holder. I.e. the address that originally created this stake by calling [stakeTokens](#staketokens).
2. `address` - The beneficiary. This is the address that gains the privilege to issue and receive higher volume of badges from the staked tokens.
3.  `uint` - The amount of Roz that is staked, denominated in Roz-Wei.
4. `uint` - A timestamp indicating when the stake was issued.  
5. `bool` - A boolean indicating if the stake has been released or not. Once a stake is released it is invalid and can never be used again.
##### Example

```js
let stake = rozetToken.getStakeById(134)
```




## releaseStakedTokens

While Roz is staked the Roz is held in escrow by the RozetToken smart contract. When a stake is released the Roz is sent back to the stake holder, the stake is marked as ```released```, any votes cast by the stake are removed, and any beneficiary of the stake losses their privileges to issue or receive a higher volume of badges.

##### Parameters

  `uint` - The ID of the stake returned by [stakesOf](#stakesof).

##### Returns

None.

##### Example

```js
rozetToken.releaseStakedTokens(134)
```



## getVoters

Voters are addresses that have voted for either [badgePrice](#badgeprice) or
   [stakeRequirement](#stakerequirement) by calling [stakeTokens](#staketokens) with non-zero values for ```badgePrice``` and ```stakeRequriement``` parameters.

##### Parameters

 None.

##### Returns

 `address[]` - An array of all voters. This array is used to determine what address is eligible to randomly receive Roz payment as a reward when [setName](#setname) is called.

##### Example

```js
let voters = rozetToken.getVoters()
```


## totalSupply

The standard ERC20 function that returns the total supply of all Roz.

##### Parameters

 None.

##### Returns

  `uint` - The total supply.

##### Example

```js
let supply = rozetToken.totalSupply()
```

## approve

The standard ERC20 function that approves Roz to be taken by a third party. [receiveBadge](#receivebadge) requires that the caller approve the Rozet contract to take the [badgePrice](#badgeprice) from the caller before it will execute. [setName](#setname) requires that the caller approve the Rozet contract to take the [DNSFee](#dnsfee) before it will execute.

##### Parameters

 None.

##### Returns

 1. `address` - The address to approve.
 1. `uint` - The amount of Roz that the approved address is allowed to take, denominated in Roz-Wei.

##### Example

```js
let badgePrice = await rozetToken.badgePrice()
await rozetToken.approve(rozet.address, badgePrice, {from: consumerAddress})
```

## transferFrom

The standard ERC20 function to transfer from a specific address.

##### Parameters

1. `address` - The address to transfer from.
2. `address` - The address to transfer to.
3. `uint` - The amount to transfer denominated in Roz-Wei.

##### Returns

`bool` - Returns true if successful or false otherwise.

##### Example
Note that 'ether' denotes the denomination and not the currency. In this example Roz is being transferred not Ether.

```js
let badgePrice = await rozetToken.transferFrom('0xf06162929767F6a7779af9339687023cf2351fc5', '0x96311e071Ecc22A486144c9E178f21776F876873', web3.toWei(1, 'ether') )
```

## transfer

The standard ERC20 function to transfer from the caller's address.

##### Parameters

1. `address` - The address to transfer to.
2. `uint` - The amount to transfer denominated in Roz-Wei.

##### Returns

`bool` - Returns true if successful or false otherwise.

##### Example
Note that 'ether' denotes the denomination and not the currency. In this example Roz is being transferred not Ether.

```js
let badgePrice = await rozetToken.transfer( '0x96311e071Ecc22A486144c9E178f21776F876873', web3.toWei(1, 'ether') )
```


## burn

The standard ERC20 function to permanently destroy tokens.

##### Parameters

 `uint` - The amount to burn denominated in Roz-Wei.

##### Returns

None.

##### Example
Note that 'ether' denotes the denomination and not the currency. In this example Roz is being burned not Ether.

```js
rozetToken.burn(web3.toWei(1, 'ether'))
```



***

# License

Contributors must assign copyright back to Rozet for any contributions they make. Rozet retains ownership of any derivative work created from original content.
