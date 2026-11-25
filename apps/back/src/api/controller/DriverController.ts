import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { AddVehicleRequest, SubmitDocumentRequest, UpdateVehicleRequest } from '../../application/dto/DriverRequests';
import type {
  AddVehicleResponse,
  DriverApplicationResponse,
  SubmitDocumentResponse,
} from '../../application/dto/DriverResponses';
import { IMAGE_MAX_BYTES, type UploadedImage } from '../../application/helper/uploadedImage';
import { AddVehicleUseCase } from '../../application/usecases/driver/AddVehicleUseCase';
import { GetDriverApplicationUseCase } from '../../application/usecases/driver/GetDriverApplicationUseCase';
import { ManageVehiclesUseCase } from '../../application/usecases/driver/ManageVehiclesUseCase';
import { SubmitDriverDocumentUseCase } from '../../application/usecases/driver/SubmitDriverDocumentUseCase';
import type { User } from '../../domain/entity/User';
import type { Vehicle } from '../../domain/entity/Vehicle';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

const IMAGE_UPLOAD_LIMITS = { limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } };
const IMAGE_SCHEMA = { type: 'string', format: 'binary', description: 'JPEG, PNG or WebP, 5 MB max.' };

function toUploadedImage(file: Express.Multer.File | undefined): UploadedImage | undefined {
  return file && { content: file.buffer, mimeType: file.mimetype };
}

/**
 * Becoming a driver: /api/v1/me/documents and /api/v1/me/vehicles.
 * `compteReactive` in an answer: the licence or plate belonged to the driver's old deleted account,
 * which is active again; the app must switch to the tokens it contains.
 */
@ApiTags('driver')
@Authenticated()
@ApiConflictResponse({ type: ApiErrorResponse, description: 'Licence or plate already used by another account.' })
@Controller('me')
export class DriverController {
  constructor(
    private readonly getApplication: GetDriverApplicationUseCase,
    private readonly submitDocument: SubmitDriverDocumentUseCase,
    private readonly addVehicle: AddVehicleUseCase,
    private readonly vehicles: ManageVehiclesUseCase,
  ) {}

  @Get('documents')
  @ApiOkResponse({ description: 'Driver status, licence number and latest documents (links valid 10 min).' })
  documents(@CurrentUser() user: User): Promise<DriverApplicationResponse> {
    return this.getApplication.execute(user);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('fichier', IMAGE_UPLOAD_LIMITS))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'fichier'],
      properties: {
        type: { type: 'string', enum: ['permis_recto', 'permis_verso', 'selfie'], description: 'permis_recto first.' },
        numeroPermis: { type: 'string', description: 'Required with permis_recto.' },
        fichier: IMAGE_SCHEMA,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Document saved; may contain "compteReactive".' })
  sendDocument(
    @CurrentUser() user: User,
    @Body() body: SubmitDocumentRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<SubmitDocumentResponse> {
    return this.submitDocument.execute(user, body, toUploadedImage(file));
  }

  @Get('vehicles')
  @ApiOkResponse({ description: 'Vehicles of the driver (archived ones excluded), default first.' })
  listVehicles(@CurrentUser() user: User): Promise<Vehicle[]> {
    return this.vehicles.list(user);
  }

  @Post('vehicles')
  @UseInterceptors(FileInterceptor('photo', IMAGE_UPLOAD_LIMITS))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'couleur', 'immatriculation', 'places', 'photo'],
      properties: {
        type: { type: 'string', enum: ['moto', 'voiture'] },
        marque: { type: 'string' },
        modele: { type: 'string' },
        couleur: { type: 'string' },
        immatriculation: { type: 'string', example: '1234 TBA' },
        places: { type: 'integer', example: 4 },
        photo: IMAGE_SCHEMA,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Vehicle waiting for validation; may contain "compteReactive".' })
  createVehicle(
    @CurrentUser() user: User,
    @Body() body: AddVehicleRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<AddVehicleResponse> {
    return this.addVehicle.execute(user, body, toUploadedImage(file));
  }

  @Patch('vehicles/:id')
  @ApiOkResponse({ description: 'Updated vehicle.' })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  updateVehicle(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVehicleRequest,
  ): Promise<Vehicle> {
    return this.vehicles.update(user, id, body);
  }

  @Delete('vehicles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Vehicle archived (its plate stays tied to this account).' })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  archiveVehicle(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.vehicles.archive(user, id);
  }
}
