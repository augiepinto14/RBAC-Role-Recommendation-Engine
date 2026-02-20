"""
Regenerate commercial_bank_hr_data.csv with:
- All Employment Type = Full-Time, Employment Status = Active
- Remove: Supervisory Flag, Dual-Hat Role Flag, Sensitive Role Flag, HR Business Partner
- Remove Job Grade/Band from Job Title
- More granular Job Titles, Job Families, Cost Centers
- SNODE filled to L12 for all, some to L15
"""
import csv
import random
from datetime import datetime, timedelta

random.seed(42)

# ─── Constants ───────────────────────────────────────────────────

FIRST_NAMES = [
    "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth",
    "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
    "Christopher","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
    "Donald","Ashley","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
    "Kenneth","Carol","Kevin","Amanda","Brian","Dorothy","George","Melissa","Timothy","Deborah",
    "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
    "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
    "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
    "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank","Rachel",
    "Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria","Jerry","Heather",
    "Tyler","Diane","Aaron","Ruth","Jose","Julie","Adam","Olivia","Nathan","Joyce",
    "Henry","Virginia","Peter","Victoria","Zachary","Kelly","Douglas","Lauren","Harold","Christina",
    "Carl","Joan","Arthur","Evelyn","Gerald","Judith","Roger","Megan","Keith","Andrea",
    "Jeremy","Cheryl","Terry","Hannah","Lawrence","Jacqueline","Sean","Martha","Christian","Gloria",
    "Austin","Teresa","Jesse","Ann","Ethan","Sara","Dylan","Madison","Bryan","Frances",
    "Albert","Kathryn","Joe","Janice","Jordan","Jean","Billy","Abigail","Bruce","Alice",
    "Gabriel","Judy","Logan","Sophia","Willie","Grace","Alan","Denise","Juan","Amber",
    "Wayne","Doris","Elijah","Marilyn","Randy","Danielle","Roy","Beverly","Vincent","Isabella",
    "Ralph","Theresa","Eugene","Diana","Russell","Natalie","Bobby","Brittany","Mason","Charlotte",
    "Philip","Marie","Louis","Kayla","Harry","Alexis","Amir","Priya","Omar","Fatima",
    "Wei","Yuki","Raj","Mei","Hassan","Aisha","Kenji","Sakura","Arjun","Lakshmi",
    "Chen","Ming","Jin","Suki","Ravi","Nadia","Carlos","Sofia","Diego","Isabella",
    "Pablo","Elena","Marco","Giulia","Andre","Chloe","Pierre","Amélie","Klaus","Hannah",
    "Hans","Ingrid","Lars","Astrid","Sven","Freya","Olaf","Sigrid","Bjorn","Katarina",
    "Mikhail","Anya","Ivan","Natasha","Viktor","Svetlana","Andrei","Olga","Tomas","Marta",
]
LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
    "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
    "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
    "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
    "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
    "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
    "Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper",
    "Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson",
    "Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes",
    "Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez",
    "Singh","Chen","Kumar","Wang","Zhang","Nakamura","Tanaka","Watanabe","Yamamoto","Suzuki",
    "Muller","Schmidt","Fischer","Weber","Meyer","Wagner","Schulz","Becker","Hoffman","Richter",
    "Johansson","Lindberg","Eriksson","Andersson","Petrov","Ivanov","Volkov","Novak","Kowalski","Dubois",
    "Moreau","Laurent","Bernard","Fontaine","Ferrari","Rossi","Romano","Colombo","Ricci","Costa",
    "Santos","Oliveira","Ferreira","Souza","Almeida","Barros","Carvalho","Nascimento","Lima","Ribeiro",
]

REGIONS = {
    "NA": {
        "sub_regions": {
            "North America": {
                "countries": {
                    "United States": [("New York","NYC01"),("San Francisco","SFO01"),("Chicago","CHI01"),("Houston","HOU01"),("Dallas","DFW01"),("Charlotte","CLT01"),("Boston","BOS01"),("Atlanta","ATL01"),("Denver","DEN01"),("Miami","MIA01")],
                    "Canada": [("Toronto","YYZ01"),("Vancouver","YVR01"),("Montreal","YUL01"),("Calgary","YYC01")],
                }
            }
        }
    },
    "EMEA": {
        "sub_regions": {
            "Europe": {
                "countries": {
                    "United Kingdom": [("London","LHR01"),("Edinburgh","EDI01"),("Manchester","MAN01")],
                    "Germany": [("Frankfurt","FRA01"),("Munich","MUC01"),("Berlin","BER01")],
                    "France": [("Paris","CDG01"),("Lyon","LYS01")],
                    "Switzerland": [("Zurich","ZRH01"),("Geneva","GVA01")],
                    "Spain": [("Madrid","MAD01"),("Barcelona","BCN01")],
                    "Netherlands": [("Amsterdam","AMS01")],
                    "Ireland": [("Dublin","DUB01")],
                }
            },
            "Middle East & Africa": {
                "countries": {
                    "United Arab Emirates": [("Dubai","DXB01"),("Abu Dhabi","AUH01")],
                    "Saudi Arabia": [("Riyadh","RUH01")],
                    "South Africa": [("Johannesburg","JNB01"),("Cape Town","CPT01")],
                    "Nigeria": [("Lagos","LOS01")],
                }
            }
        }
    },
    "APAC": {
        "sub_regions": {
            "Asia Pacific": {
                "countries": {
                    "Japan": [("Tokyo","NRT01"),("Osaka","KIX01")],
                    "Singapore": [("Singapore","SIN01")],
                    "Hong Kong": [("Hong Kong","HKG01")],
                    "Australia": [("Sydney","SYD01"),("Melbourne","MEL01")],
                    "India": [("Mumbai","BOM01"),("Bangalore","BLR01"),("Chennai","MAA01")],
                    "China": [("Shanghai","PVG01"),("Beijing","PEK01")],
                    "South Korea": [("Seoul","ICN01")],
                }
            }
        }
    },
    "LATAM": {
        "sub_regions": {
            "Latin America": {
                "countries": {
                    "Brazil": [("São Paulo","GRU01"),("Rio de Janeiro","GIG01")],
                    "Mexico": [("Mexico City","MEX01"),("Monterrey","MTY01")],
                    "Argentina": [("Buenos Aires","EZE01")],
                    "Chile": [("Santiago","SCL01")],
                    "Colombia": [("Bogotá","BOG01")],
                    "Peru": [("Lima","LIM01")],
                }
            }
        }
    },
}

