function getAlgorithm(n) {
    return ["SHA1", "SHA256", "SHA512"][n];
}

function getOtpFromAccount(account) {
    const passHash = CryptoJS.SHA256(window.password).toString()

    const key = CryptoJS.enc.Hex.parse(passHash);
    const parsedIv = CryptoJS.enc.Hex.parse(window.accountIV);
    const dec = CryptoJS.AES.decrypt(account.secret, key, { iv: parsedIv });

    var secret = dec.toString(CryptoJS.enc.Utf8);

    if (account.type == "totp") {
        var totp = new OTPAuth.TOTP({
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
          var hotp = new OTPAuth.HOTP({
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
    return '<div class="ui segment">' +
                '<div class="ui grid">' +
                    '<div class="four wide column">'+
                        '<div>logo</div>'+
                    '</div>'+
                    '<div class="twelve wide column">'+
                        '<div class="accountname">'+ account.name +'</div>'+
                        '<div><span class="ui grey text accountissuer">'+ account.issuer +'</span></div>'+
                        '<div class="otpcode"><span class="ui big text">'+ getOtpFromAccount(account) +'</span> <i class="copy outline icon"></i></div>'+
                    '</div>'+
                '</div>'+
            '</div>'
}

function displayOtp() {
    if (!window.accounts) {
        console.log("No accounts???")
        // Should display user error and go back to start
    }

    $("#otps").empty()
    $("#otp-container").show()
    $("#otp-search input").focus()

    window.accounts.forEach(account => {
        $("#otps").append(generateAccountSegment(account))
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
    var term = $("#otp-search input").val().toLowerCase()

    $("#otps .segment").each(function(i) {
        var accountissuer = $(this).find(".accountissuer").text().toLowerCase()
        var accountname = $(this).find(".accountname").text().toLowerCase()
        if (accountname.includes(term) || accountissuer.includes(term)) {
            $(this).show()
        } else {
            $(this).hide()
        }
    })
}
