
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
var messengerContract;
var messenger;

// Contract addresses
var contractAddress_rinkeby = "0x4f2be1b85eee03e29e5b740f14f694b818f6141d";         // transactionHash: 0xebac0ed9db02a19f3e6859f42e8bd726a8d625dc4d8d1e247c48676264aff724
var contractAddress_main = "0x932864F3d9D86f52D574A93FE458b5254c6871DB";         // transactionHash: 0x26581e0196a42af96fe057ab0ce6a1711835f3735e5195e694a2bcb308edde4d
var contractAddress;

// Ethereum network ids
var networkid_rinkeby = 4;
var networkid;

// Events for tracking contacts, messages and account information
var receiveAllEvent;
var sentAllEvent;
var receiveMessageEvent;
var sentMessageEvent;
var newBlockFilter;

// Time for updating account info and network info if an injected
// provider is used
var accountTimer;


window.addEventListener('load', function() {
	init();
});
	
function init() {

	// Use testnet by default
    ipaddr_prov = ipaddr_prov_rinkeby;
    contractAddress = contractAddress_rinkeby;
    networkid = networkid_rinkeby;

    connectBlockNo = 4000000;
    
    // Blockchain initialization
    initEth();
    messengerContract = web3.eth.contract(contractAbi);

    // Page initialization
    initPage();
    numLookBackBlocks = parseInt($("#sel_retrotime").val());

    // Startup DApp
    connectBlockchain();
    if (isInjectedProvider()) {
    	setupInjectedProviderListener();
    }
};

function initPage() {

    $("#sel_retrotime").val("5760");
    $("#sel_network").val("rinkeby");
    $("#message").val("");
    $("#trf_value").val("0");
    $("#trf_data").val("");sel_network
    	
    $("#conversation").hide();
    $("#transfer").hide();

    // Add injected provider to netwok select menu if injected provider
    // is present, set injected provider as selected provider 
    if (isInjectedProvider()) {
        $("#sel_network").append($('<option></option>').val("injected").html("Injected provider"));
        $("#sel_network").val("injected");
    }

    // Init security relevant controls
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

function setupInjectedProviderListener() {
	
	myaddress = undefined;
	networkid = undefined
	
	// Start timer
	accountTimer = setInterval(function() {
		
		// Handle account changes done through the injected provider
		if (myaddress !== web3.eth.accounts[0]) {
			  
			logout();
			myaddress = web3.eth.accounts[0];
			  
			if (myaddress !== undefined) {
				prepareLogin();
				//login();
			}
		}
		
		// Handle network changes done through the injected provider
		web3.version.getNetwork(function(error, result) {
			if (!error) {
				if (networkid !== result) {
					
					networkid = result;
					
					if (networkid == 1) contractAddress = contractAddress_main;
					else if (networkid == 4) contractAddress = contractAddress_rinkeby;	
					
					if (networkid !== undefined) {
						stopGeneralWatchers();
					    stopContactWatchers();

					    clearContactList();
					    clearMessages();
					    
					    targetaddress = "";

					    messengerContract = web3.eth.contract(contractAbi);

						connectBlockchain();
						prepareLogin();
					}
				}
			}
		});
	}, 300);
}

function stopInjectedProviderListener() {
	if (accountTimer !== undefined) clearInterval(accountTimer);
}

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
        $("#contact_" + contactaddr + " .numnewmsgs").css("color", "#00b000");
        $("#contact_" + contactaddr + " .newmsgtext").css("color", "#00b000");
        $("#contact_" + contactaddr + " .numnewmsgs").css("font-weight", "bold");
        $("#contact_" + contactaddr + " .newmsgtext").css("font-weight", "bold");
    }
    else {
        $("#contact_" + contactaddr + " .numnewmsgs").css("color", "#000000");
        $("#contact_" + contactaddr + " .newmsgtext").css("color", "#000000");
        $("#contact_" + contactaddr + " .numnewmsgs").css("font-weight", "normal");
        $("#contact_" + contactaddr + " .newmsgtext").css("font-weight", "normal");
    }
};

