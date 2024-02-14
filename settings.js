window.settings = {}

function saveSettings() {
    localStorage.setItem("otpmanager-browser_settings", JSON.stringify(window.settings))
}

function loadSettings() {
    if (localStorage.getItem("otpmanager-browser_settings")) {
        window.settings = JSON.parse(localStorage.getItem("otpmanager-browser_settings"))
    } else {
        window.settings = {}
    }
}

function readSettings() {
    console.log("Settings changed")
    window.settings.hideOTP = $("#settings-hide-otp-checkbox input").prop("checked")
    window.settings.splitOTP = $("#settings-split-otp-checkbox input").prop("checked")

    // re-render
    displayOtp()
    saveSettings()
}


// Register event handlers for settings
$( document ).ready( function() {
    loadSettings()

    $("#settings-button").on("click", function() {$("#settings-container").toggle(200)})

    $("#settings-close-button").on("click", function() {$("#settings-container").hide(200)})

    $("#settings-hide-otp-checkbox input").on("change", readSettings)
    $("#settings-split-otp-checkbox input").on("change", readSettings)

    if (window.settings.hideOTP)  $("#settings-hide-otp-checkbox input").prop('checked', true)
    if (window.settings.splitOTP) $("#settings-split-otp-checkbox input").prop('checked', true)
})
