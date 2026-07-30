'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { trackAnalyticsGoal, type AnalyticsParams } from '@/lib/analytics';

type TrackedDownloadLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  analyticsParams?: AnalyticsParams;
  children: ReactNode;
};

export default function TrackedDownloadLink({
  analyticsParams = {},
  children,
  onClick,
  ...props
}: TrackedDownloadLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackAnalyticsGoal('image_download', analyticsParams);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}