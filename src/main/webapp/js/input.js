
function loginButtonPressed() {
    myaddress = fullVerifyAddress(document.getElementById('from').value);
    
    if (myaddress === undefined) {
    	showError("Invalid address");
    	return;
    }

    login();
}

function retroTimeSelected() {
    numLookBackBlocks = parseInt($("#sel_retrotime").val());
    startBlockNo = web3.eth.blockNumber - numLookBackBlocks;

    clearContactList();
    clearMessages();

    setupGeneralWatchers();
    setupContactWatchers();
}

function networkSelected(evt) {

	stopGeneralWatchers();
    stopContactWatchers();

    clearContactList();
    clearMessages();
    
    targetaddress = "";

	// Use testnet by default
    ipaddr_prov = ipaddr_prov_rinkeby;
    contractAddress = contractAddress_rinkeby;

    if (evt.target.value == "mainnet") {
    	ipaddr_prov = ipaddr_prov_main;
    	contractAddress = contractAddress_main;
    }

    initEth();
    connectBlockchain();
    
    login();
}

function addContactButtonPressed() {
	var targetaddr = fullVerifyAddress(document.getElementById('to').value);
	
    if (targetaddr === undefined) {
    	showError("Invalid address");
    	return;
    }

	connect(targetaddr);
}

function sendMsgButtonPressed() {
    var msgtext = document.getElementById('message').value;
    sendMsgWithParams(msgtext);
}
