'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api';

export const SUBSCRIPTION_REQUIRED_MESSAGE =
  'A subscription is required to use Appointments and Calendar. Contact your platform administrator to restore access.';

export type AppointmentsEntitlement = {
  allowed: boolean;
  subcriptionEnabled: boolean;
  subcriptionUntil: number | null;
  reason?: 'disabled' | 'expired' | null;
};

export function isSubscriptionRequiredError(error: unknown) {
  return error instanceof ApiClientError && error.code === 'SUBSCRIPTION_REQUIRED';
}

export function SubscriptionRequiredModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Subscription required"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">{SUBSCRIPTION_REQUIRED_MESSAGE}</p>
    </Modal>
  );
}

export function subscriptionStatusLabel(input: {
  subcriptionEnabled: boolean;
  subcriptionUntil: number | null;
  now?: number;
}): { label: string; tone: 'active' | 'disabled' | 'expired' } {
  const now = input.now ?? Date.now();
  if (!input.subcriptionEnabled) {
    return { label: 'Disabled', tone: 'disabled' };
  }
  if (input.subcriptionUntil == null || now >= input.subcriptionUntil) {
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Active', tone: 'active' };
}
