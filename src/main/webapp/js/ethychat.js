
// web3 provider addresses
var ipaddr_prov_local = "http://localhost:8545";
//var ipaddr_prov_rinkeby = "http://35.196.72.186:8545";
var ipaddr_prov_rinkeby = "http://35.185.16.215:8545";
//var ipaddr_prov_main = "http://104.197.142.219:8545";
var ipaddr_prov_main = "http://104.197.142.219:17348";
var ipaddr_prov;

var Web3 = require('web3');
var web3 = new Web3();

// Number of blocks in the past to look at
var numLookBackBlocks;

// First block considered searching for messages
var startBlockNo;

// Block number when a connection to a contact was made
var connectBlockNo;

// Logged in address
var myaddress;

// Address of connected contact
var targetaddress;

// Number of new messages of each contact
var numnewmsgs = {};

// Temporary message ids for messages in process
var topmsgidtx = 1000000000;
var topmsgidrx = 1000000000;

// Messenger contract
var contractAbi = [{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"msgtext","type":"string"}],"name":"sendMessage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"msgid","type":"uint128"},{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"msgtext","type":"string"}],"name":"ReceiveMessage","type":"event"}];
var fcthash_sendMessage = "0xde6f24bb";
//var browser_untitled_sol_messengerContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"funderaddress","type":"address"}],"name":"Messenger","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"text","type":"string"}],"name":"sendMessage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"msgid","type":"uint128"},{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"text","type":"string"}],"name":"ReceiveMessage","type":"event"}]);
var messengerContract = web3.eth.contract(contractAbi);
var messenger;

// Contract addresses
//var contractAddress_rinkeby = "0x4c065e75e4534cd51cf9660b2704da96c2ca6d89";
var contractAddress_rinkeby = "0x4f2be1b85eee03e29e5b740f14f694b818f6141d";         // transactionHash: 0xebac0ed9db02a19f3e6859f42e8bd726a8d625dc4d8d1e247c48676264aff724
var contractAddress_main = "0x932864F3d9D86f52D574A93FE458b5254c6871DB";         // transactionHash: 0x26581e0196a42af96fe057ab0ce6a1711835f3735e5195e694a2bcb308edde4d
var contractAddress;

// Events for tracking contacts, messages and account information
var receiveAllEvent;
var sentAllEvent;
var receiveMessageEvent;
var sentMessageEvent;
var newBlockFilter;


function init() {
    initPage();
    initEth();
    
    connectBlockchain();
};

function initPage() {

    $("#sel_retrotime").val("5760");
    $("#sel_network").val("rinkeby");
    $("#message").val("");
    $("#trf_value").val("0");
    $("#trf_data").val("");

    $("#conversation").hide();
    $("#transfer").hide();

    numLookBackBlocks = parseInt($("#sel_retrotime").val());
    ipaddr_prov = ipaddr_prov_rinkeby;
    contractAddress = contractAddress_rinkeby;

    initSec();
};

function initSec() {

    $("#rad_keyfile").prop("checked", false );
    $("#rad_pkey").prop("checked", false );
    $("#inp_keyfile").val("");
    $("#inp_pwd").val("");
    $("#inp_pkey").val("");
    $("#rad_thistx").prop("checked", true );
    $("#rad_10min").prop("checked", false );
    $("#rad_1hr").prop("checked", false );

    $("#li_pkey").hide();
    $("#li_keyfile").hide();
    $("#li_pwd").hide();
};

function initEth() {
    web3.setProvider(new web3.providers.HttpProvider(ipaddr_prov));
};

function connectBlockchain() {

	try {
		messenger = messengerContract.at(contractAddress);
    }
    catch(err) {
        showError("Error connecting to Ethereum block chain.");
    }
}

function updateNumMessageDisplay(contactaddr) {

	// Update number of new messages
    $("#numnewmsgs_"+contactaddr).html(numnewmsgs[contactaddr]);

    // Set appropriate text (singular/plural)
    if (numnewmsgs[contactaddr] === 1) $("#contact_" + contactaddr +" .newmsgtext").html("new<br>message");
    else $("#contact_" + contactaddr + " .newmsgtext").html("new<br>messages");          

    // Adapt appearance if new messages are available 
    if (numnewmsgs[contactaddr] > 0) {
        $("#contact_" + targetaddress + " .numnewmsgs").css("color", "#00b000");
        $("#contact_" + targetaddress + " .newmsgtext").css("color", "#00b000");
        $("#contact_" + targetaddress + " .numnewmsgs").css("font-weight", "bold");
        $("#contact_" + targetaddress + " .newmsgtext").css("font-weight", "bold");
    }
    else {
        $("#contact_" + targetaddress + " .numnewmsgs").css("color", "#000000");
        $("#contact_" + targetaddress + " .newmsgtext").css("color", "#000000");
        $("#contact_" + targetaddress + " .numnewmsgs").css("font-weight", "normal");
        $("#contact_" + targetaddress + " .newmsgtext").css("font-weight", "normal");
    }
};

