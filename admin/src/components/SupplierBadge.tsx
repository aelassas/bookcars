import React from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'

import '@/assets/css/supplier-badge.css'

interface SupplierBadgeProps {
    supplier: bookcarsTypes.User
}

const SupplierBadge = ({ supplier }: SupplierBadgeProps) => {
    return supplier && (
        <div className="supplier-badge" title={supplier.fullName}>
            <span className="supplier-badge-logo">
                <img src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)} alt={supplier.fullName} />
            </span>
            <a href={`/supplier?c=${supplier._id}`} className="supplier-badge-info">
                {supplier.fullName}
            </a>
        </div>
    )
}

export default SupplierBadge
