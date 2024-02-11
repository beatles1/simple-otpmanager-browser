window.encrypted_accounts = false
window.server = false

function showConnectError(text) {
    $("#server-input-error p").text(text)
    $("#server-input-error").show(50)
    $("#server-input").removeClass("loading disabled")
    $("#server-input i").addClass("link")
}

function getInputtedServerURL() {
    var server = $("#server-input input").val()
    if (!server) {
        showConnectError("Please enter Nextcloud server address")
        return false
    }
    $("#server-input-error").hide()

    server = server.trim()  // Remove whitespace
    server = server.replace(/\/+$/, "")    // Remove trailing /


    if (server.search(/https:\/\/|http:\/\//gm) == -1) {
        return "https://"+ server
    }
    return server
}

async function getOTPManagerAccounts(server) {
    try {
        var response = await fetch(server+ "/apps/otpmanager/accounts",)
        var jsonData = await response.json()
        if (!response.ok) {
            return false
        }
        return jsonData
    } catch {
        return false
    }
}

async function connectToNextcloud(useSaved) {
    $("#server-input").addClass("loading disabled")
    $("#server-input i").removeClass("link")

    // Get server URL either saved or from form
    var server = false
    if (useSaved) {
        server = localStorage.getItem("otpmanager-browser_server")
        $("#server-input input").val(server.replace("https://", ""))
    } else {
        server = getInputtedServerURL()
        if (!server) {
            return false
        }
        // Request permission to load the specific Nextcloud server. We've requested *.* but we have to then specifically ask for domains under that.
        var permission = { origins: [server+ "/"] }
        var permReq = await browser.permissions.request(permission)
        if (!permReq) {
            showConnectError("Not granted permissions to connect")
            return
        }
    }

    // Check if it's a Nextcloud server
    try {
        var response = await fetch(server+ "/status.php",)
        var jsonData = await response.json()
        if (!response.ok) {
            showConnectError("Could not confirm URL is Nextcloud server")
            return
        }
        if (!(jsonData.installed && jsonData.productname === "Nextcloud")) {
            showConnectError("Can't find valid Nextcloud install at given url")
            return
        }
        console.log(jsonData)
    } catch {
        showConnectError("Failed to connect to server with given url")
        return
    }

    // Try and connect to OTP Manager
    var accounts = await getOTPManagerAccounts(server)
    if (!accounts) {
        showConnectError("Could not load accounts from OTP Manager. Please check you are logged into Nextcloud in this browser and the OTP Manager extension is installed.")
        return
    }
    window.encrypted_accounts = accounts

    // Save URL as we've been successful
    localStorage.setItem("otpmanager-browser_server", server)
    window.server = server

    // Pass over to password.js
    $("#server-input-container").hide(100)
    startPasswordCheck()
}


// Register event handlers for url box
$( document ).ready( function() {
    $("#server-input input").keypress(function(e) {
        if (e.which === 13) connectToNextcloud(false)
    })
    $("#server-input i").on("click", function() {connectToNextcloud(false)})

    $("#server-input input").focus()

    // Check if we have a saved URL
    if (localStorage.getItem("otpmanager-browser_server")) {
        connectToNextcloud(true)
    }
})