function maintainContactList(contactaddr, blocknr) {

    var contacts = $(".contactcard");

    var found = 0;

    // Loop through all contact card divs
    for (var i=0; i<contacts.length; i++) {
        var contact = contacts.get(i);

        // Check if there is a contact card vor the passed contact
        if (contact.id == "contact_" + contactaddr.toLowerCase()) {

        	// Mark card for activity after connecting to the contact 
        	if (connectBlockNo <= blocknr) {
                $("#"+contact.id).effect("highlight", {color: "#00b000"},  2000);
            }

            found = 1;
            
            break;
        }
    }

    // Add new contact card and select-entry for the passed contact if no card was found
    if (found === 0) {
        $("#"+contacts.get(0).id).before("<div class=\"contactcard\" id=\"contact_" + contactaddr.toLowerCase() + "\" onclick=\"connect(\'" + contactaddr + "\')\"> <div class=\"contactname\">" + contactaddr + "</div> <img class=\"contactimg\" src=\"https://www.gravatar.com/avatar/" + contactaddr.substring(2,contactaddr.length).toLowerCase() + "?d=retro&s=40\">" + "<div class=\"newmsgtext\">new<br>messages</div> <div class=\"msgstate\"> <span class=\"numnewmsgs\" id=\"numnewmsgs_" +  contactaddr.toLowerCase() + "\"> </span> </div></div>");
        $("#sel_contact").append($('<option></option>').val(contactaddr).html(contactaddr));
    }
};

function printMessage2(msgid, msgdate, from, text, msgclass, msgbgcolor) {

    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);

        // No action if message already present in conversation
        if (parseInt(message.id) == parseInt(msgid)) break;

        // Put message into conversation, order descending by message id
        if (parseInt(message.id) < parseInt(msgid)) {
            //$("#"+message.id).before("<div class=\"message\" id=\"" + msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> (" + msgid + "), " + msgdate + " </div> <div class=\"msgtext\">" + text + "</div></div></div>");
            $("#"+message.id).before("<div class=\"message\" id=\"" + msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> " + msgdate + " </div> <div class=\"msgtext\">" + cleanupText(text) + "</div></div></div>");
            $("#"+msgid).children().css("backgroundColor", msgbgcolor);

            break;
        }
    }
};

function printMessage(ethevent, msgclass, msgbgcolor) {

    var msgblock = web3.eth.getBlock(ethevent.blockNumber);
    var msgdate = new Date(msgblock.timestamp*1000);

    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);

        // No action if message already present in conversation
        if (parseInt(message.id) == parseInt(ethevent.args.msgid)) break;

        // Put message into conversation, order descending by message id
        if (parseInt(message.id) < parseInt(ethevent.args.msgid)) {
            //$("#"+message.id).before("<div class=\"message\" id=\"" + ethevent.args.msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> (" + ethevent.args.msgid + "), " + msgdate + " </div> <div class=\"msgtext\">" + ethevent.args.msgtext + "</div></div></div>");
            $("#"+message.id).before("<div class=\"message\" id=\"" + ethevent.args.msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> " + msgdate + " </div> <div class=\"msgtext\">" + cleanupText(ethevent.args.msgtext) + "</div></div></div>");
            if (connectBlockNo <= ethevent.blockNumber) $("#"+ethevent.args.msgid).children().css("backgroundColor", msgbgcolor);

            break;
        }
    }
};

function markMessagesAsRead() {
    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);
        
        // Remove new message marker
        if (message.id < topmsgidrx) $("#"+message.id).children().css("backgroundColor", "rgba(255, 255, 255, 0.9)");
    }

    // Adjust number of new messages and update display
    numnewmsgs[targetaddress] = 0;
    updateNumMessageDisplay(targetaddress);
};

function clearMessage(msgid) {

    var res = 0;

    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);
        
        // Remove message with the passed message id
        if (message.id === msgid) {
            $("#"+message.id).remove();
            res = 1;
        }
    }

    return res;
};

function clearMessages() {

    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);
        
        // Remove all messages but the root
        if (message.id !== "-1") $("#"+message.id).remove();
    }

    // Adjust number of new messages and update display
    numnewmsgs[targetaddress] = 0;
    updateNumMessageDisplay(targetaddress);
};

