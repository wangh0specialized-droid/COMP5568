// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InterestRateModel {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    uint256 public baseRatePerSecond;
    uint256 public slope1;
    uint256 public slope2;
    uint256 public optimalUtilization;

    constructor(
        uint256 baseRatePerYear,
        uint256 slope1PerYear,
        uint256 slope2PerYear,
        uint256 optimalUtilization_
    ) {
        baseRatePerSecond = baseRatePerYear / SECONDS_PER_YEAR;
        slope1 = slope1PerYear;
        slope2 = slope2PerYear;
        optimalUtilization = optimalUtilization_;
    }

    function getUtilizationRate(
        uint256 cash,
        uint256 borrows
    ) public pure returns (uint256) {
        if (cash + borrows == 0) {
            return 0;
        }
        return (borrows * PRECISION) / (cash + borrows);
    }

    function getBorrowRatePerSecond(
        uint256 cash,
        uint256 borrows
    ) public view returns (uint256) {
        uint256 utilization = getUtilizationRate(cash, borrows);

        if (utilization <= optimalUtilization) {
            uint256 rateSlope = (utilization * slope1) / optimalUtilization / SECONDS_PER_YEAR;
            return baseRatePerSecond + rateSlope;
        } else {
            uint256 excessUtilization = utilization - optimalUtilization;
            uint256 maxExcess = PRECISION - optimalUtilization;
            uint256 baseSlope = slope1 / SECONDS_PER_YEAR;
            uint256 excessSlope = (excessUtilization * slope2) / maxExcess / SECONDS_PER_YEAR;
            return baseRatePerSecond + baseSlope + excessSlope;
        }
    }

    function getSupplyRatePerSecond(
        uint256 cash,
        uint256 borrows
    ) public view returns (uint256) {
        uint256 utilization = getUtilizationRate(cash, borrows);
        uint256 borrowRate = getBorrowRatePerSecond(cash, borrows);
        return (borrowRate * utilization) / PRECISION;
    }

    function getBorrowRatePerYear(
        uint256 cash,
        uint256 borrows
    ) external view returns (uint256) {
        return getBorrowRatePerSecond(cash, borrows) * SECONDS_PER_YEAR;
    }

    function getSupplyRatePerYear(
        uint256 cash,
        uint256 borrows
    ) external view returns (uint256) {
        return getSupplyRatePerSecond(cash, borrows) * SECONDS_PER_YEAR;
    }
}
