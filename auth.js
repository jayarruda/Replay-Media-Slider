export function saveCredentialsToSessionStorage(credentials) {
    try {
        sessionStorage.setItem("json-credentials", JSON.stringify(credentials));
        console.log("Credentials saved to sessionStorage.");
    } catch (err) {
        console.error("Error saving credentials:", err);
    }
}

export function saveApiKey(apiKey) {
    try {
        sessionStorage.setItem("api-key", apiKey);
        console.log("API key saved to sessionStorage.");
    } catch (err) {
        console.error("Error saving API key:", err);
    }
}

(function interceptConsoleLog() {
    const originalLog = console.log;

    console.log = function (...args) {
        originalLog.apply(console, args);

        for (const arg of args) {
            if (typeof arg === "string") {
                if (arg.startsWith("Stored JSON credentials:")) {
                    try {
                        const jsonStr = arg.substring(25);
                        saveCredentialsToSessionStorage(JSON.parse(jsonStr));
                    } catch (err) {
                        console.error("Error parsing credentials:", err);
                    }
                }

                if (arg.startsWith("opening web socket with url:")) {
                    try {
                        const url = arg.split("url:")[1].trim();
                        const apiKey = new URL(url).searchParams.get("api_key");
                        if (apiKey) {
                            saveApiKey(apiKey);
                        }
                    } catch (err) {
                        console.error("Error extracting API key:", err);
                    }
                }
            }
        }
    };
})();