function maintainContactList(contactaddr, blocknr) {

    var contacts = $(".contactcard");

    var found = 0;

    // Loop through all contact card divs
    for (var i=0; i<contacts.length; i++) {
        var contact = contacts.get(i);

        // Mark connected contact as connected (green headline and pressed down, i.e without shadow). This
        // is necessary here to have the connected contact marked also after refreshes, like it happens 
        // after changing the look back interval
        if (contact.id == "contact_" + targetaddress) {
	        $("#contact_" + targetaddress).css("box-shadow", "none");
	        $("#contact_" + targetaddress).css("top", "5px");
	        $("#contact_" + targetaddress + " .contactname").css("backgroundColor", "#00bb00");
        }
        
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
        $("#"+contacts.get(0).id).before("<div class=\"contactcard\" id=\"contact_" + contactaddr.toLowerCase() + "\" onclick=\"prepareConnect(\'" + contactaddr + "\')\"> <div class=\"contactname\">" + contactaddr + "</div> <img class=\"contactimg\" src=\"https://www.gravatar.com/avatar/" + contactaddr.substring(2,contactaddr.length).toLowerCase() + "?d=retro&s=40\">" + "<div class=\"newmsgtext\">new<br>messages</div> <div class=\"msgstate\"> <span class=\"numnewmsgs\" id=\"numnewmsgs_" +  contactaddr.toLowerCase() + "\"> </span> </div></div>");
        $("#sel_contact").append($('<option></option>').val(contactaddr).html(contactaddr));
    }
};

function clearContactList() {

    var contacts = $(".contactcard");

    // Loop through all contact card divs
    for (var i=0; i<contacts.length; i++) {
        var contact = contacts.get(i);

        // Remove all contact cards but the add card
        if (contact.id !== "contact_1") $("#"+contact.id).remove();
    }

    // Adjust number of new messages and update display
    numnewmsgs[targetaddress] = 0;
    updateNumMessageDisplay(targetaddress);
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
            $("#"+message.id).before("<div class=\"message\" id=\"" + msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> " + msgdate + " </div> <div class=\"msgtext\">" + cleanupAndFormat(text) + "</div></div></div>");
            $("#"+msgid).children().css("backgroundColor", msgbgcolor);

            break;
        }
    }
};

// Carry out asynchronous request required for printing a message
function preparePrintMessage(ethevent, msgclass, msgbgcolor) {

	web3.eth.getBlock(ethevent.blockNumber, function(error, result) {
		if(!error) {
		    var msgdate = new Date(result.timestamp*1000);
		    printMessage(ethevent, msgdate, msgclass, msgbgcolor);
		}
	});

}

