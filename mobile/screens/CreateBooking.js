import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import validator from 'validator';
import { format, intervalToDuration } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import Master from './Master';
import i18n from '../lang/i18n';
import * as UserService from '../services/UserService';
import TextInput from '../elements/TextInput';
import DateTimePicker from '../elements/DateTimePicker';
import Switch from '../elements/Switch';
import Link from '../elements/Link';
import * as Helper from '../common/Helper';
import Error from '../elements/Error';
import Button from '../elements/Button';
import RadioButton from '../elements/RadioButton';
import * as CarService from '../services/CarService';
import * as LocationService from '../services/LocationService';
import * as BookingService from '../services/BookingService';
import Env from '../config/env.config';
import Backdrop from '../elements/Backdrop';

const CreateBookingScreen = ({ navigation, route }) => {
    const isFocused = useIsFocused();
    const [reload, setReload] = useState(false);
    const [visible, setVisible] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [language, setLanguage] = useState(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState(null);
    const [tosChecked, setTosChecked] = useState(false);
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardMonth, setCardMonth] = useState('');
    const [cardYear, setCardYear] = useState('');
    const [cvv, setCardCvv] = useState('');
    const [car, setCar] = useState(null);
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropOffLocation, setDropOffLocation] = useState(null);
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [price, setPrice] = useState(0);
    const [cancellation, setCancellation] = useState(false);
    const [amendments, setAmendments] = useState(false);
    const [theftProtection, setTheftProtection] = useState(false);
    const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false);
    const [fullInsurance, setFullInsurance] = useState(false);
    const [additionalDriver, setAdditionalDriver] = useState(false);
    const [_fullName, set_FullName] = useState('');
    const [_email, set_Email] = useState('');
    const [_phone, set_Phone] = useState('');
    const [_birthDate, set_BirthDate] = useState(null);
    const [payLater, setPayLater] = useState(false);

    const [fullNameRequired, setFullNameRequired] = useState(false);
    const [emailInfo, setEmailInfo] = useState(true);
    const [emailError, setEmailError] = useState(false);
    const [emailValid, setEmailValid] = useState(true);
    const [emailRequired, setEmailRequired] = useState(false);
    const [phoneInfo, setPhoneInfo] = useState(true);
    const [phoneValid, setPhoneValid] = useState(true);
    const [phoneRequired, setPhoneRequired] = useState(false);
    const [birthDateRequired, setBirthDateRequired] = useState(false);
    const [birthDateValid, setBirthDateValid] = useState(true);
    const [tosError, setTosError] = useState(false);
    const [cardNameRequired, setCardNameRequired] = useState(false);
    const [cardNumberRequired, setCardNumberRequired] = useState(false);
    const [cardNumberValid, setCardNumberValid] = useState(true);
    const [cardMonthRequired, setCardMonthRequired] = useState(false);
    const [cardMonthValid, setCardMonthValid] = useState(true);
    const [cardYearRequired, setCardYearRequired] = useState(false);
    const [cardYearValid, setCardYearValid] = useState(true);
    const [cvvRequired, setCardCvvRequired] = useState(false);
    const [cvvValid, setCardCvvValid] = useState(true);
    const [cardDateError, setCardDateError] = useState(false);
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(true);
    const [locale, setLoacle] = useState(fr);
    const [_fullNameRequired, set_FullNameRequired] = useState(false);
    const [_emailRequired, set_EmailRequired] = useState(false);
    const [_emailValid, set_EmailValid] = useState(true);
    const [_phoneRequired, set_PhoneRequired] = useState(false);
    const [_phoneValid, set_PhoneValid] = useState(true);
    const [_birthDateRequired, set_BirthDateRequired] = useState(false);
    const [_birthDateValid, set_BirthDateValid] = useState(true);

    const fullNameRef = useRef(null);
    const emailRef = useRef(null);
    const phoneRef = useRef(null);
    const cardNameRef = useRef(null);
    const cardNumberRef = useRef(null);
    const cardMonthRef = useRef(null);
    const cardYearRef = useRef(null);
    const cvvRef = useRef(null);
    const _fullNameRef = useRef(null);
    const _emailRef = useRef(null);
    const _phoneRef = useRef(null);

    const _init = async () => {
        try {
            setVisible(false);
            setFormVisible(false);

            const language = await UserService.getLanguage();
            i18n.locale = language;
            setLanguage(language);
            setLoacle(language === Env.LANGUAGE.FR ? fr : enUS);

            setAuthenticated(false);
            setUser(null);

            let authenticated = false;
            let user = null;
            const currentUser = await UserService.getCurrentUser();

            if (currentUser) {
                let status;
                try {
                    status = await UserService.validateAccessToken();
                } catch (err) {
                    status = 403;
                }

                if (status === 200) {
                    const _user = await UserService.getUser(currentUser.id);

                    if (_user) {
                        authenticated = true;
                        user = _user;
                    }
                }
            }

            setAuthenticated(authenticated);
            setUser(user);

            if (!authenticated) {
                setFullName('');
                setEmail('');
                setPhone('');
                setBirthDate(null);
                setTosChecked(false);

                if (fullNameRef.current) fullNameRef.current.clear();
                if (emailRef.current) emailRef.current.clear();
                if (phoneRef.current) phoneRef.current.clear();
            }

            set_FullName('');
            set_Email('');
            set_Phone('');
            set_BirthDate(null);
            if (_fullNameRef.current) _fullNameRef.current.clear();
            if (_emailRef.current) _emailRef.current.clear();
            if (_phoneRef.current) _phoneRef.current.clear();

            setCardName('');
            setCardNumber('');
            setCardMonth('');
            setCardYear('');
            setCardCvv('');

            setFullNameRequired(false);
            setEmailRequired(false);
            setEmailValid(true);
            setEmailError(false);
            setPhoneRequired(false);
            setPhoneValid(true);
            setBirthDateRequired(false);
            setBirthDateValid(true);
            setBirthDateRequired(false);
            setTosError(false);
            setError(false);
            setCardNameRequired(false);
            setCardNumberRequired(false);
            setCardNumberValid(true);
            setCardYearRequired(false);
            setCardYearValid(true);
            setCardMonthRequired(false);
            setCardMonthValid(true);
            setCardCvvRequired(false);
            setCardCvvValid(true);
            setPayLater(false);
            setSuccess(false);

            if (cardNameRef.current) cardNameRef.current.clear();
            if (cardNumberRef.current) cardNumber.current.clear();
            if (cardMonthRef.current) cardMonthRef.current.clear();
            if (cardYearRef.current) cardYearRef.current.clear();
            if (cvvRef.current) cvvRef.current.clear();

            if (!route.params
                || !route.params.car
                || !route.params.pickupLocation
                || !route.params.dropOffLocation
                || !route.params.from
                || !route.params.to
            ) {
                await UserService.signout(navigation);
                return;
            }

            const car = await CarService.getCar(route.params.car);
            setCar(car);

            const pickupLocation = await LocationService.getLocation(route.params.pickupLocation);
            setPickupLocation(pickupLocation);

            if (route.params.dropOffLocation !== route.params.pickupLocation) {
                const dropOffLocation = await LocationService.getLocation(route.params.dropOffLocation);
                setDropOffLocation(dropOffLocation);
            } else {
                setDropOffLocation(pickupLocation);
            }

            const _from = new Date(route.params.from);
            setFrom(_from);

            const _to = new Date(route.params.to);
            setTo(_to);

            const _price = Helper.price(car, _from, _to);
            setPrice(_price);

            const included = (val) => val === 0;

            setCancellation(included(car.cancellation));
            setAmendments(included(car.amendments));
            setCollisionDamageWaiver(included(car.collisionDamageWaiver));
            setTheftProtection(included(car.theftProtection));
            setFullInsurance(included(car.fullInsurance));
            setAdditionalDriver(included(car.additionalDriver));

            setVisible(true);
            setFormVisible(true);
        } catch (err) {
            await UserService.signout(navigation);
        }
    };

    useEffect(() => {
        if (isFocused) {
            _init();
            setReload(true);
        } else {
            setVisible(false);
        }
    }, [route.params, isFocused]);

    const onLoad = (user) => {
        setReload(false);
    };

    const validateFullName = () => {
        const valid = fullName !== '';
        setFullNameRequired(!valid);
        setError(!valid);
        return valid;
    };

    const _validateFullName = () => {
        const valid = _fullName !== '';
        set_FullNameRequired(!valid);
        setError(!valid);
        return valid;
    };

    const onChangeFullName = (text) => {
        setFullName(text);
        setFullNameRequired(false);
        setError(false);
    };

    const validateEmail = async () => {
        if (email) {
            setEmailRequired(false);

            if (validator.isEmail(email)) {
                try {
                    const status = await UserService.validateEmail({ email });
                    if (status === 200) {
                        setEmailInfo(true);
                        setEmailError(false);
                        setEmailValid(true);
                        setError(false);
                        return true;
                    } else {
                        setEmailInfo(false);
                        setEmailError(true);
                        setEmailValid(true);
                        setError(true);
                        return false;
                    }
                } catch (err) {
                    Helper.error(err);
                    setEmailInfo(true);
                    setEmailError(false);
                    setEmailValid(true);
                    setError(false);
                    return false;
                }
            } else {
                setEmailError(false);
                setEmailValid(false);
                setError(true);
                return false;
            }
        } else {
            setEmailInfo(false);
            setEmailRequired(true);
            setEmailError(false);
            setEmailValid(true);
            setError(true);
            return false;
        }
    };

    const _validateEmail = () => {
        if (_email) {
            set_EmailRequired(false);

            if (validator.isEmail(_email)) {
                set_EmailValid(true);
                setError(false);
                return true;
            } else {
                set_EmailValid(false);
                setError(true);
                return false;
            }
        } else {
            set_EmailRequired(true);
            set_EmailValid(true);
            setError(true);
            return false;
        }
    };

    const onChangeEmail = (text) => {
        setEmail(text);
        setEmailInfo(true);
        setEmailRequired(false);
        setEmailValid(true);
        setEmailError(false);
        setError(false);
    };

    const validatePhone = () => {
        if (phone) {
            const phoneValid = validator.isMobilePhone(phone);
            setPhoneInfo(phoneValid);
            setPhoneRequired(false);
            setPhoneValid(phoneValid);
            setError(!phoneValid);

            return phoneValid;
        } else {
            setPhoneInfo(false);
            setPhoneRequired(true);
            setPhoneValid(true);
            setError(true);

            return false;
        }
    };

    const _validatePhone = () => {
        if (_phone) {
            const phoneValid = validator.isMobilePhone(_phone);
            set_PhoneRequired(false);
            set_PhoneValid(phoneValid);
            setError(!phoneValid);

            return phoneValid;
        } else {
            set_PhoneRequired(true);
            set_PhoneValid(true);
            setError(true);

            return false;
        }
    };

    const onChangePhone = (text) => {
        setPhone(text);
        setPhoneInfo(true);
        setPhoneRequired(false);
        setPhoneValid(true);
        setError(false);
    };

    const validateBirthDate = () => {
        if (birthDate) {
            setBirthDateRequired(false);

            const sub = intervalToDuration({ start: birthDate, end: new Date() }).years;
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            setBirthDateValid(birthDateValid);
            setError(!birthDateValid);
            return birthDateValid;
        } else {
            setBirthDateRequired(true);
            setBirthDateValid(true);
            setError(true);

            return false;
        }
    };

    const _validateBirthDate = () => {
        if (_birthDate) {
            set_BirthDateRequired(false);

            const sub = intervalToDuration({ start: _birthDate, end: new Date() }).years;
            const birthDateValid = sub >= Env.MINIMUM_AGE;

            set_BirthDateValid(birthDateValid);
            setError(!birthDateValid);
            return birthDateValid;
        } else {
            set_BirthDateRequired(true);
            set_BirthDateValid(true);
            setError(true);

            return false;
        }
    };

    const onChangeBirthDate = (date) => {
        setBirthDate(date);
        setBirthDateRequired(false);
        setBirthDateValid(true);
        setError(false);
    };

    const onChangeToS = (checked) => {
        setTosChecked(checked);
        if (checked) setTosError(false);
    };

    const validateCardName = () => {
        if (cardName) {
            setCardNameRequired(false);
            return true;
        } else {
            setCardNameRequired(true);
            return false;
        }
    };

    const onCardNameChange = (text) => {
        setCardName(text);
        setCardNameRequired(false);
    };

    const validateCardNumber = () => {
        if (cardNumber) {
            const cardNumberValid = validator.isCreditCard(cardNumber);
            setCardNumberRequired(false);
            setCardNumberValid(cardNumberValid);

            return cardNumberValid;
        } else {
            setCardNumberRequired(true);
            setCardNumberValid(true);

            return false;
        }
    };

    const onCardNumberChange = (text) => {
        setCardNumber(text);
        setCardNumberRequired(false);
        setCardNumberValid(true);
    };

    const validateCardMonth = () => {
        if (cardMonth) {
            const month = parseInt(cardMonth);
            const cardMonthValid = month >= 1 && month <= 12;

            setCardMonthRequired(false);
            setCardMonthValid(cardMonthValid);
            setCardDateError(false);

            return cardMonthValid;
        } else {
            setCardMonthRequired(true);
            setCardMonthValid(true);
            setCardDateError(false);

            return false;
        }
    };

    const onCardMonthChange = (text) => {
        setCardMonth(text);
        setCardMonthRequired(false);
        setCardMonthValid(true);
    };

    const validateCardYear = () => {
        if (cardYear) {
            const year = parseInt(cardYear);
            const currentYear = parseInt(new Date().getFullYear().toString().slice(2));
            const cardYearValid = year >= currentYear;

            setCardYearRequired(false);
            setCardYearValid(cardYearValid);
            setCardDateError(false);

            return cardYearValid;
        } else {
            setCardYearRequired(true);
            setCardYearValid(true);
            setCardDateError(false);

            return false;
        }
    };

    const onCardYearChange = (text) => {
        setCardYear(text);
        setCardYearRequired(false);
        setCardYearValid(true);
    };

    const validateCvv = () => {
        if (cvv) {
            const cvvValid = Helper.isCvv(cvv);
            setCardCvvRequired(false);
            setCardCvvValid(cvvValid);

            return cvvValid;
        } else {
            setCardCvvRequired(true);
            setCardCvvValid(true);

            return false;
        }
    };

    const onCardCvvChange = (text) => {
        setCardCvv(text);
        setCardCvvRequired(false);
        setCardCvvValid(true);
    };

    const validateCardDate = (cardMonth, cardYear) => {
        const today = new Date(), cardDate = new Date();
        const y = parseInt(today.getFullYear().toString().slice(0, 2)) * 100;
        const year = y + parseInt(cardYear);
        const month = parseInt(cardMonth);
        cardDate.setFullYear(year, month - 1, 1);

        if (cardDate < today) {
            return false;
        }

        return true;
    };

    const onCancellationChange = (checked) => {
        const options = { cancellation: checked, amendments, collisionDamageWaiver, theftProtection, fullInsurance, additionalDriver };
        const price = Helper.price(car, from, to, options)
        setCancellation(checked);
        setPrice(price);
    };

    const onAmendmentsChange = (checked) => {
        const options = { cancellation, amendments: checked, collisionDamageWaiver, theftProtection, fullInsurance, additionalDriver };
        const price = Helper.price(car, from, to, options)
        setAmendments(checked);
        setPrice(price);
    };

    const onCollisionDamageWaiverChange = (checked) => {
        const options = { cancellation, amendments, collisionDamageWaiver: checked, theftProtection, fullInsurance, additionalDriver };
        const price = Helper.price(car, from, to, options)
        setCollisionDamageWaiver(checked);
        setPrice(price);
    };

    const onTheftProtectionChange = (checked) => {
        const options = { cancellation, amendments, collisionDamageWaiver, theftProtection: checked, fullInsurance, additionalDriver };
        const price = Helper.price(car, from, to, options)
        setTheftProtection(checked);
        setPrice(price);
    };

    const onFullInsuranceChange = (checked) => {
        const options = { cancellation, amendments, collisionDamageWaiver, theftProtection, fullInsurance: checked, additionalDriver };
        const price = Helper.price(car, from, to, options)
        setFullInsurance(checked);
        setPrice(price);
    };

    const onAdditionalDriverChange = (checked) => {
        const options = { cancellation, amendments, collisionDamageWaiver, theftProtection, fullInsurance, additionalDriver: checked };
        const price = Helper.price(car, from, to, options)
        setAdditionalDriver(checked);
        setPrice(price);
    };

    const _error = (err) => {
        Helper.error(err);
        setLoading(false);
    };

    const onPressBook = async () => {

        if (!authenticated) {

            fullNameRef.current.blur();
            emailRef.current.blur();
            phoneRef.current.blur();

            const fullNameValid = validateFullName();
            if (!fullNameValid) {
                return;
            }

            const emailValid = await validateEmail();
            if (!emailValid) {
                return;
            }

            const phoneValid = validatePhone();
            if (!phoneValid) {
                return;
            }

            const birthDateValid = validateBirthDate();
            if (!birthDateValid) {
                return;
            }

            if (!tosChecked) {
                return setTosError(true);
            }
        }

        if (additionalDriver) {
            const fullNameValid = _validateFullName();
            if (!fullNameValid) {
                return;
            }

            const emailValid = _validateEmail();
            if (!emailValid) {
                return;
            }

            const phoneValid = _validatePhone();
            if (!phoneValid) {
                return;
            }

            const birthDateValid = _validateBirthDate();
            if (!birthDateValid) {
                return;
            }
        }

        if (!payLater) {
            const cardNameValid = validateCardName();
            if (!cardNameValid) {
                return;
            }

            const cardNumberValid = validateCardNumber();
            if (!cardNumberValid) {
                return;
            }

            const cardMonthValid = validateCardMonth();
            if (!cardMonthValid) {
                return;
            }

            const cardYearValid = validateCardYear();
            if (!cardYearValid) {
                return;
            }

            const cvvValid = validateCvv();
            if (!cvvValid) {
                return;
            }

            const cardDateValid = validateCardDate(cardMonth, cardYear);
            if (!cardDateValid) {
                return setCardDateError(true);
            }
        }

        setLoading(true);

        let booking, driver, _additionalDriver;

        if (!authenticated) {
            const language = await UserService.getLanguage();
            driver = { email, phone, fullName, birthDate, language };
        }

        booking = {
            company: car.company._id,
            car: car._id,
            driver: authenticated ? user._id : undefined,
            pickupLocation: pickupLocation._id,
            dropOffLocation: dropOffLocation._id,
            from: from,
            to: to,
            status: payLater ? Env.BOOKING_STATUS.PENDING : Env.BOOKING_STATUS.PAID,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver,
            price
        };

        if (additionalDriver) {
            _additionalDriver = {
                fullName: _fullName,
                email: _email,
                phone: _phone,
                birthDate: _birthDate
            };
        }

        const payload = { driver, booking, additionalDriver: _additionalDriver, payLater };

        BookingService.book(payload)
            .then(status => {
                if (status === 200) {
                    setLoading(false);
                    setFormVisible(false);
                    setSuccess(true);
                } else {
                    _error(err);
                }
            })
            .catch((err) => {
                _error(err);
            });
    };

    const iconSize = 18;
    const iconColor = '#000';
    const _format = 'eee d LLLL yyyy kk:mm';
    const _fr = language === Env.LANGUAGE.FR;
    const days = Helper.days(from, to);

    return (
        <Master style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} route={route}>
            {visible &&
                <>
                    {
                        formVisible &&
                        <ScrollView
                            contentContainerStyle={styles.container}
                            keyboardShouldPersistTaps='handled'
                            nestedScrollEnabled
                        >
                            <View style={styles.contentContainer}>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name='event-seat' size={iconSize} color={iconColor} />
                                        <Text style={styles.sectionHeaderText}>{i18n.t('BOOKING_OPTIONS')}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.cancellation === -1 || car.cancellation === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('CANCELLATION')}
                                            value={cancellation}
                                            onValueChange={onCancellationChange} />
                                        <Text style={styles.extraText}>{Helper.getCancellationOption(car.cancellation, _fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.amendments === -1 || car.amendments === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('AMENDMENTS')}
                                            value={amendments}
                                            onValueChange={onAmendmentsChange} />
                                        <Text style={styles.extraText}>{Helper.getAmendmentsOption(car.amendments, _fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.collisionDamageWaiver === -1 || car.collisionDamageWaiver === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('COLLISION_DAMAGE_WAVER')}
                                            value={collisionDamageWaiver}
                                            onValueChange={onCollisionDamageWaiverChange} />
                                        <Text style={styles.extraText}>{Helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, _fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.theftProtection === -1 || car.theftProtection === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('THEFT_PROTECTION')}
                                            value={theftProtection}
                                            onValueChange={onTheftProtectionChange} />
                                        <Text style={styles.extraText}>{Helper.getTheftProtectionOption(car.theftProtection, days, _fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.fullInsurance === -1 || car.fullInsurance === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('FULL_INSURANCE')}
                                            value={fullInsurance}
                                            onValueChange={onFullInsuranceChange} />
                                        <Text style={styles.extraText}>{Helper.getFullInsuranceOption(car.fullInsurance, days, _fr)}</Text>
                                    </View>

                                    <View style={styles.extra}>
                                        <Switch
                                            disabled={car.additionalDriver === -1 || car.additionalDriver === 0}
                                            textStyle={styles.extraSwitch}
                                            label={i18n.t('ADDITIONAL_DRIVER')}
                                            value={additionalDriver}
                                            onValueChange={onAdditionalDriverChange} />
                                        <Text style={styles.extraText}>{Helper.getAdditionalDriverOption(car.additionalDriver, days, _fr)}</Text>
                                    </View>

                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <MaterialIcons name='directions-car' size={iconSize} color={iconColor} />
                                        <Text style={styles.sectionHeaderText}>{i18n.t('BOOKING_DETAILS')}</Text>
                                    </View>

                                    <Text style={styles.detailTitle}>{i18n.t('DAYS')}</Text>
                                    <Text style={styles.detailText}>
                                        {`${Helper.getDaysShort(Helper.days(from, to))} (${Helper.capitalize(format(from, _format, { locale }))} - ${Helper.capitalize(format(to, _format, { locale }))})`}
                                    </Text>

                                    <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                                    <Text style={styles.detailText}>{pickupLocation.name}</Text>

                                    <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                                    <Text style={styles.detailText}>{dropOffLocation.name}</Text>

                                    <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
                                    <Text style={styles.detailText}>{`${car.name} (${car.price} ${i18n.t('CAR_CURRENCY')})`}</Text>

                                    <Text style={styles.detailTitle}>{i18n.t('SUPPLIER')}</Text>
                                    <View style={styles.company}>
                                        <Image style={styles.companyImg} source={{ uri: Helper.joinURL(Env.CDN_USERS, car.company.avatar) }} />
                                        <Text style={styles.companyText}>{car.company.fullName}</Text>
                                    </View>

                                    <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
                                    <Text style={styles.detailTextBold}>{`${price} ${i18n.t('CURRENCY')}`}</Text>
                                </View>

                                {
                                    !authenticated &&
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name='person' size={iconSize} color={iconColor} />
                                            <Text style={styles.sectionHeaderText}>{i18n.t('DRIVER_DETAILS')}</Text>
                                        </View>

                                        <TextInput
                                            ref={fullNameRef}
                                            style={styles.component}
                                            label={i18n.t('FULL_NAME')}
                                            value={fullName}
                                            error={fullNameRequired}
                                            helperText={(fullNameRequired && i18n.t('REQUIRED')) || ''}
                                            onChangeText={onChangeFullName}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <TextInput
                                            ref={emailRef}
                                            style={styles.component}
                                            label={i18n.t('EMAIL')}
                                            value={email}
                                            error={emailRequired || !emailValid || emailError}
                                            helperText={
                                                ((emailInfo && i18n.t('EMAIL_INFO')) || '')
                                                || ((emailRequired && i18n.t('REQUIRED')) || '')
                                                || ((!emailValid && i18n.t('EMAIL_NOT_VALID')) || '')
                                                || ((emailError && i18n.t('BOOKING_EMAIL_ALREADY_REGISTERED')) || '')
                                            }
                                            onChangeText={onChangeEmail}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <TextInput
                                            ref={phoneRef}
                                            style={styles.component}
                                            label={i18n.t('PHONE')}
                                            value={phone}
                                            error={phoneRequired || !phoneValid}
                                            helperText={
                                                ((phoneInfo && i18n.t('PHONE_INFO')) || '')
                                                || ((phoneRequired && i18n.t('REQUIRED')) || '')
                                                || ((!phoneValid && i18n.t('PHONE_NOT_VALID')) || '')
                                            }
                                            onChangeText={onChangePhone}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <DateTimePicker
                                            mode='date'
                                            locale={language}
                                            style={styles.date}
                                            label={i18n.t('BIRTH_DATE')}
                                            value={birthDate}
                                            error={birthDateRequired || !birthDateValid}
                                            helperText={
                                                ((birthDateRequired && i18n.t('REQUIRED')) || '')
                                                || ((!birthDateValid && Helper.getBirthDateError(car.minimumAge)) || '')
                                            }
                                            onChange={onChangeBirthDate}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <Switch
                                            style={styles.component}
                                            textStyle={styles.tosText}
                                            label={i18n.t('ACCEPT_TOS')}
                                            value={tosChecked}
                                            onValueChange={onChangeToS} />
                                    </View>
                                }

                                {
                                    additionalDriver &&
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name='person' size={iconSize} color={iconColor} />
                                            <Text style={styles.sectionHeaderText}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                                        </View>

                                        <TextInput
                                            ref={_fullNameRef}
                                            style={styles.component}
                                            label={i18n.t('FULL_NAME')}
                                            value={_fullName}
                                            error={_fullNameRequired}
                                            helperText={(_fullNameRequired && i18n.t('REQUIRED')) || ''}
                                            onChangeText={(text) => {
                                                set_FullName(text);
                                                set_FullNameRequired(false);
                                                setError(false);
                                            }}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <TextInput
                                            ref={_emailRef}
                                            style={styles.component}
                                            label={i18n.t('EMAIL')}
                                            value={_email}
                                            error={_emailRequired || !_emailValid}
                                            helperText={
                                                ((_emailRequired && i18n.t('REQUIRED')) || '')
                                                || ((!_emailValid && i18n.t('EMAIL_NOT_VALID')) || '')
                                            }
                                            onChangeText={(text) => {
                                                set_Email(text);
                                                set_EmailRequired(false);
                                                set_EmailValid(true);
                                                setError(false);
                                            }}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <TextInput
                                            ref={_phoneRef}
                                            style={styles.component}
                                            label={i18n.t('PHONE')}
                                            value={_phone}
                                            error={_phoneRequired || !_phoneValid}
                                            helperText={
                                                ((_phoneRequired && i18n.t('REQUIRED')) || '')
                                                || ((!_phoneValid && i18n.t('PHONE_NOT_VALID')) || '')
                                            }
                                            onChangeText={(text) => {
                                                set_Phone(text);
                                                set_PhoneRequired(false);
                                                set_PhoneValid(true);
                                                setError(false);
                                            }}
                                            backgroundColor='#fbfbfb'
                                        />

                                        <DateTimePicker
                                            mode='date'
                                            locale={language}
                                            style={styles.date}
                                            label={i18n.t('BIRTH_DATE')}
                                            value={_birthDate}
                                            error={_birthDateRequired || !_birthDateValid}
                                            helperText={
                                                ((_birthDateRequired && i18n.t('REQUIRED')) || '')
                                                || ((!_birthDateValid && Helper.getBirthDateError(car.minimumAge)) || '')
                                            }
                                            onChange={(date) => {
                                                set_BirthDate(date);
                                                set_BirthDateRequired(false);
                                                set_BirthDateValid(true);
                                                setError(false);
                                            }}
                                            backgroundColor='#fbfbfb'
                                        />
                                    </View>
                                }

                                {
                                    car.company.payLater &&
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name='settings' size={iconSize} color={iconColor} />
                                            <Text style={styles.sectionHeaderText}>{i18n.t('PAYMENT_OPTIONS')}</Text>
                                        </View>

                                        <RadioButton label={i18n.t('PAY_LATER')} checked={payLater} onValueChange={(checked) => {
                                            setPayLater(checked);
                                        }} />
                                        <Text style={styles.paymentInfo}>{i18n.t('PAY_LATER_INFO')}</Text>

                                        <RadioButton label={i18n.t('PAY_ONLINE')} checked={!payLater} onValueChange={(checked) => {
                                            setPayLater(!checked);
                                        }} />
                                        <Text style={styles.paymentInfo}>{i18n.t('PAY_ONLINE_INFO')}</Text>
                                    </View>
                                }

                                {
                                    (!car.company.payLater || !payLater) &&
                                    <View style={styles.payment}>

                                        <View style={styles.paymentHeader}>
                                            <View style={styles.securePaymentInfo}>
                                                <MaterialIcons name='lock' size={iconSize} color='#1c8901' />
                                                <Text style={styles.securePaymentInfoText}>{i18n.t('PAYMENT')}</Text>
                                            </View>

                                            <View style={styles.securePaymentInfo}>
                                                <Text style={styles.totalText}>{i18n.t('COST')}</Text>
                                                <Text style={styles.costText}>{`${price} ${i18n.t('CURRENCY')}`}</Text>
                                            </View>
                                        </View>

                                        <Image source={require('../assets/secure-payment.png')} style={styles.paymentImage} />

                                        <TextInput
                                            ref={cardNameRef}
                                            style={styles.component}
                                            label={i18n.t('CARD_NAME')}
                                            value={cardName}
                                            error={cardNameRequired}
                                            helperText={
                                                ((cardNameRequired && i18n.t('REQUIRED')) || '')
                                            }
                                            backgroundColor='#e5efe5'
                                            onChangeText={onCardNameChange}
                                        />

                                        <TextInput
                                            ref={cardNumberRef}
                                            style={styles.component}
                                            label={i18n.t('CARD_NUMBER')}
                                            keyboardType='numeric'
                                            maxLength={16}
                                            value={cardNumber}
                                            error={cardNumberRequired || !cardNumberValid}
                                            helperText={
                                                ((cardNumberRequired && i18n.t('REQUIRED')) || '')
                                                || ((!cardNumberValid && i18n.t('CARD_NUMBER_NOT_VALID')) || '')
                                            }
                                            backgroundColor='#e5efe5'
                                            onChangeText={onCardNumberChange}
                                        />

                                        <TextInput
                                            ref={cardMonthRef}
                                            style={styles.component}
                                            label={i18n.t('CARD_MONTH')}
                                            keyboardType='numeric'
                                            maxLength={2}
                                            value={cardMonth}
                                            error={cardMonthRequired || !cardMonthValid}
                                            helperText={
                                                ((cardMonthRequired && i18n.t('REQUIRED')) || '')
                                                || ((!cardMonthValid && i18n.t('CARD_MONTH_NOT_VALID')) || '')
                                            }
                                            backgroundColor='#e5efe5'
                                            onChangeText={onCardMonthChange}
                                        />

                                        <TextInput
                                            ref={cardYearRef}
                                            style={styles.component}
                                            label={i18n.t('CARD_YEAR')}
                                            keyboardType='numeric'
                                            maxLength={2}
                                            value={cardYear}
                                            error={cardYearRequired || !cardYearValid}
                                            helperText={
                                                ((cardYearRequired && i18n.t('REQUIRED')) || '')
                                                || ((!cardYearValid && i18n.t('CARD_YEAR_NOT_VALID')) || '')
                                            }
                                            backgroundColor='#e5efe5'
                                            onChangeText={onCardYearChange}
                                        />

                                        <TextInput
                                            ref={cvvRef}
                                            style={styles.component}
                                            keyboardType='numeric'
                                            maxLength={4}
                                            label={i18n.t('CVV')}
                                            value={cvv}
                                            error={cvvRequired || !cvvValid}
                                            helperText={
                                                ((cvvRequired && i18n.t('REQUIRED')) || '')
                                                || ((!cvvValid && i18n.t('CVV_NOT_VALID')) || '')
                                            }
                                            backgroundColor='#e5efe5'
                                            onChangeText={onCardCvvChange}
                                        />

                                        <View style={styles.securePaymentInfo}>
                                            <MaterialIcons name='lock' size={iconSize} color='#1c8901' />
                                            <Text style={styles.securePaymentInfoText}>{i18n.t('SECURE_PAYMENT_INFO')}</Text>
                                        </View>

                                    </View>
                                }
                                <View style={styles.footer}>

                                    <Button style={styles.component} label={i18n.t('BOOK_NOW')} onPress={onPressBook} />

                                    <View style={styles.error}>
                                        {error && <Error message={i18n.t('FIX_ERRORS')} />}
                                        {cardDateError && <Error message={i18n.t('CARD_DATE_ERROR')} />}
                                        {tosError && <Error message={i18n.t('TOS_ERROR')} />}
                                    </View>
                                </View>

                            </View>
                        </ScrollView>
                    }
                    {success &&
                        <View style={styles.sucess}>
                            <Text style={styles.sucessText}>{payLater ? i18n.t('PAY_LATER_SUCCESS') : i18n.t('BOOKING_SUCCESS')}</Text>
                            <Link style={styles.sucessLink} label={i18n.t('GO_TO_HOME')} onPress={() => {
                                navigation.navigate('Home');
                            }} />
                        </View>
                    }
                    {loading && <Backdrop message={i18n.t('PLEASE_WAIT')} />}
                </>
            }
        </Master>
    );
};

