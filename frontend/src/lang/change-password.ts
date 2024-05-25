import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CHANGE_PASSWORD_HEADING: 'Modification du mot de passe',
    CURRENT_PASSWORD: 'Mot de passe actuel',
    CURRENT_PASSWORD_ERROR: 'Mauvais mot de passe',
    NEW_PASSWORD: 'Nouveau mot de passe',
    NEW_PASSWORD_ERROR: 'Veuillez choisir un nouveau mot de passe',
    PASSWORD_UPDATE_ERROR: "Une erreur s'est produite lors de la modification du mot de passe.",
    PASSWORD_UPDATE: 'Le mot de passe a été mofifié avec succès.',
  },
  en: {
    CHANGE_PASSWORD_HEADING: 'Password Modification',
    CURRENT_PASSWORD: 'Current Password',
    CURRENT_PASSWORD_ERROR: 'Wrong password',
    NEW_PASSWORD: 'New Password',
    NEW_PASSWORD_ERROR: 'Please choose a new password',
    PASSWORD_UPDATE_ERROR: 'An error occurred while updating password.',
    PASSWORD_UPDATE: 'Password changed successfully.',
  },
  el: {
     CHANGE_PASSWORD_HEADING: 'Τροποποίηση κωδικού πρόσβασης',
     CURRENT_PASSWORD: 'Τρέχον κωδικός πρόσβασης',
     CURRENT_PASSWORD_ERROR: 'Λάθος κωδικός πρόσβασης',
     NEW_PASSWORD: 'Νέος κωδικός πρόσβασης',
     NEW_PASSWORD_ERROR: 'Παρακαλώ επιλέξτε νέο κωδικό πρόσβασης',
     PASSWORD_UPDATE_ERROR: 'Παρουσιάστηκε σφάλμα κατά την ενημέρωση του κωδικού πρόσβασης.',
     PASSWORD_UPDATE: 'Ο κωδικός πρόσβασης άλλαξε με επιτυχία.',
   },
})

langHelper.setLanguage(strings)
export { strings }
