# Ethereum Implementation of the Rozet Protocol

Rozet is a proof of stake protocol to replace the centralized search ranking, consumer reviews and fraud detection industry.

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

### The Basics of Rozet

Most clients will interact with Rozet via the Javascript or Python SDKs and not call these Solidity functions directly. For more information on exact usage see those documents. 

 ### issueBadge

 In Rozet a badge represents a review or type of reputation information. Issuing a badge to someone is analogous to writing something on a piece of paper and handing it to someone else. The only difference is that the recipient can not alter anything that was written.

 An example usage of this function is to write a review about another Rozet user. In this example a client is calling issueBadge on behalf of a review writer (typically on a plasma chain). The first parameter, _sender, is the address of the user writing the review. The second parameter, _recipient, is the address of the user receiving the review. The third parameter, _beneficiary, is an advanced feature that can be left to the zero address. The final parameter, _data, is the contents of the review.

 ### issueBadgeFromSignature

 This function is the same as issueBadge except the data is signed by the user thus allowing anyone else to the badge for that user without the user paying for gas.

 ### receiveBadge

 This function allows the user to approve of a badge that has been sent to them. They may optionally alter the badge with any data they wish to add. For example, in the event that IMDB wishes to query a review from a group of reputable users, those users could write their review via this function.

### License

Contributors must assign copyright back to Rozet for any contributions they make. Rozet retains ownership of any derivative work created from original content.
