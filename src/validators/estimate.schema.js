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
  converted: z.boolean().default(false),
  status: z.enum(ESTIMATE_STATUSES),
  jobStatus: z.enum(JOB_STATUSES).optional(),
  jobLink: optionalLink,
  jobDate: z.coerce.date().optional(),
  jobAmount: money.optional(),
  installerIds: z.array(z.string()).default([])
};

export const createEstimateSchema = z.object(estimateFields);

export const updateEstimateSchema = z.object(estimateFields).partial();

export const convertJobSchema = z.object({
  jobNumber: z.string().trim().optional(),
  jobLink: optionalLink,
  jobDate: z.coerce.date().optional(),
  jobAmount: money.optional(),
  installerIds: z.array(z.string()).optional(),
  serviceFusionId: z.string().trim().optional()
});

export const jobPatchSchema = z.object({
  jobNumber: z.string().trim().min(1).optional(),
  jobLink: optionalLink,
  jobDate: z.coerce.date().optional(),
  jobAmount: money.optional(),
  jobStatus: z.enum(JOB_STATUSES).optional(),
  installerIds: z.array(z.string()).optional(),
  serviceFusionId: z.string().trim().nullable().optional(),
  googleReview: z.coerce.number().int().min(0).max(5).optional(),
  yelpReview: z.coerce.number().int().min(0).max(5).optional(),
  fullRebate: z.boolean().optional(),
  mixedRebate: z.boolean().optional(),
  membershipSold: z.boolean().optional(),
  techAdvancePayment: money.optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  techBonus: money.optional(),
  membershipBonus: money.optional(),
  googleStarBonus: money.optional(),
  yelpStarBonus: money.optional(),
  adminApproved: z.boolean().optional(),
  awaitingDeposit: z.boolean().optional(),
  requestReadyToClose: z.boolean().optional()
});

const itemMoney = money;
export const expenseItemSchema = z.object({
  expenseTypeId: z.string().min(1, 'Expense Type is required'),
  vendorId: z.string().optional().or(z.literal('')),
  amount: itemMoney,
  purchasedDate: z.coerce.date().optional()
});
export const installerLaborSchema = z.object({
  expenseTypeId: z.string().optional().or(z.literal('')),
  vendorId: z.string().optional().or(z.literal('')),
  installerId: z.string().min(1, 'Installer is required'),
  paidToId: z.string().optional().or(z.literal('')),
  crew: z.string().trim().optional(),
  amount: itemMoney
});
export const repairLaborSchema = z.object({
  expenseTypeId: z.string().optional().or(z.literal('')),
  vendorId: z.string().optional().or(z.literal('')),
  technicianId: z.string().min(1, 'Tech is required'),
  amount: itemMoney,
  workDate: z.coerce.date().optional()
});
export const paymentItemSchema = z.object({
  paymentDate: z.coerce.date({ message: 'Payment Date is required' }),
  methodId: z.string().min(1, 'Payment Method is required'),
  madeBy: z.string().trim().optional(),
  rebateTypeId: z.string().optional().or(z.literal('')),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  amount: itemMoney
});
export const techPaymentSchema = z.object({
  technicianId: z.string().optional().or(z.literal('')),
  methodId: z.string().min(1, 'Payment Method is required'),
  reference: z.string().trim().min(1, 'Reference is required'),
  madeBy: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  amount: itemMoney,
  paymentDate: z.coerce.date().optional(),
  paidDate: z.coerce.date().optional()
});
export const confirmDepositSchema = z.object({
  confirmed: z.boolean(),
  depositDate: z.coerce.date().optional()
});

export const listQuerySchema = z.object({
  q: z.string().trim().default(''),
  range: z.enum(['all', '7d', '30d', 'quarter']).default('all'),
  status: z.string().default('all'),
  assignedUserId: z.string().default('all'),
  estimateTypeId: z.string().default('all'),
  commissionStructure: z.string().default('all'),
  converted: z.enum(['any', 'yes', 'no']).default('any'),
  technicianId: z.string().default('all'),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortKey: z.enum(['estimateDate', 'estimateAmount', 'estimateNumber']).default('estimateDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});
