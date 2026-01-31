// Add after other imports
const revenueTracker = require('./services/revenueTracker');

// Add middleware to track revenue
app.use('/api/orders', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.method === 'POST' && res.statusCode === 201) {
      try {
        const order = JSON.parse(data).data;
        revenueTracker.trackRevenue(order);
      } catch (error) {
        console.error('Revenue tracking error:', error);
      }
    }
    originalSend.apply(res, arguments);
  };
  next();
});
// Add revenue endpoint
app.get('/api/revenue/metrics', authMiddleware.protect, authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const metrics = revenueTracker.getCurrentMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/revenue/report', authMiddleware.protect, authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const report = await revenueTracker.generateRevenueReport(period, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
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
