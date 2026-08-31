'use client';

import { FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddressFields<T extends FieldValues>({
  register,
  disabled,
  required,
}: {
  register: UseFormRegister<T>;
  disabled?: boolean;
  required?: boolean;
}) {
  const rules = required ? { required: true } : undefined;
  return (
    <>
      <div>
        <Label required={required}>Address line 1</Label>
        <Input {...register('line1' as Path<T>, rules)} disabled={disabled} />
      </div>
      <div>
        <Label required={required}>Address line 2</Label>
        <Input {...register('line2' as Path<T>, rules)} disabled={disabled} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required={required}>City</Label>
          <Input {...register('city' as Path<T>, rules)} disabled={disabled} />
        </div>
        <div>
          <Label required={required}>State</Label>
          <Input {...register('state' as Path<T>, rules)} disabled={disabled} />
        </div>
        <div>
          <Label required={required}>Postal code</Label>
          <Input {...register('postalCode' as Path<T>, rules)} disabled={disabled} />
        </div>
        <div>
          <Label required={required}>Country</Label>
          <Input {...register('country' as Path<T>, rules)} disabled={disabled} />
        </div>
      </div>
    </>
  );
}
