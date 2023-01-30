import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/company-list';
import * as CompanyService from '../services/CompanyService';
import * as Helper from '../common/Helper';
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
    Delete as DeleteIcon
} from '@mui/icons-material';
import * as UserService from '../services/UserService';

import '../assets/css/company-list.css';

const CompanyList = (props) => {
    const [keyword, setKeyword] = useState(props.keyword);
    const [reload, setReload] = useState(false);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [page, setPage] = useState(1);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [companyId, setCompanyId] = useState('');
    const [companyIndex, setCompanyIndex] = useState(-1);

    useEffect(() => {
        setOffset(props.offset);
    }, [props.offset]);

    const _fetch = (page, keyword) => {
        setLoading(true);

        CompanyService.getCompanies(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];

                setRows(_rows);
                setRowCount(totalRecords);
                setFetch(_data.resultData.length > 0);

                if (props.onLoad) {
                    props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                }

                setLoading(false);
            })
            .catch((err) => {
                Helper.error(err);
            });
    };

    useEffect(() => {
        if (props.keyword !== keyword) {
            _fetch(1, props.keyword);
        }
        setKeyword(props.keyword || '');
    }, [props.keyword, keyword]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (props.reload && !reload) {
            _fetch(1, '');
        }
        setReload(props.reload || false);
    }, [props.reload, reload]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const element = document.querySelector(`.${props.containerClassName}`);
        if (element) {
            element.onscroll = (event) => {

                let _offset = 0;
                if (Env.isMobile()) _offset = offset;

                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + _offset) >= (event.target.scrollHeight - Env.PAGE_OFFSET)) {
                    const p = page + 1;
                    setPage(p);
                    _fetch(p, keyword);
                }
            };
        }
    }, [props.containerClassName, offset, fetch, loading, page, keyword]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        _fetch(1, '');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDelete = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id');
        const companyIndex = e.currentTarget.getAttribute('data-index');

        setOpenDeleteDialog(true);
        setCompanyId(companyId);
        setCompanyIndex(companyIndex);
    };

    const handleConfirmDelete = () => {
        if (companyId !== '' && companyIndex > -1) {
            setLoading(false);
            setOpenDeleteDialog(false);
            CompanyService.deleteCompany(companyId)
                .then(status => {
                    if (status === 200) {
                        const _rowCount = rowCount - 1;
                        rows.splice(companyIndex, 1);

                        setRows(rows);
                        setRowCount(_rowCount);
                        setCompanyId('');
                        setCompanyIndex(-1);
                        setLoading(false);

                        if (props.onDelete) {
                            props.onDelete(_rowCount);
                        }

                    } else {
                        Helper.error();
                        setCompanyId('');
                        setCompanyIndex(-1);
                        setLoading(false);
                    }
                }).catch(() => {
                    UserService.signout();
                });
        } else {
            Helper.error();
            setOpenDeleteDialog(false);
            setCompanyId('');
            setCompanyIndex(-1);
            setLoading(false);
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setCompanyId('');
        setCompanyIndex(-1);
    };

    const admin = Helper.admin(props.user);

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
                    const edit = admin || (props.user && props.user._id === company._id);
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
                                        <IconButton data-id={company._id} data-index={index} onClick={handleDelete}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                {edit &&
                                    <Tooltip title={commonStrings.UPDATE}>
                                        <IconButton href={`/update-supplier?c=${company._id}`}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                <Tooltip title={strings.VIEW_COMPANY}>
                                    <IconButton href={`/supplier?c=${company._id}`}>
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
                    <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                    <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                </DialogActions>
            </Dialog>

            {loading && <Backdrop text={commonStrings.LOADING} />}
        </section>
    );
}

export default CompanyList;