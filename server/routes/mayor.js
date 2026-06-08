export function registerMayorRoutes(app, { mayorRequestService } = {}) {
  if (!mayorRequestService?.submit) throw new Error('registerMayorRoutes requires mayorRequestService.submit()');

  app.post('/api/mayor/requests', async (req, res) => {
    try {
      const { prompt, target, molecule, args } = req.body;
      const result = await mayorRequestService.submit({ prompt, target, molecule, args });

      if (!result.ok) {
        return res.status(result.statusCode || 500).json({
          error: result.error || 'Mayor request failed',
          errorType: result.errorType,
        });
      }

      return res.json({ success: result.data.status !== 'failed', ...result.data });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Mayor request failed' });
    }
  });
}