// Print message
function printMessage(ethevent, msgdate, msgclass, msgbgcolor) {

    var messages = $(".message");

    // Loop through all message divs
    for (var i=0; i<messages.length; i++) {
        var message = messages.get(i);

        // No action if message already present in conversation
        if (parseInt(message.id) == parseInt(ethevent.args.msgid)) break;

        // Put message into conversation, order descending by message id
        if (parseInt(message.id) < parseInt(ethevent.args.msgid)) {
            $("#"+message.id).before("<div class=\"message\" id=\"" + ethevent.args.msgid + "\"> <div class=\"" + msgclass + "\"> <div class=\"timestamp\"> " + msgdate + " </div> <div class=\"msgtext\">" + cleanupAndFormat(ethevent.args.msgtext) + "</div></div></div>");
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

	stopGeneralWatchers();
    stopContactWatchers();
	
    clearContactList();
    clearMessages();
    resetTxHandling();

    myaddress = "";
    targetaddress = "";

    $(".titlepage").show();
    $(".chatpage").hide();
    
    $("#conversation").hide();
    $("#transfer").hide();
};

//Carry out asynchronous request required for login
function prepareLogin() {
    
	try {
    	web3.eth.getBlockNumber(function(error, result) {
    		if(!error) {
    			connectBlockNo = result;
    	        startBlockNo = connectBlockNo - numLookBackBlocks;
                login();
    		}
    	});
    }
    catch(err) {
        showError(err);
    }
}

// Do login
function login() {

    try {

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
        document.getElementById('loggedinimg').innerHTML = "<img src=\"https://www.gravatar.com/avatar/" + myaddress.substring(2,34).toLowerCase() + "?d=retro&s=64\">";
    	web3.eth.getBalance(myaddress, function(error, result) {
    		if (!error) {
    	        document.getElementById('loggedinbalance').innerHTML = result.dividedBy(new BigNumber("1000000000000000000")) + " ETH ";
    		}
    	});

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

function stopGeneralWatchers() {

    if (receiveAllEvent !== undefined) receiveAllEvent.stopWatching();
    if (sentAllEvent !== undefined) sentAllEvent.stopWatching();
    if (newBlockFilter !== undefined) newBlockFilter.stopWatching();
}

function setupGeneralWatchers() {

    stopGeneralWatchers();
    
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
                numnewmsgs[addr]++;
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
                numnewmsgs[addr]++;
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
        	web3.eth.getBalance(myaddress, function(error, result) {
        		if (!error) {
        			document.getElementById('loggedinbalance').innerHTML = result.dividedBy(new BigNumber("1000000000000000000")) + " ETH ";
        		}
        	});
        }
        else {
            console.log(error, result);
            showError(error);
        }            
    });
};

// Carry out asynchronous request required for connecting to an account
function prepareConnect(targetadr) {

	// Do not connect to invalid addresses
    if (targetadr === undefined) return;

    // Avoid to reconnect to the currently connected address
    if (targetaddress !== undefined && targetaddress.toLowerCase() === targetadr.toLowerCase()) return;

    try {
    	web3.eth.getBlockNumber(function(error, result) {
    		if(!error) {
    			connectBlockNo = result;
    	        startBlockNo = connectBlockNo - numLookBackBlocks;
    	        connect(targetadr);
    		}
    	});
    }
    catch(err) {
        showError(err);
    }
}
    
// connect to an account
function connect(targetadr) {

    try {

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

        setupContactWatchers();
    }
    catch(err) {
        showError(err);
    }
};

function stopContactWatchers() {

    if (receiveMessageEvent !== undefined) receiveMessageEvent.stopWatching();
    if (sentMessageEvent !== undefined) sentMessageEvent.stopWatching();
}

function setupContactWatchers() {

    clearMessages();

    stopContactWatchers();
    
    // Event to track received messages for conversation
    receiveMessageEvent = messenger.ReceiveMessage({to: myaddress, from: targetaddress}, {fromBlock: startBlockNo, toBlock: 'latest'});
    receiveMessageEvent.watch(function(error, result) {
        if (!error) {

        	// Only messages that arrive after connecting are counted as new messages
            if (result.blockNumber >= connectBlockNo) numnewmsgs[result.args.from]++;
            updateNumMessageDisplay(result.args.from);

            // Add message to conversation
            //printMessage(result, "rxmessage", "#00b000");
            preparePrintMessage(result, "rxmessage", "#00b000");
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
            //printMessage(result, "txmessage", "rgba(255, 255, 255, 0.9)");
            preparePrintMessage(result, "txmessage", "rgba(255, 255, 255, 0.9)");
        }
        else {
            console.log(error, result);
            showError(error);
        }
    });
};

function sendMsgWithParams(msgtext) {

    markMessagesAsRead();

    var data = messenger.sendMessage.getData(targetaddress, msgtext);
    
    addTransaction({sender: myaddress, receiver: contractAddress, amount: new BigNumber("0"), data: data},
        function (error, txhash){
            if (error) {
                showError("Error sending message. " + error);
            }
            else {
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

    addTransaction({sender: myaddress, receiver: targetaddress, amount: value, data: data},
        function (error, txhash){
            if (error) {
                showError("Error sending transaction. " + error);
            }
            else {
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