const styles = StyleSheet.create({
    master: {
        flex: 1,
        backgroundColor: '#fafafa'
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1
    },
    contentContainer: {
        width: '100%',
        maxWidth: 480,
        alignItems: 'center'
    },
    section: {
        alignSelf: 'stretch',
        backgroundColor: '#fbfbfb',
        borderWidth: 1,
        borderColor: '#d9d8d9',
        borderRadius: 5,
        marginTop: 15,
        marginRight: 10,
        marginLeft: 10,
        padding: 25
    },
    sectionHeader: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15
    },
    sectionHeaderText: {
        color: '#444',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 5
    },
    extra: {
        flexDirection: 'column',
    },
    extraSwitch: {
        fontWeight: '600',
        fontSize: 13
    },
    extraText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 12,
        flex: 1,
        flexWrap: 'wrap',
        marginLeft: 53,
        marginTop: -3
    },
    detailTitle: {
        alignSelf: 'stretch',
        alignItems: 'center',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    detailText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 12,
        marginBottom: 10
    },
    detailTextBold: {
        fontSize: 15,
        fontWeight: '700'
    },
    company: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center'
    },
    companyImg: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT,
    },
    companyText: {
        color: '#a1a1a1',
        fontSize: 10,
        marginLeft: 5
    },
    component: {
        alignSelf: 'stretch',
        marginBottom: 10
    },
    tosText: {
        fontSize: 12
    },
    date: {
        alignSelf: 'stretch',
        marginBottom: 25,
    },
    paymentInfo: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontSize: 12,
        marginLeft: 25
    },
    payment: {
        alignSelf: 'stretch',
        backgroundColor: '#e5efe5',
        borderWidth: 1,
        borderColor: '#d9d8d9',
        borderRadius: 5,
        marginTop: 45,
        marginRight: 10,
        marginLeft: 10,
        padding: 25,
        justifyContent: 'center',
        alignItems: 'center'
    },
    paymentHeader: {
        alignSelf: 'stretch',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#1c8901',
        borderRadius: 5,
        marginTop: -58,
        marginBottom: 15,
        padding: 5
    },
    paymentImage: {
        marginBottom: 15
    },
    securePaymentInfo: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 3
    },
    securePaymentInfoText: {
        fontSize: 13,
        color: '#1c8901',
        marginLeft: 5
    },
    totalText: {
        color: '#1c8901',
        fontSize: 22,
        fontWeight: '700',
        marginRight: 7
    },
    costText: {
        color: '#1c8901',
        fontSize: 22,
        fontWeight: '700'
    },
    footer: {
        alignSelf: 'stretch',
        marginTop: 15,
        marginRight: 10,
        marginBottom: 40,
        marginLeft: 10,
        alignItems: 'center'
    },
    sucess: {
        margin: 10,
    },
    sucessText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.8)',
        marginBottom: 10
    },
    sucessLink: {
        fontSize: 14
    },
    error: {
        marginTop: 10
    }
});

export default CreateBookingScreen;