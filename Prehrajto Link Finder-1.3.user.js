// ==UserScript==
// @name         Prehrajto Link Finder
// @namespace    original
// @version      1.3
// @description  Show premiumcdn.net links from inline scripts, unique, short, label priority, copy/open, middle-click
// @match        *://*.prehrajto.cz/*
// @updateURL    https://raw.githubusercontent.com/MichelFaraday/PrehrajtoDownloader/main/Prehrajto%20Link%20Finder-1.3.user.js
// @downloadURL  https://raw.githubusercontent.com/MichelFaraday/PrehrajtoDownloader/main/Prehrajto%20Link%20Finder-1.3.user.js
// @author       MichelFaraday
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
  'use strict';

  // ======== Style injection ========
  GM_addStyle(`
    #cdn-finder-button {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #0078d7;
      color: #fff;
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      z-index: 999999;
      font-family: sans-serif;
      font-size: 14px;
    }
    #cdn-finder-panel {
      position: fixed;
      bottom: 50px;
      right: 10px;
      width: 420px;
      max-height: 400px;
      overflow-y: auto;
      background: #fff;
      color: #000;
      border: 1px solid #999;
      border-radius: 5px;
      padding: 8px;
      z-index: 999999;
      display: none;
      font-family: sans-serif;
      font-size: 13px;
    }
    #cdn-finder-panel h3 {
      margin: 0 0 5px 0;
      font-size: 15px;
      font-weight: bold;
    }
    .cdn-item {
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #ccc;
      word-break: break-word;
    }
    .cdn-item .cdn-label {
      color: #0078d7;
      font-weight: bold;
      margin-right: 6px;
    }
    .cdn-item button.copy-btn, .cdn-item button.open-btn {
      background: #0078d7;
      color: #fff;
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
      border-radius: 3px;
      margin-right: 6px;
    }
    .cdn-item button.copy-btn:hover, .cdn-item button.open-btn:hover {
      background: #005ca1;
    }
    /* ADDED: Styles for download button */
    .cdn-item button.download-btn {
      background: #0078d7;
      color: #fff;
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
      border-radius: 3px;
      margin-right: 6px;
    }
    .cdn-item button.download-btn:hover {
      background: #005ca1;
    }
    /* Make short link appear on one line with ellipsis */
    .short-link {
      display: inline-block;
      max-width: 240px;  /* tweak as desired */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
      cursor: default; /* handle middle-click in code */
    }
  `);

  // ======== DOM: add button & panel ========
  const btn = document.createElement('button');
  btn.id = 'cdn-finder-button';
  btn.textContent = 'Find Links';

  const panel = document.createElement('div');
  panel.id = 'cdn-finder-panel';
  panel.innerHTML = `
    <h3>premiumcdn.net Links</h3>
    <div id="cdn-finder-list"></div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  let panelOpen = false;
  btn.addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    if (panelOpen) {
      searchAndDisplay();
    }
  });

  // ======== Logic: find all premiumcdn links, label them, no duplicates, label priority ========
  function searchAndDisplay() {
    const container = document.getElementById('cdn-finder-list');
    container.innerHTML = '';

    // collect <script> content
    let bigText = '';
    document.querySelectorAll('script').forEach(scr => {
      if (scr.textContent) {
        bigText += scr.textContent + '\n';
      }
    });

    const regexLink = /["'](https?:\/\/[^"']*premiumcdn\.net[^"']*)["']/g;
    let match;
    const foundLinks = [];
    while ((match = regexLink.exec(bigText)) !== null) {
      foundLinks.push({
        url: match[1],
        index: match.index
      });
    }

    if (!foundLinks.length) {
      container.innerHTML = '<div>No premiumcdn.net links found in script code.</div>';
      return;
    }

    // We'll store unique URLs in a Map
    // key=url, value={ url, label (if any) }
    const uniqueMap = new Map();

    // We'll look ~300 chars around the link for label: "someLabel"
    const NEARBY_CHARS = 600;

    foundLinks.forEach(item => {
      const startSlice = Math.max(0, item.index );
      const endSlice   = Math.min(bigText.length, item.index + NEARBY_CHARS);
      const slice      = bigText.slice(startSlice, endSlice);

      // Attempt to find label near this link: 'label' : 'xxx' or label: "xxx"
      let label = null;
      const labelRegex = /label\s*:\s*["']([^"']+)["']/;
      const labelMatch = labelRegex.exec(slice);
      if (labelMatch) {
        label = labelMatch[1];
      }

      // If not in map, create new entry
      if (!uniqueMap.has(item.url)) {
        uniqueMap.set(item.url, { url: item.url, label });
      } else {
        // If already in map, update label if new label is found
        const existing = uniqueMap.get(item.url);
        // "Prioritize links with labels" => if new label is found, store it
        if (label && !existing.label) {
          existing.label = label;
        }
      }
    });

    const results = Array.from(uniqueMap.values());
    if (!results.length) {
      container.innerHTML = '<div>No premiumcdn.net links found (unique check).</div>';
      return;
    }

    // Display them
    results.forEach(r => {
      container.appendChild(createCdnItem(r.url, r.label));
    });
  }

  // ======== Build row for each link ========
  function createCdnItem(url, label) {
    const div = document.createElement('div');
    div.className = 'cdn-item';

    // label
    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'cdn-label';
      labelSpan.textContent = `Label: "${label}"`;
      div.appendChild(labelSpan);
    }

    // copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => copyToClipboard(url));
    div.appendChild(copyBtn);

    // open button
    const openBtn = document.createElement('button');
    openBtn.className = 'open-btn';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => {
      window.open(url, '_blank');
    });
    div.appendChild(openBtn);

    // ADDED: If this looks like a subtitle link, add a Download button
    if (isSubtitleLink(url)) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'download-btn';
      downloadBtn.textContent = 'Download';
      downloadBtn.addEventListener('click', () => {
        fetch(url)
          .then(resp => {
            if (!resp.ok) {
              throw new Error('Network error: ' + resp.status);
            }
            return resp.blob();
          })
          .then(blob => {
            const lowerUrl = url.split('?')[0].toLowerCase();
            // Decide file name based on extension
            let fileName = 'subtitle.vtt';
            if (lowerUrl.endsWith('.srt')) {
              fileName = 'subtitle.srt';
            }
            // Force browser save
            const tempUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = tempUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(tempUrl);
          })
          .catch(err => {
            alert('Download failed: ' + err);
          });
      });
      div.appendChild(downloadBtn);
    }

    // shortened link
    const linkSpan = document.createElement('span');
    linkSpan.className = 'short-link';
    linkSpan.title = url;

    // limit link text to 60 chars
    const shortUrl = url.length > 60 ? (url.slice(0, 60) + '…') : url;
    linkSpan.textContent = shortUrl;

    // middle-click open in new tab
    linkSpan.addEventListener('mousedown', e => {
      if (e.button === 1) { // middle-click
        e.preventDefault();
        window.open(url, '_blank');
      }
    });

    div.appendChild(linkSpan);
    return div;
  }

  // ======== Copy logic ========
  function copyToClipboard(text) {
    if (typeof GM_setClipboard !== 'undefined') {
      GM_setClipboard(text, 'text');
      alert('Copied to clipboard!');
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(err => {
        alert('Copy failed: ' + err);
      });
    } else {
      alert('Cannot copy automatically!');
    }
  }

  // ADDED: Checks if URL ends in .vtt or .srt (ignoring query params)
  function isSubtitleLink(url) {
    const lowerUrl = url.split('?')[0].toLowerCase();
    return lowerUrl.endsWith('.vtt') || lowerUrl.endsWith('.srt');
  }

})();
