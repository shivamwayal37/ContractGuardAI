from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import logging
from contract_analyzer import ContractAnalyzer
from pdf_processor import PDFProcessor

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend')
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'docx'}

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize analyzers
analyzer = ContractAnalyzer()
pdf_processor = PDFProcessor()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Serve the frontend"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files"""
    return send_from_directory(app.static_folder, path)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Cloud Run"""
    return jsonify({'status': 'healthy', 'service': 'ContractGuard AI'}), 200

@app.route('/api/analyze', methods=['POST'])
def analyze_contract():
    """
    Analyze a contract document
    Accepts: PDF, DOCX, or plain text
    Returns: JSON with analysis results
    """
    try:
        contract_text = None
        contract_type = None
        
        # Check if file was uploaded
        if 'file' in request.files:
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed. Please upload PDF, DOCX, or TXT'}), 400
            
            # Save file temporarily
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Extract text based on file type
            file_ext = filename.rsplit('.', 1)[1].lower()
            
            if file_ext == 'pdf':
                contract_text = pdf_processor.extract_text_from_pdf(filepath)
            elif file_ext == 'docx':
                contract_text = pdf_processor.extract_text_from_docx(filepath)
            elif file_ext == 'txt':
                with open(filepath, 'r', encoding='utf-8') as f:
                    contract_text = f.read()
            
            # Clean up temporary file
            os.remove(filepath)
            
        # Check if text was provided directly
        elif request.is_json:
            data = request.get_json()
            contract_text = data.get('text')
            contract_type = data.get('type')  # Optional: rental, employment, etc.
        
        else:
            return jsonify({'error': 'No contract provided. Please upload a file or provide text.'}), 400
        
        # Validate contract text
        if not contract_text or len(contract_text.strip()) < 100:
            return jsonify({'error': 'Contract text is too short. Please provide a complete contract.'}), 400
        
        logger.info(f"Analyzing contract of length: {len(contract_text)} characters")
        
        # Analyze the contract
        analysis = analyzer.analyze(contract_text, contract_type)
        
        logger.info(f"Analysis complete. Risk score: {analysis.get('risk_score', 'N/A')}")
        
        return jsonify(analysis), 200
    
    except Exception as e:
        logger.error(f"Error analyzing contract: {str(e)}")
        return jsonify({
            'error': 'Failed to analyze contract',
            'message': str(e)
        }), 500

@app.route('/api/sample-contracts', methods=['GET'])
def get_sample_contracts():
    """Return list of sample contracts for demo"""
    samples = [
        {
            'id': 'rental-bad',
            'name': 'Problematic Rental Agreement',
            'description': 'A rental contract with multiple red flags',
            'type': 'rental'
        },
        {
            'id': 'employment-medium',
            'name': 'Employment Contract with Concerns',
            'description': 'An employment agreement with some concerning clauses',
            'type': 'employment'
        },
        {
            'id': 'nda-good',
            'name': 'Fair Non-Disclosure Agreement',
            'description': 'A balanced NDA with standard protections',
            'type': 'nda'
        }
    ]
    return jsonify(samples), 200

@app.route('/api/compare', methods=['POST'])
def compare_contracts():
    """
    Compare two versions of a contract
    Accepts: original and revised contract text
    """
    try:
        data = request.get_json()
        original = data.get('original')
        revised = data.get('revised')
        user_side = data.get('user_side', 'tenant')
        
        if not original or not revised:
            return jsonify({'error': 'Both original and revised contracts required'}), 400
        
        if len(original) < 100 or len(revised) < 100:
            return jsonify({'error': 'Contracts too short. Please provide complete contract text.'}), 400
        
        logger.info(f"Comparing contracts for {user_side}")
        
        comparison = analyzer.compare_contracts(original, revised, user_side)
        
        logger.info(f"Comparison complete. Verdict: {comparison.get('overall_verdict')}")
        
        return jsonify(comparison), 200
    
    except Exception as e:
        logger.error(f"Error comparing contracts: {str(e)}")
        return jsonify({
            'error': 'Failed to compare contracts',
            'message': str(e)
        }), 500

@app.route('/api/counter-proposal', methods=['POST'])
def create_counter_proposal():
    """
    Generate counter-proposal based on analysis
    """
    try:
        data = request.get_json()
        analysis = data.get('analysis')
        user_info = data.get('user_info', {})
        
        if not analysis:
            return jsonify({'error': 'Analysis results required'}), 400
        
        # Set defaults for user_info
        if 'user_name' not in user_info:
            user_info['user_name'] = 'Your Name'
        if 'other_party_name' not in user_info:
            user_info['other_party_name'] = 'Other Party'
        if 'user_role' not in user_info:
            user_info['user_role'] = 'tenant'
        
        logger.info(f"Generating counter-proposal for {user_info.get('user_role')}")
        
        counter_proposal = analyzer.generate_counter_proposal(analysis, user_info)
        
        logger.info("Counter-proposal generated successfully")
        
        return jsonify(counter_proposal), 200
    
    except Exception as e:
        logger.error(f"Error creating counter-proposal: {str(e)}")
        return jsonify({
            'error': 'Failed to generate counter-proposal',
            'message': str(e)
        }), 500

@app.route('/api/community-stats', methods=['GET'])
def get_community_stats():
    """Get aggregated community statistics"""
    try:
        from community_data import get_aggregated_stats
        stats = get_aggregated_stats()
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error getting community stats: {str(e)}")
        return jsonify({'error': 'Failed to get community statistics'}), 500

@app.errorhandler(413)
def file_too_large(e):
    """Handle file size exceeded error"""
    return jsonify({
        'error': 'File too large',
        'message': 'Please upload files smaller than 16MB',
        'suggestion': 'Try compressing your PDF or splitting large documents'
    }), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        'error': 'Internal server error',
        'message': 'Something went wrong. Please try again.'
    }), 500

if __name__ == '__main__':
    # Get port from environment variable (Cloud Run provides this)
    port = int(os.environ.get('PORT', 8080))
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('FLASK_ENV') == 'development'
    )