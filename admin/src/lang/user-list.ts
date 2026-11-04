import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    DELETE_USER: 'Êtes-vous sûr de vouloir supprimer cet utilisateur et toutes ses données ?',
    DELETE_USERS: 'Êtes-vous sûr de vouloir supprimer les utilisateurs sélectionnés et toutes leurs données ?',
    DELETE_SELECTION: 'Supprimer les utilisateurs sélectionnés',
    BLACKLIST: 'Ajouter à la liste noire',
  },
  en: {
    DELETE_USER: 'Are you sure you want to delete this user and all his data?',
    DELETE_USERS: 'Are you sure you want to delete the selected users and all their data?',
    DELETE_SELECTION: 'Delete selectied users',
    BLACKLIST: 'Add to the blacklist',
  },
  es: {
    DELETE_USER: '¿Estás seguro de que quieres eliminar a este usuario y todos sus datos?',
    DELETE_USERS: '¿Estás seguro de que quieres eliminar a los usuarios seleccionados y todos sus datos?',
    DELETE_SELECTION: 'Eliminar los usuarios seleccionados',
    BLACKLIST: 'Añadir a la lista negra',
  },
  de: {
    DELETE_USER: 'Sind Sie sicher, dass Sie diesen Benutzer und alle seine Daten löschen möchten?',
    DELETE_USERS: 'Sind Sie sicher, dass Sie die ausgewählten Benutzer und alle ihre Daten löschen möchten?',
    DELETE_SELECTION: 'Ausgewählte Benutzer löschen',
    BLACKLIST: 'Zur Sperrliste hinzufügen',
  },
  pt: {
    DELETE_USER: 'Tem a certeza de que pretende eliminar este utilizador e todos os seus dados?',
    DELETE_USERS: 'Tem a certeza de que pretende eliminar os utilizadores selecionados e todos os seus dados?',
    DELETE_SELECTION: 'Eliminar os utilizadores selecionados',
    BLACKLIST: 'Adicionar à lista negra',
  },
  it: {
    DELETE_USER: 'Sei sicuro di voler eliminare questo utente e tutti i suoi dati?',
    DELETE_USERS: 'Sei sicuro di voler eliminare gli utenti selezionati e tutti i loro dati?',
    DELETE_SELECTION: 'Elimina gli utenti selezionati',
    BLACKLIST: 'Aggiungi alla lista nera',
  },
  zh: {
    DELETE_USER: '您确定要删除该用户及其所有数据吗？',
    DELETE_USERS: '您确定要删除所选用户及其所有数据吗？',
    DELETE_SELECTION: '删除所选用户',
    BLACKLIST: '加入黑名单',
  },
  ja: {
    DELETE_USER: 'このユーザーとそのすべてのデータを削除してもよろしいですか？',
    DELETE_USERS: '選択したユーザーとそのすべてのデータを削除してもよろしいですか？',
    DELETE_SELECTION: '選択したユーザーを削除',
    BLACKLIST: 'ブラックリストに追加',
  },
})

langHelper.setLanguage(strings)
export { strings }
