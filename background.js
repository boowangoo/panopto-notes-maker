chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "addMarker") {
        chrome.storage.local.set({times: request.times}, () => {
            chrome.action.openPopup(() => {
                console.log("Popup opened!");
            }, );
        });
    }
});

// clear markers on reload
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({markers_list: []});
});
