import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer Name is required'),
  contactName: z.string().trim().min(1, 'Contact Name is required'),
  phone: z.string().trim().min(7, 'Phone Number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().trim().min(1, 'Address is required')
});

export const namedLookupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required')
});
