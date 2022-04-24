import LocalizedStrings from 'localized-strings';

export default new LocalizedStrings.default({
    fr: {
        DB_ERROR: 'Échec de la requête dans la base de données : ',
        ACCOUNT_VALIDATION_SUBJECT: 'Validation de votre compte',
        HELLO: 'Bonjour ',
        ACCOUNT_VALIDATION_LINK: 'Veuillez activer votre compte en cliquant sur le lien :',
        REGARDS: "Cordialement,<br>L'équipe BookCars",
        SMTP_ERROR: "Échec de l'envoi de l'email: ",
        ACCOUNT_VALIDATION_TECHNICAL_ISSUE: 'Problème technique! Veuillez cliquer sur renvoyer pour valider votre e-mail.',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_1: 'Un email de validation a été envoyé à',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_2: ". Il expirera au bout d'un jour. Si vous n'avez pas reçu d'e-mail de validation, cliquez sur renvoyer.",
    },
    en:{
        DB_ERROR: 'Database Failure: ',
        ACCOUNT_VALIDATION_SUBJECT: 'Account Validation',
        HELLO: 'Hello ',
        ACCOUNT_VALIDATION_LINK: 'Please activate your account by clicking the link:',
        REGARDS: 'Kind regards,<br>BookCars team',
        SMTP_ERROR: 'Failed to send email: ',
        ACCOUNT_VALIDATION_TECHNICAL_ISSUE: 'Technical Issue! Please click on resend to validate your email.',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_1: 'A validation email has been sent to ',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_2: ". It will be expire after one day. If you didn't receive validation email click on resend.",
    }
});