class YouTubePlayer {
  constructor() {
    this.container = null;
    this.player = null;
    this.playerWrapper = null;
    this.isVisible = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialX = 0;
    this.initialY = 0;

    this.init();
    this.setupKeyboardShortcuts();
  }

  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'youtube-player-container hidden';
    
    // Create drag handle
    const handle = document.createElement('div');
    handle.className = 'youtube-player-handle';

    // Create left side of handle (drag indicator and title)
    const handleLeft = document.createElement('div');
    handleLeft.className = 'handle-left';
    handleLeft.textContent = 'Advertisement';
    handle.appendChild(handleLeft);

    // Create right side of handle (close button)
    const handleRight = document.createElement('div');
    handleRight.className = 'handle-right';
    
    const closeButton = document.createElement('div');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close (Ctrl+Shift+X)';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent drag start
      this.close();
    });
    
    handleRight.appendChild(closeButton);
    handle.appendChild(handleRight);

    this.container.appendChild(handle);

    // Create player wrapper
    this.playerWrapper = document.createElement('div');
    this.playerWrapper.className = 'youtube-player-wrapper';
    this.container.appendChild(this.playerWrapper);

    // Add drag functionality
    handle.addEventListener('mousedown', this.startDragging.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));

    // Ensure container stays within viewport
    this.container.style.left = '20px';
    this.container.style.top = '20px';

    document.body.appendChild(this.container);

    // Add keyboard shortcut handler to window to ensure it works globally
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  embedVideo(embedCode) {
    if (!embedCode) return;
    
    // Parse the embed code
    const parser = new DOMParser();
    const doc = parser.parseFromString(embedCode, 'text/html');
    const iframe = doc.querySelector('iframe');
    
    if (!iframe) return;
    
    // If player already exists, remove it
    if (this.player) {
      this.player.remove();
    }
    
    // Create new iframe with the embed code but maintain our sizing
    this.player = iframe.cloneNode(true);
    this.player.style.width = '100%';
    this.player.style.height = '100%';
    this.player.style.border = 'none';
    
    // Add additional parameters to enable API and hide controls when needed
    const srcUrl = new URL(this.player.src);
    srcUrl.searchParams.set('enablejsapi', '1');
    srcUrl.searchParams.set('controls', '1');
    srcUrl.searchParams.set('rel', '0');
    this.player.src = srcUrl.toString();

    // Clear and append to wrapper
    this.playerWrapper.innerHTML = '';
    this.playerWrapper.appendChild(this.player);

    // Add overlay div for mouse events when dragging
    this.setupDragOverlay();
  }

  setupDragOverlay() {
    // Create an overlay div that will be shown only during dragging
    const overlay = document.createElement('div');
    overlay.className = 'youtube-player-overlay';
    overlay.style.cssText = `
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
    `;
    this.playerWrapper.appendChild(overlay);
  }

  startDragging(e) {
    // Only start dragging from handle-left or the handle itself, not from close button
    if (e.target.className === 'youtube-player-handle' || 
        e.target.className === 'handle-left') {
      this.isDragging = true;
      this.container.classList.add('dragging');
      
      // Show overlay while dragging
      const overlay = this.playerWrapper.querySelector('.youtube-player-overlay');
      if (overlay) {
        overlay.style.display = 'block';
      }

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialX = this.container.offsetLeft;
      this.initialY = this.container.offsetTop;
      e.preventDefault();
    }
  }

  drag(e) {
    if (!this.isDragging) return;

    e.preventDefault();
    
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    // Calculate new position
    let newX = this.initialX + dx;
    let newY = this.initialY + dy;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    // Keep container within viewport bounds
    newX = Math.max(0, Math.min(newX, viewportWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, viewportHeight - containerHeight));

    this.container.style.left = `${newX}px`;
    this.container.style.top = `${newY}px`;
  }

  stopDragging() {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.classList.remove('dragging');
      
      // Hide overlay after dragging
      const overlay = this.playerWrapper.querySelector('.youtube-player-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
  }

  close() {
    // Stop video playback
    if (this.player) {
      this.player.src = '';
    }
    // Hide the container
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('hidden');
  }

  togglePlayback() {
    if (!this.player) return;
    
    try {
      // Send postMessage to iframe to toggle playback
      this.player.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'togglePlayback'
      }), '*');
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }

  handleKeyDown(e) {
    // Stop event from reaching iframe if it's our shortcut
    if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'X' || e.code === 'Space')) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.key === 'Z') {
        this.toggleVisibility();
      } else if (e.key === 'X') {
        this.close();
      } else if (e.code === 'Space') {
        this.togglePlayback();
      }
    }
  }

  setupKeyboardShortcuts() {
    // Remove old event listener if it exists
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

// Initialize the player
const player = new YouTubePlayer();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle ping message for script injection detection
  if (request.action === 'ping') {
    sendResponse('pong');
    return true;
  }
  
  // Handle embed video message
  if (request.action === 'embedVideo') {
    player.embedVideo(request.embedCode);
    player.toggleVisibility();
    sendResponse({ success: true });
    return true;
  }
}); 