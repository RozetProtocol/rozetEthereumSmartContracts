pragma solidity ^0.4.19;

import "./StandardToken.sol";

contract RozetToken is StandardToken {

  string public constant name = "Rozet"; 
  string public constant symbol = "ROZ"; 
  uint8 public constant decimals = 18; 
  uint256 public constant INITIAL_SUPPLY = 10000 * (10 ** uint256(decimals));

  function RozetToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    //Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }
}
