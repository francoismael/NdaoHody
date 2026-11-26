import { seatPrice, totalPrice } from '../../../src/domain/entity/pricing';

const CAR = { prixMinimum: 3000, prixParKm: 300, arrondi: 100 };
const MOTORBIKE = { prixMinimum: 5000, prixParKm: 500, arrondi: 100 };

describe('seatPrice', () => {
  it('car, 12 km -> 3 600 Ar', () => {
    expect(seatPrice(12_000, CAR)).toBe(3600);
  });

  it('motorbike, 13 km -> 6 500 Ar', () => {
    expect(seatPrice(13_000, MOTORBIKE)).toBe(6500);
  });

  it('never below the minimum price (car, 2 km -> 3 000 Ar)', () => {
    expect(seatPrice(2000, CAR)).toBe(3000);
  });

  it('rounds up to the next 100 Ar (car, 12.34 km -> 3 800 Ar)', () => {
    expect(seatPrice(12_340, CAR)).toBe(3800);
  });

  it('total = seat price x seats (3 seats, car, 12 km -> 10 800 Ar)', () => {
    expect(totalPrice(seatPrice(12_000, CAR), 3)).toBe(10_800);
  });
});
