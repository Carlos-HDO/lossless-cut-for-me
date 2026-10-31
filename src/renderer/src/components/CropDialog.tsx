import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdCrop } from 'react-icons/md';
import { FaInfoCircle, FaUndo } from 'react-icons/fa';
import { TextField } from '@radix-ui/themes';

import * as Dialog from './Dialog';
import Checkbox from './Checkbox';
import Button, { DialogButton } from './Button';
import type { BsfCropParams } from '../types';
import type { FFprobeStream } from '../../../common/ffprobe';
import { isCropActive } from '../util/streams';
import { primaryTextColor, primaryColor } from '../colors';


interface CropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stream: FFprobeStream | undefined;
  currentCrop: BsfCropParams | undefined;
  onUpdateCrop: (crop: BsfCropParams) => void;
}

const presets = [
  { label: '16:9', num: 16, den: 9 },
  { label: '4:3', num: 4, den: 3 },
  { label: '1:1', num: 1, den: 1 },
  { label: '9:16', num: 9, den: 16 },
  { label: '21:9', num: 21, den: 9 },
] as const;

function calculatePresetCrop(w: number, h: number, targetRatioNum: number, targetRatioDen: number): BsfCropParams {
  const targetRatio = targetRatioNum / targetRatioDen;
  const currentRatio = w / h;

  if (currentRatio > targetRatio) {
    const targetW = Math.round((h * targetRatio) / 2) * 2;
    const diffW = Math.max(0, w - targetW);
    const half = Math.floor(diffW / 4) * 2;
    return { left: half, right: diffW - half, top: 0, bottom: 0 };
  }

  const targetH = Math.round((w / targetRatio) / 2) * 2;
  const diffH = Math.max(0, h - targetH);
  const half = Math.floor(diffH / 4) * 2;
  return { left: 0, right: 0, top: half, bottom: diffH - half };
}