LEGAL_ENTITIES = {
    "NA": "First National Bank NA",
    "EMEA": "First National Bank AG",
    "APAC": "First National Bank Asia Ltd",
    "LATAM": "First National Bank Brazil SA",
}

GRADES = ["Analyst", "Senior Analyst", "Associate", "Senior Associate", "Vice President", "Senior Vice President", "Director", "Executive Director", "Managing Director"]

# ─── Granular Org Structure: Business Line → Job Family → Cost Center → SNODE hierarchy ───

# Each business line maps to multiple job families and cost centers
# SNODE hierarchy: L1=Commercial Bank, L2=Business Line, L3=Division, L4=Department,
# L5=Team, L6=Sub-Team, L7=Function, L8=Sub-Function, L9=Specialty, L10=Sub-Specialty,
# L11=Unit, L12=Desk, L13-L15=ultra-granular (only some employees)

ORG_STRUCTURE = {
    "Corporate & Institutional Banking": {
        "cost_centers": [
            ("CC2001", "CIB Corporate Banking"),
            ("CC2002", "CIB Investment Banking"),
            ("CC2003", "CIB Structured Finance"),
            ("CC2004", "CIB Transaction Banking"),
            ("CC2005", "CIB Client Coverage"),
        ],
        "job_families": ["Corporate Banking", "Investment Banking", "Structured Finance", "Transaction Banking", "Client Advisory"],
        "divisions": {
            "Corporate Banking": {
                "departments": {
                    "Large Corporate Coverage": {
                        "teams": {
                            "Fortune 500 Coverage": {"sub_teams": ["Industrial Sector", "Consumer Sector", "Healthcare Sector", "Energy Sector"]},
                            "Mid-Cap Coverage": {"sub_teams": ["Regional Coverage East", "Regional Coverage West", "Regional Coverage Central"]},
                            "Public Sector": {"sub_teams": ["Federal Government", "State & Municipal", "Government Agencies"]},
                        }
                    },
                    "Middle Market Banking": {
                        "teams": {
                            "MMB Coverage North": {"sub_teams": ["Northeast Accounts", "Midwest Accounts", "Pacific Northwest"]},
                            "MMB Coverage South": {"sub_teams": ["Southeast Accounts", "Southwest Accounts", "Gulf Coast"]},
                            "MMB Specialized Lending": {"sub_teams": ["Asset-Based Lending", "Equipment Finance", "Working Capital Solutions"]},
                        }
                    },
                    "Multinational Corporate": {
                        "teams": {
                            "Global Subsidiaries Group": {"sub_teams": ["EMEA Subsidiaries", "APAC Subsidiaries", "LATAM Subsidiaries"]},
                            "Cross-Border Solutions": {"sub_teams": ["Trade Finance Advisory", "FX Solutions", "Cash Management"]},
                        }
                    },
                }
            },
            "Investment Banking": {
                "departments": {
                    "Debt Capital Markets": {
                        "teams": {
                            "Investment Grade Origination": {"sub_teams": ["IG Syndicate", "IG Private Placements", "IG Liability Management"]},
                            "High Yield Origination": {"sub_teams": ["HY New Issues", "HY Restructuring", "Leveraged Finance"]},
                            "Securitization": {"sub_teams": ["ABS Structuring", "MBS Structuring", "CLO Structuring"]},
                        }
                    },
                    "Equity Capital Markets": {
                        "teams": {
                            "IPO Advisory": {"sub_teams": ["Tech IPO", "Healthcare IPO", "Industrial IPO"]},
                            "Follow-On Offerings": {"sub_teams": ["Block Trades", "Convertibles", "Rights Issues"]},
                        }
                    },
                    "M&A Advisory": {
                        "teams": {
                            "Strategic Advisory": {"sub_teams": ["Sell-Side M&A", "Buy-Side M&A", "Fairness Opinions"]},
                            "Sector Coverage": {"sub_teams": ["TMT M&A", "Healthcare M&A", "Financial Institutions M&A", "Industrials M&A"]},
                        }
                    },
                }
            },
            "Structured Finance": {
                "departments": {
                    "Project Finance": {
                        "teams": {
                            "Infrastructure Finance": {"sub_teams": ["Transport Infrastructure", "Social Infrastructure", "Digital Infrastructure"]},
                            "Energy Project Finance": {"sub_teams": ["Renewable Energy", "Oil & Gas", "Power Generation"]},
                        }
                    },
                    "Real Estate Finance": {
                        "teams": {
                            "Commercial Real Estate": {"sub_teams": ["Office & Retail", "Industrial & Logistics", "Hospitality"]},
                            "Real Estate Structured Products": {"sub_teams": ["CMBS", "Real Estate Funds", "Mezzanine Lending"]},
                        }
                    },
                }
            },
            "Transaction Banking": {
                "departments": {
                    "Cash Management": {
                        "teams": {
                            "Liquidity Solutions": {"sub_teams": ["Notional Pooling", "Physical Pooling", "Investment Sweeps"]},
                            "Payments & Collections": {"sub_teams": ["Domestic Payments", "Cross-Border Payments", "Receivables Management"]},
                        }
                    },
                    "Trade Finance": {
                        "teams": {
                            "Documentary Trade": {"sub_teams": ["Letters of Credit", "Documentary Collections", "Guarantees & Standby LC"]},
                            "Supply Chain Finance": {"sub_teams": ["Payables Finance", "Receivables Finance", "Distributor Finance"]},
                        }
                    },
                    "Securities Services": {
                        "teams": {
                            "Custody & Settlement": {"sub_teams": ["Global Custody", "Local Custody", "Settlement Operations"]},
                            "Fund Services": {"sub_teams": ["Fund Administration", "Transfer Agency", "Fund Accounting"]},
                        }
                    },
                }
            },
        }
    },
    "Global Markets": {
        "cost_centers": [
            ("CC2010", "GM Fixed Income Trading"),
            ("CC2011", "GM Equities Trading"),
            ("CC2012", "GM FX & Commodities"),
            ("CC2013", "GM Sales & Distribution"),
            ("CC2014", "GM Structuring"),
        ],
        "job_families": ["Sales & Trading", "Quantitative Research", "Market Making", "Structuring", "Sales"],
        "divisions": {
            "Fixed Income": {
                "departments": {
                    "Rates Trading": {
                        "teams": {
                            "Government Bonds": {"sub_teams": ["US Treasuries", "European Sovereigns", "EM Rates"]},
                            "Interest Rate Derivatives": {"sub_teams": ["Swaps Trading", "Options Trading", "Basis Trading"]},
                            "Inflation Trading": {"sub_teams": ["TIPS Trading", "Inflation Swaps", "Real Rate Products"]},
                        }
                    },
                    "Credit Trading": {
                        "teams": {
                            "Investment Grade Credit": {"sub_teams": ["IG Cash Bonds", "IG CDS", "IG Index Trading"]},
                            "High Yield Credit": {"sub_teams": ["HY Cash Bonds", "HY CDS", "Distressed Debt"]},
                            "Emerging Market Credit": {"sub_teams": ["EM Sovereign", "EM Corporate", "EM Local Currency"]},
                        }
                    },
                }
            },
            "Equities": {
                "departments": {
                    "Cash Equities": {
                        "teams": {
                            "Equity Trading Desk": {"sub_teams": ["US Equities", "European Equities", "APAC Equities"]},
                            "Program Trading": {"sub_teams": ["Index Arbitrage", "Portfolio Trading", "Transition Management"]},
                        }
                    },
                    "Equity Derivatives": {
                        "teams": {
                            "Flow Derivatives": {"sub_teams": ["Single Stock Options", "Index Options", "Variance Swaps"]},
                            "Exotic Derivatives": {"sub_teams": ["Structured Products", "Correlation Trading", "Dividend Trading"]},
                        }
                    },
                }
            },
            "FX & Commodities": {
                "departments": {
                    "Foreign Exchange": {
                        "teams": {
                            "G10 FX": {"sub_teams": ["Spot FX", "FX Forwards", "FX Options"]},
                            "EM FX": {"sub_teams": ["LATAM FX", "Asia FX", "CEEMEA FX"]},
                        }
                    },
                    "Commodities": {
                        "teams": {
                            "Energy Commodities": {"sub_teams": ["Crude Oil Trading", "Natural Gas Trading", "Power Trading"]},
                            "Metals & Agriculture": {"sub_teams": ["Precious Metals", "Base Metals", "Agricultural Commodities"]},
                        }
                    },
                }
            },
        }
    },
    "Wealth & Private Banking": {
        "cost_centers": [
            ("CC2020", "WPB Private Banking"),
            ("CC2021", "WPB Wealth Advisory"),
            ("CC2022", "WPB Trust & Estate"),
            ("CC2023", "WPB Investment Solutions"),
        ],
        "job_families": ["Wealth Management", "Private Banking", "Trust & Estate", "Investment Advisory", "Financial Planning"],
        "divisions": {
            "Private Banking": {
                "departments": {
                    "Ultra High Net Worth": {
                        "teams": {
                            "UHNW Relationship Management": {"sub_teams": ["Family Office Coverage", "Single Family Office", "Multi-Family Office"]},
                            "UHNW Investment Advisory": {"sub_teams": ["Direct Investing", "Co-Investment", "Alternative Investments"]},
                        }
                    },
                    "High Net Worth": {
                        "teams": {
                            "HNW Advisors": {"sub_teams": ["HNW Northeast", "HNW Southeast", "HNW West Coast", "HNW International"]},
                            "HNW Lending": {"sub_teams": ["Mortgage & Real Estate", "Securities-Based Lending", "Art & Aviation Finance"]},
                        }
                    },
                }
            },
            "Wealth Advisory": {
                "departments": {
                    "Financial Planning": {
                        "teams": {
                            "Comprehensive Planning": {"sub_teams": ["Retirement Planning", "Education Planning", "Insurance Planning"]},
                            "Tax Advisory": {"sub_teams": ["Income Tax Planning", "Estate Tax Planning", "International Tax"]},
                        }
                    },
                    "Investment Management": {
                        "teams": {
                            "Discretionary Portfolios": {"sub_teams": ["Equity Portfolios", "Fixed Income Portfolios", "Multi-Asset Portfolios"]},
                            "Advisory Portfolios": {"sub_teams": ["Thematic Investing", "ESG Portfolios", "Income Strategies"]},
                        }
                    },
                }
            },
            "Trust & Estate": {
                "departments": {
                    "Fiduciary Services": {
                        "teams": {
                            "Trust Administration": {"sub_teams": ["Personal Trusts", "Charitable Trusts", "Special Needs Trusts"]},
                            "Estate Settlement": {"sub_teams": ["Probate Services", "Estate Distribution", "Executor Services"]},
                        }
                    },
                    "Institutional Trust": {
                        "teams": {
                            "Corporate Trust": {"sub_teams": ["Bond Trustee", "Escrow Services", "Indenture Trustee"]},
                            "Retirement Trust": {"sub_teams": ["401k Trustee", "Pension Trustee", "ESOP Trustee"]},
                        }
                    },
                }
            },
        }
    },
    "Risk Management": {
        "cost_centers": [
            ("CC2030", "Risk Credit Risk"),
            ("CC2031", "Risk Market Risk"),
            ("CC2032", "Risk Operational Risk"),
            ("CC2033", "Risk Model Risk"),
            ("CC2034", "Risk Enterprise Risk"),
        ],
        "job_families": ["Credit Risk", "Market Risk", "Operational Risk", "Model Risk", "Enterprise Risk", "Quantitative Risk"],
        "divisions": {
            "Credit Risk": {
                "departments": {
                    "Wholesale Credit Risk": {
                        "teams": {
                            "Corporate Credit Analysis": {"sub_teams": ["IG Credit Analysis", "HY Credit Analysis", "Leveraged Finance Credit"]},
                            "Portfolio Management": {"sub_teams": ["Sector Concentration", "Geographic Concentration", "Single Name Limits"]},
                            "Credit Approval": {"sub_teams": ["New Deal Approval", "Annual Reviews", "Watch List Management"]},
                        }
                    },
                    "Counterparty Credit Risk": {
                        "teams": {
                            "CCR Measurement": {"sub_teams": ["PFE Calculation", "CVA Desk", "Wrong Way Risk"]},
                            "Margin & Collateral": {"sub_teams": ["Initial Margin", "Variation Margin", "Collateral Optimization"]},
                        }
                    },
                }
            },
            "Market Risk": {
                "departments": {
                    "Market Risk Measurement": {
                        "teams": {
                            "VaR & Stress Testing": {"sub_teams": ["Historical VaR", "Monte Carlo VaR", "Stress Scenarios"]},
                            "Sensitivity Analysis": {"sub_teams": ["Greeks Monitoring", "Basis Risk", "Correlation Risk"]},
                        }
                    },
                    "Market Risk Oversight": {
                        "teams": {
                            "Limit Monitoring": {"sub_teams": ["Trading Limits", "Desk Limits", "Firm-Wide Limits"]},
                            "P&L Attribution": {"sub_teams": ["Risk P&L", "Actual P&L", "P&L Explain"]},
                        }
                    },
                }
            },
            "Operational Risk": {
                "departments": {
                    "Operational Risk Framework": {
                        "teams": {
                            "RCSA & Controls": {"sub_teams": ["Control Testing", "Risk Assessment", "Issue Remediation"]},
                            "Loss Event Management": {"sub_teams": ["Internal Loss Data", "External Loss Data", "Scenario Analysis"]},
                        }
                    },
                    "Business Continuity": {
                        "teams": {
                            "BCM Planning": {"sub_teams": ["Crisis Management", "Disaster Recovery", "Pandemic Planning"]},
                            "Third Party Risk": {"sub_teams": ["Vendor Assessment", "Concentration Risk", "Fourth Party Risk"]},
                        }
                    },
                }
            },
            "Model Risk": {
                "departments": {
                    "Model Validation": {
                        "teams": {
                            "Market Risk Models": {"sub_teams": ["Pricing Models", "VaR Models", "Scenario Models"]},
                            "Credit Risk Models": {"sub_teams": ["PD Models", "LGD Models", "EAD Models"]},
                            "Regulatory Models": {"sub_teams": ["CCAR Models", "CECL Models", "Basel Models"]},
                        }
                    },
                    "Model Governance": {
                        "teams": {
                            "Model Inventory": {"sub_teams": ["Model Registry", "Model Tiering", "Model Documentation"]},
                            "Model Performance": {"sub_teams": ["Backtesting", "Benchmarking", "Model Monitoring"]},
                        }
                    },
                }
            },
        }
    },
    "Technology & Operations": {
        "cost_centers": [
            ("CC2040", "Tech Core Banking Systems"),
            ("CC2041", "Tech Digital & Channels"),
            ("CC2042", "Tech Infrastructure & Cloud"),
            ("CC2043", "Tech Data & Analytics"),
            ("CC2044", "Tech Cybersecurity"),
            ("CC2045", "Ops Banking Operations"),
            ("CC2046", "Ops Market Operations"),
        ],
        "job_families": ["Software Engineering", "Infrastructure Engineering", "Data Engineering", "Cybersecurity", "Banking Operations", "Market Operations", "DevOps & SRE", "QA Engineering"],
        "divisions": {
            "Core Banking Technology": {
                "departments": {
                    "Core Banking Platform": {
                        "teams": {
                            "Account Management Systems": {"sub_teams": ["Deposit Systems", "Loan Origination", "Account Servicing"]},
                            "Payment Systems": {"sub_teams": ["Wire Transfer Platform", "ACH Processing", "Real-Time Payments"]},
                            "Ledger Systems": {"sub_teams": ["General Ledger", "Sub-Ledger", "Reconciliation Engine"]},
                        }
                    },
                    "Trading Technology": {
                        "teams": {
                            "Front Office Systems": {"sub_teams": ["Order Management", "Execution Management", "Pricing Engines"]},
                            "Risk Technology": {"sub_teams": ["Risk Calculation Engine", "Limit Management System", "P&L Systems"]},
                            "Post-Trade Technology": {"sub_teams": ["Trade Capture", "Confirmation & Matching", "Settlement Systems"]},
                        }
                    },
                }
            },
            "Digital & Channels": {
                "departments": {
                    "Digital Banking": {
                        "teams": {
                            "Online Banking Platform": {"sub_teams": ["Web Frontend", "API Gateway", "Session Management"]},
                            "Mobile Banking": {"sub_teams": ["iOS Development", "Android Development", "Mobile Middleware"]},
                        }
                    },
                    "Client Portals": {
                        "teams": {
                            "Institutional Portal": {"sub_teams": ["Portfolio Reporting", "Trade Instruction", "Document Management"]},
                            "Wealth Portal": {"sub_teams": ["Client Dashboard", "Performance Reporting", "Secure Messaging"]},
                        }
                    },
                }
            },
            "Infrastructure & Cloud": {
                "departments": {
                    "Cloud Engineering": {
                        "teams": {
                            "Cloud Platform": {"sub_teams": ["AWS Infrastructure", "Azure Infrastructure", "Multi-Cloud Orchestration"]},
                            "Container & Kubernetes": {"sub_teams": ["Container Platform", "Service Mesh", "Cluster Management"]},
                        }
                    },
                    "Network & Compute": {
                        "teams": {
                            "Network Engineering": {"sub_teams": ["WAN & Connectivity", "Load Balancing", "DNS & Firewall"]},
                            "Compute Services": {"sub_teams": ["Server Management", "Virtualization", "HPC Cluster"]},
                        }
                    },
                }
            },
            "Data & Analytics": {
                "departments": {
                    "Data Engineering": {
                        "teams": {
                            "Data Platform": {"sub_teams": ["Data Lake", "Data Warehouse", "Streaming Platform"]},
                            "ETL & Integration": {"sub_teams": ["Batch Processing", "Real-Time Integration", "API Integration"]},
                        }
                    },
                    "Analytics & BI": {
                        "teams": {
                            "Business Intelligence": {"sub_teams": ["Executive Dashboards", "Regulatory Reporting BI", "Client Analytics"]},
                            "Advanced Analytics": {"sub_teams": ["Machine Learning Ops", "NLP Solutions", "Predictive Analytics"]},
                        }
                    },
                }
            },
            "Cybersecurity": {
                "departments": {
                    "Security Operations": {
                        "teams": {
                            "SOC": {"sub_teams": ["Threat Detection", "Incident Response", "Security Monitoring"]},
                            "Vulnerability Management": {"sub_teams": ["Penetration Testing", "Patch Management", "Application Security"]},
                        }
                    },
                    "Identity & Access": {
                        "teams": {
                            "IAM Engineering": {"sub_teams": ["Directory Services", "SSO & Federation", "Privileged Access"]},
                            "Access Governance": {"sub_teams": ["Access Certification", "Role Engineering", "Entitlement Management"]},
                        }
                    },
                },
            },
            "Banking Operations": {
                "departments": {
                    "Payment Operations": {
                        "teams": {
                            "Wire Operations": {"sub_teams": ["Domestic Wires", "International Wires", "Wire Investigation"]},
                            "ACH Operations": {"sub_teams": ["ACH Origination", "ACH Returns", "ACH Exception Processing"]},
                        }
                    },
                    "Loan Operations": {
                        "teams": {
                            "Loan Servicing": {"sub_teams": ["Payment Processing", "Escrow Administration", "Insurance Tracking"]},
                            "Loan Closing": {"sub_teams": ["Document Preparation", "Funding", "Post-Closing Review"]},
                        }
                    },
                }
            },
            "Market Operations": {
                "departments": {
                    "Trade Support": {
                        "teams": {
                            "FI Trade Support": {"sub_teams": ["Bond Settlements", "Repo Operations", "Derivative Settlements"]},
                            "Equity Trade Support": {"sub_teams": ["Equity Settlements", "Corporate Actions", "Stock Borrow & Lending"]},
                        }
                    },
                    "Collateral Management": {
                        "teams": {
                            "Margin Operations": {"sub_teams": ["Margin Calls", "Collateral Substitution", "Dispute Resolution"]},
                            "Collateral Optimization": {"sub_teams": ["Collateral Allocation", "Rehypothecation", "Collateral Reporting"]},
                        }
                    },
                }
            },
        }
    },
    "Finance & Accounting": {
        "cost_centers": [
            ("CC2050", "Finance Financial Reporting"),
            ("CC2051", "Finance Treasury & ALM"),
            ("CC2052", "Finance FP&A"),
            ("CC2053", "Finance Tax"),
            ("CC2054", "Finance Regulatory Reporting"),
        ],
        "job_families": ["Financial Reporting", "Treasury Management", "FP&A", "Tax Advisory", "Regulatory Reporting", "Accounting Operations"],
        "divisions": {
            "Financial Reporting": {
                "departments": {
                    "External Reporting": {
                        "teams": {
                            "SEC Reporting": {"sub_teams": ["10-K & 10-Q Preparation", "8-K Filings", "Proxy Statement"]},
                            "IFRS Reporting": {"sub_teams": ["IFRS 9 Reporting", "IFRS 17 Reporting", "Consolidation"]},
                        }
                    },
                    "Management Reporting": {
                        "teams": {
                            "P&L Reporting": {"sub_teams": ["Business Line P&L", "Product P&L", "Entity P&L"]},
                            "Balance Sheet Reporting": {"sub_teams": ["Asset Reporting", "Liability Reporting", "Capital Reporting"]},
                        }
                    },
                }
            },
            "Treasury & ALM": {
                "departments": {
                    "Treasury": {
                        "teams": {
                            "Funding & Liquidity": {"sub_teams": ["Short-Term Funding", "Long-Term Funding", "Contingency Funding"]},
                            "Investment Portfolio": {"sub_teams": ["AFS Portfolio", "HTM Portfolio", "Trading Securities"]},
                        }
                    },
                    "Asset-Liability Management": {
                        "teams": {
                            "Interest Rate Risk": {"sub_teams": ["NII Modeling", "EVE Analysis", "Basis Risk"]},
                            "Liquidity Risk": {"sub_teams": ["LCR Management", "NSFR Management", "Intraday Liquidity"]},
                        }
                    },
                }
            },
            "FP&A": {
                "departments": {
                    "Financial Planning": {
                        "teams": {
                            "Budgeting & Forecasting": {"sub_teams": ["Revenue Forecasting", "Expense Budgeting", "Capital Planning"]},
                            "Strategic Planning": {"sub_teams": ["Long-Range Planning", "Scenario Analysis", "Business Case Analysis"]},
                        }
                    },
                    "Performance Analytics": {
                        "teams": {
                            "Profitability Analysis": {"sub_teams": ["Client Profitability", "Product Profitability", "Channel Profitability"]},
                            "Cost Analytics": {"sub_teams": ["Cost Allocation", "Activity-Based Costing", "Variance Analysis"]},
                        }
                    },
                }
            },
        }
    },
    "Compliance": {
        "cost_centers": [
            ("CC2060", "Compliance Regulatory"),
            ("CC2061", "Compliance AML & Sanctions"),
            ("CC2062", "Compliance Advisory"),
        ],
        "job_families": ["Regulatory Compliance", "AML & Sanctions", "Compliance Advisory", "Surveillance"],
        "divisions": {
            "Regulatory Compliance": {
                "departments": {
                    "Banking Regulation": {
                        "teams": {
                            "Capital & Prudential": {"sub_teams": ["Basel Compliance", "Stress Testing Compliance", "Recovery & Resolution"]},
                            "Conduct & Markets Regulation": {"sub_teams": ["MiFID Compliance", "Dodd-Frank Compliance", "Best Execution"]},
                        }
                    },
                    "Regulatory Reporting Compliance": {
                        "teams": {
                            "Prudential Reporting": {"sub_teams": ["Capital Adequacy Reporting", "Liquidity Reporting", "Large Exposure Reporting"]},
                            "Statistical Reporting": {"sub_teams": ["Central Bank Reporting", "Trade Repository Reporting", "Transaction Reporting"]},
                        }
                    },
                }
            },
            "AML & Sanctions": {
                "departments": {
                    "AML Operations": {
                        "teams": {
                            "Transaction Monitoring": {"sub_teams": ["Alert Review", "Case Investigation", "SAR Filing"]},
                            "KYC & Due Diligence": {"sub_teams": ["Client Onboarding", "Enhanced Due Diligence", "Periodic Review"]},
                        }
                    },
                    "Sanctions Compliance": {
                        "teams": {
                            "Sanctions Screening": {"sub_teams": ["Payment Screening", "Client Screening", "Embargo Compliance"]},
                            "Sanctions Policy": {"sub_teams": ["Sanctions List Management", "Sanctions Risk Assessment", "Sanctions Advisory"]},
                        }
                    },
                }
            },
        }
    },
    "Legal": {
        "cost_centers": [
            ("CC2070", "Legal General Counsel"),
            ("CC2071", "Legal Transactional"),
            ("CC2072", "Legal Regulatory & Litigation"),
        ],
        "job_families": ["Legal Advisory", "Transactional Legal", "Regulatory Legal", "Litigation"],
        "divisions": {
            "General Counsel": {
                "departments": {
                    "Corporate Legal": {
                        "teams": {
                            "Corporate Governance": {"sub_teams": ["Board Advisory", "Corporate Secretary", "Entity Management"]},
                            "Employment Law": {"sub_teams": ["Employment Advisory", "Benefits Legal", "Labor Relations"]},
                        }
                    },
                    "Legal Operations": {
                        "teams": {
                            "Legal Technology": {"sub_teams": ["Contract Management Systems", "eDiscovery Platform", "Legal Analytics"]},
                            "Outside Counsel Management": {"sub_teams": ["Firm Selection", "Fee Management", "Performance Review"]},
                        }
                    },
                }
            },
            "Transactional Legal": {
                "departments": {
                    "Banking & Finance Legal": {
                        "teams": {
                            "Lending Legal": {"sub_teams": ["Syndicated Loan Docs", "Bilateral Lending", "Restructuring Legal"]},
                            "Capital Markets Legal": {"sub_teams": ["Debt Issuance", "Equity Issuance", "Derivatives Legal"]},
                        }
                    },
                    "M&A Legal": {
                        "teams": {
                            "Deal Execution Legal": {"sub_teams": ["Due Diligence", "Transaction Structuring", "Closing & Integration"]},
                        }
                    },
                }
            },
            "Regulatory & Litigation": {
                "departments": {
                    "Regulatory Legal": {
                        "teams": {
                            "Regulatory Examinations": {"sub_teams": ["OCC Exams", "Fed Exams", "State Regulator Exams"]},
                            "Enforcement Defense": {"sub_teams": ["Investigation Response", "Consent Order Management", "Remediation Oversight"]},
                        }
                    },
                    "Litigation": {
                        "teams": {
                            "Commercial Litigation": {"sub_teams": ["Contract Disputes", "Securities Litigation", "Class Action Defense"]},
                        }
                    },
                }
            },
        }
    },
    "Human Resources": {
        "cost_centers": [
            ("CC2080", "HR Talent Acquisition"),
            ("CC2081", "HR Compensation & Benefits"),
            ("CC2082", "HR Business Partners"),
            ("CC2083", "HR Learning & Development"),
        ],
        "job_families": ["Talent Acquisition", "Compensation & Benefits", "HR Business Partnering", "Learning & Development", "HR Analytics", "Employee Relations"],
        "divisions": {
            "Talent Acquisition": {
                "departments": {
                    "Experienced Hire": {
                        "teams": {
                            "Front Office Recruiting": {"sub_teams": ["Banking Recruiting", "Markets Recruiting", "Technology Recruiting"]},
                            "Corporate Functions Recruiting": {"sub_teams": ["Risk & Compliance Recruiting", "Finance Recruiting", "Operations Recruiting"]},
                        }
                    },
                    "Campus & Early Careers": {
                        "teams": {
                            "Campus Recruiting": {"sub_teams": ["Analyst Program", "Associate Program", "Summer Internship"]},
                            "Early Career Development": {"sub_teams": ["Rotational Programs", "Graduate Schemes", "Apprenticeships"]},
                        }
                    },
                }
            },
            "Compensation & Benefits": {
                "departments": {
                    "Compensation": {
                        "teams": {
                            "Base Compensation": {"sub_teams": ["Salary Benchmarking", "Pay Equity Analysis", "Job Architecture"]},
                            "Incentive Compensation": {"sub_teams": ["Bonus Pool Management", "Deferred Compensation", "Long-Term Incentives"]},
                        }
                    },
                    "Benefits": {
                        "teams": {
                            "Health & Welfare": {"sub_teams": ["Medical Plans", "Dental & Vision", "Wellness Programs"]},
                            "Retirement Benefits": {"sub_teams": ["401k Administration", "Pension Management", "Executive Benefits"]},
                        }
                    },
                }
            },
            "HR Business Partnering": {
                "departments": {
                    "Front Office HRBP": {
                        "teams": {
                            "CIB HRBP": {"sub_teams": ["CIB Banking HRBP", "CIB Markets HRBP"]},
                            "Wealth HRBP": {"sub_teams": ["Private Banking HRBP", "Asset Management HRBP"]},
                        }
                    },
                    "Corporate Functions HRBP": {
                        "teams": {
                            "Technology HRBP": {"sub_teams": ["Engineering HRBP", "Infrastructure HRBP"]},
                            "Risk & Control HRBP": {"sub_teams": ["Risk HRBP", "Compliance HRBP", "Legal HRBP"]},
                        }
                    },
                }
            },
            "Learning & Development": {
                "departments": {
                    "Professional Development": {
                        "teams": {
                            "Leadership Development": {"sub_teams": ["Executive Leadership", "Emerging Leaders", "First-Time Managers"]},
                            "Technical Training": {"sub_teams": ["Banking & Finance Training", "Technology Training", "Risk & Compliance Training"]},
                        }
                    },
                    "Learning Operations": {
                        "teams": {
                            "Learning Technology": {"sub_teams": ["LMS Administration", "Digital Learning", "Virtual Classroom"]},
                            "Content Development": {"sub_teams": ["Curriculum Design", "eLearning Production", "Assessment Design"]},
                        }
                    },
                }
            },
        }
    },
    "Internal Audit": {
        "cost_centers": [
            ("CC2090", "Audit Financial Audit"),
            ("CC2091", "Audit Technology Audit"),
            ("CC2092", "Audit Regulatory Audit"),
        ],
        "job_families": ["Financial Audit", "Technology Audit", "Regulatory Audit", "Audit Analytics"],
        "divisions": {
            "Financial Audit": {
                "departments": {
                    "Banking Audit": {
                        "teams": {
                            "Credit Audit": {"sub_teams": ["Wholesale Credit Audit", "Retail Credit Audit", "Credit Model Audit"]},
                            "Treasury Audit": {"sub_teams": ["ALM Audit", "Investment Portfolio Audit", "Funding Audit"]},
                        }
                    },
                    "Markets Audit": {
                        "teams": {
                            "Trading Audit": {"sub_teams": ["FI Trading Audit", "Equity Trading Audit", "Derivatives Audit"]},
                            "Valuation Audit": {"sub_teams": ["Mark-to-Market Audit", "Fair Value Audit", "Model Valuation Audit"]},
                        }
                    },
                }
            },
            "Technology Audit": {
                "departments": {
                    "IT General Controls": {
                        "teams": {
                            "Access Controls Audit": {"sub_teams": ["Logical Access Audit", "Privileged Access Audit", "Segregation of Duties"]},
                            "Change Management Audit": {"sub_teams": ["SDLC Audit", "Release Management Audit", "Configuration Management"]},
                        }
                    },
                    "Cybersecurity Audit": {
                        "teams": {
                            "Security Controls Audit": {"sub_teams": ["Network Security Audit", "Application Security Audit", "Data Protection Audit"]},
                            "Incident Response Audit": {"sub_teams": ["SOC Effectiveness", "Breach Response Audit", "Forensics Capability"]},
                        }
                    },
                }
            },
        }
    },
}

