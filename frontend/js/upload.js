// upload.js - Handles file upload functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadButton = document.getElementById('upload-button');
    const chatButton = document.getElementById('chat-button');
    const uploadContainer = document.getElementById('upload-container');
    const chatContainer = document.getElementById('chat-container');
    const inputArea = document.querySelector('.input-area');
    const fileInput = document.getElementById('file-input');
    const startUpload = document.getElementById('start-upload');
    const uploadStatus = document.getElementById('upload-status');
    const dragDropText = document.querySelector('.drag-drop-text');

    // Initial state
    uploadContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    chatButton.classList.add('hidden');

    // Directly open file browser when upload button is clicked
    if (uploadButton && fileInput) {
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Toggle between upload and chat views
    if (uploadButton && chatButton) {
        chatButton.addEventListener('click', () => {
            chatContainer.classList.remove('hidden');
            inputArea.classList.remove('hidden');
            uploadContainer.classList.add('hidden');
            chatButton.classList.add('hidden');
            uploadButton.classList.remove('hidden');
        });
    }

    // File input handling
    if (dragDropText && fileInput) {
        fileInput.addEventListener('change', handleFileUpload); // Trigger upload on file selection

        dragDropText.addEventListener('click', () => {
            fileInput.click();
        });

        dragDropText.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragDropText.style.borderColor = '#8b5cf6';
            dragDropText.style.background = 'rgba(139, 92, 246, 0.1)';
        });

        dragDropText.addEventListener('dragleave', () => {
            dragDropText.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            dragDropText.style.background = 'transparent';
        });

        dragDropText.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileUpload(); // Trigger upload on drop
            }
        });
    }

    // File upload handling
    if (startUpload) {
        startUpload.addEventListener('click', handleFileUpload);
    }

    async function handleFileUpload() {
        const file = fileInput.files[0];
        if (!file) {
            showUploadStatus('Please select a file first', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showUploadStatus('File size exceeds 10MB limit', 'error');
            return;
        }

        // Show upload container and hide chat
        uploadContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        inputArea.classList.add('hidden');
        uploadButton.classList.add('hidden');
        chatButton.classList.remove('hidden');

        showUploadStatus('Uploading and analyzing document...', 'loading');
        startUpload.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                showUploadStatus(`Analysis of ${data.filename} completed`, 'success');
                
                // Add analysis to chat
                if (window.addMessage) {
                    window.addMessage(`I've analyzed the document "${data.filename}". Here's what I found:`, false);
                    window.addMessage(data.analysis, false);
                    
                    // Update conversation history
                    if (window.conversationHistory) {
                        window.conversationHistory.push({
                            role: 'user', 
                            content: `Please analyze this document: ${data.filename}`
                        });
                        window.conversationHistory.push({
                            role: 'assistant', 
                            content: data.analysis
                        });
                    }
                }

                // Reset and switch back to chat after delay
                setTimeout(() => {
                    fileInput.value = '';
                    if (chatButton) chatButton.click();
                }, 2000);

            } else {
                showUploadStatus(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            showUploadStatus('Error uploading file', 'error');
            console.error('Upload error:', error);
        } finally {
            startUpload.disabled = false;
        }
    }

    function showUploadStatus(message, type = 'info') {
        if (!uploadStatus) return;

        uploadStatus.textContent = message;
        uploadStatus.className = 'upload-status';
        
        switch (type) {
            case 'success':
                uploadStatus.classList.add('success');
                break;
            case 'error':
                uploadStatus.classList.add('error');
                break;
            case 'loading':
                uploadStatus.classList.add('loading');
                break;
        }
    }
});