export default function CropDialog({
  isOpen,
  onClose,
  stream,
  currentCrop,
  onUpdateCrop,
}: CropDialogProps) {
  const { t } = useTranslation();

  const [syncVertical, setSyncVertical] = useState(false);
  const [syncHorizontal, setSyncHorizontal] = useState(false);

  const crop = useMemo<BsfCropParams>(
    () => currentCrop ?? { left: 0, right: 0, top: 0, bottom: 0 },
    [currentCrop],
  );

  const origWidth = stream?.width ?? 0;
  const origHeight = stream?.height ?? 0;

  const croppedWidth = Math.max(0, origWidth - crop.left - crop.right);
  const croppedHeight = Math.max(0, origHeight - crop.top - crop.bottom);

  const isLosslessSupported = stream?.codec_name === 'h264' || stream?.codec_name === 'hevc';

  const updateField = useCallback(
    (field: keyof BsfCropParams, rawValue: string) => {
      const parsed = parseInt(rawValue, 10);
      const val = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;

      const nextCrop: BsfCropParams = { ...crop, [field]: val };

      if (syncVertical && (field === 'top' || field === 'bottom')) {
        nextCrop.top = val;
        nextCrop.bottom = val;
      }
      if (syncHorizontal && (field === 'left' || field === 'right')) {
        nextCrop.left = val;
        nextCrop.right = val;
      }

      onUpdateCrop(nextCrop);
    },
    [crop, onUpdateCrop, syncHorizontal, syncVertical],
  );

  const resetCrop = useCallback(() => {
    onUpdateCrop({ left: 0, right: 0, top: 0, bottom: 0 });
  }, [onUpdateCrop]);

  const applyPreset = useCallback(
    (num: number, den: number) => {
      if (origWidth <= 0 || origHeight <= 0) return;
      const presetCrop = calculatePresetCrop(origWidth, origHeight, num, den);
      onUpdateCrop(presetCrop);
    },
    [origHeight, origWidth, onUpdateCrop],
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content style={{ maxWidth: 480, width: '92vw' }}>
          <Dialog.Title style={{ display: 'flex', alignItems: 'center', gap: '.4em', fontSize: '1.2em' }}>
            <MdCrop style={{ fontSize: '1.4em', color: primaryColor }} />
            {t('Crop video (Video effects)')}
          </Dialog.Title>

          <Dialog.Description style={{ color: 'var(--gray-11)', fontSize: '.9em', margin: '.4em 0 1em' }}>
            {t('Crop pixels from each edge. The preview in the player updates live.')}
          </Dialog.Description>

          <Dialog.CloseButton />

          {/* Resolution info box */}
          {origWidth > 0 && origHeight > 0 && (
            <div
              style={{
                background: 'var(--gray-3)',
                padding: '.8em 1em',
                borderRadius: '.5em',
                marginBottom: '1em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '.9em',
              }}
            >
              <div>
                <span style={{ color: 'var(--gray-11)' }}>{t('Original:')} </span>
                <strong>{origWidth} × {origHeight}</strong>
              </div>
              <div style={{ color: 'var(--gray-11)' }}>→</div>
              <div>
                <span style={{ color: 'var(--gray-11)' }}>{t('Cropped:')} </span>
                <strong style={{ color: isCropActive(crop) ? primaryTextColor : undefined }}>
                  {croppedWidth} × {croppedHeight}
                </strong>
              </div>
            </div>
          )}

          {/* VLC-Style directional crop controls */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '.8em',
              background: 'var(--gray-2)',
              padding: '1em',
              borderRadius: '.5em',
              marginBottom: '1em',
            }}
          >
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label style={{ display: 'block', fontSize: '.85em', color: 'var(--gray-11)', marginBottom: '.2em' }}>
                {t('Top (pixels)')}
              </label>
              <TextField.Root
                type="number"
                min="0"
                step="2"
                style={{ width: '100%' }}
                value={String(crop.top)}
                onChange={(e) => updateField('top', e.target.value)}
              />
            </div>

            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label style={{ display: 'block', fontSize: '.85em', color: 'var(--gray-11)', marginBottom: '.2em' }}>
                {t('Bottom (pixels)')}
              </label>
              <TextField.Root
                type="number"
                min="0"
                step="2"
                style={{ width: '100%' }}
                value={String(crop.bottom)}
                onChange={(e) => updateField('bottom', e.target.value)}
              />
            </div>

            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label style={{ display: 'block', fontSize: '.85em', color: 'var(--gray-11)', marginBottom: '.2em' }}>
                {t('Left (pixels)')}
              </label>
              <TextField.Root
                type="number"
                min="0"
                step="2"
                style={{ width: '100%' }}
                value={String(crop.left)}
                onChange={(e) => updateField('left', e.target.value)}
              />
            </div>

            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label style={{ display: 'block', fontSize: '.85em', color: 'var(--gray-11)', marginBottom: '.2em' }}>
                {t('Right (pixels)')}
              </label>
              <TextField.Root
                type="number"
                min="0"
                step="2"
                style={{ width: '100%' }}
                value={String(crop.right)}
                onChange={(e) => updateField('right', e.target.value)}
              />
            </div>
          </div>

          {/* VLC-Style synchronization checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6em', marginBottom: '1.2em', fontSize: '.9em' }}>
            <Checkbox
              checked={syncVertical}
              onCheckedChange={(c) => setSyncVertical(!!c)}
              label={t('Synchronize top and bottom')}
            />
            <Checkbox
              checked={syncHorizontal}
              onCheckedChange={(c) => setSyncHorizontal(!!c)}
              label={t('Synchronize left and right')}
            />
          </div>

          {/* Aspect Ratio Presets */}
          <div style={{ marginBottom: '1.2em' }}>
            <div style={{ fontSize: '.85em', color: 'var(--gray-11)', marginBottom: '.4em' }}>
              {t('Aspect ratio presets:')}
            </div>
            <div style={{ display: 'flex', gap: '.5em', flexWrap: 'wrap' }}>
              {presets.map((p) => (
                <Button
                  key={p.label}
                  onClick={() => applyPreset(p.num, p.den)}
                  style={{ fontSize: '.8em', padding: '.3em .7em' }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Compatibility badge */}
          <div style={{ fontSize: '.8em', color: 'var(--gray-11)', marginBottom: '1em', display: 'flex', alignItems: 'center', gap: '.4em' }}>
            <FaInfoCircle style={{ flexShrink: 0 }} />
            <span>
              {isLosslessSupported
                ? t('Lossless crop supported (bitstream metadata, instantaneous without re-encoding).')
                : t('Crop metadata requires H.264 or HEVC stream format.')}
            </span>
          </div>

          <Dialog.ButtonRow>
            {isCropActive(crop) && (
              <Button onClick={resetCrop} style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '.4em' }}>
                <FaUndo style={{ fontSize: '.8em' }} />
                {t('Reset crop')}
              </Button>
            )}
            <DialogButton primary onClick={onClose}>
              {t('Done')}
            </DialogButton>
          </Dialog.ButtonRow>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
