from flask import Flask, request, jsonify, send_from_directory
from sathi_core import get_sathi_response, analyze_document
import os
import uuid
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration for file uploads
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'doc', 'docx'}

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('../frontend', 'index.html')

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# API endpoint to handle chat messages
@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get response from SATHI
        sathi_response = get_sathi_response(user_message, conversation_history)
        
        # Return the response
        return jsonify({
            'response': sathi_response,
            'history': conversation_history + [
                {'role': 'user', 'content': user_message},
                {'role': 'assistant', 'content': sathi_response}
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


    # Endpoint for file upload and analysis
@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            # Generate a unique filename
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            # Check file size
            file_size = os.path.getsize(filepath)
            if file_size > app.config['MAX_CONTENT_LENGTH']:
                os.remove(filepath)
                return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 400
            
            # Analyze the document
            analysis_result = analyze_document(filepath)
            
            # Clean up the file
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'analysis': analysis_result,
                'filename': filename
            })
        else:
            allowed = ', '.join(app.config['ALLOWED_EXTENSIONS'])
            return jsonify({'error': f'File type not allowed. Please upload {allowed} files.'}), 400
            
    except Exception as e:
        # Clean up file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)

        return jsonify({'error': f'Server error: {str(e)}'}), 500
