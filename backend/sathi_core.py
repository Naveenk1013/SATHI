import os
import json
import requests
import time
from dotenv import load_dotenv
from config import HOSPITALITY_SYSTEM_PROMPT

# Load the secure API key from the .env file
load_dotenv()
API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Rate limiting variables
last_request_time = 0
request_interval = 1.5  # seconds between requests

def get_sathi_response(user_input, conversation_history=[]):
    """
    Gets a response from SATHI using the OpenRouter API with rate limiting
    """
    global last_request_time
    
    # Convert conversation history to the format expected by the API
    api_messages = [{"role": "system", "content": HOSPITALITY_SYSTEM_PROMPT}]
    
    # Add conversation history if provided
    for message in conversation_history:
        api_messages.append({"role": message["role"], "content": message["content"]})
    
    # Add the current user input
    api_messages.append({"role": "user", "content": user_input})

    # Implement rate limiting
    current_time = time.time()
    time_since_last_request = current_time - last_request_time
    if time_since_last_request < request_interval:
        time.sleep(request_interval - time_since_last_request)
    
    last_request_time = time.time()
    
    # Retry logic with exponential backoff
    max_retries = 3
    for retry in range(max_retries):
        try:
            # Make the API call using requests
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5000",
                    "X-Title": "SATHI Hospitality AI",
                },
                data=json.dumps({
                    "model": "deepseek/deepseek-chat",
                    "messages": api_messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }),
                timeout=30  # Add a timeout to prevent hanging
            )

            # Check if the request was successful
            if response.status_code == 429:
                # Rate limited - wait and retry
                wait_time = 2 ** retry  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time} seconds before retry {retry + 1}/{max_retries}...")
                time.sleep(wait_time)
                continue
                
            response.raise_for_status()
            
            # Extract the AI's message content
            response_data = response.json()
            ai_message = response_data['choices'][0]['message']['content']
            return ai_message

        except requests.exceptions.Timeout:
            return "Sorry, SATHI is taking too long to respond. Please try again."
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429 and retry < max_retries - 1:
                continue  # Will retry
            return f"HTTP Error: {e}"
        except Exception as e:
            if retry == max_retries - 1:  # Last retry
                return f"Sorry, SATHI encountered an error: {e}"
            time.sleep(1)  # Wait before retrying

    return "SATHI is currently unavailable due to high demand. Please try again later."


def analyze_document(filepath):
    """
    Extract text from various document types for analysis with better PDF handling
    """
    text = ""
    filename = os.path.basename(filepath)
    file_ext = filename.split('.')[-1].lower()
    
    try:
        if file_ext == 'pdf':
            # Try multiple methods to extract text from PDF
            text = extract_text_from_pdf(filepath)
            
        elif file_ext in ['doc', 'docx']:
            # Extract text from Word documents
            doc = docx.Document(filepath)
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
                
        elif file_ext in ['txt']:
            # Read text files directly
            with open(filepath, 'r', encoding='utf-8') as file:
                text = file.read()
                
        else:
            return "Unsupported file format. Please upload PDF, Word, or text documents."
            
        # If we successfully extracted text, analyze it with SATHI
        if text.strip():
            # Prepare a prompt for document analysis
            analysis_prompt = f"""
            Please analyze the following document content and provide a summary along with any key insights relevant to hospitality management:
            
            DOCUMENT CONTENT:
            {text[:3000]}  # Limiting to first 3000 characters to avoid token limits
            
            Please provide:
            1. A brief summary of the document
            2. Key points relevant to hospitality professionals
            3. Any actionable recommendations
            
            Focus on hospitality industry insights, customer service best practices, operational efficiency, 
            and any recommendations that could help tourism and hospitality businesses.
            """
            
            # Use the existing function to get analysis from SATHI
            analysis = get_sathi_response(analysis_prompt, [])
            return analysis
        else:
            return "No text could be extracted from the document. The file might be scanned or contain only images."
            
    except Exception as e:
        return f"Error processing document: {str(e)}"

def extract_text_from_pdf(filepath):
    """
    Extract text from PDF using multiple methods for better reliability
    """
    text = ""
    
    # Method 1: Try pdfplumber (better for most PDFs)
    try:
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            return text
    except ImportError:
        print("pdfplumber not available")
    except Exception as e:
        print(f"pdfplumber failed: {e}")
    
    # Method 2: Try PyPDF2 as fallback
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            return text
    except Exception as e:
        print(f"PyPDF2 failed: {e}")
    
    # Method 3: Try pdfminer as last resort
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract_text
        text = pdfminer_extract_text(filepath)
        if text.strip():
            return text
    except ImportError:
        print("pdfminer not available")
    except Exception as e:
        print(f"pdfminer failed: {e}")
    
    return "Could not extract text from PDF. The file might be scanned or image-based."