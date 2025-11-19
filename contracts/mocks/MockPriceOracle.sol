// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    int256 private price = 10000000000; // example 100 USD * 1e8
    uint80 private roundId = 1;
    uint256 private startedAt = block.timestamp;
    uint256 private updatedAt = block.timestamp;
    uint80 private answeredInRound = 1;

    event PriceUpdated(
        int256 indexed newPrice,
        uint80 indexed roundId,
        uint256 timestamp
    );

    function latestAnswer() external view returns (int256) {
        return price;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256 answer, uint256, uint256, uint80)
    {
        return (roundId, price, startedAt, updatedAt, answeredInRound);
    }

    function setPrice(int256 _price) external {
        // Accept any int256 value, including negative values for testing
        price = _price;
        updatedAt = block.timestamp;
        roundId++;
        answeredInRound = roundId;

        emit PriceUpdated(_price, roundId, block.timestamp);
    }

    function getCurrentRoundId() external view returns (uint80) {
        return roundId;
    }

    function getLastUpdated() external view returns (uint256) {
        return updatedAt;
    }
}
