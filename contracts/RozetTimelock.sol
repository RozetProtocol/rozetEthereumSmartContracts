pragma solidity ^ 0.4.24;
import "./RozetToken.sol";

contract RozetTimelock {

  RozetToken public rozetToken;

  address public founderOne;
  address public founderTwo;
  address public founderThree;

  uint public founderOneAllocation;
  uint public founderTwoAllocation;
  uint public founderThreeAllocation;

  uint256 public releaseTime;

  constructor(RozetToken _token, address _founderOne, address _founderTwo, address _founderThree, uint256 _releaseTime) public {
    require(_releaseTime > now);
    rozetToken = _token;
    founderOne = _founderOne;
    founderTwo = _founderTwo;
    founderThree = _founderThree;
    releaseTime = _releaseTime;
  }

  function release() public {
    //require(msg.sender == founderOne || msg.sender == founderTwo || msg.sender == founderThree);
    //require(now >= releaseTime);
    uint indivualAllocation = rozetToken.balanceOf(this) / 3;
    require(indivualAllocation > 0);
    rozetToken.transfer(founderOne, indivualAllocation);
    rozetToken.transfer(founderTwo, indivualAllocation);
    rozetToken.transfer(founderThree, indivualAllocation);
  }
}
