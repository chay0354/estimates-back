import { z } from 'zod';
import { ESTIMATE_STATUSES, JOB_STATUSES, COMMISSION_STRUCTURES } from '../constants/enums.js';

const money = z.coerce.number().min(0, 'Amount cannot be negative');

function normalizeLink(value) {
  if (value == null) return value;
  let link = String(value).trim().replace(/^['"]+|['"]+$/g, '');
  if (!link || link === 'http://' || link === 'https://') return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(link)) link = 'https://' + link.replace(/^\/\//, '');
  return link;
}

function isWebLink(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const requiredLink = z.preprocess(
  normalizeLink,
  z.string().superRefine((value, ctx) => {
    if (!value) ctx.addIssue({ code: 'custom', message: 'A link is required' });
    else if (!isWebLink(value)) ctx.addIssue({ code: 'custom', message: 'Enter a web link' });
  })
);

const optionalLink = z.preprocess(
  (value) => {
    const link = normalizeLink(value);
    return link ? link : undefined;
  },
  z.string().refine(isWebLink, 'Enter a web link').optional()
);

export const estimateFields = {
  estimateNumber: z.string().trim().min(1, 'Estimate Number is required'),
  estimateLink: requiredLink,
  customerId: z.string().min(1, 'Customer Name is required'),
  contactId: z.string().min(1, 'Contact Name is required'),
  phone: z.string().trim().min(7, 'Phone Number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  addressId: z.string().min(1, 'Address is required'),
  marketingSourceId: z.string().min(1, 'Marketing Source is required'),
  estimateDate: z.coerce.date({ message: 'Estimate Date is required' }),
  assignedUserId: z.string().min(1, 'Assigned User is required'),
  estimateTypeId: z.string().min(1, 'Estimate Type is required'),
  commissionStructure: z.enum(COMMISSION_STRUCTURES),
  estimateAmount: money,
  converted: z.boolean(),
  status: z.enum(ESTIMATE_STATUSES),

  // job block — required only when converted === true (see refine below)
  jobStatus: z.enum(JOB_STATUSES).optional(),
  jobLink: optionalLink,
  jobDate: z.coerce.date().optional(),
  jobAmount: money.optional(),
  installerIds: z.array(z.string()).default([])
};

const requireJobFields = (data, ctx) => {
  if (data.converted !== true) return;
  for (const key of ['jobStatus', 'jobLink', 'jobDate', 'jobAmount']) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Required once the estimate is converted' });
    }
  }
};

export const createEstimateSchema = z.object(estimateFields).superRefine(requireJobFields);

export const updateEstimateSchema = z
  .object(estimateFields)
  .partial()
  .superRefine((data, ctx) => { if (data.converted === true) requireJobFields(data, ctx); });

export const listQuerySchema = z.object({
  q: z.string().trim().default(''),
  range: z.enum(['all', '7d', '30d', 'quarter']).default('all'),
  status: z.string().default('all'),
  assignedUserId: z.string().default('all'),
  estimateTypeId: z.string().default('all'),
  commissionStructure: z.string().default('all'),
  converted: z.enum(['any', 'yes', 'no']).default('any'),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortKey: z.enum(['estimateDate', 'estimateAmount', 'estimateNumber']).default('estimateDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});
