import { AUTH_CONSTANTS } from './auth.constants';

describe('AUTH_CONSTANTS', () => {
  it('should have TOKEN_KEY property', () => {
    expect(AUTH_CONSTANTS.TOKEN_KEY).toBeDefined();
  });

  it('should have correct TOKEN_KEY value', () => {
    expect(AUTH_CONSTANTS.TOKEN_KEY).toBe('auth_token');
  });

  it('should be an object', () => {
    expect(typeof AUTH_CONSTANTS).toBe('object');
    expect(AUTH_CONSTANTS).toBeTruthy();
  });

  it('should have all required properties', () => {
    expect('TOKEN_KEY' in AUTH_CONSTANTS).toBe(true);
    expect(typeof AUTH_CONSTANTS.TOKEN_KEY).toBe('string');
  });
});