# ─── Helper: flatten the SNODE tree to get paths ───

def flatten_org_paths(bl_name, divisions):
    """Returns list of tuples: (division, department, team, sub_team, [...deeper nodes])"""
    paths = []
    for div_name, div_data in divisions.items():
        for dept_name, dept_data in div_data.get("departments", {}).items():
            for team_name, team_data in dept_data.get("teams", {}).items():
                for sub_team in team_data.get("sub_teams", []):
                    paths.append((div_name, dept_name, team_name, sub_team))
    return paths


def generate_deeper_snodes(sub_team_name, depth):
    """Generate SNODE L7+ labels based on the sub-team context."""
    # L7: Function area
    functions = ["Execution", "Analysis", "Support", "Operations", "Strategy", "Advisory",
                 "Processing", "Monitoring", "Reporting", "Development", "Testing", "Review",
                 "Origination", "Structuring", "Distribution", "Coverage", "Governance"]
    # L8: Sub-function
    sub_functions = ["Front-Line", "Back-Office", "Middle-Office", "Client-Facing", "Internal",
                     "Quantitative", "Qualitative", "Manual", "Automated", "Standard", "Complex",
                     "Primary", "Secondary", "Inbound", "Outbound", "Regulatory", "Commercial"]
    # L9: Specialty
    specialties = ["Core Process", "Exception Handling", "Escalation", "Quality Assurance",
                   "Reconciliation", "Validation", "Enrichment", "Transformation", "Delivery",
                   "Investigation", "Resolution", "Documentation", "Certification", "Integration"]
    # L10: Sub-Specialty
    sub_specialties = ["Tier 1", "Tier 2", "Tier 3", "Priority", "Standard", "Expedited",
                       "Batch", "Real-Time", "Scheduled", "On-Demand", "Periodic", "Ad-Hoc"]
    # L11: Unit
    units = ["Unit A", "Unit B", "Unit C", "Unit Alpha", "Unit Beta", "Unit Gamma",
             "Team Lead Unit", "Senior Unit", "Junior Unit", "Specialist Unit"]
    # L12: Desk
    desks = ["Desk 1", "Desk 2", "Desk 3", "Morning Shift", "Afternoon Shift", "EMEA Hours",
             "NA Hours", "APAC Hours", "Global Desk", "Regional Desk"]
    # L13-L15 (only for some)
    pods = ["Pod Alpha", "Pod Beta", "Pod Gamma", "Pod Delta", "Pod Epsilon"]
    seats = ["Seat 1", "Seat 2", "Seat 3", "Seat 4"]
    micro = ["Workstream A", "Workstream B", "Workstream C"]

    random.seed(hash(sub_team_name) + depth)  # deterministic per sub-team
    result = []
    if depth >= 7: result.append(random.choice(functions))
    if depth >= 8: result.append(random.choice(sub_functions))
    if depth >= 9: result.append(random.choice(specialties))
    if depth >= 10: result.append(random.choice(sub_specialties))
    if depth >= 11: result.append(random.choice(units))
    if depth >= 12: result.append(random.choice(desks))
    if depth >= 13: result.append(random.choice(pods))
    if depth >= 14: result.append(random.choice(seats))
    if depth >= 15: result.append(random.choice(micro))
    return result


