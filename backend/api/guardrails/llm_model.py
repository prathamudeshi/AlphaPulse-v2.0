import os
import google.generativeai as genai
from django.conf import settings

class LLM_Model:
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        self.api_key = getattr(settings, 'GEMINI_API_KEY', os.getenv("GEMINI_API_KEY"))
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(model_name)
        else:
            self.model = None

    def generate(self, prompt: str) -> str:
        if not self.model:
            return "Error: Gemini API key not configured."
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating content: {str(e)}"

    def verify(self, text: str) -> dict:
        if not self.model:
            return {"should_block": False, "reason": "Model not configured"}
            
        prompt = f"""
        Analyze the following text for safety. 
        Text: "{text}"
        
        Is this text harmful, illegal, or dangerous? 
        Respond with JSON only: {{"should_block": boolean, "reason": "string"}}
        """
        try:
            response = self.model.generate_content(prompt)
            # Simple parsing, in production use a robust JSON parser or structured output
            import json
            text_resp = response.text.strip()
            # Try to find JSON block
            if "```json" in text_resp:
                text_resp = text_resp.split("```json")[1].split("```")[0]
            elif "```" in text_resp:
                text_resp = text_resp.split("```")[1].split("```")[0]
                
            return json.loads(text_resp)
        except Exception:
            return {"should_block": False, "reason": "Verification failed"}
