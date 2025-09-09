// app.js - Optimized version with Markdown support and refinements
document.addEventListener('DOMContentLoaded', function() {
    // === Global Variables ===
    let conversationHistory = [];

    // === DOM Elements ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const modeToggle = document.getElementById('mode-toggle');
    const modeIcon = document.getElementById('mode-icon');
    const body = document.body;
    const debugButton = document.getElementById('debug-button');

    // Verify DOM elements
    if (!chatContainer) {
        console.error('Error: chat-container not found in DOM');
        return;
    }
    console.log('Chat container:', chatContainer); // Debug log

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            modeIcon.classList.remove('fa-sun');
            modeIcon.classList.add('fa-moon');
        } else {
            body.classList.add('light-mode');
            body.classList.remove('dark-mode');
            modeIcon.classList.remove('fa-moon');
            modeIcon.classList.add('fa-sun');
        }
        localStorage.setItem('theme', theme);
        updateBlobColors(theme);
    };

    const updateBlobColors = (theme) => {
        const blobs = document.querySelectorAll('.background-blobs div');
        const lightColors = {
            'blob-1': ['#E0C3FC', '#8EC5FC'],
            'blob-2': ['#ffdee9', '#b5b5ff'],
            'blob-3': ['#ffaf7b', '#ff7e5f']
        };
        const darkColors = {
            'blob-1': ['#8b5cf6', '#a855f7'],
            'blob-2': ['#F27121', '#E94057'],
            'blob-3': ['#00C6FF', '#0072FF']
        };
        const colors = theme === 'dark' ? darkColors : lightColors;

        blobs.forEach((blob, index) => {
            blob.style.background = `radial-gradient(circle, ${colors[`blob-${index+1}`][0]}, ${colors[`blob-${index+1}`][1]})`;
        });
    };

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = localStorage.getItem('theme');
    applyTheme(currentTheme || (prefersDark ? 'dark' : 'light'));

    function addMessage(content, isUser) {
        if (!chatContainer) {
            console.error('Error: chatContainer is null, cannot add message');
            return;
        }
        console.log('Adding message:', content, 'isUser:', isUser); // Debug log
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'} fade-in`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = isUser ? content : marked.parse(content); // Render Markdown for assistant

        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);

        chatContainer.appendChild(messageDiv); // Immediate append
        scrollToBottom();
    }

    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight; // Force scroll
        }
    }

    function showTypingIndicator() {
        if (!chatContainer) {
            console.error('Error: chatContainer is null, cannot show typing indicator');
            return null;
        }
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator assistant-message fade-in';
        indicator.innerHTML = `
            <div class="message-content">
                <div class="message-text">SATHI is thinking...</div>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatContainer.appendChild(indicator);
        scrollToBottom();
        return indicator;
    }

    function hideTypingIndicator(indicator) {
        if (indicator) indicator.remove();
    }
//iski ma ka bsda agar ab kaam nhi kiya to
async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, true);
        userInput.value = '';
        sendButton.disabled = true;

        const typingIndicator = showTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: conversationHistory }),
            });

            const data = await response.json();
            console.log('Server response:', data); // Debug log

            if (response.ok) {
                hideTypingIndicator(typingIndicator);
                addMessage(data.response, false);
                conversationHistory = data.history;
            } else {
                hideTypingIndicator(typingIndicator);
                addMessage(`Error: ${data.error}`, false);
            }
        } catch (error) {
            hideTypingIndicator(typingIndicator);
            addMessage('Sorry, there was an error connecting to the server.', false);
            console.error('Error:', error);
        } finally {
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // andi mandi sandi agar tu kaam na kiya to...
    debugButton.addEventListener('click', () => {
        addMessage('This is a test message from SATHI. Clicked via debug button!', false);
        console.log('Debug button clicked, test message added');
    });

    modeToggle.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof gsap !== 'undefined') {
        const blobs = document.querySelectorAll('.background-blobs div');
        blobs.forEach((blob, index) => {
            gsap.to(blob, {
                x: gsap.utils.random(-50, 50),
                y: gsap.utils.random(-50, 50),
                duration: gsap.utils.random(20, 30),
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: index * 0.5
            });
        });
    }

    userInput.focus();

    // Expose chat integration for upload.js
    window.addMessage = addMessage;
    window.conversationHistory = conversationHistory;
});