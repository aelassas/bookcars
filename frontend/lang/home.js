import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

const COPYRIGHT_PART1 = `Copyright © ${new Date().getFullYear()} BookCars.ma`;

export const strings = new LocalizedStrings({
    fr: {
        DROP_OFF: 'Restituer au même endroit',
        COPYRIGHT_PART1: COPYRIGHT_PART1,
        COPYRIGHT_PART2: '®',
        COPYRIGHT_PART3: '. Tous droits réservés.',
    },
    en: {
        DROP_OFF: 'Return to same location',
        COPYRIGHT_PART1: COPYRIGHT_PART1,
        COPYRIGHT_PART2: '®',
        COPYRIGHT_PART3: '. All rights reserved.',
    }
});

