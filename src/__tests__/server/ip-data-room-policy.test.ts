import {
  IP_DATA_ROOM_REQUIREMENTS,
  isIpDocumentReady,
  isKnownIpRequirementCode,
} from '@/lib/ip-evidence/data-room';

describe('política del data room IP', () => {
  it('mantiene códigos únicos y fases explícitas', () => {
    const codes = IP_DATA_ROOM_REQUIREMENTS.map((requirement) => requirement.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(IP_DATA_ROOM_REQUIREMENTS.some((item) => item.stage === 'now')).toBe(true);
    expect(IP_DATA_ROOM_REQUIREMENTS.some((item) => item.stage === 'before_transfer')).toBe(true);
    expect(IP_DATA_ROOM_REQUIREMENTS.some((item) => item.stage === 'after_incorporation')).toBe(true);
    expect(IP_DATA_ROOM_REQUIREMENTS.some((item) => item.stage === 'annual_claim')).toBe(true);
  });

  it('solo cuenta documentos recopilados o aprobados como preparados', () => {
    expect(isIpDocumentReady('draft')).toBe(false);
    expect(isIpDocumentReady('review_required')).toBe(false);
    expect(isIpDocumentReady('replaced')).toBe(false);
    expect(isIpDocumentReady('collected')).toBe(true);
    expect(isIpDocumentReady('advisor_approved')).toBe(true);
  });

  it('rechaza códigos fuera del checklist', () => {
    expect(isKnownIpRequirementCode('TECH-PROVENANCE')).toBe(true);
    expect(isKnownIpRequirementCode('CYPRUS-APPROVED-BY-AI')).toBe(false);
  });
});
