const express = require('express');
const router  = express.Router();
const causalEngine    = require('../services/causalEngine');
const logRepository   = require('../db/logRepository');

/** GET /api/causal/chains — all active chains, sorted by blast radius */
router.get('/chains', (req, res) => {
  try {
    const chains = causalEngine.getActiveCausalChains();
    res.json({ status: 'success', data: chains, count: chains.length });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/causal/chains/:rootId — full chain with depth + blast radius summary */
router.get('/chains/:rootId', async (req, res) => {
  try {
    const { rootId } = req.params;

    // Prefer the in-memory ring buffer (faster, always current)
    let chain = causalEngine.getChainById(rootId);

    if (!chain.length) {
      // Fall back to database for historical chains
      chain = await logRepository.getCausalChain(rootId);
    }

    if (!chain.length) {
      return res.status(404).json({ status: 'error', message: 'Causal chain not found' });
    }

    const root = chain.find(l => l.id === rootId) || chain[0];
    const blastRadius = parseFloat(
      chain.reduce((sum, l) => sum + (l.blast_radius_score || 0), 0).toFixed(3)
    );
    const maxDepth = Math.max(...chain.map(l => l.causal_chain_depth || 0));

    res.json({
      status: 'success',
      data: {
        root,
        chain,
        chain_depth:        maxDepth,
        total_affected:     chain.length,
        blast_radius_score: blastRadius,
        narrative: `"${root.message.slice(0, 60)}" triggered ${chain.length - 1} downstream event(s) across ${new Set(chain.map(l => l.source)).size} service(s).`
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/causal/graph — nodes + edges for graph visualisation */
router.get('/graph', (req, res) => {
  try {
    const graph = causalEngine.getGraphData();
    res.json({ status: 'success', data: graph });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
