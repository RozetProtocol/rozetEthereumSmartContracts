pragma solidity ^ 0.4.19;

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

    string public constant name = "Rozet";
    string public constant symbol = "ROZ";
    uint8 public constant decimals = 18;
    // This is the equivilant of 240 million Roz with 18 decimals or 240000000 * (10 ** uint256(decimals))
    // uint256 public constant INITIAL_SUPPLY = 2.4e8 ether; 
    uint256 totalSupply_;
    int public totalWeightOfAllVoters;
    int public totalSupplyOfAllVoters;
    int public badgePrice;
    uint datePriceCanBeUpdated;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) internal allowed;
    mapping(address => uint) public votesForBadgePrice;

    constructor() public {
        // The RozetGeneration contract will create this RozetToken contract and thus will be the only one able to mint tokens.
        owner = msg.sender;
        datePriceCanBeUpdated = now;
        badgePrice = 20;
       // totalSupply_ = INITIAL_SUPPLY;
       // balances[msg.sender] = INITIAL_SUPPLY;
       // Transfer(0x0, msg.sender, INITIAL_SUPPLY);
    }

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
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

    function voteForBadgePrice(uint vote) public {
        require(vote >= 0);

        // Update the total supply of all voters.
        uint origionalVote = votesForBadgePrice[msg.sender];
        if (vote == 0 && origionalVote > 0) {
            totalSupplyOfAllVoters -= int(balanceOf(msg.sender));
        }
        if (vote > 0 && origionalVote == 0) {
            totalSupplyOfAllVoters += int(balanceOf(msg.sender));
        }

        // Update the global weight.
        int origionalWeightOfVoter = int(origionalVote * balanceOf(msg.sender));
        int newWeightOfVoter = int(vote * balanceOf(msg.sender));
        if (newWeightOfVoter > origionalWeightOfVoter) {
            totalWeightOfAllVoters += (newWeightOfVoter - origionalWeightOfVoter);
        }
        if (newWeightOfVoter < origionalWeightOfVoter) {
            totalWeightOfAllVoters -= (origionalWeightOfVoter - newWeightOfVoter);
        }

        // Cast the vote.
        votesForBadgePrice[msg.sender] = vote;
    }

    function updateWeight(address _from, address _to, uint256 _value) public {
        // If the sender has a vote then the sender is always going to lose weight
        uint weightLostBySender = 0;
        // If the sender is voting.
        if (votesForBadgePrice[_from] > 0) {
            uint weightOfSenderBeforeSending = votesForBadgePrice[_from] * balanceOf(_from);
            uint weightOfSenderAfterSending = votesForBadgePrice[_from] * (balanceOf(_from) - _value);
            weightLostBySender = weightOfSenderBeforeSending - weightOfSenderAfterSending;
            // A voter just sent roz to a non-voter so decrease the total supply of roz being used to vote.
            if (votesForBadgePrice[_to] == 0) {
                totalSupplyOfAllVoters -= int(_value);
            }
        }

        // If the receiver has a vote then sending will always cause the system to gain weight
        uint weightGainedByreceiver = 0;
        // If the receiver is voting.
        if (votesForBadgePrice[_to] > 0) {
            uint weightOfreceiverBeforeRecieving = votesForBadgePrice[_to] * balanceOf(_to);
            uint weightOfreceiverAfterRecieving = votesForBadgePrice[_to] * (balanceOf(_to) + _value);
            weightGainedByreceiver = weightOfreceiverAfterRecieving - weightOfreceiverBeforeRecieving;
            // If the sender is not voting.
            if (votesForBadgePrice[_to] == 0) {
                // A non-voter just sent roz to a voter so increase the total supply of roz being used to vote.
                totalSupplyOfAllVoters += int(_value);
            }
        }

        int weightChange = int(weightGainedByreceiver - weightLostBySender);
        totalWeightOfAllVoters += weightChange;
    }

    function updateBadgePrice() public {
        // Ensure that the global price updates no faster than once per week. 
        require(now > datePriceCanBeUpdated);
        datePriceCanBeUpdated = now + 1 weeks;
        badgePrice = totalWeightOfAllVoters / totalSupplyOfAllVoters;
    }

    /**
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

        updateWeight(_from, _to, _value);

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns(bool) {
        require(_to != address(0));
        require(_value <= balances[msg.sender]);

        updateWeight(msg.sender, _to, _value);

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferToMultipleAccounts(address[] _to, uint256[] _values) public returns(bool) {
        for (uint i = 0; i < _to.length; i++) {
            transfer(_to[i], _values[i]);
        }
        return true;
    }

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