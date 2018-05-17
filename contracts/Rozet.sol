pragma solidity ^ 0.4.19;

import "./RozetToken.sol";

contract Rozet {

  RozetToken public rozetToken;

  event BadgeIssued(address maker, address recipient, uint id, bytes32 tag1, bytes32 tag2, bytes32 tag3, string data);

  struct Badge {
    string data;
    bytes32 tag1;
    bytes32 tag2;
    bytes32 tag3;
    address maker;
    // TODO what is the point of having sender? how can sender make roz? 
    address sender; 
    address recipient; 
    bool isAuthenticated;
    address addressToPay;
    uint id;
  }

  // A profile is a list of Badge objects. This is a mapping of all profiles.
  mapping(address => Badge[]) public profiles;

  Badge[] allBadges;
  mapping(address => address) public createdAuthenticatedBadgeFor;
  mapping(address => bool) public hasReputation;

  constructor(address _addressOfRozetToken) public {
    rozetToken = RozetToken(_addressOfRozetToken);
   // addressOfRozetToken = _addressOfRozetToken;
    // dateBadgePriceCanBeUpdated = now;
  }

// TODO add code off-chain to protect against replay attacks
  function verify(uint8 v, bytes32 r, bytes32 s, bytes32 request) public pure returns (address) {
      bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    //  request = "This message's length: 32 bytes.";
      bytes32 hash = keccak256(prefix, request);
      return ecrecover(hash, v, r, s);
  }


  // "data", "0x353240323c1845c9475e37394d3704ea1b805f05", "tag1", "tag2", "tag3", "0x353240323c1845c9475e37394d3704ea1b805f05"
  // Create a new badge and assign it to recipient.
  function issueBadge(string _data, address _recipient, address _sender, bytes32 _tag1, bytes32 _tag2, bytes32 _tag3, address _addressToPay) public returns(uint id) {

    Badge memory badge;
    badge.data = _data;
    badge.tag1 = _tag1;
    badge.tag2 = _tag2;
    badge.tag3 = _tag3;
    badge.maker = msg.sender;
    badge.sender = _sender;
    badge.recipient = _recipient;
    badge.isAuthenticated = false;
    badge.addressToPay = _addressToPay;

    profiles[_recipient].push(badge);

    id = allBadges.push(badge);
    badge.id = id;

    emit BadgeIssued(badge.maker, _recipient, id, _tag1, _tag2, _tag3, _data);

    return id;
  }

  function authenticateBadge(address _recipient, uint _index) public {

    // Ensure that the badge exists and that only its true recipient is authenticating it.
    if (_index >= 0 && _index < profiles[_recipient].length && msg.sender == _recipient) {

      Badge memory badge = profiles[_recipient][_index];

      bool doesRequirePayment = hasReputation[_recipient];
      bool paymentWasMade = false;
      
      if (doesRequirePayment) {

        // If the addressToPay has made an authenticated badge for _recipient.
        if (createdAuthenticatedBadgeFor[badge.addressToPay] == _recipient) {

          // TODO move this to constructor
          // Cast the address of the RozetToken instance to a local pointer.
           // RozetToken rozetToken = RozetToken(addressOfRozetToken);

          // If transfer was sucessfull.
          if (rozetToken.transferFrom(badge.maker, badge.addressToPay, uint(rozetToken.badgePrice()))) {
            paymentWasMade = true;
          }
        }
      }

      if ((doesRequirePayment && paymentWasMade) || doesRequirePayment == false) {
        badge.isAuthenticated = true;
        profiles[_recipient][_index] = badge;
        hasReputation[_recipient] = true;

        createdAuthenticatedBadgeFor[badge.maker] = _recipient;
      }
    }
  }

  function isBadgeAuthenticated(address _recipient, uint _index) public constant returns(bool isAuthenticated) {
    return profiles[_recipient][_index].isAuthenticated;
  }

  // TODO add rest of badge fields to this
  function getBadgeByID(uint id) public constant returns(string, address, address) {
    return (allBadges[id].data, allBadges[id].maker, allBadges[id].recipient);
  }

  // Get the badge of recipient that lives at index.
  function getBadge(address _recipient, uint _index) public constant returns(string data, address maker, address recipient) {

    Badge[] storage callersProfile = profiles[_recipient];
    Badge memory badge;

    if (_index < 0 || _index >= callersProfile.length) {
      badge.data = "Badge does not exist.";
      badge.maker = 0x0000000000000000000000000000000000000000;
      badge.recipient = 0x0000000000000000000000000000000000000000;
    } else {
      badge = callersProfile[_index];
    }

    return (badge.data, badge.maker, badge.recipient);
  }

  function getBadgesFrom(address _recipient) public constant returns(uint[], address[], address[]) {
    Badge[] memory callersProfile = profiles[_recipient];
    uint length = callersProfile.length;

    uint[] memory idArray = new uint[](length);
    address[] memory makersArray = new address[](length);
    address[] memory recipientsArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      Badge memory badge = callersProfile[i];
      idArray[i] = badge.id;
      makersArray[i] = badge.maker;
      recipientsArray[i] = badge.recipient;
    }

    return (idArray, makersArray, recipientsArray);
  }

  function getBadges() public constant returns(uint[], address[], address[]) {
    Badge[] memory callersProfile = profiles[msg.sender];
    uint length = callersProfile.length;

    uint[] memory idArray = new uint[](length);
    address[] memory makersAddressArray = new address[](length);
    address[] memory recipientsArray = new address[](length);

    for (uint i = 0; i < callersProfile.length; i++) {
      Badge memory badge = callersProfile[i];
      idArray[i] = badge.id;
      makersAddressArray[i] = badge.maker;
      recipientsArray[i] = badge.recipient;
    }

    return (idArray, makersAddressArray, recipientsArray);
  }

  function getNumberOfBadges(address _recipient) public constant returns(uint number) {
    return profiles[_recipient].length;
  }
}