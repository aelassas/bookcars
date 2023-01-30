import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import * as Helper from '../common/Helper';
import Env from '../config/env.config';
import i18n from '../lang/i18n';
import * as CompanyService from '../services/CompanyService';
import Link from './Link';
import Switch from './Switch';
import Accordion from './Accordion';

const CompanyFilter = (props) => {
    const [companies, setCompanies] = useState([]);
    const [checkedCompanies, setCheckedCompanies] = useState([]);
    const [allChecked, setAllChecked] = useState(true);

    const init = async () => {
        try {
            const allCompanies = await CompanyService.getAllCompanies();
            const companies = allCompanies.map((company) => ({ ...company, checked: true }));
            const checkedCompanies = Helper.flattenCompanies(companies);
            setCompanies(companies);
            setCheckedCompanies(checkedCompanies);
            if (props.onLoad) props.onLoad(checkedCompanies);
        } catch (err) {
            Helper.error(err);
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        companies.length > 0 && props.visible &&
        <View style={{ ...styles.container, ...props.style }}>
            <Accordion style={styles.accordion} title={i18n.t('SUPPLIER')}>
                <View style={styles.companies}>
                    {companies.map((company, index) => (
                        <View key={company._id} style={styles.company}>
                            <Switch
                                value={company.checked}
                                onValueChange={(checked) => {
                                    if (checked) {
                                        company.checked = true;
                                        setCompanies(Helper.clone(companies));
                                        checkedCompanies.push(company._id);

                                        if (checkedCompanies.length === companies.length) {
                                            setAllChecked(true);
                                        }
                                    } else {
                                        company.checked = false;
                                        setCompanies(Helper.clone(companies));
                                        const index = checkedCompanies.indexOf(company._id);
                                        checkedCompanies.splice(index, 1);

                                        if (checkedCompanies.length === 0) {
                                            setAllChecked(false);
                                        }
                                    }

                                    if (props.onChange) {
                                        props.onChange(Helper.clone(checkedCompanies));
                                    }
                                }}
                            >
                                <Image
                                    style={styles.image}
                                    source={{ uri: Helper.joinURL(Env.CDN_USERS, company.avatar) }}
                                />
                            </Switch>
                        </View>
                    )
                    )}
                    <Link style={styles.link} textStyle={styles.linkText} label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')} onPress={() => {

                        let _checkedCompanies = [];
                        if (allChecked) {
                            companies.forEach((company) => {
                                company.checked = false;
                            });
                            setAllChecked(false);
                            setCompanies(Helper.clone(companies));
                            setCheckedCompanies(_checkedCompanies);
                        } else {
                            companies.forEach((company) => {
                                company.checked = true;
                            });
                            setAllChecked(true);
                            setCompanies(Helper.clone(companies));
                            _checkedCompanies = Helper.clone(Helper.flattenCompanies(companies));
                            setCheckedCompanies(_checkedCompanies);

                            if (props.onChange) {
                                props.onChange(_checkedCompanies);
                            }
                        }
                    }} />
                </View>
            </Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    accordion: {
        width: '100%',
        maxWidth: 480
    },
    companies: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        width: 300,
    },
    company: {
        width: '50%',
        marginBottom: 7
    },
    image: {
        width: Env.COMPANY_IMAGE_WIDTH,
        height: Env.COMPANY_IMAGE_HEIGHT
    },
    link: {
        marginTop: 10
    },
    linkText: {
        fontSize: 12
    }
});

export default CompanyFilter;