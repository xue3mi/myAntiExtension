chrome.action.onClicked.addListener((tab) => {
  // We send a "ping" message to see if the content script is already running on the current tab
  chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script is not injected yet. We inject the styles and scripts.
      chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"],
      }).then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["lib/fabric.min.js"],
        });
      }).then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["lib/html2canvas.min.js"],
        });
      }).then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      }).catch((err) => console.error("Web Annotator injection failed: ", err));
    } else {
      // Content script is already injected, just send a toggle message to hide/show the UI
      chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    }
  });
});
