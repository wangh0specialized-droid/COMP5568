// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILendingPool {
    function flashLoan(address receiver, address asset, uint256 amount, bytes calldata params) external;
}

contract FlashLoanReceiver {
    using SafeERC20 for IERC20; 

    address public immutable owner;
    address public immutable lendingPool;
    bool private _inCallback;

    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 fee,
        address target,
        bool success
    );

    constructor(address _lendingPool) {
        owner = msg.sender;
        lendingPool = _lendingPool;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == lendingPool, "Only lending pool");
        require(!_inCallback, "Reentrancy");
        _inCallback = true;

        (address target, bytes memory callData) = abi.decode(params, (address, bytes));

        if (target != address(0)) {
            IERC20(asset).safeIncreaseAllowance(target, amount);
            (bool success, ) = target.call(callData);
            require(success, "Target call failed");
            
            IERC20(asset).safeDecreaseAllowance(target, amount);
        }

        uint256 totalRepayment = amount + fee;
        require(IERC20(asset).balanceOf(address(this)) >= totalRepayment, "Insufficient balance");

        IERC20(asset).safeIncreaseAllowance(lendingPool, totalRepayment);

        _inCallback = false;
        emit FlashLoanExecuted(asset, amount, fee, target, true);
        return true;
    }

    function startFlashLoan(
        address asset,
        uint256 amount,
        address target,
        bytes calldata callData
    ) external {
        require(msg.sender == owner, "Only owner");
        bytes memory params = abi.encode(target, callData);
        ILendingPool(lendingPool).flashLoan(address(this), asset, amount, params);
    }

    function withdrawToken(address token, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        IERC20(token).safeTransfer(owner, amount);
    }

    receive() external payable {}
}