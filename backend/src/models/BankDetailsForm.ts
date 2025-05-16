import { z } from 'zod'

export const schema = z.object({
    accountHolder: z.string(),
    bankName: z.string(),
    iban: z.string(),
    swiftBic: z.string(),
    showBankDetailsPage: z.boolean(),
})

export type FormFields = z.infer<typeof schema>
