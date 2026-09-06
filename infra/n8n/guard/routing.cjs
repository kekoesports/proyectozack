'use strict';
const { hash } = require('./store.cjs');
const ROUTING_KEY = 'routing-policy:v1';
const CREATOR_CHANNEL = '1533123540360892599';
const PARTNER_CHANNEL = '1533123519335104754';
function configured(config) {
  return Object.hasOwn(config, 'creatorChannelId') || Object.hasOwn(config, 'partnerChannelId');
}
function validateRoutingConfig(config) {
  for (const [key, expected] of [['creatorChannelId', CREATOR_CHANNEL], ['partnerChannelId', PARTNER_CHANNEL]]) {
    if (Object.hasOwn(config, key) && config[key] !== expected) throw Error('routing_destination_changed');
  }
}
function destination(config, family) {
  validateRoutingConfig(config);
  if (!['creator', 'partner'].includes(family)) throw Error('routing_family_invalid');
  return config[family + 'ChannelId'] ?? config.kpiChannelId;
}
function date(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) throw Error('routing_date_invalid');
  return Date.parse(value);
}
// Pure constructor for the explicitly reviewed, quiescent one-time operator.
// Startup and request handlers only read this additional policy; they never install it.
function initialRoutingPolicy(config, options) {
  validateRoutingConfig(config);
  const { activatedAt, creatorMaxOutboxId, partnerMaxBatchId, priorPartnerRolloutHash } = options;
  if (!configured(config) || !/^\d{17,20}$/.test(config.guildId)
    || !/^\d{17,20}$/.test(config.kpiChannelId) || !/^\d{17,20}$/.test(config.pipelineChannelId)
    || date(activatedAt) < date(config.reactivationAfter)
    || ![creatorMaxOutboxId, partnerMaxBatchId].every(n => Number.isSafeInteger(n) && n >= 0)
    || !/^[a-f0-9]{64}$/.test(priorPartnerRolloutHash)) throw Error('routing_policy_invalid');
  const policy = { version: 1, activatedAt, reactivationAfter: config.reactivationAfter,
    guildId: config.guildId, legacyKpiChannelId: config.kpiChannelId,
    creatorChannelId: destination(config, 'creator'), partnerChannelId: destination(config, 'partner'),
    intakeChannelId: config.pipelineChannelId, creatorMaxOutboxId, partnerMaxBatchId, priorPartnerRolloutHash };
  return { ...policy, hash: hash(JSON.stringify(policy)) };
}
async function loadRoutingPolicy(ctx) {
  validateRoutingConfig(ctx.config);
  const row = await ctx.store.get(ROUTING_KEY);
  if (!configured(ctx.config) && (row === null || row === undefined)) return null;
  if (!configured(ctx.config) || !row || typeof row !== 'object' || Array.isArray(row)) {
    throw Error('routing_policy_missing_or_changed');
  }
  const expected = initialRoutingPolicy(ctx.config, row);
  if (Object.keys(row).length !== Object.keys(expected).length
    || Object.keys(expected).some(key => row[key] !== expected[key])
    || date(row.activatedAt) > date(ctx.now())) throw Error('routing_policy_missing_or_changed');
  const prior = await ctx.store.get('partners-rollout:v1');
  if (!prior || prior.version !== 1 || prior.hash !== row.priorPartnerRolloutHash
    || prior.guildId !== row.guildId || prior.channelId !== row.legacyKpiChannelId
    || prior.reactivationAfter !== row.reactivationAfter || date(prior.activatedAt) > date(row.activatedAt)
    || !Number.isSafeInteger(prior.maxHistoricalBatchId) || prior.maxHistoricalBatchId < 0
    || prior.maxHistoricalBatchId > row.partnerMaxBatchId) throw Error('routing_prior_rollout_changed');
  const legacy = { version: 1, activatedAt: prior.activatedAt, maxHistoricalBatchId: prior.maxHistoricalBatchId,
    guildId: prior.guildId, channelId: prior.channelId, reactivationAfter: prior.reactivationAfter };
  if (Object.keys(prior).length !== 7 || hash(JSON.stringify(legacy)) !== prior.hash) throw Error('routing_prior_rollout_changed');
  return row;
}
module.exports = { ROUTING_KEY, CREATOR_CHANNEL, PARTNER_CHANNEL, configured,
  validateRoutingConfig, destination, initialRoutingPolicy, loadRoutingPolicy };
