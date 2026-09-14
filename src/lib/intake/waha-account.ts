/** One stable company identity; deployment and pilot names are not contact identities. */
export function wahaIntakeAccount(phone: string, run?: string): string {
  void run;
  return `waha:${phone}`;
}
