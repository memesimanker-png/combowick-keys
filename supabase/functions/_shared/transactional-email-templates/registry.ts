/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as scriptDelivery } from './script-delivery.tsx'
import { template as keyDelivery } from './key-delivery.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'script-delivery': scriptDelivery,
  'key-delivery': keyDelivery,
  'contact-confirmation': contactConfirmation,
}
