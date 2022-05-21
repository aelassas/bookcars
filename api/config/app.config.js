import LocalizedStrings from 'localized-strings';

export default new LocalizedStrings.default({
    fr: {
        ERROR: 'Erreur interne : ',
        DB_ERROR: 'Échec de la requête dans la base de données : ',
        SMTP_ERROR: "Échec de l'envoi de l'email: ",
        ACCOUNT_VALIDATION_SUBJECT: 'Validation de votre compte',
        HELLO: 'Bonjour ',
        ACCOUNT_VALIDATION_LINK: 'Veuillez activer votre compte en cliquant sur le lien :',
        REGARDS: "Cordialement,<br>L'équipe BookCars",
        ACCOUNT_VALIDATION_TECHNICAL_ISSUE: 'Problème technique! Veuillez cliquer sur renvoyer pour valider votre e-mail.',
        ACCOUNT_VALIDATION_LINK_EXPIRED: 'Votre lien de validation a peut-être expiré. Veuillez cliquer sur renvoyer pour valider votre e-mail.',
        ACCOUNT_VALIDATION_LINK_ERROR: "Nous n'avons pas pu trouver d'utilisateur correspondant à cette adresse e-mail. Veuillez vous inscrire.",
        ACCOUNT_VALIDATION_SUCCESS: 'Votre compte a été validé avec succès.',
        ACCOUNT_VALIDATION_RESEND_ERROR: "Nous n'avons pas pu trouver d'utilisateur correspondant à cette adresse e-mail. Assurez-vous que votre e-mail est correct.",
        ACCOUNT_VALIDATION_ACCOUNT_VERIFIED: 'Ce compte a déjà été validé. Veuillez vous connecter.',
        ACCOUNT_VALIDATION_SUBJECT: 'Validation de votre compte',
        ACCOUNT_VALIDATION_LINK: 'Veuillez activer votre compte en cliquant sur le lien :',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_1: 'Un email de validation a été envoyé à',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_2: ". Il expirera au bout d'un jour. Si vous n'avez pas reçu d'e-mail de validation, cliquez sur renvoyer.",
        CAR_IMAGE_REQUIRED: "Le champ image de Car ne peut pas être vide: ",
        CAR_IMAGE_NOT_FOUND: "Le fichier image est introuvable : "
    },
    en: {
        ERROR: 'Internal error: ',
        DB_ERROR: 'Database Failure: ',
        SMTP_ERROR: 'Failed to send email: ',
        ACCOUNT_VALIDATION_SUBJECT: 'Account Validation',
        HELLO: 'Hello ',
        ACCOUNT_VALIDATION_LINK: 'Please activate your account by clicking the link:',
        REGARDS: 'Kind regards,<br>BookCars team',
        ACCOUNT_VALIDATION_TECHNICAL_ISSUE: 'Technical Issue! Please click on resend to validate your email.',
        ACCOUNT_VALIDATION_LINK_EXPIRED: 'Your validation link may have expired. Please click on resend to validate your email.',
        ACCOUNT_VALIDATION_LINK_ERROR: 'We were unable to find a user for this verification. Please Sign up.',
        ACCOUNT_VALIDATION_SUCCESS: 'Your account was successfully verified.',
        ACCOUNT_VALIDATION_RESEND_ERROR: 'We were unable to find a user with that email. Make sure your Email is correct.',
        ACCOUNT_VALIDATION_ACCOUNT_VERIFIED: 'This account has already been verified. Please sign in.',
        ACCOUNT_VALIDATION_SUBJECT: 'Account Validation',
        ACCOUNT_VALIDATION_LINK: 'Please activate your account by clicking the link:',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_1: 'A validation email has been sent to ',
        ACCOUNT_VALIDATION_EMAIL_SENT_PART_2: ". It will be expire after one day. If you didn't receive validation email click on resend.",
        CAR_IMAGE_REQUIRED: "Car's image field can't be blank: ",
        CAR_IMAGE_NOT_FOUND: "Image file not found: "
    }
});