function logout() {

    clearMessages();
    resetTxHandling();

    myaddress = "";
    targetaddress = "";

    $(".titlepage").show();
    $(".chatpage").hide();
    
    $("#conversation").hide();
    $("#transfer").hide();
};

function login() {

    try {
        connectBlockNo = web3.eth.blockNumber;

        startBlockNo = web3.eth.blockNumber - numLookBackBlocks;

        clearMessages();
        resetTxHandling();

        // Do not login without address or with invalid address
        if (myaddress === "" || myaddress === undefined) return;

        $(".chatpage").show();
        $(".titlepage").hide();

        $("#conversation").hide();
        $("#transfer").hide();

        // Update header with account info of logged in account
        document.getElementById('loggedinname').innerHTML = myaddress;
        document.getElementById('loggedinimg').innerHTML = "<img src=\"https://www.gravatar.com/avatar/" + myaddress.substring(2,34).toLowerCase() + "?d=retro&s=64&f=y\">";
        document.getElementById('loggedinbalance').innerHTML = web3.eth.getBalance(myaddress).dividedBy(new BigNumber("1000000000000000000")) + " ETH ";

        // Reset security relevant account specific variables with every login
        mypwd = "";
        pkey = "";
        keyfileObject = undefined;
                
        setupGeneralWatchers();
    }
    catch(err) {
        showError(err);
    }
};

function setupGeneralWatchers() {

    if (receiveAllEvent !== undefined) receiveAllEvent.stopWatching();
    if (sentAllEvent !== undefined) sentAllEvent.stopWatching();
    if (newBlockFilter !== undefined) newBlockFilter.stopWatching();

    numnewmsgs = {};

    // Event to track received messages for maintaining contact list and number of new messages
    receiveAllEvent = messenger.ReceiveMessage({to: myaddress}, {fromBlock: startBlockNo, toBlock: 'latest'});
    receiveAllEvent.watch(function(error, result) {
        if (!error) {

        	// Make sure the sender of the message is in the contact list
            maintainContactList(result.args.from, result.blockNumber);

            // Keep number of new message up to date
            var addr = result.args.from;
            if (addr != targetaddress) {
                if (numnewmsgs[addr] === undefined) numnewmsgs[addr] = 0;
                numnewmsgs[result.args.from]++;
                updateNumMessageDisplay(addr);
            }
        }
        else {
            console.log(error, result);
            showError(error);
        }
    });

    // Event to track sent messages for maintaining contact list and number of new messages
    sentAllEvent = messenger.ReceiveMessage({from: myaddress}, {fromBlock: startBlockNo, toBlock: 'latest'});
    sentAllEvent.watch(function(error, result) {
        if (!error) {

        	// Make sure the receiver of the message is in the contact list
            maintainContactList(result.args.to, result.blockNumber);

            // Keep number of new message up to date
            var addr = result.args.to;
            if (addr != targetaddress) {
                if (numnewmsgs[addr] === undefined) numnewmsgs[addr] = 0;
                numnewmsgs[result.args.from]++;
                updateNumMessageDisplay(addr);
            }
        }
        else {
            console.log(error, result);
            showError(error);
        }
    });


    // Event to track changes of the account balance
    newBlockFilter = web3.eth.filter('latest');
    newBlockFilter.watch(function (error, log) {
        if (!error) {
            document.getElementById('loggedinbalance').innerHTML = web3.eth.getBalance(myaddress).dividedBy(new BigNumber("1000000000000000000")) + " ETH ";
        }
        else {
            console.log(error, result);
            showError(error);
        }            
    });
};

function connect(targetadr) {

	// Do not connect to invalid addresses
    if (targetadr === undefined) return;

    // Avoid to reconnect to the currently connected address
    if (targetaddress !== undefined && targetaddress.toLowerCase() === targetadr.toLowerCase()) return;

    try {
        connectBlockNo = web3.eth.blockNumber;
        startBlockNo = web3.eth.blockNumber - numLookBackBlocks;

        // Mark the previous connected contact as not connected (grey headline and not pressed down, i.e with shadow)
        if (targetaddress !== undefined) {
            $("#contact_" + targetaddress).css("box-shadow", "10px 10px 5px grey");
            $("#contact_" + targetaddress).css("top", "0px");
            $("#contact_" + targetaddress + " .contactname").css("backgroundColor", "#bbbbbb");
        }
        
        targetaddress = targetadr;

        // Update contract list, add new contact card if necessary
        maintainContactList(targetaddress, 0);

        // Mark connected contact as connected (green headline and pressed down, i.e without shadow)
        $("#contact_" + targetaddress).css("box-shadow", "none");
        $("#contact_" + targetaddress).css("top", "5px");
        $("#contact_" + targetaddress + " .contactname").css("backgroundColor", "#00bb00");

        // Select the target address in the drop down menu
        $("#sel_contact").val(targetadr);

        $("#conversation").show();
        $("#transfer").show();

//        clearMessages();

        setupContactWatchers();
    }
    catch(err) {
        showError(err);
    }
};

