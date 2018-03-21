pragma solidity ^0.4.19;

import "./RozetToken.sol";

contract Rozet {

  address addressOfRozetToken;

  event BadgeIssued(address maker, address owner, uint id, bytes32 tag1, bytes32 tag2, bytes32 tag3, string data);

  uint256 authenticationPrice = 20;

  struct Badge {
    string data;
    bytes32 tag1;
    bytes32 tag2;
    bytes32 tag3;
    address maker;
    address owner;
    bool isAuthenticated;
    address addressToPay;
    uint id;
  }

  function Rozet(address _addressOfRozetToken) public {
    addressOfRozetToken = _addressOfRozetToken;
  }

  // A profile is a list of Badge objects. This is a mapping of all profiles.
  mapping (address => Badge[]) public profiles;
  
  Badge[] allBadges;
  mapping (address => address) public createdAuthenticatedBadgeFor;
  mapping (address => bool) public hasReputation;

  function getAuthenticationPrice() public constant returns (uint256 price) {
    return authenticationPrice;
  }

  // "data", "0x353240323c1845c9475e37394d3704ea1b805f05", "tag1", "tag2", "tag3", "0x353240323c1845c9475e37394d3704ea1b805f05"
  // Create a new badge and assign it to owner.
  function issueBadge(string _data, address _owner, bytes32 _tag1, bytes32 _tag2, bytes32 _tag3, address _addressToPay) public returns (uint id) {

    Badge memory badge;
    badge.data = _data;
    badge.tag1 = _tag1;
    badge.tag2 = _tag2;
    badge.tag3 = _tag3;
    badge.maker = msg.sender;
    badge.owner = _owner;
    badge.isAuthenticated = false;
    badge.addressToPay = _addressToPay;

    profiles[_owner].push(badge);

    id = allBadges.push(badge);
    badge.id = id;

    BadgeIssued(badge.maker, _owner, id, _tag1, _tag2, _tag3, _data);

    return id;

  }

  function authenticateBadge(address _owner, uint _index) public {

    // Ensure that the badge exists and that only its true owner is authenticating it.
    if (_index >= 0 && _index < profiles[_owner].length && msg.sender == _owner) {

      Badge memory badge = profiles[_owner][_index];

      bool doesRequirePayment = hasReputation[_owner];
      bool paymentWasMade = false;
      if (doesRequirePayment) {

        // If the addressToPay has made an authenticated badge for _owner.
        if (createdAuthenticatedBadgeFor[badge.addressToPay] == _owner) {

          // Cast the address of the RozetToken instance to a local pointer.
          RozetToken rozetToken = RozetToken(addressOfRozetToken);

          // If transfer was sucessfull.
          if (rozetToken.transferFrom(badge.maker, badge.addressToPay, authenticationPrice) ) {
            paymentWasMade = true;
          }
        }
      }

      if((doesRequirePayment && paymentWasMade) || doesRequirePayment == false) {
        badge.isAuthenticated = true;
        profiles[_owner][_index] = badge;
        hasReputation[_owner] = true;

        createdAuthenticatedBadgeFor[badge.maker] = _owner;
      }
    }
    else {
      // This will only execute if the badge in question does not exist or
      // a third party is trying to authentiate someone else's badge.
    }
  }

  function isBadgeAuthenticated(address _owner, uint _index) public constant returns (bool isAuthenticated) {
      return profiles[_owner][_index].isAuthenticated;
  }

  function getBadgeByID(uint id) constant public returns (string, address, address) {
    return (allBadges[id].data, allBadges[id].maker, allBadges[id].owner);
  }

  // Get the badge of owner that lives at index.
  function getBadge(address _owner, uint _index) constant public returns (string data, address maker, address owner) {

    Badge[] storage callersProfile = profiles[_owner];
    Badge memory badge;

    if (_index < 0 || _index >= callersProfile.length) {
      badge.data = "Badge does not exist.";
      badge.maker = 0x0000000000000000000000000000000000000000;
      badge.owner = 0x0000000000000000000000000000000000000000;
    }
    else {
      badge =  callersProfile[_index];
    }

    return (badge.data, badge.maker, badge.owner);
  }

  function getBadgesFrom(address _owner) constant public returns (uint[], address[], address[]) {
    Badge[] memory callersProfile = profiles[_owner];
    uint length = callersProfile.length;

    uint[] memory idArray = new uint[](length);
    address[] memory makersArray = new address[](length);
    address[] memory ownersArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      Badge memory badge =  callersProfile[i];
      idArray[i] = badge.id;
      makersArray[i] = badge.maker;
      ownersArray[i] = badge.owner;
    }

    return (idArray, makersArray, ownersArray);
  }

  function getBadges() constant public returns (uint[], address[], address[]) {
    Badge[] memory callersProfile = profiles[msg.sender];
    uint length = callersProfile.length;

    uint[] memory idArray = new uint[](length);
    address[] memory makersAddressArray = new address[](length);
    address[] memory ownersArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      Badge memory badge =  callersProfile[i];
      idArray[i] = badge.id;
      makersAddressArray[i] = badge.maker;
      ownersArray[i] = badge.owner;
    }

    return (idArray, makersAddressArray, ownersArray);
  }

  function getNumberOfBadges(address _owner) constant public returns (uint number) {
    return profiles[_owner].length;
  }
}
