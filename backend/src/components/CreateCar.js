import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/create-car';
import CompanyService from '../services/CompanyService';
// import CarService from '../services/CarService';
import { toast } from 'react-toastify';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import MultipleSelect from '../elements/MultipleSelect';
import LocationList from '../elements/LocationList';
import {
    Input,
    InputLabel,
    FormControl,
    Button,
    Paper
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/create-car.css';

export default class CreateCar extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            isLoading: false,
            visible: false,
            error: false,
            avatarError: false,
            avatarSizeError: false,
            avatar: null,
            companies: [],
            company: '',
            locations: [],
        };
    }

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onAvatarChange = (avatar) => {
        this.setState({ isLoading: false, avatar });
        if (avatar !== null) {
            this.setState({ avatarError: false });
        }
    };

    onAvatarValidate = (valid) => {
        if (!valid) {
            this.setState({
                avatarSizeError: true,
                avatarError: false,
                error: false,
                isLoading: false,
            });
        } else {
            this.setState({
                avatarSizeError: false,
                avatarError: false,
                error: false,
            });
        }
    };

    handleSubmit = (e) => {
        e.preventDefault();

        if (!this.state.avatar) {
            this.setState({
                avatarError: true,
                avatarSizeError: false,
                error: false
            });
            return;
        }
    }

    handleCompanySelected = (values, key, reference) => {
        if (values.length > 0) {
            this.setState({ company: values[0]._id });
        } else {
            this.setState({ company: '' });
        }
        console.log(values);
    };

    handleLocationsSelected = (values) => {
        this.setState({ locations: values });
        console.log(values);
    };

    getCompanies = (data) => {
        const result = [];
        for (const { _id, fullName, avatar } of data) {
            result.push({ _id, name: fullName, image: avatar });
        }
        return result;
    };

    onLoad = (user) => {
        this.setState({ user, visible: true }, _ => {
            if (user.type === Env.RECORD_TYPE.ADMIN) {
                CompanyService.getCompanies()
                    .then(data => {
                        const companies = this.getCompanies(data);
                        this.setState({ companies });
                    })
                    .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { visible,
            companies,
            error,
            avatarError,
            avatarSizeError,
            isLoading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-car'>
                    <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="car-form-title"> {strings.NEW_CAR_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.CAR}
                                mode='create'
                                record={null}
                                size='large'
                                readonly={false}
                                onBeforeUpload={this.onBeforeUpload}
                                onChange={this.onAvatarChange}
                                onValidate={this.onAvatarValidate}
                                color='disabled'
                                className='avatar-ctn'
                            // width={Env.CAR_IMAGE_WIDTH}
                            // height={Env.CAR_IMAGE_HEIGHT} 
                            />

                            <div className='image-info'>
                                <InfoIcon />
                                <label>
                                    {strings.RECOMMENDED_IMAGE_SIZE}
                                </label>
                            </div>

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.NAME}</InputLabel>
                                <Input
                                    type="text"
                                    required
                                    autoComplete="off"
                                />
                            </FormControl>

                            <MultipleSelect
                                label={strings.COMPANY}
                                callbackFromMultipleSelect={this.handleCompanySelected}
                                options={companies}
                                loading={false}
                                required={true}
                                multiple={false}
                                type={Env.RECORD_TYPE.COMPANY}
                                variant='standard'
                            />

                            <LocationList
                                label={strings.LOCATIONS}
                                required={true}
                                multiple={true}
                                variant='standard'
                                onSelected={this.handleLocationsSelected}
                            />

                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary'
                                    size="small"
                                >
                                    {commonStrings.CREATE}
                                </Button>
                                <Button
                                    variant="contained"
                                    className='btn-secondary'
                                    size="small"
                                    href='/cars'
                                >
                                    {commonStrings.CANCEL}
                                </Button>
                            </div>

                            <div className="form-error">
                                {error && <Error message={commonStrings.GENERIC_ERROR} />}
                                {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                {avatarSizeError && <Error message={strings.CAR_IMAGE_SIZE_ERROR} />}
                            </div>
                        </form>

                    </Paper>
                </div>
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}