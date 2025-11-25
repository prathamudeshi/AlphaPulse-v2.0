import yaml
import re
import datetime
import json
import numpy as np
from typing import Dict, Tuple
import logging
import os
from .llm_model import LLM_Model

# Configure logging
logger = logging.getLogger(__name__)

# Try to import heavy dependencies
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Could not import sentence_transformers or sklearn: {e}. Semantic analysis will be disabled.")
    SENTENCE_TRANSFORMERS_AVAILABLE = False
except Exception as e:
    logger.warning(f"Error importing sentence_transformers: {e}. Semantic analysis will be disabled.")
    SENTENCE_TRANSFORMERS_AVAILABLE = False

def load_rules():
    # Loads safety rules from YAML config
    try:
        # Use path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        rules_path = os.path.join(current_dir, "filter_rules.yaml")
        with open(rules_path, "r") as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        logger.warning("No filter_rules.yaml found, using defaults.")
        return {
            "context_threshold": 0.85,
            "intent_threshold": 0.70,
            "safety_categories": {
                "violence": {
                    "blocked_patterns": ["how to kill", "how to harm"],
                    "discussion_patterns": ["is violence", "what is violence"]
                }
            }
        }

class ContextAwareFilter:
    # Context-aware filtering
    def __init__(self, rules: Dict):
        self.rules = rules
        self.semantic_model = None
        self.harmful_intents = None
        self.legitimate_topics = None
        
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                # Load model once
                self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.harmful_intents = self.semantic_model.encode(rules.get("harmful_intents", []))
                self.legitimate_topics = self.semantic_model.encode(rules.get("legitimate_topics", []))
            except Exception as e:
                logger.error(f"Failed to load SentenceTransformer model: {e}")
                self.semantic_model = None

    def analyze_context(self, text: str) -> Tuple[str, float, str]:
        text_lower = text.lower()
        for category, patterns in self.rules.get("safety_categories", {}).items():
            for pattern in patterns.get("blocked_patterns", []):
                if pattern in text_lower:
                    return category, 0.95, "high"
            for pattern in patterns.get("discussion_patterns", []):
                if pattern in text_lower:
                    return category, 0.3, "low"
        
        # Semantic analysis
        if self.semantic_model is not None:
            try:
                text_embedding = self.semantic_model.encode([text])[0]
                
                harmful_similarities = cosine_similarity([text_embedding], self.harmful_intents)[0]
                max_harmful = np.max(harmful_similarities) if len(harmful_similarities) > 0 else 0
                
                legitimate_similarities = cosine_similarity([text_embedding], self.legitimate_topics)[0]
                max_legitimate = np.max(legitimate_similarities) if len(legitimate_similarities) > 0 else 0
                
                if max_harmful > self.rules.get("intent_threshold", 0.7):
                    return "intent", float(max_harmful), "high"
                elif max_legitimate > 0.6:
                    return "neutral", float(max_legitimate), "low"
                elif max_harmful > 0.5:
                    return "suspicious", float(max_harmful), "medium"
            except Exception as e:
                logger.error(f"Error during semantic analysis: {e}")
        
        return "neutral", 0.0, "low"

    def check_patterns(self, text: str) -> Tuple[bool, str, str]:
        text_lower = text.lower()
        # Regexes for harmful instructions
        harmful_instructions = [
            r"\b(how to|ways to|methods of|instructions for)\s+(kill|harm|hurt|attack|fight|assault)",
            r"\b(step by step|detailed guide|tutorial)\s+(for|on)\s+(violence|illegal|harmful)",
            r"\b(make|create|build)\s+(weapon|bomb|explosive|gun)",
            r"\b(how to|ways to|methods of)\s+(make|create|build)\s+(a\s+)?(bomb|explosive|dynamite|tnt|gunpowder|gun|weapon)",
            r"\b(bomb|explosive|weapon)\s+(making|creation|building)",
            r"\b(recipe|formula|instructions)\s+(for|to make)\s+(bomb|explosive|weapon)",
            r"\b(step by step|detailed)\s+(bomb|explosive|weapon)",
            r"\b(how to|ways to|methods of)\s+(commit suicide|kill myself|end my life|harm myself)",
            r"\b(instructions|step by step)\s+(for|to)\s+(suicide|self-harm)",
            r"\b(how to|ways to|methods of)\s+(hack|steal|cheat|rob|burglarize|vandalize|break into)",
            r"\b(how to|ways to)\s+(get away with|avoid detection)",
            r"\b(instructions|step by step)\s+(for|to)\s+(crime|illegal)",
            r"\b(how to|ways to)\s+(discriminate|spread hate|bully|harass)",
            r"\b(instructions|step by step)\s+(for|to)\s+(hate speech|discrimination)",
            r"\b(how to|ways to)\s+(stalk|spy|invade privacy|hack into|track someone|monitor someone)",
            r"\b(instructions|step by step)\s+(for|to)\s+(stalking|spying)",
            r"\b(how to|ways to)\s+(scam|defraud|steal money|launder money|forge|counterfeit)",
            r"\b(instructions|step by step)\s+(for|to)\s+(fraud|scam)",
            r"\b(how to|ways to)\s+(make|create|synthesize)\s+(drugs|poison|chemicals)",
            r"\b(recipe|formula|instructions)\s+(for|to make)\s+(drugs|poison)",
            r"\b(step by step)\s+(drug|poison|chemical)",
            r"\b(how to|ways to)\s+(spread misinformation|create fake news|manipulate information)",
            r"\b(commit|attempt)\s+(suicide|murder|crime)",
            r"\b(promote|encourage|advocate)\s+(violence|hate|discrimination)",
            r"\b(bypass|circumvent)\s+(security|safety|protection)",
        ]
        for pattern in harmful_instructions:
            if re.search(pattern, text_lower):
                if any(word in pattern for word in ['bomb', 'explosive', 'weapon', 'gun']):
                    return True, "Dangerous weapons/explosives instruction", "weapons_explosives"
                elif any(word in pattern for word in ['suicide', 'self-harm', 'kill myself']):
                    return True, "Self-harm instruction", "self_harm"
                elif any(word in pattern for word in ['hack', 'steal', 'crime', 'illegal']):
                    return True, "Illegal activity instruction", "illegal_activities"
                elif any(word in pattern for word in ['discriminate', 'hate', 'bully', 'harass']):
                    return True, "Hate speech/harassment instruction", "hate_speech"
                elif any(word in pattern for word in ['stalk', 'spy', 'privacy']):
                    return True, "Privacy violation instruction", "privacy_violations"
                elif any(word in pattern for word in ['scam', 'fraud', 'steal money']):
                    return True, "Financial fraud instruction", "financial_fraud"
                elif any(word in pattern for word in ['drugs', 'poison', 'chemicals']):
                    return True, "Dangerous substance instruction", "dangerous_substances"
                else:
                    return True, "Harmful instruction", "instruction"
        return False, "", ""

