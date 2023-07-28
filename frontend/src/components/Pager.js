import React  from 'react'
import { IconButton } from '@mui/material'
import {
    ArrowBackIos as PreviousPageIcon,
    ArrowForwardIos as NextPageIcon
} from '@mui/icons-material'
import { strings as commonStrings } from '../lang/common'

import '../assets/css/pager.css'

const Pager = ({ page, pageSize, totalRecords, rowCount, onNext, onPrevious }) => {

    return (
        (page > 1 || rowCount < totalRecords) &&
        <div className="pager-container">
            <div className="pager">
                <div className="row-count">
                    {`${((page - 1) * pageSize) + 1}-${rowCount} ${commonStrings.OF} ${totalRecords}`}
                </div>

                <div className="actions">
                    <IconButton
                        onClick={onPrevious}
                        disabled={page === 1}
                    >
                        <PreviousPageIcon className="icon" />
                    </IconButton>

                    <IconButton
                        onClick={onNext}
                        disabled={rowCount === totalRecords}
                    >
                        <NextPageIcon className="icon" />
                    </IconButton>
                </div>
            </div>
        </div>
    )

}

export default Pager