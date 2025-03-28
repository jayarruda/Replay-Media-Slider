function saveCredentialsToSessionStorage(e) {
    try {
        sessionStorage.setItem("json-credentials", JSON.stringify(e)),
        console.log("Credentials saved to sessionStorage.")
    } catch (e) {
        console.error("Error saving credentials:", e)
    }
}
function saveApiKey(e) {
    try {
        sessionStorage.setItem("api-key", e),
        console.log("API key saved to sessionStorage.")
    } catch (e) {
        console.error("Error saving API key:", e)
    }
}
!function() {
    var e = console.log;
    console.log = function(r) {
        if (e.apply(console, arguments),
        "string" == typeof r && r.startsWith("Stored JSON credentials:"))
            try {
                var s = r.substring(25);
                saveCredentialsToSessionStorage(JSON.parse(s))
            } catch (e) {
                console.error("Error parsing credentials:", e)
            }
        if ("string" == typeof r && r.startsWith("opening web socket with url:"))
            try {
                var o = r.split("url:")[1].trim()
                  , t = new URL(o).searchParams.get("api_key");
                t && saveApiKey(t)
            } catch (e) {
                console.error("Error extracting API key:", e)
            }
    }
}();
