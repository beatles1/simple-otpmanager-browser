function getAlgorithm(n) {
    return ["SHA1", "SHA256", "SHA512"][n];
}

function getOtpFromAccount(account) {
    const passHash = CryptoJS.SHA256(window.password).toString()

    const key = CryptoJS.enc.Hex.parse(passHash);
    const parsedIv = CryptoJS.enc.Hex.parse(window.accountIV);
    const dec = CryptoJS.AES.decrypt(account.secret, key, { iv: parsedIv });

    const secret = dec.toString(CryptoJS.enc.Utf8);

    if (account.type == "totp") {
        const totp = new OTPAuth.TOTP({
          issuer: account.issuer,
          label: account.name,
          algorithm: getAlgorithm(account.algorithm),
          digits: account.digits,
          period: account.period,
          secret: secret,
        });
  
        return totp.generate();
      } else {
        if (account.counter == 0) {
          account.code = "Click the button to generate HOTP code";
        } else {
          const hotp = new OTPAuth.HOTP({
            issuer: account.issuer,
            label: account.name,
            algorithm: getAlgorithm(account.algorithm),
            digits: account.digits,
            counter: account.counter,
            secret: secret,
          });
  
          return hotp.generate();
        }
      }
    

}

function generateAccountSegment(account) {
    const template = document.querySelector("#otp-template")
    const clone = template.content.cloneNode(true)
    const icon = account.icon === "default" ? "img/vpn-key.svg" : "https://cdn.simpleicons.org/"+ account.icon
    clone.querySelector(".accounticon").src = icon
    clone.querySelector(".accountname").textContent = account.name
    clone.querySelector(".accountissuer").textContent = account.issuer
    clone.querySelector(".otpcode span").textContent = getOtpFromAccount(account)

    document.querySelector("#otp-list").appendChild(clone)
}

function displayOtp() {
    if (!window.accounts) {
        console.log("No accounts???")
        // Should display user error and go back to start
    }

    $("#otp-list").empty()
    $("#otp-container").show()
    $("#otp-search input").focus()

    window.accounts.forEach(account => {
        generateAccountSegment(account)
    });

    // Copy code on click
    $(".otpcode").on("click", function() {
        navigator.clipboard.writeText($(this).find("span").text())
        $(this).fadeOut(200).fadeIn(200)
    })

    // Search
    $("#otp-search input").keyup(searchOtp)
    $("#otp-search i").on("click", searchOtp)
}

function searchOtp() {
    const term = $("#otp-search input").val().toLowerCase()

    $("#otp-list .segment").each(function(i) {
        const accountissuer = $(this).find(".accountissuer").text().toLowerCase()
        const accountname = $(this).find(".accountname").text().toLowerCase()
        if (accountname.includes(term) || accountissuer.includes(term)) {
            $(this).show()
        } else {
            $(this).hide()
        }
    })
}
