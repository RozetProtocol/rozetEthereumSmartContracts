
pragma solidity ^0.4.18;

import "./Rozet.sol";
import "./RozetToken.sol";
import "./SafeMath.sol";
import "./RozetTimelock.sol";

contract RozetGeneration {

  using SafeMath for uint256;

  address public founderOne;
  address public founderTwo;
  address public founderThree;
  address public partnerOne;
  address public partnerTwo;
  address public operations;

  uint256 public weiRaised;
  uint256 public tokensSold;
  uint256 public cap;
  uint public rate;
  uint256 public openingTime;
  uint256 public closingTime;

  uint public founderAllocation;

  uint256 public roundOneStartDate;
  uint256 public roundTwoStartDate;
  uint256 public roundThreeStartDate;
  uint256 public roundFourStartDate;

  bool public isFinalized = false;


  RozetToken public rozetToken;
  RozetTimelock public rozetTimelock;

  modifier onlyFounders() {
    require(msg.sender == founderOne || msg.sender == founderTwo || msg.sender == founderThree);
    _;
  }

  modifier onlyWhileOpen {
    // solium-disable-next-line security/no-block-members
    require(block.timestamp >= openingTime && block.timestamp <= closingTime);
    _;
  }
  //  Rozet public rozet;

// TODO update all linkns to our github, new address is RozetProtocol not Platform 
  // Add proof of stake to elect super users trusted nodes. max 100 
  // TODO add indivual cap
  // TODO add whitelisting
  // TODO add cap to rozetToken so max num of  mintable tokens that can be made
  // TODO what happens if round 1 cap is 10 eth and we have raised 9 eth so far and somone gives us two eth. do they get round 1 rate for the total sale?

  // attack, A issues badge to B and then they authenticate and A gets paid... by stealing from our site... 

  // Issue 4 badges
  // Add a field to a abdge that says "for authentication" or "not for authentication" in the case that someone gets 4 badges 
  // From the same person and only wnats two of them to be authenticated. 

  // Can we authenticate senders not makers without being cheated?? 
// TODO add array of a recipient's trusted badge makers that can be added to and removed from at anytime 
  event Finalized();
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  // "0x692a70d2e424a56d2c6c27aa97d1a86395877b3a", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7", "0xFa9B0D8BB3e4cCdF443467C9eAF08f3b95420cB7" 
  constructor(address _founderOne, address _founderTwo, address _founderThree, address _partnerOne, address _partnerTwo, address _operationsAddress) public {
    
    // solium-disable-next-line security/no-block-members
    // require(_openingTime >= block.timestamp);
    // require(_closingTime >= _openingTime);

    openingTime = now + 1;
    roundOneStartDate = now;
    roundTwoStartDate = roundOneStartDate + 4 weeks;
    roundThreeStartDate = roundTwoStartDate + 4 weeks;
    roundFourStartDate = roundThreeStartDate + 4 weeks;
    closingTime = roundFourStartDate + 4 weeks;

    rozetToken = new RozetToken();

    uint timelockReleaseDate = now + 1 years;
    rozetTimelock = new RozetTimelock(rozetToken, _founderOne, _founderTwo, _founderThree, timelockReleaseDate);

    // Create the Rozet reputation database and ensure that it can only be used with offical Rozet tokens. 
    // rozet = new Rozet(address(rozetToken));

    // Establish the addresses of each Rozet founder and partner.
    founderOne = _founderOne;
    founderTwo = _founderTwo;
    founderThree = _founderThree;
    partnerOne = _partnerOne;
    partnerTwo = _partnerTwo;
    operations = _operationsAddress;

    // Rate is approximatly 10c per Roz or 100 Roz per USD (assuming Ether is at $650). 
    // This translates to 152,358,055,378,460 wei per Rozet token. 
    // Or 1 Eth per 6563.5 Roz.
    rate = 152358055378460;

    // The maximum amount of ether to be raised is approximatly 20 million USD or 30k Ether (assuming %650 per ether).
    cap = 30000 ether;

    weiRaised = 0;

  }

  function hasClosed() public view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return block.timestamp > closingTime;
  }

  function () external payable {
    buyTokens(msg.sender);
  }

  function buyTokens(address _beneficiary) public payable {

    uint256 weiAmount = msg.value;

    require(_beneficiary != address(0));
    require(weiAmount != 0);
    require(weiRaised.add(weiAmount) <= cap);

    uint tokenAmount = getAmountOfRozForEth(weiAmount);
    
    weiRaised = weiRaised.add(weiAmount);

    tokensSold += tokenAmount;

    // TODO what does this require do? require(MintableToken(token).mint(_beneficiary, _tokenAmount));

    rozetToken.mint(_beneficiary, tokenAmount);

    emit TokenPurchase(msg.sender, _beneficiary, weiAmount, tokenAmount);

  }

  function getAmountOfRozForEth(uint weiAmount) view public returns (uint) {
     // Determine the number of tokens to give the buyer based on the round and bonus for that round.
    uint currentRate = getCurrentRate();

    uint256 tokens = weiAmount.mul(currentRate);

    return tokens;
  }

  function getCurrentRate() public view returns (uint256) {
    // The price of Roz is discounted for early rounds.
    uint256 round = getRound();

    // Determine the discount bonus to be given based on the current round.
    uint bonus = getBonus(round);

    // Appply the bonus to the rate.
    return rate + (rate * bonus / 100);
  }

  function getRound() public view returns (uint256) {
    // The round is advanced when that round's end date is reached or that round's sale cap is reached, which ever comes first. 

    // Determine what round we could be in based on the current date.
    uint roundBasedOnTime;
    if (now < roundTwoStartDate) {
      roundBasedOnTime = 1;
    }
    else if (now < roundTwoStartDate) {
      roundBasedOnTime = 2;
    }
    else if (now < roundThreeStartDate) {
      roundBasedOnTime = 3;
    }
    else {
      roundBasedOnTime = 4;
    }

    // Determine what round we are based on how close we are to reaching the cap.
    uint percentWeiRaised = weiRaised / cap * 100;
    uint roundBasedOnWeiRaised;
    // If we have sold less than 20 percent of the cap we are in round one.
    if (percentWeiRaised <= 20) {
      roundBasedOnWeiRaised = 1;
    }
    // If we have sold less than 30 percent of the cap we are in round two.
    else if (percentWeiRaised <= 30) {
      roundBasedOnWeiRaised = 2;
    }
    // If we have sold less than 40 percent of the cap we are in round three.
    else if (percentWeiRaised <= 40) {
      roundBasedOnWeiRaised = 3;
    }
    // If more than 40 percent of the cap is sold we are in round four.
    else {
      roundBasedOnWeiRaised = 4;
    }

    uint round;
    // The acutal round is the later of the two possible rounds.
    if (roundBasedOnWeiRaised > roundBasedOnTime) {
      round = roundBasedOnWeiRaised;
    } else {
      round = roundBasedOnTime;
    }

    return round;
  }

  function getBonus(uint round) public pure returns (uint) {
    // Determine the bonus given to early rounds.
    uint bonus;
    // If this is round one then you get a 30% bonus.
    if (round == 1) {
      bonus = 30;
    }
    // If this is round two then you get a 20% bonus.
    else if (round == 2) {
      bonus = 20;
    }
    // If this is round three then you get a 10% bonus.
    else if (round == 3) {
      bonus = 10;
    }
    // Round 4 tokens are sold at the normal rate.
    else {
      bonus = 0;
    }
  }

  function capReached() public view returns (bool) {
    return weiRaised >= cap;
  }

  function withdraw() onlyFounders public  {
    uint amountToSend = address(this).balance / 3;
    founderOne.transfer(amountToSend);
    founderTwo.transfer(amountToSend);
    founderThree.transfer(amountToSend);
  }

  function finalize() onlyFounders public {
    require(!isFinalized);
    require(hasClosed());

    finalization();
    emit Finalized();

    isFinalized = true;
  }

  function finalization() internal {

    // The total supply will be all tokens minted so far plus another 55% to be divided amoung founders, partners, and operations.
    uint totalSupply = rozetToken.totalSupply();
    totalSupply = totalSupply * 55 / 100;

    // Allocate 10% of the total supply to founders, locked for one year. 
    founderAllocation = totalSupply * 10 / 100;
    rozetToken.mint(rozetTimelock, founderAllocation);

    // Allocate 3% of tokens to partner one. 
    rozetToken.mint(partnerOne, (totalSupply * 3 / 100));

    // Allocate 2% of tokens to partner two. 
    rozetToken.mint(partnerTwo, (totalSupply * 2 / 100));

    // Allocate 40% of tokens for future work.
    rozetToken.mint(operations, (totalSupply * 40 / 100));
  }

 
}