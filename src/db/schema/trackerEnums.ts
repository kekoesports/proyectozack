/**
 * Shared enums used by both dealDeliverableTrackers and brandSheetSources.
 * Kept in a separate file to avoid circular imports between those two schema files.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

export const trackerParseModeEnum = pgEnum('tracker_parse_mode', [
  'simple_columns',
  'socialpro_blocks',
]);
