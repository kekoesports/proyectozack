import { safeCreatorDiscoveryError } from '@/lib/services/creatorTargetDiscovery';

describe('safeCreatorDiscoveryError', () => {
  it('explica el rechazo de credenciales de Twitch sin exponer la respuesta', () => {
    const result = safeCreatorDiscoveryError(
      new Error('Twitch token error (400): invalid client secret'),
      'twitch',
    );

    expect(result).toBe('Twitch ha rechazado las credenciales configuradas');
    expect(result).not.toContain('secret');
  });

  it('mantiene genéricos los errores inesperados', () => {
    expect(safeCreatorDiscoveryError(new Error('internal detail'), 'youtube'))
      .toBe('No se pudo completar la consulta de esta plataforma');
  });
});
