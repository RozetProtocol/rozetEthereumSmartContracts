
/**
 distribution: 
Locked
Reserve 10% (locked forever)

Manual set
Rozet Team 20% (locked for 1 year)
Rozet partners 20% (mix of locked / unlocked)

Rozet airdrop 10% (unlocked)

airDrop code will need to be automated so that each time someone uses the website we can automate sending them stuff
but we can do that w javascript, and if we need to we can create a seperate airdrop contrac that can batch send

Auto set
price tier increases if date is met or if 10% of tokens are sold. 

Rozet token sale contract price tier 1 (10% of all tokens)
Rozet token sale contract price tier 2 (10%)
Rozet token sale contract price tier 3 (10%)
Rozet token sale contract price tier 4 (10%)
Rozet token sale contract price tier 5 (10%)

 */

pragma solidity ^0.4.18;

import "./Rozet.sol";
import "./RozetToken.sol";
import "./SafeMath.sol";
import "./TokenTimelock.sol";
import "./ERC20Basic.sol";

contract RozetGeneration {
  using SafeMath for uint256;

  address public rozetMemberOne;
  address public rozetMemberTwo;
  address public rozetMemberThree;
  address public partnerOne;

  // How many token units a buyer gets per wei
  uint256[] public rates;

  // Amount of wei raised
  uint256 public weiRaised;

  uint256 public tierOneEndDate;
  uint256 public tierTwoEndDate;
  uint256 public tierThreeEndDate;
  uint256 public tierFourEndDate;

  TokenTimelock public rozetFoundersTimelock;
  TokenTimelock public rozetPartnersTimeLock;

  RozetToken public rozetToken;
  Rozet public rozet;

  uint256 public cap;

  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  // "0x692a70d2e424a56d2c6c27aa97d1a86395877b3a", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7" 
  function RozetGeneration(address _rozetMemberOne, address _rozetMemberTwo, address _rozetMemberThree, address _partnerOne) public {
    
    // Create the RozetToken contract and automaticly transfer all tokens created to this contract.
    rozetToken = new RozetToken();

    // Create the Rozet reputation database and ensure that it can only be used with offical Rozet tokens. 
    rozet = new Rozet(address(rozetToken));

    // Establish the addresses of each Rozet founder and partners.
    rozetMemberOne = _rozetMemberOne;
    rozetMemberTwo = _rozetMemberTwo;
    rozetMemberThree = _rozetMemberThree;
    partnerOne = _partnerOne;

    rates  = [1, 2, 3, 4, 5];
    weiRaised = 0;

    tierOneEndDate = now + 4 weeks;
    tierTwoEndDate = now + 6 weeks;
    tierThreeEndDate = now + 10 weeks;
    tierFourEndDate = now + 14 weeks;
    // cap of crowsale is 90% of all tokens
    cap = 10 ether;
    uint256 releaseTime = now + 1 years;

    // Rozet partners get 10% of Rozet Tokens locked for one year. 
    uint256 twentyPercentOfSupply = rozetToken.totalSupply() * 20 / 100;
    rozetPartnersTimeLock = new TokenTimelock(rozetToken, partnerOne, releaseTime);
    rozetToken.transfer(rozetPartnersTimeLock, twentyPercentOfSupply);

    // Rozet founders lock 10% for 1 year.
    uint256 tenPercentOfSupply = rozetToken.totalSupply() * 10 / 100;
    // optinally we may change rozetMemberOne to a multisig parityw allet since we dont have enoug gas to make 3 more locks
    rozetFoundersTimelock = new TokenTimelock(rozetToken, rozetMemberOne, releaseTime);
    rozetToken.transfer(rozetFoundersTimelock, tenPercentOfSupply);

    // Notice that the remaining 10% of tokens locked in this contract forever since they have not been distributed.

  }

  function () external payable {
    buyTokens(msg.sender);
  }

  function buyTokens(address _beneficiary) public payable {

    uint256 weiAmount = msg.value;
    _preValidatePurchase(_beneficiary, weiAmount);

    // calculate token amount to be purchased
    uint256 tokens = _getTokenAmount(weiAmount);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    rozetToken.transfer(_beneficiary, tokens);

    TokenPurchase(msg.sender, _beneficiary, weiAmount, tokens);

  }

  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) view internal {
    require(_beneficiary != address(0));
    require(_weiAmount != 0);
    require(weiRaised.add(_weiAmount) <= cap);

  }

  function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
    uint256 rate = getRate();
    return _weiAmount.mul(rate);
  }

  function getRate() public view returns (uint256) {
    uint256 priceTier;
    
    if (now >= tierFourEndDate) {
      priceTier = 4;
    } else if (now >= tierThreeEndDate) {
      priceTier = 3;
    } else if (now >= tierTwoEndDate) {
      priceTier = 2;
    } else if (now >= tierOneEndDate) {
      priceTier = 1;
    } else {
      priceTier = 0;
    }

    uint256 percentRaised = weiRaised.div(rozetToken.totalSupply());
    if (percentRaised >= 50 && 4 > priceTier) {
      priceTier = 4;
    } else if (percentRaised >= 40 && 3 > priceTier) {
      priceTier = 3;
    } else if (percentRaised >= 30 && 2 > priceTier) {
      priceTier = 2;
    } else if (percentRaised >= 20 && 1 > priceTier) {
      priceTier = 1;
    } else {
      priceTier = 0;
    }
    return rates[priceTier];
  }

  function capReached() public view returns (bool) {
    return weiRaised >= cap;
  }

  function withdraw() public {
    uint amountToSend = this.balance / 3;
    rozetMemberOne.transfer(amountToSend);
    rozetMemberTwo.transfer(amountToSend);
    rozetMemberThree.transfer(amountToSend);
  }

}