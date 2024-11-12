console.log("hello world1");

function addStyle(CSS) {
    console.log(`addStyle(CSS:${CSS})`)
    const style = document.createElement('style');
    style.innerText = CSS;
    document.head.appendChild(style);
}
addStyle('#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:70%;padding:2em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:1050}#Panopto-Video-DL *{margin-bottom:10px;color:#fff!important;font-size:18px;}#Panopto-Video-DL > div {margin-top: 1em;}#Panopto-Video-DL ul,#Panopto-Video-DL ol,#Panopto-Video-DL li{margin:0 .5em;padding:0 .5em;list-style:decimal}#Panopto-Video-DL button{margin-left:5px;margin-right:5px;color:#000!important;font-size:16px;}#Panopto-Video-DL p{margin-top:0.5em;}#Panopto-Video-DL input{color:black!important;}#Panopto-Video-DL textarea{width:100%;color:black!important;resize:vertical;white-space:nowrap;}')

const buttonVideo = document.createElement('a');
buttonVideo.href = '#';
buttonVideo.innerHTML = '<span class="material-icons" style="font-size:15px;margin-bottom:-0.25rem;">add_location</span> Add Marker';

let times = [];
let captionsList = [];

let imgs_map = {};

buttonVideo.addEventListener('click', function(event) {
    event.preventDefault();
    const video_elm = document.querySelector('video#primaryVideo')
    video_elm.pause();
    const data = {
        time_sec: Number(video_elm.currentTime),
        time_tot: Number(video_elm.duration),
    }
    times.push(data);
    console.log("times", times);

    // generate image
    const canvas = document.createElement('canvas');
    // canvas.width = video_elm.videoWidth;
    // canvas.height = video_elm.videoHeight;
    canvas.height = 480;
    canvas.width = Math.round(video_elm.videoWidth * canvas.height / video_elm.videoHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video_elm, 0, 0, canvas.width, canvas.height);
    imgs_map[data.time_sec] = canvas.toDataURL('image/png').split(',')[1];

    // Send a message to the background script
    chrome.runtime.sendMessage({action: "addMarker", times});
});

document.querySelector('#eventTabControl').appendChild(buttonVideo);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log("content.js: onMessage");
    // console.log(request);
    if (request.action === "removeMarker") {
        console.log("removeMarker");
        times = times.filter((_, i) => i !== request.id);
        // imgs_map.remove(tim)
    }
    if (request.action === "downloadFrames") {
        const video_elm = document.querySelector('video#primaryVideo');
        
        const stream = new ReadableStream({
            async start(controller) {
                await downloadSrt();
                let curr_cap = 0;
                for (const t of times) {
                    console.log(curr_cap, captionsList);
                    while (t.time_sec > captionsList[curr_cap].start) {
                        controller.enqueue(new TextEncoder().encode(captionsList[curr_cap].caption + "\n"));
                        curr_cap++;
                    }
                    controller.enqueue(new TextEncoder().encode(`![${t.time_sec}](data:image/png;base64,${imgs_map[t.time_sec]})\n\n`));
                }
                while (curr_cap < captionsList.length) {
                    controller.enqueue(new TextEncoder().encode(captionsList[curr_cap].caption + "\n"));
                    curr_cap++;
                }
                controller.close();
            }
        });

        // Create a response from the stream
        const response = new Response(stream);
        
        // Get the blob from the response
        response.blob().then(blob => {
            // Create a blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            // Send message to background script to initiate download
            chrome.runtime.sendMessage({
                action: "initiateDownload",
                url: blobUrl,
                filename: "captions.md"
            });
        });
    }
});

function captionText(text) {
    return text.replace(/\s+/, " ");
}
function requestCaptionsInfo(videoId) {
    console.log(`requestCaptionsInfo(${videoId})`);
    return fetch(
    location.origin + '/Panopto/Pages/Viewer/DeliveryInfo.aspx', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: 'deliveryId='+videoId+'&getCaptions=true&language=0&responseType=json',
    })
    .then(respose => respose.json())
    .then(data => {
        captionsList = []
        for (let i=0; i < data.length; i++) {
            const caption = captionText(data[i].Caption);
            captionsList.push({start: Number(data[i].Time), caption: caption});
        }
    })
    .catch(error => {
      throw error;
    });
}

function downloadSrt() {
    const url = new URL(location.href)
    const videoId = url.searchParams.get('id');

    if (!videoId) {
        console.error('No videoId found');
        return;
    }

    return requestCaptionsInfo(videoId);
}