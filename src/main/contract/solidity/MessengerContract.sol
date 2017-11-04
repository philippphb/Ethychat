pragma solidity ^0.4.0;

contract MessengerContract {
    
    uint128 msgcnt;
    mapping (address => uint64) usermsgcnt;
    
    event ReceiveMessage(
        uint128 msgid,
        address indexed from,
        address indexed to,
        string msgtext
    );

    function MessengerContract() public {
        msgcnt = 0;
    }
    
    function sendMessage(address to, string msgtext) public {
        usermsgcnt[msg.sender]++;
        ReceiveMessage(msgcnt++, msg.sender, to, msgtext);
    }
}
