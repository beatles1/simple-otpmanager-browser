window.accountIV = false
window.password = false

function startPasswordCheck() {
    $("#password-input-container").show()

    $("#password-input input").keypress(function(e) {
        if (e.which === 13) checkPassword()
    })
    $("#password-input i").on("click", checkPassword)

    $("#password-input input").focus()

    // Check if we have a saved URL
    if (localStorage.getItem("otpmanager-browser_saved_password")) {
        checkPassword()
    }
}

function showPasswordError(text) {
    $("#password-input-error p").text(text)
    $("#password-input-error").show(50)
    $("#password-input").removeClass("loading disabled")
    $("#password-input i").addClass("link")
}

async function checkPassword() {
    $("#password-input").addClass("loading disabled")
    $("#password-input i").removeClass("link")

    var pass = $("#password-input input").val()

    if (!pass) {
        showPasswordError("Please enter a password")
        return
    }

    // Check password against server & store IV
    try {
        var response = await fetch(window.server+ "/apps/otpmanager/password/check", {method: "POST", headers: {"Content-Type": "application/json",}, body: JSON.stringify({password: pass})})
        var jsonData = await response.json()
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
    $("#password-input-container").hide(100)
    displayOtp()
}