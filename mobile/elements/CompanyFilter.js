import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';

export default function CompanyFilter(props) {
    const [companies, setCompanies] = useState([]);
    const [checkedCompanies, setCheckedCompanies] = useState([]);

    const init = async () => {
        try {
            const companies = await CompanyService.getAllCompanies();
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
        <View>

        </View>
    );
}