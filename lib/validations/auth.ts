import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
})

export const registerSchema = z
  .object({
    email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
    password: z
      .string()
      .min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.')
      .max(72, 'Das Passwort darf maximal 72 Zeichen lang sein.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['confirmPassword'],
  })

export const updateProfileSchema = z.object({
  organisation: z.string().max(120).optional(),
  role: z.enum(['admin', 'analyst', 'stakeholder', 'viewer']).optional(),
  preferences: z
    .object({
      alert_channels: z.array(z.enum(['email', 'slack', 'in_app'])).optional(),
      digest_threshold: z.number().min(0).max(12).optional(),
      alert_threshold: z.number().min(0).max(12).optional(),
      weekly_briefing: z.boolean().optional(),
      muted_vendors: z.array(z.string()).optional(),
      muted_problem_classes: z.array(z.string()).optional(),
      vendor_filters: z.array(z.string()).optional(),
      problem_class_filters: z.array(z.string()).optional(),
      slack_webhook_url: z.string().url().optional().or(z.literal('')),
    })
    .optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