function setupContactWatchers() {

    clearMessages();

    if (receiveMessageEvent !== undefined) receiveMessageEvent.stopWatching();
    if (sentMessageEvent !== undefined) sentMessageEvent.stopWatching();

    // Event to track received messages for conversation
    receiveMessageEvent = messenger.ReceiveMessage({to: myaddress, from: targetaddress}, {fromBlock: startBlockNo, toBlock: 'latest'});
    receiveMessageEvent.watch(function(error, result) {
        if (!error) {

        	// Only messages that arrive after connecting are counted as new messages
            if (result.blockNumber >= connectBlockNo) numnewmsgs[result.args.from]++;
            updateNumMessageDisplay(result.args.from);

            // Add message to conversation
            printMessage(result, "rxmessage", "#00b000");
        }
        else {
            console.log(error, result);
            showError(error);
        }
    });


    // Event to track sent messages for conversation
    sentMessageEvent = messenger.ReceiveMessage({from: myaddress, to: targetaddress}, {fromBlock: startBlockNo, toBlock: 'latest'});
    sentMessageEvent.watch(function(error, result) {
        if (!error) {

        	// Remove the temporary message of the conversation
            if (clearMessage(topmsgidrx.toString(10)) === 1) topmsgidrx++;
/*
            if (result.blockNumber >= connectBlockNo) numnewmsgs[result.args.from]++;
            updateNumMessageDisplay(result.args.to);
*/
            // Add message to conversation
            printMessage(result, "txmessage", "rgba(255, 255, 255, 0.9)");
        }
        else {
            console.log(error, result);
            showError(error);
        }
    });
};

function sendMsgWithParams(msgtext) {

    markMessagesAsRead();

    var zerostr = "0000000000000000000000000000000000000000000000000000000000000000";

    //var data = "0xde6f24bb";
    var data = fcthash_sendMessage;

    var fieldpos = 0;
    var fieldposstr;

    // Set param "to"
    var targetaddressstr = targetaddress.substring(2,targetaddress.length);
    data += zerostr.substring(0,zerostr.length-targetaddressstr.length);
    data += targetaddressstr;
    fieldpos += 32;

    // Set position of variable length fields
    fieldpos += 1*32;
    data += intEnc(fieldpos);

    // set param "msgtext"
    var msgtextstr = stringEnc(msgtext);
    data += msgtextstr;

/*
    console.log("data: " + data);
    console.log("Sending message...");
*/

    sendTransaction({sender: myaddress, receiver: contractAddress, amount: new BigNumber("0"), data: data},
        function (error, txhash){
            if (error) {
                console.log("Error sending message: " + error);
                showError("Error sending message. " + error);
            }
            else {
//                console.log('Transaction sent with success. Transaction hash: ' + txhash);

                printMessage2(topmsgidtx.toString(10), new Date(), myaddress, msgtext, "txmessage", "rgba(10, 10, 10, 0.3)");
                topmsgidtx++;

                document.getElementById('message').value = "";
            }
        }
    );
};

function sendEther() {

    var value = new BigNumber(verifyNumStr(document.getElementById('trf_value').value));
    var data = verifyHexStr(document.getElementById('trf_data').value);
/*
    console.log("value: " + value);
    console.log("Sending transaction...");
*/
    sendTransaction({sender: myaddress, receiver: targetaddress, amount: value, data: data},
        function (error, txhash){
            if (error) {
                console.log("Error sending transaction: " + error);
                showError("Error sending transaction. " + error);
            }
            else {
//                console.log('Transaction sent with success. Transaction hash: ' + txhash);

                document.getElementById('pop_addmsgethvalue').innerHTML = value.toString(10) + " ETH ";
                document.getElementById('pop_addmsgtxtarget').innerHTML = targetaddress;

                var msgtext;
                if (data === "") msgtext = value.toString(10) + " Ether sent (without data).";
                else msgtext = value.toString(10) + " Ether sent (data: " + data + ").";

                document.getElementById('addmessage').value = msgtext;

                $("#addmsgtotx").show();
            }
        }
    );
};

