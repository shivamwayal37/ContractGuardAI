// Global variables
let analysisResults = null;
let counterProposalData = null;
let comparisonData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    setupDragAndDrop();
    loadCommunityStats();
});

// Setup file upload
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    // If the file input is not present in the DOM (different pages/modes), skip wiring up the listener
    if (!fileInput){
        console.log("File is not selected");
        return;
    };

    fileInput.addEventListener('change', function(e) {
        if (e.target && e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            handleFileSelect(file);
        }
    });
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    // If dropzone not present on the current page, skip wiring drag/drop handlers
    if (!dropzone) return;

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        
        // Guard access to dataTransfer in some browsers/environments
        const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
}

// Handle file selection
function handleFileSelect(file) {
    const maxSize = 16 * 1024 * 1024; // 16MB
    
    if (file.size > maxSize) {
        showError('File too large. Please upload files smaller than 16MB.');
        return;
    }
    
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
        showError('Invalid file type. Please upload PDF, DOCX, or TXT files.');
        return;
    }

    selectedFile = file;
    
    // Visual feedback
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
        dropzone.innerHTML = `
            <i class="fas fa-file-alt text-6xl text-green-500 mb-4"></i>
            <p class="text-lg text-gray-700 font-medium">${file.name}</p>
            <p class="text-sm text-gray-500">${formatFileSize(file.size)}</p>
            <button onclick="removeSelectedFile()" 
                    class="mt-4 text-red-600 hover:text-red-700">
                <i class="fas fa-times"></i> Remove
            </button>
        `;
    }
}

// Safely remove selected file (clears file input if present) and reload
function removeSelectedFile() {
    const input = document.getElementById('fileInput');
    if (input) {
        try {
            input.value = '';
        } catch (e) {
            // Some browsers may restrict setting file input value; ignore safely
            console.warn('Could not clear file input value', e);
        }
    }
    location.reload();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Main analyze function
async function analyzeContract() {
    const contractTextEl = document.getElementById('contractText');
    const contractTypeEl = document.getElementById('contractType');
    const contractText = contractTextEl ? contractTextEl.value.trim() : '';
    const contractType = contractTypeEl ? contractTypeEl.value : '';

    // Safely obtain selected file (fileInput may be null)

    // Validate input

    if (!selectedFile && !contractText) {
        showError('Please upload a contract file or paste contract text.');
        return;
    }
    
    if (contractText && contractText.length < 100) {
        showError('Contract text is too short. Please provide a complete contract (at least 100 characters).');
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        let response;
        
        if (selectedFile) {
            // Upload file
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });
        } else {
            // Send text
            response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: contractText,
                    type: contractType || null
                })
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Analysis failed');
        }
        
        const results = await response.json();
        analysisResults = results;
        displayResults(results);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to analyze contract. Please try again.');
    }
}

// Show loading state
function showLoading() {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('error-section').classList.add('hidden');
    document.getElementById('loading-section').classList.remove('hidden');
    
    // Animate progress bar
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 500);
    
    // Store interval ID to clear it later
    window.loadingInterval = interval;
}

