
function showError(errormsg) {
    document.getElementById('pop_txerrormsg').innerHTML = errormsg;
    console.log(errormsg);
    $("#txerror").show();
}

function closeTxErrorPopup() {
    $("#txerror").hide();
}

function cancelAddMsgPopup() {
    $("#addmsgtotx").hide();
}

function acceptAddMsgPopup() {       

    $("#addmsgtotx").hide();

    var msgtext = document.getElementById('addmessage').value; 
    sendMsgWithParams(msgtext);
}
