const all_markers = document.querySelector('ul#all-markers');

function timestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const msecs = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')},${msecs.toString().padStart(3,'0')}`;
}

function addToMarkerList(id, time_sec, time_tot) {
    const mrk = document.createElement('li');
    mrk.id = `marker-entry${id}`;
    mrk.appendChild(document.createTextNode(timestamp(time_sec)));

    const close_btn = document.createElement('button');
    close_btn.classList.add('close-marker');
    close_btn.innerHTML = `<span class="material-symbols-outlined">close</span>`;
    close_btn.addEventListener('click', function(event) {
        event.preventDefault();
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "removeMarker", id});
        });
        const rm_mrk = document.querySelector(`#marker-entry${id}`);
        all_markers.removeChild(rm_mrk);
    });

    mrk.appendChild(close_btn);
    all_markers.appendChild(mrk);
}

let loaded_marker = false;
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['times'], result => {
        console.log(result.times);
        if (result.times) {
            result.times.forEach((t, i) => {
                addToMarkerList(i, t.time_sec, t.time_tot);
            });
        }
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (loaded_marker && (request.action === "addMarker")) {
        const n = request.times.length;
        const t = request.times[n-1];
        addToMarkerList(n-1, t.time_sec, t.time_tot);
    }
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