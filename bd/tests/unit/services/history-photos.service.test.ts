import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../src/lib/ApiError.js';
import * as historyPhotos from '../../../src/services/content/history-photos.service.js';

// The service's only persistence + storage collaborators — mocked wholesale.
vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    historyPhoto: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    media: {
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('../../../src/services/media/storage.service.js', () => ({
  deleteImage: vi.fn(),
}));

const { prisma } = await import('../../../src/lib/prisma.js');
const { deleteImage } = await import('../../../src/services/media/storage.service.js');

const mockedPhoto = vi.mocked(prisma.historyPhoto);
const mockedMedia = vi.mocked(prisma.media);
const mockedDeleteImage = vi.mocked(deleteImage);

beforeEach(() => {
  vi.clearAllMocks();
  mockedDeleteImage.mockResolvedValue(undefined);
  mockedMedia.delete.mockResolvedValue({} as never);
  mockedPhoto.delete.mockResolvedValue(PHOTO_ROW);
});

const MEDIA_ROW = { publicId: 'root/tuuh/2026/a', url: 'https://res.cloudinary.com/x/a.png' };

/** Full HistoryPhoto payload shape — what prisma.*.delete resolves with. */
const PHOTO_ROW = {
  caption: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  folder: '2026',
  id: 'p1',
  publicId: MEDIA_ROW.publicId,
  sortOrder: 0,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  url: MEDIA_ROW.url,
};

describe('history-photos service', () => {
  it('creates a photo with the url resolved from the media library', async () => {
    mockedMedia.findUnique.mockResolvedValue(MEDIA_ROW as never);
    mockedPhoto.create.mockResolvedValue({ id: 'p1' } as never);

    const photo = await historyPhotos.createHistoryPhoto({
      folder: '2026',
      publicId: 'root/tuuh/2026/a',
      sortOrder: 2,
    });

    expect(photo).toEqual({ id: 'p1' });
    expect(mockedPhoto.create).toHaveBeenCalledWith({
      data: {
        caption: null,
        folder: '2026',
        publicId: 'root/tuuh/2026/a',
        sortOrder: 2,
        url: MEDIA_ROW.url,
      },
      select: expect.anything(),
    });
  });

  it('defaults sortOrder to 0 when create omits it', async () => {
    mockedMedia.findUnique.mockResolvedValue(MEDIA_ROW as never);
    mockedPhoto.create.mockResolvedValue({ id: 'p1' } as never);

    await historyPhotos.createHistoryPhoto({
      folder: '2026',
      publicId: 'root/tuuh/2026/a',
    });

    expect(mockedPhoto.create.mock.calls[0]?.[0]?.data?.sortOrder).toBe(0);
  });

  it('rejects a create whose publicId is not in the media library', async () => {
    mockedMedia.findUnique.mockResolvedValue(null);

    await expect(
      historyPhotos.createHistoryPhoto({ folder: '2026', publicId: 'root/other' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedPhoto.create).not.toHaveBeenCalled();
  });

  it('replaces the asset on a publicId change and destroys the old one', async () => {
    mockedPhoto.findUnique.mockResolvedValue({ publicId: 'root/old' } as never);
    mockedMedia.findUnique.mockResolvedValue({
      publicId: 'root/new',
      url: 'https://res.cloudinary.com/x/new.png',
    } as never);
    mockedPhoto.update.mockResolvedValue({ id: 'p1' } as never);

    await historyPhotos.updateHistoryPhoto('p1', { publicId: 'root/new' });

    expect(mockedPhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { publicId: 'root/new', url: 'https://res.cloudinary.com/x/new.png' },
      }),
    );
    expect(mockedDeleteImage).toHaveBeenCalledWith('root/old');
    expect(mockedMedia.delete).toHaveBeenCalledWith({ where: { publicId: 'root/old' } });
  });

  it('leaves the asset alone when a patch only touches metadata', async () => {
    mockedPhoto.findUnique.mockResolvedValue({ publicId: 'root/keep' } as never);
    mockedPhoto.update.mockResolvedValue({ id: 'p1' } as never);

    await historyPhotos.updateHistoryPhoto('p1', { caption: 'Аварга' });

    expect(mockedMedia.findUnique).not.toHaveBeenCalled();
    expect(mockedDeleteImage).not.toHaveBeenCalled();
  });

  it('404s when updating or deleting a missing photo', async () => {
    mockedPhoto.findUnique.mockResolvedValue(null);

    await expect(
      historyPhotos.updateHistoryPhoto('missing', { caption: 'x' }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(historyPhotos.removeHistoryPhoto('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes the row, the Cloudinary asset and the media row together', async () => {
    mockedPhoto.findUnique.mockResolvedValue({ publicId: 'root/gone' } as never);
    mockedPhoto.delete.mockResolvedValue(PHOTO_ROW);

    const result = await historyPhotos.removeHistoryPhoto('p1');

    expect(result).toEqual({ assetDeleted: true, deleted: true, id: 'p1', publicId: 'root/gone' });
    expect(mockedDeleteImage).toHaveBeenCalledWith('root/gone');
    expect(mockedMedia.delete).toHaveBeenCalledWith({ where: { publicId: 'root/gone' } });
  });

  it('still deletes the row when the Cloudinary destroy fails', async () => {
    mockedPhoto.findUnique.mockResolvedValue({ publicId: 'root/gone' } as never);
    mockedPhoto.delete.mockResolvedValue(PHOTO_ROW);
    mockedDeleteImage.mockRejectedValue(new Error('cloud down'));

    const result = await historyPhotos.removeHistoryPhoto('p1');

    expect(result.assetDeleted).toBe(false);
    expect(mockedMedia.delete).toHaveBeenCalledWith({ where: { publicId: 'root/gone' } });
  });
});
