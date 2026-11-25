import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { toMeResponse, type MeResponse } from '../../application/dto/MeResponse';
import {
  RegisterDeviceRequest,
  SwitchModeRequest,
  UnregisterDeviceRequest,
  UpdateProfileRequest,
} from '../../application/dto/ProfileRequests';
import { DeleteAccountUseCase } from '../../application/usecases/profile/DeleteAccountUseCase';
import { RegisterDeviceUseCase } from '../../application/usecases/profile/RegisterDeviceUseCase';
import { SwitchModeUseCase } from '../../application/usecases/profile/SwitchModeUseCase';
import { UnregisterDeviceUseCase } from '../../application/usecases/profile/UnregisterDeviceUseCase';
import { IMAGE_MAX_BYTES } from '../../application/helper/uploadedImage';
import { UpdateProfilePhotoUseCase } from '../../application/usecases/profile/UpdateProfilePhotoUseCase';
import { UpdateProfileUseCase } from '../../application/usecases/profile/UpdateProfileUseCase';
import type { User } from '../../domain/entity/User';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

const PHOTO_FIELD = 'photo';

/** The signed-in user's own account: /api/v1/me/... */
@ApiTags('me')
@Authenticated()
@ApiBadRequestResponse({ type: ApiErrorResponse })
@Controller('me')
export class MeController {
  constructor(
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly switchMode: SwitchModeUseCase,
    private readonly updateProfilePhoto: UpdateProfilePhotoUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly registerDevice: RegisterDeviceUseCase,
    private readonly unregisterDevice: UnregisterDeviceUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'The account (Utilisateur) and "profilIncomplet".' })
  getMe(@CurrentUser() user: User): MeResponse {
    return toMeResponse(user);
  }

  @Patch()
  @ApiOkResponse({ description: 'Updated account.' })
  update(@CurrentUser() user: User, @Body() body: UpdateProfileRequest): Promise<MeResponse> {
    return this.updateProfile.execute(user, body);
  }

  @Patch('mode')
  @ApiOkResponse({ description: 'Updated account, with the new "modeActuel".' })
  changeMode(@CurrentUser() user: User, @Body() body: SwitchModeRequest): Promise<MeResponse> {
    return this.switchMode.execute(user, body.mode);
  }

  @Put('photo')
  @UseInterceptors(FileInterceptor(PHOTO_FIELD, { limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [PHOTO_FIELD],
      properties: { [PHOTO_FIELD]: { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP, 5 MB max.' } },
    },
  })
  @ApiOkResponse({ description: 'Updated account, with the new "photoUrl".' })
  changePhoto(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MeResponse> {
    return this.updateProfilePhoto.execute(user, file && { content: file.buffer, mimeType: file.mimetype });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Account deleted.' })
  @ApiConflictResponse({ type: ApiErrorResponse, description: 'A ride is in progress.' })
  remove(@CurrentUser() user: User): Promise<void> {
    return this.deleteAccount.execute(user);
  }

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'The phone will receive push notifications.' })
  addDevice(@CurrentUser() user: User, @Body() body: RegisterDeviceRequest): Promise<void> {
    return this.registerDevice.execute(user, body);
  }

  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'The phone no longer receives push notifications.' })
  removeDevice(@CurrentUser() user: User, @Body() body: UnregisterDeviceRequest): Promise<void> {
    return this.unregisterDevice.execute(user, body.jeton);
  }
}
