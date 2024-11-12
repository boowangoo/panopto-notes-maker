chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "addMarker") {
        chrome.storage.local.set({times: request.times}, () => {
            chrome.action.openPopup();
        });
    }
    if (request.action === "initiateDownload") {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            saveAs: true
        }, (downloadId) => {
            // The download has started
            // Revoke the blob URL after a short delay to ensure download starts
            setTimeout(() => URL.revokeObjectURL(request.url), 100);
        });
    }
});

// clear markers on reload
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({markers_list: []});
});
