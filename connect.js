window.accounts = false
window.server = false

const defaultHeaders = new Headers({
    "User-Agent": "Simple OTP Manager Browser Extension",
    "OCS-APIRequest": "true"
});

let requestHeaders = defaultHeaders
  

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
        const response = await fetch(server+ "/index.php/apps/otpmanager/accounts", {
            headers: requestHeaders,
            credentials: "omit"
        })
        const jsonData = await response.json()
        if (response.status === 401) {
            showConnectError("Not authenticated, please connect again to login.")
            deleteSavedNCLogin()
            return false
        } else if (!response.ok || !jsonData.accounts) {
            console.log("Failed to load accounts at: ", server+ "/index.php/apps/otpmanager/accounts")
            showConnectError("Could not load accounts from OTP Manager. Please check the server is healthy and the OTP Manager extension is installed.")
            return false
        }
        return jsonData.accounts
    } catch {
        console.log("Error loading: ", server+ "/index.php/apps/otpmanager/accounts")
        showConnectError("Could not load accounts from OTP Manager. Please check the server is healthy and the OTP Manager extension is installed.")
        return false
    }
}

function getSavedNCLogin() {
    const login = JSON.parse(localStorage.getItem("otpmanager-browser_NClogin"))
    if (login && login.username && login.appPassword) {
        return login
    }
    return false
}

async function deleteSavedNCLogin() {
    // Try to delete from Nextcloud server
    try {
        const response = await fetch(window.server+ "/ocs/v2.php/core/apppassword", {
            method: "DELETE",
            headers: requestHeaders,
            credentials: "omit"
        })
        if (response.ok) {
            console.log("appPassword deleted")
        } else {
            console.log("appPassword failed to delete")
        }
    } catch {
        console.log("Error deleting: ", window.server+ "/ocs/v2.php/core/apppassword")
    }
    // Delete from localstorage
    localStorage.removeItem("otpmanager-browser_NClogin")
    // Delete from headers we're currently using
    requestHeaders = defaultHeaders
}

async function setSavedNCLogin(pollJSON) {
    const poll = JSON.parse(pollJSON)

    try {
        let headers = requestHeaders
        headers.set("Content-Type", "application/x-www-form-urlencoded")
        const response = await fetch(poll.endpoint, {
            method: "POST",
            headers: headers,
            credentials: "omit",
            body: "token="+ poll.token
        })
        const jsonData = await response.json()
        // 404 means authentication wasn't completed for this token
        if (response.status === 404) {
            showConnectError("Last Nextcloud login not complete, please try again")
            localStorage.removeItem("otpmanager-browser_NCloginPoll")
            return false
        } else if (!response.ok || !jsonData.loginName || !jsonData.appPassword) {
            console.log("Failed to poll login token at: ", poll.endpoint)
            return false
        }

        // We have a username and password
        localStorage.setItem("otpmanager-browser_NClogin", JSON.stringify({username: jsonData.loginName, appPassword: jsonData.appPassword}))
        localStorage.removeItem("otpmanager-browser_NCloginPoll")
        return true
    } catch {
        console.log("Error loading: ", poll.endpoint)
        return false
    }
}

async function startNClogin(server) {
    // Request login v2 from NC
    try {
        const response = await fetch(server+ "/index.php/login/v2", {
            method: "POST",
            headers: requestHeaders,
            credentials: "omit"
        })
        const jsonData = await response.json()
        if (!response.ok || !jsonData.poll || !jsonData.login) {
            console.log("Failed to start login process at: ", server+ "/index.php/login/v2")
            return false
        }

        // Save the poll token/URL to use later
        localStorage.setItem("otpmanager-browser_NCloginPoll", JSON.stringify(jsonData.poll))

        // Prompt the user to open the login page
        $("#server-input-loginlink").show(50)
        $("#server-input-nc-login-button").on("click", function() {
            chrome.tabs.create({
                url: jsonData.login,
            })
        })
        // Or copy the link to use elsewhere
        $("#server-input-nc-copy-button").on("click", function() {
            navigator.clipboard.writeText(jsonData.login)
            $(this).fadeOut(100).fadeIn(100)
        })
        console.log("Login URL", jsonData.login)

        return true
    } catch {
        console.log("Error loading: ", server+ "/index.php/login/v2")
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


    // Save URL as it's an NC server
    localStorage.setItem("otpmanager-browser_server", server)
    window.server = server

    // Check if we have a v2 login flow to check
    if (localStorage.getItem("otpmanager-browser_NCloginPoll")) {
        // If we do then let's retreive our credentials
        const loginSaved = await setSavedNCLogin(localStorage.getItem("otpmanager-browser_NCloginPoll"))
        if (!loginSaved) {
            return false
        }
    }

    // Check if we have login details
    let login = getSavedNCLogin()
    if (useSaved && login) {
        // Add login details to our headers
        requestHeaders.set('Authorization', 'Basic ' + btoa(login.username + ":" + login.appPassword));
    } else {
        // We don't have NC login details
        if (!await startNClogin(server)) {
            showConnectError("Failed to start login flow")
        }
        return
    }

    // Try and connect to OTP Manager
    const accounts = await getOTPManagerAccounts(server)
    if (!accounts) {
        return
    }
    window.accounts = accounts

    // We've now got something saved so let the user "logout"
    $("#sign-out-button").show(300)

    // Pass over to password.js
    $("#server-input-container").hide(100)
    startPasswordCheck()
}

async function signOut() {
    $("#sign-out-button").fadeOut(100)
    localStorage.removeItem("otpmanager-browser_server")
    localStorage.removeItem("otpmanager-browser_saved_password")
    await deleteSavedNCLogin()
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