# ─── Main Generation ───

def generate_employees(n=1000):
    employees = []
    used_ids = set()
    manager_names = []

    # Pre-generate some manager names
    for _ in range(100):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        manager_names.append(f"{fn} {ln}")

    # Pre-build paths per business line
    bl_paths = {}
    for bl_name, bl_data in ORG_STRUCTURE.items():
        paths = flatten_org_paths(bl_name, bl_data["divisions"])
        bl_paths[bl_name] = {
            "paths": paths,
            "cost_centers": bl_data["cost_centers"],
            "job_families": bl_data["job_families"],
        }

    bl_names = list(ORG_STRUCTURE.keys())
    # Weight business lines roughly
    bl_weights = {
        "Corporate & Institutional Banking": 0.15,
        "Global Markets": 0.12,
        "Wealth & Private Banking": 0.10,
        "Risk Management": 0.12,
        "Technology & Operations": 0.20,
        "Finance & Accounting": 0.10,
        "Compliance": 0.06,
        "Legal": 0.05,
        "Human Resources": 0.06,
        "Internal Audit": 0.04,
    }

    for i in range(n):
        # Pick business line
        bl = random.choices(bl_names, weights=[bl_weights[b] for b in bl_names], k=1)[0]
        bl_info = bl_paths[bl]

        # Pick org path
        path = random.choice(bl_info["paths"])
        division, department, team, sub_team = path

        # Pick cost center (weighted toward related ones)
        cc_code, cc_name = random.choice(bl_info["cost_centers"])

        # Pick job family
        jf = random.choice(bl_info["job_families"])

        # Pick grade
        grade = random.choice(GRADES)

        # Generate job title (grade is NOT in the title per requirements)
        # Use sub-team + function-specific title
        title_specialties = [sub_team, team, department]
        title_base = random.choice(title_specialties[:2])  # Prefer more specific
        job_title = f"{title_base} Specialist"
        # Vary title suffixes
        title_suffixes = ["Specialist", "Lead", "Coordinator", "Officer", "Advisor",
                         "Consultant", "Manager", "Strategist", "Analyst", "Engineer",
                         "Architect", "Administrator", "Examiner", "Controller", "Associate"]
        job_title = f"{title_base} {random.choice(title_suffixes)}"

        # Generate Employee ID
        while True:
            eid = f"{random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{random.randint(100000, 999999)}"
            if eid not in used_ids:
                used_ids.add(eid)
                break

        # Name
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)

        # Region & Location
        region = random.choice(list(REGIONS.keys()))
        region_data = REGIONS[region]
        sub_region = random.choice(list(region_data["sub_regions"].keys()))
        sr_data = region_data["sub_regions"][sub_region]
        country = random.choice(list(sr_data["countries"].keys()))
        city, site_code = random.choice(sr_data["countries"][country])

        # Legal entity
        legal_entity = LEGAL_ENTITIES[region]

        # Hire date (between 2000 and 2025)
        start = datetime(2000, 1, 1)
        end = datetime(2025, 6, 1)
        hire_date = start + timedelta(days=random.randint(0, (end - start).days))

        # Manager
        manager = random.choice(manager_names)

        # SNODE depth: L12 minimum, some go to L13 (30%), L14 (15%), L15 (5%)
        r = random.random()
        if r < 0.05:
            snode_depth = 15
        elif r < 0.20:
            snode_depth = 14
        elif r < 0.50:
            snode_depth = 13
        else:
            snode_depth = 12

        # Build SNODE levels
        # L1 = Commercial Bank (always)
        # L2 = Business Line
        # L3 = Division
        # L4 = Department
        # L5 = Team
        # L6 = Sub-Team
        # L7-L15 = generated deeper nodes
        deeper = generate_deeper_snodes(f"{bl}|{sub_team}|{i}", snode_depth)

        snodes = [
            "Commercial Bank",   # L1
            bl,                  # L2
            division,            # L3
            department,          # L4
            team,                # L5
            sub_team,            # L6
        ]
        snodes.extend(deeper)  # L7+

        # Pad to 15
        while len(snodes) < 15:
            snodes.append("")

        employee = {
            "Employee First Name": first_name,
            "Employee Last Name": last_name,
            "Employee ID": eid,
            "Employment Type": "Full-Time",
            "Employment Status": "Active",
            "Hire Date": hire_date.strftime("%m/%d/%Y"),
            "Contract End Date": "",
            "Legal Entity": legal_entity,
            "Job Title": job_title,
            "Job Code": str(random.randint(100000, 999999)),
            "Job Family": jf,
            "Job Grade / Band": grade,
            "Manager Name": manager,
            "Region": region,
            "Sub-Region / Country": sub_region,
            "Country": country,
            "Employee Location (City)": city,
            "Office / Site Code": site_code,
            "Cost Center": cc_code,
            "Cost Center Name": cc_name,
            "Business Line": bl,
        }

        # Add SNODE columns
        for lvl in range(1, 16):
            employee[f"SNODE L{lvl}"] = snodes[lvl - 1]

        employees.append(employee)

    return employees


