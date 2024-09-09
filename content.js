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


const times = [];
buttonVideo.addEventListener('click', function(event) {
    event.preventDefault();
    const video_elm = document.querySelector('video#primaryVideo')
    const data = {
        time_sec: Number(video_elm.currentTime),
        time_tot: Number(video_elm.duration),
    }
    times.push(data);
    console.log("times", times);
    // Send a message to the background script
    chrome.runtime.sendMessage({action: "addMarker", times});
});

document.querySelector('#eventTabControl').appendChild(buttonVideo);


let md_document = "";
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("content.js: onMessage");
    console.log(request);
    if (request.action === "downloadFrames") {
        const video_elm = document.querySelector('video#primaryVideo');
        downloadSrt()
        .then(() => {
            let curr_cap = 0;
            for (const t of times) {
                while (t.time_sec > captionsList[curr_cap].start) {
                    // write into markdown document
                    md_document += captionsList[curr_cap].caption + "\n";
                    curr_cap++;
                }
                video_elm.currentTime = t.time_sec;
                video_elm.play();
                while (video_elm.currentTime < t.time_sec + 0.2) {
                    setTimeout(() => {
                    }, 100);
                }
                video_elm.pause();
                const canvas = document.createElement('canvas');
                canvas.width = video_elm.videoWidth;
                canvas.height = video_elm.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video_elm, 0, 0, canvas.width, canvas.height);
                const img = canvas.toDataURL('image/png');

                // write image into markdown document
                md_document += `![${t.time_sec}](data:image/png;base64,${img})\n`;
            }
            // download markdown document
            const blob = new Blob([md_document], { type: 'text/plain' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = "captions.md";
            document.body.appendChild(a);
            a.click();
        });
    }
});


function timestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const msecs = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')},${msecs.toString().padStart(3,'0')}`;
}
function toRows(text) {
    const words = text.split(/\s+/);
    let currentLine = "";
    let result = "";

    words.forEach(word => {
      if ((currentLine + word).length <= 47) {
          currentLine += (currentLine.length > 0 ? " " : "") + word;
      } else {
          if (currentLine.length > 0) {
              result += currentLine + "\n";
          }
          currentLine = word;
      }
    });

    if (currentLine.length > 0) {
      result += currentLine + "\n";
    }

    return result;
}
let captionsList = [];
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
            const caption = `${i+1}
${timestamp(data[i].Time)} --> ${timestamp(data[i].Time + data[i].CaptionDuration)}
${toRows(data[i].Caption)}
`;
            captionsList.push({start: Number(data[i].Time), caption: caption});
        }
    })
    .catch(error => {
      throw error;
    });
}

// function downloadSrtCaptions(captions) {
//     const blob = new Blob(captions, { type: 'text/plain' });
//     const blobUrl = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = blobUrl;
//     a.download = "caption.srt";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(blobUrl);
// }

function downloadSrt() {
    const url = new URL(location.href)
    const videoId = url.searchParams.get('id');

    if (!videoId) {
        console.error('No videoId found');
        return;
    }

    return requestCaptionsInfo(videoId);
}