import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/company-list';
import CompanyService from '../services/CompanyService';
import Helper from '../common/Helper';
import { toast } from 'react-toastify';
import Backdrop from './SimpleBackdrop';
import {
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Card,
    CardContent,
    Typography,
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Edit as EditIcon,
    Mail as MailIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import UserService from '../services/UserService';

import '../assets/css/company-list.css';

class CompanyList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            keyword: props.keyword,
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            rowCount: 0,
            page: 1,
            size: Env.PAGE_SIZE,
            openDeleteDialog: false,
            companyId: '',
            companyIndex: -1
        };
    }

    handleDelete = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id');
        const companyIndex = e.currentTarget.getAttribute('data-index');

        this.setState({ openDeleteDialog: true, companyId, companyIndex });
    };

    handleCloseInfo = () => {
        this.setState({ openInfoDialog: false });
    };

    handleConfirmDelete = () => {
        const { companyId, companyIndex, rows, rowCount } = this.state;

        if (companyId !== '' && companyIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });
            CompanyService.delete(companyId)
                .then(status => {
                    if (status === 200) {
                        rows.splice(companyIndex, 1);
                        this.setState({ rows, rowCount: rowCount - 1, loading: false, companyId: '', companyIndex: -1 }, () => {
                            if (this.props.onDelete) {
                                this.props.onDelete(this.state.rowCount);
                            }
                        });
                    } else {
                        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                        this.setState({ loading: false, companyId: '', companyIndex: -1 });
                    }
                }).catch(() => {
                    UserService.signout();
                });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, companyId: '', companyIndex: -1 });
        }
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, companyId: '' });
    };

    fetch = () => {
        const { keyword, page, rows } = this.state;

        this.setState({ loading: true });
        CompanyService.getCompanies(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, loading: false, rowCount: totalRecords, fetch: _data.resultData.length > 0 }, () => {
                    if (page === 1) {
                        document.querySelector('section.company-list').scrollTo(0, 0);
                    }
                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                });
            })
            .catch(() => UserService.signout());
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const { keyword, reload } = prevState;

        if (keyword !== nextProps.keyword) {
            return { keyword: nextProps.keyword };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        const { keyword, reload } = this.state;

        if (keyword !== prevState.keyword) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (reload && !prevState.reload) {
            return this.setState({ page: 1 }, () => this.fetch());
        }
    }

    componentDidMount() {
        const div = document.querySelector('div.companies');
        if (div) {
            div.onscroll = (event) => {
                const { fetch, loading, page } = this.state;
                let offset = 0;
                if (Env.isMobile()) offset = document.querySelector('div.col-1').clientHeight;

                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + offset) >= (event.target.scrollHeight - Env.PAGE_OFFSET)) {
                    this.setState({ page: page + 1 }, () => {
                        this.fetch();
                    });
                }
            };
        }

        if (this.props.user) {
            this.setState({ user: this.props.user }, () => this.fetch());
        }
    }

    render() {
        const { user, loading, rows, openDeleteDialog } = this.state, admin = Helper.admin(user);

        return (
            <section className='company-list'>
                {rows.length === 0 ?
                    !loading &&
                    <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                    :
                    rows.map((company, index) => {
                        const edit = admin || (user && user._id === company._id);
                        const canMessage = admin || (user && user.type === Env.RECORD_TYPE.COMPANY && user._id !== company._id);
                        const canDelete = admin;

                        return (
                            <article key={company._id}>
                                <div className='company-item'>
                                    <div className='company-item-avatar'>
                                        <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                            alt={company.fullName}
                                            style={{
                                                width: Env.COMPANY_IMAGE_WIDTH,
                                            }} />
                                    </div>
                                    <span className='company-item-title'>{company.fullName}</span>
                                </div>
                                <div className='company-actions'>
                                    {canDelete &&
                                        <Tooltip title={commonStrings.DELETE}>
                                            <IconButton data-id={company._id} data-index={index} onClick={this.handleDelete}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    {canMessage &&
                                        <Tooltip title={commonStrings.SEND_MESSAGE}>
                                            <IconButton>
                                                <MailIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    {edit &&
                                        <Tooltip title={commonStrings.UPDATE}>
                                            <IconButton href={`/update-company?c=${company._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    <Tooltip title={strings.VIEW_COMPANY}>
                                        <IconButton href={`/company?c=${company._id}`}>
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                </div>
                            </article>
                        );
                    }
                    )
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_COMPANY}</DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>

                {loading && <Backdrop text={commonStrings.LOADING} />}
            </section>
        );
    }
}

export default CompanyList;