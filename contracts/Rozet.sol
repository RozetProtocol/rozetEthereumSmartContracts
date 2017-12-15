pragma solidity ^0.4.15;

import "../contracts/BadgeLibrary.sol";
import "../contracts/RozetToken.sol";

contract Rozet {

  event DebugOutput(string a, address b, address c, uint d);
  //DebugOutput("Words here.", msg.sender, _owner, 0);

  using BadgeLibrary for BadgeLibrary.Badge;

  uint256 authenticationPrice = 20;

  // A profile is a list of Badge objects. This is a mapping of all profiles.
  mapping (address => BadgeLibrary.Badge[]) public profiles;
  // A DNS to convert profiles address to names and visa versa.
  mapping (address => bytes32) public profileNames;
  mapping (bytes32 => address) public profileAddresses;
  // Map from addresses that created authenticated Badges to the addresses
  // that own those badges.
  mapping (address => address) public createdAuthenticatedBadgeFor;
  mapping (address => bool) public hasReputation;

  function getAuthenticationPrice() public constant returns (uint256 price) {
    return authenticationPrice;
  }

  // Register the provided name with the caller's address.
  function register(bytes32 name) public returns (bool sucess) {
    if(profileNames[msg.sender] == 0 && name != "") {
        profileNames[msg.sender] = name;
        profileAddresses[name] = msg.sender;
        return true;
    }
    return false;
  }

  // Remove the callers name from Rozet.
  function unregister(bytes32 name) public {
    if(profileNames[msg.sender] != 0 && name != ""){
      profileAddresses[name] = 0x0000000000000000000000000000000000000000;
      profileNames[msg.sender] = "";
    }
  }

  // Get the name associated with the caller's address.
  function getName() constant public returns (bytes32 name) {
    return profileNames[msg.sender];
  }

  // Get the name associated with the address.
  function getNameOf(address _address) constant public returns (bytes32 name) {
    return profileNames[_address];
  }

  // Get the address associated with the given name.
  function getAddress(bytes32 name) constant public returns (address _address) {
    return profileAddresses[name];
  }

  // Create a new badge and assign it to owner.
  function issueBadge(bytes32 _data, address _owner,
  address _addressToPay) public {

    BadgeLibrary.Badge memory badge;
    badge.maker = msg.sender;
    badge.owner = _owner;
    badge.data = _data;
    badge.isAuthenticated = false;
    badge.addressToPay = _addressToPay;

    profiles[_owner].push(badge);

  }

  function authenticateBadge(address addressOfRozetToken, address _owner,
  uint _index) public {

    // Ensure that the badge exists and that only its true owner is
    // authenticating it.
    if (_index >= 0 && _index < profiles[_owner].length &&
    msg.sender == _owner) {

      BadgeLibrary.Badge memory badge = profiles[_owner][_index];

      bool doesRequirePayment = hasReputation[_owner];
      bool paymentWasMade = false;
      if (doesRequirePayment) {

        // If the addressToPay has made an authenticated badge for _owner.
        if (createdAuthenticatedBadgeFor[badge.addressToPay] == _owner) {

          // Cast the address of the RozetToken instance to a local pointer.
          RozetToken rozetToken = RozetToken(addressOfRozetToken);

          // If transfer was sucessfull.
          if (rozetToken.transferFrom(badge.maker, badge.addressToPay,
          authenticationPrice) ) {
            paymentWasMade = true;
          }
        }
      }

      if((doesRequirePayment && paymentWasMade) ||
      doesRequirePayment == false) {
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

  function isBadgeAuthenticated(address _owner, uint _index) public constant
  returns (bool isAuthenticated) {
      return profiles[_owner][_index].isAuthenticated;
  }

  // Get the badge of owner that lives at index.
  function getBadge(address _owner, uint _index) constant public returns
  (bytes32 data, address maker, address owner) {

    BadgeLibrary.Badge[] storage callersProfile = profiles[_owner];
    BadgeLibrary.Badge memory badge;

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

  function getBadgesFrom(address _owner) constant public returns
  (bytes32[], address[], address[]) {
    BadgeLibrary.Badge[] memory callersProfile = profiles[_owner];
    uint length = callersProfile.length;

    bytes32[] memory dataArray = new bytes32[](length);
    address[] memory makersArray = new address[](length);
    address[] memory ownersArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      BadgeLibrary.Badge memory badge =  callersProfile[i];
      dataArray[i] = badge.data;
      makersArray[i] = badge.maker;
      ownersArray[i] = badge.owner;
    }

    return (dataArray, makersArray, ownersArray);
  }

  function getBadges() constant public returns
  (bytes32[], address[], bytes32[], address[]) {
    BadgeLibrary.Badge[] memory callersProfile = profiles[msg.sender];
    uint length = callersProfile.length;

    bytes32[] memory dataArray = new bytes32[](length);
    address[] memory makersAddressArray = new address[](length);
    bytes32[] memory makersNameArray = new bytes32[](length);
    address[] memory ownersArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      BadgeLibrary.Badge memory badge =  callersProfile[i];
      dataArray[i] = badge.data;
      makersAddressArray[i] = badge.maker;
      makersNameArray[i] = getNameOf(badge.maker);
      ownersArray[i] = badge.owner;
    }

    return (dataArray, makersAddressArray, makersNameArray, ownersArray);
  }

  function getNumberOfBadges(address _owner) constant public returns
  (uint number) {
    return profiles[_owner].length;
  }
}
