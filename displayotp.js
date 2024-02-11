function getAlgorithm(n) {
    return ["SHA1", "SHA256", "SHA512"][n];
}

function getOtpFromAccount(account) {
    const passHash = CryptoJS.SHA256(window.password).toString()
    console.log("passHash", passHash)

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
                        '<div>'+ account.name +'</div>'+
                        '<div><span class="ui grey text">'+ account.issuer +'</span></div>'+
                        '<span class="ui big link text otpcode">'+ getOtpFromAccount(account) +'</span><i class="copy outline icon"></i>'+
                    '</div>'+
                '</div>'+
            '</div>'
}

function displayOtp() {
    if (!window.accounts) {
        console.log("No accounts???")
        // Should display user error and go back to start
    }

    $("#otp-container").empty()

    $("#otp-container").show()

    window.accounts.forEach(account => {
        console.log(account)
        $("#otp-container").append(generateAccountSegment(account))
    });

    // Copy code on click
    $(".otpcode").on("click", function() {
        navigator.clipboard.writeText($(this).text())
        $(this).fadeOut(200).fadeIn(200)
    })
}