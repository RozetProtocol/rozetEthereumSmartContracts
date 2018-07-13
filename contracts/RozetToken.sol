pragma solidity ^ 0.4.24;

import "./SafeMath.sol";

contract RozetToken {

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Burn(address indexed burner, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event MintFinished();
    address public owner;

    bool public mintingFinished = false;

    using SafeMath for uint256;

    string public name = "Rozet";
    string public symbol = "ROZ";
    uint8 public decimals = 18;

    // This is the equivilant of 240 million Roz with 18 decimals or 240000000 * (10 ** uint256(decimals))
    // uint256 public constant INITIAL_SUPPLY = 2.4e8 ether;
    uint256 totalSupply_;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) internal allowed;

    // Any voter in this array is eligible for roz rewards.
    address[] public voters;
    mapping(address => bool) public didVote;
    mapping(address => uint[]) public stakesOfUser;
    mapping(address => uint) public amountStakedFor;

    uint public totalBadgePriceVote;
    uint public totalBadgePriceVoteAmount;
    int public badgePrice;

    uint public totalStakeRequirementVote;
    uint public totalStakeRequirementVoteAmount;
    uint public stakeRequirement;
    uint constant public stakeTime = 3 days;

    Stake[] public allStakes;

    struct Stake {
      address holder;
      address beneficiary;
      uint amount;
      uint timeStaked;
      bool isReleased;
      uint badgeVote;
      uint stakeVote;
    }

    /*
      This hard limit on votes can not be circumvented by creating multiple accounts since each account is tied to a reputation.
      Votes cast by accounts with no reputation will be ignored by reputation algorithms.
    */
    uint constant public numberOfVotesForSuperUsers = 100;
    // Super users are useful for thrid party Badge analysis algorithms.
    mapping(address => address[numberOfVotesForSuperUsers]) public votesForSuperUsers;

    /*
      Reputation algorithms consider the users stake at the time of evealuation when counting votes for super users.
      This is function allows a user to add or remove a vote by adding an address to one of one hundred address votes.
    */
    function voteForSuperUser(address vote, uint index) public {
      require(index < numberOfVotesForSuperUsers && index >= 0);
      votesForSuperUsers[msg.sender][index] = vote;
    }

    function getVotesForSuperUsers(address user) public view returns (address[100]) {
      return votesForSuperUsers[user];
    }

    constructor() public {
        // The RozetGeneration contract will create this RozetToken contract and thus will be the only one able to mint tokens.
        owner = msg.sender;
        // The defulat badge price and stake requirements will be updated via token holder's voting.
        badgePrice = 1 ether; // 1 roz
        stakeRequirement = 10 ether; //10 roz
        voters.push(msg.sender);

    }

    function stakeTokens(address _beneficiary, uint amount, uint badgeVote, uint stakeVote) public {

      require(amount > 0);
      require(_beneficiary != address(0));
      require(amount <= balances[msg.sender]);

      // SafeMath.sub will throw if there is not enough balance.
      balances[msg.sender] = balances[msg.sender].sub(amount);
      balances[this] = balances[this].add(amount);
      emit Transfer(msg.sender, this, amount);

      Stake memory stake;
      stake.holder = msg.sender;
      stake.beneficiary = _beneficiary;
      stake.amount = amount;
      amountStakedFor[_beneficiary] = amountStakedFor[_beneficiary].add(amount);
      stake.timeStaked = now;
      stake.isReleased = false;
      stake.badgeVote = badgeVote;
      stake.stakeVote = stakeVote;
      uint id = allStakes.push(stake) - 1;
      stakesOfUser[msg.sender].push(id);

      // Stake holder may vote when staking.
      if (badgeVote > 0 && stakeVote > 0) {
        /*
          If this is the users first time voting add them to the array of address eligible to receive rewards.
          Reputation algorithms can easily detect a Sybil attack and lower the attacker's reputation if it occurs.
        */
        if(didVote[msg.sender] == false) {
          voters.push(msg.sender);
          didVote[msg.sender] = true;
        }

        /*
          The final value after voting is the sum of the vote * amounts for each stake divided by the total stake of all voters.
          E.g. Only two voters exist. VoterOne have a vote of 20  and voterTwo has a vote of 10.
          So the final value after voting will be:
          (voterOne's vote * voterOne's stake + voterTwo's vote * voterTwo's stake) / (voterOne's stake + voterTwo's stake) ->
          (15 * 20 + 5 * 10) / (15 + 5) = 17.5
        */

        // Factor the vote into the Badge Price.
        totalBadgePriceVote = totalBadgePriceVote.add(badgeVote.mul(stake.amount));
        totalBadgePriceVoteAmount = totalBadgePriceVoteAmount.add(stake.amount);
        badgePrice = int(totalBadgePriceVote.div(totalBadgePriceVoteAmount));

        // Factor the vote into the Stake Requirement.
        totalStakeRequirementVote = totalStakeRequirementVote.add(stakeVote.mul(stake.amount));
        totalStakeRequirementVoteAmount = totalStakeRequirementVoteAmount.add(stake.amount);
        stakeRequirement = totalStakeRequirementVote.div(totalStakeRequirementVoteAmount);
      }

    }

    function stakesOf(address lender) public view returns(uint256[]) {
        return stakesOfUser[lender];
    }

    function getStakeById(uint id) public constant returns (address holder, address beneficiary, uint amount,
      uint timeStaked, bool isReleased) {
        Stake memory stake = allStakes[id];
        holder = stake.holder;
        beneficiary = stake.beneficiary;
        amount = stake.amount;
        timeStaked = stake.timeStaked;
        isReleased = stake.isReleased;
    }

    function releaseStakedTokens(uint id) public {
      Stake memory stake = allStakes[id];
      require(stake.holder == msg.sender, "Only the stake holder can release.");
      require(now > stake.timeStaked + stakeTime);
      require(stake.isReleased == false);
      stake.isReleased = true;
      allStakes[id] = stake;

      amountStakedFor[stake.beneficiary] = amountStakedFor[stake.beneficiary].sub(stake.amount);

      // Transfer the stake back to the one who created it.
      balances[this] = balances[this].sub(stake.amount);
      balances[stake.holder] = balances[stake.holder].add(stake.amount);
      emit Transfer(this, stake.holder, stake.amount);

      if (stake.badgeVote > 0 && stake.stakeVote > 0) {
        // Factor the removal of the vote into the Badge Price.
        uint bageVote = stake.badgeVote.mul(stake.amount);
        totalBadgePriceVote = totalBadgePriceVote.sub(bageVote);
        totalBadgePriceVoteAmount = totalBadgePriceVoteAmount.sub(stake.amount);
        badgePrice = int(totalBadgePriceVote.div(totalBadgePriceVoteAmount));

        // Factor the removal of the vote into the Stake Requirement.
        uint stakeVote = stake.stakeVote.mul(stake.amount);
        totalStakeRequirementVote = totalStakeRequirementVote.sub(stakeVote);
        totalStakeRequirementVoteAmount = totalStakeRequirementVoteAmount.sub(stake.amount);
        stakeRequirement = totalStakeRequirementVote.div(totalStakeRequirementVoteAmount);

        // Even if a user removes their vote they are still eligible for rewards since they voted in the past.
        // For that reason they are not removed from the voters array at this point.
      }

    }

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function getVoters() public view returns (address[]) {
      return voters;
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    /**
    * @dev Function to stop minting new tokens.
    * @return True if the operation was successful.
    */
    function finishMinting() onlyOwner canMint public returns (bool) {
        mintingFinished = true;
        emit MintFinished();
        return true;
    }

    function totalSupply() public view returns(uint256) {
        return totalSupply_;
    }

    function balanceOf(address _owner) public view returns(uint256 balance) {
        return balances[_owner];
    }

    /*
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     *
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param _spender The address which will spend the funds.
     * @param _value The amount of tokens to be spent.
     */
    function approve(address _spender, uint256 _value) public returns(bool) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns(uint256) {
        return allowed[_owner][_spender];
    }

    function increaseApproval(address _spender, uint _addedValue) public returns(bool) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint _subtractedValue) public returns(bool) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns(bool) {
        require(_to != address(0));
        require(_value <= balances[_from]);
        require(_value <= allowed[_from][msg.sender]);

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns(bool) {
        require(_to != address(0));
        require(_value <= balances[msg.sender]);

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

/*
        function transferToMultipleAccounts(address[] _to, uint256[] _values) public returns(bool) {
            for (uint i = 0; i < _to.length; i++) {
                transfer(_to[i], _values[i]);
            }
            return true;
        }
    */

    function burn(uint256 _value) public {
        require(_value <= balances[msg.sender]);
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        emit Burn(burner, _value);
        emit Transfer(burner, address(0), _value);
    }
}
