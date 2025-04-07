export function saveCredentialsToSessionStorage(credentials) {
    try {
        sessionStorage.setItem("json-credentials", JSON.stringify(credentials));
        console.log("Kimlik bilgileri sessionStorage'a kaydedildi.");
    } catch (err) {
        console.error("Kimlik bilgileri kaydedilirken hata:", err);
    }
}

export function saveApiKey(apiKey) {
    try {
        sessionStorage.setItem("api-key", apiKey);
        console.log("API anahtarı sessionStorage'a kaydedildi.");
    } catch (err) {
        console.error("API anahtarı kaydedilirken hata:", err);
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
                        console.error("Kimlik bilgileri ayrıştırılırken hata:", err);
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
                        console.error("API anahtarı çıkarılırken hata:", err);
                    }
                }
            }
        }
    };
})();
