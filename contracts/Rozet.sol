


pragma solidity ^ 0.4.24;

import "./RozetToken.sol";

contract Rozet {

  // "0xcea271df25a47087252da2fe9b7d6d9152f0c98a"
  RozetToken public rozetToken;

  struct Badge {
    string senderData;
    string recipientData;
    // A sponsor is a user who pays a roz fee (to prevent spam and establish trust) on behalf of the sender.
    address sponsor;
    // A sender can be their own sponsor. A sender is the initiating party. I.e. the sender is vouching for the recepient in some way.
    address sender;
    // The recipient contributes their data to the badge in response to receiving it from the sender.
    address recipient;
    // The two bools recipientSigned and senderSigned are true when the sender or recipient have approved the message in this badge.
    bool recipientSigned;
    bool senderSigned;
    // In the event that sponsors issue a badge to a user they must pay one of the beneficiaries on one of the users received badges.
    address beneficiary;
    uint timeIssued;

  }

  Badge[] public allBadges;

  event BadgeIssued(address sponsor, address recipient, uint id, string senderData);
  event BadgeReceived(address receipient, uint id, string recipientData);

  // A profile is a list of a user's Badges.
  mapping(address => uint[]) public usersBadges;
  // This is a list of all the most recently sent badges from given address.
  mapping(address => uint[]) public issuedBadges;
  // This is a list of all the most recently received badges by a given address. This is used for determining stake tier.
  mapping(address => uint[]) public receivedBadges;
  // Mapping from recipient to that recipient's received sonsors. I.e. given a user and a sponsor you can tell if they receieved a badge from that sponsor.
  mapping(address => mapping(address => bool)) public receivedSponsors;
  // This is the same as receivedSponsors, but is iterable off-chain.
  mapping(address => address[]) public receivedSponsorsIterable;

  // Profile data is useful for universal login. Also some encrypted fields can be used to auto-fill common form data fields.
  struct Profile {
    address owner;
    string country;
    string url;
    string banner;
    string bio;
    // Additional fields can be used for applicaion specific data or private encrypted variables.
    string data1;
    string data2;
  }

  // DNS needs a two way mapping otherwise different addresses can claim the same name.
  mapping(address => bytes32) public addressToName;
  mapping(bytes32 => address) public nameToAddress;

  // Trusted sponsors can be chosen by a user if they want to allow a sponsor to issue badges on their behalf without the need to sign each request.
  uint constant public numberOfTrustedSponsors = 1000;
  mapping(address => address[numberOfTrustedSponsors]) public trustedSponsors;

  /*
    A sponsor can issue a badge on a sender's behalf. This benifits the sender since they can issue badges
    without the need for a node or connection to a node (metamask), however the tradeoff is that the sponsor must be trusted.
    updateTrustedSponsor allows a user to retroactivly mark a sponsor as trusted or not. This will aid reputation algorithms when assessing
    the verasity of a badge issued by a sponsor. Note that a sender also has the option of signing a badge offline, this avoids gas fees,
    but still requires the use of metamask or some other signing software.
  */
  function setTrustedSponsor(address sponsor, uint index) public {
    require(index < numberOfTrustedSponsors && index >= 0);
    trustedSponsors[msg.sender][index] = sponsor;
  }

  function getTrustedSponsors(address user) public view returns (address[numberOfTrustedSponsors]) {
    return trustedSponsors[user];
  }

  function getNameFromAddress(address _address) public view returns (bytes32) {
    return addressToName[_address];
  }

  function getAddressFromName(bytes32 _name) public view returns (address) {
    return nameToAddress[_name];
  }

  function getDNSFee() public view returns (uint) {
    return uint(rozetToken.badgePrice()) * 100;
  }

  function setName(bytes32 DNSName) public {
    // Require that the name has not already been taken. Note this require makes names unchangeable.
    require(nameToAddress[DNSName] == 0x0000000000000000000000000000000000000000);
    // The DNS requires a roz fee to prevent squaters from stealing all the names.
    uint rozFee = getDNSFee();
    // Give the rozFee to a semi-random voter as a reward for voting.
    address[] memory voters = rozetToken.getVoters();
    uint index = uint(blockhash(block.number - 1)) % (voters.length);
    address voter = voters[index];

    require(rozetToken.transferFrom(msg.sender, voter, rozFee));
    addressToName[msg.sender] = DNSName;
    nameToAddress[DNSName] = msg.sender;
  }

  mapping(address => Profile) public addressToProfile;

  constructor(address _addressOfRozetToken) public {
    rozetToken = RozetToken(_addressOfRozetToken);
  }

  function hasEnoughStakeToIssue(address user) public view returns (bool) {
    return hasEnoughStake(user, issuedBadges[user]);
  }

  function hasEnoughStakeToReceive(address user) public view returns (bool) {
    return hasEnoughStake(user, receivedBadges[user]);
  }

  function tierTwoRequirement() public view returns (uint) {
    return rozetToken.stakeRequirement();
  }

  function tierThreeRequirement() public view returns (uint) {
    return rozetToken.stakeRequirement() * 10;
  }

  function tierFourRequirement() public view returns (uint) {
    return rozetToken.stakeRequirement() * 100;
  }

  function hasEnoughStake(address user, uint[] badges) internal view returns (bool) {
    // The subs in this function do not need SafeMath due to their own checks.
    // Tier 1. Tier 1 is the free tier. Users are eligible for the free tier for up to five actions per day.
    bool userHasEnoughStake = true;
    uint numberOfBadges = badges.length;
    uint stakeAmount = rozetToken.amountStakedFor(user);
    // Tier 2 staking is required for 6 - 99 actions per day.
    if (numberOfBadges >= 5 && numberOfBadges < 100) {
      uint fifthBadgeId = badges[numberOfBadges - 5];
      if(allBadges[fifthBadgeId].timeIssued > now - 1 days) {
        userHasEnoughStake = stakeAmount >= rozetToken.stakeRequirement();
      }
    }
    // Tier 3 staking is required required for 100 - 999 actions per day. .
    else if (numberOfBadges >= 100 && numberOfBadges < 1000) {
      uint oneHundrethBadgeId = badges[numberOfBadges - 100];
      if (allBadges[oneHundrethBadgeId].timeIssued > now - 1 days) {
        userHasEnoughStake = stakeAmount >= tierThreeRequirement();
      }
    }
    // Tier 4 staking is required for 1,000 or more actions per day.
    else if (numberOfBadges >= 1000) {
      uint oneThousandthBadgeId = badges[numberOfBadges - 1000];
      if (allBadges[oneThousandthBadgeId].timeIssued > now - 1 days) {
        userHasEnoughStake = stakeAmount >= tierFourRequirement();
      }
    }
    return userHasEnoughStake;
  }

  function getValidBeneficiaries(address profile) public view returns (address[]) {
    return receivedSponsorsIterable[profile];
  }

  function setProfile(string _country, string _url, string _banner, string _bio, string _data1, string _data2) public {
    Profile memory profile;
    profile.owner = msg.sender;
    profile.country = _country;
    profile.url = _url;
    profile.banner = _banner;
    profile.bio = _bio;
    profile.data1 = _data1;
    profile.data2 = _data2;
    addressToProfile[msg.sender] = profile;
  }

  function getProfile(address user) public constant returns (string country, string url, string banner, string bio, string data1, string data2) {
    Profile memory profile = addressToProfile[user];
    country = profile.country;
    url = profile.url;
    banner = profile.banner;
    bio = profile.bio;
    data1 = profile.data1;
    data2 = profile.data2;
  }

  // 28, "0x0f9e203a402e5a21a61d1645b1732fd398a0d95c2a40cd122146a5c29f73c8cc", "0x3c1ef446e010531d7de22e71cd8190e6fd09ff56d1578b5f3e99c6b7f9810a5f", "0xf06162929767f6a7779af9339687023cf2351fc5", "0xf06162929767f6a7779af9339687023cf2351fc5", "0xb576B32e578cd3bEFDc677FcbaF12Ee76143e581", "Avengers is 5 stars."
  // This function allows anyone to send badges to anyone else without paying for gas.
  function issueBadgeFromSignature(uint8 v, bytes32 r, bytes32 s, address sender, address recipient, address beneficiary,  string data) public returns (uint) {

    // Make sure that the sender did, in fact, sign the command to issue a badge.
    bytes32 messageA = keccak256(abi.encodePacked("address Sender", "address Recipient", "address Address to Pay", "string Data"));
    bytes32 messageB = keccak256(abi.encodePacked(sender, recipient, beneficiary,  data));
    bytes32 message = keccak256(abi.encodePacked(messageA, messageB));
    require(ecrecover(message, v, r, s) == sender);

    Badge memory badge;
    badge.senderData = data;
    badge.sponsor = msg.sender;
    badge.sender = sender;
    badge.recipient = recipient;

    /*
      Paying Roz as a fee. In this case the sponsor must pay a small Roz fee to the beneficiary. The beneficiary must be a sponsor
      of one of the recipients previous badges. This option also affords the sponsor the opportunity to earn more Roz in the future
      since they now become a sponsor of one of the recipient's previous badges, and can earn Roz each time the recipient receives a new badge.
    */
    badge.beneficiary = beneficiary;

    /*
       True means that the sender has cryptographicly approved the data in badge.senderData.
       False means that the sponsor has writen to badge.senderData on behalf of the sender, and the sender has yet to approve.
       In the case that the sender has signed the message themselves, then senderSigned is always true.
    */
    badge.senderSigned = true;

    uint id = allBadges.push(badge) - 1;

    usersBadges[recipient].push(id);

    emit BadgeIssued(badge.sponsor, recipient, id, data);

    return id;
  }

  // "0xf06162929767F6a7779af9339687023cf2351fc5", "0xf06162929767F6a7779af9339687023cf2351fc5", "0xf06162929767F6a7779af9339687023cf2351fc5", "test badge data"
  // Create a new badge and assign it to recipient.
  function issueBadge(address _sender, address _recipient, address _beneficiary, string _data) public returns(uint id) {

    // Non-receivable badges (i.e. badges with no beneficiary) do not require stake to issue.
    if (_beneficiary != 0x0000000000000000000000000000000000000000) {
      require(hasEnoughStakeToIssue(msg.sender), "User does not have enough stake to issue.");
    }

    Badge memory badge;
    badge.senderData = _data;
    badge.sponsor = msg.sender;
    badge.sender = _sender;
    badge.recipient = _recipient;
    badge.beneficiary = _beneficiary;
    badge.timeIssued = now;

    if (msg.sender == _sender) {
      badge.senderSigned = true;
    }

    id = allBadges.push(badge) - 1;
    usersBadges[_recipient].push(id);
    issuedBadges[msg.sender].push(id);
    emit BadgeIssued(badge.sponsor, _recipient, id, _data);

    return id;
  }

  function receiveBadge(uint badgeId, string _recipientData) public {

    Badge memory badge = allBadges[badgeId];

    // Ensure that the badge exists and that only its true recipient is recieving it, and that it has not already been received.
    require(badge.recipient == msg.sender && badge.recipientSigned == false);

    // Receiving a badge free for the first badge, but requires payment thereafter.
    bool doesRequirePayment = receivedBadges[msg.sender].length > 0;

    bool paymentWasMade = false;

    if (doesRequirePayment) {
      require(hasEnoughStakeToReceive(msg.sender), "User does not have enough stake to receive.");
      // To receive payment the beneficiary must have sponsored one of the recipients previously received badges.
      require(receivedSponsors[badge.recipient][badge.beneficiary] == true);
      uint price = uint(rozetToken.badgePrice());
      paymentWasMade = rozetToken.transferFrom(badge.sponsor, badge.beneficiary, price);
    }

    if ((doesRequirePayment && paymentWasMade) || doesRequirePayment == false) {
      badge.recipientSigned = true;
      badge.recipientData = _recipientData;
      // Have a mapping so that users can pass address of beneficiaries instead of an index. (useful if they always pay themselves since they can avoid a loop)
      receivedSponsors[badge.recipient][badge.sponsor] = true;
      // This has the same info as the above datastructure, but is itterable off-chain.
      receivedSponsorsIterable[badge.recipient].push(badge.sponsor);

      // We need an array as well so that sponsors can itterate over the valid beneficiries, which cant be done with a mapping.
      receivedBadges[msg.sender].push(badgeId);
      allBadges[badgeId] = badge;
      emit BadgeReceived(msg.sender, badgeId, _recipientData);
    }
  }

  function getBadgeById(uint id) public constant returns (string senderData, string recipientData, address sponsor, address sender,
    address recipient, bool recipientSigned, bool senderSigned, address beneficiary, uint timeIssued) {
    Badge memory badge = allBadges[id];

    senderData = badge.senderData;
    recipientData = badge.recipientData;
    sponsor = badge.sponsor;
    sender = badge.sender;
    recipient = badge.recipient;
    recipientSigned = badge.recipientSigned;
    senderSigned = badge.senderSigned;
    beneficiary = badge.beneficiary;
    timeIssued = badge.timeIssued;

  }

  function badgesOf(address user) public view returns(uint[]) {
    return usersBadges[user];
  }


}
