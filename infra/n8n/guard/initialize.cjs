'use strict';
// Run explicitly ONCE on a new, empty deployment directory. Never on startup.
const fs = require('node:fs/promises');
const { makeStore, hash } = require('./store.cjs');
const { createCheckpoint } = require('./gates.cjs');
const { initialState } = require('./progress.cjs');
async function initialize(config, directory) {
  const store = makeStore(directory); await store.ready();
  if ((await fs.readdir(directory)).length) throw Error('initialization_requires_empty_directory');
  for (const mode of ['pipeline', 'kpi']) {
    const policy = { mode, channelId: mode === 'pipeline' ? config.pipelineChannelId : config.kpiChannelId,
      reactivationAfter: config.reactivationAfter, allowedActorIds: mode === 'kpi' ? config.allowedActorIds : [], pageLimit: 100 };
    await store.put('poll-' + mode + '-checkpoint', createCheckpoint(policy, null));
    await store.put('poll-' + mode + '-pending', null);
  }
  await store.put('progress-future:v1', initialState(config));
  const policyHash = hash(JSON.stringify({
    reactivationAfter: config.reactivationAfter, guildId: config.guildId,
    pipeline: config.pipelineChannelId, kpi: config.kpiChannelId,
    allowedActorIds: [...config.allowedActorIds].sort()
  }));
  await store.put('installation-policy', { hash: policyHash, createdAt: new Date().toISOString() });
}
if (require.main === module) {
  (async () => {
    const config = JSON.parse(await fs.readFile('/config/config.json', 'utf8'));
    await initialize(config, '/data');
    console.log('guard_initialized_once');
  })().catch(() => { console.error('guard_initialization_refused'); process.exitCode = 1; });
}
module.exports = { initialize };