// Display results
function displayResults(results) {
    // Clear loading
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }
    
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    
    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    
    // Overall Summary
    document.getElementById('overallSummary').textContent = results.overall_summary || 'Analysis complete.';
    
    // Risk Score
    const riskScore = results.risk_score || 0;
    document.getElementById('riskScore').textContent = riskScore;
    
    // Animate risk circle
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (riskScore / 10) * circumference;
    const riskCircle = document.getElementById('riskCircle');
    riskCircle.style.strokeDashoffset = offset;
    
    // Set color based on risk
    if (riskScore <= 3) {
        riskCircle.style.stroke = '#10b981'; // green
    } else if (riskScore <= 6) {
        riskCircle.style.stroke = '#f59e0b'; // orange
    } else {
        riskCircle.style.stroke = '#ef4444'; // red
    }
    
    // Recommendation
    const recommendation = results.recommendation || 'REVIEW';
    const recommendationEl = document.getElementById('recommendation');
    recommendationEl.textContent = recommendation;
    
    if (recommendation === 'SIGN') {
        recommendationEl.className = 'mt-4 px-6 py-2 rounded-full text-white font-semibold inline-block bg-green-500';
    } else if (recommendation === 'NEGOTIATE') {
        recommendationEl.className = 'mt-4 px-6 py-2 rounded-full text-white font-semibold inline-block bg-yellow-500';
    } else {
        recommendationEl.className = 'mt-4 px-6 py-2 rounded-full text-white font-semibold inline-block bg-red-500';
    }
    
    // Red Flags
    displayFlags('red', results.red_flags || []);
    
    // Yellow Flags
    displayFlags('yellow', results.yellow_flags || []);
    
    // Questions
    displayList('questionsList', results.key_questions_before_signing || []);
    
    // Negotiation Tips
    displayList('negotiationList', results.negotiation_tips || []);
    
    // Missing Protections
    displayList('missingList', results.missing_protections || ['None identified']);
    
    // Positive Aspects
    displayList('positiveList', results.positive_aspects || ['Analysis did not identify specific positive aspects']);
}

