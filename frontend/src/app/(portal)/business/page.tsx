'use client';

import { usePortalNavigate } from '@/components/portal-navigation';
import { useEffect } from 'react';

export default function BusinessPage() {
  const navigate = usePortalNavigate();
  useEffect(() => {
    navigate('/dashboard');
  }, [navigate]);
  return null;
}
