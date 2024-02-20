window.accounts = false
window.server = false

function showConnectError(text) {
    $("#server-input-error p").text(text)
    $("#server-input-error").show(50)
    $("#server-input").removeClass("loading disabled")
    $("#server-input i").addClass("link")
}

function getInputtedServerURL() {
    let server = $("#server-input input").val()
    if (!server) {
        showConnectError("Please enter Nextcloud server address")
        return false
    }
    $("#server-input-error").hide()

    server = server.trim()  // Remove whitespace
    server = server.replace(/\/+$/, "")    // Remove trailing /


    if (server.search(/https:\/\/|http:\/\//gm) === -1) {
        return "https://"+ server
    }
    return server
}

async function getOTPManagerAccounts(server) {
    try {
        const response = await fetch(server+ "/index.php/apps/otpmanager/accounts")
        const jsonData = await response.json()
        if (!response.ok || !jsonData.accounts) {
            console.log("Failed to load accounts at: ", server+ "/index.php/apps/otpmanager/accounts")
            return false
        }
        return jsonData.accounts
    } catch {
        console.log("Error loading: ", server+ "/index.php/apps/otpmanager/accounts")
        return false
    }
}

async function connectToNextcloud(useSaved) {
    $("#server-input").addClass("loading disabled")
    $("#server-input i").removeClass("link")

    // Get server URL either saved or from form
    let server = false
    if (useSaved) {
        server = localStorage.getItem("otpmanager-browser_server")
        $("#server-input input").val(server.replace("https://", ""))
    } else {
        server = getInputtedServerURL()
        if (!server) {
            return false
        }
        // Request permission to load the specific Nextcloud server. We've requested *.* but we have to then specifically ask for domains under that.
        const permission = { origins: [server+ "/"] }
        const permReq = await chrome.permissions.request(permission)    // Should be browser. but chrome is too important for that
        if (!permReq) {
            showConnectError("Not granted permissions to connect")
            return
        }
    }

    // Check if it's a Nextcloud server
    try {
        const response = await fetch(server+ "/status.php")
        const jsonData = await response.json()
        if (!response.ok) {
            showConnectError("Could not confirm URL is Nextcloud server")
            console.log("No Nextcloud status returned: ", server+ "/status.php")
            return
        }
        if (!(jsonData.installed && jsonData.productname === "Nextcloud")) {
            showConnectError("Can't find valid Nextcloud install at given url")
            console.log("No Nextcloud status returned: ", server+ "/status.php")
            return
        }
        console.log(jsonData)
    } catch {
        showConnectError("Failed to connect to server with given url")
        console.log("Error loading: ", server+ "/status.php")
        return
    }

    // Try and connect to OTP Manager
    const accounts = await getOTPManagerAccounts(server)
    if (!accounts) {
        showConnectError("Could not load accounts from OTP Manager. Please check you are logged into Nextcloud in this browser and the OTP Manager extension is installed.")
        return
    }
    window.accounts = accounts

    // Save URL as we've been successful
    localStorage.setItem("otpmanager-browser_server", server)
    window.server = server

    // We've now got something saved so let the user "logout"
    $("#sign-out-button").show(300)

    // Pass over to password.js
    $("#server-input-container").hide(100)
    startPasswordCheck()
}

function signOut() {
    localStorage.removeItem("otpmanager-browser_server")
    localStorage.removeItem("otpmanager-browser_saved_password")
    location.reload()

}

// Register event handlers for url box
$( document ).ready( function() {
    $("#server-input input").keypress(function(e) {
        if (e.which === 13) connectToNextcloud(false)
    })
    $("#server-input i").on("click", function() {connectToNextcloud(false)})

    $("#server-input input").focus()

    $("#sign-out-button").on("click", signOut)

    // Check if we have a saved URL
    if (localStorage.getItem("otpmanager-browser_server")) {
        connectToNextcloud(true)
    }
})
