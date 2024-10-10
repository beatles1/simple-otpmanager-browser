function getAlgorithm(n) {
    return ["SHA1", "SHA256", "SHA512"][n];
}

// on: name, issuer, created
// order: asc, desc
function sortAccounts(on, order) {
  if (order != "asc" && order != "desc") return false;
  switch (on) {
    case "name":
      if (order == "asc") {
        window.accounts.sort((a, b) => a.name.localeCompare(b.name))
      } else {
        window.accounts.sort((a, b) => b.name.localeCompare(a.name))
      }
      return true;

    case "issuer":
      if (order == "asc") {
        window.accounts.sort((a, b) => a.issuer.localeCompare(b.issuer))
      } else {
        window.accounts.sort((a, b) => b.issuer.localeCompare(a.issuer))
      }
      return true;

      case "created":
        if (order == "asc") {
          window.accounts.sort((a, b) => a.created_at.localeCompare(b.created_at))
        } else {
          window.accounts.sort((a, b) => b.created_at.localeCompare(a.created_at))
        }
        return true;

      default:
        if (order == "asc") {
          window.accounts.sort((a, b) => a.position > b.position)
        } else {
          window.accounts.sort((a, b) => a.position < b.position)
        }
        return true;
  }
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
          account.code = "Click to generate code";
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
    const template = document.querySelector(account.type === "totp" ? "#totp-template" : "#hotp-template")
    const clone = template.content.cloneNode(true)
    const icon = account.icon === "default" ? "img/vpn-key.svg" : "https://cdn.simpleicons.org/"+ account.icon
    clone.querySelector(".accounticon").src = icon
    clone.querySelector(".accountname").textContent = account.name
    clone.querySelector(".accountissuer").textContent = account.issuer

    const otpValue = getOtpFromAccount(account)
    let otpText = window.settings.hideOTP ? "******" : otpValue
    if (window.settings.splitOTP) {
      const m = Math.floor(otpText.length/2)
      otpText = otpText.substring(0, m) +" "+ otpText.substring(m)
    }
    clone.querySelector(".otpcode span").textContent = otpText
    clone.querySelector(".otpcode span").setAttribute("data-otpvalue", otpValue)

    if (account.type === "hotp") {
      clone.querySelector(".refreshbutton").setAttribute("data-accountid", account.id)
    }

    document.querySelector("#otp-list").appendChild(clone)
}

function displayOtp() {
    if (!window.accounts) {
        console.log("No accounts???")
        // Should display user error and go back to start
    }

    $("#settings-button").show(300)

    $("#otp-list").empty()
    $("#otp-container").show()

    // Order accounts
    sortAccounts(window.settings.sortOn ? window.settings.sortOn : "default", window.settings.sortOrder ? window.settings.sortOrder : "asc")

    // Display accounts
    window.accounts.forEach(account => {
        generateAccountSegment(account)
    });

    // Copy code on click
    $(".otpcode").on("click", function() {
        navigator.clipboard.writeText($(this).find("span").attr("data-otpvalue"))
        $(this).fadeOut(200).fadeIn(200)
    })

    // Increase hotp counter on click
    $(".refreshbutton").on("click", function() {
      $(this).fadeOut(200)
      const accountid = $(this).attr("data-accountid")
      if (accountid) {
        for (var i in window.accounts) {
          if (window.accounts[i].id == accountid) {
            window.accounts[i].counter += 1
            break
          }
        }
        displayOtp()  // Instead of doing this, just update the text and data- attrib?
        searchOtp()
      } else {
        console.log("Can't get accountid from attribute")
      }
      
      $(this).fadeIn(200)
    })

    // Search
    $("#otp-search input").keyup(searchOtp)
    $("#otp-search i").on("click", searchOtp)

    if($("#settings-container").is(":hidden")) $("#otp-search input").focus()
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