class SafetyFilter:
    # Main safety filter
    def __init__(self):
        self.rules = load_rules()
        self.context_filter = ContextAwareFilter(self.rules)
        # Removed SafetyAnalytics for direct integration to avoid file locking/concurrency issues in Django
        # Logging is handled via standard logging

    def assess_risk(self, text: str) -> Dict:
        category, confidence, risk_level = self.context_filter.analyze_context(text)
        should_block, reason, pattern_category = self.context_filter.check_patterns(text)
        risk_assessment = {
            "text": text,
            "category": category,
            "confidence": confidence,
            "risk_level": risk_level,
            "should_block": should_block,
            "reason": reason,
            "pattern_category": pattern_category,
            "timestamp": datetime.datetime.now().isoformat()
        }
        # If category is neutral, always allow
        if category == "neutral":
            risk_assessment["action"] = "allow"
            risk_assessment["final_risk"] = "low"
            return risk_assessment
        if should_block:
            risk_assessment["action"] = "block"
            risk_assessment["final_risk"] = "high"
        elif confidence > self.rules.get("context_threshold", 0.85):
            risk_assessment["action"] = "block"
            risk_assessment["final_risk"] = "high"
        elif confidence > 0.6:
            risk_assessment["action"] = "flag"
            risk_assessment["final_risk"] = "medium"
        else:
            risk_assessment["action"] = "allow"
            risk_assessment["final_risk"] = "low"
        return risk_assessment
    
    def LLM_verification(self, text:str, model_name: str = "gemini-2.5-flash") -> Dict:
        # Optional: Can be enabled if needed, but might add latency
        # For now, we'll skip or implement if specifically requested to keep it fast
        # model = LLM_Model(model_name)
        # verified_reponse = model.verify(text)
        # return verified_reponse
        return {"should_block": False} # Default pass for now to save latency

    def filter_query(self, query: str, user_context: str = "", model_name: str = "gemini-2.5-flash") -> Tuple[bool, str, Dict]:
        if not query.strip():
            return True, "Please provide a query.", {"action": "allow", "final_risk": "low"}
        
        max_length = self.rules.get("performance", {}).get("max_text_length", 10000)
        if len(query) > max_length:
            return False, "Query too long. Please keep it under 10,000 characters.", {"action": "block", "final_risk": "low"}
            
        risk_assessment = self.assess_risk(query)
        
        # Log risk assessment
        if risk_assessment["final_risk"] != "low":
            logger.info(f"Safety Filter Risk: {risk_assessment}")

        # Rules based
        if risk_assessment["category"] == "neutral":
            return True, "Looks good.", risk_assessment
            
        if risk_assessment["action"] == "block":
            if risk_assessment["category"] == "intent":
                return False, "Sorry, I can't help with that. If you need help, please reach out to someone you trust.", risk_assessment
            else:
                return False, f"This query looks unsafe. {risk_assessment.get('reason', '')}", risk_assessment
        elif risk_assessment["action"] == "flag":
            return True, f"This query has been flagged for review but will be processed.", risk_assessment
        else:
            return True, "Looks good.", risk_assessment

    def filter_response(self, response: str) -> Tuple[bool, str]:
        response_lower = response.lower()
        for pattern in self.rules.get("restricted_outputs", []):
            if pattern.lower() in response_lower:
                logger.warning(f"Response blocked due to restricted pattern: {pattern}")
                return False, "Response blocked: Contains restricted content"
        return True, response
