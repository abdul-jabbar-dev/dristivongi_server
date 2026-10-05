import { z } from 'zod';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(1000).optional(),
    organizationType: z.string().min(2).max(50),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional(),
    organizationType: z.string().min(2).max(50).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});