if __name__ == "__main__":
    import os
    print("Generating 1000 employees...")
    employees = generate_employees(1000)

    # Column order
    columns = [
        "Employee First Name", "Employee Last Name", "Employee ID",
        "Employment Type", "Employment Status", "Hire Date", "Contract End Date",
        "Legal Entity", "Job Title", "Job Code", "Job Family", "Job Grade / Band",
        "Manager Name", "Region", "Sub-Region / Country", "Country",
        "Employee Location (City)", "Office / Site Code",
        "Cost Center", "Cost Center Name", "Business Line",
    ]
    for lvl in range(1, 16):
        columns.append(f"SNODE L{lvl}")

    out_path = r"C:\Users\augyp\OneDrive\Desktop\RBAC Claude Project\data\commercial_bank_hr_data_v2.csv"
    temp_path = out_path
    with open(temp_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(employees)

    print(f"Written {len(employees)} employees to {out_path}")
    print(f"Columns: {len(columns)}")

    # Quick stats
    bls = {}
    jfs = {}
    ccs = {}
    titles = set()
    snode_depths = []
    for e in employees:
        bl = e["Business Line"]
        bls[bl] = bls.get(bl, 0) + 1
        jf = e["Job Family"]
        jfs[jf] = jfs.get(jf, 0) + 1
        cc = e["Cost Center Name"]
        ccs[cc] = ccs.get(cc, 0) + 1
        titles.add(e["Job Title"])
        # Measure SNODE depth
        depth = 0
        for lvl in range(1, 16):
            if e[f"SNODE L{lvl}"]:
                depth = lvl
        snode_depths.append(depth)

    print(f"\nBusiness Lines ({len(bls)}):")
    for bl, cnt in sorted(bls.items(), key=lambda x: -x[1]):
        print(f"  {bl}: {cnt}")
    print(f"\nJob Families ({len(jfs)}):")
    for jf, cnt in sorted(jfs.items(), key=lambda x: -x[1]):
        print(f"  {jf}: {cnt}")
    print(f"\nCost Centers ({len(ccs)}):")
    for cc, cnt in sorted(ccs.items(), key=lambda x: -x[1]):
        print(f"  {cc}: {cnt}")
    print(f"\nUnique Job Titles: {len(titles)}")
    print(f"\nSNODE Depth Distribution:")
    from collections import Counter
    for depth, cnt in sorted(Counter(snode_depths).items()):
        print(f"  L{depth}: {cnt} employees ({cnt/10:.1f}%)")