// Display flags (red or yellow)
function displayFlags(type, flags) {
    const containerId = type === 'red' ? 'redFlagsContainer' : 'yellowFlagsContainer';
    const container = document.getElementById(containerId);
    
    if (flags.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const color = type === 'red' ? 'red' : 'yellow';
    const icon = type === 'red' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
    const title = type === 'red' ? 'Critical Red Flags' : 'Concerning Issues';
    
    let html = `
        <div class="bg-white rounded-lg card-shadow p-6">
            <h4 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <i class="fas ${icon} text-${color}-500 mr-3"></i>
                ${title}
                <span class="ml-auto text-sm bg-${color}-100 text-${color}-800 px-3 py-1 rounded-full">
                    ${flags.length} found
                </span>
            </h4>
            <div class="space-y-4">
    `;
    
    flags.forEach((flag, index) => {
        const severityColor = flag.severity === 'HIGH' ? 'red' : flag.severity === 'MEDIUM' ? 'yellow' : 'blue';
        
        html += `
            <div class="border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded">
                <div class="flex items-start justify-between mb-2">
                    <h5 class="font-semibold text-gray-800 text-lg">${flag.category || 'Issue ' + (index + 1)}</h5>
                    <span class="text-xs bg-${severityColor}-100 text-${severityColor}-800 px-2 py-1 rounded">${flag.severity || 'MEDIUM'}</span>
                </div>
                
                ${flag.community_insights ? `
                    <div class="bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-lg mb-3 border-2 border-purple-300">
                        <div class="flex items-start mb-2">
                            <i class="fas fa-users text-purple-600 mr-2 mt-1"></i>
                            <p class="text-sm font-medium text-purple-900">${flag.community_insights.warning_message}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                            <div class="bg-white p-2 rounded">
                                <span class="font-semibold text-gray-700">Success Rate:</span>
                                <span class="text-green-600 font-bold">${(flag.community_insights.success_rate_negotiating * 100).toFixed(0)}%</span>
                            </div>
                            ${flag.community_insights.avg_financial_impact > 0 ? `
                                <div class="bg-white p-2 rounded">
                                    <span class="font-semibold text-gray-700">Avg Impact:</span>
                                    <span class="text-red-600 font-bold">${flag.community_insights.avg_financial_impact}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${flag.community_insights.success_stories && flag.community_insights.success_stories.length > 0 ? `
                            <details class="mt-3">
                                <summary class="text-xs text-purple-700 cursor-pointer hover:text-purple-900">
                                    See success stories →
                                </summary>
                                <div class="mt-2 space-y-1">
                                    ${flag.community_insights.success_stories.map(story => `
                                        <p class="text-xs text-gray-700 italic">"${story}"</p>
                                    `).join('')}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${flag.clause_text ? `
                    <div class="bg-white p-3 rounded mb-3 border border-gray-200">
                        <p class="text-sm text-gray-700 italic">"${flag.clause_text}"</p>
                        ${flag.location ? `<p class="text-xs text-gray-500 mt-1">${flag.location}</p>` : ''}
                    </div>
                ` : ''}
                <p class="text-gray-700 mb-3">${flag.explanation || ''}</p>
                ${flag.impact ? `
                    <div class="bg-white p-3 rounded mb-3">
                        <p class="text-sm"><strong>Impact:</strong> ${flag.impact}</p>
                    </div>
                ` : ''}
                ${flag.questions_to_ask && flag.questions_to_ask.length > 0 ? `
                    <div class="mt-3">
                        <p class="text-sm font-medium text-gray-700 mb-1">Questions to ask:</p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            ${flag.questions_to_ask.map(q => `<li>• ${q}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${flag.community_insights && flag.community_insights.tips && flag.community_insights.tips.length > 0 ? `
                    <div class="mt-3 bg-green-50 p-3 rounded">
                        <p class="text-sm font-medium text-green-800 mb-1">💡 Community Tips:</p>
                        <ul class="text-xs text-green-700 space-y-1">
                            ${flag.community_insights.tips.map(tip => `<li>• ${tip}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Display list items
function displayList(elementId, items) {
    const list = document.getElementById(elementId);
    
    if (items.length === 0) {
        list.innerHTML = '<li class="text-gray-500 italic">None identified</li>';
        return;
    }
    
    list.innerHTML = items.map(item => `
        <li class="flex items-start">
            <i class="fas fa-chevron-right text-purple-500 mt-1 mr-2"></i>
            <span>${item}</span>
        </li>
    `).join('');
}

// Show error
function showError(message) {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('error-section').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error-section').scrollIntoView({ behavior: 'smooth' });
}

// Analyze another contract
function analyzeAnother() {
    location.reload();
}

// Download report
function downloadReport() {
    if (!analysisResults) return;
    
    const report = generateTextReport(analysisResults);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-analysis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Generate text report
function generateTextReport(results) {
    let report = '='.repeat(60) + '\n';
    report += 'CONTRACT ANALYSIS REPORT\n';
    report += 'Generated by ContractGuard AI\n';
    report += '='.repeat(60) + '\n\n';
    
    report += `RISK SCORE: ${results.risk_score}/10\n`;
    report += `RECOMMENDATION: ${results.recommendation}\n\n`;
    
    report += `SUMMARY:\n${results.overall_summary}\n\n`;
    
    if (results.red_flags && results.red_flags.length > 0) {
        report += '='.repeat(60) + '\n';
        report += 'CRITICAL RED FLAGS\n';
        report += '='.repeat(60) + '\n\n';
        results.red_flags.forEach((flag, i) => {
            report += `${i + 1}. ${flag.category} [${flag.severity}]\n`;
            if (flag.clause_text) report += `   Quote: "${flag.clause_text}"\n`;
            report += `   ${flag.explanation}\n`;
            if (flag.impact) report += `   Impact: ${flag.impact}\n`;
            report += '\n';
        });
    }
    
    if (results.yellow_flags && results.yellow_flags.length > 0) {
        report += '='.repeat(60) + '\n';
        report += 'CONCERNING ISSUES\n';
        report += '='.repeat(60) + '\n\n';
        results.yellow_flags.forEach((flag, i) => {
            report += `${i + 1}. ${flag.category}\n`;
            report += `   ${flag.explanation}\n\n`;
        });
    }
    
    if (results.key_questions_before_signing && results.key_questions_before_signing.length > 0) {
        report += '='.repeat(60) + '\n';
        report += 'QUESTIONS TO ASK BEFORE SIGNING\n';
        report += '='.repeat(60) + '\n\n';
        results.key_questions_before_signing.forEach((q, i) => {
            report += `${i + 1}. ${q}\n`;
        });
        report += '\n';
    }
    
    report += '\n' + '='.repeat(60) + '\n';
    report += 'DISCLAIMER: This analysis is for informational purposes only\n';
    report += 'and does not constitute legal advice.\n';
    report += '='.repeat(60) + '\n';
    
    return report;
}

// Share results
function shareResults() {
    if (navigator.share) {
        navigator.share({
            title: 'ContractGuard AI Analysis',
            text: `I analyzed my contract and got a risk score of ${analysisResults.risk_score}/10`,
            url: window.location.href
        });
    } else {
        // Fallback: copy link
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    }
}

// Load sample contract
async function loadSampleContract(type) {
    const samples = {
        rental: `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on [DATE] between:

LANDLORD: Property Management Inc.
TENANT: [Your Name]

1. PROPERTY
The Landlord agrees to rent to the Tenant the property located at 123 Main Street, Apartment 4B.

2. TERM
The lease term is 12 months, beginning [START DATE] and ending [END DATE]. The lease will automatically renew for successive 12-month periods unless either party provides 90 days written notice.

3. RENT
Monthly rent is $2,500, due on the 1st of each month. A late fee of $150 will be assessed for payments received after the 3rd. Additionally, a processing fee of $50 applies to all rent payments.

4. SECURITY DEPOSIT
Tenant shall pay a security deposit of $5,000. Landlord may deduct any amount for damages, unpaid rent, or cleaning fees. Landlord will inspect and return deposit within 60 days after move-out.

5. MAINTENANCE AND REPAIRS
Tenant is responsible for all repairs under $500. This includes plumbing, electrical, HVAC, and appliance repairs. Landlord will handle repairs exceeding $500 only if caused by normal wear and tear.

6. PROPERTY ACCESS
Landlord reserves the right to enter the property at any time with 4 hours notice for inspections, repairs, or showings to prospective tenants or buyers.

7. RENT INCREASES
Landlord may increase rent at any time with 30 days notice. There is no limit to the amount of increase.

8. TERMINATION
Tenant may only terminate this lease by paying 3 months rent as penalty, regardless of reason. Landlord may terminate with 30 days notice for any reason.

9. LIABILITY
Tenant agrees to hold Landlord harmless for any injuries or damages occurring on the property, including those caused by Landlord's negligence or property defects.

10. PETS
No pets allowed under any circumstances. Violation results in immediate eviction and forfeiture of security deposit.

11. DISPUTE RESOLUTION
Any disputes must be resolved through binding arbitration. Tenant waives right to sue in court or participate in class action lawsuits.

12. MODIFICATIONS
Landlord may modify this agreement at any time without tenant consent.`,
        
        employment: `EMPLOYMENT AGREEMENT

This Employment Agreement is between TechCorp Inc. ("Company") and [Employee Name] ("Employee").

1. POSITION AND DUTIES
Employee is hired as Software Developer and agrees to perform all duties assigned by Company, including overtime work as needed without additional compensation.

2. COMPENSATION
Base salary: $80,000 per year, paid bi-weekly. Company reserves right to adjust compensation at any time.

3. WORKING HOURS
Employee agrees to work minimum 50 hours per week. Additional hours may be required during busy periods with no overtime pay.

4. BENEFITS
Health insurance begins after 6 months. No paid time off during first year. Company may change or eliminate benefits at any time.

5. INTELLECTUAL PROPERTY
All work product, ideas, or inventions created by Employee, whether during work hours or personal time, using company resources or not, belongs exclusively to Company.

6. NON-COMPETE
Employee agrees not to work for any technology company or start any technology business for 3 years after leaving Company, anywhere in the United States.

7. NON-DISCLOSURE
Employee must keep all Company information confidential forever, even after employment ends.

8. TERMINATION
Company may terminate employment at any time for any reason with no notice. Employee must give 90 days notice to resign.

9. REPAYMENT
If Employee leaves within 2 years, Employee must repay $10,000 training costs.

10. DISPUTE RESOLUTION
All disputes must be resolved through arbitration. Employee waives right to sue or join class actions.`
    };
    
    const sampleText = samples[type];
    if (sampleText) {
        document.getElementById('contractText').value = sampleText;
        document.getElementById('contractType').value = type;
        document.getElementById('contractText').scrollIntoView({ behavior: 'smooth' });
    }
}

// Load community stats
async function loadCommunityStats() {
    try {
        const response = await fetch('/api/community-stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalContracts').textContent = stats.active_users.toLocaleString();
            document.getElementById('totalSuccessful').textContent = stats.total_successful_negotiations.toLocaleString();
            document.getElementById('totalMoneySaved').textContent = (stats.total_money_saved / 1000000).toFixed(1) + 'M'
            document.getElementById('successRate').textContent = (stats.overall_success_rate * 100).toFixed(0) + '%';
        }
    } catch (error) {
        console.error('Error loading community stats:', error);
    }
}

// Show comparison mode
function showComparison() {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('comparison-section').classList.remove('hidden');
    document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' });
}

// Back to upload
function backToUpload() {
    document.getElementById('comparison-section').classList.add('hidden');
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
}

// Compare contracts
async function compareContracts() {
    const original = document.getElementById('originalContractText').value.trim();
    const revised = document.getElementById('revisedContractText').value.trim();
    const userSide = document.getElementById('userSide').value;
    
    if (!original || !revised) {
        showError('Please provide both original and revised contract text.');
        return;
    }
    
    if (original.length < 100 || revised.length < 100) {
        showError('Contracts are too short. Please provide complete contract text (at least 100 characters each).');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original: original,
                revised: revised,
                user_side: userSide
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Comparison failed');
        }
        
        comparisonData = await response.json();
        displayComparisonResults(comparisonData);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to compare contracts. Please try again.');
    }
}

// Display comparison results
function displayComparisonResults(comparison) {
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }
    
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('comparison-section').classList.add('hidden');
    document.getElementById('comparison-results-section').classList.remove('hidden');
    document.getElementById('comparison-results-section').scrollIntoView({ behavior: 'smooth' });
    
    // Summary
    document.getElementById('comparisonSummary').textContent = comparison.summary || 'Comparison complete.';
    
    // Verdict
    const verdict = comparison.overall_verdict || 'REVIEW';
    const verdictText = document.getElementById('verdictText');
    const verdictIcon = document.getElementById('verdictIcon');
    const verdictBanner = document.getElementById('verdictBanner');
    const verdictExplanation = document.getElementById('verdictExplanation');
    
    verdictExplanation.textContent = comparison.verdict_explanation || '';
    
    if (verdict === 'ACCEPT') {
        verdictText.textContent = '✓ Accept This Revision';
        verdictIcon.textContent = '✓';
        verdictBanner.className = 'flex items-center justify-between mb-6 p-6 rounded-lg bg-green-100 border-2 border-green-500';
    } else if (verdict === 'NEGOTIATE_MORE') {
        verdictText.textContent = '⚠ Negotiate Further';
        verdictIcon.textContent = '⚠';
        verdictBanner.className = 'flex items-center justify-between mb-6 p-6 rounded-lg bg-yellow-100 border-2 border-yellow-500';
    } else {
        verdictText.textContent = '✗ Reject This Revision';
        verdictIcon.textContent = '✗';
        verdictBanner.className = 'flex items-center justify-between mb-6 p-6 rounded-lg bg-red-100 border-2 border-red-500';
    }
    
    // Stats
    document.getElementById('changesFavoringUser').textContent = comparison.changes_favoring_user || 0;
    document.getElementById('changesFavoringOther').textContent = comparison.changes_favoring_other || 0;
    document.getElementById('neutralChanges').textContent = comparison.neutral_changes || 0;
    
    // Detailed changes
    const changesContainer = document.getElementById('detailedChangesContainer');
    const changes = comparison.changes || [];
    
    if (changes.length > 0) {
        let html = '<h4 class="text-xl font-semibold text-gray-800 mb-4">Detailed Changes</h4><div class="space-y-4">';
        changes.forEach((change, index) => {
            const benefitColor = change.who_benefits === 'tenant' || change.who_benefits.includes('user') ? 'green' : 
                                 change.who_benefits === 'neutral' ? 'gray' : 'red';
            const benefitIcon = benefitColor === 'green' ? '✓' : benefitColor === 'red' ? '✗' : '~';
            
            html += `
                <div class="border-l-4 border-${benefitColor}-500 bg-${benefitColor}-50 p-4 rounded">
                    <div class="flex items-start justify-between mb-2">
                        <h5 class="font-semibold text-gray-800">${change.section || 'Change ' + (index + 1)}</h5>
                        <span class="text-2xl">${benefitIcon}</span>
                    </div>
                    ${change.original_text ? `
                        <div class="bg-white p-3 rounded mb-2">
                            <p class="text-xs text-gray-500 mb-1">Original:</p>
                            <p class="text-sm text-gray-700">"${change.original_text}"</p>
                        </div>
                    ` : ''}
                    ${change.revised_text ? `
                        <div class="bg-white p-3 rounded mb-3">
                            <p class="text-xs text-gray-500 mb-1">Revised:</p>
                            <p class="text-sm text-gray-700">"${change.revised_text}"</p>
                        </div>
                    ` : ''}
                    <p class="text-gray-700">${change.explanation || ''}</p>
                </div>
            `;
        });
        html += '</div>';
        changesContainer.innerHTML = html;
    }
    
    // Addressed concerns
    displayList('addressedConcernsList', comparison.addressed_concerns || ['None identified']);
    
    // Ignored concerns
    displayList('ignoredConcernsList', comparison.ignored_concerns || ['None identified']);
    
    // Next steps
    displayList('nextStepsList', comparison.next_steps || comparison.recommendation ? [comparison.recommendation] : ['Review with legal counsel']);
}

// Generate counter-proposal
async function generateCounterProposal() {
    if (!analysisResults) {
        alert('Please analyze a contract first!');
        return;
    }
    
    // Show loading
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('loading-section').classList.remove('hidden');
    document.getElementById('loading-section').scrollIntoView({ behavior: 'smooth' });
    
    try {
        const response = await fetch('/api/counter-proposal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                analysis: analysisResults,
                user_info: {
                    user_name: 'Your Name',
                    other_party_name: 'Landlord',  // Could make this dynamic
                    user_role: 'tenant',
                    contract_type: analysisResults.contract_type_detected || 'contract'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate counter-proposal');
        }
        
        counterProposalData = await response.json();
        displayCounterProposal(counterProposalData);
        
    } catch (error) {
        console.error('Error:', error);
        if (window.loadingInterval) {
            clearInterval(window.loadingInterval);
        }
        document.getElementById('loading-section').classList.add('hidden');
        document.getElementById('results-section').classList.remove('hidden');
        alert('Failed to generate counter-proposal. Please try again.');
    }
}

// Display counter-proposal
function displayCounterProposal(proposal) {
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }
    
    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('counter-proposal-section').classList.remove('hidden');
    document.getElementById('counter-proposal-section').scrollIntoView({ behavior: 'smooth' });
    
    // Revised clauses
    const revisedContainer = document.getElementById('revisedClausesContainer');
    const clauses = proposal.revised_clauses || [];
    
    if (clauses.length > 0) {
        let html = '<h4 class="text-xl font-semibold text-gray-800 mb-4">📝 Proposed Revisions</h4><div class="space-y-4 mb-8">';
        clauses.forEach((clause, index) => {
            html += `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-800 mb-3">${clause.issue || 'Issue ' + (index + 1)}</h5>
                    
                    <div class="bg-red-50 p-3 rounded mb-3">
                        <p class="text-xs text-red-600 font-medium mb-1">❌ Original (Problematic):</p>
                        <p class="text-sm text-gray-700 italic">"${clause.original_clause}"</p>
                    </div>
                    
                    <div class="bg-green-50 p-3 rounded mb-3">
                        <p class="text-xs text-green-600 font-medium mb-1">✓ Proposed Revision:</p>
                        <p class="text-sm text-gray-700 font-medium">"${clause.revised_clause}"</p>
                    </div>
                    
                    <div class="text-sm text-gray-600">
                        <p class="mb-2"><strong>Why this is fair:</strong> ${clause.justification}</p>
                        ${clause.legal_basis ? `<p><strong>Legal basis:</strong> ${clause.legal_basis}</p>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        revisedContainer.innerHTML = html;
    }
    
    // Email template
    const email = proposal.email_template || {};
    document.getElementById('emailSubject').textContent = email.subject || 'Contract Review - Proposed Amendments';
    document.getElementById('emailBody').textContent = email.body || 'Email template not available.';
    
    // Talking points
    const talkingPoints = proposal.talking_points || [];
    if (talkingPoints.length > 0) {
        let html = '<div class="bg-purple-50 p-6 rounded-lg"><h4 class="text-xl font-semibold text-gray-800 mb-4">💬 Your Talking Points</h4><div class="space-y-4">';
        talkingPoints.forEach(point => {
            html += `
                <div class="bg-white p-4 rounded border border-purple-200">
                    <h5 class="font-medium text-gray-800 mb-2">${point.issue}</h5>
                    <p class="text-sm text-gray-700 mb-2"><strong>Your position:</strong> ${point.your_position}</p>
                    <p class="text-sm text-gray-700"><strong>Key argument:</strong> ${point.key_argument}</p>
                </div>
            `;
        });
        html += '</div></div>';
        document.getElementById('talkingPointsContainer').innerHTML = html;
    }
}

// Copy email
function copyEmail() {
    const subject = document.getElementById('emailSubject').textContent;
    const body = document.getElementById('emailBody').textContent;
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    
    navigator.clipboard.writeText(fullEmail).then(() => {
        alert('Email copied to clipboard!');
    });
}

// Copy counter-proposal
function copyCounterProposal() {
    let text = 'COUNTER-PROPOSAL PACKAGE\n\n';
    text += 'REVISED CLAUSES:\n';
    text += document.getElementById('revisedClausesContainer').textContent;
    text += '\n\nEMAIL TEMPLATE:\n';
    text += document.getElementById('emailTemplate').textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Counter-proposal copied to clipboard!');
    });
}

// Back to results
function backToResults() {
    document.getElementById('counter-proposal-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

// Download comparison report
function downloadComparisonReport() {
    if (!comparisonData) return;
    
    let report = '='.repeat(60) + '\n';
    report += 'CONTRACT COMPARISON REPORT\n';
    report += '='.repeat(60) + '\n\n';
    
    report += `VERDICT: ${comparisonData.overall_verdict}\n`;
    report += `${comparisonData.verdict_explanation}\n\n`;
    
    report += `SUMMARY:\n${comparisonData.summary}\n\n`;
    
    report += `CHANGES:\n`;
    report += `  Favoring You: ${comparisonData.changes_favoring_user}\n`;
    report += `  Favoring Them: ${comparisonData.changes_favoring_other}\n`;
    report += `  Neutral: ${comparisonData.neutral_changes}\n\n`;
    
    if (comparisonData.changes && comparisonData.changes.length > 0) {
        report += '='.repeat(60) + '\n';
        report += 'DETAILED CHANGES\n';
        report += '='.repeat(60) + '\n\n';
        comparisonData.changes.forEach((change, i) => {
            report += `${i + 1}. ${change.section}\n`;
            report += `   ${change.explanation}\n\n`;
        });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-comparison-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}