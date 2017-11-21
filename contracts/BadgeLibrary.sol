pragma solidity ^0.4.15;

/* This is a library, which means it has no account and no ether and
 uses no gas and no memory. The "storage" keyword indicates that the paramater
uses the callers storage as memory. See:
https://blog.aragon.one/library-driven-development-in-solidity-2bebcaf88736
*/

library BadgeLibrary {

  struct Badge {
    bytes32 data;
    address maker;
    address owner;
    bool isAuthenticated;
    address addressToPay;
  }
}
