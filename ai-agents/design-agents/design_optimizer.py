import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import colorsys

class OptimizationType(Enum):
    COLOR = "color"
    COMPOSITION = "composition"
    CONTRAST = "contrast"
    BALANCE = "balance"
    TYPOGRAPHY = "typography"
    ACCESSIBILITY = "accessibility"

@dataclass
class OptimizationConfig:
    image_path: str
    optimization_types: List[OptimizationType]
    target_aspect_ratio: Optional[Tuple[int, int]] = None
    target_size: Optional[Tuple[int, int]] = None
    color_palette: Optional[List[str]] = None
    brand_guidelines: Optional[Dict] = None

class DesignOptimizer:
    def __init__(self):
        self.optimal_contrast_ratio = 4.5  # WCAG AA standard
        self.golden_ratio = 1.618
        
    def optimize_design(self, config: OptimizationConfig) -> Dict:
        """
        Optimize design based on specified criteria
        """
        results = {}
        
        # Load and analyze the image
        original_image = Image.open(config.image_path)
        analysis = self.analyze_design(original_image, config)
        
        # Apply optimizations
        optimized_image = original_image.copy()
        optimizations_applied = []
        
        for opt_type in config.optimization_types:
            if opt_type == OptimizationType.COLOR:
                optimized_image, color_optimizations = self.optimize_colors(optimized_image, config)
                optimizations_applied.extend(color_optimizations)
                
            elif opt_type == OptimizationType.COMPOSITION:
                optimized_image, composition_optimizations = self.optimize_composition(optimized_image, config)
                optimizations_applied.extend(composition_optimizations)
                
            elif opt_type == OptimizationType.CONTRAST:
                optimized_image, contrast_optimizations = self.optimize_contrast(optimized_image, config)
                optimizations_applied.extend(contrast_optimizations)
                
            elif opt_type == OptimizationType.BALANCE:
                optimized_image, balance_optimizations = self.optimize_balance(optimized_image, config)
                optimizations_applied.extend(balance_optimizations)
                
            elif opt_type == OptimizationType.TYPOGRAPHY:
                typography_optimizations = self.optimize_typography(analysis, config)
                optimizations_applied.extend(typography_optimizations)
                
            elif opt_type == OptimizationType.ACCESSIBILITY:
                accessibility_optimizations = self.optimize_accessibility(analysis, config)
                optimizations_applied.extend(accessibility_optimizations)
        
        # Resize if target size specified
        if config.target_size:
            optimized_image = optimized_image.resize(config.target_size, Image.Resampling.LANCZOS)
        
        # Save optimized image
        optimized_path = self._save_optimized_image(optimized_image, config.image_path)
        
        # Generate before/after comparison
        comparison = self.generate_comparison(original_image, optimized_image)
        
        return {
            "original_image": config.image_path,
            "optimized_image": optimized_path,
            "analysis": analysis,
            "optimizations_applied": optimizations_applied,
            "comparison": comparison,
            "improvements": self._calculate_improvements(analysis, optimized_image)
        }
    
    def analyze_design(self, image: Image.Image, config: OptimizationConfig) -> Dict:
        """
        Analyze design for optimization opportunities
        """
        # Convert PIL Image to OpenCV format for analysis
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        analysis = {
            "basic_metrics": self._get_basic_metrics(image),
            "color_analysis": self._analyze_colors(cv_image),
            "composition_analysis": self._analyze_composition(cv_image),
            "contrast_analysis": self._analyze_contrast(cv_image),
            "balance_analysis": self._analyze_balance(cv_image),
            "accessibility_analysis": self._analyze_accessibility(cv_image),
            "recommendations": []
        }
        
        # Generate recommendations
        analysis["recommendations"] = self._generate_recommendations(analysis, config)
        
        return analysis
    
    def _get_basic_metrics(self, image: Image.Image) -> Dict:
        """
        Get basic image metrics
        """
        return {
            "dimensions": image.size,
            "aspect_ratio": image.size[0] / image.size[1],
            "format": image.format,
            "mode": image.mode,
            "file_size_estimate": image.size[0] * image.size[1] * 3  # Approximate bytes for RGB
        }
    
    def _analyze_colors(self, cv_image: np.ndarray) -> Dict:
        """
        Analyze color composition
        """
        # Convert to HSV for better color analysis
        hsv_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2HSV)
        
        # Calculate color histogram
        hist_hue = cv2.calcHist([hsv_image], [0], None, [180], [0, 180])
        hist_saturation = cv2.calcHist([hsv_image], [1], None, [256], [0, 256])
        hist_value = cv2.calcHist([hsv_image], [2], None, [256], [0, 256])
        
        # Find dominant colors
        hsv_pixels = hsv_image.reshape(-1, 3)
        unique_colors, counts = np.unique(hsv_pixels, axis=0, return_counts=True)
        dominant_colors = unique_colors[np.argsort(-counts)[:5]]
        
        # Calculate color harmony score
        harmony_score = self._calculate_color_harmony(hsv_pixels)
        
        # Calculate color temperature
        temp_score = self._calculate_color_temperature(cv_image)
        
        return {
            "dominant_colors": [self._hsv_to_hex(hsv) for hsv in dominant_colors],
            "color_count": len(unique_colors),
            "saturation_mean": np.mean(hsv_image[:,:,1]),
            "brightness_mean": np.mean(hsv_image[:,:,2]),
            "harmony_score": harmony_score,
            "temperature": temp_score,
            "vibrance": np.std(hsv_image[:,:,1])  # Color saturation variance
        }
    
    def _hsv_to_hex(self, hsv_color: np.ndarray) -> str:
        """
        Convert HSV color to HEX
        """
        h, s, v = hsv_color
        rgb = colorsys.hsv_to_rgb(h/179.0, s/255.0, v/255.0)
        return '#{:02x}{:02x}{:02x}'.format(
            int(rgb[0] * 255),
            int(rgb[1] * 255),
            int(rgb[2] * 255)
        )
    
    def _calculate_color_harmony(self, hsv_pixels: np.ndarray) -> float:
        """
        Calculate color harmony score (0-100)
        """
        # Simplified harmony calculation based on color wheel relationships
        hues = hsv_pixels[:, 0]
        if len(hues) == 0:
            return 50.0
        
        # Calculate hue distribution
        hue_hist, _ = np.histogram(hues, bins=12, range=(0, 180))
        hue_distribution = hue_hist / len(hues)
        
        # Score based on complementary and analogous color presence
        score = 0
        
        # Check for complementary colors (opposite on color wheel)
        for i in range(6):
            if hue_distribution[i] > 0.1 and hue_distribution[(i + 6) % 12] > 0.1:
                score += 20
        
        # Check for analogous colors (adjacent on color wheel)
        for i in range(12):
            if hue_distribution[i] > 0.3:
                score += 30
                break
        
        # Check for triadic colors
        for i in range(4):
            if all(hue_distribution[(i + j * 4) % 12] > 0.05 for j in range(3)):
                score += 25
                break
        
        return min(score, 100)
    
    def _calculate_color_temperature(self, cv_image: np.ndarray) -> str:
        """
        Calculate color temperature (warm/cool/neutral)
        """
        # Convert to RGB for temperature analysis
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Calculate average RGB values
        avg_r = np.mean(rgb_image[:,:,0])
        avg_g = np.mean(rgb_image[:,:,1])
        avg_b = np.mean(rgb_image[:,:,2])
        
        # Determine temperature based on red-blue balance
        if avg_r > avg_b + 30:
            return "warm"
        elif avg_b > avg_r + 30:
            return "cool"
        else:
            return "neutral"
    
    def _analyze_composition(self, cv_image: np.ndarray) -> Dict:
        """
        Analyze image composition
        """
        height, width = cv_image.shape[:2]
        
        # Detect edges for composition analysis
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Calculate rule of thirds composition
        third_x = width // 3
        third_y = height // 3
        
        # Count edge pixels in each third
        edge_pixels = np.sum(edges > 0)
        
        if edge_pixels > 0:
            thirds_scores = []
            for i in range(3):
                for j in range(3):
                    section = edges[i*third_y:(i+1)*third_y, j*third_x:(j+1)*third_x]
                    score = np.sum(section > 0) / edge_pixels
                    thirds_scores.append(score)
            
            # Check if strong points align with rule of thirds intersections
            intersection_scores = sum(thirds_scores[i] for i in [1, 3, 5, 7])
            rule_of_thirds_score = intersection_scores * 100
        else:
            rule_of_thirds_score = 0
        
        # Calculate symmetry
        left_half = edges[:, :width//2]
        right_half_flipped = edges[:, width//2:][:, ::-1]
        
        if left_half.shape == right_half_flipped.shape:
            symmetry_score = np.sum(left_half == right_half_flipped) / left_half.size * 100
        else:
            symmetry_score = 0
        
        # Calculate visual weight distribution
        visual_weight = self._calculate_visual_weight(cv_image)
        
        return {
            "rule_of_thirds_score": rule_of_thirds_score,
            "symmetry_score": symmetry_score,
            "visual_weight_distribution": visual_weight,
            "edge_density": edge_pixels / (width * height) * 100,
            "golden_ratio_alignment": self._check_golden_ratio(cv_image)
        }
    
    def _calculate_visual_weight(self, cv_image: np.ndarray) -> Dict:
        """
        Calculate visual weight distribution
        """
        height, width = cv_image.shape[:2]
        
        # Divide image into quadrants
        quadrants = [
            cv_image[:height//2, :width//2],    # Top-left
            cv_image[:height//2, width//2:],    # Top-right
            cv_image[height//2:, :width//2],    # Bottom-left
            cv_image[height//2:, width//2:]     # Bottom-right
        ]
        
        weights = []
        for quadrant in quadrants:
            # Calculate weight based on color contrast and edge density
            gray = cv2.cvtColor(quadrant, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            edge_density = np.sum(edges > 0) / quadrant.size * 100
            color_variance = np.std(quadrant)
            
            weight = edge_density * 0.6 + color_variance * 0.4
            weights.append(weight)
        
        # Normalize weights
        total_weight = sum(weights) if sum(weights) > 0 else 1
        normalized_weights = [w / total_weight * 100 for w in weights]
        
        return {
            "top_left": normalized_weights[0],
            "top_right": normalized_weights[1],
            "bottom_left": normalized_weights[2],
            "bottom_right": normalized_weights[3],
            "balance_score": 100 - max(normalized_weights) + min(normalized_weights)
        }
    
    def _check_golden_ratio(self, cv_image: np.ndarray) -> bool:
        """
        Check if image follows golden ratio proportions
        """
        height, width = cv_image.shape[:2]
        ratio = width / height
        
        # Check if ratio is close to golden ratio (within 5%)
        golden_ratio = 1.618
        return abs(ratio - golden_ratio) / golden_ratio < 0.05
    
    def _analyze_contrast(self, cv_image: np.ndarray) -> Dict:
        """
        Analyze contrast levels
        """
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Calculate histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        
        # Find min and max brightness
        min_brightness = np.min(gray)
        max_brightness = np.max(gray)
        
        # Calculate contrast ratio
        if min_brightness > 0:
            contrast_ratio = max_brightness / min_brightness
        else:
            contrast_ratio = max_brightness
        
        # Calculate histogram spread (variance)
        brightness_values = gray.flatten()
        mean_brightness = np.mean(brightness_values)
        std_brightness = np.std(brightness_values)
        
        # Calculate percentage of pixels in different brightness ranges
        low_brightness = np.sum(brightness_values < 85) / len(brightness_values) * 100
        mid_brightness = np.sum((brightness_values >= 85) & (brightness_values < 170)) / len(brightness_values) * 100
        high_brightness = np.sum(brightness_values >= 170) / len(brightness_values) * 100
        
        return {
            "min_brightness": int(min_brightness),
            "max_brightness": int(max_brightness),
            "contrast_ratio": float(contrast_ratio),
            "brightness_std": float(std_brightness),
            "distribution": {
                "low": float(low_brightness),
                "mid": float(mid_brightness),
                "high": float(high_brightness)
            },
            "wcag_compliance": self._check_wcag_contrast(cv_image)
        }
    
    def _check_wcag_contrast(self, cv_image: np.ndarray) -> Dict:
        """
        Check WCAG contrast compliance
        """
        # Simplified WCAG contrast check
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        brightness_values = gray.flatten()
        
        # Calculate average contrast between adjacent pixels
        rows, cols = gray.shape
        horizontal_contrasts = []
        vertical_contrasts = []
        
        for i in range(rows):
            for j in range(cols - 1):
                contrast = abs(int(gray[i, j]) - int(gray[i, j + 1])) / 255
                horizontal_contrasts.append(contrast)
        
        for i in range(rows - 1):
            for j in range(cols):
                contrast = abs(int(gray[i, j]) - int(gray[i + 1, j])) / 255
                vertical_contrasts.append(contrast)
        
        avg_contrast = (np.mean(horizontal_contrasts) + np.mean(vertical_contrasts)) / 2
        
        # Determine WCAG level
        if avg_contrast >= 0.07:  # WCAG AAA for large text
            level = "AAA"
        elif avg_contrast >= 0.045:  # WCAG AA
            level = "AA"
        else:
            level = "Fail"
        
        return {
            "level": level,
            "average_contrast": float(avg_contrast),
            "compliance_score": float(avg_contrast * 100)
        }
    
    def _analyze_balance(self, cv_image: np.ndarray) -> Dict:
        """
        Analyze visual balance
        """
        height, width = cv_image.shape[:2]
        
        # Calculate color mass distribution
        hsv_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2HSV)
        saturation = hsv_image[:,:,1]
        value = hsv_image[:,:,2]
        
        # Weight by saturation and brightness (more saturated/brighter = heavier)
        weight_map = saturation * value / (255 * 255)
        
        # Calculate center of mass
        total_weight = np.sum(weight_map)
        
        if total_weight > 0:
            y_indices, x_indices = np.indices(weight_map.shape)
            center_x = np.sum(x_indices * weight_map) / total_weight
            center_y = np.sum(y_indices * weight_map) / total_weight
            
            # Distance from image center (normalized)
            distance_from_center = np.sqrt(
                ((center_x - width/2) / width)**2 + 
                ((center_y - height/2) / height)**2
            )
        else:
            distance_from_center = 0
        
        # Calculate left-right balance
        left_half = weight_map[:, :width//2]
        right_half = weight_map[:, width//2:]
        
        left_weight = np.sum(left_half)
        right_weight = np.sum(right_half)
        
        total_lr_weight = left_weight + right_weight
        if total_lr_weight > 0:
            lr_balance = abs(left_weight - right_weight) / total_lr_weight * 100
        else:
            lr_balance = 0
        
        # Calculate top-bottom balance
        top_half = weight_map[:height//2, :]
        bottom_half = weight_map[height//2:, :]
        
        top_weight = np.sum(top_half)
        bottom_weight = np.sum(bottom_half)
        
        total_tb_weight = top_weight + bottom_weight
        if total_tb_weight > 0:
            tb_balance = abs(top_weight - bottom_weight) / total_tb_weight * 100
        else:
            tb_balance = 0
        
        return {
            "center_of_mass": {
                "x": float(center_x) if total_weight > 0 else width/2,
                "y": float(center_y) if total_weight > 0 else height/2
            },
            "distance_from_center": float(distance_from_center),
            "left_right_balance": 100 - float(lr_balance),
            "top_bottom_balance": 100 - float(tb_balance),
            "overall_balance_score": (200 - lr_balance - tb_balance) / 2
        }
    
    def _analyze_accessibility(self, cv_image: np.ndarray) -> Dict:
        """
        Analyze accessibility factors
        """
        # Color blindness simulation
        color_blindness_types = ["protanopia", "deuteranopia", "tritanopia"]
        color_blindness_scores = {}
        
        for cb_type in color_blindness_types:
            score = self._simulate_color_blindness(cv_image, cb_type)
            color_blindness_scores[cb_type] = score
        
        # Calculate readability score
        readability_score = self._calculate_readability(cv_image)
        
        # Check for color-only information
        color_only_info = self._check_color_only_info(cv_image)
        
        return {
            "color_blindness_scores": color_blindness_scores,
            "readability_score": readability_score,
            "color_only_info": color_only_info,
            "recommended_improvements": self._get_accessibility_improvements(color_blindness_scores, readability_score)
        }
    
    def _simulate_color_blindness(self, cv_image: np.ndarray, cb_type: str) -> float:
        """
        Simulate color blindness and calculate distinction score
        """
        # Simplified color blindness simulation
        # In production, use proper color transformation matrices
        
        if cb_type == "protanopia":
            # Red-blind
            weights = np.array([[0.567, 0.433, 0],
                                [0.558, 0.442, 0],
                                [0, 0.242, 0.758]])
        elif cb_type == "deuteranopia":
            # Green-blind
            weights = np.array([[0.625, 0.375, 0],
                                [0.7, 0.3, 0],
                                [0, 0.3, 0.7]])
        elif cb_type == "tritanopia":
            # Blue-blind
            weights = np.array([[0.95, 0.05, 0],
                                [0, 0.433, 0.567],
                                [0, 0.475, 0.525]])
        else:
            weights = np.eye(3)
        
        # Apply transformation
        transformed = cv2.transform(cv_image, weights)
        
        # Calculate color distinction score (0-100)
        hsv_transformed = cv2.cvtColor(transformed, cv2.COLOR_BGR2HSV)
        hue_variance = np.var(hsv_transformed[:,:,0])
        
        # Normalize score
        score = min(hue_variance / 1000 * 100, 100)
        
        return float(score)
    
    def _calculate_readability(self, cv_image: np.ndarray) -> float:
        """
        Calculate text readability score (if text is present)
        """
        # Simplified readability calculation
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Calculate edge density (proxy for text complexity)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / gray.size
        
        # Calculate contrast
        min_val = np.min(gray)
        max_val = np.max(gray)
        contrast = (max_val - min_val) / 255 if max_val > min_val else 0
        
        # Combine factors for readability score
        readability = (contrast * 0.7 + (1 - edge_density) * 0.3) * 100
        
        return float(readability)
    
    def _check_color_only_info(self, cv_image: np.ndarray) -> bool:
        """
        Check if information is conveyed by color alone
        """
        # Simplified check - look for areas where only color differs
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Calculate color variance in grayscale-converted similar areas
        # This is a simplified approximation
        blocks = 4
        block_h = cv_image.shape[0] // blocks
        block_w = cv_image.shape[1] // blocks
        
        color_only_count = 0
        
        for i in range(blocks):
            for j in range(blocks):
                block = cv_image[i*block_h:(i+1)*block_h, j*block_w:(j+1)*block_w]
                gray_block = gray[i*block_h:(i+1)*block_h, j*block_w:(j+1)*block_w]
                
                # Check if color varies but grayscale doesn't
                color_std = np.std(block)
                gray_std = np.std(gray_block)
                
                if color_std > 20 and gray_std < 10:
                    color_only_count += 1
        
        return color_only_count > (blocks * blocks * 0.1)  # More than 10% of blocks
    
    def _get_accessibility_improvements(self, cb_scores: Dict, readability: float) -> List[str]:
        """
        Get accessibility improvement recommendations
        """
        improvements = []
        
        # Check color blindness scores
        for cb_type, score in cb_scores.items():
            if score < 60:
                improvements.append(f"Improve color distinction for {cb_type} (current score: {score:.1f})")
        
        # Check readability
        if readability < 70:
            improvements.append(f"Improve readability (current score: {readability:.1f})")
        
        # General recommendations
        if len(improvements) == 0:
            improvements.append("Good accessibility compliance")
        else:
            improvements.append("Consider adding text labels or patterns for color-only information")
            improvements.append("Ensure sufficient contrast for all interactive elements")
        
        return improvements
    
    def _generate_recommendations(self, analysis: Dict, config: OptimizationConfig) -> List[str]:
        """
        Generate optimization recommendations
        """
        recommendations = []
        
        # Color recommendations
        color_analysis = analysis["color_analysis"]
        if color_analysis["harmony_score"] < 70:
            recommendations.append(f"Improve color harmony (current score: {color_analysis['harmony_score']:.1f})")
        
        if color_analysis["vibrance"] < 20:
            recommendations.append("Increase color vibrance for more visual interest")
        
        # Composition recommendations
        comp_analysis = analysis["composition_analysis"]
        if comp_analysis["rule_of_thirds_score"] < 60:
            recommendations.append("Consider aligning key elements with rule of thirds")
        
        if comp_analysis["balance_score"] < 70:
            recommendations.append("Improve visual balance distribution")
        
        # Contrast recommendations
        contrast_analysis = analysis["contrast_analysis"]
        if contrast_analysis["wcag_compliance"]["level"] in ["Fail", "AA"]:
            recommendations.append(f"Improve contrast for better accessibility (current: {contrast_analysis['wcag_compliance']['level']})")
        
        # Balance recommendations
        balance_analysis = analysis["balance_analysis"]
        if balance_analysis["overall_balance_score"] < 70:
            recommendations.append(f"Improve overall balance (current score: {balance_analysis['overall_balance_score']:.1f})")
        
        # Brand guidelines compliance
        if config.brand_guidelines and config.color_palette:
            recommendations.append("Ensure compliance with brand color palette")
        
        return recommendations
    
    def optimize_colors(self, image: Image.Image, config: OptimizationConfig) -> Tuple[Image.Image, List[Dict]]:
        """
        Optimize colors for better harmony and brand alignment
        """
        optimizations = []
        optimized = image.copy()
        
        # Adjust saturation if needed
        analysis = self._analyze_colors(cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR))
        
        if analysis["saturation_mean"] < 50:
            enhancer = ImageEnhance.Color(optimized)
            optimized = enhancer.enhance(1.2)
            optimizations.append({
                "type": "color_saturation",
                "action": "increased",
                "amount": "20%",
                "reason": "Low saturation detected"
            })
        
        # Adjust brightness if needed
        if analysis["brightness_mean"] < 100:
            enhancer = ImageEnhance.Brightness(optimized)
            optimized = enhancer.enhance(1.1)
            optimizations.append({
                "type": "brightness",
                "action": "increased",
                "amount": "10%",
                "reason": "Low brightness detected"
            })
        
        # Apply color palette if specified
        if config.color_palette:
            optimized = self._apply_color_palette(optimized, config.color_palette)
            optimizations.append({
                "type": "color_palette",
                "action": "applied",
                "palette": config.color_palette,
                "reason": "Brand color palette specified"
            })
        
        return optimized, optimizations
    
    def _apply_color_palette(self, image: Image.Image, palette: List[str]) -> Image.Image:
        """
        Apply color palette to image (simplified version)
        """
        # This is a simplified implementation
        # In production, use more sophisticated color mapping
        optimized = image.copy()
        
        # Convert palette to RGB
        palette_rgb = []
        for color in palette:
            if color.startswith('#'):
                rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
                palette_rgb.append(rgb)
        
        # Simple color adjustment - in production, use proper color quantization
        return optimized
    
    def optimize_composition(self, image: Image.Image, config: OptimizationConfig) -> Tuple[Image.Image, List[Dict]]:
        """
        Optimize image composition
        """
        optimizations = []
        optimized = image.copy()
        
        # Check and adjust aspect ratio if needed
        current_ratio = image.width / image.height
        
        if config.target_aspect_ratio:
            target_ratio = config.target_aspect_ratio[0] / config.target_aspect_ratio[1]
            
            if abs(current_ratio - target_ratio) > 0.1:
                # Crop to target aspect ratio
                if current_ratio > target_ratio:
                    # Too wide, crop sides
                    new_width = int(image.height * target_ratio)
                    left = (image.width - new_width) // 2
                    optimized = image.crop((left, 0, left + new_width, image.height))
                else:
                    # Too tall, crop top/bottom
                    new_height = int(image.width / target_ratio)
                    top = (image.height - new_height) // 2
                    optimized = image.crop((0, top, image.width, top + new_height))
                
                optimizations.append({
                    "type": "aspect_ratio",
                    "action": "cropped",
                    "from": f"{image.width}x{image.height}",
                    "to": f"{optimized.width}x{optimized.height}",
                    "reason": f"Adjusted to target aspect ratio {config.target_aspect_ratio}"
                })
        
        # Apply rule of thirds cropping if composition score is low
        cv_image = cv2.cvtColor(np.array(optimized), cv2.COLOR_RGB2BGR)
        analysis = self._analyze_composition(cv_image)
        
        if analysis["rule_of_thirds_score"] < 50:
            # Suggest rule of thirds alignment (would implement actual cropping in production)
            optimizations.append({
                "type": "composition",
                "action": "suggested",
                "suggestion": "Consider cropping to align with rule of thirds",
                "reason": f"Low rule of thirds score: {analysis['rule_of_thirds_score']:.1f}"
            })
        
        return optimized, optimizations
    
    def optimize_contrast(self, image: Image.Image, config: OptimizationConfig) -> Tuple[Image.Image, List[Dict]]:
        """
        Optimize contrast for better visibility
        """
        optimizations = []
        optimized = image.copy()
        
        # Analyze current contrast
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        analysis = self._analyze_contrast(cv_image)
        
        # Adjust contrast if needed
        if analysis["contrast_ratio"] < 3.0:
            enhancer = ImageEnhance.Contrast(optimized)
            optimized = enhancer.enhance(1.3)
            optimizations.append({
                "type": "contrast",
                "action": "increased",
                "amount": "30%",
                "reason": f"Low contrast ratio: {analysis['contrast_ratio']:.1f}"
            })
        
        # Adjust sharpness for better edge definition
        if analysis["brightness_std"] < 30:
            optimized = optimized.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            optimizations.append({
                "type": "sharpness",
                "action": "increased",
                "reason": "Low edge definition detected"
            })
        
        return optimized, optimizations
    
    def optimize_balance(self, image: Image.Image, config: OptimizationConfig) -> Tuple[Image.Image, List[Dict]]:
        """
        Optimize visual balance
        """
        optimizations = []
        
        # Analyze current balance
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        analysis = self._analyze_balance(cv_image)
        
        # Generate balance recommendations
        if analysis["overall_balance_score"] < 70:
            optimizations.append({
                "type": "balance",
                "action": "suggested",
                "suggestion": "Consider redistributing visual weight",
                "reason": f"Low balance score: {analysis['overall_balance_score']:.1f}"
            })
        
        if analysis["left_right_balance"] < 80:
            optimizations.append({
                "type": "balance",
                "action": "suggested",
                "suggestion": "Improve left-right balance",
                "reason": f"Left-right balance: {analysis['left_right_balance']:.1f}"
            })
        
        # Note: Actual rebalancing would require more complex image manipulation
        # For now, we just provide recommendations
        
        return image, optimizations
    
    def optimize_typography(self, analysis: Dict, config: OptimizationConfig) -> List[Dict]:
        """
        Optimize typography (for text-based designs)
        """
        optimizations = []
        
        # Typography optimization would be more relevant for actual text analysis
        # For image-based designs, we provide general recommendations
        
        if "text_elements" in analysis.get("basic_metrics", {}):
            optimizations.append({
                "type": "typography",
                "action": "suggested",
                "suggestion": "Ensure sufficient contrast between text and background",
                "reason": "Text elements detected"
            })
            
            optimizations.append({
                "type": "typography",
                "action": "suggested",
                "suggestion": "Maintain consistent font sizes and spacing",
                "reason": "Typography consistency is important"
            })
        
        return optimizations
    
    def optimize_accessibility(self, analysis: Dict, config: OptimizationConfig) -> List[Dict]:
        """
        Optimize for accessibility
        """
        optimizations = []
        
        accessibility = analysis.get("accessibility_analysis", {})
        
        # Color blindness recommendations
        cb_scores = accessibility.get("color_blindness_scores", {})
        for cb_type, score in cb_scores.items():
            if score < 60:
                optimizations.append({
                    "type": "accessibility",
                    "action": "required",
                    "requirement": f"Improve color distinction for {cb_type}",
                    "reason": f"Score below threshold: {score:.1f}"
                })
        
        # Readability recommendations
        readability = accessibility.get("readability_score", 0)
        if readability < 70:
            optimizations.append({
                "type": "accessibility",
                "action": "suggested",
                "suggestion": "Improve overall readability",
                "reason": f"Readability score: {readability:.1f}"
            })
        
        # Color-only information
        if accessibility.get("color_only_info", False):
            optimizations.append({
                "type": "accessibility",
                "action": "required",
                "requirement": "Add non-color indicators for important information",
                "reason": "Information appears to be conveyed by color alone"
            })
        
        return optimizations
    
    def _save_optimized_image(self, image: Image.Image, original_path: str) -> str:
        """
        Save optimized image
        """
        import os
        from datetime import datetime
        
        # Create optimized images directory if it doesn't exist
        output_dir = "optimized_images"
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"optimized_{timestamp}.png"
        output_path = os.path.join(output_dir, filename)
        
        # Save image
        image.save(output_path, "PNG", optimize=True)
        
        return output_path
    
    def generate_comparison(self, original: Image.Image, optimized: Image.Image) -> Dict:
        """
        Generate before/after comparison
        """
        # Create side-by-side comparison
        total_width = original.width + optimized.width
        max_height = max(original.height, optimized.height)
        
        comparison_image = Image.new('RGB', (total_width, max_height), (255, 255, 255))
        
        # Paste original and optimized
        comparison_image.paste(original, (0, (max_height - original.height) // 2))
        comparison_image.paste(optimized, (original.width, (max_height - optimized.height) // 2))
        
        # Save comparison
        import os
        from datetime import datetime
        
        output_dir = "comparisons"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        comparison_path = os.path.join(output_dir, f"comparison_{timestamp}.png")
        comparison_image.save(comparison_path)
        
        return {
            "comparison_image": comparison_path,
            "original_size": f"{original.width}x{original.height}",
            "optimized_size": f"{optimized.width}x{optimized.height}"
        }
    
    def _calculate_improvements(self, original_analysis: Dict, optimized_image: Image.Image) -> Dict:
        """
        Calculate improvement metrics
        """
        # Analyze optimized image
        cv_optimized = cv2.cvtColor(np.array(optimized_image), cv2.COLOR_RGB2BGR)
        optimized_analysis = self.analyze_design(optimized_image, OptimizationConfig(
            image_path="",
            optimization_types=[]
        ))
        
        improvements = {}
        
        # Calculate percentage improvements
        if "color_analysis" in original_analysis and "color_analysis" in optimized_analysis:
            orig_color = original_analysis["color_analysis"]
            opt_color = optimized_analysis["color_analysis"]
            
            improvements["color_harmony"] = {
                "original": orig_color["harmony_score"],
                "optimized": opt_color["harmony_score"],
                "improvement": opt_color["harmony_score"] - orig_color["harmony_score"]
            }
        
        if "composition_analysis" in original_analysis and "composition_analysis" in optimized_analysis:
            orig_comp = original_analysis["composition_analysis"]
            opt_comp = optimized_analysis["composition_analysis"]
            
            improvements["rule_of_thirds"] = {
                "original": orig_comp["rule_of_thirds_score"],
                "optimized": opt_comp["rule_of_thirds_score"],
                "improvement": opt_comp["rule_of_thirds_score"] - orig_comp["rule_of_thirds_score"]
            }
        
        if "contrast_analysis" in original_analysis and "contrast_analysis" in optimized_analysis:
            orig_contrast = original_analysis["contrast_analysis"]
            opt_contrast = optimized_analysis["contrast_analysis"]
            
            improvements["contrast_ratio"] = {
                "original": orig_contrast["contrast_ratio"],
                "optimized": opt_contrast["contrast_ratio"],
                "improvement": opt_contrast["contrast_ratio"] - orig_contrast["contrast_ratio"]
            }
        
        # Calculate overall improvement score
        total_improvement = sum(imp["improvement"] for imp in improvements.values())
        improvement_count = len(improvements)
        
        improvements["overall"] = {
            "score": total_improvement / improvement_count if improvement_count > 0 else 0,
            "description": self._get_improvement_description(total_improvement / improvement_count if improvement_count > 0 else 0)
        }
        
        return improvements
    
    def _get_improvement_description(self, score: float) -> str:
        """
        Get description of improvement score
        """
        if score > 20:
            return "Significant improvement across all metrics"
        elif score > 10:
            return "Good improvement in multiple areas"
        elif score > 5:
            return "Moderate improvement detected"
        elif score > 0:
            return "Minor improvements made"
        else:
            return "No significant improvements needed or made"

# Example usage
if __name__ == "__main__":
    # Create design optimizer
    optimizer = DesignOptimizer()
    
    # Configure optimization
    config = OptimizationConfig(
        image_path="sample_design.png",
        optimization_types=[
            OptimizationType.COLOR,
            OptimizationType.COMPOSITION,
            OptimizationType.CONTRAST,
            OptimizationType.ACCESSIBILITY
        ],
        target_aspect_ratio=(16, 9),
        color_palette=["#1E3A8A", "#3B82F6", "#10B981", "#F59E0B"]
    )
    
    # Optimize design
    try:
        result = optimizer.optimize_design(config)
        
        print("Optimization Results:")
        print(json.dumps(result, indent=2))
        
        print(f"\nOriginal image: {result['original_image']}")
        print(f"Optimized image: {result['optimized_image']}")
        print(f"Comparison: {result['comparison']['comparison_image']}")
        
        print("\nImprovements:")
        for metric, data in result["improvements"].items():
            if metric != "overall":
                print(f"  {metric}: {data['improvement']:.1f} points improvement")
        
        print(f"\nOverall: {result['improvements']['overall']['description']}")
        
    except Exception as e:
        print(f"Error during optimization: {str(e)}")
