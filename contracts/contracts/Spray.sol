//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Spray is Ownable {
    receive() external payable {}

    function spread(uint256 amount, address[] memory accounts) public onlyOwner {
        for (uint i=0; i<accounts.length; i++) {
            (bool sent,) = payable(accounts[i]).call{value: amount}("");
        }
    }

    function collect(address to) public onlyOwner {
        (bool sent,) = payable(to).call{value: address(this).balance}("");
        require(sent, "Failed to collect Ether");
    }
}
