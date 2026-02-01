import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

export const CategoryEnum = [
  'account_access',
  'technical_issue',
  'billing_question',
  'feature_request',
  'bug_report',
  'other',
];

export const PriorityEnum = ['urgent', 'high', 'medium', 'low'];
export const StatusEnum = ['new', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
export const SourceEnum = ['web_form', 'email', 'api', 'chat', 'phone'];
export const DeviceTypeEnum = ['desktop', 'mobile', 'tablet'];

export const ticketSchema = Joi.object({
  id: Joi.string().uuid().required(),
  customer_id: Joi.string().required(),
  customer_email: Joi.string().email().required(),
  customer_name: Joi.string().required(),
  subject: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  category: Joi.string()
    .valid(...CategoryEnum)
    .required(),
  priority: Joi.string()
    .valid(...PriorityEnum)
    .required(),
  status: Joi.string()
    .valid(...StatusEnum)
    .required(),
  created_at: Joi.date().iso().required(),
  updated_at: Joi.date().iso().required(),
  resolved_at: Joi.date().iso().allow(null),
  assigned_to: Joi.string().allow(null),
  tags: Joi.array().items(Joi.string()).default([]),
  metadata: Joi.object({
    source: Joi.string().valid(...SourceEnum).required(),
    browser: Joi.string().allow(''),
    device_type: Joi.string().valid(...DeviceTypeEnum).required(),
  }).required(),
  classification_confidence: Joi.number().min(0).max(1).optional(),
}).required();

export function createTicketFromInput(input) {
  const now = new Date().toISOString();
  const base = {
    id: input.id || uuidv4(),
    customer_id: input.customer_id,
    customer_email: input.customer_email,
    customer_name: input.customer_name,
    subject: input.subject,
    description: input.description,
    category: input.category || 'other',
    priority: input.priority || 'medium',
    status: input.status || 'new',
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    resolved_at: input.resolved_at ?? null,
    assigned_to: input.assigned_to ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    metadata: {
      source: input.metadata?.source || input.source || 'api',
      browser: input.metadata?.browser || input.browser || '',
      device_type: input.metadata?.device_type || input.device_type || 'desktop',
    },
    classification_confidence: input.classification_confidence,
  };
  const { value, error } = ticketSchema.validate(base, { abortEarly: false });
  if (error) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }
  return value;
}
