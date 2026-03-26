// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract PriceOracle is Ownable {
    uint256 public constant STALENESS_THRESHOLD = 1 hours;

    struct AssetSource {
        address priceFeed;
        uint256 manualPrice;
        bool useChainlink;
    }

    mapping(address => AssetSource) private assetSources;

    event PriceFeedUpdated(address indexed asset, address indexed priceFeed);
    event ManualPriceUpdated(address indexed asset, uint256 price);
    event PriceModeUpdated(address indexed asset, bool useChainlink);

    constructor() Ownable(msg.sender) {}

    function setPriceFeed(address asset, address priceFeed) external onlyOwner {
        assetSources[asset].priceFeed = priceFeed;
        emit PriceFeedUpdated(asset, priceFeed);
    }

    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        require(price > 0, "Price must be positive");
        assetSources[asset].manualPrice = price;
        emit ManualPriceUpdated(asset, price);
    }

    function setUseChainlink(address asset, bool enabled) external onlyOwner {
        if (enabled) {
            require(assetSources[asset].priceFeed != address(0), "Price feed not set");
        }
        assetSources[asset].useChainlink = enabled;
        emit PriceModeUpdated(asset, enabled);
    }

    function getAssetPrice(address asset) external view returns (uint256) {
        AssetSource storage source = assetSources[asset];

        if (source.useChainlink) {
            require(source.priceFeed != address(0), "Price feed not set");

            (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(source.priceFeed)
                .latestRoundData();

            require(answer > 0, "Invalid oracle price");
            require(updatedAt > 0, "Round not complete");
            require(block.timestamp - updatedAt <= STALENESS_THRESHOLD, "Oracle price is stale");

            return _scalePrice(uint256(answer), AggregatorV3Interface(source.priceFeed).decimals());
        }

        require(source.manualPrice > 0, "Manual price not set");
        return source.manualPrice;
    }

    function getPriceSource(address asset) external view returns (address, uint256, bool) {
        AssetSource storage source = assetSources[asset];
        return (source.priceFeed, source.manualPrice, source.useChainlink);
    }

    function _scalePrice(uint256 price, uint8 decimals_) internal pure returns (uint256) {
        if (decimals_ == 18) {
            return price;
        }
        if (decimals_ < 18) {
            return price * (10 ** (18 - decimals_));
        }
        return price / (10 ** (decimals_ - 18));
    }
}
