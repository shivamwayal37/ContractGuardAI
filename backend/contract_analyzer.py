import google.generativeai as genai
import os
import json
import logging
from typing import Dict, Optional
from community_data import get_community_insights, format_community_warning

logger = logging.getLogger(__name__)

class ContractAnalyzer:
    """
    Analyzes contracts using Google's Gemini AI
    Identifies red flags, provides explanations, and risk assessment
    Enhanced with community data and comparison features
    """
    
    def __init__(self):
        """Initialize the Gemini AI model"""
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        logger.info("ContractAnalyzer initialized with Gemini 2.0 Flash")
    
    def analyze(self, contract_text: str, contract_type: Optional[str] = None) -> Dict:
        """
        Analyze a contract and return structured results
        Enhanced with community insights
        
        Args:
            contract_text: The full text of the contract
            contract_type: Optional contract type (rental, employment, nda, etc.)
        
        Returns:
            Dictionary containing analysis results with community data
        """
        try:
            # Generate the analysis prompt
            prompt = self._build_prompt(contract_text, contract_type)
            
            # Get response from Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the response
            analysis = self._parse_response(response.text)
            
            # Enhance with community data
            analysis = self._enrich_with_community_data(analysis)
            
            return analysis
        
        except Exception as e:
            logger.error(f"Error during contract analysis: {str(e)}")
            raise
    
    def compare_contracts(self, original_text: str, revised_text: str, user_side: str = "tenant") -> Dict:
        """
        Compare two versions of a contract and identify changes
        
        Args:
            original_text: Original contract text
            revised_text: Revised contract text  
            user_side: Which side the user is on (tenant/employee/buyer)
        
        Returns:
            Dictionary with comparison results
        """
        prompt = f"""You are a contract comparison expert helping a {user_side}.

Compare these two versions of a contract and provide detailed analysis:

**ANALYSIS REQUIREMENTS:**

1. **IDENTIFY ALL CHANGES**: Every clause that was added, removed, or modified
2. **WINNER ANALYSIS**: For each change, determine who benefits:
   - ✓ Benefits {user_side} 
   - ✗ Benefits other party
   - ~ Neutral or unclear
3. **CONCERNS ADDRESSED**: What red flags from original were fixed
4. **NEW PROBLEMS**: Any new concerning issues introduced
5. **CONCERNS IGNORED**: What major problems remain unfixed
6. **OVERALL VERDICT**: Should the {user_side} accept this revision?

ORIGINAL CONTRACT:
{original_text[:3000]}...

---

REVISED CONTRACT:
{revised_text[:3000]}...

Return ONLY valid JSON with this structure:
{{
  "summary": "2-3 sentence overview of the revision",
  "total_changes": 5,
  "changes_favoring_user": 2,
  "changes_favoring_other": 2,
  "neutral_changes": 1,
  "overall_verdict": "ACCEPT/NEGOTIATE_MORE/REJECT",
  "verdict_explanation": "Why you should accept/negotiate/reject",
  
  "changes": [
    {{
      "section": "Section 3.2 - Security Deposit",
      "change_type": "modified/added/removed",
      "original_text": "Quote from original (if applicable)",
      "revised_text": "Quote from revision (if applicable)",
      "who_benefits": "{user_side}/other_party/neutral",
      "benefit_level": "major/minor",
      "explanation": "Clear explanation of what changed and why it matters",
      "impact": "positive/negative/neutral"
    }}
  ],
  
  "addressed_concerns": [
    "Security deposit is now refundable",
    "Late fee reduced from $150 to $50"
  ],
  
  "ignored_concerns": [
    "Automatic renewal clause still present",
    "One-sided termination rights unchanged"
  ],
  
  "new_issues": [
    "Added mandatory arbitration clause",
    "Increased monthly maintenance fee"
  ],
  
  "recommendation": "Detailed 2-3 sentence advice on what the {user_side} should do next",
  
  "next_steps": [
    "Ask about the new arbitration clause",
    "Request removal of automatic renewal",
    "Confirm security deposit refund process in writing"
  ]
}}"""

        try:
            response = self.model.generate_content(prompt)
            comparison = self._parse_response(response.text)
            
            # Add metadata
            comparison['comparison_metadata'] = {
                'user_side': user_side,
                'timestamp': self._get_timestamp()
            }
            
            return comparison
        
        except Exception as e:
            logger.error(f"Error comparing contracts: {str(e)}")
            raise

    def generate_counter_proposal(self, analysis: Dict, user_info: Dict) -> Dict:
        """
        Generate counter-proposal based on analysis
        
        Args:
            analysis: Results from contract analysis
            user_info: Dict with user_name, other_party_name, user_role, contract_type
        
        Returns:
            Counter-proposal with revised clauses and email template
        """
        
        red_flags = analysis.get('red_flags', [])[:5]  # Top 5 red flags
        contract_type = user_info.get('contract_type', analysis.get('contract_type_detected', 'contract'))
        user_role = user_info.get('user_role', 'party')
        
        prompt = f"""You are a professional contract negotiation consultant helping a {user_role}.

Based on the red flags identified, create a comprehensive counter-proposal package.

**RED FLAGS TO ADDRESS:**
{json.dumps(red_flags, indent=2)}

**CONTRACT TYPE:** {contract_type}
**USER ROLE:** {user_role}

Generate a complete negotiation package with:

1. **REVISED CLAUSES**: Professional, fair replacements for each problematic clause
2. **EMAIL TEMPLATE**: Ready-to-send professional email
3. **TALKING POINTS**: Strong arguments with legal/practical backing
4. **COMPROMISE OPTIONS**: Fallback positions if they resist

Return ONLY valid JSON:
{{
  "revised_clauses": [
    {{
      "issue": "Security Deposit",
      "original_clause": "The problematic clause text",
      "revised_clause": "Professionally written fair replacement clause",
      "justification": "Why this change is reasonable and fair",
      "legal_basis": "Relevant laws, industry standards, or common practices",
      "priority": "high/medium/low"
    }}
  ],
  
  "email_template": {{
    "subject": "Contract Review - Proposed Amendments",
    "greeting": "Dear [Other Party Name],",
    "body": "Professional, friendly email body with:
    - Appreciation for the opportunity
    - Clear statement of concerns
    - Specific proposed changes
    - Explanation of fairness
    - Open to discussion
    - Professional close",
    "tone": "professional_friendly",
    "estimated_response_time": "2-5 business days"
  }},
  
  "talking_points": [
    {{
      "issue": "Security Deposit Refundability",
      "your_position": "Security deposit should be refundable",
      "key_argument": "This is standard practice and legally required in [jurisdiction]",
      "supporting_evidence": "State law citation, market standards, fairness principle",
      "response_to_objections": "If they say it's their policy, respond with..."
    }}
  ],
  
  "compromise_options": [
    {{
      "if_they_say": "We can't change our standard contract",
      "you_respond": "I understand. Would you consider...",
      "middle_ground": "Specific compromise that's still acceptable",
      "likelihood_of_success": "high/medium/low"
    }}
  ],
  
  "negotiation_strategy": {{
    "approach": "collaborative/firm/flexible",
    "key_principles": ["Principle 1", "Principle 2"],
    "things_to_avoid": ["Don't be aggressive", "Don't accept first offer"],
    "timeline": "Suggested negotiation timeline",
    "when_to_walk_away": "Conditions under which to decline the contract"
  }},
  
  "success_probability": {{
    "overall_estimate": "high/medium/low",
    "reasoning": "Why this negotiation is likely to succeed or fail",
    "factors_in_your_favor": ["Factor 1", "Factor 2"],
    "challenges": ["Challenge 1", "Challenge 2"]
  }}
}}"""

        try:
            response = self.model.generate_content(prompt)
            counter_proposal = self._parse_response(response.text)
            
            # Personalize email template
            email = counter_proposal.get('email_template', {})
            if email and 'body' in email:
                body = email['body']
                body = body.replace('[Your Name]', user_info.get('user_name', '[Your Name]'))
                body = body.replace('[Other Party Name]', user_info.get('other_party_name', '[Other Party Name]'))
                body = body.replace('[Other Party]', user_info.get('other_party_name', '[Other Party]'))
                email['body'] = body
                counter_proposal['email_template'] = email
            
            # Add metadata
            counter_proposal['proposal_metadata'] = {
                'generated_for': user_info.get('user_name'),
                'timestamp': self._get_timestamp(),
                'red_flags_addressed': len(red_flags)
            }
            
            return counter_proposal
        
        except Exception as e:
            logger.error(f"Error generating counter-proposal: {str(e)}")
            raise
    
    def _build_prompt(self, contract_text: str, contract_type: Optional[str]) -> str:
        """Build the analysis prompt for Gemini"""
        
        contract_type_context = ""
        if contract_type:
            contract_type_context = f"\nContract Type: {contract_type.upper()}"
        
        prompt = f"""You are an expert legal analyst specializing in consumer contract protection. 
Your goal is to help ordinary people understand contracts and identify potential problems.

{contract_type_context}

Analyze the following contract carefully and provide a comprehensive assessment.

**CRITICAL RED FLAGS TO LOOK FOR:**
1. Hidden or excessive fees
2. One-sided termination rights (they can terminate easily, you cannot)
3. Automatic renewal clauses without clear opt-out
4. Unreasonable liability waivers or indemnification
5. Waiver of legal rights (arbitration clauses, class action waivers)
6. Excessive penalties or damages
7. Unfair modification rights
8. Lack of termination rights for the consumer
9. Unreasonable restrictions on the consumer
10. Missing standard consumer protections

**YELLOW FLAGS (Concerning but not critical):**
1. Vague or ambiguous language
2. Missing definitions for key terms
3. Unusual or non-standard clauses
4. Overly complex legal language
5. Short notice periods
6. Restricted dispute resolution options

**ANALYSIS INSTRUCTIONS:**
1. Read the entire contract carefully
2. Identify ALL red flags and yellow flags
3. For each flag, quote the EXACT problematic clause
4. Explain the risk in simple, plain English (8th-grade reading level)
5. Suggest specific questions the person should ask before signing
6. Provide an overall risk score (1-10, where 10 is extremely risky)
7. Give a clear recommendation: SIGN, NEGOTIATE, or AVOID

**OUTPUT FORMAT:**
Return your analysis as a JSON object with this EXACT structure:

{{
  "risk_score": 7,
  "recommendation": "NEGOTIATE",
  "overall_summary": "Brief summary of main concerns in 2-3 sentences",
  "contract_type_detected": "rental/employment/nda/service/other",
  
  "red_flags": [
    {{
      "category": "Hidden Fees",
      "severity": "HIGH",
      "clause_text": "Exact quote from contract",
      "location": "Section/Page reference if available",
      "explanation": "Plain English explanation of why this is problematic",
      "impact": "What could happen to you because of this clause",
      "questions_to_ask": ["Question 1", "Question 2"]
    }}
  ],
  
  "yellow_flags": [
    {{
      "category": "Vague Language",
      "severity": "MEDIUM",
      "clause_text": "Exact quote",
      "location": "Section/Page reference",
      "explanation": "Why this is concerning",
      "suggestion": "What should be clarified"
    }}
  ],
  
  "missing_protections": [
    "Standard protection that should be included but isn't"
  ],
  
  "positive_aspects": [
    "Good clauses or protections that ARE present"
  ],
  
  "key_questions_before_signing": [
    "Question 1",
    "Question 2",
    "Question 3"
  ],
  
  "negotiation_tips": [
    "Specific thing to try to negotiate"
  ]
}}

**IMPORTANT:** 
- Be thorough but concise
- Use friendly, accessible language
- Focus on practical implications
- If you find a particularly egregious clause, emphasize it strongly
- If the contract is actually fair, say so clearly

CONTRACT TEXT:
{contract_text}

Now analyze this contract and return ONLY the JSON object, with no additional text before or after."""

        return prompt
    
    def _enrich_with_community_data(self, analysis: Dict) -> Dict:
        """Enhance analysis with community-reported data"""
        enriched_flags = []
        
        for flag in analysis.get('red_flags', []):
            category = flag.get('category', '')
            
            # Get community insights for this red flag
            community_data = get_community_insights(category)
            
            if community_data:
                flag['community_insights'] = {
                    'reports': community_data['reports'],
                    'severity': community_data['severity'],
                    'avg_financial_impact': community_data['avg_financial_impact'],
                    'success_rate_negotiating': community_data['success_rate_negotiating'],
                    'avg_time_to_resolve_days': community_data['avg_time_to_resolve_days'],
                    'user_outcomes': community_data['user_outcomes'],
                    'tips': community_data['tips'],
                    'success_stories': community_data['success_stories'][:2],  # Top 2 stories
                    'warning_message': format_community_warning(community_data)
                }
            
            enriched_flags.append(flag)
        
        analysis['red_flags'] = enriched_flags
        analysis['community_enhanced'] = True
        
        return analysis
    
    def _parse_response(self, response_text: str) -> Dict:
        """Parse Gemini's response and extract JSON"""
        try:
            # Remove markdown code blocks if present
            clean_text = response_text.strip()
            if clean_text.startswith('```json'):
                clean_text = clean_text[7:]
            if clean_text.startswith('```'):
                clean_text = clean_text[3:]
            if clean_text.endswith('```'):
                clean_text = clean_text[:-3]
            
            clean_text = clean_text.strip()
            
            # Parse JSON
            analysis = json.loads(clean_text)
            
            # Validate required fields
            required_fields = ['risk_score', 'recommendation', 'overall_summary']
            for field in required_fields:
                if field not in analysis:
                    logger.warning(f"Missing required field: {field}")
                    analysis[field] = self._get_default_value(field)
            
            # Ensure arrays exist
            if 'red_flags' not in analysis:
                analysis['red_flags'] = []
            if 'yellow_flags' not in analysis:
                analysis['yellow_flags'] = []
            
            # Add metadata
            analysis['analysis_metadata'] = {
                'model': 'gemini-2.0-flash-exp',
                'timestamp': self._get_timestamp(),
                'total_flags': len(analysis.get('red_flags', [])) + len(analysis.get('yellow_flags', []))
            }
            
            return analysis
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Response text: {response_text[:500]}...")
            
            # Return a fallback response
            return {
                'error': 'Failed to parse analysis',
                'risk_score': 5,
                'recommendation': 'REVIEW MANUALLY',
                'overall_summary': 'Unable to complete automated analysis. Please review this contract with a legal professional.',
                'red_flags': [],
                'yellow_flags': [],
                'raw_response': response_text[:1000]
            }
    
    def _get_default_value(self, field: str):
        """Get default value for missing fields"""
        defaults = {
            'risk_score': 5,
            'recommendation': 'REVIEW',
            'overall_summary': 'Analysis incomplete. Please review manually.',
            'red_flags': [],
            'yellow_flags': []
        }
        return defaults.get(field, None)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'