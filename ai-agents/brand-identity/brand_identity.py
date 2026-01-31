import openai
import json
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import colorsys

class BrandTone(Enum):
    PROFESSIONAL = "professional"
    PLAYFUL = "playful"
    LUXURY = "luxury"
    MODERN = "modern"
    TRUSTWORTHY = "trustworthy"
    INNOVATIVE = "innovative"

@dataclass
class BrandIdentityConfig:
    company_name: str
    industry: str
    target_audience: str
    brand_tone: BrandTone
    core_values: List[str]
    mission_statement: str
    vision_statement: str
    competitors: List[str] = None
    existing_assets: List[str] = None

class BrandIdentityGenerator:
    def __init__(self):
        self.openai_api_key = openai.api_key
        
    def generate_complete_identity(self, config: BrandIdentityConfig) -> Dict:
        """
        Generate complete brand identity package
        """
        identity = {
            "brand_strategy": self._generate_brand_strategy(config),
            "visual_identity": self._generate_visual_identity(config),
            "verbal_identity": self._generate_verbal_identity(config),
            "brand_guidelines": self._generate_brand_guidelines(config),
            "applications": self._generate_applications(config)
        }
        
        return identity
    
    def _generate_brand_strategy(self, config: BrandIdentityConfig) -> Dict:
        """
        Generate brand strategy components
        """
        try:
            prompt = f"""
            Company: {config.company_name}
            Industry: {config.industry}
            Target Audience: {config.target_audience}
            Brand Tone: {config.brand_tone.value}
            Core Values: {', '.join(config.core_values)}
            Mission: {config.mission_statement}
            Vision: {config.vision_statement}
            Competitors: {', '.join(config.competitors or [])}
            
            Generate a comprehensive brand strategy including:
            1. Brand Positioning Statement
            2. Unique Value Proposition
            3. Target Audience Personas (3 personas)
            4. Competitive Analysis
            5. Brand Promise
            6. Brand Personality Traits
            7. Brand Story
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a brand strategist with 20+ years of experience."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            strategy_text = response.choices[0].message.content
            
            # Parse the response into structured data
            strategy = self._parse_strategy_response(strategy_text)
            
            return strategy
            
        except Exception as e:
            print(f"Error generating brand strategy: {str(e)}")
            return self._get_default_strategy(config)
    
    def _parse_strategy_response(self, response_text: str) -> Dict:
        """
        Parse AI response into structured strategy
        """
        # This is a simplified parser - in production, use more sophisticated parsing
        lines = response_text.split('\n')
        strategy = {
            "positioning_statement": "",
            "value_proposition": "",
            "audience_personas": [],
            "competitive_analysis": {},
            "brand_promise": "",
            "personality_traits": [],
            "brand_story": ""
        }
        
        current_section = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if "Positioning Statement" in line or "1." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "positioning_statement"
                current_content = []
            elif "Value Proposition" in line or "2." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "value_proposition"
                current_content = []
            elif "Persona" in line or "3." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "audience_personas"
                current_content = [line]
            elif "Competitive" in line or "4." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "competitive_analysis"
                current_content = []
            elif "Brand Promise" in line or "5." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "brand_promise"
                current_content = []
            elif "Personality" in line or "6." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "personality_traits"
                current_content = []
            elif "Brand Story" in line or "7." in line:
                if current_section:
                    strategy[current_section] = ' '.join(current_content)
                current_section = "brand_story"
                current_content = []
            else:
                current_content.append(line)
        
        if current_section:
            strategy[current_section] = ' '.join(current_content)
        
        return strategy
    
    def _get_default_strategy(self, config: BrandIdentityConfig) -> Dict:
        """
        Get default brand strategy structure
        """
        return {
            "positioning_statement": f"{config.company_name} is positioned as a leading {config.brand_tone.value} brand in the {config.industry} industry.",
            "value_proposition": f"Delivering {config.core_values[0]} solutions for {config.target_audience}.",
            "audience_personas": [
                {
                    "name": "Primary Audience",
                    "description": f"{config.target_audience} seeking {config.brand_tone.value} solutions"
                }
            ],
            "competitive_analysis": {
                "differentiators": config.core_values,
                "market_position": "innovator"
            },
            "brand_promise": f"To deliver {', '.join(config.core_values[:2])} to our customers.",
            "personality_traits": [config.brand_tone.value, "reliable", "innovative"],
            "brand_story": f"The story of {config.company_name} begins with a vision to revolutionize the {config.industry} industry."
        }
    
    def _generate_visual_identity(self, config: BrandIdentityConfig) -> Dict:
        """
        Generate visual identity components
        """
        color_palette = self._generate_color_palette(config)
        typography = self._generate_typography(config)
        imagery_style = self._generate_imagery_style(config)
        
        return {
            "color_palette": color_palette,
            "typography": typography,
            "imagery_style": imagery_style,
            "logo_usage": self._generate_logo_usage_guidelines(),
            "layout_principles": self._generate_layout_principles(config),
            "iconography": self._generate_iconography_style(config)
        }
    
    def _generate_color_palette(self, config: BrandIdentityConfig) -> Dict:
        """
        Generate brand color palette based on brand tone
        """
        color_themes = {
            BrandTone.PROFESSIONAL: {
                "primary": ["#1E3A8A", "#3B82F6", "#93C5FD"],
                "secondary": ["#047857", "#10B981", "#A7F3D0"],
                "neutral": ["#111827", "#6B7280", "#D1D5DB", "#F9FAFB"]
            },
            BrandTone.PLAYFUL: {
                "primary": ["#DC2626", "#F97316", "#FBBF24"],
                "secondary": ["#7C3AED", "#EC4899", "#F0ABFC"],
                "neutral": ["#1F2937", "#9CA3AF", "#E5E7EB", "#FEF3C7"]
            },
            BrandTone.LUXURY: {
                "primary": ["#000000", "#78350F", "#92400E"],
                "secondary": ["#451A03", "#7C2D12", "#F59E0B"],
                "neutral": ["#1F2937", "#4B5563", "#D1D5DB", "#F5F5F4"]
            },
            BrandTone.MODERN: {
                "primary": ["#0F766E", "#14B8A6", "#5EEAD4"],
                "secondary
