/** Safe to retry only before the transport has attempted the outbound POST. */
export class IntakeSendNotAttempted extends Error {
  constructor() { super('send-preflight-unavailable'); this.name = 'IntakeSendNotAttempted'; }
}
