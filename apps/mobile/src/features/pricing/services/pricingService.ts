import { request } from '@/core/mock';

import type { PriceEstimate } from '../types';

/** GAP #1 (provisional decision): the server computes every price; the app only shows it. */
export const estimatePrice = (distanceMetres: number, places: number) =>
  request<PriceEstimate>('POST', '/pricing/estimate', { distanceMetres, places });
