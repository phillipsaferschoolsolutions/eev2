// This file is now deprecated - photo state is managed globally via PhotoBankProvider
// Keep this file for backward compatibility but redirect to the context

import { usePhotoBank as usePhotoBankContext } from '@/context/photo-bank-context';

export const usePhotoBank = usePhotoBankContext;
export type { PhotoItem } from '@/context/photo-bank-context';