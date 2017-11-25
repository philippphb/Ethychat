
function loginButtonPressed() {
    myaddress = fullVerifyAddress(document.getElementById('from').value);
    
    if (myaddress === undefined) {
    	showError("Invalid address");
    	return;
    }

    prepareLogin();
}

function retroTimeSelected() {
    numLookBackBlocks = parseInt($("#sel_retrotime").val());

    try {
      	web3.eth.getBlockNumber(function(error, result) {
      		if(!error) {
      	        startBlockNo = result - numLookBackBlocks;

				clearContactList();
				clearMessages();

	      	    setupGeneralWatchers();
	      	    setupContactWatchers();
      		}
      	});
	}
	catch(err) {
	    showError(err);
	}
}

function networkSelected(evt) {

	// Stop DApp
	stopGeneralWatchers();
    stopContactWatchers();

	stopInjectedProviderListener();

	web3 = undefined;    

    clearContactList();
    clearMessages();
    
    targetaddress = "";

	// Use injected provider
    if (evt.target.value == "injected") {
        useInjectedProvider();
    	setupInjectedProviderListener();
    }

    // Use custom provider for main net
	else if (evt.target.value == "mainnet") {
    	ipaddr_prov = ipaddr_prov_main;
    	contractAddress = contractAddress_main;

        initEth();
    }
        
	// Use testnet by default
    else {
        ipaddr_prov = ipaddr_prov_rinkeby;
        contractAddress = contractAddress_rinkeby;

        initEth();
    }

    // Restart DApp
    messengerContract = web3.eth.contract(contractAbi);
    connectBlockchain();
    
    prepareLogin();
}

function addContactButtonPressed() {
	var targetaddr = fullVerifyAddress(document.getElementById('to').value);
	
    if (targetaddr === undefined) {
    	showError("Invalid address");
    	return;
    }

	prepareConnect(targetaddr);
}

function sendMsgButtonPressed() {
    var msgtext = document.getElementById('message').value;
    sendMsgWithParams(msgtext);
}
