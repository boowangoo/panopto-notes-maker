const all_markers = document.querySelector('ul#all-markers');

let loaded_marker = false;
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['times'], result => {
        console.log(result.times);
        if (result.times) {
            for (t of result.times) {
                const mrk = this.createElement('li');
                mrk.id = 'marker-entry';
                mrk.innerHTML = `${t.time_sec} / ${t.time_tot}`;
                all_markers.appendChild(mrk);
            }
            loaded_marker = true;
        }
    });
});


const button_clear = document.querySelector('#btn-clear-all');
button_clear.addEventListener('click', function(event) {
    event.preventDefault();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "clearAllMarkers"});
    });
});

const button_download = document.querySelector('#btn-download');
button_download.addEventListener('click', function(event) {
    console.log("downloadFrames");
    event.preventDefault();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "downloadFrames"});
    });
});