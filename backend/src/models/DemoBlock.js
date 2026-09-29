const mongoose = require('mongoose');

// A demo slot blocked from the portal: callers cannot book it and see it red in the app.
const DemoBlockSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  // Team Leader whose slot is blocked; '' blocks the slot for every Team Leader
  teamLeaderId: { type: String, default: '' },
  teamLeaderName: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  reason: { type: String, default: '' },
  blockedById: { type: String, default: '' },
  blockedByName: { type: String, default: '' },
}, { timestamps: true });

DemoBlockSchema.index({ scheduledAt: 1, teamLeaderId: 1 });

module.exports = mongoose.model('DemoBlock', DemoBlockSchema);
