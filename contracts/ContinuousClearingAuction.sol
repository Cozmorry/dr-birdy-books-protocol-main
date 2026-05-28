// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Continuous Clearing Auction
 * @notice Conducts a uniform-price clearing auction for DBBPT tokens.
 *         Allows the owner to end the auction early or cancel it at any time.
 *         Decoupled from rigid raise target constraints.
 */
contract ContinuousClearingAuction is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Tokens and Currency
    IERC20 public immutable token;
    IERC20 public immutable currency;

    // Auction Parameters
    uint256 public immutable tokenAmount; // Total DBBPT tokens up for auction
    uint256 public immutable floorPrice; // Minimum price per 1 full DBBPT token (in currency units)
    uint256 public immutable startBlock; // Block when bidding starts
    uint256 public endBlock; // Block when bidding ends (can be updated by early end)

    // Recipient Addresses
    address public immutable fundsRecipient; // Receives 2/3 of funds raised
    address public immutable liquidityRecipient; // Receives 1/3 of funds raised

    // State Variables
    uint256 public totalCurrencyContributed;
    uint256 public clearingPrice;
    uint256 public totalTokensSold;
    
    bool public isEnded;
    bool public isCanceled;
    bool public isFinalized;

    // Mappings
    mapping(address => uint256) public currencyContributed;
    mapping(address => bool) public tokensClaimed;
    mapping(address => bool) public refundClaimed;

    // Events
    event BidSubmitted(address indexed bidder, uint256 amount);
    event AuctionEndedEarly(uint256 blockNumber);
    event AuctionCanceled();
    event AuctionFinalized(uint256 clearingPrice, uint256 totalRaised, uint256 tokensSold);
    event TokensClaimed(address indexed bidder, uint256 tokensReceived);
    event RefundClaimed(address indexed bidder, uint256 refundAmount);
    event UnsoldTokensWithdrawn(address indexed owner, uint256 amount);

    constructor(
        address _token,
        address _currency,
        uint256 _tokenAmount,
        uint256 _floorPrice,
        uint256 _startBlock,
        uint256 _endBlock,
        address _fundsRecipient,
        address _liquidityRecipient,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "Invalid token address");
        require(_currency != address(0), "Invalid currency address");
        require(_tokenAmount > 0, "Auction size must be > 0");
        require(_floorPrice > 0, "Floor price must be > 0");
        require(_startBlock >= block.number, "Start block must be >= current");
        require(_endBlock > _startBlock, "End block must be > start block");
        require(_fundsRecipient != address(0), "Invalid funds recipient");
        require(_liquidityRecipient != address(0), "Invalid liquidity recipient");

        token = IERC20(_token);
        currency = IERC20(_currency);
        tokenAmount = _tokenAmount;
        floorPrice = _floorPrice;
        startBlock = _startBlock;
        endBlock = _endBlock;
        fundsRecipient = _fundsRecipient;
        liquidityRecipient = _liquidityRecipient;
    }

    /**
     * @notice Submit a bid by contributing the raising currency
     * @param amount Amount of currency to contribute
     */
    function bid(uint256 amount) external nonReentrant {
        require(!isEnded && !isCanceled, "Auction has ended or is canceled");
        require(block.number >= startBlock, "Auction has not started yet");
        require(block.number < endBlock, "Auction bidding period has expired");
        require(amount > 0, "Bid amount must be greater than 0");

        // Transfer currency from bidder to this contract
        currency.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        currencyContributed[msg.sender] += amount;
        totalCurrencyContributed += amount;

        emit BidSubmitted(msg.sender, amount);
    }

    /**
     * @notice Allows the owner to end the auction early at any moment
     */
    function endAuctionEarly() external onlyOwner {
        require(!isEnded && !isCanceled && !isFinalized, "Invalid auction state");
        isEnded = true;
        endBlock = block.number;

        emit AuctionEndedEarly(block.number);
    }

    /**
     * @notice Allows the owner to cancel the auction at any moment before finalization
     */
    function cancelAuction() external onlyOwner {
        require(!isCanceled && !isFinalized, "Auction already finalized or canceled");
        isCanceled = true;
        isEnded = true;

        emit AuctionCanceled();
    }

    /**
     * @notice Finalizes the auction, calculates clearing price, and splits the raised funds
     */
    function finalize() external onlyOwner nonReentrant {
        require(isEnded || block.number >= endBlock, "Auction has not ended yet");
        require(!isCanceled, "Auction is canceled");
        require(!isFinalized, "Auction already finalized");

        // Auto-end the flag if block time passed
        if (!isEnded) {
            isEnded = true;
        }

        if (totalCurrencyContributed == 0) {
            clearingPrice = floorPrice;
            totalTokensSold = 0;
        } else {
            // Price calculation: Price of 1 full DBBPT (10^18 units) in currency units
            // price = (totalCurrencyContributed * 10^18) / tokenAmount
            uint256 calculatedPrice = (totalCurrencyContributed * 1e18) / tokenAmount;
            
            if (calculatedPrice < floorPrice) {
                clearingPrice = floorPrice;
                // At floor price, total tokens sold = (totalCurrencyContributed * 10^18) / floorPrice
                totalTokensSold = (totalCurrencyContributed * 1e18) / floorPrice;
            } else {
                clearingPrice = calculatedPrice;
                totalTokensSold = tokenAmount;
            }
        }

        isFinalized = true;

        // Emit finalization details
        emit AuctionFinalized(clearingPrice, totalCurrencyContributed, totalTokensSold);

        // Split and distribute raised funds if any
        if (totalCurrencyContributed > 0) {
            uint256 liquidityShare = totalCurrencyContributed / 3; // 1/3 (33.33%)
            uint256 fundsShare = totalCurrencyContributed - liquidityShare; // 2/3 (66.67%)

            currency.safeTransfer(liquidityRecipient, liquidityShare);
            currency.safeTransfer(fundsRecipient, fundsShare);
        }

        // Return unsold tokens to owner if any
        if (totalTokensSold < tokenAmount) {
            uint256 unsoldTokens = tokenAmount - totalTokensSold;
            token.safeTransfer(owner(), unsoldTokens);
            emit UnsoldTokensWithdrawn(owner(), unsoldTokens);
        }
    }

    /**
     * @notice Allows bidders to claim their purchased DBBPT tokens after finalization
     */
    function claimTokens() external nonReentrant {
        require(isFinalized, "Auction not finalized yet");
        require(!isCanceled, "Auction was canceled");
        require(!tokensClaimed[msg.sender], "Tokens already claimed");

        uint256 contribution = currencyContributed[msg.sender];
        require(contribution > 0, "No contribution made");

        // Calculate tokens: (contribution * 1e18) / clearingPrice
        uint256 tokensToClaim = (contribution * 1e18) / clearingPrice;
        
        tokensClaimed[msg.sender] = true;

        if (tokensToClaim > 0) {
            token.safeTransfer(msg.sender, tokensToClaim);
            emit TokensClaimed(msg.sender, tokensToClaim);
        }
    }

    /**
     * @notice Allows bidders to withdraw a 100% refund if the auction was canceled
     */
    function claimRefund() external nonReentrant {
        require(isCanceled, "Auction is not canceled");
        require(!refundClaimed[msg.sender], "Refund already claimed");

        uint256 contribution = currencyContributed[msg.sender];
        require(contribution > 0, "No contribution to refund");

        refundClaimed[msg.sender] = true;
        currency.safeTransfer(msg.sender, contribution);

        emit RefundClaimed(msg.sender, contribution);
    }

    /**
     * @notice Emergency withdrawal of all DBBPT tokens by owner if auction is canceled
     */
    function withdrawUnsoldTokens() external onlyOwner nonReentrant {
        require(isCanceled, "Auction must be canceled to withdraw");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        token.safeTransfer(owner(), balance);
        emit UnsoldTokensWithdrawn(owner(), balance);
    }
}
