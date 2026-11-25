import { Injectable } from '@nestjs/common';
import { Clock } from '../../application/port/Clock';

@Injectable()
export class SystemClockAdapter extends Clock {
  now(): Date {
    return new Date();
  }
}
