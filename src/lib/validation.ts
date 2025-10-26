import { z } from 'zod'

// Ticket Message Validation
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(2000, 'Nachricht zu lang (max. 2000 Zeichen)')
    .trim(),
  isInternalNote: z.boolean().optional().default(false)
})

// Maintenance Window Validation
export const maintenanceSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel zu lang (max. 200 Zeichen)')
    .trim(),
  description: z.string()
    .max(1000, 'Beschreibung zu lang (max. 1000 Zeichen)')
    .optional(),
  type: z.enum([
    'SYSTEM_UPDATE',
    'SECURITY_PATCH', 
    'HARDWARE_MAINTENANCE',
    'SOFTWARE_UPDATE',
    'BACKUP_MAINTENANCE',
    'OTHER'
  ]),
  status: z.enum([
    'SCHEDULED',
    'IN_PROGRESS', 
    'COMPLETED',
    'CANCELLED'
  ]),
  scheduledAt: z.string()
    .datetime('Ungültiges Datum/Zeit Format'),
  estimatedDuration: z.string()
    .regex(/^\d+$/, 'Nur Zahlen erlaubt')
    .optional(),
  notes: z.string()
    .max(500, 'Notizen zu lang (max. 500 Zeichen)')
    .optional()
})

// Company Validation
export const companySchema = z.object({
  name: z.string()
    .min(1, 'Firmenname ist erforderlich')
    .max(100, 'Firmenname zu lang (max. 100 Zeichen)')
    .trim(),
  email: z.string()
    .email('Ungültige E-Mail Adresse')
    .max(100, 'E-Mail zu lang (max. 100 Zeichen)'),
  phone: z.string()
    .max(20, 'Telefonnummer zu lang (max. 20 Zeichen)')
    .optional(),
  address: z.string()
    .max(200, 'Adresse zu lang (max. 200 Zeichen)')
    .optional()
})

// User Validation
export const userSchema = z.object({
  firstName: z.string()
    .min(1, 'Vorname ist erforderlich')
    .max(50, 'Vorname zu lang (max. 50 Zeichen)')
    .trim(),
  lastName: z.string()
    .min(1, 'Nachname ist erforderlich')
    .max(50, 'Nachname zu lang (max. 50 Zeichen)')
    .trim(),
  email: z.string()
    .email('Ungültige E-Mail Adresse')
    .max(100, 'E-Mail zu lang (max. 100 Zeichen)'),
  role: z.enum(['ADMIN', 'CLIENT']),
  companyId: z.string().uuid('Ungültige Firmen-ID').optional()
})

// Ticket Validation
export const ticketSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel zu lang (max. 200 Zeichen)')
    .trim(),
  description: z.string()
    .min(1, 'Beschreibung ist erforderlich')
    .max(2000, 'Beschreibung zu lang (max. 2000 Zeichen)')
    .trim(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string()
    .max(50, 'Kategorie zu lang (max. 50 Zeichen)')
    .optional()
})

// Invoice Validation
export const invoiceSchema = z.object({
  companyId: z.string().uuid('Ungültige Firmen-ID'),
  amount: z.number()
    .positive('Betrag muss positiv sein')
    .max(999999.99, 'Betrag zu hoch (max. 999.999,99€)'),
  description: z.string()
    .min(1, 'Beschreibung ist erforderlich')
    .max(500, 'Beschreibung zu lang (max. 500 Zeichen)')
    .trim(),
  dueDate: z.string()
    .datetime('Ungültiges Fälligkeitsdatum')
})

// Helper function to validate and sanitize input
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Validierungsfehler: ${errorMessages.join(', ')}`)
    }
    throw error
  }
}

// Sanitize HTML content to prevent XSS
export function sanitizeHtml(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}






