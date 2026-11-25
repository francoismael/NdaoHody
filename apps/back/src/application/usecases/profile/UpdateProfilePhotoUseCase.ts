import { Injectable, Logger } from '@nestjs/common';
import type { User } from '../../../domain/entity/User';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { toMeResponse, type MeResponse } from '../../dto/MeResponse';
import { FileStorage } from '../../port/FileStorage';
import { ImageProcessor } from '../../port/ImageProcessor';
import { bestEffort } from '../../helper/bestEffort';
import { assertImage, type UploadedImage } from '../../helper/uploadedImage';

export const PROFILE_PHOTO_FOLDER = 'photos';

/** PUT /me/photo: resizes the photo, stores it, then deletes the previous one. */
@Injectable()
export class UpdateProfilePhotoUseCase {
  private readonly logger = new Logger(UpdateProfilePhotoUseCase.name);

  constructor(
    private readonly users: UserRepository,
    private readonly images: ImageProcessor,
    private readonly storage: FileStorage,
  ) {}

  async execute(user: User, file: UploadedImage | undefined): Promise<MeResponse> {
    assertImage(file);

    const photo = await this.images.toProfilePhoto(file.content);
    const photoUrl = await this.storage.save(PROFILE_PHOTO_FOLDER, photo.content, photo.extension);
    const updated = await this.users.update(user.id, { photoUrl });

    if (user.photoUrl) {
      // The new photo is saved: an old file left on disk must not fail the request.
      await bestEffort(this.logger, 'Old profile photo not removed', this.storage.remove(user.photoUrl));
    }
    return toMeResponse(updated);
  }
}
