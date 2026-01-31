const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class AIService {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.stabilityApiKey = process.env.STABILITY_API_KEY;
        this.replicateApiKey = process.env.REPLICATE_API_KEY;
    }

    async generateDesign({ prompt, style, colorPalette, dimensions }) {
        try {
            // Using DALL-E or Stable Diffusion for design generation
            const response = await axios.post(
                'https://api.openai.com/v1/images/generations',
                {
                    prompt: `${prompt}, ${style} style, color palette: ${colorPalette.join(', ')}, professional design`,
                    n: 1,
                    size: dimensions || '1024x1024',
                    response_format: 'url'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const imageUrl = response.data.data[0].url;
            
            // Download and save the image
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const filename = `design_${Date.now()}.png`;
            const filepath = path.join(__dirname, '../uploads/designs', filename);
            
            fs.writeFileSync(filepath, imageResponse.data);

            return {
                imageUrl: `/uploads/designs/${filename}`,
                prompt,
                style,
                colorPalette,
                dimensions,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('Design generation failed:', error);
            throw new Error('Failed to generate design');
        }
    }

    async optimizeDesign({ designId, optimizations, targetMetrics }) {
        try {
            // This would integrate with various optimization tools
            // For now, simulating optimization process
            
            const improvements = {
                loadingTime: Math.random() * 40 + 10, // 10-50% improvement
                aestheticScore: Math.random() * 30 + 10, // 10-40% improvement
                accessibility: Math.random() * 50 + 20 // 20-70% improvement
            };

            // Generate recommendations
            const recommendations = [
                'Optimize image compression',
                'Improve color contrast for better accessibility',
                'Simplify complex elements',
                'Enhance typography hierarchy'
            ].slice(0, Math.floor(Math.random() * 3) + 1);

            return {
                originalDesignId: designId,
                improvements,
                recommendations,
                optimizedAt: new Date()
            };
        } catch (error) {
            console.error('Design optimization failed:', error);
            throw new Error('Failed to optimize design');
        }
    }

    async analyzeMarket({ industry, targetAudience, competitors }) {
        try {
            // Using GPT for market analysis
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a market analysis expert. Analyze the given market data and provide insights.'
                        },
                        {
                            role: 'user',
                            content: `Industry: ${industry}\nTarget Audience: ${targetAudience}\nCompetitors: ${competitors.join(', ')}\n\nProvide a comprehensive market analysis including trends, opportunities, and threats.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const analysis = response.data.choices[0].message.content;

            // Extract key insights
            const insights = {
                marketSize: this.estimateMarketSize(industry),
                growthRate: this.estimateGrowthRate(industry),
                competitionLevel: this.assessCompetition(competitors),
                opportunities: this.extractOpportunities(analysis),
                threats: this.extractThreats(analysis)
            };

            return {
                analysis,
                insights,
                recommendations: this.generateRecommendations(insights),
                analyzedAt: new Date()
            };
        } catch (error) {
            console.error('Market analysis failed:', error);
            throw new Error('Failed to analyze market');
        }
    }

    estimateMarketSize(industry) {
        const sizes = {
            'tech': '$500B',
            'fashion': '$300B',
            'food': '$400B',
            'health': '$600B',
            'education': '$200B',
            'default': '$100B'
        };
        return sizes[industry.toLowerCase()] || sizes.default;
    }

    estimateGrowthRate(industry) {
        const rates = {
            'tech': '15%',
            'fashion': '8%',
            'food': '5%',
            'health': '12%',
            'education': '10%',
            'default': '7%'
        };
        return rates[industry.toLowerCase()] || rates.default;
    }

    assessCompetition(competitors) {
        if (competitors.length === 0) return 'Low';
        if (competitors.length <= 3) return 'Medium';
        return 'High';
    }

    extractOpportunities(analysis) {
        // Simple keyword extraction for opportunities
        const opportunityKeywords = ['growth', 'opportunity', 'demand', 'trend', 'innovation'];
        return opportunityKeywords.filter(keyword => 
            analysis.toLowerCase().includes(keyword)
        ).slice(0, 3);
    }

    extractThreats(analysis) {
        // Simple keyword extraction for threats
        const threatKeywords = ['competition', 'risk', 'threat', 'challenge', 'regulation'];
        return threatKeywords.filter(keyword => 
            analysis.toLowerCase().includes(keyword)
        ).slice(0, 3);
    }

    generateRecommendations(insights) {
        const recommendations = [];
        
        if (insights.competitionLevel === 'High') {
            recommendations.push('Focus on niche specialization');
            recommendations.push('Differentiate through superior customer service');
        }
        
        if (insights.growthRate.includes('10') || insights.growthRate.includes('15')) {
            recommendations.push('Invest in rapid scaling');
            recommendations.push('Consider strategic partnerships');
        }
        
        if (insights.opportunities.length > 0) {
            recommendations.push(`Leverage ${insights.opportunities[0]} trends`);
        }
        
        return recommendations;
    }

    async generateLogo({ companyName, industry, stylePreferences }) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/images/generations',
                {
                    prompt: `Professional logo for ${companyName}, ${industry} company, ${stylePreferences}, minimalist, vector, scalable`,
                    n: 3,
                    size: '512x512',
                    response_format: 'url'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const logos = await Promise.all(
                response.data.data.map(async (logo, index) => {
                    const filename = `logo_${companyName}_${index}_${Date.now()}.png`;
                    const filepath = path.join(__dirname, '../uploads/logos', filename);
                    
                    const imageResponse = await axios.get(logo.url, { responseType: 'arraybuffer' });
                    fs.writeFileSync(filepath, imageResponse.data);
                    
                    return {
                        url: `/uploads/logos/${filename}`,
                        variant: index + 1
                    };
                })
            );

            return {
                companyName,
                logos,
                style: stylePreferences,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('Logo generation failed:', error);
            throw new Error('Failed to generate logo');
        }
    }
}

module.exports = new AIService();
