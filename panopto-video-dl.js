// ==UserScript==
// @name         Panopto-Video-DL
// @namespace    https://github.com/Panopto-Video-DL
// @description  Video downloader for Panopto
// @icon         https://www.panopto.com/wp-content/themes/panopto/library/images/favicons/favicon-96x96.png
// @author       Panopto-Video-DL
// @version      3.3.0
// @copyright    2021, Panopto-Video-DL
// @license      MIT
// @homepage     https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser
// @homepageURL  https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser
// @supportURL   https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser/issues
// @require      https://greasyfork.org/scripts/401626-notify-library/code/Notify%20Library.js
// @match        https://*.panopto.com/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.com/Panopto/Pages/Sessions/List.aspx*
// @match        https://*.panopto.eu/Panopto/Pages/Sessions/List.aspx*
// @connect      panopto.com
// @connect      panopto.eu
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/423661/Panopto-Video-DL.user.js
// @updateURL https://update.greasyfork.org/scripts/423661/Panopto-Video-DL.meta.js
// ==/UserScript==

// (function() {
    // 'use strict';
const panoptoVideoDL_Script = function() {
  
    addStyle('#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:70%;padding:2em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:1050}#Panopto-Video-DL *{margin-bottom:10px;color:#fff!important;font-size:18px;}#Panopto-Video-DL > div {margin-top: 1em;}#Panopto-Video-DL ul,#Panopto-Video-DL ol,#Panopto-Video-DL li{margin:0 .5em;padding:0 .5em;list-style:decimal}#Panopto-Video-DL button{margin-left:5px;margin-right:5px;color:#000!important;font-size:16px;}#Panopto-Video-DL p{margin-top:0.5em;}#Panopto-Video-DL input{color:black!important;}#Panopto-Video-DL textarea{width:100%;color:black!important;resize:vertical;white-space:nowrap;}')
  
    const buttonVideo = document.createElement('a');
    buttonVideo.href = '#';
    buttonVideo.innerHTML = '<span class="material-icons" style="font-size:15px;margin-bottom:-0.25rem;">file_download</span> Download Video';
    const buttonCaptions = document.createElement('a');
    buttonCaptions.href = '#';
    buttonCaptions.innerHTML = '<span class="material-icons" style="font-size:15px;margin-bottom:-0.25rem;">file_download</span> Download Captions';
  
    if (location.pathname.includes('/List.aspx')) {
      console.log(`true: location.pathname.includes('/List.aspx')`)
      buttonVideo.addEventListener('click', e => {
        console.log('button clicked')
        e.preventDefault();
        e.stopPropagation();
  
        let _t;
        const list = (_t = document.querySelectorAll('#listTable tbody > tr a.list-title')).length ?
              _t : (_t = document.querySelectorAll('#detailsTable tbody > tr a.detail-title')).length ?
              _t : (_t = document.querySelectorAll('#thumbnailGrid > li a.detail-title')).length ?
              _t : null;
        if (!list) {
          log('No videos found', 'error');
          new Notify({
            text: 'No videos found',
            type: 'error'
          }).show();
          return;
        }
  
        const n = new Notify({
          text: 'Getting links. Please wait',
          type: 'info',
          timeout: 2000
        });
        n.show();
  
        const requestsList = [...list].map(item => {
          let videoId = new URL(item.getAttribute('href')).searchParams.get('id');
          const videoTitle = item.textContent.trim();
          return requestDeliveryInfo(videoId)
            .catch(error => {
              new Notify({
                text: 'Failed to get lesson link for "'+videoTitle+'"',
                type: 'error',
                timeout: null
              }).show();
            });
        });
  
        Promise.allSettled(requestsList)
          .then(responses => {
          console.log(`responses:${responses}`)
          // log(responses)
          n.close();
          let copyText = '';
          responses.forEach(response => {
            if (response.status == 'fulfilled' && response.value) {
              const streamUrl = response.value?.[0];
              if (streamUrl)
                copyText += streamUrl + '\n';
            }
          });
          if (copyText !== '')
            copyToClipboard(copyText);
        });
      });
      const li = document.createElement('li');
      li.appendChild(buttonVideo);
      li.appendChild(buttonCaptions);
      document.querySelector('ul.action-buttons').appendChild(li);
    }
    else if (location.pathname.includes('/Viewer.aspx')) {
      console.log(`true: location.pathname.includes('/Viewer.aspx')`)
      const url = new URL(location.href)
      const videoId = url.searchParams.get('id');
      console.log(`url:${url}`)
  
      buttonVideo.classList = 'event-tab-header';
      buttonVideo.style = 'display:inline-flex;align-items:center;position:absolute;bottom:60px;padding:5px 10px;text-decoration:none;cursor:pointer;';
      buttonCaptions.classList = 'event-tab-header';
      buttonCaptions.style = 'display:inline-flex;align-items:center;position:absolute;bottom:30px;padding:5px 10px;text-decoration:none;cursor:pointer;';
  
      buttonVideo.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
  
        if (!videoId) {
          new Notify({
            text: 'Failed to get Lesson ID.',
            type: 'error',
            timeout: null
          }).show();
          return;
        }
  
        const n = new Notify({
          text: 'Getting links. Please wait',
          type: 'info',
          timeout: 2000
        });
        n.show();
  
        requestDeliveryInfo(videoId)
          .then(_streams => {
            const streamUrl = _streams[0];
            const streams = _streams[1];
            console.log(`streamUrl:${streamUrl}`)
            console.log(`streams:${streams}`)
  
            if (streamUrl.endsWith('master.m3u8')) {
              if (localStorage.getItem('popup-viewed') != 'true')
                showModal('<h1 style="text-align:center;font-size:30px;">READ ME</h1> <p>To download the video follow these steps:</p> <ol><li>Download this program from <a href="https://github.com/Panopto-Video-DL/Panopto-Video-DL" target="_blank">GitHub</a> (No installation needed) and open it</li> <li>Paste the automatically copied link</li> <li>Set the destination folder</li> <li>Wait for the download to finish</li> </ol> <p style="text-align:center;"> <button onclick="this.parentElement.parentElement.remove();">Close</button> <button onclick="localStorage.setItem(\'popup-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button> </p>');
  
              copyToClipboard(streamUrl);
            }
            else {
              if (typeof GM_openInTab !== 'undefined')
                GM_openInTab(streamUrl, false);
              else
                window.open(streamUrl);
            }
  
            if (streams.length && localStorage.getItem('other-source-viewed') != 'true') {
              const modal = showModal('<h2 style="font-size:20px;">Download another source video</h2><ul></ul><p style="text-align:center;"><button onclick="this.parentElement.parentElement.remove();">Close</button><button onclick="localStorage.setItem(\'other-source-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button></p>');
              streams.forEach((value, index) => {
                const li = document.createElement('li');
                li.innerHTML = (value.Name?.replace(/-?(\d{8}T\d+Z)+((.)?(\w+))?/g, '').replace(/_/g, ' ') || 'Stream '+(index+1)) + '<button>Copy</button>';
                li.querySelector('button').addEventListener('click', (e) => { copyToClipboard(value.StreamUrl); })
                modal.querySelector('ul').appendChild(li);
              });
            }
          })
          .catch(error => {
            new Notify({
              text: 'Failed to get lesson link',
              type: 'error',
              timeout: null
            }).show();
          })
          .finally(() => n.close());
      });
  
      buttonCaptions.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          console.log('click')
  
          if (!videoId) {
              new Notify({
                  text: 'Failed to get Lesson ID.',
                  type: 'error',
                  timeout: null
              }).show();
              return;
          }
  
          const n = new Notify({
              text: 'Getting captions. Please wait',
              type: 'info',
              timeout: 2000
          });
          n.show();
  
          requestCaptionsInfo(videoId)
              .then(_captions_all => {
                  if (localStorage.getItem('popup-viewed') != 'true') {
                      downloadSrtCaptions(_captions_all)
                      //showModal(_captions_all)
                  }
              })
              .catch(error => {
                  new Notify({
                      text: 'Failed to get captions',
                      type: 'error',
                      timeout: null
                  }).show();
              })
              .finally(() => n.close());
      });
      document.querySelector('#eventTabControl').appendChild(buttonVideo);
      document.querySelector('#eventTabControl').appendChild(buttonCaptions);
    }
  
  
    // Functions
    function requestDeliveryInfo(videoId) {
      console.log(`requestDeliveryInfo(videoId:${videoId})`)
      return fetch(
        location.origin + '/Panopto/Pages/Viewer/DeliveryInfo.aspx', {
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: 'deliveryId='+videoId+'&isEmbed=true&responseType=json',
          //body: 'deliveryId='+videoId+'&isEmbed=true&responseType=json',
        })
        .then(respose => respose.json())
        .then(data => {
          const errorCode = data.ErrorCode;
          if (errorCode)
            throw new Error(data.ErrorMessage ?? '', { code: errorCode ?? -1 });
  
          const streamUrl = data.Delivery?.PodcastStreams[0]?.StreamUrl;
          const streams = (data.Delivery?.Streams || []).filter(x => x.StreamUrl != streamUrl);
          if (!streamUrl)
            throw new Error('Stream URL not ready yet');
          return [streamUrl, streams];
        })
        .catch(error => {
          log(error);
          throw error;
        });
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
          const errorCode = data.ErrorCode;
          if (errorCode) {
            throw new Error(data.ErrorMessage ?? '', { code: errorCode ?? -1 });
          }
          const captionsList = []
          for (let i=0; i < data.length; i++) {
              const caption = `${i+1}
  ${timestamp(data[i].Time)} --> ${timestamp(data[i].Time + data[i].CaptionDuration)}
  ${toRows(data[i].Caption)}
  `;
              captionsList.push(caption);
          }
          return captionsList;
        })
        .catch(error => {
          log(error);
          throw error;
        });
    }
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
  
    function copyToClipboard(text) {
      console.log(`copyToClipboard(text:${text})`)
      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(text, 'text');
        new Notify({
          text: 'Copied!',
          type: 'success'
        }).show();
      } else {
        navigator.clipboard.writeText(text).then(() => {
          new Notify({
            text: 'Copied!',
            type: 'success'
          }).show();
        }).catch(e => {
          log(e);
          const modal = showModal('<h3>There was an error when copying the download link</h3> <p>Copy it manually:</p><textarea type="text" value="" rows="3" onclick="this.select();"></textarea><p style="text-align:center;"><button onclick="this.parentElement.parentElement.remove();">Close</button></p>');
          modal.querySelector('textarea').value = text;
        });
      }
    }
  
    function downloadSrtCaptions(captions) {
            const blob = new Blob(captions, { type: 'text/plain' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = "caption.srt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
    }
  
    function showModal(html) {
      console.log(`showModal(html:${html})`)
      const div = document.createElement('div');
      div.innerHTML = html;
      if (document.querySelector('#Panopto-Video-DL')) {
        const hr = document.createElement('hr');
        div.prepend(hr);
        document.querySelector('#Panopto-Video-DL').append(div);
      } else {
        div.id = 'Panopto-Video-DL';
        document.querySelector('body').appendChild(div);
      }
      return div;
    }
  
    function addStyle(CSS) {
      console.log(`addStyle(CSS:${CSS})`)
      if (typeof GM_addStyle != 'undefined') {
        GM_addStyle(CSS);
      } else {
        const style = document.createElement('style');
        style.innerText = CSS;
        document.head.appendChild(style);
      }
    }
  
    function log(message, level='log') {
      console[level]('%c Panopto-Video-DL ->', 'color:red;font-size:14px;', message);
    }
};
//   })();