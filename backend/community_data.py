"""
Community Red Flag Database
Simulates crowdsourced data from real users
In production, this would be a real database (Firestore, PostgreSQL)
"""

# Community-reported red flags with real outcomes
COMMUNITY_DATABASE = {
    "non-refundable security deposit": {
        "reports": 2847,
        "severity": "HIGH",
        "avg_financial_impact": 1200,
        "success_rate_negotiating": 0.73,
        "common_in": ["rental", "lease"],
        "user_outcomes": {
            "negotiated_successfully": 2079,
            "paid_penalty": 768,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 7,
        "tips": [
            "Security deposits must be refundable in most states",
            "Cite local tenant law (e.g., CA Civil Code §1950.5)",
            "Offer to increase deposit if they make it refundable",
            "Request written confirmation of refund conditions"
        ],
        "success_stories": [
            "Changed 'non-refundable' to 'refundable within 30 days' - saved $1,200",
            "Landlord agreed after I showed state law - got full $1,500 back",
            "Negotiated down from $2,000 to $1,000 refundable deposit"
        ]
    },
    
    "automatic renewal": {
        "reports": 3421,
        "severity": "HIGH",
        "avg_financial_impact": 850,
        "success_rate_negotiating": 0.65,
        "common_in": ["rental", "subscription", "service"],
        "user_outcomes": {
            "negotiated_successfully": 2224,
            "stuck_in_contract": 1197,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 5,
        "tips": [
            "Request 60-90 day notice period before auto-renewal",
            "Ask for email reminder 120 days before renewal date",
            "Negotiate opt-in renewal instead of opt-out",
            "Get written confirmation of notification method"
        ],
        "success_stories": [
            "Changed to 90-day notice period - avoided $10,200 renewal",
            "Added email reminder clause - saved me from forgetting",
            "Made it opt-in renewal - have full control now"
        ]
    },
    
    "unlimited landlord entry": {
        "reports": 1923,
        "severity": "HIGH",
        "avg_financial_impact": 0,
        "success_rate_negotiating": 0.81,
        "common_in": ["rental"],
        "user_outcomes": {
            "negotiated_successfully": 1557,
            "declined_contract": 366,
            "paid_penalty": 0
        },
        "avg_time_to_resolve_days": 3,
        "tips": [
            "Most states require 24-48 hours notice for entry",
            "Specify 'reasonable hours' (e.g., 9am-6pm weekdays)",
            "Emergency-only exception for immediate entry",
            "Request written notice via email or text"
        ],
        "success_stories": [
            "Added 48-hour notice requirement - no more surprise visits",
            "Limited entry to 9am-5pm weekdays - got my privacy back",
            "Required written notice via email - created paper trail"
        ]
    },
    
    "waiver of legal rights": {
        "reports": 4156,
        "severity": "CRITICAL",
        "avg_financial_impact": 2500,
        "success_rate_negotiating": 0.42,
        "common_in": ["employment", "service", "rental"],
        "user_outcomes": {
            "negotiated_successfully": 1745,
            "declined_contract": 1203,
            "accepted_reluctantly": 1208
        },
        "avg_time_to_resolve_days": 14,
        "tips": [
            "Arbitration clauses are sometimes negotiable",
            "These may be unenforceable in your state - check local laws",
            "Consider if opportunity is worth giving up this right",
            "Consult a lawyer for high-stakes contracts"
        ],
        "success_stories": [
            "Company removed arbitration clause after pushback",
            "Limited arbitration to disputes under $10,000",
            "Added option to choose arbitration OR court"
        ]
    },
    
    "unlimited fee increases": {
        "reports": 2134,
        "severity": "HIGH",
        "avg_financial_impact": 1650,
        "success_rate_negotiating": 0.58,
        "common_in": ["rental", "service"],
        "user_outcomes": {
            "negotiated_successfully": 1238,
            "paid_increases": 896,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 6,
        "tips": [
            "Request cap on annual increases (e.g., 3-5%)",
            "Tie increases to CPI or local market rate",
            "Require 60-90 day notice for any increase",
            "Get first year rate locked in writing"
        ],
        "success_stories": [
            "Capped rent increases at 5% annually - saved $2,400 over 2 years",
            "Required 90-day notice - gave me time to budget",
            "Tied increases to CPI - fair for both parties"
        ]
    },
    
    "excessive late fees": {
        "reports": 1876,
        "severity": "MEDIUM",
        "avg_financial_impact": 450,
        "success_rate_negotiating": 0.69,
        "common_in": ["rental", "loan", "service"],
        "user_outcomes": {
            "negotiated_successfully": 1295,
            "paid_penalty": 581,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 4,
        "tips": [
            "Late fees should be reasonable (5-10% of payment)",
            "Request grace period (3-5 days)",
            "Challenge if fee exceeds state limits",
            "Ask for one-time forgiveness clause"
        ],
        "success_stories": [
            "Reduced $150 late fee to $50 - more reasonable",
            "Added 5-day grace period - no more stress",
            "Got one-time forgiveness clause - saved me $150"
        ]
    },
    
    "one-sided termination": {
        "reports": 2567,
        "severity": "HIGH",
        "avg_financial_impact": 3200,
        "success_rate_negotiating": 0.51,
        "common_in": ["rental", "employment", "service"],
        "user_outcomes": {
            "negotiated_successfully": 1309,
            "stuck_in_contract": 1258,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 8,
        "tips": [
            "Ask for equal termination rights (30 days both parties)",
            "Request 'for cause' termination option",
            "Negotiate reduced penalty if you must terminate early",
            "Get mutual termination clause"
        ],
        "success_stories": [
            "Made termination mutual - both need 30 days notice",
            "Added job loss clause - can terminate without penalty",
            "Reduced early termination penalty from 3 months to 1"
        ]
    },
    
    "hidden maintenance fees": {
        "reports": 1654,
        "severity": "MEDIUM",
        "avg_financial_impact": 780,
        "success_rate_negotiating": 0.72,
        "common_in": ["rental", "condo", "hoa"],
        "user_outcomes": {
            "negotiated_successfully": 1191,
            "paid_penalty": 463,
            "declined_contract": 0
        },
        "avg_time_to_resolve_days": 5,
        "tips": [
            "Request itemized list of ALL fees before signing",
            "Ask what's included in 'maintenance' - be specific",
            "Get cap on fee increases written into contract",
            "Compare to similar properties in area"
        ],
        "success_stories": [
            "Found $200/month in hidden fees - negotiated to $75",
            "Got detailed breakdown - removed unnecessary charges",
            "Locked maintenance fees for 2 years - saved $960"
        ]
    }
}


def get_community_insights(red_flag_category: str) -> dict:
    """
    Get community insights for a specific red flag
    
    Args:
        red_flag_category: The category of red flag
    
    Returns:
        Dictionary with community data or None
    """
    category_lower = red_flag_category.lower()
    
    # Try exact match first
    if category_lower in COMMUNITY_DATABASE:
        return COMMUNITY_DATABASE[category_lower]
    
    # Try fuzzy matching
    for key, data in COMMUNITY_DATABASE.items():
        if key in category_lower or category_lower in key:
            return data
        
        # Check if any keywords match
        keywords = key.split()
        if any(keyword in category_lower for keyword in keywords):
            return data
    
    return None


def get_aggregated_stats() -> dict:
    """Get overall community statistics"""
    total_reports = sum(data['reports'] for data in COMMUNITY_DATABASE.values())
    total_successful = sum(
        data['user_outcomes']['negotiated_successfully'] 
        for data in COMMUNITY_DATABASE.values()
    )
    total_money_saved = sum(
        data['reports'] * data['avg_financial_impact'] * data['success_rate_negotiating']
        for data in COMMUNITY_DATABASE.values()
    )
    
    top_issues = sorted(
        [
            {
                'issue': key.replace('_', ' ').title(),
                'reports': data['reports'],
                'severity': data['severity'],
                'avg_impact': data['avg_financial_impact'],
                'success_rate': data['success_rate_negotiating']
            }
            for key, data in COMMUNITY_DATABASE.items()
        ],
        key=lambda x: x['reports'],
        reverse=True
    )[:5]
    
    return {
        'total_contracts_analyzed': total_reports,
        'total_successful_negotiations': total_successful,
        'total_money_saved': int(total_money_saved),
        'overall_success_rate': round(total_successful / total_reports, 2),
        'top_issues': top_issues,
        'active_users': 14523,  # Simulated
        'avg_response_time_hours': 0.5  # Simulated - instant AI analysis
    }


def format_community_warning(data: dict) -> str:
    """Format a warning message based on community data"""
    reports = data['reports']
    success_rate = int(data['success_rate_negotiating'] * 100)
    
    if data['severity'] == 'CRITICAL':
        emoji = '🚨'
        level = 'CRITICAL ALERT'
    elif data['severity'] == 'HIGH':
        emoji = '⚠️'
        level = 'HIGH RISK'
    else:
        emoji = '⚡'
        level = 'CAUTION'
    
    warning = f"{emoji} {level}: {reports:,} users reported similar issues. "
    warning += f"{success_rate}% successfully negotiated this clause."
    
    if data['avg_financial_impact'] > 0:
        warning += f" Average impact: ${data['avg_financial_impact']:,}."
    
    return warning