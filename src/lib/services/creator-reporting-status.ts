/** The discovery transaction is already recorded. Retrying providers would repeat work. */
export class CreatorDiscoveryReportingPendingError extends Error {
  readonly code = 'creator_discovery_reporting_pending';
  constructor() { super('creator_discovery_reporting_pending'); this.name = 'CreatorDiscoveryReportingPendingError'; }
}
