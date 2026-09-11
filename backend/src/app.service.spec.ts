import { AppService } from './app.service';

describe('AppService', () => {
  it('reports the current phase so CI and humans can both see it', () => {
    const service = new AppService();
    const status = service.getStatus();

    expect(status.status).toBe('ok');
    expect(status.phase).toBe('phase-0-foundation');
  });
});
