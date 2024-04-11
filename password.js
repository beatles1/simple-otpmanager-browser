window.accountIV = false
window.password = false

function startPasswordCheck() {
    $("#password-input-container").show()

    $("#password-input input").keypress(function(e) {
        if (e.which === 13) checkPassword(false)
    })
    $("#password-input i").on("click", function() {checkPassword(false)})

    $("#password-input input").focus()

    // Check if we have a saved URL
    if (localStorage.getItem("otpmanager-browser_saved_password")) {
        checkPassword(true)
    }
}

function showPasswordError(text) {
    $("#password-input-error p").text(text)
    $("#password-input-error").show(50)
    $("#password-input").removeClass("loading disabled")
    $("#password-input i").addClass("link")
    $("#password-input input").val("")
    $("#save-password-checkbox").removeClass("disabled")
}

async function checkPassword(useSaved) {
    $("#password-input").addClass("loading disabled")
    $("#password-input i").removeClass("link")
    $("#save-password-checkbox").addClass("disabled")

    let pass = $("#password-input input").val()

    if (useSaved) {
        pass = localStorage.getItem("otpmanager-browser_saved_password")
        $("#password-input input").val("*".repeat(16))
        $("#save-password-checkbox input").prop('checked', true);
    }

    if (!pass) {
        showPasswordError("Please enter a password")
        return
    }

    // Check password against server & store IV
    try {
        let headers = requestHeaders
        headers.set("Content-Type", "application/json")
        const response = await fetch(window.server+ "/ocs/v2.php/apps/otpmanager/password/check", {
            method: "POST",
            headers: requestHeaders,
            credentials: "omit",
            body: JSON.stringify({password: pass})
        })
        const jsonData = await response.json()
        if (!response.ok) {
            if (response.status === 400) {
                showPasswordError(jsonData.error)
            } else {
                showPasswordError("Failed")
            }
            return
        }
        if (!jsonData.iv) {
            showPasswordError("Failed to get IV from password check")
            return
        }
        window.accountIV = jsonData.iv
    } catch {
        showPasswordError("Failed to check password")
        return
    }

    // Password is okay and we've stored IV
    console.log("Password OK")
    window.password = pass

    if ($("#save-password-checkbox input").prop('checked')) {
        localStorage.setItem("otpmanager-browser_saved_password", pass)
    }    

    $("#password-input-container").hide(100)
    displayOtp()
}
