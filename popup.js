document.addEventListener('DOMContentLoaded', function() {
  const embedCodeInput = document.getElementById('embedCode');
  const embedButton = document.getElementById('embedButton');

  // Function to extract src URL from embed code
  function extractEmbedSrc(embedCode) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(embedCode, 'text/html');
    const iframe = doc.querySelector('iframe');
    
    if (!iframe) {
      return null;
    }
    
    return iframe.src;
  }

  // Function to inject CSS
  async function injectCSS(tabId) {
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    });
  }

  // Function to check if content script is already injected
  async function isContentScriptInjected(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response === 'pong';
    } catch (error) {
      return false;
    }
  }

  // Function to inject content script
  async function injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      await injectCSS(tabId);
    } catch (error) {
      console.error('Error injecting content script:', error);
      throw error;
    }
  }

  // Function to ensure content script is loaded
  async function ensureContentScript(tabId) {
    const isInjected = await isContentScriptInjected(tabId);
    if (!isInjected) {
      await injectContentScript(tabId);
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Function to handle embedding the video
  async function embedVideo() {
    const embedCode = embedCodeInput.value.trim();
    
    if (!embedCode) {
      alert('Please enter a YouTube embed code');
      return;
    }

    // Extract the embed URL
    const embedSrc = extractEmbedSrc(embedCode);
    
    if (!embedSrc) {
      alert('Invalid embed code. Please make sure to paste the complete iframe code.');
      return;
    }

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Ensure content script is loaded
      await ensureContentScript(tab.id);

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'embedVideo',
        embedCode: embedCode
      });

      // Clear the input and close popup
      embedCodeInput.value = '';
      window.close();
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please refresh the page and try again.');
    }
  }

  // Add click handler for the embed button
  embedButton.addEventListener('click', embedVideo);

  // Add ctrl+enter handler for the textarea
  embedCodeInput.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      embedVideo();
    }
  });

  // Auto-focus the input field when popup opens
  embedCodeInput.focus();
}); 