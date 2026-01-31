// Add viral referral routes
const viralReferral = require('./services/viralReferral');

app.get('/api/referral/link', authMiddleware.protect, async (req, res) => {
  try {
    const data = await viralReferral.generateReferralLink(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/referral/track-click/:code', async (req, res) => {
  try {
    const data = await viralReferral.trackReferralClick(
      req.params.code,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/referral/process-sale', authMiddleware.protect, async (req, res) => {
  try {
    const { referralCode, amount } = req.body;
    const data = await viralReferral.processReferralSale(
      referralCode,
      req.user.id,
      amount
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/referral/leaderboard', async (req, res) => {
  try {
    const leaderboard = await viralReferral.getLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/referral/stats', authMiddleware.protect, async (req, res) => {
  try {
    const stats = await viralReferral.getReferralStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
