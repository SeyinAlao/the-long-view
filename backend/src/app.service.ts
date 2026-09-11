import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'the-long-view-api',
      status: 'ok',
      phase: 'phase-0-foundation',
    };
  }
}
