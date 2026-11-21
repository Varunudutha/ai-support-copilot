/**
 * AI Support Copilot - Embeddable Chat Widget
 *
 * Usage:
 * <script src="https://your-domain.com/widget.js" data-workspace-id="YOUR_WORKSPACE_ID" async></script>
 *
 * Or programmatically:
 * window.AISupportCopilot = { workspaceId: 'YOUR_WORKSPACE_ID' };
 * (function() { var s = document.createElement('script'); s.src = 'https://your-domain.com/widget.js'; s.async = true; document.head.appendChild(s); })();
 */

(function() {
  'use strict';

  // Configuration from script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-workspace-id]');
  const workspaceId = scriptTag?.dataset?.workspaceId || window.AISupportCopilot?.workspaceId;

  if (!workspaceId) {
    console.error('[AI Support Copilot] No workspaceId provided. Add data-workspace-id to script tag or set window.AISupportCopilot.workspaceId');
    return;
  }

  // Widget state
  let isOpen = false;
  let isMinimized = false;
  let messages = [];
  let conversationId = null;
  let sessionId = null;
  let config = null;
  let unreadCount = 0;
  let isTyping = false;

  // DOM elements
  let widgetContainer = null;
  let widgetButton = null;
  let widgetPanel = null;
  let messageList = null;
  let messageInput = null;
  let unreadBadge = null;

  // API base URL
  const apiBase = `${window.location.origin}/api`;

  // Initialize widget
  async function init() {
    try {
      // Load session ID from localStorage
      sessionId = localStorage.getItem(`aisc_session_${workspaceId}`);
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem(`aisc_session_${workspaceId}`, sessionId);
      }

      // Fetch widget config
      config = await fetchWidgetConfig();

      // Create widget DOM
      createWidgetDOM();

      // Load existing conversation if any
      conversationId = localStorage.getItem(`aisc_conversation_${workspaceId}`);
      if (conversationId) {
        await loadConversation(conversationId);
      } else {
        showGreeting();
      }

      // Add event listeners
      attachEventListeners();

      console.log('[AI Support Copilot] Widget initialized for workspace:', workspaceId);
    } catch (error) {
      console.error('[AI Support Copilot] Failed to initialize widget:', error);
      showError('Unable to load chat widget. Please refresh the page.');
    }
  }

  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async function fetchWidgetConfig() {
    const response = await fetch(`${apiBase}/workspaces/${workspaceId}/widget/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to load widget configuration');
    }

    return response.json();
  }

  function createWidgetDOM() {
    // Create container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'aisc-widget-container';
    widgetContainer.style.cssText = `
      position: fixed;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create toggle button
    widgetButton = document.createElement('button');
    widgetButton.id = 'aisc-widget-button';
    widgetButton.setAttribute('aria-label', 'Open chat');
    widgetButton.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: ${config.primaryColor};
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    widgetButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    // Unread badge
    unreadBadge = document.createElement('span');
    unreadBadge.id = 'aisc-unread-badge';
    unreadBadge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      border-radius: 9px;
      display: none;
      align-items: center;
      justify-content: center;
    `;
    widgetButton.appendChild(unreadBadge);

    // Create panel (hidden initially)
    widgetPanel = document.createElement('div');
    widgetPanel.id = 'aisc-widget-panel';
    widgetPanel.style.cssText = `
      position: absolute;
      ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      bottom: 70px;
      width: 360px;
      max-height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    `;

    // Panel header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      background: ${config.primaryColor};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    header.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 14px;">${escapeHtml(config.title)}</div>
        <div style="font-size: 12px; opacity: 0.9;">${escapeHtml(config.subtitle)}</div>
      </div>
      <button id="aisc-close-btn" style="
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Message list
    messageList = document.createElement('div');
    messageList.id = 'aisc-message-list';
    messageList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
    `;

    // Typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'aisc-typing-indicator';
    typingIndicator.style.cssText = `
      padding: 8px 16px;
      display: none;
      color: #6b7280;
      font-size: 13px;
      font-style: italic;
    `;
    typingIndicator.textContent = 'AI is typing...';

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    `;
    inputArea.innerHTML = `
      <textarea
        id="aisc-message-input"
        placeholder="Type a message..."
        style="
          flex: 1;
          min-height: 44px;
          max-height: 120px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        "
        aria-label="Type your message"
      ></textarea>
      <button
        id="aisc-send-btn"
        style="
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: none;
          background: ${config.primaryColor};
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        "
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    `;

    // Assemble panel
    widgetPanel.appendChild(header);
    widgetPanel.appendChild(messageList);
    widgetPanel.appendChild(typingIndicator);
    widgetPanel.appendChild(inputArea);

    // Add to container
    widgetContainer.appendChild(widgetButton);
    widgetContainer.appendChild(widgetPanel);

    // Add to page
    document.body.appendChild(widgetContainer);

    // Get references
    messageInput = document.getElementById('aisc-message-input');
  }

  function attachEventListeners() {
    // Toggle button
    widgetButton.addEventListener('click', toggleWidget);

    // Close button
    document.getElementById('aisc-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeWidget();
    });

    // Send button
    document.getElementById('aisc-send-btn').addEventListener('click', sendMessage);

    // Enter to send, Shift+Enter for newline
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isOpen && !widgetContainer.contains(e.target)) {
        closeWidget();
      }
    });
  }

  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function openWidget() {
    isOpen = true;
    widgetPanel.style.display = 'flex';
    widgetButton.style.transform = 'scale(0.9)';
    setTimeout(() => widgetButton.style.transform = '', 150);
    messageInput?.focus();
    unreadCount = 0;
    updateUnreadBadge();
  }

  function closeWidget() {
    isOpen = false;
    widgetPanel.style.display = 'none';
  }

  function updateUnreadBadge() {
    if (unreadCount > 0 && !isOpen) {
      unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      unreadBadge.style.display = 'flex';
    } else {
      unreadBadge.style.display = 'none';
    }
  }

  async function loadConversation(id) {
    try {
      const response = await fetch(`${apiBase}/workspaces/${workspaceId}/widget/conversations/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      messages = data.messages || [];
      renderMessages();
      scrollToBottom();
    } catch (error) {
      console.error('[AI Support Copilot] Failed to load conversation:', error);
      // If conversation not found, clear and start fresh
      localStorage.removeItem(`aisc_conversation_${workspaceId}`);
      conversationId = null;
      showGreeting();
    }
  }

  function showGreeting() {
    addMessage({
      senderType: 'assistant',
      content: config.greetingMessage,
      createdAt: new Date().toISOString(),
    });
  }

  function renderMessages() {
    messageList.innerHTML = '';
    messages.forEach(msg => addMessageToDOM(msg));
    scrollToBottom();
  }

  function addMessageToDOM(msg) {
    const isCustomer = msg.senderType === 'customer';
    const isSystem = msg.senderType === 'system';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      ${isCustomer ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
      max-width: 85%;
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      padding: 10px 14px;
      border-radius: ${isCustomer ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
      font-size: 13px;
      line-height: 1.5;
      ${isCustomer
        ? `background: ${config.primaryColor}; color: white;`
        : isSystem
          ? 'background: #f3f4f6; color: #6b7280; font-style: italic;'
          : 'background: #f3f4f6; color: #1f2937;'
      }
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    `;
    bubble.textContent = msg.content;

    // Add timestamp
    const time = document.createElement('div');
    time.style.cssText = `
      font-size: 10px;
      color: ${isCustomer ? 'rgba(255,255,255,0.7)' : '#9ca3af'};
      margin-top: 4px;
      text-align: ${isCustomer ? 'right' : 'left'};
    `;
    time.textContent = formatTime(msg.createdAt);
    bubble.appendChild(time);

    wrapper.appendChild(bubble);
    messageList.appendChild(wrapper);
  }

  function addMessage(msg) {
    messages.push(msg);
    addMessageToDOM(msg);
    scrollToBottom();

    if (!isOpen && msg.senderType !== 'customer') {
      unreadCount++;
      updateUnreadBadge();
    }
  }

  async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || isTyping) return;

    // Add customer message immediately
    const customerMsg = {
      senderType: 'customer',
      content,
      createdAt: new Date().toISOString(),
    };
    addMessage(customerMsg);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Show typing indicator
    isTyping = true;
    document.getElementById('aisc-typing-indicator').style.display = 'block';
    scrollToBottom();

    try {
      let response;
      if (conversationId) {
        response = await fetch(`${apiBase}/workspaces/${workspaceId}/widget/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({ content }),
        });
      } else {
        response = await fetch(`${apiBase}/workspaces/${workspaceId}/widget/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({
            customer: {
              displayName: 'Website Visitor',
              email: null,
              externalId: sessionId,
            },
            initialMessage: content,
          }),
        });
      }

      isTyping = false;
      document.getElementById('aisc-typing-indicator').style.display = 'none';

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to send message');
      }

      const data = await response.json();

      // Store conversation ID
      if (!conversationId && data.conversation?._id) {
        conversationId = data.conversation._id;
        localStorage.setItem(`aisc_conversation_${workspaceId}`, conversationId);
      }

      // Add AI response if present
      if (data.aiMessage) {
        addMessage(data.aiMessage);
      } else if (data.messages) {
        data.messages.forEach(m => {
          if (m.senderType !== 'customer') addMessage(m);
        });
      }

    } catch (error) {
      isTyping = false;
      document.getElementById('aisc-typing-indicator').style.display = 'none';
      console.error('[AI Support Copilot] Failed to send message:', error);
      addMessage({
        senderType: 'system',
        content: 'Failed to send message. Please try again.',
        createdAt: new Date().toISOString(),
      });
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showError(message) {
    if (widgetContainer) {
      widgetContainer.innerHTML = `
        <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 13px;">
          ${escapeHtml(message)}
        </div>
      `;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();