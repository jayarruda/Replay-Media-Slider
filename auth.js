const JSON_PREFIX = "Stored JSON credentials:";
const WS_PREFIX   = "opening web socket with url:";

export function saveCredentials(credentials) {
  try {
    const raw = JSON.stringify(credentials);
    sessionStorage.setItem("json-credentials", raw);
    localStorage.setItem("json-credentials", raw);
    console.log("Kimlik bilgileri kaydedildi.");
  } catch (err) {
    console.error("Kimlik bilgileri kaydedilirken hata:", err);
  }
}

export function saveApiKey(apiKey) {
  try {
    sessionStorage.setItem("api-key", apiKey);
    localStorage.setItem("api-key", apiKey);
    console.log("API anahtarı kaydedildi.");
  } catch (err) {
    console.error("API anahtarı kaydedilirken hata:", err);
  }
}

function clearCredentials() {
  ["json-credentials","api-key","accessToken"].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
  console.log("Tüm kimlik bilgileri temizlendi.");
}

export function getAuthToken() {
  return (
    sessionStorage.getItem("api-key") ||
    localStorage.getItem("api-key") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken") ||
    new URLSearchParams(window.location.search).get("api_key") ||
    (window.ApiClient && window.ApiClient._authToken) ||
    null
  );
}

(function interceptConsoleLog() {
  const orig = console.log;
  console.log = function(...args) {
    args.forEach(arg => {
      if (typeof arg === "string") {
        if (arg.startsWith(JSON_PREFIX)) {
          try {
            const cred = JSON.parse(arg.slice(JSON_PREFIX.length).trim());
            clearCredentials();
            saveCredentials(cred);
          } catch {}
        }
        if (arg.startsWith(WS_PREFIX)) {
          const url = arg.split("url:")[1]?.trim();
          if (url) {
            try {
              const key = new URL(url).searchParams.get("api_key");
              if (key) saveApiKey(key);
            } catch {}
          }
        }
      }
    });
    orig.apply(console, args);
  };
})();

export {
  clearCredentials,
};
