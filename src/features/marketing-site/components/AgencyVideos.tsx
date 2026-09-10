import { getAgencyVideos } from '@/lib/agency-videos';
import { AgencyVideoShowcase } from './AgencyVideoShowcase';

export async function AgencyVideos() {
  return <AgencyVideoShowcase videos={await getAgencyVideos()} />;
}
