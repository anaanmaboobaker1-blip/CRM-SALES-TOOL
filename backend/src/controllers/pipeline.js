const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// Get deals grouped by stage for Kanban board
async function getPipeline(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'salespersonId');
    const { salespersonId, dateMin, dateMax } = req.query;

    const where = {
      deletedAt: null,
      ...roleFilter,
    };

    if (salespersonId) where.salespersonId = parseInt(salespersonId);
    
    if (dateMin || dateMax) {
      where.expectedClosingDate = {};
      if (dateMin) where.expectedClosingDate.gte = new Date(dateMin);
      if (dateMax) where.expectedClosingDate.lte = new Date(dateMax);
    }

    // Load active deals
    const deals = await prisma.deal.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        salesperson: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Load stages from db
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
    });

    // Group deals by stage
    const board = stages.map(stage => {
      const stageDeals = deals.filter(d => d.dealStage === stage.name);
      const totalValue = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);

      return {
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order,
        deals: stageDeals,
        count: stageDeals.length,
        totalValue,
      };
    });

    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
}

// Update deal stage (triggered by Kanban drag and drop)
async function updateDealStage(req, res, next) {
  try {
    const dealId = parseInt(req.params.id);
    const { stage, status, probability, lostReason } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!deal || deal.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (!canModify(req, deal.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updateData = { dealStage: stage };
    
    // Auto-update status & probability based on common rules
    if (stage === 'Won') {
      updateData.status = 'Won';
      updateData.probability = 100;
    } else if (stage === 'Lost') {
      updateData.status = 'Lost';
      updateData.probability = 0;
      if (lostReason) updateData.lostReason = lostReason;
    } else {
      updateData.status = 'Open';
      if (probability !== undefined) {
        updateData.probability = parseFloat(probability);
      } else {
        // Set default probabilities
        if (stage === 'New') updateData.probability = 10;
        if (stage === 'Qualification') updateData.probability = 20;
        if (stage === 'Proposal') updateData.probability = 50;
        if (stage === 'Negotiation') updateData.probability = 80;
      }
    }

    // Force override status if provided in request
    if (status) updateData.status = status;

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
    });

    await logAudit({
      userId: req.user.id,
      action: 'DEAL_STAGE_CHANGE',
      module: 'DEALS',
      recordId: dealId,
      oldValue: `Stage: ${deal.dealStage}, Status: ${deal.status}, Prob: ${deal.probability}`,
      newValue: `Stage: ${updated.dealStage}, Status: ${updated.status}, Prob: ${updated.probability}`,
    });

    res.json({
      success: true,
      message: 'Deal stage updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPipeline,
  updateDealStage,
};
