import { deletedPhoneNumber } from '../../../../src/domain/entity/User';
import {
  DirectUnitOfWork,
  FakeAccessTokens,
  FixedClock,
  InMemorySessions,
  InMemoryUsers,
  makeUser,
  PlainHasher,
  PredictableRandom,
} from '../../../support/inMemory';
import { IMAGE, InMemoryDriverDocuments, MemoryPrivateFiles, PassThroughImages } from '../../../support/inMemoryDriver';
import { AccountRecoveryService } from '../../../../src/application/service/AccountRecoveryService';
import { SessionIssuerService } from '../../../../src/application/service/SessionIssuerService';
import { SubmitDriverDocumentUseCase } from '../../../../src/application/usecases/driver/SubmitDriverDocumentUseCase';

const NEW_PHONE = '+261329999999';

function setup(...existing: ReturnType<typeof makeUser>[]) {
  const current = makeUser({ id: 50, telephone: NEW_PHONE, nom: 'Rakoto', prenom: 'Hery', sexe: 'homme' });
  const users = new InMemoryUsers(...existing, current);
  const documents = new InMemoryDriverDocuments();
  const sessions = new InMemorySessions();
  const clock = new FixedClock();
  const issuer = new SessionIssuerService(sessions, new PlainHasher(), new PredictableRandom(), new FakeAccessTokens(), clock);
  const recovery = new AccountRecoveryService(users, sessions, issuer, clock);
  const useCase = new SubmitDriverDocumentUseCase(
    users,
    documents,
    new PassThroughImages(),
    new MemoryPrivateFiles(),
    recovery,
    new DirectUnitOfWork(),
    clock,
  );
  return { useCase, users, documents, sessions, clock, current };
}

describe('SubmitDriverDocumentUseCase', () => {
  it('stores the licence front with its normalized number', async () => {
    const { useCase, current, users, documents } = setup();

    const result = await useCase.execute(current, { type: 'permis_recto', numeroPermis: 'ab 123 456' }, IMAGE);

    expect(result.compteReactive).toBeNull();
    expect(result.numeroPermis).toBe('AB123456');
    expect(await users.findById(current.id)).toMatchObject({ numeroPermis: 'AB123456' });
    expect(documents.rows).toHaveLength(1);
  });

  it('asks for the licence front first', async () => {
    const { useCase, current } = setup();

    await expect(useCase.execute(current, { type: 'selfie' }, IMAGE)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('puts the application in the admins queue once the 3 documents are sent', async () => {
    const { useCase, users, current } = setup();
    const reload = async () => (await users.findById(current.id)) ?? current;

    await useCase.execute(current, { type: 'permis_recto', numeroPermis: 'AB123456' }, IMAGE);
    await useCase.execute(await reload(), { type: 'permis_verso' }, IMAGE);
    expect((await reload()).statutChauffeur).toBe('aucun');

    const result = await useCase.execute(await reload(), { type: 'selfie' }, IMAGE);

    expect(result.statutChauffeur).toBe('en_attente');
    expect(result.documents.map((document) => document.type)).toEqual(['permis_recto', 'permis_verso', 'selfie']);
  });

  it('reactivates the old deleted account that has the same licence, with its history', async () => {
    const previous = makeUser({
      id: 7,
      statut: 'supprime',
      telephone: deletedPhoneNumber(7),
      nom: 'Rabe',
      prenom: 'Andry',
      statutChauffeur: 'valide',
      coursesChauffeur: 42,
      numeroPermis: 'AB123456',
    });
    const { useCase, current, users, documents, sessions } = setup(previous);

    const result = await useCase.execute(current, { type: 'permis_recto', numeroPermis: 'AB-123-456' }, IMAGE);

    // The old account is back, with the new phone number and its own history.
    expect(result.compteReactive?.utilisateur).toMatchObject({
      id: 7,
      statut: 'actif',
      telephone: NEW_PHONE,
      nom: 'Rabe',
      coursesChauffeur: 42,
      statutChauffeur: 'en_attente',
    });
    expect(result.compteReactive?.session.accessToken).toBe('access-7');
    // The account just created is closed and its number freed.
    expect(await users.findById(50)).toMatchObject({ statut: 'supprime', telephone: deletedPhoneNumber(50) });
    // The new document goes to the old account.
    expect(documents.rows[0]?.utilisateurId).toBe(7);
    expect(sessions.rows.find((session) => session.utilisateurId === 7)).toBeDefined();
  });

  it.each(['actif', 'suspendu'] as const)('refuses a licence used by another %s account', async (statut) => {
    const other = makeUser({ id: 7, statut, telephone: '+261340000007', numeroPermis: 'AB123456' });
    const { useCase, current, documents } = setup(other);

    await expect(
      useCase.execute(current, { type: 'permis_recto', numeroPermis: 'AB123456' }, IMAGE),
    ).rejects.toMatchObject({ reason: 'conflict' });
    expect(documents.rows).toHaveLength(0);
  });

  it('refuses a driver already validated', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(makeUser({ statutChauffeur: 'valide' }), { type: 'permis_recto', numeroPermis: 'AB123456' }, IMAGE),
    ).rejects.toMatchObject({ reason: 'forbidden' });
  });
});
